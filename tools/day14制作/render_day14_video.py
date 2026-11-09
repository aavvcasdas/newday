#!/usr/bin/env python3
"""Day14《重看昨天那支片子》成片渲染器 v3 —— 更小的电视 / 八位人物真正走起来 / 背景与道具逐帧动。

用户 2026-11-09 的两次反馈：

  · v2 反馈：「除了电视机怎么没有动画了，请将电视机变小，并且学习 mv 的分镜
    根据台词匹配分镜然后重新渲染视频。」→ v2 做了 M01–M24 逐句切镜与电视外镜头运动。
  · v3 反馈：「电视机小些啊，人物为什么还是在哪不动，看看之前的人物，
    让人物和背景以及道具细节动起来，电视机缩小。」→ 本版：

    1. 电视再缩一圈：v1 `1060×630 / 920×517` → v2 `660×400 / 560×315`
       → **v3 `440×276 / 380×214`**，挪到右上角 `(1400,96)–(1840,372)`；
       机身尺寸/位置在世界坐标里仍全程稳定，推近只是摄影机运动。
    2. 人物不再「一只立绘站在原地换微差分帧」：按 `tools/engine/character_motion.mjs`
       与 `motion_library.mjs` 里登记过的**之前那批人物**（`assets/ai-girls/walk-v14`
       八位双骨骼步态 + `lyric-action-v13` / `actions-v12` 的番外动作图集），
       把八位本名都放回舞台：`12fps` 走步逐帧 + **逐帧位移走位** + 错相呼吸/摆动 +
       落地影子随步幅收放 + 左右转身；每个镜头按台词安排谁上场、往哪走、做什么。
    3. 背景动：斜向光带缓慢漂移、墙面水纹正弦游走、书架书本轻晃、吊灯摆、
       海草摆动、气泡上浮带高光、桌面水光涟漪、前景浮尘视差。
    4. 道具细节动：笔尖带着羽毛笔逐段写出（不是整行跳变）、红皮书翻页长出城塔、
       三只宝箱依次开盖冒星、昵称框的字迹往外溢、Kimi 月光光晕与射线转、
       金笼链条晃、龙焰火舌与火星、烤焦那张滑入夹好、歪伞收骨进抽屉、
       旋钮常转、白饭冒热气、天线与旋钮抖动、开机渐亮。
    5. M01–M24 逐句硬切、镜头推拉/横移/震屏/闪白/划像/三连快切保留；
       镜头幅度收小，保证**人物和电视同时在画面里**，不再把角色推出画外。
       电视定格镜里人物照样在动，不跟着定住。

字幕层在镜头变换之后绘制，固定位置，不随镜头/电视缩放（`agent.md` 17(f)）；
电视内仍是番外成片真帧按比例缩小的完整场景，默认静音；不画任何界面控件、
不做数字看板/角标/水印/说完之后的收尾卡。

依赖（本环境按需装，不入库）：
  python3 -m pip install --user --break-system-packages Pillow numpy
  npm install --no-save --no-package-lock @ffmpeg-installer/ffmpeg @ffprobe-installer/ffprobe
  中文字体 video-fx/assets/fonts/NotoSansSC[wght].ttf（取自 google/fonts，被 .gitignore 忽略）
  抽帧：见 Day/Day14/Day14分镜_电视机版_待审.md 第 3 节（本脚本只读 tools/day14制作/tv_frames/）

用法：
  python3 tools/day14制作/render_day14_video.py --out Day/Day14/成片/Day14_重看昨天那支片子_克隆配音版.mp4
  python3 tools/day14制作/render_day14_video.py --stills 12     # 只出抽查静帧，不编码
"""
from __future__ import annotations

import argparse
import bisect
import io
import json
import math
import os
import random
import shutil
import subprocess
import sys
from functools import lru_cache
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFont

ROOT = Path(__file__).resolve().parents[2]
W, H, FPS = 1920, 1080, 30             # 仓库统一规格（verify_episode.py 要求 1080p30）
WALK_FPS = 12                           # 走步/待机逐帧速度
ACT_FPS = 10                            # 番外动作图集逐帧速度
TAIL_PAD = 0.25                         # 末句后 0.25s 收尾

# ---- 小电视（v3：440×276 机身 / 380×214 屏幕；世界坐标全程稳定）----
TV_OUTER = (1400, 96, 1840, 372)
SCREEN = (1428, 124, 1808, 338)         # 380×214，16:9
SW, SH = SCREEN[2] - SCREEN[0], SCREEN[3] - SCREEN[1]
PAPER = (1120, 772, 1650, 952)
SUB_Y = 930                             # Day2 对话条：输出 y=966..1053，标签上移

# Day2 加更《鲸鱼选鱼》统一样式（tools/字幕/day2_style_sub.mjs 的 DAY2_SUB，×1.5 输出）
DAY2_BOX_FILL = (9, 22, 54, 235)
DAY2_BOX_STROKE = (72, 200, 255, 255)
DAY2_TAG_FILL = (30, 64, 175, 255)
DAY2_TAG_STROKE = (250, 204, 21, 255)
DAY2_TAG_TEXT = (253, 230, 138, 255)

# ---- 之前那批人物：每帧 384×416 的横条图集 --------------------------------
# walk-v14 是双骨骼连续蒙皮步态（8 帧），lyric-action-v13 / actions-v12 是番外动作图集。
SHEETS = {
    'whale_walk': ('assets/ai-girls/walk-v14/whale_walk_side_2leg.png', 8),
    'whale_idle': ('assets/ai-girls/walk-v14/whale_idle_side_pet.png', 8),
    'whale_happy': ('assets/ai-girls/walk-v14/whale_idle_happy_pet.png', 8),
    'whale_point': ('assets/ai-girls/lyric-action-v13/whale_point.png', 16),
    'whale_read': ('assets/ai-girls/lyric-action-v13/whale_read_action.png', 16),
    'whale_wipe': ('assets/ai-girls/lyric-action-v13/whale_wipe_tear_action.png', 16),
    'whale_blink': ('assets/ai-girls/lyric-action-v13/whale_sit_blink_action.png', 16),
    'whale_crouch': ('assets/ai-girls/lyric-action-v13/whale_side_crouch_action.png', 16),
    'whale_letter': ('assets/ai-girls/actions-v12/whale_letter.png', 11),
    'gpt_walk': ('assets/ai-girls/walk-v14/gpt_walk_2leg.png', 8),
    'gpt_idle': ('assets/ai-girls/walk-v14/gpt_idle_pet.png', 8),
    'gpt_act': ('assets/ai-girls/lyric-action-v13/gpt_push_final_action.png', 16),
    'doubao_walk': ('assets/ai-girls/walk-v14/doubao_walk_side_2leg.png', 8),
    'doubao_idle': ('assets/ai-girls/walk-v14/doubao_idle_side_pet.png', 8),
    'doubao_act': ('assets/ai-girls/lyric-action-v13/doubao_lantern_action.png', 16),
    'claude_walk': ('assets/ai-girls/walk-v14/claude_walk_2leg.png', 8),
    'claude_idle': ('assets/ai-girls/walk-v14/claude_idle_pet.png', 8),
    'claude_act': ('assets/ai-girls/lyric-action-v13/claude_place_action.png', 16),
    'kimi_walk': ('assets/ai-girls/walk-v14/kimi_walk_2leg.png', 8),
    'kimi_idle': ('assets/ai-girls/walk-v14/kimi_idle_pet.png', 8),
    'kimi_act': ('assets/ai-girls/lyric-action-v13/kimi_stargaze_seated_action.png', 16),
    'gemini_walk': ('assets/ai-girls/walk-v14/gemini_walk_2leg.png', 8),
    'gemini_idle': ('assets/ai-girls/walk-v14/gemini_idle_pet.png', 8),
    'gemini_act': ('assets/ai-girls/lyric-action-v13/gemini_star_toss_action.png', 16),
    'zai_walk': ('assets/ai-girls/walk-v14/zai_walk_2leg.png', 8),
    'zai_idle': ('assets/ai-girls/walk-v14/zai_idle_pet.png', 8),
    'zai_act': ('assets/ai-girls/lyric-action-v13/zai_reach_action.png', 16),
    'qwen_walk': ('assets/ai-girls/walk-v14/qwen_walk_2leg.png', 8),
    'qwen_idle': ('assets/ai-girls/walk-v14/qwen_idle_pet.png', 8),
    'qwen_act': ('assets/ai-girls/lyric-action-v13/qwen_reach_action.png', 16),
}

# 八位本名 ↔ 番外 CREDITS；尺寸保持 384:416 比例，本鲸是前景所以稍大。
CAST = {
    '本鲸': dict(size=(350, 379), idle='whale_idle'),
    '龙娘': dict(size=(290, 314), idle='gpt_idle'),
    '豆包': dict(size=(260, 282), idle='doubao_idle'),
    '大小姐': dict(size=(285, 309), idle='claude_idle'),
    'Kimi': dict(size=(275, 298), idle='kimi_idle'),
    'Gemini': dict(size=(275, 298), idle='gemini_idle'),
    '智谱': dict(size=(270, 293), idle='zai_idle'),
    '千问': dict(size=(270, 293), idle='qwen_idle'),
}
POSE_SHEET = {
    'idle': 'whale_idle', 'walk': 'whale_walk', 'point': 'whale_point',
    'read': 'whale_read', 'wipe': 'whale_wipe', 'blink': 'whale_blink',
    'letter': 'whale_letter', 'happy': 'whale_happy',
}

# ---- 逐句分镜表 M01–M24 ----------------------------------------------------
# cam=(cx,cy,scale) 起点，cam2 为镜头内插值终点；move 决定插值方式；
# pose=本鲸默认动作图集；tv=电视内片段；fx=切镜特效；prop=桌面/机身动效。
# v3 把推近幅度收小：此前 1.5–1.78× 的屏幕特写会把人物推到画外，本版保证人物在画里。
SHOTS = [
    dict(id='M01', cam=(960, 540, 1.00), cam2=(960, 540, 1.08), move='push', pose='idle',
         tv='BOOK', tv_mode='play', fx='flash', prop='tv_on', note='焦黑自报：本鲸从左侧走进来'),
    dict(id='M02', cam=(860, 520, 1.02), cam2=(1120, 500, 1.08), move='pan_r', pose='walk',
         tv='BOOK', tv_mode='play', fx='none', prop='tv_on', note='搬电视上桌：三人横移走位'),
    dict(id='M03', cam=(1280, 400, 1.18), cam2=(1320, 390, 1.34), move='push', pose='point',
         tv='BOOK', tv_mode='play', fx='flash', prop='book', note='屏幕亮：红皮书翻页、城堡长出来'),
    dict(id='M04', cam=(960, 540, 1.00), cam2=(960, 540, 1.04), move='shake', pose='wipe',
         tv='DRAGON', tv_mode='play', fx='shake', prop='none', note='龙娘俯冲掳走豆包、天暗'),
    dict(id='M05', cam=(760, 540, 1.10), cam2=(1000, 520, 1.14), move='pan_r', pose='walk',
         tv='MAP', tv_mode='play', fx='none', prop='none', note='本鲸应征赶路，Gemini 与智谱送行'),
    dict(id='M06', cam=(900, 600, 1.14), cam2=(1000, 620, 1.24), move='push', pose='read',
         tv='CHEST', tv_mode='play', fx='wipe', prop='chests', note='千问陪开三只宝箱，走到山洞口'),
    dict(id='M07', cam=(1320, 410, 1.22), cam2=(1360, 400, 1.36), move='push', pose='letter',
         tv='NAME', tv_mode='play', fx='shake', prop='namebox', note='名字塞不进框，大小姐追着问'),
    dict(id='M08', cam=(1100, 480, 1.14), cam2=(1240, 440, 1.28), move='push', pose='wipe',
         tv='MOON', tv_mode='play', fx='flash', prop='moon_cage', note='Kimi 月光照洞口，豆包在笼里喊'),
    dict(id='M09', cam=(960, 540, 1.00), cam2=(960, 540, 1.04), move='shake', pose='wipe',
         tv='FIRE', tv_mode='play', fx='shake_flash', prop='fire', note='龙焰喷焦、众人散开、片子完了'),
    dict(id='M10', cam=(760, 560, 1.18), cam2=(760, 560, 1.30), move='push', pose='blink',
         tv='BOOK', tv_mode='freeze', fx='none', prop='none', note='角色近景：摸摸自己还是焦的'),
    dict(id='M11', cam=(1150, 720, 1.20), cam2=(1150, 720, 1.30), move='push', pose='idle',
         tv='BOOK', tv_mode='freeze', fx='none', prop='paper_blank', note='空白纸特写：一个字都没有'),
    dict(id='M12', cam=(1400, 380, 1.24), cam2=(1320, 420, 1.16), move='pull', pose='point',
         tv='BOOK', tv_mode='freeze', fx='wipe', prop='knob', note='按下暂停、倒回去：旋钮转'),
    dict(id='M13', cam=(1050, 580, 1.12), cam2=(900, 570, 1.16), move='pan_l', pose='read',
         tv='DRAGON', tv_mode='freeze', fx='none', prop='write', note='定格回看：谁按下的开始'),
    dict(id='M14', cam=(880, 570, 1.16), cam2=(1000, 570, 1.12), move='pan_r', pose='read',
         tv='DRAGON', tv_mode='freeze', fx='none', prop='write', note='定格回看：龙娘抓走豆包，记一行'),
    dict(id='M15', cam=(1300, 400, 1.30), cam2=(1300, 400, 1.30), move='triple', pose='point',
         tv='NAME', tv_mode='play', fx='flash', prop='namebox', note='三连快切：大小姐→豆包→Kimi'),
    dict(id='M16', cam=(1300, 400, 1.30), cam2=(1300, 400, 1.20), move='pull', pose='point',
         tv='MOON', tv_mode='play', fx='none', prop='moon_cage', note='屏幕微拉：Kimi 举的月光'),
    dict(id='M17', cam=(960, 540, 1.08), cam2=(960, 540, 1.00), move='pull', pose='happy',
         tv='FIRE', tv_mode='play', fx='flash', prop='write', note='拉回全景：反转「电视里全演过了」'),
    dict(id='M18', cam=(1150, 720, 1.18), cam2=(1150, 720, 1.28), move='push', pose='read',
         tv='FIRE', tv_mode='play', fx='none', prop='write', note='俯视桌面：一帧一帧看就够了'),
    dict(id='M19', cam=(1200, 730, 1.24), cam2=(1260, 720, 1.32), move='push', pose='read',
         tv='FIRE', tv_mode='freeze', fx='none', prop='write', note='手与纸近景：按片序一段写一行'),
    dict(id='M20', cam=(1260, 720, 1.30), cam2=(1180, 720, 1.22), move='pull', pose='letter',
         tv='FIRE', tv_mode='freeze', fx='none', prop='write', note='不替谁顶，也不并成一段'),
    dict(id='M21', cam=(1200, 720, 1.24), cam2=(1200, 720, 1.24), move='static', pose='letter',
         tv='FIRE', tv_mode='freeze', fx='none', prop='clip_charred', note='烤焦那张单独夹起来'),
    dict(id='M22', cam=(960, 540, 1.02), cam2=(900, 540, 1.06), move='pan_l', pose='idle',
         tv='dark', tv_mode='dark', fx='flash', prop='tv_off_umbrella', note='关电视、歪伞收进抽屉'),
    dict(id='M23', cam=(760, 600, 1.14), cam2=(760, 600, 1.24), move='push', pose='blink',
         tv='dark', tv_mode='dark', fx='none', prop='bowl', note='近景：白饭是老大买的'),
    dict(id='M24', cam=(960, 540, 1.06), cam2=(960, 540, 1.00), move='pull', pose='point',
         tv='dark', tv_mode='dark', fx='none', prop='namebox', note='全景收尾：八位回场，名字塞回框'),
]

# 一行内按时间换第二个片段（成片实测定位）
CLIP_SECOND = {5: ('SIGNUP', 0.5), 8: ('CAGE', 0.5), 9: ('END', 0.80)}
# M15 三连快切：大小姐→豆包→Kimi
TRIPLE = [(0.00, 'NAME'), (0.34, 'CAGE'), (0.67, 'MOON')]

# ---- 逐句走位：谁上场、从哪走到哪、用哪套动作图集 -------------------------
# p0/p1 是人物左上角的世界坐标；每帧线性位移 + 错相摆动 + 步态上下起伏。
def C(who, p0, p1, sheet=None, phase=0.0, z=1, sway=4, fps=None, flip=None):
    return dict(who=who, p0=p0, p1=p1, sheet=sheet, phase=phase, z=z,
                sway=sway, fps=fps, flip=flip)


CHOREO = {
    1: [C('本鲸', (120, 470), (470, 470), 'whale_walk', z=3, phase=.1)],
    2: [C('Gemini', (40, 520), (430, 520), 'gemini_walk', z=1, phase=.3),
        C('智谱', (1330, 520), (980, 520), 'zai_walk', z=1, phase=.7),
        C('本鲸', (470, 470), (830, 470), 'whale_walk', z=3, phase=.1)],
    3: [C('豆包', (880, 510), (990, 510), 'doubao_idle', z=1, phase=.5),
        C('大小姐', (1090, 510), (1180, 510), 'claude_idle', z=1, phase=1.1),
        C('本鲸', (520, 470), (650, 470), z=3, phase=.2)],
    4: [C('龙娘', (120, 150), (720, 400), 'gpt_act', z=2, phase=.4, sway=9),
        C('豆包', (1000, 470), (620, 470), 'doubao_walk', z=1, phase=.9),
        C('本鲸', (420, 470), (530, 470), z=3, phase=.1)],
    5: [C('Gemini', (60, 510), (500, 510), 'gemini_walk', z=1, phase=.2),
        C('智谱', (1340, 510), (1010, 510), 'zai_walk', z=1, phase=.8),
        C('本鲸', (300, 470), (920, 470), 'whale_walk', z=3, phase=.1)],
    6: [C('千问', (250, 480), (520, 480), 'qwen_act', z=2, phase=.5),
        C('本鲸', (600, 470), (1020, 470), 'whale_walk', z=3, phase=.1)],
    7: [C('Gemini', (1180, 520), (1260, 520), 'gemini_idle', z=1, phase=.9),
        C('大小姐', (1150, 470), (620, 470), 'claude_act', z=2, phase=.4),
        C('本鲸', (560, 470), (330, 470), 'whale_walk', z=3, phase=.1)],
    8: [C('Kimi', (300, 470), (470, 470), 'kimi_act', z=2, phase=.3),
        C('豆包', (1120, 470), (940, 470), 'doubao_act', z=1, phase=.8),
        C('本鲸', (640, 470), (760, 470), z=3, phase=.1)],
    9: [C('龙娘', (240, 300), (720, 420), 'gpt_act', z=2, phase=.4, sway=10),
        C('豆包', (1000, 500), (1330, 500), 'doubao_walk', z=1, phase=.9),
        C('大小姐', (1150, 510), (1400, 510), 'claude_walk', z=1, phase=.5),
        C('本鲸', (620, 470), (500, 470), z=3, phase=.1)],
    10: [C('龙娘', (1080, 500), (1150, 500), 'gpt_idle', z=1, phase=.6),
         C('本鲸', (520, 470), (600, 470), 'whale_crouch', z=3, phase=.1)],
    11: [C('大小姐', (1060, 510), (1140, 510), 'claude_idle', z=1, phase=.4),
         C('本鲸', (560, 470), (620, 470), z=3, phase=.1)],
    12: [C('智谱', (1090, 510), (1180, 510), 'zai_idle', z=1, phase=.7),
         C('本鲸', (560, 470), (720, 470), z=3, phase=.1)],
    13: [C('龙娘', (100, 520), (440, 520), 'gpt_walk', z=1, phase=.3),
         C('豆包', (1330, 520), (980, 520), 'doubao_walk', z=1, phase=.8),
         C('本鲸', (660, 470), (740, 470), z=3, phase=.1)],
    14: [C('龙娘', (180, 500), (620, 500), 'gpt_walk', z=1, phase=.3),
         C('豆包', (980, 500), (520, 500), 'doubao_walk', z=1, phase=.8),
         C('本鲸', (700, 470), (780, 470), z=3, phase=.1)],
    15: [C('大小姐', (320, 470), (520, 470), 'claude_act', z=1, phase=.2),
         C('豆包', (700, 470), (900, 470), 'doubao_act', z=1, phase=.6),
         C('Kimi', (1050, 470), (1220, 470), 'kimi_act', z=1, phase=1.0),
         C('本鲸', (620, 470), (740, 470), z=3, phase=.1)],
    16: [C('Kimi', (450, 470), (620, 470), 'kimi_act', z=2, phase=.3),
         C('本鲸', (760, 470), (860, 470), z=3, phase=.1)],
    17: [C('Gemini', (40, 500), (420, 500), 'gemini_walk', z=1, phase=.1),
         C('智谱', (1360, 500), (1000, 500), 'zai_walk', z=1, phase=.5),
         C('龙娘', (60, 550), (470, 550), 'gpt_walk', z=2, phase=.9),
         C('豆包', (1340, 550), (940, 550), 'doubao_walk', z=2, phase=.3),
         C('大小姐', (100, 590), (520, 590), 'claude_walk', z=2, phase=.7),
         C('Kimi', (1320, 590), (900, 590), 'kimi_walk', z=2, phase=.2),
         C('千问', (120, 620), (500, 620), 'qwen_walk', z=2, phase=.6),
         C('本鲸', (540, 470), (640, 470), 'whale_happy', z=3, phase=.1)],
    18: [C('千问', (100, 520), (470, 520), 'qwen_walk', z=1, phase=.3),
         C('Gemini', (1340, 520), (1000, 520), 'gemini_walk', z=1, phase=.8),
         C('本鲸', (620, 470), (700, 470), z=3, phase=.1)],
    19: [C('大小姐', (200, 520), (620, 520), 'claude_walk', z=1, phase=.2),
         C('Kimi', (1300, 520), (950, 520), 'kimi_walk', z=1, phase=.7),
         C('本鲸', (700, 470), (780, 470), z=3, phase=.1)],
    20: [C('豆包', (300, 520), (580, 520), 'doubao_walk', z=1, phase=.3),
         C('龙娘', (1260, 520), (940, 520), 'gpt_walk', z=1, phase=.8),
         C('本鲸', (720, 470), (800, 470), z=3, phase=.1)],
    21: [C('智谱', (1080, 510), (1170, 510), 'zai_idle', z=1, phase=.4),
         C('千问', (270, 510), (360, 510), 'qwen_idle', z=1, phase=.9),
         C('Gemini', (1250, 530), (1320, 530), 'gemini_idle', z=1, phase=.6),
         C('本鲸', (720, 470), (790, 470), z=3, phase=.1)],
    22: [C('龙娘', (900, 510), (1400, 510), 'gpt_walk', z=1, phase=.3),
         C('豆包', (700, 520), (200, 520), 'doubao_walk', z=1, phase=.8),
         C('本鲸', (600, 470), (680, 470), z=3, phase=.1)],
    23: [C('豆包', (1060, 510), (1140, 510), 'doubao_idle', z=1, phase=.5),
         C('本鲸', (540, 470), (620, 470), z=3, phase=.1)],
    24: [C('Gemini', (40, 500), (430, 500), 'gemini_walk', z=1, phase=.1),
         C('智谱', (1380, 500), (1010, 500), 'zai_walk', z=1, phase=.5),
         C('龙娘', (60, 550), (480, 550), 'gpt_walk', z=2, phase=.9),
         C('豆包', (1360, 550), (960, 550), 'doubao_walk', z=2, phase=.3),
         C('大小姐', (100, 590), (530, 590), 'claude_walk', z=2, phase=.7),
         C('Kimi', (1340, 590), (920, 590), 'kimi_walk', z=2, phase=.2),
         C('千问', (120, 620), (510, 620), 'qwen_walk', z=2, phase=.6),
         C('本鲸', (600, 470), (780, 470), z=3, phase=.1)],
}

# 笔迹：一次性生成固定的 24 条墨线，按时间逐条写出，笔尖跟着走。
_rng = random.Random(20261109)
STROKES = []
_yy = PAPER[1] + 26
for _ in range(24):
    _yy += _rng.randint(12, 22)
    _x0 = PAPER[0] + _rng.randint(24, 150)
    _x1 = _x0 + _rng.randint(55, 290)
    STROKES.append((_x0, _yy, _x1, _yy + _rng.randint(-4, 5)))
WRITE_START = 61.60
STROKE_SEC = 1.90

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


@lru_cache(maxsize=40)
def sheet_image(rel: str) -> Image.Image:
    return Image.open(ROOT / rel).convert('RGBA')


@lru_cache(maxsize=420)
def sprite_frame(sheet: str, idx: int, size: tuple[int, int], flip: bool,
                 charred: bool) -> Image.Image:
    """取图集某一帧，缩放/转身/焦黑调色，保留 alpha。"""
    rel, n = SHEETS[sheet]
    fr = sheet_image(rel).crop((idx % n * 384, 0, (idx % n + 1) * 384, 416))
    fr = fr.resize(size, Image.LANCZOS)
    if flip:
        fr = fr.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    if charred:
        # 轻焦黑：仍保留蓝发与女仆装辨识度，看上去还是「之前那个本鲸」。
        rgb = ImageEnhance.Color(fr.convert('RGB')).enhance(0.88)
        rgb = ImageEnhance.Brightness(rgb).enhance(0.92)
        out = rgb.convert('RGBA')
        out.putalpha(fr.getchannel('A'))
        fr = out
    return fr


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
    """海底房间 + 浅青桌面 + 更小的电视外壳；背景各层按不同速度逐帧漂移。"""
    yy = np.arange(H, dtype=np.float32)[:, None]
    p = yy / H
    top = np.array([9, 33, 58], np.float32)
    bot = np.array([24, 88, 112], np.float32)
    grad = top[None, None, :] * (1 - p[:, :, None]) + bot[None, None, :] * p[:, :, None]
    light = np.array([126, 196, 214], np.float32)
    glow = np.clip((190 - yy) / 140.0, 0, 1) ** 0.8
    glow = glow * (0.97 + 0.03 * math.sin(t * 1.7))
    grad = grad * (1 - glow[:, :, None]) + light[None, None, :] * glow[:, :, None]
    im = Image.fromarray(np.repeat(grad, W, axis=1).astype(np.uint8), 'RGB')
    d = ImageDraw.Draw(im)
    da = ImageDraw.Draw(im, 'RGBA')

    # 1) 斜向光带：四层不同速度横漂，镜头横移时有视差
    for k in range(4):
        base = 110 + k * 470 + 125 * math.sin(t * (0.15 + k * 0.035) + k * 1.7)
        da.polygon([(base, 0), (base + 130, 0), (base + 400, 760), (base + 225, 760)],
                   fill=(152, 222, 238, 14 + k * 3))
    # 2) 墙面水纹：正弦曲线逐帧游走
    for k in range(5):
        pts = [(x, int(120 + k * 105 + 18 * math.sin(x / 150.0 + t * 0.85 + k)))
               for x in range(0, W + 80, 80)]
        da.line(pts, fill=(120, 210, 225, 24), width=3)
    # 3) 书架与书本：每本按不同相位轻晃；烛焰跳动
    d.rectangle((60, 212, 470, 224), fill=(58, 90, 104))
    book_colors = [(176, 92, 96), (198, 156, 88), (92, 138, 172),
                   (128, 168, 132), (160, 112, 168), (204, 132, 96)]
    for i in range(6):
        sx = 82 + i * 58
        wob = round(2.0 * math.sin(t * 1.25 + i * 0.9))
        d.rounded_rectangle((sx, 156 + wob, sx + 38, 212), radius=3,
                            fill=book_colors[i], outline=(38, 62, 74), width=2)
        d.line((sx + 8, 168 + wob, sx + 30, 168 + wob), fill=(236, 228, 204), width=2)
    fx, fy = 505, 190
    d.rectangle((fx - 9, fy, fx + 9, fy + 24), fill=(232, 226, 204))
    fh = 14 + 5 * math.sin(t * 9.0) + 2 * math.sin(t * 15.0)
    da.polygon([(fx - 7, fy), (fx + 7, fy), (fx + 2 * math.sin(t * 6), fy - fh)],
               fill=(255, 206, 104, 230))
    da.ellipse((fx - 34, fy - 36, fx + 34, fy + 30), fill=(255, 214, 132, 16))
    # 4) 吊灯摆：链条角度 + 光晕呼吸
    ang = 0.11 * math.sin(t * 1.35)
    lx, ly = 700 + 70 * math.sin(ang), 60
    d.line((700, 0, lx, ly), fill=(112, 148, 160), width=4)
    d.rounded_rectangle((lx - 26, ly, lx + 26, ly + 44), radius=9,
                        fill=(220, 196, 126), outline=(108, 88, 52), width=3)
    da.ellipse((lx - 92, ly - 50, lx + 92, ly + 96), fill=(255, 226, 150, 20))
    # 5) 海草：底部两侧逐帧摆动（三层不同深度）
    for k in range(10):
        bx = (k % 2) * 1780 + (k // 2) * 44 + 20
        col = (36 + k * 3, 108 + k * 4, 116 + k * 3, 150)
        pts = [(bx + int(16 * math.sin(t * 0.9 + k + j * 0.45) * (j / 6.0)),
                760 - j * 46) for j in range(7)]
        da.line(pts, fill=col, width=9 - k % 3)
    # 6) 桌面：水光涟漪缓慢横移（浅青桌面仍是亮部来源）
    d.rectangle((0, 760, W, H), fill=(150, 214, 216))
    d.rectangle((0, 756, W, 772), fill=(102, 172, 181))
    d.line((0, 772, W, 772), fill=(72, 140, 154), width=3)
    for k in range(4):
        pts = [(x, int(812 + k * 52 + 6 * math.sin(x / 120.0 + t * 1.1 + k)))
               for x in range(0, W + 60, 60)]
        da.line(pts, fill=(214, 246, 246, 42), width=3)
    # 7) 气泡上浮 + 高光
    rng = np.random.default_rng(14)
    for k in range(46):
        x = int(rng.integers(20, W - 20))
        y0 = int(rng.integers(60, 740))
        r = int(rng.integers(3, 13))
        speed = 9 + (k % 5) * 5
        y = int((y0 - t * speed) % 780) - 20
        da.ellipse((x - r, y - r, x + r, y + r), outline=(150, 214, 228, 130), width=2)
        da.arc((x - r + 1, y - r + 1, x + r - 1, y + r - 1), 200, 280,
               fill=(236, 252, 255, 120), width=2)
    # 8) 更小的电视机身（世界坐标稳定）
    d.rounded_rectangle(TV_OUTER, radius=22, fill=(42, 60, 74), outline=(16, 28, 38), width=5)
    d.rounded_rectangle((TV_OUTER[0] + 8, TV_OUTER[1] + 8, TV_OUTER[2] - 8, TV_OUTER[3] - 8),
                        radius=18, fill=(64, 86, 100), outline=(104, 132, 146), width=3)
    d.rounded_rectangle((SCREEN[0] - 7, SCREEN[1] - 7, SCREEN[2] + 7, SCREEN[3] + 7),
                        radius=7, fill=(18, 26, 34), outline=(10, 16, 22), width=3)
    d.rectangle(SCREEN, fill=(8, 14, 20))
    d.rounded_rectangle((TV_OUTER[0] + 40, TV_OUTER[3] - 2, TV_OUTER[0] + 115, TV_OUTER[3] + 12),
                        radius=4, fill=(36, 50, 60))
    d.rounded_rectangle((TV_OUTER[2] - 115, TV_OUTER[3] - 2, TV_OUTER[2] - 40, TV_OUTER[3] + 12),
                        radius=4, fill=(36, 50, 60))
    return im


def draw_tv_details(im: Image.Image, t: float, tv_on: bool) -> None:
    """天线抖、旋钮转、屏幕光晕呼吸——都是物理细节，不是界面控件。"""
    d = ImageDraw.Draw(im)
    da = ImageDraw.Draw(im, 'RGBA')
    wob = 0.13 * math.sin(t * 2.3)
    ax, ay = TV_OUTER[0] + 150, TV_OUTER[1]
    bx, by = TV_OUTER[2] - 150, TV_OUTER[1]
    tip_a = (ax - 62 + 9 * math.sin(t * 2.3), ay - 58 + 5 * math.sin(t * 3.1))
    tip_b = (bx + 62 + 9 * math.sin(t * 2.3 + 1.4), ay - 58 + 5 * math.sin(t * 2.7))
    d.line((ax, ay, tip_a[0], tip_a[1]), fill=(150, 180, 190), width=5)
    d.line((bx, by, tip_b[0], tip_b[1]), fill=(150, 180, 190), width=5)
    for tx, ty in (tip_a, tip_b):
        d.ellipse((tx - 7, ty - 7, tx + 7, ty + 7), fill=(220, 190, 104), outline=(90, 74, 42), width=2)
    cx = SCREEN[2] + 16
    for cy in (166, 214):
        d.ellipse((cx - 11, cy - 11, cx + 11, cy + 11),
                  fill=(28, 42, 52), outline=(128, 158, 170), width=2)
        ang = t * 3.2 + (0.0 if cy == 166 else 1.4) + wob
        d.line((cx, cy, cx + 8 * math.cos(ang), cy + 8 * math.sin(ang)),
               fill=(190, 210, 216), width=2)
    if tv_on:
        pulse = int(22 + 9 * math.sin(t * 2.0))
        da.rounded_rectangle((SCREEN[0] - 12, SCREEN[1] - 12, SCREEN[2] + 12, SCREEN[3] + 12),
                             radius=12, outline=(150, 225, 245, pulse), width=8)
        sx = SCREEN[0] + int((t * 90) % (SW + 160)) - 80
        da.polygon([(sx, SCREEN[1]), (sx + 34, SCREEN[1]),
                    (sx + 94, SCREEN[3]), (sx + 60, SCREEN[3])], fill=(226, 248, 255, 12))


def _quill(d: ImageDraw.ImageDraw, x: float, y: float, t: float) -> None:
    ang = 0.32 * math.sin(t * 4.1)
    dx, dy = math.sin(ang), math.cos(ang)
    d.line((x, y, x - 12 * dx, y - 12 * dy), fill=(58, 66, 78), width=3)
    d.polygon([(x - 12 * dx, y - 12 * dy),
               (x - 20 * dx - 13 * dy, y - 20 * dy + 13 * dx),
               (x - 52 * dx - 5 * dy, y - 52 * dy + 5 * dx),
               (x - 30 * dx + 10 * dy, y - 30 * dy - 10 * dx)],
              fill=(222, 232, 226), outline=(96, 118, 128))
    d.line((x - 14 * dx, y - 14 * dy, x - 48 * dx, y - 48 * dy), fill=(120, 140, 148), width=2)


def draw_paper(im: Image.Image, t: float) -> None:
    """纸角翻动 + 墨线逐条写出 + 笔尖沿当前那一划移动。"""
    d = ImageDraw.Draw(im)
    da = ImageDraw.Draw(im, 'RGBA')
    d.rounded_rectangle(PAPER, radius=8, fill=(244, 246, 232), outline=(196, 202, 186), width=3)
    fl = 3 * math.sin(t * 3.1)
    d.polygon([(PAPER[2], PAPER[1]), (PAPER[2] + 12 + fl, PAPER[1] - 8),
               (PAPER[2] + 2, PAPER[1] + 20)], fill=(224, 230, 212), outline=(186, 194, 176))
    k = t - WRITE_START
    if k <= 0:
        return
    n = min(len(STROKES), int(k / STROKE_SEC))
    for i in range(n):
        x0, y0, x1, y1 = STROKES[i]
        d.line((x0, y0, x1, y1), fill=(72, 92, 104), width=3)
        if i % 3 == 1:
            d.line((x1 + 14, y0, x1 + 58, y0), fill=(96, 116, 128), width=2)
        da.ellipse((x1 - 2, y1 - 2, x1 + 3, y1 + 3), fill=(64, 84, 96, 120))
    if n < len(STROKES):
        p = min(1.0, k / STROKE_SEC - n)
        x0, y0, x1, y1 = STROKES[n]
        qx, qy = x0 + (x1 - x0) * p, y0 + (y1 - y0) * p
        d.line((x0, y0, qx, qy), fill=(72, 92, 104), width=3)
        _quill(d, qx, qy, t)


def draw_book(im: Image.Image, t: float, frac: float) -> None:
    """红皮书翻页，城堡塔楼从书页里逐帧长出。"""
    d = ImageDraw.Draw(im)
    da = ImageDraw.Draw(im, 'RGBA')
    bx, by = 760, 748
    d.rounded_rectangle((bx, by, bx + 190, by + 56), radius=6,
                        fill=(146, 42, 54), outline=(84, 26, 34), width=3)
    d.rectangle((bx + 92, by + 4, bx + 98, by + 52), fill=(96, 30, 38))
    turn = 16 * math.sin(t * 3.6)
    d.polygon([(bx + 98, by + 6), (bx + 98 + turn, by - 12),
               (bx + 182 + turn, by + 2), (bx + 182, by + 18)],
              fill=(246, 240, 218), outline=(182, 168, 138))
    grow = min(1.0, max(0.0, frac * 1.35))
    for i, tx in enumerate((800, 858, 916)):
        h = int((42 + i * 16) * grow)
        if h < 3:
            continue
        d.rectangle((tx, by - h, tx + 28, by), fill=(196, 168, 202), outline=(104, 78, 126), width=2)
        d.polygon([(tx - 4, by - h), (tx + 14, by - h - 22 * grow), (tx + 32, by - h)],
                  fill=(154, 84, 116), outline=(104, 78, 126))
        da.rectangle((tx + 9, by - h + 12, tx + 19, by - h + 26), fill=(255, 226, 150, 170))


def draw_chests(im: Image.Image, t: float, frac: float) -> None:
    """三只宝箱依次开盖，星屑逐帧上浮。"""
    d = ImageDraw.Draw(im)
    da = ImageDraw.Draw(im, 'RGBA')
    for i, cx in enumerate((700, 900, 1100)):
        k = min(1.0, max(0.0, (frac * 3.2 - i * 0.55)))
        cy = 742
        d.rounded_rectangle((cx - 44, cy, cx + 44, cy + 46), radius=5,
                            fill=(126, 84, 48), outline=(72, 46, 28), width=3)
        d.rectangle((cx - 44, cy + 18, cx + 44, cy + 26), fill=(206, 164, 76))
        lid = int(34 * k)
        d.polygon([(cx - 44, cy), (cx - 44, cy - lid), (cx + 44, cy - lid), (cx + 44, cy)],
                  fill=(160, 108, 58), outline=(72, 46, 28))
        if k > 0.35:
            da.ellipse((cx - 34, cy - 8, cx + 34, cy + 18), fill=(255, 226, 132, 110))
        for j in range(5):
            sx = cx - 34 + j * 16 + 5 * math.sin(t * 2.0 + j + i)
            sy = cy - 8 - ((t * 34 + j * 21 + i * 17) % 70)
            r = 3 + (j % 2)
            d.polygon([(sx, sy - r), (sx + r, sy), (sx, sy + r), (sx - r, sy)],
                      fill=(255, 232, 142))


def draw_namebox(im: Image.Image, t: float, frac: float) -> None:
    """昵称木框：字迹塞不下，短笔画往外溢、往下掉。"""
    d = ImageDraw.Draw(im)
    box = (820, 646, 1120, 754)
    d.rounded_rectangle(box, radius=8, fill=(196, 158, 98), outline=(96, 68, 38), width=4)
    d.rounded_rectangle((box[0] + 12, box[1] + 12, box[2] - 12, box[3] - 12), radius=4,
                        fill=(244, 236, 208), outline=(162, 132, 82), width=2)
    for i in range(7):
        yy = box[1] + 26 + i * 12
        d.line((box[0] + 26, yy, box[0] + 26 + 160 + 18 * math.sin(t * 1.6 + i), yy),
               fill=(92, 74, 58), width=3)
    for i in range(9):
        off = (t * 36 + i * 29) % 150
        xx = box[2] - 6 + int(14 * math.sin(t * 1.4 + i))
        yy = box[1] + 18 + off * 0.55
        if yy > box[3] + 130:
            continue
        d.line((xx, yy, xx + 22, yy + 8 * math.sin(t * 3 + i)), fill=(78, 62, 52), width=3)


def draw_moon_cage(im: Image.Image, t: float) -> None:
    """Kimi 的月光：光晕呼吸 + 射线旋转；金笼链条晃、栅栏逐帧高光。"""
    d = ImageDraw.Draw(im)
    da = ImageDraw.Draw(im, 'RGBA')
    lx, ly = 1000, 566
    for k in range(4):
        r = 44 + k * 24 + 6 * math.sin(t * 1.8)
        da.ellipse((lx - r, ly - r, lx + r, ly + r), fill=(226, 240, 255, 18))
    d.ellipse((lx - 20, ly - 26, lx + 20, ly + 14), fill=(246, 240, 196), outline=(196, 176, 108), width=3)
    d.rounded_rectangle((lx - 12, ly + 12, lx + 12, ly + 34), radius=3, fill=(176, 146, 88))
    for i in range(8):
        a = t * 0.7 + i * math.pi / 4
        x1, y1 = lx + 34 * math.cos(a), ly + 34 * math.sin(a)
        x2, y2 = lx + 54 * math.cos(a), ly + 54 * math.sin(a)
        da.line((x1, y1, x2, y2), fill=(255, 248, 202, 110), width=3)
    cbx, cby = 1160, 588
    sway = 5 * math.sin(t * 1.9)
    d.line((cbx + 60, 500, cbx + 60 + sway, cby - 6), fill=(170, 150, 96), width=3)
    d.arc((cbx - 12, cby - 34, cbx + 132, cby + 14), 180, 360, fill=(188, 160, 88), width=5)
    d.rectangle((cbx, cby, cbx + 120, cby + 168), outline=(188, 160, 88), width=5)
    for i in range(5):
        gx = cbx + 18 + i * 24
        shine = int(80 + 60 * math.sin(t * 2.2 + i))
        da.line((gx, cby + 4, gx + 7, cby + 164), fill=(255, 246, 200, shine), width=2)
    d.line((cbx, cby + 168, cbx + 120, cby + 168), fill=(188, 160, 88), width=5)


def draw_fire(im: Image.Image, t: float, frac: float) -> None:
    """龙焰：三条火舌逐帧变形、火星上浮、焦烟扩散。"""
    da = ImageDraw.Draw(im, 'RGBA')
    d = ImageDraw.Draw(im)
    bx, by = 930, 738
    for k in range(3):
        off = k * 26 - 26
        tip = by - 130 - 28 * math.sin(t * 7.0 + k)
        da.polygon([(bx + off - 24, by), (bx + off + 24, by),
                    (bx + off + 10 * math.sin(t * 6 + k), tip)], fill=(240, 116 + k * 24, 46, 175))
        da.polygon([(bx + off - 11, by), (bx + off + 11, by),
                    (bx + off + 5 * math.sin(t * 8 + k), tip + 46)], fill=(255, 216, 112, 190))
    for j in range(16):
        ex = bx - 60 + (j * 47) % 180 + 12 * math.sin(t * 2.3 + j)
        ey = by - ((t * 70 + j * 31) % 190)
        r = 2 + j % 3
        da.ellipse((ex - r, ey - r, ex + r, ey + r), fill=(255, 198, 96, 150))
    smoke = int(30 + 26 * min(1.0, frac * 1.6))
    da.ellipse((bx - 40, by - 168 - smoke, bx + 60, by - 96), fill=(48, 44, 44, 60))
    d.line((bx - 70, by + 10, bx + 90, by + 10), fill=(78, 66, 58), width=4)


def draw_charred(im: Image.Image, t: float) -> None:
    """烤焦那张从右上滑入，夹子逐帧扣上。"""
    d = ImageDraw.Draw(im)
    k = min(1.0, max(0.0, (t - 100.98) / 3.0))
    off = int(90 * (1 - k))
    d.polygon([(PAPER[2] - 18 + off, PAPER[1] - 12 - off),
               (PAPER[2] + 74 + off, PAPER[1] + 4 - off),
               (PAPER[2] + 66 + off, PAPER[1] + 86 - off),
               (PAPER[2] - 24 + off, PAPER[1] + 66 - off)],
              fill=(58, 52, 48), outline=(30, 26, 24))
    if k > 0.55:
        cx = PAPER[2] + 30
        cy = PAPER[1] + 8
        d.arc((cx - 12, cy - 16, cx + 12, cy + 22), 0, 360, fill=(196, 198, 190), width=4)
        d.line((cx + 10, cy - 10, cx + 10, cy + 30), fill=(196, 198, 190), width=3)


def draw_umbrella(im: Image.Image, t: float) -> None:
    """L22 前歪伞轻摆；L22 起伞骨收拢、伞柄滑进抽屉，抽屉开合。"""
    d = ImageDraw.Draw(im)
    cx, cy = 1810, 640 + int(5 * math.sin(t * 1.5))
    if t < 106.38:
        ang = 0.07 * math.sin(t * 1.6)
        d.line((cx, cy, cx - 22 + int(18 * ang), 886), fill=(92, 74, 98), width=7)
        d.arc((1750, 566, 1875, 662), 190, 350, fill=(190, 96, 118), width=9)
        for i in range(5):
            rx = 1762 + i * 24
            d.line((cx, cy - 42, rx, 604 + 8 * math.sin(t * 2 + i)), fill=(156, 76, 102), width=2)
        d.line((cx - 22, 886, cx + 2, 900), fill=(92, 74, 98), width=7)
    else:
        k = min(1.0, (t - 106.38) / 2.6)
        r = int(62 * (1 - 0.86 * k))
        d.arc((cx - r, cy - r - 74, cx + r, cy - 20), 185, 355, fill=(190, 96, 118), width=9)
        top = int(cy + (1 - k) * 0 + k * 150)
        d.line((cx, min(top, 820), cx - 18, min(886, top + 210)), fill=(92, 74, 98), width=7)
        slide = int(90 * min(1.0, max(0.0, (k - 0.15) / 0.6)))
        back = int(90 * min(1.0, max(0.0, (k - 0.72) / 0.28)))
        dx = slide - back
        d.rounded_rectangle((1740 + dx, 800, 1890 + dx, 900), radius=8,
                            fill=(116, 174, 180), outline=(72, 130, 140), width=4)
        d.line((1800 + dx, 838, 1830 + dx, 838), fill=(60, 100, 110), width=5)


def draw_bowl(im: Image.Image, t: float) -> None:
    """白饭：米粒微闪 + 三缕热气逐帧上升淡出。"""
    d = ImageDraw.Draw(im)
    da = ImageDraw.Draw(im, 'RGBA')
    d.ellipse((980, 830, 1120, 900), fill=(238, 240, 226), outline=(180, 188, 176), width=4)
    d.ellipse((1000, 838, 1100, 878), fill=(250, 250, 244))
    for i in range(7):
        gx = 1010 + i * 13
        d.ellipse((gx, 846 + 3 * math.sin(t * 3 + i), gx + 5, 851 + 3 * math.sin(t * 3 + i)),
                  fill=(226, 228, 214))
    for j in range(3):
        pts = [(1030 + j * 24 + int(10 * math.sin(t * 2.1 + j + y * 0.06)), 836 - y)
               for y in range(0, 110, 12)]
        da.line(pts, fill=(240, 250, 248, 80 - j * 14), width=5)


def draw_props_back(im: Image.Image, t: float, line: int, frac: float) -> None:
    prop = SHOTS[line - 1]['prop']
    draw_paper(im, t)
    # 已夹好的烤焦那张、已收好的伞/抽屉在后续镜头里保持可见，不在切镜时凭空消失。
    if t >= 100.98:
        draw_charred(im, t)
    draw_umbrella(im, t)
    if prop == 'book':
        draw_book(im, t, frac)
    if prop == 'chests':
        draw_chests(im, t, frac)
    if prop == 'namebox':
        draw_namebox(im, t, frac)
    if prop == 'moon_cage':
        draw_moon_cage(im, t)
    if prop == 'fire':
        draw_fire(im, t, frac)
    if prop == 'bowl':
        draw_bowl(im, t)


def draw_props_front(im: Image.Image, t: float, line: int) -> None:
    """前景浮尘与近景气泡：和人物/背景不同速度，形成视差。"""
    da = ImageDraw.Draw(im, 'RGBA')
    rng = np.random.default_rng(77)
    for k in range(34):
        x = int(rng.integers(0, W))
        y0 = int(rng.integers(80, 980))
        r = int(rng.integers(1, 4))
        y = int((y0 - t * (5 + k % 4 * 4)) % 1000)
        x += int(9 * math.sin(t * 0.7 + k))
        da.ellipse((x - r, y - r, x + r, y + r), fill=(226, 248, 255, 42))
    if SHOTS[line - 1]['prop'] == 'knob':
        da.ellipse((1700, 190, 1770, 260), fill=(255, 236, 150, 22))


def draw_cast(im: Image.Image, t: float, line: int, frac: float) -> None:
    """八位人物逐帧走位：真实位移 + 步态逐帧 + 错相摆动 + 落地影子。"""
    da = ImageDraw.Draw(im, 'RGBA')
    pose_sheet = POSE_SHEET[SHOTS[line - 1]['pose']]
    for e in sorted(CHOREO[line], key=lambda x: x['z']):
        sheet = e['sheet'] or (pose_sheet if e['who'] == '本鲸' else CAST[e['who']]['idle'])
        size = CAST[e['who']]['size']
        fps = e['fps'] or (WALK_FPS if sheet.endswith('_walk') or sheet.endswith('_idle')
                           or sheet.endswith('_happy') else ACT_FPS)
        phase = e['phase']
        idx = int((t + phase) * fps) % SHEETS[sheet][1]
        flip = e['flip'] if e['flip'] is not None else (e['p1'][0] < e['p0'][0])
        sp = sprite_frame(sheet, idx, size, flip, e['who'] == '本鲸')
        x = e['p0'][0] + (e['p1'][0] - e['p0'][0]) * frac + e['sway'] * math.sin(t * 1.2 + phase)
        y = e['p0'][1] + (e['p1'][1] - e['p0'][1]) * frac
        cycle = (t + phase) * fps * math.pi / 4.0
        bob = 3.4 * abs(math.sin(cycle)) if sheet.endswith('_walk') else 1.8 * math.sin(t * 1.8 + phase)
        y += bob
        xi, yi = int(round(x)), int(round(y))
        half = size[0] * 0.31 + 7 * math.sin(cycle)
        da.ellipse((xi + size[0] / 2 - half, yi + size[1] - 12,
                    xi + size[0] / 2 + half, yi + size[1] + 4), fill=(18, 50, 62, 72))
        im.paste(sp, (xi, yi), sp)


def camera_at(shot: dict, frac: float, t: float) -> tuple[float, float, float]:
    a, b = shot['cam'], shot['cam2']
    k = min(1.0, max(0.0, frac))
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
    """切镜闪白 / 前景划像：照 MV 的震屏、闪白、划像手法，不新增界面控件。"""
    if shot['fx'] in ('flash', 'shake_flash') or shot['move'] == 'triple':
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


def render_at(t: float, cues: list, screens: list, cue_starts: list,
              scr_starts: list, scr_ends: list) -> Image.Image:
    """逐帧合成一帧：背景 → 电视 → 机身细节 → 道具 → 人物 → 前景 → 镜头 → 特效 → 字幕。"""
    ci = max(0, min(len(cues) - 1, bisect.bisect_right(cue_starts, t) - 1))
    cue = cues[ci]
    line = int(cue['index'])
    shot = SHOTS[line - 1]
    frac = min(0.999, max(0.0, (t - cue['start']) / max(0.01, cue['end'] - cue['start'])))
    im = background(t)
    clip, mode, idx = tv_at(shot, cue, t, frac)
    if clip == 'dark':
        d = ImageDraw.Draw(im)
        d.rectangle(SCREEN, fill=(10, 17, 24))
        d.line((SCREEN[0] + 30, SCREEN[3] - 30, SCREEN[2] - 30, SCREEN[1] + 30),
               fill=(24, 38, 50), width=2)
    else:
        im.paste(tv_frame(clip, idx), (SCREEN[0], SCREEN[1]))
    # 开机：首句前 1.2s 用半透明黑遮罩渐亮，仍看得见 BOOK 画面；
    # 不是把屏幕刷成纯黑，也不画任何按钮/控件。
    if shot['prop'] == 'tv_on' and line <= 2:
        k = min(1.0, max(0.0, (t - cue_starts[0]) / 1.2))
        if k < 1:
            veil = Image.new('RGBA', (SW, SH), (8, 14, 20, int(205 * (1 - k))))
            im.paste(veil, (SCREEN[0], SCREEN[1]), veil)
    draw_tv_details(im, t, tv_on=(clip != 'dark'))
    draw_props_back(im, t, line, frac)
    draw_cast(im, t, line, frac)
    draw_props_front(im, t, line)
    im = apply_camera(im, camera_at(shot, frac, t))
    im = effects(im, shot, frac, t)
    # 字幕在镜头之后绘制，固定位置，不随镜头缩放
    si = max(0, min(len(screens) - 1, bisect.bisect_right(scr_starts, t) - 1))
    if scr_starts[si] <= t < scr_ends[si]:
        layer = subtitle_layer(screens[si]['text'])
        im.paste(layer, (0, SUB_Y), layer)
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
    assert len(SHOTS) == 24 and set(CHOREO) == set(range(1, 25))
    cues = alignment['cues']
    screens = subs['screens']
    source_duration = float(alignment['source_duration_seconds'])
    out_duration = round(float(cues[-1]['end']) + TAIL_PAD, 3)
    total_frames = math.ceil(out_duration * FPS)
    load_frame_index()

    cue_starts = [c['start'] for c in cues]
    scr_starts = [s['start'] for s in screens]
    scr_ends = [s['end'] for s in screens]

    def frame(t: float) -> Image.Image:
        return render_at(t, cues, screens, cue_starts, scr_starts, scr_ends)

    if args.stills:
        out = ROOT / 'tools/day14制作/review_frames'
        out.mkdir(parents=True, exist_ok=True)
        for k in range(args.stills):
            t = source_duration * (k + 0.5) / args.stills
            frame(t).save(out / f'key_{k + 1:02d}_{t:06.2f}s.png')
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
            frame(t).save(buf, format='JPEG', quality=88, subsampling=0)
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
