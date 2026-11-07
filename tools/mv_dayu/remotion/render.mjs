// render.mjs — 委托通用 tools/remotion-engine/render_cli.mjs 按 mv.spec.mjs 动态渲染《我怀疑大禹治水》MV
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { main as runRemotionCli } from '../../remotion-engine/render_cli.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '../../..');
const SPEC_PATH = path.resolve(HERE, '../mv.spec.mjs');

const extraArgs = process.argv.slice(2);
const defaultOut = path.resolve(REPO_ROOT, '番外MV/我怀疑大禹治水/样片/Remotion_动态引擎重做_待审.mp4');
const defaultAudio = path.resolve(REPO_ROOT, '我怀疑大禹治水治没了我的薪水.mp3');
const hasModeOrCheck = extraArgs.some((a) => ['--dry-run', '--bundle-check', '--out', '--still-frames', '--still-frame'].includes(a));
const hasMux = extraArgs.includes('--mux-audio');

await runRemotionCli([
  '--mode',
  'mv',
  '--spec',
  SPEC_PATH,
  ...(!hasMux && !extraArgs.includes('--dry-run') && !extraArgs.includes('--bundle-check') ? ['--mux-audio', defaultAudio] : []),
  ...(hasModeOrCheck ? extraArgs : ['--out', defaultOut, ...extraArgs]),
]);
