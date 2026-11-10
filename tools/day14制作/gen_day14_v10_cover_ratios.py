#!/usr/bin/env python3
"""Day14 v10 的 3:4 / 4:3 两版无字封面。

用户更正（2026-11-09）：封面图里不写文案，只出 3:4 / 4:3 两个比例；
文案单独写进 `Day/Day14/Day14文案_待审.md`（格式照 Day13 的 `Day13文案_待审.md`）。

底图统一取 render_day14_video.render_at(13.0s) 的 M03「红皮书舞台」真实渲染帧
（本鲸 / 大小姐 2 位，均为 v10 双脚可见白名单；两人之间的书页交接与关系弧保留，
右上电视 PiP 保留）。封面专用：临时屏蔽 Day2 字幕层，成片 MP4 完全不修改。
本脚本只画暖纸底纹、无字纸片层和 16:9 画面窗口的纸框/软投影；不排任何文字、
不加载字体、不新增人物形象，也不把文案或角标写进图里。

复现：PYTHONHASHSEED=0 python3 tools/day14制作/gen_day14_v10_cover_ratios.py
输出：
  Day/Day14/opuscar-day14/cover_v10_3x4.jpg   1080x1440  (3:4)
  Day/Day14/opuscar-day14/cover_v10_4x3.jpg   1440x1080  (4:3)
  （并各复制一份到 Day/Day14/成片/ 下的中文名文件）
"""
import json
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
TOOLS = ROOT / 'tools/day14制作'
ART = ROOT / 'Day/Day14/opuscar-day14'
MOVIE = ROOT / 'Day/Day14/成片'
sys.path.insert(0, str(TOOLS))
import render_day14_video as R  # noqa: E402

INK = (74, 56, 42)
EDGE = (186, 166, 140)
PAPER = (250, 246, 232)


def load_frame():
    """取 13.0s 真实渲染帧；仅在封面生成时屏蔽 Day2 字幕层。"""
    R.load_frame_index()
    al = json.loads((TOOLS / 'voice_alignment.json').read_text(encoding='utf-8'))
    sb = json.loads((TOOLS / 'subtitle_timing.json').read_text(encoding='utf-8'))
    cues, screens = al['cues'], sb['screens']
    cs = [c['start'] for c in cues]
    ss = [x['start'] for x in screens]
    se = [x['end'] for x in screens]
    wt = R.word_times(cues)
    inks = R.ink_times(wt)
    rain = wt[22]['不拍雨']
    orig = R.subtitle_layer
    R.subtitle_layer = lambda text: Image.new('RGBA', (R.W, 150), (0, 0, 0, 0))
    im = R.render_at(13.0, cues, screens, cs, ss, se, wt, inks, rain).convert('RGB')
    R.subtitle_layer = orig
    assert im.size == (1920, 1080)
    return im


def paper_bg(w, h):
    """暖棉纸底 + 低幅纸纤维 + 三层 pop-up 波边；不改画面，只做封面留白。"""
    yy = np.arange(h, dtype=np.float32)[:, None] / h
    top = np.array((226, 186, 196), np.float32)
    bot = np.array((246, 214, 218), np.float32)
    base = np.array((244, 236, 218), np.float32)
    grad = (top[None, None, :] * (1 - yy[:, :, None]) +
            bot[None, None, :] * yy[:, :, None]) * 0.40 + base[None, None, :] * 0.60
    arr = np.repeat(grad, w, axis=1)
    rng = np.random.default_rng(9173)
    arr = np.clip(arr + rng.normal(0, 2.0, (h, w, 1)).astype(np.float32), 0, 255).astype(np.uint8)
    im = Image.fromarray(arr, 'RGB').convert('RGBA')
    # 半透明纸片层必须画在独立透明图层再 alpha_composite；
    # 直接在 RGBA 画布上用 RGBA 画笔会覆盖 alpha 通道，转 RGB 后变成大片实色。
    waves = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(waves, 'RGBA')

    def wave(y0, amp, phase, col, a):
        pts = [(-100 + i * (w + 200) / 24,
                y0 + amp * math.sin(i * 0.9 + phase)) for i in range(25)]
        pts += [(w + 100, h + 100), (-100, h + 100)]
        d.polygon([(int(x), int(y)) for x, y in pts], fill=(*col, a))

    wave(120, 14, 1.2, (232, 176, 112), 34)
    wave(h - 150, 26, 0.4, (206, 142, 152), 40)
    wave(h - 70, 18, 2.1, EDGE, 46)
    return Image.alpha_composite(im, waves)


def make_parts(w, h):
    """返回 (canvas, overlay, draw)。overlay 用于所有无字纸片层，最后一次性合成。"""
    canvas = paper_bg(w, h)
    ov = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    return canvas, ov, ImageDraw.Draw(ov, 'RGBA')


def paper_shape(ov, d, box, radius, fill, edge=EDGE, fold=True):
    """无字纸片：灰纸板边 + 米白纸面 + 软投影 + 折角；不含任何字符。"""
    sh = Image.new('RGBA', ov.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(sh, 'RGBA')
    sd.rounded_rectangle((box[0] + 9, box[1] + 14, box[2] + 9, box[3] + 14),
                         radius=radius, fill=(78, 60, 46, 100))
    ov.alpha_composite(sh.filter(ImageFilter.GaussianBlur(13)))
    d.rounded_rectangle((box[0], box[1] + 8, box[2], box[3] + 8), radius=radius,
                        fill=(*edge, 255), outline=(*INK, 255), width=3)
    d.rounded_rectangle(box, radius=radius, fill=(*fill, 246),
                        outline=(*PAPER, 255), width=9)
    if fold:
        d.polygon([(box[2] - 18, box[1] + 18), (box[2] - 18, box[1] + 58),
                   (box[2] - 58, box[1] + 18)],
                  fill=(238, 230, 210, 235), outline=(*INK, 105), width=2)


def dot(d, x, y, r=5, col=(120, 96, 76, 150)):
    d.ellipse((x - r, y - r, x + r, y + r), fill=col)


def paste_window(canvas, frame, box):
    """16:9 真实帧按 contain 贴进窗口，套米白纸边 / 灰纸板边 / 墨线 / 软投影。"""
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    assert abs(w / h - 16 / 9) < 0.01, (w, h)
    fr = frame.resize((w, h), Image.Resampling.LANCZOS).convert('RGBA')
    ov = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(ov, 'RGBA')
    sh = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(sh, 'RGBA')
    sd.rounded_rectangle((x0 + 8, y0 + 14, x1 + 8, y1 + 14), radius=20,
                         fill=(78, 60, 46, 105))
    ov.alpha_composite(sh.filter(ImageFilter.GaussianBlur(15)))
    d.rounded_rectangle((x0 - 10, y0 - 10, x1 + 10, y1 + 16), radius=20,
                        fill=(*EDGE, 255), outline=(*INK, 255), width=3)
    d.rounded_rectangle((x0 - 3, y0 - 3, x1 + 3, y1 + 3), radius=14,
                        fill=(*PAPER, 255))
    mask = Image.new('L', (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, w - 1, h - 1), radius=10, fill=255)
    ov.paste(fr, (x0, y0), mask)
    canvas.alpha_composite(ov)


# ---------------------------------------------------------------- 3:4 竖版 ----
def build_3x4(frame):
    W, H = 1080, 1440
    canvas, ov, d = make_parts(W, H)

    # 上方三张错层无字纸片，纯色块 / 折角 / 打孔，不放任何文案
    paper_shape(ov, d, (70, 76, 520, 300), 28, (247, 226, 222))
    paper_shape(ov, d, (392, 128, 1010, 340), 28, (250, 240, 218))
    paper_shape(ov, d, (132, 256, 748, 392), 24, (240, 214, 208))
    for x in (110, 150, 190):
        dot(d, x, 110, 4)
    for x in (430, 470, 510):
        dot(d, x, 164, 4)
    d.line((170, 350, 690, 350), fill=(214, 112, 82, 120), width=4)

    # 16:9 真实帧窗口
    paste_window(canvas, frame, (48, 410, 1032, 963))

    # 下方长纸签 + 一本无字小册子（呼应 M03 红皮书），仍不写字
    paper_shape(ov, d, (70, 1000, 1010, 1372), 30, (250, 246, 232), fold=False)
    d.rounded_rectangle((250, 1070, 530, 1290), radius=18,
                        fill=(166, 62, 62, 235), outline=(*INK, 210), width=3)
    d.rounded_rectangle((550, 1070, 830, 1290), radius=18,
                        fill=(238, 230, 210, 245), outline=(*INK, 210), width=3)
    d.line((540, 1076, 540, 1284), fill=(*INK, 150), width=3)
    for x in (120, 160, 200, 880, 920, 960):
        dot(d, x, 1336, 5)
    d.line((120, 1040, 960, 1040), fill=(*EDGE, 160), width=3)

    return Image.alpha_composite(canvas, ov).convert('RGB')


# ---------------------------------------------------------------- 4:3 横版 ----
def build_4x3(frame):
    W, H = 1440, 1080
    canvas, ov, d = make_parts(W, H)

    # 顶部三段无字纸片标签
    paper_shape(ov, d, (56, 28, 430, 118), 22, (247, 226, 222), fold=False)
    paper_shape(ov, d, (470, 28, 970, 118), 22, (250, 240, 218), fold=False)
    paper_shape(ov, d, (1010, 28, 1384, 118), 22, (240, 214, 208), fold=False)
    for x in (90, 128, 166, 504, 542, 580, 1044, 1082, 1120):
        dot(d, x, 72, 4)

    # 16:9 真实帧窗口
    paste_window(canvas, frame, (56, 150, 1384, 897))

    # 底部无字纸签 + 打孔/压痕
    paper_shape(ov, d, (56, 930, 1384, 1052), 26, (250, 246, 232), fold=False)
    d.line((110, 968, 1330, 968), fill=(*EDGE, 170), width=3)
    d.line((110, 1010, 1330, 1010), fill=(214, 112, 82, 110), width=3)
    for x in (110, 170, 230, 1210, 1270, 1330):
        dot(d, x, 990, 5)

    return Image.alpha_composite(canvas, ov).convert('RGB')


def main():
    frame = load_frame()
    jobs = [
        (build_3x4(frame), ART / 'cover_v10_3x4.jpg',
         MOVIE / 'Day14_重看昨天那支片子_封面_v10_3x4.jpg', (1080, 1440)),
        (build_4x3(frame), ART / 'cover_v10_4x3.jpg',
         MOVIE / 'Day14_重看昨天那支片子_封面_v10_4x3.jpg', (1440, 1080)),
    ]
    for im, p, copy, expected in jobs:
        assert im.size == expected, (p, im.size)
        p.parent.mkdir(parents=True, exist_ok=True)
        im.save(p, quality=94, subsampling=0)
        copy.write_bytes(p.read_bytes())
        print('COVER_OK', p.name, im.size, p.stat().st_size, 'bytes; copy:', copy.name)
    print('COVER_RATIOS_NO_TEXT_OK')


if __name__ == '__main__':
    main()
