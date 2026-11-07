// mv.spec.mjs — 《我怀疑大禹治水》声明式 8 镜全动态 MV 分镜配置（运行在通用 tools/remotion-engine 之上）
// 帧级音画对齐与谐音热梗演绎说明：
//   - 原音频 `/home/user/newday/我怀疑大禹治水治没了我的薪水.mp3` (29.333333s = 880 帧 @ 30fps，原流无损直拷)
//   - 时间轴经母带 880 帧卡拉OK游标跳变帧 + 50ms PCM 声学能量包络双重逐句锁定：
//       1. 0.00.. 4.18 (pivot  1.90): 我怀疑大禹治水 / 治没了我的薪水
//       2. 4.18.. 7.45 (pivot  5.42): 后羿射日 / 射没了我的周日
//       3. 7.45..11.10 (pivot  8.85): 愚公移山 / 移走了我的靠山
//       4. 11.10..14.07 (pivot 13.05): 女娲造人 / 给我造的小人
//       5. 14.07..17.75 (pivot 15.85): 我怀疑凿壁偷光 / 偷光了我的积蓄（青花大瓷碗白米饭「积蓄」被吸得一粒不剩！）
//       6. 17.75..21.22 (pivot 19.00): 草船丞相 / 抢走了我的对象（「对象」= 活生生的女朋友角色 Gemini，被手摇羽扇的草船丞相接上船载走！）
//       7. 21.22..24.82 (pivot 23.40): 孔融让梨就是 / 让我离职
//       8. 24.82..29.333333 (pivot 27.57): 孟母三迁我月薪 / 也是三千
//   - 行走与待机状态机对标 tqlearning/ai-girl-chatgpt-pets：
//       * 大腿+小腿双关节屈膝提踵 8 相位循环 (*_2leg) + 100% 同体同比例待机呼吸 (*_pet)
//       * 头部高度在整段迈步与停步中稳如水平线（波动 <= ±2px），单镜内严禁跨立绘切图与过渡上跳

export default {
  compositionId: 'DayuLyricMV',
  title: '我怀疑大禹治水',
  complianceBadge: '非官方同人 / AI生成',
  bpm: 118,
  beatOffset: 0.0,
  beatsPerBar: 4,
  fps: 30,
  width: 1920,
  height: 1080,
  duration: 29.333333,
  audioPath: '我怀疑大禹治水治没了我的薪水.mp3',

  lyrics: [
    {
      start: 0.0,
      vocalStart: 0.04,
      pivot: 1.90,
      end: 4.18,
      top: '我怀疑大禹治水',
      bottom: '治没了我的薪水',
      text: '我怀疑大禹治水治没了我的薪水',
    },
    {
      start: 4.18,
      vocalStart: 4.18,
      pivot: 5.42,
      end: 7.45,
      top: '后羿射日',
      bottom: '射没了我的周日',
      text: '后羿射日射没了我的周日',
    },
    {
      start: 7.45,
      vocalStart: 7.45,
      pivot: 8.85,
      end: 11.10,
      top: '愚公移山',
      bottom: '移走了我的靠山',
      text: '愚公移山移走了我的靠山',
    },
    {
      start: 11.10,
      vocalStart: 11.10,
      pivot: 13.05,
      end: 14.07,
      top: '女娲造人',
      bottom: '给我造的小人',
      text: '女娲造人给我造的小人',
    },
    {
      start: 14.07,
      vocalStart: 14.07,
      pivot: 15.85,
      end: 17.75,
      top: '我怀疑凿壁偷光',
      bottom: '偷光了我的积蓄',
      text: '我怀疑凿壁偷光偷光了我的积蓄',
    },
    {
      start: 17.75,
      vocalStart: 17.75,
      pivot: 19.00,
      end: 21.22,
      top: '草船丞相',
      bottom: '抢走了我的对象',
      text: '草船丞相抢走了我的对象',
    },
    {
      start: 21.22,
      vocalStart: 21.22,
      pivot: 23.40,
      end: 24.82,
      top: '孔融让梨就是',
      bottom: '让我离职',
      text: '孔融让梨就是让我离职',
    },
    {
      start: 24.82,
      vocalStart: 24.82,
      pivot: 27.57,
      end: 29.333333,
      top: '孟母三迁我月薪',
      bottom: '也是三千',
      text: '孟母三迁我月薪也是三千',
    },
  ],

  shots: [
    // 镜 1 (0.00–4.18s | pivot 1.90s)：大禹治水 -> 治没了我的薪水
    // 主角全程统一侧身步态/待机同体骨架（迈步拉闸 -> 同体待机拉杆 -> 屈膝小跑追赶「薪水」 -> 同体停步望水），零切图跳变！
    {
      id: 'S01_DAYU_FLOOD',
      start: 0.0,
      end: 4.18,
      set: { id: 'river_gate', gateOpen: 0.12 },
      framing: 'wide',
      cameraIntent: {
        type: 'pan',
        reason: '随主角匀速屈膝迈步拉闸开洪推进，并跟摇追踪主角迈步追赶被大水卷走的「薪水」工资袋',
        at: 1.05,
        duration: 2.8,
        to: { cx: 685, cy: 382, z: 1.12 },
      },
      actors: [
        {
          characterId: 'whale',
          height: 306,
          move: 'idle',
          track: [
            [0.0, [252, 600], 'linear'],
            [1.25, [482, 600], 'linear'],
            [1.90, [482, 600], 'linear'],
            [3.52, [748, 600], 'linear'],
            [4.18, [748, 600], 'linear'],
          ],
          atlases: [
            { at: 0.0, atlas: 'whale_walk_side_2leg', flip: true, cycle: 0.94 },
            { at: 1.25, atlas: 'whale_idle_side_pet', flip: true },
            { at: 1.90, atlas: 'whale_walk_side_2leg', flip: true, cycle: 0.80, emote: 'exclaim' },
            { at: 3.52, atlas: 'whale_idle_side_pet', flip: true, emote: 'sweat' },
          ],
        },
        {
          characterId: 'qwen',
          height: 288,
          move: 'idle',
          x: 196,
          y: 600,
          atlas: 'qwen_bird_wave36_action',
          atlasCycle: 1.45,
          flip: false,
        },
      ],
      mechanisms: [
        { kind: 'lever_switch', x: 562, y: 600, pullAt: 1.25, duration: 0.45 },
        { kind: 'envelope_flood', standX: 678, standY: 600, label: '薪水', floodAt: 1.90, floodEnd: 3.95, toX: 1135, toY: 556 },
      ],
      stageTriggers: [
        { kind: 'open_gate', at: 1.30, duration: 1.15, from: 0.12, to: 0.96 },
        { kind: 'splash_water', at: 1.55, x: 890, y: 590 },
        { kind: 'splash_water', at: 1.96, x: 715, y: 588 },
      ],
      transitions: { type: 'none', duration: 0 },
    },

    // 镜 2 (4.18–7.45s | pivot 5.42s)：后羿射日 -> 射没了我的周日
    // 主角全程统一 3/4 同体骨架（开心迈步 -> 同体待机晒太阳 -> 中箭后同体委屈迈步上前查看 -> 同体委屈待机）
    {
      id: 'S02_HOUYI_SUNDAY',
      start: 4.18,
      end: 7.45,
      set: { id: 'seaside_deck', dawn: 1.0 },
      framing: 'wide',
      cameraIntent: {
        type: 'push',
        reason: '聚焦后羿神弓金箭射飞「周日」露出「周一」与骄阳沉海转入加班夜色',
        at: 5.15,
        duration: 1.85,
        to: { cx: 650, cy: 382, z: 1.13 },
      },
      actors: [
        {
          characterId: 'whale',
          height: 306,
          move: 'idle',
          track: [
            [4.18, [310, 600], 'linear'],
            [5.28, [492, 600], 'linear'],
            [5.42, [492, 600], 'linear'],
            [6.62, [594, 600], 'linear'],
            [7.45, [594, 600], 'linear'],
          ],
          atlases: [
            { at: 4.18, atlas: 'whale_walk_happy_2leg', flip: false, cycle: 0.94 },
            { at: 5.28, atlas: 'whale_idle_happy_pet', flip: false },
            { at: 5.42, atlas: 'whale_walk_sad_2leg', flip: false, cycle: 0.92, emote: 'exclaim' },
            { at: 6.62, atlas: 'whale_idle_sad_pet', flip: false, emote: 'sweat' },
          ],
        },
        {
          characterId: 'zai',
          height: 288,
          move: 'idle',
          x: 952,
          y: 600,
          atlas: 'zai_memento_action',
          atlasCycle: 1.35,
          flip: false,
        },
      ],
      mechanisms: [
        { kind: 'sunday_calendar', x: 655, y: 600, label: '周日', underLabel: '周一', pierceAt: 5.42 },
        { kind: 'flying_arrow', bowX: 882, bowY: 452, fromX: 882, fromY: 452, toX: 655, toY: 488, shootAt: 5.05, hitAt: 5.42 },
      ],
      stageTriggers: [
        { kind: 'dawn_shift', at: 5.42, duration: 1.35, from: 1.0, to: 0.14 },
      ],
      transitions: { type: 'whip_left', duration: 0.28 },
    },

    // 镜 3 (7.45–11.10s | pivot 8.85s)：愚公移山 -> 移走了我的靠山
    // 龙女全程同体推山待机 -> 屈膝迈步推走「靠山」大山 -> 同体停步；主角全程同体待机 -> 退向小靠垫
    {
      id: 'S03_YUGONG_BACKING',
      start: 7.45,
      end: 11.10,
      set: { id: 'mountain_pass', gateOpen: 0.08 },
      framing: 'wide',
      cameraIntent: {
        type: 'pull',
        reason: '拉开展现刻着「靠山」的大山被屈膝迈步的龙女整座推走、主角退向小靠垫',
        at: 8.75,
        duration: 1.85,
        to: { cx: 635, cy: 376, z: 1.05 },
      },
      actors: [
        {
          characterId: 'whale',
          height: 304,
          move: 'idle',
          track: [
            [7.45, [456, 600], 'linear'],
            [8.85, [456, 600], 'linear'],
            [9.72, [358, 600], 'linear'],
            [11.10, [358, 600], 'linear'],
          ],
          atlases: [
            { at: 7.45, atlas: 'whale_idle_happy_pet', flip: false },
            { at: 8.85, atlas: 'whale_walk_sad_2leg', flip: true, cycle: 0.92, emote: 'question' },
            { at: 9.72, atlas: 'whale_idle_sad_pet', flip: false, emote: 'sweat' },
          ],
        },
        {
          characterId: 'gpt',
          height: 316,
          move: 'idle',
          track: [
            [7.45, [548, 600], 'linear'],
            [8.78, [554, 600], 'linear'],
            [10.82, [898, 600], 'linear'],
            [11.10, [898, 600], 'linear'],
          ],
          atlases: [
            { at: 7.45, atlas: 'gpt_push_idle_pet', flip: false },
            { at: 8.78, atlas: 'gpt_push_walk_2leg', flip: false, cycle: 0.92 },
            { at: 10.82, atlas: 'gpt_push_idle_pet', flip: false },
          ],
        },
      ],
      mechanisms: [
        {
          kind: 'sliding_mountain',
          layer: 'back',
          label: '靠山',
          track: [
            [7.45, [658, 600], 'linear'],
            [8.78, [664, 600], 'linear'],
            [10.82, [1022, 600], 'linear'],
            [11.10, [1022, 600], 'linear'],
          ],
        },
        { kind: 'cushion', layer: 'back', x: 356, y: 596, enterAt: 9.15 },
      ],
      stageTriggers: [
        { kind: 'open_gate', at: 8.85, duration: 1.5, from: 0.08, to: 0.96 },
      ],
      transitions: { type: 'pan_through', duration: 0.30 },
    },

    // 镜 4 (11.10–14.07s | pivot 13.05s)：女娲造人 -> 给我造的小人
    {
      id: 'S04_NVWA_PUPPETS',
      start: 11.10,
      end: 14.07,
      set: { id: 'terracotta_courtyard', doorOpen: 0.18, lampLit: 0.88 },
      framing: 'wide',
      cameraIntent: {
        type: 'push',
        reason: '聚焦工坊门开后打小报告、扣黑锅、穿小鞋的职场小人围拢与后退闪避',
        at: 12.45,
        duration: 1.35,
        to: { cx: 640, cy: 388, z: 1.13 },
      },
      actors: [
        {
          characterId: 'claude',
          height: 288,
          move: 'idle',
          x: 268,
          y: 600,
          atlas: 'claude_collect_action',
          atlasCycle: 1.3,
          flip: false,
        },
        {
          characterId: 'whale',
          height: 306,
          move: 'idle',
          track: [
            [11.10, [368, 600], 'linear'],
            [12.50, [524, 600], 'linear'],
            [13.05, [524, 600], 'linear'],
            [13.72, [458, 600], 'linear'],
            [14.07, [458, 600], 'linear'],
          ],
          atlases: [
            { at: 11.10, atlas: 'whale_walk_happy_2leg', flip: false, cycle: 0.94 },
            { at: 12.50, atlas: 'whale_idle_happy_pet', flip: false },
            { at: 13.05, atlas: 'whale_walk_sad_2leg', flip: true, cycle: 0.88, emote: 'sweat' },
            { at: 13.72, atlas: 'whale_idle_sad_pet', flip: false, emote: 'sweat' },
          ],
        },
      ],
      mechanisms: [
        { kind: 'paper_puppets', enterAt: 12.55, scatterAt: 13.62, fromX: 915, toX: 642 },
      ],
      stageTriggers: [
        { kind: 'open_door', at: 12.25, duration: 0.72, from: 0.18, to: 0.94 },
        { kind: 'shake_desk', at: 13.10, duration: 0.45, amplitude: 5 },
      ],
      transitions: { type: 'iris', duration: 0.30, focus: [640, 380] },
    },

    // 镜 5 (14.07–17.75s | pivot 15.85s)：我怀疑凿壁偷光 -> 偷光了我的积蓄（青花大瓷碗白米饭积蓄！）
    {
      id: 'S05_CHISEL_SAVINGS',
      start: 14.07,
      end: 17.75,
      set: { id: 'screening_desk', brickWall: true, gateOpen: 0.0, lampLit: 0.72 },
      framing: 'two_shot',
      cameraIntent: {
        type: 'pan',
        reason: '跟随砖墙凿孔金光射入青花大瓷碗「积蓄」白米饭并将整碗米饭吸得一粒不剩',
        at: 14.95,
        duration: 2.15,
        to: { cx: 680, cy: 384, z: 1.15 },
      },
      actors: [
        {
          characterId: 'kimi',
          height: 292,
          move: 'idle',
          x: 228,
          y: 600,
          atlas: 'kimi_lantern_action',
          atlasCycle: 1.35,
          flip: false,
        },
        {
          characterId: 'whale',
          height: 306,
          move: 'idle',
          track: [
            [14.07, [336, 600], 'linear'],
            [15.35, [472, 600], 'linear'],
            [15.85, [472, 600], 'linear'],
            [16.88, [532, 600], 'linear'],
            [17.75, [532, 600], 'linear'],
          ],
          atlases: [
            { at: 14.07, atlas: 'whale_walk_happy_2leg', flip: false, cycle: 0.94 },
            { at: 15.35, atlas: 'whale_idle_happy_pet', flip: false },
            { at: 15.85, atlas: 'whale_walk_sad_2leg', flip: false, cycle: 0.92, emote: 'exclaim' },
            { at: 16.88, atlas: 'whale_idle_sad_pet', flip: false, emote: 'sweat' },
          ],
        },
      ],
      mechanisms: [
        { kind: 'savings_jar_beam', x: 682, y: 478, holeX: 1020, holeY: 292, stealAt: 15.85 },
      ],
      stageTriggers: [
        { kind: 'open_gate', at: 14.65, duration: 0.65, from: 0.0, to: 1.0 },
        { kind: 'shake_desk', at: 15.85, duration: 0.45, amplitude: 4.5 },
      ],
      transitions: { type: 'wipe', duration: 0.30 },
    },

    // 镜 6 (17.75–21.22s | pivot 19.00s)：草船丞相 -> 抢走了我的对象
    // 核心梗点：前半句主角与女朋友 Gemini 双双匀速屈膝迈步在栈桥甜蜜散步，19.00s 手摇羽扇的草船丞相靠岸把女朋友接上草船甲板同体稳稳站立载走，主角屈膝追到桥头！
    {
      id: 'S06_STRAW_BOAT_GIRLFRIEND',
      start: 17.75,
      end: 21.22,
      set: { id: 'misty_pier', gateOpen: 0.6 },
      framing: 'wide',
      cameraIntent: {
        type: 'pan',
        reason: '随手摇羽扇的草船丞相靠岸把主角散步中的女朋友（对象）接上船向江面跟摇',
        at: 18.85,
        duration: 2.05,
        to: { cx: 685, cy: 382, z: 1.11 },
      },
      actors: [
        {
          characterId: 'whale',
          height: 304,
          move: 'idle',
          track: [
            [17.75, [276, 592], 'linear'],
            [18.92, [408, 592], 'linear'],
            [19.05, [408, 592], 'linear'],
            [20.55, [616, 592], 'linear'],
            [21.22, [616, 592], 'linear'],
          ],
          atlases: [
            { at: 17.75, atlas: 'whale_walk_side_2leg', flip: true, cycle: 0.96 },
            { at: 18.92, atlas: 'whale_idle_side_pet', flip: true },
            { at: 19.05, atlas: 'whale_walk_side_2leg', flip: true, cycle: 0.80, emote: 'exclaim' },
            { at: 20.55, atlas: 'whale_idle_side_pet', flip: true, emote: 'sweat' },
          ],
        },
        {
          characterId: 'gemini',
          height: 286,
          move: 'idle',
          track: [
            [17.75, [416, 592], 'linear'],
            [18.92, [544, 592], 'linear'],
            [19.42, [682, 542], 'linear'],
            [21.22, [1002, 542], 'linear'],
          ],
          atlases: [
            { at: 17.75, atlas: 'gemini_walk_2leg', flip: false, cycle: 0.94 },
            { at: 19.42, atlas: 'gemini_idle_pet', flip: true },
          ],
        },
      ],
      mechanisms: [
        {
          kind: 'straw_boat_minister',
          layer: 'back',
          renderPass: 'boat',
          boatTrack: [
            [17.75, 1120, 548],
            [19.00, 745, 548],
            [21.22, 1072, 548],
          ],
        },
        {
          kind: 'straw_boat_minister',
          layer: 'front',
          renderPass: 'heart',
          heartTrack: [
            [17.75, 352, 312],
            [18.92, 476, 312],
            [21.22, 476, 312],
          ],
          breakAt: 19.00,
        },
      ],
      stageTriggers: [
        { kind: 'splash_water', at: 18.95, x: 745, y: 566 },
        { kind: 'splash_water', at: 19.85, x: 895, y: 566 },
      ],
      transitions: { type: 'pan_through', duration: 0.30 },
    },

    // 镜 7 (21.22–24.82s | pivot 23.40s)：孔融让梨就是 -> 让我离职
    // 豆包全程统一侧身步态 -> 同体侧身待机（彻底消除侧身小人突变正面大头立绘的违和切换！）
    {
      id: 'S07_KONG_RONG_PEAR',
      start: 21.22,
      end: 24.82,
      set: { id: 'pear_orchard', lampLit: 0.92 },
      framing: 'two_shot',
      cameraIntent: {
        type: 'push',
        reason: '双方匀速屈膝迈步走到桌前递梨，大金梨裂开变成盖章「离职书」与离职纸箱，主角上前推回并护住工牌',
        at: 23.05,
        duration: 1.5,
        to: { cx: 650, cy: 390, z: 1.16 },
      },
      actors: [
        {
          characterId: 'whale',
          height: 306,
          move: 'idle',
          track: [
            [21.22, [318, 600], 'linear'],
            [22.65, [472, 600], 'linear'],
            [23.40, [472, 600], 'linear'],
            [24.15, [508, 600], 'linear'],
            [24.82, [508, 600], 'linear'],
          ],
          atlases: [
            { at: 21.22, atlas: 'whale_walk_happy_2leg', flip: false, cycle: 0.94 },
            { at: 22.65, atlas: 'whale_idle_happy_pet', flip: false },
            { at: 23.40, atlas: 'whale_walk_sad_2leg', flip: false, cycle: 0.90, emote: 'question' },
            { at: 24.15, atlas: 'whale_idle_sad_pet', flip: false, emote: 'sweat' },
          ],
        },
        {
          characterId: 'doubao',
          height: 298,
          move: 'idle',
          track: [
            [21.22, [1018, 600], 'linear'],
            [22.92, [822, 600], 'linear'],
            [24.82, [822, 600], 'linear'],
          ],
          atlases: [
            { at: 21.22, atlas: 'doubao_walk_side_2leg', flip: false, cycle: 0.94 },
            { at: 22.92, atlas: 'doubao_idle_side_pet', flip: false },
          ],
        },
      ],
      mechanisms: [
        {
          kind: 'pear_to_envelope',
          fromX: 760,
          midX: 632,
          pushBackX: 735,
          y: 480,
          slideStart: 21.45,
          openAt: 23.40,
          pushBackAt: 23.85,
          badgeX: 548,
          badgeY: 472,
        },
      ],
      stageTriggers: [
        { kind: 'shake_desk', at: 23.40, duration: 0.45, amplitude: 5 },
      ],
      transitions: { type: 'whip_right', duration: 0.28 },
    },

    // 镜 8 (24.82–29.333333s | pivot 27.57s)：孟母三迁我月薪 / 也是三千
    // 主角全程统一侧身屈膝迈步 -> 同体侧身坐上路灯长椅
    {
      id: 'S08_THREE_MOVES',
      start: 24.82,
      end: 29.333333,
      set: { id: 'twilight_street', lampLit: 0.96 },
      framing: 'wide',
      cameraIntent: {
        type: 'follow',
        reason: '主角屈膝迈步走过「一迁/二迁/三迁」三栋视差街屋，最后同体坐上路灯长椅对着「月薪三千」袋与热茶温柔收尾',
        at: 25.0,
        duration: 2.65,
        to: { cx: 660, cy: 386, z: 1.12 },
      },
      actors: [
        {
          characterId: 'whale',
          height: 304,
          move: 'idle',
          track: [
            [24.82, [295, 600], 'linear'],
            [27.45, [662, 600], 'linear'],
            [29.333333, [662, 600], 'linear'],
          ],
          atlases: [
            { at: 24.82, atlas: 'whale_walk_side_2leg', flip: true, cycle: 0.96, treadmillSpeed: 135 },
            { at: 27.45, atlas: 'whale_seat_side_bench', cycle: 1.5, flip: true, emote: 'sparkle' },
          ],
        },
      ],
      mechanisms: [
        { kind: 'scrolling_houses', layer: 'back', start: 24.82, end: 27.57, fromOffset: 130, toOffset: -420 },
        { kind: 'steaming_teacup', x: 842, y: 542, enterAt: 27.45 },
      ],
      stageTriggers: [
        { kind: 'pulse_lamp', at: 27.55, duration: 0.9, amount: 0.22 },
      ],
      transitions: { type: 'fade', duration: 0.28 },
    },
  ],
};
