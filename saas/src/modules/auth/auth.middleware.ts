import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { db } from '@/config/database.js';
import { memberships, organizations } from '@/db/schema.js';
import { validateSession, validateApiKey } from './auth.service.js';
import { UnauthorizedError, ForbiddenError } from '@/shared/errors.js';
import type { User, Organization, Membership } from '@/db/schema.js';

declare module 'fastify' {
  interface FastifyRequest {
    user: User;
    org: Organization;
    membership: Membership;
    sessionId: string | null;
    apiKeyScopes: string[];
  }
}

export async function requireAuth(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const result = await validateApiKey(token);
    if (!result) throw new UnauthorizedError('Invalid or expired API key');

    req.user = result.user;
    req.org = result.org;
    req.membership = result.membership;
    req.apiKeyScopes = result.scopes;
    req.sessionId = null;
    return;
  }

  const sessionId = req.cookies['session'];
  if (!sessionId) throw new UnauthorizedError();

  const result = await validateSession(sessionId);
  if (!result) throw new UnauthorizedError('Session expired or invalid');

  req.user = result.user;
  req.sessionId = sessionId;
  req.apiKeyScopes = [];

  const [membership] = await db
    .select({ membership: memberships, org: organizations })
    .from(memberships)
    .innerJoin(organizations, eq(memberships.orgId, organizations.id))
    .where(eq(memberships.userId, result.user.id))
    .orderBy(memberships.joinedAt)
    .limit(1);

  if (!membership) throw new UnauthorizedError('No organization found for this user');

  req.org = membership.org;
  req.membership = membership.membership;
}

export function requireRole(...roles: string[]) {
  return async function (req: FastifyRequest, _reply: FastifyReply): Promise<void> {
    if (!req.user) throw new UnauthorizedError();
    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError(`Required role: ${roles.join(' or ')}`);
    }
  };
}

export async function requireOrg(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
  if (!req.user) throw new UnauthorizedError();

  const orgId = (req.params as Record<string, string>)['orgId'] ?? req.org?.id;
  if (!orgId) throw new ForbiddenError('Organization context required');

  const [row] = await db
    .select({ membership: memberships, org: organizations })
    .from(memberships)
    .innerJoin(organizations, eq(memberships.orgId, organizations.id))
    .where(and(eq(memberships.userId, req.user.id), eq(memberships.orgId, orgId)))
    .limit(1);

  if (!row) throw new ForbiddenError('Not a member of this organization');

  req.org = row.org;
  req.membership = row.membership;
}

export function requireOrgRole(...roles: string[]) {
  return async function (req: FastifyRequest, _reply: FastifyReply): Promise<void> {
    if (!req.membership) throw new UnauthorizedError();
    if (!roles.includes(req.membership.role)) {
      throw new ForbiddenError(`Required org role: ${roles.join(' or ')}`);
    }
  };
}
