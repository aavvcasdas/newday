// render_chaoxi.mjs — Deterministic 30fps Renderer for 《潮汐》(深海鲸鱼娘 · 荧光深海篇)
// Replicates `潮汐.MP3` (31.84s, 30fps, 1280x720) with `whale_girl` (`src/whale_girl.js`)
// as protagonist, synced to `assets/chaoxi.mp3` & `assets/chaoxi_audio.js`.

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
require('./assets/chaoxi_audio.js');
const CORE = require('./src/core.js');
require('./src/whale_girl_rig_data.js');
require('./src/whale_girl_actions.js');
const WHALE = require('./src/whale_girl.js');
const CLAWD = require('./src/clawd.js');
const CAST = require('./src/cast.js');
require('./src/mv_ba_huiyi_pinhao_gei_ni.js');
const MV = require('./src/mv_chaoxi.js');

const FPS = 30;
const DURATION = MV.DURATION; // 31.84s
const TOTAL_FRAMES = Math.round(DURATION * FPS); // 955 frames

function resolveFfmpegPath() {
  const venvDir = '/tmp/venv/lib/python3.11/site-packages/imageio_ffmpeg/binaries';
  if (fs.existsSync(venvDir)) {
    const bins = fs.readdirSync(venvDir).filter(f => f.startsWith('ffmpeg'));
    if (bins.length) return path.join(venvDir, bins[0]);
  }
  return 'ffmpeg';
}

function renderStoryboardSheet(outFile = 'docs/mv_chaoxi_storyboard.png') {
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  const keyTimes = [
    1.2,  3.2,  5.0,  7.2,
    9.0,  11.0, 13.0, 15.2,
    17.0, 19.2, 21.2, 23.2,
    25.0, 27.0, 29.0, 31.0
  ];
  const cellW = 320, cellH = 180;
  const sheet = createCanvas(cellW * 4, cellH * 4);
  const sctx = sheet.getContext('2d');

  const frameCanvas = createCanvas(1280, 720);
  const fctx = frameCanvas.getContext('2d');

  for (let i = 0; i < keyTimes.length; i++) {
    const t = keyTimes[i];
    fctx.clearRect(0, 0, 1280, 720);
    MV.renderChaoxiFrame(fctx, t);
    const gx = (i % 4) * cellW;
    const gy = Math.floor(i / 4) * cellH;
    sctx.drawImage(frameCanvas, 0, 0, 1280, 720, gx, gy, cellW, cellH);
    sctx.fillStyle = 'rgba(0,0,0,0.68)';
    sctx.fillRect(gx + 6, gy + 6, 86, 22);
    sctx.font = 'bold 13px "Silkscreen", monospace';
    sctx.fillStyle = '#22D3EE';
    sctx.fillText(`t=${t.toFixed(1)}s`, gx + 10, gy + 21);
  }

  fs.writeFileSync(outFile, sheet.toBuffer('image/png'));
  console.log(`Saved 4x4 storyboard sheet -> ${outFile}`);
}

async function renderVideo(outFile = 'mv_chaoxi_whale_girl.mp4') {
  const ffmpegBin = resolveFfmpegPath();
  const audioFile = path.resolve('assets/chaoxi.mp3');

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
    '-crf', '23',
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
    MV.renderChaoxiFrame(ctx, t);
    const raw = c.data();
    const ok = ff.stdin.write(raw);
    if (!ok) {
      await new Promise(res => ff.stdin.once('drain', res));
    }
    if ((f + 1) % 300 === 0 || f === TOTAL_FRAMES - 1) {
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
} else {
  renderStoryboardSheet();
  await renderVideo('mv_chaoxi_whale_girl.mp4');
}
