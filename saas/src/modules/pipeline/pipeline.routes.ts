import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { eq, and, inArray, isNull } from 'drizzle-orm';
import { db } from '@/config/database.js';
import { pipelineItems, aiTasks } from '@/db/schema.js';
import { requireAuth } from '@/modules/auth/auth.middleware.js';
import { evaluationQueue } from '@/modules/evaluations/evaluations.queue.js';
import { extractMetaFromUrl } from './pipeline.service.js';
import { NotFoundError } from '@/shared/errors.js';

const VALID_STATUSES = ['pending', 'processing', 'processed', 'failed'] as const;

const addSchema = z.object({
  urls: z.array(z.string().url()).min(1).max(200),
  source: z.string().max(50).optional(),
});

const updateSchema = z.object({
  status: z.enum(VALID_STATUSES).optional(),
  notes: z.string().optional(),
  company: z.string().max(255).optional(),
  title: z.string().max(500).optional(),
});

export const pipelineRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/api/v1/pipeline',
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const q = z.object({
        status: z.enum(VALID_STATUSES).optional(),
        page: z.coerce.number().default(1),
        limit: z.coerce.number().default(50),
      }).parse(req.query);

      const conditions = [eq(pipelineItems.orgId, req.org.id), isNull(pipelineItems.deletedAt)];
      if (q.status) conditions.push(eq(pipelineItems.status, q.status));

      const rows = await db
        .select()
        .from(pipelineItems)
        .where(and(...conditions))
        .orderBy(pipelineItems.addedAt)
        .limit(q.limit)
        .offset((q.page - 1) * q.limit);

      return reply.send({ items: rows, page: q.page, limit: q.limit });
    },
  );

  fastify.post(
    '/api/v1/pipeline',
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const body = addSchema.parse(req.body);

      // Fetch existing URLs for this org to dedup
      const existing = await db
        .select({ url: pipelineItems.url })
        .from(pipelineItems)
        .where(and(eq(pipelineItems.orgId, req.org.id), isNull(pipelineItems.deletedAt)));

      const existingUrls = new Set(existing.map((r) => r.url));

      const toInsert = body.urls.filter((url) => !existingUrls.has(url));
      const skipped = body.urls.length - toInsert.length;

      if (toInsert.length === 0) {
        return reply.send({ created: 0, skipped, errors: [] });
      }

      const values = toInsert.map((url) => {
        const { company, title } = extractMetaFromUrl(url);
        return {
          userId: req.user.id,
          orgId: req.org.id,
          url,
          company,
          title,
          source: body.source ?? 'manual',
          status: 'pending' as const,
        };
      });

      await db.insert(pipelineItems).values(values);

      return reply.status(201).send({ created: toInsert.length, skipped, errors: [] });
    },
  );

  fastify.put(
    '/api/v1/pipeline/:id',
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const body = updateSchema.parse(req.body);

      const [item] = await db
        .select()
        .from(pipelineItems)
        .where(and(eq(pipelineItems.id, id), eq(pipelineItems.orgId, req.org.id), isNull(pipelineItems.deletedAt)))
        .limit(1);

      if (!item) throw new NotFoundError('Pipeline item', id);

      const updates: Partial<typeof item> = {};
      if (body.status) updates.status = body.status;
      if (body.company !== undefined) updates.company = body.company;
      if (body.title !== undefined) updates.title = body.title;

      await db
        .update(pipelineItems)
        .set(updates)
        .where(eq(pipelineItems.id, id));

      return reply.send({ ...item, ...updates });
    },
  );

  fastify.delete(
    '/api/v1/pipeline/:id',
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const { id } = req.params as { id: string };

      const [item] = await db
        .select({ id: pipelineItems.id })
        .from(pipelineItems)
        .where(and(eq(pipelineItems.id, id), eq(pipelineItems.orgId, req.org.id), isNull(pipelineItems.deletedAt)))
        .limit(1);

      if (!item) throw new NotFoundError('Pipeline item', id);

      await db
        .update(pipelineItems)
        .set({ deletedAt: new Date() })
        .where(eq(pipelineItems.id, id));

      return reply.status(204).send();
    },
  );

  fastify.post(
    '/api/v1/pipeline/process',
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const pending = await db
        .select()
        .from(pipelineItems)
        .where(and(
          eq(pipelineItems.orgId, req.org.id),
          eq(pipelineItems.status, 'pending'),
          isNull(pipelineItems.deletedAt),
        ));

      if (pending.length === 0) {
        return reply.send({ enqueued: 0, skipped: 0 });
      }

      let enqueued = 0;
      const errors: Array<{ id: string; error: string }> = [];

      for (const item of pending) {
        try {
          const [task] = await db
            .insert(aiTasks)
            .values({
              orgId: req.org.id,
              userId: req.user.id,
              taskType: 'evaluation',
              status: 'pending',
              input: { url: item.url, pipelineItemId: item.id },
            })
            .returning();

          await evaluationQueue.add('evaluate', {
            taskId: task.id,
            orgId: req.org.id,
            userId: req.user.id,
            url: item.url,
          });

          await db
            .update(pipelineItems)
            .set({ status: 'processing' })
            .where(eq(pipelineItems.id, item.id));

          enqueued++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push({ id: item.id, error: msg });

          await db
            .update(pipelineItems)
            .set({ status: 'failed' })
            .where(eq(pipelineItems.id, item.id));
        }
      }

      return reply.send({ enqueued, skipped: 0, errors });
    },
  );
};
