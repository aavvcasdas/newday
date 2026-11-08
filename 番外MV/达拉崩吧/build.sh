#!/bin/sh
# build.sh — End-to-end 1920×1080 24fps build pipeline for 《达拉崩吧》 16-bit Pixel RPG MV
set -eu

HERE="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
export PATH="/home/user/bin:$PATH"
export PLAYWRIGHT_CHROME="${PLAYWRIGHT_CHROME:-/home/user/bin/chrome-headless-shell}"
export LEMO_OPUSCAR="${LEMO_OPUSCAR:-/home/user/lemo-opuscar}"
PY="${LEMO_PYTHON:-$LEMO_OPUSCAR/.venv/bin/python}"

WORK="/tmp/dalabengba_build_$$"
mkdir -p "$WORK"
cleanup() { rm -rf "$WORK" "$HERE/out"; }
trap cleanup EXIT INT TERM

echo "[1/5] Running OpusCar on-screen text readability gate (readcheck.mjs)..."
node "$LEMO_OPUSCAR/core/render/readcheck.mjs" "$HERE"

echo "[2/5] Exporting SFX timeline (events.mjs) & rendering poster / character sheet..."
node "$LEMO_OPUSCAR/core/render/events.mjs" "$HERE" "$HERE/events.json"
node "$LEMO_OPUSCAR/core/render/still.mjs" "$HERE" 0 --q "sheet=1" --prefix "sheet_" --out "$WORK" --size 1920x1080
cp "$WORK/sheet_0.jpg" "$HERE/character_sheet.jpg"
node "$LEMO_OPUSCAR/core/render/still.mjs" "$HERE" 123.6 --prefix "poster_" --out "$WORK" --size 1920x1080
cp "$WORK/poster_123.6.jpg" "$HERE/poster.jpg"

echo "[3/5] Mixing 48kHz stereo soundtrack + 83 16-bit RPG SFX & exporting dalabengba.srt..."
"$PY" "$HERE/mix.py" "$WORK/mix.wav"

echo "[4/5] Rendering full 1920×1080 @ 24fps 16-bit Pixel RPG picture (3,186 frames)..."
node "$LEMO_OPUSCAR/core/render/video.mjs" "$HERE" --fps 24 --workers 6 --out "$WORK/video.mp4" --size 1920x1080

echo "[5/5] Mastering & muxing final film at -14 LUFS / grain=0 (mux.sh)..."
sh "$LEMO_OPUSCAR/core/render/mux.sh" "$WORK/video.mp4" "$WORK/mix.wav" "$HERE/dalabengba.mp4" 24 0

echo "Done -> $HERE/dalabengba.mp4"
