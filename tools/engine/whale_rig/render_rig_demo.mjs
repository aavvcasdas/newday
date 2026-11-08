// render_rig_demo.mjs — 骨架动作库演示片（1920×1080 / 30fps / 无音轨）
//
// 画面：左边是成品动作，右边是同一帧的骨架视图（角色压到 35% 不透明度 + 骨线），
// 每个动作一张卡，底部写着「第几个 / 动作中文名 / 内部 key」。
// 这样一眼能看出：动作不是靠换贴图，是同一张立绘被骨架带着弯。
//
// 用法：
//   node render_rig_demo.mjs                 # 出片到 Day3/成片/骨架演示/
//   node render_rig_demo.mjs --stills        # 只出几张静帧
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { buildRig, drawRigged, skeletonOverlay } from './whale_rig.mjs';
import { RIG_ACTIONS, RIG_ACTION_NAMES } from './whale_rig_actions.mjs';

const require = createRequire(import.meta.url);
let canvasPkg;
try { canvasPkg = require('@napi-rs/canvas'); }
catch { canvasPkg = require('/tmp/node_render/node_modules/@napi-rs/canvas'); }
const { createCanvas, loadImage, GlobalFonts } = canvasPkg;

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../../..');
const OUT_DIR = path.join(REPO, 'Day3/成片/骨架演示');
const OUT_FILE = path.join(OUT_DIR, 'whale骨架动作库_v1.mp4');

const W = 1920, H = 1080, FPS = 30;
const INTRO = 2.2, OUTRO = 2.6, CARD = 2.5;
const POSE_FOR = {
  breathe_idle: 'idle', bow_deep: 'idle', nod_yes: 'think', shake_no: 'point',
  wave_arm: 'wave', beckon_hand: 'wave', squat_jump: 'cheer', lean_back: 'shock',
  tiptoe_reach: 'think', hip_sway: 'point', spin_360: 'cheer', tail_whip: 'run',
  sigh_collapse: 'cry', kick_leg: 'run', heart_tilt: 'wave'
};

try {
  GlobalFonts.registerFromPath(path.join(REPO, 'video-fx/assets/fonts/NotoSansSC-Bold.ttf'), 'NotoSansSC');
  GlobalFonts.registerFromPath(path.join(REPO, 'video-fx/assets/fonts/ZCOOLKuaiLe-Regular.ttf'), 'ZCOOLKuaiLe');
} catch (e) { console.warn('字体注册失败（不影响出片，字会变系统字体）:', e.message); }

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

// ---------------------------------------------------------------- 载入 9 张立绘 + 骨架
const POSES = ['idle', 'wave', 'run', 'cry', 'shock', 'eat', 'point', 'think', 'cheer'];
const ctxFactory = (w, h) => createCanvas(w, h);
const rigs = {};
for (const p of POSES) {
  const img = await loadImage(path.join(HERE, `whale_${p}.png`));
  rigs[p] = buildRig(img, { ctxFactory });
}
console.log(`骨架：${POSES.length} 副（每副 10 骨 / 18×26 网格 / 900 三角）`);

// ---------------------------------------------------------------- 背景
const C = {
  ink: '#0B1224', bg1: '#0E1A33', bg2: '#16233F',
  cyan: '#48C8FF', gold: '#F5C542', cream: '#F5EFE4', dim: 'rgba(148,163,184,0.85)'
};
const glow = (ctx, x, y, r, color, alpha) => {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
};

function background(ctx, t) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, C.bg1); g.addColorStop(0.72, C.bg2); g.addColorStop(1, '#0A1526');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // 地板线 + 地面反光
  ctx.fillStyle = 'rgba(8,16,32,0.55)';
  ctx.fillRect(0, 812, W, H - 812);
  ctx.strokeStyle = 'rgba(96,165,250,0.18)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, 812); ctx.lineTo(W, 812); ctx.stroke();
  glow(ctx, W * 0.30, 640, 420, 'rgba(72,200,255,0.16)', 0.55);
  glow(ctx, W * 0.74, 640, 420, 'rgba(245,197,66,0.10)', 0.5);
  // 顶部小灯串
  for (let i = 0; i < 14; i++) {
    const x = 60 + i * 138, y = 84 + Math.sin(t * 1.4 + i) * 6;
    glow(ctx, x, y, 12, i % 2 ? 'rgba(245,197,66,0.85)' : 'rgba(72,200,255,0.85)', 0.5);
  }
}

function header(ctx, t, idx, total) {
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 30px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
  ctx.fillStyle = C.gold;
  ctx.fillText('鲸鱼娘 · 骨架动作库 v1', 44, 52);
  ctx.font = 'bold 19px "NotoSansSC", sans-serif';
  ctx.fillStyle = C.dim;
  ctx.fillText('同一副骨架 × 9 张立绘 × ' + total + ' 个骨骼动作', 44, 92);

  ctx.textAlign = 'right';
  ctx.font = 'bold 18px "NotoSansSC", sans-serif';
  ctx.fillStyle = 'rgba(226,232,240,0.85)';
  ctx.fillText('非官方同人 · AI 生成内容', W - 44, 52);
  ctx.fillStyle = 'rgba(148,163,184,0.75)';
  ctx.font = '16px "NotoSansSC", sans-serif';
  ctx.fillText('骨架 = 10 骨 / 线性混合蒙皮 / 900 三角贴图', W - 44, 84);

  // 右侧骨架视图的框
  ctx.strokeStyle = 'rgba(96,165,250,0.28)'; ctx.lineWidth = 2;
  ctx.strokeRect(W - 720, 150, 660, 700);
  ctx.textAlign = 'left';
  ctx.font = 'bold 18px "NotoSansSC", sans-serif';
  ctx.fillStyle = 'rgba(148,163,184,0.9)';
  ctx.fillText('骨架视图', W - 700, 182);
  ctx.font = '15px "NotoSansSC", sans-serif';
  ctx.fillStyle = 'rgba(148,163,184,0.6)';
  ctx.fillText('root / spine / head / arm×2 / leg×2 / hair×2 / tail', W - 700, 208);

  if (idx != null) {
    ctx.textAlign = 'right';
    ctx.font = 'bold 20px "NotoSansSC", sans-serif';
    ctx.fillStyle = 'rgba(191,230,255,0.9)';
    ctx.fillText(`${String(idx + 1).padStart(2, '0')} / ${total}`, W - 80, 182);
    ctx.textAlign = 'left';
  }
}

const BONE_LEGEND = [
  ['root', '#FDE047'], ['spine', '#F97316'], ['head', '#22D3EE'],
  ['armL/R', '#C084FC'], ['legL/R', '#34D399'], ['hairL/R', '#FB7185'], ['tail', '#60A5FA']
];
function legend(ctx) {
  ctx.font = 'bold 14px "NotoSansSC", sans-serif';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  const x0 = 44, colW = 124;
  BONE_LEGEND.forEach(([label, col], i) => {
    const x = x0 + (i % 4) * colW;
    const y = 990 + Math.floor(i / 4) * 26;
    ctx.fillStyle = col;
    ctx.fillRect(x, y - 2, 22, 5);
    ctx.fillStyle = 'rgba(203,213,225,0.82)';
    ctx.fillText(label, x + 30, y + 1);
  });
}

function footer(ctx, text, sub, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const bw = Math.max(520, ctx.measureText(text).width + 200);
  ctx.fillStyle = 'rgba(11,18,36,0.82)';
  const x = W / 2 - bw / 2, y = 946, h = 92;
  ctx.beginPath();
  if (ctx.roundRect) { ctx.roundRect(x, y, bw, h, 18); } else { ctx.rect(x, y, bw, h); }
  ctx.fill();
  ctx.strokeStyle = 'rgba(72,200,255,0.55)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.font = 'bold 34px "NotoSansSC", sans-serif';
  ctx.fillStyle = C.cream;
  ctx.fillText(text, W / 2, y + 36);
  ctx.font = 'bold 18px "NotoSansSC", sans-serif';
  ctx.fillStyle = 'rgba(148,163,184,0.9)';
  ctx.fillText(sub, W / 2, y + 68);
  ctx.restore();
}

// ---------------------------------------------------------------- 一帧
const N = RIG_ACTION_NAMES.length;
const TOTAL = INTRO + N * CARD + OUTRO;

function drawScene(ctx, t) {
  background(ctx, t);
  if (t < INTRO) {
    header(ctx, t, null, N);
    ctx.textAlign = 'center';
    ctx.font = 'bold 66px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
    ctx.fillStyle = C.cream;
    ctx.fillText('鲸鱼娘的立绘，拆成骨架了', W / 2, 470);
    ctx.font = 'bold 28px "NotoSansSC", sans-serif';
    ctx.fillStyle = 'rgba(191,230,255,0.85)';
    ctx.fillText('9 张姿势 → 10 骨骨架 + 蒙皮权重 → 15 个新动作', W / 2, 540);
    // 开场：idle 站姿 + 骨架透视
    const rig = rigs.idle;
    drawRigged(ctx, rig, 560, 860, 52, { anim: { root: { dy: -6 } } });
    drawRigged(ctx, rig, 1360, 860, 52, { anim: { root: { dy: -6 } }, alpha: 0.32 });
    skeletonOverlay(ctx, rig, 1360, 860, 52);
    return;
  }
  if (t >= INTRO + N * CARD) {
    header(ctx, t, null, N);
    ctx.textAlign = 'center';
    ctx.font = 'bold 62px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
    ctx.fillStyle = C.gold;
    ctx.fillText('15 个动作，同一副骨架', W / 2, 440);
    ctx.font = 'bold 26px "NotoSansSC", sans-serif';
    ctx.fillStyle = 'rgba(226,232,240,0.9)';
    ctx.fillText('动作可以叠在任意一张立绘上，也能直接接到 Day3 的分镜里', W / 2, 512);
    ctx.fillStyle = 'rgba(148,163,184,0.8)';
    ctx.font = 'bold 20px "NotoSansSC", sans-serif';
    ctx.fillText('非官方同人 · AI 生成内容 · 无配音演示片', W / 2, 566);
    return;
  }
  const i = Math.min(N - 1, Math.floor((t - INTRO) / CARD));
  const lt = t - INTRO - i * CARD;
  const name = RIG_ACTION_NAMES[i];
  const act = RIG_ACTIONS[name];
  const pose = POSE_FOR[name] || 'idle';
  const rig = rigs[pose];
  const anim = act.fn(lt);

  header(ctx, t, i, N);
  legend(ctx);
  // 左：成品动作
  drawRigged(ctx, rig, 560, 872, 54, { anim });
  // 右：骨架视图
  drawRigged(ctx, rig, 1360, 862, 47, { anim, alpha: 0.30, shadow: false });
  skeletonOverlay(ctx, rig, 1360, 862, 47);
  // 姿势来源标签
  ctx.textAlign = 'center';
  ctx.font = 'bold 16px "NotoSansSC", sans-serif';
  ctx.fillStyle = 'rgba(148,163,184,0.8)';
  ctx.fillText(`立绘：whale_${pose}.png`, 560, 916);
  ctx.fillText(`立绘：whale_${pose}.png`, 1360, 906);

  const fadeIn = Math.min(1, lt / 0.25);
  footer(ctx, act.label, `${name} · ${act.dur.toFixed(1)}s 循环`, fadeIn);
}

// ---------------------------------------------------------------- 出片
async function renderAll() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const ffmpeg = resolveFfmpeg();
  const total = Math.round(TOTAL * FPS);
  console.log(`骨架演示片：${total} 帧 / ${TOTAL.toFixed(1)}s → ${OUT_FILE}`);
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
    if (f % 120 === 0 || f === total - 1) {
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

async function renderStills() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  const shots = ['breathe_idle', 'wave_arm', 'squat_jump', 'spin_360'];
  for (const name of shots) {
    const i = RIG_ACTION_NAMES.indexOf(name);
    const t = INTRO + i * CARD + CARD * 0.62;
    drawScene(ctx, t);
    const f = path.join(OUT_DIR, `still_${name}.png`);
    fs.writeFileSync(f, canvas.toBuffer('image/png'));
    console.log('still', f);
  }
}

if (process.argv.includes('--stills')) await renderStills();
else await renderAll();
