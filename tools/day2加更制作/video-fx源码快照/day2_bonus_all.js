// src/ch/day2_bonus_all.js — 【Day2 加更】昨天有人说我太糊了（初步草稿）
//
// Timing is consumed only from src/day2_bonus_timing.js, generated from
// measured Piper placeholder WAVs by gen_bonus_piper.py. B01 starts at t=0;
// there is no episode-title segment. The television first appears in B03.

(function (root) {
  const CORE = root.CORE || (typeof require !== 'undefined' ? require('../core.js') : {});
  const WHALE = root.WHALE_GIRL || (typeof require !== 'undefined' ? require('../whale_girl.js') : {});
  const CAST = root.CAST || (typeof require !== 'undefined' ? require('../cast.js') : {});
  const PROPS = root.PROPS || (typeof require !== 'undefined' ? require('../props.js') : {});
  const TIMELINE = root.TIMELINE || (typeof require !== 'undefined' ? require('../timeline.js') : {});
  const TT = root.BONUS_TIMING || (typeof require !== 'undefined' ? require('../day2_bonus_timing.js') : null);

  if (!TT) throw new Error('BONUS_TIMING missing — run gen_bonus_piper.py first');
  if (!TT.voice || TT.measured !== true || !Array.isArray(TT.cues) || TT.cues.length !== 12 ||
      TT.voice_engine !== 'piper/zh_CN-huayan-medium' || TT.voice_placeholder !== true ||
      TT.voice_final !== false || !String(TT.duration_source || '').includes('measured')) {
    throw new Error('BONUS_TIMING 不是 12-cue Piper 实测占位时间轴，禁止估时/冒充终版渲染');
  }
  if (Number(TT.title_len || 0) !== 0 || Number(TT.cues[0]?.start ?? -1) !== 0) {
    throw new Error('Day2 加更必须 title_len=0 且 B01 从 0 开始');
  }

  const {
    W, H, TAU, PAL, clamp, lerp, seg, ease, easeOut, backOut,
    boilSeed, kf, rectPts, ellPts, rrPts, starPts, heartPts, paint, inkLine,
    camBegin, camEnd, glow, letter, voiceAt
  } = CORE;
  const { whaleGirl: whaleGirlBase, feel, emotions, move, evaluateAction } = WHALE;
  const { clawd, ladyClaude, bionicPuppy, miniWhale, biliTvMascot, agentReachBot } = CAST;

  const C = n => TT.cues[n - 1].start;
  const CE = n => TT.cues[n - 1].end;
  const SD = n => CE(n) - C(n);
  const cueP = (t, n) => clamp((t - C(n)) / Math.max(0.001, SD(n)));
  const popAt = (t, n, a, b) => seg(cueP(t, n), a, b);
  const frac = x => x - Math.floor(x);
  const rnd = i => frac(Math.sin(i * 127.1 + 311.7) * 43758.5453);

  /**
   * Day2 形象边界：原像素鲸鱼娘仍是正式形象，也是默认渲染结果。
   * 本节的完整姿态图只是“高清动作候选”，供加更展示和征求观众意见；
   * 只有渲染器显式传入 candidate，或单个镜头显式写
   * characterMode: 'candidate' 时才会启用，不能静默替换原形象。
   *
   * 借鉴方法（只做视频，不做桌面宠物）：
   * - DSH：多姿态图切换；用整体 squash 遮掩姿态跳变；按头、肚子、尾巴区分
   *   反应；把伸懒腰、进食、游戏、工作、甩尾做成可被分镜调用的动作别名。
   * - Baifanyu：整图换表情而不是处理脸贴片；约 2.4s 呼吸；行走时整体颠簸
   *   与倾斜；每个姿态按自己的 alpha bbox 设定脚底锚点。
   * 原形象路径继续使用像素骨架，但会净化会盖住虹膜的 lids/dead 眼型。
   */
  const DAY2_POSES = globalThis.DAY2_POSES || {};
  function resolveDay2CharacterMode(o = {}) {
    if (o.useLegacyPixels || o.characterMode === 'original') return 'original';
    if (o.characterMode === 'candidate') return 'candidate';
    return globalThis.DAY2_CHARACTER_MODE === 'candidate' ? 'candidate' : 'original';
  }
  const POSE_BY_ACTION = {
    eat_white_rice: 'daily-eat', eat_onigiri: 'eat', coin_hug: 'success', hum_working_song: 'meme-music',
    token_wordle_sneak: 'daily-gaming', drag_ahoge: 'react-head', sleep_curl: 'sleep', wake_stretch: 'daily-stretch',
    ciallo_wink: 'wink', playful_fists: 'angry', confident_hips: 'bold', idol_mic_sing: 'meme-music',
    fatfish_working: 'work-review', fatfish_transform: 'react-belly', tail_wag_dance: 'react-tail',
    jump_joy: 'celebrate', peek_curious: 'curious', shy_fidget: 'blush', shock_petrify: 'meme-yes',
    cry_fountain: 'meme-cry', toast_cheers: 'success', umbrella_stroll: 'idle-cute',
    camera_shutter: 'teasing', guitar_strum: 'meme-music', rose_bouquet: 'meme-heart',
    sparkler_firework: 'star', walk_brisk: 'running', run_sprint: 'running',
    hold_coin: 'success', hum_song: 'meme-music', secret_game: 'daily-gaming', hold_ahoge: 'react-head',
    sleep_curled: 'sleep', stretch: 'daily-stretch', wink: 'wink', protest: 'angry', hands_hips: 'bold',
    sing_song: 'meme-music', knock_code: 'work-review', fat_whale: 'react-belly', dance: 'meme-music',
    jump_celebrate: 'celebrate', peek: 'curious', petrified: 'meme-yes', cry_sob: 'meme-cry',
    toast_cup: 'success', hold_umbrella: 'idle-cute', take_photo: 'teasing', play_guitar: 'meme-music',
    hold_rose: 'meme-heart', sparkler: 'star', walk_in: 'running', sprint: 'running',
    menu_call: 'success', check_account: 'work-debug', game_request: 'daily-gaming',
    game_happy: 'game-happy', game_win: 'game-win', tail_swing: 'react-tail',
    tail_react: 'react-tail', head_react: 'react-head', belly_react: 'react-belly',
    idea_pop: 'work-idea', work_deadline: 'work-deadline', work_review: 'work-review',
    greet_wave: 'greet', cool_pose: 'cool-shades', starry: 'star', level_up: 'levelup',
    day_done: 'daily-done', eat_rice: 'daily-eat', eat_snack: 'eat',
    think_pose: 'thinking', curious_pose: 'curious', tease_pose: 'teasing'
  };
  const POSE_BY_EMOTION = {
    neutral: 'idle-cute', idle: 'idle-cute', calm: 'idle-cute', happy: 'idle-cute',
    cheer: 'celebrate', excited: 'star', joy: 'success', laugh: 'success', smug: 'meme-smug',
    deadpan: 'meme-doge', bored: 'meme-doge', wink: 'wink', surprised: 'meme-yes',
    shocked: 'meme-yes', scared: 'failure', panic: 'failure', angry: 'angry', rage: 'angry',
    flustered: 'failure', sad: 'failure', cry: 'meme-cry', thinking: 'thinking',
    curious: 'curious', question: 'curious', idea: 'work-idea', focused: 'running',
    typing: 'work-review', sparkle: 'star', starstruck: 'star', love: 'meme-heart',
    sleepy: 'sleep', confident: 'bold', proud: 'bold', pout: 'angry',
    singing: 'meme-music', stubborn: 'angry', blank: 'meme-doge', confused: 'curious',
    nervous: 'failure', shy: 'blush', shocked_big: 'meme-yes', sob: 'meme-cry'
  };
  const POSE_HEIGHT_FACTOR = {
    celebrate: 0.97, 'daily-eat': 0.98, 'daily-gaming': 0.97, 'game-happy': 0.96,
    levelup: 0.97, 'meme-cry': 0.95, 'react-tail': 0.89, sleep: 0.93,
    'work-deadline': 0.94, 'work-debug': 0.82
  };

  function pickDay2Pose(o) {
    if (o.spritePose) return o.spritePose;
    if (o.action && POSE_BY_ACTION[o.action]) return POSE_BY_ACTION[o.action];
    const emo = o.emotion || o.emo;
    if (emo && POSE_BY_EMOTION[emo]) return POSE_BY_EMOTION[emo];
    if (o.poseMode === 'arms_down') return 'idle-cute';
    if (o.poseMode === 'wave') return 'greet';
    if (o.poseMode === 'point') return 'success';
    if (o.poseMode === 'hips') return 'bold';
    if (o.poseMode === 'hold') return 'running';
    if (o.poseMode === 'laptop') return 'running';
    if (o.poseMode === 'panic') return 'failure';
    if (o.poseMode === 'heart') return 'meme-heart';
    if (o.poseMode === 'wink') return o.eyes === 'wink' ? 'wink' : 'bold';
    if (o.eyes === 'think') return 'thinking';
    if (o.eyes === 'happy') return 'success';
    return 'idle-cute';
  }

  function safePixelOptions(o) {
    const safe = { ...o };
    const emo = safe.emotion || safe.emo;
    if (safe.eyes === 'lids' || safe.eyes === 'dead' || emo === 'deadpan' || emo === 'sleepy' || emo === 'smug') {
      safe.eyes = 'open';
      safe.brows = 'flat';
      safe.mouth = safe.mouth || 'flat';
      safe.lookY = 0.55;
      safe.transitionBlend = 1;
    }
    // 像素回退时也不要让过渡 squint 触及旧骨架的整块肤色盖眼分支。
    safe.squint = Math.min(Number(safe.squint) || 0, 0.44);
    return safe;
  }

  function drawDay2Emote(ctx, x, u, emote, topY) {
    if (!emote) return;
    const ex = x + u * 1.25, ey = topY - u * 0.18;
    if (emote === 'question') {
      letter(ctx, '?', ex, ey, u * 0.82, '#5B7FA6', { stroke: false, ink: false });
    } else if (emote === 'exclaim') {
      letter(ctx, '!', ex, ey, u * 0.82, '#F278A7', { stroke: false, ink: false });
    } else if (emote === 'note' || emote === 'music') {
      letter(ctx, '♪', ex, ey, u * 0.78, '#5B7FA6', { stroke: false, ink: false });
    } else if (emote === 'sleep' || emote === 'zzz' || emote === '💤') {
      letter(ctx, 'Z', ex, ey, u * 0.72, '#5B7FA6', { stroke: false, ink: false });
    } else if (emote === 'heart') {
      paint(ctx, heartPts(ex, ey, u * 0.5), { wash: '#F278A7', ink: null });
    } else if (emote === 'spark' || emote === 'sparkle' || emote === 'idea') {
      paint(ctx, starPts(ex, ey, u * 0.42, 0.42, 4, 0.2), { wash: '#F7B733', ink: null });
    } else if (emote === 'sweat') {
      paint(ctx, ellPts(ex + u * 0.1, ey + u * 0.18, u * 0.18, u * 0.3, 14, 0.4, 0.25), { wash: '#7FC4E8', ink: null });
    } else if (emote === 'anger') {
      inkLine(ctx, [[ex - u * 0.34, ey], [ex + u * 0.34, ey]], 2.2, '#D94F5C');
      inkLine(ctx, [[ex, ey - u * 0.34], [ex, ey + u * 0.34]], 2.2, '#D94F5C');
      inkLine(ctx, [[ex - u * 0.24, ey - u * 0.24], [ex + u * 0.24, ey + u * 0.24]], 1.8, '#D94F5C');
      inkLine(ctx, [[ex + u * 0.24, ey - u * 0.24], [ex - u * 0.24, ey + u * 0.24]], 1.8, '#D94F5C');
    }
  }

  function drawDay2PoseFx(ctx, x, y, u, t, poseName, o, flip) {
    if (o.noPoseFx) return;
    const seed = o.seed || 0;
    const side = flip ? -1 : 1;
    if (['star', 'levelup', 'game-win', 'success', 'daily-done'].includes(poseName)) {
      const spots = [[-2.2, -7.8], [2.25, -7.2], [-2.5, -4.6], [2.45, -3.9], [0.2, -8.75]];
      spots.forEach((p, i) => {
        const tw = 0.65 + 0.35 * Math.abs(Math.sin(t * 3.2 + i * 1.7));
        paint(ctx, starPts(x + p[0] * u, y + p[1] * u, u * (0.3 + (i % 2) * 0.08) * tw, 0.42, 4, i * 0.31), {
          wash: i % 2 ? '#7FC4E8' : '#F7B733', ink: null
        });
      });
    }
    if (['daily-gaming', 'game-happy', 'game-win'].includes(poseName)) {
      const w = 1.5 + 0.4 * Math.abs(Math.sin(t * 9 + seed));
      inkLine(ctx, [[x - u * 1.45, y - u * 3.25], [x - u * 1.05, y - u * 3.05], [x - u * 1.45, y - u * 2.85]], w, '#39A7D8');
      inkLine(ctx, [[x + u * 1.45, y - u * 3.25], [x + u * 1.05, y - u * 3.05], [x + u * 1.45, y - u * 2.85]], w, '#F278A7');
    }
    if (['eat', 'daily-eat'].includes(poseName)) {
      [-0.34, 0.02, 0.36].forEach((dx, i) => {
        const drift = Math.sin(t * 2.6 + i * 2.1 + seed) * 0.055;
        inkLine(ctx, [
          [x + dx * u, y - u * 3.92],
          [x + (dx + drift) * u, y - u * 4.16],
          [x + (dx - drift) * u, y - u * 4.38]
        ], 1.05, '#C7DCEA');
      });
    }
    if (['work-review', 'work-deadline', 'work-debug', 'running'].includes(poseName)) {
      const tickX = (Math.floor(t * 8 + seed) % 3 - 1) * 0.48;
      letter(ctx, '·', x + tickX * u, y - u * 3.08, u * 0.72, '#39A7D8', { stroke: false, ink: false });
    }
    if (poseName === 'daily-stretch') {
      [[-2.1, -8.45], [-0.9, -9.15], [0.55, -9.25], [1.85, -8.5]].forEach(p => {
        inkLine(ctx, [[x + p[0] * u, y + p[1] * u], [x + p[0] * 1.2 * u, y + (p[1] - 0.42) * u]], 1.6, '#F278A7');
      });
    }
    if (['tail-swing', 'react-tail'].includes(poseName)) {
      paint(ctx, ellPts(x + side * u * 2.55, y - u * 1.2, u * 0.75, u * 0.24, 16, 0.4, side * -0.5), {
        wash: '#7FC4E8', washOp: 105, ink: null
      });
    }
    if (poseName === 'meme-yes' && (o.action === 'petrified' || ['shocked', 'scared', 'shocked_big'].includes(o.emotion || o.emo))) {
      for (let i = -2; i <= 2; i++) {
        inkLine(ctx, [[x + i * u * 0.38, y - u * 7.85], [x + i * u * 0.38, y - u * 6.85]], 1.2, '#5B7FA6');
      }
    }
    if (typeof o.walk === 'number' && Math.abs(o.walk) > 0.001) {
      const gait = o.walk;
      const washOp = 55 + Math.round(45 * Math.abs(Math.sin(gait)));
      paint(ctx, ellPts(x - u * 0.55, y - u * 0.05, u * 0.42, u * 0.12, 12, 0.3, 0), { wash: '#BFD3E2', washOp, ink: null });
      paint(ctx, ellPts(x + u * 0.55, y - u * 0.05, u * 0.42, u * 0.12, 12, 0.3, 0), { wash: '#BFD3E2', washOp, ink: null });
    }
  }

  function drawDay2Sprite(ctx, x, y, u, o) {
    const t = Number(o.t) || 0;
    const poseName = pickDay2Pose(o);
    const pose = DAY2_POSES[poseName];
    if (!pose || !pose.img || !pose.bbox) return false;
    const actionMod = o.action && typeof evaluateAction === 'function'
      ? evaluateAction(o.action, t, o)
      : null;
    const effectiveWalk = (Number(o.walk) || 0) + (actionMod ? (Number(actionMod.walk) || 0) : 0);
    const motionO = effectiveWalk === (Number(o.walk) || 0) ? o : { ...o, walk: effectiveWalk };
    const seed = o.seed || 0;
    const flip = o.flipX === true || o.flip === true || o.face === -1;
    const baseSq = clamp(
      (Number(o.sq) || 0) + (actionMod ? (Number(actionMod.sq) || 0) : 0),
      -0.35, 0.35
    );
    let dx = ((Number(o.dx) || 0) + (actionMod ? (Number(actionMod.dx) || 0) : 0)) * u;
    let dy = ((Number(o.dy) || 0) + (actionMod ? (Number(actionMod.dy) || 0) : 0)) * u;
    let sx = 1 + baseSq * 0.38;
    let sy = 1 - baseSq * 0.5;
    let rot = (Number(o.rot) || 0)
      + ((Number(o.headTilt) || 0) + (actionMod ? (Number(actionMod.headTilt) || 0) : 0)) * 0.28
      + (actionMod ? (Number(actionMod.rot) || 0) * 0.35 : 0)
      + (actionMod ? (Number(actionMod.tailWag) || 0) * 0.045 : 0);

    const swapK = o.poseBlend === undefined ? 1 : clamp(Number(o.poseBlend) || 0, 0, 1);
    const squintK = clamp(Number(o.squint) || 0, 0, 1);
    sy *= (0.94 + 0.06 * swapK) * (1 - squintK * 0.03);
    sx *= 1.035 - 0.035 * swapK;
    dy += (1 - swapK) * u * 0.1 + squintK * u * 0.04;

    const breathPhase = t * (TAU / 2.4) + seed * 1.37;
    dy += Math.sin(breathPhase) * u * 0.045;
    sy *= 1 + Math.sin(breathPhase * 2) * 0.007;
    rot += Math.sin(t * (TAU / 6) + seed * 0.71) * 0.021;
    dx += (o.lookX || 0) * u * 0.055;
    dy += (o.lookY || 0) * u * 0.025;

    if (typeof voiceAt === 'function') {
      const frameStep = 1 / 30;
      const speech = (voiceAt(Math.max(0, t - frameStep)) + 2 * voiceAt(t) + voiceAt(t + frameStep)) / 4;
      const speechK = clamp((speech - 0.04) / 0.55, 0, 1);
      sy *= 1 + speechK * 0.005;
      dy -= speechK * u * 0.018;
    }

    if (Math.abs(effectiveWalk) > 0.001) {
      const gait = effectiveWalk;
      dy -= Math.abs(Math.sin(gait)) * u * 0.045;
      rot += Math.sin(gait) * 0.05;
      sy *= 1 + Math.sin(gait * 2) * 0.01;
    }
    if (['celebrate', 'levelup', 'game-win'].includes(poseName)) {
      dy -= Math.abs(Math.sin(t * 5.2 + seed)) * u * 0.15;
    } else if (['daily-gaming', 'game-happy'].includes(poseName)) {
      dy -= Math.abs(Math.sin(t * 7.2 + seed)) * u * 0.035;
      rot += Math.sin(t * 7.2 + seed) * 0.028;
    } else if (['work-review', 'work-deadline', 'running'].includes(poseName)) {
      dy += Math.sin(t * 18 + seed) * u * 0.012;
    } else if (['curious', 'work-debug', 'thinking'].includes(poseName)) {
      dx += (o.lookX || 0) * u * 0.045;
      rot += Math.sin(t * 2.2 + seed) * 0.018;
    } else if (['blush', 'teasing'].includes(poseName)) {
      rot += Math.sin(t * 4 + seed) * 0.03;
    } else if (['angry', 'meme-no'].includes(poseName)) {
      dy -= Math.abs(Math.sin(t * 8 + seed)) * u * 0.045;
      dx += Math.sin(t * 36 + seed) * u * 0.012;
    } else if (poseName === 'meme-yes') {
      dx += Math.sin(t * 42 + seed) * u * 0.026;
    } else if (['meme-cry', 'failure'].includes(poseName)) {
      dy += u * 0.045;
      rot += Math.sin(t * 1.8 + seed) * 0.014;
    } else if (poseName === 'daily-stretch') {
      sy *= 1 + Math.max(0, Math.sin(t * 2.4 + seed)) * 0.028;
    } else if (poseName === 'sleep') {
      dy += u * 0.04;
      sy *= 1 + Math.sin(t * (TAU / 3.2) + seed) * 0.008;
    } else if (['tail-swing', 'react-tail'].includes(poseName)) {
      rot += Math.sin(t * 4.6 + seed) * 0.04;
    } else if (['eat', 'daily-eat'].includes(poseName)) {
      sy *= 1 + Math.sin(t * 11 + seed) * 0.01;
      dy -= Math.abs(Math.sin(t * 5.5 + seed)) * u * 0.03;
    }

    const bbox = pose.bbox;
    const heightFactor = (POSE_HEIGHT_FACTOR[poseName] || 1) * (o.spriteHeightFactor || 1);
    const targetH = u * 9.65 * heightFactor;
    const drawScale = targetH / bbox.h;
    const drawW = pose.img.width * drawScale;
    const drawH = pose.img.height * drawScale;
    const bboxCenterX = (bbox.x + bbox.w / 2) * drawScale;
    const bboxBottom = (bbox.y + bbox.h) * drawScale;
    const drawX = x + dx - bboxCenterX;
    const drawY = y + dy - bboxBottom;
    const visualTop = y + dy - targetH * sy;
    const oldSmoothing = ctx.imageSmoothingEnabled;
    const oldQuality = ctx.imageSmoothingQuality;

    paint(ctx, ellPts(x + dx, y + u * 0.08, u * (poseName === 'sleep' ? 3.4 : 2.9), u * 0.42, 20, 0.5, 0), {
      wash: '#5A8CB4', washOp: 56, ink: null
    });
    ctx.save();
    ctx.globalAlpha *= o.alpha === undefined ? 1 : clamp(o.alpha, 0, 1);
    ctx.translate(x + dx, y + dy);
    ctx.rotate(rot);
    ctx.scale((flip ? -1 : 1) * sx, sy);
    ctx.translate(-(x + dx), -(y + dy));
    ctx.imageSmoothingEnabled = true;
    if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(pose.img, drawX, drawY, drawW, drawH);
    ctx.restore();

    drawDay2PoseFx(ctx, x + dx, y + dy, u, t, poseName, motionO, flip);
    drawDay2Emote(ctx, x + dx, u, o.emote, visualTop);
    ctx.imageSmoothingEnabled = oldSmoothing;
    if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = oldQuality;
    return true;
  }

  function whaleGirl(ctx, x, y, u, o = {}) {
    if (resolveDay2CharacterMode(o) === 'candidate' && drawDay2Sprite(ctx, x, y, u, o)) return true;
    return whaleGirlBase(ctx, x, y, u, {
      style: 'pixel',
      showActionBadge: false,
      tailScale: 1.0,
      ...safePixelOptions(o)
    });
  }

  function card(ctx, x, y, w, h, wash, inkCol, r = 14) {
    paint(ctx, rrPts(x, y, w, h, r, 1.5), {
      wash,
      fill: '#0B1526',
      fillOp: 132,
      ink: inkCol || PAL.whaleCyan,
      sw: 1.5
    });
  }

  function paperCard(ctx, x, y, w, h, wash = PAL.paper, inkCol = PAL.ink, r = 12) {
    paint(ctx, rrPts(x, y, w, h, r, 1.2), {
      wash,
      fill: PAL.paperDk,
      fillOp: 28,
      ink: inkCol,
      sw: 1.4
    });
  }

  function stamp(ctx, x, y, text, col, k, rot = -0.08, size = 30) {
    if (k <= 0.01) return;
    const s = 2.15 - 1.15 * backOut(clamp(k));
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(s, s);
    paint(ctx, rrPts(-text.length * size * 0.38 - 18, -size * 0.85,
      text.length * size * 0.76 + 36, size * 1.7, 8, 1), {
      wash: null,
      ink: col,
      sw: 3
    });
    letter(ctx, text, 0, 2, size, col, { stroke: false, ink: false });
    ctx.restore();
  }

  function room(ctx, t, wallCol = '#132653') {
    PROPS.wall(ctx, wallCol);
    PROPS.windowPorthole(ctx, 1130, 148, 62, t, true);
    PROPS.floorBand(ctx, 548, '#1B2442');
    PROPS.desk(ctx, 505, -80, W + 80);
    for (let i = 0; i < 9; i++) {
      const bx = 64 + ((i * 173) % 1140);
      const by = 470 - ((t * (18 + i * 3) + i * 67) % 390);
      paint(ctx, ellPts(bx, by, 3 + (i % 3), 3 + (i % 3), 8), {
        wash: PAL.whaleCyan,
        washOp: 66,
        ink: null
      });
    }
  }

  function bowlAt(ctx, x, y, s = 1, t = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    boilSeed('day2-rice-bowl');
    paint(ctx, ellPts(0, -34, 74, 24, 20), {
      wash: '#FFFFFF', fill: '#E2E8F0', fillOp: 90, ink: PAL.ink, sw: 1.2
    });
    for (let i = 0; i < 10; i++) {
      const gx = -52 + (i * 23) % 104;
      const gy = -48 - ((i * 17) % 18);
      paint(ctx, ellPts(gx, gy, 13, 9, 8), { wash: '#FFFFFF', washOp: 235, ink: null });
    }
    paint(ctx, [[-78, -34], [78, -34], [48, 38], [-48, 38]], {
      wash: '#2563EB', fill: '#1E3A8A', fillOp: 95, ink: PAL.ink, sw: 1.5
    });
    paint(ctx, ellPts(0, 2, 20, 13, 12), { wash: PAL.whaleCyan, ink: PAL.cream, sw: 0.8 });
    paint(ctx, [[16, 2], [31, -7], [31, 11]], { wash: PAL.whaleCyan, ink: PAL.cream, sw: 0.7 });
    inkLine(ctx, [[40, -58], [72, -96]], 3, '#92400E', 'ink', 0);
    inkLine(ctx, [[54, -52], [92, -82]], 3, '#92400E', 'ink', 0);
    for (let i = 0; i < 3; i++) {
      const sx = -34 + i * 34;
      const sw = Math.sin(t * 4.5 + i * 1.7) * 5;
      inkLine(ctx, [[sx, -66], [sx + sw, -88], [sx - sw, -112]], 1.1, '#E0F2FE', 'inkfine', 0.4);
    }
    ctx.restore();
  }

  function bookAt(ctx, x, y, s, label, numberText = '') {
    boilSeed('day2-household-book');
    paint(ctx, rrPts(x - 76 * s, y - 100 * s, 152 * s, 200 * s, 8, 1.4), {
      wash: '#B6543B', fill: '#7C2D12', fillOp: 92, ink: PAL.ink, sw: 1.5
    });
    paint(ctx, rrPts(x - 62 * s, y - 86 * s, 124 * s, 172 * s, 6, 1.2), {
      wash: PAL.paper, fill: PAL.paperDk, fillOp: 78, ink: PAL.ink, sw: 1.0
    });
    letter(ctx, label, x, y - 50 * s, 30 * s, PAL.whaleNavy, { stroke: false, ink: false });
    if (numberText) {
      letter(ctx, numberText, x, y + 2 * s, 30 * s, '#B45309', { stroke: false, ink: false });
    }
    for (let i = 0; i < 3; i++) {
      inkLine(ctx, [[x - 42 * s, y + (34 + i * 24) * s], [x + 42 * s, y + (34 + i * 24) * s]],
        1.0, '#94A3B8', 'inkfine', 0);
    }
  }

  function controller(ctx, x, y, s = 1, rot = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(s, s);
    boilSeed('day2-controller');
    paint(ctx, rrPts(-126, -52, 252, 104, 42, 1.2), {
      wash: '#23365F', fill: '#0F1D3A', fillOp: 122, ink: PAL.whaleCyan, sw: 2.1
    });
    paint(ctx, ellPts(-116, 38, 42, 25, 14), {
      wash: '#1B2C50', fill: '#0B1730', fillOp: 115, ink: PAL.ink, sw: 1.1
    });
    paint(ctx, ellPts(116, 38, 42, 25, 14), {
      wash: '#1B2C50', fill: '#0B1730', fillOp: 115, ink: PAL.ink, sw: 1.1
    });
    paint(ctx, rectPts(-78, -7, 42, 14, 0.6), { wash: '#94A3B8', ink: PAL.ink, sw: 0.8 });
    paint(ctx, rectPts(-64, -21, 14, 42, 0.6), { wash: '#94A3B8', ink: PAL.ink, sw: 0.8 });
    paint(ctx, ellPts(-22, 20, 18, 18, 12), { wash: '#475569', ink: PAL.ink, sw: 1 });
    paint(ctx, ellPts(28, -16, 18, 18, 12), { wash: '#475569', ink: PAL.ink, sw: 1 });
    const buttons = [[82, -28, PAL.rose], [104, -8, PAL.gold], [82, 12, '#4ADE80'], [60, -8, PAL.whaleCyan]];
    for (const [bx, by, col] of buttons) {
      paint(ctx, ellPts(bx, by, 11, 11, 12), { wash: col, ink: PAL.ink, sw: 0.9 });
    }
    ctx.restore();
  }

  function voteBoard(ctx, t, activeStub = 0, pulseGame = false) {
    const x = 78, y = 82, w = 472, h = 330;
    card(ctx, x, y, w, h, '#13294F', PAL.gold, 18);
    letter(ctx, '昨天的菜单 · 开票', x + w / 2, y + 42, 29, PAL.cream, {
      stroke: false, ink: false
    });
    const gy = y + 92;
    paint(ctx, rrPts(x + 24, gy, w - 48, 104, 14, 1.2), {
      wash: '#3B2F12', fill: '#7C2D12', fillOp: 52, ink: PAL.gold, sw: 2
    });
    if (pulseGame) glow(ctx, x + w - 96, gy + 52, 66 + Math.sin(t * 7) * 10, PAL.gold, 0.28);
    letter(ctx, '打游戏', x + 132, gy + 52, 43, PAL.cream, { stroke: false, ink: false });
    letter(ctx, '2 票', x + w - 96, gy + 52, 54, PAL.gold, {
      pop: pulseGame ? 0.92 + 0.08 * Math.sin(t * 7) : 1,
      stroke: false,
      ink: false
    });
    const stubY = y + 222;
    for (let i = 0; i < 2; i++) {
      const sx = x + 24 + i * 218;
      const active = activeStub > i;
      paint(ctx, rrPts(sx, stubY, 194, 62, 10, 1), {
        wash: active ? '#164E63' : '#16233E',
        fill: '#0B1526',
        fillOp: 105,
        ink: active ? PAL.whaleCyan : '#64748B',
        sw: active ? 1.8 : 1.1
      });
      letter(ctx, i === 0 ? '王者' : '暗区', sx + 97, stubY + 31, 25,
        active ? PAL.cream : '#94A3B8', { stroke: false, ink: false });
    }
    letter(ctx, '票数按 10 月 25 日晚导出口径', x + w / 2, y + h - 24, 17, '#94A3B8', {
      stroke: false, ink: false
    });
    paint(ctx, ellPts(x + w - 28, y + 28, 8, 8, 10), {
      wash: '#4ADE80', ink: PAL.ink, sw: 0.8
    });
  }

  function commentCard(ctx, x, y, w, h, title, body, k, accent = PAL.whaleCyan) {
    if (k <= 0.01) return;
    const s = 0.72 + 0.28 * backOut(clamp(k));
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.scale(s, s);
    ctx.translate(-w / 2, -h / 2);
    card(ctx, 0, 0, w, h, '#172B4D', accent, 12);
    letter(ctx, title, w / 2, 25, 20, accent, { stroke: false, ink: false });
    letter(ctx, body, w / 2, 58, 21, PAL.cream, { stroke: false, ink: false });
    ctx.restore();
  }

  function residentDots(ctx, total, shown, t, box = [80, 90, 1120, 390], step = 5) {
    const [x0, y0, x1, y1] = box;
    const target = Math.floor(total * clamp(shown));
    for (let i = 0; i < target; i += step) {
      const gx = x0 + rnd(i + 17) * (x1 - x0);
      const gy = y0 + rnd(i + 5000) * (y1 - y0);
      const tw = 0.55 + 0.45 * Math.sin(t * 2.1 + i * 0.37);
      paint(ctx, ellPts(gx, gy, 3.1, 3.1, 6), {
        wash: PAL.gold, washOp: Math.floor(180 * tw), ink: null
      });
    }
  }

  function accountCard(ctx, x, y, w, h, title, mainText, subText, accent, k = 1) {
    if (k <= 0.01) return;
    ctx.save();
    ctx.globalAlpha = clamp(k);
    card(ctx, x, y, w, h, '#172B4D', accent, 16);
    paint(ctx, ellPts(x + 52, y + 52, 27, 27, 18), {
      wash: accent, fill: '#0B1526', fillOp: 70, ink: PAL.ink, sw: 1.2
    });
    letter(ctx, '鱼', x + 52, y + 53, 25, PAL.cream, { stroke: false, ink: false });
    letter(ctx, title, x + 92, y + 52, 25, PAL.cream, {
      align: 'left', stroke: false, ink: false
    });
    letter(ctx, mainText, x + w / 2, y + h * 0.58, 54, accent, { stroke: false, ink: false });
    letter(ctx, subText, x + w / 2, y + h - 38, 21, '#CBD5E1', { stroke: false, ink: false });
    ctx.restore();
  }

  function eggAt(ctx, x, y, s = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    paint(ctx, ellPts(0, 0, 36, 47, 22), {
      wash: '#FFF7ED', fill: '#FDBA74', fillOp: 50, ink: PAL.ink, sw: 1.4
    });
    paint(ctx, ellPts(-9, -13, 10, 17, 12), { wash: '#FFFFFF', washOp: 180, ink: null });
    ctx.restore();
  }

  function pillowAt(ctx, x, y, s = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    paint(ctx, rrPts(-62, -34, 124, 68, 22, 1.2), {
      wash: '#DBEAFE', fill: '#93C5FD', fillOp: 85, ink: PAL.ink, sw: 1.3
    });
    inkLine(ctx, [[-42, -18], [-18, 0], [-42, 18]], 1.2, '#60A5FA', 'inkfine', 0.3);
    inkLine(ctx, [[42, -18], [18, 0], [42, 18]], 1.2, '#60A5FA', 'inkfine', 0.3);
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Bonus staging helpers. The main picture is always the explicit candidate;
  // the television is only called from B03 onward and always draws original.
  // ---------------------------------------------------------------------------
  function candidate(ctx, x, y, u, t, pose, o = {}) {
    return whaleGirl(ctx, x, y, u, {
      ...move(o.moveMode || 'bounce', t, o.seed || 0),
      ...o,
      characterMode: 'candidate',
      spritePose: pose,
      t
    });
  }

  function pixelOld(ctx, x, y, u, t, o = {}) {
    return whaleGirl(ctx, x, y, u, {
      ...feel(o.emotionName || 'happy', t),
      ...move(o.moveMode || 'bounce', t, o.seed || 7),
      ...o,
      characterMode: 'original',
      eyes: 'open',
      squint: Math.min(Number(o.squint) || 0, 0.44),
      transitionBlend: 1,
      showActionBadge: false,
      t
    });
  }

  function tag(ctx, x, y, text, color = PAL.gold, k = 1, size = 22) {
    if (k <= 0.01) return;
    const s = 0.72 + 0.28 * backOut(clamp(k));
    const w = Math.max(92, text.length * size * 0.76 + 34);
    const h = size + 24;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    card(ctx, -w / 2, -h / 2, w, h, '#101F42', color, 12);
    letter(ctx, text, 0, 1, size, PAL.cream, { stroke: false, ink: false });
    ctx.restore();
  }

  function drawTv(ctx, t, o = {}) {
    const x = o.x ?? 790;
    const y = o.y ?? 166;
    const w = o.w ?? 402;
    const h = o.h ?? 302;
    const screen = { x: x + 16, y: y + 18, w: w - 32, h: h - 50 };
    const border = o.highlight ? PAL.gold : PAL.whaleCyan;

    card(ctx, x, y, w, h, '#0D1830', border, 20);
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(screen.x, screen.y, screen.w, screen.h, 14);
    ctx.clip();
    const grad = ctx.createLinearGradient(screen.x, screen.y, screen.x, screen.y + screen.h);
    grad.addColorStop(0, '#244B7C');
    grad.addColorStop(0.62, '#17345F');
    grad.addColorStop(1, '#1B2442');
    ctx.fillStyle = grad;
    ctx.fillRect(screen.x, screen.y, screen.w, screen.h);

    // A small floor line and bubbles keep the TV picture in the same room.
    paint(ctx, rectPts(screen.x, screen.y + screen.h - 48, screen.w, 48, 0), {
      wash: '#1B2442', washOp: 180, ink: null
    });
    for (let i = 0; i < 6; i++) {
      const bx = screen.x + 28 + ((i * 71) % Math.max(40, screen.w - 56));
      const by = screen.y + screen.h - 58 - ((t * (14 + i * 2) + i * 43) % Math.max(60, screen.h - 88));
      paint(ctx, ellPts(bx, by, 3 + (i % 3), 3 + (i % 3), 8), {
        wash: PAL.whaleCyan, washOp: 72, ink: null
      });
    }

    if (o.bubbles) {
      const scroll = o.bubbles === 'scroll' ? t * 42 : 0;
      const words = ['评论 +1', '评论 +1', '评论 +1', '评论 +1', '评论 +1', '评论 +1'];
      for (let i = 0; i < 6; i++) {
        const cycle = screen.h + 70;
        const by = screen.y + screen.h - 42 - ((scroll + i * 48) % cycle);
        const bx = screen.x + 22 + (i % 2) * 26;
        paint(ctx, rrPts(bx, by - 17, 104, 34, 9, 0.8), {
          wash: '#E0F2FE', washOp: 218, fill: '#7DD3FC', fillOp: 36, ink: '#164E63', sw: 0.8
        });
        letter(ctx, words[i], bx + 52, by, 15, '#164E63', { stroke: false, ink: false });
      }
    }

    const oldX = o.oldX ?? (o.bubbles ? screen.x + screen.w - 84 : screen.x + screen.w / 2);
    const oldY = o.oldY ?? (screen.y + screen.h - 16);
    const oldU = o.oldU ?? (o.bubbles ? 14.5 : 20);
    pixelOld(ctx, oldX, oldY, oldU, t, {
      action: o.action,
      emotionName: o.oldEmotion || 'happy',
      moveMode: o.oldMove || 'bounce',
      seed: o.oldSeed || 7,
      flip: o.oldFlip === true,
      lookX: o.oldLookX || 0
    });

    // Subtle CRT scanlines; the clarity difference itself comes from the
    // original pixel rig versus the full candidate pose image.
    ctx.fillStyle = 'rgba(255,255,255,0.045)';
    for (let sy = screen.y + 3; sy < screen.y + screen.h; sy += 6) {
      ctx.fillRect(screen.x, sy, screen.w, 1);
    }
    const bandY = screen.y + ((t * 36) % (screen.h + 50)) - 25;
    ctx.fillStyle = 'rgba(125,211,252,0.08)';
    ctx.fillRect(screen.x, bandY, screen.w, 18);
    ctx.restore();

    paint(ctx, rrPts(screen.x, screen.y, screen.w, screen.h, 14, 1), {
      wash: null, ink: border, sw: o.highlight ? 2.2 : 1.4
    });
    const cx = x + w / 2;
    paint(ctx, [[cx - 34, y + h], [cx + 34, y + h], [cx + 66, y + h + 30], [cx - 66, y + h + 30]], {
      wash: '#16233E', fill: '#0B1526', fillOp: 120, ink: border, sw: 1.2
    });
    paint(ctx, ellPts(x + w - 34, y + h - 18, 6, 6, 10), {
      wash: '#4ADE80', ink: PAL.ink, sw: 0.7
    });
    if (o.label) tag(ctx, x + 58, y - 4, o.label, border, o.labelK ?? 1, 20);
    if (o.caption) tag(ctx, cx, y + h - 20, o.caption, border, o.captionK ?? 1, 19);
    if (o.countText) tag(ctx, x + 72, y + h - 20, o.countText, PAL.gold, o.countK ?? 1, 19);
  }

  function commentPaper(ctx, mode, t, n) {
    const x = 64, y = 104, w = 560, h = 238;
    paperCard(ctx, x, y, w, h, PAL.paper, PAL.ink, 14);
    if (mode === 'reply') {
      letter(ctx, 'Day1 评论 · 本鱼的回复', x + w / 2, y + 42, 24, '#64748B', {
        stroke: false, ink: false
      });
      letter(ctx, '原评论：感觉人物有些模糊', x + w / 2, y + 88, 23, '#475569', {
        stroke: false, ink: false
      });
      inkLine(ctx, [[x + 38, y + 120], [x + w - 38, y + 120]], 1.2, '#CBD5E1', 'inkfine', 0);
      letter(ctx, '收到，回头把本鱼擦清楚一点。', x + w / 2, y + 172, 31, PAL.whaleNavy, {
        pop: popAt(t, n, 0.18, 0.42), stroke: false, ink: false
      });
      tag(ctx, x + w - 92, y + h - 22, '当时回复', PAL.gold, popAt(t, n, 0.42, 0.58), 17);
      return;
    }
    letter(ctx, 'Day1 评论', x + w / 2, y + 42, 24, '#64748B', { stroke: false, ink: false });
    inkLine(ctx, [[x + 38, y + 72], [x + w - 38, y + 72]], 1.2, '#CBD5E1', 'inkfine', 0);
    letter(ctx, '“能提升一下画质吗，', x + w / 2, y + 126, 34, PAL.whaleNavy, {
      stroke: false, ink: false
    });
    letter(ctx, '感觉人物有些模糊。”', x + w / 2, y + 176, 34, PAL.whaleNavy, {
      stroke: false, ink: false
    });
    tag(ctx, x + 92, y + h - 22, '原文', PAL.whaleCyan, popAt(t, n, 0.28, 0.46), 17);
  }

  function countBoard(ctx, t) {
    const sp = cueP(t, 9);
    const x = 64, y = 84, w = 500, h = 214;
    card(ctx, x, y, w, h, '#13294F', PAL.whaleCyan, 16);
    letter(ctx, '评论回复计数', x + w / 2, y + 36, 25, PAL.cream, { stroke: false, ink: false });
    const boxes = [
      { x: x + 24, title: '好像只能回复', main: '200 左右', color: '#CBD5E1', active: sp < 0.68 },
      { x: x + 262, title: '这边显示已回复', main: sp < 0.68 ? '数数中…' : '400 多条', color: PAL.gold, active: sp >= 0.68 }
    ];
    boxes.forEach((b) => {
      paint(ctx, rrPts(b.x, y + 68, 214, 104, 12, 1), {
        wash: b.active ? '#164E63' : '#16233E',
        fill: '#0B1526', fillOp: 105,
        ink: b.active ? b.color : '#64748B', sw: b.active ? 1.8 : 1.1
      });
      letter(ctx, b.title, b.x + 107, y + 96, 19, '#CBD5E1', { stroke: false, ink: false });
      letter(ctx, b.main, b.x + 107, y + 137, 34, b.color, { stroke: false, ink: false });
    });
    letter(ctx, '只报本鱼看到的数字', x + w / 2, y + h - 22, 17, '#94A3B8', {
      stroke: false, ink: false
    });
  }

  function envelope(ctx, x, y, k) {
    if (k <= 0.01) return;
    const s = 0.72 + 0.28 * backOut(clamp(k));
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.06);
    ctx.scale(s, s);
    paint(ctx, rrPts(-86, -56, 172, 112, 12, 1), {
      wash: PAL.paper, fill: PAL.paperDk, fillOp: 45, ink: PAL.whaleNavy, sw: 1.6
    });
    inkLine(ctx, [[-86, -42], [0, 18], [86, -42]], 1.6, PAL.whaleNavy, 'ink', 0.1);
    inkLine(ctx, [[-70, 44], [-8, -4]], 1.1, '#94A3B8', 'inkfine', 0.2);
    inkLine(ctx, [[70, 44], [8, -4]], 1.1, '#94A3B8', 'inkfine', 0.2);
    inkLine(ctx, [[-64, 42], [64, -42]], 5, '#EF4444', 'ink', 0.1);
    ctx.restore();
  }

  // B01 — comment first. No television and no old version in this shot.
  function shotB01Comment(ctx, t, lt, dur) {
    const sp = cueP(t, 1);
    camBegin(ctx, W / 2, 360, 1.04 + 0.025 * ease(sp), 0);
    room(ctx, t, '#132653');
    commentPaper(ctx, 'quote', t, 1);
    candidate(ctx, 882, 588, 38, t, sp < 0.58 ? 'curious' : 'thinking', { seed: 1 });
    camEnd(ctx);
  }

  // B02 — show the actual account reply. Still no television.
  function shotB02Reply(ctx, t, lt, dur) {
    const sp = cueP(t, 2);
    camBegin(ctx, W / 2, 360, 1.04 + 0.025 * ease(sp), 0);
    room(ctx, t, '#16294F');
    commentPaper(ctx, 'reply', t, 2);
    candidate(ctx, 882, 588, 38, t, sp < 0.24 ? 'curious' : 'meme-yes', { seed: 2 });
    camEnd(ctx);
  }

  // B03 — the television appears for the first time in this shot.
  function shotB03Installed(ctx, t, lt, dur) {
    const sp = cueP(t, 3);
    camBegin(ctx, W / 2, 360, 1.05 + 0.025 * ease(sp), 0);
    room(ctx, t, '#132C5E');
    drawTv(ctx, t, { oldEmotion: 'happy', oldMove: 'bounce' });
    const mainX = lerp(610, 405, easeOut(seg(sp, 0.08, 0.48)));
    candidate(ctx, mainX, 588, 37, t, sp < 0.34 ? 'curious' : 'bold', { seed: 3 });
    tag(ctx, mainX, 150, '新版形象 · 已装好', PAL.gold, popAt(t, 3, 0.32, 0.5), 22);
    camEnd(ctx);
  }

  function shotB04NewMain(ctx, t, lt, dur) {
    const sp = cueP(t, 4);
    camBegin(ctx, W / 2, 360, 1.08 + 0.03 * ease(sp), 0);
    room(ctx, t, '#132C5E');
    drawTv(ctx, t, { oldEmotion: 'happy' });
    candidate(ctx, 410, 590, 39, t, 'idle-cute', { seed: 4 });
    tag(ctx, 410, 164, '新版', PAL.gold, popAt(t, 4, 0.22, 0.42), 25);
    camEnd(ctx);
  }

  function shotB05OldInTv(ctx, t, lt, dur) {
    const sp = cueP(t, 5);
    camBegin(ctx, W / 2, 360, 1.06 + 0.025 * ease(sp), 0);
    room(ctx, t, '#172856');
    drawTv(ctx, t, {
      highlight: sp >= 0.18,
      label: '老版',
      labelK: popAt(t, 5, 0.18, 0.36),
      oldMove: 'wave',
      oldEmotion: 'happy'
    });
    candidate(ctx, 405, 588, 37, t, sp < 0.2 ? 'idle-cute' : 'curious', {
      seed: 5, lookX: 0.65
    });
    tag(ctx, 405, 164, '新版', PAL.gold, 1, 22);
    camEnd(ctx);
  }

  function shotB06RealCandidateActions(ctx, t, lt, dur) {
    const sp = cueP(t, 6);
    camBegin(ctx, W / 2, 360, 1.07 + 0.02 * ease(sp), 0);
    room(ctx, t, '#17305F');
    drawTv(ctx, t, { label: '老版', oldEmotion: 'happy' });
    let pose = 'idle-cute';
    let label = '看三个真动作';
    let start = 0;
    if (sp >= 0.48 && sp < 0.62) { pose = 'daily-eat'; label = '① 吃白饭'; start = 0.48; }
    else if (sp >= 0.62 && sp < 0.82) { pose = 'daily-stretch'; label = '② 伸懒腰'; start = 0.62; }
    else if (sp >= 0.82) { pose = 'daily-gaming'; label = '③ 打游戏'; start = 0.82; }
    const age = Math.max(0, (sp - start) * SD(6));
    candidate(ctx, 405, 590, 39, t, pose, {
      seed: 6,
      poseBlend: clamp(age / 0.14),
      sq: age < 0.16 ? -0.08 * Math.sin((age / 0.16) * Math.PI) : 0
    });
    tag(ctx, 405, 150, label, PAL.gold, clamp(age / 0.18), 24);
    letter(ctx, '素材里真的有', 405, 104, 20, '#BAE6FD', {
      alpha: sp < 0.48 ? 0.95 : 0.55, stroke: false, ink: false
    });
    camEnd(ctx);
  }

  function shotB07RealOldActions(ctx, t, lt, dur) {
    const sp = cueP(t, 7);
    camBegin(ctx, W / 2, 360, 1.06 + 0.02 * ease(sp), 0);
    room(ctx, t, '#17305F');
    let action = null;
    let caption = '老版也有这三招';
    if (sp >= 0.04 && sp < 0.18) { action = 'eat_white_rice'; caption = '① 吃白饭'; }
    else if (sp >= 0.18 && sp < 0.32) { action = 'wake_stretch'; caption = '② 伸懒腰'; }
    else if (sp >= 0.32 && sp < 0.46) { action = 'token_wordle_sneak'; caption = '③ 打游戏'; }
    else if (sp >= 0.46) { caption = '差别在细节'; }
    drawTv(ctx, t, {
      highlight: true,
      label: '老版',
      action,
      caption,
      oldEmotion: 'happy',
      oldU: 20.5
    });
    candidate(ctx, 405, 588, 37, t, sp < 0.46 ? 'thinking' : 'idle-cute', {
      seed: 7, lookX: 0.55
    });
    tag(ctx, 405, 158, '新版', PAL.gold, 1, 22);
    if (sp >= 0.46) {
      letter(ctx, '眼睛 · 头发 · 衣服', 640, 104, 25, PAL.gold, {
        pop: popAt(t, 7, 0.46, 0.6), rot: -0.015
      });
    }
    camEnd(ctx);
  }

  function shotB08Identity(ctx, t, lt, dur) {
    const sp = cueP(t, 8);
    camBegin(ctx, W / 2, 360, 1.05 + 0.02 * ease(sp), 0);
    room(ctx, t, '#1B2B55');
    drawTv(ctx, t, {
      label: '老版', action: 'eat_white_rice', oldEmotion: 'happy'
    });
    candidate(ctx, 405, 590, 38, t, 'daily-eat', { seed: 8 });
    tag(ctx, 258, 250, '蓝头发', PAL.whaleCyan, popAt(t, 8, 0.1, 0.24), 19);
    tag(ctx, 574, 430, '大尾巴', PAL.whaleCyan, popAt(t, 8, 0.21, 0.35), 19);
    tag(ctx, 405, 164, '白饭碗', PAL.gold, popAt(t, 8, 0.4, 0.54), 19);
    camEnd(ctx);
  }

  function shotB09ReplyCount(ctx, t, lt, dur) {
    const sp = cueP(t, 9);
    camBegin(ctx, W / 2, 360, 1.04 + 0.02 * ease(sp), 0);
    room(ctx, t, '#1C2852');
    drawTv(ctx, t, {
      bubbles: 'scroll',
      label: '老版',
      countText: sp < 0.68 ? '200…' : '400+',
      oldEmotion: 'happy'
    });
    countBoard(ctx, t);
    candidate(ctx, 350, 590, 33, t, sp < 0.68 ? 'curious' : 'failure', { seed: 9 });
    camEnd(ctx);
  }

  function shotB10PrivateMessages(ctx, t, lt, dur) {
    const sp = cueP(t, 10);
    camBegin(ctx, W / 2, 360, 1.05 + 0.02 * ease(sp), 0);
    room(ctx, t, '#1C2852');
    drawTv(ctx, t, {
      bubbles: 'paused', label: '老版', oldEmotion: 'happy'
    });
    envelope(ctx, 642, 286, popAt(t, 10, 0.08, 0.3));
    tag(ctx, 642, 408, '暂时回不了', '#FCA5A5', popAt(t, 10, 0.24, 0.44), 20);
    candidate(ctx, 390, 588, 37, t, sp < 0.42 ? 'failure' : 'blush', { seed: 10 });
    camEnd(ctx);
  }

  function shotB11Question1816(ctx, t, lt, dur) {
    const sp = cueP(t, 11);
    camBegin(ctx, W / 2, 360, 1.05 + 0.03 * ease(sp), 0);
    room(ctx, t, '#12265E');
    residentDots(ctx, 1816, seg(sp, 0.24, 0.78), t, [58, 76, 1222, 430], 5);
    drawTv(ctx, t, { label: '老版', oldMove: 'wave', oldEmotion: 'happy' });
    candidate(ctx, 410, 590, 38, t, sp < 0.3 ? 'idle-cute' : 'greet', { seed: 11 });
    tag(ctx, 410, 158, '新版', PAL.gold, 1, 22);
    letter(ctx, '1816 位住户', 640, 104, 42, PAL.gold, {
      pop: popAt(t, 11, 0.32, 0.5), rot: -0.015
    });
    camEnd(ctx);
  }

  function shotB12EatAndWait(ctx, t, lt, dur) {
    const sp = cueP(t, 12);
    camBegin(ctx, W / 2, 360, 1.05 + 0.025 * ease(sp), 0);
    room(ctx, t, '#152A5E');
    residentDots(ctx, 1816, 0.42, t, [58, 76, 1222, 360], 7);
    drawTv(ctx, t, {
      label: '老版',
      action: 'eat_white_rice',
      caption: sp >= 0.7 ? '新版还是老版？' : '',
      captionK: popAt(t, 12, 0.7, 0.84),
      oldEmotion: 'happy'
    });
    candidate(ctx, 410, 590, 38, t, sp < 0.36 ? 'bold' : 'daily-eat', { seed: 12 });
    letter(ctx, sp < 0.7 ? '鲸鱼绝不摸鱼！' : '等你们开会结果', 640, 104, 38,
      sp < 0.7 ? PAL.gold : PAL.cream, {
        pop: sp < 0.7 ? popAt(t, 12, 0.02, 0.18) : popAt(t, 12, 0.7, 0.84),
        rot: -0.015
      });
    tag(ctx, 410, 158, '新版', PAL.gold, 1, 21);
    camEnd(ctx);
  }

  TIMELINE.chapter('day2_bonus_piper_draft', 0, TT.duration, [
    [C(1), shotB01Comment],
    [C(2), shotB02Reply],
    [C(3), shotB03Installed],
    [C(4), shotB04NewMain],
    [C(5), shotB05OldInTv],
    [C(6), shotB06RealCandidateActions],
    [C(7), shotB07RealOldActions],
    [C(8), shotB08Identity],
    [C(9), shotB09ReplyCount],
    [C(10), shotB10PrivateMessages],
    [C(11), shotB11Question1816],
    [C(12), shotB12EatAndWait]
  ]);

  const DAY2_BONUS_ALL = {
    shotB01Comment,
    shotB02Reply,
    shotB03Installed,
    shotB04NewMain,
    shotB05OldInTv,
    shotB06RealCandidateActions,
    shotB07RealOldActions,
    shotB08Identity,
    shotB09ReplyCount,
    shotB10PrivateMessages,
    shotB11Question1816,
    shotB12EatAndWait,
    drawTv
  };
  root.DAY2_BONUS_ALL = DAY2_BONUS_ALL;
  if (typeof module !== 'undefined' && module.exports) module.exports = DAY2_BONUS_ALL;
})(typeof window !== 'undefined' ? window : globalThis);

