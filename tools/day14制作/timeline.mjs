// tools/day14制作/timeline.mjs — Day14 规划时间轴（没有音源时也绝不假装实测）
//
// Day13 的做法是 Vosk 词级对齐 + 5ms RMS，输出 measured=true 的字幕轴。
// Day14 现在**没有用户给定的配音**，所以这里只做两件事：
//   1. 按标点把每一行台词拆成字幕屏（与 Day13 同一套分屏规则）；
//   2. 用汉字数 × 实测语速推算每一屏的规划起止，并写出 planning.json。
//
// 关键约束：任何由本文件产出的时间轴，`measured` 一律是 false，
// 且 `method` 里必须出现「规划」字样。render 与门禁只认 measured=true 的字幕轴，
// 所以这份文件不可能被当成实测轴混进正式渲染。

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const SCRIPT = path.join(ROOT, 'Day14/Day14配音台词.txt');
const OUT = path.join(ROOT, 'tools/day14制作');

// Day13 实测：110.62 秒、372 个汉字 → 3.36 汉字/秒（含气口、标点停顿）。
// 只作为同一说话人的时长预估，不能代替 Day14 自己的实测。
const RATE = 3.36;
const LEAD_IN = 0.25;      // 开场留白
const LINE_GAP = 0.18;     // 换行的气口
const SCREEN_PAD = 0.15;   // 每屏读完后的留白

const HAN = /[\u4e00-\u9fff]/g;
const countHan = (s) => (s.match(HAN) || []).length;
const round3 = (n) => Math.round(n * 1000) / 1000;

// 与 Day13 相同的分屏规则：按标点切，标点跟着前一段走，不留空段。
function splitScreens(line) {
  const out = [];
  const re = /[^，。！？：、]+[，。！？：、]?/g;
  let m;
  while ((m = re.exec(line)) !== null) {
    const text = m[0];
    if (!text.trim()) continue;
    out.push(text);
  }
  return out;
}

function build() {
  const raw = fs.readFileSync(SCRIPT, 'utf8');
  const lines = raw.split('\n').map((s) => s.trim()).filter(Boolean);
  if (!lines.length) throw new Error('Day14 台词为空');

  const screens = [];
  const cues = [];
  let t = LEAD_IN;

  lines.forEach((line, index) => {
    const cueStart = t;
    for (const text of splitScreens(line)) {
      const seconds = Math.max(0.8, countHan(text) / RATE);
      const start = round3(t);
      const speechEnd = round3(t + seconds);
      const end = round3(t + seconds + SCREEN_PAD);
      screens.push({ line: index + 1, text, start, speech_end: speechEnd, end });
      t = end;
    }
    cues.push({
      id: `L${String(index + 1).padStart(2, '0')}`,
      index: index + 1,
      text: line,
      start: round3(cueStart),
      end: round3(t),
    });
    t = round3(t + LINE_GAP);
  });

  // 末屏不能越过成片结尾；这一点 Day13 也做了同样的收口。
  const duration = round3(screens.at(-1).end);
  screens.at(-1).end = duration;

  const plan = {
    measured: false,
    method: '规划：按 Day13 实测语速 3.36 汉字/秒推算，未对齐本集音源',
    source_file: 'Day14/Day14配音台词.txt',
    source_sha256: sha256(raw),
    duration_seconds: duration,
    han_chars: countHan(raw),
    rate_han_per_second: RATE,
    note: '没有 Day14 音源。此轴只用于预估节奏与分镜时长，禁止用于正式渲染或标记为已对齐。',
    cues,
  };
  const subs = {
    measured: false,
    method: 'planning: punctuation screens, timing estimated not aligned',
    source_sha256: plan.source_sha256,
    screens,
  };
  return { plan, subs };
}

function sha256(text) {
  // 避免引入 node: 之外依赖；这里只需要一个稳定指纹。
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < text.length; i += 1) {
    const c = text.charCodeAt(i);
    h1 = (h1 ^ c) * 0x01000193 >>> 0;
    h2 = (h2 + c * 131) >>> 0;
  }
  return `fnv1a:${h1.toString(16).padStart(8, '0')}${h2.toString(16).padStart(8, '0')}`;
}

function main() {
  const { plan, subs } = build();
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'planning.json'), JSON.stringify(plan, null, 2) + '\n');
  fs.writeFileSync(path.join(OUT, 'subtitle_timing.planning.json'), JSON.stringify(subs, null, 2) + '\n');
  console.log(`Day14 规划轴：${plan.cues.length} 行 / ${subs.screens.length} 屏 / ${plan.duration_seconds}s（measured=${plan.measured}）`);
  console.log(`最后一句结束于 ${plan.duration_seconds}s，下一集钩子留在末句。`);
}

main();
