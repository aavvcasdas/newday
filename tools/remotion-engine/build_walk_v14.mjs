// build_walk_v14.mjs — 把 v14 侧身 8 帧行走 / 待机图集烘成仓库内的 PNG 素材
//
// 用法：node tools/remotion-engine/build_walk_v14.mjs [charId...]
// 产物：assets/ai-girls/walk-v14/<atlas>.png（8 格 × 384×416）
//
// 说明：walk_cycle_v14.mjs 只负责「算法生成」，本脚本负责落盘成可审阅的图片素材，
// 渲染链路（render_episode / render_cli / Remotion）直接读这些 PNG，不再每次现算。

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildWalkAtlas, buildIdleAtlas, WALK_CHAR_SPECS, ART_DIR } from './walk_cycle_v14.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '../..');

// 角色 -> 图集名（与 tools/engine/character_motion.mjs 的注册表一致）
const ATLAS_NAMES = {
  whale: { walk: 'whale_walk_side_2leg', idle: 'whale_idle_side_pet' },
  gpt: { walk: 'gpt_walk_2leg', idle: 'gpt_idle_pet' },
  gpt_push: { walk: 'gpt_push_walk_2leg', idle: 'gpt_push_idle_pet' },
  gemini: { walk: 'gemini_walk_2leg', idle: 'gemini_idle_pet' },
  claude: { walk: 'claude_walk_2leg', idle: 'claude_idle_pet' },
  kimi: { walk: 'kimi_walk_2leg', idle: 'kimi_idle_pet' },
  qwen: { walk: 'qwen_walk_2leg', idle: 'qwen_idle_pet' },
  zai: { walk: 'zai_walk_2leg', idle: 'zai_idle_pet' },
  doubao: { walk: 'doubao_walk_side_2leg', idle: 'doubao_idle_side_pet' },
};

const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(ATLAS_NAMES);
fs.mkdirSync(ART_DIR, { recursive: true });

for (const id of ids) {
  const names = ATLAS_NAMES[id];
  if (!names) {
    console.warn('skip (no atlas mapping):', id);
    continue;
  }
  if (!WALK_CHAR_SPECS[id]) {
    console.warn('skip (no source spec):', id);
    continue;
  }
  const walk = await buildWalkAtlas(id);
  fs.writeFileSync(path.join(ART_DIR, `${names.walk}.png`), walk.toBuffer('image/png'));
  const idle = await buildIdleAtlas(id);
  fs.writeFileSync(path.join(ART_DIR, `${names.idle}.png`), idle.toBuffer('image/png'));
  console.log('wrote', names.walk, names.idle);
}
