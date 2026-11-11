#!/usr/bin/env python3
"""把「一排 N 个走路姿态」重新排成标准 2×2 四格图，好让 slice_walk_sheet.py 切。

生成图并不总是听话：让它出 2×2，它有时给 1×4、2×4，图还会顶到画布边被切掉一截。
slice_walk_sheet.py 只认「四象限」这一种几何，所以先用这个脚本把任意排布的姿态
**按人物包围盒重新摆一遍**：

  1. 先擦掉跨整行的深色横线（生成图爱在脚下画一条地面线，它会撑大包围盒、
     让角色看起来飘在半空）；
  2. 按列投影切出每个完整人物，记包围盒；
  3. 全体用**同一个缩放系数**（不各自缩放，否则八帧里人会忽大忽小）；
  4. 脚底统一对齐到格子同一条地面线，水平居中；
  5. 输出白底 2×2 四格图。

用法：
    python3 tools/remotion-engine/pack_walk_row.py row1.png row2.png --out grid.png
    # 两个 row 一共正好 4 个人物；多于 4 个时只取前 4 个并给出提示
"""

import argparse
import os
import sys

import numpy as np
from PIL import Image

WHITE = 246


def erase_rules(raw):
    """擦掉跨整行的横线（地面线），返回新的 RGB 图 + 擦掉的像素行数。

    生成图的脚下那条线会横贯整行，按列投影切人物时它把四个小人连成一块，
    还会撑大包围盒、让角色看起来飘在半空。判据用「这一行几乎全是非白像素」：
    四个小人并排最多也占不满 100% 的宽度，横线则是 100%。
    """
    img = raw.copy()
    h, w, _ = img.shape
    nonwhite = (raw.min(axis=2) < WHITE)
    frac = nonwhite.mean(axis=1)
    erased = 0
    y = 0
    while y < h:
        if frac[y] >= 0.85:
            y2 = y
            while y2 + 1 < h and frac[y2 + 1] >= 0.7:
                y2 += 1
            img[max(0, y - 1):min(h, y2 + 2), :, :] = 255
            erased += y2 - y + 1
            y = y2 + 1
        else:
            y += 1
    return img, erased


def figure_boxes(img):
    """按列投影切出人物。

    不能用「找全白的列」：小人的手臂/裙摆常常只差 2~3 像素就连在一起，
    更常见的是某个小人的发梢探到隔壁那一列。这里改为找**投影的谷底**：
    一列的非白像素数低于（最高列的 8%）就算分隔带，谷底中点作为切线。
    """
    h, w, _ = img.shape
    content = img.min(axis=2) < WHITE
    colcount = content.sum(axis=0).astype(np.float64)
    if colcount.max() <= 0:
        return []
    # 3 像素平滑，免得单根发丝噪声决定切线
    kern = np.ones(5) / 5.0
    smooth = np.convolve(colcount, kern, mode='same')
    thr = max(2.0, 0.22 * smooth.max())
    cuts = []
    x = 0
    while x < w:
        if smooth[x] < thr:
            x2 = x
            while x2 + 1 < w and smooth[x2 + 1] < thr:
                x2 += 1
            cuts.append((x + x2) // 2)
            x = x2 + 1
        else:
            x += 1
    edges = [0] + [c for c in cuts if 0 < c < w] + [w]
    boxes = []
    for x0, x1 in zip(edges[:-1], edges[1:]):
        if x1 - x0 < 8:
            continue
        sub = content[:, x0:x1]
        ys = np.nonzero(sub.any(axis=1))[0]
        xs = np.nonzero(sub.any(axis=0))[0]
        if len(ys) == 0 or len(xs) == 0:
            continue
        boxes.append((x0 + int(xs.min()), int(ys.min()), x0 + int(xs.max()) + 1, int(ys.max()) + 1))
    if boxes:
        widest = max(b[2] - b[0] for b in boxes)
        boxes = [b for b in boxes if (b[2] - b[0]) > 0.2 * widest]
    return boxes


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('images', nargs='+', help='一排姿态图的路径（每个里面可以是 1~N 个人物）')
    ap.add_argument('--out', required=True)
    ap.add_argument('--target-h', type=int, default=360, help='人物统一高度（像素）')
    ap.add_argument('--margin', type=int, default=26, help='脚底到格子底边、头顶到格子顶边的留白')
    ap.add_argument('--cols', type=int, default=2)
    ap.add_argument('--rows', type=int, default=2)
    ap.add_argument('--equal-cols', type=int, default=0,
                    help='按等宽列切（生成图大多是等距排布的，比找投影谷底稳）')
    args = ap.parse_args()

    figs, skipped = [], 0
    for path in args.images:
        raw = np.array(Image.open(path).convert('RGB'))
        clean, erased = erase_rules(raw)
        if args.equal_cols:
            n = args.equal_cols
            content = clean.min(axis=2) < WHITE
            boxes = []
            for i in range(n):
                x0, x1 = clean.shape[1] * i // n, clean.shape[1] * (i + 1) // n
                sub = content[:, x0:x1]
                if not sub.any():
                    continue
                # 等宽列的边上常常带进隔壁那一位的尾巴尖/发梢：
                # 按"这一列里的横向连续段"分组，段高不到最高段 45% 的就是碎片，丢掉。
                cols_any = sub.any(axis=0)
                runs, x = [], 0
                while x < sub.shape[1]:
                    if cols_any[x]:
                        x2 = x
                        while x2 + 1 < sub.shape[1] and cols_any[x2 + 1]:
                            x2 += 1
                        runs.append((x, x2))
                        x = x2 + 1
                    else:
                        x += 1
                if not runs:
                    continue
                heights = [int(sub[:, a:b + 1].any(axis=1).sum()) for a, b in runs]
                keep = [r for r, hgt in zip(runs, heights) if hgt >= 0.45 * max(heights)]
                a = min(r[0] for r in keep)
                b = max(r[1] for r in keep)
                part = sub[:, a:b + 1]
                ys = np.nonzero(part.any(axis=1))[0]
                boxes.append((x0 + a, int(ys.min()), x0 + b + 1, int(ys.max()) + 1))
        else:
            boxes = figure_boxes(clean)
        print('%s: %d 个人物，擦掉 %d 行地面线' % (os.path.basename(path), len(boxes), erased))
        for (x0, y0, x1, y1) in boxes:
            figs.append(Image.fromarray(clean[y0:y1, x0:x1], 'RGB'))
    need = args.cols * args.rows
    if len(figs) < need:
        print('只切出 %d 个人物，不够 %d 个，退出' % (len(figs), need))
        return 1
    if len(figs) > need:
        skipped = len(figs) - need
        figs = figs[:need]

    k = args.target_h / max(f.height for f in figs)
    scaled = [(f, (max(1, round(f.width * k)), max(1, round(f.height * k)))) for f in figs]
    cw = max(s[1][0] for s in scaled) + args.margin * 2
    ch = args.target_h + args.margin * 2
    sheet = Image.new('RGB', (cw * args.cols, ch * args.rows), (255, 255, 255))
    for i, (f, (w2, h2)) in enumerate(scaled):
        f2 = f.resize((w2, h2), Image.LANCZOS)
        c, r = i % args.cols, i // args.cols
        sheet.paste(f2, (c * cw + (cw - w2) // 2, r * ch + ch - args.margin - h2))
    sheet.save(args.out)
    print('wrote %s %dx%d（统一缩放 %.3f，跳过 %d 个多余人物）'
          % (args.out, sheet.width, sheet.height, k, skipped))
    return 0


if __name__ == '__main__':
    sys.exit(main())
