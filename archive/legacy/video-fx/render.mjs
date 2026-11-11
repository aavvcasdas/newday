// render.mjs — Deterministic 30fps MP4 & Character Sheet Renderer
// Architecture modeled after JohnHeibel/PDoomVideo & ClaudeAnimationBase, powered by @napi-rs/canvas + ffmpeg.
// Usage:
//   node render.mjs --style pixel --out whale_mv_pixel.mp4
//   node render.mjs --style watercolor --out whale_mv_watercolor.mp4
//   node render.mjs --style director --out whale_mv_multistyle.mp4
//   node render.mjs --sheets

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

let canvasPkg;
try {
  canvasPkg = require('@napi-rs/canvas');
} catch {
  canvasPkg = require('/tmp/node_render/node_modules/@napi-rs/canvas');
}
const { createCanvas, GlobalFonts } = canvasPkg;

GlobalFonts.registerFromPath(path.resolve('assets/fonts/ZCOOLKuaiLe-Regular.ttf'), 'ZCOOLKuaiLe');
GlobalFonts.registerFromPath(path.resolve('assets/fonts/NotoSansSC-Bold.ttf'), 'NotoSansSC');
GlobalFonts.registerFromPath(path.resolve('assets/fonts/Silkscreen-Regular.ttf'), 'Silkscreen');

globalThis.window = globalThis;
require('./assets/audio_envelope.js');
const CORE = require('./src/core.js');
require('./src/whale_girl_rig_data.js');
const ACTIONS = require('./src/whale_girl_actions.js');
const WHALE = require('./src/whale_girl.js');
const CLAWD = require('./src/clawd.js');
const CAST = require('./src/cast.js');
const LYRICS = require('./src/lyrics.js');
const PROPS = require('./src/props.js');
const TIMELINE = require('./src/timeline.js');
require('./src/ch/c01_debut.js');
require('./src/ch/c02_handover.js');
require('./src/ch/c03_rules.js');
require('./src/ch/c04_rivalry_finale.js');

const FPS = 30;
const DURATION = CORE.DURATION; // 82.50s
const TOTAL_FRAMES = Math.round(DURATION * FPS); // 2475 frames

function resolveFfmpegPath() {
  const venvDir = '/tmp/venv/lib/python3.11/site-packages/imageio_ffmpeg/binaries';
  if (fs.existsSync(venvDir)) {
    const bins = fs.readdirSync(venvDir).filter(f => f.startsWith('ffmpeg'));
    if (bins.length) return path.join(venvDir, bins[0]);
  }
  return 'ffmpeg';
}

async function renderSheets() {
  fs.mkdirSync('characters', { recursive: true });
  fs.mkdirSync('docs', { recursive: true });
  const c = createCanvas(1280, 720);
  const ctx = c.getContext('2d');

  CAST.renderEmotionsSheet(ctx, 1.2, 'watercolor');
  fs.writeFileSync('docs/emotions.png', c.toBuffer('image/png'));
  fs.writeFileSync('characters/whale_girl_emotions_31.png', c.toBuffer('image/png'));

  CAST.renderViewsSheet(ctx, 1.2, 'watercolor');
  fs.writeFileSync('docs/views.png', c.toBuffer('image/png'));
  fs.writeFileSync('characters/whale_girl_views_hats.png', c.toBuffer('image/png'));

  CAST.renderCharacterSheet(ctx, 1.2, 'whale_poses', 'pixel');
  fs.writeFileSync('characters/whale_girl_poses_pixel.png', c.toBuffer('image/png'));

  CAST.renderCharacterSheet(ctx, 1.2, 'whale_poses', 'watercolor');
  fs.writeFileSync('characters/whale_girl_poses_hd.png', c.toBuffer('image/png'));

  CAST.renderCharacterSheet(ctx, 1.2, 'whale_styles', 'watercolor');
  fs.writeFileSync('characters/whale_girl_styles.png', c.toBuffer('image/png'));

  CAST.renderCharacterSheet(ctx, 1.2, 'all_cast', 'watercolor');
  fs.writeFileSync('characters/all_cast_sheet.png', c.toBuffer('image/png'));

  const ca = createCanvas(1920, 1160);
  const ctxA = ca.getContext('2d');
  ACTIONS.renderActionsSheet(ctxA, 1920, 1160);
  const actBuf = ca.toBuffer('image/png');
  fs.writeFileSync('docs/actions.png', actBuf);
  fs.writeFileSync('characters/whale_girl_actions_sheet.png', actBuf);

  console.log('Saved ClaudeAnimationBase / PDoomVideo character & 28-action sheets to docs/*.png and characters/*.png');
}

async function renderVideo(style = 'pixel', outFile = 'whale_mv_pixel.mp4') {
  const ffmpegBin = resolveFfmpegPath();
  const audioFile = path.resolve('assets/whale_mv.mp3');

  console.log(`Rendering ${TOTAL_FRAMES} frames (${DURATION}s @ ${FPS}fps) in style='${style}' -> ${outFile}`);

  const ffArgs = [
    '-y',
    '-f', 'rawvideo',
    '-vcodec', 'rawvideo',
    '-pix_fmt', 'rgba',
    '-s', '1280x720',
    '-r', String(FPS),
    '-i', '-',
    '-i', audioFile,
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '24',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '160k',
    '-shortest',
    '-movflags', '+faststart',
    outFile
  ];

  const ff = spawn(ffmpegBin, ffArgs, { stdio: ['pipe', 'ignore', 'pipe'] });
  let ffErr = '';
  ff.stderr.on('data', d => { ffErr += d.toString(); });

  const c = createCanvas(1280, 720);
  const ctx = c.getContext('2d');
  const t0 = Date.now();

  for (let f = 0; f < TOTAL_FRAMES; f++) {
    const t = f / FPS;
    TIMELINE.renderFrame(ctx, t, style);
    const raw = c.data();
    const ok = ff.stdin.write(Buffer.from(raw.buffer, raw.byteOffset, raw.byteLength));
    if (!ok) {
      await new Promise(r => ff.stdin.once('drain', r));
    }
    if (f % 300 === 0 || f === TOTAL_FRAMES - 1) {
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      const fpsRate = ((f + 1) / Math.max(0.1, (Date.now() - t0) / 1000)).toFixed(1);
      process.stdout.write(`\r  [${style}] frame ${f + 1}/${TOTAL_FRAMES} (${((f + 1) / TOTAL_FRAMES * 100).toFixed(0)}%) — ${fpsRate} fps (${elapsed}s)`);
    }
  }
  process.stdout.write('\n');
  ff.stdin.end();

  const code = await new Promise(r => ff.on('close', r));
  if (code !== 0) {
    console.error(ffErr);
    throw new Error(`ffmpeg exited with code ${code}`);
  }
  const sizeMB = (fs.statSync(outFile).size / 1e6).toFixed(2);
  console.log(`✓ Wrote ${outFile} (${sizeMB} MB)`);
}

const args = process.argv.slice(2);
if (args.includes('--sheets')) {
  await renderSheets();
} else {
  const styleIdx = args.indexOf('--style');
  const outIdx = args.indexOf('--out');
  const style = styleIdx >= 0 ? args[styleIdx + 1] : 'pixel';
  const outFile = outIdx >= 0 ? args[outIdx + 1] : `whale_mv_${style}.mp4`;
  await renderVideo(style, outFile);
}
