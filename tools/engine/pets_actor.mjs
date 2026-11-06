// pets_actor.mjs — Q 版 pets 格式图集播放（Day13+ 通用引擎）
//
// 结构参照 tqlearning/ai-girl-chatgpt-pets 的 pet.json（行状态/每帧毫秒/公共脚底）。
// 硬规则：整格绘制、公共 foot_y、状态切换不跳位；禁止整图 bounce/hop/sway 冒充动画。
// 缺帧的角色只能作为静态纸偶（fallbackSprite），不伪装成真逐帧。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
export const LIB = path.join(ROOT, 'tools/角色Q版库');

export function loadCast() {
  return JSON.parse(fs.readFileSync(path.join(LIB, 'cast.json'), 'utf8'));
}

/** 累计时长选帧：非循环状态播完停在末帧，不回弹。 */
export function frameAt(anim, seconds) {
  const total = anim.frame_durations_ms.reduce((a, b) => a + b, 0);
  let ms = seconds * 1000;
  if (anim.loop) ms %= total;
  else ms = Math.min(Math.max(0, ms), total - 1);
  let f = 0;
  while (f < anim.frame_count - 1 && ms >= anim.frame_durations_ms[f]) {
    ms -= anim.frame_durations_ms[f];
    f++;
  }
  return { col: f, row: anim.row };
}

/** states: [{state, dur}]，按镜内本地时间顺序推进；末段无限保持。 */
export function stateAt(states, lt) {
  if (!states?.length) return { state: 'idle', local: lt };
  let acc = 0;
  for (const s of states) {
    const d = s.dur ?? Infinity;
    if (lt < acc + d) return { ...s, local: lt - acc };
    acc += d;
  }
  const last = states[states.length - 1];
  return { ...last, local: lt - acc + (last.dur ?? 0) };
}

export async function loadPetsActors(ids) {
  const cast = loadCast();
  const actors = {};
  for (const id of ids) {
    const meta = cast.characters[id];
    if (!meta) {
      const guest = (cast.guests?.ids || []).includes(id);
      throw new Error(guest
        ? `客串角色 ${id} 尚未生成 Q 版图集；不得上场充数（先补 generations/${id}/ 再 build_pets）`
        : `未登记角色 ${id}`);
    }
    const petPath = path.join(LIB, 'pets', id, 'pet.json');
    if (meta && fs.existsSync(petPath)) {
      const pet = JSON.parse(fs.readFileSync(petPath, 'utf8'));
      const img = await loadImage(fs.readFileSync(path.join(LIB, 'pets', id, 'spritesheet.png')));
      actors[id] = { kind: 'pets', id, name: meta.name, pet, img, states: Object.fromEntries(pet.animations.map((a) => [a.state, a])) };
    } else {
      const fallback = cast.characters[id]?.fallbackSprite;
      if (!fallback) throw new Error(`角色 ${id} 既无 pets 图集也无 fallbackSprite；不得上场充数`);
      const file = path.join(ROOT, fallback);
      if (!fs.existsSync(file)) throw new Error(`角色 ${id} 静态纸偶缺失 ${fallback}`);
      const img = await loadImage(fs.readFileSync(file));
      actors[id] = { kind: 'static', id, name: cast.characters[id].name, img, states: {} };
    }
  }
  return actors;
}

/**
 * 画一个角色。h=可见身高像素；x,y=脚底中心。
 * 只允许脚底基线与水平位移，不注入垂直弹跳/挤压/整体摇摆。
 */
export function drawPetsActor(ctx, actor, { x, y, h, state = 'idle', local = 0, flip = false }) {
  ctx.save();
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  ctx.fillStyle = 'rgba(60,48,40,0.18)';
  ctx.beginPath();
  ctx.ellipse(0, 4, h * 0.26, h * 0.055, 0, 0, Math.PI * 2);
  ctx.fill();
  if (actor.kind === 'pets') {
    const anim = actor.states[state] || actor.states.idle;
    if (!anim) throw new Error(`${actor.id} 缺状态 ${state}`);
    const { col, row } = frameAt(anim, local);
    const g = actor.pet.grid, a = actor.pet.anchor;
    const k = h / a.stand_px;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      actor.img,
      col * g.cell_width, row * g.cell_height, g.cell_width, g.cell_height,
      -a.center_x * k, -a.foot_y * k, g.cell_width * k, g.cell_height * k,
    );
  } else {
    const k = h / actor.img.height;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(actor.img, -actor.img.width * k / 2, -actor.img.height * k, actor.img.width * k, actor.img.height * k);
  }
  ctx.restore();
}

/** 动作/表情目录接触表：给分镜评审看，全部标 ID＋中文名。 */
export async function drawCatalog(ids, { cellW = 220, cellH = 260 } = {}) {
  const font = path.join(ROOT, 'video-fx/assets/fonts/NotoSansSC-Bold.ttf');
  if (fs.existsSync(font)) GlobalFonts.registerFromPath(font, 'Noto Sans SC');
  const actors = await loadPetsActors(ids);
  const entries = [];
  for (const id of ids) {
    const a = actors[id];
    if (a.kind === 'pets') {
      for (const anim of a.pet.animations) entries.push({ id, anim, cn: anim.cn, kind: anim.kind });
    } else {
      entries.push({ id, anim: null, cn: '静态纸偶', kind: 'static' });
    }
  }
  const cols = 6;
  const rows = Math.ceil(entries.length / cols);
  const canvas = createCanvas(cols * cellW, rows * cellH + 48);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f6efe1';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#3a2f26';
  ctx.font = '700 24px "Noto Sans SC", sans-serif';
  ctx.fillText('Q版动作表情目录 · pets 格式 · 每镜最多 2 人', 16, 32);
  entries.forEach((e, i) => {
    const cx = (i % cols) * cellW, cy = 48 + Math.floor(i / cols) * cellH;
    ctx.fillStyle = i % 2 ? '#fffaf0' : '#fdf5e6';
    ctx.fillRect(cx + 6, cy + 6, cellW - 12, cellH - 12);
    drawPetsActor(ctx, actors[e.id], { x: cx + cellW / 2, y: cy + cellH - 52, h: 160, state: e.anim?.state || 'idle', local: 0 });
    ctx.fillStyle = '#3a2f26';
    ctx.font = '700 15px "Noto Sans SC", sans-serif';
    ctx.fillText(`${e.id}.${e.anim?.state || 'static'}`, cx + 12, cy + cellH - 30);
    ctx.font = '14px "Noto Sans SC", sans-serif';
    ctx.fillText(`${e.cn} · ${e.kind}${e.anim ? ` · ${e.anim.frame_count}帧` : ''}`, cx + 12, cy + cellH - 12);
  });
  return canvas;
}
