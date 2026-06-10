import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth, requireOrg } from '@/modules/auth/auth.middleware.js';
import {
  listWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  listDeliveries,
  testDelivery,
  WEBHOOK_EVENTS,
} from './webhooks.service.js';

const createSchema = z.object({
  url: z.string().url().max(2048),
  events: z.array(z.string().max(100)).min(1),
});

const updateSchema = z.object({
  url: z.string().url().max(2048).optional(),
  events: z.array(z.string().max(100)).optional(),
  active: z.boolean().optional(),
});

export async function webhooksRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth);
  fastify.addHook('preHandler', requireOrg);

  // Gated to Team plan+
  const guardPlan = async (req: Parameters<typeof requireAuth>[0], reply: Parameters<typeof requireAuth>[1]) => {
    const plan = req.org?.plan ?? 'free';
    if (!['team', 'enterprise'].includes(plan)) {
      reply.status(403).send({ error: { code: 'PLAN_REQUIRED', message: 'Webhooks require Team or Enterprise plan' } });
    }
  };

  fastify.get('/api/v1/webhooks', { preHandler: [guardPlan] }, async (req) => {
    return listWebhooks(req.org!.id);
  });

  fastify.get('/api/v1/webhooks/events', async () => {
    return WEBHOOK_EVENTS;
  });

  fastify.post('/api/v1/webhooks', { preHandler: [guardPlan] }, async (req, reply) => {
    const body = createSchema.parse(req.body);
    const webhook = await createWebhook(req.org!.id, body);
    reply.status(201);
    return webhook;
  });

  fastify.put('/api/v1/webhooks/:id', { preHandler: [guardPlan] }, async (req) => {
    const { id } = req.params as { id: string };
    const body = updateSchema.parse(req.body);
    return updateWebhook(req.org!.id, id, body);
  });

  fastify.delete('/api/v1/webhooks/:id', { preHandler: [guardPlan] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    await deleteWebhook(req.org!.id, id);
    reply.status(204);
    return;
  });

  fastify.post('/api/v1/webhooks/:id/test', { preHandler: [guardPlan] }, async (req) => {
    const { id } = req.params as { id: string };
    return testDelivery(req.org!.id, id);
  });

  fastify.get('/api/v1/webhooks/:id/deliveries', { preHandler: [guardPlan] }, async (req) => {
    const { id } = req.params as { id: string };
    return listDeliveries(req.org!.id, id);
  });
}
