import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { eq, and, ne } from 'drizzle-orm';
import { db } from '@/config/database.js';
import { organizations, memberships, users } from '@/db/schema.js';
import { requireAuth, requireOrg, requireOrgRole } from '@/modules/auth/auth.middleware.js';
import { orgUpdateSchema, inviteSchema } from '@/shared/validation.js';
import { NotFoundError, ForbiddenError, ConflictError, ValidationError } from '@/shared/errors.js';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

export const organizationsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    '/api/v1/orgs',
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const body = z.object({ name: z.string().min(1).max(255) }).parse(req.body);
      const slug = `${generateSlug(body.name)}-${Date.now()}`;

      const [org] = await db
        .insert(organizations)
        .values({ name: body.name, slug })
        .returning();

      await db.insert(memberships).values({
        userId: req.user.id,
        orgId: org.id,
        role: 'owner',
      });

      return reply.status(201).send({ organization: org });
    },
  );

  fastify.get(
    '/api/v1/orgs/:orgId',
    { preHandler: [requireAuth, requireOrg] },
    async (req, reply) => {
      return reply.send({ organization: req.org });
    },
  );

  fastify.put(
    '/api/v1/orgs/:orgId',
    { preHandler: [requireAuth, requireOrg, requireOrgRole('owner', 'admin')] },
    async (req, reply) => {
      const body = orgUpdateSchema.parse(req.body);
      const { orgId } = req.params as { orgId: string };

      const [updated] = await db
        .update(organizations)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(organizations.id, orgId))
        .returning();

      return reply.send({ organization: updated });
    },
  );

  fastify.get(
    '/api/v1/orgs/:orgId/members',
    { preHandler: [requireAuth, requireOrg] },
    async (req, reply) => {
      const { orgId } = req.params as { orgId: string };

      const members = await db
        .select({
          userId: users.id,
          email: users.email,
          fullName: users.fullName,
          role: memberships.role,
          joinedAt: memberships.joinedAt,
        })
        .from(memberships)
        .innerJoin(users, eq(memberships.userId, users.id))
        .where(eq(memberships.orgId, orgId));

      return reply.send({ members });
    },
  );

  fastify.post(
    '/api/v1/orgs/:orgId/invite',
    { preHandler: [requireAuth, requireOrg, requireOrgRole('owner', 'admin')] },
    async (req, reply) => {
      const { orgId } = req.params as { orgId: string };
      const body = inviteSchema.parse(req.body);

      const [targetUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, body.email.toLowerCase()))
        .limit(1);

      if (!targetUser) {
        return reply.status(202).send({
          message: 'Invitation sent (user will receive email when they register)',
          email: body.email,
          role: body.role,
        });
      }

      const existing = await db
        .select()
        .from(memberships)
        .where(and(eq(memberships.userId, targetUser.id), eq(memberships.orgId, orgId)))
        .limit(1);

      if (existing.length > 0) {
        throw new ConflictError('User is already a member of this organization');
      }

      const [membership] = await db
        .insert(memberships)
        .values({ userId: targetUser.id, orgId, role: body.role })
        .returning();

      return reply.status(201).send({
        message: 'Member added successfully',
        membership,
      });
    },
  );

  fastify.delete(
    '/api/v1/orgs/:orgId/members/:userId',
    { preHandler: [requireAuth, requireOrg] },
    async (req, reply) => {
      const { orgId, userId } = req.params as { orgId: string; userId: string };

      if (userId === req.user.id) {
        const ownerCount = await db
          .select()
          .from(memberships)
          .where(and(eq(memberships.orgId, orgId), eq(memberships.role, 'owner')));

        if (ownerCount.length <= 1 && req.membership.role === 'owner') {
          throw new ValidationError('Cannot remove the last owner of an organization');
        }
      } else {
        if (!['owner', 'admin'].includes(req.membership.role)) {
          throw new ForbiddenError('Only owners and admins can remove members');
        }
      }

      const [target] = await db
        .select()
        .from(memberships)
        .where(and(eq(memberships.userId, userId), eq(memberships.orgId, orgId)))
        .limit(1);

      if (!target) throw new NotFoundError('Membership');

      if (target.role === 'owner' && req.membership.role !== 'owner') {
        throw new ForbiddenError('Only owners can remove other owners');
      }

      await db
        .delete(memberships)
        .where(and(eq(memberships.userId, userId), eq(memberships.orgId, orgId)));

      return reply.send({ ok: true });
    },
  );
};
