// src/ch/c01_debut.js — Chapter 1 (0.0s – 8.5s):
// Modeled directly on JohnHeibel/PDoomVideo (src/ch/c01_lab.js) & ClaudeAnimationBase (src/scenes/demo.js).

(function (root) {
  const CORE = root.CORE || (typeof require !== 'undefined' ? require('../core.js') : {});
  const WHALE = root.WHALE_GIRL || (typeof require !== 'undefined' ? require('../whale_girl.js') : {});
  const CAST = root.CAST || (typeof require !== 'undefined' ? require('../cast.js') : {});
  const PROPS = root.PROPS || (typeof require !== 'undefined' ? require('../props.js') : {});
  const TIMELINE = root.TIMELINE || (typeof require !== 'undefined' ? require('../timeline.js') : {});

  const {
    W, H, TAU, PAL, clamp, lerp, seg, ease, easeIn, easeOut, backOut, hash, wob,
    boilSeed, jump, take, stroll, arcPt, shakeXY, mixCol,
    rectPts, ellPts, starPts, ribbon,
    paint, inkLine, camBegin, camEnd, glow, letter, sfx, brushWipe
  } = CORE;
  const { whaleGirl, emotions, move, turn } = WHALE;
  const { clawd, researcher, bionicPuppy, miniWhale, biliTvMascot, agentReachBot } = CAST;

  // ---------- Shot 1 (0.0s – 2.8s): Curtain Up at the Deep-Sea Theater Stage ----------
  function shotCurtainUp(ctx, t, lt, dur, style) {
    camBegin(ctx, W / 2, H / 2, 1 + 0.05 * ease(lt / dur), 0);
    PROPS.stageBack(ctx, t, { sunburst: true, spots: [[W / 2, PAL.cream], [300, PAL.whaleCyan], [W - 300, PAL.whaleCyan]], floorY: 545 });

    letter(ctx, '【DAY 0】人类把整个账号交给了 AI', W / 2, 155, 38, PAL.cream, { rot: -0.02 });
    letter(ctx, '从今天起，我说了算！', W / 2, 235, 58, PAL.gold, { rot: -0.02 + Math.sin(t * 6) * 0.015 });

    clawd(ctx, 230, 540, 12, { ...move('bounce', t, 1), hat: 'party', eyes: 'happy', mouth: 'smile', t });
    bionicPuppy(ctx, 355, 545, 13, { t });
    biliTvMascot(ctx, 925, 535, 13, { t });
    clawd(ctx, 1050, 540, 12, { ...move('wave', t, 2), flip: true, hat: 'top', eyes: 'wink', t });

    const hx = W / 2, hy = 548;
    const open = easeOut(seg(t, 0.32, 0.55));
    const rx = 135 * open, ry = 32 * open;
    if (open > 0.02) {
      boilSeed('trapdoor');
      paint(ctx, rectPts(hx - rx, hy - 95 * open, rx * 2, 95 * open, 2), {
        wash: PROPS.WOOD, fill: PROPS.WOOD_DK, fillOp: 80, ink: PAL.ink, sw: 1.1
      });
      paint(ctx, ellPts(hx, hy, rx, ry, 24), { wash: '#140D18', ink: PAL.ink, sw: 1.2 });
    }

    const rise = seg(t, 0.45, 0.88);
    if (rise > 0) {
      const m = move('wave', t);
      const md = emotions(t, [[0.45, 'surprised'], [0.75, 'excited'], [1.35, 'proud']]);
      const y = lerp(hy + 210, hy + 6, backOut(rise));
      whaleGirl(ctx, hx, y, 22, {
        ...md,
        ...m,
        dy: rise < 1 ? 0 : m.dy,
        sq: rise < 0.35 ? -0.2 : (md.sq || 0) + m.sq,
        noShadow: rise < 0.9,
        emote: 'spout',
        emoteK: seg(t, 0.8, 1.1),
        t
      });
    }

    if (open > 0.02 && rise < 0.92) {
      const lip = [];
      for (let i = 0; i <= 14; i++) {
        const a = (i / 14) * Math.PI;
        lip.push([hx + Math.cos(a) * rx, hy + Math.sin(a) * ry]);
      }
      paint(ctx, [...lip, [hx + rx + 20, H + 100], [hx - rx - 20, H + 100]], {
        wash: PROPS.WOOD, fill: PROPS.WOOD_DK, fillOp: 90, ink: null
      });
      inkLine(ctx, lip, 1.2, PAL.ink, 'ink', 0.4);
    }

    const age = t - 0.55;
    if (age > 0 && age < 1.8) {
      for (let i = 0; i < 18; i++) {
        boilSeed('conf' + i);
        const a = -Math.PI / 2 + (hash(i) - 0.5) * 2.3;
        const v = 380 + hash(i + 3) * 420;
        const cx = hx + Math.cos(a) * v * age;
        const cy = hy - 80 + Math.sin(a) * v * age + 750 * age * age;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(age * 8 + i);
        paint(ctx, rectPts(-8, -5, 16, 10), {
          wash: [PAL.rose, PAL.gold, PAL.whaleCyan, PAL.sap, PAL.violet][i % 5],
          ink: PAL.ink,
          sw: 0.5
        });
        ctx.restore();
      }
    }

    PROPS.stageFront(ctx, t, { curtain: 1 - easeOut(seg(t, 0.0, 0.65)) });
    camEnd(ctx);

    if (lt > dur - 0.28) {
      brushWipe(ctx, (lt - (dur - 0.28)) / 0.56, [PAL.indigo, PAL.whaleBlue, PAL.teal]);
    }
  }

  // ---------- Shot 2 (2.8s – 4.8s): "哈喽，大家！" — Studio Control Room & CRT Breakout ----------
  function shotStudioBreakout(ctx, t, lt, dur, style) {
    const e = ease(lt / dur);
    const jumpOut = t >= 3.55;
    const [sx, sy] = (t > 4.05 && t < 4.35) ? shakeXY(t, 7) : [0, 0];

    camBegin(ctx, lerp(640, 675, e) + sx, lerp(360, 335, e) + sy, lerp(1.0, 1.16, e), 0);
    PROPS.wall(ctx, '#1C2852');
    PROPS.windowPorthole(ctx, 195, 195, 92, t, true);
    PROPS.shelf(ctx, 945, 205, 260, 1);
    PROPS.shelf(ctx, 965, 335, 240, 7);
    PROPS.desk(ctx, 495);
    PROPS.lamp(ctx, 290, 495, 0.9, 1);

    const s = PROPS.monitor(ctx, 685, 325, 390, 315, { glow: 1, bright: 1.15 });

    if (!jumpOut) {
      const md = emotions(t, [[2.8, 'happy'], [3.2, 'excited']]);
      const m = move('wave', t);
      whaleGirl(ctx, s.x + s.w / 2, s.y + s.h - 14, 15.5, {
        ...md, ...m, noShadow: true, emote: 'music', t
      });
      PROPS.glass(ctx, s, t);
    } else {
      PROPS.glass(ctx, s, t);
      const rAge = t - 3.55;
      inkLine(ctx, ellPts(s.x + s.w / 2, s.y + s.h / 2, 40 + rAge * 140, 30 + rAge * 100, 20), 1.2, PAL.whaleCyan, 'inkfine', 0.5);

      const flightK = clamp((t - 3.55) / 0.52);
      const p0 = [s.x + s.w / 2, s.y + s.h - 14];
      const p1 = [685, 515];
      const [wx, wy] = arcPt(p0, p1, 135, easeOut(flightK));
      const u = lerp(15.5, 23.5, easeOut(flightK));
      const hop = jump(t, 3.55, 4.07, 1.2);
      const md = emotions(t, [[3.55, 'excited'], [4.07, 'happy']]);
      whaleGirl(ctx, wx, wy, u, {
        ...md,
        dy: hop.dy * 0.3,
        sq: hop.sq + (md.sq || 0),
        aL: 1.25 + 0.45 * Math.sin(t * 14),
        aR: 0.4,
        emote: 'spark',
        t
      });
      sfx(ctx, 'POP!', s.x + s.w / 2 + 95, s.y + 40, 34, PAL.gold, t - 3.55);
    }

    const mugBounce = t > 4.05 ? Math.max(0, Math.sin((t - 4.05) * 18) * Math.exp(-(t - 4.05) * 5) * 32) : 0;
    PROPS.mug(ctx, 930, 525 - mugBounce, 0.9, PAL.rose, mugBounce * 0.01, 1, t);

    const rx = 250 - e * 45, ry = 760, rs = 24;
    researcher(ctx, rx, ry, rs, {
      back: true, sit: true, noShadow: true,
      hairUp: jumpOut ? seg(t, 3.6, 3.9) : 0,
      dy: jumpOut ? take(t, 3.65, 0.8).dy : 0,
      sq: jumpOut ? take(t, 3.65, 0.8).sq : 0,
      emote: jumpOut ? '!' : null,
      emoteK: seg(t, 3.65, 3.9),
      t
    });

    camEnd(ctx);
    if (lt < 0.28) {
      brushWipe(ctx, 0.5 + lt / 0.56, [PAL.indigo, PAL.whaleBlue, PAL.teal]);
    }
  }

  // ---------- Shot 3 (4.8s – 6.0s): "我是来自深海的鲸鱼娘，" — Coral Reef Parade ----------
  function drawCoralHill(ctx, cx, cy, rx, ry, col, t, kelps = 0) {
    boilSeed('coralHill' + cx);
    paint(ctx, ellPts(cx, cy, rx, ry, 36, 2), {
      wash: col, fill: mixCol(col, PAL.night, 0.35), fillOp: 110, ink: PAL.ink, sw: 1.1
    });
    for (let i = 0; i < kelps; i++) {
      const a = -Math.PI / 2 + (hash(i + cx) - 0.5) * 1.4;
      const kx = cx + Math.cos(a) * rx;
      const ky = cy + Math.sin(a) * ry + 6;
      const sw = wob(t, 0.8, hash(i) * 3) * 14;
      const kCol = i % 2 ? PAL.teal : PAL.rose;
      paint(ctx, ribbon([[kx, ky], [kx + sw * 0.6, ky - 42], [kx - sw * 0.4, ky - 85]], 12, 4), {
        wash: kCol, ink: PAL.ink, sw: 0.7
      });
    }
  }

  function shotCoralReefParade(ctx, t, lt, dur, style) {
    const e = ease(lt / dur);
    camBegin(ctx, lerp(560, 680, e), 360, 1.04, 0);

    PROPS.wall(ctx, '#0E244D');
    for (let i = 0; i < 5; i++) {
      const rx = 180 + i * 240 + Math.sin(t + i) * 25;
      paint(ctx, [[rx - 35, -60], [rx + 35, -60], [rx + 140, H + 60], [rx - 90, H + 60]], {
        wash: PAL.whaleCyan, washOp: 35, ink: null
      });
    }

    drawCoralHill(ctx, 960, 620, 620, 190, '#1D4E6E', t, 8);
    drawCoralHill(ctx, 480, 680, 680, 180, '#24637C', t, 10);

    const u = 22;
    const walk = stroll(t, 4.8, 5.65, 420, 680, u);
    const turning = t >= 5.6 && t < 5.88;
    const facing = t < 5.6
      ? { view: 'side', walk: walk.walk, dy: walk.dy }
      : turning
        ? turn(t, 5.6, 5.88, 0.5, 0)
        : { view: 'front' };
    const md = emotions(t, [[4.8, 'happy'], [5.65, 'proud', { emote: 'spout' }]]);

    miniWhale(ctx, walk.x - 195, 420 + Math.sin(t * 5) * 12, 14, { t });
    bionicPuppy(ctx, walk.x - 130, 520, 14, { t });
    agentReachBot(ctx, walk.x + 150, 340, 13, { t });

    whaleGirl(ctx, walk.x, 515, u, { ...md, ...facing, t });
    camEnd(ctx);
  }

  // ---------- Shot 4 (6.0s – 8.5s): "DeepSeek!" — Close-Up Star-Eye Supernova & Fireworks ----------
  const BURSTS = [
    [6.12, 280, 180, PAL.rose],
    [6.42, 1020, 165, PAL.whaleCyan],
    [6.78, 640, 120, PAL.gold],
    [7.15, 220, 390, PAL.sap],
    [7.52, 1060, 380, PAL.violet]
  ];

  function shotDeepSeekSupernova(ctx, t, lt, dur, style) {
    const e = ease(lt / dur);
    const [sx, sy] = (t >= 6.08 && t < 6.45) ? shakeXY(t, 8) : [0, 0];
    camBegin(ctx, W / 2 + sx, 360 - 18 * e + sy, 1 + 0.08 * e, 0);

    PROPS.stageBack(ctx, t, { bg: '#0F1E45', sunburst: true, spots: [[W / 2, PAL.gold]], floorY: 585 });

    letter(ctx, '来自深海的鲸鱼娘', W / 2, 115, 42, PAL.cream, { pop: (t - 6.0) * 4 });
    letter(ctx, 'DEEPSEEK!', W / 2, 195, 84, PAL.whaleCyan, {
      pop: (t - 6.08) * 5,
      rot: Math.sin(t * 8) * 0.02
    });

    const u = 29, y0 = 575;
    const ey = y0 - 6.4 * u;
    for (let i = 0; i < 16; i++) {
      const l0 = 6.1 + i * 0.08;
      if (t < l0) continue;
      boilSeed('flyStar' + i);
      const ph = ((t - l0) / 1.2) % 1;
      const ang = hash(i + 20) * TAU;
      const ex = W / 2 + (i % 2 ? 1.5 : -1.5) * u;
      const fly = easeOut(ph);
      paint(ctx, starPts(ex + Math.cos(ang) * fly * 680, ey + Math.sin(ang) * fly * 420, 8 + 36 * ph, 0.4), {
        wash: i % 3 ? PAL.gold : PAL.whaleCyan, fill: PAL.cream, fillOp: 80, ink: PAL.ink, sw: 0.5
      });
    }

    for (const [tb, bx, by, col] of BURSTS) {
      const a = t - tb;
      if (a < 0 || a > 0.95) continue;
      boilSeed('burst' + tb);
      const r = 30 + 220 * easeOut(a / 0.85);
      const d = 14 * (1 - a / 0.95) + 3;
      if (a < 0.16) {
        glow(ctx, bx, by, 140, col, 0.8);
        paint(ctx, starPts(bx, by, 68 * (1 - a / 0.16) + 16, 0.3, 4, a * 4), { wash: PAL.cream, ink: null });
      }
      for (let k = 0; k < 12; k++) {
        const aa = (k / 12) * TAU + hash(tb) * 3;
        paint(ctx, ellPts(bx + Math.cos(aa) * r, by + Math.sin(aa) * r + 65 * a * a, d, d, 10), {
          wash: k % 2 ? col : PAL.cream, ink: PAL.ink, sw: 0.4
        });
      }
    }

    const md = emotions(t, [[6.0, 'happy'], [6.1, 'starstruck', { emote: 'spark' }]]);
    const m = move('bounce', t);
    whaleGirl(ctx, W / 2, y0, u, { ...m, ...md, t });

    clawd(ctx, 235, 575, 13, { ...move('roof', t, 1), hat: 'party', eyes: 'spark', mouth: 'O', t });
    biliTvMascot(ctx, 1045, 570, 14, { t });

    camEnd(ctx);

    if (lt > dur - 0.28) {
      brushWipe(ctx, (lt - (dur - 0.28)) / 0.56, [PAL.whaleBlue, PAL.gold, PAL.indigo]);
    }
  }

  TIMELINE.chapter('c01_debut', 0.0, 8.5, [
    [0.0, shotCurtainUp],
    [2.8, shotStudioBreakout],
    [4.8, shotCoralReefParade],
    [6.0, shotDeepSeekSupernova]
  ]);
})(typeof window !== 'undefined' ? window : globalThis);
