import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import { db } from '@/config/database.js';
import {
  users,
  organizations,
  memberships,
  profiles,
  cvTemplates,
  promptTemplates,
} from '@/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { logger } from '@/shared/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..', '..'); // career-ops root

function readFile(relativePath: string): string {
  try {
    return readFileSync(join(ROOT, relativePath), 'utf-8');
  } catch {
    logger.warn({ path: relativePath }, 'Seed file not found, skipping');
    return '';
  }
}

async function seedCvTemplates() {
  logger.info('Seeding CV templates...');

  const htmlTemplate = readFile('templates/cv-template.html');
  const texTemplate = readFile('templates/cv-template.tex');

  if (htmlTemplate) {
    const existing = await db
      .select()
      .from(cvTemplates)
      .where(and(eq(cvTemplates.name, 'Default HTML'), eq(cvTemplates.isDefault, true)))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(cvTemplates).values({
        name: 'Default HTML',
        contentHtml: htmlTemplate,
        contentTex: texTemplate || null,
        isDefault: true,
        orgId: null,
      });
      logger.info('Seeded default HTML CV template');
    } else {
      logger.info('Default HTML template already exists, skipping');
    }
  }
}

async function seedPromptTemplates() {
  logger.info('Seeding prompt templates...');

  const promptFiles: Array<{ name: string; path: string; language: string }> = [
    { name: 'shared', path: 'modes/_shared.md', language: 'en' },
    { name: 'evaluation', path: 'modes/oferta.md', language: 'en' },
    { name: 'shared', path: 'modes/de/_shared.md', language: 'de' },
    { name: 'evaluation', path: 'modes/de/angebot.md', language: 'de' },
    { name: 'shared', path: 'modes/fr/_shared.md', language: 'fr' },
    { name: 'evaluation', path: 'modes/fr/offre.md', language: 'fr' },
    { name: 'shared', path: 'modes/ja/_shared.md', language: 'ja' },
    { name: 'evaluation', path: 'modes/ja/kyujin.md', language: 'ja' },
  ];

  for (const { name, path, language } of promptFiles) {
    const content = readFile(path);
    if (!content) continue;

    const existing = await db
      .select()
      .from(promptTemplates)
      .where(
        and(
          eq(promptTemplates.name, name),
          eq(promptTemplates.language, language),
          eq(promptTemplates.isActive, true),
        ),
      )
      .limit(1);

    if (existing.length === 0) {
      await db.insert(promptTemplates).values({
        name,
        language,
        content,
        version: 1,
        isActive: true,
        orgId: null,
      });
      logger.info({ name, language }, 'Seeded prompt template');
    } else {
      logger.info({ name, language }, 'Prompt template already exists, skipping');
    }
  }
}

async function seedDemoOrg() {
  logger.info('Seeding demo org...');

  const demoEmail = process.env.DEMO_USER_EMAIL ?? 'demo@example.com';
  const demoPassword = process.env.DEMO_USER_PASSWORD ?? 'demo1234';
  const demoName = 'Demo User';
  const orgSlug = 'career-ops-demo';

  // Check if demo user already exists
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, demoEmail))
    .limit(1);

  if (existingUser.length > 0) {
    logger.info('Demo user already exists, skipping');
    return;
  }

  const passwordHash = await bcrypt.hash(demoPassword, 10);

  const [user] = await db
    .insert(users)
    .values({
      email: demoEmail,
      passwordHash,
      fullName: demoName,
      role: 'user',
    })
    .returning();

  const [org] = await db
    .insert(organizations)
    .values({
      name: 'Career-Ops Demo',
      slug: orgSlug,
      plan: 'pro',
      maxMembers: 5,
      maxEvaluationsMo: 100,
      maxScansMo: 50,
    })
    .returning();

  await db.insert(memberships).values({
    userId: user.id,
    orgId: org.id,
    role: 'owner',
  });

  await db.insert(profiles).values({
    userId: user.id,
    orgId: org.id,
    fullName: demoName,
    emailContact: demoEmail,
    location: 'Remote',
    targetRoles: [
      { title: 'Senior Software Engineer', fit: 'primary' },
      { title: 'Staff Engineer', fit: 'secondary' },
    ],
    compensation: {
      currency: 'USD',
      min: 150000,
      max: 200000,
    },
    narrative: {
      headline: 'Senior software engineer with full-stack expertise',
      superpowers: ['System design', 'Team leadership', 'Performance optimization'],
    },
    archetypes: [
      { name: 'IC Technical', description: 'Individual contributor, deep technical focus' },
      { name: 'Tech Lead', description: 'Technical leadership with team impact' },
    ],
    customConfig: {},
  });

  logger.info({ email: demoEmail, orgSlug }, 'Seeded demo org and user');
}

async function main() {
  logger.info('Starting seed...');

  await seedCvTemplates();
  await seedPromptTemplates();
  await seedDemoOrg();

  logger.info('Seed complete');
  process.exit(0);
}

main().catch((err) => {
  logger.error({ err }, 'Seed failed');
  process.exit(1);
});
