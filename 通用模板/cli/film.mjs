#!/usr/bin/env node
// 通用模板 · 出片命令行
//
//   node 通用模板/cli/film.mjs <命令> <作品目录> [选项]
//
//   info     打印时间轴：总帧数、每个镜头的切点
//   align    按音频对齐卡点：<字幕>.srt + 音源 → cues.json
//              mv ：实测全曲拍点，把每句起点吸附到最近的实拍（--no-snap 只测不挪）
//              day：按配音的静音间隙核对每句起止，句首吸附到真实开口处（--no-snap 只测不挪）
//   stills   <帧号…>            抽查静帧 → <工作目录>/stills/
//   sheet                       分镜总览图（每个镜头 62% 处一格）→ <输出>_分镜总览.jpg
//   frames   [--from a --to b]  逐帧渲染 PNG 序列（每 300 帧一块，中断后重跑会续渲）
//   encode   [--bitrate 4700k | --crf 18] [--preset slow]   PNG 序列 → 无声 H.264
//   mux                         音轨对齐混入 → <输出>.mp4 + <输出>.srt
//   qa       [--skip-frames]    自检 → <输出目录>/qa.json
//   full                        frames + encode + mux + qa + sheet
//
// 通用选项：--cues <文件>  临时换一份卡点（默认用作品目录里的 cues.json）
//           --work <目录>  中间文件目录（默认 $FILM_WORK 或 系统临时目录/newday-film/<id>）
//
// 说明：
//   · 画面：1920×1080 @ 30fps，three.js 画在 <canvas> 上，Remotion 逐帧截图。
//   · WebGL：没有 GPU 的机器（服务器 / 沙盒）用 gl:'swangle' 软件渲染；有 GPU 可设 FILM_GL=angle。
//            gl:'angle' 在无 GPU 环境建不出 WebGL 上下文，画面会全黑——所以默认不用它。
//   · 音频：不走 Remotion 的 <Audio>，而是渲染后把音源按采样对齐混入（audio_mix.py），画面流不重编码。
//   · 中间文件（PNG 序列每分钟约 0.7 GB）放在仓库外的工作目录，不入库。
//   · 输出目录不要叫 out / build / dist：部分托管环境的快照会跳过这些目录名。
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TPL = path.resolve(HERE, '..');
const REPO = path.resolve(TPL, '..');
const ENGINE = path.join(TPL, 'engine');
const FONT_DIR = path.join(ENGINE, 'assets/fonts');

const argv = process.argv.slice(2);
const mode = argv[0];
const USAGE = '用法：node 通用模板/cli/film.mjs <info|align|stills|sheet|frames|encode|mux|qa|full> <作品目录> [选项]';
if (!mode || !argv[1] || argv[1].startsWith('--')) { console.error(USAGE); process.exit(2); }
const PROJ = path.resolve(argv[1]);
const rest = argv.slice(2);
const opt = (name, dflt) => { const i = rest.indexOf(name); return i >= 0 && rest[i + 1] != null ? rest[i + 1] : dflt; };
const flag = (name) => rest.includes(name);
const die = (msg) => { console.error(`✗ ${msg}`); process.exit(1); };

for (const f of ['film.json', 'project.tsx']) if (!fs.existsSync(path.join(PROJ, f))) die(`${path.relative(REPO, PROJ) || PROJ} 里没有 ${f}——这不是一个作品目录`);
const film = JSON.parse(fs.readFileSync(path.join(PROJ, 'film.json'), 'utf8'));
if (!/^[A-Za-z0-9-]+$/.test(film.id || '')) die('film.json 的 id 只能用字母、数字、连字符');
if (!['mv', 'day'].includes(film.kind)) die('film.json 的 kind 只能是 mv 或 day');
const CUES_FILE = path.resolve(PROJ, opt('--cues', 'cues.json'));
const OUT_BASE = path.resolve(PROJ, film.output || `成片/${film.title}`);
const OUT_DIR = path.dirname(OUT_BASE);
if (/(^|[\\/])(out|build|dist|target|coverage)([\\/]|$)/.test(path.relative(REPO, OUT_DIR))) die(`输出目录 ${path.relative(REPO, OUT_DIR)} 含有 out/build/dist 之类的目录名，部分托管环境不会保存它们，请改名（例如「成片」）`);
const WORK = path.resolve(opt('--work', process.env.FILM_WORK || path.join(os.tmpdir(), 'newday-film', film.id)));
const FRAMES = path.join(WORK, 'frames');
const QA_FILE = path.join(OUT_DIR, 'qa.json');
const rel = (p) => path.relative(REPO, p) || '.';

// —— ffmpeg / ffprobe：优先用环境变量或系统里的，没有就用 Remotion 自带的精简版 ——
const FFDIR = path.join(REPO, 'node_modules/@remotion/compositor-linux-x64-gnu');
const which = (bin) => { try { return execFileSync('which', [bin], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || null; } catch { return null; } };
const FFMPEG = process.env.FFMPEG || (fs.existsSync(path.join(FFDIR, 'ffmpeg')) ? path.join(FFDIR, 'ffmpeg') : which('ffmpeg'));
const FFPROBE = process.env.FFPROBE || (fs.existsSync(path.join(FFDIR, 'ffprobe')) ? path.join(FFDIR, 'ffprobe') : which('ffprobe'));
const ffEnv = { ...process.env, LD_LIBRARY_PATH: `${FFDIR}:${process.env.LD_LIBRARY_PATH || ''}` };
const needFf = () => { if (!FFMPEG || !FFPROBE) die('找不到 ffmpeg / ffprobe：先在仓库根目录 npm ci（Remotion 自带一份），或设置环境变量 FFMPEG / FFPROBE'); };
const ff = (args, o = {}) => { needFf(); return execFileSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', ...args], { env: ffEnv, stdio: ['ignore', 'pipe', 'inherit'], maxBuffer: 1 << 28, ...o }); };
const probe = (file, entries) => { needFf(); return JSON.parse(execFileSync(FFPROBE, ['-v', 'error', '-show_entries', entries, '-of', 'json', file], { env: ffEnv }).toString()); };
const py = (script, args, o = {}) => execFileSync(process.env.PYTHON || 'python3', [path.join(HERE, script), ...args], { stdio: 'inherit', ...o });
const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const framePath = (f) => path.join(FRAMES, `f${String(f).padStart(5, '0')}.png`);
const haveFrame = (f) => { try { return fs.statSync(framePath(f)).size > 0; } catch { return false; } };

const audioFile = film.audio?.file ? path.resolve(PROJ, film.audio.file) : null;
const needAudio = () => {
  if (!audioFile) die('film.json 里没有 audio.file——没有音源就只能出无声样片（frames + encode），不能 align / mux');
  if (!fs.existsSync(audioFile)) die(`音源不存在：${rel(audioFile)}`);
  return audioFile;
};
/** 音源 → 指定采样率的 16bit 立体声 WAV（缓存在工作目录） */
function wavOf(src, sr, tag) {
  fs.mkdirSync(WORK, { recursive: true });
  const out = path.join(WORK, `${tag}_${sr}.wav`);
  const stamp = `${out}.src`;
  const key = `${src}|${fs.statSync(src).size}|${fs.statSync(src).mtimeMs}`;
  if (!fs.existsSync(out) || !fs.existsSync(stamp) || fs.readFileSync(stamp, 'utf8') !== key) {
    ff(['-y', '-i', src, '-vn', '-ac', '2', '-ar', String(sr), '-c:a', 'pcm_s16le', '-f', 'wav', out]);
    fs.writeFileSync(stamp, key);
  }
  return out;
}

// —— 浏览器与打包 ——
async function prepareBrowser() {
  const mod = await import('@sparticuz/chromium');
  const chromium = mod.default || mod;
  const inflate = mod.inflate || chromium.inflate;
  const al = path.join(REPO, 'node_modules/@sparticuz/chromium/bin/al2023.tar.br');
  if (typeof inflate === 'function' && fs.existsSync(al)) {
    const libRoot = await inflate(al);
    if (!(process.env.LD_LIBRARY_PATH || '').includes(`${libRoot}/lib`)) process.env.LD_LIBRARY_PATH = `${libRoot}/lib:${process.env.LD_LIBRARY_PATH || ''}`;
  }
  // 字幕 / 字卡的字体由合成自己用 FontFace 加载；这里再把同一份字体挂进 fontconfig，
  // 只为了给「镜头里用 Canvas 画的字」在没装中文字体的机器上兜底。
  const fontDir = path.join(os.tmpdir(), 'newday-film-fonts');
  fs.mkdirSync(fontDir, { recursive: true });
  for (const f of fs.readdirSync(FONT_DIR)) if (/\.(ttf|otf)$/i.test(f)) fs.copyFileSync(path.join(FONT_DIR, f), path.join(fontDir, f));
  const conf = path.join(fontDir, 'fonts.conf');
  fs.writeFileSync(conf, `<?xml version="1.0"?>\n<!DOCTYPE fontconfig SYSTEM "fonts.dtd">\n<fontconfig>\n  <include ignore_missing="yes">/etc/fonts/fonts.conf</include>\n  <dir>${fontDir}</dir>\n  <cachedir>${path.join(fontDir, 'cache')}</cachedir>\n</fontconfig>\n`);
  process.env.FONTCONFIG_FILE = conf;
  return process.env.FILM_BROWSER || chromium.executablePath();
}

function inputProps() {
  if (!opt('--cues')) return {};
  const c = JSON.parse(fs.readFileSync(CUES_FILE, 'utf8'));
  return { starts: c.lines.map((l) => l.start), ends: c.lines.map((l) => l.end) };
}

let opened = null;
async function openComposition() {
  if (opened) return opened;
  const { bundle } = await import('@remotion/bundler');
  const renderer = await import('@remotion/renderer');
  const browserExecutable = await prepareBrowser();
  const chromiumOptions = { gl: process.env.FILM_GL || 'swangle' };
  // 入口文件放在仓库里（.cache 不入库），这样 webpack 能顺着目录找到根目录的 node_modules
  const entryDir = path.join(TPL, '.cache');
  fs.mkdirSync(entryDir, { recursive: true });
  const entryPoint = path.join(entryDir, `entry-${film.id}.tsx`);
  fs.writeFileSync(entryPoint, `// 自动生成，勿改：${rel(PROJ)}\nimport { registerProject } from '@tpl/register';\nimport project from ${JSON.stringify(path.join(PROJ, 'project'))};\nregisterProject(project);\n`);
  const webpackOverride = (c) => ({ ...c, resolve: { ...c.resolve, alias: { ...(c.resolve?.alias || {}), '@tpl': ENGINE } } });
  // 入口里调用的是 registerProject（它内部才调 registerRoot），所以关掉打包器「入口文件必须出现 registerRoot 字样」的检查
  const serveUrl = await bundle({ entryPoint, webpackOverride, ignoreRegisterRootWarning: true });
  const props = inputProps();
  const composition = await renderer.selectComposition({ serveUrl, id: film.id, inputProps: props, browserExecutable, chromiumOptions });
  const info = composition.props.__info;
  if (!info) throw new Error('合成没有返回时间轴信息（__info）');
  if (composition.durationInFrames !== info.frames) throw new Error('合成总帧数与时间轴不一致');
  fs.mkdirSync(WORK, { recursive: true });
  fs.writeFileSync(path.join(WORK, 'info.json'), JSON.stringify(info, null, 1));
  opened = { renderer, serveUrl, composition, browserExecutable, chromiumOptions, props, info };
  return opened;
}
/** 不开浏览器也能用的时间轴：读上一次 openComposition 存下的 info.json */
function savedInfo() {
  const f = path.join(WORK, 'info.json');
  if (!fs.existsSync(f)) die('还没有时间轴缓存：先跑一次 info / stills / frames');
  return JSON.parse(fs.readFileSync(f, 'utf8'));
}

async function info() {
  const { info: I } = await openComposition();
  console.log(`${I.title}（${I.kind}）· ${I.width}×${I.height} @ ${I.fps}fps · ${I.frames} 帧 · ${I.duration.toFixed(3)}s · ${I.shots.length} 镜 / ${I.lines.length} 句`);
  for (const s of I.shots) console.log(`  ${s.id.padEnd(6)} ${String(Math.ceil(s.a * I.fps - 1e-9)).padStart(5)}帧  ${s.a.toFixed(3).padStart(8)}–${s.b.toFixed(3).padStart(8)}s  ${s.cue >= 0 ? `第${s.cue + 1}句` : '      '}  ${s.title}`);
  return I;
}

async function stills(list) {
  const o = await openComposition();
  const frames = (list || rest.filter((a) => /^\d+$/.test(a)).map(Number));
  if (!frames.length) die('用法：film.mjs stills <作品目录> <帧号…>');
  const dir = path.join(WORK, 'stills');
  fs.mkdirSync(dir, { recursive: true });
  const outs = [];
  for (const frame of frames) {
    if (frame < 0 || frame >= o.info.frames) die(`帧号 ${frame} 超出范围 0–${o.info.frames - 1}`);
    const t0 = Date.now();
    const output = path.join(dir, `f${String(frame).padStart(5, '0')}.png`);
    await o.renderer.renderStill({ composition: o.composition, serveUrl: o.serveUrl, output, frame, imageFormat: 'png', inputProps: o.props, browserExecutable: o.browserExecutable, chromiumOptions: o.chromiumOptions, timeoutInMilliseconds: 180000 });
    console.log(`still f${frame} (${(frame / o.info.fps).toFixed(2)}s) ${Date.now() - t0}ms → ${output}`);
    outs.push(output);
  }
  return outs;
}

async function frames() {
  const o = await openComposition();
  fs.mkdirSync(FRAMES, { recursive: true });
  const from = Number(opt('--from', 0));
  const to = Number(opt('--to', o.info.frames - 1));
  const chunk = Number(opt('--chunk', 300));
  const concurrency = Number(opt('--concurrency', Math.max(1, Math.min(4, os.cpus().length))));
  // 换了卡点 / 改了镜头后旧帧作废：帧目录里记着上次渲染用的时间轴指纹
  const stampFile = path.join(FRAMES, '_timeline.sha');
  const stamp = crypto.createHash('sha256').update(JSON.stringify([o.info.shots, o.info.starts, o.info.ends, o.info.frames])).digest('hex');
  if (fs.existsSync(stampFile) && fs.readFileSync(stampFile, 'utf8') !== stamp && !flag('--keep')) {
    console.log('[frames] 时间轴变了，清空旧帧重渲（要保留旧帧就加 --keep）');
    fs.rmSync(FRAMES, { recursive: true, force: true }); fs.mkdirSync(FRAMES, { recursive: true });
  }
  fs.writeFileSync(stampFile, stamp);
  const todo = [];
  for (let a = from; a <= to; a += chunk) {
    const b = Math.min(to, a + chunk - 1);
    let missing = 0;
    for (let f = a; f <= b; f++) if (!haveFrame(f)) missing++;
    if (missing) todo.push([a, b]);
  }
  const totalTodo = todo.reduce((s, c) => s + (c[1] - c[0] + 1), 0);
  console.log(`[frames] 范围 ${from}–${to}，待渲染 ${todo.length} 块 / ${totalTodo} 帧 · 并发 ${concurrency} · gl=${o.chromiumOptions.gl}`);
  if (!todo.length) return;
  const t0 = Date.now();
  let done = 0, last = 0;
  for (const [a, b] of todo) {
    const tmp = path.join(WORK, `chunk_${a}`);
    fs.rmSync(tmp, { recursive: true, force: true });
    await o.renderer.renderFrames({
      composition: o.composition, serveUrl: o.serveUrl, inputProps: o.props, outputDir: tmp, imageFormat: 'png',
      frameRange: [a, b], concurrency, muted: true, browserExecutable: o.browserExecutable, chromiumOptions: o.chromiumOptions, timeoutInMilliseconds: 180000,
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
  const I = savedInfo();
  const from = Number(opt('--from', 0));
  const to = Number(opt('--to', I.frames - 1));
  for (let f = from; f <= to; f++) if (!haveFrame(f)) die(`缺帧 ${f}，先跑 frames`);
  const outFile = opt('--out', path.join(WORK, 'video.mp4'));
  // 默认两遍编码到固定码率（成片大小可预估；GitHub 单文件上限 100 MB）；给 --crf 则改用恒定质量单遍
  const bitrate = flag('--crf') ? null : opt('--bitrate', film.video?.bitrate || '6000k');
  const crf = opt('--crf', '18');
  const preset = opt('--preset', film.video?.preset || 'slow');
  const t0 = Date.now();
  // sRGB PNG → BT.709 有限范围 yuv420p，并写明色彩标签
  const input = ['-y', '-framerate', String(I.fps), '-start_number', String(from), '-i', path.join(FRAMES, 'f%05d.png'), '-frames:v', String(to - from + 1),
    '-vf', 'scale=out_color_matrix=bt709:out_range=tv', '-pix_fmt', 'yuv420p'];
  const codec = ['-c:v', 'libx264', '-preset', preset, '-profile:v', 'high', '-level', '4.1', '-g', String(I.fps * 2), '-bf', '2',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    '-x264-params', 'colorprim=bt709:transfer=bt709:colormatrix=bt709'];
  if (bitrate) {
    const log = path.join(WORK, 'x264_2pass');
    ff([...input, ...codec, '-b:v', bitrate, '-pass', '1', '-passlogfile', log, '-an', '-f', 'null', '/dev/null']);
    ff([...input, ...codec, '-b:v', bitrate, '-pass', '2', '-passlogfile', log, '-movflags', '+faststart', outFile]);
  } else {
    ff([...input, ...codec, '-crf', crf, '-movflags', '+faststart', outFile]);
  }
  const mib = fs.statSync(outFile).size / 1048576;
  console.log(`ENCODE_OK ${outFile} ${bitrate ? `2pass ${bitrate}` : `crf=${crf}`} preset=${preset} ${mib.toFixed(1)} MiB ${Math.round((Date.now() - t0) / 1000)}s`);
  if (mib > 95) console.warn('⚠ 画面流超过 95 MiB：加上音轨后可能超过 GitHub 单文件 100 MB 上限，推不上去。调低 film.json 的 video.bitrate。');
}

function srtText(I) {
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  const f = (t) => { const ms = Math.round(t * 1000); return `${pad(Math.floor(ms / 3600000))}:${pad(Math.floor((ms % 3600000) / 60000))}:${pad(Math.floor((ms % 60000) / 1000))},${pad(ms % 1000, 3)}`; };
  return I.lines.map((txt, i) => `${i + 1}\n${f(I.starts[i])} --> ${f(I.ends[i])}\n${txt}\n`).join('\n');
}

function mux() {
  const I = savedInfo();
  const videoFile = opt('--video', path.join(WORK, 'video.mp4'));
  if (!fs.existsSync(videoFile)) die(`没有画面流 ${videoFile}，先跑 encode`);
  const src = needAudio();
  const dur = I.frames / I.fps;
  const SR = 48000;
  const srcWav = wavOf(src, SR, 'source');
  const mixed = path.join(WORK, 'mix_48000.wav');
  const report = path.join(WORK, 'mix_report.json');
  const a = film.audio;
  const args = ['--src', srcWav, '--out', mixed, '--report', report, '--duration', dur.toFixed(6), '--offset', String(a.offset || 0), '--fade-out', String(a.fadeOut ?? 0)];
  if (a.bgm) {
    if (a.bgm.file) args.push('--bgm', wavOf(path.resolve(PROJ, a.bgm.file), SR, 'bgm'));
    else args.push('--bgm-chip', String(a.bgm.chip || 128));
    args.push('--bgm-gain-db', String(a.bgm.gainDb ?? -20), '--duck-db', String(a.bgm.duckDb ?? -8));
    if (a.bgm.stem !== false) args.push('--stem', path.join(WORK, 'bgm_stem_48000.wav'));
  }
  py('audio_mix.py', args);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const final = `${OUT_BASE}.mp4`;
  ff(['-y', '-i', videoFile, '-i', mixed, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'libfdk_aac', '-b:a', '256k', '-movflags', '+faststart', '-t', dur.toFixed(6), final]);
  fs.writeFileSync(`${OUT_BASE}.srt`, srtText(I));
  const mb = fs.statSync(final).size / 1e6;
  console.log(`MUX_OK ${rel(final)} ${mb.toFixed(1)} MB`);
  if (mb > 100) console.warn('⚠ 成片超过 100 MB：GitHub 不接受这么大的单文件。');
}

function align() {
  const src = needAudio();
  const srt = path.resolve(PROJ, film.subtitles || '字幕.srt');
  if (!fs.existsSync(srt)) die(`找不到字幕文件 ${rel(srt)}（film.json 的 subtitles）`);
  const common = ['--srt', srt, '--out', CUES_FILE, '--audio-name', path.relative(PROJ, src), '--audio-sha256', sha256(src), '--srt-name', path.relative(PROJ, srt)];
  if (flag('--no-snap')) common.push('--no-snap');
  if (film.kind === 'mv') py('align_beats.py', ['--wav', wavOf(src, 22050, 'source'), ...common]);
  else py('align_voice.py', ['--wav', wavOf(src, 16000, 'source'), ...common]);
  console.log(`ALIGN_OK ${rel(CUES_FILE)}`);
}

function qa() {
  const I = savedInfo();
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const final = `${OUT_BASE}.mp4`;
  const infoFile = path.join(WORK, 'info.json');
  if (!flag('--skip-frames')) py('qa.py', ['frames', FRAMES, '--info', infoFile, '--qa', QA_FILE]);
  py('qa.py', ['timing', '--info', infoFile, '--cues', CUES_FILE, '--qa', QA_FILE]);
  if (fs.existsSync(final) && audioFile) {
    const srcWav = wavOf(needAudio(), 48000, 'source');
    const outWav = path.join(WORK, 'final_audio_48000.wav');
    ff(['-y', '-i', final, '-vn', '-ac', '2', '-ar', '48000', '-c:a', 'pcm_s16le', '-f', 'wav', outWav]);
    ff(['-v', 'error', '-i', final, '-map', '0:v:0', '-map', '0:a:0', '-c:v', 'rawvideo', '-c:a', 'pcm_s16le', '-f', 'null', '-']); // 全片解码一遍，坏流会在这里报错
    const mixReport = path.join(WORK, 'mix_report.json');
    py('qa.py', ['final', final, srcWav, outWav, '--info', infoFile, '--offset', String(film.audio.offset || 0), '--qa', QA_FILE, ...(fs.existsSync(mixReport) ? ['--mix-report', mixReport] : [])]);
    const data = JSON.parse(fs.readFileSync(QA_FILE, 'utf8'));
    data.final.full_decode = 'ok';
    data.final.probe = probe(final, 'stream=codec_type,codec_name,profile,pix_fmt,color_space,color_range,width,height,r_frame_rate,nb_frames,duration,sample_rate,channels,bit_rate:format=duration,size,bit_rate');
    fs.writeFileSync(QA_FILE, JSON.stringify(data, null, 1));
  } else {
    console.log('[qa] 没有成片或没有音源，跳过成片音画检查');
  }
  const data = JSON.parse(fs.readFileSync(QA_FILE, 'utf8'));
  data.project = { id: I.id, kind: I.kind, title: I.title, frames: I.frames, duration: I.duration, shots: I.shots.length, lines: I.lines.length };
  fs.writeFileSync(QA_FILE, JSON.stringify(data, null, 1));
  const problems = [...(data.frames?.problems || []), ...(data.timing?.problems || []), ...(data.final?.problems || [])];
  console.log(problems.length ? `QA_PROBLEMS ${problems.length}\n  - ${problems.join('\n  - ')}` : `QA_OK ${rel(QA_FILE)}`);
  if (problems.length) process.exitCode = 1;
}

async function sheet() {
  const o = await openComposition();
  const mids = o.info.shots.map((s) => Math.min(o.info.frames - 1, Math.round((s.a + (s.b - s.a) * 0.62) * o.info.fps)));
  // 已经有 PNG 序列就直接取，没有才单独渲染
  const files = [];
  const missing = mids.filter((f) => !haveFrame(f));
  const rendered = missing.length ? await stills(missing) : [];
  for (const f of mids) files.push(haveFrame(f) ? framePath(f) : rendered[missing.indexOf(f)]);
  const listFile = path.join(WORK, 'sheet.json');
  fs.writeFileSync(listFile, JSON.stringify({ title: o.info.title, font: path.join(FONT_DIR, 'ZCOOLKuaiLe-Regular.ttf'), cells: o.info.shots.map((s, i) => ({ id: s.id, a: s.a, b: s.b, title: s.title, line: s.cue >= 0 ? o.info.lines[s.cue] : '', file: files[i] })) }));
  fs.mkdirSync(OUT_DIR, { recursive: true });
  py('qa.py', ['sheet', listFile, `${OUT_BASE}_分镜总览.jpg`]);
}

try {
  if (mode === 'info') await info();
  else if (mode === 'align') align();
  else if (mode === 'stills') await stills();
  else if (mode === 'sheet') await sheet();
  else if (mode === 'frames') await frames();
  else if (mode === 'encode') encode();
  else if (mode === 'mux') mux();
  else if (mode === 'qa') qa();
  else if (mode === 'full') { await frames(); encode(); if (audioFile) mux(); qa(); await sheet(); }
  else die(`未知命令 ${mode}\n${USAGE}`);
} catch (e) {
  console.error(`✗ ${e?.stack || e}`);
  process.exit(1);
}
