import type { FastifyInstance } from 'fastify';
import { requireAuth, requireOrg } from '@/modules/auth/auth.middleware.js';
import { getApiKeyStats } from './public-api.rate-limit.js';

export async function publicApiRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth);
  fastify.addHook('preHandler', requireOrg);

  fastify.get('/api/v1/api-keys/analytics', {
    schema: {
      tags: ['API Keys'],
      summary: 'Get API key usage analytics for the organization',
      querystring: {
        type: 'object',
        properties: {
          hours: { type: 'integer', minimum: 1, maximum: 720, default: 24, description: 'Number of hours to look back' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            totalRequests: { type: 'integer' },
            windows: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  hour: { type: 'string' },
                  count: { type: 'integer' },
                },
              },
            },
            topEndpoints: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  endpoint: { type: 'string' },
                  count: { type: 'integer' },
                },
              },
            },
            plan: { type: 'string' },
            rateLimit: { type: 'integer' },
          },
        },
      },
    },
  }, async (req) => {
    const { hours = 24 } = req.query as { hours?: number };
    const plan = req.org.plan;
    const tierLimits: Record<string, number> = { free: 100, pro: 1000, team: 10000, enterprise: 100000 };
    const stats = await getApiKeyStats(req.org.id, hours);
    return {
      ...stats,
      plan,
      rateLimit: tierLimits[plan] ?? 100,
    };
  });
}
