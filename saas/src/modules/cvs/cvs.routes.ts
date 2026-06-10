import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '@/config/database.js';
import { cvs } from '@/db/schema.js';
import { requireAuth } from '@/modules/auth/auth.middleware.js';
import { NotFoundError, ForbiddenError } from '@/shared/errors.js';

const cvCreateSchema = z.object({
  name: z.string().min(1).max(255).default('default'),
  contentMd: z.string().min(1),
  isPrimary: z.boolean().default(false),
});

const cvUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  contentMd: z.string().min(1).optional(),
  isPrimary: z.boolean().optional(),
});

export const cvsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/api/v1/cvs',
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const userCvs = await db
        .select()
        .from(cvs)
        .where(and(eq(cvs.userId, req.user.id), eq(cvs.orgId, req.org.id)));
      return reply.send({ cvs: userCvs });
    },
  );

  fastify.post(
    '/api/v1/cvs',
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const body = cvCreateSchema.parse(req.body);

      if (body.isPrimary) {
        await db
          .update(cvs)
          .set({ isPrimary: false })
          .where(and(eq(cvs.userId, req.user.id), eq(cvs.orgId, req.org.id)));
      }

      const [cv] = await db
        .insert(cvs)
        .values({ ...body, userId: req.user.id, orgId: req.org.id })
        .returning();

      return reply.status(201).send({ cv });
    },
  );

  fastify.get(
    '/api/v1/cvs/:id',
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const [cv] = await db
        .select()
        .from(cvs)
        .where(and(eq(cvs.id, id), eq(cvs.userId, req.user.id)))
        .limit(1);

      if (!cv) throw new NotFoundError('CV', id);
      return reply.send({ cv });
    },
  );

  fastify.put(
    '/api/v1/cvs/:id',
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const body = cvUpdateSchema.parse(req.body);

      const [existing] = await db
        .select()
        .from(cvs)
        .where(and(eq(cvs.id, id), eq(cvs.userId, req.user.id)))
        .limit(1);

      if (!existing) throw new NotFoundError('CV', id);

      if (body.isPrimary) {
        await db
          .update(cvs)
          .set({ isPrimary: false })
          .where(and(eq(cvs.userId, req.user.id), eq(cvs.orgId, req.org.id)));
      }

      const newVersion = body.contentMd ? existing.version + 1 : existing.version;

      const [updated] = await db
        .update(cvs)
        .set({ ...body, version: newVersion, updatedAt: new Date() })
        .where(eq(cvs.id, id))
        .returning();

      return reply.send({ cv: updated });
    },
  );

  fastify.delete(
    '/api/v1/cvs/:id',
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const [cv] = await db
        .select()
        .from(cvs)
        .where(and(eq(cvs.id, id), eq(cvs.userId, req.user.id)))
        .limit(1);

      if (!cv) throw new NotFoundError('CV', id);
      if (cv.isPrimary) throw new ForbiddenError('Cannot delete primary CV. Set another CV as primary first.');

      await db.delete(cvs).where(eq(cvs.id, id));
      return reply.send({ ok: true });
    },
  );
};
