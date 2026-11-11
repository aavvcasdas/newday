// 字体：模板自带 ZCOOL KuaiLe（站酷快乐体，SIL OFL 1.1，许可见 assets/fonts/OFL-ZCOOLKuaiLe.txt）。
// 在合成里用 FontFace 显式加载并等它就绪——预览台、任何人的机器、无头渲染出的字形都是同一套，
// 不依赖系统有没有装中文字体。镜头里用 Canvas 画字时也用这个 FONT 常量。
//
// 对应旧引擎补丁里字体那一项（找不到中文字体就拒绝开渲；字体加载失败必须让渲染失败，不许静默放行）：
//   · 字体文件随仓库走，不在 .gitignore 里，全新克隆也有；
//   · 加载失败直接抛错（Film.tsx 收到后 cancelRender），错误里写明是字体、是哪个文件；
//   · 这套字体只有 GB2312 的 6763 个汉字加常用标点。它没有的字（生僻字、→ ★ ♪ ① 这类符号、日文假名……）
//     会落到系统字体上：无头渲染环境里画成豆腐块，换台机器又是另一种字形。所以开渲前逐字核对（glyphs.ts）。
import fontUrl from './assets/fonts/ZCOOLKuaiLe-Regular.ttf';
import { fontCoverage, type FontCoverage } from './glyphs';

export const FONT_FAMILY = 'ZCOOL KuaiLe';
/** 字体文件名（报错和报告里用） */
export const FONT_FILE = 'ZCOOLKuaiLe-Regular.ttf';
/** 字幕 / 字卡的字体栈：首选模板自带字体，其余只是兜底 */
export const FONT = `"${FONT_FAMILY}","PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans CJK SC","Source Han Sans SC",sans-serif`;

/** CSS 的 url()：一律加引号并转义。不加引号时，路径里只要有空格、括号、引号（仓库放在「My Projects (new)」这种目录下）就解析失败 */
export const cssUrl = (u: string) => `url("${u.replace(/["\\\n]/g, (c) => (c === '\n' ? '\\a ' : `\\${c}`))}")`;

let pending: Promise<void> | null = null;
export function loadFonts(): Promise<void> {
  if (!pending) {
    pending = (async () => {
      const face = new FontFace(FONT_FAMILY, `${cssUrl(fontUrl)} format('truetype')`, { weight: '400', style: 'normal' });
      try { await face.load(); }
      catch (e) {
        // 浏览器给的原因通常只有一句「A network error occurred」，看不出是字体：这里说清楚
        throw new Error(`字体加载失败：${FONT_FILE}（${e instanceof Error ? e.message : String(e)}）——文件损坏、不是字体，或没有取到。没有它，无头渲染环境里所有文字都是豆腐块，所以不带着它出片`);
      }
      document.fonts.add(face);
      await document.fonts.ready;
      if (!document.fonts.check(`58px "${FONT_FAMILY}"`, '童话镇')) throw new Error(`字体 ${FONT_FAMILY} 加载后仍不可用（${FONT_FILE}）`);
    })();
  }
  return pending;
}

/** 把字体文件读回来，看它到底有哪些字（开渲前的文字预检用）。取不到、不是字体，都抛错 */
export async function loadFontCoverage(): Promise<FontCoverage> {
  const res = await fetch(fontUrl);
  if (!res.ok) throw new Error(`字体文件取不到：${FONT_FILE}（HTTP ${res.status}）`);
  try { return fontCoverage(await res.arrayBuffer()); }
  catch (e) { throw new Error(`字体文件 ${FONT_FILE} 读不出来：${e instanceof Error ? e.message : String(e)}`); }
}
