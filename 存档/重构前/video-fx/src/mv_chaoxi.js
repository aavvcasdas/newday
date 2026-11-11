// ============================================================================
// src/mv_chaoxi.js — 《傅梦彤 - 潮汐 (Natural)》(深海鲸鱼娘 · 澄蓝潮汐篇) 31.84s MV Director
// Built on the `mv_ba_huiyi_pinhao_gei_ni` non-repeating multi-set architecture:
//   - 11 unique non-repeating painted environments across 11 lyric shots (`31.84s`)
//   - Vosk-verified lyric strings and cue in/out timings for 傅梦彤《潮汐》
//   - Whale Maid Girl alone, with lyrics-driven actions and 11 distinct full environments
// ============================================================================

(function (root) {
  const CORE = root.CORE || (typeof require !== 'undefined' ? require('./core.js') : {});
  const WHALE = root.WHALE_GIRL || (typeof require !== 'undefined' ? require('./whale_girl.js') : {});
  const BAHUIYI = root.MV_BA_HUIYI || (typeof require !== 'undefined' ? require('./mv_ba_huiyi_pinhao_gei_ni.js') : {});

  const { W = 1280, H = 720, clamp, lerp, seg, easeIn, backOut, rrPts, paint, iris } = CORE;
  const DURATION = 31.84;

  // ==========================================================================
  // Vosk-verified Chinese lyric cues for 傅梦彤《潮汐》 (0.30s – 31.80s)
  // Timings follow the verified vocal onsets; do not show unverified paraphrases.
  // ==========================================================================
  const SUBTITLES_CHAOXI = [
    {
      t0: 0.30, t1: 2.68,
      zh: '当海面迎来汹涌的潮汐',
      setKey: 'beachNight',
      action: 'umbrella_stroll',
      emos: [[0.0, 'calm', 'music'], [0.9, 'surprised', 'exclaim'], [1.8, 'excited', 'sparkle']]
    },
    {
      t0: 2.71, t1: 5.35,
      zh: '我奔跑寻找昔日的足迹',
      setKey: 'sunflowerCoast',
      action: 'run_sprint',
      emos: [[0.0, 'focused', 'exclaim'], [0.9, 'excited', 'sparkle'], [1.8, 'happy', 'music']]
    },
    {
      t0: 5.38, t1: 7.85,
      zh: '夕阳下倒影迷人的美丽',
      setKey: 'veniceBridge',
      action: 'sparkler_firework',
      emos: [[0.0, 'starstruck', 'sparkle'], [0.85, 'love', 'heart'], [1.7, 'wink', 'heart']]
    },
    {
      t0: 7.88, t1: 10.50,
      zh: '可我却丢失故事和你',
      setKey: 'rainBusStop',
      action: 'cry_fountain',
      emos: [[0.0, 'sad', 'sweat'], [0.9, 'cry', 'sweat'], [1.8, 'sob', null]]
    },
    {
      t0: 10.55, t1: 13.00,
      zh: '你说过向往大海的神秘',
      setKey: 'coralAbyss',
      action: 'ciallo_wink',
      emos: [[0.0, 'question', 'question'], [0.85, 'idea', 'idea'], [1.7, 'starstruck', 'sparkle']]
    },
    {
      t0: 13.02, t1: 15.64,
      zh: '也憧憬我们遗失的过去',
      setKey: 'observatory',
      action: 'tail_wag_dance',
      emos: [[0.0, 'thinking', 'music'], [0.9, 'happy', 'heart'], [1.8, 'joy', 'sparkle']]
    },
    {
      t0: 15.67, t1: 19.15,
      zh: '分享给大海秘密',
      setKey: 'auroraHarbor',
      action: 'hum_working_song',
      emos: [[0.0, 'singing', 'music'], [1.1, 'shy', 'heart'], [2.2, 'wink', 'sparkle']]
    },
    {
      t0: 19.20, t1: 21.52,
      zh: '蓝色的海底',
      setKey: 'deepseekLab',
      action: 'tail_wag_dance',
      emos: [[0.0, 'excited', 'sparkle'], [0.8, 'starstruck', 'heart'], [1.6, 'joy', 'music']]
    },
    {
      t0: 21.56, t1: 24.04,
      zh: '远山的风景',
      setKey: 'dawnHill',
      action: 'ciallo_wink',
      emos: [[0.0, 'happy', 'sparkle'], [0.8, 'wink', 'heart'], [1.6, 'proud', 'sparkle']]
    },
    {
      t0: 24.07, t1: 29.24,
      zh: '我们的距离遥不可及',
      setKey: 'cosmicGalaxy',
      action: 'tail_wag_dance',
      emos: [[0.0, 'singing', 'music'], [1.6, 'sad', 'sweat'], [3.2, 'love', 'heart']]
    },
    {
      t0: 29.28, t1: 31.80,
      zh: '退守的爱情',
      setKey: 'beachDawn',
      action: 'ciallo_wink',
      emos: [[0.0, 'calm', 'heart'], [0.85, 'love', 'sparkle'], [1.7, 'happy', 'heart']]
    }
  ];

  function getActiveCue(t) {
    for (let i = 0; i < SUBTITLES_CHAOXI.length; i++) {
      const s = SUBTITLES_CHAOXI[i];
      if (t < s.t0) {
        const prior = SUBTITLES_CHAOXI[Math.max(0, i - 1)];
        const priorIdx = Math.max(0, i - 1);
        return { cue: prior, idx: priorIdx, visible: false };
      }
      if (t < s.t1) return { cue: s, idx: i, visible: true };
    }
    const lastIdx = SUBTITLES_CHAOXI.length - 1;
    return { cue: SUBTITLES_CHAOXI[lastIdx], idx: lastIdx, visible: false };
  }

  function renderChaoxiFrame(ctx, t) {
    ctx.save();
    ctx.clearRect(0, 0, W, H);

    const { cue, idx, visible } = getActiveCue(t);
    const lt = clamp(t - cue.t0, 0, cue.t1 - cue.t0);
    const dur = Math.max(0.2, cue.t1 - cue.t0);

    // 1. Render Full Non-Repeating Multi-Set Shot via Benchmark Engine
    if (BAHUIYI && typeof BAHUIYI.renderMasterMVShot === 'function') {
      BAHUIYI.renderMasterMVShot(ctx, t, {
        shotIdx: idx,
        lt,
        dur,
        setKey: cue.setKey,
        action: cue.action,
        emos: cue.emos,
        style: ['watercolor', 'neon', 'watercolor', 'pixel'][idx % 4],
        solo: true,
        u: 36,
        tailScale: 0.68,
        propL: null,
        propR: null,
        showActionBadge: false,
      });
    }

    // Chinese lyric captions are the only on-screen text.

    // 2. Audio-aligned Chinese karaoke subtitle (only during the verified vocal cue)
    if (visible) {
        const prog = clamp(lt / dur, 0, 1);
      const popY = lt < 0.16 ? (1 - backOut(lt / 0.16)) * 12 : 0;
      ctx.save();
      ctx.translate(0, popY);
      paint(ctx, rrPts(180, H - 104, W - 360, 80, 20), {
        fill: '#090D1E', fillOp: 220, ink: '#38BDF8', sw: 2.2
      });

      ctx.font = 'bold 31px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#090D1E';
      ctx.strokeText(cue.zh, W / 2, H - 62);
      ctx.fillStyle = '#E0F2FE';
      ctx.fillText(cue.zh, W / 2, H - 62);

      const textW = ctx.measureText(cue.zh).width;
      ctx.save();
      ctx.beginPath();
      ctx.rect(W / 2 - textW / 2, H - 98, textW * prog, 48);
      ctx.clip();
      ctx.fillStyle = '#FDE047';
      ctx.fillText(cue.zh, W / 2, H - 62);
      ctx.restore();

      ctx.restore();
    }

    if (t > DURATION - 1.1) {
      const r = lerp(820, 0, easeIn(seg(t, DURATION - 1.1, DURATION - 0.04)));
      iris(ctx, 640, 340, r, '#040814');
    }

    ctx.restore();
  }

  const EXPORTS = {
    DURATION,
    SUBTITLES_CHAOXI,
    renderChaoxiFrame
  };

  root.MV_CHAOXI = EXPORTS;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = EXPORTS;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
