#!/usr/bin/env node
// 《童话镇》立体童话书复刻 · 导出脚本
//
//   node render.mjs align                     实测原曲拍点，生成 audio_sync.json（需要 python3 + numpy）
//   node render.mjs stills <帧号…>            抽查静帧 → $MV_WORK/stills/f<帧号>.png
//   node render.mjs frames [--from a --to b]  逐帧渲染 PNG 序列 → $MV_WORK/frames/f%05d.png（分块、可续渲）
//   node render.mjs encode [--bitrate 4700k | --crf 18]   PNG 序列 → 无声 H.264 → $MV_WORK/video.mp4（默认两遍 4700k）
//   node render.mjs mux                       原曲对齐混入 → out/童话镇-remotion3d.mp4 + .srt
//   node render.mjs qa                        自检（逐帧 + 成片音画）→ out/qa.json（需要 python3 + numpy + Pillow）
//   node render.mjs full                      frames + encode + mux + qa
//
// 说明：
//   · 画面：site/src/mv/MVComp 原样渲染，1920×1080 @ 30fps。
//   · 卡点：默认用 audio_sync.json（SRT 第 1–31 句起点吸附到原曲实测拍点）作为 starts/ends 传给 MVComp；
//           加 --srt-timing 则用页面原始的 SRT 卡点。两者总长相同（4272 帧）。
//   · WebGL：沙盒无 GPU，必须用 gl:'swangle'（ANGLE + SwiftShader）；gl:'angle' 在这里建不出 WebGL 上下文，画面全黑。
//   · 字体：无头 Chromium 没有中文字体，这里把仓库自带的 ZCOOL KuaiLe（MVComp 字体栈首选）挂进 fontconfig。
//   · 音频：仓库根目录 童话镇.mp4 的原曲音轨，偏移 0；成片比原曲短，最后 FADE_SEC 秒线性淡出。
//   · 中间文件（约 2–3 GB 的 PNG 序列）放在仓库外的 $MV_WORK（默认 /tmp/tonghuazhen-remotion3d-work），不入库。
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../..');
const OUT = path.join(HERE, 'out');
const WORK = process.env.MV_WORK || path.join(os.tmpdir(), 'tonghuazhen-remotion3d-work');
const FRAMES = path.join(WORK, 'frames');
const SLUG = '童话镇-remotion3d';
const SONG = path.join(REPO, '童话镇.mp4');
const FONT_SRC = path.join(REPO, '番外MV/童话镇-paper-popup/fonts/ZCOOLKuaiLe-Regular.ttf');
const FADE_SEC = 1.5;
const AUDIO_OFFSET = 0; // 原曲相对画面的整体偏移（秒）；SRT 与原曲同源，取 0

const argv = process.argv.slice(2);
const mode = argv[0] || 'full';
const opt = (name, dflt) => { const i = argv.indexOf(name); return i >= 0 && argv[i + 1] != null ? argv[i + 1] : dflt; };

const FFDIR = path.join(HERE, 'node_modules/@remotion/compositor-linux-x64-gnu');
const FFMPEG = path.join(FFDIR, 'ffmpeg');
const FFPROBE = path.join(FFDIR, 'ffprobe');
const ffEnv = { ...process.env, LD_LIBRARY_PATH: `${FFDIR}:${process.env.LD_LIBRARY_PATH || ''}` };
const ff = (args, o = {}) => execFileSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', ...args], { env: ffEnv, stdio: ['ignore', 'pipe', 'inherit'], maxBuffer: 1 << 28, ...o });
const probe = (file, entries) => execFileSync(FFPROBE, ['-v', 'error', '-show_entries', entries, '-of', 'json', file], { env: ffEnv }).toString();

const tlMod = await import('./site/src/mv/timeline.ts');
const { FPS, VW, VH } = tlMod;
const SYNC_FILE = path.join(HERE, 'audio_sync.json');
const useSrtTiming = argv.includes('--srt-timing') || mode === 'align';
if (!useSrtTiming && !fs.existsSync(SYNC_FILE)) throw new Error('缺少 audio_sync.json：先跑 node render.mjs align，或加 --srt-timing');
const sync = useSrtTiming ? null : JSON.parse(fs.readFileSync(SYNC_FILE, 'utf8'));
const starts = sync ? sync.starts : tlMod.SRT_STARTS;
const ends = sync ? sync.ends : tlMod.SRT_ENDS;
const tl = tlMod.makeTimeline(starts, ends);
const inputProps = { starts, ends, audioSrc: null, audioOffset: 0, showLyrics: true };
const framePath = (f) => path.join(FRAMES, `f${String(f).padStart(5, '0')}.png`);
const haveFrame = (f) => { try { return fs.statSync(framePath(f)).size > 0; } catch { return false; } };

async function prepareBrowser() {
  const mod = await import('@sparticuz/chromium');
  const chromium = mod.default || mod;
  const inflate = mod.inflate || chromium.inflate;
  const al = path.join(HERE, 'node_modules/@sparticuz/chromium/bin/al2023.tar.br');
  if (typeof inflate === 'function' && fs.existsSync(al)) {
    const libRoot = await inflate(al);
    if (!(process.env.LD_LIBRARY_PATH || '').includes(`${libRoot}/lib`)) process.env.LD_LIBRARY_PATH = `${libRoot}/lib:${process.env.LD_LIBRARY_PATH || ''}`;
  }
  // 中文字体：系统字体 + 仓库里的 ZCOOL KuaiLe
  const fontDir = path.join(os.tmpdir(), 'tonghuazhen-fonts');
  fs.mkdirSync(fontDir, { recursive: true });
  fs.copyFileSync(FONT_SRC, path.join(fontDir, 'ZCOOLKuaiLe-Regular.ttf'));
  const conf = path.join(fontDir, 'fonts.conf');
  fs.writeFileSync(conf, `<?xml version="1.0"?>\n<!DOCTYPE fontconfig SYSTEM "fonts.dtd">\n<fontconfig>\n  <include ignore_missing="yes">/etc/fonts/fonts.conf</include>\n  <dir>${fontDir}</dir>\n  <cachedir>${path.join(fontDir, 'cache')}</cachedir>\n</fontconfig>\n`);
  process.env.FONTCONFIG_FILE = conf;
  return chromium.executablePath();
}

async function openComposition() {
  const { bundle } = await import('@remotion/bundler');
  const renderer = await import('@remotion/renderer');
  const browserExecutable = await prepareBrowser();
  const chromiumOptions = { gl: 'swangle' };
  const serveUrl = await bundle({ entryPoint: path.join(HERE, 'entry.tsx') });
  const composition = await renderer.selectComposition({ serveUrl, id: 'TonghuazhenMV', inputProps, browserExecutable, chromiumOptions });
  if (composition.durationInFrames !== tl.frames || composition.width !== VW || composition.height !== VH || composition.fps !== FPS) {
    throw new Error(`Composition 规格与时间轴不一致：${JSON.stringify(composition)}`);
  }
  return { renderer, serveUrl, composition, browserExecutable, chromiumOptions };
}

async function stills() {
  const frames = argv.slice(1).filter((a) => /^\d+$/.test(a)).map(Number);
  if (!frames.length) throw new Error('用法：node render.mjs stills <帧号…>');
  const dir = path.join(WORK, 'stills');
  fs.mkdirSync(dir, { recursive: true });
  const { renderer, serveUrl, composition, browserExecutable, chromiumOptions } = await openComposition();
  for (const frame of frames) {
    const t0 = Date.now();
    const output = path.join(dir, `f${String(frame).padStart(5, '0')}.png`);
    await renderer.renderStill({ composition, serveUrl, output, frame, imageFormat: 'png', inputProps, browserExecutable, chromiumOptions, timeoutInMilliseconds: 120000 });
    console.log(`still f${frame} (${(frame / FPS).toFixed(2)}s) ${Date.now() - t0}ms → ${output}`);
  }
}

async function frames() {
  fs.mkdirSync(FRAMES, { recursive: true });
  const from = Number(opt('--from', 0));
  const to = Number(opt('--to', tl.frames - 1));
  const chunk = Number(opt('--chunk', 300));
  const concurrency = Number(opt('--concurrency', 2));
  const todo = [];
  for (let a = from; a <= to; a += chunk) {
    const b = Math.min(to, a + chunk - 1);
    let missing = 0;
    for (let f = a; f <= b; f++) if (!haveFrame(f)) missing++;
    if (missing) todo.push([a, b, missing]);
  }
  const totalTodo = todo.reduce((s, c) => s + (c[1] - c[0] + 1), 0);
  console.log(`[frames] 范围 ${from}–${to}，待渲染 ${todo.length} 块 / ${totalTodo} 帧`);
  if (!todo.length) return;
  const { renderer, serveUrl, composition, browserExecutable, chromiumOptions } = await openComposition();
  const t0 = Date.now();
  let done = 0, last = 0;
  for (const [a, b] of todo) {
    const tmp = path.join(WORK, `chunk_${a}`);
    fs.rmSync(tmp, { recursive: true, force: true });
    await renderer.renderFrames({
      composition, serveUrl, inputProps, outputDir: tmp, imageFormat: 'png',
      frameRange: [a, b], concurrency, muted: true, browserExecutable, chromiumOptions, timeoutInMilliseconds: 180000,
      onStart: () => {},
      onFrameUpdate: () => {
        done++;
        if (Date.now() - last < 20000) return;
        last = Date.now();
        const sec = (Date.now() - t0) / 1000;
        console.log(`[frames] ${done}/${totalTodo} 帧 · ${(done / sec).toFixed(2)} fps · 已用 ${Math.round(sec)}s · 预计还需 ${Math.round((sec / done) * (totalTodo - done))}s`);
      },
    });
    let moved = 0;
    for (const name of fs.readdirSync(tmp)) {
      const m = /^element-(\d+)\.png$/.exec(name);
      if (!m) continue;
      fs.renameSync(path.join(tmp, name), framePath(Number(m[1])));
      moved++;
    }
    fs.rmSync(tmp, { recursive: true, force: true });
    if (moved !== b - a + 1) throw new Error(`块 ${a}–${b} 只得到 ${moved} 帧`);
    console.log(`[frames] 块 ${a}–${b} 完成（累计 ${done}/${totalTodo}，${Math.round((Date.now() - t0) / 1000)}s）`);
  }
  for (let f = from; f <= to; f++) if (!haveFrame(f)) throw new Error(`缺帧 ${f}`);
  console.log(`FRAMES_OK ${from}–${to} ${Math.round((Date.now() - t0) / 1000)}s`);
}

function encode() {
  const from = Number(opt('--from', 0));
  const to = Number(opt('--to', tl.frames - 1));
  for (let f = from; f <= to; f++) if (!haveFrame(f)) throw new Error(`缺帧 ${f}，先跑 node render.mjs frames`);
  const outFile = opt('--out', path.join(WORK, 'video.mp4'));
  // 默认两遍编码 4700k（成片约 88 MB，留在 GitHub 单文件 100 MB 上限之内）；给 --crf 则改用恒定质量单遍
  const bitrate = argv.includes('--crf') ? null : opt('--bitrate', '4700k');
  const crf = opt('--crf', '18');
  const preset = opt('--preset', 'slow');
  const t0 = Date.now();
  // sRGB PNG → BT.709 有限范围 yuv420p，并写明色彩标签
  const input = ['-y', '-framerate', String(FPS), '-start_number', String(from), '-i', path.join(FRAMES, 'f%05d.png'), '-frames:v', String(to - from + 1),
    '-vf', 'scale=out_color_matrix=bt709:out_range=tv', '-pix_fmt', 'yuv420p'];
  const codec = ['-c:v', 'libx264', '-preset', preset, '-profile:v', 'high', '-level', '4.1', '-g', String(FPS * 2), '-bf', '2',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    '-x264-params', 'colorprim=bt709:transfer=bt709:colormatrix=bt709'];
  if (bitrate) {
    const log = path.join(WORK, 'x264_2pass');
    ff([...input, ...codec, '-b:v', bitrate, '-pass', '1', '-passlogfile', log, '-an', '-f', 'null', '/dev/null']);
    ff([...input, ...codec, '-b:v', bitrate, '-pass', '2', '-passlogfile', log, '-movflags', '+faststart', outFile]);
  } else {
    ff([...input, ...codec, '-crf', crf, '-movflags', '+faststart', outFile]);
  }
  console.log(`ENCODE_OK ${outFile} ${bitrate ? `2pass ${bitrate}` : `crf=${crf}`} preset=${preset} ${(fs.statSync(outFile).size / 1048576).toFixed(1)} MiB ${Math.round((Date.now() - t0) / 1000)}s`);
}

// —— WAV 读写（内置 ffmpeg 没有裸 PCM 封装器，统一走 WAV） ——
function readWavData(file) {
  const b = fs.readFileSync(file);
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WAVE') throw new Error(`不是 WAV：${file}`);
  let p = 12;
  while (p + 8 <= b.length) {
    const id = b.toString('ascii', p, p + 4);
    let size = b.readUInt32LE(p + 4);
    if (id === 'data') { if (size === 0xffffffff || p + 8 + size > b.length) size = b.length - p - 8; return b.subarray(p + 8, p + 8 + size); }
    p += 8 + size + (size & 1);
  }
  throw new Error(`WAV 里没有 data 块：${file}`);
}
function wavHeader(dataBytes, sampleRate, channels) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0, 'ascii'); h.writeUInt32LE(36 + dataBytes, 4); h.write('WAVE', 8, 'ascii');
  h.write('fmt ', 12, 'ascii'); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(channels, 22);
  h.writeUInt32LE(sampleRate, 24); h.writeUInt32LE(sampleRate * channels * 2, 28); h.writeUInt16LE(channels * 2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36, 'ascii'); h.writeUInt32LE(dataBytes, 40);
  return h;
}

function mux() {
  const videoFile = opt('--video', path.join(WORK, 'video.mp4'));
  const dur = tl.frames / FPS;
  fs.mkdirSync(WORK, { recursive: true });
  // 1) 原曲 → 48k 立体声 PCM；2) 采样级线性淡出；3) 与画面合流（画面流直接拷贝）
  const SR = 48000;
  const srcWav = path.join(WORK, 'song.wav');
  ff(['-y', '-i', SONG, '-vn', '-ac', '2', '-ar', String(SR), '-c:a', 'pcm_s16le', '-f', 'wav', srcWav]);
  const src = readWavData(srcWav);
  const total = Math.round(dur * SR);
  const off = Math.round(AUDIO_OFFSET * SR);
  const out = Buffer.alloc(total * 4);
  const fadeN = Math.round(FADE_SEC * SR);
  for (let i = 0; i < total; i++) {
    const s = i - off;
    if (s < 0 || (s + 1) * 4 > src.length) continue;
    const g = i >= total - fadeN ? (total - i) / fadeN : 1;
    out.writeInt16LE(Math.round(src.readInt16LE(s * 4) * g), i * 4);
    out.writeInt16LE(Math.round(src.readInt16LE(s * 4 + 2) * g), i * 4 + 2);
  }
  const faded = path.join(WORK, 'song_faded.wav');
  fs.writeFileSync(faded, Buffer.concat([wavHeader(out.length, SR, 2), out]));
  fs.mkdirSync(OUT, { recursive: true });
  const final = path.join(OUT, `${SLUG}.mp4`);
  ff(['-y', '-i', videoFile, '-i', faded,
    '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'libfdk_aac', '-b:a', '256k',
    '-movflags', '+faststart', '-t', dur.toFixed(6), final]);
  fs.writeFileSync(path.join(OUT, `${SLUG}.srt`), tlMod.toSrt(tl.starts, tl.ends));
  const info = JSON.parse(probe(final, 'stream=codec_type,codec_name,width,height,r_frame_rate,nb_frames,duration,sample_rate,channels,bit_rate:format=duration,size'));
  console.log('MUX_OK', final);
  console.log(JSON.stringify(info));
}

function align() {
  fs.mkdirSync(WORK, { recursive: true });
  const wav = path.join(WORK, 'song_22k.wav');
  ff(['-y', '-i', SONG, '-vn', '-ac', '2', '-ar', '22050', '-c:a', 'pcm_s16le', '-f', 'wav', wav]);
  execFileSync('python3', [path.join(HERE, 'align_to_audio.py'), wav, '--out', SYNC_FILE], { stdio: 'inherit' });
}

function qa() {
  const script = path.join(HERE, 'qa_check.py');
  if (!argv.includes('--skip-frames')) execFileSync('python3', [script, 'frames', FRAMES], { stdio: 'inherit' });
  const final = path.join(OUT, `${SLUG}.mp4`);
  const srcWav = path.join(WORK, 'song.wav');
  const outWav = path.join(WORK, 'final_audio.wav');
  if (!fs.existsSync(srcWav)) ff(['-y', '-i', SONG, '-vn', '-ac', '2', '-ar', '48000', '-c:a', 'pcm_s16le', '-f', 'wav', srcWav]);
  ff(['-y', '-i', final, '-vn', '-ac', '2', '-ar', '48000', '-c:a', 'pcm_s16le', '-f', 'wav', outWav]);
  execFileSync('python3', [script, 'final', final, srcWav, outWav], { stdio: 'inherit' });
  const qaFile = path.join(OUT, 'qa.json');
  const data = JSON.parse(fs.readFileSync(qaFile, 'utf8'));
  data.final.probe = JSON.parse(probe(final, 'stream=codec_type,codec_name,profile,pix_fmt,color_space,color_range,width,height,r_frame_rate,nb_frames,duration,sample_rate,channels,bit_rate:format=duration,size,bit_rate'));
  data.timing = sync ? { source: 'audio_sync.json', bpm: sync.beat.bpm, beat_period: sync.beat.period, mean_abs_delta: sync.summary.mean_abs_delta, max_abs_delta: sync.summary.max_abs_delta } : { source: 'SRT' };
  fs.writeFileSync(qaFile, JSON.stringify(data, null, 1));
  console.log('QA_OK', qaFile);
}

if (mode === 'align') align();
else if (mode === 'stills') await stills();
else if (mode === 'frames') await frames();
else if (mode === 'encode') encode();
else if (mode === 'mux') mux();
else if (mode === 'qa') qa();
else if (mode === 'full') { await frames(); encode(); mux(); qa(); }
else throw new Error(`未知模式 ${mode}`);
