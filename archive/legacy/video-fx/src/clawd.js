// src/clawd.js — The Anthropic / ClaudeAnimationBase Clawd Mascot Character Rig (16-Bit Pixel-Art Edition)
// Modeled on JohnHeibel/ClaudeAnimationBase (src/clawd.js) & PDoomVideo:
//   - Terracotta blocky 4-legged pixel body (`#D97757` / `#C6613F` / `#9A4428`) with pixel claw arms,
//   - Hats (`top`, `party`, `hard`, `crown`, `cap`, `propeller`),
//   - Expressive pixel eyes (`open`, `happy`, `wink`, `star`, `spark`, `scared`) & mouths (`smile`, `O`, `flat`).

(function (root) {
  const CORE = root.CORE || (typeof require !== 'undefined' ? require('./core.js') : {});
  const WHALE = root.WHALE_GIRL || (typeof require !== 'undefined' ? require('./whale_girl.js') : {});
  const { PAL, clamp, boilSeed, ellPts, paint } = CORE;

  function clawd(ctx, x, y, u = 14, o = {}) {
    boilSeed('clawd' + Math.round(x) + (o.seed || 0));
    const sq = clamp(o.sq || 0, -0.35, 0.35);
    const sx = (1 - sq * 0.55) * (o.flip ? -1 : 1);
    const sy = 1 + sq * 0.75;
    const dy = (o.dy || 0) * u;
    const cell = u / 10;

    if (!o.noShadow) {
      paint(ctx, ellPts(x, y + 0.1 * u, 2.3 * u, 0.45 * u, 14), { wash: PAL.ink, washOp: 65, ink: null });
    }

    ctx.save();
    ctx.translate(x, y + dy);
    if (o.rot) ctx.rotate(o.rot);
    ctx.scale(sx, sy);

    const px = (gx, gy, gw, gh, col) => {
      ctx.fillStyle = col;
      ctx.fillRect((gx - 0.5) * cell, (gy - 0.5) * cell, gw * cell + 0.35, gh * cell + 0.35);
    };

    const INK = '#141A2E';
    const C_HI = '#F29A7A';
    const C_MAIN = '#D97757';
    const C_MID = '#C25E3E';
    const C_SHAD = '#943F25';
    const C_BELLY = '#F7C5B0';

    // 4 blocky pixel legs with walk cycle
    const wPh = o.walk != null ? o.walk * Math.PI : 0;
    const legXs = [-16, -6, 4, 14];
    legXs.forEach((lx, i) => {
      const lOff = o.walk != null ? Math.round(Math.sin(wPh + i * 1.5) * 3) : 0;
      px(lx - 1, -11 + lOff, 5, 11, INK);
      px(lx, -10 + lOff, 3, 9, i % 2 === 0 ? C_MID : C_SHAD);
      px(lx, -10 + lOff, 2, 7, C_MAIN);
    });

    // Side Pixel Pincer Claws
    const armBobL = Math.round((o.aL ?? 0.2) * 4);
    const armBobR = Math.round((o.aR ?? 0.2) * 4);
    // Left claw
    px(-28, -28 - armBobL, 7, 9, INK);
    px(-27, -27 - armBobL, 5, 7, C_MAIN);
    px(-27, -27 - armBobL, 4, 2, C_HI);
    px(-28, -24 - armBobL, 2, 2, INK); // pincer notch
    // Right claw
    px(22, -28 - armBobR, 7, 9, INK);
    px(23, -27 - armBobR, 5, 7, C_MAIN);
    px(24, -27 - armBobR, 4, 2, C_HI);
    px(27, -24 - armBobR, 2, 2, INK); // pincer notch

    // Signature wide rectangular terracotta pixel body with rounded pixel corners
    px(-21, -37, 43, 27, INK);
    px(-22, -35, 45, 23, INK);
    // Inner body fill
    px(-20, -36, 41, 25, C_MAIN);
    px(-21, -34, 43, 21, C_MAIN);
    // Top highlight bevel & bottom shadow bevel
    px(-19, -36, 39, 3, C_HI);
    px(-20, -33, 3, 18, C_HI);
    px(-20, -14, 41, 3, C_SHAD);
    px(19, -33, 3, 19, C_MID);
    // Cute lighter belly patch
    px(-12, -16, 25, 4, C_BELLY);
    // Blush cheeks
    px(-16, -22, 4, 2, '#F43F5E');
    px(13, -22, 4, 2, '#F43F5E');

    // Pixel Eyes
    const eyeType = o.eyes || 'open';
    for (const s of [-1, 1]) {
      const ex = s * 10;
      if (eyeType === 'happy' || (eyeType === 'wink' && s === 1)) {
        px(ex - 3, -26, 2, 2, INK);
        px(ex - 1, -28, 3, 2, INK);
        px(ex + 2, -26, 2, 2, INK);
      } else if (eyeType === 'star' || eyeType === 'spark') {
        px(ex - 3, -28, 7, 7, INK);
        px(ex - 2, -27, 5, 5, '#1E3A8A');
        px(ex - 3, -25, 7, 1, '#FACC15');
        px(ex, -28, 1, 7, '#FACC15');
        px(ex - 1, -26, 3, 3, '#FEF08A');
        px(ex, -25, 1, 1, '#FFFFFF');
      } else if (eyeType === 'scared') {
        px(ex - 3, -29, 7, 8, INK);
        px(ex - 2, -28, 5, 6, '#FFFFFF');
        px(ex - 1, -26, 2, 2, INK);
      } else {
        px(ex - 2, -29, 5, 7, INK);
        px(ex - 1, -28, 2, 2, '#FFFFFF');
        px(ex + 1, -24, 1, 1, '#72E2F7');
      }
    }

    // Pixel Mouth
    if (o.mouth === 'O') {
      px(-2, -20, 5, 5, INK);
      px(-1, -19, 3, 3, '#E11D48');
    } else {
      px(-4, -19, 2, 2, INK);
      px(-2, -18, 5, 2, INK);
      px(3, -19, 2, 2, INK);
    }

    // Optional bowtie prop
    if (o.prop === 'bowtie') {
      px(-6, -15, 13, 5, INK);
      px(-5, -14, 4, 3, '#F43F5E');
      px(2, -14, 4, 3, '#F43F5E');
      px(-1, -14, 3, 3, '#FB7185');
    }

    // Pixel Hats (`top`, `party`, `hard`, `crown`, `cap`, `propeller`)
    if (o.hat === 'crown') {
      px(-12, -41, 25, 5, INK);
      px(-12, -45, 4, 4, INK); px(-3, -47, 7, 6, INK); px(9, -45, 4, 4, INK);
      px(-11, -40, 23, 3, '#EAB308');
      px(-11, -44, 3, 4, '#FACC15');
      px(-5, -42, 3, 2, '#FACC15');
      px(-1, -46, 3, 6, '#FEF08A');
      px(3, -42, 3, 2, '#FACC15');
      px(9, -44, 3, 4, '#FACC15');
      px(-6, -39, 2, 2, '#38BDF8');
      px(0, -40, 2, 2, '#F43F5E');
      px(5, -39, 2, 2, '#38BDF8');
    } else if (o.hat === 'party') {
      px(-8, -40, 17, 3, INK);
      px(-7, -43, 15, 3, '#EC4899');
      px(-5, -46, 11, 3, '#38BDF8');
      px(-3, -49, 7, 3, '#FACC15');
      px(-2, -52, 5, 3, '#FEF08A');
    } else if (o.hat === 'top') {
      px(-14, -39, 29, 3, INK);
      px(-9, -50, 19, 11, '#1E293B');
      px(-7, -49, 5, 9, '#334155');
      px(-9, -41, 19, 2, '#F43F5E');
    } else if (o.hat === 'hard') {
      px(-15, -39, 31, 3, '#CA8A04');
      px(-12, -45, 25, 6, '#FACC15');
      px(-3, -46, 7, 7, '#FEF08A');
    } else if (o.hat === 'cap' || o.hat === 'propeller') {
      px(-12, -43, 25, 6, '#2563EB');
      px(-6, -43, 13, 6, '#FACC15');
      if (o.hat === 'propeller') {
        px(-1, -47, 3, 4, INK);
        px(-8, -48, 17, 2, '#F43F5E');
      }
    }

    if (o.emote && WHALE.EMOTES && WHALE.EMOTES[o.emote]) {
      WHALE.EMOTES[o.emote](ctx, 0, -4.5 * u, u, 1, o.t || 0);
    }

    ctx.restore();
  }

  const CLAWD = { clawd };
  root.CLAWD = CLAWD;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CLAWD;
  }
})(typeof window !== 'undefined' ? window : globalThis);
