import { and, eq, isNull, desc, count } from 'drizzle-orm';
import { db } from '@/config/database.js';
import { notifications, type NewNotification } from '@/db/schema.js';
import { NotFoundError } from '@/shared/errors.js';

export async function createNotification(data: Omit<NewNotification, 'id' | 'createdAt'>) {
  const [notification] = await db.insert(notifications).values(data).returning();
  return notification;
}

export async function listNotifications(userId: string, limit = 10) {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function countUnread(userId: string) {
  const [row] = await db
    .select({ count: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return Number(row?.count ?? 0);
}

export async function markRead(userId: string, id: string) {
  const [updated] = await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
    .returning();
  if (!updated) throw new NotFoundError('Notification not found');
  return updated;
}

export async function markAllRead(userId: string) {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}
