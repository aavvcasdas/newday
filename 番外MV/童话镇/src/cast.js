// cast.js — 640×360 high-clarity light-pixel sprites of all 8 project AI-girls + Fairytale Town boats, beasts & props
// Strictly enforces cast rules: Whale = Protagonist/Map-hero/Mermaid, GPT = Dragon/Shadow-Wolf Boss, Claude = Princess (NEVER Doubao!), Doubao = Little Red Riding Hood.
import { FB, C, T, DARK, clamp, mod } from './px.js';
import { drawTextPx } from './glyphs.js';
import { getBakedSprite } from './sprites_data.js';

const portraitCache = new Map();

export function drawTinyTiara(fb, cx, topY, wide = true) {
  if (wide) {
    fb.tri(cx - 5, topY + 4, cx - 3, topY + 1, cx - 1, topY + 4, C.gold);
    fb.tri(cx - 2, topY + 4, cx, topY, cx + 2, topY + 4, C.goldL);
    fb.tri(cx + 1, topY + 4, cx + 3, topY + 1, cx + 5, topY + 4, C.gold);
    fb.hline(cx - 5, cx + 5, topY + 4, C.gold);
    fb.px(cx, topY + 3, C.scarf);
  } else {
    fb.tri(cx - 3, topY + 3, cx, topY, cx + 3, topY + 3, C.goldL);
    fb.hline(cx - 3, cx + 3, topY + 3, C.gold);
    fb.px(cx, topY + 2, C.cyan);
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

  const spr = getBakedSprite(bakeKey) || getBakedSprite('p_whale_neutral');
  p.blitSpriteHi(spr, 0, 0, false, null);

  // Princess crown ONLY on Claude (never Doubao!)
  if (who === 'claude') {
    drawTinyTiara(p, 16, 0, true);
  } else if (who === 'doubao') {
    // Little Red Riding Hood crimson hood arch!
    p.hline(8, 23, 2, C.scarf);
    p.hline(7, 24, 3, C.scarfD);
    p.vline(6, 4, 14, C.scarf);
    p.vline(25, 4, 14, C.scarf);
  }

  p.box(0, 0, 32, 32, C.ink);
  portraitCache.set(key, p);
  return p;
}

// Day13 Continuity Prop: Steaming "老大的白饭" Porcelain Bowl + Chopsticks
export function drawRiceBowl(fb, cx, cy, t, scale = 1) {
  const s = scale;
  const x = Math.round(cx), y = Math.round(cy);
  // Steaming white rice dome
  fb.ellipse(x, y - Math.round(4 * s), Math.round(6 * s), Math.round(3.5 * s), C.uiW);
  // Chopsticks resting diagonally
  fb.line(x + 1, y - Math.round(5 * s), x + Math.round(9 * s), y - Math.round(8 * s), C.gold, 1);
  fb.line(x + 2, y - Math.round(4 * s), x + Math.round(9 * s), y - Math.round(6 * s), C.tan, 1);
  // Porcelain bowl body with blue stripe
  fb.rect(x - Math.round(6 * s), y - Math.round(3 * s), Math.round(13 * s), Math.round(5 * s), C.uiW);
  fb.box(x - Math.round(7 * s), y - Math.round(3 * s), Math.round(15 * s), Math.round(5 * s), C.ink);
  fb.hline(x - Math.round(6 * s), x + Math.round(6 * s), y - Math.round(1 * s), C.blue);
  fb.rect(x - Math.round(3 * s), y + Math.round(2 * s), Math.round(7 * s), Math.max(1, Math.round(2 * s)), C.silver);
  // Rising pixel steam puffs
  const up = mod(Math.floor(t * 5), 5);
  fb.px(x - 2, y - Math.round(7 * s) - up, C.uiW);
  fb.px(x + 2, y - Math.round(6 * s) - ((up + 2) % 5), C.uiW);
}

// Main Protagonist: Whale-Girl (640×360 light-pixel clarity!)
export function drawWhaleHero(fb, x, y, t, {
  pose = 'idle',      // idle | run | shout | think | happy | ride | swim
  facing = 1,
  scarfLen = 20,
  scale = 1,
  lantern = false,
  mermaidGlow = false,
} = {}) {
  const step8 = Math.floor(t * 8);
  const blink = mod(Math.floor(t * 3.1), 11) === 0;

  let sprKey;
  if (scale >= 2) {
    if (pose === 'shout') sprKey = 'whale_big_point';
    else if (pose === 'happy') sprKey = 'whale_big_wave';
    else sprKey = blink ? 'whale_big_blink' : 'whale_big_idle';
  } else if (pose === 'run' || pose === 'swim') {
    sprKey = `whale_walk_${mod(step8, 4)}`;
  } else if (pose === 'ride') {
    sprKey = `whale_walk_${(step8 & 1) ? 1 : 3}`;
  } else if (pose === 'shout') {
    sprKey = 'whale_point';
  } else if (pose === 'happy') {
    sprKey = 'whale_wave';
  } else {
    sprKey = blink ? 'whale_blink' : 'whale_idle';
  }

  const spr = getBakedSprite(sprKey);
  if (!spr) return;

  const bob = pose === 'swim'
    ? Math.round(Math.sin(t * 3.4) * 3)
    : (pose === 'run' || pose === 'ride')
      ? (step8 & 1 ? -1 : 0)
      : (Math.floor(t * 2.2) & 1 ? 0 : -1);
  const flip = facing < 0;
  const hL = spr.h >> 1;
  const dyL = Math.round(y - hL + 1 + bob);

  // Shimmering Mermaid/Ocean Fin Aura when in Little Mermaid / Deep Sea scenes!
  if (mermaidGlow) {
    const sc = scale >= 2 ? 1.7 : 1;
    const tx = Math.round(x - facing * 11 * sc);
    const ty = Math.round(y - 5 * sc + bob + Math.sin(t * 5) * 2);
    fb.ellipse(tx, ty, 7 * sc, 3.5 * sc, C.cyan);
    fb.tri(tx - facing * 5 * sc, ty, tx - facing * 12 * sc, ty - 5 * sc, tx - facing * 10 * sc, ty + 5 * sc, C.whaleL);
    if (Math.floor(t * 8) & 1) fb.px(tx - facing * 8 * sc, ty - 2, C.goldL);
  }

  // Protected Hero Red Scarf streaming in the river breeze
  if (scarfLen > 0) {
    const collarY = scale >= 2 ? (dyL + 41) : (dyL + 24);
    const dir = -facing;
    const anchorX = Math.round(x + dir * (scale >= 2 ? 4 : 2));
    const stepWave = Math.floor(t * 11);
    let prevX = anchorX, prevY = collarY;
    const segs = Math.max(4, Math.round(scarfLen / 3));
    const thick = scale >= 2 ? 3 : 2;
    for (let i = 1; i <= segs; i++) {
      const u = i / segs;
      const wx = anchorX + dir * i * 3 * (scale >= 2 ? 1.35 : 1);
      const wy = collarY + Math.round(Math.sin(stepWave * 0.5 - i * 0.65) * (1.3 + u * 3.0));
      fb.line(prevX, prevY, wx, wy, C.ink, thick + 2);
      fb.line(prevX, prevY, wx, wy, i % 3 === 0 ? C.scarfL : C.scarf, thick);
      prevX = wx; prevY = wy;
    }
  }

  // Blit 640×360 hi-res Whale-girl sprite
  const dxHi = Math.round(x * 2 - (spr.w >> 1));
  const dyHi = Math.round((y + 1 + bob) * 2 - spr.h);
  fb.blitSpriteHi(spr, dxHi, dyHi, flip, null);

  // Starlight Guide Lantern held forward
  if (lantern) {
    const lx = Math.round(x + facing * (scale >= 2 ? 18 : 11));
    const ly = Math.round(y - (scale >= 2 ? 30 : 18) + bob);
    fb.line(Math.round(x + facing * 6), ly - 2, lx, ly - 3, C.dbrown, 1);
    fb.disc(lx, ly + 2, 4.5, C.gold);
    fb.disc(lx, ly + 2, 2.5, C.goldL);
    fb.box(lx - 2, ly, 5, 5, C.ink);
  }
}

// Chibi Map Whale-Girl Sprite (56px in 640×360 = 28px on 320×180 maps! Used on ALL Overhead Maps & Desk Intro!)
export function drawMapWhaleHero(fb, x, y, t, {
  pose = 'run',       // run | jump | wave
  facing = 1,
  scarfLen = 13,
} = {}) {
  const step10 = Math.floor(t * 10);
  const sprKey = pose === 'wave' ? 'whale_map_pt' : `whale_map_${mod(step10, 4)}`;
  const spr = getBakedSprite(sprKey);
  if (!spr) return;

  const jumpOff = pose === 'jump' ? -Math.abs(Math.round(Math.sin(t * 9) * 5)) : (step10 & 1 ? -1 : 0);
  const collarY = Math.round(y - 12 + jumpOff);
  const dir = -facing;
  let px = Math.round(x + dir * 2), py = collarY;
  const segs = Math.max(3, Math.round(scarfLen / 3));
  for (let i = 1; i <= segs; i++) {
    const wx = Math.round(x + dir * (2 + i * 3));
    const wy = collarY + Math.round(Math.sin(t * 13 - i * 0.8) * 1.8);
    fb.line(px, py, wx, wy, C.ink, 3);
    fb.line(px, py, wx, wy, i % 2 ? C.scarf : C.scarfL, 2);
    px = wx; py = wy;
  }

  const dxHi = Math.round(x * 2 - (spr.w >> 1));
  const dyHi = Math.round((y + 1 + jumpOff) * 2 - spr.h);
  fb.blitSpriteHi(spr, dxHi, dyHi, facing < 0);
}

// Signature Fairytale Town Origami Paper Boat ("星光折纸船") with optional Whale-Girl aboard!
export function drawPaperBoat(fb, x, y, t, {
  scale = 1,
  withWhale = false,
  chibiWhale = false,
  facing = 1,
  reflection = true,
  glowOrb = true,
} = {}) {
  const bob = Math.round(Math.sin(t * 2.8 + x * 0.05) * 1.5);
  const bx = Math.round(x);
  const by = Math.round(y + bob);
  const hw = Math.round(18 * scale);
  const hh = Math.round(7 * scale);
  const sailH = Math.round(15 * scale);

  // Soft water reflection underneath hull
  if (reflection) {
    for (let ry = 2; ry <= Math.max(3, Math.round(6 * scale)); ry += 2) {
      const rw = Math.max(3, hw - ry * 2 + Math.round(Math.sin(t * 5 + ry) * 2));
      fb.hline(bx - rw, bx + rw, by + ry, ry === 2 ? C.parchment : C.silver);
    }
  }

  // Optional Whale-girl passenger standing right inside the paper boat!
  if (withWhale) {
    if (chibiWhale) {
      drawMapWhaleHero(fb, bx - Math.round(2 * facing), by - Math.round(2 * scale), t, { pose: 'wave', facing, scarfLen: 11 });
    } else {
      drawWhaleHero(fb, bx - Math.round(3 * facing), by + 2, t, { pose: 'happy', facing, scarfLen: 16 });
    }
  }

  // Crisp Origami Paper Hull + Center Peak Sail (occludes lower ankles so Whale stands IN boat!)
  fb.tri(bx - hw, by - hh, bx + hw, by - hh, bx + Math.round(hw * 0.65), by + 1, C.parchment);
  fb.tri(bx - hw, by - hh, bx + Math.round(hw * 0.65), by + 1, bx - Math.round(hw * 0.65), by + 1, C.sand);
  // Center origami fold peak
  fb.tri(bx - Math.round(hw * 0.42), by - hh, bx + Math.round(hw * 0.42), by - hh, bx, by - sailH, C.uiW);
  fb.tri(bx, by - hh, bx + Math.round(hw * 0.42), by - hh, bx, by - sailH, C.parchment);
  // Fold crisp pixel outlines
  fb.line(bx - hw, by - hh, bx - Math.round(hw * 0.65), by + 1, C.dbrown);
  fb.line(bx + hw, by - hh, bx + Math.round(hw * 0.65), by + 1, C.dbrown);
  fb.hline(bx - Math.round(hw * 0.65), bx + Math.round(hw * 0.65), by + 1, C.dbrown);
  fb.line(bx - hw, by - hh, bx + hw, by - hh, C.tan);

  // Warm golden firefly/lantern orb hovering at the bow (homage to 童话镇.mp4!)
  if (glowOrb) {
    const ox = bx + facing * (hw + Math.round(3 * scale));
    const oy = by - hh - Math.round(3 * scale) + Math.round(Math.sin(t * 5) * 1);
    fb.disc(ox, oy, Math.max(2, 3.2 * scale), C.gold);
    fb.disc(ox, oy, Math.max(1, 1.6 * scale), C.goldL);
  }
}

// Supporting Cast High-Clarity Sprites with Fairytale Roles
// Strictly: Claude = Princess (crown), Doubao = Little Red Riding Hood (crimson cloak, NO crown!)
export function drawCastSprite(fb, x, y, who, t, {
  pose = 'idle',      // idle | walk | cheer | panic
  facing = 1,
  role = 'default',   // default | princess | redhood | hatter | alice | cinderella | harp | sage
  big = false,
} = {}) {
  const blink = mod(Math.floor(t * 2.7 + x * 0.13), 10) === 0;
  const bob = pose === 'cheer'
    ? -Math.abs(Math.round(Math.sin(t * 8.0) * 2.5))
    : (pose === 'walk' || pose === 'panic')
      ? (Math.floor(t * 10) & 1 ? -1 : 0)
      : (Math.floor(t * 2) & 1 ? 0 : -1);

  let sprKey;
  let useSide = false;
  if (who === 'doubao') {
    sprKey = big ? (blink ? 'doubao_cage_1' : 'doubao_cage_0') : (blink ? 'doubao_sm_1' : 'doubao_sm_0');
  } else if (who === 'gpt') {
    sprKey = (Math.floor(t * 6) & 1) ? 'gpt_fly_1' : 'gpt_fly_0';
    useSide = true;
  } else if (who === 'claude') {
    // The baked closed-eye frame is used as a sleeping pose only when the story calls for it.
    sprKey = pose === 'sleep' ? 'claude_front_1' : (blink ? 'claude_front_1' : 'claude_front_0');
  } else if (who === 'kimi' || who === 'gemini' || who === 'zai' || who === 'qwen') {
    if (pose === 'walk' || pose === 'panic') {
      sprKey = `${who}_side_${Math.floor(t * (pose === 'panic' ? 11 : 6)) & 1}`;
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
  const rx = Math.round(x);
  const ry = Math.round(y);
  const dyL = Math.round(ry - hL + 1 + bob);

  // Behind-sprite role capes / accessories:
  // Doubao as Little Red Riding Hood: flowing crimson cloak behind her shoulders!
  if (who === 'doubao' && (role === 'redhood' || role === 'default')) {
    const sway = Math.round(Math.sin(t * 5.5) * 3);
    fb.tri(rx, dyL + 5, rx - 12 - sway, ry - 1, rx + 12 - sway, ry - 1, C.scarfD);
    fb.tri(rx, dyL + 6, rx - 10 - sway, ry - 2, rx + 10 - sway, ry - 2, C.scarf);
    // Red hood halo framing chestnut hair (NEVER a tiara!)
    fb.disc(rx, dyL + 7, big ? 11 : 8.5, C.scarf);
  }

  // Blit 640×360 hi-res character sprite
  const dxHi = Math.round(rx * 2 - (spr.w >> 1));
  const dyHi = Math.round((ry + 1 + bob) * 2 - spr.h);
  fb.blitSpriteHi(spr, dxHi, dyHi, flip);

  // Foreground role accessories:
  if (who === 'claude') {
    // Claude is ALWAYS the Royal Princess (Snow White / Sleeping Beauty / Castle Princess)!
    drawTinyTiara(fb, rx, dyL - 3, true);
    if (role === 'butterfly') {
      // Playful golden butterfly net / wand
      const wx = rx + facing * 12, wy = dyL + 18;
      fb.line(rx + facing * 6, dyL + 24, wx, wy, C.goldD, 1);
      fb.ellipse(wx + facing * 2, wy - 3, 4, 3, C.goldL);
    }
  } else if (who === 'doubao' && (role === 'redhood' || role === 'default')) {
    // Hood top arch + golden clasp at collar + cute wicker basket!
    fb.hline(rx - (big ? 7 : 5), rx + (big ? 7 : 5), dyL - 1, C.scarf);
    fb.px(rx, dyL + (big ? 19 : 13), C.goldL);
    const bx = rx + facing * (big ? 11 : 8), by = ry - 8 + bob;
    fb.rect(bx - 3, by, 7, 5, C.tan);
    fb.box(bx - 3, by, 7, 5, C.dbrown);
    fb.hline(bx - 2, bx + 2, by - 2, C.dbrown);
  } else if (who === 'qwen' && role === 'hatter') {
    // Whimsical Mad Hatter pixel top-hat!
    fb.hline(rx - 8, rx + 8, dyL, C.ink);
    fb.rect(rx - 5, dyL - 8, 11, 8, C.plum);
    fb.box(rx - 5, dyL - 8, 11, 8, C.ink);
    fb.hline(rx - 4, rx + 4, dyL - 2, C.gold);
  } else if (who === 'gemini' && role === 'alice') {
    // Alice sky-blue hair bow!
    fb.tri(rx, dyL, rx - 6, dyL - 3, rx - 5, dyL + 2, C.cyan);
    fb.tri(rx, dyL, rx + 6, dyL - 3, rx + 5, dyL + 2, C.cyan);
    fb.px(rx, dyL, C.uiW);
  } else if (who === 'zai' && role === 'harp') {
    // Radiant Golden Magic Harp!
    const hx = rx + facing * 11, hy = dyL + 16;
    fb.line(hx - 3, hy + 8, hx - 3, hy - 5, C.gold, 2);
    fb.line(hx - 3, hy + 8, hx + 5, hy + 6, C.gold, 2);
    fb.line(hx - 3, hy - 5, hx + 5, hy - 2, C.goldL, 1);
    fb.vline(hx, hy - 4, hy + 7, C.uiW);
    fb.vline(hx + 2, hy - 3, hy + 6, C.uiW);
  } else if (who === 'kimi' && (role === 'cinderella' || role === 'sage')) {
    // Twinkling crescent starlight beside Kimi
    const sx = rx + facing * 12, sy = dyL + 10 + Math.round(Math.sin(t * 5) * 2);
    fb.px(sx, sy - 2, C.cyan);
    fb.hline(sx - 2, sx + 2, sy, C.uiW);
    fb.px(sx, sy + 2, C.cyan);
  }
}

// Towering GPT Dragon-Girl Boss / Forest Wolf-Dragon Shadow!
export function drawGptDragonBoss(fb, baseX, baseY, t, {
  shadowMode = false,
  hoard = true,
} = {}) {
  const breathe = Math.round(Math.sin(t * 2.8) * 1);
  if (hoard && !shadowMode) {
    fb.ellipse(baseX - 4, baseY + 5, 38, 8, C.goldD);
    fb.ellipse(baseX - 5, baseY + 3, 30, 5, C.gold);
  }
  const blink = mod(Math.floor(t * 2.5), 11) === 0;
  const bossSpr = getBakedSprite(blink ? 'gpt_boss_blink' : 'gpt_boss_idle');
  const bx = Math.round(baseX - 6);
  const by = Math.round(baseY + 5 + breathe);
  if (bossSpr) {
    fb.blitSpriteHi(bossSpr, bx * 2 - (bossSpr.w >> 1), by * 2 - bossSpr.h, true, shadowMode ? DARK : null);
  }
  if (shadowMode) {
    // Piercing glowing ruby dragon-wolf eyes in the dark pine forest!
    fb.rect(bx - 7, by - 64, 3, 2, C.scarf);
    fb.rect(bx + 1, by - 64, 3, 2, C.scarf);
  }
}

export function drawFlyingGptDragon(fb, x, y, t, facing = -1) {
  const flap = Math.round(Math.sin(t * 8.5) * 7);
  fb.tri(x + 2, y - 5, x + 26, y - 22 + flap, x + 18, y + 3, C.ink);
  fb.tri(x + 2, y - 5, x + 24, y - 20 + flap, x + 16, y + 2, C.dragV);
  fb.tri(x - 2, y - 5, x - 22, y - 20 - flap * 0.4, x - 13, y + 2, C.dragD);
  const spr = getBakedSprite((Math.floor(t * 6) & 1) ? 'gpt_fly_1' : 'gpt_fly_0');
  if (spr) {
    fb.blitSpriteHi(spr, Math.round(x * 2 - (spr.w >> 1)), Math.round(y * 2 - (spr.h >> 1)), facing < 0);
  }
}

// Verse 1 L04: Ugly Duckling -> Crowned White Swan Transformation!
export function drawSwanMorph(fb, x, y, t, morphU) {
  const bob = Math.round(Math.sin(t * 4) * 1);
  const sx = Math.round(x), sy = Math.round(y + bob);
  if (morphU < 0.48) {
    // Little ruffled gray duckling paddling eagerly
    fb.ellipse(sx, sy, 6, 4, C.slate);
    fb.disc(sx + 5, sy - 4, 3, C.slate);
    fb.rect(sx + 7, sy - 4, 3, 2, C.amber);
    fb.px(sx + 5, sy - 5, C.uiW);
  } else {
    // Graceful White Swan with S-curved neck & tiny gold crown!
    fb.ellipse(sx, sy, 10, 5, C.uiW);
    fb.tri(sx - 10, sy - 1, sx - 14, sy - 5, sx - 6, sy - 4, C.silver);
    fb.line(sx + 7, sy - 2, sx + 10, sy - 10, C.uiW, 2);
    fb.disc(sx + 10, sy - 11, 2.5, C.uiW);
    fb.rect(sx + 12, sy - 11, 3, 2, C.orange);
    fb.px(sx + 10, sy - 14, C.goldL);
  }
  // Golden transformation sparkles around morphing moment
  const glow = 1 - Math.min(1, Math.abs(morphU - 0.5) * 3.5);
  if (glow > 0.05) {
    for (let i = 0; i < 8; i++) {
      const a = t * 5 + i * 0.785;
      const r = 6 + (1 - glow) * 14;
      fb.px(sx + Math.cos(a) * r, sy - 4 + Math.sin(a) * r * 0.7, i % 2 ? C.goldL : C.cyan);
    }
  }
}

// Verse 2 L23: Bounding Golden-Outlined Pixel Saber-Toothed Tiger ("草原有奔跑的剑齿虎")
export function drawSaberTiger(fb, x, y, t, phase = 0) {
  const f = mod(Math.floor(t * 11 + phase * 2), 4);
  const bob = (f === 1 || f === 3) ? -2 : 0;
  const tx = Math.round(x), ty = Math.round(y + bob);
  const stride = f === 0 ? -5 : f === 1 ? 2 : f === 2 ? 6 : -2;
  // Legs
  fb.line(tx - 8, ty - 4, tx - 11 + stride, ty + 3, C.gold, 2);
  fb.line(tx + 8, ty - 4, tx + 11 - stride, ty + 3, C.gold, 2);
  // Muscular dark-amber silhouette body with golden rim-light (homage to reference t=108s!)
  fb.ellipse(tx, ty - 6, 12, 5, C.goldL);
  fb.ellipse(tx, ty - 6, 10.5, 3.8, C.umber);
  // Whipping tail
  fb.line(tx - 11, ty - 7, tx - 17, ty - 11 + (f & 1 ? 2 : -1), C.gold, 1);
  // Fierce head + iconic white saber fangs!
  fb.disc(tx + 12, ty - 9, 4.2, C.goldL);
  fb.disc(tx + 12, ty - 9, 3.2, C.umber);
  fb.vline(tx + 14, ty - 7, ty - 3, C.uiW); // Long saber fang!
  fb.px(tx + 13, ty - 10, C.amber);
}

// Verse 2 L22: Blazing Golden Sunbird ("听说阿波罗变成金乌")
export function drawGoldenSunbird(fb, cx, cy, t) {
  const flap = Math.round(Math.sin(t * 8) * 6);
  // Radiant sun-halo rays
  for (let i = 0; i < 12; i++) {
    const a = i * (Math.PI / 6) + t * 0.6;
    const r1 = 14, r2 = (i % 2 === 0 ? 25 : 19);
    fb.line(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, cx + Math.cos(a) * r2, cy + Math.sin(a) * r2, C.gold, 1);
  }
  fb.disc(cx, cy, 12, C.amber);
  fb.disc(cx, cy, 9, C.goldL);
  // Sweeping golden wings + 3 mythic legs
  fb.tri(cx - 2, cy, cx - 26, cy - 12 + flap, cx - 12, cy + 5, C.goldL);
  fb.tri(cx + 2, cy, cx + 26, cy - 12 + flap, cx + 12, cy + 5, C.goldL);
  fb.tri(cx, cy - 3, cx, cy - 10, cx + 6, cy - 6, C.uiW);
  for (const lx of [-3, 0, 3]) fb.line(cx + lx, cy + 4, cx + lx - 1, cy + 11, C.orange, 1);
}

// Story emblems (Apple, Glass Slipper, Red Cloak, Star, Royal Crown, Whale Crest, Gear).
// The harp is a lyric-specific prop and is intentionally not part of recurring cast/celebration emblems.
export function drawStoryEmblem(fb, cx, cy, index) {
  const x = Math.round(cx), y = Math.round(cy);
  if (index === 0) {
    // Snow White Red Apple
    fb.disc(x, y + 1, 4.2, C.scarf);
    fb.px(x - 1, y - 1, C.uiW);
    fb.vline(x, y - 5, y - 3, C.dbrown);
    fb.hline(x + 1, x + 3, y - 4, C.lime);
  } else if (index === 1) {
    // Cinderella Crystal Glass Slipper
    fb.line(x - 4, y + 3, x + 4, y + 3, C.cyan, 2);
    fb.line(x - 3, y + 2, x + 2, y - 2, C.uiW, 2);
    fb.vline(x - 3, y + 1, y + 4, C.cyan);
  } else if (index === 2) {
    // Little Red Riding Hood Crimson Cloak
    fb.disc(x, y - 3, 2.5, C.scarf);
    fb.tri(x, y - 2, x - 5, y + 4, x + 5, y + 4, C.scarf);
    fb.px(x, y - 1, C.goldL);
  } else if (index === 3) {
    // A generic story-star, not a harp silhouette.
    fb.line(x, y - 5, x, y + 5, C.goldL, 2);
    fb.line(x - 5, y, x + 5, y, C.goldL, 2);
    fb.line(x - 3, y - 3, x + 3, y + 3, C.uiW);
    fb.line(x + 3, y - 3, x - 3, y + 3, C.gold);
  } else if (index === 4) {
    // Princess Claude's Royal Crown
    drawTinyTiara(fb, x, y - 2, true);
  } else if (index === 5) {
    // Protagonist Whale Emblem
    fb.ellipse(x - 1, y + 1, 4.5, 3, C.whaleL);
    fb.tri(x + 3, y + 1, x + 6, y - 2, x + 6, y + 3, C.whaleM);
    fb.px(x - 3, y, C.ink);
    fb.px(x - 1, y - 3, C.cyan);
  } else {
    // Peter Pan's clocktower/neverland route marker: a simple gear, not costume.
    fb.disc(x, y, 5, C.goldD);
    fb.disc(x, y, 2, C.cyan);
    for (let a = 0; a < 8; a++) {
      const ang = a * Math.PI / 4;
      fb.px(x + Math.round(Math.cos(ang) * 6), y + Math.round(Math.sin(ang) * 6), C.goldL);
    }
  }
}
