import type { FastifyRequest, FastifyReply } from 'fastify';
import { redis } from '@/config/redis.js';
import { TooManyRequestsError } from '@/shared/errors.js';

const TIER_LIMITS: Record<string, number> = {
  free: 100,
  pro: 1000,
  team: 10000,
  enterprise: 100000,
};

const WINDOW_SECONDS = 3600; // 1 hour

export async function enforceApiKeyRateLimit(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  // Only apply to API key auth (not session auth)
  if (req.sessionId !== null || !req.apiKeyScopes) return;

  const plan = req.org?.plan ?? 'free';
  const limit = TIER_LIMITS[plan] ?? TIER_LIMITS.free;
  const keyId = `ratelimit:api:${req.org?.id ?? 'unknown'}:${Math.floor(Date.now() / (WINDOW_SECONDS * 1000))}`;

  const current = await redis.incr(keyId);
  if (current === 1) await redis.expire(keyId, WINDOW_SECONDS);

  const remaining = Math.max(0, limit - current);
  const resetAt = Math.floor(Date.now() / (WINDOW_SECONDS * 1000)) * WINDOW_SECONDS + WINDOW_SECONDS;

  reply.header('X-RateLimit-Limit', String(limit));
  reply.header('X-RateLimit-Remaining', String(remaining));
  reply.header('X-RateLimit-Reset', String(resetAt));

  if (current > limit) {
    reply.header('Retry-After', String(WINDOW_SECONDS));
    throw new TooManyRequestsError('API rate limit exceeded. Upgrade your plan for higher limits.');
  }

  // Track per-endpoint usage for analytics
  const endpointKey = `apianalytics:${req.org?.id ?? 'unknown'}:${Math.floor(Date.now() / (WINDOW_SECONDS * 1000))}:${req.method}:${req.routeOptions?.url ?? req.url}`;
  await redis.incr(endpointKey);
  await redis.expire(endpointKey, 86400 * 30); // 30 days
}

export async function getApiKeyStats(orgId: string, hours = 24): Promise<{
  totalRequests: number;
  windows: Array<{ hour: string; count: number }>;
  topEndpoints: Array<{ endpoint: string; count: number }>;
}> {
  const now = Math.floor(Date.now() / (WINDOW_SECONDS * 1000));
  const windows: Array<{ hour: string; count: number }> = [];
  let totalRequests = 0;

  const windowKeys: string[] = [];
  for (let i = hours - 1; i >= 0; i--) {
    const windowTs = now - i;
    const key = `ratelimit:api:${orgId}:${windowTs}`;
    windowKeys.push(key);
    const hourLabel = new Date(windowTs * WINDOW_SECONDS * 1000).toISOString().slice(0, 16);
    windows.push({ hour: hourLabel, count: 0 });
  }

  if (windowKeys.length > 0) {
    const counts = await redis.mget(...windowKeys);
    counts.forEach((c, i) => {
      const count = parseInt(c ?? '0', 10);
      windows[i].count = count;
      totalRequests += count;
    });
  }

  // Top endpoints from analytics keys
  const pattern = `apianalytics:${orgId}:*`;
  const analyticsKeys = await redis.keys(pattern);
  const endpointMap = new Map<string, number>();

  if (analyticsKeys.length > 0) {
    const values = await redis.mget(...analyticsKeys);
    analyticsKeys.forEach((key, i) => {
      const parts = key.split(':');
      if (parts.length >= 5) {
        const endpoint = `${parts[3]} ${parts.slice(4).join(':')}`;
        const count = parseInt(values[i] ?? '0', 10);
        endpointMap.set(endpoint, (endpointMap.get(endpoint) ?? 0) + count);
      }
    });
  }

  const topEndpoints = Array.from(endpointMap.entries())
    .map(([endpoint, count]) => ({ endpoint, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return { totalRequests, windows, topEndpoints };
}
