#!/usr/bin/env node
// 通用模板 · 新开一部作品
//
//   node 通用模板/cli/new.mjs <mv|day> <目标目录> [标题]
//   npm run new -- day Day/Day15 "两只沙漏"
//   npm run new -- mv 番外MV/某首歌 "某首歌"
//
// 做的事：把 通用模板/样板/<mv|day>/ 整个抄到目标目录（不抄样板自己的成片），改好 film.json 的 id / title / output，
// 然后告诉你接下来改哪几个文件。目标目录已经有东西时拒绝执行，不覆盖任何已有文件。
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TPL = path.resolve(HERE, '..');
const REPO = path.resolve(TPL, '..');
const [kind, target, titleArg] = process.argv.slice(2);
const die = (m) => { console.error(`✗ ${m}`); process.exit(1); };
if (!['mv', 'day'].includes(kind) || !target) die('用法：node 通用模板/cli/new.mjs <mv|day> <目标目录> [标题]');

const dest = path.resolve(target);
const relDest = path.relative(REPO, dest);
if (relDest.startsWith('..')) die('目标目录必须在仓库里');
if (/^(存档|通用模板|node_modules)([\\/]|$)/.test(relDest)) die(`不能建在 ${relDest.split(/[\\/]/)[0]}/ 里：存档只读，通用模板里只放模板本身`);
if (/(^|[\\/])(out|build|dist|target|coverage)([\\/]|$)/.test(relDest)) die('目录名不要用 out / build / dist / target / coverage：部分托管环境的快照会跳过它们');
if (fs.existsSync(dest) && fs.readdirSync(dest).length) die(`${relDest} 已经存在而且不是空的；换一个目录，或先自己清空它`);

const base = path.basename(dest);
const title = titleArg || base;
// Composition id 只能用字母、数字、连字符：目录名里有就用，没有（纯中文名）就用 kind + 名字的短哈希
const ascii = base.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
const id = ascii ? (/^[a-z]/.test(ascii) ? ascii : `${kind}-${ascii}`) : `${kind}-${crypto.createHash('sha1').update(base).digest('hex').slice(0, 6)}`;

const src = path.join(TPL, '样板', kind);
const copy = (from, to) => {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    if (e.name === '成片') continue;
    const a = path.join(from, e.name), b = path.join(to, e.name);
    if (e.isDirectory()) copy(a, b); else fs.copyFileSync(a, b);
  }
};
copy(src, dest);
fs.mkdirSync(path.join(dest, '素材'), { recursive: true });

const filmFile = path.join(dest, 'film.json');
const film = JSON.parse(fs.readFileSync(filmFile, 'utf8'));
film.id = id; film.title = title; film.output = `成片/${title}`;
fs.writeFileSync(filmFile, JSON.stringify(film, null, 2) + '\n');

const p = (f) => path.join(relDest, f);
console.log(`已建好 ${relDest}/（${kind === 'mv' ? '歌词 MV' : '口播片'}，id=${id}，标题「${title}」）\n`);
if (kind === 'day') {
  console.log(`接下来：
  1. 写台词        ${p('台词.txt')}（一行一句；行首可写「角色:」或「角色/头像:」）
  2. 估一份规划轴  npm run film -- plan ${relDest}
  3. 写镜头        ${p('shots/shots.ts')}，排镜在 ${p('project.tsx')} 的 planShots
  4. 看分镜        npm run film -- sheet ${relDest}        （每个镜头一格的总览图）
  5. 出无声样片    npm run film -- full ${relDest}
  ——配音到位之后——
  6. 把配音放进    ${p('素材/')}，并在 ${p('film.json')} 里加：
       "audio": { "file": "素材/配音.wav", "offset": 0, "fadeOut": 0, "bgm": { "chip": 128 } }
  7. 实测对齐      npm run film -- align ${relDest}
  8. 出成片        npm run film -- full ${relDest}`);
} else {
  console.log(`接下来：
  1. 把原曲放进    ${p('素材/')}，并在 ${p('film.json')} 里加：
       "audio": { "file": "素材/原曲.mp3", "offset": 0, "fadeOut": 1.5 }
  2. 换歌词        ${p('歌词.srt')}（带时间的 SRT；LRC 先转成 SRT）
  3. 实测对齐      npm run film -- align ${relDest}        （实测拍点，把每句起点吸附到最近的实拍）
  4. 写镜头        ${p('shots/shots.ts')}，排镜在 ${p('project.tsx')} 的 planShots
  5. 看分镜        npm run film -- sheet ${relDest}
  6. 出成片        npm run film -- full ${relDest}`);
}
console.log(`\n写镜头的规矩和可用的布景 / 道具 / 角色造型：通用模板/README.md`);
