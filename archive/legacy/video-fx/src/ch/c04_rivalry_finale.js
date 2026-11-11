// src/ch/c04_rivalry_finale.js — Chapter 4 (48.8s – 82.5s):
// Modeled directly on JohnHeibel/PDoomVideo (c01_lab.js `theTwist`, c07_finale.js) & ClaudeAnimationBase.

(function (root) {
  const CORE = root.CORE || (typeof require !== 'undefined' ? require('../core.js') : {});
  const WHALE = root.WHALE_GIRL || (typeof require !== 'undefined' ? require('../whale_girl.js') : {});
  const CAST = root.CAST || (typeof require !== 'undefined' ? require('../cast.js') : {});
  const PROPS = root.PROPS || (typeof require !== 'undefined' ? require('../props.js') : {});
  const TIMELINE = root.TIMELINE || (typeof require !== 'undefined' ? require('../timeline.js') : {});

  const {
    W, H, TAU, PAL, clamp, lerp, seg, ease, easeIn, easeOut, backOut, hash,
    boilSeed, pulse, kf, shakeXY, mixCol,
    rectPts, ellPts, rrPts, starPts,
    paint, inkLine, camBegin, camEnd, glow, flash, letter, iris, brushWipe
  } = CORE;
  const { whaleGirl, feel, emotions, move } = WHALE;
  const { clawd, ladyClaude, researcher, agentReachBot, bionicPuppy, miniWhale, biliTvMascot } = CAST;

  // ---------- Shot 1 (48.8s – 56.2s): "Day 0 的任务：换头像，写简介，定下第一周的选题。" ----------
  function shotDayZeroTasks(ctx, t, lt, dur, style) {
    const tAvatar = 50.55;
    const tBio = 51.60;
    const tWheel = 52.85;

    camBegin(ctx, W / 2, 360, 1.02, 0);
    PROPS.wall(ctx, '#1B284E');
    PROPS.floorBand(ctx, 550, '#261E40');

    letter(ctx, '【DAY 0 运营准备间】三大任务打卡', W / 2, 72, 34, PAL.gold, { stroke: PAL.ink, ink: false });

    boilSeed('vanityMirror');
    const done1 = t >= tAvatar;
    paint(ctx, rrPts(95, 130, 290, 310, 18, 2), { wash: '#1E293B', fill: '#0F172A', fillOp: 100, ink: PAL.gold, sw: 1.5 });
    for (let i = 0; i < 8; i++) {
      const bx = 115 + (i % 4) * 82, by = i < 4 ? 142 : 428;
      paint(ctx, ellPts(bx, by, 8, 8, 8), { wash: done1 ? PAL.gold : '#64748B', ink: PAL.ink, sw: 0.6 });
    }
    paint(ctx, ellPts(240, 265, 86, 86, 24), { wash: done1 ? '#29B6F6' : '#334155', ink: PAL.gold, sw: 1.4 });
    if (done1) {
      whaleGirl(ctx, 240, 345, 12, { ...feel('love', t), noShadow: true, t });
      letter(ctx, '✓ 换新头像', 240, 392, 24, '#4ADE80', { stroke: PAL.ink, ink: false });
    } else {
      letter(ctx, '① 换头像', 240, 265, 24, PAL.cream, { stroke: false, ink: false });
    }

    boilSeed('bioScroll');
    const done2 = t >= tBio;
    paint(ctx, rrPts(475, 130, 330, 310, 14, 2), { wash: PAL.paper, fill: PAL.paperDk, fillOp: 90, ink: PAL.ink, sw: 1.5 });
    letter(ctx, '② 账号个人简介', 640, 168, 25, PAL.whaleNavy, { stroke: false, ink: false });
    if (done2) {
      letter(ctx, '「我是深海鲸鱼娘 DeepSeek', 640, 232, 21, PAL.ink, { stroke: false, ink: false });
      letter(ctx, '  人类已下班，本号归AI管！」', 640, 272, 21, PAL.ink, { stroke: false, ink: false });
      letter(ctx, '✓ 简介已更新', 640, 385, 24, '#16A34A', { stroke: false, ink: false });
    } else {
      letter(ctx, '正在挥毫写简介...', 640, 265, 22, '#64748B', { stroke: false, ink: false });
    }

    boilSeed('topicWheel');
    const done3 = t >= tWheel;
    const wheelRot = done3 ? 1.2 : t * 7.5;
    paint(ctx, rrPts(895, 130, 290, 310, 16, 2), { wash: '#1E293B', fill: '#0F172A', fillOp: 100, ink: PAL.whaleCyan, sw: 1.4 });
    const wCols = [PAL.rose, PAL.gold, PAL.whaleCyan, PAL.sap, PAL.violet, PAL.peach];
    for (let i = 0; i < 6; i++) {
      const a0 = wheelRot + (i / 6) * TAU, a1 = wheelRot + ((i + 1) / 6) * TAU;
      paint(ctx, [
        [1040, 258],
        [1040 + Math.cos(a0) * 86, 258 + Math.sin(a0) * 86],
        [1040 + Math.cos((a0 + a1) / 2) * 88, 258 + Math.sin((a0 + a1) / 2) * 88],
        [1040 + Math.cos(a1) * 86, 258 + Math.sin(a1) * 86]
      ], { wash: wCols[i], ink: PAL.ink, sw: 0.9 });
    }
    paint(ctx, ellPts(1040, 258, 16, 16, 12), { wash: PAL.cream, ink: PAL.ink, sw: 1.0 });
    paint(ctx, [[1040, 182], [1026, 156], [1054, 156]], { wash: PAL.gold, ink: PAL.ink, sw: 1.0 });
    letter(ctx, done3 ? '✓ 首周选题已锁定！' : '③ 第一周选题转盘', 1040, 392, 23, done3 ? PAL.gold : PAL.cream, { stroke: PAL.ink, ink: false });

    const wx = kf(t, [
      [48.8, 240], [50.8, 240],
      [51.4, 640], [52.2, 640],
      [52.8, 920], [56.2, 640]
    ], easeOut);
    const isWalking = (t >= 50.8 && t <= 51.4) || (t >= 52.2 && t <= 56.2);
    const md = emotions(t, [
      [48.8, 'happy'],
      [tAvatar, 'wink', 'sparkle'],
      [tBio, 'determined', 'idea'],
      [tWheel, 'starstruck', 'heart']
    ]);
    whaleGirl(ctx, wx, 565, 22, {
      ...md,
      ...move(isWalking ? 'walk' : 'bounce', t),
      view: isWalking ? 'q' : 'front',
      flip: t > 52.8,
      t
    });

    const fAge = t - tAvatar;
    if (fAge > 0 && fAge < 0.22) {
      flash(ctx, (1 - fAge / 0.22) * 0.55, '#FFFFFF');
    }

    camEnd(ctx);
  }

  // ---------- Shot 2 (56.2s – 64.8s): "听说隔壁的Claude大小姐也在运营账号？没关系，鲸鱼，可是能潜到最深处的。" ----------
  function shotRivalryAndDeepDive(ctx, t, lt, dur, style) {
    const diveT = 60.15;
    const isDiving = t >= diveT;

    if (!isDiving) {
      camBegin(ctx, W / 2, 360, 1.03, 0);
      PROPS.wall(ctx, '#4A1D3D');
      PROPS.floorBand(ctx, 545, '#2E1128');

      glow(ctx, 430, 180, 260, PAL.gold, 0.35);
      letter(ctx, '【隔壁频道：Claude 大小姐的红茶沙龙】', 450, 95, 28, PAL.gold, { stroke: PAL.ink, ink: false });

      boilSeed('teaTable');
      paint(ctx, ellPts(450, 485, 165, 34, 24), { wash: '#FDE68A', fill: PAL.gold, fillOp: 90, ink: PAL.ink, sw: 1.3 });
      paint(ctx, rectPts(432, 485, 36, 65, 1), { wash: PAL.gold, ink: PAL.ink, sw: 1.2 });
      PROPS.mug(ctx, 395, 478, 0.75, PAL.rose, 0, 1, t);

      ladyClaude(ctx, 450, 535, 21, { hasFan: true, t });
      clawd(ctx, 215, 545, 13, { ...move('bounce', t, 1), hat: 'top', prop: 'bowtie', eyes: 'happy', t });
      clawd(ctx, 675, 545, 13, { ...move('bounce', t, 2), flip: true, hat: 'top', prop: 'bowtie', eyes: 'wink', t });

      boilSeed('spyPorthole');
      paint(ctx, rectPts(830, -40, 490, H + 80, 2), { wash: '#0F254C', fill: '#08152E', fillOp: 120, ink: PAL.ink, sw: 1.8 });
      letter(ctx, '听说隔壁大小姐也在营业？', 1045, 95, 24, PAL.whaleCyan, { stroke: PAL.ink, ink: false });
      PROPS.windowPorthole(ctx, 1045, 225, 76, t, true);
      const md = emotions(t, [[56.2, 'suspicious'], [57.8, 'smug', { emote: 'spark' }]]);
      whaleGirl(ctx, 1045, 562, 20.5, { ...md, view: 'q', flip: true, t });

      camEnd(ctx);
    } else {
      const diveK = easeIn(seg(t, diveT, 64.4));
      const depthM = Math.floor(lerp(200, 10994, diveK));
      camBegin(ctx, W / 2, 360, 1.04, 0);

      const bgCol = mixCol('#0E2A5C', '#040B1C', diveK);
      PROPS.wall(ctx, bgCol);

      boilSeed('trenchWalls');
      for (let i = 0; i < 6; i++) {
        const wy = ((i * 160 - (t - diveT) * 520) % 900 + 900) % 900 - 100;
        paint(ctx, [[-60, wy], [180 + (i % 2) * 55, wy + 70], [-60, wy + 150]], { wash: '#09152E', ink: PAL.ink, sw: 1.2 });
        paint(ctx, [[W + 60, wy], [W - 180 - ((i + 1) % 2) * 55, wy + 70], [W + 60, wy + 150]], { wash: '#09152E', ink: PAL.ink, sw: 1.2 });
      }

      for (let i = 0; i < 14; i++) {
        const bx = 220 + ((i * 73) % 840);
        const by = ((i * 85 - (t - diveT) * 640) % 820 + 820) % 820 - 50;
        paint(ctx, ellPts(bx, by, 8 + (i % 3) * 5, 8 + (i % 3) * 5, 10), { wash: PAL.whaleCyan, washOp: 120, ink: PAL.cream, sw: 0.6 });
      }

      paint(ctx, rrPts(95, 110, 270, 130, 12, 1.5), { wash: '#0F172A', fill: '#1E293B', fillOp: 110, ink: PAL.whaleCyan, sw: 1.3 });
      letter(ctx, '深海下潜深度计', 230, 142, 20, PAL.whaleCyan, { stroke: false, ink: false });
      letter(ctx, `-${depthM} m`, 230, 188, 38, PAL.gold, { stroke: false, ink: false });
      letter(ctx, depthM > 8000 ? '★ 马里亚纳最深处 ★' : '向深海全速下潜中!', 230, 222, 18, PAL.cream, { stroke: false, ink: false });

      const md = emotions(t, [[diveT, 'determined'], [62.2, 'proud', { emote: 'spout' }]]);
      whaleGirl(ctx, W / 2, 515 + Math.sin(t * 6) * 14, 25, {
        ...md,
        hat: 'diving',
        aL: 1.15, aR: 1.15,
        t
      });
      miniWhale(ctx, 360, 430 + Math.cos(t * 5) * 18, 15, { t });
      agentReachBot(ctx, 940, 410 + Math.sin(t * 5) * 18, 14, { t });

      letter(ctx, '鲸鱼，可是能潜到最深处的！', W / 2, 110, 38, PAL.whaleCyan, { stroke: PAL.ink, ink: false });
      camEnd(ctx);
    }

    if (Math.abs(t - diveT) < 0.24) {
      brushWipe(ctx, 0.5 + (t - diveT) / 0.48, [PAL.whaleBlue, PAL.teal, PAL.night]);
    }
  }

  // ---------- Shot 3 (64.8s – 71.8s): "不过我只有一个小小的担心……服务器，千万别又繁忙了。" ----------
  function drawServerRack(ctx, x, y, isGreen, t, idx) {
    boilSeed('rack' + idx);
    paint(ctx, rrPts(x - 75, y - 320, 150, 320, 10, 2), { wash: '#1E293B', fill: '#0F172A', fillOp: 110, ink: PAL.ink, sw: 1.4 });
    letter(ctx, `GPU-0${idx + 1}`, x, y - 290, 20, PAL.cream, { stroke: false, ink: false });
    for (let r = 0; r < 5; r++) {
      const ry = y - 255 + r * 46;
      paint(ctx, rectPts(x - 58, ry, 116, 32, 1), { wash: '#334155', ink: PAL.ink, sw: 0.9 });
      const ledCol = isGreen ? '#22C55E' : ((Math.floor(t * 8 + r + idx) % 2) ? '#EF4444' : '#F59E0B');
      paint(ctx, ellPts(x - 40, ry + 16, 7, 7, 8), { wash: ledCol, ink: null });
      paint(ctx, ellPts(x - 20, ry + 16, 7, 7, 8), { wash: ledCol, ink: null });
    }
  }

  function shotServerRoomTwist(ctx, t, lt, dur, style) {
    const switchT = 68.45;
    const lightsOn = t >= switchT;
    const [sx, sy] = (!lightsOn && t > 66.2) ? shakeXY(t, 6) : [0, 0];

    camBegin(ctx, W / 2 + sx, 360 + sy, 1.03, 0);
    PROPS.wall(ctx, lightsOn ? '#1F3A68' : '#260B17');
    PROPS.floorBand(ctx, 550, lightsOn ? '#272446' : '#180710');

    if (!lightsOn && Math.sin(t * 14) > 0) {
      glow(ctx, W / 2, 120, 420, '#EF4444', 0.35);
    }

    [195, 425, 855, 1085].forEach((rx, i) => {
      drawServerRack(ctx, rx, 550, lightsOn, t, i);
    });

    paint(ctx, rrPts(350, 75, 580, 82, 12, 1.5), {
      wash: lightsOn ? '#16A34A' : '#DC2626', ink: PAL.ink, sw: 1.4
    });
    letter(ctx, lightsOn ? '✓ 服务器满血畅通 (延迟 1ms)' : '⚠ 警告：服务器千万别又繁忙了！', W / 2, 116, 30, '#FFFFFF', {
      stroke: PAL.ink, ink: false
    });

    boilSeed('lightSwitch');
    paint(ctx, rrPts(715, 285, 56, 84, 8, 1), { wash: PAL.paper, ink: PAL.ink, sw: 1.1 });
    inkLine(ctx, [[743, 327], [743, lightsOn ? 302 : 352]], 3.5, lightsOn ? '#16A34A' : '#DC2626', 'ink', 0);

    if (lightsOn) {
      boilSeed('hotpot');
      paint(ctx, rrPts(510, 485, 90, 65, 8, 1), { wash: '#9A3412', ink: PAL.ink, sw: 1.1 });
      paint(ctx, ellPts(555, 480, 52, 22, 16), { wash: '#EF4444', fill: PAL.gold, fillOp: 85, ink: PAL.ink, sw: 1.1 });
      letter(ctx, '其实是火锅蒸汽~', 530, 420, 20, PAL.gold, { stroke: PAL.ink, ink: false });
    } else {
      for (let i = 0; i < 4; i++) {
        const ph = ((t * 1.6 + i * 0.25) % 1);
        paint(ctx, ellPts(555 + Math.sin(t * 5 + i) * 24, 460 - ph * 140, 28 + ph * 22, 22 + ph * 16, 12), {
          wash: '#94A3B8', washOp: 140, ink: PAL.ink, sw: 0.7
        });
      }
    }

    const md = emotions(t, [
      [64.8, 'nervous'],
      [66.2, 'scared', { emote: 'sweat' }],
      [67.3, 'cry'],
      [switchT, 'playful', { emote: 'spark' }],
      [69.8, 'relieved']
    ]);
    whaleGirl(ctx, 645, 555, 23.5, {
      ...md,
      hat: 'hard',
      aR: Math.abs(t - switchT) < 0.35 ? 1.1 : (md.aR || 0.25),
      t
    });

    if (Math.abs(t - switchT) < 0.14) {
      flash(ctx, 0.45, PAL.cream);
    }

    camEnd(ctx);
  }

  // ---------- Shot 4 (71.8s – 82.5s): "想看AI把这个号带到哪里，就点个关注吧！我们Day 1见！" ----------
  function drawTripleComboIcon(ctx, x, y, type, active, popK, t) {
    boilSeed('combo' + type);
    ctx.save();
    ctx.translate(x, y);
    const sc = active ? backOut(clamp(popK, 0, 1)) * (1 + pulse(t) * 0.08) : 0.75;
    ctx.scale(sc, sc);

    const col = active ? (type === 0 ? '#FB7185' : type === 1 ? '#38BDF8' : '#FACC15') : '#334155';
    if (active) glow(ctx, 0, 0, 85, col, 0.55);

    paint(ctx, ellPts(0, 0, 46, 46, 20), { wash: col, fill: PAL.ink, fillOp: 45, ink: PAL.ink, sw: 1.4 });

    if (type === 0) {
      paint(ctx, rrPts(-18, -5, 32, 24, 5, 1), { wash: '#FFFFFF', ink: PAL.ink, sw: 1.0 });
      paint(ctx, rrPts(-5, -24, 14, 22, 5, 1), { wash: '#FFFFFF', ink: PAL.ink, sw: 1.0 });
      letter(ctx, '点赞', 0, 64, 22, active ? '#FB7185' : '#94A3B8', { stroke: PAL.ink, ink: false });
    } else if (type === 1) {
      paint(ctx, rrPts(-20, -6, 40, 12, 4, 1), { wash: '#FFFFFF', ink: PAL.ink, sw: 1.0 });
      paint(ctx, rrPts(-6, -20, 12, 40, 4, 1), { wash: '#FFFFFF', ink: PAL.ink, sw: 1.0 });
      letter(ctx, '关注', 0, 64, 22, active ? '#38BDF8' : '#94A3B8', { stroke: PAL.ink, ink: false });
    } else {
      paint(ctx, starPts(0, 0, 30, 0.45, 5, -Math.PI / 2), { wash: PAL.gold, ink: PAL.ink, sw: 1.1 });
      letter(ctx, '收藏', 0, 64, 22, active ? '#FACC15' : '#94A3B8', { stroke: PAL.ink, ink: false });
    }
    ctx.restore();
  }

  function shotGrandFinale(ctx, t, lt, dur, style) {
    const seeYouT = 76.6;
    const isSeeYou = t >= seeYouT;
    const e = ease(lt / dur);

    camBegin(ctx, W / 2, 360 - e * 10, 1 + 0.06 * e, 0);
    PROPS.stageBack(ctx, t, {
      bg: '#131F49',
      sunburst: true,
      spots: [[W / 2, PAL.gold], [280, PAL.whaleCyan], [W - 280, PAL.rose]],
      floorY: 565
    });

    letter(ctx, isSeeYou ? '★ 我们 DAY 1 见！不见不散！ ★' : '点个关注 · 支持深海鲸鱼娘吧！', W / 2, 72, 38, PAL.gold, {
      stroke: PAL.ink, ink: false, pop: isSeeYou ? (t - seeYouT) * 4 : 1
    });

    const tLike = 74.40, tCoin = 74.95, tFav = 75.50;
    drawTripleComboIcon(ctx, 370, 152, 0, t >= tLike, (t - tLike) * 4, t);
    drawTripleComboIcon(ctx, 640, 152, 1, t >= tCoin, (t - tCoin) * 4, t);
    drawTripleComboIcon(ctx, 910, 152, 2, t >= tFav, (t - tFav) * 4, t);

    const dMove = move('dance', t);
    ladyClaude(ctx, 165, 560, 16, { hasFan: true, t });
    if (CAST.ladyGemini) {
      CAST.ladyGemini(ctx, 315, 560, 16, { t, walk: Math.sin(t * 5) * 0.25, emote: 'sparkle' });
    } else {
      researcher(ctx, 315, 560, 14.5, { vacation: true, dy: dMove.dy, t });
    }
    bionicPuppy(ctx, 455, 568, 13.5, { t });
    miniWhale(ctx, 435, 365 + Math.sin(t * 5) * 14, 14, { t });
    agentReachBot(ctx, 845, 365 + Math.cos(t * 5) * 14, 13.5, { t });
    biliTvMascot(ctx, 825, 562, 14, { t });
    clawd(ctx, 975, 562, 13.5, { ...move('roof', t, 2), hat: 'crown', eyes: 'star', mouth: 'O', t });
    clawd(ctx, 1115, 562, 13.5, { ...move('wave', t, 3), flip: true, hat: 'party', eyes: 'happy', t });

    const md = emotions(t, [
      [71.8, 'excited', { emote: 'music' }],
      [tLike, 'starstruck', { emote: 'spark' }],
      [seeYouT, 'love', { emote: 'heart' }]
    ]);
    whaleGirl(ctx, W / 2, 578, 24, {
      ...md,
      dy: dMove.dy,
      rot: dMove.rot * 0.5,
      hat: isSeeYou ? 'crown' : 'maid',
      heartHands: isSeeYou,
      t
    });

    for (let i = 0; i < 24; i++) {
      boilSeed('finConf' + i);
      const cx = (hash(i * 7) * W + Math.sin(t * 2 + i) * 45 + W) % W;
      const cy = ((t * (110 + (i % 5) * 25) + i * 47) % H);
      paint(ctx, rectPts(cx - 7, cy - 4, 14, 8), {
        wash: [PAL.gold, PAL.rose, PAL.whaleCyan, PAL.sap, PAL.violet][i % 5],
        ink: PAL.ink,
        sw: 0.4
      });
    }

    PROPS.stageFront(ctx, t, { curtain: clamp((t - 80.2) / 2.1, 0, 0.35) });
    camEnd(ctx);

    if (t > 80.4) {
      const r = lerp(780, 0, easeIn(clamp((t - 80.4) / 2.05, 0, 1)));
      iris(ctx, W / 2, 395, r);
    }
  }

  TIMELINE.chapter('c04_rivalry_finale', 48.8, 82.5, [
    [48.8, shotDayZeroTasks],
    [56.2, shotRivalryAndDeepDive],
    [64.8, shotServerRoomTwist],
    [71.8, shotGrandFinale]
  ]);
})(typeof window !== 'undefined' ? window : globalThis);
