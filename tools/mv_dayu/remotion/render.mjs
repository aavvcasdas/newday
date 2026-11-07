// render.mjs — 委托通用 tools/remotion-engine/render_cli.mjs 按 mv.spec.mjs 动态渲染
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { main as runRemotionCli } from '../../remotion-engine/render_cli.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SPEC_PATH = path.resolve(HERE, '../mv.spec.mjs');

const extraArgs = process.argv.slice(2);
const defaultOut = path.resolve(HERE, '../../../番外MV/我怀疑大禹治水/我怀疑大禹治水_歌词MV.mp4');
const hasModeOrCheck = extraArgs.some((a) => ['--dry-run', '--bundle-check', '--out'].includes(a));

await runRemotionCli([
  '--mode',
  'mv',
  '--spec',
  SPEC_PATH,
  ...(hasModeOrCheck ? extraArgs : ['--out', defaultOut, ...extraArgs]),
]);
