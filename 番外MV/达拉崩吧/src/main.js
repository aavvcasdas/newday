// main.js — Entry point, ?sheet=1 model sheet, hardware shake/swirl/mosaic post-pass & OpusCar render hooks
import { W, H, SCALE, C, FB, LUT, makeOut, mosaic, encounterSwirl, calcShake } from './px.js';
import { DUR, SUBS, SHAKES, EV } from './timeline.js';
import { drawTextPx } from './glyphs.js';
import {
  getPortrait,
  drawWhaleHero,
  drawWhiteHorse,
  drawCastSprite,
  drawDoubaoInCage,
  drawGptDragonBoss,
  drawGagItemIcon,
} from './cast.js';
import { drawRpgWindow, drawLyricCaption } from './ui.js';
import { renderScene } from './scenes.js';

const canvas = document.getElementById('stage');
const out = makeOut(canvas);
const fb = new FB(W, H);

const HIDDEN_CAPTION_IDS = new Set(['L14', 'L16', 'L17', 'L20', 'L39', 'L43']);
const isSheet = new URLSearchParams(window.location.search).get('sheet') === '1';

let lastTexts = [];

function renderModelSheet(t) {
  fb.gradV(0, 0, W, H, [C.night, C.navy, C.dslate]);
  fb.box(3, 3, W - 6, H - 6, C.gold);
  drawTextPx(fb, 8, 7, '《达拉崩吧》16-BIT PIXEL RPG 角色设定表', { size: 8, color: C.goldL, shadow: C.ink });

  // Top Row: All 8 Cast Portraits + Full-Body Sprites
  const lineup = [
    ['whale', '鲸鱼娘'],
    ['doubao', '豆包'],
    ['gpt', 'GPT龙'],
    ['claude', '大小姐'],
    ['kimi', 'Kimi'],
    ['gemini', 'Gemini'],
    ['zai', '智谱'],
    ['qwen', '千问'],
  ];
  lineup.forEach(([who, label], idx) => {
    const x = 6 + idx * 39;
    drawRpgWindow(fb, x, 19, 36, 36, { skin: 'dark' });
    fb.blit(getPortrait(who, who === 'gpt' ? 'rage' : 'neutral'), x + 2, 21);
    if (who === 'whale') {
      drawWhaleHero(fb, x + 18, 88, t, { pose: 'sword', scarfLen: 16 });
    } else {
      drawCastSprite(fb, x + 18, 88, who, t);
    }
    drawTextPx(fb, x + 4, 92, label, { size: 8, color: C.uiW, shadow: C.ink });
  });

  // Bottom Row: White Steed + Caged Doubao + 5 Gag Icons + GPT Dragon Boss!
  drawRpgWindow(fb, 6, 106, 308, 68, { skin: 'parchment' });
  drawWhiteHorse(fb, 38, 162, t, 1);
  drawWhaleHero(fb, 36, 145, t, { pose: 'ride', scarfLen: 24 });
  drawDoubaoInCage(fb, 92, 146, t, false, 110);
  for (let i = 0; i < 5; i++) {
    fb.rect(116 + i * 20, 136, 18, 18, C.sand);
    fb.box(116 + i * 20, 136, 18, 18, C.dbrown);
    drawGagItemIcon(fb, 125 + i * 20, 145, i, 0);
  }
  drawGptDragonBoss(fb, 258, 168, t, { litScales: 6 });
  out.present(fb, LUT.full);
  out.show();
}

export function render(t) {
  if (isSheet) {
    renderModelSheet(t);
    lastTexts = [];
    return;
  }

  // Final smash-cut to crisp black after the last syllable "松!" (132.52 – 132.77s)
  if (t >= 132.52) {
    fb.clear(C.ink);
    out.present(fb, LUT.full);
    out.show();
    lastTexts = [];
    return;
  }

  fb.clear(C.ink);
  const res = renderScene(fb, t) || {};
  lastTexts = res.texts || [];

  // Burned-in pixel lyric bar (clean bottom safe zone, suppressed when dialog box speaks the line)
  drawLyricCaption(fb, t, SUBS, HIDDEN_CAPTION_IDS);

  // Integer-pixel RPG impact camera shake + Dual-LUT palette presentation
  const [sx, sy] = calcShake(t, SHAKES);
  out.present(fb, res.lut || LUT.full, res.lutB || null, res.pick || null, sx, sy);

  // SNES Hardware Post-FX: Random-encounter spiral wipe or Mode-7 mosaic transition
  if (res.swirlU && res.swirlU > 0) {
    out.post((u32) => encounterSwirl(u32, res.swirlU));
  } else if (res.mosaicBlock && res.mosaicBlock > 1) {
    out.post((u32) => mosaic(u32, res.mosaicBlock));
  }
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

// Interactive browser preview loop (paused automatically when OpusCar headless harness drives window.render)
let rafId = 0;
let playing = false;
const tStart = performance.now();

function tick(now) {
  if (!playing) return;
  const elapsed = ((now - tStart) / 1000) % DUR;
  render(elapsed);
  rafId = requestAnimationFrame(tick);
}

render(0);

// Click stage in live browser preview to toggle animation playback
canvas.addEventListener('click', () => {
  playing = !playing;
  if (playing) rafId = requestAnimationFrame(tick);
  else cancelAnimationFrame(rafId);
});
