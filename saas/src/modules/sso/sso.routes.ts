import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth, requireOrg } from '@/modules/auth/auth.middleware.js';
import {
  getSsoConfig,
  upsertSsoConfig,
  activateSso,
  buildSsoRedirectUrl,
  processSsoCallback,
} from './sso.service.js';
import { randomBytes } from 'crypto';
import { requireRole } from '@/modules/auth/auth.middleware.js';

const configSchema = z.object({
  protocol: z.enum(['saml', 'oidc']).default('oidc'),
  idpMetadataUrl: z.string().url().optional(),
  entityId: z.string().max(500).optional(),
  clientId: z.string().max(255).optional(),
  clientSecret: z.string().max(1000).optional(),
  issuer: z.string().url().optional(),
  forceSso: z.boolean().optional(),
});

export async function ssoRoutes(fastify: FastifyInstance) {
  // Public SSO initiation — redirects to IdP
  fastify.get('/api/v1/auth/sso/:orgSlug/start', async (req, reply) => {
    const { orgSlug } = req.params as { orgSlug: string };
    const stateToken = randomBytes(16).toString('hex');
    const redirectUrl = await buildSsoRedirectUrl(orgSlug, stateToken);
    reply.setCookie('sso_state', stateToken, { httpOnly: true, maxAge: 300 });
    return reply.redirect(redirectUrl);
  });

  // SSO callback from IdP
  fastify.get('/api/v1/auth/sso/callback', async (req, reply) => {
    const { code, state, orgSlug } = req.query as { code?: string; state?: string; orgSlug?: string };
    const cookieState = (req.cookies as Record<string, string>)['sso_state'];

    if (!state || state !== cookieState) {
      return reply.status(400).send({ error: { code: 'INVALID_STATE', message: 'Invalid or expired SSO state' } });
    }

    if (!orgSlug || !code) {
      return reply.status(400).send({ error: { code: 'MISSING_PARAMS', message: 'Missing orgSlug or code' } });
    }

    const { sessionId } = await processSsoCallback(orgSlug, code, state);
    reply.clearCookie('sso_state');
    reply.setCookie('session_id', sessionId, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 3600,
    });

    const appUrl = process.env['APP_URL'] ?? 'http://localhost:5173';
    return reply.redirect(`${appUrl}/`);
  });

  // Protected SSO management endpoints (admin/owner only)
  fastify.register(async (sub) => {
    sub.addHook('preHandler', requireAuth);
    sub.addHook('preHandler', requireOrg);
    sub.addHook('preHandler', requireRole('admin', 'owner'));

    sub.get('/api/v1/sso/config', async (req) => {
      return getSsoConfig(req.org!.id);
    });

    sub.put('/api/v1/sso/config', async (req, reply) => {
      const body = configSchema.parse(req.body);
      const plan = req.org!.plan;
      if (!['team', 'enterprise'].includes(plan)) {
        return reply.status(403).send({ error: { code: 'PLAN_REQUIRED', message: 'SSO requires Team or Enterprise plan' } });
      }
      return upsertSsoConfig(req.org!.id, body);
    });

    sub.post('/api/v1/sso/activate', async (req) => {
      await activateSso(req.org!.id);
      return { ok: true };
    });
  });
}
