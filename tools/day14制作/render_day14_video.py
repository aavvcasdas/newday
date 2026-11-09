#!/usr/bin/env python3
"""Day14《重看昨天那支片子》成片渲染器（克隆配音版）。

按 Day14分镜_电视机版_待审.md 的 C01–C07 电视机画中画结构出片：
  - 电视里：本仓库已交付番外成片 dalabengba.mp4 的真帧（先按文档命令抽到 tv_frames/），
            是「按比例缩小的完整场景」，不是重画、不是纯色屏上的孤立角色；
  - 电视外：既有海底房间 / 浅青桌面，沿用 assets/ai-girls 的鲸娘立绘（焦黑调），
            外框全程稳定；写纸、收伞等动作只靠角色姿态与桌面道具表达；
  - 字幕：来自实测 subtitle_timing.json（Vosk 词级 + RMS 边界，63 屏），不随电视缩放；
  - 音轨：用户给定的 鲸鱼MV重看_克隆配音_最终版.wav，电视内片段默认静音。

不画画面红线清单里的任何禁用控件（清单见 00_运营总览/画面红线_不要出现的东西_2026-10-29.md），
也不做数字看板、角标、水印或说完之后的收尾卡。
「暂停／倒带」不画屏幕控件，只用切到别的片段/定格表达。

依赖（本环境按需装，不入库）：
  python3 -m pip install --user --break-system-packages Pillow numpy
  npm install --no-save --no-package-lock @ffmpeg-installer/ffmpeg @ffprobe-installer/ffprobe
  中文字体 video-fx/assets/fonts/NotoSansSC[wght].ttf（取自 google/fonts，字体本身被 .gitignore 忽略）
  抽帧：见 Day/Day14/Day14分镜_电视机版_待审.md 第 3 节（本脚本不重抽，只读 tv_frames/）

用法：
  python3 tools/day14制作/render_day14_video.py --out Day/Day14/成片/Day14_重看昨天那支片子_克隆配音版.mp4
  python3 tools/day14制作/render_day14_video.py --stills 6     # 只出 6 张关键帧供抽查，不编码
"""
from __future__ import annotations

import argparse
import bisect
import io
import json
import math
import os
import shutil
import subprocess
import sys
from functools import lru_cache
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFont

ROOT = Path(__file__).resolve().parents[2]
W, H, FPS = 1920, 1080, 30             # 仓库统一规格（verify_episode.py 要求 1080p30）
SCREEN = (560, 180, 1480, 697)          # 920x517，约 16:9，C01–C07 固定不变
SW, SH = SCREEN[2] - SCREEN[0], SCREEN[3] - SCREEN[1]
TV_OUTER = (500, 130, 1560, 760)
ACTOR_BOX = (150, 520)                  # 左上角；尺寸 460x498
ACTOR_SIZE = (460, 498)
PAPER = (1180, 780, 1720, 960)
SUB_Y = 930                             # Day2 样式对话条：输出 y=966..1053，标签上移
TAIL_PAD = 0.25                         # 末句后 0.25s 收尾，符合终验 0.15–0.35s
# Day2 加更《鲸鱼选鱼》统一样式（tools/字幕/day2_style_sub.mjs 的 DAY2_SUB，1.5× 输出）：
DAY2_BOX_FILL = (9, 22, 54, 235)
DAY2_BOX_STROKE = (72, 200, 255, 255)   # #48C8FF
DAY2_TAG_FILL = (30, 64, 175, 255)      # #1E40AF
DAY2_TAG_STROKE = (250, 204, 21, 255)   # #FACC15
DAY2_TAG_TEXT = (253, 230, 138, 255)    # #FDE68A

# 每行台词对应的番外片段（目录名 = 分镜专页「成片实测片段清单」的 id）；dark = 电视关掉。
# 注意：TREATMENT.md 的 S01–S26 秒区间是制作计划，与交付成片 dalabengba.mp4 的实际镜头并不同步，
#       这里按成片逐 0.5s 扫描后的真实画面重新定位（见 Day14制作记录_克隆配音版.md）。
CLIPS = {
    1: ('BOOK', 'play'), 2: ('BOOK', 'play'), 3: ('BOOK', 'play'),
    4: ('DRAGON', 'play'), 5: ('MAP', 'play'), 6: ('CHEST', 'play'),
    7: ('NAME', 'play'), 8: ('MOON', 'play'), 9: ('FIRE', 'play'),
    10: ('BOOK', 'freeze'), 11: ('BOOK', 'freeze'), 12: ('BOOK', 'freeze'),
    13: ('DRAGON', 'freeze'), 14: ('DRAGON', 'freeze'),
    15: ('NAME', 'play'), 16: ('CAGE', 'play'), 17: ('MOON', 'play'),
    18: ('FIRE', 'play'),
    19: ('FIRE', 'freeze'), 20: ('FIRE', 'freeze'), 21: ('FIRE', 'freeze'),
    22: ('dark', 'dark'), 23: ('dark', 'dark'), 24: ('dark', 'dark'),
}
# 一行内按时间换第二个片段：L05 地图→登记报名、L08 月光→金笼喊「小心后面」、L09 片尾黑屏
CLIP_SECOND = {5: ('SIGNUP', 0.5), 8: ('CAGE', 0.5), 9: ('END', 0.8)}
# 姿态分组：看屏幕 / 暂停翻纸 / 低头写 / 收尾
POSE = {
    **{i: 'point' for i in range(1, 10)},
    **{i: 'letter' for i in range(10, 15)},
    **{i: 'read' for i in range(15, 22)},
    **{i: 'idle' for i in range(22, 25)},
}
CHARRED_BRIGHTNESS = 0.78


def resolve_ffmpeg() -> str:
    for env in ('FFMPEG_PATH', 'FFMPEG'):
        p = os.environ.get(env)
        if p and Path(p).is_file():
            return p
    for rel in ('node_modules/@ffmpeg-installer/linux-x64/ffmpeg',
                'node_modules/@ffmpeg-installer/ffmpeg/ffmpeg'):
        p = ROOT / rel
        if p.is_file():
            return str(p)
    got = shutil.which('ffmpeg')
    if got:
        return got
    raise RuntimeError('找不到 ffmpeg：设 FFMPEG_PATH 或 npm install @ffmpeg-installer/ffmpeg')


def font(size: int) -> ImageFont.FreeTypeFont:
    p = ROOT / 'video-fx/assets/fonts/NotoSansSC[wght].ttf'
    if not p.is_file():
        p = ROOT / 'video-fx/assets/fonts/ZCOOLKuaiLe-Regular.ttf'
    f = ImageFont.truetype(str(p), size)
    try:
        f.set_variation_by_name('Bold')
    except (OSError, ValueError):
        pass
    return f


def background() -> Image.Image:
    """海底房间 + 浅青桌面 + 稳定电视外框。只画一次，之后每帧复制。"""
    yy = np.arange(H, dtype=np.float32)[:, None]
    t = yy / H
    top = np.array([9, 33, 58], np.float32)
    bot = np.array([24, 88, 112], np.float32)
    grad = top[None, None, :] * (1 - t[:, :, None]) + bot[None, None, :] * t[:, :, None]
    # 房间顶部的天窗水光：大面积亮部渐隐到深蓝，给开场 0–2s 提供视觉信息。
    # 是场景光，不是横幅/角标/水印；check_opener_visual.py 要求上半屏亮像素 ≥5%。
    light = np.array([126, 196, 214], np.float32)
    glow = np.clip((190 - yy) / 140.0, 0, 1) ** 0.8
    grad = grad * (1 - glow[:, :, None]) + light[None, None, :] * glow[:, :, None]
    grad = np.repeat(grad, W, axis=1).astype(np.uint8)
    im = Image.fromarray(grad, 'RGB')
    d = ImageDraw.Draw(im)
    # 桌面 / 桌沿
    d.rectangle((0, 760, W, H), fill=(150, 214, 216))
    d.rectangle((0, 756, W, 772), fill=(102, 172, 181))
    d.line((0, 772, W, 772), fill=(72, 140, 154), width=3)
    # 少量气泡（固定，不随帧闪动）
    rng = np.random.default_rng(14)
    for _ in range(46):
        x = int(rng.integers(20, W - 20)); y = int(rng.integers(60, 740))
        r = int(rng.integers(3, 13))
        d.ellipse((x - r, y - r, x + r, y + r), outline=(96, 168, 190), width=2)
    # 电视机外壳（外框全程不变）
    d.rounded_rectangle(TV_OUTER, radius=34, fill=(42, 60, 74), outline=(16, 28, 38), width=6)
    d.rounded_rectangle((TV_OUTER[0] + 12, TV_OUTER[1] + 12, TV_OUTER[2] - 12, TV_OUTER[3] - 12),
                        radius=26, fill=(64, 86, 100), outline=(104, 132, 146), width=3)
    d.rounded_rectangle((SCREEN[0] - 12, SCREEN[1] - 12, SCREEN[2] + 12, SCREEN[3] + 12),
                        radius=12, fill=(18, 26, 34), outline=(10, 16, 22), width=4)
    d.rectangle(SCREEN, fill=(8, 14, 20))
    # 机身右侧两个旋钮（道具旋钮；不是屏幕播放器按钮）
    for cy in (690, 726):
        d.ellipse((1500, cy - 16, 1532, cy + 16), fill=(28, 42, 52), outline=(128, 158, 170), width=3)
        d.line((1516, cy - 9, 1516, cy + 1), fill=(190, 210, 216), width=3)
    # 两支脚
    d.rounded_rectangle((600, 760, 690, 786), radius=6, fill=(36, 50, 60))
    d.rounded_rectangle((1370, 760, 1460, 786), radius=6, fill=(36, 50, 60))
    return im


@lru_cache(maxsize=8)
def actor(pose: str) -> Image.Image:
    sheet, idx = {
        'point': ('assets/ai-girls/lyric-action-v13/whale_point.png', 0),
        'letter': ('assets/ai-girls/actions-v12/whale_letter.png', 0),
        'read': ('assets/ai-girls/lyric-action-v13/whale_read_action.png', 0),
        'idle': ('assets/ai-girls/walk-v14/whale_idle_side_pet.png', 0),
    }[pose]
    im = Image.open(ROOT / sheet).convert('RGBA')
    fw, fh = 384, 416
    frame = im.crop((idx * fw, 0, (idx + 1) * fw, fh)).resize(ACTOR_SIZE, Image.LANCZOS)
    # 本鲸这集还是焦的：略暗、去饱和，保留轮廓，不改成别的角色
    rgb = ImageEnhance.Color(frame.convert('RGB')).enhance(0.72)
    rgb = ImageEnhance.Brightness(rgb).enhance(CHARRED_BRIGHTNESS)
    out = rgb.convert('RGBA')
    out.putalpha(frame.getchannel('A'))
    return out


@lru_cache(maxsize=96)
def tv_frame(clip: str, index: int) -> Image.Image:
    folder = ROOT / 'tools/day14制作/tv_frames' / clip
    files = frame_index.get(clip)
    if not files:
        raise RuntimeError(f'缺抽帧目录 {folder}；先按分镜专页第 3 节执行 ffmpeg 抽帧')
    return Image.open(folder / files[index % len(files)]).convert('RGB').resize((SW, SH), Image.LANCZOS)


frame_index: dict[str, list[str]] = {}


def load_frame_index() -> None:
    base = ROOT / 'tools/day14制作/tv_frames'
    needed = {c for c, _ in CLIPS.values()} | {v[0] for v in CLIP_SECOND.values()}
    for clip in sorted(needed - {'dark'}):
        files = sorted(p.name for p in (base / clip).glob('*.jpg')) if (base / clip).is_dir() else []
        if not files:
            raise RuntimeError(f'缺片段 {clip} 的抽帧：{base / clip}')
        frame_index[clip] = files


@lru_cache(maxsize=128)
def subtitle_layer(text: str) -> Image.Image:
    """复刻项目统一的 Day2 字幕条（深蓝底 + #48C8FF 青色描边 + 说话人小标签）。

    2026-10-27 起所有视频默认走这一版；本渲染器是 Python，按 tools/字幕/README.md
    与 day2_style_sub.mjs 的 DAY2_SUB 常量逐项对齐（逻辑尺寸 ×1.5 输出），不另写风格。
    """
    layer = Image.new('RGBA', (W, 150), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    f = font(42)                      # 28px 逻辑 × 1.5
    box = d.textbbox((0, 0), text, font=f, stroke_width=3)
    tw = box[2] - box[0]
    bw = min(W - 160, max(620, tw + 120))
    x0 = (W - bw) // 2
    y0, y1 = 36, 123                 # 全局 966..1053
    d.rounded_rectangle((x0, y0, x0 + bw, y1), radius=18,
                        fill=DAY2_BOX_FILL, outline=DAY2_BOX_STROKE, width=3)
    tx = (W - tw) // 2 - box[0]
    d.text((tx, y0 + 19), text, font=f, fill=(255, 255, 255, 255),
           stroke_width=2, stroke_fill=(6, 20, 44, 235))
    # 说话人标签：贴在对话条左上角、上移 14px 逻辑（21px 输出）
    tf = font(22)
    tag = '鲸鱼娘'
    tb = d.textbbox((0, 0), tag, font=tf)
    tw2 = tb[2] - tb[0]
    d.rounded_rectangle((x0 + 24, y0 - 22, x0 + 44 + tw2, y0 + 8), radius=7,
                        fill=DAY2_TAG_FILL, outline=DAY2_TAG_STROKE, width=2)
    d.text((x0 + 34, y0 - 21), tag, font=tf, fill=DAY2_TAG_TEXT)
    return layer


def draw_props(d: ImageDraw.ImageDraw, line: int, t: float) -> None:
    # 纸：空白 → 逐行写满（短横线，不是表格/账本/数字看板）
    d.rounded_rectangle(PAPER, radius=8, fill=(244, 246, 232), outline=(196, 202, 186), width=3)
    # 手写笔迹：长短、间距、起笔都不同，别画成等距等长的表格/清单
    written = 0 if line < 15 else min(9, line - 14)
    rng = np.random.default_rng(20261109)
    yy = PAPER[1] + 24
    for _ in range(written):
        yy += int(rng.integers(12, 23))
        x0 = PAPER[0] + int(rng.integers(24, 150))
        x1 = x0 + int(rng.integers(55, 300))
        d.line((x0, yy, x1, yy + int(rng.integers(-4, 5))), fill=(72, 92, 104), width=3)
        if rng.random() < 0.4:
            d.line((x1 + 14, yy, x1 + int(rng.integers(30, 90)), yy),
                   fill=(96, 116, 128), width=2)
    # 烤焦那张单独夹起来：一张深色小纸角，标「待补」是剧情动作，不是角标/水印
    if line >= 19:
        d.polygon([(PAPER[2] - 6, PAPER[1] - 6), (PAPER[2] + 62, PAPER[1] + 4),
                   (PAPER[2] + 56, PAPER[1] + 70), (PAPER[2] - 10, PAPER[1] + 58)],
                  fill=(58, 52, 48), outline=(30, 26, 24))
    # 歪伞：收进抽屉前靠在右墙，L22 起消失
    if line < 22:
        d.line((1810, 620, 1790, 880), fill=(92, 74, 98), width=7)
        d.arc((1750, 570, 1875, 660), 190, 350, fill=(190, 96, 118), width=9)
        d.line((1790, 880, 1812, 894), fill=(92, 74, 98), width=7)
    else:
        d.rounded_rectangle((1740, 800, 1890, 900), radius=8,
                            fill=(116, 174, 180), outline=(72, 130, 140), width=4)
        d.line((1800, 838, 1830, 838), fill=(60, 100, 110), width=5)


def clip_for(cue: dict, t: float) -> tuple[str, str, int]:
    line = int(cue['index'])
    clip, mode = CLIPS.get(line, ('dark', 'dark'))
    dur = max(0.01, cue['end'] - cue['start'])
    frac = min(0.999, max(0.0, (t - cue['start']) / dur))
    if line in CLIP_SECOND:
        second, at = CLIP_SECOND[line]
        if frac >= at:
            clip = second
    n = len(frame_index.get(clip, []))
    if not n:
        return clip, mode, 0
    if mode == 'freeze':
        return clip, mode, n // 2
    return clip, mode, int((t - cue['start']) * 10) % n


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', type=Path, default=ROOT / 'Day/Day14/成片/Day14_重看昨天那支片子_克隆配音版.mp4')
    ap.add_argument('--stills', type=int, default=0, help='只输出 N 张关键帧 PNG，不编码视频')
    ap.add_argument('--crf', type=int, default=21)
    args = ap.parse_args()

    voice = ROOT / '鲸鱼MV重看_克隆配音_最终版.wav'
    alignment = json.loads((ROOT / 'tools/day14制作/voice_alignment.json').read_text(encoding='utf-8'))
    subs = json.loads((ROOT / 'tools/day14制作/subtitle_timing.json').read_text(encoding='utf-8'))
    if not voice.is_file():
        raise RuntimeError('缺音源：git show origin/arena/689c1837-newday:鲸鱼MV重看_克隆配音_最终版.wav > 鲸鱼MV重看_克隆配音_最终版.wav')
    assert alignment['measured'] is True and subs['measured'] is True
    cues = alignment['cues']
    screens = subs['screens']
    source_duration = float(alignment['source_duration_seconds'])
    # 末句后留 0.25s 收尾（verify_episode.tail_check 要求 0.15–0.35s），音频用 apad 补到同长
    out_duration = round(float(cues[-1]['end']) + TAIL_PAD, 3)
    total_frames = math.ceil(out_duration * FPS)
    load_frame_index()
    base = background()

    cue_starts = [c['start'] for c in cues]
    scr_starts = [s['start'] for s in screens]
    scr_ends = [s['end'] for s in screens]

    def render_at(t: float) -> Image.Image:
        im = base.copy()
        d = ImageDraw.Draw(im)
        ci = max(0, min(len(cues) - 1, bisect.bisect_right(cue_starts, t) - 1))
        cue = cues[ci]
        line = int(cue['index'])
        clip, mode, idx = clip_for(cue, t)
        if clip == 'dark':
            d.rectangle(SCREEN, fill=(10, 17, 24))
            d.line((SCREEN[0] + 40, SCREEN[3] - 40, SCREEN[2] - 40, SCREEN[1] + 40),
                   fill=(24, 38, 50), width=3)
        else:
            im.paste(tv_frame(clip, idx), (SCREEN[0], SCREEN[1]))
        # 电视外本鲸：稳定站位 + 轻微呼吸，不做跨镜闪变
        bob = round(3.2 * math.sin(t * 2.1))
        im.paste(actor(POSE.get(line, 'point')), (ACTOR_BOX[0], ACTOR_BOX[1] + bob),
                 actor(POSE.get(line, 'point')))
        draw_props(d, line, t)
        # 字幕：外部字幕不随电视缩放；按实测屏切换
        si = max(0, min(len(screens) - 1, bisect.bisect_right(scr_starts, t) - 1))
        if scr_starts[si] <= t < scr_ends[si]:
            im.paste(subtitle_layer(screens[si]['text']), (0, SUB_Y), subtitle_layer(screens[si]['text']))
        return im

    if args.stills:
        out = ROOT / 'tools/day14制作/review_frames'
        out.mkdir(parents=True, exist_ok=True)
        for k in range(args.stills):
            t = source_duration * (k + 0.5) / args.stills
            render_at(t).save(out / f'key_{k + 1:02d}_{t:06.2f}s.png')
        print('抽查帧 ->', out)
        return 0

    out = args.out.resolve()
    out.parent.mkdir(parents=True, exist_ok=True)
    ff = resolve_ffmpeg()
    cmd = [ff, '-y', '-v', 'error', '-f', 'image2pipe', '-framerate', str(FPS), '-vcodec', 'mjpeg',
           '-i', '-', '-i', str(voice), '-map', '0:v:0', '-map', '1:a:0',
           '-c:v', 'libx264', '-crf', str(args.crf), '-preset', 'veryfast', '-tune', 'animation',
           '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-ac', '2', '-ar', '44100', '-b:a', '192k',
           '-af', 'apad', '-t', f'{out_duration:.3f}', '-movflags', '+faststart', str(out)]
    log = open('/tmp/day14_ffmpeg.log', 'w')
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=log, stderr=log)
    buf = io.BytesIO()
    try:
        for n in range(total_frames):
            t = n / FPS
            buf.seek(0); buf.truncate(0)
            render_at(t).save(buf, format='JPEG', quality=88, subsampling=0)
            proc.stdin.write(buf.getvalue())
            if n % 300 == 0:
                print(f'  frame {n}/{total_frames}  {t:.1f}s', flush=True)
        proc.stdin.close()
    except BrokenPipeError:
        proc.stdin.close()
        proc.wait()
        raise RuntimeError(f'ffmpeg 提前退出，见 /tmp/day14_ffmpeg.log：{Path("/tmp/day14_ffmpeg.log").read_text()[-2000:]}')
    rc = proc.wait()
    log.close()
    if rc != 0:
        raise RuntimeError(f'ffmpeg exit={rc}：{Path("/tmp/day14_ffmpeg.log").read_text()[-2000:]}')
    print(f'DONE {out}  frames={total_frames} source={source_duration:.3f}s out={out_duration:.3f}s size={out.stat().st_size / 1e6:.1f}MB')
    return 0


if __name__ == '__main__':
    sys.exit(main())
