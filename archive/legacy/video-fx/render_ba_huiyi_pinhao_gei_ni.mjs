// render_ba_huiyi_pinhao_gei_ni.mjs — Deterministic 30fps Renderer for:
//   《椰子水很甜 - 把回忆拼好给你（纯享Beat）》(142.11s, 30fps, 1280x720)
// Follows the `tuzhechen2005/opus-video-skills` review loop:
//   1. Renders a 25-panel storyboard contact sheet (`docs/mv_ba_huiyi_pinhao_gei_ni_storyboard.png`)
//   2. Renders a 12-panel locomotion & action strip (`docs/mv_ba_huiyi_walk_run_strip.png`)
//   3. Encodes the full 142.11s MP4 (`mv_ba_huiyi_pinhao_gei_ni_whale_girl.mp4`)

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
require('./assets/ba_huiyi_pinhao_gei_ni_audio.js');
const CORE = require('./src/core.js');
require('./src/whale_girl_rig_data.js');
require('./src/whale_girl_actions.js');
const WHALE = require('./src/whale_girl.js');
const CLAWD = require('./src/clawd.js');
const CAST = require('./src/cast.js');
const MV = require('./src/mv_ba_huiyi_pinhao_gei_ni.js');

const FPS = 30;
const DURATION = MV.DURATION; // 142.11s
const TOTAL_FRAMES = Math.round(DURATION * FPS); // 4263 frames

function resolveFfmpegPath() {
  const venvDir = '/tmp/venv/lib/python3.11/site-packages/imageio_ffmpeg/binaries';
  if (fs.existsSync(venvDir)) {
    const bins = fs.readdirSync(venvDir).filter(f => f.startsWith('ffmpeg'));
    if (bins.length) return path.join(venvDir, bins[0]);
  }
  return 'ffmpeg';
}

function renderStoryboardSheet(outFile = 'docs/mv_ba_huiyi_pinhao_gei_ni_storyboard.png') {
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  const keyTimes = [
    1.5,   4.2,   6.8,   9.2,   12.8,
    17.5,  20.5,  23.0,  28.0,  32.5,
    38.0,  43.0,  48.0,  53.0,  58.0,
    63.5,  68.5,  73.8,  78.5,  84.0,
    89.0,  94.0,  104.0, 116.0, 136.0
  ];
  const cols = 5, rows = 5;
  const cellW = 256, cellH = 144;
  const sheet = createCanvas(cellW * cols, cellH * rows);
  const sctx = sheet.getContext('2d');

  const frameCanvas = createCanvas(1280, 720);
  const fctx = frameCanvas.getContext('2d');

  for (let i = 0; i < keyTimes.length; i++) {
    const t = keyTimes[i];
    fctx.clearRect(0, 0, 1280, 720);
    MV.renderBaHuiyiFrame(fctx, t);
    const gx = (i % cols) * cellW;
    const gy = Math.floor(i / cols) * cellH;
    sctx.drawImage(frameCanvas, 0, 0, 1280, 720, gx, gy, cellW, cellH);
    sctx.fillStyle = 'rgba(0,0,0,0.72)';
    sctx.fillRect(gx + 5, gy + 5, 92, 20);
    sctx.font = 'bold 12px "Silkscreen", monospace';
    sctx.fillStyle = '#FACC15';
    sctx.fillText(`#${String(i + 1).padStart(2, '0')} ${t.toFixed(1)}s`, gx + 9, gy + 19);
  }

  fs.writeFileSync(outFile, sheet.toBuffer('image/png'));
  console.log(`Saved 5x5 storyboard sheet -> ${outFile}`);
}

function renderLocomotionStrip(outFile = 'docs/mv_ba_huiyi_walk_run_strip.png') {
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  // 12 moments showing walking stride, kneeling pickup, tail-cushion sitting, fast run with smear, jump, and finale (Whale Maid Girl is the only character).
  const stripTimes = [
    0.8,  1.3,  1.8,  2.3,   // Row 1: Beach walk cycle (`stroll` stride + emotion transitions)
    3.2,  3.7,  4.2,  6.5,   // Row 2: Kneeling pickup (`kneel`) + tail-cushion sitting (solo protagonist)
    14.0, 29.0, 29.6, 140.2  // Row 3: Parabolic leap (`jumpJoy`), Fast run (`runRight` + smear), Grand Finale
  ];
  const cols = 4, rows = 3;
  const cellW = 320, cellH = 180;
  const sheet = createCanvas(cellW * cols, cellH * rows);
  const sctx = sheet.getContext('2d');

  const frameCanvas = createCanvas(1280, 720);
  const fctx = frameCanvas.getContext('2d');

  for (let i = 0; i < stripTimes.length; i++) {
    const t = stripTimes[i];
    fctx.clearRect(0, 0, 1280, 720);
    MV.renderBaHuiyiFrame(fctx, t);
    const gx = (i % cols) * cellW;
    const gy = Math.floor(i / cols) * cellH;
    sctx.drawImage(frameCanvas, 0, 0, 1280, 720, gx, gy, cellW, cellH);
    sctx.fillStyle = 'rgba(0,0,0,0.72)';
    sctx.fillRect(gx + 6, gy + 6, 86, 22);
    sctx.font = 'bold 13px "Silkscreen", monospace';
    sctx.fillStyle = '#38BDF8';
    sctx.fillText(`t=${t.toFixed(1)}s`, gx + 10, gy + 21);
  }

  fs.writeFileSync(outFile, sheet.toBuffer('image/png'));
  console.log(`Saved 4x3 locomotion strip -> ${outFile}`);
}

async function renderVideo(outFile = 'mv_ba_huiyi_pinhao_gei_ni_whale_girl.mp4') {
  const ffmpegBin = resolveFfmpegPath();
  const rootMp3 = path.resolve('椰子水很甜 - 把回忆拼好给你（纯享Beat）.mp3');
  const audioFile = fs.existsSync(rootMp3) ? rootMp3 : path.resolve('assets/ba_huiyi_pinhao_gei_ni.mp3');

  console.log(`Rendering ${TOTAL_FRAMES} frames (${DURATION}s @ ${FPS}fps) -> ${outFile}`);

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
    '-preset', 'veryfast',
    '-crf', '24',
    '-maxrate', '650k',
    '-bufsize', '1300k',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '192k',
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
    ctx.clearRect(0, 0, 1280, 720);
    MV.renderBaHuiyiFrame(ctx, t);
    const raw = c.data();
    const ok = ff.stdin.write(raw);
    if (!ok) {
      await new Promise(res => ff.stdin.once('drain', res));
    }
    if ((f + 1) % 600 === 0 || f === TOTAL_FRAMES - 1) {
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`  Frame ${f + 1}/${TOTAL_FRAMES} (${((f + 1) / TOTAL_FRAMES * 100).toFixed(0)}%) — ${elapsed}s`);
    }
  }

  ff.stdin.end();
  const code = await new Promise(res => ff.on('close', res));
  if (code !== 0) {
    console.error(ffErr);
    throw new Error(`ffmpeg exited with code ${code}`);
  }
  const stat = fs.statSync(outFile);
  console.log(`Completed ${outFile} (${(stat.size / 1048576).toFixed(2)} MB)`);
}

const args = process.argv.slice(2);
if (args.includes('--sheet-only')) {
  renderStoryboardSheet();
  renderLocomotionStrip();
} else {
  renderStoryboardSheet();
  renderLocomotionStrip();
  await renderVideo('mv_ba_huiyi_pinhao_gei_ni_whale_girl.mp4');
}
