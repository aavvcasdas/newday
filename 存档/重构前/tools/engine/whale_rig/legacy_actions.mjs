// ============================================================================
// legacy_actions.mjs — 复刻旧版 video-fx 的 28 个动作（v6）
//
// 「旧版动作」指的是 `video-fx/src/whale_girl_actions.js` 里的 ACTION_LIST（28 个，
// 40 格像素骨架时代写死了每个动作的表演）。这里把它们一个不少地搬到高清立绘 + 骨架上：
//   姿势（复刻生成的高清差分图） × 骨骼运动（whale_rig 的 10 骨） × 表情符号
//
// 每个动作：
//   { id, zh（旧版中文名）, poses:[{at, pose}], motion(t) -> {bones, root, lift}, dur }
// poses 按 at 切姿势，切换处自动做交叉淡化（老姿势垫底淡出、新姿势满不透明压上）。
// ============================================================================

const sin = Math.sin, cos = Math.cos, abs = Math.abs;
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const bump = (x) => (x <= 0 || x >= 1 ? 0 : Math.sin(Math.PI * clamp(x)) ** 1.4);
const ease = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const lag = (t, amp, f = 2.3, ph = 0.8) => amp * sin(t * f - ph);
const hair = (t, a = 0.05) => ({
  hairL: { rot: lag(t, a, 2.2, 0.7) },
  hairR: { rot: lag(t, a, 2.0, 1.1) }
});

// ---------------------------------------------------------------- 骨骼运动
const M = {
  idle_breathe: (t) => ({
    root: { sy: 1 + 0.004 * sin(t * 2.1) },
    bones: { ...hair(t, 0.05), spine: { rot: 0.008 * sin(t * 1.3) }, head: { rot: 0.01 * sin(t * 1.1 + 0.4) }, tail: { rot: 0.10 * sin(t * 1.7) } }
  }),
  eat_chew: (t) => {
    const k = abs(sin(t * 3.6)) ** 1.5;
    return {
      root: { dy: -2 * k * 10 },
      bones: { ...hair(t, 0.04), head: { rot: 0.03 + 0.06 * k, dy: 4 * k }, spine: { rot: 0.02 }, tail: { rot: 0.14 * sin(t * 2.4) } }
    };
  },
  hug_sway: (t) => {
    const a = sin(t * 2.6);
    return { root: { dx: 6 * a, rot: 0.02 * a }, bones: { ...hair(t, 0.07), head: { rot: 0.06 * a, dx: -3 * a }, spine: { rot: -0.04 * a }, tail: { rot: 0.18 * sin(t * 2.6 - 0.4) } } };
  },
  sing_sway: (t) => {
    const a = sin(t * 3.0);
    const b = sin(t * 6.0) * 0.015;
    return { root: { dx: 8 * a }, bones: { ...hair(t, 0.09), spine: { rot: 0.05 * a }, head: { rot: -0.06 * a + b, dy: -3 * a }, armL: { rot: 0.18 * a }, armR: { rot: -0.18 * a }, tail: { rot: 0.20 * sin(t * 3.0 - 0.5) } } };
  },
  sneak_look: (t) => {
    const a = sin(t * 1.7);
    return { root: { dx: 10 * a, dy: 4 }, bones: { ...hair(t, 0.06), spine: { rot: 0.08 }, head: { rot: -0.18 + 0.10 * a, dx: 8 * a, dy: 4 }, tail: { rot: 0.12 * sin(t * 1.9) } } };
  },
  ahoge_pull: (t) => {
    const k = 0.5 + 0.5 * sin(t * 2.2);
    return { root: { dy: -14 - 10 * k, sx: 1 + 0.02 * k, sy: 1 - 0.02 * k }, bones: { ...hair(t, 0.16), head: { rot: -0.10 * k, dy: -6 * k }, spine: { rot: -0.05 * k }, legL: { rot: 0.10 * k }, legR: { rot: -0.10 * k }, tail: { rot: -0.22 * k } }, lift: 0.35 + 0.25 * k };
  },
  sleep_curl: (t) => {
    const b = sin(t * 1.2);
    return { root: { dy: 36, rot: 0.09, sx: 1.05, sy: 0.93 }, bones: { ...hair(t, 0.03), head: { rot: 0.20 + 0.02 * b, dy: 16 }, spine: { rot: 0.12 }, legL: { rot: 0.10 }, legR: { rot: -0.10 }, tail: { rot: 0.30 * sin(t * 1.1) } } };
  },
  stretch_up: (t) => {
    const k = ease(clamp(t / 0.7)) * (1 - 0.15 * clamp((t - 1.4) / 0.8));
    const w = sin(t * 2.0) * 0.05;
    return { root: { dy: -18 * k, sy: 1 + 0.04 * k }, bones: { armL: { rot: -0.55 * k + w }, armR: { rot: 0.55 * k - w }, spine: { rot: -0.05 * k }, head: { rot: -0.08 * k, dy: -4 * k }, hairL: { rot: 0.12 * k }, hairR: { rot: -0.12 * k }, tail: { rot: 0.16 * sin(t * 2.2) } }, lift: 0.2 * k };
  },
  wink_pop: (t) => {
    const k = bump((t % 1.6) / 1.6);
    return { root: { dy: -8 * k, rot: -0.02 * k, sx: 1 + 0.03 * k, sy: 1 - 0.03 * k }, bones: { ...hair(t, 0.08), head: { rot: 0.14 * k }, spine: { rot: -0.04 * k }, armR: { rot: -0.10 * k }, tail: { rot: 0.20 * sin(t * 2.4) } }, lift: 0.5 * k };
  },
  fists_shake: (t) => {
    const a = sin(t * 9.5);
    return { root: { dx: 2 * a, dy: -3 }, bones: { ...hair(t, 0.10), head: { rot: 0.05 * a, dy: -2 }, spine: { rot: 0.03 }, armL: { rot: -0.08 * a - 0.05 }, armR: { rot: 0.08 * a + 0.05 }, tail: { rot: 0.16 * a } } };
  },
  hips_cocky: (t) => {
    const a = sin(t * 2.0);
    return { root: { dx: 12 * a, rot: 0.02 * a }, bones: { ...hair(t, 0.07), spine: { rot: -0.05 * a }, head: { rot: -0.04 * a, dx: -3 * a }, tail: { rot: 0.22 * sin(t * 2.0 - 0.4) } } };
  },
  mic_open: (t) => {
    const a = sin(t * 2.4);
    return { root: { rot: 0.02 * a }, bones: { ...hair(t, 0.10), spine: { rot: 0.04 * a }, head: { rot: -0.08 - 0.04 * a, dy: -4 }, armL: { rot: -0.30 }, armR: { rot: 0.30 }, tail: { rot: 0.24 * sin(t * 2.4 - 0.5) } } };
  },
  type_keys: (t) => {
    const k = abs(sin(t * 11)) ** 1.4;
    return { root: { dy: 6 }, bones: { ...hair(t, 0.05), spine: { rot: 0.07 }, head: { rot: 0.10, dy: 6 }, armL: { rot: 0.16 + 0.05 * k }, armR: { rot: -0.16 - 0.05 * k }, tail: { rot: 0.10 * sin(t * 1.6) } } };
  },
  transform_pop: (t) => {
    const k = bump((t % 1.4) / 1.4);
    return { root: { dy: -26 * k, sx: 1 + 0.10 * k, sy: 1 - 0.06 * k, rot: 0.05 * k }, bones: { ...hair(t, 0.20 * k), head: { rot: 0.10 * k }, tail: { rot: 0.35 * k } }, lift: 0.7 * k };
  },
  tail_dance: (t) => {
    const a = sin(t * 4.2);
    return { root: { dx: 14 * a, dy: -6 * abs(a), rot: 0.05 * a }, bones: { ...hair(t, 0.14), spine: { rot: -0.06 * a }, head: { rot: 0.05 * a }, armL: { rot: -0.25 - 0.10 * a }, armR: { rot: 0.25 + 0.10 * a }, tail: { rot: 0.45 * sin(t * 4.2 - 0.5) } }, lift: 0.2 * abs(a) };
  },
  jump_arc: (t) => {
    const p = clamp((t - 0.2) / 1.2);
    const up = Math.sin(Math.PI * clamp(p));
    const crouch = clamp((t) / 0.2) * (1 - clamp(p * 4));
    return { root: { dy: 24 * crouch - 110 * up, sx: 1 + 0.06 * crouch - 0.03 * up, sy: 1 - 0.07 * crouch + 0.08 * up }, bones: { ...hair(t, 0.18 * up), spine: { rot: 0.04 * crouch - 0.05 * up }, head: { dy: -6 * up }, legL: { rot: 0.14 * crouch }, legR: { rot: -0.14 * crouch }, armL: { rot: -0.35 * up }, armR: { rot: 0.35 * up } }, lift: up };
  },
  peek_tilt: (t) => {
    const a = sin(t * 1.5);
    return { root: { dx: 8, dy: 2 }, bones: { ...hair(t, 0.08), spine: { rot: 0.06 }, head: { rot: 0.14 + 0.06 * a, dy: 3 }, tail: { rot: 0.16 * sin(t * 1.8) } } };
  },
  shy_wiggle: (t) => {
    const a = sin(t * 3.4);
    return { root: { dx: 4 * a, dy: 4 }, bones: { ...hair(t, 0.06), spine: { rot: 0.05 }, head: { rot: 0.10 + 0.03 * a, dy: 5 }, legL: { rot: 0.05 * a }, legR: { rot: -0.05 * a }, tail: { rot: 0.12 * sin(t * 2.2) } } };
  },
  petrify_shake: (t) => {
    const a = sin(t * 22) * 0.6 + sin(t * 7) * 0.4;
    return { root: { dx: 3 * a, dy: -12, sx: 1.02, sy: 1.02 }, bones: { ...hair(t, 0.12), head: { rot: 0.02 * a, dy: -6 }, spine: { rot: -0.04 }, armL: { rot: -0.16 }, armR: { rot: 0.16 }, tail: { rot: 0.06 * a } }, lift: 0.2 };
  },
  cry_sob: (t) => {
    const k = abs(sin(t * 2.8));
    return { root: { dy: -4 + 5 * k, sy: 1 - 0.02 * k }, bones: { ...hair(t, 0.10), spine: { rot: 0.09 }, head: { rot: 0.16 + 0.06 * k, dy: 8 + 4 * k }, armL: { rot: 0.18 }, armR: { rot: -0.18 }, tail: { rot: -0.14 } } };
  },
  toast_up: (t) => {
    const k = ease(clamp(t / 0.6));
    const w = sin(t * 3.2) * 0.06;
    return { root: { dy: -10 * k }, bones: { ...hair(t, 0.08), armR: { rot: -0.95 * k + w }, spine: { rot: -0.05 * k }, head: { rot: -0.06 * k }, tail: { rot: 0.18 * sin(t * 2.2) } } };
  },
  umbrella_walk: (t) => {
    const a = sin(t * 2.2);
    return { root: { dx: 10 * a, dy: -4 - 3 * abs(a) }, bones: { ...hair(t, 0.09), armR: { rot: -0.75 }, spine: { rot: 0.03 * a }, head: { rot: 0.04 * a }, legL: { rot: 0.10 * a }, legR: { rot: -0.10 * a }, tail: { rot: 0.16 * sin(t * 2.2 - 0.4) } } };
  },
  shutter_lean: (t) => {
    const k = bump((t % 1.8) / 1.8);
    return { root: { dy: 8 * k, rot: -0.02 * k }, bones: { ...hair(t, 0.06), spine: { rot: 0.06 * k }, head: { rot: 0.10 * k, dy: 4 * k }, armL: { rot: -0.12 * k }, armR: { rot: 0.12 * k }, tail: { rot: 0.10 * sin(t * 2.0) } } };
  },
  strum_rhythm: (t) => {
    const a = sin(t * 4.6);
    return { root: { dy: -2 + 2 * a }, bones: { ...hair(t, 0.09), spine: { rot: 0.03 * a }, head: { rot: 0.06 * a, dy: 3 * a }, armL: { rot: -0.22 + 0.10 * a }, armR: { rot: 0.18 - 0.12 * a }, tail: { rot: 0.20 * sin(t * 2.3) } } };
  },
  bouquet_present: (t) => {
    const k = ease(clamp(t / 0.8));
    return { root: { dy: -6 * k, rot: 0.02 * k }, bones: { ...hair(t, 0.06), armL: { rot: -0.30 * k }, armR: { rot: 0.30 * k }, head: { rot: 0.10 * k }, tail: { rot: 0.14 * sin(t * 1.9) } } };
  },
  fireworks_wave: (t) => {
    const a = sin(t * 3.6);
    return { root: { dx: 6 * a, rot: 0.03 * a }, bones: { ...hair(t, 0.14), armL: { rot: -0.85 - 0.15 * a }, armR: { rot: 0.85 + 0.15 * a }, head: { rot: -0.05 * a }, tail: { rot: 0.22 * sin(t * 3.0) } } };
  },
  // 走路（腿骨驱动）：站立底图不动，两条腿在裙摆以下交替“抬起 + 外撇”，
  // 配合身体起伏、手臂反相和整身位移 —— 就是旧版 hipL/hipR 的那套读法。
  walk_cycle: (t) => {
    const ph = (t * 7.2) % (Math.PI * 2);
    const raw = Math.sin(ph), c = Math.cos(ph);
    // 用 sign·|sin|^0.65 把摆动在前后两端多停一会儿，落地感更像“迈步”而不是匀速摆
    const s = Math.sign(raw) * Math.pow(Math.abs(raw), 0.65);
    // 摆腿会让脚离地 L*(1-cosθ)（L≈髋到脚 0.24 立绘高）；这里补回去，
    // 脚底始终贴着地面线，否则脚一抬就被裙摆的三角面挡住，看起来像“腿没了”。
    const rotW = 0.46 * s;
    const groundFix = 0.24 * 1024 * (1 - Math.cos(rotW));
    return {
      root: { dy: -6 * Math.abs(c), rot: 0.015 * s },
      bones: {
        legL: { rot: rotW, dy: groundFix },
        legR: { rot: -rotW, dy: groundFix },
        armL: { rot: -0.26 * s }, armR: { rot: 0.26 * s },
        spine: { rot: 0.02 + 0.015 * s },
        head: { rot: -0.02 - 0.012 * s },
        hairL: { rot: 0.14 * Math.sin(ph - 0.9) }, hairR: { rot: -0.14 * Math.sin(ph - 0.9) },
        tail: { rot: 0.20 * Math.sin(ph - 1.1) }
      },
      lift: 0.10 * Math.abs(s)
    };
  },
  // 冲刺（腿骨驱动）：同样的交替抬腿，幅度更大、前倾更多、腾空更高
  run_cycle: (t) => {
    const ph = (t * 11.0) % (Math.PI * 2);
    const raw = Math.sin(ph), c = Math.cos(ph);
    const s = Math.sign(raw) * Math.pow(Math.abs(raw), 0.6);
    const rotR = 0.64 * s;
    // 跑的时候允许离地，但也补掉七成，免得脚整条被裙摆吞掉
    const groundFix = 0.7 * 0.24 * 1024 * (1 - Math.cos(rotR));
    return {
      root: { dy: -16 - 22 * Math.abs(c), rot: 0.075 },
      bones: {
        legL: { rot: rotR, dy: groundFix },
        legR: { rot: -rotR, dy: groundFix },
        armL: { rot: -0.42 * s }, armR: { rot: 0.42 * s },
        spine: { rot: 0.09 + 0.02 * s },
        head: { rot: -0.07 },
        hairL: { rot: 0.26 + 0.10 * Math.sin(ph - 1.0) }, hairR: { rot: 0.26 - 0.10 * Math.sin(ph - 1.0) },
        tail: { rot: 0.26 * Math.sin(ph - 1.2) }
      },
      lift: 0.38 * Math.abs(s)
    };
  },
  walk_step: (t) => {
    const a = sin(t * 4.2);
    return { root: { dx: 16 * clamp(t / 1.6) * 0.6 + 4 * a, dy: -4 * abs(a) }, bones: { ...hair(t, 0.09), legL: { rot: 0.16 * a }, legR: { rot: -0.16 * a }, armL: { rot: 0.14 * a }, armR: { rot: -0.14 * a }, spine: { rot: -0.02 * a }, head: { rot: 0.02 * a }, tail: { rot: 0.12 * sin(t * 4.2 - 0.6) } }, lift: 0.15 * abs(a) };
  },
  run_fast: (t) => {
    const a = sin(t * 9.0);
    return { root: { dx: 20 * clamp((t - 0.3) / 1.2), dy: -6 - 8 * abs(a), rot: 0.06 }, bones: { ...hair(t, 0.22), spine: { rot: 0.08 }, head: { rot: -0.06 }, legL: { rot: 0.26 * a }, legR: { rot: -0.26 * a }, armL: { rot: -0.30 * a }, armR: { rot: 0.30 * a }, tail: { rot: 0.24 * sin(t * 9 - 0.7) } }, lift: 0.3 * abs(a) };
  }
};

// ---------------------------------------------------------------- 28 个旧动作
export const LEGACY_ACTIONS = [
  { id: 'eat_white_rice', zh: '吃白饭大肥鱼', dur: 2.6, poses: [{ at: 0, pose: 'eat' }], motion: 'eat_chew', emote: null },
  { id: 'eat_onigiri', zh: '啃海苔大饭团', dur: 2.6, poses: [{ at: 0, pose: 'eat_onigiri' }], motion: 'eat_chew', emote: 'sparkle' },
  { id: 'coin_hug', zh: '抱大金币财迷', dur: 2.6, poses: [{ at: 0, pose: 'coin_hug' }], motion: 'hug_sway', emote: 'sparkle' },
  { id: 'hum_working_song', zh: '哼唱工作歌', dur: 2.6, poses: [{ at: 0, pose: 'hum_working_song' }], motion: 'sing_sway', emote: 'note' },
  { id: 'token_wordle_sneak', zh: '偷吃 Token 玩游戏', dur: 2.8, poses: [{ at: 0, pose: 'token_wordle_sneak' }, { at: 0.62, pose: 'shock' }], motion: 'sneak_look', emote: 'question' },
  { id: 'drag_ahoge', zh: '拎呆毛悬空', dur: 2.6, poses: [{ at: 0, pose: 'drag_ahoge' }, { at: 0.6, pose: 'drag_ahoge_swing' }], motion: 'ahoge_pull', emote: 'sweat' },
  { id: 'sleep_curl', zh: '蜷尾侧睡流口水', dur: 2.8, poses: [{ at: 0, pose: 'sleep_curl' }], motion: 'sleep_curl', emote: 'sleep' },
  { id: 'wake_stretch', zh: '睡醒伸懒腰', dur: 2.6, poses: [{ at: 0, pose: 'wake_stretch' }], motion: 'stretch_up', emote: null },
  { id: 'ciallo_wink', zh: 'Ciallo～比耶眨眼', dur: 2.4, poses: [{ at: 0, pose: 'ciallo_wink' }], motion: 'wink_pop', emote: 'sparkle' },
  { id: 'playful_fists', zh: '双拳傲娇抗议', dur: 2.4, poses: [{ at: 0, pose: 'playful_fists' }], motion: 'fists_shake', emote: 'exclaim' },
  { id: 'confident_hips', zh: '叉腰得意小肥鱼', dur: 2.6, poses: [{ at: 0, pose: 'confident_hips' }], motion: 'hips_cocky', emote: 'sparkle' },
  { id: 'idol_mic_sing', zh: '张开双手握麦高歌', dur: 2.6, poses: [{ at: 0, pose: 'idol_mic_sing' }], motion: 'mic_open', emote: 'note' },
  { id: 'fatfish_working', zh: '狂敲代码打工鱼', dur: 2.6, poses: [{ at: 0, pose: 'fatfish_working' }], motion: 'type_keys', emote: null },
  { id: 'fatfish_transform', zh: '召唤蓝色大肥鱼', dur: 2.4, poses: [{ at: 0, pose: 'fatfish_transform' }], motion: 'transform_pop', emote: 'sparkle' },
  { id: 'tail_wag_dance', zh: '摇尾欢快偶像舞', dur: 2.8, poses: [{ at: 0, pose: 'tail_wag_dance' }, { at: 0.5, pose: 'wave' }], motion: 'tail_dance', emote: null },
  { id: 'jump_joy', zh: '蓄力高跳摘星', dur: 2.6, poses: [{ at: 0, pose: 'idle' }, { at: 0.28, pose: 'jump_joy' }], motion: 'jump_arc', emote: 'sparkle' },
  { id: 'peek_curious', zh: '探头放大镜观察', dur: 2.6, poses: [{ at: 0, pose: 'peek_curious' }], motion: 'peek_tilt', emote: 'question' },
  { id: 'shy_fidget', zh: '害羞对手指扭捏', dur: 2.6, poses: [{ at: 0, pose: 'shy_fidget' }], motion: 'shy_wiggle', emote: 'sweat' },
  { id: 'shock_petrify', zh: '石化震惊掉下巴', dur: 2.4, poses: [{ at: 0, pose: 'shock_petrify' }], motion: 'petrify_shake', emote: 'exclaim' },
  { id: 'cry_fountain', zh: '暴风哭泣喷泉泪', dur: 2.8, poses: [{ at: 0, pose: 'cry_fountain' }], motion: 'cry_sob', emote: 'sweat' },
  { id: 'toast_cheers', zh: '举杯畅饮碰杯', dur: 2.6, poses: [{ at: 0, pose: 'toast_cheers' }], motion: 'toast_up', emote: 'sparkle' },
  { id: 'umbrella_stroll', zh: '撑鲸鱼伞漫步听雨', dur: 2.8, poses: [{ at: 0, pose: 'umbrella_stroll' }], motion: 'umbrella_walk', emote: null },
  { id: 'camera_shutter', zh: '举拍立得定格拼图', dur: 2.6, poses: [{ at: 0, pose: 'camera_shutter' }], motion: 'shutter_lean', emote: 'sparkle' },
  { id: 'guitar_strum', zh: '抱鲸鱼吉他弹唱', dur: 2.6, poses: [{ at: 0, pose: 'guitar_strum' }], motion: 'strum_rhythm', emote: 'note' },
  { id: 'rose_bouquet', zh: '捧红玫瑰凝望落瓣', dur: 2.6, poses: [{ at: 0, pose: 'rose_bouquet' }], motion: 'bouquet_present', emote: 'sparkle' },
  { id: 'sparkler_firework', zh: '挥舞双仙女棒烟花', dur: 2.6, poses: [{ at: 0, pose: 'sparkler_firework' }], motion: 'fireworks_wave', emote: 'sparkle' },
  { id: 'walk_brisk', zh: '轻快迈步走', dur: 2.6, poses: [{ at: 0, pose: 'walk_stand' }], motion: 'walk_cycle', emote: null, travel: 320 },
  { id: 'run_sprint', zh: '全力冲刺奔跑', dur: 2.4, poses: [{ at: 0, pose: 'run_stand' }], motion: 'run_cycle', emote: null, travel: 560 }
];

export const LEGACY_MOTIONS = M;

// 取某个动作在 t 时刻的姿势与混合量
export function poseAt(action, t) {
  const ps = action.poses;
  let idx = 0;
  for (let i = 0; i < ps.length; i++) if (t >= ps[i].at * action.dur) idx = i;
  const cur = ps[idx];
  if (idx === 0) return { pose: cur.pose, prev: null, blend: 1 };
  const prev = ps[idx - 1];
  const span = Math.max(0.25, (cur.at - prev.at) * action.dur * 0.6);
  const k = clamp((t - cur.at * action.dur) / span);
  return { pose: cur.pose, prev: prev.pose, blend: k };
}

export function motionAt(action, t) {
  const fn = M[action.motion] || M.idle_breathe;
  return fn(t, action.dur);
}
