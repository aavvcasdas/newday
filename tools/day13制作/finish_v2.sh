#!/usr/bin/env bash
# Run from repository root after render_v2.mjs, reuses v1's AAC without re-encoding.
set -euo pipefail
: "${FFMPEG:?Set FFMPEG}"
base=tools/mv_dayu/remotion/out
list="$base/day13-v2-concat.txt"
: > "$list"
for start in 0 600 1200 1800 2400 3000; do
  printf "file '%s/%s/day13-v2-part-%s.mp4'\n" "$PWD" "$base" "$start" >> "$list"
  if [[ "$start" != 3000 ]]; then echo 'duration 20.0' >> "$list"; fi
done
"$FFMPEG" -y -loglevel error -f concat -safe 0 -i "$list" -map 0:v:0 -c:v copy "$base/day13-v2-silent.mp4"
"$FFMPEG" -y -loglevel error -i "$base/day13-v2-silent.mp4" -i 'Day13/成片/Day13_鲸鱼MV画面_配音BGM_待审.mp4' -map 0:v:0 -map 1:a:0 -c copy -movflags +faststart 'Day13/成片/Day13_Day12鲸娘走动_待审.mp4'
