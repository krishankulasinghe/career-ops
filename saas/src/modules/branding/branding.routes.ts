import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth, requireOrg } from '@/modules/auth/auth.middleware.js';
import { db } from '@/config/database.js';
import { organizations } from '@/db/schema.js';
import { eq } from 'drizzle-orm';

export interface OrgBranding {
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  customDomain?: string;
  loginBackground?: string;
}

const brandingSchema = z.object({
  logoUrl: z.string().url().max(2048).optional(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  fontFamily: z.string().max(100).optional(),
  customDomain: z.string().max(255).optional(),
  loginBackground: z.string().url().max(2048).optional(),
});

async function getBranding(orgId: string): Promise<OrgBranding> {
  const [org] = await db.select({ settings: organizations.settings })
    .from(organizations)
    .where(eq(organizations.id, orgId));
  return ((org?.settings as Record<string, unknown>)?.['branding'] as OrgBranding) ?? {};
}

async function updateBranding(orgId: string, patch: OrgBranding): Promise<OrgBranding> {
  const [org] = await db.select({ settings: organizations.settings })
    .from(organizations)
    .where(eq(organizations.id, orgId));

  const current = (org?.settings ?? {}) as Record<string, unknown>;
  const currentBranding = (current['branding'] ?? {}) as OrgBranding;
  const updated = { ...currentBranding, ...patch };

  await db.update(organizations)
    .set({ settings: { ...current, branding: updated } })
    .where(eq(organizations.id, orgId));

  return updated;
}

export async function brandingRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth);
  fastify.addHook('preHandler', requireOrg);

  fastify.get('/api/v1/settings/branding', async (req) => {
    return getBranding(req.org!.id);
  });

  fastify.put('/api/v1/settings/branding', async (req, reply) => {
    const plan = req.org!.plan;
    if (plan !== 'enterprise') {
      return reply.status(403).send({ error: { code: 'PLAN_REQUIRED', message: 'White-label branding requires Enterprise plan' } });
    }
    const body = brandingSchema.parse(req.body);
    return updateBranding(req.org!.id, body);
  });

  // Public endpoint for loading org branding by domain
  fastify.get('/api/v1/branding/:slug', async (req) => {
    const { slug } = req.params as { slug: string };
    const [org] = await db.select({ settings: organizations.settings, name: organizations.name })
      .from(organizations)
      .where(eq(organizations.slug, slug));
    if (!org) return {};
    const branding = ((org.settings as Record<string, unknown>)?.['branding'] ?? {}) as OrgBranding;
    return { ...branding, orgName: org.name };
  });
}
