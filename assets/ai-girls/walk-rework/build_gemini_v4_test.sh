#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
for i in {0..7}; do
  convert "gemini_v4_step_${i}.png" -background '#c9eaa9' -gravity center -extent 1093x1008 -resize 400x400 "$tmp/$i.png"
done
convert -delay 12 "$tmp"/{0,1,2,3,4,5,6}.png -delay 22 "$tmp/7.png" -loop 0 gemini_v4_walk_test.gif
identify -format '%s %wx%h %Tcs\n' gemini_v4_walk_test.gif
