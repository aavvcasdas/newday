// Discrete, deterministic held-key animation: each action has independently
// timed poses, rather than translating a whole illustration on every beat.
// Original animation curves; no frames or code copied from the reference Pet.
export const ACTIONS = {
  wave: { ms: [150, 120, 120, 150, 170, 220], key: [-0.24, -0.08, 0.18, 0.31, 0.05, -0.16] },
  walk: { ms: [140, 110, 140, 140, 110, 140], key: [-1, -0.5, 0, 1, 0.5, 0] },
  dance: { ms: [180, 150, 150, 180, 150, 190], key: [-1, -0.55, 0.2, 1, 0.55, -0.2] },
  present: { ms: [220, 180, 180, 230, 230], key: [-0.2, 0.25, 0.65, 0.3, 0] },
  idle: { ms: [280, 190, 180, 260], key: [-0.35, 0, 0.35, 0] },
  float: { ms: [180, 180, 200, 180, 180, 200], key: [-1, -0.5, 0.4, 1, 0.5, -0.4] },
};

export function actionFrame(t, action, offset = 0) {
  const spec = ACTIONS[action];
  if (!spec) throw new Error(`Unknown action ${action}`);
  const duration = spec.ms.reduce((sum, ms) => sum + ms, 0);
  let elapsed = (((t * 1000 + offset * 1000) % duration) + duration) % duration;
  for (let i = 0; i < spec.ms.length; i++) {
    if (elapsed < spec.ms[i]) return { index: i, value: spec.key[i] };
    elapsed -= spec.ms[i];
  }
  throw new Error('Unreachable action frame');
}

// Shot-specific actions; actors are deliberately not assigned one universal bounce.
export function actionForShot(index, actor, lane = 0) {
  const wave = [1, 3, 5, 7, 8, 20, 21, 23, 29, 32];
  const walk = [2, 6, 9, 13, 17, 27];
  const present = [10, 11, 15, 16, 18, 19, 26, 28, 30];
  const dance = [22, 31];
  if (index === 25 || index === 26) return 'float';
  if (dance.includes(index)) return 'dance';
  if (walk.includes(index)) return lane % 3 === 2 ? 'wave' : 'walk';
  if (present.includes(index)) return lane % 3 === 1 ? 'wave' : 'present';
  if (wave.includes(index)) return lane % 3 === 1 ? 'present' : 'wave';
  return 'idle';
}
