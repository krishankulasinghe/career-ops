import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth, requireOrg } from '@/modules/auth/auth.middleware.js';
import {
  listStories,
  createStory,
  updateStory,
  deleteStory,
  generateCompanyIntel,
  getCompanyIntel,
  matchStoriesToJD,
} from './interview-prep.service.js';

const storySchema = z.object({
  situation: z.string().min(1).max(2000),
  task: z.string().min(1).max(2000),
  action: z.string().min(1).max(2000),
  result: z.string().min(1).max(2000),
  reflection: z.string().max(1000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

export async function interviewPrepRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth);
  fastify.addHook('preHandler', requireOrg);

  // Story Bank
  fastify.get('/api/v1/stories', async (req) => {
    const { tags } = req.query as { tags?: string };
    const tagList = tags ? tags.split(',').filter(Boolean) : undefined;
    return listStories(req.user!.id, req.org!.id, tagList);
  });

  fastify.post('/api/v1/stories', async (req, reply) => {
    const body = storySchema.parse(req.body);
    reply.status(201);
    return createStory(req.user!.id, req.org!.id, body);
  });

  fastify.put('/api/v1/stories/:id', async (req) => {
    const { id } = req.params as { id: string };
    const body = storySchema.partial().parse(req.body);
    return updateStory(req.user!.id, req.org!.id, id, body);
  });

  fastify.delete('/api/v1/stories/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    await deleteStory(req.user!.id, req.org!.id, id);
    reply.status(204);
    return;
  });

  // Company Intel
  fastify.post('/api/v1/applications/:id/intel', async (req) => {
    const { id } = req.params as { id: string };
    const settings = (req.org as unknown as Record<string, unknown>).settings as Record<string, unknown> ?? {};
    const content = await generateCompanyIntel(id, req.org!.id, settings);
    return { content };
  });

  fastify.get('/api/v1/applications/:id/intel', async (req) => {
    const { id } = req.params as { id: string };
    return getCompanyIntel(id, req.org!.id);
  });

  // Story Matching
  fastify.post('/api/v1/applications/:id/prep', async (req) => {
    const { id } = req.params as { id: string };
    return matchStoriesToJD(req.user!.id, req.org!.id, id);
  });
}
