// ============================================================================
// src/mv_douyin_6.js — 《仿生小狗》(深海鲸鱼娘·年糕篇) Full 46.70s MV Director
// Replicated from `每天每天的抖音 - 抖音_6.mp4` (46.70s, 30fps, 1280x720)
// Protagonist: `whaleGirl` (`src/whale_girl.js` 7-bone articulated rig) as the
//              Bionic Companion ("年糕"), paired with the Owner ("主人") and
//              `CAST.bionicPuppy` / `CAST.miniWhale` (`src/cast.js`).
// Audio & Beat Sync: `assets/douyin_6.mp3` + `assets/douyin_6_audio.js`
// Style: Warm Storyboard Watercolor + 16-Bit Bionic OS HUD Cinema (1 video per MV)
// ============================================================================

(function (root) {
  const CORE = root.CORE || (typeof require !== 'undefined' ? require('./core.js') : {});
  const WHALE = root.WHALE_GIRL || (typeof require !== 'undefined' ? require('./whale_girl.js') : {});
  const CAST = root.CAST || (typeof require !== 'undefined' ? require('./cast.js') : {});

  const {
    W, H, FPS, TAU, PAL,
    clamp, lerp, seg, ease, easeIn, easeOut, backOut, wob, hash,
    reseedBoil, boilSeed, beatPulse, hitPulse, energyAt, bassAt, voiceAt,
    setActiveStyle, paint, inkLine, ellPts, rectPts, rrPts, starPts, heartPts
  } = CORE;
  const { whaleGirl, feel, move } = WHALE;

  const DURATION_MV6 = 46.70;

  // ==========================================================================
  // Exact Subtitle Beat-Sync Table from `每天每天的抖音 - 抖音_6.mp4`
  // ==========================================================================
  const SUBTITLES_MV6 = [
    { t0: 0.30,  t1: 3.80,  zh: '我的世界 正在下雨' },
    { t0: 4.50,  t1: 9.80,  zh: '大概 从你带我回家时放晴' },
    { t0: 10.40, t1: 15.80, zh: '一头钻进了你拆开的快递' },
    { t0: 16.30, t1: 21.80, zh: '让我成为你的惊喜' },
    { t0: 22.30, t1: 25.50, zh: '主人别哭泣' },
    { t0: 28.40, t1: 33.40, zh: '如果真有你说的命理' },
    { t0: 34.30, t1: 39.40, zh: '哪怕变成了一颗星星' },
    { t0: 40.30, t1: 45.80, zh: '还能再见到你' }
  ];

  function getSubtitleAt(t) {
    for (let i = 0; i < SUBTITLES_MV6.length; i++) {
      const s = SUBTITLES_MV6[i];
      if (t >= s.t0 && t < s.t1) return s;
    }
    return null;
  }

  // Should the dark RPG bottom subtitle bar frame be drawn at time t?
  function hasSubtitleBoxAt(t) {
    if (t >= 25.55 && t < 28.30) return false; // Tear-licking & tail output power close-up
    if (t >= 33.45 && t < 34.25) return false; // Database transition beat
    if (t >= 39.45 && t < 40.25) return false; // Sneeze "阿嚏" full-frame gag
    if (t >= 45.95) return false;              // Final iris close-out
    return true;
  }

  // ==========================================================================
  // Helper: Pixel-Crisp Block Rectangles & UI Text
  // ==========================================================================
  function pxRect(ctx, x, y, w, h, col) {
    ctx.fillStyle = col;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  function drawPixelBox(ctx, x, y, w, h, bg = '#0C1222', borderOuter = '#64748B', borderInner = '#1E293B') {
    pxRect(ctx, x - 3, y - 3, w + 6, h + 6, '#050811');
    pxRect(ctx, x - 2, y - 2, w + 4, h + 4, borderOuter);
    pxRect(ctx, x, y, w, h, borderInner);
    pxRect(ctx, x + 2, y + 2, w - 4, h - 4, bg);
  }

  // ==========================================================================
  // Protagonist Wrapper: `drawBionicWhaleGirl`
  // Renders `whaleGirl` (`src/whale_girl.js` 7-bone rig) equipped with her
  // signature 《仿生小狗》 yellow triangular kerchief ("年糕"), bionic power LED
  // collar, wagging whale tail, tears, and optional forehead "爱" / bandage!
  // ==========================================================================
  function drawBionicWhaleGirl(ctx, x, y, u, opts = {}) {
    const t = opts.t || 0;
    const view = opts.view || 'front';
    const emo = opts.emotion || 'happy';
    const bp = beatPulse(t);
    const dy = (opts.dy || 0) - bp * 0.06;
    const shotIdx = Math.floor(t / 1.85);
    const chosenAction = opts.action || (typeof WHALE.pickAction === 'function' ? WHALE.pickAction(shotIdx) : null);

    const baseOps = Object.assign({}, feel(emo, t), opts, {
      view,
      action: chosenAction,
      showActionBadge: u >= 26,
      style: opts.style || 'watercolor',
      constructMode: 'pixelRig',
      t,
      dy
    });

    // Draw our main DeepSeek Whale Maid Girl (`src/whale_girl.js`)
    whaleGirl(ctx, x, y, u, baseOps);

    if (u >= 28 && typeof WHALE.drawFatFish === 'function') {
      WHALE.drawFatFish(ctx, clamp(x + (x > 640 ? -155 : 155), 140, 1140), y - 14, 18, {
        t,
        mode: ['eat_rice', 'working', 'success', 'idle'][shotIdx % 4]
      });
    }

    // Layer the iconic 《仿生小狗》 Bionic Companion ("年糕") Yellow Bandana & LED Collar!
    const cell = u / 10;
    const headBob = Math.sin(t * 2.8) * 0.055 * u;
    const vx = view === 'side' ? (opts.flip ? -0.45 : 0.45) : (view === 'q' ? (opts.flip ? -0.22 : 0.22) : 0);

    ctx.save();
    ctx.translate(x + vx * u, y + dy * u + headBob);
    if (opts.flip) ctx.scale(-1, 1);

    const p = (gx, gy, gw, gh, col) => {
      ctx.fillStyle = col;
      ctx.fillRect((gx - 0.5) * cell, (gy - 0.5) * cell, gw * cell + 0.4, gh * cell + 0.4);
    };

    if (view === 'back' || view === 'qback') {
      // Back knot of the yellow bionic collar around neck (gy = -45..-40, below head gy=-46)
      p(-8, -45, 16, 2, '#182038');
      p(-7, -44, 14, 2, '#FACC15');
      p(-2, -42, 4,  3, '#EAB308');
    } else {
      // Dainty Yellow Bionic Collar & Glowing Core Badge at Neck (gy = -45..-39)
      // Strictly below chin (`head` ends at gy = -46) and above chest whale apron logo!
      p(-8, -45, 16, 2, '#182038');
      p(-7, -44, 14, 2, '#FACC15');
      p(-5, -42, 10, 2, '#EAB308');
      p(-3, -40, 6,  2, '#CA8A04');

      // Glowing Bionic LED Core Badge right at collar center (gy = -43..-39)
      const lowBat = opts.lowBattery !== undefined ? opts.lowBattery : false;
      const ledCol = lowBat
        ? (Math.floor(t * 6) % 2 === 0 ? '#EF4444' : '#7F1D1D')
        : (opts.collarCyan ? '#38BDF8' : '#EF4444');
      p(-3, -43, 6, 4, '#182038');
      p(-2, -42, 4, 2, '#FFFFFF');
      p(-1, -42, 2, 2, ledCol);
    }

    // Extra expressive streaming tears when `opts.tears` is active
    // Aligned with WhaleGirl's exact eye coordinates (`eLx = -6, eRx = +5.6, eY = -58.2`)
    if (opts.tears && view !== 'back') {
      const tearDrop = Math.floor((t * 8) % 5);
      p(-8, -56, 2, 5, '#38BDF8');
      p(6,  -56, 2, 5, '#38BDF8');
      p(-7, -55, 1, 3, '#E0F2FE');
      p(6,  -55, 1, 3, '#E0F2FE');
      p(-8, -50 + tearDrop, 2, 2, '#7DD3FC');
      p(6,  -50 + tearDrop, 2, 2, '#7DD3FC');
    }

    // Forehead bandage / golden "爱" character stamp (Shots 24-26, t=38.8s..44s)
    if (opts.foreheadLove) {
      p(-5, -69, 10, 7, '#FEF3C7');
      p(-4, -68, 8,  5, '#FDE68A');
      ctx.save();
      ctx.font = `bold ${Math.round(5.5 * cell)}px "ZCOOLKuaiLe", "NotoSansSC", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#D97706';
      ctx.fillText('爱', 0, -65.5 * cell);
      ctx.restore();
    }

    // Licking tongue animation (for Shot 12 & Shot 18 when comforting crying owner)
    if (opts.licking && (view === 'side' || view === 'q')) {
      const lickOut = (Math.sin(t * 10) + 1) * 0.5;
      const lx = 9 + Math.round(lickOut * 3);
      p(lx, -51, 4, 3, '#FB7185');
      p(lx + 1, -50, 2, 2, '#FDA4AF');
    }

    ctx.restore();
  }

  // ==========================================================================
  // Supporting Character: `drawOwnerGirl` (主人 — 104x102 Articulated Anime Pixel Rig)
  // Built on the exact same 104x102 7-bone pixel-grid anatomy as `WhaleGirl`
  // (`WHALE_GIRL_PIXEL_RIG`), with a custom warm palette mapping:
  //   - Warm espresso-brown hair (`#261C21 .. #5C4033`)
  //   - Sunny golden-yellow sweater/dress (`#B45309 .. #FACC15 .. #FEF08A`)
  //   - No whale tail (human owner!)
  //   - Childhood top-knot bun (`age: 'child'`) or crimson ribbon (`age: 'teen'`)
  // ==========================================================================
  const _ownerPaletteCache = {};
  function getOwnerPalettes(basePal) {
    if (_ownerPaletteCache.headPal) return _ownerPaletteCache;
    // 1. Head/Hair/Legs palette: blue hair -> warm espresso brown; skin/eyes stay crisp
    _ownerPaletteCache.headPal = basePal.map((hex) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      if (r >= b - 10) return hex;
      if (lum < 0.22) return '#1E161A';
      if (lum < 0.34) return '#33242B';
      if (lum < 0.45) return '#4A333B';
      if (lum < 0.58) return '#63454E';
      if (lum < 0.74) return '#7D5A50';
      return '#9A7B6E';
    });
    // 2. Torso/Dress palette: navy dress & apron -> contoured sunny golden-yellow sweater/dress!
    _ownerPaletteCache.torsoPal = basePal.map((hex) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      // Keep skin tones warm peach
      if (r > b + 20 && lum > 0.65) return hex;
      if (lum < 0.20) return '#451A03';
      if (lum < 0.32) return '#92400E';
      if (lum < 0.46) return '#B45309';
      if (lum < 0.62) return '#D97706';
      if (lum < 0.78) return '#EAB308';
      if (lum < 0.90) return '#FACC15';
      return '#FEF08A';
    });
    return _ownerPaletteCache;
  }

  function drawOwnerGirl(ctx, x, y, u = 28, opts = {}) {
    const t = opts.t || 0;
    const rig = root.WHALE_GIRL_PIXEL_RIG || (typeof require === 'function' ? require('./whale_girl_rig_data.js') : null);
    if (!rig) return;

    const view = opts.view || 'front';
    const age = opts.age || 'teen';
    const cell = u / rig.scale;
    const headBob = Math.sin(t * 2.6 + 1.2) * 0.05 * u;
    const walkW = opts.walk ? t * 10 : 0;
    const hipL = walkW ? Math.sin(walkW) * 0.26 : 0;
    const hipR = walkW ? -Math.sin(walkW) * 0.26 : 0;

    let poseKey = 'wave';
    if (opts.crying) poseKey = 'panic';
    else if (opts.smiling) poseKey = 'heart';

    const isTurnView = (view && view !== 'front' && rig.views && rig.views[view]);
    const poseBones = isTurnView ? rig.views[view] : (rig.poses[poseKey] || rig.poses.wave);
    const { headPal, torsoPal } = getOwnerPalettes(rig.palette);

    if (!opts.noShadow) {
      paint(ctx, ellPts(x, y + 0.10 * u, 2.2 * u, 0.42 * u, 14), { wash: '#181824', washOp: 65, ink: null });
    }

    ctx.save();
    ctx.translate(x, y);
    if (opts.flip) ctx.scale(-1, 1);

    const drawRuns = (runs, activePal = headPal) => {
      if (!runs || !runs.length) return;
      let lastCol = -1;
      for (let i = 0; i < runs.length; i++) {
        const [gy, gx1, gx2, cIdx] = runs[i];
        if (cIdx !== lastCol) {
          ctx.fillStyle = activePal[cIdx];
          lastCol = cIdx;
        }
        ctx.fillRect((gx1 - 0.5) * cell, (gy - 0.5) * cell, (gx2 - gx1 + 1) * cell + 0.45, cell + 0.45);
      }
    };

    const p = (gx, gy, gw, gh, col) => {
      ctx.fillStyle = col;
      ctx.fillRect((gx - 0.5) * cell, (gy - 0.5) * cell, gw * cell + 0.4, gh * cell + 0.4);
    };

    // 1. Back hair (warm espresso brown)
    ctx.save();
    ctx.translate(0, headBob);
    drawRuns(poseBones.backHair, headPal);
    ctx.restore();

    // 2. Articulated Left & Right Legs (no whale tail — human owner!)
    ctx.save();
    ctx.translate(-0.72 * u, -1.35 * u);
    ctx.rotate(hipL);
    ctx.translate(0.72 * u, 1.35 * u);
    drawRuns(poseBones.legL, headPal);
    ctx.restore();

    ctx.save();
    ctx.translate(0.72 * u, -1.35 * u);
    ctx.rotate(hipR);
    ctx.translate(-0.72 * u, 1.35 * u);
    drawRuns(poseBones.legR, headPal);
    ctx.restore();

    // 3. Torso rendered in contoured Sunny Golden-Yellow Sweater/Dress Palette (`torsoPal`)!
    ctx.save();
    ctx.translate(0, headBob);
    drawRuns(poseBones.torso, torsoPal);
    ctx.restore();

    // 4. Right Arm
    if (poseBones.armR && poseBones.armR.length > 0) {
      ctx.save();
      ctx.translate(0, headBob);
      drawRuns(poseBones.armR, torsoPal);
      ctx.restore();
    }

    // 5. Expressive 104x102 Anime Head + Childhood Bun / Ribbon + Streaming Tears
    ctx.save();
    ctx.translate(0, headBob);
    drawRuns(poseBones.head, headPal);

    // Top-knot bun (for `child`) or warm red ribbon bow (for `teen`)
    if (age === 'child') {
      p(-6, -91, 12, 8, '#261C21');
      p(-5, -90, 10, 6, '#3D2B32');
      p(-5, -83, 10, 2, '#EF4444');
    } else {
      p(-8, -86, 16, 3, '#E11D48');
      p(-4, -87, 8,  4, '#FB7185');
    }

    // Streaming tears when `opts.crying` is true
    if (opts.crying && view !== 'back') {
      const td = Math.floor((t * 8) % 5);
      if (view === 'side') {
        p(5, -56, 2, 6, '#38BDF8');
        p(5, -50 + td, 2, 2, '#7DD3FC');
      } else {
        p(-8, -56, 2, 6, '#38BDF8');
        p(6,  -56, 2, 6, '#38BDF8');
        p(-7, -55, 1, 3, '#E0F2FE');
        p(6,  -55, 1, 3, '#E0F2FE');
        p(-8, -50 + td, 2, 2, '#7DD3FC');
        p(6,  -50 + td, 2, 2, '#7DD3FC');
      }
    }
    ctx.restore();

    ctx.restore();
  }

  // ==========================================================================
  // Top Bionic OS Status Bar (`第 N 天` + `电池健康 %` + Top Dialog / Speech Bar)
  // Matches the exact HUD layout of `每天每天的抖音 - 抖音_6.mp4`
  // ==========================================================================
  function drawTopBionicHUD(ctx, t, opts = {}) {
    // Dark top cinematic bar (h = 34px)
    pxRect(ctx, 0, 0, W, 34, '#080C18');
    pxRect(ctx, 0, 34, W, 2, '#1E293B');

    // Top-left Day Counter (if present)
    if (opts.day !== undefined) {
      ctx.save();
      ctx.font = 'bold 20px "Silkscreen", "ZCOOLKuaiLe", monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#E2E8F0';
      ctx.fillText(`DAY ${String(opts.day).padStart(4, '0')} 天`, 18, 17);
      ctx.restore();
    }

    // Large Gold Day Banner on top-left corner (when `opts.bigDay` is specified)
    if (opts.bigDay !== undefined) {
      ctx.save();
      ctx.font = 'bold 42px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#0F172A';
      ctx.fillText(`第 ${opts.bigDay} 天`, 31, 51);
      ctx.fillStyle = '#FACC15';
      ctx.fillText(`第 ${opts.bigDay} 天`, 28, 48);
      if (opts.weatherLabel) {
        ctx.font = 'bold 18px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
        ctx.fillStyle = '#FEF08A';
        ctx.fillText(opts.weatherLabel, 32, 98);
      }
      ctx.restore();
    }

    // Top-right Battery Health Indicator (`电池健康 XX%`)
    const bat = opts.battery !== undefined ? opts.battery : 100;
    const isLow = bat <= 10;
    const isMid = bat > 10 && bat <= 45;
    const batCol = isLow ? '#EF4444' : (isMid ? '#F59E0B' : '#22D3EE');

    // Battery icon at (1075, 8, 28, 16)
    pxRect(ctx, 1072, 8, 30, 16, '#94A3B8');
    pxRect(ctx, 1074, 10, 26, 12, '#0F172A');
    pxRect(ctx, 1102, 12, 3, 8, '#94A3B8');
    const fillW = Math.max(2, Math.round(22 * clamp(bat / 100, 0, 1)));
    pxRect(ctx, 1076, 12, fillW, 8, batCol);

    ctx.save();
    ctx.font = 'bold 16px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#CBD5E1';
    ctx.fillText('电池健康', 1112, 17);
    ctx.font = 'bold 22px "Silkscreen", "ZCOOLKuaiLe", monospace';
    ctx.fillStyle = batCol;
    ctx.fillText(`${bat}%`, 1188, 17);
    ctx.restore();

    // Optional Top Bionic Thought -> Output Bar (`想说：...` | `输出：汪...`)
    if (opts.wantToSay !== undefined) {
      const bx = 430, by = 48, bw = 815, bh = 58;
      drawPixelBox(ctx, bx, by, bw, bh, '#0D1326', '#64748B', '#1E293B');

      // Left badge: `想说`
      pxRect(ctx, bx + 10, by + 6, 46, 18, '#E2E8F0');
      ctx.save();
      ctx.font = 'bold 13px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#0F172A';
      ctx.fillText('想说', bx + 33, by + 15);

      // Typed thought text + blinking cursor
      ctx.font = 'bold 22px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#F8FAFC';
      const cursor = Math.floor(t * 4) % 2 === 0 ? ' |' : '';
      ctx.fillText(opts.wantToSay + cursor, bx + 16, by + 40);

      // Right section: either red `语言模块 × 未安装` or `输出：汪！`
      if (opts.voiceModuleError) {
        pxRect(ctx, bx + 530, by + 6, 120, 18, '#EF4444');
        ctx.font = 'bold 12px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText('语言模块', bx + 590, by + 15);

        drawPixelBox(ctx, bx + 520, by + 26, 160, 26, '#2A1215', '#EF4444', '#7F1D1D');
        ctx.font = 'bold 17px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
        ctx.fillStyle = '#FCA5A5';
        ctx.fillText('× 未安装', bx + 600, by + 39);
      }

      if (opts.barkOutput) {
        pxRect(ctx, bx + 695, by + 6, 48, 18, '#0284C7');
        ctx.font = 'bold 12px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText('输出', bx + 719, by + 15);

        ctx.font = 'bold 26px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
        ctx.fillStyle = '#38BDF8';
        ctx.fillText(opts.barkOutput, bx + 750, by + 39);
      }
      ctx.restore();
    }
  }

  // ==========================================================================
  // Speech Bubble Helper (Pixel RPG Style)
  // ==========================================================================
  function drawSpeechBubble(ctx, x, y, w, h, text, opts = {}) {
    const bg = opts.bg || '#FFFFFF';
    const fg = opts.fg || '#0F172A';
    const border = opts.border || '#1E293B';
    pxRect(ctx, x - 3, y - 3, w + 6, h + 6, border);
    pxRect(ctx, x, y, w, h, bg);
    if (opts.tailDir === 'left') {
      pxRect(ctx, x - 10, y + h - 16, 10, 8, border);
      pxRect(ctx, x - 7, y + h - 14, 8, 5, bg);
    } else if (opts.tailDir === 'right') {
      pxRect(ctx, x + w, y + h - 16, 10, 8, border);
      pxRect(ctx, x + w - 1, y + h - 14, 8, 5, bg);
    } else if (opts.tailDir === 'bottom') {
      pxRect(ctx, x + w * 0.5 - 6, y + h, 12, 9, border);
      pxRect(ctx, x + w * 0.5 - 4, y + h - 2, 8, 8, bg);
    }
    ctx.save();
    ctx.font = `bold ${opts.fontSize || 20}px "ZCOOLKuaiLe", "NotoSansSC", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = fg;
    ctx.fillText(text, x + w * 0.5, y + h * 0.5 + 1);
    ctx.restore();
  }

  // ==========================================================================
  // Reusable Set 1: Cozy Home Entrance Hallway (Door, Shoe Cabinet, Window)
  // Supports daytime sunny (`mode: 'day'`), evening (`mode: 'dusk'`), and rainy night (`mode: 'night'`)
  // ==========================================================================
  function drawFoyerSet(ctx, t, mode = 'day', opts = {}) {
    const BAHUIYI = root.MV_BA_HUIYI || (typeof require !== 'undefined' ? (() => {
      try { return require('./mv_ba_huiyi_pinhao_gei_ni.js'); } catch (e) { return null; }
    })() : null);
    const shotIdx = Math.floor(t / 1.85);
    if (BAHUIYI && typeof BAHUIYI.drawMasterEnvironment === 'function' && shotIdx % 4 !== 0) {
      BAHUIYI.drawMasterEnvironment(ctx, t, shotIdx, 6, shotIdx);
      return;
    }
    const isNight = mode === 'night';
    const isDusk = mode === 'dusk';

    // Wall background
    const wallCol = isNight ? '#2B2D42' : (isDusk ? '#B88B72' : '#EAD2AC');
    const wallTop = isNight ? '#1E2030' : (isDusk ? '#9E6F58' : '#F3E1C4');
    pxRect(ctx, 0, 36, W, 500, wallCol);
    pxRect(ctx, 0, 36, W, 120, wallTop);

    // Baseboard & Wooden Floor planks
    pxRect(ctx, 0, 515, W, 18, isNight ? '#1F1924' : '#6B4226');
    pxRect(ctx, 0, 533, W, H - 533, isNight ? '#2A212E' : '#854D27');
    for (let fy = 555; fy < H; fy += 34) {
      pxRect(ctx, 0, fy, W, 3, isNight ? '#1B141E' : '#63371A');
    }

    // Left Wooden Shoe Cabinet (x=30..440, y=315..520)
    const cabX = 35, cabY = 325, cabW = 395, cabH = 195;
    pxRect(ctx, cabX - 4, cabY - 4, cabW + 8, cabH + 8, '#1E1410');
    pxRect(ctx, cabX, cabY, cabW, cabH, isNight ? '#3D2B24' : '#8C583A');
    pxRect(ctx, cabX - 8, cabY - 12, cabW + 16, 16, isNight ? '#4E382F' : '#A46B49');
    // 3 Louvered Cabinet Doors
    for (let i = 0; i < 3; i++) {
      const dx = cabX + 16 + i * 124;
      pxRect(ctx, dx, cabY + 18, 112, 160, isNight ? '#2E201B' : '#6E4228');
      pxRect(ctx, dx + 6, cabY + 24, 100, 148, isNight ? '#382721' : '#7D4D30');
      for (let s = 0; s < 7; s++) {
        pxRect(ctx, dx + 14, cabY + 36 + s * 18, 84, 5, isNight ? '#241814' : '#5A351E');
      }
      // Brass knob
      pxRect(ctx, dx + 92, cabY + 95, 7, 10, '#FACC15');
    }

    // Small Potted Plant & Framed Picture on Cabinet
    pxRect(ctx, cabX + 55, cabY - 42, 42, 32, '#B45309');
    pxRect(ctx, cabX + 62, cabY - 68, 28, 28, isNight ? '#15803D' : '#22C55E');
    // Framed photo on cabinet
    pxRect(ctx, cabX + 265, cabY - 66, 62, 56, '#78350F');
    pxRect(ctx, cabX + 272, cabY - 59, 48, 42, '#BAE6FD');

    // Center Teal Front Door (x=545..885, y=85..520)
    const doorX = 550, doorY = 85, doorW = 320, doorH = 435;
    pxRect(ctx, doorX - 10, doorY - 8, doorW + 20, doorH + 12, isNight ? '#1A242D' : '#3E2723');
    pxRect(ctx, doorX, doorY, doorW, doorH, isNight ? '#1E3A4C' : '#3B7A8C');
    // Door recessed panels
    pxRect(ctx, doorX + 28, doorY + 30, 115, 165, isNight ? '#162C3A' : '#2D6272');
    pxRect(ctx, doorX + 177, doorY + 30, 115, 165, isNight ? '#162C3A' : '#2D6272');
    pxRect(ctx, doorX + 28, doorY + 230, 115, 175, isNight ? '#162C3A' : '#2D6272');
    pxRect(ctx, doorX + 177, doorY + 230, 115, 175, isNight ? '#162C3A' : '#2D6272');
    // Gold door handle
    pxRect(ctx, doorX + 22, doorY + 205, 16, 36, '#FACC15');

    // Red Welcome Doormat in front of door
    pxRect(ctx, doorX - 20, 526, doorW + 40, 26, isNight ? '#7F1D1D' : '#DC2626');
    pxRect(ctx, doorX - 10, 530, doorW + 20, 18, isNight ? '#991B1B' : '#EF4444');

    // Yellow Umbrella in stand beside door (left of door)
    pxRect(ctx, 488, 395, 18, 122, '#FACC15');
    pxRect(ctx, 492, 375, 10, 22, '#78350F');
    pxRect(ctx, 482, 465, 30, 55, '#9A3412');

    // Right Window (x=965..1230, y=55..475)
    const winX = 975, winY = 55, winW = 245, winH = 415;
    pxRect(ctx, winX - 12, winY - 8, winW + 24, winH + 20, '#E2E8F0');
    pxRect(ctx, winX, winY, winW, winH, isNight ? '#0F172A' : '#BAE6FD');
    // Rain / sky streaks outside window
    for (let i = 0; i < 14; i++) {
      const rx = winX + 18 + ((i * 43) % (winW - 36));
      const ry = winY + 20 + ((i * 67 + Math.floor(t * (isNight ? 180 : 30))) % (winH - 40));
      pxRect(ctx, rx, ry, 3, isNight ? 18 : 12, isNight ? '#38BDF8' : '#FFFFFF');
    }
    // Window muntin bars
    pxRect(ctx, winX + winW * 0.5 - 5, winY, 10, winH, '#E2E8F0');
    pxRect(ctx, winX, winY + winH * 0.5 - 5, winW, 10, '#E2E8F0');

    // Blue Food/Water Bowl on right floor
    pxRect(ctx, 1015, 536, 76, 22, '#0284C7');
    pxRect(ctx, 1023, 538, 60, 10, '#38BDF8');

    // Optional Digital Waiting Clock / Day Counter above Cabinet (`opts.clockText` or `opts.waitDays`)
    if (opts.clockText || opts.waitDays !== undefined) {
      const cx = 365, cy = 128, cw = 215, ch = 82;
      drawPixelBox(ctx, cx, cy, cw, ch, '#090D1A', '#475569', '#1E293B');
      // Red recording dot
      pxRect(ctx, cx + cw - 18, cy + 10, 8, 8, Math.floor(t * 4) % 2 === 0 ? '#EF4444' : '#7F1D1D');
      ctx.save();
      ctx.font = 'bold 14px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#38BDF8';
      ctx.fillText('等待中', cx + 14, cy + 24);
      if (opts.clockText) {
        ctx.font = 'bold 38px "Silkscreen", "ZCOOLKuaiLe", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FACC15';
        ctx.fillText(opts.clockText, cx + cw * 0.5, cy + 58);
      } else {
        ctx.font = 'bold 18px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
        ctx.fillStyle = '#94A3B8';
        ctx.fillText('第', cx + 24, cy + 58);
        ctx.fillText('天', cx + cw - 36, cy + 58);
        ctx.font = 'bold 36px "Silkscreen", "ZCOOLKuaiLe", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FACC15';
        ctx.fillText(String(opts.waitDays), cx + cw * 0.5, cy + 58);
      }
      ctx.restore();
    }
  }

  // ==========================================================================
  // Bionic AI Face-Recognition Viewfinder (`[主人]`) for Shots 2 & 20
  // Includes a live Picture-in-Picture Bionic WhaleGirl Viewfinder so WhaleGirl
  // is on screen in every single second of the MV!
  // ==========================================================================
  function drawBionicOwnerHUDScene(ctx, t, mode = 'opening') {
    // Deep teal cyber-matrix background
    pxRect(ctx, 0, 36, W, H - 36, '#0F293A');
    for (let gx = 0; gx < W; gx += 32) {
      pxRect(ctx, gx, 36, 1, H - 36, 'rgba(56, 189, 248, 0.08)');
    }
    for (let gy = 36; gy < H; gy += 32) {
      pxRect(ctx, 0, gy, W, 1, 'rgba(56, 189, 248, 0.08)');
    }
    // Vignette side pillars
    pxRect(ctx, 0, 36, 180, H - 36, '#091926');
    pxRect(ctx, W - 180, 36, 180, H - 36, '#091926');

    // Center Crying Owner Close-Up (`drawOwnerGirl` at large scale u=56)
    drawOwnerGirl(ctx, 640, 690, 54, {
      t,
      age: 'teen',
      view: 'front',
      crying: true,
      smiling: mode === 'apology' && t > 31.2,
      noShadow: true
    });

    // Cyan Face-Tracking Brackets `[主人]` around Owner's face
    const fx = 445, fy = 150, fw = 390, fh = 395;
    const bCol = '#2DD4BF';
    // Label `[主人]`
    pxRect(ctx, fx, fy - 34, 68, 28, bCol);
    ctx.save();
    ctx.font = 'bold 18px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#042F2E';
    ctx.fillText('主人', fx + 34, fy - 20);
    ctx.restore();

    // 4 Corner L-brackets
    const L = 34, T = 5;
    pxRect(ctx, fx, fy, L, T, bCol); pxRect(ctx, fx, fy, T, L, bCol);
    pxRect(ctx, fx + fw - L, fy, L, T, bCol); pxRect(ctx, fx + fw - T, fy, T, L, bCol);
    pxRect(ctx, fx, fy + fh - T, L, T, bCol); pxRect(ctx, fx, fy + fh - L, T, L, bCol);
    pxRect(ctx, fx + fw - L, fy + fh - T, L, T, bCol); pxRect(ctx, fx + fw - T, fy + fh - L, T, L, bCol);

    if (mode === 'opening') {
      // Right AI Emotion Analysis Readout: `心情：难过 / 原因：未知`
      ctx.save();
      ctx.font = 'bold 20px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#F87171';
      ctx.fillText('心情：难过', fx + fw + 28, fy + 45);
      ctx.fillStyle = '#94A3B8';
      ctx.fillText('原因：未知', fx + fw + 28, fy + 78);
      ctx.restore();

      if (t >= 3.75) {
        drawSpeechBubble(ctx, 855, 455, 225, 54, '……是饿了吗？', { tailDir: 'left', fontSize: 22 });
      }
    } else {
      // Shot 20 (`30.0s .. 32.0s`): Stacked Apology Speech Bubbles + Audio Waveform
      const bubbles = [
        { appear: 30.0, text: '对不起',     x: 790, y: 465, w: 135, bg: '#FFFFFF' },
        { appear: 30.4, text: '我回来晚了', x: 830, y: 392, w: 175, bg: '#FFFFFF' },
        { appear: 30.8, text: '谢谢你等我', x: 785, y: 318, w: 175, bg: '#FFFFFF' },
        { appear: 31.2, text: '我爱你',     x: 880, y: 245, w: 135, bg: '#FEF08A' }
      ];
      for (const b of bubbles) {
        if (t >= b.appear) {
          drawSpeechBubble(ctx, b.x, b.y, b.w, 48, b.text, { tailDir: 'left', bg: b.bg, fontSize: 21 });
        }
      }
      // Audio waveform indicator `听写中 ılıllılı`
      ctx.save();
      ctx.font = 'bold 18px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
      ctx.fillStyle = '#2DD4BF';
      ctx.fillText('听写中', 835, 555);
      for (let i = 0; i < 12; i++) {
        const bh = 6 + Math.round(Math.abs(Math.sin(t * 14 + i * 0.9)) * 18);
        pxRect(ctx, 905 + i * 9, 560 - bh, 5, bh, '#2DD4BF');
      }
      ctx.restore();
    }

    // Bottom-Left Picture-in-Picture Bionic Self-Monitor showing `WhaleGirl` (`年糕`)!
    drawPixelBox(ctx, 32, 435, 220, 200, '#0B1324', '#2DD4BF', '#1E293B');
    ctx.save();
    ctx.beginPath();
    ctx.rect(34, 437, 216, 196);
    ctx.clip();
    drawBionicWhaleGirl(ctx, 142, 655, 22, {
      t,
      emotion: 'cry',
      tears: true,
      lowBattery: true
    });
    ctx.restore();
    pxRect(ctx, 36, 439, 98, 20, '#2DD4BF');
    ctx.save();
    ctx.font = 'bold 12px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
    ctx.fillStyle = '#042F2E';
    ctx.fillText('仿生视角 · 年糕', 42, 453);
    ctx.restore();
  }

  // ==========================================================================
  // Main Frame Renderer: `renderDouyin6Frame(ctx, t)`
  // Renders every single scene from 0.00s to 46.70s with `whaleGirl` as star!
  // ==========================================================================
  function renderDouyin6Frame(ctx, t) {
    reseedBoil(t);
    setActiveStyle('watercolor');
    ctx.save();

    // ------------------------------------------------------------------------
    // SHOT 1 (0.00s – 3.00s): Rainy Night Opening & Title Card 《仿生小狗》
    // ------------------------------------------------------------------------
    if (t < 3.00) {
      // Dark rainy bedroom window background
      pxRect(ctx, 0, 36, W, H - 36, '#141B2D');
      // Window with falling night rain on left behind WhaleGirl
      pxRect(ctx, 110, 65, 420, 360, '#1E293B');
      pxRect(ctx, 124, 78, 392, 334, '#0F172A');
      for (let i = 0; i < 28; i++) {
        const rx = 135 + ((i * 53) % 370);
        const ry = 85 + ((i * 71 + Math.floor(t * 240)) % 310);
        pxRect(ctx, rx, ry, 2, 18, '#38BDF8');
      }
      pxRect(ctx, 315, 78, 10, 334, '#1E293B');
      pxRect(ctx, 124, 240, 392, 10, '#1E293B');

      // Protagonist: Bionic WhaleGirl (`年糕`) close-up on left (x=330, y=690, u=46)
      drawBionicWhaleGirl(ctx, 330, 685, 44, {
        t,
        view: 'front',
        emotion: t >= 1.0 ? 'cry' : 'sad',
        tears: t >= 1.0,
        lowBattery: true
      });

      // Right Title Card: 《仿生小狗》 省拾公园
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = 'bold 68px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
      ctx.fillStyle = '#090D16';
      ctx.fillText('《仿生小狗》', 884, 274);
      ctx.fillStyle = '#E2E8F0';
      ctx.fillText('《仿生小狗》', 880, 270);

      // Decorative horizontal rules + subtitle
      pxRect(ctx, 730, 316, 300, 2, '#64748B');
      ctx.font = 'bold 34px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
      ctx.fillStyle = '#CBD5E1';
      ctx.fillText('省拾公园 · 深海鲸鱼娘篇', 880, 358);
      pxRect(ctx, 730, 378, 300, 2, '#64748B');
      ctx.font = 'bold 14px "Silkscreen", monospace';
      ctx.fillStyle = '#64748B';
      ctx.fillText('SOULSEARCHING PARK  x  WHALE_GIRL', 880, 402);
      ctx.restore();

      // Top HUD + `想说：别哭了` -> `语言模块 × 未安装` -> `输出：汪。`
      const typed = t < 0.8 ? '' : (t < 1.2 ? '别哭' : '别哭了');
      drawTopBionicHUD(ctx, t, {
        day: 4380,
        battery: 3,
        wantToSay: t >= 0.6 ? typed : undefined,
        voiceModuleError: t >= 1.1,
        barkOutput: t >= 1.8 ? '汪。' : undefined
      });

      if (t >= 1.85) {
        drawSpeechBubble(ctx, 480, 520, 110, 48, '汪。', { tailDir: 'left', fontSize: 24 });
      }
    }

    // ------------------------------------------------------------------------
    // SHOT 2 (3.00s – 4.50s): Bionic HUD Vision `[主人]` ("……是饿了吗？")
    // ------------------------------------------------------------------------
    else if (t < 4.50) {
      drawBionicOwnerHUDScene(ctx, t, 'opening');
      drawTopBionicHUD(ctx, t, { day: 4380, battery: 3 });
    }

    // ------------------------------------------------------------------------
    // SHOT 3 (4.50s – 5.60s): VHS Rewind (`倒带` — Day 4380 -> Day 0001)
    // ------------------------------------------------------------------------
    else if (t < 5.60) {
      const p = seg(t, 4.50, 5.60);
      const curDay = Math.max(1, Math.round(lerp(4380, 1, easeIn(p))));
      const curBat = Math.min(100, Math.round(lerp(3, 100, easeOut(p))));

      drawFoyerSet(ctx, t, 'day');

      // Rewinding memories of Owner & Bionic WhaleGirl in the foyer
      const jitterX = Math.sin(t * 65) * 10;
      drawOwnerGirl(ctx, 430 + jitterX, 660, 36, { t: -t * 6, age: 'teen', view: 'side', smiling: true });
      drawBionicWhaleGirl(ctx, 720 - jitterX, 670, 36, {
        t: -t * 6,
        view: 'side',
        flip: true,
        emotion: 'happy'
      });

      // VHS Horizontal Glitch Bars & Chromatic Scanlines
      for (let i = 0; i < 18; i++) {
        const gy = 60 + ((i * 39 + Math.floor(t * 420)) % 560);
        const gw = 180 + ((i * 97) % 700);
        const gx = (i * 157 + Math.floor(t * 310)) % (W - gw);
        pxRect(ctx, gx, gy, gw, 6, i % 2 === 0 ? 'rgba(56, 189, 248, 0.45)' : 'rgba(250, 204, 21, 0.42)');
      }

      // Center `⏪ 倒带` Overlay
      drawPixelBox(ctx, 535, 325, 210, 68, 'rgba(15, 23, 42, 0.85)', '#FACC15', '#334155');
      ctx.save();
      ctx.font = 'bold 38px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#FACC15';
      ctx.fillText('<< 倒带', 640, 359);
      ctx.restore();

      drawTopBionicHUD(ctx, t, { day: curDay, battery: curBat });
    }

    // ------------------------------------------------------------------------
    // SHOT 4 (5.60s – 7.00s): Day 1 Sunny Foyer — Shaking Express Box (`仿生小狗 ×1`)
    // ------------------------------------------------------------------------
    else if (t < 7.00) {
      drawFoyerSet(ctx, t, 'day');

      // Owner standing on left in yellow dress
      drawOwnerGirl(ctx, 370, 610, 32, { t, age: 'child', view: 'front', smiling: true });

      // Shaking Cardboard Express Box (`仿生小狗 ×1`) with WhaleGirl peeking!
      const shake = Math.sin(t * 28) * 6;
      const bx = 590 + shake, by = 430, bw = 220, bh = 185;
      // WhaleGirl peeking inside the top of the box
      ctx.save();
      ctx.beginPath();
      ctx.rect(bx - 30, by - 130, bw + 60, 145);
      ctx.clip();
      drawBionicWhaleGirl(ctx, bx + bw * 0.5, by + 135, 26, {
        t,
        view: 'front',
        emotion: 'curious'
      });
      ctx.restore();

      // Cardboard box body & flaps
      pxRect(ctx, bx - 4, by - 4, bw + 8, bh + 8, '#451A03');
      pxRect(ctx, bx, by, bw, bh, '#D97706');
      pxRect(ctx, bx + 8, by + 8, bw - 16, bh - 16, '#F59E0B');
      // Shipping label `仿生小狗 ×1` + barcode
      pxRect(ctx, bx + 28, by + 82, 130, 68, '#FFFFFF');
      ctx.save();
      ctx.font = 'bold 20px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
      ctx.fillStyle = '#0F172A';
      ctx.fillText('仿生小狗', bx + 36, by + 108);
      ctx.fillStyle = '#EF4444';
      ctx.fillText('×1', bx + 122, by + 108);
      for (let b = 0; b < 18; b++) {
        pxRect(ctx, bx + 36 + b * 6, by + 120, b % 3 === 0 ? 4 : 2, 22, '#0F172A');
      }
      // `？！` overhead pop
      ctx.font = 'bold 44px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
      ctx.fillStyle = '#0F172A';
      ctx.fillText('？！', bx + 85, by - 25);
      ctx.restore();

      drawTopBionicHUD(ctx, t, { day: 1, bigDay: 1, weatherLabel: '晴 · 初遇', battery: 100 });
    }

    // ------------------------------------------------------------------------
    // SHOT 5 (7.00s – 8.00s): Looking Inside the Opened Box — BIONIC PUPPY OS Boot
    // ------------------------------------------------------------------------
    else if (t < 8.00) {
      // Inside-the-box cardboard frame perspective looking up at smiling young Owner
      pxRect(ctx, 0, 36, W, H - 36, '#92400E');
      pxRect(ctx, 160, 85, 960, 520, '#FDE68A');
      pxRect(ctx, 210, 120, 860, 450, '#FFFBEB');

      // Smiling child Owner looking into the box
      drawOwnerGirl(ctx, 640, 650, 42, { t, age: 'child', view: 'front', smiling: true, noShadow: true });

      // Cyan Face-Binding Bracket `[主人]`
      const fx = 495, fy = 195, fw = 290, fh = 295;
      pxRect(ctx, fx, fy - 28, 58, 24, '#2DD4BF');
      ctx.save();
      ctx.font = 'bold 15px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
      ctx.fillStyle = '#042F2E';
      ctx.fillText('主人', fx + 14, fy - 11);

      // Top-left BIONIC OS Boot Log
      ctx.font = 'bold 18px "Silkscreen", "ZCOOLKuaiLe", monospace';
      ctx.fillStyle = '#D97706';
      ctx.fillText('BIONIC WHALE_GIRL OS v1.0', 225, 155);
      ctx.fillStyle = '#15803D';
      ctx.fillText('激活成功 …… OK', 225, 182);
      ctx.fillText('正在绑定 主人 …… 100%', 225, 208);
      ctx.restore();

      // WhaleGirl in bottom-right corner looking up with sparkling eyes!
      drawBionicWhaleGirl(ctx, 1020, 685, 28, {
        t,
        view: 'front',
        emotion: 'excited',
        collarCyan: true
      });

      drawTopBionicHUD(ctx, t, { day: 1, battery: 100 });
    }

    // ------------------------------------------------------------------------
    // SHOT 6 (8.00s – 9.00s): WhaleGirl Pops Out of the Express Box ("你好呀！" -> "汪！")
    // ------------------------------------------------------------------------
    else if (t < 9.00) {
      drawFoyerSet(ctx, t, 'day');

      // Young Owner smiling on left
      drawOwnerGirl(ctx, 430, 655, 38, { t, age: 'child', view: 'side', smiling: true });

      // WhaleGirl jumping happily out of the cardboard box!
      const pop = backOut(seg(t, 8.00, 8.45));
      const bx = 660, by = 455, bw = 220, bh = 170;
      drawBionicWhaleGirl(ctx, bx + bw * 0.5, by + 95 - pop * 55, 34, {
        t,
        view: 'front',
        emotion: 'happy',
        pose: 'wave',
        waveArm: true
      });

      // Front face of the cardboard box below WhaleGirl's waist
      pxRect(ctx, bx - 4, by - 4, bw + 8, bh + 8, '#451A03');
      pxRect(ctx, bx, by, bw, bh, '#D97706');
      pxRect(ctx, bx + 28, by + 65, 130, 62, '#FFFFFF');
      ctx.save();
      ctx.font = 'bold 20px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
      ctx.fillStyle = '#0F172A';
      ctx.fillText('仿生小狗 ×1', bx + 36, by + 95);
      ctx.restore();

      drawTopBionicHUD(ctx, t, {
        day: 1,
        battery: 100,
        wantToSay: '你好呀！',
        barkOutput: '汪！'
      });
    }

    // ------------------------------------------------------------------------
    // SHOT 7 (9.00s – 10.00s): Golden Sunburst — Receiving the Name Tag "年糕"!
    // ------------------------------------------------------------------------
    else if (t < 10.00) {
      // Rotating golden sunburst rays
      pxRect(ctx, 0, 36, W, H - 36, '#FEF9C3');
      ctx.save();
      ctx.translate(640, 410);
      for (let i = 0; i < 16; i++) {
        const a0 = (i / 16) * TAU + t * 0.6;
        const a1 = a0 + TAU / 32;
        ctx.fillStyle = i % 2 === 0 ? '#FDE047' : '#FEF08A';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a0) * 900, Math.sin(a0) * 900);
        ctx.lineTo(Math.cos(a1) * 900, Math.sin(a1) * 900);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // Golden Name Tag Banner at top center: `年糕`
      drawPixelBox(ctx, 515, 58, 250, 74, '#FACC15', '#854D0E', '#CA8A04');
      ctx.save();
      ctx.font = 'bold 48px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#713F12';
      ctx.fillText('年 糕', 640, 96);
      ctx.restore();

      // Joyful Close-Up of Bionic WhaleGirl (`年糕`) with glowing collar!
      drawBionicWhaleGirl(ctx, 640, 695, 48, {
        t,
        view: 'front',
        emotion: 'love',
        pose: 'wink',
        collarCyan: true,
        emote: 'heart'
      });

      drawTopBionicHUD(ctx, t, { day: 2, battery: 100 });
    }

    // ------------------------------------------------------------------------
    // SHOT 8 (10.00s – 11.00s): Day 47 Sunny Green Park — Chasing the Red Ball!
    // ------------------------------------------------------------------------
    else if (t < 11.00) {
      // Blue sky, fluffy clouds, round green trees, and grassy lawn
      pxRect(ctx, 0, 36, W, 340, '#38BDF8');
      pxRect(ctx, 0, 220, W, 160, '#7DD3FC');
      // Trees along horizon
      for (let i = 0; i < 7; i++) {
        const tx = 95 + i * 185;
        paint(ctx, ellPts(tx, 340, 72, 68, 16), { wash: '#15803D', ink: '#14532D', sw: 2 });
        paint(ctx, ellPts(tx - 14, 325, 48, 44, 14), { wash: '#22C55E', ink: null });
      }
      // Green grass field
      pxRect(ctx, 0, 365, W, H - 365, '#22C55E');
      pxRect(ctx, 0, 430, W, H - 430, '#16A34A');

      // Owner running ahead on left
      const runX = 330 + (t - 10.0) * 60;
      drawOwnerGirl(ctx, runX, 585, 32, { t, age: 'child', view: 'side', walk: true, smiling: true });

      // Bionic WhaleGirl + `CAST.bionicPuppy` happily running after the red bouncy ball!
      const wgX = 720 + (t - 10.0) * 85;
      drawBionicWhaleGirl(ctx, wgX, 600, 32, {
        t,
        view: 'side',
        emotion: 'excited',
        walk: t * 12
      });
      if (CAST.bionicPuppy) {
        CAST.bionicPuppy(ctx, wgX - 145, 595, 16, { t, flip: true });
      }

      // Bouncing red ball
      const ballY = 535 - Math.abs(Math.sin(t * 9)) * 75;
      paint(ctx, ellPts(wgX + 165, ballY, 18, 18, 12), { wash: '#EF4444', ink: '#7F1D1D', sw: 2 });

      drawTopBionicHUD(ctx, t, { day: 47, battery: 100 });
    }

    // ------------------------------------------------------------------------
    // SHOT 9 (11.00s – 12.00s): Day 365 1st Birthday Cake & Night Guardian Mode
    // ------------------------------------------------------------------------
    else if (t < 12.00) {
      if (t < 11.55) {
        // Day 365: 1st Birthday Cake Celebration ("年糕 1 岁啦")!
        pxRect(ctx, 0, 36, W, H - 36, '#1E1B2E');
        // Warm candlelight glow
        paint(ctx, ellPts(640, 430, 380, 260, 24), { wash: '#F59E0B', washOp: 45, ink: null });

        drawOwnerGirl(ctx, 410, 635, 34, { t, age: 'child', view: 'front', smiling: true });
        drawBionicWhaleGirl(ctx, 870, 645, 34, {
          t,
          view: 'front',
          emotion: 'happy',
          hat: 'party',
          pose: 'heart'
        });

        // Strawberry Birthday Cake in center (x=540..740, y=440..610)
        pxRect(ctx, 520, 585, 240, 18, '#E2E8F0');
        pxRect(ctx, 550, 495, 180, 90, '#FEF3C7');
        pxRect(ctx, 550, 495, 180, 24, '#F8FAFC');
        // Strawberries & Candle
        for (let i = 0; i < 4; i++) {
          pxRect(ctx, 568 + i * 42, 478, 18, 18, '#EF4444');
        }
        pxRect(ctx, 634, 440, 12, 55, '#F43F5E');
        pxRect(ctx, 632, 418, 16, 22, '#FACC15');
        ctx.save();
        ctx.font = 'bold 22px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#EF4444';
        ctx.fillText('年糕 1 岁啦', 640, 555);
        ctx.restore();

        drawTopBionicHUD(ctx, t, {
          day: 365,
          bigDay: 365,
          weatherLabel: '生日快乐',
          battery: 99,
          wantToSay: '祝你快乐！',
          barkOutput: '汪！'
        });
      } else {
        // Nighttime Cozy Bed (`守护模式：开`, `Zzz`)
        pxRect(ctx, 0, 36, W, H - 36, '#1E293B');
        // Pillows
        pxRect(ctx, 290, 260, 280, 130, '#CBD5E1');
        pxRect(ctx, 640, 260, 280, 130, '#CBD5E1');
        // Sleeping Owner on left pillow (`Zzz`) + Awake Bionic WhaleGirl watching over her!
        drawOwnerGirl(ctx, 430, 520, 32, { t, age: 'child', view: 'front', smiling: true, noShadow: true });
        drawBionicWhaleGirl(ctx, 780, 535, 32, {
          t,
          view: 'front',
          emotion: 'happy',
          collarCyan: true
        });
        // Starry Navy Blanket covering lower half
        pxRect(ctx, 180, 410, 920, 290, '#1E3A8A');
        pxRect(ctx, 180, 410, 920, 18, '#3B82F6');

        // `守护模式：开` HUD badge
        pxRect(ctx, 885, 225, 135, 28, '#2DD4BF');
        ctx.save();
        ctx.font = 'bold 16px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
        ctx.fillStyle = '#042F2E';
        ctx.fillText('守护模式：开', 897, 245);
        ctx.font = 'bold 34px "Silkscreen", monospace';
        ctx.fillStyle = '#E2E8F0';
        ctx.fillText('Z z z', 310, 215);
        ctx.restore();

        drawTopBionicHUD(ctx, t, { day: 365, battery: 99 });
      }
    }

    // ------------------------------------------------------------------------
    // SHOT 10 (12.00s – 14.80s): Day 1203 Waiting by the Front Door ("等我放学哦！")
    // ------------------------------------------------------------------------
    else if (t < 14.80) {
      const phase = t < 12.85 ? 'leaving' : (t < 14.15 ? 'waiting' : 'returned');
      const clockStr = phase === 'leaving' ? '08:00' : (phase === 'waiting' ? '10:50' : '17:25');
      drawFoyerSet(ctx, t, phase === 'returned' ? 'dusk' : 'day', {
        clockText: phase !== 'leaving' ? clockStr : undefined
      });

      if (phase === 'leaving') {
        // Owner at door saying "等我放学哦！"
        drawOwnerGirl(ctx, 760, 595, 32, { t, age: 'child', view: 'front', smiling: true });
        drawSpeechBubble(ctx, 355, 385, 185, 50, '等我放学哦！', { tailDir: 'right', fontSize: 22 });
        drawBionicWhaleGirl(ctx, 560, 625, 28, {
          t,
          view: 'side',
          emotion: 'happy'
        });
      } else if (phase === 'waiting') {
        // Bionic WhaleGirl sitting loyally in `back` view on the red doormat facing the closed door!
        drawBionicWhaleGirl(ctx, 710, 650, 30, {
          t,
          view: 'back',
          emotion: 'calm'
        });
      } else {
        // 17:25 Owner returns! WhaleGirl leaps up barking "汪！"
        drawOwnerGirl(ctx, 765, 595, 32, { t, age: 'child', view: 'front', smiling: true });
        drawBionicWhaleGirl(ctx, 575, 610, 30, {
          t,
          view: 'side',
          emotion: 'excited',
          pose: 'wave',
          waveArm: true
        });
        ctx.save();
        ctx.font = 'bold 48px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
        ctx.fillStyle = '#0F172A';
        ctx.fillText('汪！', 435, 520);
        ctx.fillStyle = '#38BDF8';
        ctx.fillText('汪！', 432, 517);
        ctx.restore();
      }

      drawTopBionicHUD(ctx, t, {
        day: 1203,
        bigDay: phase === 'leaving' ? 1203 : undefined,
        battery: 91
      });
    }

    // ------------------------------------------------------------------------
    // SHOT 11 (14.80s – 16.20s): Day 2557 Study Desk ("陪我玩" / "别闹。")
    // ------------------------------------------------------------------------
    else if (t < 16.20) {
      // Evening study room
      pxRect(ctx, 0, 36, W, 480, '#2B3040');
      pxRect(ctx, 0, 516, W, H - 516, '#3D2B24');
      // Wooden Desk & Chair on left (x=120..520, y=240..530)
      pxRect(ctx, 110, 260, 380, 24, '#78350F');
      pxRect(ctx, 140, 284, 24, 245, '#451A03');
      pxRect(ctx, 430, 284, 24, 245, '#451A03');
      // Teen Owner sitting at desk stressed over exams
      drawOwnerGirl(ctx, 340, 540, 30, { t, age: 'teen', view: 'side', flip: true });
      drawSpeechBubble(ctx, 420, 290, 115, 46, '别闹。', { tailDir: 'left', fontSize: 21 });

      // Red bouncy ball on floor
      paint(ctx, ellPts(580, 555, 16, 16, 12), { wash: '#EF4444', ink: '#7F1D1D', sw: 2 });

      // Bionic WhaleGirl sitting on right looking wistfully at her owner (`想说：陪我玩` -> `汪？`)
      drawBionicWhaleGirl(ctx, 790, 625, 30, {
        t,
        view: 'side',
        flip: true,
        emotion: 'sad'
      });

      drawTopBionicHUD(ctx, t, {
        day: 2557,
        bigDay: 2557,
        battery: 72,
        wantToSay: '陪我玩',
        barkOutput: '汪？'
      });
    }

    // ------------------------------------------------------------------------
    // SHOT 12 (16.20s – 17.80s): Day 2557 Failed 59-Point Exam — WhaleGirl Comforts Owner!
    // ------------------------------------------------------------------------
    else if (t < 17.80) {
      pxRect(ctx, 0, 36, W, H - 36, '#1E2436');

      // White exam paper in top-left with red `59` and double underline!
      ctx.save();
      ctx.translate(160, 155);
      ctx.rotate(-0.12);
      pxRect(ctx, -65, -75, 130, 155, '#F8FAFC');
      ctx.font = 'bold 54px "Silkscreen", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#DC2626';
      ctx.fillText('59', 0, -5);
      pxRect(ctx, -42, 8, 84, 4, '#DC2626');
      pxRect(ctx, -42, 16, 84, 4, '#DC2626');
      ctx.restore();

      // Crying Teen Owner on left + Bionic WhaleGirl hugging/nuzzling her cheek on right!
      drawOwnerGirl(ctx, 490, 675, 42, { t, age: 'teen', view: 'side', crying: true });
      drawBionicWhaleGirl(ctx, 760, 680, 40, {
        t,
        view: 'side',
        flip: true,
        emotion: 'love',
        licking: true
      });

      drawTopBionicHUD(ctx, t, {
        day: 2557,
        battery: 71,
        wantToSay: '别难过',
        barkOutput: '汪……'
      });
    }

    // ------------------------------------------------------------------------
    // SHOT 13 (17.80s – 19.00s): Day 3920 Pink Suitcase Farewell ("放假就回来。")
    // ------------------------------------------------------------------------
    else if (t < 19.00) {
      drawFoyerSet(ctx, t, 'dusk');

      // Pink Rolling Suitcase on left (x=40..175, y=410..620)
      pxRect(ctx, 68, 330, 10, 90, '#94A3B8');
      pxRect(ctx, 52, 325, 42, 10, '#475569');
      pxRect(ctx, 35, 415, 125, 195, '#9D174D');
      pxRect(ctx, 42, 422, 111, 181, '#F43F5E');

      // Teen Owner & Bionic WhaleGirl forehead-to-forehead goodbye!
      drawOwnerGirl(ctx, 350, 670, 40, { t, age: 'teen', view: 'side', smiling: true });
      drawBionicWhaleGirl(ctx, 650, 675, 38, {
        t,
        view: 'side',
        flip: true,
        emotion: 'sad'
      });

      const msg = t < 18.2 ? '放假' : '放假就回来。';
      drawSpeechBubble(ctx, 390, 155, 220, 52, msg, { tailDir: 'bottom', fontSize: 23 });

      drawTopBionicHUD(ctx, t, {
        day: 3920,
        bigDay: 3920,
        weatherLabel: '离别',
        battery: 39
      });
    }

    // ------------------------------------------------------------------------
    // SHOT 14 (19.00s – 21.00s): Day 4142 Waiting Alone by the Door (等待中 第 326 天)
    // ------------------------------------------------------------------------
    else if (t < 21.00) {
      const waitDays = Math.round(lerp(222, 326, seg(t, 19.0, 21.0)));
      const bat = Math.round(lerp(35, 22, seg(t, 19.0, 21.0)));
      drawFoyerSet(ctx, t, 'dusk', { waitDays });

      // WhaleGirl sitting alone facing the door (`back` view), holding a letter/photo
      drawBionicWhaleGirl(ctx, 710, 655, 30, {
        t,
        view: 'back',
        emotion: 'sad'
      });

      drawTopBionicHUD(ctx, t, { day: 4142, battery: bat });
    }

    // ------------------------------------------------------------------------
    // SHOT 15 (21.00s – 22.00s): Day 4379 Low Battery Collapse (`⚠️ 电池健康 过低`)
    // ------------------------------------------------------------------------
    else if (t < 22.00) {
      drawFoyerSet(ctx, t, 'night');

      // Weak Bionic WhaleGirl collapsed/kneeling on the floor
      const dropY = easeOut(seg(t, 21.0, 21.5)) * 38;
      drawBionicWhaleGirl(ctx, 740, 610 + dropY, 28, {
        t,
        view: 'side',
        emotion: 'cry',
        lowBattery: true,
        sq: -0.18
      });

      // Flashing Red System Warning Banner: `⚠️ 电池健康 过低 — 请尽快更换电池`
      drawPixelBox(ctx, 415, 145, 450, 92, '#450A0A', '#EF4444', '#991B1B');
      // Yellow warning triangle
      ctx.save();
      ctx.fillStyle = '#FACC15';
      ctx.beginPath();
      ctx.moveTo(465, 168);
      ctx.lineTo(490, 214);
      ctx.lineTo(440, 214);
      ctx.closePath();
      ctx.fill();
      ctx.font = 'bold 24px "Silkscreen", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#0F172A';
      ctx.fillText('!', 465, 208);

      ctx.font = 'bold 26px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
      ctx.fillStyle = '#FCA5A5';
      ctx.fillText('电池健康 过低', 665, 182);
      ctx.font = 'bold 18px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
      ctx.fillStyle = '#FECACA';
      ctx.fillText('请尽快更换电池', 665, 214);
      ctx.restore();

      drawTopBionicHUD(ctx, t, { day: 4379, battery: 4 });
    }

    // ------------------------------------------------------------------------
    // SHOT 16 (22.00s – 23.00s): Mobile App Warning (`4% 该型号已停产 无可更换配件`)
    // ------------------------------------------------------------------------
    else if (t < 23.00) {
      pxRect(ctx, 0, 36, W, H - 36, '#0F172A');

      // Smartphone Screen in Center (x=420..860, y=50..630)
      drawPixelBox(ctx, 420, 50, 440, 580, '#111827', '#475569', '#1F2937');

      // WhaleGirl avatar icon inside the app header!
      drawPixelBox(ctx, 450, 78, 96, 96, '#1E293B', '#38BDF8', '#0F172A');
      ctx.save();
      ctx.beginPath();
      ctx.rect(452, 80, 92, 92);
      ctx.clip();
      drawBionicWhaleGirl(ctx, 498, 195, 14, { t, view: 'front', emotion: 'happy' });
      ctx.restore();

      ctx.save();
      ctx.textAlign = 'left';
      ctx.font = 'bold 42px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
      ctx.fillStyle = '#F8FAFC';
      ctx.fillText('年糕', 568, 122);
      ctx.font = 'bold 18px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
      ctx.fillStyle = '#94A3B8';
      ctx.fillText('陪伴 第 4380 天', 568, 156);

      // Battery Health 4% bar inside phone
      drawPixelBox(ctx, 450, 198, 380, 130, '#090D16', '#334155', '#1E293B');
      ctx.font = 'bold 24px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
      ctx.fillStyle = '#CBD5E1';
      ctx.fillText('电池健康', 475, 245);
      ctx.font = 'bold 48px "Silkscreen", monospace';
      ctx.fillStyle = '#EF4444';
      ctx.fillText('4%', 720, 252);
      pxRect(ctx, 475, 278, 330, 24, '#1E293B');
      pxRect(ctx, 475, 278, 22, 24, '#EF4444');

      // Red Discontinued Alert Box: `该型号已停产 / 无可更换配件 !`
      drawPixelBox(ctx, 450, 355, 380, 145, '#450A0A', '#EF4444', '#7F1D1D');
      ctx.font = 'bold 26px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
      ctx.fillStyle = '#FCA5A5';
      ctx.fillText('该型号已停产', 480, 410);
      ctx.fillText('无可更换配件', 480, 455);
      ctx.font = 'bold 64px "Silkscreen", monospace';
      ctx.fillStyle = '#EF4444';
      ctx.fillText('!', 775, 448);
      ctx.restore();

      // Owner's yellow sleeve holding phone on right
      pxRect(ctx, 850, 340, 430, 320, '#EAB308');
      pxRect(ctx, 850, 340, 430, 28, '#FACC15');

      drawTopBionicHUD(ctx, t, { day: 4380, battery: 4 });
    }

    // ------------------------------------------------------------------------
    // SHOT 17 (23.00s – 25.00s): Day 4380 Rushing Home in the Rain ("主人别哭泣")
    // ------------------------------------------------------------------------
    else if (t < 25.00) {
      if (t < 23.65) {
        // Pouring city night rain — Owner drops her pink suitcase & runs home!
        pxRect(ctx, 0, 36, W, H - 36, '#090D1A');
        // City skyline lights
        for (let b = 0; b < 10; b++) {
          const bx = b * 135, bh = 180 + (b * 47) % 140;
          pxRect(ctx, bx, 460 - bh, 115, bh, '#111827');
          for (let wy = 480 - bh; wy < 440; wy += 28) {
            pxRect(ctx, bx + 20, wy, 14, 14, '#FACC15');
            pxRect(ctx, bx + 65, wy, 14, 14, '#38BDF8');
          }
        }
        pxRect(ctx, 0, 460, W, H - 460, '#1E293B');

        // Tilted falling pink suitcase on left
        ctx.save();
        ctx.translate(310, 410);
        ctx.rotate(-0.32);
        pxRect(ctx, -45, -75, 90, 150, '#F43F5E');
        ctx.restore();

        // Owner sprinting right + WhaleGirl memory hologram ahead
        drawOwnerGirl(ctx, 690, 515, 36, { t, age: 'teen', view: 'side', walk: true });
        drawBionicWhaleGirl(ctx, 1060, 525, 26, { t, view: 'side', flip: true, emotion: 'cry', lowBattery: true });

        // Diagonal rain streaks
        for (let r = 0; r < 55; r++) {
          const rx = (r * 73 + Math.floor(t * 500)) % W;
          const ry = 40 + ((r * 89 + Math.floor(t * 650)) % 560);
          pxRect(ctx, rx, ry, 3, 24, '#60A5FA');
        }
      } else {
        // Dark room: Owner arrives panting ("呼哧……"), finding WhaleGirl weak on the floor
        drawFoyerSet(ctx, t, 'night');
        drawOwnerGirl(ctx, 880, 600, 32, { t, age: 'teen', view: 'side', flip: true, crying: true });
        drawBionicWhaleGirl(ctx, 480, 625, 28, {
          t,
          view: 'side',
          emotion: 'cry',
          lowBattery: true,
          tears: true
        });
        drawSpeechBubble(ctx, 730, 80, 140, 48, '呼哧……', { tailDir: 'bottom', bg: '#1E293B', fg: '#E2E8F0' });
      }
      drawTopBionicHUD(ctx, t, { day: 4380, bigDay: 4380, battery: 3 });
    }

    // ------------------------------------------------------------------------
    // SHOT 18 (25.00s – 28.40s): Tear-Licking Close-Up (`味道：咸 / 眼泪 99%`) &
    //                            `尾巴 输出功率 92% — 唯一可用的输出方式`
    // ------------------------------------------------------------------------
    else if (t < 28.40) {
      if (t < 27.75) {
        // Warm emotional close-up: Bionic WhaleGirl licking away crying Owner's tears!
        pxRect(ctx, 0, 36, W, H - 36, '#2A2421');
        paint(ctx, ellPts(640, 400, 420, 290, 24), { wash: '#D97706', washOp: 45, ink: null });

        const zoom = t >= 26.7 ? 1.22 : 1.0;
        ctx.save();
        ctx.translate(640, 420);
        ctx.scale(zoom, zoom);
        ctx.translate(-640, -420);

        drawOwnerGirl(ctx, 430, 695, 48, { t, age: 'teen', view: 'side', crying: true, noShadow: true });
        drawBionicWhaleGirl(ctx, 810, 700, 46, {
          t,
          view: 'side',
          flip: true,
          emotion: 'love',
          licking: true,
          tears: true,
          lowBattery: true
        });
        ctx.restore();

        // At t >= 26.7s: Bionic Sensor Pop-up `味道：咸 | 成分：眼泪 99%`
        if (t >= 26.65) {
          drawPixelBox(ctx, 740, 140, 235, 76, '#0F172A', '#38BDF8', '#1E293B');
          ctx.save();
          ctx.font = 'bold 20px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
          ctx.fillStyle = '#E2E8F0';
          ctx.fillText('味道：  咸', 762, 172);
          ctx.fillStyle = '#38BDF8';
          ctx.fillText('成分：  眼泪 99%', 762, 202);
          ctx.restore();
        }
      } else {
        // 27.75s – 28.40s: `尾巴 输出功率 92% — 唯一可用的输出方式`
        pxRect(ctx, 0, 36, W, H - 36, '#1B2234');

        // Left HUD Power Meter Box
        drawPixelBox(ctx, 75, 165, 390, 145, '#0D1326', '#38BDF8', '#1E293B');
        ctx.save();
        ctx.font = 'bold 24px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
        ctx.fillStyle = '#E2E8F0';
        ctx.fillText('尾巴 输出功率', 102, 208);
        pxRect(ctx, 102, 224, 240, 24, '#1E293B');
        pxRect(ctx, 102, 224, 220, 24, '#38BDF8');
        ctx.font = 'bold 26px "Silkscreen", monospace';
        ctx.fillStyle = '#38BDF8';
        ctx.fillText('92%', 355, 244);
        ctx.font = 'bold 18px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
        ctx.fillStyle = '#94A3B8';
        ctx.fillText('唯一可用的输出方式', 102, 286);
        ctx.restore();

        // Right: Bionic WhaleGirl wagging her whale tail with motion smear ticks!
        drawBionicWhaleGirl(ctx, 880, 675, 44, {
          t: t * 4,
          view: 'side',
          emotion: 'determined',
          lowBattery: true
        });
        // Motion action lines around wagging whale tail
        ctx.save();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 5;
        for (let k = -2; k <= 2; k++) {
          const ang = -1.8 + k * 0.32 + Math.sin(t * 25) * 0.08;
          ctx.beginPath();
          ctx.moveTo(740 + Math.cos(ang) * 95, 460 + Math.sin(ang) * 95);
          ctx.lineTo(740 + Math.cos(ang) * 135, 460 + Math.sin(ang) * 135);
          ctx.stroke();
        }
        ctx.restore();
      }
      drawTopBionicHUD(ctx, t, { day: 4380, battery: 3 });
    }

    // ------------------------------------------------------------------------
    // SHOT 19 (28.40s – 30.00s): WhaleGirl Tearful Smile ("别哭了" -> "汪。")
    // ------------------------------------------------------------------------
    else if (t < 30.00) {
      drawFoyerSet(ctx, t, 'night');
      drawBionicWhaleGirl(ctx, 560, 690, 46, {
        t,
        view: 'front',
        emotion: 'cry',
        tears: true,
        lowBattery: true
      });
      drawSpeechBubble(ctx, 640, 505, 110, 48, '汪。', { tailDir: 'left', fontSize: 24 });
      drawTopBionicHUD(ctx, t, {
        day: 4380,
        battery: 3,
        wantToSay: '别哭了',
        voiceModuleError: true,
        barkOutput: '汪。'
      });
    }

    // ------------------------------------------------------------------------
    // SHOT 20 (30.00s – 32.00s): Owner's Apologies ("对不起 / 我回来晚了 / 谢谢你等我 / 我爱你")
    // ------------------------------------------------------------------------
    else if (t < 32.00) {
      drawBionicOwnerHUDScene(ctx, t, 'apology');
      drawTopBionicHUD(ctx, t, { day: 4380, battery: 3 });
    }

    // ------------------------------------------------------------------------
    // SHOT 21 (32.00s – 33.00s): Memory Collage ("晚安 ♥" / "记得吃饭" / "见字如面")
    // ------------------------------------------------------------------------
    else if (t < 33.00) {
      pxRect(ctx, 0, 36, W, H - 36, '#090D16');

      // Top-left quadrant: Chat bubble `晚安 ♥`
      pxRect(ctx, 20, 48, 590, 290, '#111827');
      drawPixelBox(ctx, 195, 115, 240, 74, '#0D9488', '#2DD4BF', '#115E59');
      ctx.save();
      ctx.font = 'bold 42px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('晚安', 295, 165);
      paint(ctx, heartPts(382, 152, 16), { wash: '#F43F5E', ink: null });

      // Top-right quadrant: Yellow Sticky Note `记得吃饭`
      pxRect(ctx, 630, 48, 630, 290, '#F1F5F9');
      pxRect(ctx, 815, 78, 250, 225, '#FDE047');
      paint(ctx, ellPts(940, 92, 10, 10, 10), { wash: '#EF4444', ink: null });
      ctx.fillStyle = '#1E293B';
      ctx.fillText('记得', 940, 165);
      ctx.fillText('吃饭', 940, 225);

      // Bottom-left quadrant: Handwritten card `见字如面`
      pxRect(ctx, 20, 355, 590, 270, '#F8FAFC');
      ctx.font = 'bold 64px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
      ctx.fillStyle = '#0F172A';
      ctx.fillText('见字如面', 315, 505);

      // Bottom-right quadrant: Bionic WhaleGirl holding all these memories!
      pxRect(ctx, 630, 355, 630, 270, '#1E293B');
      drawBionicWhaleGirl(ctx, 945, 645, 30, {
        t,
        view: 'front',
        emotion: 'love',
        collarCyan: true,
        emote: 'heart'
      });
      ctx.restore();

      drawTopBionicHUD(ctx, t, { day: 4380, battery: 3 });
    }

    // ------------------------------------------------------------------------
    // SHOT 22 (33.00s – 36.00s): Memory Database `主人说过的话` & Star Constellation
    // ------------------------------------------------------------------------
    else if (t < 36.00) {
      pxRect(ctx, 0, 36, W, H - 36, '#0B1021');
      // Twinkling starfield
      for (let s = 0; s < 40; s++) {
        const sx = (s * 97) % W;
        const sy = 50 + ((s * 61) % 560);
        pxRect(ctx, sx, sy, 3, 3, s % 3 === 0 ? '#38BDF8' : '#E2E8F0');
      }

      // Bionic WhaleGirl sitting on bottom-left looking up at the memory logs
      drawBionicWhaleGirl(ctx, 195, 635, 28, {
        t,
        view: 'side',
        emotion: 'love',
        collarCyan: true
      });

      if (t < 35.00) {
        // Terminal Window: `主人说过的话 (共 1,204,771 句)`
        drawPixelBox(ctx, 355, 68, 720, 515, '#0D152C', '#475569', '#1E293B');
        pxRect(ctx, 355, 122, 720, 2, '#334155');
        const countNum = t < 33.8 ? '1,070,295' : '1,204,771';
        ctx.save();
        ctx.font = 'bold 24px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
        ctx.fillStyle = '#E2E8F0';
        ctx.fillText('主人说过的话', 385, 104);
        ctx.font = 'bold 18px "Silkscreen", "ZCOOLKuaiLe", monospace';
        ctx.fillStyle = '#94A3B8';
        ctx.fillText(`共 ${countNum} 句`, 855, 104);

        const logs = [
          ['DAY 0128', '晚安，年糕'],
          ['DAY 0365', '生日快乐呀'],
          ['DAY 1203', '等我放学哦'],
          ['DAY 1840', '今天老师夸我了'],
          ['DAY 2557', '别闹'],
          ['DAY 2558', '对不起，昨天凶你了'],
          ['DAY 3011', '我好像喜欢上一个人'],
          ['DAY 3920', '放假就回来'],
          ['DAY 4380', '我回来了']
        ];
        const maxRows = t < 33.8 ? 8 : 9;
        for (let i = 0; i < maxRows; i++) {
          const ry = 162 + i * 44;
          const isLast = i === 8;
          if (isLast) {
            pxRect(ctx, 375, ry - 24, 680, 36, 'rgba(56, 189, 248, 0.22)');
          }
          ctx.font = 'bold 18px "Silkscreen", monospace';
          ctx.fillStyle = isLast ? '#38BDF8' : '#64748B';
          ctx.fillText(logs[i][0], 390, ry);
          ctx.font = 'bold 22px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
          ctx.fillStyle = isLast ? '#7DD3FC' : '#CBD5E1';
          ctx.fillText(logs[i][1], 545, ry);
        }
        ctx.restore();
      } else {
        // 35.00s – 36.00s: Floating Star Constellation of Memory Phrases!
        const words = [
          { text: '好孩子',   x: 280, y: 265, sz: 24, col: '#E2E8F0' },
          { text: '辛苦了',   x: 240, y: 335, sz: 22, col: '#94A3B8' },
          { text: '记得吃饭', x: 355, y: 390, sz: 26, col: '#FDE047' },
          { text: '我愿意',   x: 285, y: 455, sz: 24, col: '#E2E8F0' },
          { text: '舍不得',   x: 685, y: 270, sz: 26, col: '#7DD3FC' },
          { text: '我没事',   x: 605, y: 335, sz: 24, col: '#CBD5E1' },
          { text: '别怕',     x: 1030, y: 270, sz: 24, col: '#E2E8F0' },
          { text: '在吗',     x: 920, y: 340, sz: 22, col: '#94A3B8' },
          { text: '抱抱',     x: 1020, y: 395, sz: 26, col: '#F472B6' },
          { text: '你好呀',   x: 960, y: 455, sz: 24, col: '#38BDF8' },
          { text: '生日快乐', x: 540, y: 155, sz: 20, col: '#64748B' },
          { text: '谢谢你',   x: 820, y: 175, sz: 22, col: '#94A3B8' }
        ];
        ctx.save();
        ctx.textAlign = 'center';
        for (let i = 0; i < words.length; i++) {
          const w = words[i];
          const floatY = w.y - (t - 35.0) * 35 + Math.sin(t * 3 + i) * 6;
          ctx.font = `bold ${w.sz}px "ZCOOLKuaiLe", "NotoSansSC", sans-serif`;
          ctx.fillStyle = w.col;
          ctx.fillText(w.text, w.x, floatY);
        }
        ctx.restore();
      }

      drawTopBionicHUD(ctx, t, { day: 4380, battery: 3 });
    }

    // ------------------------------------------------------------------------
    // SHOT 23 (36.00s – 38.00s): Emotional Dictionary Cards & Unsent Messages
    // ------------------------------------------------------------------------
    else if (t < 38.00) {
      if (t < 37.00) {
        // Warm cream dictionary notebook (`【想念】/【委屈】/【舍不得】/【陪伴】`)
        pxRect(ctx, 0, 36, W, H - 36, '#FFFBEB');
        const defs = [
          ['【想念】',   '很久没见，心里一直放着。', false],
          ['【委屈】',   '明明没做错，却想哭。',     false],
          ['【舍不得】', '知道要分开，还是不想松手。', false],
          ['【陪伴】',   '什么都不用说，也在。',     true]
        ];
        ctx.save();
        for (let i = 0; i < defs.length; i++) {
          const ry = 85 + i * 132;
          if (defs[i][2]) {
            pxRect(ctx, 48, ry - 18, 920, 88, '#FEF08A');
          }
          pxRect(ctx, 56, ry - 6, 6, 56, '#F59E0B');
          ctx.font = 'bold 28px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
          ctx.fillStyle = '#0F172A';
          ctx.fillText(defs[i][0], 85, ry + 32);
          ctx.font = 'bold 26px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
          ctx.fillStyle = '#334155';
          ctx.fillText(defs[i][1], 255, ry + 32);
        }
        ctx.restore();

        // WhaleGirl on right touching the `【陪伴】` card!
        drawBionicWhaleGirl(ctx, 1085, 650, 32, {
          t,
          view: 'front',
          emotion: 'love',
          pose: 'wave',
          collarCyan: true
        });
      } else {
        // 37.00s – 38.00s: Unsent Chat Bubbles (`对方正在输入...`)
        pxRect(ctx, 0, 36, W, H - 36, '#0F172A');
        ctx.save();
        ctx.font = 'bold 18px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#64748B';
        ctx.fillText('对方正在输入...', 640, 72);
        ctx.restore();

        const msgs = [
          { y: 115, text: '我其实想了很久该怎么说', strike: false },
          { y: 192, text: '那天不是故意不回你',     strike: false },
          { y: 365, text: '就是不知道怎么开口',     strike: true },
          { y: 435, text: '很多话打了又删',         strike: true },
          { y: 505, text: '总之，对不起',           strike: false }
        ];
        for (const m of msgs) {
          drawSpeechBubble(ctx, 88, m.y, 380, 52, m.text, { tailDir: 'left', bg: '#F8FAFC', fontSize: 22 });
          if (m.strike) {
            pxRect(ctx, 105, m.y + 25, 345, 3, '#64748B');
          }
        }
        // Right reply bubble `嗯`
        drawSpeechBubble(ctx, 1080, 275, 95, 50, '嗯', { tailDir: 'right', bg: '#0D9488', fg: '#FFFFFF', fontSize: 24 });

        // WhaleGirl watching the chat on right
        drawBionicWhaleGirl(ctx, 860, 645, 30, {
          t,
          view: 'front',
          emotion: 'sad',
          lowBattery: true
        });
      }

      drawTopBionicHUD(ctx, t, { day: 4380, battery: 3 });
    }

    // ------------------------------------------------------------------------
    // SHOT 24 (38.00s – 40.30s): Golden Pixel "爱" Lands on WhaleGirl's Forehead + "阿嚏"!
    // ------------------------------------------------------------------------
    else if (t < 40.30) {
      pxRect(ctx, 0, 36, W, H - 36, '#141B2D');

      if (t < 38.80) {
        // Golden pixel character `爱` floating out from the bedroom window into the starry night!
        pxRect(ctx, 150, 120, 420, 340, '#1E293B');
        pxRect(ctx, 165, 135, 390, 310, '#0F172A');
        drawOwnerGirl(ctx, 360, 440, 24, { t, age: 'teen', view: 'front', smiling: true, noShadow: true });
        drawBionicWhaleGirl(ctx, 920, 650, 34, { t, view: 'front', emotion: 'curious', lowBattery: true });

        const lx = lerp(520, 860, seg(t, 38.0, 38.8));
        const ly = lerp(180, 260, seg(t, 38.0, 38.8));
        ctx.save();
        ctx.font = 'bold 64px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FACC15';
        ctx.fillText('爱', lx, ly);
        ctx.restore();
      } else if (t < 39.75) {
        // 38.80s – 39.75s: Close-Up of WhaleGirl with `爱` on her forehead & `?` emote!
        drawBionicWhaleGirl(ctx, 640, 690, 46, {
          t,
          view: 'front',
          emotion: 'curious',
          foreheadLove: true,
          lowBattery: true,
          emote: 'question'
        });
      } else {
        // 39.75s – 40.30s: Cute Sneeze Gag `"阿嚏"`!
        const shakeX = Math.sin(t * 70) * 8;
        drawBionicWhaleGirl(ctx, 640 + shakeX, 695, 48, {
          t,
          view: 'front',
          emotion: 'happy',
          pose: 'wink',
          lowBattery: true
        });
        ctx.save();
        ctx.font = 'bold 58px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
        ctx.fillStyle = '#FEF08A';
        ctx.fillText('阿嚏！', 835, 305);
        ctx.restore();
      }

      drawTopBionicHUD(ctx, t, { day: 4380, battery: 3 });
    }

    // ------------------------------------------------------------------------
    // SHOT 25 (40.30s – 42.00s): Terminal `我说过的话 (共 30,612 句)` ("汪！ / 汪汪汪！")
    // ------------------------------------------------------------------------
    else if (t < 42.00) {
      pxRect(ctx, 0, 36, W, H - 36, '#0B1021');

      // Bionic WhaleGirl on bottom-left beside her own speech log
      drawBionicWhaleGirl(ctx, 215, 640, 30, {
        t,
        view: 'side',
        emotion: 'happy',
        lowBattery: true
      });

      drawPixelBox(ctx, 410, 65, 760, 520, '#0D152C', '#475569', '#1E293B');
      pxRect(ctx, 410, 120, 760, 2, '#334155');
      ctx.save();
      ctx.font = 'bold 24px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
      ctx.fillStyle = '#E2E8F0';
      ctx.fillText('我说过的话', 440, 102);
      ctx.font = 'bold 18px "Silkscreen", "ZCOOLKuaiLe", monospace';
      ctx.fillStyle = '#94A3B8';
      ctx.fillText('共 30,612 句', 965, 102);

      const barks = [
        ['DAY 0365', '汪！'],
        ['DAY 1203', '汪汪汪！'],
        ['DAY 1840', '汪汪！'],
        ['DAY 2557', '汪？'],
        ['DAY 2558', '汪……'],
        ['DAY 3920', '汪汪……'],
        ['DAY 4380', '……']
      ];
      for (let i = 0; i < barks.length; i++) {
        const ry = 165 + i * 50;
        ctx.font = 'bold 18px "Silkscreen", monospace';
        ctx.fillStyle = '#64748B';
        ctx.fillText(barks[i][0], 445, ry);
        ctx.font = 'bold 22px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
        ctx.fillStyle = '#CBD5E1';
        ctx.fillText(barks[i][1], 610, ry);
      }

      // Bottom input bar inside terminal: `说出口 [ 听写中 ılıllılı ]`
      drawPixelBox(ctx, 435, 515, 710, 48, '#090D1A', '#334155', '#1E293B');
      ctx.font = 'bold 18px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
      ctx.fillStyle = '#38BDF8';
      ctx.fillText('说出口  [ 听写中 ılıllılı ]', 455, 545);
      ctx.restore();

      drawTopBionicHUD(ctx, t, { day: 4380, battery: 3 });
    }

    // ------------------------------------------------------------------------
    // SHOT 26 (42.00s – 44.00s): Unspoken Final Words & `× 语言模块 未安装`
    // ------------------------------------------------------------------------
    else if (t < 44.00) {
      pxRect(ctx, 0, 36, W, H - 36, '#0D1324');

      // Large Thought Input Modal on left (x=55..875, y=105..545)
      drawPixelBox(ctx, 55, 105, 820, 440, '#0B1020', '#64748B', '#1E293B');
      // Header bar: `想说` ... `已删 14 字 / 54 字`
      pxRect(ctx, 57, 107, 816, 42, '#CBD5E1');
      ctx.save();
      ctx.font = 'bold 20px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
      ctx.fillStyle = '#0F172A';
      ctx.fillText('想说', 78, 134);
      ctx.fillStyle = '#475569';
      ctx.fillText(t < 43.1 ? '已删 14 字' : '已删 54 字', 745, 134);

      // Typed inner confession lines
      const lines = [
        '其实你每次出门，我都趴在门口数你的脚步。',
        '你哭的时候，我也想抱抱你。',
        '对不起，我不能再陪你了。',
        '你要好好吃饭，好好睡觉。'
      ];
      const showCount = t < 43.0 ? 2 : 4;
      for (let i = 0; i < showCount; i++) {
        const ly = 205 + i * 54;
        ctx.font = 'bold 25px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
        ctx.fillStyle = '#E2E8F0';
        ctx.fillText(lines[i], 88, ly);
        if (t >= 43.05) {
          // Red strikethrough line across each sentence!
          pxRect(ctx, 84, ly - 8, 540, 4, '#EF4444');
        }
      }

      // Bottom-right cyan button inside modal: `说出口`
      pxRect(ctx, 735, 485, 115, 40, '#0284C7');
      ctx.font = 'bold 20px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('说出口', 792, 511);

      // At t >= 43.1s: Red Error Popup Modal `× 语言模块 未安装`
      if (t >= 43.10) {
        drawPixelBox(ctx, 295, 295, 340, 74, '#450A0A', '#EF4444', '#991B1B');
        ctx.font = 'bold 28px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
        ctx.fillStyle = '#FCA5A5';
        ctx.fillText('× 语言模块 未安装', 465, 340);
      }
      ctx.restore();

      // Bionic WhaleGirl on right looking earnestly at the viewer
      drawBionicWhaleGirl(ctx, 1055, 685, 40, {
        t,
        view: 'front',
        emotion: 'cry',
        tears: true,
        lowBattery: true
      });

      drawTopBionicHUD(ctx, t, { day: 4380, battery: 3 });
    }

    // ------------------------------------------------------------------------
    // SHOT 27 (44.00s – 45.00s): Warm Living Room Understanding ("汪。" -> "嗯，我知道。")
    // ------------------------------------------------------------------------
    else if (t < 45.00) {
      drawFoyerSet(ctx, t, 'night');
      paint(ctx, ellPts(640, 420, 440, 290, 24), { wash: '#F59E0B', washOp: 40, ink: null });

      drawOwnerGirl(ctx, 390, 680, 42, { t, age: 'teen', view: 'side', crying: true, smiling: true });
      drawBionicWhaleGirl(ctx, 770, 685, 40, {
        t,
        view: 'side',
        flip: true,
        emotion: 'happy',
        tears: true,
        lowBattery: true
      });

      drawSpeechBubble(ctx, 435, 95, 195, 52, '嗯，我知道。', { tailDir: 'bottom', bg: '#FEF08A', fontSize: 23 });
      drawSpeechBubble(ctx, 560, 520, 110, 48, '汪。', { tailDir: 'right', fontSize: 24 });

      drawTopBionicHUD(ctx, t, { day: 4380, battery: 2 });
    }

    // ------------------------------------------------------------------------
    // SHOT 28 (45.00s – 46.70s): Final Iris Reflection (`输出方式 已切换：望着你`)
    // ------------------------------------------------------------------------
    else {
      const fadeP = seg(t, 45.60, 46.65);
      pxRect(ctx, 0, 36, W, H - 36, '#080B12');

      // Giant Bionic Eye Iris centered at (640, 390) reflecting both Owner & WhaleGirl!
      paint(ctx, ellPts(640, 390, 390, 315, 32), { wash: '#D9A066', ink: '#1E140C', sw: 6 });
      paint(ctx, ellPts(640, 390, 235, 225, 28), { wash: '#27201C', ink: '#090D16', sw: 8 });
      paint(ctx, ellPts(640, 390, 175, 170, 24), { wash: '#0F172A', ink: '#38BDF8', sw: 3 });

      // White catchlight in upper-left of pupil
      paint(ctx, ellPts(535, 305, 44, 38, 16), { wash: '#FFFFFF', ink: null });
      paint(ctx, ellPts(505, 365, 16, 16, 12), { wash: '#FFFFFF', ink: null });

      // Reflection inside the pupil: Smiling Owner + Bionic WhaleGirl together!
      ctx.save();
      ctx.beginPath();
      ctx.arc(640, 390, 168, 0, TAU);
      ctx.clip();
      drawOwnerGirl(ctx, 595, 555, 22, { t, age: 'teen', view: 'front', smiling: true, noShadow: true });
      drawBionicWhaleGirl(ctx, 695, 565, 20, { t, view: 'front', emotion: 'happy', collarCyan: true });
      ctx.restore();

      // Top-Right System Notification: `输出方式 已切换：望 -> 望着你`
      drawPixelBox(ctx, 780, 92, 345, 118, '#0D1326', '#64748B', '#1E293B');
      ctx.save();
      ctx.font = 'bold 18px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
      ctx.fillStyle = '#94A3B8';
      ctx.fillText('输出方式 已切换', 808, 124);
      ctx.font = 'bold 48px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
      ctx.fillStyle = '#F8FAFC';
      ctx.fillText(t < 45.45 ? '望' : '望着你', 808, 180);
      ctx.restore();

      // Halftone / darkness fade as battery reaches 1% -> 0%
      if (fadeP > 0) {
        ctx.fillStyle = `rgba(5, 8, 15, ${clamp(fadeP * 0.88, 0, 0.88).toFixed(3)})`;
        ctx.fillRect(0, 36, W, H - 36);
      }

      drawTopBionicHUD(ctx, t, { day: 4380, battery: t < 46.1 ? 2 : 1 });
    }

    // ========================================================================
    // Bottom RPG Subtitle Bar (Synced 1:1 with `每天每天的抖音 - 抖音_6.mp4`)
    // ========================================================================
    if (hasSubtitleBoxAt(t)) {
      const sbX = 365, sbY = 646, sbW = 550, sbH = 56;
      drawPixelBox(ctx, sbX, sbY, sbW, sbH, '#0B1020', '#64748B', '#1E293B');

      const sub = getSubtitleAt(t);
      if (sub && sub.zh) {
        const pop = backOut(seg(t, sub.t0, sub.t0 + 0.18));
        ctx.save();
        ctx.translate(640, sbY + sbH * 0.5);
        ctx.scale(0.92 + 0.08 * pop, 0.92 + 0.08 * pop);
        ctx.font = 'bold 26px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#020617';
        ctx.fillText(sub.zh, 2, 2);
        ctx.fillStyle = '#F8FAFC';
        ctx.fillText(sub.zh, 0, 0);
        ctx.restore();
      }
    }

    ctx.restore();
  }

  const MV_DOUYIN_6 = {
    DURATION: DURATION_MV6,
    SUBTITLES: SUBTITLES_MV6,
    renderDouyin6Frame,
    drawBionicWhaleGirl,
    drawOwnerGirl
  };

  root.MV_DOUYIN_6 = MV_DOUYIN_6;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = MV_DOUYIN_6;
  }
})(typeof window !== 'undefined' ? window : globalThis);
