import 'dotenv/config';
import { redis } from '@/config/redis.js';
import { logger } from '@/shared/logger.js';
import { createEvaluationWorker } from '@/modules/evaluations/evaluations.worker.js';
import { createPdfWorker, closePdfWorkerBrowser } from '@/modules/pdf/pdf.worker.js';
import { createScannerWorker } from '@/modules/scanner/scanner.worker.js';
import { createLivenessWorker } from '@/modules/liveness/liveness.worker.js';

logger.info('Worker process started');

const evaluationWorker = createEvaluationWorker();
const pdfWorker = createPdfWorker();
const scannerWorker = createScannerWorker();
const livenessWorker = createLivenessWorker();

evaluationWorker.on('completed', (job) => {
  logger.info({ jobId: job.id, taskId: job.data.taskId }, 'Evaluation job completed');
});

evaluationWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, taskId: job?.data?.taskId, err }, 'Evaluation job failed');
});

pdfWorker.on('completed', (job) => {
  logger.info({ jobId: job.id, taskId: job.data.taskId }, 'PDF job completed');
});

pdfWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, taskId: job?.data?.taskId, err }, 'PDF job failed');
});

const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];
for (const signal of signals) {
  process.on(signal, async () => {
    logger.info({ signal }, 'Shutting down workers...');
    await Promise.all([evaluationWorker.close(), pdfWorker.close(), scannerWorker.close(), livenessWorker.close()]);
    await closePdfWorkerBrowser();
    await redis.quit();
    process.exit(0);
  });
}

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled rejection in worker');
});
