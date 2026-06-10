import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth, requireOrg } from '@/modules/auth/auth.middleware.js';
import {
  listEvalModes,
  getEvalMode,
  createEvalMode,
  updateEvalMode,
  deleteEvalMode,
} from './eval-modes.service.js';

const weightsSchema = z.object({
  cvMatch: z.number().min(0).max(10).optional(),
  northStar: z.number().min(0).max(10).optional(),
  comp: z.number().min(0).max(10).optional(),
  cultural: z.number().min(0).max(10).optional(),
  redFlags: z.number().min(0).max(10).optional(),
});

const customBlockSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  prompt: z.string().min(1),
  weight: z.number().min(0).max(10),
});

const createSchema = z.object({
  name: z.string().min(1).max(100),
  weights: weightsSchema.optional(),
  customBlocks: z.array(customBlockSchema).optional(),
  promptTemplateId: z.string().uuid().optional(),
  defaultArchetype: z.string().max(100).optional(),
  isDefault: z.boolean().optional(),
});

const updateSchema = createSchema.partial();

export async function evalModesRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth);
  fastify.addHook('preHandler', requireOrg);

  fastify.get('/api/v1/evaluation-modes', async (req) => {
    return listEvalModes(req.org!.id);
  });

  fastify.get('/api/v1/evaluation-modes/:id', async (req) => {
    const { id } = req.params as { id: string };
    return getEvalMode(req.org!.id, id);
  });

  fastify.post('/api/v1/evaluation-modes', async (req, reply) => {
    const body = createSchema.parse(req.body);
    const mode = await createEvalMode(req.org!.id, body);
    reply.status(201);
    return mode;
  });

  fastify.put('/api/v1/evaluation-modes/:id', async (req) => {
    const { id } = req.params as { id: string };
    const body = updateSchema.parse(req.body);
    return updateEvalMode(req.org!.id, id, body);
  });

  fastify.delete('/api/v1/evaluation-modes/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    await deleteEvalMode(req.org!.id, id);
    reply.status(204);
    return;
  });
}
