#!/usr/bin/env node
// 通用模板 · 出片命令行
//
//   node 通用模板/cli/film.mjs <命令> <作品目录> [选项]
//
//   info     打印时间轴：总帧数、每个镜头的切点
//   plan     还没有音源时的规划轴 → cues.json（measured=false，只能出无声样片）
//              day：台词.txt 按语速估算每句起止；mv：歌词 .srt 的时间原样照抄
//   align    按音源实测卡点 → cues.json（measured=true）
//              mv ：歌词 .srt + 原曲 → 实测全曲拍点，把每句起点吸附到最近的实拍（--no-snap 只测不挪）
//              day：台词.txt + 配音 → 按停顿切句（--words <ASR 词级时间戳.json> 可换成逐词对齐）
//   stills   <帧号…>            抽查静帧 → <工作目录>/stills/
//   sheet                       分镜总览图（每个镜头 62% 处一格）→ <输出>_分镜总览.jpg
//   sheet    --shot <镜头id[,镜头id…]> [--n 6] [--cell 640]   只看某个镜头：从头到尾抽 n 格 → <工作目录>/镜头_<id>.jpg（写镜头时用）
//   frames   [--from a --to b]  逐帧渲染 PNG 序列（每 300 帧一块，中断后重跑会续渲）
//   encode   [--bitrate 4700k | --crf 18] [--preset slow]   PNG 序列 → 无声 H.264
//   mux                         音轨对齐混入 → <输出>.mp4 + <输出>.srt（只接受按这条音源实测过的卡点）
//   sample                      没有音源时：<输出>_无声样片.mp4（文件名写明是样片）
//   qa       [--skip-frames]    自检 → <输出目录>/qa.json
//   full                        frames + encode + (mux | sample) + qa + sheet
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
const USAGE = '用法：node 通用模板/cli/film.mjs <info|plan|align|stills|sheet|frames|encode|mux|sample|qa|full> <作品目录> [选项]';
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
const SAMPLE = `${OUT_BASE}_无声样片.mp4`;
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

/**
 * 画面源码指纹：从 project.tsx 出发顺着 import 走一遍，把这部片子真正用到的源文件（引擎 + 镜头 + 图集 + 字体）哈希起来。
 * 帧序列和 qa.json 都记着它：源码一改，旧帧作废；也能事后核对「仓库里的成片是不是现在这份源码渲出来的」。
 * 卡点（cues.json）不算在内——它体现在时间轴里，另有指纹。
 */
function sourceFingerprint() {
  const seen = new Map();
  const exts = ['', '.ts', '.tsx', '.mjs', '.js', '.json', '/index.ts', '/index.tsx'];
  const resolve = (from, spec) => {
    let base;
    if (spec === '@tpl' || spec.startsWith('@tpl/')) base = path.join(ENGINE, spec.slice(5));
    else if (spec.startsWith('.')) base = path.resolve(path.dirname(from), spec);
    else return null; // npm 包：版本由 package-lock.json 锁定，不在这里算
    for (const e of exts) { const f = base + e; if (fs.existsSync(f) && fs.statSync(f).isFile()) return f; }
    throw new Error(`[指纹] ${rel(from)} 引用的 ${spec} 找不到`);
  };
  const visit = (file) => {
    if (seen.has(file)) return;
    const buf = fs.readFileSync(file);
    seen.set(file, crypto.createHash('sha256').update(buf).digest('hex'));
    if (!/\.(tsx?|mjs|js)$/.test(file)) return;
    const src = buf.toString('utf8');
    const re = /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;
    for (let m; (m = re.exec(src));) { const f = resolve(file, m[1] || m[2] || m[3]); if (f) visit(f); }
  };
  visit(path.join(PROJ, 'project.tsx'));
  visit(path.join(ENGINE, 'register.tsx'));
  const h = crypto.createHash('sha256');
  const files = [...seen.keys()].filter((f) => path.basename(f) !== 'cues.json').sort();
  for (const f of files) h.update(rel(f)).update('\0').update(seen.get(f)).update('\0');
  return { sha256: h.digest('hex'), files: files.map(rel) };
}

// —— 口播台词（day）：一行一句，行首可写「角色:」或「角色/头像:」 ——
const CAST = ['whale', 'gpt', 'claude', 'doubao', 'gemini', 'kimi', 'qwen', 'zai'];
function readScript() {
  const file = path.resolve(PROJ, film.script || '台词.txt');
  if (!fs.existsSync(file)) die(`找不到台词文件 ${rel(file)}（film.json 的 script）`);
  if (film.speaker && !CAST.includes(film.speaker)) die(`film.json 的 speaker「${film.speaker}」不在角色表里（${CAST.join(' ')}）`);
  const lines = [];
  fs.readFileSync(file, 'utf8').split(/\r?\n/).forEach((raw, n) => {
    const ln = raw.trim();
    if (!ln || ln.startsWith('#')) return;
    const m = /^([A-Za-z]+)(?:\/([A-Za-z0-9_]+))?\s*[:：]\s*(.+)$/.exec(ln);
    let who = film.speaker || null, face = null, text = ln;
    if (m) {
      if (!CAST.includes(m[1])) die(`${rel(file)} 第 ${n + 1} 行：不认识的角色「${m[1]}」（可用：${CAST.join(' ')}）`);
      who = m[1]; face = m[2] || null; text = m[3].trim();
    }
    lines.push({ text, ...(who ? { who } : {}), ...(face ? { face } : {}) });
  });
  if (!lines.length) die(`${rel(file)} 里一句台词都没有`);
  return { file, lines };
}

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
  const fp = sourceFingerprint();
  info.source_sha256 = fp.sha256;
  info.source_files = fp.files;
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
  console.log(`源码指纹 ${I.source_sha256.slice(0, 16)}…（${I.source_files.length} 个源文件）`);
  if (fs.existsSync(QA_FILE)) {
    const was = JSON.parse(fs.readFileSync(QA_FILE, 'utf8')).project?.source_sha256;
    if (!was) console.log('  成片/qa.json 里没有记录源码指纹：这份成片不是由当前模板逐帧自检过的那批帧生成的（或自检时跳过了逐帧检查）');
    else console.log(was === I.source_sha256 ? '  与 成片/qa.json 记录的一致：仓库里的成片就是这份源码渲的' : `  ⚠ 与 成片/qa.json 记录的（${was.slice(0, 16)}…）不一致：源码在出片之后改过，成片需要重渲`);
  }
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
  // 换了卡点 / 改了镜头或引擎之后旧帧作废：帧目录里记着上次渲染用的「时间轴 + 源码」指纹
  const stampFile = path.join(FRAMES, '_stamp.sha');
  const stamp = crypto.createHash('sha256').update(JSON.stringify([o.info.shots, o.info.starts, o.info.ends, o.info.frames, o.info.source_sha256])).digest('hex');
  if (fs.existsSync(stampFile) && fs.readFileSync(stampFile, 'utf8') !== stamp && !flag('--keep')) {
    console.log('[frames] 时间轴或源码变了，清空旧帧重渲（确定旧帧还能用就加 --keep）');
    fs.rmSync(FRAMES, { recursive: true, force: true }); fs.mkdirSync(FRAMES, { recursive: true });
  }
  fs.writeFileSync(stampFile, stamp);
  // 这批帧是哪份源码渲的：自检时从这里读，而不是拿「自检那一刻的源码」冒充
  fs.writeFileSync(path.join(FRAMES, '_source.json'), JSON.stringify({ source_sha256: o.info.source_sha256, source_files: o.info.source_files.length }));
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

/**
 * 字幕文字只存在 cues.json 里（渲染时不再读台词 / 歌词文件）。所以台词改了而没重跑 plan / align，
 * 渲出来的还是旧台词，而且没有任何报错——这里把它拦下。
 */
function requireFreshText() {
  const cues = JSON.parse(fs.readFileSync(CUES_FILE, 'utf8'));
  const day = film.kind === 'day';
  const file = path.resolve(PROJ, day ? film.script || '台词.txt' : film.subtitles || '歌词.srt');
  const was = day ? cues.source?.script_sha256 : cues.source?.subtitles_sha256;
  const redo = day ? '重跑 plan（没有配音）或 align（有配音）' : '重跑 align（有原曲）或 plan（没有原曲）';
  if (!fs.existsSync(file)) die(`找不到${day ? '台词' : '歌词'}文件 ${rel(file)}（film.json 的 ${day ? 'script' : 'subtitles'}）`);
  if (!was) die(`${rel(CUES_FILE)} 没有记录它是按哪一版${day ? '台词' : '歌词'}做的：${redo}`);
  if (was !== sha256(file)) die(`${rel(file)} 改过了，${rel(CUES_FILE)} 还是按旧的那版做的：${redo}`);
}

/** 出成片的前提：卡点是按「现在这条音源」实测过的。估出来的轴、按另一条音频测的轴，一律不许混音出片 */
function requireMeasured() {
  const src = needAudio();
  const cues = JSON.parse(fs.readFileSync(CUES_FILE, 'utf8'));
  if (cues.measured !== true) die(`${rel(CUES_FILE)} 标着 measured=false（卡点是估的）：先跑 align 按音源实测，再出成片`);
  const was = cues.source?.audio_sha256;
  if (!was) die(`${rel(CUES_FILE)} 没有记录它是按哪条音频测的（source.audio_sha256）：重新跑一次 align`);
  if (was !== sha256(src)) die(`${rel(CUES_FILE)} 是按另一条音频测的（SHA256 对不上）：换了音源就要重新 align`);
  return src;
}

/** 没有音源时的产物：无声样片（文件名里写明，免得被当成成片） */
function sample() {
  const I = savedInfo();
  const videoFile = opt('--video', path.join(WORK, 'video.mp4'));
  if (!fs.existsSync(videoFile)) die(`没有画面流 ${videoFile}，先跑 encode`);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.copyFileSync(videoFile, SAMPLE);
  fs.writeFileSync(SAMPLE.replace(/\.mp4$/, '.srt'), srtText(I));
  console.log(`SAMPLE_OK ${rel(SAMPLE)} ${(fs.statSync(SAMPLE).size / 1e6).toFixed(1)} MB（无声样片，不是成片）`);
}

function mux() {
  const I = savedInfo();
  const videoFile = opt('--video', path.join(WORK, 'video.mp4'));
  if (!fs.existsSync(videoFile)) die(`没有画面流 ${videoFile}，先跑 encode`);
  const src = requireMeasured();
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

/**
 * 口播片还没有配音时的规划轴：按语速估每句的起止 → cues.json（measured=false，只能出无声样片）。
 * 估法沿用旧项目：每个分句 = max(0.8 秒, 字数 ÷ 语速)，每个标点 0.15 秒，句间 0.18 秒，开头留 0.25 秒；默认语速 3.36 字/秒（Day13 实测）。
 */
function plan() {
  if (fs.existsSync(CUES_FILE) && JSON.parse(fs.readFileSync(CUES_FILE, 'utf8')).measured === true && !flag('--force')) die(`${rel(CUES_FILE)} 已经是实测轴（measured=true），plan 会把它盖成估算轴。确实要重估就加 --force`);
  if (film.kind === 'mv') {
    // MV：歌词 .srt 自带时间，原样抄进 cues.json，但标 measured=false——还没对过原曲的拍点
    const srt = path.resolve(PROJ, film.subtitles || '歌词.srt');
    if (!fs.existsSync(srt)) die(`找不到歌词文件 ${rel(srt)}（film.json 的 subtitles）`);
    const sec = (h, m, s2, ms) => Number(h) * 3600 + Number(m) * 60 + Number(s2) + Number(ms) / 1000;
    const cues = [];
    for (const block of fs.readFileSync(srt, 'utf8').replace(/\r/g, '').split(/\n\s*\n/)) {
      const rows = block.split('\n').map((x) => x.trim()).filter(Boolean);
      const ti = rows.findIndex((x) => x.includes('-->'));
      if (ti < 0) continue;
      const m = /(\d+):(\d+):(\d+)[,.](\d+)\s*-->\s*(\d+):(\d+):(\d+)[,.](\d+)/.exec(rows[ti]);
      if (!m) die(`${rel(srt)}：看不懂这一行时间「${rows[ti]}」`);
      cues.push({ text: rows.slice(ti + 1).join(' '), start: sec(m[1], m[2], m[3], m[4]), end: sec(m[5], m[6], m[7], m[8]) });
    }
    if (!cues.length) die(`${rel(srt)} 里没有歌词`);
    fs.writeFileSync(CUES_FILE, JSON.stringify({ measured: false, method: '规划轴：歌词 .srt 的时间原样照抄，没有对过原曲拍点，只能出无声样片', source: { subtitles: path.relative(PROJ, srt), subtitles_sha256: sha256(srt) }, beat: null, lines: cues }, null, 1) + '\n');
    console.log(`PLAN_OK ${rel(CUES_FILE)} · ${cues.length} 句（measured=false；原曲到位后跑 align）`);
    return;
  }
  const { file, lines } = readScript();
  const rate = Number(opt('--rate', 3.36)), gap = Number(opt('--gap', 0.18)), lead = Number(opt('--lead', 0.25));
  const PUNCT = /[，。！？…—；：、,.!?;:~～]/;
  const r3 = (x) => Math.round(x * 1000) / 1000;
  let t = lead;
  const out = lines.map((l) => {
    let dur = 0, units = 0;
    const flush = () => { if (units > 0) dur += r3(Math.max(0.8, units / rate)); units = 0; }; // 每个分句的时长先舍到毫秒（与旧项目的规划工具同一口径，两边逐句一致）
    for (const ch of l.text) {
      if (PUNCT.test(ch)) { flush(); dur += 0.15; } else if (!/\s/.test(ch)) units += ch.charCodeAt(0) < 128 ? 0.5 : 1;
    }
    flush();
    const cue = { text: l.text, start: r3(t), end: r3(t + dur), ...(l.who ? { who: l.who } : {}), ...(l.face ? { face: l.face } : {}) };
    t += dur + gap;
    return cue;
  });
  const data = {
    measured: false,
    method: `规划轴：按 ${rate} 字/秒估算（每个分句不少于 0.8 秒，每个标点 0.15 秒，句间 ${gap} 秒）。没有对齐任何音频，只能出无声样片`,
    source: { script: path.relative(PROJ, file), script_sha256: sha256(file) },
    beat: null,
    lines: out,
  };
  fs.writeFileSync(CUES_FILE, JSON.stringify(data, null, 1) + '\n');
  console.log(`PLAN_OK ${rel(CUES_FILE)} · ${out.length} 句 · 估计 ${out[out.length - 1].end.toFixed(2)} 秒（measured=false）`);
}

function align() {
  const src = needAudio();
  const common = ['--out', CUES_FILE, '--audio-name', path.relative(PROJ, src), '--audio-sha256', sha256(src)];
  if (film.kind === 'mv') {
    const srt = path.resolve(PROJ, film.subtitles || '歌词.srt');
    if (!fs.existsSync(srt)) die(`找不到歌词文件 ${rel(srt)}（film.json 的 subtitles）`);
    if (flag('--no-snap')) common.push('--no-snap');
    py('align_beats.py', ['--wav', wavOf(src, 22050, 'source'), '--srt', srt, '--srt-name', path.relative(PROJ, srt), ...common]);
    const c = JSON.parse(fs.readFileSync(CUES_FILE, 'utf8'));
    c.source = { ...c.source, subtitles_sha256: sha256(srt) }; // 这份卡点是按哪一版歌词做的
    fs.writeFileSync(CUES_FILE, JSON.stringify(c, null, 1) + '\n');
  } else {
    const { file, lines } = readScript();
    const linesFile = path.join(WORK, 'script_lines.json');
    fs.mkdirSync(WORK, { recursive: true });
    fs.writeFileSync(linesFile, JSON.stringify(lines));
    const extra = [];
    if (opt('--words')) extra.push('--words', path.resolve(opt('--words')));
    if (opt('--min-pause')) extra.push('--min-pause', opt('--min-pause'));
    if (flag('--accept-uneven')) extra.push('--accept-uneven');
    py('align_voice.py', ['--wav', wavOf(src, 16000, 'source'), '--lines', linesFile, '--script-name', path.relative(PROJ, file), '--script-sha256', sha256(file), ...common, ...extra]);
  }
  console.log(`ALIGN_OK ${rel(CUES_FILE)}`);
}

function qa() {
  const I = savedInfo();
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const final = `${OUT_BASE}.mp4`;
  const infoFile = path.join(WORK, 'info.json');
  const silent = !audioFile;
  const PROBE = 'stream=codec_type,codec_name,profile,pix_fmt,color_space,color_range,width,height,r_frame_rate,nb_frames,duration,sample_rate,channels,bit_rate:format=duration,size,bit_rate';
  if (fs.existsSync(QA_FILE)) fs.rmSync(QA_FILE); // 每次自检都从头写，不留上一次的结论
  if (!flag('--skip-frames')) py('qa.py', ['frames', FRAMES, '--info', infoFile, '--qa', QA_FILE]);
  py('qa.py', ['timing', '--info', infoFile, '--cues', CUES_FILE, '--qa', QA_FILE, ...(silent ? ['--silent-sample'] : [])]);
  const data = JSON.parse(fs.readFileSync(QA_FILE, 'utf8'));
  const frameCheck = (file, probed, problems) => {
    const v = probed.streams.find((x) => x.codec_type === 'video');
    if (Number(v.nb_frames) !== I.frames) problems.push(`${path.basename(file)} 的画面是 ${v.nb_frames} 帧，时间轴是 ${I.frames} 帧`);
    if (v.width !== I.width || v.height !== I.height) problems.push(`${path.basename(file)} 的分辨率是 ${v.width}×${v.height}`);
  };
  if (!silent && fs.existsSync(final)) {
    const srcWav = wavOf(needAudio(), 48000, 'source');
    const outWav = path.join(WORK, 'final_audio_48000.wav');
    ff(['-y', '-i', final, '-vn', '-ac', '2', '-ar', '48000', '-c:a', 'pcm_s16le', '-f', 'wav', outWav]);
    ff(['-v', 'error', '-i', final, '-map', '0:v:0', '-map', '0:a:0', '-c:v', 'rawvideo', '-c:a', 'pcm_s16le', '-f', 'null', '-']); // 全片解码一遍，坏流会在这里报错
    const mixReport = path.join(WORK, 'mix_report.json');
    py('qa.py', ['final', final, srcWav, outWav, '--info', infoFile, '--offset', String(film.audio.offset || 0), '--qa', QA_FILE, ...(fs.existsSync(mixReport) ? ['--mix-report', mixReport] : [])]);
    data.final = JSON.parse(fs.readFileSync(QA_FILE, 'utf8')).final;
    data.final.full_decode = 'ok';
    data.final.probe = probe(final, PROBE);
    frameCheck(final, data.final.probe, data.final.problems);
  } else if (silent && fs.existsSync(SAMPLE)) {
    ff(['-v', 'error', '-i', SAMPLE, '-map', '0:v:0', '-c:v', 'rawvideo', '-f', 'null', '-']);
    data.sample = { file: path.basename(SAMPLE), bytes: fs.statSync(SAMPLE).size, sha256: sha256(SAMPLE), full_decode: 'ok', probe: probe(SAMPLE, PROBE), problems: [] };
    frameCheck(SAMPLE, data.sample.probe, data.sample.problems);
  } else {
    console.log('[qa] 还没有成片 / 样片，跳过成片检查');
  }
  // 源码指纹只在「这次自检真的逐帧查过工作目录里的 PNG 序列」时才写：它说的是「这批帧（也就是成片的画面）是这份源码渲的」
  const srcFile = path.join(FRAMES, '_source.json');
  const rendered = !flag('--skip-frames') && fs.existsSync(srcFile) ? JSON.parse(fs.readFileSync(srcFile, 'utf8')) : null;
  data.project = { id: I.id, kind: I.kind, title: I.title, frames: I.frames, duration: I.duration, shots: I.shots.length, lines: I.lines.length, source_sha256: rendered?.source_sha256 ?? null, source_files: rendered?.source_files ?? null };
  data.checked_at = new Date().toISOString();
  fs.writeFileSync(QA_FILE, JSON.stringify(data, null, 1));
  const problems = [...(data.frames?.problems || []), ...(data.timing?.problems || []), ...(data.final?.problems || []), ...(data.sample?.problems || [])];
  console.log(problems.length ? `QA_PROBLEMS ${problems.length}\n  - ${problems.join('\n  - ')}` : `QA_OK ${rel(QA_FILE)}`);
  for (const n of data.timing?.notes || []) console.log(`  注：${n}`);
  if (problems.length) process.exitCode = 1;
}

async function sheet() {
  const o = await openComposition();
  const only = opt('--shot');
  if (only) { for (const id of only.split(',').filter(Boolean)) await shotSheet(o, id); return; }
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

/** 单个镜头从头到尾抽 n 格（写镜头时用来看走位、道具时机、有没有人被画框切掉）→ 工作目录，不进成片目录 */
async function shotSheet(o, id) {
  const s = o.info.shots.find((x) => x.id === id);
  if (!s) die(`没有镜头 ${id}。现有：${o.info.shots.map((x) => x.id).join(' ')}`);
  const n = Math.max(2, Math.min(24, Number(opt('--n', 6)) || 6));
  const cellW = Number(opt('--cell', 640)) || 640;
  const fa = Math.ceil(s.a * o.info.fps - 1e-6), fb = Math.min(o.info.frames, Math.ceil(s.b * o.info.fps - 1e-6)) - 1;
  const picks = [...new Set(Array.from({ length: n }, (_, i) => Math.round(fa + ((fb - fa) * i) / (n - 1))))];
  const files = await stills(picks);
  const lineAt = (t) => { const i = o.info.starts.findIndex((a, k) => t >= a && t <= o.info.ends[k]); return i >= 0 ? `第${i + 1}句 ${o.info.lines[i]}` : ''; };
  const listFile = path.join(WORK, 'sheet_shot.json');
  const out = path.join(WORK, `镜头_${id}.jpg`);
  fs.writeFileSync(listFile, JSON.stringify({ title: `${o.info.title} ${id}`, font: path.join(FONT_DIR, 'ZCOOLKuaiLe-Regular.ttf'), cols: n <= 4 ? 2 : 3, cell: cellW >= 320 ? [cellW, Math.round((cellW * 9) / 16)] : [640, 360],
    cells: picks.map((f, i) => ({ id: `${id} f${f}`, a: f / o.info.fps, b: null, title: `镜头内 ${(((f - fa) / Math.max(1, fb - fa)) * 100).toFixed(0)}%`, line: lineAt(f / o.info.fps), file: files[i] })) }));
  py('qa.py', ['sheet', listFile, out]);
}

try {
  if (!['plan', 'align'].includes(mode) && !fs.existsSync(CUES_FILE)) {
    die(`还没有 ${rel(CUES_FILE)}：${film.kind === 'day' ? '口播片先跑 plan（没配音时估一份规划轴）或 align（按配音实测）' : 'MV 先跑 align（按原曲实测拍点）'}`);
  }
  if (!['plan', 'align'].includes(mode) && !opt('--cues')) requireFreshText(); // --cues 是临时换轴做对比，不查
  if (mode === 'info') await info();
  else if (mode === 'plan') plan();
  else if (mode === 'align') align();
  else if (mode === 'stills') await stills();
  else if (mode === 'sheet') await sheet();
  else if (mode === 'frames') await frames();
  else if (mode === 'encode') encode();
  else if (mode === 'mux') mux();
  else if (mode === 'qa') qa();
  else if (mode === 'sample') sample();
  else if (mode === 'full') {
    if (audioFile) requireMeasured(); // 先查卡点，别渲了半小时才发现轴不对
    await frames(); encode();
    if (audioFile) mux(); else sample();
    qa(); await sheet();
  }
  else die(`未知命令 ${mode}\n${USAGE}`);
} catch (e) {
  console.error(`✗ ${e?.stack || e}`);
  process.exit(1);
}
