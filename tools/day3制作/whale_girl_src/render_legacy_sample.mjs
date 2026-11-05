// render_legacy_sample.mjs — 复刻旧版 28 个动作的样片（1920×1080 / 30fps / 无音轨）
//
// 顺序：开场卡 → 28 个旧版动作逐个表演 → 收尾卡。
// 每个动作：旧版中文名 + 旧版 id + 当前用的高清立绘 + 骨架视图小窗（前 1.1s 淡出）。
// 用法：
//   node render_legacy_sample.mjs --stills   # 只出静帧
//   node render_legacy_sample.mjs            # 出片到 Day3/成片/旧动作复刻样片/
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { buildRig, drawRigged, skeletonOverlay } from './whale_rig.mjs';
import { POSES } from './whale_poses.mjs';
import { LEGACY_ACTIONS, poseAt, motionAt } from './legacy_actions.mjs';

const require = createRequire(import.meta.url);
let canvasPkg;
try { canvasPkg = require('@napi-rs/canvas'); }
catch { canvasPkg = require('/tmp/node_render/node_modules/@napi-rs/canvas'); }
const { createCanvas, loadImage, GlobalFonts } = canvasPkg;

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../../..');
const OUT_DIR = path.join(REPO, 'Day3/成片/旧动作复刻样片');
const OUT_FILE = path.join(OUT_DIR, 'whale旧动作复刻_骨架版v1.mp4');

const W = 1920, H = 1080, FPS = 30;
const INTRO = 3.0, OUTRO = 3.0;
const CARD = 2.6;

try {
  GlobalFonts.registerFromPath(path.join(REPO, 'video-fx/assets/fonts/NotoSansSC-Bold.ttf'), 'NotoSansSC');
  GlobalFonts.registerFromPath(path.join(REPO, 'video-fx/assets/fonts/ZCOOLKuaiLe-Regular.ttf'), 'ZCOOLKuaiLe');
} catch (e) { console.warn('字体注册失败:', e.message); }

function resolveFfmpeg() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  const dirs = [
    '/tmp/venv/lib/python3.11/site-packages/imageio_ffmpeg/binaries',
    '/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries',
    '/usr/lib/python3/dist-packages/imageio_ffmpeg/binaries'
  ];
  for (const d of dirs) {
    if (!fs.existsSync(d)) continue;
    const bin = fs.readdirSync(d).find(f => f.startsWith('ffmpeg'));
    if (bin) return path.join(d, bin);
  }
  return 'ffmpeg';
}

// ---------------------------------------------------------------- 载入姿势骨架
const ctxFactory = (w, h) => createCanvas(w, h);
const usedPoses = new Set();
for (const a of LEGACY_ACTIONS) for (const p of a.poses) usedPoses.add(p.pose);
const rigs = {};
for (const p of usedPoses) {
  const meta = POSES[p];
  if (!meta) { console.warn('缺姿势注册:', p); continue; }
  const img = await loadImage(path.join(HERE, meta.file));
  rigs[p] = buildRig(img, { ctxFactory });
}
console.log(`姿势骨架：${Object.keys(rigs).length} 副 / 旧动作 ${LEGACY_ACTIONS.length} 个`);

// ---------------------------------------------------------------- 小零件
const C = { ink: '#0B1224', cyan: '#48C8FF', gold: '#F5C542', cream: '#F5EFE4', dim: 'rgba(148,163,184,0.9)' };
const glow = (ctx, x, y, r, color, alpha) => {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
};
function paintPath(ctx, pts, o) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  if (o.fill) { ctx.fillStyle = o.fill; ctx.globalAlpha = (o.fillOp ?? 255) / 255; ctx.fill(); ctx.globalAlpha = 1; }
  if (o.ink) { ctx.strokeStyle = o.ink; ctx.lineWidth = o.sw || 2; ctx.stroke(); }
}
function starPts(cx, cy, R, r, n = 5, rot = -Math.PI / 2) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i * Math.PI) / n;
    const rr = i % 2 ? r : R;
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return pts;
}
function emote(ctx, x, y, u, key, t) {
  if (!key) return;
  const bob = Math.sin(t * 5) * 0.05 * u;
  const ex = x + 2.2 * u, ey = y - 9.6 * u + bob;
  if (key === 'sweat') {
    paintPath(ctx, [[ex, ey - 0.3 * u], [ex + 0.24 * u, ey + 0.08 * u], [ex + 0.12 * u, ey + 0.3 * u], [ex - 0.12 * u, ey + 0.3 * u], [ex - 0.24 * u, ey + 0.08 * u]],
      { fill: '#38BDF8', fillOp: 210, ink: '#0C4A6E', sw: 2 });
  } else if (key === 'exclaim' || key === 'question') {
    ctx.save();
    ctx.beginPath(); ctx.arc(ex, ey, 0.34 * u, 0, Math.PI * 2);
    ctx.fillStyle = key === 'exclaim' ? '#FEE2E2' : '#FEF3C7'; ctx.fill();
    ctx.strokeStyle = key === 'exclaim' ? '#B91C1C' : '#B45309'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = key === 'exclaim' ? '#B91C1C' : '#B45309';
    ctx.font = `900 ${Math.round(0.46 * u)}px "NotoSansSC", sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(key === 'exclaim' ? '!' : '?', ex, ey + 1);
    ctx.restore();
  } else if (key === 'sparkle') {
    for (let i = 0; i < 3; i++) {
      const a = t * 0.9 + i * 2.1;
      paintPath(ctx, starPts(ex + 0.30 * Math.cos(a) * u, ey + 0.28 * Math.sin(a) * u, 0.22 * u, 0.08 * u),
        { fill: C.gold, fillOp: 235, ink: '#8A6A16', sw: 1.5 });
    }
  } else if (key === 'heart') {
    ctx.save();
    ctx.translate(ex, ey); ctx.scale(u * 0.30, u * 0.30);
    ctx.beginPath();
    ctx.moveTo(0, 0.7); ctx.bezierCurveTo(-1.4, -0.3, -0.6, -1.2, 0, -0.5);
    ctx.bezierCurveTo(0.6, -1.2, 1.4, -0.3, 0, 0.7);
    ctx.fillStyle = '#FB7185'; ctx.fill();
    ctx.strokeStyle = '#9F1239'; ctx.lineWidth = 3; ctx.stroke();
    ctx.restore();
  } else if (key === 'note') {
    ctx.save();
    ctx.fillStyle = C.cream;
    ctx.font = `900 ${Math.round(0.6 * u)}px "NotoSansSC", sans-serif`;
    ctx.fillText('♪', ex, ey);
    ctx.restore();
  } else if (key === 'sleep') {
    ctx.save();
    ctx.fillStyle = 'rgba(226,232,240,0.9)';
    ctx.font = `900 ${Math.round(0.5 * u)}px "NotoSansSC", sans-serif`;
    ctx.fillText('z', ex, ey - 0.3 * u);
    ctx.font = `900 ${Math.round(0.36 * u)}px "NotoSansSC", sans-serif`;
    ctx.fillText('z', ex + 0.5 * u, ey - 0.8 * u);
    ctx.restore();
  }
}

// ---------------------------------------------------------------- 背景
function background(ctx, t) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0E1A33'); g.addColorStop(0.7, '#16233F'); g.addColorStop(1, '#0A1526');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(8,16,32,0.55)'; ctx.fillRect(0, 828, W, H - 828);
  ctx.strokeStyle = 'rgba(96,165,250,0.18)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, 828); ctx.lineTo(W, 828); ctx.stroke();
  glow(ctx, W * 0.5, 700, 470, 'rgba(72,200,255,0.14)', 0.6);
  glow(ctx, W * 0.24, 420, 300, 'rgba(245,197,66,0.07)', 0.5);
  for (let i = 0; i < 15; i++) {
    const x = 50 + i * 132, y = 76 + Math.sin(t * 1.3 + i) * 6;
    glow(ctx, x, y, 11, i % 2 ? 'rgba(245,197,66,0.8)' : 'rgba(72,200,255,0.8)', 0.45);
  }
}

function header(ctx, t) {
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 28px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
  ctx.fillStyle = C.gold;
  ctx.fillText('鲸鱼娘 · 旧版动作复刻', 46, 50);
  ctx.font = 'bold 17px "NotoSansSC", sans-serif';
  ctx.fillStyle = C.dim;
  ctx.fillText(`video-fx ACTION_LIST 的 ${LEGACY_ACTIONS.length} 个动作 → 高清立绘 + 10 骨骨架重做`, 46, 86);
  ctx.textAlign = 'right';
  ctx.font = 'bold 17px "NotoSansSC", sans-serif';
  ctx.fillStyle = 'rgba(226,232,240,0.85)';
  ctx.fillText('非官方同人 · AI 生成内容', W - 46, 50);
  ctx.font = '15px "NotoSansSC", sans-serif';
  ctx.fillStyle = 'rgba(148,163,184,0.75)';
  ctx.fillText('无配音样片 · 占位节奏', W - 46, 80);
}

function plate(ctx, title, sub, idx, total, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 46px "NotoSansSC", sans-serif';
  const tw = ctx.measureText(title).width;
  ctx.fillStyle = 'rgba(11,18,36,0.86)';
  const x = 46, y = 900, w = Math.max(460, tw + 220), h = 118;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, 16); else ctx.rect(x, y, w, h);
  ctx.fill();
  ctx.strokeStyle = 'rgba(72,200,255,0.6)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = C.cream;
  ctx.fillText(title, x + 32, y + 44);
  ctx.font = 'bold 19px "NotoSansSC", sans-serif';
  ctx.fillStyle = 'rgba(148,163,184,0.95)';
  ctx.fillText(sub, x + 32, y + 84);
  // 序号
  ctx.textAlign = 'right';
  ctx.font = 'bold 26px "NotoSansSC", sans-serif';
  ctx.fillStyle = 'rgba(245,197,66,0.95)';
  ctx.fillText(`${String(idx + 1).padStart(2, '0')} / ${total}`, x + w - 28, y + 44);
  ctx.restore();
}

function progressBar(ctx, idx, total, lt, dur) {
  const x = 46, y = H - 26, w = W - 92, h = 8;
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ctx.fillRect(x, y, w, h);
  const seg = w / total;
  ctx.fillStyle = 'rgba(72,200,255,0.55)';
  ctx.fillRect(x, y, seg * idx, h);
  ctx.fillStyle = C.gold;
  ctx.fillRect(x + seg * idx, y, seg * Math.min(1, lt / dur), h);
}

// ---------------------------------------------------------------- 单帧
const N = LEGACY_ACTIONS.length;
const TOTAL = INTRO + N * CARD + OUTRO;

function drawAction(ctx, idx, lt) {
  const a = LEGACY_ACTIONS[idx];
  const { pose, prev, blend } = poseAt(a, lt);
  const anim = motionAt(a, lt);
  const rig = rigs[pose];
  if (!rig) return;
  const u = 62, y = 900;
  // 走路/跑步要在画面里真的移动：按 travel 从右往左走（读者视线方向），
  // 起终点都留在安全区内，不撞骨架小窗和底部字幕条。
  const travel = process.env.STRIP_NO_TRAVEL ? 0 : (a.travel || 0);
  // drawRigged 的 x 是立绘左缘；这里按人物中线算起点，让走/跑从和其他卡片一样的位置出发，
  // 再沿中线向左走 travel 像素。
  const spriteH = 12 * u;
  const cxo = (rig.bbox.x + rig.bbox.w / 2) * (spriteH / rig.h);
  const x = travel
    ? 1500 - travel * Math.min(1, lt / Math.max(0.6, a.dur * 0.92)) - cxo
    : 1150;
  // 交叉淡化：普通动作按动作表的 span 渐变；走路/跑步两拍交替太快，
  // 用 0.12s 的短淡化盖掉硬切，避免出现“双人叠影”。
  const ghost = a.travel
    ? (prev && rigs[prev] && lt >= a.dur * 0.5
        ? 0.40 * (1 - Math.min(1, (lt - a.dur * 0.5) / 0.12)) : 0)
    : (prev && rigs[prev] ? 0.45 * (1 - blend) : 0);
  if (ghost > 0.02) {
    drawRigged(ctx, rigs[prev], x, y, u, { anim: motionAt(a, lt - 0.001), alpha: ghost });
  }
  drawRigged(ctx, rig, x, y, u, { anim });
  // 骨架视图：单独一个右上小窗，不叠在人物身上（叠上去像乱线，看不清动作）
  const bx = travel ? Math.max(300, Math.min(372, x - 700)) : 372, by = 700, bu = 21;
  ctx.save();
  ctx.fillStyle = 'rgba(8,16,32,0.45)';
  ctx.strokeStyle = 'rgba(96,165,250,0.30)';
  ctx.lineWidth = 2;
  if (ctx.roundRect) {
    ctx.beginPath(); ctx.roundRect(bx - 210, by - 452, 420, 496, 14); ctx.fill(); ctx.stroke();
  }
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 15px "NotoSansSC", sans-serif';
  ctx.fillStyle = 'rgba(148,163,184,0.85)';
  ctx.fillText('骨架视图（同一帧）', bx - 188, by - 426);
  ctx.globalAlpha = 0.34;
  drawRigged(ctx, rig, bx, by, bu, { anim, alpha: 0.34, shadow: false });
  skeletonOverlay(ctx, rig, bx, by, bu);
  ctx.restore();
  emote(ctx, x, y - 0.2 * u, u, a.emote, lt);
  plate(ctx, a.zh, `${a.id} · 立绘 ${POSES[pose]?.file || pose}`, idx, N);
  progressBar(ctx, idx, N, lt, CARD);
}

function drawScene(ctx, t) {
  background(ctx, t);
  header(ctx, t);
  if (t < INTRO) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 66px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
    ctx.fillStyle = C.cream;
    ctx.fillText('旧版的 28 个动作，一个不落', W / 2, 168);
    ctx.font = 'bold 28px "NotoSansSC", sans-serif';
    ctx.fillStyle = 'rgba(191,230,255,0.9)';
    ctx.fillText('先按旧动作清单重画高清姿势，再用 10 骨骨架驱动', W / 2, 228);
    ctx.font = 'bold 20px "NotoSansSC", sans-serif';
    ctx.fillStyle = 'rgba(148,163,184,0.9)';
    ctx.fillText('video-fx/src/whale_girl_actions.js › ACTION_LIST', W / 2, 274);
    const rig = rigs.idle;
    drawRigged(ctx, rig, 560, 940, 50, { anim: { root: { dy: -6 } } });
    drawRigged(ctx, rig, 1240, 940, 50, { anim: { root: { dy: -6 } }, alpha: 0.28, shadow: false });
    skeletonOverlay(ctx, rig, 1240, 940, 50);
    ctx.textAlign = 'center';
    ctx.font = 'bold 18px "NotoSansSC", sans-serif';
    ctx.fillStyle = 'rgba(148,163,184,0.8)';
    ctx.fillText('成品', 560, 972);
    ctx.fillText('骨架', 1240, 972);
    return;
  }
  if (t >= INTRO + N * CARD) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 66px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
    ctx.fillStyle = C.gold;
    ctx.fillText(`28 / 28 全部复刻`, W / 2, 440);
    ctx.font = 'bold 28px "NotoSansSC", sans-serif';
    ctx.fillStyle = 'rgba(226,232,240,0.9)';
    ctx.fillText('姿势是高清差分图，动作由 10 骨骨架驱动，可以继续叠新动作', W / 2, 506);
    ctx.font = 'bold 20px "NotoSansSC", sans-serif';
    ctx.fillStyle = 'rgba(148,163,184,0.85)';
    ctx.fillText('非官方同人 · AI 生成内容 · 无配音占位样片', W / 2, 560);
    return;
  }
  const idx = Math.min(N - 1, Math.floor((t - INTRO) / CARD));
  drawAction(ctx, idx, t - INTRO - idx * CARD);
}

// ---------------------------------------------------------------- 出片
async function renderAll() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const ffmpeg = resolveFfmpeg();
  const total = Math.round(TOTAL * FPS);
  console.log(`旧动作复刻样片：${total} 帧 / ${TOTAL.toFixed(1)}s → ${OUT_FILE}`);
  const ff = spawn(ffmpeg, [
    '-y', '-f', 'rawvideo', '-vcodec', 'rawvideo', '-pix_fmt', 'rgba',
    '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-',
    '-an', '-c:v', 'libx264', '-preset', 'medium', '-tune', 'animation',
    '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUT_FILE
  ], { stdio: ['pipe', 'ignore', 'pipe'] });
  let err = '';
  ff.stderr.on('data', d => { err += d.toString(); });
  ff.stdin.on('error', e => { err += `\n[stdin] ${e.message}`; });
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  const t0 = Date.now();
  for (let f = 0; f < total; f++) {
    drawScene(ctx, f / FPS);
    const raw = canvas.data();
    const ok = ff.stdin.write(Buffer.from(raw.buffer, raw.byteOffset, raw.byteLength));
    if (!ok) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 150 === 0 || f === total - 1) {
      const el = (Date.now() - t0) / 1000;
      process.stdout.write(`\r  frame ${f + 1}/${total} (${((f + 1) / total * 100).toFixed(0)}%) ${((f + 1) / Math.max(0.1, el)).toFixed(1)}fps`);
    }
  }
  process.stdout.write('\n');
  ff.stdin.end();
  const code = await new Promise(r => ff.on('close', r));
  if (code !== 0) {
    console.error(err.split('\n').slice(-14).join('\n'));
    throw new Error(`ffmpeg exited ${code}`);
  }
  console.log(`✓ ${OUT_FILE} (${(fs.statSync(OUT_FILE).size / 1e6).toFixed(2)} MB)`);
}

// 快速验收：把某个动作卡片内的 12 帧拼成一张联络表，用来判断腿到底动没动
async function renderStrip(actionId) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const idx = LEGACY_ACTIONS.findIndex(a => a.id === actionId);
  if (idx < 0) throw new Error(`no such action: ${actionId}`);
  const cv = createCanvas(W, H);
  const ctx = cv.getContext('2d');
  const COLS = 4, ROWS = 3;
  const crop = (process.env.STRIP_CROP || '').split(',').map(Number);
  const useCrop = crop.length === 4 && crop.every((v) => Number.isFinite(v));
  const CW = useCrop ? crop[2] : Math.round(W / COLS / 2);
  const CH = useCrop ? crop[3] : Math.round(H / ROWS / 2);
  const sheet = createCanvas(CW * COLS, CH * ROWS);
  const sctx = sheet.getContext('2d');
  const a = LEGACY_ACTIONS[idx];
  const start = INTRO + idx * CARD;
  for (let i = 0; i < COLS * ROWS; i++) {
    const t = start + (a.dur * (i + 0.5)) / (COLS * ROWS);
    drawScene(ctx, t);
    if (useCrop) {
      sctx.drawImage(cv, crop[0], crop[1], crop[2], crop[3],
        (i % COLS) * CW, Math.floor(i / COLS) * CH, CW, CH);
    } else {
      sctx.drawImage(cv, (i % COLS) * CW, Math.floor(i / COLS) * CH, CW, CH);
    }
    sctx.fillStyle = 'rgba(0,0,0,0.55)';
    sctx.fillRect((i % COLS) * CW, Math.floor(i / COLS) * CH, 74, 20);
    sctx.fillStyle = '#fff';
    sctx.font = 'bold 13px sans-serif';
    sctx.fillText(`+${(t - start).toFixed(2)}s`, (i % COLS) * CW + 5, Math.floor(i / COLS) * CH + 15);
  }
  const out = path.join(OUT_DIR, `strip_${actionId}.png`);
  fs.writeFileSync(out, sheet.toBuffer('image/png'));
  console.log(`strip ${actionId} -> ${out}`);
}

async function renderStills() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  const pick = ['peek_curious', 'shy_fidget', 'ciallo_wink', 'camera_shutter', 'coin_hug', 'playful_fists', 'rose_bouquet', 'walk_brisk', 'run_sprint'];
  for (const id of pick) {
    const idx = LEGACY_ACTIONS.findIndex(a => a.id === id);
    if (idx < 0) continue;
    drawScene(ctx, INTRO + idx * CARD + CARD * 0.55);
    const f = path.join(OUT_DIR, `still_${id}.png`);
    fs.writeFileSync(f, canvas.toBuffer('image/png'));
    console.log('still', f);
  }
}

if (process.argv.includes('--stills')) await renderStills();
const stripArg = process.argv.indexOf('--strip');
if (stripArg >= 0) {
  for (const id of process.argv.slice(stripArg + 1).filter((v) => !v.startsWith('--'))) {
    await renderStrip(id);
  }
  process.exit(0);
}
else await renderAll();
