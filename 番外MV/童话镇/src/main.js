// main.js — Storybook MV entry point, render harness hooks, lyric pass and readable cast sheet.
import { W, H, C, FB, LUT, makeOut, mosaic, encounterSwirl, calcShake } from './px.js';
import { DUR, SUBS, SHAKES, EV } from './timeline.js';
import { drawTextPx } from './glyphs.js';
import {
  getPortrait,
  drawRiceBowl,
  drawWhaleHero,
  drawMapWhaleHero,
  drawPaperBoat,
  drawCastSprite,
  drawStoryEmblem,
} from './cast.js';
import { drawRpgWindow, drawLyricCaption } from './ui.js';
import { renderScene } from './scenes.js';

const canvas = document.getElementById('stage');
const out = makeOut(canvas);
const fb = new FB(W, H);
const HIDDEN_CAPTION_IDS = new Set();
const isSheet = new URLSearchParams(window.location.search).get('sheet') === '1';
let lastTexts = [];

const CAST = [
  ['whale', '鲸鱼娘', '主角'],
  ['gpt', 'GPT龙娘', '恶龙'],
  ['claude', 'Claude大小姐', '公主'],
  ['doubao', '豆包', '小红帽'],
  ['gemini', 'Gemini', '爱丽丝'],
  ['kimi', 'Kimi', '灰姑娘'],
  ['qwen', '千问', '疯帽子'],
  ['zai', '智谱', '竖琴杰克'],
];
const EMBLEM_FOR = { whale: 5, gpt: 5, claude: 4, doubao: 2, gemini: 0, kimi: 1, qwen: 3, zai: 3 };

function renderModelSheet(t) {
  fb.gradV(0, 0, W, H, [C.ink, C.navy, C.plum, C.dslate]);
  fb.box(2, 2, W - 4, H - 4, C.gold);
  fb.box(5, 5, W - 10, H - 10, C.scarfD);
  drawTextPx(fb, 12, 7, '《童话镇》像素角色图鉴', { size: 10, color: C.goldL, outline: C.ink });
  drawTextPx(fb, 13, 20, '主角鲸鱼娘  ·  公主Claude  ·  恶龙GPT', { size: 8, color: C.uiW, shadow: C.ink });

  // Compact two-row gallery: authentic portraits, role labels, and a small signature prop per role.
  CAST.forEach(([who, name, role], i) => {
    const col = i % 4, row = Math.floor(i / 4);
    const x = 10 + col * 75, y = 34 + row * 59;
    drawRpgWindow(fb, x, y, 71, 55, { skin: who === 'claude' ? 'rose' : who === 'gpt' ? 'dark' : 'parchment' });
    fb.blit(getPortrait(who, who === 'gpt' ? 'rage' : 'neutral'), x + 3, y + 3);
    drawStoryEmblem(fb, x + 54, y + 18, EMBLEM_FOR[who]);
    drawTextPx(fb, x + 3, y + 38, name, { size: 8, color: C.uiW, shadow: C.ink });
    drawTextPx(fb, x + 3, y + 46, role, { size: 8, color: who === 'claude' ? C.goldL : who === 'doubao' ? C.scarfL : C.cyan, shadow: C.ink });
  });

  // Map continuity strip: the sole overworld avatar is Whale-girl; no generic map token is used.
  drawRpgWindow(fb, 10, 154, 300, 21, { skin: 'parchment' });
  drawMapWhaleHero(fb, 22, 168, t, { pose: 'run', facing: 1, scarfLen: 10 });
  drawPaperBoat(fb, 61, 169, t, { scale: 0.48, withWhale: false, reflection: false });
  drawRiceBowl(fb, 95, 171, t, 0.58);
  drawTextPx(fb, 117, 158, '地图主角：鲸鱼娘', { size: 8, color: C.crimson, shadow: C.parchment });
  for (let i = 0; i < 6; i++) drawStoryEmblem(fb, 216 + i * 15, 168, i);

  out.present(fb, LUT.full);
  out.show();
}

export function render(t) {
  t = Math.max(0, Math.min(DUR, Number(t) || 0));
  if (isSheet) {
    renderModelSheet(t);
    lastTexts = [];
    return;
  }
  fb.clear(C.ink);
  const scene = renderScene(fb, t) || {};
  lastTexts = scene.texts || [];
  drawLyricCaption(fb, t, SUBS, HIDDEN_CAPTION_IDS);

  const [sx, sy] = calcShake(t, SHAKES);
  out.present(fb, scene.lut || LUT.full, scene.lutB || null, scene.pick || null, sx, sy);
  if (scene.swirlU && scene.swirlU > 0) out.post((u32) => encounterSwirl(u32, scene.swirlU));
  else if (scene.mosaicBlock && scene.mosaicBlock > 1) out.post((u32) => mosaic(u32, scene.mosaicBlock));
  out.show();
}

window.DUR = DUR;
window.EV = EV;
window.render = render;
window.TEXTS = (t) => {
  render(t);
  return lastTexts;
};
window.READY = true;

let rafId = 0;
let playing = false;
let tStart = performance.now();
function tick(now) {
  if (!playing) return;
  render(((now - tStart) / 1000) % DUR);
  rafId = requestAnimationFrame(tick);
}
render(0);
canvas.addEventListener('click', () => {
  playing = !playing;
  if (playing) {
    tStart = performance.now();
    rafId = requestAnimationFrame(tick);
  } else cancelAnimationFrame(rafId);
});
