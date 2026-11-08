// mv_cast_registry.mjs — MV 八位角色形象与其招牌动作，正式并入 Day 系列通用引擎
// 目的：Day 正传新集不必再重做人物，可直接按角色点名入场、按动作点名表演。
//
// 边界（与 agent.md 第 25、30、33 条一致）：
//   1. 只登记本仓库已有的角色抠图与 16 帧动作图集，**零新增生图、零拷入上游 pets 仓库 PNG/GIF**；
//   2. 步态节拍参照 tqlearning/ai-girl-chatgpt-pets（固定单格、8 帧 ×120ms、脚落地即踩实、
//      头顶起伏 <= ±2px），但画面全部由本项目角色素材程序化合成；
//   3. 招牌动作分两种落地方式：
//      - 图集画面里已经画进道具的（相机、纸灯笼、怀表、扫帚、推山、烟花、星、缎带、书），只播图集；
//      - 图集只有手势、道具没画的（豆包举灯/撑伞），才挂 `heldProp`，由通用 `prop_registry`
//        的矢量化道具跟手，字幕文案仍可注入；
//   3b. `posture` 标注该动作的真实身体姿态（standing / sitting / crouch / swimming），
//       Day 分镜据此安排入场高度，不把坐姿动作放在站立镜里冒充站立。
//   4. 角色立场不变：口播仍只有本鲸；客人以图集哑演 + 纸条/字幕出现，不新增声线（第 25(d) 条）。

export const MV_CAST_IDS = Object.freeze(['whale', 'doubao', 'gpt', 'gemini', 'claude', 'kimi', 'qwen', 'zai']);

/** 每位角色的 Day 系列身份、默认外观与步态图集（walk/idle 必须同体同比例成对） */
export const MV_CAST = Object.freeze({
  whale: {
    id: 'whale',
    label: '本鲸',
    role: 'lead',
    speech: true,
    visual: 'Day12 鲸娘（蓝发女仆装、鲸尾）',
    locomotion: { walk: 'whale_walk_side_2leg', side_walk: 'whale_walk_side_2leg', happy_walk: 'whale_walk_happy_2leg', sad_walk: 'whale_walk_sad_2leg', idle: 'whale_idle_side_pet', sit_bench: 'whale_seat_side_bench' },
    idle: { happy: 'whale_idle_happy_pet', sad: 'whale_idle_sad_pet' },
  },
  doubao: {
    id: 'doubao',
    label: '豆包',
    role: 'helper',
    speech: false,
    visual: '豆包（短发黑衣、帮手工牌）',
    locomotion: { walk: 'doubao_walk_side_2leg', side_walk: 'doubao_walk_side_2leg', idle: 'doubao_idle_side_pet' },
    idle: {},
  },
  gpt: {
    id: 'gpt',
    label: 'GPT 龙娘',
    role: 'guest',
    speech: false,
    visual: '白发紫眸龙娘（龙角、小翅、龙尾、白裙）',
    locomotion: { walk: 'gpt_walk_2leg', side_walk: 'gpt_walk_2leg', push_walk: 'gpt_push_walk_2leg', idle: 'gpt_idle_pet' },
    idle: { push: 'gpt_push_idle_pet' },
  },
  gemini: {
    id: 'gemini',
    label: 'Gemini',
    role: 'guest',
    speech: false,
    visual: '长发渐变 Gemini 少女',
    locomotion: { walk: 'gemini_walk_2leg', side_walk: 'gemini_walk_2leg', idle: 'gemini_idle_pet' },
    idle: {},
  },
  claude: {
    id: 'claude',
    label: 'Claude 大小姐',
    role: 'guest',
    speech: false,
    visual: '橙发礼裙 Claude（已署名 Q 版，见 0.1 表）',
    locomotion: { walk: 'claude_walk_2leg', side_walk: 'claude_walk_2leg', idle: 'claude_idle_pet' },
    idle: {},
  },
  kimi: {
    id: 'kimi',
    label: 'Kimi',
    role: 'guest',
    speech: false,
    visual: '黑长直 Kimi 少女',
    locomotion: { walk: 'kimi_walk_2leg', side_walk: 'kimi_walk_2leg', idle: 'kimi_idle_pet' },
    idle: {},
  },
  qwen: {
    id: 'qwen',
    label: '千问',
    role: 'guest',
    speech: false,
    visual: '紫发千问少女',
    locomotion: { walk: 'qwen_walk_2leg', side_walk: 'qwen_walk_2leg', idle: 'qwen_idle_pet' },
    idle: {},
  },
  zai: {
    id: 'zai',
    label: 'Z.AI',
    role: 'guest',
    speech: false,
    visual: '黑发 Z.AI 少女',
    locomotion: { walk: 'zai_walk_2leg', side_walk: 'zai_walk_2leg', idle: 'zai_idle_pet' },
    idle: {},
  },
});

/**
 * MV 招牌动作（Day 分镜可直接 `action: '<id>'` 调用；也可 `atlas: '<atlas>'` 手动点名）。
 *
 * `heldProp` 只在「图集画面里没有画这件道具」时才登记，避免出现两个灯笼/两把伞：
 *   - `hand: 'right' | 'left' | 'headTop'`，`offsetX/offsetY` 为像素微调，`scale` 为道具缩放；
 *   - 图集已经把道具画进画面的（相机、纸灯笼、怀表、扫帚、推山、烟花、星、缎带、书、饭盆等）
 *     一律 `heldProp: null`，只播放图集本身。
 */
export const MV_SIGNATURE_ACTIONS = Object.freeze({
  // —— 鲸娘（本鲸）：Day 正传主角，图集动作可直接复用 ——
  'whale_read_book': { actor: 'whale', atlas: 'whale_read_action', label: '抱着册子看', kind: 'atlas', posture: 'sitting', heldProp: null },
  'whale_raise_camera': { actor: 'whale', atlas: 'whale_camera_action', label: '举相机拍照', kind: 'atlas', posture: 'sitting', heldProp: null },
  'whale_hold_ribbon': { actor: 'whale', atlas: 'whale_ribbon_hold_action', label: '双手牵许愿带', kind: 'atlas', posture: 'sitting', heldProp: null },
  'whale_light_sparkler': { actor: 'whale', atlas: 'whale_selfkind_retry_action', label: '闭眼许愿', kind: 'atlas', posture: 'sitting', heldProp: null },
  'whale_kneel_gather': { actor: 'whale', atlas: 'whale_gather_retry_action', label: '蹲下拾穗', kind: 'atlas', posture: 'crouch', heldProp: null },
  'whale_reach_rain': { actor: 'whale', atlas: 'whale_rain_reach_action', label: '坐下伸手接雨', kind: 'atlas', posture: 'sitting', heldProp: null },
  'whale_rain_walk': { actor: 'whale', atlas: 'whale_rainwalk_action', label: '3/4 雨中迈步', kind: 'atlas', posture: 'standing', heldProp: null },
  'whale_side_rain_walk': { actor: 'whale', atlas: 'whale_side_rainwalk_action', label: '侧身雨中迈步', kind: 'atlas', posture: 'standing', heldProp: null },
  'whale_greet_wave': { actor: 'whale', atlas: 'whale_bird', label: '站立招手', kind: 'atlas', posture: 'standing', heldProp: null },
  'whale_react_surprise': { actor: 'whale', atlas: 'whale_meet_action', label: '站立惊喜', kind: 'atlas', posture: 'standing', heldProp: null },
  'whale_point_at': { actor: 'whale', atlas: 'whale_point', label: '站立指认', kind: 'atlas', posture: 'standing', heldProp: null },
  'whale_sit_bench': { actor: 'whale', atlas: 'whale_seat_side_bench', label: '长椅落座', kind: 'atlas', posture: 'sitting', heldProp: null },
  // —— 豆包（帮手）：Day12 起的常驻帮手 ——
  'doubao_lift_lantern': { actor: 'doubao', atlas: 'doubao_lantern_action', label: '双手举灯照路', kind: 'atlas', heldProp: { propId: 'lantern', hand: 'headTop', offsetYFrac: 0.012, scale: 0.62, scaleRef: 298 } },
  // 伞用「钉子锚点」钉在画中那根绿棒上（脚底原点 + 身高比例），手势变化不会带偏：
  // 图集格 384×416，内容并非居中对齐（leftFrac .198 / rightFrac .669），
  // 换算到角色局部坐标：棒心 x -0.010h（翻转时随之取反），棒身 -0.608h..-0.404h，
  // 可见头顶 -0.810h。伞尖放 -0.97h，伞面下沿 -0.822h 正好在头顶上方，
  // 112px 伞杆的手钩落在 -0.594h，压在画中绿棒里。
  'doubao_hold_umbrella': { actor: 'doubao', atlas: 'doubao_shared_umbrella_action', label: '撑伞同挡雨', kind: 'atlas', posture: 'standing',
    heldProp: { propId: 'umbrella', anchor: 'foot', offsetXFrac: -0.010, offsetYFrac: -0.970, scale: 1.0, scaleRef: 298, state: { shaft: 112 } } },
  'doubao_step_in': { actor: 'doubao', atlas: 'doubao_step_action', label: '挎包迈步进门', kind: 'atlas', posture: 'standing', heldProp: null },
  'doubao_hold_memory': { actor: 'doubao', atlas: 'doubao_memory_action', label: '捧着旧物', kind: 'atlas', heldProp: null },
  // —— GPT 龙娘 ——
  'gpt_push_mountain': { actor: 'gpt', atlas: 'gpt_push_final_action', label: '推山开道', kind: 'atlas', heldProp: null },
  'gpt_sweep_ground': { actor: 'gpt', atlas: 'gpt_sweep_action', label: '拿扫帚扫院', kind: 'atlas', heldProp: null },
  'gpt_toss_star': { actor: 'gpt', atlas: 'gpt_star_action', label: '掌上抛星', kind: 'atlas', heldProp: null },
  'gpt_think_hard': { actor: 'gpt', atlas: 'gpt_think_action', label: '站着想事', kind: 'atlas', heldProp: null },
  // —— Gemini ——
  'gemini_swim': { actor: 'gemini', atlas: 'gemini_swim_full_action', label: '下水游', kind: 'atlas', posture: 'swimming', heldProp: null },
  'gemini_toss_star': { actor: 'gemini', atlas: 'gemini_star_toss_action', label: '撒星', kind: 'atlas', heldProp: null },
  'gemini_hold_flower': { actor: 'gemini', atlas: 'gemini_flower_action', label: '捧花', kind: 'atlas', heldProp: null },
  'gemini_light_firework': { actor: 'gemini', atlas: 'gemini_firework_action', label: '举烟花', kind: 'atlas', heldProp: null },
  'gemini_pose_softly': { actor: 'gemini', atlas: 'gemini_kite_action', label: '双手合在身前', kind: 'atlas', heldProp: null },
  // —— Claude 大小姐 ——
  'claude_collect': { actor: 'claude', atlas: 'claude_collect_action', label: '蹲下收拾', kind: 'atlas', posture: 'crouch', heldProp: null },
  'claude_place_spread': { actor: 'claude', atlas: 'claude_place_action', label: '摆开一摊小物', kind: 'atlas', posture: 'crouch', heldProp: null },
  'claude_wave_bird': { actor: 'claude', atlas: 'claude_bird_wave37_action', label: '挥手放纸鸟', kind: 'atlas', heldProp: null },
  'claude_light_firework': { actor: 'claude', atlas: 'claude_firework_action', label: '举仙女棒', kind: 'atlas', heldProp: null },
  // —— Kimi ——
  'kimi_hold_lantern': { actor: 'kimi', atlas: 'kimi_lantern_action', label: '提纸灯笼', kind: 'atlas', heldProp: null },
  'kimi_stargaze': { actor: 'kimi', atlas: 'kimi_stargaze_seated_action', label: '坐着看星', kind: 'atlas', posture: 'sitting', heldProp: null },
  'kimi_walk_story': { actor: 'kimi', atlas: 'kimi_walk_story_action', label: '边走边讲', kind: 'atlas', heldProp: null },
  'kimi_swim': { actor: 'kimi', atlas: 'kimi_swim_padded_fixed_action', label: '下水游', kind: 'atlas', posture: 'swimming', heldProp: null },
  // —— 千问 ——
  'qwen_wave_bird': { actor: 'qwen', atlas: 'qwen_bird_wave36_action', label: '提灯挥手', kind: 'atlas', heldProp: null },
  'qwen_reach_out': { actor: 'qwen', atlas: 'qwen_reach_action', label: '铺卷轴伸手', kind: 'atlas', posture: 'sitting', heldProp: null },
  'qwen_swim': { actor: 'qwen', atlas: 'qwen_swim_full_retry_action', label: '下水游', kind: 'atlas', posture: 'swimming', heldProp: null },
  // —— Z.AI ——
  'zai_watch_clock': { actor: 'zai', atlas: 'zai_clock_action', label: '低头看怀表', kind: 'atlas', posture: 'standing', heldProp: null },
  'zai_hold_memento': { actor: 'zai', atlas: 'zai_memento_action', label: '捧着小旧物', kind: 'atlas', heldProp: null },
  'zai_reach': { actor: 'zai', atlas: 'zai_reach_action', label: '伸手递出', kind: 'atlas', heldProp: null },
});

export const MV_SIGNATURE_ACTION_IDS = Object.freeze(Object.keys(MV_SIGNATURE_ACTIONS));

/** 该角色当前可用的全部动作图集名（含步态/待机），供校验器与文档共用 */
export function mvCastAtlasNames(actorId) {
  const c = MV_CAST[actorId];
  if (!c) return [];
  const names = new Set([...Object.values(c.locomotion), ...Object.values(c.idle)]);
  for (const a of Object.values(MV_SIGNATURE_ACTIONS)) {
    if (a.actor === actorId && a.atlas) names.add(a.atlas);
  }
  return [...names];
}

export function isMvCastId(id) {
  return typeof id === 'string' && MV_CAST_IDS.includes(id);
}

export function isMvSignatureAction(id) {
  return typeof id === 'string' && Object.prototype.hasOwnProperty.call(MV_SIGNATURE_ACTIONS, id);
}

export function mvSignatureAction(id) {
  return MV_SIGNATURE_ACTIONS[id] || null;
}

/** 该动作的身体姿态：standing / sitting / crouch / swimming（未标注视为 standing） */
export function mvSignaturePosture(id) {
  return MV_SIGNATURE_ACTIONS[id]?.posture || 'standing';
}

/** 某角色可用于「站立出场」的招牌动作（坐/蹲/游姿不参与） */
export function mvStandingActions(actorId = null) {
  return Object.entries(MV_SIGNATURE_ACTIONS)
    .filter(([, a]) => (!actorId || a.actor === actorId) && (a.posture || 'standing') === 'standing')
    .map(([id]) => id);
}

/** 该角色走位预设 → 图集名（含 Day 通用 locomotion 预设子集） */
export function mvCastLocomotionAtlas(actorId, preset = 'walk') {
  const c = MV_CAST[actorId];
  if (!c) return null;
  const table = c.locomotion;
  return table[preset] || table.walk || null;
}
