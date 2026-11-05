// 稳定景别与单次显式运镜。纯数值模块，不取整坐标、不依赖画布/音频。
export const CAMERA_PRESETS = Object.freeze(Object.fromEntries(Object.entries({
  wide: { z: 1.02, cx: 640, cy: 378 },
  two_shot: { z: 1.12, cx: 640, cy: 390 },
  medium_left: { z: 1.30, cx: 470, cy: 390 },
  medium_right: { z: 1.30, cx: 810, cy: 390 },
  close_left: { z: 1.55, cx: 470, cy: 380 },
  close_right: { z: 1.55, cx: 810, cy: 380 },
  insert_center: { z: 1.72, cx: 640, cy: 445 },
}).map(([key, value]) => [key, Object.freeze(value)])));

export function ambientCamera(_t, base) { return { ...base }; }

export function validateCameraPlan(shot) {
  if (shot.framing != null && !Object.hasOwn(CAMERA_PRESETS, shot.framing)) throw new Error(`未知景别 ${shot.framing}`);
  if (shot.camera != null && (typeof shot.camera !== 'object' || Array.isArray(shot.camera))) throw new Error('camera 必须为固定坐标对象');
  for (const [key, value] of Object.entries(shot.camera || {})) {
    if (!['z', 'cx', 'cy'].includes(key) || !Number.isFinite(value)) throw new Error(`camera.${key} 无效`);
    if (key === 'z' && value <= 0) throw new Error('camera.z 必须为正数');
  }
  if (shot.push && shot.pushes) throw new Error('每镜只能声明一次主运镜，不同时使用 push/pushes');
  if (shot.pushes != null && !Array.isArray(shot.pushes)) throw new Error('pushes 必须为数组');
  const moves = shot.pushes || (shot.push ? [shot.push] : []);
  if (moves.length > 1) throw new Error('每镜只允许一个主运镜，禁止连续推拉叠加');
  for (const move of moves) {
    if (!move || typeof move !== 'object') throw new Error('push 必须为对象');
    if (Object.keys(move).some((key) => !['line', 'at', 'duration', 'z', 'cx', 'cy'].includes(key))) throw new Error('push 含未实现运镜字段');
    if (!['z', 'cx', 'cy'].some((key) => move[key] != null)) throw new Error('push 必须指定推拉/平移终点');
    if (!Number.isFinite(move.duration) || move.duration <= 0) throw new Error('push.duration 必须为正数');
    if (move.at != null && !Number.isFinite(move.at)) throw new Error('push.at 必须为有限秒数');
    if (move.line != null && (!Number.isInteger(move.line) || move.line < shot.fromLine || move.line > shot.toLine)) throw new Error('push.line 必须位于本镜');
    if (move.at != null && move.line != null) throw new Error('push 不可同时用 at 与 line 定位');
    for (const key of ['z', 'cx', 'cy']) if (move[key] != null && (!Number.isFinite(move[key]) || (key === 'z' && move[key] <= 0))) throw new Error(`push.${key} 无效`);
  }
  return true;
}

/** 固定机位，无开场隐式三段推拉。push 可推近、拉远或平移，完成后保持终点。 */
export function cameraFor(shot, t, cues = []) {
  const base = { ...(CAMERA_PRESETS[shot.framing] || { z: 1.08, cx: 640, cy: 378 }), ...(shot.camera || {}) };
  const move = shot.push || shot.pushes?.[0];
  if (!move) return ambientCamera(t, base);
  const start = move.line != null ? cues[move.line - 1]?.start : (move.at ?? shot.start);
  if (!Number.isFinite(start)) throw new Error('显式运镜缺少已绑定的起点');
  const q = Math.max(0, Math.min(1, (t - start) / move.duration));
  const p = q * q * (3 - 2 * q);
  const mix = (a, b) => a + (b - a) * p;
  return { z: mix(base.z, move.z ?? base.z), cx: mix(base.cx, move.cx ?? base.cx), cy: mix(base.cy, move.cy ?? base.cy) };
}
