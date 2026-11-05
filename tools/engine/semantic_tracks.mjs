// Explicit semantic object tracks; all times supplied by acoustic-word bindings, never ambient oscillation.
import { drawText, smooth, mix } from './room_base.mjs';
import { getProp } from './prop_registry.mjs';

export function validateSemanticTracks(tracks, where = 'semanticTracks') {
  if (!Array.isArray(tracks)) throw new Error(`${where}须为数组`);
  const ids = new Set();
  for (const t of tracks) {
    if (!t.id || ids.has(t.id)) throw new Error(`${where}重复/缺少道具id`); ids.add(t.id);
    if (!['sheet', 'tag', 'bowl', 'prop'].includes(t.kind)) throw new Error(`${where}未知语义道具类型`);
    if (![t.x, t.y, t.from, t.to].every(Number.isFinite) || t.to <= t.from) throw new Error(`${where}坐标/生命周期无效`);
    if (t.kind === 'prop') getProp(t.propId);
    if (t.kind !== 'bowl' && (![t.w, t.h].every(Number.isFinite) || t.w <= 0 || t.h <= 0)) throw new Error(`${where}纸张尺寸无效`);
    if (t.y + (t.kind === 'bowl' ? 28 : t.h / 2) > 600) throw new Error(`${where}道具侵入字幕空间`);
    for (const s of t.states || []) if (!Number.isFinite(s.at)) throw new Error(`${where}状态缺实际词时`);
    for (const m of t.marks || []) if (!Number.isFinite(m.at) || !['strike', 'circle', 'cross'].includes(m.type)) throw new Error(`${where}划线/圈记配置无效`);
    for (const m of t.moves || []) if (![m.at, m.duration, m.x, m.y ?? t.y].every(Number.isFinite) || m.duration <= 0) throw new Error(`${where}移动参数无效`);
  }
}
export function semanticStateAt(track, time) {
  if (time < track.from || time >= track.to) return null;
  let state = { ...(track.state || {}) }, x = track.x, y = track.y;
  for (const s of track.states || []) if (time >= s.at) state = { ...state, ...s.state };
  for (const move of track.moves || []) {
    if (time < move.at) break;
    const p = smooth((time - move.at) / move.duration);
    x = mix(x, move.x, p); y = mix(y, move.y ?? y, p);
  }
  let scaleX = 1;
  for (const flip of track.flips || []) {
    const age = time - flip.at;
    if (age >= 0 && age < flip.duration) scaleX = Math.max(.045, Math.abs(Math.cos(Math.PI * age / flip.duration)));
  }
  return { id: track.id, kind: track.kind, x, y, w: track.w, h: track.h, state, scaleX,
    marks: (track.marks || []).filter((m) => time >= m.at).map((m) => ({ ...m, progress: smooth((time - m.at) / (m.duration || .16)) })) };
}
function box(g, x, y, w, h, fill, stroke) {
  g.beginPath();g.roundRect(x, y, w, h, 8);g.fillStyle = fill;g.fill();g.lineWidth = 2;g.strokeStyle = stroke;g.stroke();
}
function fittedText(g, text, x, y, preferred, width, color) {
  let size = preferred;
  while (size > 12) { g.font = `800 ${size}px NotoSansSC`; if (g.measureText(text).width < width) break; size--; }
  drawText(g, text, x, y, size, color);
}
export function drawSemanticTracks(g, time, tracks) {
  const drawn = [];
  for (const track of tracks || []) {
    const s = semanticStateAt(track, time); if (!s) continue;
    drawn.push(s);g.save();g.translate(s.x, s.y);g.scale(s.scaleX, 1);
    if (track.kind === 'bowl' || track.kind === 'prop') { getProp(track.propId || 'empty_bowl').draw(g, time, s.state);g.restore();continue; }
    const paper = track.kind === 'sheet', state = s.state;
    box(g, -track.w / 2, -track.h / 2, track.w, track.h, state.fill || (paper ? '#EEE4C8' : '#DCE9E7'), state.stroke || '#536779');
    if (paper) {
      g.strokeStyle = '#D4C9AF';g.lineWidth = 1;g.beginPath();g.moveTo(-track.w / 2 + 13, -track.h / 2 + 8);g.lineTo(-track.w / 2 + 13, track.h / 2 - 8);g.stroke();
    }
    const rows = state.rows || [];
    const titleY = rows.length ? -track.h / 2 + 26 : 1;
    fittedText(g, state.title || '', 0, titleY, state.titleSize || 24, track.w - 30, state.color || '#304559');
    const rowStart = state.rowStart ?? (-track.h / 2 + 65);
    const rowGap = state.rowGap ?? 30;
    rows.forEach((row, i) => fittedText(g, row, 0, rowStart + i * rowGap, state.rowSize || 21, track.w - 34, '#4E5E66'));
    for (const mark of s.marks) {
      const yy = mark.row == null ? 0 : rowStart + mark.row * rowGap;
      const width = mark.width || track.w - 46;
      g.save();g.strokeStyle = mark.color || '#B3393D';g.lineWidth = 3;g.lineCap = 'round';g.beginPath();
      if (mark.type === 'strike') { g.moveTo(-width / 2, yy);g.lineTo(-width / 2 + width * mark.progress, yy); }
      if (mark.type === 'circle') g.ellipse(0, yy, width / 2, 17, -.04, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * mark.progress);
      if (mark.type === 'cross') { const d = 17 * mark.progress;g.moveTo(-d, yy - d);g.lineTo(d, yy + d);g.moveTo(-d, yy + d);g.lineTo(d, yy - d); }
      g.stroke();g.restore();
    }
    g.restore();
  }
  return drawn;
}
