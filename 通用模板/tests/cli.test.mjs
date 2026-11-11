// 命令行的「拦截」逻辑：这些检查都发生在打包和渲染之前，所以不用浏览器就能测。
//   · 台词 / 歌词改了而卡点没重做 → 拦下（否则会悄悄渲出旧台词）
//   · 卡点是估的、或是按另一条音频测的 → 不许出成片
//   · film.json 声明的音源 / 配乐不在、或者解不出音轨 → 在渲染之前就停，并说清楚（旧引擎补丁里音频那一项）
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TPL = path.resolve(HERE, '..');
const FILM = path.join(TPL, 'cli/film.mjs');

/** 把样板复制到临时目录（不带成片），返回 { dir, work, run } */
function sandbox(kind) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'newday-test-'));
  const dir = path.join(root, 'proj'), work = path.join(root, 'work');
  fs.cpSync(path.join(TPL, '样板', kind), dir, { recursive: true, filter: (src) => path.basename(src) !== '成片' });
  const run = (...args) => {
    const r = spawnSync(process.execPath, [FILM, ...args, '--work', work], { encoding: 'utf8' });
    return { code: r.status, text: `${r.stdout}\n${r.stderr}` };
  };
  return { root, dir, work, run, done: () => fs.rmSync(root, { recursive: true, force: true }) };
}
// 用一条很轻的命令（encode）探路：通过了文字检查，它会停在「工作目录里还没渲过东西」这句上
const PASSED = /还没有时间轴缓存/;
const edit = (file, fn) => fs.writeFileSync(file, fn(fs.readFileSync(file, 'utf8')));
const editJson = (file, fn) => edit(file, (s) => { const o = JSON.parse(s); fn(o); return JSON.stringify(o, null, 1) + '\n'; });

test('口播：台词改了、卡点没重做 → 拦下；重跑 plan 之后放行', () => {
  const s = sandbox('day');
  try {
    let r = s.run('encode', s.dir);
    assert.notEqual(r.code, 0);
    assert.match(r.text, PASSED, '原样的样板应该通过台词检查，停在「还没渲过」');

    edit(path.join(s.dir, '台词.txt'), (t) => t.replace(/。\s*$/, '！\n'));
    r = s.run('encode', s.dir);
    assert.notEqual(r.code, 0);
    assert.match(r.text, /台词\.txt 改过了/);
    assert.doesNotMatch(r.text, PASSED, '应该在台词检查这一步就停下');

    r = s.run('plan', s.dir);
    assert.equal(r.code, 0, r.text);
    r = s.run('encode', s.dir);
    assert.match(r.text, PASSED);
    const cues = JSON.parse(fs.readFileSync(path.join(s.dir, 'cues.json'), 'utf8'));
    assert.equal(cues.measured, false);
    assert.match(cues.lines.at(-1).text, /！$/, '重新 plan 之后字幕是新台词');
  } finally { s.done(); }
});

test('MV：歌词改了、卡点没重做 → 拦下；卡点里没记歌词版本 → 也拦下', () => {
  const s = sandbox('mv');
  try {
    assert.match(s.run('encode', s.dir).text, PASSED);
    edit(path.join(s.dir, '歌词.srt'), (t) => t.replace('示例', '样例'));
    let r = s.run('encode', s.dir);
    assert.notEqual(r.code, 0);
    assert.match(r.text, /歌词\.srt 改过了/);

    assert.equal(s.run('plan', s.dir).code, 0);
    editJson(path.join(s.dir, 'cues.json'), (c) => { delete c.source.subtitles_sha256; });
    r = s.run('encode', s.dir);
    assert.notEqual(r.code, 0);
    assert.match(r.text, /没有记录它是按哪一版歌词做的/);
  } finally { s.done(); }
});

test('有音源时：估出来的卡点不许出成片；按另一条音频测的卡点也不许', () => {
  const s = sandbox('day');
  try {
    fs.mkdirSync(path.join(s.dir, '素材'), { recursive: true });
    fs.writeFileSync(path.join(s.dir, '素材/配音.wav'), Buffer.from('RIFF 这不是一条真的音频，只用来算指纹'));
    editJson(path.join(s.dir, 'film.json'), (f) => { f.audio = { file: '素材/配音.wav' }; });

    let r = s.run('full', s.dir);
    assert.notEqual(r.code, 0);
    assert.match(r.text, /measured=false/);
    assert.ok(!fs.existsSync(path.join(s.work, 'frames')), '应该在渲染之前就停下');

    editJson(path.join(s.dir, 'cues.json'), (c) => { c.measured = true; });
    r = s.run('full', s.dir);
    assert.match(r.text, /没有记录它是按哪条音频测的/);

    editJson(path.join(s.dir, 'cues.json'), (c) => { c.source.audio_sha256 = '0'.repeat(64); });
    r = s.run('full', s.dir);
    assert.notEqual(r.code, 0);
    assert.match(r.text, /按另一条音频测的/);
    assert.ok(!fs.existsSync(path.join(s.dir, '成片')), '没有产出任何成片文件');
  } finally { s.done(); }
});

test('没有 cues.json 时：告诉人该先跑哪条命令', () => {
  const s = sandbox('day');
  try {
    fs.rmSync(path.join(s.dir, 'cues.json'));
    const r = s.run('info', s.dir);
    assert.notEqual(r.code, 0);
    assert.match(r.text, /先跑 plan/);
  } finally { s.done(); }
});

test('音源声明了但文件不在：align / mux / full 在动手之前就停，写明文件该放哪、怎么先出无声样片', () => {
  const s = sandbox('day');
  try {
    editJson(path.join(s.dir, 'film.json'), (f) => { f.audio = { file: '素材/配音.wav' }; });
    for (const cmd of ['full', 'mux', 'align']) {
      const r = s.run(cmd, s.dir);
      assert.notEqual(r.code, 0, cmd);
      assert.match(r.text, /film\.json 声明的音源不在：.*素材\/配音\.wav/, cmd);
      assert.match(r.text, /full --allow-missing-audio/, cmd);
      assert.match(r.text, /无声样片/, cmd);
    }
    assert.ok(!fs.existsSync(path.join(s.work, 'frames')), '应该在渲染之前就停下');
    assert.ok(!fs.existsSync(path.join(s.dir, '成片')), '没有产出任何文件');
    // 不需要音轨的命令不受影响：通过前面的检查，停在「还没渲过」
    assert.match(s.run('encode', s.dir).text, PASSED);
    // 放行开关只对 full 有意义：mux 就是混音这一步，没有音源没法混
    const r = s.run('mux', s.dir, '--allow-missing-audio');
    assert.notEqual(r.code, 0);
  } finally { s.done(); }
});

test('配乐文件不在、音源解不出音轨：都在渲染之前就停，不等渲完再崩', () => {
  const s = sandbox('day');
  try {
    const wav = path.join(s.dir, '素材/配音.wav');
    fs.mkdirSync(path.dirname(wav), { recursive: true });
    fs.writeFileSync(wav, Buffer.from('RIFF 这不是一条真的音频，ffmpeg 解不出来'));
    editJson(path.join(s.dir, 'film.json'), (f) => { f.audio = { file: '素材/配音.wav', bgm: { file: '素材/配乐.mp3' } }; });
    // 让卡点「看起来」是按这条音频实测的，好走到音轨这一步
    const sha = crypto.createHash('sha256').update(fs.readFileSync(wav)).digest('hex');
    editJson(path.join(s.dir, 'cues.json'), (c) => { c.measured = true; c.source = { ...c.source, audio_sha256: sha }; });

    let r = s.run('full', s.dir);
    assert.notEqual(r.code, 0);
    assert.match(r.text, /film\.json 声明的配乐文件不在：.*素材\/配乐\.mp3/);
    assert.ok(!fs.existsSync(path.join(s.work, 'frames')), '配乐不在：应该在渲染之前就停下');

    editJson(path.join(s.dir, 'film.json'), (f) => { delete f.audio.bgm; });
    r = s.run('full', s.dir);
    assert.notEqual(r.code, 0);
    assert.match(r.text, /音源 .*素材\/配音\.wav 解不出音轨/);
    assert.ok(!fs.existsSync(path.join(s.work, 'frames')), '音源解不出来：应该在渲染之前就停下');
    assert.ok(!fs.existsSync(path.join(s.work, 'source_48000.wav')) && !fs.existsSync(path.join(s.work, 'source_48000.wav.src')), '解失败之后不留半截文件，也不留缓存标记（下次不会把它当成解好的音轨）');
    assert.ok(!fs.existsSync(path.join(s.dir, '成片')), '没有产出任何文件');
  } finally { s.done(); }
});
