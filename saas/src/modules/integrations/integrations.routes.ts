import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth, requireOrg } from '@/modules/auth/auth.middleware.js';
import {
  listIntegrations,
  getIntegrationConfig,
  updateIntegrationConfig,
  toggleIntegration,
  buildOAuthRedirectUrl,
  handleOAuthCallback,
  type IntegrationName,
} from './integrations.service.js';
import { env } from '@/config/env.js';

const INTEGRATION_NAMES = ['slack', 'greenhouse', 'lever', 'ashby', 'google_calendar', 'outlook_calendar', 'sendgrid', 'resend'] as const;

const configSchema = z.object({
  webhookUrl: z.string().url().max(2048).optional(),
  apiKey: z.string().max(512).optional(),
  channelId: z.string().max(100).optional(),
  calendarId: z.string().max(255).optional(),
  boardToken: z.string().max(255).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const toggleSchema = z.object({ enabled: z.boolean() });

export async function integrationsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth);
  fastify.addHook('preHandler', requireOrg);

  // List all integrations with enabled/configured status
  fastify.get('/api/v1/integrations', async (req) => {
    return listIntegrations(req.org.id);
  });

  // Get config for one integration (redacted)
  fastify.get('/api/v1/integrations/:name', async (req) => {
    const { name } = req.params as { name: string };
    if (!INTEGRATION_NAMES.includes(name as IntegrationName)) {
      return (req as unknown as { server: { httpErrors: { notFound: () => unknown } } }).server.httpErrors?.notFound?.() ?? { error: 'Not found' };
    }
    return getIntegrationConfig(req.org.id, name as IntegrationName);
  });

  // Update integration config
  fastify.put('/api/v1/integrations/:name', async (req) => {
    const { name } = req.params as { name: string };
    const patch = configSchema.parse(req.body);
    await updateIntegrationConfig(req.org.id, name as IntegrationName, patch);
    return { ok: true };
  });

  // Toggle on/off
  fastify.patch('/api/v1/integrations/:name/toggle', async (req) => {
    const { name } = req.params as { name: string };
    const { enabled } = toggleSchema.parse(req.body);
    await toggleIntegration(req.org.id, name as IntegrationName, enabled);
    return { ok: true };
  });

  // OAuth: initiate redirect
  fastify.get('/api/v1/integrations/:name/connect', async (req, reply) => {
    const { name } = req.params as { name: string };
    const url = buildOAuthRedirectUrl(name as IntegrationName, req.org.id, env.CORS_ORIGIN.split(',')[0] ?? 'http://localhost:3000');
    if (!url) return reply.status(400).send({ error: { code: 'NO_OAUTH', message: 'This integration does not support OAuth' } });
    return reply.redirect(url);
  });

  // OAuth: callback (public, no auth — state carries orgId)
  fastify.get('/api/v1/integrations/:name/callback', async (req, reply) => {
    const { name } = req.params as { name: string };
    const { code, state } = req.query as { code?: string; state?: string };

    if (!code || !state) return reply.redirect('/?error=oauth_failed');

    let orgId: string;
    try {
      const parsed = JSON.parse(Buffer.from(state, 'base64url').toString()) as { orgId: string };
      orgId = parsed.orgId;
    } catch {
      return reply.redirect('/?error=oauth_invalid_state');
    }

    await handleOAuthCallback(name as IntegrationName, code, orgId);
    return reply.redirect(`/settings/integrations?connected=${name}`);
  });
}
