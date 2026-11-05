// src/cast.js — Full Cast Rigs & ClaudeAnimationBase/PDoomVideo Model Sheet Renderers (16-Bit Pixel-Art Edition)
// Includes:
//   1. `whaleGirl`        (DeepSeek Whale Maid Girl — 5 views, 31 emotions, 16+ hats)
//   2. `ladyClaude`       (Lady Claude 大小姐 — golden twin-drill ringlets, black velvet bow, crimson Victorian gown, folding fan)
//   3. `clawd`            (ClaudeAnimationBase 4-legged terracotta mascot)
//   4. `researcher`       (Human Researcher — lab coat, glasses, key handover, beach vacation mode, time-lapse wizard beard!)
//   5. `agentReachBot`    (Agent-Reach Octopus Search Drone)
//   6. `bionicPuppy`      (Mechanical Companion Puppy)
//   7. `miniWhale`        (DeepSeek Mini Blue Whale)
//   8. `biliTvMascot`     (Retro Pixel TV Mascot)
// Plus model sheet renderers (`renderEmotionsSheet`, `renderViewsSheet`, `renderStylesSheet`, `renderAllCastSheet`).

(function (root) {
  const CORE = root.CORE || (typeof require !== 'undefined' ? require('./core.js') : {});
  const WHALE = root.WHALE_GIRL || (typeof require !== 'undefined' ? require('./whale_girl.js') : {});
  const CLAWD = root.CLAWD || (typeof require !== 'undefined' ? require('./clawd.js') : {});

  const {
    W, H, PAL, clamp, boilSeed, pulse, mixCol,
    ellPts, setActiveStyle, paint, inkLine, letter
  } = CORE;
  const { whaleGirl, EMO, feel, move } = WHALE;
  const { clawd } = CLAWD;

  const RIG = root.WHALE_GIRL_PIXEL_RIG || (typeof require !== 'undefined' ? require('./whale_girl_rig_data.js') : null);

  function drawCastPixelRuns(ctx, runs, cell) {
    if (!RIG || !runs) return;
    const pal = RIG.palette;
    for (let i = 0; i < runs.length; i++) {
      const [gy, gx1, gx2, cIdx] = runs[i];
      ctx.fillStyle = pal[cIdx];
      ctx.fillRect((gx1 - 0.5) * cell, (gy - 0.5) * cell, (gx2 - gx1 + 1) * cell + 0.35, cell + 0.35);
    }
  }

  // ---------- 2. Lady Claude (隔壁的 Claude 大小姐 — 104x102 16-Bit Chibi Victorian Ojou-sama) ----------
  function ladyClaude(ctx, x, y, u = 19, o = {}) {
    boilSeed('ladyClaude' + Math.round(x));
    const t = o.t || 0;
    const dy = (o.dy ?? -0.10 * pulse(t)) * u;
    const cell = u / (RIG ? RIG.scale : 10);

    if (!o.noShadow) {
      paint(ctx, ellPts(x, y + 0.12 * u, 2.5 * u, 0.5 * u, 16), { wash: PAL.ink, washOp: 65, ink: null });
    }

    ctx.save();
    ctx.translate(x, y + dy);
    if (o.flip) ctx.scale(-1, 1);

    if (RIG && RIG.castSprites && RIG.castSprites.ladyClaude) {
      drawCastPixelRuns(ctx, RIG.castSprites.ladyClaude, cell);
    }

    if (o.emote && WHALE.EMOTES && WHALE.EMOTES[o.emote]) {
      WHALE.EMOTES[o.emote](ctx, 0, -9.0 * u, u, o.emoteK ?? 1, t);
    }

    ctx.restore();
  }

  // ---------- 3. Lady Gemini (Gemini 大小姐 — 104x102 16-Bit Chibi Twin-Star Celestial Ojou-sama) ----------
  function ladyGemini(ctx, x, y, u = 19, o = {}) {
    boilSeed('ladyGemini' + Math.round(x));
    const t = o.t || 0;
    const dy = (o.dy ?? -0.10 * pulse(t)) * u;
    const sq = clamp(o.sq || 0, -0.35, 0.35);
    const cell = u / (RIG ? RIG.scale : 10);

    if (!o.noShadow) {
      paint(ctx, ellPts(x, y + 0.12 * u, 2.5 * u, 0.5 * u, 16), { wash: PAL.ink, washOp: 65, ink: null });
    }

    ctx.save();
    ctx.translate(x, y + dy);
    if (o.rot) ctx.rotate(o.rot);
    if (o.flip) ctx.scale(-1, 1);
    ctx.scale(1 + sq * 0.5, 1 - sq * 0.6);

    if (RIG && RIG.castSprites && RIG.castSprites.ladyGemini) {
      drawCastPixelRuns(ctx, RIG.castSprites.ladyGemini, cell);
    }

    if (o.emote && WHALE.EMOTES && WHALE.EMOTES[o.emote]) {
      WHALE.EMOTES[o.emote](ctx, 0, -9.2 * u, u, o.emoteK ?? 1, t);
    }

    ctx.restore();
  }

  // ---------- 4. Human Researcher (人类研究员 — 104x102 16-Bit Chibi Scientist / Beach Vacation / Beard) ----------
  function researcher(ctx, x, y, u = 15, o = {}) {
    boilSeed('researcher' + Math.round(x));
    const t = o.t || 0;
    const dy = (o.dy || 0) * u;
    const sq = clamp(o.sq || 0, -0.35, 0.35);
    const cell = u / (RIG ? RIG.scale : 10);

    if (!o.noShadow) {
      paint(ctx, ellPts(x, y + 0.12 * u, 2.1 * u, 0.45 * u, 14), { wash: PAL.ink, washOp: 65, ink: null });
    }

    ctx.save();
    ctx.translate(x, y + dy);
    if (o.flip) ctx.scale(-1, 1);
    ctx.scale(1 - sq * 0.5, 1 + sq * 0.7);

    const px = (gx, gy, gw, gh, col) => {
      ctx.fillStyle = col;
      ctx.fillRect((gx - 0.5) * cell, (gy - 0.5) * cell, gw * cell + 0.35, gh * cell + 0.35);
    };

    if (RIG && RIG.castSprites) {
      const spriteKey = o.vacation ? 'researcherVacation' : 'researcher';
      drawCastPixelRuns(ctx, RIG.castSprites[spriteKey], cell);
    }

    // Time-Lapse Long White Wizard Beard Gag (`o.beardLen` 0..1 during Shot 3.3 Deep Thinking!)
    if (!o.back && o.beardLen && o.beardLen > 0.05) {
      const bh = Math.round(36 * o.beardLen);
      for (let ry = 0; ry < bh; ry++) {
        const hw = Math.max(2, Math.round(10 * (1 - ry / (bh + 8))));
        px(-hw - 1, -50 + ry, hw * 2 + 2, 1, '#161F3A');
        px(-hw, -50 + ry, hw * 2, 1, ry % 3 === 0 ? '#E2E8F0' : '#F8FAFC');
      }
    }

    if (o.emote && WHALE.EMOTES && WHALE.EMOTES[o.emote]) {
      WHALE.EMOTES[o.emote](ctx, 0, -8.6 * u, u, o.emoteK ?? 1, t);
    }

    ctx.restore();
  }

  // ---------- 5. Agent-Reach Bot (全网检索章鱼小机器人 — 16-Bit Pixel Drone) ----------
  function agentReachBot(ctx, x, y, u = 13, o = {}) {
    boilSeed('agentBot' + Math.round(x));
    const t = o.t || 0;
    const bob = Math.sin(t * 5) * 0.35 * u;
    const cell = u / 10;
    ctx.save();
    ctx.translate(x, y + bob);
    const px = (gx, gy, gw, gh, col) => {
      ctx.fillStyle = col;
      ctx.fillRect((gx - 0.5) * cell, (gy - 0.5) * cell, gw * cell + 0.35, gh * cell + 0.35);
    };
    const INK = '#141A2E';
    // 4 pixel mechanical tentacles
    for (const i of [-12, -4, 4, 12]) {
      const sw = Math.round(Math.sin(t * 7 + i) * 2);
      px(i - 2, 4, 4, 6, INK);
      px(i - 1, 5, 2, 5, '#38BDF8');
      px(i - 2 + sw, 10, 4, 6, INK);
      px(i - 1 + sw, 10, 2, 5, '#72E2F7');
    }
    // Radar antenna
    px(-1, -24, 3, 9, INK);
    px(-3, -27, 7, 5, INK);
    px(-2, -26, 5, 3, '#FACC15');
    // Armored Navy & Cyan Drone Dome
    px(-16, -15, 33, 20, INK);
    px(-15, -14, 31, 18, '#1E293B');
    px(-13, -13, 27, 5, '#334155');
    px(-15, -4, 31, 4, '#0284C7');
    // Glowing Visor Eye
    px(-9, -9, 19, 8, INK);
    px(-8, -8, 17, 6, '#38BDF8');
    px(-5, -7, 11, 4, '#E0F2FE');
    px(-2, -6, 5, 3, INK);
    ctx.restore();
  }

  // ---------- 6. Bionic Companion Puppy (机械小狗 — 16-Bit Pixel Shiba Robot) ----------
  function bionicPuppy(ctx, x, y, u = 13, o = {}) {
    boilSeed('puppy' + Math.round(x));
    const t = o.t || 0;
    const bounce = Math.abs(Math.sin(t * 6)) * 0.28 * u;
    const cell = u / 10;
    ctx.save();
    ctx.translate(x, y - bounce);
    if (o.flip) ctx.scale(-1, 1);
    const px = (gx, gy, gw, gh, col) => {
      ctx.fillStyle = col;
      ctx.fillRect((gx - 0.5) * cell, (gy - 0.5) * cell, gw * cell + 0.35, gh * cell + 0.35);
    };
    const INK = '#141A2E';
    // 4 pixel legs
    for (const lx of [-11, -4, 4, 10]) {
      px(lx - 1, -8, 4, 8, INK);
      px(lx, -7, 2, 6, '#D97706');
    }
    // Wagging pixel tail
    const tw = Math.round(Math.sin(t * 14) * 2);
    px(13, -23 + tw, 6, 6, INK);
    px(14, -22 + tw, 4, 4, '#F59E0B');
    // Body
    px(-13, -21, 27, 14, INK);
    px(-12, -20, 25, 12, '#F59E0B');
    px(-10, -19, 21, 3, '#FDE047');
    px(-8, -12, 16, 4, '#FEF3C7');
    // Head & Ears
    px(-20, -33, 19, 17, INK);
    px(-19, -32, 17, 15, '#FBBF24');
    px(-18, -24, 10, 6, '#FEF3C7');
    // Floppy brown ear & nose/eye
    px(-8, -32, 5, 9, INK);
    px(-7, -31, 3, 7, '#92400E');
    px(-16, -28, 3, 3, INK);
    px(-15, -28, 1, 1, '#FFFFFF');
    px(-21, -24, 3, 3, INK);
    ctx.restore();
  }

  // ---------- 7. Mini Blue Whale (深海小蓝鲸 — 16-Bit Pixel Companion) ----------
  function miniWhale(ctx, x, y, u = 14, o = {}) {
    boilSeed('miniWhale' + Math.round(x));
    const t = o.t || 0;
    const bob = Math.sin(t * 4.5) * 0.35 * u;
    const cell = u / 10;
    ctx.save();
    ctx.translate(x, y + bob);
    if (o.flip) ctx.scale(-1, 1);
    const px = (gx, gy, gw, gh, col) => {
      ctx.fillStyle = col;
      ctx.fillRect((gx - 0.5) * cell, (gy - 0.5) * cell, gw * cell + 0.35, gh * cell + 0.35);
    };
    const INK = '#141A2E';
    // Tail flukes
    px(14, -8, 10, 13, INK);
    px(15, -7, 8, 5, '#0284C7');
    px(15, -1, 7, 5, '#38BDF8');
    // Round Blue Whale Body + White Striped Belly
    px(-17, -12, 33, 22, INK);
    px(-16, -11, 31, 20, '#2563EB');
    px(-14, -10, 27, 6, '#38BDF8');
    px(-10, -9, 16, 3, '#72E2F7');
    px(-15, 2, 26, 7, '#E0F2FE');
    px(-12, 4, 20, 2, '#BAE6FD');
    // Cute sparkling eye & blush
    px(-11, -4, 4, 4, INK);
    px(-10, -3, 2, 2, '#FFFFFF');
    px(-7, 0, 3, 2, '#F472B6');
    // Pixel Water Spout
    px(-4, -20, 3, 8, '#72E2F7');
    px(-9, -23, 5, 3, '#E0F2FE');
    px(0, -23, 5, 3, '#E0F2FE');
    ctx.restore();
  }

  // ---------- 8. Retro Pixel TV Mascot (复古小电视 — 16-Bit Pixel Sprite) ----------
  function biliTvMascot(ctx, x, y, u = 13, o = {}) {
    boilSeed('biliTv' + Math.round(x));
    const t = o.t || 0;
    const dy = -Math.abs(Math.sin(t * 5.5)) * 0.25 * u;
    const cell = u / 10;
    ctx.save();
    ctx.translate(x, y + dy);
    const px = (gx, gy, gw, gh, col) => {
      ctx.fillStyle = col;
      ctx.fillRect((gx - 0.5) * cell, (gy - 0.5) * cell, gw * cell + 0.35, gh * cell + 0.35);
    };
    const INK = '#141A2E';
    // Antennas
    px(-9, -33, 3, 7, INK); px(-11, -35, 3, 3, INK);
    px(7, -33, 3, 7, INK); px(9, -35, 3, 3, INK);
    // TV Box
    px(-16, -26, 33, 24, INK);
    px(-15, -25, 31, 22, '#38BDF8');
    px(-14, -24, 29, 3, '#7DD3FC');
    // White Screen
    px(-12, -21, 25, 15, INK);
    px(-11, -20, 23, 13, '#FFFFFF');
    // Cute `^ ^` eyes & `ω` mouth
    px(-9, -15, 2, 2, INK); px(-7, -17, 2, 2, INK); px(-5, -15, 2, 2, INK);
    px(4, -15, 2, 2, INK); px(6, -17, 2, 2, INK); px(8, -15, 2, 2, INK);
    px(-3, -11, 7, 2, INK);
    px(-10, -12, 3, 2, '#FDA4AF');
    px(8, -12, 3, 2, '#FDA4AF');
    ctx.restore();
  }

  // ============================================================================
  // Model Sheet Renderers (Exact counterpart to ClaudeAnimationBase/src/sheets.js!)
  // ============================================================================
  function drawPaperSheetBg(ctx, style = 'watercolor') {
    setActiveStyle(style);
    ctx.save();
    if (style === 'pixel') {
      ctx.fillStyle = '#0B1D42';
      ctx.fillRect(0, 0, W, H);
    } else if (style === 'neon') {
      ctx.fillStyle = '#070B1E';
      ctx.fillRect(0, 0, W, H);
    } else {
      ctx.fillStyle = PAL.paper;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
    CORE.applyMediumOverlay(ctx, style);
  }

  function sheetFloor(ctx, y, x0 = 36, x1 = W - 36, style = 'watercolor') {
    const col = (style === 'pixel' || style === 'neon') ? '#3B82F6' : mixCol(PAL.paper, PAL.ink, 0.38);
    inkLine(ctx, [[x0, y + 3], [W / 2, y + 1], [x1, y + 4]], 0.75, col, 'inkfine', 0.4);
  }

  function sheetLabel(ctx, txt, x, y, size = 14, style = 'watercolor') {
    const isDark = style === 'pixel' || style === 'neon';
    ctx.save();
    ctx.fillStyle = isDark ? '#BAE6FD' : PAL.ink;
    ctx.globalAlpha = 0.86;
    ctx.font = `bold ${size}px "Silkscreen", "ZCOOLKuaiLe", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(txt.toUpperCase(), x, y);
    ctx.restore();
  }

  // 1. All 31 Acted Emotions Sheet (`whale_emotions` -> `docs/emotions.png`)
  function renderEmotionsSheet(ctx, t = 1.2, style = 'watercolor') {
    drawPaperSheetBg(ctx, style);
    const names = Object.keys(EMO); // All 31 emotions!
    const cols = 8, cw = W / cols, ch = H / 4;
    names.forEach((name, i) => {
      const cx = cw * (i % cols) + cw / 2;
      const gy = ch * Math.floor(i / cols) + ch - 36;
      whaleGirl(ctx, cx, gy, 11.2, { ...feel(name, t, { seed: i }), talking: false });
      sheetLabel(ctx, name, cx, gy + 22, 13, style);
    });
    for (let r = 0; r < 4; r++) {
      sheetFloor(ctx, ch * (r + 1) - 36, 28, W - 28, style);
    }
  }

  // 2. 5 Key Views + 16 Hats & Props Sheet (`whale_views` -> `docs/views.png`)
  function renderViewsSheet(ctx, t = 1.2, style = 'watercolor') {
    drawPaperSheetBg(ctx, style);
    // Row 1: 5 Key Views (`front`, `q`, `side`, `qback`, `back`) + `tailSit` + `heartHands` + `smear`
    const row1 = [
      ['front', { view: 'front' }],
      ['3/4 (q)', { view: 'q' }],
      ['side', { view: 'side' }],
      ['3/4 back', { view: 'qback' }],
      ['back', { view: 'back' }],
      ['tail-sit', { tailSit: true, hat: 'wizard', eyes: 'spark' }],
      ['heart-hands', { heartHands: true, eyes: 'heart', blush: true }],
      ['run smear', { view: 'side', smear: 0.72, walk: 0.36, rot: 0.08, eyes: 'spark' }]
    ];
    const cw = W / 8;
    row1.forEach(([lbl, opts], i) => {
      const cx = cw * i + cw / 2, gy = 215;
      whaleGirl(ctx, cx, gy, 13.5, { ...opts, t });
      sheetLabel(ctx, lbl, cx, gy + 26, 13, style);
    });
    sheetFloor(ctx, 215, 28, W - 28, style);

    // Rows 2 & 3: 12 Hats & Costumes + 3 Cast Companions
    const row2 = ['maid', 'crown', 'wizard', 'hard', 'sweatband', 'diving', 'headphones', 'party'];
    row2.forEach((hat, i) => {
      const cx = cw * i + cw / 2, gy = 450;
      whaleGirl(ctx, cx, gy, 12.5, { hat, eyes: i % 2 ? 'happy' : 'open', t });
      sheetLabel(ctx, 'hat: ' + hat, cx, gy + 24, 12, style);
    });
    sheetFloor(ctx, 450, 28, W - 28, style);

    const row3 = ['halo', 'top', 'fedora', 'flower', 'cat'];
    row3.forEach((hat, i) => {
      const cx = cw * i + cw / 2, gy = 675;
      whaleGirl(ctx, cx, gy, 12.2, { hat, eyes: 'wink', t });
      sheetLabel(ctx, 'hat: ' + hat, cx, gy + 24, 12, style);
    });
    // Plus 3 companions on right of Row 3 (Clawd, Lady Claude, and Gemini 大小姐!)
    clawd(ctx, cw * 5.5, 675, 11.5, { hat: 'crown', eyes: 'star', t });
    sheetLabel(ctx, 'clawd', cw * 5.5, 699, 12, style);
    ladyClaude(ctx, cw * 6.5, 675, 12.2, { hasFan: true, t });
    sheetLabel(ctx, 'lady claude', cw * 6.5, 699, 12, style);
    ladyGemini(ctx, cw * 7.5, 675, 12.2, { t });
    sheetLabel(ctx, 'gemini 大小姐', cw * 7.5, 699, 12, style);
    sheetFloor(ctx, 675, 28, W - 28, style);
  }

  // 3. 6 Visual Styles Comparison Sheet (`whale_styles`)
  function renderStylesSheet(ctx, t = 1.2) {
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, W, H);
    const styles = [
      ['pixel', '16-BIT PIXEL ART', '#0E224D'],
      ['watercolor', 'PDOOM WATERCOLOR', '#F5EFE4'],
      ['ukiyoe', 'UKIYO-E WOODBLOCK', '#EFE2C6'],
      ['risograph', 'RISOGRAPH PRINT', '#F8F1E5'],
      ['neon', 'CYBERPUNK NEON', '#090D24'],
      ['watercolor', 'ROYAL CROWN MODE', '#1E293B']
    ];
    const cols = 3, cw = W / 3, ch = H / 2;
    styles.forEach(([st, title, bg], i) => {
      const x0 = (i % cols) * cw, y0 = Math.floor(i / cols) * ch;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x0 + 8, y0 + 8, cw - 16, ch - 16);
      ctx.clip();
      ctx.fillStyle = bg;
      ctx.fillRect(x0, y0, cw, ch);
      setActiveStyle(st);
      whaleGirl(ctx, x0 + cw / 2, y0 + ch - 58, 22, {
        ...feel(i === 5 ? 'starstruck' : 'excited', t, { seed: i }),
        hat: i === 5 ? 'crown' : 'maid',
        t
      });
      sheetLabel(ctx, title, x0 + cw / 2, y0 + ch - 24, 16, st === 'watercolor' || st === 'ukiyoe' || st === 'risograph' ? 'watercolor' : 'pixel');
      ctx.restore();
    });
  }

  // 4. All 8 Cast Members Sheet (`all_cast`)
  function renderAllCastSheet(ctx, t = 1.2, style = 'watercolor') {
    drawPaperSheetBg(ctx, style);
    letter(ctx, '深海鲸鱼娘 DeepSeek · 全员 8 角色设定集 (PDoomVideo Rig)', W / 2, 48, 32, style === 'pixel' ? PAL.gold : PAL.whaleNavy, {
      stroke: style === 'pixel' ? PAL.ink : false, ink: false
    });

    const castList = [
      ['深海鲸鱼娘 DeepSeek', (cx, gy) => whaleGirl(ctx, cx, gy, 18, { ...feel('excited', t), emote: 'spout', t })],
      ['隔壁 Claude 大小姐', (cx, gy) => ladyClaude(ctx, cx, gy, 18, { hasFan: true, t })],
      ['双子星 Gemini 大小姐', (cx, gy) => ladyGemini(ctx, cx, gy, 18, { emote: 'spark', t })],
      ['Clawd 吉祥物', (cx, gy) => clawd(ctx, cx, gy, 16, { ...move('bounce', t), hat: 'party', eyes: 'star', t })],
      ['人类研究员 (海滩度假)', (cx, gy) => researcher(ctx, cx, gy, 17, { vacation: true, t })],
      ['Agent-Reach 检索机', (cx, gy) => agentReachBot(ctx, cx, gy - 45, 18, { t })],
      ['深海小蓝鲸', (cx, gy) => miniWhale(ctx, cx, gy - 40, 18, { t })],
      ['复古小电视 & 机械狗', (cx, gy) => { biliTvMascot(ctx, cx - 48, gy, 15, { t }); bionicPuppy(ctx, cx + 48, gy, 15, { t }); }]
    ];

    const cols = 4, cw = W / 4, ch = (H - 80) / 2;
    castList.forEach(([title, drawFn], i) => {
      const cx = (i % cols) * cw + cw / 2;
      const gy = 80 + Math.floor(i / cols) * ch + ch - 48;
      drawFn(cx, gy);
      sheetLabel(ctx, title, cx, gy + 26, 15, style);
    });
    sheetFloor(ctx, 80 + ch - 48, 36, W - 36, style);
    sheetFloor(ctx, 80 + ch * 2 - 48, 36, W - 36, style);
  }

  function renderCharacterSheet(ctx, t = 1.2, mode = 'all_cast', style = 'watercolor') {
    if (mode === 'whale_emotions' || mode === 'emotions') {
      renderEmotionsSheet(ctx, t, style);
    } else if (mode === 'whale_views' || mode === 'views' || mode === 'whale_poses') {
      renderViewsSheet(ctx, t, style);
    } else if (mode === 'whale_styles' || mode === 'styles') {
      renderStylesSheet(ctx, t);
    } else {
      renderAllCastSheet(ctx, t, style);
    }
  }

  const CAST = {
    whaleGirl,
    clawd,
    ladyClaude,
    ladyGemini,
    geminiLady: ladyGemini,
    researcher,
    humanResearcher: researcher,
    agentReachBot,
    bionicPuppy,
    miniWhale,
    biliTvMascot,
    renderEmotionsSheet,
    renderViewsSheet,
    renderStylesSheet,
    renderAllCastSheet,
    renderCharacterSheet
  };

  root.CAST = CAST;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CAST;
  }
})(typeof window !== 'undefined' ? window : globalThis);
