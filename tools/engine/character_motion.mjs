// character_motion.mjs — 统一角色骨骼驱动、连续姿态过渡、节拍律动与手部空间运动学 (handAt)
// 彻底解决「人物为什么不动」：
//   1. 接入全部 14 个 RIG_ACTIONS 骨骼动作 + 28 个 LEGACY_ACTIONS 高清差分骨骼动作；
//   2. 引入 paint-mv-skills 的 move(style, t, seed) 15 种律动/步态与 mood() 平滑过渡；
//   3. 引入 Win-Hao/music-mv 的连续呼吸、预备→过冲(backOut)→回弹落定、体积守恒挤压拉伸、
//      以及世界空间手部锚点 handAt(actorState, side) 供道具与场景双向绑定；
//   4. 严格守护角色面部红线：不篡改固定 PNG 五官像素，不画肤色假眼皮。

import { RIG_ACTIONS, rigAnim } from '../day3制作/whale_girl_src/whale_rig_actions.mjs';
import { LEGACY_ACTIONS, poseAt as legacyPoseAt, motionAt as legacyMotionAt } from '../day3制作/whale_girl_src/legacy_actions.mjs';
import {
  TAU,
  clamp,
  lerp,
  seg,
  ease,
  easeOut,
  backOut,
  anticipationEnvelope,
  kf,
  resolveMood,
} from './timeline_core.mjs';

const LEGACY_ACTION_MAP = new Map(LEGACY_ACTIONS.map((item) => [item.id, item]));
// 兼容常见别名（如 walk_cycle / run_cycle / wave_hello）
const ACTION_ALIASES = Object.freeze({
  walk_cycle: 'walk_brisk',
  run_cycle: 'run_sprint',
  wave_hello: 'wave_arm',
  wave: 'wave_arm',
  bow: 'bow_deep',
  cheer: 'jump_joy',
  give: 'beckon_hand',
  present_right: 'toast_cheers',
  slam_desk: 'playful_fists',
  point: 'beckon_hand',
  think: 'peek_curious',
  shock: 'shock_petrify',
  work_desk: 'fatfish_working',
});

export const CHARACTER_ACTION_NAMES = Object.freeze([
  ...new Set([
    ...Object.keys(RIG_ACTIONS),
    ...LEGACY_ACTIONS.map((item) => item.id),
    ...Object.keys(ACTION_ALIASES),
  ]),
]);

export const MOVE_STYLE_NAMES = Object.freeze([
  'idle',
  'breathe',
  'sway',
  'talk_sway',
  'bounce',
  'groove',
  'hop',
  'walk',
  'run',
  'stroll',
  'work',
  'listen',
  'nod',
  'celebrate',
  'swim',
  'push_heavy',
  'reach_up',
]);

export function isKnownCharacterAction(name) {
  if (typeof name !== 'string') return false;
  const resolved = ACTION_ALIASES[name] || name;
  return Boolean(RIG_ACTIONS[resolved] || LEGACY_ACTION_MAP.get(resolved));
}

export function isKnownMoveStyle(style) {
  return typeof style === 'string' && MOVE_STYLE_NAMES.includes(style);
}

/**
 * 合并两套骨骼增量（线性叠加 rot / dx / dy，乘性叠加 s）
 */
export function mergeBoneAnimations(base = {}, extra = {}, weight = 1) {
  if (!extra || weight === 0) return structuredClone(base || { bones: {} });
  const out = {
    root: { ...(base?.root || {}) },
    bones: { ...(base?.bones || {}) },
    lift: (base?.lift || 0) + (extra?.lift || 0) * weight,
  };
  if (extra.root) {
    for (const k of ['dx', 'dy', 'rot']) {
      if (Number.isFinite(extra.root[k])) {
        out.root[k] = (out.root[k] || 0) + extra.root[k] * weight;
      }
    }
    for (const k of ['sx', 'sy']) {
      if (Number.isFinite(extra.root[k])) {
        const baseScale = Number.isFinite(out.root[k]) ? out.root[k] : 1;
        out.root[k] = baseScale * lerp(1, extra.root[k], weight);
      }
    }
  }
  for (const [boneName, tr] of Object.entries(extra.bones || {})) {
    const cur = { ...(out.bones[boneName] || {}) };
    if (Number.isFinite(tr.rot)) cur.rot = (cur.rot || 0) + tr.rot * weight;
    if (Number.isFinite(tr.dx)) cur.dx = (cur.dx || 0) + tr.dx * weight;
    if (Number.isFinite(tr.dy)) cur.dy = (cur.dy || 0) + tr.dy * weight;
    if (Number.isFinite(tr.s)) cur.s = (Number.isFinite(cur.s) ? cur.s : 1) * lerp(1, tr.s, weight);
    out.bones[boneName] = cur;
  }
  return out;
}

/**
 * 连续生命感次级骨骼运动（呼吸起伏 + 重心微摆 + 头发/鲸尾相位滞后跟随）
 * amount === 0 时严格归零（供显式静止定格镜头使用）。
 */
export function computeLivingSkeleton(t, seed = 0, amount = 1) {
  if (amount <= 0) {
    return { dx: 0, dy: 0, lean: 0, squash: 0, lift: 0, bones: {} };
  }
  const ph = t * 2.05 + seed * 4.3;
  const slow = t * 1.15 + seed * 2.7;
  const breath = Math.sin(ph);
  const sway = Math.sin(slow);
  // 站立待机双脚锚定地面不打滑 (dx=0)，重心摆动与呼吸全部通过躯干倾角、胸腔起伏和头发/鲸尾滞后骨骼表达
  return {
    dx: 0,
    dy: -breath * 2.4 * amount,
    lean: sway * 0.014 * amount,
    squash: -breath * 0.022 * amount,
    lift: Math.max(0, breath) * 0.035 * amount,
    bones: {
      spine: { rot: sway * 0.018 * amount },
      head: { rot: Math.sin(slow - 0.45) * 0.024 * amount, dy: -breath * 1.2 * amount },
      armL: { rot: (0.032 * Math.sin(ph - 0.35) + 0.012) * amount },
      armR: { rot: (-0.032 * Math.sin(ph - 0.35) - 0.012) * amount },
      hairL: { rot: Math.sin(ph - 0.85) * 0.052 * amount },
      hairR: { rot: Math.sin(ph - 1.05) * 0.052 * amount },
      tail: { rot: Math.sin(t * 2.4 + seed * 3.1 - 0.65) * 0.12 * amount },
    },
  };
}

/**
 * 节拍/连续律动风格求解（融合 paint-mv-skills characters.js move() 与 music-mv 步态）
 */
export function evaluateMoveStyle(style = 'idle', t = 0, seed = 0, { beatGrid = null, speed = 1 } = {}) {
  const rate = beatGrid ? (beatGrid.bpm / 120) * speed : speed;
  const ph = (t * rate * 2.2 + seed) * Math.PI;
  const s = Math.sin(ph);
  const c = Math.cos(ph);
  const absS = Math.abs(s);

  switch (style) {
    case 'idle':
    case 'breathe':
      return { dx: 0, dy: 0, lean: 0, squash: 0, lift: 0, bones: {}, footPhase: null };

    case 'sway':
    case 'talk_sway':
      return {
        dx: 9 * Math.sin(ph * 0.5),
        dy: -3.5 * Math.abs(Math.cos(ph * 0.5)),
        lean: 0.032 * Math.sin(ph * 0.5),
        squash: -0.02 * Math.abs(Math.cos(ph * 0.5)),
        lift: 0.06 * Math.abs(Math.cos(ph * 0.5)),
        bones: {
          spine: { rot: 0.04 * Math.sin(ph * 0.5) },
          head: { rot: -0.035 * Math.sin(ph * 0.5 - 0.35) },
          armL: { rot: 0.14 * Math.sin(ph * 0.5) },
          armR: { rot: 0.14 * Math.sin(ph * 0.5) },
          tail: { rot: 0.18 * Math.sin(ph * 0.5 - 0.55) },
        },
        footPhase: null,
      };

    case 'bounce':
    case 'groove': {
      const p = beatGrid ? beatGrid.bounce(t, 1) : absS;
      const sq = p < 0.22 ? 0.055 * (1 - p / 0.22) : -0.035 * p;
      return {
        dx: 0,
        dy: -14 * p,
        lean: 0.018 * s,
        squash: sq,
        lift: 0.22 * p,
        bones: {
          spine: { rot: 0.025 * s },
          head: { dy: -3 * p, rot: 0.03 * s },
          armL: { rot: -0.18 * p - 0.06 },
          armR: { rot: 0.18 * p + 0.06 },
          hairL: { rot: 0.11 * p },
          hairR: { rot: -0.11 * p },
          tail: { rot: 0.2 * Math.sin(ph - 0.4) },
        },
        footPhase: (ph / TAU) % 1,
      };
    }

    case 'hop':
    case 'celebrate': {
      const cyc = beatGrid ? beatGrid.beatPhase(t, 1) : ((t * rate * 1.35 + seed) % 1 + 1) % 1;
      const air = cyc < 0.18 ? 0 : Math.sin(((cyc - 0.18) / 0.82) * Math.PI);
      const crouch = cyc < 0.18 ? Math.sin((cyc / 0.18) * Math.PI) : 0;
      return {
        dx: style === 'celebrate' ? 6 * Math.sin(ph * 0.5) : 0,
        dy: 10 * crouch - (style === 'celebrate' ? 34 : 24) * air,
        lean: style === 'celebrate' ? 0.04 * Math.sin(ph * 0.5) : 0,
        squash: 0.075 * crouch - 0.055 * air,
        lift: 0.55 * air,
        bones: {
          legL: { rot: 0.12 * crouch - 0.08 * air },
          legR: { rot: -0.12 * crouch + 0.08 * air },
          armL: { rot: style === 'celebrate' ? -0.85 * air - 0.2 : -0.32 * air },
          armR: { rot: style === 'celebrate' ? 0.85 * air + 0.2 : 0.32 * air },
          head: { dy: -4 * air, rot: -0.04 * air },
          hairL: { rot: 0.18 * air },
          hairR: { rot: -0.18 * air },
          tail: { rot: 0.26 * Math.sin(ph - 0.5) },
        },
        footPhase: cyc,
      };
    }

    case 'walk':
    case 'stroll': {
      const mul = style === 'stroll' ? 0.68 : 1;
      const wPh = t * rate * (style === 'stroll' ? 5.2 : 6.8) + seed * 3.1;
      const swing = Math.sign(Math.sin(wPh)) * Math.pow(Math.abs(Math.sin(wPh)), 0.72);
      const bob = Math.abs(Math.cos(wPh));
      return {
        dx: 0,
        dy: -8.5 * mul * bob,
        lean: 0.024 * mul * swing,
        squash: -0.022 * mul * bob + 0.018 * mul * (1 - bob),
        lift: 0.16 * mul * bob,
        bones: {
          legL: { rot: 0.34 * mul * swing, dy: -Math.max(0, swing) * 11 * mul },
          legR: { rot: -0.34 * mul * swing, dy: -Math.max(0, -swing) * 11 * mul },
          armL: { rot: -0.26 * mul * swing },
          armR: { rot: 0.26 * mul * swing },
          spine: { rot: 0.025 * mul * swing },
          head: { rot: -0.018 * mul * swing, dy: -2 * bob },
          hairL: { rot: 0.08 * Math.sin(wPh - 0.6) },
          hairR: { rot: 0.08 * Math.sin(wPh - 0.8) },
          tail: { rot: 0.2 * Math.sin(wPh - 0.5) },
        },
        footPhase: ((wPh / Math.PI) % 1 + 1) % 1,
      };
    }

    case 'run': {
      const rPh = t * rate * 10.2 + seed * 2.1;
      const swing = Math.sin(rPh);
      const bob = Math.abs(Math.cos(rPh));
      return {
        dx: 0,
        dy: -15 * bob,
        lean: 0.085 + 0.025 * swing,
        squash: -0.04 * bob + 0.03 * (1 - bob),
        lift: 0.34 * bob,
        bones: {
          legL: { rot: 0.52 * swing, dy: -Math.max(0, swing) * 16 },
          legR: { rot: -0.52 * swing, dy: -Math.max(0, -swing) * 16 },
          armL: { rot: -0.46 * swing - 0.1 },
          armR: { rot: 0.46 * swing + 0.1 },
          spine: { rot: 0.08 },
          head: { rot: -0.05 },
          hairL: { rot: 0.22 * Math.sin(rPh - 0.7) },
          hairR: { rot: 0.22 * Math.sin(rPh - 0.9) },
          tail: { rot: 0.28 * Math.sin(rPh - 0.6) },
        },
        footPhase: ((rPh / Math.PI) % 1 + 1) % 1,
      };
    }

    case 'work': {
      const tap = Math.pow(Math.abs(Math.sin(t * rate * 9.4 + seed)), 1.5);
      return {
        dx: 1.5 * Math.sin(t * 1.9 + seed),
        dy: 3 - 2.5 * tap,
        lean: 0.038,
        squash: 0.015 * tap,
        lift: 0,
        bones: {
          spine: { rot: 0.055 },
          head: { rot: 0.075 + 0.025 * Math.sin(t * 2.8), dy: 4 },
          armL: { rot: 0.14 + 0.09 * tap },
          armR: { rot: -0.14 - 0.09 * (1 - tap) },
          tail: { rot: 0.12 * Math.sin(t * 2.1) },
        },
        footPhase: null,
      };
    }

    case 'nod':
    case 'listen': {
      const mul = style === 'nod' ? 1 : 0.48;
      const k = Math.pow(Math.abs(Math.sin(t * rate * 3.6 + seed)), 1.6);
      return {
        dx: 0,
        dy: 2.5 * k * mul,
        lean: 0.015 * k * mul,
        squash: 0.016 * k * mul,
        lift: 0,
        bones: {
          head: { rot: (0.04 + 0.13 * k) * mul, dy: 5 * k * mul },
          spine: { rot: 0.035 * k * mul },
          tail: { rot: 0.11 * Math.sin(t * 2.3 + seed) },
        },
        footPhase: null,
      };
    }

    case 'swim': {
      const sw = Math.sin(t * rate * 2.8 + seed);
      return {
        dx: 8 * Math.cos(t * rate * 1.4 + seed),
        dy: -16 + 11 * sw,
        lean: 0.12 + 0.05 * sw,
        squash: -0.02 * sw,
        lift: 0.65,
        bones: {
          spine: { rot: 0.06 * sw },
          armL: { rot: -0.35 + 0.25 * sw },
          armR: { rot: 0.35 - 0.25 * sw },
          legL: { rot: 0.22 * Math.sin(t * 5.2) },
          legR: { rot: -0.22 * Math.sin(t * 5.2) },
          tail: { rot: 0.42 * Math.sin(t * 4.4 - 0.5) },
        },
        footPhase: null,
      };
    }

    case 'push_heavy': {
      const strain = 0.5 + 0.5 * Math.sin(t * rate * 3.2 + seed);
      return {
        dx: 6 * strain,
        dy: 8 * strain,
        lean: 0.11 + 0.03 * strain,
        squash: 0.045 * strain,
        lift: 0,
        bones: {
          spine: { rot: 0.12 + 0.04 * strain },
          head: { rot: 0.06, dy: 4 },
          armL: { rot: -0.58 - 0.12 * strain },
          armR: { rot: -0.68 - 0.14 * strain },
          legL: { rot: 0.18 },
          legR: { rot: -0.22 },
          tail: { rot: -0.18 * strain },
        },
        footPhase: ((t * rate * 1.6) % 1 + 1) % 1,
      };
    }

    case 'reach_up': {
      const reach = 0.65 + 0.35 * Math.sin(t * rate * 2.4 + seed);
      return {
        dx: 0,
        dy: -12 * reach,
        lean: -0.035 * reach,
        squash: -0.04 * reach,
        lift: 0.25 * reach,
        bones: {
          spine: { rot: -0.05 * reach },
          head: { rot: -0.11 * reach, dy: -4 * reach },
          armR: { rot: -1.35 * reach },
          armL: { rot: -0.38 * reach },
          tail: { rot: 0.16 * Math.sin(t * 2.5) },
        },
        footPhase: null,
      };
    }

    default:
      return { dx: 0, dy: 0, lean: 0, squash: 0, lift: 0, bones: {}, footPhase: null };
  }
}

/**
 * 求解命名动作（兼容 RIG_ACTIONS 与 28 个 LEGACY_ACTIONS）
 */
export function evaluateNamedAction(actionName, localTime = 0, { loop = true } = {}) {
  const resolved = ACTION_ALIASES[actionName] || actionName;
  if (RIG_ACTIONS[resolved]) {
    const spec = RIG_ACTIONS[resolved];
    const t = loop && spec.dur > 0 ? ((localTime % spec.dur) + spec.dur) % spec.dur : Math.max(0, localTime);
    const anim = rigAnim(resolved, t);
    return {
      id: resolved,
      kind: 'rig',
      pose: null,
      prevPose: null,
      poseBlend: 1,
      emote: null,
      anim,
      lift: anim.lift || 0,
    };
  }
  const legacy = LEGACY_ACTION_MAP.get(resolved);
  if (legacy) {
    const t = loop && legacy.dur > 0 ? ((localTime % legacy.dur) + legacy.dur) % legacy.dur : Math.max(0, localTime);
    const poseInfo = legacyPoseAt(legacy, t);
    const anim = legacyMotionAt(legacy, t);
    return {
      id: resolved,
      kind: 'legacy',
      pose: poseInfo.pose,
      prevPose: poseInfo.prev,
      poseBlend: poseInfo.blend,
      emote: legacy.emote || null,
      anim,
      lift: anim.lift || 0,
    };
  }
  return null;
}

/**
 * 综合求解单个角色在时刻 t 的完整运动学状态（纯函数，无副作用）
 */
export function evaluateCharacterMotion(plan, t, {
  line = 1,
  cues = [],
  beatGrid = null,
  shotStart = 0,
  setAnchors = null,
  events = [],
  actorIndex = 0,
} = {}) {
  const seed = Number.isFinite(plan.seed) ? plan.seed : ((plan.x || 480) * 0.013 + actorIndex * 1.7);
  const idleAmount = plan.idleMotion ?? 1;
  const localT = Math.max(0, t - (plan.actionStart ?? shotStart));

  // 1. 基础位置与场景地面锚定
  const baseGroundY = plan.snapToGround && setAnchors?.groundY != null ? setAnchors.groundY : (plan.y ?? setAnchors?.groundY ?? 600);
  let x = plan.anchor && setAnchors?.[plan.anchor]?.x != null ? setAnchors[plan.anchor].x + (plan.anchorOffsetX || 0) : (plan.x ?? 640);
  let y = baseGroundY;
  let autoFlip = plan.flip ?? (plan.facing === -1 ? true : plan.facing === 1 ? false : undefined);

  // 2. 路径关键帧 / 走位求解（支持 from->to、fromAnchor->toAnchor 或 track: [[t, x, y], ...]）
  let walkingActive = false;
  let walkGait = null;
  let footContacts = [];
  let trackVx = 0;
  let lastMovingVx = 0;
  let walkSegStartT = shotStart;
  if (Array.isArray(plan.track) && plan.track.length >= 2) {
    const normTrack = plan.track.map((row) => (Array.isArray(row[1]) ? row : [row[0], [row[1], row[2]], row[3]]));
    const pos = kf(t, normTrack);
    const prevPos = kf(Math.max(0, t - 1 / 30), normTrack);
    for (let i = 0; i < normTrack.length - 1; i++) {
      const [t0, p0] = normTrack[i];
      const [t1, p1] = normTrack[i + 1];
      const dtSeg = Math.max(0.001, t1 - t0);
      const segVx = ((p1?.[0] ?? 0) - (p0?.[0] ?? 0)) / dtSeg;
      if (t >= t0 && Math.abs(segVx) > 6) {
        lastMovingVx = segVx;
        if (t <= t1 + 0.001) {
          walkSegStartT = t0;
        }
      }
    }
    if (Array.isArray(pos)) {
      x = pos[0];
      if (Number.isFinite(pos[1])) y = pos[1];
      trackVx = (pos[0] - (prevPos?.[0] ?? pos[0])) * 30;
      if (Math.abs(trackVx) > 6) {
        walkingActive = true;
        if (autoFlip == null) autoFlip = trackVx < 0;
        walkGait = evaluateMoveStyle(Math.abs(trackVx) > 210 ? 'run' : 'walk', t, seed, { beatGrid });
        if (walkGait.footPhase != null && (walkGait.footPhase < 0.14 || Math.abs(walkGait.footPhase - 0.5) < 0.08)) {
          footContacts.push({ x, y: baseGroundY, strength: 0.72, phase: walkGait.footPhase });
        }
      }
    }
  } else if (plan.walk) {
    const wStart = plan.walk.start != null
      ? plan.walk.start
      : (plan.walk.startLine ? (cues[plan.walk.startLine - 1]?.start ?? 0) : shotStart);
    const wDur = Math.max(0.05, plan.walk.duration ?? 1);
    const fromX = plan.walk.fromAnchor && setAnchors?.[plan.walk.fromAnchor]?.x != null
      ? setAnchors[plan.walk.fromAnchor].x
      : plan.walk.from;
    const toX = plan.walk.toAnchor && setAnchors?.[plan.walk.toAnchor]?.x != null
      ? setAnchors[plan.walk.toAnchor].x
      : plan.walk.to;
    const u = seg(t, wStart, wStart + wDur);
    const p = ease(u);
    x = lerp(fromX, toX, p);
    if (plan.walk.autoFace && autoFlip == null) autoFlip = toX < fromX;
    if (t >= wStart && t <= wStart + wDur) {
      walkingActive = true;
      const env = ease(seg(t, wStart, wStart + 0.14)) * ease(seg(wStart + wDur - t, 0, 0.14));
      const style = plan.walk.style || (Math.abs(toX - fromX) / wDur > 260 ? 'run' : 'walk');
      const rawGait = evaluateMoveStyle(style, t - wStart, seed, { beatGrid });
      walkGait = {
        ...rawGait,
        dy: rawGait.dy * env,
        lean: rawGait.lean * env,
        squash: rawGait.squash * env,
        lift: rawGait.lift * env,
        bones: mergeBoneAnimations({ bones: {} }, { bones: rawGait.bones }, env).bones,
      };
      if (rawGait.footPhase != null && (rawGait.footPhase < 0.14 || Math.abs(rawGait.footPhase - 0.5) < 0.08)) {
        footContacts.push({ x, y: baseGroundY, strength: 0.75 * env, phase: rawGait.footPhase });
      }
    }
  }

  // 3. 姿态时间线与带预备/回弹的平滑姿态切换（绝不一帧干跳）
  let pose = plan.pose || 'idle';
  let prevPose = null;
  let poseBlend = 1;
  let transitionPulse = { dy: 0, lean: 0, squash: 0 };
  const transitionDur = plan.poseTransition ?? 0.24;
  const poseTimeline = [
    ...(plan.poses || []).map((p) => ({
      pose: p.pose,
      at: p.at != null ? p.at : (p.line != null ? (cues[p.line - 1]?.start ?? Infinity) : Infinity),
    })),
    ...(plan.poseChanges || []).map((p) => ({ pose: p.pose, at: p.at })),
  ].filter((p) => Number.isFinite(p.at)).sort((a, b) => a.at - b.at);

  for (const item of poseTimeline) {
    if (t >= item.at) {
      const age = t - item.at;
      if (transitionDur > 0 && age >= 0 && age < transitionDur && item.pose !== pose) {
        const q = ease(age / transitionDur);
        prevPose = pose;
        pose = q < 0.45 ? prevPose : item.pose;
        poseBlend = q;
        // 切换瞬间身体先微缩再弹起（anticipation -> pop -> settle）
        const arc = Math.sin(Math.PI * q);
        transitionPulse = {
          dy: q < 0.35 ? 3.2 * (q / 0.35) : -5.5 * arc,
          lean: 0.022 * arc,
          squash: q < 0.35 ? 0.045 * (q / 0.35) : -0.038 * arc,
        };
      } else {
        prevPose = pose;
        pose = item.pose;
        poseBlend = 1;
      }
    }
  }

  // 3b. 16 帧动作图集序列 (atlas / atlases) + 带预备/回弹与透明交叉淡入淡出的平滑切换
  const isPetRigAtlas = (name) => Boolean(name && (name.endsWith('_2leg') || name.endsWith('_pet') || name.endsWith('_bench')));

  const WALK_TO_IDLE_ATLAS_MAP = {
    whale_walk_happy_2leg: 'whale_idle_happy_pet',
    whale_walk_sad_2leg: 'whale_idle_sad_pet',
    whale_walk_side_2leg: 'whale_idle_side_pet',
    doubao_walk_side_2leg: 'doubao_idle_side_pet',
    gpt_push_walk_2leg: 'gpt_push_idle_pet',
    gemini_walk_2leg: 'gemini_idle_pet',
  };

  // 双腿迈步与同体待机图集的原图朝向（对标 ai-girl-chatgpt-pets：按行进方向自动正对前方，停步后保持朝向不乱弹）
  const PET_RIG_DEFAULT_FACING = {
    whale_walk_side_2leg: 'left',
    whale_idle_side_pet: 'left',
    whale_seat_side_bench: 'left',
    doubao_walk_side_2leg: 'left',
    doubao_idle_side_pet: 'left',
    whale_walk_happy_2leg: 'right',
    whale_idle_happy_pet: 'right',
    whale_walk_sad_2leg: 'right',
    whale_idle_sad_pet: 'right',
    gpt_push_walk_2leg: 'right',
    gpt_push_idle_pet: 'right',
    gemini_walk_2leg: 'right',
    gemini_idle_pet: 'right',
  };

  const atlasCols = plan.atlasCols || 16;
  let activeAtlasSpec = plan.atlas
    ? {
      at: shotStart,
      atlas: plan.atlas,
      cycle: plan.atlasCycle,
      loop: plan.atlasLoop !== false,
      flip: plan.flip,
      emote: plan.emote,
      treadmillSpeed: plan.treadmillSpeed,
      forceWalk: plan.forceWalk,
      phaseOffset: plan.phaseOffset,
    }
    : null;
  let prevAtlasSpec = null;
  let atlasBlend = 1;
  const atlasTimeline = (plan.atlases || [])
    .map((item) => ({
      ...item,
      at: item.at != null ? item.at : (item.line != null ? (cues[item.line - 1]?.start ?? shotStart) : shotStart),
    }))
    .sort((a, b) => a.at - b.at);

  for (const item of atlasTimeline) {
    if (t >= item.at) {
      const age = t - item.at;
      const bothOrEitherPetRig = isPetRigAtlas(activeAtlasSpec?.atlas) || isPetRigAtlas(item.atlas);
      // 对标 ai-girl-chatgpt-pets：同体 idle <-> walk 切换零跨步弹跳、零重影叠化！
      const effTransDur = plan.atlasTransition != null ? plan.atlasTransition : (bothOrEitherPetRig ? 0 : 0.18);
      if (activeAtlasSpec && activeAtlasSpec.atlas !== item.atlas && effTransDur > 0 && age >= 0 && age < effTransDur) {
        const q = ease(age / effTransDur);
        prevAtlasSpec = activeAtlasSpec;
        activeAtlasSpec = item;
        atlasBlend = q;
      } else {
        prevAtlasSpec = activeAtlasSpec;
        activeAtlasSpec = item;
        atlasBlend = 1;
      }
    }
  }

  const resolveEffectiveAtlasName = (spec) => {
    if (!spec?.atlas) return null;
    if (spec.atlas.endsWith('_2leg')) {
      const tmSpeed = spec.treadmillSpeed ?? plan.treadmillSpeed ?? 0;
      const isLocomoting = walkingActive || tmSpeed > 0 || spec.forceWalk === true;
      if (!isLocomoting && WALK_TO_IDLE_ATLAS_MAP[spec.atlas]) {
        return WALK_TO_IDLE_ATLAS_MAP[spec.atlas];
      }
    }
    return spec.atlas;
  };

  const computeAtlasFrame = (spec, resolvedAtlasName = null) => {
    const atlasName = resolvedAtlasName || resolveEffectiveAtlasName(spec);
    if (!atlasName) return 0;
    const isTwoLegWalk = atlasName.endsWith('_2leg') || (spec?.strideCyclePx ?? 0) > 0;
    if (isTwoLegWalk) {
      // 对标 ai-girl-chatgpt-pets pet.json (8帧×120ms ≈ 0.96s/双步周期)：匀速稳定屈膝节拍，绝不忽快忽慢卡帧
      const walkOriginT = Math.max(spec?.at ?? shotStart, walkSegStartT);
      const relWalk = Math.max(0, t - walkOriginT);
      const speedBoost = Math.abs(trackVx) > 165 ? 0.82 : 1.0;
      const cyc = Math.max(0.48, (spec?.cycle || 0.96) * speedBoost);
      const prog = (((relWalk / cyc) + (spec?.phaseOffset || 0)) % 1 + 1) % 1;
      return Math.min(atlasCols - 1, Math.floor(prog * atlasCols));
    }
    const rel = Math.max(0, t - (spec?.at ?? shotStart));
    const cyc = Math.max(0.25, spec?.cycle || (atlasName.endsWith('_pet') ? 1.35 : 1.25));
    const prog = spec?.loop === false ? Math.min(0.999, rel / cyc) : ((rel / cyc) % 1 + 1) % 1;
    return Math.min(atlasCols - 1, Math.floor(prog * atlasCols));
  };

  const atlas = resolveEffectiveAtlasName(activeAtlasSpec);
  const refVx = Math.abs(trackVx) > 6 ? trackVx : lastMovingVx;
  if (activeAtlasSpec?.flip != null) {
    autoFlip = activeAtlasSpec.flip;
  } else if (atlas && PET_RIG_DEFAULT_FACING[atlas] && Math.abs(refVx) > 6) {
    const baseFacing = PET_RIG_DEFAULT_FACING[atlas];
    autoFlip = baseFacing === 'left' ? refVx > 0 : refVx < 0;
  }
  const atlasFrame = computeAtlasFrame(activeAtlasSpec, atlas);
  const prevAtlas = atlasBlend < 0.999 && prevAtlasSpec?.atlas ? resolveEffectiveAtlasName(prevAtlasSpec) : null;
  const prevAtlasFrame = prevAtlas ? computeAtlasFrame(prevAtlasSpec, prevAtlas) : 0;
  const isTwoLegRig = Boolean(atlas && atlas.endsWith('_2leg'));
  const isPetRig = isPetRigAtlas(atlas);
  if (isTwoLegRig && (walkingActive || (activeAtlasSpec?.treadmillSpeed ?? plan.treadmillSpeed ?? 0) > 0)) {
    walkingActive = true;
    if (atlasFrame === 2 || atlasFrame === 3 || atlasFrame === 10 || atlasFrame === 11) {
      footContacts.push({ x, y: baseGroundY, strength: 0.82, phase: atlasFrame / atlasCols });
    }
  }

  // 4. 命名动作（RIG_ACTIONS / 28 个 LEGACY_ACTIONS）
  const activeActionName = (() => {
    let cur = plan.action || null;
    for (const a of plan.actions || []) {
      const at = a.at != null ? a.at : (a.line != null ? (cues[a.line - 1]?.start ?? Infinity) : Infinity);
      const end = a.end != null ? a.end : (a.duration != null ? at + a.duration : Infinity);
      if (t >= at && t < end) cur = a.action || a.id;
    }
    return cur;
  })();
  const actionResult = activeActionName ? evaluateNamedAction(activeActionName, localT, { loop: plan.actionLoop !== false }) : null;
  if (actionResult?.pose) {
    pose = actionResult.pose;
    prevPose = actionResult.prevPose;
    poseBlend = actionResult.poseBlend;
  }

  // 5. 连续律动风格（move: 'bounce' | 'sway' | 'work' | 'hop' | ...）
  const moveResult = plan.move
    ? evaluateMoveStyle(plan.move, t, seed, { beatGrid, speed: plan.moveSpeed ?? 1 })
    : null;
  if (moveResult?.footPhase != null && (moveResult.footPhase < 0.12)) {
    footContacts.push({ x, y: baseGroundY, strength: 0.6, phase: moveResult.footPhase });
  }

  // 6. 生命呼吸底座 + 词点/事件受击与反应脉冲（预备→爆发→过冲→阻尼回弹）
  const living = computeLivingSkeleton(t, seed, idleAmount);
  let eventDx = 0;
  let eventDy = 0;
  let eventLean = 0;
  let eventSquash = 0;
  let eventLift = 0;

  for (const ev of plan.bodyEvents || []) {
    const dur = Math.max(0.08, ev.duration || 0.32);
    const u = (t - ev.at) / dur;
    if (u < 0 || u >= 1) continue;
    const env = ev.style === 'anticipation'
      ? anticipationEnvelope(u, { mode: 'impulse' })
      : Math.pow(Math.sin(Math.PI * ease(u)), 1.6);
    eventDy += env * (ev.dy ?? -8);
    eventDx += env * (ev.dx ?? 0);
    eventLean += env * (ev.lean ?? 0);
    eventSquash += env * (ev.squash ?? -0.03);
    if ((ev.dy ?? 0) < -6) eventLift += Math.max(0, env) * Math.min(0.65, Math.abs(ev.dy) / 80);
  }

  // 自动耦合场景词点交互事件：当 drop_bonk / slap_deflect / tug_grab / handoff 命中本角色时产生受击回弹！
  for (const ev of events || []) {
    const contactT = (ev.contactFrame ?? -999) / 30;
    const age = t - contactT;
    if (age < -0.12 || age > 0.48) continue;
    const targetIdx = ev.verb === 'handoff' ? ev.toActor : (ev.actor ?? (['slap_deflect', 'tug_grab', 'unroll_scroll'].includes(ev.verb) ? 1 : 0));
    const alsoTug = ev.verb === 'tug_grab' && (actorIndex === 0 || actorIndex === 1);
    if (targetIdx !== actorIndex && !alsoTug) continue;

    if (age >= 0) {
      const recoil = Math.exp(-6.5 * age) * Math.sin(age * 16);
      if (ev.verb === 'drop_bonk') {
        eventDy += 14 * Math.exp(-5.5 * age);
        eventSquash += 0.085 * recoil;
      } else if (ev.verb === 'slap_deflect') {
        eventDx += (autoFlip ? 1 : -1) * 10 * recoil;
        eventLean += -0.06 * recoil;
      } else if (ev.verb === 'tug_grab') {
        const pullDir = actorIndex === 0 ? -1 : 1;
        eventDx += pullDir * 9 * Math.sin(age * 18) * Math.exp(-3.5 * age);
        eventLean += pullDir * 0.05 * Math.exp(-3.5 * age);
      } else if (ev.verb === 'handoff') {
        eventDy += -6 * Math.sin(Math.min(1, age / 0.35) * Math.PI);
      }
    } else {
      // 接触前 0.12s 微预备动作
      const prep = (age + 0.12) / 0.12;
      eventDy += 2.5 * prep;
      eventSquash += 0.02 * prep;
    }
  }

  // 7. 情绪关键帧与入场过渡
  const mood = resolveMood(t, plan.moods || []);
  let opacity = 1;
  let enterOffsetX = 0;
  if (plan.enterAt != null) {
    const q = seg(t, plan.enterAt, plan.enterAt + (plan.enterDuration || 0.45));
    opacity = easeOut(q);
    enterOffsetX = (1 - backOut(q, 1.25)) * (plan.enterDx || 0);
  }

  // 8. 合并显式骨骼 + 生命次级骨骼 + 动作骨骼 + 步态骨骼 + move 风格骨骼
  let anim = structuredClone(plan.anim || { bones: {} });
  anim.bones ||= {};
  if (idleAmount > 0) anim = mergeBoneAnimations(anim, { bones: living.bones, lift: living.lift }, 1);
  if (actionResult?.anim) anim = mergeBoneAnimations(anim, actionResult.anim, 1);
  if (moveResult) anim = mergeBoneAnimations(anim, { bones: moveResult.bones, lift: moveResult.lift }, 1);
  if (walkGait) anim = mergeBoneAnimations(anim, { bones: walkGait.bones, lift: walkGait.lift }, 1);

  const rootDx = (anim.root?.dx || 0) * 0.36;
  const rootDy = (anim.root?.dy || 0) * 0.36;
  const rootRot = anim.root?.rot || 0;

  const rigMotionDamp = isPetRig ? 0.04 : (isTwoLegRig ? 0.14 : 1);
  const dx = living.dx * rigMotionDamp + (moveResult?.dx || 0) * rigMotionDamp + eventDx + enterOffsetX + rootDx;
  const dy = living.dy * rigMotionDamp + ((moveResult?.dy || 0) + (walkGait?.dy || 0)) * rigMotionDamp + transitionPulse.dy + eventDy + rootDy;
  const lean = (plan.lean ?? 0) + living.lean * rigMotionDamp + ((moveResult?.lean || 0) + (walkGait?.lean || 0)) * (isPetRig ? 0.08 : (isTwoLegRig ? 0.25 : 1)) + transitionPulse.lean + eventLean + rootRot;
  const squash = clamp(
    (living.squash + (moveResult?.squash || 0) + (walkGait?.squash || 0)) * rigMotionDamp + transitionPulse.squash + eventSquash + mood.squash * (isPetRig ? 0.2 : 1),
    -0.24,
    0.26
  );
  const lift = clamp(Math.max(living.lift, moveResult?.lift || 0, walkGait?.lift || 0, actionResult?.lift || 0, eventLift, dy < -4 ? Math.min(0.8, -dy / 95) : 0), 0, 1);

  // 体积守恒挤压拉伸（paint-mv-skills: sx = 1 + sq*0.5, sy = 1 - sq）
  const sx = (anim.root?.sx ?? 1) * (1 + squash * 0.48);
  const sy = (anim.root?.sy ?? 1) * (1 - squash * 0.62);

  return {
    assetId: plan.assetId,
    characterId: plan.characterId || (plan.assetId || 'whale'),
    height: plan.height,
    opacity,
    imageScale: plan.imageScale ?? 1,
    atlas,
    atlasFrame,
    prevAtlas,
    prevAtlasFrame,
    atlasBlend,
    atlasCols,
    pose,
    prevPose,
    poseBlend,
    action: activeActionName,
    move: plan.move || (walkingActive ? 'walk' : 'idle'),
    emote: activeAtlasSpec?.emote || plan.emote || actionResult?.emote || mood.emote || null,
    mood,
    name: plan.name,
    x: x + dx,
    y: y + dy,
    groundY: baseGroundY,
    dx,
    dy,
    lift,
    u: plan.u ?? 38,
    flip: Boolean(autoFlip),
    lean,
    squash,
    sx,
    sy,
    anim,
    walking: walkingActive,
    footContacts,
    heldProp: plan.heldProp || null,
  };
}

/**
 * 统一世界空间手部与身体锚点求解器 handAt(actorState, side, calibratedAnchors?)
 * 对标 Win-Hao/music-mv 的 handAt(opts, 'left'|'right') -> { x, y, angle, calibrated }：
 *   - 若提供已校准网格锚点（CALIBRATION），优先返回精确网格投影坐标；
 *   - 否则由角色身高、朝向、身体倾斜 (lean)、挤压拉伸 (sx/sy) 与手臂骨骼角 (armL/armR) 正向运动学精确算出手掌位置与握持角！
 */
export function handAt(actorState, side = 'right', calibratedAnchors = null) {
  const dir = actorState.flip ? -1 : 1;
  const h = actorState.assetId
    ? (actorState.height || 340) * (actorState.imageScale ?? 1)
    : 10.4 * (actorState.u ?? 38);

  if (calibratedAnchors) {
    if (side === 'headTop' && calibratedAnchors.headTop) {
      return { x: calibratedAnchors.headTop[0], y: calibratedAnchors.headTop[1], angle: actorState.lean || 0, calibrated: true };
    }
    const key = side === 'left' ? 'handL' : 'handR';
    const fingerKey = side === 'right' && calibratedAnchors.fingerR ? 'fingerR' : key;
    if (calibratedAnchors[fingerKey]) {
      const armBone = actorState.anim?.bones?.[side === 'left' ? 'armL' : 'armR']?.rot || 0;
      return {
        x: calibratedAnchors[fingerKey][0],
        y: calibratedAnchors[fingerKey][1],
        angle: (actorState.lean || 0) + dir * armBone * 0.65,
        calibrated: true,
      };
    }
  }

  const lean = actorState.lean || 0;
  const sx = actorState.sx ?? (1 + (actorState.squash || 0) * 0.035);
  const sy = actorState.sy ?? (1 - (actorState.squash || 0) * 0.035);

  if (side === 'headTop') {
    const localX = 0;
    const localY = -h * 0.96 * sy;
    return {
      x: actorState.x + Math.cos(lean) * localX - Math.sin(lean) * localY,
      y: actorState.y + Math.sin(lean) * localX + Math.cos(lean) * localY,
      angle: lean,
      calibrated: false,
    };
  }
  if (side === 'foot') {
    return { x: actorState.x, y: actorState.groundY ?? actorState.y, angle: 0, calibrated: true };
  }

  // 肩关节与手臂正向运动学（局部原点在脚底中心 [0, 0]）
  const isLeft = side === 'left';
  const sideSign = isLeft ? -1 : 1;
  const shoulderX = sideSign * h * 0.145 * sx;
  const shoulderY = -h * 0.48 * sy;
  const armLen = h * 0.215;
  const defaultRestAngle = isLeft ? Math.PI * 0.64 : Math.PI * 0.36; // 自然垂向身侧偏前
  const boneRot = actorState.anim?.bones?.[isLeft ? 'armL' : 'armR']?.rot || 0;
  // 若姿态为举手/指证/欢呼，赋予自然语义手势基角
  const poseBias = (() => {
    const p = actorState.pose;
    if (!isLeft && (p === 'point' || p === 'wave' || p === 'toast_cheers')) return -0.78;
    if (p === 'cheer' || p === 'jump_joy' || p === 'idol_mic_sing') return isLeft ? -0.95 : 0.95;
    if (p === 'think' || p === 'eat' || p === 'eat_onigiri' || p === 'rose_bouquet') return isLeft ? 0.35 : -0.35;
    return 0;
  })();

  const localArmAngle = defaultRestAngle + boneRot + poseBias;
  const localHandX = shoulderX + Math.cos(localArmAngle) * armLen * sx;
  const localHandY = shoulderY + Math.sin(localArmAngle) * armLen * sy;

  const worldOffsetX = dir * localHandX;
  const worldOffsetY = localHandY;
  const cosL = Math.cos(lean);
  const sinL = Math.sin(lean);

  return {
    x: actorState.x + cosL * worldOffsetX - sinL * worldOffsetY,
    y: actorState.y + sinL * worldOffsetX + cosL * worldOffsetY,
    angle: lean + dir * (localArmAngle - Math.PI * 0.5) * 0.6,
    calibrated: false,
  };
}

/**
 * 纯函数固定立绘表演曲线（与 performance_v2 共享，零 Node/Canvas 依赖）
 */
export function bodyPerformance(plan, t) {
  const amount = plan.idleMotion ?? 0.4;
  const seed = Number.isFinite(plan.seed) ? plan.seed : 0;
  const phase = (t * TAU) / 3.2 + seed;

  let dy = Math.sin(phase) * 2.1 * amount;
  let dx = 0;
  let lean = 0;
  let squash = -Math.sin(phase) * 0.015 * amount;
  const scale = 1 + Math.sin(phase) * 0.008 * amount;
  let lift = Math.max(0, -dy) * 0.02;
  let pose;

  if (plan.move && plan.move !== 'idle' && plan.move !== 'breathe') {
    const mv = evaluateMoveStyle(plan.move, t, seed);
    dx += mv.dx;
    dy += mv.dy;
    lean += mv.lean;
    squash += mv.squash;
    lift = Math.max(lift, mv.lift || 0);
  }

  if (plan.poseTransition) {
    let previous = plan.pose;
    for (const p of plan.poses || []) {
      const age = t - p.at;
      if (age < 0) break;
      if (age < plan.poseTransition) {
        const q = ease(age / plan.poseTransition);
        pose = q < 0.5 ? previous : p.pose;
        dy += Math.sin(Math.PI * q) * 3.4;
        lean += Math.sin(Math.PI * q) * 0.022;
        squash += Math.sin(Math.PI * q) * -0.03;
        break;
      }
      previous = p.pose;
    }
  }

  for (const e of plan.bodyEvents || []) {
    const q = (t - e.at) / e.duration;
    if (q < 0 || q >= 1) continue;
    const pulse = e.style === 'anticipation'
      ? anticipationEnvelope(q, { mode: 'impulse' })
      : Math.sin(Math.PI * ease(q)) ** 2;
    dy += pulse * (e.dy ?? 1.5);
    dx += pulse * (e.dx ?? 0);
    lean += pulse * (e.lean ?? 0);
    squash += pulse * (e.squash ?? 0);
    if ((e.dy ?? 0) < -6) lift = Math.max(lift, Math.min(0.8, Math.abs(e.dy * pulse) / 90));
  }

  let opacity = 1;
  if (plan.enterAt != null) {
    const q = clamp((t - plan.enterAt) / (plan.enterDuration || 0.45));
    opacity = ease(q);
    dx += (1 - backOut(q, 1.2)) * (plan.enterDx || 0);
  }

  dy = clamp(dy, -160, 100);
  const sx = 1 + squash * 0.45;
  const sy = 1 - squash * 0.55;

  return { dy, dx, lean, scale, sx, sy, squash, lift, pose, opacity };
}

