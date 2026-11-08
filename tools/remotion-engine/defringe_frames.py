#!/usr/bin/env python3
"""给已有的 RGBA 走路帧做「颜色去污」（defringe），把剪影上那一圈浅色换掉。

背景：白底生成图抠成 alpha 之后，最外 1~2 像素本来是
「人物色 × 白底」的混合，虽然给了 alpha 坡，颜色里仍然混着白。深色角色
（鲸娘的黑裙子、zai 的黑发）贴到深色舞台上就是一圈很明显的光晕。

这里不动 alpha（剪影大小、抗锯齿都保持原样），只把最外 band 像素的 RGB
换成**里层 dist>band 的平均色**：

    dist<=2 的像素 → 颜色 = 里层 5×5 窗口的平均色；alpha 不变

浅色角色（龙娘的白发白裙）里层本来就是白的，换完也还是白的，等于没动；
深色角色的亮边会直接变成里层的深色，光晕消失。

用法：
    python3 tools/remotion-engine/defringe_frames.py whale gemini zai
    python3 tools/remotion-engine/defringe_frames.py --all
"""

import argparse
import glob
import importlib.util
import os
import sys

import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
FRAME_ROOT = os.path.join(ROOT, 'assets/ai-girls/walk-v14/frames')


def load_helpers():
    path = os.path.join(ROOT, 'tools', 'remotion-engine', 'slice_walk_sheet.py')
    spec = importlib.util.spec_from_file_location('slice_walk_sheet', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def defringe(rgba, helper, band=2, radius=2):
    rgb = rgba[..., :3].astype(np.float32)
    alpha = rgba[..., 3]
    inside = alpha > 0
    if not inside.any():
        return rgba
    dist = helper._band_distance(inside, steps=band)
    inner = dist > band
    if not inner.any():
        return rgba
    C, den = helper._box_mean(rgb, inner, r=radius)
    if (den == 0).any():
        C2, den2 = helper._box_mean(rgb, inside, r=radius + 2)
        C = np.where((den > 0)[..., None], C, C2)
        den = np.where(den > 0, den, den2)
    band_px = (dist <= band) & (den > 0)
    out = np.where(band_px[..., None], C, rgb)
    out = np.where(inside[..., None], out, rgb)
    res = rgba.copy()
    res[..., :3] = np.clip(out, 0, 255).astype(np.uint8)
    return res


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('chars', nargs='*')
    ap.add_argument('--all', action='store_true', help='处理 frames/ 下所有角色')
    ap.add_argument('--dir', default=FRAME_ROOT)
    ap.add_argument('--band', type=int, default=2)
    ap.add_argument('--radius', type=int, default=2)
    args = ap.parse_args()

    helper = load_helpers()
    chars = args.chars
    if args.all or not chars:
        chars = sorted(d for d in os.listdir(args.dir)
                       if os.path.isdir(os.path.join(args.dir, d)))
    for char in chars:
        files = sorted(glob.glob(os.path.join(args.dir, char, 'f*.png')))
        if not files:
            print('%s: 没有帧，跳过' % char)
            continue
        changed = 0
        for path in files:
            im = Image.open(path)
            if im.mode != 'RGBA':
                print('%s: 不是 RGBA（先跑 white_to_alpha_frames.py）' % path)
                continue
            rgba = np.array(im)
            out = defringe(rgba, helper, band=args.band, radius=args.radius)
            if not np.array_equal(out, rgba):
                changed += 1
            Image.fromarray(out, 'RGBA').save(path)
        print('%s: %d/%d 帧做了颜色去污' % (char, changed, len(files)))
    return 0


if __name__ == '__main__':
    sys.exit(main())
