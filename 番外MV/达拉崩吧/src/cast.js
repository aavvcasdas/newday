// cast.js — 16-bit Pixel RPG sprites & portraits pixelized from project AI-girls (assets/ai-girls/) + RPG props & Boss FX
import { FB, C, T, CHARRED, clamp, mod } from './px.js';
import { drawTextPx } from './glyphs.js';
import { getBakedSprite } from './sprites_data.js';

// —— 1. 32×32 Character Portraits (baked from project AI-girls + RPG mood accents) ——
const portraitCache = new Map();

function drawTinyTiara(fb, cx, topY, wide = false) {
  if (wide) {
    fb.tri(cx - 5, topY + 4, cx - 3, topY + 1, cx - 1, topY + 4, C.gold);
    fb.tri(cx - 2, topY + 4, cx, topY, cx + 2, topY + 4, C.goldL);
    fb.tri(cx + 1, topY + 4, cx + 3, topY + 1, cx + 5, topY + 4, C.gold);
    fb.hline(cx - 5, cx + 5, topY + 4, C.gold);
    fb.px(cx, topY + 3, C.scarf);
  } else {
    fb.tri(cx - 3, topY + 3, cx, topY, cx + 3, topY + 3, C.goldL);
    fb.hline(cx - 3, cx + 3, topY + 3, C.gold);
    fb.px(cx, topY + 2, C.scarf);
  }
}

export function getPortrait(who, mood = 'neutral') {
  const key = `${who}:${mood}`;
  if (portraitCache.has(key)) return portraitCache.get(key);
  const p = new FB(32, 32);
  // Subtle dark-slate RPG portrait backdrop so dark hair silhouettes pop cleanly
  p.gradV(0, 0, 32, 32, [C.dslate, C.night, C.ink]);

  let bakeKey = `p_${who}`;
  if (who === 'whale') {
    bakeKey = (mood === 'shout' || mood === 'happy') ? 'p_whale_shout'
      : (mood === 'think' || mood === 'shock') ? 'p_whale_think'
      : 'p_whale_neutral';
  } else if (who === 'doubao') {
    bakeKey = 'p_doubao_neutral';
  } else if (who === 'gpt') {
    bakeKey = mood === 'haughty' ? 'p_gpt_haughty' : mood === 'rage' ? 'p_gpt_rage' : 'p_gpt_neutral';
  } else if (who === 'claude') {
    bakeKey = mood === 'petrified' ? 'p_claude_petri' : mood === 'dizzy' ? 'p_claude_dizzy' : 'p_claude_neutral';
  }

  const spr = getBakedSprite(bakeKey) || getBakedSprite('p_whale_neutral');
  p.blitSprite(spr, 0, 0, false, (who === 'whale' && mood === 'charred') ? CHARRED : null);

  // Signature RPG overlays
  if (who === 'whale') {
    if (mood === 'shock') {
      p.vline(26, 9, 13, C.cyan);
      p.px(26, 14, C.uiW);
    } else if (mood === 'charred') {
      p.rect(10, 18, 3, 3, C.uiW); p.px(11, 19, C.ink);
      p.rect(19, 18, 3, 3, C.uiW); p.px(20, 19, C.ink);
    }
  } else if (who === 'doubao') {
    drawTinyTiara(p, 16, 1, false);
  } else if (who === 'claude') {
    drawTinyTiara(p, 16, 0, true);
    if (mood === 'petrified') {
      p.vline(4, 4, 11, C.silver);
      p.vline(6, 4, 13, C.silver);
      p.vline(27, 4, 11, C.silver);
    } else if (mood === 'dizzy') {
      p.disc(6, 7, 2, C.goldL);
      p.disc(26, 7, 2, C.goldL);
    }
  }

  p.box(0, 0, 32, 32, C.ink);
  portraitCache.set(key, p);
  return p;
}

// —— 2. Full-Body Pixelized Sprites of All 8 Repo AI-Girls ——

// Whale-girl Hero Sprite (native 44px & 74px close-up + Protected Red Scarf + Holy Sword!)
export function drawWhaleHero(fb, x, y, t, {
  pose = 'idle',      // idle | run | shout | think | happy | sword | ride | shock | charred
  facing = 1,         // 1 right, -1 left
  scarfLen = 22,
  scale = 1,
} = {}) {
  const step8 = Math.floor(t * 8);
  const blink = mod(Math.floor(t * 3.2), 11) === 0;
  const isChar = pose === 'charred';

  let sprKey;
  let naturalDir = 1; // +1 if baked sprite looks right/front-right, -1 if left
  if (scale >= 2) {
    if (pose === 'shout' || pose === 'sword') sprKey = 'whale_big_point';
    else if (pose === 'happy') sprKey = 'whale_big_wave';
    else sprKey = (blink && pose !== 'shock') ? 'whale_big_blink' : 'whale_big_idle';
  } else if (pose === 'run') {
    sprKey = `whale_walk_${mod(step8, 4)}`;
  } else if (pose === 'ride') {
    sprKey = `whale_walk_${(step8 & 1) ? 1 : 3}`;
  } else if (pose === 'shout' || pose === 'sword') {
    sprKey = 'whale_point';
  } else if (pose === 'happy') {
    sprKey = 'whale_wave';
  } else {
    sprKey = (blink && !isChar && pose !== 'shock') ? 'whale_blink' : 'whale_idle';
  }

  const spr = getBakedSprite(sprKey);
  if (!spr) return;

  const bob = (pose === 'run' || pose === 'ride')
    ? (step8 & 1 ? -1 : 0)
    : (Math.floor(t * 2.2) & 1 ? 0 : -1);
  const rideDrop = pose === 'ride' ? 9 : 0;
  const flip = (facing * naturalDir) < 0;

  const dx = Math.round(x - (spr.w >> 1));
  const dy = Math.round(y - spr.h + 1 + bob + rideDrop);

  // 1) Dynamic Protected-Red Hero Scarf streaming behind Whale-girl!
  const collarY = scale >= 2 ? (dy + 41) : (dy + 24);
  const dir = -facing;
  const anchorX = Math.round(x + dir * (scale >= 2 ? 4 : 2));
  const stepWave = Math.floor(t * 12);
  let prevX = anchorX, prevY = collarY;
  const segs = Math.max(4, Math.round(scarfLen / 3));
  const thick = scale >= 2 ? 3 : 2;
  for (let i = 1; i <= segs; i++) {
    const u = i / segs;
    const wx = anchorX + dir * i * 3 * (scale >= 2 ? 1.4 : 1);
    const wy = collarY + Math.round(Math.sin(stepWave * 0.55 - i * 0.65) * (1.4 + u * 3.4)) + (pose === 'idle' ? Math.round(i * 0.35) : 0);
    fb.line(prevX, prevY, wx, wy, C.ink, thick + 2);
    fb.line(prevX, prevY, wx, wy, i % 3 === 0 ? C.scarfL : C.scarf, thick);
    prevX = wx; prevY = wy;
  }

  // 2) Blit pixelized Whale-girl sprite!
  fb.blitSprite(spr, dx, dy, flip, isChar ? CHARRED : null);

  // Subtle red scarf knot peeking only when charred (keeps her cute maid bow unobstructed!)
  if (isChar) {
    fb.rect(x - 3, collarY, 7, 2, C.scarf);
  }

  // 4) Gleaming Pixel Holy Sword in battle / riding / heroic poses!
  if ((pose === 'sword' || pose === 'ride') && scale === 1) {
    const slash = pose === 'sword' ? Math.sin(t * 12) * 0.35 - 0.55 : -0.75;
    const hx = x + facing * 8;
    const hy = collarY + 2;
    const tx = hx + Math.round(Math.cos(slash) * 16) * facing;
    const ty = hy + Math.round(Math.sin(slash) * 16);
    fb.line(hx, hy, tx, ty, C.ink, 4);
    fb.line(hx, hy, tx, ty, C.uiW, 2);
    fb.line(hx, hy, tx, ty, C.goldL, 1);
    fb.rect(hx - 2, hy - 2, 4, 4, C.gold);
  }

  // 5) Shock sweatdrop or Charred blinking white eyes + rising smoke puff!
  if (pose === 'shock') {
    const sy = dy + (scale >= 2 ? 18 : 11);
    const sx = x + facing * (scale >= 2 ? 16 : 10);
    fb.vline(sx, sy, sy + 4, C.cyan);
    fb.px(sx, sy + 5, C.uiW);
  } else if (isChar) {
    // Comic blinking white pixel eyes on soot-blackened Whale-girl + rising grey smoke!
    if (mod(Math.floor(t * 6), 5) !== 0) {
      fb.rect(x - 5, dy + 14, 3, 3, C.uiW); fb.px(x - 4, dy + 15, C.ink);
      fb.rect(x + 2, dy + 14, 3, 3, C.uiW); fb.px(x + 3, dy + 15, C.ink);
    }
    const puffY = dy - 3 - mod(Math.round(t * 14), 10);
    fb.disc(x + Math.round(Math.sin(t * 7) * 3), puffY, 2.5, C.slate);
  }
}

// Snow-White Pixel Steed (8fps gallop cycle)
export function drawWhiteHorse(fb, x, y, t, facing = 1) {
  const f = mod(Math.floor(t * 10), 4);
  const bob = (f === 1 || f === 3) ? -2 : 0;
  const spr = new FB(52, 36);
  spr.clear(T);
  const lA = f === 0 ? -4 : f === 1 ? 2 : f === 2 ? 5 : -1;
  const lB = -lA;
  spr.line(15, 22 + bob, 12 + lA, 33, C.silver, 2);
  spr.line(19, 22 + bob, 17 + lB, 33, C.uiW, 2);
  spr.line(32, 22 + bob, 34 + lB, 33, C.silver, 2);
  spr.line(36, 22 + bob, 39 + lA, 33, C.uiW, 2);
  spr.ellipse(26, 19 + bob, 13, 6, C.uiW);
  spr.ellipse(26, 21 + bob, 11, 4, C.silver);
  spr.rect(21, 13 + bob, 9, 5, C.scarf);
  spr.hline(21, 29, 13 + bob, C.gold);
  spr.line(13, 17 + bob, 5, 20 + (f & 1 ? -2 : 1), C.silver, 3);
  spr.line(13, 16 + bob, 6, 19 + (f & 1 ? -2 : 1), C.uiW, 2);
  spr.line(35, 18 + bob, 41, 8 + bob, C.uiW, 5);
  spr.ellipse(43, 8 + bob, 5, 3.2, C.uiW);
  spr.tri(40, 4 + bob, 42, 1 + bob, 43, 5 + bob, C.uiW);
  spr.px(44, 7 + bob, C.ink);
  spr.line(38, 8 + bob, 44, 10 + bob, C.gold);
  fb.blit(spr, x - 26, y - 34, facing < 0, C.ink);
}

// Supporting Cast Pixelized Sprites (Claude Queen, Doubao Princess, Kimi, Gemini, Zai, Qwen, GPT mini)
export function drawCastSprite(fb, x, y, who, t, { pose = 'idle', facing = 1, big = false } = {}) {
  const blink = mod(Math.floor(t * 2.7 + x * 0.13), 10) === 0;
  const bob = pose === 'cheer'
    ? -Math.abs(Math.round(Math.sin(t * 8.5) * 2.5))
    : (Math.floor(t * 2) & 1 ? 0 : -1);

  let sprKey;
  let useSide = false;
  if (who === 'doubao') {
    sprKey = blink ? 'doubao_sm_1' : 'doubao_sm_0';
  } else if (who === 'gpt') {
    sprKey = (Math.floor(t * 6) & 1) ? 'gpt_fly_1' : 'gpt_fly_0';
    useSide = true;
  } else if (who === 'claude') {
    if (big && pose === 'petrified') sprKey = 'claude_big_petri';
    else if (pose === 'petrified') sprKey = 'claude_petri';
    else sprKey = blink ? 'claude_front_1' : 'claude_front_0';
  } else if (who === 'kimi' || who === 'gemini' || who === 'zai' || who === 'qwen') {
    if (pose === 'scribe' || pose === 'walk') {
      sprKey = `${who}_side_${Math.floor(t * 5) & 1}`;
      useSide = true;
    } else {
      sprKey = `${who}_front_${blink ? 1 : 0}`;
    }
  } else {
    sprKey = 'kimi_front_0';
  }

  const spr = getBakedSprite(sprKey);
  if (!spr) return;

  const flip = useSide ? (facing < 0) : (facing < 0 && who !== 'doubao');
  const dx = Math.round(x - (spr.w >> 1));
  const dy = Math.round(y - spr.h + 1 + bob);
  fb.blitSprite(spr, dx, dy, flip);

  // Royal crowns & RPG role props
  if (who === 'doubao') {
    drawTinyTiara(fb, x, dy - 2, false);
  } else if (who === 'claude') {
    drawTinyTiara(fb, x, dy - 3, true);
  } else if (who === 'kimi' && pose === 'scribe') {
    const px = x + facing * 8, py = dy + 22;
    fb.rect(px - 3, py, 6, 5, C.parchment);
    fb.box(px - 4, py - 1, 8, 7, C.ink);
    if (t < 54.16) {
      fb.line(px, py - 1, px + facing * 5, py - 7, C.uiW);
    } else {
      // Snapped quill gag after 13-character name shock!
      fb.line(px, py, px + facing * 3, py - 3, C.uiW);
      fb.line(px + facing * 4, py + 3, px + facing * 7, py + 6, C.uiW);
    }
  } else if (who === 'zai') {
    const hx = x + facing * 11;
    fb.vline(hx, dy + 4, y, C.ink);
    fb.vline(hx + 1, dy + 4, y, C.silver);
    fb.tri(hx, dy, hx - 3, dy + 7, hx + 4, dy + 6, C.uiW);
  }
}

// Doubao Princess inside swinging Golden Birdcage!
export function drawDoubaoInCage(fb, cx, cy, t, shout = false, chainTop = 0) {
  const swing = Math.round(Math.sin(t * 2.6) * 3);
  const x = cx + swing, y = cy;
  const compact = (cy - chainTop) < 24 && chainTop > 0;

  if (compact) {
    if (y - 18 > chainTop) fb.vline(x, chainTop, y - 18, C.goldD);
    fb.ellipse(x, y - 2, 11, 15, C.ink);
    const spr = getBakedSprite('doubao_sm_0');
    if (spr) {
      fb.blitSprite(spr, x - (spr.w >> 1), y + 12 - spr.h, false);
      drawTinyTiara(fb, x, y + 10 - spr.h, false);
    }
    fb.hline(x - 11, x + 11, y + 12, C.gold);
    fb.hline(x - 10, x + 10, y - 13, C.gold);
    fb.line(x - 10, y - 13, x, y - 19, C.goldL);
    fb.line(x + 10, y - 13, x, y - 19, C.gold);
    for (const bx of [-8, -4, 4, 8]) fb.vline(x + bx, y - 13, y + 12, C.goldD);
    return;
  }

  // Full Dragon-Cave Golden Birdcage framing 42px pixelized Doubao!
  if (y - 26 > chainTop) {
    fb.vline(x - 1, chainTop, y - 26, C.ink);
    fb.vline(x, chainTop, y - 26, C.gold);
  }
  fb.ellipse(x, y - 2, 14, 21, C.ink);
  const bounce = shout ? -Math.abs(Math.round(Math.sin(t * 10) * 2)) : 0;
  const blink = mod(Math.floor(t * 3), 9) === 0;
  const spr = getBakedSprite(blink ? 'doubao_cage_1' : 'doubao_cage_0');
  if (spr) {
    const sy = y + 17 - spr.h + bounce;
    fb.blitSprite(spr, x - (spr.w >> 1), sy, false);
    drawTinyTiara(fb, x, sy - 2, false);
  }
  // Ornate Golden Cage Dome, Base & Bars (parted at center so Doubao's face is 100% clear!)
  fb.rect(x - 14, y + 16, 29, 3, C.goldD);
  fb.hline(x - 14, x + 14, y + 16, C.goldL);
  fb.hline(x - 13, x + 13, y - 19, C.gold);
  fb.line(x - 13, y - 19, x, y - 27, C.goldL, 2);
  fb.line(x + 13, y - 19, x, y - 27, C.gold, 2);
  for (const bx of [-12, -7, 7, 12]) {
    fb.vline(x + bx, y - 19, y + 16, Math.abs(bx) === 7 ? C.goldL : C.goldD);
  }
  fb.disc(x, y - 27, 2.5, C.goldL);
}

// —— 3. Towering Pixelized GPT Dragon-Girl Boss (88px AI-Girl + Wings + 13-Scale Coiled Tail + Flamethrower!) ——
const DRAGON_CHARS = [...'昆图库塔卡提考特苏瓦西拉松'];

export function drawGptDragonBoss(fb, baseX, baseY, t, {
  litScales = 0,       // 0..13 scales lit with golden characters!
  rage = false,
  breathingFire = false,
} = {}) {
  const breathe = Math.round(Math.sin(t * 3) * 1);

  // 1) Gleaming Dragon Hoard Gold Mound beneath GPT Dragon-Girl!
  fb.ellipse(baseX - 4, baseY + 6, 48, 10, C.goldD);
  fb.ellipse(baseX - 6, baseY + 4, 40, 7, C.gold);
  for (let i = 0; i < 14; i++) {
    fb.px(baseX - 38 + i * 5, baseY + 2 + (i % 3) * 2, C.goldL);
  }

  // 2) Towering 88px Pixelized GPT Dragon-Girl Boss Sprite (with real pixelized wings, horns & coiled tail)!
  const blink = mod(Math.floor(t * 2.5), 11) === 0;
  let sprKey;
  let flip = false;
  if (breathingFire) {
    sprKey = (Math.floor(t * 8) & 1) ? 'gpt_boss_cast1' : 'gpt_boss_cast0';
    flip = true; // Walk/push sprite faces right naturally -> flip=true faces LEFT toward Whale-girl!
  } else if (rage) {
    sprKey = 'gpt_boss_rage';
  } else {
    sprKey = blink ? 'gpt_boss_blink' : 'gpt_boss_idle';
  }
  const bossSpr = getBakedSprite(sprKey);
  const bx = baseX - 6;
  const by = baseY + 6 + breathe;
  if (bossSpr) {
    fb.blitSprite(bossSpr, bx - (bossSpr.w >> 1), by - bossSpr.h, flip);
  }

  // 3) Draw the 13 Lit Golden Scale Medallions (昆图库塔卡提考特苏瓦西拉松) arcing around her dragon aura!
  for (let i = 0; i < Math.min(13, litScales); i++) {
    const ang = Math.PI * 1.12 - (i / 12) * Math.PI * 1.24;
    const sx = Math.round(bx + Math.cos(ang) * 48);
    const sy = Math.round((by - 44) - Math.sin(ang) * 40);
    fb.disc(sx, sy, 6.5, C.ink);
    fb.disc(sx, sy, 5.5, i === litScales - 1 ? C.goldL : C.gold);
    drawTextPx(fb, sx - 4, sy - 4, DRAGON_CHARS[i], { size: 8, color: C.ink });
  }

  // 6) Roaring 12-fps Pixel Flamethrower unleashed straight from her outstretched hands!
  if (breathingFire) {
    const fStep = Math.floor(t * 12);
    const originX = bx - 28;
    const originY = by - 46;
    for (let i = 0; i < 24; i++) {
      const u = i / 23;
      const fx = Math.round(originX - u * 162);
      const fy = Math.round(originY + u * 28 + Math.sin(fStep * 0.9 + i * 0.7) * (2 + u * 7));
      const r = 3.5 + u * 13;
      fb.disc(fx, fy, r, C.red);
      fb.disc(fx + 2, fy, r * 0.72, C.orange);
      fb.disc(fx + 3, fy, r * 0.45, i % 2 === 0 ? C.goldL : C.yellow);
    }
  }
}

// Flying Sky-Raid Pixelized GPT Dragon-Girl for S03 & S05b Wanted Poster!
export function drawFlyingGptDragon(fb, x, y, t) {
  const flap = Math.round(Math.sin(t * 9) * 8);
  // Flapping dragon wings behind her
  fb.tri(x + 2, y - 6, x + 28, y - 24 + flap, x + 20, y + 4, C.ink);
  fb.tri(x + 2, y - 6, x + 26, y - 22 + flap, x + 18, y + 3, C.dragV);
  fb.line(x + 2, y - 6, x + 26, y - 22 + flap, C.dragS, 2);
  fb.tri(x - 2, y - 6, x - 24, y - 22 - flap * 0.4, x - 14, y + 3, C.dragD);

  const spr = getBakedSprite((Math.floor(t * 6) & 1) ? 'gpt_fly_1' : 'gpt_fly_0');
  if (spr) {
    // Flip=true so she swoops leftward across the castle sky!
    fb.blitSprite(spr, x - (spr.w >> 1), y - (spr.h >> 1), true);
  }
}

// Monsters (Pixel Slime & Shadow Bat) + Treasure Chest + 5 Inventory Gag Icons!
export function drawMonster(fb, x, y, kind, t, ko = false) {
  if (ko && (Math.floor(t * 12) & 1)) return;
  if (kind === 'slime') {
    const sq = Math.floor(t * 8) & 1;
    fb.ellipse(x, y - 4 + sq, 7 + sq, 5 - sq * 0.5, C.ink);
    fb.ellipse(x, y - 4 + sq, 6 + sq, 4 - sq * 0.5, ko ? C.uiW : C.crimson);
    fb.px(x - 2, y - 5, C.goldL); fb.px(x + 2, y - 5, C.goldL);
  } else {
    const flap = (Math.floor(t * 12) & 1) ? -4 : 3;
    fb.tri(x, y, x - 9, y + flap, x - 4, y + 4, C.plum);
    fb.tri(x, y, x + 9, y + flap, x + 4, y + 4, C.plum);
    fb.disc(x, y + 1, 3.5, ko ? C.uiW : C.ink);
    fb.px(x - 1, y, C.scarf); fb.px(x + 1, y, C.scarf);
  }
}

export function drawChest(fb, x, y, opened = false) {
  fb.rect(x - 8, y - 9, 16, 9, C.ink);
  fb.rect(x - 7, y - 8, 14, 7, C.brown);
  fb.hline(x - 7, x + 6, y - 5, C.gold);
  fb.rect(x - 2, y - 6, 4, 3, C.goldL);
  if (opened) {
    fb.rect(x - 7, y - 14, 14, 5, C.dbrown);
    fb.box(x - 8, y - 15, 16, 6, C.gold);
    fb.disc(x, y - 10, 3, C.goldL);
  }
}

// 5 Custom 20×20 Pixel Icons for L44: 昆特牌 | 提琴 | 烤蛋挞 | 苏打 | 马拉松
export function drawGagItemIcon(fb, cx, cy, index, burning = 0) {
  if (burning > 0.75) {
    fb.ellipse(cx, cy + 5, 7, 3, C.dslate);
    fb.ellipse(cx, cy + 4, 4, 2, C.slate);
    return;
  }
  if (index === 0) {
    fb.rect(cx - 7, cy - 9, 14, 18, C.ink);
    fb.rect(cx - 6, cy - 8, 12, 16, C.uiW);
    fb.box(cx - 5, cy - 7, 10, 14, C.scarf);
    fb.tri(cx, cy - 5, cx - 4, cy, cx + 4, cy, C.gold);
    fb.tri(cx, cy + 5, cx - 4, cy, cx + 4, cy, C.scarf);
  } else if (index === 1) {
    fb.disc(cx - 2, cy + 3, 5, C.brown);
    fb.disc(cx + 1, cy - 1, 3.8, C.clay);
    fb.line(cx + 2, cy - 2, cx + 7, cy - 8, C.dbrown, 2);
    fb.line(cx - 3, cy + 4, cx + 6, cy - 7, C.goldL, 1);
    fb.line(cx - 7, cy - 5, cx + 7, cy + 6, C.sand, 1);
  } else if (index === 2) {
    fb.tri(cx - 8, cy - 1, cx + 8, cy - 1, cx + 5, cy + 6, C.tan);
    fb.tri(cx - 8, cy - 1, cx - 5, cy + 6, cx + 5, cy + 6, C.tan);
    fb.ellipse(cx, cy - 2, 8, 4, C.gold);
    fb.ellipse(cx, cy - 2, 6, 2.8, C.goldL);
    fb.disc(cx - 2, cy - 2, 1.5, C.rust); fb.disc(cx + 2, cy - 1, 1.2, C.rust);
  } else if (index === 3) {
    fb.line(cx + 1, cy - 9, cx + 5, cy - 11, C.scarf, 2);
    fb.rect(cx - 3, cy - 7, 6, 4, C.cyan);
    fb.rect(cx - 5, cy - 3, 10, 11, C.cyan);
    fb.rect(cx - 4, cy, 8, 6, C.blue);
    fb.px(cx - 2, cy + 2, C.uiW); fb.px(cx + 2, cy - 1, C.uiW); fb.px(cx, cy - 5, C.uiW);
  } else {
    fb.rect(cx - 7, cy + 1, 13, 5, C.blue);
    fb.rect(cx - 7, cy + 5, 14, 2, C.uiW);
    fb.tri(cx - 4, cy + 1, cx - 8, cy - 4, cx - 1, cy - 2, C.goldL);
    fb.line(cx - 9, cy - 6, cx + 9, cy - 3, C.scarf, 2);
  }
  if (burning > 0) {
    fb.disc(cx, cy + 2, 7 * burning, C.orange);
    fb.disc(cx, cy + 3, 4 * burning, C.goldL);
  }
}
