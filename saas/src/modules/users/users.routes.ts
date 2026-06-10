import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/config/database.js';
import { users, profiles } from '@/db/schema.js';
import { requireAuth } from '@/modules/auth/auth.middleware.js';
import { profileUpdateSchema } from '@/shared/validation.js';
import { NotFoundError } from '@/shared/errors.js';

const userUpdateSchema = z.object({
  fullName: z.string().min(2).max(255).optional(),
  avatarUrl: z.string().url().optional(),
});

export const usersRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/api/v1/users/me',
    { preHandler: [requireAuth] },
    async (req, reply) => {
      return reply.send({
        user: {
          id: req.user.id,
          email: req.user.email,
          fullName: req.user.fullName,
          avatarUrl: req.user.avatarUrl,
          role: req.user.role,
          emailVerifiedAt: req.user.emailVerifiedAt,
          createdAt: req.user.createdAt,
        },
      });
    },
  );

  fastify.put(
    '/api/v1/users/me',
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const body = userUpdateSchema.parse(req.body);

      const [updated] = await db
        .update(users)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(users.id, req.user.id))
        .returning();

      return reply.send({
        user: {
          id: updated.id,
          email: updated.email,
          fullName: updated.fullName,
          avatarUrl: updated.avatarUrl,
          role: updated.role,
        },
      });
    },
  );

  fastify.get(
    '/api/v1/users/me/profile',
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const [profile] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.userId, req.user.id))
        .limit(1);

      if (!profile) throw new NotFoundError('Profile');

      return reply.send({ profile });
    },
  );

  fastify.put(
    '/api/v1/users/me/profile',
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const body = profileUpdateSchema.parse(req.body);

      const existing = await db
        .select()
        .from(profiles)
        .where(eq(profiles.userId, req.user.id))
        .limit(1);

      let profile;
      if (existing.length === 0) {
        [profile] = await db
          .insert(profiles)
          .values({ userId: req.user.id, orgId: req.org.id, ...body })
          .returning();
      } else {
        [profile] = await db
          .update(profiles)
          .set({ ...body, updatedAt: new Date() })
          .where(eq(profiles.userId, req.user.id))
          .returning();
      }

      return reply.send({ profile });
    },
  );
};
