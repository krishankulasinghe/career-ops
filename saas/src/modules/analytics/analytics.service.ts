import { and, eq, count, avg, min, max, isNull, sql } from 'drizzle-orm';
import { db } from '@/config/database.js';
import { applications, evaluations } from '@/db/schema.js';
import { redis } from '@/config/redis.js';
import { extractBlockerType } from '@/shared/analytics-utils.js';

const CACHE_TTL = 300; // 5 minutes

async function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = await redis.get(key).catch(() => null);
  if (hit) return JSON.parse(hit) as T;
  const result = await fn();
  await redis.set(key, JSON.stringify(result), 'EX', CACHE_TTL).catch(() => null);
  return result;
}

export async function getFunnel(orgId: string) {
  return cached(`analytics:funnel:${orgId}`, async () => {
    const rows = await db
      .select({ status: applications.status, count: count() })
      .from(applications)
      .where(and(eq(applications.orgId, orgId), isNull(applications.deletedAt)))
      .groupBy(applications.status);

    const funnelOrder = ['Evaluated', 'Applied', 'Responded', 'Interview', 'Offer', 'Rejected', 'Discarded', 'SKIP'];
    const map: Record<string, number> = {};
    rows.forEach((r) => { map[r.status ?? 'Unknown'] = Number(r.count); });

    return funnelOrder.map((status) => ({ status, count: map[status] ?? 0 }));
  });
}

export async function getScoreDistribution(orgId: string) {
  return cached(`analytics:scores:${orgId}`, async () => {
    const rows = await db
      .select({ score: evaluations.scoreGlobal })
      .from(evaluations)
      .innerJoin(applications, eq(evaluations.applicationId, applications.id))
      .where(and(eq(applications.orgId, orgId), isNull(evaluations.deletedAt)));

    const buckets: Record<string, number> = {
      '0-1': 0, '1-2': 0, '2-3': 0, '3-4': 0, '4-5': 0,
    };

    rows.forEach((r) => {
      const s = Number(r.score ?? 0);
      if (s < 1) buckets['0-1']++;
      else if (s < 2) buckets['1-2']++;
      else if (s < 3) buckets['2-3']++;
      else if (s < 4) buckets['3-4']++;
      else buckets['4-5']++;
    });

    return Object.entries(buckets).map(([range, count]) => ({ range, count }));
  });
}

export async function getPatterns(orgId: string) {
  return cached(`analytics:patterns:${orgId}`, async () => {
    const rows = await db
      .select({ gaps: evaluations.gaps })
      .from(evaluations)
      .innerJoin(applications, eq(evaluations.applicationId, applications.id))
      .where(and(eq(applications.orgId, orgId), isNull(evaluations.deletedAt)));

    const blockerCounts: Record<string, number> = {};

    for (const row of rows) {
      const gaps = Array.isArray(row.gaps) ? row.gaps : [];
      for (const gap of gaps) {
        const blocker = extractBlockerType(gap as { description: string; severity: string });
        if (blocker) {
          blockerCounts[blocker] = (blockerCounts[blocker] ?? 0) + 1;
        }
      }
    }

    return Object.entries(blockerCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([blocker, count]) => ({ blocker, count }));
  });
}

export async function getArchetypeStats(orgId: string) {
  return cached(`analytics:archetypes:${orgId}`, async () => {
    const rows = await db
      .select({
        archetype: evaluations.archetype,
        avgScore: avg(evaluations.scoreGlobal),
        minScore: min(evaluations.scoreGlobal),
        maxScore: max(evaluations.scoreGlobal),
        count: count(),
      })
      .from(evaluations)
      .innerJoin(applications, eq(evaluations.applicationId, applications.id))
      .where(and(eq(applications.orgId, orgId), isNull(evaluations.deletedAt)))
      .groupBy(evaluations.archetype);

    return rows.map((r) => ({
      archetype: r.archetype ?? 'Unknown',
      avgScore: Number(r.avgScore ?? 0),
      minScore: Number(r.minScore ?? 0),
      maxScore: Number(r.maxScore ?? 0),
      count: Number(r.count),
    }));
  });
}

export async function getRecommendedScoreThreshold(orgId: string) {
  return cached(`analytics:threshold:${orgId}`, async () => {
    // Find lowest score among applications that reached "Responded" or further
    const positiveOutcomes = await db
      .select({ score: evaluations.scoreGlobal })
      .from(evaluations)
      .innerJoin(applications, eq(evaluations.applicationId, applications.id))
      .where(
        and(
          eq(applications.orgId, orgId),
          isNull(evaluations.deletedAt),
          sql`${applications.status} IN ('Responded', 'Interview', 'Offer')`,
        ),
      );

    if (positiveOutcomes.length === 0) return { threshold: 3.5, basis: 'default' };

    const scores = positiveOutcomes.map((r) => Number(r.score ?? 0));
    const minSuccessScore = Math.min(...scores);
    const threshold = Math.max(2.5, minSuccessScore - 0.5);

    return { threshold: Math.round(threshold * 10) / 10, basis: 'outcome-correlation' };
  });
}
