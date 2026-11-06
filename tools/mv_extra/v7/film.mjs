/**
 * film.mjs — Main 1080p30 Pure Deterministic Frame Renderer & FFmpeg Mux Pipeline for v7.
 * Usage:
 *   node tools/mv_extra/v7/film.mjs stills   # Cast sheet + 32-shot sheet + 16-line strips + covers
 *   node tools/mv_extra/v7/film.mjs sample   # 15.77s voiced chorus highlight preview MP4
 *   node tools/mv_extra/v7/film.mjs render   # Full 56.033s (1681-frame) master MP4 (-c:a copy original AAC)
 *   node tools/mv_extra/v7/film.mjs all      # Run stills + sample + full master render
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

import { ROOT, createCanvas, renderCastSheet } from './actors.mjs';
import {
  FPS,
  TOTAL_FRAMES,
  DURATION,
  SAMPLE_START_FRAME,
  SAMPLE_END_FRAME,
  SAMPLE_FRAMES,
  BOUND,
  CUES,
  SCRIPT_SHA,
  ACTS,
  SHOTS,
  shotAtTime,
} from './plan.mjs';
import { paintShot } from './scenes.mjs';
import { applyActGrade, drawCaptionBand, rect, clamp } from './plate.mjs';

export const WIDTH = 1920;
export const HEIGHT = 1080;

const STAGE_CV = createCanvas(WIDTH, HEIGHT);
const STAGE_CTX = STAGE_CV.getContext('2d');

function drawDisclaimerBadge(c) {
  c.save();
  rect(c, 20, 12, 146, 23, 'rgba(12, 22, 34, 0.56)', 5);
  c.strokeStyle = 'rgba(236, 222, 192, 0.30)';
  c.lineWidth = 1;
  c.beginPath();
  c.roundRect(20.5, 12.5, 145, 22, 5);
  c.stroke();
  c.font = '700 12px MvBold';
  c.fillStyle = 'rgba(248, 239, 218, 0.90)';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText('非官方同人 / AI 生成', 93, 23.5);
  c.restore();
}

/**
 * Pure deterministic render(ctx, t) — modeled on world-execute-me-lyric-mv/src/film.js.
 */
export function render(ctx, t, { captions = true, watermark = true, coverClean = false } = {}) {
  const clampedT = clamp(t, 0, DURATION - 1e-4);
  const shot = shotAtTime(clampedT);
  const cue = BOUND.cueAt(clampedT);

  ctx.save();
  ctx.setTransform(WIDTH / 1280, 0, 0, HEIGHT / 720, 0, 0);

  paintShot(ctx, clampedT, shot, { bound: BOUND, cue, coverClean });
  applyActGrade(ctx, shot.grade);

  if (captions && cue) {
    drawCaptionBand(ctx, cue, clampedT);
  }
  if (watermark) {
    drawDisclaimerBadge(ctx);
  }

  // Gentle 0.32s opening fade-in & subtle 0.22s tail settle
  const fadeIn = 1 - clamp(clampedT / 0.32, 0, 1);
  const fadeOut = clamp((clampedT - (DURATION - 0.22)) / 0.22, 0, 1);
  const fadeAlpha = Math.max(fadeIn, fadeOut * 0.65);
  if (fadeAlpha > 0.005) {
    rect(ctx, 0, 0, 1280, 720, `rgba(12, 18, 26, ${fadeAlpha})`);
  }

  ctx.restore();
  return shot;
}

export function frame(t, opts = {}) {
  render(STAGE_CTX, t, opts);
  return STAGE_CV;
}

function findFfmpeg() {
  const py = fs.existsSync(path.join(ROOT, '.venv/bin/python')) ? path.join(ROOT, '.venv/bin/python') : 'python3';
  const r = spawnSyncHelper(py, ['-c', 'import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())']);
  return r.trim();
}

function spawnSyncHelper(cmd, args) {
  const { execFileSync } = process.getBuiltinModule
    ? process.getBuiltinModule('node:child_process')
    : { execFileSync: null };
  if (execFileSync) {
    return execFileSync(cmd, args, { encoding: 'utf8' });
  }
  throw new Error('execFileSync unavailable');
}

function sha256File(filePath) {
  return createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

/**
 * Generate all visual verification sheets & covers:
 * 1) Cast & rig overview sheet
 * 2) 32-shot complete contact sheet (4 cols x 8 rows)
 * 3) 16-line start/mid/peak frame strips (4 cols x 4 rows of 3-frame strips)
 * 4) 16:9 & 3:4 covers
 */
export function buildStills() {
  const outDir = path.join(ROOT, '番外MV/把回忆拼好给你');
  fs.mkdirSync(path.join(outDir, '分镜'), { recursive: true });
  fs.mkdirSync(path.join(outDir, '封面'), { recursive: true });

  // 1. Cast & Rig Sheet
  const castCv = renderCastSheet();
  fs.writeFileSync(
    path.join(outDir, '分镜/v7_全阵容形象与动作盘点.jpg'),
    castCv.toBuffer('image/jpeg', 92)
  );

  // 2. 32-Shot Contact Sheet (4 cols x 8 rows)
  const cols = 4;
  const rows = Math.ceil(SHOTS.length / cols); // 8
  const cellW = 460;
  const cellH = 294;
  const sheetW = cols * cellW + 40;
  const sheetH = rows * cellH + 92;
  const sheet = createCanvas(sheetW, sheetH);
  const g = sheet.getContext('2d');
  g.fillStyle = '#0e1824';
  g.fillRect(0, 0, sheetW, sheetH);
  g.font = '700 28px MvBold';
  g.fillStyle = '#f8ecd1';
  g.textAlign = 'center';
  g.fillText(
    '《把回忆拼好给你》v7 全曲复刻版 · 5 幕 32 镜全分镜接触表（0.000s – 56.033s / 1681 帧）',
    sheetW / 2,
    46
  );

  SHOTS.forEach((shot, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 20 + col * cellW;
    const y = 72 + row * cellH;
    // Sample near result moment where action peak + caption are clearly visible
    const sampleT = Math.min(shot.end - 0.12, Math.max(shot.start + 0.18, shot.direction.result));
    const shotCv = frame(sampleT);
    g.drawImage(shotCv, x + 8, y + 6, cellW - 16, 250);
    g.strokeStyle = 'rgba(238, 222, 190, 0.28)';
    g.strokeRect(x + 8, y + 6, cellW - 16, 250);

    g.font = '700 14px MvBold';
    g.fillStyle = '#f3dfb9';
    g.textAlign = 'left';
    const lineTag = shot.lines.length ? `L${String(shot.lines[0]).padStart(2, '0')}` : '器乐';
    g.fillText(
      `#${String(shot.index).padStart(2, '0')} [${shot.act}幕·${lineTag}] ${shot.title} (${shot.start.toFixed(2)}–${shot.end.toFixed(2)}s)`,
      x + 10,
      y + 276
    );
  });
  fs.writeFileSync(
    path.join(outDir, '分镜/v7_32镜成片接触表.jpg'),
    sheet.toBuffer('image/jpeg', 90)
  );

  // 3. 16-Line Start/Mid/End Strips (voxel-mv style line verification!)
  const stripW = 1920;
  const stripH = 1360;
  const stripCv = createCanvas(stripW, stripH);
  const sg = stripCv.getContext('2d');
  sg.fillStyle = '#101b28';
  sg.fillRect(0, 0, stripW, stripH);
  sg.font = '700 26px MvBold';
  sg.fillStyle = '#f8ecd1';
  sg.textAlign = 'center';
  sg.fillText('《把回忆拼好给你》v7 · 16 句锁定歌词逐句三帧核验表（起拍 / 中段 / 落点）', stripW / 2, 42);

  CUES.forEach((cue, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const bx = 24 + col * 944;
    const by = 68 + row * 158;
    sg.fillStyle = 'rgba(24, 38, 56, 0.72)';
    sg.beginPath();
    sg.roundRect(bx, by, 924, 148, 8);
    sg.fill();

    const times = [
      cue.start + 0.18,
      (cue.start + cue.end) * 0.5,
      Math.max(cue.start + 0.25, cue.end - 0.24),
    ];
    times.forEach((tt, ti) => {
      const fCv = frame(tt);
      sg.drawImage(fCv, bx + 12 + ti * 204, by + 8, 196, 110);
    });

    sg.font = '700 16px MvBold';
    sg.fillStyle = '#ffe8be';
    sg.textAlign = 'left';
    sg.fillText(`第 ${String(cue.line).padStart(2, '0')} 句`, bx + 632, by + 38);
    sg.font = '600 14px MvCJK';
    sg.fillStyle = '#b9d2e0';
    sg.fillText(`${cue.start.toFixed(2)}s – ${cue.end.toFixed(2)}s`, bx + 632, by + 64);
    sg.font = '700 15px MvBold';
    sg.fillStyle = '#ffffff';
    sg.fillText(cue.text, bx + 632, by + 96);
  });
  fs.writeFileSync(
    path.join(outDir, '分镜/v7_16句逐句帧条.jpg'),
    stripCv.toBuffer('image/jpeg', 90)
  );

  // 4. Covers (16:9 Horizontal & 3:4 Vertical — clean visual storytelling, minimal title)
  const cov169 = createCanvas(1920, 1080);
  const cg = cov169.getContext('2d');
  render(cg, 36.65, { captions: false, watermark: true, coverClean: true });
  cg.save();
  cg.font = '700 66px MvBold';
  cg.textAlign = 'center';
  cg.fillStyle = 'rgba(14, 22, 42, 0.75)';
  cg.fillText('把回忆拼好给你', 964, 956);
  cg.fillStyle = '#fff5df';
  cg.fillText('把回忆拼好给你', 960, 952);
  cg.font = '700 22px MvBold';
  cg.fillStyle = '#f5d49b';
  cg.fillText('鲸鱼娘 × AI 伙伴们 · 逐帧代码渲染番外 MV', 960, 1004);
  cg.restore();
  fs.writeFileSync(path.join(outDir, '封面/v7_封面_16比9.jpg'), cov169.toBuffer('image/jpeg', 92));

  const cov54 = createCanvas(1080, 1440);
  const vg = cov54.getContext('2d');
  // Top half & bottom half both use exact 1578x1080 -> 1080x740 (1.459:1) center crop: zero distortion!
  const topSnap = frame(36.65, { captions: false, watermark: false, coverClean: true });
  vg.drawImage(topSnap, 171, 0, 1578, 1080, 0, 0, 1080, 740);
  const botSnap = frame(54.85, { captions: false, watermark: false });
  vg.drawImage(botSnap, 171, 0, 1578, 1080, 0, 700, 1080, 740);
  const seamGrad = vg.createLinearGradient(0, 660, 0, 760);
  seamGrad.addColorStop(0, 'rgba(18, 28, 46, 0)');
  seamGrad.addColorStop(0.5, 'rgba(18, 28, 46, 0.92)');
  seamGrad.addColorStop(1, 'rgba(18, 28, 46, 0)');
  vg.fillStyle = seamGrad;
  vg.fillRect(0, 660, 1080, 100);

  vg.fillStyle = 'rgba(14, 24, 38, 0.78)';
  vg.beginPath();
  vg.roundRect(140, 654, 800, 116, 14);
  vg.fill();
  vg.font = '700 54px MvBold';
  vg.textAlign = 'center';
  vg.fillStyle = '#fff5df';
  vg.fillText('把回忆拼好给你', 540, 718);
  vg.font = '700 20px MvBold';
  vg.fillStyle = '#f4cf92';
  vg.fillText('非官方同人 / AI 生成 · 代码逐帧渲染番外 MV', 540, 754);
  fs.writeFileSync(path.join(outDir, '封面/v7_封面_3比4.jpg'), cov54.toBuffer('image/jpeg', 92));

  console.log('Stills generated: cast sheet, 32-shot sheet, 16-line strips, and 16:9 + 3:4 covers.');
}

async function encodeVideoRange({
  startFrame,
  endFrame,
  outPath,
  audioMode, // 'copy_master' | 'slice_wav'
}) {
  const ffmpeg = findFfmpeg();
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const total = endFrame - startFrame;
  const startSec = startFrame / FPS;
  const durSec = total / FPS;

  const args = [
    '-y',
    '-loglevel',
    'error',
    '-f',
    'rawvideo',
    '-pix_fmt',
    'rgba',
    '-s',
    `${WIDTH}x${HEIGHT}`,
    '-r',
    String(FPS),
    '-i',
    '-',
  ];

  if (audioMode === 'copy_master') {
    const masterAudio = path.join(ROOT, 'assets/mv-extra/user_reference_audio.m4a');
    args.push(
      '-i',
      masterAudio,
      '-map',
      '0:v:0',
      '-map',
      '1:a:0',
      '-c:v',
      'libx264',
      '-threads',
      '2',
      '-preset',
      'medium',
      '-crf',
      '18',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'copy',
      '-movflags',
      '+faststart',
      outPath
    );
  } else {
    const wavPath = path.join(ROOT, 'tools/mv_extra/cache/source48.wav');
    args.push(
      '-ss',
      startSec.toFixed(6),
      '-t',
      durSec.toFixed(6),
      '-i',
      wavPath,
      '-map',
      '0:v:0',
      '-map',
      '1:a:0',
      '-c:v',
      'libx264',
      '-threads',
      '2',
      '-preset',
      'medium',
      '-crf',
      '18',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-ar',
      '48000',
      '-movflags',
      '+faststart',
      outPath
    );
  }

  const proc = spawn(ffmpeg, args, { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let f = startFrame; f < endFrame; f++) {
    const cv = frame(f / FPS);
    const raw = cv.data();
    if (!proc.stdin.write(raw)) {
      await once(proc.stdin, 'drain');
    }
    const done = f - startFrame + 1;
    if (done % 12 === 0 && global.gc) global.gc();
    if (done % 240 === 0 || done === total) {
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`  rendered ${done}/${total} frames (${elapsed}s) -> ${path.relative(ROOT, outPath)}`);
    }
  }
  proc.stdin.end();
  const [code] = await once(proc, 'close');
  if (code !== 0) {
    throw new Error(`ffmpeg exited with code ${code}`);
  }
}

export async function buildSample() {
  const sampleOut = path.join(ROOT, '番外MV/把回忆拼好给你/样片/v7_副歌烟花与时差_有声试剪.mp4');
  console.log(`Rendering v7 voiced highlight sample (${SAMPLE_FRAMES} frames, 28.833s–44.600s)...`);
  await encodeVideoRange({
    startFrame: SAMPLE_START_FRAME,
    endFrame: SAMPLE_END_FRAME,
    outPath: sampleOut,
    audioMode: 'slice_wav',
  });
  return sampleOut;
}

export async function buildMaster() {
  const masterOut = path.join(ROOT, '番外MV/把回忆拼好给你/成片/把回忆拼好给你_v7完整复刻版.mp4');
  console.log(`Rendering v7 FULL master MV (${TOTAL_FRAMES} frames, 0.000s–56.033s, lossless -c:a copy)...`);
  await encodeVideoRange({
    startFrame: 0,
    endFrame: TOTAL_FRAMES,
    outPath: masterOut,
    audioMode: 'copy_master',
  });

  const sampleOut = path.join(ROOT, '番外MV/把回忆拼好给你/样片/v7_副歌烟花与时差_有声试剪.mp4');
  const inputsRecord = {
    version: 'v7.0.0',
    fps: FPS,
    width: WIDTH,
    height: HEIGHT,
    totalFrames: TOTAL_FRAMES,
    durationSeconds: DURATION,
    lyricScriptSha256: SCRIPT_SHA,
    sourceAudioPath: 'assets/mv-extra/user_reference_audio.m4a',
    sourceAudioSha256: sha256File(path.join(ROOT, 'assets/mv-extra/user_reference_audio.m4a')),
    sourceAudioMode: 'lossless stream copy (-c:a copy) from user_reference_audio.m4a',
    sampleAudioMode: '48kHz PCM slice from tools/mv_extra/cache/source48.wav encoded AAC 192k',
    masterOutput: {
      path: '番外MV/把回忆拼好给你/成片/把回忆拼好给你_v7完整复刻版.mp4',
      sha256: sha256File(masterOut),
      bytes: fs.statSync(masterOut).size,
    },
    sampleOutput: fs.existsSync(sampleOut)
      ? {
          path: '番外MV/把回忆拼好给你/样片/v7_副歌烟花与时差_有声试剪.mp4',
          sha256: sha256File(sampleOut),
          bytes: fs.statSync(sampleOut).size,
          startFrame: SAMPLE_START_FRAME,
          endFrame: SAMPLE_END_FRAME,
        }
      : null,
  };
  fs.writeFileSync(
    path.join(ROOT, 'tools/mv_extra/v7/render_inputs.json'),
    JSON.stringify(inputsRecord, null, 2) + '\n'
  );
  return masterOut;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const mode = process.argv[2] || 'stills';
  if (mode === 'stills') {
    buildStills();
  } else if (mode === 'sample') {
    await buildSample();
  } else if (mode === 'render') {
    await buildMaster();
  } else if (mode === 'all') {
    buildStills();
    await buildSample();
    await buildMaster();
  } else {
    throw new Error(`Unknown command: ${mode}. Expected stills | sample | render | all`);
  }
}
