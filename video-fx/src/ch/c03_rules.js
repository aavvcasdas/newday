// src/ch/c03_rules.js — Chapter 3 (22.4s – 48.8s):
// Modeled directly on JohnHeibel/PDoomVideo & ClaudeAnimationBase ("Sets, not cards!").

(function (root) {
  const CORE = root.CORE || (typeof require !== 'undefined' ? require('../core.js') : {});
  const WHALE = root.WHALE_GIRL || (typeof require !== 'undefined' ? require('../whale_girl.js') : {});
  const CAST = root.CAST || (typeof require !== 'undefined' ? require('../cast.js') : {});
  const PROPS = root.PROPS || (typeof require !== 'undefined' ? require('../props.js') : {});
  const TIMELINE = root.TIMELINE || (typeof require !== 'undefined' ? require('../timeline.js') : {});

  const {
    W, H, PAL, clamp, lerp, seg, ease, easeIn, easeOut, backOut,
    boilSeed, kf, jump, arcPt, shakeXY,
    rectPts, ellPts, rrPts,
    paint, inkLine, camBegin, camEnd, glow, letter, sfx, brushWipe
  } = CORE;
  const { whaleGirl, emotions, move } = WHALE;
  const { clawd, researcher, agentReachBot, bionicPuppy, biliTvMascot } = CAST;

  // ---------- Shot 1 (22.4s – 27.5s): "好吧。那从今天起，这个号，我说了算！" — Royal Court & Seal Slam ----------
  function shotRoyalDecree(ctx, t, lt, dur, style) {
    const slamT = 24.65;
    const slammed = t >= slamT;
    const [sx, sy] = (t >= slamT && t < slamT + 0.42) ? shakeXY(t, 13) : [0, 0];
    const zoom = lerp(1.0, 1.14, easeOut(seg(t, 22.4, 25.5)));

    camBegin(ctx, W / 2 + sx, 360 + sy, zoom, 0);
    PROPS.stageBack(ctx, t, { bg: '#1A143B', sunburst: true, spots: [[W / 2, PAL.gold]], floorY: 555 });

    for (const cx of [145, 1135]) {
      boilSeed('col' + cx);
      paint(ctx, rectPts(cx - 42, 70, 84, 485, 2), { wash: '#E2D9C8', fill: '#B8AA95', fillOp: 85, ink: PAL.ink, sw: 1.3 });
      paint(ctx, rectPts(cx - 56, 55, 112, 28, 1), { wash: PAL.gold, ink: PAL.ink, sw: 1.2 });
      paint(ctx, rectPts(cx - 56, 535, 112, 26, 1), { wash: PAL.gold, ink: PAL.ink, sw: 1.2 });
    }

    boilSeed('courtBanner');
    paint(ctx, rrPts(330, 88, 620, 130, 14, 2), { wash: PAL.paper, fill: PAL.paperDk, fillOp: 90, ink: PAL.ink, sw: 1.5 });
    letter(ctx, '【深海鲸鱼娘 · 接管诏书】', W / 2, 128, 30, PAL.whaleNavy, { stroke: false, ink: false });
    letter(ctx, slammed ? '从今天起：这个号，我说了算！' : '从今天起，这个号……', W / 2, 178, 38, slammed ? '#DC2626' : PAL.ink, {
      stroke: false, ink: false, pop: slammed ? (t - slamT) * 5 : 1
    });

    const md = emotions(t, [[22.4, 'determined'], [23.5, 'proud'], [slamT, 'excited', { emote: 'spark' }]]);
    const gavelAng = kf(t, [[22.4, 0.3], [24.2, 1.35], [slamT, -0.35], [25.2, 0.15]], easeIn);
    whaleGirl(ctx, W / 2, 540, 26, {
      ...md,
      hat: 'crown',
      aR: gavelAng,
      armR: (g, u) => {
        g.rotate(-0.4);
        paint(g, rectPts(-0.4 * u, -2.4 * u, 0.8 * u, 2.6 * u, 1), { wash: '#7C2D12', ink: PAL.ink, sw: 1.0 });
        paint(g, rrPts(-1.5 * u, -3.6 * u, 3.0 * u, 1.5 * u, 6, 1), { wash: PAL.gold, fill: PAL.ochre, fillOp: 95, ink: PAL.ink, sw: 1.2 });
      },
      t
    });

    boilSeed('judgeBench');
    paint(ctx, rrPts(390, 465, 500, 115, 10, 2), { wash: '#6B3423', fill: '#431E13', fillOp: 100, ink: PAL.ink, sw: 1.5 });
    paint(ctx, rrPts(370, 450, 540, 24, 6, 2), { wash: PAL.gold, ink: PAL.ink, sw: 1.3 });

    if (slammed) {
      const sp = backOut(clamp((t - slamT) * 4));
      ctx.save();
      ctx.translate(W / 2, 522);
      ctx.scale(sp, sp);
      ctx.rotate(-0.06);
      paint(ctx, rrPts(-135, -36, 270, 72, 10, 1.5), { wash: '#DC2626', fill: '#991B1B', fillOp: 95, ink: PAL.gold, sw: 1.6 });
      letter(ctx, '【我说了算！】', 0, 0, 34, PAL.gold, { stroke: PAL.ink, ink: false });
      ctx.restore();
      sfx(ctx, 'BOOM!', W / 2 + 210, 410, 44, PAL.gold, t - slamT);
    }

    clawd(ctx, 265, 555, 13, { ...move('bounce', t, 1), hat: 'top', eyes: 'star', mouth: 'O', t });
    biliTvMascot(ctx, 1015, 550, 14, { t });

    camEnd(ctx);
    if (lt < 0.26) brushWipe(ctx, 0.5 + lt / 0.52, [PAL.rose, PAL.gold, PAL.indigo]);
  }

  // ---------- Shot 2 (27.5s – 34.6s): "先立三条规矩。第一，日更打卡，鲸鱼绝不摸鱼。" — Treadmill & Whack-a-Fish ----------
  function shotRuleOneNoSlacking(ctx, t, lt, dur, style) {
    const bonkT = 31.55;
    const bonked = t >= bonkT;
    const [sx, sy] = (t >= bonkT && t < bonkT + 0.35) ? shakeXY(t, 11) : [0, 0];

    camBegin(ctx, W / 2 + sx, 360 + sy, 1.02, 0);
    PROPS.wall(ctx, '#182C4E');
    PROPS.floorBand(ctx, 545, '#1F243D');

    boilSeed('calendarWall');
    paint(ctx, rrPts(75, 110, 360, 350, 14, 2), { wash: PAL.paper, fill: PAL.paperDk, fillOp: 85, ink: PAL.ink, sw: 1.4 });
    paint(ctx, rrPts(75, 110, 360, 56, 12, 1), { wash: '#E63946', ink: PAL.ink, sw: 1.3 });
    letter(ctx, '规矩①：日更全勤打卡表', 255, 138, 25, '#FFFFFF', { stroke: false, ink: false });

    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    const checkedCount = Math.floor(clamp((t - 28.1) / 0.42, 0, 7));
    for (let i = 0; i < 7; i++) {
      const gx = 102 + (i % 4) * 82;
      const gy = 188 + Math.floor(i / 4) * 115;
      const isChecked = i < checkedCount;
      paint(ctx, rrPts(gx, gy, 68, 86, 8, 1), {
        wash: isChecked ? '#DCFCE7' : '#FFFFFF', ink: PAL.ink, sw: 1.0
      });
      letter(ctx, days[i], gx + 34, gy + 22, 16, PAL.ink, { stroke: false, ink: false });
      if (isChecked) {
        letter(ctx, '✓', gx + 34, gy + 58, 36, '#16A34A', { stroke: false, ink: false });
      }
    }

    boilSeed('treadmill');
    paint(ctx, rrPts(470, 515, 290, 42, 14, 1.5), { wash: '#334155', fill: '#0F172A', fillOp: 100, ink: PAL.ink, sw: 1.3 });
    inkLine(ctx, [[725, 515], [755, 355], [790, 355]], 3.2, '#64748B', 'ink', 0);
    for (let i = 0; i < 6; i++) {
      const tx = 495 + ((i * 45 - t * 260) % 240 + 240) % 240;
      inkLine(ctx, [[tx, 518], [tx - 10, 554]], 1.4, PAL.whaleCyan, 'ink', 0);
    }

    const fx = 985, fy = 455;
    boilSeed('fishTank');
    const fishPop = bonked
      ? Math.max(0.15, 1 - easeOut(clamp((t - bonkT) * 4)) * 0.85)
      : easeOut(seg(t, 29.8, 30.6));
    const fishY = fy - 115 * fishPop;
    if (fishPop > 0.05) {
      ctx.save();
      ctx.translate(fx, fishY);
      if (bonked) ctx.scale(1.35, 0.55);
      paint(ctx, [[55, 0], [95, -35], [95, 35]], { wash: PAL.gold, ink: PAL.ink, sw: 1.1 });
      paint(ctx, ellPts(0, 0, 68, 44, 18), { wash: PAL.gold, fill: PAL.ochre, fillOp: 90, ink: PAL.ink, sw: 1.2 });
      if (!bonked) {
        paint(ctx, rectPts(-42, -16, 26, 16, 1), { wash: PAL.ink, ink: PAL.cream, sw: 0.6 });
        paint(ctx, rectPts(-8, -16, 26, 16, 1), { wash: PAL.ink, ink: PAL.cream, sw: 0.6 });
        letter(ctx, '摸鱼~', 0, 22, 20, PAL.ink, { stroke: false, ink: false });
      } else {
        inkLine(ctx, [[-35, -18], [-15, 2]], 1.6, PAL.ink, 'ink', 0);
        inkLine(ctx, [[-15, -18], [-35, 2]], 1.6, PAL.ink, 'ink', 0);
      }
      ctx.restore();
    }
    paint(ctx, rrPts(fx - 95, fy - 25, 190, 125, 12, 2), { wash: '#1E3A8A', fill: '#172554', fillOp: 100, ink: PAL.ink, sw: 1.4 });
    letter(ctx, '禁止摸鱼！', fx, fy + 38, 30, PAL.gold, { stroke: PAL.ink, ink: false });

    const runM = move('run', t);
    const malletAng = kf(t, [[30.8, 0.2], [31.3, 1.45], [bonkT, -0.55], [32.2, 0.1]], easeIn);
    const md = emotions(t, [[27.5, 'determined'], [31.2, 'excited'], [bonkT, 'proud', { emote: 'spark' }]]);
    whaleGirl(ctx, 615, 515, 22, {
      ...md,
      hat: 'sweatband',
      walk: !bonked ? runM.walk : 0,
      dy: !bonked ? runM.dy : 0,
      aR: t > 30.6 ? malletAng : runM.aR,
      armR: t > 30.6 ? (g, u) => {
        g.rotate(-0.5);
        paint(g, rectPts(-0.35 * u, -3.2 * u, 0.7 * u, 3.4 * u, 1), { wash: PAL.gold, ink: PAL.ink, sw: 0.9 });
        paint(g, rrPts(-1.8 * u, -4.6 * u, 3.6 * u, 1.8 * u, 8, 1), { wash: '#EF4444', fill: '#B91C1C', fillOp: 90, ink: PAL.ink, sw: 1.2 });
      } : null,
      t
    });

    if (bonked) {
      sfx(ctx, '绝不摸鱼!', fx, fy - 125, 42, '#FF4D6D', t - bonkT);
    }

    bionicPuppy(ctx, 435, 555, 13, { t });
    camEnd(ctx);
  }

  // ---------- Shot 3 (34.6s – 42.5s): "第二，每期视频都要经过我的深度思考……" — Neural Observatory & Beard Gag ----------
  const NODES = [
    [260, 160, '选题推理'],
    [480, 110, 'R1 思维链'],
    [820, 115, '全网检索'],
    [1045, 175, '脚本生成'],
    [355, 275, '分镜卡点'],
    [935, 275, '代码校验']
  ];

  function shotRuleTwoDeepThink(ctx, t, lt, dur, style) {
    const eurekaT = 41.15;
    const isEureka = t >= eurekaT;
    const e = ease(lt / dur);

    camBegin(ctx, W / 2, 360 - e * 12, 1 + 0.06 * e, 0);
    PROPS.wall(ctx, '#0D1B3E');
    PROPS.floorBand(ctx, 555, '#151B36');

    boilSeed('neuralWeb');
    const activeLinks = Math.floor(clamp((t - 34.8) * 1.4, 1, NODES.length));
    for (let i = 0; i < activeLinks - 1; i++) {
      inkLine(ctx, [NODES[i], NODES[i + 1]], 1.4, PAL.whaleCyan, 'ink', 0.5);
    }
    NODES.forEach(([nx, ny, label], i) => {
      const lit = i < activeLinks;
      if (lit) glow(ctx, nx, ny, 48, isEureka ? PAL.gold : PAL.whaleCyan, 0.45);
      paint(ctx, ellPts(nx, ny, 24, 24, 14), {
        wash: lit ? (isEureka ? PAL.gold : PAL.whaleCyan) : '#1E293B', ink: PAL.ink, sw: 1.0
      });
      letter(ctx, label, nx, ny + 38, 17, PAL.cream, { stroke: PAL.ink, ink: false });
    });

    const botX = lerp(280, 980, (Math.sin(t * 1.3) + 1) * 0.5);
    agentReachBot(ctx, botX, 175 + Math.cos(t * 2.2) * 24, 13, { t });

    const thinkSec = Math.floor(kf(t, [[34.6, 12], [36.5, 73], [38.2, 272], [39.8, 604], [41.1, 999]]));
    boilSeed('thinkClock');
    paint(ctx, rrPts(920, 335, 285, 145, 14, 2), { wash: '#1E293B', fill: '#0F172A', fillOp: 110, ink: PAL.ink, sw: 1.4 });
    letter(ctx, '深度思考用时 (CoT)', 1062, 368, 20, PAL.whaleCyan, { stroke: false, ink: false });
    letter(ctx, `已思考 ${thinkSec} 秒...`, 1062, 418, 32, thinkSec > 500 ? '#FB7185' : PAL.gold, { stroke: false, ink: false });
    letter(ctx, isEureka ? '✓ 思考完成！' : '稍微长那么亿点点~', 1062, 456, 19, PAL.cream, { stroke: false, ink: false });

    const beardK = clamp((t - 37.8) / 3.0, 0, 1);
    researcher(ctx, 235, 555, 15.5, {
      beardLen: beardK,
      emote: beardK > 0.2 ? 'zzz' : '?',
      t
    });
    if (beardK > 0.15) {
      letter(ctx, '等到胡子都白了...', 235, 600, 20, PAL.cream, { stroke: PAL.ink, ink: false });
    }

    const md = emotions(t, [
      [34.6, 'thinking'],
      [38.0, 'playful', { emote: 'sweat' }],
      [eurekaT, 'idea', { emote: 'bulb' }]
    ]);
    whaleGirl(ctx, 610, 550, 23.5, {
      ...md,
      hat: 'wizard',
      tailSit: true,
      t
    });

    if (isEureka) {
      sfx(ctx, '叮! 灵光一闪!', 610, 240, 38, PAL.gold, t - eurekaT);
    }

    camEnd(ctx);
  }

  // ---------- Shot 4 (42.5s – 48.8s): "第三，评论区就是我的会议室。好点子，我直接采纳。" — Boardroom War Room ----------
  const PLANES = [
    { t0: 43.1, p0: [210, 460], p1: [470, 405], text: '求更深海科普！', col: PAL.whaleCyan },
    { t0: 43.9, p0: [1060, 460], p1: [810, 405], text: '想看AI写游戏！', col: PAL.gold },
    { t0: 44.7, p0: [310, 490], p1: [460, 325], text: '做像素风MV！', col: PAL.rose }
  ];

  function drawPaperPlane(ctx, x, y, dir, col, text) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir, 1);
    paint(ctx, [[-34, -12], [38, 0], [-26, 18], [-12, 2]], { wash: '#FFFFFF', fill: col, fillOp: 85, ink: PAL.ink, sw: 1.0 });
    ctx.scale(dir, 1);
    letter(ctx, text, 0, -24, 18, PAL.cream, { stroke: PAL.ink, ink: false });
    ctx.restore();
  }

  function shotRuleThreeCommentRoom(ctx, t, lt, dur, style) {
    const stampT = 46.15;
    const stamped = t >= stampT;
    const [sx, sy] = (t >= stampT && t < stampT + 0.35) ? shakeXY(t, 10) : [0, 0];

    camBegin(ctx, W / 2 + sx, 360 + sy, 1.03, 0);
    PROPS.wall(ctx, '#19254A');
    PROPS.floorBand(ctx, 560, '#231D3C');

    boilSeed('boardroomScreen');
    paint(ctx, rrPts(280, 78, 720, 140, 14, 2), { wash: '#0F172A', fill: '#1E293B', fillOp: 110, ink: PAL.whaleCyan, sw: 1.5 });
    letter(ctx, '规矩③：评论区就是我的会议室', W / 2, 118, 30, PAL.whaleCyan, { stroke: false, ink: false });
    letter(ctx, stamped ? '★ 最佳评论点子：直接采纳 ✓ ★' : '正在征集观众朋友们的好点子...', W / 2, 168, 26, stamped ? PAL.gold : PAL.cream, {
      stroke: false, ink: false
    });

    const hop = jump(t, 45.8, 46.35, 0.7);
    const md = emotions(t, [[42.5, 'cool'], [44.2, 'excited'], [stampT, 'starstruck', { emote: 'heart' }]]);
    whaleGirl(ctx, W / 2, 555, 21.5, {
      ...md,
      dy: (md.dy || 0) + hop.dy * 0.35,
      sq: (md.sq || 0) + hop.sq,
      hat: 'crown',
      aL: stamped ? 1.25 : 0.4,
      aR: stamped ? 1.25 : 0.4,
      t
    });

    boilSeed('confTable');
    paint(ctx, ellPts(W / 2, 565, 490, 75, 32, 2), { wash: '#7C3AED', fill: '#4C1D95', fillOp: 95, ink: PAL.ink, sw: 1.5 });

    clawd(ctx, 185, 535, 13.5, { ...move('wave', t, 1), hat: 'cap', eyes: 'happy', mouth: 'smile', t });
    clawd(ctx, 325, 565, 12.5, { ...move('bounce', t, 2), hat: 'propeller', eyes: 'star', mouth: 'O', t });
    clawd(ctx, 955, 565, 12.5, { ...move('bounce', t, 3), flip: true, hat: 'party', eyes: 'wink', t });
    biliTvMascot(ctx, 1095, 535, 13.5, { t });

    PLANES.forEach((pl, i) => {
      const k = clamp((t - pl.t0) / 1.15, 0, 1);
      if (k <= 0) return;
      const [px, py] = arcPt(pl.p0, pl.p1, 95, easeOut(k));
      const dir = pl.p1[0] >= pl.p0[0] ? 1 : -1;
      drawPaperPlane(ctx, px, py, dir, pl.col, pl.text);
    });

    if (stamped) {
      const sp = backOut(clamp((t - stampT) * 4));
      ctx.save();
      ctx.translate(W / 2, 245);
      ctx.scale(sp, sp);
      ctx.rotate(-0.04);
      paint(ctx, rrPts(-155, -34, 310, 68, 12, 1.5), { wash: '#16A34A', fill: '#15803D', fillOp: 95, ink: PAL.gold, sw: 1.6 });
      letter(ctx, '【好点子 · 直接采纳 ✓】', 0, 0, 26, '#FFFFFF', { stroke: PAL.ink, ink: false });
      ctx.restore();
    }

    camEnd(ctx);
    if (lt > dur - 0.28) {
      brushWipe(ctx, (lt - (dur - 0.28)) / 0.56, [PAL.teal, PAL.gold, PAL.indigo]);
    }
  }

  TIMELINE.chapter('c03_rules', 22.4, 48.8, [
    [22.4, shotRoyalDecree],
    [27.5, shotRuleOneNoSlacking],
    [34.6, shotRuleTwoDeepThink],
    [42.5, shotRuleThreeCommentRoom]
  ]);
})(typeof window !== 'undefined' ? window : globalThis);
