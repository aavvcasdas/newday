// frame_evaluator.mjs — 纯函数帧状态求解器（纯 ESM，同时供 Remotion JSX 组件与 Node CLI/单测直接加载）
import { createBeatGrid, resolveTransitionState } from '../engine/timeline_core.mjs';
import { cameraFor } from '../engine/camera_plan.mjs';
import { evaluateCharacterMotion, bodyPerformance } from '../engine/character_motion.mjs';
import { resolveStageSet } from '../场景/stage_sets_core.mjs';
import { computeWorldInteractionState } from '../互动元素/world_interactions.mjs';

export function evaluateRemotionFrameState(props, t) {
  const shots = props.shots || [];
  if (!shots.length) {
    throw new Error('Remotion UniversalComposition: shots 不能为空');
  }
  const duration = props.duration ?? shots[shots.length - 1].end;
  const shotIndex = Math.max(
    0,
    shots.findIndex((s, i) => t >= s.start && t < (shots[i + 1]?.start ?? duration + 1))
  );
  const shot = shots[shotIndex] || shots[0];
  const cues = props.cues || [];
  const fps = props.fps || 30;
  const beatGrid = props.beatConfig ? createBeatGrid(props.beatConfig) : null;

  let line = 1;
  cues.forEach((c, idx) => {
    if (t >= c.start) line = idx + 1;
  });

  const setSpec = shot.setSpec || shot.set || shot.stageSet || 'underwater_study';
  const previewSet = resolveStageSet(setSpec, t, { mood: shot.mood || 'work_cool' });

  const isOpener = props.mode === 'day-episode' && shotIndex === 0 && t < Math.min(shot.end, props.opener?.openerEnd ?? 2.8);
  const actorPlans = isOpener && props.directorVersion !== 1 && props.opener?.actorA && props.opener?.actorB
    ? [props.opener.actorA, props.opener.actorB]
    : (shot.actors || shot.actorsPlan || []);

  const shotEvents = (props.events || []).filter((e) => !e.shotId || e.shotId === shot.id);

  const rawActors = actorPlans.map((plan, idx) => {
    if (plan.performanceV2) {
      const perf = bodyPerformance(plan, t);
      const base = evaluateCharacterMotion(
        { ...plan, idleMotion: 0 },
        t,
        { line, cues, beatGrid, shotStart: shot.start, setAnchors: previewSet.anchors, events: shotEvents, actorIndex: idx }
      );
      return {
        ...base,
        assetId: plan.assetId,
        height: plan.height,
        opacity: perf.opacity ?? 1,
        imageScale: perf.scale ?? 1,
        pose: perf.pose || base.pose,
        x: (base.x - base.dx) + perf.dx,
        y: (plan.y ?? previewSet.anchors?.groundY ?? 600) + perf.dy,
        u: (plan.u ?? 38) * (perf.scale ?? 1),
        lean: (plan.lean ?? 0) + perf.lean,
        squash: perf.squash ?? 0,
        sx: perf.sx ?? 1,
        sy: perf.sy ?? 1,
        lift: Math.max(base.lift || 0, perf.lift || 0),
      };
    }
    return evaluateCharacterMotion(plan, t, {
      line,
      cues,
      beatGrid,
      shotStart: shot.start,
      setAnchors: previewSet.anchors,
      events: shotEvents,
      actorIndex: idx,
    });
  });

  const worldState = computeWorldInteractionState({
    shot,
    shotIndex,
    spec: props,
    actors: rawActors,
    calibratedAnchors: [],
    events: shotEvents,
    cues,
    beatGrid,
    t,
    fps,
  });

  const actors = rawActors.map((a, idx) => ({
    ...a,
    rimLight: worldState.actorLighting[idx]?.rimLight ?? 0,
    rimColor: worldState.actorLighting[idx]?.rimColor ?? '#FFE5A3',
  }));

  const camera = cameraFor(shot, t, cues);
  const transitionState = shotIndex > 0 ? resolveTransitionState(shot, t) : { active: false, type: 'none', progress: 1 };

  return {
    t,
    line,
    shot,
    shotIndex,
    isOpener,
    camera,
    setState: worldState.setState,
    worldState,
    actors,
    shotEvents,
    transitionState,
  };
}
