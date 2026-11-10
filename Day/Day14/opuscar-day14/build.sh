#!/bin/sh
set -e
ROOT=$(cd "$(dirname "$0")/../../.." && pwd)
cd "$ROOT"
# Playwright 浏览器渲染器在本沙箱不可用；用仓库已验证的 Python 渲染器 + ffmpeg 出片。
PYTHONHASHSEED=0 python3 tools/day14制作/render_day14_video.py \
  --out Day/Day14/成片/Day14_重看昨天那支片子_克隆配音版.mp4
