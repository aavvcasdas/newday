// world_interactions.mjs — 人物 ↔ 背景 ↔ 道具双向空间交互总线
// 彻底解决「1背景和人物的交互呢」与「画面怎么交互这么少」：
//   1. 人物 → 背景地面/光影：跳跃高度衰减投影 (lift shadow)、光源方向拉长投影、脚步落地涟漪/尘土、近光边缘高光 (rimLight)；
//   2. 人物/事件 → 场景机关：进出门自动推门漏光 (doorOpen)、拍桌震动 (deskShake)、敲窗惊鱼涟漪 (windowImpactAt)、
//      拉闸放水/开山透光 (gateOpen)、点灯 (lampLit)、钉板贴条 (pinnedCount)、昼夜晨昏推进 (dawn)；
//   3. 人物手掌 ↔ 道具绑定：基于 handAt(actor, side) 实现手持跟随、双手交接、以及从手掌抛放到桌面锚点的连续弧线过渡。

import { TAU, clamp, lerp, seg, ease, easeOut, backOut, resolveAnchorTime } from '../engine/timeline_core.mjs';
import { actorPixelHeight, handAt } from '../engine/character_motion.mjs';
import { resolveStageSet, resolveShotSetSpec } from '../场景/stage_sets_core.mjs';

export const STAGE_TRIGGER_KINDS = Object.freeze([
  'open_door',
  'close_door',
  'open_gate',
  'toggle_lamp',
  'pulse_lamp',
  'tap_window',
  'window_ripple',
  'shake_desk',
  'slam_desk',
  'pin_board',
  'pin_note',
  'dawn_shift',
  'splash_water',
]);

function arcBetween(p0, p1, liftPx, u) {
  const q = ease(clamp(u));
  return {
    x: lerp(p0.x, p1.x, q),
    y: lerp(p0.y, p1.y, q) - Math.sin(Math.PI * q) * liftPx,
  };
}

/**
 * 求解当前帧的人物 ↔ 背景 ↔ 道具完整交互状态
 */
export function computeWorldInteractionState({
  shot = {},
  shotIndex = 0,
  spec = {},
  actors = [],
  calibratedAnchors = [],
  events = [],
  cues = [],
  beatGrid = null,
  t = 0,
  fps = 30,
} = {}) {
  const baseSetSpec = resolveShotSetSpec(shot, shotIndex, spec);
  const initialSet = resolveStageSet(baseSetSpec, t, {});
  const doorAnchorX = initialSet.anchors?.door?.x ?? 1070;

  let doorOpen = Number.isFinite(baseSetSpec.doorOpen) ? baseSetSpec.doorOpen : 0;
  let gateOpen = Number.isFinite(baseSetSpec.gateOpen) ? baseSetSpec.gateOpen : 0;
  let lampLit = Number.isFinite(baseSetSpec.lampLit) ? baseSetSpec.lampLit : 0.86;
  let dawn = Number.isFinite(baseSetSpec.dawn) ? baseSetSpec.dawn : 0.65;
  let deskShake = 0;
  let windowImpactAt = baseSetSpec.windowImpactAt ?? null;
  let pinnedCount = Number.isFinite(baseSetSpec.pinnedCount) ? baseSetSpec.pinnedCount : 1;
  const shockwaves = [];

  // A. 自动门耦合：当角色从右侧走廊/门区走入或走出时，舱门/木门自动开合并向地面投出暖光！
  for (const plan of shot.actors || []) {
    if (!plan.walk) continue;
    const crossesDoor = Math.max(plan.walk.from, plan.walk.to) >= doorAnchorX - 95;
    if (!crossesDoor) continue;
    const wStart = plan.walk.start != null
      ? plan.walk.start
      : (plan.walk.startLine ? (cues[plan.walk.startLine - 1]?.start ?? shot.start ?? 0) : (shot.start ?? 0));
    const wEnd = wStart + (plan.walk.duration ?? 1.2);
    const openEnv = ease(seg(t, wStart - 0.25, wStart + 0.35)) * (1 - ease(seg(t, wEnd - 0.1, wEnd + 0.55)));
    doorOpen = Math.max(doorOpen, openEnv * 0.92);
  }

  // B. 自动词点交互耦合：道具砸落/拍击/落章自动震动桌面、激起舷窗鱼群涟漪与冲击波环！
  for (const ev of events) {
    if (ev.shotId && shot.id && ev.shotId !== shot.id) continue;
    const hitT = (ev.contactFrame ?? -999) / fps;
    const age = t - hitT;
    if (age >= 0 && age < 1.2) {
      if (['drop_bonk', 'knock_bowl', 'mark_strike'].includes(ev.verb)) {
        deskShake += Math.exp(-7 * age) * Math.sin(age * 34) * 5.5;
      }
      if (['slap_deflect', 'sink_drop', 'drop_bonk'].includes(ev.verb)) {
        if (windowImpactAt == null || Math.abs(hitT - windowImpactAt) < 1.5) windowImpactAt = hitT;
      }
      if (['handoff', 'unroll_scroll'].includes(ev.verb)) {
        lampLit = clamp(lampLit + 0.14 * Math.sin(Math.min(1, age / 0.6) * Math.PI));
      }
      if (age < 0.55) {
        const pt = ev.params?.land || ev.params?.at || [640, 490];
        shockwaves.push({
          x: pt[0],
          y: pt[1],
          age,
          u: age / 0.55,
          color: ev.verb === 'sink_drop' ? '#72DCF2' : '#FFE099',
        });
      }
    }
  }

  // C. 显式舞台机关触发器 (shot.stageTriggers)
  for (const trig of shot.stageTriggers || []) {
    const startT = resolveAnchorTime(trig, { cues, beatGrid, fallback: shot.start ?? 0 });
    const dur = Math.max(0.12, trig.duration ?? 0.65);
    const u = seg(t, startT, startT + dur);
    switch (trig.kind) {
      case 'open_door':
        doorOpen = lerp(trig.from ?? doorOpen, trig.to ?? trig.target ?? 1, ease(u));
        break;
      case 'close_door':
        doorOpen = lerp(trig.from ?? Math.max(0.8, doorOpen), trig.to ?? trig.target ?? 0, ease(u));
        break;
      case 'open_gate':
        gateOpen = lerp(trig.from ?? gateOpen, trig.to ?? trig.target ?? 1, backOut(u, 1.25));
        if (t >= startT && t < startT + 0.7) {
          const gateAnchor = initialSet.anchors?.gate || { x: 880, y: 520 };
          shockwaves.push({ x: gateAnchor.x, y: gateAnchor.y, age: t - startT, u: (t - startT) / 0.7, color: '#9BE8FF' });
        }
        break;
      case 'toggle_lamp':
        lampLit = lerp(trig.from ?? lampLit, trig.to ?? trig.target ?? 1, ease(u));
        break;
      case 'pulse_lamp':
        if (t >= startT && t < startT + dur) {
          lampLit = clamp(lampLit + (trig.amount ?? 0.25) * Math.sin(u * Math.PI));
        }
        break;
      case 'tap_window':
      case 'window_ripple':
        if (t >= startT) windowImpactAt = startT;
        if (t >= startT && t < startT + 0.6) {
          const win = initialSet.anchors?.window || { x: 148, y: 236 };
          shockwaves.push({ x: win.x, y: win.y, age: t - startT, u: (t - startT) / 0.6, color: '#7FE6FA' });
        }
        break;
      case 'shake_desk':
      case 'slam_desk':
        if (t >= startT && t < startT + dur) {
          const age = t - startT;
          const amp = trig.amplitude ?? ((trig.intensity ?? 1) * 6);
          const wave = Math.sin(Math.max(0.18, age * 32));
          deskShake += Math.exp(-6 * age) * wave * amp;
          if (age < 0.55) {
            const deskAnchor = initialSet.anchors?.desk || { x: 640, topY: 482 };
            shockwaves.push({ x: deskAnchor.x, y: deskAnchor.topY ?? 482, age, u: age / 0.55, color: '#FFE099' });
          }
        }
        break;
      case 'pin_board':
      case 'pin_note':
        if (t >= startT) pinnedCount += trig.count ?? 1;
        break;
      case 'dawn_shift':
        dawn = lerp(trig.from ?? dawn, trig.to ?? trig.target ?? 1, ease(u));
        break;
      case 'splash_water':
        if (t >= startT && t < startT + 0.65) {
          shockwaves.push({
            x: trig.x ?? 640,
            y: trig.y ?? (initialSet.groundY || 600),
            age: t - startT,
            u: (t - startT) / 0.65,
            color: '#82E4FF',
          });
        }
        break;
      default:
        break;
    }
  }

  const focusX = actors.length
    ? actors.reduce((acc, a) => acc + (a.x || 640), 0) / actors.length
    : 640;

  // 用汇聚后的机关状态重新求解最终动态舞台
  const setState = resolveStageSet(baseSetSpec, t, {
    mood: shot.mood || 'work_cool',
    doorOpen,
    gateOpen,
    lampLit,
    dawn,
    deskShake,
    windowImpactAt,
    pinnedCount,
    focusX,
  });

  // D. 计算每个角色的地面动态投影、脚步涟漪/尘土与光源边缘高光
  const actorShadows = [];
  const surfaceRipples = [];
  const actorLighting = [];
  const isWetSurface = ['wet_deck', 'wet_stone', 'wet_pavement', 'sea_floor', 'indoor_sea'].includes(setState.surface);

  actors.forEach((actor, idx) => {
    if ((actor.opacity ?? 1) <= 0.02) {
      actorLighting.push({ rimLight: 0, rimColor: '#FFE5A3' });
      return;
    }
    const h = actor.assetId ? (actor.height || 340) : 10.4 * (actor.u ?? 38);
    const lift = clamp(actor.lift ?? 0, 0, 1);
    const groundY = actor.groundY ?? setState.groundY ?? 600;

    // 最近光源偏移计算（人物在灯右侧则影子偏右，跳起时影子缩小变淡）
    let shiftX = 0;
    let strongestRim = 0;
    let rimColor = '#FFE5A3';
    for (const ls of setState.lightSources || []) {
      const dist = Math.hypot(actor.x - ls.targetX, groundY - ls.targetY);
      const influence = clamp(1 - dist / Math.max(160, ls.radius * 1.35)) * (ls.intensity || 0.2);
      shiftX += clamp((actor.x - ls.x) * 0.08, -28, 28) * influence;
      if (influence > strongestRim) {
        strongestRim = influence;
        rimColor = ls.color || '#FFE5A3';
      }
    }

    const atten = 1 - Math.min(0.58, lift * 0.48);
    actorShadows.push({
      actorIndex: idx,
      x: actor.x + shiftX,
      y: groundY + 3,
      rx: Math.max(24, h * 0.19 * atten),
      ry: Math.max(5, h * 0.032 * atten),
      alpha: 0.24 * atten * (actor.opacity ?? 1),
    });
    actorLighting.push({ rimLight: clamp(strongestRim * 1.8, 0, 1), rimColor });

    for (const fc of actor.footContacts || []) {
      surfaceRipples.push({
        x: fc.x,
        y: groundY + 2,
        strength: fc.strength,
        wet: isWetSurface,
        phase: fc.phase || 0,
      });
    }
  });

  // E. 求解手部绑定道具 (heldProps / companionProps.attach)
  const boundProps = [];
  actors.forEach((actor, idx) => {
    if (!actor.heldProp) return;
    const specProp = typeof actor.heldProp === 'string' ? { propId: actor.heldProp } : actor.heldProp;
    // anchor: 'foot' 表示「钉子锚点」——直接以脚底原点 + 身高比例定位（伞这类与画中身体
    // 严格对位的道具必须这样挂，手势变化不会把道具带偏）。默认仍按 handAt 手部锚点。
    const hpx = actorPixelHeight(actor);
    const useFootAnchor = specProp.anchor === 'foot';
    const hand = useFootAnchor
      ? { x: actor.x, y: actor.y, angle: actor.lean || 0, calibrated: true }
      : handAt(actor, specProp.hand || 'right', specProp.hand === 'headTop' && !specProp.calibrated ? null : calibratedAnchors[idx]);
    // offsetX/offsetY 为像素绝对值；offsetXFrac/offsetYFrac 为身高比例（跨 Canvas/Remotion 后端一致）
    let pos = {
      x: hand.x + (specProp.offsetX || 0) + (specProp.offsetXFrac || 0) * hpx * (actor.flip ? -1 : 1),
      y: hand.y + (specProp.offsetY || 0) + (specProp.offsetYFrac || 0) * hpx,
    };
    let rot = hand.angle + (specProp.angleOffset || 0);

    // 支持角色双手之间的弧线交接（例如本鲸右手递给豆包左手）
    let holderIdx = idx;
    if (specProp.transfer) {
      const trAt = resolveAnchorTime(specProp.transfer, { cues, beatGrid, fallback: Infinity });
      const trDur = specProp.transfer.duration || 0.48;
      if (t >= trAt) {
        const targetIdx = typeof specProp.transfer.toActor === 'number'
          ? specProp.transfer.toActor
          : actors.findIndex((a) => a.name === specProp.transfer.toActor || a.assetId === specProp.transfer.toActor);
        if (targetIdx >= 0 && actors[targetIdx]) {
          const targetHand = handAt(actors[targetIdx], specProp.transfer.toHand || 'left', calibratedAnchors[targetIdx]);
          const u = seg(t, trAt, trAt + trDur);
          pos = arcBetween(hand, targetHand, specProp.transfer.arcHeight ?? 42, u);
          rot = lerp(rot, targetHand.angle, ease(u));
          if (u >= 1) holderIdx = targetIdx;
        }
      }
    }

    // 支持从手掌抛放到舞台锚点（例如手拿简历放到审稿桌上）
    if (specProp.placeToAnchor) {
      const placeAt = resolveAnchorTime(specProp.placeToAnchor, { cues, beatGrid, fallback: Infinity });
      const dur = specProp.placeToAnchor.duration || 0.48;
      if (t >= placeAt) {
        const targetAnchor = setState.anchors?.[specProp.placeToAnchor.anchor || 'desk'] || { x: 640, topY: 482 };
        const dest = {
          x: targetAnchor.x + (specProp.placeToAnchor.dx || 0),
          y: (targetAnchor.topY ?? targetAnchor.y ?? 500) + (specProp.placeToAnchor.dy || -14),
        };
        const u = seg(t, placeAt, placeAt + dur);
        pos = arcBetween(pos, dest, 46, u);
        rot = lerp(rot, 0, ease(u));
      }
    }

    boundProps.push({
      propId: specProp.propId || specProp.kind || 'paper_stack',
      kind: specProp.kind || specProp.propId || 'paper_stack',
      label: specProp.label || specProp.state?.title || '',
      x: pos.x,
      y: pos.y,
      rotation: rot,
      angle: rot,
      // scaleRef：以某个角色身高为基准按比例缩放，避免同款道具在小体型角色上过大。
      // 未声明时保持历史行为（纯绝对缩放）。
      scale: specProp.scaleRef
        ? (specProp.scale ?? 0.72) * (hpx / specProp.scaleRef)
        : (specProp.scale ?? 0.72),
      state: specProp.state || {},
      actorIndex: holderIdx,
    });
  });

  return {
    setState,
    anchors: setState.anchors,
    actorShadows,
    actorLighting,
    surfaceRipples,
    shockwaves,
    boundProps,
  };
}

/**
 * 在角色绘制前画动态地面接触阴影与脚步涟漪/尘土
 */
export function drawWorldFloorContactsCanvas(ctx, worldState) {
  ctx.save();
  for (const sh of worldState.actorShadows || []) {
    ctx.globalAlpha = sh.alpha;
    ctx.fillStyle = '#091528';
    ctx.beginPath();
    ctx.ellipse(sh.x, sh.y, sh.rx, sh.ry, 0, 0, TAU);
    ctx.fill();
  }
  for (const rp of worldState.surfaceRipples || []) {
    const expand = 1 + rp.phase * 2.2;
    ctx.globalAlpha = Math.max(0, 0.34 * rp.strength * (1 - rp.phase));
    if (rp.wet) {
      ctx.strokeStyle = '#8BE6F8';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(rp.x, rp.y, 18 * expand, 5 * expand, 0, 0, TAU);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#E8D8BE';
      for (let side of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(rp.x + side * 14 * expand, rp.y - 4 * expand, 4.5 * (1 - rp.phase * 0.5), 0, TAU);
        ctx.fill();
      }
    }
  }
  ctx.restore();
}

/**
 * 在前景层绘制冲击波环与手部绑定道具
 */
export function drawWorldForegroundFeedbackCanvas(ctx, worldState, t, drawPropById) {
  ctx.save();
  for (const pb of worldState.boundProps || []) {
    if (typeof drawPropById === 'function') {
      drawPropById(ctx, pb, t);
    }
  }
  for (const sw of worldState.shockwaves || []) {
    const r = 14 + easeOut(sw.u) * 74;
    ctx.globalAlpha = (1 - sw.u) * 0.58;
    ctx.strokeStyle = sw.color || '#FFE099';
    ctx.lineWidth = 2.6 * (1 - sw.u * 0.6);
    ctx.beginPath();
    ctx.arc(sw.x, sw.y, r, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}
