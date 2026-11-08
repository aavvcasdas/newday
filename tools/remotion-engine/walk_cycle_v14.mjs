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
// 逐帧成品立绘（对标上游 pets 的做法：8 帧各画一张全身，腿是真的画出来的）
export const FRAME_DIR = path.join(ART_DIR, 'frames');
export const FRAME_FILES = ['f1.png', 'f2.png', 'f3.png', 'f4.png', 'f5.png', 'f6.png', 'f7.png', 'f8.png'];

const clamp = (v, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);

// 每位角色的下半身切分参数（384×416 单元格坐标；hemY 为裙摆/裤脚分界线）
// stride = 步幅系数（1 = 常规步幅；<1 走路更收敛，比如双手推山是"压低重心往前挪"）
export const WALK_CHAR_SPECS = {
  whale: { source: 'whale.png', hemY: 344, legHalf: 44, stride: 1.0 },
  gpt: { source: 'gpt.png', hemY: 360, legHalf: 32, stride: 1.0 },
  gemini: { source: 'gemini.png', hemY: 330, legHalf: 46, stride: 1.0 },
  claude: { source: 'claude.png', hemY: 336, legHalf: 46, stride: 1.05 },
  kimi: { source: 'kimi.png', hemY: 300, legHalf: 42, stride: 1.0 },
  qwen: { source: 'qwen.png', hemY: 348, legHalf: 40, stride: 0.9 },
  zai: { source: 'zai.png', hemY: 340, legHalf: 44, stride: 1.0 },
  doubao: { source: 'doubao.png', hemY: 252, legHalf: 56, stride: 1.1 },
  // 双手推山（用力推）专用立绘：低重心、两腿前后蹬地，走"慢速发力"节奏
  // 长裙盖到小腿：腿层上边界压到裙摆以下，避免把裙摆底部啃掉一条横边
  gpt_push: { source: 'gpt_push.png', hemY: 330, legHalf: 40, stride: 0.8, legTop: 372 },
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

  // 背景是纯白 ~255；立绘里的白裙子常在 240~252，阈值放太低会把裙摆当成背景吃掉
  // （表现就是裙子变成半透明、腿层透出来变成灰色方块）。这里只吃"贴着纯白"的像素。
  const isBg = (i) => {
    const r = d[i], gr = d[i + 1], b = d[i + 2];
    const mx = Math.max(r, gr, b);
    const mn = Math.min(r, gr, b);
    return mn >= 241 && mx - mn <= 10;
  };

  // 生成图底部常压着一条"地面/投影"浅灰带（不是纯白，flood fill 进不去）：
  // 不剔掉的话包围盒会被撑到整张图，归一化后人物忽大忽小、脚下还挂一条灰边。
  const isFloorRow = (y) => {
    let grey = 0;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const r = d[i], gr = d[i + 1], b = d[i + 2];
      const mx = Math.max(r, gr, b);
      const mn = Math.min(r, gr, b);
      if (mx - mn <= 14 && mn > 180 && mn < 252) grey++;
    }
    return grey >= w * 0.9;
  };
  for (let y = h - 1; y >= 0 && isFloorRow(y); y--) {
    for (let x = 0; x < w; x++) d[(y * w + x) * 4 + 3] = 0;
  }

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
        if (mn > 228 && mx - mn < 16) d[i + 3] = Math.round(d[i + 3] * 0.45);
      }
    }
  }
  // 抗锯齿残留（alpha 1~48）铺满整张画布时，引擎里会显示成一整片淡色方块：
  // 48 以下直接清零，200 以上钉回实心，中间只保留真正的软边。
  for (let i = 3; i < d.length; i += 4) {
    if (d[i] < 48) d[i] = 0;
    else if (d[i] > 200) d[i] = 255;
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

/** 某角色是否有 8 张手绘/生成的逐帧成品立绘 */
export function frameFilesFor(charId) {
  const dir = path.join(FRAME_DIR, charId);
  const files = FRAME_FILES.map((f) => path.join(dir, f));
  return files.every((f) => fs.existsSync(f)) ? files : null;
}

/** 取 alpha 包围盒 + 上半身横向重心（头/躯干重心，腿怎么摆都不会把身体带偏） */
function alphaBoxAndCenter(canvas, topFrac = 0.38) {
  const w = canvas.width, h = canvas.height;
  const d = canvas.getContext('2d').getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] <= 24) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) return null;
  const bandTop = y0;
  const bandBottom = y0 + Math.max(8, Math.round((y1 - y0 + 1) * topFrac));
  let sx = 0, n = 0;
  for (let y = bandTop; y <= bandBottom; y++) {
    for (let x = x0; x <= x1; x++) {
      if (d[(y * w + x) * 4 + 3] > 40) { sx += x; n++; }
    }
  }
  return { x0, y0, x1, y1, centerX: n ? sx / n : (x0 + x1) / 2 };
}

/**
 * 逐帧成品模式：8 张全身立绘直接拼成图集，不做任何切腿/蒙皮。
 * 统一处理：抠白 → 按身高归一到 ART_H（每帧同高，腿张开也不会缩水）→ 脚底贴 GROUND_Y
 *          → 上半身重心对到单元格中线（腿摆动不会让整个人左右跳）。
 */
function drawToCanvas(img) {
  const c = createCanvas(img.width, img.height);
  c.getContext('2d').drawImage(img, 0, 0);
  return c;
}

function hasAlpha(img) {
  const c = drawToCanvas(img);
  const d = c.getContext('2d').getImageData(0, 0, img.width, img.height).data;
  for (let i = 3; i < d.length; i += 4 * 7) if (d[i] < 250) return true;
  return false;
}

function readFrameMeta(charId) {
  const p = path.join(FRAME_DIR, charId, 'meta.json');
  if (!fs.existsSync(p)) return {};
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return {}; }
}

async function buildFrameStrip(charId) {
  const files = frameFilesFor(charId);
  if (!files) return null;
  const meta = readFrameMeta(charId);
  const strip = createCanvas(CELL_W * WALK_FRAMES, CELL_H);
  const sg = strip.getContext('2d');
  for (let i = 0; i < files.length; i++) {
    const raw = await loadImage(files[i]);
    // 切片器出的是已经带 alpha 的 RGBA（blob 之外全透明）→ 不要再跑抠白，
    // 否则两腿之间那块"被包住的白底"会被白裙/白袜的阈值误伤或残留。
    const preCut = hasAlpha(raw);
    const cut = preCut ? drawToCanvas(raw) : cutoutWhite(raw);
    const box = alphaBoxAndCenter(cut);
    if (!box) throw new Error(`${charId} 第 ${i + 1} 帧是空的`);
    const bw = box.x1 - box.x0 + 1;
    const bh = box.y1 - box.y0 + 1;
    // 有 meta 就按"这一格画的地面线"缩放：脚正好踩在 GROUND_Y 上，尾巴垂到地面也不会把人物顶高
    const gY = meta['f' + (i + 1)] && Number.isFinite(meta['f' + (i + 1)].groundY)
      ? meta['f' + (i + 1)].groundY : null;
    // 尺寸统一按"人物自身身高"缩（每帧一样大），位置按格子里的地面线落（脚踩在地上）
    const s = ART_H / bh;
    const dw = Math.max(1, Math.round(bw * s));
    const dh = Math.max(1, Math.round(bh * s));
    const dx = Math.round(CELL_W / 2 - (box.centerX - box.x0) * s);
    const dy = gY != null
      ? Math.min(GROUND_Y, GROUND_Y - Math.round((gY - box.y0) * s))
      : GROUND_Y - Math.round(bh * s);
    sg.drawImage(cut, box.x0, box.y0, bw, bh, i * CELL_W + dx, dy, dw, dh);
  }
  return strip;
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

  // 腿部横向范围：取脚踝一带真实轮廓的外沿 + 余量，保证裁切边落在背景上（不留竖向残条）
  let autoHalf = cfg.legHalf || 40;
  for (let y = GROUND_Y - 26; y < GROUND_Y - 4; y++) {
    for (let x = 0; x < CELL_W; x++) {
      if (A(x, y) <= 24) continue;
      autoHalf = Math.max(autoHalf, Math.abs(x - cx) + 8);
    }
  }
  const half = Math.min(96, autoHalf);

  // 脚踝带（GROUND_Y-30 .. GROUND_Y-2）里腿像素的左右外沿，用来把劈分扫描限制在腿内部。
  // 老版本在 cx±scan 里找"最空的一列"，经常直接选到腿外侧的空白列：结果一条腿吃掉全部像素、
  // 另一条腿是空的，播出来就是"单腿顺拐滑步"（这是 v14 走路像滑行的真正原因）。
  let legLo = CELL_W, legHi = -1;
  for (let y = GROUND_Y - 30; y < GROUND_Y - 2; y++) {
    for (let x = Math.max(0, cx - half); x <= Math.min(CELL_W - 1, cx + half); x++) {
      if (A(x, y) > 24) { if (x < legLo) legLo = x; if (x > legHi) legHi = x; }
    }
  }
  if (legHi < 0) { legLo = cx - 20; legHi = cx + 20; }

  // 劈分点：两条腿之间的"山谷"列，只在腿内部搜（留 6px 余量，避免劈到腿的外沿）
  let splitX = Math.round((legLo + legHi) / 2);
  let bestCount = Infinity;
  for (let x = legLo + 6; x <= legHi - 6; x++) {
    if (x < 1 || x >= CELL_W - 1) continue;
    let count = 0;
    for (let y = cfg.hemY; y < GROUND_Y; y++) {
      if (A(x, y) > 24) count++;
    }
    if (count < bestCount) { bestCount = count; splitX = x; }
  }
  // 尾巴 / 披风这类偏蓝紫的附属物不算腿，避免跟着腿一起摆动
  const isTailLike = (x, y) => {
    const i = (y * CELL_W + x) * 4;
    const r = d[i], g2 = d[i + 1], b = d[i + 2];
    return b > r + 34 && b > 118;
  };
  // 腿层上边界：裙摆下沿再往下一点。裙摆底部那几行常常是阴影/衬里，
  // 跟着腿一起旋转就会变成一块"浮空的深色方块"，所以把它们留给上半身，钉在原地。
  const legTop = cfg.legTop != null ? cfg.legTop : Math.min(GROUND_Y - 8, cfg.hemY + 10);
  const isLegPixel = (x, y) => {
    if (y < legTop || y >= CELL_H) return false;
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
  for (let y = legTop; y < CELL_H; y++) {
    for (let x = Math.max(0, cx - half); x <= Math.min(CELL_W - 1, cx + half); x++) {
      if (!isLegPixel(x, y)) continue;
      legPix[y * CELL_W + x] = 1;
      uim.data[(y * CELL_W + x) * 4 + 3] = 0;
    }
  }
  ug.putImageData(uim, 0, 0);

  // 后腿压暗：侧视图里后腿本来就该比前腿暗一档，不然两条腿叠在一起分不清
  const darken = (src, k = 0.82) => {
    const c = createCanvas(CELL_W, CELL_H);
    const tg = c.getContext('2d');
    tg.drawImage(src, 0, 0);
    const tim = tg.getImageData(0, 0, CELL_W, CELL_H);
    for (let i = 0; i < tim.data.length; i += 4) {
      if (tim.data[i + 3] === 0) continue;
      tim.data[i] = Math.round(tim.data[i] * k);
      tim.data[i + 1] = Math.round(tim.data[i + 1] * k);
      tim.data[i + 2] = Math.round(tim.data[i + 2] * k * 1.03);
    }
    tg.putImageData(tim, 0, 0);
    return c;
  };

  // 单腿提取：取"前侧那条腿"的列切片，后腿用同一份复制（压暗），
  // 侧视图里两腿横向重叠时也能保证画面里始终是两条腿在反相迈步。
  const cols = new Array(CELL_W).fill(0);
  for (let x = Math.max(0, cx - half); x <= Math.min(CELL_W - 1, cx + half); x++) {
    let c = 0;
    for (let y = GROUND_Y - 34; y < GROUND_Y - 2; y++) if (legPix[y * CELL_W + x]) c++;
    cols[x] = c;
  }
  const runs = [];
  let runStart = null;
  for (let x = Math.max(0, cx - half); x <= Math.min(CELL_W - 1, cx + half); x++) {
    if (cols[x] > 0) {
      if (runStart === null) runStart = x;
    } else if (runStart !== null) {
      if (x - runStart >= 4) runs.push([runStart, x - 1]);
      runStart = null;
    }
  }
  if (runStart !== null) runs.push([runStart, Math.min(CELL_W - 1, cx + half)]);

  let sliceLo, sliceHi;
  if (runs.length >= 2) {
    // 两条腿在画面上是分开的：最靠前（右）的那一段就是前腿
    [sliceLo, sliceHi] = runs[runs.length - 1];
  } else {
    // 两腿在画面上粘成一片（侧视角下后腿被前腿挡住）：按 0.6 宽度从最前缘切一条腿
    const r = runs[0] || [cx - Math.round(half * 0.5), cx + Math.round(half * 0.5)];
    sliceHi = r[1];
    sliceLo = r[0] + Math.round((r[1] - r[0] + 1) * 0.4);
  }
  // 单腿上限定宽：并腿立绘（长裤/贴身长袜）切出来可能是"两条腿粘一起"的宽块，
  // 直接复制会变成四条腿，所以按前缘保留一条腿的宽度。
  const MAX_LEG_W = 66;
  if (sliceHi - sliceLo + 1 > MAX_LEG_W) sliceLo = sliceHi - MAX_LEG_W + 1;
  sliceLo = Math.max(0, sliceLo - 2);
  sliceHi = Math.min(CELL_W - 1, sliceHi + 2);

  const buildLegSlice = () => {
    const c = createCanvas(CELL_W, CELL_H);
    const lg = c.getContext('2d');
    const lim = lg.createImageData(CELL_W, CELL_H);
    for (let y = legTop; y < CELL_H; y++) {
      for (let x = sliceLo; x <= sliceHi; x++) {
        if (!legPix[y * CELL_W + x]) continue;
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
  const legSlice = buildLegSlice();
  const hipY = cfg.hemY - 10;
  return {
    upper,                          // 上身（已剔除腿部像素）
    legFar: darken(legSlice),       // 后腿：压暗，先画
    legNear: legSlice,              // 前腿：原色，后画
    cx,
    hipX: Math.round((sliceLo + sliceHi) / 2),
    hipY,
    legTop,
    legLen: GROUND_Y - hipY,
    slice: [sliceLo, sliceHi],
    runs: runs.length,
  };
}

// ---------------------------------------------------------------------------
// 3. 8 帧步态表：两条腿严格 180° 反相，绕髋关节做刚性旋转（不缩放、不拉伸像素）
// ---------------------------------------------------------------------------
export function walkPhase(frame) {
  return ((frame % WALK_FRAMES) + WALK_FRAMES) % WALK_FRAMES;
}

const PEAK_TILT = 0.30; // 最大摆角系数（弧度）：0.30 × stride ≈ 17°

/**
 * 单腿姿态（全部绕髋关节，纯旋转 + 竖直补偿）：
 *   rot   画布旋转弧度（负角度 = 脚朝面向方向踢出）
 *   lift  额外上抬(px)：给摆动腿抬脚用，同时抵消髋部下沉，保证脚不穿地
 *   swing 摆动相位权重 0..1（0 = 支撑期，脚必须踩死地面）
 *   tilt  前摆角度（正 = 朝面向方向）
 */
export function legPose(frame, { stride = 1, legLen = 100 } = {}) {
  const a = (2 * Math.PI * walkPhase(frame)) / WALK_FRAMES;
  const peak = PEAK_TILT * stride;
  const tilt = Math.cos(a) * peak;         // 极值 = 前后触地，0 = 从支撑腿旁边擦过
  const rot = -tilt;                       // canvas 旋转：负角度把脚送向 +x（面向方向）
  const swing = Math.max(0, -Math.sin(a)); // 只有"往前迈"的那半个周期是腾空相
  // 髋部下沉量由支撑腿的角度决定（腿越斜，髋越低），随后按每条腿自己的倾角补偿
  const hipDrop = legLen * (1 - Math.cos(peak * Math.abs(Math.cos(a))));
  const clearance = 0.14 * legLen * swing;
  const lift = Math.max(0, hipDrop - legLen * (1 - Math.cos(tilt))) + clearance;
  return { rot, tilt, lift, swing, hipDrop };
}

export function bodyBob(frame, { stride = 1, legLen = 100 } = {}) {
  const a = (2 * Math.PI * walkPhase(frame)) / WALK_FRAMES;
  const peak = PEAK_TILT * stride;
  const hipDrop = legLen * (1 - Math.cos(peak * Math.abs(Math.cos(a))));
  const sway = Math.sin(a) * legLen * 0.012 * stride;
  return { dy: hipDrop, dx: sway }; // dy 为正 = 整体下沉（髋越斜越低）
}

function drawLeg(ctx, leg, pose, hipX, hipY) {
  ctx.save();
  ctx.translate(hipX, hipY);
  ctx.rotate(pose.rot);
  ctx.translate(0, -pose.lift);
  ctx.translate(-hipX, -hipY);
  ctx.drawImage(leg, 0, 0);
  ctx.restore();
}

export async function buildWalkAtlas(charId) {
  const framed = await buildFrameStrip(charId);
  if (framed) return framed;              // 有逐帧成品立绘 → 直接拼，绕开所有切腿逻辑
  const cfg = WALK_CHAR_SPECS[charId];
  const cell = await loadSideCell(charId);
  const layers = splitLayers(cell, cfg);
  const hipX = layers.hipX;
  const hipY = layers.hipY;
  const legLen = layers.legLen;
  const spin = { stride: cfg.stride, legLen };

  const strip = createCanvas(CELL_W * WALK_FRAMES, CELL_H);
  const sg = strip.getContext('2d');

  for (let f = 0; f < WALK_FRAMES; f++) {
    const frame = createCanvas(CELL_W, CELL_H);
    const fc = frame.getContext('2d');
    const nearPose = legPose(f, spin);
    const farPose = legPose(f + WALK_FRAMES / 2, spin);
    const body = bodyBob(f, spin);

    // 整身随髋部起伏/侧移；腿层只出现在裙摆线以下，抬腿时"滑进裙子里"，绝不破裙
    // 注意：裁剪矩形必须画在"单元格坐标"里（先 clip 再 translate），
    // 否则整体下沉会把裁剪框也带下去，脚会踩到地面线以下。
    fc.save();
    fc.beginPath();
    fc.rect(0, layers.legTop, CELL_W, GROUND_Y - layers.legTop);
    fc.clip();
    fc.translate(body.dx, body.dy);
    drawLeg(fc, layers.legFar, farPose, hipX, hipY);   // 后腿
    drawLeg(fc, layers.legNear, nearPose, hipX, hipY); // 前腿
    fc.restore();
    // 上半身（含裙摆、尾巴）最后盖章：腿根的旋转切口被裙摆自然盖掉
    fc.save();
    fc.translate(body.dx, body.dy);
    fc.drawImage(layers.upper, 0, 0);
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
    fc.drawImage(layers.legFar, 0, 0);
    fc.drawImage(layers.legNear, -2, 0);
    fc.save();
    fc.translate(sway, breath);
    fc.drawImage(layers.upper, 0, 0);
    fc.restore();
    sg.drawImage(frame, f * CELL_W, 0);
  }
  return strip;
}

export function hasFrames(charId) {
  return Boolean(frameFilesFor(charId));
}

export async function __debugLayers(charId) {
  const cell = await loadSideCell(charId);
  const l = splitLayers(cell, WALK_CHAR_SPECS[charId]);
  return { ...l, legL: l.legFar, legR: l.legNear };
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
