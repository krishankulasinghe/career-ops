import type { FastifyInstance } from 'fastify';
import { requireAuth, requireOrg } from '@/modules/auth/auth.middleware.js';
import {
  getFunnel, getPatterns, getScoreDistribution, getArchetypeStats, getRecommendedScoreThreshold,
} from './analytics.service.js';

export async function analyticsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth);
  fastify.addHook('preHandler', requireOrg);

  fastify.get('/api/v1/analytics/funnel', async (req) => {
    const org = (req as unknown as { org: { id: string } }).org;
    return getFunnel(org.id);
  });

  fastify.get('/api/v1/analytics/patterns', async (req) => {
    const org = (req as unknown as { org: { id: string } }).org;
    return getPatterns(org.id);
  });

  fastify.get('/api/v1/analytics/scores', async (req) => {
    const org = (req as unknown as { org: { id: string } }).org;
    return getScoreDistribution(org.id);
  });

  fastify.get('/api/v1/analytics/archetypes', async (req) => {
    const org = (req as unknown as { org: { id: string } }).org;
    return getArchetypeStats(org.id);
  });

  fastify.get('/api/v1/analytics/score-threshold', async (req) => {
    const org = (req as unknown as { org: { id: string } }).org;
    return getRecommendedScoreThreshold(org.id);
  });
}
