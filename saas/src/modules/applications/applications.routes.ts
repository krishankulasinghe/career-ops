import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { eq, and, gte, lte, desc, asc, ilike, or, isNull } from 'drizzle-orm';
import { db } from '@/config/database.js';
import { applications } from '@/db/schema.js';
import { requireAuth } from '@/modules/auth/auth.middleware.js';
import { NotFoundError, ConflictError } from '@/shared/errors.js';

const APPLICATION_STATUSES = [
  'Evaluated', 'Applied', 'Responded', 'Interview',
  'Offer', 'Rejected', 'Discarded', 'SKIP',
] as const;

const appCreateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  company: z.string().min(1).max(255),
  role: z.string().min(1).max(255),
  score: z.coerce.string().optional(),
  status: z.enum(APPLICATION_STATUSES).default('Evaluated'),
  notes: z.string().optional(),
  jobUrl: z.string().url().optional(),
  source: z.string().max(50).optional(),
  archetype: z.string().max(100).optional(),
  legitimacy: z.string().max(50).optional(),
});

const appUpdateSchema = appCreateSchema.partial().omit({ company: true, role: true });

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(APPLICATION_STATUSES).optional(),
  score_min: z.coerce.number().min(0).max(5).optional(),
  score_max: z.coerce.number().min(0).max(5).optional(),
  search: z.string().optional(),
  sort: z.enum(['date', 'score', 'company', 'status']).default('date'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

async function nextSeqNumber(userId: string, orgId: string): Promise<number> {
  const rows = await db
    .select({ seqNumber: applications.seqNumber })
    .from(applications)
    .where(and(eq(applications.userId, userId), eq(applications.orgId, orgId)))
    .orderBy(desc(applications.seqNumber))
    .limit(1);
  return rows.length > 0 ? rows[0].seqNumber + 1 : 1;
}

export const applicationsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/api/v1/applications',
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const q = listQuerySchema.parse(req.query);
      const offset = (q.page - 1) * q.limit;

      const conditions = [
        eq(applications.userId, req.user.id),
        eq(applications.orgId, req.org.id),
        isNull(applications.deletedAt),
      ];

      if (q.status) conditions.push(eq(applications.status, q.status));
      if (q.score_min != null) conditions.push(gte(applications.score, String(q.score_min)));
      if (q.score_max != null) conditions.push(lte(applications.score, String(q.score_max)));
      if (q.search) {
        conditions.push(
          or(
            ilike(applications.company, `%${q.search}%`),
            ilike(applications.role, `%${q.search}%`),
          )!,
        );
      }

      const sortCol = {
        date: applications.date,
        score: applications.score,
        company: applications.company,
        status: applications.status,
      }[q.sort];

      const rows = await db
        .select()
        .from(applications)
        .where(and(...conditions))
        .orderBy(q.order === 'asc' ? asc(sortCol) : desc(sortCol))
        .limit(q.limit)
        .offset(offset);

      return reply.send({
        applications: rows,
        pagination: { page: q.page, limit: q.limit, hasMore: rows.length === q.limit },
      });
    },
  );

  fastify.post(
    '/api/v1/applications',
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const body = appCreateSchema.parse(req.body);

      const existing = await db
        .select()
        .from(applications)
        .where(
          and(
            eq(applications.userId, req.user.id),
            eq(applications.company, body.company),
            eq(applications.role, body.role),
            isNull(applications.deletedAt),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        throw new ConflictError(`Application for ${body.company} / ${body.role} already exists`);
      }

      const seqNumber = await nextSeqNumber(req.user.id, req.org.id);

      const [app] = await db
        .insert(applications)
        .values({ ...body, userId: req.user.id, orgId: req.org.id, seqNumber })
        .returning();

      return reply.status(201).send({ application: app });
    },
  );

  fastify.get(
    '/api/v1/applications/:id',
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const [app] = await db
        .select()
        .from(applications)
        .where(
          and(
            eq(applications.id, id),
            eq(applications.userId, req.user.id),
            isNull(applications.deletedAt),
          ),
        )
        .limit(1);

      if (!app) throw new NotFoundError('Application', id);
      return reply.send({ application: app });
    },
  );

  fastify.put(
    '/api/v1/applications/:id',
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const body = appUpdateSchema.parse(req.body);

      const [existing] = await db
        .select()
        .from(applications)
        .where(
          and(
            eq(applications.id, id),
            eq(applications.userId, req.user.id),
            isNull(applications.deletedAt),
          ),
        )
        .limit(1);

      if (!existing) throw new NotFoundError('Application', id);

      const [updated] = await db
        .update(applications)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(applications.id, id))
        .returning();

      return reply.send({ application: updated });
    },
  );

  fastify.delete(
    '/api/v1/applications/:id',
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const [existing] = await db
        .select()
        .from(applications)
        .where(
          and(
            eq(applications.id, id),
            eq(applications.userId, req.user.id),
            isNull(applications.deletedAt),
          ),
        )
        .limit(1);

      if (!existing) throw new NotFoundError('Application', id);

      await db
        .update(applications)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(applications.id, id));

      return reply.send({ ok: true });
    },
  );

  fastify.post(
    '/api/v1/applications/import',
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const body = z.object({ markdown: z.string().min(1) }).parse(req.body);
      const result = await importApplicationsMd(body.markdown, req.user.id, req.org.id);
      return reply.send(result);
    },
  );
};

async function importApplicationsMd(
  markdown: string,
  userId: string,
  orgId: string,
): Promise<{ created: number; skipped: number; errors: string[] }> {
  const lines = markdown.split('\n');
  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|') || trimmed.startsWith('| #') || trimmed.startsWith('|---')) continue;

    const cols = trimmed.split('|').map((c) => c.trim()).filter(Boolean);
    if (cols.length < 5) continue;

    try {
      const [seqStr, dateStr, company, role, scoreStatus] = cols;
      const seq = parseInt(seqStr, 10);
      if (isNaN(seq)) continue;

      const date = dateStr?.match(/^\d{4}-\d{2}-\d{2}$/) ? dateStr : new Date().toISOString().split('T')[0];

      let score: string | undefined;
      let status = 'Evaluated';

      // Try to find score in columns (format: X.X/5)
      for (const col of cols) {
        const scoreMatch = col.match(/^(\d+\.\d+)\/5$/);
        if (scoreMatch) {
          score = scoreMatch[1];
        }
      }

      // Try to find status
      const validStatuses = ['Evaluated', 'Applied', 'Responded', 'Interview', 'Offer', 'Rejected', 'Discarded', 'SKIP'];
      for (const col of cols) {
        if (validStatuses.includes(col)) {
          status = col;
          break;
        }
      }

      if (!company || !role) continue;

      // Check for existing
      const existing = await db
        .select()
        .from(applications)
        .where(
          and(
            eq(applications.userId, userId),
            eq(applications.company, company),
            eq(applications.role, role),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        skipped++;
        continue;
      }

      const nextSeq = await nextSeqNumberFn(userId, orgId);

      await db.insert(applications).values({
        userId,
        orgId,
        seqNumber: nextSeq,
        date,
        company,
        role,
        score,
        status,
      });

      created++;
    } catch (err) {
      errors.push(`Line parse error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { created, skipped, errors };
}

async function nextSeqNumberFn(userId: string, orgId: string): Promise<number> {
  const rows = await db
    .select({ seqNumber: applications.seqNumber })
    .from(applications)
    .where(and(eq(applications.userId, userId), eq(applications.orgId, orgId)))
    .orderBy(desc(applications.seqNumber))
    .limit(1);
  return rows.length > 0 ? rows[0].seqNumber + 1 : 1;
}
