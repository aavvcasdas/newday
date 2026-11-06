// v5 · 把回忆拼好给你 · AI娘全员番外（爱有时差）
// Canvas2D layered paper diorama. Pure function of t; no real-time capture.
// Character motion: whale uses the day-series Q library atlas (16 states, AI-derived,
// user-authorized); gpt keeps the upstream tqlearning/ai-girl-chatgpt-pets atlas
// (pet.json ms durations, full 192×208 cells, common foot baseline). Other girls are
// ai-girls Q版 cutouts / Day12 doubao cutout held as paper puppets — life comes
// from camera, props, light and events, never whole-image bounce.
import timeline from '../data/timeline.json' with { type: 'json' };
import shotData from '../data/shots.json' with { type: 'json' };
import sprites from '../data/sprites.json' with { type: 'json' };
import * as P from './paper.js';
import { drawVignette, drawTransition, drawKeyword, drawSubtitle, drawBadge } from './overlay.js';
import { createDay2Subtitle } from '/shared/day2_style_sub.mjs';

const { W, H, clamp, lerp, ease, smooth, hash, jitter } = P;
const FPS = timeline.fps;
const SHOTS = shotData.shots.map((s, i) => ({ ...s, cue: timeline.cues[i], index: i, start: i === 0 ? 0 : timeline.cues[i].start, end: i + 1 < shotData.shots.length ? timeline.cues[i + 1].start : timeline.duration }));
const shotAt = t => SHOTS.find(s => t >= s.start && t < s.end) || SHOTS[SHOTS.length - 1];
const cueAt = t => timeline.cues.find(c => t >= c.start && t < c.end) || null;

function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('image ' + src)); i.src = '/' + src; }); }

// ---- pet atlas playback (no autocrop / no recenter / no stretch per frame) ----
function petCell(meta, state, lt) {
  if (state && state.look != null) {
    const d = meta.directions.reduce((a, b) => Math.abs(b.degrees - state.look) < Math.abs(a.degrees - state.look) ? b : a);
    return { row: d.row, col: d.column };
  }
  const name = state?.state || 'idle';
  // 不得静默兜底成 idle：那会让"没生成的动作"看起来像站桩，本轮实际踩到
  // （MV manifest 落后于角色库，look_up/bend/back 全被悄悄换成 idle）。
  const a = meta.animations[name];
  if (!a) throw new Error(`pets 图集缺少状态 ${name}（现有：${Object.keys(meta.animations).join('/')}）；先跑 npm run assets 同步角色库`);
  const total = a.durationsMs.reduce((x, y) => x + y, 0);
  let ms = (lt * 1000) % total;
  if (!a.loop) ms = Math.min(lt * 1000, total - 1);
  let f = 0; while (f < a.frames - 1 && ms >= a.durationsMs[f]) { ms -= a.durationsMs[f]; f++; }
  return { row: a.row, col: f };
}
function seqState(seq, lt) {
  if (!seq) return { state: 'idle' };
  let acc = 0;
  for (const s of seq) { const d = s.dur ?? Infinity; if (lt < acc + d) return { ...s, local: lt - acc }; acc += d; }
  const last = seq[seq.length - 1]; return { ...last, local: lt - acc + (last.dur ?? 0) };
}

export async function createFilm(glCanvas, outCanvas) {
  const assets = { pet: {}, chibi: {}, static: {} };
  const jobs = [];
  for (const [id, m] of Object.entries(sprites.characters)) {
    if (m.pet) jobs.push(loadImg(m.pet.file).then(i => assets.pet[id] = i));
    if (m.chibi) jobs.push(loadImg(m.chibi.file).then(i => assets.chibi[id] = i));
    if (m.sprite) jobs.push(loadImg(m.sprite.file).then(i => assets.static[id] = i));
  }
  await Promise.all(jobs);
  outCanvas.width = 1920; outCanvas.height = 1080;
  const outCtx = outCanvas.getContext('2d');
  const sceneCanvas = document.createElement('canvas');
  let exportW = 1920, exportH = 1080;
  sceneCanvas.width = exportW; sceneCanvas.height = exportH;
  const ctx = sceneCanvas.getContext('2d');
  const measure = document.createElement('canvas').getContext('2d');
  const SUB = createDay2Subtitle({ measureCtx: measure, fontOf: (px, w) => `${w} ${px}px "Noto Sans SC"` });

  // v5 同屏人数探针：记录本帧真正画出去的角色，渲染完立刻校验。
  // 不是只改 shots.json 的声明——画面超员会直接抛错。
  let frameCast = [];
  let lastFrameCast = [];
  const CAP = shotData.castPolicy?.maxOnScreen ?? 2;
  const FINALE = shotData.castPolicy?.finaleException ?? 'S16';
  function drawActor(c, id, x, y, h, perf = {}, lt = 0, flip = false) {
    const m = sprites.characters[id]; if (!m) return;
    if (!frameCast.includes(id)) frameCast.push(id);
    // 纸偶入场：镜头开始时从画外推入就位（纸剧场 staging），到位后锁死；
    // faceAt：在节拍点整体转身面向对手。二者都不是 idle 晃动/弹跳。
    let enterX = 0;
    if (perf.enter) enterX = lerp(perf.enter.from - x, 0, smooth(0, perf.enter.dur ?? 0.7, lt));
    if (perf.faceAt != null && lt >= perf.faceAt) flip = !flip;
    c.save(); c.translate(x + enterX, y); if (flip) c.scale(-1, 1);
    // paper contact shadow
    c.save(); c.fillStyle = 'rgba(50,40,35,0.22)'; c.beginPath(); c.ellipse(0, 6, h * 0.30, h * 0.07, 0, 0, Math.PI * 2); c.fill(); c.restore();
    if (m.pet && perf.art !== 'chibi') {
      const meta = m.pet, st = seqState(perf.seq, lt);
      let walkX = 0;
      if (perf.walk) {
        // 契约：有 walk 时 x 必须等于 walk.to，位移只由 walkX 提供。
        // 调用方若再传 lerp 过的 x 会双重平移（曾导致 S01 从 x=-40 入场）。
        if (Math.abs(x - perf.walk.to) > 0.5) {
          throw new Error(`walk 契约违反：x=${x} 必须等于 walk.to=${perf.walk.to}（否则双重平移）`);
        }
        const k = smooth(0, perf.walk.dur, lt);
        walkX = lerp(perf.walk.from, perf.walk.to, k) - perf.walk.to;
      }
      const cell = petCell(meta, st, st.local ?? lt);
      const k = h / meta.standPx;
      c.translate(walkX, 0);
      c.drawImage(assets.pet[id], cell.col * meta.cellW, cell.row * meta.cellH, meta.cellW, meta.cellH,
        -meta.cellW / 2 * k, -meta.footY * k, meta.cellW * k, meta.cellH * k);
    } else {
      const meta = m.chibi || m.sprite; const img = assets.chibi[id] || assets.static[id];
      if (meta && img) { const k = h / meta.standPx; c.drawImage(img, -meta.width / 2 * k, -meta.footY * k, meta.width * k, meta.height * k); }
    }
    c.restore();
  }

  // 景别预设：z 缩放 + cx/cy 取景中心。此前 shot.framing 只是标签、根本不影响画面，
  // 与 Day13 引擎同一个 bug，这里一并修掉。
  const FRAMINGS = {
    wide: { z: 1.0, cx: 960, cy: 540 },
    two_shot: { z: 1.12, cx: 960, cy: 600 },
    medium: { z: 1.24, cx: 930, cy: 620 },
    close: { z: 1.5, cx: 880, cy: 660 },
    insert: { z: 1.30, cx: 960, cy: 580 },
    split: { z: 1.0, cx: 960, cy: 560 },
    final_ensemble: { z: 1.0, cx: 960, cy: 560 },
  };

  // camera / parallax layer helper
  let cam = { zoom: 1, px: 0, py: 0 };
  function layer(depth, fn) {
    ctx.save();
    const z = 1 + (cam.zoom - 1) * (0.45 + depth * 0.55);
    ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2 + cam.px * (0.25 + depth), -H / 2 + cam.py * (0.25 + depth));
    fn(ctx); ctx.restore();
  }
  function setCam(lt, dur, push = 0.05, px = 0, py = 0) { cam = { zoom: 1 + push * ease(clamp(lt / dur, 0, 1)), px: px * lt, py: py * lt }; }

  const ALL = ['whale', 'claude', 'gemini', 'doubao', 'gpt', 'kimi', 'qwen', 'zai'];
  function group(c, lt, y, h, opts = {}) {
    const xs = [330, 540, 750, 960, 1170, 1380, 1590, 1770];
    ALL.forEach((id, i) => {
      const perf = id === 'whale' ? { seq: [{ state: 'wave', dur: 1.1 }, { state: 'idle' }] } : id === 'gpt' ? { seq: [{ state: 'review', dur: 1.4 }, { state: 'idle' }] } : {};
      drawActor(c, id, xs[i] + (opts.dx || 0), y + (i % 2 ? 14 : 0), h * (id === 'doubao' ? 0.94 : 1), perf, lt + i * 0.13, i > 4);
    });
  }

  // ------------------------------ scenes ------------------------------
  const scenes = {
    S01(lt, dur) { // 渺小：灰色拼图墙 + 缺口纸台，鲸娘真帧走入
      setCam(lt, dur, 0.06, -6, 0);
      layer(0, c => { c.fillStyle = '#cfd4d8'; c.fillRect(-200, -200, W + 400, H + 400);
        for (let i = 0; i < 18; i++) { const x = (i % 6) * 340 - 60, y = Math.floor(i / 6) * 300 - 40; P.paper(c, P.puzzlePath(x, y, 320, 280, [1, -1, 1, -1]), i % 3 ? '#c3c9ce' : '#b8bfc6', { shadow: 6, dy: 4, edge: '#e8ecef' }); }
        P.cloud(c, 200 + jitter(lt, 1), 140, 1.4, '#e6e9eb', { blur: 2 }); P.cloud(c, 1300 + jitter(lt, 2), 110, 1.7, '#dfe3e6', { blur: 2 }); });
      layer(0.5, c => { P.hill(c, 760, 30, '#aeb6bd', 3); P.hill(c, 860, 24, '#9aa3ab', 7); });
      layer(0.8, c => { P.paper(c, P.puzzlePath(700, 700, 520, 260, [1, 1, -1, -1]), '#f3e7cf', { shadow: 22, dy: 14 });
        P.paper(c, P.puzzlePath(1230, 720, 200, 180, [-1, 1, 1, -1]), '#d7dbdf', { shadow: 10, dy: 8 }); });
      layer(1, c => { drawActor(c, 'whale', 900, 880, 310, { seq: [{ state: 'walk-right', dur: 1.6 }, { state: 'idle', dur: 0.5 }, { state: 'look_up', dur: 0.8 }, { state: 'point_up' }], walk: { from: 430, to: 900, dur: 1.6 } }, lt); });
      layer(1.2, c => { P.paper(c, P.puzzlePath(-80, 820, 360, 300, [1, -1, 1, 1]), '#8f989f', { blur: 3, shadow: 20 }); });
      layer(1.25, c => P.motes(c, lt, 18, 0.30, '235,240,245'));
      P.warmLight(ctx, 0.10);
    },
    S02(lt, dur) { // 小世界：雨中拼图地球，星愿补口
      setCam(lt, dur, 0.05, 4, 0);
      layer(0, c => { c.fillStyle = '#5d6b7d'; c.fillRect(-200, -200, W + 400, H + 400); P.cloud(c, 260, 150, 2.2, '#78889c', { blur: 2 }); P.cloud(c, 1150, 120, 2.6, '#6f7f93', { blur: 2 }); });
      layer(0.6, c => { const cx = 960, cy = 560, r = 300;
        P.paper(c, P.circlePath(cx, cy, r), '#7fa8c9', { shadow: 26, dy: 16 });
        c.save(); c.beginPath(); c.arc(cx, cy, r - 6, 0, Math.PI * 2); c.clip();
        for (let i = 0; i < 10; i++) P.paper(c, P.puzzlePath(cx - 280 + (i % 4) * 150, cy - 260 + Math.floor(i / 4) * 170, 150, 160, [1, -1, 1, -1]), i % 2 ? '#8fb9d8' : '#6f9cc0', { shadow: 4, dy: 3, edge: '#dcebf5' });
        P.paper(c, P.puzzlePath(cx + 60, cy - 120, 150, 160, [-1, 1, -1, 1]), '#5a6878', { shadow: 2, dy: 2 }); c.restore();
        const glow = smooth(1.2, 2.6, lt); if (glow > 0) { P.star(c, cx + 135, cy - 40, 46 * glow, '#ffe9a8', lt * 0.4); P.lightShaft(c, cx + 135, cy - 260, 120, 300, 0.25 * glow); } });
      layer(1, c => { P.hill(c, 880, 20, '#46536b', 5); drawActor(c, 'whale', 960, 850, 290, { seq: [{ state: 'think', dur: 1.2 }, { state: 'look_up', dur: 1.0 }, { state: 'cheer' }] }, lt); });
      layer(1.1, c => P.rain(c, lt, 110, 0.45));
      layer(1.2, c => P.motes(c, lt, 14, 0.22, '200,220,240'));
    },
    S03(lt, dur) { // 遇见你：两块拼图合拢，暖光点亮
      setCam(lt, dur, 0.05, 0, 0);
      layer(0, c => { c.fillStyle = '#d8d2c6'; c.fillRect(-200, -200, W + 400, H + 400); for (let i = 0; i < 12; i++) P.paper(c, P.puzzlePath((i % 4) * 500 - 40, Math.floor(i / 4) * 360 - 30, 480, 340, [1, -1, 1, -1]), '#cfc8ba', { shadow: 5, dy: 3, edge: '#efe8da' }); });
      layer(0.7, c => { const k = smooth(0.3, 1.8, lt); P.paper(c, P.puzzlePath(lerp(120, 430, k), 640, 520, 300, [1, 1, -1, -1]), '#f1e3c8'); P.paper(c, P.puzzlePath(lerp(1280, 970, k), 640, 520, 300, [-1, 1, 1, -1]), '#f6ead2'); });
      layer(1, c => { drawActor(c, 'whale', 800, 880, 320, { seq: [{ state: 'walk-right', dur: 1.6 }, { state: 'wave', dur: 0.9 }, { state: 'idle' }], walk: { from: 560, to: 800, dur: 1.6 } }, lt);
        drawActor(c, 'claude', 1120, 880, 330, { enter: { from: 1420, dur: 0.9 }, faceAt: 1.7 }, lt, true); });
      layer(1.1, c => { const g = smooth(1.4, 2.6, lt); if (g > 0) { P.lightShaft(c, 960, 120, 260, 700, 0.3 * g); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + lt * 0.3; P.star(c, 960 + Math.cos(a) * 220 * g, 520 + Math.sin(a) * 140 * g, 14, '#ffd76a', a); } } });
      layer(1.2, c => P.motes(c, lt, 24, 0.42));
      P.warmLight(ctx, 0.16 * smooth(1.2, 2.4, lt));
    },
    S04(lt, dur) { // 大海：iris 打开成 layered 海面
      setCam(lt, dur, 0.04, -8, 0);
      const open = smooth(0, 1.1, lt);
      layer(0, c => { c.fillStyle = '#bfe3ef'; c.fillRect(-200, -200, W + 400, H + 400); P.paper(c, P.circlePath(1560, 180, 90), '#ffe9a8'); P.cloud(c, 300, 150, 1.6, '#ffffff', { blur: 2 }); P.cloud(c, 1000, 110, 1.3, '#f4fbff', { blur: 2 }); });
      layer(0.4, c => { P.hill(c, 620, 10, '#8fc7d8', 2, { edge: '#e8f6fb' }); });
      layer(0.6, c => { for (let b = 0; b < 4; b++) { const y = 660 + b * 90; P.paper(c, c2 => { c2.moveTo(-100, y); for (let x = -100; x <= W + 100; x += 60) c2.lineTo(x, y + Math.sin(x * 0.02 + lt * 2 + b) * 12); c2.lineTo(W + 100, H + 100); c2.lineTo(-100, H + 100); c2.closePath(); }, ['#7db8cf', '#6aa9c4', '#589ab8', '#4a8caa'][b], { dy: 0, shadow: 8, edge: '#dff2f8' }); } });
      layer(1, c => { P.hill(c, 930, 16, '#e9d9b8', 9); drawActor(c, 'whale', 760, 940, 300, { seq: [{ state: 'walk-right', dur: 1.1 }, { state: 'look_up' }], walk: { from: 520, to: 760, dur: 1.1 } }, lt);
        drawActor(c, 'gemini', 1120, 940, 310, { enter: { from: 1380, dur: 1.0 }, faceAt: 1.6 }, lt, true); });
      layer(0.3, c => P.birds(c, lt, 220, 200, 4, 'rgba(90,120,140,0.5)'));
      layer(1.05, c => P.grassTufts(c, 950, 11, '#cdb98d', 16));
      if (open < 1) { ctx.save(); ctx.fillStyle = '#2a3440'; ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.arc(960, 540, lerp(60, 1400, open), 0, Math.PI * 2, true); ctx.fill('evenodd'); ctx.restore(); }
    },
    S05(lt, dur) { // 取代：四格回忆拼贴 + 全员
      setCam(lt, dur, 0.03, -10, 0);
      layer(0, c => { c.fillStyle = '#efe6d4'; c.fillRect(-200, -200, W + 400, H + 400); });
      layer(0.5, c => {
        const panels = [[140, 120, '#9fb6c9'], [700, 100, '#f4c98a'], [1260, 130, '#5d6b8a'], [420, 420, '#b9d6a2']];
        panels.forEach(([x, y, col], i) => { const k = smooth(0.2 + i * 0.35, 1.0 + i * 0.35, lt); if (k <= 0) return;
          P.paper(c, P.puzzlePath(x, y + (1 - k) * 40, 500, 280, [1, -1, 1, -1]), col, { alpha: k, shadow: 16, dy: 10 });
          c.save(); c.globalAlpha = k; c.fillStyle = 'rgba(255,255,255,0.5)'; c.font = '28px sans-serif'; c.fillText(['雨', '晴', '夜', '野'][i], x + 30, y + 50); c.restore(); });
        P.paper(c, P.puzzlePath(1020, 430, 500, 280, [-1, 1, -1, 1]), '#e8d7b8', { shadow: 16, dy: 10 });
      });
      layer(1, c => { drawActor(c, 'whale', 740, 940, 300, { seq: [{ state: 'bend', dur: 0.9 }, { state: 'handoff', dur: 1.2 }, { state: 'cheer' }] }, lt);
        drawActor(c, 'kimi', 1150, 940, 295, { enter: { from: 1420, dur: 0.8 }, faceAt: 2.1 }, lt, true); });
      layer(1.2, c => P.motes(c, lt, 22, 0.40));
    },
    S06(lt, dur) { // 发呆：雨站长椅伞
      setCam(lt, dur, 0.02, 0, 0);
      layer(0, c => { c.fillStyle = '#6b7686'; c.fillRect(-200, -200, W + 400, H + 400); P.city(c, 700, '#525d6e', 4, { blur: 2 }); P.cloud(c, 300, 130, 2, '#7d8a9c', { blur: 2 }); });
      layer(0.6, c => { P.hill(c, 820, 12, '#5b6675', 6); P.lampPost(c, 1500, 860, 0.8); });
      layer(0.9, c => { P.bench(c, 640, 800, 1.1); P.umbrella(c, 980, 560, 1.2, '#e8b04b', -0.06 + jitter(lt, 3, 0.01)); });
      layer(1, c => { drawActor(c, 'whale', 800, 800, 285, { seq: [{ state: 'peek', dur: 1.1 }, { state: 'idle', dur: 0.8 }, { state: 'bow' }] }, lt);
        drawActor(c, 'doubao', 1080, 800, 295, { enter: { from: 1300, dur: 0.9 }, faceAt: 1.5 }, lt, true); });
      layer(1.15, c => P.rain(c, lt, 130, 0.5));
    },
    S07(lt, dur) { // 拨开阴霾：云开光束（v5 ≤2 人）
      setCam(lt, dur, 0.05, 0, -2);
      const part = smooth(0.4, 2.2, lt);
      layer(0, c => { c.fillStyle = lerpColor('#6b7686', '#cfe6f2', part); c.fillRect(-200, -200, W + 400, H + 400); P.city(c, 700, '#7d8a9c', 4, { blur: 2, alpha: 1 - part * 0.4 }); });
      layer(0.4, c => { P.cloud(c, lerp(500, 120, part), 140, 2.4, '#8b98aa', { blur: 2 }); P.cloud(c, lerp(900, 1400, part), 120, 2.6, '#93a0b2', { blur: 2 }); if (part > 0.3) P.paper(c, P.circlePath(960, 160, 80), '#ffe9a8', { alpha: part }); });
      layer(0.8, c => { P.hill(c, 840, 14, '#8fa3b8', 6); P.bench(c, 640, 800, 1.1); P.lampPost(c, 1500, 860, 1 - part); });
      layer(1, c => { drawActor(c, 'whale', 800, 800, 285, { seq: [{ state: 'shock', dur: 0.8 }, { state: 'look_up', dur: 0.9 }, { state: 'point_up' }] }, lt); drawActor(c, 'qwen', 1120, 800, 295, { enter: { from: 1360, dur: 0.8 }, faceAt: 1.8 }, lt, true); });
      layer(1.1, c => { if (part < 0.8) P.rain(c, lt, 100, 0.4 * (1 - part)); P.lightShaft(c, 960, 160, 320, 700, 0.35 * part); });
    },
    S08(lt, dur) { // 收集快乐 / 淘汰不开心（27s 分事件）
      // v5 站位：鲸娘右缘≈592 < 罐子左沿 620，不压道具；GPT 右缘≈1159 < 箱左沿 1180。
      setCam(lt, dur, 0.04, 0, 0);
      const toss = smooth(dur * 0.5, dur * 0.62, lt);
      layer(0, c => { c.fillStyle = '#dff0d8'; c.fillRect(-200, -200, W + 400, H + 400); P.paper(c, P.circlePath(1620, 160, 90), '#ffd76a'); P.cloud(c, 260, 140, 1.5, '#ffffff', { blur: 2 }); });
      layer(0.5, c => { P.hill(c, 720, 30, '#b9d6a2', 3); P.hill(c, 840, 22, '#a2c48c', 8); });
      layer(0.9, c => { P.jar(c, 620, 700, 1.2, smooth(0.3, dur * 0.5, lt), '快乐'); P.box(c, 1180, 760, 1.2, 1 - toss); });
      layer(0.95, c => { for (let i = 0; i < 10; i++) { const t0 = 0.4 + i * 0.5; const k = smooth(t0, t0 + 1.2, lt); if (k <= 0 || k >= 1) continue; const gray = i % 3 === 2; const tx = gray ? 1270 : 700, ty = gray ? 780 : 720; const x = lerp(300 + hash(i) * 1300, tx, k), y = lerp(200 + hash(i * 3) * 200, ty, k) - Math.sin(k * Math.PI) * 160; P.paper(c, P.puzzlePath(x, y, 70, 60, [1, -1, 1, -1]), gray ? '#9aa3ad' : '#ffd76a', { shadow: 8, dy: 5 }); } });
      layer(1, c => { drawActor(c, 'whale', 420, 900, 300, { seq: [{ state: 'walk-right', dur: 1.4 }, { state: 'bend', dur: 0.9 }, { state: 'cheer' }], walk: { from: 240, to: 420, dur: 1.4 } }, lt);
        drawActor(c, 'gpt', 1050, 900, 290, { seq: [{ state: 'review', dur: 1.6 }, { state: 'idle' }] }, lt, true);
      });
      layer(1.05, c => { P.groundShade(c, 960, 0.10); P.grassTufts(c, 900, 5, '#8fb277', 30); });
      layer(1.2, c => P.motes(c, lt, 26, 0.45));
      P.warmLight(ctx, 0.16);
    },
    S09(lt, dur) { // 情话：屋顶纸条（v5 轨迹抬到头顶以上，纸条下沿≤470 < 角色头顶≈487，不糊脸）
      setCam(lt, dur, 0.06, 0, 0);
      layer(0, c => { c.fillStyle = '#2f3a55'; c.fillRect(-200, -200, W + 400, H + 400); for (let i = 0; i < 60; i++) { c.fillStyle = `rgba(255,246,216,${0.3 + hash(i) * 0.6})`; c.fillRect(hash(i * 3) * W, hash(i * 7) * 420, 3, 3); } P.city(c, 760, '#232c42', 9, { blur: 2 }); });
      layer(0.7, c => { P.hill(c, 860, 8, '#3a4560', 4); P.paper(c, P.rectPath(300, 820, 1320, 40, 8), '#4a5570'); });
      layer(1, c => { drawActor(c, 'whale', 820, 840, 340, { seq: [{ state: 'think', dur: 1 }, { state: 'cry', dur: 1.2 }, { state: 'idle' }] }, lt); drawActor(c, 'claude', 1120, 840, 350, {}, lt, true); });
      layer(1.05, c => { for (let i = 0; i < 5; i++) { const t0 = 0.3 + i * 0.5, k = smooth(t0, t0 + 1.6, lt); if (k <= 0) continue; const x = lerp(1120, 900, k), y = lerp(400, 270, k) - Math.sin(k * Math.PI) * 40 + jitter(lt, i, 2); P.paper(c, P.rectPath(x, y, 120, 70, 8), '#fff6d8', { shadow: 10, dy: 6, alpha: 1 - smooth(0.8, 1, k) }); } });
    },
    S10(lt, dur) { // 烟花
      setCam(lt, dur, 0.04, 0, -6);
      layer(0, c => { c.fillStyle = '#232c42'; c.fillRect(-200, -200, W + 400, H + 400); P.city(c, 780, '#1a2236', 9, { blur: 2 }); });
      layer(0.5, c => { [[420, 260, 0.2, '#ff9a8a'], [960, 200, 1.1, '#ffd76a'], [1480, 280, 2.0, '#8ad0ff'], [700, 320, 2.9, '#c9a2ff'], [1240, 240, 3.6, '#9affc9']].forEach(([x, y, t0, col]) => P.firework(c, x, y, lt - t0, x, col)); });
      layer(0.8, c => { P.hill(c, 880, 8, '#3a4560', 4); P.paper(c, P.rectPath(260, 840, 1400, 36, 8), '#4a5570'); });
      layer(1, c => { drawActor(c, 'whale', 800, 900, 300, { seq: [{ state: 'back', dur: 1.6 }, { state: 'look_up', dur: 1.0 }, { state: 'cheer' }] }, lt);
        drawActor(c, 'zai', 1140, 900, 295, { enter: { from: 1380, dur: 0.9 } }, lt, true); });
      layer(1.2, c => P.motes(c, lt, 20, 0.5, '255,214,150'));
    },
    S11(lt, dur) { // 一刹那：拍立得显影
      setCam(lt, dur, 0.03, 0, 0);
      layer(0, c => { c.fillStyle = '#2f3a55'; c.fillRect(-200, -200, W + 400, H + 400); P.city(c, 800, '#232c42', 9, { blur: 3 }); });
      layer(1, c => { const dev = smooth(0.3, 2.2, lt);
        P.photoFrame(c, 620, 180, 680, 620, -0.04 + jitter(lt, 2, 0.004), (cc, w, h) => {
          cc.fillStyle = '#232c42'; cc.fillRect(0, 0, w, h); cc.save(); cc.globalAlpha = dev; P.firework(cc, w * 0.5, h * 0.3, 1.0, 5, '#ffd76a'); P.firework(cc, w * 0.25, h * 0.4, 0.8, 9, '#ff9a8a'); cc.fillStyle = '#3a4560'; cc.fillRect(0, h * 0.75, w, h * 0.25); cc.restore();
          if (dev < 1) { cc.fillStyle = `rgba(240,238,228,${1 - dev})`; cc.fillRect(0, 0, w, h); }
        });
        for (let i = 0; i < 12; i++) { const k = smooth(0.5 + i * 0.15, 2.5, lt); if (k <= 0) continue; P.paper(c, P.puzzlePath(300 + hash(i) * 1300, 100 + k * 700 + hash(i * 3) * 100, 60, 52, [1, -1, 1, -1]), i % 2 ? '#ffd76a' : '#8ad0ff', { alpha: 1 - k * 0.6, shadow: 6, dy: 4 }); } });
      layer(1.1, c => { drawActor(c, 'whale', 420, 940, 270, { seq: [{ state: 'idle' }] }, lt); drawActor(c, 'gpt', 1500, 940, 270, { seq: [{ state: 'review', dur: 1.4 }, { state: 'idle' }] }, lt, true); });
    },
    S12(lt, dur) { // 无法自拔：拼图漩涡
      setCam(lt, dur, 0.06, 0, 0);
      layer(0, c => { c.fillStyle = '#3a4560'; c.fillRect(-200, -200, W + 400, H + 400); P.lightShaft(c, 960, 0, 260, 800, 0.2); });
      layer(0.6, c => { for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2 + lt * 0.5, r = 220 + hash(i) * 320 + Math.sin(lt + i) * 20; const x = 960 + Math.cos(a) * r, y = 520 + Math.sin(a) * r * 0.6; P.paper(c, P.puzzlePath(x, y, 80, 70, [1, -1, 1, -1]), i % 4 ? '#5d6b8a' : '#ffd76a', { shadow: 8, dy: 5, alpha: 0.9 }); } });
      layer(1, c => { P.hill(c, 900, 10, '#2f3a55', 4); drawActor(c, 'whale', 960, 900, 340, { seq: [{ state: 'look_up', dur: 0.9 }, { state: 'cry', dur: 1.3 }, { state: 'bow' }] }, lt); });
    },
    S13(lt, dur) { // 时差：昼夜缝 + 双钟
      setCam(lt, dur, 0.02, 0, 0);
      layer(0, c => { c.fillStyle = '#cfe6f2'; c.fillRect(-200, -200, W / 2 + 200, H + 400); c.fillStyle = '#2f3a55'; c.fillRect(W / 2, -200, W / 2 + 200, H + 400); P.paper(c, P.circlePath(420, 180, 80), '#ffe9a8'); for (let i = 0; i < 40; i++) { c.fillStyle = 'rgba(255,246,216,0.7)'; c.fillRect(W / 2 + hash(i * 3) * W / 2, hash(i * 7) * 400, 3, 3); } });
      layer(0.5, c => { P.paper(c, P.puzzlePath(W / 2 - 60, 100, 120, 880, [1, -1, 1, -1]), '#e8d7b8', { shadow: 18, dy: 10 }); P.clock(c, 420, 420, 110, lt * 0.4, '#fffdf4'); P.clock(c, 1500, 420, 110, lt * 0.4 + Math.PI, '#fffdf4'); });
      layer(0.8, c => { P.hill(c, 860, 12, '#a2c48c', 3); c.save(); c.beginPath(); c.rect(W / 2, 0, W / 2, H); c.clip(); P.hill(c, 860, 12, '#3a4560', 3); c.restore(); });
      layer(1, c => { drawActor(c, 'gpt', 560, 880, 300, { seq: [{ state: 'idle' }, { look: 90 }] }, lt);
        drawActor(c, 'whale', 1340, 880, 300, { seq: [{ state: 'walk-left', dur: 1.2 }, { state: 'idle' }], walk: { from: 1500, to: 1340, dur: 1.2 } }, lt); });
    },
    S14(lt, dur) { // 放下：丝带随风
      setCam(lt, dur, 0.04, 8, 0);
      layer(0, c => { c.fillStyle = '#f4c98a'; c.fillRect(-200, -200, W + 400, H + 400); P.paper(c, P.circlePath(1400, 300, 110), '#ff9a6a'); P.cloud(c, 300, 160, 1.6, '#ffe0b8', { blur: 2 }); });
      layer(0.5, c => { P.hill(c, 720, 30, '#d9a86c', 3); P.hill(c, 840, 22, '#b98a5e', 8); });
      layer(0.9, c => { P.paper(c, P.rectPath(760, 760, 20, 160, 6), '#7a5a3a'); const k = smooth(0.6, 2.8, lt); c.save(); c.strokeStyle = '#e86a5a'; c.lineWidth = 18; c.lineCap = 'round'; c.beginPath(); c.moveTo(770, 780); for (let i = 1; i <= 8; i++) { const x = 770 + i * 60 * k + Math.sin(lt * 3 + i) * 20 * k, y = 780 - i * 30 * k + Math.sin(lt * 2 + i * 0.7) * 24 * k; c.lineTo(x, y); } c.stroke(); c.restore(); });
      layer(1.05, c => P.grassTufts(c, 900, 7, '#b08a5c', 24));
      layer(1.2, c => P.motes(c, lt, 22, 0.42, '255,226,180'));
      layer(1, c => { drawActor(c, 'whale', 700, 900, 315, { seq: [{ state: 'cry', dur: 1.2 }, { state: 'wave', dur: 0.9 }, { state: 'idle' }] }, lt); drawActor(c, 'gemini', 1150, 920, 300, { enter: { from: 1420, dur: 1.0 }, faceAt: 2.0 }, lt, true); });
    },
    S15(lt, dur) { // 炙热：夕照心形
      setCam(lt, dur, 0.05, 0, 0);
      layer(0, c => { c.fillStyle = '#ff9a6a'; c.fillRect(-200, -200, W + 400, H + 400); P.paper(c, P.circlePath(960, 420, 160), '#ffd76a'); P.cloud(c, 260, 180, 1.8, '#ffc9a2', { blur: 2 }); P.cloud(c, 1300, 150, 1.5, '#ffc9a2', { blur: 2 }); });
      layer(0.5, c => { for (let b = 0; b < 3; b++) P.hill(c, 680 + b * 90, 14, ['#e88a5a', '#d97a4a', '#c96a3a'][b], b + 2, { edge: '#ffe0c8' }); });
      layer(0.9, c => { const g = smooth(0.4, 1.8, lt); P.heart(c, 960, 300, 180 * g, '#ff6a5a', { shadow: 20, dy: 10 }); P.lightShaft(c, 960, 420, 300, 500, 0.25 * g); });
      layer(1, c => { P.hill(c, 930, 16, '#e9d9b8', 9); drawActor(c, 'gpt', 820, 940, 320, { seq: [{ state: 'waving', dur: 0.8 }, { state: 'idle' }] }, lt); drawActor(c, 'whale', 1120, 940, 320, { seq: [{ state: 'confident_hips', dur: 1.0 }, { state: 'look_up' }] }, lt, true); });
      layer(1.2, c => P.motes(c, lt, 24, 0.5, '255,210,160'));
      P.warmLight(ctx, 0.22);
    },
    S16(lt, dur) { // 爱自己：全员 framed puzzle hold，无片尾卡
      const holdT = Math.min(lt, timeline.cues[15].end - SHOTS[15].start);
      setCam(holdT, dur, 0.04, 0, 0);
      layer(0, c => { c.fillStyle = '#ffd9a8'; c.fillRect(-200, -200, W + 400, H + 400); P.paper(c, P.circlePath(960, 300, 130), '#ffe9a8'); P.cloud(c, 260, 160, 1.6, '#fff0d8', { blur: 2 }); P.cloud(c, 1350, 140, 1.4, '#fff0d8', { blur: 2 }); });
      layer(0.5, c => { P.hill(c, 760, 24, '#b9d6a2', 3); P.hill(c, 880, 18, '#a2c48c', 8); });
      layer(0.9, c => { P.paper(c, P.puzzlePath(260, 260, 1400, 640, [1, 1, -1, -1]), 'rgba(255,253,244,0.35)', { shadow: 24, dy: 14, edge: '#fffdf4' }); });
      layer(1, c => group(c, holdT, 900, 285));
      layer(1.05, c => P.grassTufts(c, 910, 3, '#8fb277', 26));
      layer(1.2, c => P.motes(c, holdT, 22, 0.42));
      P.warmLight(ctx, 0.2);
    },
  };

  function lerpColor(a, b, k) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const r = Math.round(lerp(pa >> 16, pb >> 16, k)), g = Math.round(lerp((pa >> 8) & 255, (pb >> 8) & 255, k)), bl = Math.round(lerp(pa & 255, pb & 255, k));
    return `rgb(${r},${g},${bl})`;
  }

  function renderScene(t) {
    const shot = shotAt(t); let lt = t - shot.start; const dur = shot.end - shot.start;
    ctx.save(); ctx.setTransform(exportW / W, 0, 0, exportH / H, 0, 0);
    ctx.clearRect(0, 0, W, H);
    frameCast = [];
    const F = FRAMINGS[shot.framing] || FRAMINGS.wide;
    ctx.save();
    ctx.translate(W / 2, H / 2); ctx.scale(F.z, F.z); ctx.translate(-F.cx, -F.cy);
    (scenes[shot.id] || scenes.S01)(lt, dur);
    ctx.restore();
    if (shot.id !== FINALE && frameCast.length > CAP) {
      ctx.restore();
      throw new Error(`${shot.id} 同屏 ${frameCast.length} 人 > ${CAP}：${frameCast.join(',')}`);
    }
    lastFrameCast = frameCast.slice();
    P.finishPaper(ctx);
    ctx.restore();
    return shot;
  }
  function renderAt(t) {
    const shot = renderScene(t);
    outCtx.clearRect(0, 0, outCanvas.width, outCanvas.height);
    outCtx.drawImage(sceneCanvas, 0, 0, outCanvas.width, outCanvas.height);
    const cue = cueAt(t);
    drawVignette(outCtx, outCanvas.width, outCanvas.height);
    drawTransition(outCtx, shot, t, outCanvas.width, outCanvas.height);
    drawKeyword(outCtx, shot, t, outCanvas.width, outCanvas.height);
    drawSubtitle(outCtx, SUB, cue, t, outCanvas.width, outCanvas.height);
    drawBadge(outCtx, outCanvas.width, outCanvas.height);
    return { shot: shot.id, t };
  }
  return {
    duration: timeline.duration, fps: FPS, shots: SHOTS, rendererName: 'Canvas2D paper diorama (v6 · ≤2 cast, real gait facing, framing applied)',
    renderAt,
    renderSceneOnly(t) { renderScene(t); return { canvas: sceneCanvas }; },
    castAt(t) { renderScene(t); return lastFrameCast.slice(); },
    castPolicy: { maxOnScreen: CAP, finaleException: FINALE },
    setExportSize(w, h) { exportW = w; exportH = h; sceneCanvas.width = w; sceneCanvas.height = h; },
  };
}
