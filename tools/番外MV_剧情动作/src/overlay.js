// Shared 2D overlay drawing for browser preview and Node export compositor.
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const smooth = (k) => { k = clamp(k); return k * k * (3 - 2 * k); };
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

export function drawBackdrop(ctx, W, H, colors, t, starSet = true) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, colors.bg);
  g.addColorStop(1, colors.fog);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  if (starSet) {
    for (let i = 0; i < 46; i++) {
      const x = hash(i) * W, y = hash(i + 90) * H * 0.45;
      const a = 0.18 + 0.22 * Math.sin(t * 1.5 + i);
      ctx.fillStyle = `rgba(246,236,216,${Math.max(0.05, a)})`;
      ctx.fillRect(x, y, 2, 2);
    }
  }
}

export function drawVignette(ctx, W, H) {
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.9);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(8,10,20,0.32)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

export function drawKeyword(ctx, shot, t, W, H) {
  const lt = t - shot.start;
  const dur = shot.end - shot.start;
  const a = smooth(lt / 0.3) * (1 - smooth((lt - dur + 0.25) / 0.25));
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  const message = shot.framing === 'message';
  if (message) {
    const x = 104, y = 170, w = 660, h = 280;
    ctx.fillStyle = 'rgba(18,24,42,0.82)';
    ctx.strokeStyle = 'rgba(246,236,216,0.28)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 18); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#9fb2cc'; ctx.font = '22px "Noto Sans SC"';
    ctx.fillText('她们的小世界', x + 28, y + 44);
    ctx.fillStyle = 'rgba(246,236,216,0.1)';
    ctx.beginPath(); ctx.roundRect(x + 28, y + 70, w - 56, 120, 14); ctx.fill();
    ctx.fillStyle = '#f6ecd8'; ctx.font = '54px "ZCOOL KuaiLe"';
    ctx.fillText(shot.keyword, x + 52, y + 146);
    ctx.fillStyle = '#9fb2cc'; ctx.font = '20px "Silkscreen", monospace';
    ctx.fillText(shot.motif, x + 28, y + 232);
    const cx = x + w - 70, cy = y + h - 44;
    ctx.fillStyle = '#f6ecd8';
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + 16, cy + 22); ctx.lineTo(cx + 7, cy + 20); ctx.lineTo(cx + 2, cy + 30); ctx.closePath(); ctx.fill();
  } else {
    const center = ['openSea', 'timeBridge', 'dawnGarden'].includes(shot.set);
    const x = center ? W / 2 : 104;
    const y = shot.set === 'fireworkRooftop' ? 150 : 170;
    ctx.textAlign = center ? 'center' : 'left';
    ctx.font = '92px "ZCOOL KuaiLe"';
    ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(12,16,30,0.55)';
    ctx.strokeText(shot.keyword, x, y);
    ctx.fillStyle = shot.set === 'dawnGarden' ? '#ffd98a' : '#f6ecd8';
    ctx.fillText(shot.keyword, x, y);
    ctx.font = '22px "Silkscreen", monospace';
    ctx.fillStyle = 'rgba(246,236,216,0.72)';
    ctx.fillText(shot.motif, x, y + 42);
    ctx.textAlign = 'left';
  }
  ctx.restore();
}

export function drawPolaroid(ctx, shot, t, W, H) {
  if (shot.index !== 10) return;
  const lt = t - shot.start;
  const k = smooth(lt / 0.5);
  ctx.save();
  ctx.globalAlpha = k;
  ctx.fillStyle = 'rgba(8,10,20,0.35)';
  ctx.fillRect(0, 0, W, H);
  const x = 380, y = 120, w = 1160, h = 740;
  ctx.strokeStyle = '#f6ecd8'; ctx.lineWidth = 26;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = '#f6ecd8';
  ctx.fillRect(x - 13, y + h - 13, w + 26, 92);
  ctx.fillStyle = '#2b2f42'; ctx.font = '42px "ZCOOL KuaiLe"'; ctx.textAlign = 'center';
  ctx.fillText('一刹那', W / 2, y + h + 48);
  ctx.textAlign = 'left';
  ctx.restore();
}

export function drawSubtitle(ctx, SUB, cue, t, W, H) {
  if (!cue) return;
  let text = cue.text, start = cue.start;
  if (cue.segments) {
    const seg = cue.segments.find(s => t >= s.start && t < s.end) || cue.segments[cue.segments.length - 1];
    text = seg.text; start = seg.start;
  }
  const vis = smooth((t - start) / 0.12);
  SUB.draw(ctx, { lines: SUB.wrap(text), speaker: '她们 · 心声', vis, W, H });
}

export function drawBadge(ctx, W, H) {
  ctx.save();
  ctx.font = '18px "Noto Sans SC"';
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(246,236,216,0.72)';
  ctx.fillText('非官方同人 · AI生成 · 剧情演绎', W - 36, 42);
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(246,236,216,0.62)';
  ctx.font = '20px "Noto Sans SC"';
  ctx.fillText('番外 · 把回忆拼好给你', 36, 42);
  ctx.restore();
}

// Short deterministic shot transitions. Method reference: PDoomVideo brush wipes /
// iris / flash and world-execute-me-lyric-mv scene plates; no reference code copied.
export function drawTransition(ctx, shot, t, W, H) {
  const kind = shot.transition || 'none';
  if (kind === 'none' || shot.index === 0) return;
  const lt = t - shot.start;
  const D = 0.32;
  if (lt < 0 || lt > D) return;
  const p = clamp(lt / D);
  const e = 1 - Math.pow(1 - p, 3);
  ctx.save();
  if (kind === 'flash') {
    ctx.fillStyle = `rgba(246,236,216,${0.85 * (1 - e)})`;
    ctx.fillRect(0, 0, W, H);
  } else if (kind === 'iris') {
    const r = e * Math.hypot(W, H) * 0.62 + 1;
    ctx.fillStyle = 'rgba(16,22,38,0.96)';
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.arc(W / 2, H / 2, r, 0, Math.PI * 2, true);
    ctx.fill('evenodd');
  } else if (kind === 'wipe') {
    const cols = ['#3a4058', '#5a4a63', '#2c3654'];
    const n = 4, bw = W / n + 80;
    for (let i = 0; i < n; i++) {
      const x = -bw + e * (W + bw * 2) - i * 30;
      ctx.fillStyle = cols[i % cols.length];
      ctx.beginPath();
      ctx.moveTo(x, 0); ctx.lineTo(x + bw, 0); ctx.lineTo(x + bw - 60, H); ctx.lineTo(x - 60, H);
      ctx.closePath(); ctx.fill();
    }
  } else { // brush
    const cols = [['#5a4a63', '#3a4058'], ['#2c3654', '#5a4a63'], ['#6a5a6a', '#2c3654']];
    const n = 5, bh = H / n + 40;
    for (let i = 0; i < n; i++) {
      const y = i * (H / n) - 20;
      const x = -W * 0.2 + e * (W * 1.4) + (hash(i * 13) - 0.5) * 80;
      const [c1, c2] = cols[i % cols.length];
      ctx.fillStyle = i % 2 ? c1 : c2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let k = 0; k <= 8; k++) ctx.lineTo(x + W * 1.2 * k / 8, y + Math.sin(k + i) * 10);
      ctx.lineTo(x + W * 1.2, y + bh);
      for (let k = 8; k >= 0; k--) ctx.lineTo(x + W * 1.2 * k / 8, y + bh + Math.cos(k + i) * 10);
      ctx.closePath(); ctx.fill();
    }
  }
  ctx.restore();
}
