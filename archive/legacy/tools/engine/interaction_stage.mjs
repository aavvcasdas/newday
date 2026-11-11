// interaction_stage.mjs — 引擎层词点接触演出
// drop_bonk / slap_deflect 仍交给共享 cue_props_engine（不改其导出）。
// tug_grab / knock_bowl / unroll_scroll / sink_drop / mark_strike / handoff
// 在本文件用真实手掌锚点编排：接触点在物体边缘，落点有承重桌，
// 碰撞后两帧由调用方冻结人物与道具。不按身高估手掌。
import { CORE, smooth, mix, clamp01, drawForegroundTable } from './room_base.mjs';
import { getProp, PROP_REGISTRY } from './prop_registry.mjs';
import { burst, renderCueInteraction } from '../互动元素/cue_props_engine.mjs';
import { drawContactActor } from '../互动元素/actor_contacts.mjs';

const { inkLine, ellPts, paint, ring } = CORE;
export const FPS = 30;
export const BODY_VERBS = new Set(['tug_grab', 'knock_bowl', 'sink_drop', 'handoff', 'unroll_scroll', 'drop_bonk', 'slap_deflect']);
const DELEGATED = new Set(['drop_bonk', 'slap_deflect']);

function lerp(a, b, p) {
  return [mix(a[0], b[0], p), mix(a[1], b[1], p)];
}

function handOf(anchors, preferFinger = false) {
  if (!anchors) return null;
  if (preferFinger && anchors.fingerR) return anchors.fingerR;
  return anchors.handR || anchors.handL || anchors.fingerR || null;
}

function coverPalm(ctx, actor, hand) {
  if (!actor || !hand) return;
  ctx.save();
  ctx.beginPath();
  ctx.arc(hand[0], hand[1], 18, 0, Math.PI * 2);
  ctx.clip();
  drawContactActor(ctx, actor);
  ctx.restore();
}

/** 只在手与道具真正靠近时连线，避免长线横穿脸、字和另一条鱼。 */
function linkIfClose(ctx, from, to, width, color, id, maxDist = 150) {
  if (!from || !to) return false;
  if (Math.hypot(from[0] - to[0], from[1] - to[1]) > maxDist) return false;
  inkLine(ctx, [from, to], width, color, id, 0);
  return true;
}

function drawPropAt(ctx, propId, x, y, scale, state, t) {
  const prop = getProp(propId);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  prop.draw(ctx, t, state || {});
  ctx.restore();
}

/** 前景承重桌：桌面对齐道具下沿，桌腿止于 y<=600。 */
function drawBearing(ctx, x, surfaceY, w = 148) {
  const top = Math.min(surfaceY, 540);
  if (top + 58 > 600) return;
  drawForegroundTable(ctx, x - w / 2, top, w);
}

function propState(ev) {
  const p = ev.params || {};
  return { title: p.title || ev.title, sub: p.sub || ev.sub, text: p.text || ev.text, open: p.open };
}

export function drawShotInteractions(ctx, { frame, t, shot, events, actors, anchors }) {
  const mine = (events || []).filter((e) => e.shotId === shot.id && frame >= e.startFrame && frame <= e.endFrame + 2);
  for (const ev of mine) {
    if (DELEGATED.has(ev.verb)) {
      const ai = ev.actor ?? (ev.verb === 'slap_deflect' ? 1 : 0);
      const contact = anchors[ai];
      if (!contact) continue;
      // 词点落在镜头起点时，共享模块要求 start < contact；只把传给它的帧号错开 1，不改对外词点。
      const safe = { ...ev };
      if (safe.startFrame >= safe.contactFrame) safe.startFrame = Math.max(0, safe.contactFrame - 1);
      if (safe.endFrame <= safe.contactFrame) safe.endFrame = safe.contactFrame + 8;
      if (safe.startFrame >= safe.contactFrame) continue;
      renderCueInteraction(ctx, frame, safe, { contact, current: contact }, PROP_REGISTRY);
      continue;
    }
    if (ev.verb === 'tug_grab') drawTug(ctx, frame, t, ev, actors, anchors);
    else if (ev.verb === 'unroll_scroll') drawUnroll(ctx, frame, t, ev, actors, anchors);
    else if (ev.verb === 'knock_bowl') drawKnock(ctx, frame, t, ev, actors, anchors);
    else if (ev.verb === 'sink_drop') drawSink(ctx, frame, t, ev, actors, anchors);
    else if (ev.verb === 'mark_strike') drawStrike(ctx, frame, t, ev, actors, anchors);
    else if (ev.verb === 'handoff') drawHandoff(ctx, frame, t, ev, actors, anchors);
  }
}

function restAt(ev) {
  return ev.at || ev.params?.at || ev.params?.land || ev.land;
}

function drawTug(ctx, frame, t, ev, actors, anchors) {
  const at = restAt(ev);
  if (!at) return;
  const scale = ev.params?.scale ?? ev.scale ?? 0.92;
  const ai = ev.actor ?? 1;
  const other = ai === 0 ? 1 : 0;
  const aHand = handOf(anchors[ai]);
  const bHand = handOf(anchors[other]);
  const prep = ev.contactFrame - 10;
  let x = at[0];
  let y = at[1];
  let rot = 0;
  if (frame < prep) {
    rot = Math.sin(frame * 0.7) * 0.06;
  } else if (frame <= ev.contactFrame && aHand && bHand) {
    const q = clamp01((frame - prep) / Math.max(1, ev.contactFrame - prep));
    const mid = lerp(aHand, bHand, 0.5 + Math.sin(q * Math.PI * 3) * 0.08);
    const p = smooth(q);
    x = mix(at[0], mid[0], p * 0.55);
    y = mix(at[1], mid[1], p * 0.35);
    rot = Math.sin(q * Math.PI) * 0.18;
  } else {
    const q = smooth((frame - ev.contactFrame) / 8);
    x = at[0];
    y = at[1] + (1 - q) * -6;
  }
  drawBearing(ctx, at[0], at[1] + 42 * scale, 160);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  drawPropAt(ctx, ev.propId, 0, 0, scale, { ...propState(ev), open: frame >= ev.contactFrame ? 1 : 0.35 }, t);
  ctx.restore();
  const edge = [x + 54 * scale, y];
  if (linkIfClose(ctx, edge, aHand, 2.2, '#80684B', 'tug-grip')) coverPalm(ctx, actors[ai], aHand);
  if (frame >= ev.contactFrame) burst(ctx, x, y - 20, (frame - ev.contactFrame) / FPS);
}

function drawUnroll(ctx, frame, t, ev, actors, anchors) {
  const at = restAt(ev);
  if (!at) return;
  const scale = ev.params?.scale ?? ev.scale ?? 1;
  const open = frame >= ev.contactFrame ? 1 : 0.22 + 0.78 * smooth((frame - ev.startFrame) / Math.max(1, ev.contactFrame - ev.startFrame));
  const ai = ev.actor ?? 1;
  const hand = handOf(anchors[ai]);
  drawBearing(ctx, at[0], at[1] + 42 * scale, 180);
  drawPropAt(ctx, ev.propId, at[0], at[1], scale, { ...propState(ev), open }, t);
  const edge = [at[0] + (40 + 50 * open) * scale, at[1]];
  if (linkIfClose(ctx, edge, hand, 2.2, '#80684B', 'unroll-grip')) coverPalm(ctx, actors[ai], hand);
  if (frame >= ev.contactFrame && frame < ev.contactFrame + 8) burst(ctx, at[0], at[1] - 24, (frame - ev.contactFrame) / FPS);
}

function drawKnock(ctx, frame, t, ev, actors, anchors) {
  const at = restAt(ev);
  if (!at) return;
  const scale = ev.params?.scale ?? ev.scale ?? 0.9;
  const ai = ev.actor ?? 0;
  const hand = handOf(anchors[ai], true);
  const rim = [at[0] + 18 * scale, at[1] - 8 * scale];
  const age = (frame - ev.contactFrame) / FPS;
  const wobble = frame >= ev.contactFrame ? ring(age, 0.08, 3, 7) : 0;
  drawBearing(ctx, at[0], at[1] + 28 * scale, 150);
  ctx.save();
  ctx.translate(at[0], at[1] + 22 * scale);
  ctx.rotate(wobble);
  ctx.translate(0, -22 * scale);
  drawPropAt(ctx, ev.propId, 0, 0, scale, { ...propState(ev), hit: frame >= ev.contactFrame, age }, t);
  ctx.restore();
  if (hand && Math.hypot(hand[0] - rim[0], hand[1] - rim[1]) <= 160) {
    const q = frame <= ev.contactFrame
      ? smooth((frame - (ev.contactFrame - 12)) / 12)
      : 1 - smooth((frame - ev.contactFrame) / 8) * 0.35;
    const tip = lerp(hand, rim, clamp01(q));
    inkLine(ctx, [hand, tip], 3.2, '#E5DBBC', 'spoon', 0);
    paint(ctx, ellPts(tip[0], tip[1], 5, 3, 12, 0), { wash: '#DEDCCA', ink: '#655B50', sw: 1 });
    coverPalm(ctx, actors[ai], hand);
  }
  if (frame >= ev.contactFrame) burst(ctx, rim[0], rim[1], age);
}

function drawSink(ctx, frame, t, ev, actors, anchors) {
  const land = ev.land || ev.params?.land || ev.at;
  if (!land) return;
  const scale = ev.params?.scale ?? ev.scale ?? 0.95;
  const fallStart = ev.contactFrame - 10;
  const hold = [land[0], land[1] - 28];
  let pos = hold;
  let squash = 0;
  if (frame < fallStart) pos = [land[0] + Math.sin(frame * 0.4) * 4, hold[1]];
  else if (frame <= ev.contactFrame) {
    const q = clamp01((frame - fallStart) / Math.max(1, ev.contactFrame - fallStart));
    const g = q * q;
    pos = lerp(hold, land, g);
  } else {
    const q = smooth((frame - ev.contactFrame) / 7);
    pos = [land[0], land[1] - (1 - q) * 8];
    squash = (1 - q) * 0.2;
  }
  drawBearing(ctx, land[0], land[1] + 36 * scale, 170);
  ctx.save();
  ctx.translate(pos[0], pos[1]);
  ctx.scale(scale * (1 + squash), scale * (1 - squash));
  getProp(ev.propId).draw(ctx, t, { ...propState(ev), open: frame >= ev.contactFrame ? 0.85 : 0.4 });
  ctx.restore();
  if (frame >= ev.contactFrame) burst(ctx, land[0], land[1] - 10, (frame - ev.contactFrame) / FPS);
}

function drawStrike(ctx, frame, t, ev, actors, anchors) {
  const at = restAt(ev) || [640, 150];
  const slot = ev.slot ?? ev.params?.slot ?? 0;
  const span = ev.span || ev.params?.span || 'full';
  // 默认一条全宽线划在板子下半行。分栏时各划各的，避免三条全宽线叠成一块。
  let y = at[1] + 6 + slot * 16;
  let x0 = at[0] - 96;
  let x1 = at[0] + 96;
  if (span === 'left' || span === 'right') {
    y = at[1] + 22 + (slot >= 2 ? 18 : 0);
    if (span === 'left') { x0 = at[0] - 120; x1 = at[0] - 14; }
    else { x0 = at[0] + 14; x1 = at[0] + 120; }
  }
  if (frame < ev.contactFrame) return;
  const grow = clamp01((frame - ev.contactFrame) / 7);
  const x = mix(x0, x1, grow);
  inkLine(ctx, [[x0, y - 5], [x, y + 5]], 3.4, '#B85E70', 'strike', 0);
  if (frame < ev.contactFrame + 6) burst(ctx, x, y, (frame - ev.contactFrame) / FPS);
}

function drawHandoff(ctx, frame, t, ev, actors, anchors) {
  const at = restAt(ev);
  if (!at) return;
  const scale = ev.params?.scale ?? ev.scale ?? 0.9;
  const fromI = ev.actor ?? 1;
  const toI = ev.toActor ?? ev.params?.toActor ?? 0;
  const fromH = handOf(anchors[fromI]) || at;
  const toH = handOf(anchors[toI]) || at;
  const leave = ev.contactFrame - 8;
  const arrive = ev.contactFrame + 8;
  let pos = fromH;
  if (frame < leave) pos = lerp(at, fromH, 0.35);
  else if (frame <= arrive) pos = lerp(fromH, toH, smooth((frame - leave) / Math.max(1, arrive - leave)));
  else pos = lerp(toH, at, smooth((frame - arrive) / 8));
  drawBearing(ctx, at[0], at[1] + 40 * scale, 160);
  drawPropAt(ctx, ev.propId, pos[0], pos[1], scale, { ...propState(ev), open: 0.8 }, t);
  const giver = frame < ev.contactFrame ? fromH : toH;
  const who = frame < ev.contactFrame ? actors[fromI] : actors[toI];
  if (linkIfClose(ctx, pos, giver, 2.2, '#80684B', 'handoff-grip', 88)) coverPalm(ctx, who, giver);
  if (frame >= ev.contactFrame && frame < ev.contactFrame + 8) burst(ctx, pos[0], pos[1] - 16, (frame - ev.contactFrame) / FPS);
}
