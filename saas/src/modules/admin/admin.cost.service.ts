import { db } from '@/config/database.js';
import { aiTasks, organizations } from '@/db/schema.js';
import { and, gte, sql, desc } from 'drizzle-orm';

export interface DailySpend {
  date: string;
  costUsd: number;
  tokensIn: number;
  tokensOut: number;
  evaluations: number;
}

export interface OrgCostRow {
  orgId: string;
  orgName: string;
  plan: string;
  costUsd: number;
  tokensIn: number;
  tokensOut: number;
  evaluations: number;
  costPerEval: number;
}

export interface ProviderBreakdown {
  provider: string;
  costUsd: number;
  evaluations: number;
}

export interface ModelBreakdown {
  model: string;
  provider: string;
  costUsd: number;
  evaluations: number;
}

export interface AnomalyAlert {
  orgId: string;
  orgName: string;
  thisWeekCost: number;
  lastWeekCost: number;
  growthFactor: number;
}

function linearForecast(data: { x: number; y: number }[]): number {
  if (data.length < 2) return data[0]?.y ?? 0;
  const n = data.length;
  const sumX = data.reduce((s, d) => s + d.x, 0);
  const sumY = data.reduce((s, d) => s + d.y, 0);
  const sumXY = data.reduce((s, d) => s + d.x * d.y, 0);
  const sumX2 = data.reduce((s, d) => s + d.x * d.x, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return Math.max(0, slope * (n + 1) + intercept);
}

export async function getDailySpend(days = 90): Promise<{ series: DailySpend[]; forecastEOM: number }> {
  const since = new Date(Date.now() - days * 86_400_000);

  const rows = await db.select({
    date: sql<string>`DATE(${aiTasks.createdAt})`.as('date'),
    costUsd: sql<number>`COALESCE(SUM(${aiTasks.costUsd}::numeric), 0)`.as('cost_usd'),
    tokensIn: sql<number>`COALESCE(SUM(${aiTasks.tokensIn}), 0)`.as('tokens_in'),
    tokensOut: sql<number>`COALESCE(SUM(${aiTasks.tokensOut}), 0)`.as('tokens_out'),
    evaluations: sql<number>`COUNT(*)`.as('evaluations'),
  })
    .from(aiTasks)
    .where(gte(aiTasks.createdAt, since))
    .groupBy(sql`DATE(${aiTasks.createdAt})`)
    .orderBy(sql`DATE(${aiTasks.createdAt})`);

  const series: DailySpend[] = rows.map((r) => ({
    date: r.date,
    costUsd: Number(r.costUsd),
    tokensIn: Number(r.tokensIn),
    tokensOut: Number(r.tokensOut),
    evaluations: Number(r.evaluations),
  }));

  // Forecast: how much is left this month at current trajectory?
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const remaining = daysInMonth - dayOfMonth;

  const recentData = series.slice(-14).map((d, i) => ({ x: i, y: d.costUsd }));
  const forecastDay = linearForecast(recentData);
  const forecastEOM = series
    .filter((d) => d.date.startsWith(now.toISOString().slice(0, 7)))
    .reduce((s, d) => s + d.costUsd, 0) + forecastDay * remaining;

  return { series, forecastEOM };
}

export async function getOrgCosts(days = 30): Promise<OrgCostRow[]> {
  const since = new Date(Date.now() - days * 86_400_000);

  const rows = await db.select({
    orgId: organizations.id,
    orgName: organizations.name,
    plan: organizations.plan,
    costUsd: sql<number>`COALESCE(SUM(${aiTasks.costUsd}::numeric), 0)`.as('cost_usd'),
    tokensIn: sql<number>`COALESCE(SUM(${aiTasks.tokensIn}), 0)`.as('tokens_in'),
    tokensOut: sql<number>`COALESCE(SUM(${aiTasks.tokensOut}), 0)`.as('tokens_out'),
    evaluations: sql<number>`COUNT(${aiTasks.id})`.as('evaluations'),
  })
    .from(organizations)
    .leftJoin(aiTasks, and(
      sql`${aiTasks.orgId} = ${organizations.id}`,
      gte(aiTasks.createdAt, since),
    ))
    .groupBy(organizations.id, organizations.name, organizations.plan)
    .orderBy(desc(sql`cost_usd`));

  return rows.map((r) => ({
    orgId: r.orgId,
    orgName: r.orgName,
    plan: r.plan,
    costUsd: Number(r.costUsd),
    tokensIn: Number(r.tokensIn),
    tokensOut: Number(r.tokensOut),
    evaluations: Number(r.evaluations),
    costPerEval: r.evaluations > 0 ? Number(r.costUsd) / Number(r.evaluations) : 0,
  }));
}

export async function getProviderBreakdown(days = 30): Promise<ProviderBreakdown[]> {
  const since = new Date(Date.now() - days * 86_400_000);

  const rows = await db.select({
    provider: aiTasks.provider,
    costUsd: sql<number>`COALESCE(SUM(${aiTasks.costUsd}::numeric), 0)`.as('cost_usd'),
    evaluations: sql<number>`COUNT(*)`.as('evaluations'),
  })
    .from(aiTasks)
    .where(gte(aiTasks.createdAt, since))
    .groupBy(aiTasks.provider)
    .orderBy(desc(sql`cost_usd`));

  return rows.map((r) => ({
    provider: r.provider ?? 'unknown',
    costUsd: Number(r.costUsd),
    evaluations: Number(r.evaluations),
  }));
}

export async function getModelBreakdown(days = 30): Promise<ModelBreakdown[]> {
  const since = new Date(Date.now() - days * 86_400_000);

  const rows = await db.select({
    model: aiTasks.model,
    provider: aiTasks.provider,
    costUsd: sql<number>`COALESCE(SUM(${aiTasks.costUsd}::numeric), 0)`.as('cost_usd'),
    evaluations: sql<number>`COUNT(*)`.as('evaluations'),
  })
    .from(aiTasks)
    .where(gte(aiTasks.createdAt, since))
    .groupBy(aiTasks.model, aiTasks.provider)
    .orderBy(desc(sql`cost_usd`));

  return rows.map((r) => ({
    model: r.model ?? 'unknown',
    provider: r.provider ?? 'unknown',
    costUsd: Number(r.costUsd),
    evaluations: Number(r.evaluations),
  }));
}

export async function getAnomalies(): Promise<AnomalyAlert[]> {
  const thisWeekStart = new Date(Date.now() - 7 * 86_400_000);
  const lastWeekStart = new Date(Date.now() - 14 * 86_400_000);

  const [thisWeek, lastWeek] = await Promise.all([
    db.select({
      orgId: aiTasks.orgId,
      costUsd: sql<number>`COALESCE(SUM(${aiTasks.costUsd}::numeric), 0)`.as('cost_usd'),
    })
      .from(aiTasks)
      .where(gte(aiTasks.createdAt, thisWeekStart))
      .groupBy(aiTasks.orgId),

    db.select({
      orgId: aiTasks.orgId,
      costUsd: sql<number>`COALESCE(SUM(${aiTasks.costUsd}::numeric), 0)`.as('cost_usd'),
    })
      .from(aiTasks)
      .where(and(gte(aiTasks.createdAt, lastWeekStart), sql`${aiTasks.createdAt} < ${thisWeekStart}`))
      .groupBy(aiTasks.orgId),
  ]);

  const lastWeekMap = new Map(lastWeek.map((r) => [r.orgId, Number(r.costUsd)]));

  const anomalies = thisWeek
    .map((r) => {
      const tw = Number(r.costUsd);
      const lw = lastWeekMap.get(r.orgId) ?? 0;
      const factor = lw > 0 ? tw / lw : (tw > 0 ? Infinity : 1);
      return { orgId: r.orgId, thisWeekCost: tw, lastWeekCost: lw, growthFactor: factor };
    })
    .filter((r) => r.growthFactor >= 2 && r.thisWeekCost > 0.001);

  // Resolve org names
  if (!anomalies.length) return [];
  const orgIds = anomalies.map((a) => a.orgId);
  const orgs = await db.select({ id: organizations.id, name: organizations.name })
    .from(organizations)
    .where(sql`${organizations.id} = ANY(${orgIds})`);
  const orgMap = new Map(orgs.map((o) => [o.id, o.name]));

  return anomalies.map((a) => ({
    ...a,
    orgName: orgMap.get(a.orgId) ?? a.orgId,
    growthFactor: isFinite(a.growthFactor) ? Math.round(a.growthFactor * 10) / 10 : 999,
  }));
}
