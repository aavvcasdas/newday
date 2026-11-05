// 只审查规划结构与当前台词绑定。不会制造音频轴、生成占位成片或宣称视觉通过。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { validateSpec } from './schema_validator.mjs';
import { POSES } from '../day3制作/whale_girl_src/whale_poses.mjs';

export function checkStoryboard(spec, script) {
  const lines = script.trim().split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  if (spec.directorVersion !== 1) throw new Error('请显式声明directorVersion=1，不能把旧密度门禁冒充导演检查');
  if (!spec.sourceScriptSha256 || spec.sourceScriptSha256 !== createHash('sha256').update(script).digest('hex')) throw new Error('分镜台词SHA256不匹配');
  validateSpec(spec, { cueCount: lines.length, cues: lines.map((text) => ({ text })) });
  const plans = [spec.opener.actorA, spec.opener.actorB, ...spec.shots.flatMap((s) => s.actors || s.actorsPlan || [])];
  const poses = [...new Set(plans.flatMap((a) => [a.pose || 'idle', ...(a.poses || []).map((p) => p.pose), ...(a.poseChanges || []).map((p) => p.pose)]))];
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const missingAssets = poses.map((p) => `tools/day3制作/whale_girl_src/${POSES[p].file}`).filter((p) => !fs.existsSync(path.join(root, p)));
  return {
    check: 'planning_structure_only', passed: true, measured: false, visualApproved: false, productionReady: false,
    sourceScriptSha256: spec.sourceScriptSha256, lines: lines.length, shots: spec.shots.length,
    framings: spec.shots.map((s) => ({ id: s.id, framing: s.framing, cameraMove: s.push || s.pushes?.length ? 'explicit_once' : 'locked' })),
    missingAssets, blockers: [...(spec.pending || []), '结构检查未提供/核验实测音频、词级时间、动态观影或最终视频'],
  };
}

export async function main(argv = process.argv.slice(2)) {
  const arg = (name) => { const i = argv.indexOf(name); return i < 0 ? null : argv[i + 1]; };
  const file = arg('--spec'); const script = arg('--script');
  if (!file || !script) throw new Error('用法：--spec <episode.spec.mjs> --script <当前口播.txt> [--report <json>]');
  const mod = await import(pathToFileURL(path.resolve(file)).href);
  const report = checkStoryboard(mod.default, fs.readFileSync(script, 'utf8'));
  if (arg('--report')) fs.writeFileSync(arg('--report'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  return report;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
