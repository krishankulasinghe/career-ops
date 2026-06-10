import { Worker } from 'bullmq';
import { eq, and, desc, isNull } from 'drizzle-orm';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { db } from '@/config/database.js';
import { bullmqConnection } from '@/config/redis.js';
import { s3 } from '@/config/s3.js';
import { env } from '@/config/env.js';
import { logger } from '@/shared/logger.js';
import { incrementUsage } from '@/shared/usage-meter.js';
import { aiTasks, applications, evaluations, cvs, profiles, promptTemplates } from '@/db/schema.js';
import { getOrgProvider } from '@/modules/ai/ai.router.js';
import type { EvaluationJobData } from './evaluations.queue.js';
import { organizations } from '@/db/schema.js';
import { isNull as drizzleIsNull } from 'drizzle-orm';
import { pdfQueue } from '@/modules/pdf/pdf.queue.js';

export function createEvaluationWorker() {
  return new Worker<EvaluationJobData>(
    'evaluation',
    async (job) => {
      const { taskId, orgId, userId, url, jdText } = job.data;

      await db
        .update(aiTasks)
        .set({ status: 'processing', startedAt: new Date() })
        .where(eq(aiTasks.id, taskId));

      try {
        const [org] = await db
          .select()
          .from(organizations)
          .where(eq(organizations.id, orgId))
          .limit(1);

        const [profile] = await db
          .select()
          .from(profiles)
          .where(eq(profiles.userId, userId))
          .limit(1);

        const [primaryCv] = await db
          .select()
          .from(cvs)
          .where(and(eq(cvs.userId, userId), eq(cvs.isPrimary, true)))
          .limit(1);

        if (!primaryCv) {
          throw new Error('No primary CV found for user');
        }

        let jdContent = jdText ?? '';
        if (url && !jdContent) {
          const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(30000) });
          if (res.ok) {
            jdContent = await res.text();
            jdContent = jdContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 20000);
          }
        }

        if (!jdContent) throw new Error('Could not fetch or extract JD content');

        const [evalTemplate] = await db
          .select()
          .from(promptTemplates)
          .where(and(
            eq(promptTemplates.name, 'evaluation'),
            eq(promptTemplates.language, 'en'),
            drizzleIsNull(promptTemplates.orgId),
            eq(promptTemplates.isActive, true),
          ))
          .limit(1);

        const systemPrompt = evalTemplate?.content
          ?? 'You are career-ops, an AI job offer evaluator. Evaluate the job description against the CV using blocks A-G.';

        const profileContext = profile
          ? `Target roles: ${JSON.stringify(profile.targetRoles)}\nComp: ${JSON.stringify(profile.compensation)}\nLocation: ${profile.location}`
          : 'No profile configured';

        const provider = getOrgProvider((org?.settings as Record<string, unknown>) ?? {});

        const result = await provider.evaluate({
          systemPrompt,
          cvContent: primaryCv.contentMd,
          jdContent,
          profileContext,
        });

        const existingApps = await db
          .select()
          .from(applications)
          .where(and(
            eq(applications.userId, userId),
            eq(applications.company, result.structured.company),
            eq(applications.role, result.structured.role),
            isNull(applications.deletedAt),
          ))
          .limit(1);

        let application;
        if (existingApps.length > 0) {
          application = existingApps[0];
          await db
            .update(applications)
            .set({
              score: String(result.structured.score),
              status: 'Evaluated',
              archetype: result.structured.archetype,
              legitimacy: result.structured.legitimacy,
              jobUrl: url,
              updatedAt: new Date(),
            })
            .where(eq(applications.id, application.id));
        } else {
          const [lastApp] = await db
            .select({ seqNumber: applications.seqNumber })
            .from(applications)
            .where(and(eq(applications.userId, userId), eq(applications.orgId, orgId)))
            .orderBy(desc(applications.seqNumber))
            .limit(1);

          const seqNumber = lastApp ? lastApp.seqNumber + 1 : 1;

          const [newApp] = await db
            .insert(applications)
            .values({
              userId,
              orgId,
              seqNumber,
              date: new Date().toISOString().split('T')[0],
              company: result.structured.company,
              role: result.structured.role,
              score: String(result.structured.score),
              status: 'Evaluated',
              archetype: result.structured.archetype,
              legitimacy: result.structured.legitimacy,
              jobUrl: url,
            })
            .returning();

          application = newApp;
        }

        const [lastEval] = await db
          .select({ reportNumber: evaluations.reportNumber })
          .from(evaluations)
          .where(eq(evaluations.orgId, orgId))
          .orderBy(desc(evaluations.reportNumber))
          .limit(1);

        const reportNumber = lastEval ? lastEval.reportNumber + 1 : 1;

        const [evaluation] = await db
          .insert(evaluations)
          .values({
            applicationId: application.id,
            userId,
            orgId,
            reportNumber,
            reportContent: result.reportMarkdown,
            jdText: jdContent.slice(0, 50000),
            jdSnapshotUrl: url,
            archetype: result.structured.archetype,
            legitimacyTier: result.structured.legitimacy,
            scoreCvMatch: result.structured.scores.cvMatch != null ? String(result.structured.scores.cvMatch) : null,
            scoreNorthStar: result.structured.scores.northStar != null ? String(result.structured.scores.northStar) : null,
            scoreComp: result.structured.scores.comp != null ? String(result.structured.scores.comp) : null,
            scoreCultural: result.structured.scores.cultural != null ? String(result.structured.scores.cultural) : null,
            scoreRedFlags: result.structured.scores.redFlags != null ? String(result.structured.scores.redFlags) : null,
            scoreGlobal: String(result.structured.score),
            gaps: result.structured.gaps,
            aiProvider: result.usage.provider,
            aiModel: result.usage.model,
            aiTokensIn: result.usage.tokensIn,
            aiTokensOut: result.usage.tokensOut,
            aiCostUsd: String(result.usage.costUsd),
            aiLatencyMs: result.usage.latencyMs,
          })
          .returning();

        const s3Key = `${orgId}/reports/${evaluation.id}.md`;
        await s3.send(
          new PutObjectCommand({
            Bucket: env.S3_BUCKET,
            Key: s3Key,
            Body: result.reportMarkdown,
            ContentType: 'text/markdown',
          }),
        );

        await incrementUsage(orgId, 'evaluations', 1, result.usage.tokensIn + result.usage.tokensOut, result.usage.costUsd);

        // Enqueue PDF generation automatically after eval completes
        const [pdfTask] = await db
          .insert(aiTasks)
          .values({
            orgId,
            userId,
            taskType: 'pdf',
            status: 'pending',
            input: { applicationId: application.id, source: 'auto-eval' },
          })
          .returning();

        await pdfQueue.add('generate-pdf', {
          taskId: pdfTask.id,
          orgId,
          userId,
          applicationId: application.id,
        });

        await db
          .update(aiTasks)
          .set({
            status: 'completed',
            completedAt: new Date(),
            provider: result.usage.provider,
            model: result.usage.model,
            tokensIn: result.usage.tokensIn,
            tokensOut: result.usage.tokensOut,
            costUsd: String(result.usage.costUsd),
            latencyMs: result.usage.latencyMs,
            output: {
              applicationId: application.id,
              evaluationId: evaluation.id,
              pdfTaskId: pdfTask.id,
              score: result.structured.score,
              s3Key,
            },
          })
          .where(eq(aiTasks.id, taskId));

        logger.info({ taskId, applicationId: application.id, score: result.structured.score }, 'Evaluation completed');
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        logger.error({ taskId, err }, 'Evaluation failed');

        await db
          .update(aiTasks)
          .set({ status: 'failed', errorMsg, completedAt: new Date() })
          .where(eq(aiTasks.id, taskId));

        throw err;
      }
    },
    {
      connection: bullmqConnection,
      concurrency: 3,
    },
  );
}
