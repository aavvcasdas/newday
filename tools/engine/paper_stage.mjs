// paper_stage.mjs — Day13+ 通用纸艺立体书舞台（Node/@napi-rs/canvas）
//
// 方法参照 Win-Hao/music-mv (MIT) 的 diorama 配方，代码为本仓库自有实现：
//   纸片白边＋刀口线＋纸厚投影、6–8 层视差、暖光左上、道具 12fps 手摆、慢推 5%。
// 与番外MV v4 的浏览器版 src/paper.js 同一套画法，供统一单集引擎逐帧调用。
// 便宜纸厚：偏移暗色剪影，不用 per-shape shadowBlur（软件 canvas 慢约 50×）。
export const W = 1920, H = 1080;
const TAU = Math.PI * 2;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, k) => a + (b - a) * k;
export const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
export const smooth = (a, b, t) => ease(clamp((t - a) / (b - a), 0, 1));
export function hash(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
export const jitter = (t, seed, amp = 2) => (hash(Math.floor(t * 12) * 7.13 + seed) - 0.5) * amp;

export function paper(ctx, draw, fill, { edge = '#fff8ea', dy = 8, alpha = 1 } = {}) {
  ctx.save();
  ctx.globalAlpha = alpha;
  if (dy) {
    ctx.save(); ctx.translate(0, dy); ctx.beginPath(); draw(ctx);
    ctx.fillStyle = 'rgba(40,32,28,0.22)'; ctx.fill(); ctx.restore();
  }
  ctx.beginPath(); draw(ctx);
  ctx.fillStyle = fill; ctx.fill();
  ctx.lineWidth = 5; ctx.strokeStyle = edge; ctx.stroke();
  ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(90,70,55,0.25)'; ctx.stroke();
  ctx.restore();
}
export const rectPath = (x, y, w, h, r = 10) => (c) => { c.roundRect(x, y, w, h, r); };
export const circlePath = (x, y, r) => (c) => { c.arc(x, y, r, 0, TAU); };

export function puzzlePath(x, y, w, h, tabs = [1, 1, -1, -1], r = 12) {
  return (c) => {
    const t = Math.min(w, h) * 0.16;
    c.moveTo(x + r, y); c.lineTo(x + w * 0.35, y);
    if (tabs[0]) c.bezierCurveTo(x + w * 0.35, y - t * tabs[0], x + w * 0.65, y - t * tabs[0], x + w * 0.65, y);
    c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h * 0.35);
    if (tabs[1]) c.bezierCurveTo(x + w + t * tabs[1], y + h * 0.35, x + w + t * tabs[1], y + h * 0.65, x + w, y + h * 0.65);
    c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + w * 0.65, y + h);
    if (tabs[2]) c.bezierCurveTo(x + w * 0.65, y + h + t * tabs[2], x + w * 0.35, y + h + t * tabs[2], x + w * 0.35, y + h);
    c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + h * 0.65);
    if (tabs[3]) c.bezierCurveTo(x - t * tabs[3], y + h * 0.65, x - t * tabs[3], y + h * 0.35, x, y + h * 0.35);
    c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath();
  };
}

export function hill(ctx, y, amp, fill, seed, opts = {}) {
  paper(ctx, (c) => {
    c.moveTo(-120, H + 120); c.lineTo(-120, y);
    for (let x = -120; x <= W + 120; x += 80) c.lineTo(x, y + Math.sin(x * 0.004 + seed) * amp + Math.sin(x * 0.011 + seed * 2) * amp * 0.4);
    c.lineTo(W + 120, H + 120); c.closePath();
  }, fill, { dy: 0, ...opts });
}

export function cloud(ctx, x, y, s, fill, opts = {}) {
  paper(ctx, (c) => {
    c.arc(x, y, 46 * s, Math.PI * 0.5, Math.PI * 1.5);
    c.arc(x + 34 * s, y - 30 * s, 40 * s, Math.PI, Math.PI * 1.85);
    c.arc(x + 86 * s, y - 26 * s, 46 * s, Math.PI * 1.15, Math.PI * 1.95);
    c.arc(x + 130 * s, y, 42 * s, Math.PI * 1.5, Math.PI * 0.5);
    c.closePath();
  }, fill, opts);
}

export function lightShaft(ctx, x, y, w, h, alpha, color = '255,236,180') {
  ctx.save();
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, `rgba(${color},${alpha})`); g.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.2, y); ctx.lineTo(x + w * 0.2, y);
  ctx.lineTo(x + w, y + h); ctx.lineTo(x - w, y + h);
  ctx.closePath(); ctx.fill(); ctx.restore();
}

export function warmLight(ctx, alpha = 0.18) {
  ctx.save();
  const g = ctx.createRadialGradient(W * 0.22, H * 0.12, 80, W * 0.22, H * 0.12, W * 0.9);
  g.addColorStop(0, `rgba(255,238,196,${alpha})`); g.addColorStop(1, 'rgba(255,238,196,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}

// ---- 海底书桌：Day 系列主场景的纸艺版（保留墙层次/灯/书架/舷窗/桌/地毯）----
export function seaRoom(ctx, t, { lampOn = 1 } = {}) {
  ctx.fillStyle = '#20415c'; ctx.fillRect(-200, -200, W + 400, H + 400);
  // 后景墙面板
  for (let i = 0; i < 6; i++) {
    paper(ctx, rectPath(-60 + i * 340, -40, 320, 720, 14), i % 2 ? '#27506f' : '#2b5878', { dy: 6, edge: '#8fc4dd' });
  }
  // 舷窗 + 窗外生物
  paper(ctx, circlePath(1500, 300, 150), '#0f2c42', { dy: 10, edge: '#cfe9f5' });
  ctx.save();
  ctx.beginPath(); ctx.arc(1500, 300, 138, 0, TAU); ctx.clip();
  ctx.fillStyle = '#123c58'; ctx.fillRect(1350, 150, 300, 300);
  for (let i = 0; i < 5; i++) {
    const fx = 1370 + ((t * 26 + i * 90) % 280), fy = 230 + Math.sin(t + i) * 40 + i * 22;
    paper(ctx, (c) => { c.ellipse(fx, fy, 20, 11, 0, 0, TAU); c.moveTo(fx - 18, fy); c.lineTo(fx - 32, fy - 9); c.lineTo(fx - 32, fy + 9); c.closePath(); }, i % 2 ? '#7fd6c9' : '#ffd76a', { dy: 2, edge: '#e8fbff' });
  }
  ctx.restore();
  // 书架
  paper(ctx, rectPath(120, 210, 420, 26, 8), '#8a6544', { dy: 8 });
  for (let i = 0; i < 7; i++) {
    paper(ctx, rectPath(150 + i * 52, 130 + (i % 3) * 8, 40, 80 - (i % 3) * 8, 5), ['#e8b04b', '#d97a4a', '#7fa8c9', '#a2c48c'][i % 4], { dy: 4 });
  }
  // 灯串
  ctx.save(); ctx.strokeStyle = '#6f93ab'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(0, 90); ctx.quadraticCurveTo(960, 190, 1920, 90); ctx.stroke(); ctx.restore();
  for (let i = 0; i < 12; i++) {
    const x = 80 + i * 160, y = 100 + Math.sin((i / 11) * Math.PI) * 90;
    paper(ctx, circlePath(x, y + 18, 13), lampOn > 0.3 ? '#ffe9a8' : '#9fb6c9', { dy: 3 });
  }
  // 地毯与地板
  hill(ctx, 860, 10, '#2f5f7d', 3, { edge: '#a8d6ea' });
  paper(ctx, (c) => { c.ellipse(960, 980, 660, 90, 0, 0, TAU); }, '#3d7391', { dy: 6, edge: '#bfe3f2' });
}

export function desk(ctx, x, y, w, { h = 30 } = {}) {
  paper(ctx, rectPath(x, y, w, h, 10), '#c99a6c', { dy: 12 });
  paper(ctx, rectPath(x + 40, y + h, 26, 150, 6), '#8a6544', { dy: 6 });
  paper(ctx, rectPath(x + w - 66, y + h, 26, 150, 6), '#8a6544', { dy: 6 });
}

export function bowl(ctx, x, y, s = 1) {
  paper(ctx, (c) => { c.moveTo(x - 46 * s, y - 30 * s); c.lineTo(x + 46 * s, y - 30 * s); c.quadraticCurveTo(x + 34 * s, y + 22 * s, x, y + 22 * s); c.quadraticCurveTo(x - 34 * s, y + 22 * s, x - 46 * s, y - 30 * s); c.closePath(); }, '#cfd8de', { dy: 6 });
  paper(ctx, (c) => { c.ellipse(x, y - 30 * s, 44 * s, 12 * s, 0, 0, TAU); }, '#fffdf4', { dy: 2 });
}

export function sheetCard(ctx, x, y, w, h, { title = '', rows = [], rot = 0, marks = [] } = {}) {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2); ctx.rotate(rot); ctx.translate(-w / 2, -h / 2);
  paper(ctx, rectPath(0, 0, w, h, 10), '#fffdf4', { dy: 10 });
  ctx.fillStyle = '#3a2f26'; ctx.font = '700 30px "Noto Sans SC", sans-serif';
  ctx.fillText(title, 24, 46);
  ctx.font = '24px "Noto Sans SC", sans-serif';
  rows.forEach((r, i) => ctx.fillText(r, 24, 92 + i * 38));
  ctx.strokeStyle = '#d9534f'; ctx.lineWidth = 4;
  for (const m of marks) {
    if (m.type === 'circle') { ctx.beginPath(); ctx.ellipse(w / 2, 82 + (m.row || 0) * 38, (m.width || 200) / 2, 24, 0, 0, TAU); ctx.stroke(); }
    if (m.type === 'strike') { ctx.beginPath(); ctx.moveTo(24, 84 + (m.row || 0) * 38); ctx.lineTo(24 + (m.width || 180), 84 + (m.row || 0) * 38); ctx.stroke(); }
  }
  ctx.restore();
}

export function signCard(ctx, x, y, w, h, text) {
  paper(ctx, rectPath(x, y, w, h, 8), '#e8b04b', { dy: 8 });
  ctx.save();
  ctx.fillStyle = '#3a2f26'; ctx.font = '700 26px "Noto Sans SC", sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(text, x + w / 2, y + h / 2 + 9); ctx.restore();
  paper(ctx, rectPath(x + w / 2 - 8, y + h, 16, 90, 4), '#8a6544', { dy: 4 });
}

export function plant(ctx, x, y, s = 1) {
  paper(ctx, rectPath(x - 34 * s, y - 60 * s, 68 * s, 60 * s, 8), '#d97a4a', { dy: 6 });
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * 0.42;
    paper(ctx, (c) => { c.ellipse(x + Math.cos(a) * 60 * s, y - 60 * s + Math.sin(a) * 60 * s, 34 * s, 15 * s, a, 0, TAU); }, i % 2 ? '#7fa86a' : '#8fbc76', { dy: 3 });
  }
}

export function bubbles(ctx, t, n = 14) {
  ctx.save();
  ctx.strokeStyle = 'rgba(200,235,250,0.5)'; ctx.lineWidth = 3;
  for (let i = 0; i < n; i++) {
    const x = hash(i * 3.7) * W;
    const y = H - ((t * (40 + hash(i) * 60) + hash(i * 5) * H) % (H + 80));
    ctx.beginPath(); ctx.arc(x, y, 6 + hash(i * 9) * 12, 0, TAU); ctx.stroke();
  }
  ctx.restore();
}

let grainPattern = null;
export function finishPaper(ctx, makeCanvas) {
  if (!grainPattern) {
    const c = makeCanvas(256, 256);
    const x = c.getContext('2d');
    const id = x.createImageData(256, 256);
    for (let i = 0; i < id.data.length; i += 4) {
      const v = 200 + hash(i) * 55;
      id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 20;
    }
    x.putImageData(id, 0, 0);
    grainPattern = ctx.createPattern(c, 'repeat');
  }
  ctx.save(); ctx.fillStyle = grainPattern; ctx.fillRect(0, 0, W, H); ctx.restore();
}

/** 纸艺舞台层相机：远景动得少、近景动得多；慢推上限 7%。 */
export function makeLayer(ctx, cam) {
  return (depth, fn) => {
    ctx.save();
    const z = 1 + (cam.zoom - 1) * (0.45 + depth * 0.55);
    ctx.translate(W / 2, H / 2); ctx.scale(z, z);
    ctx.translate(-W / 2 + cam.px * (0.25 + depth), -H / 2 + cam.py * (0.25 + depth));
    fn(ctx);
    ctx.restore();
  };
}

// ---------------------------------------------------------------------------
// Day13+ 通用画面细节层（2026-11-06 用户第 3 轮反馈后从番外MV 提取为全项目通用）
// 全部纯路径 + 12fps 量化手摆，禁止逐帧 blur（软件 canvas 慢约 50×）。
// 参照用户给定样片《把回忆拼好给你》：纸屑尘埃、坡面草簇、远处飞鸟、地面承接。
// ---------------------------------------------------------------------------

/** 漂浮纸屑尘埃：给空气加层次，不是噪点滤镜。 */
export function motes(ctx, t, n = 26, alpha = 0.5, tint = '255,246,216') {
  const q = Math.floor(t * 12) / 12;
  ctx.save();
  for (let i = 0; i < n; i++) {
    const sp = 14 + hash(i) * 26;
    const x = (hash(i * 3.3) * (W + 160) - 80) + Math.sin(q * 0.6 + i) * 26;
    const y = H + 40 - ((q * sp + hash(i * 7.1) * (H + 200)) % (H + 200));
    const r = 2 + hash(i * 5.5) * 4;
    ctx.fillStyle = `rgba(${tint},${alpha * (0.35 + hash(i * 9.1) * 0.65)})`;
    ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.7, hash(i) * 3.14, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

/** 草丛剪纸：坡面上的小簇草叶，给地面加手作细节而不是纯色块。 */
export function grassTufts(ctx, y, seed, color = '#8fae72', n = 26) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const x = hash(i + seed) * (W + 120) - 60;
    const yy = y + Math.sin(x * 0.004 + seed) * 14 + hash(i * 2.7 + seed) * 60;
    const h = 10 + hash(i * 4.1 + seed) * 14;
    for (let b = -1; b <= 1; b++) {
      ctx.beginPath(); ctx.moveTo(x, yy);
      ctx.quadraticCurveTo(x + b * 5, yy - h * 0.6, x + b * 9, yy - h);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** 远处飞鸟：两点折线，缓慢横移，给天空加生命但不抢主体。 */
export function birds(ctx, t, x0, y0, n = 5, color = 'rgba(90,100,115,0.55)') {
  const q = Math.floor(t * 12) / 12;
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const x = x0 + q * (16 + hash(i) * 12) + i * 46, y = y0 + Math.sin(q * 1.2 + i) * 8 + i * 13;
    const flap = Math.sin(q * 6 + i * 1.7) * 4;
    ctx.beginPath(); ctx.moveTo(x - 8, y + flap); ctx.lineTo(x, y - 3); ctx.lineTo(x + 8, y + flap); ctx.stroke();
  }
  ctx.restore();
}

/** 地面接触阴影带：让纸台/坡面与角色脚下有厚度承接。 */
export function groundShade(ctx, y, alpha = 0.12) {
  ctx.save();
  const g = ctx.createLinearGradient(0, y - 30, 0, y + 60);
  g.addColorStop(0, 'rgba(60,50,40,0)');
  g.addColorStop(0.5, `rgba(60,50,40,${alpha})`);
  g.addColorStop(1, 'rgba(60,50,40,0)');
  ctx.fillStyle = g; ctx.fillRect(-100, y - 30, W + 200, 90);
  ctx.restore();
}

/** 雨丝：斜向短线，12fps 量化，纸艺雨不是粒子模糊。 */
export function rainStreaks(ctx, t, n = 90, alpha = 0.30, tint = '220,232,245') {
  const q = Math.floor(t * 12) / 12;
  ctx.save(); ctx.strokeStyle = `rgba(${tint},${alpha})`; ctx.lineWidth = 2; ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const sp = 620 + hash(i) * 420;
    const x = hash(i * 3.7) * (W + 300) - 150;
    const y = (q * sp + hash(i * 5.1) * (H + 200)) % (H + 200) - 100;
    const len = 16 + hash(i * 8.3) * 20;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - len * 0.28, y + len); ctx.stroke();
  }
  ctx.restore();
}

/** 夜城窗光：给远景楼群点亮的窗格，12fps 轻微明灭。 */
export function cityWindows(ctx, t, seed = 1, y = 780, cols = 14, tint = '255,214,150') {
  const q = Math.floor(t * 12) / 12;
  ctx.save();
  for (let i = 0; i < cols; i++) {
    const bx = 60 + i * ((W - 120) / cols), bw = 70 + hash(i + seed) * 50;
    const bh = 150 + hash(i * 2.3 + seed) * 300;
    for (let r = 0; r < Math.floor(bh / 46); r++) {
      for (let c2 = 0; c2 < 2; c2++) {
        if (hash(i * 9.1 + r * 3.7 + c2 + seed) < 0.55) continue;
        const flick = 0.45 + 0.55 * hash(Math.floor(q * 0.8) + i * 3 + r + c2);
        ctx.fillStyle = `rgba(${tint},${0.5 * flick})`;
        ctx.fillRect(bx + 12 + c2 * (bw * 0.42), y - bh + 18 + r * 46, 10, 14);
      }
    }
  }
  ctx.restore();
}

/**
 * 通用细节调度：每镜按 `details` 声明绘制，缺省给一层纸屑保证空气感。
 * 契约要求每镜至少一项细节层，避免"纯色背景 + 站桩纸偶"。
 */
export const DETAIL_KINDS = Object.freeze(['motes', 'grass', 'birds', 'ground', 'rain', 'windows']);
export function drawDetails(ctx, t, list = [], opts = {}) {
  for (const d of list) {
    const kind = typeof d === 'string' ? d : d.kind;
    const o = typeof d === 'string' ? {} : d;
    switch (kind) {
      case 'motes': motes(ctx, t, o.n ?? 24, o.alpha ?? 0.45, o.tint ?? '255,246,216'); break;
      case 'grass': grassTufts(ctx, o.y ?? 910, o.seed ?? 3, o.color ?? '#8fae72', o.n ?? 26); break;
      case 'birds': birds(ctx, t, o.x ?? 240, o.y ?? 190, o.n ?? 5, o.color); break;
      case 'ground': groundShade(ctx, o.y ?? 930, o.alpha ?? 0.12); break;
      case 'rain': rainStreaks(ctx, t, o.n ?? 90, o.alpha ?? 0.30, o.tint); break;
      case 'windows': cityWindows(ctx, t, o.seed ?? 1, o.y ?? 780, o.cols ?? 14, o.tint); break;
      default: throw new Error(`未知画面细节层 ${kind}（可用：${DETAIL_KINDS.join('/')}）`);
    }
  }
}
