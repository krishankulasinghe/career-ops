import { db } from '@/config/database.js';
import { promptTemplates, organizations, aiTasks } from '@/db/schema.js';
import { eq, and, isNull, or, desc, sql, avg } from 'drizzle-orm';
import { invalidateCache } from './prompt.registry.js';
import { NotFoundError } from '@/shared/errors.js';

export async function listPromptTemplates(orgId: string) {
  // Get system templates
  const systemTemplates = await db.select()
    .from(promptTemplates)
    .where(isNull(promptTemplates.orgId))
    .orderBy(promptTemplates.name, desc(promptTemplates.version));

  // Get org override templates
  const orgTemplates = await db.select()
    .from(promptTemplates)
    .where(eq(promptTemplates.orgId, orgId))
    .orderBy(promptTemplates.name, desc(promptTemplates.version));

  return { systemTemplates, orgTemplates };
}

export async function getTemplateVersions(name: string, language: string, orgId: string) {
  const rows = await db.select()
    .from(promptTemplates)
    .where(
      and(
        eq(promptTemplates.name, name),
        eq(promptTemplates.language, language),
        or(eq(promptTemplates.orgId, orgId), isNull(promptTemplates.orgId)),
      ),
    )
    .orderBy(desc(promptTemplates.version));
  return rows;
}

export async function createOrUpdateOverride(
  orgId: string,
  name: string,
  language: string,
  content: string,
): Promise<typeof promptTemplates.$inferSelect> {
  // Deactivate previous org versions
  await db.update(promptTemplates)
    .set({ isActive: false })
    .where(
      and(
        eq(promptTemplates.orgId, orgId),
        eq(promptTemplates.name, name),
        eq(promptTemplates.language, language),
      ),
    );

  // Find max version (system or org)
  const [maxRow] = await db.select({ maxVersion: sql<number>`MAX(${promptTemplates.version})` })
    .from(promptTemplates)
    .where(
      and(
        eq(promptTemplates.name, name),
        eq(promptTemplates.language, language),
      ),
    );

  const nextVersion = (Number(maxRow?.maxVersion) || 0) + 1;

  const [created] = await db.insert(promptTemplates).values({
    orgId,
    name,
    language,
    content,
    version: nextVersion,
    isActive: true,
  }).returning();

  invalidateCache(orgId);
  return created;
}

export async function rollbackToVersion(orgId: string, templateId: string): Promise<void> {
  const [template] = await db.select()
    .from(promptTemplates)
    .where(and(eq(promptTemplates.id, templateId), eq(promptTemplates.orgId, orgId)));

  if (!template) throw new NotFoundError('Template version not found');

  // Deactivate current active version
  await db.update(promptTemplates)
    .set({ isActive: false })
    .where(
      and(
        eq(promptTemplates.orgId, orgId),
        eq(promptTemplates.name, template.name),
        eq(promptTemplates.language, template.language),
        eq(promptTemplates.isActive, true),
      ),
    );

  // Activate the target version
  await db.update(promptTemplates)
    .set({ isActive: true })
    .where(eq(promptTemplates.id, templateId));

  invalidateCache(orgId);
}

export async function enableABTest(orgId: string, challengerId: string): Promise<void> {
  const [challenger] = await db.select()
    .from(promptTemplates)
    .where(eq(promptTemplates.id, challengerId));
  if (!challenger) throw new NotFoundError('Challenger template not found');

  const settings = await getOrgSettings(orgId);
  await db.update(organizations)
    .set({
      settings: {
        ...settings,
        ab_test_active: true,
        ab_test_challenger_id: challengerId,
        ab_test_name: challenger.name,
        ab_test_started_at: new Date().toISOString(),
      },
    })
    .where(eq(organizations.id, orgId));
}

export async function disableABTest(orgId: string): Promise<void> {
  const settings = await getOrgSettings(orgId);
  const updated = { ...settings };
  delete updated['ab_test_active'];
  delete updated['ab_test_challenger_id'];
  delete updated['ab_test_name'];
  delete updated['ab_test_started_at'];
  await db.update(organizations).set({ settings: updated }).where(eq(organizations.id, orgId));
}

export async function getABTestStats(orgId: string) {
  const settings = await getOrgSettings(orgId);
  const challengerId = settings['ab_test_challenger_id'] as string | undefined;
  const since = settings['ab_test_started_at'] as string | undefined;

  if (!challengerId || !since) return null;

  const sinceDate = new Date(since);

  // Get evals that used the challenger vs control
  // We track prompt_template_id in ai_tasks output (if populated by eval service)
  // For now, compare by cost/latency as a proxy since score comparison requires more plumbing
  const [challenger] = await db.select()
    .from(promptTemplates)
    .where(eq(promptTemplates.id, challengerId));

  return {
    challengerId,
    challengerName: challenger?.name ?? 'Unknown',
    startedAt: since,
    active: Boolean(settings['ab_test_active']),
  };
}

async function getOrgSettings(orgId: string): Promise<Record<string, unknown>> {
  const [org] = await db.select({ settings: organizations.settings })
    .from(organizations)
    .where(eq(organizations.id, orgId));
  return (org?.settings ?? {}) as Record<string, unknown>;
}
