// scenes.js — Dense 16-bit storybook MV: rapid book entry, 81 short narrative shots, every map hero is Whale-girl.
import { C, W, H, LUT, hash, clamp, lerp, mod, seg } from './px.js';
import { drawTextPx, measureTextPx } from './glyphs.js';
import {
  drawRiceBowl,
  drawWhaleHero,
  drawMapWhaleHero,
  drawPaperBoat,
  drawCastSprite,
  drawGptDragonBoss,
  drawFlyingGptDragon,
  drawSwanMorph,
  drawSaberTiger,
  drawGoldenSunbird,
  drawStoryEmblem,
} from './cast.js';

// --- Shared scenery builders: the world remains 320×180, with crisp, richly layered 640×360 cast. ---
function clouds(fb, t, dark = false, yShift = 0) {
  const col = dark ? C.dslate : C.white;
  for (let i = 0; i < 4; i++) {
    const x = mod(25 + i * 92 + t * (dark ? 1.2 : 2.4), W + 58) - 28;
    const y = 23 + (i % 2) * 12 + yShift;
    fb.ellipse(x, y, 16, 5, col);
    fb.ellipse(x - 8, y + 2, 9, 4, dark ? C.navy : C.white);
    fb.ellipse(x + 8, y + 1, 10, 4, dark ? C.navy : C.silver);
  }
}

function stars(fb, t, count = 48, color = C.goldL, yMax = 118) {
  for (let i = 0; i < count; i++) {
    const x = Math.floor(hash(i + 31, 9) * W);
    const y = 7 + Math.floor(hash(i + 9, 57) * yMax);
    if (((i + Math.floor(t * 2)) % 5) === 0) {
      fb.px(x, y, i % 4 === 0 ? C.uiW : color);
      if (i % 9 === 0) {
        fb.hline(x - 1, x + 1, y, C.goldL);
        fb.vline(x, y - 1, y + 1, C.goldL);
      }
    } else {
      fb.px(x, y, i % 7 === 0 ? C.cyan : color);
    }
  }
}

function sun(fb, x, y, r = 11, color = C.goldL) {
  fb.disc(x, y, r + 4, C.goldD);
  fb.disc(x, y, r, color);
  fb.disc(x - 2, y - 2, Math.max(2, r * 0.45), C.uiW);
  for (let a = 0; a < 8; a++) {
    const ang = a * Math.PI / 4;
    fb.px(x + Math.round(Math.cos(ang) * (r + 7)), y + Math.round(Math.sin(ang) * (r + 7)), C.gold);
  }
}

function hillBackdrop(fb, t, { night = false, sunset = false, dream = false } = {}) {
  const sky = night
    ? [C.ink, C.navy, C.dslate]
    : dream
      ? [C.plum, C.lavender, C.blue, C.cyan]
      : sunset
        ? [C.plum, C.rose, C.orange, C.gold]
        : [C.blue, C.cyan, C.white];
  fb.gradV(0, 0, W, H, sky);
  if (night) stars(fb, t, 48, C.goldL, 112);
  else {
    clouds(fb, t, false, 0);
    sun(fb, 272, 30, sunset ? 8 : 10, sunset ? C.gold : C.goldL);
  }
  fb.tri(-15, 137, 58, 69, 151, 139, night ? C.dslate : C.slate);
  fb.tri(70, 138, 163, 76, 246, 141, night ? C.navy : C.dslate);
  fb.tri(185, 138, 267, 85, 340, 142, night ? C.dslate : C.slate);
  fb.gradV(0, 126, W, 54, night ? [C.dgreen, C.night, C.ink] : [C.lime, C.green, C.dgreen]);
  fb.hline(0, W - 1, 128, night ? C.navy : C.green);
}

function pine(fb, x, baseY, scale = 1, dark = false) {
  const trunk = dark ? C.dbrown : C.brown;
  const a = dark ? C.navy : C.dgreen;
  const b = dark ? C.dslate : C.green;
  const h = 25 * scale, w = 13 * scale;
  fb.rect(x - 2 * scale, baseY - 8 * scale, 4 * scale, 9 * scale, trunk);
  fb.tri(x, baseY - h, x - w, baseY - h * 0.36, x + w, baseY - h * 0.36, a);
  fb.tri(x, baseY - h * 0.72, x - w * 0.86, baseY - h * 0.13, x + w * 0.86, baseY - h * 0.13, b);
  fb.line(x, baseY - h + 2, x, baseY - 3, dark ? C.slate : C.lime);
}

function roundTree(fb, x, baseY, scale = 1, blossom = false) {
  fb.rect(x - 3 * scale, baseY - 17 * scale, 6 * scale, 18 * scale, C.brown);
  const leaf = blossom ? C.pink : C.green;
  fb.disc(x, baseY - 25 * scale, 13 * scale, leaf);
  fb.disc(x - 9 * scale, baseY - 19 * scale, 9 * scale, blossom ? C.rose : C.lime);
  fb.disc(x + 9 * scale, baseY - 20 * scale, 9 * scale, blossom ? C.white : C.dgreen);
  fb.px(x - 3 * scale, baseY - 30 * scale, blossom ? C.white : C.lime);
}

function castle(fb, x, baseY, scale = 1, night = false, rose = false) {
  const wall = night ? C.steel : C.white;
  const shade = night ? C.dslate : C.silver;
  const roof = rose ? C.rose : night ? C.plum : C.blue;
  const w = 58 * scale;
  const h = 35 * scale;
  const left = x - w / 2;
  fb.rect(left - 4 * scale, baseY - h * 0.45, w + 8 * scale, h * 0.45, shade);
  fb.rect(left, baseY - h, w, h, wall);
  fb.rect(left + w - 8 * scale, baseY - h, 8 * scale, h, shade);
  fb.box(left, baseY - h, w, h, C.ink);
  for (let i = 0; i < 3; i++) {
    const tx = left + (5 + i * 22) * scale;
    const tw = (i === 1 ? 18 : 15) * scale;
    const th = (i === 1 ? 70 : 48) * scale;
    const ty = baseY - th;
    fb.rect(tx, ty, tw, th, i === 1 ? wall : shade);
    fb.box(tx, ty, tw, th, C.ink);
    fb.tri(tx - 3 * scale, ty, tx + tw + 3 * scale, ty, tx + tw / 2, ty - 19 * scale, roof);
    fb.line(tx + tw / 2, ty - 28 * scale, tx + tw / 2, ty - 19 * scale, C.gold);
    fb.tri(tx + tw / 2, ty - 28 * scale, tx + tw / 2 + 7 * scale, ty - 25 * scale, tx + tw / 2, ty - 22 * scale, C.scarf);
    fb.rect(tx + tw * 0.40, ty + 12 * scale, 4 * scale, 7 * scale, night ? C.goldL : C.navy);
  }
  for (let q = 0; q < 7; q++) {
    const wx = left + (4 + q * 8) * scale;
    fb.rect(wx, baseY - 4 * scale, 5 * scale, 4 * scale, wall);
  }
  fb.rect(x - 7 * scale, baseY - 21 * scale, 14 * scale, 21 * scale, C.dbrown);
  fb.box(x - 7 * scale, baseY - 21 * scale, 14 * scale, 21 * scale, C.ink);
  fb.tri(x - 8 * scale, baseY - 21 * scale, x + 8 * scale, baseY - 21 * scale, x, baseY - 31 * scale, roof);
  fb.disc(x, baseY - 14 * scale, 3 * scale, C.goldL);
}

function bridge(fb, x, y, span = 92, arch = 17, lanterns = true) {
  const l = x - span / 2, r = x + span / 2;
  fb.line(l, y, x, y - arch, C.dbrown, 5);
  fb.line(x, y - arch, r, y, C.dbrown, 5);
  fb.line(l, y - 5, x, y - arch - 5, C.tan, 2);
  fb.line(x, y - arch - 5, r, y - 5, C.tan, 2);
  fb.hline(l - 2, r + 2, y + 2, C.ink);
  for (let px = Math.ceil(l / 8) * 8; px <= r; px += 8) {
    const u = Math.abs(px - x) / Math.max(1, span / 2);
    const py = y - Math.round((1 - u) * arch);
    fb.vline(px, py - 7, py - 3, C.dbrown);
    fb.px(px, py - 8, C.goldL);
  }
  if (lanterns) {
    for (const lx of [l + 6, r - 6]) {
      fb.vline(lx, y - 19, y - 7, C.dbrown);
      fb.box(lx - 3, y - 25, 7, 7, C.ink);
      fb.rect(lx - 2, y - 24, 5, 5, C.gold);
      fb.px(lx, y - 23, C.uiW);
    }
  }
}

function river(fb, t, baseY = 123, { rainbow = false, night = false, width = 27, curve = 0.018, phase = 0 } = {}) {
  fb.gradV(0, baseY - 2, W, H - baseY + 2, night ? [C.navy, C.dslate, C.ink] : [C.blue, C.cyan, C.navy]);
  for (let x = 0; x < W; x++) {
    const cy = baseY + Math.sin(x * curve + t * 0.62 + phase) * 5 + Math.sin(x * 0.054 - t * 0.31) * 2;
    for (let d = -width; d <= width; d++) {
      const y = Math.round(cy + d);
      if (y < baseY - 5 || y >= H) continue;
      const ad = Math.abs(d);
      if (rainbow && ad < 12) {
        const band = mod(Math.floor((d + 12) / 3) + Math.floor(t * 2 + x * 0.03), 8);
        const colors = [C.scarf, C.orange, C.gold, C.lime, C.cyan, C.blue, C.lavender, C.pink];
        fb.px(x, y, colors[band]);
      } else if (ad > width - 4) {
        if ((x + Math.floor(t * 9) + d) % 7 < 2) fb.px(x, y, night ? C.dslate : C.cyan);
      } else if ((x * 3 + Math.floor(t * 12) + d * 5) % 29 === 0) {
        fb.px(x, y, night ? C.goldL : C.white);
      }
    }
  }
  for (let i = 0; i < 15; i++) {
    const x = mod(i * 29 + Math.floor(t * (rainbow ? 15 : 9)), W);
    const y = Math.round(baseY + 8 + (i % 4) * 7 + Math.sin(t * 3 + i) * 2);
    fb.hline(x, x + 3 + i % 4, y, i % 3 === 0 ? C.white : night ? C.cyan : C.silver);
  }
}

function mapRiver(fb, t) {
  // The route map is a hand-painted isometric town map, not a minimap UI. Whale-girl is its only avatar.
  for (let y = 38; y < H; y++) {
    const cx = 159 + Math.sin(y * 0.039 + t * 0.12) * 49 + Math.sin(y * 0.092) * 19;
    const hw = 10 + Math.round(2 * Math.sin(y * 0.15));
    fb.hline(cx - hw - 3, cx + hw + 3, y, C.navy);
    fb.hline(cx - hw, cx + hw, y, y % 6 < 3 ? C.blue : C.cyan);
    if (y % 11 < 3) fb.hline(cx - 4, cx + 3, y, C.white);
    if (y % 17 < 4) fb.px(cx + Math.sin(y) * (hw - 1), y, C.goldL);
  }
}

function flowers(fb, y, count = 30, t = 0, color = C.goldL) {
  for (let i = 0; i < count; i++) {
    const x = Math.floor(hash(i + 4, y, 0) * W);
    const yy = y + Math.floor(hash(i, y, 5) * 9);
    if (((i + Math.floor(t * 2)) % 3) === 0) {
      fb.vline(x, yy - 4, yy, C.green);
      fb.px(x, yy - 5, i % 3 ? color : C.pink);
      fb.px(x + 1, yy - 5, C.uiW);
    } else {
      fb.px(x, yy, i % 4 ? C.lime : C.pink);
    }
  }
}

function fireflies(fb, t, count = 18, yBase = 120) {
  for (let i = 0; i < count; i++) {
    const x = mod(hash(i, 5, 3) * W + Math.sin(t * 1.3 + i) * 7, W);
    const y = yBase + mod(hash(i, 7, 2) * 52 + Math.sin(t * 1.9 + i * 2) * 4, 56);
    if ((Math.floor(t * 4 + i) % 3) !== 0) {
      fb.disc(x, y, i % 5 === 0 ? 2.7 : 1.4, i % 4 === 0 ? C.goldL : C.cyan);
    }
  }
}

function book(fb, x, y, w = 102, h = 48, closed = false, cover = C.crimson) {
  const left = x - w / 2, top = y - h / 2;
  fb.rect(left - 3, top - 2, w + 6, h + 5, C.dbrown);
  fb.box(left - 3, top - 2, w + 6, h + 5, C.ink);
  if (closed) {
    fb.rect(left, top, w, h, cover);
    fb.rect(left + 4, top + 4, w - 8, h - 8, C.scarfD);
    fb.box(left + 6, top + 6, w - 12, h - 12, C.gold);
    fb.vline(x, top + 3, top + h - 3, C.dbrown);
    fb.hline(left + 10, left + w - 11, top + 8, C.goldL);
    fb.hline(left + 10, left + w - 11, top + h - 9, C.goldL);
  } else {
    fb.tri(left, top + 3, x, y + 1, left, top + h, C.parchment);
    fb.tri(x, y + 1, left + w, top + 3, left + w, top + h, C.uiW);
    fb.line(left, top + 3, x, y + 1, C.tan);
    fb.line(left + w, top + 3, x, y + 1, C.tan);
    fb.line(left, top + h, x, y + 1, C.dbrown);
    fb.line(left + w, top + h, x, y + 1, C.dbrown);
    fb.vline(x, y, y + Math.floor(h * 0.44), C.brown);
    for (let i = 0; i < 4; i++) {
      fb.hline(left + 9, x - 7, top + 13 + i * 7, C.tan);
      fb.hline(x + 7, left + w - 9, top + 13 + i * 7, C.tan);
    }
  }
  fb.disc(left + 7, top + 7, 2, C.goldL);
}

function lamp(fb, x, y, t = 0, size = 1) {
  const flick = Math.floor(t * 8) & 1;
  fb.vline(x, y - 13 * size, y + 2 * size, C.dbrown);
  fb.line(x - 5 * size, y - 14 * size, x + 5 * size, y - 14 * size, C.dbrown, 2);
  fb.box(x - 4 * size, y - 22 * size, 9 * size, 9 * size, C.ink);
  fb.rect(x - 3 * size, y - 21 * size, 7 * size, 7 * size, flick ? C.goldL : C.gold);
  fb.px(x - 1 * size, y - 20 * size, C.uiW);
  fb.tri(x - 3 * size, y - 23 * size, x + 4 * size, y - 23 * size, x, y - 27 * size, C.scarfD);
}

function clock(fb, x, y, r = 8, t = 0, color = C.goldL) {
  fb.disc(x, y, r + 2, C.dbrown);
  fb.disc(x, y, r, color);
  fb.disc(x, y, r - 2, C.parchment);
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6;
    fb.px(x + Math.round(Math.sin(a) * (r - 3)), y - Math.round(Math.cos(a) * (r - 3)), C.dbrown);
  }
  const sec = t * 3;
  fb.line(x, y, x + Math.sin(sec) * (r - 3), y - Math.cos(sec) * (r - 3), C.crimson);
  fb.line(x, y, x + Math.sin(sec * 0.12) * (r - 5), y - Math.cos(sec * 0.12) * (r - 5), C.ink, 2);
}

function candyHouse(fb, x, baseY, s = 1) {
  fb.rect(x - 22 * s, baseY - 31 * s, 44 * s, 31 * s, C.parchment);
  fb.box(x - 22 * s, baseY - 31 * s, 44 * s, 31 * s, C.dbrown);
  fb.tri(x - 28 * s, baseY - 31 * s, x + 28 * s, baseY - 31 * s, x, baseY - 58 * s, C.scarf);
  fb.tri(x - 22 * s, baseY - 32 * s, x + 23 * s, baseY - 32 * s, x, baseY - 52 * s, C.uiW);
  fb.rect(x - 15 * s, baseY - 25 * s, 10 * s, 13 * s, C.cyan);
  fb.box(x - 15 * s, baseY - 25 * s, 10 * s, 13 * s, C.dbrown);
  fb.rect(x + 6 * s, baseY - 25 * s, 10 * s, 13 * s, C.pink);
  fb.box(x + 6 * s, baseY - 25 * s, 10 * s, 13 * s, C.dbrown);
  fb.rect(x - 4 * s, baseY - 16 * s, 8 * s, 16 * s, C.brown);
  fb.box(x - 4 * s, baseY - 16 * s, 8 * s, 16 * s, C.ink);
  fb.disc(x - 10 * s, baseY - 38 * s, 4 * s, C.goldL);
  fb.disc(x + 11 * s, baseY - 42 * s, 4 * s, C.cyan);
}

function watermill(fb, x, y, t, scale = 1) {
  const r = 20 * scale;
  fb.rect(x - 17 * scale, y - 39 * scale, 34 * scale, 39 * scale, C.tan);
  fb.box(x - 17 * scale, y - 39 * scale, 34 * scale, 39 * scale, C.dbrown);
  fb.tri(x - 21 * scale, y - 39 * scale, x + 21 * scale, y - 39 * scale, x, y - 57 * scale, C.scarfD);
  fb.tri(x - 18 * scale, y - 40 * scale, x + 18 * scale, y - 40 * scale, x, y - 53 * scale, C.scarf);
  const cx = x + 22 * scale, cy = y - 5 * scale;
  fb.disc(cx, cy, r + 2, C.dbrown);
  fb.disc(cx, cy, r, C.tan);
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4 + t * 2.4;
    fb.line(cx, cy, cx + Math.cos(a) * r, cy + Math.sin(a) * r, C.dbrown, 3);
    fb.px(cx + Math.cos(a) * r, cy + Math.sin(a) * r, C.goldL);
  }
  fb.disc(cx, cy, 4 * scale, C.gold);
}

function timeFalls(fb, t, x = 258, yTop = 66, yBottom = 134) {
  for (let i = 0; i < 10; i++) {
    const xj = x - 18 + i * 4;
    const shift = mod(t * (13 + i) + i * 17, 30);
    fb.line(xj, yTop + shift * 0.2, xj + Math.sin(t + i) * 1.5, yBottom, i % 3 === 0 ? C.goldL : C.cyan, i % 3 === 0 ? 2 : 1);
  }
  for (let i = 0; i < 5; i++) {
    const cy = yTop + mod(t * 16 + i * 17, yBottom - yTop);
    clock(fb, x + (i % 2 ? 11 : -12), cy, i % 2 ? 5 : 6, t + i, i % 2 ? C.silver : C.goldL);
  }
  fb.rect(x - 24, yBottom, 49, 8, C.cyan);
  fb.hline(x - 22, x + 22, yBottom + 3, C.white);
}

function teaTable(fb, x, y, t) {
  fb.ellipse(x, y, 26, 6, C.dbrown);
  fb.rect(x - 23, y, 46, 5, C.tan);
  fb.vline(x - 14, y + 3, y + 21, C.dbrown);
  fb.vline(x + 14, y + 3, y + 21, C.dbrown);
  // Teapot with animated steam
  fb.ellipse(x - 9, y - 7, 7, 6, C.plum);
  fb.rect(x - 12, y - 15, 7, 4, C.gold);
  fb.line(x - 2, y - 8, x + 3, y - 10, C.plum);
  fb.disc(x - 9, y - 2, 1.4, C.goldL);
  fb.ellipse(x + 9, y - 7, 5, 2, C.uiW);
  for (let i = 0; i < 3; i++) {
    const sx = x - 10 + i * 4;
    fb.px(sx, y - 21 - mod(Math.floor(t * 5 + i), 4), C.uiW);
  }
}

function apple(fb, x, y) {
  fb.disc(x, y, 4, C.scarf);
  fb.px(x - 1, y - 4, C.uiW);
  fb.line(x, y - 4, x + 1, y - 7, C.dbrown);
  fb.px(x + 2, y - 6, C.lime);
}

function drawTownStalls(fb, t) {
  const stalls = [
    { x: 58, roof: C.scarf, body: C.parchment },
    { x: 160, roof: C.plum, body: C.slate },
    { x: 262, roof: C.blue, body: C.sand },
  ];
  for (const [i, s] of stalls.entries()) {
    const x = s.x;
    fb.rect(x - 33, 88, 66, 48, s.body);
    fb.box(x - 33, 88, 66, 48, C.dbrown);
    fb.tri(x - 39, 89, x + 39, 89, x, 64, s.roof);
    fb.hline(x - 30, x + 30, 91, C.goldL);
    for (let k = -2; k <= 2; k++) {
      fb.rect(x + k * 12 - 4, 94, 7, 9, i === 0 ? C.pink : i === 1 ? C.cyan : C.goldL);
      fb.rect(x + k * 12 - 4, 107 + Math.floor(Math.sin(t * 3 + k) * 1), 7, 13, i === 0 ? C.gold : i === 1 ? C.lime : C.plum);
    }
    if (i === 0) {
      for (let k = -1; k <= 1; k++) fb.disc(x + k * 13, 81, 3, k === 0 ? C.goldL : C.pink);
    } else if (i === 1) {
      fb.disc(x, 78, 7, C.cyan); fb.disc(x, 78, 3, C.uiW);
    } else {
      fb.rect(x - 11, 73, 22, 3, C.gold);
      fb.px(x - 9, 69, C.goldL); fb.px(x + 9, 69, C.goldL);
    }
  }
}

function magicParticles(fb, t, cx, cy, radius = 32, count = 14, c1 = C.goldL, c2 = C.cyan) {
  for (let i = 0; i < count; i++) {
    const a = t * (0.9 + i * 0.01) + i * Math.PI * 2 / count;
    const r = radius * (0.66 + 0.34 * Math.sin(t * 2 + i));
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r * 0.62;
    fb.px(x, y, i % 3 === 0 ? c2 : c1);
    if (i % 4 === 0) { fb.hline(x - 2, x + 2, y, c1); fb.vline(x, y - 2, y + 2, c1); }
  }
}

function palace(fb, x, baseY, t, underwater = false) {
  const wall = underwater ? C.whaleM : C.gold;
  const roof = underwater ? C.cyan : C.goldL;
  fb.rect(x - 44, baseY - 31, 88, 31, underwater ? C.navy : C.plum);
  fb.box(x - 44, baseY - 31, 88, 31, C.gold);
  for (let i = 0; i < 5; i++) {
    const tx = x - 38 + i * 19;
    const th = i === 2 ? 65 : 47 + (i % 2) * 6;
    fb.rect(tx, baseY - th, 13, th, wall);
    fb.box(tx, baseY - th, 13, th, C.ink);
    fb.tri(tx - 3, baseY - th, tx + 16, baseY - th, tx + 6, baseY - th - 17, roof);
    fb.rect(tx + 5, baseY - th + 14, 3, 9, C.uiW);
  }
  fb.rect(x - 5, baseY - 18, 10, 18, C.goldL);
  fb.box(x - 5, baseY - 18, 10, 18, C.dbrown);
  for (let i = 0; i < 9; i++) {
    const xx = x - 48 + i * 12;
    fb.px(xx, baseY - 4, i % 2 ? C.cyan : C.goldL);
  }
  magicParticles(fb, t, x, baseY - 32, 50, 10, underwater ? C.cyan : C.goldL, C.uiW);
}

function flowerArch(fb, x, y, t, color = C.pink) {
  fb.line(x - 28, y, x - 23, y - 48, C.green, 3);
  fb.line(x - 23, y - 48, x, y - 58, C.green, 3);
  fb.line(x, y - 58, x + 23, y - 48, C.green, 3);
  fb.line(x + 23, y - 48, x + 28, y, C.green, 3);
  for (let i = 0; i < 13; i++) {
    const a = Math.PI * (1.1 + i / 12 * 0.8);
    const xx = x + Math.cos(a) * 26;
    const yy = y - 8 + Math.sin(a) * 50;
    fb.disc(xx, yy, (i % 4 === 0) ? 3.6 : 2.4, i % 3 === 0 ? C.uiW : color);
  }
  magicParticles(fb, t, x, y - 45, 25, 8, C.goldL, C.uiW);
}

// --- Opening: the book is entered in the first 1.1 seconds; no idle walk-in. ---
function shotDesk(fb, t) {
  fb.gradV(0, 0, W, H, [C.night, C.dbrown, C.umber, C.brown]);
  for (let y = 26; y < H; y += 17) fb.hline(0, W - 1, y, y % 34 === 0 ? C.dbrown : C.brown);
  for (let x = 16; x < W; x += 47) fb.vline(x, 30, H, C.umber);
  // Open book ready to spring into a world
  book(fb, 172, 129, 110, 50, false);
  fb.rect(117, 155, 111, 9, C.dbrown);
  fb.box(117, 155, 111, 9, C.ink);
  // Continuity still-life: warm rice bowl, candle, ink, quill, potion vial
  drawRiceBowl(fb, 59, 139, t, 1.15);
  fb.rect(269, 132, 12, 23, C.tan); fb.box(269, 132, 12, 23, C.dbrown);
  fb.rect(272, 119, 6, 15, C.gold); fb.disc(275, 117, 3.4, C.goldL);
  fb.line(275, 113, 275, 107, C.white);
  fb.rect(235, 139, 8, 17, C.blue); fb.box(235, 139, 8, 17, C.ink); fb.px(239, 136, C.goldL);
  fb.line(239, 142, 255, 121, C.parchment, 2); fb.px(256, 120, C.scarf);
  // Hero sprints immediately, then leaps into the open page by 1.1s.
  const runU = seg(t, 0, 0.73);
  const leapU = seg(t, 0.73, 1.23);
  const hx = t < 0.73 ? lerp(-14, 142, runU) : lerp(142, 172, leapU);
  const jump = t < 0.73 ? 0 : Math.sin(leapU * Math.PI) * 30;
  const hy = 151 - jump;
  drawMapWhaleHero(fb, hx, hy, t, { pose: t < 0.73 ? 'run' : 'jump', facing: 1, scarfLen: 16 });
  if (t > 0.96) {
    const u = seg(t, 0.96, 1.6);
    magicParticles(fb, t * 4, 170, 132, 19 + 15 * u, 18, C.goldL, C.cyan);
    fb.glowDisc(171, 130, 4 + 8 * u, 12 + 25 * u);
  }
  if (t > 1.35) {
    // Page flare carries directly into the harbor cut, never a static title hold.
    for (let i = 0; i < 8; i++) fb.line(170, 132, 170 + Math.cos(i * Math.PI / 4) * 70, 132 + Math.sin(i * Math.PI / 4) * 45, C.goldL);
  }
}

function shotHarbor(fb, t, u) {
  hillBackdrop(fb, t);
  river(fb, t, 125, { rainbow: false, width: 23 });
  // Three docks, stacked crates, hanging signal flags and a busy boat-launch.
  fb.rect(0, 109, 92, 10, C.dbrown); fb.box(0, 109, 92, 10, C.ink);
  for (let x = 13; x < 85; x += 18) fb.vline(x, 116, 133, C.brown);
  fb.rect(219, 101, 101, 12, C.tan); fb.box(219, 101, 101, 12, C.dbrown);
  for (const [x, y] of [[24, 94], [283, 89], [302, 93]]) {
    fb.rect(x, y, 13, 13, C.sand); fb.box(x, y, 13, 13, C.dbrown); fb.hline(x + 2, x + 10, y + 5, C.tan);
  }
  castle(fb, 259, 110, 0.66, false);
  for (let i = 0; i < 3; i++) drawPaperBoat(fb, 82 + i * 95 + Math.sin(t + i) * 5, 125 + i * 7, t + i, { scale: i === 0 ? 0.8 : 0.55, withWhale: i === 0, chibiWhale: true, facing: 1 });
  drawWhaleHero(fb, lerp(114, 197, u), 117 + Math.sin(t * 3) * 2, t, { pose: 'happy', facing: 1, lantern: true, scarfLen: 17 });
  flowers(fb, 137, 16, t, C.goldL);
  magicParticles(fb, t, 94, 103, 23, 8, C.goldL, C.cyan);
}

function shotMarket(fb, t, u) {
  hillBackdrop(fb, t, { sunset: true });
  drawTownStalls(fb, t);
  fb.gradV(0, 137, W, 43, [C.tan, C.brown, C.dbrown]);
  for (let x = 0; x < W; x += 16) fb.hline(x, x + 9, 141 + (x % 3), C.parchment);
  // Doubao greets at the candy counter; Gemini leads the way between stalls.
  drawCastSprite(fb, 64, 132, 'doubao', t, { pose: 'cheer', role: 'redhood', facing: 1 });
  drawCastSprite(fb, 181, 129, 'gemini', t, { pose: 'walk', role: 'alice', facing: 1 });
  drawWhaleHero(fb, lerp(99, 234, u), 137, t, { pose: 'run', facing: 1, scarfLen: 15 });
  for (let i = 0; i < 12; i++) {
    const x = 25 + i * 24;
    fb.line(x, 52, x + 13, 64, C.dbrown);
    fb.tri(x + 13, 64, x + 28, 64, x + 20, 78, [C.gold, C.scarf, C.cyan, C.pink][i % 4]);
  }
  magicParticles(fb, t, 159, 80, 56, 12, C.goldL, C.pink);
}

function shotCastleRiver(fb, t, u) {
  hillBackdrop(fb, t, { sunset: true });
  river(fb, t, 130, { rainbow: true, width: 27, phase: 1.6 });
  castle(fb, 158, 128, 1.04, false);
  bridge(fb, 92, 131, 90, 15, true);
  drawPaperBoat(fb, 96 + u * 88, 130 + Math.sin(t * 2) * 2, t, { scale: 0.88, withWhale: true, chibiWhale: true, facing: 1 });
  drawFlyingGptDragon(fb, 260 - u * 78, 45 + Math.sin(t * 4) * 5, t, -1);
  flowers(fb, 151, 23, t, C.pink);
}

// --- Verse one: each lyric receives a specific story beat and a fast visual lead-in/counter-shot. ---
function snowGate(fb, t, u) {
  if (t >= 15.20) {
    // Cut from the wide gate chase to a closer garden path: fallen apples and butterflies lead the eye.
    hillBackdrop(fb, t);
    river(fb, t, 151, { width: 10 });
    castle(fb, 265, 127, 0.60, false);
    roundTree(fb, 52, 136, 0.96, true); roundTree(fb, 96, 140, 0.78, true);
    apple(fb, 116, 128); apple(fb, 220, 141); apple(fb, 283, 133);
    drawCastSprite(fb, lerp(191, 148, u), 139, 'claude', t, { pose: 'panic', role: 'princess', facing: -1 });
    drawWhaleHero(fb, lerp(108, 155, u), 148, t, { pose: 'run', facing: 1, scarfLen: 17 });
    for (let i = 0; i < 8; i++) {
      const x = 134 + i * 12 + Math.sin(t * 4 + i) * 8;
      const y = 75 + Math.cos(t * 5 + i) * 17;
      fb.tri(x, y, x - 4, y - 4, x - 2, y + 1, i % 2 ? C.pink : C.goldL);
      fb.tri(x, y, x + 4, y - 4, x + 2, y + 1, i % 2 ? C.cyan : C.gold);
    }
    magicParticles(fb, t, 158, 94, 32, 12, C.goldL, C.pink);
    return;
  }
  hillBackdrop(fb, t);
  castle(fb, 245, 130, 0.82, false);
  bridge(fb, 201, 137, 64, 11, false);
  for (const [x, y] of [[35, 123], [52, 129], [286, 138]]) apple(fb, x, y);
  roundTree(fb, 45, 132, 0.8); roundTree(fb, 89, 142, 0.65);
  const x = lerp(206, 120, u);
  drawCastSprite(fb, x, 133, 'claude', t, { pose: 'panic', role: 'princess', facing: -1 });
  drawWhaleHero(fb, x - 51, 140, t, { pose: 'run', facing: 1, scarfLen: 14 });
  magicParticles(fb, t, x + 17, 104, 22, 10, C.goldL, C.pink);
  for (let i = 0; i < 4; i++) {
    const bx = x + 26 + Math.sin(t * 5 + i) * 11 + i * 5;
    const by = 92 + Math.cos(t * 4 + i * 2) * 12;
    fb.line(bx - 2, by, bx, by - 2, C.goldL); fb.line(bx, by - 2, bx + 3, by, C.goldL);
  }
}

function wolfForest(fb, t, u) {
  if (t >= 18.65) {
    // Cut to the forest-floor view: the crimson cloak becomes a shield as GPT's eyes appear between trunks.
    hillBackdrop(fb, t, { night: true });
    river(fb, t, 152, { night: true, width: 9 });
    for (let i = 0; i < 7; i++) pine(fb, i * 50 - 8, 145 + (i % 2) * 5, 0.9 + (i % 3) * 0.08, true);
    fb.ellipse(173, 101, 49, 34, C.scarfD);
    fb.ellipse(173, 101, 39, 27, C.scarf);
    fb.ellipse(173, 101, 27, 18, C.night);
    drawCastSprite(fb, 182, 137, 'doubao', t, { pose: 'panic', role: 'redhood', facing: -1 });
    drawWhaleHero(fb, 116, 144, t, { pose: 'shout', facing: 1, lantern: true, scarfLen: 20 });
    drawGptDragonBoss(fb, 273, 125, t, { shadowMode: true, hoard: false });
    fb.px(252, 77, C.scarf); fb.hline(248, 255, 78, C.scarfL);
    fb.px(267, 77, C.scarf); fb.hline(264, 270, 78, C.scarfL);
    magicParticles(fb, t, 171, 100, 53, 18, C.goldL, C.scarfL);
    return;
  }
  hillBackdrop(fb, t, { night: true });
  river(fb, t, 147, { night: true, width: 14 });
  for (let i = 0; i < 9; i++) pine(fb, i * 42 - 4, 132 + (i % 3) * 7, 0.8 + (i % 2) * 0.22, true);
  // GPT is the terrifying wolf-dragon shadow behind the pine trunks, not a substitute princess.
  drawGptDragonBoss(fb, 269, 121, t, { shadowMode: true, hoard: false });
  const heroX = lerp(119, 177, u);
  drawCastSprite(fb, heroX + 28, 137, 'doubao', t, { pose: 'panic', role: 'redhood', facing: 1 });
  drawWhaleHero(fb, heroX - 20, 144, t, { pose: 'run', facing: 1, lantern: true, scarfLen: 19 });
  for (let i = 0; i < 10; i++) {
    const x = 172 + i * 5;
    fb.px(x, 100 + Math.sin(t * 2 + i) * 9, i % 2 ? C.scarf : C.goldL);
  }
  fireflies(fb, t, 16, 82);
}

function teaGarden(fb, t, u) {
  if (t >= 22.05) {
    // Close prop cut: steam curls above the teapot while Alice and the Mad Hatter exchange a cup.
    hillBackdrop(fb, t, { dream: true });
    roundTree(fb, 32, 126, 0.78, true); roundTree(fb, 289, 130, 0.72, true);
    fb.ellipse(160, 132, 76, 13, C.dbrown); fb.rect(87, 132, 146, 10, C.tan);
    fb.vline(107, 139, 158, C.dbrown); fb.vline(213, 139, 158, C.dbrown);
    fb.ellipse(160, 113, 25, 16, C.plum); fb.rect(142, 101, 35, 17, C.plum);
    fb.disc(160, 101, 7, C.gold); fb.line(180, 111, 196, 108, C.gold, 3);
    fb.ellipse(191, 109, 6, 4, C.parchment); fb.line(140, 112, 128, 107, C.gold, 2);
    for (let i = 0; i < 5; i++) fb.px(153 + i * 5, 85 - mod(Math.floor(t * 5 + i), 11), C.uiW);
    fb.rect(116, 121, 14, 8, C.cyan); fb.box(116, 121, 14, 8, C.dbrown);
    fb.ellipse(199, 124, 12, 4, C.parchment); fb.disc(199, 121, 4, C.pink);
    drawCastSprite(fb, 121, 144, 'qwen', t, { pose: 'cheer', role: 'hatter', facing: 1 });
    drawCastSprite(fb, 205, 143, 'gemini', t, { pose: 'cheer', role: 'alice', facing: -1 });
    drawWhaleHero(fb, 162 + Math.sin(t * 2) * 8, 154, t, { pose: 'happy', facing: 1, scarfLen: 14 });
    magicParticles(fb, t, 160, 91, 50, 14, C.goldL, C.pink);
    return;
  }
  hillBackdrop(fb, t);
  roundTree(fb, 45, 123, 1, true); roundTree(fb, 281, 126, 0.95, false);
  bridge(fb, 263, 140, 77, 10, false);
  teaTable(fb, 158, 121, t);
  drawCastSprite(fb, 112, 129, 'qwen', t, { pose: 'cheer', role: 'hatter', facing: 1 });
  drawCastSprite(fb, 202, 130, 'gemini', t, { pose: 'idle', role: 'alice', facing: -1 });
  // A blue teacup and tiny pocket-watch, arranged like a storybook tea-party prop tableau.
  fb.rect(137, 112, 8, 7, C.cyan); fb.box(137, 112, 8, 7, C.dbrown); fb.line(145, 114, 148, 114, C.dbrown);
  clock(fb, 176, 108, 5, t, C.goldL);
  drawWhaleHero(fb, 158 + Math.sin(u * Math.PI) * 30, 150, t, { pose: 'happy', facing: 1, scarfLen: 14 });
  magicParticles(fb, t, 160, 78, 60, 12, C.pink, C.goldL);
}

function swanRiver(fb, t, u) {
  if (t >= 25.40) {
    // Second cut lands on the transformed swan and its moonlit river reflection.
    hillBackdrop(fb, t, { dream: true });
    river(fb, t, 129, { rainbow: true, width: 24 });
    for (let i = 0; i < 3; i++) drawSwanMorph(fb, 128 + i * 42, 122 + (i % 2) * 6, t + i, 1);
    drawWhaleHero(fb, 84 + Math.sin(t * 1.7) * 8, 137, t, { pose: 'happy', facing: 1, mermaidGlow: true, scarfLen: 14 });
    roundTree(fb, 40, 132, 0.8, true); roundTree(fb, 282, 136, 0.78, true);
    for (let i = 0; i < 13; i++) fb.px(76 + i * 14, 99 + Math.sin(t * 3 + i) * 8, i % 2 ? C.goldL : C.uiW);
    return;
  }
  hillBackdrop(fb, t);
  river(fb, t, 132, { rainbow: u > 0.58, width: 24 });
  roundTree(fb, 47, 132, 0.88, true); roundTree(fb, 286, 136, 0.82, false);
  for (let i = 0; i < 5; i++) drawSwanMorph(fb, 109 + i * 22, 125 + (i % 2) * 5, t + i * 0.3, clamp(u + i * 0.09, 0, 1));
  drawWhaleHero(fb, 176, 132, t, { pose: 'swim', facing: 1, mermaidGlow: true, scarfLen: 12 });
  for (let i = 0; i < 9; i++) fb.px(65 + i * 25, 107 + Math.sin(t * 2 + i) * 7, i % 2 ? C.goldL : C.cyan);
}

function peterClocktower(fb, t, u) {
  if (t >= 28.90) {
    // Cut to the clock face and flight path; Zai remains the Neverland flyer and Whale leads the scene.
    hillBackdrop(fb, t, { dream: true });
    river(fb, t, 151, { rainbow: true, width: 10 });
    fb.rect(225, 25, 72, 112, C.slate); fb.box(225, 25, 72, 112, C.ink);
    fb.tri(217, 26, 305, 26, 261, 1, C.plum);
    clock(fb, 261, 64, 24, t, C.goldL);
    for (let i = 0; i < 5; i++) {
      const x = 39 + i * 34;
      fb.px(x, 57 + Math.sin(t * 3 + i) * 12, i % 2 ? C.goldL : C.uiW);
      fb.line(x, 57, x + 8, 49 + i % 3 * 4, C.cyan);
    }
    drawCastSprite(fb, 203, 126, 'zai', t, { pose: 'cheer', role: 'harp', facing: -1 });
    fb.tri(193, 98, 209, 98, 201, 88, C.lime);
    fb.tri(191, 118, 179, 109 + Math.sin(t * 10) * 3, 190, 128, C.cyan);
    fb.tri(215, 118, 227, 109 - Math.sin(t * 10) * 3, 216, 128, C.cyan);
    drawWhaleHero(fb, lerp(81, 160, u), 135 - Math.sin(t * 4) * 10, t, { pose: 'happy', facing: 1, scarfLen: 17 });
    drawPaperBoat(fb, 145, 145, t, { scale: 0.58, withWhale: true, chibiWhale: true, reflection: false });
    magicParticles(fb, t, 194, 71, 61, 14, C.goldL, C.cyan);
    return;
  }
  hillBackdrop(fb, t, { dream: true });
  river(fb, t, 145, { width: 12, rainbow: u > 0.5 });
  // Tall Neverland clocktower, roof pennants, flying paper stars.
  fb.rect(239, 37, 54, 100, C.slate); fb.box(239, 37, 54, 100, C.ink);
  fb.tri(232, 38, 300, 38, 266, 9, C.plum); fb.line(266, 2, 266, 12, C.gold);
  clock(fb, 266, 61, 14, t, C.goldL);
  fb.rect(255, 83, 23, 54, C.dslate); fb.box(255, 83, 23, 54, C.ink);
  for (let i = 0; i < 3; i++) fb.rect(259 + i * 6, 90, 3, 15, C.cyan);
  drawCastSprite(fb, 220, 130, 'zai', t, { pose: 'cheer', role: 'harp', facing: -1 });
  // Leaf hat and miniature paper wings mark Zai's Peter Pan flight-role without changing his identity.
  fb.tri(211, 99, 226, 99, 219, 91, C.lime); fb.px(216, 91, C.goldL);
  fb.tri(207, 122, 196, 114 + Math.sin(t * 10) * 3, 204, 132, C.cyan);
  fb.tri(230, 122, 241, 114 - Math.sin(t * 10) * 3, 233, 132, C.cyan);
  drawWhaleHero(fb, lerp(88, 156, u), 133 - Math.sin(t * 4) * 7, t, { pose: 'happy', facing: 1, scarfLen: 18 });
  drawPaperBoat(fb, 150, 141, t, { scale: 0.55, withWhale: true, chibiWhale: true, reflection: false });
  magicParticles(fb, t, 180, 75, 62, 12, C.goldL, C.cyan);
}

function beanstalkHarp(fb, t, u) {
  if (t >= 32.25) {
    // Close musical insert: gold harp strings catch the light while Qwen plays above the cloud line.
    hillBackdrop(fb, t, { dream: true });
    fb.gradV(0, 112, W, 68, [C.blue, C.cyan, C.navy]);
    for (let i = 0; i < 6; i++) clouds(fb, t + i * 3, false, 20 + i % 2 * 7);
    fb.ellipse(214, 67, 45, 7, C.brown); fb.rect(170, 67, 88, 7, C.tan);
    fb.line(200, 61, 197, 17, C.gold, 3); fb.line(200, 61, 224, 57, C.gold, 3);
    fb.line(197, 17, 224, 57, C.goldL, 2);
    for (let i = 0; i < 7; i++) fb.line(198 + i * 3, 21 + i * 2, 198 + i * 3, 62 - i, i % 2 ? C.uiW : C.goldL);
    drawCastSprite(fb, 213, 63, 'zai', t, { pose: 'cheer', role: 'harp', facing: -1 });
    drawWhaleHero(fb, lerp(101, 171, u), 139, t, { pose: 'run', facing: 1, scarfLen: 17 });
    fb.line(81, 148, 104, 114, C.green, 7); fb.line(104, 114, 81, 81, C.lime, 7); fb.line(81, 81, 116, 48, C.green, 7);
    magicParticles(fb, t, 213, 45, 43, 17, C.goldL, C.pink);
    return;
  }
  hillBackdrop(fb, t, { dream: true });
  river(fb, t, 148, { width: 12 });
  // Thick beanstalk coils through the clouds and wraps a golden harp platform.
  fb.line(59, 156, 78, 124, C.green, 10); fb.line(78, 124, 57, 94, C.lime, 10);
  fb.line(57, 94, 91, 66, C.green, 10); fb.line(91, 66, 70, 35, C.lime, 10);
  fb.line(70, 35, 107, 8, C.green, 10);
  for (let i = 0; i < 8; i++) fb.px(68 + (i % 3) * 9, 120 - i * 13, i % 2 ? C.pink : C.goldL);
  fb.rect(179, 66, 93, 8, C.tan); fb.box(179, 66, 93, 8, C.dbrown);
  drawCastSprite(fb, 220, 65, 'zai', t, { pose: 'cheer', role: 'harp', facing: -1 });
  // Oversized harp strings glitter on every pluck.
  for (let i = 0; i < 6; i++) {
    fb.vline(232 + i * 3, 52 + i, 78 - i, (Math.floor(t * 9 + i) & 1) ? C.goldL : C.uiW);
  }
  drawWhaleHero(fb, lerp(109, 167, u), 136, t, { pose: 'run', facing: 1, scarfLen: 17 });
  magicParticles(fb, t, 222, 49, 43, 13, C.goldL, C.pink);
}

function candyForest(fb, t, u) {
  if (t >= 35.60) {
    // Cut inside the candy cottage: jars, striped cake rolls and a warm counter fill the foreground.
    fb.gradV(0, 0, W, H, [C.rose, C.plum, C.brown]);
    for (let y = 20; y < 157; y += 22) fb.hline(0, W - 1, y, y % 2 ? C.dbrown : C.scarfD);
    fb.rect(0, 118, W, 40, C.tan); fb.hline(0, W - 1, 118, C.goldL);
    for (let i = 0; i < 7; i++) {
      const x = 16 + i * 47, y = 43 + (i % 3) * 13;
      fb.rect(x, y, 33, 51, C.parchment); fb.box(x, y, 33, 51, C.dbrown);
      fb.rect(x + 4, y + 7, 25, 24, [C.pink, C.cyan, C.gold][i % 3]);
      fb.box(x + 4, y + 7, 25, 24, C.white);
      for (let k = 0; k < 3; k++) fb.px(x + 9 + k * 7, y + 15, C.uiW);
      fb.disc(x + 16, y + 40, 5, i % 2 ? C.goldL : C.scarf);
    }
    for (let x = 8; x < W; x += 18) {
      fb.rect(x, 121, 13, 18, C.scarf); fb.hline(x, x + 12, 121, C.goldL);
      fb.disc(x + 6, 119, 3, C.uiW);
    }
    drawCastSprite(fb, 108, 150, 'doubao', t, { pose: 'cheer', role: 'redhood', facing: 1 });
    drawCastSprite(fb, 211, 150, 'gemini', t, { pose: 'cheer', role: 'alice', facing: -1 });
    drawWhaleHero(fb, lerp(147, 177, u), 157, t, { pose: 'happy', facing: 1, lantern: true, scarfLen: 16 });
    magicParticles(fb, t, 157, 90, 76, 16, C.goldL, C.cyan);
    return;
  }
  hillBackdrop(fb, t);
  river(fb, t, 151, { width: 13 });
  for (const [x, y, s] of [[40, 134, 0.8], [83, 138, 0.65], [280, 137, 0.85]]) roundTree(fb, x, y, s, true);
  candyHouse(fb, 164, 136, 1.1);
  // Candy fence, peppermint sign-shapes and gumdrop bushes (no text-only scenery).
  for (let x = 112; x < 217; x += 13) {
    fb.vline(x, 137, 151, C.tan); fb.px(x, 136, C.goldL);
  }
  fb.hline(110, 219, 142, C.dbrown); fb.hline(110, 219, 148, C.dbrown);
  for (let i = 0; i < 8; i++) fb.disc(127 + i * 9, 82 - Math.sin(t * 3 + i) * 3, 3, [C.pink, C.cyan, C.goldL][i % 3]);
  drawCastSprite(fb, 135, 145, 'doubao', t, { pose: 'walk', role: 'redhood', facing: 1 });
  drawCastSprite(fb, 192, 145, 'gemini', t, { pose: 'cheer', role: 'alice', facing: -1 });
  drawWhaleHero(fb, lerp(76, 238, u), 148, t, { pose: 'run', facing: 1, scarfLen: 17 });
}

function glassSlipper(fb, t, u) {
  if (t >= 39.15) {
    // Cut down to the crystal shoe as the midnight clock turns; Kimi searches while Whale lights the stair.
    hillBackdrop(fb, t, { night: true });
    river(fb, t, 153, { night: true, width: 9 });
    for (let i = 0; i < 5; i++) {
      fb.rect(30 + i * 19, 134 - i * 9, 24, 9, i % 2 ? C.silver : C.white);
      fb.hline(30 + i * 19, 53 + i * 19, 134 - i * 9, C.goldL);
    }
    clock(fb, 251, 51, 22, t, C.goldL);
    drawCastSprite(fb, 189, 138, 'kimi', t, { pose: 'panic', role: 'cinderella', facing: 1 });
    drawWhaleHero(fb, 99, 149, t, { pose: 'happy', facing: 1, lantern: true, scarfLen: 15 });
    const sx = 146 + Math.sin(t * 3) * 3, sy = 127;
    fb.ellipse(sx, sy + 4, 25, 5, C.blue);
    fb.line(sx - 17, sy + 2, sx + 15, sy + 2, C.cyan, 4);
    fb.line(sx - 8, sy, sx + 5, sy - 17, C.uiW, 4);
    fb.line(sx - 8, sy - 1, sx + 5, sy - 18, C.cyan, 2);
    fb.vline(sx - 15, sy - 1, sy + 6, C.cyan);
    fb.px(sx + 15, sy + 1, C.goldL);
    magicParticles(fb, t, sx, sy - 9, 34, 13, C.goldL, C.cyan);
    return;
  }
  hillBackdrop(fb, t, { sunset: true });
  castle(fb, 157, 132, 0.82, false);
  // Ballroom staircase with crystal rails and midnight clock.
  for (let i = 0; i < 6; i++) {
    fb.rect(44 + i * 18, 132 - i * 6, 22, 7, i % 2 ? C.silver : C.white);
    fb.hline(44 + i * 18, 65 + i * 18, 132 - i * 6, C.goldL);
  }
  clock(fb, 267, 58, 17, t, C.goldL);
  drawCastSprite(fb, 184, 131, 'kimi', t, { pose: 'panic', role: 'cinderella', facing: 1 });
  drawWhaleHero(fb, 119 + Math.sin(u * Math.PI) * 13, 143, t, { pose: 'happy', facing: 1, lantern: true, scarfLen: 13 });
  // Slipper is left behind on the stair, catching a precise blue-white gleam.
  const sx = 139 + Math.sin(t * 3) * 2, sy = 126;
  fb.line(sx - 7, sy + 2, sx + 5, sy + 2, C.cyan, 2); fb.line(sx - 4, sy + 1, sx + 1, sy - 6, C.uiW, 2);
  fb.vline(sx - 5, sy, sy + 4, C.cyan); fb.px(sx + 5, sy + 2, C.goldL);
  magicParticles(fb, t, sx, sy - 3, 23, 9, C.goldL, C.cyan);
}

// --- Pre-chorus one: truth revealed beneath the wise river, then a full crimson cloak-vortex. ---
function wiseRiver(fb, t, u) {
  hillBackdrop(fb, t, { night: true });
  river(fb, t, 102, { night: true, rainbow: true, width: 41, phase: 0.8 });
  // Ancient submerged arch and pearl mosaics suggest a river that remembers every tale.
  fb.ellipse(160, 99, 69, 25, C.navy); fb.ellipse(160, 100, 60, 18, C.cyan);
  fb.ellipse(160, 102, 44, 11, C.blue); fb.ellipse(160, 102, 28, 6, C.goldL);
  for (let i = 0; i < 7; i++) fb.px(87 + i * 24, 92 + Math.sin(t * 2 + i) * 9, i % 2 ? C.goldL : C.uiW);
  drawCastSprite(fb, 205, 139, 'kimi', t, { pose: 'idle', role: 'sage', facing: -1 });
  drawWhaleHero(fb, lerp(114, 153, u), 136, t, { pose: 'swim', facing: 1, mermaidGlow: true, lantern: true, scarfLen: 14 });
  for (let i = 0; i < 12; i++) fb.disc(99 + i * 18, 70 + Math.sin(t * 3 + i) * 12, 1.7, C.cyan);
}

function butterflyGarden(fb, t, u) {
  hillBackdrop(fb, t);
  castle(fb, 74, 133, 0.72, false);
  roundTree(fb, 242, 135, 0.9, true); roundTree(fb, 286, 139, 0.7, true);
  river(fb, t, 151, { width: 12 });
  for (let i = 0; i < 9; i++) {
    const x = 106 + i * 17 + Math.sin(t * 3 + i) * 10;
    const y = 68 + Math.cos(t * 4 + i) * 24;
    fb.tri(x, y, x - 5, y - 5, x - 3, y + 1, i % 2 ? C.pink : C.goldL);
    fb.tri(x, y, x + 5, y - 5, x + 3, y + 1, i % 2 ? C.cyan : C.gold);
    fb.vline(x, y - 1, y + 4, C.ink);
  }
  drawCastSprite(fb, lerp(147, 196, u), 138, 'claude', t, { pose: 'walk', role: 'butterfly', facing: 1 });
  drawWhaleHero(fb, lerp(92, 143, u), 146, t, { pose: 'run', facing: 1, scarfLen: 16 });
  flowers(fb, 152, 26, t, C.pink);
}

function cloakVortex(fb, t, u) {
  hillBackdrop(fb, t, { night: true });
  for (let i = 0; i < 8; i++) pine(fb, i * 45 - 7, 141 + (i % 2) * 8, 0.82, true);
  river(fb, t, 152, { night: true, width: 10 });
  // A giant red cloak curls into a protective spiral around Doubao; GPT's wolf-dragon shadow stays outside it.
  const cx = 166, cy = 96, r = 46 + 10 * u;
  fb.ellipse(cx, cy, r + 4, r * 0.66 + 3, C.ink);
  fb.ellipse(cx, cy, r, r * 0.66, C.scarfD);
  fb.ellipse(cx, cy, r - 7, r * 0.66 - 5, C.scarf);
  fb.ellipse(cx, cy, r - 16, r * 0.66 - 11, C.night);
  for (let i = 0; i < 7; i++) {
    const a = t * 2.2 + i * Math.PI * 2 / 7;
    fb.line(cx + Math.cos(a) * 17, cy + Math.sin(a) * 12, cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.66, i % 2 ? C.scarfL : C.goldL, 2);
  }
  drawCastSprite(fb, 151, 130, 'doubao', t, { pose: 'cheer', role: 'redhood', facing: 1, big: true });
  drawWhaleHero(fb, 97 + Math.sin(t * 2) * 6, 143, t, { pose: 'shout', facing: 1, lantern: true, scarfLen: 18 });
  drawGptDragonBoss(fb, 276, 127, t, { shadowMode: true, hoard: false });
  magicParticles(fb, t, cx, cy, r + 9, 22, C.goldL, C.scarfL);
}

// --- Chorus one: map route + seven fast escalating river/showcase compositions. ---
function rainbowMap(fb, t, u) {
  // Hand-painted green parchment, with broken contour strokes rather than a screen-filling grid.
  fb.gradV(0, 0, W, H, [C.parchment, C.sand, C.lime, C.green]);
  for (let i = 0; i < 10; i++) {
    const x = 16 + (i * 71) % 292, y = 25 + (i * 43) % 133;
    fb.ellipse(x, y, 25 + i % 3 * 4, 8 + i % 2 * 3, i % 2 ? C.lime : C.green);
    if (i % 2 === 0) fb.hline(x - 13, x + 12, y + 7, C.tan);
  }
  // Soft broken contour dashes and flower marks give the parchment terrain detail without crowding the route.
  for (let i = 0; i < 38; i++) {
    const x = 8 + (i * 47) % 302, y = 17 + (i * 31) % 150;
    if (i % 3 === 0) fb.hline(x, Math.min(W - 2, x + 5 + i % 7), y, C.tan);
    else fb.px(x, y, i % 2 ? C.goldL : C.pink);
  }
  mapRiver(fb, t);
  // Map landmarks are miniature places, not floating UI tiles: castle, candy cottage, mill and little villages.
  castle(fb, 62, 82, 0.34, false);
  candyHouse(fb, 253, 94, 0.42);
  watermill(fb, 57, 153, t, 0.36);
  const houses = [[111, 49, C.blue], [203, 51, C.plum], [102, 113, C.scarf], [216, 121, C.rose], [155, 82, C.blue], [188, 154, C.plum]];
  for (const [x, y, roof] of houses) {
    fb.ellipse(x + 1, y + 8, 12, 3, C.dgreen);
    fb.rect(x - 7, y - 7, 14, 12, C.parchment);
    fb.box(x - 7, y - 7, 14, 12, C.dbrown);
    fb.tri(x - 9, y - 7, x + 9, y - 7, x, y - 17, roof);
    fb.rect(x - 2, y, 4, 5, C.brown);
    fb.px(x - 4, y - 3, C.cyan); fb.px(x + 4, y - 3, C.goldL);
    roundTree(fb, x - 13, y + 7, 0.28, roof === C.rose);
  }
  // Curved golden pebble trail follows the actual river bends; it is scenery, not a progress meter.
  for (let i = 0; i < 15; i++) {
    const yy = 39 + i * 8;
    const xx = 159 + Math.sin(yy * 0.039 + t * 0.12) * 49 + Math.sin(yy * 0.092) * 19;
    fb.px(xx + 20, yy, i % 4 === 0 ? C.goldL : C.uiW);
  }
  if (t < 58.15) {
    const routeY = lerp(42, 153, u);
    const cx = 159 + Math.sin(routeY * 0.039 + t * 0.12) * 49 + Math.sin(routeY * 0.092) * 19;
    drawMapWhaleHero(fb, cx, routeY, t, { pose: 'run', facing: u < 0.5 ? 1 : -1, scarfLen: 14 });
    magicParticles(fb, t, cx, routeY - 9, 18, 9, C.goldL, C.scarfL);
  } else {
    // Second map cut tilts into the harbor bend: the same Whale sprite rides a paper boat through town.
    const routeY = 105 + Math.sin(t * 1.6) * 4;
    const cx = 93 + u * 129 + Math.sin(t * 0.8) * 7;
    drawPaperBoat(fb, cx, routeY, t, { scale: 0.86, withWhale: true, chibiWhale: true, facing: 1, reflection: false });
    magicParticles(fb, t, cx, routeY - 12, 24, 11, C.goldL, C.cyan);
  }
}

function rainbowBridge(fb, t, u) {
  hillBackdrop(fb, t, { dream: true });
  river(fb, t, 133, { rainbow: true, width: 28, phase: 1.1 });
  bridge(fb, 161, 124, 137, 29, true);
  for (let i = 0; i < 5; i++) {
    const x = 89 + i * 35;
    lamp(fb, x, 105, t + i, 0.72);
  }
  drawWhaleHero(fb, lerp(83, 236, u), 120 - Math.sin(u * Math.PI) * 19, t, { pose: 'run', facing: 1, scarfLen: 20 });
  drawCastSprite(fb, 213, 123, 'gemini', t, { pose: 'cheer', role: 'alice', facing: -1 });
  drawFlyingGptDragon(fb, 260 - u * 55, 52, t, -1);
  magicParticles(fb, t, 160, 85, 62, 16, C.goldL, C.pink);
}

function heartIsland(fb, t, u) {
  hillBackdrop(fb, t, { sunset: true });
  river(fb, t, 123, { rainbow: true, width: 33, phase: 0.7 });
  // Heart-shaped island outlined with flowering trees, surrounded by current.
  const cx = 164, cy = 92, scale = 1.25;
  fb.ellipse(cx - 18, cy - 3, 26 * scale, 23 * scale, C.lime);
  fb.ellipse(cx + 18, cy - 3, 26 * scale, 23 * scale, C.green);
  fb.tri(cx - 41, cy + 4, cx + 41, cy + 4, cx, cy + 58, C.green);
  for (let i = 0; i < 10; i++) {
    const a = i * Math.PI * 2 / 10;
    roundTree(fb, cx + Math.cos(a) * 46, cy + 2 + Math.sin(a) * 29, 0.36, i % 2 === 0);
  }
  castle(fb, cx, cy + 21, 0.36, false, true);
  drawCastSprite(fb, 150, 126, 'claude', t, { pose: 'cheer', role: 'princess', facing: 1 });
  drawWhaleHero(fb, lerp(111, 202, u), 132, t, { pose: 'happy', facing: 1, scarfLen: 17 });
  for (let i = 0; i < 10; i++) fb.disc(mod(i * 37 + t * 28, W), 141 + (i % 3) * 6, 2, C.goldL);
}

function millSpray(fb, t, u) {
  hillBackdrop(fb, t);
  river(fb, t, 128, { rainbow: true, width: 27, phase: 2.2 });
  watermill(fb, 208, 128, t, 1.05);
  roundTree(fb, 51, 134, 0.9); roundTree(fb, 91, 137, 0.72, true);
  bridge(fb, 89, 135, 72, 11, false);
  for (let i = 0; i < 22; i++) {
    const a = i * 2.399 + t * 0.7;
    const r = mod(i * 9 + t * 34, 45);
    fb.px(226 + Math.cos(a) * r, 99 + Math.sin(a) * r, i % 3 ? C.cyan : C.uiW);
  }
  drawWhaleHero(fb, lerp(96, 154, u), 138, t, { pose: 'run', facing: 1, scarfLen: 15 });
  drawCastSprite(fb, 265, 144, 'kimi', t, { pose: 'cheer', role: 'sage', facing: -1 });
}

function waterfallOfTime(fb, t, u) {
  hillBackdrop(fb, t, { dream: true });
  river(fb, t, 145, { rainbow: true, width: 20 });
  // Clockwork cliff, hourglass gears, falling page leaves and music-note droplets.
  fb.tri(177, 111, 275, 30, 329, 139, C.dslate);
  fb.tri(190, 106, 272, 39, 310, 133, C.slate);
  timeFalls(fb, t, 250, 52, 132);
  for (let i = 0; i < 4; i++) {
    const yy = 64 + mod(t * 18 + i * 23, 72);
    const xx = 212 + i * 12;
    fb.tri(xx, yy, xx + 9, yy - 3, xx + 5, yy + 8, C.parchment);
    fb.px(xx + 15, yy + 3, C.goldL);
    fb.vline(xx + 16, yy - 2, yy + 7, C.ink);
  }
  drawWhaleHero(fb, lerp(79, 166, u), 140, t, { pose: 'shout', facing: 1, lantern: true, scarfLen: 19 });
  drawPaperBoat(fb, 123 + u * 25, 144, t, { scale: 0.5, withWhale: true, chibiWhale: true });
}

function sunsetFleet(fb, t, u) {
  hillBackdrop(fb, t, { sunset: true });
  river(fb, t, 114, { rainbow: true, width: 38, phase: 1.5 });
  bridge(fb, 224, 119, 80, 15, true);
  for (let i = 0; i < 9; i++) {
    drawPaperBoat(fb, mod(17 + i * 42 + t * (6 + i % 3), 370) - 25, 122 + (i % 4) * 13, t + i, {
      scale: i === 4 ? 0.92 : 0.5,
      withWhale: i === 4,
      chibiWhale: true,
      facing: 1,
      glowOrb: true,
    });
  }
  drawWhaleHero(fb, lerp(96, 218, u), 109, t, { pose: 'happy', facing: 1, lantern: true, scarfLen: 22 });
  for (let i = 0; i < 6; i++) lamp(fb, 24 + i * 54, 113, t + i, 0.56);
}

function castleHarborCast(fb, t, u) {
  hillBackdrop(fb, t, { sunset: true });
  river(fb, t, 132, { rainbow: true, width: 24, phase: 0.8 });
  castle(fb, 159, 126, 1.02, false);
  bridge(fb, 89, 133, 65, 12, true);
  // Full eight-girl ensemble at the castle harbor; Claude is the sole Princess, Doubao stays Red Hood.
  drawCastSprite(fb, 50, 147, 'doubao', t, { pose: 'cheer', role: 'redhood', facing: 1 });
  drawCastSprite(fb, 88, 146, 'gemini', t, { pose: 'cheer', role: 'alice', facing: 1 });
  drawCastSprite(fb, 126, 147, 'claude', t, { pose: 'cheer', role: 'princess', facing: 1 });
  drawCastSprite(fb, 195, 146, 'qwen', t, { pose: 'cheer', role: 'hatter', facing: -1 });
  drawCastSprite(fb, 231, 147, 'kimi', t, { pose: 'cheer', role: 'sage', facing: -1 });
  drawCastSprite(fb, 272, 146, 'zai', t, { pose: 'cheer', role: 'harp', facing: -1 });
  drawWhaleHero(fb, lerp(158, 178, u), 141, t, { pose: 'happy', facing: 1, scarfLen: 19 });
  drawFlyingGptDragon(fb, 166, 36 + Math.sin(t * 3) * 5, t, -1);
  for (let i = 0; i < 18; i++) {
    const x = mod(i * 31 + t * 20, W), y = 55 + mod(i * 17, 46);
    fb.px(x, y, i % 3 ? C.goldL : C.pink);
  }
}

// --- Night interlude: lantern street, gear-lock canal and moonlit stone bridge. ---
function lanternStreet(fb, t, u) {
  hillBackdrop(fb, t, { night: true });
  river(fb, t, 140, { night: true, width: 18 });
  // Dense bookshop façades and lit upper windows on both banks.
  for (let i = 0; i < 6; i++) {
    const x = i * 62 - 10, h = 42 + (i % 3) * 10;
    fb.rect(x, 107 - h, 47, h, i % 2 ? C.dslate : C.plum);
    fb.box(x, 107 - h, 47, h, C.ink);
    fb.tri(x - 4, 107 - h, x + 51, 107 - h, x + 24, 86 - h, i % 2 ? C.scarfD : C.blue);
    for (let j = 0; j < 3; j++) fb.rect(x + 7 + j * 13, 80 - h + (j % 2) * 3, 7, 11, (i + j) % 2 ? C.goldL : C.cyan);
    for (let j = 0; j < 3; j++) fb.hline(x + 7 + j * 13, x + 15 + j * 13, 91 - h + j * 2, C.gold);
  }
  for (let i = 0; i < 5; i++) lamp(fb, 24 + i * 67, 128, t + i, 0.8);
  drawPaperBoat(fb, lerp(98, 228, u), 143, t, { scale: 0.72, withWhale: true, chibiWhale: true });
  fireflies(fb, t, 15, 65);
}

function gearLock(fb, t, u) {
  hillBackdrop(fb, t, { night: true });
  river(fb, t, 142, { night: true, width: 22 });
  // Mechanized canal lock: bronze gates, interlocking wheels, chain and water-level sluice.
  for (const x of [59, 260]) {
    fb.rect(x - 6, 42, 13, 103, C.brown); fb.box(x - 6, 42, 13, 103, C.ink);
    for (let y = 49; y < 141; y += 11) fb.hline(x - 4, x + 3, y, C.gold);
  }
  fb.rect(65, 85, 190, 8, C.dbrown); fb.box(65, 85, 190, 8, C.goldD);
  for (const [x, r] of [[78, 15], [238, 19], [153, 11]]) {
    fb.disc(x, 77, r + 2, C.ink); fb.disc(x, 77, r, C.gold);
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4 + t * (i % 2 ? 1.3 : -1.3);
      fb.line(x, 77, x + Math.cos(a) * r, 77 + Math.sin(a) * r, C.dbrown, 2);
    }
    fb.disc(x, 77, 3, C.silver);
  }
  drawCastSprite(fb, 117, 136, 'zai', t, { pose: 'walk', role: 'default', facing: 1 });
  drawWhaleHero(fb, lerp(166, 217, u), 147, t, { pose: 'ride', facing: 1, lantern: true, scarfLen: 17 });
  drawPaperBoat(fb, 201, 144, t, { scale: 0.66, withWhale: false });
  magicParticles(fb, t, 238, 77, 27, 10, C.goldL, C.cyan);
}

function moonBridge(fb, t, u) {
  hillBackdrop(fb, t, { night: true });
  river(fb, t, 125, { night: true, rainbow: true, width: 31 });
  fb.disc(266, 36, 18, C.goldL); fb.disc(272, 30, 15, C.navy);
  bridge(fb, 161, 119, 124, 25, true);
  for (let i = 0; i < 4; i++) roundTree(fb, 30 + i * 87, 131 + i % 2 * 4, 0.58, i % 2 === 0);
  drawWhaleHero(fb, lerp(102, 213, u), 123 - Math.sin(t * 2) * 2, t, { pose: 'walk', facing: 1, lantern: true, scarfLen: 19 });
  drawCastSprite(fb, 225, 137, 'kimi', t, { pose: 'idle', role: 'sage', facing: -1 });
  magicParticles(fb, t, 161, 88, 64, 12, C.goldL, C.cyan);
}

// --- Verse two: nocturnal legends with clear roles, objects and foreground movement. ---
function sleepingRoseTower(fb, t, u) {
  if (t >= 99.10) {
    // Inside the rose tower: one rose window, a winding stair, and Claude waking from the spell.
    fb.gradV(0, 0, W, H, [C.plum, C.night, C.dslate]);
    stars(fb, t, 30, C.goldL, 85);
    fb.rect(18, 28, 284, 126, C.dslate); fb.box(18, 28, 284, 126, C.dbrown);
    fb.rect(29, 39, 262, 104, C.navy);
    fb.ellipse(244, 74, 34, 43, C.rose); fb.ellipse(244, 74, 23, 33, C.pink); fb.ellipse(244, 74, 13, 21, C.plum);
    for (let i = 0; i < 6; i++) {
      const x = 41 + i * 18;
      fb.line(x, 148, x + 18, 122 - i * 5, C.tan, 4);
    }
    // Soft rose-bed, thorns loosened by dawn; the scene suggests escape, not burial.
    fb.ellipse(204, 138, 48, 9, C.rose); fb.rect(158, 136, 92, 8, C.parchment);
    for (let i = 0; i < 6; i++) fb.px(169 + i * 14, 130 + (i % 2) * 2, C.goldL);
    drawCastSprite(fb, 225, 126, 'claude', t, { pose: 'cheer', role: 'princess', facing: -1 });
    drawWhaleHero(fb, lerp(84, 143, u), 150, t, { pose: 'run', facing: 1, lantern: true, scarfLen: 18 });
    clock(fb, 77, 63, 16, t, C.goldL);
    magicParticles(fb, t, 239, 82, 53, 16, C.goldL, C.pink);
    return;
  }
  hillBackdrop(fb, t, { night: true });
  river(fb, t, 145, { night: true, width: 11 });
  // Rose tower surrounded by thorn lattice and an illuminated stair; fairy-tale sleep is a reversible spell.
  fb.rect(220, 42, 50, 94, C.plum); fb.box(220, 42, 50, 94, C.goldD);
  fb.tri(214, 43, 276, 43, 245, 13, C.rose);
  fb.rect(235, 77, 21, 59, C.navy); fb.box(235, 77, 21, 59, C.dbrown);
  fb.ellipse(245, 86, 17, 23, C.pink); fb.ellipse(245, 86, 11, 17, C.rose);
  for (let i = 0; i < 6; i++) {
    const x = 204 + i * 14;
    fb.line(x, 137, x + Math.sin(i + t) * 6, 65, C.dgreen, 2);
    fb.px(x + Math.sin(i + t) * 6, 70 + i * 4, C.scarf);
  }
  drawCastSprite(fb, 249, 122, 'claude', t, { pose: 'idle', role: 'princess', facing: -1 });
  drawWhaleHero(fb, lerp(91, 170, u), 146, t, { pose: 'run', facing: 1, lantern: true, scarfLen: 17 });
  clock(fb, 64, 60, 14, t, C.goldL);
  magicParticles(fb, t, 244, 82, 34, 12, C.goldL, C.pink);
}

function mermaidPalace(fb, t, u) {
  hillBackdrop(fb, t, { night: true });
  river(fb, t, 103, { night: true, rainbow: true, width: 47, phase: 2.1 });
  palace(fb, 249, 123, t, true);
  for (let i = 0; i < 7; i++) {
    const x = 35 + i * 42, y = 76 + (i % 3) * 16;
    fb.ellipse(x, y, 13, 5, C.cyan); fb.line(x - 11, y, x + 11, y, C.white);
    fb.disc(x, y, 2.8, C.goldL);
  }
  drawCastSprite(fb, 230, 130, 'kimi', t, { pose: 'cheer', role: 'sage', facing: -1 });
  drawWhaleHero(fb, lerp(90, 179, u), 119 + Math.sin(t * 2.5) * 4, t, { pose: 'swim', facing: 1, mermaidGlow: true, lantern: true, scarfLen: 18 });
  magicParticles(fb, t, 200, 76, 65, 16, C.cyan, C.goldL);
}

function goldenSunbirdShot(fb, t, u) {
  hillBackdrop(fb, t, { night: true });
  sun(fb, 163, 70, 29, C.goldL);
  drawGoldenSunbird(fb, 163 + Math.sin(t) * 5, 70, t);
  // GPT dragon-girl circles as the sunbird myth enters the sky, unmistakably retaining her pale draconic silhouette.
  drawFlyingGptDragon(fb, 258 - 55 * u, 43 + Math.sin(t * 3) * 8, t, -1);
  river(fb, t, 144, { night: true, width: 14 });
  drawWhaleHero(fb, lerp(75, 145, u), 140, t, { pose: 'shout', facing: 1, scarfLen: 17 });
  roundTree(fb, 52, 138, 0.73); roundTree(fb, 282, 140, 0.68);
  magicParticles(fb, t, 163, 71, 43, 15, C.goldL, C.uiW);
}

function tigerPlain(fb, t, u) {
  if (t >= 109.65) {
    // Low grassland insert: three distinct saber-toothed tigers cross the foreground in alternating strides.
    hillBackdrop(fb, t, { dream: true });
    river(fb, t, 158, { width: 8 });
    for (let i = 0; i < 17; i++) {
      const x = i * 20 - 3;
      fb.line(x, 150, x - 4, 112 - (i % 5) * 7, i % 3 ? C.green : C.lime, 2);
    }
    drawSaberTiger(fb, 75 + Math.sin(t * 2) * 10, 132, t, 0);
    drawSaberTiger(fb, 171 + Math.sin(t * 2.4 + 1) * 9, 120, t + 0.6, 1);
    drawSaberTiger(fb, 261 - Math.sin(t * 2.2) * 11, 137, t + 1.2, 2);
    drawWhaleHero(fb, lerp(100, 197, u), 146, t, { pose: 'run', facing: 1, scarfLen: 18 });
    drawCastSprite(fb, 245, 148, 'kimi', t, { pose: 'cheer', role: 'sage', facing: -1 });
    for (let i = 0; i < 11; i++) fb.px(24 + i * 27, 93 + Math.sin(t * 2 + i) * 8, i % 2 ? C.goldL : C.pink);
    return;
  }
  hillBackdrop(fb, t, { dream: true });
  river(fb, t, 152, { width: 12 });
  for (let i = 0; i < 10; i++) {
    const x = mod(i * 43 + t * 17, 360) - 20;
    fb.line(x, 144, x - 5, 105 - (i % 4) * 11, C.green, 2);
    fb.px(x - 4, 105 - (i % 4) * 11, C.goldL);
  }
  for (let i = 0; i < 3; i++) drawSaberTiger(fb, mod(31 + i * 103 + t * (19 + i * 4), 380) - 25, 125 + i * 7, t + i, i);
  drawWhaleHero(fb, lerp(95, 198, u), 143, t, { pose: 'run', facing: 1, scarfLen: 17 });
  drawCastSprite(fb, 255, 145, 'kimi', t, { pose: 'cheer', role: 'sage', facing: -1 });
  flowers(fb, 151, 24, t, C.goldL);
}

function puppetTheater(fb, t, u) {
  hillBackdrop(fb, t, { night: true });
  river(fb, t, 148, { night: true, width: 12 });
  // Floating marionette theater: gilded proscenium, curtains, stringed wooden puppet.
  fb.rect(195, 44, 100, 90, C.brown); fb.box(195, 44, 100, 90, C.gold);
  fb.rect(203, 52, 84, 75, C.navy); fb.box(203, 52, 84, 75, C.scarf);
  fb.tri(204, 54, 245, 54, 204, 122, C.scarfD);
  fb.tri(286, 54, 245, 54, 286, 122, C.scarfD);
  fb.rect(215, 91, 60, 27, C.plum); fb.hline(217, 273, 89, C.goldL);
  // Pinocchio puppet body/long nose + visible strings
  for (let i = 0; i < 4; i++) fb.line(227 + i * 13, 14, 230 + i * 9, 71, C.silver);
  fb.disc(247, 68, 8, C.tan); fb.line(251, 69, 261, 68, C.orange, 2);
  fb.rect(241, 75, 13, 20, C.parchment); fb.line(244, 94, 237, 110, C.dbrown, 2); fb.line(251, 94, 260, 109, C.dbrown, 2);
  fb.tri(239, 61, 255, 61, 247, 51, C.scarf);
  drawCastSprite(fb, 183, 138, 'gemini', t, { pose: 'cheer', role: 'alice', facing: 1 });
  drawWhaleHero(fb, lerp(97, 151, u), 143, t, { pose: 'happy', facing: 1, lantern: true, scarfLen: 17 });
  for (let i = 0; i < 12; i++) fb.px(201 + i * 8, 39 + Math.sin(t * 4 + i) * 4, C.goldL);
}

function gemHoard(fb, t, u) {
  hillBackdrop(fb, t, { night: true });
  // Cave gallery with crystal seams and a giant open gem chest.
  fb.tri(-12, 124, 52, 37, 128, 130, C.dslate);
  fb.tri(187, 133, 272, 32, 339, 134, C.navy);
  for (let i = 0; i < 18; i++) {
    const x = 18 + i * 17, y = 40 + (i * 29 % 75);
    fb.tri(x, y, x - 5, y + 10, x + 5, y + 10, i % 3 ? C.cyan : C.pink);
    fb.px(x, y + 4, C.uiW);
  }
  fb.rect(78, 114, 128, 27, C.brown); fb.box(78, 114, 128, 27, C.gold);
  fb.tri(72, 115, 145, 115, 102, 88, C.gold); fb.tri(145, 115, 213, 115, 178, 88, C.goldL);
  fb.rect(85, 121, 114, 17, C.plum); fb.box(85, 121, 114, 17, C.scarfD);
  for (let i = 0; i < 7; i++) fb.disc(92 + i * 16, 117 - Math.sin(t * 4 + i) * 3, 4, [C.cyan, C.pink, C.goldL, C.lime][i % 4]);
  drawCastSprite(fb, 82, 138, 'zai', t, { pose: 'cheer', role: 'default', facing: 1 });
  drawGptDragonBoss(fb, 249, 126, t, { shadowMode: false, hoard: true });
  drawWhaleHero(fb, lerp(101, 141, u), 148, t, { pose: 'walk', facing: 1, lantern: true, scarfLen: 17 });
  magicParticles(fb, t, 149, 100, 75, 16, C.cyan, C.goldL);
}

function lifeTree(fb, t, u) {
  hillBackdrop(fb, t, { dream: true });
  river(fb, t, 151, { rainbow: true, width: 13 });
  // Cliffside tree of life: luminous roots reach the river; a winding stone stair enters from foreground.
  fb.tri(183, 155, 265, 44, 337, 154, C.dslate);
  fb.tri(194, 148, 264, 62, 327, 151, C.slate);
  fb.rect(250, 80, 13, 74, C.brown);
  for (let i = 0; i < 8; i++) {
    const ang = i * Math.PI / 4;
    fb.line(256, 100, 256 + Math.cos(ang) * (22 + (i % 3) * 8), 84 + Math.sin(ang) * (24 + (i % 2) * 9), C.gold, 4);
  }
  fb.disc(256, 77, 20, C.lime); fb.disc(240, 83, 15, C.green); fb.disc(272, 83, 16, C.cyan);
  for (let i = 0; i < 10; i++) fb.px(236 + (i * 13 % 39), 70 + i * 3, C.goldL);
  for (let i = 0; i < 6; i++) {
    fb.line(202 + i * 9, 148 - i * 10, 220 + i * 8, 143 - i * 10, C.tan, 3);
  }
  drawCastSprite(fb, 226, 138, 'kimi', t, { pose: 'idle', role: 'sage', facing: 1 });
  drawWhaleHero(fb, lerp(105, 197, u), 143, t, { pose: 'run', facing: 1, lantern: true, scarfLen: 19 });
  fireflies(fb, t, 18, 65);
}

function redShoesDance(fb, t, u) {
  hillBackdrop(fb, t, { night: true });
  river(fb, t, 149, { night: true, rainbow: true, width: 11 });
  // Village dance floor, music-box cogs and ruby shoes spinning in their own little spotlight.
  fb.rect(76, 101, 173, 42, C.plum); fb.box(76, 101, 173, 42, C.gold);
  for (let i = 0; i < 6; i++) fb.line(84 + i * 29, 104, 72 + i * 32, 139, C.rose, 1);
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6 + t * 3;
    fb.px(165 + Math.cos(a) * 48, 102 + Math.sin(a) * 26, i % 2 ? C.goldL : C.pink);
  }
  drawCastSprite(fb, 175 + Math.sin(t * 5) * 8, 138 - Math.abs(Math.sin(t * 5)) * 8, 'doubao', t, { pose: 'cheer', role: 'default', facing: 1 });
  drawWhaleHero(fb, lerp(99, 133, u), 145, t, { pose: 'happy', facing: 1, scarfLen: 15 });
  for (let side of [-1, 1]) {
    const x = 160 + side * 34 + Math.sin(t * 8 + side) * 5, y = 145 + Math.cos(t * 8 + side) * 2;
    fb.ellipse(x, y + 4, 15, 3, C.ink);
    fb.rect(x - 8, y - 1, 17, 6, C.scarfD);
    fb.tri(x + 2, y - 1, x + 13, y + 2, x + 5, y + 6, C.scarf);
    fb.rect(x - 8, y + 2, 18, 3, C.goldL);
    fb.vline(x - 6, y - 4, y + 4, C.gold);
    fb.px(x + 5, y - 3, C.uiW);
  }
  clock(fb, 272, 47, 11, t, C.goldL);
}

// --- Pre-chorus two: underwater truth and Whale-girl's sunset-makeup/foam release. ---
function deepSeaTruth(fb, t, u) {
  hillBackdrop(fb, t, { night: true });
  fb.gradV(0, 72, W, 108, [C.blue, C.navy, C.ink]);
  for (let i = 0; i < 13; i++) {
    const x = (i * 31 + 22) % W;
    fb.line(x, 22, x + Math.sin(t + i) * 17, 141, C.cyan, i % 3 === 0 ? 2 : 1);
  }
  // A quiet pearl-current arch; Kimi guides the whale through the deep without replacing her as protagonist.
  fb.ellipse(162, 109, 101, 40, C.navy); fb.ellipse(162, 112, 86, 31, C.blue); fb.ellipse(162, 114, 65, 21, C.cyan);
  for (let i = 0; i < 12; i++) {
    const x = 64 + i * 17, y = 92 + Math.sin(t * 2 + i) * 12;
    fb.disc(x, y, 3 + (i % 2), C.goldL); fb.px(x, y - 1, C.uiW);
  }
  drawCastSprite(fb, 229, 135, 'kimi', t, { pose: 'cheer', role: 'sage', facing: -1 });
  drawWhaleHero(fb, lerp(108, 166, u), 135, t, { pose: 'swim', facing: 1, mermaidGlow: true, lantern: true, scarfLen: 17 });
  for (let i = 0; i < 15; i++) {
    const x = 10 + i * 22 + Math.sin(t * 4 + i) * 5;
    const y = 50 + mod(i * 17 + t * 20, 93);
    fb.disc(x, y, i % 5 === 0 ? 3 : 2, C.cyan);
    fb.px(x, y - 2, C.uiW);
  }
}

function alarmClockEscape(fb, t, u) {
  hillBackdrop(fb, t, { night: true });
  river(fb, t, 149, { night: true, width: 10 });
  castle(fb, 250, 137, 0.73, true, true);
  // Time-management maze: clocks swing while Claude runs out of thorny routines toward the river.
  for (let i = 0; i < 7; i++) {
    const x = 38 + i * 40, y = 59 + (i % 3) * 17;
    clock(fb, x, y + Math.sin(t * 4 + i) * 3, 8 + (i % 3), t + i, i % 2 ? C.goldL : C.silver);
    if (i % 2 === 0) fb.line(x + 9, y - 13, x + 14, y + 14, C.scarf);
  }
  for (let i = 0; i < 5; i++) {
    const x = 43 + i * 45;
    fb.rect(x, 113, 30, 10, C.parchment); fb.box(x, 113, 30, 10, C.dbrown);
    fb.px(x + 5, 117, C.scarf); fb.hline(x + 11, x + 24, 117, C.slate);
  }
  drawCastSprite(fb, lerp(222, 148, u), 141, 'claude', t, { pose: 'panic', role: 'princess', facing: -1 });
  drawWhaleHero(fb, lerp(162, 100, u), 147, t, { pose: 'run', facing: -1, lantern: true, scarfLen: 18 });
  magicParticles(fb, t, 154, 78, 95, 16, C.goldL, C.pink);
}

function whaleEyeshadow(fb, t, u) {
  // Whale-girl close-up on the 640×360 character layer, backed by giant watery sunrise pearls.
  fb.gradV(0, 0, W, H, [C.night, C.navy, C.blue, C.cyan]);
  for (let i = 0; i < 5; i++) {
    const x = 44 + i * 59, y = 52 + Math.sin(t * 2 + i) * 10;
    fb.ellipse(x, y, 27, 8, C.cyan); fb.ellipse(x, y - 2, 15, 4, C.goldL);
    fb.px(x, y - 4, C.uiW);
  }
  fb.glowDisc(160, 91, 21, 78);
  drawWhaleHero(fb, 160, 151, t, { pose: 'happy', facing: 1, scale: 2, mermaidGlow: true, scarfLen: 20 });
  // Delicate sunlight/eyeshadow color appears as two luminous ocean-gold arcs around her eyes.
  fb.line(136, 69, 149, 63, C.goldL, 2); fb.line(172, 63, 185, 69, C.cyan, 2);
  fb.px(136, 69, C.uiW); fb.px(185, 69, C.uiW);
  for (let i = 0; i < 13; i++) {
    const x = 23 + i * 23;
    fb.px(x, 111 + Math.sin(t * 3 + i) * 6, i % 2 ? C.cyan : C.goldL);
  }
}

function pearlFoam(fb, t, u) {
  hillBackdrop(fb, t, { night: true });
  river(fb, t, 132, { night: true, rainbow: true, width: 35, phase: 2.3 });
  for (let i = 0; i < 42; i++) {
    const x = mod(i * 31 + t * (12 + i % 4), W);
    const y = 147 - mod(i * 19 + t * (21 + i % 5), 102);
    const r = 2 + (i % 4);
    fb.disc(x, y, r, i % 5 === 0 ? C.goldL : C.cyan);
    fb.px(x - 1, y - 1, C.uiW);
  }
  drawWhaleHero(fb, lerp(159, 183, u), 139 - Math.sin(u * Math.PI) * 28, t, { pose: 'swim', facing: 1, mermaidGlow: true, scarfLen: 16 });
  palace(fb, 268, 134, t, true);
  magicParticles(fb, t, 177, 101, 72, 20, C.cyan, C.uiW);
}

// --- Chorus two: daylight return, but with distinct camera angles and fresh prop arrangements. ---
function daylightMapReturn(fb, t, u) {
  hillBackdrop(fb, t);
  river(fb, t, 115, { rainbow: true, width: 41, phase: 2.6 });
  castle(fb, 255, 119, 0.76, false);
  bridge(fb, 115, 116, 92, 18, false);
  if (t < 141.50) {
    // Low aerial establishes the river route and keeps the moving boat as its hero marker.
    for (let i = 0; i < 6; i++) {
      const x = 26 + i * 55, y = 70 + (i % 3) * 12;
      fb.ellipse(x, y + 11, 15, 4, C.dgreen);
      fb.rect(x - 8, y - 2, 16, 13, C.parchment); fb.box(x - 8, y - 2, 16, 13, C.dbrown);
      fb.tri(x - 10, y - 2, x + 10, y - 2, x, y - 13, [C.scarf, C.plum, C.blue][i % 3]);
      fb.px(x - 3, y + 2, C.cyan); fb.px(x + 4, y + 2, C.goldL);
    }
    drawPaperBoat(fb, lerp(67, 241, u), 118 + Math.sin(t * 2) * 4, t, { scale: 0.94, withWhale: true, chibiWhale: true, facing: 1 });
  } else {
    // Cut down to river level for fresh foreground spray and a wide Whale-girl sail.
    bridge(fb, 226, 106, 79, 18, true);
    for (let i = 0; i < 22; i++) {
      const x = 56 + i * 11, y = 113 + Math.sin(t * 3 + i) * 7;
      fb.px(x, y, i % 3 ? C.cyan : C.uiW);
    }
    drawPaperBoat(fb, lerp(77, 249, u), 129, t, { scale: 1.2, withWhale: true, chibiWhale: true, facing: 1 });
  }
  flowers(fb, 150, 28, t, C.pink);
}

function bridgeDuet(fb, t, u) {
  hillBackdrop(fb, t, { dream: true });
  river(fb, t, 125, { rainbow: true, width: 34, phase: 0.5 });
  bridge(fb, 161, 120, 150, 34, true);
  for (let i = 0; i < 6; i++) {
    const x = 70 + i * 37;
    fb.vline(x, 120 - (i % 3) * 2, 132, C.dbrown);
    fb.disc(x, 113 - (i % 3) * 2, 3, C.goldL);
  }
  drawCastSprite(fb, 200, 125, 'gemini', t, { pose: 'cheer', role: 'alice', facing: -1 });
  drawWhaleHero(fb, lerp(83, 235, u), 116 - Math.sin(u * Math.PI) * 19, t, { pose: 'run', facing: 1, scarfLen: 20 });
  drawFlyingGptDragon(fb, 264, 48 + Math.sin(t * 5) * 6, t, -1);
  magicParticles(fb, t, 161, 77, 64, 19, C.goldL, C.cyan);
}

function heartBend(fb, t, u) {
  hillBackdrop(fb, t, { sunset: true });
  river(fb, t, 122, { rainbow: true, width: 36, phase: 2.8 });
  // Wider heart meander in the river; a tiny Claude Princess picnic gazebo stands at its center.
  fb.ellipse(127, 90, 47, 24, C.green); fb.ellipse(192, 90, 47, 24, C.lime);
  fb.tri(81, 92, 239, 92, 160, 143, C.green);
  for (let i = 0; i < 6; i++) roundTree(fb, 108 + i * 21, 96 + (i % 2) * 7, 0.4, i % 2 === 0);
  fb.rect(146, 82, 28, 17, C.parchment); fb.box(146, 82, 28, 17, C.gold);
  fb.tri(143, 82, 177, 82, 160, 65, C.scarf);
  drawCastSprite(fb, 144, 121, 'claude', t, { pose: 'cheer', role: 'princess', facing: 1 });
  drawWhaleHero(fb, lerp(86, 239, u), 132, t, { pose: 'happy', facing: 1, scarfLen: 18 });
  for (let i = 0; i < 16; i++) fb.px(mod(i * 23 + t * 22, W), 72 + (i * 11 % 49), C.goldL);
}

function watermillReturn(fb, t, u) {
  hillBackdrop(fb, t);
  river(fb, t, 126, { rainbow: true, width: 32, phase: 1.9 });
  watermill(fb, 101, 126, t + 2, 0.88);
  bridge(fb, 227, 128, 79, 14, true);
  roundTree(fb, 270, 126, 0.78, true);
  for (let i = 0; i < 19; i++) {
    const x = 97 + Math.sin(t * 3 + i) * (12 + i % 4 * 3);
    const y = 100 + mod(i * 13 + t * 24, 52);
    fb.px(x, y, i % 3 ? C.cyan : C.white);
  }
  drawWhaleHero(fb, lerp(147, 230, u), 144, t, { pose: 'run', facing: 1, scarfLen: 17 });
  drawCastSprite(fb, 47, 141, 'kimi', t, { pose: 'cheer', role: 'sage', facing: 1 });
}

function timeWaterfallReturn(fb, t, u) {
  hillBackdrop(fb, t, { dream: true });
  river(fb, t, 145, { rainbow: true, width: 21 });
  timeFalls(fb, t, 93, 52, 132);
  fb.tri(26, 126, 89, 33, 151, 131, C.dslate);
  for (let i = 0; i < 6; i++) {
    clock(fb, 38 + i * 27, 54 + i % 2 * 24, 6 + i % 2, t + i, i % 2 ? C.goldL : C.silver);
  }
  drawPaperBoat(fb, lerp(146, 226, u), 143, t, { scale: 0.71, withWhale: true, chibiWhale: true });
  drawWhaleHero(fb, lerp(137, 240, u), 133, t, { pose: 'shout', facing: 1, scarfLen: 18 });
}

function armada(fb, t, u) {
  hillBackdrop(fb, t, { sunset: true });
  river(fb, t, 111, { rainbow: true, width: 42, phase: 1.1 });
  castle(fb, 162, 119, 0.85, false);
  for (let i = 0; i < 11; i++) {
    const x = mod(i * 33 + t * (7 + i % 4), W);
    const y = 114 + (i % 4) * 14;
    drawPaperBoat(fb, x, y, t + i, { scale: i === 6 ? 0.72 : 0.43, withWhale: i === 6, chibiWhale: true, glowOrb: true });
  }
  drawWhaleHero(fb, lerp(78, 242, u), 107, t, { pose: 'happy', facing: 1, lantern: true, scarfLen: 21 });
  magicParticles(fb, t, 162, 80, 93, 22, C.goldL, C.pink);
}

function fullCastCelebration(fb, t, u) {
  castleHarborCast(fb, t + 2.7, u);
  // Add a foreground parade of ribboned boats and warm lanterns, giving the repeat chorus new foreground motion.
  for (let i = 0; i < 4; i++) {
    drawPaperBoat(fb, mod(27 + i * 91 + t * 9, 370) - 25, 153 + (i % 2) * 6, t + i, { scale: 0.53, withWhale: i === 1, chibiWhale: true });
  }
  for (let i = 0; i < 5; i++) lamp(fb, 32 + i * 62, 143, t + i, 0.52);
}

// --- Chorus three: ideal fairytale heights reflected against real neon city, then a converging mountain pass. ---
function dreamIslands(fb, t, u) {
  if (t >= 169.25) {
    // Second chorus-3 angle descends to a single floating village and its waterfall underside.
    hillBackdrop(fb, t, { dream: true });
    river(fb, t, 147, { rainbow: true, width: 18, phase: 1.9 });
    const x = 171 + Math.sin(t * 0.8) * 8;
    fb.ellipse(x, 91, 78, 14, C.lime); fb.tri(x - 78, 93, x + 78, 93, x, 143, C.green);
    fb.rect(x - 31, 56, 62, 36, C.parchment); fb.box(x - 31, 56, 62, 36, C.dbrown);
    fb.tri(x - 37, 56, x + 37, 56, x, 29, C.scarf);
    for (let i = 0; i < 8; i++) {
      const xx = x - 39 + i * 11;
      fb.vline(xx, 98, 151 + (i % 3) * 5, i % 2 ? C.cyan : C.blue);
    }
    for (let i = 0; i < 6; i++) roundTree(fb, x - 61 + i * 24, 87, 0.39, i % 2 === 0);
    drawWhaleHero(fb, lerp(85, 230, u), 142, t, { pose: 'run', facing: 1, lantern: true, scarfLen: 20 });
    drawFlyingGptDragon(fb, 270 - u * 35, 44 + Math.sin(t * 3) * 6, t, -1);
    magicParticles(fb, t, x, 64, 86, 19, C.goldL, C.pink);
    return;
  }
  hillBackdrop(fb, t, { dream: true });
  river(fb, t, 139, { rainbow: true, width: 23 });
  // Floating green islands with waterfalls and suspended cottage architecture.
  for (let i = 0; i < 4; i++) {
    const x = 32 + i * 81 + Math.sin(t + i) * 7, y = 58 + (i % 2) * 26;
    fb.ellipse(x, y + 13, 30, 8, C.brown);
    fb.tri(x - 30, y + 12, x + 30, y + 12, x, y + 39, C.green);
    fb.ellipse(x, y + 8, 33, 10, C.lime);
    fb.rect(x - 10, y - 15, 20, 22, C.parchment); fb.box(x - 10, y - 15, 20, 22, C.dbrown);
    fb.tri(x - 13, y - 15, x + 13, y - 15, x, y - 29, C.scarf);
    for (let q = 0; q < 4; q++) fb.vline(x - 9 + q * 6, y + 18, y + 42 + (q % 2) * 6, C.cyan);
  }
  drawWhaleHero(fb, lerp(88, 221, u), 133 - Math.sin(t * 2) * 4, t, { pose: 'happy', facing: 1, lantern: true, scarfLen: 20 });
  drawFlyingGptDragon(fb, 275 - u * 48, 47 + Math.sin(t * 3) * 7, t, -1);
  magicParticles(fb, t, 164, 82, 89, 20, C.goldL, C.pink);
}

function idealVsReality(fb, t, u) {
  // Split composition is a visual river reflection, not a loading/KPI split screen.
  fb.gradV(0, 0, W, 88, [C.lavender, C.cyan, C.white]);
  clouds(fb, t, false, 3);
  for (let i = 0; i < 3; i++) {
    const x = 29 + i * 106;
    fb.ellipse(x, 72, 34, 10, C.lime); fb.tri(x - 32, 72, x + 32, 72, x, 101, C.green);
    roundTree(fb, x, 69, 0.46, i === 1);
    fb.vline(x - 25, 76, 112, C.cyan);
  }
  fb.hline(0, W - 1, 88, C.goldL);
  fb.gradV(0, 91, W, 89, [C.navy, C.dslate, C.ink]);
  // Neon skyline is seen in the water's reflection; no readable logos or text.
  for (let i = 0; i < 9; i++) {
    const x = i * 38 - 4, hh = 25 + (i * 17 % 47);
    fb.rect(x, 177 - hh, 28, hh, i % 2 ? C.dslate : C.navy);
    fb.box(x, 177 - hh, 28, hh, C.ink);
    for (let yy = 180 - hh; yy < 175; yy += 9) {
      fb.hline(x + 4, x + 7, yy, i % 3 === 0 ? C.pink : C.cyan);
      fb.hline(x + 15, x + 19, yy + 2, C.goldL);
    }
  }
  for (let i = 0; i < 4; i++) {
    const x = mod(i * 86 + t * 16, W);
    fb.hline(x, x + 35, 124 + i * 12, i % 2 ? C.cyan : C.pink);
  }
  // Whale-girl stands across the magical/real reflection on a narrow mountain ridge.
  fb.tri(96, 97, 167, 67, 226, 97, C.slate);
  drawWhaleHero(fb, lerp(126, 173, u), 90, t, { pose: 'walk', facing: 1, lantern: true, scarfLen: 17 });
  fb.line(0, 89, W, 91, C.white);
  magicParticles(fb, t, 158, 88, 51, 12, C.goldL, C.cyan);
}

function mountainConvergence(fb, t, u) {
  hillBackdrop(fb, t, { dream: true });
  // Two winding river arms arrive from opposing valleys and visibly merge beneath one golden pass.
  river(fb, t, 139, { rainbow: true, width: 18, phase: 0.4 });
  fb.line(12, 151, 130, 114, C.blue, 16);
  fb.line(308, 151, 190, 114, C.cyan, 16);
  fb.line(12, 149, 130, 112, C.goldL, 4);
  fb.line(308, 149, 190, 112, C.pink, 4);
  const mid = 160;
  fb.tri(54, 118, 145, 24, 193, 118, C.slate);
  fb.tri(128, 118, 225, 14, 280, 118, C.dslate);
  fb.tri(128, 118, 160, 70, 194, 118, C.gold);
  fb.glowDisc(mid, 94, 8, 42);
  for (let i = 0; i < 8; i++) {
    const x = mid + Math.cos(i * Math.PI / 4) * (23 + u * 18);
    const y = 95 + Math.sin(i * Math.PI / 4) * (12 + u * 10);
    fb.px(x, y, C.uiW);
  }
  drawWhaleHero(fb, lerp(89, 229, u), 136, t, { pose: 'run', facing: 1, lantern: true, scarfLen: 20 });
  magicParticles(fb, t, 160, 89, 53, 16, C.goldL, C.cyan);
}

function sakuraRiver(fb, t, u) {
  hillBackdrop(fb, t, { sunset: true });
  river(fb, t, 132, { rainbow: true, width: 27 });
  for (let i = 0; i < 6; i++) roundTree(fb, 14 + i * 57, 112 + (i % 2) * 9, 0.72, true);
  // Bicycle path and tiny bridge built along the blossom bank.
  bridge(fb, 225, 128, 73, 14, false);
  const bx = lerp(79, 225, u), by = 130;
  fb.disc(bx - 10, by + 5, 8, C.ink); fb.disc(bx - 10, by + 5, 6, C.silver);
  fb.disc(bx + 12, by + 5, 8, C.ink); fb.disc(bx + 12, by + 5, 6, C.silver);
  fb.line(bx - 10, by + 5, bx, by - 5, C.gold); fb.line(bx, by - 5, bx + 12, by + 5, C.gold);
  fb.line(bx - 10, by + 5, bx + 12, by + 5, C.cyan); fb.line(bx, by - 5, bx - 2, by - 10, C.dbrown);
  drawWhaleHero(fb, bx, by - 12, t, { pose: 'ride', facing: 1, scarfLen: 19 });
  for (let i = 0; i < 26; i++) {
    const x = mod(i * 19 + t * (5 + i % 3), W);
    const y = 20 + mod(i * 13 + Math.sin(t + i) * 9, 100);
    fb.px(x, y, i % 3 ? C.pink : C.uiW);
  }
  drawSwanMorph(fb, 263, 142, t, 0.9);
}

function twilightFleet(fb, t, u) {
  hillBackdrop(fb, t, { sunset: true });
  river(fb, t, 113, { rainbow: true, width: 39, phase: 1.7 });
  castle(fb, 162, 121, 0.98, false, true);
  for (let i = 0; i < 7; i++) drawPaperBoat(fb, 18 + i * 49 + Math.sin(t + i) * 5, 122 + i % 3 * 13, t + i, { scale: i === 3 ? 0.78 : 0.48, withWhale: i === 3, chibiWhale: true });
  drawWhaleHero(fb, lerp(141, 190, u), 103, t, { pose: 'happy', facing: 1, lantern: true, scarfLen: 19 });
  magicParticles(fb, t, 160, 63, 93, 16, C.goldL, C.pink);
}

function castleBlessing(fb, t, u) {
  castleHarborCast(fb, t + 5.8, u);
  // Gold paper garlands and a cart of story props fill the newly framed foreground.
  for (let i = 0; i < 5; i++) {
    const x = 18 + i * 69;
    fb.line(x, 71, x + 35, 84, C.goldL, 2);
    for (let j = 0; j < 4; j++) fb.px(x + 5 + j * 9, 73 + j * 2, j % 2 ? C.pink : C.cyan);
  }
  for (let i = 0; i < 6; i++) drawStoryEmblem(fb, 31 + i * 51, 162, i);
}

function parchmentReveal(fb, t, u) {
  // Parchment ink-wash restages the river and cast as a living illustration, rather than a text card.
  fb.gradV(0, 0, W, H, [C.parchment, C.sand, C.tan]);
  for (let y = 13; y < H; y += 29) fb.hline(8, 312, y, y % 2 ? C.tan : C.sand);
  river(fb, t, 124, { rainbow: true, width: 24, phase: 2.4 });
  castle(fb, 245, 125, 0.61, false, true);
  for (let i = 0; i < 4; i++) roundTree(fb, 31 + i * 56, 137, 0.54, true);
  drawWhaleHero(fb, 154 + Math.sin(t * 2) * 9, 140, t, { pose: 'think', facing: 1, lantern: true, scarfLen: 16 });
  drawCastSprite(fb, 219, 143, 'claude', t, { pose: 'idle', role: 'princess', facing: -1 });
  for (let i = 0; i < 9; i++) {
    const x = 65 + i * 24;
    fb.line(x, 96, x + Math.sin(t + i) * 9, 69 + (i % 3) * 7, C.brown);
    fb.px(x + 2, 68 + (i % 3) * 7, C.scarf);
  }
  magicParticles(fb, t, 165, 84, 75, 13, C.brown, C.goldL);
}

// --- Vocal climax: six headline images, each split into subshots to keep the long vocal alive. ---
function sketchBridge(fb, t, u) {
  hillBackdrop(fb, t, { night: true });
  river(fb, t, 151, { night: true, width: 13 });
  // Rough sketch strokes rise from a hand-drawn book page and become a luminous arch.
  fb.rect(31, 124, 112, 31, C.parchment); fb.box(31, 124, 112, 31, C.dbrown);
  for (let i = 0; i < 5; i++) fb.line(45 + i * 17, 143, 53 + i * 14, 131 - (i % 3) * 4, C.brown);
  const arch = 22 + u * 32;
  fb.line(124, 124, 159, 124 - arch, C.goldL, 2);
  fb.line(159, 124 - arch, 194, 124, C.cyan, 2);
  for (let i = 0; i < 8; i++) fb.line(128 + i * 8, 122 - Math.sin(i / 7 * Math.PI) * arch, 128 + i * 8, 121 - Math.sin(i / 7 * Math.PI) * arch, [C.scarf, C.orange, C.gold, C.lime, C.cyan, C.blue, C.lavender, C.pink][i]);
  drawWhaleHero(fb, lerp(93, 177, u), 144 - u * 24, t, { pose: 'shout', facing: 1, lantern: true, scarfLen: 20 });
  magicParticles(fb, t, 159, 103, 73, 18, C.goldL, C.cyan);
}

function observatoryLantern(fb, t, u) {
  hillBackdrop(fb, t, { night: true });
  stars(fb, t, 80, C.goldL, 130);
  // Mountain observatory with brass dome, telescope, stairway and rows of launched lanterns.
  fb.tri(-7, 143, 79, 58, 168, 143, C.dslate);
  fb.tri(116, 145, 225, 36, 335, 145, C.navy);
  fb.rect(70, 103, 112, 37, C.slate); fb.box(70, 103, 112, 37, C.goldD);
  fb.ellipse(126, 104, 56, 17, C.silver); fb.ellipse(126, 102, 48, 13, C.plum);
  fb.rect(121, 80, 10, 22, C.gold); fb.disc(126, 79, 13, C.goldL);
  fb.line(132, 96, 171, 74, C.uiW, 3); fb.disc(173, 73, 5, C.cyan);
  for (let i = 0; i < 7; i++) {
    const x = 93 + i * 12, y = 127 - i * 3;
    fb.rect(x, y, 10, 3, C.tan); fb.hline(x, x + 10, y, C.goldL);
  }
  drawCastSprite(fb, 189, 131, 'qwen', t, { pose: 'cheer', role: 'hatter', facing: -1 });
  drawWhaleHero(fb, 152, 137, t, { pose: 'happy', facing: 1, lantern: true, scarfLen: 19 });
  for (let i = 0; i < 12; i++) {
    const x = mod(219 + i * 18 + t * 8, W);
    const y = 106 - mod(t * (7 + i % 3) + i * 13, 91);
    fb.rect(x - 3, y - 5, 7, 9, i % 2 ? C.gold : C.scarf);
    fb.tri(x - 4, y + 3, x + 4, y + 3, x, y + 9, C.goldL);
    fb.px(x, y - 2, C.uiW);
  }
}

function milkyBoat(fb, t, u) {
  hillBackdrop(fb, t, { dream: true });
  stars(fb, t, 95, C.goldL, 145);
  river(fb, t, 146, { rainbow: true, width: 25, phase: 0.7 });
  // Milky Way sweeps diagonally upward behind the ship; GPT flies alongside rather than replacing the hero.
  for (let i = 0; i < 55; i++) {
    const x = mod(i * 19 + t * 3, W), y = 18 + mod(i * 31 + x * 0.19, 104);
    fb.px(x, y, i % 4 ? C.goldL : C.uiW);
  }
  const bx = lerp(93, 234, u), by = lerp(143, 71, u);
  drawPaperBoat(fb, bx, by, t, { scale: 1.18, withWhale: true, chibiWhale: false, facing: 1, reflection: false });
  drawFlyingGptDragon(fb, bx + 46, by - 33, t, 1);
  magicParticles(fb, t, bx, by - 9, 62, 22, C.goldL, C.cyan);
}

function emblemOrbs(fb, t, u) {
  hillBackdrop(fb, t, { dream: true });
  // Six story emblems appear as prop silhouettes inside separate luminous orbs, not as counters.
  const centers = [[66, 59], [160, 49], [254, 59], [66, 119], [160, 126], [254, 119]];
  for (let i = 0; i < centers.length; i++) {
    const [x, y] = centers[i];
    const grow = 7 + seg(u, i * 0.12, i * 0.12 + 0.38) * 14;
    fb.disc(x, y, grow + 6, C.blue);
    fb.disc(x, y, grow + 2, i % 2 ? C.pink : C.goldL);
    fb.disc(x, y, grow - 2, C.night);
    drawStoryEmblem(fb, x, y, i);
    magicParticles(fb, t + i * 0.3, x, y, grow + 12, 6, C.goldL, C.cyan);
  }
  drawWhaleHero(fb, 160, 153, t, { pose: 'shout', facing: 1, scarfLen: 19 });
}

function constellationLinks(fb, t, u) {
  hillBackdrop(fb, t, { night: true });
  stars(fb, t, 100, C.goldL, 145);
  const p = [[58, 50], [93, 78], [132, 53], [166, 82], [208, 52], [253, 77], [277, 119], [221, 137], [160, 132], [102, 132], [43, 111]];
  const edges = [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[9,10],[10,0],[1,9],[3,8],[5,7]];
  const n = Math.floor(u * edges.length);
  for (let i = 0; i < n; i++) {
    const [a, b] = edges[i];
    fb.line(p[a][0], p[a][1], p[b][0], p[b][1], C.goldL);
  }
  p.forEach(([x, y], i) => {
    fb.disc(x, y, 3 + (i % 3 === 0 ? 1 : 0), C.goldL);
    fb.px(x - 1, y - 1, C.uiW);
  });
  drawWhaleHero(fb, lerp(87, 160, u), 151, t, { pose: 'happy', facing: 1, lantern: true, scarfLen: 19 });
  drawCastSprite(fb, 225, 144, 'kimi', t, { pose: 'cheer', role: 'sage', facing: -1 });
  magicParticles(fb, t, 159, 87, 94, 23, C.goldL, C.cyan);
}

function cosmicCast(fb, t, u) {
  hillBackdrop(fb, t, { night: true });
  stars(fb, t, 140, C.goldL, 151);
  // A cosmic river loops round the whole cast; the only crown belongs to Princess Claude.
  fb.ellipse(159, 91, 153, 42, C.blue); fb.ellipse(159, 91, 147, 34, C.cyan);
  fb.ellipse(159, 91, 132, 27, C.night);
  for (let i = 0; i < 30; i++) {
    const a = i * Math.PI * 2 / 30 + t * 0.4;
    fb.px(159 + Math.cos(a) * 144, 91 + Math.sin(a) * 32, i % 3 ? C.goldL : C.uiW);
  }
  drawCastSprite(fb, 48, 135, 'doubao', t, { pose: 'cheer', role: 'redhood', facing: 1 });
  drawCastSprite(fb, 86, 139, 'gemini', t, { pose: 'cheer', role: 'alice', facing: 1 });
  drawCastSprite(fb, 125, 137, 'claude', t, { pose: 'cheer', role: 'princess', facing: 1 });
  drawCastSprite(fb, 195, 138, 'qwen', t, { pose: 'cheer', role: 'hatter', facing: -1 });
  drawCastSprite(fb, 233, 137, 'kimi', t, { pose: 'cheer', role: 'sage', facing: -1 });
  drawCastSprite(fb, 272, 136, 'zai', t, { pose: 'cheer', role: 'harp', facing: -1 });
  drawWhaleHero(fb, 160 + Math.sin(t * 1.4) * 11, 133, t, { pose: 'happy', facing: 1, lantern: true, scarfLen: 19 });
  drawFlyingGptDragon(fb, 160, 34 + Math.sin(t * 2.1) * 5, t, -1);
  for (let i = 0; i < 8; i++) {
    const x = 30 + i * 37;
    fb.line(x, 158, x + Math.sin(t + i) * 6, 151 - (i % 3) * 8, C.goldL);
    fb.px(x, 151 - (i % 3) * 8, C.uiW);
  }
}

// --- Closing: return to the same desk, close the crimson-gold storybook, then clean black. ---
function closingDesk(fb, t, u) {
  fb.gradV(0, 0, W, H, [C.night, C.dbrown, C.umber, C.brown]);
  for (let y = 27; y < H; y += 17) fb.hline(0, W - 1, y, y % 34 === 0 ? C.dbrown : C.brown);
  for (let x = 14; x < W; x += 47) fb.vline(x, 30, H, C.umber);
  book(fb, 164, 126, 122, 57, false);
  drawRiceBowl(fb, 59, 139, t, 1.15);
  fb.rect(269, 132, 12, 23, C.tan); fb.box(269, 132, 12, 23, C.dbrown);
  fb.rect(272, 119, 6, 15, C.gold); fb.disc(275, 117, 3.4, C.goldL);
  fb.line(275, 113, 275, 107, C.white);
  drawMapWhaleHero(fb, 163 + Math.sin(t * 2) * 3, 129, t, { pose: 'wave', facing: 1, scarfLen: 15 });
  for (let i = 0; i < 13; i++) fb.px(164 + Math.sin(t * 2 + i) * (10 + i * 2), 119 - i * 4, i % 2 ? C.goldL : C.cyan);
  magicParticles(fb, t, 164, 117, 45, 14, C.goldL, C.cyan);
}

function closingCover(fb, t, u, texts) {
  fb.gradV(0, 0, W, H, [C.night, C.dslate, C.ink]);
  // The final image remains a physical book cover inside the story world, not a channel end card.
  const coverW = lerp(126, 184, u), coverH = lerp(82, 122, u);
  book(fb, 160, 91, coverW, coverH, true, C.crimson);
  fb.box(160 - coverW / 2 + 8, 91 - coverH / 2 + 8, coverW - 16, coverH - 16, C.goldL);
  fb.box(160 - coverW / 2 + 12, 91 - coverH / 2 + 12, coverW - 24, coverH - 24, C.scarfD);
  fb.disc(160, 91, 19, C.gold);
  fb.disc(160, 91, 15, C.parchment);
  drawStoryEmblem(fb, 160, 91, 5);
  const title = '《童话镇》';
  const tw = measureTextPx(title, 12, 1);
  const tx = 160 - tw / 2;
  const ty = 86;
  drawTextPx(fb, tx, ty, title, { size: 12, color: C.goldL, outline: C.dbrown, tracking: 1 });
  texts.push({ id: 'closing-book-title', text: title, x0: tx * 6 - 2, y0: ty * 6 - 2, x1: (tx + tw) * 6 + 2, y1: (ty + 14) * 6 + 2 });
  for (let i = 0; i < 10; i++) {
    const a = i * Math.PI / 5 + t * 0.1;
    fb.px(160 + Math.cos(a) * 104, 91 + Math.sin(a) * 67, i % 2 ? C.goldL : C.cyan);
  }
}

// Shot list is deliberately frequent: lyric cues are surrounded by several visual beats, never a slow blank lead-in.
const SHOTS = [
  [0.00, 1.75, shotDesk],
  [1.75, 4.80, shotHarbor],
  [4.80, 8.80, shotMarket],
  [8.80, 13.50, shotCastleRiver],

  [13.55, 15.20, snowGate], [15.20, 16.95, snowGate],
  [17.00, 18.65, wolfForest], [18.65, 20.35, wolfForest],
  [20.40, 22.05, teaGarden], [22.05, 23.75, teaGarden],
  [23.80, 25.40, swanRiver], [25.40, 27.25, swanRiver],
  [27.30, 28.90, peterClocktower], [28.90, 30.55, peterClocktower],
  [30.60, 32.25, beanstalkHarp], [32.25, 33.95, beanstalkHarp],
  [34.00, 35.60, candyForest], [35.60, 37.25, candyForest],
  [37.30, 39.15, glassSlipper], [39.15, 41.05, glassSlipper],

  [41.15, 44.25, wiseRiver],
  [44.30, 47.85, butterflyGarden],
  [47.90, 51.15, cloakVortex], [51.20, 54.85, cloakVortex],

  [54.95, 58.15, rainbowMap], [58.15, 61.35, rainbowMap],
  [61.45, 64.85, rainbowBridge], [64.95, 68.35, heartIsland],
  [68.45, 71.65, millSpray], [71.75, 75.15, waterfallOfTime],
  [75.25, 78.65, sunsetFleet], [78.75, 82.10, castleHarborCast], [82.10, 85.60, castleBlessing],

  [85.60, 89.40, lanternStreet], [89.40, 93.20, gearLock], [93.20, 97.40, moonBridge],

  [97.45, 99.10, sleepingRoseTower], [99.10, 100.85, sleepingRoseTower],
  [100.95, 104.35, mermaidPalace], [104.45, 107.85, goldenSunbirdShot],
  [107.95, 109.65, tigerPlain], [109.65, 111.35, tigerPlain],
  [111.45, 114.65, puppetTheater], [114.75, 118.05, gemHoard],
  [118.15, 121.45, lifeTree], [121.55, 125.05, redShoesDance],

  [125.15, 128.35, deepSeaTruth], [128.45, 131.85, alarmClockEscape],
  [131.95, 134.85, whaleEyeshadow], [134.95, 137.85, pearlFoam],

  [137.95, 141.50, daylightMapReturn], [141.50, 145.05, daylightMapReturn], [145.15, 148.65, bridgeDuet],
  [148.75, 152.35, heartBend], [152.45, 155.65, watermillReturn],
  [155.75, 159.15, timeWaterfallReturn], [159.25, 162.65, armada],
  [162.75, 165.85, fullCastCelebration],

  [165.95, 169.25, dreamIslands], [169.25, 172.55, dreamIslands], [172.65, 176.55, idealVsReality],
  [176.65, 179.85, mountainConvergence], [179.95, 183.05, sakuraRiver],
  [183.15, 186.65, waterfallOfTime], [186.75, 190.05, twilightFleet],
  [190.15, 193.05, castleBlessing], [193.10, 195.65, parchmentReveal],

  [195.75, 199.25, sketchBridge], [199.25, 203.00, sketchBridge],
  [203.00, 206.50, observatoryLantern], [206.50, 210.00, observatoryLantern],
  [210.00, 213.50, milkyBoat], [213.50, 217.00, milkyBoat],
  [217.00, 220.00, emblemOrbs], [220.00, 223.00, emblemOrbs],
  [223.00, 226.50, constellationLinks], [226.50, 230.00, constellationLinks],
  [230.00, 234.50, cosmicCast], [234.50, 240.00, cosmicCast],

  [240.00, 245.50, closingDesk], [245.50, 249.30, closingCover],
];

function paletteFor(t) {
  if ((t >= 41.15 && t < 54.90) || (t >= 125.15 && t < 137.90)) return LUT.underwater;
  if ((t >= 85.60 && t < 125.10)) return LUT.moonlight;
  if ((t >= 165.95 && t < 172.60) || (t >= 195.75 && t < 240.00)) return LUT.dreamSky;
  if (t >= 193.10 && t < 195.70) return LUT.parchmentInk;
  if ((t >= 54.95 && t < 85.60) || (t >= 137.95 && t < 165.90)) return LUT.sunset;
  return LUT.full;
}

export function renderScene(fb, t) {
  const texts = [];
  if (t >= 249.30) {
    fb.clear(C.ink);
    return { lut: LUT.full, texts };
  }
  const shot = SHOTS.find(([a, b]) => t >= a && t < b);
  if (!shot) {
    // Tiny timestamp gaps are filled with a live river/cast image, never a black or empty lead-in.
    hillBackdrop(fb, t, { sunset: t > 54.9 && t < 85.6 });
    river(fb, t, 132, { rainbow: true });
    drawWhaleHero(fb, 160, 139, t, { pose: 'run', facing: 1, scarfLen: 16 });
    return { lut: paletteFor(t), texts };
  }
  const [a, b, fn] = shot;
  const u = clamp((t - a) / Math.max(0.001, b - a), 0, 1);
  fn(fb, t, u, texts);
  return { lut: paletteFor(t), texts };
}
