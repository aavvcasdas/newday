// day_episode.template.spec.mjs — Day 正传系列通用单集模板（同时兼容 Canvas 2D 与 Remotion 双渲染后端）
// 用法：
//   1. 新建 DayN 时可复制本模板至 tools/dayN制作/episode.spec.mjs，替换 day / title / sourceScriptSha256 与各镜台词锚点；
//   2. 角色移动优先声明 locomotion: 'side_walk' | 'walk' | 'happy_walk' | 'sad_walk' | 'push_walk' | 'idle'
//      配合 walk: { from, to, startLine, duration } 或 track: [[t, [x, y], 'linear'], ...]：
//      - 行进期间自动播放双骨骼连续三角网格蒙皮 16 帧步态（*_2leg，零膝盖断缝、零第 3 条腿、头顶平稳不蹦跳）；
//      - 起步前与到站停稳后自动无跳变切回 100% 同体同比例待机图集（*_pet），绝不跨立绘闪变；
//   3. 需要本鲸高清 10 骨骼网格手掌校准交互（drop_bonk / handoff 等）时，可使用 pose + action: 'walk_natural' | 'step_back' | 'sit_settle'。

import { createHash } from 'node:crypto';

export const DAY_EPISODE_TEMPLATE_LINES = Object.freeze([
  '今天把海底工位搬去新走廊，先把昨天漏掉的清单顺一遍。',
  '豆包从走廊门外迈步进来，顺手把刚整好的工单递到桌前。',
  '结果第一页就把午饭和预算写串了，本鲸吓得往后退了半步。',
  'Gemini 也从侧门走过来核对，把错行当场圈出来改回正轨。',
  '改完收工坐上茶水间长椅喘口气，今天总算一页都没漏。',
]);

export const DAY_EPISODE_TEMPLATE_SHA256 = createHash('sha256')
  .update(DAY_EPISODE_TEMPLATE_LINES.join('\n') + '\n')
  .digest('hex');

export function buildTemplatePlanningAlignment(lines = DAY_EPISODE_TEMPLATE_LINES) {
  const cues = lines.map((text, idx) => ({
    index: idx + 1,
    start: Number((idx * 3.0).toFixed(2)),
    end: Number(((idx + 1) * 3.0 - 0.12).toFixed(2)),
    text,
  }));
  return {
    measured: false,
    source_duration_seconds: lines.length * 3.0,
    cues,
  };
}

export function buildTemplatePlanningSubtitles(lines = DAY_EPISODE_TEMPLATE_LINES) {
  return {
    measured: false,
    screens: lines.map((text, idx) => ({
      index: idx + 1,
      start: Number((idx * 3.0).toFixed(2)),
      end: Number(((idx + 1) * 3.0 - 0.12).toFixed(2)),
      text,
    })),
  };
}

export const DAY_EPISODE_TEMPLATE_SPEC = {
  day: 99,
  title: '通用模板示例：走廊交接与改稿收工',
  speaker: '本鲸',
  directorVersion: 1,
  status: 'planning',
  measured: false,
  sourceScriptSha256: DAY_EPISODE_TEMPLATE_SHA256,
  defaultSet: 'underwater_study',
  pending: [
    '模板示例：正式单集须替换为当集锁定台词 SHA256 与实测 voice_alignment.json',
  ],
  opener: {
    headlinePrefix: '新走廊开工，',
    headlineHighlight: '清单怎又写串了？',
    actorA: {
      name: '本鲸',
      locomotion: 'side_walk',
      x: 450,
      y: 600,
      height: 306,
      flip: true,
      idleMotion: 0,
    },
    actorB: {
      name: '豆包',
      assetId: 'doubao',
      locomotion: 'walk',
      x: 820,
      y: 600,
      height: 298,
      idleMotion: 0,
    },
    foregroundProps: [],
  },
  shots: [
    {
      id: 'T01_CORRIDOR_ENTER',
      fromLine: 1,
      toLine: 2,
      set: 'corridor_hatch',
      framing: 'two_shot',
      mood: 'work_cool',
      cameraIntent: {
        type: 'pan',
        reason: '跟随本鲸与豆包双向匀速迈步走入走廊桌前汇合',
        at: 1.2,
        duration: 2.2,
        to: { cx: 640, cy: 360, z: 1.08 },
      },
      actors: [
        {
          name: '本鲸',
          locomotion: 'side_walk',
          y: 600,
          height: 306,
          idleMotion: 0.2,
          walk: { from: 300, to: 490, start: 0.2, duration: 1.45, autoFace: true },
          heldProp: {
            propId: 'folded_page',
            hand: 'right',
            placeToAnchor: { line: 2, char: '递', x: 640, y: 500, duration: 0.45 },
          },
        },
        {
          name: '豆包',
          assetId: 'doubao',
          locomotion: 'walk',
          y: 600,
          height: 298,
          idleMotion: 0.2,
          walk: { from: 1020, to: 790, startLine: 2, duration: 1.35, autoFace: true },
        },
      ],
      stageTriggers: [
        { kind: 'open_door', line: 2, char: '门', duration: 0.65, to: 0.92 },
      ],
      foregroundTable: { x: 430, y: 534, width: 420 },
      companionProps: [],
      interactions: [],
      direction: {
        kind: 'staging',
        focus: '本鲸与豆包双双自然迈步入场并在桌前交接工单',
        entry: '走廊门微开，本鲸自左迈步入场，豆包推门自右迈步走近',
        action: '两人使用双骨骼连续蒙皮步态匀速走到桌前停稳，自动无跳变切回同体待机并将工单落桌',
        trigger: 'L02「迈」',
        wordLine: 2,
        wordChar: '迈',
        result: '两人稳立桌侧，工单落在桌面中央',
        resultLine: 2,
        resultChar: '桌',
        reaction: '停步后保持同体呼吸微动，脚底零打滑零弹跳',
        exit: '视线落向桌面第一页内容',
        transition: '切近景查看写串的第一页',
        continuity: { in: '走廊空桌', out: '双人立于桌侧、工单在桌' },
        settleSeconds: 0.35,
        holdSeconds: 0.45,
      },
    },
    {
      id: 'T02_SHOCK_STEP_BACK',
      fromLine: 3,
      toLine: 3,
      set: 'screening_desk',
      framing: 'medium_left',
      mood: 'alert_warm',
      cameraIntent: {
        type: 'push',
        reason: '推近呈现发现预算写串后的受惊退半步反应',
        at: 6.2,
        duration: 1.1,
        to: { cx: 520, cy: 356, z: 1.16 },
      },
      actors: [
        {
          name: '本鲸',
          pose: 'point',
          poses: [{ line: 3, pose: 'shock' }],
          action: 'step_back',
          x: 480,
          y: 600,
          u: 38,
          idleMotion: 0.25,
        },
        {
          name: '豆包',
          assetId: 'doubao',
          locomotion: 'idle',
          x: 790,
          y: 600,
          height: 298,
          idleMotion: 0.2,
        },
      ],
      stageTriggers: [
        { kind: 'slam_desk', line: 3, char: '串', intensity: 0.8 },
      ],
      foregroundTable: { x: 430, y: 534, width: 420 },
      companionProps: [
        {
          propId: 'folded_page',
          x: 640,
          y: 500,
          scale: 0.88,
          state: { title: '工单核对', text: '午饭写串', sub: '' },
        },
      ],
      interactions: [],
      direction: {
        kind: 'reaction',
        focus: '发现写串时本鲸受惊后退半步的判断反应',
        entry: '承接上一镜双人桌前站位',
        action: '本鲸触发 step_back 受惊后退半步并切震惊姿态，桌面轻震',
        trigger: 'L03「串」',
        wordLine: 3,
        wordChar: '串',
        result: '错行问题暴露在桌面工单上',
        resultLine: 3,
        resultChar: '退',
        reaction: '后退半步后稳住重心，不原地循环乱晃',
        exit: '等待侧门同伴上前复核',
        transition: '拉宽迎接同伴入场纠偏',
        continuity: { in: '双人桌前看纸', out: '本鲸略退半步、工单在桌' },
        settleSeconds: 0.35,
        holdSeconds: 0.45,
      },
    },
    {
      id: 'T03_GUEST_WALK_FIX',
      fromLine: 4,
      toLine: 4,
      set: 'underwater_study',
      framing: 'wide',
      mood: 'work_cool',
      cameraIntent: {
        type: 'follow',
        reason: '跟随嘉宾 Gemini 双腿迈步入场核对纠偏',
        at: 9.1,
        duration: 1.6,
        to: { cx: 650, cy: 360, z: 1.06 },
      },
      actors: [
        {
          name: '本鲸',
          locomotion: 'side_walk',
          x: 455,
          y: 600,
          height: 306,
          flip: true,
          idleMotion: 0.2,
        },
        {
          name: 'Gemini',
          assetId: 'gemini',
          locomotion: 'walk',
          y: 600,
          height: 292,
          idleMotion: 0.2,
          walk: { from: 1030, to: 770, start: 9.1, duration: 1.4, autoFace: true },
        },
      ],
      foregroundTable: { x: 430, y: 534, width: 420 },
      companionProps: [
        {
          propId: 'folded_page',
          x: 640,
          y: 500,
          scale: 0.88,
          state: { title: '工单核对', text: '已改回正轨', sub: '' },
        },
      ],
      interactions: [],
      direction: {
        kind: 'staging',
        focus: '嘉宾迈步走近桌前把错行改回正轨',
        entry: '本鲸在桌左等待，Gemini 从右侧迈步走入',
        action: 'Gemini 使用双骨骼蒙皮步态匀速走到桌右停稳，工单状态更新为已改回正轨',
        trigger: 'L04「走」',
        wordLine: 4,
        wordChar: '走',
        result: 'Gemini 到位停稳，错行完成修正',
        resultLine: 4,
        resultChar: '正',
        reaction: '本鲸面向同伴自然待机确认',
        exit: '核对完毕准备收工休息',
        transition: '柔和叠化转入茶水间收尾',
        continuity: { in: '工单待复核', out: '双人核对完成' },
        settleSeconds: 0.35,
        holdSeconds: 0.5,
      },
    },
    {
      id: 'T04_BENCH_SETTLE',
      fromLine: 5,
      toLine: 5,
      set: 'pantry_hearth',
      framing: 'two_shot',
      mood: 'cozy_warm',
      cameraIntent: {
        type: 'static',
        reason: '温暖固定镜头留足收尾停留感',
      },
      actors: [
        {
          name: '本鲸',
          locomotion: 'idle',
          // 收尾镜不再用长椅坐姿（已下线）：显式指定同体待机图集，保证双人全镜不是"纯静态摆拍"
          atlas: 'whale_idle_side_pet',
          x: 560,
          y: 600,
          height: 304,
          flip: true,
          idleMotion: 0.2,
        },
        {
          name: '豆包',
          assetId: 'doubao',
          locomotion: 'idle',
          x: 760,
          y: 600,
          height: 298,
          idleMotion: 0.2,
        },
      ],
      stageTriggers: [
        { kind: 'toggle_lamp', line: 5, char: '坐', to: 1.0 },
      ],
      companionProps: [],
      interactions: [],
      direction: {
        kind: 'reaction',
        focus: '收工后本鲸原地温柔收尾',
        entry: '茶水间暖灯亮起，本鲸安稳站定，豆包在旁陪伴',
        action: '本鲸使用同体待机图集呼吸微动，留足 0.8s 收尾停留',
        trigger: 'L05「坐」',
        wordLine: 5,
        wordChar: '坐',
        result: '全集问题闭环，暖色收工画面稳定成形',
        resultLine: 5,
        resultChar: '漏',
        reaction: '暖灯常亮、角色安稳呼吸收束',
        exit: '画面自然保持至音频结束',
        transition: '片尾稳定收束',
        continuity: { in: '核对收工', out: '茶水间安稳落座' },
        settleSeconds: 0.35,
        holdSeconds: 0.8,
      },
    },
  ],
};

export default DAY_EPISODE_TEMPLATE_SPEC;
