// Pure time transforms shared by the browser and regression tests.
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export function sourceTime(local, model) {
  return model.start + clamp(local, 0, model.duration);
}
export function localTime(source, model) {
  return clamp(source - model.start, 0, model.duration);
}
export function videoTime(source, mode, model) {
  return mode === 'sample' ? localTime(source, model) : clamp(source, model.start, model.end);
}
export function canReview(cue, model) {
  return cue.implemented && cue.start >= model.start && cue.end <= model.end + 1e-6;
}
export function stepTime(current, frames, mode, model) {
  const min = mode === 'sample' ? 0 : model.start;
  const max = mode === 'sample' ? model.duration : model.end;
  // Half a frame inside each frame is more reliable for media decoder seeking.
  const frame = Math.floor((current - min) * model.fps + 1e-5) + frames;
  return clamp(min + (frame + 0.5) / model.fps, min + 0.5 / model.fps, max - 0.5 / model.fps);
}
export function activeItem(items, time) {
  return items.find(item => time >= item.start && time < item.end);
}
export function timeLabel(time) {
  const safe = Math.max(0, Number.isFinite(time) ? time : 0);
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${(safe % 60).toFixed(2).padStart(5, '0')}`;
}
