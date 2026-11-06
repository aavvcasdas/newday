// v4 paper-diorama stage. Method reference: Win-Hao/music-mv (MIT) diorama recipe:
// every frame is drawn in code from t; 6–8 parallax paper layers with cut edges,
// thickness shadows and depth blur; warm key light from upper-left; stop-motion
// prop jitter at 12fps; slow 5% camera push. Characters are upstream cutouts /
// pet atlases, never procedurally redrawn faces. No whole-sprite bounce.
export const W = 1920, H = 1080;
const TAU = Math.PI * 2;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, k) => a + (b - a) * k;
export const ease = k => k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
export const smooth = (a, b, t) => ease(clamp((t - a) / (b - a), 0, 1));
export function hash(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
export const jitter = (t, seed, amp = 2) => { const f = Math.floor(t * 12); return (hash(f * 7.13 + seed) - 0.5) * amp; };

let grain = null;
function grainPattern(ctx) {
  if (grain) return grain;
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d'); const id = x.createImageData(256, 256);
  for (let i = 0; i < id.data.length; i += 4) {
    const v = 200 + hash(i) * 55; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 22;
  }
  x.putImageData(id, 0, 0); grain = ctx.createPattern(c, 'repeat'); return grain;
}

export function paper(ctx, draw, fill, { shadow = 14, edge = '#fff8ea', dy = 8, blur = 0, alpha = 1 } = {}) {
  // Cheap baked paper thickness: offset dark silhouette instead of per-shape
  // shadowBlur / ctx.filter (software canvas blur is ~50× slower per frame).
  ctx.save(); ctx.globalAlpha = alpha;
  if (dy) { ctx.save(); ctx.translate(0, dy); ctx.beginPath(); draw(ctx); ctx.fillStyle = 'rgba(40,32,28,0.22)'; ctx.fill(); ctx.restore(); }
  ctx.beginPath(); draw(ctx);
  ctx.fillStyle = fill; ctx.fill();
  ctx.lineWidth = 5; ctx.strokeStyle = edge; ctx.stroke();
  ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(90,70,55,0.25)'; ctx.stroke();
  ctx.restore();
}
export function rectPath(x, y, w, h, r = 10) { return c => { c.roundRect(x, y, w, h, r); }; }
export function circlePath(x, y, r) { return c => { c.arc(x, y, r, 0, TAU); }; }

// Jigsaw piece with tabs/blanks on chosen sides.
export function puzzlePath(x, y, w, h, tabs = [1, 1, -1, -1], r = 12) {
  return c => {
    const t = Math.min(w, h) * 0.16;
    c.moveTo(x + r, y);
    c.lineTo(x + w * 0.35, y);
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
export function cloud(ctx, x, y, s, fill, opts = {}) {
  paper(ctx, c => {
    c.arc(x, y, 46 * s, Math.PI * 0.5, Math.PI * 1.5);
    c.arc(x + 34 * s, y - 30 * s, 40 * s, Math.PI, Math.PI * 1.85);
    c.arc(x + 86 * s, y - 26 * s, 46 * s, Math.PI * 1.15, Math.PI * 1.95);
    c.arc(x + 130 * s, y, 42 * s, Math.PI * 1.5, Math.PI * 0.5);
    c.closePath();
  }, fill, opts);
}
export function hill(ctx, y, amp, fill, seed, opts = {}) {
  paper(ctx, c => {
    c.moveTo(-100, H + 100); c.lineTo(-100, y);
    for (let x = -100; x <= W + 100; x += 80) c.lineTo(x, y + Math.sin(x * 0.004 + seed) * amp + Math.sin(x * 0.011 + seed * 2) * amp * 0.4);
    c.lineTo(W + 100, H + 100); c.closePath();
  }, fill, { dy: 0, shadow: 18, ...opts });
}
export function city(ctx, y, fill, seed, opts = {}) {
  paper(ctx, c => {
    c.moveTo(-50, y + 200);
    let x = -50;
    while (x < W + 80) {
      const w = 60 + hash(x + seed) * 90, h = 80 + hash(x * 1.7 + seed) * 220;
      c.lineTo(x, y - h); c.lineTo(x + w, y - h); c.lineTo(x + w, y + 200); x += w + 14;
    }
    c.closePath();
  }, fill, { dy: 0, shadow: 10, ...opts });
  // windows
  ctx.save(); ctx.fillStyle = 'rgba(255,224,150,0.55)';
  for (let i = 0; i < 90; i++) {
    const x = hash(i + seed) * W, yy = y - 30 - hash(i * 3 + seed) * 200;
    if (hash(i * 5 + seed) > 0.45) ctx.fillRect(x, yy, 8, 12);
  }
  ctx.restore();
}
export function rain(ctx, t, n, alpha = 0.5, slant = 60) {
  ctx.save(); ctx.strokeStyle = `rgba(190,214,235,${alpha})`; ctx.lineWidth = 3; ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const sp = 520 + hash(i) * 380, x0 = hash(i * 3.1) * (W + 300) - 150;
    const y = ((t * sp + hash(i * 7.7) * H) % (H + 120)) - 60;
    const x = x0 + y * 0.12;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - slant * 0.18, y + 34 + hash(i) * 20); ctx.stroke();
  }
  ctx.restore();
}
export function star(ctx, x, y, r, fill, rot = 0) {
  paper(ctx, c => {
    for (let i = 0; i < 10; i++) { const a = rot + i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    c.closePath();
  }, fill, { shadow: 8, dy: 4 });
}
export function heart(ctx, x, y, s, fill, opts = {}) {
  paper(ctx, c => {
    c.moveTo(x, y + s * 0.32);
    c.bezierCurveTo(x, y, x - s * 0.5, y, x - s * 0.5, y + s * 0.32);
    c.bezierCurveTo(x - s * 0.5, y + s * 0.62, x, y + s * 0.82, x, y + s);
    c.bezierCurveTo(x, y + s * 0.82, x + s * 0.5, y + s * 0.62, x + s * 0.5, y + s * 0.32);
    c.bezierCurveTo(x + s * 0.5, y, x, y, x, y + s * 0.32);
    c.closePath();
  }, fill, opts);
}
export function bench(ctx, x, y, s = 1) {
  paper(ctx, rectPath(x, y, 420 * s, 26 * s, 8), '#b98a5e');
  paper(ctx, rectPath(x + 10 * s, y - 110 * s, 400 * s, 22 * s, 8), '#c99a6c');
  paper(ctx, rectPath(x + 10 * s, y - 70 * s, 400 * s, 22 * s, 8), '#c99a6c');
  paper(ctx, rectPath(x + 30 * s, y + 26 * s, 22 * s, 90 * s, 6), '#8a6544');
  paper(ctx, rectPath(x + 360 * s, y + 26 * s, 22 * s, 90 * s, 6), '#8a6544');
}
export function umbrella(ctx, x, y, s, fill, tilt = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(tilt);
  paper(ctx, c => { c.arc(0, 0, 150 * s, Math.PI, 0); c.closePath(); }, fill);
  ctx.strokeStyle = '#7a5a3a'; ctx.lineWidth = 8 * s; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 260 * s); ctx.stroke();
  ctx.restore();
}
export function lampPost(ctx, x, y, on = 1) {
  paper(ctx, rectPath(x - 8, y - 360, 16, 360, 6), '#5c6470');
  paper(ctx, circlePath(x, y - 380, 34), on > 0.2 ? '#ffe9a8' : '#cfd6dd');
  if (on > 0.2) { ctx.save(); const g = ctx.createRadialGradient(x, y - 380, 10, x, y - 380, 220); g.addColorStop(0, `rgba(255,226,150,${0.35 * on})`); g.addColorStop(1, 'rgba(255,226,150,0)'); ctx.fillStyle = g; ctx.fillRect(x - 220, y - 600, 440, 440); ctx.restore(); }
}
export function jar(ctx, x, y, s, fillLevel, label) {
  paper(ctx, rectPath(x, y, 150 * s, 190 * s, 26), 'rgba(214,236,244,0.85)');
  ctx.save(); ctx.beginPath(); ctx.roundRect(x + 10 * s, y + 10 * s, 130 * s, 170 * s, 20); ctx.clip();
  ctx.fillStyle = '#ffd76a'; ctx.fillRect(x, y + 180 * s - 160 * s * fillLevel, 150 * s, 170 * s * fillLevel);
  ctx.restore();
  paper(ctx, rectPath(x - 8 * s, y - 22 * s, 166 * s, 30 * s, 10), '#d9a05b');
  if (label) { ctx.save(); ctx.fillStyle = '#7a5a3a'; ctx.font = `${26 * s}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText(label, x + 75 * s, y + 110 * s); ctx.restore(); }
}
export function box(ctx, x, y, s, lidOpen) {
  paper(ctx, rectPath(x, y, 190 * s, 140 * s, 10), '#9aa3ad');
  ctx.save(); ctx.translate(x, y); ctx.rotate(-lidOpen * 0.9);
  paper(ctx, rectPath(0, -24 * s, 190 * s, 28 * s, 8), '#7d8791'); ctx.restore();
}
export function clock(ctx, x, y, r, hour, fill) {
  paper(ctx, circlePath(x, y, r), fill);
  ctx.save(); ctx.strokeStyle = '#5a4632'; ctx.lineWidth = 6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(hour) * r * 0.5, y + Math.sin(hour) * r * 0.5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(hour * 12) * r * 0.75, y + Math.sin(hour * 12) * r * 0.75); ctx.stroke();
  ctx.restore();
}
export function firework(ctx, x, y, age, seed, color) {
  if (age < 0 || age > 1.6) return;
  const k = ease(clamp(age / 1.2, 0, 1)), fade = 1 - smooth(1.0, 1.6, age);
  ctx.save(); ctx.globalAlpha = fade;
  if (age < 0.35) { ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, y + 260 * (1 - age / 0.35)); ctx.lineTo(x, y); ctx.stroke(); }
  const n = 26;
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU + hash(seed) * 0.4, rr = (120 + hash(i + seed) * 90) * k;
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr + age * age * 40;
    ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * rr * 0.72, y + Math.sin(a) * rr * 0.72 + age * age * 30); ctx.lineTo(px, py); ctx.stroke();
    ctx.fillStyle = '#fff6d8'; ctx.beginPath(); ctx.arc(px, py, 4, 0, TAU); ctx.fill();
  }
  ctx.restore();
}
export function photoFrame(ctx, x, y, w, h, rot, inner) {
  ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.rotate(rot); ctx.translate(-w / 2, -h / 2);
  paper(ctx, rectPath(0, 0, w, h, 8), '#fffdf4', { shadow: 24, dy: 14 });
  ctx.save(); ctx.beginPath(); ctx.rect(24, 24, w - 48, h - 90); ctx.clip(); ctx.translate(24, 24); inner(ctx, w - 48, h - 90); ctx.restore();
  ctx.restore();
}
export function lightShaft(ctx, x, y, w, h, alpha, color = '255,236,180') {
  ctx.save(); const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, `rgba(${color},${alpha})`); g.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - w * 0.2, y); ctx.lineTo(x + w * 0.2, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x - w, y + h); ctx.closePath(); ctx.fill(); ctx.restore();
}
export function warmLight(ctx, alpha = 0.18) {
  ctx.save(); const g = ctx.createRadialGradient(W * 0.22, H * 0.12, 80, W * 0.22, H * 0.12, W * 0.9);
  g.addColorStop(0, `rgba(255,238,196,${alpha})`); g.addColorStop(1, 'rgba(255,238,196,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}
export function finishPaper(ctx) {
  ctx.save(); ctx.fillStyle = grainPattern(ctx); ctx.fillRect(0, 0, W, H); ctx.restore();
}

// ---- v5 场景细节：参照用户给定样片的空气感与手作层 ----
// 全部用便宜的路径绘制，不用 shadowBlur / ctx.filter（软件 canvas 上会慢 50 倍）。

/** 漂浮纸屑/尘埃：缓慢上升＋横向摆动，12fps 量化保持定格手作感。 */
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
