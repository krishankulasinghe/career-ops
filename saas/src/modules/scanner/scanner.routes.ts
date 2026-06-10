import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth, requireOrg } from '@/modules/auth/auth.middleware.js';
import { scannerQueue } from './scanner.queue.js';
import { listScanResults } from './scanner.service.js';

export async function scannerRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth);
  fastify.addHook('preHandler', requireOrg);

  // Trigger immediate scan
  fastify.post('/api/v1/scanner/run', async (req, reply) => {
    const org = (req as unknown as { org: { id: string } }).org;
    const body = z.object({ portalIds: z.array(z.string().uuid()).optional() }).parse(req.body ?? {});

    const job = await scannerQueue.add('scan', { orgId: org.id, portalIds: body.portalIds });
    return reply.code(202).send({ jobId: job.id, status: 'queued' });
  });

  // List scan results
  fastify.get('/api/v1/scanner/results', async (req) => {
    const org = (req as unknown as { org: { id: string } }).org;
    const query = z.object({
      portalId: z.string().uuid().optional(),
      since: z.string().optional(),
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(200).default(50),
    }).parse(req.query);

    return listScanResults(org.id, query);
  });

  // Scan history (aggregate view by job)
  fastify.get('/api/v1/scanner/history', async (_req, reply) => {
    // Placeholder — full scan run history requires an ai_tasks query by task_type='scan'
    return reply.send([]);
  });
}
