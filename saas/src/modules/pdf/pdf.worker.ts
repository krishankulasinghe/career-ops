import { Worker } from 'bullmq';
import { chromium, type Browser, type Page } from 'playwright';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { eq } from 'drizzle-orm';
import { db } from '@/config/database.js';
import { bullmqConnection } from '@/config/redis.js';
import { s3 } from '@/config/s3.js';
import { env } from '@/config/env.js';
import { logger } from '@/shared/logger.js';
import { aiTasks, applications } from '@/db/schema.js';
import { incrementUsage } from '@/shared/usage-meter.js';
import { buildPdfHtml } from './pdf.service.js';
import type { PdfJobData } from './pdf.queue.js';

let browser: Browser | null = null;
let browserJobCount = 0;
const BROWSER_RECYCLE_AFTER = 50;

async function getBrowser(): Promise<Browser> {
  if (browser && browserJobCount < BROWSER_RECYCLE_AFTER) {
    return browser;
  }
  if (browser) {
    await browser.close().catch(() => {});
    browser = null;
    browserJobCount = 0;
  }
  browser = await chromium.launch({ headless: true });
  return browser;
}

async function renderPdf(html: string): Promise<Buffer> {
  const b = await getBrowser();
  let page: Page | null = null;
  try {
    page = await b.newPage();
    await page.setContent(html, { waitUntil: 'networkidle' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true });
    browserJobCount++;
    return Buffer.from(pdf);
  } finally {
    await page?.close().catch(() => {});
  }
}

export function createPdfWorker() {
  return new Worker<PdfJobData>(
    'pdf',
    async (job) => {
      const { taskId, orgId, userId, applicationId, templateId } = job.data;

      await db
        .update(aiTasks)
        .set({ status: 'processing', startedAt: new Date() })
        .where(eq(aiTasks.id, taskId));

      try {
        const { html } = await buildPdfHtml(orgId, userId, applicationId, templateId);

        const pdfBuffer = await renderPdf(html);

        const timestamp = Date.now();
        const s3Key = `${orgId}/pdfs/${applicationId}-${timestamp}.pdf`;

        await s3.send(
          new PutObjectCommand({
            Bucket: env.S3_BUCKET,
            Key: s3Key,
            Body: pdfBuffer,
            ContentType: 'application/pdf',
          }),
        );

        await db
          .update(applications)
          .set({ hasPdf: true, pdfUrl: s3Key, updatedAt: new Date() })
          .where(eq(applications.id, applicationId));

        await incrementUsage(orgId, 'pdfs', 1);

        await db
          .update(aiTasks)
          .set({
            status: 'completed',
            completedAt: new Date(),
            output: { applicationId, s3Key, sizeBytes: pdfBuffer.length },
          })
          .where(eq(aiTasks.id, taskId));

        logger.info({ taskId, applicationId, s3Key }, 'PDF generated');
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        logger.error({ taskId, err }, 'PDF generation failed');

        await db
          .update(aiTasks)
          .set({ status: 'failed', errorMsg, completedAt: new Date() })
          .where(eq(aiTasks.id, taskId));

        throw err;
      }
    },
    {
      connection: bullmqConnection,
      concurrency: 1,
    },
  );
}

export async function closePdfWorkerBrowser() {
  if (browser) {
    await browser.close().catch(() => {});
    browser = null;
  }
}
