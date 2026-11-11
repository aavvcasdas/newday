import test from 'node:test';
import assert from 'node:assert/strict';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, loadImage } from '../engine/room_base.mjs';
import { evaluateRemotionFrameState } from './frame_evaluator.mjs';
import { auditRemotionPropsActivity, buildRemotionInputPropsFromCli } from './render_cli.mjs';
import { ensureWalkRigAtlases, WALK_RIG_BUILDERS, CELL_W, CELL_H } from './walk_rig_builder.mjs';
import { adaptEpisodeToRemotionProps } from '../engine/remotion_episode_adapter.mjs';
import { createPlanningPreview } from '../engine/render_episode.mjs';
import {
  DAY_EPISODE_TEMPLATE_SPEC,
  buildTemplatePlanningAlignment,
  buildTemplatePlanningSubtitles,
} from '../engine/day_episode.template.spec.mjs';

test('旧 MV 模式明确拒绝并指向新框架', async () => {
  await assert.rejects(buildRemotionInputPropsFromCli(['--mode','mv']), /旧 MV 渲染入口已退役/);
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

const HAVE_WHALE_ART = fs.existsSync(new URL('../../tools/engine/whale_rig/whale_point.png', import.meta.url));
test('Day 系列通用单集模板 (day_episode.template.spec.mjs): 双后端兼容双骨骼蒙皮步态与同体待机',
  { skip: !HAVE_WHALE_ART && '缺少 whale_*.png 姿势素材（外部素材，未随仓库分发）' }, async () => {
  const alignment = buildTemplatePlanningAlignment();
  const subdata = buildTemplatePlanningSubtitles();

  // 1. Remotion 后端桥接与步态/待机状态验证
  const remotionProps = adaptEpisodeToRemotionProps({
    spec: DAY_EPISODE_TEMPLATE_SPEC,
    alignment,
    subdata,
    planningPreview: true,
  });
  const walkState = evaluateRemotionFrameState(remotionProps, 0.85);
  assert.equal(walkState.actors[0].atlas, 'whale_walk_side_2leg');
  assert.equal(walkState.actors[0].flip, false, 'v14 侧立绘本身朝右，向右行走时不应再镜像');

  const settledState = evaluateRemotionFrameState(remotionProps, 2.2);
  assert.equal(settledState.actors[0].atlas, 'whale_idle_side_pet', '到站停稳后应无跳变自动切回同体待机');
  assert.equal(settledState.actors[0].flip, false, '停步后应保持先前行进朝向不反弹');

  const guestWalkState = evaluateRemotionFrameState(remotionProps, 9.6);
  assert.equal(guestWalkState.actors[1].atlas, 'gemini_walk_2leg');
  const guestIdleState = evaluateRemotionFrameState(remotionProps, 11.1);
  assert.equal(guestIdleState.actors[1].atlas, 'gemini_idle_pet');

  const settleState = evaluateRemotionFrameState(remotionProps, 13.0);
  assert.equal(settleState.actors[0].atlas, 'whale_idle_side_pet', '收尾镜头应停在同体待机（长椅坐姿已下线）');

  // 2. Canvas 2D 后端实际渲染帧验证
  const preview = await createPlanningPreview({
    spec: DAY_EPISODE_TEMPLATE_SPEC,
    alignment,
    subdata,
  });
  const canvas = createCanvas(1280, 720);
  const ctx = canvas.getContext('2d');
  const infoWalk = preview.renderScene(ctx, 0.85);
  assert.equal(infoWalk.shot, 'T01_CORRIDOR_ENTER');
  const infoGuest = preview.renderScene(ctx, 9.6);
  assert.equal(infoGuest.shot, 'T03_GUEST_WALK_FIX');
});

