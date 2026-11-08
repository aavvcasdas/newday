// Source-image calibrated landmarks projected through EXACTLY the same mesh triangles as the actor.
// Upgraded: preserves calibrated hand/head contact accuracy AND rigid face protection while restoring
// articulated secondary skeletal deformation (hairL, hairR, tail, legL, legR, armL, armR, spine)
// and smooth cross-fade pose transitions so characters move fluidly instead of freezing into statues.

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { POSES } from '../engine/whale_rig/whale_poses.mjs';
import { buildRig, drawRigged, skinMatrices, BONE_ORDER } from '../engine/whale_rig/whale_rig.mjs';

const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../engine/whale_rig');

export const CALIBRATION = {
  idle: { headTop: [425, 12], mouth: [438, 477], handR: [697, 686], handL: [218, 685] },
  point: { headTop: [425, 12], mouth: [438, 477], handR: [710, 387], fingerR: [727, 337], handL: [311, 678] },
  shock: { headTop: [454, 6], mouth: [440, 487], handR: [710, 688], handL: [225, 680] },
  confident_hips: { headTop: [425, 12], mouth: [438, 477], handR: [535, 690], handL: [309, 677] },
  think: { headTop: [425, 12], mouth: [438, 477], handR: [450, 628], handL: [345, 628], pageCenter: [400, 600] },
  eat: { headTop: [425, 12], mouth: [421, 484], handR: [463, 610], handL: [335, 610] },
  playful_fists: { headTop: [425, 12], mouth: [435, 477], handR: [530, 590], handL: [300, 590] },
  fatfish_working: { headTop: [425, 12], mouth: [438, 477], handR: [482, 686], handL: [331, 681], deskFront: [468, 748] },
};

export const VISUAL_POSES = Object.freeze(Object.keys(POSES));

const rigs = new Map();
const cache = new Map();
let makeCanvas;

function applyCalibratedFaceSafeWeights(name, rig) {
  const B = rig.bbox;
  const cx = B.x + B.w * 0.5;
  const faceCy = B.y + B.h * 0.34;
  const faceRx = Math.max(24, B.w * 0.23);
  const faceRy = Math.max(24, B.h * 0.17);

  const rootIdx = BONE_ORDER.indexOf('root');
  const headIdx = BONE_ORDER.indexOf('head');
  const armRIdx = BONE_ORDER.indexOf('armR');
  const armLIdx = BONE_ORDER.indexOf('armL');
  const tailIdx = BONE_ORDER.indexOf('tail');
  const legLIdx = BONE_ORDER.indexOf('legL');
  const legRIdx = BONE_ORDER.indexOf('legR');

  for (let i = 0; i < rig.verts.length; i++) {
    const [x, y] = rig.verts[i];

    // 1. 面部五官椭圆刚性锁定到 head（整体随头轻点/微倾，五官像素绝不相对拉扯变形）
    const faceDist = Math.hypot((x - cx) / faceRx, (y - faceCy) / faceRy);
    if (faceDist < 1.0) {
      rig.weights[i] = [[headIdx, 1]];
      continue;
    }

    // 2. 敲键盘姿势底部自带桌台区域锁定到 root，避免桌子跟腿骨摆动
    if (name === 'fatfish_working' && y > B.y + B.h * 0.72) {
      rig.weights[i] = [[rootIdx, 1]];
      continue;
    }

    // 3. 对已校准手部区域增强显式手臂权重，确保手掌接触点与网格完全同步，同时保留头发/鲸尾/双腿/脊柱自然权重
    if (name === 'point' && x > 570 && y > 285 && y < 600) {
      const w = Math.max(0, Math.min(1, Math.min(1, (x - 570) / 80) * Math.min(1, (600 - y) / 50)));
      if (w > 0.05) rig.weights[i] = [[armRIdx, w], [rootIdx, 1 - w]];
    } else if (name === 'idle' && x > 580 && y > 580 && y < 760) {
      const w = Math.max(0, Math.min(1, Math.max(0, 1 - ((x - 684) / 125) ** 4) * Math.min(1, (y - 580) / 45) * Math.min(1, (760 - y) / 35)));
      if (w > 0.05) rig.weights[i] = [[armRIdx, w], [rootIdx, 1 - w]];
    } else if (name === 'idle' && x < 310 && y > 580 && y < 760) {
      const w = Math.max(0, Math.min(1, Math.min(1, (310 - x) / 85) * Math.min(1, (y - 580) / 45)));
      if (w > 0.05) rig.weights[i] = [[armLIdx, w], [rootIdx, 1 - w]];
    } else if (name === 'playful_fists' && x > 460 && x < 650 && y > 520 && y < 700) {
      const w = Math.max(0, Math.min(1, (700 - y) / 50));
      if (w > 0.05) rig.weights[i] = [[armRIdx, w], [rootIdx, 1 - w]];
    } else if (name === 'shock' && x > 700 && y > 680) {
      const tw = Math.max(0, Math.min(1, Math.min(1, (x - 700) / 100) * Math.min(1, (y - 680) / 100)));
      if (tw > 0.05) rig.weights[i] = [[tailIdx, tw], [rootIdx, 1 - tw]];
    }

    if (name !== 'fatfish_working' && y > B.y + B.h * 0.87 && x > B.x + B.w * 0.22 && x < B.x + B.w * 0.78) {
      const lw = Math.max(0, Math.min(1, (y - (B.y + B.h * 0.87)) / Math.max(12, B.h * 0.06)));
      const leg = x < cx ? legLIdx : legRIdx;
      rig.weights[i] = [[leg, lw], [rootIdx, 1 - lw]];
    }
  }
}

export async function loadContactActors({ createCanvas, loadImage, poses = Object.keys(CALIBRATION) }) {
  makeCanvas = createCanvas;
  for (const name of new Set(poses)) {
    if (!POSES[name]) throw Error('Unknown visual pose ' + name);
    if (rigs.has(name)) continue;
    const file = path.join(DIR, POSES[name].file);
    let image;
    try {
      image = await loadImage(file);
    } catch (cause) {
      throw new Error(`缺少既有角色素材 ${file}；禁止生图换脸或静默回退`, { cause });
    }
    const rig = buildRig(image, { ctxFactory: createCanvas, nx: 36, ny: 52 });
    if (CALIBRATION[name]) applyCalibratedFaceSafeWeights(name, rig);
    rigs.set(name, rig);
  }
}

function warped(rig, point, anim) {
  const [x, y] = point;
  const B = rig.bbox;
  const nx = rig.nx;
  const ny = rig.ny;
  const fx = Math.max(0, Math.min(nx - 1e-8, ((x - B.x) / (B.w || 1)) * nx));
  const fy = Math.max(0, Math.min(ny - 1e-8, ((y - B.y) / (B.h || 1)) * ny));
  const ix = Math.floor(fx);
  const iy = Math.floor(fy);
  const dx = fx - ix;
  const dy = fy - iy;
  const a = iy * (nx + 1) + ix;
  const b = a + 1;
  const d = a + nx + 1;
  const c = d + 1;
  const indices = dx >= dy ? [a, b, c] : [a, c, d];
  const weights = dx >= dy ? [1 - dx, dx - dy, dy] : [1 - dy, dx, dy - dx];
  const mats = skinMatrices(rig, anim);
  let px = 0;
  let py = 0;
  indices.forEach((idx, j) => {
    const [rx, ry] = rig.verts[idx];
    for (const [bi, w] of rig.weights[idx]) {
      const m = mats[BONE_ORDER[bi]];
      const q = weights[j] * w;
      px += q * (m[0] * rx + m[2] * ry + m[4]);
      py += q * (m[1] * rx + m[3] * ry + m[5]);
    }
  });
  return [px, py];
}

function quantizedAnimKey(pose, anim) {
  if (!anim || (!anim.root && (!anim.bones || Object.keys(anim.bones).length === 0))) return `${pose}:rest`;
  const q = (v, step = 0.005) => (Number.isFinite(v) ? Math.round(v / step) : 0);
  const parts = [pose];
  if (anim.root) {
    parts.push(`r:${q(anim.root.dx, 0.5)},${q(anim.root.dy, 0.5)},${q(anim.root.rot)},${q(anim.root.sx, 0.01)},${q(anim.root.sy, 0.01)}`);
  }
  for (const bone of BONE_ORDER) {
    const b = anim.bones?.[bone];
    if (b) parts.push(`${bone}:${q(b.rot)},${q(b.dx, 0.5)},${q(b.dy, 0.5)},${q(b.s, 0.01)}`);
  }
  return parts.join('|');
}

function renderPoseSprite(pose, anim) {
  const rig = rigs.get(pose);
  if (!rig) throw Error('Unknown pose ' + pose);
  const cx = rig.bbox.x + rig.bbox.w / 2;
  const key = quantizedAnimKey(pose, anim);
  let image = cache.get(key);
  if (!image) {
    image = makeCanvas(768, 768);
    drawRigged(image.getContext('2d'), rig, 384 - (cx * 600) / rig.h, 720, 1, {
      spriteH: 600,
      shadow: false,
      anim: anim || {},
    });
    cache.set(key, image);
    if (cache.size > 96) cache.delete(cache.keys().next().value);
  }
  return { rig, image };
}

export function actorAnchors(actor) {
  const rig = rigs.get(actor.pose);
  if (!rig || !CALIBRATION[actor.pose]) throw Error('Uncalibrated contact pose ' + actor.pose);
  const h = 10.4 * (actor.u ?? 38);
  const s = h / rig.h;
  const cx = rig.bbox.x + rig.bbox.w / 2;
  const foot = rig.bbox.y + rig.bbox.h;
  const lean = actor.lean ?? 0;
  const sx = actor.sx ?? (1 + (actor.squash ?? 0) * 0.035);
  const sy = actor.sy ?? (1 - (actor.squash ?? 0) * 0.035);
  const dir = actor.flip ? -1 : 1;
  const out = { foot: [actor.x, actor.y] };
  for (const [key, value] of Object.entries(CALIBRATION[actor.pose])) {
    const [px, py] = warped(rig, value, actor.anim || {});
    const x = (px - cx) * s;
    const y = (py - foot) * s;
    out[key] = [
      actor.x + dir * sx * (Math.cos(lean) * x - Math.sin(lean) * y),
      actor.y + sy * (Math.sin(lean) * x + Math.cos(lean) * y),
    ];
  }
  if (actor.deskFront) out.deskFront = actor.deskFront;
  return out;
}

export function drawContactActor(ctx, actor) {
  const { image } = renderPoseSprite(actor.pose, actor.anim);
  const h = 10.4 * (actor.u ?? 38);
  const sx = actor.sx ?? (1 + (actor.squash ?? 0) * 0.035);
  const sy = actor.sy ?? (1 - (actor.squash ?? 0) * 0.035);

  ctx.save();
  if (actor.opacity != null && actor.opacity < 1) ctx.globalAlpha *= actor.opacity;
  ctx.translate(actor.x, actor.y);
  ctx.scale((actor.flip ? -1 : 1) * sx, sy);
  ctx.rotate(actor.lean ?? 0);

  // 姿势切换时的平滑交叉叠化（老姿势垫底淡出，新姿势压上，彻底告别 1 帧干切）
  if (actor.prevPose && actor.prevPose !== actor.pose && rigs.has(actor.prevPose) && (actor.poseBlend ?? 1) < 0.99) {
    const prev = renderPoseSprite(actor.prevPose, actor.anim);
    ctx.save();
    ctx.globalAlpha *= 1 - (actor.poseBlend ?? 1);
    ctx.drawImage(prev.image, (-384 * h) / 600, (-720 * h) / 600, (768 * h) / 600, (768 * h) / 600);
    ctx.restore();
  }

  ctx.drawImage(image, (-384 * h) / 600, (-720 * h) / 600, (768 * h) / 600, (768 * h) / 600);

  // 当角色靠近舞台光源时叠一层柔和边缘高光（rimLight），打通背景光照与人物视觉联系
  if ((actor.rimLight ?? 0) > 0.04) {
    ctx.save();
    ctx.globalAlpha *= Math.min(0.28, actor.rimLight * 0.24);
    ctx.strokeStyle = actor.rimColor || '#FFE5A3';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.52, h * 0.24, h * 0.44, 0, -Math.PI * 0.85, -Math.PI * 0.15);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
  return CALIBRATION[actor.pose] ? actorAnchors(actor) : null;
}

export function anchorSourceInfo() {
  return Object.fromEntries([...rigs].map(([name, r]) => [name, { size: [r.w, r.h], bbox: r.bbox, landmarks: CALIBRATION[name] }]));
}
