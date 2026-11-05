// src/props.js — Stage, Laboratory, and Set Builders for DeepSeek Whale Girl MV
// Modeled directly on JohnHeibel/PDoomVideo (src/ch/c01_lab.js, c02_chorus1.js) & ClaudeAnimationBase (src/scenes/demo.js).

(function (root) {
  const CORE = root.CORE || (typeof require !== 'undefined' ? require('./core.js') : {});
  const {
    W, H, TAU, PAL, clamp, lerp, wob, hash, boilSeed, jit, pulse,
    rectPts, ellPts, rrPts, starPts, ribbon,
    paint, inkLine, glow
  } = CORE;

  const WOOD = '#7B4B2A';
  const WOOD_DK = '#4E2D18';
  const CURTAIN = '#9E1B32';
  const CURTAIN_DK = '#640D1E';

  // ---------- 1. Theatrical Stage Backdrop & Footlights (`stageBack`) ----------
  function stageBack(ctx, t, o = {}) {
    const floorY = o.floorY || 550;
    const bg = o.bg || '#141D3B';

    boilSeed('stageBack');
    paint(ctx, rectPts(-80, -80, W + 160, floorY + 90, 2), {
      wash: bg, fill: PAL.night, fillOp: 120, ink: null
    });

    // Rotating sunburst rays from stage center
    if (o.sunburst) {
      const cx = W / 2, cy = floorY;
      for (let i = 0; i < 14; i++) {
        const a0 = -Math.PI + (i / 14) * Math.PI + Math.sin(t * 0.5) * 0.03;
        const a1 = a0 + Math.PI / 28;
        paint(ctx, [
          [cx, cy],
          [cx + Math.cos(a0) * 1100, cy + Math.sin(a0) * 1100],
          [cx + Math.cos(a1) * 1100, cy + Math.sin(a1) * 1100]
        ], { wash: PAL.gold, washOp: 28, ink: null });
      }
    }

    // Overhead spotlight cones (`o.spots = [[x, color], ...]`)
    if (o.spots) {
      for (const [sx, col] of o.spots) {
        paint(ctx, [[sx - 35, -60], [sx + 35, -60], [sx + 210, floorY + 20], [sx - 210, floorY + 20]], {
          wash: col || PAL.cream, washOp: 38, ink: null
        });
      }
    }

    // Wooden Plank Stage Floor with perspective plank lines & warm footlights
    paint(ctx, rectPts(-80, floorY, W + 160, H - floorY + 100, 2), {
      wash: WOOD, fill: WOOD_DK, fillOp: 110, ink: PAL.ink, sw: 1.4
    });
    for (let i = -5; i <= 5; i++) {
      const px = W / 2 + i * 115;
      inkLine(ctx, [[px, floorY], [W / 2 + i * 195, H + 40]], 0.8, WOOD_DK, 'inkfine', 0);
    }
    for (let i = 0; i < 7; i++) {
      const lx = 160 + i * 160;
      glow(ctx, lx, floorY + 18, 42, PAL.gold, 0.35);
      paint(ctx, ellPts(lx, floorY + 22, 16, 8, 10), { wash: PAL.gold, ink: PAL.ink, sw: 0.8 });
    }
  }

  // ---------- 2. Velvet Theater Curtains (`stageFront`) ----------
  function stageFront(ctx, t, o = {}) {
    const k = clamp(o.curtain ?? 0, 0, 1); // 0 = open on wings, 1 = closed across center
    boilSeed('stageFront');

    const wWing = lerp(115, W / 2 + 30, k);
    for (const side of [-1, 1]) {
      const x0 = side < 0 ? -40 : W + 40 - wWing;
      paint(ctx, rectPts(x0, -40, wWing, H + 80, 3), {
        wash: CURTAIN, fill: CURTAIN_DK, fillOp: 130, ink: PAL.ink, sw: 1.5
      });
      // Vertical velvet pleats
      for (let p = 1; p <= 3; p++) {
        const px = x0 + (wWing * p) / 4;
        inkLine(ctx, [[px, -20], [px + Math.sin(t * 2 + p) * 6, H + 20]], 1.1, CURTAIN_DK, 'ink', 0.4);
      }
      // Gold tassel tie-back
      const tx = side < 0 ? x0 + wWing - 12 : x0 + 12;
      paint(ctx, ellPts(tx, 410, 14, 22, 10), { wash: PAL.gold, ink: PAL.ink, sw: 0.9 });
    }

    // Top scalloped pelmet valance
    for (let i = 0; i < 9; i++) {
      const vx = i * (W / 8);
      paint(ctx, ellPts(vx, -8, 92, 54, 14), {
        wash: CURTAIN, fill: CURTAIN_DK, fillOp: 110, ink: PAL.ink, sw: 1.2
      });
    }
  }

  // ---------- 3. Interior Room Wall, Floor, Porthole, Shelf, Desk, Lamp, Monitor, Mug & Chair ----------
  function wall(ctx, col = '#1C2852') {
    boilSeed('wall');
    paint(ctx, rectPts(-120, -120, W + 240, H + 240, 2), {
      wash: col, fill: PAL.night, fillOp: 95, ink: null
    });
  }

  function floorBand(ctx, y = 540, col = '#251E3E') {
    boilSeed('floorBand');
    paint(ctx, rectPts(-120, y, W + 240, H - y + 140, 2), {
      wash: col, fill: PAL.ink, fillOp: 85, ink: PAL.ink, sw: 1.4
    });
  }

  function windowPorthole(ctx, cx, cy, r = 85, t = 0, night = true) {
    boilSeed('porthole' + cx);
    paint(ctx, ellPts(cx, cy, r + 14, r + 14, 24), { wash: '#64748B', fill: '#334155', fillOp: 120, ink: PAL.ink, sw: 1.4 });
    paint(ctx, ellPts(cx, cy, r, r, 24), { wash: night ? '#0D3B66' : '#38BDF8', fill: '#061A3A', fillOp: 110, ink: PAL.ink, sw: 1.2 });
    // Swimming deep-sea fish silhouette inside porthole
    const fx = cx + Math.sin(t * 1.4) * (r * 0.45);
    const fy = cy + Math.cos(t * 2.1) * (r * 0.22);
    paint(ctx, ellPts(fx, fy, 18, 9, 10), { wash: PAL.whaleCyan, washOp: 140, ink: null });
    paint(ctx, [[fx + 14, fy], [fx + 26, fy - 8], [fx + 26, fy + 8]], { wash: PAL.whaleCyan, washOp: 140, ink: null });
    // Brass rivets around rim
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      paint(ctx, ellPts(cx + Math.cos(a) * (r + 7), cy + Math.sin(a) * (r + 7), 3.5, 3.5, 6), { wash: PAL.gold, ink: PAL.ink, sw: 0.5 });
    }
  }

  function shelf(ctx, x, y, w = 240, seed = 1) {
    boilSeed('shelf' + seed);
    paint(ctx, rectPts(x, y, w, 14, 1.5), { wash: WOOD, fill: WOOD_DK, fillOp: 100, ink: PAL.ink, sw: 1.1 });
    const cols = [PAL.rose, PAL.whaleCyan, PAL.gold, PAL.sap, PAL.violet];
    for (let i = 0; i < 4; i++) {
      const bx = x + 18 + i * 52;
      const bh = 34 + ((seed + i * 7) % 22);
      paint(ctx, rrPts(bx, y - bh, 28, bh, 4, 1), {
        wash: cols[(seed + i) % cols.length], ink: PAL.ink, sw: 0.9
      });
    }
  }

  function desk(ctx, y = 500, x0 = -100, x1 = W + 100) {
    boilSeed('desk');
    paint(ctx, rectPts(x0, y, x1 - x0, 26, 2), { wash: WOOD, fill: WOOD_DK, fillOp: 90, ink: PAL.ink, sw: 1.4 });
    paint(ctx, rectPts(x0, y + 26, x1 - x0, H - y + 100, 2), { wash: WOOD_DK, fill: '#2B180D', fillOp: 120, ink: PAL.ink, sw: 1.2 });
  }

  function lamp(ctx, x, y, sc = 1, on = 1) {
    boilSeed('lamp' + x);
    const u = 42 * sc;
    if (on > 0) {
      paint(ctx, [[x - 0.6 * u, y - 2.6 * u], [x + 0.6 * u, y - 2.6 * u], [x + 2.4 * u, y], [x - 2.4 * u, y]], {
        wash: PAL.gold, washOp: 45 * on, ink: null
      });
    }
    paint(ctx, ellPts(x, y, 0.85 * u, 0.24 * u, 12), { wash: '#475569', ink: PAL.ink, sw: 1.0 });
    inkLine(ctx, [[x, y - 0.1 * u], [x - 0.55 * u, y - 1.65 * u], [x - 0.1 * u, y - 2.85 * u]], 2.2, '#64748B', 'ink', 0);
    paint(ctx, [[x - 0.85 * u, y - 2.35 * u], [x - 0.1 * u, y - 3.05 * u], [x + 0.65 * u, y - 2.35 * u]], {
      wash: PAL.gold, fill: PAL.ochre, fillOp: 100, ink: PAL.ink, sw: 1.0
    });
  }

  function monitor(ctx, cx, cy, w = 360, h = 290, o = {}) {
    boilSeed('monitor');
    const x = cx - w / 2, y = cy - h / 2;
    // Stand
    paint(ctx, rectPts(cx - 42, y + h - 10, 84, 38, 1), { wash: '#94A3B8', ink: PAL.ink, sw: 1.1 });
    paint(ctx, rrPts(cx - 88, y + h + 18, 176, 18, 6, 1), { wash: '#64748B', ink: PAL.ink, sw: 1.1 });
    // Retro CRT Antenna Ears on top of monitor
    inkLine(ctx, [[cx - 35, y + 6], [cx - 75, y - 42]], 2.0, PAL.ink, 'ink', 0);
    inkLine(ctx, [[cx + 35, y + 6], [cx + 75, y - 42]], 2.0, PAL.ink, 'ink', 0);
    // Bezel
    paint(ctx, rrPts(x, y, w, h, 18, 2), { wash: '#E2D9C8', fill: '#C5B8A1', fillOp: 110, ink: PAL.ink, sw: 1.5 });
    // Screen inner area
    const sx = x + 26, sy = y + 24, sw = w - 52, sh = h - 54;
    paint(ctx, rrPts(sx, sy, sw, sh, 12, 1.5), { wash: '#12355B', fill: '#0A1E38', fillOp: 140, ink: PAL.ink, sw: 1.2 });
    return { x: sx, y: sy, w: sw, h: sh, cx, cy };
  }

  function glass(ctx, s, t = 0) {
    // CRT glass glare & scanline reflection drawn over whatever is inside the monitor
    inkLine(ctx, [[s.x + 18, s.y + 38], [s.x + 56, s.y + 14]], 2.2, '#FFFFFF', 'inkfine', 0);
    inkLine(ctx, [[s.x + 34, s.y + 52], [s.x + 68, s.y + 28]], 1.4, '#FFFFFF', 'inkfine', 0);
  }

  function mug(ctx, x, y, sc = 1, col = PAL.rose, rot = 0, steam = 1, t = 0) {
    boilSeed('mug' + Math.round(x) + Math.round(y));
    const u = 32 * sc;
    ctx.save();
    ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    paint(ctx, ellPts(0.55 * u, -0.55 * u, 0.32 * u, 0.34 * u, 10), { wash: null, ink: PAL.ink, sw: 1.2 });
    paint(ctx, rrPts(-0.55 * u, -1.1 * u, 1.1 * u, 1.1 * u, 4, 0.8), {
      wash: col, fill: PAL.ink, fillOp: 45, ink: PAL.ink, sw: 1.0
    });
    if (steam) {
      const sw = Math.sin(t * 5 + x) * 5;
      inkLine(ctx, [[-0.15 * u, -1.25 * u], [-0.15 * u + sw, -1.65 * u], [-0.15 * u - sw, -2.05 * u]], 0.85, PAL.cream, 'inkfine', 0.5);
    }
    ctx.restore();
  }

  function officeChair(ctx, x, y, u = 18, o = {}) {
    boilSeed('chair' + Math.round(x));
    const col = o.col || '#7C2D12';
    // Base & wheels
    inkLine(ctx, [[x, y - 2.2 * u], [x, y - 0.3 * u]], 2.6, '#475569', 'ink', 0);
    inkLine(ctx, [[x - 1.6 * u, y - 0.3 * u], [x + 1.6 * u, y - 0.3 * u]], 2.2, '#475569', 'ink', 0);
    // High winged backrest
    paint(ctx, rrPts(x - 2.1 * u, y - 7.8 * u, 4.2 * u, 5.6 * u, 14, 1.5), {
      wash: col, fill: PAL.ink, fillOp: 65, ink: PAL.ink, sw: 1.3
    });
  }

  // ---------- 4. Top Broadcast HUD (`drawTopHud` — faithful to 42868804351-1-192.mp4) ----------
  function drawTopHud(ctx, t, style = 'pixel') {
    ctx.save();
    // Top-left pill: `Day 0 · AI 接管中 | 鲸鱼娘运营日志`
    paint(ctx, rrPts(18, 16, 296, 36, 10, 0.6), {
      wash: '#0B1D3A', fill: '#152C5B', fillOp: 190, ink: '#48C8FF', sw: 1.0
    });
    ctx.font = 'bold 15px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillStyle = PAL.gold;
    ctx.fillText('Day 0 · AI 接管中', 32, 34);
    ctx.fillStyle = '#64748B';
    ctx.fillText('|', 154, 34);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('鲸鱼娘运营日志', 168, 34);

    // Top-right watermark: `本视频含 AI 生成内容`
    ctx.font = 'bold 14px "NotoSansSC", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(226, 232, 240, 0.72)';
    ctx.fillText('本视频含 AI 生成内容', W - 22, 32);
    ctx.restore();
  }

  const PROPS = {
    WOOD,
    WOOD_DK,
    CURTAIN,
    CURTAIN_DK,
    stageBack,
    stageFront,
    wall,
    floorBand,
    windowPorthole,
    shelf,
    desk,
    lamp,
    monitor,
    glass,
    mug,
    officeChair,
    drawTopHud
  };

  root.PROPS = PROPS;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = PROPS;
  }
})(typeof window !== 'undefined' ? window : globalThis);
