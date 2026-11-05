// Day11 薄封装入口：仅绑定当集 spec，透传其余全部 CLI 参数给通用引擎。
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const engine = path.resolve(here, '../engine/render_episode.mjs');
const spec = path.join(here, 'episode.spec.mjs');
const r = spawnSync('node', [engine, '--spec', spec, ...process.argv.slice(2)], { stdio: 'inherit' });
process.exit(r.status ?? 1);
