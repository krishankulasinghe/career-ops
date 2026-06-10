import { eq, and, isNull } from 'drizzle-orm';
import { db } from '@/config/database.js';
import { promptTemplates } from '@/db/schema.js';

interface CacheEntry {
  content: string;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const TTL_MS = 5 * 60 * 1000;

export async function getPromptTemplate(
  name: string,
  language = 'en',
  orgId?: string,
): Promise<string> {
  const cacheKey = `${name}:${language}:${orgId ?? 'system'}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.content;
  }

  if (orgId) {
    const [orgTemplate] = await db
      .select()
      .from(promptTemplates)
      .where(
        and(
          eq(promptTemplates.name, name),
          eq(promptTemplates.language, language),
          eq(promptTemplates.orgId, orgId),
          eq(promptTemplates.isActive, true),
        ),
      )
      .orderBy(promptTemplates.version)
      .limit(1);

    if (orgTemplate) {
      cache.set(cacheKey, { content: orgTemplate.content, expiresAt: Date.now() + TTL_MS });
      return orgTemplate.content;
    }
  }

  const [systemTemplate] = await db
    .select()
    .from(promptTemplates)
    .where(
      and(
        eq(promptTemplates.name, name),
        eq(promptTemplates.language, language),
        isNull(promptTemplates.orgId),
        eq(promptTemplates.isActive, true),
      ),
    )
    .orderBy(promptTemplates.version)
    .limit(1);

  if (!systemTemplate) {
    return `[Prompt template '${name}' not found]`;
  }

  cache.set(cacheKey, { content: systemTemplate.content, expiresAt: Date.now() + TTL_MS });
  return systemTemplate.content;
}

export function invalidateCache(orgId?: string): void {
  for (const key of cache.keys()) {
    if (!orgId || key.includes(orgId)) {
      cache.delete(key);
    }
  }
}
