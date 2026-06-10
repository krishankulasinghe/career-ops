import { and, eq, gt, count } from 'drizzle-orm';
import { db } from '@/config/database.js';
import { orgInvitations, memberships, users, organizations } from '@/db/schema.js';
import { NotFoundError, ValidationError } from '@/shared/errors.js';
import { nanoid } from 'nanoid';
import { logger } from '@/shared/logger.js';

export async function inviteMember(orgId: string, invitedByUserId: string, email: string, role: 'member' | 'admin') {
  // Check if already a member
  const [existingUser] = await db.select().from(users).where(eq(users.email, email));
  if (existingUser) {
    const [existing] = await db
      .select()
      .from(memberships)
      .where(and(eq(memberships.orgId, orgId), eq(memberships.userId, existingUser.id)));
    if (existing) throw new ValidationError('User is already a member of this organization');
  }

  const token = nanoid(32);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const [invitation] = await db
    .insert(orgInvitations)
    .values({ orgId, invitedByUserId, email, role, token, expiresAt })
    .returning();

  // TODO: send email with invitation link (stub)
  logger.info({ email, orgId, token }, 'Invitation created — email stub');

  return invitation;
}

export async function acceptInvitation(token: string, userId: string) {
  const [invitation] = await db
    .select()
    .from(orgInvitations)
    .where(and(eq(orgInvitations.token, token), eq(orgInvitations.status, 'pending'), gt(orgInvitations.expiresAt, new Date())));

  if (!invitation) throw new NotFoundError('Invitation not found or expired');

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (user?.email !== invitation.email) {
    throw new ValidationError('This invitation is for a different email address');
  }

  await db.transaction(async (tx) => {
    await tx
      .insert(memberships)
      .values({ userId, orgId: invitation.orgId, role: invitation.role })
      .onConflictDoNothing();

    await tx
      .update(orgInvitations)
      .set({ status: 'accepted', acceptedAt: new Date() })
      .where(eq(orgInvitations.id, invitation.id));
  });

  const [org] = await db.select().from(organizations).where(eq(organizations.id, invitation.orgId));
  return { org, role: invitation.role };
}

export async function listMembers(orgId: string) {
  return db
    .select({
      id: memberships.id,
      userId: memberships.userId,
      role: memberships.role,
      joinedAt: memberships.joinedAt,
      email: users.email,
      fullName: users.fullName,
    })
    .from(memberships)
    .innerJoin(users, eq(memberships.userId, users.id))
    .where(eq(memberships.orgId, orgId));
}

export async function removeMember(orgId: string, targetUserId: string, requestingUserId: string) {
  // Prevent removing last owner
  const [ownerCount] = await db
    .select({ count: count() })
    .from(memberships)
    .where(and(eq(memberships.orgId, orgId), eq(memberships.role, 'owner')));

  const [targetMembership] = await db
    .select()
    .from(memberships)
    .where(and(eq(memberships.orgId, orgId), eq(memberships.userId, targetUserId)));

  if (!targetMembership) throw new NotFoundError('Member not found');

  if (targetMembership.role === 'owner' && Number(ownerCount.count) <= 1) {
    throw new ValidationError('Cannot remove the last owner of the organization');
  }

  await db
    .delete(memberships)
    .where(and(eq(memberships.orgId, orgId), eq(memberships.userId, targetUserId)));
}
