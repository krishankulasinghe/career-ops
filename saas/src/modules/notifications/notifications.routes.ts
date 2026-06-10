import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '@/modules/auth/auth.middleware.js';
import { listNotifications, countUnread, markRead, markAllRead } from './notifications.service.js';

export async function notificationsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth);

  fastify.get('/api/v1/notifications', async (req) => {
    const query = z.object({ limit: z.coerce.number().min(1).max(50).default(20) }).parse(req.query);
    const [items, unreadCount] = await Promise.all([
      listNotifications(req.user.id, query.limit),
      countUnread(req.user.id),
    ]);
    return { items, unreadCount };
  });

  fastify.put<{ Params: { id: string } }>('/api/v1/notifications/:id/read', async (req) => {
    return markRead(req.user.id, req.params.id);
  });

  fastify.post('/api/v1/notifications/mark-all-read', async (_req, reply) => {
    await markAllRead(_req.user.id);
    return reply.code(204).send();
  });
}
