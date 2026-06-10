import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth, requireOrg } from '@/modules/auth/auth.middleware.js';
import { getAISettings, updateAISettings, testAIConnection, getAllowedProviders } from './ai-settings.service.js';

const updateSchema = z.object({
  provider: z.enum(['deepseek', 'gemini', 'openai', 'anthropic']).optional(),
  model: z.string().max(100).optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(256).max(32768).optional(),
  fallbackProvider: z.enum(['deepseek', 'gemini', 'openai', 'anthropic']).nullable().optional(),
  apiKey: z.string().min(10).max(512).optional(),
});

export async function aiSettingsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth);
  fastify.addHook('preHandler', requireOrg);

  fastify.get('/api/v1/settings/ai', async (req) => {
    const orgId = req.org!.id;
    const settings = await getAISettings(orgId);
    const allowedProviders = getAllowedProviders(req.org!.plan);
    return { ...settings, allowedProviders };
  });

  fastify.put('/api/v1/settings/ai', async (req, reply) => {
    const body = updateSchema.parse(req.body);
    const settings = await updateAISettings(req.org!.id, req.org!.plan, {
      provider: body.provider,
      model: body.model,
      temperature: body.temperature,
      maxTokens: body.maxTokens,
      fallbackProvider: body.fallbackProvider,
      apiKey: body.apiKey,
    });
    return settings;
  });

  fastify.post('/api/v1/settings/ai/test', async (req, reply) => {
    const result = await testAIConnection(req.org!.id);
    reply.status(result.ok ? 200 : 502);
    return result;
  });
}
