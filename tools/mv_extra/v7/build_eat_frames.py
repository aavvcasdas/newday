#!/usr/bin/env python3
"""把「吃饭动作」两张三格/四格生成图切成 8 格固定帧。

v7 的鲸娘原来只有一个「eating」状态，6 格里其实只有 3 个姿态在反复
（rice / scoop / eat 各重复两次），播放起来就是原地抖。这里把它换成
**真正的一整套吃饭动作**：8 个连续不同的姿态，从舀饭到嚼饭一轮。

手绘姿势来自两张 2×2 生成图（`assets/ai-girls/pet-v7/sheet/whale_eat*.png`），
和走路的做法一样：一次生图稳定出 4 个姿态，两张就是 8 帧。

和走路那边（tools/remotion-engine/slice_walk_sheet.py 逐帧紧裁）不同，
v7 的图集规则是**所有格子共用一张画布**：pet.mjs 按 (x, y) 脚下点整格贴图，
所以这里只做**统一的缩放系数 + 统一的落脚基准**，绝不逐帧重新居中放大。

用法：
    python3 tools/mv_extra/v7/build_eat_frames.py            # 切帧
    python3 tools/mv_extra/v7/build_eat_frames.py --preview  # 另外存一张 8 帧对比条
"""

import argparse
import importlib.util
import os
import sys

import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
ASSET = os.path.join(ROOT, 'assets', 'ai-girls', 'pet-v7')
SHEET = os.path.join(ASSET, 'sheet')
OUT = os.path.join(ASSET, 'source', 'eat')

W, H = 384, 416          # 与 build_atlas.py 的格尺寸一致
WHITE = 250
BOTTOM = 5               # 脚底离格子底边的距离（和 build_atlas.py 的 H-5 对齐）


def load_white_to_alpha():
    """复用走路切片里那段「白底 → 透明 + 边缘反预乘」的实现，避免两套抠图各写一遍。

    那份实现是给逐帧紧裁写的，但抠图逻辑和画布无关，这里直接用。
    """
    path = os.path.join(ROOT, 'tools', 'remotion-engine', 'slice_walk_sheet.py')
    spec = importlib.util.spec_from_file_location('slice_walk_sheet', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.white_to_alpha, module.background_mask


def quadrant_box(w, h, i, inset=0.01):
    ix, iy = int(w * inset), int(h * inset)
    hw, hh = w // 2, h // 2
    boxes = [
        (ix, iy, hw - ix, hh - iy),
        (hw + ix, iy, w - ix, hh - iy),
        (ix, hh + iy, hw - ix, h - iy),
        (hw + ix, hh + iy, w - ix, h - iy),
    ]
    return boxes[i]


def cell_piece(path, index, background_mask):
    """读一张 2×2 生成图的第 index 格（左上/右上/左下/右下）。

    返回 (裁到包围盒的 RGB, 同一块的人物掩码)。掩码必须在**整格**上算：
    裁到包围盒之后四条边上全是人物，再按"连到边缘的白才是背景"就判不出背景了。
    """
    im = Image.open(path).convert('RGB')
    raw = np.array(im)
    x0, y0, x1, y1 = quadrant_box(im.width, im.height, index)
    piece = raw[y0:y1, x0:x1].copy()
    mask = ~background_mask(piece)
    ys, xs = np.nonzero(mask)
    if len(xs) == 0:
        raise SystemExit('%s 第 %d 格是空的' % (path, index + 1))
    bx0, bx1 = int(xs.min()), int(xs.max())
    by0, by1 = int(ys.min()), int(ys.max())
    return (piece[by0:by1 + 1, bx0:bx1 + 1], mask[by0:by1 + 1, bx0:bx1 + 1])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--preview', action='store_true')
    args = ap.parse_args()

    white_to_alpha, background_mask = load_white_to_alpha()

    pieces = []
    for name in ('whale_eat_a.png', 'whale_eat_b.png'):
        path = os.path.join(SHEET, name)
        for i in range(4):
            pieces.append(cell_piece(path, i, background_mask))

    # 统一缩放系数：取所有格里最"挤"的那一个，保证谁都不会溢出格子。
    # 不做逐帧归一 —— 逐帧归一等于把每个姿态都放大到同高，脚会浮、头会跳。
    k = min(min((W - 14) / rgb.shape[1], (H - 12) / rgb.shape[0]) for rgb, _ in pieces)
    os.makedirs(OUT, exist_ok=True)

    thumbs = []
    for i, (piece, mask) in enumerate(pieces, start=1):
        size = (max(1, round(piece.shape[1] * k)), max(1, round(piece.shape[0] * k)))
        resized = np.array(Image.fromarray(piece).resize(size, Image.Resampling.LANCZOS))
        # 掩码跟着一起缩：用最近邻，别把边缘糊成半透明
        keep = np.array(Image.fromarray(mask.astype(np.uint8) * 255).resize(size, Image.Resampling.NEAREST)) > 127
        color, alpha = white_to_alpha(resized, keep)
        th, tw = color.shape[:2]
        cell = np.zeros((H, W, 4), np.uint8)
        # 水平居中、脚底贴 BOTTOM：所有格共用同一套参数，就是"共同画布"
        ox = (W - tw) // 2
        oy = H - BOTTOM - th
        cell[oy:oy + th, ox:ox + tw, :3] = color
        cell[oy:oy + th, ox:ox + tw, 3] = alpha
        path = os.path.join(OUT, 'f%d.png' % i)
        Image.fromarray(cell, 'RGBA').save(path)
        thumbs.append(cell)
        print('wrote %s  %dx%d  scale=%.3f' % (path, W, H, k))

    if args.preview:
        pad = 6
        strip = Image.new('RGBA', (W * 8 + pad * 9, H + pad * 2), (16, 22, 38, 255))
        for i, cell in enumerate(thumbs):
            strip.alpha_composite(Image.fromarray(cell, 'RGBA'),
                                  (pad + i * (W + pad), pad))
        out = os.path.join(ROOT, 'assets/ai-girls/pet-v7/preview', 'whale_eat8_strip.png')
        os.makedirs(os.path.dirname(out), exist_ok=True)
        strip.convert('RGB').save(out)
        print('wrote', out)
    return 0


if __name__ == '__main__':
    sys.exit(main())
