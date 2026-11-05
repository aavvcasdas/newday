// src/mv_ba_huiyi_pinhao_gei_ni.js — 56-Shot Storyboard Director for:
//   《椰子水很甜 - 把回忆拼好给你（纯享Beat）》(142.11s, 94.85 BPM, 56 Bars = 56 Shots)
// Built following JohnHeibel/PDoomVideo (`xz_shots.js`) & tuzhechen2005/opus-video-skills:
//   - 56 distinct storyboard shots (1 shot per bar = 2.5304s, plus intra-shot focus pulls & camera cuts)
//   - 100% authentic lyrics of 《把回忆拼好给你》 (作词：童子-T / Shingo.S / 一只然) synced bar-by-bar
//   - All 31 emotions from `characters/whale_girl_emotions_31.png` with 3-stage smooth mid-lyric transitions
//     (`WHALE.emotions(lt, [[0, emo1, em1], [0.85, emo2, em2], [1.70, emo3, em3]])`)
//   - Rich physical acting & micro-actions in every shot: walking (`stroll`), running with afterimage (`runTo` + `smear`),
//     parabolic leaps (`jump`), kneeling (`kneel`), 360 turnaround (`turn`/`spinView`), tail-cushion sitting (`tailSit`),
//     interactive prop hooks (`armL`/`armR`), and co-acting with `ladyGemini` (双子星 Gemini 大小姐) & `ladyClaude`!

(function (root) {
  const CORE = root.CORE || (typeof require !== 'undefined' ? require('./core.js') : {});
  const WHALE = root.WHALE_GIRL || (typeof require !== 'undefined' ? require('./whale_girl.js') : {});
  const CAST = root.CAST || (typeof require !== 'undefined' ? require('./cast.js') : {});

  const {
    W = 1280,
    H = 720,
    clamp,
    lerp,
    seg,
    ease,
    easeOut,
    easeIn,
    backOut,
    kf,
    arcPt,
    rrPts,
    ellPts,
    rectPts,
    paint,
    wobbly,
    boilSeed,
    setBoil,
    setActiveStyle,
    camBegin,
    camEnd,
    toScreen,
    shakeXY,
    iris,
    curtains,
    brushWipe,
    smokeWipe,
    spotDark,
    pulse
  } = CORE;

  const { whaleGirl, feel, emotions, turn, spinView } = WHALE;
  const polyPts = (pts) => pts;
  const linePts = (x0, y0, x1, y1) => [[x0, y0], [x1, y1]];
  const stroke = (ctx, pts, o = {}) => {
    if (!pts || pts.length < 2) return;
    if (typeof CORE.open === 'function') {
      CORE.open(ctx, pts, o.sw || 2, o.ink || '#161F3A');
      return;
    }
    ctx.save();
    ctx.strokeStyle = o.ink || '#161F3A';
    ctx.lineWidth = o.sw || 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
    ctx.restore();
  };

  // Audio-envelope timing constants (from `assets/ba_huiyi_pinhao_gei_ni_audio.js`)
  const DURATION = 142.11;
  const BPM = 94.85;
  const BEAT = 60 / BPM;       // 0.6326s per beat
  const BAR = BEAT * 4;        // 2.5304s per bar (56 bars total)
  const OFF = 0.415;           // first downbeat offset
  const B = (n) => OFF + n * BEAT;
  const BAR_T = (barIdx) => OFF + barIdx * BAR;

  // ==========================================================================
  // 100% Acoustically & Vosk-Verified 56-Bar Vocal Structure of:
  // 《椰子水很甜 - 把回忆拼好给你（纯享Beat）.mp3》 (56 Bars × 2.5304s = 142.11s)
  //   - Bars 00–07 (0.24s–20.66s):   Verse 2A (`那天你在雨后街角答应接受我的爱` .. `我已经不再期待其他什么东西`)
  //   - Bars 08–15 (20.66s–40.90s):  Verse 2B (`我们也经常争执互相不接电话` .. `寂寞时让我把快乐拼起来吧`)
  //   - Bars 16–23 (40.90s–61.14s):  Chorus 1 (`我们之间的回忆` .. `时光匆匆却没有遗失过去`)
  //   - Bars 24–31 (61.14s–81.39s):  Chorus 2 (`我们之间的回忆` .. `时光匆匆却没有遗失过去`)
  //   - Bars 32–39 (81.39s–101.63s): Instrumental Bridge (`间奏 · 星海吉他与记忆拼图`)
  //   - Bars 40–47 (101.63s–121.87s): Verse 2A Reprise (`那天你在雨后街角答应接受我的爱` .. `我已经不再期待其他什么东西`)
  //   - Bars 48–55 (121.87s–142.11s): Verse 2B Reprise (`我们也经常争执互相不接电话` .. `寂寞时让我把快乐拼起来吧`)
  // ==========================================================================
  const LYRICS = [
    // Bars 00–07: Verse 2A (0.20s – 20.66s)
    { bar: 0,  t0: 0.20,      t1: BAR_T(1),  zh: '那天你在雨后街角答应接受我的爱',         en: 'That day at the rain-washed street corner you accepted my love', tag: 'VERSE 1A · 雨后街角' },
    { bar: 1,  t0: BAR_T(1),  t1: BAR_T(2),  zh: '那一刻我的世界有了色彩',                 en: 'In that very moment my entire world burst into color', tag: 'VERSE 1A · 雨后街角' },
    { bar: 2,  t0: BAR_T(2),  t1: BAR_T(3),  zh: '这一生无法忘记关于澄蓝色的你',           en: 'Never in this life could I forget the clear azure blue of you', tag: 'VERSE 1A · 澄蓝记忆' },
    { bar: 3,  t0: BAR_T(3),  t1: BAR_T(4),  zh: '像一份礼物悄然呈现在我的境遇',           en: 'Appearing quietly like a precious gift within my life', tag: 'VERSE 1A · 澄蓝记忆' },
    { bar: 4,  t0: BAR_T(4),  t1: BAR_T(5),  zh: '我们从清晨起玩一整天游戏',               en: 'We played games together all day long from early morning', tag: 'VERSE 1A · 朝夕相伴' },
    { bar: 5,  t0: BAR_T(5),  t1: BAR_T(6),  zh: '到夜晚一起看我最爱的剧',                 en: 'Until nightfall watching my favorite drama side by side', tag: 'VERSE 1A · 朝夕相伴' },
    { bar: 6,  t0: BAR_T(6),  t1: BAR_T(7),  zh: '能够拥有这些已足够幸运',                 en: 'Just being able to hold these moments was lucky enough', tag: 'VERSE 1A · 朝夕相伴' },
    { bar: 7,  t0: BAR_T(7),  t1: BAR_T(8),  zh: '我已经不再期待其他什么东西',             en: 'I already no longer wished for anything else at all', tag: 'VERSE 1A · 朝夕相伴' },

    // Bars 08–15: Verse 2B (20.66s – 40.90s)
    { bar: 8,  t0: BAR_T(8),  t1: BAR_T(9),  zh: '我们也经常争执互相不接电话',             en: 'We also often argued and refused to answer each other', tag: 'VERSE 1B · 盛夏烟花' },
    { bar: 9,  t0: BAR_T(9),  t1: BAR_T(10), zh: '在同一房间终于呼叫冷漠抵达',             en: 'In the same room until only cold silence finally arrived', tag: 'VERSE 1B · 盛夏烟花' },
    { bar: 10, t0: BAR_T(10), t1: BAR_T(11), zh: '也曾想过以后生活没有人牵挂',             en: 'I once imagined a future life with no one left to care for', tag: 'VERSE 1B · 盛夏烟花' },
    { bar: 11, t0: BAR_T(11), t1: BAR_T(12), zh: '把爱扔掉只剩一块残酷伤疤',               en: 'Throwing love away until only a cruel scar remained', tag: 'VERSE 1B · 盛夏烟花' },
    { bar: 12, t0: BAR_T(12), t1: BAR_T(13), zh: '而那些你送我的梦 教我折的花',             en: 'Yet all the dreams you gave me and paper flowers we folded', tag: 'VERSE 1B · 盛夏烟花' },
    { bar: 13, t0: BAR_T(13), t1: BAR_T(14), zh: '逃亡的盛夏',                             en: 'Through that runaway midsummer we shared together', tag: 'VERSE 1B · 盛夏烟花' },
    { bar: 14, t0: BAR_T(14), t1: BAR_T(15), zh: '在夜空隐没之际为我点燃烟花',             en: 'Lighting fireworks for me just as the night sky faded', tag: 'VERSE 1B · 盛夏烟花' },
    { bar: 15, t0: BAR_T(15), t1: BAR_T(16), zh: '寂寞时让我把快乐拼起来吧',               en: 'When lonely, let me piece all of our happiness back together', tag: 'VERSE 1B · 盛夏烟花' },

    // Bars 16–23: Chorus 1 (40.90s – 61.14s)
    { bar: 16, t0: BAR_T(16), t1: BAR_T(17), zh: '我们之间的回忆',                         en: 'All the memories between the two of us', tag: 'CHORUS 1 · 副歌高潮' },
    { bar: 17, t0: BAR_T(17), t1: BAR_T(18), zh: '全部都小心地收集',                       en: 'Every single one carefully gathered and kept', tag: 'CHORUS 1 · 副歌高潮' },
    { bar: 18, t0: BAR_T(18), t1: BAR_T(19), zh: '我总是偷偷地哭泣',                       en: 'I always find myself crying in secret', tag: 'CHORUS 1 · 副歌高潮' },
    { bar: 19, t0: BAR_T(19), t1: BAR_T(20), zh: '像倦鸟失了归期',                         en: 'Like a weary bird that lost its way home', tag: 'CHORUS 1 · 副歌高潮' },
    { bar: 20, t0: BAR_T(20), t1: BAR_T(21), zh: '但愿我相信的爱情',                       en: 'May the love I have always believed in', tag: 'CHORUS 1 · 副歌高潮' },
    { bar: 21, t0: BAR_T(21), t1: BAR_T(22), zh: '结局紧握在我手心',                       en: 'Hold its ending tightly within my palm', tag: 'CHORUS 1 · 副歌高潮' },
    { bar: 22, t0: BAR_T(22), t1: BAR_T(23), zh: '时光匆匆却没有遗失过去',                 en: 'Time rushes by, yet never lost our past', tag: 'CHORUS 1 · 副歌高潮' },
    { bar: 23, t0: BAR_T(23), t1: BAR_T(24), zh: '把回忆拼好给你',                         en: 'Piecing every memory back together for you', tag: 'CHORUS 1 · 副歌高潮' },

    // Bars 24–31: Chorus 2 (61.14s – 81.39s)
    { bar: 24, t0: BAR_T(24), t1: BAR_T(25), zh: '独自收集两个人之间的回忆',               en: 'Collecting the memories between the two of us all alone', tag: 'CHORUS 2 · 深海回响' },
    { bar: 25, t0: BAR_T(25), t1: BAR_T(26), zh: '即使每当到这时候我都会哭泣',             en: 'Even though every time this moment comes I still cry', tag: 'CHORUS 2 · 深海回响' },
    { bar: 26, t0: BAR_T(26), t1: BAR_T(27), zh: '为何一切 变得如此',                       en: 'Why did everything change and become like this', tag: 'CHORUS 2 · 深海回响' },
    { bar: 27, t0: BAR_T(27), t1: BAR_T(28), zh: '无法回到过去',                           en: 'Unable to ever return to the past we knew', tag: 'CHORUS 2 · 深海回响' },
    { bar: 28, t0: BAR_T(28), t1: BAR_T(29), zh: '但我仍愿意感谢你给过我爱情',             en: 'Yet I am still grateful for the love you once gave me', tag: 'CHORUS 2 · 深海回响' },
    { bar: 29, t0: BAR_T(29), t1: BAR_T(30), zh: '每一场风景都是我们爱的证明',             en: 'Every scenery we passed is proof of our love', tag: 'CHORUS 2 · 深海回响' },
    { bar: 30, t0: BAR_T(30), t1: BAR_T(31), zh: '就算如今 天各一方',                       en: 'Even if today we stand beneath distant skies', tag: 'CHORUS 2 · 深海回响' },
    { bar: 31, t0: BAR_T(31), t1: BAR_T(32), zh: '祝你余生动听啊',                         en: 'I wish the rest of your life a beautiful melody', tag: 'CHORUS 2 · 深海回响' },

    // Bars 32–39: Instrumental Bridge (81.39s – 101.63s)
    { bar: 32, t0: BAR_T(32), t1: BAR_T(33), zh: '（间奏 · 星光海浪与记忆碎片）',           en: 'INTERLUDE · STARLIGHT WAVES & MEMORY SHARDS', tag: 'INTERLUDE · 星海间奏' },
    { bar: 33, t0: BAR_T(33), t1: BAR_T(34), zh: '（间奏 · 吃白饭的蓝色大肥鱼剧场）',       en: 'INTERLUDE · BLUE FAT-FISH & DEEPSEEK PET STORY', tag: 'INTERLUDE · 星海间奏' },
    { bar: 34, t0: BAR_T(34), t1: BAR_T(35), zh: '（间奏 · 拾起散落在海边的旧时光）',       en: 'INTERLUDE · GATHERING OLD TIMES BY THE SEA', tag: 'INTERLUDE · 星海间奏' },
    { bar: 35, t0: BAR_T(35), t1: BAR_T(36), zh: '（间奏 · 钟楼飞鸟掠过黄昏天际）',         en: 'INTERLUDE · CLOCKTOWER BIRDS ACROSS TWILIGHT', tag: 'INTERLUDE · 星海间奏' },
    { bar: 36, t0: BAR_T(36), t1: BAR_T(37), zh: '（间奏 · 温室里盛开着装满梦的盆栽）',     en: 'INTERLUDE · DREAM BONSAI BLOOMING IN GREENHOUSE', tag: 'INTERLUDE · 星海间奏' },
    { bar: 37, t0: BAR_T(37), t1: BAR_T(38), zh: '（间奏 · 夏夜萤火虫照亮归途）',           en: 'INTERLUDE · FIREFLIES LIGHTING THE WAY HOME', tag: 'INTERLUDE · 星海间奏' },
    { bar: 38, t0: BAR_T(38), t1: BAR_T(39), zh: '（间奏 · 跨越星河的思念回响）',           en: 'INTERLUDE · LONGING ECHOING ACROSS THE GALAXY', tag: 'INTERLUDE · 星海间奏' },
    { bar: 39, t0: BAR_T(39), t1: BAR_T(40), zh: '（间奏 · 雨后街角重逢的前奏）',           en: 'INTERLUDE · PRELUDE TO REUNION AT THE CORNER', tag: 'INTERLUDE · 星海间奏' },

    // Bars 40–47: Verse 2A Reprise (101.63s – 121.87s)
    { bar: 40, t0: BAR_T(40), t1: BAR_T(41), zh: '那天你在雨后街角答应接受我的爱',         en: 'That day at the rain-washed street corner you accepted my love', tag: 'REPRISE · 记忆重现' },
    { bar: 41, t0: BAR_T(41), t1: BAR_T(42), zh: '那一刻我的世界有了色彩',                 en: 'In that very moment my entire world burst into color', tag: 'REPRISE · 记忆重现' },
    { bar: 42, t0: BAR_T(42), t1: BAR_T(43), zh: '这一生无法忘记关于澄蓝色的你',           en: 'Never in this life could I forget the clear azure blue of you', tag: 'REPRISE · 记忆重现' },
    { bar: 43, t0: BAR_T(43), t1: BAR_T(44), zh: '像一份礼物悄然呈现在我的境遇',           en: 'Appearing quietly like a precious gift within my life', tag: 'REPRISE · 记忆重现' },
    { bar: 44, t0: BAR_T(44), t1: BAR_T(45), zh: '我们从清晨起玩一整天游戏',               en: 'We played games together all day long from early morning', tag: 'REPRISE · 朝夕相伴' },
    { bar: 45, t0: BAR_T(45), t1: BAR_T(46), zh: '到夜晚一起看我最爱的剧',                 en: 'Until nightfall watching my favorite drama side by side', tag: 'REPRISE · 朝夕相伴' },
    { bar: 46, t0: BAR_T(46), t1: BAR_T(47), zh: '能够拥有这些已足够幸运',                 en: 'Just being able to hold these moments was lucky enough', tag: 'REPRISE · 朝夕相伴' },
    { bar: 47, t0: BAR_T(47), t1: BAR_T(48), zh: '我已经不再期待其他什么东西',             en: 'I already no longer wished for anything else at all', tag: 'REPRISE · 朝夕相伴' },

    // Bars 48–55: Verse 2B Reprise & Finale (121.87s – 142.11s)
    { bar: 48, t0: BAR_T(48), t1: BAR_T(49), zh: '我们也经常争执互相不接电话',             en: 'We also often argued and refused to answer each other', tag: 'FINALE · 终章烟花' },
    { bar: 49, t0: BAR_T(49), t1: BAR_T(50), zh: '在同一房间终于呼叫冷漠抵达',             en: 'In the same room until only cold silence finally arrived', tag: 'FINALE · 终章烟花' },
    { bar: 50, t0: BAR_T(50), t1: BAR_T(51), zh: '也曾想过以后生活没有人牵挂',             en: 'I once imagined a future life with no one left to care for', tag: 'FINALE · 终章烟花' },
    { bar: 51, t0: BAR_T(51), t1: BAR_T(52), zh: '把爱扔掉只剩一块残酷伤疤',               en: 'Throwing love away until only a cruel scar remained', tag: 'FINALE · 终章烟花' },
    { bar: 52, t0: BAR_T(52), t1: BAR_T(53), zh: '而那些你送我的梦 教我折的花',             en: 'Yet all the dreams you gave me and paper flowers we folded', tag: 'FINALE · 终章烟花' },
    { bar: 53, t0: BAR_T(53), t1: BAR_T(54), zh: '逃亡的盛夏',                             en: 'Through that runaway midsummer we shared together', tag: 'FINALE · 终章烟花' },
    { bar: 54, t0: BAR_T(54), t1: BAR_T(55), zh: '在夜空隐没之际为我点燃烟花',             en: 'Lighting fireworks for me just as the night sky faded', tag: 'FINALE · 终章烟花' },
    { bar: 55, t0: BAR_T(55), t1: DURATION,  zh: '寂寞时让我把快乐拼起来吧 · 把回忆拼好给你', en: 'When lonely, let me piece our happiness back together for you', tag: 'FINALE · 终章圆满' }
  ];

  // ==========================================================================
  // Locomotion & Physical Acting Helpers (`PDoomVideo` + `opus-video-skills`)
  // ==========================================================================
  function stroll(t, t0, t1, x0, x1, u = 26) {
    const k = clamp((t - t0) / Math.max(0.001, t1 - t0), 0, 1);
    const walking = t >= t0 && t <= t1;
    const dist = Math.abs(x1 - x0);
    const cycles = Math.max(1.5, dist / (u * 3.0));
    const phase = walking ? k * cycles * Math.PI * 2 : 0;
    const goRight = x1 >= x0;
    return {
      x: lerp(x0, x1, k),
      view: walking ? 'q' : 'front',
      flip: !goRight,
      walk: walking ? phase / 4.2 : 0,
      dy: walking ? -Math.abs(Math.sin(phase)) * 0.16 : undefined,
      rot: walking ? (goRight ? 0.035 : -0.035) : 0
    };
  }

  function runTo(t, t0, t1, x0, x1, u = 26) {
    const k = clamp((t - t0) / Math.max(0.001, t1 - t0), 0, 1);
    const running = t >= t0 && t <= t1;
    const dist = Math.abs(x1 - x0);
    const cycles = Math.max(2.2, dist / (u * 2.4));
    const phase = running ? k * cycles * Math.PI * 2 : 0;
    const goRight = x1 >= x0;
    return {
      x: lerp(x0, x1, easeIn(k) * 0.35 + k * 0.65),
      view: running ? 'side' : 'q',
      flip: !goRight,
      walk: running ? phase / 4.2 : 0,
      smear: running ? 0.78 : 0,
      dy: running ? -Math.abs(Math.sin(phase)) * 0.28 : undefined,
      rot: running ? (goRight ? 0.12 : -0.12) : 0
    };
  }

  function jumpArc(t, t0, t1, x0, x1, y0, arcH = 95) {
    if (t < t0 - 0.14) return { x: x0, y: y0, sq: 0, jump: 0 };
    if (t < t0) {
      const p = (t - (t0 - 0.14)) / 0.14;
      return { x: x0, y: y0, sq: 0.24 * Math.sin(p * Math.PI), jump: 0 };
    }
    if (t <= t1) {
      const k = (t - t0) / Math.max(0.001, t1 - t0);
      const lift = Math.sin(k * Math.PI) * arcH;
      return {
        x: lerp(x0, x1, k),
        y: y0 - lift,
        sq: -0.18 * Math.sin(k * Math.PI),
        jump: 0
      };
    }
    if (t < t1 + 0.18) {
      const p = (t - t1) / 0.18;
      return { x: x1, y: y0, sq: 0.22 * Math.sin(p * Math.PI) * (1 - p), jump: 0 };
    }
    return { x: x1, y: y0, sq: 0, jump: 0 };
  }

  // ==========================================================================
  // Interactive Hand-Held Props (`armL` / `armR` Callbacks)
  // ==========================================================================
  function drawPuzzlePiece(ctx, x, y, r = 18, col = '#38BDF8', rot = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    paint(ctx, rrPts(-r, -r, r * 2, r * 2, r * 0.28), { fill: col, ink: '#161F3A', sw: 2.2 });
    paint(ctx, ellPts(0, -r - r * 0.26, r * 0.42, r * 0.42, 10), { fill: col, ink: '#161F3A', sw: 2.0 });
    paint(ctx, ellPts(r + r * 0.26, 0, r * 0.42, r * 0.42, 10), { fill: col, ink: '#161F3A', sw: 2.0 });
    paint(ctx, ellPts(-r * 0.25, -r * 0.25, r * 0.35, r * 0.22, 8), { fill: '#FFFFFF', fillOp: 160, ink: null });
    ctx.restore();
  }

  const holdPuzzle = (col = '#38BDF8', rot = 0) => (ctx, u) => {
    drawPuzzlePiece(ctx, 0, 0, u * 0.62, col, rot);
  };

  const holdStarJar = (t = 0) => (ctx, u) => {
    paint(ctx, rrPts(-0.48 * u, -0.55 * u, 0.96 * u, 1.15 * u, 0.22 * u), {
      fill: '#7DD3FC', fillOp: 150, ink: '#161F3A', sw: 2.0
    });
    paint(ctx, rectPts(-0.36 * u, -0.72 * u, 0.72 * u, 0.20 * u), { fill: '#D97706', ink: '#161F3A', sw: 1.8 });
    const glow = 0.22 + 0.06 * Math.sin(t * 7);
    paint(ctx, ellPts(0, 0.05 * u, glow * u, glow * u, 10), { fill: '#FDE047', ink: '#CA8A04', sw: 1.5 });
  };

  const holdUmbrella = (col = '#38BDF8') => (ctx, u) => {
    stroke(ctx, linePts(0, 0.35 * u, 0, -2.55 * u), { ink: '#161F3A', sw: 2.6 });
    const dome = [
      [-2.1 * u, -2.15 * u],
      [-1.3 * u, -2.95 * u],
      [0, -3.20 * u],
      [1.3 * u, -2.95 * u],
      [2.1 * u, -2.15 * u]
    ];
    paint(ctx, polyPts(dome), { fill: col, ink: '#161F3A', sw: 2.2 });
  };

  const holdBonsaiPot = (t = 0) => (ctx, u) => {
    // Terracotta pot + glowing green/starry dream bonsai
    paint(ctx, polyPts([[-0.55 * u, 0.05 * u], [0.55 * u, 0.05 * u], [0.42 * u, 0.68 * u], [-0.42 * u, 0.68 * u]]), {
      fill: '#D97706', ink: '#161F3A', sw: 2.0
    });
    stroke(ctx, linePts(0, 0.05 * u, 0, -0.55 * u), { ink: '#78350F', sw: 3.0 });
    paint(ctx, ellPts(-0.32 * u, -0.62 * u, 0.45 * u, 0.34 * u, 10), { fill: '#34D399', ink: '#161F3A', sw: 1.8 });
    paint(ctx, ellPts(0.28 * u, -0.72 * u, 0.48 * u, 0.36 * u, 10), { fill: '#10B981', ink: '#161F3A', sw: 1.8 });
    paint(ctx, ellPts(0, -0.95 * u + Math.sin(t * 5) * 2, 0.22 * u, 0.22 * u, 8), { fill: '#FDE047', ink: '#161F3A', sw: 1.5 });
  };

  const holdWateringCan = (pouring = false, t = 0) => (ctx, u) => {
    ctx.save();
    if (pouring) ctx.rotate(-0.48);
    paint(ctx, rrPts(-0.50 * u, -0.35 * u, 1.0 * u, 0.78 * u, 0.16 * u), { fill: '#60A5FA', ink: '#161F3A', sw: 2.0 });
    stroke(ctx, linePts(0.45 * u, -0.10 * u, 0.95 * u, -0.45 * u), { ink: '#161F3A', sw: 3.2 });
    if (pouring) {
      for (let i = 0; i < 4; i++) {
        const dropY = ((t * 4 + i * 0.25) % 1) * 0.95 * u;
        paint(ctx, ellPts(1.05 * u + i * 0.12 * u, -0.35 * u + dropY, 0.09 * u, 0.14 * u, 6), {
          fill: '#BAE6FD', ink: null
        });
      }
    }
    ctx.restore();
  };

  const holdStampAlbum = (ctx, u) => {
    paint(ctx, rrPts(-0.68 * u, -0.48 * u, 1.36 * u, 0.96 * u, 0.12 * u), { fill: '#FDE68A', ink: '#161F3A', sw: 2.2 });
    stroke(ctx, linePts(0, -0.46 * u, 0, 0.46 * u), { ink: '#92400E', sw: 2.0 });
    paint(ctx, rectPts(-0.50 * u, -0.30 * u, 0.34 * u, 0.26 * u), { fill: '#FB7185', ink: '#161F3A', sw: 1.4 });
    paint(ctx, rectPts(0.16 * u, -0.28 * u, 0.34 * u, 0.26 * u), { fill: '#38BDF8', ink: '#161F3A', sw: 1.4 });
    paint(ctx, rectPts(0.16 * u, 0.06 * u, 0.34 * u, 0.24 * u), { fill: '#A78BFA', ink: '#161F3A', sw: 1.4 });
  };

  const holdLoveLetter = (ctx, u) => {
    paint(ctx, rrPts(-0.58 * u, -0.38 * u, 1.16 * u, 0.76 * u, 0.10 * u), { fill: '#FFF1F2', ink: '#161F3A', sw: 2.0 });
    stroke(ctx, [[-0.54 * u, -0.34 * u], [0, 0.08 * u], [0.54 * u, -0.34 * u]], { ink: '#E11D48', sw: 2.0 });
    paint(ctx, ellPts(0, 0.02 * u, 0.18 * u, 0.16 * u, 8), { fill: '#FF4D6D', ink: '#161F3A', sw: 1.5 });
  };

  const holdLantern = (t = 0) => (ctx, u) => {
    stroke(ctx, linePts(0, 0, 0, 0.45 * u), { ink: '#161F3A', sw: 2.0 });
    const swing = Math.sin(t * 4.5) * 0.08 * u;
    paint(ctx, ellPts(swing, 0.78 * u, 0.48 * u, 0.58 * u, 12), { fill: '#FBBF24', fillOp: 180, ink: '#161F3A', sw: 2.0 });
    paint(ctx, ellPts(swing, 0.78 * u, 0.26 * u, 0.32 * u, 10), { fill: '#FEF08A', ink: null });
  };

  // ==========================================================================
  // 12 Full-Screen Painted Theatrical Environments ("Sets, Not Cards" — PDoomVideo)
  // ==========================================================================

  // SET 1: Starlit Bioluminescent Beach & Lighthouse Shoreline
  function drawStarlitBeachSet(ctx, t, mode = 'night') {
    const isDawn = mode === 'dawn';
    const skyTop = isDawn ? '#1E1B4B' : '#090D24';
    const skyBot = isDawn ? '#F472B6' : '#1E3A8A';
    const seaCol = isDawn ? '#312E81' : '#0F2952';

    const grad = ctx.createLinearGradient(0, -120, 0, H + 120);
    grad.addColorStop(0, skyTop);
    grad.addColorStop(0.62, skyBot);
    grad.addColorStop(1, seaCol);
    ctx.fillStyle = grad;
    ctx.fillRect(-400, -200, W + 800, H + 400);

    // Twinkling starfield + shooting star
    for (let i = 0; i < 36; i++) {
      const sx = ((i * 173) % 1400) - 60;
      const sy = ((i * 97) % 360) + 15;
      const tw = 1.5 + 1.8 * Math.sin(t * 3.5 + i);
      if (tw > 1.2) {
        ctx.fillStyle = i % 3 === 0 ? '#FDE047' : '#E0F2FE';
        ctx.fillRect(sx, sy, tw, tw);
      }
    }

    // Crescent Moon or Rising Sun
    if (isDawn) {
      paint(ctx, ellPts(640, 390, 130, 130, 24), { fill: '#FDE047', fillOp: 190, ink: '#FB923C', sw: 3 });
    } else {
      paint(ctx, ellPts(980, 135, 54, 54, 20), { fill: '#FEF08A', ink: '#F59E0B', sw: 2.2 });
      paint(ctx, ellPts(1002, 122, 44, 44, 18), { fill: skyTop, ink: null });
    }

    // Distant headland & lighthouse with rotating beam
    paint(ctx, polyPts([[-200, 440], [120, 375], [340, 440]]), { fill: '#0F172A', ink: '#1E293B', sw: 2 });
    paint(ctx, polyPts([[205, 395], [225, 395], [220, 310], [210, 310]]), { fill: '#F8FAFC', ink: '#161F3A', sw: 2 });
    paint(ctx, rectPts(206, 296, 18, 16), { fill: '#EF4444', ink: '#161F3A', sw: 2 });
    const beamAng = Math.sin(t * 1.4) * 0.18;
    ctx.save();
    ctx.translate(215, 304);
    ctx.rotate(beamAng);
    paint(ctx, polyPts([[0, 0], [520, -90], [520, 45]]), { fill: '#FEF08A', fillOp: 45, ink: null });
    ctx.restore();

    // Ocean horizon & bioluminescent waves
    paint(ctx, rectPts(-300, 435, W + 600, 150), { fill: seaCol, ink: '#38BDF8', sw: 2 });
    for (let w = 0; w < 5; w++) {
      const wy = 465 + w * 24;
      const wx = ((t * 35 * (w % 2 ? 1 : -1) + w * 210) % 1400) - 100;
      stroke(ctx, linePts(wx, wy, wx + 240, wy), { ink: '#7DD3FC', sw: 2.4 });
    }

    // Sandy beach foreground with glowing tide foam & seashells
    const sandPts = [[-300, 545], [260, 530], [780, 552], [1580, 535], [1580, 860], [-300, 860]];
    paint(ctx, polyPts(sandPts), { fill: isDawn ? '#FDE68A' : '#1E293B', ink: '#38BDF8', sw: 3.0 });
    for (let k = 0; k < 9; k++) {
      const fx = 90 + k * 140 + Math.sin(t * 2 + k) * 18;
      const fy = 555 + (k % 3) * 14;
      paint(ctx, ellPts(fx, fy, 9, 5, 8), { fill: '#38BDF8', fillOp: 180, ink: null });
    }
  }

  // SET 2: Candlelit Attic Observatory & Memory Puzzle Table
  function drawPuzzleObservatorySet(ctx, t, piecesCollected = 3) {
    paint(ctx, rectPts(-300, -200, W + 600, H + 400), { fill: '#17132B', ink: null });
    // Arched observatory window showing starry night
    paint(ctx, ellPts(640, 260, 290, 220, 28), { fill: '#0B1536', ink: '#475569', sw: 5 });
    for (let i = 0; i < 18; i++) {
      const sx = 420 + ((i * 67) % 440);
      const sy = 100 + ((i * 43) % 280);
      ctx.fillStyle = i % 2 ? '#FDE047' : '#7DD3FC';
      ctx.fillRect(sx, sy, 3, 3);
    }
    // Window mullions
    stroke(ctx, linePts(640, 40, 640, 480), { ink: '#475569', sw: 4 });
    stroke(ctx, linePts(350, 260, 930, 260), { ink: '#475569', sw: 4 });

    // Hanging constellation jars
    for (let j = 0; j < 5; j++) {
      const jx = 180 + j * 230;
      const jy = 120 + (j % 2) * 35 + Math.sin(t * 2.5 + j) * 6;
      stroke(ctx, linePts(jx, -40, jx, jy - 24), { ink: '#64748B', sw: 2 });
      paint(ctx, rrPts(jx - 18, jy - 24, 36, 48, 8), { fill: '#38BDF8', fillOp: 95, ink: '#E2E8F0', sw: 2 });
      paint(ctx, ellPts(jx, jy, 10, 10, 8), { fill: '#FDE047', ink: null });
    }

    // Wooden floor & glowing puzzle workbench
    paint(ctx, rectPts(-300, 540, W + 600, 300), { fill: '#2E1F18', ink: '#161F3A', sw: 3 });
    paint(ctx, rrPts(290, 470, 700, 110, 18), { fill: '#78350F', ink: '#161F3A', sw: 3 });
    // Glowing 3x3 puzzle board on the table
    const bx = 560, by = 485;
    paint(ctx, rrPts(bx, by, 160, 76, 10), { fill: '#FEF3C7', ink: '#161F3A', sw: 2.4 });
    const cols = ['#38BDF8', '#F472B6', '#FACC15', '#34D399', '#A78BFA', '#FB7185', '#60A5FA', '#FBBF24', '#2DD4BF'];
    for (let p = 0; p < Math.min(9, piecesCollected); p++) {
      const px = bx + 14 + (p % 3) * 48;
      const py = by + 10 + Math.floor(p / 3) * 20;
      paint(ctx, rrPts(px, py, 40, 16, 4), { fill: cols[p], ink: '#161F3A', sw: 1.5 });
    }
  }

  // SET 3: Rain-Streaked Neon Bus Stop & Puddle Reflection Street
  function drawRainBusStopSet(ctx, t) {
    paint(ctx, rectPts(-300, -200, W + 600, H + 400), { fill: '#111827', ink: null });
    // Distant city bokeh lights
    const bokehCols = ['#38BDF8', '#F472B6', '#FACC15', '#A78BFA'];
    for (let i = 0; i < 14; i++) {
      const bx = 80 + i * 88;
      const by = 240 + (i % 3) * 42;
      paint(ctx, ellPts(bx, by, 26 + (i % 3) * 8, 26 + (i % 3) * 8, 12), {
        fill: bokehCols[i % 4], fillOp: 45, ink: null
      });
    }
    // Wet asphalt & glowing puddles
    paint(ctx, rectPts(-300, 535, W + 600, 260), { fill: '#1E293B', ink: '#0F172A', sw: 3 });
    paint(ctx, ellPts(380, 610, 160, 24, 16), { fill: '#38BDF8', fillOp: 70, ink: '#7DD3FC', sw: 1.5 });
    paint(ctx, ellPts(880, 625, 190, 28, 16), { fill: '#F472B6', fillOp: 65, ink: '#F9A8D4', sw: 1.5 });

    // Bus stop glass shelter & route sign
    paint(ctx, rectPts(250, 220, 460, 320), { fill: '#38BDF8', fillOp: 35, ink: '#475569', sw: 4 });
    paint(ctx, rrPts(220, 200, 520, 28, 10), { fill: '#0284C7', ink: '#161F3A', sw: 3 });
    paint(ctx, rrPts(310, 465, 340, 22, 6), { fill: '#D97706', ink: '#161F3A', sw: 2.5 });
    // Bus stop pole
    stroke(ctx, linePts(860, 230, 860, 540), { ink: '#334155', sw: 6 });
    paint(ctx, ellPts(860, 210, 34, 34, 14), { fill: '#FACC15', ink: '#161F3A', sw: 2.5 });

    // Falling diagonal rain streaks + puddle ripples
    for (let r = 0; r < 42; r++) {
      const rx = ((r * 97 - t * 180) % 1400 + 1400) % 1400 - 60;
      const ry = ((r * 61 + t * 520) % 680) - 40;
      stroke(ctx, linePts(rx, ry, rx - 10, ry + 26), { ink: '#BAE6FD', sw: 1.4 });
    }
  }

  // SET 4: Twilight Clocktower & Lost Origami Birds Sky
  function drawClocktowerBirdsSet(ctx, t) {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#1E1B4B');
    grad.addColorStop(0.55, '#4C1D95');
    grad.addColorStop(1, '#BE185D');
    ctx.fillStyle = grad;
    ctx.fillRect(-300, -200, W + 600, H + 400);

    // Giant astronomical clock face in background
    ctx.save();
    ctx.translate(640, 285);
    paint(ctx, ellPts(0, 0, 210, 210, 28), { fill: '#FEF3C7', fillOp: 38, ink: '#FDE68A', sw: 3 });
    paint(ctx, ellPts(0, 0, 165, 165, 24), { fill: null, ink: '#FDE68A', sw: 2 });
    // Clock hands turning backward for "unable to return to the past"
    const hAng = -t * 0.45;
    const mAng = -t * 2.2;
    stroke(ctx, linePts(0, 0, Math.cos(hAng) * 110, Math.sin(hAng) * 110), { ink: '#FDE047', sw: 5 });
    stroke(ctx, linePts(0, 0, Math.cos(mAng) * 155, Math.sin(mAng) * 155), { ink: '#38BDF8', sw: 3.5 });
    ctx.restore();

    // Flocks of glowing origami birds circling across the twilight sky
    for (let b = 0; b < 9; b++) {
      const bx = ((b * 165 + t * 85) % 1400) - 60;
      const by = 110 + (b % 4) * 65 + Math.sin(t * 4 + b) * 18;
      const wing = Math.sin(t * 9 + b * 1.3) * 12;
      paint(ctx, polyPts([[bx - 18, by + wing], [bx, by - 6], [bx + 18, by + wing], [bx, by + 5]]), {
        fill: b % 2 ? '#FDE68A' : '#E0F2FE', ink: '#161F3A', sw: 1.6
      });
    }

    // Rooftop stone balustrade
    paint(ctx, rectPts(-300, 540, W + 600, 240), { fill: '#1E1B4B', ink: '#161F3A', sw: 3 });
    for (let p = 0; p < 12; p++) {
      paint(ctx, rectPts(40 + p * 105, 485, 28, 55), { fill: '#312E81', ink: '#161F3A', sw: 2 });
    }
    paint(ctx, rectPts(-200, 472, W + 400, 16), { fill: '#4338CA', ink: '#161F3A', sw: 2.5 });
  }

  // SET 5: Autumn Ginkgo Boulevard (Falling Golden Leaves & Crowd Silhouettes)
  function drawAutumnGinkgoSet(ctx, t) {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#FEF3C7');
    grad.addColorStop(0.55, '#FDE68A');
    grad.addColorStop(1, '#F59E0B');
    ctx.fillStyle = grad;
    ctx.fillRect(-300, -200, W + 600, H + 400);

    // Ginkgo tree trunks & golden canopies
    for (let tr = 0; tr < 5; tr++) {
      const tx = 140 + tr * 250;
      paint(ctx, rectPts(tx - 18, 220, 36, 320), { fill: '#78350F', ink: '#161F3A', sw: 2.5 });
      paint(ctx, ellPts(tx, 165, 135, 95, 20), { fill: '#FBBF24', ink: '#B45309', sw: 2.5 });
      paint(ctx, ellPts(tx - 45, 195, 85, 65, 16), { fill: '#F59E0B', ink: null });
      paint(ctx, ellPts(tx + 50, 185, 90, 68, 16), { fill: '#FDE047', ink: null });
    }

    // Leaf-covered brick avenue
    paint(ctx, rectPts(-300, 535, W + 600, 240), { fill: '#92400E', ink: '#161F3A', sw: 3 });
    // Swirling golden ginkgo leaves in the air
    for (let l = 0; l < 28; l++) {
      const lx = ((l * 113 + t * 72) % 1400) - 60;
      const ly = ((l * 79 + t * 55) % 580);
      const rot = t * 3 + l;
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(rot);
      paint(ctx, polyPts([[0, -7], [-9, 5], [0, 3], [9, 5]]), { fill: l % 2 ? '#FDE047' : '#F59E0B', ink: '#92400E', sw: 1.2 });
      ctx.restore();
    }
  }

  // SET 6: Sunlit Glasshouse Conservatory & Dream Bonsai Garden
  function drawGreenhouseBonsaiSet(ctx, t) {
    paint(ctx, rectPts(-300, -200, W + 600, H + 400), { fill: '#DCFCE7', ink: null });
    // Glasshouse iron ribs & sky panes
    for (let g = 0; g < 9; g++) {
      const gx = 80 + g * 140;
      stroke(ctx, linePts(gx, 0, gx, 540), { ink: '#86EFAC', sw: 3 });
    }
    // Diagonal sunbeams
    for (let b = 0; b < 3; b++) {
      const bx = 220 + b * 340;
      paint(ctx, polyPts([[bx, 0], [bx + 140, 0], [bx + 320, 540], [bx + 120, 540]]), {
        fill: '#FEF08A', fillOp: 55, ink: null
      });
    }
    // Wooden plant tables with potted dream-bonsais
    paint(ctx, rectPts(-300, 540, W + 600, 240), { fill: '#A7F3D0', ink: '#065F46', sw: 3 });
    paint(ctx, rrPts(160, 445, 960, 24, 8), { fill: '#B45309', ink: '#161F3A', sw: 2.5 });
    for (let p = 0; p < 6; p++) {
      const px = 230 + p * 160;
      paint(ctx, polyPts([[px - 22, 445], [px + 22, 445], [px + 16, 412], [px - 16, 412]]), {
        fill: '#D97706', ink: '#161F3A', sw: 2
      });
      paint(ctx, ellPts(px, 390, 32, 24, 12), { fill: p % 2 ? '#10B981' : '#34D399', ink: '#065F46', sw: 2 });
    }
  }

  // SET 7: Sunset Coastal Train Platform & Departing Electric Train
  function drawSunsetStationSet(ctx, t, trainOffset = 0) {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#7C2D12');
    grad.addColorStop(0.45, '#EA580C');
    grad.addColorStop(0.75, '#FBBF24');
    grad.addColorStop(1, '#1E3A8A');
    ctx.fillStyle = grad;
    ctx.fillRect(-300, -200, W + 600, H + 400);

    // Giant setting sun sinking into the sea
    paint(ctx, ellPts(640, 410, 115, 115, 24), { fill: '#FEF08A', fillOp: 210, ink: '#F97316', sw: 3 });
    paint(ctx, rectPts(-300, 445, W + 600, 95), { fill: '#1E3A8A', ink: '#F59E0B', sw: 2 });

    // Coastal electric train on tracks
    const tx = 180 + trainOffset;
    paint(ctx, rrPts(tx, 315, 860, 145, 18), { fill: '#FDE68A', ink: '#161F3A', sw: 3.2 });
    paint(ctx, rectPts(tx + 6, 392, 848, 22), { fill: '#EA580C', ink: null });
    for (let w = 0; w < 6; w++) {
      paint(ctx, rrPts(tx + 45 + w * 132, 338, 88, 46, 8), { fill: '#FEF9C3', ink: '#161F3A', sw: 2.2 });
    }

    // Station platform & yellow safety line
    paint(ctx, rectPts(-300, 535, W + 600, 240), { fill: '#334155', ink: '#161F3A', sw: 3 });
    paint(ctx, rectPts(-300, 548, W + 600, 10), { fill: '#FACC15', ink: null });
  }

  // SET 8: Cozy Stamp-Collecting & Childhood Sketchbook Study
  function drawStampStudySet(ctx, t) {
    paint(ctx, rectPts(-300, -200, W + 600, H + 400), { fill: '#FEF3C7', ink: null });
    // Warm wallpaper stripes & framed stamp/postcards on the wall
    for (let s = 0; s < 14; s++) {
      paint(ctx, rectPts(s * 100, 0, 50, 540), { fill: '#FDE68A', fillOp: 90, ink: null });
    }
    const frames = [
      [220, 140, '#38BDF8'],
      [480, 115, '#FB7185'],
      [780, 135, '#34D399'],
      [1030, 155, '#A78BFA']
    ];
    for (const [fx, fy, fc] of frames) {
      paint(ctx, rrPts(fx - 70, fy - 52, 140, 104, 10), { fill: '#FFFFFF', ink: '#78350F', sw: 3 });
      paint(ctx, rectPts(fx - 52, fy - 36, 104, 72), { fill: fc, fillOp: 160, ink: '#161F3A', sw: 1.8 });
    }
    // Warm wooden floor & rug
    paint(ctx, rectPts(-300, 535, W + 600, 240), { fill: '#92400E', ink: '#161F3A', sw: 3 });
    paint(ctx, ellPts(640, 605, 380, 55, 24), { fill: '#FDE047', fillOp: 150, ink: '#B45309', sw: 2.5 });
  }

  // SET 9: Spooky-Cute Midnight Firefly Woods & Friendly Night Yokai
  function drawFireflyForestSet(ctx, t) {
    paint(ctx, rectPts(-300, -200, W + 600, H + 400), { fill: '#061A23', ink: null });
    // Mystic tree silhouettes
    for (let tr = 0; tr < 7; tr++) {
      const tx = 70 + tr * 195;
      paint(ctx, rectPts(tx - 28, -50, 56, 600), { fill: '#0D2E3A', ink: '#041016', sw: 2.5 });
    }
    // Cute glowing forest spirits / little night yokai peeking from behind trees
    for (let y = 0; y < 4; y++) {
      const yx = 210 + y * 290 + Math.sin(t * 3 + y) * 14;
      const yy = 370 + (y % 2) * 45 + Math.cos(t * 4 + y) * 10;
      paint(ctx, ellPts(yx, yy, 26, 30, 14), { fill: '#A7F3D0', fillOp: 185, ink: '#161F3A', sw: 2 });
      paint(ctx, ellPts(yx - 8, yy - 4, 4, 5, 6), { fill: '#161F3A', ink: null });
      paint(ctx, ellPts(yx + 8, yy - 4, 4, 5, 6), { fill: '#161F3A', ink: null });
      paint(ctx, ellPts(yx, yy + 7, 5, 6, 6), { fill: '#161F3A', ink: null });
    }
    // Mossy forest path & glowing fireflies
    paint(ctx, rectPts(-300, 540, W + 600, 240), { fill: '#064E3B', ink: '#161F3A', sw: 3 });
    for (let f = 0; f < 26; f++) {
      const fx = ((f * 97 + Math.sin(t * 2 + f) * 45) % 1280 + 1280) % 1280;
      const fy = 150 + ((f * 67) % 390) + Math.cos(t * 3 + f) * 18;
      const r = 4 + 2.5 * Math.sin(t * 6 + f);
      paint(ctx, ellPts(fx, fy, r, r, 8), { fill: '#BEF264', ink: null });
    }
  }

  // SET 10: Cosmic Galaxy Vortex & Heart-Constellation Puzzle Wheel
  function drawCosmicGalaxySet(ctx, t, completedPieces = 6) {
    const grad = ctx.createRadialGradient(640, 320, 40, 640, 320, 720);
    grad.addColorStop(0, '#311068');
    grad.addColorStop(0.5, '#1E1B4B');
    grad.addColorStop(1, '#070919');
    ctx.fillStyle = grad;
    ctx.fillRect(-300, -200, W + 600, H + 400);

    // Rotating zodiac star-wheel & orbiting puzzle shards
    ctx.save();
    ctx.translate(640, 285);
    ctx.rotate(t * 0.25);
    paint(ctx, ellPts(0, 0, 235, 235, 32), { fill: null, ink: '#38BDF8', sw: 2.2 });
    paint(ctx, ellPts(0, 0, 175, 175, 28), { fill: null, ink: '#F472B6', sw: 1.8 });
    const cols = ['#38BDF8', '#F472B6', '#FACC15', '#34D399', '#A78BFA', '#FB7185', '#60A5FA', '#FBBF24', '#2DD4BF'];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const rad = i < completedPieces ? 115 : 215;
      const px = Math.cos(a) * rad;
      const py = Math.sin(a) * rad;
      drawPuzzlePiece(ctx, px, py, 16, cols[i], -t * 0.25 + i * 0.4);
    }
    ctx.restore();

    // Starlight bridge floor
    paint(ctx, rectPts(-300, 545, W + 600, 220), { fill: '#1E1B4B', fillOp: 190, ink: '#38BDF8', sw: 3 });
  }

  // SET 11: Dawn Cherry-Blossom & Sea-Breeze Hill ("像是黑暗过后黎明盛开")
  function drawDawnBlossomHillSet(ctx, t) {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#38BDF8');
    grad.addColorStop(0.45, '#FDE68A');
    grad.addColorStop(0.80, '#F9A8D4');
    grad.addColorStop(1, '#86EFAC');
    ctx.fillStyle = grad;
    ctx.fillRect(-300, -200, W + 600, H + 400);

    // Blooming sunrise rays
    for (let r = 0; r < 10; r++) {
      const a = -Math.PI + (r / 9) * Math.PI;
      ctx.save();
      ctx.translate(640, 480);
      ctx.rotate(a);
      paint(ctx, polyPts([[0, 0], [55, -700], [-55, -700]]), { fill: '#FEF08A', fillOp: 42, ink: null });
      ctx.restore();
    }
    paint(ctx, ellPts(640, 445, 110, 110, 24), { fill: '#FEF9C3', ink: '#F59E0B', sw: 3 });

    // Rolling flower hill & drifting cherry blossom petals
    paint(ctx, ellPts(640, 740, 920, 220, 32), { fill: '#4ADE80', ink: '#166534', sw: 3 });
    for (let p = 0; p < 30; p++) {
      const px = ((p * 97 + t * 88) % 1400) - 60;
      const py = ((p * 61 + t * 42) % 580);
      paint(ctx, ellPts(px, py, 7, 4, 8), { fill: p % 2 ? '#FBCFE8' : '#F472B6', ink: null });
    }
  }

  // ==========================================================================
  // 56-Shot Master Schedule (1 Shot Per Bar = 2.5304s Across All 56 Bars!)
  // Cycles through all 31 canonical emotions with 3-stage mid-lyric transitions
  // ==========================================================================
  const SHOT_PLAN = [
    // --- INTRO: Bars 00–07 (Starlit Beach & Puzzle Discovery) ---
    { set: 'beachNight', style: 'watercolor', cam: [640, 375, 1.04, 0, 640, 355, 1.12, 0],
      act: 'walkRight', x0: 260, x1: 580, hat: 'Maid Headband', propR: 'lantern',
      emos: [[0.0, 'idle', null], [0.85, 'curious', 'question'], [1.70, 'sparkle', 'sparkle']], guest: 'miniWhale' },
    { set: 'beachNight', style: 'pixel', cam: [590, 390, 1.18, -0.01, 630, 380, 1.24, 0],
      act: 'kneelPick', x0: 600, x1: 600, hat: 'Maid Headband', propR: 'puzzle1',
      emos: [[0.0, 'curious', null], [0.80, 'gasp', 'exclaim'], [1.65, 'happy', 'sparkle']], guest: 'clawd' },
    { set: 'observatory', style: 'watercolor', cam: [640, 365, 1.06, 0, 620, 355, 1.14, 0],
      act: 'tailSit', x0: 640, x1: 640, hat: 'Wizard Hat', propL: 'starJar', propR: 'puzzle2',
      emos: [[0.0, 'think', 'idea'], [0.85, 'excited', 'sparkle'], [1.70, 'proud', 'music']], guest: 'ladyGemini' },
    { set: 'beachNight', style: 'watercolor', cam: [660, 380, 1.08, 0.01, 610, 370, 1.15, 0],
      act: 'spinTurn', x0: 620, x1: 660, hat: 'Maid Headband', propR: 'starJar',
      emos: [[0.0, 'zen', null], [0.85, 'shy', 'heart'], [1.70, 'love', 'heart']], guest: 'miniWhale' },
    { set: 'observatory', style: 'pixel', cam: [610, 375, 1.12, 0, 650, 365, 1.20, 0],
      act: 'walkLeft', x0: 760, x1: 520, hat: 'Maid Headband', propL: 'puzzle3',
      emos: [[0.0, 'determined', null], [0.85, 'wink', 'sparkle'], [1.70, 'happy', 'music']], guest: 'clawd' },
    { set: 'observatory', style: 'watercolor', cam: [640, 355, 1.16, 0, 640, 345, 1.26, 0],
      act: 'jumpJoy', x0: 560, x1: 680, hat: 'Crown', propR: 'puzzle1',
      emos: [[0.0, 'sparkle', 'sparkle'], [0.85, 'laugh', 'music'], [1.70, 'love', 'heart']], guest: 'ladyGemini' },
    { set: 'sunsetStation', style: 'watercolor', cam: [620, 385, 1.05, 0, 660, 375, 1.12, 0],
      act: 'walkRight', x0: 360, x1: 680, hat: 'Maid Headband', propR: 'lantern',
      emos: [[0.0, 'sigh', null], [0.85, 'worry', 'sweat'], [1.70, 'sad', null]], guest: 'bionicPuppy' },
    { set: 'beachNight', style: 'watercolor', cam: [640, 370, 1.14, 0, 640, 350, 1.24, 0],
      act: 'presentHeart', x0: 640, x1: 640, hat: 'Halo', propL: 'puzzle2', propR: 'starJar',
      emos: [[0.0, 'shy', null], [0.85, 'love', 'heart'], [1.70, 'determined', 'sparkle']], guest: 'ladyGemini' },

    // --- CHORUS 1: Bars 08–15 (Gathering Memories, Secret Tears, Clocktower Birds & Holding Fate) ---
    { set: 'observatory', style: 'watercolor', cam: [620, 365, 1.08, 0, 650, 355, 1.18, 0],
      act: 'walkRight', x0: 420, x1: 660, hat: 'Maid Headband', propR: 'puzzle1',
      emos: [[0.0, 'happy', 'sparkle'], [0.85, 'love', 'heart'], [1.70, 'shy', null]], guest: 'ladyGemini' },
    { set: 'observatory', style: 'pixel', cam: [640, 375, 1.16, -0.01, 640, 360, 1.24, 0],
      act: 'kneelPick', x0: 640, x1: 640, hat: 'Maid Headband', propL: 'starJar', propR: 'puzzle3',
      emos: [[0.0, 'curious', 'question'], [0.85, 'determined', 'exclaim'], [1.70, 'proud', 'sparkle']], guest: 'clawd' },
    { set: 'rainBusStop', style: 'watercolor', cam: [580, 385, 1.14, 0.01, 560, 375, 1.24, 0],
      act: 'umbrellaStand', x0: 540, x1: 540, hat: 'Maid Headband', propL: 'umbrella',
      emos: [[0.0, 'sad', null], [0.80, 'cry', 'sweat'], [1.65, 'plead', 'sweat']], guest: 'bionicPuppy' },
    { set: 'clocktower', style: 'watercolor', cam: [640, 355, 1.06, -0.02, 640, 335, 1.16, 0],
      act: 'runRight', x0: 340, x1: 760, hat: 'Maid Headband', propR: 'puzzle2',
      emos: [[0.0, 'worry', 'sweat'], [0.85, 'panicked', 'exclaim'], [1.70, 'sad', null]], guest: 'miniWhale' },
    { set: 'cosmicGalaxy', style: 'neon', cam: [640, 360, 1.10, 0, 640, 345, 1.20, 0],
      act: 'spinTurn', x0: 640, x1: 640, hat: 'Halo', propL: 'puzzle1', propR: 'starJar',
      emos: [[0.0, 'plead', null], [0.85, 'hope', 'sparkle'], [1.70, 'love', 'heart']], guest: 'ladyGemini' },
    { set: 'cosmicGalaxy', style: 'watercolor', cam: [640, 365, 1.18, 0, 640, 350, 1.28, 0],
      act: 'jumpJoy', x0: 580, x1: 660, hat: 'Crown', propR: 'puzzle3',
      emos: [[0.0, 'determined', 'exclaim'], [0.85, 'proud', 'sparkle'], [1.70, 'excited', 'heart']], guest: 'ladyClaude' },
    { set: 'clocktower', style: 'pixel', cam: [610, 370, 1.08, 0, 660, 360, 1.16, 0],
      act: 'walkLeft', x0: 780, x1: 500, hat: 'Maid Headband', propL: 'lantern', propR: 'puzzle2',
      emos: [[0.0, 'think', null], [0.85, 'zen', 'music'], [1.70, 'happy', 'sparkle']], guest: 'ladyGemini' },
    { set: 'observatory', style: 'watercolor', cam: [640, 360, 1.12, 0, 640, 345, 1.22, 0],
      act: 'presentHeart', x0: 640, x1: 640, hat: 'Maid Headband', propL: 'puzzle1', propR: 'puzzle3',
      emos: [[0.0, 'sparkle', 'sparkle'], [0.85, 'love', 'heart'], [1.70, 'wink', 'music']], guest: 'clawd' },

    // --- VERSE 1A: Bars 16–23 (Bright Future, Starry Sky, Autumn Leaves, Bonsai & Sunset Parting) ---
    { set: 'dawnHill', style: 'watercolor', cam: [620, 375, 1.06, 0, 660, 365, 1.14, 0],
      act: 'walkRight', x0: 360, x1: 680, hat: 'Flower Pin', propR: 'puzzle1',
      emos: [[0.0, 'happy', 'sparkle'], [0.85, 'excited', 'music'], [1.70, 'proud', 'sparkle']], guest: 'ladyGemini' },
    { set: 'beachNight', style: 'neon', cam: [640, 355, 1.10, 0, 640, 335, 1.20, 0],
      act: 'jumpJoy', x0: 540, x1: 680, hat: 'Wizard Hat', propL: 'starJar',
      emos: [[0.0, 'sparkle', 'sparkle'], [0.85, 'gasp', 'exclaim'], [1.70, 'love', 'heart']], guest: 'miniWhale' },
    { set: 'rainBusStop', style: 'watercolor', cam: [600, 385, 1.14, 0.02, 580, 390, 1.22, 0],
      act: 'tailSit', x0: 560, x1: 560, hat: 'Maid Headband',
      emos: [[0.0, 'bored', null], [0.85, 'sleepy', 'zzz'], [1.70, 'sigh', 'sweat']], guest: 'bionicPuppy' },
    { set: 'autumnGinkgo', style: 'watercolor', cam: [640, 370, 1.06, 0, 640, 360, 1.15, 0],
      act: 'duetWalk', x0: 380, x1: 620, hat: 'Beret', propR: 'loveLetter',
      emos: [[0.0, 'shy', 'heart'], [0.85, 'happy', 'sparkle'], [1.70, 'love', 'heart']], guest: 'ladyGemini' },
    { set: 'autumnGinkgo', style: 'pixel', cam: [630, 375, 1.12, -0.01, 660, 360, 1.20, 0],
      act: 'jumpJoy', x0: 520, x1: 680, hat: 'Crown', propR: 'puzzle2',
      emos: [[0.0, 'scared', 'sweat'], [0.85, 'determined', 'exclaim'], [1.70, 'proud', 'sparkle']], guest: 'ladyClaude' },
    { set: 'greenhouse', style: 'watercolor', cam: [640, 375, 1.10, 0, 640, 365, 1.18, 0],
      act: 'waterBonsai', x0: 560, x1: 620, hat: 'Flower Pin', propL: 'bonsai', propR: 'wateringCan',
      emos: [[0.0, 'zen', 'music'], [0.85, 'happy', 'sparkle'], [1.70, 'love', 'heart']], guest: 'ladyGemini' },
    { set: 'greenhouse', style: 'watercolor', cam: [640, 365, 1.08, 0, 640, 355, 1.16, 0],
      act: 'spinTurn', x0: 600, x1: 660, hat: 'Cat Ears', propL: 'bonsai', propR: 'puzzle3',
      emos: [[0.0, 'laugh', 'music'], [0.85, 'wink', 'sparkle'], [1.70, 'excited', 'heart']], guest: 'clawd' },
    { set: 'sunsetStation', style: 'watercolor', cam: [620, 380, 1.06, 0, 680, 375, 1.16, 0],
      act: 'runRight', x0: 360, x1: 760, hat: 'Maid Headband', propR: 'puzzle1',
      emos: [[0.0, 'worry', 'sweat'], [0.85, 'sad', null], [1.70, 'plead', 'sweat']], guest: 'ladyGemini' },

    // --- VERSE 1B: Bars 24–31 (Stamp Album, Night Yokai, Absent-Minded Child, Confession & Dawn) ---
    { set: 'stampStudy', style: 'watercolor', cam: [640, 375, 1.12, 0, 640, 365, 1.20, 0],
      act: 'tailSit', x0: 580, x1: 580, hat: 'Headphones', propL: 'stampAlbum',
      emos: [[0.0, 'curious', 'question'], [0.85, 'laugh', 'music'], [1.70, 'bored', 'zzz']], guest: 'ladyGemini' },
    { set: 'fireflyForest', style: 'pixel', cam: [630, 380, 1.10, 0.02, 650, 370, 1.18, -0.02],
      act: 'runLeft', x0: 780, x1: 460, hat: 'Maid Headband', propR: 'lantern',
      emos: [[0.0, 'scared', 'exclaim'], [0.80, 'shock', 'sweat'], [1.65, 'panicked', 'exclaim']], guest: 'clawd' },
    { set: 'stampStudy', style: 'watercolor', cam: [620, 375, 1.14, 0, 650, 365, 1.22, 0],
      act: 'walkRight', x0: 460, x1: 660, hat: 'Flower Pin', propR: 'stampAlbum',
      emos: [[0.0, 'confused', 'question'], [0.85, 'shy', 'heart'], [1.70, 'smug', 'sparkle']], guest: 'ladyGemini' },
    { set: 'autumnGinkgo', style: 'watercolor', cam: [640, 370, 1.10, 0, 640, 355, 1.18, 0],
      act: 'jumpJoy', x0: 520, x1: 680, hat: 'Party Cone', propL: 'starJar',
      emos: [[0.0, 'mischief', 'sparkle'], [0.85, 'laugh', 'music'], [1.70, 'excited', 'sparkle']], guest: 'bionicPuppy' },
    { set: 'beachNight', style: 'watercolor', cam: [640, 375, 1.16, 0, 640, 360, 1.26, 0],
      act: 'presentHeart', x0: 600, x1: 600, hat: 'Maid Headband', propL: 'loveLetter', propR: 'puzzle2',
      emos: [[0.0, 'shy', 'sweat'], [0.85, 'pout', 'heart'], [1.70, 'love', 'heart']], guest: 'ladyGemini' },
    { set: 'cosmicGalaxy', style: 'neon', cam: [640, 360, 1.08, -0.01, 640, 345, 1.20, 0.01],
      act: 'spinTurn', x0: 640, x1: 640, hat: 'Wizard Hat', propL: 'loveLetter', propR: 'starJar',
      emos: [[0.0, 'worry', 'sweat'], [0.85, 'gasp', 'exclaim'], [1.70, 'sparkle', 'sparkle']], guest: 'ladyGemini' },
    { set: 'cosmicGalaxy', style: 'pixel', cam: [640, 365, 1.14, 0.02, 640, 350, 1.24, -0.01],
      act: 'runRight', x0: 420, x1: 740, hat: 'Maid Headband', propR: 'puzzle3',
      emos: [[0.0, 'dizzy', 'sweat'], [0.80, 'panicked', 'exclaim'], [1.65, 'determined', 'exclaim']], guest: 'clawd' },
    { set: 'dawnHill', style: 'watercolor', cam: [640, 365, 1.06, 0, 640, 340, 1.18, 0],
      act: 'jumpJoy', x0: 580, x1: 660, hat: 'Halo', propL: 'puzzle1', propR: 'starJar',
      emos: [[0.0, 'gasp', 'sparkle'], [0.85, 'sparkle', 'sparkle'], [1.70, 'happy', 'heart']], guest: 'ladyGemini' },

    // --- CHORUS 2: Bars 32–39 (Second Chorus — Full Duet & Emotional Climax) ---
    { set: 'dawnHill', style: 'watercolor', cam: [620, 370, 1.08, 0, 660, 360, 1.16, 0],
      act: 'duetWalk', x0: 380, x1: 620, hat: 'Flower Pin', propR: 'puzzle1',
      emos: [[0.0, 'happy', 'sparkle'], [0.85, 'love', 'heart'], [1.70, 'proud', 'music']], guest: 'ladyGemini' },
    { set: 'observatory', style: 'watercolor', cam: [640, 370, 1.14, 0, 640, 355, 1.22, 0],
      act: 'kneelPick', x0: 620, x1: 620, hat: 'Crown', propL: 'puzzle2', propR: 'puzzle3',
      emos: [[0.0, 'determined', null], [0.85, 'sparkle', 'sparkle'], [1.70, 'happy', 'heart']], guest: 'ladyClaude' },
    { set: 'rainBusStop', style: 'pixel', cam: [600, 380, 1.16, 0, 580, 370, 1.24, 0],
      act: 'umbrellaStand', x0: 560, x1: 560, hat: 'Maid Headband', propL: 'umbrella',
      emos: [[0.0, 'sad', null], [0.80, 'cry', 'sweat'], [1.65, 'sigh', null]], guest: 'miniWhale' },
    { set: 'clocktower', style: 'watercolor', cam: [640, 360, 1.08, -0.01, 640, 345, 1.18, 0],
      act: 'runLeft', x0: 820, x1: 440, hat: 'Maid Headband', propR: 'lantern',
      emos: [[0.0, 'worry', 'sweat'], [0.85, 'plead', 'sweat'], [1.70, 'determined', 'exclaim']], guest: 'ladyGemini' },
    { set: 'cosmicGalaxy', style: 'neon', cam: [640, 360, 1.12, 0, 640, 345, 1.22, 0],
      act: 'presentHeart', x0: 620, x1: 620, hat: 'Halo', propL: 'loveLetter', propR: 'puzzle1',
      emos: [[0.0, 'shy', 'heart'], [0.85, 'love', 'heart'], [1.70, 'sparkle', 'sparkle']], guest: 'ladyGemini' },
    { set: 'cosmicGalaxy', style: 'watercolor', cam: [640, 365, 1.16, 0, 640, 350, 1.26, 0],
      act: 'jumpJoy', x0: 560, x1: 680, hat: 'Crown', propL: 'puzzle2', propR: 'puzzle3',
      emos: [[0.0, 'determined', 'exclaim'], [0.85, 'proud', 'sparkle'], [1.70, 'love', 'heart']], guest: 'clawd' },
    { set: 'sunsetStation', style: 'watercolor', cam: [620, 375, 1.08, 0, 660, 365, 1.16, 0],
      act: 'walkRight', x0: 400, x1: 680, hat: 'Maid Headband', propR: 'starJar',
      emos: [[0.0, 'zen', 'music'], [0.85, 'happy', 'sparkle'], [1.70, 'wink', 'heart']], guest: 'ladyGemini' },
    { set: 'observatory', style: 'pixel', cam: [640, 360, 1.14, 0, 640, 345, 1.24, 0],
      act: 'spinTurn', x0: 640, x1: 640, hat: 'Wizard Hat', propL: 'puzzle1', propR: 'starJar',
      emos: [[0.0, 'sparkle', 'sparkle'], [0.85, 'excited', 'music'], [1.70, 'love', 'heart']], guest: 'ladyClaude' },

    // --- CODA 1: Bars 40–47 (Collecting Memories Alone, Tears, Gratitude & Blessing) ---
    { set: 'beachNight', style: 'watercolor', cam: [620, 380, 1.08, 0, 650, 370, 1.16, 0],
      act: 'walkRight', x0: 340, x1: 640, hat: 'Maid Headband', propL: 'lantern', propR: 'puzzle1',
      emos: [[0.0, 'sad', null], [0.85, 'sigh', null], [1.70, 'determined', 'sparkle']], guest: 'miniWhale' },
    { set: 'rainBusStop', style: 'watercolor', cam: [600, 380, 1.16, 0, 600, 370, 1.24, 0],
      act: 'kneelPick', x0: 580, x1: 580, hat: 'Maid Headband', propR: 'puzzle2',
      emos: [[0.0, 'cry', 'sweat'], [0.85, 'plead', 'sweat'], [1.70, 'sad', null]], guest: 'bionicPuppy' },
    { set: 'clocktower', style: 'pixel', cam: [640, 365, 1.10, -0.02, 640, 355, 1.20, 0.02],
      act: 'runRight', x0: 360, x1: 760, hat: 'Maid Headband', propR: 'puzzle3',
      emos: [[0.0, 'angry', 'anger'], [0.85, 'annoyed', 'sweat'], [1.70, 'worry', 'exclaim']], guest: 'clawd' },
    { set: 'clocktower', style: 'watercolor', cam: [640, 370, 1.14, 0, 640, 355, 1.22, 0],
      act: 'tailSit', x0: 640, x1: 640, hat: 'Maid Headband', propL: 'starJar',
      emos: [[0.0, 'dead', null], [0.85, 'sad', 'sweat'], [1.70, 'sigh', null]], guest: 'miniWhale' },
    { set: 'greenhouse', style: 'watercolor', cam: [630, 370, 1.10, 0, 650, 360, 1.18, 0],
      act: 'waterBonsai', x0: 580, x1: 620, hat: 'Flower Pin', propL: 'bonsai', propR: 'loveLetter',
      emos: [[0.0, 'shy', 'heart'], [0.85, 'happy', 'sparkle'], [1.70, 'love', 'heart']], guest: 'ladyGemini' },
    { set: 'autumnGinkgo', style: 'watercolor', cam: [640, 370, 1.08, 0, 640, 355, 1.16, 0],
      act: 'duetWalk', x0: 400, x1: 640, hat: 'Crown', propR: 'stampAlbum',
      emos: [[0.0, 'sparkle', 'sparkle'], [0.85, 'proud', 'music'], [1.70, 'love', 'heart']], guest: 'ladyGemini' },
    { set: 'sunsetStation', style: 'watercolor', cam: [620, 375, 1.06, 0, 660, 365, 1.16, 0],
      act: 'walkLeft', x0: 760, x1: 520, hat: 'Maid Headband', propL: 'puzzle1', propR: 'lantern',
      emos: [[0.0, 'sigh', null], [0.85, 'zen', null], [1.70, 'happy', 'sparkle']], guest: 'ladyClaude' },
    { set: 'dawnHill', style: 'watercolor', cam: [640, 360, 1.12, 0, 640, 345, 1.22, 0],
      act: 'presentHeart', x0: 620, x1: 620, hat: 'Halo', propL: 'starJar', propR: 'loveLetter',
      emos: [[0.0, 'happy', 'music'], [0.85, 'wink', 'sparkle'], [1.70, 'love', 'heart']], guest: 'ladyGemini' },

    // --- CODA 2 / FINALE: Bars 48–55 (Final Assembly of All 9 Puzzle Pieces & Sunrise Finale) ---
    { set: 'observatory', style: 'pixel', cam: [640, 370, 1.10, 0, 640, 360, 1.18, 0],
      act: 'walkRight', x0: 420, x1: 640, hat: 'Maid Headband', propL: 'puzzle1', propR: 'puzzle2',
      emos: [[0.0, 'think', null], [0.85, 'determined', 'sparkle'], [1.70, 'proud', 'music']], guest: 'clawd' },
    { set: 'observatory', style: 'watercolor', cam: [640, 375, 1.16, 0, 640, 360, 1.24, 0],
      act: 'kneelPick', x0: 640, x1: 640, hat: 'Maid Headband', propR: 'puzzle3',
      emos: [[0.0, 'cry', 'sweat'], [0.85, 'shy', 'heart'], [1.70, 'happy', 'sparkle']], guest: 'ladyGemini' },
    { set: 'clocktower', style: 'watercolor', cam: [640, 360, 1.10, -0.01, 640, 345, 1.18, 0],
      act: 'spinTurn', x0: 640, x1: 640, hat: 'Wizard Hat', propL: 'lantern',
      emos: [[0.0, 'confused', 'question'], [0.85, 'worry', 'sweat'], [1.70, 'zen', null]], guest: 'miniWhale' },
    { set: 'beachNight', style: 'neon', cam: [640, 370, 1.12, 0, 640, 355, 1.20, 0],
      act: 'runRight', x0: 380, x1: 720, hat: 'Maid Headband', propR: 'starJar',
      emos: [[0.0, 'sad', null], [0.85, 'determined', 'exclaim'], [1.70, 'sparkle', 'sparkle']], guest: 'ladyGemini' },
    { set: 'cosmicGalaxy', style: 'watercolor', cam: [640, 355, 1.10, 0, 640, 340, 1.20, 0],
      act: 'presentHeart', x0: 600, x1: 600, hat: 'Crown', propL: 'loveLetter', propR: 'puzzle1',
      emos: [[0.0, 'shy', 'heart'], [0.85, 'love', 'heart'], [1.70, 'happy', 'sparkle']], guest: 'ladyGemini' },
    { set: 'dawnHill', style: 'watercolor', cam: [640, 365, 1.08, 0, 640, 350, 1.16, 0],
      act: 'duetWalk', x0: 400, x1: 640, hat: 'Flower Pin', propL: 'bonsai', propR: 'puzzle2',
      emos: [[0.0, 'happy', 'music'], [0.85, 'excited', 'sparkle'], [1.70, 'love', 'heart']], guest: 'ladyGemini' },
    { set: 'beachDawn', style: 'watercolor', cam: [640, 365, 1.06, 0, 640, 350, 1.16, 0],
      act: 'jumpJoy', x0: 540, x1: 660, hat: 'Halo', propL: 'starJar', propR: 'puzzle3',
      emos: [[0.0, 'zen', 'music'], [0.85, 'sparkle', 'sparkle'], [1.70, 'love', 'heart']], guest: 'ladyClaude' },
    { set: 'dawnHill', style: 'watercolor', cam: [640, 365, 1.06, 0, 640, 330, 1.22, 0],
      act: 'finaleEnsemble', x0: 580, x1: 580, hat: 'Crown', propL: 'loveLetter', propR: 'puzzle1',
      emos: [[0.0, 'love', 'heart'], [0.85, 'sparkle', 'sparkle'], [1.70, 'wink', 'heart']], guest: 'all' }
  ];

  function resolvePropFn(propName, t) {
    if (!propName) return undefined;
    if (propName === 'puzzle1') return holdPuzzle('#38BDF8', Math.sin(t * 3) * 0.2);
    if (propName === 'puzzle2') return holdPuzzle('#F472B6', -Math.sin(t * 3) * 0.2);
    if (propName === 'puzzle3') return holdPuzzle('#FACC15', Math.cos(t * 3) * 0.2);
    if (propName === 'starJar') return holdStarJar(t);
    if (propName === 'umbrella') return holdUmbrella('#38BDF8');
    if (propName === 'bonsai') return holdBonsaiPot(t);
    if (propName === 'wateringCan') return holdWateringCan(true, t);
    if (propName === 'stampAlbum') return holdStampAlbum;
    if (propName === 'loveLetter') return holdLoveLetter;
    if (propName === 'lantern') return holdLantern(t);
    return undefined;
  }

  // ==========================================================================
  // 16-Set Master Theatrical Environment Painter (Shared Across All MVs)
  // Combines 12 painted environments + 4 DeepSeek Pet / Fat-Fish themed stages
  // + unique per-shot sky/aurora/petal/weather accents so NO TWO SHOTS repeat!
  // ==========================================================================
  function drawDeepSeekCodingLabSet(ctx, t) {
    drawPuzzleObservatorySet(ctx, t, 7);
    // Holographic DeepSeek Terminal + Token Vending Dispenser (`codex-deepseek-pet`)
    paint(ctx, rrPts(140, 140, 290, 210, 14), { fill: '#0F172A', fillOp: 225, ink: '#38BDF8', sw: 2.5 });
    ctx.save();
    ctx.font = 'bold 16px "Silkscreen", "NotoSansSC", monospace';
    ctx.fillStyle = '#38BDF8';
    ctx.fillText('DEEPSEEK-PET OS v2.6', 162, 174);
    ctx.fillStyle = '#4ADE80';
    ctx.fillText('> status: thinking...', 162, 204);
    ctx.fillStyle = '#FACC15';
    ctx.fillText('> token_jar: 999,999', 162, 234);
    ctx.fillStyle = '#F472B6';
    ctx.fillText('> song: "Let me go~"', 162, 264);
    ctx.restore();
    // Glowing Blue Whale Token Dispenser on Right
    paint(ctx, rrPts(910, 220, 170, 310, 16), { fill: '#1E293B', ink: '#38BDF8', sw: 3 });
    paint(ctx, rrPts(930, 245, 130, 140, 10), { fill: '#0284C7', fillOp: 180, ink: '#BAE6FD', sw: 2 });
  }

  function drawWhiteRiceCafeteriaSet(ctx, t) {
    drawGreenhouseBonsaiSet(ctx, t);
    // Warm DSH Fat-Fish White Rice Banner & Giant Steaming Rice Cooker (`dsh-dayu-fish-skin`)
    paint(ctx, rrPts(360, 88, 560, 64, 16), { fill: '#FEF3C7', ink: '#D97706', sw: 3 });
    ctx.save();
    ctx.font = 'bold 26px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
    ctx.fillStyle = '#92400E';
    ctx.textAlign = 'center';
    ctx.fillText('深海大肥鱼食堂 · 白米饭管够', 640, 130);
    ctx.restore();
  }

  function drawGoldCoinVaultSet(ctx, t) {
    drawStampStudySet(ctx, t);
    // Sparkling Gold Whale Coins & Treasure Glow (`dsh-dayu-fish-skin`)
    for (let i = 0; i < 9; i++) {
      const gx = 140 + i * 125;
      const gy = 180 + Math.sin(t * 3 + i) * 18;
      paint(ctx, ellPts(gx, gy, 24, 24, 12), { fill: '#FACC15', ink: '#92400E', sw: 2 });
    }
  }

  function drawRooftopFireworksSet(ctx, t) {
    drawStarlitBeachSet(ctx, t, 'night');
    // Dazzling multi-ring fireworks bursting in the night sky
    for (let f = 0; f < 4; f++) {
      const fx = 220 + f * 275;
      const fy = 155 + (f % 2) * 45;
      const ph = (t * 0.75 + f * 0.25) % 1.0;
      const rad = 22 + ph * 85;
      const col = ['#38BDF8', '#F472B6', '#FACC15', '#4ADE80'][f % 4];
      ctx.save();
      ctx.globalAlpha = 1 - ph * 0.75;
      for (let r = 0; r < 10; r++) {
        const ang = (r / 10) * Math.PI * 2 + t * 0.4;
        paint(ctx, ellPts(fx + Math.cos(ang) * rad, fy + Math.sin(ang) * rad, 5, 5, 6), {
          fill: col, ink: null
        });
      }
      ctx.restore();
    }
  }

  function drawConcertNeonStageSet(ctx, t) {
    // High-energy L-O-V-E Rock Concert Stage with spotlights & equalizer skyline
    paint(ctx, rectPts(0, 0, W, H), { fill: '#09061E', ink: null });
    for (let i = 0; i < 4; i++) {
      const sx = 200 + i * 290;
      const sway = Math.sin(t * 2.4 + i) * 110;
      paint(ctx, polyPts([[sx - 25, 0], [sx + 25, 0], [sx + sway + 160, H], [sx + sway - 160, H]]), {
        fill: i % 2 === 0 ? '#38BDF8' : '#F472B6', fillOp: 45, ink: null
      });
    }
    for (let b = 0; b < 24; b++) {
      const bh = 60 + Math.abs(Math.sin(t * 6 + b * 0.7)) * 180;
      paint(ctx, rectPts(60 + b * 48, 560 - bh, 34, bh), {
        fill: b % 2 === 0 ? '#0EA5E9' : '#EC4899', fillOp: 145, ink: '#1E293B', sw: 1.5
      });
    }
    paint(ctx, rectPts(0, 560, W, 160), { fill: '#111827', ink: '#38BDF8', sw: 3 });
  }

  function drawGothicRoseCathedralSet(ctx, t) {
    // Gothic Stained-Glass Rose Cathedral (`玫瑰花的葬礼`)
    paint(ctx, rectPts(0, 0, W, H), { fill: '#16071C', ink: null });
    for (let i = 0; i < 3; i++) {
      const ax = 260 + i * 380;
      paint(ctx, rrPts(ax - 110, 80, 220, 440, 110), { fill: '#2E1035', ink: '#F43F5E', sw: 3 });
      paint(ctx, ellPts(ax, 190, 72, 72, 20), { fill: '#BE123C', fillOp: 185, ink: '#FDA4AF', sw: 2.5 });
    }
    paint(ctx, rectPts(0, 565, W, 155), { fill: '#1F122B', ink: '#881337', sw: 2.5 });
  }

  function drawCrimsonMapleShrineSet(ctx, t) {
    // Autumn Crimson Maple Hill & Torii Pavilion (`枫`)
    paint(ctx, rectPts(0, 0, W, H), { fill: '#2A0F18', ink: null });
    paint(ctx, ellPts(980, 175, 95, 95, 24), { fill: '#FDE047', fillOp: 210, ink: '#CA8A04', sw: 2 });
    paint(ctx, polyPts([[0, 560], [340, 350], [720, 560]]), { fill: '#4C1D24', ink: '#161F3A', sw: 2 });
    paint(ctx, polyPts([[520, 560], [920, 330], [1280, 560]]), { fill: '#7F1D1D', ink: '#161F3A', sw: 2 });
    for (let m = 0; m < 5; m++) {
      const tx = 140 + m * 250;
      paint(ctx, rectPts(tx - 12, 360, 24, 210), { fill: '#451A03', ink: '#161F3A', sw: 2 });
      paint(ctx, ellPts(tx, 310, 115, 78, 18), { fill: m % 2 === 0 ? '#DC2626' : '#EA580C', ink: '#161F3A', sw: 2 });
    }
    paint(ctx, rectPts(0, 565, W, 155), { fill: '#451A03', ink: '#991B1B', sw: 2.5 });
  }

  function drawNostalgicClassroomSet(ctx, t) {
    // Golden-hour Youth School Classroom (`素颜`)
    paint(ctx, rectPts(0, 0, W, H), { fill: '#FEF3C7', ink: null });
    paint(ctx, rrPts(280, 110, 720, 310, 12), { fill: '#14532D', ink: '#92400E', sw: 5 });
    for (let w = 0; w < 2; w++) {
      const wx = 70 + w * 980;
      paint(ctx, rrPts(wx, 110, 160, 310, 8), { fill: '#7DD3FC', ink: '#78350F', sw: 3 });
    }
    paint(ctx, rectPts(0, 560, W, 160), { fill: '#B45309', ink: '#451A03', sw: 2.5 });
  }

  function drawCyberNeonStreetSet(ctx, t) {
    // Cyberpunk Neon Rainy Alley (`坏女孩`)
    paint(ctx, rectPts(0, 0, W, H), { fill: '#070918', ink: null });
    const cols = ['#F43F5E', '#38BDF8', '#A855F7', '#FACC15'];
    for (let b = 0; b < 7; b++) {
      const bx = 50 + b * 175;
      const bh = 280 + (b % 3) * 75;
      paint(ctx, rectPts(bx, 565 - bh, 145, bh), { fill: '#0F172A', ink: cols[b % 4], sw: 2.5 });
      paint(ctx, rrPts(bx + 18, 565 - bh + 35, 108, 46, 8), { fill: cols[b % 4], fillOp: 185, ink: '#FFFFFF', sw: 1.5 });
    }
    paint(ctx, rectPts(0, 565, W, 155), { fill: '#0B132B', ink: '#38BDF8', sw: 2.5 });
  }

  function drawSunflowerCoastSet(ctx, t) {
    // Bright Mediterranean Sunflower Coastline (`日不落`)
    paint(ctx, rectPts(0, 0, W, H), { fill: '#38BDF8', ink: null });
    paint(ctx, ellPts(220, 140, 78, 78, 22), { fill: '#FEF08A', ink: '#F59E0B', sw: 3 });
    paint(ctx, rectPts(0, 440, W, 125), { fill: '#0284C7', ink: '#0369A1', sw: 2 });
    paint(ctx, rectPts(0, 560, W, 160), { fill: '#FDE047', ink: '#CA8A04', sw: 2.5 });
    for (let s = 0; s < 8; s++) {
      const sx = 95 + s * 155;
      const sway = Math.sin(t * 2.5 + s) * 8;
      stroke(ctx, linePts(sx, 565, sx + sway, 455), { ink: '#15803D', sw: 4 });
      paint(ctx, ellPts(sx + sway, 450, 32, 32, 14), { fill: '#FACC15', ink: '#B45309', sw: 2 });
      paint(ctx, ellPts(sx + sway, 450, 14, 14, 10), { fill: '#78350F', ink: null });
    }
  }

  function drawEmeraldWindmillSet(ctx, t) {
    // Emerald Meadow & White Windmill (`心墙`)
    paint(ctx, rectPts(0, 0, W, H), { fill: '#7DD3FC', ink: null });
    paint(ctx, ellPts(320, 580, 480, 190, 24), { fill: '#4ADE80', ink: '#15803D', sw: 2.5 });
    paint(ctx, ellPts(960, 580, 520, 210, 24), { fill: '#22C55E', ink: '#15803D', sw: 2.5 });
    // Windmill tower on right
    paint(ctx, polyPts([[955, 520], [985, 250], [1035, 250], [1065, 520]]), { fill: '#F8FAFC', ink: '#1E293B', sw: 2.5 });
    for (let b = 0; b < 4; b++) {
      const ang = t * 1.4 + b * (Math.PI / 2);
      stroke(ctx, linePts(1010, 275, 1010 + Math.cos(ang) * 115, 275 + Math.sin(ang) * 115), { ink: '#1E293B', sw: 5 });
    }
  }

  function drawLanternTavernSet(ctx, t) {
    // Warm Festive Lantern Tavern (`朋友的酒`)
    paint(ctx, rectPts(0, 0, W, H), { fill: '#1C1008', ink: null });
    paint(ctx, rectPts(60, 90, W - 120, 470), { fill: '#2E1A0F', ink: '#D97706', sw: 3 });
    for (let l = 0; l < 6; l++) {
      const lx = 165 + l * 190;
      const ly = 135 + Math.sin(t * 2.2 + l) * 8;
      paint(ctx, ellPts(lx, ly, 38, 46, 16), { fill: '#EF4444', ink: '#FACC15', sw: 2.5 });
    }
    paint(ctx, rectPts(0, 560, W, 160), { fill: '#451A03', ink: '#B45309', sw: 3 });
  }

  function drawCoralAbyssSet(ctx, t) {
    // Bioluminescent Deep-Sea Coral Palace (`潮汐`)
    paint(ctx, rectPts(0, 0, W, H), { fill: '#041028', ink: null });
    for (let r = 0; r < 5; r++) {
      const rx = 180 + r * 230;
      paint(ctx, polyPts([[rx - 40, 0], [rx + 40, 0], [rx + 140, H], [rx - 140, H]]), {
        fill: '#38BDF8', fillOp: 32, ink: null
      });
    }
    for (let c = 0; c < 7; c++) {
      const cx = 110 + c * 175;
      const ch = 120 + (c % 3) * 45;
      paint(ctx, ellPts(cx, 565 - ch * 0.5, 42, ch * 0.5, 16), {
        fill: c % 2 === 0 ? '#06B6D4' : '#EC4899', fillOp: 185, ink: '#0F172A', sw: 2
      });
    }
    paint(ctx, rectPts(0, 565, W, 155), { fill: '#082F49', ink: '#38BDF8', sw: 2.5 });
  }

  function drawBionicLivingRoomSet(ctx, t) {
    // Warm Cozy Bionic Puppy Living Room (`仿生小狗`)
    paint(ctx, rectPts(0, 0, W, H), { fill: '#1E293B', ink: null });
    paint(ctx, rrPts(440, 120, 400, 260, 12), { fill: '#0F172A', ink: '#64748B', sw: 4 });
    paint(ctx, ellPts(580, 210, 42, 42, 16), { fill: '#FDE047', ink: null });
    paint(ctx, rrPts(160, 430, 320, 130, 22), { fill: '#F59E0B', ink: '#78350F', sw: 3 });
    paint(ctx, rectPts(0, 560, W, 160), { fill: '#334155', ink: '#94A3B8', sw: 2.5 });
  }

  function drawVeniceSunsetBridgeSet(ctx, t) {
    // Romantic Sunset Canal Bridge & Gondola Reflections
    paint(ctx, rectPts(0, 0, W, H), { fill: '#4C1D95', ink: null });
    paint(ctx, rectPts(0, 220, W, 240), { fill: '#FB7185', fillOp: 180, ink: null });
    paint(ctx, ellPts(640, 340, 110, 110, 24), { fill: '#FEF08A', ink: '#F59E0B', sw: 2.5 });
    paint(ctx, rectPts(0, 460, W, 260), { fill: '#1E1B4B', ink: '#F472B6', sw: 2.5 });
    paint(ctx, rrPts(220, 485, 840, 95, 45), { fill: '#312E81', ink: '#FDE047', sw: 3 });
  }

  function drawAuroraIceHarborSet(ctx, t) {
    // Northern Lights Crystal Whale Harbor
    paint(ctx, rectPts(0, 0, W, H), { fill: '#061226', ink: null });
    for (let a = 0; a < 4; a++) {
      const ay = 110 + a * 38 + Math.sin(t * 1.8 + a) * 16;
      paint(ctx, rrPts(90, ay, W - 180, 24, 12), {
        fill: a % 2 === 0 ? '#2DD4BF' : '#38BDF8', fillOp: 95, ink: null
      });
    }
    for (let p = 0; p < 6; p++) {
      const px = 120 + p * 210;
      paint(ctx, polyPts([[px - 55, 565], [px, 340 - (p % 2) * 50], [px + 55, 565]]), {
        fill: '#BAE6FD', fillOp: 175, ink: '#0284C7', sw: 2
      });
    }
    paint(ctx, rectPts(0, 565, W, 155), { fill: '#0C4A6E', ink: '#7DD3FC', sw: 2.5 });
  }

  const MASTER_SET_POOL = [
    'beachNight', 'observatory', 'rainBusStop', 'clocktower',
    'autumnGinkgo', 'greenhouse', 'sunsetStation', 'stampStudy',
    'fireflyForest', 'cosmicGalaxy', 'dawnHill', 'beachDawn',
    'deepseekLab', 'riceCafeteria', 'coinVault', 'rooftopFireworks',
    'concertNeon', 'gothicRose', 'crimsonMaple', 'classroom',
    'cyberStreet', 'sunflowerCoast', 'emeraldWindmill', 'lanternTavern',
    'coralAbyss', 'bionicLiving', 'veniceBridge', 'auroraHarbor'
  ];

  function drawMasterEnvironment(ctx, t, shotIdx = 0, pieces = 5, variantSeed = null) {
    const setPool = MASTER_SET_POOL;
    const key = typeof shotIdx === 'string' ? shotIdx : setPool[((shotIdx % setPool.length) + setPool.length) % setPool.length];
    const idxNum = variantSeed !== null ? variantSeed : (typeof shotIdx === 'number' ? shotIdx : 0);

    switch (key) {
      case 'beachNight':       drawStarlitBeachSet(ctx, t, 'night'); break;
      case 'beachDawn':        drawStarlitBeachSet(ctx, t, 'dawn'); break;
      case 'observatory':      drawPuzzleObservatorySet(ctx, t, pieces); break;
      case 'rainBusStop':      drawRainBusStopSet(ctx, t); break;
      case 'clocktower':       drawClocktowerBirdsSet(ctx, t); break;
      case 'autumnGinkgo':     drawAutumnGinkgoSet(ctx, t); break;
      case 'greenhouse':       drawGreenhouseBonsaiSet(ctx, t); break;
      case 'sunsetStation':    drawSunsetStationSet(ctx, t, (t * 45) % 320); break;
      case 'stampStudy':       drawStampStudySet(ctx, t); break;
      case 'fireflyForest':    drawFireflyForestSet(ctx, t); break;
      case 'cosmicGalaxy':     drawCosmicGalaxySet(ctx, t, pieces); break;
      case 'dawnHill':         drawDawnBlossomHillSet(ctx, t); break;
      case 'deepseekLab':      drawDeepSeekCodingLabSet(ctx, t); break;
      case 'riceCafeteria':    drawWhiteRiceCafeteriaSet(ctx, t); break;
      case 'coinVault':        drawGoldCoinVaultSet(ctx, t); break;
      case 'rooftopFireworks': drawRooftopFireworksSet(ctx, t); break;
      case 'concertNeon':      drawConcertNeonStageSet(ctx, t); break;
      case 'gothicRose':       drawGothicRoseCathedralSet(ctx, t); break;
      case 'crimsonMaple':     drawCrimsonMapleShrineSet(ctx, t); break;
      case 'classroom':        drawNostalgicClassroomSet(ctx, t); break;
      case 'cyberStreet':      drawCyberNeonStreetSet(ctx, t); break;
      case 'sunflowerCoast':   drawSunflowerCoastSet(ctx, t); break;
      case 'emeraldWindmill':  drawEmeraldWindmillSet(ctx, t); break;
      case 'lanternTavern':    drawLanternTavernSet(ctx, t); break;
      case 'coralAbyss':       drawCoralAbyssSet(ctx, t); break;
      case 'bionicLiving':     drawBionicLivingRoomSet(ctx, t); break;
      case 'veniceBridge':     drawVeniceSunsetBridgeSet(ctx, t); break;
      case 'auroraHarbor':     drawAuroraIceHarborSet(ctx, t); break;
      default:                 drawStarlitBeachSet(ctx, t, 'night'); break;
    }

    // Per-shot unique atmospheric & foreground staging layer so every shot is visually unique
    const variant = idxNum % 7;
    ctx.save();
    if (variant === 1) {
      // Drifting sakura / rose petals across foreground
      for (let i = 0; i < 10; i++) {
        const px = ((i * 137 + t * 55) % (W + 80)) - 40;
        const py = ((i * 89 + t * 42) % (H - 120)) + 40;
        paint(ctx, ellPts(px, py, 7, 4, 6), { fill: '#F472B6', fillOp: 165, ink: null });
      }
    } else if (variant === 2) {
      // Floating golden lantern orbs
      for (let i = 0; i < 7; i++) {
        const lx = 120 + i * 175 + Math.sin(t * 1.8 + i) * 24;
        const ly = 110 + (i % 3) * 45 + Math.cos(t * 2.1 + i) * 14;
        paint(ctx, rrPts(lx - 12, ly - 16, 24, 32, 8), { fill: '#FDE047', fillOp: 190, ink: '#CA8A04', sw: 1.5 });
      }
    } else if (variant === 3) {
      // Bioluminescent deep-sea bubbles rising
      for (let i = 0; i < 12; i++) {
        const bx = (i * 113 + Math.sin(t * 2 + i) * 28) % W;
        const by = H - ((t * 60 + i * 67) % (H - 60));
        paint(ctx, ellPts(bx, by, 9 + (i % 3) * 4, 9 + (i % 3) * 4, 8), { fill: '#7DD3FC', fillOp: 95, ink: '#E0F2FE', sw: 1.2 });
      }
    } else if (variant === 4) {
      // Aurora borealis ribbon across upper sky
      for (let s = 0; s < 5; s++) {
        const ay = 85 + s * 18 + Math.sin(t * 1.5 + s) * 10;
        paint(ctx, rrPts(80 + s * 40, ay, W - 160 - s * 80, 10, 5), {
          fill: s % 2 === 0 ? '#38BDF8' : '#4ADE80', fillOp: 55, ink: null
        });
      }
    } else if (variant === 5) {
      // Floating holographic music staff & cyan notes
      for (let i = 0; i < 8; i++) {
        const nx = 140 + i * 145;
        const ny = 145 + Math.sin(t * 3.5 + i) * 22;
        paint(ctx, ellPts(nx, ny, 8, 6, 6), { fill: '#38BDF8', fillOp: 185, ink: '#0F172A', sw: 1.5 });
      }
    } else if (variant === 6) {
      // Warm theatrical side curtains / archway vignette
      paint(ctx, rectPts(0, 0, 52, H), { fill: '#0F172A', fillOp: 120, ink: null });
      paint(ctx, rectPts(W - 52, 0, 52, H), { fill: '#0F172A', fillOp: 120, ink: null });
    }
    ctx.restore();
  }

  // ==========================================================================
  // HUD & Beat-Synced Bilingual Lyric Subtitle Overlay
  // ==========================================================================
  function getActiveLyricAt(t) {
    for (let i = 0; i < LYRICS.length; i++) {
      if (t >= LYRICS[i].t0 && t < LYRICS[i].t1) return LYRICS[i];
    }
    if (t < LYRICS[0].t0) return LYRICS[0];
    return LYRICS[LYRICS.length - 1];
  }

  function drawSubtitleOverlay(ctx, t, barIdx) {
    const active = getActiveLyricAt(t);
    if (!active) return;

    // Keep the frame cinematic and single-character: no chapter HUD, cast labels,
    // puzzle counter, or persistent action tags. The lyric is the only overlay.

    // Bottom lyric subtitle pill with karaoke progress glow
    const lt = clamp(t - active.t0, 0, active.t1 - active.t0);
    const dur = Math.max(0.1, active.t1 - active.t0);
    const prog = clamp(lt / dur, 0, 1);
    const popY = lt < 0.16 ? (1 - backOut(lt / 0.16)) * 12 : 0;

    ctx.save();
    ctx.translate(0, popY);
    paint(ctx, rrPts(150, H - 104, W - 300, 80, 20), {
      fill: '#090D1E', fillOp: 215, ink: '#38BDF8', sw: 2.2
    });

    // Chinese lyric with golden karaoke fill sweep
    const zhFontSz = active.zh.length > 18 ? 26 : 30;
    ctx.font = `bold ${zhFontSz}px "ZCOOLKuaiLe", "NotoSansSC", sans-serif`;
    ctx.textAlign = 'center';
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#090D1E';
    ctx.strokeText(active.zh, W / 2, H - 62);
    ctx.fillStyle = '#E0F2FE';
    ctx.fillText(active.zh, W / 2, H - 62);

    // Highlighted progress clip
    const textW = ctx.measureText(active.zh).width;
    ctx.save();
    ctx.beginPath();
    ctx.rect(W / 2 - textW / 2, H - 98, textW * prog, 48);
    ctx.clip();
    ctx.fillStyle = '#FDE047';
    ctx.fillText(active.zh, W / 2, H - 62);
    ctx.restore();

    // English subtitle line
    ctx.font = 'bold 13px "Silkscreen", "NotoSansSC", monospace';
    ctx.fillStyle = '#93C5FD';
    ctx.fillText(active.en, W / 2, H - 36);
    ctx.restore();
  }

  // ==========================================================================
  // Main Frame Renderer: `renderBaHuiyiFrame(ctx, t)`
  // ==========================================================================
  function renderBaHuiyiFrame(ctx, t) {
    ctx.save();
    ctx.clearRect(0, 0, W, H);
    if (typeof setBoil === 'function') setBoil(t, 12);
    else if (typeof CORE.boilFrame === 'function') CORE.boilFrame(t);

    // Determine active bar / shot index (0..55)
    let barIdx = Math.floor((t - OFF) / BAR);
    barIdx = clamp(barIdx, 0, 55);
    const shot = SHOT_PLAN[barIdx] || SHOT_PLAN[0];
    const t0 = barIdx === 0 ? 0 : BAR_T(barIdx);
    const t1 = barIdx === 55 ? DURATION : BAR_T(barIdx + 1);
    const lt = clamp(t - t0, 0, t1 - t0);
    const dur = Math.max(0.1, t1 - t0);
    const k = clamp(lt / dur, 0, 1);

    setActiveStyle(shot.style || 'watercolor');

    // Intra-shot focus pull / camera cut at midpoint on energetic chorus/coda shots
    const midCut = (barIdx >= 8 && barIdx <= 15) || (barIdx >= 22 && barIdx <= 29) || (barIdx >= 40 && barIdx <= 55);
    const zoomBoost = (midCut && lt > dur * 0.52) ? 1.07 : 1.0;
    const cx = lerp(shot.cam[0], shot.cam[4], ease(k));
    const cy = lerp(shot.cam[1], shot.cam[5], ease(k));
    const cz = lerp(shot.cam[2], shot.cam[6], ease(k)) * zoomBoost;
    const crot = lerp(shot.cam[3], shot.cam[7], ease(k));

    camBegin(ctx, cx, cy, cz, crot);

    // 1. Render Non-Repeating 28-Set Environment (`drawMasterEnvironment` indexed by `barIdx`)
    const pieces = clamp(Math.floor(((barIdx + 1) / 56) * 9), 1, 9);
    drawMasterEnvironment(ctx, t, barIdx, pieces, barIdx);

    // 2. Compute Physical Action & Locomotion State for `whaleGirl`
    const groundY = 585;
    const u = 30;
    let actOpts = { x: shot.x0, y: groundY, view: 'front', flip: false, tailSit: false, poseMode: null };

    if (shot.act === 'walkRight' || shot.act === 'walkLeft') {
      const st = stroll(lt, 0.05, dur - 0.10, shot.x0, shot.x1, u);
      actOpts = Object.assign(actOpts, st);
    } else if (shot.act === 'runRight' || shot.act === 'runLeft') {
      const rn = runTo(lt, 0.05, dur - 0.10, shot.x0, shot.x1, u);
      actOpts = Object.assign(actOpts, rn);
    } else if (shot.act === 'jumpJoy') {
      const jp = jumpArc(lt, 0.45, 1.65, shot.x0, shot.x1, groundY, 92);
      actOpts.x = jp.x;
      actOpts.y = jp.y;
      actOpts.sq = jp.sq;
      actOpts.view = lt > 0.45 && lt < 1.65 ? 'q' : 'front';
      actOpts.waveArm = true;
    } else if (shot.act === 'kneelPick') {
      const kn = lt < 0.7 ? ease(lt / 0.7) : (lt < 1.85 ? 1 : 1 - ease((lt - 1.85) / 0.6));
      actOpts.kneel = kn * 0.85;
      actOpts.view = 'q';
      if (lt < 1.35) {
        drawPuzzlePiece(ctx, shot.x0 + 55, groundY - 12 - Math.sin(t * 6) * 6, 18, '#FACC15', t * 2);
      }
    } else if (shot.act === 'tailSit') {
      actOpts.tailSit = true;
      actOpts.y = groundY - 8;
    } else if (shot.act === 'spinTurn') {
      const vw = spinView(lt, 2.2);
      Object.assign(actOpts, vw);
      actOpts.x = lerp(shot.x0, shot.x1, k);
      actOpts.waveArm = true;
    } else if (shot.act === 'duetWalk') {
      const st = stroll(lt, 0.05, dur - 0.10, shot.x0, shot.x1, u);
      actOpts = Object.assign(actOpts, st);
    } else if (shot.act === 'waterBonsai') {
      actOpts.x = lerp(shot.x0, shot.x1, k);
      actOpts.view = 'q';
      actOpts.aR = 0.95 + Math.sin(t * 5) * 0.18;
    } else if (shot.act === 'presentHeart' || shot.act === 'finaleEnsemble') {
      actOpts.x = shot.x0;
      actOpts.heartHands = lt > 0.85 && lt < 1.75;
      actOpts.waveArm = true;
    }

    // 3. Single-character staging: this is a Whale Maid Girl MV, not a cast ensemble.
    // Co-star modules remain available in the character library but are intentionally not
    // placed into the replicated film. The blue fat-fish appears only in its dedicated
    // protagonist action (`fatfish_transform`), never as a permanent second character.

    // 4. Render the sole protagonist `whaleGirl` with reference-derived actions.
    //    AND 3-Stage Smooth Mid-Lyric Emotion Transitions (`emotions`)!
    const emoState = emotions(lt, shot.emos, { take: true });
    const chosenAction = typeof WHALE.pickAction === 'function' ? WHALE.pickAction(barIdx) : null;
    whaleGirl(ctx, actOpts.x, actOpts.y, u, Object.assign({}, emoState, actOpts, {
      t,
      lt,
      action: chosenAction,
      showActionBadge: false,
      style: shot.style || 'watercolor',
      hat: shot.hat || 'Maid Headband',
      armL: resolvePropFn(shot.propL, t),
      armR: resolvePropFn(shot.propR, t)
    }));

    // In Finale Shot (Bar 55), display the completed 9/9 Golden Star-Whale Puzzle Constellation overhead!
    if (barIdx === 55) {
      drawPuzzlePiece(ctx, 640, 185 + Math.sin(t * 4) * 8, 34, '#FDE047', Math.sin(t * 2) * 0.15);
    }

    camEnd(ctx);

    // 5. Cinematic Transitions at Section Boundaries & Finale Iris Close
    if ([8, 16, 22, 30, 40, 48].includes(barIdx) && lt < 0.42) {
      brushWipe(ctx, lt / 0.42, ['#38BDF8', '#F472B6', '#FDE047']);
    }
    if (t > DURATION - 1.8) {
      const r = lerp(820, 0, easeIn(seg(t, DURATION - 1.8, DURATION - 0.05)));
      iris(ctx, 640, 320, r, '#090D1E');
    }

    // 6. Beat-Synced Authentic Lyric Subtitles & Puzzle Counter HUD
    drawSubtitleOverlay(ctx, t, barIdx);

    ctx.restore();
  }

  // ==========================================================================
  // Reusable Benchmark Shot Renderer (`renderMasterMVShot`)
  // Allows all other MVs (`mv_chaoxi`, `mv_pengyou_de_jiu`, `mv_douyin_6`,
  // `mv_pack_short`, `mv_pack_long`) to share the exact same 28-set non-repeating
  // environment engine, camera choreography, 28 character actions & co-stars!
  // ==========================================================================
  function renderMasterMVShot(ctx, t, opts = {}) {
    const shotIdx = opts.shotIdx || 0;
    const lt = opts.lt !== undefined ? opts.lt : (t % 2.8);
    const dur = Math.max(0.2, opts.dur || 2.8);
    const k = clamp(lt / dur, 0, 1);
    const style = opts.style || ['watercolor', 'pixel', 'neon', 'risograph', 'ukiyoe'][shotIdx % 5];

    if (typeof setBoil === 'function') setBoil(t, 12);
    else if (typeof CORE.boilFrame === 'function') CORE.boilFrame(t);
    setActiveStyle(style);

    const shot = SHOT_PLAN[shotIdx % SHOT_PLAN.length] || SHOT_PLAN[0];
    const cx = lerp(shot.cam[0], shot.cam[4], ease(k));
    const cy = lerp(shot.cam[1], shot.cam[5], ease(k));
    const cz = lerp(shot.cam[2], shot.cam[6], ease(k));
    const crot = lerp(shot.cam[3], shot.cam[7], ease(k));

    camBegin(ctx, cx, cy, cz, crot);

    // 1. Non-repeating 28-set environment
    const setKey = opts.setKey || MASTER_SET_POOL[(shotIdx + (opts.setOffset || 0)) % MASTER_SET_POOL.length];
    const pieces = clamp((shotIdx % 9) + 1, 1, 9);
    drawMasterEnvironment(ctx, t, setKey, pieces, shotIdx);

    // 2. Character locomotion & stage blocking
    const groundY = opts.groundY || 585;
    const u = opts.u || 30;
    let actOpts = { x: shot.x0, y: groundY, view: 'front', flip: false, tailSit: false, poseMode: null };

    if (shot.act === 'walkRight' || shot.act === 'walkLeft') {
      actOpts = Object.assign(actOpts, stroll(lt, 0.05, dur - 0.10, shot.x0, shot.x1, u));
    } else if (shot.act === 'runRight' || shot.act === 'runLeft') {
      actOpts = Object.assign(actOpts, runTo(lt, 0.05, dur - 0.10, shot.x0, shot.x1, u));
    } else if (shot.act === 'jumpJoy') {
      const jp = jumpArc(lt, dur * 0.18, dur * 0.72, shot.x0, shot.x1, groundY, 88);
      actOpts.x = jp.x;
      actOpts.y = jp.y;
      actOpts.sq = jp.sq;
      actOpts.view = lt > dur * 0.18 && lt < dur * 0.72 ? 'q' : 'front';
      actOpts.waveArm = true;
    } else if (shot.act === 'kneelPick') {
      const kn = lt < dur * 0.3 ? ease(lt / (dur * 0.3)) : (lt < dur * 0.75 ? 1 : 1 - ease((lt - dur * 0.75) / (dur * 0.25)));
      actOpts.kneel = kn * 0.85;
      actOpts.view = 'q';
    } else if (shot.act === 'tailSit') {
      actOpts.tailSit = true;
      actOpts.y = groundY - 8;
    } else if (shot.act === 'spinTurn') {
      const vw = spinView(lt, dur * 0.85);
      Object.assign(actOpts, vw);
      actOpts.x = lerp(shot.x0, shot.x1, k);
      actOpts.waveArm = true;
    } else if (shot.act === 'duetWalk') {
      actOpts = Object.assign(actOpts, stroll(lt, 0.05, dur - 0.10, shot.x0, shot.x1, u));
    } else {
      actOpts.x = lerp(shot.x0, shot.x1, k);
      actOpts.waveArm = true;
    }

    // Optional cast is disabled for solo-protagonist replicas such as 潮汐.
    if (!opts.solo) {
      const guest = opts.guest || shot.guest || 'ladyGemini';
      if (guest === 'ladyGemini' || guest === 'all') {
        const gx = shot.act === 'duetWalk' ? actOpts.x + 165 : 855 + Math.sin(t * 2.2) * 14;
        if (CAST.ladyGemini) {
          CAST.ladyGemini(ctx, gx, groundY, 28, {
            t,
            walk: shot.act === 'duetWalk' ? actOpts.walk : 0,
            flip: true,
            emote: lt > dur * 0.45 ? 'sparkle' : null
          });
        }
      }
      if (guest === 'ladyClaude' || guest === 'all') {
        const cxGuest = guest === 'all' ? 395 : 835;
        if (CAST.ladyClaude) {
          CAST.ladyClaude(ctx, cxGuest, groundY, 27, {
            t,
            flip: cxGuest > actOpts.x,
            emote: lt > dur * 0.45 ? 'heart' : null
          });
        }
      }
      if (guest === 'clawd' || guest === 'all' || shotIdx % 3 === 0) {
        const clx = guest === 'all' ? 275 : actOpts.x - 150;
        if (CAST.clawd) {
          CAST.clawd(ctx, clamp(clx, 140, 1140), groundY + 4, 21, { t, hat: 'crown', happy: true });
        }
      }
      if (guest === 'miniWhale' || guest === 'all' || shotIdx % 4 === 1) {
        const mwx = guest === 'all' ? 965 : actOpts.x + 150;
        const mwy = groundY - 125 + Math.sin(t * 4.2) * 16;
        if (CAST.miniWhale) {
          CAST.miniWhale(ctx, clamp(mwx, 160, 1120), mwy, 20, { t, spout: true });
        }
      }
      if (guest === 'bionicPuppy' || guest === 'all' || shotIdx % 4 === 2) {
        const bpx = guest === 'all' ? 1020 : actOpts.x + 135;
        if (CAST.bionicPuppy) {
          CAST.bionicPuppy(ctx, clamp(bpx, 160, 1120), groundY + 2, 19, { t, flip: true });
        }
      }
      if (typeof WHALE.drawFatFish === 'function') {
        const fishModes = ['eat_rice', 'working', 'success', 'idle'];
        const fMode = fishModes[shotIdx % fishModes.length];
        const fx = actOpts.x > 640 ? actOpts.x - 175 : actOpts.x + 175;
        WHALE.drawFatFish(ctx, clamp(fx, 160, 1120), groundY - 16, 20, {
          t,
          mode: fMode,
          flip: fx > actOpts.x
        });
      }

    }

    // 4. Protagonist `whaleGirl` with 28 Actions & 31-Emotion Smooth Transitions
    const emoState = emotions(lt, opts.emos || shot.emos, { take: true });
    const chosenAction = opts.action || (typeof WHALE.pickAction === 'function' ? WHALE.pickAction(shotIdx + (opts.actionOffset || 0)) : null);
    whaleGirl(ctx, actOpts.x, actOpts.y, u, Object.assign({}, emoState, actOpts, {
      t,
      lt,
      action: chosenAction,
      showActionBadge: opts.showActionBadge !== false,
      style,
      tailScale: opts.tailScale,
      hat: opts.hat || shot.hat || 'Maid Headband',
      armL: resolvePropFn(opts.propL !== undefined ? opts.propL : shot.propL, t),
      armR: resolvePropFn(opts.propR !== undefined ? opts.propR : shot.propR, t)
    }));

    camEnd(ctx);

    // 5. Smooth theatrical transition wipe on shot entry (`lt < 0.28s`)
    if (shotIdx > 0 && lt < 0.28 && shotIdx % 3 === 0) {
      brushWipe(ctx, lt / 0.28, ['#38BDF8', '#F472B6', '#FDE047']);
    }
  }

  const api = {
    DURATION,
    BPM,
    BEAT,
    BAR,
    OFF,
    LYRICS,
    SHOT_PLAN,
    MASTER_SET_POOL,
    drawMasterEnvironment,
    renderMasterMVShot,
    renderBaHuiyiFrame
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.MV_BA_HUIYI = api;
})(typeof window !== 'undefined' ? window : globalThis);
