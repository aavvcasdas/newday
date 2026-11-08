// tools/engine/day14_plan.test.mjs — Day14 的剧本、分镜、检查脚本三者对账
//
// 背景：Day14 是在没有音源的情况下写的，最容易出的错是「文档说一套、脚本跑另一套」。
// 这条测试把三件事钉住：
//   1. 口播稿存在，且分镜页引用的角色动作 id 都能在引擎注册表里执行；
//   2. C04 的伞/头顶构图参数在 contact_check.mjs 与 day14-contact.jsx 里必须完全相同；
//   3. 规划时间轴必须是 measured=false，不许冒充实测轴。

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { MV_SIGNATURE_ACTIONS } from './mv_cast_registry.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const SCRIPT = 'Day14/Day14配音台词.txt';
const BOARD = 'Day14/Day14分镜_制作版.md';
const DIRECTION = 'Day14/Day14方向.md';
const CHECK = 'tools/day14制作/contact_check.mjs';
const JSX = 'tools/mv_dayu/remotion/day14-contact.jsx';

test('Day14：口播稿、方向稿、分镜稿都在，且分镜引用的动作都真实存在', () => {
  for (const rel of [SCRIPT, BOARD, DIRECTION]) {
    assert.ok(fs.existsSync(path.join(ROOT, rel)), `缺少 ${rel}`);
  }
  const known = new Set(Object.keys(MV_SIGNATURE_ACTIONS));
  const board = read(BOARD);
  const cited = new Set(board.match(/\b(whale|doubao|gpt|gemini|claude|kimi|qwen|zai)_[a-z_]+\b/g) || []);
  // 例外只给「素材文件名」：写成 `gemini_kite_action.png` 这种带后缀的形式时，
  // 它指的是 v13 图集或 Day12 立绘文件，不是引擎动作 id。
  // 必须同时满足「出现在 .png 文件名里」，避免这个例外悄悄扩大成万能放行。
  const asFile = (id) => new RegExp(`${id}\\.png`).test(board);
  const missing = [...cited].filter((id) => !known.has(id) && !asFile(id));
  assert.deepEqual(missing, [], `分镜引用了引擎没有的动作：${missing.join(', ')}`);
});

test('Day14：C04 构图参数在检查脚本与渲染组件里必须一致', () => {
  // 两边都写成一行常量，用同一组正则取数，任何一边改了都该失败。
  const pick = (src, key) => {
    const m = src.match(new RegExp(`${key}\\s*[:=]\\s*(-?\\d+(?:\\.\\d+)?)`));
    assert.ok(m, `在文件里找不到 ${key}`);
    return Number(m[1]);
  };
  const checkSrc = read(CHECK);
  const jsxSrc = read(JSX);
  const pairs = [
    ['whale.x', 'whale: { x', 'const WHALE = { x'],
  ];
  // whale/doubao 的 x、umbrella 的 cx/rimY/halfWidth/tiltDeg 都要对齐。
  for (const key of ['cx', 'rimY', 'halfWidth', 'tiltDeg']) {
    assert.equal(pick(checkSrc, key), pick(jsxSrc, key), `umbrella.${key} 在检查脚本和渲染组件里不一致`);
  }
  const whaleX = checkSrc.match(/whale: \{ x: (-?\d+)/);
  const whaleX2 = jsxSrc.match(/WHALE = \{ x: (-?\d+)/);
  assert.ok(whaleX && whaleX2, '取不到鲸娘 x 坐标');
  assert.equal(whaleX[1], whaleX2[1], 'whale.x 在检查脚本和渲染组件里不一致');
  const doubaoX = checkSrc.match(/doubao: \{ x: (-?\d+)/);
  const doubaoX2 = jsxSrc.match(/DOUBAO = \{ x: (-?\d+)/);
  assert.ok(doubaoX && doubaoX2, '取不到豆包 x 坐标');
  assert.equal(doubaoX[1], doubaoX2[1], 'doubao.x 在检查脚本和渲染组件里不一致');
  assert.ok(pairs.length);
});

test('Day14：规划时间轴必须是未实测，不许被当成对齐结果', () => {
  const out = execFileSync('node', ['tools/day14制作/timeline.mjs'], { cwd: ROOT, encoding: 'utf8' });
  assert.match(out, /measured=false/);
  const plan = JSON.parse(read('tools/day14制作/planning.json'));
  assert.equal(plan.measured, false, '没有音源时 measured 必须是 false');
  assert.match(plan.method, /规划/, 'method 里必须写明是规划');
  const subs = JSON.parse(read('tools/day14制作/subtitle_timing.planning.json'));
  assert.equal(subs.measured, false);
  assert.ok(subs.screens.length > 0);
  // 每一屏的结束时间都要晚于开始时间，且整体单调不回退。
  let last = -1;
  for (const s of subs.screens) {
    assert.ok(s.end > s.start, `屏时间异常：${JSON.stringify(s)}`);
    assert.ok(s.start >= last - 1e-6, `屏时间回退：${JSON.stringify(s)}`);
    last = s.start;
  }
});

test('Day14：口播零阿拉伯数字，且不出现进度条/账本类禁词', () => {
  const lines = read(SCRIPT).split('\n').filter((l) => l.trim());
  const withDigits = lines.filter((l) => /\d/.test(l));
  assert.deepEqual(withDigits, [], `口播里出现了阿拉伯数字：\n${withDigits.join('\n')}`);
  for (const bad of ['进度条', '余额条', '粉丝数', '播放量']) {
    assert.ok(!lines.some((l) => l.includes(bad)), `口播里出现了画面禁词：${bad}`);
  }
});
