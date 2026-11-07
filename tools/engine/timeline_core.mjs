// timeline_core.mjs — 纯函数时间轴、节拍网格、关键帧插值、动机转场与反幻灯片节奏审计
// 设计融合：
//   - lintsinghua/paint-mv-skills (core.js + timeline.js): 纯 t 决定论、hash 噪声、B(n)/pulse/seg/kf/mood
//   - Win-Hao/music-mv (transitions.md + video_rhythm.py): 单主运动动机转场、0.5s 窗口动态密度检测
// 零 Math.random()，零跨帧可变状态，同时服务 Remotion (useCurrentFrame) 与 Canvas (render_episode)。

export const TAU = Math.PI * 2;

export const clamp = (v, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, k) => a + (b - a) * k;
export const mix = lerp;
export const seg = (t, t0, t1) => (t1 <= t0 ? (t >= t1 ? 1 : 0) : clamp((t - t0) / (t1 - t0), 0, 1));

// 决定论伪随机与连续一维噪声（任意帧序跳转结果完全一致）
export function hash(seed) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

export function hashSigned(seed) {
  return hash(seed) * 2 - 1;
}

export function noise1d(x, seed = 0) {
  const xi = Math.floor(x);
  const xf = x - xi;
  const u = xf * xf * (3 - 2 * xf);
  return lerp(hashSigned(xi + seed * 57.3), hashSigned(xi + 1 + seed * 57.3), u);
}

export function wob(t, freq = 1.6, amp = 1, seed = 0) {
  return noise1d(t * freq, seed) * amp;
}

// ---------------------------------------------------------------------------
// 动画缓动曲线（含预备动作 → 爆发 → 过冲回弹 → 阻尼落定）
// ---------------------------------------------------------------------------

export function ease(x) {
  const p = clamp(x);
  return p * p * (3 - 2 * p);
}

export function easeIn(x) {
  const p = clamp(x);
  return p * p * p;
}

export function easeOut(x) {
  const p = clamp(x);
  return 1 - Math.pow(1 - p, 3);
}

export function backOut(x, overshoot = 1.70158) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const p = clamp(x) - 1;
  return 1 + (overshoot + 1) * p * p * p + overshoot * p * p;
}

export function elasticOut(x, amplitude = 1, period = 0.34) {
  const p = clamp(x);
  if (p === 0 || p === 1) return p;
  const s = (period / TAU) * Math.asin(1 / Math.max(1, amplitude));
  return amplitude * Math.pow(2, -10 * p) * Math.sin(((p - s) * TAU) / period) + 1;
}

export function springDamper(x, freq = 9.5, decay = 5.2) {
  const p = clamp(x);
  if (p <= 0) return 0;
  return 1 - Math.exp(-decay * p) * Math.cos(freq * p);
}

/**
 * 经典动画三段式包络：预备反向蓄力 (0..prepRatio) -> 主动作过冲 (prepRatio..0.78) -> 回弹落定 (0.78..1)
 * 返回值从 0 -> -anticipation -> 1+overshoot -> 1（mode='hold'）或回到 0（mode='impulse'）
 */
export function anticipationEnvelope(u, { prepRatio = 0.2, anticipation = 0.22, overshoot = 0.18, mode = 'impulse' } = {}) {
  const p = clamp(u);
  if (p <= 0) return 0;
  if (p < prepRatio) {
    const q = p / prepRatio;
    return -anticipation * Math.sin(Math.PI * q);
  }
  const rest = (p - prepRatio) / (1 - prepRatio);
  if (mode === 'hold') {
    if (p >= 1) return 1;
    return backOut(rest, 1.4 + overshoot * 4);
  }
  if (p >= 1) return 0;
  // impulse: 爆发冲顶 -> 阻尼回落至 0
  if (rest < 0.36) {
    return (1 + overshoot) * easeOut(rest / 0.36);
  }
  const tail = (rest - 0.36) / 0.64;
  return (1 + overshoot) * Math.pow(1 - tail, 1.8) * Math.cos(tail * Math.PI * 0.5);
}

export const EASE_MAP = Object.freeze({
  linear: (x) => clamp(x),
  ease,
  smooth: ease,
  easeIn,
  easeOut,
  backOut: (x) => backOut(x),
  elasticOut: (x) => elasticOut(x),
  spring: (x) => springDamper(x),
});

function resolveEaseFn(fnOrName) {
  if (typeof fnOrName === 'function') return fnOrName;
  if (typeof fnOrName === 'string' && EASE_MAP[fnOrName]) return EASE_MAP[fnOrName];
  return ease;
}

function interpolateValue(a, b, k) {
  if (typeof a === 'number' && typeof b === 'number') return lerp(a, b, k);
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.map((av, idx) => interpolateValue(av, b[idx] ?? av, k));
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const out = { ...a };
    for (const key of Object.keys(b)) {
      out[key] = key in a ? interpolateValue(a[key], b[key], k) : (k >= 0.5 ? b[key] : a[key]);
    }
    return out;
  }
  return k < 0.5 ? a : b;
}

/**
 * 多关键帧连续插值器（参考 paint-mv-skills kf）：
 * keys: [[t0, val0, ease?], [t1, val1, ease?], ...]
 * 杜绝 `t < x ? A : B` 一帧硬跳。
 */
export function kf(a, b) {
  const [t, keys] = Array.isArray(a) ? [b, a] : [a, b];
  if (!Array.isArray(keys) || keys.length === 0) return null;
  if (keys.length === 1 || t <= keys[0][0]) return structuredClone(keys[0][1]);
  const last = keys[keys.length - 1];
  if (t >= last[0]) return structuredClone(last[1]);
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, v0] = keys[i];
    const [t1, v1, easeSpec] = keys[i + 1];
    if (t >= t0 && t <= t1) {
      const fn = resolveEaseFn(easeSpec);
      const k = t1 <= t0 ? 1 : fn(seg(t, t0, t1));
      return interpolateValue(v0, v1, k);
    }
  }
  return structuredClone(last[1]);
}

/**
 * 连续表情与情绪过渡（参考 paint-mv-skills characters.js mood()）：
 * 切换瞬间先微闭眼压扁再回弹弹出新情绪，不产生硬切贴纸感。
 * moodKeys: [[t0, eye, emote?, mouth?], ...]
 */
export function resolveMood(a, b = [], transitionDur = 0.22) {
  const [t, moodKeys] = Array.isArray(a) ? [b, a] : [a, b];
  if (!Array.isArray(moodKeys) || moodKeys.length === 0) {
    return { eye: 'open', emote: null, mouth: 'smile', squash: 0, transition: 0, transitioning: false };
  }
  let current = moodKeys[0];
  let switchAge = Infinity;
  for (let i = 1; i < moodKeys.length; i++) {
    if (t >= moodKeys[i][0]) {
      current = moodKeys[i];
      switchAge = t - moodKeys[i][0];
    } else {
      break;
    }
  }
  const [, eye = 'open', emote = null, mouth = 'smile'] = current;
  if (switchAge >= 0 && switchAge < transitionDur) {
    const q = switchAge / transitionDur;
    const pop = q < 0.38
      ? -0.055 * Math.sin((q / 0.38) * Math.PI * 0.5)
      : 0.045 * Math.sin(((q - 0.38) / 0.62) * Math.PI) * (1 - q);
    return {
      eye: q < 0.32 ? 'soft_blink' : eye,
      emote,
      mouth,
      squash: pop,
      transition: Math.sin(q * Math.PI),
      transitioning: true,
    };
  }
  return { eye, emote, mouth, squash: 0, transition: 0, transitioning: false };
}

// ---------------------------------------------------------------------------
// 节拍与音乐时间轴网格（BPM / 小节 / 拍点脉冲 / 词点对齐）
// ---------------------------------------------------------------------------

export function createBeatGrid({ bpm = 120, offset = 0, beatsPerBar = 4 } = {}) {
  const safeBpm = Number.isFinite(bpm) && bpm > 0 ? bpm : 120;
  const beatSec = 60 / safeBpm;
  const barSec = beatSec * beatsPerBar;
  const B = (n) => offset + n * beatSec;
  const bar = (n) => offset + n * barSec;
  const beatFloat = (t) => (t - offset) / beatSec;
  const beatIndex = (t) => Math.floor(beatFloat(t));
  const beatPhase = (t, sub = 1) => {
    const raw = (beatFloat(t) * sub) % 1;
    return raw < 0 ? raw + 1 : raw;
  };
  const pulse = (t, sharp = 3.2, sub = 1) => {
    const ph = beatPhase(t, sub);
    return Math.pow(Math.max(0, 1 - ph), sharp);
  };
  const bounce = (t, sub = 1) => Math.abs(Math.sin(beatPhase(t, sub) * Math.PI));
  const nearestBeat = (t) => offset + Math.round(beatFloat(t)) * beatSec;
  return Object.freeze({ bpm: safeBpm, offset, beatsPerBar, beatSec, barSec, B, beatTime: B, bar, beatFloat, beatIndex, beatPhase, pulse, bounce, nearestBeat });
}

/**
 * 解析任意事件时间锚点：支持 { at } | { beat } | { line, char, delay }
 */
export function resolveAnchorTime(ref, { cues = [], beatGrid = null, fallback = 0 } = {}) {
  if (typeof ref === 'number' && Number.isFinite(ref)) return ref;
  if (!ref || typeof ref !== 'object') return fallback;
  const delay = Number.isFinite(ref.delay) ? ref.delay : 0;
  if (Number.isFinite(ref.at)) return ref.at + delay;
  if (Number.isFinite(ref.beat) && beatGrid) return beatGrid.B(ref.beat) + delay;
  if (Number.isInteger(ref.line) && cues[ref.line - 1]) {
    const cue = cues[ref.line - 1];
    if (ref.char && Array.isArray(cue.chars_timed)) {
      const hit = cue.chars_timed.find((c) => c.ch === ref.char);
      if (hit && Number.isFinite(hit.start)) return hit.start + delay;
    }
    return (cue.start ?? fallback) + delay;
  }
  return fallback;
}

// ---------------------------------------------------------------------------
// 动机转场求解器（融合 music-mv transitions.md 三种自然转场 + paint-mv-skills wipes）
// ---------------------------------------------------------------------------

export const TRANSITION_TYPES = Object.freeze([
  'none',
  'cut',
  'fade',
  'slide',
  'pan_through',   // 顺着天空/走廊/门窗一镜摇过去
  'pan_left',      // 向左横摇转场
  'pan_right',     // 向右横摇转场
  'whip_left',     // 卡拍急速甩镜（左）
  'whip_right',    // 卡拍急速甩镜（右）
  'iris',          // 绕焦点（角色/道具/窗户）圆形收放转场
  'wipe',          // 前景遮挡物/幕布擦除转场
  'door_wipe',     // 门框/隔板推拉擦除转场
  'collage_card',  // 拼贴卡纸错落入场转场
]);

export function resolveTransitionState(shot, rawTime) {
  const tr = shot?.transitions || shot?.transition;
  if (!tr || tr.type === 'none' || tr.type === 'cut') {
    return { active: false, type: tr?.type || 'none', progress: 1 };
  }
  const duration = Number.isFinite(tr.duration) && tr.duration > 0 ? tr.duration : 0.38;
  const age = rawTime - (shot?.start ?? 0);
  if (age < 0 || age >= duration) {
    return { active: false, type: tr.type, progress: age < 0 ? 0 : 1 };
  }
  const u = clamp(age / duration);
  const q = ease(u);
  const focus = Array.isArray(tr.focus) ? tr.focus : [640, 360];
  return {
    active: true,
    type: tr.type,
    rawProgress: u,
    progress: q,
    overshootProgress: backOut(u, 1.35),
    focus,
    direction: tr.direction || (tr.type === 'whip_right' ? 1 : -1),
    streakAlpha: tr.type.startsWith('whip') ? Math.sin(Math.PI * u) * 0.65 : 0,
    irisRadius: tr.type === 'iris' ? easeOut(u) * 920 : null,
  };
}

// ---------------------------------------------------------------------------
// 反幻灯片动态审计（对标 Win-Hao/music-mv/scripts/video_rhythm.py）
// 检查任意 >=1.0s 区间是否存在人物与环境完全停摆的「PPT 静态帧」。
// ---------------------------------------------------------------------------

function flattenNumericVector(state, out = []) {
  if (typeof state === 'number' && Number.isFinite(state)) {
    out.push(state);
  } else if (Array.isArray(state)) {
    for (const item of state) flattenNumericVector(item, out);
  } else if (state && typeof state === 'object') {
    for (const key of Object.keys(state).sort()) {
      flattenNumericVector(state[key], out);
    }
  }
  return out;
}

export function auditTimelineActivity(sampleFn, {
  duration,
  fps = 12,
  windowSec = 0.5,
  minActiveDelta = 0.08,
  maxStaticSpanSec = 1.0,
} = {}) {
  const step = 1 / fps;
  const samples = [];
  for (let t = 0; t <= duration + 1e-9; t += step) {
    samples.push({ t, vec: flattenNumericVector(sampleFn(Math.min(t, duration))) });
  }
  const frameDiffs = [];
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1].vec;
    const b = samples[i].vec;
    const len = Math.min(a.length, b.length);
    let sum = 0;
    for (let j = 0; j < len; j++) sum += Math.abs(b[j] - a[j]);
    frameDiffs.push({ t: samples[i].t, delta: sum });
  }

  const windows = [];
  const winFrames = Math.max(1, Math.round(windowSec * fps));
  for (let i = 0; i < frameDiffs.length; i += winFrames) {
    const slice = frameDiffs.slice(i, i + winFrames);
    if (!slice.length) continue;
    const sorted = slice.map((s) => s.delta).sort((x, y) => x - y);
    const median = sorted[Math.floor(sorted.length / 2)];
    windows.push({
      start: Number((slice[0].t - step).toFixed(3)),
      end: Number(slice[slice.length - 1].t.toFixed(3)),
      medianDelta: Number(median.toFixed(5)),
      isStatic: median < minActiveDelta,
    });
  }

  // 聚合连续静态窗口
  const staticStretches = [];
  let cur = null;
  for (const w of windows) {
    if (w.isStatic) {
      cur = cur ? { start: cur.start, end: w.end } : { start: w.start, end: w.end };
    } else if (cur) {
      if (cur.end - cur.start >= maxStaticSpanSec - 1e-6) staticStretches.push(cur);
      cur = null;
    }
  }
  if (cur && cur.end - cur.start >= maxStaticSpanSec - 1e-6) staticStretches.push(cur);

  return {
    duration,
    fps,
    windowCount: windows.length,
    windows,
    staticStretches,
    passed: staticStretches.length === 0,
  };
}

/**
 * 纯函数语义道具状态求解器（供 Remotion JSX 与 Canvas 共享，零 Node/Canvas 依赖）
 */
export function semanticStateAt(track, time) {
  if (time < track.from || time >= track.to) return null;
  let state = { ...(track.state || {}) };
  let x = track.x;
  let y = track.y;
  for (const s of track.states || []) if (time >= s.at) state = { ...state, ...s.state };
  for (const move of track.moves || []) {
    if (time < move.at) break;
    const p = ease((time - move.at) / move.duration);
    x = lerp(x, move.x, p);
    y = lerp(y, move.y ?? y, p);
  }
  let scaleX = 1;
  let scale = 1;
  let opacity = 1;
  if (track.enter) {
    const q = clamp((time - track.from) / (track.enter.duration || 0.45));
    const e = 1 - (1 - q) ** 3;
    x += (track.enter.dx || 0) * (1 - e);
    y += (track.enter.dy || 0) * (1 - e);
    opacity = Math.min(1, q * 3);
    if (track.enter.overshoot) scale = 1 + 0.035 * Math.sin(Math.PI * q) * Math.sin(2 * Math.PI * q);
  }
  for (const move of track.moves || []) {
    const age = time - move.at - move.duration;
    if (age >= 0 && age < 0.12) y -= Math.sin((Math.PI * age) / 0.12) * 1.5;
  }
  for (const em of track.emphasis || []) {
    const age = time - em.at;
    if (age >= 0 && age < em.duration) scale *= 1 + 0.035 * Math.sin((Math.PI * age) / em.duration);
  }
  for (const flip of track.flips || []) {
    const age = time - flip.at;
    if (age >= 0 && age < flip.duration) scaleX = Math.max(0.045, Math.abs(Math.cos((Math.PI * age) / flip.duration)));
  }
  return {
    id: track.id,
    kind: track.kind,
    x,
    y,
    w: track.w,
    h: track.h,
    state,
    scaleX,
    scale,
    opacity,
    marks: (track.marks || [])
      .filter((m) => time >= m.at)
      .map((m) => ({ ...m, progress: ease((time - m.at) / (m.duration || 0.16)) })),
  };
}

