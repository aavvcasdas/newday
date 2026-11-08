#!/usr/bin/env python3
"""slice_walk_sheet.py — 把「四格走路姿态图」切成 4 张逐帧立绘

对标上游 pets 的做法：走路的每一帧都是**画出来的全身像**，不是从一张站姿里切腿。
一次生图能稳定产出 4 个姿态，所以每个角色只要 2 张四格图 = 8 帧。

用法：
    # 第一张四格图（上左/上右/下左/下右 → f1..f4）
    python3 tools/remotion-engine/slice_walk_sheet.py sheet_a.png --char whale --offset 1
    # 第二张（另外半套相位）→ f5..f8
    python3 tools/remotion-engine/slice_walk_sheet.py sheet_b.png --char whale --offset 5

产物：assets/ai-girls/walk-v14/frames/<char>/f1.png … f8.png
之后 `node tools/remotion-engine/build_walk_v14.mjs <char>` 会直接按逐帧成品拼图集。

切法不是"死板对半分四格"（生成图里人物经常越过格子中线，死切会把腿/鞋削掉）：
  1. 先擦掉每格底部那条地面线（只擦"细且横贯"的深色行，别把黑衣服擦了）；
  2. 从四个格子的中心各自做一次连通填充，得到"这一格的那个人"的像素集合；
  3. 按每格自己的包围盒裁出来，留白边 → 一帧一张。
这样即使人物越界，也只会拿到他自己那一坨，不会把隔壁的腿/尾巴带进来。
"""

import argparse
import os
import sys
from collections import deque

import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
FRAME_ROOT = os.path.join(ROOT, 'assets', 'ai-girls', 'walk-v14', 'frames')

WHITE = 250        # 亮度低于此值算"有内容"
LINEDARK = 215     # 地面线亮度上限（生成图的地面线常常是浅灰，阈值压太低会漏）
LINE_SAT = 32      # 地面线饱和度上限
LINE_FRAC = 0.5    # 一行里深色像素占比
LINE_MAX = 12      # 只擦这么厚的横线（更厚的是黑色衣服/头发）
DS = 4             # 连通填充在 1/4 分辨率上做，快且够用


def find_ground_lines(arr, x0=0, x1=None):
    """在 [x0,x1) 这个列带里找出地面线行号（细、且该列带里深色低饱和占比高）。

    必须按列带分别算：一张 2×2 图里每格各画各的地面线，
    按整张图宽度算占比会掉到阈值以下，线就漏掉了（残渣会跟着人物一起被切进来）。
    """
    h, w, _ = arr.shape
    if x1 is None:
        x1 = w
    band = arr[:, x0:x1]
    mn = band.min(axis=2)
    mx = band.max(axis=2)
    dark = (mn < LINEDARK) & ((mx - mn) < LINE_SAT)
    frac = dark.mean(axis=1)
    rows = frac >= LINE_FRAC
    out = []
    y = 0
    while y < h:
        if not rows[y]:
            y += 1
            continue
        y2 = y
        while y2 + 1 < h and rows[y2 + 1]:
            y2 += 1
        # 线的下边缘常有一条半透明抗锯齿行（占比 0.3~0.5），不跟着并进来
        # 它会被当成"线下方还有内容"，整条线就被否掉了（whale_b 就漏了底格那条）。
        while y2 + 1 < h and frac[y2 + 1] >= 0.3:
            y2 += 1
        # 只有"上下都是白底"的薄横线才算地面线。
        # 不然头发/黑衣服那种又宽又厚的暗色块会被当线擦掉（会把人脸擦出两条白杠）。
        # 上下邻域要用**连续占比**判断：头发块上下也都是 0.4~0.5，只是没过 0.5 的阈值，
        # 用布尔值判断会误当成"白底"放过去。
        if y2 - y + 1 <= LINE_MAX:
            above = frac[max(0, y - 8):y]
            below = frac[y2 + 1:min(h, y2 + 9)]
            nb = np.concatenate([above, below]) if len(above) + len(below) else np.array([1.0])
            # 用**平均值**而不是最大值：线旁边常有一两行抗锯齿（0.3~0.4），
            # 用最大值会把整条线否掉（claude_b 底格那条就是这么漏的）；
            # 而头发/黑衣服上下整片都是 0.4+，平均值一定过不了阈值。
            if float(nb.mean()) <= 0.35:
                out.append((y, y2))
        y = y2 + 1
    return out


def remove_ground_lines(arr, groups=None, x0=0, x1=None):
    """擦掉地面线：细（<=LINE_MAX 行）且在该列带里深色低饱和占比高的行。"""
    h, w, _ = arr.shape
    if x1 is None:
        x1 = w
    if groups is not None:
        for y, y2 in groups:
            arr[y:y2 + 1, x0:x1, :] = 255
        return arr, sum(y2 - y + 1 for y, y2 in groups)
    mn = arr.min(axis=2)
    mx = arr.max(axis=2)
    dark = (mn < LINEDARK) & ((mx - mn) < LINE_SAT)
    rows = dark.mean(axis=1) >= LINE_FRAC
    erased = 0
    y = 0
    while y < h:
        if not rows[y]:
            y += 1
            continue
        y2 = y
        while y2 + 1 < h and rows[y2 + 1]:
            y2 += 1
        if y2 - y + 1 <= LINE_MAX:
            arr[y:y2 + 1, :, :] = 255
            erased += y2 - y + 1
        y = y2 + 1
    return arr, erased


def blob_from(mask_small, seed):
    """4 连通填充，返回同一块布尔掩码（小图坐标）。"""
    h, w = mask_small.shape
    sx, sy = seed
    if not (0 <= sy < h and 0 <= sx < w) or not mask_small[sy, sx]:
        # 种子落在白底上：就近找一个有内容的像素
        found = None
        best = 1e9
        ys, xs = np.nonzero(mask_small)
        if len(xs) == 0:
            return None
        d = (xs - sx) ** 2 + (ys - sy) ** 2
        i = int(np.argmin(d))
        sx, sy = int(xs[i]), int(ys[i])
    out = np.zeros_like(mask_small)
    q = deque([(sx, sy)])
    out[sy, sx] = True
    while q:
        x, y = q.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and mask_small[ny, nx] and not out[ny, nx]:
                out[ny, nx] = True
                q.append((nx, ny))
    return out



def keep_main_components(mask, frac=0.03, min_px=20):
    """去掉远处的小碎块（隔壁格子的发梢/地面线残渣），保留所有够大的连通块。

    只在"面积占比"上做过滤，绝不做"选最大那一块"——
    生成图里人物的腿、头发常常不相连，选最大块会把半个身子丢掉。
    """
    h, w = mask.shape
    hs, ws = max(1, h // DS), max(1, w // DS)
    sm = mask[:hs * DS, :ws * DS].reshape(hs, DS, ws, DS).any(axis=(1, 3))
    seen = np.zeros_like(sm)
    comps = []
    for sy in range(hs):
        for sx in range(ws):
            if not sm[sy, sx] or seen[sy, sx]:
                continue
            q = deque([(sx, sy)])
            seen[sy, sx] = True
            keep = []
            while q:
                x, y = q.popleft()
                keep.append((x, y))
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < ws and 0 <= ny < hs and sm[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        q.append((nx, ny))
            comps.append(keep)
    if not comps:
        return mask
    biggest = max(len(c) for c in comps)
    need = max(min_px, frac * biggest)
    out_small = np.zeros_like(sm)
    for c in comps:
        if len(c) >= need:
            for x, y in c:
                out_small[y, x] = True
    big = np.repeat(np.repeat(out_small, DS, axis=0), DS, axis=1)
    out = np.zeros_like(mask)
    out[:big.shape[0], :big.shape[1]] = big
    return mask & out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('sheet')
    ap.add_argument('--char', required=True)
    ap.add_argument('--offset', type=int, default=1, choices=(1, 5),
                    help='1 → 写 f1..f4；5 → 写 f5..f8')
    ap.add_argument('--pad', type=int, default=8, help='裁切后四周留白像素')
    ap.add_argument('--inset', type=float, default=0.01,
                    help='每格向内收的比例，躲掉格子之间的串味（默认 1%%）')
    ap.add_argument('--keep-min', type=float, default=0.03,
                    help='碎块面积不到最大块的这个比例就丢掉（默认 3%%）')
    args = ap.parse_args()

    img = Image.open(args.sheet).convert('RGB')
    raw = np.array(img)
    h, w, _ = raw.shape

    # 直接按格子切：左上/右上/左下/右下。不用连通块——
    # 生成图里人物的发梢/尾巴经常粘到隔壁，连通块一裁就会把身体裁掉一截。
    # 每格向内收 inset，避免把隔壁的边角带进来。
    inset_x, inset_y = int(w * args.inset), int(h * args.inset)
    hw, hh = w // 2, h // 2
    quadrants = [(0, 0), (1, 0), (0, 1), (1, 1)]
    boxes = [
        (inset_x, inset_y, hw - inset_x, hh - inset_y),
        (hw + inset_x, inset_y, w - inset_x, hh - inset_y),
        (inset_x, hh + inset_y, hw - inset_x, h - inset_y),
        (hw + inset_x, hh + inset_y, w - inset_x, h - inset_y),
    ]

    out_dir = os.path.join(FRAME_ROOT, args.char)
    os.makedirs(out_dir, exist_ok=True)
    meta_path = os.path.join(out_dir, 'meta.json')
    meta = {}
    if os.path.exists(meta_path):
        import json
        with open(meta_path) as fh:
            meta = json.load(fh)

    erased = 0
    for i, box in enumerate(boxes):
        bx0, by0, bx1, by1 = box
        piece = raw[by0:by1, bx0:bx1].copy()

        # 这一格自己的地面线：只在"这一格所在的行带"里找，而且必须贴着这一格的底部。
        # 不贴底部的细横线是人物身上的花纹/裙边，擦掉会在身上划一道（gpt_push f8 的裂痕）。
        groups_here = find_ground_lines(raw, bx0, bx1)
        mid_y = h // 2
        row_q = quadrants[i][1]
        row_top = 0 if row_q == 0 else mid_y
        row_h = mid_y if row_q == 0 else h - mid_y
        near_bottom = row_top + int(0.8 * row_h)
        for (gy0, gy1) in groups_here:
            if by0 <= gy0 < by1 and gy1 >= near_bottom:
                piece[max(0, gy0 - by0 - 1):max(0, gy1 - by0 + 2), :, :] = 255
                erased += gy1 - gy0 + 1

        # 白底 → 透明，只留人物（再扫掉隔壁格子漏进来的小碎块）
        mask = keep_main_components(piece.min(axis=2) < WHITE, frac=args.keep_min)
        if not mask.any():
            print('第 %d 格是空的，跳过' % (i + 1))
            continue
        ys, xs = np.nonzero(mask)
        x0, x1 = int(xs.min()), int(xs.max())
        y0, y1 = int(ys.min()), int(ys.max())

        sub = mask[y0:y1 + 1, x0:x1 + 1]
        crop = piece[y0:y1 + 1, x0:x1 + 1]
        th = (y1 - y0 + 1) + args.pad * 2
        tw = (x1 - x0 + 1) + args.pad * 2
        tile = np.zeros((th, tw, 4), np.uint8)
        tile[:, :, :3] = 255
        tile[args.pad:args.pad + crop.shape[0], args.pad:args.pad + crop.shape[1], :3] = crop
        tile[args.pad:args.pad + crop.shape[0], args.pad:args.pad + crop.shape[1], 3] = \
            np.where(sub, 255, 0).astype(np.uint8)

        name = 'f%d' % (args.offset + i)
        path = os.path.join(out_dir, name + '.png')
        Image.fromarray(tile, 'RGBA').save(path)

        ground = None
        for (gy0, gy1) in groups_here:
            if by0 <= gy0 < by1 and gy1 >= near_bottom:
                ground = (gy1 - by0) - (y0 - 0) + args.pad
        if ground is not None and not (0 < ground < th):
            ground = None
        meta[name] = {'groundY': ground, 'w': int(tw), 'h': int(th)}
        print('wrote %s  %dx%d  groundY=%s' % (path, tw, th, ground))

    import json
    with open(meta_path, 'w') as fh:
        json.dump(meta, fh, indent=2, sort_keys=True)
    print('擦掉地面线 %d 行' % erased)
    have = [f for f in os.listdir(out_dir) if f.startswith('f') and f.endswith('.png')]
    if len(have) >= 8:
        print('%s 已有 8 帧，跑 node tools/remotion-engine/build_walk_v14.mjs %s 出图集'
              % (args.char, args.char))
    else:
        print('%s 还差另外半套四格图（--offset %s）'
              % (args.char, 5 if args.offset == 1 else 1))


if __name__ == '__main__':
    sys.exit(main())
