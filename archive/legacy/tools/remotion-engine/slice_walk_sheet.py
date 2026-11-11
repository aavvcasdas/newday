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




def background_mask(rgb, white=WHITE):
    """纯白**且和画面边缘连通**的像素才是背景。

    早先直接按 `min(rgb) >= 250` 判背景，白色蕾丝/围裙上的高光也会被当成背景抠掉，
    成品就在白花边上留下一圈深色针眼（鲸娘女仆头饰最明显）。
    这里从四条边做一次扩张（等价于 4 连通 flood fill，但用 numpy 位移，不需要 scipy），
    只有连到边上的白才算背景；人物内部包住的纯白继续留在身上。
    """
    white_px = rgb.min(axis=2) >= white
    bg = np.zeros_like(white_px)
    bg[0, :] = white_px[0, :]
    bg[-1, :] = white_px[-1, :]
    bg[:, 0] = white_px[:, 0]
    bg[:, -1] = white_px[:, -1]
    while True:
        nb = bg.copy()
        nb[1:, :] |= bg[:-1, :]
        nb[:-1, :] |= bg[1:, :]
        nb[:, 1:] |= bg[:, :-1]
        nb[:, :-1] |= bg[:, 1:]
        nb &= white_px
        if np.array_equal(nb, bg):
            return bg
        bg = nb


def _band_distance(inside, steps=2):
    """每个像素离背景有多远（像素数）。背景=0，人物边缘=1、2、…，更里层记 steps+1。"""
    d = np.zeros(inside.shape, np.int16)
    cur = ~inside
    for k in range(1, steps + 1):
        grow = cur.copy()
        grow[1:, :] |= cur[:-1, :]
        grow[:-1, :] |= cur[1:, :]
        grow[:, 1:] |= cur[:, :-1]
        grow[:, :-1] |= cur[:, 1:]
        d[grow & ~cur] = k
        cur = grow
    d[inside & (d == 0)] = steps + 1
    return d


def _box_mean(arr, mask, r):
    """在 mask 内做 (2r+1)² 的均值，返回 (mean, 有效像素数)。用积分图，不依赖 scipy。"""
    a = (arr * mask[..., None]).astype(np.float64)
    w = mask.astype(np.float64)
    h_img, w_img = mask.shape
    pad = r + 1

    def integral(x):
        ii = np.zeros((x.shape[0] + 1, x.shape[1] + 1) + x.shape[2:], np.float64)
        ii[1:, 1:] = x.cumsum(0).cumsum(1)
        return ii

    def window(ii):
        # 越界用边缘复制，避免 r 大于图像尺寸时越界
        y0 = np.clip(np.arange(h_img) - r, 0, h_img)
        y1 = np.clip(np.arange(h_img) + r + 1, 0, h_img)
        x0 = np.clip(np.arange(w_img) - r, 0, w_img)
        x1 = np.clip(np.arange(w_img) + r + 1, 0, w_img)
        return (ii[np.ix_(y1, x1)] - ii[np.ix_(y0, x1)]
                - ii[np.ix_(y1, x0)] + ii[np.ix_(y0, x0)])

    num = window(integral(a))
    den = window(integral(w))
    mean = np.where(den[..., None] > 0, num / np.maximum(den, 1e-6)[..., None], 0.0)
    return mean, den



def white_holes(inside, rgb, min_area=1200, flat=246, ds=2):
    """被人物包住的**大块纯白** = 背景（发辫/尾巴围出来的空洞），要从人物里去掉。

    `background_mask()` 只认「连到画面边缘的白」，所以马尾和后背之间那块白、
    龙娘尾巴圈起来的那块白都留在了身上 —— 贴到深色舞台上就是一块白斑
    （gemini f5~f8、zai 全部、gpt 尾巴里都可复现）。

    这里退一步用面积判据：小块的纯白是蕾丝/围裙高光（几百像素），
    空洞是上千像素。阈值 1200 是在 9 个角色的 8 帧上量出来的：
    空洞最小 1290（gemini f8），高光最大 750（qwen f3）。
    """
    h, w = inside.shape
    hs, ws = max(1, h // ds), max(1, w // ds)
    cand = (inside & (rgb.min(axis=2) >= flat))[:hs * ds, :ws * ds]
    small = cand.reshape(hs, ds, ws, ds).all(axis=(1, 3))
    seen = np.zeros_like(small)
    holes = np.zeros_like(small)
    for sy in range(hs):
        for sx in range(ws):
            if not small[sy, sx] or seen[sy, sx]:
                continue
            q = deque([(sx, sy)])
            seen[sy, sx] = True
            comp = []
            while q:
                x, y = q.popleft()
                comp.append((x, y))
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < ws and 0 <= ny < hs and small[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        q.append((nx, ny))
            if len(comp) * ds * ds >= min_area:
                for x, y in comp:
                    holes[y, x] = True
    big = np.repeat(np.repeat(holes, ds, axis=0), ds, axis=1)
    out = inside.copy()
    out[:big.shape[0], :big.shape[1]] = inside[:big.shape[0], :big.shape[1]] & ~big
    return out


def _nearest_inner_colour(rgb, dist, band, radius=5):
    """每个 band 内像素取**最近里层像素**的颜色（沿法线方向的那一个）。

    早先用半径 2 的方框均值当里层颜色，窗口会同时吃到贴边的**墨线**（暗）
    和再里层的**发色/裙色**（亮），均值就成了中间调 —— 换完边缘是一圈
    「半亮」的环，深色底上照样看得见（gemini 的浅发最明显）。
    这里改成找最近的一个 dist>band 的像素，原样搬它的颜色，墨线就还是墨线。
    """
    h, w = dist.shape
    pad = radius + 1
    dp = np.pad(dist, pad, mode='constant', constant_values=0)
    cp = np.pad(rgb, ((pad, pad), (pad, pad), (0, 0)), mode='edge')
    out = rgb.copy()
    filled = np.zeros(dist.shape, bool)
    offs = sorted(((dy, dx) for dy in range(-radius, radius + 1)
                   for dx in range(-radius, radius + 1)
                   if (dy or dx) and dy * dy + dx * dx <= radius * radius),
                  key=lambda o: o[0] ** 2 + o[1] ** 2)
    need = dist <= band
    for dy, dx in offs:
        src_d = dp[pad + dy:pad + dy + h, pad + dx:pad + dx + w]
        src_c = cp[pad + dy:pad + dy + h, pad + dx:pad + dx + w]
        ok = need & ~filled & (src_d > band)
        if ok.any():
            out[ok] = src_c[ok]
            filled |= ok
        if (need & ~filled).sum() == 0:
            break
    return out, filled


def white_to_alpha(piece, inside=None, white=WHITE, soft=22.0, band=2, color_radius=2):
    """白底 → 透明，并且把边缘那一圈"被白底冲淡"的颜色换成里层颜色。

    直接二值抠白（min(rgb)<250 ? 不透明 : 透明）会把抗锯齿边缘整圈留成**白边**：
    边缘像素本来是"人物色 × 白底"的混合，二值化之后它就变成一圈浅色，贴在深色
    舞台上就是明显的白轮廓。早先只做"紧邻背景一圈给 alpha 坡 + 反预乘"，但
    斜坡判据是 (255-min(rgb))/22，只要像素稍暗就算满不透明，实际上还是二值，
    颜色也只是把白减掉一半 —— 深色角色（鲸娘/龙娘的黑裙子）边上照样一条亮线。

    现在的做法（合成上的标准 defringe）：
      1. 算出每个像素离背景几像素（dist）；
      2. dist 1..band 的像素，颜色**直接取里层 dist>band 的平均色**（颜色去污）；
         找不到里层像素（极细的发丝尖）就保持原色，不硬换；
      3. 这一圈的 alpha 用**反混合**求：P = a·C + (1-a)·255 ⇒ a = (255-P)/(255-C)，
         逐通道求再取中位数（只统计 255-C>25 的通道，浅色衣服自动跳过）；
      4. 里层像素 alpha 恒为 255、颜色不动。
    这样最外一圈又软又没有白，剪影也不会被"吃"掉一整像素。
    """
    rgb = piece.astype(np.float32)
    if inside is None:
        inside = rgb.min(axis=2) < white
    inside = white_holes(inside, rgb)
    dist = _band_distance(inside, steps=band)

    # 里层颜色（dist > band），找不到就退回到更大掩码的均值
    C, filled = _nearest_inner_colour(rgb, dist, band, radius=5)
    den = filled.astype(np.int32)

    edge = inside & (dist <= band)
    has_c = edge & (den > 0)

    # 反混合求 alpha：只用 (255-C) 够大的通道，避免浅色（接近白）的衣服解出噪声
    d_ch = 255.0 - C
    usable = d_ch > 25.0
    with np.errstate(divide='ignore', invalid='ignore'):
        a_ch = (255.0 - rgb) / np.where(usable, d_ch, 1.0)
    a_ch = np.where(usable, a_ch, np.nan)
    order = np.argsort(np.where(np.isnan(a_ch), 2.0, a_ch), axis=2)
    a_sorted = np.take_along_axis(a_ch, order, axis=2)
    n_usable = usable.sum(axis=2)
    mid = np.clip((n_usable - 1) // 2, 0, 2)
    a_est = np.take_along_axis(a_sorted, mid[..., None], axis=2)[..., 0]
    a_est = np.where(n_usable > 0, a_est, 1.0)
    a_est = np.clip(np.nan_to_num(a_est, nan=1.0), 0.0, 1.0)

    # 只在这一圈用新 alpha；里层 1.0，背景 0.0
    a = np.where(has_c, a_est, np.where(edge, 0.55, 1.0))
    a[~inside] = 0.0

    out = np.where(has_c[..., None], C, rgb)
    out = np.where(inside[..., None], out, 255.0)
    return np.clip(out, 0, 255).astype(np.uint8), (a * 255.0).astype(np.uint8)


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

        # 生成图有时把地面线画在脚的紧下方、但不落在上面那条"贴底"的判定里
        # （whale_b 的两格就是这样），它横贯整格、只有 1~3 行，留在包围盒里
        # 就是脚下一根黑杠。只在最下面 12% 找：深色低饱和占比 >= 0.5、且上面几行明显更空。
        bot = int(piece.shape[0] * 0.88)
        mn_p = piece.min(axis=2)
        mx_p = piece.max(axis=2)
        dfrac = ((mn_p < LINEDARK) & ((mx_p - mn_p) < LINE_SAT)).mean(axis=1)
        for gy in range(bot, piece.shape[0]):
            if dfrac[gy] >= 0.5 and dfrac[max(0, gy - 3):gy].mean() < 0.35:
                piece[gy, :, :] = 255
                erased += 1

        # 白底 → 透明，只留人物（再扫掉隔壁格子漏进来的小碎块）
        mask = keep_main_components(~background_mask(piece), frac=args.keep_min)
        if not mask.any():
            print('第 %d 格是空的，跳过' % (i + 1))
            continue
        ys, xs = np.nonzero(mask)
        x0, x1 = int(xs.min()), int(xs.max())
        y0, y1 = int(ys.min()), int(ys.max())

        sub = mask[y0:y1 + 1, x0:x1 + 1]
        crop = piece[y0:y1 + 1, x0:x1 + 1]

        # 脚下方那条地面线（whale_b 的两格）：在**人物宽度**上占比>=0.5，而鞋子只有 0.15，
        # 很容易分开；裁进包围盒之后就是脚下一根黑杠。擦成白底、同时从掩码里去掉，
        # 这样 groundY 的兜底也还是落在脚上。
        ch, cw = crop.shape[:2]
        mnc = crop.min(axis=2)
        mxc = crop.max(axis=2)
        dfc = ((mnc < LINEDARK) & ((mxc - mnc) < LINE_SAT)).mean(axis=1)
        for gy in range(max(0, ch - int(ch * 0.18)), ch):
            if dfc[gy] >= 0.5 and dfc[max(0, gy - 3):gy].mean() < 0.35:
                crop[gy, :, :] = 255
                sub[gy, :] = False
                mask[y0 + gy, x0:x0 + cw] = False
                erased += 1
        th = (y1 - y0 + 1) + args.pad * 2
        tw = (x1 - x0 + 1) + args.pad * 2
        tile = np.zeros((th, tw, 4), np.uint8)
        tile[:, :, :3] = 255
        color, alpha = white_to_alpha(crop, sub)
        alpha = np.where(sub, alpha, 0)
        tile[args.pad:args.pad + crop.shape[0], args.pad:args.pad + crop.shape[1], :3] = color
        tile[args.pad:args.pad + crop.shape[0], args.pad:args.pad + crop.shape[1], 3] = alpha

        name = 'f%d' % (args.offset + i)
        path = os.path.join(out_dir, name + '.png')
        Image.fromarray(tile, 'RGBA').save(path)

        ground = None
        for (gy0, gy1) in groups_here:
            if by0 <= gy0 < by1 and gy1 >= near_bottom:
                ground = (gy1 - by0) - (y0 - 0) + args.pad
        if ground is not None and not (0 < ground < th):
            ground = None
        if ground is None:
            # 没画地面线（zai_b 就是这样）时的兜底：取**身体中段那一带**的最低不透明像素。
            # 不能直接用整格包围盒底边——长发/裙摆垂到地上，会把整个人顶到半空。
            wspan = x1 - x0 + 1
            cx0 = x0 + int(wspan * 0.22)
            cx1 = x0 + max(int(wspan * 0.78), cx0 + 1)
            col = mask[:, cx0:cx1 + 1]
            rows_any = np.nonzero(col.any(axis=1))[0]
            if len(rows_any):
                ground = int(rows_any.max()) - y0 + args.pad
                if not (0 < ground < th):
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
