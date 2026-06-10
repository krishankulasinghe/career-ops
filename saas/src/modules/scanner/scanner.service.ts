import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/config/database.js';
import { portals, scanResults, titleFilters } from '@/db/schema.js';
import { buildTitleFilter } from '@/modules/scanner/ats-detector.js';
import { logger } from '@/shared/logger.js';
import { incrementUsage } from '@/shared/usage-meter.js';

interface JobEntry {
  url: string;
  title: string;
  company: string;
  location?: string;
}

async function fetchGreenhouse(apiUrl: string): Promise<JobEntry[]> {
  const res = await fetch(apiUrl, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) return [];
  const json = await res.json() as { jobs?: Array<{ absolute_url: string; title: string; location?: { name?: string } }> };
  return (json.jobs ?? []).map((j) => ({
    url: j.absolute_url,
    title: j.title,
    company: new URL(apiUrl).hostname.split('.')[0] ?? 'unknown',
    location: j.location?.name,
  }));
}

async function fetchAshby(apiUrl: string, company: string): Promise<JobEntry[]> {
  const res = await fetch(apiUrl, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) return [];
  const json = await res.json() as { jobs?: Array<{ jobUrl: string; title: string; team?: { name?: string }; isRemote?: boolean; location?: string }> };
  return (json.jobs ?? []).map((j) => ({
    url: j.jobUrl,
    title: j.title,
    company,
    location: j.location ?? (j.isRemote ? 'Remote' : undefined),
  }));
}

async function fetchLever(apiUrl: string, company: string): Promise<JobEntry[]> {
  const res = await fetch(apiUrl, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) return [];
  const json = await res.json() as Array<{ hostedUrl: string; text: string; categories?: { location?: string } }>;
  return (Array.isArray(json) ? json : []).map((j) => ({
    url: j.hostedUrl,
    title: j.text,
    company,
    location: j.categories?.location,
  }));
}

async function fetchJobs(portal: { apiType: string | null; apiUrl: string | null; name: string }): Promise<JobEntry[]> {
  if (!portal.apiUrl) return [];
  try {
    switch (portal.apiType) {
      case 'greenhouse': return await fetchGreenhouse(portal.apiUrl);
      case 'ashby': return await fetchAshby(portal.apiUrl, portal.name);
      case 'lever': return await fetchLever(portal.apiUrl, portal.name);
      default: return [];
    }
  } catch (err) {
    logger.warn({ err, portal: portal.name }, 'Failed to fetch portal jobs');
    return [];
  }
}

export interface ScanStats {
  portalId: string;
  portalName: string;
  fetched: number;
  inserted: number;
  filtered: number;
}

export async function runScan(orgId: string, portalIds?: string[]): Promise<ScanStats[]> {
  const portalQuery = db
    .select()
    .from(portals)
    .where(and(eq(portals.orgId, orgId), isNull(portals.deletedAt), eq(portals.enabled, true)));

  const allPortals = await portalQuery;
  const targets = portalIds
    ? allPortals.filter((p) => portalIds.includes(p.id))
    : allPortals;

  const filters = await db.select().from(titleFilters).where(eq(titleFilters.orgId, orgId));
  const positive = filters.filter((f) => f.type === 'positive').map((f) => f.keyword);
  const negative = filters.filter((f) => f.type === 'negative').map((f) => f.keyword);
  const titlePredicate = buildTitleFilter({ positive, negative });

  const stats: ScanStats[] = [];

  for (const portal of targets) {
    const jobs = await fetchJobs(portal);
    let inserted = 0;
    let filtered = 0;

    for (const job of jobs) {
      if (!titlePredicate(job.title)) { filtered++; continue; }

      try {
        await db
          .insert(scanResults)
          .values({
            orgId,
            portalId: portal.id,
            url: job.url,
            title: job.title,
            company: job.company,
            location: job.location,
            source: portal.apiType ?? 'custom',
            status: 'added',
            firstSeen: new Date().toISOString().slice(0, 10),
          })
          .onConflictDoNothing();
        inserted++;
      } catch {
        // unique constraint violation = already seen
      }
    }

    await incrementUsage(orgId, 'scans', 1);

    stats.push({ portalId: portal.id, portalName: portal.name, fetched: jobs.length, inserted, filtered });
  }

  return stats;
}

export async function listScanResults(orgId: string, params: { portalId?: string; since?: string; page?: number; limit?: number }) {
  const { page = 1, limit = 50 } = params;
  const offset = (page - 1) * limit;

  const conditions = [eq(scanResults.orgId, orgId)];
  if (params.portalId) conditions.push(eq(scanResults.portalId, params.portalId));

  return db
    .select()
    .from(scanResults)
    .where(and(...conditions))
    .orderBy(scanResults.createdAt)
    .limit(limit)
    .offset(offset);
}
