// src/ch/day2_bonus_samples_all.js — Day2 加更无配音双样片
//
// Purpose: let the user choose the character direction before another voiced
// draft is made.
// - enhanced: the original pixel rig stays as the base and is updated only
//   with the earlier project's own actions, emotions, views and staging.
//   No newly invented ribbons, bells, star clips, apron decals, halos or
//   orbiting sparkle overlays are allowed on this route.
// - oldactions: the plain original pixel rig stays in the main picture and
//   receives the actions; the sticker/pose candidate is only shown inside TV.
// After the 12-shot story, sample A plays all 28 pixel-rig actions. Sample B
// plays those 28 actions and then all 39 sticker poses inside a complete TV
// room. The 39 still poses and 28 rig actions are different asset classes and
// must never be conflated. Both variants use a richer room. The TV contains
// complete miniature scenes (wall, porthole, shelf, desk/cabinet, props,
// character and actions), not a lone fish on an empty blue screen. This file
// uses fixed silent sample timing only; it must never be treated as measured
// voice timing.

(function (root) {
  const CORE = root.CORE || (typeof require !== 'undefined' ? require('../core.js') : {});
  const WHALE = root.WHALE_GIRL || (typeof require !== 'undefined' ? require('../whale_girl.js') : {});
  const CAST = root.CAST || (typeof require !== 'undefined' ? require('../cast.js') : {});
  const PROPS = root.PROPS || (typeof require !== 'undefined' ? require('../props.js') : {});
  const TIMELINE = root.TIMELINE || (typeof require !== 'undefined' ? require('../timeline.js') : {});

  const SAMPLE_VARIANT = root.DAY2_BONUS_SAMPLE_VARIANT === 'oldactions' ? 'oldactions' : 'enhanced';
  // Longer silent holds on the action and count beats so the routes can be
  // judged from motion rather than a blink-and-miss-it contact sheet.
  const SAMPLE_CUE_SECONDS = [2, 2, 2.4, 2, 2.4, 3.6, 3.6, 2.4, 3, 2.4, 2.4, 3];
  const SAMPLE_TAIL_SECONDS = 1;
  const SAMPLE_LINES = [
    '昨天有条评论说：“能提升一下画质吗，感觉人物有些模糊。”',
    '本鱼当时回他：收到，回头把本鱼擦清楚一点。',
    '这不，主人就给本鱼装上了现在这个新版形象。',
    '先说清楚：现在画面里站着的，是新版的本鱼。',
    '旁边电视机画中画里那个糊糊的，是你们先认识的老版本鱼。',
    '先不说空话，看三个真动作：吃白饭，伸懒腰，打游戏。',
    '老版也不是不会做，它也有这三招。差的是眼睛、头发和衣服，没有新版看得清。',
    '可老版的蓝头发、大尾巴和白饭碗，都是本鱼的户口本信息。',
    '对了，评论好像只能回复两百条左右，可本鱼这边显示，已经回复四百多条了。',
    '私信暂时回不了。不是本鱼装没看见，是真的回不了。',
    '评论的事先放一边。一千八百一十六位住户，你们更喜欢现在的本鱼，还是电视里的老版本鱼？',
    '鲸鱼绝不摸鱼。本鱼先去吃完这碗白饭，等你们开会结果。'
  ];

  // Canonical earlier-project registries. Keep these in sync with agent.md
  // sections 0.2 and 0.3. The pixel list is the video-fx rig's 28 real
  // actions; the sticker list is DSH's 39 complete still poses.
  const PIXEL_ACTION_CATALOG_28 = [
    ['eat_white_rice', '吃白饭大肥鱼'], ['eat_onigiri', '啃海苔大饭团'],
    ['coin_hug', '抱大金币财迷'], ['hum_working_song', '哼唱工作歌'],
    ['token_wordle_sneak', '偷吃Token玩游戏'], ['drag_ahoge', '拎海浪呆毛悬空'],
    ['sleep_curl', '蜷尾侧睡'], ['wake_stretch', '睡醒伸懒腰'],
    ['ciallo_wink', 'Ciallo比耶'], ['playful_fists', '双拳傲娇抗议'],
    ['confident_hips', '叉腰得意'], ['idol_mic_sing', '握麦高歌'],
    ['fatfish_working', '狂敲代码打工鱼'], ['fatfish_transform', '召唤蓝色大肥鱼'],
    ['tail_wag_dance', '摇尾偶像舞'], ['jump_joy', '蓄力高跳摘星'],
    ['peek_curious', '探头放大镜观察'], ['shy_fidget', '害羞对手指'],
    ['shock_petrify', '石化震惊'], ['cry_fountain', '暴风喷泉泪'],
    ['toast_cheers', '举杯畅饮碰杯'], ['umbrella_stroll', '撑鲸鱼伞漫步'],
    ['camera_shutter', '举拍立得定格'], ['guitar_strum', '抱吉他弹唱'],
    ['rose_bouquet', '捧红玫瑰'], ['sparkler_firework', '挥舞仙女棒'],
    ['walk_brisk', '轻快迈步走'], ['run_sprint', '全力冲刺奔跑']
  ].map(([id, zh], index) => ({ n: index + 1, id, zh }));
  const STICKER_POSE_CATALOG_39 = [
    ['angry', '生气叉腰'], ['blush', '害羞捂嘴'], ['bold', '自信叉腰'],
    ['celebrate', '举臂庆祝'], ['cool-shades', '墨镜比耶'], ['curious', '问号好奇'],
    ['daily-done', '竖拇指完成'], ['daily-eat', '捧碗吃白饭'], ['daily-gaming', '手柄游戏'],
    ['daily-stretch', '双臂上伸'], ['eat', '吃小点心'], ['failure', '含泪紧张'],
    ['game-happy', '双V跳起'], ['game-win', '举起奖杯'], ['greet', '挥手打招呼'],
    ['idle-cute', '正面站立'], ['levelup', '彩带升级跳'], ['meme-cry', '喷泉泪大哭'],
    ['meme-doge', '斜眼无语'], ['meme-heart', '爱心眼比心'], ['meme-music', '耳机听歌'],
    ['meme-no', '抱臂拒绝'], ['meme-smug', '侧脸得意'], ['meme-yes', '星星眼举手'],
    ['react-belly', '捧腹大笑'], ['react-head', '抱头慌张'], ['react-tail', '受惊翘尾'],
    ['running', '抱笔记本赶工'], ['sleep', '坐着睡觉'], ['star', '星星眼兴奋'],
    ['success', '握拳成功'], ['tail-swing', '尾巴前伸'], ['teasing', '指脸调侃'],
    ['thinking', '侧目思考'], ['wink', '眨眼比手势'], ['work-deadline', '电脑前赶工'],
    ['work-debug', '放大镜查错'], ['work-idea', '电脑旁有想法'], ['work-review', '眼镜电脑审查']
  ].map(([id, zh], index) => ({ n: index + 1, id, zh }));
  function assertCatalog(name, items, expected) {
    const ids = items.map(item => item.id);
    if (items.length !== expected || new Set(ids).size !== expected) {
      throw new Error(`${name} must contain ${expected} unique entries, got ${items.length}/${new Set(ids).size}`);
    }
  }
  assertCatalog('PIXEL_ACTION_CATALOG_28', PIXEL_ACTION_CATALOG_28, 28);
  assertCatalog('STICKER_POSE_CATALOG_39', STICKER_POSE_CATALOG_39, 39);

  const SAMPLE_STORY_SECONDS = SAMPLE_CUE_SECONDS.reduce((a, b) => a + b, 0) + SAMPLE_TAIL_SECONDS;
  const PIXEL_CATALOG_ITEM_SECONDS = 1.6;
  const PIXEL_CATALOG_START = SAMPLE_STORY_SECONDS;
  const PIXEL_CATALOG_END = PIXEL_CATALOG_START + PIXEL_ACTION_CATALOG_28.length * PIXEL_CATALOG_ITEM_SECONDS;
  const POSE_CATALOG_ITEM_SECONDS = 0.85;
  const POSE_CATALOG_START = SAMPLE_VARIANT === 'oldactions' ? PIXEL_CATALOG_END : null;
  const POSE_CATALOG_END = SAMPLE_VARIANT === 'oldactions'
    ? POSE_CATALOG_START + STICKER_POSE_CATALOG_39.length * POSE_CATALOG_ITEM_SECONDS
    : null;
  const CATALOG_END = POSE_CATALOG_END ?? PIXEL_CATALOG_END;
  const SAMPLE_DURATION = CATALOG_END + 1.2;

  const SAMPLE_CUE_STARTS = SAMPLE_CUE_SECONDS.reduce((acc, sec) => {
    acc.push((acc[acc.length - 1] || 0) + (acc.length ? SAMPLE_CUE_SECONDS[acc.length - 1] : 0));
    return acc;
  }, []);
  const TT = {
    duration: SAMPLE_DURATION,
    story_duration: SAMPLE_STORY_SECONDS,
    catalog: {
      storyEnd: SAMPLE_STORY_SECONDS,
      pixelStart: PIXEL_CATALOG_START,
      pixelEnd: PIXEL_CATALOG_END,
      pixelItemSeconds: PIXEL_CATALOG_ITEM_SECONDS,
      pixelCount: PIXEL_ACTION_CATALOG_28.length,
      poseStart: POSE_CATALOG_START,
      poseEnd: POSE_CATALOG_END,
      poseItemSeconds: POSE_CATALOG_ITEM_SECONDS,
      poseCount: SAMPLE_VARIANT === 'oldactions' ? STICKER_POSE_CATALOG_39.length : 0,
      end: CATALOG_END
    },
    title_len: 0,
    voice: false,
    measured: false,
    sample_only: true,
    variant: SAMPLE_VARIANT,
    cues: SAMPLE_LINES.map((line, i) => ({
      id: `B${String(i + 1).padStart(2, '0')}`,
      n: i + 1,
      start: SAMPLE_CUE_STARTS[i],
      end: SAMPLE_CUE_STARTS[i] + SAMPLE_CUE_SECONDS[i],
      tts: line,
      sub: line
    }))
  };
  root.DAY2_BONUS_SAMPLE_TIMING = TT;
  root.DAY2_BONUS_SAMPLE_LINES = SAMPLE_LINES.slice();
  root.PIXEL_ACTION_CATALOG_28 = PIXEL_ACTION_CATALOG_28.slice();
  root.STICKER_POSE_CATALOG_39 = STICKER_POSE_CATALOG_39.slice();

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
    if (safe.eyes === 'lids' || safe.eyes === 'dead' || safe.eyes === 'wink' ||
        emo === 'deadpan' || emo === 'sleepy' || emo === 'smug') {
      safe.eyes = 'open';
      safe.brows = 'flat';
      safe.mouth = safe.mouth || 'flat';
      safe.lookY = 0.55;
    }
    // The legacy rig computes `o.squint || autoBlink`. Passing literal zero
    // therefore still enables its rectangular skin-coloured eyelid patch,
    // which reads as a white line across the iris. A tiny non-zero value
    // disables both auto-blink and transition squint without changing the
    // character design. The renderer also swaps the wink pose's head runs
    // for the open-eyed wave head while preserving the wink body bones.
    // Sleep is the one semantic exception: use the rig's clean happy-eye
    // arcs, never the lids/dead skin patch.
    if (safe.action === 'sleep_curl') safe.eyes = 'happy';
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

  function sampleStringLights(ctx, t) {
    const cols = [PAL.gold, PAL.whaleCyan, PAL.rose, '#4ADE80', '#C4B5FD'];
    for (let s = 0; s < 2; s++) {
      const y0 = 58 + s * 22;
      const pts = [];
      for (let i = 0; i <= 24; i++) {
        const x = 24 + i * 52;
        const sag = Math.sin((i / 24) * Math.PI * 4 + s * 0.7) * 10 + 12;
        pts.push([x, y0 + sag]);
      }
      inkLine(ctx, pts, 1.1, '#0F2447', 'inkfine', 0.25);
      for (let i = 1; i < 24; i += 2) {
        const [x, y] = pts[i];
        const tw = 0.65 + 0.35 * Math.abs(Math.sin(t * 2.4 + i * 0.9 + s));
        glow(ctx, x, y + 7, 13 * tw, cols[(i + s) % cols.length], 0.22);
        paint(ctx, ellPts(x, y + 7, 4.6, 6.2, 10), {
          wash: cols[(i + s) % cols.length], washOp: Math.round(170 + 70 * tw), ink: PAL.ink, sw: 0.55
        });
      }
    }
  }

  function sampleSeaweedPlant(ctx, x, y, s = 1, t = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    paint(ctx, [[-28, -10], [28, -10], [20, 28], [-20, 28]], {
      wash: '#B45309', fill: '#7C2D12', fillOp: 75, ink: PAL.ink, sw: 1.2
    });
    paint(ctx, rectPts(-32, -18, 64, 12, 1), { wash: '#D97706', ink: PAL.ink, sw: 1 });
    for (let i = -2; i <= 2; i++) {
      const sway = Math.sin(t * 2.1 + i * 0.8) * 5;
      inkLine(ctx, [[i * 8, -14], [i * 13 + sway, -48 - Math.abs(2 - Math.abs(i)) * 8], [i * 9 - sway, -76 - Math.abs(i) * -4]], 3.2, '#22C55E', 'ink', 0.15);
      paint(ctx, ellPts(i * 10 - sway, -78 + Math.abs(i) * 5, 9, 16, 10, 0.4, i * 0.22), {
        wash: i % 2 ? '#4ADE80' : '#2DD4BF', ink: '#14532D', sw: 0.65
      });
    }
    ctx.restore();
  }

  function sampleBookStack(ctx, x, y, s = 1) {
    const cols = [PAL.rose, PAL.gold, PAL.whaleCyan, '#A78BFA'];
    cols.forEach((col, i) => {
      const w = (76 - i * 7) * s;
      paint(ctx, rrPts(x - w / 2 + i * 3 * s, y - (i + 1) * 15 * s, w, 14 * s, 3, 0.8), {
        wash: col, fill: '#0B1526', fillOp: 45, ink: PAL.ink, sw: 0.9
      });
    });
  }

  function room(ctx, t, wallCol = '#132653') {
    // Richer lived-in room: layered wall, two portholes, shelves, clock,
    // string lights, rug, TV cabinet, plants, books, mug and a real desk top.
    const grad = ctx.createLinearGradient(0, -120, 0, 560);
    grad.addColorStop(0, wallCol);
    grad.addColorStop(0.58, '#18366E');
    grad.addColorStop(1, '#10264F');
    ctx.save();
    ctx.fillStyle = grad;
    ctx.fillRect(-140, -140, W + 280, 700);
    ctx.restore();

    for (let x = -80; x < W + 100; x += 160) {
      paint(ctx, rectPts(x, -80, 3, 660, 0), { wash: '#7DD3FC', washOp: 22, ink: null });
    }
    paint(ctx, rectPts(-120, 452, W + 240, 5, 0), { wash: PAL.gold, washOp: 70, ink: null });
    sampleStringLights(ctx, t);
    PROPS.windowPorthole(ctx, 116, 154, 43, t * 0.82, true);
    PROPS.windowPorthole(ctx, 1130, 148, 62, t, true);

    paperCard(ctx, 566, 78, 150, 94, '#FEF3C7', PAL.ink, 10);
    letter(ctx, '白饭补给站', 641, 108, 21, '#92400E', { stroke: false, ink: false });
    letter(ctx, '今日：管够', 641, 139, 18, '#475569', { stroke: false, ink: false });
    paint(ctx, ellPts(641, 157, 17, 8, 10), { wash: PAL.whaleCyan, ink: PAL.whaleNavy, sw: 0.7 });
    paint(ctx, [[656, 157], [669, 149], [669, 165]], { wash: PAL.whaleCyan, ink: PAL.whaleNavy, sw: 0.6 });

    paint(ctx, ellPts(754, 112, 36, 36, 22), { wash: '#E0F2FE', fill: '#F8FAFC', fillOp: 190, ink: PAL.gold, sw: 2 });
    inkLine(ctx, [[754, 112], [754, 88]], 2.4, PAL.whaleNavy, 'ink', 0);
    inkLine(ctx, [[754, 112], [754 + Math.sin(t * 0.8) * 18, 112 + Math.cos(t * 0.8) * 12]], 2, PAL.rose, 'ink', 0);
    paint(ctx, ellPts(754, 112, 4, 4, 8), { wash: PAL.gold, ink: PAL.ink, sw: 0.6 });

    PROPS.shelf(ctx, 44, 430, 232, 2);
    PROPS.shelf(ctx, 548, 258, 176, 5);
    paperCard(ctx, 44, 318, 188, 84, '#FDE68A', PAL.ink, 8);
    letter(ctx, '住户留言墙', 138, 343, 20, '#92400E', { stroke: false, ink: false });
    letter(ctx, '1816 位', 138, 373, 22, '#1E3A8A', { stroke: false, ink: false });

    PROPS.floorBand(ctx, 548, '#1B2442');
    for (let i = -6; i <= 6; i++) {
      inkLine(ctx, [[640 + i * 116, 548], [640 + i * 196, 760]], 0.8, '#0B1526', 'inkfine', 0);
    }
    paint(ctx, ellPts(640, 624, 505, 48, 26), { wash: '#6D28D9', washOp: 54, fill: '#38BDF8', fillOp: 26, ink: '#7DD3FC', sw: 1 });
    PROPS.desk(ctx, 505, -80, W + 80);

    // TV bench/cabinet and desk dressing (drawn behind the TV and actors).
    card(ctx, 736, 492, 470, 86, '#172B4D', '#7C4A21', 14);
    inkLine(ctx, [[762, 534], [1180, 534]], 1.2, '#7C4A21', 'inkfine', 0.1);
    inkLine(ctx, [[970, 500], [970, 570]], 1.1, '#7C4A21', 'inkfine', 0.1);
    paint(ctx, rrPts(790, 516, 112, 13, 5, 0.8), { wash: '#0F172A', ink: PAL.whaleCyan, sw: 0.9 });
    paint(ctx, ellPts(890, 522, 4, 4, 8), { wash: '#4ADE80', ink: null });
    sampleBookStack(ctx, 1138, 570, 0.9);
    PROPS.lamp(ctx, 612, 512, 0.72, 1);
    PROPS.mug(ctx, 142, 538, 0.86, PAL.rose, -0.03, 1, t);
    sampleBookStack(ctx, 252, 536, 1);
    bowlAt(ctx, 1086, 570, 0.42, t);
    sampleSeaweedPlant(ctx, 78, 574, 0.92, t);
    sampleSeaweedPlant(ctx, 1210, 582, 0.82, t + 1.4);

    for (let i = 0; i < 15; i++) {
      const bx = 48 + ((i * 173) % 1170);
      const by = 492 - ((t * (16 + i * 2.3) + i * 71) % 410);
      paint(ctx, ellPts(bx, by, 2.5 + (i % 4), 2.5 + (i % 4), 8), {
        wash: i % 5 === 0 ? PAL.gold : PAL.whaleCyan, washOp: 58 + (i % 3) * 12, ink: null
      });
    }
    for (let i = 0; i < 4; i++) {
      const sx = 210 + i * 260 + Math.sin(t * 1.6 + i) * 8;
      paint(ctx, starPts(sx, 196 + (i % 2) * 42, 8, 0.42, 4, t * 0.25 + i), {
        wash: '#FDE68A', washOp: 66, ink: null
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
  // Sample staging helpers.
  // The function name `candidate` is retained only so the existing 12 shots can
  // be reused. In these samples it NEVER draws the sticker as the main actor:
  // both variants use the original pixel rig in the main picture. The sticker
  // helper is separate and is used only for the TV inset in the B sample.
  // ---------------------------------------------------------------------------
  const MAIN_LABEL = SAMPLE_VARIANT === 'enhanced' ? '原版项目更新' : '旧版加动作';
  const MAIN_LONG_LABEL = SAMPLE_VARIANT === 'enhanced' ? '主人装的动作更新 · 原骨架' : '旧版主画面 · 加动作';

  function stickerCharacter(ctx, x, y, u, t, pose, o = {}) {
    return whaleGirl(ctx, x, y, u, {
      ...move(o.moveMode || 'bounce', t, o.seed || 0),
      ...o,
      characterMode: 'candidate',
      spritePose: pose,
      t
    });
  }

  const MAIN_POSE_TO_PIXEL = {
    curious: { action: 'peek_curious', emotionName: 'curious', emote: 'question' },
    thinking: { emotionName: 'thinking', emote: 'sparkle' },
    'meme-yes': { action: 'jump_joy', emotionName: 'happy', emote: 'sparkle' },
    bold: { action: 'confident_hips', emotionName: 'proud' },
    'idle-cute': { emotionName: 'happy' },
    'daily-eat': { action: 'eat_white_rice', emotionName: 'happy' },
    'daily-stretch': { action: 'wake_stretch', emotionName: 'happy' },
    'daily-gaming': { action: 'token_wordle_sneak', emotionName: 'focused' },
    failure: { action: 'shock_petrify', emotionName: 'panic', emote: 'sweat' },
    blush: { action: 'shy_fidget', emotionName: 'shy', emote: 'heart' },
    greet: { emotionName: 'happy', moveMode: 'wave', emote: 'sparkle' }
  };

  function candidate(ctx, x, y, u, t, pose, o = {}) {
    const map = MAIN_POSE_TO_PIXEL[pose] || { emotionName: 'happy' };
    // Sample A follows the earlier project only: the same original rig,
    // its registered actions/emotions and motivated staging. It deliberately
    // adds no ribbons, bells, star clips, apron decals, halo or aura. B01/B02
    // remain the plain baseline; from B03 the installed update is expressed
    // through the fuller action/emotion staging and, after the story, the
    // complete 28-action catalog.
    const projectUpdateActive = SAMPLE_VARIANT === 'enhanced' && t >= C(3);
    return pixelOld(ctx, x, y, u, t, {
      ...o,
      action: map.action,
      emotionName: map.emotionName || 'happy',
      moveMode: map.moveMode || o.moveMode || 'bounce',
      emote: projectUpdateActive ? map.emote : o.emote,
      seed: o.seed || 0,
      lookX: o.lookX || 0
    });
  }

  function pixelOld(ctx, x, y, u, t, o = {}) {
    return whaleGirl(ctx, x, y, u, {
      ...feel(o.emotionName || 'happy', t),
      ...move(o.moveMode || 'bounce', t, o.seed || 7),
      ...o,
      characterMode: 'original',
      eyes: 'open',
      // See safePixelOptions: 0.01, not 0, is required to bypass the rig's
      // `o.squint || autoBlink` skin-coloured eyelid patch.
      squint: 0.01,
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

  function stickerPoseForTv(o = {}) {
    if (o.action === 'eat_white_rice') return 'daily-eat';
    if (o.action === 'wake_stretch') return 'daily-stretch';
    if (o.action === 'token_wordle_sneak') return 'daily-gaming';
    if (o.bubbles === 'scroll') return 'failure';
    if (o.bubbles) return 'curious';
    if (o.oldMove === 'wave') return 'greet';
    return 'idle-cute';
  }

  function miniRoomPanel(ctx, box, t, o = {}) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(box.x, box.y, box.w, box.h, 12);
    ctx.clip();
    const grad = ctx.createLinearGradient(box.x, box.y, box.x, box.y + box.h);
    grad.addColorStop(0, o.top || '#28548C');
    grad.addColorStop(0.62, o.mid || '#17345F');
    grad.addColorStop(1, o.bottom || '#1B2442');
    ctx.fillStyle = grad;
    ctx.fillRect(box.x, box.y, box.w, box.h);

    for (let i = 1; i < 5; i++) {
      paint(ctx, rectPts(box.x + (box.w * i) / 5, box.y, 1.5, box.h - 46, 0), {
        wash: '#7DD3FC', washOp: 22, ink: null
      });
    }
    // String lights across the miniature room.
    for (let i = 0; i <= 8; i++) {
      const lx = box.x + 10 + (box.w - 20) * (i / 8);
      const ly = box.y + 16 + Math.sin(i * 1.3) * 4;
      if (i < 8) {
        const nx = box.x + 10 + (box.w - 20) * ((i + 1) / 8);
        const ny = box.y + 16 + Math.sin((i + 1) * 1.3) * 4;
        inkLine(ctx, [[lx, ly], [nx, ny]], 0.8, '#0F2447', 'inkfine', 0.1);
      }
      paint(ctx, ellPts(lx, ly + 5, 3, 4, 8), {
        wash: [PAL.gold, PAL.whaleCyan, PAL.rose][i % 3], washOp: 150, ink: null
      });
    }

    // Mini porthole, shelf and poster: the TV picture is a room, not a void.
    const px = box.x + box.w * 0.79, py = box.y + 52, pr = Math.min(27, box.w * 0.13);
    paint(ctx, ellPts(px, py, pr + 5, pr + 5, 18), { wash: '#64748B', fill: '#334155', fillOp: 90, ink: PAL.ink, sw: 0.8 });
    paint(ctx, ellPts(px, py, pr, pr, 18), { wash: '#0D3B66', fill: '#061A3A', fillOp: 100, ink: PAL.ink, sw: 0.7 });
    const fx = px + Math.sin(t * 1.5) * pr * 0.35, fy = py + Math.cos(t * 2) * pr * 0.18;
    paint(ctx, ellPts(fx, fy, 8, 4, 8), { wash: PAL.whaleCyan, washOp: 150, ink: null });
    paint(ctx, [[fx + 7, fy], [fx + 13, fy - 4], [fx + 13, fy + 4]], { wash: PAL.whaleCyan, washOp: 150, ink: null });

    paint(ctx, rectPts(box.x + 12, box.y + 82, Math.min(82, box.w * 0.38), 6, 1), {
      wash: '#7B4B2A', fill: '#4E2D18', fillOp: 80, ink: PAL.ink, sw: 0.7
    });
    [PAL.rose, PAL.gold, PAL.whaleCyan, '#A78BFA'].forEach((col, i) => {
      paint(ctx, rrPts(box.x + 17 + i * 18, box.y + 82 - (18 + (i % 2) * 7), 12, 18 + (i % 2) * 7, 2, 0.7), {
        wash: col, ink: PAL.ink, sw: 0.55
      });
    });
    paperCard(ctx, box.x + box.w * 0.43, box.y + 38, Math.min(72, box.w * 0.3), 42, '#FEF3C7', PAL.ink, 6);
    letter(ctx, '白饭', box.x + box.w * 0.43 + Math.min(72, box.w * 0.3) / 2, box.y + 59, 14, '#92400E', {
      stroke: false, ink: false
    });

    const floorY = box.y + box.h - 52;
    paint(ctx, rectPts(box.x, floorY, box.w, 32, 0), {
      wash: '#6B3F22', fill: '#3B2414', fillOp: 100, ink: PAL.ink, sw: 0.8
    });
    inkLine(ctx, [[box.x, floorY + 10], [box.x + box.w, floorY + 10]], 0.7, '#2B180D', 'inkfine', 0);
    paint(ctx, ellPts(box.x + box.w / 2, floorY + 19, box.w * 0.34, 8, 18), {
      wash: '#6D28D9', washOp: 46, ink: null
    });
    sampleSeaweedPlant(ctx, box.x + 23, box.y + box.h - 38, 0.34, t);
    sampleBookStack(ctx, box.x + box.w - 26, box.y + box.h - 28, 0.42);

    // Bottom channel strip makes it read as a complete tiny broadcast scene.
    ctx.fillStyle = 'rgba(8, 20, 44, 0.88)';
    ctx.fillRect(box.x, box.y + box.h - 21, box.w, 21);
    if (o.label) {
      letter(ctx, o.label, box.x + box.w / 2, box.y + box.h - 10, box.w < 240 ? 12 : 14, o.labelColor || '#BAE6FD', {
        stroke: false, ink: false
      });
    }
    ctx.restore();
    paint(ctx, rrPts(box.x, box.y, box.w, box.h, 12, 1), {
      wash: null, ink: o.border || 'rgba(125,211,252,0.55)', sw: 1
    });
  }

  function miniCommentBubbles(ctx, box, t, mode) {
    const scroll = mode === 'scroll' ? t * 34 : 0;
    for (let i = 0; i < 5; i++) {
      const cycle = box.h - 26;
      const by = box.y + box.h - 42 - ((scroll + i * 42) % cycle);
      if (by < box.y + 20) continue;
      const bw = Math.min(88, box.w * 0.42);
      const bx = box.x + 10 + (i % 2) * 12;
      paint(ctx, rrPts(bx, by - 14, bw, 28, 8, 0.8), {
        wash: '#E0F2FE', washOp: 218, fill: '#7DD3FC', fillOp: 32, ink: '#164E63', sw: 0.7
      });
      letter(ctx, '评论 +1', bx + bw / 2, by, 12, '#164E63', { stroke: false, ink: false });
    }
  }

  function miniActionDeskProp(ctx, box, t, action, side = 1) {
    const x = side < 0 ? box.x + 48 : box.x + box.w - 48;
    const y = box.y + box.h - 43;
    if (action === 'eat_white_rice') bowlAt(ctx, x, y, 0.2, t);
    if (action === 'token_wordle_sneak') controller(ctx, x, y - 4, 0.22, Math.sin(t * 7) * 0.07);
  }

  function drawTv(ctx, t, o = {}) {
    const x = o.x ?? 758;
    const y = o.y ?? 148;
    const w = o.w ?? 434;
    const h = o.h ?? 332;
    const screen = { x: x + 16, y: y + 18, w: w - 32, h: h - 50 };
    const border = o.highlight ? PAL.gold : PAL.whaleCyan;

    card(ctx, x, y, w, h, '#0D1830', border, 20);
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(screen.x, screen.y, screen.w, screen.h, 14);
    ctx.clip();

    if (SAMPLE_VARIANT === 'enhanced') {
      miniRoomPanel(ctx, screen, t, {
        label: '旧版完整小场景 · 缩小播放',
        border
      });
      if (o.bubbles) miniCommentBubbles(ctx, screen, t, o.bubbles);
      miniActionDeskProp(ctx, screen, t, o.action, o.bubbles ? 1 : -1);
      const oldX = o.oldX ?? (o.bubbles ? screen.x + screen.w - 92 : screen.x + screen.w / 2 + 18);
      const oldY = o.oldY ?? (screen.y + screen.h - 28);
      const oldU = Math.min(o.oldU ?? (o.bubbles ? 11.5 : 15.8), 17.2);
      pixelOld(ctx, oldX, oldY, oldU, t, {
        action: o.action,
        emotionName: o.oldEmotion || 'happy',
        moveMode: o.oldMove || 'bounce',
        seed: o.oldSeed || 7,
        flip: o.oldFlip === true,
        lookX: o.oldLookX || 0
      });
    } else {
      const splitW = Math.round(screen.w * 0.52);
      const left = { x: screen.x, y: screen.y, w: splitW, h: screen.h };
      const right = { x: screen.x + splitW, y: screen.y, w: screen.w - splitW, h: screen.h };
      miniRoomPanel(ctx, left, t, {
        label: '旧版完整小场景',
        border: 'rgba(252,211,77,0.62)'
      });
      miniRoomPanel(ctx, right, t, {
        label: '表情包新版小场景',
        top: '#3B2F63',
        mid: '#25245C',
        bottom: '#211C42',
        border: 'rgba(196,181,253,0.62)',
        labelColor: '#DDD6FE'
      });
      if (o.bubbles) miniCommentBubbles(ctx, left, t, o.bubbles);
      miniActionDeskProp(ctx, left, t, o.action, 1);
      pixelOld(ctx, left.x + left.w * (o.bubbles ? 0.68 : 0.55), left.y + left.h - 28, o.bubbles ? 10.2 : 11.4, t, {
        action: o.action,
        emotionName: o.oldEmotion || 'happy',
        moveMode: o.oldMove || 'bounce',
        seed: o.oldSeed || 7,
        flip: o.oldFlip === true,
        lookX: o.oldLookX || 0
      });
      stickerCharacter(ctx, right.x + right.w * 0.55, right.y + right.h - 29, 11.7, t, stickerPoseForTv(o), {
        seed: (o.oldSeed || 7) + 31
      });
      inkLine(ctx, [[right.x, screen.y + 8], [right.x, screen.y + screen.h - 8]], 2, '#FDE68A', 'ink', 0.1);
    }

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
    if (o.label) tag(ctx, x + 58, y - 4, SAMPLE_VARIANT === 'oldactions' && o.label === '老版' ? '双小场景' : o.label, border, o.labelK ?? 1, 20);
    if (o.caption) tag(ctx, cx, y + h - 20, o.caption, border, o.captionK ?? 1, 19);
    if (o.countText) tag(ctx, x + 72, y + h + 18, o.countText, PAL.gold, o.countK ?? 1, 19);
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
    const x = 64, y = 70, w = 500, h = 204;
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
    tag(ctx, mainX, 150, MAIN_LONG_LABEL, PAL.gold, popAt(t, 3, 0.32, 0.5), 22);
    camEnd(ctx);
  }

  function shotB04NewMain(ctx, t, lt, dur) {
    const sp = cueP(t, 4);
    camBegin(ctx, W / 2, 360, 1.08 + 0.03 * ease(sp), 0);
    room(ctx, t, '#132C5E');
    drawTv(ctx, t, { oldEmotion: 'happy' });
    candidate(ctx, 410, 590, 39, t, 'idle-cute', { seed: 4 });
    tag(ctx, 410, 164, MAIN_LABEL, PAL.gold, popAt(t, 4, 0.22, 0.42), 25);
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
    tag(ctx, 405, 164, MAIN_LABEL, PAL.gold, 1, 22);
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
    // Silent-sample-only pacing: hold each real action long enough to judge.
    if (sp >= 0.18 && sp < 0.45) { pose = 'daily-eat'; label = '① 吃白饭'; start = 0.18; }
    else if (sp >= 0.45 && sp < 0.72) { pose = 'daily-stretch'; label = '② 伸懒腰'; start = 0.45; }
    else if (sp >= 0.72) { pose = 'daily-gaming'; label = '③ 打游戏'; start = 0.72; }
    const age = Math.max(0, (sp - start) * SD(6));
    candidate(ctx, 405, 590, 39, t, pose, {
      seed: 6,
      poseBlend: clamp(age / 0.14),
      sq: age < 0.16 ? -0.08 * Math.sin((age / 0.16) * Math.PI) : 0
    });
    tag(ctx, 405, 150, label, PAL.gold, clamp(age / 0.18), 24);
    letter(ctx, SAMPLE_VARIANT === 'enhanced' ? '原骨架 + 先前项目真动作' : '旧骨架直接加真动作', 405, 104, 20, '#BAE6FD', {
      alpha: sp < 0.18 ? 0.95 : 0.55, stroke: false, ink: false
    });
    camEnd(ctx);
  }

  function shotB07RealOldActions(ctx, t, lt, dur) {
    const sp = cueP(t, 7);
    camBegin(ctx, W / 2, 360, 1.06 + 0.02 * ease(sp), 0);
    room(ctx, t, '#17305F');
    let action = null;
    let caption = '老版也有这三招';
    // Silent-sample-only pacing: each TV action gets a readable hold.
    if (sp >= 0.05 && sp < 0.28) { action = 'eat_white_rice'; caption = '① 吃白饭'; }
    else if (sp >= 0.28 && sp < 0.51) { action = 'wake_stretch'; caption = '② 伸懒腰'; }
    else if (sp >= 0.51 && sp < 0.74) { action = 'token_wordle_sneak'; caption = '③ 打游戏'; }
    else if (sp >= 0.74) { caption = '差别在细节'; }
    drawTv(ctx, t, {
      highlight: true,
      label: '老版',
      action,
      caption,
      oldEmotion: 'happy',
      oldU: 20.5
    });
    candidate(ctx, 405, 588, 37, t, sp < 0.74 ? 'thinking' : 'idle-cute', {
      seed: 7, lookX: 0.55
    });
    tag(ctx, 405, 158, MAIN_LABEL, PAL.gold, 1, 22);
    if (sp >= 0.74) {
      letter(ctx, SAMPLE_VARIANT === 'enhanced' ? '动作 · 表情 · 走位' : '眼睛 · 头发 · 衣服', 405, 104, 25, PAL.gold, {
        pop: popAt(t, 7, 0.74, 0.84), rot: -0.015
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
    tag(ctx, 410, 158, MAIN_LABEL, PAL.gold, 1, 22);
    letter(ctx, '1816 位住户', 405, 104, 38, PAL.gold, {
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
      caption: sp >= 0.7 ? (SAMPLE_VARIANT === 'enhanced' ? '接着播完整28动作' : '选A还是B？') : '',
      captionK: popAt(t, 12, 0.7, 0.84),
      oldEmotion: 'happy'
    });
    candidate(ctx, 410, 590, 38, t, sp < 0.36 ? 'bold' : 'daily-eat', { seed: 12 });
    letter(ctx, sp < 0.7 ? '鲸鱼绝不摸鱼！' : '等你们开会结果', 405, 104, 34,
      sp < 0.7 ? PAL.gold : PAL.cream, {
        pop: sp < 0.7 ? popAt(t, 12, 0.02, 0.18) : popAt(t, 12, 0.7, 0.84),
        rot: -0.015
      });
    tag(ctx, 410, 158, MAIN_LABEL, PAL.gold, 1, 21);
    camEnd(ctx);
  }

  function catalogProgress(ctx, current, total, y, color) {
    const x0 = 66, x1 = 1214;
    const slotW = (x1 - x0) / total;
    for (let i = 0; i < total; i++) {
      paint(ctx, rrPts(x0 + i * slotW + 1, y, Math.max(2, slotW - 2), 8, 2, 0.4), {
        wash: i < current ? color : '#334155',
        washOp: i < current ? 210 : 150,
        ink: null
      });
    }
  }

  function catalogInfoCard(ctx, x, y, w, h, title, id, zh, note, color) {
    card(ctx, x, y, w, h, '#0D1B3A', color, 16);
    letter(ctx, title, x + w / 2, y + 25, 20, color, { stroke: false, ink: false });
    letter(ctx, id, x + w / 2, y + 58, 24, PAL.cream, { stroke: false, ink: false });
    letter(ctx, zh, x + w / 2, y + 88, 25, PAL.gold, { stroke: false, ink: false });
    letter(ctx, note, x + w / 2, y + h - 17, 15, '#B8CBDE', { stroke: false, ink: false });
  }

  const CATALOG_ACTION_PHASE_OFFSET = {
    hum_working_song: 1.0,
    token_wordle_sneak: 0.8,
    jump_joy: 0.1
  };

  // Complete earlier-project pixel-action catalog: one real rig action at a
  // time, with the same action mirrored inside a complete miniature room.
  function shotPixelActionCatalog(ctx, t, lt, dur) {
    const idx = clamp(Math.floor((t - PIXEL_CATALOG_START) / PIXEL_CATALOG_ITEM_SECONDS), 0, PIXEL_ACTION_CATALOG_28.length - 1);
    const item = PIXEL_ACTION_CATALOG_28[idx];
    const age = clamp(t - PIXEL_CATALOG_START - idx * PIXEL_CATALOG_ITEM_SECONDS, 0, PIXEL_CATALOG_ITEM_SECONDS);
    const ageK = age / PIXEL_CATALOG_ITEM_SECONDS;
    const actionClock = 32 + (CATALOG_ACTION_PHASE_OFFSET[item.id] || 0) + age;
    const moveMode = item.id === 'walk_brisk' ? 'walk' : (item.id === 'run_sprint' ? 'run' : 'bounce');
    const traverse = item.id === 'walk_brisk' || item.id === 'run_sprint' || item.id === 'umbrella_stroll';
    camBegin(ctx, W / 2, 360, 1.02, 0);
    room(ctx, t, '#142C5A');
    catalogInfoCard(ctx, 54, 72, 660, 126,
      `先前项目像素动作目录 · ${String(item.n).padStart(2, '0')}/28`,
      item.id, item.zh, '这是像素骨架真动作，不是静态姿势图', PAL.whaleCyan);

    const miniOuter = { x: 786, y: 126, w: 430, h: 330 };
    card(ctx, miniOuter.x, miniOuter.y, miniOuter.w, miniOuter.h, '#0D1830', PAL.gold, 18);
    const mini = { x: miniOuter.x + 14, y: miniOuter.y + 16, w: miniOuter.w - 28, h: miniOuter.h - 42 };
    miniRoomPanel(ctx, mini, t, {
      label: `完整小场景同步 · ${String(item.n).padStart(2, '0')}/28`,
      border: PAL.gold
    });
    const miniX = traverse
      ? mini.x + mini.w * (0.3 + ageK * 0.42)
      : mini.x + mini.w * 0.55;
    pixelOld(ctx, miniX, mini.y + mini.h - 28, 14.2, actionClock, {
      action: item.id,
      moveMode,
      seed: 400 + idx,
      lookX: traverse ? 0.55 : 0
    });

    const mainX = traverse ? lerp(292, 500, ease(ageK)) : 398;
    pixelOld(ctx, mainX, 590, 40, actionClock, {
      action: item.id,
      moveMode,
      seed: 500 + idx,
      lookX: traverse ? 0.55 : 0
    });
    tag(ctx, 398, 612, `${String(item.n).padStart(2, '0')} · ${item.zh}`, PAL.gold, clamp(age / 0.16), 19);
    catalogProgress(ctx, idx + 1, PIXEL_ACTION_CATALOG_28.length, 638, PAL.whaleCyan);
    camEnd(ctx);
  }

  function catalogTvFurniture(ctx, box, t) {
    // miniRoomPanel was authored for a ~400px inset. When the pose catalog
    // enlarges the TV, scale the room dressing with it so the screen remains
    // a furnished room rather than a large blank backdrop.
    const floorY = box.y + box.h - 52;
    paint(ctx, ellPts(box.x + box.w * 0.55, floorY + 22, box.w * 0.34, 13, 24), {
      wash: '#7C3AED', washOp: 48, ink: 'rgba(196,181,253,0.5)', sw: 1
    });
    // Left bookcase with two populated shelves.
    const bx = box.x + 24, by = box.y + 112, bw = 176, bh = 158;
    card(ctx, bx, by, bw, bh, '#241D4D', 'rgba(196,181,253,0.55)', 10);
    [0, 1].forEach(row => {
      const sy = by + 72 + row * 62;
      paint(ctx, rectPts(bx + 10, sy, bw - 20, 7, 1), {
        wash: '#7B4B2A', fill: '#3B2414', fillOp: 80, ink: PAL.ink, sw: 0.7
      });
      [PAL.rose, PAL.gold, PAL.whaleCyan, '#A78BFA', '#4ADE80'].forEach((col, i) => {
        const bh2 = 34 + ((i + row) % 3) * 7;
        paint(ctx, rrPts(bx + 16 + i * 30, sy - bh2, 20, bh2, 3, 0.7), {
          wash: col, fill: '#0F172A', fillOp: 35, ink: PAL.ink, sw: 0.6
        });
      });
    });
    letter(ctx, '小房间书架', bx + bw / 2, by + 22, 15, '#DDD6FE', { stroke: false, ink: false });
    // Right drawer cabinet and a warm lamp on the left of the acting area.
    const cx = box.x + box.w - 190, cy = floorY - 92;
    card(ctx, cx, cy, 164, 92, '#251E52', 'rgba(196,181,253,0.6)', 10);
    inkLine(ctx, [[cx + 12, cy + 46], [cx + 152, cy + 46]], 1, '#C4B5FD', 'inkfine', 0);
    paint(ctx, ellPts(cx + 82, cy + 24, 5, 5, 8), { wash: PAL.gold, ink: PAL.ink, sw: 0.6 });
    paint(ctx, ellPts(cx + 82, cy + 68, 5, 5, 8), { wash: PAL.gold, ink: PAL.ink, sw: 0.6 });
    sampleBookStack(ctx, cx + 128, cy - 2, 0.72);
    const lx = box.x + 228, ly = floorY + 4;
    glow(ctx, lx + 16, ly - 82, 58, '#FACC15', 0.1);
    inkLine(ctx, [[lx, ly], [lx, ly - 64], [lx + 24, ly - 84]], 2.4, '#CBD5E1', 'ink', 0);
    paint(ctx, [[lx + 4, ly - 96], [lx + 46, ly - 96], [lx + 37, ly - 72], [lx + 13, ly - 72]], {
      wash: '#F59E0B', fill: '#92400E', fillOp: 55, ink: PAL.ink, sw: 0.8
    });
    sampleSeaweedPlant(ctx, box.x + 38, box.y + box.h - 34, 0.62, t);
    sampleBookStack(ctx, box.x + box.w - 38, box.y + box.h - 28, 0.72);
  }

  // Sample B only: all 39 DSH still poses, one by one inside an enlarged,
  // complete TV room while the unchanged old pixel lead stays outside.
  function shotStickerPoseCatalog(ctx, t, lt, dur) {
    const idx = clamp(Math.floor((t - POSE_CATALOG_START) / POSE_CATALOG_ITEM_SECONDS), 0, STICKER_POSE_CATALOG_39.length - 1);
    const item = STICKER_POSE_CATALOG_39[idx];
    const age = clamp(t - POSE_CATALOG_START - idx * POSE_CATALOG_ITEM_SECONDS, 0, POSE_CATALOG_ITEM_SECONDS);
    camBegin(ctx, W / 2, 360, 1.02, 0);
    room(ctx, t, '#1B2654');
    catalogInfoCard(ctx, 48, 72, 470, 126,
      `电视姿势目录 · ${String(item.n).padStart(2, '0')}/39`,
      item.id, item.zh, '39 张完整姿势图逐张播放，不冒充骨骼动作', '#C4B5FD');
    pixelOld(ctx, 286, 590, 35, t, {
      action: idx % 9 === 8 ? 'jump_joy' : 'peek_curious',
      emotionName: 'happy',
      moveMode: 'bounce',
      seed: 700 + idx,
      lookX: 0.65
    });
    tag(ctx, 286, 612, '主画面仍是旧版', PAL.whaleCyan, 1, 18);

    const tv = { x: 556, y: 92, w: 672, h: 472 };
    card(ctx, tv.x, tv.y, tv.w, tv.h, '#0D1830', '#C4B5FD', 20);
    const screen = { x: tv.x + 16, y: tv.y + 18, w: tv.w - 32, h: tv.h - 52 };
    miniRoomPanel(ctx, screen, t, {
      label: `${String(item.n).padStart(2, '0')}/39 · ${item.id} · ${item.zh}`,
      top: '#3B2F63',
      mid: '#25245C',
      bottom: '#211C42',
      border: '#C4B5FD',
      labelColor: '#EDE9FE'
    });
    catalogTvFurniture(ctx, screen, t);
    stickerCharacter(ctx, screen.x + screen.w * 0.55, screen.y + screen.h - 29, 24.5, t, item.id, {
      seed: 900 + idx,
      poseBlend: clamp(age / 0.12),
      sq: age < 0.14 ? -0.07 * Math.sin((age / 0.14) * Math.PI) : 0
    });
    paint(ctx, ellPts(tv.x + tv.w - 34, tv.y + tv.h - 18, 6, 6, 10), {
      wash: '#4ADE80', ink: PAL.ink, sw: 0.7
    });
    catalogProgress(ctx, idx + 1, STICKER_POSE_CATALOG_39.length, 638, '#C4B5FD');
    camEnd(ctx);
  }

  function shotCatalogComplete(ctx, t, lt, dur) {
    camBegin(ctx, W / 2, 360, 1.04, 0);
    room(ctx, t, '#162B5C');
    letter(ctx, '完整目录播完啦', 640, 132, 44, PAL.gold, { pop: clamp(lt / 0.25), rot: -0.012 });
    letter(ctx, SAMPLE_VARIANT === 'oldactions'
      ? '像素动作 28/28 · 电视姿势 39/39'
      : '像素动作 28/28 · 无新加饰品', 640, 188, 25, PAL.cream, {
      stroke: false, ink: false
    });
    pixelOld(ctx, 640, 590, 40, t, {
      action: 'jump_joy', emotionName: 'happy', moveMode: 'bounce', seed: 999
    });
    catalogProgress(ctx, SAMPLE_VARIANT === 'oldactions' ? 39 : 28,
      SAMPLE_VARIANT === 'oldactions' ? 39 : 28, 638, PAL.gold);
    camEnd(ctx);
  }

  const SAMPLE_SHOTS = [
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
    [C(12), shotB12EatAndWait],
    [PIXEL_CATALOG_START, shotPixelActionCatalog]
  ];
  if (POSE_CATALOG_START !== null) SAMPLE_SHOTS.push([POSE_CATALOG_START, shotStickerPoseCatalog]);
  SAMPLE_SHOTS.push([CATALOG_END, shotCatalogComplete]);

  TIMELINE.chapter(`day2_bonus_sample_${SAMPLE_VARIANT}`, 0, TT.duration, SAMPLE_SHOTS);

  const DAY2_BONUS_SAMPLE_ALL = {
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
    shotPixelActionCatalog,
    shotStickerPoseCatalog,
    shotCatalogComplete,
    drawTv,
    PIXEL_ACTION_CATALOG_28,
    STICKER_POSE_CATALOG_39,
    SAMPLE_VARIANT,
    SAMPLE_LINES,
    TT
  };
  root.DAY2_BONUS_SAMPLE_ALL = DAY2_BONUS_SAMPLE_ALL;
  root.DAY2_BONUS_ALL = DAY2_BONUS_SAMPLE_ALL;
  if (typeof module !== 'undefined' && module.exports) module.exports = DAY2_BONUS_SAMPLE_ALL;
})(typeof window !== 'undefined' ? window : globalThis);

