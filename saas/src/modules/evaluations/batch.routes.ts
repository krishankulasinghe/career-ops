import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { requireAuth, requireOrg } from '@/modules/auth/auth.middleware.js';
import { db } from '@/config/database.js';
import { applications, aiTasks } from '@/db/schema.js';
import { evaluationQueue } from './evaluations.queue.js';
import { checkUsageLimit } from '@/shared/usage-meter.js';

const batchSchema = z.object({
  urls: z.array(z.string().url()).min(1).max(50),
  options: z.object({
    minScore: z.number().min(0).max(5).optional(),
    skipPdf: z.boolean().optional(),
  }).optional(),
});

export async function batchRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth);
  fastify.addHook('preHandler', requireOrg);

  fastify.post('/api/v1/evaluations/batch', async (req, reply) => {
    const org = (req as unknown as { org: { id: string } }).org;
    const user = (req as unknown as { user: { id: string } }).user;
    const body = batchSchema.parse(req.body);

    await checkUsageLimit(org.id, 'evaluations');

    const taskIds: string[] = [];

    for (const url of body.urls) {
      // Create a placeholder application for each URL
      const hostname = new URL(url).hostname.replace('www.', '');
      const [application] = await db
        .insert(applications)
        .values({
          orgId: org.id,
          userId: user.id,
          seqNumber: 0,
          date: new Date().toISOString().slice(0, 10),
          company: hostname,
          role: 'Unknown Role',
          jobUrl: url,
          status: 'Evaluated',
        })
        .returning();

      const [task] = await db
        .insert(aiTasks)
        .values({
          orgId: org.id,
          userId: user.id,
          taskType: 'evaluation',
          status: 'pending',
          input: { url, applicationId: application.id, minScore: body.options?.minScore, skipPdf: body.options?.skipPdf },
        })
        .returning();

      await evaluationQueue.add('evaluate', {
        taskId: task.id,
        orgId: org.id,
        userId: user.id,
        applicationId: application.id,
        url,
      });

      taskIds.push(task.id);
    }

    return reply.code(202).send({ taskIds, count: taskIds.length, status: 'queued' });
  });

  fastify.get('/api/v1/evaluations/batch/status', async (req) => {
    const org = (req as unknown as { org: { id: string } }).org;
    const query = z.object({
      taskIds: z.string().transform((s) => s.split(',')),
    }).parse(req.query);

    const tasks = await db
      .select()
      .from(aiTasks)
      .where(eq(aiTasks.orgId, org.id));

    return tasks.filter((t) => query.taskIds.includes(t.id));
  });
}
