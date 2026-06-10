import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';
import { createHash } from 'crypto';
import { eq, and } from 'drizzle-orm';
import { db } from '@/config/database.js';
import { users, sessions, organizations, memberships, profiles, apiKeys } from '@/db/schema.js';
import { ConflictError, UnauthorizedError, NotFoundError } from '@/shared/errors.js';
import type { User, Session, Organization, Membership, ApiKey } from '@/db/schema.js';

export async function register(
  email: string,
  password: string,
  fullName: string,
): Promise<{ user: User; session: Session; organization: Organization }> {
  const existing = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  if (existing.length > 0) {
    throw new ConflictError('An account with this email already exists');
  }

  const passwordHash = await hashPassword(password);
  const slug = await generateUniqueSlug(fullName);

  const [user] = await db
    .insert(users)
    .values({ email: email.toLowerCase(), passwordHash, fullName })
    .returning();

  const [organization] = await db
    .insert(organizations)
    .values({ name: `${fullName}'s Workspace`, slug })
    .returning();

  await db.insert(memberships).values({ userId: user.id, orgId: organization.id, role: 'owner' });

  await db.insert(profiles).values({ userId: user.id, orgId: organization.id, fullName });

  const session = await createSession(user.id);

  return { user, session, organization };
}

export async function login(
  email: string,
  password: string,
): Promise<{ user: User; session: Session; organization: Organization }> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  if (!user || !user.passwordHash) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const [membership] = await db
    .select()
    .from(memberships)
    .where(eq(memberships.userId, user.id))
    .limit(1);

  if (!membership) {
    throw new UnauthorizedError('No organization found for this user');
  }

  const [organization] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, membership.orgId))
    .limit(1);

  const session = await createSession(user.id);

  return { user, session, organization };
}

export async function logout(sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export async function createSession(userId: string): Promise<Session> {
  const sessionId = nanoid(64);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const [session] = await db
    .insert(sessions)
    .values({ id: sessionId, userId, expiresAt })
    .returning();

  return session;
}

export async function validateSession(
  sessionId: string,
): Promise<{ user: User; session: Session } | null> {
  const [row] = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!row) return null;

  if (row.session.expiresAt < new Date()) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
    return null;
  }

  return row;
}

export async function createApiKey(
  userId: string,
  orgId: string,
  name: string,
  scopes: string[],
): Promise<{ key: string; apiKey: ApiKey }> {
  const raw = nanoid(48);
  const fullKey = `co_${raw}`;
  const keyPrefix = fullKey.substring(0, 8);
  const keyHash = hashApiKey(fullKey);

  const [apiKey] = await db
    .insert(apiKeys)
    .values({ userId, orgId, keyHash, keyPrefix, name, scopes })
    .returning();

  return { key: fullKey, apiKey };
}

export async function validateApiKey(
  key: string,
): Promise<{ user: User; org: Organization; membership: Membership; scopes: string[] } | null> {
  const keyHash = hashApiKey(key);

  const [row] = await db
    .select({ apiKey: apiKeys, user: users, org: organizations, membership: memberships })
    .from(apiKeys)
    .innerJoin(users, eq(apiKeys.userId, users.id))
    .innerJoin(organizations, eq(apiKeys.orgId, organizations.id))
    .innerJoin(
      memberships,
      and(eq(memberships.userId, apiKeys.userId), eq(memberships.orgId, apiKeys.orgId)),
    )
    .where(eq(apiKeys.keyHash, keyHash))
    .limit(1);

  if (!row) return null;
  if (row.apiKey.expiresAt && row.apiKey.expiresAt < new Date()) return null;

  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, row.apiKey.id));

  return {
    user: row.user,
    org: row.org,
    membership: row.membership,
    scopes: (row.apiKey.scopes as string[]) ?? [],
  };
}

export async function deleteApiKey(userId: string, keyId: string): Promise<void> {
  const [key] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, userId)))
    .limit(1);

  if (!key) {
    throw new NotFoundError('API key', keyId);
  }

  await db.delete(apiKeys).where(eq(apiKeys.id, keyId));
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

async function generateUniqueSlug(name: string): Promise<string> {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);

  let slug = base;
  let attempt = 0;

  while (true) {
    const existing = await db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, slug))
      .limit(1);

    if (existing.length === 0) return slug;

    attempt++;
    slug = `${base}-${attempt}`;
  }
}
