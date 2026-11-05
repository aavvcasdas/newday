// make_sprite.mjs — 把鲸鱼娘立绘切成可用的透明立绘（Day3 样片的形象层原料）
//
// 为什么需要这一步
//   v1/v2 用的是 video-fx 的 40 格像素骨架：脸只有 ~20 个格子，放到 1080p 特写必然"糊"。
//   本轮改用用户指定的高清立绘 `dafeiyu.webp`（1024×1024，颜色/服装/配饰的权威基准），
//   由本脚本做「四边泛洪去背 → 补头发缝隙里的白洞 → 去自带投影 → 压毛边 → 裁包围盒」。
//
// 关键点：只删与画面边缘连通的近白像素，围裙、蕾丝、袜子、眼睛里的大块白都不会掉。
//
// 用法：
//   node make_sprite.mjs <src> <dst> [--thresh 246] [--no-crop] [--debug]

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
function resolveCanvas() {
  for (const c of ['@napi-rs/canvas', '/tmp/node_render/node_modules/@napi-rs/canvas']) {
    try { return require(c); } catch (e) { /* next */ }
  }
  throw new Error('缺少 @napi-rs/canvas');
}
const { createCanvas, loadImage } = resolveCanvas();

const src = process.argv[2];
const dst = process.argv[3];
if (!src || !dst) {
  console.error('用法: node make_sprite.mjs <src> <dst> [--thresh 246] [--no-crop] [--debug]');
  process.exit(1);
}
const flag = (n) => process.argv.includes(n);
const num = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? Number(process.argv[i + 1]) : d; };
const THRESH = num('--thresh', 246);
const DEBUG = flag('--debug');
const DO_CROP = !flag('--no-crop');

const img = await loadImage(fs.readFileSync(src));
const W = img.width, H = img.height;
const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');
ctx.drawImage(img, 0, 0);
const id = ctx.getImageData(0, 0, W, H);
const d = id.data;
const px = (p) => [d[p * 4], d[p * 4 + 1], d[p * 4 + 2]];
const lum = (p) => { const [r, g, b] = px(p); return r * 0.299 + g * 0.587 + b * 0.114; };
const chroma = (p) => { const [r, g, b] = px(p); return Math.max(r, g, b) - Math.min(r, g, b); };
const isNearWhite = (p) => lum(p) >= THRESH && chroma(p) <= 12;
const isBlue = (p) => { const [r, g, b] = px(p); return b > r + 22 && b > 70; };

// ---------- 1. 四边泛洪：背景 ----------
const bg = new Uint8Array(W * H);
{
  const stack = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const p = y * W + x;
    if (bg[p] || !isNearWhite(p)) return;
    bg[p] = 1;
    stack.push(p);
  };
  for (let x = 0; x < W; x++) { push(x, 0); push(x, H - 1); }
  for (let y = 0; y < H; y++) { push(0, y); push(W - 1, y); }
  while (stack.length) {
    const p = stack.pop();
    const x = p % W, y = (p - x) / W;
    push(x - 1, y); push(x + 1, y); push(x, y - 1); push(x, y + 1);
  }
}

// ---------- 2. 头发缝隙里漏出来的背景白洞 ----------
// 判据（对这张立绘实测过，能干净分开"头发缝"和"蕾丝/围裙/袜子"）：
//   被完全包围（不碰画面边缘）+ 面积 60..3000px + bbox 四边外扩 3px 的"边圈"里，
//   四边都有 >50% 的像素属于**深/中海蓝发色**。
//   发缝：四边 0.69~0.97；白色蕾丝发箍 [0.66,0.61,0.76,0]（底边 0）→ 不会被误删。
// 实测：发色是 #4161a6 / #5b7fc8 一类（b≥118、b−r≥42）；裙子的深藏青是 b≈80，
// 用这个阈值就能把"头发缝"和"裙子上的白蕾丝"分开（蕾丝四边发色占比为 0）。
const HAIR = (p) => {
  const r = d[p * 4], g = d[p * 4 + 1], b = d[p * 4 + 2];
  return b >= 118 && b - r >= 42 && g < b;
};
const comp = new Int32Array(W * H).fill(-1);
let holesKilled = 0, holesPx = 0;
for (let p0 = 0; p0 < W * H; p0++) {
  if (bg[p0] || comp[p0] >= 0 || !isNearWhite(p0)) continue;
  const q = [p0];
  comp[p0] = 1;
  const cells = [];
  let border = 0;
  while (q.length) {
    const p = q.pop();
    cells.push(p);
    const x = p % W, y = (p - x) / W;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) { border++; continue; }
      const np = ny * W + nx;
      if (bg[np]) { border++; continue; }
      if (isNearWhite(np) && comp[np] < 0) { comp[np] = 1; q.push(np); }
    }
  }
  const n = cells.length;
  if (border > 0 || n < 60 || n > 3000) continue;
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (const p of cells) {
    const x = p % W, y = (p - x) / W;
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  const side = { T: [0, 0], B: [0, 0], L: [0, 0], R: [0, 0] };
  const rim = (x, y, k) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const p = y * W + x;
    if (isNearWhite(p) || bg[p]) return;
    side[k][0]++;
    if (HAIR(p)) side[k][1]++;
  };
  for (let x = x0 - 3; x <= x1 + 3; x++) for (let k = 1; k <= 3; k++) { rim(x, y0 - k, 'T'); rim(x, y1 + k, 'B'); }
  for (let y = y0 - 3; y <= y1 + 3; y++) for (let k = 1; k <= 3; k++) { rim(x0 - k, y, 'L'); rim(x1 + k, y, 'R'); }
  const ratios = ['T', 'B', 'L', 'R'].map((k) => (side[k][0] ? side[k][1] / side[k][0] : 0));
  if (DEBUG && n >= 200) console.log(`    comp ${n}px @(${x0},${y0})-(${x1},${y1}) sides=${ratios.map((v) => v.toFixed(2)).join('/')}`);
  // 判据 B：两腿之间那块"透过裙底看到的背景"（被裙摆/腿/鞋包围、纯白、位置贴脚）
  let minL = 999, sc = 0;
  for (const p of cells) { const l = lum(p); if (l < minL) minL = l; sc += chroma(p); }
  const meanC = sc / n;
  const legGap = y0 >= H * 0.88 && n >= 2000 && minL >= 246 && meanC <= 5;
  if (Math.min(...ratios) >= 0.35 || Math.min(...ratios) === 0 && false || legGap) {
    for (const p of cells) { d[p * 4 + 3] = 0; bg[p] = 1; }
    holesKilled++;
    holesPx += n;
  }
}
if (holesKilled) console.log(`  头发缝白洞 ${holesKilled} 处（${holesPx} px）已清掉`);

// ---------- 3. 背景置透明 ----------
let removed = 0;
for (let p = 0; p < W * H; p++) if (bg[p]) { d[p * 4 + 3] = 0; removed++; }

// ---------- 4. 去立绘自带的灰色地面投影 ----------
// 原图脚下有一圈淡蓝灰投影（实测 ≈ rgb(201,203,218)），只出现在底部 7%，
// 且都是"低饱和 + 亮"的像素；藏青的鞋和白色袜子都在更高的位置，不会被误伤。
for (let y = Math.floor(H * 0.93); y < H; y++) {
  for (let x = 0; x < W; x++) {
    const p = y * W + x;
    if (!d[p * 4 + 3]) continue;
    if (chroma(p) <= 26 && lum(p) >= 170) d[p * 4 + 3] = 0;
  }
}

// ---------- 5. 削掉白边 / 毛边（阶梯式）----------
// 原图是白底画稿，角色轮廓外有一圈纯白"描边"，抠完在深色背景上会变成发光的光晕。
// 分三档只吃「紧贴透明区」的浅色像素：第 1 档纯白 → 第 2 档浅灰白 → 第 3 档灰白。
// 每一档都要求相邻像素已经是透明的，所以最多只削掉 3px，不会啃到围裙/蕾丝内部；
// 发丝高光是高饱和蓝（chroma 大），不会被当成白边。
{
  const steps = [
    { l: 240, c: 14 },
    { l: 224, c: 24 },
    { l: 206, c: 34 }
  ];
  for (const st of steps) {
    for (let pass = 0; pass < 2; pass++) {
      const a0 = new Uint8Array(W * H);
      for (let p = 0; p < W * H; p++) a0[p] = d[p * 4 + 3];
      let killed = 0;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const p = y * W + x;
          if (!a0[p]) continue;
          if (lum(p) < st.l || chroma(p) > st.c) continue;
          let touch = false;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= W || ny >= H || a0[ny * W + nx] <= 80) { touch = true; break; }
          }
          if (touch) { d[p * 4 + 3] = 0; killed++; }
        }
      }
      if (!killed) break;
    }
  }
  // 半透明残渣清零，避免深色背景上出现灰雾
  for (let p = 0; p < W * H; p++) if (d[p * 4 + 3] < 64) d[p * 4 + 3] = 0;
}

ctx.putImageData(id, 0, 0);

// ---------- 6. 裁到包围盒（留 2% 边距）----------
let x0 = W, y0 = H, x1 = -1, y1 = -1;
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (d[(y * W + x) * 4 + 3] > 12) {
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
}
if (x1 < 0) throw new Error('去背后整张图都空了，检查 --thresh');
const pad = DO_CROP ? Math.round(Math.max(x1 - x0, y1 - y0) * 0.02) : 0;
const bx = Math.max(0, x0 - pad), by = Math.max(0, y0 - pad);
const bw = Math.min(W - bx, x1 - x0 + 1 + pad * 2);
const bh = Math.min(H - by, y1 - y0 + 1 + pad * 2);

const out = createCanvas(bw, bh);
out.getContext('2d').drawImage(canvas, bx, by, bw, bh, 0, 0, bw, bh);
fs.mkdirSync(path.dirname(dst), { recursive: true });
fs.writeFileSync(dst, out.toBuffer('image/png'));

// feet：立绘脚底到图片底边的距离比例（渲染器按这个对齐站位）
let lastRow = bh - 1;
for (let y = bh - 1; y >= 0; y--) {
  let any = false;
  for (let x = 0; x < bw; x++) if (out.getContext('2d').getImageData(x, y, 1, 1).data[3] > 24) { any = true; break; }
  if (any) { lastRow = y; break; }
}
console.log(`${path.basename(src)} → ${dst}`);
console.log(`  ${W}×${H} → ${bw}×${bh}  去背 ${((removed / (W * H)) * 100).toFixed(1)}%  脚底线 ${lastRow}/${bh} = ${(lastRow / bh).toFixed(3)}`);
