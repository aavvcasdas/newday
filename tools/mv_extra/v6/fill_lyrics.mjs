/**
 * fill_lyrics.mjs — Modeled on Nyankomintsu/world-execute-me-lyric-mv/tools/fill_lyrics.mjs:
 * Keeps timing/code independent from lyric strings. Reads lyrics.txt (or .lrc), strips structural
 * headers like 【副歌】 or LRC time tags, validates line count & character counts against
 * lyric_timing.json, and exposes text(lineNum) / slice(lineNum, a, b) at runtime.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');

export function parseLyricLines(raw) {
  return raw
    .split(/\r?\n/)
    .map((ln) => ln.replace(/^\s*(\[\d{1,2}:\d{2}(?:\.\d{1,3})?\])+\s*/g, '').trim())
    .filter((ln) => ln.length > 0 && !/^[\[【].*[\]】]$/.test(ln));
}

export function loadBoundLyrics(lyricPath = path.join(HERE, 'lyrics.txt')) {
  const timing = JSON.parse(fs.readFileSync(path.join(HERE, 'lyric_timing.json'), 'utf8'));
  const rawBytes = fs.readFileSync(lyricPath);
  const scriptSha256 = createHash('sha256').update(rawBytes).digest('hex');
  const lines = parseLyricLines(rawBytes.toString('utf8'));

  if (lines.length !== timing.lines.length) {
    throw new Error(
      `Lyric line count mismatch: expected ${timing.lines.length} lines from lyric_timing.json, got ${lines.length} in ${lyricPath}`
    );
  }

  const cues = timing.lines.map((item, idx) => {
    const str = lines[idx];
    const chars = Array.from(str);
    if (chars.length !== item.charCount) {
      throw new Error(
        `Line ${item.line} @ ${item.start.toFixed(2)}s character count mismatch: expected ${item.charCount}, got ${chars.length}`
      );
    }
    return {
      ...item,
      text: str,
      chars,
    };
  });

  const cacheOut = path.join(ROOT, 'tools/mv_extra/cache/v5_lyrics_bound.json');
  fs.mkdirSync(path.dirname(cacheOut), { recursive: true });
  fs.writeFileSync(
    cacheOut,
    JSON.stringify({ scriptSha256, timingSchema: timing.schemaVersion, cues }, null, 2) + '\n'
  );

  return {
    timing,
    scriptSha256,
    cues,
    text(lineNum) {
      const c = cues[lineNum - 1];
      if (!c) throw new Error(`Unknown lyric line ${lineNum}`);
      return c.text;
    },
    slice(lineNum, fromChar = 0, toChar = undefined) {
      const c = cues[lineNum - 1];
      if (!c) throw new Error(`Unknown lyric line ${lineNum}`);
      return c.chars.slice(fromChar, toChar).join('');
    },
    cueAt(t) {
      return cues.find((c) => t >= c.start && t < c.end) || null;
    },
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const custom = process.argv[2] ? path.resolve(process.argv[2]) : undefined;
  const bound = loadBoundLyrics(custom);
  console.log(
    `Bound ${bound.cues.length} lyric lines (SHA256: ${bound.scriptSha256.slice(0, 12)}…) -> tools/mv_extra/cache/v5_lyrics_bound.json`
  );
}
