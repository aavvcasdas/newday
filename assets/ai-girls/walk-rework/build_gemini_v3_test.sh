#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
convert -delay 12 gemini_v3_step_{0,1,2,3,4,5,6}.png \
  -delay 22 gemini_v3_step_7.png -resize 400x400 -loop 0 gemini_v3_walk_test.gif
identify -format '%s %wx%h %Tcs\n' gemini_v3_walk_test.gif
