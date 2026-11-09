#!/bin/sh
# build.sh — Rebuild the complete 1920×1080 @ 24fps fairytale MV from source + reference audio.
set -eu

HERE="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
ROOT="$(CDPATH= cd -- "$HERE/../.." && pwd)"
export PATH="/home/user/bin:$PATH"
export LD_LIBRARY_PATH="/home/user/bin/libs/lib:/home/user/bin/libs:/home/user/bin:${LD_LIBRARY_PATH:-}"
export PLAYWRIGHT_CHROME="${PLAYWRIGHT_CHROME:-/home/user/bin/chrome-headless-shell}"
export LEMO_OPUSCAR="${LEMO_OPUSCAR:-/home/user/lemo-opuscar}"
PY="${LEMO_PYTHON:-$LEMO_OPUSCAR/.venv/bin/python}"
POSTER_TIME="${POSTER_TIME:-80.7}"
WORK="$(mktemp -d /tmp/tonghuazhen_build.XXXXXX)"
mkdir -p "$HERE/out" "$HERE/封面"
cleanup() { rm -rf "$WORK"; }
trap cleanup EXIT INT TERM

if [ ! -x "$PY" ]; then
  echo "Python environment not found at $PY; run .claude/skills/pixel-mv-remake/scripts/bootstrap.sh first." >&2
  exit 2
fi
if [ ! -x "$PLAYWRIGHT_CHROME" ]; then
  echo "Chromium not found at $PLAYWRIGHT_CHROME; run .claude/skills/pixel-mv-remake/scripts/bootstrap.sh first." >&2
  exit 2
fi

printf '[1/6] Checking all on-screen story text readability...\n'
node "$LEMO_OPUSCAR/core/render/readcheck.mjs" "$HERE"

printf '[2/6] Exporting aligned SFX events, poster and cast sheet...\n'
node "$LEMO_OPUSCAR/core/render/events.mjs" "$HERE" "$HERE/events.json"
node "$LEMO_OPUSCAR/core/render/still.mjs" "$HERE" 1.2 --q 'sheet=1' --prefix 'sheet_' --out "$WORK" --size 1920x1080
cp "$WORK/sheet_1.2.jpg" "$HERE/character_sheet.jpg"
node "$LEMO_OPUSCAR/core/render/still.mjs" "$HERE" "$POSTER_TIME" --prefix 'poster_' --out "$WORK" --size 1920x1080
cp "$WORK/poster_${POSTER_TIME}.jpg" "$HERE/poster.jpg"

printf '[3/6] Mixing the original song with storybook SFX and writing tonghuazhen.srt...\n'
"$PY" "$HERE/mix.py" "$HERE/out/mix.wav"

printf '[4/6] Rendering the complete 24fps pixel-RPG picture...\n'
node "$LEMO_OPUSCAR/core/render/video.mjs" "$HERE" --fps 24 --workers 4 --out "$WORK/video.mp4" --size 1920x1080

printf '[5/6] Mastering and muxing at -14 LUFS, grain=0...\n'
sh "$LEMO_OPUSCAR/core/render/mux.sh" "$WORK/video.mp4" "$HERE/out/mix.wav" "$HERE/tonghuazhen.mp4" 24 0

printf '[6/6] Generating two clean, watermark-free release covers...\n'
node "$HERE/make_covers.mjs"

printf 'Done.\n  Video: %s/tonghuazhen.mp4\n  SRT:   %s/tonghuazhen.srt\n  Mix:   %s/out/mix.wav\n' "$HERE" "$HERE" "$HERE"
