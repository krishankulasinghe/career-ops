import { Redis } from 'ioredis';
import { env } from '@/config/env.js';

// Separate publisher and subscriber connections (ioredis requirement for pub/sub)
export const publisher = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

export const subscriber = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

export type RealtimeEventType =
  | 'evaluation.progress'
  | 'evaluation.completed'
  | 'scan.progress'
  | 'scan.completed'
  | 'pdf.progress'
  | 'pdf.ready'
  | 'notification'
  | 'ping';

export interface RealtimeEvent {
  type: RealtimeEventType;
  orgId: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export function getOrgChannel(orgId: string): string {
  return `org:${orgId}:events`;
}

export async function publishEvent(orgId: string, type: RealtimeEventType, data: Record<string, unknown>): Promise<void> {
  const event: RealtimeEvent = { type, orgId, data, timestamp: new Date().toISOString() };
  await publisher.publish(getOrgChannel(orgId), JSON.stringify(event));
}
