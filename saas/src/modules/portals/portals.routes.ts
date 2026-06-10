import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth, requireOrg } from '@/modules/auth/auth.middleware.js';
import {
  listPortals, getPortal, createPortal, updatePortal, deletePortal,
  importPortalsYaml, listTitleFilters, addTitleFilter, deleteTitleFilter,
  upsertTitleFilters,
} from './portals.service.js';
import { ValidationError } from '@/shared/errors.js';

const createPortalSchema = z.object({
  name: z.string().min(1).max(255),
  careersUrl: z.string().url().optional(),
  apiType: z.enum(['greenhouse', 'ashby', 'lever', 'workday', 'custom']).optional(),
  apiUrl: z.string().url().optional(),
  enabled: z.boolean().optional(),
});

const updatePortalSchema = createPortalSchema.partial();

const titleFilterSchema = z.object({
  type: z.enum(['positive', 'negative']),
  keyword: z.string().min(1).max(255),
});

export async function portalsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth);
  fastify.addHook('preHandler', requireOrg);

  // ── Portals CRUD ────────────────────────────────────────────────────────────

  fastify.get('/api/v1/portals', async (req) => {
    const org = (req as unknown as { org: { id: string } }).org;
    return listPortals(org.id);
  });

  fastify.get<{ Params: { id: string } }>('/api/v1/portals/:id', async (req) => {
    const org = (req as unknown as { org: { id: string } }).org;
    return getPortal(org.id, req.params.id);
  });

  fastify.post('/api/v1/portals', async (req, reply) => {
    const org = (req as unknown as { org: { id: string } }).org;
    const body = createPortalSchema.parse(req.body);
    const portal = await createPortal(org.id, body);
    return reply.code(201).send(portal);
  });

  fastify.put<{ Params: { id: string } }>('/api/v1/portals/:id', async (req) => {
    const org = (req as unknown as { org: { id: string } }).org;
    const body = updatePortalSchema.parse(req.body);
    return updatePortal(org.id, req.params.id, body);
  });

  fastify.delete<{ Params: { id: string } }>('/api/v1/portals/:id', async (req, reply) => {
    const org = (req as unknown as { org: { id: string } }).org;
    await deletePortal(org.id, req.params.id);
    return reply.code(204).send();
  });

  // ── YAML Import ─────────────────────────────────────────────────────────────

  fastify.post('/api/v1/portals/import', async (req, reply) => {
    const org = (req as unknown as { org: { id: string } }).org;

    const body = req.body as { portals?: unknown[] };
    if (!Array.isArray(body?.portals)) {
      throw new ValidationError('Body must be { portals: [...] } array');
    }

    const entries = body.portals.map((p) => {
      const e = p as Record<string, unknown>;
      return {
        name: String(e.name ?? ''),
        careers_url: e.careers_url ? String(e.careers_url) : undefined,
        api: e.api ? String(e.api) : undefined,
      };
    });

    const result = await importPortalsYaml(org.id, entries);
    return reply.code(201).send(result);
  });

  // ── Title Filters ───────────────────────────────────────────────────────────

  fastify.get('/api/v1/title-filters', async (req) => {
    const org = (req as unknown as { org: { id: string } }).org;
    return listTitleFilters(org.id);
  });

  fastify.post('/api/v1/title-filters', async (req, reply) => {
    const org = (req as unknown as { org: { id: string } }).org;
    const body = titleFilterSchema.parse(req.body);
    const filter = await addTitleFilter(org.id, body.type, body.keyword);
    return reply.code(201).send(filter);
  });

  fastify.put('/api/v1/title-filters', async (req, reply) => {
    const org = (req as unknown as { org: { id: string } }).org;
    const body = z.array(titleFilterSchema).parse(req.body);
    const filters = await upsertTitleFilters(org.id, body);
    return reply.code(200).send(filters);
  });

  fastify.delete<{ Params: { id: string } }>('/api/v1/title-filters/:id', async (req, reply) => {
    const org = (req as unknown as { org: { id: string } }).org;
    await deleteTitleFilter(org.id, req.params.id);
    return reply.code(204).send();
  });
}
