#!/usr/bin/env python3
"""Day14 v10 发布封面：真实渲染帧 + paper-popup 纸片标题卡（不新画人物、不改视频）。

底图取 render_day14_video.render_at(13.0s)，即 M03「红皮书舞台」：2 位本名
（本鲸 / 大小姐）都来自 v10 双脚可见白名单，电视 PiP 与 v3 锁定内容原样保留。
封面专用：临时屏蔽 Day2 字幕层，让标题成为唯一文字；成片 MP4 完全不修改。

复现：PYTHONHASHSEED=0 python3 tools/day14制作/gen_day14_v10_cover.py
输出：Day/Day14/opuscar-day14/cover_v10.jpg（1920×1080 JPEG）
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[2]
TOOLS = ROOT / 'tools/day14制作'
OUT = ROOT / 'Day/Day14/opuscar-day14/cover_v10.jpg'
FONT = ROOT / 'video-fx/assets/fonts/NotoSansSC[wght].ttf'
FUN = ROOT / 'video-fx/assets/fonts/ZCOOLKuaiLe-Regular.ttf'
sys.path.insert(0, str(TOOLS))
import render_day14_video as R  # noqa: E402

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

# 封面不要成片的 Day2 青色字幕条；只在内存里替换，磁盘上的渲染器不变。
orig_sub = R.subtitle_layer
R.subtitle_layer = lambda text: Image.new('RGBA', (R.W, 150), (0, 0, 0, 0))
base = R.render_at(13.0, cues, screens, cs, ss, se, wt, inks, rain).convert('RGB')
R.subtitle_layer = orig_sub
assert base.size == (1920, 1080), base.size

INK = (74, 56, 42)
EDGE = (186, 166, 140)
PAPER = (250, 246, 232)


def f(sz, fun=False):
    return ImageFont.truetype(str(FUN if fun else FONT), sz)


ov = Image.new('RGBA', base.size, (0, 0, 0, 0))
d = ImageDraw.Draw(ov, 'RGBA')


def paper_card(box, radius=32):
    """米白纸面 / 灰纸板边 / 深棕墨线 / 软投影，与成片 cut-paper 语汇一致。"""
    sh = Image.new('RGBA', base.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(sh, 'RGBA')
    sd.rounded_rectangle((box[0] + 10, box[1] + 16, box[2] + 10, box[3] + 16),
                         radius=radius, fill=(78, 60, 46, 105))
    ov.alpha_composite(sh.filter(ImageFilter.GaussianBlur(14)))
    d.rounded_rectangle((box[0], box[1] + 9, box[2], box[3] + 9), radius=radius,
                        fill=(*EDGE, 255), outline=(*INK, 255), width=3)
    d.rounded_rectangle(box, radius=radius, fill=(*PAPER, 245),
                        outline=(*PAPER, 255), width=10)
    d.rounded_rectangle((box[0] + 20, box[1] + 20, box[2] - 20, box[3] - 20),
                        radius=radius - 12, outline=(*INK, 95), width=2)


def centered(text, cy, font, fill):
    bb = d.textbbox((0, 0), text, font=font)
    d.text(((R.W - (bb[2] - bb[0])) / 2 - bb[0], cy), text, font=font, fill=fill)


# --- 主标题卡：左上，绝不压到两位人物或右上电视 ---
box = (86, 92, 916, 452)
paper_card(box)
d.polygon([(box[2] - 20, box[1] + 20), (box[2] - 20, box[1] + 66),
           (box[2] - 66, box[1] + 20)],
          fill=(238, 230, 210, 235), outline=(*INK, 110), width=2)  # 折角
x = box[0] + 44
d.text((x, box[1] + 38), 'DAY 14   ·   克隆配音版   ·   PAPER POP-UP',
       font=f(21), fill=(120, 72, 56, 255))
d.text((x, box[1] + 88), '重看昨天那支片子', font=f(66, fun=True), fill=(*INK, 255))
d.line((x, box[1] + 186, x + 300, box[1] + 186), fill=(214, 112, 82, 220), width=5)
d.text((x, box[1] + 206), '全演过了，只是没人写下来', font=f(30), fill=(96, 76, 58, 255))
d.text((x, box[1] + 262), '一帧一帧，把演过的写下来 · 八位本名，一张白纸',
       font=f(20), fill=(120, 96, 76, 255))
d.text((x, box[1] + 306), '纸片立体书 / 双脚可见人物层 / 24 次道具交接',
       font=f(18), fill=(140, 116, 92, 255))

# --- 底部小纸签：收住下方留白，不做成视频里的通栏字幕条 ---
tag = (650, 924, 1270, 1056)
paper_card(tag, radius=26)
centered('Day14 · 纸片立体书 · 视频 v10', tag[1] + 32, f(24), (*INK, 255))
centered('重看 / 补写 / 不改', tag[1] + 76, f(18), (120, 96, 76, 255))

out = Image.alpha_composite(base.convert('RGBA'), ov).convert('RGB')
OUT.parent.mkdir(parents=True, exist_ok=True)
out.save(OUT, quality=94, subsampling=0)
print('COVER_OK', OUT, out.size, OUT.stat().st_size, 'bytes')
