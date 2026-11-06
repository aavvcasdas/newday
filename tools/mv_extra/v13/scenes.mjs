/**
 * scenes.mjs — Deterministic 32-Shot Canvas Renderer for 《把回忆拼好给你》 v6 (0.000s–56.033s).
 * Zero Math.random(), zero cross-frame mutable state, zero hardcoded lyric text.
 * Synthesizes:
 *  - 《把回忆拼好给你》.mp4 iconic visual metaphors (jigsaw tabletop, Little-Prince rain planet,
 *    monochrome-to-pastel puzzle wall, jigsaw ocean horizon, 2x2 interlocking quad, mint umbrella
 *    rain street + vertical rain stamps, diagonal peeled overcast paper sky, joy-box & cloud bin,
 *    rooftop sky-lantern love words -> multi-ring fireworks -> tilted Polaroid freeze -> underwater
 *    sinking Polaroid, Day/Night interlocking puzzle clocks, coral-red silk ribbon in dusk wind,
 *    sunrise reunion & completed 5x3 jigsaw keepsake).
 *  - xiaosia/voxel-mv: 3-layer miniature diorama staging, square/cutout particle bursts, grounded cast.
 *  - Nyankomintsu/world-execute-me-lyric-mv: offset shadow plates, dot screens, crop marks, stamp type.
 */
import { createCanvas, travelMotion, recordActor, drawActorProp } from './actors.mjs';
import { drawCharacter } from './animation.mjs';
import { drawLead, drawGuest } from './story_actors.mjs';
import { drawLyricDetails } from './lyric_details.mjs';
import { shotAtTime } from './plan.mjs';
import { directionFor, localClock } from './direction.mjs';
import { actionForShot, actionFrame } from './actions.mjs';
import { drawCatenaryGarland, drawDriftingParticles, drawOrigamiBirds, drawMacroForegroundBokeh, drawWindFloraRow, drawVolumetricBeams, drawMiniPolaroid, computeCamera, withCamera } from './diorama.mjs';

let sceneTime = 0;
let sceneCast = new Set();
let sceneShot = null;
function whale(c, options = {}) {
  sceneCast.add('whale');
  const index = sceneShot?.index || 1;
  const state = directionFor(index,'whale').state;
  const baseH = options.u != null ? options.u * 7.4 : (options.h ?? 228);
  const h = [1,17].includes(index) ? baseH * 1.2 : baseH;
  const x = options.x ?? 520, y = options.y ?? 605;
  const f = drawLead(c,index,sceneTime,sceneShot,{x,y,h,alpha:options.alpha ?? 1,flipX:!!options.flipX,noShadow:!!options.noShadow,variant:options.variant}) || drawCharacter(c,'whale',state,localClock(sceneShot,sceneTime,'whale'), {x,y,h,alpha:options.alpha ?? 1,flipX:!!options.flipX,noShadow:!!options.noShadow});
  // The picture visibly contains its puzzle piece. Other inherited props are
  // drawn as a stage overlay, not claimed to be calibrated hand contacts.
  const activeProp=options.heldLantern ? 'lantern' : options.heldRibbon ? 'ribbon' : null;
  if(activeProp){c.save();c.globalAlpha*=options.alpha ?? 1;drawActorProp(c,activeProp,x,y,h,sceneTime,options.flipX?-1:1);c.restore();}
  recordActor({actor:'whale',t:sceneTime,x,y,jump:0,lean:0,pose:`atlas:${state}:${f.column}`,armRot:0,legRot:0});
  return {actor:'whale',x,y,h,pose:state};
}
function guest(c, name, options = {}) {
  sceneCast.add(name);
  const index = sceneShot?.index || 1;
  const state=directionFor(index,name).state;
  const h=options.h ?? (name==='claude'?218:268),x=options.x ?? 820,y=options.y ?? 605;
  const f=drawGuest(c,name,sceneTime,sceneShot,{x,y,h,alpha:options.opacity ?? 1,flipX:!!options.flipX,noShadow:!!options.noShadow}) || drawCharacter(c,name,state,localClock(sceneShot,sceneTime,name),{x,y,h,alpha:options.opacity ?? 1,flipX:!!options.flipX,noShadow:!!options.noShadow});
  recordActor({actor:name,t:sceneTime,x,y,jump:0,lean:0,pose:`atlas:${state}:${f.column}`,armRot:0,legRot:0});
  return {actor:name,x,y,h,pose:state};
}

import {
  buildJigsawGrid,
  drawExtrudedPiece,
  clipJigsawCell,
  traceJigsawPiece,
} from './jigsaw.mjs';
import {
  clamp,
  mix,
  prog,
  ease,
  easeOut,
  backOut,
  hash,
  rect,
  poly,
  line,
  ellipse,
  drawCropMarks,
  drawDotScreen,
  drawStampTiles,
  drawVerticalRainStamps,
  drawSkyLanternStamps,
  drawHorizonKeywordPlate,
} from './plate.mjs';

const GRID_8X5 = buildJigsawGrid(8, 5, 19, false);
const GRID_2X2 = buildJigsawGrid(2, 2, 43, true);
const GRID_1X2 = buildJigsawGrid(2, 1, 61, true);
const GRID_5X3 = buildJigsawGrid(5, 3, 29, true);

// ---------------------------------------------------------------------------
// Shared Scenic Building Blocks
// ---------------------------------------------------------------------------

function skyGrad(c, stops, x0 = 0, y0 = 0, x1 = 0, y1 = 720) {
  const g = c.createLinearGradient(x0, y0, x1, y1);
  for (const [p, col] of stops) g.addColorStop(p, col);
  c.fillStyle = g;
  c.fillRect(0, 0, 1280, 720);
}

function drawPaperCloud(c, x, y, s = 1, fill = '#f8f1df', shade = 'rgba(28, 44, 62, 0.14)') {
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  for (const [dx, dy, col] of [
    [4, 5, shade],
    [0, 0, fill],
  ]) {
    c.fillStyle = col;
    c.beginPath();
    c.roundRect(-66 + dx, -6 + dy, 132, 30, 15);
    c.arc(-30 + dx, -8 + dy, 23, 0, Math.PI * 2);
    c.arc(6 + dx, -14 + dy, 29, 0, Math.PI * 2);
    c.arc(38 + dx, -5 + dy, 20, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}

function drawStarField(c, t, count = 72, seed = 11, yMax = 430, alpha = 1) {
  c.save();
  for (let i = 0; i < count; i++) {
    const x = hash(seed * 97 + i * 3 + 1) * 1280;
    const y = 36 + hash(seed * 97 + i * 3 + 2) * (yMax - 36);
    const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 2.4 + i * 1.7));
    const sz = i % 9 === 0 ? 3.2 : 1.9;
    c.fillStyle = i % 5 === 0 ? '#ffe4a8' : '#e6f0ff';
    c.globalAlpha = alpha * tw * 0.85;
    c.fillRect(x - sz / 2, y - sz / 2, sz, sz);
    if (i % 14 === 0) {
      c.fillRect(x - sz * 1.6, y - 0.5, sz * 3.2, 1);
      c.fillRect(x - 0.5, y - sz * 1.6, 1, sz * 3.2);
    }
  }
  c.restore();
}

function drawSquareRain(c, t, { count = 76, x0 = 0, x1 = 1280, y0 = 36, y1 = 640, slant = -14, color = 'rgba(205, 224, 238, 0.38)' } = {}) {
  c.save();
  c.strokeStyle = color;
  c.lineWidth = 1.5;
  for (let i = 0; i < count; i++) {
    const u = (hash(i * 19 + 3) + t * (1.25 + (i % 5) * 0.14)) % 1;
    const x = x0 + hash(i * 31 + 7) * (x1 - x0) + u * slant;
    const y = y0 + u * (y1 - y0);
    line(c, [[x, y], [x + slant * 0.18, y + 17]], color, 1.45);
  }
  c.restore();
}

function drawPaperOcean(c, t, horizonY = 336, waveLayers = 5) {
  const cols = ['#2b7490', '#3588a4', '#469eb8', '#62b6cb', '#8fd1de'];
  rect(c, 0, horizonY, 1280, 720 - horizonY, cols[0]);

  for (let li = 0; li < waveLayers; li++) {
    const baseY = horizonY + 26 + li * ((650 - horizonY) / waveLayers);
    const amp = 6 + li * 2.6;
    const speed = (li % 2 === 0 ? 1 : -1) * (0.85 + li * 0.18);
    // Paper drop shadow above wave crest
    for (const [dy, fill] of [
      [-4, 'rgba(255, 250, 236, 0.52)'],
      [0, cols[Math.min(cols.length - 1, li)]],
    ]) {
      c.beginPath();
      c.moveTo(0, 720);
      for (let x = 0; x <= 1280; x += 32) {
        const wy =
          baseY +
          dy +
          Math.sin(x * 0.011 + t * speed + li * 1.4) * amp +
          Math.cos(x * 0.023 - t * 0.7 + li) * (amp * 0.35);
        c.lineTo(x, wy);
      }
      c.lineTo(1280, 720);
      c.closePath();
      c.fillStyle = fill;
      c.fill();
    }
  }

  // Subtle jigsaw grid embossed over the sea surface
  c.save();
  c.globalAlpha = 0.14;
  const seaGrid = buildJigsawGrid(7, 3, 73, false);
  const cw = 1280 / 7;
  const ch = (660 - horizonY) / 3;
  for (let r = 0; r < 3; r++) {
    for (let col = 0; col < 7; col++) {
      traceJigsawPiece(c, col * cw, horizonY + r * ch, cw, ch, seaGrid[r][col], 0.18);
      c.strokeStyle = '#f8f4e6';
      c.lineWidth = 1.4;
      c.stroke();
    }
  }
  c.restore();
}

function drawNightRooftopWorld(c, t, { viewWide = false, glowBoost = 0 } = {}) {
  skyGrad(c, [
    [0, '#0c162b'],
    [0.52, '#17294a'],
    [0.84, '#293e66'],
    [1, '#18263d'],
  ]);
  drawStarField(c, t, 88, 23, 390, 0.92);

  if (glowBoost > 0) {
    const fg = c.createRadialGradient(640, 215, 20, 640, 215, 480);
    fg.addColorStop(0, `rgba(255, 198, 152, ${0.26 * glowBoost})`);
    fg.addColorStop(0.55, `rgba(190, 128, 215, ${0.14 * glowBoost})`);
    fg.addColorStop(1, 'rgba(20, 32, 58, 0)');
    c.fillStyle = fg;
    c.fillRect(0, 0, 1280, 520);
  }

  // Distant harbor water reflection strip
  const waterY = viewWide ? 470 : 492;
  rect(c, 0, waterY, 1280, 90, '#12223b');
  for (let i = 0; i < 34; i++) {
    const wx = 40 + hash(i * 17 + 5) * 1200;
    const wy = waterY + 8 + hash(i * 17 + 9) * 68;
    const ww = 18 + hash(i * 13 + 2) * 44;
    rect(
      c,
      wx + Math.sin(t * 1.9 + i) * 4,
      wy,
      ww,
      2.4,
      glowBoost > 0.2 ? 'rgba(255, 194, 138, 0.42)' : 'rgba(245, 214, 150, 0.25)',
      1
    );
  }

  // Layered paper city skyline with warm lit windows
  const blds = [
    [0, 378, 96, '#14233c'],
    [88, 344, 112, '#192b48'],
    [192, 392, 88, '#13213a'],
    [272, 328, 118, '#1b2e4d'],
    [382, 366, 102, '#152540'],
    [476, 352, 92, '#192b47'],
    [712, 358, 98, '#182a46'],
    [802, 322, 122, '#1c3050'],
    [916, 372, 96, '#15253f'],
    [1004, 338, 116, '#1a2c4a'],
    [1112, 368, 94, '#14233b'],
    [1198, 348, 92, '#182944'],
  ];
  for (const [bx, by, bw, col] of blds) {
    rect(c, bx, by, bw, waterY - by + 8, col, 2);
    for (let wy = by + 14; wy < waterY - 12; wy += 18) {
      for (let wx = bx + 10; wx < bx + bw - 14; wx += 16) {
        const h = hash(wx * 7 + wy * 13);
        if (h > 0.44) {
          const warm = h > 0.76 ? '#ffd78c' : '#f2b86b';
          c.globalAlpha = 0.55 + 0.35 * Math.sin(t * 1.4 + wx * 0.1);
          rect(c, wx, wy, 7, 9, warm, 1);
          c.globalAlpha = 1;
        }
      }
    }
  }

  // Foreground rooftop terrace & balustrade where Whale Girl and Doubao stand
  const deckY = viewWide ? 584 : 596;
  rect(c, 0, deckY - 38, 1280, 6, '#506784');
  for (let rx = 24; rx < 1280; rx += 38) {
    rect(c, rx, deckY - 34, 4, 36, '#394d68');
  }
  rect(c, 0, deckY, 1280, 720 - deckY, '#203049');
  rect(c, 0, deckY, 1280, 7, '#6c829e');
  return deckY;
}

/**
 * Ballistic multi-ring square/cutout particle burst (voxel-mv square particles + gravity arc).
 */
function drawFireworkBurst(
  c,
  t,
  t0,
  { cx = 640, cy = 200, maxR = 175, colors = ['#ffd98e', '#ff8aa8', '#b996ff'], count = 58, seed = 7 } = {}
) {
  const dt = t - t0;
  if (dt < -0.55 || dt > 2.65) return;

  // Launch comet trail before detonation
  if (dt < 0.04) {
    const launchK = clamp((dt + 0.55) / 0.55);
    const ly = mix(495, cy, easeOut(launchK));
    const lx = cx + Math.sin(launchK * 5 + seed) * 8;
    line(c, [[lx, ly + 42], [lx, ly]], 'rgba(255, 224, 150, 0.78)', 3);
    rect(c, lx - 3, ly - 3, 6, 6, '#fff5d4', 1);
    return;
  }

  const k = clamp(dt / 2.25);
  const expand = easeOut(clamp(dt / 1.35));
  const grav = dt * dt * 36;
  const fade = 1 - ease(clamp((dt - 0.85) / 1.65));

  c.save();
  // Core bloom flash
  if (dt < 0.45) {
    const flashA = (1 - dt / 0.45) * 0.55;
    const rg = c.createRadialGradient(cx, cy, 2, cx, cy, maxR * 0.72);
    rg.addColorStop(0, `rgba(255, 248, 225, ${flashA})`);
    rg.addColorStop(1, 'rgba(255, 190, 140, 0)');
    c.fillStyle = rg;
    c.fillRect(cx - maxR, cy - maxR, maxR * 2, maxR * 2);
  }

  for (let ring = 0; ring < 2; ring++) {
    const ringScale = ring === 0 ? 1.0 : 0.58;
    const n = ring === 0 ? count : Math.floor(count * 0.55);
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + hash(seed * 41 + i + ring * 99) * 0.14;
      const spd = (0.78 + hash(seed * 73 + i * 3 + ring) * 0.34) * maxR * ringScale;
      const px = cx + Math.cos(ang) * spd * expand;
      const py = cy + Math.sin(ang) * spd * expand * 0.88 + grav * (0.65 + ring * 0.25);
      const pxPrev = cx + Math.cos(ang) * spd * Math.max(0, expand - 0.13);
      const pyPrev =
        cy +
        Math.sin(ang) * spd * Math.max(0, expand - 0.13) * 0.88 +
        Math.max(0, dt - 0.12) ** 2 * 36 * (0.65 + ring * 0.25);

      const col = colors[(i + ring) % colors.length];
      c.globalAlpha = fade * (0.65 + 0.35 * Math.sin(dt * 9 + i));
      line(c, [[pxPrev, pyPrev], [px, py]], col, ring === 0 ? 2.2 : 1.6);
      const sz = ring === 0 ? 4.6 * (1 - k * 0.35) : 3.4 * (1 - k * 0.35);
      rect(c, px - sz / 2, py - sz / 2, sz, sz, '#fff8e8');
      rect(c, px - sz * 0.38, py - sz * 0.38, sz * 0.76, sz * 0.76, col);
    }
  }
  c.restore();
}

// Pre-cached deterministic Polaroid snapshot of our own S23 grand firework rooftop @ t=37.55s
let POLAROID_SNAP = null;
function getPolaroidSnapshot() {
  if (POLAROID_SNAP) return POLAROID_SNAP;
  const snapW = 640;
  const snapH = 420;
  const cv = createCanvas(snapW, snapH);
  const g = cv.getContext('2d');
  g.scale(0.5, 7 / 12);
  const tSnap = 37.55;
  const deckY = drawNightRooftopWorld(g, tSnap, { viewWide: true, glowBoost: 0.9 });
  drawFireworkBurst(g, tSnap, 35.98, {
    cx: 430,
    cy: 196,
    maxR: 195,
    colors: ['#ffd98e', '#ff8aa8', '#9ecbff'],
    count: 64,
    seed: 31,
  });
  drawFireworkBurst(g, tSnap, 36.18, {
    cx: 845,
    cy: 178,
    maxR: 210,
    colors: ['#ffe6a3', '#c89bff', '#ff9478'],
    count: 68,
    seed: 47,
  });
  // Snapshot actors belong to the frozen S23, not the live shot's cast or time.
  // Drawing them directly prevents cache initialization from hiding S24 actors.
  const snapShot=shotAtTime(tSnap);
  const whaleOpt={x:560,y:deckY+12,h:25*7.4};
  const state=directionFor(snapShot.index,'whale').state;
  drawLead(g,snapShot.index,tSnap,snapShot,whaleOpt) ||
    drawCharacter(g,'whale',state,localClock(snapShot,tSnap,'whale'),whaleOpt);
  drawGuest(g,'doubao',tSnap,snapShot,{x:705,y:deckY+12,h:250});
  POLAROID_SNAP = cv;
  return cv;
}

function drawPolaroidCard(c, { cx = 640, cy = 340, scale = 1, angle = -0.078, label = '' } = {}) {
  const snap = getPolaroidSnapshot();
  c.save();
  c.translate(cx, cy);
  c.rotate(angle);
  c.scale(scale, scale);

  // Soft craft shadow + thick cream Polaroid frame
  rect(c, -236 + 10, -196 + 14, 472, 396, 'rgba(7, 14, 24, 0.44)', 8);
  rect(c, -236, -196, 472, 396, '#fbf4e4', 6);
  c.strokeStyle = '#dfd1b4';
  c.lineWidth = 1.6;
  c.strokeRect(-235, -195, 470, 394);

  c.drawImage(snap, -210, -172, 420, 294);
  c.strokeStyle = 'rgba(24, 36, 52, 0.25)';
  c.strokeRect(-210, -172, 420, 294);

  if (label) {
    c.font = '700 28px MvPlay, MvBold';
    c.fillStyle = '#3b332c';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(label, 0, 158);
  }
  c.restore();
}

function drawSunriseSceneCore(c, t, bound, { showWhale = false, whaleAlpha = 1, reunited = false, headlineLine = 0 } = {}) {
  skyGrad(c, [
    [0, '#47365e'],
    [0.32, '#9a5268'],
    [0.64, '#e58b63'],
    [0.88, '#ffd38c'],
    [1, '#ffe9b8'],
  ]);

  // Rising golden sun + radial dawn rays
  const sunY = 336 - easeOut(prog(t, 48.67, 52.5)) * 28;
  const sg = c.createRadialGradient(640, sunY, 16, 640, sunY, 360);
  sg.addColorStop(0, 'rgba(255, 250, 220, 0.95)');
  sg.addColorStop(0.32, 'rgba(255, 204, 130, 0.52)');
  sg.addColorStop(1, 'rgba(255, 150, 110, 0)');
  c.fillStyle = sg;
  c.fillRect(0, 0, 1280, 560);

  ellipse(c, 640, sunY, 68, 68, '#fff4cf');

  // Shimmering dawn sea
  rect(c, 0, 386, 1280, 150, '#c96f68');
  for (let i = 0; i < 26; i++) {
    const wy = 394 + i * 5.2;
    const ww = 190 - i * 4 + Math.sin(t * 2.2 + i) * 18;
    rect(c, 640 - ww / 2, wy, ww, 2.5, 'rgba(255, 238, 186, 0.65)', 1);
  }

  drawPaperCloud(c, 250 + Math.sin(t * 0.4) * 10, 148, 0.95, '#fbd4be', 'rgba(92, 48, 68, 0.16)');
  drawPaperCloud(c, 1025 - Math.sin(t * 0.35) * 10, 164, 0.88, '#fbd4be', 'rgba(92, 48, 68, 0.16)');

  // Warm grassy coastal headland
  poly(
    c,
    [
      [0, 520],
      [340, 496],
      [760, 504],
      [1280, 488],
      [1280, 720],
      [0, 720],
    ],
    '#5e6f52'
  );
  poly(
    c,
    [
      [0, 556],
      [480, 538],
      [960, 548],
      [1280, 534],
      [1280, 720],
      [0, 720],
    ],
    '#465844'
  );

  // Floating warm dawn motes
  for (let i = 0; i < 28; i++) {
    const mx = 120 + hash(i * 23 + 3) * 1040;
    const my = 470 - ((hash(i * 19 + 7) + t * 0.08) % 1) * 320;
    c.fillStyle = i % 2 === 0 ? 'rgba(255, 238, 184, 0.65)' : 'rgba(255, 182, 146, 0.55)';
    c.fillRect(mx, my, 4, 4);
  }

  if (headlineLine === 15) {
    drawHorizonKeywordPlate(c, bound.text(15), t, 48.78, {
      cx: 640,
      y: 178,
      size: 56,
      color: '#fff4df',
      shadow: 'rgba(138, 48, 62, 0.72)',
      dx: 3.5,
      dy: 3.5,
    });
  }

  // Finale cast belongs to the landscape itself. In S32 this function is
  // painted inside the scaled postcard, so everyone stays inside its frame.
  if (sceneShot?.index === 31 || sceneShot?.index === 32) {
    const guests=[['claude',100],['qwen',235],['kimi',370],['gpt',905],['zai',1040],['gemini',1175]];
    for (const [name,x] of guests) guest(c,name,{x,y:590,h:166});
  }
  const doubaoX = showWhale ? 748 : 650;
  guest(c, 'doubao', {
    x: doubaoX,
    y: 590,
    h: 298,
    lean: Math.sin(t * 1.4) * 0.012,
  });

  if (showWhale) {
    whale(c, {
      x: 522,
      y: 592,
      u: 29.5,
      view: reunited ? 'front' : 'q',
      pose: reunited ? 'heart' : 'wave',
      alpha: whaleAlpha,
      heldPiece: reunited && t < 54.15,
      breath: Math.sin(t * 2.1) * 0.4,
    });
  }
}

// ---------------------------------------------------------------------------
// Shot-by-Shot Deterministic Scene Implementations (S01 - S32)
// ---------------------------------------------------------------------------

function paintBaseShot(c, t, shot, env) {
  sceneTime = t;
  const { bound, cue } = env;
  const id = shot.id;

  // === ACT A: S01 - S07 ===
  if (id === 'S01_intro_puzzle' || id === 'S02_tiny_step' || id === 'S03_vast_horizon') {
    skyGrad(c, [
      [0, '#e2e0da'],
      [0.62, '#c8c7c1'],
      [1, '#aaa9a2'],
    ]);
    drawDotScreen(c, { color: 'rgba(66, 52, 36, 0.055)', step: 22 });

    const isWide = id === 'S03_vast_horizon';
    const pullK = isWide ? easeOut(prog(t, 2.87, 3.92)) : 0;
    const camScale = isWide ? mix(0.92, 0.66, pullK) : 1.0;

    drawPaperCloud(c, 250 - t * 9, 136, 0.92, '#fbf5e8');
    drawPaperCloud(c, 980 - t * 7, 156, 1.05, '#fbf5e8');
    if (isWide) {
      drawPaperCloud(c, 610 - t * 6, 108, 0.78, '#fbf5e8');
    }

    c.save();
    c.translate(640, 495);
    c.scale(camScale, camScale);
    c.translate(-640, -495);

    // Tabletop jigsaw strip
    const lockK = id === 'S01_intro_puzzle' ? backOut(prog(t, 0.04, 0.76)) : 1;
    const pieceW = 216;
    const pieceH = 122;
    const rowY = 472;
    const cols = isWide ? [-3, -2, -1, 0, 1, 2, 3] : [-2, -1, 0, 1, 2];
    for (const ci of cols) {
      const slide = ci === 0 ? 0 : (1 - lockK) * Math.sign(ci) * 86;
      const px = 640 - pieceW / 2 + ci * (pieceW - 4) + slide;
      const isCenter = ci === 0;
      drawExtrudedPiece(
        c,
        px,
        rowY + (Math.abs(ci) % 2) * 3,
        pieceW,
        pieceH,
        { top: ci % 2 === 0 ? 1 : -1, right: 1, bottom: 0, left: -1 },
        {
          fill: isCenter ? '#ebdfb9' : ci % 2 === 0 ? '#cbc9c3' : '#b5b4ae',
          side: isCenter ? '#a69a7a' : '#898882',
          stroke: '#fbf2df',
          depth: 11,
        }
      );
    }

    // Protagonist motion on the central golden piece
    const stepM =
      id === 'S02_tiny_step'
        ? travelMotion(t, { start: 1.18, end: 2.36, x0: 606, x1: 652, steps: 2.5 })
        : { x: id === 'S01_intro_puzzle' ? 606 : 652, phase: 0, stride: 0, moving: false };

    whale(c, {
      x: stepM.x,
      y: rowY,
      u: 29,
      view: stepM.moving ? 'front' : id === 'S01_intro_puzzle' ? 'front' : 'q',
      pose: 'wave',
      phase: stepM.phase,
      stride: stepM.stride,
      breath: Math.sin(t * 2.3) * 0.4,
    });
    // Keep companions on the same puzzle surface and within its camera,
    // instead of compositing them onto unrelated floor-level wing slots.
    if (id === 'S02_tiny_step' || isWide) {
      guest(c, 'kimi', {x: 405, y: rowY, h: 178});
      guest(c, 'claude', {x: 870, y: rowY, h: 178});
    }
    c.restore();

    if (isWide) drawCropMarks(c, { color: 'rgba(84, 68, 48, 0.28)', target: true });
    if (cue) drawStampTiles(c, cue, bound, t, { y: 88 });
    return;
  }

  if (id === 'S04_rain_planet' || id === 'S05_star_across') {
    skyGrad(c, [
      [0, '#172338'],
      [0.58, '#263954'],
      [1, '#334a66'],
    ]);
    drawStarField(c, t, 68, 31, 560, id === 'S05_star_across' ? 0.95 : 0.62);

    const rainFade = id === 'S04_rain_planet' ? 1 : 1 - easeOut(prog(t, 6.67, 7.45));
    if (rainFade > 0.04) {
      c.save();
      c.globalAlpha = rainFade;
      drawPaperCloud(c, 470 + Math.sin(t * 0.8) * 8, 128, 1.18, '#66798f', 'rgba(10, 18, 30, 0.32)');
      drawSquareRain(c, t, { count: 44, x0: 340, x1: 610, y0: 152, y1: 430, slant: -10 });
      c.restore();
    }

    // Little-Prince round jigsaw planet in bottom-left/center
    const planetCx = id === 'S04_rain_planet' ? 540 : 445;
    const planetCy = 598;
    const planetR = 205;
    c.save();
    c.beginPath();
    c.arc(planetCx, planetCy, planetR, 0, Math.PI * 2);
    c.clip();
    rect(c, planetCx - planetR, planetCy - planetR, planetR * 2, planetR * 2, '#5c7285');
    const pGrid = buildJigsawGrid(4, 3, 53, false);
    for (let r = 0; r < 3; r++) {
      for (let col = 0; col < 4; col++) {
        const gx = planetCx - planetR + col * 104;
        const gy = planetCy - planetR + r * 92;
        traceJigsawPiece(c, gx, gy, 104, 92, pGrid[r][col], 0.2);
        c.fillStyle = (r + col) % 2 === 0 ? '#688094' : '#566c7f';
        c.fill();
        c.strokeStyle = 'rgba(232, 224, 204, 0.38)';
        c.lineWidth = 1.6;
        c.stroke();
      }
    }
    c.restore();
    c.strokeStyle = '#d7ccb4';
    c.lineWidth = 2.6;
    c.beginPath();
    c.arc(planetCx, planetCy, planetR, Math.PI * 1.08, Math.PI * 1.92);
    c.stroke();

    // Protagonist on the crown of the puzzle planet
    const standUp = id === 'S04_rain_planet' ? 0 : easeOut(prog(t, 6.72, 7.42));
    whale(c, {
      x: planetCx,
      y: planetCy - planetR + 10,
      u: 27.5,
      view: standUp > 0.65 ? 'q' : 'front',
      pose: standUp > 0.7 ? 'wave' : 'heart',
      kneel: (1 - standUp) * 0.78,
      arm: standUp > 0.7 ? -0.22 : 0,
    });

    // Companion islands share the original starry world and support the feet;
    // no floor shadows floating unsupported in empty space.
    const companions = id === 'S04_rain_planet'
      ? [['kimi', 180, 515], ['claude', 1100, 515]]
      : [['kimi', 175, 515]];
    for (const [name, x, y] of companions) {
      drawExtrudedPiece(c, x - 72, y, 144, 38,
        { top: 0, right: 1, bottom: 1, left: -1 },
        { fill: '#788ca4', side: '#435673', stroke: '#d9d9cd', depth: 8 });
      guest(c, name, {x, y: y + 5, h: 158, noShadow: true});
    }

    // S05: Floating warm golden star-island with Gemini on upper-right!
    if (id === 'S05_star_across') {
      const appear = easeOut(prog(t, 6.75, 7.65));
      c.save();
      c.globalAlpha = appear;
      const islX = 918;
      const islY = 392 + Math.sin(t * 1.6) * 4;
      const glow = c.createRadialGradient(islX, islY - 78, 8, islX, islY - 78, 185);
      glow.addColorStop(0, 'rgba(255, 226, 156, 0.52)');
      glow.addColorStop(1, 'rgba(255, 195, 110, 0)');
      c.fillStyle = glow;
      c.fillRect(islX - 190, islY - 260, 380, 340);

      drawExtrudedPiece(
        c,
        islX - 110,
        islY - 12,
        220,
        54,
        { top: 0, right: 1, bottom: 1, left: -1 },
        { fill: '#e8c783', side: '#ab8848', stroke: '#fff2cf', depth: 9 }
      );
      guest(c, 'gemini', { x: islX, y: islY + 4, h: 224, lean: Math.sin(t * 1.3) * 0.014 });
      c.restore();
    }

    drawStampTiles(c, cue, bound, t, { y: 86, darkTheme: true });
    return;
  }

  if (id === 'S06_gray_wall_meet' || id === 'S07_pastel_awakening') {
    const pastelPalette = ['#f8d89c', '#f5b8ad', '#a9d6e8', '#cbe3be', '#f7e8c8', '#e5c6eb'];
    const waveFront = id === 'S07_pastel_awakening' ? easeOut(prog(t, 10.12, 11.12)) * 11.5 : 0;

    // 8x5 Interlocking Jigsaw Backdrop Wall
    const cw = 160;
    const ch = 114;
    for (let r = 0; r < 5; r++) {
      for (let col = 0; col < 8; col++) {
        const distFromRight = 7 - col + Math.abs(r - 2) * 0.45;
        const lit = clamp(waveFront - distFromRight * 0.92);
        const grayV = 150 + ((r + col) % 2) * 14;
        const grayHex = `rgb(${grayV}, ${grayV - 2}, ${grayV - 6})`;
        const colHex = pastelPalette[(r * 3 + col) % pastelPalette.length];

        clipJigsawCell(
          c,
          col * cw,
          36 + r * ch,
          cw,
          ch,
          GRID_8X5[r][col],
          () => {
            rect(c, col * cw - 36, 36 + r * ch - 36, cw + 72, ch + 72, grayHex);
            if (lit > 0) {
              c.save();
              c.globalAlpha = ease(lit);
              rect(c, col * cw - 36, 36 + r * ch - 36, cw + 72, ch + 72, colHex);
              c.restore();
            }
          },
          {
            stroke: lit > 0.5 ? '#fff8ea' : '#c9c4ba',
            shadowStroke: 'rgba(30, 38, 48, 0.22)',
            lineWidth: 2.2,
          }
        );
      }
    }

    // Grounded stage plinth
    rect(c, 0, 566, 1280, 154, id === 'S07_pastel_awakening' ? '#dfd0b4' : '#7a7e84');
    rect(c, 0, 566, 1280, 6, id === 'S07_pastel_awakening' ? '#fff3da' : '#a8acb2');

    // Warm spark between Whale Girl & Doubao
    const sparkX = 695;
    const sparkY = 445 + Math.sin(t * 3.1) * 5;
    const sparkR = id === 'S07_pastel_awakening' ? 185 : 95;
    const sg = c.createRadialGradient(sparkX, sparkY, 4, sparkX, sparkY, sparkR);
    sg.addColorStop(0, 'rgba(255, 244, 192, 0.92)');
    sg.addColorStop(0.45, 'rgba(255, 198, 122, 0.42)');
    sg.addColorStop(1, 'rgba(255, 190, 120, 0)');
    c.fillStyle = sg;
    c.fillRect(sparkX - sparkR, sparkY - sparkR, sparkR * 2, sparkR * 2);

    const walk =
      id === 'S06_gray_wall_meet'
        ? travelMotion(t, { start: 8.42, end: 9.66, x0: 410, x1: 560, steps: 3 })
        : { x: 560, phase: 0, stride: 0, moving: false };

    whale(c, {
      x: walk.x,
      y: 588,
      u: 29,
      view: walk.moving ? 'q' : 'front',
      pose: id === 'S07_pastel_awakening' && t > 10.45 ? 'heart' : 'wave',
      phase: walk.phase,
      stride: walk.stride,
      breath: Math.sin(t * 2.2) * 0.4,
    });
    guest(c, 'doubao', {
      x: 792,
      y: 588,
      h: 296,
      lean: Math.sin(t * 1.5) * 0.012,
    });

    if (id === 'S07_pastel_awakening') drawCropMarks(c, { color: 'rgba(72, 58, 44, 0.30)' });
    drawStampTiles(c, cue, bound, t, { y: 92 });
    return;
  }

  // === ACT B: S08 - S12 ===
  if (id === 'S08_eyes_closeup') {
    const bigGrid = buildJigsawGrid(4, 3, 81, false);
    const cols = ['#bce3ef', '#f8dfc1', '#d2ecf2', '#f6cfc4'];
    for (let r = 0; r < 3; r++) {
      for (let col = 0; col < 4; col++) {
        clipJigsawCell(
          c,
          col * 320,
          r * 240,
          320,
          240,
          bigGrid[r][col],
          () => rect(c, col * 320 - 60, r * 240 - 60, 440, 360, cols[(r + col) % cols.length]),
          { stroke: '#fff9ed', lineWidth: 3.2 }
        );
      }
    }
    drawDotScreen(c, { color: 'rgba(34, 72, 92, 0.06)', step: 20 });

    // Soft ocean-blue aura behind Whale Girl close-up
    ellipse(c, 640, 390, 250, 250, 'rgba(255, 252, 242, 0.52)');
    whale(c, {
      x: 640,
      y: 760,
      u: 72,
      view: 'front',
      pose: 'wave',
      headTilt: Math.sin(t * 1.5) * 0.02,
      noShadow: true,
    });

    // Sparkling sea-glint stars around her open eyes
    for (let i = 0; i < 12; i++) {
      const sx = 390 + hash(i * 17 + 3) * 500;
      const sy = 175 + hash(i * 29 + 5) * 240;
      const pulse = 0.4 + 0.6 * Math.sin(t * 3.4 + i);
      c.fillStyle = `rgba(255, 250, 224, ${0.75 * pulse})`;
      rect(c, sx - 3, sy - 3, 6, 6, '#fff9de');
    }

    drawCropMarks(c, { color: 'rgba(42, 74, 92, 0.34)', target: true });
    drawStampTiles(c, cue, bound, t, { y: 86 });
    return;
  }

  if (id === 'S09_ocean_shore_gaze' || id === 'S10_boundless_sea_plate') {
    skyGrad(c, [
      [0, '#82cde6'],
      [0.52, '#bce7f2'],
      [0.56, '#fff5dc'],
      [1, '#4ca2bc'],
    ]);

    const horizonY = id === 'S10_boundless_sea_plate' ? 318 : 344;
    // Warm sun & distant paper sailboat
    ellipse(c, 920, horizonY - 58, 52, 52, 'rgba(255, 246, 206, 0.92)');
    drawPaperCloud(c, 250 + (t - 13) * 11, 128, 1.02, '#fffaf0');
    drawPaperCloud(c, 995 - (t - 13) * 9, 142, 0.92, '#fffaf0');

    drawPaperOcean(c, t, horizonY, 5);

    // Distant white paper sailboat
    const boatX = 835 + (t - 13) * 14;
    poly(c, [[boatX, horizonY - 4], [boatX + 18, horizonY - 4], [boatX + 9, horizonY - 30]], '#fffdf6');
    poly(c, [[boatX - 6, horizonY - 2], [boatX + 24, horizonY - 2], [boatX + 19, horizonY + 5], [boatX - 2, horizonY + 5]], '#d69c66');

    if (id === 'S09_ocean_shore_gaze') {
      // Sandy jigsaw terrace foreground
      poly(c, [[0, 566], [520, 548], [1280, 572], [1280, 720], [0, 720]], '#e5d2af');
      poly(c, [[0, 566], [520, 548], [1280, 572], [1280, 580], [520, 556], [0, 574]], '#fff4dc');

      whale(c, { x: 548, y: 598, u: 28, view: 'back', pose: 'wave', breath: Math.sin(t * 2) * 0.35 });
      guest(c, 'doubao', { x: 716, y: 598, h: 286, lean: 0.01 });
      drawStampTiles(c, cue, bound, t, { y: 88 });
    } else {
      // S10: Panoramic ocean plate + giant horizon typography + foreground dark jigsaw silhouettes!
      drawHorizonKeywordPlate(c, bound.slice(4, 8, 15), t, 14.24, {
        cx: 640,
        y: 208,
        size: 58,
        color: '#1f4e68',
        shadow: 'rgba(255, 250, 234, 0.88)',
        dx: 3.5,
        dy: 3.5,
      });

      const flyK = easeOut(prog(t, 14.2, 15.02));
      drawExtrudedPiece(
        c,
        mix(-60, 72, flyK),
        mix(520, 476, flyK),
        142,
        104,
        { top: 1, right: 1, bottom: 0, left: 0 },
        { fill: '#19374b', side: '#0f2433', stroke: '#5fa8c2', depth: 8, angle: -0.18 }
      );
      drawExtrudedPiece(
        c,
        mix(1180, 1068, flyK),
        mix(510, 462, flyK),
        148,
        108,
        { top: 1, right: 0, bottom: -1, left: 1 },
        { fill: '#19374b', side: '#0f2433', stroke: '#5fa8c2', depth: 8, angle: 0.16 }
      );
      drawCropMarks(c, { color: 'rgba(25, 62, 82, 0.35)', target: true });
    }
    return;
  }

  if (id === 'S11_four_memories_grid') {
    rect(c, 0, 0, 1280, 720, '#efe3c8');
    const qw = 616;
    const qh = 294;
    const ox = 24;
    const oy = 46;

    const cells = [
      // Q1 Top-Left: Whale looks at a book while Claude reaches for a piece
      (gx, gy) => {
        rect(c, gx - 50, gy - 50, qw + 100, qh + 100, '#6e7f8e');
        drawSquareRain(c, t, { count: 28, x0: gx, x1: gx + qw, y0: gy, y1: gy + qh, slant: -8 });
        rect(c, gx, gy + 228, qw, 90, '#53626f');
        rect(c, gx + 170, gy + 194, 240, 12, '#9c7853', 3);
        whale(c, { x: gx + 236, y: gy + 244, u: 19, view: 'q', pose: 'wave', variant: 'whale_read' });
        guest(c, 'claude', { x: gx + 365, y: gy + 244, h: 158 });
      },
      // Q2 Top-Right: Sunlit green meadow with Qwen
      (gx, gy) => {
        rect(c, gx - 50, gy - 50, qw + 100, qh + 100, '#bfe5d8');
        ellipse(c, gx + 500, gy + 66, 34, 34, '#fff2ba');
        poly(c, [[gx - 30, gy + 216], [gx + 320, gy + 188], [gx + qw + 40, gy + 214], [gx + qw + 40, gy + qh + 40], [gx - 30, gy + qh + 40]], '#7eb67d');
        whale(c, { x: gx + 165, y: gy + 244, u: 19, view: 'front', pose: 'heart', variant: 'whale_gather_retry' });
        guest(c, 'qwen', { x: gx + 390, y: gy + 244, h: 192 });
      },
      // Q3 Bottom-Left: Starry constellation sea with Kimi
      (gx, gy) => {
        rect(c, gx - 50, gy - 50, qw + 100, qh + 100, '#1c2f4c');
        const stars = [[gx + 120, gy + 68], [gx + 195, gy + 48], [gx + 268, gy + 82], [gx + 345, gy + 58]];
        line(c, stars, 'rgba(255, 232, 172, 0.55)', 1.4, [4, 4]);
        stars.forEach(([sx, sy]) => rect(c, sx - 3, sy - 3, 6, 6, '#ffe9a8'));
        rect(c, gx, gy + 224, qw, 90, '#2a4364');
        whale(c, { x: gx + 248, y: gy + 246, u: 19, view: 'q', pose: 'wave', variant: 'whale_meet' });
        guest(c, 'kimi', { x: gx + 445, y: gy + 246, h: 190 });
      },
      // Q4 Bottom-Right: Sunny coast + red diamond kite with Gemini
      (gx, gy) => {
        rect(c, gx - 50, gy - 50, qw + 100, qh + 100, '#9bd7ea');
        rect(c, gx, gy + 182, qw, 52, '#4b9ab4');
        rect(c, gx, gy + 224, qw, 90, '#e5cfab');
        const kx = gx + 478 + Math.sin(t * 2.4) * 9;
        const ky = gy + 74 + Math.cos(t * 2.1) * 6;
        // The cord begins at Gemini's spool, using the same travel timing as her cel.
        const kiteU = Math.max(0, Math.min(1, (t-sceneShot.start)/(sceneShot.end-sceneShot.start)));
        const spoolX = gx + 386 - 18 * kiteU, spoolY = gy + 246 - 190 * (1 - 235/416);
        poly(c, [[kx, ky - 18], [kx + 14, ky], [kx, ky + 18], [kx - 14, ky]], '#e05a4f', '#fff3df', 1.2);
        whale(c, { x: gx + 246, y: gy + 246, u: 19, view: 'front', pose: 'wave', arm: -0.32, variant: 'whale_rain_reach' });
        guest(c, 'gemini', { x: gx + 386, y: gy + 246, h: 190 });
        line(c, [[spoolX, spoolY], [spoolX + 55, spoolY - 5], [kx - 18, ky + 34], [kx, ky]], 'rgba(255, 248, 232, 0.88)', 1.3);
      },
    ];

    for (let r = 0; r < 2; r++) {
      for (let col = 0; col < 2; col++) {
        const idx = r * 2 + col;
        const gx = ox + col * qw;
        const gy = oy + r * qh;
        clipJigsawCell(c, gx, gy, qw, qh, GRID_2X2[r][col], () => cells[idx](gx, gy), {
          stroke: '#fbf2de',
          shadowStroke: 'rgba(18, 28, 40, 0.35)',
          lineWidth: 4.0,
          tabSize: 0.16,
        });
      }
    }

    drawStampTiles(c, cue, bound, t, { y: 42 });
    return;
  }

  if (id === 'S12_unused_old_starry_coast') {
    skyGrad(c, [
      [0, '#13233d'],
      [0.58, '#213b5e'],
      [1, '#2b4d6e'],
    ]);
    drawStarField(c, t, 78, 67, 420, 0.95);

    // Constellation lines & shooting star
    const cPts = [
      [290, 146],
      [412, 112],
      [536, 152],
      [668, 108],
      [792, 144],
      [918, 118],
    ];
    line(c, cPts, 'rgba(255, 232, 176, 0.42)', 1.5, [5, 5]);
    cPts.forEach(([sx, sy]) => ellipse(c, sx, sy, 4, 4, '#ffe9aa'));

    const meteorK = prog(t, 17.55, 18.35);
    if (meteorK > 0 && meteorK < 1) {
      const mx = mix(980, 380, meteorK);
      const my = mix(86, 224, meteorK);
      line(c, [[mx + 74, my - 18], [mx, my]], 'rgba(255, 244, 198, 0.85)', 2.6);
    }

    drawPaperOcean(c, t, 438, 3);
    poly(c, [[0, 566], [640, 548], [1280, 568], [1280, 720], [0, 720]], '#22364d');
    rect(c, 0, 564, 1280, 4, '#7ba4bd');

    // Glowing golden jigsaw emblem at top-center locking in
    const lock = backOut(prog(t, 17.45, 18.08));
    drawExtrudedPiece(
      c,
      640 - 38 * lock,
      176,
      76 * lock,
      58 * lock,
      { top: 1, right: 1, bottom: -1, left: 1 },
      { fill: '#ebcb86', side: '#ad8844', stroke: '#fff5d6', depth: 6 }
    );

    whale(c, { x: 538, y: 594, u: 29, view: 'front', pose: 'heart', breath: Math.sin(t * 2) * 0.35 });
    guest(c, 'kimi', { x: 742, y: 594, h: 294, lean: -0.01 });

    drawStampTiles(c, cue, bound, t, { y: 82, darkTheme: true });
    return;
  }

  // === ACT C: S13 - S19 ===
  if (id === 'S12_irreplaceable_lock' || id === 'S13_rain_shelter_enter' || id === 'S14_rain_puddle_daze') {
    const close = id === 'S14_rain_puddle_daze';
    skyGrad(c, [
      [0, '#586570'],
      [0.62, '#717f8a'],
      [1, '#4c5760'],
    ]);

    // Paneled gray street wall (matching ref #13-#14)
    for (let wx = 0; wx < 1280; wx += 92) {
      rect(c, wx, 52, 88, 492, wx % 184 === 0 ? '#687580' : '#616e79');
    }
    rect(c, 0, 540, 1280, 180, '#444f58');
    rect(c, 0, 540, 1280, 6, '#8c99a3');

    // Wooden park bench
    const benchX = close ? 430 : 470;
    rect(c, benchX, 488, 310, 14, '#8d6e53', 3);
    rect(c, benchX, 508, 310, 14, '#7d6047', 3);
    rect(c, benchX - 12, 528, 334, 12, '#9b7b5e', 4);
    rect(c, benchX + 24, 540, 12, 46, '#3a434b');
    rect(c, benchX + 274, 540, 12, 46, '#3a434b');

    // Puddle & concentric rain ripples
    const pudX = close ? 560 : 590;
    const pudY = 608;
    ellipse(c, pudX, pudY, close ? 132 : 104, 18, 'rgba(176, 206, 222, 0.24)');
    for (let r = 0; r < 3; r++) {
      const rp = ((t * 0.85 + r * 0.33) % 1);
      c.strokeStyle = `rgba(226, 242, 248, ${(1 - rp) * 0.58})`;
      c.lineWidth = 1.6;
      c.beginPath();
      c.ellipse(pudX, pudY, 18 + rp * 96, 4 + rp * 13, 0, 0, Math.PI * 2);
      c.stroke();
    }

    // S12 retains the v8 environmental umbrella; in S13/S14 Doubao holds her own.
    if (id === 'S12_irreplaceable_lock') {
    const umbX = close ? 612 : 636;
    const umbY = close ? 314 : 332;
    const umbR = close ? 176 : 154;
    line(c, [[umbX + 28, umbY + 8], [umbX + 28, 515]], '#d7e2e6', 4);
    c.save();
    c.beginPath();
    c.arc(umbX, umbY + 34, umbR, Math.PI, 0, false);
    c.closePath();
    c.fillStyle = '#7ecab5';
    c.fill();
    c.strokeStyle = '#d7f7ec';
    c.lineWidth = 2.5;
    c.stroke();
    c.restore();
    // Umbrella spokes and scalloped trim, matching the original mint canopy.
    c.save();
    c.strokeStyle = 'rgba(238,255,246,0.75)';
    c.lineWidth = 1.8;
    for (const side of [-0.7, 0, 0.7]) {
      c.beginPath(); c.moveTo(umbX, umbY - umbR + 34);
      c.quadraticCurveTo(umbX + side * umbR * 0.35, umbY - 35, umbX + side * umbR, umbY + 34); c.stroke();
    }
    for (let k = 0; k < 6; k++) {
      c.beginPath(); c.arc(umbX - umbR + (k + 0.5) * umbR / 3, umbY + 34, umbR / 6, 0, Math.PI); c.stroke();
    }
    c.restore();
    }

    if (!close) {
      guest(c, 'claude', { x: 252, y: 586, h: 205 });
    }

    const walkIn =
      id === 'S13_rain_shelter_enter'
        ? travelMotion(t, { start: 19.08, end: 20.24, x0: 365, x1: 548, steps: 3 })
        : { x: 534, phase: 0, stride: 0, moving: false };
    const crouch = close ? easeOut(prog(t, 20.74, 21.36)) * 0.76 : 0;

    whale(c, {
      x: walkIn.x,
      y: 590,
      u: close ? 31 : 28,
      view: walkIn.moving ? 'q' : 'front',
      pose: crouch > 0.35 ? 'heart' : 'wave',
      phase: walkIn.phase,
      stride: walkIn.stride,
      kneel: crouch,
      headTilt: crouch * 0.08,
    });
    guest(c, 'doubao', {
      x: id === 'S12_irreplaceable_lock' ? 716 : (close ? 684 : 700),
      y: 590,
      h: id === 'S12_irreplaceable_lock' ? 284 : (close ? 280 : 320),
      lean: close ? -0.02 : 0,
    });

    drawSquareRain(c, t, { count: 72, y0: 40, y1: 635, slant: -12, color: 'rgba(218, 232, 242, 0.36)' });
    drawVerticalRainStamps(c, cue, bound, t);
    return;
  }

  if (id === 'S15_overcast_gather' || id === 'S16_peel_gloom_sky') {
    // 1) Bright blue sunlit world underneath!
    skyGrad(c, [
      [0, '#4ba8dc'],
      [0.58, '#95d6f2'],
      [1, '#dff4fa'],
    ]);
    ellipse(c, 960, 148, 56, 56, '#fff5c0');
    drawPaperCloud(c, 310 + (t - 22) * 12, 154, 1.0, '#ffffff');
    drawPaperCloud(c, 845 - (t - 22) * 9, 182, 0.88, '#ffffff');
    drawPaperOcean(c, t, 430, 3);
    poly(c, [[0, 552], [580, 536], [1280, 554], [1280, 720], [0, 720]], '#7eb67d');

    // 2) Diagonal gray paper-gloom overlay that peels upward-left in S16!
    const peelK = id === 'S15_overcast_gather' ? 0.08 * easeOut(prog(t, 22.8, 23.9)) : mix(0.08, 1.18, easeOut(prog(t, 24.0, 24.72)));
    if (peelK < 1.08) {
      const cutX = mix(1380, -220, peelK);
      const cutY = mix(690, -140, peelK);
      c.save();
      c.beginPath();
      c.moveTo(-80, -80);
      c.lineTo(cutX + 340, -80);
      c.lineTo(cutX - 180, cutY + 520);
      c.lineTo(-80, cutY + 520);
      c.closePath();
      c.clip();
      skyGrad(c, [
        [0, '#4f5b66'],
        [0.65, '#687580'],
        [1, '#505a63'],
      ]);
      drawSquareRain(c, t, { count: 48, slant: -9 });
      c.restore();

      // Curled paper bevel & drop shadow along the diagonal tear!
      c.save();
      poly(
        c,
        [
          [cutX + 340, -80],
          [cutX + 382, -52],
          [cutX - 132, cutY + 548],
          [cutX - 180, cutY + 520],
        ],
        'rgba(18, 32, 48, 0.24)'
      );
      poly(
        c,
        [
          [cutX + 340, -80],
          [cutX + 306, -96],
          [cutX - 216, cutY + 502],
          [cutX - 180, cutY + 520],
        ],
        '#f4ecda',
        '#cfc3aa',
        1.5
      );
      c.restore();
    }

    const standRise = id === 'S15_overcast_gather' ? 1 - easeOut(prog(t, 22.46, 23.25)) : 0;
    const armSweep = id === 'S16_peel_gloom_sky' ? -0.45 * Math.sin(prog(t, 24.0, 24.85) * Math.PI) : 0;

    whale(c, {
      x: 525,
      y: 590,
      u: 29.5,
      view: 'front',
      pose: id === 'S16_peel_gloom_sky' ? 'panic' : 'wave',
      kneel: standRise * 0.55,
      arm: armSweep,
    });
    guest(c, 'qwen', { x: 760, y: 590, h: 294, lean: Math.sin(t * 1.5) * 0.014 });

    drawStampTiles(c, cue, bound, t, { y: 88 });
    return;
  }

  if (id === 'S17_sunlit_collect' || id === 'S18_joy_box_insert' || id === 'S19_banish_gray_pieces') {
    skyGrad(c, [
      [0, '#78c9ec'],
      [0.58, '#c5ecf7'],
      [1, '#e8f7d4'],
    ]);

    // Radiant golden sunbeams
    const sunX = 250;
    const sunY = 132;
    for (let i = 0; i < 10; i++) {
      const ang = (i / 10) * Math.PI * 0.9 - 0.1 + t * 0.06;
      c.save();
      c.translate(sunX, sunY);
      c.rotate(ang);
      poly(c, [[0, -8], [520, -34], [520, 34], [0, 8]], 'rgba(255, 244, 184, 0.16)');
      c.restore();
    }
    ellipse(c, sunX, sunY, 54, 54, '#ffe999');
    drawPaperCloud(c, 880 - (t - 25) * 8, 138, 0.95, '#ffffff');

    // Rolling sunlit green hills
    poly(c, [[0, 492], [420, 456], [890, 478], [1280, 448], [1280, 720], [0, 720]], '#8cc87c');
    poly(c, [[0, 548], [560, 526], [1020, 544], [1280, 528], [1280, 720], [0, 720]], '#6ba968');

    if (id === 'S18_joy_box_insert') {
      // Continuity close-up insert of the open brass-hinged wooden treasure chest!
      rect(c, 0, 510, 1280, 210, '#c89c68');
      poly(c, [[430, 270], [850, 270], [885, 348], [395, 348]], '#8f6239', '#f6dfb8', 2);
      rect(c, 420, 348, 440, 186, '#a97748', 8);
      rect(c, 444, 362, 392, 82, '#5a3a20', 4);
      rect(c, 616, 434, 48, 32, '#ebcb78', 4);

      const dropK = easeOut(prog(t, 26.52, 26.98));
      const glow = c.createRadialGradient(640, 392, 10, 640, 392, 180);
      glow.addColorStop(0, `rgba(255, 234, 152, ${0.35 + 0.5 * dropK})`);
      glow.addColorStop(1, 'rgba(255, 210, 110, 0)');
      c.fillStyle = glow;
      c.fillRect(440, 210, 400, 320);

      drawExtrudedPiece(
        c,
        594,
        mix(168, 362, dropK),
        92,
        74,
        { top: 1, right: 1, bottom: -1, left: 1 },
        { fill: '#f2ce78', side: '#ba9240', stroke: '#fff7dc', depth: 8, angle: (1 - dropK) * 0.28 }
      );
      drawStampTiles(c, cue, bound, t, { y: 88 });
      return;
    }

    // Wooden sorting table + open joy chest on hill
    rect(c, 588, 522, 132, 68, '#9b6d43', 5);
    rect(c, 598, 502, 112, 24, '#7c5330', 3);
    const boxGlow = c.createRadialGradient(654, 512, 4, 654, 512, 86);
    boxGlow.addColorStop(0, 'rgba(255, 235, 152, 0.78)');
    boxGlow.addColorStop(1, 'rgba(255, 215, 120, 0)');
    c.fillStyle = boxGlow;
    c.fillRect(568, 426, 172, 160);

    if (id === 'S17_sunlit_collect') {
      const walk = travelMotion(t, { start: 25.22, end: 25.88, x0: 420, x1: 492, steps: 2 });
      const caught = t >= 25.78;
      if (!caught) {
        const fallK = easeOut(prog(t, 25.22, 25.78));
        drawExtrudedPiece(
          c,
          mix(330, 474, fallK),
          mix(190, 456, fallK),
          46,
          40,
          { top: 1, right: 1, bottom: 0, left: -1 },
          { fill: '#f0ca75', side: '#b88f3c', stroke: '#fff6d8', depth: 5 }
        );
      }
      whale(c, {
        x: walk.x,
        y: 590,
        u: 29,
        view: 'front',
        pose: caught ? 'heart' : 'wave',
        phase: walk.phase,
        stride: walk.stride,
        heldPiece: caught,
      });
    } else {
      // S19: Gray gloom shards & tiny dark cloud slide down chute into trash bin & lid shuts!
      const chuteK = easeOut(prog(t, 27.48, 28.24));
      line(c, [[730, 528], [945, 572]], '#cbb997', 6);
      rect(c, 938, 536, 74, 64, '#5e6b75', 5);
      if (chuteK < 0.92) {
        const gx = mix(748, 956, chuteK);
        const gy = mix(496, 548, chuteK);
        drawPaperCloud(c, gx, gy, 0.42, '#646f78');
        drawExtrudedPiece(
          c,
          gx - 42,
          gy - 12,
          36,
          30,
          { top: -1, right: 1, bottom: 0, left: 1 },
          { fill: '#6c7680', side: '#49525a', stroke: '#aeb7bf', depth: 4 }
        );
      }
      // Bin lid closes cleanly after 28.22s
      const lidClose = easeOut(prog(t, 28.14, 28.34));
      c.save();
      c.translate(938, 536);
      c.rotate(mix(-0.85, 0, lidClose));
      rect(c, -4, -10, 82, 10, '#7c8994', 3);
      c.restore();

      whale(c, { x: 492, y: 590, u: 29, view: 'front', pose: 'hips', breath: Math.sin(t * 2.2) * 0.4 });
    }

    guest(c, 'gpt', { x: 828, y: 590, h: 292, lean: Math.sin(t * 1.4) * 0.012 });
    drawStampTiles(c, cue, bound, t, { y: 88 });
    return;
  }

  // === ACT D: S20 - S26 (CHORUS) ===
  if (id === 'S20_night_love_lanterns') {
    const deckY = drawNightRooftopWorld(c, t, { viewWide: false, glowBoost: 0.15 });
    const cue9 = bound.cues[8];
    drawSkyLanternStamps(c, cue9, bound, t, { arcOnly: false });

    const walk = travelMotion(t, { start: 28.88, end: 29.88, x0: 472, x1: 556, steps: 2 });
    whale(c, {
      x: walk.x,
      y: deckY + 12,
      u: 29,
      view: walk.moving ? 'q' : 'front',
      pose: t > 30.15 ? 'heart' : 'wave',
      phase: walk.phase,
      stride: walk.stride,
      headTilt: -0.04,
    });
    guest(c, 'doubao', { x: 720, y: deckY + 12, h: 294, lean: -0.012 });
    return;
  }

  if (id === 'S21_lantern_arc_launch' || id === 'S22_fireworks_ignite') {
    const isBurst = id === 'S22_fireworks_ignite';
    const deckY = drawNightRooftopWorld(c, t, {
      viewWide: true,
      glowBoost: isBurst ? easeOut(prog(t, 33.88, 34.45)) * 0.85 : 0.2,
    });

    const cue9 = bound.cues[8];
    if (t < 34.25) {
      drawSkyLanternStamps(c, cue9, bound, t, { arcOnly: true });
    }

    // Rising launch trails in S21 -> Detonation in S22!
    drawFireworkBurst(c, t, 33.92, {
      cx: 480,
      cy: 192,
      maxR: 185,
      colors: ['#ffd98e', '#ff8aa8', '#9ecbff'],
      count: 60,
      seed: 19,
    });
    drawFireworkBurst(c, t, 34.18, {
      cx: 795,
      cy: 176,
      maxR: 198,
      colors: ['#ffe6a3', '#c89bff', '#ff9478'],
      count: 64,
      seed: 29,
    });
    if (id === 'S21_lantern_arc_launch') {
      // Early upward golden whistle comets climbing skyward
      for (const [lx, tStart] of [
        [480, 31.85],
        [795, 32.25],
        [640, 32.68],
      ]) {
        const rk = prog(t, tStart, tStart + 1.45);
        if (rk > 0 && rk < 1) {
          const ry = mix(468, 210, easeOut(rk));
          line(c, [[lx, ry + 56], [lx, ry]], 'rgba(255, 224, 152, 0.82)', 2.8);
          rect(c, lx - 3, ry - 3, 6, 6, '#fff7dc');
        }
      }
    }

    const aweDip = isBurst ? Math.sin(prog(t, 33.9, 34.65) * Math.PI) * 0.22 : 0;
    whale(c, {
      x: 562,
      y: deckY + 12,
      u: 26.5,
      view: 'back',
      pose: 'wave',
      kneel: aweDip,
    });
    guest(c, 'doubao', { x: 708, y: deckY + 12, h: 266 });
    drawStampTiles(c, cue, bound, t, { y: 82, darkTheme: true });
    return;
  }

  if (id === 'S23_fireworks_canopy') {
    const deckY = drawNightRooftopWorld(c, t, { viewWide: true, glowBoost: 0.92 });
    drawFireworkBurst(c, t, 35.92, {
      cx: 386,
      cy: 204,
      maxR: 205,
      colors: ['#ffd98e', '#ff8aa8', '#9ecbff'],
      count: 66,
      seed: 31,
    });
    drawFireworkBurst(c, t, 36.12, {
      cx: 894,
      cy: 192,
      maxR: 215,
      colors: ['#ffe6a3', '#c89bff', '#ff9478'],
      count: 70,
      seed: 47,
    });
    drawFireworkBurst(c, t, 36.48, {
      cx: 640,
      cy: 238,
      maxR: 138,
      colors: ['#fff2ba', '#ff9eb5', '#9ee6d8'],
      count: 46,
      seed: 59,
    });

    if (!env.coverClean) {
      drawHorizonKeywordPlate(c, bound.slice(11, 0, 5), t, 35.96, {
        cx: 640,
        y: 96,
        size: 46,
        color: '#fff5df',
        shadow: 'rgba(18, 28, 56, 0.88)',
        dx: 3,
        dy: 3,
      });
    }

    whale(c, { x: 560, y: deckY + 12, u: 26, view: 'back', pose: 'wave' });
    guest(c, 'doubao', { x: 706, y: deckY + 12, h: 262 });
    drawCropMarks(c, { color: 'rgba(255, 236, 198, 0.30)' });
    return;
  }

  if (id === 'S24_polaroid_freeze') {
    // Deep velvet midnight tabletop + tilted white Polaroid snapshot!
    skyGrad(c, [
      [0, '#101a2c'],
      [1, '#1b2b44'],
    ]);
    drawDotScreen(c, { color: 'rgba(255, 240, 210, 0.045)', step: 20 });

    // Residual warm sparks around the frozen Polaroid
    for (let i = 0; i < 22; i++) {
      const sx = 180 + hash(i * 19 + 5) * 920;
      const sy = 90 + hash(i * 29 + 7) * 500;
      c.fillStyle = i % 2 === 0 ? 'rgba(255, 216, 146, 0.45)' : 'rgba(255, 152, 178, 0.38)';
      c.fillRect(sx, sy, 4, 4);
    }

    const settle = backOut(prog(t, 38.033, 38.28));
    drawPolaroidCard(c, {
      cx: 640,
      cy: mix(318, 336, easeOut(prog(t, 38.033, 38.32))),
      scale: mix(1.12, 0.96, settle),
      angle: -0.078,
      label: bound.slice(11, 5, 8),
    });

    // Gentle non-strobing shutter flash (peaks at 0.34 alpha for first 4 frames only)
    const flash = 1 - clamp((t - 38.033) / 0.16);
    if (flash > 0) {
      rect(c, 0, 0, 1280, 720, `rgba(255, 250, 238, ${flash * 0.34})`);
    }
    drawCropMarks(c, { color: 'rgba(245, 232, 206, 0.34)', target: true });
    return;
  }

  if (id === 'S25_abyss_polaroid_sink' || id === 'S26_abyss_reach_up') {
    skyGrad(c, [
      [0, '#123a54'],
      [0.48, '#0c273d'],
      [1, '#071726'],
    ]);

    // Volumetric underwater light shafts piercing down from the surface
    for (const [bx, bw, alpha] of [
      [380, 170, 0.14],
      [630, 240, 0.20],
      [880, 150, 0.11],
    ]) {
      poly(
        c,
        [
          [bx - bw * 0.32, 0],
          [bx + bw * 0.32, 0],
          [bx + bw * 0.95, 720],
          [bx - bw * 0.65, 720],
        ],
        `rgba(142, 224, 245, ${alpha})`
      );
    }

    // Rising bubbles
    for (let i = 0; i < 36; i++) {
      const bx = 120 + hash(i * 31 + 3) * 1040 + Math.sin(t * 2 + i) * 9;
      const by = 680 - ((hash(i * 17 + 9) + t * (0.12 + (i % 4) * 0.03)) % 1) * 640;
      const br = 2.5 + (i % 4) * 1.8;
      c.strokeStyle = 'rgba(196, 242, 255, 0.48)';
      c.lineWidth = 1.3;
      c.beginPath();
      c.arc(bx, by, br, 0, Math.PI * 2);
      c.stroke();
    }

    // Drifting translucent memory jigsaw pieces in the deep sea
    for (let i = 0; i < 6; i++) {
      const px = 210 + i * 168 + Math.sin(t * 1.1 + i) * 18;
      const py = 180 + ((i * 87 + (t - 38.8) * 28) % 390);
      drawExtrudedPiece(
        c,
        px,
        py,
        64,
        52,
        { top: i % 2 ? 1 : -1, right: 1, bottom: -1, left: 0 },
        {
          fill: i % 2 === 0 ? 'rgba(130, 206, 228, 0.42)' : 'rgba(235, 202, 138, 0.44)',
          side: 'rgba(22, 58, 82, 0.45)',
          stroke: 'rgba(218, 248, 255, 0.62)',
          depth: 4,
          angle: Math.sin(t * 0.9 + i) * 0.28,
        }
      );
    }

    if (id === 'S25_abyss_polaroid_sink') {
      const sinkK = easeOut(prog(t, 38.83, 40.62));
      drawPolaroidCard(c, {
        cx: 470 + Math.sin(t * 1.6) * 16,
        cy: mix(250, 448, sinkK),
        scale: 0.52,
        angle: -0.14 + sinkK * 0.26,
        label: bound.slice(11, 5, 8),
      });
      whale(c, {
        x: 775,
        y: mix(355, 498, sinkK),
        u: 27,
        view: 'q',
        pose: 'panic',
        lean: -0.16,
        noShadow: true,
      });
    } else {
      // S26: Medium underwater shot reaching upward toward surface light
      const driftY = 524 + Math.sin(t * 1.7) * 10;
      whale(c, {
        x: 640,
        y: driftY,
        u: 34,
        view: 'front',
        pose: 'panic',
        lean: -0.08 + Math.sin(t * 1.4) * 0.03,
        arm: -0.32,
        noShadow: true,
      });
    }

    drawStampTiles(c, cue, bound, t, { y: 84, darkTheme: true });
    return;
  }

  // === ACT E: S27 - S32 ===
  if (id === 'S27_timezone_puzzle_clocks') {
    const drawTickClock = (cx, cy, r, hourAng, minAng, bg, rim, handCol) => {
      ellipse(c, cx + 3, cy + 4, r, r, 'rgba(12, 22, 34, 0.25)');
      ellipse(c, cx, cy, r, r, bg);
      c.strokeStyle = rim;
      c.lineWidth = 4;
      c.beginPath();
      c.arc(cx, cy, r, 0, Math.PI * 2);
      c.stroke();
      // 12 brass tick marks — ZERO Arabic digits (screen red-line safe!)
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2 - Math.PI / 2;
        const inner = k % 3 === 0 ? r * 0.74 : r * 0.82;
        line(
          c,
          [
            [cx + Math.cos(a) * inner, cy + Math.sin(a) * inner],
            [cx + Math.cos(a) * (r * 0.91), cy + Math.sin(a) * (r * 0.91)],
          ],
          rim,
          k % 3 === 0 ? 2.6 : 1.5
        );
      }
      line(c, [[cx, cy], [cx + Math.cos(hourAng) * r * 0.48, cy + Math.sin(hourAng) * r * 0.48]], handCol, 3.6);
      line(c, [[cx, cy], [cx + Math.cos(minAng) * r * 0.68, cy + Math.sin(minAng) * r * 0.68]], handCol, 2.4);
      ellipse(c, cx, cy, 4.5, 4.5, rim);
    };

    // Left Jigsaw Half: Warm Golden Day + Doubao
    clipJigsawCell(
      c,
      0,
      0,
      640,
      720,
      GRID_1X2[0][0],
      () => {
        skyGrad(c, [
          [0, '#ffe4a8'],
          [0.62, '#fff5d8'],
          [1, '#e6cf9c'],
        ]);
        drawPaperCloud(c, 180, 142, 0.88, '#ffffff');
        poly(c, [[0, 548], [680, 532], [680, 720], [0, 720]], '#cbb07c');
        drawTickClock(310, 182, 68, -0.8 + (t - 42.7) * 0.22, 1.2 + (t - 42.7) * 1.6, '#fffaf0', '#c78c44', '#4d3926');
        guest(c, 'doubao', { x: 332, y: 590, h: 292 });
      },
      { stroke: '#fbf1dc', lineWidth: 4.5, tabSize: 0.16 }
    );

    // Right Jigsaw Half: Indigo Crescent Night + Whale Girl
    clipJigsawCell(
      c,
      640,
      0,
      640,
      720,
      GRID_1X2[0][1],
      () => {
        skyGrad(c, [
          [0, '#13223c'],
          [0.65, '#1f3558'],
          [1, '#162742'],
        ]);
        drawStarField(c, t, 46, 91, 480, 0.9);
        // Crescent moon
        ellipse(c, 1095, 128, 30, 30, '#ffe8a6');
        ellipse(c, 1107, 120, 26, 26, '#162744');

        poly(c, [[600, 548], [1280, 536], [1280, 720], [600, 720]], '#283d5c');
        drawTickClock(968, 182, 68, 2.35 + (t - 42.7) * 0.22, -1.9 + (t - 42.7) * 1.6, '#1c3150', '#d9be82', '#fff2d2');

        const walk = travelMotion(t, { start: 42.74, end: 43.72, x0: 995, x1: 878, steps: 2.5 });
        whale(c, {
          x: walk.x,
          y: 590,
          u: 29,
          view: walk.moving ? 'side' : 'q',
          flipX: true,
          pose: 'wave',
          phase: walk.phase,
          stride: walk.stride,
        });
      },
      { stroke: '#fbf1dc', lineWidth: 4.5, tabSize: 0.16 }
    );

    // Large stamped [时] & [差] flanking the central interlocking puzzle tab!
    const stampK1 = backOut(prog(t, 43.38, 43.62));
    const stampK2 = backOut(prog(t, 43.66, 43.92));
    for (const [ch, sx, k, bg] of [
      [bound.slice(13, 6, 7), 535, stampK1, '#e77946'],
      [bound.slice(13, 7, 8), 745, stampK2, '#3d5c86'],
    ]) {
      if (k <= 0) continue;
      c.save();
      c.translate(sx, 336);
      c.scale(k, k);
      rect(c, -30 + 3, -30 + 4, 60, 60, 'rgba(10, 18, 28, 0.36)', 7);
      rect(c, -30, -30, 60, 60, bg, 7);
      c.strokeStyle = '#fff3dc';
      c.lineWidth = 2;
      c.strokeRect(-29, -29, 58, 58);
      c.font = '700 34px MvBold';
      c.fillStyle = '#fff9ee';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(ch, 0, 1);
      c.restore();
    }

    drawStampTiles(c, cue, bound, t, { y: 72, darkTheme: true });
    return;
  }

  if (id === 'S28_dusk_ribbon_hold' || id === 'S29_dusk_ribbon_release') {
    skyGrad(c, [
      [0, '#352b4f'],
      [0.44, '#6e4568'],
      [0.78, '#c7746d'],
      [1, '#f0ae85'],
    ]);
    drawPaperCloud(c, 280 - (t - 44.6) * 7, 152, 1.0, '#eab09b', 'rgba(48, 28, 56, 0.2)');
    drawPaperCloud(c, 965 - (t - 44.6) * 9, 174, 0.92, '#eab09b', 'rgba(48, 28, 56, 0.2)');

    // Layered dusk hills
    poly(c, [[0, 502], [440, 468], [910, 492], [1280, 460], [1280, 720], [0, 720]], '#533d5c');
    poly(c, [[0, 558], [560, 536], [1040, 552], [1280, 538], [1280, 720], [0, 720]], '#3b2b46');

    if (id === 'S28_dusk_ribbon_hold') {
      // Medium-close shot: calibrated original front/heart hand pixels holding flowing coral-red silk ribbon!
      whale(c, {
        x: 492,
        y: 616,
        u: 37,
        view: 'front',
        pose: 'heart',
        headTilt: 0.04,
        heldRibbon: { t, length: 92, color: '#e26254' },
      });
    } else {
      // S29: Continuity wide cut — hand released cleanly, coral-red silk ribbon sails into dusk sky!
      whale(c, {
        x: 468,
        y: 592,
        u: 29,
        view: 'q',
        pose: 'wave',
        arm: -0.18,
      });

      // Released bird is animated from the character's fingertips in drawLead.

    }

    drawStampTiles(c, cue, bound, t, { y: 86, darkTheme: true });
    return;
  }

  if (id === 'S30_ardent_sunrise_you') {
    drawSunriseSceneCore(c, t, bound, { showWhale: true, headlineLine: 15 });
    drawCropMarks(c, { color: 'rgba(255, 240, 214, 0.34)' });
    drawStampTiles(c, cue, bound, t, { y: 84, darkTheme: true });
    return;
  }

  if (id === 'S31_remember_love_self') {
    const reuniteK = easeOut(prog(t, 51.45, 53.32));
    const whaleAlpha = 1;
    drawSunriseSceneCore(c, t, bound, {
      showWhale: true,
      whaleAlpha,
      reunited: reuniteK > 0.86,
      headlineLine: 0,
    });

    // Do not fly loose pieces through characters or obscure their faces.

    drawStampTiles(c, cue, bound, t, { y: 86, darkTheme: true });
    return;
  }

  if (id === 'S32_completed_keepsake') {
    // Warm craft-paper tabletop from S01 — full narrative circle!
    skyGrad(c, [
      [0, '#f3ead5'],
      [0.65, '#e6d6b8'],
      [1, '#d4c19f'],
    ]);
    drawDotScreen(c, { color: 'rgba(68, 52, 34, 0.055)', step: 22 });

    // Pullback from full-bleed 1.0 -> 0.78 keepsake postcard, locking cleanly at 54.95s!
    const pull = easeOut(prog(t, 54.17, 54.95));
    const sc = mix(1.0, 0.76, pull);
    const cardW = 1280 * sc;
    const cardH = 720 * sc;
    const cardX = (1280 - cardW) / 2;
    const cardY = (720 - cardH) / 2 - pull * 6;

    // Beveled board backing + soft tabletop shadow
    if (pull > 0.02) {
      rect(c, cardX + 10 * pull, cardY + 14 * pull, cardW, cardH, 'rgba(28, 22, 16, 0.26)', 10);
      rect(c, cardX - 8 * pull, cardY - 8 * pull, cardW + 16 * pull, cardH + 16 * pull, '#fbf4e4', 8);
    }

    c.save();
    c.translate(cardX, cardY);
    c.scale(sc, sc);
    c.beginPath();
    c.rect(0, 0, 1280, 720);
    c.clip();
    drawSunriseSceneCore(c, t, bound, { showWhale: true, whaleAlpha: 1.0, reunited: true, headlineLine: 0 });

    // 5x3 Completed Interlocking Jigsaw Seams over the reunited full-body pair!
    c.save();
    c.globalAlpha = mix(0.18, 0.72, pull);
    const cw = 1280 / 5;
    const ch = 720 / 3;
    for (let r = 0; r < 3; r++) {
      for (let col = 0; col < 5; col++) {
        traceJigsawPiece(c, col * cw, r * ch, cw, ch, GRID_5X3[r][col], 0.18);
        c.strokeStyle = 'rgba(255, 248, 232, 0.85)';
        c.lineWidth = 2.2;
        c.stroke();
      }
    }
    c.restore();
    c.restore();

    if (pull > 0.35) {
      drawCropMarks(c, { color: `rgba(88, 68, 46, ${0.34 * pull})`, target: true });
    }
  }
}

// Render the original narrative plates with a unified moving camera, then add
// independently animated near-lens paper details without covering captions.
export function paintShot(c, t, shot, env) {
  sceneCast = new Set();
  sceneTime = t;
  sceneShot = shot;
  const cam = computeCamera(t, shot, shot.cam);
  c.save();
  withCamera(c, cam, 0.45, () => paintBaseShot(c, t, shot, env));
  c.restore();
  drawLyricDetails(c, t, shot);
  // Place the planned companions missing from the original plate at the wings.
  // The characters on the base plate remain the focal pair.
  const missing = shot.cast.filter(name => !sceneCast.has(name));
  const slots = [120, 1160, 275, 1005, 365, 915];
  missing.forEach((name, i) => {
    const feature = (shot.index === 1 && name === 'claude') || ([15,16].includes(shot.index) && name === 'gpt');
    const x = feature ? 1050 : slots[i % slots.length];
    const y = shot.id === 'S32_completed_keepsake' ? 535 : 590;
    const h = shot.id === 'S32_completed_keepsake' ? 120 : feature ? 270 : 190;
    if (name === 'whale') whale(c, { x, y, h });
    else guest(c, name, { x, y, h });
  });
  // The v8 director plan did not include Z.AI; add her puzzle action in the
  // treasure-box insert without changing the original background plate.
  if (shot.index === 18) guest(c, 'zai', {x: 930, y: 594, h: 200});
  if (shot.id !== 'S32_completed_keepsake') {
    if (shot.act === 'D') {
      if (shot.index >= 20 && shot.index <= 23) drawCatenaryGarland(c, t, { y0: 56, y1: 66, sag: 28, count: 13, kind: 'bulbs' });
      drawDriftingParticles(c, t, { count: 18, kind: shot.index >= 25 ? 'bubbles' : 'fireflies', yMin: 70, yMax: 470 });
    } else {
      if (shot.index >= 17 && shot.index <= 19) drawCatenaryGarland(c, t, { y0: 55, y1: 60, sag: 25, count: 13, kind: 'pennants' });
      drawDriftingParticles(c, t, { count: 12, kind: 'petals', yMin: 80, yMax: 560 });
      if ([9,10,17,28,29].includes(shot.index)) drawOrigamiBirds(c, t, { count: 4, y0: 135, scale: 0.65 });
      if (shot.index >= 17 && shot.index <= 19 || shot.index >= 28) {
        drawWindFloraRow(c, t, { yBase: 624, x0: 12, x1: 1268, count: 16, kind: shot.index < 20 ? 'sunflowers' : 'flowers', color: '#f7d7d1', accent: '#ffd06a' });
      }
      if ([11, 18].includes(shot.index)) {
        drawMiniPolaroid(c, t, { x: 90, y: 175, w: 62, h: 76, appearAt: shot.start });
        drawMiniPolaroid(c, t, { x: 1190, y: 190, w: 62, h: 76, angle: 0.16, motif: 'wave', appearAt: shot.start + 0.15 });
      }
    }
    drawMacroForegroundBokeh(c, t, { count: 4 });
  }
}
