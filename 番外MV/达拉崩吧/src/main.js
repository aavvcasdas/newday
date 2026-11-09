// main.js — Entry point, ?sheet=1 model sheet, hardware shake/swirl/mosaic post-pass & OpusCar render hooks
import { W, H, SCALE, C, FB, LUT, makeOut, mosaic, encounterSwirl, calcShake } from './px.js';
import { DUR, SUBS, SHAKES, EV } from './timeline.js';
import { drawTextPx } from './glyphs.js';
import {
  getPortrait,
  drawWhaleHero,
  drawMapWhaleHero,
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
  fb.box(2, 2, W - 4, H - 4, C.gold);
  drawTextPx(fb, 8, 5, '《达拉崩吧》16-BIT PIXEL RPG 角色设定表', { size: 8, color: C.goldL, shadow: C.ink });

  // Left 7-Column Cast Lineup (Portraits + Full-Body Pixelized Sprites)
  const lineup = [
    ['whale', '鲸鱼娘'],
    ['doubao', '豆包'],
    ['claude', '大小姐'],
    ['kimi', 'Kimi'],
    ['gemini', 'Gemini'],
    ['zai', '智谱'],
    ['qwen', '千问'],
  ];
  lineup.forEach(([who, label], idx) => {
    const x = 5 + idx * 33;
    drawRpgWindow(fb, x, 15, 32, 34, { skin: 'dark' });
    fb.blit(getPortrait(who, 'neutral'), x, 16);
    if (who === 'whale') {
      drawWhaleHero(fb, x + 16, 96, t, { pose: 'happy', scarfLen: 12 });
    } else {
      drawCastSprite(fb, x + 16, 96, who, t);
    }
    drawTextPx(fb, x + 2, 99, label, { size: 8, color: C.uiW, shadow: C.ink });
  });

  // Bottom-Left RPG Props Panel: Mounted Steed + Map Chibi Whale-girl + Caged Doubao + 5 Wrong-Name Gag Icons!
  drawRpgWindow(fb, 5, 110, 230, 66, { skin: 'parchment' });
  drawWhiteHorse(fb, 34, 166, t, 1);
  drawWhaleHero(fb, 32, 149, t, { pose: 'ride', scarfLen: 18 });
  drawMapWhaleHero(fb, 70, 162, t, { pose: 'sword', scarfLen: 12 });
  drawDoubaoInCage(fb, 102, 149, t, false, 113);
  for (let i = 0; i < 5; i++) {
    fb.rect(124 + i * 21, 138, 19, 19, C.sand);
    fb.box(124 + i * 21, 138, 19, 19, C.dbrown);
    drawGagItemIcon(fb, 133 + i * 21, 147, i, 0);
  }

  // Right Full-Height Final Boss Panel: GPT Dragon-Girl LV.99!
  drawRpgWindow(fb, 238, 15, 77, 161, { skin: 'dark', alert: true });
  fb.blit(getPortrait('gpt', 'rage'), 243, 20);
  drawTextPx(fb, 278, 24, '恶龙', { size: 10, color: C.goldL, shadow: C.ink });
  drawTextPx(fb, 278, 38, 'GPT龙娘', { size: 8, color: C.uiW });
  drawGptDragonBoss(fb, 282, 158, t, { litScales: 0, rage: true });
  drawTextPx(fb, 250, 165, 'BOSS LV.99', { size: 8, color: C.goldL, shadow: C.ink });
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
