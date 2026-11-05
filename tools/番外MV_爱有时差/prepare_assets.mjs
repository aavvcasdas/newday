// Generate MV standee sprites from the project's existing rigs only.
// No new faces, accessories, or generative edits are introduced here.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const OUT = path.join(HERE, 'assets/sprites');
fs.mkdirSync(OUT, { recursive: true });

GlobalFonts.registerFromPath(path.join(ROOT, 'video-fx/assets/fonts/NotoSansSC-Bold.ttf'), 'Noto Sans SC');
GlobalFonts.registerFromPath(path.join(ROOT, 'video-fx/assets/fonts/ZCOOLKuaiLe-Regular.ttf'), 'ZCOOL KuaiLe');
GlobalFonts.registerFromPath(path.join(ROOT, 'video-fx/assets/fonts/Silkscreen-Regular.ttf'), 'Silkscreen');

globalThis.window = globalThis;
require(path.join(ROOT, 'video-fx/src/core.js'));
require(path.join(ROOT, 'video-fx/src/whale_girl_rig_data.js'));
require(path.join(ROOT, 'video-fx/src/whale_girl_actions.js'));
require(path.join(ROOT, 'video-fx/src/whale_girl.js'));
require(path.join(ROOT, 'video-fx/src/clawd.js'));
const CAST = require(path.join(ROOT, 'video-fx/src/cast.js'));
const CORE = globalThis.CORE;
CORE.setActiveStyle('pixel');

function trim(canvas) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const data = ctx.getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (data[(y * w + x) * 4 + 3] > 8) {
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) throw new Error('empty sprite');
  const pad = 10;
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad);
  x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad);
  const out = createCanvas(x1 - x0 + 1, y1 - y0 + 1);
  out.getContext('2d').drawImage(canvas, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}

function save(name, canvas) {
  const t = trim(canvas);
  fs.writeFileSync(path.join(OUT, `${name}.png`), t.toBuffer('image/png'));
  return { file: `assets/sprites/${name}.png`, width: t.width, height: t.height };
}

function drawWhale(opts = {}) {
  const c = createCanvas(760, 860), ctx = c.getContext('2d');
  CAST.whaleGirl(ctx, 380, 780, 62, {
    t: 0.7, dy: 0, style: 'pixel', constructMode: 'pixelRig', transitionBlend: 1,
    eyes: 'open', mouth: 'smile', squint: 0.01, hat: 'maid', tailScale: 1,
    noShadow: true, poseMode: 'wave', ...opts,
  });
  return c;
}

const manifest = { generatedFrom: 'video-fx/src/cast.js + whale_girl.js; assets/ai-girls/doubao/doubao-cutout.png', sprites: {} };
manifest.sprites.whale = save('whale', drawWhale());
manifest.sprites.whale_worry = save('whale_worry', drawWhale({ poseMode: 'panic', mouth: 'flat', headTilt: -0.06 }));
manifest.sprites.whale_think = save('whale_think', drawWhale({ headTilt: 0.12, aL: 0.8, aR: -0.2 }));
manifest.sprites.whale_cheer = save('whale_cheer', drawWhale({ aL: 1.15, aR: 1.15, mouth: 'openSmile' }));
manifest.sprites.whale_walk = [];
for (let i = 0; i < 8; i++) {
  const phase = 0.05 + i * (Math.PI * 2 / 4.2 / 8);
  manifest.sprites.whale_walk.push(save(`whale_walk_${i}`, drawWhale({ t: phase, walk: phase })));
}

for (const id of ['claude', 'gemini', 'researcher', 'clawd', 'agentReachBot', 'bionicPuppy', 'miniWhale', 'biliTvMascot']) {
  const c = createCanvas(760, 860), ctx = c.getContext('2d');
  const fn = id === 'claude' ? CAST.ladyClaude : id === 'gemini' ? CAST.ladyGemini : CAST[id];
  fn(ctx, 380, 780, 62, { t: 0.7, noShadow: true, hat: 'maid', squint: 0.01 });
  manifest.sprites[id] = save(id, c);
}

const doubao = await loadImage(path.join(ROOT, 'assets/ai-girls/doubao/doubao-cutout.png'));
const dc = createCanvas(doubao.width, doubao.height);
dc.getContext('2d').drawImage(doubao, 0, 0);
manifest.sprites.doubao = save('doubao', dc);

// Cast gallery: four AI girls + six existing supporting design elements.
const cast = JSON.parse(fs.readFileSync(path.join(HERE, 'data/cast.json'), 'utf8')).cast;
const sheet = createCanvas(1920, 1080), s = sheet.getContext('2d');
const bg = s.createLinearGradient(0, 0, 0, 1080);
bg.addColorStop(0, '#10182b'); bg.addColorStop(1, '#1c2740');
s.fillStyle = bg; s.fillRect(0, 0, 1920, 1080);
s.fillStyle = '#f6ecd8'; s.font = '700 52px "Noto Sans SC"';
s.fillText('当前项目 · 全员形象图鉴', 64, 86);
s.fillStyle = '#9fb2cc'; s.font = '24px "Noto Sans SC"';
s.fillText('4 位 AI 娘 + 6 位既有配角 / 不把素材差分或文字编制客人另算成新角色', 64, 128);

function card(item, x, y, w, h, big) {
  s.fillStyle = item.aiGirl ? 'rgba(246,236,216,0.07)' : 'rgba(159,178,204,0.05)';
  s.strokeStyle = item.aiGirl ? 'rgba(246,236,216,0.22)' : 'rgba(159,178,204,0.14)';
  s.lineWidth = 2; s.beginPath(); s.roundRect(x, y, w, h, 18); s.fill(); s.stroke();
  const sprite = manifest.sprites[item.id];
  const img = fs.readFileSync(path.join(HERE, sprite.file));
  // loadImage is async; use synchronous decode via canvas for sheet composition.
  const c = createCanvas(sprite.width, sprite.height);
  // PNG decode through loadImage is awaited below in a second pass instead.
  return { item, x, y, w, h, big, sprite };
}
const cards = [];
cast.filter(c => c.aiGirl).forEach((item, i) => cards.push(card(item, 64 + i * 456, 164, 424, 560, true)));
cast.filter(c => !c.aiGirl).forEach((item, i) => cards.push(card(item, 64 + i * 304, 752, 280, 260, false)));
for (const c of cards) {
  const img = await loadImage(path.join(HERE, c.sprite.file));
  const maxH = c.big ? 380 : 150, maxW = c.w - 48;
  const k = Math.min(maxW / img.width, maxH / img.height);
  const dw = img.width * k, dh = img.height * k;
  s.drawImage(img, c.x + (c.w - dw) / 2, c.y + (c.big ? 40 : 24) + (maxH - dh), dw, dh);
  s.fillStyle = '#f6ecd8'; s.font = `${c.big ? 30 : 22}px "Noto Sans SC"`; s.textAlign = 'center';
  s.fillText(c.item.name, c.x + c.w / 2, c.y + c.h - (c.big ? 74 : 46));
  s.fillStyle = '#9fb2cc'; s.font = `${c.big ? 19 : 15}px "Noto Sans SC"`;
  const role = c.item.role.length > (c.big ? 18 : 12) ? c.item.role.slice(0, c.big ? 18 : 12) + '…' : c.item.role;
  s.fillText(role, c.x + c.w / 2, c.y + c.h - (c.big ? 40 : 20));
  s.textAlign = 'left';
}
s.fillStyle = '#7f91aa'; s.font = '18px "Noto Sans SC"';
s.fillText('主片采用统一微缩体素世界 + 既有像素立牌；豆包沿用现有抠图全身。非官方同人 · AI 生成内容。', 64, 1052);
fs.mkdirSync(path.join(ROOT, '番外MV'), { recursive: true });
fs.writeFileSync(path.join(ROOT, '番外MV/角色图鉴.png'), sheet.toBuffer('image/png'));
fs.writeFileSync(path.join(HERE, 'data/sprites.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`generated ${Object.keys(manifest.sprites).length} sprite entries + cast gallery`);
