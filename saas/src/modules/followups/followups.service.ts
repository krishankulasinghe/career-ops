import { and, eq, isNull, desc } from 'drizzle-orm';
import { db } from '@/config/database.js';
import { followUps, applications } from '@/db/schema.js';
import { NotFoundError } from '@/shared/errors.js';

export type FollowUpUrgency = 'urgent' | 'due' | 'scheduled' | 'overdue' | 'none';

// Port of followup-cadence.mjs logic
function computeUrgency(status: string, lastActionDate: Date, now: Date): FollowUpUrgency {
  const daysSince = Math.floor((now.getTime() - lastActionDate.getTime()) / (1000 * 60 * 60 * 24));

  switch (status) {
    case 'Applied':
      if (daysSince >= 21) return 'overdue';
      if (daysSince >= 14) return 'urgent';
      if (daysSince >= 7) return 'due';
      return 'scheduled';

    case 'Responded':
      if (daysSince >= 14) return 'overdue';
      if (daysSince >= 7) return 'urgent';
      if (daysSince >= 3) return 'due';
      return 'scheduled';

    case 'Interview':
      if (daysSince >= 10) return 'overdue';
      if (daysSince >= 5) return 'urgent';
      return 'due';

    default:
      return 'none';
  }
}

export async function listFollowUps(orgId: string, userId: string) {
  const apps = await db
    .select()
    .from(applications)
    .where(
      and(
        eq(applications.orgId, orgId),
        eq(applications.userId, userId),
        isNull(applications.deletedAt),
      ),
    );

  const now = new Date();

  const withUrgency = apps
    .filter((a) => ['Applied', 'Responded', 'Interview'].includes(a.status ?? ''))
    .map((a) => ({
      applicationId: a.id,
      company: a.company,
      role: a.role,
      status: a.status,
      url: a.jobUrl,
      lastActionDate: a.updatedAt,
      urgency: computeUrgency(a.status ?? '', a.updatedAt, now),
    }))
    .filter((a) => a.urgency !== 'none')
    .sort((a, b) => {
      const order: Record<FollowUpUrgency, number> = { overdue: 0, urgent: 1, due: 2, scheduled: 3, none: 4 };
      return order[a.urgency] - order[b.urgency];
    });

  return withUrgency;
}

export async function createFollowUp(
  userId: string,
  data: { applicationId: string; date: string; channel?: string; contactName?: string; contactEmail?: string; notes?: string },
) {
  const [app] = await db.select().from(applications).where(eq(applications.id, data.applicationId));
  if (!app) throw new NotFoundError('Application not found');

  const [followUp] = await db
    .insert(followUps)
    .values({ ...data, userId })
    .returning();

  // Reset updatedAt so urgency timer resets
  await db.update(applications).set({ updatedAt: new Date() }).where(eq(applications.id, data.applicationId));

  return followUp;
}

export async function updateFollowUp(userId: string, id: string, data: Partial<{
  date: string; channel: string; contactName: string; contactEmail: string; notes: string;
}>) {
  const [updated] = await db
    .update(followUps)
    .set(data)
    .where(and(eq(followUps.id, id), eq(followUps.userId, userId)))
    .returning();
  if (!updated) throw new NotFoundError('Follow-up not found');
  return updated;
}

export async function listFollowUpHistory(applicationId: string, userId: string) {
  return db
    .select()
    .from(followUps)
    .where(and(eq(followUps.applicationId, applicationId), eq(followUps.userId, userId), isNull(followUps.deletedAt)))
    .orderBy(desc(followUps.date));
}
