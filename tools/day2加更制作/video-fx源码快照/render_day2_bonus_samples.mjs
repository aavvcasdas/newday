#!/usr/bin/env node
/*
 * render_day2_bonus_samples.mjs — render the two silent Day2 bonus samples.
 *
 * This renderer deliberately has no audio input and no measured-voice gate:
 * it is only for choosing the visual route. Output filenames must contain
 * 样片A/样片B and 无配音 so a sample cannot be mistaken for a publishable cut.
 */
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
// Snapshot convention: this renderer may be copied either to the video-fx
// repository root or beside the chapter in src/ch. Resolve the real root.
const ROOT = fs.existsSync(path.join(HERE, 'src', 'core.js'))
  ? HERE
  : path.resolve(HERE, '..', '..');
const requireFromHere = createRequire(import.meta.url);
const requireFromRoot = createRequire(path.join(ROOT, 'package.json'));

function argValue(flag, fallback = null) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : fallback;
}
const STILLS = process.argv.includes('--stills');
const VARIANT = argValue('--variant', 'enhanced');
const OUT = argValue('--out', path.join(ROOT, 'day2_bonus_sample_silent.mp4'));
if (!['enhanced', 'oldactions'].includes(VARIANT)) {
  throw new Error(`--variant must be enhanced|oldactions, got ${VARIANT}`);
}
if (!STILLS) {
  const base = path.basename(OUT);
  const expected = VARIANT === 'enhanced' ? '样片A' : '样片B';
  if (!base.includes(expected) || !base.includes('无配音')) {
    throw new Error(`silent sample output must contain ${expected} and 无配音: ${base}`);
  }
}

let createCanvas, loadImage, GlobalFonts;
try {
  ({ createCanvas, loadImage, GlobalFonts } = requireFromRoot('@napi-rs/canvas'));
} catch {
  ({ createCanvas, loadImage, GlobalFonts } = requireFromHere('@napi-rs/canvas'));
}

const FONT_DIR = path.join(ROOT, 'assets', 'fonts');
function registerFont(file, families) {
  const fontPath = path.join(FONT_DIR, file);
  if (!fs.existsSync(fontPath) || !GlobalFonts?.registerFromPath) return;
  for (const family of families) GlobalFonts.registerFromPath(fontPath, family);
}
registerFont('ZCOOLKuaiLe-Regular.ttf', ['ZCOOLKuaiLe', 'ZCOOL KuaiLe']);
registerFont('NotoSansSC-Bold.ttf', ['NotoSansSC', 'Noto Sans SC', 'Noto Sans CJK SC', 'Microsoft YaHei']);
registerFont('NotoSansSC-Regular.ttf', ['NotoSansSC', 'Noto Sans SC', 'Noto Sans CJK SC', 'Microsoft YaHei']);
registerFont('Silkscreen-Regular.ttf', ['Silkscreen']);

globalThis.window = globalThis;
globalThis.DAY2_BONUS_SAMPLE_VARIANT = VARIANT;
globalThis.DAY2_CHARACTER_MODE = 'mixed';
requireFromRoot('./assets/audio_envelope.js');
// Silent envelope: the reused pose helper may consult voiceAt(), but this
// sample has no speech and must not inherit another video's voice bounce.
globalThis.AUDIO_DATA = {
  voice: new Array(6000).fill(0),
  energy: new Array(6000).fill(0.15),
  bass: new Array(6000).fill(0.1),
  beats: []
};
const CORE = requireFromRoot('./src/core.js');
const WHALE_RIG = requireFromRoot('./src/whale_girl_rig_data.js');
if (WHALE_RIG?.poses?.wink && WHALE_RIG?.poses?.heart?.backHair) {
  WHALE_RIG.poses.wink.backHair = WHALE_RIG.poses.heart.backHair;
}
// Eye-line gate: keep the wink pose's hands-on-hips body bones, but use the
// open-eyed wave head so the old lead never gets a closed-eye/skin-band head.
if (WHALE_RIG?.poses?.wink && WHALE_RIG?.poses?.wave?.head) {
  WHALE_RIG.poses.wink.head = WHALE_RIG.poses.wave.head;
}
requireFromRoot('./src/whale_girl_actions.js');
requireFromRoot('./src/whale_girl.js');
requireFromRoot('./src/clawd.js');
requireFromRoot('./src/cast.js');
requireFromRoot('./src/lyrics.js');
requireFromRoot('./src/props.js');
const TIMELINE = requireFromRoot('./src/timeline.js');

const DAY2_POSE_NAMES = [
  'idle-cute', 'curious', 'thinking', 'running', 'success', 'failure', 'blush',
  'angry', 'eat', 'celebrate', 'sleep', 'greet', 'wink', 'bold', 'star',
  'daily-gaming', 'daily-eat', 'daily-stretch', 'tail-swing', 'meme-cry',
  'meme-smug', 'meme-doge', 'meme-heart', 'meme-no', 'meme-yes', 'meme-music',
  'work-debug', 'work-idea', 'work-review', 'work-deadline', 'react-head',
  'react-belly', 'react-tail', 'game-happy', 'game-win', 'teasing',
  'daily-done', 'levelup', 'cool-shades'
];
function alphaBBox(img) {
  const c = createCanvas(img.width, img.height);
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, img.width, img.height).data;
  let x0 = img.width, y0 = img.height, x1 = -1, y1 = -1;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (d[(y * img.width + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return { x: 0, y: 0, w: img.width, h: img.height };
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}
async function loadDay2Poses() {
  const dir = path.join(ROOT, 'assets', 'day2_poses');
  const out = {};
  await Promise.all(DAY2_POSE_NAMES.map(async name => {
    const file = path.join(dir, `dsh-whale-state-${name}.webp`);
    if (!fs.existsSync(file)) throw new Error(`Day2 pose missing: ${file}`);
    const img = await loadImage(file);
    if (img.width !== 512 || img.height !== 512) {
      throw new Error(`Day2 pose ${name} should be 512x512, got ${img.width}x${img.height}`);
    }
    out[name] = { img, bbox: alphaBBox(img), file: path.basename(file) };
  }));
  return out;
}
globalThis.DAY2_POSES = await loadDay2Poses();
globalThis.DAY2_POSE_COUNT = DAY2_POSE_NAMES.length;

const SAMPLE = requireFromHere(fs.existsSync(path.join(HERE, 'day2_bonus_samples_all.js'))
  ? './day2_bonus_samples_all.js'
  : './src/ch/day2_bonus_samples_all.js');
const TIMING = globalThis.DAY2_BONUS_SAMPLE_TIMING;
if (!TIMING?.sample_only || TIMING.voice !== false || TIMING.measured !== false ||
    TIMING.variant !== VARIANT || TIMING.cues?.length !== 12) {
  throw new Error('sample timing gate failed');
}
const PIXEL_CATALOG = SAMPLE.PIXEL_ACTION_CATALOG_28 || [];
const POSE_CATALOG = SAMPLE.STICKER_POSE_CATALOG_39 || [];
const rigActionIds = new Set((globalThis.WHALE_GIRL?.ACTION_LIST || []).map(item => item.id));
if (PIXEL_CATALOG.length !== 28 || new Set(PIXEL_CATALOG.map(item => item.id)).size !== 28 ||
    PIXEL_CATALOG.some(item => !rigActionIds.has(item.id))) {
  throw new Error('pixel action catalog gate failed: expected all 28 rig action IDs');
}
if (DAY2_POSE_NAMES.length !== 39 || new Set(DAY2_POSE_NAMES).size !== 39 ||
    POSE_CATALOG.length !== 39 || new Set(POSE_CATALOG.map(item => item.id)).size !== 39 ||
    POSE_CATALOG.some(item => !DAY2_POSE_NAMES.includes(item.id))) {
  throw new Error('sticker pose catalog gate failed: expected all 39 loaded pose IDs');
}
const CATALOG_TIMING = TIMING.catalog || {};
if (CATALOG_TIMING.pixelCount !== 28 || !(CATALOG_TIMING.pixelEnd > CATALOG_TIMING.pixelStart) ||
    (VARIANT === 'oldactions' && (CATALOG_TIMING.poseCount !== 39 || !(CATALOG_TIMING.poseEnd > CATALOG_TIMING.poseStart))) ||
    (VARIANT === 'enhanced' && CATALOG_TIMING.poseCount !== 0)) {
  throw new Error('sample catalog timing gate failed');
}
if (!TIMELINE?.renderFrame) throw new Error('TIMELINE.renderFrame missing');
CORE.DURATION = Number(TIMING.duration);

const WIDTH = 1280, HEIGHT = 720, SCALE = 1.5, FPS = 30;
const OUT_W = WIDTH * SCALE, OUT_H = HEIGHT * SCALE;
const DURATION = Number(TIMING.duration);
const canvas = createCanvas(OUT_W, OUT_H);
const ctx = canvas.getContext('2d');

const FONT = '"Noto Sans SC","Microsoft YaHei","PingFang SC",sans-serif';
const CAPTION_OVERRIDES = VARIANT === 'oldactions' ? {
  B03: '样片B先不换主体：旧版留在主画面，动作往旧骨架上加。',
  B04: '主画面是旧版骨架；表情包新版只进电视里对照。',
  B05: '电视里不是一只鱼：旧版和表情包新版各有完整小场景。',
  B07: '剧情段先看三招；片尾再把 28 个动作和 39 张姿势完整播完。',
  B11: '一千八百一十六位住户：选原版项目更新，还是旧版加动作？'
} : {
  B03: '这不，主人就给本鱼装上了先前项目的动作更新。',
  B04: '先说清楚：主画面还是原骨架，只是动作、表情和走位跟上了。',
  B07: '剧情段先看三招；片尾把先前项目的 28 个动作逐个播完。',
  B11: '一千八百一十六位住户：选原版项目更新，还是电视里的老版本鱼？'
};
const MODE_LABEL = VARIANT === 'enhanced'
  ? '样片A · 原版跟随先前项目更新'
  : '样片B · 旧版主画面加动作';
const MODE_NOTE = VARIANT === 'enhanced'
  ? '电视 = 旧版完整小场景 · 无新加饰品'
  : '电视 = 旧版 + 表情包双完整小场景';

function text(textValue, x, y, size, color = '#fff', align = 'center', weight = 400) {
  ctx.save();
  ctx.font = `${weight} ${size * SCALE}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineWidth = Math.max(2, size * SCALE * 0.14);
  ctx.strokeStyle = 'rgba(6,20,44,0.92)';
  ctx.strokeText(textValue, x * SCALE, y * SCALE);
  ctx.fillStyle = color;
  ctx.fillText(textValue, x * SCALE, y * SCALE);
  ctx.restore();
}
function shrinkToFit(textValue, maxWidth, size, weight = 700) {
  let s = size;
  ctx.save();
  while (s > 12) {
    ctx.font = `${weight} ${s * SCALE}px ${FONT}`;
    if (ctx.measureText(textValue).width <= maxWidth * SCALE) break;
    s -= 1;
  }
  ctx.restore();
  return s;
}
function cueAt(t) {
  return TIMING.cues.find(cue => t >= cue.start && t < cue.end) ||
    (t >= TIMING.cues.at(-1).end ? TIMING.cues.at(-1) : null);
}
function catalogAt(t) {
  if (t >= CATALOG_TIMING.end) return { kind: 'complete' };
  if (CATALOG_TIMING.poseStart !== null && CATALOG_TIMING.poseStart !== undefined &&
      t >= CATALOG_TIMING.poseStart && t < CATALOG_TIMING.poseEnd) {
    const index = Math.min(POSE_CATALOG.length - 1,
      Math.floor((t - CATALOG_TIMING.poseStart) / CATALOG_TIMING.poseItemSeconds));
    return { kind: 'pose', index, item: POSE_CATALOG[index] };
  }
  if (t >= CATALOG_TIMING.pixelStart && t < CATALOG_TIMING.pixelEnd) {
    const index = Math.min(PIXEL_CATALOG.length - 1,
      Math.floor((t - CATALOG_TIMING.pixelStart) / CATALOG_TIMING.pixelItemSeconds));
    return { kind: 'pixel', index, item: PIXEL_CATALOG[index] };
  }
  return null;
}
function drawCaption(t) {
  const cat = catalogAt(t);
  let prefix;
  let caption;
  if (cat?.kind === 'pixel') {
    prefix = `动作目录 ${String(cat.item.n).padStart(2, '0')}/28`;
    caption = `${cat.item.id} · ${cat.item.zh} · 像素骨架真动作`;
  } else if (cat?.kind === 'pose') {
    prefix = `姿势目录 ${String(cat.item.n).padStart(2, '0')}/39`;
    caption = `${cat.item.id} · ${cat.item.zh} · 电视完整小场景`;
  } else if (cat?.kind === 'complete') {
    prefix = '完整目录';
    caption = VARIANT === 'oldactions'
      ? '已播完：28/28 个像素动作 · 39/39 张电视姿势'
      : '已播完：28/28 个先前项目像素动作 · 无新加饰品';
  } else {
    const cue = cueAt(t);
    if (!cue) return;
    prefix = cue.id;
    caption = CAPTION_OVERRIDES[cue.id] || cue.sub;
  }
  const line = `${prefix} · ${caption}`;
  const size = shrinkToFit(line, 1160, 27, 700);
  ctx.save();
  ctx.fillStyle = 'rgba(5,15,35,0.78)';
  ctx.fillRect(0, 632 * SCALE, WIDTH * SCALE, HEIGHT * SCALE);
  ctx.restore();
  text(line, WIDTH / 2, 676, size, '#F8FAFC', 'center', 700);
}
function drawHud(t) {
  const cat = catalogAt(t);
  const center = cat?.kind === 'pixel'
    ? '完整目录 · 28 个像素动作逐个播放'
    : cat?.kind === 'pose'
      ? '完整目录 · 39 张电视姿势逐张播放'
      : cat?.kind === 'complete'
        ? '完整目录 · 已全部播完'
        : '12 镜头剧情段 · 片尾完整目录';
  ctx.save();
  ctx.fillStyle = 'rgba(5,15,35,0.82)';
  ctx.fillRect(0, 0, WIDTH * SCALE, 52 * SCALE);
  ctx.fillStyle = VARIANT === 'enhanced' ? '#FACC15' : '#7DD3FC';
  ctx.fillRect(0, 50 * SCALE, WIDTH * SCALE, 2 * SCALE);
  ctx.restore();
  text(MODE_LABEL, 16, 26, 21, '#FFFFFF', 'left', 800);
  text(center, WIDTH / 2, 26, 18, '#E2E8F0', 'center', 700);
  text(`无配音 · ${MODE_NOTE} · ${t.toFixed(1)}s`, WIDTH - 16, 26, 17, '#E2E8F0', 'right', 700);
}
function drawFrame(t) {
  ctx.save();
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  // 'clean' is required at 1920x1080: the legacy 'pixel' medium overlay
  // samples only the 1280x720 top-left quadrant and would crop the frame.
  TIMELINE.renderFrame(ctx, t, 'clean', { hideHud: true, hideSubtitles: true });
  ctx.restore();
  drawCaption(t);
  drawHud(t);
}

if (STILLS) {
  const dir = path.join(ROOT, 'stills', 'day2_bonus_samples', VARIANT);
  fs.mkdirSync(dir, { recursive: true });
  const points = [
    ['b01', 0, 0.55], ['b02', 1, 0.55], ['b03', 2, 0.65], ['b04', 3, 0.55],
    ['b05', 4, 0.55], ['b06_eat', 5, 0.31], ['b06_stretch', 5, 0.58], ['b06_game', 5, 0.85],
    ['b07_eat', 6, 0.16], ['b07_stretch', 6, 0.39], ['b07_game', 6, 0.62], ['b07_detail', 6, 0.86],
    ['b08', 7, 0.55], ['b09_mid', 8, 0.35], ['b09_late', 8, 0.85],
    ['b10', 9, 0.55], ['b11', 10, 0.75], ['b12', 11, 0.55], ['b12_late', 11, 0.9]
  ];
  for (const item of PIXEL_CATALOG) {
    points.push([`act_${String(item.n).padStart(2, '0')}_${item.id}`, null, null,
      CATALOG_TIMING.pixelStart + (item.n - 0.45) * CATALOG_TIMING.pixelItemSeconds]);
  }
  if (VARIANT === 'oldactions') {
    for (const item of POSE_CATALOG) {
      points.push([`pose_${String(item.n).padStart(2, '0')}_${item.id}`, null, null,
        CATALOG_TIMING.poseStart + (item.n - 0.5) * CATALOG_TIMING.poseItemSeconds]);
    }
  }
  points.push(['catalog_complete', null, null, CATALOG_TIMING.end + 0.55]);
  for (const [name, cueIndex, frac, absoluteT] of points) {
    const cue = cueIndex === null ? null : TIMING.cues[cueIndex];
    const t = absoluteT ?? (cue.start + (cue.end - cue.start) * frac);
    drawFrame(t);
    const file = path.join(dir, `${name}.png`);
    await fs.promises.writeFile(file, canvas.toBuffer('image/png'));
    console.log(`[day2-bonus-sample] still ${name} t=${t.toFixed(3)} -> ${file}`);
  }
  process.exit(0);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
const FFMPEG = process.env.FFMPEG_BIN || 'ffmpeg';
const args = [
  '-y',
  '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${OUT_W}x${OUT_H}`, '-r', String(FPS),
  '-i', 'pipe:0',
  '-an',
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
  '-b:v', '3200k', '-maxrate', '4200k', '-bufsize', '8400k',
  '-movflags', '+faststart', '-r', String(FPS),
  '-metadata', `title=Day2加更${VARIANT === 'enhanced' ? '样片A原版跟随先前项目更新完整28动作' : '样片B旧版加动作完整28动作39姿势'}（无配音）`,
  '-metadata', `comment=Silent visual sample only; variant=${VARIANT}; no voice track`,
  OUT
];
const ff = spawn(FFMPEG, args, { stdio: ['pipe', 'inherit', 'inherit'] });
const ffmpegDone = new Promise((resolve, reject) => {
  ff.on('error', reject);
  ff.on('close', code => code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`)));
});
ffmpegDone.catch(() => {});
const total = Math.ceil(DURATION * FPS);
for (let f = 0; f < total; f++) {
  const t = f / FPS;
  drawFrame(t);
  const rgbaFrame = ctx.getImageData(0, 0, OUT_W, OUT_H).data;
  const ok = ff.stdin.write(Buffer.from(rgbaFrame.buffer, rgbaFrame.byteOffset, rgbaFrame.byteLength));
  if (!ok) await new Promise(resolve => ff.stdin.once('drain', resolve));
  if (f % 90 === 0) console.log(`[day2-bonus-sample] ${VARIANT} frame ${f}/${total} (${(100 * f / total).toFixed(1)}%)`);
}
ff.stdin.end();
await ffmpegDone;
console.log(`[day2-bonus-sample] done variant=${VARIANT} frames=${total} duration=${DURATION.toFixed(3)}s out=${OUT}`);
