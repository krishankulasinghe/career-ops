import { db } from '@/config/database.js';
import { evaluationModes } from '@/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { NotFoundError } from '@/shared/errors.js';
import { sql } from 'drizzle-orm';

export interface ModeWeights {
  cvMatch?: number;
  northStar?: number;
  comp?: number;
  cultural?: number;
  redFlags?: number;
}

export interface CustomBlock {
  id: string;
  name: string;
  prompt: string;
  weight: number;
}

export async function listEvalModes(orgId: string) {
  return db.select().from(evaluationModes).where(eq(evaluationModes.orgId, orgId));
}

export async function getEvalMode(orgId: string, modeId: string) {
  const [mode] = await db.select().from(evaluationModes)
    .where(and(eq(evaluationModes.id, modeId), eq(evaluationModes.orgId, orgId)));
  if (!mode) throw new NotFoundError('Evaluation mode not found');
  return mode;
}

export async function createEvalMode(orgId: string, input: {
  name: string;
  weights?: ModeWeights;
  customBlocks?: CustomBlock[];
  promptTemplateId?: string;
  defaultArchetype?: string;
  isDefault?: boolean;
}) {
  if (input.isDefault) {
    // Remove default flag from others
    await db.update(evaluationModes).set({ isDefault: false }).where(eq(evaluationModes.orgId, orgId));
  }

  const [created] = await db.insert(evaluationModes).values({
    orgId,
    name: input.name,
    weights: input.weights ?? {},
    customBlocks: input.customBlocks ?? [],
    promptTemplateId: input.promptTemplateId,
    defaultArchetype: input.defaultArchetype,
    isDefault: input.isDefault ?? false,
  }).returning();

  return created;
}

export async function updateEvalMode(orgId: string, modeId: string, input: {
  name?: string;
  weights?: ModeWeights;
  customBlocks?: CustomBlock[];
  promptTemplateId?: string | null;
  defaultArchetype?: string | null;
  isDefault?: boolean;
}) {
  const existing = await getEvalMode(orgId, modeId);

  if (input.isDefault && !existing.isDefault) {
    await db.update(evaluationModes).set({ isDefault: false }).where(eq(evaluationModes.orgId, orgId));
  }

  const [updated] = await db.update(evaluationModes)
    .set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.weights !== undefined && { weights: input.weights }),
      ...(input.customBlocks !== undefined && { customBlocks: input.customBlocks }),
      ...(input.promptTemplateId !== undefined && { promptTemplateId: input.promptTemplateId }),
      ...(input.defaultArchetype !== undefined && { defaultArchetype: input.defaultArchetype }),
      ...(input.isDefault !== undefined && { isDefault: input.isDefault }),
      updatedAt: new Date(),
    })
    .where(and(eq(evaluationModes.id, modeId), eq(evaluationModes.orgId, orgId)))
    .returning();

  return updated;
}

export async function deleteEvalMode(orgId: string, modeId: string): Promise<void> {
  await db.delete(evaluationModes)
    .where(and(eq(evaluationModes.id, modeId), eq(evaluationModes.orgId, orgId)));
}

export async function getDefaultMode(orgId: string) {
  const [mode] = await db.select().from(evaluationModes)
    .where(and(eq(evaluationModes.orgId, orgId), eq(evaluationModes.isDefault, true)));
  return mode ?? null;
}

export async function getDefaultModeForArchetype(orgId: string, archetype: string) {
  const [mode] = await db.select().from(evaluationModes)
    .where(and(
      eq(evaluationModes.orgId, orgId),
      eq(evaluationModes.defaultArchetype, archetype),
    ));
  return mode ?? getDefaultMode(orgId);
}

export function applyWeightsToScore(scores: Record<string, number>, weights: ModeWeights): number {
  const normalizedWeights: Record<string, number> = {
    cvMatch: weights.cvMatch ?? 1,
    northStar: weights.northStar ?? 1,
    comp: weights.comp ?? 1,
    cultural: weights.cultural ?? 1,
    redFlags: weights.redFlags ?? 1,
  };

  const scoreMap: Record<string, number> = {
    cvMatch: scores['cvMatch'] ?? 0,
    northStar: scores['northStar'] ?? 0,
    comp: scores['comp'] ?? 0,
    cultural: scores['cultural'] ?? 0,
    redFlags: scores['redFlags'] ?? 0,
  };

  const totalWeight = Object.values(normalizedWeights).reduce((s, w) => s + w, 0);
  if (totalWeight === 0) return 0;

  const weightedSum = Object.entries(normalizedWeights).reduce((s, [key, w]) => s + w * (scoreMap[key] ?? 0), 0);
  return Math.round((weightedSum / totalWeight) * 10) / 10;
}
