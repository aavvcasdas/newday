#!/usr/bin/env node
// render_cli.mjs — 通用数据驱动 Remotion 渲染与校验 CLI（同时支持 Day 系列单集与音乐 MV）
// 用法：
//   Day 系列：node tools/remotion-engine/render_cli.mjs --mode episode --spec <episode.spec.mjs> --alignment <json> --subtitle-file <json> [--voice <wav>] [--dry-run|--bundle-check|--out <mp4>]
//   音乐 MV ：node tools/remotion-engine/render_cli.mjs --mode mv --spec <mv.spec.mjs> [--lyrics <json>] [--audio <mp3/wav>] [--dry-run|--bundle-check|--out <mp4>]

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { adaptEpisodeToRemotionProps } from '../engine/remotion_episode_adapter.mjs';
import { adaptMvToRemotionProps } from './mv_adapter.mjs';
import { evaluateRemotionFrameState } from './frame_evaluator.mjs';
import { auditTimelineActivity, semanticStateAt } from '../engine/timeline_core.mjs';
import { POSES } from '../day3制作/whale_girl_src/whale_poses.mjs';
import { IMAGE_ACTORS } from '../engine/performance_v2.mjs';

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

function startLocalAssetServer(rootDir) {
  const mimeMap = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.m4a': 'audio/mp4',
  };
  const server = http.createServer((req, res) => {
    const cleanUrl = decodeURIComponent((req.url || '/').split('?')[0]);
    const filePath = path.resolve(rootDir, '.' + cleanUrl);
    if (!filePath.startsWith(rootDir) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      res.writeHead(404);
      res.end('Not found');
      return;
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
    const primaryRel = `tools/day3制作/whale_girl_src/${info.file}`;
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
  return map;
}

export async function buildRemotionInputPropsFromCli(argv = process.argv.slice(2), baseUrl = '') {
  const mode = argOf(argv, '--mode') || 'mv';
  const specPath = argOf(argv, '--spec');
  if (!specPath) throw new Error('缺少 --spec <spec.mjs>');
  const spec = await loadModuleSpec(specPath);
  const assetUrlMap = baseUrl ? buildAssetUrlMap(baseUrl) : {};

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
    if (voicePath && baseUrl) {
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
  if (props.audioSrc && baseUrl) {
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
          st.setState.reactive.deskShake,
        ],
        actors: st.actors.map((a) => [a.x, a.y, a.lean, a.sx, a.sy, a.lift, a.anim?.bones?.tail?.rot || 0, a.anim?.bones?.armR?.rot || 0]),
        boundProps: st.worldState.boundProps.map((p) => [p.x, p.y, p.rotation]),
        semanticProps,
      };
    },
    { duration: props.duration, fps: 10, windowSec: 0.5, minActiveDelta: 0.02, maxStaticSpanSec: 1.0 }
  );

  // 显式声明 idleException 的无人桌面特写镜头（actors.length === 0）按剧本节奏允许纸面停留阅读
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
  if (!outPath) {
    throw new Error('正式渲染请指定 --out <output.mp4|png>，或使用 --dry-run / --bundle-check 仅验证底层');
  }

  const { bundle } = await import('@remotion/bundler');
  const { renderMedia, renderStill, selectComposition } = await import('@remotion/renderer');
  const chromiumMod = await import('@sparticuz/chromium');
  const chromium = chromiumMod.default || chromiumMod;
  const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE || (await chromium.executablePath());

  const { server, baseUrl } = await startLocalAssetServer(REPO_ROOT);
  try {
    const liveProps = await buildRemotionInputPropsFromCli(argv, baseUrl);
    const serveUrl = await bundle({ entryPoint: path.join(HERE, 'entry.jsx') });
    const composition = await selectComposition({
      serveUrl,
      id: 'UniversalStage',
      inputProps: liveProps,
      browserExecutable,
      chromiumOptions: { disableWebSecurity: true },
    });

    fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
    const stillFrame = argOf(argv, '--still-frame');
    if (stillFrame != null) {
      await renderStill({
        composition,
        serveUrl,
        output: path.resolve(outPath),
        frame: Number(stillFrame),
        inputProps: liveProps,
        browserExecutable,
        chromiumOptions: { disableWebSecurity: true },
      });
    } else {
      await renderMedia({
        composition,
        serveUrl,
        codec: 'h264',
        outputLocation: path.resolve(outPath),
        inputProps: liveProps,
        browserExecutable,
        concurrency: 4,
        chromiumOptions: { disableWebSecurity: true },
      });
    }
    console.log('REMOTION_RENDER_OK', outPath);
    return { outPath, frames: composition.durationInFrames };
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
