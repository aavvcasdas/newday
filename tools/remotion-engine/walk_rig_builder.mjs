import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const ENGINE_REQUIRE = createRequire(path.join(REPO_ROOT, 'tools/engine/package.json'));
const { createCanvas, loadImage } = ENGINE_REQUIRE('@napi-rs/canvas');

export const CELL_W = 384;
export const CELL_H = 416;
export const WALK_FRAMES = 16;
export const DEFAULT_WALK_CACHE_DIR = '/tmp/newday_walk_rigs_v4';

function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    const intersect = ((yi > y) !== (yj > y))
      && (x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-9) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function fitAndCutoutSolid(rawImg, { dyOffset = 0, checker = false, extraSeeds = [] } = {}) {
  const scale = Math.min((CELL_W - 16) / rawImg.width, (CELL_H - 16) / rawImg.height);
  const rw = Math.round(rawImg.width * scale);
  const rh = Math.round(rawImg.height * scale);

  const tmp = createCanvas(8, 8);
  const tg = tmp.getContext('2d');
  tg.fillStyle = '#FFFFFF';
  tg.fillRect(0, 0, 8, 8);
  tg.drawImage(rawImg, 0, 0);
  const bg = tg.getImageData(0, 0, 1, 1).data;

  const c = createCanvas(CELL_W, CELL_H);
  const g = c.getContext('2d');
  g.fillStyle = `rgb(${bg[0]},${bg[1]},${bg[2]})`;
  g.fillRect(0, 0, CELL_W, CELL_H);
  g.drawImage(rawImg, Math.floor((CELL_W - rw) / 2), CELL_H - 8 - rh + dyOffset, rw, rh);

  const imgData = g.getImageData(0, 0, CELL_W, CELL_H);
  const d = imgData.data;
  const isBg = (i) => {
    const r = d[i], gr = d[i + 1], b = d[i + 2];
    if (checker) {
      const mx = Math.max(r, gr, b), mn = Math.min(r, gr, b);
      return r > 192 && gr > 192 && b > 192 && (mx - mn) < 20;
    }
    const dr = Math.abs(r - bg[0]), dg = Math.abs(gr - bg[1]), db = Math.abs(b - bg[2]);
    return (dr < 26 && dg < 26 && db < 26) || (r > 230 && gr > 230 && b > 230);
  };

  const seen = new Uint8Array(CELL_W * CELL_H);
  const q = [];
  const push = (x, y) => {
    if (x < 0 || x >= CELL_W || y < 0 || y >= CELL_H) return;
    const idx = y * CELL_W + x;
    if (!seen[idx] && isBg(idx * 4)) {
      seen[idx] = 1;
      q.push(idx);
    }
  };
  for (let x = 0; x < CELL_W; x++) { push(x, 0); push(x, CELL_H - 1); }
  for (let y = 0; y < CELL_H; y++) { push(0, y); push(CELL_W - 1, y); }
  for (const [sx, sy] of extraSeeds) push(sx, sy);

  while (q.length) {
    const idx = q.pop();
    const x = idx % CELL_W, y = (idx / CELL_W) | 0;
    if (x > 0) push(x - 1, y);
    if (x + 1 < CELL_W) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y + 1 < CELL_H) push(x, y + 1);
  }
  for (let i = 0; i < CELL_W * CELL_H; i++) {
    if (seen[i]) d[i * 4 + 3] = 0;
  }
  g.putImageData(imgData, 0, 0);
  return c;
}

function extractPolyLayer(srcCanvas, poly, { filterPixel = null } = {}) {
  const out = createCanvas(CELL_W, CELL_H);
  const og = out.getContext('2d');
  og.drawImage(srcCanvas, 0, 0);
  const img = og.getImageData(0, 0, CELL_W, CELL_H);
  const d = img.data;
  for (let y = 0; y < CELL_H; y++) {
    for (let x = 0; x < CELL_W; x++) {
      const i = (y * CELL_W + x) * 4;
      if (d[i + 3] === 0) continue;
      if (!pointInPoly(x, y, poly)) {
        d[i + 3] = 0;
      } else if (filterPixel && !filterPixel(x, y, d[i], d[i + 1], d[i + 2], d[i + 3])) {
        d[i + 3] = 0;
      }
    }
  }
  og.putImageData(img, 0, 0);
  return out;
}

function erasePolyInPlace(canvas, poly, { shouldErase = null } = {}) {
  const g = canvas.getContext('2d');
  const img = g.getImageData(0, 0, CELL_W, CELL_H);
  const d = img.data;
  for (let y = 0; y < CELL_H; y++) {
    for (let x = 0; x < CELL_W; x++) {
      const i = (y * CELL_W + x) * 4;
      if (d[i + 3] === 0) continue;
      if (pointInPoly(x, y, poly)) {
        if (!shouldErase || shouldErase(x, y, d[i], d[i + 1], d[i + 2], d[i + 3])) {
          d[i + 3] = 0;
        }
      }
    }
  }
  g.putImageData(img, 0, 0);
  return canvas;
}

function tintCanvas(srcCanvas, rMul, gMul, bMul) {
  const out = createCanvas(srcCanvas.width, srcCanvas.height);
  const g = out.getContext('2d');
  g.drawImage(srcCanvas, 0, 0);
  const img = g.getImageData(0, 0, out.width, out.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    d[i] = Math.min(255, Math.round(d[i] * rMul));
    d[i + 1] = Math.min(255, Math.round(d[i + 1] * gMul));
    d[i + 2] = Math.min(255, Math.round(d[i + 2] * bMul));
  }
  g.putImageData(img, 0, 0);
  return out;
}

function makeNeutralLeg(legLayer, {
  srcHipX,
  srcHipY,
  neutralRotDeg = 0,
  dstHipX = srcHipX,
  dstHipY = srcHipY,
  thighCapColor = '#F7DBD0',
  thighCapRx = 16,
  thighCapRy = 18,
}) {
  const c = createCanvas(CELL_W, CELL_H);
  const g = c.getContext('2d');
  if (thighCapColor) {
    g.fillStyle = thighCapColor;
    g.beginPath();
    g.ellipse(dstHipX, dstHipY + 4, thighCapRx, thighCapRy, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.save();
  g.translate(dstHipX, dstHipY);
  g.rotate((neutralRotDeg * Math.PI) / 180);
  g.drawImage(legLayer, -srcHipX, -srcHipY);
  g.restore();
  return c;
}

function drawPivoted(ctx, layer, pivotX, pivotY, angleDeg, dx = 0, dy = 0, scaleX = 1, scaleY = 1) {
  ctx.save();
  ctx.translate(pivotX + dx, pivotY + dy);
  ctx.rotate((angleDeg * Math.PI) / 180);
  ctx.scale(scaleX, scaleY);
  ctx.drawImage(layer, -pivotX, -pivotY);
  ctx.restore();
}

function renderScissorWalkStrip({
  upperBody,
  legNear,
  legFar,
  hipNear,
  hipFar,
  facingSign = 1,
  strideDeg = 27,
  swingLiftPx = 11,
  legLengthPx = 104,
  bodyPitchDeg = 1.8,
  underSkirtBackdrop = null,
  frontCapLayer = null,
  armFrontLayer = null,
  armFrontPivot = null,
  armSwingDeg = 0,
}) {
  const strip = createCanvas(CELL_W * WALK_FRAMES, CELL_H);
  const sg = strip.getContext('2d');

  for (let f = 0; f < WALK_FRAMES; f++) {
    const theta = (2 * Math.PI * f) / WALK_FRAMES;
    const s = Math.sin(theta);
    const c = Math.cos(theta);

    const degNear = facingSign * strideDeg * s;
    const degFar = -facingSign * strideDeg * s;

    const swingNear = Math.max(0, c);
    const swingFar = Math.max(0, -c);
    const liftNear = -swingLiftPx * Math.pow(swingNear, 1.15);
    const liftFar = -swingLiftPx * Math.pow(swingFar, 1.15);

    const stanceRad = (strideDeg * Math.abs(s) * Math.PI) / 180;
    const hipDropY = legLengthPx * (1 - Math.cos(stanceRad)) * 0.72;
    const pitch = facingSign * (1.2 + bodyPitchDeg * Math.sin(2 * theta));

    const cell = createCanvas(CELL_W, CELL_H);
    const cg = cell.getContext('2d');

    if (underSkirtBackdrop) {
      drawPivoted(cg, underSkirtBackdrop, CELL_W * 0.5, 250, pitch * 0.35, 0, hipDropY);
    }

    // 1. Far leg behind
    drawPivoted(cg, legFar, hipFar[0], hipFar[1], degFar, 0, hipDropY + liftFar);
    // 2. Near leg in front
    drawPivoted(cg, legNear, hipNear[0], hipNear[1], degNear, 0, hipDropY + liftNear);
    // 3. Upper body / skirt hem on top of hip joints
    drawPivoted(cg, upperBody, CELL_W * 0.5, 250, pitch * 0.35, 0, hipDropY);
    // 4. Optional front waist cap & counter-swinging arm
    if (frontCapLayer) {
      drawPivoted(cg, frontCapLayer, CELL_W * 0.5, 250, pitch * 0.35, 0, hipDropY);
    }
    if (armFrontLayer && armFrontPivot) {
      drawPivoted(
        cg,
        armFrontLayer,
        armFrontPivot[0],
        armFrontPivot[1],
        -facingSign * armSwingDeg * s,
        0,
        hipDropY,
      );
    }

    sg.drawImage(cell, f * CELL_W, 0);
  }
  return strip;
}

async function buildWhaleSideWalk() {
  const baseRaw = await loadImage(path.join(REPO_ROOT, 'assets/ai-girls/lyric-action-v13/source/whale_side_rainwalk.png'));
  const underRaw = await loadImage(path.join(REPO_ROOT, 'assets/ai-girls/lyric-action-v13/source/whale_side_rainwalk_leg_under.png'));
  const base = fitAndCutoutSolid(baseRaw);
  const under = fitAndCutoutSolid(underRaw);

  const frontLegPoly = [
    [116, 294], [160, 304], [156, 332], [142, 360], [134, 388],
    [120, 410], [80, 410], [52, 392], [52, 366], [90, 358], [104, 340], [112, 312],
  ];
  const rawFrontLeg = extractPolyLayer(base, frontLegPoly);
  const legNear = makeNeutralLeg(rawFrontLeg, {
    srcHipX: 138,
    srcHipY: 302,
    neutralRotDeg: -22,
    dstHipX: 152,
    dstHipY: 296,
    thighCapColor: '#F7DBD0',
    thighCapRx: 17,
    thighCapRy: 18,
  });
  const legFar = makeNeutralLeg(tintCanvas(rawFrontLeg, 0.83, 0.84, 0.91), {
    srcHipX: 138,
    srcHipY: 302,
    neutralRotDeg: -22,
    dstHipX: 164,
    dstHipY: 296,
    thighCapColor: '#D0B6B2',
    thighCapRx: 17,
    thighCapRy: 18,
  });

  // Erase remaining back leg on `under` while protecting medium-blue whale tail (b > 92 && b > r + 16)
  const backLegErasePoly = [
    [126, 308], [193, 315], [206, 338], [218, 358], [232, 378],
    [232, 414], [132, 414], [126, 345],
  ];
  const upperBody = erasePolyInPlace(under, backLegErasePoly, {
    shouldErase: (x, y, r, g, b) => {
      if (x >= 191 && y <= 368 && b > 92 && b > r + 16) return false;
      return true;
    },
  });

  return renderScissorWalkStrip({
    upperBody,
    legNear,
    legFar,
    hipNear: [152, 296],
    hipFar: [164, 296],
    facingSign: 1,
    strideDeg: 29,
    swingLiftPx: 12,
    legLengthPx: 106,
    bodyPitchDeg: 1.9,
  });
}

async function buildWhaleHappyWalk() {
  const underRaw = await loadImage(path.join(REPO_ROOT, 'assets/ai-girls/lyric-action-v13/source/whale_walk_retry_under.png'));
  const under = fitAndCutoutSolid(underRaw);

  const legPoly = [
    [148, 312], [195, 310], [209, 352], [235, 378],
    [235, 410], [184, 410], [172, 374], [156, 340],
  ];
  const rawLeg = extractPolyLayer(under, legPoly, {
    filterPixel: (x, y, r, g, b) => !(x >= 192 && y <= 362 && b > 92 && b > r + 14),
  });

  const legNear = makeNeutralLeg(rawLeg, {
    srcHipX: 174,
    srcHipY: 312,
    neutralRotDeg: 14,
    dstHipX: 182,
    dstHipY: 300,
    thighCapColor: '#F7DBD0',
    thighCapRx: 17,
    thighCapRy: 18,
  });
  const legFar = makeNeutralLeg(tintCanvas(rawLeg, 0.83, 0.84, 0.91), {
    srcHipX: 174,
    srcHipY: 312,
    neutralRotDeg: 14,
    dstHipX: 168,
    dstHipY: 300,
    thighCapColor: '#D0B6B2',
    thighCapRx: 17,
    thighCapRy: 18,
  });

  const upperBody = erasePolyInPlace(under, legPoly, {
    shouldErase: (x, y, r, g, b) => !(x >= 192 && y <= 362 && b > 92 && b > r + 14),
  });

  return renderScissorWalkStrip({
    upperBody,
    legNear,
    legFar,
    hipNear: [182, 300],
    hipFar: [168, 300],
    facingSign: -1,
    strideDeg: 27,
    swingLiftPx: 11,
    legLengthPx: 104,
    bodyPitchDeg: 1.7,
  });
}

async function buildWhaleSadWalk() {
  const sadRaw = await loadImage(path.join(REPO_ROOT, 'assets/ai-girls/lyric-action-v13/source/whale_rainwalk.png'));
  const cleanUnderRaw = await loadImage(path.join(REPO_ROOT, 'assets/ai-girls/lyric-action-v13/source/whale_walk_retry_under.png'));
  const sad = fitAndCutoutSolid(sadRaw);
  const cleanUnder = fitAndCutoutSolid(cleanUnderRaw);

  const legPoly = [
    [148, 312], [195, 310], [209, 352], [235, 378],
    [235, 410], [184, 410], [172, 374], [156, 340],
  ];
  const rawLeg = extractPolyLayer(cleanUnder, legPoly, {
    filterPixel: (x, y, r, g, b) => !(x >= 192 && y <= 362 && b > 92 && b > r + 14),
  });

  const legNear = makeNeutralLeg(rawLeg, {
    srcHipX: 174,
    srcHipY: 312,
    neutralRotDeg: 14,
    dstHipX: 182,
    dstHipY: 300,
    thighCapColor: '#F7DBD0',
    thighCapRx: 17,
    thighCapRy: 18,
  });
  const legFar = makeNeutralLeg(tintCanvas(rawLeg, 0.83, 0.84, 0.91), {
    srcHipX: 174,
    srcHipY: 312,
    neutralRotDeg: 14,
    dstHipX: 168,
    dstHipY: 300,
    thighCapColor: '#D0B6B2',
    thighCapRx: 17,
    thighCapRy: 18,
  });

  const cleanLowerSkirtAndTail = erasePolyInPlace(cleanUnder, legPoly, {
    shouldErase: (x, y, r, g, b) => !(x >= 192 && y <= 362 && b > 92 && b > r + 14),
  });

  // Combine sad teary head (y <= 195, aligned to 0.5px at neck collar!) with clean body, skirt & tail
  const upperBody = createCanvas(CELL_W, CELL_H);
  const ug = upperBody.getContext('2d');
  ug.drawImage(cleanLowerSkirtAndTail, 0, 0);
  ug.clearRect(0, 0, CELL_W, 195);
  ug.drawImage(sad, 0, 0, CELL_W, 196, 0, 0, CELL_W, 196);

  return renderScissorWalkStrip({
    upperBody,
    legNear,
    legFar,
    hipNear: [182, 300],
    hipFar: [168, 300],
    facingSign: -1,
    strideDeg: 25,
    swingLiftPx: 10,
    legLengthPx: 104,
    bodyPitchDeg: 1.6,
  });
}

async function buildDoubaoSideWalk() {
  const underRaw = await loadImage(path.join(REPO_ROOT, 'assets/ai-girls/lyric-action-v13/source/doubao_step_leg_under.png'));
  const under = fitAndCutoutSolid(underRaw, { dyOffset: 48 });

  // Remove small umbrella canopy + tip completely while preserving hands (hands start at x >= 143, y = 230..248)
  erasePolyInPlace(under, [[0, 0], [145, 0], [145, CELL_H], [0, CELL_H]], {
    shouldErase: (x, y, r, g, b) => {
      if (x >= 139 && y >= 228 && y <= 248 && r > 170) return false; // protect warm skin fingertips
      return true;
    },
  });

  const legPoly = [
    [172, 314], [222, 314], [224, 412], [162, 412],
  ];
  const rawLeg = extractPolyLayer(under, legPoly);
  const legNear = makeNeutralLeg(rawLeg, {
    srcHipX: 198,
    srcHipY: 316,
    neutralRotDeg: 0,
    dstHipX: 197,
    dstHipY: 318,
    thighCapColor: null,
  });
  const legFar = makeNeutralLeg(tintCanvas(rawLeg, 0.78, 0.80, 0.86), {
    srcHipX: 198,
    srcHipY: 316,
    neutralRotDeg: 0,
    dstHipX: 201,
    dstHipY: 318,
    thighCapColor: null,
  });

  const upperBody = erasePolyInPlace(under, [
    [160, 326], [226, 326], [226, 414], [160, 414],
  ]);

  return renderScissorWalkStrip({
    upperBody,
    legNear,
    legFar,
    hipNear: [197, 318],
    hipFar: [201, 318],
    facingSign: 1,
    strideDeg: 27,
    swingLiftPx: 11,
    legLengthPx: 90,
    bodyPitchDeg: 1.6,
  });
}

async function buildGptPushWalk() {
  const sheet = await loadImage(path.join(REPO_ROOT, 'assets/ai-girls/lyric-action-v13/gpt_push_final_action.png'));
  const base = createCanvas(CELL_W, CELL_H);
  base.getContext('2d').drawImage(sheet, 0, 0, CELL_W, CELL_H, 0, 0, CELL_W, CELL_H);

  const frontLegPoly = [
    [122, 298], [156, 306], [166, 355], [168, 408], [116, 408], [120, 350],
  ];
  const rawLeg = extractPolyLayer(base, frontLegPoly);
  const legNear = makeNeutralLeg(rawLeg, {
    srcHipX: 140,
    srcHipY: 306,
    neutralRotDeg: 0,
    dstHipX: 148,
    dstHipY: 304,
    thighCapColor: '#F9E2DA',
    thighCapRx: 14,
    thighCapRy: 15,
  });
  const legFar = makeNeutralLeg(tintCanvas(rawLeg, 0.82, 0.82, 0.90), {
    srcHipX: 140,
    srcHipY: 306,
    neutralRotDeg: 0,
    dstHipX: 162,
    dstHipY: 304,
    thighCapColor: '#D5BDBA',
    thighCapRx: 14,
    thighCapRy: 15,
  });

  // Preserve full flowing white gown silhouette, erasing only the front leg + back shoe tip
  const underSkirtBackdrop = createCanvas(CELL_W, CELL_H);
  const bg = underSkirtBackdrop.getContext('2d');
  bg.drawImage(base, 0, 0);
  erasePolyInPlace(underSkirtBackdrop, frontLegPoly);
  erasePolyInPlace(underSkirtBackdrop, [[174, 380], [206, 380], [206, 410], [174, 410]]);
  // Smooth inner-gown lining behind the slit so no gap ever appears between stepping legs
  bg.fillStyle = '#E8E2F2';
  bg.beginPath();
  bg.moveTo(124, 302);
  bg.lineTo(164, 306);
  bg.lineTo(170, 392);
  bg.lineTo(118, 392);
  bg.closePath();
  bg.fill();

  const frontCapLayer = extractPolyLayer(base, [
    [0, 0], [CELL_W, 0], [CELL_W, 314], [0, 314],
  ]);
  const emptyUpper = createCanvas(CELL_W, CELL_H);

  return renderScissorWalkStrip({
    upperBody: emptyUpper,
    underSkirtBackdrop,
    frontCapLayer,
    legNear,
    legFar,
    hipNear: [148, 304],
    hipFar: [162, 304],
    facingSign: -1,
    strideDeg: 24,
    swingLiftPx: 11,
    legLengthPx: 98,
    bodyPitchDeg: 2.0,
  });
}

async function buildGeminiWalk() {
  const v10 = await loadImage(path.join(REPO_ROOT, 'assets/ai-girls/animated-v10/gemini.png'));
  const base = createCanvas(CELL_W, CELL_H);
  base.getContext('2d').drawImage(v10, 0, 0, CELL_W, CELL_H, 0, 0, CELL_W, CELL_H);

  const legUnderRaw = await loadImage(path.join(REPO_ROOT, 'assets/ai-girls/dance-v11/source/gemini_legunder.png'));
  // Seed interior pocket under skirt (184, 360) & (184, 395) so checkerboard between hair curls is 100% removed
  const upperBody = fitAndCutoutSolid(legUnderRaw, {
    checker: true,
    extraSeeds: [[184, 350], [184, 385], [165, 365], [202, 365]],
  });

  const rawLeftLeg = extractPolyLayer(base, [[150, 308], [184, 308], [184, 412], [150, 412]]);
  const legNear = makeNeutralLeg(rawLeftLeg, {
    srcHipX: 168,
    srcHipY: 312,
    neutralRotDeg: 0,
    dstHipX: 178,
    dstHipY: 310,
    thighCapColor: '#FCE6DF',
    thighCapRx: 14,
    thighCapRy: 15,
  });
  const legFar = makeNeutralLeg(tintCanvas(rawLeftLeg, 0.84, 0.85, 0.92), {
    srcHipX: 168,
    srcHipY: 312,
    neutralRotDeg: 0,
    dstHipX: 190,
    dstHipY: 310,
    thighCapColor: '#D8C2C2',
    thighCapRx: 14,
    thighCapRy: 15,
  });

  // Separate hair backdrop (y > 316 outside skirt) behind legs, and bodice+skirt+head in front of hips!
  const hairBack = extractPolyLayer(upperBody, [
    [0, 290], [142, 290], [152, 416], [0, 416],
  ]);
  const hairBackR = extractPolyLayer(upperBody, [
    [224, 290], [CELL_W, 290], [CELL_W, 416], [214, 416],
  ]);
  const hairBackdrop = createCanvas(CELL_W, CELL_H);
  hairBackdrop.getContext('2d').drawImage(hairBack, 0, 0);
  hairBackdrop.getContext('2d').drawImage(hairBackR, 0, 0);

  const frontSkirtAndHead = createCanvas(CELL_W, CELL_H);
  frontSkirtAndHead.getContext('2d').drawImage(upperBody, 0, 0);
  erasePolyInPlace(frontSkirtAndHead, [[0, 326], [145, 326], [145, 416], [0, 416]]);
  erasePolyInPlace(frontSkirtAndHead, [[222, 326], [CELL_W, 326], [CELL_W, 416], [222, 416]]);
  // Wipe any enclosed checkerboard pocket inside the central leg opening below skirt hem (y >= 324)
  erasePolyInPlace(frontSkirtAndHead, [[140, 324], [226, 324], [226, 416], [140, 416]], {
    shouldErase: (x, y, r, g, b) => {
      if (x >= 156 && x <= 210 && y >= 332) return true;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      return r > 188 && g > 188 && b > 188 && (mx - mn) < 22;
    },
  });
  erasePolyInPlace(hairBackdrop, [[0, 290], [CELL_W, 290], [CELL_W, 416], [0, 416]], {
    shouldErase: (x, y, r, g, b) => {
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      return r > 188 && g > 188 && b > 188 && (mx - mn) < 20;
    },
  });

  return renderScissorWalkStrip({
    upperBody: frontSkirtAndHead,
    underSkirtBackdrop: hairBackdrop,
    legNear,
    legFar,
    hipNear: [178, 310],
    hipFar: [190, 310],
    facingSign: -1, // walks rightward in Shot 6
    strideDeg: 24,
    swingLiftPx: 12,
    legLengthPx: 96,
    bodyPitchDeg: 1.6,
  });
}

async function buildWhaleBenchSit() {
  const raw = await loadImage(path.join(REPO_ROOT, 'assets/ai-girls/lyric-action-v13/source/whale_seat_side_v35.png'));
  const base = fitAndCutoutSolid(raw);

  const strip = createCanvas(CELL_W * WALK_FRAMES, CELL_H);
  const sg = strip.getContext('2d');
  for (let f = 0; f < WALK_FRAMES; f++) {
    const theta = (2 * Math.PI * f) / WALK_FRAMES;
    const breathY = Math.sin(theta) * 2.0;
    const cell = createCanvas(CELL_W, CELL_H);
    const cg = cell.getContext('2d');
    drawPivoted(cg, base, 155, 295, Math.sin(theta) * 1.1, 0, breathY);
    sg.drawImage(cell, f * CELL_W, 0);
  }
  return strip;
}

export const WALK_RIG_BUILDERS = {
  whale_walk_side_2leg: buildWhaleSideWalk,
  whale_walk_happy_2leg: buildWhaleHappyWalk,
  whale_walk_sad_2leg: buildWhaleSadWalk,
  whale_seat_side_bench: buildWhaleBenchSit,
  doubao_walk_side_2leg: buildDoubaoSideWalk,
  gpt_push_walk_2leg: buildGptPushWalk,
  gemini_walk_2leg: buildGeminiWalk,
};

export async function ensureWalkRigAtlases(outDir = DEFAULT_WALK_CACHE_DIR, { force = false } = {}) {
  fs.mkdirSync(outDir, { recursive: true });
  const built = {};
  for (const [name, builder] of Object.entries(WALK_RIG_BUILDERS)) {
    const outPath = path.join(outDir, `${name}.png`);
    if (!force && fs.existsSync(outPath) && fs.statSync(outPath).size > 8192) {
      built[name] = outPath;
      continue;
    }
    const strip = await builder();
    fs.writeFileSync(outPath, strip.toBuffer('image/png'));
    built[name] = outPath;
  }
  return built;
}
