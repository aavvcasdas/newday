// render_episode.mjs — 通用单集生产渲染器（1920x1080@30，逻辑 1280x720）
// 支持双后端：
//   - 默认 Canvas 高速管线（与 tools/gate.py 100% 兼容）
//   - Remotion 动态合成管线（--backend remotion 或 --export-remotion-props <file>）
// 已全面接入：动态多背景集 (stage_sets)、连续骨骼与 42 动作/15 律动 (character_motion)、
// 人物↔背景↔手部道具双向空间交互总线 (world_interactions) 与动机转场。

import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createCanvas, loadImage, resolveFfmpeg, W, H, FPS, smooth, drawText, drawForegroundTable } from './room_base.mjs';
import { validateSpec, resolveWordTime } from './schema_validator.mjs';
import { drawRolePlates, drawStamp, OPENER_END, PLATES_DEFAULT_AT } from './opener_director.mjs';
import { drawShotInteractions, BODY_VERBS } from './interaction_stage.mjs';
import { composeScene, drawComplianceCorner, drawHudBanner } from './scene_compositor.mjs';
import { getProp, assertForegroundWithinStage } from './prop_registry.mjs';
import { loadContactActors, actorAnchors, drawContactActor } from '../互动元素/actor_contacts.mjs';
import { CORE } from '../互动元素/cue_props_engine.mjs';
import { cameraFor } from './camera_plan.mjs';
import { bodyPerformance, loadImageActors, drawImageActor, drawAmbient } from './performance_v2.mjs';
import { drawSemanticTracks } from './semantic_tracks.mjs';
import { createDay2Subtitle } from '../字幕/day2_style_sub.mjs';
import { LEGACY_ACTIONS } from '../day3制作/whale_girl_src/legacy_actions.mjs';
import {
  computeLivingSkeleton,
  evaluateCharacterMotion,
  handAt,
  WALK_TO_IDLE_ATLAS_MAP,
  resolveLocomotionAtlas,
  resolveMvSignatureAction,
} from './character_motion.mjs';
import { ensureWalkRigAtlases, WALK_RIG_BUILDERS, DEFAULT_WALK_CACHE_DIR } from '../remotion-engine/walk_rig_builder.mjs';
import { resolveTransitionState } from './timeline_core.mjs';
import { resolveShotSetSpec, resolveStageSet } from '../场景/stage_sets.mjs';
import { computeWorldInteractionState, drawWorldForegroundFeedbackCanvas } from '../互动元素/world_interactions.mjs';
import { adaptEpisodeToRemotionProps } from './remotion_episode_adapter.mjs';

export { ambientCamera, cameraFor, CAMERA_PRESETS } from './camera_plan.mjs';
export { handAt } from './character_motion.mjs';

const { reseedBoil } = CORE;
const S = 1.5; // 1280x720 逻辑 -> 1920x1080 输出
export const TITLE_LEN = 0;

const LEGACY_ACTION_POSES = new Map(LEGACY_ACTIONS.map((a) => [a.id, a.poses.map((p) => p.pose)]));

function argOf(argv, k) {
  const i = argv.indexOf(k);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : null;
}

export function gaitAnim(t, start, dur) {
  if (t < start || t > start + dur) return {};
  const phase = (t - start) * Math.PI * 2 * 1.15;
  const envelope = smooth((t - start) / 0.14) * smooth((start + dur - t) / 0.14);
  const a = Math.sin(phase) * envelope;
  return {
    bones: {
      legL: { rot: a * 0.22, dy: -Math.max(0, a) * 6.5 },
      legR: { rot: -a * 0.22, dy: -Math.max(0, -a) * 6.5 },
      armL: { rot: -a * 0.16 },
      armR: { rot: a * 0.16 },
    },
  };
}

/** 连续次级骨骼呼吸与头发/鲸尾滞后跟随；amount=0 时返回空骨骼供静态定格。 */
export function lifeAnim(t, seed = 0, amount = 1) {
  const skel = computeLivingSkeleton(t, seed, amount);
  return { bones: skel.bones };
}

/** 连续身体呼吸、微倾与体积守恒挤压；amount=0 时严格归零。 */
export function livingBody(t, seed = 0, amount = 1) {
  const skel = computeLivingSkeleton(t, seed, amount);
  return {
    dx: skel.dx,
    dy: skel.dy,
    lean: skel.lean,
    squash: skel.squash,
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
  return spec.shots.map((s) => ({
    ...s,
    start: cues[s.fromLine - 1].start,
    end: s.cameraIntent ? (cues[s.toLine]?.start ?? cues[s.toLine - 1].end) : cues[s.toLine - 1].end,
  }));
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
        ...it,
        shotId: shot.id,
        measured,
        audio_sha256: sourceSha256,
        word_id: `L${String(line).padStart(2, '0')}:${it.wordChar || ''}`,
        startFrame,
        contactFrame,
        endFrame,
        params: {
          scale: it.scale ?? 1,
          land: it.land,
          at: it.at,
          text: it.text,
          slot: it.slot,
          span: it.span,
          toActor: it.toActor,
          title: it.title,
          sub: it.sub,
        },
      });
    }
  }
  return events;
}

export function resolveActor(plan, t, line, cues = [], context = {}) {
  if (plan.performanceV2) {
    const perf = bodyPerformance(plan, t);
    const motion = evaluateCharacterMotion(
      { ...plan, idleMotion: 0 },
      t,
      { line, cues, shotStart: context.shotStart ?? 0, setAnchors: context.setAnchors, events: context.events, actorIndex: context.actorIndex ?? 0 }
    );
    return {
      ...motion,
      assetId: plan.assetId,
      height: plan.height,
      opacity: perf.opacity ?? 1,
      imageScale: perf.scale ?? 1,
      pose: perf.pose || motion.pose,
      x: (motion.x - motion.dx) + perf.dx + (plan.walk ? 0 : 0),
      y: (plan.y ?? context.setAnchors?.groundY ?? 600) + perf.dy,
      u: (plan.u ?? 38) * (perf.scale ?? 1),
      lean: (plan.lean ?? 0) + perf.lean,
      squash: perf.squash ?? 0,
      sx: perf.sx ?? 1,
      sy: perf.sy ?? 1,
      lift: Math.max(motion.lift || 0, perf.lift || 0),
    };
  }
  return evaluateCharacterMotion(plan, t, {
    line,
    cues,
    shotStart: context.shotStart ?? 0,
    setAnchors: context.setAnchors,
    events: context.events,
    actorIndex: context.actorIndex ?? 0,
  });
}

function holdFrame(frame, events, shotId) {
  for (const ev of events) {
    if (ev.shotId !== shotId) continue;
    if (frame >= ev.contactFrame && frame < ev.contactFrame + 2) return ev.contactFrame;
  }
  return frame;
}

export async function createEpisodeRenderer({ spec, alignment, subdata, assetDir }) {
  if (spec.status === 'planning') throw new Error('导演分镜仍是 planning：先完成资产/动作可行性审核，再绑定指定音源；不能把规划当成成片');
  if (spec.directorVersion === 1 && (spec.status !== 'ready' || spec.measured !== true)) throw new Error('导演spec未完成ready审核和实测绑定');
  return createSceneRenderer({ spec, alignment, subdata, assetDir }, false);
}

/** 独立的无声规划入口：不修改planning，不伪造实测轴，也不通过正式CLI导出。 */
export async function createPlanningPreview({ spec, alignment, subdata, assetDir }) {
  if (spec.directorVersion !== 1 || spec.status !== 'planning' || spec.measured !== false) throw new Error('规划样片只接受planning/measured=false导演spec');
  if (alignment.measured !== false || subdata.measured !== false || alignment.source_sha256 || alignment.cues.some((c) => c.chars_timed?.length)) throw new Error('无声样片不得混入实测声明/音源/伪词轴');
  return createSceneRenderer({ spec, alignment, subdata, assetDir }, true);
}

export function shotActorPlans(spec, shot, isOpener) {
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

function collectActorPoses(actorPlans) {
  const poses = new Set();
  for (const a of actorPlans) {
    if (!a || a.assetId) continue;
    const usesAtlasOnly = Boolean(a.locomotion || a.atlas || (Array.isArray(a.atlases) && a.atlases.length));
    if (usesAtlasOnly && !a.pose && !a.poses?.length && !a.poseChanges?.length) continue;
    poses.add(a.pose || 'idle');
    for (const p of a.poses || []) if (p?.pose) poses.add(p.pose);
    for (const p of a.poseChanges || []) if (p?.pose) poses.add(p.pose);
    const actionIds = [a.action, ...(a.actions || []).map((it) => it?.action || it?.id)].filter(Boolean);
    for (const id of actionIds) {
      const mapped = id === 'walk_cycle' ? 'walk_brisk' : id === 'run_cycle' ? 'run_sprint' : id;
      for (const p of LEGACY_ACTION_POSES.get(mapped) || []) poses.add(p);
    }
  }
  return [...poses];
}

function collectActorAtlases(actorPlans) {
  const names = new Set();
  const addWithIdle = (name) => {
    if (!name) return;
    names.add(name);
    if (WALK_TO_IDLE_ATLAS_MAP[name]) names.add(WALK_TO_IDLE_ATLAS_MAP[name]);
  };
  for (const a of actorPlans) {
    if (!a) continue;
    const charId = a.characterId || a.assetId || 'whale';
    if (a.locomotion) addWithIdle(resolveLocomotionAtlas(charId, a.locomotion));
    if (a.atlas) addWithIdle(a.atlas);
    for (const item of a.atlases || []) addWithIdle(item?.atlas);
    // MV 招牌动作（`action: 'kimi_hold_lantern'`）对应的 16 帧表演图集同样要预载，
    // 否则该角色会掉回 10 骨骼接触立绘并抛 Unknown pose。
    for (const act of [a.action, ...(a.actions || []).map((it) => it?.action || it?.id)]) {
      const sig = act ? resolveMvSignatureAction(act, charId) : null;
      if (sig?.atlas) addWithIdle(sig.atlas);
    }
  }
  return [...names];
}

async function loadAtlasImages(atlasNames) {
  const map = new Map();
  if (!atlasNames.length) return map;
  const rigNames = atlasNames.filter((n) => WALK_RIG_BUILDERS[n]);
  const built = rigNames.length ? await ensureWalkRigAtlases(DEFAULT_WALK_CACHE_DIR, { only: rigNames }) : {};
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  for (const name of atlasNames) {
    const filePath = built[name] || path.join(repoRoot, 'assets/ai-girls/lyric-action-v13', `${name}.png`);
    if (fs.existsSync(filePath)) {
      map.set(name, await loadImage(path.resolve(filePath)));
    }
  }
  return map;
}

function drawAtlasActor(g, a, atlasImages) {
  if ((a.opacity ?? 1) <= 0) return;
  const img = atlasImages.get(a.atlas);
  if (!img) return;
  const cols = a.atlasCols || 16;
  const cellW = img.width / cols;
  const cellH = img.height;
  const h = a.height || (a.assetId ? 310 : Math.round(10.4 * (a.u ?? 30)));
  const w = (h * cellW) / cellH;
  const sx = (a.imageScale ?? 1) * (a.sx ?? 1);
  const sy = (a.imageScale ?? 1) * (a.sy ?? 1);
  const dir = a.flip ? -1 : 1;
  const footSink = h * 0.018;

  const drawFrame = (sheetImg, frameIdx, alpha) => {
    if (!sheetImg || alpha <= 0.005) return;
    const cw = sheetImg.width / cols;
    const ch = sheetImg.height;
    const idx = Math.max(0, Math.min(cols - 1, frameIdx | 0));
    g.save();
    g.globalAlpha = (a.opacity ?? 1) * alpha;
    g.translate(a.x, a.y + footSink);
    g.rotate(a.lean || 0);
    g.scale(dir * sx, sy);
    g.drawImage(sheetImg, idx * cw, 0, cw, ch, -w / 2, -h, w, h);
    g.restore();
  };

  if (a.prevAtlas && a.atlasBlend < 0.999 && atlasImages.has(a.prevAtlas)) {
    drawFrame(atlasImages.get(a.prevAtlas), a.prevAtlasFrame ?? 0, 1 - a.atlasBlend);
    drawFrame(img, a.atlasFrame ?? 0, a.atlasBlend);
  } else {
    drawFrame(img, a.atlasFrame ?? 0, 1);
  }
}

async function createSceneRenderer({ spec, alignment, subdata, assetDir }, planningPreview) {
  validateSpec(spec, { cueCount: alignment.cues.length, cues: alignment.cues, requireWordTimes: !planningPreview });
  const cues = alignment.cues;
  const shots = buildShots(spec, cues);
  const events = buildEvents(spec, shots, cues, { sourceSha256: alignment.source_sha256 });
  const duration = spec.preserveSourceDuration ? alignment.source_duration_seconds : cues[cues.length - 1].end + 0.24;
  const frames = Math.ceil(duration * FPS);
  const actorPlans = [spec.opener.actorA, spec.opener.actorB, ...spec.shots.flatMap((s) => s.actors || s.actorsPlan || [])];
  const poses = collectActorPoses(actorPlans);
  if (poses.length) await loadContactActors({ createCanvas, loadImage, poses, dir: assetDir });
  await loadImageActors(actorPlans.filter((a) => a?.assetId && !a.locomotion && !a.atlas && !(a.atlases?.length)));
  const atlasImages = await loadAtlasImages(collectActorAtlases(actorPlans));

  const sub = createDay2Subtitle({ fontOf: (n, w) => `${w} ${n}px NotoSansSC`, measureCtx: createCanvas(1, 1).getContext('2d') });
  const stamp = spec.opener.stampWord
    ? { time: resolveWordTime(cues, spec.opener.stampWord.line, spec.opener.stampWord.char).time, text: spec.opener.stampText, at: spec.opener.stampAt || [640, 520] }
    : null;

  const lineAt = (t) => { let n = 1; cues.forEach((c, i) => { if (t >= c.start) n = i + 1; }); return n; };
  const shotAt = (t) => shots.find((s, i) => t >= s.start && t < (shots[i + 1]?.start ?? duration + 0.01)) || shots[0];

  function drawProp(ctx, ref, t, pop = 1) {
    const prop = getProp(ref.propId);
    assertForegroundWithinStage(ref.propId, ref.y, ref.scale ?? 1);
    ctx.save();
    ctx.translate(ref.x, ref.y);
    if (ref.rotation) ctx.rotate(ref.rotation);
    ctx.scale((ref.scale ?? 1) * pop, (ref.scale ?? 1) * pop);
    prop.draw(ctx, t, propStateAt(ref, t, cues));
    ctx.restore();
  }

  function drawBoundProp(ctx, bound, t) {
    const prop = getProp(bound.propId);
    ctx.save();
    ctx.translate(bound.x, Math.min(595, bound.y));
    if (bound.rotation) ctx.rotate(bound.rotation);
    ctx.scale(bound.scale ?? 0.72, bound.scale ?? 0.72);
    prop.draw(ctx, t, bound.state || {});
    ctx.restore();
  }

  /** 只画相机空间 L0-L3（供横屏母版与竖屏重排共用同一场景状态）。 */
  function renderScene(ctx, rawTime, { zoomMul = 1 } = {}) {
    const rawFrame = Math.round(rawTime * FPS);
    const shot = shotAt(rawTime);
    const shotIndex = shots.indexOf(shot);
    const frame = holdFrame(rawFrame, events, shot.id);
    const t = frame / FPS;
    const line = lineAt(rawTime);

    const setSpec = resolveShotSetSpec(shot, shotIndex, spec);
    const previewSet = resolveStageSet(setSpec, t, { mood: shot.mood || 'work_cool' });

    const inOpener = shot === shots[0] && t < Math.min(shot.end, OPENER_END);
    const plans = shotActorPlans(spec, shot, inOpener);
    const shotEvents = events.filter((e) => e.shotId === shot.id);
    const rawActors = plans.map((p, idx) => resolveActor(p, t, line, cues, {
      shotStart: shot.start,
      setAnchors: previewSet.anchors,
      events: shotEvents,
      actorIndex: idx,
    }));

    const anchors = rawActors.map((a) => {
      try { return actorAnchors(a); } catch { return null; }
    });

    // 计算人物 ↔ 背景 ↔ 道具双向空间交互总线状态
    const worldState = computeWorldInteractionState({
      shot,
      shotIndex,
      spec,
      actors: rawActors,
      calibratedAnchors: anchors,
      events: shotEvents,
      cues,
      t,
      fps: FPS,
    });

    // 将舞台光源边缘高光注入角色渲染状态
    const actors = rawActors.map((a, idx) => ({
      ...a,
      rimLight: worldState.actorLighting[idx]?.rimLight ?? 0,
      rimColor: worldState.actorLighting[idx]?.rimColor ?? '#FFE5A3',
    }));

    const isOpener = shot === shots[0] && rawTime < Math.min(shot.end, OPENER_END);
    const cam = cameraFor(shot, rawTime, cues);
    const camZ = { ...cam, z: cam.z * zoomMul };
    const driven = new Set(shotEvents.filter((e) => BODY_VERBS.has(e.verb)).map((e) => e.propId));

    reseedBoil(0);
    composeScene(ctx, {
      t,
      cam: camZ,
      mood: shot.mood || 'work_cool',
      setSpec,
      worldState,
      spotlights: spec.lighting?.spotlights === true,
      focusX: actors[0]?.x ?? 640,
      layers: {
        back: (g) => {
          for (const ref of (shot.companionProps || []).filter((p) => p.behind)) {
            if (driven.has(ref.propId)) continue;
            const from = Number.isFinite(ref.enterAt) ? ref.enterAt : (ref.fromLine ? cues[ref.fromLine - 1].start : shot.start);
            if (rawTime < from) continue;
            drawProp(g, ref, t, ref.carry ? 1 : 0.85 + 0.15 * smooth((rawTime - from) / 0.25));
          }
        },
        actors: (g) => {
          for (const a of actors) {
            if (a.atlas && atlasImages.has(a.atlas)) drawAtlasActor(g, a, atlasImages);
            else if (a.assetId) drawImageActor(g, a);
            else drawContactActor(g, a);
          }
        },
        foreground: (g) => {
          if (shot.foregroundTable) {
            const { x, y, width } = shot.foregroundTable;
            drawForegroundTable(g, x, y, width + (worldState.setState.reactive?.deskShake || 0) * 0.2);
          }
          drawSemanticTracks(g, rawTime, shot.semanticTracks);
          drawAmbient(g, rawTime, shot.ambient);
          drawWorldForegroundFeedbackCanvas(g, worldState, t, drawBoundProp);

          for (const a of actors) {
            if (a.name && a.opacity > 0.7 && !(isOpener && spec.performanceVersion === 2)) {
              drawText(g, a.name, a.x, a.y - (a.assetId ? a.height : 10.4 * a.u) - 18, 17, '#E5E8DD');
            }
          }
          if (isOpener && spec.opener.rolePlates) {
            const plates = spec.opener.rolePlates.map((text, i) => {
              const an = anchors[i];
              const head = an?.headTop || [actors[i]?.x ?? 640, (actors[i]?.y ?? 600) - 380];
              return actors[i] ? { text, x: head[0], y: head[1], dir: i === 0 ? -1 : 1 } : null;
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
    return { shot: shot.id, setId: worldState.setState.id, line, camera: camZ, isOpener, anchors: worldState.anchors };
  }

  /** L4 固定屏幕 HUD：横幅 + 角标 + Day2 字幕。ctx 须处于逻辑坐标变换下。 */
  function renderHud(ctx, rawTime) {
    if (rawTime < OPENER_END) drawHudBanner(ctx, rawTime, spec.opener);
    drawComplianceCorner(ctx);
    if (planningPreview) {
      ctx.save();
      ctx.fillStyle = 'rgba(9,22,54,0.9)';
      ctx.fillRect(12, 10, 300, 49);
      ctx.restore();
      drawText(ctx, '无声动作样片 · 四段节选', 162, 26, 16, '#FFE8A3');
      drawText(ctx, '规划节奏 · 非实测配音 · 非连续剧情', 162, 46, 12, '#CAD9DF');
    }
    const s = subdata.screens.find((x) => rawTime >= x.start && rawTime < x.end);
    if (s) sub.draw(ctx, { lines: sub.wrap(s.text), speaker: spec.speaker || '本鲸', vis: 1, W, H });
  }

  const transitionCanvas = createCanvas(W * 1.5, H * 1.5);
  const previousCanvas = createCanvas(W * 1.5, H * 1.5);
  let previousKey = null;

  function renderFrame(ctx, rawTime, opts = {}) {
    const shot = shotAt(rawTime);
    const index = shots.indexOf(shot);
    const trState = index > 0 ? resolveTransitionState(shot, rawTime) : { active: false };
    let info;

    if (trState.active) {
      if (previousKey !== shot.id) {
        const pg = previousCanvas.getContext('2d');
        pg.setTransform(1.5, 0, 0, 1.5, 0, 0);
        pg.clearRect(0, 0, W, H);
        renderScene(pg, Math.max(0, shot.start - 1 / 30), opts);
        previousKey = shot.id;
      }
      const ng = transitionCanvas.getContext('2d');
      ng.setTransform(1.5, 0, 0, 1.5, 0, 0);
      ng.clearRect(0, 0, W, H);
      info = renderScene(ng, rawTime, opts);

      const q = trState.progress;
      ctx.save();
      if (trState.type === 'pan_through' || trState.type === 'whip_left' || trState.type === 'whip_right') {
        const dir = trState.direction;
        ctx.drawImage(previousCanvas, dir * q * W, 0, W, H);
        ctx.drawImage(transitionCanvas, -dir * (1 - q) * W, 0, W, H);
        if (trState.streakAlpha > 0.02) {
          ctx.globalAlpha = trState.streakAlpha * 0.35;
          ctx.fillStyle = '#EAF6FF';
          for (let i = 0; i < 6; i++) {
            ctx.fillRect(0, 90 + i * 95, W, 3);
          }
        }
      } else if (trState.type === 'iris') {
        ctx.drawImage(previousCanvas, 0, 0, W, H);
        ctx.beginPath();
        ctx.arc(trState.focus[0], trState.focus[1], trState.irisRadius, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(transitionCanvas, 0, 0, W, H);
      } else if (trState.type === 'wipe') {
        ctx.drawImage(previousCanvas, 0, 0, W, H);
        ctx.beginPath();
        ctx.rect(0, 0, W * q, H);
        ctx.clip();
        ctx.drawImage(transitionCanvas, 0, 0, W, H);
      } else {
        ctx.drawImage(previousCanvas, 0, 0, W, H);
        if (trState.type === 'fade') ctx.globalAlpha = q;
        ctx.drawImage(transitionCanvas, trState.type === 'slide' ? (1 - q) * W : 0, 0, W, H);
      }
      ctx.restore();
    } else {
      info = renderScene(ctx, rawTime, opts);
    }

    if (!opts.noHud) renderHud(ctx, rawTime);
    return info;
  }

  return {
    spec,
    cues,
    shots,
    events,
    duration,
    frames,
    stamp,
    sub,
    planningPreview,
    measured: !planningPreview,
    renderScene,
    renderHud,
    renderFrame,
    lineAt,
    shotAt,
    toRemotionProps: (extra = {}) => adaptEpisodeToRemotionProps({ spec, alignment, subdata, planningPreview, ...extra }),
  };
}

export async function main(argv = process.argv.slice(2)) {
  const specPath = argOf(argv, '--spec');
  if (!specPath) throw new Error('用法：--spec <episode.spec.mjs> --voice <wav> --alignment <json> --subtitle-file <json> [--backend canvas|remotion] [--export-remotion-props <json>] [--out|--test|--stills]');
  const voice = argOf(argv, '--voice');
  const alignmentPath = argOf(argv, '--alignment');
  const subsPath = argOf(argv, '--subtitle-file');
  if (!voice || !alignmentPath || !subsPath) throw new Error('缺少 --voice/--alignment/--subtitle-file');

  const spec = await loadSpec(specPath);
  const alignment = JSON.parse(fs.readFileSync(alignmentPath, 'utf8'));
  const subdata = JSON.parse(fs.readFileSync(subsPath, 'utf8'));
  validateInputs({ voice, alignment, subdata });

  const exportRemotionFile = argOf(argv, '--export-remotion-props');
  if (exportRemotionFile) {
    const props = adaptEpisodeToRemotionProps({ spec, alignment, subdata, voicePath: voice });
    fs.mkdirSync(path.dirname(path.resolve(exportRemotionFile)), { recursive: true });
    fs.writeFileSync(exportRemotionFile, JSON.stringify(props, null, 2) + '\n');
    console.log('EXPORTED_REMOTION_PROPS', exportRemotionFile);
    return props;
  }

  const backend = argOf(argv, '--backend') || 'canvas';
  if (backend === 'remotion') {
    const cli = fileURLToPath(new URL('../remotion-engine/render_cli.mjs', import.meta.url));
    const specDir = path.dirname(path.resolve(specPath));
    const out = argOf(argv, '--out') || path.join(specDir, `Day${spec.day}_Remotion动态版.mp4`);
    const forwardArgs = [cli, '--mode', 'episode', '--spec', path.resolve(specPath), '--voice', path.resolve(voice), '--alignment', path.resolve(alignmentPath), '--subtitle-file', path.resolve(subsPath)];
    if (argv.includes('--test')) forwardArgs.push('--dry-run');
    else forwardArgs.push('--out', path.resolve(out));
    const res = spawnSync(process.execPath, forwardArgs, { stdio: 'inherit' });
    if (res.status !== 0) throw new Error(`Remotion 后端执行失败 (exit=${res.status})`);
    return { backend: 'remotion', out };
  }

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
    const report = {
      measured: true,
      title_len: TITLE_LEN,
      frames: r.frames,
      duration: r.duration,
      samples,
      events: r.events.map((e) => ({ id: e.id || e.propId, verb: e.verb, word_id: e.word_id, contactFrame: e.contactFrame })),
    };
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
