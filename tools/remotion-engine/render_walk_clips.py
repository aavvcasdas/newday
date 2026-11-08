#!/usr/bin/env python3
"""render_walk_clips.py — 把 v14 走路图集渲染成"横向走过舞台"的 GIF 预览

用法：
    python3 tools/remotion-engine/render_walk_clips.py            # 全部角色
    python3 tools/remotion-engine/render_walk_clips.py whale kimi # 指定角色

产物：assets/ai-girls/walk-v14/preview/<char>_walk.gif   动画（3 秒走过舞台）
      assets/ai-girls/walk-v14/preview/<char>_strip.png  8 帧静态条带
      assets/ai-girls/walk-v14/preview/walk_all8_sheet.png  3×3 汇总表

依赖：Pillow（仓库其它 Python 工具同款）
规格：8 帧图集 / 每帧 120ms 循环播放；视频 25fps，角色 3 秒从左走到右，
      脚底贴地、带接触阴影，用来肉眼检查"有没有真的在迈步、脚有没有踩实、有没有残腿"。
"""

import os
import sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
ART = os.path.join(ROOT, 'assets', 'ai-girls', 'walk-v14')
OUT = os.path.join(ART, 'preview')

CELL_W, CELL_H = 384, 416
ART_H = 372          # 图集里角色美术高度（脚底 = GROUND_Y）
CELL_GROUND = 406    # 单格内的脚底基线，条带按这条线对齐
FPS = 25
DUR = 3.0
STAGE_W, STAGE_H = 640, 400
GROUND_Y = 352
CHAR_H = 300         # 屏幕上角色高度：尽量放大，方便看抬腿/落脚
CHAR_MARGIN = 78     # 角色中心从左边走到右边的起终点
FRAME_MS = 120

CHARS = {
    'whale': 'whale_walk_side_2leg',
    'gpt': 'gpt_walk_2leg',
    'gpt_push': 'gpt_push_walk_2leg',
    'gemini': 'gemini_walk_2leg',
    'claude': 'claude_walk_2leg',
    'kimi': 'kimi_walk_2leg',
    'qwen': 'qwen_walk_2leg',
    'zai': 'zai_walk_2leg',
    'doubao': 'doubao_walk_side_2leg',
}


def font(size):
    try:
        return ImageFont.load_default(size=size)
    except TypeError:  # Pillow < 10
        return ImageFont.load_default()


def stage_bg():
    """夜色渐变舞台 + 地面，纯程序绘制（角色不会和背景混淆）。"""
    bg = Image.new('RGB', (STAGE_W, STAGE_H), (12, 18, 34))
    d = ImageDraw.Draw(bg)
    for y in range(STAGE_H):
        t = y / STAGE_H
        r = int(14 + 24 * t)
        g = int(22 + 32 * t)
        b = int(44 + 40 * t)
        d.line([(0, y), (STAGE_W, y)], fill=(r, g, b))
    # 远山（压在地平线附近，不挡住角色）
    d.polygon([(0, 250), (110, 196), (230, 248), (350, 200), (470, 246),
               (570, 208), (STAGE_W, 244), (STAGE_W, 330), (0, 330)],
              fill=(20, 30, 54))
    # 地面
    d.rectangle([0, GROUND_Y, STAGE_W, STAGE_H], fill=(26, 37, 60))
    d.line([(0, GROUND_Y), (STAGE_W, GROUND_Y)], fill=(78, 106, 152), width=2)
    # 地面刻度线（帮助判断是否匀速、是否有滑步）
    for x in range(-32, STAGE_W + 64, 64):
        d.line([(x, GROUND_Y + 1), (x - 26, STAGE_H)], fill=(34, 48, 76), width=1)
    return bg


def load_cells(atlas_name):
    img = Image.open(os.path.join(ART, atlas_name + '.png')).convert('RGBA')
    cells = []
    for i in range(8):
        c = clean_alpha(img.crop((i * CELL_W, 0, (i + 1) * CELL_W, CELL_H)))
        cells.append((c, c.getbbox()))
    return cells


def clean_alpha(im):
    """抗锯齿残留的极低 alpha 像素会在夜色背景上糊出一整块淡色矩形，先清干净。"""
    r, g, b, a = im.split()
    a = a.point(lambda v: 0 if v < 48 else (255 if v > 200 else v))
    out = Image.merge('RGBA', (r, g, b, a))
    return out


def scaled(cell, bbox, height):
    ch = cell.crop(bbox)
    w = max(1, int(round(ch.width * height / float(h_art(bbox)))))
    return ch.resize((w, int(round(height))), Image.LANCZOS)


def h_art(bbox):
    return bbox[3] - bbox[1]


def render_gif(char, atlas_name):
    cells = load_cells(atlas_name)
    bg = stage_bg()
    frames = []
    total = int(round(DUR * FPS))
    x0, x1 = CHAR_MARGIN, STAGE_W - CHAR_MARGIN
    label_font = font(14)
    for i in range(total):
        t = i / float(FPS)
        p = min(1.0, t / DUR)
        x = x0 + (x1 - x0) * p
        fi = int(t * 1000 // FRAME_MS) % 8
        cell, bbox = cells[fi]
        ch = scaled(cell, bbox, CHAR_H)
        w, h = ch.size

        frame = bg.copy()
        d = ImageDraw.Draw(frame)
        # 接触阴影（跟着身体走，落地感）
        d.ellipse([x - w * 0.32, GROUND_Y - 8, x + w * 0.32, GROUND_Y + 8],
                  fill=(16, 24, 40))
        frame.paste(ch, (int(round(x - w / 2)), int(round(GROUND_Y - h))), ch)
        # 帧号角标
        d = ImageDraw.Draw(frame)
        d.rectangle([STAGE_W - 108, 12, STAGE_W - 12, 38], fill=(10, 16, 30))
        d.text((STAGE_W - 98, 17), '%s  f%d/8' % (char, fi + 1),
               fill=(150, 190, 240), font=label_font)
        frames.append(frame)

    # 统一调色板（所有帧共用一张表）+ 无抖动：GIF 帧间差异小，体积能小一个量级。
    # 调色板必须从"含角色的若干帧"里取，否则角色的浅色会被吸进夜色背景里。
    montage = Image.new('RGB', (STAGE_W, STAGE_H * 4))
    for k, idx in enumerate((0, len(frames) // 3, len(frames) // 2, len(frames) - 1)):
        montage.paste(frames[idx], (0, k * STAGE_H))
    palette = montage.quantize(colors=128, method=Image.MEDIANCUT)
    quant = [f.quantize(palette=palette, dither=Image.Dither.NONE) for f in frames]
    out = os.path.join(OUT, '%s_walk.gif' % char)
    quant[0].save(out, save_all=True, append_images=quant[1:],
                  duration=int(1000 / FPS), loop=0, disposal=2, optimize=True)
    return out


def render_strip(char, atlas_name):
    """8 帧并排，脚底对齐同一条地面线 —— 静态检查抬腿幅度与落脚。"""
    cells = load_cells(atlas_name)
    cw, chh = 196, 232
    pad_top, pad_bottom = 20, 26
    sheet = Image.new('RGB', (cw * 8, pad_top + chh + pad_bottom), (16, 22, 38))
    d = ImageDraw.Draw(sheet)
    f = font(13)
    d.line([(0, pad_top + chh), (cw * 8, pad_top + chh)], fill=(78, 106, 152))
    for i, (cell, bbox) in enumerate(cells):
        # 底边一律取单元格基线，避免个别帧多出一两像素把"脚"顶高
        tight = cell.crop((bbox[0], bbox[1], bbox[2], CELL_GROUND))
        art = scaled(tight, (0, 0, tight.width, tight.height), chh - 8)
        # 让脚底落在统一地面线上
        x = i * cw + (cw - art.width) // 2
        y = pad_top + chh - art.height
        sheet.paste(art, (x, max(pad_top - 40, y)), art)
        d.text((i * cw + 6, 2), 'f%d' % (i + 1), fill=(150, 190, 240), font=f)
    d.text((6, pad_top + chh + 6), '%s - 8 frames / 120ms, feet on one ground line' % char,
           fill=(170, 200, 245), font=f)
    out = os.path.join(OUT, '%s_strip.png' % char)
    sheet.save(out)
    return out


def render_sheet(entries):
    """3×N 汇总表：每个角色裁剪到"天空 + 地面"的有效区间。"""
    top = max(0, GROUND_Y - CHAR_H - 26)
    band = stage_bg().crop((0, top, STAGE_W, GROUND_Y + 26))
    tw = 320
    th = int(round(band.height * tw / float(band.width)))
    cols = 3
    rows = (len(entries) + cols - 1) // cols
    sheet = Image.new('RGB', (tw * cols, (th + 20) * rows), (14, 20, 36))
    d = ImageDraw.Draw(sheet)
    f = font(15)
    for idx, (char, gif_path) in enumerate(entries):
        gif = Image.open(gif_path)
        gif.seek(3)  # 第 4 帧：双腿分开最明显
        thumb = gif.convert('RGB').crop((0, top, STAGE_W, GROUND_Y + 26))
        thumb = thumb.resize((tw, th), Image.LANCZOS)
        cx = (idx % cols) * tw
        cy = (idx // cols) * (th + 20)
        sheet.paste(thumb, (cx, cy + 20))
        d.text((cx + 8, cy + 2), char, fill=(170, 200, 245), font=f)
    out = os.path.join(OUT, 'walk_all8_sheet.png')
    sheet.save(out)
    return out


def main():
    os.makedirs(OUT, exist_ok=True)
    names = sys.argv[1:] or list(CHARS)
    entries = []
    for n in names:
        if n not in CHARS:
            print('skip', n)
            continue
        print('wrote', render_gif(n, CHARS[n]))
        print('wrote', render_strip(n, CHARS[n]))
        entries.append((n, os.path.join(OUT, '%s_walk.gif' % n)))
    if entries:
        print('wrote', render_sheet(entries))


if __name__ == '__main__':
    main()
