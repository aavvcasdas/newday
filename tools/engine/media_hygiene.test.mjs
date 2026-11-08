// media_hygiene.test.mjs — 媒体入库守卫（2026-11-08 用户要求整理分支后固化）
//
// 背景：这个分支曾把 4 个散落媒体和历史 MV 版本直接提交进 Git
// （源视频、参考音频、克隆配音 WAV、大禹治水 MP3），仓库一度膨胀到 1.1GB。
// 这条测试把「媒体不入库」变成可执行规则：只允许显式白名单里的成片/素材进库，
// 其余视频音频一律走 .gitignore + 外部归档，避免下次又悄悄提交回去。
//
// 要放行新的交付成片，请同时改这里和 .gitignore，并在 PR 里说明原因。

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MEDIA_EXT = /\.(mp4|mov|webm|wav|mp3|m4a|flac|aac|ogg)$/i;

// 允许入库的单个媒体：交付成片或不可重建的原始素材，且在对应 README 里有说明。
const ALLOWED_FILES = [
  // Day12 正式成片与两份待审样片（历史交付，保持不动）
  /^Day12\/成片\/Day12_鲸鱼摇人_有声BGM版\.mp4$/,
  /^Day12\/样片\/Day12_v2_四段动态审看_有声\.mp4$/,
  /^Day12\/样片\/Day12_四段导演样片_无声\.mp4$/,
  // 本轮新增：MV 八人并入 Day 的结构验收样片
  /^Day样片\/MV八人并入Day_结构验收_无声\.mp4$/,
];

// 允许入库的归档目录：整支 MV 的成片与审看样片，按用户明确指示保留（不是新上传的散落文件）。
const ALLOWED_PREFIXES = [
  '番外MV/我怀疑大禹治水/',
  '番外MV/把回忆拼好给你/',
];

const isAllowed = (f) =>
  ALLOWED_FILES.some((re) => re.test(f)) || ALLOWED_PREFIXES.some((p) => f.startsWith(p));

function trackedMedia() {
  const out = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8' });
  return out
    .split('\0')
    .filter(Boolean)
    .filter((f) => MEDIA_EXT.test(f));
}

test('媒体入库守卫：只有白名单里的交付媒体可以在库里', () => {
  const tracked = trackedMedia();
  const strays = tracked.filter((f) => !isAllowed(f));
  assert.deepEqual(
    strays,
    [],
    `发现未登记的媒体文件被提交进 Git（请移出仓库或加入白名单并说明理由）：\n${strays.join('\n')}`,
  );
});

test('媒体入库守卫：白名单条目必须真实存在，避免规则腐化成空壳', () => {
  const tracked = trackedMedia();
  const missing = ALLOWED_FILES.filter((re) => !tracked.some((f) => re.test(f))).map((re) => String(re));
  assert.deepEqual(missing, [], `白名单里的媒体已不在库中，规则应同步更新：\n${missing.join('\n')}`);
});

test('媒体入库守卫：散落媒体删除后没有留下悬空的 .gitignore 例外', () => {
  const ignoredSample = [
    '《把回忆拼好给你》.mp4',
    '鲸鱼摇人_克隆配音_最终版.wav',
    '我怀疑大禹治水治没了我的薪水.mp3',
    'assets/mv-extra/user_reference_audio.m4a',
  ];
  for (const rel of ignoredSample) {
    let tracked = true;
    try {
      execFileSync('git', ['ls-files', '--error-unmatch', rel], { cwd: ROOT, stdio: 'ignore' });
    } catch {
      tracked = false;
    }
    assert.equal(tracked, false, `${rel} 不应再被 Git 跟踪`);
  }
});
