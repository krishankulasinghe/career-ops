import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { db } from '@/config/database.js';
import { organizations } from '@/db/schema.js';
import { eq } from 'drizzle-orm';
import { env } from '@/config/env.js';
import { getProvider } from './ai.router.js';

const ALGORITHM = 'aes-256-gcm';

function getKey(): Buffer {
  return Buffer.from(env.ENCRYPTION_KEY, 'hex');
}

export function encryptApiKey(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decryptApiKey(ciphertext: string): string {
  const buf = Buffer.from(ciphertext, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);
  const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

export interface AISettings {
  provider: string;
  model: string;
  temperature: number;
  maxTokens: number;
  fallbackProvider: string | null;
  hasCustomKey: boolean;
}

const PLAN_PROVIDERS: Record<string, string[]> = {
  free: ['deepseek'],
  pro: ['deepseek', 'gemini', 'openai'],
  team: ['deepseek', 'gemini', 'openai', 'anthropic'],
  enterprise: ['deepseek', 'gemini', 'openai', 'anthropic'],
};

export function getAllowedProviders(plan: string): string[] {
  return PLAN_PROVIDERS[plan] ?? PLAN_PROVIDERS['free'];
}

export async function getAISettings(orgId: string): Promise<AISettings> {
  const [org] = await db.select({ settings: organizations.settings, plan: organizations.plan })
    .from(organizations)
    .where(eq(organizations.id, orgId));

  if (!org) throw new Error('Organization not found');

  const s = (org.settings ?? {}) as Record<string, unknown>;
  return {
    provider: (s['ai_provider'] as string) ?? 'deepseek',
    model: (s['ai_model'] as string) ?? '',
    temperature: (s['ai_temperature'] as number) ?? 0.3,
    maxTokens: (s['ai_max_tokens'] as number) ?? 4096,
    fallbackProvider: (s['ai_provider_fallback'] as string) ?? null,
    hasCustomKey: Boolean(s['ai_api_key_encrypted']),
  };
}

export async function updateAISettings(orgId: string, plan: string, patch: {
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  fallbackProvider?: string | null;
  apiKey?: string;
}): Promise<AISettings> {
  const allowed = getAllowedProviders(plan);
  if (patch.provider && !allowed.includes(patch.provider)) {
    throw new Error(`Provider '${patch.provider}' is not available on the ${plan} plan`);
  }

  const [org] = await db.select({ settings: organizations.settings })
    .from(organizations)
    .where(eq(organizations.id, orgId));

  if (!org) throw new Error('Organization not found');

  const current = (org.settings ?? {}) as Record<string, unknown>;
  const updated: Record<string, unknown> = { ...current };

  if (patch.provider !== undefined) updated['ai_provider'] = patch.provider;
  if (patch.model !== undefined) updated['ai_model'] = patch.model;
  if (patch.temperature !== undefined) updated['ai_temperature'] = patch.temperature;
  if (patch.maxTokens !== undefined) updated['ai_max_tokens'] = patch.maxTokens;
  if (patch.fallbackProvider !== undefined) updated['ai_provider_fallback'] = patch.fallbackProvider ?? null;
  if (patch.apiKey) updated['ai_api_key_encrypted'] = encryptApiKey(patch.apiKey);

  await db.update(organizations).set({ settings: updated }).where(eq(organizations.id, orgId));

  return getAISettings(orgId);
}

export async function testAIConnection(orgId: string): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const settings = await getAISettings(orgId);
  const [org] = await db.select({ settings: organizations.settings })
    .from(organizations)
    .where(eq(organizations.id, orgId));

  const s = (org?.settings ?? {}) as Record<string, unknown>;
  let customKey: string | undefined;
  if (s['ai_api_key_encrypted']) {
    customKey = decryptApiKey(s['ai_api_key_encrypted'] as string);
  }

  const provider = getProvider(settings.provider, settings.fallbackProvider ?? undefined, customKey);
  const start = Date.now();
  try {
    await provider.generateText({ prompt: 'Reply with the single word: OK', maxTokens: 10 });
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    return { ok: false, latencyMs: Date.now() - start, error: String(err) };
  }
}
