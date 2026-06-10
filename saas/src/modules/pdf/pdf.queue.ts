import { Queue } from 'bullmq';
import { bullmqConnection } from '@/config/redis.js';

export interface PdfJobData {
  taskId: string;
  orgId: string;
  userId: string;
  applicationId: string;
  templateId?: string;
}

export const pdfQueue = new Queue<PdfJobData>('pdf', {
  connection: bullmqConnection,
  defaultJobOptions: {
    attempts: 1,
    backoff: { type: 'fixed', delay: 10000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});
