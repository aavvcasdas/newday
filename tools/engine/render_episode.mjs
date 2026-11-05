// render_episode.mjs — 通用单集生产渲染器（1920x1080@30，逻辑 1280x720）
// CLI 与 tools/gate.py 对接：
//   node tools/engine/render_episode.mjs --spec <episode.spec.mjs> \
//     --voice <wav> --alignment <json> --subtitle-file <json> [--out <mp4>|--test|--stills]
// 正式渲染只接受 measured=true 且 SHA256 匹配的实测轴；TITLE_LEN=0，末句后 0.24s 结束。
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createCanvas, loadImage, resolveFfmpeg, W, H, FPS, mix, smooth, seg, drawText, drawForegroundTable } from './room_base.mjs';
import { validateSpec, resolveWordTime } from './schema_validator.mjs';
import { drawRolePlates, drawStamp, OPENER_END, PLATES_DEFAULT_AT } from './opener_director.mjs';
import { drawShotInteractions, BODY_VERBS } from './interaction_stage.mjs';
import { composeScene, drawComplianceCorner, drawHudBanner } from './scene_compositor.mjs';
import { getProp, assertForegroundWithinStage } from './prop_registry.mjs';
import { loadContactActors, actorAnchors, drawContactActor } from '../互动元素/actor_contacts.mjs';
import { CORE } from '../互动元素/cue_props_engine.mjs';
import { cameraFor } from './camera_plan.mjs';
import { drawSemanticTracks } from './semantic_tracks.mjs';
export { ambientCamera, cameraFor, CAMERA_PRESETS } from './camera_plan.mjs';
import { createDay2Subtitle } from '../字幕/day2_style_sub.mjs';

const { reseedBoil } = CORE;
const S = 1.5; // 1280x720 逻辑 -> 1920x1080 输出
export const TITLE_LEN = 0;

function argOf(argv, k) { const i = argv.indexOf(k); return i >= 0 && i + 1 < argv.length ? argv[i + 1] : null; }
export function gaitAnim(t, start, dur) {
  if (t < start || t > start + dur) return {};
  const phase = (t - start) * Math.PI * 2 * 1.25;
  const envelope = smooth((t - start) / 0.12) * smooth((start + dur - t) / 0.12);
  const a = Math.sin(phase) * envelope;
  return { bones: { legL: { rot: a * 0.055, dy: -Math.max(0, a) * 10 }, legR: { rot: -a * 0.055, dy: -Math.max(0, -a) * 10 } } };
}

/** 待机不再每0.2秒切换全身骨骼；保留函数供旧调用者使用。显式动画由 plan.anim 提供。 */
export function lifeAnim(_t, _seed = 0) { return { bones: {} }; }

/** 仅连续轻呼吸；amount=0 时脚位、倾斜与缩放完全固定。 */
export function livingBody(t, seed = 0, amount = 1) {
  if (amount === 0) return { dx: 0, dy: 0, lean: 0, squash: 0 };
  const s = t + seed;
  return {
    dx: 0,
    dy: Math.sin(s * 1.6) * 1.2 * amount,
    lean: Math.sin(s * 0.9) * 0.008 * amount,
    squash: Math.sin(s * 1.6) * 0.08 * amount,
  };
}

export async function loadSpec(specPath) {
  const mod = await import(pathToFileURL(path.resolve(specPath)).href);
  const spec = mod.default || mod.SPEC || mod.spec;
  if (!spec) throw new Error('episode.spec.mjs 必须 default 导出 spec 对象');
  return spec;
}

export function validateInputs({ voice, alignment, subdata }) {
  if (alignment.measured !== true || subdata.measured !== true) throw new Error('正式渲染只接受 measured=true 的实测轴与字幕');
  const sha = createHash('sha256').update(fs.readFileSync(voice)).digest('hex');
  if (sha !== alignment.source_sha256) throw new Error('音源 SHA256 与实测轴不匹配');
  const cues = alignment.cues;
  if (!Array.isArray(cues) || !cues.length) throw new Error('实测轴 cues 为空');
  if (subdata.screens.map((s) => s.text).join('') !== cues.map((c) => c.text).join('')) throw new Error('字幕与实测轴台词逐字不一致');
  return { sha, cues };
}

export function buildShots(spec, cues) {
  return spec.shots.map((s) => ({ ...s, start: cues[s.fromLine - 1].start, end: cues[s.toLine - 1].end }));
}

export function buildEvents(spec, shots, cues, { sourceSha256 = null } = {}) {
  const events = [];
  for (const shot of shots) {
    for (const it of shot.interactions || []) {
      const line = it.wordLine ?? it.line ?? shot.fromLine;
      const { time, measured } = resolveWordTime(cues, line, it.wordChar || cues[line - 1].text[0]);
      const startLine = it.startLine ?? line;
      const contactFrame = Math.round(time * FPS);
      let startFrame = Math.round(cues[Math.max(0, startLine - 1)].start * FPS);
      let endFrame = Math.round(shot.end * FPS) - 1;
      if (startFrame > contactFrame) startFrame = Math.max(0, contactFrame - 6);
      if (endFrame <= contactFrame) endFrame = contactFrame + 8;
      events.push({
        ...it, shotId: shot.id, measured, audio_sha256: sourceSha256,
        word_id: `L${String(line).padStart(2, '0')}:${it.wordChar || ''}`,
        startFrame, contactFrame, endFrame,
        params: {
          scale: it.scale ?? 1, land: it.land, at: it.at, text: it.text,
          slot: it.slot, span: it.span, toActor: it.toActor, title: it.title, sub: it.sub,
        },
      });
    }
  }
  return events;
}

export function resolveActor(plan, t, line, cues = []) {
  let pose = plan.pose || 'idle';
  for (const p of plan.poses || []) {
    if ((p.line != null && line >= p.line) || (p.at != null && t >= p.at)) pose = p.pose;
  }
  for (const p of plan.poseChanges || []) if (t >= p.at) pose = p.pose;
  let x = plan.x;
  const seed = (plan.x || 0) / 380;
  // 不注入全身待机骨骼，也不覆盖作者显式指定的动画。
  let anim = structuredClone(plan.anim || { bones: {} });
  anim.bones ||= {};
  if (plan.walk) {
    const start = plan.walk.start != null
      ? plan.walk.start
      : (plan.walk.startLine ? (cues[plan.walk.startLine - 1]?.start ?? 0) : 0);
    const duration = plan.walk.duration ?? 1;
    const p = smooth((t - start) / duration);
    x = mix(plan.walk.from, plan.walk.to, p);
    if (t >= start && t <= start + duration) {
      anim = { ...anim, bones: { ...anim.bones, ...gaitAnim(t, start, duration).bones } };
    }
  }
  const body = livingBody(t, seed, plan.idleMotion ?? 1);
  return {
    pose, name: plan.name, x: x + body.dx, y: (plan.y ?? 600) + body.dy, u: plan.u ?? 38,
    flip: !!plan.flip, lean: (plan.lean ?? 0) + body.lean, squash: body.squash, anim,
  };
}

function holdFrame(frame, events, shotId) {
  for (const ev of events) {
    if (ev.shotId !== shotId) continue;
    if (frame >= ev.contactFrame && frame < ev.contactFrame + 2) return ev.contactFrame;
  }
  return frame;
}

export async function createEpisodeRenderer({ spec, alignment, subdata }) {
  if (spec.status === 'planning') throw new Error('导演分镜仍是 planning：先完成资产/动作可行性审核，再绑定指定音源；不能把规划当成成片');
  if (spec.directorVersion === 1 && (spec.status !== 'ready' || spec.measured !== true)) throw new Error('导演spec未完成ready审核和实测绑定');
  return createSceneRenderer({ spec, alignment, subdata }, false);
}

/** 独立的无声规划入口：不修改planning，不伪造实测轴，也不通过正式CLI导出。 */
export async function createPlanningPreview({ spec, alignment, subdata }) {
  if (spec.directorVersion !== 1 || spec.status !== 'planning' || spec.measured !== false) throw new Error('规划样片只接受planning/measured=false导演spec');
  if (alignment.measured !== false || subdata.measured !== false || alignment.source_sha256 || alignment.cues.some((c) => c.chars_timed?.length)) throw new Error('无声样片不得混入实测声明/音源/伪词轴');
  return createSceneRenderer({ spec, alignment, subdata }, true);
}

export function shotActorPlans(spec, shot, isOpener) {
  // 导演镜头必须执行本镜显式走位；旧opener演员不能覆盖C01前3.2秒。
  return isOpener && spec.directorVersion !== 1
    ? [spec.opener.actorA, spec.opener.actorB]
    : (shot.actors || shot.actorsPlan || [spec.opener.actorA, spec.opener.actorB]);
}

export function propStateAt(ref, t, cues) {
  let state = { ...(ref.state || {}) };
  for (const change of ref.stateChanges || []) {
    const at = change.line != null ? cues[change.line - 1].start + (change.delay || 0) : change.at;
    if (t >= at) state = { ...state, ...change.state };
  }
  return state;
}

async function createSceneRenderer({ spec, alignment, subdata }, planningPreview) {
  validateSpec(spec, { cueCount: alignment.cues.length, cues: alignment.cues, requireWordTimes: !planningPreview });
  const cues = alignment.cues;
  const shots = buildShots(spec, cues);
  const events = buildEvents(spec, shots, cues, { sourceSha256: alignment.source_sha256 });
  const duration = spec.preserveSourceDuration ? alignment.source_duration_seconds : cues[cues.length - 1].end + 0.24;
  const frames = Math.ceil(duration * FPS);
  const actorPlans = [spec.opener.actorA, spec.opener.actorB, ...spec.shots.flatMap((s) => s.actors || s.actorsPlan || [])];
  const poses = [...new Set(actorPlans.flatMap((a) => [a.pose || 'idle', ...(a.poses || []).map((p) => p.pose), ...(a.poseChanges || []).map((p) => p.pose)]))];
  await loadContactActors({ createCanvas, loadImage, poses });
  const sub = createDay2Subtitle({ fontOf: (n, w) => `${w} ${n}px NotoSansSC`, measureCtx: createCanvas(1, 1).getContext('2d') });
  const stamp = spec.opener.stampWord
    ? { time: resolveWordTime(cues, spec.opener.stampWord.line, spec.opener.stampWord.char).time, text: spec.opener.stampText, at: spec.opener.stampAt || [640, 520] }
    : null;

  const lineAt = (t) => { let n = 1; cues.forEach((c, i) => { if (t >= c.start) n = i + 1; }); return n; };
  const shotAt = (t) => shots.find((s, i) => t >= s.start && t < (shots[i + 1]?.start ?? duration + 0.01)) || shots[0];

  function actorsFor(shot, t, line) {
    const inOpener = shot === shots[0] && t < Math.min(shot.end, OPENER_END);
    const plans = shotActorPlans(spec, shot, inOpener);
    return plans.map((p) => resolveActor(p, t, line, cues));
  }

  function drawProp(ctx, ref, t, pop = 1) {
    const prop = getProp(ref.propId);
    assertForegroundWithinStage(ref.propId, ref.y, ref.scale ?? 1);
    ctx.save();
    ctx.translate(ref.x, ref.y);
    ctx.scale((ref.scale ?? 1) * pop, (ref.scale ?? 1) * pop);
    prop.draw(ctx, t, propStateAt(ref, t, cues));
    ctx.restore();
  }

  /** 只画相机空间 L0-L3（供横屏母版与竖屏重排共用同一场景状态）。 */
  function renderScene(ctx, rawTime, { zoomMul = 1 } = {}) {
    const rawFrame = Math.round(rawTime * FPS);
    const shot = shotAt(rawTime);
    const frame = holdFrame(rawFrame, events, shot.id);
    const t = frame / FPS;
    const line = lineAt(rawTime);
    const actors = actorsFor(shot, t, line);
    const anchors = actors.map((a) => { try { return actorAnchors(a); } catch { return null; } });
    const isOpener = shot === shots[0] && rawTime < Math.min(shot.end, OPENER_END);
    const cam = cameraFor(shot, rawTime, cues);
    const camZ = { ...cam, z: cam.z * zoomMul };
    const driven = new Set(events.filter((e) => e.shotId === shot.id && BODY_VERBS.has(e.verb)).map((e) => e.propId));
    reseedBoil(0);
    composeScene(ctx, {
      t, cam: camZ, mood: shot.mood || 'work_cool', spotlights: spec.lighting?.spotlights === true, focusX: actors[0]?.x ?? 640,
      layers: {
        back: (g) => {
          for (const ref of (shot.companionProps || []).filter((p) => p.behind)) {
            if (driven.has(ref.propId)) continue;
            const from = Number.isFinite(ref.enterAt) ? ref.enterAt : (ref.fromLine ? cues[ref.fromLine - 1].start : shot.start);
            if (rawTime < from) continue;
            drawProp(g, ref, t, ref.carry ? 1 : 0.85 + 0.15 * smooth((rawTime - from) / 0.25));
          }
        },
        actors: (g) => { for (const a of actors) drawContactActor(g, a); },
        foreground: (g) => {
          if (shot.foregroundTable) {
            const { x, y, width } = shot.foregroundTable;
            drawForegroundTable(g, x, y, width);
          }
          drawSemanticTracks(g, rawTime, shot.semanticTracks);
          for (const a of actors) if (a.name) drawText(g, a.name, a.x, a.y - 10.4 * a.u - 18, 17, '#E5E8DD');
          // 头顶身份铭牌（场景空间，位于头顶上方，不贴角色本体）
          if (isOpener && spec.opener.rolePlates) {
            const plates = spec.opener.rolePlates.map((text, i) => {
              const an = anchors[i];
              return an?.headTop ? { text, x: an.headTop[0], y: an.headTop[1], dir: i === 0 ? -1 : 1 } : null;
            }).filter(Boolean);
            drawRolePlates(g, plates, rawTime, spec.opener.platesAt ?? PLATES_DEFAULT_AT);
          }
          if (isOpener) {
            (spec.opener.foregroundProps || []).forEach((ref, i) => {
              const at = ref.enterAt ?? (i === 0 ? 0 : 0.9 + i * 0.45);
              if (rawTime < at) return;
              drawProp(g, ref, t, 0.85 + 0.15 * smooth((rawTime - at) / 0.25));
            });
          }
          for (const ref of (shot.companionProps || []).filter((p) => !p.behind)) {
            if (driven.has(ref.propId)) continue;
            const from = Number.isFinite(ref.enterAt) ? ref.enterAt : (ref.fromLine ? cues[ref.fromLine - 1].start : shot.start);
            if (rawTime < from) continue;
            const pop = ref.carry ? 1 : 0.85 + 0.15 * smooth((rawTime - from) / 0.25);
            drawProp(g, ref, t, pop);
          }
          drawShotInteractions(g, { frame, t, shot, events, actors, anchors });
          if (isOpener && stamp) drawStamp(g, rawTime, stamp.time, stamp.text, stamp.at[0], stamp.at[1]);
        },
      },
    });
    return { shot: shot.id, line, camera: camZ, isOpener };
  }

  /** L4 固定屏幕 HUD：横幅 + 角标 + Day2 字幕。ctx 须处于逻辑坐标变换下。 */
  function renderHud(ctx, rawTime) {
    if (rawTime < OPENER_END) drawHudBanner(ctx, rawTime, spec.opener);
    drawComplianceCorner(ctx);
    if (planningPreview) {
      ctx.save(); ctx.fillStyle = 'rgba(9,22,54,0.9)'; ctx.fillRect(12, 10, 300, 49); ctx.restore();
      drawText(ctx, '无声动作样片 · 四段节选', 162, 26, 16, '#FFE8A3');
      drawText(ctx, '规划节奏 · 非实测配音 · 非连续剧情', 162, 46, 12, '#CAD9DF');
    }
    const s = subdata.screens.find((x) => rawTime >= x.start && rawTime < x.end);
    if (s) sub.draw(ctx, { lines: sub.wrap(s.text), speaker: spec.speaker || '本鲸', vis: 1, W, H });
  }

  function renderFrame(ctx, rawTime, opts = {}) {
    const info = renderScene(ctx, rawTime, opts);
    if (!opts.noHud) renderHud(ctx, rawTime);
    return info;
  }

  return { spec, cues, shots, events, duration, frames, stamp, sub, planningPreview, measured: !planningPreview, renderScene, renderHud, renderFrame, lineAt, shotAt };
}

export async function main(argv = process.argv.slice(2)) {
  const specPath = argOf(argv, '--spec');
  if (!specPath) throw new Error('用法：--spec <episode.spec.mjs> --voice <wav> --alignment <json> --subtitle-file <json> [--out|--test|--stills]');
  const voice = argOf(argv, '--voice');
  const alignmentPath = argOf(argv, '--alignment');
  const subsPath = argOf(argv, '--subtitle-file');
  if (!voice || !alignmentPath || !subsPath) throw new Error('缺少 --voice/--alignment/--subtitle-file');
  const spec = await loadSpec(specPath);
  const alignment = JSON.parse(fs.readFileSync(alignmentPath, 'utf8'));
  const subdata = JSON.parse(fs.readFileSync(subsPath, 'utf8'));
  validateInputs({ voice, alignment, subdata });
  const r = await createEpisodeRenderer({ spec, alignment, subdata });
  const specDir = path.dirname(path.resolve(specPath));

  if (argv.includes('--test') || argv.includes('--stills')) {
    const canvas = createCanvas(W * S, H * S);
    const g = canvas.getContext('2d');
    const times = [0, 0.35, 0.72, 1.0, 1.6, 2.2, ...r.shots.map((s) => (s.start + s.end) / 2), ...(r.stamp ? [r.stamp.time] : [])]
      .filter((x) => x < r.duration);
    const samples = [];
    const dir = path.join(specDir, 'engine_stills');
    if (argv.includes('--stills')) fs.mkdirSync(dir, { recursive: true });
    for (const t of times) {
      g.setTransform(S, 0, 0, S, 0, 0);
      g.clearRect(0, 0, W, H);
      samples.push({ time: t, ...r.renderFrame(g, t) });
      if (argv.includes('--stills')) fs.writeFileSync(path.join(dir, `t_${t.toFixed(3)}.jpg`), canvas.toBuffer('image/jpeg'));
    }
    const report = { measured: true, title_len: TITLE_LEN, frames: r.frames, duration: r.duration, samples, events: r.events.map((e) => ({ id: e.id || e.propId, verb: e.verb, word_id: e.word_id, contactFrame: e.contactFrame })) };
    fs.writeFileSync(path.join(specDir, 'engine_render_test.json'), JSON.stringify(report, null, 2) + '\n');
    console.log('PASS', samples.length, 'samples', r.frames, 'frames');
    return report;
  }

  const out = argOf(argv, '--out') || path.join(specDir, `Day${spec.day}_通用引擎干声版.mp4`);
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  const canvas = createCanvas(W * S, H * S);
  const g = canvas.getContext('2d');
  const ff = spawn(resolveFfmpeg(), ['-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W * S}x${H * S}`, '-r', String(FPS), '-i', '-', '-i', voice, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'libx264', '-crf', '19', '-preset', 'veryfast', '-tune', 'animation', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-ac', '2', '-ar', '44100', '-b:a', '160k', '-af', 'apad', '-t', String(r.frames / FPS), '-movflags', '+faststart', out], { stdio: ['pipe', 'ignore', 'pipe'] });
  let err = '';
  ff.stderr.on('data', (d) => { err += d; });
  ff.stdin.on('error', () => {});
  const done = new Promise((res, rej) => { ff.on('error', rej); ff.on('close', (c) => (c === 0 ? res() : rej(new Error(err.slice(-2000))))); });
  for (let f = 0; f < r.frames; f++) {
    g.setTransform(S, 0, 0, S, 0, 0);
    g.clearRect(0, 0, W, H);
    r.renderFrame(g, f / FPS);
    const b = canvas.data();
    if (!ff.stdin.write(Buffer.from(b.buffer, b.byteOffset, b.byteLength))) await Promise.race([new Promise((res) => ff.stdin.once('drain', res)), done]);
    if (f % 150 === 0) console.log(`${f}/${r.frames}`);
  }
  ff.stdin.end();
  await done;
  console.log('DONE', out);
  return { out, frames: r.frames, duration: r.duration };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
