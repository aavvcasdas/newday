#!/usr/bin/env bash
# Experimental preview only: original full frames, no recentering or compositing.
set -euo pipefail
cd "$(dirname "$0")"
convert -delay 12 whale_step_{0,1,2,3,4,5,6}.png \
  -delay 22 whale_step_7.png -resize 400x400 -loop 0 whale_walk_test.gif
identify -format '%s %wx%h %Tcs\n' whale_walk_test.gif
