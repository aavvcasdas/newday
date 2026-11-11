#!/usr/bin/env node
// render_cli.mjs — Day 系列数据驱动 Remotion 渲染与校验 CLI
// 用法：
//   Day 系列：node tools/remotion-engine/render_cli.mjs --mode episode --spec <episode.spec.mjs> --alignment <json> --subtitle-file <json> [--voice <wav>] [--dry-run|--bundle-check|--out <mp4>]
//   音乐 MV：使用 tools/mv-framework/render.mjs。

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { adaptEpisodeToRemotionProps } from '../engine/remotion_episode_adapter.mjs';
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

function startLocalAssetServer(rootDir, walkRigDir = DEFAULT_WALK_CACHE_DIR) {
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
    if (cleanUrl.startsWith('/__walk_rigs__/')) {
      const relRig = cleanUrl.slice('/__walk_rigs__/'.length);
      filePath = path.resolve(walkRigDir, relRig);
      if (!filePath.startsWith(path.resolve(walkRigDir)) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
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

function buildAssetUrlMap(baseUrl) {
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
    const url = `${baseUrl}/__walk_rigs__/${encodeURIComponent(rigName)}.png`;
    map[`atlas:${rigName}`] = url;
    map[rigName] = url;
  }

  return map;
}

function resolveFontUrl(baseUrl) {
  if (!baseUrl) return null;
  const candidates = [
    'video-fx/assets/fonts/NotoSansSC-Bold.ttf',
    'tools/mv_extra/cache/NotoSansSC-Bold.ttf',
  ];
  for (const rel of candidates) {
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

export async function buildRemotionInputPropsFromCli(argv = process.argv.slice(2), baseUrl = '') {
  const mode = argOf(argv, '--mode') || 'episode';
  if (mode !== 'episode') throw new Error('旧 MV 渲染入口已退役，请使用 tools/mv-framework/render.mjs');
  const specPath = argOf(argv, '--spec');
  if (!specPath) throw new Error('缺少 --spec <spec.mjs>');
  const spec = await loadModuleSpec(specPath);
  const assetUrlMap = baseUrl ? buildAssetUrlMap(baseUrl) : {};
  const fontUrl = resolveFontUrl(baseUrl);
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

  throw new Error(`不支持的模式: ${mode}`);
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

  await ensureWalkRigAtlases(DEFAULT_WALK_CACHE_DIR);
  const { server, baseUrl } = await startLocalAssetServer(REPO_ROOT, DEFAULT_WALK_CACHE_DIR);
  try {
    const liveProps = await buildRemotionInputPropsFromCli(argv, baseUrl);
    if (argv.includes('--no-subtitles')) {
      liveProps.hideSubtitles = true;
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
