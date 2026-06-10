import { lt, and, eq, gte } from 'drizzle-orm';
import { db } from '@/config/database.js';
import { auditLogs, organizations } from '@/db/schema.js';
import { sql } from 'drizzle-orm';
import { logger } from '@/shared/logger.js';

// SOC 2 audit log retention:
// - Enterprise: 7 years (2555 days)
// - Team/Pro: 2 years (730 days)
// - Free: 90 days

const RETENTION_DAYS: Record<string, number> = {
  enterprise: 2555,
  team: 730,
  pro: 365,
  free: 90,
};

export async function enforceAuditLogRetention(): Promise<{
  totalDeleted: number;
  byPlan: Record<string, number>;
}> {
  const byPlan: Record<string, number> = {};
  let totalDeleted = 0;

  const orgs = await db
    .select({ id: organizations.id, plan: organizations.plan })
    .from(organizations);

  for (const org of orgs) {
    const retentionDays = RETENTION_DAYS[org.plan] ?? RETENTION_DAYS.free;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    const result = await db
      .delete(auditLogs)
      .where(
        and(
          eq(auditLogs.orgId, org.id),
          lt(auditLogs.createdAt, cutoff),
        ),
      )
      .returning({ id: auditLogs.id });

    const count = result.length;
    totalDeleted += count;
    byPlan[org.plan] = (byPlan[org.plan] ?? 0) + count;

    if (count > 0) {
      logger.info({ orgId: org.id, plan: org.plan, count, cutoff }, 'Audit log retention: deleted old entries');
    }
  }

  return { totalDeleted, byPlan };
}

export async function getAuditLogStats(): Promise<{
  totalEntries: number;
  oldestEntry: Date | null;
  retentionByPlan: Record<string, string>;
}> {
  const [stats] = await db
    .select({
      total: sql<number>`COUNT(*)`,
      oldest: sql<Date>`MIN(created_at)`,
    })
    .from(auditLogs);

  return {
    totalEntries: stats?.total ?? 0,
    oldestEntry: stats?.oldest ?? null,
    retentionByPlan: Object.fromEntries(
      Object.entries(RETENTION_DAYS).map(([plan, days]) => [
        plan,
        days >= 2555 ? '7 years' : days >= 730 ? '2 years' : days >= 365 ? '1 year' : '90 days',
      ]),
    ),
  };
}
