#!/usr/bin/env bash
# Run from repo root, after render.mjs. Requires FFMPEG and FFPROBE executable paths.
set -euo pipefail
: "${FFMPEG:?Set FFMPEG}" "${FFPROBE:?Set FFPROBE}" "${PYTHON:=python3}"
base=tools/mv_dayu/remotion/out
list="$base/day13-concat-precise.txt"
: > "$list"
for start in 0 600 1200 1800 2400 3000; do
  printf "file '%s/%s/day13-part-%s.mp4'\n" "$PWD" "$base" "$start" >> "$list"
  if [[ "$start" != 3000 ]]; then echo 'duration 20.0' >> "$list"; fi
done
"$FFMPEG" -y -loglevel error -f concat -safe 0 -i "$list" -map 0:v:0 -c:v copy "$base/day13-silent.mp4"
"$FFMPEG" -y -loglevel error -i "$base/day13-silent.mp4" -i '鲸鱼MV画面_克隆配音_最终版.wav' -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -ar 48000 -movflags +faststart "$base/day13-dry.mp4"
"$PYTHON" tools/音频/mix_episode_bgm.py --base "$base/day13-dry.mp4" --voice '鲸鱼MV画面_克隆配音_最终版.wav' --alignment tools/day13制作/voice_alignment.json --output 'Day13/成片/Day13_鲸鱼MV画面_配音BGM_待审.mp4' --stem 'Day13/配音/Day13_伴奏.flac' --report tools/day13制作/bgm_check.json --no-auto-sfx
