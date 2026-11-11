/**
 * actors.mjs — Current-project 7-character cast & articulated pixel-rig engine for v3.
 * - Protagonist: Whale Girl (original 104x102 pixel rig + canonical open-eye wave head cache across
 *   all 5 views, squint=0.01, tailScale=1.0, distance-driven leg stride, knee-bend, arm arc, and
 *   calibrated front/heart original-hand-pixel prop holding).
 * - Co-Star & Guests: Doubao, Claude, Gemini, Qwen, GPT, Kimi (transparent alpha cutouts, original
 *   RGB preserved, sole-anchored via alpha > 127 scan, zero facial warping or lip-sync).
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { drawExtrudedPiece } from './jigsaw.mjs';

const require = createRequire(import.meta.url);
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export const { createCanvas, loadImage, GlobalFonts } = require('../../engine/node_modules/@napi-rs/canvas');

const fontThin = path.join(ROOT, 'tools/mv_extra/cache/font.ttf');
const fontBold = path.join(ROOT, 'tools/mv_extra/cache/NotoSansSC-Bold.ttf');
const fontPlay = path.join(ROOT, 'tools/mv_extra/cache/ZCOOLKuaiLe-Regular.ttf');
if (!GlobalFonts.registerFromPath(fontThin, 'MvCJK')) {
  throw new Error('Missing font.ttf — run `.venv/bin/python tools/mv_extra/v3/setup_v3.py` first');
}
if (!GlobalFonts.registerFromPath(fontBold, 'MvBold')) {
  throw new Error('Missing NotoSansSC-Bold.ttf — run `.venv/bin/python tools/mv_extra/v3/setup_v3.py` first');
}
GlobalFonts.registerFromPath(fontPlay, 'MvPlay');

globalThis.window = globalThis;
require('../../../video-fx/src/whale_girl_rig_data.js');
const R = globalThis.WHALE_GIRL_PIXEL_RIG;
const W = require('../../../video-fx/src/whale_girl.js');

// Pre-render 4x supersampled open-eye canonical heads across all 5 turnaround views (Rule 11 compliant)
const HEADS = {};
for (const view of ['front', 'q', 'side', 'qback', 'back']) {
  const cv = createCanvas(960, 960);
  const g = cv.getContext('2d');
  g.setTransform(4, 0, 0, 4, 0, 0);
  g.save();
  g.beginPath();
  g.rect(0, 0, 240, 174);
  g.clip();
  W.whaleGirl(g, 120, 220, 10, {
    t: 0.7,
    style: 'pixel',
    view,
    poseMode: 'wave',
    eyes: 'open',
    mouth: 'smile',
    squint: 0.01,
    tailScale: 1.0,
    transitionBlend: 1,
    walk: 0,
    dy: 0,
    emotion: 'idle',
    noShadow: true,
  });
  g.restore();
  HEADS[view] = cv;
}

export const GUEST_NAMES = ['doubao', 'claude', 'gemini', 'qwen', 'gpt', 'kimi'];
export const images = {};
for (const n of ['gemini', 'qwen', 'gpt', 'kimi']) {
  images[n] = await loadImage(path.join(ROOT, `assets/ai-girls/extra-guests/cutouts/${n}.png`));
}
images.claude = await loadImage(path.join(ROOT, 'assets/ai-girls/extra-guests/claude.png'));
images.doubao = await loadImage(path.join(ROOT, 'assets/ai-girls/doubao/doubao-cutout.png'));

const clamp = (x) => Math.max(0, Math.min(1, x));
const ease = (x) => {
  const k = clamp(x);
  return k * k * (3 - 2 * k);
};
const mix = (a, b, k) => a + (b - a) * k;

function drawGroundShadow(c, x, y, rx = 56, alpha = 0.28) {
  c.fillStyle = `rgba(9, 18, 30, ${alpha})`;
  c.beginPath();
  c.ellipse(x, y + 3.5, Math.max(1, rx), Math.max(1, rx * 0.15), 0, 0, Math.PI * 2);
  c.fill();
}

function drawRuns(c, runs) {
  if (!runs) return;
  for (const [y, x, x2, k] of runs) {
    c.fillStyle = R.palette[k];
    c.fillRect(x - 0.5, y - 0.5, x2 - x + 1.04, 1.04);
  }
}

function pivot(c, x, y, angle, fn) {
  c.save();
  c.translate(x, y);
  if (angle) c.rotate(angle);
  c.translate(-x, -y);
  fn();
  c.restore();
}

export function travelMotion(t, { start = 0, end = 1, x0 = 0, x1 = 0, steps = 3 } = {}) {
  const k = clamp((t - start) / Math.max(1e-6, end - start));
  const q = ease(k);
  return {
    x: mix(x0, x1, q),
    phase: q * Math.PI * 2 * steps,
    stride: Math.sin(Math.PI * k),
    moving: t > start && t < end,
    progress: q,
  };
}

function drawCalibratedHandPixels(c, torso) {
  // Original front/heart hand pixels in y = -40..-34, palette indices 10, 16, 30
  drawRuns(
    c,
    torso.filter((r) => r[0] >= -40 && r[0] <= -34 && [10, 16, 30].includes(r[3]))
  );
}

/**
 * Render articulated Whale Girl protagonist.
 * Note: `hips` uses `R.poses.wink` torso/legs paired with `HEADS[view]` open-eye wave head (Rule 11).
 */
export function whale(
  c,
  {
    x = 500,
    y = 610,
    u = 34,
    pose = 'wave',
    view = 'front',
    phase = 0,
    stride = 0,
    kneel = 0,
    lean = 0,
    jump = 0,
    arm = 0,
    headTilt = 0,
    breath = 0,
    alpha = 1,
    flipX = false,
    noShadow = false,
    heldPiece = false,
    heldLantern = false,
    heldRibbon = null, // { t, length, color }
  } = {}
) {
  if (!noShadow) {
    drawGroundShadow(c, x, y, 2.05 * u, 0.28 * alpha * (1 - clamp(jump / 320)));
  }

  c.save();
  c.globalAlpha *= alpha;
  c.translate(x, y + kneel * u * 0.54 - jump + breath * 1.4);
  if (lean) c.rotate(lean);
  c.scale((flipX ? -1 : 1) * (u / 10), u / 10);

  const rigPoseKey = pose === 'hips' ? 'wink' : pose;
  const p = R.poses[rigPoseKey] || R.poses.wave;
  const v = view !== 'front' ? R.views[view] : null;
  const b = v || p;
  const torso = b.torso;

  pivot(c, -10, -18, Math.sin(phase) * 0.05 * stride + Math.sin(breath * Math.PI) * 0.018, () =>
    drawRuns(c, b.tail)
  );
  drawRuns(c, b.backHair);

  for (const [id, px, sign] of [
    ['legR', 11, -1],
    ['legL', -7, 1],
  ]) {
    const legAngle = Math.sin(phase) * stride * 0.42 * sign + kneel * 0.36 * sign;
    c.save();
    c.translate(0, -Math.max(0, Math.cos(phase) * sign) * stride * 2.1);
    pivot(c, px, -20, legAngle, () => drawRuns(c, b[id] || []));
    c.restore();
  }

  drawRuns(c, torso);

  // Calibrated front/heart prop grips — original hand pixels overlap in front of the prop
  if (pose === 'heart' && !v) {
    if (heldPiece) {
      drawExtrudedPiece(
        c,
        -5.0,
        -42.5,
        10.8,
        10.8,
        { top: 1, right: 1, bottom: 0, left: -1 },
        { fill: '#e5be6d', side: '#b58d42', stroke: '#fff0c4', depth: 1.8, shadow: null }
      );
      drawCalibratedHandPixels(c, torso);
    } else if (heldLantern) {
      c.save();
      const lg = c.createRadialGradient(0.3, -37, 0.5, 0.3, -37, 16);
      lg.addColorStop(0, 'rgba(255, 232, 162, 0.85)');
      lg.addColorStop(1, 'rgba(255, 195, 100, 0)');
      c.fillStyle = lg;
      c.fillRect(-16, -53, 33, 33);
      c.fillStyle = '#f8d98b';
      c.beginPath();
      c.roundRect(-3.6, -42.5, 7.6, 9.2, 2);
      c.fill();
      c.fillStyle = '#fff9e6';
      c.fillRect(-2.0, -40.5, 4.4, 5.2);
      c.restore();
      drawCalibratedHandPixels(c, torso);
    } else if (heldRibbon) {
      const rt = heldRibbon.t || 0;
      const len = heldRibbon.length || 48;
      c.save();
      c.beginPath();
      c.moveTo(0.5, -36.8);
      c.bezierCurveTo(
        len * 0.32,
        -40.5 + Math.sin(rt * 3.1) * 4.2,
        len * 0.68,
        -31.0 + Math.cos(rt * 2.7) * 5.0,
        len,
        -36.0 + Math.sin(rt * 3.4 + 1.1) * 5.5
      );
      c.lineTo(len - 2.2, -31.2 + Math.sin(rt * 3.4 + 1.1) * 5.5);
      c.bezierCurveTo(
        len * 0.66,
        -26.2 + Math.cos(rt * 2.7) * 5.0,
        len * 0.3,
        -35.8 + Math.sin(rt * 3.1) * 4.2,
        0.5,
        -33.5
      );
      c.closePath();
      c.fillStyle = heldRibbon.color || '#df6858';
      c.fill();
      c.strokeStyle = '#f9b9a6';
      c.lineWidth = 0.7;
      c.stroke();
      c.restore();
      drawCalibratedHandPixels(c, torso);
    }
  }

  if (b.armR?.length) {
    pivot(c, 15.5, -45.5, arm, () => drawRuns(c, b.armR));
  }

  const headY = rigPoseKey === 'laptop' ? 8 : 0;
  c.save();
  c.translate(0, headY);
  pivot(c, 0, -47, headTilt, () => {
    c.drawImage(HEADS[view] || HEADS.front, -120, -220, 240, 240);
  });
  c.restore();
  c.restore();

  return { x, y, u, pose, view, phase, stride, kneel, lean, jump, arm, headTilt, alpha };
}

const SOLES = new Map();
export function measureSole(name) {
  const im = images[name];
  if (!im) throw new Error(`Unknown guest image: ${name}`);
  if (!SOLES.has(name)) {
    const tmp = createCanvas(im.width, im.height);
    const g = tmp.getContext('2d');
    g.drawImage(im, 0, 0);
    const d = g.getImageData(0, 0, im.width, im.height).data;
    let bottom = im.height - 1;
    scan: for (; bottom >= 0; bottom--) {
      for (let xx = 0; xx < im.width; xx++) {
        if (d[(bottom * im.width + xx) * 4 + 3] > 127) break scan;
      }
    }
    SOLES.set(name, bottom);
  }
  return SOLES.get(name);
}

/**
 * Render sole-anchored transparent guest cutout. Original RGB & facial features are untouched.
 */
export function guest(
  c,
  name,
  { x = 850, y = 610, h = 330, lean = 0, bob = 0, opacity = 1, noShadow = false } = {}
) {
  const im = images[name];
  const bottom = measureSole(name);
  const offset = ((im.height - 1 - bottom) * h) / im.height;
  if (!noShadow) {
    drawGroundShadow(c, x, y, h * 0.14, 0.25 * opacity);
  }
  c.save();
  c.globalAlpha *= opacity;
  c.translate(x, y + bob);
  if (lean) c.rotate(lean);
  c.imageSmoothingEnabled = true;
  const drawW = (h * im.width) / im.height;
  c.drawImage(im, -drawW / 2, -h + offset, drawW, h);
  c.restore();
  return {
    actor: name,
    x,
    y,
    h,
    sourceLastOpaqueRow: bottom,
    imageVerticalOffset: offset,
    visibleFootEdgeY: y,
  };
}

/**
 * Generate a 1920x1080 Character Cast & Articulated Rig Capabilities Sheet.
 */
export function renderCastSheet() {
  const cv = createCanvas(1920, 1080);
  const c = cv.getContext('2d');

  const bg = c.createLinearGradient(0, 0, 0, 1080);
  bg.addColorStop(0, '#182b3d');
  bg.addColorStop(1, '#243e52');
  c.fillStyle = bg;
  c.fillRect(0, 0, 1920, 1080);

  // Title header
  c.font = '700 34px MvBold';
  c.fillStyle = '#f8ecd1';
  c.textAlign = 'center';
  c.fillText('《把回忆拼好给你》番外 MV · 当前项目全阵容形象与主角像素骨架盘点', 960, 56);
  c.font = '600 18px MvCJK';
  c.fillStyle = '#bdd2dc';
  c.fillText(
    '主角：原版 104×102 像素骨架（5 视角 + 合法睁眼头缓存 + 步态/屈膝/抱持校准）｜搭档与客串：6 位原 RGB 透明抠图按真实可见足底对齐地面（无笨鱼立绘、无白底框）',
    960,
    92
  );

  // Upper shelf: 7 cast members standing on interlocking jigsaw plinths
  c.fillStyle = 'rgba(13, 24, 35, 0.45)';
  c.beginPath();
  c.roundRect(48, 122, 1824, 468, 14);
  c.fill();
  c.fillStyle = '#6f8794';
  c.fillRect(90, 502, 1740, 5);

  const castCards = [
    { label: '鲸鱼娘（主角·我）', sub: '原像素骨架 / 5视角', type: 'whale', x: 195 },
    { label: '豆包（对手戏·你）', sub: '全身透明抠图 / 搭档', type: 'doubao', h: 315, x: 450 },
    { label: 'Claude 大小姐', sub: '透明读书 Q 版 (CC BY-NC-SA)', type: 'claude', h: 215, x: 705 },
    { label: 'Gemini', sub: '原 RGB 透明衍生 / 星岛与风筝', type: 'gemini', h: 305, x: 960 },
    { label: 'Qwen 千问', sub: '原 RGB 透明衍生 / 晴坡与拨云', type: 'qwen', h: 310, x: 1215 },
    { label: 'GPT', sub: '原 RGB 透明衍生 / 晴丘收集', type: 'gpt', h: 305, x: 1470 },
    { label: 'Kimi', sub: '原 RGB 透明衍生 / 星夜观海', type: 'kimi', h: 305, x: 1725 },
  ];

  for (const item of castCards) {
    drawExtrudedPiece(
      c,
      item.x - 92,
      488,
      184,
      28,
      { top: 0, right: 1, bottom: 0, left: -1 },
      { fill: '#d8c5a3', side: '#9c8868', stroke: '#f3e6cb', depth: 6 }
    );
    if (item.type === 'whale') {
      whale(c, { x: item.x, y: 496, u: 31, pose: 'wave', view: 'front' });
    } else {
      guest(c, item.type, { x: item.x, y: 496, h: item.h });
    }
    c.font = '700 21px MvBold';
    c.fillStyle = '#fff2d6';
    c.fillText(item.label, item.x, 546);
    c.font = '600 14px MvCJK';
    c.fillStyle = '#9ec0cf';
    c.fillText(item.sub, item.x, 572);
  }

  // Lower shelf: Whale Girl 5 turnaround views + 4 key acted states
  c.fillStyle = 'rgba(13, 24, 35, 0.45)';
  c.beginPath();
  c.roundRect(48, 616, 1824, 418, 14);
  c.fill();
  c.font = '700 22px MvBold';
  c.fillStyle = '#f3dfb9';
  c.fillText('主角鲸鱼娘 · 五向转身视图（front / q / side / qback / back）与本片关键骨骼姿态校准', 960, 654);
  c.fillStyle = '#6f8794';
  c.fillRect(90, 946, 1740, 4);

  const states = [
    { title: 'front 正面', opts: { view: 'front', pose: 'wave' } },
    { title: 'q 四分之三', opts: { view: 'q', pose: 'wave' } },
    { title: 'side 侧面', opts: { view: 'side', pose: 'wave' } },
    { title: 'qback 侧背', opts: { view: 'qback', pose: 'wave' } },
    { title: 'back 背面看海/烟花', opts: { view: 'back', pose: 'wave' } },
    { title: '迈步走行 (stride)', opts: { view: 'front', pose: 'wave', phase: 1.05, stride: 0.92 } },
    { title: '雨棚/星球屈膝 (kneel)', opts: { view: 'front', pose: 'heart', kneel: 0.78, heldLantern: true } },
    { title: '拨云/深海抬臂 (panic体)', opts: { view: 'front', pose: 'panic', arm: -0.35 } },
    { title: '手掌像素抱片/红绸', opts: { view: 'front', pose: 'heart', heldPiece: true } },
  ];

  states.forEach((st, idx) => {
    const sx = 148 + idx * 203;
    whale(c, { x: sx, y: 944, u: 26, ...st.opts });
    c.font = '700 16px MvBold';
    c.fillStyle = '#efe2c4';
    c.fillText(st.title, sx, 984);
  });

  return cv;
}
