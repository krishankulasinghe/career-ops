import type { FastifyPluginAsync } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { db } from '@/config/database.js';
import { usageRecords, organizations } from '@/db/schema.js';
import { requireAuth, requireOrg } from '@/modules/auth/auth.middleware.js';
import { logger } from '@/shared/logger.js';

function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

// Lazy-load Stripe to avoid hard dependency at startup
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let stripeInstance: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getStripe(): Promise<any> {
  if (stripeInstance) return stripeInstance;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const StripeModule = await import('stripe' as any);
    const Stripe = StripeModule.default ?? StripeModule;
    const key = process.env['STRIPE_SECRET_KEY'];
    if (!key) return null;
    stripeInstance = new Stripe(key, { apiVersion: '2024-12-18.acacia' });
    return stripeInstance;
  } catch {
    return null;
  }
}

const PLAN_LIMITS: Record<string, { maxEvaluationsMo: number; maxScansMo: number; maxMembers: number }> = {
  free:  { maxEvaluationsMo: 20,  maxScansMo: 5,  maxMembers: 1  },
  pro:   { maxEvaluationsMo: 200, maxScansMo: 50, maxMembers: 3  },
  team:  { maxEvaluationsMo: 500, maxScansMo: 200, maxMembers: 15 },
};

export const billingRoutes: FastifyPluginAsync = async (fastify) => {
  // ── Usage ────────────────────────────────────────────────────────────────────

  fastify.get('/api/v1/billing/usage', { preHandler: [requireAuth, requireOrg] }, async (req, reply) => {
    const orgId = req.org.id;
    const period = currentPeriod();

    const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
    const [record] = await db
      .select()
      .from(usageRecords)
      .where(and(eq(usageRecords.orgId, orgId), eq(usageRecords.period, period)))
      .limit(1);

    const evaluationsUsed = record?.evaluationsCount ?? 0;
    const scansUsed = record?.scansCount ?? 0;
    const pdfsUsed = record?.pdfsCount ?? 0;
    const aiTokens = record?.aiTokensTotal ?? 0;
    const aiCostUsd = record ? parseFloat(record.aiCostTotal as string) : 0;

    const maxEvaluations = org?.maxEvaluationsMo ?? 20;
    const maxScans = org?.maxScansMo ?? 5;

    const evaluationsPct = maxEvaluations > 0 ? Math.round((evaluationsUsed / maxEvaluations) * 100) : 0;
    const scansPct = maxScans > 0 ? Math.round((scansUsed / maxScans) * 100) : 0;

    if (evaluationsPct >= 80 || scansPct >= 80) {
      void reply.header('X-Usage-Warning', 'Approaching monthly limit');
    }

    return reply.send({
      period,
      plan: org?.plan ?? 'free',
      usage: {
        evaluations: { used: evaluationsUsed, limit: maxEvaluations, pct: evaluationsPct },
        scans: { used: scansUsed, limit: maxScans, pct: scansPct },
        pdfs: { used: pdfsUsed, limit: null, pct: 0 },
        aiTokens,
        aiCostUsd: aiCostUsd.toFixed(4),
      },
    });
  });

  // ── Stripe Checkout ──────────────────────────────────────────────────────────

  fastify.post('/api/v1/billing/checkout', { preHandler: [requireAuth, requireOrg] }, async (req, reply) => {
    const stripe = await getStripe();
    if (!stripe) {
      return reply.code(501).send({ error: { code: 'STRIPE_NOT_CONFIGURED', message: 'Billing not configured' } });
    }

    const { plan } = req.body as { plan: 'pro' | 'team' };
    const priceId = plan === 'team'
      ? process.env['STRIPE_PRICE_ID_TEAM']
      : process.env['STRIPE_PRICE_ID_PRO'];

    if (!priceId) {
      return reply.code(501).send({ error: { code: 'STRIPE_NOT_CONFIGURED', message: 'Price ID not configured' } });
    }

    const appUrl = process.env['APP_URL'] ?? 'http://localhost:5173';
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/settings?checkout=success`,
      cancel_url: `${appUrl}/settings?checkout=cancel`,
      metadata: { orgId: req.org.id, plan },
    });

    return { url: session.url };
  });

  // ── Stripe Customer Portal ───────────────────────────────────────────────────

  fastify.post('/api/v1/billing/portal', { preHandler: [requireAuth, requireOrg] }, async (req, reply) => {
    const stripe = await getStripe();
    if (!stripe) {
      return reply.code(501).send({ error: { code: 'STRIPE_NOT_CONFIGURED', message: 'Billing not configured' } });
    }

    const [org] = await db.select().from(organizations).where(eq(organizations.id, req.org.id)).limit(1);
    const customerId = (org?.settings as Record<string, string> | null)?.stripeCustomerId;
    if (!customerId) {
      return reply.code(400).send({ error: { code: 'NO_STRIPE_CUSTOMER', message: 'No billing subscription found' } });
    }

    const appUrl = process.env['APP_URL'] ?? 'http://localhost:5173';
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/settings`,
    });

    return { url: portal.url };
  });

  // ── Stripe Webhook ───────────────────────────────────────────────────────────

  fastify.post('/api/v1/billing/webhook', async (req, reply) => {
    const stripe = await getStripe();
    if (!stripe) return reply.code(200).send({ received: true });

    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env['STRIPE_WEBHOOK_SECRET'];
    if (!webhookSecret || !sig) return reply.code(400).send({ error: 'Missing signature' });

    let event: // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any;
    try {
      const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody ?? Buffer.from(JSON.stringify(req.body));
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err) {
      logger.warn({ err }, 'Stripe webhook signature verification failed');
      return reply.code(400).send({ error: 'Invalid signature' });
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const session = event.data.object as any;
          const orgId = session.metadata?.['orgId'];
          const plan = session.metadata?.['plan'] ?? 'pro';
          const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
          if (orgId) {
            const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS['pro'];
            await db.update(organizations).set({
              plan,
              ...limits,
              settings: { stripeCustomerId: customerId } as Record<string, unknown>,
              updatedAt: new Date(),
            }).where(eq(organizations.id, orgId));
          }
          break;
        }
        case 'customer.subscription.deleted': {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const sub = event.data.object as any;
          const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
          const [org] = await db.select().from(organizations)
            .where(eq(organizations.settings, { stripeCustomerId: customerId } as never));
          if (org) {
            await db.update(organizations).set({ plan: 'free', ...PLAN_LIMITS['free'], updatedAt: new Date() })
              .where(eq(organizations.id, org.id));
          }
          break;
        }
      }
    } catch (err) {
      logger.error({ err, eventType: event.type }, 'Stripe webhook handler error');
    }

    return reply.send({ received: true });
  });

  // ── Invoices ─────────────────────────────────────────────────────────────────

  fastify.get('/api/v1/billing/invoices', { preHandler: [requireAuth, requireOrg] }, async (req, reply) => {
    const stripe = await getStripe();
    if (!stripe) return reply.send([]);

    const [org] = await db.select().from(organizations).where(eq(organizations.id, req.org.id)).limit(1);
    const customerId = (org?.settings as Record<string, string> | null)?.stripeCustomerId;
    if (!customerId) return reply.send([]);

    const invoices = await stripe.invoices.list({ customer: customerId, limit: 24 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return reply.send(invoices.data.map((inv: any) => ({
      id: inv.id,
      date: new Date(inv.created * 1000).toISOString(),
      amount: (inv.amount_paid / 100).toFixed(2),
      currency: inv.currency.toUpperCase(),
      status: inv.status,
      url: inv.hosted_invoice_url,
    })));
  });
};
