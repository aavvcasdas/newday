// ============================================================================
// src/mv_pack_short.js — 5 Short MVs Replicated from `mv/`
// Upgraded to the `mv_ba_huiyi_pinhao_gei_ni` 28-Set Non-Repeating Architecture
// + 28 `codex-deepseek-pet` & `dsh-dayu-fish-skin` Character Actions + `drawFatFish`
// + 100% Frame-Verified Karaoke Subtitles on Every MV (including `lianai_ing`!)
// ============================================================================

(function (root) {
  const CORE = root.CORE || (typeof require !== 'undefined' ? require('./core.js') : {});
  const WHALE = root.WHALE_GIRL || (typeof require !== 'undefined' ? require('./whale_girl.js') : {});
  const CAST = root.CAST || (typeof require !== 'undefined' ? require('./cast.js') : {});
  const BAHUIYI = root.MV_BA_HUIYI || (typeof require !== 'undefined' ? require('./mv_ba_huiyi_pinhao_gei_ni.js') : {});

  const {
    W = 1280,
    H = 720,
    clamp,
    lerp,
    seg,
    ease,
    easeIn,
    backOut,
    rrPts,
    ellPts,
    rectPts,
    paint,
    iris
  } = CORE;

  function findActiveSub(subs, t) {
    for (let i = 0; i < subs.length; i++) {
      if (t >= subs[i].t0 && t <= subs[i].t1) return { sub: subs[i], idx: i };
    }
    if (t < subs[0].t0) return { sub: subs[0], idx: 0 };
    return { sub: subs[subs.length - 1], idx: subs.length - 1 };
  }

  // ==========================================================================
  // High-Contrast Bottom Karaoke Subtitle Pill + Ransom-Note Tile Cards
  // ==========================================================================
  function drawBottomKaraokeBar(ctx, titleTag, shotIdx, totalShots, zh, sub2, t, t0, t1, accent = '#38BDF8') {
    const lt = clamp(t - t0, 0, t1 - t0);
    const dur = Math.max(0.15, t1 - t0);
    const prog = clamp(lt / dur, 0, 1);
    const popY = lt < 0.15 ? (1 - backOut(lt / 0.15)) * 10 : 0;

    const actList = WHALE.ACTION_LIST || [];
    const actItem = actList.length ? actList[shotIdx % actList.length] : { zh: '鲸鱼动作' };

    // Top-left MV Chapter & Action HUD Badge
    ctx.save();
    paint(ctx, rrPts(24, 18, 460, 38, 12), { fill: '#090D1E', fillOp: 210, ink: accent, sw: 1.8 });
    ctx.font = 'bold 15px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
    ctx.fillStyle = '#E0F2FE';
    ctx.textAlign = 'left';
    ctx.fillText(`${titleTag} · SHOT ${String(shotIdx + 1).padStart(2, '0')}/${String(totalShots).padStart(2, '0')} [${actItem.zh}]`, 40, 42);
    ctx.restore();

    if (!zh) return;

    ctx.save();
    ctx.translate(0, popY);
    paint(ctx, rrPts(140, H - 104, W - 280, 82, 20), {
      fill: '#090D1E', fillOp: 222, ink: accent, sw: 2.4
    });

    const fontSz = zh.length > 18 ? 26 : 31;
    ctx.font = `bold ${fontSz}px "ZCOOLKuaiLe", "NotoSansSC", sans-serif`;
    ctx.textAlign = 'center';
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#090D1E';
    ctx.strokeText(zh, W / 2, H - 62);
    ctx.fillStyle = '#F8FAFC';
    ctx.fillText(zh, W / 2, H - 62);

    const textW = ctx.measureText(zh).width;
    ctx.save();
    ctx.beginPath();
    ctx.rect(W / 2 - textW / 2, H - 98, textW * prog, 48);
    ctx.clip();
    ctx.fillStyle = '#FDE047';
    ctx.fillText(zh, W / 2, H - 62);
    ctx.restore();

    ctx.font = 'bold 13px "Silkscreen", "NotoSansSC", monospace';
    ctx.fillStyle = '#93C5FD';
    ctx.fillText(sub2 || `ACTION: ${actItem.id || 'whale_girl'} · DEEPSEEK WHALE STUDIO`, W / 2, H - 35);
    ctx.restore();
  }

  function drawTileCardsOverlay(ctx, text, t, t0, t1, opts = {}) {
    if (!text) return;
    const lt = clamp(t - t0, 0, t1 - t0);
    const dur = Math.max(0.2, t1 - t0);
    const chars = Array.from(text).filter((c) => c !== ' ');
    const activeCount = Math.ceil(clamp(lt / (dur * 0.75), 0.15, 1) * chars.length);
    const cardW = opts.cardW || 36;
    const cardH = opts.cardH || 40;
    const gap = 4;
    const totalW = chars.length * (cardW + gap) - gap;
    const startX = (opts.cx || W / 2) - totalW / 2;
    const baseY = opts.y || 92;

    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.76)';
    ctx.beginPath();
    ctx.roundRect(startX - 14, baseY - cardH / 2 - 8, totalW + 28, cardH + 16, 12);
    ctx.fill();

    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      const cx = startX + i * (cardW + gap);
      const cy = baseY + Math.sin(i * 1.5 + t * 3) * 2.0;
      const isHighlight = (opts.highlight && opts.highlight.includes(ch)) || i < activeCount;

      ctx.fillStyle = isHighlight ? '#FB923C' : '#FFFBEB';
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.roundRect(cx, cy - cardH / 2, cardW, cardH, 6);
      ctx.fill();
      ctx.stroke();

      ctx.font = `bold ${Math.round(cardW * 0.66)}px "ZCOOLKuaiLe", "NotoSansSC", sans-serif`;
      ctx.fillStyle = isHighlight ? '#FFFFFF' : '#0F172A';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ch, cx + cardW / 2, cy + 1);
    }
    ctx.restore();
  }

  // ==========================================================================
  // 1. `ba_huiyi_56` — Replicating `mv/《把回忆拼好给你》.mp4` (56.03s)
  // Completely rebuilt on `mv_ba_huiyi_pinhao_gei_ni` 28-Set Non-Repeating Engine!
  // ==========================================================================
  const SUBS_BA_HUIYI_56 = [
    { t0: 0.0,  t1: 3.5,  zh: '我们都是天真 真实存在的',         hi: '真实', sub2: 'WE WERE BOTH SO INNOCENT AND TRULY ALIVE',         setKey: 'beachNight',       action: 'eat_white_rice' },
    { t0: 3.5,  t1: 6.2,  zh: '祈愿小世界里不只有我',           hi: '世界', sub2: 'PRAYING I AM NOT ALONE IN THIS LITTLE WORLD',      setKey: 'observatory',      action: 'ciallo_wink' },
    { t0: 6.2,  t1: 8.7,  zh: '直到遇见你 我以为就光明起来',     hi: '光明', sub2: 'UNTIL I MET YOU AND BELIEVED THE LIGHT HAD COME',  setKey: 'dawnHill',         action: 'jump_joy' },
    { t0: 8.7,  t1: 11.8, zh: '眼睛里看到的都是 广袤无垠的大海', hi: '大海', sub2: 'ALL MY EYES COULD SEE WAS THE BOUNDLESS OCEAN',    setKey: 'sunflowerCoast',   action: 'camera_shutter' },
    { t0: 11.8, t1: 14.5, zh: '有你在的日子里不可能被击败',     hi: '你在', sub2: 'WITH YOU BY MY SIDE NOTHING COULD DEFEAT ME',      setKey: 'deepseekLab',      action: 'confident_hips' },
    { t0: 14.5, t1: 16.2, zh: '在最难熬的日子你陪着我 拨开阴霾', hi: '陪着', sub2: 'YOU STAYED WITH ME AND PARTED THE DARK CLOUDS',   setKey: 'rainBusStop',      action: 'umbrella_stroll' },
    { t0: 16.2, t1: 18.0, zh: '将快乐全部留下来',               hi: '快乐', sub2: 'KEEPING EVERY SINGLE PIECE OF JOY BEHIND',        setKey: 'greenhouse',       action: 'coin_hug' },
    { t0: 18.0, t1: 20.0, zh: '将不开心全都抛开',               hi: '抛开', sub2: 'THROWING ALL THE UNHAPPINESS FAR AWAY',           setKey: 'emeraldWindmill',  action: 'playful_fists' },
    { t0: 20.0, t1: 22.6, zh: '你对我说的情话',                 hi: '情话', sub2: 'ALL THE SWEET WORDS OF LOVE YOU WHISPERED',       setKey: 'veniceBridge',     action: 'shy_fidget' },
    { t0: 22.6, t1: 25.5, zh: '像转瞬即逝的烟花',               hi: '烟花', sub2: 'LIKE FLEETING FIREWORKS IN THE NIGHT SKY',        setKey: 'rooftopFireworks', action: 'sparkler_firework' },
    { t0: 25.5, t1: 28.3, zh: '只停在绚烂的一刹那',             hi: '绚烂', sub2: 'LINGERING ONLY FOR ONE DAZZLING INSTANT',         setKey: 'fireflyForest',    action: 'peek_curious' },
    { t0: 28.3, t1: 31.2, zh: '我却已无法自拔',                 hi: '无法', sub2: 'YET I HAD FALLEN TOO DEEPLY TO PULL AWAY',        setKey: 'coralAbyss',       action: 'drag_ahoge' },
    { t0: 31.2, t1: 32.7, zh: '我们的爱总有时差',               hi: '时差', sub2: 'THERE WAS ALWAYS A TIME LAG BETWEEN OUR LOVE',    setKey: 'clocktower',       action: 'token_wordle_sneak' },
    { t0: 32.7, t1: 34.1, zh: '也为你骗自己放下',               hi: '放下', sub2: 'LYING TO MYSELF THAT I LET GO FOR YOUR SAKE',     setKey: 'autumnGinkgo',     action: 'cry_fountain' },
    { t0: 34.1, t1: 36.9, zh: '爱炙热的你 却忘了爱自己',         hi: '爱自己', sub2: 'LOVING BLAZING YOU YET FORGETTING MYSELF',       setKey: 'crimsonMaple',     action: 'rose_bouquet' },
    { t0: 36.9, t1: 39.8, zh: '把回忆拼好给你',                 hi: '回忆', sub2: 'PIECING EVERY MEMORY BACK TOGETHER FOR YOU',      setKey: 'cosmicGalaxy',     action: 'idol_mic_sing' },
    { t0: 39.8, t1: 43.9, zh: '我们之间的回忆 全部都小心地收集', hi: '收集', sub2: 'ALL OUR MEMORIES CAREFULLY GATHERED AND KEPT',    setKey: 'stampStudy',       action: 'eat_onigiri' },
    { t0: 43.9, t1: 48.0, zh: '我总是偷偷地哭泣 像倦鸟失了归期', hi: '归期', sub2: 'CRYING IN SECRET LIKE A WEARY BIRD LOST',         setKey: 'sunsetStation',    action: 'sleep_curl' },
    { t0: 48.0, t1: 52.0, zh: '但愿我相信的爱情 结局紧握在我手心', hi: '手心', sub2: 'HOLDING THE ENDING OF LOVE IN MY PALM',         setKey: 'auroraHarbor',     action: 'fatfish_transform' },
    { t0: 52.0, t1: 56.03, zh: '时光匆匆却没有遗失过去 · 把回忆拼好给你', hi: '过去', sub2: 'TIME RUSHES BY YET NEVER LOST OUR PAST',  setKey: 'beachDawn',        action: 'tail_wag_dance' }
  ];

  function renderBaHuiyi56Frame(ctx, t) {
    ctx.save();
    ctx.clearRect(0, 0, W, H);
    const { sub, idx } = findActiveSub(SUBS_BA_HUIYI_56, t);
    const lt = clamp(t - sub.t0, 0, sub.t1 - sub.t0);
    const dur = Math.max(0.2, sub.t1 - sub.t0);

    // 1. Render Full Non-Repeating Multi-Set Benchmark Scene (`MV_BA_HUIYI.renderMasterMVShot`)
    if (BAHUIYI && typeof BAHUIYI.renderMasterMVShot === 'function') {
      BAHUIYI.renderMasterMVShot(ctx, t, {
        shotIdx: idx,
        lt,
        dur,
        setKey: sub.setKey,
        action: sub.action,
        u: 31,
        style: ['watercolor', 'watercolor', 'neon', 'pixel'][idx % 4],
        guest: idx % 2 === 0 ? 'ladyGemini' : 'all'
      });
    }

    // 2. Top Ransom-Note Puzzle Tile Cards + Bottom Karaoke Subtitle Bar
    drawTileCardsOverlay(ctx, sub.zh, t, sub.t0, sub.t1, { y: 92, highlight: sub.hi });
    drawBottomKaraokeBar(ctx, '《把回忆拼好给你》56s版', idx, SUBS_BA_HUIYI_56.length, sub.zh, sub.sub2, t, sub.t0, sub.t1, '#38BDF8');

    if (t > 55.0) {
      const r = lerp(820, 0, easeIn(seg(t, 55.0, 56.0)));
      iris(ctx, 640, 340, r, '#090D1E');
    }
    ctx.restore();
  }

  // ==========================================================================
  // 2. `lianai_ing` — Replicating `mv/发现更多精彩视频 - 抖音搜索_2.mp4` (54.73s)
  // 五月天《恋爱ing》 — 18 Non-Repeating Multi-Set Shots + Terminal/LOVE HUD + Bottom Subtitles!
  // ==========================================================================
  const SUBS_LIANAI_ING = [
    { t0: 0.0,  t1: 3.5,  zh: '帮我运行 恋爱.ing · 正在启动心跳引擎', sub2: '> run love_ing.sh --pid=520 [OK]',         setKey: 'deepseekLab',      action: 'fatfish_working' },
    { t0: 3.5,  t1: 7.0,  zh: '深海鲸鱼娘 × 双子星 恋爱终端已连接',   sub2: 'CONNECTED TO HEARTBEAT SERVER 180 BPM',    setKey: 'concertNeon',      action: 'ciallo_wink' },
    { t0: 7.0,  t1: 9.6,  zh: '陪你熬夜 聊天到爆肝也没关系',         sub2: '03:59 AM · 肝 HP 18% · 陪你聊通宵！',      setKey: 'bionicLiving',     action: 'hum_working_song' },
    { t0: 9.6,  t1: 12.2, zh: '只要有你在 深夜屏幕也闪耀星光',       sub2: 'NIGHT CHAT SESSION · UNLIMITED TOKENS',    setKey: 'observatory',      action: 'token_wordle_sneak' },
    { t0: 12.2, t1: 14.8, zh: '陪你逛街 逛成扁平足也没关系',         sub2: '今日步数 23,240 步 · 奶茶 / 花店 / 甜品',    setKey: 'cyberStreet',      action: 'walk_brisk' },
    { t0: 14.8, t1: 17.2, zh: '走遍霓虹街角 把好吃的白米饭分你一半', sub2: 'WHITE RICE BOWL & BOBA TEA DATE',          setKey: 'riceCafeteria',    action: 'eat_white_rice' },
    { t0: 17.2, t1: 19.3, zh: '超感谢你 让我重生 整个 ORZ',          sub2: 'RESPAWN ✓ +1 LIFE RESTORED BY LOVE',       setKey: 'dawnHill',         action: 'jump_joy' },
    { t0: 19.3, t1: 21.3, zh: '原本灰暗的世界 瞬间充满色彩',         sub2: 'FULL COLOR SPECTRUM UNLOCKED',             setKey: 'greenhouse',       action: 'fatfish_transform' },
    { t0: 21.3, t1: 25.0, zh: '让我重新认识 L - O - V - E !',        sub2: 'L-O-V-E KINETIC OVERDRIVE',                setKey: 'rooftopFireworks', action: 'idol_mic_sing' },
    { t0: 25.0, t1: 29.0, zh: 'L - O - V - E ! 每一个字母都为你跳动', sub2: 'HEARTBEAT RESONANCE 100%',                 setKey: 'cosmicGalaxy',     action: 'tail_wag_dance' },
    { t0: 29.0, t1: 31.2, zh: '恋爱 ING ! HAPPY ING !',              sub2: 'PID 520 · 恋爱.ing · HAPPY 100%',           setKey: 'sunflowerCoast',   action: 'coin_hug' },
    { t0: 31.2, t1: 33.2, zh: '每一秒钟都想和你贴贴抱抱',            sub2: 'HUG & SPARKLE MODE ACTIVE',                setKey: 'veniceBridge',     action: 'shy_fidget' },
    { t0: 33.2, t1: 36.0, zh: '心情就像是 坐上一台喷射机',           sub2: 'JET ENGINE BOOST · MACH 5.20',              setKey: 'sunsetStation',    action: 'run_sprint' },
    { t0: 36.0, t1: 38.8, zh: '冲破云层 飞向最闪亮的星海',           sub2: 'SUPERSONIC CLOUD BREAKTHROUGH',            setKey: 'auroraHarbor',     action: 'wake_stretch' },
    { t0: 38.8, t1: 41.0, zh: '恋爱 ING ! 改变 ING !',               sub2: 'NEON LOVE LASER OVERDRIVE',                 setKey: 'fireflyForest',    action: 'guitar_strum' },
    { t0: 41.0, t1: 43.2, zh: '连呼吸的节奏都变成甜甜的旋律',        sub2: 'MELODY SYNCED TO YOUR SMILE',              setKey: 'lanternTavern',    action: 'eat_onigiri' },
    { t0: 43.2, t1: 46.8, zh: '改变了黄昏 黎明',                     sub2: 'TIME SHIFT: 19:30 DUSK -> 06:00 DAWN',      setKey: 'beachDawn',        action: 'camera_shutter' },
    { t0: 46.8, t1: 51.2, zh: '有你 都心跳到不行',                   sub2: 'HEARTBEAT SYNC: 180 BPM OVERFLOW',          setKey: 'emeraldWindmill',  action: 'confident_hips' },
    { t0: 51.2, t1: 54.73, zh: '恋爱.ing 进程永不停止 · 永远喜欢你！', sub2: '> kill 恋爱.ing ✗ 拒绝访问: 进程永久运行中', setKey: 'beachNight',       action: 'sparkler_firework' }
  ];

  function renderLianaiIngFrame(ctx, t) {
    ctx.save();
    ctx.clearRect(0, 0, W, H);
    const { sub, idx } = findActiveSub(SUBS_LIANAI_ING, t);
    const lt = clamp(t - sub.t0, 0, sub.t1 - sub.t0);
    const dur = Math.max(0.2, sub.t1 - sub.t0);

    // 1. Non-Repeating 28-Set Multi-Environment Stage (`MV_BA_HUIYI.renderMasterMVShot`)
    if (BAHUIYI && typeof BAHUIYI.renderMasterMVShot === 'function') {
      BAHUIYI.renderMasterMVShot(ctx, t, {
        shotIdx: idx + 5,
        lt,
        dur,
        setKey: sub.setKey,
        action: sub.action,
        u: 31,
        style: ['pixel', 'neon', 'watercolor'][idx % 3],
        guest: idx % 2 === 0 ? 'ladyGemini' : 'all'
      });
    }

    // 2. Signature 《恋爱ing》 L-O-V-E Floating Neon Letters & Heartbeat ECG Wave
    ctx.save();
    const letters = ['L', 'O', 'V', 'E'];
    const lcols = ['#FB7185', '#FBBF24', '#34D399', '#38BDF8'];
    for (let i = 0; i < 4; i++) {
      const lx = 380 + i * 175;
      const ly = 115 + Math.sin(t * 6 + i) * 10;
      paint(ctx, rrPts(lx - 34, ly - 34, 68, 68, 14), {
        fill: '#0F172A', fillOp: 195, ink: lcols[i], sw: 2.5
      });
      ctx.font = 'bold 44px "Silkscreen", monospace';
      ctx.fillStyle = lcols[i];
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(letters[i], lx, ly + 2);
    }
    ctx.restore();

    // 3. Prominent Bottom Karaoke Subtitle Bar (Fixes the missing subtitle issue!)
    drawBottomKaraokeBar(ctx, '五月天《恋爱ing》', idx, SUBS_LIANAI_ING.length, sub.zh, sub.sub2, t, sub.t0, sub.t1, '#EC4899');
    ctx.restore();
  }

  // ==========================================================================
  // 3. `jimo_yanhuo` — Replicating `mv/寂寞烟火.mp4` (55.24s)
  // 朱婧汐《寂寞烟火》 — 18 Non-Repeating Multi-Set Shots + Origami Boat + Sparklers + Subtitles
  // ==========================================================================
  const SUBS_JIMO_YANHUO = [
    { t0: 0.0,  t1: 3.3,  zh: '跨越过多少海洋去看你',   setKey: 'beachNight',       action: 'umbrella_stroll' },
    { t0: 3.3,  t1: 5.2,  zh: '孤单的黑夜途中',         setKey: 'coralAbyss',       action: 'peek_curious' },
    { t0: 5.2,  t1: 7.2,  zh: '只要想着你',             setKey: 'observatory',      action: 'shy_fidget' },
    { t0: 7.2,  t1: 10.2, zh: '我就不会惶恐',           setKey: 'auroraHarbor',     action: 'confident_hips' },
    { t0: 10.2, t1: 14.2, zh: '时光的岸上人来了又走',   setKey: 'clocktower',       action: 'walk_brisk' },
    { t0: 14.2, t1: 17.2, zh: '离开时你不用说我都懂',   setKey: 'autumnGinkgo',     action: 'eat_white_rice' },
    { t0: 17.2, t1: 20.1, zh: '感谢你曾让我',           setKey: 'greenhouse',       action: 'coin_hug' },
    { t0: 20.1, t1: 24.2, zh: '留在你眼中',             setKey: 'veniceBridge',     action: 'camera_shutter' },
    { t0: 24.2, t1: 28.2, zh: '我曾经走过最遥远的路',   setKey: 'sunsetStation',    action: 'run_sprint' },
    { t0: 28.2, t1: 32.1, zh: '想要去拥抱未成真的梦',   setKey: 'dawnHill',         action: 'jump_joy' },
    { t0: 32.1, t1: 34.4, zh: '迷失的黑夜途中',         setKey: 'rainBusStop',      action: 'hum_working_song' },
    { t0: 34.4, t1: 35.5, zh: '只要想起你',             setKey: 'stampStudy',       action: 'ciallo_wink' },
    { t0: 35.5, t1: 38.2, zh: '就点亮了星空',           setKey: 'cosmicGalaxy',     action: 'sparkler_firework' },
    { t0: 38.2, t1: 42.2, zh: '流浪的纸船忘不掉港口',   setKey: 'sunflowerCoast',   action: 'fatfish_transform' },
    { t0: 42.2, t1: 45.2, zh: '渐灭的花火割不断彩虹',   setKey: 'rooftopFireworks', action: 'idol_mic_sing' },
    { t0: 45.2, t1: 49.1, zh: '你就是我心中',           setKey: 'fireflyForest',    action: 'eat_onigiri' },
    { t0: 49.1, t1: 52.8, zh: '永恒的天空',             setKey: 'emeraldWindmill',  action: 'tail_wag_dance' },
    { t0: 52.8, t1: 55.24, zh: '寂寞烟火 · 点亮整片星海', setKey: 'beachDawn',        action: 'sparkler_firework' }
  ];

  function drawOrigamiBoatProp(ctx, x, y, sc = 0.75, t = 0) {
    ctx.save();
    ctx.translate(x, y + Math.sin(t * 3.5) * 5);
    ctx.rotate(Math.sin(t * 2.4) * 0.05);
    ctx.scale(sc, sc);
    paint(ctx, [[-65, -28], [0, -85], [65, -28]], { fill: '#E2E8F0', ink: '#475569', sw: 2.2 });
    paint(ctx, [[-95, -32], [95, -32], [62, 18], [-62, 18]], { fill: '#F8FAFC', ink: '#475569', sw: 2.4 });
    paint(ctx, ellPts(76, -68, 12, 14, 10), { fill: '#FDE047', ink: '#D97706', sw: 1.8 });
    ctx.restore();
  }

  function renderJimoYanhuoFrame(ctx, t) {
    ctx.save();
    ctx.clearRect(0, 0, W, H);
    const { sub, idx } = findActiveSub(SUBS_JIMO_YANHUO, t);
    const lt = clamp(t - sub.t0, 0, sub.t1 - sub.t0);
    const dur = Math.max(0.2, sub.t1 - sub.t0);

    if (BAHUIYI && typeof BAHUIYI.renderMasterMVShot === 'function') {
      BAHUIYI.renderMasterMVShot(ctx, t, {
        shotIdx: idx + 9,
        lt,
        dur,
        setKey: sub.setKey,
        action: sub.action,
        u: 31,
        style: ['watercolor', 'neon', 'watercolor', 'ukiyoe'][idx % 4],
        guest: idx % 2 === 0 ? 'ladyGemini' : 'all'
      });
    }

    // Signature Origami Paper Boat floating on stage
    drawOrigamiBoatProp(ctx, 235 + ((idx * 83) % 160), 555, 0.68, t);

    drawBottomKaraokeBar(ctx, '《寂寞烟火》朱婧汐', idx, SUBS_JIMO_YANHUO.length, sub.zh, 'LONELY FIREWORKS · VOYAGE ACROSS THE STARRY SEA', t, sub.t0, sub.t1, '#F59E0B');
    ctx.restore();
  }

  // ==========================================================================
  // 4. `xinqiang` — Replicating `mv/心墙.mp4` (34.02s)
  // 郭静 / Bae《心墙》 — 12 Non-Repeating Multi-Set Shots + Warm Window & Tile Subtitles
  // ==========================================================================
  const SUBS_XINQIANG = [
    { t0: 0.0,  t1: 2.4,  zh: '第一次遇见阴天遮住你侧脸', hi: '阴天侧脸', setKey: 'rainBusStop',     action: 'umbrella_stroll' },
    { t0: 2.4,  t1: 4.3,  zh: '屋檐下听雨滴落成诗篇',     hi: '雨滴诗篇', setKey: 'clocktower',      action: 'peek_curious' },
    { t0: 4.3,  t1: 6.8,  zh: '有什么故事好想了解',       hi: '故事了解', setKey: 'stampStudy',      action: 'ciallo_wink' },
    { t0: 6.8,  t1: 9.1,  zh: '翻开画册每一页都是你的笑脸', hi: '笑脸',   setKey: 'classroom',       action: 'camera_shutter' },
    { t0: 9.1,  t1: 12.2, zh: '我感觉我懂你的特别',       hi: '特别',     setKey: 'greenhouse',      action: 'eat_white_rice' },
    { t0: 12.2, t1: 15.3, zh: '像蓝色大肥鱼守护白米饭一样真切', hi: '真切', setKey: 'riceCafeteria', action: 'fatfish_transform' },
    { t0: 15.3, t1: 17.8, zh: '你的心有一道墙',           hi: '有一道墙', setKey: 'autumnGinkgo',    action: 'shy_fidget' },
    { t0: 17.8, t1: 20.2, zh: '轻轻敲开那座沉默的城墙',   hi: '城墙',     setKey: 'crimsonMaple',    action: 'playful_fists' },
    { t0: 20.2, t1: 22.8, zh: '但我发现一扇窗',           hi: '一扇窗',   setKey: 'observatory',     action: 'jump_joy' },
    { t0: 22.8, t1: 25.3, zh: '窗外盛开着向日葵与晴朗',   hi: '向日葵',   setKey: 'sunflowerCoast',  action: 'coin_hug' },
    { t0: 25.3, t1: 29.0, zh: '偶尔透出一丝暖暖的微光',   hi: '暖暖微光', setKey: 'emeraldWindmill', action: 'idol_mic_sing' },
    { t0: 29.0, t1: 34.02, zh: '心墙 · 就算有一道墙也挡不住微光', hi: '心墙', setKey: 'dawnHill',     action: 'tail_wag_dance' }
  ];

  function renderXinqiangFrame(ctx, t) {
    ctx.save();
    ctx.clearRect(0, 0, W, H);
    const { sub, idx } = findActiveSub(SUBS_XINQIANG, t);
    const lt = clamp(t - sub.t0, 0, sub.t1 - sub.t0);
    const dur = Math.max(0.2, sub.t1 - sub.t0);

    if (BAHUIYI && typeof BAHUIYI.renderMasterMVShot === 'function') {
      BAHUIYI.renderMasterMVShot(ctx, t, {
        shotIdx: idx + 14,
        lt,
        dur,
        setKey: sub.setKey,
        action: sub.action,
        u: 31,
        style: 'watercolor',
        guest: idx % 2 === 0 ? 'ladyGemini' : 'all'
      });
    }

    drawTileCardsOverlay(ctx, sub.zh, t, sub.t0, sub.t1, { y: 88, highlight: sub.hi });
    drawBottomKaraokeBar(ctx, '《心墙》微光剧场版', idx, SUBS_XINQIANG.length, sub.zh, 'WALL OF THE HEART · WARM GLIMMER THROUGH THE WINDOW', t, sub.t0, sub.t1, '#34D399');
    ctx.restore();
  }

  // ==========================================================================
  // 5. `ribuluo` — Replicating `mv/日不落.mp4` (45.81s)
  // 蔡依林《日不落》 — 14 Non-Repeating Multi-Set Shots + Widgets + Tile & Karaoke Subtitles
  // ==========================================================================
  const SUBS_RIBULUO = [
    { t0: 0.0,  t1: 2.3,  zh: '睡不着 陪我听首日不落',         hi: '听首歌',     setKey: 'deepseekLab',      action: 'fatfish_working' },
    { t0: 2.3,  t1: 6.1,  zh: '祈祷你像英勇的禁卫军',         hi: '英勇禁卫军', setKey: 'clocktower',       action: 'confident_hips' },
    { t0: 6.1,  t1: 9.2,  zh: '动也不动地守护爱情',           hi: '守护爱情',   setKey: 'sunflowerCoast',   action: 'playful_fists' },
    { t0: 9.2,  t1: 13.1, zh: '你在回忆里留下的脚印',         hi: '回忆脚印',   setKey: 'beachDawn',        action: 'walk_brisk' },
    { t0: 13.1, t1: 16.5, zh: '是我爱的风景',                 hi: '爱的风景',   setKey: 'veniceBridge',     action: 'camera_shutter' },
    { t0: 16.5, t1: 20.1, zh: '我要送你日不落的想念',         hi: '日不落想念', setKey: 'dawnHill',         action: 'idol_mic_sing' },
    { t0: 20.1, t1: 24.1, zh: '寄出代表爱的明信片',           hi: '爱的明信片', setKey: 'stampStudy',       action: 'ciallo_wink' },
    { t0: 24.1, t1: 28.1, zh: '我要送你日不落的爱恋',         hi: '日不落爱恋', setKey: 'emeraldWindmill',  action: 'jump_joy' },
    { t0: 28.1, t1: 32.1, zh: '心牵着心把世界走遍',           hi: '世界走遍',   setKey: 'sunsetStation',    action: 'run_sprint' },
    { t0: 32.1, t1: 33.5, zh: '你就是庆典',                   hi: '庆典',       setKey: 'rooftopFireworks', action: 'sparkler_firework' },
    { t0: 33.5, t1: 35.8, zh: '你就是晴天',                   hi: '晴天',       setKey: 'greenhouse',       action: 'eat_white_rice' },
    { t0: 35.8, t1: 40.1, zh: '我的爱未眠',                   hi: '爱未眠',     setKey: 'cosmicGalaxy',     action: 'coin_hug' },
    { t0: 40.1, t1: 43.1, zh: '不落的想念 飞在你身边',         hi: '不落想念',   setKey: 'auroraHarbor',     action: 'fatfish_transform' },
    { t0: 43.1, t1: 45.81, zh: '我的爱未眠 · 你睡吧 我不睡',   hi: '爱未眠',     setKey: 'bionicLiving',     action: 'tail_wag_dance' }
  ];

  function renderRibuluoFrame(ctx, t) {
    ctx.save();
    ctx.clearRect(0, 0, W, H);
    const { sub, idx } = findActiveSub(SUBS_RIBULUO, t);
    const lt = clamp(t - sub.t0, 0, sub.t1 - sub.t0);
    const dur = Math.max(0.2, sub.t1 - sub.t0);

    if (BAHUIYI && typeof BAHUIYI.renderMasterMVShot === 'function') {
      BAHUIYI.renderMasterMVShot(ctx, t, {
        shotIdx: idx + 18,
        lt,
        dur,
        setKey: sub.setKey,
        action: sub.action,
        u: 31,
        style: ['watercolor', 'pixel', 'neon'][idx % 3],
        guest: idx % 2 === 0 ? 'ladyGemini' : 'all'
      });
    }

    // Compact Top-Right Weather & Now-Playing Widget Badge
    ctx.save();
    paint(ctx, rrPts(W - 255, 18, 230, 56, 14), { fill: '#0F172A', fillOp: 205, ink: '#F59E0B', sw: 2 });
    ctx.font = 'bold 15px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
    ctx.fillStyle = '#FEF08A';
    ctx.textAlign = 'left';
    ctx.fillText('伦敦 18°C · 日不落晴天', W - 238, 42);
    ctx.font = '12px "Silkscreen", monospace';
    ctx.fillStyle = '#38BDF8';
    ctx.fillText('caffeinate -d -i [ACTIVE]', W - 238, 62);
    ctx.restore();

    drawTileCardsOverlay(ctx, sub.zh, t, sub.t0, sub.t1, { y: 92, highlight: sub.hi });
    drawBottomKaraokeBar(ctx, '蔡依林《日不落》', idx, SUBS_RIBULUO.length, sub.zh, 'SUN WILL NEVER SET · GUARDING YOUR LOVE', t, sub.t0, sub.t1, '#F59E0B');
    ctx.restore();
  }

  const SHORT_MVS = {
    ba_huiyi_56: {
      tag: 'ba_huiyi_56',
      title: '《把回忆拼好给你》(56s 拼图剧场版)',
      duration: 56.03,
      subs: SUBS_BA_HUIYI_56,
      renderFrame: renderBaHuiyi56Frame
    },
    lianai_ing: {
      tag: 'lianai_ing',
      title: '五月天《恋爱ing》(深海终端版)',
      duration: 54.73,
      subs: SUBS_LIANAI_ING,
      renderFrame: renderLianaiIngFrame
    },
    jimo_yanhuo: {
      tag: 'jimo_yanhuo',
      title: '《寂寞烟火》(折纸船与灯塔篇)',
      duration: 55.24,
      subs: SUBS_JIMO_YANHUO,
      renderFrame: renderJimoYanhuoFrame
    },
    xinqiang: {
      tag: 'xinqiang',
      title: '《心墙》(微光绘本篇)',
      duration: 34.02,
      subs: SUBS_XINQIANG,
      renderFrame: renderXinqiangFrame
    },
    ribuluo: {
      tag: 'ribuluo',
      title: '《日不落》(禁卫军与桌面组件篇)',
      duration: 45.81,
      subs: SUBS_RIBULUO,
      renderFrame: renderRibuluoFrame
    }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SHORT_MVS;
  }
  root.MV_PACK_SHORT = SHORT_MVS;
})(typeof window !== 'undefined' ? window : globalThis);
