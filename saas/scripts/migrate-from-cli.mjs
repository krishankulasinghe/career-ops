#!/usr/bin/env node
/**
 * Migrates data from the Career-Ops CLI tool to the SaaS API.
 * Usage: node scripts/migrate-from-cli.mjs [--api-key KEY] [--base-url URL]
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI_ROOT = join(__dirname, '..', '..');

const args = process.argv.slice(2);
const getArg = (flag) => {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : null;
};

const API_KEY = getArg('--api-key') || process.env.CAREER_OPS_API_KEY;
const BASE_URL = getArg('--base-url') || process.env.CAREER_OPS_API_URL || 'http://localhost:3000';

if (!API_KEY) {
  console.error('Error: API key required. Set CAREER_OPS_API_KEY env var or pass --api-key KEY');
  process.exit(1);
}

function tryReadFile(path) {
  if (existsSync(path)) {
    try {
      return readFileSync(path, 'utf-8');
    } catch {
      return null;
    }
  }
  return null;
}

async function main() {
  console.log(`Migrating from CLI at ${CLI_ROOT} to ${BASE_URL}...`);

  const payload = {};

  const applicationsMd = tryReadFile(join(CLI_ROOT, 'data', 'applications.md'));
  if (applicationsMd) {
    payload.applicationsMd = applicationsMd;
    console.log('Found applications.md');
  }

  const portalsYml = tryReadFile(join(CLI_ROOT, 'portals.yml'));
  if (portalsYml) {
    payload.portalsYml = portalsYml;
    console.log('Found portals.yml');
  }

  const profileYml = tryReadFile(join(CLI_ROOT, 'config', 'profile.yml'));
  if (profileYml) {
    payload.profileYml = profileYml;
    console.log('Found config/profile.yml');
  }

  const cvMd = tryReadFile(join(CLI_ROOT, 'cv.md'));
  if (cvMd) {
    payload.cvMd = cvMd;
    console.log('Found cv.md');
  }

  if (Object.keys(payload).length === 0) {
    console.log('No data files found to migrate.');
    process.exit(0);
  }

  const response = await fetch(`${BASE_URL}/api/v1/migration/import`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`Migration failed: ${response.status} ${text}`);
    process.exit(1);
  }

  const result = await response.json();
  const { summary } = result;

  console.log('\nMigration complete:');
  console.log(`  Applications imported: ${summary.applications}`);
  console.log(`  Portals imported: ${summary.portals}`);
  console.log(`  Reports imported: ${summary.reports}`);

  if (summary.errors.length > 0) {
    console.log(`\nErrors (${summary.errors.length}):`);
    summary.errors.forEach((e) => console.log(`  - ${e}`));
  }
}

main().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
