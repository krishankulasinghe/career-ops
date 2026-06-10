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
  await page.goto(`${BASE}/login`);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: join(OUT, '00-login.png') });
  console.log('Captured: login page');
  await browser.close();
}
main().catch(console.error);
