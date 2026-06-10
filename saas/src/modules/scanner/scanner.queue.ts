import { Queue } from 'bullmq';
import { bullmqConnection } from '@/config/redis.js';

export interface ScanJobData {
  orgId: string;
  portalIds?: string[];
}

export const scannerQueue = new Queue<ScanJobData>('scan', {
  connection: bullmqConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'fixed', delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});
