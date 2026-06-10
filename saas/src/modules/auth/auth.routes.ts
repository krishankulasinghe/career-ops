import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  register,
  login,
  logout,
  createApiKey,
  deleteApiKey,
} from './auth.service.js';
import { requireAuth } from './auth.middleware.js';
import { db } from '@/config/database.js';
import { apiKeys } from '@/db/schema.js';
import { eq, and } from 'drizzle-orm';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.string()).default([]),
});

const SESSION_COOKIE = 'session';
const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 30 * 24 * 60 * 60,
  secure: process.env['NODE_ENV'] === 'production',
};

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/api/v1/auth/register', async (req, reply) => {
    const body = registerSchema.parse(req.body);
    const { user, session, organization } = await register(body.email, body.password, body.fullName);

    reply.setCookie(SESSION_COOKIE, session.id, COOKIE_OPTIONS);
    return reply.status(201).send({
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
      organization: { id: organization.id, name: organization.name, slug: organization.slug },
    });
  });

  fastify.post('/api/v1/auth/login', async (req, reply) => {
    const body = loginSchema.parse(req.body);
    const { user, session, organization } = await login(body.email, body.password);

    reply.setCookie(SESSION_COOKIE, session.id, COOKIE_OPTIONS);
    return reply.send({
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
      organization: { id: organization.id, name: organization.name, slug: organization.slug },
    });
  });

  fastify.post(
    '/api/v1/auth/logout',
    { preHandler: [requireAuth] },
    async (req, reply) => {
      if (req.sessionId) {
        await logout(req.sessionId);
      }
      reply.clearCookie(SESSION_COOKIE, { path: '/' });
      return reply.send({ ok: true });
    },
  );

  fastify.get(
    '/api/v1/auth/me',
    { preHandler: [requireAuth] },
    async (req, reply) => {
      return reply.send({
        user: {
          id: req.user.id,
          email: req.user.email,
          fullName: req.user.fullName,
          role: req.user.role,
        },
        organization: {
          id: req.org.id,
          name: req.org.name,
          slug: req.org.slug,
          plan: req.org.plan,
        },
        membership: { role: req.membership.role },
      });
    },
  );

  fastify.post(
    '/api/v1/auth/api-keys',
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const body = createApiKeySchema.parse(req.body);
      const { key, apiKey } = await createApiKey(
        req.user.id,
        req.org.id,
        body.name,
        body.scopes,
      );

      return reply.status(201).send({
        key,
        id: apiKey.id,
        prefix: apiKey.keyPrefix,
        name: apiKey.name,
        scopes: apiKey.scopes,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
      });
    },
  );

  fastify.get(
    '/api/v1/auth/api-keys',
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const keys = await db
        .select({
          id: apiKeys.id,
          prefix: apiKeys.keyPrefix,
          name: apiKeys.name,
          scopes: apiKeys.scopes,
          lastUsedAt: apiKeys.lastUsedAt,
          expiresAt: apiKeys.expiresAt,
          createdAt: apiKeys.createdAt,
        })
        .from(apiKeys)
        .where(
          and(eq(apiKeys.userId, req.user.id), eq(apiKeys.orgId, req.org.id)),
        );

      return reply.send({ keys });
    },
  );

  fastify.delete(
    '/api/v1/auth/api-keys/:id',
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      await deleteApiKey(req.user.id, id);
      return reply.send({ ok: true });
    },
  );
};
