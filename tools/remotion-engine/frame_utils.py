#!/usr/bin/env python3
"""RGBA 缩放小工具：**预乘**再缩放，避免透明区域的白色被插值进剪影边缘。

这是「白边」的第二半原因，和抠图无关：
PIL 的 `Image.resize()` 对 RGBA 是四个通道各自插值，而透明像素的 RGB 通常是
255（白底抠出来的残留）。于是边缘每一像素都被"白"染了一次 —— 素材本身干净，
一旦缩小到 372 像素高再贴到深色舞台上，就是一圈很明显的白边。
把颜色预乘 alpha 再缩放、缩完反预乘，就不会有这个问题（等价于在
"已经合成到背景上"的样子里做插值）。
"""

import numpy as np
from PIL import Image


def resize_rgba(im, size, resample=Image.LANCZOS):
    """预乘 alpha 的 resize；im 必须是 RGBA，size=(w,h)。"""
    im = im.convert('RGBA')
    arr = np.asarray(im).astype(np.float32)
    if arr.size == 0:
        return im.resize(size, resample)
    a = arr[..., 3:4] / 255.0
    pre = np.concatenate([arr[..., :3] * a, arr[..., 3:4]], axis=2)
    small = np.asarray(Image.fromarray(pre.astype(np.uint8), 'RGBA').resize(size, resample))
    small = small.astype(np.float32)
    a2 = small[..., 3:4] / 255.0
    with np.errstate(divide='ignore', invalid='ignore'):
        rgb = np.where(a2 > 0.004, small[..., :3] / np.maximum(a2, 1e-3), 0.0)
    out = np.concatenate([np.clip(rgb, 0, 255), small[..., 3:4]], axis=2)
    return Image.fromarray(out.astype(np.uint8), 'RGBA')
