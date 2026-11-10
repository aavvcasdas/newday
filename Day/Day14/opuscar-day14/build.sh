#!/bin/sh
set -e
ROOT=$(cd "$(dirname "$0")/../../.." && pwd)
cd "$ROOT"
# v9：用户否决 v8 的 pixel-rpg 画风；改用 paper-popup 纸片立体书语法。
# Playwright 浏览器渲染器在本沙箱不可用；用仓库 Python 渲染器 + ffmpeg 出片。
PYTHONHASHSEED=0 python3 tools/day14制作/render_day14_video.py \
  --out Day/Day14/成片/Day14_重看昨天那支片子_克隆配音版.mp4
