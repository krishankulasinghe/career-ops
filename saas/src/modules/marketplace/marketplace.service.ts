import { eq, and, or, isNull, desc, sql } from 'drizzle-orm';
import { db } from '@/config/database.js';
import {
  cvTemplates, promptTemplates, templateInstalls, templateModerationQueue,
  type CvTemplate, type PromptTemplate,
} from '@/db/schema.js';
import { NotFoundError, ForbiddenError } from '@/shared/errors.js';

export type MarketplaceItem = {
  id: string;
  type: 'cv' | 'prompt';
  name: string;
  description?: string | null;
  previewUrl?: string | null;
  downloadCount: number;
  rating: string | null;
  ratingCount: number;
  orgId: string | null;
  visibility: string;
  moderationStatus: string;
  createdAt: Date;
  installedByOrg?: boolean;
};

export async function browseMarketplace(orgId: string): Promise<{ items: MarketplaceItem[] }> {
  const [cvRows, promptRows, installs] = await Promise.all([
    db
      .select()
      .from(cvTemplates)
      .where(
        and(
          eq(cvTemplates.visibility, 'public'),
          eq(cvTemplates.moderationStatus, 'approved'),
        ),
      )
      .orderBy(desc(cvTemplates.downloadCount)),

    db
      .select()
      .from(promptTemplates)
      .where(
        and(
          eq(promptTemplates.visibility, 'public'),
          eq(promptTemplates.moderationStatus, 'approved'),
          eq(promptTemplates.isActive, true),
        ),
      )
      .orderBy(desc(promptTemplates.downloadCount)),

    db
      .select({ templateId: templateInstalls.templateId, templateType: templateInstalls.templateType })
      .from(templateInstalls)
      .where(eq(templateInstalls.orgId, orgId)),
  ]);

  const installedSet = new Set(installs.map((i) => `${i.templateType}:${i.templateId}`));

  const items: MarketplaceItem[] = [
    ...cvRows.map((t): MarketplaceItem => ({
      id: t.id,
      type: 'cv',
      name: t.name,
      description: t.description,
      previewUrl: t.previewUrl,
      downloadCount: t.downloadCount,
      rating: t.rating,
      ratingCount: t.ratingCount,
      orgId: t.orgId ?? null,
      visibility: t.visibility,
      moderationStatus: t.moderationStatus,
      createdAt: t.createdAt,
      installedByOrg: installedSet.has(`cv:${t.id}`),
    })),
    ...promptRows.map((t): MarketplaceItem => ({
      id: t.id,
      type: 'prompt',
      name: t.name,
      description: t.description,
      previewUrl: null,
      downloadCount: t.downloadCount,
      rating: t.rating,
      ratingCount: t.ratingCount,
      orgId: t.orgId ?? null,
      visibility: t.visibility,
      moderationStatus: t.moderationStatus,
      createdAt: t.createdAt,
      installedByOrg: installedSet.has(`prompt:${t.id}`),
    })),
  ];

  return { items };
}

export async function installTemplate(
  orgId: string,
  templateId: string,
  templateType: 'cv' | 'prompt',
): Promise<{ id: string }> {
  if (templateType === 'cv') {
    const [src] = await db
      .select()
      .from(cvTemplates)
      .where(
        and(
          eq(cvTemplates.id, templateId),
          eq(cvTemplates.visibility, 'public'),
          eq(cvTemplates.moderationStatus, 'approved'),
        ),
      );
    if (!src) throw new NotFoundError('Template');

    // Insert install record (idempotent via unique constraint)
    await db
      .insert(templateInstalls)
      .values({ orgId, templateId, templateType: 'cv' })
      .onConflictDoNothing();

    // Copy template to org
    const [copy] = await db
      .insert(cvTemplates)
      .values({
        orgId,
        name: src.name,
        description: src.description,
        contentHtml: src.contentHtml,
        contentTex: src.contentTex,
        visibility: 'private',
        moderationStatus: 'approved',
      })
      .returning({ id: cvTemplates.id });

    // Increment download count
    await db
      .update(cvTemplates)
      .set({ downloadCount: sql`${cvTemplates.downloadCount} + 1` })
      .where(eq(cvTemplates.id, templateId));

    return { id: copy.id };
  } else {
    const [src] = await db
      .select()
      .from(promptTemplates)
      .where(
        and(
          eq(promptTemplates.id, templateId),
          eq(promptTemplates.visibility, 'public'),
          eq(promptTemplates.moderationStatus, 'approved'),
        ),
      );
    if (!src) throw new NotFoundError('Template');

    await db
      .insert(templateInstalls)
      .values({ orgId, templateId, templateType: 'prompt' })
      .onConflictDoNothing();

    const [copy] = await db
      .insert(promptTemplates)
      .values({
        orgId,
        name: src.name,
        description: src.description,
        content: src.content,
        language: src.language,
        visibility: 'private',
        moderationStatus: 'approved',
      })
      .returning({ id: promptTemplates.id });

    await db
      .update(promptTemplates)
      .set({ downloadCount: sql`${promptTemplates.downloadCount} + 1` })
      .where(eq(promptTemplates.id, templateId));

    return { id: copy.id };
  }
}

export async function rateTemplate(
  orgId: string,
  templateId: string,
  templateType: 'cv' | 'prompt',
  stars: number,
): Promise<void> {
  // Update the install record rating
  await db
    .update(templateInstalls)
    .set({ rating: stars, ratedAt: new Date() })
    .where(
      and(
        eq(templateInstalls.orgId, orgId),
        eq(templateInstalls.templateId, templateId),
        eq(templateInstalls.templateType, templateType),
      ),
    );

  // Recompute avg rating from installs
  const [agg] = await db
    .select({
      avg: sql<string>`AVG(rating)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(templateInstalls)
    .where(
      and(
        eq(templateInstalls.templateId, templateId),
        eq(templateInstalls.templateType, templateType),
      ),
    );

  const avgRating = agg?.avg ? parseFloat(agg.avg).toFixed(2) : '0';
  const ratingCount = agg?.count ?? 0;

  if (templateType === 'cv') {
    await db
      .update(cvTemplates)
      .set({ rating: avgRating, ratingCount })
      .where(eq(cvTemplates.id, templateId));
  } else {
    await db
      .update(promptTemplates)
      .set({ rating: avgRating, ratingCount })
      .where(eq(promptTemplates.id, templateId));
  }
}

export async function submitForPublishing(
  orgId: string,
  templateId: string,
  templateType: 'cv' | 'prompt',
): Promise<void> {
  if (templateType === 'cv') {
    const [t] = await db
      .select()
      .from(cvTemplates)
      .where(and(eq(cvTemplates.id, templateId), eq(cvTemplates.orgId, orgId)));
    if (!t) throw new NotFoundError('Template');

    await db
      .update(cvTemplates)
      .set({ moderationStatus: 'pending' })
      .where(eq(cvTemplates.id, templateId));
  } else {
    const [t] = await db
      .select()
      .from(promptTemplates)
      .where(and(eq(promptTemplates.id, templateId), eq(promptTemplates.orgId, orgId)));
    if (!t) throw new NotFoundError('Template');

    await db
      .update(promptTemplates)
      .set({ moderationStatus: 'pending' })
      .where(eq(promptTemplates.id, templateId));
  }

  await db
    .insert(templateModerationQueue)
    .values({ orgId, templateId, templateType })
    .onConflictDoNothing();
}

export async function adminReviewTemplate(
  reviewerUserId: string,
  queueId: string,
  decision: 'approved' | 'rejected',
  rejectionReason?: string,
): Promise<void> {
  const [item] = await db
    .select()
    .from(templateModerationQueue)
    .where(eq(templateModerationQueue.id, queueId));
  if (!item) throw new NotFoundError('Queue item');

  await db
    .update(templateModerationQueue)
    .set({ decision, reviewedAt: new Date(), reviewedBy: reviewerUserId, rejectionReason })
    .where(eq(templateModerationQueue.id, queueId));

  const newStatus = decision === 'approved' ? 'approved' : 'rejected';
  const newVisibility = decision === 'approved' ? 'public' : 'private';

  if (item.templateType === 'cv') {
    await db
      .update(cvTemplates)
      .set({ moderationStatus: newStatus, visibility: newVisibility })
      .where(eq(cvTemplates.id, item.templateId));
  } else {
    await db
      .update(promptTemplates)
      .set({ moderationStatus: newStatus, visibility: newVisibility })
      .where(eq(promptTemplates.id, item.templateId));
  }
}

export async function getModerationQueue(): Promise<Array<{
  id: string;
  templateId: string;
  templateType: string;
  templateName: string;
  orgId: string;
  submittedAt: Date;
  decision: string | null;
}>> {
  const cvQueue = await db
    .select({
      id: templateModerationQueue.id,
      templateId: templateModerationQueue.templateId,
      templateType: templateModerationQueue.templateType,
      templateName: cvTemplates.name,
      orgId: templateModerationQueue.orgId,
      submittedAt: templateModerationQueue.submittedAt,
      decision: templateModerationQueue.decision,
    })
    .from(templateModerationQueue)
    .innerJoin(cvTemplates, eq(templateModerationQueue.templateId, cvTemplates.id))
    .where(
      and(
        eq(templateModerationQueue.templateType, 'cv'),
        isNull(templateModerationQueue.decision),
      ),
    );

  const promptQueue = await db
    .select({
      id: templateModerationQueue.id,
      templateId: templateModerationQueue.templateId,
      templateType: templateModerationQueue.templateType,
      templateName: promptTemplates.name,
      orgId: templateModerationQueue.orgId,
      submittedAt: templateModerationQueue.submittedAt,
      decision: templateModerationQueue.decision,
    })
    .from(templateModerationQueue)
    .innerJoin(promptTemplates, eq(templateModerationQueue.templateId, promptTemplates.id))
    .where(
      and(
        eq(templateModerationQueue.templateType, 'prompt'),
        isNull(templateModerationQueue.decision),
      ),
    );

  return [...cvQueue, ...promptQueue].sort(
    (a, b) => a.submittedAt.getTime() - b.submittedAt.getTime(),
  );
}
