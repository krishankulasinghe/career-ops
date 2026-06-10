import { Queue } from 'bullmq';
import { bullmqConnection } from '@/config/redis.js';

export interface LivenessJobData {
  taskId: string;
  orgId: string;
  urls: string[];
}

export const livenessQueue = new Queue<LivenessJobData>('liveness', {
  connection: bullmqConnection,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});
