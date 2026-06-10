import { eq, and } from 'drizzle-orm';
import { db } from '@/config/database.js';
import { organizations } from '@/db/schema.js';
import { NotFoundError } from '@/shared/errors.js';
import { encryptApiKey, decryptApiKey } from '@/modules/ai/ai-settings.service.js';

export type IntegrationName = 'slack' | 'greenhouse' | 'lever' | 'ashby' | 'google_calendar' | 'outlook_calendar' | 'sendgrid' | 'resend';

export interface IntegrationConfig {
  enabled?: boolean;
  webhookUrl?: string;
  apiKey?: string;
  apiKeyEncrypted?: string;
  boardToken?: string;
  channelId?: string;
  calendarId?: string;
  oauthAccessToken?: string;
  oauthRefreshToken?: string;
  oauthExpiresAt?: number;
  metadata?: Record<string, unknown>;
}

export type IntegrationsMap = Partial<Record<IntegrationName, IntegrationConfig>>;

async function getIntegrations(orgId: string): Promise<IntegrationsMap> {
  const [org] = await db
    .select({ settings: organizations.settings })
    .from(organizations)
    .where(eq(organizations.id, orgId));
  return ((org?.settings as Record<string, unknown>)?.['integrations'] as IntegrationsMap) ?? {};
}

async function saveIntegrations(orgId: string, integrations: IntegrationsMap): Promise<void> {
  const [org] = await db
    .select({ settings: organizations.settings })
    .from(organizations)
    .where(eq(organizations.id, orgId));
  const current = (org?.settings ?? {}) as Record<string, unknown>;
  await db
    .update(organizations)
    .set({ settings: { ...current, integrations } })
    .where(eq(organizations.id, orgId));
}

export async function listIntegrations(orgId: string): Promise<Array<{
  name: IntegrationName;
  enabled: boolean;
  category: string;
  description: string;
  configured: boolean;
}>> {
  const integrations = await getIntegrations(orgId);
  const catalog: Array<{ name: IntegrationName; category: string; description: string }> = [
    { name: 'slack', category: 'notifications', description: 'Post evaluation results and job alerts to a Slack channel.' },
    { name: 'greenhouse', category: 'ats', description: 'Two-way sync with Greenhouse ATS. Import jobs and sync application status.' },
    { name: 'lever', category: 'ats', description: 'Two-way sync with Lever ATS. Import opportunities and sync stage changes.' },
    { name: 'ashby', category: 'ats', description: 'Two-way sync with Ashby ATS. Import jobs and sync candidate status.' },
    { name: 'google_calendar', category: 'calendar', description: 'Book interview slots directly from evaluation reports.' },
    { name: 'outlook_calendar', category: 'calendar', description: 'Microsoft Outlook calendar integration for interview scheduling.' },
    { name: 'sendgrid', category: 'email', description: 'Send tailored cover letters and follow-ups via SendGrid.' },
    { name: 'resend', category: 'email', description: 'Send tailored cover letters and follow-ups via Resend.' },
  ];

  return catalog.map((item) => {
    const cfg = integrations[item.name];
    return {
      ...item,
      enabled: cfg?.enabled ?? false,
      configured: !!cfg && Object.keys(cfg).length > 1,
    };
  });
}

export async function getIntegrationConfig(
  orgId: string,
  name: IntegrationName,
): Promise<IntegrationConfig & { apiKey?: undefined }> {
  const integrations = await getIntegrations(orgId);
  const cfg = integrations[name] ?? { enabled: false };
  // Redact api key from response
  const { apiKey: _k, apiKeyEncrypted: _e, oauthAccessToken: _t, oauthRefreshToken: _r, ...safe } = cfg;
  return {
    ...safe,
    apiKeyConfigured: !!(cfg.apiKeyEncrypted ?? cfg.apiKey),
    oauthConnected: !!cfg.oauthAccessToken,
  } as IntegrationConfig & { apiKey?: undefined };
}

export async function updateIntegrationConfig(
  orgId: string,
  name: IntegrationName,
  patch: Partial<IntegrationConfig & { apiKey?: string }>,
): Promise<void> {
  const integrations = await getIntegrations(orgId);
  const existing: IntegrationConfig = integrations[name] ?? {};

  // Encrypt api key if provided in plaintext
  let apiKeyEncrypted = existing.apiKeyEncrypted;
  if (patch.apiKey) {
    apiKeyEncrypted = encryptApiKey(patch.apiKey);
  }
  const { apiKey: _k, ...rest } = patch;

  integrations[name] = { ...existing, ...rest, apiKeyEncrypted };
  await saveIntegrations(orgId, integrations);
}

export async function toggleIntegration(orgId: string, name: IntegrationName, enabled: boolean): Promise<void> {
  const integrations = await getIntegrations(orgId);
  integrations[name] = { ...(integrations[name] ?? {}), enabled };
  await saveIntegrations(orgId, integrations);
}

// ─── ATS Webhook Dispatch ─────────────────────────────────────────────────────

export async function dispatchAtsEvent(
  orgId: string,
  ats: 'greenhouse' | 'lever' | 'ashby',
  event: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const integrations = await getIntegrations(orgId);
  const cfg = integrations[ats];
  if (!cfg?.enabled || !cfg.webhookUrl) return;

  const body = JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() });
  let apiKey: string | undefined;
  if (cfg.apiKeyEncrypted) {
    try { apiKey = decryptApiKey(cfg.apiKeyEncrypted); } catch { /* ignore */ }
  }

  await fetch(cfg.webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body,
  }).catch(() => { /* fire-and-forget */ });
}

// ─── Slack ────────────────────────────────────────────────────────────────────

export async function postSlackMessage(
  orgId: string,
  text: string,
  blocks?: unknown[],
): Promise<void> {
  const integrations = await getIntegrations(orgId);
  const cfg = integrations.slack;
  if (!cfg?.enabled || !cfg.webhookUrl) return;

  await fetch(cfg.webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, ...(blocks ? { blocks } : {}) }),
  }).catch(() => { /* fire-and-forget */ });
}

export async function notifyEvaluationComplete(
  orgId: string,
  companyName: string,
  role: string,
  score: number,
  reportUrl: string,
): Promise<void> {
  await postSlackMessage(orgId, `New evaluation: *${role}* at *${companyName}* — Score: ${score}/5`, [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*New Evaluation Complete*\n*Role:* ${role}\n*Company:* ${companyName}\n*Score:* ${score}/5`,
      },
    },
    {
      type: 'actions',
      elements: [{
        type: 'button',
        text: { type: 'plain_text', text: 'View Report' },
        url: reportUrl,
      }],
    },
  ]);
}

// ─── OAuth flow stubs ─────────────────────────────────────────────────────────

export function buildOAuthRedirectUrl(
  integration: IntegrationName,
  orgId: string,
  baseUrl: string,
): string {
  const redirectUri = `${baseUrl}/api/v1/integrations/${integration}/callback`;
  const state = Buffer.from(JSON.stringify({ orgId })).toString('base64url');

  switch (integration) {
    case 'google_calendar':
      return `https://accounts.google.com/o/oauth2/v2/auth?client_id=GOOGLE_CLIENT_ID&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=https://www.googleapis.com/auth/calendar&state=${state}&access_type=offline`;
    case 'outlook_calendar':
      return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=AZURE_CLIENT_ID&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=Calendars.ReadWrite+offline_access&state=${state}`;
    default:
      return '';
  }
}

export async function handleOAuthCallback(
  integration: IntegrationName,
  code: string,
  orgId: string,
): Promise<void> {
  // Stub: in production, exchange code for tokens and store encrypted
  await updateIntegrationConfig(orgId, integration, {
    oauthAccessToken: `stub_access_${code.slice(0, 8)}`,
    oauthRefreshToken: `stub_refresh_${code.slice(0, 8)}`,
    oauthExpiresAt: Date.now() + 3600 * 1000,
    enabled: true,
  });
}
