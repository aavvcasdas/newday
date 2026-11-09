// scenes.js — All 26 16-bit Pixel RPG environments & choreographed shots (S01–S26)
import { C, W, H, LUT, bayer, hash, clamp, lerp, seg, eo, eio, mod } from './px.js';
import { drawTextPx, measureTextPx } from './glyphs.js';
import {
  getPortrait,
  drawWhaleHero,
  drawMapWhaleHero,
  drawWhiteHorse,
  drawCastSprite,
  drawDoubaoInCage,
  drawGptDragonBoss,
  drawFlyingGptDragon,
  drawMonster,
  drawChest,
} from './cast.js';
import {
  drawRpgWindow,
  drawDialogBox,
  drawNameEntryGrid,
  drawAdventureHud,
  drawWrongItemInventory,
} from './ui.js';

const HERO_13 = [...'达拉崩吧斑得贝迪卜多比鲁翁'];
const DRAG_13 = [...'昆图库塔卡提考特苏瓦西拉松'];

// —— Shared Pixel Architecture Builders ——

function drawPixelCastle(fb, camY = 0, t = 0, { burning = false } = {}) {
  const oy = Math.round(-camY);
  // Sky gradient + distant mountains
  fb.gradV(0, 0, W, H, burning ? [C.umber, C.plum, C.crimson] : [C.blue, C.cyan, C.white]);
  if (!burning) {
    // Fluffy pixel clouds
    for (let i = 0; i < 4; i++) {
      const cx = mod(Math.round(40 + i * 82 + t * 3), 360) - 20;
      const cy = 24 + (i % 2) * 14 + oy * 0.3;
      fb.ellipse(cx, cy, 18, 6, C.white);
      fb.ellipse(cx - 7, cy + 2, 11, 5, C.white);
      fb.ellipse(cx + 8, cy + 2, 12, 5, C.silver);
    }
    // Radiant golden sun crest above central spire
    fb.disc(160, 18 + oy * 0.4, 13, C.goldL);
    fb.disc(160, 18 + oy * 0.4, 10, C.gold);
  }
  // Distant hills & green meadow
  fb.tri(10, 145 + oy, 95, 78 + oy, 180, 145 + oy, C.slate);
  fb.tri(150, 145 + oy, 245, 72 + oy, 330, 145 + oy, C.dslate);
  fb.gradV(0, 132 + oy, W, 90, [C.lime, C.green, C.dgreen]);

  // Castle ramparts & 7 fairy-tale spires
  const towers = [
    [48, 86, 18, 52], [80, 74, 20, 64], [112, 66, 22, 72],
    [144, 46, 32, 92], // central keep
    [186, 66, 22, 72], [218, 74, 20, 64], [252, 86, 18, 52],
  ];
  for (const [tx, ty, tw, th] of towers) {
    const yy = ty + oy;
    fb.rect(tx, yy, tw, th, C.silver);
    fb.rect(tx + tw - 4, yy, 4, th, C.steel);
    fb.box(tx, yy, tw, th, C.ink);
    // Pointed crimson/blue storybook roof + pennant
    const roofCol = tx === 144 ? C.scarf : C.blue;
    fb.tri(tx - 3, yy, tx + tw + 3, yy, tx + (tw >> 1), yy - 18, roofCol);
    fb.vline(tx + (tw >> 1), yy - 25, yy - 18, C.gold);
    fb.tri(tx + (tw >> 1), yy - 25, tx + (tw >> 1) + 7, yy - 23, tx + (tw >> 1), yy - 20, C.scarf);
    // Arched windows
    fb.rect(tx + (tw >> 1) - 2, yy + 12, 4, 7, burning ? C.orange : C.navy);
  }
  // Main castle curtain wall & gatehouse
  const wy = 98 + oy;
  fb.rect(58, wy, 204, 42, C.white);
  fb.rect(58, wy + 34, 204, 8, C.silver);
  fb.box(58, wy, 204, 42, C.ink);
  for (let x = 60; x < 260; x += 8) fb.rect(x, wy - 4, 5, 4, C.white);
  // Stained-glass rose window on central keep!
  const rx = 160, ry = 66 + oy;
  fb.disc(rx, ry, 10, C.ink);
  fb.disc(rx, ry, 8.5, C.gold);
  fb.tri(rx, ry, rx - 8, ry - 4, rx - 3, ry - 8, C.scarf);
  fb.tri(rx, ry, rx + 8, ry - 4, rx + 3, ry - 8, C.cyan);
  fb.tri(rx, ry, rx - 8, ry + 4, rx - 3, ry + 8, C.lime);
  fb.tri(rx, ry, rx + 8, ry + 4, rx + 3, ry + 8, C.amber);
  // Royal Balcony below rose window!
  fb.rect(146, ry + 13, 28, 5, C.sand);
  fb.box(146, ry + 13, 28, 5, C.ink);
  // Grand arched gate + cobblestone road
  fb.ellipse(160, wy + 34, 12, 14, C.ink);
  fb.rect(148, wy + 34, 24, 8, C.ink);
  fb.tri(148, wy + 42, 172, wy + 42, 192, 185 + oy, C.sand);
  fb.tri(148, wy + 42, 128, 185 + oy, 192, 185 + oy, C.tan);

  // 12fps Pixel Flames if under dragon attack!
  if (burning) {
    const f12 = Math.floor(t * 12);
    const fires = [[74, wy + 8], [104, wy + 18], [198, wy + 12], [234, wy + 20], [132, wy + 32]];
    fires.forEach(([fx, fy], idx) => {
      const h = 7 + ((f12 + idx) % 3) * 3;
      fb.tri(fx - 6, fy + 6, fx + 6, fy + 6, fx + ((f12 + idx) & 1 ? 2 : -2), fy - h, C.red);
      fb.tri(fx - 4, fy + 6, fx + 4, fy + 6, fx, fy - h + 3, C.orange);
      fb.disc(fx, fy + 3, 2.5, C.goldL);
    });
  }
}

function drawThroneRoom(fb, t, camY = 0) {
  const oy = Math.round(-camY);
  // Stone palace wall
  fb.gradV(0, 0, W, 132 + oy, [C.sand, C.parchment, C.tan]);
  // Crimson royal banners with gold trim
  for (const bx of [26, 92, 158, 224]) {
    fb.rect(bx, 6 + oy, 16, 46, C.scarf);
    fb.vline(bx + 2, 6 + oy, 50 + oy, C.gold);
    fb.vline(bx + 13, 6 + oy, 50 + oy, C.gold);
    fb.tri(bx, 52 + oy, bx + 16, 52 + oy, bx + 8, 60 + oy, C.scarf);
  }
  // Tall Gothic stained-glass windows
  for (const wx of [54, 120, 186]) {
    fb.rect(wx, 18 + oy, 24, 52, C.ink);
    fb.ellipse(wx + 12, 20 + oy, 11, 10, C.ink);
    fb.gradV(wx + 2, 20 + oy, 20, 48, [C.cyan, C.blue, C.white]);
    fb.vline(wx + 12, 12 + oy, 68 + oy, C.ink);
    fb.hline(wx + 2, wx + 21, 38 + oy, C.ink);
  }
  // Grand Rose Window behind Royal Throne (right side)
  const rx = 268, ry = 36 + oy;
  fb.disc(rx, ry, 20, C.ink);
  fb.disc(rx, ry, 18, C.gold);
  fb.disc(rx, ry, 14, C.scarf);
  fb.disc(rx, ry, 9, C.cyan);
  fb.disc(rx, ry, 4, C.goldL);

  // Perspective checkered marble floor + royal red carpet
  const fy = 118 + oy;
  for (let y = Math.max(0, fy); y < H; y++) {
    const row = Math.floor((y - fy) / 7);
    for (let x = 0; x < W; x++) {
      const col = Math.floor((x - 160) / (12 + (y - fy) * 0.18));
      fb.px(x, y, ((row + col) & 1) ? C.white : C.silver);
    }
  }
  // Royal Red Carpet leading up to the dais
  fb.rect(0, fy + 10, 286, 18, C.scarf);
  fb.hline(0, 286, fy + 11, C.gold);
  fb.hline(0, 286, fy + 26, C.gold);

  // Stepped Golden Dais & Royal Throne on right
  fb.rect(236, fy - 4, 74, 22, C.scarfD);
  fb.box(236, fy - 4, 74, 22, C.gold);
  fb.rect(252, fy - 38, 34, 36, C.scarf);
  fb.box(252, fy - 38, 34, 36, C.gold);
  fb.tri(252, fy - 38, 286, fy - 38, 269, fy - 50, C.gold);
}

// Springy pop-up book fold-up helper (0 -> 1.09 -> 1.0)
function foldUp(t, t0, dur = 0.72) {
  const u = clamp((t - t0) / dur, 0, 1);
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  return 1 - Math.pow(1 - u, 3) + Math.sin(u * Math.PI) * 0.11;
}

// Medium Close-Up of the Castle's Rainbow Royal Balcony (used in S02b, S03a, S03d, S04)
function drawRoyalBalconyCloseup(fb, t, { night = false, burning = false } = {}) {
  fb.gradV(0, 0, W, H, burning
    ? [C.umber, C.plum, C.crimson]
    : night
      ? [C.night, C.plum, C.dslate]
      : [C.blue, C.cyan, C.white]);

  if (!night && !burning) {
    for (let i = 0; i < 3; i++) {
      const cx = mod(Math.round(35 + i * 115 + t * 8), 360) - 20;
      const cy = 22 + (i % 2) * 16;
      fb.ellipse(cx, cy, 22, 7, C.white);
      fb.ellipse(cx + 9, cy + 2, 14, 5, C.silver);
    }
  }

  // Grand stone facade of the Central Keep
  fb.rect(46, 0, 228, H, C.white);
  fb.rect(46, 0, 16, H, C.silver);
  fb.rect(258, 0, 16, H, C.silver);
  fb.vline(46, 0, H, C.ink);
  fb.vline(274, 0, H, C.ink);

  // Twin fluttering crimson royal banners
  for (const bx of [68, 232]) {
    const sway = Math.round(Math.sin(t * 4.5 + bx) * 2);
    fb.rect(bx, 8, 20, 68, C.scarf);
    fb.vline(bx + 2, 8, 74, C.gold);
    fb.vline(bx + 17, 8, 74, C.gold);
    fb.tri(bx, 76, bx + 20, 76, bx + 10 + sway, 90, C.scarf);
  }

  // Rainbow Arch + Stained-Glass Rose Window above Balcony (homage to 达拉崩吧.mp4!)
  const rx = 160, ry = 54;
  const rainbowCols = [C.scarf, C.orange, C.goldL, C.lime, C.cyan];
  rainbowCols.forEach((col, idx) => {
    fb.ellipse(rx, ry + 34, 46 - idx * 3, 52 - idx * 3, col);
  });
  fb.ellipse(rx, ry + 36, 30, 36, C.night);
  fb.rect(rx - 30, ry + 34, 60, 44, C.night);
  // Rose window medallion
  fb.disc(rx, ry - 4, 15, C.ink);
  fb.disc(rx, ry - 4, 13, C.gold);
  fb.tri(rx, ry - 4, rx - 11, ry - 10, rx - 4, ry - 15, C.scarf);
  fb.tri(rx, ry - 4, rx + 11, ry - 10, rx + 4, ry - 15, C.cyan);
  fb.tri(rx, ry - 4, rx - 11, ry + 2, rx - 4, ry + 7, C.lime);
  fb.tri(rx, ry - 4, rx + 11, ry + 2, rx + 4, ry + 7, C.amber);

  // Ornate Marble Balcony Terrace & Balustrade
  fb.rect(88, 126, 144, 8, C.parchment);
  fb.box(88, 126, 144, 8, C.ink);
  fb.rect(94, 134, 132, 18, C.sand);
  fb.box(94, 134, 132, 18, C.ink);
  for (let x = 100; x <= 218; x += 10) {
    fb.rect(x, 114, 4, 12, C.parchment);
    fb.box(x, 114, 4, 12, C.ink);
  }
  // Balcony top handrail + crimson velvet drape
  fb.rect(86, 110, 148, 5, C.goldL);
  fb.box(86, 110, 148, 5, C.ink);
  fb.tri(138, 134, 182, 134, 160, 156, C.scarf);
  fb.line(138, 134, 160, 156, C.gold, 1);
  fb.line(182, 134, 160, 156, C.gold, 1);

  if (burning) {
    const f12 = Math.floor(t * 12);
    for (const [fx, fy] of [[62, 148], [104, 152], [218, 148], [254, 142]]) {
      const fh = 10 + ((f12 + fx) % 4) * 3;
      fb.tri(fx - 8, fy + 10, fx + 8, fy + 10, fx + ((f12 & 1) ? 3 : -3), fy - fh, C.red);
      fb.tri(fx - 5, fy + 10, fx + 5, fy + 10, fx, fy - fh + 4, C.orange);
      fb.disc(fx, fy + 4, 3, C.goldL);
    }
  }
}

// Animated Pop-Up Storybook Kingdom Diorama on the Wooden Desk (S02a: 8.05 – 15.80s)
function drawPopupBookCastle(fb, t) {
  // Warm candlelit desk + open hardcover spread
  fb.gradV(0, 0, W, H, [C.umber, C.dbrown, C.brown]);
  const zoom = eio(seg(t, 13.8, 15.8));
  const padX = Math.round(lerp(18, 0, zoom));
  const padY = Math.round(lerp(12, 0, zoom));

  // Book crimson boards & cream open pages
  if (padX > 0 || padY > 0) {
    fb.rect(Math.max(0, padX - 4), Math.max(0, padY - 3), W - Math.max(0, padX - 4) * 2, H - Math.max(0, padY - 3) * 2, C.crimson);
  }
  const px0 = padX, py0 = padY, pw = W - padX * 2, ph = H - padY * 2;
  // Sky backdrop painted on upper page + pop-up meadow base on lower page
  fb.gradV(px0, py0, pw, ph, [C.blue, C.cyan, C.parchment]);
  fb.gradV(px0, H - padY - 46, pw, 46, [C.lime, C.green, C.parchment]);
  // Center book crease
  fb.vline(160, py0, H - padY, C.tan);

  const groundY = 142;

  // Step 1 (8.15s): Distant snow-capped mountain cardboard cutouts fold upright!
  const fMtn = foldUp(t, 8.15, 0.75);
  if (fMtn > 0) {
    const h1 = Math.round(58 * fMtn), h2 = Math.round(64 * fMtn);
    fb.tri(28, groundY, 138, groundY, 83, groundY - h1, C.slate);
    fb.tri(64, groundY - Math.round(h1 * 0.62), 102, groundY - Math.round(h1 * 0.62), 83, groundY - h1, C.uiW);
    fb.tri(176, groundY, 294, groundY, 235, groundY - h2, C.dslate);
    fb.tri(214, groundY - Math.round(h2 * 0.62), 256, groundY - Math.round(h2 * 0.62), 235, groundY - h2, C.uiW);
  }

  // Step 2 (9.05s): Rolling green hill + cobblestone road pop up!
  const fHill = foldUp(t, 9.05, 0.70);
  if (fHill > 0) {
    const hh = Math.round(24 * fHill);
    fb.ellipse(160, groundY + 4, 126, hh, C.green);
    fb.tri(148, groundY - 4, 172, groundY - 4, 198, H - padY, C.sand);
    fb.tri(148, groundY - 4, 122, H - padY, 198, H - padY, C.tan);
  }

  // Step 3 (9.95s): Outer Castle Curtain Wall & Gatehouse spring upright!
  const fWall = foldUp(t, 9.95, 0.72);
  if (fWall > 0) {
    const wh = Math.round(38 * fWall);
    const wy = groundY - wh;
    fb.rect(68, wy, 184, wh, C.white);
    fb.box(68, wy, 184, wh, C.ink);
    for (let x = 70; x < 250; x += 8) fb.rect(x, wy - 3, 5, 3, C.white);
    if (wh > 14) {
      fb.ellipse(160, groundY - 6, 10, Math.min(12, wh - 6), C.ink);
      fb.rect(150, groundY - 6, 20, 6, C.ink);
    }
  }

  // Step 4 (10.90s): Four Blue-Roofed Fairy-Tale Side Spires pop up left & right!
  const fSpires = foldUp(t, 10.90, 0.75);
  if (fSpires > 0) {
    const sideTowers = [[54, 52], [90, 66], [212, 66], [248, 52]];
    for (const [tx, maxH] of sideTowers) {
      const th = Math.round(maxH * fSpires);
      const ty = groundY - th;
      fb.rect(tx, ty, 18, th, C.silver);
      fb.box(tx, ty, 18, th, C.ink);
      const rh = Math.round(16 * fSpires);
      fb.tri(tx - 3, ty, tx + 21, ty, tx + 9, ty - rh, C.blue);
      fb.vline(tx + 9, ty - rh - 6, ty - rh, C.gold);
      fb.tri(tx + 9, ty - rh - 6, tx + 15, ty - rh - 4, tx + 9, ty - rh - 2, C.scarf);
    }
  }

  // Step 5 (11.90s): Grand Central Keep with Rainbow Arch & Rose Window pops up tall!
  const fKeep = foldUp(t, 11.90, 0.80);
  if (fKeep > 0) {
    const kh = Math.round(88 * fKeep);
    const ky = groundY - kh;
    fb.rect(138, ky, 44, kh, C.white);
    fb.rect(176, ky, 6, kh, C.silver);
    fb.box(138, ky, 44, kh, C.ink);
    const rh = Math.round(22 * fKeep);
    fb.tri(134, ky, 186, ky, 160, ky - rh, C.scarf);
    fb.vline(160, ky - rh - 8, ky - rh, C.goldL);
    if (fKeep > 0.55) {
      // Rainbow arch & stained-glass rose window!
      fb.disc(160, ky + 22, 9, C.gold);
      fb.disc(160, ky + 22, 7, C.scarf);
      fb.disc(160, ky + 22, 4, C.cyan);
      fb.rect(146, ky + 34, 28, 4, C.sand);
      fb.box(146, ky + 34, 28, 4, C.ink);
    }
  }

  // Step 6 (12.95s): Foreground Red-Roofed Cottages, Pine Trees & Strolling AI-Girls!
  const fTown = foldUp(t, 12.95, 0.70);
  if (fTown > 0) {
    const ch = Math.round(20 * fTown);
    for (const hx of [34, 78, 224, 266]) {
      const hy = groundY + 12 - ch;
      fb.rect(hx, hy, 20, ch, C.parchment);
      fb.box(hx, hy, 20, ch, C.dbrown);
      fb.tri(hx - 2, hy, hx + 22, hy, hx + 10, hy - Math.round(11 * fTown), C.rust);
    }
    if (fTown > 0.75) {
      drawCastSprite(fb, 116 + Math.round((t - 13.0) * 8), 158, 'qwen', t, { pose: 'walk' });
      drawCastSprite(fb, 206 - Math.round((t - 13.0) * 7), 160, 'gemini', t, { pose: 'walk', facing: -1 });
      drawCastSprite(fb, 160, groundY - 50, 'doubao', t, { pose: 'cheer' });
    }
  }

  // Step 7 (13.85s): Hanging Stage Sun & Clouds drop on Puppet Strings! (Direct 达拉崩吧.mp4 homage!)
  const dropU = eo(seg(t, 13.85, 14.85));
  if (dropU > 0) {
    const props = [
      { x: 64,  yEnd: 32, kind: 'cloud' },
      { x: 118, yEnd: 24, kind: 'sun' },
      { x: 208, yEnd: 26, kind: 'cloud' },
      { x: 262, yEnd: 34, kind: 'cloud' },
    ];
    props.forEach((p, idx) => {
      const py = Math.round(lerp(-18, p.yEnd, dropU) + Math.sin(t * 3.5 + idx) * 2);
      fb.vline(p.x, py0, Math.max(py0, py - 8), C.dslate);
      if (p.kind === 'sun') {
        fb.disc(p.x, py, 12, C.goldL);
        fb.disc(p.x, py, 9, C.gold);
      } else {
        fb.ellipse(p.x, py, 16, 6, C.white);
        fb.ellipse(p.x - 6, py + 2, 10, 4, C.white);
        fb.ellipse(p.x + 7, py + 2, 10, 4, C.silver);
      }
    });
  }

  if (padX > 0 || padY > 0) {
    fb.box(px0, py0, pw, ph, C.goldD);
  }
}

// —— Main Scene Dispatcher: returns { lut, lutB, pick, mosaicBlock, swirlU, texts } ——
export function renderScene(fb, t) {
  const texts = [];

  // S01 (0.00 – 8.05s): Dynamic Desk Push-In + Trotting Chibi Whale-Girl + Magic Spark Writing + 3D Cover Flip!
  if (t < 8.05) {
    fb.gradV(0, 0, W, H, [C.ink, C.umber, C.dbrown]);
    for (let y = 16; y < H; y += 20) fb.hline(0, W - 1, y, C.umber);

    // Flickering warm candle on left of desk + golden light pool
    const flicker = Math.round(Math.sin(t * 17) * 3);
    fb.glowDisc(160, 84, 62 + flicker, 135);
    fb.rect(22, 98, 12, 34, C.parchment);
    fb.box(22, 98, 12, 34, C.ink);
    fb.tri(25, 96, 31, 96, 28 + (flicker > 0 ? 1 : 0), 84, C.orange);
    fb.disc(28, 93, 2.5, C.goldL);

    // Camera zoom-in onto Grimoire over 0.00–2.20s, then 3D Cover Page-Turn over 7.38–8.05s!
    const zoomU = eo(seg(t, 0.0, 2.0));
    const bx = Math.round(lerp(100, 86, zoomU));
    const by = Math.round(lerp(28, 14, zoomU));
    const bw = Math.round(lerp(120, 148, zoomU));
    const bh = Math.round(lerp(98, 122, zoomU));

    // Cream page block underneath (revealed when crimson cover flips open at 7.38s!)
    fb.rect(bx + 3, by + 4, bw, bh, C.ink);
    fb.rect(bx + 6, by + 3, bw - 6, bh - 4, C.parchment);
    fb.box(bx + 6, by + 3, bw - 6, bh - 4, C.goldD);

    const openU = eio(seg(t, 7.38, 8.03));
    if (openU > 0.02) {
      // Glowing magic burst from inside the opening storybook!
      fb.glowDisc(bx + (bw >> 1), by + (bh >> 1), Math.round(20 + openU * 68), 180);
    }

    // Front Crimson Hardcover (foreshortens horizontally around spine bx as it swings open!)
    const coverW = Math.max(8, Math.round((bw - 3) * Math.cos(openU * Math.PI * 0.48)));
    fb.rect(bx, by, coverW, bh, C.crimson);
    fb.rect(bx, by, Math.min(11, coverW), bh, C.scarfD); // leather spine
    if (coverW > 28) {
      fb.box(bx + 6, by + 5, coverW - 12, bh - 10, C.gold);
      fb.box(bx + 9, by + 8, coverW - 18, bh - 16, C.goldD);
    }
    // Swaying Bookmark Ribbon
    const ribSway = Math.round(Math.sin(t * 4) * 2);
    fb.rect(157 + ribSway, by + bh, 6, 13, C.scarf);

    // Cover Emblem, Title & Magic Spark Writing (while cover is facing viewer: t < 7.42s)
    if (t < 7.42) {
      const cx = bx + (coverW >> 1);
      fb.disc(cx, by + 28, 10, C.goldL);
      fb.disc(cx, by + 28, 7, C.gold);

      if (t >= 0.30) {
        drawTextPx(fb, 110, by + 48, '达拉崩吧', { size: 12, scale: 2, color: C.goldL, outline: C.ink, tracking: 1 });
        texts.push({ id: 'cover_title', text: '达拉崩吧', x0: 110 * 6, y0: (by + 48) * 6, x1: 214 * 6, y1: (by + 74) * 6 });
      }

      // Magic Spark Comet writes '斑得贝迪卜多比鲁翁' left-to-right (1.85s -> 3.35s), then stays solid to 7.42s (4.07s >= 3.50s)!
      const subStr = '斑得贝迪卜多比鲁翁';
      if (t >= 1.85) {
        const writeU = clamp((t - 1.85) / 1.45, 0, 1);
        const nChars = Math.max(1, Math.ceil(writeU * subStr.length));
        const shown = subStr.slice(0, nChars);
        drawTextPx(fb, 99, by + 82, shown, { size: 10, color: C.gold, shadow: C.ink, tracking: 2 });
        if (writeU < 1) {
          const sx = Math.round(99 + writeU * 118);
          const sy = by + 87 + Math.round(Math.sin(t * 28) * 2);
          fb.disc(sx, sy, 5, C.goldL);
          fb.disc(sx, sy, 2.5, C.uiW);
          for (let k = 1; k <= 5; k++) {
            fb.px(sx - k * 4, sy + ((k & 1) ? -2 : 2), k < 3 ? C.goldL : C.orange);
          }
        } else {
          texts.push({ id: 'cover_sub', text: subStr, x0: 99 * 6, y0: (by + 82) * 6, x1: 225 * 6, y1: (by + 94) * 6 });
        }
      }

      // Chibi Whale-girl Heroine trots eagerly across the foreground desk & leaps into the book at 7.0s!
      const heroWalkU = seg(t, 0.35, 6.85);
      const hx = Math.round(lerp(36, 98, heroWalkU));
      const hy = t >= 6.85 ? Math.round(lerp(164, 134, eo(seg(t, 6.85, 7.40)))) : 164;
      drawMapWhaleHero(fb, hx, hy, t, { pose: t >= 6.6 ? 'sword' : 'run', scarfLen: 16 });

      // RPG Start Prompt (solid 3.40s -> 7.15s, rapid confirm blink 7.15s -> 7.42s)
      if (t >= 3.40) {
        const flash = t >= 7.15 ? (Math.floor(t * 18) & 1) : true;
        if (flash) {
          const curBob = t < 7.15 ? (Math.floor(t * 5) & 1) * 2 : 0;
          drawTextPx(fb, 114 + curBob, 152, '▶ START QUEST', { size: 10, color: C.uiW, outline: C.ink, tracking: 1 });
        }
        texts.push({ id: 'start_prompt', text: 'START QUEST', x0: 112 * 6, y0: 150 * 6, x1: 218 * 6, y1: 164 * 6 });
      }
    }

    // Floating golden dust motes across the candlelit desk
    for (let i = 0; i < 10; i++) {
      const mx = mod(Math.round(i * 37 + t * (9 + (i % 4) * 3)), W);
      const my = mod(Math.round(165 - t * (10 + (i % 3) * 4) - i * 19), H);
      if ((i + Math.floor(t * 4)) % 3 !== 0) fb.px(mx, my, C.goldL);
    }

    const mos = t >= 7.75 ? 1 + Math.round(seg(t, 7.75, 8.05) * 6) : 1;
    return { lut: LUT.full, mosaicBlock: mos, texts };
  }

  // S02 (8.05 – 20.08s): 2-Part Pop-Up Storybook Assembly (8.05–15.8s) -> Push-In to Doubao on Rainbow Balcony (15.8–20.08s)!
  if (t < 20.08) {
    if (t < 15.80) {
      drawPopupBookCastle(fb, t);
      const mos = t < 8.45 ? Math.max(1, Math.round(lerp(6, 1, seg(t, 8.05, 8.45)))) : 1;
      if (t < 9.90) return { lut: LUT.gb4, mosaicBlock: mos, texts };
      if (t < 11.90) return { lut: LUT.nes, texts };
      if (t < 13.80) {
        const r = seg(t, 11.90, 13.80) * 220;
        return {
          lut: LUT.nes,
          lutB: LUT.full,
          pick: (x, y) => Math.hypot(x - 160, y - 84) + bayer(x, y) * 18 < r,
          texts,
        };
      }
      return { lut: LUT.full, texts };
    }

    // 15.80 – 20.08s (L01 很久很久以前): Lush Close-Up on Princess Doubao Waving on the Rainbow Balcony!
    drawRoyalBalconyCloseup(fb, t, { night: false, burning: false });
    drawCastSprite(fb, 160, 112, 'doubao', t, { pose: 'cheer', largeDoubao: true });
    // Fluttering bluebirds & drifting pink flower petals!
    for (let i = 0; i < 2; i++) {
      const bx = Math.round(lerp(56, 256, mod((t - 15.8) * 0.22 + i * 0.45, 1)));
      const by = 42 + i * 24 + Math.round(Math.sin(t * 9 + i) * 4);
      const wing = (Math.floor(t * 12) & 1) ? -3 : 2;
      fb.line(bx - 4, by + wing, bx, by, C.cyan, 2);
      fb.line(bx + 4, by + wing, bx, by, C.uiW, 2);
    }
    for (let i = 0; i < 8; i++) {
      const px = mod(Math.round(40 + i * 33 + t * 18), W);
      const py = mod(Math.round((t - 15.8) * 26 + i * 23), H);
      fb.rect(px, py, 2, 2, i & 1 ? C.pink : C.goldL);
    }
    return { lut: LUT.full, texts };
  }

  // S03 (20.08 – 26.09s): 4-Cut Rapid-Fire Dragon Raid Montage!
  if (t < 26.09) {
    // Cut 3A (20.08 – 21.55s, L02 巨龙突然出现): Balcony Darkens + Colossal Winged Shadow Sweeps Over Doubao!
    if (t < 21.55) {
      drawRoyalBalconyCloseup(fb, t, { night: true, burning: false });
      drawCastSprite(fb, 160, 112, 'doubao', t, { pose: 'idle', largeDoubao: true });
      // Giant dragon shadow sweeping diagonally across facade & Doubao!
      const sx = Math.round(lerp(290, 40, seg(t, 20.08, 21.50)));
      const sy = Math.round(lerp(20, 96, seg(t, 20.08, 21.50)));
      fb.tri(sx, sy, sx + 78, sy - 44, sx + 48, sy + 18, C.ink);
      fb.tri(sx, sy, sx - 64, sy - 38, sx - 32, sy + 16, C.ink);
      // Urgent '!' alert above Doubao
      fb.rect(175, 62, 11, 14, C.uiW);
      fb.box(175, 62, 11, 14, C.ink);
      drawTextPx(fb, 178, 64, '!', { size: 10, color: C.scarf });
      return { lut: LUT.cataclysm, texts };
    }

    // Cut 3B (21.55 – 23.05s): Wide Castle Sky Torn Open by Crimson Portal + Diving GPT Dragon-Girl & Lightning!
    if (t < 23.05) {
      drawPixelCastle(fb, 0, t, { burning: true });
      const px = 236, py = 36;
      fb.disc(px, py, 22, C.goldL);
      fb.disc(px, py, 18, C.ink);
      fb.disc(px, py, 10, C.dragV);
      if (Math.floor(t * 14) % 3 === 0) {
        fb.line(px - 10, py + 12, 168, 72, C.goldL, 2);
        fb.line(168, 72, 182, 92, C.uiW, 2);
      }
      const u = eo(seg(t, 21.55, 23.02));
      drawFlyingGptDragon(fb, Math.round(lerp(244, 152, u)), Math.round(lerp(34, 62, u)), t);
      return { lut: LUT.cataclysm, texts };
    }

    // Cut 3C (23.05 – 24.45s, L03 带来灾难): Town Courtyard Meteor Rain & Panicking Citizens!
    if (t < 24.45) {
      fb.gradV(0, 0, W, 128, [C.umber, C.plum, C.crimson]);
      for (const [hx, hw] of [[10, 64], [84, 58], [186, 60], [254, 56]]) {
        fb.rect(hx, 52, hw, 78, C.parchment);
        fb.box(hx, 52, hw, 78, C.dbrown);
        fb.tri(hx - 4, 52, hx + hw + 4, 52, hx + (hw >> 1), 28, C.rust);
      }
      fb.gradV(0, 128, W, 52, [C.dslate, C.night, C.ink]);
      // Raining 12fps fireballs!
      for (let i = 0; i < 6; i++) {
        const u = mod((t - 23.0) * 1.35 + i * 0.19, 1);
        const fx = Math.round(44 + i * 48 - u * 32);
        const fy = Math.round(8 + u * 126);
        fb.line(fx, fy, fx + 10, fy - 15, C.red, 4);
        fb.line(fx, fy, fx + 7, fy - 11, C.orange, 2);
        fb.disc(fx, fy, 4.5, C.goldL);
      }
      // Townsfolk sprinting in panic!
      const runOff = Math.round((t - 23.05) * 48);
      drawCastSprite(fb, 210 - runOff, 144, 'gemini', t, { pose: 'panic', facing: -1 });
      drawCastSprite(fb, 92 + runOff, 146, 'qwen', t, { pose: 'panic', facing: 1 });
      drawCastSprite(fb, 150 - Math.round(runOff * 0.6), 142, 'zai', t, { pose: 'panic', facing: -1 });
      return { lut: LUT.cataclysm, texts };
    }

    // Cut 3D (24.45 – 26.09s, L04 带走了公主又消失不见): Balcony Snatch in Golden Birdcage -> Portal Vanish!
    drawRoyalBalconyCloseup(fb, t, { night: true, burning: true });
    const px = 262, py = 36;
    const pr = t < 25.75 ? 19 : Math.max(1, Math.round(lerp(19, 0, seg(t, 25.75, 26.08))));
    fb.disc(px, py, pr + 3, C.goldL);
    fb.disc(px, py, pr, C.ink);
    fb.disc(px, py, pr * 0.55, C.dragV);
    if (t < 25.96) {
      const u = eio(seg(t, 24.45, 25.92));
      const dx = Math.round(lerp(142, px, u));
      const dy = Math.round(lerp(66, py, u));
      drawFlyingGptDragon(fb, dx, dy, t);
      drawDoubaoInCage(fb, dx - 4, dy + 28, t, true, dy + 6);
    }
    return { lut: LUT.cataclysm, texts };
  }

  // S04 (26.09 – 28.10s, L05 王国十分危险): Dramatic Balcony Close-Up on Distraught Queen Claude & Kimi!
  if (t < 28.10) {
    drawRoyalBalconyCloseup(fb, t, { night: false, burning: true });
    drawCastSprite(fb, 126, 113, 'kimi', t, { pose: 'panic', facing: 1 });
    drawCastSprite(fb, 166, 113, 'claude', t, { pose: 'cheer', facing: 1 });
    drawRpgWindow(fb, 184, 52, 54, 24, { alert: true });
    drawTextPx(fb, 192, 59, '危险!!', { size: 10, color: C.goldL, shadow: C.ink });
    return { lut: LUT.ember, texts };
  }

  // S05 (28.10 – 34.11s): 4-Cut Plaza Recruitment -> Sunbeam Sprint -> Circular Spotlight Shout -> Wanted Poster Slash!
  if (t < 34.11) {
    // Cuts 5A & 5B (28.10 – 32.15s): Town Square Noticeboard + Sunbeam Arrival of Whale-Girl!
    if (t < 32.15) {
      fb.gradV(0, 0, W, 128, t >= 30.08 ? [C.blue, C.cyan, C.silver] : [C.dslate, C.slate, C.steel]);
      for (const [hx, hw] of [[8, 62], [76, 56], [202, 58], [264, 52]]) {
        fb.rect(hx, 54, hw, 76, C.parchment);
        fb.box(hx, 54, hw, 76, C.dbrown);
        fb.vline(hx + (hw >> 1), 54, 130, C.dbrown);
        fb.hline(hx, hx + hw - 1, 88, C.dbrown);
        fb.tri(hx - 4, 54, hx + hw + 4, 54, hx + (hw >> 1), 30, C.rust);
      }
      fb.gradV(0, 128, W, 52, [C.steel, C.slate, C.dslate]);
      for (let x = 8; x < W; x += 18) fb.hline(x, x + 10, 140, C.silver);

      // Wooden Quest Recruitment Noticeboard (勇者招募 visible full 4.05s across Cuts 5A+5B!)
      fb.rect(142, 86, 4, 44, C.dbrown);
      fb.rect(182, 86, 4, 44, C.dbrown);
      drawRpgWindow(fb, 130, 54, 68, 40, { skin: 'parchment' });
      drawTextPx(fb, 140, 59, '勇者招募', { size: 10, color: C.scarf, tracking: 1 });
      drawTextPx(fb, 138, 74, '悬赏 999G', { size: 8, color: C.ink });
      texts.push({ id: 'recruit_sign', text: '勇者招募', x0: 130 * 6, y0: 54 * 6, x1: 198 * 6, y1: 94 * 6 });

      if (t < 30.08) {
        // Cut 5A: Townsfolk pacing anxiously around the noticeboard!
        const pace = Math.round(Math.sin(t * 5) * 8);
        drawCastSprite(fb, 108 + pace, 138, 'gemini', t, { pose: 'walk', facing: Math.cos(t * 5) >= 0 ? 1 : -1 });
        drawCastSprite(fb, 214 - pace, 138, 'zai', t, { pose: 'walk', facing: -1 });
        drawCastSprite(fb, 68, 142, 'qwen', t, { pose: 'idle', facing: 1 });
      } else {
        // Cut 5B (L07 一位勇者赶来): Golden Sunbeam splits sky + Whale-Girl sprints in trailing dust puffs!
        const runU = eo(seg(t, 30.08, 31.65));
        const hx = Math.round(lerp(12, 118, runU));
        fb.lightBeam(hx - 8, 28, hx + 4, 56, 0, 148, true);
        drawCastSprite(fb, 84, 138, 'gemini', t, { pose: 'cheer', facing: 1 });
        drawCastSprite(fb, 214, 138, 'zai', t, { pose: 'cheer', facing: -1 });
        // Sprint dust puffs behind boots
        if (runU < 0.95) {
          for (let k = 1; k <= 3; k++) {
            fb.disc(hx - k * 11, 141 - (k & 1) * 2, 3.5 - k * 0.7, C.uiW);
          }
        }
        drawWhaleHero(fb, hx, 143, t, { pose: runU < 0.92 ? 'run' : 'sword', scarfLen: 40 });
      }
      return { lut: LUT.full, texts };
    }

    // Cut 5C (32.15 – 33.18s, L08 大声喊 Pt.1): Iconic Reference-MV Theatrical Spotlight Close-Up on Whale-Girl!
    if (t < 33.18) {
      fb.clear(C.night);
      // Golden stage spotlight cone + bright floor ellipse (homage to 达拉崩吧.mp4 t=32s!)
      fb.lightBeam(160, 44, 160, 116, 0, 168, true);
      fb.ellipse(160, 156, 62, 12, C.gold);
      fb.ellipse(160, 156, 48, 8, C.goldL);
      // Radial anime action lines
      for (let i = 0; i < 16; i++) {
        const ang = (i / 16) * Math.PI * 2 + Math.floor(t * 16) * 0.12;
        fb.line(160 + Math.cos(ang) * 74, 96 + Math.sin(ang) * 52, 160 + Math.cos(ang) * 165, 96 + Math.sin(ang) * 98, C.goldL, 1);
      }
      drawWhaleHero(fb, 160, 156, t, { pose: 'shout', scale: 2, scarfLen: 34 });
      drawRpgWindow(fb, 206, 28, 46, 26, { alert: true });
      drawTextPx(fb, 219, 35, '!!', { size: 12, color: C.goldL });
      return { lut: LUT.full, texts };
    }

    // Cut 5D (33.18 – 34.11s, L08 大声喊 Pt.2): Whip-Pan Close-Up on Wanted Poster + Gleaming Sword Slash!
    fb.gradV(0, 0, W, H, [C.navy, C.blue, C.cyan]);
    for (let i = 0; i < 14; i++) {
      const y = 10 + i * 12;
      const x0 = mod(Math.round(t * 320 + i * 53), 320);
      fb.hline(x0, Math.min(319, x0 + 64), y, C.uiW);
    }
    drawWhaleHero(fb, 76, 160, t, { pose: 'sword', scale: 2, scarfLen: 30 });
    drawRpgWindow(fb, 154, 16, 146, 134, { skin: 'parchment' });
    drawTextPx(fb, 184, 25, '讨伐恶龙娘', { size: 12, color: C.scarf, tracking: 1 });
    drawFlyingGptDragon(fb, 227, 78, t);
    drawTextPx(fb, 188, 118, '悬赏 999G', { size: 10, color: C.ink, shadow: C.goldL });
    // Diagonal Holy Sword slash gleam across the poster!
    const slashU = eo(seg(t, 33.45, 34.05));
    if (slashU > 0) {
      fb.line(162, 134, Math.round(lerp(162, 292, slashU)), Math.round(lerp(134, 24, slashU)), C.goldL, 3);
      fb.line(162, 134, Math.round(lerp(162, 292, slashU)), Math.round(lerp(134, 24, slashU)), C.uiW, 1);
    }
    return { lut: LUT.full, texts };
  }

  // S06 (34.11 – 42.13s): Scrolling Parchment Quest Map with Chibi WHALE-GIRL Sprinting, Climbing & Slashing!
  if (t < 42.13) {
    fb.gradV(0, 0, W, H, [C.parchment, C.sand, C.tan]);

    // Extended 460px wide parchment map so camera tracks Whale-girl smoothly left-to-right!
    const prog = seg(t, 34.15, 41.35);
    const pts = [
      [54, 124],   // 0: Castle & Best Sword (L09 我要带上最好的剑)
      [168, 58],   // 1: Highest Snow Mountain (L10 翻过最高的山)
      [284, 118],  // 2: Deepest Pine Forest (L11 闯进最深的森林)
      [362, 86],   // 3: Beside Dragon Peak & Doubao Pink Heart (L12 把公主带回到面前)
    ];

    // Compute Whale-girl's live position along the 3 curved map segments!
    let heroWX = pts[0][0], heroWY = pts[0][1];
    const totalSegs = 3;
    const activeSeg = Math.min(totalSegs - 1, Math.floor(prog * totalSegs));
    const activeU = clamp(prog * totalSegs - activeSeg, 0, 1);
    {
      const [x0, y0] = pts[activeSeg], [x1, y1] = pts[activeSeg + 1];
      heroWX = lerp(x0, x1, activeU);
      heroWY = lerp(y0, y1, activeU) - Math.sin(activeU * Math.PI) * 12;
    }
    const camX = Math.round(clamp(heroWX - 135, 0, 140));

    // Subtle parchment compass grid lines scrolling with camX
    for (let gx = 40; gx < 440; gx += 48) {
      const sx = gx - camX;
      if (sx > 8 && sx < W - 8) fb.vline(sx, 10, H - 10, C.sand);
    }
    // Winding azure river across the map
    fb.line(112 - camX, 170, 142 - camX, 98, C.cyan, 5);
    fb.line(142 - camX, 98, 224 - camX, 14, C.cyan, 4);

    // Landmark 1: Royal Castle + Gleaming Best Sword (34.11s+)
    {
      const cx = 36 - camX;
      fb.rect(cx, 102, 26, 20, C.silver);
      fb.box(cx, 102, 26, 20, C.ink);
      fb.tri(cx - 3, 102, cx + 29, 102, cx + 13, 88, C.scarf);
      // Giant gleaming sword icon when she picks it up (34.15–35.4s)
      if (t < 35.3) {
        fb.line(cx + 38, 114, cx + 38, 86, C.ink, 5);
        fb.line(cx + 38, 114, cx + 38, 86, C.goldL, 3);
        fb.hline(cx + 31, cx + 45, 106, C.gold);
      }
      drawTextPx(fb, cx + 2, 128, '好剑', { size: 10, color: C.dbrown });
    }

    // Landmark 2: Highest Snow-Capped Mountain (pops up at 35.8s!)
    if (t >= 35.6) {
      const mh = Math.round(50 * foldUp(t, 35.6, 0.55));
      const mx = 168 - camX;
      fb.tri(mx - 38, 82, mx + 38, 82, mx, 82 - mh, C.slate);
      fb.tri(mx - 16, 82 - Math.round(mh * 0.58), mx + 16, 82 - Math.round(mh * 0.58), mx, 82 - mh, C.uiW);
      fb.vline(mx, 82 - mh - 10, 82 - mh, C.gold);
      fb.tri(mx, 82 - mh - 10, mx + 9, 82 - mh - 7, mx, 82 - mh - 4, C.scarf);
      drawTextPx(fb, mx - 18, 86, '高山', { size: 10, color: C.dbrown });
    }

    // Landmark 3: Deepest Pine Forest + Pop-up Slimes slashed aside! (37.8s+)
    if (t >= 37.6) {
      const fPop = foldUp(t, 37.6, 0.55);
      const fx = 284 - camX;
      for (const [ox, oy] of [[-22, 0], [-6, -8], [12, 2], [-14, 10], [6, 10], [24, -4]]) {
        const th = Math.round(20 * fPop);
        fb.tri(fx + ox - 9, 116 + oy, fx + ox + 9, 116 + oy, fx + ox, 116 + oy - th, C.dgreen);
        fb.tri(fx + ox - 7, 108 + oy, fx + ox + 7, 108 + oy, fx + ox, 111 + oy - th, C.green);
        fb.rect(fx + ox - 2, 116 + oy, 4, 5, C.dbrown);
      }
      drawMonster(fb, fx + 28, 122, 'slime', t, t >= 39.2);
      drawTextPx(fb, fx - 14, 132, '深林', { size: 10, color: C.dbrown });
    }

    // Landmark 4: Dragon Peak + Doubao Princess in Big Pink Pixel Heart! (39.8s+)
    if (t >= 39.7) {
      const dx = 394 - camX;
      fb.tri(dx - 34, 92, dx + 34, 92, dx, 34, C.dragD);
      if (t >= 40.35) {
        const beat = Math.round(Math.sin(t * 10) * 1.5);
        fb.disc(dx - 7, 60 - beat, 12, C.pink);
        fb.disc(dx + 7, 60 - beat, 12, C.pink);
        fb.tri(dx - 19, 64 - beat, dx + 19, 64 - beat, dx, 88 - beat, C.pink);
        drawCastSprite(fb, dx, 81 - beat, 'doubao', t, { pose: 'cheer' });
      }
    }

    // Animated Red Dotted Quest Trail behind Whale-Girl!
    for (let s = 0; s < totalSegs; s++) {
      const segU = clamp(prog * totalSegs - s, 0, 1);
      if (segU <= 0) break;
      const [x0, y0] = pts[s], [x1, y1] = pts[s + 1];
      const steps = 14;
      const maxK = Math.floor(segU * steps);
      for (let k = 0; k <= maxK; k++) {
        const u = k / steps;
        const rx = Math.round(lerp(x0, x1, u)) - camX;
        const ry = Math.round(lerp(y0, y1, u) - Math.sin(u * Math.PI) * 12);
        if (k % 2 === 0) fb.rect(rx - 1, ry - 1, 3, 2, C.scarf);
      }
    }

    // PROTAGONIST WHALE-GIRL actively running, leaping & brandishing her Holy Sword across the Map!
    const mapPose = (t < 35.1 || t >= 40.6) ? 'sword' : (t >= 36.2 && t < 37.6) ? 'jump' : 'run';
    drawMapWhaleHero(fb, Math.round(heroWX - camX), Math.round(heroWY), t, {
      pose: mapPose,
      facing: 1,
      scarfLen: 18,
    });

    // Ornate Map Border + Cheering Queen Claude Badge in bottom-right corner (homage to MV 00:36-00:42!)
    fb.box(6, 6, W - 12, H - 12, C.dbrown);
    fb.box(9, 9, W - 18, H - 18, C.brown);
    drawCastSprite(fb, 294, 158, 'claude', t, { pose: 'cheer', facing: -1 });
    return { lut: LUT.full, texts };
  }

  // S07 – S12 (42.13 – 66.69s): ROYAL THRONE ROOM — First Tongue-Twister Climax!
  if (t < 66.69) {
    // Sub-shot S08 (46.64–51.65s): Medium 2× Close-Up on Whale-Girl Thinking & Speaking!
    if (t >= 46.64 && t < 51.65) {
      drawThroneRoom(fb, t, -12);
      drawCastSprite(fb, 34, 134, 'zai', t);
      drawWhaleHero(fb, 118, 146, t, { pose: t < 49.65 ? 'think' : 'shout', scale: 2, scarfLen: 22 });

      if (t < 49.65) {
        // Pixel thought bubble (. → .. → ... → ★ lightbulb!)
        fb.disc(144, 72, 3, C.uiW);
        fb.disc(152, 62, 4, C.uiW);
        fb.ellipse(184, 46, 26, 15, C.ink);
        fb.ellipse(184, 46, 24, 13, C.uiW);
        const dots = t < 47.6 ? '·' : t < 48.5 ? '··' : t < 49.1 ? '···' : '★ !';
        drawTextPx(fb, 172, 41, dots, { size: 12, color: t >= 49.1 ? C.goldD : C.ink });
      } else {
        drawDialogBox(fb, t, {
          who: 'whale',
          mood: 'neutral',
          name: '鲸鱼娘',
          text: '咳咳，陛下我叫——',
          t0: 49.65,
          dur: 1.5,
        });
      }
      return { lut: LUT.full, texts };
    }

    // Sub-shot S09b (54.16–55.41s): Petrified Close-Up on Claude Queen ("再说一次?!")
    if (t >= 54.16 && t < 55.41) {
      drawThroneRoom(fb, t, -8);
      drawCastSprite(fb, 224, 128, 'kimi', t, { pose: 'scribe', facing: -1 });
      drawCastSprite(fb, 154, 142, 'claude', t, { pose: 'petrified', big: true, facing: -1 });
      drawRpgWindow(fb, 46, 24, 92, 26, { skin: 'parchment' });
      drawTextPx(fb, 56, 31, '再说一次?!', { size: 12, color: C.ink });
      return { lut: LUT.full, texts };
    }

    // Sub-shot S11b (62.18–63.68s): Whale-Girl Proud Thumbs-Up ("啊对对!")
    if (t >= 62.18 && t < 63.68) {
      drawThroneRoom(fb, t, -10);
      drawWhaleHero(fb, 118, 148, t, { pose: 'happy', scale: 2, scarfLen: 26 });
      drawRpgWindow(fb, 156, 38, 84, 28, { skin: 'parchment' });
      drawTextPx(fb, 168, 46, '啊对对！', { size: 12, color: C.scarf });
      return { lut: LUT.full, texts };
    }

    // Wide Throne Room Staging (S07, S09a, S10, S11a, S12)
    const camY = (t >= 59.42 && t < 62.18) ? lerp(0, -24, eio(seg(t, 59.42, 61.8))) : 0;
    drawThroneRoom(fb, t, camY);
    const oy = Math.round(-camY);

    drawCastSprite(fb, 46, 134 + oy, 'zai', t);
    drawCastSprite(fb, 216, 128 + oy, 'kimi', t, { pose: 'scribe', facing: -1 });
    drawCastSprite(fb, 269, 114 + oy, 'claude', t, {
      pose: t < 44.2 ? 'cheer' : t >= 58.1 ? 'petrified' : 'idle',
      facing: -1,
    });
    drawWhaleHero(fb, 98, 138 + oy, t, {
      pose: t >= 51.65 && t < 54.16 ? 'shout' : 'idle',
      scarfLen: 34,
    });

    // S07: Queen asks "名字？"
    if (t >= 44.14 && t < 46.64) {
      drawDialogBox(fb, t, {
        who: 'claude', mood: 'neutral', name: '大小姐陛下', text: '勇士，你的名字是？', t0: 44.14, dur: 1.5,
      });
    }
    // S09a: L17 Overflowing 13-char Name shatters right border!
    if (t >= 51.65 && t < 54.16) {
      drawDialogBox(fb, t, {
        who: 'whale', mood: 'shout', name: '鲸鱼娘', text: '达拉崩吧斑得贝迪卜多比鲁翁', t0: 51.65, dur: 2.1, overflowBreak: true,
      });
    }
    // S10: Bulging 13/8 Name Entry Grid + Queen's "是不是…"
    if (t >= 55.41 && t < 59.42) {
      drawNameEntryGrid(fb, t, 55.41);
      texts.push({ id: 'name_grid_hdr', text: '昵称输入', x0: 20 * 6, y0: 44 * 6, x1: 140 * 6, y1: 62 * 6 });
      if (t >= 58.17) {
        drawDialogBox(fb, t, {
          who: 'claude', mood: 'dizzy', name: '大小姐陛下', text: '是不是……？', t0: 58.17, dur: 0.9,
        });
      }
    }
    // S11a: 13 Colorful Floating Pixel Balloon-Glyphs on Tangled Strings!
    if (t >= 59.42 && t < 62.18) {
      const cols = [C.scarf, C.gold, C.cyan, C.lime, C.pink, C.amber, C.lavender];
      for (let i = 0; i < 13; i++) {
        const bx = 28 + i * 20;
        const rise = eo(seg(t, 59.42 + i * 0.08, 61.5));
        const by = Math.round(lerp(112, 22 + (i % 3) * 14, rise) + Math.sin(t * 5 + i) * 3);
        fb.line(262, 98 + oy, bx + 6, by + 14, C.dslate);
        fb.disc(bx + 6, by + 6, 8, C.ink);
        fb.disc(bx + 6, by + 6, 7, cols[i % cols.length]);
        drawTextPx(fb, bx + 1, by + 1, HERO_13[i], { size: 10, color: C.ink });
      }
    }
    // S12: 13 Colossal Golden-Stone Plaques Slamming Down in 3 Tiers!
    if (t >= 63.68) {
      const count = clamp(Math.floor(seg(t, 63.68, 66.15) * 14), 1, 13);
      const rows = [
        { start: 0, len: 4, y: 20, x0: 96 },
        { start: 4, len: 4, y: 50, x0: 96 },
        { start: 8, len: 5, y: 80, x0: 82 },
      ];
      for (const r of rows) {
        for (let k = 0; k < r.len; k++) {
          const idx = r.start + k;
          if (idx >= count) break;
          const bx = r.x0 + k * 31;
          fb.rect(bx, r.y, 28, 26, C.ink);
          fb.rect(bx + 1, r.y + 1, 26, 24, C.scarf);
          fb.box(bx + 2, r.y + 2, 24, 22, C.gold);
          drawTextPx(fb, bx + 8, r.y + 7, HERO_13[idx], { size: 12, color: C.goldL, shadow: C.ink });
        }
      }
    }
    return { lut: LUT.full, texts };
  }

  // S13 – S14 (66.69 – 85.23s): INSTRUMENTAL BREAK — Scarf Sprint → Chapter Emblem → 4 Tarot Cards → Stamped World Map!
  if (t < 85.23) {
    // 66.69 – 70.70s: Whale-girl dashes out of Throne Hall trailing 95px red scarf & quest banner!
    if (t < 70.70) {
      drawThroneRoom(fb, t, 0);
      drawCastSprite(fb, 269, 114, 'claude', t, { pose: 'cheer', facing: -1 });
      drawCastSprite(fb, 216, 128, 'kimi', t, { pose: 'cheer', facing: -1 });
      drawCastSprite(fb, 180, 132, 'zai', t, { pose: 'cheer', facing: -1 });
      const hx = Math.round(lerp(240, 26, eio(seg(t, 66.69, 70.5))));
      drawWhaleHero(fb, hx, 140, t, { pose: 'run', facing: -1, scarfLen: 90 });
      return { lut: LUT.full, texts };
    }

    // 70.70 – 78.21s: Velvet-Crimson Act II Screen + 4 Character Tarot Cards Flipping Face-Up!
    if (t < 78.21) {
      fb.gradV(0, 0, W, H, [C.umber, C.crimson, C.scarfD]);
      fb.box(6, 6, W - 12, H - 12, C.gold);
      fb.box(9, 9, W - 18, H - 18, C.goldD);

      if (t < 74.15) {
        // Big Golden Act II Emblem + Hero Silhouette & Ribbon
        for (let i = 0; i < 12; i++) {
          const ang = (i / 12) * Math.PI * 2 + t * 0.4;
          fb.line(160, 78, 160 + Math.cos(ang) * 140, 78 + Math.sin(ang) * 90, C.scarf, 2);
        }
        drawWhaleHero(fb, 64, 112, t, { pose: 'sword', scarfLen: 44 });
        drawTextPx(fb, 106, 56, '达拉崩吧', { size: 12, scale: 2, color: C.goldL, outline: C.ink, tracking: 2 });
        drawTextPx(fb, 102, 92, '斑得贝迪卜多比鲁翁', { size: 10, color: C.parchment, shadow: C.ink, tracking: 2 });
        texts.push({ id: 'act_title', text: '达拉崩吧', x0: 106 * 6, y0: 56 * 6, x1: 222 * 6, y1: 82 * 6 });
      } else {
        // 4 Ornate RPG Tarot Cards Flipping Face-Up (74.15 – 78.21s)!
        drawTextPx(fb, 116, 14, '达拉崩吧 · 远征阵容', { size: 10, color: C.goldL, shadow: C.ink });
        texts.push({ id: 'party_hdr', text: '达拉崩吧 · 远征阵容', x0: 114 * 6, y0: 12 * 6, x1: 224 * 6, y1: 26 * 6 });
        const cards = [
          { who: 'whale',  title: '勇者', sub: 'LV.1',  flipT: 74.25 },
          { who: 'doubao', title: '公主', sub: '救援!', flipT: 75.00 },
          { who: 'gpt',    title: '恶龙', sub: 'LV.99', flipT: 75.75 },
          { who: 'claude', title: '陛下', sub: '委托',  flipT: 76.50 },
        ];
        cards.forEach((c, idx) => {
          const cx = 48 + idx * 74, cy = 96;
          const flipU = clamp((t - c.flipT) / 0.45, 0, 1);
          const halfW = Math.max(2, Math.round(Math.abs(Math.cos(flipU * Math.PI)) * 28));
          const highlight = idx === 1 && t >= 77.1;
          const cardY = highlight ? cy - 6 : cy;
          fb.rect(cx - halfW, cardY - 46, halfW * 2, 92, C.ink);
          fb.rect(cx - halfW + 1, cardY - 45, halfW * 2 - 2, 90, flipU < 0.5 ? C.tan : C.parchment);
          fb.box(cx - halfW + 2, cardY - 44, halfW * 2 - 4, 88, highlight ? C.scarf : C.goldD);
          if (flipU >= 0.5 && halfW >= 20) {
            fb.blit(getPortrait(c.who, idx === 2 ? 'rage' : 'neutral'), cx - 16, cardY - 36);
            drawTextPx(fb, cx - 10, cardY + 2, c.title, { size: 10, color: C.ink });
            drawTextPx(fb, cx - 13, cardY + 18, c.sub, { size: 8, color: highlight ? C.scarf : C.dbrown });
          } else if (halfW >= 10) {
            fb.disc(cx, cardY, 6, C.goldD);
          }
        });
      }
      return { lut: LUT.full, texts };
    }

    // 78.21 – 85.23s: Full World Map Unfolds + Giant Red Seal Stamp + Chibi WHALE-GIRL Sprinting Along Quest Trail!
    fb.gradV(0, 0, W, H, [C.parchment, C.sand, C.tan]);
    fb.box(5, 5, W - 10, H - 10, C.dbrown);
    // Winding river + stone bridge
    fb.line(96, 174, 152, 98, C.cyan, 5);
    fb.line(152, 98, 224, 10, C.cyan, 4);
    fb.rect(128, 96, 16, 7, C.brown);
    fb.box(128, 96, 16, 7, C.ink);
    // Map zones: Castle (left), Windmill Village (mid), Snow Peak (mid-top), Dragon Cave (right)
    fb.rect(38, 114, 18, 14, C.silver); fb.tri(36, 114, 58, 114, 47, 102, C.scarf);
    fb.rect(148, 78, 14, 12, C.parchment); fb.tri(146, 78, 164, 78, 155, 68, C.rust);
    fb.tri(184, 58, 232, 58, 208, 22, C.slate); fb.tri(198, 38, 218, 38, 208, 22, C.uiW);
    fb.tri(252, 96, 304, 96, 278, 44, C.dragD); fb.disc(278, 82, 7, C.ink);

    // Giant Red Circular Royal Seal stamped at 79.40s!
    if (t >= 79.40) {
      fb.disc(52, 56, 24, C.scarf);
      fb.disc(52, 56, 21, C.parchment);
      fb.disc(52, 56, 18, C.scarf);
      drawTextPx(fb, 41, 46, '达拉', { size: 10, color: C.parchment });
      drawTextPx(fb, 41, 58, '崩吧', { size: 10, color: C.parchment });
    }

    // Animated quest trail + PROTAGONIST WHALE-GIRL marching across all 4 zones!
    const mapProg = seg(t, 78.60, 84.45);
    const route = [[52, 122], [116, 104], [154, 86], [208, 56], [270, 84]];
    let hx = route[0][0], hy = route[0][1];
    for (let s = 0; s < 4; s++) {
      const su = clamp(mapProg * 4 - s, 0, 1);
      if (su <= 0) break;
      for (let k = 0; k <= Math.floor(su * 10); k += 2) {
        const u = k / 10;
        fb.rect(lerp(route[s][0], route[s + 1][0], u), lerp(route[s][1], route[s + 1][1], u), 3, 2, C.scarf);
      }
      hx = lerp(route[s][0], route[s + 1][0], su);
      hy = lerp(route[s][1], route[s + 1][1], su);
    }
    drawMapWhaleHero(fb, Math.round(hx), Math.round(hy), t, {
      pose: mapProg > 0.90 ? 'sword' : (mapProg > 0.55 && mapProg < 0.78) ? 'jump' : 'run',
      facing: 1,
      scarfLen: 16,
    });

    const mos = t >= 84.65 ? 1 + Math.round(seg(t, 84.65, 85.23) * 10) : 1;
    return { lut: LUT.full, mosaicBlock: mos, texts };
  }

  // S15 (85.23 – 93.25s): Castle Courtyard Departure — Mounting White Horse & Galloping through Archway!
  if (t < 93.25) {
    if (t < 91.35) {
      fb.gradV(0, 0, W, 128, [C.cyan, C.white, C.silver]);
      // Castle town wall & houses
      fb.rect(0, 42, 72, 88, C.parchment); fb.box(0, 42, 72, 88, C.dbrown);
      fb.tri(0, 42, 78, 42, 36, 18, C.rust);
      fb.rect(72, 54, 248, 76, C.silver);
      for (let x = 76; x < 318; x += 14) fb.rect(x, 48, 8, 6, C.silver);
      fb.gradV(0, 130, W, 50, [C.steel, C.slate, C.dslate]);

      // Cheering townsfolk: Gemini, Kimi, Zai!
      drawCastSprite(fb, 206, 138, 'gemini', t, { pose: 'cheer', facing: -1 });
      drawCastSprite(fb, 236, 140, 'kimi', t, { pose: 'cheer', facing: -1 });
      drawCastSprite(fb, 266, 138, 'zai', t, { pose: 'cheer', facing: -1 });

      if (t < 87.6) {
        // Whale-girl standing heroically as white steed trots in!
        const steedX = Math.round(lerp(14, 86, eo(seg(t, 86.2, 87.55))));
        if (t >= 86.2) drawWhiteHorse(fb, steedX, 144, t, 1);
        drawWhaleHero(fb, 118, 142, t, { pose: 'sword', scarfLen: 68 });
      } else {
        // Mounted on fastest white horse, galloping rightward!
        const rx = Math.round(lerp(108, 174, eio(seg(t, 88.2, 91.3))));
        drawWhiteHorse(fb, rx, 144, t, 1);
        drawWhaleHero(fb, rx - 2, 127, t, { pose: 'ride', scarfLen: 76 });
      }
    } else {
      // Galloping out through the grand Stone Castle Gate Archway into green plains (91.35 – 93.25s)!
      fb.gradV(0, 0, W, 126, [C.blue, C.cyan, C.white]);
      fb.gradV(0, 126, W, 54, [C.lime, C.green, C.dgreen]);
      // Stone Gate Archway scrolling left as hero bursts out!
      const gx = Math.round(lerp(176, 48, eio(seg(t, 91.35, 93.25))));
      fb.rect(gx - 68, 0, 44, 146, C.steel);
      fb.rect(gx + 24, 0, 44, 146, C.steel);
      fb.rect(gx - 68, 0, 136, 38, C.silver);
      fb.rect(gx - 56, 44, 14, 34, C.scarf);
      drawWhiteHorse(fb, 152, 144, t, 1);
      drawWhaleHero(fb, 150, 127, t, { pose: 'ride', scarfLen: 68 });
    }
    drawAdventureHud(fb, t, { lv: 1, hp: 5, gold: 0, exp: 0.1, mapU: 0.08 });
    texts.push({ id: 'hud_whale', text: '鲸鱼娘', x0: 12 * 6, y0: 9 * 6, x1: 72 * 6, y1: 19 * 6 });
    const mos = t < 85.65 ? Math.max(1, Math.round(lerp(10, 1, seg(t, 85.23, 85.65)))) : 1;
    return { lut: LUT.full, mosaicBlock: mos, texts };
  }

  // S16 – S17 (93.25 – 101.26s): Side-Scrolling Plains — Monster Battle, +12 Gold, Battle Scars & LEVEL UP!
  if (t < 101.26) {
    const dusk = t >= 97.26;
    const scroll = Math.round((t - 93.25) * 64);
    fb.gradV(0, 0, W, 122, dusk ? [C.plum, C.orange, C.goldL] : [C.blue, C.cyan, C.white]);
    // Parallax layer 1 (0.35×): Distant peaks
    for (let i = -1; i < 5; i++) {
      const mx = i * 96 - mod(Math.round(scroll * 0.35), 96);
      fb.tri(mx, 122, mx + 96, 122, mx + 48, 68, dusk ? C.plum : C.slate);
    }
    // Parallax layer 2 (0.7×): Rolling hills & round pixel trees
    for (let i = -1; i < 7; i++) {
      const tx = i * 58 - mod(Math.round(scroll * 0.7), 58);
      fb.rect(tx + 18, 108, 4, 16, C.dbrown);
      fb.disc(tx + 20, 102, 11, C.dgreen);
      fb.disc(tx + 18, 99, 9, C.green);
    }
    // Parallax layer 3 (1.0×): Dirt road & grass verge
    fb.gradV(0, 122, W, 58, [C.lime, C.green, C.dgreen]);
    fb.rect(0, 134, W, 16, C.tan);
    for (let i = -1; i < 12; i++) {
      const rx = i * 32 - mod(scroll, 32);
      fb.rect(rx, 141, 10, 2, C.sand);
    }

    // Mounted Whale-Girl charging & slashing!
    drawWhiteHorse(fb, 124, 144, t, 1);
    drawWhaleHero(fb, 122, 127, t, { pose: t < 95.4 || (t >= 97.5 && t < 99.2) ? 'sword' : 'ride', scarfLen: 64 });
    if (dusk) {
      // Tiny white bandage cross on cheek (无数伤痕见证!)
      fb.hline(124, 128, 106, C.uiW); fb.vline(126, 104, 108, C.uiW);
    }

    // S16a (93.25–95.4s): Slimes & Shadow Bats lunging + sword arc + KO blink!
    if (t < 95.5) {
      const ko = t >= 94.6;
      drawMonster(fb, Math.round(lerp(250, 158, clamp((t - 93.25) / 1.1, 0, 1))), 142, 'slime', t, ko);
      drawMonster(fb, Math.round(lerp(284, 178, clamp((t - 93.45) / 1.2, 0, 1))), 108, 'bat', t, ko);
      if (t >= 93.7 && t < 94.9) {
        fb.line(138, 102, 166, 132, C.goldL, 2);
        fb.disc(160, 122, 5, C.uiW);
      }
    }
    // S16b (95.25–97.26s): +12 GOLD! Bouncing pixel coins + Foreground Giant Tree Wipe at 96.8–97.26s!
    if (t >= 95.25 && t < 97.26) {
      const cu = seg(t, 95.3, 96.8);
      for (let c = 0; c < 6; c++) {
        const cx = 162 + c * 14;
        const cy = Math.round(132 - Math.abs(Math.sin(cu * Math.PI * 2 + c * 0.5)) * 22);
        fb.disc(cx, cy, 4, C.ink);
        fb.disc(cx, cy, 3, C.gold);
      }
      drawTextPx(fb, 158, 92 - Math.round(cu * 10), '+12 GOLD!', { size: 10, color: C.goldL, outline: C.ink });
      // Giant Foreground Oak Trunk Wipe (homage to MV 01:37!)
      if (t >= 96.75) {
        const wx = Math.round(lerp(330, -50, seg(t, 96.75, 97.26)));
        fb.rect(wx, 0, 48, H, C.dbrown);
        fb.vline(wx + 8, 0, H, C.brown);
        fb.vline(wx + 38, 0, H, C.umber);
      }
    }
    // S17b (99.26–101.26s): LEVEL UP! LV.1 → LV.18 Golden Banner & Rays!
    const lv = t < 99.6 ? 1 : 18;
    const gold = t < 95.4 ? 0 : 12;
    const exp = t < 97.26 ? lerp(0.15, 0.55, seg(t, 93.25, 97.26)) : t < 99.6 ? lerp(0.55, 1.0, seg(t, 97.26, 99.6)) : 0.25;
    if (t >= 99.45) {
      fb.lightBeam(122, 18, 122, 48, 28, 146, true);
      drawRpgWindow(fb, 118, 38, 122, 26, { alert: true });
      drawTextPx(fb, 128, 46, 'LEVEL UP! LV.18', { size: 10, color: C.goldL, shadow: C.ink });
    }
    drawAdventureHud(fb, t, { lv, hp: dusk && t < 99.6 ? 3 : 5, gold, exp, mapU: lerp(0.18, 0.48, seg(t, 93.25, 101.26)) });
    texts.push({ id: 'hud_whale', text: '鲸鱼娘', x0: 12 * 6, y0: 9 * 6, x1: 72 * 6, y1: 19 * 6 });
    return { lut: LUT.full, texts };
  }

  // S18 (101.26 – 105.27s): Remote Windmill Village (Qwen) + Opening ALL 3 Treasure Chests!
  if (t < 105.27) {
    const scroll = Math.round((t - 101.26) * 28);
    fb.gradV(0, 0, W, 124, [C.goldL, C.sand, C.parchment]);
    // Cozy cottages + Spinning Red Windmill!
    const wmx = 96 - Math.round(scroll * 0.4);
    fb.tri(wmx - 16, 124, wmx + 16, 124, wmx, 68, C.parchment);
    fb.tri(wmx - 18, 72, wmx + 18, 72, wmx, 56, C.rust);
    for (let k = 0; k < 4; k++) {
      const a = t * 2.2 + (k * Math.PI) / 2;
      fb.line(wmx, 76, wmx + Math.cos(a) * 28, 76 + Math.sin(a) * 28, C.scarf, 3);
    }
    for (const cx of [38, 168, 248]) {
      const hx = cx - Math.round(scroll * 0.4);
      fb.rect(hx, 94, 34, 30, C.parchment);
      fb.box(hx, 94, 34, 30, C.dbrown);
      fb.tri(hx - 4, 94, hx + 38, 94, hx + 17, 74, C.plum);
    }
    // Flower-dotted meadow & village path
    fb.gradV(0, 124, W, 56, [C.lime, C.green, C.dgreen]);
    fb.rect(0, 136, W, 14, C.sand);
    for (let x = 6; x < W; x += 13) fb.px(x, 153 + (x % 3) * 2, x % 2 ? C.pink : C.goldL);

    // Qwen (purple mage cloak elder) welcoming hero!
    drawCastSprite(fb, 152 - Math.round(scroll * 0.5), 136, 'qwen', t, { pose: 'cheer', facing: -1 });

    // 3 Treasure Chests popping open 1-2-3 (103.35s, 103.95s, 104.55s)!
    const chestTimes = [103.30, 103.90, 104.50];
    const lootLabels = ['红药水', '圣盾', '星辰剑'];
    chestTimes.forEach((ct, i) => {
      const cx = 182 + i * 44;
      const open = t >= ct;
      drawChest(fb, cx, 140, open);
      if (open) {
        const rise = eo(clamp((t - ct) / 0.55, 0, 1));
        const ly = Math.round(122 - rise * 18);
        fb.disc(cx, ly, 4, i === 0 ? C.scarf : i === 1 ? C.cyan : C.goldL);
        drawTextPx(fb, cx - 12, ly - 13, lootLabels[i], { size: 8, color: C.ink });
      }
    });

    const rx = Math.round(lerp(56, 134, seg(t, 101.26, 105.2)));
    drawWhiteHorse(fb, rx, 144, t, 1);
    drawWhaleHero(fb, rx - 2, 127, t, { pose: 'ride', scarfLen: 56 });

    drawAdventureHud(fb, t, { lv: t >= 104.5 ? 50 : 18, hp: 5, gold: 12, exp: 0.85, mapU: 0.65 });
    texts.push({ id: 'hud_whale', text: '鲸鱼娘', x0: 12 * 6, y0: 9 * 6, x1: 72 * 6, y1: 19 * 6 });
    return { lut: LUT.full, texts };
  }

  // S19 (105.27 – 110.54s): Blizzard Mountains → Holy Moonlight Forest & Dragon Cave Entrance!
  if (t < 110.54) {
    if (t < 107.35) {
      // Blizzard Ice Peaks (一路风霜伴随)
      fb.gradV(0, 0, W, 126, [C.slate, C.silver, C.white]);
      fb.tri(10, 126, 130, 126, 70, 28, C.steel);
      fb.tri(48, 66, 92, 66, 70, 28, C.uiW);
      fb.tri(140, 126, 290, 126, 215, 18, C.slate);
      fb.tri(185, 58, 245, 58, 215, 18, C.uiW);
      fb.gradV(0, 126, W, 54, [C.uiW, C.silver, C.steel]);
      // Snow-laden pines
      for (const px of [34, 108, 188, 268]) {
        fb.tri(px - 10, 128, px + 10, 128, px, 96, C.teal);
        fb.tri(px - 7, 110, px + 7, 110, px, 96, C.uiW);
      }
      drawWhiteHorse(fb, 132, 144, t, 1);
      drawWhaleHero(fb, 130, 127, t, { pose: 'ride', scarfLen: 72 });
      // Diagonal driving snow particles!
      for (let i = 0; i < 42; i++) {
        const sx = mod(Math.round(hash(i, 1) * 320 - (t - 105.27) * 140), 320);
        const sy = mod(Math.round(hash(i, 2) * 180 + (t - 105.27) * 75), 180);
        fb.rect(sx, sy, 2, 1, C.uiW);
      }
      drawAdventureHud(fb, t, { lv: 50, hp: 5, gold: 12, exp: 0.92, mapU: 0.82 });
      texts.push({ id: 'hud_whale', text: '鲸鱼娘', x0: 12 * 6, y0: 9 * 6, x1: 72 * 6, y1: 19 * 6 });
      return { lut: LUT.blizzard, texts };
    }

    // Holy Moonlight Night Forest → Fanged Dragon Cave Entrance (107.35 – 110.54s, 指引前路的圣月光!)
    fb.gradV(0, 0, W, 132, [C.ink, C.night, C.navy]);
    // Giant Luminous Full Moon + Kimi's Crescent Blessing!
    fb.disc(214, 44, 28, C.uiW);
    fb.disc(214, 44, 24, C.goldL);
    // Dark pine silhouettes
    for (let x = 8; x < 245; x += 24) {
      fb.tri(x - 11, 134, x + 11, 134, x, 78 + (x % 3) * 8, C.teal);
    }
    fb.gradV(0, 132, W, 48, [C.night, C.ink, C.ink]);
    // Fanged Dragon Cave Maw on right (108.6s+)
    fb.tri(224, 142, 320, 142, 286, 26, C.dslate);
    fb.ellipse(282, 118, 24, 24, C.ink);
    for (const fx of [266, 276, 288, 298]) fb.tri(fx - 3, 96, fx + 3, 96, fx, 106, C.silver);

    // Bayer-stepped Holy Moonlight Shaft illuminating the trail straight into the cave!
    fb.lightBeam(214, 34, 256, 86, 44, 148, true);

    if (t < 109.4) {
      const rx = Math.round(lerp(66, 178, seg(t, 107.35, 109.4)));
      drawWhiteHorse(fb, rx, 144, t, 1);
      drawWhaleHero(fb, rx - 2, 127, t, { pose: 'ride', scarfLen: 64 });
    } else {
      // Quiet breath before entering the dark cave: dismounted at cave threshold!
      drawWhiteHorse(fb, 152, 144, t, 1);
      drawWhaleHero(fb, 212, 144, t, { pose: 'sword', scarfLen: 36 });
    }
    drawAdventureHud(fb, t, { lv: 50, hp: 5, gold: 12, exp: 1.0, mapU: 0.98 });
    texts.push({ id: 'hud_whale', text: '鲸鱼娘', x0: 12 * 6, y0: 9 * 6, x1: 72 * 6, y1: 19 * 6 });

    const sw = t >= 110.05 ? seg(t, 110.05, 110.54) : 0;
    return { lut: LUT.moonlight, swirlU: sw, texts };
  }

  // S20 – S26 (110.54 – 132.77s): DRAGON CAVE CLIMAX — Giant Eyes, GPT Dragon-Girl Boss, 5-Slot Gag & 13 Stone Monoliths!
  // Base Cave Background
  fb.gradV(0, 0, W, 138, [C.ink, C.night, C.dragD]);
  // Hanging stalactites & glowing cave crystals
  for (let x = 14; x < W; x += 28) {
    fb.tri(x - 6, 0, x + 6, 0, x, 18 + (x % 3) * 8, C.night);
  }
  for (const [cx, cy] of [[24, 138], [136, 140], [296, 136]]) {
    fb.tri(cx - 5, cy + 8, cx + 5, cy + 8, cx, cy - 6, C.cyan);
  }
  fb.gradV(0, 138, W, 42, [C.dragD, C.night, C.ink]);

  // S20 (110.54 – 114.55s): Pitch-Dark Cave → Doubao Cage Spotlight ("后面!") → GIANT DRAGON EYES SNAP OPEN!
  if (t < 114.55) {
    if (t < 113.05) {
      fb.clear(C.ink);
      // Spotlight cone on Doubao in golden cage!
      drawDoubaoInCage(fb, 188, 56, t, t >= 112.5);
      fb.glowDisc(188, 56, 18, 38);
      drawWhaleHero(fb, 64, 144, t, { pose: 'idle', scarfLen: 26 });
      if (t >= 112.55) {
        drawRpgWindow(fb, 130, 26, 46, 20, { skin: 'parchment' });
        drawTextPx(fb, 136, 31, '后面！', { size: 10, color: C.scarf });
      }
      return { lut: LUT.full, texts };
    }
    // 113.05 – 114.55s: TWO COLOSSAL GLOWING GOLD-VIOLET DRAGON EYES SNAP OPEN IN THE DARK!
    if (t < 113.85) {
      fb.clear(C.ink);
      drawDoubaoInCage(fb, 188, 48, t, true);
      drawWhaleHero(fb, 58, 144, t, { pose: 'shock', scarfLen: 28 });
      const openH = Math.round(eo(seg(t, 113.05, 113.35)) * 18);
      for (const ex of [214, 272]) {
        fb.ellipse(ex, 84, 22, openH, C.gold);
        fb.ellipse(ex, 84, 18, Math.max(1, openH - 3), C.goldL);
        fb.ellipse(ex, 84, 4, Math.max(1, openH - 2), C.dragD);
      }
      return { lut: LUT.full, texts };
    }
    // Full cave reveal!
    drawDoubaoInCage(fb, 178, 46, t, false);
    drawGptDragonBoss(fb, 226, 138, t, { litScales: 0 });
    drawWhaleHero(fb, 66, 144, t, { pose: 'shock', scarfLen: 30 });
    return { lut: LUT.full, texts };
  }

  // S21 (114.55 – 117.55s): Hero Unsheathes Holy Sword + Blazing "VS" Emblem + GPT Dragon-Girl Haughty Close-Up!
  if (t < 117.55) {
    if (t < 116.30) {
      drawDoubaoInCage(fb, 178, 46, t, false);
      drawGptDragonBoss(fb, 226, 138, t, { litScales: 0 });
      drawWhaleHero(fb, 72, 144, t, { pose: 'sword', scarfLen: 34 });
      // Boss HP Bar at top-right + VS clash badge in center!
      drawRpgWindow(fb, 198, 8, 114, 22, { alert: true });
      drawTextPx(fb, 205, 14, 'BOSS: ??? LV.99', { size: 8, color: C.goldL, shadow: C.ink });
      if (t >= 114.95) {
        fb.disc(142, 92, 16, C.scarf);
        fb.disc(142, 92, 13, C.gold);
        drawTextPx(fb, 131, 86, 'VS', { size: 12, color: C.ink });
      }
      return { lut: LUT.full, texts };
    }
    // 116.30 – 117.55s: Haughty Close-Up of Pixelized GPT Dragon-Girl Boss ("听好了，我是——")!
    for (let i = 0; i < 10; i++) fb.hline(0, W, 12 + i * 11, i % 2 ? C.dragD : C.night);
    drawGptDragonBoss(fb, 186, 122, t, { litScales: 0, rage: true });
    drawDialogBox(fb, t, {
      who: 'gpt', mood: 'haughty', name: 'GPT龙娘', text: '听好了，我是——', t0: 116.30, dur: 1.0,
    });
    return { lut: LUT.full, texts };
  }

  // S22 (117.55 – 121.56s): 13 Golden Scale Medallions Light Up along GPT Dragon-Girl's Tail → Hero Shock ("再来一次?!")
  if (t < 121.56) {
    if (t < 120.31) {
      const lit = clamp(Math.ceil(seg(t, 117.55, 120.05) * 13), 1, 13);
      drawDoubaoInCage(fb, 174, 44, t, false);
      drawGptDragonBoss(fb, 218, 138, t, { litScales: lit });
      drawWhaleHero(fb, 54, 144, t, { pose: 'idle', scarfLen: 26 });
      return { lut: LUT.full, texts };
    }
    // 120.31 – 121.56s: Speed-line Shock Close-Up on Whale-Girl ("再来一次?!")
    for (let i = 0; i < 12; i++) fb.hline(0, W, 14 + i * 12, i % 2 ? C.navy : C.night);
    drawWhaleHero(fb, 108, 154, t, { pose: 'shock', scale: 2, scarfLen: 26 });
    drawRpgWindow(fb, 152, 34, 96, 28, { skin: 'parchment' });
    drawTextPx(fb, 162, 42, '再来一次?!', { size: 12, color: C.scarf });
    return { lut: LUT.full, texts };
  }

  // S23 (121.56 – 125.32s): Blazing Dragon Runes across Cave Vault → Dizzy Whale-Girl ("是不是…")
  if (t < 125.32) {
    drawDoubaoInCage(fb, 178, 48, t, false);
    drawGptDragonBoss(fb, 224, 138, t, { litScales: 13, rage: t < 124.3 });
    drawWhaleHero(fb, 62, 144, t, { pose: t >= 124.32 ? 'think' : 'shock', scarfLen: 28 });

    if (t < 124.32) {
      const count = clamp(Math.ceil(seg(t, 121.56, 123.3) * 13), 1, 13);
      for (let i = 0; i < count; i++) {
        const rx = 18 + i * 22;
        const ry = 22 + Math.round(Math.sin(t * 8 + i * 0.6) * 3);
        fb.disc(rx + 6, ry + 6, 9, C.red);
        fb.disc(rx + 6, ry + 6, 6, C.gold);
        drawTextPx(fb, rx + 1, ry + 1, DRAG_13[i], { size: 10, color: C.ink });
      }
    } else {
      drawDialogBox(fb, t, {
        who: 'whale', mood: 'think', name: '鲸鱼娘', text: '是不是……', t0: 124.32, dur: 0.8,
      });
    }
    return { lut: LUT.full, texts };
  }

  // S24 – S25 (125.32 – 129.58s): 5-Slot Wrong-Name Inventory Gag → GPT Dragon-Girl Flamethrower Incineration!
  if (t < 129.58) {
    const rage = t >= 128.33;
    const fire = t >= 128.40 && t < 129.45;
    drawDoubaoInCage(fb, 178, 44, t, rage);
    drawGptDragonBoss(fb, 232, 138, t, { litScales: 0, rage, breathingFire: fire });
    drawWhaleHero(fb, 54, 144, t, { pose: t >= 128.55 ? 'charred' : 'think', scarfLen: 26 });
    drawWrongItemInventory(fb, t);
    if (t < 128.40) {
      texts.push({ id: 'inv_hdr', text: '道具栏', x0: 10 * 6, y0: 44 * 6, x1: 94 * 6, y1: 58 * 6 });
    }
    if (rage) {
      drawRpgWindow(fb, 218, 8, 72, 24, { alert: true });
      drawTextPx(fb, 228, 14, '不对！！', { size: 12, color: C.goldL, shadow: C.ink });
    }
    return { lut: rage ? LUT.dragonRage : LUT.full, texts };
  }

  // S26 (129.58 – 132.77s): FINALE — 13 Colossal Ancient Stone Monoliths Slam Down in 2 Rows + Final Roar!
  drawDoubaoInCage(fb, 152, 42, t, false);
  drawGptDragonBoss(fb, 226, 132, t, { litScales: 13, rage: true });
  drawWhaleHero(fb, 34, 144, t, { pose: 'charred', scarfLen: 24 });

  const count = clamp(Math.ceil(seg(t, 129.58, 132.05) * 13), 1, 13);
  // Row 1 (top 7 monoliths: 昆图库塔卡提考), Row 2 (bottom 6 monoliths: 特苏瓦西拉松)
  for (let i = 0; i < count; i++) {
    const isBottom = i >= 7;
    const col = isBottom ? i - 7 : i;
    const mx = (isBottom ? 82 : 66) + col * 32;
    const my = isBottom ? 122 : 90;
    fb.rect(mx, my, 30, 30, C.ink);
    fb.rect(mx + 1, my + 1, 28, 28, C.dslate);
    fb.box(mx + 2, my + 2, 26, 26, i === count - 1 ? C.goldL : C.silver);
    drawTextPx(fb, mx + 9, my + 9, DRAG_13[i], { size: 12, color: C.goldL, shadow: C.ink });
  }
  if (t >= 131.95) {
    drawRpgWindow(fb, 108, 16, 104, 28, { alert: true });
    drawTextPx(fb, 122, 23, '松——！！', { size: 12, color: C.goldL, shadow: C.ink, tracking: 2 });
  }
  return { lut: LUT.full, texts };
}
