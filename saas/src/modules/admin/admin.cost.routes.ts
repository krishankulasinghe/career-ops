import type { FastifyInstance } from 'fastify';
import { requireAuth, requireOrg } from '@/modules/auth/auth.middleware.js';
import { ForbiddenError } from '@/shared/errors.js';
import { getDailySpend, getOrgCosts, getProviderBreakdown, getModelBreakdown, getAnomalies } from './admin.cost.service.js';

async function requireSuperAdmin(req: Parameters<typeof requireAuth>[0], reply: Parameters<typeof requireAuth>[1]) {
  const user = (req as unknown as Record<string, unknown>).user as { role?: string } | undefined;
  if (user?.role !== 'admin') {
    throw new ForbiddenError('Superadmin access required');
  }
}

export async function adminCostRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth);
  fastify.addHook('preHandler', requireOrg);
  fastify.addHook('preHandler', requireSuperAdmin);

  fastify.get('/api/v1/admin/ai-costs/daily', async (req) => {
    const days = Number((req.query as Record<string, string>)['days'] ?? 90);
    return getDailySpend(Math.min(days, 365));
  });

  fastify.get('/api/v1/admin/ai-costs/orgs', async (req) => {
    const days = Number((req.query as Record<string, string>)['days'] ?? 30);
    return getOrgCosts(Math.min(days, 365));
  });

  fastify.get('/api/v1/admin/ai-costs/providers', async (req) => {
    const days = Number((req.query as Record<string, string>)['days'] ?? 30);
    return getProviderBreakdown(Math.min(days, 365));
  });

  fastify.get('/api/v1/admin/ai-costs/models', async (req) => {
    const days = Number((req.query as Record<string, string>)['days'] ?? 30);
    return getModelBreakdown(Math.min(days, 365));
  });

  fastify.get('/api/v1/admin/ai-costs/anomalies', async () => {
    return getAnomalies();
  });
}
