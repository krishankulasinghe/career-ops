import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { requireAuth, requireOrg } from '@/modules/auth/auth.middleware.js';
import { db } from '@/config/database.js';
import { aiTasks } from '@/db/schema.js';
import { enqueueLivenessCheck } from './liveness.service.js';
import { NotFoundError } from '@/shared/errors.js';

export async function livenessRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth);
  fastify.addHook('preHandler', requireOrg);

  fastify.post('/api/v1/liveness/check', async (req, reply) => {
    const org = (req as unknown as { org: { id: string } }).org;
    const body = z.object({ urls: z.array(z.string().url()).min(1).max(50) }).parse(req.body);
    const task = await enqueueLivenessCheck(org.id, body.urls);
    return reply.code(202).send({ taskId: task.id, status: 'queued' });
  });

  fastify.get<{ Params: { taskId: string } }>('/api/v1/liveness/:taskId/status', async (req) => {
    const org = (req as unknown as { org: { id: string } }).org;
    const [task] = await db
      .select()
      .from(aiTasks)
      .where(eq(aiTasks.id, req.params.taskId));

    if (!task || task.orgId !== org.id) throw new NotFoundError('Task not found');
    return task;
  });
}
