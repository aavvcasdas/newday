// timeline.js — Single source of truth: 119.728 BPM grid, 46 measured lyric cues, screen shakes & 16-bit SFX events
export const DUR = 132.77;
export const BPM = 119.728;
export const BEAT = 0.501136;
export const BAR = BEAT * 4;     // 2.004545 s
export const PHASE = 0.035;

export const barAt = (b) => PHASE + b * BAR;
export const beatAt = (b, sub = 0) => PHASE + b * BAR + sub * BEAT;

// Exact 46 lyric cues aligned to 达拉崩吧.mp4 vocals & MV visual cuts
export const SUBS = [
  { id: 'L01', t0: 18.08, t1: 20.06, speaker: 'narrator', text: '很久很久以前' },
  { id: 'L02', t0: 20.08, t1: 22.07, speaker: 'narrator', text: '巨龙突然出现' },
  { id: 'L03', t0: 22.09, t1: 24.07, speaker: 'narrator', text: '带来灾难' },
  { id: 'L04', t0: 24.09, t1: 26.07, speaker: 'narrator', text: '带走了公主又消失不见' },
  { id: 'L05', t0: 26.09, t1: 28.08, speaker: 'narrator', text: '王国十分危险' },
  { id: 'L06', t0: 28.10, t1: 30.08, speaker: 'narrator', text: '世间谁最勇敢' },
  { id: 'L07', t0: 30.10, t1: 32.09, speaker: 'narrator', text: '一位勇者赶来' },
  { id: 'L08', t0: 32.11, t1: 34.09, speaker: 'whale',    text: '大声喊' },
  { id: 'L09', t0: 34.11, t1: 36.10, speaker: 'whale',    text: '我要带上最好的剑' },
  { id: 'L10', t0: 36.12, t1: 38.10, speaker: 'whale',    text: '翻过最高的山' },
  { id: 'L11', t0: 38.12, t1: 40.11, speaker: 'whale',    text: '闯进最深的森林' },
  { id: 'L12', t0: 40.13, t1: 42.11, speaker: 'whale',    text: '把公主带回到面前' },
  { id: 'L13', t0: 42.13, t1: 44.12, speaker: 'narrator', text: '国王非常高兴' },
  { id: 'L14', t0: 44.14, t1: 46.62, speaker: 'claude',   text: '忙问他的姓名' },
  { id: 'L15', t0: 46.64, t1: 49.63, speaker: 'narrator', text: '年轻人想了想' },
  { id: 'L16', t0: 49.65, t1: 51.63, speaker: 'whale',    text: '他说 陛下我叫' },
  { id: 'L17', t0: 51.65, t1: 54.14, speaker: 'whale',    text: '达拉崩吧斑得贝迪卜多比鲁翁' },
  { id: 'L18', t0: 54.16, t1: 55.39, speaker: 'claude',   text: '再说一次' },
  { id: 'L19', t0: 55.41, t1: 58.15, speaker: 'whale',    text: '达拉崩吧斑得贝迪卜多比鲁翁' },
  { id: 'L20', t0: 58.17, t1: 59.40, speaker: 'claude',   text: '是不是' },
  { id: 'L21', t0: 59.42, t1: 62.16, speaker: 'claude',   text: '达拉崩吧斑得贝迪卜多比鲁翁' },
  { id: 'L22', t0: 62.18, t1: 63.66, speaker: 'whale',    text: '啊对对' },
  { id: 'L23', t0: 63.68, t1: 66.85, speaker: 'whale',    text: '达拉崩吧斑得贝迪卜多比鲁翁' },

  // (break: 66.85 – 85.23s)
  { id: 'L24', t0: 85.23, t1: 87.21, speaker: 'narrator', text: '英雄达拉崩吧' },
  { id: 'L25', t0: 87.23, t1: 89.22, speaker: 'narrator', text: '骑上最快的马' },
  { id: 'L26', t0: 89.24, t1: 91.22, speaker: 'narrator', text: '带着大家的希望' },
  { id: 'L27', t0: 91.24, t1: 93.23, speaker: 'narrator', text: '从城堡里出发' },
  { id: 'L28', t0: 93.25, t1: 95.23, speaker: 'narrator', text: '战胜魔兽来袭' },
  { id: 'L29', t0: 95.25, t1: 97.24, speaker: 'narrator', text: '获得十二金币' },
  { id: 'L30', t0: 97.26, t1: 99.24, speaker: 'narrator', text: '无数伤痕见证' },
  { id: 'L31', t0: 99.26, t1: 101.24, speaker: 'narrator', text: '他慢慢升级' },
  { id: 'L32', t0: 101.26, t1: 103.25, speaker: 'narrator', text: '偏远美丽村庄' },
  { id: 'L33', t0: 103.27, t1: 105.25, speaker: 'narrator', text: '打开所有宝箱' },
  { id: 'L34', t0: 105.27, t1: 107.26, speaker: 'narrator', text: '一路风霜伴随' },
  { id: 'L35', t0: 107.28, t1: 110.52, speaker: 'narrator', text: '指引前路的圣月光' },
  { id: 'L36', t0: 110.54, t1: 112.52, speaker: 'narrator', text: '闯入一座山洞' },
  { id: 'L37', t0: 112.54, t1: 114.53, speaker: 'doubao',   text: '公主和可怕巨龙' },
  { id: 'L38', t0: 114.55, t1: 116.28, speaker: 'whale',    text: '英雄拔出宝剑' },
  { id: 'L39', t0: 116.30, t1: 117.53, speaker: 'gpt',      text: '巨龙说 我是' },
  { id: 'L40', t0: 117.55, t1: 120.29, speaker: 'gpt',      text: '昆图库塔卡提考特苏瓦西拉松' },
  { id: 'L41', t0: 120.31, t1: 121.54, speaker: 'whale',    text: '再来一次' },
  { id: 'L42', t0: 121.56, t1: 124.30, speaker: 'gpt',      text: '昆图库塔卡提考特苏瓦西拉松' },
  { id: 'L43', t0: 124.32, t1: 125.30, speaker: 'whale',    text: '是不是' },
  { id: 'L44', t0: 125.32, t1: 128.31, speaker: 'whale',    text: '昆特牌提琴烤蛋挞苏打马拉松' },
  { id: 'L45', t0: 128.33, t1: 129.56, speaker: 'gpt',      text: '不对是' },
  { id: 'L46', t0: 129.58, t1: 132.72, speaker: 'gpt',      text: '昆图库塔卡提考特苏瓦西拉松' },
];

// Screen-shake hit timestamps
export const SHAKES = [
  { t: 20.85, amp: 1 }, { t: 22.35, amp: 1 }, { t: 23.25, amp: 1 },
  { t: 56.80, amp: 1 },
  { t: 63.80, amp: 1 }, { t: 64.55, amp: 1 }, { t: 65.30, amp: 1 }, { t: 66.05, amp: 2 },
  { t: 80.05, amp: 1 },
  { t: 94.00, amp: 1 }, { t: 94.65, amp: 1 },
  { t: 113.05, amp: 1 }, { t: 115.00, amp: 1 },
  { t: 128.45, amp: 2 },
  { t: 129.75, amp: 1 }, { t: 130.50, amp: 1 }, { t: 131.25, amp: 2 }, { t: 132.00, amp: 2 },
];

// 16-bit Chiptune SFX cue events exported via core/render/events.mjs → mix.py
export const EV = [
  // Intro book & cartridge start
  { t: 0.45, type: 'cursor' },
  { t: 2.04, type: 'cursor' },
  { t: 5.00, type: 'shimmer' },
  { t: 7.20, type: 'start_confirm' },
  { t: 8.05, type: 'book_open' },
  { t: 10.06, type: 'palette_step', step: 1 },
  { t: 12.06, type: 'palette_step', step: 2 },
  { t: 14.07, type: 'palette_step', step: 3 },

  // Dragon raid
  { t: 20.80, type: 'thunder_dive' },
  { t: 22.35, type: 'fireball' },
  { t: 23.25, type: 'fireball' },
  { t: 25.10, type: 'portal_warp' },
  { t: 26.50, type: 'alert_ping' },

  // Hero arrival & map route
  { t: 30.15, type: 'holy_beam' },
  { t: 32.30, type: 'sword_unsheathe' },
  { t: 34.40, type: 'map_pin', n: 0 },
  { t: 36.40, type: 'map_pin', n: 1 },
  { t: 38.40, type: 'map_pin', n: 2 },
  { t: 40.60, type: 'map_pin', n: 3 },
  { t: 41.40, type: 'heart_chime' },

  // Throne room dialogue & name overflow
  { t: 44.30, type: 'window_open' },
  { t: 44.70, type: 'blip_queen' }, { t: 44.95, type: 'blip_queen' },
  { t: 47.40, type: 'think_dot' }, { t: 48.10, type: 'think_dot' }, { t: 48.80, type: 'think_bulb' },
  { t: 50.10, type: 'blip_whale' },
  { t: 51.75, type: 'rapid_type_whale' },
  { t: 53.35, type: 'overflow_buzz' },
  { t: 54.25, type: 'quill_snap' },
  { t: 55.45, type: 'window_open' },
  { t: 56.80, type: 'overflow_buzz' },
  { t: 58.25, type: 'dizzy_chirp' },
  { t: 62.25, type: 'confirm_ding' },
  { t: 63.80, type: 'stone_slam' },
  { t: 64.55, type: 'stone_slam' },
  { t: 65.30, type: 'stone_slam' },
  { t: 66.05, type: 'stone_slam_big' },

  // Break interlude: scarf dash, tarot cards, seal stamp
  { t: 67.00, type: 'dash_whoosh' },
  { t: 70.75, type: 'chapter_gong' },
  { t: 74.30, type: 'card_flip', n: 0 },
  { t: 75.05, type: 'card_flip', n: 1 },
  { t: 75.80, type: 'card_flip', n: 2 },
  { t: 76.55, type: 'card_flip', n: 3 },
  { t: 77.35, type: 'confirm_ding' },
  { t: 80.05, type: 'seal_stamp' },
  { t: 81.20, type: 'map_pin', n: 0 },
  { t: 82.20, type: 'map_pin', n: 1 },
  { t: 83.20, type: 'map_pin', n: 2 },
  { t: 84.20, type: 'map_pin', n: 3 },

  // Verse 2: Horseback, monster battle, +12 coins, level up, 3 chests, blizzard & moonlight
  { t: 87.55, type: 'horse_neigh' },
  { t: 91.50, type: 'gate_open' },
  { t: 93.65, type: 'sword_slash' },
  { t: 94.35, type: 'sword_slash' },
  { t: 94.85, type: 'ko_blink' },
  { t: 95.55, type: 'coin_get' },
  { t: 95.85, type: 'coin_get' },
  { t: 96.15, type: 'coin_get' },
  { t: 99.65, type: 'level_up' },
  { t: 103.35, type: 'chest_open', n: 0 },
  { t: 103.95, type: 'chest_open', n: 1 },
  { t: 104.55, type: 'chest_open', n: 2 },
  { t: 105.35, type: 'blizzard_gust' },
  { t: 107.50, type: 'moon_shimmer' },
  // 109.6 – 110.5s: deliberate quiet organic breath before entering the dark cave (DIRECTOR.md §6)
  { t: 109.85, type: 'hero_breath' },

  // Cave encounter, giant eyes, VS, dragon name & inventory burn
  { t: 110.55, type: 'encounter_swirl' },
  { t: 112.65, type: 'alert_ping' },
  { t: 113.05, type: 'dragon_eyes' },
  { t: 114.70, type: 'sword_unsheathe' },
  { t: 115.05, type: 'vs_clash' },
  { t: 117.65, type: 'scale_glint' },
  { t: 120.35, type: 'alert_ping' },
  { t: 121.65, type: 'fire_rune' },
  { t: 125.45, type: 'item_pop', n: 0 },
  { t: 126.00, type: 'item_pop', n: 1 },
  { t: 126.55, type: 'item_pop', n: 2 },
  { t: 127.10, type: 'item_pop', n: 3 },
  { t: 127.65, type: 'item_pop', n: 4 },
  { t: 128.40, type: 'dragon_flamethrower' },
  { t: 129.75, type: 'stone_slam' },
  { t: 130.50, type: 'stone_slam' },
  { t: 131.25, type: 'stone_slam_big' },
  { t: 132.00, type: 'stone_slam_big' },
];
