// 文字链路的回归测试：不允许「渲染成功，但字是豆腐块 / 换台机器就换一种字形」。
//
// 对应旧 Remotion 引擎补丁（remotion-engine-fix.patch）里字体那一项。那边的病是仓库里根本没有中文字体、
// 加载失败还被吞掉；新模板字体随仓库走，剩下的口子是「个别的字字体里没有」，所以查到字这一级：
//   · fontCoverage：直接读字体文件的 cmap 表，得到它到底有哪些字（与 fontTools 对过，逐个码点一致）
//   · glyphProblems / textPreflight：字幕、名牌、字卡、镜头画在 Canvas 上的字，逐字核对，并写明出处
//   · castPreflight 顺带记下镜头往 Canvas 上画了什么字、用的什么字体
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import './tpl-loader.mjs';

const THREE = await import('three');
const { fontCoverage, missingGlyphs, glyphProblems, distinctGlyphs } = await import('../engine/glyphs.ts');
const { cssUrl, FONT, FONT_FAMILY, FONT_FILE } = await import('../engine/fonts.ts');
const { projectTexts } = await import('../engine/project.ts');
const { textPreflight } = await import('../engine/text.ts');
const { castPreflight } = await import('../engine/engine.ts');
const { ATLAS_META } = await import('../engine/actors.ts');
const { cam } = await import('../engine/core.ts');
const { planByCues } = await import('../engine/timeline.ts');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../..');
const TTF = path.join(HERE, '../engine/assets/fonts', FONT_FILE);
const ZCOOL = fontCoverage(fs.readFileSync(TTF));
const cp = (ch) => ch.codePointAt(0);

// —— 手搓最小字体：只有文件头 + 一张 cmap 表，用来测解析器（不依赖任何真实字体）——
const u16 = (...v) => { const b = Buffer.alloc(v.length * 2); v.forEach((x, i) => b.writeUInt16BE(x & 0xffff, i * 2)); return b; };
const u32 = (...v) => { const b = Buffer.alloc(v.length * 4); v.forEach((x, i) => b.writeUInt32BE(x >>> 0, i * 4)); return b; };
/** 格式 4 子表。segs: [起, 止, delta, 字形号数组（给了就走 idRangeOffset 那条路，0 = 这个码点没有字形）] */
function format4(segs) {
  const all = [...segs, [0xffff, 0xffff, 1, null]], n = all.length;
  const glyphArrays = []; let extra = 0;
  const ranges = all.map(([, , , ids], i) => { if (!ids) return 0; const off = (n - i) * 2 + extra * 2; glyphArrays.push(...ids); extra += ids.length; return off; });
  const body = Buffer.concat([u16(...all.map((s) => s[1])), u16(0), u16(...all.map((s) => s[0])), u16(...all.map((s) => s[2])), u16(...ranges), u16(...glyphArrays)]);
  return Buffer.concat([u16(4, 14 + body.length, 0, n * 2, 0, 0, 0), body]);
}
/** 格式 12 子表。groups: [起, 止, 起始字形号] */
const format12 = (groups) => Buffer.concat([u16(12, 0), u32(16 + groups.length * 12, 0, groups.length), ...groups.map((g) => u32(...g))]);
/** tables: [[platform, encoding, 子表字节]]；magic 默认 TrueType */
function sfnt(tables, { magic = 0x00010000, tag = 'cmap' } = {}) {
  const head = u16(0, tables.length);
  let off = 4 + tables.length * 8;
  const recs = tables.map(([p, e, sub]) => { const r = Buffer.concat([u16(p, e), u32(off)]); off += sub.length; return r; });
  const cmap = Buffer.concat([head, ...recs, ...tables.map((t) => t[2])]);
  return Buffer.concat([u32(magic), u16(1, 0, 0, 0), Buffer.from(tag, 'latin1'), u32(0, 28, cmap.length), cmap]);
}

test('模板字体：读出来的字数与 fontTools 一致（7053），GB2312 的 6763 个汉字一个不缺；生僻字和常见符号确实没有', () => {
  assert.equal(ZCOOL.count, 7053);
  const gb = new TextDecoder('gb2312');
  let n = 0; const gone = [];
  for (let hi = 0xb0; hi <= 0xf7; hi++) for (let lo = 0xa1; lo <= 0xfe; lo++) {
    if (hi === 0xd7 && lo >= 0xfa) continue; // GB2312 一级字库末尾空着的五个位置
    const ch = gb.decode(new Uint8Array([hi, lo]));
    n++; if (!ZCOOL.has(cp(ch))) gone.push(ch);
  }
  assert.equal(n, 6763);
  assert.deepEqual(gone, []);
  for (const ch of '童话镇睿智鲸鱼娘，。！？：；、…—·「」『』《》“”（）ABCxyz0123456789％¥') assert.ok(ZCOOL.has(cp(ch)), `应该有「${ch}」`);
  for (const ch of '囧喆堃→←↑↓★☆♪♥①②✓あア가😀') assert.ok(!ZCOOL.has(cp(ch)), `不应该有「${ch}」`);
});

test('cmap 解析：格式 4（delta 与 idRangeOffset 两条路）、格式 12（含基本平面之外的码点）；两张都有时用格式 12', () => {
  // 格式 4：A–C 用 delta；0x4E00–0x4E03 走字形号数组，其中第 3 个是 0（这个码点没有字形）
  const f4 = fontCoverage(sfnt([[3, 1, format4([[0x41, 0x43, 0x10000 - 0x40, null], [0x4e00, 0x4e03, 0, [5, 6, 0, 8]]])]]));
  assert.deepEqual(['A', 'B', 'C', 'D', '一', '丁', '丂', '七'].map((ch) => f4.has(cp(ch))), [true, true, true, false, true, true, false, true]);
  assert.equal(f4.count, 6);
  // delta 正好把码点映射到 0 号字形（.notdef）= 没有
  const f4zero = fontCoverage(sfnt([[3, 1, format4([[0x41, 0x42, 0x10000 - 0x41, null]])]]));
  assert.deepEqual([f4zero.has(0x41), f4zero.has(0x42)], [false, true]);
  // 格式 12：一段汉字 + 一段表情（码点超过 0xFFFF）
  const f12 = fontCoverage(sfnt([[3, 10, format12([[0x4e00, 0x4e01, 3], [0x1f600, 0x1f602, 10]])]]));
  assert.deepEqual([0x4e00, 0x4e01, 0x4e02, 0x1f600, 0x1f602, 0x1f603].map((c) => f12.has(c)), [true, true, false, true, true, false]);
  assert.equal(f12.count, 5);
  // 格式 12 的区间从 0 号字形（.notdef）起：第一个码点等于没有，后面的照常
  const f12zero = fontCoverage(sfnt([[3, 10, format12([[0x41, 0x43, 0]])]]));
  assert.deepEqual([0x41, 0x42, 0x43].map((c) => f12zero.has(c)), [false, true, true]);
  // 两张子表都在：格式 12 说了算（它能表示全部码点）
  const both = fontCoverage(sfnt([[3, 1, format4([[0x41, 0x41, 0x10000 - 0x40, null]])], [3, 10, format12([[0x41, 0x42, 1], [0x1f600, 0x1f600, 9]])]]));
  assert.deepEqual([both.has(0x41), both.has(0x42), both.has(0x1f600)], [true, true, true]);
});

test('不是字体的文件一律报错，不当成「什么字都有」：太短、Git LFS 指针、WOFF、没有 cmap 表、cmap 里没有 Unicode 子表', () => {
  assert.throws(() => fontCoverage(new Uint8Array(4)), /太短/);
  assert.throws(() => fontCoverage(Buffer.from('version https://git-lfs.github.com/spec/v1\noid sha256:abc\nsize 1514968\n')), /不是 \.ttf \/ \.otf 字体/);
  assert.throws(() => fontCoverage(Buffer.concat([Buffer.from('wOFF'), Buffer.alloc(64)])), /WOFF 压缩字体/);
  assert.throws(() => fontCoverage(sfnt([[3, 1, format4([[0x41, 0x41, 1, null]])]], { tag: 'glyf' })), /没有 cmap 表/);
  assert.throws(() => fontCoverage(sfnt([[1, 0, format4([[0x41, 0x41, 1, null]])]])), /没有 Unicode 子表/); // 只有 Mac Roman 子表
  // 文件头对、后面被截断：cmap 表整张在文件之外 / 表目录本身就不全 / cmap 表读到一半没了
  const real = fs.readFileSync(TTF);
  assert.throws(() => fontCoverage(real.subarray(0, 20000)), /被截断了：cmap 表.*文件只有 20000 字节/);
  assert.throws(() => fontCoverage(real.subarray(0, 40)), /被截断或损坏（只有 40 字节/);
  const whole = sfnt([[3, 10, format12([[0x4e00, 0x4e01, 3], [0x1f600, 0x1f602, 10]])]]);
  const lying = Buffer.from(whole); lying.writeUInt32BE(9999, 28 + 12 + 12); // 子表声称有 9999 组，实际只有 2 组
  assert.throws(() => fontCoverage(lying), /被截断或损坏/);
  for (let cut = 13; cut < whole.length; cut++) assert.throws(() => fontCoverage(whole.subarray(0, cut)), /截断|太短/, `截到 ${cut} 字节应该报错`);
  assert.throws(() => fontCoverage(sfnt([[3, 1, format4([])]])), /空的/);
});

test('missingGlyphs：只报需要字形的字；空白、零宽字符、变体选择符不算；去重并保持出现顺序', () => {
  assert.deepEqual(missingGlyphs('第①步 → 囧，喆喆说♪好听★', ZCOOL), ['①', '→', '囧', '喆', '♪', '★']);
  assert.deepEqual(missingGlyphs('很久很久以前，有一条 七彩的河。\n\t第二行\u3000全角空格\u200b零宽\ufe0f', ZCOOL), []);
  assert.deepEqual(missingGlyphs('😀笑', ZCOOL), ['😀']);                                  // 基本平面之外的字按一个字算，不拆成两半
  assert.deepEqual(missingGlyphs('e\u0301', ZCOOL), ['\u0301']);                           // 组合用的附加符号字体里没有，会画成豆腐块：要报
  assert.equal(distinctGlyphs([{ where: 'a', text: '很久 很久' }, { where: 'b', text: '以前\n' }]), 4);
});

test('glyphProblems：每个缺的字一条，写明码点和出处；出处多了只列前三处', () => {
  const uses = [
    { where: '第 1 句「A→B」', text: 'A→B' }, { where: '第 2 句「再→一次」', text: '再→一次' }, { where: '片名卡「→」', text: '→' },
    { where: '第 9 句「→→」', text: '→→' }, { where: '第 3 句「囧」', text: '囧' }, { where: '第 4 句「都有」', text: '都有' },
  ];
  const out = glyphProblems(uses, ZCOOL, 'X.ttf');
  assert.deepEqual(out, [
    '字体 X.ttf 里没有「→」（U+2192）：第 1 句「A→B」；第 2 句「再→一次」；片名卡「→」；等 4 处',
    '字体 X.ttf 里没有「囧」（U+56E7）：第 3 句「囧」',
  ]);
  assert.deepEqual(glyphProblems([{ where: 'x', text: '都有，没问题。' }], ZCOOL, 'X.ttf'), []);
});

// —— 一部作品会画出哪些字 ——
const project = (over = {}) => ({
  id: 'p', kind: 'day', title: '标题', lines: ['第一句。', '第二句→'], starts: [0, 1], ends: [0.9, 1.9], speakers: ['whale', null], faces: ['p_whale_neutral', null],
  shots: [], plan: () => { throw new Error('用不到'); }, subtitle: 'dialog', ...over,
});

test('projectTexts：字幕每一句、出过场的说话人名牌、片名卡、片尾字，都算；没出场的说话人不算', () => {
  const uses = projectTexts(project({ cards: { title: { main: '童话镇', sub: '番外' }, end: { shot: 'S', text: '完' } } }));
  assert.deepEqual(uses.map((u) => u.where), ['第 1 句「第一句。」', '第 2 句「第二句→」', '说话人名牌「鲸鱼娘」', '片名卡「童话镇」', '片名卡副题「番外」', '片尾字「完」']);
  assert.deepEqual(uses.map((u) => u.text), ['第一句。', '第二句→', '鲸鱼娘', '童话镇', '番外', '完']);
  assert.deepEqual(projectTexts(project({ kind: 'mv', speakers: undefined })).map((u) => u.where), ['第 1 句歌词「第一句。」', '第 2 句歌词「第二句→」']);
});

test('textPreflight：字幕里的缺字、镜头画在 Canvas 上的缺字、没用模板字体画的字——都报；全都有就通过', () => {
  const drawn = [
    { shot: 'C03', text: '第三十七批', font: `900 95px ${FONT}` },
    { shot: 'C05', text: '涨价↑', font: `900 40px ${FONT}` },
    { shot: 'L18', text: '很', font: '900 22px "Kaiti SC", STKaiti, serif' },
    { shot: 'L18', text: '久', font: '900 22px "Kaiti SC", STKaiti, serif' },
  ];
  const r = textPreflight(project(), drawn, ZCOOL);
  assert.equal(r.uses, 3 + 4);
  assert.equal(r.fontGlyphs, 7053);
  assert.deepEqual(r.problems, [
    '镜头 L18 往 Canvas 上画字用的字体是「900 22px "Kaiti SC", STKaiti, serif」，不是模板字体（画的是「很」「久」）——换一台机器字形就不一样。用 fonts.ts 的 FONT，或 props.ts 的 writeLine()',
    `字体 ${FONT_FILE} 里没有「→」（U+2192）：第 2 句「第二句→」`,
    `字体 ${FONT_FILE} 里没有「↑」（U+2191）：镜头 C05 画在道具 / 贴图上的字「涨价↑」`,
  ]);
  const ok = textPreflight(project({ lines: ['第一句。', '第二句。'] }), drawn.slice(0, 1), ZCOOL);
  assert.deepEqual(ok.problems, []);
  assert.ok(ok.glyphs > 5);
});

test('castPreflight 记下镜头往 Canvas 上画的字和字体（搭景时画的、逐帧画的都算），用完把 Canvas 恢复原样；镜头抛错也一样', () => {
  // Node 里没有 Canvas：放一个只有 fillText / strokeText 的替身
  class FakeCtx { font = '10px sans-serif'; fillText() { FakeCtx.calls++; } strokeText() { FakeCtx.calls++; } }
  class FakeOffscreenCtx { font = '10px sans-serif'; fillText() { FakeCtx.calls++; } strokeText() { FakeCtx.calls++; } } // 离屏 Canvas 是另一个类，也要挂上
  FakeCtx.calls = 0;
  const original = [FakeCtx.prototype.fillText, FakeCtx.prototype.strokeText, FakeOffscreenCtx.prototype.fillText, FakeOffscreenCtx.prototype.strokeText];
  globalThis.CanvasRenderingContext2D = FakeCtx;
  globalThis.OffscreenCanvasRenderingContext2D = FakeOffscreenCtx;
  try {
    const still = cam([0, 2, 10], [0, 1, 0]);
    const shot = (id, build) => ({ id, look: 'day', title: id, note: '', cast: [], build });
    const tl = planByCues([1, 2, 3], [1.8, 2.8, 3.8], [{ id: 'A' }, { id: 'B', cue: 1 }, { id: 'C', cue: 2 }], { tail: 0.2 });
    const atlas = { tex: new THREE.Texture(), w: ATLAS_META.w, h: ATLAS_META.h, rects: ATLAS_META.s, anchors: {}, url: 'test' };
    const r = castPreflight([
      shot('A', () => { const c = new FakeCtx(); c.font = `900 40px ${FONT}`; c.fillText('第三十七批', 0, 0); c.strokeText('第三十七批', 0, 0); c.strokeText('只描边', 0, 0); return () => still; }),
      shot('B', () => { const c = new FakeOffscreenCtx(); c.font = '900 54px sans-serif'; return ({ f }) => { c.fillText(f % 2 ? '奇' : '偶', 0, 0); return still; }; }),
      shot('C', () => { const c = new FakeCtx(); c.fillText('搭到一半', 0, 0); throw new Error('布景没搭起来'); }),
    ], tl, atlas);
    const key = (d) => `${d.shot}|${d.text}|${d.font}`;
    assert.deepEqual(r.drawn.map(key).sort(), [
      { shot: 'A', text: '第三十七批', font: `900 40px ${FONT}` },                       // 描边 + 填充、顺着走 + 倒着走，同一段字只记一次
      { shot: 'A', text: '只描边', font: `900 40px ${FONT}` },                           // 只用 strokeText 画的字也要记到
      { shot: 'B', text: '偶', font: '900 54px sans-serif' },
      { shot: 'B', text: '奇', font: '900 54px sans-serif' },
      { shot: 'C', text: '搭到一半', font: '10px sans-serif' },
    ].map(key).sort());
    assert.equal(r.drawn.length, 5);
    assert.ok(FakeCtx.calls > 4, '原来的 fillText / strokeText 照常被调用（字照常画上去）');
    assert.deepEqual([FakeCtx.prototype.fillText, FakeCtx.prototype.strokeText, FakeOffscreenCtx.prototype.fillText, FakeOffscreenCtx.prototype.strokeText], original, '预检结束后 Canvas 的方法必须恢复原样');
    assert.match(r.problems.join('\n'), /镜头 C .*布景没搭起来/);
    assert.ok(r.drawn.every((d) => d.font.includes(FONT_FAMILY) === (d.shot === 'A')));
  } finally { delete globalThis.CanvasRenderingContext2D; delete globalThis.OffscreenCanvasRenderingContext2D; }
  // 没有 Canvas 的环境：什么都不记，也不报错
  const tl = planByCues([1], [1.8], [{ id: 'A' }], { tail: 0.2 });
  const none = castPreflight([{ id: 'A', look: 'day', title: 'A', note: '', cast: [], build: () => () => cam([0, 2, 10], [0, 1, 0]) }], tl, { tex: new THREE.Texture(), w: ATLAS_META.w, h: ATLAS_META.h, rects: ATLAS_META.s, anchors: {}, url: 'test' });
  assert.deepEqual(none.drawn, []);
});

test('字体地址写进 CSS 时一律加引号并转义：仓库放在带空格、括号、引号的目录下也能加载', () => {
  assert.equal(cssUrl('/static/ZCOOLKuaiLe-Regular.ttf'), 'url("/static/ZCOOLKuaiLe-Regular.ttf")');
  assert.equal(cssUrl('/My Projects (new)/通用模板/字体.ttf'), 'url("/My Projects (new)/通用模板/字体.ttf")');
  assert.equal(cssUrl('a"b\\c'), 'url("a\\"b\\\\c")');
  assert.ok(FONT.startsWith(`"${FONT_FAMILY}",`), '字体栈第一位必须是模板字体');
});

test('仓库里每部作品现有的台词 / 歌词，模板字体里都有（新写的台词带了缺字，这里会先红）', () => {
  const works = [];
  for (const base of ['Day', '番外MV', '通用模板/样板']) {
    for (const name of fs.readdirSync(path.join(REPO, base))) {
      const cues = path.join(REPO, base, name, 'cues.json');
      if (fs.existsSync(cues)) works.push([`${base}/${name}`, cues]);
    }
  }
  assert.ok(works.length >= 4, `应该至少找到四部作品，实际 ${works.length}`);
  for (const [name, cues] of works) {
    const lines = JSON.parse(fs.readFileSync(cues, 'utf8')).lines;
    const bad = glyphProblems(lines.map((l, i) => ({ where: `${name} 第 ${i + 1} 句「${l.text}」`, text: l.text })), ZCOOL, FONT_FILE);
    assert.deepEqual(bad, [], bad.join('\n'));
  }
});
