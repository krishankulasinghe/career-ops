import { Worker } from 'bullmq';
import { eq } from 'drizzle-orm';
import { bullmqConnection } from '@/config/redis.js';
import { db } from '@/config/database.js';
import { aiTasks } from '@/db/schema.js';
import { logger } from '@/shared/logger.js';
import { checkUrlLiveness } from './liveness.service.js';
import type { LivenessJobData } from './liveness.queue.js';

export function createLivenessWorker() {
  const worker = new Worker<LivenessJobData>(
    'liveness',
    async (job) => {
      const { taskId, urls } = job.data;

      await db
        .update(aiTasks)
        .set({ status: 'processing', startedAt: new Date() })
        .where(eq(aiTasks.id, taskId));

      const results = await Promise.all(urls.map((url) => checkUrlLiveness(url)));

      await db
        .update(aiTasks)
        .set({
          status: 'completed',
          output: results,
          completedAt: new Date(),
        })
        .where(eq(aiTasks.id, taskId));

      logger.info({ taskId, count: results.length }, 'Liveness check completed');
      return results;
    },
    {
      connection: bullmqConnection,
      concurrency: 1,
    },
  );

  return worker;
}
