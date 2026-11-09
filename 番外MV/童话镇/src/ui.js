// ui.js — 16-bit Fairytale Storybook windows, chapter banners & progressive karaoke-glow pixel lyric captions
import { C, W, clamp } from './px.js';
import { drawTextPx, measureTextPx } from './glyphs.js';

export function drawRpgWindow(fb, x, y, w, h, { skin = 'parchment', alert = false } = {}) {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  if (w < 6 || h < 6) return;
  const cols = alert
    ? [C.scarf, C.crimson, C.umber]
    : skin === 'parchment'
      ? [C.parchment, C.sand, C.tan]
      : skin === 'rose'
        ? [C.rose, C.plum, C.night]
        : skin === 'dark'
          ? [C.dslate, C.night, C.ink]
          : [C.blue, C.navy, C.night];

  fb.rect(x + 1, y, w - 2, h, C.ink);
  fb.rect(x, y + 1, w, h - 2, C.ink);
  fb.gradV(x + 2, y + 2, w - 4, h - 4, cols);

  const b1 = alert ? C.goldL : skin === 'parchment' ? C.dbrown : C.goldL;
  const b2 = alert ? C.gold : skin === 'parchment' ? C.brown : C.gold;
  fb.hline(x + 2, x + w - 3, y + 1, b1);
  fb.hline(x + 2, x + w - 3, y + h - 2, b2);
  fb.vline(x + 1, y + 2, y + h - 3, b1);
  fb.vline(x + w - 2, y + 2, y + h - 3, b2);

  fb.px(x + 2, y + 2, C.gold);
  fb.px(x + w - 3, y + 2, C.gold);
  fb.px(x + 2, y + h - 3, C.gold);
  fb.px(x + w - 3, y + h - 3, C.gold);
}

export function drawStoryBanner(fb, x, y, text, {
  skin = 'parchment',
  size = 8,
  texts = null,
  id = null,
  pass = false,
} = {}) {
  const tw = measureTextPx(text, size, 1);
  const w = tw + 14;
  const h = size + 10;
  drawRpgWindow(fb, x, y, w, h, { skin });
  const textCol = skin === 'parchment' ? C.crimson : C.goldL;
  const shCol = skin === 'parchment' ? null : C.ink;
  drawTextPx(fb, x + 7, y + 5, text, { size, color: textCol, shadow: shCol, tracking: 1 });
  if (texts && id) {
    texts.push({ id, text, x0: x * 6, y0: y * 6, x1: (x + w) * 6, y1: (y + h) * 6, ...(pass ? { pass: true } : {}) });
  }
}

// Progressive Karaoke-Glow 16-bit Pixel Lyric Bar (bottom safe zone y = 163)
export function drawLyricCaption(fb, t, subs, hiddenIds = new Set()) {
  const cue = subs.find((s) => t >= s.t0 && t <= s.t1);
  if (!cue || hiddenIds.has(cue.id)) return;

  const chars = [...cue.text];
  const totalW = measureTextPx(cue.text, 10, 1);
  const x0 = Math.round((W - totalW) * 0.5);
  const y0 = 163;

  // Speaker accent colour
  const accent = cue.speaker === 'claude' ? C.goldL
    : cue.speaker === 'doubao' ? C.scarfL
    : cue.speaker === 'gpt' ? C.lavender
    : cue.speaker === 'gemini' ? C.pink
    : cue.speaker === 'kimi' ? C.cyan
    : cue.speaker === 'zai' ? C.lime
    : C.goldL;

  const barLine = cue.speaker === 'claude' ? C.gold
    : cue.speaker === 'doubao' ? C.scarf
    : cue.speaker === 'gpt' ? C.dragV
    : C.whaleM;

  // Crisp dark frame strip behind lyric text
  fb.rect(x0 - 6, y0 - 3, totalW + 12, 15, C.ink);
  fb.hline(x0 - 5, x0 + totalW + 4, y0 - 3, barLine);
  fb.hline(x0 - 5, x0 + totalW + 4, y0 + 11, C.dslate);

  const prog = clamp((t - cue.t0) / Math.max(0.25, (cue.t1 - cue.t0) * 0.86), 0, 1);
  const litCount = Math.ceil(chars.length * prog);

  let cx = x0;
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const col = i < litCount ? accent : C.uiW;
    const adv = drawTextPx(fb, cx, y0, ch, {
      size: 10,
      color: col,
      outline: C.ink,
    });
    cx += adv + 1;
  }
}
