import test from 'node:test';
import assert from 'node:assert/strict';

import mvSpec from '../mv_dayu/mv.spec.mjs';
import { adaptMvToRemotionProps } from './mv_adapter.mjs';
import { evaluateRemotionFrameState } from './frame_evaluator.mjs';
import { auditRemotionPropsActivity } from './render_cli.mjs';
import { adaptEpisodeToRemotionProps } from '../engine/remotion_episode_adapter.mjs';

test('mv_dayu 声明式多舞台规格: 7 套差异化动态场景、全链路骨骼步态与零静态幻灯片区间', () => {
  const props = adaptMvToRemotionProps({ spec: mvSpec });
  assert.equal(props.mode, 'lyric-mv');
  assert.equal(props.shots.length, 7);

  const uniqueSets = new Set(props.shots.map((s) => s.setSpec.id));
  assert.ok(uniqueSets.size >= 6, '大禹 MV 应切换至少 6 套不同舞台背景而非锁死单一背景');

  // 纯 t 确定性检验：打乱时间采样顺序必须返回完全一致的帧状态（支持 Remotion 并发分片渲染）
  const sampleA1 = evaluateRemotionFrameState(props, 6.25);
  const sampleOther = evaluateRemotionFrameState(props, 19.8);
  const sampleA2 = evaluateRemotionFrameState(props, 6.25);
  assert.deepEqual(sampleA1, sampleA2);
  assert.notEqual(sampleA1.setState.id, sampleOther.setState.id);

  // 环境交互检验：开闸触发器应驱动水闸开启度上升
  const gateBefore = evaluateRemotionFrameState(props, 0.3);
  const gateAfter = evaluateRemotionFrameState(props, 2.2);
  assert.ok(gateAfter.setState.reactive.gateOpen > gateBefore.setState.reactive.gateOpen + 0.4);

  // 手持道具与人物骨骼联动检验
  assert.ok(sampleA1.worldState.boundProps.length >= 1, '角色应通过 handAt 携带并挥动道具');

  // 反 PPT 静态检测：全片无 >=1.0s 的冻结区间
  const activity = auditRemotionPropsActivity(props);
  assert.equal(activity.passed, true, `不应存在静态区间: ${JSON.stringify(activity.staticStretches)}`);
});

test('Remotion 通用引擎无缝评估 Day 系列单集 (episode -> inputProps -> frame state)', () => {
  const alignment = {
    source_duration_seconds: 5.0,
    cues: [
      { index: 1, start: 0.0, end: 2.4, text: '先推开舱门迎接新帮手', chars_timed: [{ ch: '推', start: 0.5, end: 0.7, asrWord: '推' }] },
      { index: 2, start: 2.4, end: 4.8, text: '再递交今日任务卷轴', chars_timed: [{ ch: '递', start: 3.0, end: 3.2, asrWord: '递' }] },
    ],
  };
  const subdata = {
    screens: [
      { index: 1, start: 0.0, end: 2.4, lines: ['先推开舱门迎接新帮手'] },
      { index: 2, start: 2.4, end: 4.8, lines: ['再递交今日任务卷轴'] },
    ],
  };
  const episodeSpec = {
    day: 100,
    title: 'Remotion Day 桥接测试',
    speaker: '本鲸',
    opener: {
      layout: 'two_line',
      headlinePrefix: '深海工位，',
      headlineHighlight: '全员动起来',
      actorA: { name: '本鲸', x: 500, y: 600, pose: 'shock' },
      actorB: { name: '豆包', assetId: 'doubao', x: 780, y: 600, facing: -1 },
      foregroundProps: [],
    },
    shots: [
      {
        id: 'hatch_welcome',
        fromLine: 1,
        toLine: 1,
        set: 'corridor_hatch',
        framing: 'two_shot',
        direction: { kind: 'character', focus: '舱门迎接', action: '开门挥手', trigger: '推字开门', result: '暖光涌入走廊' },
        actors: [
          { name: '本鲸', x: 480, y: 600, action: 'wave', move: 'groove' },
          { name: '豆包', assetId: 'doubao', x: 820, y: 600, facing: -1, move: 'bounce' },
        ],
        companionProps: [{ propId: 'empty_bowl', x: 640, y: 550, scale: 0.7 }],
        stageTriggers: [{ kind: 'open_door', line: 1, char: '推', duration: 0.6, target: 0.95 }],
      },
      {
        id: 'pantry_handoff',
        fromLine: 2,
        toLine: 2,
        set: 'pantry_hearth',
        framing: 'two_shot',
        transition: { type: 'door_wipe', duration: 0.45 },
        direction: { kind: 'character', focus: '茶水间交接', action: '递交卷轴', trigger: '递字交接', result: '同伴接手' },
        actors: [
          {
            name: '本鲸',
            x: 500,
            y: 600,
            action: 'give',
            heldProp: {
              kind: 'scroll',
              hand: 'right',
              label: '任务单',
              transfer: { at: 3.0, toActor: '豆包', toHand: 'left', duration: 0.5 },
            },
          },
          { name: '豆包', assetId: 'doubao', x: 780, y: 600, facing: -1, action: 'cheer' },
        ],
        companionProps: [{ propId: 'empty_bowl', x: 640, y: 550, scale: 0.7 }],
      },
    ],
  };

  const props = adaptEpisodeToRemotionProps({ spec: episodeSpec, alignment, subdata, planningPreview: true });
  const st0 = evaluateRemotionFrameState(props, 1.4);
  const st1 = evaluateRemotionFrameState(props, 2.55);
  const st2 = evaluateRemotionFrameState(props, 3.8);

  assert.equal(st0.setState.id, 'corridor_hatch');
  assert.ok(st0.setState.reactive.doorOpen > 0.85);
  assert.equal(st1.transitionState.active, true);
  assert.equal(st1.transitionState.type, 'door_wipe');
  assert.equal(st2.setState.id, 'pantry_hearth');
  assert.ok(st2.worldState.boundProps[0].x > 650, '道具应已交接至右侧同伴手中');

  const activity = auditRemotionPropsActivity(props);
  assert.equal(activity.passed, true);
});
