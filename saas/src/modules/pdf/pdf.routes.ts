import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { db } from '@/config/database.js';
import { s3 } from '@/config/s3.js';
import { env } from '@/config/env.js';
import { aiTasks, applications } from '@/db/schema.js';
import { requireAuth } from '@/modules/auth/auth.middleware.js';
import { pdfQueue } from './pdf.queue.js';
import { NotFoundError } from '@/shared/errors.js';

const generateSchema = z.object({
  applicationId: z.string().uuid(),
  templateId: z.string().uuid().optional(),
});

export const pdfRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    '/api/v1/pdf/generate',
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const body = generateSchema.parse(req.body);

      const [application] = await db
        .select({ id: applications.id })
        .from(applications)
        .where(and(eq(applications.id, body.applicationId), eq(applications.orgId, req.org.id)))
        .limit(1);

      if (!application) throw new NotFoundError('Application', body.applicationId);

      const [task] = await db
        .insert(aiTasks)
        .values({
          orgId: req.org.id,
          userId: req.user.id,
          taskType: 'pdf',
          status: 'pending',
          input: body,
        })
        .returning();

      await pdfQueue.add('generate-pdf', {
        taskId: task.id,
        orgId: req.org.id,
        userId: req.user.id,
        applicationId: body.applicationId,
        templateId: body.templateId,
      });

      return reply.status(202).send({ taskId: task.id });
    },
  );

  fastify.get(
    '/api/v1/pdf/:id/status',
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const { id } = req.params as { id: string };

      const [task] = await db
        .select()
        .from(aiTasks)
        .where(and(eq(aiTasks.id, id), eq(aiTasks.orgId, req.org.id)))
        .limit(1);

      if (!task) throw new NotFoundError('PDF task', id);

      const output = task.output as Record<string, unknown> | null;

      return reply.send({
        status: task.status,
        progress: task.status === 'completed' ? 100 : task.status === 'processing' ? 50 : 0,
        s3Key: output?.s3Key,
        sizeBytes: output?.sizeBytes,
        error: task.errorMsg,
      });
    },
  );

  fastify.get(
    '/api/v1/pdf/:id',
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const { id } = req.params as { id: string };

      // `id` can be either a task ID or an application ID
      let s3Key: string | null = null;

      // Try as task ID first
      const [task] = await db
        .select()
        .from(aiTasks)
        .where(and(eq(aiTasks.id, id), eq(aiTasks.orgId, req.org.id)))
        .limit(1);

      if (task?.output) {
        s3Key = (task.output as Record<string, unknown>).s3Key as string ?? null;
      }

      // Try as application ID
      if (!s3Key) {
        const [app] = await db
          .select({ pdfUrl: applications.pdfUrl })
          .from(applications)
          .where(and(eq(applications.id, id), eq(applications.orgId, req.org.id)))
          .limit(1);

        s3Key = app?.pdfUrl ?? null;
      }

      if (!s3Key) throw new NotFoundError('PDF', id);

      const signedUrl = await getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: s3Key }),
        { expiresIn: 3600 },
      );

      return reply.redirect(302, signedUrl);
    },
  );
};
