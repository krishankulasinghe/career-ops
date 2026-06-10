import type { FastifyInstance } from 'fastify';
import { requireAuth, requireOrg } from '@/modules/auth/auth.middleware.js';
import { ForbiddenError } from '@/shared/errors.js';
import {
  runSmartDedup,
  detectScanAnomalies,
  getQualityCalibration,
  getBatchOptimization,
} from './admin.ai-ops.js';
import { getDailySpend } from './admin.cost.service.js';

async function requireSuperAdmin(req: Parameters<typeof requireAuth>[0]) {
  const user = (req as unknown as Record<string, unknown>).user as { role?: string } | undefined;
  if (user?.role !== 'admin') throw new ForbiddenError('Superadmin access required');
}

export async function adminAiOpsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth);
  fastify.addHook('preHandler', requireOrg);
  fastify.addHook('preHandler', requireSuperAdmin);

  fastify.get('/api/v1/admin/ai-ops/dedup', async (req) => {
    const { orgId } = req.query as { orgId?: string };
    return runSmartDedup(orgId);
  });

  fastify.get('/api/v1/admin/ai-ops/scan-anomalies', async () => {
    return detectScanAnomalies();
  });

  fastify.get('/api/v1/admin/ai-ops/calibration', async (req) => {
    const { orgId } = req.query as { orgId?: string };
    return getQualityCalibration(orgId);
  });

  fastify.get('/api/v1/admin/ai-ops/batch-optimization', async () => {
    return getBatchOptimization();
  });

  fastify.get('/api/v1/admin/ai-ops/forecast', async () => {
    const { series, forecastEOM } = await getDailySpend(90);
    return { series, forecastEOM };
  });
}
