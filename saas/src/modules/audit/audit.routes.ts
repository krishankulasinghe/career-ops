import type { FastifyInstance } from 'fastify';
import { and, eq, desc, gte, lte } from 'drizzle-orm';
import { z } from 'zod';
import { requireAuth, requireOrg, requireOrgRole } from '@/modules/auth/auth.middleware.js';
import { db } from '@/config/database.js';
import { auditLogs } from '@/db/schema.js';

export async function auditRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/api/v1/audit',
    { preHandler: [requireAuth, requireOrg, requireOrgRole('admin', 'owner')] },
    async (req) => {
      const query = z.object({
        page: z.coerce.number().min(1).default(1),
        limit: z.coerce.number().min(1).max(200).default(50),
        action: z.string().optional(),
        entityType: z.string().optional(),
        userId: z.string().uuid().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
      }).parse(req.query);

      const offset = (query.page - 1) * query.limit;
      const conditions = [eq(auditLogs.orgId, req.org.id)];
      if (query.action) conditions.push(eq(auditLogs.action, query.action));
      if (query.entityType) conditions.push(eq(auditLogs.entityType, query.entityType));
      if (query.userId) conditions.push(eq(auditLogs.userId, query.userId));
      if (query.from) conditions.push(gte(auditLogs.createdAt, new Date(query.from)));
      if (query.to) conditions.push(lte(auditLogs.createdAt, new Date(query.to)));

      return db
        .select()
        .from(auditLogs)
        .where(and(...conditions))
        .orderBy(desc(auditLogs.createdAt))
        .limit(query.limit)
        .offset(offset);
    },
  );
}
