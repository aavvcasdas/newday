#!/usr/bin/env python3
"""Day14 v10 的 3:4 / 4:3 两版封面，文案直接排进图里。

底图统一取 render_day14_video.render_at(13.0s) 的 M03「红皮书舞台」真实渲染帧
（本鲸 / 大小姐 2 位，均为 v10 双脚可见白名单；两人之间的书页交接与关系弧保留，
右上电视 PiP 保留）。封面专用：临时屏蔽 Day2 字幕层，成片 MP4 完全不修改。
用暖纸画布 + 16:9 画面窗口 + paper-popup 纸片标题卡重新排版，不拉伸、不裁掉人物。

复现：PYTHONHASHSEED=0 python3 tools/day14制作/gen_day14_v10_cover_ratios.py
输出：
  Day/Day14/opuscar-day14/cover_v10_3x4.jpg   1080x1440
  Day/Day14/opuscar-day14/cover_v10_4x3.jpg   1600x1200
  （并各复制一份到 Day/Day14/成片/ 下的中文名文件）
"""
import json
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[2]
TOOLS = ROOT / 'tools/day14制作'
ART = ROOT / 'Day/Day14/opuscar-day14'
MOVIE = ROOT / 'Day/Day14/成片'
FONT = ROOT / 'video-fx/assets/fonts/NotoSansSC[wght].ttf'
FUN = ROOT / 'video-fx/assets/fonts/ZCOOLKuaiLe-Regular.ttf'
sys.path.insert(0, str(TOOLS))
import render_day14_video as R  # noqa: E402

INK = (74, 56, 42)
EDGE = (186, 166, 140)
PAPER = (250, 246, 232)

# ---- 文案（与 COVER_COPY.md 一致，逐行写进两张封面） ----
KICKER = 'DAY 14   ·   克隆配音版   ·   PAPER POP-UP'
TITLE = '重看昨天那支片子'
SUBTITLE = '全演过了，只是没人写下来'
HELPER = '一帧一帧，把演过的写下来 · 八位本名，一张白纸'
SPEC = '纸片立体书 / 双脚可见人物层 / 24 次道具交接'
ALT = '备选：纸上一个字都没有 · 一帧一帧，把演过的写下来'
INTRO_3X4 = [
    '本鲸重看昨天那支片子，才发现纸上一个字都没有。',
    '于是暂停、倒带、一帧一帧看，把八位本名谁对谁做了什么，',
    '一段一行补写下来——不替谁顶，也不把几段并成一段。',
]
INTRO_4X3 = '烤焦那张单独夹起来写「待补」；昨天那碗白饭，那行字不改。'
SIGN = 'Day14 · 纸片立体书 · 视频 v10   /   重看 · 补写 · 不改'


def f(sz, fun=False):
    return ImageFont.truetype(str(FUN if fun else FONT), sz)


def load_frame():
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
    """返回 (canvas, overlay, draw)。overlay 用于所有纸片卡片，最后一次性合成。"""
    canvas = paper_bg(w, h)
    ov = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    return canvas, ov, ImageDraw.Draw(ov, 'RGBA')


def paper_card(ov, d, box, radius=28):
    sh = Image.new('RGBA', ov.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(sh, 'RGBA')
    sd.rounded_rectangle((box[0] + 9, box[1] + 14, box[2] + 9, box[3] + 14),
                         radius=radius, fill=(78, 60, 46, 100))
    ov.alpha_composite(sh.filter(ImageFilter.GaussianBlur(13)))
    d.rounded_rectangle((box[0], box[1] + 8, box[2], box[3] + 8), radius=radius,
                        fill=(*EDGE, 255), outline=(*INK, 255), width=3)
    d.rounded_rectangle(box, radius=radius, fill=(*PAPER, 246),
                        outline=(*PAPER, 255), width=9)
    d.rounded_rectangle((box[0] + 18, box[1] + 18, box[2] - 18, box[3] - 18),
                        radius=radius - 10, outline=(*INK, 90), width=2)
    d.polygon([(box[2] - 18, box[1] + 18), (box[2] - 18, box[1] + 58),
               (box[2] - 58, box[1] + 18)],
              fill=(238, 230, 210, 235), outline=(*INK, 105), width=2)


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


def centered(d, text, cy, w, font, fill):
    bb = d.textbbox((0, 0), text, font=font)
    d.text(((w - (bb[2] - bb[0])) / 2 - bb[0], cy), text, font=font, fill=fill)


# ---------------------------------------------------------------- 3:4 竖版 ----
def build_3x4(frame):
    W, H = 1080, 1440
    canvas, ov, d = make_parts(W, H)
    paste_window(canvas, frame, (54, 556, 1026, 1103))

    box = (54, 60, 1026, 500)
    paper_card(ov, d, box, radius=30)
    x = box[0] + 44
    d.text((x, box[1] + 34), KICKER, font=f(20), fill=(120, 72, 56, 255))
    d.text((x, box[1] + 82), TITLE, font=f(66, fun=True), fill=(*INK, 255))
    d.line((x, box[1] + 180, x + 300, box[1] + 180), fill=(214, 112, 82, 220), width=5)
    d.text((x, box[1] + 198), SUBTITLE, font=f(31), fill=(96, 76, 58, 255))
    d.text((x, box[1] + 254), HELPER, font=f(21), fill=(120, 96, 76, 255))
    d.text((x, box[1] + 296), SPEC, font=f(18), fill=(140, 116, 92, 255))
    d.text((x, box[1] + 336), ALT, font=f(18), fill=(140, 116, 92, 255))

    foot = (54, 1150, 1026, 1390)
    paper_card(ov, d, foot, radius=26)
    fx = foot[0] + 40
    for i, line in enumerate(INTRO_3X4):
        d.text((fx, foot[1] + 32 + i * 40), line, font=f(22), fill=(*INK, 255))
    d.line((fx, foot[1] + 168, foot[2] - 40, foot[1] + 168), fill=(214, 112, 82, 150), width=3)
    d.text((fx, foot[1] + 184), SIGN, font=f(18), fill=(120, 96, 76, 255))

    out = Image.alpha_composite(canvas, ov).convert('RGB')
    return out


# ---------------------------------------------------------------- 4:3 横版 ----
def build_4x3(frame):
    W, H = 1600, 1200
    canvas, ov, d = make_parts(W, H)
    paste_window(canvas, frame, (60, 258, 1540, 1091))

    box = (60, 36, 1540, 236)
    paper_card(ov, d, box, radius=26)
    x = box[0] + 42
    d.text((x, box[1] + 22), KICKER, font=f(18), fill=(120, 72, 56, 255))
    d.text((x, box[1] + 54), TITLE, font=f(58, fun=True), fill=(*INK, 255))
    d.text((x, box[1] + 140), SUBTITLE, font=f(26), fill=(96, 76, 58, 255))
    d.line((x, box[1] + 126, x + 260, box[1] + 126), fill=(214, 112, 82, 220), width=4)
    rx = 1010
    d.text((rx, box[1] + 40), HELPER, font=f(22), fill=(120, 96, 76, 255))
    d.text((rx, box[1] + 82), SPEC, font=f(18), fill=(140, 116, 92, 255))
    d.text((rx, box[1] + 120), ALT, font=f(17), fill=(140, 116, 92, 255))

    foot = (60, 1100, 1540, 1182)
    paper_card(ov, d, foot, radius=22)
    centered(d, INTRO_4X3, foot[1] + 12, W, f(22), (*INK, 255))
    centered(d, SIGN, foot[1] + 38, W, f(17), (120, 96, 76, 255))

    out = Image.alpha_composite(canvas, ov).convert('RGB')
    return out


def main():
    frame = load_frame()
    jobs = [
        (build_3x4(frame), ART / 'cover_v10_3x4.jpg',
         MOVIE / 'Day14_重看昨天那支片子_封面_v10_3x4.jpg', (1080, 1440)),
        (build_4x3(frame), ART / 'cover_v10_4x3.jpg',
         MOVIE / 'Day14_重看昨天那支片子_封面_v10_4x3.jpg', (1600, 1200)),
    ]
    for im, p, copy, expected in jobs:
        assert im.size == expected, (p, im.size)
        p.parent.mkdir(parents=True, exist_ok=True)
        im.save(p, quality=94, subsampling=0)
        copy.write_bytes(p.read_bytes())
        print('COVER_OK', p.name, im.size, p.stat().st_size, 'bytes; copy:', copy.name)
    print('COVER_RATIOS_OK')


if __name__ == '__main__':
    main()
