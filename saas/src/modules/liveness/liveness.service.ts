import { and, eq, inArray, lt, isNull } from 'drizzle-orm';
import { db } from '@/config/database.js';
import { applications, aiTasks } from '@/db/schema.js';
import { classifyLiveness } from '@/shared/liveness-classifier.js';
import { logger } from '@/shared/logger.js';
import { livenessQueue } from './liveness.queue.js';

export interface UrlLivenessResult {
  url: string;
  result: 'active' | 'expired' | 'uncertain';
  reason: string;
}

// Check using HTTP fetch (no Playwright) — for batch API use
export async function checkUrlLiveness(url: string): Promise<UrlLivenessResult> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15_000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CareerOps/1.0)' },
    });

    const bodyText = await res.text().catch(() => '');
    const classified = classifyLiveness({
      status: res.status,
      finalUrl: res.url,
      bodyText: bodyText.slice(0, 8_000),
    });

    return { url, ...classified };
  } catch (err) {
    logger.warn({ err, url }, 'Liveness check failed');
    return { url, result: 'uncertain', reason: 'fetch error' };
  }
}

// Enqueue batch liveness check
export async function enqueueLivenessCheck(orgId: string, urls: string[]) {
  const [task] = await db
    .insert(aiTasks)
    .values({
      orgId,
      taskType: 'liveness',
      status: 'pending',
      input: { urls },
    })
    .returning();

  await livenessQueue.add('liveness', { taskId: task.id, orgId, urls });
  return task;
}

// Nightly: auto-discard expired postings for applied/active applications
export async function runNightlyExpiryCheck(orgId: string) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 14);

  const activeApps = await db
    .select()
    .from(applications)
    .where(
      and(
        eq(applications.orgId, orgId),
        isNull(applications.deletedAt),
        inArray(applications.status, ['Applied', 'Responded', 'Interview']),
        lt(applications.updatedAt, cutoff),
      ),
    );

  let expired = 0;
  for (const app of activeApps) {
    if (!app.jobUrl) continue;
    const result = await checkUrlLiveness(app.jobUrl);
    if (result.result === 'expired') {
      await db
        .update(applications)
        .set({
          status: 'Discarded',
          notes: (app.notes ? app.notes + '\n' : '') + 'Posting expired (auto-detected)',
          updatedAt: new Date(),
        })
        .where(eq(applications.id, app.id));
      expired++;
    }
  }

  return { checked: activeApps.length, expired };
}
