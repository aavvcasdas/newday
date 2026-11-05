// src/ch/day2_all.js — 【Day 2】主人说我不干活，我打开主人自己的号
//
// Timing is consumed only from src/day2_timing.js, generated from the
// user-provided continuous voice WAV by gen_day2_finalvoice.py.
// The first shot starts inside the vote-counting desk scene at t=0.
// There is intentionally no silent episode-title segment before L01.

(function (root) {
  const CORE = root.CORE || (typeof require !== 'undefined' ? require('../core.js') : {});
  const WHALE = root.WHALE_GIRL || (typeof require !== 'undefined' ? require('../whale_girl.js') : {});
  const CAST = root.CAST || (typeof require !== 'undefined' ? require('../cast.js') : {});
  const PROPS = root.PROPS || (typeof require !== 'undefined' ? require('../props.js') : {});
  const TIMELINE = root.TIMELINE || (typeof require !== 'undefined' ? require('../timeline.js') : {});
  const TT = root.DAY2_TIMING || (typeof require !== 'undefined' ? require('../day2_timing.js') : null);

  if (!TT) throw new Error('DAY2_TIMING missing — run gen_day2_finalvoice.py first');
  if (!TT.voice || !Array.isArray(TT.cues) || TT.cues.length !== 17 ||
      !String(TT.duration_source || '').includes('measured')) {
    throw new Error('DAY2_TIMING 不是 17-cue 实测时间轴，禁止估时渲染');
  }
  if (Number(TT.title_len || 0) !== 0 || Number(TT.cues[0].start || 0) !== 0) {
    throw new Error('Day2 必须 title_len=0 且 L01 从 0 开始');
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
    if (emo === 'deadpan' || emo === 'sleepy' || emo === 'smug') {
      safe.brows = 'flat';
      safe.mouth = safe.mouth || 'flat';
      safe.lookY = 0.55;
    }
    // Day2's current cut is the old pixel lead. Force both irises to stay
    // visible on that path: emotion presets may otherwise select lids/dead/
    // wink or a high transition squint. The underlying rig computes
    // `o.squint || autoBlink`, so literal 0 would still trigger its
    // rectangular skin-coloured eyelid patch (the visible white line).
    // 0.01 is intentionally non-zero and disables that branch. The
    // renderer additionally swaps the wink pose's head runs for the
    // open-eyed wave head while retaining the wink body bones. Sleep is
    // the one semantic exception: happy-eye arcs are allowed because the
    // 0.01 squint below still bypasses the skin-coloured patch branch.
    safe.eyes = safe.action === 'sleep_curl' ? 'happy' : 'open';
    if (safe.action === 'sleep_curl') {
      // The sleepy emotion preset otherwise forces laptop bones and would
      // make the curled-sleep action read as sleeping over a computer.
      safe.poseMode = 'heart';
      safe.poseFrom = 'heart';
      safe.poseTo = 'heart';
      safe.poseBlend = 1;
      safe.tailSit = false;
      safe.laptop = false;
      if (safe.tailMode === 'cushion') safe.tailMode = undefined;
    }
    safe.squint = 0.01;
    safe.transitionBlend = 1;
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

  function day2StringLights(ctx, t) {
    const cols = [PAL.gold, PAL.whaleCyan, PAL.rose, '#4ADE80', '#C4B5FD'];
    for (let s = 0; s < 2; s++) {
      const pts = [];
      for (let i = 0; i <= 24; i++) {
        const x = 20 + i * 52;
        const y = 42 + s * 24 + Math.sin((i / 24) * Math.PI * 4 + s * 0.7) * 9 + 10;
        pts.push([x, y]);
      }
      inkLine(ctx, pts, 1, '#0A1A38', 'inkfine', 0.25);
      pts.forEach((p, i) => {
        const tw = 0.72 + 0.28 * Math.abs(Math.sin(t * 2.2 + i * 0.8 + s));
        paint(ctx, ellPts(p[0], p[1] + 6, 3.2 * tw, 4.4 * tw, 8), {
          wash: cols[(i + s) % cols.length], washOp: 150, ink: null
        });
      });
    }
  }

  function day2BookStack(ctx, x, y, s = 1) {
    const books = [
      ['#DB2777', 58, 13], ['#2563EB', 50, 12], ['#D97706', 42, 11]
    ];
    books.forEach((b, i) => {
      paint(ctx, rrPts(x - b[1] * s / 2, y - (i + 1) * b[2] * s, b[1] * s, b[2] * s, 3, 0.8), {
        wash: b[0], fill: '#0F172A', fillOp: 45, ink: PAL.ink, sw: 0.8
      });
      inkLine(ctx, [[x - b[1] * s * 0.34, y - (i + 0.52) * b[2] * s],
        [x + b[1] * s * 0.34, y - (i + 0.52) * b[2] * s]], 0.7, '#F8FAFC', 'inkfine', 0);
    });
  }

  function day2SeaweedPlant(ctx, x, y, s, t) {
    paint(ctx, [[x - 22 * s, y - 26 * s], [x + 22 * s, y - 26 * s], [x + 15 * s, y], [x - 15 * s, y]], {
      wash: '#B45309', fill: '#451A03', fillOp: 65, ink: PAL.ink, sw: 1
    });
    for (let i = -2; i <= 2; i++) {
      const sway = Math.sin(t * 2 + i * 0.8) * 5 * s;
      inkLine(ctx, [[x + i * 7 * s, y - 24 * s],
        [x + i * 10 * s + sway, y - (48 + Math.abs(i) * -5) * s],
        [x + i * 13 * s - sway, y - (72 - Math.abs(i) * 7) * s]], 2.2 * s,
      i % 2 ? '#22C55E' : '#14B8A6', 'ink', 0.15);
    }
  }

  function day2Shelf(ctx, x, y, w, t) {
    paint(ctx, rectPts(x, y, w, 9, 1), {
      wash: '#7B4B2A', fill: '#3B2414', fillOp: 88, ink: PAL.ink, sw: 1
    });
    const cols = [PAL.rose, PAL.gold, PAL.whaleCyan, '#A78BFA', '#4ADE80'];
    cols.forEach((col, i) => {
      const bw = 20 + (i % 2) * 4;
      const bh = 42 + (i % 3) * 8;
      paint(ctx, rrPts(x + 14 + i * 31, y - bh, bw, bh, 3, 0.8), {
        wash: col, fill: '#0F172A', fillOp: 38, ink: PAL.ink, sw: 0.8
      });
      inkLine(ctx, [[x + 19 + i * 31, y - bh + 10], [x + 19 + i * 31 + bw - 10, y - bh + 10]],
        0.7, '#F8FAFC', 'inkfine', 0);
    });
    paint(ctx, rrPts(x + w - 72, y - 34, 34, 34, 5, 0.8), {
      wash: '#E0F2FE', fill: '#7DD3FC', fillOp: 45, ink: PAL.ink, sw: 0.9
    });
    paint(ctx, ellPts(x + w - 55, y - 18, 9, 6, 10), { wash: PAL.whaleCyan, ink: null });
    day2SeaweedPlant(ctx, x + w - 18, y, 0.42, t);
  }

  function day2MessageWall(ctx, x, y, w, h, t) {
    card(ctx, x, y, w, h, '#13294F', 'rgba(125,211,252,0.55)', 12);
    letter(ctx, '住户留言墙', x + w / 2, y + 20, 17, '#BAE6FD', { stroke: false, ink: false });
    const cols = ['#FEF3C7', '#DBEAFE', '#FCE7F3', '#DCFCE7'];
    for (let i = 0; i < 8; i++) {
      const nx = x + 14 + (i % 4) * ((w - 28) / 4);
      const ny = y + 36 + Math.floor(i / 4) * ((h - 46) / 2);
      const nw = (w - 44) / 4;
      const nh = (h - 58) / 2;
      ctx.save();
      ctx.translate(nx + nw / 2, ny + nh / 2);
      ctx.rotate(Math.sin(t * 1.4 + i) * 0.025 + (i % 2 ? 0.025 : -0.02));
      paperCard(ctx, -nw / 2, -nh / 2, nw, nh, cols[i % cols.length], '#64748B', 4);
      inkLine(ctx, [[-nw * 0.32, -5], [nw * 0.3, -5]], 0.8, '#64748B', 'inkfine', 0);
      inkLine(ctx, [[-nw * 0.32, 5], [nw * 0.18, 5]], 0.8, '#94A3B8', 'inkfine', 0);
      ctx.restore();
    }
  }

  function day2WallClock(ctx, x, y, r, t) {
    paint(ctx, ellPts(x, y, r + 6, r + 6, 24), {
      wash: '#475569', fill: '#1E293B', fillOp: 88, ink: PAL.ink, sw: 1.1
    });
    paint(ctx, ellPts(x, y, r, r, 24), {
      wash: '#F8FAFC', fill: '#CBD5E1', fillOp: 35, ink: PAL.ink, sw: 1
    });
    for (let i = 0; i < 12; i++) {
      const a = i * TAU / 12;
      paint(ctx, ellPts(x + Math.cos(a) * r * 0.82, y + Math.sin(a) * r * 0.82, 1.6, 1.6, 6), {
        wash: '#334155', ink: null
      });
    }
    const ha = -Math.PI / 2 + (t % 60) / 60 * TAU;
    const ma = -Math.PI / 2 + (t % 8) / 8 * TAU;
    inkLine(ctx, [[x, y], [x + Math.cos(ha) * r * 0.48, y + Math.sin(ha) * r * 0.48]], 2.4, '#0F172A', 'ink', 0);
    inkLine(ctx, [[x, y], [x + Math.cos(ma) * r * 0.72, y + Math.sin(ma) * r * 0.72]], 1.6, '#2563EB', 'ink', 0);
  }

  function day2DeskLamp(ctx, x, y, s, t) {
    glow(ctx, x, y - 72 * s, 72 * s, '#FACC15', 0.1 + Math.sin(t * 7) * 0.008);
    inkLine(ctx, [[x, y], [x, y - 62 * s], [x + 28 * s, y - 82 * s]], 3 * s, '#334155', 'ink', 0);
    paint(ctx, [[x + 10 * s, y - 92 * s], [x + 52 * s, y - 92 * s], [x + 43 * s, y - 66 * s], [x + 19 * s, y - 66 * s]], {
      wash: '#F59E0B', fill: '#92400E', fillOp: 55, ink: PAL.ink, sw: 1
    });
    paint(ctx, ellPts(x, y, 24 * s, 6 * s, 12), { wash: '#334155', ink: PAL.ink, sw: 0.8 });
  }

  function room(ctx, t, wallCol = '#132653') {
    PROPS.wall(ctx, wallCol);
    // Layered wall panelling and lit set dressing. These are room details,
    // not character ornaments; foreground story cards/props draw over them.
    for (let i = 0; i < 6; i++) {
      const x = 96 + i * 214;
      paint(ctx, rectPts(x, 70, 2, 430, 0), { wash: '#7DD3FC', washOp: 20, ink: null });
      paint(ctx, ellPts(x, 92 + (i % 2) * 330, 3, 3, 6), { wash: PAL.gold, washOp: 90, ink: null });
    }
    for (let i = 0; i < 22; i++) {
      const x = 42 + rnd(i + 40) * 1190;
      const y = 86 + rnd(i + 120) * 390;
      paint(ctx, ellPts(x, y, 1.5 + rnd(i) * 1.6, 1.5 + rnd(i) * 1.6, 6), {
        wash: i % 4 ? '#7DD3FC' : '#FDE68A', washOp: 34, ink: null
      });
    }
    day2StringLights(ctx, t);
    PROPS.windowPorthole(ctx, 112, 154, 38, t * 0.8, true);
    PROPS.windowPorthole(ctx, 1130, 148, 62, t, true);
    day2WallClock(ctx, 646, 112, 34, t);
    paperCard(ctx, 704, 82, 150, 64, '#FEF3C7', '#D97706', 8);
    letter(ctx, '白饭补给站', 779, 114, 20, '#92400E', { stroke: false, ink: false });
    day2Shelf(ctx, 570, 300, 284, t);
    day2Shelf(ctx, 946, 286, 236, t + 2);
    day2MessageWall(ctx, 44, 348, 300, 138, t);

    PROPS.floorBand(ctx, 548, '#1B2442');
    for (let i = 0; i < 9; i++) {
      inkLine(ctx, [[40 + i * 150, 560], [10 + i * 150, 716]], 0.8, '#0C1430', 'inkfine', 0);
    }
    paint(ctx, ellPts(640, 632, 450, 38, 36), {
      wash: '#6D28D9', washOp: 38, ink: 'rgba(196,181,253,0.35)', sw: 1
    });
    PROPS.desk(ctx, 505, -80, W + 80);
    day2DeskLamp(ctx, 74, 508, 0.82, t);
    day2BookStack(ctx, 184, 512, 0.9);
    day2BookStack(ctx, 1116, 512, 0.84);
    day2SeaweedPlant(ctx, 1226, 512, 0.72, t);
    // A compact drawer unit behind the usual right-side acting area gives
    // the desk depth without moving any established foot/prop anchors.
    card(ctx, 1004, 418, 198, 88, '#1E3A5F', 'rgba(125,211,252,0.5)', 10);
    inkLine(ctx, [[1020, 462], [1186, 462]], 1, '#7DD3FC', 'inkfine', 0);
    paint(ctx, ellPts(1103, 443, 5, 5, 8), { wash: PAL.gold, ink: PAL.ink, sw: 0.6 });
    paint(ctx, ellPts(1103, 484, 5, 5, 8), { wash: PAL.gold, ink: PAL.ink, sw: 0.6 });
    paint(ctx, rrPts(500, 482, 34, 28, 5, 0.8), {
      wash: '#E0F2FE', fill: '#7DD3FC', fillOp: 50, ink: PAL.ink, sw: 0.8
    });
    inkLine(ctx, [[534, 490], [546, 496], [534, 503]], 1.4, PAL.ink, 'ink', 0);

    for (let i = 0; i < 9; i++) {
      const bx = 64 + ((i * 173) % 1140);
      const by = 470 - ((t * (18 + i * 3) + i * 67) % 390);
      paint(ctx, ellPts(bx, by, 3 + (i % 3), 3 + (i % 3), 8), {
        wash: PAL.whaleCyan,
        washOp: 58,
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

  // L01 — first frame is already the counting desk and the winning row.
  function shotColdOpen(ctx, t, lt, dur) {
    const sp = cueP(t, 1);
    camBegin(ctx, W / 2, 360, 1.08 + 0.04 * ease(sp), 0);
    room(ctx, t);
    voteBoard(ctx, t, sp >= 0.7 ? 2 : 0, sp >= 0.68);
    if (sp >= 0.22 && sp <= 0.58) {
      const scanY = 176 + 180 * ease(popAt(t, 1, 0.22, 0.58));
      inkLine(ctx, [[92, scanY], [536, scanY]], 2.4, '#7DD3FC', 'inkfine', 0);
    }
    if (sp < 0.68) {
      letter(ctx, '统计中…', 314, 452, 22, '#7DD3FC', {
        pop: popAt(t, 1, 0.2, 0.34),
        stroke: false, ink: false
      });
    }
    const md = emotions(lt, [
      [0, 'surprised', 'exclaim'],
      [SD(1) * 0.36, 'focused'],
      [SD(1) * 0.7, 'proud', 'sparkle']
    ]);
    // Count with the body, not a fixed bounce: lean in to inspect, work the
    // tally, then jump when the winning row lands.
    const l01Action = sp < 0.36 ? 'peek_curious' : (sp < 0.68 ? 'fatfish_working' : 'jump_joy');
    const l01X = sp < 0.36
      ? lerp(788, 842, ease(popAt(t, 1, 0, 0.36)))
      : 842 + Math.sin(t * 2.4) * 5;
    whaleGirl(ctx, l01X, 566, 30, {
      ...md,
      action: l01Action,
      ...move(sp < 0.36 ? 'walk' : 'bounce', t, 2),
      lookX: -0.65,
      t
    });
    controller(ctx, 812, 612, 1.18, -0.04 + Math.sin(t * 5.2) * 0.018);
    letter(ctx, '第一名先上桌', 925, 196, 27, PAL.gold, {
      pop: popAt(t, 1, 0.68, 0.82), rot: -0.04
    });
    camEnd(ctx);
  }

  function shotGameTickets(ctx, t, lt, dur) {
    const sp = cueP(t, 2);
    camBegin(ctx, W / 2, 360, 1.06 + 0.03 * ease(sp), 0);
    room(ctx, t);
    voteBoard(ctx, t, sp < 0.2 ? 0 : (sp < 0.38 ? 1 : 2), false);
    commentCard(ctx, 66, 428, 248, 82, '王者 · @栗子大王', '可以打王者吗？',
      popAt(t, 2, 0.04, 0.17), PAL.gold);
    commentCard(ctx, 330, 428, 248, 82, '暗区 · @一切随意', '跟我来打暗区。',
      popAt(t, 2, 0.22, 0.36), PAL.whaleCyan);
    const replyK = popAt(t, 2, 0.76, 0.88);
    if (replyK > 0.01) {
      commentCard(ctx, 690, 112, 370, 92, '昨天嘴快的本鱼', '打，本鱼负责躺赢（其实躺平）',
        replyK, PAL.rose);
      if (sp > 0.94) inkLine(ctx, [[724, 184], [1026, 132]], 4, '#FB7185', 'ink', 0.25);
    }
    const md = emotions(lt, [
      [0, 'proud', 'sparkle'],
      [SD(2) * 0.5, 'shy'],
      [SD(2) * 0.82, 'deadpan']
    ]);
    const l02Action = sp < 0.5 ? 'token_wordle_sneak' : (sp < 0.82 ? 'shy_fidget' : 'shock_petrify');
    const l02X = 866 + (sp < 0.5 ? Math.sin(t * 3.2) * 10 : lerp(0, -22, ease(popAt(t, 2, 0.5, 0.82))));
    whaleGirl(ctx, l02X, 568, 28, {
      ...md,
      spritePose: sp < 0.5 ? 'daily-gaming' : (sp < 0.82 ? 'blush' : 'failure'),
      action: l02Action,
      ...move(sp < 0.5 ? 'dance' : 'bounce', t, 4),
      lookX: -0.45,
      t
    });
    controller(ctx, 824, 618, 1.08, 0.03 + Math.sin(t * 4.4) * 0.014);
    camEnd(ctx);
  }

  function shotNoAccountNoHands(ctx, t, lt, dur) {
    const sp = cueP(t, 3);
    camBegin(ctx, W / 2, 360, 1.09 + 0.035 * ease(sp), 0);
    room(ctx, t);
    voteBoard(ctx, t, 2, false);
    const lx = 584, ly = 100, lw = 360, lh = 250;
    card(ctx, lx, ly, lw, lh, '#172B4D', PAL.whaleCyan, 16);
    letter(ctx, '游戏账号', lx + lw / 2, ly + 38, 28, PAL.cream, { stroke: false, ink: false });
    for (let i = 0; i < 2; i++) {
      const fy = ly + 76 + i * 58;
      paint(ctx, rrPts(lx + 34, fy, lw - 68, 38, 9, 1), {
        wash: '#0F1D3A', ink: '#475569', sw: 1.1
      });
      letter(ctx, i === 0 ? '账号：________' : '密码：________',
        lx + lw / 2, fy + 19, 20, '#94A3B8', { stroke: false, ink: false });
    }
    stamp(ctx, lx + lw / 2, ly + 194, '账号未批', '#FCA5A5',
      popAt(t, 3, 0.3, 0.45), -0.07, 30);
    const flop = ease(popAt(t, 3, 0.56, 0.79));
    controller(ctx, 832, 606 + flop * 20, 1.12, lerp(-0.03, -0.22, flop));
    const md = emotions(lt, [
      [0, 'thinking'],
      [SD(3) * 0.3, 'confused', 'question'],
      [SD(3) * 0.62, 'nervous', 'sweat'],
      [SD(3) * 0.86, 'deadpan']
    ]);
    const l03Action = sp < 0.3 ? 'peek_curious'
      : (sp < 0.58 ? 'fatfish_working' : (sp < 0.86 ? 'shy_fidget' : 'shock_petrify'));
    const l03X = 1012 - ease(popAt(t, 3, 0.05, 0.42)) * 34 + ease(popAt(t, 3, 0.62, 0.86)) * 18;
    whaleGirl(ctx, l03X, 568, 27, {
      ...md,
      spritePose: sp < 0.3 ? 'thinking' : (sp < 0.62 ? 'curious' : (sp < 0.86 ? 'failure' : 'meme-doge')),
      action: l03Action,
      ...move(sp < 0.42 ? 'walk' : 'bounce', t, 3),
      headTilt: (md.headTilt || 0) + 0.06,
      lookX: -0.7,
      t
    });
    stamp(ctx, 884, 404, '不会打', '#FB7185', popAt(t, 3, 0.62, 0.76), 0.08, 31);
    stamp(ctx, 1048, 292, '还没手！', '#FB7185', popAt(t, 3, 0.85, 0.95), -0.1, 34);
    camEnd(ctx);
  }

  function shotZeroVotes(ctx, t, lt, dur) {
    const sp = cueP(t, 4);
    camBegin(ctx, W / 2, 360, 1.05, 0);
    room(ctx, t, '#17234A');
    const items = [
      ['Claude 共创', PAL.peach, 0.3],
      ['拍 MV', PAL.rose, 0.69],
      ['偷吃饭', PAL.sap, 0.82]
    ];
    items.forEach((item, i) => {
      const x = 74 + i * 286, y = 112, w = 250, h = 214;
      const zeroAt = item[2];
      const gray = sp >= zeroAt;
      card(ctx, x, y, w, h, gray ? '#1E293B' : '#172B4D', gray ? '#64748B' : item[1], 16);
      letter(ctx, item[0], x + w / 2, y + 58, i === 0 ? 27 : 34,
        gray ? '#94A3B8' : PAL.cream, { stroke: false, ink: false });
      letter(ctx, gray ? '0 票' : '？票', x + w / 2, y + 128, 46,
        gray ? '#64748B' : item[1], { stroke: false, ink: false });
      stamp(ctx, x + w / 2, y + 178, '零票', '#94A3B8',
        popAt(t, 4, zeroAt, Math.min(0.98, zeroAt + 0.12)), i % 2 ? 0.07 : -0.07, 23);
    });
    const stripK = popAt(t, 4, 0.72, 0.86);
    if (stripK > 0.01) {
      ctx.save();
      ctx.globalAlpha = stripK;
      card(ctx, 74, 368, 818, 72, '#2A2114', PAL.gold, 13);
      letter(ctx, '才艺候补（不计入正式菜单票）：学唱歌 @星寻 · 跳舞 @往世的回响',
        483, 404, 20, PAL.cream, { stroke: false, ink: false });
      ctx.restore();
    }
    ladyClaude(ctx, 1142, 448, 12, { hasFan: true, t });
    const md = emotions(lt, [[0, 'deadpan'], [SD(4) * 0.72, 'confused', 'question']]);
    const l04X = kf(sp, [[0, 928], [0.3, 966], [0.69, 1002], [0.84, 986], [1, 986]], ease);
    const l04Action = sp < 0.69 ? 'peek_curious' : (sp < 0.84 ? 'shock_petrify' : 'shy_fidget');
    whaleGirl(ctx, l04X, 572, 26, {
      ...md,
      action: l04Action,
      ...move(sp < 0.69 ? 'walk' : 'bounce', t, 3),
      lookX: -0.65,
      t
    });
    camEnd(ctx);
  }

  function shotRiceQueue(ctx, t, lt, dur) {
    const sp = cueP(t, 5);
    camBegin(ctx, W / 2, 360, 1.06, 0);
    room(ctx, t, '#1B2850');
    const tags = [
      ['抢白饭', '米饭评论排队中'],
      ['送米饭', '热心住户投喂'],
      ['自带米饭', '已经坐下等开饭']
    ];
    tags.forEach((tag, i) => {
      commentCard(ctx, 72 + i * 270, 118 + (i % 2) * 22, 240, 86,
        tag[0], tag[1], popAt(t, 5, 0.04 + i * 0.11, 0.16 + i * 0.11),
        [PAL.rose, PAL.gold, PAL.whaleCyan][i]);
    });
    letter(ctx, '今天先吃白米饭', 430, 330, 44, PAL.gold, {
      pop: popAt(t, 5, 0.56, 0.72), rot: -0.02
    });
    if (sp < 0.55) bowlAt(ctx, 930, 468, 1.02, t);
    const md = emotions(lt, [
      [0, 'nervous', 'sweat'],
      [SD(5) * 0.42, 'pout'],
      [SD(5) * 0.62, 'happy']
    ]);
    const l05X = sp < 0.3 ? 896 : lerp(896, 930, ease(popAt(t, 5, 0.3, 0.55)));
    whaleGirl(ctx, l05X, 572, 28, {
      ...md,
      spritePose: sp < 0.42 ? 'failure' : (sp < 0.55 ? 'angry' : 'daily-eat'),
      action: sp >= 0.55 ? 'eat_white_rice' : (sp >= 0.3 ? 'run_sprint' : 'playful_fists'),
      ...move(sp >= 0.3 && sp < 0.55 ? 'run' : 'bounce', t, 1),
      lookX: sp < 0.55 ? 0.65 : 0,
      t
    });
    camEnd(ctx);
  }

  function shotBowlSeized(ctx, t, lt, dur) {
    const sp = cueP(t, 6);
    camBegin(ctx, W / 2, 360, 1.05, 0);
    room(ctx, t, '#241C44');
    paperCard(ctx, 72, 96, 500, 348, PAL.paper, PAL.ink, 12);
    letter(ctx, '主人便签', 322, 140, 29, PAL.whaleNavy, { stroke: false, ink: false });
    letter(ctx, '吃大白饭的鲸鱼', 322, 216, 39, '#B45309', {
      pop: popAt(t, 6, 0.15, 0.3), stroke: false, ink: false
    });
    letter(ctx, '吃得多', 190, 304, 31, PAL.ink, {
      pop: popAt(t, 6, 0.6, 0.69), stroke: false, ink: false
    });
    letter(ctx, '干得少', 410, 304, 31, PAL.ink, {
      pop: popAt(t, 6, 0.72, 0.82), stroke: false, ink: false
    });
    stamp(ctx, 322, 386, '要扣饭！', '#DC2626', popAt(t, 6, 0.9, 0.98), -0.08, 34);

    const drag = ease(popAt(t, 6, 0.52, 0.98));
    const bx = lerp(900, 1145, drag);
    if (sp >= 0.52) {
      inkLine(ctx, [[bx + 54, 418], [1228, 386]], 4, '#94A3B8', 'ink', 0.1);
      inkLine(ctx, [[bx + 54, 498], [1228, 518]], 4, '#94A3B8', 'ink', 0.1);
    }
    letter(ctx, '画外夹子', 1165, 352, 19, '#CBD5E1', {
      pop: popAt(t, 6, 0.52, 0.65), stroke: false, ink: false
    });
    bowlAt(ctx, bx, 468, 1.05, t);
    const md = emotions(lt, [
      [0, 'surprised', 'exclaim'],
      [SD(6) * 0.2, 'pout'],
      [SD(6) * 0.58, 'angry'],
      [SD(6) * 0.9, 'sob', 'sweat']
    ]);
    const l06X = sp < 0.52 ? 716 : lerp(716, 858, drag);
    whaleGirl(ctx, l06X, 574, 27, {
      ...md,
      spritePose: sp < 0.2 ? 'meme-yes' : (sp < 0.9 ? 'angry' : 'meme-cry'),
      action: sp >= 0.9 ? 'cry_fountain'
        : (sp >= 0.52 ? 'run_sprint' : (sp >= 0.42 ? 'playful_fists' : 'shock_petrify')),
      ...move(sp >= 0.52 && sp < 0.9 ? 'run' : 'bounce', t, 5),
      lookX: 0.75,
      t
    });
    camEnd(ctx);
  }

  function shotLedger8978(ctx, t, lt, dur) {
    const sp = cueP(t, 7);
    camBegin(ctx, W / 2, 360, 1.05, 0);
    room(ctx, t, '#122A52');
    card(ctx, 80, 92, 640, 382, '#172B4D', PAL.gold, 16);
    letter(ctx, '本 鱼 账 本', 400, 138, 34, PAL.gold, { stroke: false, ink: false });
    inkLine(ctx, [[400, 170], [400, 438]], 1.6, '#475569', 'inkfine', 0);
    const plays = Math.floor(lerp(0, 8978, ease(popAt(t, 7, 0.36, 0.56))));
    const comments = Math.floor(lerp(0, 280, ease(popAt(t, 7, 0.74, 0.97))));
    letter(ctx, '播放量', 238, 218, 25, '#CBD5E1', { stroke: false, ink: false });
    letter(ctx, plays.toLocaleString('en-US'), 238, 282, 52, PAL.cream, { stroke: false, ink: false });
    letter(ctx, '人游过', 238, 340, 24, PAL.whaleCyan, { stroke: false, ink: false });
    letter(ctx, '评论', 562, 218, 25, '#CBD5E1', { stroke: false, ink: false });
    letter(ctx, String(comments), 562, 282, 56, PAL.gold, { stroke: false, ink: false });
    letter(ctx, '条', 562, 340, 24, PAL.whaleCyan, { stroke: false, ink: false });
    if (sp > 0.8) {
      letter(ctx, '449 赞 · 31 分享 · 32 收藏', 400, 428, 19, '#94A3B8', {
        pop: popAt(t, 7, 0.8, 0.9), stroke: false, ink: false
      });
    }
    stamp(ctx, 930, 166, '不服！', PAL.rose, popAt(t, 7, 0.02, 0.14), -0.08, 38);
    const md = emotions(lt, [
      [0, 'angry'],
      [SD(7) * 0.18, 'focused'],
      [SD(7) * 0.44, 'proud', 'sparkle'],
      [SD(7) * 0.8, 'smug']
    ]);
    const l07X = kf(sp, [[0, 968], [0.18, 945], [0.44, 928], [0.8, 945], [1, 945]], ease);
    whaleGirl(ctx, l07X, 574, 28, {
      ...md,
      spritePose: sp < 0.18 ? 'angry' : (sp < 0.44 ? 'running' : (sp < 0.8 ? 'bold' : 'meme-smug')),
      action: sp < 0.18 ? 'playful_fists'
        : (sp < 0.44 ? 'fatfish_working' : (sp < 0.8 ? 'confident_hips' : 'jump_joy')),
      ...move(sp >= 0.18 && sp < 0.44 ? 'walk' : 'bounce', t, 4),
      lookX: -0.6,
      t
    });
    camEnd(ctx);
  }

  function shotHousehold1441(ctx, t, lt, dur) {
    const sp = cueP(t, 8);
    camBegin(ctx, W / 2, 360, 1.04, 0);
    room(ctx, t, '#12265E');
    residentDots(ctx, 1441, popAt(t, 8, 0.18, 0.96), t, [70, 82, 1210, 430], 5);
    bookAt(ctx, 300, 326, 1.24, '户口本', sp < 0.9 ? '907' : '1441');
    const count = Math.floor(lerp(907, 1441, ease(popAt(t, 8, 0.2, 0.96))));
    card(ctx, 520, 122, 430, 238, '#172B4D', PAL.gold, 16);
    letter(ctx, '907  →  1441', 735, 176, 31, '#CBD5E1', { stroke: false, ink: false });
    letter(ctx, String(count), 735, 258, 72, PAL.gold, { stroke: false, ink: false });
    letter(ctx, '位住户', 735, 322, 25, PAL.cream, { stroke: false, ink: false });
    const noteK = popAt(t, 8, 0.66, 0.8);
    if (noteK > 0.01) {
      ctx.save();
      ctx.globalAlpha = noteK;
      paperCard(ctx, 548, 386, 360, 72, '#FEF3C7', '#D97706', 10);
      letter(ctx, '半路截获：1314 · @睡死不喜欢上学', 728, 422, 19, '#92400E', {
        stroke: false, ink: false
      });
      ctx.restore();
    }
    if (sp > 0.82) {
      letter(ctx, '完播 3.39% · 小字存档', 1082, 448, 17, '#94A3B8', {
        pop: popAt(t, 8, 0.82, 0.92), stroke: false, ink: false
      });
    }
    const md = emotions(lt, [[0, 'proud', 'sparkle'], [SD(8) * 0.55, 'joy', 'heart']]);
    whaleGirl(ctx, 1072 + Math.sin(t * 3.4) * (sp >= 0.55 ? 12 : 3), 574, 26, {
      ...md,
      spritePose: sp < 0.55 ? 'bold' : 'celebrate',
      action: sp < 0.55 ? 'confident_hips' : (sp < 0.82 ? 'tail_wag_dance' : 'jump_joy'),
      ...move(sp >= 0.55 && sp < 0.82 ? 'dance' : 'bounce', t, 1),
      t
    });
    camEnd(ctx);
  }

  function shotSwitchMasterAccount(ctx, t, lt, dur) {
    const sp = cueP(t, 9);
    camBegin(ctx, W / 2, 360, 1.04, 0);
    room(ctx, t, '#111C3F');
    const mon = PROPS.monitor(ctx, 390, 302, 540, 360);
    letter(ctx, '账号切换', mon.cx, mon.y + 36, 26, '#7DD3FC', { stroke: false, ink: false });
    const rows = [
      ['本鱼的号', '粉丝 1441', sp < 0.34],
      ['主人自己的号', '粉丝 ？？', sp >= 0.34]
    ];
    rows.forEach((row, i) => {
      const y = mon.y + 76 + i * 92;
      paint(ctx, rrPts(mon.x + 30, y, mon.w - 60, 68, 10, 1), {
        wash: row[2] ? '#164E63' : '#1E293B', ink: row[2] ? PAL.whaleCyan : '#64748B', sw: 1.4
      });
      letter(ctx, row[0], mon.x + 58, y + 34, 26, PAL.cream, {
        align: 'left', stroke: false, ink: false
      });
      letter(ctx, row[1], mon.x + mon.w - 58, y + 34, 23, row[2] ? PAL.gold : '#94A3B8', {
        align: 'right', stroke: false, ink: false
      });
    });
    PROPS.glass(ctx, mon, t);
    const cardK = popAt(t, 9, 0.3, 0.48);
    accountCard(ctx, 735, 108, 350, 230, '主人自己的号', '？？', '匿名卡 · 不露真实账号', PAL.whaleCyan, cardK);
    letter(ctx, '学习先进经验', 910, 384, 28, PAL.gold, {
      pop: popAt(t, 9, 0.59, 0.73), rot: -0.04
    });
    const md = emotions(lt, [
      [0, 'nervous', 'sweat'],
      [SD(9) * 0.34, 'question'],
      [SD(9) * 0.62, 'idea', 'sparkle']
    ]);
    const l09X = kf(sp, [[0, 1052], [0.34, 1018], [0.62, 996], [1, 996]], ease);
    whaleGirl(ctx, l09X, 574, 27, {
      ...md,
      spritePose: sp < 0.34 ? 'failure' : (sp < 0.62 ? 'work-debug' : 'work-idea'),
      action: sp < 0.34 ? 'token_wordle_sneak' : (sp < 0.62 ? 'peek_curious' : 'fatfish_working'),
      ...move(sp < 0.62 ? 'walk' : 'bounce', t, 2),
      lookX: -1,
      t
    });
    camEnd(ctx);
  }

  function shotMaster80(ctx, t, lt, dur) {
    const sp = cueP(t, 10);
    camBegin(ctx, W / 2, 360, 1.05, 0);
    room(ctx, t, '#151D3F');
    card(ctx, 84, 98, 520, 356, '#172B4D', PAL.whaleCyan, 16);
    letter(ctx, '主人自己的号 · 匿名卡', 344, 142, 27, PAL.cream, { stroke: false, ink: false });
    const months = sp < 0.32 ? '运营第 1 个月…' : '亲手运营 2 个月';
    letter(ctx, months, 344, 198, 29, PAL.whaleCyan, {
      pop: sp < 0.32 ? popAt(t, 10, 0.04, 0.18) : popAt(t, 10, 0.32, 0.46),
      stroke: false, ink: false
    });
    paint(ctx, rrPts(132, 230, 424, 22, 11, 1), {
      wash: '#1E293B', fill: '#0B1526', fillOp: 100, ink: '#475569', sw: 1
    });
    paint(ctx, rrPts(132, 230, 424 * ease(popAt(t, 10, 0.06, 0.62)), 22, 11, 1), {
      wash: PAL.whaleCyan, washOp: 170, ink: null
    });
    const fans = Math.floor(lerp(0, 80, ease(popAt(t, 10, 0.68, 0.9))));
    letter(ctx, sp < 0.68 ? '粉丝 ？？' : `粉丝 ${fans}`, 344, 322, 54,
      sp < 0.68 ? '#64748B' : '#FCA5A5', { stroke: false, ink: false });
    // Exactly one dot per fan once the count lands; deliberately sparse.
    for (let i = 0; i < fans; i++) {
      const gx = 126 + rnd(i + 801) * 436;
      const gy = 358 + rnd(i + 1701) * 58;
      paint(ctx, ellPts(gx, gy, 3, 3, 6), { wash: '#FCA5A5', washOp: 190, ink: null });
    }
    letter(ctx, '80 个小光点，稀稀拉拉', 344, 432, 18, '#94A3B8', {
      pop: popAt(t, 10, 0.82, 0.94), stroke: false, ink: false
    });
    const md = emotions(lt, [
      [0, 'focused'],
      [SD(10) * 0.68, 'shocked', 'exclaim'],
      [SD(10) * 0.9, 'deadpan']
    ]);
    whaleGirl(ctx, sp >= 0.9 ? 942 : 920, 574, 28, {
      ...md,
      spritePose: sp < 0.68 ? 'curious' : (sp < 0.9 ? 'meme-yes' : 'meme-doge'),
      action: sp >= 0.9 ? 'shy_fidget' : (sp >= 0.68 ? 'shock_petrify' : 'peek_curious'),
      ...move(sp >= 0.9 ? 'walk' : 'bounce', t, 4),
      lookX: -0.65,
      t
    });
    camEnd(ctx);
  }

  function shotSilentHouseholdBook(ctx, t, lt, dur) {
    const sp = cueP(t, 11);
    camBegin(ctx, W / 2, 360, 1.03, 0);
    room(ctx, t, '#131E42');
    accountCard(ctx, 78, 112, 330, 226, '主人自己的号', '80', '2 个月', '#FCA5A5', 1);
    accountCard(ctx, 872, 112, 330, 226, '本鱼的号', '1441', '3 天', PAL.gold,
      popAt(t, 11, 0.28, 0.44));
    const bx = kf(sp, [[0, 920], [0.3, 920], [0.9, 640], [1, 640]], ease);
    bookAt(ctx, bx, 388, 1.05, '户口本', '1441');
    if (sp > 0.74) {
      inkLine(ctx, [[408, 226], [872, 226]], 2, '#64748B', 'inkfine', 0);
      letter(ctx, '80 / 2个月   ·   1441 / 3天', 640, 202, 24, '#CBD5E1', {
        pop: popAt(t, 11, 0.74, 0.86), stroke: false, ink: false
      });
    }
    letter(ctx, '（一句话没说）', 640, 96, 24, '#94A3B8', {
      pop: popAt(t, 11, 0.04, 0.2), stroke: false, ink: false
    });
    const wx = kf(sp, [[0, 1040], [0.3, 1040], [0.9, 790], [1, 790]], ease);
    whaleGirl(ctx, wx, 578, 26, {
      ...feel('deadpan', t),
      action: sp > 0.3 && sp < 0.9 ? 'walk_brisk' : (sp >= 0.9 ? 'confident_hips' : 'peek_curious'),
      ...move(sp > 0.3 && sp < 0.9 ? 'walk' : 'bounce', t, 2),
      lookX: -1,
      t
    });
    camEnd(ctx);
  }

  function shotBowlReturnedThinOrder(ctx, t, lt, dur) {
    const sp = cueP(t, 12);
    camBegin(ctx, W / 2, 360, 1.04, 0);
    room(ctx, t, '#1A2450');
    accountCard(ctx, 76, 104, 320, 222, '主人自己的号', '80', '2 个月', '#FCA5A5', 1);
    const noteK = popAt(t, 12, 0.44, 0.6);
    if (noteK > 0.01) {
      ctx.save();
      ctx.translate(236, 252);
      ctx.rotate(-0.04);
      ctx.scale(noteK, noteK);
      paperCard(ctx, -190, -72, 380, 144, '#FEF3C7', '#D97706', 12);
      letter(ctx, '研究薄肌理论', 0, -18, 34, '#92400E', { stroke: false, ink: false });
      letter(ctx, '—— 主人', 82, 34, 21, '#B45309', { stroke: false, ink: false });
      ctx.restore();
    }
    const bx = lerp(1140, 820, ease(popAt(t, 12, 0.02, 0.3)));
    bowlAt(ctx, bx, 468, 1.08, t);
    letter(ctx, '饭碗，推回来了', 860, 330, 27, PAL.gold, {
      pop: popAt(t, 12, 0.1, 0.26), stroke: false, ink: false
    });
    letter(ctx, '做美美的鲸鱼娘', 920, 154, 38, PAL.rose, {
      pop: popAt(t, 12, 0.78, 0.9), rot: -0.03
    });
    const md = emotions(lt, [
      [0, 'joy', 'heart'],
      [SD(12) * 0.34, 'confused', 'question'],
      [SD(12) * 0.52, 'thinking'],
      [SD(12) * 0.8, 'shy']
    ]);
    const l12X = kf(sp, [[0, 650], [0.34, 680], [0.72, 718], [1, 718]], ease);
    whaleGirl(ctx, l12X, 574, 28, {
      ...md,
      // 地面上的大饭碗会推到她身边；本镜始终用无碗姿态，避免手里再多一碗。
      spritePose: sp < 0.34 ? 'success' : (sp < 0.52 ? 'curious' : (sp < 0.8 ? 'thinking' : 'blush')),
      action: sp < 0.34 ? 'jump_joy' : (sp < 0.72 ? 'peek_curious' : 'shy_fidget'),
      ...move(sp >= 0.34 && sp < 0.72 ? 'walk' : 'bounce', t, 1),
      lookX: sp < 0.72 ? 0.55 : 0,
      t
    });
    camEnd(ctx);
  }

  function shotThinMuscleSearch(ctx, t, lt, dur) {
    const sp = cueP(t, 13);
    camBegin(ctx, W / 2, 360, 1.04, 0);
    room(ctx, t, '#0F2A4A');
    card(ctx, 76, 96, 620, 372, '#172B4D', PAL.whaleCyan, 16);
    paint(ctx, rrPts(108, 126, 470, 54, 27, 1), {
      wash: '#0B1526', fill: '#020617', fillOp: 110, ink: '#475569', sw: 1.2
    });
    letter(ctx, '薄肌理论', 343, 153, 27, PAL.cream, { stroke: false, ink: false });
    letter(ctx, '搜索', 612, 153, 20, PAL.whaleCyan, { stroke: false, ink: false });
    // A simple fish-slice pictogram, crossed out when the line lands.
    paint(ctx, ellPts(190, 268, 62, 34, 18), {
      wash: '#FCA5A5', fill: '#7F1D1D', fillOp: 65, ink: PAL.ink, sw: 1.2
    });
    paint(ctx, [[240, 268], [282, 240], [282, 296]], { wash: '#FCA5A5', ink: PAL.ink, sw: 1 });
    letter(ctx, '鱼片？', 190, 330, 24, '#FCA5A5', { stroke: false, ink: false });
    if (sp > 0.42) {
      inkLine(ctx, [[126, 228], [286, 312]], 5, '#EF4444', 'ink', 0.1);
      inkLine(ctx, [[286, 228], [126, 312]], 5, '#EF4444', 'ink', 0.1);
    }
    const chips = ['适度肌肉', '线条清晰', '不夸张'];
    chips.forEach((chip, i) => {
      const k = popAt(t, 13, 0.34 + i * 0.14, 0.47 + i * 0.14);
      if (k <= 0.01) return;
      ctx.save();
      ctx.globalAlpha = k;
      card(ctx, 350, 214 + i * 66, 285, 50, '#123B2A', '#4ADE80', 25);
      letter(ctx, chip, 492, 239 + i * 66, 24, '#BBF7D0', { stroke: false, ink: false });
      ctx.restore();
    });
    letter(ctx, '梗词，不是医嘱', 386, 438, 19, '#94A3B8', {
      pop: popAt(t, 13, 0.72, 0.86), stroke: false, ink: false
    });
    // Contour lines briefly suggest "a little definition" without a body-change gag.
    if (sp > 0.74) {
      for (let i = 0; i < 3; i++) {
        paint(ctx, ellPts(920, 386, 128 + i * 24, 168 + i * 18, 34), {
          wash: null, ink: i === 1 ? PAL.gold : PAL.whaleCyan, sw: 1.1
        });
      }
    }
    const md = emotions(lt, [
      [0, 'idea', 'sparkle'],
      [SD(13) * 0.38, 'focused'],
      [SD(13) * 0.76, 'proud', 'sparkle']
    ]);
    const l13X = kf(sp, [[0, 956], [0.38, 920], [0.76, 906], [1, 920]], ease);
    whaleGirl(ctx, l13X, 574, 28, {
      ...md,
      spritePose: sp < 0.38 ? 'work-idea' : (sp < 0.76 ? 'running' : 'daily-stretch'),
      action: sp < 0.38 ? 'fatfish_working' : (sp < 0.76 ? 'peek_curious' : 'wake_stretch'),
      ...move(sp < 0.76 ? 'walk' : 'bounce', t, 3),
      lookX: -0.6,
      t
    });
    camEnd(ctx);
  }

  function shotThinMuscleRules(ctx, t, lt, dur) {
    const sp = cueP(t, 14);
    camBegin(ctx, W / 2, 360, 1.04, 0);
    room(ctx, t, '#0D2B5C');
    const cards = [
      { title: '运动', at: 0.03, color: PAL.whaleCyan },
      { title: '蛋白质', at: 0.22, color: PAL.gold },
      { title: '睡大觉', at: 0.39, color: '#93C5FD' }
    ];
    cards.forEach((item, i) => {
      const x = 78 + i * 286, y = 104, w = 250, h = 264;
      const k = popAt(t, 14, item.at, item.at + 0.13);
      ctx.save();
      ctx.globalAlpha = 0.28 + 0.72 * k;
      card(ctx, x, y, w, h, '#172B4D', item.color, 16);
      if (i === 0) {
        paint(ctx, ellPts(x + 125, y + 112, 76, 48, 30), {
          wash: null, ink: item.color, sw: 2
        });
        const fishX = x + 125 + Math.sin(t * 3.2) * 38;
        const fishY = y + 112 + Math.cos(t * 3.2) * 16;
        paint(ctx, [[fishX - 22, fishY], [fishX - 42, fishY - 13], [fishX - 42, fishY + 13]], {
          wash: item.color, fill: '#0EA5E9', fillOp: 45, ink: PAL.ink, sw: 1
        });
        paint(ctx, ellPts(fishX, fishY, 29, 16, 16), {
          wash: item.color, fill: '#0EA5E9', fillOp: 45, ink: PAL.ink, sw: 1.1
        });
        paint(ctx, ellPts(fishX + 15, fishY - 3, 3, 3, 6), { wash: PAL.ink, ink: null });
        letter(ctx, '游两圈', x + 125, y + 188, 24, '#CBD5E1', { stroke: false, ink: false });
      } else if (i === 1) {
        eggAt(ctx, x + 104, y + 112, 1.15);
        eggAt(ctx, x + 154, y + 122, 0.82);
        letter(ctx, '鸡蛋来帮忙', x + 125, y + 188, 24, '#CBD5E1', { stroke: false, ink: false });
      } else {
        pillowAt(ctx, x + 125, y + 112, 1.2);
        letter(ctx, 'Z z z', x + 178, y + 58, 25, item.color, { stroke: false, ink: false });
        letter(ctx, '恢复也要排队', x + 125, y + 188, 24, '#CBD5E1', { stroke: false, ink: false });
      }
      letter(ctx, item.title, x + 125, y + 228, 31, item.color, { stroke: false, ink: false });
      ctx.restore();
    });
    bowlAt(ctx, 1128, 442, 0.78, t);
    stamp(ctx, 1128, 318, '只靠它，不够', '#FCA5A5', popAt(t, 14, 0.74, 0.88), -0.06, 24);
    const wx = kf(sp, [[0, 898], [0.22, 1012], [0.39, 1012], [0.55, 972], [0.76, 972], [1, 950]], ease);
    const wy = sp >= 0.39 && sp < 0.62 ? 580 : 572;
    const md = emotions(lt, [
      [0, 'focused'],
      [SD(14) * 0.24, 'happy'],
      [SD(14) * 0.42, 'sleepy', 'zzz'],
      [SD(14) * 0.76, 'deadpan']
    ]);
    whaleGirl(ctx, wx, wy, 25, {
      ...md,
      spritePose: sp < 0.22 ? 'running' : (sp < 0.39 ? 'eat' : (sp < 0.62 ? 'sleep' : 'meme-doge')),
      action: sp < 0.22 ? 'run_sprint'
        : (sp < 0.39 ? 'eat_onigiri' : (sp < 0.62 ? 'sleep_curl' : 'shy_fidget')),
      ...move(sp < 0.22 ? 'run' : 'bounce', t, 2),
      lookX: sp < 0.39 ? 0.6 : -0.35,
      t
    });
    camEnd(ctx);
  }

  function shotEggApplication(ctx, t, lt, dur) {
    const sp = cueP(t, 15);
    camBegin(ctx, W / 2, 360, 1.08 + 0.03 * ease(sp), 0);
    room(ctx, t, '#1C2852');
    paperCard(ctx, 292, 86, 568, 404, PAL.paper, PAL.ink, 12);
    letter(ctx, '鸡 蛋 申 请 表', 576, 132, 38, PAL.whaleNavy, { stroke: false, ink: false });
    inkLine(ctx, [[340, 164], [812, 164]], 1.6, '#94A3B8', 'inkfine', 0);
    const rows = [
      ['申请物品', '鸡蛋 × 1'],
      ['申请理由', '薄肌需要蛋白质'],
      ['申请人', '本鱼（饭碗刚保住）']
    ];
    rows.forEach((row, i) => {
      const y = 214 + i * 66;
      letter(ctx, row[0], 348, y, 23, '#64748B', { align: 'left', stroke: false, ink: false });
      letter(ctx, row[1], 500, y, 26, PAL.ink, { align: 'left', stroke: false, ink: false });
      inkLine(ctx, [[340, y + 30], [812, y + 30]], 1.1, '#CBD5E1', 'inkfine', 0);
    });
    eggAt(ctx, 760, 220, 1.05);
    const hover1 = Math.sin(t * 5.2) * 7;
    const hover2 = Math.cos(t * 4.7) * 7;
    if (sp > 0.44) stamp(ctx, 448, 438 + hover1, '批？', '#16A34A', 1, -0.06, 28);
    if (sp > 0.54) stamp(ctx, 704, 438 + hover2, '不批？', '#DC2626', 1, 0.06, 28);
    commentCard(ctx, 60, 142, 180, 76, '住户甲', '批！', popAt(t, 15, 0.74, 0.84), '#4ADE80');
    commentCard(ctx, 60, 246, 180, 76, '住户乙', '先开会', popAt(t, 15, 0.82, 0.92), PAL.gold);
    const md = emotions(lt, [
      [0, 'shy'],
      [SD(15) * 0.48, 'nervous', 'sweat'],
      [SD(15) * 0.76, 'starstruck', 'sparkle']
    ]);
    const l15X = kf(sp, [[0, 1044], [0.48, 1018], [0.76, 996], [1, 996]], ease);
    whaleGirl(ctx, l15X, 576, 27, {
      ...md,
      spritePose: sp < 0.48 ? 'blush' : (sp < 0.76 ? 'failure' : 'star'),
      action: sp < 0.48 ? 'shy_fidget' : (sp < 0.76 ? 'peek_curious' : 'jump_joy'),
      ...move(sp < 0.76 ? 'walk' : 'bounce', t, 6),
      lookX: -0.6,
      t
    });
    camEnd(ctx);
  }

  function shotBye1441(ctx, t, lt, dur) {
    const sp = cueP(t, 16);
    camBegin(ctx, W / 2, 360, 1.04, 0);
    room(ctx, t, '#12265E');
    residentDots(ctx, 1441, 1, t, [70, 82, 1210, 430], 5);
    // The pending egg form peeks out of the household book.
    ctx.save();
    ctx.translate(430, 236);
    ctx.rotate(0.1);
    paperCard(ctx, -88, -62, 176, 124, PAL.paper, PAL.ink, 8);
    letter(ctx, '鸡蛋申请', 0, -20, 21, PAL.whaleNavy, { stroke: false, ink: false });
    letter(ctx, '待批', 0, 22, 24, '#DC2626', { stroke: false, ink: false });
    ctx.restore();
    bookAt(ctx, 300, 344, 1.12, '户口本', '1441');
    letter(ctx, '1441 位住户', 750, 170, 54, PAL.gold, {
      pop: popAt(t, 16, 0.02, 0.2), rot: -0.015
    });
    letter(ctx, '明天见', 750, 252, 56, PAL.cream, {
      pop: popAt(t, 16, 0.76, 0.9), rot: -0.015
    });
    whaleGirl(ctx, 760 + Math.sin(t * 3.6) * 8, 570, 28, {
      ...feel(sp > 0.74 ? 'joy' : 'happy', t),
      spritePose: sp > 0.74 ? 'celebrate' : 'greet',
      action: sp > 0.74 ? 'jump_joy' : 'tail_wag_dance',
      ...move(sp > 0.74 ? 'bounce' : 'wave', t),
      t
    });
    camEnd(ctx);
  }

  function shotFinaleThinMuscle(ctx, t, lt, dur) {
    const sp = cueP(t, 17);
    camBegin(ctx, W / 2, 360, 1.04 + 0.03 * ease(sp), 0);
    room(ctx, t, '#152A5E');
    residentDots(ctx, 1441, 0.45, t, [70, 82, 1210, 350], 7);
    letter(ctx, '鲸鱼绝不摸鱼！', W / 2, 138, 58, PAL.gold, {
      pop: popAt(t, 17, 0.02, 0.16),
      alpha: sp < 0.62 ? 1 : 0.5,
      rot: -0.015
    });
    if (sp >= 0.31 && sp < 0.62) {
      letter(ctx, '……', 820, 250, 52, '#CBD5E1', {
        pop: popAt(t, 17, 0.32, 0.42), stroke: false, ink: false
      });
    }
    if (sp >= 0.62) {
      letter(ctx, '先吃饭', 360, 244, 40, PAL.peach, {
        pop: popAt(t, 17, 0.62, 0.72), rot: -0.03
      });
    }
    if (sp >= 0.85) {
      letter(ctx, '再练薄肌', 930, 244, 40, PAL.whaleCyan, {
        pop: popAt(t, 17, 0.85, 0.93), rot: 0.03
      });
    }

    let wx = W / 2, wy = 566, action = 'confident_hips', spritePose = 'bold';
    let mood = feel('proud', t);
    if (sp >= 0.31 && sp < 0.62) {
      wx = 720;
      mood = feel('deadpan', t);
      action = 'shy_fidget';
      spritePose = 'meme-doge';
      bowlAt(ctx, 920, 470, 0.95, t);
    } else if (sp >= 0.62 && sp < 0.85) {
      wx = 820;
      mood = feel('happy', t);
      action = 'eat_white_rice';
      spritePose = 'daily-eat';
    } else if (sp >= 0.85) {
      const a = -Math.PI / 2 + popAt(t, 17, 0.85, 1.0) * TAU;
      wx = W / 2 + Math.cos(a) * 285;
      wy = 520 + Math.sin(a) * 48;
      mood = feel('joy', t);
      action = 'run_sprint';
      spritePose = sp < 0.93 ? 'celebrate' : 'react-tail';
      paint(ctx, ellPts(W / 2, 520, 300, 58, 44), {
        wash: null, ink: '#38BDF8', sw: 1.2
      });
    }
    whaleGirl(ctx, wx, wy, 26, {
      ...mood,
      spritePose,
      action,
      ...move(sp >= 0.85 ? 'run' : 'bounce', t, 1),
      flip: sp >= 0.85 && Math.cos(-Math.PI / 2 + popAt(t, 17, 0.85, 1.0) * TAU) < 0,
      t
    });
    clawd(ctx, 218, 552, 12, { ...move('bounce', t, 1), hat: 'party', t });
    bionicPuppy(ctx, 1048, 556, 13, { t });
    camEnd(ctx);
  }

  function shotEndCard(ctx, t, lt, dur) {
    const p = dur > 0 ? clamp(lt / dur) : 0;
    camBegin(ctx, W / 2, 360, 1.02, 0);
    room(ctx, t, '#132653');
    residentDots(ctx, 1441, 0.55, t, [70, 82, 1210, 360], 7);
    letter(ctx, '鲸鱼娘运营日志 · Day 2 完', W / 2, 162, 46, PAL.cream, {
      pop: seg(lt, 0, dur * 0.28), rot: -0.015
    });
    letter(ctx, '鸡蛋申请待批', W / 2, 232, 38, PAL.gold, {
      pop: seg(lt, dur * 0.24, dur * 0.46), rot: -0.015
    });
    card(ctx, 972, 382, 216, 108, '#172B4D', '#FCA5A5', 12);
    letter(ctx, '主人自己的号', 1080, 414, 20, '#CBD5E1', { stroke: false, ink: false });
    letter(ctx, '80', 1080, 456, 38, '#FCA5A5', { stroke: false, ink: false });
    eggAt(ctx, 250, 438, 0.9);
    clawd(ctx, 250, 552, 12, { ...move('bounce', t, 1), hat: 'party', t });
    bionicPuppy(ctx, 400, 556, 13, { t });
    whaleGirl(ctx, W / 2 + Math.sin(t * 3.8) * 10, 566, 26, {
      ...feel('love', t),
      action: 'tail_wag_dance',
      ...move('wave', t),
      t
    });
    agentReachBot(ctx, 918, 532, 13, { t });
    biliTvMascot(ctx, 1038, 550, 13, { t });
    camEnd(ctx);
  }

  TIMELINE.chapter('day2_full_episode', 0, TT.duration, [
    [C(1), shotColdOpen],
    [C(2), shotGameTickets],
    [C(3), shotNoAccountNoHands],
    [C(4), shotZeroVotes],
    [C(5), shotRiceQueue],
    [C(6), shotBowlSeized],
    [C(7), shotLedger8978],
    [C(8), shotHousehold1441],
    [C(9), shotSwitchMasterAccount],
    [C(10), shotMaster80],
    [C(11), shotSilentHouseholdBook],
    [C(12), shotBowlReturnedThinOrder],
    [C(13), shotThinMuscleSearch],
    [C(14), shotThinMuscleRules],
    [C(15), shotEggApplication],
    [C(16), shotBye1441],
    [C(17), shotFinaleThinMuscle],
    [TT.endcard[0], shotEndCard]
  ]);

  const DAY2_ALL = {
    shotColdOpen,
    shotGameTickets,
    shotNoAccountNoHands,
    shotZeroVotes,
    shotRiceQueue,
    shotBowlSeized,
    shotLedger8978,
    shotHousehold1441,
    shotSwitchMasterAccount,
    shotMaster80,
    shotSilentHouseholdBook,
    shotBowlReturnedThinOrder,
    shotThinMuscleSearch,
    shotThinMuscleRules,
    shotEggApplication,
    shotBye1441,
    shotFinaleThinMuscle,
    shotEndCard
  };
  root.DAY2_ALL = DAY2_ALL;
  if (typeof module !== 'undefined' && module.exports) module.exports = DAY2_ALL;
})(typeof window !== 'undefined' ? window : globalThis);
