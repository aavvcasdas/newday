#!/usr/bin/env python3
"""Day14《重看昨天那支片子》成片渲染器 v2 —— 逐句分镜 / 小电视 / 全画面动画。

用户 2026-11-09 反馈：「除了电视机怎么没有动画了，请将电视机变小，并且学习 mv 的分镜
根据台词匹配分镜然后重新渲染视频。」本版按番外 `TREATMENT.md` §5 的镜头语言重做：

  · 电视缩小到 660×400 机身 / 560×315 屏幕（v1 是 1060×630 / 920×517），移到右上；
  · 24 行台词各有一个镜头（M01–M24）：景别 + 机位运动（推/拉/横移/纵摇/震屏/定格）
    + 本鲸动作 + 电视内片段 + 切镜特效，逐句匹配，见 Day/Day14/Day14分镜_台词匹配版_待审.md；
  · 电视外不再是「一张立绘 + 呼吸」：角色改用 assets/ai-girls 的 8/11/16 帧精灵序列
    逐帧播放，气泡上浮、水光波动、笔迹逐条写出、伞收起、旋钮转动、开机闪白/关机渐暗、
    切镜闪白与划像、震屏；镜头用整数像素 crop+resize 做推拉平移；
  · 字幕层在镜头变换之后绘制，**不随镜头缩放**（`agent.md` 17(f)）；
  · 电视内仍是番外成片真帧（完整缩小场景），默认静音；机身模型尺寸/位置在世界中稳定，
    镜头推近是摄影机运动，不是改电视机模型。

不画画面红线清单里的任何禁用控件，也不做数字看板、角标、水印或说完之后的收尾卡。

依赖（本环境按需装，不入库）：
  python3 -m pip install --user --break-system-packages Pillow numpy
  npm install --no-save --no-package-lock @ffmpeg-installer/ffmpeg @ffprobe-installer/ffprobe
  中文字体 video-fx/assets/fonts/NotoSansSC[wght].ttf（取自 google/fonts，被 .gitignore 忽略）
  抽帧：见 Day/Day14/Day14分镜_电视机版_待审.md 第 3 节（本脚本只读 tools/day14制作/tv_frames/）

用法：
  python3 tools/day14制作/render_day14_video.py --out Day/Day14/成片/Day14_重看昨天那支片子_克隆配音版.mp4
  python3 tools/day14制作/render_day14_video.py --stills 8     # 只出抽查静帧，不编码
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
SPRITE_FPS = 8                          # 角色精灵逐帧播放速度
TAIL_PAD = 0.25                         # 末句后 0.25s 收尾

# ---- 小电视（世界坐标，机身全程稳定；v1 的 1060×630 已缩到 660×400）----
TV_OUTER = (1100, 100, 1760, 500)
SCREEN = (1140, 130, 1700, 445)         # 560×315，16:9
SW, SH = SCREEN[2] - SCREEN[0], SCREEN[3] - SCREEN[1]
ACTOR_BOX = (120, 330)                  # 本鲸在世界里的固定站位
ACTOR_SIZE = (620, 672)
PAPER = (1180, 780, 1720, 960)
SUB_Y = 930                             # Day2 对话条：输出 y=966..1053，标签上移

# Day2 加更《鲸鱼选鱼》统一样式（tools/字幕/day2_style_sub.mjs 的 DAY2_SUB，×1.5 输出）
DAY2_BOX_FILL = (9, 22, 54, 235)
DAY2_BOX_STROKE = (72, 200, 255, 255)
DAY2_TAG_FILL = (30, 64, 175, 255)
DAY2_TAG_STROKE = (250, 204, 21, 255)
DAY2_TAG_TEXT = (253, 230, 138, 255)

# ---- 精灵表：每帧 384×416 的横条 ----
SHEETS = {
    'point': ('assets/ai-girls/lyric-action-v13/whale_point.png', 16),
    'read': ('assets/ai-girls/lyric-action-v13/whale_read_action.png', 16),
    'wipe': ('assets/ai-girls/lyric-action-v13/whale_wipe_tear_action.png', 16),
    'blink': ('assets/ai-girls/lyric-action-v13/whale_sit_blink_action.png', 16),
    'letter': ('assets/ai-girls/actions-v12/whale_letter.png', 11),
    'idle': ('assets/ai-girls/walk-v14/whale_idle_side_pet.png', 8),
    'happy': ('assets/ai-girls/walk-v14/whale_idle_happy_pet.png', 8),
    'walk': ('assets/ai-girls/walk-v14/whale_walk_side_2leg.png', 8),
}

# ---- 逐句分镜表 M01–M24 ----------------------------------------------------
# cam=(cx,cy,scale) 起点，cam2 为镜头内插值终点；move 决定插值方式；
# pose=精灵序列；tv=电视内片段；fx=切镜特效；prop=桌面/机身动效。
# 镜头语言照 TREATMENT.md §5：每 1–3 句一镜，写明景别/机位运动/动作/结果。
SHOTS = [
    dict(id='M01', cam=(900, 540, 1.00), cam2=(900, 540, 1.06), move='push', pose='idle',
         tv='BOOK', tv_mode='play', fx='flash', prop='tv_on', note='焦黑自报，中景轻微推近'),
    dict(id='M02', cam=(820, 520, 1.02), cam2=(1120, 480, 1.06), move='pan_r', pose='walk',
         tv='BOOK', tv_mode='play', fx='none', prop='tv_on', note='把电视搬上桌：横移跟拍到机身'),
    dict(id='M03', cam=(1400, 300, 1.50), cam2=(1400, 300, 1.78), move='push', pose='point',
         tv='BOOK', tv_mode='play', fx='flash', prop='none', note='屏幕特写：红皮书翻开、王城长出'),
    dict(id='M04', cam=(960, 540, 1.00), cam2=(960, 540, 1.04), move='shake', pose='wipe',
         tv='DRAGON', tv_mode='play', fx='shake', prop='none', note='广角＋震屏：龙娘俯冲掳走豆包'),
    dict(id='M05', cam=(680, 560, 1.16), cam2=(900, 540, 1.18), move='pan_r', pose='point',
         tv='MAP', tv_mode='play', fx='none', prop='none', note='中景横移：本鲸应征赶路'),
    dict(id='M06', cam=(520, 610, 1.24), cam2=(560, 620, 1.38), move='push', pose='read',
         tv='CHEST', tv_mode='play', fx='wipe', prop='none', note='近景推近：千问风车村开宝箱'),
    dict(id='M07', cam=(1400, 300, 1.58), cam2=(1400, 300, 1.72), move='push', pose='letter',
         tv='NAME', tv_mode='play', fx='shake', prop='none', note='昵称框特写＋抖动：名字塞不进框'),
    dict(id='M08', cam=(1150, 430, 1.20), cam2=(1320, 400, 1.42), move='push', pose='wipe',
         tv='MOON', tv_mode='play', fx='flash', prop='none', note='斜向推进：Kimi 月光、豆包喊小心后面'),
    dict(id='M09', cam=(960, 540, 1.00), cam2=(960, 540, 1.02), move='shake', pose='wipe',
         tv='FIRE', tv_mode='play', fx='shake_flash', prop='none', note='大全景＋震屏：龙焰喷焦、片子完了'),
    dict(id='M10', cam=(430, 560, 1.42), cam2=(430, 560, 1.58), move='push', pose='blink',
         tv='BOOK', tv_mode='freeze', fx='none', prop='none', note='角色特写：摸摸自己还是焦的'),
    dict(id='M11', cam=(1300, 850, 1.34), cam2=(1300, 850, 1.46), move='push', pose='idle',
         tv='BOOK', tv_mode='freeze', fx='none', prop='paper_blank', note='空白纸特写：纸上一个字都没有'),
    dict(id='M12', cam=(1520, 380, 1.50), cam2=(1420, 400, 1.32), move='pull', pose='point',
         tv='BOOK', tv_mode='freeze', fx='wipe', prop='knob', note='旋钮特写拉远：按下暂停、倒回去'),
    dict(id='M13', cam=(1050, 600, 1.18), cam2=(880, 590, 1.20), move='pan_l', pose='read',
         tv='DRAGON', tv_mode='freeze', fx='none', prop='write1', note='定格回看：谁按下的开始'),
    dict(id='M14', cam=(880, 590, 1.20), cam2=(980, 590, 1.18), move='pan_r', pose='read',
         tv='DRAGON', tv_mode='freeze', fx='none', prop='write1', note='定格回看：龙娘抓走豆包，记一行'),
    dict(id='M15', cam=(1400, 300, 1.56), cam2=(1400, 300, 1.56), move='triple', pose='point',
         tv='NAME', tv_mode='play', fx='flash', prop='none', note='三连快切：大小姐→豆包→Kimi'),
    dict(id='M16', cam=(1400, 300, 1.50), cam2=(1400, 300, 1.44), move='pull', pose='point',
         tv='MOON', tv_mode='play', fx='none', prop='none', note='屏幕特写微拉：Kimi 举的月光'),
    dict(id='M17', cam=(960, 540, 1.06), cam2=(960, 540, 1.00), move='pull', pose='happy',
         tv='FIRE', tv_mode='play', fx='flash', prop='none', note='拉回全景＋闪白：反转「电视里全演过了」'),
    dict(id='M18', cam=(1300, 850, 1.30), cam2=(1300, 850, 1.42), move='push', pose='read',
         tv='FIRE', tv_mode='play', fx='none', prop='write_all', note='俯视桌面：一帧一帧看就够了'),
    dict(id='M19', cam=(1300, 850, 1.38), cam2=(1340, 840, 1.50), move='push', pose='read',
         tv='FIRE', tv_mode='freeze', fx='none', prop='write_all', note='手与纸特写：按片序一段写一行'),
    dict(id='M20', cam=(1340, 840, 1.46), cam2=(1280, 850, 1.38), move='pull', pose='letter',
         tv='FIRE', tv_mode='freeze', fx='none', prop='write_all', note='不替谁顶，也不并成一段'),
    dict(id='M21', cam=(1300, 850, 1.34), cam2=(1300, 850, 1.34), move='static', pose='letter',
         tv='FIRE', tv_mode='freeze', fx='none', prop='clip_charred', note='烤焦那张单独夹起来写「待补」'),
    dict(id='M22', cam=(960, 540, 1.02), cam2=(900, 540, 1.04), move='pan_l', pose='idle',
         tv='dark', tv_mode='dark', fx='flash', prop='tv_off_umbrella', note='关电视、歪伞收进抽屉'),
    dict(id='M23', cam=(700, 620, 1.20), cam2=(700, 620, 1.32), move='push', pose='blink',
         tv='dark', tv_mode='dark', fx='none', prop='bowl', note='近景：白饭是老大买的，这句不改'),
    dict(id='M24', cam=(960, 540, 1.06), cam2=(960, 540, 1.00), move='pull', pose='point',
         tv='dark', tv_mode='dark', fx='none', prop='none', note='全景收尾：把装不下的名字塞回框里'),
]

# 一行内按时间换第二个片段（同 v1 的成片实测定位）
CLIP_SECOND = {5: ('SIGNUP', 0.5), 8: ('CAGE', 0.5), 9: ('END', 0.80)}
# M15 三连快切：大小姐→豆包→Kimi
TRIPLE = [(0.00, 'NAME'), (0.34, 'CAGE'), (0.67, 'MOON')]

frame_index: dict[str, list[str]] = {}


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


def load_frame_index() -> None:
    base = ROOT / 'tools/day14制作/tv_frames'
    needed = {s['tv'] for s in SHOTS} | {v[0] for v in CLIP_SECOND.values()} | {c for _, c in TRIPLE}
    for clip in sorted(needed - {'dark'}):
        files = sorted(p.name for p in (base / clip).glob('*.jpg')) if (base / clip).is_dir() else []
        if not files:
            raise RuntimeError(f'缺片段 {clip} 的抽帧：{base / clip}')
        frame_index[clip] = files


@lru_cache(maxsize=96)
def tv_frame(clip: str, index: int) -> Image.Image:
    files = frame_index.get(clip)
    if not files:
        raise RuntimeError(f'缺抽帧目录 {clip}')
    folder = ROOT / 'tools/day14制作/tv_frames' / clip
    return Image.open(folder / files[index % len(files)]).convert('RGB').resize((SW, SH), Image.LANCZOS)


@lru_cache(maxsize=64)
def actor_frame(pose: str, idx: int) -> Image.Image:
    """精灵序列逐帧：焦黑调整色，保留 alpha。"""
    rel, n = SHEETS[pose]
    sheet = Image.open(ROOT / rel).convert('RGBA')
    i = idx % n
    frame = sheet.crop((i * 384, 0, (i + 1) * 384, 416)).resize(ACTOR_SIZE, Image.LANCZOS)
    rgb = ImageEnhance.Color(frame.convert('RGB')).enhance(0.72)
    rgb = ImageEnhance.Brightness(rgb).enhance(0.78)
    out = rgb.convert('RGBA')
    out.putalpha(frame.getchannel('A'))
    return out


@lru_cache(maxsize=128)
def subtitle_layer(text: str) -> Image.Image:
    """复刻项目统一的 Day2 字幕条（深蓝底 + #48C8FF 青描边 + 说话人小标签）。"""
    layer = Image.new('RGBA', (W, 150), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    f = font(42)
    box = d.textbbox((0, 0), text, font=f, stroke_width=3)
    tw = box[2] - box[0]
    bw = min(W - 160, max(620, tw + 120))
    x0 = (W - bw) // 2
    y0, y1 = 36, 123
    d.rounded_rectangle((x0, y0, x0 + bw, y1), radius=18,
                        fill=DAY2_BOX_FILL, outline=DAY2_BOX_STROKE, width=3)
    d.text(((W - tw) // 2 - box[0], y0 + 19), text, font=f, fill=(255, 255, 255, 255),
           stroke_width=2, stroke_fill=(6, 20, 44, 235))
    tf = font(22)
    tag = '鲸鱼娘'
    tb = d.textbbox((0, 0), tag, font=tf)
    d.rounded_rectangle((x0 + 24, y0 - 22, x0 + 44 + (tb[2] - tb[0]), y0 + 8), radius=7,
                        fill=DAY2_TAG_FILL, outline=DAY2_TAG_STROKE, width=2)
    d.text((x0 + 34, y0 - 21), tag, font=tf, fill=DAY2_TAG_TEXT)
    return layer


def background(t: float) -> Image.Image:
    """海底房间 + 浅青桌面 + 小电视外框；气泡上浮、水光波动是逐帧环境动画。"""
    yy = np.arange(H, dtype=np.float32)[:, None]
    p = yy / H
    top = np.array([9, 33, 58], np.float32)
    bot = np.array([24, 88, 112], np.float32)
    grad = top[None, None, :] * (1 - p[:, :, None]) + bot[None, None, :] * p[:, :, None]
    light = np.array([126, 196, 214], np.float32)
    glow = np.clip((190 - yy) / 140.0, 0, 1) ** 0.8
    # 水光轻微呼吸（±3%），不是控件，只是场景光
    glow = glow * (0.97 + 0.03 * math.sin(t * 1.7))
    grad = grad * (1 - glow[:, :, None]) + light[None, None, :] * glow[:, :, None]
    im = Image.fromarray(np.repeat(grad, W, axis=1).astype(np.uint8), 'RGB')
    d = ImageDraw.Draw(im)
    d.rectangle((0, 760, W, H), fill=(150, 214, 216))
    d.rectangle((0, 756, W, 772), fill=(102, 172, 181))
    d.line((0, 772, W, 772), fill=(72, 140, 154), width=3)
    # 气泡上浮：每个气泡按 t 循环上升，不再是一排静止圆
    rng = np.random.default_rng(14)
    for k in range(46):
        x = int(rng.integers(20, W - 20))
        y0 = int(rng.integers(60, 740))
        r = int(rng.integers(3, 13))
        speed = 9 + (k % 5) * 5
        y = int((y0 - t * speed) % 780) - 20
        d.ellipse((x - r, y - r, x + r, y + r), outline=(96, 168, 190), width=2)
    # 小电视机身（世界坐标稳定）
    d.rounded_rectangle(TV_OUTER, radius=26, fill=(42, 60, 74), outline=(16, 28, 38), width=5)
    d.rounded_rectangle((TV_OUTER[0] + 10, TV_OUTER[1] + 10, TV_OUTER[2] - 10, TV_OUTER[3] - 10),
                        radius=20, fill=(64, 86, 100), outline=(104, 132, 146), width=3)
    d.rounded_rectangle((SCREEN[0] - 9, SCREEN[1] - 9, SCREEN[2] + 9, SCREEN[3] + 9),
                        radius=9, fill=(18, 26, 34), outline=(10, 16, 22), width=3)
    d.rectangle(SCREEN, fill=(8, 14, 20))
    for cy in (438, 468):
        d.ellipse((1720, cy - 11, 1742, cy + 11), fill=(28, 42, 52), outline=(128, 158, 170), width=2)
        d.line((1731, cy - 6, 1731, cy + 1), fill=(190, 210, 216), width=2)
    d.rounded_rectangle((1200, 500, 1280, 520), radius=5, fill=(36, 50, 60))
    d.rounded_rectangle((1580, 500, 1660, 520), radius=5, fill=(36, 50, 60))
    return im


def draw_props(d: ImageDraw.ImageDraw, line: int, frac: float, t: float) -> None:
    """桌面道具按台词逐帧动：笔迹逐条写出、烤焦那张夹入、伞收起、旋钮转动。"""
    shot = SHOTS[line - 1]
    prop = shot['prop']
    d.rounded_rectangle(PAPER, radius=8, fill=(244, 246, 232), outline=(196, 202, 186), width=3)
    written = 0 if line < 13 else (1 if prop == 'write1' else min(9, line - 12))
    if prop == 'write_all':
        written = min(9, max(1, int(frac * 10)))
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
    # 烤焦那张：M21 起从右上角滑入
    if line >= 21:
        k = min(1.0, max(0.0, (line - 21 + frac) / 1.2))
        off = int(70 * (1 - k))
        d.polygon([(PAPER[2] - 6 + off, PAPER[1] - 6 - off),
                   (PAPER[2] + 62 + off, PAPER[1] + 4 - off),
                   (PAPER[2] + 56 + off, PAPER[1] + 70 - off),
                   (PAPER[2] - 10 + off, PAPER[1] + 58 - off)],
                  fill=(58, 52, 48), outline=(30, 26, 24))
    # 歪伞：M22 起缩短收进抽屉
    if line < 22:
        d.line((1810, 620, 1790, 880), fill=(92, 74, 98), width=7)
        d.arc((1750, 570, 1875, 660), 190, 350, fill=(190, 96, 118), width=9)
        d.line((1790, 880, 1812, 894), fill=(92, 74, 98), width=7)
    else:
        k = min(1.0, max(0.0, (line - 22 + frac) / 1.5))
        d.rounded_rectangle((1740, 800, 1890, 900), radius=8,
                            fill=(116, 174, 180), outline=(72, 130, 140), width=4)
        d.line((1800, 838, 1830, 838), fill=(60, 100, 110), width=5)
        if k < 0.35:
            top = int(620 + (1 - k / 0.35) * 150)
            d.line((1810, top, 1790, min(880, top + 260)), fill=(92, 74, 98), width=7)
    # 白饭盆（L23 近景）
    if prop == 'bowl':
        d.ellipse((980, 830, 1120, 900), fill=(238, 240, 226), outline=(180, 188, 176), width=4)
        d.ellipse((1000, 838, 1100, 878), fill=(250, 250, 244))
    # 旋钮转动（M12 暂停/倒带）
    if prop == 'knob':
        ang = t * 5.0
        cx, cy = 1731, 438
        d.ellipse((cx - 13, cy - 13, cx + 13, cy + 13), outline=(240, 220, 120), width=3)
        d.line((cx, cy, cx + 11 * math.cos(ang), cy + 11 * math.sin(ang)),
               fill=(240, 220, 120), width=3)


def camera_at(shot: dict, frac: float, t: float) -> tuple[float, float, float]:
    a, b = shot['cam'], shot['cam2']
    k = min(1.0, max(0.0, frac))
    # 平滑但仍是硬切镜：镜头内用 ease，不跨镜插值
    k = k * k * (3 - 2 * k)
    cx, cy = a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k
    # 不小于 1.0：拉远不能超过全景，否则 crop 出画面外会出现黑边
    scale = max(1.0, a[2] + (b[2] - a[2]) * k)
    if shot['fx'] in ('shake', 'shake_flash') or shot['move'] == 'shake':
        cx += 6 * math.sin(t * 47.0)
        cy += 5 * math.sin(t * 39.0 + 1.2)
    return cx, cy, scale


def apply_camera(im: Image.Image, cam: tuple[float, float, float]) -> Image.Image:
    """整数像素相机：crop + resize 做推/拉/横移/纵摇，不重画场景。"""
    cx, cy, scale = cam
    cw, ch = W / scale, H / scale
    x0 = int(round(min(max(cx - cw / 2, 0), W - cw)))
    y0 = int(round(min(max(cy - ch / 2, 0), H - ch)))
    return im.crop((x0, y0, x0 + int(cw), y0 + int(ch))).resize((W, H), Image.LANCZOS)


def tv_at(shot: dict, cue: dict, t: float, frac: float) -> tuple[str, str, int]:
    line = int(cue['index'])
    clip, mode = shot['tv'], shot['tv_mode']
    if shot['move'] == 'triple':
        for at, c in reversed(TRIPLE):
            if frac >= at:
                clip = c
                break
        mode = 'play'
    if line in CLIP_SECOND:
        second, at = CLIP_SECOND[line]
        if frac >= at:
            clip = second
    if clip == 'dark':
        return clip, mode, 0
    n = len(frame_index.get(clip, []))
    if not n:
        return clip, mode, 0
    if mode == 'freeze':
        return clip, mode, n // 2
    return clip, mode, int((t - cue['start']) * 10) % n


def effects(im: Image.Image, shot: dict, frac: float, t: float) -> Image.Image:
    """切镜闪白 / 前景划像：照 MV 的震屏、闪白、划像手法，不新增 UI 控件。"""
    age = frac * 4.0  # 归一到「切镜后经过的秒数」近似值
    if shot['fx'] in ('flash', 'shake_flash') or shot['move'] == 'triple':
        # 每个硬切镜起点 0.10s 闪白；三连快切在 1/3、2/3 处各补一次
        pulses = [0.0]
        if shot['move'] == 'triple':
            pulses = [0.0, 0.34, 0.67]
        for p0 in pulses:
            dt = frac - p0
            if 0 <= dt < 0.028:
                a = int(120 * (1 - dt / 0.028))
                im = Image.blend(im, Image.new('RGB', (W, H), (255, 255, 255)), a / 255)
                break
    if shot['fx'] == 'wipe' and frac < 0.09:
        d = ImageDraw.Draw(im)
        x = int(-300 + (W + 600) * (frac / 0.09))
        d.polygon([(x, 0), (x + 190, 0), (x - 10, H), (x - 200, H)], fill=(28, 62, 82))
        d.line((x + 190, 0, x - 10, H), fill=(126, 196, 214), width=5)
    return im


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
    assert len(SHOTS) == 24
    cues = alignment['cues']
    screens = subs['screens']
    source_duration = float(alignment['source_duration_seconds'])
    out_duration = round(float(cues[-1]['end']) + TAIL_PAD, 3)
    total_frames = math.ceil(out_duration * FPS)
    load_frame_index()

    cue_starts = [c['start'] for c in cues]
    scr_starts = [s['start'] for s in screens]
    scr_ends = [s['end'] for s in screens]

    def render_at(t: float) -> Image.Image:
        ci = max(0, min(len(cues) - 1, bisect.bisect_right(cue_starts, t) - 1))
        cue = cues[ci]
        line = int(cue['index'])
        shot = SHOTS[line - 1]
        frac = min(0.999, max(0.0, (t - cue['start']) / max(0.01, cue['end'] - cue['start'])))
        im = background(t)
        d = ImageDraw.Draw(im)
        clip, mode, idx = tv_at(shot, cue, t, frac)
        if clip == 'dark':
            d.rectangle(SCREEN, fill=(10, 17, 24))
            d.line((SCREEN[0] + 30, SCREEN[3] - 30, SCREEN[2] - 30, SCREEN[1] + 30),
                   fill=(24, 38, 50), width=2)
        else:
            im.paste(tv_frame(clip, idx), (SCREEN[0], SCREEN[1]))
            d = ImageDraw.Draw(im)
        # 开机：首句前 1.2s 用半透明黑遮罩渐亮，仍看得见 BOOK 画面；
        # 不是把屏幕刷成纯黑，也不画任何按钮/控件。
        if shot['prop'] == 'tv_on' and line <= 2:
            k = min(1.0, max(0.0, (t - cue_starts[0]) / 1.2))
            if k < 1:
                veil = Image.new('RGBA', (SW, SH), (8, 14, 20, int(205 * (1 - k))))
                im.paste(veil, (SCREEN[0], SCREEN[1]), veil)
                d = ImageDraw.Draw(im)
        # 角色：精灵逐帧动画；freeze 镜定格在第 0 帧
        n = SHEETS[shot['pose']][1]
        sidx = 0 if mode == 'freeze' or shot['move'] == 'static' else int((t - cue['start']) * SPRITE_FPS) % n
        bob = round(3.0 * math.sin(t * 2.1)) if sidx else 0
        a = actor_frame(shot['pose'], sidx)
        im.paste(a, (ACTOR_BOX[0], ACTOR_BOX[1] + bob), a)
        d = ImageDraw.Draw(im)
        draw_props(d, line, frac, t)
        # 镜头变换（整数像素相机）→ 切镜特效
        im = apply_camera(im, camera_at(shot, frac, t))
        im = effects(im, shot, frac, t)
        # 字幕在镜头之后绘制，固定位置，不随镜头缩放
        si = max(0, min(len(screens) - 1, bisect.bisect_right(scr_starts, t) - 1))
        if scr_starts[si] <= t < scr_ends[si]:
            layer = subtitle_layer(screens[si]['text'])
            im.paste(layer, (0, SUB_Y), layer)
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
        proc.stdin.close(); proc.wait()
        raise RuntimeError(f'ffmpeg 提前退出：{Path("/tmp/day14_ffmpeg.log").read_text()[-2000:]}')
    rc = proc.wait(); log.close()
    if rc != 0:
        raise RuntimeError(f'ffmpeg exit={rc}：{Path("/tmp/day14_ffmpeg.log").read_text()[-2000:]}')
    print(f'DONE {out}  frames={total_frames} source={source_duration:.3f}s out={out_duration:.3f}s size={out.stat().st_size / 1e6:.1f}MB')
    return 0


if __name__ == '__main__':
    sys.exit(main())
