// px.js — 320×180 native indexed-colour pixel engine (×6 nearest-neighbour → 1920×1080)
import { CHAR_HEX } from './sprites_data.js';

export const W = 320, H = 180, SCALE = 6;
export const T = 255;

const HEX = [
  // 0..31: ENDESGA-32 master palette
  '#be4a2f', '#d77643', '#ead4aa', '#e4a672', '#b86f50', '#733e39', '#3e2731', '#a22633',
  '#e43b44', '#f77622', '#feae34', '#fee761', '#63c74d', '#3e8948', '#265c42', '#193c3e',
  '#124e89', '#0099db', '#2ce8f5', '#ffffff', '#c0cbdc', '#8b9bb4', '#5a6988', '#3a4466',
  '#262b44', '#181425', '#ff0044', '#68386c', '#b55088', '#f6757a', '#e8b796', '#c28569',
  // 32..34: Protected Hero Red Scarf
  '#e63946', '#9e1b28', '#ff758f',
  // 35..38: Protected Royal/Holy Gold & UI crisp white
  '#ffd166', '#d9822b', '#fff3b0', '#ffffff',
  // 39..41: Whale-girl ocean blues
  '#16386e', '#2762b3', '#5fa8f5',
  // 42..45: GPT Dragon-girl silver & amethyst scales
  '#eef1ff', '#b8c0e8', '#7b4bc4', '#432375',
  // 46..47: Mage lavender & warm parchment
  '#9d8df2', '#f3e5c0',
  // 48..143: 96 quantized 16-bit palette colours baked from project AI-girls sprites
  ...CHAR_HEX,
];

export const C = {
  rust: 0, clay: 1, sand: 2, tan: 3, brown: 4, dbrown: 5, umber: 6, crimson: 7,
  red: 8, orange: 9, amber: 10, yellow: 11, lime: 12, green: 13, dgreen: 14, teal: 15,
  navy: 16, blue: 17, cyan: 18, white: 19, silver: 20, steel: 21, slate: 22, dslate: 23,
  night: 24, ink: 25, hot: 26, plum: 27, rose: 28, pink: 29, skin: 30, skinS: 31,
  scarf: 32, scarfD: 33, scarfL: 34,
  gold: 35, goldD: 36, goldL: 37, uiW: 38,
  whaleD: 39, whaleM: 40, whaleL: 41,
  dragS: 42, dragM: 43, dragV: 44, dragD: 45,
  lavender: 46, parchment: 47,
};

export const NPAL = HEX.length;
export const PROTECT = new Set([32, 33, 34, 35, 36, 37, 38]);

const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
export const RGB = HEX.map(rgb);
const lum = ([r, g, b]) => 0.299 * r + 0.587 * g + 0.114 * b;
const pack = ([r, g, b]) => (255 << 24) | (b << 16) | (g << 8) | r;

function nearestIdx(targetRgb, allowProtected = false, maxIdx = NPAL) {
  let best = 0, bd = 1e12;
  for (let i = 0; i < maxIdx; i++) {
    if (!allowProtected && PROTECT.has(i)) continue;
    const c = RGB[i];
    const d = (c[0] - targetRgb[0]) ** 2 * 0.3 + (c[1] - targetRgb[1]) ** 2 * 0.59 + (c[2] - targetRgb[2]) ** 2 * 0.11;
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}

// Index-stepping light / shadow / soot-charred tables (STYLE.md §2: light is index stepping, never alpha)
export const LIGHT = new Uint8Array(256);
export const DARK = new Uint8Array(256);
export const CHARRED = new Uint8Array(256);
for (let i = 0; i < NPAL; i++) {
  if (PROTECT.has(i)) { LIGHT[i] = i; DARK[i] = i; CHARRED[i] = i; continue; }
  const [r, g, b] = RGB[i];
  const cap = i < 48 ? 48 : NPAL;
  LIGHT[i] = nearestIdx([Math.min(255, r * 1.28 + 26), Math.min(255, g * 1.26 + 24), Math.min(255, b * 1.22 + 18)], false, cap);
  DARK[i] = nearestIdx([r * 0.62, g * 0.60, b * 0.68], false, cap);
  CHARRED[i] = nearestIdx([r * 0.25 + 16, g * 0.24 + 14, b * 0.28 + 20], false, 48);
}

function lutFrom(fn) {
  const L = new Uint32Array(256);
  for (let i = 0; i < NPAL; i++) L[i] = pack(fn(i));
  return L;
}
function nearestCol(c, set) {
  let best = set[0], bd = 1e12;
  for (const s of set) {
    const d = (c[0] - s[0]) ** 2 * 0.3 + (c[1] - s[1]) ** 2 * 0.59 + (c[2] - s[2]) ** 2 * 0.11;
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}

export const LUT = {};
LUT.full = lutFrom((i) => RGB[i]);

// 4-colour ancient storybook scroll (luminance mapped, never rank mapped)
const GB4 = ['#241c2c', '#594157', '#9c7a78', '#ead4aa'].map(rgb);
LUT.gb4 = lutFrom((i) => {
  if (PROTECT.has(i)) return RGB[i];
  const l = lum(RGB[i]);
  return GB4[l < 58 ? 0 : l < 118 ? 1 : l < 180 ? 2 : 3];
});

// 8-bit console dawn palette (15 colors including dark green & dark brown)
const NES15 = [
  '#181425', '#fcfcfc', '#b8c0dc', '#5a6988', '#1c388c', '#3c84fc', '#8ce0fc',
  '#b81c28', '#fc784c', '#fcbc28', '#8c4c1c', '#2ca038', '#fcd8a8', '#145020', '#4c2414',
].map(rgb);
LUT.nes = lutFrom((i) => (PROTECT.has(i) ? RGB[i] : nearestCol(RGB[i], NES15)));

// Cataclysm dragon raid remap: skies & greens shift into ominous violet-crimson firelight
LUT.cataclysm = lutFrom((i) => {
  if (PROTECT.has(i) || (i >= 42 && i <= 45)) return RGB[i];
  const [r, g, b] = RGB[i];
  return [
    Math.min(255, Math.round(r * 0.92 + 34)),
    Math.round(g * 0.52),
    Math.min(255, Math.round(b * 0.82 + 38)),
  ];
});

// Smoky ember aftermath
LUT.ember = lutFrom((i) => {
  if (PROTECT.has(i)) return RGB[i];
  const [r, g, b] = RGB[i];
  const l = lum([r, g, b]);
  return [
    Math.min(255, Math.round(r * 0.65 + l * 0.35 + 22)),
    Math.round(g * 0.58 + l * 0.22),
    Math.round(b * 0.55 + l * 0.24),
  ];
});

// Blizzard icy mountains (protected hero red scarf & gold blaze vividly against frost!)
LUT.blizzard = lutFrom((i) => {
  if (PROTECT.has(i) || (i >= 39 && i <= 41)) return RGB[i];
  const [r, g, b] = RGB[i];
  const l = lum([r, g, b]);
  return [
    Math.min(255, Math.round(r * 0.45 + l * 0.48 + 14)),
    Math.min(255, Math.round(g * 0.55 + l * 0.45 + 20)),
    Math.min(255, Math.round(b * 0.65 + l * 0.42 + 36)),
  ];
});

// Holy moonlight night forest
LUT.moonlight = lutFrom((i) => {
  if (PROTECT.has(i)) return RGB[i];
  const [r, g, b] = RGB[i];
  return [
    Math.round(r * 0.46 + 10),
    Math.round(g * 0.58 + 18),
    Math.min(255, Math.round(b * 0.85 + 36)),
  ];
});

// Dragon rage flash
LUT.dragonRage = lutFrom((i) => {
  if (PROTECT.has(i)) return RGB[i];
  const [r, g, b] = RGB[i];
  return [
    Math.min(255, Math.round(r * 1.18 + 38)),
    Math.round(g * 0.64),
    Math.round(b * 0.62),
  ];
});

// Deep river underwater truth realm (protects Hero Red, Gold & Whale-girl blues!)
LUT.underwater = lutFrom((i) => {
  if (PROTECT.has(i) || (i >= 39 && i <= 41)) return RGB[i];
  const [r, g, b] = RGB[i];
  return [
    Math.round(r * 0.42 + 8),
    Math.min(255, Math.round(g * 0.72 + 24)),
    Math.min(255, Math.round(b * 0.92 + 42)),
  ];
});

// Golden-rose fairytale sunset
LUT.sunset = lutFrom((i) => {
  if (PROTECT.has(i)) return RGB[i];
  const [r, g, b] = RGB[i];
  return [
    Math.min(255, Math.round(r * 1.08 + 26)),
    Math.min(255, Math.round(g * 0.86 + 10)),
    Math.min(255, Math.round(b * 0.88 + 18)),
  ];
});

// Lavender-rose floating dream sky (Chorus 3)
LUT.dreamSky = lutFrom((i) => {
  if (PROTECT.has(i)) return RGB[i];
  const [r, g, b] = RGB[i];
  return [
    Math.min(255, Math.round(r * 0.94 + 24)),
    Math.min(255, Math.round(g * 0.84 + 14)),
    Math.min(255, Math.round(b * 1.04 + 28)),
  ];
});

// Warm hand-drawn parchment storybook wash ("又陌生" -> "啊~~")
LUT.parchmentInk = lutFrom((i) => {
  if (PROTECT.has(i)) return RGB[i];
  const [r, g, b] = RGB[i];
  const l = lum([r, g, b]);
  return [
    Math.min(255, Math.round(l * 0.78 + r * 0.22 + 34)),
    Math.min(255, Math.round(l * 0.72 + g * 0.20 + 22)),
    Math.min(255, Math.round(l * 0.58 + b * 0.18 + 8)),
  ];
});

export function stepDarken(L, f) {
  const q = Math.round(Math.max(0, Math.min(1, f)) * 4) / 4;
  if (q <= 0) return L;
  const O = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    const v = L[i]; if (!v) continue;
    const r = v & 255, g = (v >> 8) & 255, b = (v >> 16) & 255;
    O[i] = pack([ (r * (1 - q)) | 0, (g * (1 - q)) | 0, (b * (1 - q)) | 0 ]);
  }
  return O;
}

export function stepWhiten(L, f) {
  const q = Math.round(Math.max(0, Math.min(1, f)) * 4) / 4;
  if (q <= 0) return L;
  const O = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    const v = L[i]; if (!v) continue;
    const r = v & 255, g = (v >> 8) & 255, b = (v >> 16) & 255;
    O[i] = pack([ (r + (255 - r) * q) | 0, (g + (255 - g) * q) | 0, (b + (255 - b) * q) | 0 ]);
  }
  return O;
}

const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export const bayer = (x, y) => (B4[((y & 3) << 2) | (x & 3)] + 0.5) / 16;

export function hash(x, y = 0, z = 0) {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const seg = (t, a, b) => clamp((t - a) / Math.max(1e-6, b - a), 0, 1);
export const eo = (t) => { const u = clamp(t, 0, 1); return 1 - (1 - u) * (1 - u); };
export const eio = (t) => { const u = clamp(t, 0, 1); return u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u); };
export const mod = (n, m) => ((n % m) + m) % m;

export class FB {
  constructor(w = W, h = H) {
    this.w = w;
    this.h = h;
    this.d = new Uint8Array(w * h);
    this.hw = w * 2;
    this.hh = h * 2;
    this.hi = new Uint8Array(this.hw * this.hh);
    this.hi.fill(T);
    this.clip = [0, 0, w, h];
  }
  clear(c = C.ink) {
    this.d.fill(c);
    this.hi.fill(T);
  }
  px(x, y, c) {
    x |= 0; y |= 0;
    const [cx, cy, cw, ch] = this.clip;
    if (x < cx || y < cy || x >= cw || y >= ch || c === T) return;
    this.d[y * this.w + x] = c;
    const hx = x << 1, hy = y << 1, hw = this.hw;
    const hr = hy * hw + hx;
    this.hi[hr] = T; this.hi[hr + 1] = T;
    this.hi[hr + hw] = T; this.hi[hr + hw + 1] = T;
  }
  pxHi(hx, hy, c) {
    hx |= 0; hy |= 0;
    if (hx < 0 || hy < 0 || hx >= this.hw || hy >= this.hh || c === T) return;
    this.hi[hy * this.hw + hx] = c;
  }
  get(x, y) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return T;
    return this.d[y * this.w + x];
  }
  rect(x, y, w, h, c) {
    if (c === T) return;
    const x0 = Math.max(this.clip[0], Math.round(x));
    const y0 = Math.max(this.clip[1], Math.round(y));
    const x1 = Math.min(this.clip[2], Math.round(x) + Math.round(w));
    const y1 = Math.min(this.clip[3], Math.round(y) + Math.round(h));
    for (let py = y0; py < y1; py++) {
      const row = py * this.w;
      for (let px = x0; px < x1; px++) this.d[row + px] = c;
      const hr0 = (py << 1) * this.hw;
      const hr1 = hr0 + this.hw;
      const hx0 = x0 << 1, hx1 = x1 << 1;
      this.hi.fill(T, hr0 + hx0, hr0 + hx1);
      this.hi.fill(T, hr1 + hx0, hr1 + hx1);
    }
  }
  box(x, y, w, h, c) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    this.hline(x, x + w - 1, y, c);
    this.hline(x, x + w - 1, y + h - 1, c);
    this.vline(x, y, y + h - 1, c);
    this.vline(x + w - 1, y, y + h - 1, c);
  }
  hline(x0, x1, y, c) {
    y = Math.round(y);
    const a = Math.min(Math.round(x0), Math.round(x1));
    const b = Math.max(Math.round(x0), Math.round(x1));
    for (let x = a; x <= b; x++) this.px(x, y, c);
  }
  vline(x, y0, y1, c) {
    x = Math.round(x);
    const a = Math.min(Math.round(y0), Math.round(y1));
    const b = Math.max(Math.round(y0), Math.round(y1));
    for (let y = a; y <= b; y++) this.px(x, y, c);
  }
  line(x0, y0, x1, y1, c, thick = 1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let e = dx + dy;
    for (;;) {
      if (thick <= 1) this.px(x0, y0, c);
      else this.rect(x0 - (thick >> 1), y0 - (thick >> 1), thick, thick, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * e;
      if (e2 >= dy) { e += dy; x0 += sx; }
      if (e2 <= dx) { e += dx; y0 += sy; }
    }
  }
  disc(cx, cy, r, c) {
    cx = Math.round(cx); cy = Math.round(cy);
    const rr = r * r + r * 0.6;
    const ri = Math.ceil(r);
    for (let y = -ri; y <= ri; y++) {
      for (let x = -ri; x <= ri; x++) {
        if (x * x + y * y <= rr) this.px(cx + x, cy + y, c);
      }
    }
  }
  ellipse(cx, cy, rx, ry, c) {
    cx = Math.round(cx); cy = Math.round(cy);
    const rxi = Math.ceil(rx), ryi = Math.ceil(ry);
    for (let y = -ryi; y <= ryi; y++) {
      for (let x = -rxi; x <= rxi; x++) {
        if ((x * x) / (rx * rx + 0.2) + (y * y) / (ry * ry + 0.2) <= 1) this.px(cx + x, cy + y, c);
      }
    }
  }
  tri(x0, y0, x1, y1, x2, y2, c) {
    const minX = Math.max(0, Math.floor(Math.min(x0, x1, x2)));
    const maxX = Math.min(this.w - 1, Math.ceil(Math.max(x0, x1, x2)));
    const minY = Math.max(0, Math.floor(Math.min(y0, y1, y2)));
    const maxY = Math.min(this.h - 1, Math.ceil(Math.max(y0, y1, y2)));
    const edge = (ax, ay, bx, by, px, py) => (px - ax) * (by - ay) - (py - ay) * (bx - ax);
    const area = edge(x0, y0, x1, y1, x2, y2);
    if (Math.abs(area) < 0.01) return;
    const sgn = area > 0 ? 1 : -1;
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const px = x + 0.5, py = y + 0.5;
        if (
          edge(x0, y0, x1, y1, px, py) * sgn >= 0 &&
          edge(x1, y1, x2, y2, px, py) * sgn >= 0 &&
          edge(x2, y2, x0, y0, px, py) * sgn >= 0
        ) {
          this.px(x, y, c);
        }
      }
    }
  }
  gradV(x0, y0, w, h, cols) {
    const n = cols.length - 1;
    for (let y = 0; y < h; y++) {
      const v = (y / Math.max(1, h - 1)) * n;
      const b = Math.min(n - 1, Math.floor(v));
      const f = v - b;
      const py = y0 + y;
      for (let x = 0; x < w; x++) {
        const px = x0 + x;
        this.px(px, py, cols[bayer(px, py) < f ? b + 1 : b]);
      }
    }
  }
  // Bayer-stepped light beam (STYLE.md §2: 50% checker core + 25% edge via index stepping)
  lightBeam(topX, topW, botX, botW, y0, y1, doubleStep = true) {
    for (let y = Math.max(0, y0 | 0); y <= Math.min(this.h - 1, y1 | 0); y++) {
      const u = (y - y0) / Math.max(1, y1 - y0);
      const cx = lerp(topX, botX, u);
      const hw = lerp(topW, botW, u) * 0.5;
      const xStart = Math.max(0, Math.floor(cx - hw - 4));
      const xEnd = Math.min(this.w - 1, Math.ceil(cx + hw + 4));
      for (let x = xStart; x <= xEnd; x++) {
        const d = Math.abs(x - cx);
        const by = bayer(x, y);
        const cur = this.d[y * this.w + x];
        if (d < hw * 0.72) {
          if (by < 0.65) this.d[y * this.w + x] = doubleStep && by < 0.25 ? LIGHT[LIGHT[cur]] : LIGHT[cur];
        } else if (d < hw) {
          if (by < 0.3) this.d[y * this.w + x] = LIGHT[cur];
        }
      }
    }
  }
  // Bayer-stepped radial glow
  glowDisc(cx, cy, rInner, rOuter) {
    const x0 = Math.max(0, Math.floor(cx - rOuter));
    const x1 = Math.min(this.w - 1, Math.ceil(cx + rOuter));
    const y0 = Math.max(0, Math.floor(cy - rOuter));
    const y1 = Math.min(this.h - 1, Math.ceil(cy + rOuter));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d > rOuter) continue;
        const cur = this.d[y * this.w + x];
        const by = bayer(x, y);
        if (d < rInner) {
          this.d[y * this.w + x] = by < 0.5 ? LIGHT[LIGHT[cur]] : LIGHT[cur];
        } else {
          const u = 1 - (d - rInner) / Math.max(1, rOuter - rInner);
          if (by < u * 0.65) this.d[y * this.w + x] = LIGHT[cur];
        }
      }
    }
  }
  blit(src, dx, dy, flip = false, outlineCol = null) {
    dx = Math.round(dx); dy = Math.round(dy);
    if (outlineCol !== null) {
      for (let y = 0; y < src.h; y++) {
        for (let x = 0; x < src.w; x++) {
          const c = src.d[y * src.w + (flip ? src.w - 1 - x : x)];
          if (c === T || c === outlineCol) continue;
          this.px(dx + x - 1, dy + y, outlineCol);
          this.px(dx + x + 1, dy + y, outlineCol);
          this.px(dx + x, dy + y - 1, outlineCol);
          this.px(dx + x, dy + y + 1, outlineCol);
        }
      }
    }
    for (let y = 0; y < src.h; y++) {
      for (let x = 0; x < src.w; x++) {
        const c = src.d[y * src.w + (flip ? src.w - 1 - x : x)];
        if (c === T) continue;
        this.px(dx + x, dy + y, c);
      }
    }
    if (src.hi) {
      const hdx = dx * 2, hdy = dy * 2;
      for (let hy = 0; hy < src.hh; hy++) {
        const yy = hdy + hy;
        if (yy < 0 || yy >= this.hh) continue;
        for (let hx = 0; hx < src.hw; hx++) {
          const xx = hdx + hx;
          if (xx < 0 || xx >= this.hw) continue;
          const hc = src.hi[hy * src.hw + (flip ? src.hw - 1 - hx : hx)];
          if (hc !== T) this.hi[yy * this.hw + xx] = hc;
        }
      }
    }
  }
  // Blit a 640×360-scale sprite (2× resolution of 320×180 -> crisp 3×3 pixel blocks on 1080p!)
  blitSpriteHi(src, dxHi, dyHi, flip = false, remap = null) {
    if (!src) return;
    dxHi = Math.round(dxHi); dyHi = Math.round(dyHi);
    for (let y = 0; y < src.h; y++) {
      const yy = dyHi + y;
      if (yy < 0 || yy >= this.hh) continue;
      for (let x = 0; x < src.w; x++) {
        const xx = dxHi + x;
        if (xx < 0 || xx >= this.hw) continue;
        const c = src.d[y * src.w + (flip ? src.w - 1 - x : x)];
        if (c === T) continue;
        this.hi[yy * this.hw + xx] = remap ? remap[c] : c;
      }
    }
  }
}

const HW = W * 2, HH = H * 2, HSCALE = 3;

export function makeOut(canvas) {
  const lo = document.createElement('canvas');
  lo.width = HW; lo.height = HH;
  const g = lo.getContext('2d');
  const img = g.createImageData(HW, HH);
  const u32 = new Uint32Array(img.data.buffer);
  const o = canvas.getContext('2d');
  o.imageSmoothingEnabled = false;
  return {
    lo, u32,
    present(fb, lut, lutB = null, pick = null, sx = 0, sy = 0) {
      const d = fb.d, hi = fb.hi;
      const hsx = sx * 2, hsy = sy * 2;
      for (let hy = 0; hy < HH; hy++) {
        const shy = clamp(hy - hsy, 0, HH - 1);
        const ly = shy >> 1;
        const hrow = shy * HW;
        const lrow = ly * W;
        const outRow = hy * HW;
        for (let hx = 0; hx < HW; hx++) {
          const shx = clamp(hx - hsx, 0, HW - 1);
          const hIdx = hi[hrow + shx];
          const idx = hIdx !== T ? hIdx : d[lrow + (shx >> 1)];
          u32[outRow + hx] = lutB && pick(shx >> 1, ly) ? lutB[idx] : lut[idx];
        }
      }
      g.putImageData(img, 0, 0);
    },
    post(fn) { fn(u32); g.putImageData(img, 0, 0); },
    show() {
      o.imageSmoothingEnabled = false;
      o.drawImage(lo, 0, 0, HW * HSCALE, HH * HSCALE);
    },
  };
}

export function mosaic(u32, n) {
  n = Math.round(n) * 2;
  if (n <= 2) return;
  const src = u32.slice();
  const ox = (HW >> 1) % n, oy = (HH >> 1) % n;
  for (let y = 0; y < HH; y++) {
    const by = clamp(Math.floor((y - oy) / n) * n + oy, 0, HH - 1);
    for (let x = 0; x < HW; x++) {
      const bx = clamp(Math.floor((x - ox) / n) * n + ox, 0, HW - 1);
      u32[y * HW + x] = src[by * HW + bx];
    }
  }
}

export function encounterSwirl(u32, u) {
  if (u <= 0) return;
  const src = u32.slice();
  const cx = HW * 0.5, cy = HH * 0.5;
  const twist = Math.pow(u, 1.6) * 5.2;
  const blk = Math.max(2, Math.round(1 + u * 8) * 2);
  const whitePack = (255 << 24) | (255 << 16) | (255 << 8) | 255;
  for (let y = 0; y < HH; y++) {
    for (let x = 0; x < HW; x++) {
      const qx = Math.floor(x / blk) * blk, qy = Math.floor(y / blk) * blk;
      const dx = qx - cx, dy = qy - cy;
      const r = Math.hypot(dx, dy) / 320;
      const ang = twist * Math.max(0, 1.15 - r);
      const ca = Math.cos(ang), sa = Math.sin(ang);
      const sx = clamp(Math.round(cx + dx * ca - dy * sa), 0, HW - 1);
      const sy = clamp(Math.round(cy + dx * sa + dy * ca), 0, HH - 1);
      if (u > 0.68 && bayer(x >> 1, y >> 1) < (u - 0.68) / 0.32) u32[y * HW + x] = whitePack;
      else u32[y * HW + x] = src[sy * HW + sx];
    }
  }
}

// 3-2-1 px integer screen shake over 8 frames at 24fps (STYLE.md §5)
export function calcShake(t, hits) {
  let sx = 0, sy = 0;
  for (const h of hits) {
    const dt = t - h.t;
    if (dt >= 0 && dt < 0.34) {
      const f = Math.floor(dt * 24);
      const mag = (f < 2 ? 3 : f < 5 ? 2 : 1) * (h.amp || 1);
      sx += ((f & 1) ? 1 : -1) * mag;
      sy += ((f & 2) ? 1 : -1) * Math.max(1, mag - 1);
    }
  }
  return [Math.round(sx), Math.round(sy)];
}
