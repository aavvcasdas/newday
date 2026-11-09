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

  // Fluted Marble Palace Pillars & Blazing Golden Sconces
  const f12 = Math.floor(t * 12);
  for (const px of [12, 78, 144, 210]) {
    fb.rect(px, 6 + oy, 10, fy - 4 - oy, C.parchment);
    fb.vline(px + 2, 8 + oy, fy - 6, C.white);
    fb.vline(px + 8, 8 + oy, fy - 6, C.tan);
    fb.rect(px - 2, 4 + oy, 14, 5, C.gold);
    fb.rect(px - 2, fy - 6, 14, 6, C.goldD);
    // Wall torch sconce
    const sy = 56 + oy;
    fb.rect(px + 3, sy, 4, 8, C.dbrown);
    const fh = 5 + ((f12 + px) % 3) * 2;
    fb.tri(px + 1, sy, px + 9, sy, px + 5 + ((f12 & 1) ? 1 : -1), sy - fh, C.orange);
    fb.disc(px + 5, sy - 2, 2, C.goldL);
  }

  // Hanging Golden Palace Chandelier
  for (const cx of [104, 174]) {
    fb.vline(cx, 0, 14 + oy, C.goldD);
    fb.hline(cx - 12, cx + 12, 14 + oy, C.gold);
    for (const dx of [-10, 0, 10]) {
      fb.rect(cx + dx - 1, 10 + oy, 3, 4, C.uiW);
      fb.px(cx + dx, 8 + oy - ((f12 + dx) & 1), C.goldL);
    }
  }

  // Scribe Kimi's Wooden Desk, Stacked Scrolls & Inkpot by the Dais
  fb.rect(198, fy + 2, 28, 14, C.brown);
  fb.box(198, fy + 2, 28, 14, C.ink);
  fb.rect(201, fy - 3, 12, 5, C.parchment);
  fb.box(201, fy - 3, 12, 5, C.goldD);
  fb.rect(217, fy - 2, 5, 4, C.navy);
  fb.line(219, fy - 2, 224, fy - 10, C.uiW, 1);

  // Royal Reward Chests & Gold Pile beside Dais
  drawChest(fb, 236, fy + 16, t >= 43.2 && t < 46.6);
  for (let c = 0; c < 5; c++) fb.disc(222 + c * 3, fy + 18 - (c & 1), 2, C.goldL);

  // Stepped Golden Dais & Royal Throne on right
  fb.rect(236, fy - 4, 74, 22, C.scarfD);
  fb.box(236, fy - 4, 74, 22, C.gold);
  fb.rect(252, fy - 38, 34, 36, C.scarf);
  fb.box(252, fy - 38, 34, 36, C.gold);
  fb.tri(252, fy - 38, 286, fy - 38, 269, fy - 50, C.gold);
}

// —— Reusable Pixel RPG Prop Builders ——

// 本鲸's Signature Blue-and-White Porcelain Rice Bowl (老大的白饭) + Chopsticks + Steam!
function drawRiceBowlProp(fb, cx, cy, t = 0, { steam = true, big = false } = {}) {
  const r = big ? 13 : 9;
  // Fluffy white rice mound on top
  fb.ellipse(cx, cy - 3, r - 1, big ? 7 : 5, C.uiW);
  fb.ellipse(cx - 2, cy - 5, Math.max(3, r - 4), big ? 5 : 3, C.white);
  // Bamboo chopsticks resting diagonally
  fb.line(cx + 2, cy - 7, cx + r + 7, cy - 12, C.gold, 2);
  fb.line(cx + 1, cy - 5, cx + r + 6, cy - 9, C.tan, 1);
  // Porcelain bowl body + blue floral band + foot ring
  fb.ellipse(cx, cy, r, big ? 7 : 5, C.uiW);
  fb.rect(cx - r, cy - 3, r * 2, 3, C.uiW);
  fb.hline(cx - r + 1, cx + r - 1, cy, C.blue);
  for (let x = cx - r + 3; x <= cx + r - 3; x += 4) fb.px(x, cy + 2, C.cobalt);
  fb.rect(cx - (r >> 1), cy + (big ? 6 : 4), r, 3, C.silver);
  fb.box(cx - r, cy - 2, r * 2, big ? 8 : 6, C.ink);
  if (steam) {
    for (let i = 0; i < 3; i++) {
      const sy = cy - (big ? 12 : 9) - mod(Math.round(t * 14 + i * 5), 9);
      const sx = cx - 4 + i * 4 + Math.round(Math.sin(t * 7 + i) * 1.5);
      fb.px(sx, sy, C.uiW);
      fb.px(sx, sy - 2, C.silver);
    }
  }
}

// Sparkling Pixel RPG Potion Flask
function drawPotionBottle(fb, cx, cy, col = C.scarf) {
  fb.rect(cx - 2, cy - 8, 5, 3, C.tan); // cork
  fb.rect(cx - 3, cy - 5, 7, 2, C.uiW); // glass rim
  fb.disc(cx, cy, 6, C.ink);
  fb.disc(cx, cy, 5, col);
  fb.disc(cx - 2, cy - 2, 1.5, C.uiW); // specular shine
}

// Medieval Wooden Weapon & Shield Rack
function drawWeaponRack(fb, x, y) {
  fb.rect(x, y - 24, 30, 24, C.dbrown);
  fb.rect(x + 2, y - 22, 26, 20, C.brown);
  fb.hline(x, x + 29, y - 14, C.goldD);
  // 3 upright gleaming pixel blades
  for (const sx of [x + 6, x + 15, x + 24]) {
    fb.vline(sx, y - 28, y - 6, C.silver);
    fb.vline(sx + 1, y - 27, y - 6, C.uiW);
    fb.hline(sx - 2, sx + 3, y - 9, C.gold);
    fb.vline(sx, y - 8, y - 4, C.scarf);
  }
  // Round knight shield leaning on front
  fb.disc(x + 15, y - 6, 7, C.ink);
  fb.disc(x + 15, y - 6, 6, C.blue);
  fb.disc(x + 15, y - 6, 2.5, C.goldL);
}

// Bustling RPG Market Stall with Striped Awning, Counter Goods & Hanging Sign
function drawMarketStall(fb, x, y, w, stripeCol, label, kind = 'tart', t = 0) {
  // Timber posts & counter
  fb.rect(x + 3, y - 38, 3, 38, C.dbrown);
  fb.rect(x + w - 6, y - 38, 3, 38, C.dbrown);
  fb.rect(x, y - 15, w, 15, C.brown);
  fb.box(x, y - 15, w, 15, C.ink);
  fb.hline(x + 1, x + w - 2, y - 14, C.sand);

  // Striped cloth awning + scalloped valance
  for (let sx = 0; sx < w; sx += 6) {
    const col = ((sx / 6) & 1) ? C.parchment : stripeCol;
    fb.rect(x + sx, y - 42, Math.min(6, w - sx), 11, col);
    fb.disc(x + sx + 3, y - 31, 3, col);
  }
  fb.box(x, y - 42, w, 11, C.ink);

  // Goods displayed on counter!
  if (kind === 'tart') {
    for (let k = 0; k < 4; k++) {
      const tx = x + 10 + k * 12;
      fb.ellipse(tx, y - 17, 5, 2.5, C.tan);
      fb.ellipse(tx, y - 18, 3.5, 2, C.goldL);
    }
  } else if (kind === 'potion') {
    drawPotionBottle(fb, x + 12, y - 19, C.scarf);
    drawPotionBottle(fb, x + 26, y - 19, C.cyan);
    drawPotionBottle(fb, x + 40, y - 19, C.lime);
  } else if (kind === 'smith') {
    // Anvil + gleaming sword on counter
    fb.rect(x + 10, y - 21, 14, 6, C.dslate);
    fb.tri(x + 6, y - 21, x + 10, y - 21, x + 10, y - 17, C.steel);
    fb.line(x + 28, y - 18, x + 48, y - 25, C.goldL, 2);
  }

  // Hanging wooden shop plaque above awning
  const signW = Math.min(w - 6, 42);
  const sx0 = x + ((w - signW) >> 1);
  fb.rect(sx0, y - 55, signW, 12, C.parchment);
  fb.box(sx0, y - 55, signW, 12, C.dbrown);
  drawTextPx(fb, sx0 + 4, y - 53, label, { size: 8, color: C.ink });
}

// Sailing Pixel Ship & Ornate Compass Rose for World Maps (S06 & S14)
function drawSailingShipAndCompass(fb, shipX, shipY, compX, compY, t = 0) {
  const bob = Math.round(Math.sin(t * 4) * 1.5);
  const sy = shipY + bob;
  // Rippling white wave crests under hull
  fb.hline(shipX - 11, shipX + 11, sy + 5, C.uiW);
  // Wooden hull + billowing white sail + red pennant
  fb.tri(shipX - 10, sy, shipX + 10, sy, shipX + 6, sy + 5, C.dbrown);
  fb.tri(shipX - 10, sy, shipX - 6, sy + 5, shipX + 6, sy + 5, C.brown);
  fb.vline(shipX, sy - 14, sy, C.ink);
  fb.tri(shipX, sy - 13, shipX + 10, sy - 3, shipX, sy - 2, C.uiW);
  fb.tri(shipX - 1, sy - 12, shipX - 8, sy - 4, shipX - 1, sy - 3, C.parchment);
  fb.tri(shipX, sy - 14, shipX + 6, sy - 12, shipX, sy - 10, C.scarf);

  // Ornate 8-point Compass Rose
  fb.disc(compX, compY, 13, C.ink);
  fb.disc(compX, compY, 12, C.parchment);
  fb.disc(compX, compY, 10, C.goldD);
  fb.disc(compX, compY, 8, C.parchment);
  fb.tri(compX - 3, compY, compX + 3, compY, compX, compY - 11, C.scarf); // North needle
  fb.tri(compX - 3, compY, compX + 3, compY, compX, compY + 11, C.dslate);
  fb.tri(compX, compY - 3, compX, compY + 3, compX - 11, compY, C.gold);
  fb.tri(compX, compY - 3, compX, compY + 3, compX + 11, compY, C.gold);
  fb.disc(compX, compY, 2, C.goldL);
}

// Springy pop-up book fold-up helper (0 -> 1.09 -> 1.0)
function foldUp(t, t0, dur = 0.72) {
  const u = clamp((t - t0) / dur, 0, 1);
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  return 1 - Math.pow(1 - u, 3) + Math.sin(u * Math.PI) * 0.11;
}

// Medium Close-Up of the Castle's Rainbow Royal Balcony (used in S02b, S03a, S03d, S04)
function drawRoyalBalconyCloseup(fb, t, { night = false, burning = false, teaParty = false } = {}) {
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
    // Distant fairy-tale garden cypresses & sparkling fountains flanking the keep!
    for (const gx of [18, 302]) {
      fb.tri(gx - 12, 180, gx + 12, 180, gx, 96, C.dgreen);
      fb.tri(gx - 9, 152, gx + 9, 152, gx, 88, C.green);
    }
  }

  // Grand stone facade of the Central Keep
  fb.rect(46, 0, 228, H, C.white);
  fb.rect(46, 0, 16, H, C.silver);
  fb.rect(258, 0, 16, H, C.silver);
  fb.vline(46, 0, H, C.ink);
  fb.vline(274, 0, H, C.ink);

  // Blooming Royal Rose Vines climbing both marble columns!
  for (const vx of [53, 265]) {
    for (let vy = 18; vy < 172; vy += 14) {
      const ox = ((vy / 14) & 1) ? 3 : -3;
      fb.disc(vx + ox, vy, 4, C.dgreen);
      fb.disc(vx - ox, vy + 5, 3.5, burning ? C.rust : C.scarf);
      fb.px(vx - ox, vy + 4, C.pink);
    }
  }

  // Twin fluttering crimson royal banners + hanging golden lanterns
  for (const bx of [68, 232]) {
    const sway = Math.round(Math.sin(t * 4.5 + bx) * 2);
    fb.rect(bx, 8, 20, 68, C.scarf);
    fb.vline(bx + 2, 8, 74, C.gold);
    fb.vline(bx + 17, 8, 74, C.gold);
    fb.tri(bx, 76, bx + 20, 76, bx + 10 + sway, 90, C.scarf);
    // Warm golden balcony lantern
    fb.vline(bx + 10, 92, 100, C.ink);
    fb.rect(bx + 6, 100, 8, 9, C.gold);
    fb.rect(bx + 7, 102, 6, 5, C.goldL);
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

  // Optional Royal Afternoon Tea Table (porcelain teapot + strawberry shortcake + flower vases!)
  if (teaParty) {
    fb.rect(194, 102, 24, 12, C.uiW);
    fb.box(194, 102, 24, 12, C.goldD);
    fb.disc(201, 98, 4, C.uiW); // teapot
    fb.box(198, 95, 6, 5, C.cobalt);
    fb.rect(209, 97, 7, 5, C.parchment); // cake slice
    fb.hline(209, 215, 97, C.scarf);
  }

  // Ornate Marble Balcony Terrace, Flower Planters & Balustrade
  fb.rect(88, 126, 144, 8, C.parchment);
  fb.box(88, 126, 144, 8, C.ink);
  fb.rect(94, 134, 132, 18, C.sand);
  fb.box(94, 134, 132, 18, C.ink);
  for (let x = 100; x <= 218; x += 10) {
    fb.rect(x, 114, 4, 12, C.parchment);
    fb.box(x, 114, 4, 12, C.ink);
  }
  // Balcony top handrail + blooming flower boxes + crimson velvet drape
  fb.rect(86, 110, 148, 5, C.goldL);
  fb.box(86, 110, 148, 5, C.ink);
  for (const fx of [94, 214]) {
    fb.rect(fx, 106, 14, 5, C.brown);
    for (let k = 0; k < 4; k++) fb.disc(fx + 2 + k * 3, 104, 2, (k & 1) ? C.pink : C.goldL);
  }
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

// Snappy Full-Color Pop-Up Storybook Kingdom Diorama (Cut I-2: 1.75 – 5.85s)
function drawPopupBookCastle(fb, t, tBase = 1.75) {
  fb.gradV(0, 0, W, H, [C.umber, C.dbrown, C.brown]);
  const zoom = eio(seg(t, tBase + 2.9, tBase + 4.05));
  const padX = Math.round(lerp(14, 0, zoom));
  const padY = Math.round(lerp(9, 0, zoom));

  if (padX > 0 || padY > 0) {
    fb.rect(Math.max(0, padX - 4), Math.max(0, padY - 3), W - Math.max(0, padX - 4) * 2, H - Math.max(0, padY - 3) * 2, C.crimson);
  }
  const px0 = padX, py0 = padY, pw = W - padX * 2, ph = H - padY * 2;
  fb.gradV(px0, py0, pw, ph, [C.blue, C.cyan, C.parchment]);
  fb.gradV(px0, H - padY - 48, pw, 48, [C.lime, C.green, C.parchment]);
  fb.vline(160, py0, H - padY, C.tan);

  const groundY = 148;

  // Rapid-fire pop-up choreography (all 7 layers spring up in just 1.15s!)
  const fMtn = foldUp(t, tBase + 0.02, 0.35);
  if (fMtn > 0) {
    const h1 = Math.round(52 * fMtn), h2 = Math.round(58 * fMtn);
    fb.tri(24, groundY, 134, groundY, 79, groundY - h1, C.slate);
    fb.tri(60, groundY - Math.round(h1 * 0.62), 98, groundY - Math.round(h1 * 0.62), 79, groundY - h1, C.uiW);
    fb.tri(180, groundY, 298, groundY, 239, groundY - h2, C.dslate);
    fb.tri(218, groundY - Math.round(h2 * 0.62), 260, groundY - Math.round(h2 * 0.62), 239, groundY - h2, C.uiW);
  }

  const fHill = foldUp(t, tBase + 0.16, 0.35);
  if (fHill > 0) {
    const hh = Math.round(22 * fHill);
    fb.ellipse(160, groundY + 4, 132, hh, C.green);
    fb.tri(148, groundY - 4, 172, groundY - 4, 198, H - padY, C.sand);
    fb.tri(148, groundY - 4, 122, H - padY, 198, H - padY, C.tan);
  }

  // Spinning Red Windmill on Left Hill + Waterfall on Right!
  const fWall = foldUp(t, tBase + 0.30, 0.38);
  if (fWall > 0) {
    const wh = Math.round(34 * fWall);
    const wy = groundY - wh;
    fb.rect(68, wy, 184, wh, C.white);
    fb.box(68, wy, 184, wh, C.ink);
    for (let x = 70; x < 250; x += 8) fb.rect(x, wy - 3, 5, 3, C.white);
    if (wh > 14) {
      fb.ellipse(160, groundY - 6, 10, Math.min(12, wh - 6), C.ink);
      fb.rect(150, groundY - 6, 20, 6, C.ink);
    }
    // Red storybook windmill on left meadow
    fb.tri(24, groundY + 4, 46, groundY + 4, 35, groundY - 26, C.parchment);
    for (let k = 0; k < 4; k++) {
      const a = t * 2.8 + (k * Math.PI) / 2;
      fb.line(35, groundY - 18, 35 + Math.cos(a) * 16, groundY - 18 + Math.sin(a) * 16, C.scarf, 2);
    }
  }

  const fSpires = foldUp(t, tBase + 0.44, 0.38);
  if (fSpires > 0) {
    const sideTowers = [[54, 48], [90, 60], [212, 60], [248, 48]];
    for (const [tx, maxH] of sideTowers) {
      const th = Math.round(maxH * fSpires);
      const ty = groundY - th;
      fb.rect(tx, ty, 18, th, C.silver);
      fb.box(tx, ty, 18, th, C.ink);
      const rh = Math.round(14 * fSpires);
      fb.tri(tx - 3, ty, tx + 21, ty, tx + 9, ty - rh, C.blue);
      fb.vline(tx + 9, ty - rh - 5, ty - rh, C.gold);
      fb.tri(tx + 9, ty - rh - 5, tx + 15, ty - rh - 3, tx + 9, ty - rh - 1, C.scarf);
    }
  }

  const fKeep = foldUp(t, tBase + 0.56, 0.42);
  if (fKeep > 0) {
    const kh = Math.round(74 * fKeep);
    const ky = groundY - kh;
    fb.rect(138, ky, 44, kh, C.white);
    fb.rect(176, ky, 6, kh, C.silver);
    fb.box(138, ky, 44, kh, C.ink);
    const rh = Math.round(18 * fKeep);
    fb.tri(134, ky, 186, ky, 160, ky - rh, C.scarf);
    if (fKeep > 0.55) {
      fb.disc(160, ky + 18, 8, C.gold);
      fb.disc(160, ky + 18, 6, C.scarf);
      fb.disc(160, ky + 18, 3.5, C.cyan);
      fb.rect(146, ky + 29, 28, 4, C.sand);
      fb.box(146, ky + 29, 28, 4, C.ink);
    }
  }

  const fTown = foldUp(t, tBase + 0.72, 0.38);
  if (fTown > 0) {
    const ch = Math.round(18 * fTown);
    for (const hx of [42, 78, 224, 262]) {
      const hy = groundY + 12 - ch;
      fb.rect(hx, hy, 20, ch, C.parchment);
      fb.box(hx, hy, 20, ch, C.dbrown);
      fb.tri(hx - 2, hy, hx + 22, hy, hx + 10, hy - Math.round(10 * fTown), C.rust);
    }
    if (fTown > 0.65) {
      const dt = Math.max(0, t - (tBase + 0.8));
      drawMapWhaleHero(fb, Math.round(lerp(136, 168, clamp(dt / 2.8, 0, 1))), 165, t, { pose: 'run', scarfLen: 14 });
      drawCastSprite(fb, 92 + Math.round(dt * 5), 160, 'qwen', t, { pose: 'walk' });
      drawCastSprite(fb, 214 - Math.round(dt * 6), 162, 'gemini', t, { pose: 'walk', facing: -1 });
      drawCastSprite(fb, 250, 160, 'zai', t, { pose: 'cheer', facing: -1 });
      drawCastSprite(fb, 160, groundY - 44, 'doubao', t, { pose: 'cheer' });
    }
  }

  // Hanging Puppet-Stage Sun & Clouds on Strings flanking the Top Title Banner!
  const dropU = eo(seg(t, tBase + 0.45, tBase + 1.10));
  if (dropU > 0) {
    const props = [
      { x: 40,  yEnd: 30, kind: 'sun' },
      { x: 74,  yEnd: 46, kind: 'cloud' },
      { x: 248, yEnd: 44, kind: 'cloud' },
      { x: 282, yEnd: 30, kind: 'cloud' },
    ];
    props.forEach((p, idx) => {
      const py = Math.round(lerp(-14, p.yEnd, dropU) + Math.sin(t * 3.5 + idx) * 2);
      fb.vline(p.x, py0, Math.max(py0, py - 8), C.dslate);
      if (p.kind === 'sun') {
        fb.disc(p.x, py, 11, C.goldL);
        fb.disc(p.x, py, 8, C.gold);
      } else {
        fb.ellipse(p.x, py, 14, 5, C.white);
        fb.ellipse(p.x + 6, py + 2, 9, 4, C.silver);
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

  // S01 (0.00 – 1.75s): 1.75s LIGHTNING BOOK ENTRY! Prop-Rich Desk (白饭碗, Potion, Quill, Coins) -> Leap Into Flipping Grimoire!
  if (t < 1.75) {
    fb.gradV(0, 0, W, H, [C.ink, C.umber, C.dbrown]);
    for (let y = 14; y < H; y += 18) fb.hline(0, W - 1, y, C.umber);

    const flicker = Math.round(Math.sin(t * 20) * 3);
    fb.glowDisc(162, 82, 68 + flicker, 145);

    // Left desk props: Brass Candlestick + 本鲸's Steaming Blue-and-White Rice Bowl (老大的白饭) + Gold Coins!
    fb.rect(20, 92, 12, 34, C.parchment);
    fb.box(20, 92, 12, 34, C.ink);
    fb.rect(16, 124, 20, 4, C.gold);
    fb.tri(23, 90, 29, 90, 26 + (flicker > 0 ? 1 : 0), 77, C.orange);
    fb.disc(26, 87, 2.5, C.goldL);
    drawRiceBowlProp(fb, 58, 134, t, { steam: true, big: true });
    for (let c = 0; c < 4; c++) fb.disc(38 + c * 4, 148 - (c & 1) * 2, 2.5, C.goldL);

    // Right desk props: Sparkling Red HP Potion + Cyan Mana Flask + Inkwell & Feather Quill + Rolled Map!
    drawPotionBottle(fb, 266, 124, C.scarf);
    drawPotionBottle(fb, 284, 130, C.cyan);
    fb.rect(246, 140, 48, 9, C.parchment);
    fb.box(246, 140, 48, 9, C.goldD);
    fb.rect(268, 140, 5, 9, C.scarf);
    fb.rect(294, 108, 9, 11, C.navy);
    fb.line(298, 108, 309, 86, C.uiW, 2);

    // Center Crimson Grimoire zooms in (0.00–0.90s) and swings wide open in golden magic (1.12–1.72s)!
    const zoomU = eo(seg(t, 0.0, 0.90));
    const bx = Math.round(lerp(102, 88, zoomU));
    const by = Math.round(lerp(24, 14, zoomU));
    const bw = Math.round(lerp(116, 144, zoomU));
    const bh = Math.round(lerp(94, 118, zoomU));

    fb.rect(bx + 3, by + 4, bw, bh, C.ink);
    fb.rect(bx + 6, by + 3, bw - 6, bh - 4, C.parchment);
    fb.box(bx + 6, by + 3, bw - 6, bh - 4, C.goldD);

    const openU = eio(seg(t, 1.10, 1.70));
    if (openU > 0.02) {
      // Blazing golden-cyan storybook portal erupting from the open pages!
      fb.glowDisc(bx + (bw >> 1), by + (bh >> 1), Math.round(24 + openU * 76), 195);
      for (let r = 0; r < 10; r++) {
        const ang = (r / 10) * Math.PI * 2 + t * 5;
        const cx0 = bx + (bw >> 1), cy0 = by + (bh >> 1);
        fb.line(cx0, cy0, cx0 + Math.cos(ang) * (24 + openU * 65), cy0 + Math.sin(ang) * (18 + openU * 45), C.goldL, 2);
      }
    }

    const coverW = Math.max(8, Math.round((bw - 3) * Math.cos(openU * Math.PI * 0.48)));
    fb.rect(bx, by, coverW, bh, C.crimson);
    fb.rect(bx, by, Math.min(11, coverW), bh, C.scarfD);
    if (coverW > 32) {
      fb.box(bx + 6, by + 5, coverW - 12, bh - 10, C.gold);
      const cx = bx + (coverW >> 1);
      fb.disc(cx, by + 28, 9, C.goldL);
      fb.disc(cx, by + 28, 6, C.gold);
      if (coverW > 96) {
        drawTextPx(fb, bx + 22, by + 48, '达拉崩吧', { size: 12, scale: 2, color: C.goldL, outline: C.ink, tracking: 1 });
      }
    }

    // Chibi Whale-girl sprints up (0.00–1.08s) and LEAPS in a high golden arc straight into the open book (1.08–1.72s)!
    if (t < 1.08) {
      const hx = Math.round(lerp(46, 108, eo(seg(t, 0.0, 1.08))));
      drawMapWhaleHero(fb, hx, 162, t, { pose: 'run', scarfLen: 18 });
    } else {
      const ju = seg(t, 1.08, 1.68);
      const hx = Math.round(lerp(108, 162, ju));
      const hy = Math.round(lerp(162, 78, eo(ju)) - Math.sin(ju * Math.PI) * 28);
      // Sparkling comet trail behind leaping Whale-girl!
      for (let k = 1; k <= 5; k++) {
        fb.disc(hx - k * 6, hy + k * 4, Math.max(1, 4 - (k >> 1)), (k & 1) ? C.goldL : C.cyan);
      }
      if (ju < 0.94) {
        drawMapWhaleHero(fb, hx, hy, t, { pose: 'jump', scarfLen: 20 });
      }
    }

    const mos = t >= 1.60 ? 1 + Math.round(seg(t, 1.60, 1.75) * 5) : 1;
    return { lut: LUT.full, mosaicBlock: mos, texts };
  }

  // S02 (1.75 – 20.08s): 5-SCENE VIBRANT FULL-COLOR JRPG KINGDOM TOUR!
  if (t < 20.08) {
    // Cut I-2 (1.75 – 5.85s): Snappy Full-Color Pop-Up Kingdom + Ornate RPG Title Crest!
    if (t < 5.85) {
      drawPopupBookCastle(fb, t, 1.75);
      // Ornate Royal RPG Title Banner in upper sky (solid 1.80 – 5.80s = 4.00s for crisp readability!)
      if (t >= 1.80 && t < 5.80) {
        drawRpgWindow(fb, 86, 6, 148, 42, { skin: 'parchment' });
        // Crossed golden swords flanking the title crest
        fb.line(93, 36, 105, 14, C.gold, 2);
        fb.line(227, 36, 215, 14, C.gold, 2);
        drawTextPx(fb, 112, 11, '达拉崩吧', { size: 12, scale: 2, color: C.scarf, outline: C.goldL, tracking: 1 });
        drawTextPx(fb, 98, 34, '斑得贝迪卜多比鲁翁', { size: 10, color: C.ink, shadow: C.goldL, tracking: 2 });
        texts.push({ id: 'cover_title', text: '达拉崩吧', x0: 112 * 6, y0: 11 * 6, x1: 212 * 6, y1: 33 * 6 });
        texts.push({ id: 'cover_sub', text: '斑得贝迪卜多比鲁翁', x0: 98 * 6, y0: 34 * 6, x1: 224 * 6, y1: 46 * 6 });
      }
      const mos = t < 1.92 ? Math.max(1, Math.round(lerp(5, 1, seg(t, 1.75, 1.92)))) : 1;
      return { lut: LUT.full, mosaicBlock: mos, texts };
    }

    // Cut I-3 (5.85 – 9.15s): NEW SCENE — Bustling Castle Market Street (蛋挞铺 · 药水屋 · 铁匠铺)!
    if (t < 9.15) {
      fb.gradV(0, 0, W, 126, [C.blue, C.cyan, C.white]);
      // Distant castle spires rising behind the timber town roofs
      fb.tri(138, 62, 182, 62, 160, 20, C.scarf);
      fb.rect(144, 62, 32, 42, C.silver);
      // Timber-framed background townhouses + festive bunting flags across the street!
      for (const [hx, hw] of [[6, 92], [112, 96], [220, 94]]) {
        fb.rect(hx, 52, hw, 76, C.parchment);
        fb.box(hx, 52, hw, 76, C.dbrown);
        fb.tri(hx - 4, 52, hx + hw + 4, 52, hx + (hw >> 1), 28, C.rust);
      }
      for (let fx = 14; fx < 306; fx += 16) {
        fb.line(fx, 36, fx + 16, 36, C.dbrown, 1);
        fb.tri(fx + 2, 36, fx + 12, 36, fx + 7, 44, ((fx / 16) & 1) ? C.scarf : C.goldL);
      }
      // Cobblestone market street
      fb.gradV(0, 126, W, 54, [C.sand, C.tan, C.brown]);
      for (let x = 8; x < W; x += 20) fb.rect(x, 144 + ((x / 20) & 1) * 8, 11, 3, C.parchment);

      // 3 Colorful RPG Market Stalls + Wooden Barrels + Rice-Bowl Lunch Table!
      drawMarketStall(fb, 12, 132, 74, C.scarf, '蛋挞铺', 'tart', t);
      drawMarketStall(fb, 122, 132, 76, C.blue, '药水屋', 'potion', t);
      drawMarketStall(fb, 232, 132, 76, C.green, '铁匠铺', 'smith', t);
      // Shopkeepers greeting happily beside their stalls (clear of awnings!)
      drawCastSprite(fb, 106, 138, 'qwen', t, { pose: 'cheer', facing: 1 });
      drawCastSprite(fb, 216, 138, 'zai', t, { pose: 'cheer', facing: -1 });
      // Wooden barrel + steaming rice bowl on street table!
      fb.rect(89, 120, 12, 14, C.brown); fb.box(89, 120, 12, 14, C.ink);
      drawRiceBowlProp(fb, 95, 116, t, { steam: true });
      drawChest(fb, 204, 132, true);

      // Whale-girl & Gemini happily strolling through the bustling market!
      const u = seg(t, 5.85, 9.10);
      const wx = Math.round(lerp(28, 248, u));
      drawCastSprite(fb, wx - 28, 152, 'gemini', t, { pose: 'walk', facing: 1 });
      drawWhaleHero(fb, wx, 154, t, { pose: 'run', facing: 1, scarfLen: 36 });
      drawRpgWindow(fb, 18, 8, 96, 22, { skin: 'parchment' });
      drawTextPx(fb, 25, 14, '王城集市 · 干饭中', { size: 8, color: C.scarf });
      return { lut: LUT.full, texts };
    }

    // Cut I-4 (9.15 – 12.60s): NEW SCENE — Royal Armory & Slime-Dummy Training Courtyard + ▶ START QUEST!
    if (t < 12.60) {
      fb.gradV(0, 0, W, 122, [C.blue, C.cyan, C.silver]);
      // Castle stone courtyard battlements + upper viewing gallery
      fb.rect(0, 44, W, 80, C.white);
      fb.rect(0, 112, W, 12, C.silver);
      for (let x = 4; x < W; x += 14) fb.rect(x, 38, 8, 6, C.white);
      for (const bx of [28, 148, 274]) {
        fb.rect(bx, 48, 16, 42, C.scarf);
        fb.vline(bx + 2, 48, 88, C.gold);
        fb.vline(bx + 13, 48, 88, C.gold);
      }
      // Queen Claude & Kimi cheering from the upper gallery!
      drawCastSprite(fb, 92, 68, 'claude', t, { pose: 'cheer' });
      drawCastSprite(fb, 214, 68, 'kimi', t, { pose: 'scribe', facing: -1 });

      // Arena sandy training floor + Weapon Racks + Archery Bullseye Target!
      fb.gradV(0, 122, W, 58, [C.sand, C.tan, C.brown]);
      drawWeaponRack(fb, 16, 128);
      drawWeaponRack(fb, 52, 128);
      // Bullseye target on right + stacked crates
      fb.line(276, 108, 268, 132, C.dbrown, 2);
      fb.line(276, 108, 284, 132, C.dbrown, 2);
      fb.disc(276, 108, 13, C.uiW);
      fb.disc(276, 108, 9, C.scarf);
      fb.disc(276, 108, 4, C.goldL);

      // Whale-Girl unleashing combo sword slashes on Straw Dummy & Bouncing Slimes!
      const slashCycle = mod((t - 9.15) * 2.2, 1);
      const lunge = Math.round(Math.sin(slashCycle * Math.PI) * 18);
      drawWhaleHero(fb, 118 + lunge, 148, t, { pose: 'sword', scarfLen: 46 });
      // Golden sword slash crescent + CRIT 999 sparks!
      if (slashCycle > 0.25 && slashCycle < 0.78) {
        fb.line(142 + lunge, 112, 184 + lunge, 142, C.goldL, 3);
        fb.line(144 + lunge, 140, 186 + lunge, 110, C.uiW, 2);
        drawTextPx(fb, 168, 94, 'CRIT 999!', { size: 10, color: C.goldL, outline: C.ink });
      }
      drawMonster(fb, 198, 146, 'slime', t, slashCycle > 0.45);
      drawMonster(fb, 234, 142, 'slime', t + 0.4, slashCycle > 0.65);

      // Solid RPG Start Quest Banner (9.20 – 12.55s = 3.35s continuous hold -> passes readcheck!)
      if (t >= 9.20 && t < 12.55) {
        drawRpgWindow(fb, 94, 8, 132, 24, { alert: true });
        const curBob = (Math.floor(t * 6) & 1) * 2;
        drawTextPx(fb, 104 + curBob, 15, '▶ START QUEST', { size: 10, color: C.goldL, outline: C.ink, tracking: 1 });
        texts.push({ id: 'start_prompt', text: 'START QUEST', x0: 94 * 6, y0: 8 * 6, x1: 226 * 6, y1: 32 * 6 });
      }
      return { lut: LUT.full, texts };
    }

    // Cut I-5 (12.60 – 15.90s): NEW SCENE — Volcanic Gold-Hoard Abyss: GPT Dragon-Girl Awakens!
    if (t < 15.90) {
      fb.gradV(0, 0, W, 136, [C.ink, C.umber, C.crimson]);
      // Jagged obsidian volcano walls & stalactites + bubbling molten lava river!
      for (let x = 10; x < W; x += 26) {
        fb.tri(x - 8, 0, x + 8, 0, x, 20 + (x % 3) * 9, C.ink);
      }
      fb.tri(0, 140, 88, 140, 26, 42, C.night);
      fb.tri(234, 140, 320, 140, 292, 36, C.night);
      fb.gradV(0, 136, W, 44, [C.red, C.orange, C.goldL]);
      // Bubbling lava blisters
      for (let i = 0; i < 6; i++) {
        const lx = 24 + i * 52;
        const lr = 2 + Math.round(Math.abs(Math.sin(t * 6 + i)) * 3);
        fb.disc(lx, 156 + (i & 1) * 8, lr, C.uiW);
      }
      // Colossal Mountain of Stolen Gold, Ruby Chalices & Treasure Chests in center!
      fb.tri(74, 144, 246, 144, 160, 96, C.goldD);
      fb.tri(88, 144, 232, 144, 160, 102, C.gold);
      for (let g = 0; g < 18; g++) {
        fb.disc(98 + g * 7, 136 - (g % 4) * 7, 2.5, (g % 3 === 0) ? C.scarf : C.goldL);
      }
      drawChest(fb, 108, 136, true);
      drawChest(fb, 212, 136, false);
      // Circling shadow bats
      drawMonster(fb, 66 + Math.round(Math.sin(t * 5) * 14), 58, 'bat', t, false);
      drawMonster(fb, 254 - Math.round(Math.cos(t * 5) * 14), 52, 'bat', t + 0.5, false);

      // GPT Dragon-Girl Boss awakens atop her gold mountain (12.6–14.7s), then launches skyward in lightning (14.7–15.9s)!
      if (t < 14.70) {
        fb.glowDisc(160, 82, 46, 150);
        drawGptDragonBoss(fb, 160, 114, t, { rage: t >= 13.6 });
      } else {
        const flyU = eo(seg(t, 14.70, 15.88));
        fb.line(160, 12, 148, 86, C.goldL, 3);
        fb.line(148, 86, 172, 134, C.uiW, 2);
        drawFlyingGptDragon(fb, 160, Math.round(lerp(96, 22, flyU)), t);
      }
      drawRpgWindow(fb, 86, 10, 148, 22, { alert: true });
      drawTextPx(fb, 96, 16, 'WARNING · 恶龙苏醒!!', { size: 8, color: C.goldL, shadow: C.ink });
      return { lut: LUT.full, texts };
    }

    // Cut I-6 (15.90 – 20.08s, L01 很久很久以前): Lush Rose-Garden Rainbow Balcony Tea Party!
    drawRoyalBalconyCloseup(fb, t, { night: false, burning: false, teaParty: true });
    if (t < 18.02) {
      // Pre-vocal royal tea party: Queen Claude & Kimi chatting with Princess Doubao!
      drawCastSprite(fb, 118, 112, 'claude', t, { pose: 'cheer', facing: 1 });
      drawCastSprite(fb, 158, 112, 'doubao', t, { pose: 'cheer', largeDoubao: true });
      drawCastSprite(fb, 222, 114, 'kimi', t, { pose: 'idle', facing: -1 });
    } else {
      // L01 很久很久以前: Spotlight golden beam & waving Princess Doubao center stage!
      fb.lightBeam(160, 26, 160, 62, 0, 138, true);
      drawCastSprite(fb, 114, 113, 'claude', t, { pose: 'idle', facing: 1 });
      drawCastSprite(fb, 160, 112, 'doubao', t, { pose: 'cheer', largeDoubao: true });
    }
    // Fluttering bluebirds & drifting pink rose petals!
    for (let i = 0; i < 3; i++) {
      const bx = Math.round(lerp(42, 274, mod((t - 15.9) * 0.25 + i * 0.33, 1)));
      const by = 36 + i * 20 + Math.round(Math.sin(t * 9 + i) * 4);
      const wing = (Math.floor(t * 12) & 1) ? -3 : 2;
      fb.line(bx - 4, by + wing, bx, by, C.cyan, 2);
      fb.line(bx + 4, by + wing, bx, by, C.uiW, 2);
    }
    for (let i = 0; i < 12; i++) {
      const px = mod(Math.round(30 + i * 27 + t * 20), W);
      const py = mod(Math.round((t - 15.9) * 28 + i * 19), H);
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

    // Cut 3C (23.05 – 24.45s, L03 带来灾难): Town Courtyard Meteor Rain, Overturned Stalls & Panicking Citizens!
    if (t < 24.45) {
      fb.gradV(0, 0, W, 128, [C.umber, C.plum, C.crimson]);
      for (const [hx, hw] of [[8, 66], [82, 58], [186, 60], [254, 58]]) {
        fb.rect(hx, 52, hw, 78, C.parchment);
        fb.box(hx, 52, hw, 78, C.dbrown);
        fb.tri(hx - 4, 52, hx + hw + 4, 52, hx + (hw >> 1), 28, C.rust);
      }
      fb.gradV(0, 128, W, 52, [C.dslate, C.night, C.ink]);
      // Town stone fountain + burning market stall & scattered barrels!
      fb.ellipse(152, 134, 18, 6, C.silver);
      fb.rect(149, 118, 6, 16, C.white);
      drawMarketStall(fb, 18, 134, 58, C.scarf, '蛋挞铺', 'tart', t);
      fb.rect(246, 124, 12, 12, C.brown); fb.box(246, 124, 12, 12, C.ink);
      // Raining 12fps fireballs!
      for (let i = 0; i < 7; i++) {
        const u = mod((t - 23.0) * 1.35 + i * 0.16, 1);
        const fx = Math.round(36 + i * 44 - u * 32);
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

  // S05 (28.10 – 34.11s): 4-Cut Bustling Guild Plaza Recruitment -> Sunbeam Sprint -> Spotlight Shout -> Wanted Poster Slash!
  if (t < 34.11) {
    // Cuts 5A & 5B (28.10 – 32.15s): Prop-Rich Guild Plaza (Fountain, Shop Signs, Weapon Rack, Bunting) + Whale-Girl Arrival!
    if (t < 32.15) {
      fb.gradV(0, 0, W, 128, t >= 30.08 ? [C.blue, C.cyan, C.silver] : [C.dslate, C.slate, C.steel]);
      for (const [hx, hw] of [[8, 62], [76, 54], [202, 56], [264, 52]]) {
        fb.rect(hx, 54, hw, 76, C.parchment);
        fb.box(hx, 54, hw, 76, C.dbrown);
        fb.vline(hx + (hw >> 1), 54, 130, C.dbrown);
        fb.hline(hx, hx + hw - 1, 88, C.dbrown);
        fb.tri(hx - 4, 54, hx + hw + 4, 54, hx + (hw >> 1), 30, C.rust);
      }
      // Overhead festival bunting + hanging guild signs (武器屋 / 公会堂)
      for (let fx = 10; fx < 308; fx += 18) {
        fb.line(fx, 22, fx + 18, 22, C.dbrown, 1);
        fb.tri(fx + 3, 22, fx + 13, 22, fx + 8, 30, ((fx / 18) & 1) ? C.scarf : C.goldL);
      }
      fb.rect(18, 66, 36, 13, C.parchment); fb.box(18, 66, 36, 13, C.dbrown);
      drawTextPx(fb, 22, 69, '武器屋', { size: 8, color: C.ink });
      fb.rect(268, 66, 38, 13, C.parchment); fb.box(268, 66, 38, 13, C.dbrown);
      drawTextPx(fb, 272, 69, '公会堂', { size: 8, color: C.ink });

      fb.gradV(0, 128, W, 52, [C.steel, C.slate, C.dslate]);
      for (let x = 8; x < W; x += 18) fb.hline(x, x + 10, 140, C.silver);
      // Plaza props: Weapon Rack on left, Stone Fountain & Chest on right!
      drawWeaponRack(fb, 18, 132);
      fb.ellipse(284, 136, 18, 6, C.silver);
      fb.ellipse(284, 135, 14, 4, C.cyan);
      fb.rect(281, 120, 6, 15, C.white);
      drawChest(fb, 246, 134, false);

      // Wooden Quest Recruitment Noticeboard (勇者招募 visible full 4.05s across Cuts 5A+5B!)
      fb.rect(142, 86, 4, 44, C.dbrown);
      fb.rect(182, 86, 4, 44, C.dbrown);
      drawRpgWindow(fb, 130, 54, 68, 40, { skin: 'parchment' });
      drawTextPx(fb, 140, 59, '勇者招募', { size: 10, color: C.scarf, tracking: 1 });
      drawTextPx(fb, 138, 74, '悬赏 999G', { size: 8, color: C.ink });
      texts.push({ id: 'recruit_sign', text: '勇者招募', x0: 130 * 6, y0: 54 * 6, x1: 198 * 6, y1: 94 * 6 });

      if (t < 30.08) {
        // Cut 5A: Townsfolk pacing anxiously + worried RPG speech bubble!
        const pace = Math.round(Math.sin(t * 5) * 8);
        drawCastSprite(fb, 108 + pace, 138, 'gemini', t, { pose: 'walk', facing: Math.cos(t * 5) >= 0 ? 1 : -1 });
        drawCastSprite(fb, 214 - pace, 138, 'zai', t, { pose: 'walk', facing: -1 });
        drawCastSprite(fb, 68, 142, 'qwen', t, { pose: 'idle', facing: 1 });
        drawRpgWindow(fb, 42, 80, 74, 18, { skin: 'parchment' });
        drawTextPx(fb, 48, 85, '谁敢讨伐恶龙?', { size: 8, color: C.ink });
      } else {
        // Cut 5B (L07 一位勇者赶来): Golden Sunbeam splits sky + Whale-Girl sprints in trailing dust puffs!
        const runU = eo(seg(t, 30.08, 31.65));
        const hx = Math.round(lerp(12, 118, runU));
        fb.lightBeam(hx - 8, 28, hx + 4, 56, 0, 148, true);
        drawCastSprite(fb, 84, 138, 'gemini', t, { pose: 'cheer', facing: 1 });
        drawCastSprite(fb, 214, 138, 'zai', t, { pose: 'cheer', facing: -1 });
        drawCastSprite(fb, 250, 140, 'qwen', t, { pose: 'cheer', facing: -1 });
        if (runU < 0.95) {
          for (let k = 1; k <= 3; k++) {
            fb.disc(hx - k * 11, 141 - (k & 1) * 2, 3.5 - k * 0.7, C.uiW);
          }
        }
        drawWhaleHero(fb, hx, 143, t, { pose: runU < 0.92 ? 'run' : 'sword', scarfLen: 40 });
        drawRpgWindow(fb, 204, 80, 72, 18, { alert: true });
        drawTextPx(fb, 211, 85, '本鲸接单啦!', { size: 8, color: C.goldL });
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

  // S06 (34.11 – 42.13s): Richly Illustrated Full-Biome Quest Map with Sailing Ship, Compass, Monsters & WHALE-GIRL!
  if (t < 42.13) {
    fb.gradV(0, 0, W, H, [C.parchment, C.sand, C.tan]);

    const prog = seg(t, 34.15, 41.35);
    const pts = [
      [54, 124],   // 0: Castle & Best Sword (L09 我要带上最好的剑)
      [168, 58],   // 1: Highest Snow Mountain (L10 翻过最高的山)
      [284, 118],  // 2: Deepest Pine Forest (L11 闯进最深的森林)
      [362, 86],   // 3: Beside Dragon Peak & Doubao Pink Heart (L12 把公主带回到面前)
    ];

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

    // Azure Ocean Coastline along bottom-left + Sailing Ship + Compass Rose (visible right from frame 1!)
    fb.tri(6, 118, 98 - camX, 174, 6, 174, C.cyan);
    fb.tri(6, 138, 72 - camX, 174, 6, 174, C.blue);
    drawSailingShipAndCompass(fb, Math.max(24, 34 - Math.round(camX * 0.3)), 154, 286, 30, t);

    // Subtle parchment compass grid lines + Winding Azure River & Stone Bridge
    for (let gx = 40; gx < 440; gx += 48) {
      const sx = gx - camX;
      if (sx > 8 && sx < W - 8) fb.vline(sx, 10, H - 10, C.sand);
    }
    fb.line(112 - camX, 170, 142 - camX, 98, C.cyan, 6);
    fb.line(142 - camX, 98, 224 - camX, 14, C.cyan, 4);
    fb.rect(126 - camX, 104, 18, 7, C.brown);
    fb.box(126 - camX, 104, 18, 7, C.ink);

    // Pre-populated RPG Landmarks across the ENTIRE map from 34.11s (zero blank space!), with pop-up bounce highlights!
    // 1. Royal Castle + Treasure Chest + Gleaming Best Sword
    {
      const cx = 36 - camX;
      fb.rect(cx, 102, 26, 20, C.silver);
      fb.box(cx, 102, 26, 20, C.ink);
      fb.tri(cx - 3, 102, cx + 29, 102, cx + 13, 86, C.scarf);
      drawChest(fb, cx + 52, 128, t >= 34.8);
      const swBob = Math.round(Math.sin(t * 8) * 2);
      fb.line(cx + 38, 112 + swBob, cx + 38, 84 + swBob, C.ink, 5);
      fb.line(cx + 38, 112 + swBob, cx + 38, 84 + swBob, C.goldL, 3);
      fb.hline(cx + 31, cx + 45, 104 + swBob, C.gold);
      drawTextPx(fb, cx + 2, 128, '好剑', { size: 10, color: C.dbrown });
    }

    // 2. Highest Snow-Capped Mountain Range + Shadow Bat + Flag!
    {
      const boost = t >= 35.6 ? foldUp(t, 35.6, 0.45) * 0.22 : 0;
      const mh = Math.round(44 * (1 + boost));
      const mx = 168 - camX;
      fb.tri(mx - 54, 86, mx - 8, 86, mx - 31, 52, C.dslate);
      fb.tri(mx - 38, 82, mx + 38, 82, mx, 82 - mh, C.slate);
      fb.tri(mx - 16, 82 - Math.round(mh * 0.58), mx + 16, 82 - Math.round(mh * 0.58), mx, 82 - mh, C.uiW);
      fb.vline(mx, 82 - mh - 10, 82 - mh, C.gold);
      fb.tri(mx, 82 - mh - 10, mx + 9, 82 - mh - 7, mx, 82 - mh - 4, C.scarf);
      drawMonster(fb, mx + 44, 52, 'bat', t, t >= 37.2);
      drawTextPx(fb, mx - 18, 86, '高山', { size: 10, color: C.dbrown });
    }

    // 3. Deepest Pine Forest + Treasure Chest + Roaming Slimes!
    {
      const fx = 284 - camX;
      for (const [ox, oy] of [[-24, 0], [-8, -10], [12, 2], [-14, 10], [6, 10], [26, -6], [36, 8]]) {
        fb.tri(fx + ox - 9, 116 + oy, fx + ox + 9, 116 + oy, fx + ox, 96 + oy, C.dgreen);
        fb.tri(fx + ox - 7, 108 + oy, fx + ox + 7, 108 + oy, fx + ox, 91 + oy, C.green);
        fb.rect(fx + ox - 2, 116 + oy, 4, 5, C.dbrown);
      }
      drawChest(fb, fx - 28, 134, t >= 38.6);
      drawMonster(fb, fx + 28, 122, 'slime', t, t >= 39.1);
      drawTextPx(fb, fx - 14, 132, '深林', { size: 10, color: C.dbrown });
    }

    // 4. Volcanic Dragon Peak + Doubao Princess in Big Pink Pixel Heart!
    {
      const dx = 394 - camX;
      fb.tri(dx - 36, 94, dx + 36, 94, dx, 32, C.dragD);
      fb.tri(dx - 10, 48, dx + 10, 48, dx, 32, C.scarf);
      if (t >= 39.8) {
        const beat = Math.round(Math.sin(t * 10) * 1.5);
        fb.disc(dx - 7, 60 - beat, 12, C.pink);
        fb.disc(dx + 7, 60 - beat, 12, C.pink);
        fb.tri(dx - 19, 64 - beat, dx + 19, 64 - beat, dx, 88 - beat, C.pink);
        drawCastSprite(fb, dx, 81 - beat, 'doubao', t, { pose: 'cheer' });
      }
    }

    // Animated Red Dotted Quest Trail + Dynamic RPG Milestone Banner in top-left!
    for (let s = 0; s < totalSegs; s++) {
      const segU = clamp(prog * totalSegs - s, 0, 1);
      if (segU <= 0) break;
      const [x0, y0] = pts[s], [x1, y1] = pts[s + 1];
      const steps = 14;
      for (let k = 0; k <= Math.floor(segU * steps); k += 2) {
        const u = k / steps;
        const rx = Math.round(lerp(x0, x1, u)) - camX;
        const ry = Math.round(lerp(y0, y1, u) - Math.sin(u * Math.PI) * 12);
        fb.rect(rx - 1, ry - 1, 3, 2, C.scarf);
      }
    }

    const mapPose = (t < 35.1 || t >= 40.6) ? 'sword' : (t >= 36.2 && t < 37.6) ? 'jump' : 'run';
    drawMapWhaleHero(fb, Math.round(heroWX - camX), Math.round(heroWY), t, {
      pose: mapPose,
      facing: 1,
      scarfLen: 18,
    });

    // Live RPG Quest Log Pill in top-left tracking the lyrics!
    const questMsg = t < 35.8 ? '★ 装备：传说好剑!' : t < 37.8 ? '★ 翻越：万仞雪山!' : t < 39.8 ? '★ 突破：迷雾深林!' : '★ 目标：救回豆包!';
    drawRpgWindow(fb, 14, 12, 110, 20, { skin: 'parchment' });
    drawTextPx(fb, 20, 17, questMsg, { size: 8, color: C.scarf });

    fb.box(6, 6, W - 12, H - 12, C.dbrown);
    fb.box(9, 9, W - 18, H - 18, C.brown);
    drawCastSprite(fb, 294, 158, 'claude', t, { pose: 'cheer', facing: -1 });
    return { lut: LUT.full, texts };
  }

  // S07 – S12 (42.13 – 66.69s): ROYAL THRONE ROOM — 3-Cut Lively Lead-In + First Tongue-Twister Climax!
  if (t < 66.69) {
    // Sub-shot S07a (42.13 – 44.14s, L13 国王非常高兴): Red-Carpet Triumphal March + Falling Golden Confetti + Fanfare!
    if (t < 44.14) {
      drawThroneRoom(fb, t, 0);
      drawCastSprite(fb, 44, 134, 'gemini', t, { pose: 'cheer', facing: 1 });
      drawCastSprite(fb, 152, 132, 'zai', t, { pose: 'cheer', facing: -1 });
      drawCastSprite(fb, 182, 132, 'qwen', t, { pose: 'cheer', facing: -1 });
      drawCastSprite(fb, 214, 128, 'kimi', t, { pose: 'cheer', facing: -1 });
      drawCastSprite(fb, 269, 114, 'claude', t, { pose: 'cheer', facing: -1 });

      const marchU = eo(seg(t, 42.13, 43.55));
      const hx = Math.round(lerp(22, 102, marchU));
      drawWhaleHero(fb, hx, 140, t, { pose: marchU < 0.92 ? 'run' : 'sword', scarfLen: 42 });

      for (let i = 0; i < 18; i++) {
        const cx = mod(Math.round(18 + i * 17 + t * 22), W);
        const cy = mod(Math.round((t - 42.13) * 48 + i * 13), 156);
        fb.rect(cx, cy, 3, 2, (i % 3 === 0) ? C.scarf : (i & 1) ? C.goldL : C.cyan);
      }
      drawRpgWindow(fb, 86, 12, 126, 22, { alert: true });
      drawTextPx(fb, 96, 18, '国王大喜 · 赏金 999G!', { size: 8, color: C.goldL });
      return { lut: LUT.full, texts };
    }

    // Sub-shot S07b (44.14 – 46.64s, L14 忙问他的姓名): Close-Up on Queen Claude & Scribe Kimi's Registration Ledger!
    if (t < 46.64) {
      drawThroneRoom(fb, t, -8);
      drawRpgWindow(fb, 22, 22, 118, 68, { skin: 'parchment' });
      drawTextPx(fb, 34, 29, '【勇者登记簿】', { size: 10, color: C.scarf });
      drawTextPx(fb, 32, 46, '职业：干饭剑士', { size: 8, color: C.ink });
      drawTextPx(fb, 32, 60, '姓名：________', { size: 8, color: C.dbrown });
      if (Math.floor(t * 6) & 1) fb.rect(82, 60, 6, 9, C.scarf);

      drawCastSprite(fb, 184, 136, 'kimi', t, { pose: 'scribe', facing: -1 });
      drawCastSprite(fb, 246, 134, 'claude', t, { pose: 'cheer', big: true, facing: -1 });
      drawDialogBox(fb, t, {
        who: 'claude', mood: 'neutral', name: '大小姐陛下', text: '勇士，快报上你的大名！', t0: 44.14, dur: 1.5,
      });
      return { lut: LUT.full, texts };
    }

    // Sub-shot S08 (46.64 – 51.65s, L15–L16 年轻人想了想 / 他说陛下我叫): Hilarious RPG Name-Brainstorm UI Gag!
    if (t >= 46.64 && t < 51.65) {
      drawThroneRoom(fb, t, -12);
      drawCastSprite(fb, 30, 134, 'zai', t, { pose: 'cheer' });
      drawWhaleHero(fb, 112, 146, t, { pose: t < 49.65 ? 'think' : 'sword', scale: 2, scarfLen: 26 });

      if (t < 49.65) {
        drawRiceBowlProp(fb, 68, 76, t, { steam: true });
        if (t >= 46.72) {
          drawRpgWindow(fb, 152, 16, 142, 24, { skin: 'parchment' });
          drawTextPx(fb, 160, 23, '候选1：护食本鲸  [太短✕]', { size: 8, color: C.dbrown });
        }
        if (t >= 47.65) {
          drawRpgWindow(fb, 158, 44, 142, 24, { skin: 'parchment' });
          drawTextPx(fb, 166, 51, '候选2：干饭魔丸  [不够帅✕]', { size: 8, color: C.dbrown });
        }
        if (t >= 48.55) {
          drawRpgWindow(fb, 148, 74, 156, 26, { alert: true });
          drawTextPx(fb, 156, 82, '★ 终极真名：13字拉满!!', { size: 8, color: C.goldL });
        }
      } else {
        for (let i = 0; i < 10; i++) {
          const ang = (i / 10) * Math.PI * 2 + t * 1.5;
          fb.line(112, 96, 112 + Math.cos(ang) * 140, 96 + Math.sin(ang) * 90, C.goldL, 1);
        }
        drawWhaleHero(fb, 112, 146, t, { pose: 'shout', scale: 2, scarfLen: 30 });
        drawDialogBox(fb, t, {
          who: 'whale',
          mood: 'shout',
          name: '鲸鱼娘',
          text: '咳咳，陛下听好！我叫——',
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

  // S13 – S14 (66.69 – 85.23s): 5-SCENE INSTRUMENTAL QUEST-PREP MONTAGE!
  //   66.69–69.10s: Royal Blacksmith & Rice-Bowl Ration Prep
  //   69.10–71.35s: Castle Stables & Snow-White Steed Mount-Up
  //   71.35–74.25s: Dynamic Diagonal Split-Screen Act II Showdown Crest
  //   74.25–78.35s: Ornate Guild War-Table & 4 Flipping Tarot Cards
  //   78.35–85.23s: Rich Full-Biome World Map with Ship, Compass & Whale-Girl!
  if (t < 85.23) {
    // 66.69 – 69.10s: NEW SCENE — Royal Blacksmith Forge & Bento Ration Prep!
    if (t < 69.10) {
      fb.gradV(0, 0, W, 130, [C.umber, C.dbrown, C.brown]);
      // Brick stone forge chimney on left + roaring orange furnace fire!
      fb.rect(14, 18, 66, 114, C.dslate);
      fb.box(14, 18, 66, 114, C.ink);
      fb.rect(24, 72, 46, 44, C.ink);
      const f12 = Math.floor(t * 12);
      fb.tri(28, 114, 66, 114, 47 + ((f12 & 1) ? 3 : -3), 78, C.red);
      fb.tri(34, 114, 60, 114, 47, 86, C.orange);
      fb.disc(47, 104, 6, C.goldL);
      fb.glowDisc(47, 98, 48, 145);

      // Weapon racks, potion shelf & wooden ration table!
      drawWeaponRack(fb, 94, 126);
      fb.rect(198, 44, 96, 7, C.dbrown);
      drawPotionBottle(fb, 212, 38, C.scarf);
      drawPotionBottle(fb, 232, 38, C.cyan);
      drawPotionBottle(fb, 252, 38, C.lime);
      drawPotionBottle(fb, 274, 38, C.goldL);

      fb.gradV(0, 130, W, 50, [C.tan, C.brown, C.dbrown]);
      // Heavy iron anvil + wooden table holding 本鲸's giant steaming Rice Bowl!
      fb.rect(92, 128, 24, 12, C.steel);
      fb.tri(84, 128, 92, 128, 92, 136, C.silver);
      fb.rect(206, 124, 56, 18, C.brown);
      fb.box(206, 124, 56, 18, C.ink);
      drawRiceBowlProp(fb, 234, 118, t, { steam: true, big: true });

      // Gemini hammering sparks on sword + Qwen packing rations + Whale-girl powering up!
      drawCastSprite(fb, 124, 140, 'gemini', t, { pose: 'cheer', facing: 1 });
      drawCastSprite(fb, 274, 140, 'qwen', t, { pose: 'cheer', facing: -1 });
      drawWhaleHero(fb, 168, 146, t, { pose: 'sword', scarfLen: 46 });
      if (f12 & 1) {
        fb.line(104, 124, 116, 112, C.goldL, 2);
        fb.px(118, 109, C.uiW);
      }
      drawRpgWindow(fb, 96, 10, 146, 22, { alert: true });
      drawTextPx(fb, 105, 16, '行前整备 · 圣剑+白饭MAX!', { size: 8, color: C.goldL });
      return { lut: LUT.full, texts };
    }

    // 69.10 – 71.35s: NEW SCENE — Royal Timber Stables & Snow-White Steed Mount-Up!
    if (t < 71.35) {
      fb.gradV(0, 0, W, 126, [C.blue, C.cyan, C.parchment]);
      // Timber stable barn frame, hayloft & open wooden double gates!
      fb.rect(12, 28, 296, 100, C.brown);
      fb.box(12, 28, 296, 100, C.ink);
      fb.rect(112, 46, 96, 82, C.cyan); // sunlit open stable doorway!
      fb.tri(8, 28, 312, 28, 160, 4, C.rust);
      // Golden hay bales, carrot barrel & hanging stable lanterns!
      for (const hx of [26, 54, 244]) {
        fb.rect(hx, 108, 24, 18, C.gold);
        fb.box(hx, 108, 24, 18, C.dbrown);
        fb.hline(hx + 3, hx + 20, 115, C.amber);
      }
      for (const lx of [94, 226]) {
        fb.vline(lx, 32, 46, C.ink);
        fb.rect(lx - 4, 46, 8, 9, C.goldL);
      }
      fb.gradV(0, 126, W, 54, [C.sand, C.tan, C.brown]);

      // Zai & Kimi cheering by the stable doors as Whale-girl leaps onto the Snow-White Steed!
      drawCastSprite(fb, 84, 138, 'zai', t, { pose: 'cheer', facing: 1 });
      drawCastSprite(fb, 232, 138, 'kimi', t, { pose: 'cheer', facing: -1 });
      const mountU = eo(seg(t, 69.25, 70.35));
      drawWhiteHorse(fb, 160, 144, t, 1);
      if (mountU < 0.65) {
        const jx = Math.round(lerp(124, 158, mountU / 0.65));
        const jy = Math.round(lerp(144, 118, mountU / 0.65) - Math.sin((mountU / 0.65) * Math.PI) * 18);
        drawWhaleHero(fb, jx, jy, t, { pose: 'sword', scarfLen: 48 });
      } else {
        drawWhaleHero(fb, 158, 127, t, { pose: 'ride', scarfLen: 64 });
      }
      drawRpgWindow(fb, 94, 12, 132, 20, { skin: 'parchment' });
      drawTextPx(fb, 104, 17, '获得坐骑：疾风白马!!', { size: 8, color: C.scarf });
      return { lut: LUT.full, texts };
    }

    // 71.35 – 78.35s: Dynamic Diagonal Act II Showdown Crest (71.35–74.25s) -> Guild War-Table Tarot (74.25–78.35s)!
    if (t < 78.35) {
      if (t < 74.25) {
        // Upper-left: Sunlit Emerald Plains with Mounted Whale-Girl charging!
        fb.gradV(0, 0, W, 94, [C.blue, C.cyan, C.lime]);
        drawWhiteHorse(fb, 68, 76, t, 1);
        drawWhaleHero(fb, 66, 59, t, { pose: 'ride', scarfLen: 52 });
        // Lower-right: Volcanic Crimson Abyss with GPT Dragon-Girl & Caged Doubao!
        fb.gradV(0, 94, W, 86, [C.umber, C.crimson, C.ink]);
        drawDoubaoInCage(fb, 224, 146, t, true, 92);
        drawGptDragonBoss(fb, 282, 154, t, { rage: true });
        // Blazing Golden Lightning Slash dividing the screen + Center Act II Crest!
        fb.line(0, 112, 320, 68, C.ink, 7);
        fb.line(0, 112, 320, 68, C.goldL, 3);
        drawRpgWindow(fb, 88, 52, 132, 58, { alert: true });
        drawTextPx(fb, 104, 58, '达拉崩吧', { size: 12, scale: 2, color: C.goldL, outline: C.ink, tracking: 2 });
        drawTextPx(fb, 96, 88, '斑得贝迪卜多比鲁翁', { size: 10, color: C.parchment, shadow: C.ink, tracking: 2 });
        texts.push({ id: 'act_title', text: '达拉崩吧', x0: 104 * 6, y0: 58 * 6, x1: 214 * 6, y1: 84 * 6 });
      } else {
        // Ornate Guild Tavern War-Table + Props (Candle, Compass, Potion, Coins, Rice Bowl) + 4 Flipping Tarot Cards!
        fb.gradV(0, 0, W, H, [C.umber, C.dbrown, C.brown]);
        for (let y = 26; y < H; y += 28) fb.hline(6, W - 7, y, C.umber);
        fb.box(5, 5, W - 10, H - 10, C.gold);
        fb.box(8, 8, W - 16, H - 16, C.goldD);

        // War-table perimeter props!
        drawRiceBowlProp(fb, 24, 160, t, { steam: true });
        drawPotionBottle(fb, 298, 158, C.scarf);
        drawSailingShipAndCompass(fb, -40, -40, 26, 28, t); // draws ornate compass rose at (26,28)!
        for (let c = 0; c < 5; c++) fb.disc(282 + (c % 3) * 5, 24 + (c >> 1) * 5, 2.5, C.goldL);

        drawRpgWindow(fb, 96, 10, 128, 22, { skin: 'parchment' });
        drawTextPx(fb, 106, 15, '达拉崩吧 · 远征阵容', { size: 10, color: C.scarf });
        texts.push({ id: 'party_hdr', text: '达拉崩吧 · 远征阵容', x0: 96 * 6, y0: 10 * 6, x1: 224 * 6, y1: 32 * 6 });

        const cards = [
          { who: 'whale',  title: '勇者', sub: 'LV.1',  flipT: 74.35 },
          { who: 'doubao', title: '公主', sub: '救援!', flipT: 75.05 },
          { who: 'gpt',    title: '恶龙', sub: 'LV.99', flipT: 75.75 },
          { who: 'claude', title: '陛下', sub: '委托',  flipT: 76.45 },
        ];
        cards.forEach((c, idx) => {
          const cx = 52 + idx * 72, cy = 102;
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

    // 78.35 – 85.23s: Richly Illustrated Full-Biome World Map + Sailing Ship + Compass + Royal Seal + WHALE-GIRL!
    fb.gradV(0, 0, W, H, [C.parchment, C.sand, C.tan]);
    // Ocean bay on bottom-left & bottom-right + Sailing Ship + Compass Rose!
    fb.tri(6, 128, 92, 174, 6, 174, C.cyan);
    fb.tri(238, 174, 314, 134, 314, 174, C.cyan);
    drawSailingShipAndCompass(fb, 34, 156, 286, 148, t);

    // Winding river + stone bridge
    fb.line(96, 174, 152, 98, C.cyan, 6);
    fb.line(152, 98, 224, 10, C.cyan, 4);
    fb.rect(128, 96, 18, 8, C.brown);
    fb.box(128, 96, 18, 8, C.ink);

    // Lush Pine Forest Clusters, Castle, Spinning Windmill Village, Snow Mountain Range, Treasure Chests & Dragon Skull Peak!
    for (const [tx, ty] of [[78, 134], [92, 126], [168, 114], [182, 120], [238, 118]]) {
      fb.tri(tx - 7, ty, tx + 7, ty, tx, ty - 16, C.dgreen);
      fb.tri(tx - 5, ty - 6, tx + 5, ty - 6, tx, ty - 19, C.green);
    }
    // Left Royal Castle
    fb.rect(36, 110, 22, 16, C.silver); fb.box(36, 110, 22, 16, C.ink);
    fb.tri(33, 110, 61, 110, 47, 96, C.scarf);
    // Mid Windmill Village + Chest
    fb.rect(146, 76, 16, 14, C.parchment); fb.box(146, 76, 16, 14, C.dbrown);
    fb.tri(144, 76, 164, 76, 154, 64, C.rust);
    for (let k = 0; k < 4; k++) {
      const a = t * 2.5 + (k * Math.PI) / 2;
      fb.line(154, 72, 154 + Math.cos(a) * 10, 72 + Math.sin(a) * 10, C.scarf, 1);
    }
    drawChest(fb, 172, 88, t >= 81.4);
    // Snow Mountain Range + Roaming Slime & Bat
    fb.tri(172, 62, 214, 62, 193, 30, C.dslate);
    fb.tri(184, 58, 236, 58, 210, 18, C.slate);
    fb.tri(198, 36, 222, 36, 210, 18, C.uiW);
    drawMonster(fb, 112, 118, 'slime', t, t >= 80.5);
    drawMonster(fb, 242, 44, 'bat', t, t >= 83.2);
    // Volcanic Dragon Peak on Right
    fb.tri(248, 98, 306, 98, 277, 38, C.dragD);
    fb.tri(268, 52, 286, 52, 277, 38, C.scarf);
    fb.disc(277, 82, 8, C.ink);

    // Giant Red Circular Royal Seal stamped at 79.10s!
    if (t >= 79.10) {
      fb.disc(52, 52, 24, C.scarf);
      fb.disc(52, 52, 21, C.parchment);
      fb.disc(52, 52, 18, C.scarf);
      drawTextPx(fb, 41, 42, '达拉', { size: 10, color: C.parchment });
      drawTextPx(fb, 41, 54, '崩吧', { size: 10, color: C.parchment });
    }
    drawRpgWindow(fb, 92, 10, 114, 18, { skin: 'parchment' });
    drawTextPx(fb, 99, 14, '远征全图 · 直捣龙穴!', { size: 8, color: C.scarf });

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

    fb.box(5, 5, W - 10, H - 10, C.dbrown);
    fb.box(8, 8, W - 16, H - 16, C.brown);
    const mos = t >= 84.65 ? 1 + Math.round(seg(t, 84.65, 85.23) * 10) : 1;
    return { lut: LUT.full, mosaicBlock: mos, texts };
  }

  // S15 (85.23 – 93.25s): Bustling Castle Courtyard Send-Off -> Galloping Across Castle Drawbridge & Sparkling Moat!
  if (t < 93.25) {
    if (t < 89.25) {
      fb.gradV(0, 0, W, 128, [C.blue, C.cyan, C.white]);
      // Timber-framed courtyard shops, castle parapet & festive bunting!
      fb.rect(0, 42, 74, 88, C.parchment); fb.box(0, 42, 74, 88, C.dbrown);
      fb.tri(0, 42, 80, 42, 38, 18, C.rust);
      fb.rect(74, 54, 246, 76, C.silver);
      fb.box(74, 54, 246, 76, C.ink);
      for (let x = 78; x < 318; x += 14) fb.rect(x, 48, 8, 6, C.silver);
      for (const bx of [96, 168, 246]) {
        fb.rect(bx, 58, 14, 36, C.scarf);
        fb.vline(bx + 2, 58, 92, C.gold);
      }
      // Queen Claude waving farewell from the upper castle parapet!
      drawCastSprite(fb, 134, 48, 'claude', t, { pose: 'cheer', facing: 1 });
      // Courtyard market stall, barrels & flower cart!
      drawMarketStall(fb, 8, 132, 62, C.scarf, '干粮铺', 'tart', t);
      fb.gradV(0, 130, W, 50, [C.steel, C.slate, C.dslate]);

      // Cheering party crew (Gemini, Kimi, Zai, Qwen) + showering petals!
      drawCastSprite(fb, 198, 138, 'gemini', t, { pose: 'cheer', facing: -1 });
      drawCastSprite(fb, 228, 140, 'kimi', t, { pose: 'cheer', facing: -1 });
      drawCastSprite(fb, 258, 138, 'zai', t, { pose: 'cheer', facing: -1 });
      drawCastSprite(fb, 288, 140, 'qwen', t, { pose: 'cheer', facing: -1 });
      for (let i = 0; i < 12; i++) {
        const px = mod(Math.round(40 + i * 23 + t * 24), W);
        const py = mod(Math.round(30 + (t - 85.23) * 42 + i * 17), 152);
        fb.rect(px, py, 2, 2, (i & 1) ? C.pink : C.goldL);
      }

      if (t < 86.75) {
        const steedX = Math.round(lerp(24, 96, eo(seg(t, 85.25, 86.65))));
        drawWhiteHorse(fb, steedX, 144, t, 1);
        drawWhaleHero(fb, 122, 142, t, { pose: 'sword', scarfLen: 68 });
      } else {
        const rx = Math.round(lerp(108, 172, eio(seg(t, 86.85, 89.20))));
        drawWhiteHorse(fb, rx, 144, t, 1);
        drawWhaleHero(fb, rx - 2, 127, t, { pose: 'ride', scarfLen: 76 });
      }
      drawRpgWindow(fb, 196, 72, 92, 18, { skin: 'parchment' });
      drawTextPx(fb, 203, 77, '一路顺风 · 必胜!', { size: 8, color: C.scarf });
    } else {
      // 89.25 – 93.25s: High-Speed Charge out the Grand Castle Gate, Wooden Drawbridge & Sparkling Blue Moat!
      const scroll = Math.round((t - 89.25) * 72);
      fb.gradV(0, 0, W, 126, [C.blue, C.cyan, C.white]);
      // Distant emerald hills & pine trees ahead
      for (let i = 0; i < 5; i++) {
        const mx = 90 + i * 74 - Math.round(scroll * 0.25);
        fb.tri(mx, 126, mx + 76, 126, mx + 38, 72, C.slate);
      }
      // Sparkling Azure Castle Moat + Wooden Drawbridge Planks + Emerald Road!
      fb.gradV(0, 126, W, 54, [C.cyan, C.blue, C.navy]);
      for (let wx = 8; wx < W; wx += 22) {
        fb.hline(wx, wx + 10, 154 + ((wx / 22) & 1) * 8, C.uiW);
      }
      const gx = Math.round(lerp(136, -48, seg(t, 89.25, 92.60)));
      // Timber Drawbridge + Iron Chains + Stone Gatehouse!
      fb.rect(gx, 130, 148, 16, C.brown);
      fb.box(gx, 130, 148, 16, C.ink);
      for (let px = gx + 6; px < gx + 144; px += 10) fb.vline(px, 131, 145, C.dbrown);
      fb.line(gx + 20, 62, gx + 128, 130, C.dslate, 2);
      //Emerald meadow road right of drawbridge
      fb.gradV(Math.max(0, gx + 148), 126, W - Math.max(0, gx + 148), 54, [C.lime, C.green, C.dgreen]);
      fb.rect(Math.max(0, gx + 148), 132, W, 16, C.tan);
      // Wooden directional signpost ("恶龙山洞 →")!
      const signX = gx + 178;
      if (signX > -30 && signX < W) {
        fb.rect(signX + 16, 114, 4, 20, C.dbrown);
        fb.rect(signX, 102, 44, 13, C.parchment);
        fb.box(signX, 102, 44, 13, C.dbrown);
        drawTextPx(fb, signX + 4, 105, '恶龙洞→', { size: 8, color: C.scarf });
      }
      // Stone Gatehouse Tower scrolling off left
      fb.rect(gx - 46, 22, 68, 124, C.silver);
      fb.box(gx - 46, 22, 68, 124, C.ink);
      fb.rect(gx - 30, 48, 16, 40, C.scarf);

      drawWhiteHorse(fb, 148, 142, t, 1);
      drawWhaleHero(fb, 146, 125, t, { pose: 'ride', scarfLen: 72 });
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

  // S20 (110.54 – 114.55s): Torchlit Dragon Hoard Cavern → Doubao Cage ("后面!") → GIANT DRAGON EYES SNAP OPEN!
  if (t < 114.55) {
    if (t < 113.05) {
      // Atmospheric deep cave (NOT empty black!): stalactites, glowing cyan crystals, gold hoard & past-hero relics!
      fb.gradV(0, 0, W, 140, [C.ink, C.night, C.umber]);
      for (let x = 12; x < W; x += 26) {
        fb.tri(x - 6, 0, x + 6, 0, x, 18 + (x % 3) * 9, C.ink);
      }
      fb.gradV(0, 140, W, 40, [C.umber, C.night, C.ink]);
      // Glowing cyan crystals + piles of stolen gold coins, treasure chests & fallen shields!
      for (const [cx, cy] of [[20, 142], [116, 144], [298, 138]]) {
        fb.tri(cx - 6, cy + 8, cx + 6, cy + 8, cx, cy - 10, C.cyan);
        fb.tri(cx - 2, cy + 8, cx + 3, cy + 8, cx + 1, cy - 6, C.uiW);
      }
      fb.tri(138, 148, 258, 148, 198, 118, C.goldD);
      for (let g = 0; g < 14; g++) fb.disc(148 + g * 7, 142 - (g % 3) * 5, 2, C.goldL);
      drawChest(fb, 152, 140, true);
      drawChest(fb, 232, 142, false);
      // Skull warning post & leaning broken sword on left
      fb.rect(28, 126, 3, 18, C.dbrown);
      fb.disc(29, 123, 4, C.parchment);
      fb.line(94, 144, 102, 124, C.silver, 2);

      // Looming colossal dark winged silhouette of GPT Dragon-Girl rising in the back mist (111.6s+)!
      if (t >= 111.40) {
        const loom = eo(seg(t, 111.40, 112.95));
        const dy = Math.round(lerp(136, 92, loom));
        fb.tri(244, dy, 196, dy - 34, 218, dy + 22, C.ink);
        fb.tri(244, dy, 306, dy - 38, 282, dy + 22, C.ink);
        fb.ellipse(248, dy + 6, 18, 28, C.ink);
      }

      // Warm torch/holy-sword light pool around cautiously advancing Whale-Girl + spotlight on Doubao's cage!
      const hx = Math.round(lerp(36, 74, eo(seg(t, 110.54, 112.40))));
      fb.glowDisc(hx + 10, 132, 42, 115);
      fb.glowDisc(182, 56, 28, 95);
      drawDoubaoInCage(fb, 182, 56, t, t >= 112.1);
      drawWhaleHero(fb, hx, 144, t, { pose: hx < 72 ? 'run' : 'sword', scarfLen: 32 });
      if (t >= 112.15) {
        drawRpgWindow(fb, 118, 24, 54, 20, { alert: true });
        drawTextPx(fb, 125, 29, '小心后面!', { size: 8, color: C.goldL });
      }
      return { lut: LUT.full, texts };
    }
    // 113.05 – 114.55s: TWO COLOSSAL GLOWING GOLD-VIOLET DRAGON EYES SNAP OPEN ABOVE THE GOLD HOARD!
    if (t < 113.85) {
      fb.gradV(0, 0, W, H, [C.ink, C.night, C.ink]);
      fb.tri(140, 154, 280, 154, 210, 122, C.goldD);
      drawDoubaoInCage(fb, 182, 48, t, true);
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
