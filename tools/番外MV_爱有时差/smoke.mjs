// Preview smoke: load the player, render 8 representative shots, collect page errors.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './server.mjs';
import { launchBrowser } from './browser.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const timeline = JSON.parse(fs.readFileSync(path.join(HERE, 'data/timeline.json'), 'utf8'));
const times = [0, 2, 4, 6, 8, 10, 12, 15].map(i => i === 0 ? 2.2 : (timeline.cues[i].start + timeline.cues[i].end) / 2);
const { server, url } = await startServer({ port: 0 });
const browser = await launchBrowser();
const errors = [];
const shots = [];
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('pageerror', e => errors.push(String(e.message || e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`${url}/`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__mv && window.__mv.ready, null, { timeout: 120000 });
  const renderer = await page.evaluate(() => window.__mv.renderer);
  for (const t of times) shots.push(await page.evaluate(time => window.__mv.renderAt(time), t));
  const report = { ok: errors.length === 0, renderer, shots: shots.map(s => s.shot), times, errors };
  fs.writeFileSync(path.join(ROOT, '番外MV/smoke.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
  process.exitCode = report.ok ? 0 : 2;
} finally {
  await browser.close();
  server.close();
}
