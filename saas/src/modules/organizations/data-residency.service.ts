import { eq } from 'drizzle-orm';
import { db } from '@/config/database.js';
import { organizations } from '@/db/schema.js';
import { ForbiddenError } from '@/shared/errors.js';

export type DataResidencyRegion = 'us-east-1' | 'eu-west-1' | 'ap-southeast-1';

export const REGION_LABELS: Record<DataResidencyRegion, string> = {
  'us-east-1': 'United States (N. Virginia)',
  'eu-west-1': 'European Union (Ireland) — GDPR',
  'ap-southeast-1': 'Asia Pacific (Singapore)',
};

export const REGION_ENDPOINTS: Record<DataResidencyRegion, string> = {
  'us-east-1': 'https://us.career-ops.io',
  'eu-west-1': 'https://eu.career-ops.io',
  'ap-southeast-1': 'https://ap.career-ops.io',
};

export async function getDataResidency(orgId: string): Promise<{
  region: DataResidencyRegion;
  label: string;
  endpoint: string;
  lockedAt?: Date | null;
}> {
  const [org] = await db
    .select({ settings: organizations.settings })
    .from(organizations)
    .where(eq(organizations.id, orgId));

  const settings = (org?.settings ?? {}) as Record<string, unknown>;
  const region = (settings['data_residency_region'] as DataResidencyRegion) ?? 'us-east-1';
  const lockedAt = settings['data_residency_locked_at'] as Date | null ?? null;

  return {
    region,
    label: REGION_LABELS[region] ?? region,
    endpoint: REGION_ENDPOINTS[region] ?? REGION_ENDPOINTS['us-east-1'],
    lockedAt,
  };
}

export async function setDataResidency(
  orgId: string,
  region: DataResidencyRegion,
  plan: string,
): Promise<void> {
  // Only Team and Enterprise plans can choose data residency
  if (!['team', 'enterprise'].includes(plan)) {
    throw new ForbiddenError('Data residency selection requires Team or Enterprise plan');
  }

  const [org] = await db
    .select({ settings: organizations.settings })
    .from(organizations)
    .where(eq(organizations.id, orgId));

  const current = (org?.settings ?? {}) as Record<string, unknown>;

  // If already locked to a different region, require Enterprise to change
  if (current['data_residency_locked_at'] && current['data_residency_region'] !== region) {
    if (plan !== 'enterprise') {
      throw new ForbiddenError('Changing data residency region after lock requires Enterprise plan. Contact support.');
    }
  }

  await db
    .update(organizations)
    .set({
      settings: {
        ...current,
        data_residency_region: region,
        data_residency_locked_at: current['data_residency_region'] ? new Date() : null,
      },
    })
    .where(eq(organizations.id, orgId));
}

export function enforceDataResidency(
  orgRegion: DataResidencyRegion,
  currentRegion: string,
): void {
  if (orgRegion !== currentRegion) {
    throw new ForbiddenError(
      `This organization's data must be accessed from ${REGION_LABELS[orgRegion]} (${REGION_ENDPOINTS[orgRegion]}). ` +
      `You are currently connected to ${currentRegion}.`,
    );
  }
}
