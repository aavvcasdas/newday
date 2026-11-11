// 全片文字预检：画面上会出现的每一个字，模板字体里都得有。
// 单独放一个文件（不放在 register.tsx 里），是为了不带 React 也能在测试里直接跑。
import type { DrawnText } from './engine';
import { FONT_FAMILY, FONT_FILE } from './fonts';
import { distinctGlyphs, glyphProblems, type FontCoverage, type TextUse } from './glyphs';
import { projectTexts, type ProjectDef } from './project';

/** 全片文字预检的结果 */
export interface TextReport {
  /** 字幕 / 名牌 / 字卡 / 镜头画在 Canvas 上的字，一共核对了多少处、多少个不同的字 */
  uses: number; glyphs: number;
  /** 字体里一共有多少个字（0 = 字体没读出来） */
  fontGlyphs: number;
  /** 会让文字变成豆腐块、或者换台机器就换一种字形的问题；空数组 = 通过 */
  problems: string[];
  /** 字体文件本身取不到 / 读不出来（这种情况谈不上逐字核对，而且渲染一定失败） */
  fontError?: string;
}

/**
 * 全片文字预检：画面上会出现的每一个字，模板字体里都得有。
 * 对应旧引擎补丁里字体那一项。那边的病是「仓库里根本没有中文字体，全片文字成了豆腐块，错误还被吞了」；
 * 这边字体随仓库走、加载失败会让渲染失败，剩下的口子是个别的字：字体没有的字会落到系统字体上，
 * 无头渲染环境里就是豆腐块，渲染照样报成功（实测过：「囧」「喆」画成 ⊠，「→ ★ ♪ ①」被这台机器上的 DejaVu 画了出来）。
 */
export function textPreflight(p: ProjectDef, drawn: DrawnText[], font: FontCoverage): TextReport {
  const uses: TextUse[] = projectTexts(p);
  const problems: string[] = [];
  const offFont = new Map<string, string[]>();
  for (const d of drawn) {
    uses.push({ where: `镜头 ${d.shot} 画在道具 / 贴图上的字「${d.text}」`, text: d.text });
    // Canvas 上画字没用模板字体：每台机器把 sans-serif 之类解析成不同的系统字体，同一个字长得不一样；没装字体的机器上是豆腐块
    if (!d.font.includes(FONT_FAMILY)) { const k = `镜头 ${d.shot} 往 Canvas 上画字用的字体是「${d.font}」`; offFont.set(k, [...(offFont.get(k) ?? []), d.text]); }
  }
  for (const [k, texts] of offFont) problems.push(`${k}，不是模板字体（画的是「${texts.slice(0, 3).join('」「')}」${texts.length > 3 ? ' 等' : ''}）——换一台机器字形就不一样。用 fonts.ts 的 FONT，或 props.ts 的 writeLine()`);
  problems.push(...glyphProblems(uses, font, FONT_FILE));
  return { uses: uses.length, glyphs: distinctGlyphs(uses), fontGlyphs: font.count, problems };
}
