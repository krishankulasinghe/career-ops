import { eq, and } from 'drizzle-orm';
import { db } from '@/config/database.js';
import { applications, portals, profiles, cvs } from '@/db/schema.js';
import { roleFuzzyMatch } from '@/shared/text-utils.js';
import { logger } from '@/shared/logger.js';

export interface MigrationInput {
  applicationsMd?: string;
  portalsYml?: string;
  profileYml?: string;
  cvMd?: string;
}

export interface MigrationSummary {
  applications: number;
  portals: number;
  reports: number;
  errors: string[];
}

const VALID_STATUSES = new Set([
  'Evaluated', 'Applied', 'Responded', 'Interview',
  'Offer', 'Rejected', 'Discarded', 'SKIP',
]);

export async function importFromCli(
  input: MigrationInput,
  userId: string,
  orgId: string,
): Promise<MigrationSummary> {
  const summary: MigrationSummary = { applications: 0, portals: 0, reports: 0, errors: [] };

  if (input.applicationsMd) {
    try {
      const appCount = await importApplications(input.applicationsMd, userId, orgId);
      summary.applications = appCount;
    } catch (err) {
      summary.errors.push(`Applications import failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (input.portalsYml) {
    try {
      const portalCount = await importPortals(input.portalsYml, orgId);
      summary.portals = portalCount;
    } catch (err) {
      summary.errors.push(`Portals import failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (input.cvMd) {
    try {
      await importCv(input.cvMd, userId, orgId);
    } catch (err) {
      summary.errors.push(`CV import failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return summary;
}

async function importApplications(markdown: string, userId: string, orgId: string): Promise<number> {
  const lines = markdown.split('\n');
  let created = 0;

  // Get existing applications for fuzzy dedup
  const existing = await db
    .select({ company: applications.company, role: applications.role })
    .from(applications)
    .where(and(eq(applications.userId, userId), eq(applications.orgId, orgId)));

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|') || trimmed.startsWith('| #') || trimmed.startsWith('|---')) continue;

    const cols = trimmed.split('|').map((c) => c.trim()).filter(Boolean);
    if (cols.length < 4) continue;

    try {
      const [seqStr, dateStr, company, role, ...rest] = cols;
      if (!seqStr || !company || !role) continue;

      const seq = parseInt(seqStr, 10);
      if (isNaN(seq)) continue;

      const date = dateStr?.match(/^\d{4}-\d{2}-\d{2}$/) ? dateStr : new Date().toISOString().split('T')[0];

      let score: string | undefined;
      let status = 'Evaluated';

      for (const col of rest) {
        const scoreMatch = col.match(/^(\d+\.\d+)\/5$/);
        if (scoreMatch) score = scoreMatch[1];
        if (VALID_STATUSES.has(col)) status = col;
      }

      // Fuzzy dedup check
      const isDuplicate = existing.some(
        (e) => e.company.toLowerCase() === company.toLowerCase() && roleFuzzyMatch(e.role, role),
      );
      if (isDuplicate) continue;

      // Get next seq number
      const allApps = await db
        .select({ seqNumber: applications.seqNumber })
        .from(applications)
        .where(and(eq(applications.userId, userId), eq(applications.orgId, orgId)))
        .orderBy(applications.seqNumber);

      const nextSeq = allApps.length > 0 ? allApps[allApps.length - 1].seqNumber + 1 : 1;

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

      existing.push({ company, role });
      created++;
    } catch (err) {
      logger.warn({ err, line }, 'Failed to import application row');
    }
  }

  return created;
}

async function importPortals(yamlContent: string, orgId: string): Promise<number> {
  // Simple YAML parser for portals - parse key: value format
  // We expect structure like:
  // companies:
  //   - name: Company
  //     careers_url: https://...
  let created = 0;
  const lines = yamlContent.split('\n');
  let current: Record<string, string> = {};

  for (const line of lines) {
    const nameMatch = line.match(/^\s+-?\s+name:\s+(.+)$/);
    const urlMatch = line.match(/^\s+careers_url:\s+(.+)$/);

    if (nameMatch) {
      if (current.name && current.careers_url) {
        await upsertPortal(current, orgId);
        created++;
      }
      current = { name: nameMatch[1].trim() };
    } else if (urlMatch && current.name) {
      current.careers_url = urlMatch[1].trim();
    }
  }

  // Handle last entry
  if (current.name && current.careers_url) {
    await upsertPortal(current, orgId);
    created++;
  }

  return created;
}

async function upsertPortal(data: Record<string, string>, orgId: string): Promise<void> {
  const existing = await db
    .select()
    .from(portals)
    .where(and(eq(portals.orgId, orgId), eq(portals.careersUrl, data.careers_url!)))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(portals).values({
      orgId,
      name: data.name!,
      careersUrl: data.careers_url,
      enabled: true,
    });
  }
}

async function importCv(markdown: string, userId: string, orgId: string): Promise<void> {
  const existing = await db
    .select()
    .from(cvs)
    .where(and(eq(cvs.userId, userId), eq(cvs.isPrimary, true)))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(cvs).values({
      userId,
      orgId,
      name: 'Imported CV',
      contentMd: markdown,
      isPrimary: true,
      version: 1,
    });
  } else {
    await db
      .update(cvs)
      .set({ contentMd: markdown, updatedAt: new Date() })
      .where(eq(cvs.id, existing[0].id));
  }
}
