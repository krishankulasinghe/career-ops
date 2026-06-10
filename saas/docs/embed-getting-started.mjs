import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HTML_IN  = join(__dirname, 'getting-started.html');
const HTML_OUT = join(__dirname, 'getting-started-embedded.html');
const SS_DIR   = join(__dirname, 'screenshots');

let html = readFileSync(HTML_IN, 'utf-8');

const imgRegex = /src="screenshots\/([\w-]+\.png)"/g;
let match;
while ((match = imgRegex.exec(html)) !== null) {
  const filename = match[1];
  const filepath = join(SS_DIR, filename);
  try {
    const data = readFileSync(filepath);
    const b64  = data.toString('base64');
    html = html.replace(match[0], `src="data:image/png;base64,${b64}"`);
    console.log(`Embedded: ${filename}`);
  } catch {
    console.warn(`Missing: ${filename}`);
  }
}

writeFileSync(HTML_OUT, html, 'utf-8');
console.log(`\nSaved: ${HTML_OUT}`);
