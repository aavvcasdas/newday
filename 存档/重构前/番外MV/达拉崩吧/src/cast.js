// cast.js — High-clarity 640×360 pixelized sprites & 64×64 portraits of all 8 project AI-girls + RPG props & Boss FX
import { FB, C, T, CHARRED, clamp, mod } from './px.js';
import { drawTextPx } from './glyphs.js';
import { getBakedSprite } from './sprites_data.js';

// —— 1. 64×64 High-Clarity Character Portraits (stored inside FB(32,32).hi for seamless UI integration) ——
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

  // Overlays drawn before or after 64×64 hi-res portrait
  const spr = getBakedSprite(bakeKey) || getBakedSprite('p_whale_neutral');
  p.blitSpriteHi(spr, 0, 0, false, (who === 'whale' && mood === 'charred') ? CHARRED : null);

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

// —— 2. High-Clarity 640×360 Full-Body Sprites of All 8 Repo AI-Girls ——

// Whale-girl Hero Sprite (native 88px & 148px close-up in 640×360 space!)
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
  const flip = facing < 0;

  const hL = spr.h >> 1; // height in 320×180 logical coords
  const dyL = Math.round(y - hL + 1 + bob + rideDrop);

  // 1) Dynamic Protected-Red Hero Scarf streaming behind Whale-girl!
  const collarY = scale >= 2 ? (dyL + 41) : (dyL + 24);
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

  // 2) Gleaming Pixel Holy Sword (drawn behind or beside hand so sprite stays crisp!)
  if (pose === 'sword' || pose === 'ride') {
    const sc = scale >= 2 ? 1.65 : 1;
    const slash = pose === 'sword' ? Math.sin(t * 12) * 0.35 - 0.65 : -0.75;
    const hx = x + facing * Math.round(9 * sc);
    const hy = collarY + Math.round(2 * sc);
    const tx = hx + Math.round(Math.cos(slash) * 17 * sc) * facing;
    const ty = hy + Math.round(Math.sin(slash) * 17 * sc);
    fb.line(hx, hy, tx, ty, C.ink, scale >= 2 ? 5 : 4);
    fb.line(hx, hy, tx, ty, C.uiW, scale >= 2 ? 3 : 2);
    fb.line(hx, hy, tx, ty, C.goldL, 1);
    fb.rect(hx - 2, hy - 2, 4, 4, C.gold);
  }

  // 3) Blit 640×360 high-clarity Whale-girl sprite!
  const dxHi = Math.round(x * 2 - (spr.w >> 1));
  const dyHi = Math.round((y + 1 + bob + rideDrop) * 2 - spr.h);
  fb.blitSpriteHi(spr, dxHi, dyHi, flip, isChar ? CHARRED : null);

  // 4) Shock sweatdrop or Charred blinking white eyes + rising smoke puff!
  if (pose === 'shock') {
    const sy = dyL + (scale >= 2 ? 18 : 11);
    const sx = x + facing * (scale >= 2 ? 17 : 11);
    fb.vline(sx, sy, sy + 4, C.cyan);
    fb.px(sx, sy + 5, C.uiW);
  } else if (isChar) {
    fb.rect(x - 3, collarY, 7, 2, C.scarf);
    if (mod(Math.floor(t * 6), 5) !== 0) {
      fb.rect(x - 5, dyL + 14, 3, 3, C.uiW); fb.px(x - 4, dyL + 15, C.ink);
      fb.rect(x + 2, dyL + 14, 3, 3, C.uiW); fb.px(x + 3, dyL + 15, C.ink);
    }
    const puffY = dyL - 3 - mod(Math.round(t * 14), 10);
    fb.disc(x + Math.round(Math.sin(t * 7) * 3), puffY, 2.5, C.slate);
  }
}

// Chibi Map Whale-Girl Sprite (56px in 640×360 = 28px tall on 320×180 maps! Used on ALL World Maps & Desk Intro!)
export function drawMapWhaleHero(fb, x, y, t, {
  pose = 'run',       // run | sword | jump
  facing = 1,
  scarfLen = 14,
} = {}) {
  const step10 = Math.floor(t * 10);
  const sprKey = pose === 'sword' ? 'whale_map_pt' : `whale_map_${mod(step10, 4)}`;
  const spr = getBakedSprite(sprKey);
  if (!spr) return;

  const jumpOff = pose === 'jump' ? -Math.abs(Math.round(Math.sin(t * 9) * 5)) : (step10 & 1 ? -1 : 0);
  const collarY = Math.round(y - 12 + jumpOff);
  const dir = -facing;
  let px = Math.round(x + dir * 2), py = collarY;
  const segs = Math.max(3, Math.round(scarfLen / 3));
  for (let i = 1; i <= segs; i++) {
    const wx = Math.round(x + dir * (2 + i * 3));
    const wy = collarY + Math.round(Math.sin(t * 14 - i * 0.8) * 2);
    fb.line(px, py, wx, wy, C.ink, 3);
    fb.line(px, py, wx, wy, i % 2 ? C.scarf : C.scarfL, 2);
    px = wx; py = wy;
  }

  if (pose === 'sword') {
    const hx = Math.round(x + facing * 6), hy = collarY;
    fb.line(hx, hy, hx + facing * 8, hy - 9, C.ink, 3);
    fb.line(hx, hy, hx + facing * 8, hy - 9, C.goldL, 1);
  }

  const dxHi = Math.round(x * 2 - (spr.w >> 1));
  const dyHi = Math.round((y + 1 + jumpOff) * 2 - spr.h);
  fb.blitSpriteHi(spr, dxHi, dyHi, facing < 0);
}

// Mini Whale-Girl Head Icon (for Adventure HUD Mini-Map!)
export function drawMiniWhaleIcon(fb, cx, cy, t) {
  const bob = Math.floor(t * 6) & 1;
  const y = Math.round(cy - bob);
  const x = Math.round(cx);
  // Flowing mini red scarf tail behind icon
  fb.line(x - 2, y + 1, x - 6, y + 2 + bob, C.scarf, 2);
  // Crisp mini Whale-girl head (navy hair + white maid band + sapphire face dot)
  fb.disc(x, y, 3.5, C.ink);
  fb.disc(x, y, 2.6, C.whaleM);
  fb.hline(x - 2, x + 2, y - 2, C.uiW); // maid headband!
  fb.rect(x - 1, y, 3, 2, C.skin);
  fb.px(x + 1, y, C.whaleD);
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

// Supporting Cast High-Clarity Sprites (Claude Queen, Doubao Princess, Kimi, Gemini, Zai, Qwen, GPT mini)
export function drawCastSprite(fb, x, y, who, t, { pose = 'idle', facing = 1, big = false, largeDoubao = false } = {}) {
  const blink = mod(Math.floor(t * 2.7 + x * 0.13), 10) === 0;
  const bob = pose === 'cheer'
    ? -Math.abs(Math.round(Math.sin(t * 8.5) * 2.5))
    : (pose === 'walk' || pose === 'panic')
    ? (Math.floor(t * 10) & 1 ? -1 : 0)
    : (Math.floor(t * 2) & 1 ? 0 : -1);

  let sprKey;
  let useSide = false;
  if (who === 'doubao') {
    if (largeDoubao) sprKey = blink ? 'doubao_cage_1' : 'doubao_cage_0';
    else sprKey = blink ? 'doubao_sm_1' : 'doubao_sm_0';
  } else if (who === 'gpt') {
    sprKey = (Math.floor(t * 6) & 1) ? 'gpt_fly_1' : 'gpt_fly_0';
    useSide = true;
  } else if (who === 'claude') {
    if (big && pose === 'petrified') sprKey = 'claude_big_petri';
    else if (pose === 'petrified') sprKey = 'claude_petri';
    else sprKey = blink ? 'claude_front_1' : 'claude_front_0';
  } else if (who === 'kimi' || who === 'gemini' || who === 'zai' || who === 'qwen') {
    if (pose === 'scribe' || pose === 'walk' || pose === 'panic') {
      sprKey = `${who}_side_${Math.floor(t * (pose === 'panic' ? 12 : 6)) & 1}`;
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
  const hL = spr.h >> 1;
  const dyL = Math.round(y - hL + 1 + bob);

  // Halberd behind/beside Zai
  if (who === 'zai') {
    const hx = Math.round(x + facing * 11);
    fb.vline(hx, dyL + 4, Math.round(y), C.ink);
    fb.vline(hx + 1, dyL + 4, Math.round(y), C.silver);
    fb.tri(hx, dyL, hx - 3, dyL + 7, hx + 4, dyL + 6, C.uiW);
  }

  const dxHi = Math.round(x * 2 - (spr.w >> 1));
  const dyHi = Math.round((y + 1 + bob) * 2 - spr.h);
  fb.blitSpriteHi(spr, dxHi, dyHi, flip);

  // Royal crowns & RPG role props
  if (who === 'doubao') {
    drawTinyTiara(fb, Math.round(x), dyL - 2, false);
  } else if (who === 'claude') {
    drawTinyTiara(fb, Math.round(x), dyL - 3, true);
  } else if (who === 'kimi' && pose === 'scribe') {
    const px = Math.round(x + facing * 8), py = dyL + 22;
    fb.rect(px - 3, py, 6, 5, C.parchment);
    fb.box(px - 4, py - 1, 8, 7, C.ink);
    if (t < 54.16) {
      fb.line(px, py - 1, px + facing * 5, py - 7, C.uiW);
    } else {
      fb.line(px, py, px + facing * 3, py - 3, C.uiW);
      fb.line(px + facing * 4, py + 3, px + facing * 7, py + 6, C.uiW);
    }
  }
}

// Doubao Princess inside swinging Golden Birdcage!
export function drawDoubaoInCage(fb, cx, cy, t, shout = false, chainTop = 0) {
  const swing = Math.round(Math.sin(t * 2.6) * 3);
  const x = Math.round(cx + swing), y = Math.round(cy);
  const compact = (cy - chainTop) < 24 && chainTop > 0;

  if (compact) {
    if (y - 18 > chainTop) fb.vline(x, chainTop, y - 18, C.goldD);
    fb.ellipse(x, y - 2, 11, 15, C.ink);
    const spr = getBakedSprite('doubao_sm_0');
    if (spr) {
      const hL = spr.h >> 1;
      fb.blitSpriteHi(spr, x * 2 - (spr.w >> 1), (y + 12) * 2 - spr.h, false);
      drawTinyTiara(fb, x, y + 10 - hL, false);
    }
    fb.hline(x - 11, x + 11, y + 12, C.gold);
    fb.hline(x - 10, x + 10, y - 13, C.gold);
    fb.line(x - 10, y - 13, x, y - 19, C.goldL);
    fb.line(x + 10, y - 13, x, y - 19, C.gold);
    for (const bx of [-8, -4, 4, 8]) fb.vline(x + bx, y - 13, y + 12, C.goldD);
    return;
  }

  if (y - 26 > chainTop) {
    fb.vline(x - 1, chainTop, y - 26, C.ink);
    fb.vline(x, chainTop, y - 26, C.gold);
  }
  fb.ellipse(x, y - 2, 14, 21, C.ink);
  const bounce = shout ? -Math.abs(Math.round(Math.sin(t * 10) * 2)) : 0;
  const blink = mod(Math.floor(t * 3), 9) === 0;
  const spr = getBakedSprite(blink ? 'doubao_cage_1' : 'doubao_cage_0');
  if (spr) {
    const hL = spr.h >> 1;
    const syL = y + 17 - hL + bounce;
    fb.blitSpriteHi(spr, x * 2 - (spr.w >> 1), (y + 17 + bounce) * 2 - spr.h, false);
    drawTinyTiara(fb, x, syL - 2, false);
  }
  // Golden Cage Dome, Base & Parted Front Bars (auto-occlude hi-res Doubao cleanly!)
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

// —— 3. Towering High-Clarity GPT Dragon-Girl Boss (176px in 640×360 = 528px on 1080p!) ——
const DRAGON_CHARS = [...'昆图库塔卡提考特苏瓦西拉松'];

export function drawGptDragonBoss(fb, baseX, baseY, t, {
  litScales = 0,
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

  // 2) Towering 176px High-Clarity GPT Dragon-Girl Boss Sprite!
  const blink = mod(Math.floor(t * 2.5), 11) === 0;
  let sprKey;
  let flip = false;
  if (breathingFire) {
    sprKey = (Math.floor(t * 8) & 1) ? 'gpt_boss_cast1' : 'gpt_boss_cast0';
    flip = true; // Faces LEFT toward Whale-girl!
  } else if (rage) {
    sprKey = 'gpt_boss_rage';
  } else {
    sprKey = blink ? 'gpt_boss_blink' : 'gpt_boss_idle';
  }
  const bossSpr = getBakedSprite(sprKey);
  const bx = baseX - 6;
  const by = baseY + 6 + breathe;
  if (bossSpr) {
    fb.blitSpriteHi(bossSpr, bx * 2 - (bossSpr.w >> 1), by * 2 - bossSpr.h, flip);
  }

  // 3) 13 Lit Golden Scale Medallions arcing around her dragon aura!
  for (let i = 0; i < Math.min(13, litScales); i++) {
    const ang = Math.PI * 1.12 - (i / 12) * Math.PI * 1.24;
    const sx = Math.round(bx + Math.cos(ang) * 48);
    const sy = Math.round((by - 44) - Math.sin(ang) * 40);
    fb.disc(sx, sy, 6.5, C.ink);
    fb.disc(sx, sy, 5.5, i === litScales - 1 ? C.goldL : C.gold);
    drawTextPx(fb, sx - 4, sy - 4, DRAGON_CHARS[i], { size: 8, color: C.ink });
  }

  // 4) Roaring 12-fps Pixel Flamethrower unleashed straight from her outstretched hands!
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

// Flying Sky-Raid High-Clarity GPT Dragon-Girl for S03 & S05d Wanted Poster!
export function drawFlyingGptDragon(fb, x, y, t) {
  const flap = Math.round(Math.sin(t * 9) * 8);
  fb.tri(x + 2, y - 6, x + 28, y - 24 + flap, x + 20, y + 4, C.ink);
  fb.tri(x + 2, y - 6, x + 26, y - 22 + flap, x + 18, y + 3, C.dragV);
  fb.line(x + 2, y - 6, x + 26, y - 22 + flap, C.dragS, 2);
  fb.tri(x - 2, y - 6, x - 24, y - 22 - flap * 0.4, x - 14, y + 3, C.dragD);

  const spr = getBakedSprite((Math.floor(t * 6) & 1) ? 'gpt_fly_1' : 'gpt_fly_0');
  if (spr) {
    fb.blitSpriteHi(spr, Math.round(x * 2 - (spr.w >> 1)), Math.round(y * 2 - (spr.h >> 1)), true);
  }
}

// Monsters + Treasure Chest + 5 Inventory Gag Icons!
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
