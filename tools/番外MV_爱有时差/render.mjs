// Frame-by-frame exporter. Method reference: world-execute-me-lyric-mv (MIT):
// deterministic browser frames streamed to ffmpeg; no real-time screen capture.
// Export path: browser renders the 3D scene at 960x540 and POSTs raw RGBA;
// Node composites it to 1920x1080 and draws crisp vector overlays with the
// shared Day2 subtitle component, then pipes raw RGBA to ffmpeg.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createCanvas, loadImage, GlobalFonts, ImageData } from '@napi-rs/canvas';
import { startServer } from './server.mjs';
import { launchBrowser } from './browser.mjs';
import * as overlay from './src/overlay.js';
import { createDay2Subtitle } from '../字幕/day2_style_sub.mjs';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const argv = process.argv.slice(2);
const STORY = argv.includes('--storyboard');
const OUT_DIR = path.join(ROOT, '番外MV');
const FINAL = path.join(OUT_DIR, '成片/把回忆拼好给你_AI娘全员番外.mp4');
const timeline = JSON.parse(fs.readFileSync(path.join(HERE, 'data/timeline.json'), 'utf8'));
const shots = JSON.parse(fs.readFileSync(path.join(HERE, 'data/shots.json'), 'utf8')).shots;
const palette = JSON.parse(fs.readFileSync(path.join(HERE, 'data/palette.json'), 'utf8'));
const FPS = timeline.fps, TOTAL = timeline.frames;
const LIMIT = process.env.MV_MAX_FRAMES ? Math.min(TOTAL, parseInt(process.env.MV_MAX_FRAMES, 10)) : TOTAL;
const W = 1920, H = 1080, SW = 960, SH = 540;

const SHOTS = shots.map((s, i) => ({ ...s, index: i, start: i === 0 ? 0 : timeline.cues[i].start, end: i + 1 < shots.length ? timeline.cues[i + 1].start : timeline.duration }));
const shotAt = t => SHOTS.find(s => t >= s.start && t < s.end) || SHOTS[SHOTS.length - 1];
const cueAt = t => timeline.cues.find(c => t >= c.start && t < c.end) || null;

const FONT_DIR = path.join(ROOT, 'video-fx/assets/fonts');
GlobalFonts.registerFromPath(path.join(FONT_DIR, 'NotoSansSC-Bold.ttf'), 'Noto Sans SC');
GlobalFonts.registerFromPath(path.join(FONT_DIR, 'ZCOOLKuaiLe-Regular.ttf'), 'ZCOOL KuaiLe');
GlobalFonts.registerFromPath(path.join(FONT_DIR, 'Silkscreen-Regular.ttf'), 'Silkscreen');
const measure = createCanvas(8, 8).getContext('2d');
const SUB = createDay2Subtitle({ measureCtx: measure, fontOf: (px, weight) => `${weight} ${px}px "Noto Sans SC"` });

const sceneCanvas = createCanvas(SW, SH);
const sceneCtx = sceneCanvas.getContext('2d');
const outCanvas = createCanvas(W, H);
const outCtx = outCanvas.getContext('2d');
const blurCanvas = createCanvas(480, 270);
const blurCtx = blurCanvas.getContext('2d');

function composite(buf, f) {
  const t = f / FPS;
  const shot = shotAt(t);
  const cue = cueAt(t);
  const id = new ImageData(new Uint8ClampedArray(buf.buffer, buf.byteOffset, buf.length), SW, SH);
  sceneCtx.putImageData(id, 0, 0);
  const pal = palette[shot.set];
  overlay.drawBackdrop(outCtx, W, H, pal, t, pal.stars);
  outCtx.drawImage(sceneCanvas, 0, 0, W, H);
  overlay.drawVignette(outCtx, W, H);
  overlay.drawTransition(outCtx, shot, t, W, H);
  overlay.drawKeyword(outCtx, shot, t, W, H);
  overlay.drawSubtitle(outCtx, SUB, cue, t, W, H);
  overlay.drawBadge(outCtx, W, H);
  return outCanvas.data();
}

function ffmpegBin() {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  const pythons = [process.env.PYTHON, '/home/user/.cache/mv-venv/bin/python', 'python3', 'python'].filter(Boolean);
  for (const py of pythons) {
    try {
      return execFileSync(py, ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    } catch {}
  }
  return 'ffmpeg';
}

let ff = null;
let sinkError = null;
let frameIndex = 0;
const { server, url } = await startServer({
  port: 0,
  onFrame: STORY ? null : (buf) => new Promise((res, rej) => {
    if (sinkError) return rej(sinkError);
    if (!ff || !ff.stdin.writable) return rej(new Error('ffmpeg not ready'));
    if (buf.length !== SW * SH * 4) return rej(new Error(`bad scene frame ${buf.length}`));
    const full = composite(buf, frameIndex++);
    ff.stdin.write(full, e => e ? rej(e) : res());
  }),
});
const browser = await launchBrowser();
let page;
try {
  page = await browser.newPage({ viewport: { width: W, height: H } });
  page.on('pageerror', e => console.error('[pageerror]', e.message));
  page.on('console', m => { if (m.type() === 'error') console.error('[console]', m.text()); });
  await page.goto(`${url}/?export=1`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__mv && window.__mv.ready, null, { timeout: 120000 });
  console.log('renderer:', await page.evaluate(() => window.__mv.renderer));

  async function frame(t) {
    const dataUrl = await page.evaluate((time) => window.__mv.exportFrame(time), t);
    return Buffer.from(dataUrl.split(',')[1], 'base64');
  }

  if (STORY) {
    fs.mkdirSync(path.join(OUT_DIR, '分镜'), { recursive: true });
    const times = timeline.cues.map((c, i) => i === 0 ? 2.2 : (c.start + c.end) / 2);
    const cols = 4, cw = 480, ch = 270, label = 34;
    const sheet = createCanvas(cols * cw, Math.ceil(times.length / cols) * (ch + label));
    const s = sheet.getContext('2d');
    s.fillStyle = '#111622'; s.fillRect(0, 0, sheet.width, sheet.height);
    for (let i = 0; i < times.length; i++) {
      const buf = await frame(times[i]);
      fs.writeFileSync(path.join(OUT_DIR, '分镜', `${shots[i].id}_${shots[i].keyword}.png`), buf);
      const img = await loadImage(buf);
      const x = (i % cols) * cw, y = Math.floor(i / cols) * (ch + label);
      s.drawImage(img, x, y, cw, ch);
      s.fillStyle = '#f6ecd8'; s.font = '18px "Noto Sans SC"';
      s.fillText(`${shots[i].id} · ${shots[i].keyword} · ${times[i].toFixed(2)}s`, x + 10, y + ch + 23);
      console.log('storyboard', shots[i].id, times[i].toFixed(2));
    }
    fs.writeFileSync(path.join(OUT_DIR, '分镜总览.png'), sheet.toBuffer('image/png'));
    fs.writeFileSync(path.join(OUT_DIR, '海报.png'), await frame(timeline.cues[15].start + 1.6));
    console.log('storyboard + poster saved');
  } else {
    await page.evaluate(([w, h]) => window.__mv.setExportSize(w, h), [SW, SH]);
    fs.mkdirSync(path.dirname(FINAL), { recursive: true });
    ff = spawn(ffmpegBin(), [
      '-y', '-hide_banner', '-loglevel', 'error',
      '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-framerate', String(FPS), '-i', 'pipe:0',
      '-i', path.join(ROOT, '《把回忆拼好给你》.mp4'),
      '-map', '0:v:0', '-map', '1:a:0',
      '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '18',
      '-x264-params', 'colorprim=bt709:transfer=bt709:colormatrix=bt709',
      '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
      // Do not use -shortest: the copied HE-AACv2 track can report a slightly
      // shorter duration and would truncate the locked 1346-frame picture.
      '-c:a', 'copy', '-movflags', '+faststart',
      '-metadata', 'title=把回忆拼好给你 · AI娘全员番外',
      '-metadata', 'comment=non-official fan MV; AI-generated; source audio copied; lyric timing from reference-film tiles',
      FINAL,
    ], { stdio: ['pipe', 'inherit', 'inherit'] });
    const done = new Promise((res, rej) => { ff.on('exit', c => c === 0 ? res() : rej(new Error('ffmpeg exit ' + c))); ff.on('error', rej); });
    ff.stdin.on('error', e => { sinkError = e; console.error('[ffmpeg stdin]', e.message); });
    const t0 = Date.now();
    for (let f = 0; f < LIMIT; f++) {
      await page.evaluate((time) => window.__mv.exportSceneRaw(time), f / FPS);
      if ((f + 1) % 120 === 0 || f === LIMIT - 1) {
        const el = (Date.now() - t0) / 1000;
        console.log(`frame ${f + 1}/${LIMIT} (${((f + 1) / LIMIT * 100).toFixed(1)}%) ${el.toFixed(1)}s`);
      }
    }
    ff.stdin.end();
    await done;
    console.log('saved', FINAL, (fs.statSync(FINAL).size / 1048576).toFixed(2), 'MiB');
  }
} finally {
  await browser.close();
  server.close();
}
