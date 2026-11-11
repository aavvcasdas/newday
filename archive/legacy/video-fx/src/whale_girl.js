// ============================================================================
// src/whale_girl.js — DeepSeek 深海鲸鱼娘 Character System
// Replicated from 42868804351-1-192.mp4 via:
//   Step 1 (先像素化): 100x102 pixel-grid anatomical extraction & 64-color palette
//   Step 2 (然后构造出来): Dual synchronized construction:
//     (A) Articulated 7-Bone Pixel-Grid Rig (tail, backHair, legL, legR, torso,
//         armR, head + dynamic face/hat/prop/smear transforms)
//     (B) Exact-Proportion Vector/Brush Multi-Polygon Anatomy using CORE.paint &
//         CORE.inkLine (for Watercolor/Ukiyo-e/Risograph/Neon styles & 5-view 3D
//         turnarounds: front, q, side, qback, back)
// Exports full ClaudeAnimationBase / PDoomVideo API:
//   whaleGirl, WhaleGirl, feel, emotions, move, turn, spinView,
//   EMO, HATS, VIEWS, EYES, MOUTHS, EMOTES
// ============================================================================

(function (root) {
  const CORE = root.CORE || (typeof require !== 'undefined' ? require('./core.js') : {});
  if (!root.WHALE_GIRL_PIXEL_RIG && typeof require === 'function') {
    try { require('./whale_girl_rig_data.js'); } catch (e) {}
  }
  const ACTIONS = root.WHALE_ACTIONS || (typeof require === 'function' ? (() => {
    try { return require('./whale_girl_actions.js'); } catch (e) { return null; }
  })() : null);

  const {
    TAU, PAL, clamp, lerp, seg, ease, easeOut, backOut, wob, hash,
    boilSeed, pulse, mixCol,
    rectPts, ellPts, rrPts, starPts, heartPts,
    getActiveStyle, paint, inkLine, letter
  } = CORE;

  // Exact Color Palette sampled from 42868804351-1-192.mp4
  const C = {
    ink:        '#121A34',
    hairDark:   '#1B428A',
    hairMain:   '#2558AA',
    hairMid:    '#387CD0',
    hairLight:  '#53AAE8',
    hairCyan:   '#72E2F7',
    hairGlow:   '#A2F2FF',
    haloArc:    '#6EB2F2',
    earDark:    '#1B2A4E',
    earMid:     '#2B4474',
    earFrill:   '#EEF5FC',
    skin:       '#FFEAE0',
    skinShadow: '#F4C5B4',
    blush:      '#FF8596',
    eyeLash:    '#111A36',
    eyeTop:     '#172C60',
    eyeMid:     '#2A62BE',
    eyeBot:     '#6CC0FA',
    eyePupil:   '#0F1E46',
    dressDark:  '#1A2240',
    dressMid:   '#28355E',
    dressEdge:  '#3A4E82',
    apronWhite: '#FFFFFF',
    apronShade: '#D7E0F0',
    whaleLogo:  '#2563EB',
    bowBlue:    '#4BAEE8',
    bowBlueHi:  '#82CEF8',
    gold:       '#E2B044',
    goldDark:   '#B88424',
    tailDark:   '#22355C',
    tailMid:    '#365284',
    tailLight:  '#587CB2',
    tailBelly:  '#9BB4DA',
    shoeNavy:   '#17203A'
  };

  const VIEWS = ['front', 'q', 'side', 'qback', 'back'];
  const VIEW_VX = { front: 0, q: 0.42, side: 0.85, qback: 1.05, back: 0 };

  // ==========================================================================
  // Modular Eyes (`EYES`) — Compatible with cast.js & 42868804351-1-192.mp4
  // ==========================================================================
  const EYES = {
    open(ctx, ex, ey, u, sc = 1, o = {}, isRight = false) {
      const rx = 0.30 * u * sc, ry = 0.34 * u * sc;
      const gx = (o.lookX || 0) * 0.08 * u;
      const gy = (o.lookY || 0) * 0.06 * u;
      // White sclera
      paint(ctx, ellPts(ex, ey, rx, ry, 14), { wash: '#FFFFFF', ink: null });
      // Deep navy upper iris -> sky-blue lower iris
      paint(ctx, ellPts(ex + gx, ey + gy + 0.02 * u * sc, rx * 0.88, ry * 0.88, 14), { wash: C.eyeTop, fill: C.eyeMid, fillOp: 130, ink: null });
      paint(ctx, ellPts(ex + gx, ey + gy + 0.11 * u * sc, rx * 0.78, ry * 0.52, 12), { wash: C.eyeBot, ink: null });
      // Dark pupil
      paint(ctx, ellPts(ex + gx, ey + gy + 0.02 * u * sc, rx * 0.42, ry * 0.44, 10), { wash: C.eyePupil, ink: null });
      // Big upper-left white catchlight + small lower-right catchlight
      paint(ctx, ellPts(ex + gx - 0.10 * u * sc, ey + gy - 0.11 * u * sc, 0.10 * u * sc, 0.09 * u * sc, 8), { wash: '#FFFFFF', ink: null });
      paint(ctx, ellPts(ex + gx + 0.10 * u * sc, ey + gy + 0.13 * u * sc, 0.05 * u * sc, 0.05 * u * sc, 6), { wash: '#FFFFFF', ink: null });
      // Thick curved anime upper eyelash
      const s = isRight ? 1 : -1;
      inkLine(ctx, [
        [ex - s * 0.29 * u * sc, ey - 0.12 * u * sc],
        [ex,                     ey - 0.33 * u * sc],
        [ex + s * 0.33 * u * sc, ey - 0.07 * u * sc]
      ], 1.65, C.eyeLash, 'ink', 0.45);
    },
    happy(ctx, ex, ey, u, sc = 1) {
      inkLine(ctx, [
        [ex - 0.28 * u * sc, ey + 0.05 * u * sc],
        [ex,                 ey - 0.18 * u * sc],
        [ex + 0.28 * u * sc, ey + 0.05 * u * sc]
      ], 1.65, C.eyeLash, 'ink', 0.5);
    },
    wink(ctx, ex, ey, u, sc = 1, o = {}, isRight = false) {
      if (isRight) {
        EYES.happy(ctx, ex, ey, u, sc);
      } else {
        EYES.open(ctx, ex, ey, u, sc, o, false);
      }
    },
    spark(ctx, ex, ey, u, sc = 1, o = {}, isRight = false) {
      EYES.open(ctx, ex, ey, u, sc * 1.06, o, isRight);
      paint(ctx, starPts(ex, ey + 0.02 * u * sc, 0.22 * u * sc, 0.09 * u * sc, 4), { wash: '#FFE45E', ink: null });
    },
    heart(ctx, ex, ey, u, sc = 1, o = {}, isRight = false) {
      EYES.open(ctx, ex, ey, u, sc, o, isRight);
      paint(ctx, heartPts(ex, ey + 0.04 * u * sc, 0.18 * u * sc), { wash: '#FF7597', ink: null });
    },
    wide(ctx, ex, ey, u, sc = 1, o = {}, isRight = false) {
      EYES.open(ctx, ex, ey, u, sc * 1.12, o, isRight);
    },
    cry(ctx, ex, ey, u, sc = 1, o = {}, isRight = false) {
      EYES.open(ctx, ex, ey, u, sc, o, isRight);
      const s = isRight ? 1 : -1;
      paint(ctx, ellPts(ex + s * 0.22 * u * sc, ey + 0.28 * u * sc, 0.09 * u * sc, 0.16 * u * sc, 8), { wash: '#67E8F9', ink: C.ink, sw: 0.5 });
    },
    angry(ctx, ex, ey, u, sc = 1, o = {}, isRight = false) {
      EYES.open(ctx, ex, ey, u, sc * 0.95, o, isRight);
      const s = isRight ? 1 : -1;
      inkLine(ctx, [[ex - s * 0.28 * u * sc, ey - 0.14 * u * sc], [ex + s * 0.28 * u * sc, ey - 0.30 * u * sc]], 1.6, C.ink, 'ink', 0);
    },
    lids(ctx, ex, ey, u, sc = 1, o = {}, isRight = false) {
      EYES.open(ctx, ex, ey, u, sc * 0.92, o, isRight);
      paint(ctx, rectPts(ex - 0.32 * u * sc, ey - 0.35 * u * sc, 0.64 * u * sc, 0.28 * u * sc), { wash: C.skin, ink: null });
      inkLine(ctx, [[ex - 0.31 * u * sc, ey - 0.07 * u * sc], [ex + 0.31 * u * sc, ey - 0.07 * u * sc]], 1.5, C.eyeLash, 'ink', 0);
    },
    dead(ctx, ex, ey, u, sc = 1) {
      inkLine(ctx, [[ex - 0.24 * u * sc, ey], [ex + 0.24 * u * sc, ey]], 1.6, C.eyeLash, 'ink', 0);
    },
    dizzy(ctx, ex, ey, u, sc = 1, o = {}) {
      const t = o.t || 0;
      const pts = [];
      for (let a = 0; a < Math.PI * 3.5; a += 0.4) {
        const r = (a / (Math.PI * 3.5)) * 0.26 * u * sc;
        pts.push([ex + Math.cos(a + t * 8) * r, ey + Math.sin(a + t * 8) * r]);
      }
      inkLine(ctx, pts, 1.2, C.eyeLash, 'ink', 0.3);
    },
    shades(ctx, ex, ey, u, sc = 1) {
      paint(ctx, rrPts(ex - 0.36 * u * sc, ey - 0.20 * u * sc, 0.72 * u * sc, 0.40 * u * sc, 3, 0.5), { wash: '#0F172A', ink: C.ink, sw: 0.9 });
      inkLine(ctx, [[ex - 0.18 * u * sc, ey - 0.08 * u * sc], [ex + 0.08 * u * sc, ey + 0.08 * u * sc]], 0.9, '#E2E8F0', 'ink', 0);
    }
  };

  // ==========================================================================
  // Modular Mouths (`MOUTHS`) — Compatible with cast.js & 42868804351-1-192.mp4
  // ==========================================================================
  const MOUTHS = {
    smile(ctx, mx, my, u) {
      inkLine(ctx, [[mx - 0.17 * u, my - 0.01 * u], [mx, my + 0.08 * u], [mx + 0.17 * u, my - 0.01 * u]], 1.15, '#B84A52', 'ink', 0.5);
    },
    openSmile(ctx, mx, my, u) {
      paint(ctx, [
        [mx - 0.21 * u, my - 0.05 * u],
        [mx + 0.21 * u, my - 0.05 * u],
        [mx + 0.17 * u, my + 0.15 * u],
        [mx,            my + 0.21 * u],
        [mx - 0.17 * u, my + 0.15 * u]
      ], { wash: '#FF9690', ink: '#B84A52', sw: 0.95, curv: 0.35 });
    },
    cat(ctx, mx, my, u) {
      inkLine(ctx, [
        [mx - 0.20 * u, my],
        [mx - 0.07 * u, my + 0.08 * u],
        [mx,            my + 0.01 * u],
        [mx + 0.07 * u, my + 0.08 * u],
        [mx + 0.20 * u, my]
      ], 1.15, '#B84A52', 'ink', 0.4);
    },
    o(ctx, mx, my, u) {
      paint(ctx, ellPts(mx, my + 0.05 * u, 0.18 * u, 0.14 * u, 10), { wash: '#FF9690', ink: '#B84A52', sw: 0.95 });
    },
    waveO(ctx, mx, my, u) {
      paint(ctx, ellPts(mx, my + 0.05 * u, 0.22 * u, 0.15 * u, 12), { wash: '#FF9690', ink: '#B84A52', sw: 0.95 });
    },
    pout(ctx, mx, my, u) {
      inkLine(ctx, [[mx - 0.16 * u, my + 0.08 * u], [mx, my - 0.02 * u], [mx + 0.16 * u, my + 0.08 * u]], 1.15, '#B84A52', 'ink', 0.4);
    },
    grin(ctx, mx, my, u) {
      paint(ctx, [
        [mx - 0.24 * u, my - 0.04 * u],
        [mx + 0.24 * u, my - 0.04 * u],
        [mx + 0.18 * u, my + 0.14 * u],
        [mx - 0.18 * u, my + 0.14 * u]
      ], { wash: '#FFFFFF', ink: '#B84A52', sw: 0.95 });
    },
    flat(ctx, mx, my, u) {
      inkLine(ctx, [[mx - 0.16 * u, my + 0.03 * u], [mx + 0.16 * u, my + 0.03 * u]], 1.1, '#B84A52', 'ink', 0);
    },
    smirk(ctx, mx, my, u) {
      inkLine(ctx, [[mx - 0.14 * u, my + 0.04 * u], [mx + 0.06 * u, my + 0.05 * u], [mx + 0.18 * u, my - 0.04 * u]], 1.15, '#B84A52', 'ink', 0.4);
    }
  };

  // ==========================================================================
  // Modular Overhead Emotes (`EMOTES`) — 16-Bit Pixel-Art Edition
  // ==========================================================================
  function makePx(ctx, x, y, u) {
    const cell = u / 10;
    return (gx, gy, gw, gh, col) => {
      ctx.fillStyle = col;
      ctx.fillRect(x + (gx - 0.5) * cell, y + (gy - 0.5) * cell, gw * cell + 0.35, gh * cell + 0.35);
    };
  }

  const EMOTES = {
    spout(ctx, x, y, u, k = 1, t = 0) {
      const px = makePx(ctx, x, y, u);
      const bob = Math.round(Math.sin(t * 8) * 1.5);
      // Central water jet + left/right cyan pixel droplets
      px(-1, -4 + bob, 3, 6, '#38BDF8');
      px(0, -5 + bob, 1, 5, '#E0F2FE');
      for (const s of [-1, 1]) {
        px(s * 5 - 1, -6 + bob, 3, 2, '#72E2F7');
        px(s * 9 - 1, -4 + bob, 3, 3, '#38BDF8');
        px(s * 9, -3 + bob, 1, 1, '#FFFFFF');
      }
    },
    heart(ctx, x, y, u, k = 1, t = 0) {
      const dy = Math.sin(t * 5) * 0.12 * u;
      const px = makePx(ctx, x + 1.65 * u, y + dy, u);
      px(-4, -3, 3, 2, '#161F3A'); px(2, -3, 3, 2, '#161F3A');
      px(-5, -2, 11, 4, '#161F3A');
      px(-4, 2, 9, 2, '#161F3A');
      px(-2, 4, 5, 2, '#161F3A');
      px(-1, 6, 3, 1, '#161F3A');
      px(-3, -2, 3, 2, '#FF4D6D'); px(1, -2, 3, 2, '#FF4D6D');
      px(-4, -1, 9, 3, '#FF4D6D');
      px(-3, 2, 7, 2, '#E11D48');
      px(-1, 4, 3, 2, '#E11D48');
      px(-3, -1, 2, 2, '#FDA4AF');
    },
    sparkle(ctx, x, y, u, k = 1, t = 0) {
      const px = makePx(ctx, x, y, u);
      const bob = Math.round(Math.sin(t * 7) * 1);
      // Left Golden 4-Point Pixel Star
      const lx = -18, ly = 1 + bob;
      px(lx - 4, ly, 9, 1, '#EAB308');
      px(lx, ly - 4, 1, 9, '#EAB308');
      px(lx - 2, ly - 1, 5, 3, '#FACC15');
      px(lx - 1, ly - 2, 3, 5, '#FACC15');
      px(lx - 1, ly - 1, 3, 3, '#FEF08A');
      px(lx, ly, 1, 1, '#FFFFFF');
      // Right Cyan 4-Point Pixel Star
      const rx = 18, ry = 3 - bob;
      px(rx - 3, ry, 7, 1, '#0284C7');
      px(rx, ry - 3, 1, 7, '#0284C7');
      px(rx - 1, ry - 1, 3, 3, '#72E2F7');
      px(rx, ry, 1, 1, '#FFFFFF');
    },
    sweat(ctx, x, y, u, k = 1, t = 0) {
      const dy = ((t * 2.2) % 1) * 0.30 * u;
      const px = makePx(ctx, x + 1.65 * u, y + 0.55 * u + dy, u);
      px(-1, -3, 3, 2, '#161F3A');
      px(-2, -1, 5, 4, '#161F3A');
      px(-1, 3, 3, 1, '#161F3A');
      px(0, -2, 1, 2, '#72E2F7');
      px(-1, 0, 3, 3, '#38BDF8');
      px(-1, 0, 1, 2, '#E0F2FE');
    },
    anger(ctx, x, y, u, k = 1) {
      const px = makePx(ctx, x + 1.45 * u, y + 0.55 * u, u);
      px(-4, -4, 9, 9, '#161F3A');
      px(-3, -3, 2, 2, '#EF4444'); px(2, -3, 2, 2, '#EF4444');
      px(-3, 2, 2, 2, '#EF4444');  px(2, 2, 2, 2, '#EF4444');
      px(-1, -1, 3, 3, '#FCA5A5');
    },
    exclaim(ctx, x, y, u, k = 1) {
      const px = makePx(ctx, x, y - 0.15 * u, u);
      px(-2, -7, 5, 7, '#161F3A');
      px(-1, -6, 3, 5, '#FF4D6D');
      px(-1, -5, 1, 3, '#FDA4AF');
      px(-2, 1, 5, 4, '#161F3A');
      px(-1, 2, 3, 2, '#FF4D6D');
    },
    question(ctx, x, y, u, k = 1) {
      const px = makePx(ctx, x + 1.65 * u, y + 0.15 * u, u);
      px(-3, -5, 7, 3, '#161F3A');
      px(1, -2, 3, 3, '#161F3A');
      px(-1, 0, 3, 3, '#161F3A');
      px(-1, 4, 3, 3, '#161F3A');
      px(-2, -4, 5, 2, '#FACC15');
      px(2, -2, 1, 2, '#FACC15');
      px(0, 0, 1, 2, '#FACC15');
      px(0, 5, 1, 1, '#FACC15');
    },
    music(ctx, x, y, u, k = 1, t = 0) {
      const ny = ((t * 1.8) % 1) * 0.45 * u;
      const px = makePx(ctx, x + 1.75 * u, y + 0.35 * u - ny, u);
      px(-2, -4, 7, 2, '#38BDF8');
      px(-1, -3, 2, 6, '#38BDF8');
      px(3, -3, 2, 5, '#38BDF8');
      px(-3, 1, 3, 3, '#72E2F7');
      px(1, 0, 3, 3, '#72E2F7');
    },
    idea(ctx, x, y, u, k = 1) {
      const px = makePx(ctx, x, y - 0.20 * u, u);
      px(-3, -6, 7, 6, '#161F3A');
      px(-2, -5, 5, 4, '#FEF08A');
      px(-1, -4, 2, 2, '#FFFFFF');
      px(-2, 0, 5, 3, '#94A3B8');
      px(-6, -4, 2, 1, '#FACC15'); px(5, -4, 2, 1, '#FACC15');
      px(0, -9, 1, 2, '#FACC15');
    },
    zzz(ctx, x, y, u, k = 1, t = 0) {
      const dy = ((t * 1.2) % 1) * 0.45 * u;
      letter(ctx, 'Zzz', x + 1.65 * u, y + 0.25 * u - dy, Math.round(0.65 * u * k), '#93C5FD', { stroke: C.ink });
    }
  };

  // ==========================================================================
  // 31 Acted Emotions (`EMO`) — Exact counterpart to ClaudeAnimationBase
  // Maps directly onto the 5 canonical poses of 42868804351-1-192.mp4 + variations
  // ==========================================================================
  const EMO = {
    neutral:     { poseMode: 'wave',   eyes: 'open',  mouth: 'smile',     blush: false },
    idle:        { poseMode: 'wave',   eyes: 'open',  mouth: 'smile',     blush: false },
    calm:        { poseMode: 'laptop', eyes: 'open',  mouth: 'smile',     tailSit: true },
    happy:       { poseMode: 'wave',   eyes: 'open',  mouth: 'openSmile', blush: true,  waveArm: true },
    excited:     { poseMode: 'wave',   eyes: 'spark', mouth: 'openSmile', blush: true,  waveArm: true, emote: 'sparkle' },
    joy:         { poseMode: 'heart',  eyes: 'happy', mouth: 'openSmile', blush: true,  heartHands: true, emote: 'heart' },
    love:        { poseMode: 'heart',  eyes: 'happy', mouth: 'cat',       blush: true,  heartHands: true, emote: 'heart' },
    starstruck:  { poseMode: 'wave',   eyes: 'spark', mouth: 'openSmile', blush: true,  emote: 'sparkle' },
    wink:        { poseMode: 'wink',   eyes: 'wink',  mouth: 'cat',       blush: true,  hips: true, tailMode: 'highRight' },
    smug:        { poseMode: 'wink',   eyes: 'lids',  mouth: 'smirk',     blush: false, hips: true, tailMode: 'highRight' },
    proud:       { poseMode: 'wink',   eyes: 'happy', mouth: 'grin',      blush: true,  hips: true, tailMode: 'highRight', emote: 'sparkle' },
    laugh:       { poseMode: 'wave',   eyes: 'happy', mouth: 'openSmile', blush: true,  waveArm: true },
    singing:     { poseMode: 'wave',   eyes: 'happy', mouth: 'openSmile', blush: true,  emote: 'music' },
    surprised:   { poseMode: 'panic',  eyes: 'wide',  mouth: 'o',         blush: true,  emote: 'exclaim' },
    shocked:     { poseMode: 'panic',  eyes: 'wide',  mouth: 'waveO',     blush: true,  cheekHands: true, emote: 'exclaim' },
    panic:       { poseMode: 'panic',  eyes: 'wide',  mouth: 'waveO',     blush: true,  cheekHands: true, emote: 'sweat' },
    nervous:     { poseMode: 'panic',  eyes: 'open',  mouth: 'waveO',     blush: true,  emote: 'sweat' },
    confused:    { poseMode: 'wave',   eyes: 'open',  mouth: 'flat',      headTilt: 0.14, emote: 'question' },
    question:    { poseMode: 'wave',   eyes: 'open',  mouth: 'o',         headTilt: 0.16, emote: 'question' },
    idea:        { poseMode: 'wave',   eyes: 'spark', mouth: 'openSmile', emote: 'idea' },
    thinking:    { poseMode: 'laptop', eyes: 'open',  mouth: 'flat',      tailSit: true, lookX: -1 },
    typing:      { poseMode: 'laptop', eyes: 'open',  mouth: 'smile',     tailSit: true },
    focused:     { poseMode: 'laptop', eyes: 'open',  mouth: 'flat',      tailSit: true },
    sad:         { poseMode: 'panic',  eyes: 'cry',   mouth: 'pout',      blush: false, emote: 'sweat' },
    cry:         { poseMode: 'panic',  eyes: 'cry',   mouth: 'waveO',     blush: true,  emote: 'sweat' },
    sob:         { poseMode: 'panic',  eyes: 'happy', mouth: 'waveO',     blush: true,  emote: 'sweat' },
    pout:        { poseMode: 'wink',   eyes: 'angry', mouth: 'pout',      blush: true,  hips: true },
    angry:       { poseMode: 'wink',   eyes: 'angry', mouth: 'pout',      blush: false, hips: true, emote: 'anger' },
    rage:        { poseMode: 'panic',  eyes: 'angry', mouth: 'waveO',     blush: true,  emote: 'anger' },
    deadpan:     { poseMode: 'wave',   eyes: 'lids',  mouth: 'flat',      blush: false },
    sleepy:      { poseMode: 'laptop', eyes: 'lids',  mouth: 'o',         tailSit: true, emote: 'zzz' }
  };

  const HATS = {
    maid: true, maidHeadband: true, crown: true, wizard: true, hard: true, hardHat: true,
    sweatband: true, diving: true, headphones: true, headset: true, party: true,
    halo: true, top: true, topHat: true, fedora: true, flower: true, cat: true, chef: true
  };

  const EMO_ALIASES = {
    sparkle: 'starstruck',
    starry: 'starstruck',
    hope: 'starstruck',
    curious: 'question',
    huh: 'question',
    gasp: 'surprised',
    shock: 'shocked',
    shy: 'joy',
    determined: 'proud',
    scared: 'nervous',
    worry: 'nervous',
    panicked: 'panic',
    dizzy: 'panic',
    bored: 'deadpan',
    dead: 'deadpan',
    annoyed: 'angry',
    sigh: 'sad',
    plead: 'sob',
    think: 'thinking',
    zen: 'calm',
    mischief: 'smug'
  };

  function feel(name, t = 0, extra = {}) {
    const key = EMO[name] ? name : (EMO_ALIASES[name] || 'happy');
    const base = EMO[key] || EMO.happy;
    return Object.assign({}, base, { emotion: key, t }, extra);
  }

  // Smooth multi-emotion timeline with anticipation blink (`squint`), reaction squash-stretch (`take`),
  // interpolated posture (`dy`, `sq`, `headTilt`), and `backOut` overhead emote pop (`emoteK`).
  // Modeled directly after `JohnHeibel/PDoomVideo` (`mood`) & `tuzhechen2005/opus-video-skills` (`emotions`).
  function emotions(t, timeline = [], opts = {}) {
    if (!timeline || !timeline.length) return feel('happy', t);
    let idx = 0;
    for (let i = 0; i < timeline.length; i++) {
      if (t >= timeline[i][0]) idx = i;
    }
    const [t0, curName, customEmote] = timeline[idx];
    const cur = feel(curName, t);
    const prevName = idx > 0 ? timeline[idx - 1][1] : curName;
    const prev = feel(prevName, t);
    const age = Math.max(0, t - t0);
    const nextIn = (idx + 1 < timeline.length) ? (timeline[idx + 1][0] - t) : 99;
    const takeMul = opts.take ?? 1.0;

    // 1. Smooth posture interpolation over 0.28s after each emotion change
    const blend = idx > 0 ? clamp(age / 0.28, 0, 1) : 1;
    const k = blend * blend * (3 - 2 * blend);
    const poseBlendRaw = idx > 0 ? clamp(age / 0.12, 0, 1) : 1;
    const poseBlend = poseBlendRaw * poseBlendRaw * (3 - 2 * poseBlendRaw);
    const dy = lerp(prev.dy || 0, cur.dy || 0, k);
    const sqBase = lerp(prev.sq || 0, cur.sq || 0, k);
    const headTilt = lerp(prev.headTilt || 0, cur.headTilt || 0, k);

    // 2. Eyelid squint/blink across the transition seam (-0.08s .. +0.15s) so faces never snap
    let squint = 0;
    let take = 0;
    if (idx > 0 && age < 0.15) {
      squint = 1 - age / 0.15;
      take = -0.11 * takeMul * Math.sin((age / 0.15) * Math.PI);
    } else if (idx > 0 && age >= 0.15 && age < 0.38) {
      const u = (age - 0.15) / 0.23;
      take = 0.08 * takeMul * Math.sin(u * Math.PI) * (1 - u);
    }
    if (nextIn < 0.08 && nextIn >= 0) {
      squint = Math.max(squint, 1 - nextIn / 0.08);
    }

    // 3. Overhead Emote pop progress
    const em = customEmote !== undefined ? customEmote : cur.emote;
    const emoteK = em ? clamp(age / 0.22, 0, 1) : 0;

    return Object.assign({}, cur, {
      dy: dy + take * 0.35,
      sq: sqBase + take,
      headTilt,
      squint,
      take,
      emote: em,
      emoteK,
      transitionBlend: k,
      poseFrom: resolvePoseKey(prev),
      poseTo: resolvePoseKey(cur),
      poseBlend
    });
  }

  function move(mode = 'bounce', t = 0, seed = 0) {
    const ph = t * 6.5 + seed * 1.7;
    if (mode === 'walk' || mode === 'run') {
      const sp = mode === 'run' ? 11.5 : 7.5;
      const w = t * sp + seed;
      return {
        walk: w,
        dy: -Math.abs(Math.sin(w)) * 0.22,
        sq: Math.sin(w * 2) * 0.04,
        hipL: Math.sin(w) * 0.28,
        hipR: -Math.sin(w) * 0.28
      };
    }
    if (mode === 'wave') {
      return {
        dy: -Math.abs(Math.sin(ph)) * 0.14,
        sq: Math.sin(ph) * 0.03,
        waveArm: true
      };
    }
    if (mode === 'dance') {
      return {
        dy: -Math.abs(Math.sin(ph * 1.2)) * 0.24,
        sq: Math.sin(ph * 2.4) * 0.06,
        headTilt: Math.sin(ph) * 0.09,
        hipL: Math.sin(ph) * 0.18,
        hipR: -Math.sin(ph) * 0.18
      };
    }
    if (mode === 'shiver') {
      return {
        dx: Math.sin(t * 45) * 0.08,
        dy: 0,
        sq: -0.03
      };
    }
    return {
      dy: -Math.abs(Math.sin(ph)) * 0.14,
      sq: Math.sin(ph) * 0.03
    };
  }

  function viewIndex(view) {
    if (typeof view === 'number' && Number.isFinite(view)) {
      return clamp(Math.round(view * (VIEWS.length - 1)), 0, VIEWS.length - 1);
    }
    const idx = VIEWS.indexOf(view);
    return idx < 0 ? 0 : idx;
  }

  function turn(t, t0, dur, fromView = 'front', toView = 'side') {
    const p = clamp((t - t0) / Math.max(0.001, dur), 0, 1);
    const a = viewIndex(fromView), b = viewIndex(toView);
    const position = lerp(a, b, p);
    let fromIdx, toIdx, progress;
    if (b >= a) {
      fromIdx = Math.floor(position);
      toIdx = Math.min(VIEWS.length - 1, fromIdx + 1);
      progress = position - fromIdx;
    } else {
      fromIdx = Math.ceil(position);
      toIdx = Math.max(0, fromIdx - 1);
      progress = fromIdx - position;
    }
    const eased = progress * progress * (3 - 2 * progress);
    return { view: VIEWS[toIdx], viewFrom: VIEWS[fromIdx], viewBlend: eased };
  }

  function spinView(t, speed = 4.0) {
    const phase = Math.max(0, t * speed);
    const cycle = Math.floor(phase);
    const idx = cycle % VIEWS.length;
    const local = phase - cycle;
    if (cycle === 0) return { view: VIEWS[0], viewFrom: VIEWS[0], viewBlend: 1 };
    const blendWindow = 0.24;
    const fromIdx = (idx - 1 + VIEWS.length) % VIEWS.length;
    const viewBlend = local < blendWindow
      ? (local / blendWindow) ** 2 * (3 - 2 * (local / blendWindow))
      : 1;
    return {
      view: VIEWS[idx],
      viewFrom: local < blendWindow ? VIEWS[fromIdx] : VIEWS[idx],
      viewBlend
    };
  }

  function resolvePoseKey(o = {}) {
    const isWalking = Math.abs(o.walk || 0) > 0.001;
    if (!isWalking && (o.tailSit === true || o.tailMode === 'cushion' || o.laptop === true)) return 'laptop';
    if (o.heartHands === true) return 'heart';
    if (o.cheekHands === true) return 'panic';
    if (o.hips === true) return 'wink';
    if (o.poseMode && ['wave', 'wink', 'panic', 'laptop', 'heart'].includes(o.poseMode)) {
      if (isWalking && o.poseMode === 'laptop') return 'wave';
      return o.poseMode;
    }
    if (o.eyes === 'heart' || o.emotion === 'love' || o.emotion === 'joy') return 'heart';
    if (o.tailMode === 'highRight' || o.eyes === 'wink' || o.emotion === 'wink' || o.emotion === 'smug' || o.emotion === 'proud') return 'wink';
    if (['panic', 'shocked', 'surprised', 'cry', 'sob', 'sad', 'rage', 'angry'].includes(o.emotion) || o.eyes === 'wide' || o.eyes === 'cry') return 'panic';
    return 'wave';
  }

  const EMO_PROGRESSION = {
    neutral:    ['neutral', 'idle', 'happy'],
    idle:       ['idle', 'happy', 'wink'],
    calm:       ['calm', 'idle', 'happy'],
    happy:      ['happy', 'excited', 'joy'],
    excited:    ['excited', 'starstruck', 'joy'],
    joy:        ['joy', 'love', 'happy'],
    love:       ['love', 'joy', 'starstruck'],
    starstruck: ['starstruck', 'excited', 'love'],
    wink:       ['wink', 'proud', 'smug'],
    smug:       ['smug', 'wink', 'proud'],
    proud:      ['proud', 'wink', 'happy'],
    laugh:      ['laugh', 'happy', 'joy'],
    singing:    ['singing', 'happy', 'excited'],
    surprised:  ['surprised', 'shocked', 'excited'],
    shocked:    ['shocked', 'panic', 'surprised'],
    panic:      ['panic', 'shocked', 'nervous'],
    nervous:    ['nervous', 'panic', 'sad'],
    confused:   ['confused', 'question', 'idea'],
    question:   ['question', 'confused', 'idea'],
    idea:       ['idea', 'excited', 'proud'],
    thinking:   ['thinking', 'focused', 'idea'],
    typing:     ['typing', 'focused', 'happy'],
    focused:    ['focused', 'thinking', 'proud'],
    sad:        ['sad', 'cry', 'sob'],
    cry:        ['cry', 'sob', 'sad'],
    sob:        ['sob', 'cry', 'sad'],
    pout:       ['pout', 'angry', 'wink'],
    angry:      ['angry', 'pout', 'rage'],
    rage:       ['rage', 'angry', 'shocked'],
    deadpan:    ['deadpan', 'sleepy', 'confused'],
    sleepy:     ['sleepy', 'deadpan', 'calm']
  };

  // ==========================================================================
  // Main Character Renderer: `whaleGirl(ctx, x, y, u = 20, o = {})`
  // ==========================================================================
  function whaleGirl(ctx, x, y, u = 20, rawO = {}) {
    boilSeed('whaleGirl' + Math.round(x));
    const t = rawO.t ?? 0;
    const actLib = root.WHALE_ACTIONS || ACTIONS;
    const actionMod = (rawO.action && actLib && typeof actLib.evaluateAction === 'function')
      ? actLib.evaluateAction(rawO.action, t, rawO)
      : null;

    // Automatically expand multi-stage `emotions: [[t0, emo, emote], ...]` or single `emo`/`emotion` string!
    const isSheetFrame = Math.abs(t - 1.2) < 0.001;
    let o = Object.assign({}, rawO);
    if (actionMod) {
      if (actionMod.emotion && !o.emotion && !o.emo) o.emotion = actionMod.emotion;
      if (actionMod.poseMode && !o.poseMode) o.poseMode = actionMod.poseMode;
      if (actionMod.aL !== undefined && o.aL === undefined) o.aL = actionMod.aL;
      if (actionMod.aR !== undefined && o.aR === undefined) o.aR = actionMod.aR;
      if (actionMod.hipL !== undefined && o.hipL === undefined) o.hipL = actionMod.hipL;
      if (actionMod.hipR !== undefined && o.hipR === undefined) o.hipR = actionMod.hipR;
      if (actionMod.smear !== undefined && o.smear === undefined) o.smear = actionMod.smear;
      o.dx = (o.dx || 0) + (actionMod.dx || 0);
      o.dy = (o.dy || 0) + (actionMod.dy || 0);
      o.rot = (o.rot || 0) + (actionMod.rot || 0);
      o.sq = (o.sq || 0) + (actionMod.sq || 0);
      o.walk = (o.walk || 0) + (actionMod.walk || 0);
      o.kneel = (o.kneel || 0) + (actionMod.kneel || 0);
      o.tailWag = (o.tailWag || 0) + (actionMod.tailWag || 0);
      o.headTilt = (o.headTilt || 0) + (actionMod.headTilt || 0);
    }
    if (Array.isArray(o.emotions) && o.emotions.length > 0) {
      const emoT = o.lt !== undefined ? o.lt : t;
      o = Object.assign({}, emotions(emoT, o.emotions, { take: o.take !== false }), o);
    } else if ((o.emo || o.emotion) && !o.eyes) {
      o = Object.assign({}, feel(o.emo || o.emotion, o.emote), o);
    }
    // Automatic 3-stage 31-emotion progression & stepping micro-action for MV frames without explicit `emotions()`
    if (!isSheetFrame && !Array.isArray(rawO.emotions) && rawO.transitionBlend === undefined) {
      const baseKey = EMO[o.emotion] ? o.emotion : (EMO_ALIASES[o.emotion] || 'happy');
      const triad = EMO_PROGRESSION[baseKey] || ['happy', 'excited', 'joy'];
      const cycT = (t + (rawO.seed || 0) * 0.41) % 2.4;
      const autoEmo = emotions(cycT, [[0.0, triad[0]], [0.8, triad[1]], [1.6, triad[2]]], { take: 0.75 });
      const autoStep = (rawO.walk === undefined && !o.tailSit && o.poseMode !== 'laptop')
        ? Math.sin(t * 2.8) * 0.14
        : (o.walk || 0);
      o = Object.assign({}, o, {
        eyes: autoEmo.eyes,
        mouth: autoEmo.mouth,
        blush: autoEmo.blush,
        squint: Math.max(o.squint || 0, autoEmo.squint || 0),
        sq: (o.sq || 0) + (autoEmo.take || 0),
        headTilt: (o.headTilt || 0) + (autoEmo.headTilt || 0) * 0.5,
        walk: autoStep,
        poseFrom: autoEmo.poseFrom,
        poseTo: autoEmo.poseTo,
        poseBlend: autoEmo.poseBlend
      });
    }
    o.tailScale = clamp(o.tailScale === undefined ? 1 : o.tailScale, 0.5, 1.1);
    const style = o.style || (typeof getActiveStyle === 'function' ? getActiveStyle() : 'pixel');
    const view = o.view || 'front';
    const viewFrom = o.viewFrom || view;
    const viewFade = clamp(o.viewBlend === undefined ? 1 : o.viewBlend, 0, 1);
    const blendViews = viewFrom !== view && viewFade < 1;
    const vx = VIEW_VX[view] || 0;
    const isBack = view === 'back';
    const isQBack = view === 'qback';

    // Micro-action emotion modifiers (tremble on shock/cry/rage, bounce on happy/love, droop on sad/tired)
    const emoName = o.emotion || o.emo || 'idle';
    const isTremble = ['panic', 'shock', 'shocked', 'gasp', 'cry', 'bawl', 'sob', 'rage', 'furious'].includes(emoName);
    const isBouncy = ['happy', 'joy', 'yay', 'excited', 'love', 'starry', 'proud', 'smug', 'wink'].includes(emoName);
    const isDroop = ['sad', 'gloom', 'sigh', 'tired', 'sleepy', 'dead', 'hurt', 'plead'].includes(emoName);

    const sq = clamp((o.sq || 0) + (isBouncy ? Math.sin(t * 7.5) * 0.035 : 0), -0.35, 0.35);
    const sx = (1 + sq * 0.55) * (o.flip ? -1 : 1);
    const sy = 1 - sq * 0.65;
    const trembleDx = isTremble ? Math.sin(t * 42) * 0.045 : 0;
    const dx = ((o.dx || 0) + trembleDx) * u;
    const jumpDy = o.jump ? -(o.jump / u) : 0;
    const kneelDy = (o.kneel || 0) * 0.88;
    const droopDy = isDroop ? 0.08 + Math.sin(t * 2.2) * 0.03 : 0;
    const dy = ((o.dy ?? -0.10 * pulse(t)) + jumpDy + kneelDy + droopDy) * u;
    const bodyRot = (o.rot || 0) + (o.kneel ? (o.flip ? -1 : 1) * o.kneel * 0.16 : 0);

    const walkRaw = o.walk || 0;
    const walkRad = walkRaw * 4.2;
    const walkBob = walkRaw ? -Math.abs(Math.sin(walkRad)) * 0.22 * u : 0;

    const headBob = Math.sin(t * (isBouncy ? 6.4 : 4.2)) * (isBouncy ? 0.065 : 0.04) * u + walkBob;
    const emoTilt = isDroop ? -0.07 : (['curious', 'huh', 'question', 'think', 'shy', 'wink'].includes(emoName) ? 0.085 : 0);
    const headTilt = (o.headTilt || 0) + emoTilt + Math.sin(t * 2.1) * 0.045 + (walkRaw ? Math.sin(walkRad) * 0.06 : 0);
    const poseKey = resolvePoseKey(o);
    let poseFade = clamp(o.poseBlend === undefined ? 1 : o.poseBlend, 0, 1);
    let transitionFromPose = (
      o.poseFrom && o.poseFrom !== poseKey && poseFade < 1 &&
      !rawO.poseMode && !(actionMod && actionMod.poseMode) &&
      !(actionMod && actionMod.replaceBody)
    ) ? o.poseFrom : null;

    // Actions can switch canonical rig poses at phase boundaries (e.g. hum → notice).
    // Detect a pose change in the previous frame, locate its boundary, and cross-fade
    // the connected body layers over 120 ms instead of snapping detached limbs.
    if (!transitionFromPose && rawO.action && !rawO.poseMode && !(actionMod && actionMod.replaceBody)) {
      const poseAt = (sampleTime) => {
        const age = t - sampleTime;
        const sampleRaw = Object.assign({}, rawO, { t: sampleTime });
        if (rawO.lt !== undefined) sampleRaw.lt = Math.max(0, rawO.lt - age);
        const sampleMod = actLib.evaluateAction(rawO.action, sampleTime, sampleRaw);
        let sampleO = Object.assign({}, sampleRaw);
        if (sampleMod) {
          if (sampleMod.emotion && !sampleO.emotion && !sampleO.emo) sampleO.emotion = sampleMod.emotion;
          if (sampleMod.poseMode && !sampleO.poseMode) sampleO.poseMode = sampleMod.poseMode;
          if (sampleMod.walk !== undefined) sampleO.walk = (sampleO.walk || 0) + sampleMod.walk;
          if (sampleMod.kneel !== undefined) sampleO.kneel = (sampleO.kneel || 0) + sampleMod.kneel;
        }
        if (Array.isArray(rawO.emotions) && rawO.emotions.length) {
          sampleO = Object.assign({}, emotions(sampleO.lt !== undefined ? sampleO.lt : sampleTime, rawO.emotions, { take: rawO.take !== false }), sampleO);
        } else if ((sampleO.emo || sampleO.emotion) && !sampleO.eyes) {
          sampleO = Object.assign({}, feel(sampleO.emo || sampleO.emotion, sampleTime), sampleO);
        }
        if (!Array.isArray(rawO.emotions) && rawO.transitionBlend === undefined && sampleO.emotion) {
          const baseKey = EMO[sampleO.emotion] ? sampleO.emotion : (EMO_ALIASES[sampleO.emotion] || 'happy');
          const triad = EMO_PROGRESSION[baseKey] || ['happy', 'excited', 'joy'];
          const cycT = (sampleTime + (rawO.seed || 0) * 0.41) % 2.4;
          const auto = emotions(cycT, [[0.0, triad[0]], [0.8, triad[1]], [1.6, triad[2]]], { take: 0.75 });
          sampleO = Object.assign({}, sampleO, { eyes: auto.eyes, mouth: auto.mouth });
        }
        return resolvePoseKey(sampleO);
      };
      const frameStep = 1 / 60;
      const priorPose = poseAt(Math.max(0, t - frameStep));
      if (priorPose !== poseKey) {
        let oldT = Math.max(0, t - frameStep);
        let newT = t;
        for (let i = 0; i < 6; i++) {
          const midT = (oldT + newT) * 0.5;
          if (poseAt(midT) === poseKey) newT = midT;
          else oldT = midT;
        }
        transitionFromPose = poseAt(oldT);
        const elapsed = Math.max(0, t - (oldT + newT) * 0.5);
        const blend = clamp(elapsed / 0.12, 0, 1);
        poseFade = blend * blend * (3 - 2 * blend);
      }
    }

    // Motion smear ghost (16-bit Pixel-Rig Afterimage Trail!)
    if (o.smear && o.smear > 0.05 && root.WHALE_GIRL_PIXEL_RIG) {
      for (const [lag, al] of [[1.55, 0.20], [0.82, 0.38]]) {
        ctx.save();
        ctx.globalAlpha = al * clamp(o.smear, 0, 1);
        ctx.translate(x + dx - lag * u * o.smear * (o.flip ? -1 : 1), y + dy);
        ctx.rotate(bodyRot);
        ctx.scale(sx, sy);
        drawArticulatedPixelRig(ctx, u, t, Object.assign({}, o, { hat: 'none', emote: null }), poseKey, headBob, headTilt, 'neon', view);
        ctx.restore();
      }
    }

    // Ground shadow (scales with jump height so leaps read clearly!)
    if (!o.noShadow) {
      const airLift = Math.max(0, -dy / u);
      const shScale = clamp(1 - airLift * 0.12, 0.35, 1.15);
      paint(ctx, ellPts(x + dx, y + 0.10 * u, 2.45 * u * shScale, 0.44 * u * shScale, 16), { wash: C.ink, washOp: Math.round(68 * shScale), ink: null });
    }

    ctx.save();
    ctx.translate(x + dx, y + dy);
    if (bodyRot) ctx.rotate(bodyRot);
    ctx.scale(sx, sy);

    if (actionMod && typeof actionMod.underlay === 'function') {
      ctx.save();
      if (o.flip) ctx.scale(-1, 1);
      actionMod.underlay(ctx, u, t);
      ctx.restore();
    }

    // Use Articulated 7-Bone Pixel-Grid Rig across ALL 5 turnaround views (front, q, side, qback, back)!
    const usePixelRig = (
      root.WHALE_GIRL_PIXEL_RIG &&
      o.constructMode !== 'vector'
    );

    const drawOnePose = (key, alpha, viewKey) => {
      if (alpha <= 0) return;
      ctx.save();
      ctx.globalAlpha *= alpha;
      if (usePixelRig) {
        drawArticulatedPixelRig(ctx, u, t, o, key, headBob, headTilt, style, viewKey, actionMod);
      } else {
        const viewX = VIEW_VX[viewKey] || 0;
        drawVectorConstruct(ctx, u, t, o, key, viewKey, viewX, viewKey === 'back', viewKey === 'qback', headBob, headTilt, style);
      }
      ctx.restore();
    };
    const drawPose = (key, alpha) => {
      if (blendViews) {
        drawOnePose(key, alpha * (1 - viewFade), viewFrom);
        drawOnePose(key, alpha * viewFade, view);
      } else {
        drawOnePose(key, alpha, view);
      }
    };

    if (transitionFromPose) drawPose(transitionFromPose, 1 - poseFade);
    drawPose(poseKey, transitionFromPose ? poseFade : 1);

    if (actionMod && typeof actionMod.overlay === 'function') {
      ctx.save();
      if (o.flip) ctx.scale(-1, 1);
      actionMod.overlay(ctx, u, t);
      ctx.restore();
    }

    ctx.restore();
  }

  // ==========================================================================
  // MODE A: Articulated 7-Bone Pixel-Grid Rig (100% faithful to 42868804351-1-192.mp4
  // + codex-deepseek-pet & dsh-dayu-fish-skin apron whale logo, fin-ear bows & gold trim)
  // Supports all 5 Canonical Poses, 5 Turnaround Views, and Full-Body Action Postures
  // ==========================================================================
  function drawArticulatedPixelRig(ctx, u, t, o, poseKey, headBob, headTilt, style, view = 'front', actionMod = null) {
    const rig = root.WHALE_GIRL_PIXEL_RIG;
    const basePal = rig.palette;
    const isTurnView = (view && view !== 'front' && rig.views && rig.views[view]);
    const poseBones = isTurnView ? rig.views[view] : (rig.poses[poseKey] || rig.poses.wave);
    // Keep the tail socket anchored to one stable hip pose while expressions/arms change.
    // Wink/heart pose sheets contain a raised fluke that used to jump across the torso.
    const tailRuns = (!isTurnView && poseKey !== 'laptop')
      ? (rig.poses.wave.tail || poseBones.tail)
      : poseBones.tail;
    const cell = u / rig.scale; // 1u = 10 grid cells; total character height ~9.5u

    // Style-specific palette transformation so Watercolor, Ukiyo-e, Risograph, and Neon look distinct
    const pal = basePal.map((hex) => {
      if (style === 'ukiyoe') return mixCol(hex, '#E8D5B5', 0.22);
      if (style === 'risograph') return mixCol(hex, '#FF5C8A', 0.14);
      if (style === 'neon') return mixCol(hex, '#00F5D4', 0.16);
      if (style === 'watercolor') return mixCol(hex, '#FFF8EE', 0.08);
      return hex;
    });

    const walkW = o.walk || 0;
    const walkRad = walkW * 4.2;
    const isMoving = Math.abs(walkW) > 0.001;
    const tailWag = Math.sin(t * (isMoving ? 7.5 : 3.5)) * (isMoving ? 0.16 : 0.075) + (o.tailWag || 0);
    const hairSway = Math.sin(t * (isMoving ? 6.2 : 2.4)) * (isMoving ? 0.085 : 0.035) - (isMoving ? 0.08 : 0);
    const kneelK = clamp(o.kneel || 0, 0, 1);
    const hipL = (o.hipL !== undefined ? o.hipL : (isMoving ? Math.sin(walkRad) * 0.42 : 0)) - kneelK * 0.50;
    const hipR = (o.hipR !== undefined ? o.hipR : (isMoving ? -Math.sin(walkRad) * 0.42 : 0)) + kneelK * 0.38;
    const strideLx = isMoving ? Math.sin(walkRad) * 0.28 * u : -kneelK * 0.22 * u;
    const strideRx = isMoving ? -Math.sin(walkRad) * 0.28 * u : kneelK * 0.26 * u;
    const liftLy = isMoving ? -Math.max(0, Math.cos(walkRad)) * 0.22 * u : -kneelK * 0.28 * u;
    const liftRy = isMoving ? -Math.max(0, -Math.cos(walkRad)) * 0.22 * u : -kneelK * 0.36 * u;

    const isSmoothBrush = (style === 'watercolor' || style === 'ukiyoe' || style === 'risograph') && o.constructMode !== 'pixelRig';

    const drawBoneRuns = (runs) => {
      if (!runs || !runs.length) return;
      let lastCol = -1;
      for (let i = 0; i < runs.length; i++) {
        const r = runs[i];
        const gy = r[0], gx1 = r[1], gx2 = r[2], cIdx = r[3];
        if (cIdx !== lastCol) {
          ctx.fillStyle = pal[cIdx];
          lastCol = cIdx;
        }
        if (isSmoothBrush) {
          const rx = (gx1 - 0.65) * cell;
          const ry = (gy - 0.65) * cell;
          const rw = (gx2 - gx1 + 1.35) * cell;
          const rh = cell * 1.35;
          ctx.beginPath();
          ctx.roundRect(rx, ry, rw, rh, cell * 0.48);
          ctx.fill();
        } else {
          ctx.fillRect(
            (gx1 - 0.5) * cell,
            (gy - 0.5) * cell,
            (gx2 - gx1 + 1) * cell + 0.45,
            cell + 0.45
          );
        }
      }
    };

    // Optional neon rim glow or risograph offset layer
    if (style === 'neon') {
      ctx.save();
      ctx.shadowColor = '#00F5D4';
      ctx.shadowBlur = 10;
      ctx.restore();
    } else if (style === 'risograph') {
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.translate(2.2, -1.8);
      ctx.fillStyle = '#FF3E88';
      for (const r of poseBones.torso) {
        ctx.fillRect((r[1] - 0.5) * cell, (r[0] - 0.5) * cell, (r[2] - r[1] + 1) * cell, cell);
      }
      ctx.restore();
    }

    const hTr = (actionMod && actionMod.headTransform) ? actionMod.headTransform : { dx: 0, dy: 0, rot: 0 };

    // Helper: Authentic codex-deepseek-pet & dsh-dayu-fish-skin Apron Blue Whale Logo + Gold Skirt Hem Trim
    const drawApronAndGoldDetails = () => {
      if (view === 'back' || view === 'qback') return;
      const vxOff = view === 'side' ? 0.32 * u : (view === 'q' ? 0.16 * u : 0);
      ctx.save();
      ctx.translate(vxOff, 0);
      // 1. Gold Hem Embroidery & Twin Gold Bows along dark-navy maid skirt hem
      ctx.fillStyle = '#F5C542';
      ctx.fillRect(-1.45 * u, -1.78 * u, 2.90 * u, 0.07 * u);
      for (const bx of [-0.95 * u, 0.95 * u]) {
        ctx.fillRect(bx - 0.12 * u, -1.84 * u, 0.24 * u, 0.12 * u);
        ctx.fillStyle = '#FFFBEB';
        ctx.fillRect(bx - 0.04 * u, -1.81 * u, 0.08 * u, 0.06 * u);
        ctx.fillStyle = '#F5C542';
      }
      // 2. Iconic DeepSeek Blue Whale Emblem in the center of her white apron
      const wx = 0, wy = -2.62 * u;
      ctx.fillStyle = '#2563EB';
      ctx.beginPath();
      ctx.ellipse(wx - 0.04 * u, wy, 0.30 * u, 0.21 * u, -0.06, 0, Math.PI * 2);
      ctx.fill();
      // Whale tail fluke
      ctx.beginPath();
      ctx.moveTo(wx + 0.20 * u, wy - 0.02 * u);
      ctx.lineTo(wx + 0.40 * u, wy - 0.18 * u);
      ctx.lineTo(wx + 0.34 * u, wy + 0.02 * u);
      ctx.lineTo(wx + 0.40 * u, wy + 0.16 * u);
      ctx.closePath();
      ctx.fill();
      // White belly & tiny eye + water spout
      ctx.fillStyle = '#E0F2FE';
      ctx.beginPath();
      ctx.ellipse(wx - 0.08 * u, wy + 0.08 * u, 0.18 * u, 0.08 * u, 0, 0, Math.PI);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(wx - 0.18 * u, wy - 0.06 * u, 0.06 * u, 0.06 * u);
      ctx.fillStyle = '#60A5FA';
      ctx.fillRect(wx - 0.10 * u, wy - 0.32 * u, 0.05 * u, 0.09 * u);
      ctx.fillRect(wx - 0.18 * u, wy - 0.36 * u, 0.07 * u, 0.05 * u);
      ctx.fillRect(wx - 0.04 * u, wy - 0.36 * u, 0.07 * u, 0.05 * u);
      ctx.restore();
    };

    // Helper: Sky-Blue Ribbon Bows at the base of both Whale-Fin Ears (codex-deepseek-pet & dsh-dayu-fish-skin)
    const drawFinEarBlueBows = () => {
      if (view === 'back') return;
      const bows = view === 'side' ? [[0.15 * u, -6.95 * u]] : [[-1.38 * u, -6.88 * u], [1.38 * u, -6.88 * u]];
      for (const [bx, by] of bows) {
        ctx.fillStyle = '#38BDF8';
        ctx.beginPath();
        ctx.ellipse(bx - 0.14 * u, by, 0.15 * u, 0.09 * u, -0.25, 0, Math.PI * 2);
        ctx.ellipse(bx + 0.14 * u, by, 0.15 * u, 0.09 * u, 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0284C7';
        ctx.beginPath();
        ctx.arc(bx, by, 0.065 * u, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    // 1. Back Hair Bone (shares upper-body headBob + headTransform so there is zero vertical seam!)
    if (poseKey !== 'wink') {
      ctx.save();
      ctx.translate(hTr.dx, hTr.dy - 5.2 * u + headBob);
      ctx.rotate(hairSway * 0.45 + hTr.rot * 0.65);
      ctx.translate(0, 5.2 * u);
      drawBoneRuns(poseBones.backHair);
      ctx.restore();
    }

    if (actionMod && actionMod.replaceBody && typeof actionMod.drawBody === 'function') {
      // Full-body posture override (lie_flat_tanle, sleep_curl, lie_dead_soul, kneel_empty_bowl, crouch, sit, etc.)
      actionMod.drawBody(ctx, u, t, pal, drawBoneRuns, poseBones, drawApronAndGoldDetails);
    } else {
      // 2. Whale Tail Bone (wags dynamically around hip pivot!)
      ctx.save();
      if (poseKey === 'laptop') {
        const cBreathe = 1 + Math.sin(t * 3.0) * 0.015;
        ctx.scale(cBreathe, 1 / cBreathe);
        drawBoneRuns(tailRuns);
      } else {
        const stableSocket = !isTurnView && poseKey !== 'laptop';
        const px = stableSocket || poseKey === 'wave' ? -1.0 * u : 1.0 * u;
        const py = -1.8 * u;
        ctx.translate(px, py + headBob * 0.5);
        ctx.rotate(tailWag * (px < 0 ? -1 : 1));
        ctx.translate(-px, -py);
        ctx.translate(px, py);
        ctx.scale(o.tailScale === undefined ? 1 : o.tailScale, o.tailScale === undefined ? 1 : o.tailScale);
        ctx.translate(-px, -py);
        drawBoneRuns(tailRuns);
      }
      ctx.restore();

      if (poseKey === 'wink') {
        ctx.save();
        ctx.translate(hTr.dx, hTr.dy - 5.2 * u + headBob);
        ctx.rotate(hairSway * 0.45 + hTr.rot * 0.65);
        ctx.translate(0, 5.2 * u);
        drawBoneRuns(poseBones.backHair);
        ctx.restore();
      }

      // 3. Left & Right Leg Bones (both drawn BEFORE torso with upper thigh extending to gy=-22
      //    so legs NEVER detach or split from the skirt hem during walking/running!)
      const drawLegBone = (runs, pivotX, strideX, liftY, hipAng) => {
        if (!runs || !runs.length) return;
        ctx.save();
        ctx.translate(pivotX + strideX, -1.65 * u + headBob + liftY);
        ctx.rotate(hipAng);
        ctx.translate(-pivotX, 1.65 * u);
        drawBoneRuns(runs);
        ctx.restore();
      };

      const leftForward = Math.sin(walkRad) >= 0;
      if (poseKey !== 'laptop') {
        if (leftForward) {
          drawLegBone(poseBones.legR, 1.10 * u, strideRx, liftRy, hipR);
          drawLegBone(poseBones.legL, -0.70 * u, strideLx, liftLy, hipL);
        } else {
          drawLegBone(poseBones.legL, -0.70 * u, strideLx, liftLy, hipL);
          drawLegBone(poseBones.legR, 1.10 * u, strideRx, liftRy, hipR);
        }
      }

      // 4. Torso, Bodice, Apron & Skirt Bone (overlaps upper thighs seamlessly!)
      ctx.save();
      ctx.translate(0, headBob);
      if (isMoving) {
        ctx.translate(0, -3.2 * u);
        ctx.rotate(Math.sin(walkRad) * 0.045);
        ctx.translate(0, 3.2 * u);
      }
      drawBoneRuns(poseBones.torso);
      drawApronAndGoldDetails();
      ctx.restore();

      // 5. Articulated Right Arm Bone & Left/Right Prop Hooks
      const emoTag = o.emotion || o.emo || 'idle';
      const emoWave = ['happy', 'joy', 'yay', 'excited', 'love', 'starry', 'proud', 'wink'].includes(emoTag);
      const emoTremble = ['panic', 'shock', 'shocked', 'gasp', 'cry', 'bawl', 'rage', 'furious'].includes(emoTag);
      const armRRot = o.aR !== undefined
        ? (0.55 - o.aR) * 0.55
        : ((o.waveArm || emoWave) ? Math.sin(t * 9.5) * 0.34 : (isMoving ? Math.sin(walkRad) * 0.58 : (emoTremble ? Math.sin(t * 28) * 0.16 : Math.sin(t * 4.2) * 0.12)));
      const armLRot = o.aL !== undefined
        ? (o.aL - 0.35) * 0.55
        : (isMoving ? -Math.sin(walkRad) * 0.58 : (emoWave ? -Math.sin(t * 9.5) * 0.28 : Math.sin(t * 3.8 + 1.2) * 0.10));

      if (poseBones.armR && poseBones.armR.length > 0) {
        ctx.save();
        ctx.translate(1.55 * u, -4.55 * u + headBob);
        ctx.rotate(armRRot);
        ctx.translate(-1.55 * u, 4.55 * u);
        drawBoneRuns(poseBones.armR);
        ctx.restore();
      }

      // Prop attachment hooks (`armL` / `armR` callbacks follow arm swing!)
      if (typeof o.armL === 'function') {
        ctx.save();
        ctx.translate(-1.55 * u, -4.45 * u + headBob);
        ctx.rotate(armLRot);
        ctx.translate(-0.35 * u, 1.30 * u);
        o.armL(ctx, u, style);
        ctx.restore();
      }
      if (typeof o.armR === 'function') {
        ctx.save();
        ctx.translate(1.55 * u, -4.55 * u + headBob);
        ctx.rotate(armRRot);
        ctx.translate(0.35 * u, (poseKey === 'wave' ? -0.60 : 1.35) * u);
        o.armR(ctx, u, style);
        ctx.restore();
      }
    }

    // 6. Head Bone (tilts & nods around neck pivot + follows actionMod.headTransform)
    let headPoseKey = poseKey;
    if (!isTurnView && o.eyes === 'happy' && poseKey !== 'laptop' && poseKey !== 'heart') {
      headPoseKey = 'heart';
    }
    const headRuns = isTurnView ? poseBones.head : (rig.poses[headPoseKey] || poseBones).head;
    const neckY = (poseKey === 'laptop' ? -3.85 : -4.68) * u;
    ctx.save();
    ctx.translate(hTr.dx, hTr.dy + neckY + headBob);
    ctx.rotate(headTilt * 0.45 + hTr.rot);
    ctx.translate(0, -neckY);
    drawBoneRuns(headRuns);
    drawFinEarBlueBows();

    // Layer surgical pixel-art emotion details directly at the exact eye/mouth coordinates
    // across front, q, and side views, including smooth `squint` transition blinks & all 31 emotions!
    const faceOffsetY = (poseKey === 'laptop' ? 0.85 : 0) * u;
    if (!isTurnView || view === 'q' || view === 'side') {
      const vxShift = view === 'side' ? 0.36 * u : (view === 'q' ? 0.20 * u : 0);
      ctx.save();
      ctx.translate(vxShift, faceOffsetY);
      const eLx = -0.60 * u, eRx = (view === 'side' ? 0.46 : 0.56) * u, eY = -5.82 * u;

      const drawPixelStarEye = (ex, ey) => {
        ctx.fillStyle = '#FACC15';
        ctx.fillRect(ex - 2.2 * cell, ey - 0.5 * cell, 4.4 * cell, cell);
        ctx.fillRect(ex - 0.5 * cell, ey - 2.2 * cell, cell, 4.4 * cell);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(ex - 0.8 * cell, ey - 0.8 * cell, 1.6 * cell, 1.6 * cell);
      };

      const drawPixelHeartEye = (ex, ey) => {
        ctx.fillStyle = '#FF4D6D';
        ctx.fillRect(ex - 2.0 * cell, ey - 1.5 * cell, 1.8 * cell, 1.8 * cell);
        ctx.fillRect(ex + 0.2 * cell, ey - 1.5 * cell, 1.8 * cell, 1.8 * cell);
        ctx.fillRect(ex - 1.6 * cell, ey - 0.2 * cell, 3.2 * cell, 1.6 * cell);
        ctx.fillRect(ex - 0.8 * cell, ey + 1.0 * cell, 1.6 * cell, 1.2 * cell);
      };

      const blinkCycle = (t * 0.85 + (o.seed || 0) * 1.3) % 3.4;
      const autoBlink = (o.eyes === 'open' || !o.eyes) && (
        blinkCycle < 0.10 || (blinkCycle > 0.22 && blinkCycle < 0.29 && (Math.floor(t / 3.4) % 2 === 0))
      );
      const sqz = clamp(o.squint || (autoBlink ? 0.92 : 0), 0, 1);
      // Subtle living pupil saccade highlight when eyes are open
      if (!sqz && (!o.eyes || o.eyes === 'open')) {
        const sacX = Math.round(Math.sin(t * 1.7) * 0.6) * cell;
        const sacY = Math.round(Math.cos(t * 1.3) * 0.4) * cell;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(eLx - 0.08 * u + sacX, eY - 0.14 * u + sacY, 1.2 * cell, 1.2 * cell);
        ctx.fillRect(eRx - 0.08 * u + sacX, eY - 0.14 * u + sacY, 1.2 * cell, 1.2 * cell);
      }

      if (sqz > 0.45) {
        // Smooth transition blink / squint across emotion seams!
        ctx.fillStyle = C.skin;
        ctx.fillRect(eLx - 0.27 * u, eY - 0.26 * u, 0.54 * u, 0.48 * u);
        ctx.fillRect(eRx - 0.27 * u, eY - 0.26 * u, 0.54 * u, 0.48 * u);
        ctx.fillStyle = C.eyeLash;
        ctx.fillRect(eLx - 0.26 * u, eY - 0.02 * u, 0.52 * u, 0.08 * u);
        ctx.fillRect(eRx - 0.26 * u, eY - 0.02 * u, 0.52 * u, 0.08 * u);
      } else if (o.eyes === 'spark') {
        drawPixelStarEye(eLx, eY);
        drawPixelStarEye(eRx, eY);
      } else if (o.eyes === 'heart') {
        drawPixelHeartEye(eLx, eY);
        drawPixelHeartEye(eRx, eY);
      } else if (o.eyes === 'lids' || o.eyes === 'dead') {
        ctx.fillStyle = C.skin;
        ctx.fillRect(eLx - 0.26 * u, eY - 0.24 * u, 0.52 * u, 0.20 * u);
        ctx.fillRect(eRx - 0.26 * u, eY - 0.24 * u, 0.52 * u, 0.20 * u);
        ctx.fillStyle = C.eyeLash;
        ctx.fillRect(eLx - 0.28 * u, eY - 0.05 * u, 0.56 * u, 0.07 * u);
        ctx.fillRect(eRx - 0.28 * u, eY - 0.05 * u, 0.56 * u, 0.07 * u);
      } else if (o.eyes === 'cry') {
        ctx.fillStyle = '#38BDF8';
        ctx.fillRect(eLx - 2.6 * cell, eY + 1.0 * cell, 1.6 * cell, 2.8 * cell);
        ctx.fillRect(eRx + 1.2 * cell, eY + 1.0 * cell, 1.6 * cell, 2.8 * cell);
        ctx.fillStyle = '#E0F2FE';
        ctx.fillRect(eLx - 2.2 * cell, eY + 1.2 * cell, 0.8 * cell, 1.2 * cell);
        ctx.fillRect(eRx + 1.4 * cell, eY + 1.2 * cell, 0.8 * cell, 1.2 * cell);
      } else if (o.eyes === 'angry') {
        inkLine(ctx, [[eLx - 0.24 * u, eY - 0.34 * u], [eLx + 0.22 * u, eY - 0.18 * u]], 1.5, C.ink, 'ink', 0);
        inkLine(ctx, [[eRx + 0.24 * u, eY - 0.34 * u], [eRx - 0.22 * u, eY - 0.18 * u]], 1.5, C.ink, 'ink', 0);
      } else if (o.eyes === 'shades') {
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(eLx - 0.34 * u, eY - 0.18 * u, 0.68 * u, 0.36 * u);
        ctx.fillRect(eRx - 0.34 * u, eY - 0.18 * u, 0.68 * u, 0.36 * u);
        ctx.fillRect(eLx + 0.30 * u, eY - 0.08 * u, (eRx - eLx) - 0.60 * u, 0.09 * u);
        ctx.fillStyle = '#E2E8F0';
        ctx.fillRect(eLx - 0.22 * u, eY - 0.12 * u, 0.18 * u, 0.08 * u);
        ctx.fillRect(eRx - 0.22 * u, eY - 0.12 * u, 0.18 * u, 0.08 * u);
      } else if (o.eyes === 'dizzy') {
        EYES.dizzy(ctx, eLx, eY, u, 0.9, o);
        EYES.dizzy(ctx, eRx, eY, u, 0.9, o);
      }

      // Expressive mouth variations (`o`, `waveO`, `cat`, `pout`, `flat`, `grin`, `smirk`) & lip-sync talking
      const mKey = o.talking ? ((Math.floor(t * 9) % 2 === 0) ? 'openSmile' : 'o') : (o.mouth || 'openSmile');
      if (poseKey !== 'panic') {
        if (mKey === 'o' || mKey === 'waveO') {
          ctx.fillStyle = C.skin;
          ctx.fillRect(-1.8 * cell, -54.2 * cell, 3.6 * cell, 2.8 * cell);
          ctx.fillStyle = '#B84A52';
          ctx.fillRect(-1.3 * cell, -53.8 * cell, 2.6 * cell, 2.2 * cell);
          ctx.fillStyle = '#FF9690';
          ctx.fillRect(-0.8 * cell, -53.2 * cell, 1.6 * cell, 1.2 * cell);
        } else if (mKey === 'pout' || mKey === 'flat') {
          ctx.fillStyle = C.skin;
          ctx.fillRect(-2.0 * cell, -54.2 * cell, 4.0 * cell, 2.8 * cell);
          ctx.fillStyle = '#B84A52';
          ctx.fillRect(-1.5 * cell, -53.0 * cell, 3.0 * cell, 0.9 * cell);
        } else if (mKey === 'cat' || mKey === 'smirk') {
          ctx.fillStyle = C.skin;
          ctx.fillRect(-2.0 * cell, -54.2 * cell, 4.0 * cell, 2.8 * cell);
          ctx.fillStyle = '#B84A52';
          ctx.fillRect(-1.8 * cell, -53.2 * cell, 1.4 * cell, 0.9 * cell);
          ctx.fillRect(0.4 * cell, -53.2 * cell, 1.4 * cell, 0.9 * cell);
          ctx.fillRect(-0.5 * cell, -53.8 * cell, 1.0 * cell, 0.9 * cell);
        }
      }
      ctx.restore();
    }

    // Overhead Emotes & Pixel-Art Hats
    ctx.save();
    ctx.translate(0, faceOffsetY);
    if (o.emote && EMOTES[o.emote]) {
      EMOTES[o.emote](ctx, 0, -8.85 * u, u, o.emoteK ?? 1, t);
    }
    if (o.hat && o.hat !== 'none' && o.hat !== 'maid' && o.hat !== 'maidHeadband') {
      drawHat(ctx, u, t, o.hat, VIEW_VX[view] || 0);
    }
    ctx.restore();

    ctx.restore();
  }

  // ==========================================================================
  // MODE B: Exact-Proportion Vector/Brush Multi-Polygon Anatomy
  // Uses CORE.paint & CORE.inkLine with exact 42868804351-1-192.mp4 landmarks
  // ==========================================================================
  function drawVectorConstruct(ctx, u, t, o, poseKey, view, vx, isBack, isQBack, headBob, headTilt, style) {
    const isTailSit = poseKey === 'laptop';
    const tailScale = clamp(o.tailScale === undefined ? 1 : o.tailScale, 0.5, 1.1);
    const sitDrop = isTailSit ? 0.85 * u : 0;

    ctx.save();
    ctx.translate(0, sitDrop);

    // 1. Wide Wavy Back Hair Cascade (4-tier blue-to-cyan gradient waves, ±3.82u wide!)
    drawVectorBackHair(ctx, u, t, vx);

    // 2. Glossy Whale Tail (behind skirt for standing poses)
    // Use a consistent left hip socket across emotional poses so the fluke cannot teleport.
    const tailMode = o.tailMode || (isTailSit ? 'cushion' : 'left');
    if (!isTailSit) {
      const tailAnchorX = tailMode === 'highRight' || tailMode === 'lowRight' ? 1.0 * u : -1.0 * u;
      const tailAnchorY = -1.8 * u;
      ctx.save();
      ctx.translate(tailAnchorX, tailAnchorY);
      ctx.scale(tailScale, tailScale);
      ctx.translate(-tailAnchorX, -tailAnchorY);
      drawVectorTail(ctx, u, t, tailMode);
      ctx.restore();
    }

    // 3. Legs, Ruffled White Lace Socks & Dark-Navy Mary-Jane Shoes
    const walkW = o.walk || 0;
    const hipL = o.hipL !== undefined ? o.hipL : (walkW ? Math.sin(walkW) * 0.30 : 0);
    const hipR = o.hipR !== undefined ? o.hipR : (walkW ? -Math.sin(walkW) * 0.30 : 0);
    if (!isTailSit) {
      drawVectorLeg(ctx, u, -0.74 * u + vx * 0.15 * u, -1.42 * u, hipL, false);
      drawVectorLeg(ctx, u,  0.74 * u + vx * 0.15 * u, -1.42 * u, hipR, true);
    }

    // 4. Torso: Bodice, Twin White Ruffled Suspenders, High Collar, Navy Bow,
    //    Flared Dark-Navy Pleated Skirt, Gold Bows, Double Petticoat & Whale Apron
    drawVectorTorsoAndSkirt(ctx, u, t, vx, isBack || isQBack, headBob);

    // 4b. Giant U-curled Whale Tail Cushion (Pose 4: laptop)
    if (isTailSit) {
      ctx.save();
      ctx.translate(0, -sitDrop);
      drawVectorTailCushion(ctx, u, t);
      ctx.restore();
    }

    // 5. Puffed Navy Sleeves, Ruffled White Cuffs & Articulated Arms / Laptop
    drawVectorArms(ctx, u, t, o, poseKey, headBob, style);

    // 6. Chibi Head: Royal-Blue Hair Dome (-2.02u..+2.02u), Crescent White Ruffled Headband
    //    down to -6.22u, Blue Side Bows, Whale Fin-Ears, Narrow 2.48u Peach Skin Face,
    //    Large Anime Eyes (±0.64u, -5.66u), Cyan Cheek Locks, Bangs & Looped Ahoge
    ctx.save();
    ctx.translate(vx * 0.22 * u, -4.68 * u + headBob);
    ctx.rotate(headTilt);
    ctx.translate(0, 4.68 * u);

    drawVectorHeadBase(ctx, u, t, vx, isBack, isQBack, o.hat);
    if (!isBack && !isQBack) {
      drawVectorFaceFeatures(ctx, u, t, o, vx, false);
    }
    drawVectorForeheadBangs(ctx, u, t, vx, isBack);

    if (o.emote && EMOTES[o.emote]) {
      EMOTES[o.emote](ctx, vx * 0.22 * u, -8.85 * u, u, o.emoteK ?? 1, t);
    }
    if (o.hat && o.hat !== 'none' && o.hat !== 'maid' && o.hat !== 'maidHeadband') {
      drawHat(ctx, u, t, o.hat, vx);
    }
    ctx.restore();

    ctx.restore();
  }

  function drawVectorBackHair(ctx, u, t, vx) {
    const w1 = Math.sin(t * 2.5) * 0.09 * u;
    const w2 = Math.cos(t * 2.1 + 1.1) * 0.11 * u;
    const offX = -vx * 0.22 * u;

    // Tier 1: Full outer wavy silhouette in Royal Blue
    const outer = [
      [offX - 2.05 * u, -6.55 * u],
      [offX - 2.68 * u + w1 * 0.3, -5.35 * u],
      [offX - 3.38 * u + w1 * 0.6, -4.30 * u],
      [offX - 3.76 * u + w1,       -3.45 * u],
      [offX - 3.58 * u + w2,       -2.65 * u],
      [offX - 3.18 * u + w1 * 0.7, -2.18 * u],
      [offX - 3.36 * u + w2,       -1.82 * u],
      [offX - 2.78 * u + w2 * 0.7, -1.36 * u],
      [offX - 2.12 * u,            -1.72 * u],
      [offX - 1.82 * u,            -1.42 * u],
      [offX,                       -1.55 * u],
      [offX + 1.82 * u,            -1.42 * u],
      [offX + 2.12 * u,            -1.72 * u],
      [offX + 2.78 * u - w2 * 0.7, -1.36 * u],
      [offX + 3.36 * u - w2,       -1.82 * u],
      [offX + 3.18 * u - w1 * 0.7, -2.18 * u],
      [offX + 3.58 * u - w2,       -2.65 * u],
      [offX + 3.76 * u - w1,       -3.45 * u],
      [offX + 3.38 * u - w1 * 0.6, -4.30 * u],
      [offX + 2.68 * u - w1 * 0.3, -5.35 * u],
      [offX + 2.05 * u,            -6.55 * u]
    ];
    paint(ctx, outer, { wash: C.hairMain, fill: C.hairDark, fillOp: 85, ink: C.ink, sw: 1.15, curv: 0.35 });

    // Tier 2: Mid Sky-Blue wavy locks with deeply scalloped V-wave top transition (no flat line!)
    const midTier = [
      [offX - 3.32 * u + w1 * 0.6, -4.35 * u],
      [offX - 3.72 * u + w1,       -3.45 * u],
      [offX - 3.55 * u + w2,       -2.65 * u],
      [offX - 3.15 * u + w1 * 0.7, -2.18 * u],
      [offX - 3.32 * u + w2,       -1.82 * u],
      [offX - 2.75 * u + w2 * 0.7, -1.38 * u],
      [offX - 1.85 * u,            -1.52 * u],
      [offX + 1.85 * u,            -1.52 * u],
      [offX + 2.75 * u - w2 * 0.7, -1.38 * u],
      [offX + 3.32 * u - w2,       -1.82 * u],
      [offX + 3.15 * u - w1 * 0.7, -2.18 * u],
      [offX + 3.55 * u - w2,       -2.65 * u],
      [offX + 3.72 * u - w1,       -3.45 * u],
      [offX + 3.32 * u - w1 * 0.6, -4.35 * u],
      [offX + 2.65 * u,            -3.55 * u],
      [offX + 2.15 * u,            -4.45 * u],
      [offX,                       -3.45 * u],
      [offX - 2.15 * u,            -4.45 * u],
      [offX - 2.65 * u,            -3.55 * u]
    ];
    paint(ctx, midTier, { wash: C.hairLight, fill: C.hairMid, fillOp: 95, ink: null, curv: 0.35 });

    // Tier 3: Luminous Aqua-Cyan lower wave curls with deep W-wave top transition
    const cyanTier = [
      [offX - 3.58 * u + w2,       -2.85 * u],
      [offX - 3.14 * u + w1 * 0.7, -2.18 * u],
      [offX - 3.32 * u + w2,       -1.82 * u],
      [offX - 2.75 * u + w2 * 0.7, -1.38 * u],
      [offX - 2.10 * u,            -1.70 * u],
      [offX - 1.80 * u,            -1.45 * u],
      [offX + 1.80 * u,            -1.45 * u],
      [offX + 2.10 * u,            -1.70 * u],
      [offX + 2.75 * u - w2 * 0.7, -1.38 * u],
      [offX + 3.32 * u - w2,       -1.82 * u],
      [offX + 3.14 * u - w1 * 0.7, -2.18 * u],
      [offX + 3.58 * u - w2,       -2.85 * u],
      [offX + 2.85 * u,            -2.15 * u],
      [offX + 2.35 * u,            -2.95 * u],
      [offX,                       -2.05 * u],
      [offX - 2.35 * u,            -2.95 * u],
      [offX - 2.85 * u,            -2.15 * u]
    ];
    paint(ctx, cyanTier, { wash: C.hairCyan, fill: C.hairGlow, fillOp: 80, ink: null, curv: 0.35 });

    // Re-stroke outer contour and internal flowing hair strands
    inkLine(ctx, outer.concat([outer[0]]), 1.15, C.ink, 'ink', 0.35);
    for (const side of [-1, 1]) {
      const sw = side < 0 ? w2 : -w2;
      inkLine(ctx, [
        [offX + side * 2.25 * u, -5.20 * u],
        [offX + side * 3.12 * u + sw * 0.5, -3.75 * u],
        [offX + side * 2.88 * u + sw * 0.7, -2.25 * u],
        [offX + side * 3.05 * u + sw * 0.8, -1.65 * u]
      ], 0.85, C.hairDark, 'ink', 0.45);
      inkLine(ctx, [
        [offX + side * 2.05 * u, -4.60 * u],
        [offX + side * 2.65 * u + sw * 0.4, -3.20 * u],
        [offX + side * 2.45 * u + sw * 0.5, -1.85 * u]
      ], 0.8, C.hairDark, 'ink', 0.45);
    }
  }

  function drawVectorTail(ctx, u, t, tailMode) {
    const wag = Math.sin(t * 3.4) * 0.14 * u;
    if (tailMode === 'highRight') {
      const tailPts = [
        [ 0.95 * u, -1.35 * u],
        [ 2.35 * u, -1.55 * u],
        [ 3.85 * u, -2.55 * u + wag * 0.3],
        [ 4.45 * u, -4.35 * u + wag * 0.6],
        [ 4.35 * u, -6.15 * u + wag],
        [ 4.85 * u, -6.95 * u + wag],
        [ 4.82 * u, -7.85 * u + wag],
        [ 3.95 * u, -7.45 * u + wag],
        [ 3.45 * u, -8.35 * u + wag],
        [ 2.75 * u, -7.85 * u + wag],
        [ 3.15 * u, -6.45 * u + wag * 0.8],
        [ 2.95 * u, -4.55 * u + wag * 0.5],
        [ 2.15 * u, -2.85 * u],
        [ 0.95 * u, -2.25 * u]
      ];
      paint(ctx, tailPts, { wash: C.tailDark, fill: C.tailMid, fillOp: 110, ink: C.ink, sw: 1.15, curv: 0.3 });
      return;
    }
    if (tailMode === 'lowRight') {
      const tailPts = [
        [ 0.85 * u, -1.15 * u],
        [ 2.15 * u, -0.65 * u],
        [ 3.35 * u, -0.85 * u + wag * 0.4],
        [ 3.95 * u, -1.65 * u + wag * 0.7],
        [ 4.12 * u, -2.75 * u + wag],
        [ 3.55 * u, -2.45 * u + wag],
        [ 3.35 * u, -3.25 * u + wag],
        [ 2.65 * u, -2.55 * u + wag * 0.8],
        [ 2.85 * u, -1.65 * u + wag * 0.5],
        [ 1.85 * u, -1.45 * u],
        [ 0.85 * u, -1.75 * u]
      ];
      paint(ctx, tailPts, { wash: C.tailDark, fill: C.tailMid, fillOp: 110, ink: C.ink, sw: 1.15, curv: 0.3 });
      return;
    }
    // Default left tail (wave pose)
    const tailPts = [
      [-0.85 * u, -1.05 * u],
      [-1.95 * u, -0.48 * u],
      [-3.05 * u, -0.78 * u + wag * 0.3],
      [-3.85 * u, -1.55 * u + wag * 0.6],
      [-3.95 * u, -2.25 * u + wag * 0.8],
      [-4.52 * u, -2.45 * u + wag],
      [-4.35 * u, -3.12 * u + wag],
      [-3.55 * u, -2.68 * u + wag],
      [-3.18 * u, -3.18 * u + wag],
      [-2.75 * u, -2.45 * u + wag * 0.8],
      [-3.15 * u, -1.85 * u + wag * 0.6],
      [-2.35 * u, -1.25 * u + wag * 0.3],
      [-0.95 * u, -1.65 * u]
    ];
    paint(ctx, tailPts, { wash: C.tailDark, fill: C.tailMid, fillOp: 110, ink: C.ink, sw: 1.15, curv: 0.3 });
  }

  function drawVectorTailCushion(ctx, u, t) {
    const wag = Math.sin(t * 3.2) * 0.08 * u;
    const cushionPts = [
      [ 1.65 * u, -2.55 * u],
      [ 3.15 * u, -2.05 * u],
      [ 3.45 * u, -1.05 * u],
      [ 2.95 * u, -0.18 * u],
      [ 1.35 * u,  0.04 * u],
      [-0.65 * u,  0.02 * u],
      [-2.05 * u, -0.45 * u],
      [-2.55 * u, -1.05 * u + wag * 0.5],
      [-3.32 * u, -0.75 * u + wag],
      [-3.15 * u, -1.45 * u + wag],
      [-2.38 * u, -1.42 * u + wag],
      [-2.35 * u, -2.18 * u + wag],
      [-1.68 * u, -1.75 * u + wag * 0.7],
      [-1.65 * u, -1.05 * u],
      [-0.45 * u, -0.78 * u],
      [ 1.45 * u, -0.82 * u],
      [ 2.25 * u, -1.45 * u],
      [ 1.45 * u, -2.05 * u]
    ];
    paint(ctx, cushionPts, { wash: C.tailDark, fill: C.tailMid, fillOp: 115, ink: C.ink, sw: 1.2, curv: 0.3 });
  }

  function drawVectorLeg(ctx, u, hx, hy, angle, isRight) {
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(angle + (isRight ? -0.03 : 0.03));

    // Bare thigh
    paint(ctx, rrPts(-0.22 * u, 0, 0.44 * u, 0.58 * u, 4, 0.4), { wash: C.skin, ink: C.ink, sw: 0.95 });
    // White ankle sock
    paint(ctx, rrPts(-0.23 * u, 0.52 * u, 0.46 * u, 0.60 * u, 4, 0.4), { wash: C.apronWhite, ink: C.ink, sw: 0.95 });
    // Ruffled lace sock cuff
    for (let i = -1; i <= 1; i++) {
      paint(ctx, ellPts(i * 0.14 * u, 0.54 * u, 0.11 * u, 0.08 * u, 8), { wash: C.apronWhite, ink: C.ink, sw: 0.75 });
    }
    // Dark-navy Mary-Jane shoe
    const shoeX = isRight ? 0.03 * u : -0.03 * u;
    paint(ctx, ellPts(shoeX, 1.24 * u, 0.30 * u, 0.19 * u, 14), { wash: C.shoeNavy, ink: C.ink, sw: 1.05 });
    paint(ctx, ellPts(0, 1.15 * u, 0.15 * u, 0.08 * u, 10), { wash: C.apronWhite, ink: null });
    inkLine(ctx, [[-0.20 * u, 1.17 * u], [0.20 * u, 1.17 * u]], 1.2, C.shoeNavy, 'ink', 0);
    paint(ctx, ellPts(shoeX + (isRight ? 0.10 : -0.10) * u, 1.28 * u, 0.05 * u, 0.035 * u, 6), { wash: '#FFFFFF', ink: null });

    ctx.restore();
  }

  function drawVectorTorsoAndSkirt(ctx, u, t, vx, isBack, headBob) {
    const sway = Math.sin(t * 2.8) * 0.04 * u;

    // 1. Back white waist bow loops
    for (const s of [-1, 1]) {
      paint(ctx, [
        [s * 0.95 * u, -3.38 * u],
        [s * 1.48 * u, -3.62 * u],
        [s * 1.52 * u, -3.12 * u]
      ], { wash: C.apronWhite, ink: C.ink, sw: 0.9 });
    }

    // 2. Curved Double White Ruffled Petticoat Hem ((-2.22u, -1.95u) down to (0, -1.38u))
    const nFrills = 11;
    for (let i = 0; i <= nFrills; i++) {
      const p = (i / nFrills) * 2 - 1;
      const fx = p * 2.12 * u + sway;
      const fy = -1.42 * u - (p * p) * 0.52 * u;
      paint(ctx, ellPts(fx, fy, 0.28 * u, 0.19 * u, 10), { wash: C.apronWhite, ink: C.ink, sw: 0.9 });
    }

    // 3. Flared Dark-Navy Pleated Skirt
    const skirtPts = [];
    skirtPts.push([-1.05 * u, -3.42 * u]);
    skirtPts.push([ 1.05 * u, -3.42 * u]);
    skirtPts.push([ 1.68 * u + sway * 0.5, -2.75 * u]);
    skirtPts.push([ 2.25 * u + sway,       -2.05 * u]);
    for (let i = 8; i >= -8; i--) {
      const p = i / 8;
      skirtPts.push([p * 2.22 * u + sway, -1.52 * u - (p * p) * 0.52 * u]);
    }
    skirtPts.push([-2.25 * u + sway,       -2.05 * u]);
    skirtPts.push([-1.68 * u + sway * 0.5, -2.75 * u]);
    paint(ctx, skirtPts, { wash: C.dressDark, fill: C.dressMid, fillOp: 95, ink: C.ink, sw: 1.15, curv: 0.2 });

    // Gold trim arc & two Gold Ribbon Bows on skirt
    const goldArc = [];
    for (let i = -8; i <= 8; i++) {
      const p = i / 8;
      goldArc.push([p * 2.08 * u + sway, -1.66 * u - (p * p) * 0.48 * u]);
    }
    inkLine(ctx, goldArc, 1.0, C.gold, 'ink', 0.3);

    if (!isBack) {
      for (const s of [-1, 1]) {
        const bx = s * 1.45 * u + sway * 0.8, by = -2.08 * u;
        inkLine(ctx, [[bx - 0.16 * u, by - 0.08 * u], [bx + 0.16 * u, by + 0.08 * u]], 1.25, C.gold, 'ink', 0);
        inkLine(ctx, [[bx - 0.16 * u, by + 0.08 * u], [bx + 0.16 * u, by - 0.08 * u]], 1.25, C.gold, 'ink', 0);
      }

      // 4. Rounded U-Shaped White Waist Apron (x = -1.22u..+1.22u, y = -3.40u..-2.02u)
      for (let i = 0; i <= 10; i++) {
        const ang = (i / 10) * Math.PI;
        const lx = Math.cos(ang) * 1.24 * u + sway * 0.5;
        const ly = -2.95 * u + Math.sin(ang) * 0.96 * u;
        paint(ctx, ellPts(lx, ly, 0.17 * u, 0.15 * u, 8), { wash: C.apronWhite, ink: C.ink, sw: 0.8 });
      }
      const apronPts = [
        [-1.08 * u, -3.40 * u],
        [ 1.08 * u, -3.40 * u],
        [ 1.22 * u + sway * 0.4, -2.85 * u],
        [ 1.02 * u + sway * 0.5, -2.28 * u],
        [ 0.52 * u + sway * 0.5, -2.02 * u],
        [-0.52 * u + sway * 0.5, -2.02 * u],
        [-1.02 * u + sway * 0.5, -2.28 * u],
        [-1.22 * u + sway * 0.4, -2.85 * u]
      ];
      paint(ctx, apronPts, { wash: C.apronWhite, fill: C.apronShade, fillOp: 55, ink: C.ink, sw: 1.0, curv: 0.25 });

      // Blue Spouting Whale Logo on Apron at (0, -2.46u)
      const wx = sway * 0.45, wy = -2.46 * u;
      paint(ctx, ellPts(wx - 0.04 * u, wy, 0.22 * u, 0.14 * u, 12), { wash: C.whaleLogo, ink: null });
      paint(ctx, [[wx + 0.14 * u, wy], [wx + 0.28 * u, wy - 0.14 * u], [wx + 0.24 * u, wy + 0.04 * u]], { wash: C.whaleLogo, ink: null });
      inkLine(ctx, [[wx - 0.06 * u, wy - 0.18 * u], [wx - 0.12 * u, wy - 0.26 * u]], 1.0, C.bowBlue, 'ink', 0);
      inkLine(ctx, [[wx + 0.02 * u, wy - 0.18 * u], [wx + 0.08 * u, wy - 0.26 * u]], 1.0, C.bowBlue, 'ink', 0);
    }

    // 5. Dark-Navy Bodice & Twin White Ruffled Suspenders
    paint(ctx, [
      [-0.88 * u, -4.45 * u + headBob * 0.3],
      [ 0.88 * u, -4.45 * u + headBob * 0.3],
      [ 1.02 * u, -3.38 * u],
      [-1.02 * u, -3.38 * u]
    ], { wash: C.dressDark, fill: C.dressMid, fillOp: 90, ink: C.ink, sw: 1.05 });

    paint(ctx, rrPts(-1.06 * u, -3.49 * u, 2.12 * u, 0.18 * u, 3, 0.4), { wash: C.apronWhite, ink: C.ink, sw: 0.85 });

    if (!isBack) {
      for (const s of [-1, 1]) {
        const sx = s * 0.52 * u;
        for (let ry = -4.25; ry <= -3.55; ry += 0.22) {
          paint(ctx, ellPts(sx + s * 0.14 * u, ry * u, 0.11 * u, 0.10 * u, 8), { wash: C.apronWhite, ink: C.ink, sw: 0.7 });
        }
        paint(ctx, rrPts(sx - 0.12 * u, -4.38 * u, 0.24 * u, 0.96 * u, 2, 0.3), { wash: C.apronWhite, ink: C.ink, sw: 0.85 });
        paint(ctx, ellPts(s * 0.34 * u, -3.62 * u, 0.045 * u, 0.045 * u, 6), { wash: C.gold, ink: null });
      }

      // High White Collar & Dark-Navy Throat Bow
      paint(ctx, rrPts(-0.58 * u, -4.64 * u + headBob * 0.4, 1.16 * u, 0.36 * u, 3, 0.4), { wash: C.apronWhite, ink: C.ink, sw: 0.95 });
      const by = -4.32 * u + headBob * 0.4;
      paint(ctx, [[0, by], [-0.42 * u, by - 0.18 * u], [-0.38 * u, by + 0.18 * u]], { wash: C.dressDark, ink: C.ink, sw: 0.85 });
      paint(ctx, [[0, by], [ 0.42 * u, by - 0.18 * u], [ 0.38 * u, by + 0.18 * u]], { wash: C.dressDark, ink: C.ink, sw: 0.85 });
      paint(ctx, ellPts(0, by, 0.11 * u, 0.11 * u, 8), { wash: C.dressMid, ink: C.ink, sw: 0.85 });
    }
  }

  function drawVectorArms(ctx, u, t, o, poseKey, headBob, style) {
    const sy = -4.12 * u + headBob * 0.4;

    if (poseKey === 'laptop') {
      drawVectorArmSeg(ctx, u, -1.05 * u, sy, -1.45 * u, -3.15 * u);
      drawVectorArmSeg(ctx, u,  1.05 * u, sy,  0.45 * u, -2.95 * u);
      // 3D Silver Laptop on lap
      paint(ctx, [
        [-1.55 * u, -2.55 * u],
        [ 0.42 * u, -2.85 * u],
        [-0.25 * u, -2.22 * u],
        [-2.05 * u, -2.42 * u]
      ], { wash: '#D8E2F0', ink: C.ink, sw: 1.0 });
      paint(ctx, [
        [-2.95 * u, -4.15 * u],
        [-1.25 * u, -4.25 * u],
        [-0.85 * u, -2.45 * u],
        [-2.35 * u, -2.38 * u]
      ], { wash: '#F5F8FD', ink: C.ink, sw: 1.1 });
      paint(ctx, ellPts(-1.85 * u, -3.32 * u, 0.12 * u, 0.14 * u, 10), { wash: '#FFFFFF', ink: null });
      return;
    }

    if (poseKey === 'heart') {
      drawVectorArmBent(ctx, u, -1.05 * u, sy, -1.42 * u, -3.55 * u, -0.26 * u, -3.92 * u);
      drawVectorArmBent(ctx, u,  1.05 * u, sy,  1.42 * u, -3.55 * u,  0.26 * u, -3.92 * u);
      paint(ctx, heartPts(0, -3.95 * u, 0.28 * u), { wash: '#FF6B8B', ink: C.ink, sw: 0.75 });
      return;
    }

    if (poseKey === 'panic') {
      drawVectorArmBent(ctx, u, -1.05 * u, sy, -1.45 * u, -3.65 * u, -0.78 * u, -4.88 * u);
      drawVectorArmBent(ctx, u,  1.05 * u, sy,  1.45 * u, -3.65 * u,  0.78 * u, -4.88 * u);
      return;
    }

    if (poseKey === 'wink') {
      drawVectorArmBent(ctx, u, -1.05 * u, sy, -1.52 * u, -3.58 * u, -1.12 * u, -3.05 * u);
      drawVectorArmBent(ctx, u,  1.05 * u, sy,  1.52 * u, -3.58 * u,  1.12 * u, -3.05 * u);
      return;
    }

    const aL = o.aL !== undefined ? o.aL : -0.45;
    const aR = o.aR !== undefined ? o.aR : (0.95 + Math.sin(t * 6.5) * 0.14);
    const hxL = -1.05 * u - Math.cos(aL) * 0.92 * u;
    const hyL = sy - Math.sin(aL) * 0.92 * u;
    const hxR =  1.05 * u + Math.cos(aR) * 1.12 * u;
    const hyR = sy - Math.sin(aR) * 1.12 * u;

    drawVectorArmSeg(ctx, u, -1.05 * u, sy, hxL, hyL, o.armL, style);
    drawVectorArmSeg(ctx, u,  1.05 * u, sy, hxR, hyR, o.armR, style);
  }

  function drawVectorArmBent(ctx, u, sx, sy, ex, ey, hx, hy) {
    paint(ctx, ellPts(sx, sy, 0.28 * u, 0.26 * u, 10), { wash: C.dressDark, ink: C.ink, sw: 0.95 });
    inkLine(ctx, [[sx, sy], [ex, ey], [hx, hy]], 3.6, C.ink, 'ink', 0.25);
    inkLine(ctx, [[sx, sy], [ex, ey], [hx, hy]], 2.6, C.dressDark, 'ink', 0.25);
    const wx = ex + (hx - ex) * 0.72, wy = ey + (hy - ey) * 0.72;
    paint(ctx, ellPts(wx, wy, 0.20 * u, 0.15 * u, 10), { wash: C.apronWhite, ink: C.ink, sw: 0.8 });
    paint(ctx, ellPts(hx, hy, 0.18 * u, 0.16 * u, 10), { wash: C.skin, ink: C.ink, sw: 0.85 });
  }

  function drawVectorArmSeg(ctx, u, sx, sy, hx, hy, propFn, style) {
    paint(ctx, ellPts(sx, sy, 0.30 * u, 0.28 * u, 10), { wash: C.dressDark, ink: C.ink, sw: 1.0 });
    const dx = hx - sx, dy = hy - sy;
    const ang = Math.atan2(dy, dx);
    const nx = -Math.sin(ang) * 0.18 * u, ny = Math.cos(ang) * 0.18 * u;
    const wx = sx + dx * 0.78, wy = sy + dy * 0.78;
    paint(ctx, [
      [sx + nx, sy + ny],
      [wx + nx * 1.15, wy + ny * 1.15],
      [wx - nx * 1.15, wy - ny * 1.15],
      [sx - nx, sy - ny]
    ], { wash: C.dressDark, ink: C.ink, sw: 1.0 });
    paint(ctx, ellPts(wx, wy, 0.22 * u, 0.16 * u, 10), { wash: C.apronWhite, ink: C.ink, sw: 0.85 });
    paint(ctx, ellPts(hx, hy, 0.19 * u, 0.17 * u, 10), { wash: C.skin, ink: C.ink, sw: 0.9 });

    if (typeof propFn === 'function') {
      ctx.save();
      ctx.translate(hx, hy);
      propFn(ctx, u, style);
      ctx.restore();
    }
  }

  function drawVectorHeadBase(ctx, u, t, vx, isBack, isQBack, hat) {
    const earWag = Math.sin(t * 3.1) * 0.05 * u;

    // 1. Horizontal Dark-Navy Whale Pectoral-Fin Ears (±1.92u .. ±3.45u, y = -6.05u .. -5.25u)
    for (const s of [-1, 1]) {
      const ew = s < 0 ? earWag : -earWag;
      paint(ctx, [
        [s * 1.95 * u, -5.55 * u],
        [s * 2.55 * u, -5.25 * u + ew * 0.5],
        [s * 3.25 * u, -5.32 * u + ew],
        [s * 3.42 * u, -5.58 * u + ew],
        [s * 2.05 * u, -5.78 * u]
      ], { wash: C.earFrill, ink: C.ink, sw: 0.9, curv: 0.25 });

      paint(ctx, [
        [s * 1.92 * u, -6.05 * u],
        [s * 2.75 * u, -5.92 * u + ew * 0.5],
        [s * 3.45 * u, -5.58 * u + ew],
        [s * 2.65 * u, -5.45 * u + ew * 0.5],
        [s * 1.92 * u, -5.65 * u]
      ], { wash: C.earDark, fill: C.earMid, fillOp: 110, ink: C.ink, sw: 1.05, curv: 0.25 });
    }

    // 2. Deep Crescent White Ruffled Maid Headband hugging upper head dome (-2.02u..+2.02u)
    if (!hat || hat !== 'none') {
      const nScallops = 16;
      for (let i = 0; i <= nScallops; i++) {
        const ang = Math.PI * (0.05 + 0.90 * (i / nScallops));
        const rx = -Math.cos(ang) * 1.98 * u;
        const ry = -6.48 * u - Math.sin(ang) * 1.98 * u;
        paint(ctx, ellPts(rx, ry, 0.24 * u, 0.21 * u, 10), { wash: C.apronWhite, ink: C.ink, sw: 0.85 });
      }
      const bandArc = [];
      for (let i = 0; i <= 14; i++) {
        const ang = Math.PI * (0.06 + 0.88 * (i / 14));
        bandArc.push([-Math.cos(ang) * 1.84 * u, -6.48 * u - Math.sin(ang) * 1.84 * u]);
      }
      inkLine(ctx, bandArc, 1.6, C.dressDark, 'ink', 0.3);
    }

    // 3. Royal-Blue Head Hair Dome (width = 3.92u, y = -8.32u .. -4.80u)
    paint(ctx, ellPts(0, -6.54 * u, 1.94 * u, 1.74 * u, 24), { wash: C.hairMain, fill: C.hairDark, fillOp: 85, ink: C.ink, sw: 1.15 });

    // 4. Light-Blue Side Bows at temples (±2.02u, -6.18u)
    for (const s of [-1, 1]) {
      const bx = s * 2.02 * u, by = -6.18 * u;
      paint(ctx, ellPts(bx - s * 0.14 * u, by - 0.10 * u, 0.18 * u, 0.11 * u, 8), { wash: C.bowBlue, ink: C.ink, sw: 0.8 });
      paint(ctx, ellPts(bx + s * 0.16 * u, by + 0.06 * u, 0.18 * u, 0.11 * u, 8), { wash: C.bowBlue, ink: C.ink, sw: 0.8 });
      paint(ctx, ellPts(bx, by, 0.09 * u, 0.09 * u, 8), { wash: C.bowBlueHi, ink: C.ink, sw: 0.75 });
    }

    // 5. Delicate Chibi Peach Skin Face (width = 2.60u: x = -1.30u .. +1.30u, y = -6.40u .. -4.70u)
    if (!isBack && !isQBack) {
      const cx = vx * 0.25 * u;
      const facePts = [
        [cx - 1.18 * u, -6.40 * u],
        [cx + 1.18 * u, -6.40 * u],
        [cx + 1.30 * u, -5.65 * u],
        [cx + 1.28 * u, -5.22 * u],
        [cx + 0.96 * u, -4.90 * u],
        [cx + 0.36 * u, -4.72 * u],
        [cx,            -4.69 * u],
        [cx - 0.36 * u, -4.72 * u],
        [cx - 0.96 * u, -4.90 * u],
        [cx - 1.28 * u, -5.22 * u],
        [cx - 1.30 * u, -5.65 * u]
      ];
      paint(ctx, facePts, { wash: C.skin, fill: C.skinShadow, fillOp: 35, ink: C.ink, sw: 1.05, curv: 0.3 });
    }
  }

  function drawVectorForeheadBangs(ctx, u, t, vx, isBack) {
    if (isBack) return;
    const cx = vx * 0.20 * u;

    // 1. Two Continuous S-Curved Cheek Locks with Glowing Aqua-Cyan Tips (±1.32u)
    for (const s of [-1, 1]) {
      const lockFull = [
        [cx + s * 1.18 * u, -6.25 * u],
        [cx + s * 1.66 * u, -5.55 * u],
        [cx + s * 1.54 * u, -4.75 * u],
        [cx + s * 1.32 * u, -4.18 * u],
        [cx + s * 0.96 * u, -4.08 * u],
        [cx + s * 1.08 * u, -4.65 * u],
        [cx + s * 1.22 * u, -5.35 * u]
      ];
      paint(ctx, lockFull, { wash: C.hairMain, ink: C.ink, sw: 0.9, curv: 0.3 });

      const lockTip = [
        [cx + s * 1.15 * u, -4.95 * u],
        [cx + s * 1.52 * u, -4.75 * u],
        [cx + s * 1.32 * u, -4.18 * u],
        [cx + s * 0.96 * u, -4.08 * u],
        [cx + s * 1.06 * u, -4.58 * u]
      ];
      paint(ctx, lockTip, { wash: C.hairCyan, fill: C.hairLight, fillOp: 85, ink: C.ink, sw: 0.85, curv: 0.3 });
    }

    // 2. Full Tapered Royal-Blue Forehead Bangs (-8.30u down to -5.36u right over the eyebrows/eyes!)
    const bangs = [
      [cx - 1.82 * u, -6.35 * u],
      [cx - 1.52 * u, -7.68 * u],
      [cx - 0.82 * u, -8.22 * u],
      [cx,            -8.32 * u],
      [cx + 0.82 * u, -8.22 * u],
      [cx + 1.52 * u, -7.68 * u],
      [cx + 1.82 * u, -6.35 * u],
      [cx + 1.34 * u, -5.42 * u],
      [cx + 1.02 * u, -6.02 * u],
      [cx + 0.56 * u, -5.38 * u],
      [cx + 0.28 * u, -5.98 * u],
      [cx,            -5.34 * u],
      [cx - 0.28 * u, -5.98 * u],
      [cx - 0.56 * u, -5.38 * u],
      [cx - 1.02 * u, -6.02 * u],
      [cx - 1.34 * u, -5.42 * u]
    ];
    paint(ctx, bangs, { wash: C.hairMain, fill: C.hairMid, fillOp: 95, ink: C.ink, sw: 1.05, curv: 0.22 });

    // Internal bang strand lines
    inkLine(ctx, [[cx - 0.42 * u, -7.75 * u], [cx - 0.54 * u, -5.45 * u]], 0.8, C.hairDark, 'ink', 0.3);
    inkLine(ctx, [[cx + 0.42 * u, -7.75 * u], [cx + 0.54 * u, -5.45 * u]], 0.8, C.hairDark, 'ink', 0.3);
    inkLine(ctx, [[cx, -7.95 * u], [cx, -5.40 * u]], 0.8, C.hairDark, 'ink', 0.3);

    // 3. Crown Halo Highlight Band at y = -7.02u
    paint(ctx, [
      [cx - 1.32 * u, -6.88 * u],
      [cx - 0.65 * u, -7.22 * u],
      [cx + 0.65 * u, -7.22 * u],
      [cx + 1.32 * u, -6.88 * u],
      [cx + 1.12 * u, -6.66 * u],
      [cx,            -6.96 * u],
      [cx - 1.12 * u, -6.66 * u]
    ], { wash: C.haloArc, ink: null, curv: 0.35 });

    // 4. Looped Top Ahoge (-8.35u .. -9.32u) emerging from crown over headband
    const ahogeSway = Math.sin(t * 3.8) * 0.08 * u;
    inkLine(ctx, [
      [cx - 0.15 * u, -8.32 * u],
      [cx - 0.68 * u + ahogeSway, -8.98 * u],
      [cx - 0.15 * u + ahogeSway, -9.32 * u],
      [cx + 0.35 * u + ahogeSway, -8.98 * u],
      [cx + 0.08 * u, -8.35 * u]
    ], 3.2, C.ink, 'ink', 0.45);
    inkLine(ctx, [
      [cx - 0.15 * u, -8.32 * u],
      [cx - 0.68 * u + ahogeSway, -8.98 * u],
      [cx - 0.15 * u + ahogeSway, -9.32 * u],
      [cx + 0.35 * u + ahogeSway, -8.98 * u],
      [cx + 0.08 * u, -8.35 * u]
    ], 2.1, C.hairMid, 'ink', 0.45);
  }

  function drawVectorFaceFeatures(ctx, u, t, o, vx, handsOnCheeks) {
    const cx = vx * 0.30 * u;
    const eyeY = -5.54 * u;
    const eyeSpan = 0.64 * u;

    // Cheek blush
    if (o.blush !== false) {
      paint(ctx, ellPts(cx - 0.84 * u, -5.20 * u, 0.23 * u, 0.11 * u, 10), { wash: C.blush, washOp: 120, ink: null });
      paint(ctx, ellPts(cx + 0.84 * u, -5.20 * u, 0.23 * u, 0.11 * u, 10), { wash: C.blush, washOp: 120, ink: null });
    }

    const eyeKey = o.eyes || 'open';
    const eyeFn = EYES[eyeKey] || EYES.open;
    eyeFn(ctx, cx - eyeSpan, eyeY, u, 1.06, o, false);
    eyeFn(ctx, cx + eyeSpan, eyeY, u, 1.06, o, true);

    // Eyebrows
    for (const s of [-1, 1]) {
      const bx = cx + s * eyeSpan, by = eyeY - 0.44 * u;
      const tilt = (eyeKey === 'angry' ? s * 0.09 : (eyeKey === 'cry' || eyeKey === 'wide' ? -s * 0.09 : 0)) * u;
      inkLine(ctx, [[bx - 0.20 * u, by - tilt], [bx + 0.20 * u, by + tilt]], 1.1, C.ink, 'ink', 0);
    }

    // Mouth at (cx, -5.04u)
    if (!handsOnCheeks) {
      const mKey = o.talking ? ((Math.floor(t * 9) % 2 === 0) ? 'openSmile' : 'o') : (o.mouth || 'openSmile');
      const mouthFn = MOUTHS[mKey] || MOUTHS.openSmile;
      mouthFn(ctx, cx, -5.04 * u, u);
    }
  }

  function drawHat(ctx, u, t, hat, vx) {
    const cell = u / 10;
    const gx0 = Math.round(vx * 2.2);
    const px = (gx, gy, gw, gh, col) => {
      ctx.fillStyle = col;
      ctx.fillRect((gx0 + gx - 0.5) * cell, (gy - 0.5) * cell, gw * cell + 0.35, gh * cell + 0.35);
    };

    if (hat === 'crown') {
      // Royal Gold Pixel Crown with Ruby/Sapphire Jewels
      px(-10, -88, 21, 3, '#182038');
      px(-10, -91, 3, 3, '#182038'); px(-2, -93, 5, 5, '#182038'); px(8, -91, 3, 3, '#182038');
      px(-9, -89, 19, 3, '#EAB308');
      px(-9, -88, 19, 1, '#CA8A04');
      px(-9, -92, 2, 3, '#FACC15'); px(-5, -90, 2, 2, '#FACC15');
      px(-1, -94, 3, 5, '#FDE047'); px(4, -90, 2, 2, '#FACC15');
      px(8, -92, 2, 3, '#FACC15');
      // Jewels
      px(-6, -88, 2, 2, '#38BDF8');
      px(0, -89, 2, 2, '#F43F5E');
      px(5, -88, 2, 2, '#38BDF8');
    } else if (hat === 'wizard') {
      // Starry Deep-Sea Wizard Cone Hat with Gold Buckle Band
      px(-16, -86, 33, 2, '#182038');
      px(-15, -87, 31, 2, '#312E81');
      px(-11, -90, 23, 3, '#3730A3');
      px(-8, -94, 17, 4, '#4338CA');
      px(-5, -98, 12, 4, '#4F46E5');
      px(-2, -101, 8, 3, '#6366F1');
      px(2, -103, 5, 2, '#818CF8');
      // Gold band & star buckle
      px(-11, -88, 23, 2, '#EAB308');
      px(-2, -89, 5, 3, '#FDE047');
      px(-3, -95, 2, 2, '#FDE047');
      px(3, -92, 2, 2, '#72E2F7');
    } else if (hat === 'hard' || hat === 'hardHat') {
      // Engineer Yellow Safety Hard Hat with Ridge & Stripe
      px(-15, -85, 31, 2, '#182038');
      px(-14, -86, 29, 2, '#CA8A04');
      px(-12, -90, 25, 4, '#EAB308');
      px(-10, -93, 21, 3, '#FACC15');
      px(-6, -95, 13, 2, '#FEF08A');
      px(-2, -95, 5, 8, '#FDE047');
      px(-3, -89, 7, 2, '#FFFFFF');
    } else if (hat === 'sweatband') {
      // Hachimaki Red Fighting Headband with Trailing Knot
      px(-18, -77, 36, 4, '#182038');
      px(-17, -76, 34, 3, '#EF4444');
      px(-10, -76, 20, 1, '#FCA5A5');
      px(-4, -76, 8, 2, '#FFFFFF');
      px(17, -75, 4, 2, '#DC2626');
      px(19, -73, 4, 2, '#EF4444');
    } else if (hat === 'diving') {
      // Deep-Sea Aqua Diving Goggles on Forehead
      px(-14, -79, 29, 6, '#182038');
      px(-13, -78, 12, 5, '#0284C7');
      px(2, -78, 12, 5, '#0284C7');
      px(-11, -77, 8, 3, '#7DD3FC');
      px(4, -77, 8, 3, '#7DD3FC');
      px(-10, -77, 3, 2, '#FFFFFF');
      px(5, -77, 3, 2, '#FFFFFF');
      px(-1, -77, 3, 2, '#334155');
    } else if (hat === 'headphones' || hat === 'headset') {
      // Gaming Cyan-Glow Earcups & Mic Boom
      for (const s of [-1, 1]) {
        px(s * 20 - 2, -64, 5, 9, '#182038');
        px(s * 20 - 1, -63, 4, 7, '#0284C7');
        px(s * 20, -62, 2, 5, '#72E2F7');
      }
      px(-19, -56, 6, 1, '#334155');
      px(-14, -55, 3, 2, '#38BDF8');
    } else if (hat === 'party') {
      // Festive Striped Party Cone + Pom-pom
      px(-7, -87, 15, 2, '#182038');
      px(-6, -90, 13, 3, '#EC4899');
      px(-5, -93, 11, 3, '#38BDF8');
      px(-3, -96, 7, 3, '#FACC15');
      px(-2, -99, 5, 3, '#EC4899');
      px(-2, -102, 5, 3, '#FEF08A');
    } else if (hat === 'halo') {
      // Glowing Golden Pixel Angel Halo
      px(-10, -94, 21, 2, '#CA8A04');
      px(-12, -93, 4, 2, '#FACC15');
      px(9, -93, 4, 2, '#FACC15');
      px(-10, -91, 21, 2, '#FDE047');
      px(-6, -91, 12, 1, '#FFFFFF');
    } else if (hat === 'top' || hat === 'topHat') {
      // Gentleman Silk Top Hat with Crimson Ribbon
      px(-14, -86, 29, 2, '#0F172A');
      px(-9, -98, 19, 12, '#1E293B');
      px(-7, -97, 5, 10, '#334155');
      px(-9, -89, 19, 2, '#E11D48');
      px(-2, -89, 4, 2, '#FACC15');
    } else if (hat === 'fedora') {
      // Detective Brown Fedora with Dark Band
      px(-16, -86, 33, 2, '#451A03');
      px(-15, -87, 31, 2, '#78350F');
      px(-10, -92, 21, 5, '#92400E');
      px(-7, -94, 15, 2, '#B45309');
      px(-10, -89, 21, 2, '#451A03');
    } else if (hat === 'flower') {
      // Sakura / Sea-Blossom Hairpin
      px(6, -86, 8, 8, '#182038');
      px(7, -87, 6, 3, '#F472B6');
      px(5, -84, 10, 4, '#FB7185');
      px(7, -81, 6, 3, '#F472B6');
      px(8, -84, 4, 4, '#FDE047');
    } else if (hat === 'cat') {
      // Cute Navy & Pink Neko Ears
      for (const s of [-1, 1]) {
        const cx = s * 11;
        px(cx - 4, -90, 8, 5, '#182038');
        px(cx - 3, -93, 6, 3, '#1E293B');
        px(cx - 2, -95, 4, 2, '#1E293B');
        px(cx - 2, -91, 4, 4, '#FDA4AF');
      }
    }
  }

  // OOP Wrapper Class for standalone studio/comparison scripts
  class WhaleGirl {
    constructor(opts = {}) {
      this.x = opts.x || 640;
      this.y = opts.y || 520;
      this.scale = opts.scale || 1.0;
      this.view = opts.view || 'front';
      this.emotion = opts.emotion || 'happy';
      this.hat = opts.hat || 'maid';
      this.style = opts.style || 'pixel';
      this.constructMode = opts.constructMode || null;
      this.poseOps = opts.poseOps || {};
    }
    draw(ctx, t = 0) {
      const u = 34 * this.scale;
      whaleGirl(ctx, this.x, this.y, u, Object.assign({}, feel(this.emotion, t), this.poseOps, {
        view: this.view,
        hat: this.hat,
        style: this.style,
        constructMode: this.constructMode,
        t
      }));
    }
  }

  const WHALE_GIRL = {
    whaleGirl,
    WhaleGirl,
    feel,
    emotions,
    move,
    turn,
    spinView,
    EMO,
    HATS,
    VIEWS,
    EYES,
    MOUTHS,
    EMOTES,
    PALETTE: C,
    ACTION_LIST: ACTIONS ? ACTIONS.ACTION_LIST : [],
    evaluateAction: ACTIONS ? ACTIONS.evaluateAction : null,
    pickAction: ACTIONS ? ACTIONS.pickAction : null,
    drawFatFish: ACTIONS ? ACTIONS.drawFatFish : null,
    renderActionsSheet: ACTIONS ? ACTIONS.renderActionsSheet : null
  };

  root.WHALE_GIRL = WHALE_GIRL;
  root.WhaleGirl = WhaleGirl;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = WHALE_GIRL;
  }
})(typeof window !== 'undefined' ? window : globalThis);
