// rig_action_grid.mjs — 15 个骨骼动作的速览图（一屏看完，用来对比/验收）
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
const REPO = path.resolve(HERE, '../../..');
const OUT = path.join(REPO, 'Day3/成片/骨架演示');
fs.mkdirSync(OUT, { recursive: true });
try { GlobalFonts.registerFromPath(path.join(REPO, 'video-fx/assets/fonts/NotoSansSC-Bold.ttf'), 'NotoSansSC'); } catch {}

const POSE_FOR = {
  breathe_idle: 'idle', bow_deep: 'idle', nod_yes: 'think', shake_no: 'point',
  wave_arm: 'wave', beckon_hand: 'wave', squat_jump: 'cheer', lean_back: 'shock',
  tiptoe_reach: 'think', hip_sway: 'point', spin_360: 'cheer', tail_whip: 'run',
  sigh_collapse: 'cry', kick_leg: 'run', heart_tilt: 'wave'
};

const ctxFactory = (w, h) => createCanvas(w, h);
const rigs = {};
for (const p of new Set(Object.values(POSE_FOR))) {
  const img = await loadImage(path.join(HERE, `whale_${p}.png`));
  rigs[p] = buildRig(img, { ctxFactory });
}

const cols = 5, rows = Math.ceil(RIG_ACTION_NAMES.length / cols);
const cw = 360, chh = 470;
const cv = createCanvas(cw * cols, chh * rows + 104);
const ctx = cv.getContext('2d');
const g = ctx.createLinearGradient(0, 0, 0, cv.height);
g.addColorStop(0, '#0E1A33'); g.addColorStop(1, '#0A1526');
ctx.fillStyle = g; ctx.fillRect(0, 0, cv.width, cv.height);
ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
ctx.font = 'bold 26px "NotoSansSC", sans-serif'; ctx.fillStyle = '#F5C542';
ctx.fillText('鲸鱼娘 · 15 个骨骼动作速览', 22, 34);
ctx.font = 'bold 15px "NotoSansSC", sans-serif'; ctx.fillStyle = 'rgba(148,163,184,0.9)';
ctx.fillText('非官方同人 · AI 生成内容 · 同一副 10 骨骨架，动作可叠在任意一张立绘上', 22, 62);

RIG_ACTION_NAMES.forEach((name, i) => {
  const a = RIG_ACTIONS[name];
  const pose = POSE_FOR[name] || 'idle';
  const cx = (i % cols) * cw + cw / 2;
  const cy = 74 + Math.floor(i / cols) * chh + chh - 46;
  drawRigged(ctx, rigs[pose], cx, cy, 23, { anim: a.fn(a.dur * 0.62) });
  ctx.textAlign = 'center';
  ctx.font = 'bold 19px "NotoSansSC", sans-serif';
  ctx.fillStyle = '#E2E8F0';
  ctx.fillText(a.label, cx, cy + 22);
  ctx.font = '14px "NotoSansSC", sans-serif';
  ctx.fillStyle = 'rgba(148,163,184,0.85)';
  ctx.fillText(`${name} · ${pose}`, cx, cy + 44);
});
const f = path.join(OUT, '骨架动作速览.png');
fs.writeFileSync(f, cv.toBuffer('image/png'));
console.log('wrote', f);
