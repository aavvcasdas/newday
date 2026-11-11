// 文档里写的命令和路径必须真的存在。
//
// 对应旧 Remotion 引擎补丁（remotion-engine-fix.patch）里 README 那一项：文件挪了位置，README 里的命令还指着旧路径，
// 照着敲就是「找不到文件」。那次是手改了三行；这里改成测试——现行文档里出现的
//   · npm 脚本名、film.mjs 的子命令、命令行选项、输出标记（QA_OK 之类）、环境变量
//   · 仓库里的路径
// 只要有一个在代码或磁盘上对不上，测试就红。以后再挪文件、改命令，文档跟不上会当场发现。
//
// 现行文档逐条查。重构前写的运营文档（00_运营总览/、参考资料/）是当时的记录，正文不改——
// 它们里面的旧路径现在都搬进了存档，所以要求每一份开头都有一段「重构后补注」，写明旧路径现在在哪、哪些已经废除。
// 存档（存档/重构前/）里的文档不查：那里的路径本来就是相对旧仓库根写的。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (rel) => fs.readFileSync(path.join(REPO, rel), 'utf8');
const exists = (...p) => fs.existsSync(path.join(REPO, ...p));

/** 现行文档：根目录、模板、每条产线和每部作品的说明、给 AI 助手的 skill、存档的总说明 */
function currentDocs() {
  const docs = ['README.md', 'AGENTS.md', '通用模板/README.md', '存档/README.md', 'Day/README.md'];
  for (const base of ['Day', '番外MV', '通用模板/样板']) {
    for (const name of fs.readdirSync(path.join(REPO, base))) if (exists(base, name, 'README.md')) docs.push(`${base}/${name}/README.md`);
  }
  const skills = '.claude/skills';
  for (const name of fs.readdirSync(path.join(REPO, skills))) if (exists(skills, name, 'SKILL.md')) docs.push(`${skills}/${name}/SKILL.md`);
  return docs.filter((d) => exists(d));
}
const DOCS = currentDocs();

const CLI_DIR = '通用模板/cli';
const FILM = read(`${CLI_DIR}/film.mjs`);
// 所有命令行的源码：选项、输出标记、环境变量都得在这里面找得到
const CLI_SRC = [...fs.readdirSync(path.join(REPO, CLI_DIR)).filter((f) => /\.(mjs|py)$/.test(f)).map((f) => read(`${CLI_DIR}/${f}`)), read('通用模板/cast/bake_atlas.mjs')].join('\n');
const SCRIPTS = Object.keys(JSON.parse(read('package.json')).scripts);
const MODES = /<((?:[a-z]+\|)+[a-z]+)>/.exec(FILM)[1].split('|');
const TOP = new Set(fs.readdirSync(REPO));
// 不是本仓库命令行的选项（npm / pip / git / node / tsc / gh 自己的）
const FOREIGN_FLAGS = new Set(['--user', '--break-system-packages', '--depth', '--hard', '--no-save', '--experimental-transform-types', '--test', '--config', '--noEmit', '--ff-only']);

/** 行内代码 `…` 和代码块里的每一行 */
function codeSpans(text) {
  const blocks = [...text.matchAll(/```[a-z]*\n([\s\S]*?)```/g)].flatMap((m) => m[1].split('\n'));
  const inline = [...text.replace(/```[\s\S]*?```/g, '').matchAll(/`([^`\n]+)`/g)].map((m) => m[1]);
  return { inline, all: [...inline, ...blocks] };
}

test('现行文档找得全：根目录、模板、Day 线、每部作品、skill、存档说明', () => {
  for (const d of ['README.md', 'AGENTS.md', '通用模板/README.md', 'Day/README.md', 'Day/Day14/README.md', '番外MV/童话镇/README.md', '.claude/skills/film-template/SKILL.md', '存档/README.md']) {
    assert.ok(DOCS.includes(d), `应该查到 ${d}`);
  }
  assert.ok(MODES.includes('full') && MODES.includes('strip') && MODES.length >= 12, `film.mjs 的子命令表读出来是 ${MODES}`);
});

test('文档里的命令都敲得出来：npm 脚本、film 的子命令、new 的类型', () => {
  const bad = [];
  for (const d of DOCS) {
    const text = read(d);
    for (const m of text.matchAll(/npm run ([a-z][a-z:-]*)/g)) if (!SCRIPTS.includes(m[1])) bad.push(`${d}：npm run ${m[1]}（package.json 里没有这个脚本）`);
    for (const m of text.matchAll(/(?:npm run film --|film\.mjs)[ \t]+([a-z]+)\b/g)) if (!MODES.includes(m[1])) bad.push(`${d}：film ${m[1]}（没有这个子命令）`);
    for (const m of text.matchAll(/npm run new --[ \t]+([^\s`]+)/g)) if (!['mv', 'day', '<mv|day>'].includes(m[1])) bad.push(`${d}：npm run new -- ${m[1]}（类型只有 mv / day）`);
  }
  assert.deepEqual(bad, []);
});

test('文档里提到的命令行选项、输出标记、环境变量，命令行源码里都有', () => {
  const bad = [];
  for (const d of DOCS) {
    if (d.startsWith('存档/')) continue; // 存档说明讲的是旧项目，里面的大写文件名（SOURCE_IMPORT.md 之类）不是命令行的东西
    for (const span of codeSpans(read(d)).all) {
      for (const m of span.matchAll(/(?<![\w-])(--[a-z][a-z-]+)/g)) if (!CLI_SRC.includes(m[1]) && !FOREIGN_FLAGS.has(m[1])) bad.push(`${d}：选项 ${m[1]}`);
      for (const m of span.matchAll(/\b([A-Z][A-Z0-9]*_[A-Z0-9_]+)\b/g)) if (!CLI_SRC.includes(m[1])) bad.push(`${d}：${m[1]}`);
    }
  }
  assert.deepEqual([...new Set(bad)], []);
});

test('文档里写的路径都在：从仓库根写起的、相对文档所在目录的；存档说明里的路径在 存档/重构前/ 下', () => {
  const bad = [];
  let checked = 0;
  for (const d of DOCS) {
    const base = path.dirname(d), inArchiveDoc = d === '存档/README.md';
    for (const raw of codeSpans(read(d)).inline) {
      const tok = raw.trim();
      // 带占位符、通配符、省略号的不是具体路径；Day15 / 某首歌 是「新开一部作品」的示例名
      if (/[<>*…{}$|=\s]|NN|DayN|Day1[5-9]|某首歌|\/X\//.test(tok)) continue;
      const p = tok.replace(/\/$/, ''), first = p.split('/')[0];
      if (!p.includes('/') && !TOP.has(first)) continue; // 单独一个文件名（cues.json、台词.txt）是泛指，不查
      if (inArchiveDoc && exists('存档/重构前', first)) { checked++; if (!exists('存档/重构前', p) && !exists(p)) bad.push(`${d}：${tok}（存档/重构前/ 下没有）`); continue; }
      if (TOP.has(first)) { checked++; if (!exists(p)) bad.push(`${d}：${tok}`); continue; }
      if (exists(base, first)) { checked++; if (!exists(base, p)) bad.push(`${d}：${tok}（相对 ${base || '.'}/）`); }
    }
  }
  assert.deepEqual([...new Set(bad)], []);
  assert.ok(checked > 80, `应该查到不少路径，实际只查了 ${checked} 处——多半是提取规则坏了`);
});

test('文档里的站内链接 [文字](路径) 都点得开', () => {
  const bad = [];
  let checked = 0;
  for (const d of DOCS) {
    for (const m of read(d).matchAll(/\]\(([^)\s]+)\)/g)) {
      const target = decodeURIComponent(m[1].split('#')[0]);
      if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target)) continue; // 页内锚点、http(s)、mailto
      checked++;
      if (!exists(path.dirname(d), target)) bad.push(`${d}：(${m[1]})`);
    }
  }
  assert.deepEqual(bad, []);
  assert.ok(checked >= 3, `应该至少查到 3 个站内链接，实际 ${checked}`);
});

// 旧仓库结构里的路径：tools/…、assets/…、video-fx/…、Day/DayN/…、番外MV/…、旧 skill 目录、agent.md
const OLD_PATH = /(?<![\w/.-])((?:tools|assets|video-fx|Day\/Day\d+|Day\d+|番外MV|00_运营总览\/skills|00_运营总览\/鲸鱼娘人设skill|\.claude\/skills)\/[^\s`，。；、）)\]|"'<>]*|agent\.md)/g;
const NOTE = '重构后补注';

/** 重构前写的文档：00_运营总览/、参考资料/ 下所有 .md */
function historicalDocs() {
  const out = [];
  const walk = (rel) => {
    for (const e of fs.readdirSync(path.join(REPO, rel), { withFileTypes: true })) {
      if (e.isDirectory()) walk(`${rel}/${e.name}`);
      else if (e.name.endsWith('.md')) out.push(`${rel}/${e.name}`);
    }
  };
  for (const base of ['00_运营总览', '参考资料']) if (exists(base)) walk(base);
  return out;
}

/** 把一份文档拆成「补注」和「正文」：补注是开头 12 行之内、从带「重构后补注」的那行起连续的引用行 */
function splitNote(doc) {
  const lines = read(doc).split('\n');
  const a = lines.slice(0, 12).findIndex((l) => l.startsWith('>') && l.includes(NOTE));
  if (a < 0) return { note: '', body: lines.join('\n') };
  let b = a;
  while (b < lines.length && lines[b].startsWith('>')) b++;
  return { note: lines.slice(a, b).join('\n'), body: [...lines.slice(0, a), ...lines.slice(b)].join('\n') };
}

/** 正文里指向旧结构、现在在原位置已经找不到的路径（补注自己举的例子不算） */
function deadOldPaths(doc) {
  const hits = [...splitNote(doc).body.matchAll(OLD_PATH)].map((m) => m[1].replace(/[/.:,]+$/, ''));
  return [...new Set(hits)].filter((h) => !exists(h) && !exists(path.dirname(doc), h));
}

test('重构前写的文档（00_运营总览/、参考资料/）：提到旧路径的，开头都有「重构后补注」；补注里指的地方都在', () => {
  const docs = historicalDocs();
  assert.ok(docs.length >= 20, `应该找到二十多份，实际 ${docs.length}`);
  const missing = [], brokenNote = [];
  let withOld = 0, inArchive = 0;
  for (const d of docs) {
    const dead = deadOldPaths(d);
    const { note } = splitNote(d);
    if (dead.length) {
      withOld++; inArchive += dead.filter((h) => exists('存档/重构前', h)).length;
      if (!note) missing.push(`${d}（如 ${dead.slice(0, 2).join('、')}）`);
    }
    // 补注里写的具体路径（不带占位符的）必须真的在
    for (const m of note.matchAll(/`([^`\n]+)`/g)) {
      const tok = m[1];
      if (/[<>…]|DayN|dayN|^agent\.md$/.test(tok)) continue;
      if (!exists(tok)) brokenNote.push(`${d}：补注里的 ${tok}`);
    }
  }
  assert.deepEqual(missing, [], '这些文档提到了已经搬走的旧路径，但开头没有补注');
  assert.deepEqual(brokenNote, []);
  assert.ok(withOld >= 15 && inArchive >= 40, `提到旧路径的文档 ${withOld} 份、其中在存档里能找到的路径 ${inArchive} 处——数目不对，多半是提取规则坏了`);
});

test('这个测试自己查得出问题：编一份带错的文档，四类错都要被抓到', () => {
  // 用和上面同样的规则查一段文字（不落盘）
  const text = '跑 `npm run filmm -- info x`、`npm run film -- render 番外MV/童话镇`，加 `--allow-everything`；看 `通用模板/engine/nope.ts` 和 `QA_PERFECT`。';
  const { all, inline } = codeSpans(text);
  assert.deepEqual([...text.matchAll(/npm run ([a-z][a-z:-]*)/g)].map((m) => m[1]).filter((s) => !SCRIPTS.includes(s)), ['filmm']);
  assert.deepEqual([...text.matchAll(/(?:npm run film --|film\.mjs)[ \t]+([a-z]+)\b/g)].map((m) => m[1]).filter((s) => !MODES.includes(s)), ['render']);
  assert.deepEqual(all.flatMap((s) => [...s.matchAll(/(?<![\w-])(--[a-z][a-z-]+)/g)].map((m) => m[1])).filter((f) => !CLI_SRC.includes(f)), ['--allow-everything']);
  assert.deepEqual(all.flatMap((s) => [...s.matchAll(/\b([A-Z][A-Z0-9]*_[A-Z0-9_]+)\b/g)].map((m) => m[1])).filter((f) => !CLI_SRC.includes(f)), ['QA_PERFECT']);
  assert.deepEqual(inline.filter((t) => t.includes('/') && !/\s/.test(t) && !exists(t)), ['通用模板/engine/nope.ts']);
});
