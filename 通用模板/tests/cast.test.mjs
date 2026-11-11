// 角色素材链路的回归测试：不允许「渲染成功，但角色不见了 / 切到别的格子上」。
//
// 这三组对应旧 Remotion 引擎那份补丁（remotion-engine-fix.patch）自带的三项测试，换成新模板的做法：
//   旧：22 张图集必须能经 HTTP 取到、尺寸对          → 新：图集 PNG 与坐标表是同一版，每一格都有像素（atlasProblems）
//   旧：列数按「每张图集」解析，帧号不越界           → 新：帧数按「每个序列」在图集里实际的格数算，帧号永远落在序列内（framesIn / cycleIndex）
//   旧：素材预检，未登记或 404 必须在开渲前报错       → 新：全片预检，点到不存在的格子 / 算出 NaN 必须在开渲前一次报全（castPreflight）
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import './tpl-loader.mjs';

const THREE = await import('three');
const { Actor, ATLAS_META, CAST_SETS, atlasProblems, setProblems, framesIn, cycleIndex } = await import('../engine/actors.ts');
const { castPreflight, frameOf } = await import('../engine/engine.ts');
const { cam } = await import('../engine/core.ts');
const { planByCues, FPS } = await import('../engine/timeline.ts');

const ASSETS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../engine/assets');

/** 最小 PNG 解码（8 位 RGBA、非隔行）：只为了在测试里拿到每个像素的不透明度 */
function decodePng(file) {
  const buf = fs.readFileSync(file);
  assert.equal(buf.readUInt32BE(0), 0x89504e47, '不是 PNG');
  let pos = 8, w = 0, h = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos), type = buf.toString('ascii', pos + 4, pos + 8), data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4);
      assert.deepEqual([data[8], data[9], data[12]], [8, 6, 0], '只支持 8 位 RGBA、非隔行的 PNG');
    } else if (type === 'IDAT') idat.push(data);
    pos += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat)), bpp = 4, stride = w * bpp;
  const px = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? px[y * stride + x - bpp] : 0, b = y ? px[(y - 1) * stride + x] : 0, c = x >= bpp && y ? px[(y - 1) * stride + x - bpp] : 0;
      let v = line[x];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      px[y * stride + x] = v & 255;
    }
  }
  return { w, h, alphaAt: (x, y) => px[(y * w + x) * 4 + 3] };
}

const PNG = decodePng(path.join(ASSETS, 'cast_atlas.png'));
const clone = (o) => JSON.parse(JSON.stringify(o));
/** 不解码图片也能造角色：只要坐标表（测试不画图） */
const fakeAtlas = () => ({ tex: new THREE.Texture(), w: ATLAS_META.w, h: ATLAS_META.h, rects: ATLAS_META.s, anchors: {}, url: 'test' });
const CHARS = Object.keys(CAST_SETS);

test('图集体检：仓库里的 PNG 与坐标表是同一版，108 格每一格都有像素，角色表引用的格子全都在', () => {
  assert.deepEqual([PNG.w, PNG.h], [ATLAS_META.w, ATLAS_META.h]);
  assert.equal(Object.keys(ATLAS_META.s).length, 108);
  assert.deepEqual(atlasProblems(ATLAS_META, PNG.w, PNG.h, PNG.alphaAt), []);
});

test('图集体检：PNG 与坐标表不是同一版、格子出界、空格子、序列缺号、角色缺格——每一种都报出来，不放行', () => {
  const run = (meta, w = PNG.w, h = PNG.h, alphaAt = PNG.alphaAt) => atlasProblems(meta, w, h, alphaAt).join('\n');
  assert.match(run(ATLAS_META, PNG.w + 64, PNG.h), /不是同一版/);                       // 图集重烘过、坐标表没跟着换

  const out = clone(ATLAS_META); out.s.whale_idle = [PNG.w - 10, 0, 78, 88];
  assert.match(run(out), /「whale_idle」.*超出图集/);

  const [x0, y0, w, h] = ATLAS_META.s.walk_claude_3;                                   // 这一格在 PNG 里被涂成了全透明
  const holed = (x, y) => (x >= x0 && x < x0 + w && y >= y0 && y < y0 + h ? 0 : PNG.alphaAt(x, y));
  const empty = atlasProblems(ATLAS_META, PNG.w, PNG.h, holed);
  assert.equal(empty.length, 1);
  assert.match(empty[0], /「walk_claude_3」这一格是空的/);

  const gap = clone(ATLAS_META); delete gap.s.walk_whale_3;
  assert.match(run(gap), /序列「walk_whale_\*」的编号不是从 0 连着编的/);
  const noBlink = clone(ATLAS_META); delete noBlink.s.whale_blink;
  assert.match(run(noBlink), /角色 whale 的正面精灵「whale_blink」不在图集里/);
  const noWalk = clone(ATLAS_META); for (let i = 0; i < 2; i++) delete noWalk.s[`gpt_fly_${i}`];
  assert.match(setProblems(noWalk.s).join('\n'), /角色 gpt 的步态序列「gpt_fly_0…」在图集里一格都没有/);
  assert.match(run({ ...ATLAS_META, s: { ...ATLAS_META.s, bad: [0, 0, 0, 5] } }), /「bad」的坐标不是正整数矩形/);
});

test('帧数按「每个序列」在图集里实际的格数算：步态 8 格、龙娘飞行 2 格，不是每个角色写死一个数', () => {
  for (const id of CHARS) assert.equal(framesIn(CAST_SETS[id].walk), id === 'gpt' ? 2 : 8, id);
  assert.deepEqual(['gpt_boss_cast', 'claude_side_', 'doubao_cage_', '没有这个序列_'].map((p) => framesIn(p)), [2, 2, 2, 0]);
  // 换一张图集（某个序列是 12 格）：格数跟着图集走
  const cells = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`dance_${i}`, [0, 0, 1, 1]]));
  assert.equal(framesIn('dance_', cells), 12);
  // 角色表里不再出现手写的帧数
  for (const id of CHARS) assert.deepEqual(Object.keys(CAST_SETS[id]).sort(), ['front', 'walk']);
});

test('帧号永远落在序列内：负数、小数回绕进 0…n−1；NaN / Infinity 直接报错，不悄悄挑一格', () => {
  for (const n of [1, 2, 8, 16]) {
    for (let i = -100; i <= 100; i += 0.25) {
      const f = cycleIndex(i, n);
      assert.ok(Number.isInteger(f) && f >= 0 && f < n, `cycleIndex(${i}, ${n}) = ${f}`);
    }
    for (let i = 0; i < 64; i++) assert.equal(cycleIndex(i, n), i % n);                 // 非负整数：和普通取余一样
  }
  assert.deepEqual([-1, -8, -9, -0.5].map((i) => cycleIndex(i, 8)), [7, 0, 7, 7]);
  for (const bad of [NaN, Infinity, -Infinity]) assert.throws(() => cycleIndex(bad, 8, 'whale.walk'), /whale\.walk 算出来的帧号不是有限数/);
  assert.throws(() => cycleIndex(3, 0, 'x'), /一格都没有/);
});

test('步态：任何时间 / 速率 / 距离下画的都是图集里真有的那一格；正向播放的结果与改动前逐帧相同', () => {
  const atlas = fakeAtlas();
  for (const id of CHARS) {
    const a = new Actor(atlas, id), s = CAST_SETS[id], n = framesIn(s.walk), step = n === 2 ? 6 : 3;
    const seen = new Set();
    for (const rate of [1, 0.75, 1.5, 2, 0.5, 3]) {               // 1 / 0.75 / 1.5 是现有四部作品实际用到的速率
      for (let f = 0; f <= 6000; f++) {
        const T = f / FPS, key = a.walk(T, rate).probe().key;
        assert.ok(ATLAS_META.s[key], `${id}.walk(${T}, ${rate}) → ${key}`);
        // 改动前的算式（T ≥ 0、rate > 0 时不能有任何一帧不同，否则已经出的片子就得重渲）
        assert.equal(key, `${s.walk}${Math.floor((Math.round(T * FPS) * rate) / step) % n}`);
        seen.add(key);
      }
    }
    assert.equal(seen.size, n, `${id} 的步态应当 ${n} 格都播到`);
    // 倒着走 / 时间为负：以前会拼出 walk_xxx_-1 然后抛「缺少角色精灵」，现在回绕
    for (const [T, rate] of [[-0.1, 1], [3, -1], [-7.3, 2.5], [12, -0.5]]) assert.ok(ATLAS_META.s[a.walk(T, rate).probe().key], `${id}.walk(${T}, ${rate})`);
    for (let d = -50; d <= 50; d += 0.137) {
      const key = a.walkBy(d).probe().key;
      assert.ok(ATLAS_META.s[key], `${id}.walkBy(${d}) → ${key}`);
      assert.equal(key, `${s.walk}${((Math.floor((d / 1.7) * n) % n) + n) % n}`);
    }
    assert.throws(() => a.walk(NaN), /不是有限数/);
    assert.throws(() => a.walkBy(1, 0), /不是有限数/);                                   // 步幅 0 → 除出 Infinity
    for (const k of s.front) assert.ok(ATLAS_META.s[k]);
    assert.ok(s.front.includes(a.front(0.05).probe().key) && s.front.includes(a.front(1.9).probe().key));
  }
  assert.throws(() => new Actor(atlas, 'whale').set('whale_jump'), /缺少角色精灵「whale_jump」/);
});

// —— 全片预检 ——
const still = cam([0, 2, 10], [0, 1, 0]);
const shot = (id, build) => ({ id, look: 'day', title: id, note: '', cast: [], build });
/** 四句、每句 1 秒；每个镜头从对应那句开口前 2 帧开始 */
const timeline = (ids) => planByCues([1, 2, 3, 4], [1.8, 2.8, 3.8, 4.8], ids.map((id, i) => (i ? { id, cue: i } : { id })), { tail: 0.2 });
const OK = [
  shot('A', (k) => { const w = k.actor('whale'); return ({ T }) => { w.front(T).at(0, 0, 0); return still; }; }),
  shot('B', (k) => { const w = k.actor('whale'), g = k.actor('gpt'); return ({ T, u }) => { w.walk(T).at(u * 3, 0, 0); g.walk(T).at(0, 2, 0).alpha(u < 0.5 ? 0 : 1); return still; }; }),
];

test('全片预检：每一帧都走到；只统计看得见的角色实际画到的格子', () => {
  const tl = timeline(['A', 'B']);
  const r = castPreflight(OK, tl, fakeAtlas());
  assert.deepEqual(r.problems, []);
  assert.deepEqual([r.shots, r.frames], [2, tl.frames]);
  assert.deepEqual(Object.keys(r.sprites), ['gpt', 'whale']);
  assert.deepEqual(r.sprites.gpt, ['gpt_fly_0', 'gpt_fly_1']);                          // 龙娘前半段透明度为 0，那段时间的格子不算
  assert.equal(r.sprites.whale.filter((k) => k.startsWith('walk_whale_')).length, 8);
  assert.ok(r.sprites.whale.includes('whale_idle') && r.sprites.whale.includes('whale_blink'));
});

test('全片预检：点到不存在的格子、坐标 / 透明度 / 机位是 NaN、搭景就抛错——开渲前一次报全，并说清是哪个镜头的第几帧', () => {
  const tl = timeline(['A', 'B', 'C', 'D']);
  const fB = Math.ceil(tl.shots[1].a * FPS - 1e-9), fC = Math.ceil(tl.shots[2].a * FPS - 1e-9), fD = Math.ceil(tl.shots[3].a * FPS - 1e-9);
  const shots = [
    OK[0],
    // B：进镜头 10 帧之后换成一个图集里没有的姿势（出片时要渲到这一帧才会炸）
    shot('B', (k) => { const w = k.actor('whale'); return ({ f }) => { w.set(f - fB >= 10 ? 'whale_jump' : 'whale_idle'); return still; }; }),
    // C：第一个角色的 x 有 5 帧算成了 NaN；第二个角色透明度是 NaN；第三个藏起来了（坐标再坏也无所谓）；机位有 3 帧是 NaN
    shot('C', (k) => {
      const a = k.actor('whale'), b = k.actor('claude'), c = k.actor('kimi');
      return ({ f, T }) => {
        const i = f - fC;
        a.front(T).at(i >= 4 && i < 9 ? NaN : 0, 0, 0);
        b.front(T).alpha(i === 2 ? NaN : 1);
        c.front(T).at(NaN, 0, 0).hide();
        return i < 3 ? cam([0, 2, NaN], [0, 1, 0]) : still;
      };
    }),
    shot('D', () => { throw new Error('布景没搭起来'); }),
  ];
  const r = castPreflight(shots, tl, fakeAtlas());
  const all = r.problems.join('\n');
  assert.equal(r.problems.length, 5, all);
  assert.match(all, new RegExp(`镜头 B 第 ${fB + 10} 帧（[\\d.]+s）：.*缺少角色精灵「whale_jump」`));
  assert.match(all, new RegExp(`镜头 C：角色 whale（本镜第 1 个）的 x=NaN.*从第 ${fC + 4} 帧（[\\d.]+s）起，共 5 帧`));
  assert.match(all, new RegExp(`镜头 C：角色 claude（本镜第 2 个）的 alpha=NaN.*从第 ${fC + 2} 帧（[\\d.]+s）起，共 1 帧`));
  assert.match(all, new RegExp(`镜头 C：机位里有非有限数.*从第 ${fC} 帧（[\\d.]+s）起，共 3 帧`));
  assert.match(all, new RegExp(`镜头 D 第 ${fD} 帧（[\\d.]+s）：布景没搭起来`));
  assert.doesNotMatch(all, /kimi/);                                                     // 藏起来的角色不报
  assert.doesNotMatch(all, /镜头 A/);
  assert.equal(r.frames, tl.frames);
});

test('frameOf：预检和出片拿到的是同一份「这一帧的时间信息」', () => {
  const tl = timeline(['A', 'B']);
  const st = tl.shots[1];
  const f = Math.round(2.4 * FPS), fr = frameOf(tl, st, f);                              // 第 2 句（序号 1）说到一半
  assert.equal(fr.f, f);
  assert.ok(Math.abs(fr.T - 2.4) < 1e-9 && Math.abs(fr.t - (2.4 - st.a)) < 1e-9 && Math.abs(fr.dur - (st.b - st.a)) < 1e-9);
  assert.ok(Math.abs(fr.u - (2.4 - st.a) / (st.b - st.a)) < 1e-9);
  assert.deepEqual([fr.line, fr.said], [1, 1]);
  assert.ok(Math.abs(fr.lp - 0.5) < 1e-9);
  assert.ok(Math.abs(fr.when(1) - (2 - st.a) / fr.dur) < 1e-9 && Math.abs(fr.when(1, 1) - (2.8 - st.a) / fr.dur) < 1e-9);
  assert.throws(() => fr.when(9), /不存在的句子/);
  const gap = frameOf(tl, st, Math.round(2.9 * FPS));                                    // 句间空档：line 回到 −1，said 不回退
  assert.deepEqual([gap.line, gap.said], [-1, 1]);
});
