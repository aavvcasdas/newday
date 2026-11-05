// ============================================================================
// claude_poses.mjs — Claude 大小姐的立绘注册表 + 镜头用图
//
// 立绘来自 opsCar/claude-daxiaojie-assets（CC BY-NC-SA 4.0，署名见 ./ATTRIBUTION.md）。
// v10 起改用素材库的 **chibi（Q 版）** 系列：13 个镜头各配一张 Q 版差分，
// 不重画、不改配色，只按镜头挑姿势 + 缩放 + 骨骼绑定。
// Q 版比例接近正方（原图 ~1312×1199），所以 heightU 比正比例立绘小一档（9.6u），
// 屏幕上的身高与鲸鱼娘（12u）拉开差距，符合「Q 版」的观感。
// ============================================================================

export const CLAUDE_POSES = {
  question:        { file: 'pose_question.png',        foot: 0.999, heightU: 9.4, tag: '咦？' },
  curtsy:          { file: 'pose_curtsy.png',          foot: 0.998, heightU: 9.6, tag: '屈膝礼' },
  reading_book:    { file: 'pose_reading_book.png',    foot: 0.990, heightU: 9.5, tag: '翻账本' },
  pointing_viewer: { file: 'pose_pointing_viewer.png', foot: 0.997, heightU: 9.4, tag: '指给你看' },
  noodles:         { file: 'pose_noodles.png',         foot: 0.988, heightU: 9.5, tag: '捧饭碗' },
  ok_hand:         { file: 'pose_ok_hand.png',         foot: 0.995, heightU: 9.5, tag: 'OK' },
  megaphone:       { file: 'pose_megaphone.png',       foot: 0.997, heightU: 9.4, tag: '拿喇叭主持' },
  cheer:           { file: 'pose_cheer.png',           foot: 0.990, heightU: 9.4, tag: '加油' },
  wave_hi:         { file: 'pose_wave_hi.png',         foot: 0.989, heightU: 9.4, tag: '打招呼' },
  dance:           { file: 'pose_dance.png',           foot: 0.991, heightU: 9.4, tag: '跳舞' },
  sing:            { file: 'pose_sing.png',            foot: 0.984, heightU: 9.5, tag: '唱歌' },
  panic:           { file: 'pose_panic.png',           foot: 0.989, heightU: 9.4, tag: '慌' },
  tremble:         { file: 'pose_tremble.png',         foot: 0.995, heightU: 9.4, tag: '发抖' },
  no_sign:         { file: 'pose_no_sign.png',         foot: 0.990, heightU: 9.4, tag: '拒绝' }
};

// 每个镜头默认用哪张（键是 cue 序号 4..16）
export const CLAUDE_SHOT_POSE = {
  3: 'curtsy',          // L03 染色变身完成后的亮相（刷到底才整张换成这张）
  4: 'question',        // L04 共创嘉宾怎么变成自己了
  5: 'curtsy',          // L05 请叫本小姐
  6: 'reading_book',    // L06 复盘昨天
  7: 'pointing_viewer', // L07 完播率
  8: 'noodles',         // L08 半碗饭
  9: 'ok_hand',         // L09 蛋批了 / 9:8
  10: 'megaphone',      // L10 主持
  11: 'cheer',          // L11 薄肌预备饭
  12: 'wave_hi',        // L12 点名共创
  13: 'dance',          // L13 查 MV
  14: 'sing',           // L14 饭碗当麦
  15: 'panic',          // L15 扎水 / 掉色
  16: 'tremble'         // L16 褪色
};

export const CLAUDE_ACTION_POSE = {
  idle: 'cheer',
  explain: 'pointing_viewer',
  wave_hand: 'wave_hi',
  refuse: 'no_sign',
  present: 'pointing_viewer',
  mic: 'sing',
  shocked: 'panic',
  flustered: 'tremble',
  signoff: 'curtsy'
};
