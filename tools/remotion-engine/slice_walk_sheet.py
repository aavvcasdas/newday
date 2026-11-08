#!/usr/bin/env python3
"""slice_walk_sheet.py — 把「2×2 四格走路姿态图」切成 4 张逐帧立绘

对标上游 pets 的做法：走路的每一帧都是**画出来的全身像**，不是从一张站姿里切腿。
一次生图能稳定产出 4 个姿态，所以每个角色只要 2 张四格图 = 8 帧。

用法：
    # 第一张四格图 → f1..f4
    python3 tools/remotion-engine/slice_walk_sheet.py sheet_a.png --char whale --offset 1
    # 第二张四格图 → f5..f8
    python3 tools/remotion-engine/slice_walk_sheet.py sheet_b.png --char whale --offset 5

产物：assets/ai-girls/walk-v14/frames/<char>/f1.png … f8.png
之后 `node tools/remotion-engine/build_walk_v14.mjs <char>` 会直接按逐帧成品拼图集。

切完会顺手处理掉两件生成图常见的问题：
  * 每个格子底部那条「地面线」——不擦掉会变成脚下一根黑条；
  * 格子边缘的重叠/白边——按 alpha 之外的白底留 2% 余量。
"""

import argparse
import os
import sys

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
FRAME_ROOT = os.path.join(ROOT, 'assets', 'ai-girls', 'walk-v14', 'frames')

ORDER = ['f1', 'f2', 'f3', 'f4']  # 左上、右上、左下、右下 → 帧序


def is_ground_line(px):
    r, g, b = px[0], px[1], px[2]
    mx, mn = max(r, g, b), min(r, g, b)
    return mx - mn <= 26 and 24 <= mn <= 150


def strip_ground_line(tile):
    """把格子底部那条横贯全宽的地面线擦成白底。"""
    tile = tile.convert('RGB')
    w, h = tile.size
    px = tile.load()
    removed = 0
    for y in range(h - 1, int(h * 0.55) - 1, -1):
        dark = sum(1 for x in range(w) if is_ground_line(px[x, y]))
        if dark >= w * 0.55:
            for x in range(w):
                px[x, y] = (255, 255, 255)
            removed += 1
        elif removed:
            break
    return tile


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('sheet')
    ap.add_argument('--char', required=True)
    ap.add_argument('--offset', type=int, default=1, choices=(1, 5),
                    help='1 → 写 f1..f4；5 → 写 f5..f8')
    ap.add_argument('--inset', type=float, default=0.01,
                    help='每格向内收的比例，躲掉格子之间的串味（默认 1%%）')
    args = ap.parse_args()

    sheet = Image.open(args.sheet).convert('RGB')
    w, h = sheet.size
    hw, hh = w // 2, h // 2
    inset_x, inset_y = int(w * args.inset), int(h * args.inset)
    boxes = [
        (inset_x, inset_y, hw - inset_x, hh - inset_y),
        (hw + inset_x, inset_y, w - inset_x, hh - inset_y),
        (inset_x, hh + inset_y, hw - inset_x, h - inset_y),
        (hw + inset_x, hh + inset_y, w - inset_x, h - inset_y),
    ]

    out_dir = os.path.join(FRAME_ROOT, args.char)
    os.makedirs(out_dir, exist_ok=True)
    for i, box in enumerate(boxes):
        tile = strip_ground_line(sheet.crop(box))
        name = ORDER[i] if args.offset == 1 else 'f%d' % (i + 5)
        path = os.path.join(out_dir, name + '.png')
        tile.save(path)
        print('wrote', path, tile.size)

    have = sorted(os.listdir(out_dir))
    if len([f for f in have if f.startswith('f') and f.endswith('.png')]) >= 8:
        print('%s 已有 8 帧，跑 node tools/remotion-engine/build_walk_v14.mjs %s 出图集'
              % (args.char, args.char))
    else:
        print('%s 还差另外半套四格图（--offset %s）' % (args.char, 5 if args.offset == 1 else 1))


if __name__ == '__main__':
    sys.exit(main())
