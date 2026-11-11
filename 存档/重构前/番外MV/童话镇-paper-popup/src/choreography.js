// Action-to-pose mapping for the paper-cutout cast.
// Locomotion is carried by the boat, props, and page staging; human figures stay in a readable key pose
// instead of cycling a low-frame-count walk loop that makes their feet jitter.
const LOCOMOTION = /run|track|walk|travel|approach|procession|converge|lead|fleet|escape/;

export function sectionPose(action, role) {
  const s = String(action).toLowerCase();
  if (/sleep/.test(s) && role === 'claude') return ['sleep', 'sleep'];
  // All paper-cut performers remain upright and planted. Scenery, boats, and props carry motion.
  if (LOCOMOTION.test(s) || /dance|twirl|swim|river|mermaid|foam|waterfall|dive|jump|glide|orbit|rise|leap|fly/.test(s)) return ['idle', role === 'doubao' ? 'worried' : 'happy'];
  if (/point|draw|sketch/.test(s)) return ['point', 'happy'];
  if (/handoff|pass|receive|deliver|shield|hold|open|pull|catch|place|climb|harp|shoe|candy|puppet|chest|star|sunlight|turn|meet/.test(s)) return ['reach', 'happy'];
  return ['idle', 'happy'];
}
