#!/usr/bin/env python3
"""把「白底 RGB 帧」就地转成「带柔边 alpha 的 RGBA 帧」。

走路的逐帧立绘通常来自 2×2 生成图，抠白由 slice_walk_sheet.py 负责。
但有几个角色（kimi）的帧不是从四格图切的，落盘时还是**白底 RGB**，
构建图集时只能走 JS 里那套二值抠白 —— 边缘那一圈就是白边。

这里用和切片器同一套逻辑重做一次：
  1. 只有连到画面边缘的纯白才算背景（白色蕾丝/围裙上的高光不会被抠出针眼）；
  2. 紧邻背景的一圈给 alpha 坡 + 反预乘，把混进去的白底减掉。

用法：
    python3 tools/remotion-engine/white_to_alpha_frames.py kimi
    python3 tools/remotion-engine/white_to_alpha_frames.py kimi --dir assets/ai-girls/walk-v14/frames
"""

import argparse
import glob
import importlib.util
import os
import sys

import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))


def load_helpers():
    path = os.path.join(ROOT, 'tools', 'remotion-engine', 'slice_walk_sheet.py')
    spec = importlib.util.spec_from_file_location('slice_walk_sheet', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.white_to_alpha, module.background_mask


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('chars', nargs='+')
    ap.add_argument('--dir', default=os.path.join(ROOT, 'assets/ai-girls/walk-v14/frames'))
    ap.add_argument('--force', action='store_true', help='已经是 RGBA 也重做一遍')
    args = ap.parse_args()

    white_to_alpha, background_mask = load_helpers()
    changed = 0
    for char in args.chars:
        for path in sorted(glob.glob(os.path.join(args.dir, char, 'f*.png'))):
            im = Image.open(path)
            if im.mode == 'RGBA' and not args.force:
                continue
            rgb = np.array(im.convert('RGB'))
            inside = ~background_mask(rgb)
            color, alpha = white_to_alpha(rgb, inside)
            Image.fromarray(np.dstack([color, alpha]), 'RGBA').save(path)
            print('converted', os.path.relpath(path, ROOT),
                  'alpha0=%.2f' % ((alpha == 0).mean()))
            changed += 1
    print('%d frame(s) converted' % changed)
    return 0


if __name__ == '__main__':
    sys.exit(main())
