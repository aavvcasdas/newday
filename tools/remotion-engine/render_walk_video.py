#!/usr/bin/env python3
"""render_walk_video.py — 把 9 个角色的 v14 走路图集渲染成**一个 MP4 视频**

用法：
    python3 tools/remotion-engine/render_walk_video.py                 # 全部角色
    python3 tools/remotion-engine/render_walk_video.py whale qwen      # 指定角色
    python3 tools/remotion-engine/render_walk_video.py --crf 18        # 画质更高

产物：assets/ai-girls/walk-v14/preview/walk_all9.mp4
      1280×720 / 25fps / H.264；结构 = 片头 2s → 每个角色 3s 走过舞台 → 3×3 全员 4s

依赖：Pillow + imageio-ffmpeg（`pip install --break-system-packages imageio-ffmpeg`
      会自带一份 ffmpeg 静态可执行文件，不需要系统 ffmpeg）
"""

import json
import os
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

from frame_utils import resize_rgba  # 预乘缩放，避免白边

try:
    import imageio_ffmpeg
except ImportError:  # pragma: no cover
    imageio_ffmpeg = None

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
ART = os.path.join(ROOT, 'assets', 'ai-girls', 'walk-v14')
OUT = os.path.join(ART, 'preview')

CELL_W, CELL_H = 384, 416
FRAME_MS = 120
W, H = 1280, 720
FPS = 25
DUR = 3.0                 # 每个角色走过舞台的时长
GROUND = 596              # 视频里的地平线
CHAR_H = 470              # 视频里的角色高度（图集 372 → 放大 1.26 倍，仍比源图小）
MARGIN = 150              # 角色中心从左走到右的起终点
TITLE_DUR = 2.2
GRID_DUR = 4.0

CHARS = {
    'whale': 'whale_walk_side_2leg',
    'gpt': 'gpt_walk_2leg',
    'gpt_push': 'gpt_push_walk_2leg',
    'claude': 'claude_walk_2leg',
    'doubao': 'doubao_walk_side_2leg',
    'gemini': 'gemini_walk_2leg',
    'kimi': 'kimi_walk_2leg',
    'qwen': 'qwen_walk_2leg',
    'zai': 'zai_walk_2leg',
}


def font(size):
    try:
        return ImageFont.load_default(size=size)
    except TypeError:  # Pillow < 10
        return ImageFont.load_default()


def background():
    """夜色舞台：渐变天空 + 远山 + 地面 + 地面刻度（纯程序绘制，角色不会混进背景）。"""
    bg = Image.new('RGB', (W, H), (12, 18, 34))
    d = ImageDraw.Draw(bg)
    for y in range(GROUND):
        t = y / float(GROUND)
        d.line([(0, y), (W, y)],
               fill=(int(13 + 26 * t), int(21 + 34 * t), int(42 + 44 * t)))
    d.polygon([(0, 470), (180, 372), (400, 468), (620, 366), (860, 466),
               (1080, 386), (W, 452), (W, GROUND), (0, GROUND)],
              fill=(20, 30, 54))
    d.rectangle([0, GROUND, W, H], fill=(26, 37, 60))
    d.line([(0, GROUND), (W, GROUND)], fill=(78, 106, 152), width=2)
    for x in range(-48, W + 96, 96):
        d.line([(x, GROUND + 2), (x - 44, H)], fill=(34, 48, 76), width=1)
    return bg


def clean_alpha(im):
    r, g, b, a = im.split()
    a = a.point(lambda v: 0 if v < 48 else (255 if v > 200 else v))
    return Image.merge('RGBA', (r, g, b, a))


def cutout_white(im):
    """白底图（kimi 的逐帧立绘是 RGB 白底）转透明。"""
    a = np.asarray(im.convert('RGB'), dtype=np.uint8)
    mask = a.min(axis=2) < 250
    out = np.dstack([a, np.where(mask, 255, 0).astype(np.uint8)])
    return Image.fromarray(out, 'RGBA')


class Atlas:
    """一个角色的 8 帧，**优先读 frames/<char>/f*.png 原始切片**（比图集单格清晰）。

    图集单格固定 372px 美术高；源切片有 470~650px，720p 视频里能吃到真实细节，
    直接用图集会先压到 372 再放大，糊一层。没有源切片才退回图集。
    每帧同时记住脚底在图里的高度（来自 meta.json 的 groundY），保证踩在同一条地上。
    """

    def __init__(self, name, height=CHAR_H):
        meta_path = os.path.join(ART, 'frames', name, 'meta.json')
        meta = {}
        if os.path.exists(meta_path):
            with open(meta_path) as fh:
                meta = json.load(fh)
        src = []
        frame_dir = os.path.join(ART, 'frames', name)
        for i in range(1, 9):
            p = os.path.join(frame_dir, 'f%d.png' % i)
            if not os.path.exists(p):
                src = []
                break
            im = Image.open(p)
            if im.mode != 'RGBA' or np.asarray(im.getchannel('A')).min() == 255:
                im = cutout_white(im)
            src.append(im.convert('RGBA'))
        if not src:
            img = Image.open(os.path.join(ART, CHARS[name] + '.png')).convert('RGBA')
            src = [img.crop((i * CELL_W, 0, (i + 1) * CELL_W, CELL_H)) for i in range(8)]

        self.cells = []
        for i, im in enumerate(src):
            bb = im.getbbox()
            art = im.crop(bb)
            w = max(1, int(round(art.width * height / float(art.height))))
            art = resize_rgba(art, (w, height), Image.LANCZOS)
            g = meta.get('f%d' % (i + 1), {}).get('groundY')
            feet = height
            if isinstance(g, (int, float)) and bb[1] <= g <= bb[3]:
                feet = (g - bb[1]) * height / float(bb[3] - bb[1])
            self.cells.append((art, feet))


def walk_frames(name, atlas, frames, base):
    """角色在舞台上从左走到右：8 帧 / 120ms 循环，脚固定在地平线上。"""
    total = int(round(DUR * FPS))
    lab = font(22)
    for i in range(total):
        t = i / float(FPS)
        p = min(1.0, t / DUR)
        fi = int(t * 1000 // FRAME_MS) % 8
        ch, feet = atlas.cells[fi]
        # 起终点按这一帧的实际宽度收，别让大尾巴/长发被画面边缘切掉
        x0 = max(MARGIN, ch.width / 2.0 + 12)
        x1 = min(W - MARGIN, W - ch.width / 2.0 - 12)
        x = x0 + (x1 - x0) * p
        frame = base.copy()
        d = ImageDraw.Draw(frame)
        d.ellipse([x - ch.width * 0.32, GROUND - 10, x + ch.width * 0.32, GROUND + 10],
                  fill=(16, 24, 40))
        frame.paste(ch, (int(round(x - ch.width / 2)), int(round(GROUND - feet))), ch)
        d = ImageDraw.Draw(frame)
        d.text((40, 34), name, fill=(168, 204, 250), font=lab)
        d.text((40, 66), 'walk 8f / 120ms', fill=(96, 130, 176), font=font(16))
        frames.append(frame)


def title_frames(frames, names):
    big, small = font(46), font(20)
    for i in range(int(round(TITLE_DUR * FPS))):
        f = Image.new('RGB', (W, H), (11, 16, 30))
        d = ImageDraw.Draw(f)
        d.text((60, H // 2 - 90), 'walk-v14', fill=(210, 230, 255), font=big)
        d.text((62, H // 2 - 26), '9 characters · 8 frames each · 120ms per frame',
               fill=(150, 186, 236), font=small)
        d.text((62, H // 2 + 6), 'full-frame hand-drawn poses (no cut-and-slide legs)',
               fill=(110, 142, 190), font=small)
        d.text((62, H // 2 + 56), '  ·  '.join(names), fill=(96, 130, 176), font=font(17))
        frames.append(f)


def grid_frames(frames, names, atlases):
    """3×3 全员同步循环：每格一条地平线，角色原地迈步。"""
    cols = 3
    cw, chh = W // cols, H // 3
    lab = font(16)
    total = int(round(GRID_DUR * FPS))
    for i in range(total):
        t = i / float(FPS)
        fi = int(t * 1000 // FRAME_MS) % 8
        board = Image.new('RGB', (W, H), (13, 19, 34))
        d = ImageDraw.Draw(board)
        for idx, n in enumerate(names):
            cx = (idx % cols) * cw
            cy = (idx // cols) * chh
            g = cy + chh - 16
            d.rectangle([cx + 1, g, cx + cw - 2, cy + chh - 1], fill=(24, 34, 56))
            d.line([(cx + 1, g), (cx + cw - 2, g)], fill=(70, 96, 140), width=1)
            src, feet = atlases[n].cells[fi]
            hh = int(chh * 0.84)
            ww = max(1, int(round(src.width * hh / float(src.height))))
            im = resize_rgba(src, (ww, hh), Image.LANCZOS)
            board.paste(im, (cx + (cw - ww) // 2, int(round(g - feet * hh / float(src.height)))), im)
            d.text((cx + 10, cy + 8), n, fill=(120, 160, 210), font=lab)
        frames.append(board)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    crf = '20'
    for a in sys.argv[1:]:
        if a.startswith('--crf='):
            crf = a.split('=', 1)[1]
    names = args or list(CHARS)
    names = [n for n in names if n in CHARS]

    if imageio_ffmpeg is None:
        print('需要 imageio-ffmpeg：pip install --break-system-packages imageio-ffmpeg')
        return 1
    exe = imageio_ffmpeg.get_ffmpeg_exe()

    os.makedirs(OUT, exist_ok=True)
    out_path = os.path.join(OUT, 'walk_all9.mp4' if len(names) > 1 else '%s_walk.mp4' % names[0])

    base = background()
    atlases = {n: Atlas(n) for n in names}

    cmd = [exe, '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24',
           '-s', '%dx%d' % (W, H), '-r', str(FPS), '-i', '-',
           '-c:v', 'libx264', '-preset', 'medium', '-crf', crf,
           '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out_path]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE,
                            stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)

    def emit(frame):
        proc.stdin.write(np.asarray(frame.convert('RGB'), dtype=np.uint8).tobytes())

    total_frames = 0
    frames = []
    if len(names) > 1:
        title_frames(frames, names)
        for f in frames:
            emit(f)
        total_frames += len(frames)
        frames = []
    for n in names:
        walk_frames(n, atlases[n], frames, base)
        for f in frames:
            emit(f)
        total_frames += len(frames)
        frames = []
        print('rendered', n)
    if len(names) > 1:
        grid_frames(frames, names, atlases)
        for f in frames:
            emit(f)
        total_frames += len(frames)

    proc.stdin.close()
    err = proc.stderr.read().decode('utf-8', 'replace')
    code = proc.wait()
    if code != 0:
        print(err[-2000:])
        return code
    size = os.path.getsize(out_path)
    print('wrote %s  %d frames  %.1fs  %.1f MB'
          % (out_path, total_frames, total_frames / float(FPS), size / 1048576.0))
    return 0


if __name__ == '__main__':
    sys.exit(main())
