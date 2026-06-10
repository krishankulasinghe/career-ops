import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { env } from '@/config/env.js';
import { db } from '@/config/database.js';
import { checkRedis } from '@/config/redis.js';
import { checkS3 } from '@/config/s3.js';
import { logger } from '@/shared/logger.js';
import { AppError } from '@/shared/errors.js';
import { sql } from 'drizzle-orm';
import { authRoutes } from '@/modules/auth/auth.routes.js';
import { usersRoutes } from '@/modules/users/users.routes.js';
import { organizationsRoutes } from '@/modules/organizations/organizations.routes.js';
import { cvsRoutes } from '@/modules/cvs/cvs.routes.js';
import { applicationsRoutes } from '@/modules/applications/applications.routes.js';
import { evaluationsRoutes } from '@/modules/evaluations/evaluations.routes.js';
import { pdfRoutes } from '@/modules/pdf/pdf.routes.js';
import { pipelineRoutes } from '@/modules/pipeline/pipeline.routes.js';
import { billingRoutes } from '@/modules/billing/billing.routes.js';
import { writeAudit } from '@/modules/audit/audit.service.js';
import { migrationRoutes } from '@/modules/migration/migration.routes.js';
import { portalsRoutes } from '@/modules/portals/portals.routes.js';
import { scannerRoutes } from '@/modules/scanner/scanner.routes.js';
import { livenessRoutes } from '@/modules/liveness/liveness.routes.js';
import { batchRoutes } from '@/modules/evaluations/batch.routes.js';
import { analyticsRoutes } from '@/modules/analytics/analytics.routes.js';
import { followupsRoutes } from '@/modules/followups/followups.routes.js';
import { invitationsRoutes } from '@/modules/organizations/invitations.routes.js';
import { notificationsRoutes } from '@/modules/notifications/notifications.routes.js';
import { auditRoutes } from '@/modules/audit/audit.routes.js';
import { aiSettingsRoutes } from '@/modules/ai/ai-settings.routes.js';
import { adminCostRoutes } from '@/modules/admin/admin.cost.routes.js';
import { promptsRoutes } from '@/modules/ai/prompts.routes.js';
import { adminAiOpsRoutes } from '@/modules/admin/admin.ai-ops.routes.js';
import { ssoRoutes } from '@/modules/sso/sso.routes.js';
import { evalModesRoutes } from '@/modules/evaluations/eval-modes.routes.js';
import { webhooksRoutes } from '@/modules/webhooks/webhooks.routes.js';
import { realtimeRoutes } from '@/modules/realtime/realtime.routes.js';
import { interviewPrepRoutes } from '@/modules/interview-prep/interview-prep.routes.js';
import { brandingRoutes } from '@/modules/branding/branding.routes.js';
import { publicApiRoutes } from '@/modules/public-api/public-api.routes.js';
import { enforceApiKeyRateLimit } from '@/modules/public-api/public-api.rate-limit.js';
import { marketplaceRoutes } from '@/modules/marketplace/marketplace.routes.js';
import { integrationsRoutes } from '@/modules/integrations/integrations.routes.js';
import { dataResidencyRoutes } from '@/modules/organizations/data-residency.routes.js';
import { trustRoutes } from '@/modules/admin/trust.routes.js';

export const app = Fastify({
  logger: false,
  trustProxy: true,
  genReqId: () => crypto.randomUUID(),
});

async function buildApp() {
  await app.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'Career-Ops SaaS API',
        description: 'AI-powered job search automation platform API',
        version: '1.0.0',
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            description: 'API key (co_*** prefix). Obtain from Settings → API Keys.',
          },
          cookieAuth: {
            type: 'apiKey',
            in: 'cookie',
            name: 'session',
          },
        },
      },
      security: [{ bearerAuth: [] }, { cookieAuth: [] }],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/api/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  });

  await app.register(cors, {
    origin: env.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  await app.register(cookie, {
    secret: env.SESSION_SECRET,
    hook: 'onRequest',
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later.',
      },
    }),
  });

  app.setErrorHandler((error, _req, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      });
    }

    if (error.validation) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: error.validation,
        },
      });
    }

    logger.error({ err: error }, 'Unhandled error');
    return reply.status(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  });

  // Global API key per-tier rate limiting (applied before route handlers)
  app.addHook('preHandler', enforceApiKeyRateLimit);

  // Global audit hook for mutations on authenticated routes
  app.addHook('onResponse', (req, reply, done) => {
    const method = req.method.toUpperCase();
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && reply.statusCode < 500) {
      const user = (req as unknown as Record<string, unknown>).user as { id: string } | undefined;
      const org = (req as unknown as Record<string, unknown>).org as { id: string } | undefined;
      if (user && org) {
        const action = `${method.toLowerCase()}:${req.routeOptions.url ?? req.url}`;
        writeAudit({
          orgId: org.id,
          userId: user.id,
          action,
          metadata: { statusCode: reply.statusCode },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        });
      }
    }
    done();
  });

  await app.register(authRoutes);
  await app.register(usersRoutes);
  await app.register(organizationsRoutes);
  await app.register(cvsRoutes);
  await app.register(applicationsRoutes);
  await app.register(evaluationsRoutes);
  await app.register(pdfRoutes);
  await app.register(pipelineRoutes);
  await app.register(billingRoutes);
  await app.register(migrationRoutes);
  await app.register(portalsRoutes);
  await app.register(scannerRoutes);
  await app.register(livenessRoutes);
  await app.register(batchRoutes);
  await app.register(analyticsRoutes);
  await app.register(followupsRoutes);
  await app.register(invitationsRoutes);
  await app.register(notificationsRoutes);
  await app.register(auditRoutes);
  await app.register(aiSettingsRoutes);
  await app.register(adminCostRoutes);
  await app.register(promptsRoutes);
  await app.register(adminAiOpsRoutes);
  await app.register(ssoRoutes);
  await app.register(evalModesRoutes);
  await app.register(webhooksRoutes);
  await app.register(realtimeRoutes);
  await app.register(interviewPrepRoutes);
  await app.register(brandingRoutes);
  await app.register(publicApiRoutes);
  await app.register(marketplaceRoutes);
  await app.register(integrationsRoutes);
  await app.register(dataResidencyRoutes);
  await app.register(trustRoutes);

  app.get('/health', async (_req, reply) => {
    const [dbOk, redisOk, s3Ok] = await Promise.allSettled([
      db.execute(sql`SELECT 1`).then(() => true).catch(() => false),
      checkRedis(),
      checkS3(),
    ]);

    const services = {
      db: dbOk.status === 'fulfilled' && dbOk.value ? 'ok' : 'error',
      redis: redisOk.status === 'fulfilled' && redisOk.value ? 'ok' : 'error',
      s3: s3Ok.status === 'fulfilled' && s3Ok.value ? 'ok' : 'error',
    };

    const allOk = Object.values(services).every((s) => s === 'ok');

    return reply.status(allOk ? 200 : 503).send({
      status: allOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      services,
    });
  });

  return app;
}

async function start() {
  const server = await buildApp();

  const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];
  for (const signal of signals) {
    process.on(signal, async () => {
      logger.info({ signal }, 'Shutting down server...');
      await server.close();
      process.exit(0);
    });
  }

  try {
    await server.listen({ port: env.PORT, host: '0.0.0.0' });
    logger.info({ port: env.PORT }, 'Server started');
  } catch (err) {
    logger.error({ err }, 'Failed to start server');
    process.exit(1);
  }
}

start();
