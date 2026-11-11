import test from 'node:test';
import assert from 'node:assert/strict';

import {
  hash,
  noise1d,
  backOut,
  anticipationEnvelope,
  kf,
  resolveMood,
  createBeatGrid,
  resolveTransitionState,
  auditTimelineActivity,
  TRANSITION_TYPES,
} from './timeline_core.mjs';
import {
  CHARACTER_ACTION_NAMES,
  MOVE_STYLE_NAMES,
  evaluateCharacterMotion,
  handAt,
} from './character_motion.mjs';
import {
  WORLD_BOUNDS,
  STAGE_SET_NAMES,
  defineStageSet,
  resolveShotSetSpec,
  resolveStageSet,
  drawStageSetCanvas,
} from '../场景/stage_sets.mjs';
import {
  STAGE_TRIGGER_KINDS,
  computeWorldInteractionState,
} from '../互动元素/world_interactions.mjs';
import { createCanvas } from './room_base.mjs';
import { createEpisodeRenderer } from './render_episode.mjs';
import { adaptEpisodeToRemotionProps } from './remotion_episode_adapter.mjs';

test('timeline_core: 纯函数确定性、节拍网格、情绪平滑插值与反PPT静态检测', () => {
  assert.equal(hash(42), hash(42));
  assert.notEqual(hash(42), hash(43));
  assert.notEqual(noise1d(1.25, 7), noise1d(2.75, 7));

  assert.equal(backOut(0), 0);
  assert.equal(backOut(1), 1);
  assert.ok(backOut(0.65) > 1.0, 'backOut 应产生弹性过冲');
  assert.ok(anticipationEnvelope(0.12) < 0, 'anticipation 蓄力阶段应先反向回撤');
  assert.ok(anticipationEnvelope(0.55) > 0.5, 'anticipation 爆发阶段应正向推出');

  const trackVal = kf([[0, 100], [1, 300, 'easeOut'], [2, 250]], 0.5);
  assert.ok(trackVal > 200 && trackVal < 300);

  const moodMid = resolveMood([[0, 'calm'], [1.0, 'shock']], 1.06, 0.24);
  assert.ok(moodMid.transition > 0.3, '情绪切换中段应触发眨眼挤压过渡');
  assert.ok(moodMid.squash < 0, '情绪切换中段应包含预备挤压');

  const grid = createBeatGrid({ bpm: 120, offset: 0.1 });
  assert.equal(grid.beatSec, 0.5);
  assert.ok(Math.abs(grid.beatTime(4) - 2.1) < 1e-9);
  assert.ok(grid.pulse(2.12) > 0.8);

  for (const type of TRANSITION_TYPES) {
    const tr = resolveTransitionState({ start: 5, end: 9, transition: { type, duration: 0.5 } }, 5.2);
    if (type !== 'none' && type !== 'cut') assert.equal(tr.active, true);
  }

  const staticAudit = auditTimelineActivity(() => ({ x: 640, y: 600 }), { duration: 2.0, fps: 10, maxStaticSpanSec: 1.0 });
  assert.equal(staticAudit.passed, false);
  assert.ok(staticAudit.staticStretches.length >= 1);

  const dynamicAudit = auditTimelineActivity((t) => ({ x: 640 + Math.sin(t * 3) * 18, y: 600 + Math.cos(t * 4) * 4 }), {
    duration: 2.0,
    fps: 10,
    maxStaticSpanSec: 1.0,
  });
  assert.equal(dynamicAudit.passed, true);
});

test('character_motion: 40+ 动作库、15 种节拍律动、驻足不滑步呼吸与世界坐标 handAt 挂点', () => {
  assert.ok(CHARACTER_ACTION_NAMES.length >= 40, '应完整整合 rig_actions 与 legacy_actions');
  assert.ok(MOVE_STYLE_NAMES.length >= 14, '应提供丰富的节拍运动风格');

  // 1. 站立待机：水平严格锁死不滑步 (dx === 0)，垂直呼吸与二级骨骼连续生机运动
  const idle0 = evaluateCharacterMotion({ name: '本鲸', x: 600, y: 600, pose: 'neutral' }, 0.2);
  const idle1 = evaluateCharacterMotion({ name: '本鲸', x: 600, y: 600, pose: 'neutral' }, 1.1);
  assert.equal(idle0.x, 600);
  assert.equal(idle1.x, 600);
  assert.notEqual(idle0.y, idle1.y, '待机垂直呼吸应连续变化');
  assert.notEqual(idle0.anim.bones.tail.rot, idle1.anim.bones.tail.rot, '二级骨骼尾巴应连续摆动');
  assert.notEqual(idle0.anim.bones.hairL.rot, idle1.anim.bones.hairL.rot, '二级骨骼发丝应连续摆动');

  // 2. 显式 idleMotion: 0 严格清零
  const frozen0 = evaluateCharacterMotion({ name: '本鲸', x: 600, y: 600, pose: 'neutral', idleMotion: 0 }, 0.2);
  const frozen1 = evaluateCharacterMotion({ name: '本鲸', x: 600, y: 600, pose: 'neutral', idleMotion: 0 }, 1.1);
  assert.deepEqual(frozen0.anim, frozen1.anim);

  // 3. 行走步态触发交替脚步触地事件与前后摆臂
  const walkPlan = {
    name: '本鲸',
    pose: 'neutral',
    move: 'walk',
    walk: { from: 320, to: 820, startLine: 1, duration: 2.2 },
  };
  const cues = [{ start: 0, end: 3, text: '向前走去' }];
  const wA = evaluateCharacterMotion(walkPlan, 0.45, { line: 1, cues });
  const wB = evaluateCharacterMotion(walkPlan, 1.35, { line: 1, cues });
  assert.ok(wB.x > wA.x + 100, '行走应推进世界 X 坐标');
  assert.notEqual(wA.anim.bones.legL.rot, wB.anim.bones.legL.rot, '步态双腿应交替摆动');

  // 4. 手部世界挂点 handAt 随人物动作与转身实时联动
  const actWave = evaluateCharacterMotion({ name: '本鲸', x: 640, y: 600, action: 'wave', facing: 1 }, 0.35);
  const actSlam = evaluateCharacterMotion({ name: '本鲸', x: 640, y: 600, action: 'slam_desk', facing: 1 }, 0.35);
  const handWave = handAt(actWave, 'right');
  const handSlam = handAt(actSlam, 'right');
  assert.ok(Number.isFinite(handWave.x) && Number.isFinite(handWave.y));
  assert.notEqual(Math.round(handWave.y), Math.round(handSlam.y), '不同动作下右手世界坐标应显著变化');
});

test('stage_sets: 12 套可切换超宽舞台、自定义注册与响应式灯光/机关锚点', () => {
  assert.ok(STAGE_SET_NAMES.length >= 12);
  assert.ok(WORLD_BOUNDS.width >= 1600, '舞台应超宽支持横移与推拉运镜');

  const canvas = createCanvas(1280, 720);
  const ctx = canvas.getContext('2d');

  for (const setId of STAGE_SET_NAMES) {
    const closed = resolveStageSet(setId, 1.0, { doorOpen: 0, gateOpen: 0, lampLit: 0.3 });
    const opened = resolveStageSet(setId, 1.0, { doorOpen: 0.9, gateOpen: 0.9, lampLit: 1.0, windowImpactAt: 0.8 });
    assert.equal(closed.id, setId);
    assert.ok(closed.groundY > 400 && closed.groundY <= 620);
    assert.notDeepEqual(closed.lightSources, opened.lightSources, `${setId} 灯光应响应交互状态变化`);

    ctx.clearRect(0, 0, 1280, 720);
    drawStageSetCanvas(ctx, opened, { t: 1.0, cam: { cx: 640, cy: 360, z: 1.05 } });
  }

  defineStageSet('custom_lab_test', {
    family: 'custom',
    surface: 'metal_deck',
    label: '测试自定义舞台',
    palette: { skyTop: '#102030', skyBot: '#203848', wall: '#1B2E40', wallTrim: '#3E607A', floor: '#152230', floorLine: '#385872', accent: '#7CE8FF', warm: '#FFE29A' },
    build(_t, st) {
      return {
        anchors: { groundY: 600, desk: { x: 640, y: 550, topY: 490, w: 280, h: 60, shake: st.deskShake || 0 } },
        lightSources: [{ x: 640, y: 100, targetX: 640, targetY: 600, radius: 260, color: '#7CE8FF', intensity: 0.3 }],
      };
    },
  });
  const customResolved = resolveStageSet('custom_lab_test', 0.5, { deskShake: 3.5 });
  assert.equal(customResolved.anchors.desk.shake, 3.5);

  const autoSetA = resolveShotSetSpec({ direction: { kind: 'prop' }, actors: [] }, 0, { autoStageProgression: true });
  const autoSetB = resolveShotSetSpec({ mood: 'cinema_glow', actors: [{ name: '本鲸' }] }, 1, { autoStageProgression: true });
  assert.equal(autoSetA.id, 'screening_desk');
  assert.equal(autoSetB.id, 'porthole_observatory');
});

test('world_interactions: 人物<->背景<->道具双向耦合总线（开门漏光、拍桌震动、涟漪尘土、手持交接）', () => {
  assert.ok(STAGE_TRIGGER_KINDS.includes('open_door'));
  assert.ok(STAGE_TRIGGER_KINDS.includes('slam_desk'));

  const cues = [
    { start: 0.0, end: 2.0, text: '推门拍桌交接' },
    { start: 2.0, end: 4.5, text: '递给同伴过目' },
  ];
  const shot = {
    id: 'test_interactive_shot',
    start: 0,
    end: 4.5,
    set: 'screening_desk',
    actors: [
      {
        name: '本鲸',
        x: 520,
        y: 600,
        action: 'give',
        heldProp: {
          kind: 'scroll',
          hand: 'right',
          label: '治水卷',
          transfer: { at: 2.1, toActor: '豆包', toHand: 'left', duration: 0.5, arcHeight: 42 },
        },
      },
      {
        name: '豆包',
        assetId: 'doubao',
        x: 780,
        y: 600,
        facing: -1,
        action: 'cheer',
      },
    ],
    stageTriggers: [
      { kind: 'open_door', at: 0.4, duration: 0.6, target: 0.9 },
      { kind: 'slam_desk', at: 1.0, intensity: 1.2 },
      { kind: 'pin_note', at: 1.3 },
    ],
  };

  const actorsEarly = shot.actors.map((p, idx) => evaluateCharacterMotion(p, 1.08, { line: 1, cues, actorIndex: idx }));
  const stateSlam = computeWorldInteractionState({
    shot,
    shotIndex: 0,
    spec: {},
    actors: actorsEarly,
    events: [],
    cues,
    t: 1.08,
    fps: 30,
  });

  assert.ok(stateSlam.setState.reactive.doorOpen > 0.85, 'open_door 触发器应打开舱门并增强环境漏光');
  assert.ok(Math.abs(stateSlam.setState.reactive.deskShake) > 0.1, 'slam_desk 触发器应引发桌面阻尼震动');
  assert.ok(stateSlam.shockwaves.length >= 1, 'slam_desk 应产生冲击波环');
  assert.equal(stateSlam.boundProps.length, 1);
  const propBefore = stateSlam.boundProps[0];

  const actorsAfter = shot.actors.map((p, idx) => evaluateCharacterMotion(p, 2.8, { line: 2, cues, actorIndex: idx }));
  const stateAfter = computeWorldInteractionState({
    shot,
    shotIndex: 0,
    spec: {},
    actors: actorsAfter,
    events: [],
    cues,
    t: 2.8,
    fps: 30,
  });
  const propAfter = stateAfter.boundProps[0];
  assert.ok(propAfter.x > propBefore.x + 80, 'heldProp.transfer 应将道具从本鲸右手抛物线交接到豆包手中');
  assert.equal(propAfter.actorIndex, 1, '交接完成后持有者索引应切换至同伴');
  assert.ok(stateAfter.actorLighting.every((l) => l.rimLight > 0), '舞台光源应对角色实时投射边缘受光 rimLight');
});

test('Day 系列统一管线: 支持多舞台切换、手持道具、环境触发器与无损导出 Remotion inputProps', async () => {
  const alignment = {
    source_duration_seconds: 6.0,
    cues: [
      { index: 1, start: 0.0, end: 2.8, text: '先在案台核对清单', chars_timed: [{ ch: '先', start: 0.1, end: 0.3, asrWord: '先' }, { ch: '核', start: 1.1, end: 1.3, asrWord: '核' }] },
      { index: 2, start: 2.8, end: 5.8, text: '再去舷窗看海流', chars_timed: [{ ch: '再', start: 2.9, end: 3.1, asrWord: '再' }, { ch: '看', start: 4.1, end: 4.3, asrWord: '看' }] },
    ],
  };
  const subdata = {
    screens: [
      { index: 1, start: 0.0, end: 2.8, lines: ['先在案台核对清单'] },
      { index: 2, start: 2.8, end: 5.8, lines: ['再去舷窗看海流'] },
    ],
  };
  const spec = {
    day: 99,
    title: '多舞台联动验收测试',
    speaker: '本鲸',
    opener: {
      layout: 'two_line',
      headlinePrefix: '多舞台切换，',
      headlineHighlight: '拒绝呆板背景',
      actorA: { name: '克劳德', assetId: 'claude', x: 500, y: 600, pose: 'shock' },
      actorB: { name: '豆包', assetId: 'doubao', x: 780, y: 600, facing: -1 },
      foregroundProps: [],
    },
    shots: [
      {
        id: 'desk_check',
        fromLine: 1,
        toLine: 1,
        set: 'screening_desk',
        framing: 'two_shot',
        direction: { kind: 'character', focus: '案台核对', action: '拍桌核对清单', trigger: '核字触发', result: '钉上便签' },
        actors: [
          {
            name: '克劳德',
            assetId: 'claude',
            x: 520,
            y: 600,
            pose: 'point',
            action: 'present_right',
            move: 'talk_sway',
            heldProp: { kind: 'badge', hand: 'right', label: '核验章' },
          },
          { name: '豆包', assetId: 'doubao', x: 790, y: 600, facing: -1, move: 'groove' },
        ],
        companionProps: [{ propId: 'empty_bowl', x: 640, y: 550, scale: 0.7 }],
        stageTriggers: [{ kind: 'pin_note', line: 1, char: '核' }],
      },
      {
        id: 'observatory_look',
        fromLine: 2,
        toLine: 2,
        set: 'porthole_observatory',
        framing: 'wide',
        transition: { type: 'pan_left', duration: 0.45 },
        direction: { kind: 'world', focus: '全景舷窗', action: '走向舷窗观察', trigger: '看字触发', result: '舷窗泛起波纹' },
        actors: [
          {
            name: '豆包',
            assetId: 'doubao',
            pose: 'think',
            move: 'walk',
            walk: { from: 420, to: 680, startLine: 2, duration: 1.8 },
          },
        ],
        companionProps: [{ propId: 'empty_bowl', x: 880, y: 550, scale: 0.7 }],
        stageTriggers: [{ kind: 'window_ripple', line: 2, char: '看' }],
      },
    ],
  };

  const renderer = await createEpisodeRenderer({ spec, alignment, subdata, planningPreview: true });
  const canvas = createCanvas(1280, 720);
  const ctx = canvas.getContext('2d');
  renderer.renderFrame(ctx, 1.4);
  const bufDesk = canvas.toBuffer('image/png');
  renderer.renderFrame(ctx, 4.4);
  const bufObservatory = canvas.toBuffer('image/png');
  assert.notDeepEqual(bufDesk, bufObservatory, '不同舞台与动作时刻渲染出的画面必须显著不同');

  const remotionProps = adaptEpisodeToRemotionProps({ spec, alignment, subdata, planningPreview: true });
  assert.equal(remotionProps.mode, 'day-episode');
  assert.equal(remotionProps.shots[0].setSpec.id, 'screening_desk');
  assert.equal(remotionProps.shots[1].setSpec.id, 'porthole_observatory');
  assert.equal(remotionProps.shots[1].transition.type, 'pan_left');
});
