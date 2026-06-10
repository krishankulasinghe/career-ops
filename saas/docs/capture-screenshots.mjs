// Run: node saas/docs/capture-screenshots.mjs
// Requires: playwright installed in saas/ (npm install playwright)
// The app must be running at localhost:5173 with a logged-in session

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, 'screenshots');
mkdirSync(OUT_DIR, { recursive: true });

const BASE = 'http://localhost:5173';

const PAGES = [
  { name: '01-dashboard',          path: '/' },
  { name: '02-applications',       path: '/applications' },
  { name: '03-new-evaluation',     path: '/evaluations/new' },
  { name: '04-pipeline',           path: '/pipeline' },
  { name: '05-portals',            path: '/portals' },
  { name: '06-scanner',            path: '/scanner' },
  { name: '07-analytics',          path: '/analytics' },
  { name: '08-team',               path: '/team' },
  { name: '09-audit-log',          path: '/audit' },
  { name: '10-profile',            path: '/profile' },
  { name: '11-settings',           path: '/settings' },
  { name: '12-ai-settings',        path: '/settings/ai' },
  { name: '13-ai-costs',           path: '/admin/ai-costs' },
  { name: '14-prompts',            path: '/settings/prompts' },
  { name: '15-ai-insights',        path: '/admin/insights' },
  { name: '16-sso',                path: '/settings/sso' },
  { name: '17-eval-modes',         path: '/settings/evaluation-modes' },
  { name: '18-webhooks',           path: '/settings/webhooks' },
  { name: '19-interview-prep',     path: '/interview-prep' },
  { name: '20-branding',           path: '/settings/branding' },
  { name: '21-api-analytics',      path: '/api-keys/analytics' },
];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 800 } });
  const page = await context.newPage();

  // Login via API using Playwright request context
  const loginRes = await context.request.post(`${BASE}/api/v1/auth/login`, {
    data: { email: 'demo@example.com', password: 'demo1234' },
    headers: { 'Content-Type': 'application/json' },
  });
  console.log('Login status:', loginRes.status());
  await page.goto(BASE);
  await page.waitForTimeout(1000);

  for (const { name, path } of PAGES) {
    await page.goto(`${BASE}${path}`);
    await page.waitForTimeout(1500);
    const file = join(OUT_DIR, `${name}.png`);
    await page.screenshot({ path: file, fullPage: false });
    console.log(`Captured: ${name}`);
  }

  await browser.close();
  console.log(`\nAll screenshots saved to: ${OUT_DIR}`);
}

main().catch(console.error);
