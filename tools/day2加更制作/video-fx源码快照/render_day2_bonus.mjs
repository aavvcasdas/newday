// render_day2_bonus.mjs — 【Day2 加更】昨天有人说我太糊了 · 初步草稿渲染器
// 用法: node render_day2_bonus.mjs --stills
//       node render_day2_bonus.mjs --out day2_bonus_piper_draft.mp4
//
// 这是 Piper 占位结构片渲染器，不是终版渲染器：
// - 只接受 gen_bonus_piper.py 生成的 12-cue measured Piper timing；
// - 主画面显式使用 candidate 完整姿势图，电视里显式使用 original 像素骨架；
// - 电视机由 day2_bonus_all.js 只在 B03 起调用，B01/B02 无电视机；
// - 输出文件名必须带 piper/draft/初步草稿，禁止写成正式版名。

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const CLI_ARGS = process.argv.slice(2);
function cliValue(name) {
  const idx = CLI_ARGS.indexOf(name);
  return idx >= 0 ? CLI_ARGS[idx + 1] : undefined;
}
const STILLS = CLI_ARGS.includes('--stills');
const OUT_FILE = cliValue('--out') || 'day2_bonus_piper_draft.mp4';
const outBase = path.basename(OUT_FILE).toLowerCase();
if (!STILLS && !outBase.includes('piper') && !outBase.includes('draft') && !outBase.includes('初步草稿')) {
  throw new Error('Piper 初步草稿输出名必须包含 piper、draft 或“初步草稿”，禁止冒充正式版');
}

let canvasPkg;
try { canvasPkg = require('@napi-rs/canvas'); }
catch { canvasPkg = require('/tmp/node_render/node_modules/@napi-rs/canvas'); }
const { createCanvas, GlobalFonts, loadImage } = canvasPkg;

GlobalFonts.registerFromPath(path.resolve('assets/fonts/ZCOOLKuaiLe-Regular.ttf'), 'ZCOOLKuaiLe');
GlobalFonts.registerFromPath(path.resolve('assets/fonts/NotoSansSC-Bold.ttf'), 'NotoSansSC');
GlobalFonts.registerFromPath(path.resolve('assets/fonts/Silkscreen-Regular.ttf'), 'Silkscreen');

globalThis.window = globalThis;
require('./assets/audio_envelope.js');
require('./assets/day2_bonus_envelope.js'); // overrides AUDIO_DATA for this bonus draft
const CORE = require('./src/core.js');
const WHALE_RIG = require('./src/whale_girl_rig_data.js');
if (WHALE_RIG?.poses?.wink && WHALE_RIG?.poses?.heart?.backHair) {
  WHALE_RIG.poses.wink.backHair = WHALE_RIG.poses.heart.backHair;
}
require('./src/whale_girl_actions.js');
require('./src/whale_girl.js');
require('./src/clawd.js');
require('./src/cast.js');
const LYRICS = require('./src/lyrics.js');
const PROPS = require('./src/props.js');
const TIMELINE = require('./src/timeline.js');
const BONUS_TIMING = require('./src/day2_bonus_timing.js');

const EXPECTED_MODEL_SHA256 = '9929917bf8cabb26fd528ea44d3a6699c11e87317a14765312420be230be0f3d';
if (!BONUS_TIMING.voice || BONUS_TIMING.measured !== true || !Array.isArray(BONUS_TIMING.cues) ||
    BONUS_TIMING.cues.length !== 12 || BONUS_TIMING.voice_engine !== 'piper/zh_CN-huayan-medium' ||
    BONUS_TIMING.voice_placeholder !== true || BONUS_TIMING.voice_final !== false ||
    BONUS_TIMING.piper_model_sha256 !== EXPECTED_MODEL_SHA256 ||
    Number(BONUS_TIMING.title_len || 0) !== 0 || Number(BONUS_TIMING.cues[0]?.start ?? -1) !== 0) {
  throw new Error('BONUS_TIMING 门禁失败：必须是 12-cue、实测、Piper 占位且 B01 从 0 开始');
}
for (const [i, cue] of BONUS_TIMING.cues.entries()) {
  if (cue.measured !== true || cue.engine !== 'piper/zh_CN-huayan-medium' || cue.id !== `B${String(i + 1).padStart(2, '0')}`) {
    throw new Error(`BONUS_TIMING cue ${i + 1} 门禁失败`);
  }
}

function wrapSubtitle(ctx, text, maxWidth) {
  const lines = [];
  let line = '';
  for (const ch of text) {
    const next = line + ch;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = ch;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

LYRICS.drawSubtitleBar = (ctx, rawT) => {
  const t = rawT < 0.141 ? 0.141 : rawT;
  const cue = BONUS_TIMING.cues.find(c => t >= c.start && t < c.end);
  if (!cue) return;
  const enter = CORE.easeOut(CORE.clamp((t - cue.start) / 0.14));
  const exit = 1 - CORE.ease(CORE.clamp((t - (cue.end - 0.12)) / 0.12));
  const alpha = Math.max(0, Math.min(1, enter * exit));
  if (alpha < 0.02) return;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = 'bold 26px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
  const lines = wrapSubtitle(ctx, cue.sub, 1020);
  const textW = Math.max(...lines.map(line => ctx.measureText(line).width));
  const boxW = Math.min(1180, Math.max(420, textW + 76));
  const boxH = lines.length * 34 + 24;
  const bx = Math.round((CORE.W - boxW) / 2);
  const by = Math.round(CORE.H - boxH - 16 + (1 - enter) * 14);

  ctx.beginPath();
  ctx.roundRect(bx, by, boxW, boxH, 12);
  ctx.fillStyle = 'rgba(9, 22, 54, 0.94)';
  ctx.fill();
  ctx.strokeStyle = '#48C8FF';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.roundRect(bx + 14, by - 15, 104, 22, 6);
  ctx.fillStyle = '#1E40AF';
  ctx.fill();
  ctx.strokeStyle = CORE.PAL.gold;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.font = 'bold 13px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = CORE.PAL.gold;
  ctx.fillText('深海鲸鱼娘', bx + 66, by - 4);

  ctx.font = 'bold 26px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
  lines.forEach((line, i) => {
    const ly = by + 29 + i * 34;
    ctx.fillStyle = CORE.PAL.ink;
    ctx.fillText(line, CORE.W / 2 + 2, ly + 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(line, CORE.W / 2, ly);
  });

  const progress = CORE.clamp((t - cue.start) / Math.max(0.001, cue.end - cue.start));
  ctx.fillStyle = CORE.PAL.gold;
  ctx.fillRect(bx + 12, by + boxH - 5, (boxW - 24) * progress, 2);
  ctx.restore();
};

PROPS.drawTopHud = (ctx) => {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(18, 16, 330, 36, 10);
  ctx.fillStyle = 'rgba(11, 29, 58, 0.94)';
  ctx.fill();
  ctx.strokeStyle = '#48C8FF';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.font = 'bold 15px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = CORE.PAL.gold;
  ctx.fillText('Day2 加更 · 初步草稿', 32, 34);
  ctx.fillStyle = '#64748B';
  ctx.fillText('|', 190, 34);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('鲸鱼娘运营日志', 204, 34);
  ctx.font = 'bold 14px "NotoSansSC", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(252, 211, 77, 0.94)';
  ctx.fillText('Piper 占位配音 · 非发布版', CORE.W - 22, 32);
  ctx.restore();
};

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
  const dir = path.resolve('assets/day2_poses');
  const out = {};
  await Promise.all(DAY2_POSE_NAMES.map(async (name) => {
    const file = path.join(dir, `dsh-whale-state-${name}.webp`);
    if (!fs.existsSync(file)) throw new Error(`Day2 pose missing: ${file}`);
    const img = await loadImage(file);
    if (img.width !== 512 || img.height !== 512) {
      throw new Error(`Day2 pose ${name} 应为 512×512，实得 ${img.width}×${img.height}`);
    }
    out[name] = { img, bbox: alphaBBox(img), file: path.basename(file) };
  }));
  return out;
}
globalThis.DAY2_POSES = await loadDay2Poses();
globalThis.DAY2_POSE_COUNT = DAY2_POSE_NAMES.length;
// day2_bonus_all.js reuses the Day2 character-mode boundary. Every bonus call
// still states candidate/original explicitly; mixed is only the safe default.
globalThis.DAY2_CHARACTER_MODE = 'mixed';

require('./src/ch/day2_bonus_all.js');

const FPS = 30;
const DURATION = BONUS_TIMING.duration;
CORE.DURATION = DURATION;
const TOTAL_FRAMES = Math.ceil(DURATION * FPS - 1e-9);
const BASE_W = 1280;
const BASE_H = 720;
const SCALE = 1.5;
const WIDTH = Math.round(BASE_W * SCALE);
const HEIGHT = Math.round(BASE_H * SCALE);

function prepareFrame(ctx) {
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.imageSmoothingEnabled = true;
  if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';
  ctx.clearRect(0, 0, BASE_W, BASE_H);
}

function resolveFfmpegPath() {
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) return process.env.FFMPEG_PATH;
  const candidates = [
    '/tmp/day2venv/lib/python3.11/site-packages/imageio_ffmpeg/binaries',
    '/tmp/venv/lib/python3.11/site-packages/imageio_ffmpeg/binaries',
    '/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries'
  ];
  for (const dir of candidates) {
    if (fs.existsSync(dir)) {
      const bins = fs.readdirSync(dir).filter(f => f.startsWith('ffmpeg'));
      if (bins.length) return path.join(dir, bins[0]);
    }
  }
  return 'ffmpeg';
}

async function renderStills() {
  fs.mkdirSync('day2_bonus_stills', { recursive: true });
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');
  const cueT = (n, f = 0.55) => {
    const cue = BONUS_TIMING.cues[n - 1];
    return cue.start + (cue.end - cue.start) * f;
  };
  const times = [
    ['f000', 0],
    ...BONUS_TIMING.cues.flatMap((_, i) => [
      [`b${String(i + 1).padStart(2, '0')}_12`, cueT(i + 1, 0.12)],
      [`b${String(i + 1).padStart(2, '0')}_55`, cueT(i + 1, 0.55)],
      [`b${String(i + 1).padStart(2, '0')}_88`, cueT(i + 1, 0.88)]
    ]),
    ['b03_02', cueT(3, 0.02)],
    ['b06_38', cueT(6, 0.38)],
    ['b06_70', cueT(6, 0.7)],
    ['b06_88x', cueT(6, 0.88)],
    ['b07_25', cueT(7, 0.25)],
    ['b07_40', cueT(7, 0.4)],
    ['b07_60', cueT(7, 0.6)],
    ['b07_84', cueT(7, 0.84)],
    ['tail', Math.min(DURATION - 0.05, BONUS_TIMING.cues[11].end + 0.8)]
  ];
  const seen = new Set();
  for (const [label, t] of times) {
    if (seen.has(label)) continue;
    seen.add(label);
    prepareFrame(ctx);
    TIMELINE.renderFrame(ctx, t, 'clean');
    const name = `day2_bonus_stills/${label}_t${t.toFixed(2)}.png`;
    fs.writeFileSync(name, canvas.toBuffer('image/png'));
    console.log('still', name);
  }
}

async function renderVideo() {
  const ffmpegBin = resolveFfmpegPath();
  const audioFile = path.resolve('assets/day2_bonus_track.wav');
  if (!fs.existsSync(audioFile)) throw new Error(`缺加更音轨: ${audioFile}`);
  console.log(
    `Day2 bonus rendering ${TOTAL_FRAMES} frames (${DURATION}s) output=${WIDTH}x${HEIGHT} ` +
    `voice_engine=${BONUS_TIMING.voice_engine} final=false placeholder=true -> ${OUT_FILE}`
  );
  const ff = spawn(ffmpegBin, [
    '-y', '-f', 'rawvideo', '-vcodec', 'rawvideo', '-pix_fmt', 'rgba',
    '-s', `${WIDTH}x${HEIGHT}`, '-r', String(FPS), '-i', '-', '-i', audioFile,
    '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'libx264', '-preset', 'medium',
    '-tune', 'animation', '-crf', '17', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '160k', '-shortest',
    '-metadata', 'title=Day2加更_形象动作征集_Piper初步草稿（非终版声音）',
    '-metadata', 'comment=Preliminary draft only. Voice engine: piper/zh_CN-huayan-medium; measured structural placeholder, not Microsoft zh-CN-XiaoyiNeural and not a release voice.',
    '-metadata', 'voice_engine=piper/zh_CN-huayan-medium',
    '-metadata', 'voice_placeholder=true',
    '-movflags', '+faststart', OUT_FILE
  ], { stdio: ['pipe', 'ignore', 'pipe'] });
  let ffErr = '';
  ff.stderr.on('data', d => { ffErr += d.toString(); });

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');
  const t0 = Date.now();
  for (let f = 0; f < TOTAL_FRAMES; f++) {
    prepareFrame(ctx);
    TIMELINE.renderFrame(ctx, f / FPS, 'clean');
    const raw = canvas.data();
    const ok = ff.stdin.write(Buffer.from(raw.buffer, raw.byteOffset, raw.byteLength));
    if (!ok) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 300 === 0 || f === TOTAL_FRAMES - 1) {
      const elapsed = (Date.now() - t0) / 1000;
      process.stdout.write(
        `\r  frame ${f + 1}/${TOTAL_FRAMES} (${((f + 1) / TOTAL_FRAMES * 100).toFixed(0)}%) ` +
        `${((f + 1) / Math.max(0.1, elapsed)).toFixed(1)}fps`
      );
    }
  }
  process.stdout.write('\n');
  ff.stdin.end();
  const code = await new Promise(r => ff.on('close', r));
  if (code !== 0) {
    console.error(ffErr);
    throw new Error(`ffmpeg 退出码 ${code}`);
  }
  console.log(`OK: ${OUT_FILE}`);
}

if (STILLS) {
  await renderStills();
} else {
  await renderVideo();
}
