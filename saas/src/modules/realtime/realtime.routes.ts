import type { FastifyInstance, FastifyRequest } from 'fastify';
import { requireAuth } from '@/modules/auth/auth.middleware.js';
import { subscriber, getOrgChannel } from './realtime.service.js';
import { logger } from '@/shared/logger.js';

// Client registry: orgId → Set of send functions
const clients = new Map<string, Set<(msg: string) => void>>();

function addClient(orgId: string, send: (msg: string) => void) {
  if (!clients.has(orgId)) clients.set(orgId, new Set());
  clients.get(orgId)!.add(send);
}

function removeClient(orgId: string, send: (msg: string) => void) {
  clients.get(orgId)?.delete(send);
  if (!clients.get(orgId)?.size) clients.delete(orgId);
}

function broadcastToOrg(orgId: string, message: string) {
  const orgClients = clients.get(orgId);
  if (!orgClients) return;
  for (const send of orgClients) {
    try { send(message); } catch { /* client disconnected */ }
  }
}

// Subscribe to Redis pub/sub for all org channels
subscriber.on('message', (channel: string, message: string) => {
  const match = channel.match(/^org:(.+):events$/);
  if (match) broadcastToOrg(match[1], message);
});

let subscribed = false;

async function ensureSubscription() {
  if (!subscribed) {
    await subscriber.psubscribe('org:*:events');
    subscribed = true;
    subscriber.on('pmessage', (_pattern: string, channel: string, message: string) => {
      const match = channel.match(/^org:(.+):events$/);
      if (match) broadcastToOrg(match[1], message);
    });
  }
}

export async function realtimeRoutes(fastify: FastifyInstance) {
  await ensureSubscription();

  // SSE endpoint (works without @fastify/websocket dependency)
  fastify.get('/api/v1/events', {
    preHandler: [requireAuth],
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (req: FastifyRequest, reply) => {
    const orgId = (req as unknown as Record<string, unknown>).org as { id: string } | undefined;
    if (!orgId) { reply.status(401).send({ error: 'Unauthorized' }); return; }

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const send = (data: string) => {
      reply.raw.write(`data: ${data}\n\n`);
    };

    addClient(orgId.id, send);

    // Heartbeat every 30s
    const heartbeat = setInterval(() => {
      try { reply.raw.write(':heartbeat\n\n'); } catch { clearInterval(heartbeat); }
    }, 30_000);

    // Cleanup on disconnect
    reply.raw.on('close', () => {
      clearInterval(heartbeat);
      removeClient(orgId.id, send);
      logger.debug({ orgId: orgId.id }, 'SSE client disconnected');
    });

    // Keep connection open
    await new Promise<void>((resolve) => reply.raw.on('close', resolve));
  });
}

// Export for use by workers
export { broadcastToOrg };
