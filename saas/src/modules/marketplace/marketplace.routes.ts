import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth, requireOrg } from '@/modules/auth/auth.middleware.js';
import { requireRole } from '@/modules/auth/auth.middleware.js';
import {
  browseMarketplace,
  installTemplate,
  rateTemplate,
  submitForPublishing,
  adminReviewTemplate,
  getModerationQueue,
} from './marketplace.service.js';

const installSchema = z.object({
  templateId: z.string().uuid(),
  templateType: z.enum(['cv', 'prompt']),
});

const rateSchema = z.object({
  templateId: z.string().uuid(),
  templateType: z.enum(['cv', 'prompt']),
  stars: z.number().int().min(1).max(5),
});

const publishSchema = z.object({
  templateId: z.string().uuid(),
  templateType: z.enum(['cv', 'prompt']),
});

const reviewSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  rejectionReason: z.string().max(500).optional(),
});

export async function marketplaceRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth);
  fastify.addHook('preHandler', requireOrg);

  // Browse public marketplace
  fastify.get('/api/v1/marketplace', async (req) => {
    return browseMarketplace(req.org.id);
  });

  // Install a public template into your org
  fastify.post('/api/v1/marketplace/install', async (req) => {
    const { templateId, templateType } = installSchema.parse(req.body);
    return installTemplate(req.org.id, templateId, templateType);
  });

  // Rate an installed template (1-5 stars)
  fastify.post('/api/v1/marketplace/rate', async (req) => {
    const { templateId, templateType, stars } = rateSchema.parse(req.body);
    await rateTemplate(req.org.id, templateId, templateType, stars);
    return { ok: true };
  });

  // Submit own template for publishing (goes to moderation queue)
  fastify.post('/api/v1/marketplace/publish', async (req) => {
    const { templateId, templateType } = publishSchema.parse(req.body);
    await submitForPublishing(req.org.id, templateId, templateType);
    return { ok: true, message: 'Template submitted for review. You will be notified once reviewed.' };
  });

  // Admin: list moderation queue
  fastify.get('/api/v1/admin/marketplace/queue', {
    preHandler: [requireRole('admin')],
  }, async () => {
    return getModerationQueue();
  });

  // Admin: approve or reject a submission
  fastify.post('/api/v1/admin/marketplace/queue/:queueId/review', {
    preHandler: [requireRole('admin')],
  }, async (req) => {
    const { queueId } = req.params as { queueId: string };
    const { decision, rejectionReason } = reviewSchema.parse(req.body);
    await adminReviewTemplate(req.user.id, queueId, decision, rejectionReason);
    return { ok: true };
  });
}
