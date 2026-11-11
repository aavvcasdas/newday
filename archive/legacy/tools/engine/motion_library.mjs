// motion_library.mjs — **通用动作库**：分镜里能直接点名的动作、姿态、宠物状态都集中注册在这里。
//
// 背景：以前每个 Day 各自攒一套动作（`tools/dayN制作/`），同一只鲸鱼娘在 Day3 / Day9 / MV 里
// 各有一份骨架与动作表，改一次要改好几处。现在统一收口：
//
//   · 走位（locomotion）：8 帧双骨骼连续蒙皮步态 `*_2leg` + 100% 同体待机 `*_pet`
//   · 骨骼动作（rig）：`RIG_ACTIONS`（自然走 / 悠闲散步 / 受惊退半步 / 落座轻晃 …）
//   · 旧版动作（legacy）：`LEGACY_ACTIONS`（Day3 早期 28 条动作，保留兼容）
//   · 宠物状态（pet）：`assets/ai-girls/pet-v7/*.json` 里登记的逐行状态（含鲸娘 8 格干饭动作）
//
// 分镜只要写 `locomotion: 'side_walk'` 或 `action: 'walk_natural'` 就能用到，
// 具体素材路径由这里解析，`validateMotionLibrary()` 负责在 CI 里确认素材真的在库里。
//
// 用法：
//   import { resolveMotion, describeMotions, validateMotionLibrary } from './motion_library.mjs';
//   resolveMotion('whale', 'side_walk') // → { atlas: 'whale_walk_side_2leg', path: '…', frames: 8 }

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { WALK_RIG_BUILDERS, WALK_FRAMES } from '../remotion-engine/walk_rig_builder.mjs';
import { RIG_ACTIONS } from './whale_rig/whale_rig_actions.mjs';
import { LEGACY_ACTIONS } from './whale_rig/legacy_actions.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(HERE, '../..');
export const WALK_ATLAS_DIR = path.join(REPO_ROOT, 'assets/ai-girls/walk-v14');
export const PET_ATLAS_DIR = path.join(REPO_ROOT, 'assets/ai-girls/pet-v7');

export const FRAME_MS = 120; // 8 帧 × 120ms = 0.96s 双步周期，和上游 pets 的 running-right 对齐

/** 每个角色可用的走位/待机图集。variants 是同一具身体的情绪变体。 */
export const CHARACTER_MOTIONS = Object.freeze({
  whale: {
    label: '鲸鱼娘',
    walk: 'whale_walk_side_2leg',
    idle: 'whale_idle_side_pet',
    variants: {
      happy: { walk: 'whale_walk_happy_2leg', idle: 'whale_idle_happy_pet' },
      sad: { walk: 'whale_walk_sad_2leg', idle: 'whale_idle_sad_pet' },
    },
  },
  gpt: { label: '龙女 GPT', walk: 'gpt_walk_2leg', idle: 'gpt_idle_pet' },
  gpt_push: {
    label: '龙女 GPT（推山）',
    walk: 'gpt_push_walk_2leg',
    idle: 'gpt_push_idle_pet',
    note: '压低重心双手前推，步幅系数 0.8',
  },
  gemini: { label: 'Gemini', walk: 'gemini_walk_2leg', idle: 'gemini_idle_pet' },
  claude: { label: 'Claude', walk: 'claude_walk_2leg', idle: 'claude_idle_pet' },
  kimi: { label: 'Kimi', walk: 'kimi_walk_2leg', idle: 'kimi_idle_pet' },
  qwen: { label: 'Qwen', walk: 'qwen_walk_2leg', idle: 'qwen_idle_pet' },
  zai: { label: 'Z.AI', walk: 'zai_walk_2leg', idle: 'zai_idle_pet' },
  doubao: { label: '豆包', walk: 'doubao_walk_side_2leg', idle: 'doubao_idle_side_pet' },
});

/** 分镜里可以写进 `locomotion` 的词 → 用哪一个动作。 */
export const LOCOMOTION_ALIASES = Object.freeze({
  side_walk: { kind: 'walk', variant: null },
  walk: { kind: 'walk', variant: null },
  happy_walk: { kind: 'walk', variant: 'happy' },
  sad_walk: { kind: 'walk', variant: 'sad' },
  push_walk: { kind: 'walk', variant: null, char: 'gpt_push' },
  idle: { kind: 'idle', variant: null },
  happy_idle: { kind: 'idle', variant: 'happy' },
  sad_idle: { kind: 'idle', variant: 'sad' },
});

/** 10 骨骼网格主角（只有鲸鱼娘有这套高清 rig）。 */
export const RIG_CHARACTERS = Object.freeze(['whale']);
export const RIG_MOTION_NAMES = Object.freeze(Object.keys(RIG_ACTIONS));
export const LEGACY_MOTION_NAMES = Object.freeze(Object.keys(LEGACY_ACTIONS));

export function atlasPath(name) {
  const p = path.join(WALK_ATLAS_DIR, `${name}.png`);
  return fs.existsSync(p) ? p : null;
}

export function petAtlasPath(name) {
  const p = path.join(PET_ATLAS_DIR, `${name}.png`);
  return fs.existsSync(p) ? p : null;
}

/** pet-v7 图集里的逐行状态（待机 / 思考 / 干饭 …），鲸娘与龙娘各一份。 */
export function petStates(name = 'whale') {
  const jsonPath = path.join(PET_ATLAS_DIR, `${name}.json`);
  if (!fs.existsSync(jsonPath)) return null;
  const meta = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const states = {};
  for (const [key, st] of Object.entries(meta.states || {})) {
    states[key] = {
      row: st.row,
      frames: st.frames,
      durationsMs: st.durations_ms || st.durationsMs || null,
      cell: { w: meta.cell_width, h: meta.cell_height },
    };
  }
  return { atlas: `${name}_pet`, path: petAtlasPath(name), states };
}

/**
 * 把「角色 + 动作名」解析成真实素材。
 * action 可以是 locomotion 别名（side_walk/idle/…）、图集名、rig 动作名或 pet 状态名。
 */
export function resolveMotion(char, action) {
  const entry = CHARACTER_MOTIONS[char];
  if (!entry) throw new Error(`未知角色：${char}（可用：${Object.keys(CHARACTER_MOTIONS).join(', ')}）`);

  const alias = LOCOMOTION_ALIASES[action];
  if (alias) {
    const charset = alias.char || char;
    const base = CHARACTER_MOTIONS[charset] || entry;
    const variant = alias.variant ? base.variants?.[alias.variant] : null;
    const atlasName = variant
      ? variant[alias.kind]
      : alias.kind === 'walk' ? base.walk : base.idle;
    return {
      char, action, kind: alias.kind, atlas: atlasName,
      path: atlasPath(atlasName), frames: WALK_FRAMES, frameMs: FRAME_MS,
    };
  }

  if (WALK_RIG_BUILDERS[action]) {
    return { char, action, kind: action.endsWith('_pet') ? 'idle' : 'walk',
      atlas: action, path: atlasPath(action), frames: WALK_FRAMES, frameMs: FRAME_MS };
  }

  if (RIG_ACTIONS[action] && RIG_CHARACTERS.includes(char)) {
    return { char, action, kind: 'rig', atlas: null, path: null,
      label: RIG_ACTIONS[action].label, dur: RIG_ACTIONS[action].dur };
  }

  if (LEGACY_ACTIONS[action] && RIG_CHARACTERS.includes(char)) {
    return { char, action, kind: 'legacy', atlas: null, path: null, label: LEGACY_ACTIONS[action].label ?? action };
  }

  const pet = petStates(char === 'gpt' ? 'dragon' : char);
  if (pet?.states?.[action]) {
    return { char, action, kind: 'pet', atlas: pet.atlas, path: pet.path, ...pet.states[action] };
  }

  throw new Error(`${char} 没有动作 ${action}（先看 describeMotions() 的输出）`);
}

/** 给文档/CLI 用的一览：每个角色一套走位 + 待机，加上骨骼动作与宠物状态。 */
export function describeMotions() {
  const rows = [];
  for (const [char, entry] of Object.entries(CHARACTER_MOTIONS)) {
    rows.push({ char, label: entry.label, action: 'walk', atlas: entry.walk, path: atlasPath(entry.walk) });
    rows.push({ char, label: entry.label, action: 'idle', atlas: entry.idle, path: atlasPath(entry.idle) });
    for (const [variant, pair] of Object.entries(entry.variants || {})) {
      rows.push({ char, label: entry.label, action: `${variant}_walk`, atlas: pair.walk, path: atlasPath(pair.walk) });
      rows.push({ char, label: entry.label, action: `${variant}_idle`, atlas: pair.idle, path: atlasPath(pair.idle) });
    }
  }
  for (const name of RIG_MOTION_NAMES) {
    rows.push({ char: 'whale', label: '鲸鱼娘', action: name, kind: 'rig' });
  }
  for (const name of LEGACY_MOTION_NAMES) {
    rows.push({ char: 'whale', label: '鲸鱼娘', action: name, kind: 'legacy' });
  }
  for (const atlas of ['whale', 'dragon']) {
    const pet = petStates(atlas);
    if (!pet) continue;
    for (const [state, info] of Object.entries(pet.states)) {
      rows.push({ char: atlas === 'dragon' ? 'gpt' : atlas, label: atlas === 'dragon' ? '龙女 GPT' : '鲸鱼娘',
        action: state, kind: 'pet', atlas: pet.atlas, path: pet.path, frames: info.frames });
    }
  }
  return rows;
}

/** CI 用：确认所有注册的动作都有素材。返回 { ok, missing[] }。 */
export function validateMotionLibrary() {
  const missing = [];
  for (const row of describeMotions()) {
    if (row.kind === 'rig' || row.kind === 'legacy') continue;
    if (!row.path) missing.push({ char: row.char, action: row.action, atlas: row.atlas });
  }
  return { ok: missing.length === 0, missing, total: describeMotions().length };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const rows = describeMotions();
  for (const row of rows) {
    console.log([row.char.padEnd(9), row.action.padEnd(18), (row.atlas || '-').padEnd(28),
      row.path ? 'ok' : (row.kind ? row.kind : 'MISSING')].join(' '));
  }
  const { ok, missing } = validateMotionLibrary();
  console.log(ok ? `共 ${rows.length} 条动作，素材齐全` : `缺素材：${JSON.stringify(missing)}`);
  process.exit(ok ? 0 : 1);
}
