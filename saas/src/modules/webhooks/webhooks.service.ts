import { db } from '@/config/database.js';
import { webhooks, webhookDeliveries } from '@/db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { createHmac, randomBytes } from 'crypto';
import { NotFoundError } from '@/shared/errors.js';
import { logger } from '@/shared/logger.js';

export const WEBHOOK_EVENTS = [
  'evaluation.completed',
  'scan.completed',
  'pdf.ready',
  'application.created',
  'member.joined',
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

function signPayload(secret: string, payload: string): string {
  return `sha256=${createHmac('sha256', secret).update(payload).digest('hex')}`;
}

export async function listWebhooks(orgId: string) {
  return db.select().from(webhooks).where(eq(webhooks.orgId, orgId)).orderBy(desc(webhooks.createdAt));
}

export async function createWebhook(orgId: string, input: { url: string; events: string[] }) {
  const secret = randomBytes(24).toString('hex');
  const [created] = await db.insert(webhooks).values({
    orgId,
    url: input.url,
    events: input.events,
    secret,
    active: true,
  }).returning();
  return { ...created, secret };
}

export async function updateWebhook(orgId: string, webhookId: string, input: Partial<{ url: string; events: string[]; active: boolean }>) {
  const [updated] = await db.update(webhooks)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(webhooks.id, webhookId), eq(webhooks.orgId, orgId)))
    .returning();
  if (!updated) throw new NotFoundError('Webhook not found');
  return updated;
}

export async function deleteWebhook(orgId: string, webhookId: string): Promise<void> {
  await db.delete(webhooks).where(and(eq(webhooks.id, webhookId), eq(webhooks.orgId, orgId)));
}

export async function listDeliveries(orgId: string, webhookId: string) {
  return db.select().from(webhookDeliveries)
    .where(and(eq(webhookDeliveries.webhookId, webhookId), eq(webhookDeliveries.orgId, orgId)))
    .orderBy(desc(webhookDeliveries.createdAt))
    .limit(50);
}

export async function deliverWebhook(
  webhook: typeof webhooks.$inferSelect,
  event: string,
  payload: Record<string, unknown>,
  attempt = 1,
): Promise<boolean> {
  const body = JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() });
  const signature = signPayload(webhook.secret, body);

  let statusCode: number | undefined;
  let responseBody: string | undefined;
  let success = false;

  try {
    const res = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': event,
        'X-Webhook-Delivery': randomBytes(8).toString('hex'),
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });

    statusCode = res.status;
    responseBody = await res.text().catch(() => '');
    success = res.ok;
  } catch (err) {
    responseBody = String(err);
  }

  // Record delivery
  await db.insert(webhookDeliveries).values({
    webhookId: webhook.id,
    orgId: webhook.orgId,
    event,
    payload,
    statusCode,
    responseBody,
    attempt,
    success,
  });

  // Update webhook last delivery status
  await db.update(webhooks)
    .set({
      lastDelivery: new Date(),
      lastStatus: statusCode,
      failureCount: success ? 0 : (webhook.failureCount ?? 0) + 1,
      active: success ? true : (webhook.failureCount ?? 0) + 1 >= 5 ? false : webhook.active,
    })
    .where(eq(webhooks.id, webhook.id));

  if (!success && attempt < 5) {
    const delay = Math.pow(2, attempt) * 30_000;
    logger.warn({ webhookId: webhook.id, attempt, delay }, 'Webhook delivery failed, will retry');
  }

  return success;
}

export async function dispatchEvent(orgId: string, event: WebhookEvent, payload: Record<string, unknown>): Promise<void> {
  const hooks = await db.select().from(webhooks)
    .where(and(eq(webhooks.orgId, orgId), eq(webhooks.active, true)));

  const matching = hooks.filter((h) => (h.events as string[]).includes(event) || (h.events as string[]).includes('*'));

  await Promise.allSettled(matching.map((h) => deliverWebhook(h, event, payload)));
}

export async function testDelivery(orgId: string, webhookId: string): Promise<{
  success: boolean;
  statusCode?: number;
  responseBody?: string;
}> {
  const [hook] = await db.select().from(webhooks)
    .where(and(eq(webhooks.id, webhookId), eq(webhooks.orgId, orgId)));
  if (!hook) throw new NotFoundError('Webhook not found');

  const success = await deliverWebhook(hook, 'ping', { message: 'Test delivery from Career-Ops SaaS' });
  const [lastDelivery] = await db.select().from(webhookDeliveries)
    .where(eq(webhookDeliveries.webhookId, webhookId))
    .orderBy(desc(webhookDeliveries.createdAt))
    .limit(1);

  return {
    success,
    statusCode: lastDelivery?.statusCode ?? undefined,
    responseBody: lastDelivery?.responseBody ?? undefined,
  };
}
