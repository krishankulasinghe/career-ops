import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth, requireOrg, requireOrgRole } from '@/modules/auth/auth.middleware.js';
import { inviteMember, acceptInvitation, listMembers, removeMember } from './invitations.service.js';

export async function invitationsRoutes(fastify: FastifyInstance) {
  // List org members
  fastify.get(
    '/api/v1/organizations/members',
    { preHandler: [requireAuth, requireOrg] },
    async (req) => listMembers(req.org.id),
  );

  // Invite a new member (admin/owner only)
  fastify.post(
    '/api/v1/organizations/invite',
    { preHandler: [requireAuth, requireOrg, requireOrgRole('admin', 'owner')] },
    async (req, reply) => {
      const body = z.object({
        email: z.string().email(),
        role: z.enum(['member', 'admin']).default('member'),
      }).parse(req.body);

      const invitation = await inviteMember(req.org.id, req.user.id, body.email, body.role);
      return reply.code(201).send(invitation);
    },
  );

  // Accept invitation (authenticated)
  fastify.post<{ Params: { token: string } }>(
    '/api/v1/invites/:token/accept',
    { preHandler: [requireAuth] },
    async (req) => acceptInvitation(req.params.token, req.user.id),
  );

  // Remove a member (admin/owner only)
  fastify.delete<{ Params: { userId: string } }>(
    '/api/v1/organizations/members/:userId',
    { preHandler: [requireAuth, requireOrg, requireOrgRole('admin', 'owner')] },
    async (req, reply) => {
      await removeMember(req.org.id, req.params.userId, req.user.id);
      return reply.code(204).send();
    },
  );
}
