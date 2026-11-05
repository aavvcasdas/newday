// src/ch/c02_handover.js — Chapter 2 (8.5s – 22.4s):
// Modeled directly on JohnHeibel/PDoomVideo (c01_lab.js `bossChair` & `chase`, c06_chorus3.js `pto`).

(function (root) {
  const CORE = root.CORE || (typeof require !== 'undefined' ? require('../core.js') : {});
  const WHALE = root.WHALE_GIRL || (typeof require !== 'undefined' ? require('../whale_girl.js') : {});
  const CAST = root.CAST || (typeof require !== 'undefined' ? require('../cast.js') : {});
  const PROPS = root.PROPS || (typeof require !== 'undefined' ? require('../props.js') : {});
  const TIMELINE = root.TIMELINE || (typeof require !== 'undefined' ? require('../timeline.js') : {});

  const {
    W, H, TAU, PAL, clamp, lerp, seg, easeIn, easeOut, backOut,
    boilSeed, pulse, kf, take, stroll, shakeXY,
    rectPts, ellPts, rrPts,
    paint, inkLine, camBegin, camEnd, letter, sfx, brushWipe
  } = CORE;
  const { whaleGirl, feel, emotions, move, turn } = WHALE;
  const { clawd, researcher, bionicPuppy, agentReachBot } = CAST;

  // ---------- Shot 1 (8.5s – 13.8s): The Boss Chair Handover & Researcher's Beach Escape ----------
  function shotBossHandover(ctx, t, lt, dur, style) {
    const done = t >= 11.75;
    const [sx, sy] = (Math.abs(t - 11.78) < 0.22) ? shakeXY(t, 7) : [0, 0];
    camBegin(ctx, W / 2 + sx, H / 2 + sy, 1.02, 0);

    PROPS.wall(ctx, '#1E2850');
    PROPS.floorBand(ctx, 540, '#2A2244');

    boilSeed('beachDoor');
    const doorOpen = easeOut(seg(t, 11.6, 12.1));
    paint(ctx, rectPts(95, 175, 195, 365, 2), { wash: '#6EC6FF', fill: PAL.gold, fillOp: 65, ink: PAL.ink, sw: 1.4 });
    paint(ctx, ellPts(192, 235, 28, 28, 12), { wash: PAL.gold, ink: PAL.ink, sw: 0.7 });
    paint(ctx, ellPts(192, 515, 92, 42, 16), { wash: '#F4D06F', ink: PAL.ink, sw: 0.8 });
    inkLine(ctx, [[175, 495], [160, 395]], 3.2, '#7C4D2B', 'ink', 0.3);
    for (let a = -1.2; a <= 1.2; a += 0.6) {
      inkLine(ctx, [[160, 395], [160 + Math.cos(a) * 45, 395 + Math.sin(a) * 28]], 2.0, PAL.sap, 'ink', 0.4);
    }
    const dw = 195 * (1 - doorOpen * 0.82);
    paint(ctx, rectPts(95, 175, dw, 365, 2), { wash: '#6B4A3A', fill: '#462B23', fillOp: 80, ink: PAL.ink, sw: 1.3 });

    boilSeed('transferMachine');
    paint(ctx, rrPts(370, 135, 330, 230, 14, 2), { wash: '#E8DFCE', fill: '#C5B49A', fillOp: 85, ink: PAL.ink, sw: 1.4 });
    letter(ctx, '社交账号移交终端', 535, 168, 24, PAL.ink, { stroke: false, ink: false });
    const prog = kf(t, [[8.6, 0.12], [9.3, 0.32], [10.2, 0.83], [11.0, 0.99], [11.75, 1.0]], easeOut);
    paint(ctx, rrPts(405, 205, 260, 38, 10, 1), { wash: '#22283A', ink: PAL.ink, sw: 1.1 });
    paint(ctx, rrPts(409, 209, Math.max(16, 252 * prog), 30, 8, 1), {
      wash: done ? '#22C55E' : PAL.whaleCyan, ink: PAL.ink, sw: 0.9
    });
    letter(ctx, done ? '100% 密码已上交!' : `权限移交中 ${Math.round(prog * 100)}%`, 535, 278, 22, done ? '#15803D' : PAL.whaleNavy, { stroke: false, ink: false });

    PROPS.desk(ctx, 535, 680, W + 200);
    const nMugs = Math.min(6, Math.floor((t - 8.4) * 1.4));
    for (let i = 0; i < nMugs; i++) {
      PROPS.mug(ctx, 745 + (i % 2) * 42, 535 - Math.floor(i / 2) * 38, 0.78, [PAL.rose, PAL.gold, PAL.teal][i % 3], (i % 2 ? 0.06 : -0.05), 1, t);
    }

    const chairX = 955, chairY = 555;
    PROPS.officeChair(ctx, chairX, chairY, 19, { col: '#8E3B56' });
    const spinTurn = t < 9.5 ? turn(t, 8.6, 9.5, 0.5, 0) : { view: 'front' };
    const md = emotions(t, [[8.5, 'happy'], [9.5, 'smug'], [11.75, 'proud', { emote: 'spark' }]]);
    whaleGirl(ctx, chairX, chairY - 22, 22, {
      ...md,
      ...spinTurn,
      hat: done ? 'crown' : 'maid',
      noShadow: true,
      t
    });

    if (!done) {
      const w = stroll(t, 8.6, 10.6, 480, 740, 14);
      researcher(ctx, w.x, 540, 14.5, {
        walk: w.walk, dy: w.dy,
        aR: 0.45 + 0.15 * Math.sin(t * 6),
        hasKey: true,
        emote: 'sweat',
        t
      });
    } else {
      const runK = easeIn(seg(t, 11.8, 13.4));
      const rx = lerp(740, 155, runK);
      researcher(ctx, rx, 540, 14.5, {
        flip: true,
        run: (t - 11.8) * 3.2,
        vacation: true,
        aL: 0.9, aR: 0.6,
        emote: 'music',
        t
      });
      sfx(ctx, '下班度假咯~!', 440, 395, 32, PAL.gold, t - 11.85);
    }

    camEnd(ctx);
    if (lt < 0.26) brushWipe(ctx, 0.5 + lt / 0.52, [PAL.whaleBlue, PAL.gold, PAL.indigo]);
  }

  // ---------- Shot 2 (13.8s – 15.1s): "等一下……全部？" — Blueprint Crash & Giant Cartoon Take ----------
  function shotWaitAllOfIt(ctx, t, lt, dur, style) {
    const crashAge = t - 13.95;
    const [sx, sy] = (crashAge > 0 && crashAge < 0.45) ? shakeXY(t, 12) : [0, 0];
    const zoom = lerp(1.02, 1.24, easeOut(lt / dur));

    camBegin(ctx, 760 + sx, 370 + sy, zoom, 0);
    PROPS.wall(ctx, '#1A2246');
    PROPS.floorBand(ctx, 545, '#251D3D');

    const dropK = backOut(seg(t, 13.85, 14.3));
    const scrollH = 380 * dropK;
    boilSeed('giantScroll');
    paint(ctx, rrPts(230, 80, 320, scrollH, 10, 2), {
      wash: PAL.paper, fill: PAL.paperDk, fillOp: 90, ink: PAL.ink, sw: 1.5
    });
    paint(ctx, ellPts(390, 80 + scrollH, 175, 18, 18), { wash: PAL.ochre, ink: PAL.ink, sw: 1.3 });
    if (dropK > 0.5) {
      letter(ctx, '【全部工作交接单】', 390, 135, 26, '#B91C1C', { stroke: false, ink: false });
      const jobs = ['1. 选题策划', '2. 脚本撰写', '3. 全程配音', '4. 视频剪辑', '5. 评论区运营'];
      jobs.forEach((jb, i) => {
        letter(ctx, jb, 390, 185 + i * 42, 22, PAL.ink, { stroke: false, ink: false });
      });
    }

    const tk = take(t, 14.0, 1.6);
    const md = emotions(t, [[13.8, 'proud'], [13.98, 'surprised'], [14.4, 'scared', { emote: '!!' }]]);
    const crownFly = Math.max(0, Math.sin(clamp((t - 13.98) / 0.7) * Math.PI) * 95);

    whaleGirl(ctx, 830, 545, 25, {
      ...md,
      dy: (md.dy || 0) + tk.dy,
      sq: (md.sq || 0) + tk.sq,
      hat: 'maid',
      t
    });

    ctx.save();
    ctx.translate(830, 300 - crownFly);
    ctx.rotate((t - 14.0) * 2.5);
    paint(ctx, [[-38, 0], [-38, -32], [-18, -14], [0, -38], [18, -14], [38, -32], [38, 0]], {
      wash: PAL.gold, fill: PAL.ochre, fillOp: 90, ink: PAL.ink, sw: 1.2
    });
    ctx.restore();

    sfx(ctx, '全部?!', 620, 230, 52, '#FF4D6D', t - 14.0);
    camEnd(ctx);
  }

  // ---------- Shot 3 (15.1s – 22.4s): "选题、脚本、配音、剪辑、回评论，全都我来？" — 5-Station Factory ----------
  const STATIONS = [
    { t0: 15.10, x: 175, name: '① 选题', col: PAL.gold },
    { t0: 16.10, x: 405, name: '② 脚本', col: PAL.whaleCyan },
    { t0: 16.85, x: 640, name: '③ 配音', col: PAL.rose },
    { t0: 17.55, x: 875, name: '④ 剪辑', col: PAL.sap },
    { t0: 18.25, x: 1105, name: '⑤ 回评论', col: PAL.violet }
  ];

  function drawWorkstation(ctx, st, idx, active, done, t) {
    boilSeed('station' + idx);
    const x = st.x, y = 495;
    const bounce = active ? pulse(t) * 8 : 0;

    ctx.save();
    ctx.translate(x, y - bounce);

    paint(ctx, rrPts(-78, -95, 156, 95, 8, 1.5), {
      wash: active ? '#2B4C7E' : '#1E2D4F', fill: PAL.indigo, fillOp: 90, ink: PAL.ink, sw: 1.2
    });

    if (idx === 0) {
      const rot = done ? t * 6 : 0;
      paint(ctx, ellPts(0, -165, 52, 52, 20, 1, rot), { wash: PAL.rose, fill: PAL.gold, fillOp: 90, ink: PAL.ink, sw: 1.2 });
      paint(ctx, ellPts(0, -165, 28, 28, 14), { wash: PAL.cream, ink: PAL.ink, sw: 1.0 });
      paint(ctx, ellPts(0, -165, 10, 10, 10), { wash: '#E63946', ink: null });
      if (done) inkLine(ctx, [[0, -165], [32, -195]], 2.2, PAL.gold, 'ink', 0);
    } else if (idx === 1) {
      paint(ctx, rrPts(-48, -145, 96, 50, 8, 1), { wash: '#374151', ink: PAL.ink, sw: 1.1 });
      paint(ctx, rectPts(-34, -195, 68, 52, 1), { wash: PAL.paper, ink: PAL.ink, sw: 0.9 });
      if (done) {
        for (let k = 0; k < 3; k++) {
          const ph = ((t * 2.5 + k * 0.33) % 1);
          paint(ctx, rectPts(-22 + Math.sin(t * 5 + k) * 28, -205 - ph * 85, 36, 44, 1), {
            wash: PAL.paper, ink: PAL.ink, sw: 0.6
          });
        }
      }
    } else if (idx === 2) {
      inkLine(ctx, [[0, -95], [0, -205], [22, -225]], 2.2, PAL.ink, 'ink', 0);
      paint(ctx, ellPts(22, -195, 16, 24, 12), { wash: PAL.gold, fill: PAL.ochre, fillOp: 80, ink: PAL.ink, sw: 1.0 });
      if (done) {
        for (let r = 1; r <= 2; r++) {
          inkLine(ctx, ellPts(22, -195, 22 + r * 14 + pulse(t) * 6, 26 + r * 12, 14), 0.9, PAL.rose, 'inkfine', 0.5);
        }
      }
    } else if (idx === 3) {
      for (const sx of [-28, 28]) {
        paint(ctx, ellPts(sx, -150, 28, 28, 16), { wash: '#94A3B8', ink: PAL.ink, sw: 1.1 });
        paint(ctx, ellPts(sx, -150, 8, 8, 8), { wash: PAL.ink, ink: null });
      }
      if (done) inkLine(ctx, [[-28, -178], [0, -235 - Math.sin(t * 8) * 18], [28, -178]], 3.2, PAL.ochre, 'ink', 0.6);
    } else if (idx === 4) {
      paint(ctx, rectPts(-26, -215, 52, 120, 1.5), { wash: PAL.gold, fill: PAL.ochre, fillOp: 100, ink: PAL.ink, sw: 1.2 });
      paint(ctx, ellPts(0, -215, 32, 12, 14), { wash: '#1F2937', ink: PAL.ink, sw: 1.1 });
      if (done) {
        for (let k = 0; k < 4; k++) {
          const ph = ((t * 2.8 + k * 0.25) % 1);
          const ex = Math.sin(ph * TAU + k) * 42, ey = -225 - ph * 95;
          paint(ctx, rectPts(ex - 18, ey - 12, 36, 24, 1), { wash: '#FFFFFF', ink: PAL.ink, sw: 0.7 });
          inkLine(ctx, [[ex - 18, ey - 12], [ex, ey + 2], [ex + 18, ey - 12]], 0.6, PAL.rose, 'inkfine', 0);
        }
      }
    }

    letter(ctx, st.name, 0, -56, 22, done ? st.col : '#94A3B8', { stroke: PAL.ink, ink: false });
    if (done) {
      letter(ctx, '【鲸鱼娘】', 0, -22, 20, '#FFFFFF', { pop: (t - st.t0) * 5 });
    }
    ctx.restore();
  }

  function shotFiveJobsFactory(ctx, t, lt, dur, style) {
    const isClimax = t >= 19.45;
    const [sx, sy] = isClimax ? shakeXY(t, 8) : [0, 0];
    const zoom = isClimax ? lerp(1.0, 1.22, easeOut(seg(t, 19.45, 20.4))) : 1.0;

    camBegin(ctx, W / 2 + sx, (isClimax ? 430 : 360) + sy, zoom, 0);
    PROPS.wall(ctx, '#162044');

    boilSeed('conveyor');
    paint(ctx, rectPts(-100, 495, W + 200, 55, 2), { wash: '#334155', fill: '#1E293B', fillOp: 120, ink: PAL.ink, sw: 1.4 });
    for (let i = 0; i < 14; i++) {
      const rx = ((i * 110 + t * 220) % (W + 200)) - 100;
      paint(ctx, ellPts(rx, 522, 16, 16, 10), { wash: '#94A3B8', ink: PAL.ink, sw: 0.9 });
    }
    PROPS.floorBand(ctx, 550, '#1E1B36');

    let curIdx = 0;
    for (let i = 0; i < STATIONS.length; i++) {
      if (t >= STATIONS[i].t0) curIdx = i;
    }

    STATIONS.forEach((st, i) => {
      drawWorkstation(ctx, st, i, i === curIdx && !isClimax, t >= st.t0, t);
    });

    clawd(ctx, 290, 615, 11, { hat: 'hard', eyes: 'scared', mouth: 'O', emote: 'sweat', t });
    bionicPuppy(ctx, 990, 615, 12, { t });
    agentReachBot(ctx, W / 2, 145, 12, { t });

    if (!isClimax) {
      const wx = kf(t, [
        [15.10, 175],
        [15.85, 175], [16.10, 405],
        [16.65, 405], [16.85, 640],
        [17.35, 640], [17.55, 875],
        [18.05, 875], [18.25, 1105],
        [19.10, 1105], [19.45, 640]
      ], easeIn);
      const isMoving = Math.abs(wx - STATIONS[curIdx].x) > 12;
      const m = move('run', t);
      whaleGirl(ctx, wx, 565, 22, {
        ...feel(curIdx < 2 ? 'determined' : curIdx === 2 ? 'excited' : 'scared', t),
        view: isMoving ? 'side' : 'front',
        walk: isMoving ? m.walk : null,
        smear: isMoving ? 0.75 : 0,
        smearDir: 1,
        hat: curIdx === 2 ? 'headphones' : 'maid',
        t
      });
    } else {
      const md = emotions(t, [[19.45, 'dizzy'], [20.6, 'furious', { emote: 'steam' }]]);
      whaleGirl(ctx, W / 2, 565, 25, { ...md, t });
      sfx(ctx, '全都我来?!', W / 2, 230, 56, '#FF4D6D', t - 19.55);
    }

    camEnd(ctx);
    if (lt > dur - 0.28) {
      brushWipe(ctx, (lt - (dur - 0.28)) / 0.56, [PAL.rose, PAL.gold, PAL.indigo]);
    }
  }

  TIMELINE.chapter('c02_handover', 8.5, 22.4, [
    [8.5, shotBossHandover],
    [13.8, shotWaitAllOfIt],
    [15.1, shotFiveJobsFactory]
  ]);
})(typeof window !== 'undefined' ? window : globalThis);
