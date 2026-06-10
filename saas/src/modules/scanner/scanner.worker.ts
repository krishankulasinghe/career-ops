import { Worker } from 'bullmq';
import { bullmqConnection } from '@/config/redis.js';
import { logger } from '@/shared/logger.js';
import { runScan } from './scanner.service.js';
import type { ScanJobData } from './scanner.queue.js';

export function createScannerWorker() {
  const worker = new Worker<ScanJobData>(
    'scan',
    async (job) => {
      const { orgId, portalIds } = job.data;
      logger.info({ jobId: job.id, orgId }, 'Scanner job started');
      const stats = await runScan(orgId, portalIds);
      const totals = stats.reduce(
        (acc, s) => ({ fetched: acc.fetched + s.fetched, inserted: acc.inserted + s.inserted }),
        { fetched: 0, inserted: 0 },
      );
      logger.info({ jobId: job.id, orgId, ...totals }, 'Scanner job completed');
      return stats;
    },
    {
      connection: bullmqConnection,
      concurrency: 10,
    },
  );

  return worker;
}
