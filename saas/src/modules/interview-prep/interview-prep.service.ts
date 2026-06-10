import { db } from '@/config/database.js';
import { storyBank, companyIntel, applications, evaluations } from '@/db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { NotFoundError } from '@/shared/errors.js';
import { getOrgProvider } from '@/modules/ai/ai.router.js';

export async function listStories(userId: string, orgId: string, tags?: string[]) {
  const rows = await db.select().from(storyBank)
    .where(and(eq(storyBank.userId, userId), eq(storyBank.orgId, orgId)));

  if (tags?.length) {
    return rows.filter((s) => {
      const storyTags = (s.tags ?? []) as string[];
      return tags.some((t) => storyTags.includes(t));
    });
  }
  return rows;
}

export async function createStory(userId: string, orgId: string, input: {
  situation: string;
  task: string;
  action: string;
  result: string;
  reflection?: string;
  tags?: string[];
}) {
  const [created] = await db.insert(storyBank).values({
    userId,
    orgId,
    situation: input.situation,
    task: input.task,
    action: input.action,
    result: input.result,
    reflection: input.reflection,
    tags: input.tags ?? [],
    usedInApps: [],
  }).returning();
  return created;
}

export async function updateStory(userId: string, orgId: string, storyId: string, patch: Partial<{
  situation: string;
  task: string;
  action: string;
  result: string;
  reflection: string;
  tags: string[];
}>) {
  const [updated] = await db.update(storyBank)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(storyBank.id, storyId), eq(storyBank.userId, userId), eq(storyBank.orgId, orgId)))
    .returning();
  if (!updated) throw new NotFoundError('Story not found');
  return updated;
}

export async function deleteStory(userId: string, orgId: string, storyId: string): Promise<void> {
  await db.delete(storyBank)
    .where(and(eq(storyBank.id, storyId), eq(storyBank.userId, userId), eq(storyBank.orgId, orgId)));
}

export async function generateCompanyIntel(applicationId: string, orgId: string, orgSettings: Record<string, unknown>): Promise<string> {
  const [app] = await db.select().from(applications)
    .where(and(eq(applications.id, applicationId), eq(applications.orgId, orgId)));
  if (!app) throw new NotFoundError('Application not found');

  // Get the latest evaluation for context
  const [eval_] = await db.select().from(evaluations)
    .where(eq(evaluations.applicationId, applicationId))
    .orderBy(sql`${evaluations.createdAt} DESC`)
    .limit(1);

  const provider = getOrgProvider(orgSettings);
  const prompt = `You are a career research assistant. Generate a comprehensive interview preparation brief for:

Company: ${app.company}
Role: ${app.role}
${eval_ ? `\nJob Description Summary:\n${eval_.jdText?.slice(0, 1000) ?? 'N/A'}` : ''}

Provide:
1. **Company Overview** (mission, products, recent news, culture)
2. **Role Fit Analysis** (what they likely value, key competencies)
3. **Likely Interview Questions** (5-7 questions with STAR tips)
4. **Smart Questions to Ask** (3-4 insightful questions for the interviewer)
5. **Red Flags to Watch** (based on what you know about this company/role type)

Be specific and actionable. 600-800 words.`;

  const result = await provider.generateText({ prompt, maxTokens: 2048 });

  // Save or update intel
  await db.delete(companyIntel).where(eq(companyIntel.applicationId, applicationId));
  await db.insert(companyIntel).values({
    applicationId,
    orgId,
    contentMd: result.text,
    generatedAt: new Date(),
  });

  return result.text;
}

export async function getCompanyIntel(applicationId: string, orgId: string) {
  const [intel] = await db.select().from(companyIntel)
    .where(and(eq(companyIntel.applicationId, applicationId), eq(companyIntel.orgId, orgId)));
  return intel ?? null;
}

export async function matchStoriesToJD(userId: string, orgId: string, applicationId: string): Promise<Array<{
  story: typeof storyBank.$inferSelect;
  relevanceScore: number;
  reason: string;
}>> {
  const [app] = await db.select().from(applications)
    .where(and(eq(applications.id, applicationId), eq(applications.orgId, orgId)));
  if (!app) throw new NotFoundError('Application not found');

  const stories = await listStories(userId, orgId);
  if (!stories.length) return [];

  const [eval_] = await db.select().from(evaluations)
    .where(eq(evaluations.applicationId, applicationId))
    .orderBy(sql`${evaluations.createdAt} DESC`)
    .limit(1);

  const jdText = eval_?.jdText?.slice(0, 2000) ?? `${app.role} at ${app.company}`;

  // Score each story by keyword overlap with JD
  const jdWords = new Set(jdText.toLowerCase().split(/\W+/).filter((w) => w.length > 4));

  return stories
    .map((story) => {
      const storyText = `${story.situation} ${story.task} ${story.action} ${story.result}`.toLowerCase();
      const storyWords = storyText.split(/\W+/).filter((w) => w.length > 4);
      const matches = storyWords.filter((w) => jdWords.has(w)).length;
      const relevanceScore = Math.min(1, matches / Math.max(10, storyWords.length / 4));
      const tags = (story.tags ?? []) as string[];
      return {
        story,
        relevanceScore: Math.round(relevanceScore * 100) / 100,
        reason: tags.length ? `Tags: ${tags.slice(0, 3).join(', ')}` : `${matches} keyword matches with JD`,
      };
    })
    .filter((s) => s.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 5);
}
