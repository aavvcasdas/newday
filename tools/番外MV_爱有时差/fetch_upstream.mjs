// Fetch the actual upstream character art the user named, at pinned commits.
// Sources (user-directed):
//   shuaizenge/ai-girls            doubao generated fullbody reference
//   JAdpp/dsh-whale-galgame        whale-girl expression sprites (CC BY-NC-SA 4.0 chain)
//   xiaosia/voxel-mv               relay AI-girl animation frames (rights unverified upstream;
//                                  used only for this non-commercial fan MV, see NOTICE.md)
// Downloads land in assets/upstream/ (gitignored) and are verified by git blob sha1.
// A manifest with sha256 is written to data/upstream_manifest.json (committed).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const pexec = promisify(execFile);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'assets/upstream');

const REPOS = {
  'ai-girls': { repo: 'shuaizenge/ai-girls', commit: 'dcd69f5f4f2dff1a9c0031e82deb49e0fe949c76' },
  'galgame': { repo: 'JAdpp/dsh-whale-galgame', commit: '0ec130efebf15ffb63a2733b909d423b769db9c5' },
  'voxel-mv': { repo: 'xiaosia/voxel-mv', commit: '0caefec6c40ddca779ed498629069ac51dcb00a5' },
  // v4: real transparent pet atlases (9 animation states + 16 look poses each).
  // Art rights are unresolved upstream; MIT covers docs/layout metadata only.
  'pets': { repo: 'tqlearning/ai-girl-chatgpt-pets', commit: '3afe14603b40e24c75e87e097cbfee1bfc10290d' },
};

// Curated animation sets per relay girl (enough for every shot, no typing bulk).
const VOXEL = {
  deepseek: ['idle', 'walk_side', 'pray', 'reach_out', 'look_up', 'laugh', 'wave_bye', 'hold_look', 'pick_up', 'stream_heart'],
  claude: ['idle', 'walk_side', 'reach_out', 'pray', 'laugh', 'look_up', 'wave_bye', 'hold_look'],
  gemini: ['idle', 'walk_side', 'reach_out', 'look_up', 'laugh', 'wave_bye', 'hold_look'],
  gpt: ['idle', 'walk_side', 'pick_up', 'laugh', 'look_up', 'wave_bye', 'reach_out', 'hold_look'],
  kimi: ['idle', 'walk_side', 'sit_idle', 'pray', 'laugh', 'look_up', 'wave_bye', 'hold_look'],
  qwen: ['idle', 'walk_side', 'pick_up', 'laugh', 'look_up', 'wave_bye', 'reach_out', 'hold_look'],
  zai: ['idle', 'walk_side', 'cry', 'reach_out', 'laugh', 'look_up', 'wave_bye', 'hold_look'],
};
const FRAME_COUNT = { walk_side: 8, run_side: 8 };
const GALGAME_WHALE = ['cheerful', 'shy', 'serious', 'confused', 'angry', 'frightened', 'exasperated', 'starry'];
// v3 primary form: ai-girls author-video chibi frames (Q版小AI), not voxel standees.
const AI_GIRLS_CHIBI = {
  deepseek: 'characters/deepseek/chibi/zipzippipe-BV1tE9XBbErS-05s.png',
  claude: 'characters/claude/chibi/zipzippipe-BV1tE9XBbErS-17s.png',
  gemini: 'characters/gemini/chibi/zipzippipe-BV1tE9XBbErS-11s.png',
  gpt: 'characters/gpt/chibi/zipzippipe-BV1tE9XBbErS-23s.png',
  kimi: 'characters/kimi/chibi/zipzippipe-BV1tE9XBbErS-41s.png',
  qwen: 'characters/qwen/chibi/zipzippipe-BV1tE9XBbErS-53s.png',
  glm: 'characters/glm/chibi/zipzippipe-BV1tE9XBbErS-35s.png',
};

function wantedFiles() {
  const files = [];
  for (const [c, anims] of Object.entries(VOXEL)) {
    files.push(['voxel-mv', `characters/${c}/frames.json`]);
    files.push(['voxel-mv', `characters/${c}/character.md`]);
    for (const a of anims) {
      const n = FRAME_COUNT[a] || 4;
      for (let i = 1; i <= n; i++) files.push(['voxel-mv', `characters/${c}/frames/${a}/${String(i).padStart(2, '0')}.png`]);
    }
  }
  files.push(['voxel-mv', 'characters/身高校正.json'], ['voxel-mv', 'characters/bad_frames.json'], ['voxel-mv', 'characters/README.md'], ['voxel-mv', 'THIRD_PARTY_NOTICES.md']);
  for (const e of GALGAME_WHALE) files.push(['galgame', `assets/default/whale-${e}.webp`]);
  files.push(['galgame', 'assets/default/maid-left.webp']);
  files.push(['galgame', 'assets/default/README.md'], ['galgame', 'NOTICE.md'], ['galgame', 'THIRD_PARTY_LICENSES.md']);
  files.push(['galgame', 'assets/default/licenses/dsh-deep-whale-LICENSE.txt'], ['galgame', 'assets/default/licenses/dsh-deep-whale-NOTICE.txt']);
  files.push(['ai-girls', 'characters/doubao/generated/doubao-fullbody.jpg'], ['ai-girls', 'characters/doubao/README.md'], ['ai-girls', 'NOTICE.md']);
  for (const p of Object.values(AI_GIRLS_CHIBI)) files.push(['ai-girls', p]);
  files.push(['ai-girls', 'README.md'], ['ai-girls', 'catalog.json'], ['ai-girls', 'sources/source-records.json']);
  for (const pet of ['deepseek-whale', 'gpt-dragon']) {
    files.push(['pets', `assets/${pet}/spritesheet.png`], ['pets', `assets/${pet}/pet.json`]);
  }
  files.push(['pets', 'README.md'], ['pets', 'FORMAT.md'], ['pets', 'RIGHTS.md'], ['pets', 'ATTRIBUTION.md'], ['pets', 'LICENSE'], ['pets', 'SHA256SUMS']);
  return files;
}

async function curlJson(url) {
  const { stdout } = await pexec('curl', ['-sf', '--retry', '3', url], { maxBuffer: 64 << 20 });
  return JSON.parse(stdout);
}

const trees = {};
for (const [key, { repo, commit }] of Object.entries(REPOS)) {
  const t = await curlJson(`https://api.github.com/repos/${repo}/git/trees/${commit}?recursive=1`);
  if (t.truncated) throw new Error(`${repo} tree truncated`);
  trees[key] = new Map(t.tree.filter(x => x.type === 'blob').map(x => [x.path, x.sha]));
  console.log('tree', repo, trees[key].size, 'files');
}

const jobs = wantedFiles().map(([key, p]) => {
  const blob = trees[key].get(p);
  if (!blob) throw new Error(`missing upstream file ${key}:${p}`);
  return { key, p, blob };
});
console.log('downloading', jobs.length, 'files…');

const manifest = { pinned: Object.fromEntries(Object.entries(REPOS).map(([k, v]) => [k, v])), files: [] };
let done = 0, skipped = 0;
async function worker(queue) {
  for (const j of queue) {
    const { key, p, blob } = j;
    const dest = path.join(OUT, key, p);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    let buf = fs.existsSync(dest) ? fs.readFileSync(dest) : null;
    const gitSha1 = (b) => crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${b.length}\0`), b])).digest('hex');
    if (buf && gitSha1(buf) === blob) { skipped++; }
    else {
      const { repo } = REPOS[key];
      await pexec('curl', ['-sf', '--retry', '4', '-H', 'Accept: application/vnd.github.raw',
        `https://api.github.com/repos/${repo}/git/blobs/${blob}`, '-o', dest], { maxBuffer: 1 << 20 });
      buf = fs.readFileSync(dest);
      if (gitSha1(buf) !== blob) throw new Error(`blob sha mismatch ${key}:${p}`);
    }
    manifest.files.push({ source: key, repo: REPOS[key].repo, commit: REPOS[key].commit, path: p, blob, sha256: crypto.createHash('sha256').update(buf).digest('hex'), bytes: buf.length });
    done++;
    if (done % 40 === 0) console.log(`${done}/${jobs.length} (${skipped} cached)`);
  }
}
const queues = Array.from({ length: 6 }, () => []);
jobs.forEach((j, i) => queues[i % 6].push(j));
await Promise.all(queues.map(worker));
manifest.files.sort((a, b) => (a.source + a.path).localeCompare(b.source + b.path));
fs.writeFileSync(path.join(HERE, 'data/upstream_manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`done: ${done} files (${skipped} cached), ${(manifest.files.reduce((a, f) => a + f.bytes, 0) / 1048576).toFixed(1)} MiB`);
