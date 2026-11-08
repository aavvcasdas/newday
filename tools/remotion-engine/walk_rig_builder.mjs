// walk_rig_builder.mjs — 2-Bone 连续三角网格蒙皮步态与同体待机图集构建器（通用引擎与 Day 系列共享）
// 核心修复与设计准则：
//   1. 彻底废除横向一刀切位图（切片会在膝关节产生锯齿断层与圆球鼓包），改用与 tools/day3制作/whale_girl_src/whale_rig.mjs
//      同源的「大腿+小腿双骨骼连续三角网格蒙皮 (2-Bone LBS Triangle Mesh + 0.55px 外扩消缝)」：
//      腿部轮廓线在膝关节弯曲时 100% 连续柔顺，零锯齿断口、零假圆形补丁！
//   2. 100% 净空无残腿上身底板：逐像素清除裙下残留原腿/残鞋/三角衬裙碎屑，数学级杜绝「3 条腿」！
//   3. 自然步态参数（大腿摆幅 -19°..+21°、膝盖向后柔顺屈伸 4°..28°、头顶水平波动 <= ±1.8px），
//      并为每个角色配对生成 100% 同体同比例待机图集 (*_pet)，彻底消除跨立绘切图与过渡上跳。
//   4. 严守面部红线：绝不程序涂改任何角色五官像素；零新增 AI 生图，零拷入上游宠物库 PNG/GIF。

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '../..');
const engineRequire = createRequire(path.join(REPO_ROOT, 'tools/engine/package.json'));
const { createCanvas, loadImage } = engineRequire('@napi-rs/canvas');

export const CELL_W = 384;
export const CELL_H = 416;
export const WALK_FRAMES = 8;
export const DEFAULT_WALK_CACHE_DIR = '/tmp/newday_walk_rigs_mesh_v2';

const clamp = (v, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);
const smoothstep = (x) => {
  const t = clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
};

// ---------------------------------------------------------------------------
// 1. 抠图与净空工具
// ---------------------------------------------------------------------------
function fitAndCutoutSolid(img, { targetH = CELL_H, dxOffset = 0, dyOffset = 0, checker = false, extraSeeds = [] } = {}) {
  const scale = targetH / img.height;
  const dw = Math.round(img.width * scale);
  const dh = Math.round(img.height * scale);
  const dx = Math.round((CELL_W - dw) / 2) + dxOffset;
  const dy = CELL_H - dh + dyOffset;

  const c = createCanvas(CELL_W, CELL_H);
  const g = c.getContext('2d');
  g.drawImage(img, dx, dy, dw, dh);

  const im = g.getImageData(0, 0, CELL_W, CELL_H);
  const d = im.data;
  const vis = new Uint8Array(CELL_W * CELL_H);

  const isBg = (idx) => {
    const r = d[idx], gr = d[idx + 1], b = d[idx + 2], a = d[idx + 3];
    if (a < 16) return true;
    const maxC = Math.max(r, gr, b);
    const minC = Math.min(r, gr, b);
    if (checker) {
      return (maxC - minC) <= 16 && minC >= 168;
    }
    return r >= 232 && gr >= 232 && b >= 232 && (maxC - minC) <= 18;
  };

  const stack = [];
  const push = (x, y) => {
    if (x < 0 || x >= CELL_W || y < 0 || y >= CELL_H) return;
    const p = y * CELL_W + x;
    if (vis[p]) return;
    if (!isBg(p * 4)) return;
    vis[p] = 1;
    stack.push(p);
  };

  for (let x = 0; x < CELL_W; x++) {
    push(x, 0);
    push(x, CELL_H - 1);
  }
  for (let y = 0; y < CELL_H; y++) {
    push(0, y);
    push(CELL_W - 1, y);
  }
  for (const [sx, sy] of extraSeeds) {
    for (let oy = -3; oy <= 3; oy++) {
      for (let ox = -3; ox <= 3; ox++) push(sx + ox, sy + oy);
    }
  }

  while (stack.length > 0) {
    const p = stack.pop();
    d[p * 4 + 3] = 0;
    const x = p % CELL_W;
    const y = (p / CELL_W) | 0;
    push(x - 1, y);
    push(x + 1, y);
    push(x, y - 1);
    push(x, y + 1);
  }

  // 1px 抗锯齿白边柔和消退
  for (let y = 1; y < CELL_H - 1; y++) {
    for (let x = 1; x < CELL_W - 1; x++) {
      const p = y * CELL_W + x;
      const idx = p * 4;
      if (d[idx + 3] === 0) continue;
      if (vis[p - 1] || vis[p + 1] || vis[p - CELL_W] || vis[p + CELL_W]) {
        const r = d[idx], gr = d[idx + 1], b = d[idx + 2];
        if (r > 224 && gr > 224 && b > 224 && Math.max(r, gr, b) - Math.min(r, gr, b) < 18) {
          d[idx + 3] = Math.round(d[idx + 3] * 0.22);
        }
      }
    }
  }

  g.putImageData(im, 0, 0);
  return c;
}

function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const intersect = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-6) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function extractPolyLayer(srcCanvas, poly, { filterPixel = null } = {}) {
  const out = createCanvas(CELL_W, CELL_H);
  const og = out.getContext('2d');
  og.save();
  og.beginPath();
  poly.forEach(([x, y], i) => (i === 0 ? og.moveTo(x, y) : og.lineTo(x, y)));
  og.closePath();
  og.clip();
  og.drawImage(srcCanvas, 0, 0);
  og.restore();

  if (filterPixel) {
    const im = out.getContext('2d').getImageData(0, 0, CELL_W, CELL_H);
    const d = im.data;
    for (let y = 0; y < CELL_H; y++) {
      for (let x = 0; x < CELL_W; x++) {
        const idx = (y * CELL_W + x) * 4;
        if (d[idx + 3] === 0) continue;
        if (!filterPixel(x, y, d[idx], d[idx + 1], d[idx + 2], d[idx + 3])) {
          d[idx + 3] = 0;
        }
      }
    }
    out.getContext('2d').putImageData(im, 0, 0);
  }
  return out;
}

function erasePolyInPlace(canvas, poly, { shouldErase = null } = {}) {
  const g = canvas.getContext('2d');
  const im = g.getImageData(0, 0, CELL_W, CELL_H);
  const d = im.data;
  for (let y = 0; y < CELL_H; y++) {
    for (let x = 0; x < CELL_W; x++) {
      const idx = (y * CELL_W + x) * 4;
      if (d[idx + 3] === 0) continue;
      if (!pointInPoly(x, y, poly)) continue;
      if (!shouldErase || shouldErase(x, y, d[idx], d[idx + 1], d[idx + 2], d[idx + 3])) {
        d[idx + 3] = 0;
      }
    }
  }
  g.putImageData(im, 0, 0);
  return canvas;
}

function tintCanvas(srcCanvas, rMul = 0.86, gMul = 0.87, bMul = 0.93) {
  const out = createCanvas(srcCanvas.width, srcCanvas.height);
  const g = out.getContext('2d');
  g.drawImage(srcCanvas, 0, 0);
  const im = g.getImageData(0, 0, out.width, out.height);
  const d = im.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    d[i] = Math.round(d[i] * rMul);
    d[i + 1] = Math.round(d[i + 1] * gMul);
    d[i + 2] = Math.round(d[i + 2] * bMul);
  }
  g.putImageData(im, 0, 0);
  return out;
}

// ---------------------------------------------------------------------------
// 2. 2-Bone (大腿+小腿) 连续三角网格蒙皮引擎（与 whale_rig.mjs 同源，零关节横切缝！）
// ---------------------------------------------------------------------------
function matMul(a, b) {
  return [
    a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5],
  ];
}

function matTR(tx, ty, rot) {
  const c = Math.cos(rot), s = Math.sin(rot);
  return [c, s, -s, c, tx, ty];
}

function drawSkinnedTriangle(ctx, img, s0, s1, s2, d0, d1, d2) {
  // 向外微扩 0.55px 消除相邻网格抗锯齿细缝（复用 whale_rig.mjs 成熟技法）
  const cx = (d0[0] + d1[0] + d2[0]) / 3;
  const cy = (d0[1] + d1[1] + d2[1]) / 3;
  const grow = (p) => {
    const vx = p[0] - cx, vy = p[1] - cy;
    const l = Math.hypot(vx, vy) || 1;
    return [p[0] + (vx / l) * 0.55, p[1] + (vy / l) * 0.55];
  };
  const D0 = grow(d0), D1 = grow(d1), D2 = grow(d2);
  const ax = s1[0] - s0[0], ay = s1[1] - s0[1];
  const bx = s2[0] - s0[0], by = s2[1] - s0[1];
  const cx2 = D1[0] - D0[0], cy2 = D1[1] - D0[1];
  const dx2 = D2[0] - D0[0], dy2 = D2[1] - D0[1];
  const det = ax * by - ay * bx;
  if (Math.abs(det) < 1e-8) return;

  const ia = by / det, ib = -bx / det, ic = -ay / det, id = ax / det;
  const m0 = cx2 * ia + dx2 * ic;
  const m1 = cy2 * ia + dy2 * ic;
  const m2 = cx2 * ib + dx2 * id;
  const m3 = cy2 * ib + dy2 * id;
  const m4 = D0[0] - (m0 * s0[0] + m2 * s0[1]);
  const m5 = D0[1] - (m1 * s0[0] + m3 * s0[1]);

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(D0[0], D0[1]);
  ctx.lineTo(D1[0], D1[1]);
  ctx.lineTo(D2[0], D2[1]);
  ctx.closePath();
  ctx.clip();
  ctx.setTransform(m0, m1, m2, m3, m4, m5);
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}

/**
 * 将单条干净腿立绘先校正为垂直中立位，再建立 9×22 连续双骨骼（大腿+小腿）蒙皮网格。
 * 膝关节上下 ±15px 采用 Hermite 平滑权重过渡，弯曲时线条圆润连贯，绝不裂口、绝不鼓包！
 */
function buildSkinnedLegMesh(rawLegCanvas, {
  srcHipX,
  srcHipY,
  neutralRotDeg = 0,
  dstHipX,
  dstHipY,
  kneeLen = 44,
  blendHalf = 15,
  nx = 8,
  ny = 20,
}) {
  const neutral = createCanvas(CELL_W, CELL_H);
  const ng = neutral.getContext('2d');
  ng.save();
  ng.translate(dstHipX, dstHipY);
  ng.rotate((neutralRotDeg * Math.PI) / 180);
  ng.drawImage(rawLegCanvas, -srcHipX, -srcHipY);
  ng.restore();

  const im = ng.getImageData(0, 0, CELL_W, CELL_H);
  const d = im.data;
  let x0 = CELL_W, y0 = CELL_H, x1 = 0, y1 = 0;
  for (let y = 0; y < CELL_H; y++) {
    for (let x = 0; x < CELL_W; x++) {
      if (d[(y * CELL_W + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 <= x0 || y1 <= y0) {
    x0 = dstHipX - 24; x1 = dstHipX + 24;
    y0 = dstHipY - 6; y1 = dstHipY + 96;
  } else {
    x0 = Math.max(0, x0 - 4);
    y0 = Math.max(0, y0 - 4);
    x1 = Math.min(CELL_W - 1, x1 + 4);
    y1 = Math.min(CELL_H - 1, y1 + 4);
  }

  const kneeY = dstHipY + kneeLen;
  const verts = [];
  const shinWeights = [];
  for (let j = 0; j <= ny; j++) {
    const py = y0 + ((y1 - y0) * j) / ny;
    const wShin = smoothstep((py - (kneeY - blendHalf)) / (2 * blendHalf));
    for (let i = 0; i <= nx; i++) {
      const px = x0 + ((x1 - x0) * i) / nx;
      verts.push([px, py]);
      shinWeights.push(wShin);
    }
  }

  // 预筛含非透明像素的网格单元，加速渲染
  const cellHasAlpha = (i, j) => {
    const ax0 = Math.max(0, Math.floor(x0 + ((x1 - x0) * i) / nx) - 1);
    const ax1 = Math.min(CELL_W - 1, Math.ceil(x0 + ((x1 - x0) * (i + 1)) / nx) + 1);
    const ay0 = Math.max(0, Math.floor(y0 + ((y1 - y0) * j) / ny) - 1);
    const ay1 = Math.min(CELL_H - 1, Math.ceil(y0 + ((y1 - y0) * (j + 1)) / ny) + 1);
    for (let py = ay0; py <= ay1; py++) {
      for (let px = ax0; px <= ax1; px++) {
        if (d[(py * CELL_W + px) * 4 + 3] > 6) return true;
      }
    }
    return false;
  };

  const tris = [];
  const stride = nx + 1;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      if (!cellHasAlpha(i, j)) continue;
      const v00 = j * stride + i;
      const v10 = v00 + 1;
      const v01 = v00 + stride;
      const v11 = v01 + 1;
      tris.push([v00, v10, v11], [v00, v11, v01]);
    }
  }

  return {
    img: neutral,
    hipX: dstHipX,
    hipY: dstHipY,
    kneeY,
    verts,
    shinWeights,
    tris,
  };
}

/**
 * 绘制变形后的单条双骨骼蒙皮腿：
 *   thighDeg > 0 : 大腿向面朝前方自然迈出
 *   kneeDeg >= 0 : 膝盖向面朝后方柔和屈膝（绝不反折）
 */
function drawSkinnedLegMesh(targetCtx, legMesh, thighDeg, kneeDeg, facingRight, hipDx = 0, hipDy = 0) {
  const s = facingRight ? 1 : -1;
  const rotThigh = (-s * thighDeg * Math.PI) / 180;
  const rotKnee = (s * Math.max(0, kneeDeg) * Math.PI) / 180;

  const { img, hipX, hipY, kneeY, verts, shinWeights, tris } = legMesh;
  const mThigh = matMul(matTR(hipX + hipDx, hipY + hipDy, rotThigh), matTR(-hipX, -hipY, 0));
  const mShin = matMul(
    mThigh,
    matMul(matTR(hipX, kneeY, rotKnee), matTR(-hipX, -kneeY, 0))
  );

  const posed = new Array(verts.length);
  for (let k = 0; k < verts.length; k++) {
    const [px, py] = verts[k];
    const ws = shinWeights[k];
    const wt = 1 - ws;
    const xA = mThigh[0] * px + mThigh[2] * py + mThigh[4];
    const yA = mThigh[1] * px + mThigh[3] * py + mThigh[5];
    const xB = mShin[0] * px + mShin[2] * py + mShin[4];
    const yB = mShin[1] * px + mShin[3] * py + mShin[5];
    posed[k] = [wt * xA + ws * xB, wt * yA + ws * yB];
  }

  // 先在独立透明画布合成单腿全部网格，再整张贴回角色画布，避免半透明外缘重复叠黑
  const legLayer = createCanvas(CELL_W, CELL_H);
  const lg = legLayer.getContext('2d');
  for (let t = 0; t < tris.length; t++) {
    const [i0, i1, i2] = tris[t];
    drawSkinnedTriangle(lg, img, verts[i0], verts[i1], verts[i2], posed[i0], posed[i1], posed[i2]);
  }
  targetCtx.drawImage(legLayer, 0, 0);
}

// ---------------------------------------------------------------------------
// 3. Pet 节拍八姿态步态表（对标 tqlearning/ai-girl-chatgpt-pets 的帧节奏与步幅）
// ---------------------------------------------------------------------------
// 参考项目 run-right / run-left 各 8 帧、每帧 120ms（末帧 220ms），单格固定不逐帧裁切，
// 8 帧内脚底接地点差 10px、头顶起伏仅 0~1px、整体重心左右漂移 <1px。
// 本项目据此重做步态：
//   - 16 帧里只保留 8 个「固定关键姿态」，每姿态连续两帧重复（等同参考的 8 帧 × 2 倍时间分辨率）；
//   - 姿态之间零插值、零跨姿态叠化：脚一落地就整只脚掌踩稳，绝无半抬着的模糊拖步；
//   - 头顶起伏压到 ±1px（bodyDy 只做 0.9px 级起伏），摆幅取参考量级的大步幅抬脚；
//   - 左右腿严格 180° 反相对称，膝盖只向后柔顺屈伸，绝不反折。
const PET_STEP_POSES = [
  // k0 近腿脚掌落地（前伸触地），远腿在后蹬离抬跟
  { nearT: 26, nearK: 6, nearLift: 0, farT: -21, farK: 20, farLift: -3, bodyDy: 0.8 },
  // k1 近腿整脚掌承重，远腿屈膝收起准备通过
  { nearT: 12, nearK: 8, nearLift: 0, farT: -11, farK: 35, farLift: -6, bodyDy: 1.2 },
  // k2 近腿直立支撑，远腿抬脚通过中线
  { nearT: -5, nearK: 5, nearLift: 0, farT: 15, farK: 32, farLift: -8, bodyDy: -0.5 },
  // k3 近腿向后蹬地推进，远腿向前舒展迈出
  { nearT: -19, nearK: 16, nearLift: -1, farT: 28, farK: 12, farLift: -3, bodyDy: -1.0 },
  // k4 远腿脚掌落地（与 k0 镜像）
  { nearT: -21, nearK: 20, nearLift: -3, farT: 26, farK: 6, farLift: 0, bodyDy: 0.8 },
  // k5 远腿整脚掌承重（与 k1 镜像）
  { nearT: -11, nearK: 35, nearLift: -6, farT: 12, farK: 8, farLift: 0, bodyDy: 1.2 },
  // k6 远腿直立支撑（与 k2 镜像）
  { nearT: 15, nearK: 32, nearLift: -8, farT: -5, farK: 5, farLift: 0, bodyDy: -0.5 },
  // k7 远腿向后蹬地（与 k3 镜像）
  { nearT: 28, nearK: 12, nearLift: -3, farT: -19, farK: 16, farLift: -1, bodyDy: -1.0 },
];

/** 直接取第 k 个固定姿态（不再在姿态之间插值，脚落地即整掌踩实） */
export function petStepPose(index, strideScale = 1.0) {
  const p = PET_STEP_POSES[((index % 8) + 8) % 8];
  return {
    nearT: p.nearT * strideScale,
    nearK: p.nearK * strideScale,
    nearLift: p.nearLift * strideScale,
    farT: p.farT * strideScale,
    farK: p.farK * strideScale,
    farLift: p.farLift * strideScale,
    bodyDy: p.bodyDy,
  };
}

/**
 * 8 帧图集：第 f 帧 = 第 f 个固定姿态。
 * （v13 曾生成 16 格却按 8 列播放，只播到前 4 个姿态 → 看上去像原地抖腿，这里彻底修正）
 */
export function sampleWalkGait16(frameIndex, strideScale = 1.0) {
  return petStepPose(frameIndex % WALK_FRAMES, strideScale);
}

function renderMeshWalkStrip({
  upperBody,
  legNearMesh,
  legFarMesh,
  facingRight = true,
  strideScale = 1.0,
  underSkirtBackdrop = null,
  frontCapLayer = null,
}) {
  const strip = createCanvas(CELL_W * WALK_FRAMES, CELL_H);
  const sg = strip.getContext('2d');

  for (let f = 0; f < WALK_FRAMES; f++) {
    const g = sampleWalkGait16(f, strideScale);
    const cell = createCanvas(CELL_W, CELL_H);
    const cg = cell.getContext('2d');

    if (underSkirtBackdrop) {
      cg.drawImage(underSkirtBackdrop, 0, g.bodyDy);
    }
    drawSkinnedLegMesh(cg, legFarMesh, g.farT, g.farK, facingRight, 0, g.bodyDy + g.farLift);
    if (upperBody) {
      cg.drawImage(upperBody, 0, g.bodyDy);
    }
    drawSkinnedLegMesh(cg, legNearMesh, g.nearT, g.nearK, facingRight, 0, g.bodyDy + g.nearLift);
    if (frontCapLayer) {
      cg.drawImage(frontCapLayer, 0, g.bodyDy);
    }

    sg.drawImage(cell, f * CELL_W, 0);
  }
  return strip;
}

function renderMeshIdleStrip({
  upperBody,
  legNearMesh,
  legFarMesh,
  facingRight = true,
  idleSpreadDeg = 4.5,
  underSkirtBackdrop = null,
  frontCapLayer = null,
}) {
  const strip = createCanvas(CELL_W * WALK_FRAMES, CELL_H);
  const sg = strip.getContext('2d');

  for (let f = 0; f < WALK_FRAMES; f++) {
    const theta = (2 * Math.PI * f) / WALK_FRAMES;
    const breathDy = Math.sin(theta) * 1.1;
    const cell = createCanvas(CELL_W, CELL_H);
    const cg = cell.getContext('2d');

    if (underSkirtBackdrop) {
      cg.drawImage(underSkirtBackdrop, 0, breathDy);
    }
    drawSkinnedLegMesh(cg, legFarMesh, -idleSpreadDeg, 1.5, facingRight, 0, 0);
    if (upperBody) {
      cg.drawImage(upperBody, 0, breathDy);
    }
    drawSkinnedLegMesh(cg, legNearMesh, idleSpreadDeg, 1.5, facingRight, 0, 0);
    if (frontCapLayer) {
      cg.drawImage(frontCapLayer, 0, breathDy);
    }

    sg.drawImage(cell, f * CELL_W, 0);
  }
  return strip;
}

// ---------------------------------------------------------------------------
// 4. 各角色净空上身与双骨骼蒙皮腿构建（100% 消除裙下残腿，绝无第 3 条腿！）
// ---------------------------------------------------------------------------

/**
 * 鲸鱼娘纯侧面行走 / 待机（默认朝左 facingRight=false，翻转后朝右）：
 * 彻底清除 whale_side_rainwalk_leg_under.png 裙摆下方全部后腿与粉白残边，仅保留深蓝鲸尾！
 */
async function prepareWhaleSideParts() {
  const baseRaw = await loadImage(path.join(REPO_ROOT, 'assets/ai-girls/lyric-action-v13/source/whale_side_rainwalk.png'));
  const underRaw = await loadImage(path.join(REPO_ROOT, 'assets/ai-girls/lyric-action-v13/source/whale_side_rainwalk_leg_under.png'));
  const base = fitAndCutoutSolid(baseRaw);
  const under = fitAndCutoutSolid(underRaw);

  const frontLegPoly = [
    [116, 294], [160, 304], [156, 332], [142, 360], [134, 388],
    [120, 410], [80, 410], [52, 392], [52, 366], [90, 358], [104, 340], [112, 312],
  ];
  // 剔除前腿顶部的深色裙边碎像素，只提取干净长袜腿与黑皮鞋
  const rawFrontLeg = extractPolyLayer(base, frontLegPoly, {
    filterPixel: (x, y, r, g, b) => !(y < 312 && r < 95 && g < 95 && b < 115),
  });

  const legNearMesh = buildSkinnedLegMesh(rawFrontLeg, {
    srcHipX: 136,
    srcHipY: 304,
    neutralRotDeg: -23,
    dstHipX: 150,
    dstHipY: 300,
    kneeLen: 44,
    blendHalf: 15,
  });
  const legFarMesh = buildSkinnedLegMesh(tintCanvas(rawFrontLeg, 0.83, 0.84, 0.92), {
    srcHipX: 136,
    srcHipY: 304,
    neutralRotDeg: -23,
    dstHipX: 162,
    dstHipY: 300,
    kneeLen: 44,
    blendHalf: 15,
  });

  // 彻底清除裙摆以下（y>=306）左下方整条后腿与深藏青色原皮鞋（斜线 x < 194 + (y-310)*0.56 内全部清空，完整保留右上方鲸尾！）
  const cleanSkirtUnder = erasePolyInPlace(under, [
    [96, 306], [202, 310], [250, 396], [250, 415], [96, 415],
  ], {
    shouldErase: (x, y, r, g, b) => {
      // 斜分界线右上方为完整鲸尾（含深色描边），左下方为原后腿与深蓝原皮鞋（必须 100% 擦净！）
      const tailBoundaryX = 195 + (y - 310) * 0.56;
      if (x >= tailBoundaryX && y <= 398) {
        const isBlueTail = b >= 68 && b > r + 10;
        const isTailOutline = x >= tailBoundaryX + 4 && b >= r - 4 && r < 95;
        if (isBlueTail || isTailOutline) return false;
      }
      // 保留 y<=315 处的深藏青色裙摆与白蕾丝底边
      if (y <= 315 && x <= 192 && r < 95 && g < 95 && b < 115) return false;
      return true;
    },
  });

  // 裁取裙摆蕾丝及以上 (y<=315) 作为前景遮罩层，让近腿髋部自然藏于女仆裙摆下方！
  const frontCapLayer = extractPolyLayer(cleanSkirtUnder, [
    [0, 0], [CELL_W, 0], [CELL_W, 304], [202, 316], [108, 310], [0, 304],
  ]);

  return {
    upperBody: cleanSkirtUnder,
    frontCapLayer,
    legNearMesh,
    legFarMesh,
    facingRight: false,
    strideScale: 1.0,
    idleSpreadDeg: 5.5,
  };
}

/**
 * 鲸鱼娘 3/4 视角（开心 & 委屈）：
 * 采用 dance-v11/source/whale_legunder.png（原生零残腿净空底板！）+ animated-v10/whale.png 原生左右双鞋，
 * 或在 v13 等高比例下彻底清除全部裙下残腿并配前景围裙遮罩，零第 3 条腿、零断膝！
 */
async function prepareWhale34Parts({ sadFace = false } = {}) {
  const cleanUnderRaw = await loadImage(path.join(REPO_ROOT, 'assets/ai-girls/lyric-action-v13/source/whale_walk_retry_under.png'));
  const cleanUnder = fitAndCutoutSolid(cleanUnderRaw);

  const legPoly = [
    [148, 312], [198, 310], [212, 352], [235, 378],
    [235, 410], [184, 410], [172, 374], [156, 340],
  ];
  const rawLeg = extractPolyLayer(cleanUnder, legPoly, {
    filterPixel: (x, y, r, g, b) => {
      if (x >= 194 && y <= 368 && b > 86 && b > r + 12) return false;
      if (y < 318 && r > 225 && g > 225 && b > 225) return false; // 去掉顶部白衬裙碎角
      return true;
    },
  });

  const legNearMesh = buildSkinnedLegMesh(rawLeg, {
    srcHipX: 181,
    srcHipY: 314,
    neutralRotDeg: 21,
    dstHipX: 185,
    dstHipY: 304,
    kneeLen: 42,
    blendHalf: 15,
  });
  const legFarMesh = buildSkinnedLegMesh(tintCanvas(rawLeg, 0.84, 0.85, 0.92), {
    srcHipX: 181,
    srcHipY: 314,
    neutralRotDeg: 21,
    dstHipX: 164,
    dstHipY: 304,
    kneeLen: 42,
    blendHalf: 15,
  });

  // 彻底擦除裙摆以下左下方原腿、白袜与深藏青原皮鞋（斜线 x < 201 + (y-310)*0.56 内 100% 清空，绝不留悬空第 3 只鞋！）
  const cleanBody = erasePolyInPlace(cleanUnder, [
    [126, 308], [212, 308], [254, 396], [254, 415], [126, 415],
  ], {
    shouldErase: (x, y, r, g, b) => {
      const tailBoundaryX = 201 + (y - 310) * 0.56;
      if (x >= tailBoundaryX && y <= 396) {
        const isBlueTail = b >= 72 && b > r + 10;
        const isTailOutline = x >= tailBoundaryX + 4 && b >= r - 4 && r < 95;
        if (isBlueTail || isTailOutline) return false;
      }
      if (y <= 316 && x <= 198 && r < 90 && g < 90 && b < 110) return false;
      return true;
    },
  });

  let upperBody = cleanBody;
  if (sadFace) {
    const sadRaw = await loadImage(path.join(REPO_ROOT, 'assets/ai-girls/lyric-action-v13/source/whale_rainwalk.png'));
    const sad = fitAndCutoutSolid(sadRaw);
    upperBody = createCanvas(CELL_W, CELL_H);
    const ug = upperBody.getContext('2d');
    ug.drawImage(cleanBody, 0, 0);
    ug.clearRect(0, 0, CELL_W, 195);
    ug.drawImage(sad, 0, 0, CELL_W, 196, 0, 0, CELL_W, 196);
  }

  // 前景女仆裙摆遮罩（y<=315），完美盖住近腿髋关节根部
  const frontCapLayer = extractPolyLayer(upperBody, [
    [0, 0], [CELL_W, 0], [CELL_W, 306], [204, 317], [132, 317], [0, 306],
  ]);

  return {
    upperBody,
    frontCapLayer,
    legNearMesh,
    legFarMesh,
    facingRight: true,
    strideScale: 0.78, // 3/4 视角采用适度自然步幅，杜绝夸张劈叉
    idleSpreadDeg: 4.5,
  };
}

/**
 * 豆包侧面行走 / 待机（默认朝左 facingRight=false）：双骨骼连续网格蒙皮，消除裤腿后方黑球鼓包！
 */
async function prepareDoubaoSideParts() {
  const underRaw = await loadImage(path.join(REPO_ROOT, 'assets/ai-girls/lyric-action-v13/source/doubao_step_leg_under.png'));
  const under = fitAndCutoutSolid(underRaw, { dyOffset: 48 });

  erasePolyInPlace(under, [[0, 0], [145, 0], [145, CELL_H], [0, CELL_H]], {
    shouldErase: (x, y, r) => !(x >= 139 && y >= 228 && y <= 248 && r > 170),
  });

  const legPoly = [[172, 314], [222, 314], [224, 412], [162, 412]];
  const rawLeg = extractPolyLayer(under, legPoly);
  const legNearMesh = buildSkinnedLegMesh(rawLeg, {
    srcHipX: 198,
    srcHipY: 316,
    neutralRotDeg: 0,
    dstHipX: 196,
    dstHipY: 316,
    kneeLen: 40,
    blendHalf: 14,
  });
  const legFarMesh = buildSkinnedLegMesh(tintCanvas(rawLeg, 0.78, 0.80, 0.86), {
    srcHipX: 198,
    srcHipY: 316,
    neutralRotDeg: 0,
    dstHipX: 202,
    dstHipY: 316,
    kneeLen: 40,
    blendHalf: 14,
  });

  const upperBody = erasePolyInPlace(under, [[156, 322], [232, 322], [232, 415], [156, 415]]);
  const frontCapLayer = extractPolyLayer(upperBody, [[0, 0], [CELL_W, 0], [CELL_W, 324], [0, 324]]);

  return {
    upperBody,
    frontCapLayer,
    legNearMesh,
    legFarMesh,
    facingRight: false,
    strideScale: 0.92,
    idleSpreadDeg: 4.5,
  };
}

/**
 * 龙女 GPT 推山迈步 / 待机：
 * 彻底擦净前裙开叉内的原前腿与后方原鞋尖，不画生硬紫色大三角块，杜绝第 3 只鞋/第 3 条腿！
 */
async function prepareGptPushParts() {
  const sheet = await loadImage(path.join(REPO_ROOT, 'assets/ai-girls/lyric-action-v13/gpt_push_final_action.png'));
  const base = createCanvas(CELL_W, CELL_H);
  base.getContext('2d').drawImage(sheet, 0, 0, CELL_W, CELL_H, 0, 0, CELL_W, CELL_H);

  // 复用 dance-v11/source/gpt_legunder.png 原画级手绘裙底内衬褶皱，替代几何色块，零残鞋零矩形断边！
  const legUnderRaw = await loadImage(path.join(REPO_ROOT, 'assets/ai-girls/dance-v11/source/gpt_legunder.png'));
  const cleanSkirtPlate = fitAndCutoutSolid(legUnderRaw, {
    checker: true,
    extraSeeds: [[184, 355], [165, 380]],
  });

  const frontLegPoly = [[122, 298], [156, 306], [166, 355], [168, 408], [116, 408], [120, 350]];
  const rawLeg = extractPolyLayer(base, frontLegPoly);
  const legNearMesh = buildSkinnedLegMesh(rawLeg, {
    srcHipX: 140,
    srcHipY: 306,
    neutralRotDeg: 0,
    dstHipX: 158,
    dstHipY: 302,
    kneeLen: 43,
    blendHalf: 15,
  });
  const legFarMesh = buildSkinnedLegMesh(tintCanvas(rawLeg, 0.84, 0.84, 0.91), {
    srcHipX: 140,
    srcHipY: 306,
    neutralRotDeg: 0,
    dstHipX: 174,
    dstHipY: 302,
    kneeLen: 43,
    blendHalf: 15,
  });

  // 上半身保留 gpt_push_final_action 的双手推石姿态（y<=292），下半身无缝衔接 gpt_legunder 的手绘长裙与龙尾
  const underSkirtBackdrop = createCanvas(CELL_W, CELL_H);
  const bg = underSkirtBackdrop.getContext('2d');
  bg.drawImage(base, 0, 0, CELL_W, 294, 0, 0, CELL_W, 294);
  bg.drawImage(cleanSkirtPlate, 0, 286, CELL_W, CELL_H - 286, 0, 286, CELL_W, CELL_H - 286);

  const frontCapLayer = extractPolyLayer(underSkirtBackdrop, [
    [0, 0], [CELL_W, 0], [CELL_W, 304], [0, 304],
  ]);

  return {
    upperBody: null,
    underSkirtBackdrop,
    frontCapLayer,
    legNearMesh,
    legFarMesh,
    facingRight: true,
    strideScale: 0.85,
    idleSpreadDeg: 5.0,
  };
}

/**
 * 通用 dance-v11 + animated-v10 角色双骨骼连续蒙皮步态生成器
 * 适用于 Gemini、GPT(日常)、Kimi、Qwen、Z.AI、Claude（供 MV 与 Day 系列通用模板直接调用！）
 */
const V11_CHARACTER_RIG_SPECS = {
  gemini: {
    legPoly: [[154, 316], [184, 316], [185, 406], [154, 406]],
    srcHip: [169, 318],
    nearHip: [188, 314],
    farHip: [172, 314],
    kneeLen: 42,
    hemY: 318,
    checkerSeeds: [[184, 350], [184, 385], [165, 365], [202, 365]],
    strideScale: 0.85,
  },
  gpt: {
    legPoly: [[143, 297], [176, 297], [181, 406], [145, 406]],
    srcHip: [158, 302],
    nearHip: [178, 302],
    farHip: [160, 302],
    kneeLen: 44,
    hemY: 304,
    checkerSeeds: [[184, 355], [165, 380]],
    strideScale: 0.84,
  },
  kimi: {
    legPoly: [[146, 316], [188, 316], [189, 408], [145, 408]],
    srcHip: [167, 320],
    nearHip: [192, 320],
    farHip: [174, 320],
    kneeLen: 38,
    hemY: 322,
    checkerSeeds: [[184, 355], [60, 360], [320, 360]],
    strideScale: 0.82,
  },
  qwen: {
    legPoly: [[158, 350], [188, 350], [188, 404], [158, 404]],
    srcHip: [173, 351],
    nearHip: [194, 350],
    farHip: [176, 350],
    kneeLen: 24,
    hemY: 352,
    checkerSeeds: [],
    strideScale: 0.76,
  },
  zai: {
    legPoly: [[156, 350], [186, 350], [186, 406], [156, 406]],
    srcHip: [171, 351],
    nearHip: [196, 350],
    farHip: [176, 350],
    kneeLen: 24,
    hemY: 352,
    checkerSeeds: [[184, 380]],
    strideScale: 0.76,
  },
  claude: {
    legPoly: [[156, 343], [183, 343], [183, 408], [156, 408]],
    srcHip: [169, 344],
    nearHip: [196, 344],
    farHip: [174, 344],
    kneeLen: 28,
    hemY: 344,
    checkerSeeds: [],
    strideScale: 0.78,
  },
};

async function prepareV11CharacterParts(charId) {
  const cfg = V11_CHARACTER_RIG_SPECS[charId];
  let base;
  let upperBody;

  if (charId === 'claude') {
    const standRaw = await loadImage(path.join(REPO_ROOT, 'assets/ai-girls/dance-v11/source/claude_stand_cutout.png'));
    base = createCanvas(CELL_W, CELL_H);
    base.getContext('2d').drawImage(standRaw, 0, 0, CELL_W, CELL_H);
    upperBody = createCanvas(CELL_W, CELL_H);
    upperBody.getContext('2d').drawImage(base, 0, 0);
    erasePolyInPlace(upperBody, [[138, 340], [238, 340], [238, 414], [138, 414]]);
  } else {
    const v10 = await loadImage(path.join(REPO_ROOT, `assets/ai-girls/animated-v10/${charId}.png`));
    base = createCanvas(CELL_W, CELL_H);
    base.getContext('2d').drawImage(v10, 0, 0, CELL_W, CELL_H, 0, 0, CELL_W, CELL_H);

    const legUnderRaw = await loadImage(path.join(REPO_ROOT, `assets/ai-girls/dance-v11/source/${charId}_legunder.png`));
    upperBody = fitAndCutoutSolid(legUnderRaw, {
      checker: charId !== 'qwen',
      extraSeeds: cfg.checkerSeeds,
    });
  }

  const rawLeg = extractPolyLayer(base, cfg.legPoly);
  const legNearMesh = buildSkinnedLegMesh(rawLeg, {
    srcHipX: cfg.srcHip[0],
    srcHipY: cfg.srcHip[1],
    neutralRotDeg: 0,
    dstHipX: cfg.nearHip[0],
    dstHipY: cfg.nearHip[1],
    kneeLen: cfg.kneeLen,
    blendHalf: Math.min(14, Math.round(cfg.kneeLen * 0.4)),
  });
  const legFarMesh = buildSkinnedLegMesh(tintCanvas(rawLeg, 0.84, 0.85, 0.92), {
    srcHipX: cfg.srcHip[0],
    srcHipY: cfg.srcHip[1],
    neutralRotDeg: 0,
    dstHipX: cfg.farHip[0],
    dstHipY: cfg.farHip[1],
    kneeLen: cfg.kneeLen,
    blendHalf: Math.min(14, Math.round(cfg.kneeLen * 0.4)),
  });

  const frontCapLayer = extractPolyLayer(upperBody, [
    [0, 0], [CELL_W, 0], [CELL_W, cfg.hemY], [0, cfg.hemY],
  ]);

  return {
    upperBody: null,
    underSkirtBackdrop: upperBody,
    frontCapLayer,
    legNearMesh,
    legFarMesh,
    facingRight: true,
    strideScale: cfg.strideScale,
    idleSpreadDeg: 4.5,
  };
}

export const WALK_RIG_BUILDERS = {
  // 鲸鱼娘侧面步态、待机与长椅坐姿（MV 与 Day 系列横向走位首选）
  whale_walk_side_2leg: async () => renderMeshWalkStrip(await prepareWhaleSideParts()),
  whale_idle_side_pet: async () => renderMeshIdleStrip(await prepareWhaleSideParts()),
  // 鲸鱼娘 3/4 步态与同体待机
  whale_walk_happy_2leg: async () => renderMeshWalkStrip(await prepareWhale34Parts({ sadFace: false })),
  whale_idle_happy_pet: async () => renderMeshIdleStrip(await prepareWhale34Parts({ sadFace: false })),
  whale_walk_sad_2leg: async () => renderMeshWalkStrip(await prepareWhale34Parts({ sadFace: true })),
  whale_idle_sad_pet: async () => renderMeshIdleStrip(await prepareWhale34Parts({ sadFace: true })),
  // 豆包侧面步态与待机（MV 与 Day12+ 豆包帮手通用）
  doubao_walk_side_2leg: async () => renderMeshWalkStrip(await prepareDoubaoSideParts()),
  doubao_idle_side_pet: async () => renderMeshIdleStrip(await prepareDoubaoSideParts()),
  // 龙女 GPT 推山步态与日常步态
  gpt_push_walk_2leg: async () => renderMeshWalkStrip(await prepareGptPushParts()),
  gpt_push_idle_pet: async () => renderMeshIdleStrip(await prepareGptPushParts()),
  gpt_walk_2leg: async () => renderMeshWalkStrip(await prepareV11CharacterParts('gpt')),
  gpt_idle_pet: async () => renderMeshIdleStrip(await prepareV11CharacterParts('gpt')),
  // 其余全部 AI Girls 角色步态与配对待机（MV 与 Day 系列嘉宾入场通用）
  gemini_walk_2leg: async () => renderMeshWalkStrip(await prepareV11CharacterParts('gemini')),
  gemini_idle_pet: async () => renderMeshIdleStrip(await prepareV11CharacterParts('gemini')),
  claude_walk_2leg: async () => renderMeshWalkStrip(await prepareV11CharacterParts('claude')),
  claude_idle_pet: async () => renderMeshIdleStrip(await prepareV11CharacterParts('claude')),
  kimi_walk_2leg: async () => renderMeshWalkStrip(await prepareV11CharacterParts('kimi')),
  kimi_idle_pet: async () => renderMeshIdleStrip(await prepareV11CharacterParts('kimi')),
  qwen_walk_2leg: async () => renderMeshWalkStrip(await prepareV11CharacterParts('qwen')),
  qwen_idle_pet: async () => renderMeshIdleStrip(await prepareV11CharacterParts('qwen')),
  zai_walk_2leg: async () => renderMeshWalkStrip(await prepareV11CharacterParts('zai')),
  zai_idle_pet: async () => renderMeshIdleStrip(await prepareV11CharacterParts('zai')),
};

export const WALK_RIG_ATLAS_NAMES = Object.freeze(Object.keys(WALK_RIG_BUILDERS));

/**
 * 仓库内预烘的 v14 图集（assets/ai-girls/walk-v14/*.png）优先：
 * 有成品就读成品，保证「走路图片」是可审阅、可替换的真实素材。
 */
export const PREBUILT_WALK_DIR = path.join(REPO_ROOT, 'assets/ai-girls/walk-v14');

export function prebuiltAtlasPath(name) {
  const p = path.join(PREBUILT_WALK_DIR, `${name}.png`);
  return fs.existsSync(p) && fs.statSync(p).size > 20_000 ? p : null;
}

export async function ensureWalkRigAtlases(cacheDir = DEFAULT_WALK_CACHE_DIR, { force = false, only = null } = {}) {
  fs.mkdirSync(cacheDir, { recursive: true });
  const keys = Array.isArray(only) && only.length > 0 ? only : Object.keys(WALK_RIG_BUILDERS);
  const built = {};
  for (const name of keys) {
    const fn = WALK_RIG_BUILDERS[name];
    if (!fn) continue;
    const prebuilt = force ? null : prebuiltAtlasPath(name);
    if (prebuilt) {
      built[name] = prebuilt;
      continue;
    }
    const outPath = path.join(cacheDir, `${name}.png`);
    if (force || !fs.existsSync(outPath) || fs.statSync(outPath).size < 20_000) {
      const strip = await fn();
      fs.writeFileSync(outPath, strip.toBuffer('image/png'));
    }
    built[name] = outPath;
  }
  return built;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = await ensureWalkRigAtlases(DEFAULT_WALK_CACHE_DIR, { force: true });
  console.log('WALK_RIGS_READY', JSON.stringify(out, null, 2));
}
