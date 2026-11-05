// render_day2.mjs — 【Day 2】主人说我不干活，我打开主人自己的号 · 渲染器
// 用法: node render_day2.mjs [--out whale_day2.mp4] [--style clean]
//       [--character original|candidate|mixed] | --stills
// 默认 clean = 背景/文字原生清晰绘制 + 1920×1080；
// 默认 --character original，继续使用原像素鲸鱼娘，严禁静默替换正式形象。
// candidate 才把本集主角整体切到高清动作候选；mixed 默认原形象，只允许
// 单个镜头用 characterMode:'candidate' 展示候选，适合形象征集加更。
// 前置: gen_day2_finalvoice.py 已生成 src/day2_timing.js、src/lyrics.js、
// assets/day2_track.wav 与 assets/day2_envelope.js。candidate/mixed 还须把
// 快照中的 day2_poses/ 复制到 video-fx 的 assets/day2_poses/。

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
const CHARACTER_MODE = cliValue('--character') || 'original';
if (!['original', 'candidate', 'mixed'].includes(CHARACTER_MODE)) {
  throw new Error(`--character 只接受 original|candidate|mixed，实得 ${CHARACTER_MODE}`);
}
globalThis.DAY2_CHARACTER_MODE = CHARACTER_MODE;

let canvasPkg;
try { canvasPkg = require('@napi-rs/canvas'); }
catch { canvasPkg = require('/tmp/node_render/node_modules/@napi-rs/canvas'); }
const { createCanvas, GlobalFonts, loadImage } = canvasPkg;

GlobalFonts.registerFromPath(path.resolve('assets/fonts/ZCOOLKuaiLe-Regular.ttf'), 'ZCOOLKuaiLe');
GlobalFonts.registerFromPath(path.resolve('assets/fonts/NotoSansSC-Bold.ttf'), 'NotoSansSC');
GlobalFonts.registerFromPath(path.resolve('assets/fonts/Silkscreen-Regular.ttf'), 'Silkscreen');

globalThis.window = globalThis;
require('./assets/audio_envelope.js');
require('./assets/day2_envelope.js'); // 覆盖 AUDIO_DATA 为 Day2 包络
const CORE = require('./src/core.js');
const WHALE_RIG = require('./src/whale_girl_rig_data.js');
// 与 Day1 相同：上游 wink 后发右缘存在硬切，只在本集渲染器内换成 heart 后发。
if (WHALE_RIG?.poses?.wink && WHALE_RIG?.poses?.heart?.backHair) {
  WHALE_RIG.poses.wink.backHair = WHALE_RIG.poses.heart.backHair;
}
// 眼睛白线门禁：保留 wink 的叉腰身体骨骼，但头部改用双眼睁开的 wave 头，
// 避免单眼闭合及自动眨眼的肤色横带。分镜层 safePixelOptions 同时固定
// eyes=open、squint=0.01；只改渲染装配，不改角色原图与已实测时间轴。
if (WHALE_RIG?.poses?.wink && WHALE_RIG?.poses?.wave?.head) {
  WHALE_RIG.poses.wink.head = WHALE_RIG.poses.wave.head;
}
require('./src/whale_girl_actions.js');
require('./src/whale_girl.js');
require('./src/clawd.js');
require('./src/cast.js');
const LYRICS = require('./src/lyrics.js');
const drawSubtitleBarBase = LYRICS.drawSubtitleBar;
LYRICS.drawSubtitleBar = (ctx, t, style = 'clean') => {
  // L01 must be readable on frame 0; hold the upstream 0.14s enter animation
  // at its completed state for the first few frames instead of fading in.
  const subtitleT = t < 0.141 ? 0.141 : t;
  drawSubtitleBarBase(ctx, subtitleT, style === 'clean' ? 'pixel' : style);
};
const PROPS = require('./src/props.js');
const TIMELINE = require('./src/timeline.js');
const DAY2_TIMING = require('./src/day2_timing.js');

// Day2 专用 HUD：只保留小号集数与合规标识，不画全屏集名卡。
PROPS.drawTopHud = (ctx) => {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(18, 16, 310, 36, 10);
  ctx.fillStyle = 'rgba(11, 29, 58, 0.94)';
  ctx.fill();
  ctx.strokeStyle = '#48C8FF';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.font = 'bold 15px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = CORE.PAL.gold;
  ctx.fillText('Day 2 · AI 接管中', 32, 34);
  ctx.fillStyle = '#64748B';
  ctx.fillText('|', 164, 34);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('鲸鱼娘运营日志', 178, 34);
  ctx.font = 'bold 14px "NotoSansSC", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(226, 232, 240, 0.88)';
  ctx.fillText('非官方同人 · AI 生成内容', CORE.W - 22, 32);
  ctx.restore();
};

// 高清动作候选姿势库：源文件为 512×512 WebP。candidate/mixed 启动时逐张
// 测 alpha 包围盒，分镜层只按包围盒做脚底锚定和等高缩放，姿势/表情整图
// 切换。original 不加载这批候选素材，原像素路径另有白眼净化。素材来源/
// 许可见快照 day2_poses/。
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
    if (!fs.existsSync(file)) {
      throw new Error(
        `Day2 pose missing: ${file} — 请把 video-fx源码快照/day2_poses/ ` +
        '整目录复制到 video-fx 的 assets/day2_poses/'
      );
    }
    const img = await loadImage(file);
    if (img.width !== 512 || img.height !== 512) {
      throw new Error(`Day2 pose ${name} 应为 512×512，实得 ${img.width}×${img.height}`);
    }
    out[name] = { img, bbox: alphaBBox(img), file: path.basename(file) };
  }));
  return out;
}
const SHOULD_LOAD_CANDIDATE_POSES = CHARACTER_MODE !== 'original';
globalThis.DAY2_POSES = SHOULD_LOAD_CANDIDATE_POSES ? await loadDay2Poses() : {};
globalThis.DAY2_POSE_COUNT = SHOULD_LOAD_CANDIDATE_POSES ? DAY2_POSE_NAMES.length : 0;

require('./src/ch/day2_all.js');

const FPS = 30;
const DURATION = DAY2_TIMING.duration;
CORE.DURATION = DURATION;
const TOTAL_FRAMES = Math.round(DURATION * FPS);

const BASE_W = 1280;
const BASE_H = 720;
const DEFAULT_STYLE = 'clean';
function renderScaleFor(style) {
  return style === 'clean' ? 1.5 : 1;
}
function outputSizeFor(style) {
  const scale = renderScaleFor(style);
  return { scale, width: Math.round(BASE_W * scale), height: Math.round(BASE_H * scale) };
}
function prepareFrame(ctx, style) {
  const { scale } = outputSizeFor(style);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.imageSmoothingEnabled = style !== 'pixel';
  if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';
  ctx.clearRect(0, 0, BASE_W, BASE_H);
}

function resolveFfmpegPath() {
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH;
  }
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
  fs.mkdirSync('day2_stills', { recursive: true });
  const { width, height } = outputSizeFor(DEFAULT_STYLE);
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  const cueT = (n, f = 0.55) => {
    const cue = DAY2_TIMING.cues[n - 1];
    return cue.start + (cue.end - cue.start) * f;
  };
  const times = [
    ['f000', 0],
    ['l01_10', cueT(1, 0.1)],
    ['l01_55', cueT(1, 0.55)],
    ['l01_90', cueT(1, 0.9)],
    ...DAY2_TIMING.cues.map((_, i) => [`l${String(i + 1).padStart(2, '0')}_55`, cueT(i + 1, 0.55)]),
    ['l03_70', cueT(3, 0.7)],
    ['l03_92', cueT(3, 0.92)],
    ['l09_45', cueT(9, 0.45)],
    ['l10_88', cueT(10, 0.88)],
    ['l11_88', cueT(11, 0.88)],
    ['l12_18', cueT(12, 0.18)],
    ['l14_18', cueT(14, 0.18)],
    ['l14_50', cueT(14, 0.5)],
    ['l15_62', cueT(15, 0.62)],
    ['l17_20', cueT(17, 0.2)],
    ['l17_72', cueT(17, 0.72)],
    ['l17_88', cueT(17, 0.88)],
    ['l17_96', cueT(17, 0.96)],
    ['l17_99', cueT(17, 0.99)],
    ['endcard', DAY2_TIMING.endcard[0] + 1.2]
  ];
  const seen = new Set();
  for (const [label, t] of times) {
    if (seen.has(label)) continue;
    seen.add(label);
    prepareFrame(ctx, DEFAULT_STYLE);
    TIMELINE.renderFrame(ctx, t, DEFAULT_STYLE);
    const name = `day2_stills/${label}_t${t.toFixed(2)}.png`;
    fs.writeFileSync(name, canvas.toBuffer('image/png'));
    console.log('still', name);
  }
}

async function renderVideo(style, outFile) {
  const ffmpegBin = resolveFfmpegPath();
  const audioFile = path.resolve('assets/day2_track.wav');
  if (!DAY2_TIMING.voice || DAY2_TIMING.measured !== true) {
    throw new Error('DAY2_TIMING 没有实测人声音轨，禁止渲染');
  }
  if (Number(DAY2_TIMING.title_len || 0) !== 0 || DAY2_TIMING.cues?.[0]?.start !== 0) {
    throw new Error('Day2 冷开场门禁失败：必须 title_len=0 且 L01.start=0');
  }
  const { width, height, scale } = outputSizeFor(style);
  const isClean = style === 'clean';
  console.log(
    `Day2 rendering ${TOTAL_FRAMES} frames (${DURATION}s) style=${style} character=${CHARACTER_MODE} ` +
    `output=${width}x${height} scale=${scale} voice_engine=${DAY2_TIMING.voice_engine} ` +
    `synthesis_engine_verified=${DAY2_TIMING.synthesis_engine_verified === true} -> ${outFile}`
  );
  const ff = spawn(ffmpegBin, [
    '-y', '-f', 'rawvideo', '-vcodec', 'rawvideo', '-pix_fmt', 'rgba',
    '-s', `${width}x${height}`, '-r', String(FPS), '-i', '-', '-i', audioFile,
    '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'libx264', '-preset', isClean ? 'medium' : 'fast',
    '-tune', isClean ? 'animation' : 'fastdecode',
    '-crf', isClean ? '17' : '24', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k',
    '-shortest', '-movflags', '+faststart', outFile
  ], { stdio: ['pipe', 'ignore', 'pipe'] });
  let ffErr = '';
  ff.stderr.on('data', d => { ffErr += d.toString(); });

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  const t0 = Date.now();
  for (let f = 0; f < TOTAL_FRAMES; f++) {
    prepareFrame(ctx, style);
    TIMELINE.renderFrame(ctx, f / FPS, style);
    const raw = canvas.data();
    const ok = ff.stdin.write(Buffer.from(raw.buffer, raw.byteOffset, raw.byteLength));
    if (!ok) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 300 === 0 || f === TOTAL_FRAMES - 1) {
      const elapsed = (Date.now() - t0) / 1000;
      process.stdout.write(
        `\r  frame ${f + 1}/${TOTAL_FRAMES} ` +
        `(${((f + 1) / TOTAL_FRAMES * 100).toFixed(0)}%) ` +
        `${((f + 1) / Math.max(0.1, elapsed)).toFixed(1)}fps`
      );
    }
  }
  process.stdout.write('\n');
  ff.stdin.end();
  const code = await new Promise(r => ff.on('close', r));
  if (code !== 0) {
    console.error(ffErr);
    throw new Error(`ffmpeg exited ${code}`);
  }
  console.log(`✓ Wrote ${outFile} (${(fs.statSync(outFile).size / 1e6).toFixed(2)} MB)`);
}

const args = process.argv.slice(2);
if (args.includes('--stills')) {
  await renderStills();
} else {
  const styleIdx = args.indexOf('--style');
  const outIdx = args.indexOf('--out');
  await renderVideo(
    styleIdx >= 0 ? args[styleIdx + 1] : DEFAULT_STYLE,
    outIdx >= 0 ? args[outIdx + 1] : 'whale_day2.mp4'
  );
}
