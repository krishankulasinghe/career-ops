import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth, requireOrg } from '@/modules/auth/auth.middleware.js';
import {
  listPromptTemplates,
  getTemplateVersions,
  createOrUpdateOverride,
  rollbackToVersion,
  enableABTest,
  disableABTest,
  getABTestStats,
} from './prompts.service.js';
import { getProvider } from './ai.router.js';

const overrideSchema = z.object({
  name: z.string().min(1).max(100),
  language: z.string().default('en'),
  content: z.string().min(10),
});

const testSchema = z.object({
  promptContent: z.string().min(10),
  cvContent: z.string().default('Senior Software Engineer with 5+ years experience.'),
  jdContent: z.string().default('We are looking for a Senior Engineer to join our team.'),
});

export async function promptsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth);
  fastify.addHook('preHandler', requireOrg);

  fastify.get('/api/v1/prompts', async (req) => {
    return listPromptTemplates(req.org!.id);
  });

  fastify.get('/api/v1/prompts/:name/versions', async (req) => {
    const { name } = req.params as { name: string };
    const { language = 'en' } = req.query as { language?: string };
    return getTemplateVersions(name, language, req.org!.id);
  });

  fastify.post('/api/v1/prompts/override', async (req, reply) => {
    const body = overrideSchema.parse(req.body);
    const template = await createOrUpdateOverride(req.org!.id, body.name, body.language, body.content);
    reply.status(201);
    return template;
  });

  fastify.post('/api/v1/prompts/:id/rollback', async (req) => {
    const { id } = req.params as { id: string };
    await rollbackToVersion(req.org!.id, id);
    return { ok: true };
  });

  fastify.post('/api/v1/prompts/test', async (req) => {
    const body = testSchema.parse(req.body);
    const settings = (req.org as Record<string, unknown>).settings as Record<string, unknown> ?? {};
    const provider = getProvider((settings['ai_provider'] as string) ?? 'deepseek');
    const start = Date.now();
    const result = await provider.generateText({
      prompt: `${body.promptContent}\n\n## CV\n${body.cvContent}\n\n## Job Description\n${body.jdContent}`,
      maxTokens: 2048,
    });
    return {
      output: result.text,
      usage: result.usage,
      latencyMs: Date.now() - start,
    };
  });

  fastify.post('/api/v1/prompts/ab-test/enable', async (req) => {
    const { challengerId } = req.body as { challengerId: string };
    await enableABTest(req.org!.id, challengerId);
    return { ok: true };
  });

  fastify.post('/api/v1/prompts/ab-test/disable', async (req) => {
    await disableABTest(req.org!.id);
    return { ok: true };
  });

  fastify.get('/api/v1/prompts/ab-test/stats', async (req) => {
    return getABTestStats(req.org!.id);
  });
}
