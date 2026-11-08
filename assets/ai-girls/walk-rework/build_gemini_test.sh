#!/usr/bin/env bash
# Raw eight-frame experiment; no cropping, alignment, background removal or integration.
set -euo pipefail
cd "$(dirname "$0")"
convert -delay 12 gemini_step_{0,1,2,3,4,5,6}.png \
  -delay 22 gemini_step_7.png -resize 400x400 -loop 0 gemini_walk_test.gif
identify -format '%s %wx%h %Tcs\n' gemini_walk_test.gif
