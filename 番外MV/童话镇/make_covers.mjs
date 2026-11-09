#!/usr/bin/env node
// Two crisp, watermark-free storybook covers built from the same real light-pixel cast as the MV.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import { FB, C, T, LUT } from './src/px.js';
import { getBakedSprite } from './src/sprites_data.js';
import { GLYPHS, drawTextPx, measureTextPx } from './src/glyphs.js';
import {
  drawWhaleHero,
  drawMapWhaleHero,
  drawPaperBoat,
  drawCastSprite,
  drawFlyingGptDragon,
  drawGptDragonBoss,
  drawStoryEmblem,
} from './src/cast.js';
import { drawRpgWindow } from './src/ui.js';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(HERE, '封面');

function canvasLib() {
  const candidates = [
    '@napi-rs/canvas',
    '/tmp/node_render/node_modules/@napi-rs/canvas',
    path.join(HERE, '../../node_modules/@napi-rs/canvas'),
  ];
  for (const candidate of candidates) {
    try { return require(candidate); } catch { /* try the next cache */ }
  }
  const work = '/tmp/node_render';
  fs.mkdirSync(work, { recursive: true });
  require('node:child_process').execFileSync('npm', [
    'install', '--prefix', work, '--no-audit', '--no-fund', '--loglevel=error', '@napi-rs/canvas',
  ], { stdio: 'inherit' });
  return require('/tmp/node_render/node_modules/@napi-rs/canvas');
}

const { createCanvas, ImageData } = canvasLib();

function fbCanvas(fb, lut = LUT.full, scale = 3) {
  const raw = new Uint8ClampedArray(fb.hw * fb.hh * 4);
  const u32 = new Uint32Array(raw.buffer);
  for (let hy = 0; hy < fb.hh; hy++) {
    const ly = hy >> 1;
    const hr = hy * fb.hw;
    const lr = ly * fb.w;
    for (let hx = 0; hx < fb.hw; hx++) {
      const hi = fb.hi[hr + hx];
      const idx = hi !== T ? hi : fb.d[lr + (hx >> 1)];
      u32[hr + hx] = lut[idx];
    }
  }
  const native = createCanvas(fb.hw, fb.hh);
  native.getContext('2d').putImageData(new ImageData(raw, fb.hw, fb.hh), 0, 0);
  const output = createCanvas(fb.hw * scale, fb.hh * scale);
  const ctx = output.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(native, 0, 0, output.width, output.height);
  return output;
}

function sky(fb, night = false) {
  fb.gradV(0, 0, fb.w, fb.h, night ? [C.ink, C.navy, C.dslate] : [C.plum, C.rose, C.orange, C.gold]);
  if (night) {
    for (let i = 0; i < 56; i++) {
      const x = (i * 83 + 17) % fb.w, y = 6 + (i * 41 % Math.floor(fb.h * 0.57));
      fb.px(x, y, i % 4 === 0 ? C.uiW : C.goldL);
    }
  } else {
    fb.disc(fb.w - 33, 28, 13, C.goldL);
    fb.disc(fb.w - 36, 25, 5, C.uiW);
    for (let i = 0; i < 3; i++) {
      const x = 38 + i * Math.floor(fb.w / 3), y = 29 + (i % 2) * 8;
      fb.ellipse(x, y, 16, 4, C.white); fb.ellipse(x - 7, y + 2, 9, 3, C.silver);
    }
  }
  fb.tri(-5, fb.h * 0.62, fb.w * 0.33, fb.h * 0.33, fb.w * 0.59, fb.h * 0.63, C.slate);
  fb.tri(fb.w * 0.42, fb.h * 0.63, fb.w * 0.76, fb.h * 0.36, fb.w + 8, fb.h * 0.66, C.dslate);
  fb.gradV(0, Math.floor(fb.h * 0.68), fb.w, Math.ceil(fb.h * 0.32), [C.lime, C.green, C.dgreen]);
}

function rainbowRiver(fb, t, baseY) {
  fb.gradV(0, baseY - 4, fb.w, fb.h - baseY + 4, [C.blue, C.cyan, C.navy]);
  for (let x = 0; x < fb.w; x++) {
    const cy = baseY + Math.sin(x * 0.035 + t) * 4;
    for (let d = -12; d <= 12; d++) {
      const y = Math.round(cy + d);
      if (y < 0 || y >= fb.h) continue;
      const band = Math.max(0, Math.min(7, Math.floor((d + 12) / 3)));
      fb.px(x, y, [C.scarf, C.orange, C.gold, C.lime, C.cyan, C.blue, C.lavender, C.pink][band]);
    }
  }
}

function distantCastle(fb, x, baseY, scale = 1) {
  fb.rect(x - 30 * scale, baseY - 34 * scale, 60 * scale, 34 * scale, C.white);
  fb.box(x - 30 * scale, baseY - 34 * scale, 60 * scale, 34 * scale, C.ink);
  for (let i = 0; i < 3; i++) {
    const tx = x - 25 * scale + i * 23 * scale, th = (i === 1 ? 65 : 47) * scale, tw = 15 * scale;
    fb.rect(tx, baseY - th, tw, th, i === 1 ? C.white : C.silver);
    fb.box(tx, baseY - th, tw, th, C.ink);
    fb.tri(tx - 3 * scale, baseY - th, tx + tw + 3 * scale, baseY - th, tx + tw / 2, baseY - th - 18 * scale, i === 1 ? C.scarf : C.blue);
    fb.rect(tx + 5 * scale, baseY - th + 12 * scale, 4 * scale, 8 * scale, C.goldL);
  }
  fb.rect(x - 6 * scale, baseY - 18 * scale, 12 * scale, 18 * scale, C.dbrown);
}

function coverText(fb, text, y, size, color = C.goldL) {
  for (const ch of text) {
    if (!GLYPHS[String(size)]?.[ch]) throw new Error(`Unbaked cover glyph: ${ch} (${size}px)`);
  }
  const width = measureTextPx(text, size, 1);
  const x = Math.round((fb.w - width) / 2);
  const x0 = x, x1 = x + width;
  if (x0 < 6 || x1 > fb.w - 6 || y < 4 || y + size > fb.h - 4) {
    throw new Error(`Cover text outside safe area: ${text}`);
  }
  drawTextPx(fb, x, y, text, { size, color, outline: C.ink, tracking: 1 });
  return { text, x0: x0 * 6, y0: y * 6, x1: x1 * 6, y1: (y + size + 1) * 6 };
}

function addBorder(fb) {
  fb.box(3, 3, fb.w - 6, fb.h - 6, C.gold);
  fb.box(6, 6, fb.w - 12, fb.h - 12, C.scarfD);
  for (let i = 0; i < 4; i++) {
    const x = i % 2 ? fb.w - 11 : 10, y = i < 2 ? 10 : fb.h - 11;
    fb.disc(x, y, 2.5, C.goldL);
  }
}

function portraitCover() {
  const fb = new FB(180, 240);
  sky(fb, true);
  // Large castle and the fairytale river establish the song's setting.
  distantCastle(fb, 142, 152, 0.68);
  rainbowRiver(fb, 1.1, 164);
  drawRpgWindow(fb, 13, 14, 154, 49, { skin: 'dark' });
  const title = coverText(fb, '《童话镇》', 20, 12, C.goldL);
  coverText(fb, '总有一条蜿蜒在', 40, 8, C.uiW);
  coverText(fb, '童话镇里七彩的河', 51, 8, C.cyan);

  // Clear character silhouette hierarchy: Whale-girl leads the boat, Claude is the only Princess, GPT flies above.
  drawPaperBoat(fb, 74, 173, 1.1, { scale: 1.0, withWhale: false, chibiWhale: false, facing: 1, reflection: false });
  drawWhaleHero(fb, 65, 204, 1.1, { pose: 'happy', facing: 1, scale: 2, lantern: true, scarfLen: 18 });
  drawCastSprite(fb, 125, 210, 'claude', 1.1, { pose: 'cheer', role: 'princess', facing: -1 });
  drawCastSprite(fb, 151, 209, 'doubao', 1.1, { pose: 'cheer', role: 'redhood', facing: -1 });
  drawFlyingGptDragon(fb, 136, 84, 1.1, -1);
  for (let i = 0; i < 6; i++) drawStoryEmblem(fb, 25 + i * 26, 226, i);
  addBorder(fb);
  return { canvas: fbCanvas(fb, LUT.full, 3), record: { ratio: '3:4', texts: [title] } };
}

function landscapeCover() {
  const fb = new FB(240, 180);
  sky(fb, false);
  distantCastle(fb, 180, 129, 0.63);
  rainbowRiver(fb, 2.8, 137);
  // Stalls and a flowering bridge deepen the scene without crowding the title.
  for (let i = 0; i < 3; i++) {
    const x = 24 + i * 69;
    fb.rect(x, 94, 39, 34, i === 1 ? C.plum : C.parchment);
    fb.box(x, 94, 39, 34, C.dbrown);
    fb.tri(x - 4, 95, x + 43, 95, x + 19, 76, [C.scarf, C.blue, C.pink][i]);
    for (let j = 0; j < 3; j++) fb.rect(x + 5 + j * 10, 104, 6, 8, [C.goldL, C.cyan, C.lime][(i + j) % 3]);
  }
  fb.line(163, 131, 185, 109, C.dbrown, 4); fb.line(185, 109, 207, 131, C.dbrown, 4);
  fb.hline(159, 211, 132, C.gold);
  for (let x = 164; x < 211; x += 8) fb.vline(x, 125, 131, C.dbrown);

  drawRpgWindow(fb, 30, 10, 180, 45, { skin: 'dark' });
  const title = coverText(fb, '《童话镇》', 16, 12, C.goldL);
  coverText(fb, '让所有很久很久以前', 36, 8, C.uiW);

  drawPaperBoat(fb, 82, 141, 2.1, { scale: 0.88, withWhale: false, chibiWhale: true, facing: 1, reflection: false });
  drawWhaleHero(fb, 93, 153, 2.1, { pose: 'happy', facing: 1, scale: 2, lantern: true, scarfLen: 18 });
  drawCastSprite(fb, 33, 153, 'doubao', 2.1, { pose: 'cheer', role: 'redhood', facing: 1 });
  drawCastSprite(fb, 141, 152, 'claude', 2.1, { pose: 'cheer', role: 'princess', facing: -1 });
  drawCastSprite(fb, 178, 151, 'gemini', 2.1, { pose: 'cheer', role: 'alice', facing: 1 });
  drawCastSprite(fb, 219, 150, 'kimi', 2.1, { pose: 'cheer', role: 'sage', facing: -1 });
  drawFlyingGptDragon(fb, 211, 69, 2.1, -1);
  for (let i = 0; i < 6; i++) drawStoryEmblem(fb, 28 + i * 37, 171, i);
  addBorder(fb);
  return { canvas: fbCanvas(fb, LUT.full, 3), record: { ratio: '4:3', texts: [title] } };
}

function sha256(file) {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function writeCover(result, file, expectedWidth, expectedHeight) {
  fs.writeFileSync(file, result.canvas.toBuffer('image/png'));
  if (result.canvas.width !== expectedWidth || result.canvas.height !== expectedHeight) {
    throw new Error(`Unexpected cover dimensions: ${result.canvas.width}×${result.canvas.height}`);
  }
  return {
    file: path.relative(HERE, file),
    width: result.canvas.width,
    height: result.canvas.height,
    ratio: result.record.ratio,
    watermark: false,
    persistentCornerBadge: false,
    progressBar: false,
    arabicNumeralsInArtwork: false,
    textSafe: true,
    texts: result.record.texts,
    sha256: sha256(file),
  };
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const reports = [
  writeCover(portraitCover(), path.join(OUT_DIR, '童话镇MV_封面_3比4.png'), 1080, 1440),
  writeCover(landscapeCover(), path.join(OUT_DIR, '童话镇MV_封面_4比3.png'), 1440, 1080),
];
fs.writeFileSync(path.join(OUT_DIR, '封面_验收.json'), `${JSON.stringify({ project: '童话镇', covers: reports }, null, 2)}\n`, 'utf8');
for (const r of reports) console.log(`${r.ratio} ${r.width}×${r.height} ${r.file} sha256=${r.sha256}`);
