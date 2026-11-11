#!/usr/bin/env node
// render_cli.mjs — 通用数据驱动 Remotion 渲染与校验 CLI（同时支持 Day 系列单集与音乐 MV）
// 用法：
//   Day 系列：node tools/remotion-engine/render_cli.mjs --mode episode --spec <episode.spec.mjs> --alignment <json> --subtitle-file <json> [--voice <wav>] [--dry-run|--bundle-check|--out <mp4>]
//   音乐 MV ：node tools/remotion-engine/render_cli.mjs --mode mv --spec <mv.spec.mjs> [--lyrics <json>] [--audio <mp3/wav>] [--mux-audio <source>] [--still-frames f1,f2 --out-dir <dir>] [--out <mp4>]

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { adaptEpisodeToRemotionProps } from '../engine/remotion_episode_adapter.mjs';
import { adaptMvToRemotionProps } from './mv_adapter.mjs';
import { evaluateRemotionFrameState } from './frame_evaluator.mjs';
import { auditTimelineActivity, semanticStateAt } from '../engine/timeline_core.mjs';
import { POSES } from '../engine/whale_rig/whale_poses.mjs';
import { IMAGE_ACTORS } from '../engine/performance_v2.mjs';
import { ensureWalkRigAtlases, WALK_RIG_BUILDERS, DEFAULT_WALK_CACHE_DIR } from './walk_rig_builder.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '../..');

function argOf(argv, flag) {
  const idx = argv.indexOf(flag);
  return idx >= 0 && idx + 1 < argv.length ? argv[idx + 1] : null;
}

async function loadModuleSpec(specPath) {
  const mod = await import(pathToFileURL(path.resolve(specPath)).href);
  const spec = mod.default || mod.SPEC || mod.spec;
  if (!spec) throw new Error(`分镜文件 ${specPath} 须 default 导出配置对象`);
  return spec;
}

export function startLocalAssetServer(rootDir, walkRigDir = DEFAULT_WALK_CACHE_DIR, { walkRigFiles = {}, extraFiles = {} } = {}) {
  const mimeMap = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.ttf': 'font/ttf',
    '.otf': 'font/otf',
    '.woff2': 'font/woff2',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.m4a': 'audio/mp4',
    '.mp4': 'video/mp4',
  };
  const server = http.createServer((req, res) => {
    const cleanUrl = decodeURIComponent((req.url || '/').split('?')[0]);
    let filePath;
    if (Object.prototype.hasOwnProperty.call(extraFiles, cleanUrl)) {
      // 显式挂载的单文件（例如放在仓库外的 --font 字体）
      filePath = path.resolve(extraFiles[cleanUrl]);
      if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
    } else if (cleanUrl.startsWith('/__walk_rigs__/')) {
      const relRig = cleanUrl.slice('/__walk_rigs__/'.length);
      // ensureWalkRigAtlases() 对「仓库里已有预烘成品」的图集只返回成品路径、不往缓存目录落盘。
      // 只查缓存目录 = 全新机器上 22 张步态/待机图集全部 404（旧机器则读到 /tmp 里的过期缓存）。
      const rigName = relRig.replace(/\.png$/i, '');
      const mapped = Object.prototype.hasOwnProperty.call(walkRigFiles, rigName) ? walkRigFiles[rigName] : null;
      filePath = mapped ? path.resolve(mapped) : path.resolve(walkRigDir, relRig);
      const allowed = Boolean(mapped) || filePath.startsWith(path.resolve(walkRigDir) + path.sep);
      if (!allowed || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
    } else {
      filePath = path.resolve(rootDir, '.' + cleanUrl);
      if (!filePath.startsWith(rootDir) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': mimeMap[ext] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*',
    });
    fs.createReadStream(filePath).pipe(res);
  });
  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${addr.port}` });
    });
  });
}

export function buildAssetUrlMap(baseUrl, walkRigFiles = null) {
  const map = {};
  const whaleFallbackPoses = {
    idle: 'assets/ai-girls/lyric-v8/source/whale_neutral.png',
    wave: 'assets/ai-girls/lyric-v8/source/whale_wave.png',
    point: 'assets/ai-girls/lyric-action-v13/source/whale_point.png',
    run: 'assets/ai-girls/lyric-action-v13/source/whale_walk_retry.png',
    walk_stand: 'assets/ai-girls/lyric-action-v13/source/whale_walk_retry.png',
    run_stand: 'assets/ai-girls/lyric-action-v13/source/whale_walk_retry.png',
    umbrella_stroll: 'assets/ai-girls/lyric-action-v13/source/whale_rainwalk.png',
    camera_shutter: 'assets/ai-girls/lyric-action-v13/source/whale_camera.png',
    think: 'assets/ai-girls/lyric-action-v13/source/whale_read.png',
    wake_stretch: 'assets/ai-girls/lyric-action-v13/source/whale_selfkind_retry.png',
    cheer: 'assets/ai-girls/lyric-action-v13/source/whale_meet.png',
  };
  for (const [poseName, info] of Object.entries(POSES)) {
    const primaryRel = `tools/engine/whale_rig/${info.file}`;
    const fallbackRel = whaleFallbackPoses[poseName];
    const chosenRel = fs.existsSync(path.join(REPO_ROOT, primaryRel))
      ? primaryRel
      : (fallbackRel && fs.existsSync(path.join(REPO_ROOT, fallbackRel)) ? fallbackRel : null);
    if (chosenRel) {
      map[`pose:${poseName}`] = `${baseUrl}/${encodeURI(chosenRel)}`;
      map[poseName] = map[`pose:${poseName}`];
    }
  }
  for (const [actorId, info] of Object.entries(IMAGE_ACTORS)) {
    if (fs.existsSync(path.join(REPO_ROOT, info.path))) {
      map[`actor:${actorId}`] = `${baseUrl}/${encodeURI(info.path)}`;
      map[actorId] = map[`actor:${actorId}`];
    }
  }

  // 注册 16 帧动作图集目录 (assets/ai-girls/lyric-action-v13/*.png)
  const atlasDir = path.join(REPO_ROOT, 'assets/ai-girls/lyric-action-v13');
  if (fs.existsSync(atlasDir)) {
    for (const entry of fs.readdirSync(atlasDir)) {
      if (!entry.endsWith('.png')) continue;
      const base = entry.slice(0, -4);
      const rel = `assets/ai-girls/lyric-action-v13/${entry}`;
      const url = `${baseUrl}/${encodeURI(rel)}`;
      map[`atlas:${base}`] = url;
      if (!map[base]) map[base] = url;
    }
  }

  // 注册程序化双腿交替行走与长椅坐姿 16 帧图集 (/__walk_rigs__/*.png)
  for (const rigName of Object.keys(WALK_RIG_BUILDERS)) {
    // 只登记真正存在（预烘或已落盘）的图集；缺的交给 preflightRemotionAssets() 明确报错，不留悬空 URL
    if (walkRigFiles && !walkRigFiles[rigName]) continue;
    const url = `${baseUrl}/__walk_rigs__/${encodeURIComponent(rigName)}.png`;
    map[`atlas:${rigName}`] = url;
    map[rigName] = url;
  }

  return map;
}

// 首选字体。注意：这两个路径都写在 .gitignore 里，全新克隆 / CI / 沙箱里一定不存在。
const FONT_PRIMARY_CANDIDATES = [
  'video-fx/assets/fonts/NotoSansSC-Bold.ttf',
  'tools/mv_extra/cache/NotoSansSC-Bold.ttf',
];
// 仓库里真实入库的 OFL 中文字体：只作「至少不出豆腐块」的兜底，字形与定稿不同，使用时必须告警。
const FONT_IN_REPO_FALLBACK = '番外MV/童话镇-paper-popup/fonts/ZCOOLKuaiLe-Regular.ttf';

/** 解析中文字体文件：--font / NEWDAY_FONT > NotoSansSC-Bold（首选）> 仓库内兜底 > null */
export function resolveFontFile(argv = []) {
  const explicit = argOf(argv, '--font') || process.env.NEWDAY_FONT || null;
  if (explicit) {
    const abs = path.resolve(explicit);
    if (!fs.existsSync(abs)) throw new Error(`--font / NEWDAY_FONT 指向的字体不存在：${abs}`);
    return { file: abs, kind: 'explicit' };
  }
  for (const rel of FONT_PRIMARY_CANDIDATES) {
    const abs = path.join(REPO_ROOT, rel);
    if (fs.existsSync(abs)) return { file: abs, kind: 'primary' };
  }
  const fallback = path.join(REPO_ROOT, FONT_IN_REPO_FALLBACK);
  if (fs.existsSync(fallback)) return { file: fallback, kind: 'fallback' };
  return null;
}

function fontRouteOf(fontFile) {
  return `/__font__/${path.basename(fontFile)}`;
}

function resolveFontUrl(baseUrl, fontFile = null) {
  if (!baseUrl) return null;
  if (fontFile) return `${baseUrl}${encodeURI(fontRouteOf(fontFile))}`;
  for (const rel of FONT_PRIMARY_CANDIDATES) {
    if (fs.existsSync(path.join(REPO_ROOT, rel))) {
      return `${baseUrl}/${encodeURI(rel)}`;
    }
  }
  return null;
}

function resolveBundledFfmpeg() {
  const candidates = [
    path.join(HERE, 'node_modules/@remotion/compositor-linux-x64-gnu/ffmpeg'),
    path.join(HERE, 'node_modules/@remotion/compositor-linux-arm64-gnu/ffmpeg'),
    path.join(HERE, 'node_modules/@remotion/compositor-darwin-arm64/ffmpeg'),
    path.join(HERE, 'node_modules/@remotion/compositor-darwin-x64/ffmpeg'),
    'ffmpeg',
  ];
  for (const c of candidates) {
    if (c === 'ffmpeg' || fs.existsSync(c)) return c;
  }
  return 'ffmpeg';
}

async function prepareHeadlessChromium() {
  if (process.env.REMOTION_BROWSER_EXECUTABLE) {
    return process.env.REMOTION_BROWSER_EXECUTABLE;
  }
  const chromiumMod = await import('@sparticuz/chromium');
  const chromium = chromiumMod.default || chromiumMod;
  const inflate = chromiumMod.inflate || chromium.inflate;
  const al2023Br = path.join(HERE, 'node_modules/@sparticuz/chromium/bin/al2023.tar.br');
  if (typeof inflate === 'function' && fs.existsSync(al2023Br)) {
    const libRoot = await inflate(al2023Br);
    const libDir = `${libRoot}/lib`;
    if (!(process.env.LD_LIBRARY_PATH || '').includes(libDir)) {
      process.env.LD_LIBRARY_PATH = `${libDir}${process.env.LD_LIBRARY_PATH ? ':' + process.env.LD_LIBRARY_PATH : ''}`;
    }
  }
  return chromium.executablePath();
}

export async function buildRemotionInputPropsFromCli(argv = process.argv.slice(2), baseUrl = '', { walkRigFiles = null, fontFile = null } = {}) {
  const mode = argOf(argv, '--mode') || 'mv';
  const specPath = argOf(argv, '--spec');
  if (!specPath) throw new Error('缺少 --spec <spec.mjs>');
  const spec = await loadModuleSpec(specPath);
  const assetUrlMap = baseUrl ? buildAssetUrlMap(baseUrl, walkRigFiles) : {};
  const fontUrl = resolveFontUrl(baseUrl, fontFile);
  const muxAudio = argOf(argv, '--mux-audio');

  if (mode === 'episode') {
    const alignmentPath = argOf(argv, '--alignment');
    const subsPath = argOf(argv, '--subtitle-file');
    const voicePath = argOf(argv, '--voice') || argOf(argv, '--audio');
    if (!alignmentPath || !subsPath) throw new Error('episode 模式需要 --alignment 与 --subtitle-file');
    const alignment = JSON.parse(fs.readFileSync(alignmentPath, 'utf8'));
    const subdata = JSON.parse(fs.readFileSync(subsPath, 'utf8'));
    const props = adaptEpisodeToRemotionProps({
      spec,
      alignment,
      subdata,
      voicePath,
      repoRoot: REPO_ROOT,
      planningPreview: argv.includes('--planning-preview'),
      autoStageProgression: argv.includes('--auto-sets') ? true : undefined,
    });
    props.assetUrlMap = assetUrlMap;
    props.fontUrl = fontUrl;
    props.externalAudioMux = Boolean(muxAudio);
    if (voicePath && baseUrl && !muxAudio) {
      const relVoice = path.relative(REPO_ROOT, path.resolve(voicePath));
      if (!relVoice.startsWith('..')) props.audioUrl = `${baseUrl}/${encodeURI(relVoice)}`;
    }
    return props;
  }

  const lyricsPath = argOf(argv, '--lyrics');
  const audioPath = argOf(argv, '--audio') || argOf(argv, '--voice');
  const lyrics = lyricsPath ? JSON.parse(fs.readFileSync(lyricsPath, 'utf8')) : null;
  const props = adaptMvToRemotionProps({
    spec,
    lyrics,
    audioPath,
    repoRoot: REPO_ROOT,
    assetUrlMap,
  });
  props.fontUrl = fontUrl;
  props.externalAudioMux = Boolean(muxAudio);
  if (props.audioSrc && baseUrl && !muxAudio) {
    const relAudio = path.relative(REPO_ROOT, props.audioSrc);
    if (!relAudio.startsWith('..')) props.audioUrl = `${baseUrl}/${encodeURI(relAudio)}`;
  }
  return props;
}

export function auditRemotionPropsActivity(props) {
  const audit = auditTimelineActivity(
    (t) => {
      const st = evaluateRemotionFrameState(props, t);
      const semanticProps = (st.shot.semanticTracks || st.shot.propTracks || [])
        .map((tr) => semanticStateAt(tr, t))
        .filter(Boolean)
        .map((ps) => [
          ps.x,
          ps.y,
          ps.scale,
          ps.scaleX,
          ps.opacity,
          ...(ps.marks || []).map((m) => m.progress || 0),
        ]);
      return {
        cam: [st.camera.cx, st.camera.cy, st.camera.z],
        reactive: [
          st.setState.reactive.doorOpen,
          st.setState.reactive.gateOpen,
          st.setState.reactive.lampLit,
          st.setState.reactive.dawn,
          st.setState.reactive.deskShake,
        ],
        actors: st.actors.map((a) => [
          a.x,
          a.y,
          a.lean,
          a.sx,
          a.sy,
          a.lift,
          a.atlasFrame || 0,
          a.anim?.bones?.tail?.rot || 0,
          a.anim?.bones?.armR?.rot || 0,
        ]),
        boundProps: st.worldState.boundProps.map((p) => [p.x, p.y, p.rotation]),
        semanticProps,
      };
    },
    { duration: props.duration, fps: 10, windowSec: 0.5, minActiveDelta: 0.02, maxStaticSpanSec: 1.0 }
  );

  const filteredStretches = audit.staticStretches.filter((stretch) => {
    const mid = (stretch.start + stretch.end) * 0.5;
    const st = evaluateRemotionFrameState(props, mid);
    if (st.shot.idleException && st.actors.length === 0) return false;
    return true;
  });

  return {
    ...audit,
    staticStretches: filteredStretches,
    passed: filteredStretches.length === 0,
  };
}

function pngSizeOf(buf) {
  if (!buf || buf.length < 24 || buf.readUInt32BE(0) !== 0x89504e47) return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

/** 逐帧扫描全片，收集真正会被画到的图集（含声明列数）与立绘键 */
export function collectRequiredAssets(props) {
  const fps = props.fps || 30;
  const total = Math.max(1, props.durationInFrames || Math.ceil((props.duration || 0) * fps));
  const atlases = new Map();
  const sprites = new Set();
  for (let f = 0; f < total; f++) {
    const st = evaluateRemotionFrameState(props, f / fps);
    for (const a of st.actors) {
      if ((a.opacity ?? 1) <= 0.01 || a.renderMode === 'puppet') continue;
      if (a.atlas) {
        atlases.set(a.atlas, a.atlasCols || 16);
        if (a.prevAtlas) atlases.set(a.prevAtlas, a.prevAtlasCols || a.atlasCols || 16);
      } else if (a.assetId) {
        sprites.add(`actor:${a.assetId}`);
      } else {
        if (a.pose) sprites.add(`pose:${a.pose}`);
        if (a.prevPose) sprites.add(`pose:${a.prevPose}`);
      }
    }
  }
  return { atlases, sprites };
}

/**
 * 素材预检：走真实 HTTP 链路逐个取回全片用到的图集/立绘。
 * 未登记、404、列数与真实像素不符 —— 一律在开渲前报错，不允许「渲染成功但角色消失/被拉伸」。
 */
export async function preflightRemotionAssets(props, { allowMissing = false } = {}) {
  const { atlases, sprites } = collectRequiredAssets(props);
  const urlMap = props.assetUrlMap || {};
  const problems = [];
  const preloadUrls = new Set();
  const probe = async (url) => {
    try {
      const res = await fetch(url);
      if (!res.ok) return { ok: false, why: `HTTP ${res.status}` };
      return { ok: true, size: pngSizeOf(Buffer.from(await res.arrayBuffer())) };
    } catch (err) {
      return { ok: false, why: err.message };
    }
  };
  for (const [name, declaredCols] of atlases) {
    const url = urlMap[`atlas:${name}`] || urlMap[name];
    if (!url) {
      problems.push(`图集 ${name}：assetUrlMap 未登记（会静默回退成立绘/矢量木偶）`);
      continue;
    }
    const r = await probe(url);
    if (!r.ok) {
      problems.push(`图集 ${name}：${r.why} ← ${url}`);
      continue;
    }
    if (r.size) {
      const realCols = Math.round((r.size.width / r.size.height) * (416 / 384));
      if (realCols !== declaredCols) {
        problems.push(`图集 ${name}：引擎按 ${declaredCols} 列取帧，实际 ${r.size.width}×${r.size.height} = ${realCols} 列（会被横向拉伸/切半）`);
      }
    }
    preloadUrls.add(url);
  }
  for (const key of sprites) {
    const url = urlMap[key];
    if (!url) continue; // 没有位图的 pose 走矢量木偶是设计内行为
    const r = await probe(url);
    if (!r.ok) {
      problems.push(`立绘 ${key}：${r.why} ← ${url}`);
      continue;
    }
    preloadUrls.add(url);
  }
  if (problems.length) {
    const report = `Remotion 素材预检失败（${problems.length} 项）：\n  - ${problems.join('\n  - ')}`;
    if (!allowMissing) throw new Error(`${report}\n（确需带缺陷出片请显式加 --allow-missing-assets）`);
    console.warn(`[Remotion][WARN] ${report}`);
  }
  return { preloadUrls: [...preloadUrls], problems, atlases: [...atlases.keys()], sprites: [...sprites] };
}

export async function main(argv = process.argv.slice(2)) {
  if (argv.includes('--bundle-check')) {
    const { bundle } = await import('@remotion/bundler');
    const bundleLocation = await bundle({ entryPoint: path.join(HERE, 'entry.jsx') });
    console.log('REMOTION_BUNDLE_OK', bundleLocation);
    return { bundleLocation };
  }

  const props = await buildRemotionInputPropsFromCli(argv);
  if (argv.includes('--no-subtitles')) {
    props.hideSubtitles = true;
  }
  const activity = auditRemotionPropsActivity(props);

  if (argv.includes('--dry-run')) {
    const summary = {
      mode: props.mode,
      title: props.title,
      shots: props.shots.length,
      sets: [...new Set(props.shots.map((s) => s.setSpec?.id || s.set))],
      duration: props.duration,
      durationInFrames: props.durationInFrames,
      activityPassed: activity.passed,
      staticStretches: activity.staticStretches,
    };
    console.log(JSON.stringify(summary, null, 2));
    if (!activity.passed) {
      throw new Error(`检测到静态幻灯片区间: ${JSON.stringify(activity.staticStretches)}`);
    }
    return summary;
  }

  const outPath = argOf(argv, '--out');
  const stillFramesArg = argOf(argv, '--still-frames');
  const outDirArg = argOf(argv, '--out-dir');
  if (!outPath && !(stillFramesArg && outDirArg)) {
    throw new Error('正式渲染请指定 --out <output.mp4|png>（或 --still-frames f1,f2 --out-dir <dir>）');
  }

  const { bundle } = await import('@remotion/bundler');
  const { renderMedia, renderStill, selectComposition } = await import('@remotion/renderer');
  const browserExecutable = await prepareHeadlessChromium();
  const chromiumOptions = { gl: 'angle', disableWebSecurity: true };

  // 返回值必须留着：name -> 实际文件（预烘成品优先，其次才是 /tmp 缓存）
  const walkRigFiles = await ensureWalkRigAtlases(DEFAULT_WALK_CACHE_DIR);

  const fontInfo = resolveFontFile(argv);
  if (!fontInfo && !argv.includes('--allow-missing-font')) {
    throw new Error([
      '找不到中文字体，拒绝开渲（无头 Chromium 环境里通常没有任何 CJK 字体，歌词/字幕/道具文字会全部变成 □□□）。',
      `  已查找：${FONT_PRIMARY_CANDIDATES.join('、')}（均在 .gitignore 中）、${FONT_IN_REPO_FALLBACK}`,
      '  解决：--font <NotoSansSC-Bold.ttf> 或环境变量 NEWDAY_FONT；或把字体放到 video-fx/assets/fonts/。',
      '  只渲染无文字底板时可加 --allow-missing-font。',
    ].join('\n'));
  }
  if (fontInfo?.kind === 'fallback') {
    console.warn(`[Remotion][WARN] 未找到 NotoSansSC-Bold.ttf，改用仓库内兜底字体 ${FONT_IN_REPO_FALLBACK}：字形与定稿不同，仅供预览，正式出片请提供 --font。`);
  }
  const extraFiles = fontInfo ? { [fontRouteOf(fontInfo.file)]: fontInfo.file } : {};

  const { server, baseUrl } = await startLocalAssetServer(REPO_ROOT, DEFAULT_WALK_CACHE_DIR, { walkRigFiles, extraFiles });
  try {
    const liveProps = await buildRemotionInputPropsFromCli(argv, baseUrl, { walkRigFiles, fontFile: fontInfo?.file || null });
    if (argv.includes('--no-subtitles')) {
      liveProps.hideSubtitles = true;
    }

    const preflight = await preflightRemotionAssets(liveProps, { allowMissing: argv.includes('--allow-missing-assets') });
    liveProps.preloadUrls = preflight.preloadUrls;
    console.log(`[Remotion] 素材预检通过：图集 ${preflight.atlases.length} 张，预载 ${preflight.preloadUrls.length} 个文件，字体 ${fontInfo ? path.basename(fontInfo.file) : '（无）'}`);

    if (liveProps.audioUrl) {
      const audioOk = await fetch(liveProps.audioUrl).then((r) => { r.body?.cancel?.(); return r.ok; }, () => false);
      if (!audioOk) {
        const isStill = Boolean(stillFramesArg && outDirArg) || argOf(argv, '--still-frame') != null || argOf(argv, '--frame') != null;
        if (!isStill && !argv.includes('--allow-missing-audio')) {
          throw new Error(`音频文件取不到：${liveProps.audioUrl}\n  请把音频放到分镜声明的位置，或用 --audio/--mux-audio 指定；确需静音出片加 --allow-missing-audio。`);
        }
        delete liveProps.audioUrl;
      }
    }
    const serveUrl = await bundle({ entryPoint: path.join(HERE, 'entry.jsx') });
    const composition = await selectComposition({
      serveUrl,
      id: 'UniversalStage',
      inputProps: liveProps,
      browserExecutable,
      chromiumOptions,
    });

    if (stillFramesArg && outDirArg) {
      const targetDir = path.resolve(outDirArg);
      fs.mkdirSync(targetDir, { recursive: true });
      const frames = stillFramesArg.split(',').map((s) => Number(s.trim())).filter(Number.isFinite);
      for (const frame of frames) {
        const dest = path.join(targetDir, `frame_${String(frame).padStart(4, '0')}.png`);
        await renderStill({
          composition,
          serveUrl,
          output: dest,
          frame,
          imageFormat: 'png',
          inputProps: liveProps,
          browserExecutable,
          chromiumOptions,
        });
      }
      console.log('REMOTION_STILLS_OK', targetDir, frames.length);
      return { outDir: targetDir, frames };
    }

    fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
    const stillFrame = argOf(argv, '--still-frame') ?? argOf(argv, '--frame');
    if (stillFrame != null) {
      await renderStill({
        composition,
        serveUrl,
        output: path.resolve(outPath),
        frame: Number(stillFrame),
        imageFormat: 'png',
        inputProps: liveProps,
        browserExecutable,
        chromiumOptions,
      });
      console.log('REMOTION_STILL_OK', outPath);
      return { outPath, frame: Number(stillFrame) };
    }

    const muxAudio = argOf(argv, '--mux-audio');
    const resolvedOut = path.resolve(outPath);
    const videoOnlyOut = muxAudio
      ? path.join(os.tmpdir(), `remotion_video_${process.pid}_${Date.now()}.mp4`)
      : resolvedOut;

    await renderMedia({
      composition,
      serveUrl,
      codec: 'h264',
      crf: Number(argOf(argv, '--crf') || 22),
      pixelFormat: 'yuv420p',
      outputLocation: videoOnlyOut,
      inputProps: liveProps,
      browserExecutable,
      concurrency: Math.max(1, Math.min(os.cpus().length, Number(argOf(argv, '--concurrency') || 2))),
      chromiumOptions,
      onProgress: ({ progress: ratio }) => {
        const pct = Math.round(ratio * 100);
        if (pct % 10 === 0) process.stdout.write(`\r[Remotion] ${pct}% `);
      },
    });
    process.stdout.write('\n');

    if (muxAudio) {
      const ffmpegBin = resolveBundledFfmpeg();
      const absAudio = path.resolve(REPO_ROOT, muxAudio);
      execFileSync(
        ffmpegBin,
        [
          '-y',
          '-i', videoOnlyOut,
          '-i', absAudio,
          '-map', '0:v:0',
          '-map', '1:a:0',
          '-c:v', 'copy',
          '-c:a', 'copy',
          '-movflags', '+faststart',
          resolvedOut,
        ],
        { stdio: 'inherit' }
      );
      fs.rmSync(videoOnlyOut, { force: true });
    }

    console.log('REMOTION_RENDER_OK', resolvedOut);
    return { outPath: resolvedOut, frames: composition.durationInFrames };
  } finally {
    server.close();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
