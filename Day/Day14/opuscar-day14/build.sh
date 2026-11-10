#!/bin/sh
set -e
ROOT=$(cd "$(dirname "$0")/../../.." && pwd)
cd "$ROOT"
# v10：用户指出「脚少一只 / 动作不符 / 人物形象太多」；保留 v9 paper-popup 背景与分镜，
# 只用 8 张逐帧核验双脚可见的正面站立图集，并加厚 24 次道具交接互动。
# Playwright 浏览器渲染器在本沙箱不可用；用仓库 Python 渲染器 + ffmpeg 出片。
PYTHONHASHSEED=0 python3 tools/day14制作/render_day14_video.py \
  --out Day/Day14/成片/Day14_重看昨天那支片子_克隆配音版.mp4
