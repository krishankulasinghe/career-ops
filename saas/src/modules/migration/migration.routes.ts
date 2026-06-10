import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '@/modules/auth/auth.middleware.js';
import { importFromCli } from './migration.service.js';

const importBodySchema = z.object({
  applicationsMd: z.string().optional(),
  portalsYml: z.string().optional(),
  profileYml: z.string().optional(),
  cvMd: z.string().optional(),
});

export const migrationRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    '/api/v1/migration/import',
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const body = importBodySchema.parse(req.body);
      const summary = await importFromCli(body, req.user.id, req.org.id);
      return reply.send({ summary });
    },
  );
};
