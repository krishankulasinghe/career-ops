import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth, requireOrg } from '@/modules/auth/auth.middleware.js';
import {
  getDataResidency,
  setDataResidency,
  REGION_LABELS,
  type DataResidencyRegion,
} from './data-residency.service.js';

const REGIONS = ['us-east-1', 'eu-west-1', 'ap-southeast-1'] as const;

export async function dataResidencyRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth);
  fastify.addHook('preHandler', requireOrg);

  fastify.get('/api/v1/settings/data-residency', async (req) => {
    const residency = await getDataResidency(req.org.id);
    return {
      ...residency,
      availableRegions: REGIONS.map((r) => ({
        value: r,
        label: REGION_LABELS[r],
      })),
    };
  });

  fastify.put('/api/v1/settings/data-residency', async (req, reply) => {
    const { region } = z.object({ region: z.enum(REGIONS) }).parse(req.body);
    await setDataResidency(req.org.id, region as DataResidencyRegion, req.org.plan);
    return { ok: true };
  });
}
