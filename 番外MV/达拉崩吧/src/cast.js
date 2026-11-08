// cast.js — Pure-code 16-bit Pixel RPG sprites, 32×32 portraits, mounts, monsters, GPT Dragon-girl Boss & item icons
import { FB, C, T, clamp, mod } from './px.js';
import { drawTextPx } from './glyphs.js';

// —— 1. 32×32 Character Portraits (for RPG dialog boxes & Tarot cards, STYLE.md §2) ——
const portraitCache = new Map();

export function getPortrait(who, mood = 'neutral') {
  const key = `${who}:${mood}`;
  if (portraitCache.has(key)) return portraitCache.get(key);
  const p = new FB(32, 32);
  p.clear(T);

  if (who === 'whale') {
    const isCharred = mood === 'charred';
    const hairD = isCharred ? C.ink : C.whaleD;
    const hairM = isCharred ? C.dslate : C.whaleM;
    const hairL = isCharred ? C.slate : C.whaleL;
    const skin = isCharred ? C.dbrown : C.skin;
    // Back hair waves
    p.ellipse(16, 19, 12, 11, hairD);
    p.ellipse(16, 17, 11, 10, hairM);
    // Cowlick ahoge on top!
    p.line(15, 4, 18, 1, hairL);
    p.line(18, 1, 21, 3, hairM);
    // White frilly maid headband
    for (let x = 7; x <= 25; x += 2) p.disc(x, 7 + Math.abs(x - 16) * 0.18, 2, isCharred ? C.steel : C.white);
    // Cute whale-fin ear clips
    p.tri(3, 13, 7, 11, 6, 16, hairL);
    p.tri(29, 13, 25, 11, 26, 16, hairL);
    // Face
    p.ellipse(16, 18, 8, 7, skin);
    // Bangs
    p.ellipse(16, 11, 9, 4, hairM);
    p.tri(9, 11, 13, 11, 10, 16, hairL);
    p.tri(14, 11, 19, 11, 16, 16, hairM);
    p.tri(20, 11, 24, 11, 22, 16, hairL);
    // Eyes & mouth by mood
    if (mood === 'happy') {
      p.line(11, 17, 13, 16, C.ink); p.line(13, 16, 14, 17, C.ink);
      p.line(18, 17, 19, 16, C.ink); p.line(19, 16, 21, 17, C.ink);
      p.rect(14, 21, 5, 2, C.scarf);
    } else if (mood === 'shock' || mood === 'charred') {
      p.disc(12, 17, 2.2, C.uiW); p.px(12, 17, C.ink);
      p.disc(20, 17, 2.2, C.uiW); p.px(20, 17, C.ink);
      p.rect(15, 21, 3, 3, C.ink);
      if (!isCharred) { p.vline(24, 14, 17, C.cyan); p.px(24, 18, C.uiW); }
    } else if (mood === 'think') {
      p.rect(11, 16, 2, 3, C.whaleD); p.px(12, 16, C.uiW);
      p.rect(19, 16, 2, 3, C.whaleD); p.px(20, 16, C.uiW);
      p.hline(15, 17, 21, C.rust);
    } else if (mood === 'shout') {
      p.line(10, 14, 14, 15, C.ink); p.line(22, 14, 18, 15, C.ink);
      p.rect(11, 16, 3, 3, C.whaleD); p.px(11, 16, C.uiW);
      p.rect(19, 16, 3, 3, C.whaleD); p.px(19, 16, C.uiW);
      p.rect(14, 20, 5, 4, C.crimson); p.hline(15, 17, 20, C.uiW);
    } else {
      p.rect(11, 16, 3, 3, C.whaleD); p.px(11, 16, C.uiW); p.px(12, 18, C.whaleL);
      p.rect(19, 16, 3, 3, C.whaleD); p.px(19, 16, C.uiW); p.px(20, 18, C.whaleL);
      p.px(10, 19, C.pink); p.px(22, 19, C.pink);
      p.hline(15, 17, 21, C.crimson);
    }
    // Protected Red Hero Scarf around neck!
    p.rect(8, 25, 16, 5, C.scarf);
    p.hline(8, 23, 25, C.scarfL);
    p.rect(19, 27, 7, 4, C.scarfD);
  } else if (who === 'claude') {
    // Orange-amber royal curls + golden sunflower crown
    p.ellipse(16, 20, 12, 11, C.rust);
    p.ellipse(16, 18, 11, 9, C.orange);
    p.disc(7, 22, 4, C.amber); p.disc(25, 22, 4, C.amber);
    // Golden Crown
    p.tri(10, 7, 12, 2, 14, 7, C.gold);
    p.tri(14, 7, 16, 1, 18, 7, C.goldL);
    p.tri(18, 7, 20, 2, 22, 7, C.gold);
    p.rect(10, 6, 13, 3, C.gold);
    p.px(16, 6, C.scarf);
    // Face
    p.ellipse(16, 18, 7.5, 6.8, mood === 'petrified' ? C.silver : C.skin);
    p.ellipse(16, 11, 8, 3.2, C.amber);
    if (mood === 'petrified') {
      p.disc(12, 17, 2, C.uiW); p.px(12, 17, C.ink);
      p.disc(20, 17, 2, C.uiW); p.px(20, 17, C.ink);
      p.rect(14, 21, 4, 3, C.ink);
      p.vline(9, 13, 16, C.slate); p.vline(23, 13, 16, C.slate);
    } else if (mood === 'dizzy') {
      p.box(10, 15, 4, 4, C.ink); p.px(12, 17, C.amber);
      p.box(18, 15, 4, 4, C.ink); p.px(20, 17, C.amber);
      p.line(14, 21, 18, 22, C.crimson);
    } else {
      p.rect(11, 16, 3, 3, C.rust); p.px(11, 16, C.uiW); p.px(12, 18, C.amber);
      p.rect(19, 16, 3, 3, C.rust); p.px(19, 16, C.uiW); p.px(20, 18, C.amber);
      p.hline(14, 18, 21, C.crimson);
    }
    // Royal gown collar
    p.rect(8, 25, 16, 6, C.dbrown);
    p.rect(12, 25, 8, 6, C.sand);
    p.px(16, 27, C.gold);
  } else if (who === 'gpt') {
    // Silver-white Dragon-girl + curved horns + amethyst/rage eyes
    p.ellipse(16, 20, 12, 11, C.dragM);
    p.ellipse(16, 18, 11, 10, C.dragS);
    // Curved Dragon Horns!
    p.line(9, 9, 5, 3, C.goldL, 2); p.line(5, 3, 8, 1, C.dragS);
    p.line(23, 9, 27, 3, C.goldL, 2); p.line(27, 3, 24, 1, C.dragS);
    // Face
    p.ellipse(16, 18, 7.5, 6.8, C.skin);
    p.ellipse(16, 11, 8.5, 3.5, C.dragS);
    if (mood === 'haughty') {
      p.hline(10, 14, 17, C.dragD);
      p.hline(18, 22, 17, C.dragD);
      p.line(14, 21, 18, 20, C.plum);
    } else if (mood === 'rage') {
      p.line(10, 14, 14, 16, C.crimson); p.line(22, 14, 18, 16, C.crimson);
      p.rect(11, 16, 3, 3, C.scarf); p.px(12, 17, C.goldL);
      p.rect(19, 16, 3, 3, C.scarf); p.px(20, 17, C.goldL);
      p.rect(13, 20, 6, 4, C.crimson); p.px(14, 20, C.uiW); p.px(18, 20, C.uiW);
    } else {
      p.rect(11, 16, 3, 3, C.dragV); p.px(11, 16, C.uiW);
      p.rect(19, 16, 3, 3, C.dragV); p.px(19, 16, C.uiW);
      p.hline(14, 18, 21, C.rose);
    }
    p.rect(9, 25, 14, 6, C.dragS);
    p.tri(4, 24, 9, 26, 5, 30, C.dragV);
    p.tri(28, 24, 23, 26, 27, 30, C.dragV);
  } else if (who === 'doubao') {
    // Chestnut-brown short bob + tiny princess crown + classic black top
    p.ellipse(16, 16, 10, 9, C.dbrown);
    p.ellipse(16, 15, 9, 8, C.brown);
    // Tiny Gold Princess Tiara
    p.tri(13, 6, 16, 2, 19, 6, C.gold);
    p.hline(12, 20, 6, C.goldL);
    p.px(16, 5, C.scarf);
    // Face
    p.ellipse(16, 18, 7, 6.5, C.skin);
    // Side-parted brown bob bangs
    p.tri(8, 10, 18, 10, 9, 18, C.dbrown);
    p.tri(17, 10, 24, 10, 23, 18, C.brown);
    if (mood === 'shout') {
      p.rect(11, 16, 2, 3, C.dbrown); p.px(11, 16, C.uiW);
      p.rect(19, 16, 2, 3, C.dbrown); p.px(19, 16, C.uiW);
      p.rect(14, 20, 4, 3, C.crimson);
    } else {
      p.rect(11, 16, 2, 3, C.dbrown); p.px(11, 16, C.uiW);
      p.rect(19, 16, 2, 3, C.dbrown); p.px(19, 16, C.uiW);
      p.px(10, 19, C.pink); p.px(22, 19, C.pink);
      p.hline(14, 18, 21, C.crimson);
    }
    p.rect(10, 25, 12, 6, C.ink);
    p.line(11, 25, 20, 30, C.scarf);
  } else {
    // Supporting Kingdom Cast Portraits: Kimi, Gemini, Zai, Qwen
    const hair = who === 'kimi' ? C.navy : who === 'gemini' ? C.pink : who === 'zai' ? C.dslate : C.lavender;
    const dress = who === 'kimi' ? C.blue : who === 'gemini' ? C.cyan : who === 'zai' ? C.ink : C.plum;
    p.ellipse(16, 17, 10, 10, hair);
    if (who === 'gemini') p.ellipse(21, 17, 6, 9, C.cyan); // pink-blue gradient hair!
    p.ellipse(16, 18, 7, 6.5, C.skin);
    p.ellipse(16, 11, 8, 3.2, hair);
    if (who === 'gemini') p.rect(16, 9, 7, 4, C.cyan);
    if (who === 'kimi') { p.disc(10, 8, 2.5, C.gold); p.disc(11, 8, 1.8, C.navy); }
    if (who === 'gemini') p.disc(10, 8, 2.2, C.goldL);
    if (who === 'zai') p.hline(10, 22, 8, C.uiW);
    p.rect(11, 16, 2, 3, C.ink); p.px(11, 16, C.uiW);
    p.rect(19, 16, 2, 3, C.ink); p.px(19, 16, C.uiW);
    p.hline(14, 18, 21, C.crimson);
    p.rect(9, 25, 14, 6, dress);
    p.rect(14, 25, 4, 6, who === 'qwen' ? C.gold : C.uiW);
  }
  p.box(0, 0, 32, 32, C.ink);
  portraitCache.set(key, p);
  return p;
}

// —— 2. Full-Body Animated 16-bit Sprites ——

// Whale-girl Hero Sprite (~26×34 px + articulated tail & protected red scarf!)
export function drawWhaleHero(fb, x, y, t, {
  pose = 'idle',      // idle | run | shout | think | happy | sword | ride | charred
  facing = 1,         // 1 right, -1 left
  scarfLen = 22,
  scale = 1,
} = {}) {
  const step8 = Math.floor(t * 8);
  const bob = (pose === 'run' || pose === 'ride') ? (step8 & 1 ? -1 : 0) : (Math.floor(t * 2) & 1 ? 0 : -1);
  const isChar = pose === 'charred';
  const spr = new FB(48, 44);
  spr.clear(T);
  const cx = 24, fy = 38; // foot baseline inside spr

  // 1) Swaying Blue Whale Tail behind body!
  const tailWag = Math.round(Math.sin(t * 6) * 2);
  const tailCol = isChar ? C.dslate : C.whaleM;
  const tailDark = isChar ? C.ink : C.whaleD;
  spr.line(cx - 4, fy - 9, cx - 12, fy - 7 + tailWag, tailDark, 3);
  spr.line(cx - 4, fy - 10, cx - 12, fy - 8 + tailWag, tailCol, 2);
  spr.tri(cx - 12, fy - 8 + tailWag, cx - 17, fy - 13 + tailWag, cx - 14, fy - 7 + tailWag, tailCol);
  spr.tri(cx - 12, fy - 8 + tailWag, cx - 16, fy - 3 + tailWag, cx - 13, fy - 7 + tailWag, tailDark);

  // 2) Legs & shoes (8fps walk cycle)
  const legOff = pose === 'run' ? ((step8 % 4 === 0) ? 3 : (step8 % 4 === 2) ? -3 : 0) : 0;
  if (pose !== 'ride') {
    spr.rect(cx - 4 + legOff, fy - 5, 3, 4, C.white);
    spr.rect(cx + 1 - legOff, fy - 5, 3, 4, C.white);
    spr.rect(cx - 4 + legOff, fy - 2, 4, 2, C.navy);
    spr.rect(cx + 1 - legOff, fy - 2, 4, 2, C.navy);
  } else {
    spr.rect(cx + 1, fy - 7, 3, 5, C.white);
    spr.rect(cx + 2, fy - 3, 4, 2, C.navy);
  }

  // 3) Navy & White Maid-Knight Dress + Whale Apron
  const by = fy + bob;
  spr.tri(cx - 8, by - 5, cx + 8, by - 5, cx, by - 16, isChar ? C.ink : C.navy);
  spr.hline(cx - 7, cx + 7, by - 5, isChar ? C.slate : C.white);
  spr.rect(cx - 4, by - 14, 8, 8, isChar ? C.steel : C.white); // apron
  spr.px(cx, by - 9, C.whaleM); spr.px(cx - 1, by - 9, C.whaleL); // tiny whale mark

  // 4) Back Hair & Head
  const hy = by - 22;
  spr.ellipse(cx - 1, hy + 3, 8, 8, isChar ? C.ink : C.whaleD);
  spr.ellipse(cx, hy + 1, 7, 6, isChar ? C.dslate : C.whaleM);
  // Cowlick ahoge
  spr.line(cx, hy - 7, cx + 2, hy - 10, isChar ? C.slate : C.whaleL);
  // Frilly white headband + whale-fin side clips
  spr.hline(cx - 5, cx + 5, hy - 5, isChar ? C.steel : C.white);
  spr.tri(cx - 9, hy, cx - 6, hy - 2, cx - 6, hy + 2, C.whaleL);
  // Face
  spr.ellipse(cx + 1, hy + 1, 5, 4.5, isChar ? C.dbrown : C.skin);
  spr.hline(cx - 3, cx + 5, hy - 3, isChar ? C.dslate : C.whaleM);
  if (pose === 'happy') {
    spr.px(cx, hy + 1, C.ink); spr.px(cx + 4, hy + 1, C.ink);
    spr.px(cx + 2, hy + 3, C.scarf);
  } else if (pose === 'charred' || pose === 'shock') {
    spr.rect(cx - 1, hy, 2, 2, C.uiW); spr.rect(cx + 3, hy, 2, 2, C.uiW);
  } else {
    spr.rect(cx, hy, 1, 2, C.whaleD); spr.rect(cx + 4, hy, 1, 2, C.whaleD);
    if (pose === 'shout') spr.rect(cx + 2, hy + 3, 2, 2, C.scarf);
  }

  // 5) Arms & Holy Sword!
  if (pose === 'sword' || pose === 'shout' || pose === 'ride') {
    const slash = pose === 'sword' ? Math.sin(t * 14) * 0.5 : -0.7;
    const sx1 = cx + 5, sy1 = by - 12;
    const sx2 = sx1 + Math.round(Math.cos(slash) * 14), sy2 = sy1 + Math.round(Math.sin(slash) * 14);
    spr.line(sx1, sy1, sx2, sy2, C.uiW, 2);
    spr.line(sx1, sy1, sx2, sy2, C.goldL, 1);
    spr.rect(sx1 - 1, sy1 - 2, 3, 4, C.gold);
  } else if (pose === 'happy') {
    spr.line(cx + 4, by - 12, cx + 8, by - 17, C.skin, 2);
    spr.px(cx + 8, by - 18, C.goldL);
  } else if (pose === 'think') {
    spr.line(cx + 3, by - 11, cx + 4, hy + 4, C.skin, 2);
  }

  // 6) Neck wrap of Protected Hero Red Scarf
  spr.rect(cx - 4, by - 15, 9, 3, C.scarf);
  spr.hline(cx - 4, cx + 4, by - 15, C.scarfL);

  // Blit sprite with 1px ink outline (supports 1× or 2× integer zoom for close-ups!)
  if (scale === 1) {
    fb.blit(spr, x - 24, y - 38, facing < 0, C.ink);
  } else {
    for (let py = 0; py < spr.h; py++) {
      for (let px = 0; px < spr.w; px++) {
        const c = spr.d[py * spr.w + (facing < 0 ? spr.w - 1 - px : px)];
        if (c === T) continue;
        fb.rect(x + (px - 24) * scale, y + (py - 38) * scale, scale, scale, c);
      }
    }
  }

  // 7) Dynamic Protected-Red Long Flowing Scarf streaming behind hero!
  const dir = -facing;
  const anchorX = x + dir * 3 * scale;
  const anchorY = y - 14 * scale + bob * scale;
  const stepWave = Math.floor(t * 12);
  let prevX = anchorX, prevY = anchorY;
  const segs = Math.max(4, Math.round(scarfLen / 3));
  for (let i = 1; i <= segs; i++) {
    const u = i / segs;
    const wx = anchorX + dir * i * 3 * scale;
    const wy = anchorY + Math.round(Math.sin(stepWave * 0.55 - i * 0.65) * (1.5 + u * 3.5)) - (pose === 'idle' ? -i * 0.4 : 0);
    fb.line(prevX, prevY, wx, wy, C.ink, 3 * scale);
    fb.line(prevX, prevY, wx, wy, i % 3 === 0 ? C.scarfL : C.scarf, Math.max(2, 2 * scale));
    prevX = wx; prevY = wy;
  }
}

// Snow-White Pixel Steed (8fps gallop cycle)
export function drawWhiteHorse(fb, x, y, t, facing = 1) {
  const f = mod(Math.floor(t * 10), 4);
  const bob = (f === 1 || f === 3) ? -2 : 0;
  const spr = new FB(46, 34);
  spr.clear(T);
  // Legs (gallop phases)
  const lA = f === 0 ? -4 : f === 1 ? 2 : f === 2 ? 5 : -1;
  const lB = -lA;
  spr.line(14, 21 + bob, 11 + lA, 31, C.silver, 2);
  spr.line(18, 21 + bob, 16 + lB, 31, C.uiW, 2);
  spr.line(29, 21 + bob, 31 + lB, 31, C.silver, 2);
  spr.line(33, 21 + bob, 36 + lA, 31, C.uiW, 2);
  // Body, chest & saddle
  spr.ellipse(23, 18 + bob, 11, 5.5, C.uiW);
  spr.ellipse(23, 20 + bob, 10, 4, C.silver);
  spr.rect(19, 13 + bob, 8, 4, C.scarf);
  spr.hline(19, 26, 13 + bob, C.gold);
  // Flowing tail
  spr.line(12, 16 + bob, 5, 19 + (f & 1 ? -2 : 1), C.silver, 3);
  spr.line(12, 15 + bob, 6, 18 + (f & 1 ? -2 : 1), C.uiW, 2);
  // Neck & head
  spr.line(31, 17 + bob, 36, 8 + bob, C.uiW, 5);
  spr.ellipse(38, 8 + bob, 4.5, 3, C.uiW);
  spr.tri(35, 4 + bob, 37, 1 + bob, 38, 5 + bob, C.uiW);
  spr.px(39, 7 + bob, C.ink);
  spr.line(34, 8 + bob, 39, 10 + bob, C.gold); // golden bridle
  fb.blit(spr, x - 23, y - 32, facing < 0, C.ink);
}

// Supporting Cast Sprite (Claude Queen, Doubao Princess, Kimi, Gemini, Zai, Qwen)
export function drawCastSprite(fb, x, y, who, t, { pose = 'idle', facing = 1 } = {}) {
  const bob = pose === 'cheer' ? -Math.abs(Math.round(Math.sin(t * 9) * 3)) : (Math.floor(t * 2) & 1 ? 0 : -1);
  const spr = new FB(28, 34);
  spr.clear(T);
  const cx = 14, fy = 31 + bob;

  const cfg = {
    claude: { hairD: C.rust, hairM: C.orange, hairL: C.amber, dress: C.dbrown, trim: C.sand, crown: true },
    doubao: { hairD: C.dbrown, hairM: C.brown, hairL: C.tan, dress: C.ink, trim: C.scarf, crown: true, shortHair: true },
    kimi:   { hairD: C.ink, hairM: C.navy, hairL: C.blue, dress: C.white, trim: C.navy, moon: true },
    gemini: { hairD: C.whaleL, hairM: C.pink, hairL: C.lavender, dress: C.white, trim: C.whaleM, star: true },
    zai:    { hairD: C.ink, hairM: C.dslate, hairL: C.slate, dress: C.ink, trim: C.white, lace: true },
    qwen:   { hairD: C.plum, hairM: C.lavender, hairL: C.silver, dress: C.plum, trim: C.gold, cloak: true },
  }[who] || { hairD: C.brown, hairM: C.tan, hairL: C.sand, dress: C.blue, trim: C.white };

  // Hair back
  if (!cfg.shortHair) {
    spr.ellipse(cx, fy - 16, 7, 8, cfg.hairD);
    spr.ellipse(cx, fy - 18, 6.5, 6, cfg.hairM);
  } else {
    spr.ellipse(cx, fy - 19, 6, 5.5, cfg.hairD);
  }
  // Shoes
  spr.rect(cx - 3, fy - 2, 2, 2, who === 'doubao' ? C.white : C.ink);
  spr.rect(cx + 1, fy - 2, 2, 2, who === 'doubao' ? C.white : C.ink);
  // Outfit
  if (who === 'doubao') {
    spr.rect(cx - 3, fy - 7, 6, 5, C.dslate);
    spr.rect(cx - 4, fy - 13, 8, 6, C.ink);
    spr.line(cx - 3, fy - 13, cx + 3, fy - 8, C.scarf);
  } else {
    spr.tri(cx - 7, fy - 3, cx + 7, fy - 3, cx, fy - 15, cfg.dress);
    spr.hline(cx - 6, fy - 3 === fy ? cx : cx + 6, fy - 3, cfg.trim);
    spr.rect(cx - 2, fy - 13, 4, 8, cfg.trim);
  }
  // Face
  spr.ellipse(cx + 1, fy - 18, 4.5, 4.2, pose === 'petrified' ? C.silver : C.skin);
  spr.hline(cx - 3, cx + 4, fy - 21, cfg.hairM);
  if (who === 'gemini') spr.hline(cx + 1, cx + 5, fy - 21, C.pink);
  spr.px(cx, fy - 18, C.ink); spr.px(cx + 3, fy - 18, C.ink);

  // Signature headgear
  if (cfg.crown) {
    spr.tri(cx - 3, fy - 23, cx, fy - 27, cx + 3, fy - 23, C.gold);
    spr.hline(cx - 3, cx + 3, fy - 23, C.goldL);
  }
  if (cfg.moon) { spr.disc(cx - 4, fy - 22, 2, C.gold); spr.disc(cx - 3, fy - 22, 1.5, C.navy); }
  if (cfg.star) { spr.disc(cx - 4, fy - 22, 2, C.goldL); }
  if (cfg.lace) { spr.hline(cx - 4, cx + 4, fy - 23, C.white); }
  if (cfg.cloak) { spr.line(cx - 5, fy - 14, cx + 5, fy - 14, C.gold); }

  // Props by character
  if (who === 'kimi' && pose === 'scribe') {
    spr.rect(cx + 4, fy - 12, 5, 4, C.parchment);
    if (t < 54.2) spr.line(cx + 6, fy - 13, cx + 10, fy - 18, C.uiW);
    else { spr.line(cx + 6, fy - 12, cx + 8, fy - 14, C.uiW); spr.line(cx + 9, fy - 10, cx + 11, fy - 8, C.uiW); } // snapped quill!
  }
  if (who === 'zai') {
    spr.vline(cx + 6, fy - 25, fy - 2, C.steel);
    spr.tri(cx + 6, fy - 27, cx + 4, fy - 23, cx + 9, fy - 24, C.silver);
  }

  fb.blit(spr, x - 14, y - 31, facing < 0, C.ink);
}

// Doubao Princess inside swinging Golden Birdcage!
export function drawDoubaoInCage(fb, cx, cy, t, shout = false, chainTop = 0) {
  const swing = Math.round(Math.sin(t * 2.6) * 3);
  const x = cx + swing, y = cy;
  // Chain from ceiling or dragon claw
  if (y - 22 > chainTop) fb.vline(x, chainTop, y - 22, C.goldD);
  // Cage back & Doubao inside
  fb.ellipse(x, y - 4, 12, 15, C.ink);
  drawCastSprite(fb, x, y + 9, 'doubao', t, { pose: shout ? 'cheer' : 'idle', facing: -1 });
  // Golden cage dome, base & bars in front
  fb.hline(x - 12, x + 12, y + 10, C.gold);
  fb.hline(x - 11, x + 11, y - 14, C.gold);
  fb.line(x - 11, y - 14, x, y - 22, C.goldL);
  fb.line(x + 11, y - 14, x, y - 22, C.gold);
  for (let bx = -9; bx <= 9; bx += 4) fb.vline(x + bx, y - 14, y + 10, bx === 0 ? C.goldL : C.goldD);
  fb.disc(x, y - 22, 2, C.goldL);
}

// —— 3. Towering GPT Dragon-Girl Boss (Silver-White Horned Dragon Maiden + 13-Scale Coiled Dragon Tail!) ——
const DRAGON_CHARS = [...'昆图库塔卡提考特苏瓦西拉松'];

export function drawGptDragonBoss(fb, baseX, baseY, t, {
  litScales = 0,       // 0..13 scales lit with golden characters!
  rage = false,
  breathingFire = false,
} = {}) {
  const wingFlap = Math.round(Math.sin(t * 5) * 6);
  const breathe = Math.round(Math.sin(t * 3) * 1.5);

  // Treasure gold mound beneath coiled dragon
  fb.ellipse(baseX + 6, baseY + 8, 56, 12, C.goldD);
  fb.ellipse(baseX + 4, baseY + 6, 48, 9, C.gold);
  for (let i = 0; i < 18; i++) {
    fb.px(baseX - 38 + i * 5, baseY + 3 + (i % 3) * 2, C.goldL);
  }

  // Giant Scalloped Silver-Violet Dragon Wings!
  const wx = baseX - 8, wy = baseY - 46 + breathe;
  fb.tri(wx, wy, wx - 42, wy - 28 + wingFlap, wx - 26, wy + 12, C.dragD);
  fb.tri(wx, wy, wx - 38, wy - 24 + wingFlap, wx - 22, wy + 8, C.dragV);
  fb.line(wx, wy, wx - 42, wy - 28 + wingFlap, C.dragS, 2);
  fb.tri(wx + 8, wy, wx + 48, wy - 24 + wingFlap, wx + 34, wy + 14, C.dragD);
  fb.tri(wx + 8, wy, wx + 44, wy - 20 + wingFlap, wx + 30, wy + 10, C.dragV);
  fb.line(wx + 8, wy, wx + 48, wy - 24 + wingFlap, C.dragS, 2);

  // Long Serpentine Coiled Dragon Body & Tail with 13 Scale Medallions!
  const pts = [];
  for (let i = 0; i < 13; i++) {
    const u = i / 12;
    const px = Math.round(baseX - 24 + u * 86);
    const py = Math.round(baseY - 14 + Math.sin(u * Math.PI * 2.2 + 0.4) * 11 + u * 10);
    pts.push([px, py]);
  }
  for (let i = 0; i < pts.length - 1; i++) {
    const r = Math.max(4, 10 - i * 0.45);
    fb.disc(pts[i][0], pts[i][1], r + 1, C.ink);
    fb.disc(pts[i][0], pts[i][1], r, i % 2 === 0 ? C.dragV : C.dragM);
    fb.disc(pts[i][0], pts[i][1] - 2, Math.max(2, r - 3), C.dragS);
  }
  // Tail fin tip
  const [tx, ty] = pts[12];
  fb.tri(tx, ty, tx + 11, ty - 7, tx + 8, ty + 3, C.dragS);

  // Upper Dragon-Maiden Torso, Flowing Silver Hair & Curved Dragon Horns (facing left toward hero!)
  const hx = baseX - 18, hy = baseY - 56 + breathe;
  // Flowing silver hair cascade
  fb.ellipse(hx + 7, hy + 12, 13, 18, C.dragM);
  fb.ellipse(hx + 5, hy + 9, 11, 15, C.dragS);
  // White-silver Greek-draped bodice
  fb.tri(hx - 9, hy + 34, hx + 11, hy + 34, hx + 1, hy + 12, C.dragS);
  fb.line(hx - 5, hy + 16, hx + 6, hy + 32, C.dragM, 2);
  fb.disc(hx - 1, hy + 16, 2, C.gold);
  // Head & Face
  fb.ellipse(hx, hy + 4, 8, 7.5, C.skin);
  fb.ellipse(hx + 1, hy - 2, 9, 4, C.dragS);
  // Grand Curved Silver Dragon Horns!
  fb.line(hx - 4, hy - 3, hx - 11, hy - 13, C.goldL, 3);
  fb.line(hx - 11, hy - 13, hx - 7, hy - 17, C.dragS, 2);
  fb.line(hx + 6, hy - 3, hx + 15, hy - 13, C.goldL, 3);
  fb.line(hx + 15, hy - 13, hx + 11, hy - 17, C.dragS, 2);
  // Eyes & Mouth
  if (rage || breathingFire) {
    fb.line(hx - 6, hy + 1, hx - 1, hy + 3, C.crimson);
    fb.rect(hx - 5, hy + 3, 3, 3, C.scarf);
    fb.px(hx - 4, hy + 4, C.goldL);
    fb.rect(hx - 6, hy + 7, 5, 4, C.crimson);
  } else {
    fb.rect(hx - 5, hy + 3, 3, 3, C.dragV);
    fb.px(hx - 5, hy + 3, C.uiW);
    fb.hline(hx - 4, hx - 1, hy + 8, C.rose);
  }

  // Draw the 13 Lit Scale Medallions (昆图库塔卡提考特苏瓦西拉松)!
  for (let i = 0; i < Math.min(13, litScales); i++) {
    const [sx, sy] = pts[i];
    fb.disc(sx, sy - 6, 6.5, C.ink);
    fb.disc(sx, sy - 6, 5.5, i === litScales - 1 ? C.goldL : C.gold);
    drawTextPx(fb, sx - 4, sy - 10, DRAGON_CHARS[i], { size: 8, color: C.ink });
  }

  // Roaring 12-fps Pixel Flamethrower stream!
  if (breathingFire) {
    const fStep = Math.floor(t * 12);
    const mouthX = hx - 8, mouthY = hy + 8;
    for (let i = 0; i < 24; i++) {
      const u = i / 23;
      const fx = Math.round(mouthX - u * 165);
      const fy = Math.round(mouthY + u * 26 + Math.sin(fStep * 0.9 + i * 0.7) * (2 + u * 7));
      const r = 3 + u * 13;
      fb.disc(fx, fy, r, C.red);
      fb.disc(fx + 2, fy, r * 0.72, C.orange);
      fb.disc(fx + 3, fy, r * 0.45, i % 2 === 0 ? C.goldL : C.yellow);
    }
  }
}

// Flying Sky-Raid Dragon Silhouette/Sprite for S03
export function drawFlyingGptDragon(fb, x, y, t) {
  const flap = Math.round(Math.sin(t * 9) * 8);
  fb.tri(x, y, x + 26, y - 18 + flap, x + 18, y + 6, C.dragV);
  fb.tri(x - 4, y + 2, x + 16, y - 22 - flap * 0.5, x + 8, y + 4, C.dragD);
  // Coiled flying tail
  for (let i = 0; i < 8; i++) {
    fb.disc(x + i * 6, y + Math.sin(t * 7 + i * 0.6) * 4, Math.max(2, 6 - i * 0.5), i % 2 ? C.dragS : C.dragV);
  }
  // Head & silver horns + hair
  fb.ellipse(x - 6, y - 2, 6, 5, C.dragS);
  fb.line(x - 6, y - 6, x - 2, y - 13, C.goldL, 2);
  fb.px(x - 9, y - 2, C.scarf);
}

// Monsters (Pixel Slime & Shadow Bat) + Treasure Chest + 5 Inventory Gag Icons!
export function drawMonster(fb, x, y, kind, t, ko = false) {
  if (ko && (Math.floor(t * 12) & 1)) return; // 12fps KO blink!
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
    // Pile of grey pixel ash!
    fb.ellipse(cx, cy + 5, 7, 3, C.dslate);
    fb.ellipse(cx, cy + 4, 4, 2, C.slate);
    return;
  }
  if (index === 0) {
    // 0: 昆特牌 (Ornate Fantasy Card)
    fb.rect(cx - 7, cy - 9, 14, 18, C.ink);
    fb.rect(cx - 6, cy - 8, 12, 16, C.uiW);
    fb.box(cx - 5, cy - 7, 10, 14, C.scarf);
    fb.tri(cx, cy - 5, cx - 4, cy, cx + 4, cy, C.gold);
    fb.tri(cx, cy + 5, cx - 4, cy, cx + 4, cy, C.scarf);
  } else if (index === 1) {
    // 1: 提琴 (Pixel Violin & Bow)
    fb.disc(cx - 2, cy + 3, 5, C.brown);
    fb.disc(cx + 1, cy - 1, 3.8, C.clay);
    fb.line(cx + 2, cy - 2, cx + 7, cy - 8, C.dbrown, 2);
    fb.line(cx - 3, cy + 4, cx + 6, cy - 7, C.goldL, 1);
    fb.line(cx - 7, cy - 5, cx + 7, cy + 6, C.sand, 1);
  } else if (index === 2) {
    // 2: 烤蛋挞 (Golden Egg Tart)
    fb.tri(cx - 8, cy - 1, cx + 8, cy - 1, cx + 5, cy + 6, C.tan);
    fb.tri(cx - 8, cy - 1, cx - 5, cy + 6, cx + 5, cy + 6, C.tan);
    fb.ellipse(cx, cy - 2, 8, 4, C.gold);
    fb.ellipse(cx, cy - 2, 6, 2.8, C.goldL);
    fb.disc(cx - 2, cy - 2, 1.5, C.rust); fb.disc(cx + 2, cy - 1, 1.2, C.rust); // caramelized spots!
  } else if (index === 3) {
    // 3: 苏打 (Fizzy Soda Bottle + Straw)
    fb.line(cx + 1, cy - 9, cx + 5, cy - 11, C.scarf, 2);
    fb.rect(cx - 3, cy - 7, 6, 4, C.cyan);
    fb.rect(cx - 5, cy - 3, 10, 11, C.cyan);
    fb.rect(cx - 4, cy, 8, 6, C.blue);
    fb.px(cx - 2, cy + 2, C.uiW); fb.px(cx + 2, cy - 1, C.uiW); fb.px(cx, cy - 5, C.uiW);
  } else {
    // 4: 马拉松 (Winged Running Shoe + Finish Ribbon)
    fb.rect(cx - 7, cy + 1, 13, 5, C.blue);
    fb.rect(cx - 7, cy + 5, 14, 2, C.uiW);
    fb.tri(cx - 4, cy + 1, cx - 8, cy - 4, cx - 1, cy - 2, C.goldL); // wing!
    fb.line(cx - 9, cy - 6, cx + 9, cy - 3, C.scarf, 2); // finish tape!
  }
  if (burning > 0) {
    fb.disc(cx, cy + 2, 7 * burning, C.orange);
    fb.disc(cx, cy + 3, 4 * burning, C.goldL);
  }
}
