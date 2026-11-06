// Build MV sprites from the user-specified upstream character art (v3):
//   shuaizenge/ai-girls     PRIMARY Q版小AI chibi frames (author video截帧, white-bg cutout)
//                           + doubao fullbody (Day12 cutout of the same upstream file)
//   JAdpp/dsh-whale-galgame whale-girl expression sprites (emotional inserts)
//   xiaosia/voxel-mv        relay girls' animation frames, used only in directed action shots
// Chibi cutouts are alpha-only background removal (flood-fill from the white edge);
// character RGB is not redrawn. Voxel frames are normalized per character with upstream
// 身高校正 mv_scale; galgame expressions share one union crop so switching expr never jumps.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const UP = path.join(HERE, 'assets/upstream');
const OUT = path.join(HERE, 'assets/sprites');
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(path.join(OUT, 'galgame'), { recursive: true });

GlobalFonts.registerFromPath(path.join(ROOT, 'video-fx/assets/fonts/NotoSansSC-Bold.ttf'), 'Noto Sans SC');

const TARGET = 384;                 // px stand height for mv_scale=1 (scene exports at 960x540)
const BOX_W = Math.ceil(TARGET * 1.5);
const BOX_H = Math.ceil(TARGET * 1.2);
const PAD = 6;
const FOOT_Y = BOX_H - PAD;

const heights = JSON.parse(fs.readFileSync(path.join(UP, 'voxel-mv/characters/身高校正.json'), 'utf8')).mv_scale;
const VOXEL_IDS = ['deepseek', 'claude', 'gemini', 'gpt', 'kimi', 'qwen', 'zai'];
const CHIBI_SOURCES = {
  deepseek: 'characters/deepseek/chibi/zipzippipe-BV1tE9XBbErS-05s.png',
  claude: 'characters/claude/chibi/zipzippipe-BV1tE9XBbErS-17s.png',
  gemini: 'characters/gemini/chibi/zipzippipe-BV1tE9XBbErS-11s.png',
  gpt: 'characters/gpt/chibi/zipzippipe-BV1tE9XBbErS-23s.png',
  kimi: 'characters/kimi/chibi/zipzippipe-BV1tE9XBbErS-41s.png',
  qwen: 'characters/qwen/chibi/zipzippipe-BV1tE9XBbErS-53s.png',
  glm: 'characters/glm/chibi/zipzippipe-BV1tE9XBbErS-35s.png',
};
const manifest = { version: 4, targetStandPx: TARGET, primaryForm: 'q-chibi-pets', characters: {} };
const cutoutRecords = [];

// Alpha-only white-background cutout. Flood-fill from the image border through
// near-white pixels; enclosed white clothing/hair is preserved. RGB is untouched.
async function buildChibi(key, upstreamId) {
  const rel = CHIBI_SOURCES[upstreamId];
  const src = path.join(UP, 'ai-girls', rel);
  const buf = fs.readFileSync(src);
  const img = await loadImage(buf);
  const c = createCanvas(img.width, img.height);
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const idat = ctx.getImageData(0, 0, img.width, img.height);
  const d = idat.data, w = img.width, h = img.height;
  const seen = new Uint8Array(w * h);
  const q = new Int32Array(w * h);
  let qs = 0, qe = 0;
  const isBg = (i) => {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    return mx > 232 && mn > 228 && mx - mn < 30;
  };
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const p = y * w + x;
    if (seen[p]) return;
    const i = p * 4;
    if (d[i + 3] < 10 || isBg(i)) { seen[p] = 1; q[qe++] = p; }
  };
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
  while (qs < qe) {
    const p = q[qs++], x = p % w, y = (p / w) | 0;
    push(x - 1, y); push(x + 1, y); push(x, y - 1); push(x, y + 1);
  }
  for (let p = 0; p < w * h; p++) if (seen[p]) d[p * 4 + 3] = 0;
  ctx.putImageData(idat, 0, 0);
  const file = `assets/sprites/chibi/${key}.png`;
  fs.mkdirSync(path.dirname(path.join(HERE, file)), { recursive: true });
  const [meta] = await saveUnion([c], [file], 900, 8);
  const crypto = await import('node:crypto');
  const record = {
    character: key, upstream: `shuaizenge/ai-girls@${rel}`,
    sourceSha256: crypto.createHash('sha256').update(buf).digest('hex'),
    method: 'alpha-only edge flood-fill of near-white background; no RGB redraw',
    sprite: meta.file, spriteSha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(HERE, file))).digest('hex'),
  };
  cutoutRecords.push(record);
  return { ...meta, source: `shuaizenge/ai-girls ${rel}`, provenance: record };
}

async function buildVoxel(id) {
  const dir = path.join(UP, 'voxel-mv/characters', id);
  const fj = JSON.parse(fs.readFileSync(path.join(dir, 'frames.json'), 'utf8'));
  const mv = heights[id] ?? 1;
  const standPx = TARGET * mv;
  const k = standPx / fj.stand_h;
  const sx0 = fj.center_x - (BOX_W / 2) / k;
  const sy0 = fj.baseline_y - FOOT_Y / k;
  const outDir = path.join(OUT, 'voxel', id);
  fs.mkdirSync(outDir, { recursive: true });
  const actions = {};
  for (const [name, a] of Object.entries(fj.actions)) {
    const frames = [];
    for (const f of a.frames) {
      if (f.empty) continue;
      const src = path.join(dir, f.file);
      if (!fs.existsSync(src)) continue; // only curated actions were fetched
      const img = await loadImage(fs.readFileSync(src));
      const c = createCanvas(BOX_W, BOX_H);
      c.getContext('2d').drawImage(img, sx0, sy0, BOX_W / k, BOX_H / k, 0, 0, BOX_W, BOX_H);
      const file = `assets/sprites/voxel/${id}/${name}_${path.basename(f.file)}`;
      fs.writeFileSync(path.join(HERE, file), c.toBuffer('image/png'));
      frames.push(file);
    }
    if (frames.length) actions[name] = { fps: a.fps, loop: !!a.loop, frames };
  }
  return { boxW: BOX_W, boxH: BOX_H, footY: FOOT_Y, standPx, mvScale: mv, actions };
}

function alphaBox(img) {
  const c = createCanvas(img.width, img.height);
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, img.width, img.height).data;
  let x0 = img.width, y0 = img.height, x1 = -1, y1 = -1;
  for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) {
    if (d[(y * img.width + x) * 4 + 3] > 8) {
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) throw new Error('empty sprite');
  return { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1, canvas: c };
}

// Crop every image to the SAME rect (union box + pad), scale to heightPx.
async function saveUnion(images, files, heightPx, pad = 10) {
  const boxes = images.map(alphaBox);
  const x0 = Math.max(0, Math.min(...boxes.map(b => b.x0)) - pad);
  const y0 = Math.max(0, Math.min(...boxes.map(b => b.y0)) - pad);
  const x1 = Math.min(images[0].width - 1, Math.max(...boxes.map(b => b.x1)) + pad);
  const y1 = Math.min(images[0].height - 1, Math.max(...boxes.map(b => b.y1)) + pad);
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const outW = Math.round(w * (heightPx / h));
  const scale = heightPx / h;
  const out = [];
  for (let i = 0; i < images.length; i++) {
    const c = createCanvas(outW, heightPx);
    c.getContext('2d').drawImage(boxes[i].canvas, x0, y0, w, h, 0, 0, outW, heightPx);
    fs.writeFileSync(path.join(HERE, files[i]), c.toBuffer('image/png'));
    out.push({ file: files[i], width: outW, height: heightPx, footY: Math.round(heightPx - pad * scale), standPx: Math.round(heightPx - 2 * pad * scale) });
  }
  return out;
}

for (const id of VOXEL_IDS) {
  const v = await buildVoxel(id);
  const key = id === 'deepseek' ? 'whale' : id;
  const chibi = await buildChibi(key, id === 'zai' ? 'glm' : id);
  manifest.characters[key] = {
    kind: key === 'whale' ? 'whale-multi' : 'chibi+voxel',
    source: `shuaizenge/ai-girls chibi (primary) + xiaosia/voxel-mv characters/${id} (action shots)`,
    preview: chibi.file,
    chibi,
    ...v,
  };
  console.log('chibi+voxel', id, '→', key, Object.keys(v.actions).length, 'actions');
}

// v4 pet atlases: keep the upstream 192×208 cells intact (FORMAT.md explicitly
// forbids per-frame autocrop/recenter/stretch). Playback uses pet.json durations.
for (const [key, petId] of [['whale', 'deepseek-whale'], ['gpt', 'gpt-dragon']]) {
  const dir = path.join(UP, 'pets/assets', petId);
  const pj = JSON.parse(fs.readFileSync(path.join(dir, 'pet.json'), 'utf8'));
  const file = `assets/sprites/pets/${key}.png`;
  fs.mkdirSync(path.dirname(path.join(HERE, file)), { recursive: true });
  fs.copyFileSync(path.join(dir, 'spritesheet.png'), path.join(HERE, file));
  const idleFile = `assets/sprites/pets/${key}_idle.png`;
  const sheetImg = await loadImage(fs.readFileSync(path.join(HERE, file)));
  const cell = createCanvas(pj.cell_width, pj.cell_height);
  cell.getContext('2d').drawImage(sheetImg, 0, 0, pj.cell_width, pj.cell_height, 0, 0, pj.cell_width, pj.cell_height);
  fs.writeFileSync(path.join(HERE, idleFile), cell.toBuffer('image/png'));
  manifest.characters[key].pet = {
    file, preview: idleFile, source: `tqlearning/ai-girl-chatgpt-pets assets/${petId}`,
    cellW: pj.cell_width, cellH: pj.cell_height, columns: pj.columns, rows: pj.rows,
    footY: 200, standPx: 160,
    animations: Object.fromEntries(pj.animations.map(a => [a.state, { row: a.row, frames: a.frame_count, durationsMs: a.frame_durations_ms, loop: ['idle', 'running-right', 'running-left', 'running'].includes(a.state) }])),
    directions: pj.look_directions.samples,
    integrity: pj.integrity,
  };
  manifest.characters[key].preview = idleFile;
  console.log('pet atlas', key, pj.animations.length, 'states', pj.look_directions.samples.length, 'looks');
}

// Whale galgame expression inserts (JAdpp/dsh-whale-galgame, CC BY-NC-SA 4.0 chain).
const EXPRS = ['cheerful', 'shy', 'serious', 'confused', 'angry', 'frightened', 'exasperated', 'starry'];
const gimgs = await Promise.all(EXPRS.map(e => loadImage(fs.readFileSync(path.join(UP, 'galgame/assets/default', `whale-${e}.webp`)))));
const gfiles = EXPRS.map(e => `assets/sprites/galgame/whale_${e}.png`);
const gmetas = await saveUnion(gimgs, gfiles, 900);
const expressions = {};
EXPRS.forEach((e, i) => { expressions[e] = gmetas[i]; });
manifest.characters.whale.galgame = { source: 'JAdpp/dsh-whale-galgame assets/default/whale-*.webp', expressions };
// Primary gallery form stays ai-girls chibi; galgame is reserved for emotional inserts.
manifest.characters.whale.preview = manifest.characters.whale.chibi.file;
console.log('galgame whale expressions:', EXPRS.length, 'union crop', gmetas[0].width + 'x' + gmetas[0].height);

// Doubao: Day12 cutout of shuaizenge/ai-girls characters/doubao/generated/doubao-fullbody.jpg.
// Upstream has no Q版 doubao, so v4 derives a chibi layout from the SAME cutout
// pixels (head ×1.25, torso ×0.9/0.62, legs ×0.82/0.5, overlapped seams). This is
// an affine re-layout, not a redraw; the normal-proportion cutout is archived.
const doubao = await loadImage(fs.readFileSync(path.join(ROOT, 'assets/ai-girls/doubao/doubao-cutout.png')));
const [normalMeta] = await saveUnion([doubao], ['assets/sprites/doubao_normal.png'], 900);
const qW = 420, qH = 860;
const qc = createCanvas(qW, qH), qx = qc.getContext('2d');
const headH = 330, torsoY0 = 300, torsoY1 = 680, legsY0 = 650, hs = 1.25;
qx.drawImage(doubao, 0, 0, doubao.width, headH, (qW - doubao.width * hs) / 2, 0, doubao.width * hs, headH * hs);
const tw = doubao.width * 0.9, th = (torsoY1 - torsoY0) * 0.62;
qx.drawImage(doubao, 0, torsoY0, doubao.width, torsoY1 - torsoY0, (qW - tw) / 2, headH * hs - 40, tw, th);
const lw = doubao.width * 0.82, lh = (doubao.height - legsY0) * 0.5;
qx.drawImage(doubao, 0, legsY0, doubao.width, doubao.height - legsY0, (qW - lw) / 2, headH * hs - 40 + th - 30, lw, lh);
const [dmeta] = await saveUnion([qc], ['assets/sprites/doubao.png'], 900);
manifest.characters.doubao = {
  kind: 'static',
  source: 'shuaizenge/ai-girls characters/doubao/generated/doubao-fullbody.jpg (Day12 cutout → v4 Q版 affine re-layout; not an upstream chibi)',
  preview: dmeta.file,
  sprite: dmeta,
  normal: normalMeta,
  qLayout: { headScale: 1.25, torsoScale: [0.9, 0.62], legsScale: [0.82, 0.5], method: 'pixel-preserving segment affine re-layout' },
};
console.log('doubao Q sprite', dmeta.width + 'x' + dmeta.height, '(normal archived)');

fs.writeFileSync(path.join(HERE, 'data/sprites.json'), JSON.stringify(manifest, null, 2) + '\n');
fs.writeFileSync(path.join(HERE, 'data/chibi_cutouts.json'), JSON.stringify({ version: 3, records: cutoutRecords }, null, 2) + '\n');

// Cast gallery: 8 AI girls, 4 × 2.
const cast = JSON.parse(fs.readFileSync(path.join(HERE, 'data/cast.json'), 'utf8')).cast;
const sheet = createCanvas(1920, 1080), s = sheet.getContext('2d');
const bg = s.createLinearGradient(0, 0, 0, 1080);
bg.addColorStop(0, '#10182b'); bg.addColorStop(1, '#1c2740');
s.fillStyle = bg; s.fillRect(0, 0, 1920, 1080);
s.fillStyle = '#f6ecd8'; s.font = '700 50px "Noto Sans SC"';
s.fillText('AI娘全员 · 8 位', 64, 84);
s.fillStyle = '#9fb2cc'; s.font = '24px "Noto Sans SC"';
s.fillText('v4 Q版：鲸娘/GPT 真帧 Pet 动画 · 其余 ai-girls Q版 · 豆包 Day12 抠图 · 无整图弹跳', 64, 126);
for (let i = 0; i < cast.length; i++) {
  const item = cast[i];
  const x = 64 + (i % 4) * 456, y = 160 + Math.floor(i / 4) * 448, w = 424, h = 424;
  s.fillStyle = 'rgba(246,236,216,0.07)';
  s.strokeStyle = 'rgba(246,236,216,0.22)';
  s.lineWidth = 2; s.beginPath(); s.roundRect(x, y, w, h, 18); s.fill(); s.stroke();
  const img = await loadImage(fs.readFileSync(path.join(HERE, manifest.characters[item.id].preview)));
  const maxH = 290, maxW = w - 60;
  const k2 = Math.min(maxW / img.width, maxH / img.height);
  s.drawImage(img, x + (w - img.width * k2) / 2, y + 24 + (maxH - img.height * k2), img.width * k2, img.height * k2);
  s.fillStyle = '#f6ecd8'; s.font = '28px "Noto Sans SC"'; s.textAlign = 'center';
  s.fillText(item.name, x + w / 2, y + h - 76);
  s.fillStyle = '#9fb2cc'; s.font = '19px "Noto Sans SC"';
  s.fillText(item.sourceLabel, x + w / 2, y + h - 42);
  s.textAlign = 'left';
}
fs.writeFileSync(path.join(ROOT, '番外MV/角色图鉴.png'), sheet.toBuffer('image/png'));
console.log('gallery saved; sprites manifest written');
