/**
 * plate.mjs — Paper-plate texture, registration marks, miniature grading, and kinetic stamp
 * typography engine (synthesizing world-execute-me-lyric-mv/src/components/plate.js & voxel-mv/STYLE.md).
 * All lyric strings come from bound cues — zero hardcoded lyrics live here.
 */
import { createCanvas } from './actors.mjs';
import { detHash } from './jigsaw.mjs';

export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const mix = (a, b, k) => a + (b - a) * k;
export const prog = (t, t0, t1) => clamp((t - t0) / Math.max(1e-6, t1 - t0));
export const ease = (x) => {
  const k = clamp(x);
  return k * k * (3 - 2 * k);
};
export const easeOut = (x) => {
  const k = 1 - clamp(x);
  return 1 - k * k * k;
};
export const backOut = (x) => {
  const k = clamp(x) - 1;
  return 1 + 2.5 * k * k * k + 1.5 * k * k;
};
export { detHash as hash };

let GRAIN_CANVAS = null;
export function getGrainCanvas() {
  if (GRAIN_CANVAS) return GRAIN_CANVAS;
  const cv = createCanvas(1280, 720);
  const g = cv.getContext('2d');
  for (let i = 0; i < 9200; i++) {
    const light = i % 2 === 0;
    g.fillStyle = light ? '#f5ead0' : '#101d29';
    g.globalAlpha = 0.08 + detHash(i * 3 + 7) * 0.07;
    const x = detHash(i * 2 + 1) * 1280;
    const y = detHash(i * 2 + 2) * 720;
    const w = i % 7 === 0 ? 5 + detHash(i + 9) * 8 : 0.8 + detHash(i + 5) * 1.3;
    const h = i % 7 === 0 ? 0.7 : 0.8 + detHash(i + 11) * 1.2;
    g.fillRect(x, y, w, h);
  }
  GRAIN_CANVAS = cv;
  return cv;
}

export function rect(c, x, y, w, h, col, r = 0) {
  c.fillStyle = col;
  c.beginPath();
  if (r > 0) c.roundRect(x, y, w, h, r);
  else c.rect(x, y, w, h);
  c.fill();
}

export function poly(c, pts, col, strokeCol = null, lw = 1.5) {
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  if (col) {
    c.fillStyle = col;
    c.fill();
  }
  if (strokeCol) {
    c.strokeStyle = strokeCol;
    c.lineWidth = lw;
    c.lineJoin = 'round';
    c.stroke();
  }
}

export function line(c, pts, col, w = 2, dash = null) {
  c.save();
  if (dash) c.setLineDash(dash);
  c.strokeStyle = col;
  c.lineWidth = w;
  c.lineJoin = 'round';
  c.lineCap = 'round';
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.stroke();
  c.restore();
}

export function ellipse(c, x, y, rx, ry, col, rot = 0) {
  c.fillStyle = col;
  c.beginPath();
  c.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, Math.PI * 2);
  c.fill();
}

export function shadowPlate(c, dx, dy, fn) {
  c.save();
  c.translate(dx, dy);
  fn(true);
  c.restore();
  fn(false);
}

/**
 * Corner crop marks & registration target (from world-execute-me-lyric-mv/src/components/plate.js).
 */
export function drawCropMarks(c, { inset = 22, len = 18, color = 'rgba(235, 222, 194, 0.34)', target = false } = {}) {
  const x0 = inset;
  const y0 = 46;
  const x1 = 1280 - inset;
  const y1 = 720 - inset;
  for (const [x, y, sx, sy] of [
    [x0, y0, 1, 1],
    [x1, y0, -1, 1],
    [x1, y1, -1, -1],
    [x0, y1, 1, -1],
  ]) {
    line(
      c,
      [
        [x, y + sy * 5],
        [x, y + sy * (5 + len)],
      ],
      color,
      1.3
    );
    line(
      c,
      [
        [x + sx * 5, y],
        [x + sx * (5 + len), y],
      ],
      color,
      1.3
    );
  }
  if (target) {
    c.strokeStyle = color;
    c.lineWidth = 1.1;
    c.beginPath();
    c.arc(640, y0 + 2, 5.5, 0, Math.PI * 2);
    c.stroke();
  }
}

/**
 * Halftone 45-degree dot screen on paper plates.
 */
export function drawDotScreen(c, { color = 'rgba(30, 44, 58, 0.08)', step = 20, r0 = 0.8, r1 = 1.7 } = {}) {
  c.fillStyle = color;
  c.beginPath();
  for (let j = 0, y = 14; y < 720; y += step, j++) {
    const rad = mix(r0, r1, y / 720);
    for (let x = 14 + (j % 2) * (step * 0.5); x < 1280; x += step) {
      c.moveTo(x + rad, y);
      c.arc(x, y, rad, 0, Math.PI * 2);
    }
  }
  c.fill();
}

/**
 * Kinetic paper stamp tiles (matching the ransom-card / stamp aesthetic of 《把回忆拼好给你》.mp4).
 * Uses cue.stamps character-slice indices so zero lyric text is hardcoded in code!
 */
export function drawStampTiles(
  c,
  cue,
  bound,
  t,
  { cx = 640, y = 612, tileH = 34, darkTheme = false } = {}
) {
  if (!cue || !cue.stamps?.length) return;
  const groups = cue.stamps.map(([c0, c1, dt, hi, sc = 1]) => {
    const text = bound.slice(cue.line, c0, c1);
    const chars = Array.from(text);
    return { chars, dt, hi, sc };
  });

  // Measure layout
  const items = [];
  let totalW = 0;
  for (let gi = 0; gi < groups.length; gi++) {
    const g = groups[gi];
    for (let ci = 0; ci < g.chars.length; ci++) {
      const w = Math.round(30 * g.sc);
      const h = Math.round(tileH * g.sc);
      items.push({
        ch: g.chars[ci],
        dt: g.dt + ci * 0.045,
        hi: g.hi,
        sc: g.sc,
        w,
        h,
        idx: items.length,
      });
      totalW += w + 4;
    }
    if (gi < groups.length - 1) totalW += 4;
  }
  totalW -= 4;

  let curX = cx - totalW / 2;
  let itemCursor = 0;
  for (let gi = 0; gi < groups.length; gi++) {
    const g = groups[gi];
    for (let ci = 0; ci < g.chars.length; ci++) {
      const it = items[itemCursor++];
      const appear = prog(t, cue.start + it.dt, cue.start + it.dt + 0.18);
      if (appear > 0) {
        const pop = backOut(appear);
        const tilt = (detHash(cue.line * 37 + it.idx * 13) - 0.5) * 0.075;
        const px = curX + it.w / 2;
        const py = y - (1 - pop) * 10;
        c.save();
        c.globalAlpha *= clamp(appear * 1.5);
        c.translate(px, py);
        c.rotate(tilt);
        c.scale(0.84 + 0.16 * pop, 0.84 + 0.16 * pop);

        // Offset registration shadow
        rect(c, -it.w / 2 + 2.2, -it.h / 2 + 2.6, it.w, it.h, 'rgba(14, 24, 36, 0.34)', 4);
        const bg = it.hi ? '#e77946' : darkTheme ? '#f3e7cd' : '#fbf3e2';
        const fg = it.hi ? '#fffaf0' : '#263847';
        const border = it.hi ? '#f9c79b' : '#cbb999';
        rect(c, -it.w / 2, -it.h / 2, it.w, it.h, bg, 4);
        c.strokeStyle = border;
        c.lineWidth = 1.2;
        c.strokeRect(-it.w / 2 + 0.6, -it.h / 2 + 0.6, it.w - 1.2, it.h - 1.2);

        c.font = `700 ${Math.round(19 * it.sc)}px MvBold`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillStyle = fg;
        c.fillText(it.ch, 0, 0.5);
        c.restore();
      }
      curX += it.w + 4;
    }
    if (gi < groups.length - 1) curX += 4;
  }
}

/**
 * Vertical hanging stamp strips for the monochrome rainy street shot (matching ref #13-#14).
 */
export function drawVerticalRainStamps(c, cue, bound, t) {
  if (!cue) return;
  const col1 = Array.from(bound.slice(cue.line, 0, 7));
  const col2 = Array.from(bound.slice(cue.line, 7, 13));
  const cols = [
    { chars: col1, x: 1148, y0: 96, t0: cue.start + 0.08, hiIdx: [2, 3] },
    { chars: col2, x: 1102, y0: 132, t0: cue.start + 1.45, hiIdx: [0] },
  ];
  for (const col of cols) {
    const kLine = easeOut(prog(t, col.t0 - 0.05, col.t0 + 0.45));
    if (kLine <= 0) continue;
    line(
      c,
      [
        [col.x, 42],
        [col.x, 42 + kLine * (col.y0 - 42)],
      ],
      'rgba(225, 220, 205, 0.48)',
      1.3
    );
    col.chars.forEach((ch, i) => {
      const a = prog(t, col.t0 + i * 0.1, col.t0 + i * 0.1 + 0.22);
      if (a <= 0) return;
      const hi = col.hiIdx.includes(i);
      const yy = col.y0 + i * 33;
      const sway = Math.sin(t * 1.8 + i * 0.7) * 1.6;
      c.save();
      c.globalAlpha = ease(a);
      c.translate(col.x + sway, yy);
      rect(c, -14 + 2, -14 + 2, 28, 28, 'rgba(15, 24, 34, 0.32)', 3);
      rect(c, -14, -14, 28, 28, hi ? '#df7c4f' : '#f4ebd7', 3);
      c.font = '700 17px MvBold';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillStyle = hi ? '#fff8ee' : '#2a3945';
      c.fillText(ch, 0, 0.5);
      c.restore();
    });
  }
}

/**
 * Rising glowing sky-lantern character cards for L9 & L10a (matching ref #20-#22).
 */
export function drawSkyLanternStamps(c, cue9, bound, t, { arcOnly = false } = {}) {
  const chars = Array.from(bound.text(9));
  const tBase = cue9.start;
  chars.forEach((ch, i) => {
    const tAppear = tBase + 0.18 + i * 0.24;
    const a = prog(t, tAppear, tAppear + 0.35);
    if (a <= 0) return;
    const rise = easeOut(prog(t, tAppear, tBase + 2.9));
    const u = (i - (chars.length - 1) / 2) / 3.2; // -1 .. +1
    const targetX = 640 + u * 235;
    const targetY = 176 + u * u * 54 + Math.sin(t * 2.1 + i) * 3.5;
    const startX = 635 + u * 44;
    const startY = 398;
    const x = arcOnly ? targetX : mix(startX, targetX, rise);
    const y = arcOnly ? targetY - (t - 31.4) * 8 : mix(startY, targetY, rise);
    const hi = i === 0 || i >= 5;

    c.save();
    c.globalAlpha = ease(a) * clamp((34.25 - t) / 0.45, 0, 1);
    const glow = c.createRadialGradient(x, y, 2, x, y, 36);
    glow.addColorStop(0, hi ? 'rgba(255, 178, 107, 0.52)' : 'rgba(255, 232, 178, 0.42)');
    glow.addColorStop(1, 'rgba(255, 190, 120, 0)');
    c.fillStyle = glow;
    c.fillRect(x - 36, y - 36, 72, 72);

    c.translate(x, y);
    c.rotate(Math.sin(t * 1.6 + i * 1.1) * 0.06);
    rect(c, -17, -20, 34, 40, hi ? '#eb7f4b' : '#fff0cf', 6);
    rect(c, -11, 18, 22, 4, '#d69e5c', 2);
    c.font = '700 20px MvBold';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = hi ? '#fffaf0' : '#3b2e28';
    c.fillText(ch, 0, -1);
    c.restore();
  });
}

/**
 * Large plate keyword / phrase set into the sky or horizon with offset ink plate shadow.
 */
export function drawHorizonKeywordPlate(
  c,
  str,
  t,
  t0,
  {
    cx = 640,
    y = 215,
    size = 54,
    color = '#24485c',
    shadow = 'rgba(255, 245, 220, 0.72)',
    dx = 3,
    dy = 3,
    step = 0.09,
    spacing = 8,
  } = {}
) {
  const chars = Array.from(str);
  c.save();
  c.font = `700 ${size}px MvBold`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const stepX = size + spacing;
  const startX = cx - ((chars.length - 1) * stepX) / 2;
  chars.forEach((ch, i) => {
    const k = prog(t, t0 + i * step, t0 + i * step + 0.22);
    if (k <= 0) return;
    const s = 1.12 - 0.12 * easeOut(k);
    const x = startX + i * stepX;
    c.save();
    c.globalAlpha = ease(k);
    c.translate(x, y);
    c.scale(s, s);
    c.fillStyle = shadow;
    c.fillText(ch, dx, dy);
    c.fillStyle = color;
    c.fillText(ch, 0, 0);
    c.restore();
  });
  c.restore();
}

/**
 * Miniature diorama post-grade & soft vignette (inspired by voxel-mv's scene look/grade).
 * Applied BEFORE the bottom caption band so lyrics stay high-contrast and unaffected.
 */
export function applyActGrade(c, { tint = 'rgba(255, 232, 195, 0.05)', vignette = 0.22 } = {}) {
  c.save();
  // Subtle top-left studio warm key wash
  const key = c.createLinearGradient(0, 0, 1280, 720);
  key.addColorStop(0, tint);
  key.addColorStop(0.55, 'rgba(0,0,0,0)');
  key.addColorStop(1, 'rgba(14, 22, 36, 0.08)');
  c.fillStyle = key;
  c.fillRect(0, 0, 1280, 720);

  if (vignette > 0) {
    const vg = c.createRadialGradient(640, 350, 340, 640, 360, 790);
    vg.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vg.addColorStop(1, `rgba(10, 18, 28, ${vignette})`);
    c.fillStyle = vg;
    c.fillRect(0, 0, 1280, 720);
  }

  c.globalAlpha = 0.11;
  c.drawImage(getGrainCanvas(), 0, 0);
  c.restore();
}

/**
 * High-legibility bottom caption band (world-execute-me band() + OCR-verified contrast).
 * Renders at y = 652..698 in 1280x720 (y = 978..1047 in 1920x1080).
 */
export function drawCaptionBand(c, cue, t) {
  if (!cue) return;
  c.save();
  c.font = '700 29px MvBold';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const tw = c.measureText(cue.text).width;
  const padX = 28;
  const bw = Math.max(320, tw + padX * 2);
  const bx = 640 - bw / 2;
  const by = 653;
  const bh = 44;

  // Paper-ink backing strip with subtle cream rule
  rect(c, bx + 2, by + 2.5, bw, bh, 'rgba(8, 15, 24, 0.42)', 7);
  rect(c, bx, by, bw, bh, 'rgba(17, 29, 42, 0.88)', 7);
  c.strokeStyle = 'rgba(238, 222, 190, 0.42)';
  c.lineWidth = 1.2;
  c.beginPath();
  c.roundRect(bx + 0.6, by + 0.6, bw - 1.2, bh - 1.2, 7);
  c.stroke();

  // Crisp stroke + warm cream fill
  c.strokeStyle = '#0d1824';
  c.lineWidth = 4.5;
  c.lineJoin = 'round';
  c.strokeText(cue.text, 640, by + bh / 2 + 0.5);
  c.fillStyle = '#fff5df';
  c.fillText(cue.text, 640, by + bh / 2 + 0.5);
  c.restore();
}
