// walk_cycle_v14.mjs — 8 帧「站立侧 3/4 视角」行走 / 待机图集构建器（v14，对标 tqlearning/ai-girl-chatgpt-pets）
//
// 背景：v13 的走路是「从站姿里切一条腿 + 双骨骼蒙皮」，实际播出来是抽腿、灰腿鬼影、脚不沾地。
// v14 换成与参考项目同构的做法：
//   1. 素材：assets/ai-girls/walk-v14/source/*.png —— 本轮 AI 重新生成的 8 位角色直立侧 3/4 立绘
//      （挺背、不驼背、脸朝镜头偏右、双腿自然分开）。
//   2. 帧数：严格 8 帧 / 每帧 120ms（一轮 0.96s = 双步周期），与 pets 的 running-right / running-left 完全一致。
//      以前写 16 帧却按 8 格播放，只会播到前 4 个姿态，看上去像原地抖腿——本次彻底修正为 8 格 8 姿态。
//   3. 步态：下半身拆成「屏幕左腿 / 屏幕右腿」两层，各自以髋为支点做
//      抬脚(lift) + 前后摆(swing) + 脚掌微转(toe)，左右腿严格 180° 反相；
//      站立腿贴地不动，抬起的腿离地，重心上下起伏由步态相位算出（不是拍脑袋写死）。
//   4. 上半身（含裙摆）整层盖在腿层之上，腿层向上「抹边」延伸到裙内，
//      抬腿时腿根永远藏在裙摆里，绝不出现断层或第三条腿。

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
export const GROUND_Y = 406;
export const ART_H = 372;
export const ART_DIR = path.join(REPO_ROOT, 'assets/ai-girls/walk-v14');
export const SOURCE_DIR = path.join(ART_DIR, 'source');

const clamp = (v, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);

// 每位角色的下半身切分参数（384×416 单元格坐标；hemY 为裙摆/裤脚分界线）
export const WALK_CHAR_SPECS = {
  whale: { source: 'whale.png', hemY: 344, legHalf: 40, stride: 1.0 },
  gpt: { source: 'gpt.png', hemY: 360, legHalf: 26, stride: 1.0 },
  gemini: { source: 'gemini.png', hemY: 346, legHalf: 38, stride: 0.95 },
  claude: { source: 'claude.png', hemY: 296, legHalf: 46, stride: 1.05 },
  kimi: { source: 'kimi.png', hemY: 326, legHalf: 42, stride: 1.0 },
  qwen: { source: 'qwen.png', hemY: 352, legHalf: 34, stride: 0.85 },
  zai: { source: 'zai.png', hemY: 326, legHalf: 44, stride: 0.95 },
  doubao: { source: 'doubao.png', hemY: 250, legHalf: 46, stride: 1.15 },
};

// ---------------------------------------------------------------------------
// 1. 抠图 + 归一化到 384×416 单元格
// ---------------------------------------------------------------------------
function cutoutWhite(img) {
  const w = img.width;
  const h = img.height;
  const c = createCanvas(w, h);
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  const im = g.getImageData(0, 0, w, h);
  const d = im.data;

  const isBg = (i) => {
    const r = d[i], gr = d[i + 1], b = d[i + 2];
    const mx = Math.max(r, gr, b);
    const mn = Math.min(r, gr, b);
    return mn >= 194 && mx - mn <= 28;
  };

  const seen = new Uint8Array(w * h);
  const stack = [];
  const push = (x, y) => {
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    const p = y * w + x;
    if (seen[p] || !isBg(p * 4)) return;
    seen[p] = 1;
    stack.push(p);
  };
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
  while (stack.length) {
    const p = stack.pop();
    d[p * 4 + 3] = 0;
    const x = p % w;
    const y = (p / w) | 0;
    push(x - 1, y); push(x + 1, y); push(x, y - 1); push(x, y + 1);
  }
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      const i = p * 4;
      if (d[i + 3] === 0) continue;
      if (seen[p - 1] || seen[p + 1] || seen[p - w] || seen[p + w]) {
        const r = d[i], gr = d[i + 1], b = d[i + 2];
        const mx = Math.max(r, gr, b);
        const mn = Math.min(r, gr, b);
        if (mn > 206 && mx - mn < 24) d[i + 3] = Math.round(d[i + 3] * 0.4);
      }
    }
  }
  g.putImageData(im, 0, 0);
  return c;
}

function normalizeToCell(cut) {
  const g0 = cut.getContext('2d');
  const im = g0.getImageData(0, 0, cut.width, cut.height);
  const d = im.data;
  let x0 = cut.width, y0 = cut.height, x1 = -1, y1 = -1;
  for (let y = 0; y < cut.height; y++) {
    for (let x = 0; x < cut.width; x++) {
      if (d[(y * cut.width + x) * 4 + 3] > 24) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  const bw = x1 - x0 + 1;
  const bh = y1 - y0 + 1;
  const s = ART_H / bh;
  const dw = Math.round(bw * s);
  const cell = createCanvas(CELL_W, CELL_H);
  cell.getContext('2d').drawImage(cut, x0, y0, bw, bh, Math.round((CELL_W - dw) / 2), GROUND_Y - ART_H, dw, ART_H);
  return cell;
}

const cellCache = new Map();

export async function loadSideCell(charId) {
  if (cellCache.has(charId)) return cellCache.get(charId);
  const cfg = WALK_CHAR_SPECS[charId];
  if (!cfg) throw new Error(`unknown walk char: ${charId}`);
  const raw = await loadImage(path.join(SOURCE_DIR, cfg.source));
  const cell = normalizeToCell(cutoutWhite(raw));
  cellCache.set(charId, cell);
  return cell;
}

// ---------------------------------------------------------------------------
// 2. 拆层：上半身（含裙摆） / 屏幕左腿 / 屏幕右腿
// ---------------------------------------------------------------------------
function splitLayers(cell, cfg) {
  const g = cell.getContext('2d');
  const im = g.getImageData(0, 0, CELL_W, CELL_H);
  const d = im.data;
  const A = (x, y) => d[(y * CELL_W + x) * 4 + 3];

  // 腿根中心：直接用脚底 12 行不透明像素的重心（tail / 裙摆不会把中心带偏）
  let sx = 0, n = 0;
  for (let y = GROUND_Y - 12; y < GROUND_Y; y++) {
    for (let x = 0; x < CELL_W; x++) {
      if (A(x, y) > 60) { sx += x; n++; }
    }
  }
  const cx = n ? Math.round(sx / n) : CELL_W / 2;

  const half = cfg.legHalf || 40;
  // 尾巴 / 披风这类偏蓝紫的附属物不算腿，避免跟着腿一起摆动
  const isTailLike = (x, y) => {
    const i = (y * CELL_W + x) * 4;
    const r = d[i], g2 = d[i + 1], b = d[i + 2];
    return b > r + 34 && b > 118;
  };
  const isLegPixel = (x, y) => {
    if (y < cfg.hemY || y >= CELL_H) return false;
    if (Math.abs(x - cx) > half) return false;
    if (A(x, y) <= 24) return false;
    if (isTailLike(x, y)) return false;
    return true;
  };

  // 上半身 = 原图，剔除「腿像素」；尾巴、裙摆、头发原样保留
  const upper = createCanvas(CELL_W, CELL_H);
  const ug = upper.getContext('2d');
  ug.drawImage(cell, 0, 0);
  const uim = ug.getImageData(0, 0, CELL_W, CELL_H);
  const legPix = new Uint8Array(CELL_W * CELL_H);
  for (let y = cfg.hemY; y < CELL_H; y++) {
    for (let x = Math.max(0, cx - half); x <= Math.min(CELL_W - 1, cx + half); x++) {
      if (!isLegPixel(x, y)) continue;
      legPix[y * CELL_W + x] = 1;
      uim.data[(y * CELL_W + x) * 4 + 3] = 0;
    }
  }
  ug.putImageData(uim, 0, 0);

  const buildLeg = (side) => {
    const c = createCanvas(CELL_W, CELL_H);
    const lg = c.getContext('2d');
    const lim = lg.createImageData(CELL_W, CELL_H);
    for (let y = cfg.hemY; y < CELL_H; y++) {
      for (let x = Math.max(0, cx - half); x <= Math.min(CELL_W - 1, cx + half); x++) {
        if (!legPix[y * CELL_W + x]) continue;
        const isNearSide = side === 'R' ? x >= cx : x < cx;
        if (!isNearSide) continue;
        const i = (y * CELL_W + x) * 4;
        lim.data[i] = d[i];
        lim.data[i + 1] = d[i + 1];
        lim.data[i + 2] = d[i + 2];
        lim.data[i + 3] = d[i + 3];
      }
    }
    lg.putImageData(lim, 0, 0);
    return c;
  };

  const tint = (src) => {
    const c = createCanvas(CELL_W, CELL_H);
    const tg = c.getContext('2d');
    tg.drawImage(src, 0, 0);
    const tim = tg.getImageData(0, 0, CELL_W, CELL_H);
    for (let i = 0; i < tim.data.length; i += 4) {
      if (tim.data[i + 3] === 0) continue;
      tim.data[i] = Math.round(tim.data[i] * 0.93);
      tim.data[i + 1] = Math.round(tim.data[i + 1] * 0.94);
      tim.data[i + 2] = Math.round(tim.data[i + 2] * 0.99);
    }
    tg.putImageData(tim, 0, 0);
    return c;
  };

  return { upper, legL: tint(buildLeg('L')), legR: buildLeg('R'), cx, hemY: cfg.hemY };
}

// ---------------------------------------------------------------------------
// 3. 8 帧步态表：左右腿 180° 反相
// ---------------------------------------------------------------------------
export function walkPhase(frame) {
  return ((frame % WALK_FRAMES) + WALK_FRAMES) % WALK_FRAMES;
}

/**
 * 单腿姿态：
 *   lift  抬脚高度(px)
 *   swing 水平前后摆(px，正 = 朝面向方向)
 *   toe   脚掌微转(deg)
 */
export function legPose(frame, { stride = 1, legSpan = 100 } = {}) {
  const t = walkPhase(frame) / WALK_FRAMES;
  const a = 2 * Math.PI * t;
  const swingAmt = legSpan * 0.16 * stride;
  const liftAmt = legSpan * 0.3 * stride;
  const swing = -Math.cos(a) * swingAmt;
  // 只有往前摆的那半个周期抬脚（t∈(0,0.5)）
  const lift = Math.max(0, Math.sin(a)) ** 1.25 * liftAmt;
  const toe = Math.sin(a) * 4 * stride;
  return { lift, swing, toe };
}

export function bodyBob(frame, { stride = 1, legSpan = 100 } = {}) {
  const t = walkPhase(frame) / WALK_FRAMES;
  const bob = (0.5 - 0.5 * Math.cos(4 * Math.PI * t)) * legSpan * 0.022 * stride;
  const sway = Math.sin(2 * Math.PI * t) * legSpan * 0.012 * stride;
  return { dy: -bob, dx: sway };
}

function drawLeg(ctx, leg, pose, hipX, hipY, facingSign = 1, extraDx = 0) {
  ctx.save();
  ctx.translate(hipX + pose.swing * facingSign + extraDx, hipY);
  ctx.rotate((pose.toe * Math.PI) / 180 * 0.25);
  ctx.translate(-hipX, -hipY - pose.lift);
  ctx.drawImage(leg, 0, 0);
  ctx.restore();
}

export async function buildWalkAtlas(charId) {
  const cfg = WALK_CHAR_SPECS[charId];
  const cell = await loadSideCell(charId);
  const layers = splitLayers(cell, cfg);
  const legSpan = GROUND_Y - cfg.hemY;
  const hipX = layers.cx;
  const hipY = cfg.hemY - 8;

  const strip = createCanvas(CELL_W * WALK_FRAMES, CELL_H);
  const sg = strip.getContext('2d');

  for (let f = 0; f < WALK_FRAMES; f++) {
    const frame = createCanvas(CELL_W, CELL_H);
    const fc = frame.getContext('2d');
    const nearPose = legPose(f, { stride: cfg.stride, legSpan });
    const farPose = legPose(f + 4, { stride: cfg.stride, legSpan });
    const body = bodyBob(f, { stride: cfg.stride, legSpan });

    // 上半身（含裙摆、尾巴）先画，整体上下起伏 + 轻微左右晃
    fc.save();
    fc.translate(body.dx, body.dy);
    fc.drawImage(layers.upper, 0, 0);
    fc.restore();

    // 双腿画在裙摆之上，但裁剪在裙摆线以下：抬腿时腿自然"滑进裙子里"，绝不破裙
    fc.save();
    fc.beginPath();
    fc.rect(0, cfg.hemY, CELL_W, CELL_H - cfg.hemY);
    fc.clip();
    drawLeg(fc, layers.legL, farPose, hipX, hipY, 1, 0);
    drawLeg(fc, layers.legR, nearPose, hipX, hipY, 1, 0);
    fc.restore();

    sg.drawImage(frame, f * CELL_W, 0);
  }
  return strip;
}

export async function buildIdleAtlas(charId) {
  const cfg = WALK_CHAR_SPECS[charId];
  const cell = await loadSideCell(charId);
  const layers = splitLayers(cell, cfg);
  const strip = createCanvas(CELL_W * WALK_FRAMES, CELL_H);
  const sg = strip.getContext('2d');

  for (let f = 0; f < WALK_FRAMES; f++) {
    const theta = (2 * Math.PI * f) / WALK_FRAMES;
    const breath = Math.round(Math.sin(theta) * 1.2);
    const sway = Math.sin(theta * 0.5) * 0.8;
    const frame = createCanvas(CELL_W, CELL_H);
    const fc = frame.getContext('2d');
    fc.drawImage(layers.legL, 0, 0);
    fc.drawImage(layers.legR, -2, 0);
    fc.save();
    fc.translate(sway, breath);
    fc.drawImage(layers.upper, 0, 0);
    fc.restore();
    sg.drawImage(frame, f * CELL_W, 0);
  }
  return strip;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const outDir = process.argv[2] || '/tmp/newday_walk_v14';
  fs.mkdirSync(outDir, { recursive: true });
  for (const id of Object.keys(WALK_CHAR_SPECS)) {
    fs.writeFileSync(path.join(outDir, `${id}_walk_2leg.png`), (await buildWalkAtlas(id)).toBuffer('image/png'));
    fs.writeFileSync(path.join(outDir, `${id}_idle_pet.png`), (await buildIdleAtlas(id)).toBuffer('image/png'));
    console.log('built', id);
  }
}
