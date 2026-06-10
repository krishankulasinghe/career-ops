import { eq, and, sql } from 'drizzle-orm';
import { db } from '@/config/database.js';
import { usageRecords, organizations } from '@/db/schema.js';
import { UsageLimitError } from '@/shared/errors.js';

type UsageKind = 'evaluations' | 'scans' | 'pdfs';

function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

async function ensureRecord(orgId: string): Promise<void> {
  const period = currentPeriod();
  await db
    .insert(usageRecords)
    .values({ orgId, period })
    .onConflictDoNothing();
}

export async function checkUsageLimit(orgId: string, kind: UsageKind): Promise<void> {
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);

  if (!org) return;

  const period = currentPeriod();
  const [record] = await db
    .select()
    .from(usageRecords)
    .where(and(eq(usageRecords.orgId, orgId), eq(usageRecords.period, period)))
    .limit(1);

  if (!record) return;

  const count =
    kind === 'evaluations' ? record.evaluationsCount
    : kind === 'scans'      ? record.scansCount
    :                         record.pdfsCount;

  const limit =
    kind === 'evaluations' ? org.maxEvaluationsMo
    : kind === 'scans'      ? org.maxScansMo
    :                         null;

  if (limit !== null && count >= limit) {
    throw new UsageLimitError(
      `Monthly ${kind} limit reached (${count}/${limit}). Upgrade your plan to continue.`,
      { used: count, limit, kind },
    );
  }

  const pct = limit ? (count / limit) * 100 : 0;
  if (limit && pct >= 80) {
    // Caller can check, but we don't block — just a soft warning
  }
}

export async function incrementUsage(
  orgId: string,
  kind: UsageKind,
  count = 1,
  tokens = 0,
  costUsd = 0,
): Promise<void> {
  await ensureRecord(orgId);

  const period = currentPeriod();

  if (kind === 'evaluations') {
    await db
      .update(usageRecords)
      .set({
        evaluationsCount: sql`${usageRecords.evaluationsCount} + ${count}`,
        aiTokensTotal: sql`${usageRecords.aiTokensTotal} + ${tokens}`,
        aiCostTotal: sql`${usageRecords.aiCostTotal} + ${costUsd}`,
      })
      .where(and(eq(usageRecords.orgId, orgId), eq(usageRecords.period, period)));
  } else if (kind === 'scans') {
    await db
      .update(usageRecords)
      .set({ scansCount: sql`${usageRecords.scansCount} + ${count}` })
      .where(and(eq(usageRecords.orgId, orgId), eq(usageRecords.period, period)));
  } else if (kind === 'pdfs') {
    await db
      .update(usageRecords)
      .set({ pdfsCount: sql`${usageRecords.pdfsCount} + ${count}` })
      .where(and(eq(usageRecords.orgId, orgId), eq(usageRecords.period, period)));
  }
}
