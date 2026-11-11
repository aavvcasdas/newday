// 字形覆盖：这个字体里到底有没有这个字。
//
// 为什么要查：模板只带一套字体（ZCOOL KuaiLe）。它没有的字，浏览器会去字体栈后面找系统字体——
// 出片用的无头 Chromium 里什么系统字体都没有，画出来就是豆腐块（□）；换一台装了中文字体的机器，
// 同一个字又变成另一种字形。两种情况渲染都照常「成功」，自检也查不出来（字幕条在场，只是里面的字不对）。
// 对应旧引擎补丁里「找不到中文字体就拒绝开渲，不许全片豆腐块」那一项：这边字体随仓库走，不会整套缺失，
// 会缺的是个别的字，所以查到「字」这一级。
//
// 只读字体文件的 cmap 表（字符 → 字形的对照表），不依赖浏览器，命令行、测试、浏览器里都能用。

export interface FontCoverage {
  /** 字体里有这个码点的字形吗 */
  has: (codePoint: number) => boolean;
  /** 一共覆盖多少个码点 */
  count: number;
}

const tagAt = (d: DataView, o: number) => String.fromCharCode(d.getUint8(o), d.getUint8(o + 1), d.getUint8(o + 2), d.getUint8(o + 3));

/** 解析 .ttf / .otf 的 cmap 表。不认的文件（不是字体、WOFF 压缩包、被截断、表损坏）直接抛错——宁可停下，也不当成「什么字都有」 */
export function fontCoverage(bytes: ArrayBuffer | Uint8Array): FontCoverage {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const d = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  try {
    return readCmap(d);
  } catch (e) {
    // 表里写的位置超出了文件：文件被截断或损坏。换成人话，不把 "Offset is outside the bounds of the DataView" 甩给用户
    if (e instanceof RangeError) throw new Error(`字体文件被截断或损坏（只有 ${d.byteLength} 字节，表里的位置指到了文件之外）`);
    throw e;
  }
}

function readCmap(d: DataView): FontCoverage {
  if (d.byteLength < 12) throw new Error('字体文件太短，不是有效的 TrueType / OpenType 字体');
  const magic = d.getUint32(0);
  if (magic !== 0x00010000 && magic !== 0x4f54544f /* OTTO */ && magic !== 0x74727565 /* true */) {
    throw new Error(`不是 .ttf / .otf 字体（文件头 0x${magic.toString(16).padStart(8, '0')}${magic === 0x774f4646 || magic === 0x774f4632 ? '，这是 WOFF 压缩字体，请换成 .ttf / .otf' : ''}）`);
  }
  const numTables = d.getUint16(4);
  let cmap = -1, cmapLength = 0;
  for (let i = 0; i < numTables; i++) { const r = 12 + i * 16; if (tagAt(d, r) === 'cmap') { cmap = d.getUint32(r + 8); cmapLength = d.getUint32(r + 12); } }
  if (cmap < 0) throw new Error('字体里没有 cmap 表（字符对照表），无法判断它有哪些字');
  if (cmap + cmapLength > d.byteLength) throw new Error(`字体文件被截断了：cmap 表（字符对照表）应该在第 ${cmap}–${cmap + cmapLength} 字节，文件只有 ${d.byteLength} 字节`);

  // 挑一张 Unicode 子表：优先能表示全部码点的（格式 12），其次基本平面的（格式 4）
  const n = d.getUint16(cmap + 2);
  let best = -1, bestRank = -1;
  for (let i = 0; i < n; i++) {
    const r = cmap + 4 + i * 8, platform = d.getUint16(r), encoding = d.getUint16(r + 2), off = cmap + d.getUint32(r + 4);
    const format = d.getUint16(off);
    const unicode = platform === 0 || (platform === 3 && (encoding === 1 || encoding === 10));
    if (!unicode || (format !== 4 && format !== 12)) continue;
    const rank = (format === 12 ? 2 : 1) * 10 + (platform === 3 ? 1 : 0);
    if (rank > bestRank) { bestRank = rank; best = off; }
  }
  if (best < 0) throw new Error('字体的 cmap 表里没有 Unicode 子表（格式 4 / 12）');

  const set = new Set<number>();
  if (d.getUint16(best) === 12) {
    const groups = d.getUint32(best + 12);
    for (let g = 0; g < groups; g++) {
      const r = best + 16 + g * 12, start = d.getUint32(r), end = d.getUint32(r + 4), glyph = d.getUint32(r + 8);
      if (end < start || end > 0x10ffff) throw new Error('字体的 cmap 表损坏（格式 12 的区间不合法）');
      for (let c = start; c <= end; c++) if (glyph + (c - start) !== 0) set.add(c);
    }
  } else {
    const segs = d.getUint16(best + 6) / 2;
    const ends = best + 14, starts = ends + segs * 2 + 2, deltas = starts + segs * 2, ranges = deltas + segs * 2;
    for (let s = 0; s < segs; s++) {
      const end = d.getUint16(ends + s * 2), start = d.getUint16(starts + s * 2), delta = d.getUint16(deltas + s * 2), range = d.getUint16(ranges + s * 2);
      if (end < start) throw new Error('字体的 cmap 表损坏（格式 4 的区间不合法）');
      for (let c = start; c <= end && c < 0xffff; c++) {
        let glyph: number;
        if (range === 0) glyph = (c + delta) & 0xffff;
        else {
          glyph = d.getUint16(ranges + s * 2 + range + (c - start) * 2);
          if (glyph !== 0) glyph = (glyph + delta) & 0xffff;
        }
        if (glyph !== 0) set.add(c);
      }
    }
  }
  if (!set.size) throw new Error('字体的 cmap 表是空的');
  return { has: (cp) => set.has(cp), count: set.size };
}

// 不需要字形也不会画成豆腐块的字符：空白、控制符，以及 Unicode 规定「字体里没有就什么都不画」的那些
//（零宽空格、零宽连接符、变体选择符、软连字符……）。组合用的附加符号不在此列：字体里没有，它照样会画成豆腐块。
const INVISIBLE = /[\p{White_Space}\p{Cc}\p{Default_Ignorable_Code_Point}]/u;

/** text 里字体没有的字（去重，按出现顺序）。空白与不可见字符不算 */
export function missingGlyphs(text: string, font: FontCoverage): string[] {
  const out: string[] = [];
  for (const ch of text) {
    if (INVISIBLE.test(ch) || font.has(ch.codePointAt(0)!)) continue;
    if (!out.includes(ch)) out.push(ch);
  }
  return out;
}

/** 一处要画出来的字：where 是给人看的出处（「第 3 句」「片名卡」「镜头 C05 画在道具上的字」） */
export interface TextUse { where: string; text: string }

/** 全片要画出来的字里，字体没有的那些：每个缺的字一条，写明它出现在哪几处 */
export function glyphProblems(uses: TextUse[], font: FontCoverage, fontName: string): string[] {
  const hits = new Map<string, string[]>();
  for (const u of uses) {
    for (const ch of missingGlyphs(u.text, font)) {
      const list = hits.get(ch);
      if (!list) hits.set(ch, [u.where]);
      else if (!list.includes(u.where)) list.push(u.where);
    }
  }
  return [...hits].map(([ch, where]) => `字体 ${fontName} 里没有「${ch}」（U+${ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}）：${where.slice(0, 3).join('；')}${where.length > 3 ? `；等 ${where.length} 处` : ''}`);
}

/** uses 里一共有多少个不同的、需要字形的字（报告里用） */
export function distinctGlyphs(uses: TextUse[]): number {
  const set = new Set<string>();
  for (const u of uses) for (const ch of u.text) if (!INVISIBLE.test(ch)) set.add(ch);
  return set.size;
}
