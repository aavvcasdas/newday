// mv.spec.mjs — 《我怀疑大禹治水》声明式 8 镜全动态 MV 分镜配置（运行在通用 tools/remotion-engine 之上）
// 严格对齐：
//   - 原音频 `/home/user/newday/我怀疑大禹治水治没了我的薪水.mp3` (29.333333s = 880 帧 @ 30fps，原流直拷不变速)
//   - 用户原始 8 句歌词一字不改，前半句立神话机制，后半句在声学重音点触发职场反转
//   - 8 镜切换 8 座不同动态视差舞台，复用仓库既有 16 帧动作图集 + 程序化世界机关，新生图 0 张

export default {
  compositionId: 'DayuLyricMV',
  title: '我怀疑大禹治水',
  complianceBadge: '非官方同人 / AI生成',
  bpm: 118,
  beatOffset: 0.15,
  beatsPerBar: 4,
  fps: 30,
  width: 1920,
  height: 1080,
  duration: 29.333333,
  audioPath: '我怀疑大禹治水治没了我的薪水.mp3',

  lyrics: [
    {
      start: 0.0,
      vocalStart: 1.15,
      pivot: 3.85,
      end: 5.35,
      top: '我怀疑大禹治水',
      bottom: '治没了我的薪水',
      text: '我怀疑大禹治水 治没了我的薪水',
    },
    {
      start: 5.35,
      vocalStart: 5.42,
      pivot: 7.20,
      end: 8.85,
      top: '后羿射日',
      bottom: '射没了我的周日',
      text: '后羿射日 射没了我的周日',
    },
    {
      start: 8.85,
      vocalStart: 8.95,
      pivot: 10.90,
      end: 12.55,
      top: '愚公移山',
      bottom: '移走了我的靠山',
      text: '愚公移山 移走了我的靠山',
    },
    {
      start: 12.55,
      vocalStart: 12.65,
      pivot: 13.72,
      end: 15.45,
      top: '女娲造人',
      bottom: '给我造的小人',
      text: '女娲造人 给我造的小人',
    },
    {
      start: 15.45,
      vocalStart: 15.65,
      pivot: 17.45,
      end: 19.00,
      top: '我怀疑凿壁偷光',
      bottom: '偷光了我的积蓄',
      text: '我怀疑凿壁偷光 偷光了我的积蓄',
    },
    {
      start: 19.00,
      vocalStart: 19.15,
      pivot: 21.10,
      end: 23.10,
      top: '草船丞相',
      bottom: '抢走了我的对象',
      text: '草船丞相 抢走了我的对象',
    },
    {
      start: 23.10,
      vocalStart: 23.20,
      pivot: 25.55,
      end: 27.65,
      top: '孔融让梨就是',
      bottom: '让我离职',
      text: '孔融让梨就是 让我离职',
    },
    {
      start: 27.65,
      vocalStart: 27.80,
      pivot: 28.58,
      end: 29.333333,
      top: '孟母三迁我月薪',
      bottom: '也是三千',
      text: '孟母三迁我月薪 也是三千',
    },
  ],

  shots: [
    // 镜 1：大禹治水 -> 治没了我的薪水
    {
      id: 'S01_DAYU_FLOOD',
      start: 0.0,
      end: 5.35,
      set: { id: 'river_gate', gateOpen: 0.12 },
      framing: 'wide',
      cameraIntent: {
        type: 'pan',
        reason: '随拉闸开洪推进并跟摇追踪被大水卷走的工资信封',
        at: 1.2,
        duration: 3.6,
        to: { cx: 685, cy: 382, z: 1.12 },
      },
      actors: [
        {
          characterId: 'whale',
          height: 306,
          move: 'bounce',
          track: [
            [0.0, 290, 600],
            [1.42, 435, 600],
            [3.82, 442, 600],
            [4.75, 492, 600],
            [5.35, 492, 600],
          ],
          atlases: [
            { at: 0.0, atlas: 'whale_walk_retry_action', cycle: 1.15, flip: false },
            { at: 1.42, atlas: 'whale_point', cycle: 1.25, flip: false },
            { at: 3.85, atlas: 'whale_side_crouch_action', cycle: 1.05, flip: true, emote: 'exclaim' },
            { at: 4.68, atlas: 'whale_wipe_tear_action', cycle: 1.2, flip: false, emote: 'sweat' },
          ],
        },
        {
          characterId: 'qwen',
          height: 284,
          move: 'sway',
          x: 215,
          y: 600,
          atlas: 'qwen_reach_action',
          atlasCycle: 1.4,
          flip: false,
        },
      ],
      mechanisms: [
        { kind: 'lever_switch', x: 562, y: 600, pullAt: 1.45, duration: 0.5 },
        { kind: 'envelope_flood', standX: 682, standY: 600, floodAt: 3.85, floodEnd: 5.25, toX: 1125, toY: 556 },
      ],
      stageTriggers: [
        { kind: 'open_gate', at: 1.45, duration: 1.5, from: 0.12, to: 0.96 },
        { kind: 'splash_water', at: 1.65, x: 890, y: 590 },
        { kind: 'splash_water', at: 3.92, x: 715, y: 588 },
      ],
      transitions: { type: 'none', duration: 0 },
    },

    // 镜 2：后羿射日 -> 射没了我的周日
    {
      id: 'S02_HOUYI_SUNDAY',
      start: 5.35,
      end: 8.85,
      set: { id: 'seaside_deck', dawn: 1.0 },
      framing: 'wide',
      cameraIntent: {
        type: 'push',
        reason: '聚焦金箭射落周日日历与骄阳沉海转入暮色',
        at: 6.7,
        duration: 1.8,
        to: { cx: 650, cy: 382, z: 1.13 },
      },
      actors: [
        {
          characterId: 'whale',
          height: 306,
          move: 'sway',
          track: [
            [5.35, 445, 600],
            [7.18, 452, 600],
            [8.25, 522, 600],
            [8.85, 522, 600],
          ],
          atlases: [
            { at: 5.35, atlas: 'whale_read_action', cycle: 1.35, flip: false },
            { at: 7.20, atlas: 'whale_rain_reach_blink_action', cycle: 1.15, flip: false, emote: 'exclaim' },
          ],
        },
        {
          characterId: 'zai',
          height: 286,
          move: 'bounce',
          x: 925,
          y: 600,
          atlas: 'zai_clock_action',
          atlasCycle: 1.3,
          flip: false,
        },
      ],
      mechanisms: [
        { kind: 'sunday_calendar', x: 665, y: 600, label: '周日', pierceAt: 7.20 },
        { kind: 'flying_arrow', fromX: 1150, fromY: 152, toX: 665, toY: 488, shootAt: 6.92, hitAt: 7.20 },
      ],
      stageTriggers: [
        { kind: 'dawn_shift', at: 7.18, duration: 1.35, from: 1.0, to: 0.14 },
      ],
      transitions: { type: 'whip_left', duration: 0.34 },
    },

    // 镜 3：愚公移山 -> 移走了我的靠山
    {
      id: 'S03_YUGONG_BACKING',
      start: 8.85,
      end: 12.55,
      set: { id: 'mountain_pass', gateOpen: 0.08 },
      framing: 'wide',
      cameraIntent: {
        type: 'pull',
        reason: '拉开展现靠山被整座推走、峡口透出金光与小靠垫落定',
        at: 10.6,
        duration: 1.7,
        to: { cx: 635, cy: 376, z: 1.05 },
      },
      actors: [
        {
          characterId: 'whale',
          height: 304,
          move: 'sway',
          track: [
            [8.85, 458, 600],
            [10.85, 458, 600],
            [11.45, 392, 600],
            [12.55, 392, 600],
          ],
          atlases: [
            { at: 8.85, atlas: 'whale_sit_blink_action', cycle: 1.35, flip: false },
            { at: 10.88, atlas: 'whale_selfkind_retry_action', cycle: 1.2, flip: false, emote: 'question' },
          ],
          bodyEvents: [
            { at: 10.90, duration: 0.46, dx: -16, dy: 8, lean: -0.09, squash: 0.06 },
          ],
        },
        {
          characterId: 'gpt',
          height: 316,
          move: 'push_heavy',
          track: [
            [8.85, 548, 600],
            [10.75, 556, 600],
            [12.35, 868, 600],
            [12.55, 878, 600],
          ],
          atlas: 'gpt_push_final_action',
          atlasCycle: 1.1,
          flip: false,
        },
      ],
      mechanisms: [
        {
          kind: 'sliding_mountain',
          layer: 'back',
          track: [
            [8.85, 655, 600],
            [10.75, 662, 600],
            [12.35, 995, 600],
            [12.55, 1005, 600],
          ],
        },
        { kind: 'cushion', layer: 'back', x: 356, y: 596, enterAt: 11.22 },
      ],
      stageTriggers: [
        { kind: 'open_gate', at: 10.85, duration: 1.5, from: 0.08, to: 0.96 },
      ],
      transitions: { type: 'pan_through', duration: 0.36 },
    },

    // 镜 4：女娲造人 -> 给我造的小人
    {
      id: 'S04_NVWA_PUPPETS',
      start: 12.55,
      end: 15.45,
      set: { id: 'terracotta_courtyard', doorOpen: 0.18, lampLit: 0.88 },
      framing: 'wide',
      cameraIntent: {
        type: 'push',
        reason: '聚焦工坊门开后泥纸小人举空白小牌围拢与挥手拨散',
        at: 13.5,
        duration: 1.6,
        to: { cx: 635, cy: 388, z: 1.13 },
      },
      actors: [
        {
          characterId: 'claude',
          height: 288,
          move: 'work',
          x: 285,
          y: 600,
          atlas: 'claude_collect_action',
          atlasCycle: 1.25,
          flip: false,
        },
        {
          characterId: 'whale',
          height: 306,
          move: 'bounce',
          track: [
            [12.55, 492, 600],
            [13.72, 502, 600],
            [14.65, 565, 600],
            [15.45, 565, 600],
          ],
          atlases: [
            { at: 12.55, atlas: 'whale_point', cycle: 1.25, flip: false },
            { at: 13.72, atlas: 'whale_bird', cycle: 1.05, flip: true, emote: 'sweat' },
          ],
        },
      ],
      mechanisms: [
        { kind: 'paper_puppets', enterAt: 13.55, scatterAt: 14.55, fromX: 930, toX: 665 },
      ],
      stageTriggers: [
        { kind: 'open_door', at: 13.15, duration: 0.85, from: 0.18, to: 0.92 },
        { kind: 'shake_desk', at: 14.55, duration: 0.52, amplitude: 6 },
      ],
      transitions: { type: 'iris', duration: 0.38, focus: [640, 380] },
    },

    // 镜 5：我怀疑凿壁偷光 -> 偷光了我的积蓄
    {
      id: 'S05_CHISEL_SAVINGS',
      start: 15.45,
      end: 19.00,
      set: { id: 'screening_desk', brickWall: true, gateOpen: 0.0, lampLit: 0.72 },
      framing: 'two_shot',
      cameraIntent: {
        type: 'pan',
        reason: '跟随砖墙凿孔金光射入储蓄罐并将金圆币吸向墙洞',
        at: 16.3,
        duration: 2.2,
        to: { cx: 680, cy: 384, z: 1.15 },
      },
      actors: [
        {
          characterId: 'kimi',
          height: 292,
          move: 'sway',
          x: 248,
          y: 600,
          atlas: 'kimi_lantern_action',
          atlasCycle: 1.35,
          flip: false,
        },
        {
          characterId: 'whale',
          height: 306,
          move: 'sway',
          track: [
            [15.45, 445, 600],
            [17.40, 455, 600],
            [18.25, 515, 600],
            [19.00, 515, 600],
          ],
          atlases: [
            { at: 15.45, atlas: 'whale_read_action', cycle: 1.3, flip: false },
            { at: 17.45, atlas: 'whale_wipe_tear_action', cycle: 1.15, flip: false, emote: 'exclaim' },
          ],
        },
      ],
      mechanisms: [
        { kind: 'savings_jar_beam', x: 640, y: 472, holeX: 1020, holeY: 292, stealAt: 17.42 },
      ],
      stageTriggers: [
        { kind: 'open_gate', at: 16.25, duration: 0.65, from: 0.0, to: 1.0 },
        { kind: 'shake_desk', at: 17.45, duration: 0.45, amplitude: 4.5 },
      ],
      transitions: { type: 'wipe', duration: 0.36 },
    },

    // 镜 6：草船丞相 -> 抢走了我的对象
    {
      id: 'S06_STRAW_BOAT_CRANES',
      start: 19.00,
      end: 23.10,
      set: { id: 'misty_pier', gateOpen: 0.6 },
      framing: 'wide',
      cameraIntent: {
        type: 'pan',
        reason: '随草船掠过木栈码头并带走成对纸鹤中的一只向江面跟摇',
        at: 20.6,
        duration: 2.1,
        to: { cx: 675, cy: 382, z: 1.11 },
      },
      actors: [
        {
          characterId: 'gemini',
          height: 288,
          move: 'bounce',
          x: 225,
          y: 592,
          atlas: 'gemini_star_toss_action',
          atlasCycle: 1.3,
          flip: false,
        },
        {
          characterId: 'whale',
          height: 304,
          move: 'sway',
          track: [
            [19.00, 405, 592],
            [21.05, 422, 592],
            [22.40, 528, 592],
            [23.10, 528, 592],
          ],
          atlases: [
            { at: 19.00, atlas: 'whale_ribbon_hold_action', cycle: 1.3, flip: false },
            { at: 21.10, atlas: 'whale_rain_reach_blink_action', cycle: 1.15, flip: false, emote: 'exclaim' },
          ],
        },
      ],
      mechanisms: [
        {
          kind: 'straw_boat_cranes',
          layer: 'back',
          renderPass: 'boat',
          boatTrack: [
            [19.00, 1135, 548],
            [21.05, 760, 548],
            [23.10, 1065, 548],
          ],
        },
        {
          kind: 'straw_boat_cranes',
          layer: 'front',
          renderPass: 'cranes',
          pierX: 590,
          pierY: 546,
          boardAt: 21.05,
          boatTrack: [
            [19.00, 1135, 548],
            [21.05, 760, 548],
            [23.10, 1065, 548],
          ],
        },
      ],
      stageTriggers: [
        { kind: 'splash_water', at: 20.85, x: 760, y: 566 },
        { kind: 'splash_water', at: 21.65, x: 890, y: 566 },
      ],
      transitions: { type: 'pan_through', duration: 0.38 },
    },

    // 镜 7：孔融让梨就是 -> 让我离职
    {
      id: 'S07_KONG_RONG_PEAR',
      start: 23.10,
      end: 27.65,
      set: { id: 'pear_orchard', lampLit: 0.92 },
      framing: 'two_shot',
      cameraIntent: {
        type: 'push',
        reason: '聚焦大金梨在桌面展开为空白信封与鲸鱼娘推回信封收好工牌',
        at: 25.1,
        duration: 2.0,
        to: { cx: 650, cy: 390, z: 1.16 },
      },
      actors: [
        {
          characterId: 'whale',
          height: 306,
          move: 'sway',
          track: [
            [23.10, 448, 600],
            [25.55, 468, 600],
            [26.55, 496, 600],
            [27.65, 496, 600],
          ],
          atlases: [
            { at: 23.10, atlas: 'whale_meet_action', cycle: 1.25, flip: false },
            { at: 25.55, atlas: 'whale_point', cycle: 1.15, flip: false, emote: 'question' },
            { at: 26.55, atlas: 'whale_selfkind_retry_action', cycle: 1.25, flip: false },
          ],
        },
        {
          characterId: 'doubao',
          height: 298,
          move: 'sway',
          track: [
            [23.10, 885, 600],
            [24.60, 825, 600],
            [26.40, 848, 600],
            [27.65, 848, 600],
          ],
          atlas: 'doubao_comfort_action',
          atlasCycle: 1.3,
          flip: false,
        },
      ],
      mechanisms: [
        {
          kind: 'pear_to_envelope',
          fromX: 760,
          midX: 635,
          pushBackX: 728,
          y: 480,
          slideStart: 23.40,
          openAt: 25.55,
          pushBackAt: 26.22,
          badgeX: 548,
          badgeY: 472,
        },
      ],
      stageTriggers: [
        { kind: 'shake_desk', at: 25.55, duration: 0.52, amplitude: 6 },
      ],
      transitions: { type: 'whip_right', duration: 0.34 },
    },

    // 镜 8：孟母三迁我月薪 -> 也是三千
    {
      id: 'S08_THREE_MOVES',
      start: 27.65,
      end: 29.333333,
      set: { id: 'twilight_street', lampLit: 0.96 },
      framing: 'wide',
      cameraIntent: {
        type: 'follow',
        reason: '伴随三栋小房滚过视差街巷并在暖灯长椅与热茶旁温柔收尾',
        at: 27.7,
        duration: 1.45,
        to: { cx: 660, cy: 386, z: 1.12 },
      },
      actors: [
        {
          characterId: 'whale',
          height: 304,
          move: 'bounce',
          track: [
            [27.65, 345, 600],
            [28.58, 642, 600],
            [29.333333, 642, 600],
          ],
          atlases: [
            { at: 27.65, atlas: 'whale_walk_retry_action', cycle: 0.95, flip: false },
            { at: 28.58, atlas: 'whale_read_action', cycle: 1.25, flip: false, emote: 'sparkle' },
          ],
        },
      ],
      mechanisms: [
        { kind: 'scrolling_houses', layer: 'back', start: 27.65, end: 28.68, fromOffset: 115, toOffset: -425 },
        { kind: 'steaming_teacup', x: 752, y: 542, enterAt: 28.48 },
      ],
      stageTriggers: [
        { kind: 'pulse_lamp', at: 28.45, duration: 0.8, amount: 0.2 },
      ],
      transitions: { type: 'fade', duration: 0.28 },
    },
  ],
};
