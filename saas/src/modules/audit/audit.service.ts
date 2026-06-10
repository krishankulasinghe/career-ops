import { db } from '@/config/database.js';
import { auditLogs } from '@/db/schema.js';
import { logger } from '@/shared/logger.js';

export interface AuditParams {
  orgId: string;
  userId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

// Fire-and-forget — never throws, never awaited by callers
export function writeAudit(params: AuditParams): void {
  db.insert(auditLogs)
    .values({
      orgId: params.orgId,
      userId: params.userId ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: params.metadata ?? {},
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    })
    .catch((err) => {
      logger.warn({ err, action: params.action }, 'Audit log write failed (non-fatal)');
    });
}
