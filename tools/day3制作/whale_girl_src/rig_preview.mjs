// rig_preview.mjs — 骨架自检：把 9 张立绘的骨架量出来、画出叠加图，并验证「静止姿势 == 原图」
// 用法：node rig_preview.mjs [输出目录]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { buildRig, drawRigged, skeletonOverlay, BONE_ORDER } from './whale_rig.mjs';

const require = createRequire(import.meta.url);
let canvasPkg;
try { canvasPkg = require('@napi-rs/canvas'); }
catch { canvasPkg = require('/tmp/node_render/node_modules/@napi-rs/canvas'); }
const { createCanvas, loadImage, GlobalFonts } = canvasPkg;

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = process.argv[2] || path.join(HERE, 'rig_preview');
fs.mkdirSync(OUT, { recursive: true });
try { GlobalFonts.registerFromPath('/home/user/ai-yunying/video-fx/assets/fonts/NotoSansSC-Bold.ttf', 'NotoSansSC'); } catch {}

import { POSE_NAMES } from './whale_poses.mjs';
const POSES = POSE_NAMES;   // 28 张姿势全部过一遍骨架自检

const cell = { w: 300, h: 420 };
const cols = Math.min(POSES.length, 7);
const rows = Math.ceil(POSES.length / cols);
const cv = createCanvas(cell.w * cols, cell.h * rows + 26);
const ctx = cv.getContext('2d');
ctx.fillStyle = '#101A33';
ctx.fillRect(0, 0, cv.width, cv.height);

const ctxFactory = (w, h) => createCanvas(w, h);
for (let i = 0; i < POSES.length; i++) {
  const img = await loadImage(path.join(HERE, `whale_${POSES[i]}.png`));
  const rig = buildRig(img, { ctxFactory });
  const col = i % cols, row = Math.floor(i / cols);
  const bx = col * cell.w + cell.w / 2;
  const by = row * cell.h + cell.h - 40;
  const u = 26;                     // 12u ≈ 312px 高
  // 左半格画原图（对照），右半格骨架 + 蒙皮静止姿势
  drawRigged(ctx, rig, bx, by, u, { anim: {} });
  skeletonOverlay(ctx, rig, bx, by, u);
  ctx.font = 'bold 18px "NotoSansSC", sans-serif';
  ctx.fillStyle = '#E2E8F0';
  ctx.textAlign = 'center';
  ctx.fillText(`${POSES[i]}`, bx, row * cell.h + 22);
  const b = rig.bbox;
  ctx.font = '12px "NotoSansSC", sans-serif';
  ctx.fillStyle = 'rgba(148,163,184,0.9)';
  ctx.fillText(`bbox ${Math.round(b.w)}×${Math.round(b.h)}`, bx, row * cell.h + 40);
}
const outFile = path.join(OUT, 'skeleton_all_poses.png');
fs.writeFileSync(outFile, cv.toBuffer('image/png'));
console.log('wrote', outFile);

// 静止姿势 vs 原图像素差（蒙皮在 rest 时应为恒等）
{
  const img = await loadImage(path.join(HERE, 'whale_idle.png'));
  const rig = buildRig(img, { ctxFactory });
  const a = createCanvas(img.width, img.height), ac = a.getContext('2d');
  ac.drawImage(img, 0, 0);
  const b = createCanvas(img.width, img.height), bc = b.getContext('2d');
  drawRigged(bc, rig, 0, rig.bbox.y + rig.bbox.h, img.height / 12, { shadow: false });
  const A = ac.getImageData(0, 0, img.width, img.height).data;
  const B = bc.getImageData(0, 0, img.width, img.height).data;
  let diff = 0, n = 0, maxd = 0;
  for (let i = 0; i < A.length; i += 4) {
    if (A[i + 3] < 8 && B[i + 3] < 8) continue;
    const d = Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]) + Math.abs(A[i + 3] - B[i + 3]);
    diff += d; n++; if (d > maxd) maxd = d;
  }
  fs.writeFileSync(path.join(OUT,'rest_render.png'), b.toBuffer('image/png'));
  console.log(`rest-pose 平均误差 ${(diff / Math.max(1, n)).toFixed(2)}/1020，最大 ${maxd}，采样像素 ${n}`);
}

// 打印骨架量化值，方便复核
for (const pose of ['idle', 'run']) {
  const img = await loadImage(path.join(HERE, `whale_${pose}.png`));
  const rig = buildRig(img, { ctxFactory });
  const round = (v) => Math.round(v * 10) / 10;
  console.log(pose, BONE_ORDER.map(n => `${n}(${round(rig.bones[n].head.x)},${round(rig.bones[n].head.y)}→${round(rig.bones[n].tail.x)},${round(rig.bones[n].tail.y)})`).join(' '));
}
