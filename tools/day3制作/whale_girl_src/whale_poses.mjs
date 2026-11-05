// ============================================================================
// whale_poses.mjs — 姿势注册表（v6）
//
// v4 的 9 张 + 本轮复刻旧版动作新生成的 9 张 = 18 张，全部是同一角色的差分姿势。
// 这里只登记「用哪张图、脚底线在哪」，骨架由 whale_rig.mjs 从 alpha 通道现量。
// ============================================================================

export const POSES = {
  // ---- v4：基础 9 张 ----
  idle:            { file: 'whale_idle.png',            foot: 0.988, tag: '站立' },
  wave:            { file: 'whale_wave.png',            foot: 0.989, tag: '挥手' },
  run:             { file: 'whale_run.png',             foot: 0.974, tag: '冲刺' },
  cry:             { file: 'whale_cry.png',             foot: 0.989, tag: '大哭' },
  shock:           { file: 'whale_shock.png',           foot: 0.988, tag: '震惊' },
  eat:             { file: 'whale_eat.png',             foot: 0.989, tag: '捧碗吃' },
  point:           { file: 'whale_point.png',           foot: 0.988, tag: '指证' },
  think:           { file: 'whale_think.png',           foot: 0.989, tag: '翻本子' },
  cheer:           { file: 'whale_cheer.png',           foot: 0.980, tag: '欢呼跳' },

  // ---- v6：按旧版 ACTION_LIST 复刻的 9 张 ----
  peek_curious:    { file: 'whale_peek_curious.png',    foot: 0.988, tag: '放大镜张望' },
  shy_fidget:      { file: 'whale_shy_fidget.png',      foot: 0.988, tag: '害羞戳手指' },
  ciallo_wink:     { file: 'whale_ciallo_wink.png',     foot: 0.988, tag: '比耶眨眼' },
  wake_stretch:    { file: 'whale_wake_stretch.png',    foot: 0.988, tag: '伸懒腰' },
  confident_hips:  { file: 'whale_confident_hips.png',  foot: 0.989, tag: '叉腰得意' },
  camera_shutter:  { file: 'whale_camera_shutter.png',  foot: 0.988, tag: '举相机' },
  eat_onigiri:     { file: 'whale_eat_onigiri.png',     foot: 0.988, tag: '啃饭团' },
  coin_hug:        { file: 'whale_coin_hug.png',        foot: 0.988, tag: '抱金币' },
  playful_fists:   { file: 'whale_playful_fists.png',   foot: 0.987, tag: '握拳抗议' },

  // ---- v7：继续按旧版 ACTION_LIST 补齐的 10 张（28 个旧动作至此都有专属姿势）----
  hum_working_song:  { file: 'whale_hum_working_song.png',  foot: 0.988, tag: '哼歌干活' },
  token_wordle_sneak:{ file: 'whale_token_wordle_sneak.png', foot: 0.991, tag: '偷摸玩电脑' },
  drag_ahoge:        { file: 'whale_drag_ahoge.png',        foot: 0.993, tag: '被拎呆毛' },
  sleep_curl:        { file: 'whale_sleep_curl.png',        foot: 0.968, tag: '蜷尾侧睡' },
  idol_mic_sing:     { file: 'whale_idol_mic_sing.png',     foot: 0.995, tag: '握麦高歌' },
  fatfish_working:   { file: 'whale_fatfish_working.png',   foot: 0.990, tag: '敲键盘打工' },
  tail_wag_dance:    { file: 'whale_tail_wag_dance.png',    foot: 0.991, tag: '摇尾跳舞' },
  jump_joy:          { file: 'whale_jump_joy.png',          foot: 0.979, tag: '跳跃' },
  toast_cheers:      { file: 'whale_toast_cheers.png',      foot: 0.989, tag: '举杯' },
  umbrella_stroll:   { file: 'whale_umbrella_stroll.png',   foot: 0.987, tag: '撑伞' },

  // ---- v8：重出的三张（玫瑰重画；走路/跑步给了明确的迈步姿势，腿再由骨架摆）----
  rose_bouquet: { file: 'whale_rose_bouquet.png', foot: 0.984, tag: '捧玫瑰' },
  walk_a:       { file: 'whale_walk_a.png',       foot: 0.982, tag: '迈步 A' },
  walk_b:       { file: 'whale_walk_b.png',       foot: 0.982, tag: '迈步 B' },
  run_a:        { file: 'whale_run_a.png',        foot: 0.979, tag: '奔跑 A' },
  run_b:        { file: 'whale_run_b.png',        foot: 0.985, tag: '奔跑 B' },

  // ---- v8：最后 4 个复用别人立绘的动作，补上专属图 ----
  guitar_strum:       { file: 'whale_guitar_strum.png',       foot: 0.989, tag: '弹吉他' },
  sparkler_firework:  { file: 'whale_sparkler_firework.png',  foot: 0.989, tag: '仙女棒' },
  shock_petrify:      { file: 'whale_shock_petrify.png',      foot: 0.988, tag: '石化' },
  cry_fountain:       { file: 'whale_cry_fountain.png',       foot: 0.989, tag: '大哭' },
  fatfish_transform:  { file: 'whale_fatfish_transform.png',  foot: 0.988, tag: '召唤大肥鱼' },
  drag_ahoge_swing:   { file: 'whale_drag_ahoge_swing.png',   foot: 0.970, tag: '悬空乱蹬' },

  // ---- v9：走/跑的“站立底图”，迈步完全交给腿骨 ----
  walk_stand:         { file: 'whale_walk_stand.png',         foot: 0.989, tag: '站立底图（走）' },
  run_stand:          { file: 'whale_run_stand.png',          foot: 0.988, tag: '站立底图（跑）' }
};

export const POSE_NAMES = Object.keys(POSES);
