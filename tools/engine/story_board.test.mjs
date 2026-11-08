// story_board.test.mjs — 剧本方向文档与引擎能力的对账
//
// 背景：写剧本文案时很容易顺手编一个「看起来很帅」的动作或道具 id，
// 排产时才发现图集不存在、道具没登记。这个测试把「文档里引用的动作/道具
// 必须真实可执行」变成 CI 规则，避免剧本跑在引擎前面。

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { MV_SIGNATURE_ACTIONS, MV_CAST_IDS } from './mv_cast_registry.mjs';
import { PROP_REGISTRY } from './prop_registry.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DIRECTION_DOCS = [
  '00_运营总览/剧本文案方向_2026-11-08.md',
  '00_运营总览/剧本文案方向_v2_分镜稿_2026-11-08.md',
];

// 文档里允许出现的步态/待机图集名（由 walk_rig_builder 运行时生成，不在招牌动作表里）
const LOCOMOTION_ATLAS = /_(walk_side_2leg|walk_2leg|idle_side_pet|idle_pet|seat_side_bench)$/;

function docText(rel) {
  const p = path.join(ROOT, rel);
  assert.ok(fs.existsSync(p), `剧本文案方向文档缺失：${rel}`);
  return fs.readFileSync(p, 'utf8');
}

test('剧本方向文档：引用的每一个「角色_动作」id 都能在注册表里执行', () => {
  const known = new Set(Object.keys(MV_SIGNATURE_ACTIONS));
  const problems = [];
  for (const rel of DIRECTION_DOCS) {
    const ids = docText(rel).match(/\b(whale|doubao|gpt|gemini|claude|kimi|qwen|zai)_[a-z_]+\b/g) || [];
    for (const id of new Set(ids)) {
      if (known.has(id) || LOCOMOTION_ATLAS.test(id)) continue;
      problems.push(`${rel}: ${id}`);
    }
  }
  assert.deepEqual(problems, [], `剧本里引用了引擎不存在的动作：\n${problems.join('\n')}`);
});

test('剧本方向文档：动作归属正确，不能把 A 角色的动作写给 B', () => {
  const byAction = new Map(Object.entries(MV_SIGNATURE_ACTIONS).map(([id, a]) => [id, a.actor]));
  const problems = [];
  for (const rel of DIRECTION_DOCS) {
    for (const id of new Set(docText(rel).match(/\b(whale|doubao|gpt|gemini|claude|kimi|qwen|zai)_[a-z_]+\b/g) || [])) {
      const owner = byAction.get(id);
      if (!owner) continue; // 步态图集另行放行
      const prefix = id.split('_')[0];
      if (prefix !== owner) problems.push(`${rel}: ${id} 属于 ${owner}，不是 ${prefix}`);
    }
  }
  assert.deepEqual(problems, [], problems.join('\n'));
});

test('剧本方向文档：引用的道具都在 prop_registry 里', () => {
  const allProps = Object.keys(PROP_REGISTRY);
  const problems = [];
  for (const rel of DIRECTION_DOCS) {
    const text = docText(rel);
    // 只检查文档真的用反引号点名的道具，避免误伤普通叙述
    const claimed = [...new Set((text.match(/`([a-z]+_(bowl|page|stack|clock|flower|star|memento))`/g) || []))]
      .map((s) => s.replace(/`/g, ''));
    for (const c of claimed) if (!allProps.includes(c)) problems.push(`${rel}: ${c}`);
  }
  assert.deepEqual(problems, [], `剧本里引用了未登记的道具：\n${problems.join('\n')}`);
});

test('剧本方向文档：八位角色都在方向稿里有戏，没有写漏', () => {
  const text = DIRECTION_DOCS.map(docText).join('\n');
  const missing = MV_CAST_IDS.filter((id) => {
    const zh = { whale: '本鲸', doubao: '豆包', gpt: '龙娘', gemini: '猫', claude: '小克', kimi: 'Kimi', qwen: '千问', zai: 'Z.AI' }[id];
    return !(text.includes(id) || (zh && text.includes(zh)));
  });
  assert.deepEqual(missing, [], `这些角色在剧本方向里一次都没出现：${missing.join(', ')}`);
});

test('研究资料存档：两份上游文档齐全且带来源说明', () => {
  const dir = path.join(ROOT, '参考资料/项目调研/Agent-Reach研究');
  for (const f of ['ai-girls-memes-and-remotion.md', 'ai-girls-reference-audit.md', 'README.md']) {
    const p = path.join(dir, f);
    assert.ok(fs.existsSync(p), `缺少存档：${f}`);
    assert.ok(fs.statSync(p).size > 1000, `${f} 内容过小，可能取文失败`);
  }
  const readme = fs.readFileSync(path.join(dir, 'README.md'), 'utf8');
  assert.match(readme, /01a625a/, '来源说明应记录取文时的上游 commit');
  assert.match(readme, /SHA-256/, '来源说明应记录校验值');
});
