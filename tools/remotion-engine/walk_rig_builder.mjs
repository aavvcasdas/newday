import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const ENGINE_REQUIRE = createRequire(path.join(REPO_ROOT, 'tools/engine/package.json'));
const { createCanvas, loadImage } = ENGINE_REQUIRE('@napi-rs/canvas');

export const CELL_W = 384;
export const CELL_H = 416;
export const WALK_FRAMES = 16;
export const DEFAULT_WALK_CACHE_DIR = '/tmp/newday_walk_rigs_pet_v1';

// 对标 tqlearning/ai-girl-chatgpt-pets 第 1/2 行 (running-right / running-left) 的 8 关键帧双关节屈膝步态表：
// 每格含：[大腿角 thighDeg, 膝关节向后屈曲角 kneeBendDeg, 躯干微起伏 bodyDyPx, 尾部/发梢摆角 tailDeg]
// 约定（面向右侧 running-right 时）：
//   thighDeg < 0 为大腿向前迈出，thighDeg > 0 为大腿向后蹬伸；
//   kneeBendDeg >= 0 恒为小腿绕膝盖向后折叠（符合人体真实膝关节生理，绝不反向折腿）；
//   头部与上身垂直起伏严格控制在 [-2.2px, +2.2px]（约身高 0.7%），消除“人在跳”的弹跳感。
const PET_8FRAME_GAIT = [
  // f0: Contact R — 右腿前伸触地，左腿在后微屈膝
  { near: [-27, 7], far: [19, 34], dy: 1.4, tail: 3.5 },
  // f1: Down R    — 右脚踩实承重，左小腿向后勾起抬离地面
  { near: [-10, 10], far: [6, 56], dy: 2.2, tail: 2.0 },
  // f2: Pass L    — 右脚在地面向后推，左大腿高抬前摆、小腿屈膝收于裙下越过支撑腿
  { near: [8, 4], far: [-33, 52], dy: -0.8, tail: -2.5 },
  // f3: Reach L   — 右腿在后蹬地向后勾起，左腿向前伸直准备落脚
  { near: [22, 44], far: [-31, 16], dy: -1.8, tail: -4.0 },
  // f4: Contact L — 左腿前伸触地，右腿在后微屈膝（与 f0 反相）
  { near: [19, 34], far: [-27, 7], dy: 1.4, tail: -3.5 },
  // f5: Down L    — 左脚踩实承重，右小腿向后勾起抬离地面（与 f1 反相）
  { near: [6, 56], far: [-10, 10], dy: 2.2, tail: -2.0 },
  // f6: Pass R    — 左脚在地面向后推，右大腿高抬前摆、小腿屈膝前越（与 f2 反相）
  { near: [-33, 52], far: [8, 4], dy: -0.8, tail: 2.5 },
  // f7: Reach R   — 左腿在后蹬地向后勾起，右腿向前伸直准备落脚（与 f3 反相）
  { near: [-31, 16], far: [22, 44], dy: -1.8, tail: 4.0 },
];

function samplePetGait(u01) {
  const pos = (((u01 % 1) + 1) % 1) * PET_8FRAME_GAIT.length;
  const idx0 = Math.floor(pos) % PET_8FRAME_GAIT.length;
  const idx1 = (idx0 + 1) % PET_8FRAME_GAIT.length;
  const frac = pos - Math.floor(pos);
  // Smooth cosine blend between adjacent pet keyframes
  const w = 0.5 - 0.5 * Math.cos(Math.PI * frac);
  const a = PET_8FRAME_GAIT[idx0];
  const b = PET_8FRAME_GAIT[idx1];
  const mix = (x, y) => x + (y - x) * w;
  return {
    nearThigh: mix(a.near[0], b.near[0]),
    nearKnee: mix(a.near[1], b.near[1]),
    farThigh: mix(a.far[0], b.far[0]),
    farKnee: mix(a.far[1], b.far[1]),
    dy: mix(a.dy, b.dy),
    tail: mix(a.tail, b.tail),
  };
}

function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    const intersect = ((yi > y) !== (yj > y))
      && (x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-9) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function fitAndCutoutSolid(rawImg, { dyOffset = 0, checker = false, extraSeeds = [] } = {}) {
  const scale = Math.min((CELL_W - 16) / rawImg.width, (CELL_H - 16) / rawImg.height);
  const rw = Math.round(rawImg.width * scale);
  const rh = Math.round(rawImg.height * scale);

  const tmp = createCanvas(8, 8);
  const tg = tmp.getContext('2d');
  tg.fillStyle = '#FFFFFF';
  tg.fillRect(0, 0, 8, 8);
  tg.drawImage(rawImg, 0, 0);
  const bg = tg.getImageData(0, 0, 1, 1).data;

  const c = createCanvas(CELL_W, CELL_H);
  const g = c.getContext('2d');
  g.fillStyle = `rgb(${bg[0]},${bg[1]},${bg[2]})`;
  g.fillRect(0, 0, CELL_W, CELL_H);
  g.drawImage(rawImg, Math.floor((CELL_W - rw) / 2), CELL_H - 8 - rh + dyOffset, rw, rh);

  const imgData = g.getImageData(0, 0, CELL_W, CELL_H);
  const d = imgData.data;
  const isBg = (i) => {
    const r = d[i], gr = d[i + 1], b = d[i + 2];
    if (checker) {
      const mx = Math.max(r, gr, b), mn = Math.min(r, gr, b);
      return r > 192 && gr > 192 && b > 192 && (mx - mn) < 20;
    }
    const dr = Math.abs(r - bg[0]), dg = Math.abs(gr - bg[1]), db = Math.abs(b - bg[2]);
    return (dr < 26 && dg < 26 && db < 26) || (r > 230 && gr > 230 && b > 230);
  };

  const seen = new Uint8Array(CELL_W * CELL_H);
  const q = [];
  const push = (x, y) => {
    if (x < 0 || x >= CELL_W || y < 0 || y >= CELL_H) return;
    const idx = y * CELL_W + x;
    if (!seen[idx] && isBg(idx * 4)) {
      seen[idx] = 1;
      q.push(idx);
    }
  };
  for (let x = 0; x < CELL_W; x++) { push(x, 0); push(x, CELL_H - 1); }
  for (let y = 0; y < CELL_H; y++) { push(0, y); push(CELL_W - 1, y); }
  for (const [sx, sy] of extraSeeds) push(sx, sy);

  while (q.length) {
    const idx = q.pop();
    const x = idx % CELL_W, y = (idx / CELL_W) | 0;
    if (x > 0) push(x - 1, y);
    if (x + 1 < CELL_W) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y + 1 < CELL_H) push(x, y + 1);
  }
  for (let i = 0; i < CELL_W * CELL_H; i++) {
    if (seen[i]) d[i * 4 + 3] = 0;
  }
  g.putImageData(imgData, 0, 0);
  return c;
}

function extractPolyLayer(srcCanvas, poly, { filterPixel = null } = {}) {
  const out = createCanvas(CELL_W, CELL_H);
  const og = out.getContext('2d');
  og.drawImage(srcCanvas, 0, 0);
  const img = og.getImageData(0, 0, CELL_W, CELL_H);
  const d = img.data;
  for (let y = 0; y < CELL_H; y++) {
    for (let x = 0; x < CELL_W; x++) {
      const i = (y * CELL_W + x) * 4;
      if (d[i + 3] === 0) continue;
      if (!pointInPoly(x, y, poly)) {
        d[i + 3] = 0;
      } else if (filterPixel && !filterPixel(x, y, d[i], d[i + 1], d[i + 2], d[i + 3])) {
        d[i + 3] = 0;
      }
    }
  }
  og.putImageData(img, 0, 0);
  return out;
}

function erasePolyInPlace(canvas, poly, { shouldErase = null } = {}) {
  const g = canvas.getContext('2d');
  const img = g.getImageData(0, 0, CELL_W, CELL_H);
  const d = img.data;
  for (let y = 0; y < CELL_H; y++) {
    for (let x = 0; x < CELL_W; x++) {
      const i = (y * CELL_W + x) * 4;
      if (d[i + 3] === 0) continue;
      if (pointInPoly(x, y, poly)) {
        if (!shouldErase || shouldErase(x, y, d[i], d[i + 1], d[i + 2], d[i + 3])) {
          d[i + 3] = 0;
        }
      }
    }
  }
  g.putImageData(img, 0, 0);
  return canvas;
}

function tintCanvas(srcCanvas, rMul, gMul, bMul) {
  const out = createCanvas(srcCanvas.width, srcCanvas.height);
  const g = out.getContext('2d');
  g.drawImage(srcCanvas, 0, 0);
  const img = g.getImageData(0, 0, out.width, out.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    d[i] = Math.min(255, Math.round(d[i] * rMul));
    d[i + 1] = Math.min(255, Math.round(d[i + 1] * gMul));
    d[i + 2] = Math.min(255, Math.round(d[i + 2] * bMul));
  }
  g.putImageData(img, 0, 0);
  return out;
}

/**
 * 将单条干净直立腿拆分为【大腿 thigh】+【小腿与鞋 shin】两段关节，并在膝盖处补齐圆润衔接球，
 * 使膝关节在 0°..60° 向后折叠时完全无裂口、无折角锯齿。
 */
function buildTwoJointLegSegments(rawLegLayer, {
  srcHipX,
  srcHipY,
  neutralRotDeg = 0,
  dstHipX,
  dstHipY,
  kneeLen = 46,
  hipCapColor = '#F7DBD0',
  hipCapRx = 14,
  hipCapRy = 15,
  kneeCapColor = '#F7DBD0',
  kneeCapR = 10.5,
}) {
  const neutral = createCanvas(CELL_W, CELL_H);
  const ng = neutral.getContext('2d');
  if (hipCapColor) {
    ng.fillStyle = hipCapColor;
    ng.beginPath();
    ng.ellipse(dstHipX, dstHipY + 4, hipCapRx, hipCapRy, 0, 0, Math.PI * 2);
    ng.fill();
  }
  ng.save();
  ng.translate(dstHipX, dstHipY);
  ng.rotate((neutralRotDeg * Math.PI) / 180);
  ng.drawImage(rawLegLayer, -srcHipX, -srcHipY);
  ng.restore();

  const kneeY = dstHipY + kneeLen;

  const thigh = createCanvas(CELL_W, CELL_H);
  const tg = thigh.getContext('2d');
  tg.drawImage(neutral, 0, 0, CELL_W, kneeY + 4, 0, 0, CELL_W, kneeY + 4);
  if (kneeCapColor) {
    tg.fillStyle = kneeCapColor;
    tg.beginPath();
    tg.arc(dstHipX, kneeY, kneeCapR, 0, Math.PI * 2);
    tg.fill();
  }

  const shin = createCanvas(CELL_W, CELL_H);
  const sg = shin.getContext('2d');
  if (kneeCapColor) {
    sg.fillStyle = kneeCapColor;
    sg.beginPath();
    sg.arc(dstHipX, kneeY, kneeCapR * 0.94, 0, Math.PI * 2);
    sg.fill();
  }
  sg.drawImage(neutral, 0, kneeY - 3, CELL_W, CELL_H - (kneeY - 3), 0, kneeY - 3, CELL_W, CELL_H - (kneeY - 3));

  return { thigh, shin, hipX: dstHipX, hipY: dstHipY, kneeLen };
}

/**
 * 绘制双关节腿（髋 -> 大腿旋转 -> 膝 -> 小腿向后屈膝旋转）
 * facingRight = true：原图朝右（大腿前抬为负角，小腿向后折叠为正角）
 * facingRight = false：原图朝左（大腿前抬为正角，小腿向后折叠为负角）
 */
function drawTwoJointLeg(ctx, segLeg, thighDegRight, kneeBendDegRight, facingRight = true, dyOffset = 0) {
  const sign = facingRight ? 1 : -1;
  const thighRad = ((sign * thighDegRight) * Math.PI) / 180;
  const kneeRad = ((sign * kneeBendDegRight) * Math.PI) / 180;
  const { thigh, shin, hipX, hipY, kneeLen } = segLeg;
  const kneeY = hipY + kneeLen;

  ctx.save();
  ctx.translate(hipX, hipY + dyOffset);
  ctx.rotate(thighRad);
  ctx.drawImage(thigh, -hipX, -hipY);

  // Move down along thigh bone to knee joint, then bend shin backward
  ctx.translate(0, kneeLen);
  ctx.rotate(kneeRad);
  ctx.drawImage(shin, -hipX, -kneeY);
  ctx.restore();
}

function drawPivoted(ctx, layer, pivotX, pivotY, angleDeg, dx = 0, dy = 0) {
  ctx.save();
  ctx.translate(pivotX + dx, pivotY + dy);
  ctx.rotate((angleDeg * Math.PI) / 180);
  ctx.drawImage(layer, -pivotX, -pivotY);
  ctx.restore();
}

/**
 * 渲染对标 ai-girl-chatgpt-pets 的 16 帧双关节屈膝行走图集（头部平稳，膝盖自然弯曲抬腿迈步）
 */
function renderPetStyleWalkStrip({
  upperBody,
  legNearSeg,
  legFarSeg,
  facingRight = true,
  underSkirtBackdrop = null,
  frontCapLayer = null,
  strideScale = 1.0,
}) {
  const strip = createCanvas(CELL_W * WALK_FRAMES, CELL_H);
  const sg = strip.getContext('2d');
  const sign = facingRight ? 1 : -1;

  for (let f = 0; f < WALK_FRAMES; f++) {
    const g = samplePetGait(f / WALK_FRAMES);
    const cell = createCanvas(CELL_W, CELL_H);
    const cg = cell.getContext('2d');

    if (underSkirtBackdrop) {
      drawPivoted(cg, underSkirtBackdrop, CELL_W * 0.5, 240, sign * 0.4 * Math.sin((4 * Math.PI * f) / WALK_FRAMES), 0, g.dy);
    }

    // 1. 远端腿（位于后层，带柔和阴影色阶）
    drawTwoJointLeg(cg, legFarSeg, g.farThigh * strideScale, g.farKnee * strideScale, facingRight, g.dy);
    // 2. 近端腿（位于前层）
    drawTwoJointLeg(cg, legNearSeg, g.nearThigh * strideScale, g.nearKnee * strideScale, facingRight, g.dy);
    // 3. 上半身与裙摆（平稳移动，头部起伏 <= 2.2px，完全不晃不跳）
    drawPivoted(cg, upperBody, CELL_W * 0.5, 240, -sign * 0.6, 0, g.dy);
    if (frontCapLayer) {
      drawPivoted(cg, frontCapLayer, CELL_W * 0.5, 240, -sign * 0.6, 0, g.dy);
    }

    sg.drawImage(cell, f * CELL_W, 0);
  }
  return strip;
}

/**
 * 渲染与行走图集 100% 同体同比例的待机图集（对标 ai-girl-chatgpt-pets 第 0 行 idle：双脚并拢踩地 + 轻柔呼吸，零切图跳变！）
 */
function renderPetStyleIdleStrip({
  upperBody,
  legNearSeg,
  legFarSeg,
  facingRight = true,
  underSkirtBackdrop = null,
  frontCapLayer = null,
  blinkUpperBody = null,
}) {
  const strip = createCanvas(CELL_W * WALK_FRAMES, CELL_H);
  const sg = strip.getContext('2d');

  for (let f = 0; f < WALK_FRAMES; f++) {
    const theta = (2 * Math.PI * f) / WALK_FRAMES;
    const breathDy = Math.sin(theta) * 1.2;
    const isBlink = blinkUpperBody && (f === 11 || f === 12);
    const bodyToDraw = isBlink ? blinkUpperBody : upperBody;

    const cell = createCanvas(CELL_W, CELL_H);
    const cg = cell.getContext('2d');

    if (underSkirtBackdrop) {
      cg.drawImage(underSkirtBackdrop, 0, breathDy);
    }
    // 待机双脚自然微开稳踩地面，膝盖不乱弹（对标 ai-girl-chatgpt-pets idle 自然站姿）
    drawTwoJointLeg(cg, legFarSeg, -6, 2, facingRight, 0);
    drawTwoJointLeg(cg, legNearSeg, 6, 2, facingRight, 0);
    cg.drawImage(bodyToDraw, 0, breathDy);
    if (frontCapLayer) {
      cg.drawImage(frontCapLayer, 0, breathDy);
    }

    sg.drawImage(cell, f * CELL_W, 0);
  }
  return strip;
}

async function prepareWhale34Parts({ sadFace = false } = {}) {
  const cleanUnderRaw = await loadImage(path.join(REPO_ROOT, 'assets/ai-girls/lyric-action-v13/source/whale_walk_retry_under.png'));
  const cleanUnder = fitAndCutoutSolid(cleanUnderRaw);

  const legPoly = [
    [148, 312], [195, 310], [209, 352], [235, 378],
    [235, 410], [184, 410], [172, 374], [156, 340],
  ];
  const rawLeg = extractPolyLayer(cleanUnder, legPoly, {
    filterPixel: (x, y, r, g, b) => !(x >= 192 && y <= 362 && b > 92 && b > r + 14),
  });

  const legNearSeg = buildTwoJointLegSegments(rawLeg, {
    srcHipX: 181,
    srcHipY: 312,
    neutralRotDeg: 18,
    dstHipX: 185,
    dstHipY: 300,
    kneeLen: 45,
    hipCapColor: '#F7DBD0',
    kneeCapColor: '#F7DBD0',
    kneeCapR: 7.0,
  });
  const legFarSeg = buildTwoJointLegSegments(tintCanvas(rawLeg, 0.84, 0.85, 0.92), {
    srcHipX: 181,
    srcHipY: 312,
    neutralRotDeg: 18,
    dstHipX: 165,
    dstHipY: 300,
    kneeLen: 45,
    hipCapColor: '#D0B6B2',
    kneeCapColor: '#D0B6B2',
    kneeCapR: 7.0,
  });

  const cleanBody = erasePolyInPlace(cleanUnder, legPoly, {
    shouldErase: (x, y, r, g, b) => !(x >= 192 && y <= 362 && b > 92 && b > r + 14),
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

  return { upperBody, legNearSeg, legFarSeg };
}

async function prepareWhaleSideParts() {
  const baseRaw = await loadImage(path.join(REPO_ROOT, 'assets/ai-girls/lyric-action-v13/source/whale_side_rainwalk.png'));
  const underRaw = await loadImage(path.join(REPO_ROOT, 'assets/ai-girls/lyric-action-v13/source/whale_side_rainwalk_leg_under.png'));
  const base = fitAndCutoutSolid(baseRaw);
  const under = fitAndCutoutSolid(underRaw);

  const frontLegPoly = [
    [116, 294], [160, 304], [156, 332], [142, 360], [134, 388],
    [120, 410], [80, 410], [52, 392], [52, 366], [90, 358], [104, 340], [112, 312],
  ];
  const rawFrontLeg = extractPolyLayer(base, frontLegPoly);
  const legNearSeg = buildTwoJointLegSegments(rawFrontLeg, {
    srcHipX: 138,
    srcHipY: 302,
    neutralRotDeg: -22,
    dstHipX: 150,
    dstHipY: 298,
    kneeLen: 46,
    hipCapColor: '#F7DBD0',
    kneeCapColor: '#F7DBD0',
    kneeCapR: 11,
  });
  const legFarSeg = buildTwoJointLegSegments(tintCanvas(rawFrontLeg, 0.84, 0.85, 0.92), {
    srcHipX: 138,
    srcHipY: 302,
    neutralRotDeg: -22,
    dstHipX: 162,
    dstHipY: 298,
    kneeLen: 46,
    hipCapColor: '#D0B6B2',
    kneeCapColor: '#D0B6B2',
    kneeCapR: 11,
  });

  const backLegErasePoly = [
    [126, 308], [193, 315], [206, 338], [218, 358], [232, 378],
    [232, 414], [132, 414], [126, 345],
  ];
  const upperBody = erasePolyInPlace(under, backLegErasePoly, {
    shouldErase: (x, y, r, g, b) => {
      if (x >= 191 && y <= 368 && b > 92 && b > r + 16) return false;
      return true;
    },
  });

  return { upperBody, legNearSeg, legFarSeg };
}

async function prepareDoubaoSideParts() {
  const underRaw = await loadImage(path.join(REPO_ROOT, 'assets/ai-girls/lyric-action-v13/source/doubao_step_leg_under.png'));
  const under = fitAndCutoutSolid(underRaw, { dyOffset: 48 });

  erasePolyInPlace(under, [[0, 0], [145, 0], [145, CELL_H], [0, CELL_H]], {
    shouldErase: (x, y, r, g, b) => {
      if (x >= 139 && y >= 228 && y <= 248 && r > 170) return false;
      return true;
    },
  });

  const legPoly = [[172, 314], [222, 314], [224, 412], [162, 412]];
  const rawLeg = extractPolyLayer(under, legPoly);
  const legNearSeg = buildTwoJointLegSegments(rawLeg, {
    srcHipX: 198,
    srcHipY: 316,
    neutralRotDeg: 0,
    dstHipX: 196,
    dstHipY: 318,
    kneeLen: 40,
    hipCapColor: null,
    kneeCapColor: '#232629',
    kneeCapR: 9.5,
  });
  const legFarSeg = buildTwoJointLegSegments(tintCanvas(rawLeg, 0.78, 0.80, 0.86), {
    srcHipX: 198,
    srcHipY: 316,
    neutralRotDeg: 0,
    dstHipX: 202,
    dstHipY: 318,
    kneeLen: 40,
    hipCapColor: null,
    kneeCapColor: '#1B1D20',
    kneeCapR: 9.5,
  });

  const upperBody = erasePolyInPlace(under, [[160, 326], [226, 326], [226, 414], [160, 414]]);
  return { upperBody, legNearSeg, legFarSeg };
}

async function prepareGptPushParts() {
  const sheet = await loadImage(path.join(REPO_ROOT, 'assets/ai-girls/lyric-action-v13/gpt_push_final_action.png'));
  const base = createCanvas(CELL_W, CELL_H);
  base.getContext('2d').drawImage(sheet, 0, 0, CELL_W, CELL_H, 0, 0, CELL_W, CELL_H);

  const frontLegPoly = [[122, 298], [156, 306], [166, 355], [168, 408], [116, 408], [120, 350]];
  const rawLeg = extractPolyLayer(base, frontLegPoly);
  const legNearSeg = buildTwoJointLegSegments(rawLeg, {
    srcHipX: 140,
    srcHipY: 306,
    neutralRotDeg: 0,
    dstHipX: 146,
    dstHipY: 304,
    kneeLen: 44,
    hipCapColor: '#F9E2DA',
    kneeCapColor: '#F9E2DA',
    kneeCapR: 10,
  });
  const legFarSeg = buildTwoJointLegSegments(tintCanvas(rawLeg, 0.82, 0.82, 0.90), {
    srcHipX: 140,
    srcHipY: 306,
    neutralRotDeg: 0,
    dstHipX: 160,
    dstHipY: 304,
    kneeLen: 44,
    hipCapColor: '#D5BDBA',
    kneeCapColor: '#D5BDBA',
    kneeCapR: 10,
  });

  const underSkirtBackdrop = createCanvas(CELL_W, CELL_H);
  const bg = underSkirtBackdrop.getContext('2d');
  bg.drawImage(base, 0, 0);
  erasePolyInPlace(underSkirtBackdrop, frontLegPoly);
  erasePolyInPlace(underSkirtBackdrop, [[174, 380], [206, 380], [206, 410], [174, 410]]);
  bg.fillStyle = '#E8E2F2';
  bg.beginPath();
  bg.moveTo(124, 302);
  bg.lineTo(166, 306);
  bg.lineTo(172, 392);
  bg.lineTo(116, 392);
  bg.closePath();
  bg.fill();

  const frontCapLayer = extractPolyLayer(base, [[0, 0], [CELL_W, 0], [CELL_W, 314], [0, 314]]);
  const emptyUpper = createCanvas(CELL_W, CELL_H);
  return { upperBody: emptyUpper, underSkirtBackdrop, frontCapLayer, legNearSeg, legFarSeg };
}

async function prepareGeminiParts() {
  const v10 = await loadImage(path.join(REPO_ROOT, 'assets/ai-girls/animated-v10/gemini.png'));
  const base = createCanvas(CELL_W, CELL_H);
  base.getContext('2d').drawImage(v10, 0, 0, CELL_W, CELL_H, 0, 0, CELL_W, CELL_H);

  const legUnderRaw = await loadImage(path.join(REPO_ROOT, 'assets/ai-girls/dance-v11/source/gemini_legunder.png'));
  const upperRaw = fitAndCutoutSolid(legUnderRaw, {
    checker: true,
    extraSeeds: [[184, 350], [184, 385], [165, 365], [202, 365]],
  });

  const rawLeftLeg = extractPolyLayer(base, [[150, 308], [184, 308], [184, 412], [150, 412]]);
  const legNearSeg = buildTwoJointLegSegments(rawLeftLeg, {
    srcHipX: 168,
    srcHipY: 312,
    neutralRotDeg: 0,
    dstHipX: 186,
    dstHipY: 310,
    kneeLen: 44,
    hipCapColor: '#FCE6DF',
    kneeCapColor: '#F5F7FF',
    kneeCapR: 9.5,
  });
  const legFarSeg = buildTwoJointLegSegments(tintCanvas(rawLeftLeg, 0.84, 0.85, 0.92), {
    srcHipX: 168,
    srcHipY: 312,
    neutralRotDeg: 0,
    dstHipX: 174,
    dstHipY: 310,
    kneeLen: 44,
    hipCapColor: '#D8C2C2',
    kneeCapColor: '#DCE1F2',
    kneeCapR: 9.5,
  });

  const hairBack = extractPolyLayer(upperRaw, [[0, 290], [142, 290], [152, 416], [0, 416]]);
  const hairBackR = extractPolyLayer(upperRaw, [[224, 290], [CELL_W, 290], [CELL_W, 416], [214, 416]]);
  const hairBackdrop = createCanvas(CELL_W, CELL_H);
  hairBackdrop.getContext('2d').drawImage(hairBack, 0, 0);
  hairBackdrop.getContext('2d').drawImage(hairBackR, 0, 0);
  erasePolyInPlace(hairBackdrop, [[0, 290], [CELL_W, 290], [CELL_W, 416], [0, 416]], {
    shouldErase: (x, y, r, g, b) => {
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      return r > 188 && g > 188 && b > 188 && (mx - mn) < 20;
    },
  });

  const frontSkirtAndHead = createCanvas(CELL_W, CELL_H);
  frontSkirtAndHead.getContext('2d').drawImage(upperRaw, 0, 0);
  erasePolyInPlace(frontSkirtAndHead, [[0, 326], [145, 326], [145, 416], [0, 416]]);
  erasePolyInPlace(frontSkirtAndHead, [[222, 326], [CELL_W, 326], [CELL_W, 416], [222, 416]]);
  erasePolyInPlace(frontSkirtAndHead, [[140, 324], [226, 324], [226, 416], [140, 416]], {
    shouldErase: (x, y, r, g, b) => {
      if (x >= 156 && x <= 210 && y >= 332) return true;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      return r > 188 && g > 188 && b > 188 && (mx - mn) < 22;
    },
  });

  return { upperBody: frontSkirtAndHead, underSkirtBackdrop: hairBackdrop, legNearSeg, legFarSeg };
}

async function buildWhaleBenchSit() {
  const raw = await loadImage(path.join(REPO_ROOT, 'assets/ai-girls/lyric-action-v13/source/whale_seat_side_v35.png'));
  const base = fitAndCutoutSolid(raw);
  const strip = createCanvas(CELL_W * WALK_FRAMES, CELL_H);
  const sg = strip.getContext('2d');
  for (let f = 0; f < WALK_FRAMES; f++) {
    const theta = (2 * Math.PI * f) / WALK_FRAMES;
    const cell = createCanvas(CELL_W, CELL_H);
    const cg = cell.getContext('2d');
    cg.drawImage(base, 0, Math.sin(theta) * 1.4);
    sg.drawImage(cell, f * CELL_W, 0);
  }
  return strip;
}

export const WALK_RIG_BUILDERS = {
  whale_walk_happy_2leg: async () => renderPetStyleWalkStrip({ ...(await prepareWhale34Parts({ sadFace: false })), facingRight: true }),
  whale_idle_happy_pet: async () => renderPetStyleIdleStrip({ ...(await prepareWhale34Parts({ sadFace: false })), facingRight: true }),
  whale_walk_sad_2leg: async () => renderPetStyleWalkStrip({ ...(await prepareWhale34Parts({ sadFace: true })), facingRight: true }),
  whale_idle_sad_pet: async () => renderPetStyleIdleStrip({ ...(await prepareWhale34Parts({ sadFace: true })), facingRight: true }),
  whale_walk_side_2leg: async () => renderPetStyleWalkStrip({ ...(await prepareWhaleSideParts()), facingRight: false }),
  whale_idle_side_pet: async () => renderPetStyleIdleStrip({ ...(await prepareWhaleSideParts()), facingRight: false }),
  whale_seat_side_bench: buildWhaleBenchSit,
  doubao_walk_side_2leg: async () => renderPetStyleWalkStrip({ ...(await prepareDoubaoSideParts()), facingRight: false }),
  doubao_idle_side_pet: async () => renderPetStyleIdleStrip({ ...(await prepareDoubaoSideParts()), facingRight: false }),
  gpt_push_walk_2leg: async () => renderPetStyleWalkStrip({ ...(await prepareGptPushParts()), facingRight: true, strideScale: 0.88 }),
  gpt_push_idle_pet: async () => renderPetStyleIdleStrip({ ...(await prepareGptPushParts()), facingRight: true }),
  gemini_walk_2leg: async () => renderPetStyleWalkStrip({ ...(await prepareGeminiParts()), facingRight: true, strideScale: 0.90 }),
  gemini_idle_pet: async () => renderPetStyleIdleStrip({ ...(await prepareGeminiParts()), facingRight: true }),
};

export async function ensureWalkRigAtlases(outDir = DEFAULT_WALK_CACHE_DIR, { force = false } = {}) {
  fs.mkdirSync(outDir, { recursive: true });
  const built = {};
  for (const [name, builder] of Object.entries(WALK_RIG_BUILDERS)) {
    const outPath = path.join(outDir, `${name}.png`);
    if (!force && fs.existsSync(outPath) && fs.statSync(outPath).size > 8192) {
      built[name] = outPath;
      continue;
    }
    const strip = await builder();
    fs.writeFileSync(outPath, strip.toBuffer('image/png'));
    built[name] = outPath;
  }
  return built;
}
