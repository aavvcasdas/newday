#!/usr/bin/env node
// bake_glyphs.mjs — Scan all characters in <mv_dir>/src/**/*.js and bake any missing 8px/10px/12px
// Fusion Pixel Monospaced Simplified-Chinese bitmap glyphs into <mv_dir>/src/glyphs.js.
// Usage: node .claude/skills/pixel-mv-remake/scripts/bake_glyphs.mjs "番外MV/童话镇"

import fs from 'fs';
import path from 'path';
import http from 'http';
import { execSync } from 'child_process';
import { pathToFileURL } from 'url';

const mvArg = process.argv[2];
if (!mvArg) {
  console.error('Usage: node bake_glyphs.mjs <mv_dir>');
  process.exit(1);
}

const mvDir = path.resolve(mvArg);
const srcDir = path.join(mvDir, 'src');
const glyphsPath = path.join(srcDir, 'glyphs.js');
if (!fs.existsSync(glyphsPath)) {
  console.error(`glyphs.js not found at ${glyphsPath}`);
  process.exit(1);
}

const LEMO_DIR = process.env.LEMO_OPUSCAR || '/home/user/lemo-opuscar';
const CHROME = process.env.PLAYWRIGHT_CHROME || '/home/user/bin/chrome-headless-shell';
process.env.LD_LIBRARY_PATH = `/home/user/bin/libs/lib:/home/user/bin/libs:/home/user/bin:${process.env.LD_LIBRARY_PATH || ''}`;

// 1. Load existing GLYPHS table
const { GLYPHS } = await import(pathToFileURL(glyphsPath).href + `?t=${Date.now()}`);

// 2. Collect every non-control character across src/*.js + make_covers.mjs if present
const filesToScan = fs.readdirSync(srcDir)
  .filter((f) => f.endsWith('.js') && f !== 'glyphs.js' && f !== 'sprites_data.js')
  .map((f) => path.join(srcDir, f));

const allChars = new Set();
for (const fp of filesToScan) {
  const txt = fs.readFileSync(fp, 'utf8');
  for (const ch of txt) {
    const cp = ch.codePointAt(0);
    if (cp >= 0x20 && cp !== 0x7f && cp <= 0xffff) {
      // Skip pure JS syntax ASCII already present, keep anything missing in any size
      if (!GLYPHS['8'][ch] || !GLYPHS['10'][ch] || !GLYPHS['12'][ch]) {
        allChars.add(ch);
      }
    }
  }
}

if (allChars.size === 0) {
  console.log('[bake_glyphs] 100% character coverage already satisfied in glyphs.js (0 missing chars).');
  process.exit(0);
}

const missingList = [...allChars];
console.log(`[bake_glyphs] Found ${missingList.length} characters to bake: ${missingList.join('')}`);

// 3. Ensure @fontsource/fusion-pixel-{8,10,12}px-monospaced-sc is cached in /tmp/fusion_pixel_cache
const fontCache = '/tmp/fusion_pixel_cache';
if (!fs.existsSync(path.join(fontCache, 'node_modules/@fontsource/fusion-pixel-12px-monospaced-sc'))) {
  console.log('[bake_glyphs] Installing @fontsource/fusion-pixel-{8,10,12}px-monospaced-sc into /tmp/fusion_pixel_cache...');
  fs.mkdirSync(fontCache, { recursive: true });
  execSync('npm init -y >/dev/null && npm install --no-audit --no-fund --loglevel=error @fontsource/fusion-pixel-8px-monospaced-sc @fontsource/fusion-pixel-10px-monospaced-sc @fontsource/fusion-pixel-12px-monospaced-sc', {
    cwd: fontCache,
    stdio: 'inherit',
  });
}

// 4. Spin up tiny local HTTP server serving /tmp/fusion_pixel_cache/node_modules/@fontsource
const fontRoot = path.join(fontCache, 'node_modules/@fontsource');
const server = http.createServer((req, res) => {
  const u = decodeURIComponent((req.url || '/').split('?')[0]);
  if (u === '/bake.html') {
    const cssLinks = [8, 10, 12]
      .map((sz) => `<link rel="stylesheet" href="/fusion-pixel-${sz}px-monospaced-sc/index.css">`)
      .join('\n');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!doctype html><meta charset="utf-8">${cssLinks}<body></body>`);
    return;
  }
  const fp = path.join(fontRoot, u);
  if (fp.startsWith(fontRoot) && fs.existsSync(fp) && fs.statSync(fp).isFile()) {
    const ext = path.extname(fp);
    const ct = ext === '.css' ? 'text/css' : ext === '.woff2' ? 'font/woff2' : 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': ct });
    res.end(fs.readFileSync(fp));
    return;
  }
  res.writeHead(404);
  res.end('not found');
});

await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const pwPath = path.join(LEMO_DIR, 'node_modules/playwright-core/index.mjs');
const { chromium } = await import(pathToFileURL(pwPath).href);
const browser = await chromium.launch({
  executablePath: CHROME,
  args: ['--no-sandbox', '--font-render-hinting=none'],
});
const page = await browser.newPage();
await page.goto(`http://127.0.0.1:${port}/bake.html`, { waitUntil: 'networkidle' });

const baked = await page.evaluate(async (chars) => {
  const out = { 8: {}, 10: {}, 12: {} };
  for (const sz of [8, 10, 12]) {
    const fam = `'Fusion Pixel ${sz}px Monospaced SC'`;
    // Trigger subset loads for every character
    await Promise.all(chars.map((ch) => document.fonts.load(`${sz}px ${fam}`, ch)));
    await document.fonts.ready;

    const cv = document.createElement('canvas');
    cv.width = sz * 2;
    cv.height = sz * 2;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingEnabled = false;

    for (const ch of chars) {
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.fillStyle = '#ffffff';
      ctx.font = `${sz}px ${fam}`;
      ctx.textBaseline = 'top';
      ctx.fillText(ch, 0, 0);
      const img = ctx.getImageData(0, 0, sz, sz).data;
      const rows = [];
      let nonZero = 0;
      let maxX = 0;
      for (let y = 0; y < sz; y++) {
        let bits = 0;
        for (let x = 0; x < sz; x++) {
          const a = img[(y * sz + x) * 4 + 3];
          if (a >= 110) {
            bits |= (1 << x);
            nonZero++;
            if (x + 1 > maxX) maxX = x + 1;
          }
        }
        rows.push(bits);
      }
      const isAscii = ch.codePointAt(0) < 0x80;
      const adv = isAscii ? Math.max(4, Math.min(sz, maxX + 1)) : sz;
      out[sz][ch] = { entry: [adv, rows], nonZero };
    }
  }
  return out;
}, missingList);

await browser.close();
server.close();

let addedCount = 0;
for (const sz of ['8', '10', '12']) {
  for (const ch of missingList) {
    if (!GLYPHS[sz][ch]) {
      const item = baked[sz][ch];
      if (item && item.nonZero > 0) {
        GLYPHS[sz][ch] = item.entry;
        addedCount++;
      } else if (ch.trim() === '') {
        GLYPHS[sz][ch] = [Number(sz) >> 1, new Array(Number(sz)).fill(0)];
      }
    }
  }
}

// Rewrite src/glyphs.js preserving measureTextPx & drawTextPx functions cleanly
const origSrc = fs.readFileSync(glyphsPath, 'utf8');
const fnIdx = origSrc.indexOf('export function measureTextPx');
if (fnIdx < 0) {
  throw new Error('Unexpected glyphs.js layout: missing export function measureTextPx');
}
const header = '// glyphs.js — Pre-rasterized 1-bit integer pixel glyphs (8px / 10px / 12px) from Fusion Pixel Font (OFL-1.1, see fonts/LICENSE.font.txt)\n';
const newSrc = `${header}export const GLYPHS = ${JSON.stringify(GLYPHS)};\n\n${origSrc.slice(fnIdx)}`;
fs.writeFileSync(glyphsPath, newSrc, 'utf8');
console.log(`[bake_glyphs] Successfully baked ${addedCount} size-glyph entries into ${glyphsPath}!`);
