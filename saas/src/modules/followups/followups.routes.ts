import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth, requireOrg } from '@/modules/auth/auth.middleware.js';
import { listFollowUps, createFollowUp, updateFollowUp, listFollowUpHistory } from './followups.service.js';

const createFollowUpSchema = z.object({
  applicationId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  channel: z.enum(['email', 'linkedin', 'phone', 'other']).optional(),
  contactName: z.string().max(255).optional(),
  contactEmail: z.string().email().optional(),
  notes: z.string().optional(),
});

export async function followupsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth);
  fastify.addHook('preHandler', requireOrg);

  fastify.get('/api/v1/followups', async (req) => {
    const org = (req as unknown as { org: { id: string } }).org;
    const user = (req as unknown as { user: { id: string } }).user;
    return listFollowUps(org.id, user.id);
  });

  fastify.post('/api/v1/followups', async (req, reply) => {
    const user = (req as unknown as { user: { id: string } }).user;
    const body = createFollowUpSchema.parse(req.body);
    const followUp = await createFollowUp(user.id, body);
    return reply.code(201).send(followUp);
  });

  fastify.put<{ Params: { id: string } }>('/api/v1/followups/:id', async (req) => {
    const user = (req as unknown as { user: { id: string } }).user;
    const body = createFollowUpSchema.partial().omit({ applicationId: true }).parse(req.body);
    return updateFollowUp(user.id, req.params.id, body);
  });

  fastify.get<{ Params: { appId: string } }>('/api/v1/applications/:appId/followups', async (req) => {
    const user = (req as unknown as { user: { id: string } }).user;
    return listFollowUpHistory(req.params.appId, user.id);
  });
}
