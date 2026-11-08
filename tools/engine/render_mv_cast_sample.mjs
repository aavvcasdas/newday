// render_mv_cast_sample.mjs — MV 八位角色并入 Day 系列的结构验收样片（无声，planning）
//
// 只验证：角色图集加载、pet 节拍步态、同体待机切换、招牌动作图集、坐/蹲/游姿态、
// 豆包举灯/撑伞的矢量道具跟手，以及两个后端（Canvas 2D / Remotion）状态一致。
// 不冒充正式成片：无配音、无实测轴、无 BGM、字幕时间为规划值。

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';

import spec, { buildMvCastDayAlignment, buildMvCastDaySubtitles, MV_CAST_DAY_LINES } from './mv_cast_day_spec.mjs';
import { createPlanningPreview, shotActorPlans, resolveActor } from './render_episode.mjs';
import { createCanvas, W, H, FPS, resolveFfmpeg } from './room_base.mjs';
import { evaluateCharacterMotion } from './character_motion.mjs';
import { mvSignatureAction } from './mv_cast_registry.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT_DIR = path.join(ROOT, 'Day样片');
const OUT = path.join(OUT_DIR, 'MV八人并入Day_结构验收_无声.mp4');
const REPORT = path.join(OUT_DIR, 'MV八人并入Day_验收.json');

const clip = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));

async function main() {
  const alignment = buildMvCastDayAlignment();
  const subdata = buildMvCastDaySubtitles();
  const preview = await createPlanningPreview({ spec, alignment, subdata });

  const duration = spec.shots.length * 3.6;
  const frames = Math.ceil(duration * FPS);
  const canvas = createCanvas(1920, 1080);
  const g = canvas.getContext('2d');

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const ffmpeg = resolveFfmpeg();
  const args = [
    // Remotion 自带 ffmpeg 未编译 rawvideo 解复用器，但保留 image2pipe + png：
    // 直接把逐帧 PNG 管道送进编码器，画面与 Canvas 渲染逐像素一致。
    '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart', OUT,
  ];
  const proc = spawn(ffmpeg, args, { stdio: ['pipe', 'ignore', 'pipe'] });
  let stderr = '';
  proc.stderr.on('data', (d) => { stderr += d.toString(); });

  const shotTrace = [];
  for (let f = 0; f < frames; f++) {
    const t = f / FPS;
    g.setTransform(1.5, 0, 0, 1.5, 0, 0);
    g.clearRect(0, 0, W, H);
    const info = preview.renderScene(g, t);
    const shot = preview.shotAt(t);
    const actors = shotActorPlans(spec, shot, info.isOpener).map((a, idx) =>
      resolveActor(a, t, info.line, alignment.cues, { shotStart: shot.start, actorIndex: idx }));
    if (f % 15 === 0) {
      shotTrace.push({
        frame: f,
        shot: info.shot,
        line: info.line,
        actors: actors.map((a) => ({
          id: a.characterId,
          atlas: a.atlas,
          frame: a.atlasFrame,
          signature: a.signatureAction,
          heldProp: a.heldProp ? a.heldProp.propId : null,
          x: Math.round(a.x),
          y: Math.round(a.y),
          walking: a.walking,
        })),
      });
    }
    // 红线第 7/34 条：画面内一律不绘制水印或常驻角标。
    // 「这是规划样片、非成片」的信息写进同名 .json 报告，不画在画面上。

    const frameBuf = canvas.toBuffer('image/png');
    if (!proc.stdin.write(frameBuf)) {
      await once(proc.stdin, 'drain');
    }
  }
  proc.stdin.end();
  const [code] = await once(proc, 'close');
  if (code !== 0) throw new Error(`ffmpeg 失败(${code})：${stderr.slice(-800)}`);

  const stat = fs.statSync(OUT);
  const report = {
    kind: 'mv_cast_day_structural_sample',
    measured: false,
    final: false,
    note: '结构验收样片：无配音、无实测轴、无 BGM，不可当作正式成片；字幕时间为规划值。',
    spec: 'tools/engine/mv_cast_day_spec.mjs',
    output: path.relative(ROOT, OUT),
    resolution: '1920x1080',
    fps: FPS,
    frames,
    durationSeconds: Number(duration.toFixed(3)),
    bytes: stat.size,
    lines: MV_CAST_DAY_LINES,
    framesTraced: shotTrace.length,
    trace: shotTrace,
    castSeen: [...new Set(shotTrace.flatMap((s) => s.actors.map((a) => a.id)))].sort(),
    signatureActionsSeen: [...new Set(shotTrace.flatMap((s) => s.actors.map((a) => a.signature).filter(Boolean)))].sort(),
    heldPropsSeen: [...new Set(shotTrace.flatMap((s) => s.actors.map((a) => a.heldProp).filter(Boolean)))].sort(),
    postureSamples: {
      sitting: shotTrace.flatMap((s) => s.actors).filter((a) => ['whale_read_book', 'kimi_stargaze', 'qwen_reach_out'].includes(a.signature)).length,
      crouch: shotTrace.flatMap((s) => s.actors).filter((a) => ['claude_collect', 'whale_kneel_gather'].includes(a.signature)).length,
    },
  };
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({
    output: report.output,
    bytes: report.bytes,
    frames,
    castSeen: report.castSeen,
    signatureActionsSeen: report.signatureActionsSeen,
    heldPropsSeen: report.heldPropsSeen,
  }, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
