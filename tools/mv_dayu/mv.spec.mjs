// mv.spec.mjs — 《我怀疑大禹治水》声明式 8 镜全动态 MV 分镜配置（运行在通用 tools/remotion-engine 之上）
// 帧级音画对齐与谐音热梗演绎说明：
//   - 原音频 `/home/user/newday/我怀疑大禹治水治没了我的薪水.mp3` (29.333333s = 880 帧 @ 30fps，原流无损直拷)
//   - 时间轴经母带 880 帧卡拉OK游标跳变帧 + 50ms PCM 声学能量包络双重逐句锁定：
//       1. 0.00.. 4.18 (pivot  1.90): 我怀疑大禹治水 / 治没了我的薪水
//       2. 4.18.. 7.45 (pivot  5.42): 后羿射日 / 射没了我的周日
//       3. 7.45..11.10 (pivot  8.85): 愚公移山 / 移走了我的靠山
//       4. 11.10..14.07 (pivot 13.05): 女娲造人 / 给我造的小人
//       5. 14.07..17.75 (pivot 15.85): 我怀疑凿壁偷光 / 偷光了我的积蓄
//       6. 17.75..21.22 (pivot 19.00): 草船丞相 / 抢走了我的对象（「对象」= 活生生的女朋友角色 Gemini，被手摇羽扇的草船丞相接上船载走！）
//       7. 21.22..24.82 (pivot 23.40): 孔融让梨就是 / 让我离职
//       8. 24.82..29.333333 (pivot 27.57): 孟母三迁我月薪 / 也是三千
//   - 8 镜切换 8 座不同动态视差舞台，复用仓库既有 16 帧角色动作图集 + 程序化世界机关，新生图 0 张

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
    {
      id: 'S01_DAYU_FLOOD',
      start: 0.0,
      end: 4.18,
      set: { id: 'river_gate', gateOpen: 0.12 },
      framing: 'wide',
      cameraIntent: {
        type: 'pan',
        reason: '随拉闸开洪推进并跟摇追踪被大水卷走的「薪水」工资袋',
        at: 1.05,
        duration: 2.8,
        to: { cx: 685, cy: 382, z: 1.12 },
      },
      actors: [
        {
          characterId: 'whale',
          height: 306,
          move: 'bounce',
          track: [
            [0.0, 305, 600],
            [1.15, 435, 600],
            [1.90, 445, 600],
            [3.25, 525, 600],
            [4.18, 535, 600],
          ],
          atlases: [
            { at: 0.0, atlas: 'whale_walk_retry_action', cycle: 1.05, flip: false },
            { at: 1.15, atlas: 'whale_point', cycle: 1.15, flip: false },
            { at: 1.90, atlas: 'whale_rain_reach_blink_action', cycle: 1.05, flip: false, emote: 'exclaim' },
            { at: 3.15, atlas: 'whale_wipe_tear_action', cycle: 1.1, flip: false, emote: 'sweat' },
          ],
        },
        {
          characterId: 'qwen',
          height: 284,
          move: 'sway',
          x: 205,
          y: 600,
          atlas: 'qwen_reach_action',
          atlasCycle: 1.35,
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
          move: 'sway',
          track: [
            [4.18, 435, 600],
            [5.42, 445, 600],
            [6.45, 515, 600],
            [7.45, 515, 600],
          ],
          atlases: [
            { at: 4.18, atlas: 'whale_read_action', cycle: 1.25, flip: false },
            { at: 5.42, atlas: 'whale_rain_reach_blink_action', cycle: 1.1, flip: false, emote: 'exclaim' },
          ],
        },
        {
          characterId: 'zai',
          height: 286,
          move: 'bounce',
          x: 945,
          y: 600,
          atlas: 'zai_clock_action',
          atlasCycle: 1.25,
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
    {
      id: 'S03_YUGONG_BACKING',
      start: 7.45,
      end: 11.10,
      set: { id: 'mountain_pass', gateOpen: 0.08 },
      framing: 'wide',
      cameraIntent: {
        type: 'pull',
        reason: '拉开展现刻着「靠山」的大山被整座推走、主角失去后台悬空落坐小靠垫',
        at: 8.75,
        duration: 1.85,
        to: { cx: 635, cy: 376, z: 1.05 },
      },
      actors: [
        {
          characterId: 'whale',
          height: 304,
          move: 'sway',
          track: [
            [7.45, 455, 600],
            [8.85, 455, 600],
            [9.55, 388, 600],
            [11.10, 388, 600],
          ],
          atlases: [
            { at: 7.45, atlas: 'whale_sit_blink_action', cycle: 1.25, flip: false },
            { at: 8.85, atlas: 'whale_selfkind_retry_action', cycle: 1.15, flip: false, emote: 'question' },
          ],
          bodyEvents: [
            { at: 8.88, duration: 0.48, dx: -18, dy: 9, lean: -0.1, squash: 0.07 },
          ],
        },
        {
          characterId: 'gpt',
          height: 316,
          move: 'push_heavy',
          track: [
            [7.45, 548, 600],
            [8.78, 556, 600],
            [10.65, 885, 600],
            [11.10, 902, 600],
          ],
          atlas: 'gpt_push_final_action',
          atlasCycle: 1.05,
          flip: false,
        },
      ],
      mechanisms: [
        {
          kind: 'sliding_mountain',
          layer: 'back',
          label: '靠山',
          track: [
            [7.45, 658, 600],
            [8.78, 666, 600],
            [10.65, 1015, 600],
            [11.10, 1032, 600],
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
        reason: '聚焦工坊门开后打小报告、扣黑锅、穿小鞋的职场小人围拢与挥手拨散',
        at: 12.45,
        duration: 1.35,
        to: { cx: 640, cy: 388, z: 1.13 },
      },
      actors: [
        {
          characterId: 'claude',
          height: 288,
          move: 'work',
          x: 278,
          y: 600,
          atlas: 'claude_collect_action',
          atlasCycle: 1.2,
          flip: false,
        },
        {
          characterId: 'whale',
          height: 306,
          move: 'bounce',
          track: [
            [11.10, 488, 600],
            [13.05, 498, 600],
            [13.68, 548, 600],
            [14.07, 548, 600],
          ],
          atlases: [
            { at: 11.10, atlas: 'whale_point', cycle: 1.15, flip: false },
            { at: 13.05, atlas: 'whale_bird', cycle: 0.95, flip: true, emote: 'sweat' },
          ],
        },
      ],
      mechanisms: [
        { kind: 'paper_puppets', enterAt: 12.55, scatterAt: 13.62, fromX: 915, toX: 642 },
      ],
      stageTriggers: [
        { kind: 'open_door', at: 12.25, duration: 0.72, from: 0.18, to: 0.94 },
        { kind: 'shake_desk', at: 13.10, duration: 0.45, amplitude: 6 },
      ],
      transitions: { type: 'iris', duration: 0.30, focus: [640, 380] },
    },

    // 镜 5 (14.07–17.75s | pivot 15.85s)：我怀疑凿壁偷光 -> 偷光了我的积蓄
    {
      id: 'S05_CHISEL_SAVINGS',
      start: 14.07,
      end: 17.75,
      set: { id: 'screening_desk', brickWall: true, gateOpen: 0.0, lampLit: 0.72 },
      framing: 'two_shot',
      cameraIntent: {
        type: 'pan',
        reason: '跟随砖墙凿孔金光射入「积蓄」存钱罐并将金币吸得一干二净',
        at: 14.95,
        duration: 2.15,
        to: { cx: 680, cy: 384, z: 1.15 },
      },
      actors: [
        {
          characterId: 'kimi',
          height: 292,
          move: 'sway',
          x: 245,
          y: 600,
          atlas: 'kimi_lantern_action',
          atlasCycle: 1.3,
          flip: false,
        },
        {
          characterId: 'whale',
          height: 306,
          move: 'sway',
          track: [
            [14.07, 445, 600],
            [15.85, 455, 600],
            [16.85, 515, 600],
            [17.75, 515, 600],
          ],
          atlases: [
            { at: 14.07, atlas: 'whale_read_action', cycle: 1.25, flip: false },
            { at: 15.85, atlas: 'whale_wipe_tear_action', cycle: 1.1, flip: false, emote: 'exclaim' },
          ],
        },
      ],
      mechanisms: [
        { kind: 'savings_jar_beam', x: 642, y: 476, holeX: 1020, holeY: 292, stealAt: 15.85 },
      ],
      stageTriggers: [
        { kind: 'open_gate', at: 14.65, duration: 0.65, from: 0.0, to: 1.0 },
        { kind: 'shake_desk', at: 15.85, duration: 0.45, amplitude: 4.5 },
      ],
      transitions: { type: 'wipe', duration: 0.30 },
    },

    // 镜 6 (17.75–21.22s | pivot 19.00s)：草船丞相 -> 抢走了我的对象
    // 核心梗点：「对象」= 女朋友角色（活生生的美少女角色 Gemini！），手摇羽扇的草船丞相靠岸把女朋友接上草船甲板载走，情侣粉红爱心当场裂成两半！
    {
      id: 'S06_STRAW_BOAT_GIRLFRIEND',
      start: 17.75,
      end: 21.22,
      set: { id: 'misty_pier', gateOpen: 0.6 },
      framing: 'wide',
      cameraIntent: {
        type: 'pan',
        reason: '随手摇羽扇的草船丞相靠岸把主角的女朋友（对象）接上船向江面跟摇',
        at: 18.85,
        duration: 2.05,
        to: { cx: 685, cy: 382, z: 1.11 },
      },
      actors: [
        {
          // 主角本鲸：前半句在码头与女朋友甜蜜牵丝带约会，19.00s 女朋友被草船丞相抢走后追到桥头尔康手挽留！
          characterId: 'whale',
          height: 304,
          move: 'sway',
          track: [
            [17.75, 362, 592],
            [19.00, 372, 592],
            [20.15, 522, 592],
            [21.22, 534, 592],
          ],
          atlases: [
            { at: 17.75, atlas: 'whale_ribbon_hold_action', cycle: 1.2, flip: false },
            { at: 19.00, atlas: 'whale_walk_retry_action', cycle: 0.95, flip: false, emote: 'exclaim' },
            { at: 19.95, atlas: 'whale_rain_reach_blink_action', cycle: 1.1, flip: false, emote: 'sweat' },
          ],
        },
        {
          // 「我的对象」（活生生的女朋友角色 Gemini！）：17.75..19.00s 捧花站在主角身旁，19.00s 登上草船前甲板随草船丞相乘船远去！
          characterId: 'gemini',
          height: 286,
          move: 'bounce',
          track: [
            [17.75, 498, 592],
            [18.92, 512, 592],
            [19.28, 662, 558],
            [21.22, 988, 558],
          ],
          atlases: [
            { at: 17.75, atlas: 'gemini_flower_action', cycle: 1.2, flip: true },
            { at: 19.00, atlas: 'gemini_star_toss_action', cycle: 1.15, flip: true },
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
          x: 432,
          y: 318,
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
    {
      id: 'S07_KONG_RONG_PEAR',
      start: 21.22,
      end: 24.82,
      set: { id: 'pear_orchard', lampLit: 0.92 },
      framing: 'two_shot',
      cameraIntent: {
        type: 'push',
        reason: '聚焦大金梨在桌面裂开变成盖章「离职书」与离职纸箱，主角一把推回并护住工牌',
        at: 23.05,
        duration: 1.5,
        to: { cx: 650, cy: 390, z: 1.16 },
      },
      actors: [
        {
          characterId: 'whale',
          height: 306,
          move: 'sway',
          track: [
            [21.22, 448, 600],
            [23.40, 468, 600],
            [24.15, 496, 600],
            [24.82, 496, 600],
          ],
          atlases: [
            { at: 21.22, atlas: 'whale_meet_action', cycle: 1.2, flip: false },
            { at: 23.40, atlas: 'whale_point', cycle: 1.05, flip: false, emote: 'question' },
            { at: 24.15, atlas: 'whale_selfkind_retry_action', cycle: 1.15, flip: false },
          ],
        },
        {
          characterId: 'doubao',
          height: 298,
          move: 'sway',
          track: [
            [21.22, 885, 600],
            [22.85, 825, 600],
            [24.10, 848, 600],
            [24.82, 848, 600],
          ],
          atlas: 'doubao_comfort_action',
          atlasCycle: 1.25,
          flip: false,
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
        { kind: 'shake_desk', at: 23.40, duration: 0.45, amplitude: 6 },
      ],
      transitions: { type: 'whip_right', duration: 0.28 },
    },

    // 镜 8 (24.82–29.333333s | pivot 27.57s)：孟母三迁我月薪 -> 也是三千
    {
      id: 'S08_THREE_MOVES',
      start: 24.82,
      end: 29.333333,
      set: { id: 'twilight_street', lampLit: 0.96 },
      framing: 'wide',
      cameraIntent: {
        type: 'follow',
        reason: '伴随「一迁/二迁/三迁」三栋屋舍滚过视差街巷，最后对着扁扁「月薪三千」袋与热茶温柔自嘲收尾',
        at: 25.0,
        duration: 2.65,
        to: { cx: 660, cy: 386, z: 1.12 },
      },
      actors: [
        {
          characterId: 'whale',
          height: 304,
          move: 'bounce',
          track: [
            [24.82, 335, 600],
            [27.57, 592, 600],
            [29.333333, 592, 600],
          ],
          atlases: [
            { at: 24.82, atlas: 'whale_walk_retry_action', cycle: 0.98, flip: false },
            { at: 27.57, atlas: 'whale_read_action', cycle: 1.2, flip: false, emote: 'sparkle' },
          ],
        },
      ],
      mechanisms: [
        { kind: 'scrolling_houses', layer: 'back', start: 24.82, end: 27.57, fromOffset: 130, toOffset: -420 },
        { kind: 'steaming_teacup', x: 808, y: 542, enterAt: 27.45 },
      ],
      stageTriggers: [
        { kind: 'pulse_lamp', at: 27.55, duration: 0.9, amount: 0.22 },
      ],
      transitions: { type: 'fade', duration: 0.28 },
    },
  ],
};
