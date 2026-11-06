/**
 * diorama.mjs — code-film directing (`code-film directing references` / `paper-popup` / `hd-2d` / `cel-anime-80s`)
 * × `paper-art-music-video-art-styles` (`paper.js` / `props.js`) × `voxel-mv` × `world-execute-me-lyric-mv`
 * Multi-Plane Scenic & Per-Second Kinetic Richness Engine for 《把回忆拼好给你》 v4.
 *
 * Ensures EVERY second (every 1–2 beats) of the 56.033s canvas contains layered parallax depth,
 * living architectural lights, wind-reactive flora, catenary garlands, flying puzzle handoffs,
 * motion-trailed companion bubbles, and near-lens macro bokeh.
 */
import { TEMPO_GRID } from './actors.mjs';
import { drawExtrudedPiece } from './jigsaw.mjs';
import { clamp, mix, prog, ease, easeOut, backOut, hash, rect, poly, line, ellipse } from './plate.mjs';

const TAU = Math.PI * 2;

export function beatFloatAt(t) {
  return (t - TEMPO_GRID.beat0) / TEMPO_GRID.spb;
}

export function beatPulseAt(t, speed = 1) {
  const bf = beatFloatAt(t) * speed;
  const frac = bf - Math.floor(bf);
  return Math.pow(Math.max(0, 1 - frac * 1.65), 1.8);
}

export function halfBeatPulseAt(t) {
  return beatPulseAt(t, 2);
}

export function barPulseAt(t) {
  const bf = beatFloatAt(t) * 0.25;
  const frac = bf - Math.floor(bf);
  return Math.pow(Math.max(0, 1 - frac * 2.4), 1.7);
}

/**
 * Unified 2D Multiplane Virtual Camera (`code-film directing references/DIRECTOR.md` §8 + `TECHNIQUE.md` §2).
 */
export function computeCamera(t, shot, spec = {}) {
  const u = clamp((t - shot.start) / Math.max(0.05, shot.duration));
  const eu = ease(u);
  const zoom0 = spec.zoom0 ?? 1.0;
  const zoom1 = spec.zoom1 ?? 1.035;
  const beatKick = (spec.beatPunch ?? 0.008) * beatPulseAt(t, spec.fastBeat ? 2 : 1);
  const zoom = mix(zoom0, zoom1, eu) + beatKick;
  const panX = mix(spec.x0 ?? 0, spec.x1 ?? 0, eu) + Math.sin(t * 0.9) * (spec.driftX ?? 3.5);
  const panY = mix(spec.y0 ?? 0, spec.y1 ?? 0, eu) + Math.cos(t * 0.75) * (spec.driftY ?? 2.2);
  const rot = mix(spec.rot0 ?? 0, spec.rot1 ?? 0, eu) + Math.sin(t * 0.65) * (spec.sway ?? 0.0022);
  return { zoom, panX, panY, rot, u, eu };
}

export function withCamera(c, cam, depth, fn) {
  const d = depth ?? 1.0;
  const z = 1 + (cam.zoom - 1) * d;
  c.save();
  c.translate(640 - cam.panX * d, 360 - cam.panY * d);
  if (cam.rot) c.rotate(cam.rot * d);
  c.scale(z, z);
  c.translate(-640, -360);
  fn();
  c.restore();
}

/**
 * Volumetric sun/moon/stage light shafts (`hd-2d` & `cel-anime-80s` backlit 透過光).
 */
export function drawVolumetricBeams(
  c,
  t,
  {
    ox = 980,
    oy = -40,
    count = 6,
    spread = 0.75,
    baseAngle = 2.15,
    length = 860,
    color = 'rgba(255, 241, 196, 0.14)',
  } = {}
) {
  c.save();
  for (let i = 0; i < count; i++) {
    const f = count > 1 ? i / (count - 1) - 0.5 : 0;
    const ang = baseAngle + f * spread + Math.sin(t * 0.55 + i * 1.1) * 0.03;
    const w0 = 16 + (i % 3) * 8;
    const w1 = 88 + (i % 2) * 44;
    const nx = -Math.sin(ang);
    const ny = Math.cos(ang);
    const ex = ox + Math.cos(ang) * length;
    const ey = oy + Math.sin(ang) * length;

    const g = c.createLinearGradient(ox, oy, ex, ey);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(255, 255, 255, 0)');
    c.fillStyle = g;
    c.globalAlpha = 0.65 + 0.35 * Math.sin(t * 1.4 + i * 0.9);
    c.beginPath();
    c.moveTo(ox + nx * w0, oy + ny * w0);
    c.lineTo(ox - nx * w0, oy - ny * w0);
    c.lineTo(ex - nx * w1, ey - ny * w1);
    c.lineTo(ex + nx * w1, ey + ny * w1);
    c.closePath();
    c.fill();
  }
  c.restore();
}

/**
 * Cut-paper parallax mountain / hill / island ridges with rim highlight & mist band (`paper-art paper.js`).
 */
export function drawCutPaperRidges(
  c,
  t,
  {
    yBase = 470,
    layers = [
      { dy: -82, amp: 34, freq: 0.0055, fill: '#8fb4c9', rim: 'rgba(255, 250, 232, 0.55)', speed: 4 },
      { dy: -38, amp: 26, freq: 0.0075, fill: '#6c98b0', rim: 'rgba(255, 246, 220, 0.45)', speed: -7 },
      { dy: 0, amp: 18, freq: 0.0095, fill: '#4f7d96', rim: 'rgba(255, 242, 210, 0.38)', speed: 10 },
    ],
    bottomY = 660,
    mist = 'rgba(248, 242, 226, 0.16)',
  } = {}
) {
  for (let li = 0; li < layers.length; li++) {
    const L = layers[li];
    const pts = [];
    const shift = t * (L.speed ?? 0);
    for (let x = -80; x <= 1360; x += 28) {
      const h1 = Math.sin((x + shift) * L.freq + li * 1.7) * L.amp;
      const h2 = Math.cos((x + shift) * L.freq * 2.1 + li * 3.1) * (L.amp * 0.38);
      pts.push([x, yBase + L.dy + h1 + h2]);
    }
    c.save();
    c.beginPath();
    c.moveTo(-80, bottomY);
    pts.forEach(([px, py]) => c.lineTo(px, py));
    c.lineTo(1360, bottomY);
    c.closePath();
    c.fillStyle = L.fill;
    c.fill();

    if (L.rim) {
      line(c, pts, L.rim, 2.2);
    }
    if (mist) {
      const mg = c.createLinearGradient(0, yBase + L.dy - 10, 0, yBase + L.dy + 70);
      mg.addColorStop(0, 'rgba(255,255,255,0)');
      mg.addColorStop(1, mist);
      c.fillStyle = mg;
      c.fillRect(-80, yBase + L.dy - 10, 1440, 84);
    }
    c.restore();
  }
}

/**
 * Living coastal town / city skyline with gable roofs, lighthouse/clocktower, curling chimney smoke,
 * and dozens of beat-twinkling lit windows (`voxel-mv/examples/yuai/project/shots.js` + `paper-art props.js`).
 */
export function drawLivingTownSkyline(
  c,
  t,
  {
    yBase = 472,
    xStart = -40,
    xEnd = 1320,
    count = 22,
    seed = 31,
    wallColors = ['#354966', '#2d3f59', '#3e5270', '#465875'],
    roofColors = ['#223147', '#293a54', '#52455e'],
    winColors = ['#ffd98e', '#ffbe7b', '#fff0be', '#9fe0ff'],
    night = true,
    lighthouseX = null,
  } = {}
) {
  const bp = beatPulseAt(t, 2);
  const span = (xEnd - xStart) / count;
  c.save();

  for (let i = 0; i < count; i++) {
    const bw = span * (0.76 + hash(seed + i * 5) * 0.42);
    const bh = 48 + hash(seed + i * 7 + 2) * 108;
    const bx = xStart + i * span + (hash(seed + i * 3) - 0.5) * 8;
    const by = yBase - bh;
    const wall = wallColors[i % wallColors.length];
    const roof = roofColors[i % roofColors.length];

    // Building body + paper rim
    rect(c, bx, by, bw, bh + 18, wall, 2);
    poly(
      c,
      [
        [bx - 4, by + 2],
        [bx + bw * 0.5, by - (i % 3 === 0 ? 22 : 12)],
        [bx + bw + 4, by + 2],
      ],
      roof,
      night ? 'rgba(180, 206, 238, 0.22)' : 'rgba(255, 248, 230, 0.45)',
      1.2
    );

    // Chimney + gentle smoke puffs on every 4th house
    if (i % 4 === 1) {
      const cx = bx + bw * 0.72;
      rect(c, cx, by - 18, 7, 16, roof);
      for (let p = 0; p < 3; p++) {
        const age = (t * 0.48 + p * 0.33 + i * 0.17) % 1;
        ellipse(
          c,
          cx + 3.5 + age * 18 + Math.sin(t * 2 + p) * 3,
          by - 22 - age * 28,
          4 + age * 7,
          3 + age * 5,
          `rgba(245, 238, 224, ${(1 - age) * 0.28})`
        );
      }
    }

    // Individual twinkling windows!
    const cols = Math.max(2, Math.floor(bw / 16));
    const rows = Math.max(2, Math.floor(bh / 22));
    for (let r = 0; r < rows; r++) {
      for (let k = 0; k < cols; k++) {
        const hVal = hash(seed * 13 + i * 41 + r * 7 + k * 3);
        if (hVal < (night ? 0.24 : 0.45)) continue;
        const wx = bx + 6 + k * ((bw - 12) / cols);
        const wy = by + 10 + r * ((bh - 14) / rows);
        const pulse = 0.65 + 0.35 * Math.sin(t * (2.2 + hVal * 2.5) + i + r);
        const winCol = winColors[(i + r + k) % winColors.length];
        c.globalAlpha = night ? clamp(0.55 + 0.35 * pulse + 0.2 * bp) : 0.55;
        rect(c, wx, wy, 6.5, 9, winCol, 1.2);
      }
    }
    c.globalAlpha = 1;
  }

  // Optional rotating lighthouse!
  if (lighthouseX != null) {
    const lx = lighthouseX;
    const ly = yBase;
    poly(c, [[lx - 16, ly], [lx - 10, ly - 118], [lx + 10, ly - 118], [lx + 16, ly]], '#f7efe0', '#c8b89e', 1.4);
    rect(c, lx - 13, ly - 86, 26, 16, '#d95f4e');
    rect(c, lx - 11, ly - 48, 22, 16, '#d95f4e');
    rect(c, lx - 12, ly - 134, 24, 16, '#ffe9a6', 3);
    poly(c, [[lx - 15, ly - 134], [lx, ly - 150], [lx + 15, ly - 134]], '#d95f4e');

    // Sweeping lighthouse beam!
    const sweep = Math.sin(t * 1.15) * 0.22;
    const bg = c.createLinearGradient(lx, ly - 126, lx - 320, ly - 190);
    bg.addColorStop(0, 'rgba(255, 240, 178, 0.52)');
    bg.addColorStop(1, 'rgba(255, 240, 178, 0)');
    c.fillStyle = bg;
    c.beginPath();
    c.moveTo(lx, ly - 126);
    c.lineTo(lx - 340, ly - 170 + sweep * 140);
    c.lineTo(lx - 340, ly - 110 + sweep * 140);
    c.closePath();
    c.fill();
  }

  c.restore();
}

/**
 * Sagging catenary rope garland with fairy bulbs, colored pennants, mini lanterns, or clipped polaroids
 * (`paper-art props.js` `ropeLine` + beat traveling wave!).
 */
export function drawCatenaryGarland(
  c,
  t,
  {
    x0 = 40,
    y0 = 78,
    x1 = 1240,
    y1 = 86,
    sag = 38,
    count = 16,
    kind = 'bulbs', // 'bulbs' | 'pennants' | 'lanterns' | 'polaroids'
    colors = ['#ff9e6d', '#ffd97d', '#7fd8be', '#8ec5fc', '#f7a8b8'],
  } = {}
) {
  const bp = beatPulseAt(t, 2);
  const mx = (x0 + x1) * 0.5;
  const my = (y0 + y1) * 0.5 + sag + Math.sin(t * 1.9) * 3.5;

  c.save();
  c.strokeStyle = 'rgba(72, 58, 48, 0.58)';
  c.lineWidth = 1.6;
  c.beginPath();
  c.moveTo(x0, y0);
  c.quadraticCurveTo(mx, my, x1, y1);
  c.stroke();

  const beatWave = beatFloatAt(t) * 2;
  for (let i = 1; i < count; i++) {
    const u = i / count;
    const px = (1 - u) * (1 - u) * x0 + 2 * (1 - u) * u * mx + u * u * x1;
    const py = (1 - u) * (1 - u) * y0 + 2 * (1 - u) * u * my + u * u * y1;
    const sway = Math.sin(t * 3.1 + i * 0.65) * 0.12;
    const col = colors[i % colors.length];
    const waveHi = 0.55 + 0.45 * Math.sin(beatWave - i * 0.55);

    c.save();
    c.translate(px, py);
    c.rotate(sway);

    if (kind === 'pennants') {
      poly(c, [[-9, 0], [9, 0], [0, 20]], col, 'rgba(255, 250, 238, 0.7)', 1);
    } else if (kind === 'lanterns') {
      const g = c.createRadialGradient(0, 11, 1, 0, 11, 22);
      g.addColorStop(0, `rgba(255, 226, 150, ${0.35 + 0.35 * waveHi + 0.2 * bp})`);
      g.addColorStop(1, 'rgba(255, 200, 120, 0)');
      c.fillStyle = g;
      c.fillRect(-22, -11, 44, 44);
      rect(c, -7, 2, 14, 17, col, 4);
      rect(c, -4, 0, 8, 3, '#5a4332', 1);
    } else if (kind === 'polaroids') {
      rect(c, -1, -3, 2, 6, '#c79e6b');
      rect(c, -12, 2, 24, 28, '#fff9ec', 2);
      rect(c, -9, 5, 18, 17, col, 1);
    } else {
      // Glowing fairy bulbs!
      const g = c.createRadialGradient(0, 5, 1, 0, 5, 16);
      g.addColorStop(0, `rgba(255, 240, 188, ${0.45 + 0.4 * waveHi + 0.15 * bp})`);
      g.addColorStop(1, 'rgba(255, 215, 140, 0)');
      c.fillStyle = g;
      c.fillRect(-16, -11, 32, 32);
      ellipse(c, 0, 5, 4.2, 5.2, col);
      ellipse(c, 0, 4.5, 2.2, 2.8, '#fffdf4');
    }
    c.restore();
  }
  c.restore();
}

/**
 * Wind-bent trees, sunflowers, coastal pines, or silver pampas reeds (`paper-art paper.js` `drawBent`).
 */
export function drawWindFloraRow(
  c,
  t,
  {
    yBase = 585,
    x0 = 30,
    x1 = 1250,
    count = 14,
    kind = 'reeds', // 'reeds' | 'sunflowers' | 'spruce' | 'flowers'
    seed = 19,
    color = '#e8d5b7',
    accent = '#ffbe5c',
  } = {}
) {
  c.save();
  const step = (x1 - x0) / Math.max(1, count - 1);
  for (let i = 0; i < count; i++) {
    const x = x0 + i * step + (hash(seed + i * 7) - 0.5) * 22;
    const h = 34 + hash(seed + i * 11) * 32;
    const bend = Math.sin(t * 2.4 + i * 0.55) * (8 + (i % 3) * 3);

    if (kind === 'spruce') {
      const sh = h * 1.45;
      rect(c, x - 3, yBase - 14, 6, 16, '#694e3a');
      for (let tier = 0; tier < 3; tier++) {
        const ty = yBase - 12 - tier * (sh * 0.28);
        const tw = (24 - tier * 5) * (0.9 + hash(seed + i) * 0.25);
        const bx = x + bend * (0.25 + tier * 0.35);
        poly(c, [[bx - tw, ty], [bx, ty - sh * 0.42], [bx + tw, ty]], color, 'rgba(255, 248, 228, 0.28)', 1);
      }
    } else if (kind === 'sunflowers') {
      const tx = x + bend;
      const ty = yBase - h;
      c.strokeStyle = '#5c9457';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(x, yBase);
      c.quadraticCurveTo(x + bend * 0.4, yBase - h * 0.55, tx, ty);
      c.stroke();
      for (let p = 0; p < 8; p++) {
        const a = (p / 8) * TAU + t * 0.6;
        ellipse(c, tx + Math.cos(a) * 8, ty + Math.sin(a) * 8, 5, 3, accent, a);
      }
      ellipse(c, tx, ty, 5.5, 5.5, '#6b442a');
    } else if (kind === 'flowers') {
      const tx = x + bend * 0.6;
      const ty = yBase - h * 0.55;
      c.strokeStyle = '#6da36b';
      c.lineWidth = 2.2;
      c.beginPath();
      c.moveTo(x, yBase);
      c.quadraticCurveTo(x + bend * 0.3, yBase - h * 0.3, tx, ty);
      c.stroke();
      const petalCol = i % 2 === 0 ? accent : color;
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * TAU + t * 0.8 + i;
        ellipse(c, tx + Math.cos(a) * 5.2, ty + Math.sin(a) * 5.2, 4, 2.8, petalCol, a);
      }
      ellipse(c, tx, ty, 2.8, 2.8, '#fff4b8');
    } else {
      // Feather pampas reeds!
      const tx = x + bend * 1.25;
      const ty = yBase - h;
      c.strokeStyle = color;
      c.lineWidth = 1.8;
      c.beginPath();
      c.moveTo(x, yBase);
      c.quadraticCurveTo(x + bend * 0.45, yBase - h * 0.55, tx, ty);
      c.stroke();
      ellipse(c, tx + bend * 0.12, ty - 4, 11, 3.6, accent, 0.35 + bend * 0.02);
    }
  }
  c.restore();
}

/**
 * Continuous drifting petals, autumn leaves, fireflies, or starlight motes.
 */
export function drawDriftingParticles(
  c,
  t,
  {
    count = 34,
    kind = 'sparkles', // 'sparkles' | 'petals' | 'fireflies' | 'bubbles'
    colors = ['#fff2c6', '#ffd1dc', '#b8ebff'],
    seed = 73,
    yMin = 40,
    yMax = 640,
  } = {}
) {
  const bp = beatPulseAt(t, 2);
  c.save();
  for (let i = 0; i < count; i++) {
    const h1 = hash(seed + i * 13);
    const h2 = hash(seed + i * 29 + 5);
    const speedX = kind === 'petals' ? 36 : 16;
    const speedY = kind === 'bubbles' ? -28 : kind === 'petals' ? 24 : -12;
    const px = (((h1 * 1360 + t * (speedX + (i % 5) * 6)) % 1360) + 1360) % 1360 - 40;
    const spanY = yMax - yMin;
    const py = yMin + ((((h2 * spanY + t * speedY * (0.7 + (i % 4) * 0.2)) % spanY) + spanY) % spanY) + Math.sin(t * 2.2 + i) * 8;
    const col = colors[i % colors.length];

    if (kind === 'petals') {
      const rot = t * 2.4 + i;
      c.globalAlpha = 0.78;
      ellipse(c, px, py, 6.2, 3.2, col, rot);
    } else if (kind === 'bubbles') {
      const r = 5 + (i % 5) * 3.5;
      c.strokeStyle = col;
      c.lineWidth = 1.4;
      c.globalAlpha = 0.62;
      c.beginPath();
      c.arc(px, py, r, 0, TAU);
      c.stroke();
      ellipse(c, px - r * 0.32, py - r * 0.32, r * 0.22, r * 0.14, '#ffffff', -0.5);
    } else if (kind === 'fireflies') {
      const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 3.8 + i * 1.9));
      const g = c.createRadialGradient(px, py, 0.5, px, py, 13);
      g.addColorStop(0, `rgba(255, 236, 156, ${0.85 * tw})`);
      g.addColorStop(1, 'rgba(255, 210, 110, 0)');
      c.fillStyle = g;
      c.fillRect(px - 13, py - 13, 26, 26);
    } else {
      const sz = (2.4 + (i % 3) * 1.2) * (1 + 0.25 * bp);
      c.save();
      c.globalAlpha = 0.55 + 0.45 * Math.sin(t * 3.2 + i);
      c.fillStyle = col;
      c.translate(px, py);
      c.rotate(Math.PI * 0.25);
      c.fillRect(-sz * 0.5, -sz * 0.5, sz, sz);
      c.restore();
    }
  }
  c.restore();
}

/**
 * Flapping origami birds / coastal gulls soaring along curved sky paths (`mv-director` `代码画具体东西.md`).
 */
export function drawOrigamiBirds(
  c,
  t,
  {
    count = 6,
    x0 = 180,
    y0 = 220,
    dir = 1,
    speed = 38,
    color = '#fff8ea',
    wingColor = '#f4c892',
    scale = 1.0,
  } = {}
) {
  c.save();
  for (let i = 0; i < count; i++) {
    const px = (((x0 + i * 68 * -dir + t * speed * dir) % 1440) + 1440) % 1440 - 80;
    const py = y0 + (i % 3) * 22 - i * 8 + Math.sin(t * 2.8 + i * 0.9) * 10;
    const flap = Math.sin(t * 8.5 + i * 1.3);
    const s = scale * (0.78 + (i % 3) * 0.14);
    c.save();
    c.translate(px, py);
    c.scale(dir * s, s);
    poly(c, [[-12, 2], [12, 0], [0, 7]], color);
    poly(c, [[-3, 1], [5, 1], [-2, -12 * flap - 3]], wingColor);
    c.restore();
  }
  c.restore();
}

/**
 * 3D Beveled Glowing Memory Puzzle Piece flying along a parabolic handoff arc (`voxel-mv` `makePuzzle` + `code-film directing references` §9).
 */
export function drawPuzzleRelayArc(
  c,
  t,
  {
    t0 = 0,
    t1 = 1.2,
    from = [360, 490],
    to = [640, 490],
    arcH = 115,
    color = '#ffd166',
    side = '#c7922e',
  } = {}
) {
  if (t < t0 - 0.05 || t > t1 + 0.45) return;
  const k = clamp((t - t0) / Math.max(0.08, t1 - t0));
  const ek = ease(k);
  const px = mix(from[0], to[0], ek);
  const py = mix(from[1], to[1], ek) - Math.sin(ek * Math.PI) * arcH;

  c.save();
  // Sparkling stardust trail behind the flying puzzle shard!
  for (let s = 1; s <= 6; s++) {
    const tk = clamp(ek - s * 0.045);
    const tx = mix(from[0], to[0], tk);
    const ty = mix(from[1], to[1], tk) - Math.sin(tk * Math.PI) * arcH;
    ellipse(c, tx, ty, 5.5 - s * 0.7, 5.5 - s * 0.7, `rgba(255, 232, 152, ${0.52 - s * 0.07})`);
  }

  const g = c.createRadialGradient(px, py, 2, px, py, 44);
  g.addColorStop(0, 'rgba(255, 234, 162, 0.78)');
  g.addColorStop(1, 'rgba(255, 200, 110, 0)');
  c.fillStyle = g;
  c.fillRect(px - 44, py - 44, 88, 88);

  drawExtrudedPiece(
    c,
    px - 18,
    py - 18,
    36,
    36,
    { top: 1, right: 1, bottom: 0, left: -1 },
    {
      fill: color,
      side,
      stroke: '#fff9e6',
      depth: 5,
      angle: t * 2.6,
    }
  );
  c.restore();
}

/**
 * Motion-trailed Companion Speech / Reaction Pill (`world-execute-me-lyric-mv` `bubbles.js` `meIn`).
 * Uses pure poetic words/symbols ONLY — zero digits, zero counters, zero progress bars (`画面红线` 100% safe).
 */
export function drawCompanionBubble(
  c,
  t,
  {
    at = 0,
    dur = 2.1,
    x = 760,
    y = 330,
    speaker = '豆包',
    text = '♪ 一起看海吧',
    accent = '#ff8e6e',
    fromRight = true,
  } = {}
) {
  if (t < at || t > at + dur) return;
  const kIn = easeOut(prog(t, at, at + 0.28));
  const kOut = 1 - prog(t, at + dur - 0.25, at + dur);
  const alpha = clamp(kIn * 2.4) * kOut;
  const slide = (1 - kIn) * (fromRight ? 95 : -95);
  const bob = Math.sin(t * 3.4) * 2.5;

  c.save();
  c.font = '700 15px MvBold';
  const tw = c.measureText(`${speaker} · ${text}`).width;
  const bw = tw + 28;
  const bh = 32;
  const bx = x - bw * 0.5 + slide;
  const by = y - bh * 0.5 + bob;

  // Motion trail ghost while flying in (`world-execute-me` style!)
  if (kIn < 0.96) {
    c.globalAlpha = alpha * 0.28;
    rect(c, bx + (fromRight ? 18 : -18), by, bw, bh, accent, 16);
  }

  c.globalAlpha = alpha;
  rect(c, bx + 2, by + 3, bw, bh, 'rgba(12, 22, 34, 0.34)', 16);
  rect(c, bx, by, bw, bh, 'rgba(255, 250, 238, 0.94)', 16);
  c.strokeStyle = accent;
  c.lineWidth = 1.8;
  c.beginPath();
  c.roundRect(bx + 0.8, by + 0.8, bw - 1.6, bh - 1.6, 15);
  c.stroke();

  // Accent left pip
  rect(c, bx + 9, by + 8, 4, bh - 16, accent, 2);

  c.textAlign = 'left';
  c.textBaseline = 'middle';
  c.fillStyle = '#243546';
  c.fillText(`${speaker} · ${text}`, bx + 18, by + bh * 0.5 + 0.5);
  c.restore();
}

/**
 * Floating Mini Memory Polaroid Card developing/drifting in the diorama (`code-film directing references/paper-popup`).
 */
export function drawMiniPolaroid(
  c,
  t,
  {
    x = 160,
    y = 175,
    w = 88,
    h = 104,
    angle = -0.12,
    sky = '#8fd3ea',
    ground = '#edd9b4',
    motif = 'sun', // 'sun' | 'star' | 'wave' | 'flower'
    appearAt = 0,
  } = {}
) {
  const k = backOut(prog(t, appearAt, appearAt + 0.36));
  if (k <= 0.01) return;
  c.save();
  c.translate(x, y + Math.sin(t * 2.1 + x * 0.02) * 3.5);
  c.rotate(angle + Math.sin(t * 1.4 + y * 0.01) * 0.03);
  c.scale(k, k);

  rect(c, -w * 0.5 + 4, -h * 0.5 + 5, w, h, 'rgba(12, 20, 32, 0.28)', 4);
  rect(c, -w * 0.5, -h * 0.5, w, h, '#fff9ee', 4);
  rect(c, -w * 0.5 + 7, -h * 0.5 + 7, w - 14, h - 26, sky, 2);
  rect(c, -w * 0.5 + 7, -h * 0.5 + h - 36, w - 14, 17, ground);

  if (motif === 'sun') {
    ellipse(c, 12, -16, 10, 10, '#ffd46b');
  } else if (motif === 'star') {
    ellipse(c, -10, -18, 3, 3, '#ffe799');
    ellipse(c, 12, -12, 4, 4, '#ffe799');
    ellipse(c, 0, -22, 2.5, 2.5, '#ffffff');
  } else if (motif === 'flower') {
    ellipse(c, 0, -10, 9, 9, '#ff9aa2');
    ellipse(c, 0, -10, 4, 4, '#fff2b2');
  } else {
    poly(c, [[-w * 0.5 + 7, 2], [0, -6], [w * 0.5 - 7, 2], [w * 0.5 - 7, 12], [-w * 0.5 + 7, 12]], '#4ea5c2');
  }
  // Washi tape strip at top
  c.globalAlpha = 0.78;
  rect(c, -16, -h * 0.5 - 5, 32, 10, '#f4b183', 2);
  c.restore();
}

/**
 * Near-lens 1.32x Parallax Macro Foreground Bokeh & Framing Corner Leaves (`paper-popup` + `hd-2d`).
 */
export function drawMacroForegroundBokeh(
  c,
  t,
  {
    count = 8,
    color = 'rgba(255, 232, 178, 0.16)',
    leafColor = null,
    seed = 53,
  } = {}
) {
  c.save();
  for (let i = 0; i < count; i++) {
    const h1 = hash(seed + i * 17);
    const h2 = hash(seed + i * 23 + 3);
    const bx = ((h1 * 1420 + t * (12 + (i % 3) * 5)) % 1420) - 70;
    const by = (h2 > 0.5 ? 560 + (h2 - 0.5) * 280 : 30 + h2 * 190) + Math.sin(t * 1.3 + i) * 9;
    const rad = 26 + (i % 4) * 16;
    const g = c.createRadialGradient(bx, by, rad * 0.15, bx, by, rad);
    g.addColorStop(0, color);
    g.addColorStop(0.7, color);
    g.addColorStop(1, 'rgba(255, 255, 255, 0)');
    c.fillStyle = g;
    c.fillRect(bx - rad, by - rad, rad * 2, rad * 2);
  }

  if (leafColor) {
    const swayL = Math.sin(t * 1.9) * 8;
    const swayR = Math.cos(t * 1.7) * 8;
    c.globalAlpha = 0.72;
    for (let k = 0; k < 4; k++) {
      ellipse(c, 22 + k * 24 + swayL * 0.4, 52 + k * 14, 26, 9, leafColor, 0.45 + k * 0.15);
      ellipse(c, 1258 - k * 24 + swayR * 0.4, 56 + k * 14, 26, 9, leafColor, -0.45 - k * 0.15);
    }
  }
  c.restore();
}
