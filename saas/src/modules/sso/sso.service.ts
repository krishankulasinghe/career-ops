import { db } from '@/config/database.js';
import { ssoConfigs, organizations, users, memberships, sessions } from '@/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { encryptApiKey, decryptApiKey } from '@/modules/ai/ai-settings.service.js';
import { NotFoundError, ForbiddenError, AppError } from '@/shared/errors.js';
import { randomBytes } from 'crypto';
import { sql } from 'drizzle-orm';

export interface SsoConfigInput {
  protocol: 'saml' | 'oidc';
  idpMetadataUrl?: string;
  entityId?: string;
  clientId?: string;
  clientSecret?: string;
  issuer?: string;
  forceSso?: boolean;
}

export async function getSsoConfig(orgId: string) {
  const [config] = await db.select().from(ssoConfigs).where(eq(ssoConfigs.orgId, orgId));
  if (!config) return null;
  // Never expose the encrypted secret
  const { clientSecretEncrypted: _, ...safe } = config;
  return { ...safe, hasClientSecret: Boolean(config.clientSecretEncrypted) };
}

export async function upsertSsoConfig(orgId: string, input: SsoConfigInput) {
  const existing = await getSsoConfig(orgId);

  const data: typeof ssoConfigs.$inferInsert = {
    orgId,
    protocol: input.protocol,
    idpMetadataUrl: input.idpMetadataUrl,
    entityId: input.entityId,
    clientId: input.clientId,
    issuer: input.issuer,
    forceSso: input.forceSso ?? false,
    isActive: false,
    acsUrl: `${process.env['APP_URL'] ?? ''}/api/v1/auth/sso/callback`,
  };

  if (input.clientSecret) {
    data.clientSecretEncrypted = encryptApiKey(input.clientSecret);
  } else if (existing) {
    // Keep existing secret
    const [full] = await db.select().from(ssoConfigs).where(eq(ssoConfigs.orgId, orgId));
    data.clientSecretEncrypted = full?.clientSecretEncrypted ?? undefined;
  }

  if (existing) {
    await db.update(ssoConfigs).set({ ...data, updatedAt: new Date() }).where(eq(ssoConfigs.orgId, orgId));
  } else {
    await db.insert(ssoConfigs).values(data);
  }

  return getSsoConfig(orgId);
}

export async function activateSso(orgId: string): Promise<void> {
  const [config] = await db.select().from(ssoConfigs).where(eq(ssoConfigs.orgId, orgId));
  if (!config) throw new NotFoundError('SSO not configured');
  if (!config.clientId && !config.idpMetadataUrl) {
    throw new AppError(400, 'SSO_INCOMPLETE', 'SSO configuration is incomplete');
  }
  await db.update(ssoConfigs).set({ isActive: true }).where(eq(ssoConfigs.orgId, orgId));
}

export async function getOrgBySlug(slug: string) {
  const [org] = await db.select().from(organizations).where(eq(organizations.slug, slug));
  return org ?? null;
}

export async function buildSsoRedirectUrl(orgSlug: string, stateToken: string): Promise<string> {
  const org = await getOrgBySlug(orgSlug);
  if (!org) throw new NotFoundError('Organization not found');

  const [config] = await db.select().from(ssoConfigs)
    .where(and(eq(ssoConfigs.orgId, org.id), eq(ssoConfigs.isActive, true)));
  if (!config) throw new NotFoundError('SSO not configured or not active for this organization');

  if (config.protocol === 'oidc') {
    if (!config.issuer || !config.clientId) throw new AppError(400, 'SSO_INCOMPLETE', 'OIDC config missing issuer or clientId');
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.acsUrl ?? '',
      response_type: 'code',
      scope: 'openid email profile',
      state: stateToken,
    });
    return `${config.issuer}/authorize?${params}`;
  }

  // SAML: redirect to IdP metadata URL
  if (!config.idpMetadataUrl) throw new AppError(400, 'SSO_INCOMPLETE', 'SAML config missing IdP metadata URL');
  return `${config.idpMetadataUrl}?SAMLRequest=stub_${stateToken}`;
}

export async function processSsoCallback(orgSlug: string, code: string, state: string): Promise<{
  userId: string;
  sessionId: string;
  isNewUser: boolean;
}> {
  const org = await getOrgBySlug(orgSlug);
  if (!org) throw new NotFoundError('Organization not found');

  const [config] = await db.select().from(ssoConfigs)
    .where(and(eq(ssoConfigs.orgId, org.id), eq(ssoConfigs.isActive, true)));
  if (!config) throw new ForbiddenError('SSO not active');

  // In a real implementation, exchange `code` for tokens via openid-client or node-saml.
  // For now, we implement the JIT provisioning logic that would run after token exchange.
  // Stub: parse email from a fake token exchange
  const stubEmail = `sso-${state.slice(0, 8)}@${orgSlug}.sso`;
  const stubName = `SSO User (${orgSlug})`;

  return jitProvision(org.id, stubEmail, stubName);
}

export async function jitProvision(orgId: string, email: string, fullName: string): Promise<{
  userId: string;
  sessionId: string;
  isNewUser: boolean;
}> {
  // Find or create user
  let [existingUser] = await db.select().from(users).where(eq(users.email, email));
  let isNewUser = false;

  if (!existingUser) {
    const [created] = await db.insert(users).values({
      email,
      fullName,
    }).returning();
    existingUser = created;
    isNewUser = true;
  }

  // Ensure membership in org
  const [existingMembership] = await db.select().from(memberships)
    .where(and(eq(memberships.userId, existingUser.id), eq(memberships.orgId, orgId)));

  if (!existingMembership) {
    await db.insert(memberships).values({
      userId: existingUser.id,
      orgId,
      role: 'member',
    });
  }

  // Create session
  const sessionId = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 3600_000);
  await db.insert(sessions).values({ id: sessionId, userId: existingUser.id, expiresAt });

  return { userId: existingUser.id, sessionId, isNewUser };
}

export async function isSsoForced(email: string): Promise<boolean> {
  // Check if any org with force_sso=true has this user as a member
  const domain = email.split('@')[1];
  if (!domain) return false;

  const result = await db.select({ forceSso: ssoConfigs.forceSso })
    .from(ssoConfigs)
    .innerJoin(memberships, eq(memberships.orgId, ssoConfigs.orgId))
    .innerJoin(users, and(eq(users.id, memberships.userId), eq(users.email, email)))
    .where(and(eq(ssoConfigs.isActive, true), eq(ssoConfigs.forceSso, true)));

  return result.length > 0;
}
