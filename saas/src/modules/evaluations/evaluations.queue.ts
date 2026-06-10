import { Queue } from 'bullmq';
import { bullmqConnection } from '@/config/redis.js';

export interface EvaluationJobData {
  taskId: string;
  orgId: string;
  userId: string;
  applicationId?: string;
  url?: string;
  jdText?: string;
}

export const evaluationQueue = new Queue<EvaluationJobData>('evaluation', {
  connection: bullmqConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});
