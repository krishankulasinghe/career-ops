import { db } from '@/config/database.js';
import { applications, evaluations, aiTasks, scanResults, portals } from '@/db/schema.js';
import { eq, and, gte, lte, sql, desc, isNull, inArray } from 'drizzle-orm';

// ─── Smart Dedup ──────────────────────────────────────────────────────────────

export interface DedupSuggestion {
  orgId: string;
  appId1: string;
  appId2: string;
  company1: string;
  company2: string;
  role1: string;
  role2: string;
  similarity: number;
}

function stringSimilarity(a: string, b: string): number {
  a = a.toLowerCase().trim();
  b = b.toLowerCase().trim();
  if (a === b) return 1;
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  if (longer.length === 0) return 1;
  // Levenshtein distance approximation
  const editDist = levenshtein(longer, shorter);
  return (longer.length - editDist) / longer.length;
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

export async function runSmartDedup(orgId?: string): Promise<DedupSuggestion[]> {
  const rows = await db.select({
    id: applications.id,
    orgId: applications.orgId,
    company: applications.company,
    role: applications.role,
  })
    .from(applications)
    .where(
      and(
        isNull(applications.deletedAt),
        orgId ? eq(applications.orgId, orgId) : undefined,
      ),
    )
    .orderBy(applications.orgId, applications.company);

  const suggestions: DedupSuggestion[] = [];

  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      if (rows[i].orgId !== rows[j].orgId) continue;

      const companySim = stringSimilarity(rows[i].company, rows[j].company);
      const roleSim = stringSimilarity(rows[i].role, rows[j].role);
      const combined = (companySim + roleSim) / 2;

      if (combined >= 0.85 && rows[i].id !== rows[j].id) {
        suggestions.push({
          orgId: rows[i].orgId,
          appId1: rows[i].id,
          appId2: rows[j].id,
          company1: rows[i].company,
          company2: rows[j].company,
          role1: rows[i].role,
          role2: rows[j].role,
          similarity: Math.round(combined * 100) / 100,
        });
      }
    }
  }

  return suggestions.sort((a, b) => b.similarity - a.similarity).slice(0, 50);
}

// ─── Scan Anomaly Detection ───────────────────────────────────────────────────

export interface ScanAnomaly {
  portalId: string;
  portalName: string;
  orgId: string;
  todayCount: number;
  movingAvg: number;
  dropPercent: number;
}

export async function detectScanAnomalies(): Promise<ScanAnomaly[]> {
  const since7d = new Date(Date.now() - 7 * 86_400_000);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const last7dRows = await db.select({
    portalId: scanResults.portalId,
    dailyAvg: sql<number>`COUNT(*) / 7.0`.as('daily_avg'),
  })
    .from(scanResults)
    .where(and(gte(scanResults.createdAt, since7d), lte(scanResults.createdAt, todayStart)))
    .groupBy(scanResults.portalId);

  const todayRows = await db.select({
    portalId: scanResults.portalId,
    count: sql<number>`COUNT(*)`.as('count'),
  })
    .from(scanResults)
    .where(gte(scanResults.createdAt, todayStart))
    .groupBy(scanResults.portalId);

  const todayMap = new Map<string, number>(todayRows.map((r) => [r.portalId ?? '', Number(r.count)]));
  const anomalies: ScanAnomaly[] = [];

  for (const r of last7dRows) {
    const pid = r.portalId ?? '';
    const avg = Number(r.dailyAvg);
    const today = todayMap.get(pid) ?? 0;
    if (avg > 3 && today < avg * 0.6) {
      anomalies.push({
        portalId: pid,
        portalName: pid,
        orgId: '',
        todayCount: today,
        movingAvg: Math.round(avg * 10) / 10,
        dropPercent: Math.round((1 - today / avg) * 100),
      });
    }
  }

  // Enrich with portal names
  if (anomalies.length) {
    const pids = anomalies.map((a) => a.portalId).filter(Boolean);
    const portalRows = await db.select({ id: portals.id, name: portals.name, orgId: portals.orgId })
      .from(portals)
      .where(inArray(portals.id, pids));
    const pMap = new Map(portalRows.map((p) => [p.id, p]));
    for (const a of anomalies) {
      const p = pMap.get(a.portalId);
      if (p) { a.portalName = p.name; a.orgId = p.orgId; }
    }
  }

  return anomalies;
}

// ─── Evaluation Quality Loop ──────────────────────────────────────────────────

export interface ArchetypeCalibration {
  archetype: string;
  evaluations: number;
  avgScore: number;
  interviewRate: number;
  offerRate: number;
  calibrationScore: number;
  flag: boolean;
}

export async function getQualityCalibration(orgId?: string): Promise<ArchetypeCalibration[]> {
  const where = and(
    orgId ? eq(evaluations.orgId, orgId) : undefined,
    isNull(applications.deletedAt),
  );

  const rows = await db.select({
    archetype: evaluations.archetype,
    evalScore: evaluations.scoreGlobal,
    appStatus: applications.status,
  })
    .from(evaluations)
    .innerJoin(applications, eq(evaluations.applicationId, applications.id))
    .where(where);

  const byArchetype = new Map<string, { scores: number[]; statuses: string[] }>();

  for (const r of rows) {
    if (!r.archetype) continue;
    const entry = byArchetype.get(r.archetype) ?? { scores: [], statuses: [] };
    if (r.evalScore) entry.scores.push(Number(r.evalScore));
    if (r.appStatus) entry.statuses.push(r.appStatus);
    byArchetype.set(r.archetype, entry);
  }

  return Array.from(byArchetype.entries())
    .filter(([, v]) => v.scores.length >= 3)
    .map(([archetype, v]) => {
      const avgScore = v.scores.reduce((s, x) => s + x, 0) / v.scores.length;
      const interviewRate = v.statuses.filter((s) => ['Interview', 'Offer'].includes(s)).length / v.statuses.length;
      const offerRate = v.statuses.filter((s) => s === 'Offer').length / v.statuses.length;
      // Expected: high scores → high interview rate. Flag if divergence > 30%
      const expectedInterviewRate = Math.min(1, avgScore / 5);
      const calibrationScore = 1 - Math.abs(expectedInterviewRate - interviewRate);
      return {
        archetype,
        evaluations: v.scores.length,
        avgScore: Math.round(avgScore * 10) / 10,
        interviewRate: Math.round(interviewRate * 100),
        offerRate: Math.round(offerRate * 100),
        calibrationScore: Math.round(calibrationScore * 100) / 100,
        flag: calibrationScore < 0.7,
      };
    })
    .sort((a, b) => a.calibrationScore - b.calibrationScore);
}

// ─── Batch Optimization ───────────────────────────────────────────────────────

export interface BatchOptimizationRecommendation {
  provider: string;
  recommendedBatchSize: number;
  observedAvgLatencyMs: number;
  observedP95LatencyMs: number;
  estimatedTPM: number;
}

export async function getBatchOptimization(): Promise<BatchOptimizationRecommendation[]> {
  const since = new Date(Date.now() - 30 * 86_400_000);

  const rows = await db.select({
    provider: aiTasks.provider,
    avgLatency: sql<number>`AVG(${aiTasks.latencyMs})`.as('avg_latency'),
    p95Latency: sql<number>`PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY ${aiTasks.latencyMs})`.as('p95_latency'),
    count: sql<number>`COUNT(*)`.as('count'),
  })
    .from(aiTasks)
    .where(and(gte(aiTasks.createdAt, since), sql`${aiTasks.latencyMs} IS NOT NULL`))
    .groupBy(aiTasks.provider);

  return rows.map((r) => {
    const avg = Number(r.avgLatency) || 5000;
    const p95 = Number(r.p95Latency) || avg * 2;
    // Estimate TPM: 60000ms / avg latency = parallelism needed to hit 1 eval/sec
    const estimatedTPM = Math.round((60_000 / avg) * 10);
    const recommendedBatchSize = Math.min(50, Math.max(3, Math.round(30_000 / avg)));
    return {
      provider: r.provider ?? 'unknown',
      recommendedBatchSize,
      observedAvgLatencyMs: Math.round(avg),
      observedP95LatencyMs: Math.round(p95),
      estimatedTPM,
    };
  });
}
