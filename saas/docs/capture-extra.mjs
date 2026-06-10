import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, 'screenshots');
mkdirSync(OUT, { recursive: true });

const BASE = 'http://localhost:5173';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 800 } });
  const page    = await context.newPage();

  // Login
  await context.request.post(`${BASE}/api/v1/auth/login`, {
    data: { email: 'demo@example.com', password: 'demo1234' },
    headers: { 'Content-Type': 'application/json' },
  });
  await page.goto(BASE);
  await page.waitForTimeout(1000);

  // Profile – Target Roles tab
  await page.goto(`${BASE}/profile`);
  await page.waitForTimeout(1000);
  await page.click('text=Target Roles');
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(OUT, '10b-profile-target-roles.png') });
  console.log('Captured: profile target roles tab');

  // New Evaluation – clean state
  await page.goto(`${BASE}/evaluations/new`);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: join(OUT, '03-new-evaluation.png') });
  console.log('Captured: new evaluation');

  await browser.close();
}
main().catch(console.error);
