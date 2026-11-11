// opener_director.mjs — 黄金前 3 秒留存导演模块（通用引擎核心）
// 三拍相机函数仅保留给历史显式调用；通用renderer现走camera_plan默认固定机位。
// 本模块仍提供双人反差 + 顶部钩子横幅
// + 双色追光 + 前景印章。不依赖人工逐集手写，写错在校验期直接抛错。
import { W, H, clamp01, mix, smooth, easeOutBack, seg, drawText, drawOutlinedText, CORE } from './room_base.mjs';

const { paint, rrPts, ellPts, glow } = CORE;

export const OPENER_END = 3.2;      // 导演接管至 min(shot0.end, 3.20s)
export const BANNER_END = 2.8;      // 顶部横幅收起时刻
export const TITLE_LEN = 0;         // 无独立片头卡：第 0 帧直接正片
export const PLATES_DEFAULT_AT = 0.85; // 身份铭牌默认入场，避开第 0 帧横幅

const KEYS = [
  { t: 0.0, z: 1.42, cx: 640, cy: 372 },
  { t: 0.7, z: 1.30, cx: 640, cy: 366 },
  { t: 1.6, z: 1.15, cx: 640, cy: 360 },
  { t: 3.2, z: 1.21, cx: 640, cy: 362 },
];

/** 历史独立三拍相机（非renderer默认）：近景起幅 -> 急拉落关系 -> 叙事微推。stampTime 触发单次 <=5px 阻尼微震。 */
export function openerCamera(t, { stampTime = null, end = OPENER_END } = {}) {
  const keys = KEYS.map((k) => (k.t === 3.2 ? { ...k, t: Math.max(1.7, end) } : k));
  let a = keys[0]; let b = keys[keys.length - 1];
  for (let i = 0; i < keys.length - 1; i++) {
    if (t >= keys[i].t && t <= keys[i + 1].t) { a = keys[i]; b = keys[i + 1]; break; }
  }
  if (t >= b.t) { a = b; }
  const p = a === b ? 1 : smooth((t - a.t) / (b.t - a.t));
  let shakeX = 0; let shakeY = 0;
  if (stampTime != null) {
    const age = t - stampTime;
    if (age >= 0 && age < 0.28) {
      const d = Math.exp(-age * 14) * 5;
      shakeY = Math.sin(age * 55) * d;
      shakeX = Math.cos(age * 47) * d * 0.5;
    }
  }
  return { z: mix(a.z, b.z, p), cx: mix(a.cx, b.cx, p) + shakeX, cy: mix(a.cy, b.cy, p) + shakeY, shake: Math.hypot(shakeX, shakeY) };
}

/** 横幅状态机：0-2.5s 全显，2.5-2.8s 收起，之后不可见。 */
export function openerBannerState(t) {
  if (t < 0 || t >= BANNER_END) return { visible: false, alpha: 0, scale: 0 };
  const inP = easeOutBack((t + 0.08) / 0.3);
  const outP = t > 2.5 ? 1 - (t - 2.5) / 0.3 : 1;
  return { visible: true, alpha: Math.min(1, Math.max(0, inP)) * outP, scale: (0.7 + 0.3 * Math.min(1, inP)) * (0.85 + 0.15 * outP) };
}

/** 印章状态：词点前不可见，词点起 backOut 砸落（2.1 -> 1.0）。 */
export function stampState(t, stampTime) {
  if (stampTime == null || t < stampTime) return { visible: false, scale: 0, alpha: 0 };
  const p = clamp01((t - stampTime) / 0.32);
  return { visible: true, scale: 2.1 - 1.1 * easeOutBack(p), alpha: Math.min(1, p * 3) };
}

const CONFLICT_POSES = new Set(['shock', 'point', 'playful_fists', 'confident_hips', 'eat', 'fatfish_working', 'think']);

/**
 * 第 0 帧双人反差硬校验。actors: [{pose, poseChanges?:[{at, pose}]}]
 * 规则：双人同场时 0-2s 内不得同姿、不得双双静立；0.65-1.10s 内须有一次姿态变化
 * （poseChanges 中声明，或由分镜 poses 时间线提供）。
 */
const ACTIVE_LOCOMOTIONS = new Set(['walk', 'side_walk', 'happy_walk', 'sad_walk', 'push_walk']);

export function validateOpenerActors(actors, { requireChange = true } = {}) {
  if (!Array.isArray(actors) || actors.length < 1) throw new Error('开场至少需要一名角色');
  if (actors.length >= 2) {
    const [a, b] = actors;
    const usesAtlasA = Boolean(a.locomotion || a.atlas);
    const usesAtlasB = Boolean(b.locomotion || b.atlas);
    if (usesAtlasA || usesAtlasB) {
      const idA = a.pose || a.atlas || `${a.assetId || 'whale'}:${a.locomotion || 'idle'}`;
      const idB = b.pose || b.atlas || `${b.assetId || 'whale'}:${b.locomotion || 'idle'}`;
      if (idA === idB) throw new Error(`开场双人同姿罚站被拒：两人同为 ${idA}`);
      const hasActive = CONFLICT_POSES.has(a.pose)
        || CONFLICT_POSES.has(b.pose)
        || ACTIVE_LOCOMOTIONS.has(a.locomotion)
        || ACTIVE_LOCOMOTIONS.has(b.locomotion)
        || Boolean(a.atlas?.endsWith('_2leg') || b.atlas?.endsWith('_2leg'));
      if (!hasActive) {
        throw new Error(`开场缺少冲突或步态动作：${idA} / ${idB}`);
      }
    } else {
      if (a.pose === b.pose) throw new Error(`开场双人同姿罚站被拒：两人同为 ${a.pose}`);
      if (a.pose === 'idle' && b.pose === 'idle') throw new Error('开场双人同时静立被拒：禁止双 idle 罚站');
      if (!CONFLICT_POSES.has(a.pose) && !CONFLICT_POSES.has(b.pose)) {
        throw new Error(`开场缺少冲突姿态：${a.pose} / ${b.pose}，至少一人须处于冲突/动作态`);
      }
    }
  }
  if (requireChange) {
    const hasChange = actors.some((a) => (a.poseChanges || []).some((c) => c.at >= 0.65 && c.at <= 1.10) || (a.poses || []).some((c) => c.at >= 0.65 && c.at <= 1.10));
    const hasTimed = actors.some((a) => (a.poseChanges || []).length || (a.poses || []).length);
    if (hasTimed && !hasChange) throw new Error('开场姿态变化必须落在 0.65s-1.10s 内，禁止拖到 2s 后才动');
  }
  return true;
}

/** 舞台双色追光：暖金主光 + 青白副光（静态束形，仅极慢摆动，无频闪）。 */
export function drawOpenerSpotlights(ctx, t, focusX = 640) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const sway = Math.sin(t * 0.6) * 8;
  const beams = [
    { x: focusX - 150 + sway, col: 'rgba(255,205,110,0.20)', w: 300 },
    { x: focusX + 170 - sway, col: 'rgba(140,225,255,0.14)', w: 260 },
  ];
  for (const b of beams) {
    const grad = ctx.createLinearGradient(0, 60, 0, 620);
    grad.addColorStop(0, b.col);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(b.x - 26, 58);
    ctx.lineTo(b.x + 26, 58);
    ctx.lineTo(b.x + b.w / 2, 620);
    ctx.lineTo(b.x - b.w / 2, 620);
    ctx.closePath();
    ctx.fill();
    glow(ctx, b.x, 470, 190, b.col, 0.16);
  }
  ctx.restore();
}

/** 角色头顶场景身份铭牌（屏幕/场景空间，绝不贴到头发或衣服上）。 */
export function drawRolePlates(ctx, plates, t, enterAt = 0.85) {
  // plates: [{text, x, y, dir, enterAt?}] x/y 为头顶锚点；铭牌浮在头部外侧（dir -1 左 / +1 右）。
  // 默认 0.85s 后才入场，避免与第 0 帧横幅、主道具挤在同一屏。
  for (const p of plates) {
    const pop = easeOutBack((t - (p.enterAt ?? enterAt)) / 0.28);
    if (pop <= 0) continue;
    ctx.save();
    ctx.translate(p.x + (p.dir || 0) * 150, p.y + 58);
    ctx.scale(0.7 + 0.3 * Math.min(1, pop), 0.7 + 0.3 * Math.min(1, pop));
    ctx.globalAlpha = Math.min(1, pop);
    ctx.font = '800 19px NotoSansSC';
    const w = Math.max(120, ctx.measureText(p.text).width + 34);
    paint(ctx, rrPts(-w / 2, -19, w, 38, 11, 0), { wash: '#FFFBEB', fill: '#FFF7D6', fillOp: 245, ink: '#DC2626', sw: 2.2 });
    drawText(ctx, p.text, 0, 1, 19, '#7F1D1D');
    ctx.restore();
  }
}

/** 顶部路人钩子横幅（仅 0-2.8s，正片第 0 帧之上，无独立片头）。 */
export function drawOpenerHookBanner(ctx, t, hook = {}) {
  const st = openerBannerState(t);
  if(hook.enterDuration&&t<hook.enterDuration){const q=Math.max(0,t/hook.enterDuration);st.scale=.88+.12*easeOutBack(q);st.alpha=.65+.35*q;}
  if (!st.visible) return false;
  const prefix = hook.headlinePrefix || '';
  const highlight = hook.headlineHighlight || '';
  if (!prefix && !highlight) return false;
  ctx.save();
  ctx.translate(W / 2, 78);
  ctx.scale(st.scale, st.scale);
  ctx.globalAlpha = st.alpha;
  if (hook.layout === 'two_line') {
    // Flat high-contrast hook, not a spotlight: two readable lines above names/faces.
    paint(ctx, rrPts(-390, -66, 780, 128, 16, 0), { wash: '#FFFBEB', fill: '#FFFBEB', fillOp: 250, ink: '#DC2626', sw: 3.5 });
    drawText(ctx, prefix.replace(/[，,]$/, ''), 0, -29, 40, '#1F2937');
    drawText(ctx, highlight, 0, 27, 52, '#DC2626');
    ctx.restore();return true;
  }
  let size = 40;
  ctx.font = `800 ${size}px NotoSansSC`;
  const full = prefix + highlight;
  while (size > 26 && ctx.measureText(full).width > 760) { size -= 2; ctx.font = `800 ${size}px NotoSansSC`; }
  const w = Math.min(820, Math.max(420, ctx.measureText(full).width + 56));
  paint(ctx, rrPts(-w / 2, -42, w, 84, 16, 0), { wash: '#FFFBEB', fill: '#FFFBEB', fillOp: 250, ink: '#DC2626', sw: 3.5 });
  const pw = ctx.measureText(prefix).width;
  const total = ctx.measureText(full).width;
  ctx.font = `800 ${size}px NotoSansSC`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#1F2937';
  ctx.fillText(prefix, -total / 2, 2);
  ctx.fillStyle = '#DC2626';
  ctx.fillText(highlight, -total / 2 + pw, 2);
  if (hook.badge) {
    ctx.font = '800 17px NotoSansSC';
    const bw = ctx.measureText(hook.badge).width + 24;
    paint(ctx, rrPts(-bw / 2, -68, bw, 30, 9, 0), { wash: '#DC2626', fill: '#DC2626', fillOp: 245, ink: '#7F1D1D', sw: 1.5 });
    drawText(ctx, hook.badge, 0, -52, 17, '#FFFFFF');
  }
  ctx.restore();
  return true;
}

/** 高对比落章印章（朱砂红底白字，前景层调用，下沿由调用方保证 <=600）。 */
export function drawStamp(ctx, t, stampTime, text, x = 640, y = 520) {
  const st = stampState(t, stampTime);
  if (!st.visible || !text) return false;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.08);
  ctx.scale(st.scale, st.scale);
  ctx.globalAlpha = st.alpha;
  ctx.font = '800 34px NotoSansSC';
  const w = Math.max(150, ctx.measureText(text).width + 44);
  paint(ctx, rrPts(-w / 2, -34, w, 68, 12, 0), { wash: '#DC2626', fill: '#DC2626', fillOp: 242, ink: '#7F1D1D', sw: 3 });
  drawText(ctx, text, 0, 2, 34, '#FFFFFF');
  ctx.restore();
  return true;
}

export { W, H };
