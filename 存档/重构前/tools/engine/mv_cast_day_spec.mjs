// mv_cast_day_spec.mjs — MV 八位角色 × MV 招牌动作，正式并入 Day 系列后的通用验收分镜
//
// 用途：新增/修改 MV 角色或招牌动作后，用这份 8 行台词的分镜一次跑通：
//   - 8 位角色（whale / doubao / gpt / gemini / claude / kimi / qwen / zai）逐个入场；
//   - 走位（双骨骼蒙皮 pet 节拍步态）→ 到站无跳变切同体待机 → 招牌动作图集 → 坐/游姿态；
//   - 豆包举灯/撑伞这两处「图集里没画道具」的动作用 prop_registry 真实矢量道具跟手；
//   - 全程 planning / measured=false，只作结构与动作验收，不冒充正式成片。
//
// 运行（Canvas 2D 后端）：
//   node tools/engine/render_mv_cast_sample.mjs
// 运行（Remotion 后端 dry-run）：
//   NODE_PATH=$PWD/tools/engine/node_modules node tools/remotion-engine/render_cli.mjs \
//     --mode episode --spec tools/engine/mv_cast_day_spec.mjs --dry-run
//
// 口径：口播仍只有本鲸；八位客人用图集哑演 + 纸上字，不新增声线（agent.md 第 25(d) 条）。

import { createHash } from 'node:crypto';

export const MV_CAST_DAY_LINES = Object.freeze([
  '搬工位第一天，先让新朋友按顺序走一遍。',
  '豆包举着灯从右边迈进来，把旧纸条放桌上。',
  'GPT 龙娘推着门后那摞箱子，一步一步挪过来。',
  'Gemini 举着花站在光里，先把气氛撑起来。',
  'Claude 在角落蹲下，把散落的小物一件件归位。',
  'Kimi 提着纸灯笼走过去，招呼千问一起下水。',
  '千问铺开卷轴伸手示意，Z.AI 低头看表算时间。',
  '人齐了，本鲸坐下把今天这一页念完。',
]);

export const MV_CAST_DAY_SHA256 = createHash('sha256')
  .update(MV_CAST_DAY_LINES.join('\n') + '\n')
  .digest('hex');

export function buildMvCastDayAlignment(lines = MV_CAST_DAY_LINES) {
  const cues = lines.map((text, idx) => ({
    index: idx + 1,
    start: Number((idx * 3.6).toFixed(2)),
    end: Number(((idx + 1) * 3.6 - 0.12).toFixed(2)),
    text,
  }));
  return { measured: false, source_duration_seconds: lines.length * 3.6, cues };
}

export function buildMvCastDaySubtitles(lines = MV_CAST_DAY_LINES) {
  return {
    measured: false,
    screens: lines.map((text, idx) => ({
      index: idx + 1,
      start: Number((idx * 3.6).toFixed(2)),
      end: Number(((idx + 1) * 3.6 - 0.12).toFixed(2)),
      text,
    })),
  };
}

const direction = ({ focus, entry, action, wordLine, wordChar, resultLine, resultChar, reaction, exit, transition, continuity, holdSeconds = 0.5 }) => ({
  kind: 'staging',
  focus,
  entry,
  action,
  trigger: `L0${wordLine}「${wordChar}」`,
  wordLine,
  wordChar,
  result: focus,
  resultLine,
  resultChar,
  reaction,
  exit,
  transition,
  continuity,
  settleSeconds: 0.3,
  holdSeconds,
});

export const MV_CAST_DAY_SPEC = {
  day: 97,
  title: '通用验收样片：MV 八位角色与招牌动作并入 Day 系列',
  speaker: '本鲸',
  directorVersion: 1,
  status: 'planning',
  measured: false,
  sourceScriptSha256: MV_CAST_DAY_SHA256,
  defaultSet: 'underwater_study',
  pending: [
    '验收样片：只验证角色/步态/招牌动作/道具跟手的结构可用，不含正式配音与实测轴',
  ],
  opener: {
    headlinePrefix: '搬工位第一天，',
    headlineHighlight: '新朋友排好队',
    actorA: { name: '本鲸', characterId: 'whale', locomotion: 'side_walk', x: 430, y: 600, height: 306, flip: true, idleMotion: 0 },
    actorB: { name: '豆包', characterId: 'doubao', locomotion: 'walk', x: 850, y: 600, height: 298, idleMotion: 0 },
    foregroundProps: [],
  },
  shots: [
    {
      id: 'M01_WHALE_WALK',
      fromLine: 1,
      toLine: 1,
      set: 'underwater_study',
      framing: 'two_shot',
      mood: 'work_cool',
      cameraIntent: { type: 'follow', reason: '跟着本鲸横向走进工位，先立住主角步态', at: 0.2, duration: 1.4, to: { cx: 620, cy: 400, z: 1.06 } },
      actors: [
        {
          name: '本鲸',
          characterId: 'whale',
          locomotion: 'side_walk',
          y: 600,
          height: 306,
          idleMotion: 0.18,
          walk: { from: 300, to: 500, start: 0.2, duration: 2.4, autoFace: true },
        },
        { name: '豆包', characterId: 'doubao', locomotion: 'idle', x: 890, y: 600, height: 298, idleMotion: 0.18 },
      ],
      foregroundTable: { x: 430, y: 534, width: 460 },
      companionProps: [],
      interactions: [],
      ambient: [{ type: 'dust', from: 0, to: 3.5, x: 640, y: 250 }],
      direction: direction({
        focus: '本鲸用 pet 节拍步态走到工位前停稳',
        entry: '工位空着，本鲸从左侧入画',
        action: '双骨骼蒙皮步态匀速走近，停步后同体待机',
        wordLine: 1, wordChar: '工', resultLine: 1, resultChar: '顺',
        reaction: '停稳后只留呼吸微动，脚底不打滑',
        exit: '看向右侧门口', transition: '切豆包入场',
        continuity: { in: '走廊空着', out: '本鲸立于桌左' },
      }),
    },
    {
      id: 'M02_DOUBAO_LANTERN',
      fromLine: 2,
      toLine: 2,
      set: 'underwater_study',
      framing: 'medium_right',
      mood: 'work_cool',
      cameraIntent: { type: 'push', reason: '推近看豆包举灯与手上真实道具', at: 3.8, duration: 1.1, to: { cx: 800, cy: 380, z: 1.14 } },
      actors: [
        { name: '本鲸', characterId: 'whale', locomotion: 'idle', x: 470, y: 600, height: 306, idleMotion: 0.16, action: 'whale_greet_wave' },
        {
          name: '豆包',
          characterId: 'doubao',
          locomotion: 'walk',
          y: 600,
          height: 298,
          idleMotion: 0.16,
          action: 'doubao_lift_lantern',
          // 镜头内相对时刻：先举灯（0–2.2s），站定后换撑伞
          actions: [
            { action: 'doubao_lift_lantern', atShot: 0, endShot: 2.2 },
            { action: 'doubao_hold_umbrella', atShot: 2.2 },
          ],
          walk: { from: 1040, to: 800, start: 3.9, duration: 1.5, autoFace: true },
        },
      ],
      foregroundTable: { x: 430, y: 534, width: 460 },
      companionProps: [],
      interactions: [],
      ambient: [],
      direction: direction({
        focus: '豆包举灯迈进桌前，收灯后在同一镜里撑起伞，两个矢量道具都跟手',
        entry: '豆包在右侧门外',
        action: '迈步靠近同时举灯，站定后顺势把伞撑开',
        wordLine: 2, wordChar: '灯', resultLine: 2, resultChar: '桌',
        reaction: '灯光把桌面照亮，豆包站定',
        exit: '让位给龙娘推箱', transition: '滑入下一镜',
        continuity: { in: '本鲸招手', out: '豆包举灯站定' },
      }),
    },
    {
      id: 'M03_GPT_PUSH',
      fromLine: 3,
      toLine: 3,
      set: 'corridor_hatch',
      framing: 'wide',
      mood: 'work_cool',
      cameraIntent: { type: 'pan', reason: '跟随龙娘推箱横移，展示推山动作与步态衔接', at: 7.2, duration: 1.4, to: { cx: 640, cy: 390, z: 1.04 } },
      actors: [
        { name: '本鲸', characterId: 'whale', locomotion: 'idle', x: 360, y: 600, height: 306, idleMotion: 0.16 },
        { name: 'GPT 龙娘', characterId: 'gpt', locomotion: 'walk', y: 600, height: 300, idleMotion: 0.16, action: 'gpt_push_mountain', walk: { from: 1020, to: 760, start: 7.2, duration: 1.9, autoFace: true } },
      ],
      foregroundTable: { x: 430, y: 534, width: 460 },
      companionProps: [],
      interactions: [],
      ambient: [],
      direction: direction({
        focus: 'GPT 龙娘推箱迈步，横移中保持推山动作',
        entry: '走廊门被箱子顶开',
        action: '一边迈步一边推箱，步态与动作图集同帧推进',
        wordLine: 3, wordChar: '推', resultLine: 3, resultChar: '过',
        reaction: '箱子到位，龙娘收手',
        exit: '让出画面给 Gemini', transition: '淡切',
        continuity: { in: '门口堆箱', out: '箱子挪到门口内侧' },
      }),
    },
    {
      id: 'M04_GEMINI_FLOWER',
      fromLine: 4,
      toLine: 4,
      set: 'pantry_hearth',
      framing: 'medium_left',
      mood: 'cozy_warm',
      cameraIntent: { type: 'static', reason: '固定近景看清 Gemini 捧花与灯光层次' },
      actors: [
        { name: 'Gemini', characterId: 'gemini', locomotion: 'walk', y: 600, height: 296, idleMotion: 0.16, action: 'gemini_hold_flower', walk: { from: 980, to: 790, start: 11.0, duration: 1.6, autoFace: true } },
        { name: '本鲸', characterId: 'whale', locomotion: 'idle', x: 430, y: 600, height: 306, idleMotion: 0.16, action: 'whale_react_surprise' },
      ],
      foregroundTable: { x: 430, y: 534, width: 460 },
      companionProps: [],
      interactions: [],
      ambient: [],
      direction: direction({
        focus: 'Gemini 捧花走入暖灯，本鲸惊喜反应',
        entry: '暖灯已亮，本鲸站在左侧',
        action: 'Gemini 边走近边捧花，站定后花仍在身前',
        wordLine: 4, wordChar: '花', resultLine: 4, resultChar: '来',
        reaction: '本鲸惊喜抬手',
        exit: '让位给 Claude 收拾角落', transition: '叠化',
        continuity: { in: '暖灯空镜', out: 'Gemini 站定捧花' },
      }),
    },
    {
      id: 'M05_CLAUDE_COLLECT',
      fromLine: 5,
      toLine: 5,
      set: 'underwater_study',
      framing: 'close_left',
      mood: 'work_cool',
      cameraIntent: { type: 'push', reason: '推近 Claude 蹲下收拾的手部细节', at: 14.7, duration: 1.2, to: { cx: 560, cy: 430, z: 1.2 } },
      actors: [
        { name: 'Claude', characterId: 'claude', locomotion: 'idle', x: 560, y: 600, height: 300, idleMotion: 0.16, action: 'claude_collect' },
        { name: '本鲸', characterId: 'whale', locomotion: 'idle', x: 830, y: 600, height: 306, idleMotion: 0.14 },
      ],
      foregroundTable: { x: 430, y: 534, width: 460 },
      companionProps: [],
      interactions: [],
      ambient: [],
      direction: direction({
        focus: 'Claude 蹲下把小物一件件归位',
        entry: '角落散着一地小物',
        action: '蹲姿动作图集循环，逐件收拢',
        wordLine: 5, wordChar: '蹲', resultLine: 5, resultChar: '位',
        reaction: '收完起身前的最后一格定格',
        exit: '切夜间灯下', transition: '光暗过渡',
        continuity: { in: '地面散物', out: '角落整齐' },
      }),
    },
    {
      id: 'M06_KIMI_QWEN',
      fromLine: 6,
      toLine: 6,
      set: 'pantry_hearth',
      framing: 'two_shot',
      mood: 'cozy_warm',
      cameraIntent: { type: 'pan', reason: '从 Kimi 提灯横移到千问铺卷轴', at: 18.1, duration: 1.3, to: { cx: 660, cy: 400, z: 1.06 } },
      actors: [
        { name: 'Kimi', characterId: 'kimi', locomotion: 'walk', y: 600, height: 300, idleMotion: 0.16, action: 'kimi_hold_lantern', walk: { from: 420, to: 600, start: 18.1, duration: 1.7, autoFace: true } },
        { name: '千问', characterId: 'qwen', locomotion: 'idle', x: 860, y: 600, height: 296, idleMotion: 0.16, action: 'qwen_reach_out' },
      ],
      foregroundTable: { x: 430, y: 534, width: 460 },
      companionProps: [],
      interactions: [],
      ambient: [],
      direction: direction({
        focus: 'Kimi 提灯走过，千问铺开卷轴伸手招呼',
        entry: '夜里灯下无人',
        action: 'Kimi 提灯横移，千问坐地铺卷轴伸手',
        wordLine: 6, wordChar: '灯', resultLine: 6, resultChar: '水',
        reaction: '两人视线对上',
        exit: '切最后一组', transition: '横摇接下一镜',
        continuity: { in: '灯下空地', out: '两人对位' },
      }),
    },
    {
      id: 'M07_QWEN_ZAI',
      fromLine: 7,
      toLine: 7,
      set: 'underwater_study',
      framing: 'wide',
      mood: 'work_cool',
      cameraIntent: { type: 'pull', reason: '拉宽让千问与 Z.AI 同框', at: 21.7, duration: 1.2, to: { cx: 640, cy: 380, z: 1.0 } },
      actors: [
        { name: '千问', characterId: 'qwen', locomotion: 'idle', x: 520, y: 600, height: 296, idleMotion: 0.16, action: 'qwen_wave_bird' },
        { name: 'Z.AI', characterId: 'zai', locomotion: 'walk', y: 600, height: 298, idleMotion: 0.16, action: 'zai_watch_clock', walk: { from: 960, to: 780, start: 21.7, duration: 1.5, autoFace: true } },
      ],
      foregroundTable: { x: 430, y: 534, width: 460 },
      companionProps: [],
      interactions: [],
      ambient: [],
      direction: direction({
        focus: '千问张嘴招呼，Z.AI 边走近边低头看怀表',
        entry: '千问已在左侧',
        action: 'Z.AI 迈步靠近同时低头看表',
        wordLine: 7, wordChar: '表', resultLine: 7, resultChar: '间',
        reaction: '两人同时抬头',
        exit: '人齐收束', transition: '切入收尾',
        continuity: { in: '千问招手', out: '八人到齐' },
      }),
    },
    {
      id: 'M08_WHALE_SIT',
      fromLine: 8,
      toLine: 8,
      set: 'pantry_hearth',
      framing: 'two_shot',
      mood: 'cozy_warm',
      cameraIntent: { type: 'static', reason: '固定收尾，留足念完这一页的停留' },
      actors: [
        { name: '本鲸', characterId: 'whale', locomotion: 'idle', x: 540, y: 600, height: 304, idleMotion: 0.16, action: 'whale_read_book' },
        { name: '豆包', characterId: 'doubao', locomotion: 'idle', x: 790, y: 600, height: 298, idleMotion: 0.16, action: 'doubao_hold_memory' },
      ],
      foregroundTable: { x: 430, y: 534, width: 620 },
      companionProps: [],
      interactions: [],
      ambient: [],
      direction: direction({
        focus: '本鲸坐着把今天这页念完，豆包在旁捧着旧物',
        entry: '众人散开，只剩两人',
        action: '本鲸坐姿读册循环，豆包站定捧物',
        wordLine: 8, wordChar: '念', resultLine: 8, resultChar: '完',
        reaction: '合上册子，暖灯常亮',
        exit: '画面保持到音频结束', transition: '稳定收束',
        continuity: { in: '八人到齐', out: '两人收尾' },
        holdSeconds: 0.8,
      }),
    },
  ],
};

export default MV_CAST_DAY_SPEC;
