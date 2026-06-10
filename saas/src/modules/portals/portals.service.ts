import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/config/database.js';
import { portals, titleFilters, type NewPortal } from '@/db/schema.js';
import { NotFoundError, ValidationError } from '@/shared/errors.js';
import { detectApi } from '@/modules/scanner/ats-detector.js';

const VALID_API_TYPES = new Set(['greenhouse', 'ashby', 'lever', 'workday', 'custom']);

export interface CreatePortalInput {
  name: string;
  careersUrl?: string;
  apiType?: string;
  apiUrl?: string;
  enabled?: boolean;
}

export interface UpdatePortalInput extends Partial<CreatePortalInput> {}

export interface PortalYaml {
  name: string;
  careers_url?: string;
  api?: string;
}

async function autoDetect(careersUrl?: string, apiManual?: string): Promise<{ apiType?: string; apiUrl?: string }> {
  const detected = detectApi({ careers_url: careersUrl, api: apiManual });
  if (!detected) return {};
  return { apiType: detected.type, apiUrl: detected.url };
}

export async function listPortals(orgId: string) {
  return db
    .select()
    .from(portals)
    .where(and(eq(portals.orgId, orgId), isNull(portals.deletedAt)))
    .orderBy(portals.name);
}

export async function getPortal(orgId: string, id: string) {
  const [portal] = await db
    .select()
    .from(portals)
    .where(and(eq(portals.orgId, orgId), eq(portals.id, id), isNull(portals.deletedAt)));
  if (!portal) throw new NotFoundError('Portal not found');
  return portal;
}

export async function createPortal(orgId: string, input: CreatePortalInput) {
  if (input.apiType && !VALID_API_TYPES.has(input.apiType)) {
    throw new ValidationError(`Invalid api_type. Must be one of: ${[...VALID_API_TYPES].join(', ')}`);
  }

  const auto = await autoDetect(input.careersUrl, input.apiUrl);
  const apiType = input.apiType ?? auto.apiType;
  const apiUrl = input.apiUrl ?? auto.apiUrl;

  const data: NewPortal = {
    orgId,
    name: input.name,
    careersUrl: input.careersUrl,
    apiType,
    apiUrl,
    enabled: input.enabled ?? true,
  };

  const [portal] = await db.insert(portals).values(data).returning();
  return portal;
}

export async function updatePortal(orgId: string, id: string, input: UpdatePortalInput) {
  await getPortal(orgId, id);

  if (input.apiType && !VALID_API_TYPES.has(input.apiType)) {
    throw new ValidationError(`Invalid api_type. Must be one of: ${[...VALID_API_TYPES].join(', ')}`);
  }

  const [updated] = await db
    .update(portals)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(portals.orgId, orgId), eq(portals.id, id)))
    .returning();
  return updated;
}

export async function deletePortal(orgId: string, id: string) {
  await getPortal(orgId, id);
  await db
    .update(portals)
    .set({ deletedAt: new Date() })
    .where(and(eq(portals.orgId, orgId), eq(portals.id, id)));
}

export async function importPortalsYaml(orgId: string, portalsYaml: PortalYaml[]) {
  const results: { created: number; updated: number; skipped: number } = { created: 0, updated: 0, skipped: 0 };

  for (const entry of portalsYaml) {
    if (!entry.name) continue;

    // Dedup by careers_url or name
    const existing = entry.careers_url
      ? await db.select().from(portals).where(and(eq(portals.orgId, orgId), eq(portals.careersUrl, entry.careers_url)))
      : await db.select().from(portals).where(and(eq(portals.orgId, orgId), eq(portals.name, entry.name)));

    const auto = await autoDetect(entry.careers_url, entry.api);

    if (existing.length > 0) {
      // Update existing portal with auto-detected info if not already set
      const p = existing[0];
      if (!p.apiType && auto.apiType) {
        await db
          .update(portals)
          .set({ apiType: auto.apiType, apiUrl: auto.apiUrl, updatedAt: new Date() })
          .where(eq(portals.id, p.id));
        results.updated++;
      } else {
        results.skipped++;
      }
    } else {
      await db.insert(portals).values({
        orgId,
        name: entry.name,
        careersUrl: entry.careers_url,
        apiType: auto.apiType ?? (entry.api ? 'custom' : undefined),
        apiUrl: auto.apiUrl ?? entry.api,
        enabled: true,
      });
      results.created++;
    }
  }

  return results;
}

// ─── Title Filters ───────────────────────────────────────────────────────────

export async function listTitleFilters(orgId: string) {
  return db.select().from(titleFilters).where(eq(titleFilters.orgId, orgId));
}

export async function upsertTitleFilters(orgId: string, keywords: Array<{ type: 'positive' | 'negative'; keyword: string }>) {
  await db.delete(titleFilters).where(eq(titleFilters.orgId, orgId));
  if (keywords.length === 0) return [];
  return db
    .insert(titleFilters)
    .values(keywords.map((k) => ({ orgId, type: k.type, keyword: k.keyword.toLowerCase() })))
    .returning();
}

export async function addTitleFilter(orgId: string, type: 'positive' | 'negative', keyword: string) {
  const [filter] = await db
    .insert(titleFilters)
    .values({ orgId, type, keyword: keyword.toLowerCase() })
    .returning();
  return filter;
}

export async function deleteTitleFilter(orgId: string, id: string) {
  const [deleted] = await db
    .delete(titleFilters)
    .where(and(eq(titleFilters.orgId, orgId), eq(titleFilters.id, id)))
    .returning();
  if (!deleted) throw new NotFoundError('Title filter not found');
}
