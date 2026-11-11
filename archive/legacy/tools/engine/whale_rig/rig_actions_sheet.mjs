// rig_actions_sheet.mjs — 骨架动作连拍表：每个动作取 3 帧，肉眼验收变形质量
// 用法：node rig_actions_sheet.mjs [姿势=idle] [输出目录]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { buildRig, drawRigged } from './whale_rig.mjs';
import { RIG_ACTIONS, RIG_ACTION_NAMES } from './whale_rig_actions.mjs';

const require = createRequire(import.meta.url);
let canvasPkg;
try { canvasPkg = require('@napi-rs/canvas'); }
catch { canvasPkg = require('/tmp/node_render/node_modules/@napi-rs/canvas'); }
const { createCanvas, loadImage, GlobalFonts } = canvasPkg;

const HERE = path.dirname(fileURLToPath(import.meta.url));
const POSE = process.argv[2] || 'idle';
const OUT = process.argv[3] || path.join(HERE, 'rig_preview');
fs.mkdirSync(OUT, { recursive: true });
try { GlobalFonts.registerFromPath('/home/user/ai-yunying/video-fx/assets/fonts/NotoSansSC-Bold.ttf', 'NotoSansSC'); } catch {}

const ctxFactory = (w, h) => createCanvas(w, h);
const img = await loadImage(path.join(HERE, `whale_${POSE}.png`));
const rig = buildRig(img, { ctxFactory });

const names = RIG_ACTION_NAMES;
const cols = 3;
const cw = 260, ch = 330;
const cv = createCanvas(cw * cols + 210, ch * names.length + 20);
const ctx = cv.getContext('2d');
ctx.fillStyle = '#0E1830';
ctx.fillRect(0, 0, cv.width, cv.height);

names.forEach((name, row) => {
  const a = RIG_ACTIONS[name];
  ctx.font = 'bold 22px "NotoSansSC", sans-serif';
  ctx.fillStyle = '#BFE6FF';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, 18, row * ch + 40);
  ctx.font = '15px "NotoSansSC", sans-serif';
  ctx.fillStyle = 'rgba(191,230,255,0.55)';
  ctx.fillText(a.label, 18, row * ch + 66);
  ctx.fillStyle = 'rgba(191,230,255,0.35)';
  ctx.fillText(`${a.dur.toFixed(1)}s`, 18, row * ch + 88);
  for (let c = 0; c < cols; c++) {
    const t = (a.dur - 0.2) * (c / (cols - 1 || 1));
    const bx = 210 + c * cw + cw / 2;
    const by = row * ch + ch - 30;
    drawRigged(ctx, rig, bx, by, 22, { anim: a.fn(t) });
    ctx.font = '13px "NotoSansSC", sans-serif';
    ctx.fillStyle = 'rgba(148,163,184,0.75)';
    ctx.textAlign = 'center';
    ctx.fillText(`t=${t.toFixed(2)}s`, bx, row * ch + 20);
  }
});
const f = path.join(OUT, `actions_${POSE}.png`);
fs.writeFileSync(f, cv.toBuffer('image/png'));
console.log('wrote', f, `${names.length} 个动作`);
