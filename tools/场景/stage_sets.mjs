// stage_sets.mjs — 重导出纯函数舞台核心 + 2D Canvas 统一舞台绘制器
import { TAU, clamp } from '../engine/timeline_core.mjs';
import { drawBaseUnderwaterRoom } from '../engine/room_base.mjs';
import { MOODS, renderUnderwaterStage, drawDoorPortal } from './sea_stage.mjs';
import {
  WORLD_BOUNDS,
  BUILTIN_STAGE_SETS,
  STAGE_SET_NAMES,
  defineStageSet,
  isKnownStageSet,
  resolveShotSetSpec,
  resolveStageSet,
} from './stage_sets_core.mjs';

export {
  WORLD_BOUNDS,
  BUILTIN_STAGE_SETS,
  STAGE_SET_NAMES,
  defineStageSet,
  isKnownStageSet,
  resolveShotSetSpec,
  resolveStageSet,
};

function drawParallaxOffset(ctx, cam, factor, fn) {
  const ox = ((cam?.cx ?? 640) - 640) * (1 - factor);
  const oy = ((cam?.cy ?? 360) - 360) * (1 - factor);
  ctx.save();
  ctx.translate(ox, oy);
  fn();
  ctx.restore();
}

export function drawStageSetCanvas(ctx, setState, { t = 0, cam = { cx: 640, cy: 360, z: 1 }, drawActorsLayer = null, drawBackProps = null } = {}) {
  const { id, palette, anchors, lightSources, particles, groundY, mood, reactive } = setState;

  if (id === 'underwater_study') {
    const seaMood = MOODS[mood] ? mood : 'work_cool';
    renderUnderwaterStage(
      ctx,
      t,
      cam,
      {
        mood: seaMood,
        doorOpen: reactive.doorOpen,
        impactTime: reactive.windowImpactAt,
        drawRoom: (time) => drawBaseUnderwaterRoom(ctx, time, { mood: seaMood }),
        drawFixtures: () => {
          if (reactive.doorOpen > 0.01) drawDoorPortal(ctx, reactive.doorOpen);
          const pins = anchors.board?.pins || 0;
          if (pins > 0) {
            ctx.save();
            for (let i = 0; i < Math.min(4, pins); i++) {
              const px = 675 + i * 38;
              const py = 228 + (i % 2) * 24;
              ctx.fillStyle = i % 2 === 0 ? '#FFF2C6' : '#D9F1F6';
              ctx.fillRect(px, py, 26, 20);
              ctx.fillStyle = '#D96B6B';
              ctx.beginPath();
              ctx.arc(px + 13, py + 4, 2.5, 0, TAU);
              ctx.fill();
            }
            ctx.restore();
          }
        },
      },
      () => {
        drawBackProps?.(ctx);
        drawActorsLayer?.(ctx);
      }
    );
    return;
  }

  const { x0, x1, y0, y1 } = WORLD_BOUNDS;
  ctx.save();

  drawParallaxOffset(ctx, cam, 0.35, () => {
    const sky = ctx.createLinearGradient(0, y0, 0, groundY);
    sky.addColorStop(0, palette.skyTop);
    sky.addColorStop(1, palette.skyBot);
    ctx.fillStyle = sky;
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);

    if (id === 'mountain_pass' || id === 'sunset_ridge' || id === 'river_gate') {
      for (let layer = 0; layer < 3; layer++) {
        ctx.fillStyle = layer === 0 ? 'rgba(42,68,78,0.28)' : layer === 1 ? 'rgba(54,84,82,0.42)' : palette.wall;
        ctx.beginPath();
        ctx.moveTo(x0, groundY);
        for (let x = x0; x <= x1; x += 90) {
          const ridge = groundY - 210 + layer * 48 - Math.sin(x * 0.0045 + layer * 1.9) * (68 - layer * 14);
          const gapDip = id === 'mountain_pass'
            ? Math.exp(-Math.pow((x - 760) / (120 + reactive.gateOpen * 160), 2)) * (95 + reactive.gateOpen * 110)
            : 0;
          ctx.lineTo(x, ridge + gapDip);
        }
        ctx.lineTo(x1, groundY);
        ctx.closePath();
        ctx.fill();
      }
    }
  });

  drawParallaxOffset(ctx, cam, 0.78, () => {
    if (['porthole_observatory', 'screening_desk', 'corridor_hatch', 'pantry_hearth', 'split_stage', 'terracotta_courtyard', 'rain_street'].includes(id)) {
      ctx.fillStyle = palette.wall;
      ctx.fillRect(x0, y0, x1 - x0, groundY - y0);
      if (id === 'split_stage') {
        ctx.fillStyle = '#33273B';
        ctx.beginPath();
        ctx.moveTo(anchors.dividerX, y0);
        ctx.lineTo(x1, y0);
        ctx.lineTo(x1, groundY);
        ctx.lineTo(anchors.dividerX - 45, groundY);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = palette.wallTrim;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(anchors.dividerX, y0);
        ctx.lineTo(anchors.dividerX - 45, groundY);
        ctx.stroke();
      }
      ctx.fillStyle = palette.wallTrim;
      ctx.fillRect(x0, groundY - 18, x1 - x0, 18);
    }

    if (anchors.window) {
      const win = anchors.window;
      ctx.save();
      if (win.panoramic) {
        ctx.beginPath();
        ctx.roundRect(win.x - win.w / 2, win.y - win.h / 2, win.w, win.h, 48);
        ctx.fillStyle = '#07223D';
        ctx.fill();
        ctx.clip();
        for (let i = 0; i < 4; i++) {
          const fx = win.x - 280 + i * 185 + Math.sin(t * 0.7 + i * 1.6) * 42;
          const fy = win.y - 60 + (i % 2) * 85 + Math.cos(t * 0.9 + i) * 14;
          ctx.fillStyle = 'rgba(115,222,242,0.42)';
          ctx.beginPath();
          ctx.ellipse(fx, fy, 18, 7, 0, 0, TAU);
          ctx.fill();
        }
        if (win.ripple > 0.01) {
          ctx.strokeStyle = `rgba(170,242,255,${(win.ripple * 0.65).toFixed(3)})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(win.x, win.y, (1 - win.ripple) * 180 + 24, 0, TAU);
          ctx.stroke();
        }
        ctx.restore();
        ctx.strokeStyle = palette.wallTrim;
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.roundRect(win.x - win.w / 2, win.y - win.h / 2, win.w, win.h, 48);
        ctx.stroke();
      } else {
        ctx.fillStyle = id === 'rain_street' || id === 'terracotta_courtyard' ? 'rgba(255,220,150,0.38)' : '#0B2D4D';
        ctx.beginPath();
        ctx.arc(win.x, win.y, win.r || 72, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = palette.wallTrim;
        ctx.lineWidth = 7;
        ctx.stroke();
      }
    }

    if (anchors.board) {
      const b = anchors.board;
      ctx.fillStyle = '#6E5340';
      ctx.fillRect(b.x - b.w / 2 - 6, b.y - b.h / 2 - 6, b.w + 12, b.h + 12);
      ctx.fillStyle = '#B08962';
      ctx.fillRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
      const count = Math.min(6, Math.max(1, b.pins || 2));
      for (let i = 0; i < count; i++) {
        const cx = b.x - b.w / 2 + 28 + (i % 3) * 82;
        const cy = b.y - b.h / 2 + 24 + Math.floor(i / 3) * 64;
        ctx.fillStyle = i % 2 === 0 ? '#FFF6DA' : '#DFF4F8';
        ctx.fillRect(cx, cy, 56, 42);
        ctx.fillStyle = '#D65A5A';
        ctx.beginPath();
        ctx.arc(cx + 28, cy + 6, 3.2, 0, TAU);
        ctx.fill();
      }
    }

    if (anchors.door) {
      const d = anchors.door;
      const openW = d.w * clamp(d.open ?? 0);
      ctx.fillStyle = '#2A2523';
      ctx.fillRect(d.x - d.w / 2, d.topY, d.w, d.h);
      if (openW > 2) {
        const leak = ctx.createLinearGradient(d.x - d.w / 2, d.topY, d.x + d.w / 2, d.y);
        leak.addColorStop(0, '#FFE4A3');
        leak.addColorStop(1, '#D69E5C');
        ctx.fillStyle = leak;
        ctx.fillRect(d.x - d.w / 2 + 4, d.topY + 4, openW, d.h - 4);
      }
      ctx.fillStyle = palette.wallTrim;
      ctx.fillRect(d.x - d.w / 2 + openW, d.topY, Math.max(10, d.w - openW), d.h);
    }

    if (id === 'river_gate' && anchors.gate) {
      const g = anchors.gate;
      ctx.fillStyle = '#2E8BC0';
      ctx.fillRect(x0, groundY - 95, x1 - x0, 100);
      for (let w = 0; w < 3; w++) {
        ctx.strokeStyle = `rgba(225,248,255,${0.32 + w * 0.12})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let x = x0; x <= x1; x += 36) {
          const wy = groundY - 76 + w * 22 + Math.sin(x * 0.03 - t * (3.2 + g.open * 3.5) + w) * (6 + g.open * 8);
          if (x === x0) ctx.moveTo(x, wy); else ctx.lineTo(x, wy);
        }
        ctx.stroke();
      }
      ctx.fillStyle = '#4B3B30';
      ctx.fillRect(g.x - g.w / 2 - 16, 150, 18, 440);
      ctx.fillRect(g.x + g.w / 2 - 2, 150, 18, 440);
      ctx.fillStyle = '#7C5A3F';
      ctx.fillRect(g.x - g.w / 2, g.topY, g.w, 220);
    }

    if (id === 'corridor_hatch') {
      for (let lx = 220; lx <= 1060; lx += 120) {
        const prox = Math.max(0.18, 1 - Math.abs(lx - reactive.focusX) / 260);
        ctx.fillStyle = `rgba(123,227,242,${(0.2 + 0.68 * prox).toFixed(3)})`;
        ctx.beginPath();
        ctx.roundRect(lx - 18, groundY - 12, 36, 6, 3);
        ctx.fill();
      }
    }
  });

  ctx.fillStyle = palette.floor;
  ctx.fillRect(x0, groundY, x1 - x0, y1 - groundY);
  ctx.strokeStyle = palette.floorLine;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x0, groundY);
  ctx.lineTo(x1, groundY);
  ctx.stroke();

  for (const ls of lightSources) {
    if (ls.intensity <= 0.01) continue;
    ctx.save();
    const cone = ctx.createLinearGradient(ls.x, ls.y, ls.targetX, ls.targetY);
    cone.addColorStop(0, ls.color);
    cone.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalAlpha = ls.intensity * 0.55;
    ctx.fillStyle = cone;
    ctx.beginPath();
    ctx.moveTo(ls.x - 24, ls.y);
    ctx.lineTo(ls.x + 24, ls.y);
    ctx.lineTo(ls.targetX + ls.radius * 0.75, ls.targetY);
    ctx.lineTo(ls.targetX - ls.radius * 0.75, ls.targetY);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = ls.intensity * 0.7;
    ctx.fillStyle = ls.color;
    ctx.beginPath();
    ctx.ellipse(ls.targetX, groundY + 4, ls.radius * 0.68, 22, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  if (anchors.hearth) {
    const h = anchors.hearth;
    ctx.fillStyle = '#5B4338';
    ctx.fillRect(h.x - h.w / 2, h.topY, h.w, groundY - h.topY);
    ctx.fillStyle = '#D99B66';
    ctx.beginPath();
    ctx.ellipse(h.x, h.topY - 8, 48, 18, 0, 0, TAU);
    ctx.fill();
  }

  drawBackProps?.(ctx);
  drawActorsLayer?.(ctx);

  ctx.save();
  for (const p of particles) {
    ctx.globalAlpha = p.alpha;
    if (p.kind === 'rain') {
      ctx.strokeStyle = '#A9D6FF';
      ctx.lineWidth = p.r;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - 5, p.y + p.len);
      ctx.stroke();
    } else if (p.kind === 'bubbles') {
      ctx.strokeStyle = palette.accent;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, TAU);
      ctx.stroke();
    } else {
      ctx.fillStyle = p.kind === 'steam' ? '#FFF6EA' : palette.warm;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();

  ctx.restore();
}
