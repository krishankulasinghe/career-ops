import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { eq, and, isNull } from 'drizzle-orm';
import { db } from '@/config/database.js';
import { aiTasks, applications, evaluations } from '@/db/schema.js';
import { requireAuth } from '@/modules/auth/auth.middleware.js';
import { checkUsageLimit } from '@/shared/usage-meter.js';
import { evaluationQueue } from './evaluations.queue.js';
import { NotFoundError } from '@/shared/errors.js';

const evalSchema = z.object({
  url: z.string().url().optional(),
  jdText: z.string().optional(),
  applicationId: z.string().uuid().optional(),
}).refine((d) => d.url || d.jdText, { message: 'Either url or jdText is required' });

export const evaluationsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    '/api/v1/evaluations',
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const body = evalSchema.parse(req.body);
      await checkUsageLimit(req.org.id, 'evaluations');

      const [task] = await db
        .insert(aiTasks)
        .values({
          orgId: req.org.id,
          userId: req.user.id,
          taskType: 'evaluation',
          status: 'pending',
          input: body,
        })
        .returning();

      await evaluationQueue.add('evaluate', {
        taskId: task.id,
        orgId: req.org.id,
        userId: req.user.id,
        applicationId: body.applicationId,
        url: body.url,
        jdText: body.jdText,
      });

      return reply.status(202).send({ taskId: task.id });
    },
  );

  fastify.get(
    '/api/v1/evaluations/:id/status',
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const { id } = req.params as { id: string };

      const [task] = await db
        .select()
        .from(aiTasks)
        .where(and(eq(aiTasks.id, id), eq(aiTasks.orgId, req.org.id)))
        .limit(1);

      if (!task) throw new NotFoundError('Evaluation task', id);

      const output = task.output as Record<string, unknown> | null;

      return reply.send({
        status: task.status,
        progress: task.status === 'completed' ? 100 : task.status === 'processing' ? 50 : 0,
        score: output?.score,
        error: task.errorMsg,
        applicationId: output?.applicationId,
        evaluationId: output?.evaluationId,
      });
    },
  );

  fastify.get(
    '/api/v1/evaluations/:id',
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const { id } = req.params as { id: string };

      const [evaluation] = await db
        .select()
        .from(evaluations)
        .where(and(eq(evaluations.id, id), eq(evaluations.orgId, req.org.id)))
        .limit(1);

      if (!evaluation) throw new NotFoundError('Evaluation', id);

      const [application] = await db
        .select()
        .from(applications)
        .where(and(
          eq(applications.id, evaluation.applicationId),
          isNull(applications.deletedAt),
        ))
        .limit(1);

      return reply.send({ evaluation, application });
    },
  );

  fastify.get(
    '/api/v1/evaluations',
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const q = z.object({
        page: z.coerce.number().default(1),
        limit: z.coerce.number().default(20),
      }).parse(req.query);

      const rows = await db
        .select()
        .from(evaluations)
        .where(eq(evaluations.orgId, req.org.id))
        .orderBy(evaluations.createdAt)
        .limit(q.limit)
        .offset((q.page - 1) * q.limit);

      return reply.send({ evaluations: rows });
    },
  );
};
