// 字体：模板自带 ZCOOL KuaiLe（站酷快乐体，SIL OFL 1.1，许可见 assets/fonts/OFL-ZCOOLKuaiLe.txt）。
// 在合成里用 FontFace 显式加载并等它就绪——预览台、任何人的机器、无头渲染出的字形都是同一套，
// 不依赖系统有没有装中文字体。镜头里用 Canvas 画字时也用这个 FONT 常量。
import fontUrl from './assets/fonts/ZCOOLKuaiLe-Regular.ttf';

export const FONT_FAMILY = 'ZCOOL KuaiLe';
/** 字幕 / 字卡的字体栈：首选模板自带字体，其余只是兜底 */
export const FONT = `"${FONT_FAMILY}","PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans CJK SC","Source Han Sans SC",sans-serif`;

let pending: Promise<void> | null = null;
export function loadFonts(): Promise<void> {
  if (!pending) {
    pending = (async () => {
      const face = new FontFace(FONT_FAMILY, `url(${fontUrl}) format('truetype')`, { weight: '400', style: 'normal' });
      await face.load();
      document.fonts.add(face);
      await document.fonts.ready;
      if (!document.fonts.check(`58px "${FONT_FAMILY}"`, '童话镇')) throw new Error('字体 ZCOOL KuaiLe 加载后仍不可用');
    })();
  }
  return pending;
}
