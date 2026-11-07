import test from 'node:test';
import assert from 'node:assert/strict';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, loadImage } from '../engine/room_base.mjs';
import mvSpec from '../mv_dayu/mv.spec.mjs';
import { adaptMvToRemotionProps } from './mv_adapter.mjs';
import { evaluateRemotionFrameState } from './frame_evaluator.mjs';
import { auditRemotionPropsActivity } from './render_cli.mjs';
import { ensureWalkRigAtlases, WALK_RIG_BUILDERS, CELL_W, CELL_H } from './walk_rig_builder.mjs';
import { adaptEpisodeToRemotionProps } from '../engine/remotion_episode_adapter.mjs';
import { createPlanningPreview } from '../engine/render_episode.mjs';
import {
  DAY_EPISODE_TEMPLATE_SPEC,
  buildTemplatePlanningAlignment,
  buildTemplatePlanningSubtitles,
} from '../engine/day_episode.template.spec.mjs';

test('mv_dayu 声明式多舞台规格: 8 镜 8 套差异化动态场景、16 帧图集平滑过渡与零静态幻灯片区间', () => {
  const props = adaptMvToRemotionProps({ spec: mvSpec });
  assert.equal(props.mode, 'lyric-mv');
  assert.equal(props.shots.length, 8);
  assert.equal(props.durationInFrames, 880);
  assert.equal(props.complianceBadge, null, '所有新视频一律不带右上角水印');

  const uniqueSets = new Set(props.shots.map((s) => s.setSpec.id));
  assert.equal(uniqueSets.size, 8, '大禹 MV 8 镜应切换 8 套不同舞台背景而非锁死单一背景');

  // 纯 t 确定性检验：打乱时间采样顺序必须返回完全一致的帧状态（支持 Remotion 并发分片渲染）
  const sampleA1 = evaluateRemotionFrameState(props, 5.8);
  const sampleOther = evaluateRemotionFrameState(props, 19.8);
  const sampleA2 = evaluateRemotionFrameState(props, 5.8);
  assert.deepEqual(sampleA1, sampleA2);
  assert.notEqual(sampleA1.setState.id, sampleOther.setState.id);

  // 环境交互检验：开闸触发器应驱动水闸开启度上升；后羿射日触发器应令昼夜光照下降
  const gateBefore = evaluateRemotionFrameState(props, 0.3);
  const gateAfter = evaluateRemotionFrameState(props, 2.5);
  assert.ok(gateAfter.setState.reactive.gateOpen > gateBefore.setState.reactive.gateOpen + 0.5);

  const sunBefore = evaluateRemotionFrameState(props, 5.0);
  const sunAfter = evaluateRemotionFrameState(props, 6.9);
  assert.ok(sunAfter.setState.reactive.dawn < sunBefore.setState.reactive.dawn - 0.5);

  // 对标 ai-girl-chatgpt-pets 同体状态机检验：反转点 1.90s 由同体待机 whale_idle_side_pet 切入屈膝追赶 whale_walk_side_2leg，零上跳、零鬼影重影！
  const beforePivot = evaluateRemotionFrameState(props, 1.80);
  const afterPivot = evaluateRemotionFrameState(props, 2.00);
  assert.equal(beforePivot.actors[0].atlas, 'whale_idle_side_pet');
  assert.equal(afterPivot.actors[0].atlas, 'whale_walk_side_2leg');
  assert.equal(afterPivot.actors[0].prevAtlas, null, '同体 pet 步态切换不应产生四条腿重影交叉淡化');
  assert.ok(Math.abs(afterPivot.actors[0].y - beforePivot.actors[0].y) < 1.0, '同体待机<->行走切换时脚底高度须零弹跳');

  // 帧级音画同步回归校验：每镜区间与歌词卡拉OK起唱帧严丝合缝，且第 6 镜「对象」为真实美少女伴侣角色而非折纸鹤
  const expectedStarts = [0.0, 4.18, 7.45, 11.10, 14.07, 17.75, 21.22, 24.82];
  props.shots.forEach((shot, i) => {
    assert.ok(Math.abs(shot.start - expectedStarts[i]) < 0.02, `第 ${i + 1} 镜起始时间应与人声对齐`);
    assert.equal(shot.start, props.screens[i].start, `第 ${i + 1} 镜画面切镜与字幕起始须一致`);
  });

  const gfPier = evaluateRemotionFrameState(props, 18.4);
  const gfBoat = evaluateRemotionFrameState(props, 20.6);
  assert.equal(gfPier.actors.length, 2, '第 6 镜应同时包含主角与女朋友（对象）两名真人/美少女角色');
  assert.equal(gfPier.actors[1].characterId, 'gemini');
  assert.ok(gfBoat.actors[1].x > gfPier.actors[1].x + 350, '第 6 镜后半句女朋友角色应登上草船随草船丞相远去');

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

test('双腿剪刀步态图集生成与全片正常走动 + 第5镜白米饭积蓄校验', async () => {
  const built = await ensureWalkRigAtlases();
  for (const key of Object.keys(WALK_RIG_BUILDERS)) {
    assert.ok(built[key] && fs.existsSync(built[key]), `缺少程序化步态图集: ${key}`);
    assert.ok(fs.statSync(built[key]).size > 20_000, `步态图集体积异常: ${key}`);
  }

  const props = adaptMvToRemotionProps({ spec: mvSpec });

  // 镜1、镜3(推山)、镜6(栈桥散步与追船)、镜7(豆包递梨)、镜8(三迁街巷) 位移期间须遍历多个不同迈步帧，绝不锁死单帧滑步
  const walkWindows = [
    { label: '镜1主角追薪水', actorIdx: 0, start: 1.95, end: 3.35 },
    { label: '镜3龙女迈步推靠山', actorIdx: 1, start: 8.85, end: 10.65 },
    { label: '镜6女朋友散步登船', actorIdx: 1, start: 17.80, end: 19.30 },
    { label: '镜7豆包迈步递梨', actorIdx: 1, start: 21.30, end: 22.80 },
    { label: '镜8主角三迁街巷行走', actorIdx: 0, start: 25.00, end: 27.30 },
  ];
  for (const w of walkWindows) {
    const framesSeen = new Set();
    for (let t = w.start; t <= w.end; t += 0.08) {
      const st = evaluateRemotionFrameState(props, t);
      const actor = st.actors[w.actorIdx];
      assert.ok(actor.atlas?.endsWith('_2leg'), `${w.label} 在 t=${t.toFixed(2)} 应使用 *_2leg 双腿行走图集，实际为 ${actor.atlas}`);
      assert.equal(actor.walking, true, `${w.label} 在 t=${t.toFixed(2)} walking 应为 true`);
      assert.ok(Math.abs(actor.dy) < 1.0, `${w.label} 在 t=${t.toFixed(2)} 不应发生上下乱跳 (dy=${actor.dy})`);
      framesSeen.add(actor.atlasFrame);
    }
    assert.ok(framesSeen.size >= 8, `${w.label} 行走期间应遍历至少 8 个不同双腿迈步相位帧，实际 ${framesSeen.size}`);
  }

  // 停步后须无缝落定到 100% 同体 *_pet 待机图集（杜绝原地踏步或跨立绘突变）
  assert.equal(evaluateRemotionFrameState(props, 3.80).actors[0].atlas, 'whale_idle_side_pet');
  assert.equal(evaluateRemotionFrameState(props, 7.00).actors[0].atlas, 'whale_idle_side_pet');
  assert.equal(evaluateRemotionFrameState(props, 10.20).actors[0].atlas, 'whale_idle_sad_pet');
  assert.equal(evaluateRemotionFrameState(props, 20.10).actors[1].atlas, 'gemini_idle_pet');
  assert.equal(evaluateRemotionFrameState(props, 23.80).actors[1].atlas, 'doubao_idle_side_pet');

  // 像素级红线校验：鲸鱼娘待机与行走帧右侧鲸尾下方 (x=218..236, y=386..406) 必须 100% 透明，绝无悬空第 3 只残鞋或第 3 条残腿
  for (const rigKey of ['whale_idle_side_pet', 'whale_idle_happy_pet', 'whale_idle_sad_pet']) {
    const img = await loadImage(path.resolve(built[rigKey]));
    const c = createCanvas(CELL_W, CELL_H);
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0, CELL_W, CELL_H, 0, 0, CELL_W, CELL_H);
    const d = ctx.getImageData(218, 386, 18, 20).data;
    let nonEmpty = 0;
    for (let i = 3; i < d.length; i += 4) {
      if (d[i] > 12) nonEmpty++;
    }
    assert.equal(nonEmpty, 0, `${rigKey} 鲸尾下方不应残留原皮鞋/第 3 条腿像素，实际残留 ${nonEmpty}px`);
  }

  // 镜5「偷光积蓄」道具组件源码校验：青花瓷碗白米饭一粒一粒快速被偷走，且全局视频层零右上角水印
  const propsLayerSrc = fs.readFileSync(new URL('./components/InteractivePropsLayer.jsx', import.meta.url), 'utf8');
  assert.ok(
    propsLayerSrc.includes('RICE_GRAINS') && propsLayerSrc.includes('flying-grain-') && propsLayerSrc.includes('白米饭'),
    '第5镜 savings_jar_beam 应渲染白米饭一粒一粒快速被偷走的颗粒流'
  );
  assert.ok(!propsLayerSrc.includes('6 枚金币沿弧线被隔壁墙洞吸光'), '第5镜旧版金币吸光逻辑不应残留');

  const subtitleLayerSrc = fs.readFileSync(new URL('./components/LyricAndSubtitleLayer.jsx', import.meta.url), 'utf8');
  assert.ok(!subtitleLayerSrc.includes('非官方同人'), 'Remotion 字幕层不应再渲染任何右上角水印角标');

  const compositorSrc = fs.readFileSync(new URL('../engine/scene_compositor.mjs', import.meta.url), 'utf8');
  assert.ok(!compositorSrc.includes('非官方同人'), 'Day 系列通用合成器不应再渲染任何右上角水印角标');

  // 封面尺寸与零水印验收报告校验（3:4 竖版 1080x1440 + 4:3 横版 1440x1080）
  const cover34 = await loadImage(fileURLToPath(new URL('../../番外MV/我怀疑大禹治水/封面/大禹治水MV_封面_3比4.png', import.meta.url)));
  const cover43 = await loadImage(fileURLToPath(new URL('../../番外MV/我怀疑大禹治水/封面/大禹治水MV_封面_4比3.png', import.meta.url)));
  assert.equal(cover34.width, 1080);
  assert.equal(cover34.height, 1440);
  assert.equal(cover43.width, 1440);
  assert.equal(cover43.height, 1080);
});

test('Day 系列通用单集模板 (day_episode.template.spec.mjs): 双后端兼容双骨骼蒙皮步态与同体待机', async () => {
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
  assert.equal(walkState.actors[0].flip, true, '向右行走时侧面图集应自动朝右');

  const settledState = evaluateRemotionFrameState(remotionProps, 2.2);
  assert.equal(settledState.actors[0].atlas, 'whale_idle_side_pet', '到站停稳后应无跳变自动切回同体待机');
  assert.equal(settledState.actors[0].flip, true, '停步后应保持先前行进朝向不反弹');

  const guestWalkState = evaluateRemotionFrameState(remotionProps, 9.6);
  assert.equal(guestWalkState.actors[1].atlas, 'gemini_walk_2leg');
  const guestIdleState = evaluateRemotionFrameState(remotionProps, 11.1);
  assert.equal(guestIdleState.actors[1].atlas, 'gemini_idle_pet');

  const benchState = evaluateRemotionFrameState(remotionProps, 13.0);
  assert.equal(benchState.actors[0].atlas, 'whale_seat_side_bench');

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

