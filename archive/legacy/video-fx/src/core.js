// src/core.js — ClaudeAnimationBase + PDoomVideo Engine Core for DeepSeek Whale Girl MV
// Directly implements the rendering, boiling-ink, watercolor-wash, 16-bit pixel quantization,
// camera, and physical cartoon timing primitives of JohnHeibel/ClaudeAnimationBase & PDoomVideo.

(function (root) {
  const W = 1280, H = 720, FPS = 30, BOIL = 3;
  const DURATION = 82.50;
  const BPM = 128, BEAT = 60 / BPM, OFF = 0.08;
  const TAU = Math.PI * 2;

  const PAL = {
    paper: '#F5EFE4',
    paperDk: '#E4D8C3',
    cream: '#FFF9EE',
    ink: '#1C1624',
    night: '#141726',
    indigo: '#242A48',
    slate: '#3D4870',
    whaleNavy: '#1B3358',
    whaleBlue: '#2E67A0',
    whaleSky: '#68B5E8',
    whaleCyan: '#5CE1E6',
    whaleFoam: '#E8F7FF',
    coral: '#E07A5F',
    coralDk: '#B6543B',
    peach: '#F2A679',
    gold: '#F2C14E',
    ochre: '#D99B26',
    rose: '#E06A7B',
    teal: '#3B9A9C',
    sap: '#5B9A68',
    violet: '#7E5A9B',
    cyan: '#5CE1E6'
  };

  const STYLES = ['pixel', 'watercolor', 'ukiyoe', 'risograph', 'neon'];

  // 4x4 Bayer Matrix for 16-Bit Ordered Dither
  const BAYER4 = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5]
  ];

  // ---------- Math & Easing ----------
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const frac = x => x - Math.floor(x);
  const seg = (t, a, b) => clamp((t - a) / Math.max(1e-6, b - a), 0, 1);
  const ease = x => { x = clamp(x); return x * x * (3 - 2 * x); };
  const easeIn = x => { x = clamp(x); return x * x * x; };
  const easeOut = x => { x = clamp(x); return 1 - Math.pow(1 - x, 3); };
  const backOut = (x, s = 1.7) => {
    x = clamp(x);
    return 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2);
  };
  const elasticOut = x => {
    x = clamp(x);
    return x === 0 || x === 1 ? x : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * (TAU / 3)) + 1;
  };
  const wob = (t, f = 1, ph = 0) => Math.sin(t * f * TAU + ph);
  const hash = n => frac(Math.sin(n * 127.1 + 311.7) * 43758.5453123);

  // ---------- Deterministic PRNG & 3-Frame Line Boil (`BOIL = 3`) ----------
  let _seed = 1337;
  let _boilSlot = 0;
  function randomSeed(s) {
    _seed = (Math.imul(Math.floor(s) | 0, 1664525) + 1013904223) >>> 0;
    if (_seed === 0) _seed = 1337;
  }
  function random(a = 1, b) {
    _seed ^= _seed << 13;
    _seed ^= _seed >>> 17;
    _seed ^= _seed << 5;
    const u = (_seed >>> 0) / 4294967296;
    return b !== undefined ? a + u * (b - a) : u * a;
  }
  function reseedBoil(t) {
    _boilSlot = Math.floor(t * (FPS / BOIL)) + 1;
    randomSeed(_boilSlot * 7919);
  }
  function boilSeed(label) {
    let h = 2166136261;
    const s = String(label);
    for (let i = 0; i < s.length; i++) {
      h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    }
    randomSeed(_boilSlot * 10007 + (h >>> 0));
  }
  const jit = (amp = 1.5) => (amp ? random(-amp, amp) : 0);

  // ---------- Audio Envelope & Beat Sync (`卡点`) ----------
  const bpOf = t => (t - OFF) / BEAT;
  const beatN = t => Math.floor(bpOf(t));
  const pulse = (t, sh = 4) => Math.pow(1 - frac(Math.max(0, bpOf(t))), sh);
  const pulse2 = (t, sh = 4) => Math.pow(1 - frac(Math.max(0, bpOf(t)) * 2), sh);

  function getAudioData() {
    if (typeof window !== 'undefined' && window.AUDIO_DATA) return window.AUDIO_DATA;
    if (typeof globalThis !== 'undefined' && globalThis.AUDIO_DATA) return globalThis.AUDIO_DATA;
    return null;
  }
  function sampleEnv(arr, t) {
    if (!arr || !arr.length) return 0;
    const idx = clamp(Math.floor(t * 30), 0, arr.length - 1);
    return arr[idx] || 0;
  }
  const energyAt = t => { const d = getAudioData(); return d ? sampleEnv(d.energy, t) : 0.4; };
  const bassAt = t => { const d = getAudioData(); return d ? sampleEnv(d.bass, t) : 0.3; };
  const voiceAt = t => { const d = getAudioData(); return d ? sampleEnv(d.voice, t) : 0.5; };

  function beatPulse(t, windowSec = 0.18) {
    const d = getAudioData();
    if (!d || !d.beats) return pulse(t, 4);
    let best = 0;
    for (let i = 0; i < d.beats.length; i++) {
      const dt = t - d.beats[i];
      if (dt >= 0 && dt < windowSec) {
        best = Math.max(best, Math.pow(1 - dt / windowSec, 2.2));
      }
    }
    return Math.max(best, pulse(t, 5) * 0.45);
  }
  function hitPulse(t, windowSec = 0.22) {
    const d = getAudioData();
    if (!d || !d.hits) return beatPulse(t, windowSec);
    let best = 0;
    for (let i = 0; i < d.hits.length; i++) {
      const dt = t - d.hits[i];
      if (dt >= 0 && dt < windowSec) {
        best = Math.max(best, Math.pow(1 - dt / windowSec, 2.0));
      }
    }
    return best;
  }

  // ---------- Cartoon Physics & Motion Helpers (`ClaudeAnimationBase` / `PDoomVideo`) ----------
  function kf(t, keys, fn = ease) {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 0; i < keys.length - 1; i++) {
      const [t0, v0, f] = keys[i], [t1, v1] = keys[i + 1];
      if (t <= t1) {
        const k = (f || fn)((t - t0) / Math.max(1e-6, t1 - t0));
        return Array.isArray(v0) ? v0.map((v, j) => lerp(v, v1[j], k)) : lerp(v0, v1, k);
      }
    }
    return keys[keys.length - 1][1];
  }
  const spring = (x, freq = 2.5, damp = 6) =>
    x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.exp(-damp * x) * Math.cos(freq * TAU * x);
  const ring = (age, dur = 0.5, freq = 3, damp = 5) =>
    age <= 0 || age >= dur ? 0 : Math.exp(-damp * (age / dur)) * Math.sin(freq * TAU * (age / dur));
  const onTwos = (t, fps = 12) => Math.floor(t * fps) / fps;
  const arcPt = (p0, p1, h, x) => [
    lerp(p0[0], p1[0], x),
    lerp(p0[1], p1[1], x) - 4 * h * x * (1 - x)
  ];

  function jump(t, t0, t1, h = 1) {
    const dur = Math.max(0.01, t1 - t0), a = Math.min(0.12, dur * 0.2), l = Math.min(0.16, dur * 0.25);
    if (t < t0 - a || t > t1 + l) return { dy: 0, sq: 0 };
    if (t < t0) return { dy: 0, sq: -0.26 * Math.sin(((t - (t0 - a)) / a) * Math.PI) };
    if (t > t1) {
      const u = (t - t1) / l;
      return { dy: 0, sq: -0.28 * (1 - u) * Math.cos(u * Math.PI * 2) };
    }
    const u = (t - t0) / dur;
    return { dy: -4 * h * u * (1 - u), sq: 0.22 * (1 - Math.abs(2 * u - 1)) };
  }

  function take(t, t0, intensity = 1) {
    const age = t - t0;
    if (age < 0 || age > 0.45) return { dy: 0, sq: 0 };
    if (age < 0.08) return { dy: 0.2 * intensity, sq: -0.3 * intensity * (age / 0.08) };
    if (age < 0.2) {
      const u = (age - 0.08) / 0.12;
      return { dy: -0.9 * intensity * Math.sin(u * Math.PI), sq: 0.32 * intensity * Math.sin(u * Math.PI) };
    }
    const u = (age - 0.2) / 0.25;
    return { dy: 0, sq: -0.15 * intensity * (1 - u) * Math.cos(u * TAU) };
  }

  function stroll(t, t0, t1, x0, x1, u = 24) {
    const k = ease(seg(t, t0, t1));
    const x = lerp(x0, x1, k);
    const moving = t > t0 && t < t1;
    const d = Math.abs(x - x0) / Math.max(12, 2.1 * u);
    return {
      x,
      walk: moving ? d : 0,
      view: moving ? 'q' : 'front',
      flip: x1 < x0,
      dy: moving ? -Math.abs(Math.sin(d * Math.PI)) * 0.32 : 0,
      rot: moving ? Math.sin(d * Math.PI * 2) * 0.04 : 0
    };
  }

  function runTo(t, t0, t1, x0, x1, u = 24) {
    const k = ease(seg(t, t0, t1));
    const x = lerp(x0, x1, k);
    const moving = t > t0 && t < t1;
    const d = Math.abs(x - x0) / Math.max(12, 1.45 * u);
    return {
      x,
      walk: moving ? d * 1.45 : 0,
      view: moving ? 'side' : 'q',
      flip: x1 < x0,
      dy: moving ? -Math.abs(Math.sin(d * Math.PI)) * 0.55 : 0,
      rot: moving ? (x1 < x0 ? -0.09 : 0.09) : 0,
      smear: moving ? 0.35 * Math.sin(k * Math.PI) : 0
    };
  }

  function shakeXY(t, amp = 8) {
    return [
      (hash(Math.floor(t * 60)) - 0.5) * 2 * amp,
      (hash(Math.floor(t * 60) + 99) - 0.5) * 2 * amp
    ];
  }

  // ---------- Color Helpers ----------
  function hexToRgb(hex) {
    const h = String(hex || '#000000').replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgba(hex, alpha = 1) {
    if (String(hex).startsWith('rgba') || String(hex).startsWith('rgb')) return hex;
    const [r, g, b] = hexToRgb(hex);
    return `rgba(${r},${g},${b},${clamp(alpha, 0, 1)})`;
  }
  function mixCol(c1, c2, k) {
    const [r1, g1, b1] = hexToRgb(c1);
    const [r2, g2, b2] = hexToRgb(c2);
    const r = Math.round(lerp(r1, r2, k));
    const g = Math.round(lerp(g1, g2, k));
    const b = Math.round(lerp(b1, b2, k));
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }

  // ---------- Polygon & Curve Geometry (`ClaudeAnimationBase` / `PDoomVideo`) ----------
  function rectPts(x, y, w, h, j = 1.5) {
    return [
      [x + jit(j), y + jit(j)],
      [x + w + jit(j), y + jit(j)],
      [x + w + jit(j), y + h + jit(j)],
      [x + jit(j), y + h + jit(j)]
    ];
  }

  function ellPts(cx, cy, rx, ry = rx, n = 20, j = 1.2, rot = 0) {
    const c = Math.cos(rot), s = Math.sin(rot), out = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const x = Math.cos(a) * rx + jit(j), y = Math.sin(a) * ry + jit(j);
      out.push([cx + x * c - y * s, cy + x * s + y * c]);
    }
    return out;
  }

  function rrPts(x, y, w, h, r = 8, j = 1) {
    r = Math.min(r, w / 2, h / 2);
    const cs = [[x + w - r, y + r, -Math.PI / 2, 0], [x + w - r, y + h - r, 0, Math.PI / 2],
      [x + r, y + h - r, Math.PI / 2, Math.PI], [x + r, y + r, Math.PI, Math.PI * 1.5]];
    const out = [];
    for (const [cx, cy, a0, a1] of cs) {
      for (let i = 0; i <= 3; i++) {
        const a = lerp(a0, a1, i / 3);
        out.push([cx + Math.cos(a) * r + jit(j), cy + Math.sin(a) * r + jit(j)]);
      }
    }
    return out;
  }

  function starPts(cx, cy, r, ir = 0.42, n = 4, rot = 0) {
    const out = [];
    for (let i = 0; i < n * 2; i++) {
      const a = rot + (i / (n * 2)) * TAU, d = i % 2 ? r * ir : r;
      out.push([cx + Math.cos(a) * d + jit(0.5), cy + Math.sin(a) * d + jit(0.5)]);
    }
    return out;
  }

  function heartPts(cx, cy, s) {
    const out = [];
    for (let i = 0; i < 16; i++) {
      const t = (i / 16) * TAU;
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      out.push([cx + x * s * 0.06, cy + y * s * 0.06]);
    }
    return out;
  }

  function through(pts, steps = 5) {
    const n = pts.length;
    if (n < 3) return pts;
    const T = pts.map((_, i) => {
      if (i === 0) return [pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]];
      if (i === n - 1) return [pts[n - 1][0] - pts[n - 2][0], pts[n - 1][1] - pts[n - 2][1]];
      return [(pts[i + 1][0] - pts[i - 1][0]) / 2, (pts[i + 1][1] - pts[i - 1][1]) / 2];
    });
    const out = [];
    for (let i = 0; i < n - 1; i++) {
      const p0 = pts[i], p1 = pts[i + 1], m0 = T[i], m1 = T[i + 1];
      for (let s = 0; s < steps; s++) {
        const t = s / steps, t2 = t * t, t3 = t2 * t;
        const h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t;
        const h01 = -2 * t3 + 3 * t2, h11 = t3 - t2;
        out.push([
          h00 * p0[0] + h10 * m0[0] + h01 * p1[0] + h11 * m1[0],
          h00 * p0[1] + h10 * m0[1] + h01 * p1[1] + h11 * m1[1]
        ]);
      }
    }
    out.push(pts[n - 1]);
    return out;
  }

  function ribbon(spine, w0, w1 = w0, steps = 5) {
    const sm = spine.length >= 3 ? through(spine, steps) : spine;
    const L = [], R = [], n = sm.length;
    for (let i = 0; i < n; i++) {
      const a = sm[Math.max(0, i - 1)], b = sm[Math.min(n - 1, i + 1)];
      const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
      const nx = -dy / l, ny = dx / l, hw = lerp(w0, w1, i / Math.max(1, n - 1)) * 0.5;
      L.push([sm[i][0] + nx * hw, sm[i][1] + ny * hw]);
      R.push([sm[i][0] - nx * hw, sm[i][1] - ny * hw]);
    }
    return [...L, ...R.reverse()];
  }

  function partial(pts, k) {
    if (k >= 1) return pts;
    if (k <= 0 || pts.length < 2) return null;
    const lens = [0];
    let tot = 0;
    for (let i = 1; i < pts.length; i++) {
      tot += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      lens.push(tot);
    }
    const target = tot * k, out = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      if (lens[i] <= target) out.push(pts[i]);
      else {
        const f = (target - lens[i - 1]) / Math.max(1e-6, lens[i] - lens[i - 1]);
        out.push([lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)]);
        break;
      }
    }
    return out.length >= 2 ? out : null;
  }

  // ---------- Style Management & Multi-Style Director Schedule ----------
  let ACTIVE_STYLE = 'watercolor';
  function setActiveStyle(st) { ACTIVE_STYLE = st || 'watercolor'; }
  function getActiveStyle() { return ACTIVE_STYLE; }

  const DIRECTOR_SCHEDULE = [
    [0.0, 'pixel'],
    [4.8, 'watercolor'],
    [8.5, 'pixel'],
    [13.8, 'watercolor'],
    [22.4, 'ukiyoe'],
    [27.5, 'pixel'],
    [34.6, 'watercolor'],
    [42.5, 'risograph'],
    [48.8, 'pixel'],
    [56.2, 'watercolor'],
    [64.8, 'neon'],
    [71.8, 'pixel'],
    [76.6, 'watercolor']
  ];

  function resolveStyle(requested, t = 0) {
    if (!requested || requested === 'director' || requested === 'multistyle') {
      let cur = 'pixel';
      for (const [t0, st] of DIRECTOR_SCHEDULE) {
        if (t >= t0) cur = st;
      }
      return cur;
    }
    return requested;
  }

  // ---------- `paint()` & `inkLine()` (Hand-Painted Watercolor + Boiling Ink + 16-Bit Pixel) ----------
  function tracePolygon(ctx, pts, curv = 0, snap = 0) {
    if (!pts || pts.length < 2) return;
    const S = v => (snap > 0 ? Math.round(v / snap) * snap : v);
    ctx.beginPath();
    if (curv > 0 && pts.length >= 4 && !snap) {
      const mx0 = (pts[pts.length - 1][0] + pts[0][0]) / 2;
      const my0 = (pts[pts.length - 1][1] + pts[0][1]) / 2;
      ctx.moveTo(mx0, my0);
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const next = pts[(i + 1) % pts.length];
        const mx = (p[0] + next[0]) / 2, my = (p[1] + next[1]) / 2;
        ctx.quadraticCurveTo(p[0], p[1], mx, my);
      }
    } else {
      ctx.moveTo(S(pts[0][0]), S(pts[0][1]));
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(S(pts[i][0]), S(pts[i][1]));
      }
    }
    ctx.closePath();
  }

  function paint(ctx, pts, o = {}) {
    if (!pts || pts.length < 3) return;
    const st = ACTIVE_STYLE;
    const snap = st === 'pixel' ? 3 : 0;

    ctx.save();
    // 1. Base wash (`o.wash`)
    if (o.wash) {
      const washOp = (o.washOp ?? 230) / 255;
      let col = o.wash;
      if (st === 'neon' && col === PAL.paper) col = '#0F172A';
      tracePolygon(ctx, pts, o.curv || 0, snap);
      ctx.fillStyle = rgba(col, washOp);
      ctx.fill();
    }

    // 2. Textured watercolor / bleed fill (`o.fill`)
    if (o.fill) {
      const fillAlpha = clamp(((o.fillOp ?? 95) / 255) * 0.85, 0, 1);
      // Offset inner wash for organic hand-painted pigment depth
      const offPts = pts.map(([px, py], idx) => [
        px + (idx % 2 ? 1.2 : -0.8),
        py + (idx % 3 ? 1.4 : -0.6)
      ]);
      tracePolygon(ctx, offPts, o.curv || 0, snap);
      ctx.fillStyle = rgba(o.fill, fillAlpha);
      ctx.fill();

      // Soft watercolor edge bloom in watercolor/ukiyoe mode
      if ((st === 'watercolor' || st === 'ukiyoe') && (o.tex ?? 0.4) > 0.2) {
        let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
        for (const [px, py] of pts) {
          if (px < x0) x0 = px; if (px > x1) x1 = px;
          if (py < y0) y0 = py; if (py > y1) y1 = py;
        }
        const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
        const rx = (x1 - x0) * 0.42, ry = (y1 - y0) * 0.42;
        if (rx > 6 && ry > 6) {
          ctx.save();
          tracePolygon(ctx, pts, o.curv || 0, 0);
          ctx.clip();
          const grad = ctx.createRadialGradient(
            cx - rx * 0.2, cy - ry * 0.2, Math.min(rx, ry) * 0.1,
            cx, cy, Math.max(rx, ry) * 1.15
          );
          grad.addColorStop(0, rgba(o.wash || PAL.cream, 0.18));
          grad.addColorStop(0.7, rgba(o.fill, fillAlpha * 0.45));
          grad.addColorStop(1, rgba(mixCol(o.fill, PAL.ink, 0.25), fillAlpha * 0.75));
          ctx.fillStyle = grad;
          ctx.fillRect(x0 - 4, y0 - 4, x1 - x0 + 8, y1 - y0 + 8);
          ctx.restore();
        }
      }
    }

    // 3. Ink outline (`o.ink !== null`)
    if (o.ink !== null) {
      const sw = (o.sw ?? 1) * (st === 'pixel' ? 2.2 : st === 'ukiyoe' ? 2.4 : 1.75);
      let inkCol = o.ink || PAL.ink;
      if (st === 'neon' && inkCol === PAL.ink) {
        inkCol = '#00F5D4';
        ctx.shadowColor = '#00F5D4';
        ctx.shadowBlur = 8;
      }
      tracePolygon(ctx, pts, o.curv || 0, snap);
      ctx.strokeStyle = inkCol;
      ctx.lineWidth = sw;
      ctx.lineJoin = st === 'pixel' ? 'miter' : 'round';
      ctx.lineCap = st === 'pixel' ? 'square' : 'round';
      ctx.stroke();

      if ((st === 'watercolor' || st === 'ukiyoe') && sw > 1.1) {
        ctx.strokeStyle = rgba(inkCol, 0.35);
        ctx.lineWidth = sw * 1.35;
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function inkLine(ctx, pts, sw = 1, col = PAL.ink, br = 'ink', curv = 0.5) {
    if (!pts || pts.length < 2) return;
    const st = ACTIVE_STYLE;
    const snap = st === 'pixel' ? 3 : 0;
    const S = v => (snap > 0 ? Math.round(v / snap) * snap : v);

    ctx.save();
    let strokeCol = col || PAL.ink;
    if (st === 'neon' && strokeCol === PAL.ink) {
      strokeCol = '#00F5D4';
      ctx.shadowColor = '#00F5D4';
      ctx.shadowBlur = 6;
    }
    ctx.strokeStyle = strokeCol;
    ctx.lineWidth = sw * (st === 'pixel' ? 2.1 : br === 'inkfine' ? 1.3 : 1.85);
    ctx.lineCap = st === 'pixel' ? 'square' : 'round';
    ctx.lineJoin = st === 'pixel' ? 'miter' : 'round';

    ctx.beginPath();
    ctx.moveTo(S(pts[0][0]), S(pts[0][1]));
    if (curv > 0 && pts.length >= 3 && !snap) {
      for (let i = 1; i < pts.length - 1; i++) {
        const mx = (pts[i][0] + pts[i + 1][0]) / 2;
        const my = (pts[i][1] + pts[i + 1][1]) / 2;
        ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
      }
      const last = pts[pts.length - 1];
      ctx.lineTo(last[0], last[1]);
    } else {
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(S(pts[i][0]), S(pts[i][1]));
      }
    }
    ctx.stroke();
    ctx.restore();
  }

  // ---------- Camera (`camBegin`, `camEnd`, `toScreen`) ----------
  let CAM = null, LAST_CAM = null;
  function camBegin(ctx, cx = W / 2, cy = H / 2, zoom = 1, rot = 0) {
    ctx.save();
    ctx.translate(W / 2, H / 2);
    if (rot) ctx.rotate(rot);
    if (zoom !== 1) ctx.scale(zoom, zoom);
    ctx.translate(-cx, -cy);
    CAM = LAST_CAM = { cx, cy, zoom, rot };
  }
  function camEnd(ctx) {
    ctx.restore();
    CAM = null;
  }
  function toScreen(x, y, cam = CAM) {
    if (!cam) return [x, y];
    const c = Math.cos(cam.rot), s = Math.sin(cam.rot);
    const dx = (x - cam.cx) * cam.zoom, dy = (y - cam.cy) * cam.zoom;
    return [W / 2 + dx * c - dy * s, H / 2 + dx * s + dy * c];
  }

  // ---------- Lighting, Lettering, SFX, Iris & Brush Wipes ----------
  function glow(ctx, x, y, r, col = PAL.gold, alpha = 0.55) {
    ctx.save();
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(col, alpha));
    g.addColorStop(0.55, rgba(col, alpha * 0.35));
    g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function flash(ctx, alpha = 0.35, col = PAL.cream) {
    if (alpha <= 0.01) return;
    ctx.save();
    ctx.fillStyle = rgba(col, clamp(alpha, 0, 1));
    ctx.fillRect(-100, -100, W + 200, H + 200);
    ctx.restore();
  }

  function letter(ctx, txt, x, y, size = 28, color = PAL.cream, o = {}) {
    const k = o.pop != null ? backOut(o.pop) : 1;
    if (k <= 0.01) return;
    ctx.save();
    ctx.translate(x, y);
    if (o.rot) ctx.rotate(o.rot);
    ctx.scale(k, k);
    ctx.globalAlpha = o.alpha ?? 1;
    ctx.font = o.font || `900 ${size}px "ZCOOLKuaiLe", "NotoSansSC", sans-serif`;
    ctx.textAlign = o.align || 'center';
    ctx.textBaseline = 'middle';
    if (o.stroke !== false) {
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(3, size * 0.14);
      ctx.strokeStyle = o.stroke || PAL.ink;
      ctx.strokeText(txt, 0, 0);
    }
    if (o.ink !== false) {
      ctx.fillStyle = PAL.ink;
      ctx.fillText(txt, size * 0.04, size * 0.05);
    }
    ctx.fillStyle = color;
    ctx.fillText(txt, 0, 0);
    ctx.restore();
  }

  function sfx(ctx, txt, x, y, size, color, age, o = {}) {
    const life = o.life ?? 1.1;
    if (age < 0 || age > life) return;
    letter(ctx, txt, x, y, size, color, {
      pop: age * 5,
      rot: (o.rot ?? -0.08) + Math.sin(age * 20) * 0.03 * (1 - age / life),
      alpha: 1 - seg(age, life - 0.25, life),
      ...o
    });
  }

  function irisShape(ctx, pts, col = PAL.ink, far = 2600) {
    if (!pts || pts.length < 3) return;
    ctx.save();
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.rect(-far, -far, W + far * 2, H + far * 2);
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    ctx.fill('evenodd');
    ctx.restore();
  }

  function iris(ctx, cx, cy, r, col = PAL.ink) {
    if (r < 3) {
      ctx.save();
      ctx.fillStyle = col;
      ctx.fillRect(-60, -60, W + 120, H + 120);
      ctx.restore();
    } else {
      irisShape(ctx, ellPts(cx, cy, r, r, 36, 2), col);
    }
  }

  function brushWipe(ctx, p, cols = [PAL.indigo, PAL.whaleBlue, PAL.teal], dir = 1) {
    p = clamp(p, 0, 1);
    const strength = p < 0.5 ? easeIn(p * 2) : easeOut((1 - p) * 2);
    if (strength <= 0.01) return;

    if (ACTIVE_STYLE === 'pixel') {
      const block = 16;
      ctx.save();
      ctx.fillStyle = cols[0] || PAL.whaleNavy;
      for (let y = 0; y < H; y += block) {
        const by = (y / block) & 3;
        for (let x = 0; x < W; x += block) {
          const bx = (x / block) & 3;
          if ((BAYER4[by][bx] + 0.5) / 16 < strength * 0.92) {
            ctx.fillRect(x, y, block, block);
          }
        }
      }
      ctx.restore();
      return;
    }

    const n = 5, bh = H / n + 48;
    for (let i = 0; i < n; i++) {
      boilSeed('wipe' + i);
      const d = (i % 2 ? -1 : 1) * dir;
      const delay = i * 0.035;
      let x0, x1;
      if (p < 0.5) {
        const k = easeIn(clamp((p - delay) / (0.5 - delay)));
        x0 = d > 0 ? -120 : lerp(W + 120, -120, k);
        x1 = d > 0 ? lerp(-120, W + 120, k) : W + 120;
      } else {
        const k = easeOut(clamp((p - 0.5 - delay) / (0.5 - delay)));
        x0 = d > 0 ? lerp(-120, W + 120, k) : -120;
        x1 = d > 0 ? W + 120 : lerp(W + 120, -120, k);
      }
      if (Math.abs(x1 - x0) < 8) continue;
      const y = i * (H / n) - 24;
      const col = cols[i % cols.length];
      paint(ctx, rectPts(Math.min(x0, x1), y, Math.abs(x1 - x0), bh, 8), {
        wash: col,
        fill: mixCol(col, PAL.ink, 0.25),
        fillOp: 160,
        ink: PAL.ink,
        sw: 1.2
      });
    }
  }

  // Offscreen buffer for true 480x270 16-bit pixel-art quantization in 'pixel' mode
  const PIX_W = 480, PIX_H = 270;
  let _pixBuf = null, _pixCtx = null;
  function getPixBuf() {
    if (_pixBuf) return { buf: _pixBuf, bctx: _pixCtx };
    if (typeof document !== 'undefined' && document.createElement) {
      _pixBuf = document.createElement('canvas');
      _pixBuf.width = PIX_W;
      _pixBuf.height = PIX_H;
      _pixCtx = _pixBuf.getContext('2d');
    } else if (typeof require !== 'undefined') {
      try {
        const { createCanvas } = require('/tmp/node_render/node_modules/@napi-rs/canvas');
        _pixBuf = createCanvas(PIX_W, PIX_H);
        _pixCtx = _pixBuf.getContext('2d');
      } catch (e) {}
    }
    return { buf: _pixBuf, bctx: _pixCtx };
  }

  function applyMediumOverlay(ctx, style = ACTIVE_STYLE) {
    ctx.save();
    if (style === 'pixel') {
      const { buf, bctx } = getPixBuf();
      if (buf && bctx && ctx.canvas) {
        bctx.imageSmoothingEnabled = false;
        bctx.clearRect(0, 0, PIX_W, PIX_H);
        bctx.drawImage(ctx.canvas, 0, 0, W, H, 0, 0, PIX_W, PIX_H);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(buf, 0, 0, PIX_W, PIX_H, 0, 0, W, H);
      }
      ctx.fillStyle = 'rgba(0, 0, 0, 0.10)';
      for (let y = 0; y < H; y += 3) {
        ctx.fillRect(0, y, W, 1);
      }
    } else if (style === 'watercolor' || style === 'ukiyoe' || style === 'risograph') {
      ctx.fillStyle = style === 'ukiyoe' ? 'rgba(245, 225, 185, 0.08)' : 'rgba(255, 244, 224, 0.05)';
      ctx.fillRect(0, 0, W, H);
      const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.65);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(32,20,10,0.26)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    } else if (style === 'neon') {
      ctx.fillStyle = 'rgba(0, 245, 212, 0.045)';
      for (let y = 0; y < H; y += 4) {
        ctx.fillRect(0, y, W, 1);
      }
    }
    ctx.restore();
  }

  // Ported directly from tuzhechen2005/opus-video-skills (xz_set.js):
  // Theatre curtains (k = 0 open -> 1 closed at centre)
  function curtains(ctx, k, t = 0) {
    if (k <= 0.01) return;
    boilSeed('curtain');
    const red = '#A3283A', dk = '#6E1726', w = W / 2 + 60, off = (1 - ease(k)) * (w + 30);
    for (const s of [-1, 1]) {
      const x0 = s < 0 ? -60 - off : W / 2 + off;
      const sway = Math.sin(t * 3) * 8 * (1 - k);
      const P = [[x0, -30], [x0 + w, -30], [x0 + w + (s < 0 ? sway : -sway), H + 30], [x0, H + 30]];
      paint(ctx, P, { wash: red, fill: dk, fillOp: 90, tex: 0.7, ink: PAL.ink, sw: 1.2 });
      for (let i = 1; i < 6; i++) {
        const fx = x0 + (i * w) / 6;
        inkLine(ctx, [[fx, -30], [fx + 5 * Math.sin(i + t), H / 2], [fx, H + 30]], 1.2, dk, 'ink', 0.5);
      }
    }
    const vy = -120 * (1 - ease(Math.min(1, k * 2)));
    ctx.save();
    ctx.translate(0, vy);
    paint(ctx, [[-60, -30], [W + 60, -30], [W + 60, 80], [W * 0.75, 105], [W / 2, 80], [W * 0.25, 105], [-60, 80]], {
      wash: dk, fill: red, fillOp: 90, ink: PAL.ink, sw: 1.2, curv: 0.3
    });
    inkLine(ctx, [[-60, 72], [W / 2, 92], [W + 60, 72]], 2.0, '#E8AA38', 'ink', 0.5);
    ctx.restore();
  }

  // Spotlight darkness everywhere outside a circle of radius r at opacity a (0..1)
  function spotDark(ctx, cx, cy, r, a, col = '#141628') {
    if (a <= 0.01) return;
    ctx.save();
    ctx.fillStyle = rgba(col, clamp(a, 0, 1));
    ctx.beginPath();
    ctx.rect(-60, -60, W + 120, H + 120);
    ctx.arc(cx, cy, Math.max(2, r), 0, TAU, true);
    ctx.fill();
    ctx.restore();
  }

  // Smoke / cloud billow wipe (p: 0 -> 0.5 covers frame, 0.5 -> 1.0 clears)
  function smokeWipe(ctx, p, col = '#E4DCD8') {
    if (p <= 0 || p >= 1) return;
    const cover = p < 0.5 ? easeOut(p * 2) : 1 - ease((p - 0.5) * 2);
    for (let i = 0; i < 14; i++) {
      boilSeed('sw' + i);
      const x = (i % 5) * 320 - 20 + 40 * hash(i);
      const y = Math.floor(i / 5) * 280 + 40 * hash(i + 7) + (p > 0.5 ? -(p - 0.5) * 340 : 0);
      const r = (85 + 260 * cover) * (0.8 + 0.4 * hash(i + 3)) * clamp(cover * 2.5 - i * 0.04 + 0.2);
      if (r < 8) continue;
      paint(ctx, ellPts(x, y, r, r * 0.82, 18, 5), {
        wash: col,
        washOp: Math.round(255 * clamp(cover * 1.6)),
        fill: mixCol(col, '#9C8EA8', 0.4),
        fillOp: 70,
        ink: cover < 0.85 ? PAL.ink : null,
        sw: 0.9
      });
    }
  }

  // Old-film memory scratches & dust (ported from opus-video-skills xz_set.js)
  function filmFX(ctx, t) {
    boilSeed('film');
    const f = Math.floor(t * 12);
    for (let i = 0; i < 2; i++) {
      if (hash(f * 3 + i) < 0.55) {
        const x = hash(f * 7 + i) * W;
        inkLine(ctx, [[x, -10], [x + 6 * (hash(f + i) - 0.5), H / 2], [x + 3, H + 10]], 0.7, '#FFF3D6', 'ink', 0.3);
      }
    }
    for (let i = 0; i < 5; i++) {
      const x = hash(f * 11 + i) * W, y = hash(f * 13 + i) * H;
      paint(ctx, ellPts(x, y, 2 + 3 * hash(i + f), 2 + 2 * hash(i), 6), { wash: '#5E4838', washOp: 150, ink: null });
    }
    spotDark(ctx, W / 2, H / 2, 740, 0.22, '#6E5034');
  }

  const CORE = {
    W, H, FPS, BOIL, DURATION, BPM, BEAT, OFF, TAU, PAL, STYLES, BAYER4,
    clamp, lerp, frac, seg, ease, easeIn, easeOut, backOut, elasticOut, wob, hash,
    randomSeed, random, reseedBoil, boilSeed, jit,
    bpOf, beatN, energyAt, bassAt, voiceAt, beatPulse, hitPulse, pulse, pulse2,
    kf, spring, ring, onTwos, arcPt, jump, take, stroll, runTo, shakeXY,
    hexToRgb, rgba, mixCol,
    rectPts, ellPts, rrPts, starPts, heartPts, through, ribbon, partial,
    setActiveStyle, getActiveStyle, resolveStyle,
    paint, inkLine,
    camBegin, camEnd, toScreen,
    glow, flash, letter, sfx, irisShape, iris, brushWipe, curtains, spotDark, smokeWipe, filmFX, applyMediumOverlay
  };

  root.CORE = CORE;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CORE;
  }
})(typeof window !== 'undefined' ? window : globalThis);
