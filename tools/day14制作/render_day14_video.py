#!/usr/bin/env python3
"""Day14《重看昨天那支片子》成片渲染器 v7 —— 参照项目 MV 的定点站位与切镜语法。

用户 2026-11-09 第七次反馈：「现在的画面还是很奇怪，请查看为什么人一直乱走，
不是这个样的啊，你看看别人的 mv……是让你参照下项目的 mv 做啊」。

v6 把 2–3 人整句 x0→x1→x2 横穿画面，被判「人一直乱走」；回看仓库里的
`把回忆拼好给你_v12剧情动作版.mp4`、`v13_整片渲染_待审.mp4`、
`我怀疑大禹治水/Remotion_动态引擎重做_待审.mp4` 与根目录 `达拉崩吧.mp4` 抽帧后，
确认项目 MV 的共同语法是：浅色扁平舞台、主角居中、对手戏角色左右定点、
一句/一镜一次硬切、词点局部手势与道具动作、结果停留，不横向巡游。

v7 改法：
  1. 主画面仍与 MV 真帧无关，24 个剧本场景改成项目 MV 式粉彩扁平舞台；
  2. 每位角色只有一个固定站位，开场 0.35s 短距滑入；实测 `chars_timed` 词点
     切到动作图集，局部 dx/dy ≤70px，动作播完停在结果位，不用步态横移；
  3. 不复制项目 MV 真帧，只借构图/切镜/定点动作语法；番外真帧仍只在右上电视；
  4. 电视 `tv_at()` / `CLIP_SECOND` / `TRIPLE` / 几何与 v3 逐帧一致，特效后贴回；
  5. WAV、24 cue、63 屏、1080p30、3756 帧、125.200s、Day2 字幕不变。

字幕层固定绘制、不随镜头/电视缩放；电视内仍是番外成片真帧按比例缩小的完整场景、
静音画中画；不画界面控件/数字看板/角标/水印/片尾卡。

用法：
  python3 tools/day14制作/render_day14_video.py --out Day/Day14/成片/Day14_重看昨天那支片子_克隆配音版.mp4
  python3 tools/day14制作/render_day14_video.py --stills 9
"""
from __future__ import annotations

import argparse
import bisect
import io
import json
import math
import os
import random
import re
import shutil
import subprocess
import sys
from functools import lru_cache
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFont

import day14_v7_scenes as S7

ROOT = Path(__file__).resolve().parents[2]
W, H, FPS = 1920, 1080, 30             # 仓库统一规格（verify_episode.py 要求 1080p30）
ACT_FPS = 10                            # 本鲸动作图集逐帧速度
TAIL_PAD = 0.25                         # 末句后 0.25s 收尾

# ---- 电视（v3 定下的尺寸/位置，v4 完全不动）----
TV_OUTER = (1400, 96, 1840, 372)
SCREEN = (1428, 124, 1808, 338)         # 380×214，16:9
SW, SH = SCREEN[2] - SCREEN[0], SCREEN[3] - SCREEN[1]
PAPER = (1120, 772, 1650, 952)
BEN = (380, 470)                        # 旧道具函数的参考基准点；v7 人物按项目 MV 定点站位
BEN_SIZE = (350, 379)                   # 384:416 原比例
SUB_Y = 930                             # Day2 对话条：输出 y=966..1053，标签上移

# Day2 加更《鲸鱼选鱼》统一样式（tools/字幕/day2_style_sub.mjs 的 DAY2_SUB，×1.5 输出）
DAY2_BOX_FILL = (9, 22, 54, 235)
DAY2_BOX_STROKE = (72, 200, 255, 255)
DAY2_TAG_FILL = (30, 64, 175, 255)
DAY2_TAG_STROKE = (250, 204, 21, 255)
DAY2_TAG_TEXT = (253, 230, 138, 255)


# ---- v7：项目 MV 式定点站位；主画面不读 MV 真帧 -------------------------
# 24 个场景与定点动作表在 day14_v7_scenes.py；电视机真帧仍由 tv_frames/ 提供。
# 主画面不再依赖 dalabengba.srt、sample_frames/ 或 dalabengba.mp4 抽帧。


# 图集：横向 384×416 / 帧；walk-v14 8 帧，lyric-action-v13 多为 16 帧，actions-v12 11 帧。
SHEETS = {
    'whale_idle': ('assets/ai-girls/walk-v14/whale_idle_side_pet.png', 8),
    'whale_walk': ('assets/ai-girls/walk-v14/whale_walk_side_2leg.png', 8),
    'whale_point': ('assets/ai-girls/lyric-action-v13/whale_point.png', 16),
    'whale_read': ('assets/ai-girls/lyric-action-v13/whale_read_action.png', 16),
    'whale_wipe': ('assets/ai-girls/lyric-action-v13/whale_wipe_tear_action.png', 16),
    'whale_crouch': ('assets/ai-girls/lyric-action-v13/whale_side_crouch_action.png', 16),
    'whale_selfkind': ('assets/ai-girls/lyric-action-v13/whale_selfkind_retry_action.png', 16),
    'whale_reach': ('assets/ai-girls/lyric-action-v13/whale_rain_reach_action.png', 16),
    'whale_camera': ('assets/ai-girls/lyric-action-v13/whale_camera_action.png', 16),
    'whale_gather': ('assets/ai-girls/lyric-action-v13/whale_gather_retry_action.png', 16),
    'whale_ribbon': ('assets/ai-girls/lyric-action-v13/whale_ribbon_hold_action.png', 16),
    'whale_letter': ('assets/ai-girls/actions-v12/whale_letter.png', 11),
    'gpt_idle': ('assets/ai-girls/walk-v14/gpt_idle_pet.png', 8),
    'gpt_push': ('assets/ai-girls/lyric-action-v13/gpt_push_final_action.png', 16),
    'gpt_think': ('assets/ai-girls/lyric-action-v13/gpt_think_action.png', 16),
    'gpt_sweep': ('assets/ai-girls/lyric-action-v13/gpt_sweep_action.png', 16),
    'doubao_idle': ('assets/ai-girls/walk-v14/doubao_idle_side_pet.png', 8),
    'doubao_lantern': ('assets/ai-girls/lyric-action-v13/doubao_lantern_action.png', 16),
    'doubao_comfort': ('assets/ai-girls/lyric-action-v13/doubao_comfort_action.png', 16),
    'doubao_step': ('assets/ai-girls/lyric-action-v13/doubao_step_action.png', 16),
    'doubao_umbrella': ('assets/ai-girls/lyric-action-v13/doubao_rain_umbrella_action.png', 16),
    'doubao_shared': ('assets/ai-girls/lyric-action-v13/doubao_shared_umbrella_action.png', 16),
    'claude_idle': ('assets/ai-girls/walk-v14/claude_idle_pet.png', 8),
    'claude_place': ('assets/ai-girls/lyric-action-v13/claude_place_action.png', 16),
    'claude_collect': ('assets/ai-girls/lyric-action-v13/claude_collect_action.png', 16),
    'claude_letter': ('assets/ai-girls/actions-v12/claude_letter.png', 11),
    'kimi_idle': ('assets/ai-girls/walk-v14/kimi_idle_pet.png', 8),
    'kimi_lantern': ('assets/ai-girls/lyric-action-v13/kimi_lantern_action.png', 16),
    'kimi_stargaze': ('assets/ai-girls/lyric-action-v13/kimi_stargaze_seated_action.png', 16),
    'kimi_pull': ('assets/ai-girls/lyric-action-v13/kimi_swim_pull_action.png', 16),
    'gemini_idle': ('assets/ai-girls/walk-v14/gemini_idle_pet.png', 8),
    'gemini_star': ('assets/ai-girls/lyric-action-v13/gemini_star_toss_action.png', 16),
    'gemini_flower': ('assets/ai-girls/lyric-action-v13/gemini_flower_action.png', 16),
    'zai_idle': ('assets/ai-girls/walk-v14/zai_idle_pet.png', 8),
    'zai_reach': ('assets/ai-girls/lyric-action-v13/zai_reach_action.png', 16),
    'zai_clock': ('assets/ai-girls/lyric-action-v13/zai_clock_action.png', 16),
    'qwen_idle': ('assets/ai-girls/walk-v14/qwen_idle_pet.png', 8),
    'qwen_reach': ('assets/ai-girls/lyric-action-v13/qwen_reach_action.png', 16),
}

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
IDLE_SHEET = {k: v['idle'] for k, v in CAST.items()}

# 实测词点：每个词都必须是当句原文子串；word_times() 会逐字校验。
WORD_TRIGGERS = {
    1: ['黑炭', '那条鱼', '昨天'],
    2: ['搬', '重看', '电视', '片子'],
    3: ['屏幕', '翻开', '长出', '城堡'],
    4: ['恶龙', '俯冲', '抓走', '暗'],
    5: ['应征', '送', '城门口', '上马'],
    6: ['风车村', '宝箱', '山洞口'],
    7: ['名字', '塞不进', '大小姐', '追着问'],
    8: ['最黑', '月光', '笼子', '小心后面'],
    9: ['一口火', '黑炭', '石碑', '完了'],
    10: ['摸摸', '焦的'],
    11: ['谁', '一个字都没有'],
    12: ['暂停', '倒回去', '一段一段'],
    13: ['翻书', '开始', '没写'],
    14: ['龙娘', '抓走', '记一行'],
    15: ['大小姐', '小心后面', '豆包'],
    16: ['月光', '举', '没人提'],
    17: ['全演过了', '写下来'],
    18: ['不用问人', '一帧一帧'],
    19: ['翻过来', '片子顺序', '一段写一行'],
    20: ['不替谁顶', '并成一段'],
    21: ['烤焦', '单独夹起来', '待补'],
    22: ['关掉', '收进抽屉', '不拍雨'],
    23: ['白饭', '不改'],
    24: ['下一集', '一个字一个字', '塞回框'],
}

INK_WORDS = [
    (14, '记一行'), (17, '全演过了'), (17, '写下来'), (18, '一帧一帧'),
    (19, '翻过来'), (19, '一段写一行'), (20, '不替谁顶'), (20, '并成一段'),
    (21, '单独夹起来'), (21, '待补'),
]


def A(who, sheet, x0, x1, trigger, note='', flip=None, z=1, charred=False, dy=0, size=None):
    """一位前景人物：x0→x1 是一次有目的位移；trigger 是实测词点；成形后冻结。"""
    return dict(who=who, sheet=sheet, x0=x0, x1=x1, trigger=trigger, note=note,
                flip=flip, z=z, charred=charred, dy=dy, size=size)


# 每镜 2–3 位本名，动作是「谁对谁做了什么 / 对方怎么反应」，不是人群巡游。
INTERACTIONS = {
    1: [A('龙娘', 'gpt_sweep', 1320, 760, '昨天', '龙焰从右扫到左，落在焦黑本鲸身上', dy=45, z=2),
        A('本鲸', 'whale_crouch', 250, 310, '黑炭', '本鲸缩肩、低头看焦痕，不再循环点头', charred=True, z=3),
        A('豆包', 'doubao_comfort', 1150, 980, '那条鱼', '豆包上前扶，被本鲸用鳍轻轻挡住', z=2)],
    2: [A('本鲸', 'whale_gather', 210, 360, '搬', '本鲸把电视搬上桌，落定后停手', z=3),
        A('Gemini', 'gemini_star', 980, 850, '电视', 'Gemini 递上片子，星屑落在机脚', z=2),
        A('智谱', 'zai_reach', 1280, 1120, '重看', '智谱伸手按开始，随后退半步', z=2)],
    3: [A('本鲸', 'whale_point', 240, 360, '屏幕', '本鲸指向亮起的屏幕', z=3),
        A('大小姐', 'claude_place', 1050, 880, '翻开', '大小姐把城塔放进书页', z=2),
        A('豆包', 'doubao_step', 1280, 1120, '长出', '豆包在露台挥手，城塔停在书页上', z=2)],
    4: [A('龙娘', 'gpt_push', 1320, 700, '恶龙', '龙娘自右上俯冲，翼影掠过画面', dy=70, z=3),
        A('豆包', 'doubao_step', 300, 520, '抓走', '豆包被带向左，王冠缎带掉在桌沿', z=2),
        A('本鲸', 'whale_wipe', 820, 770, '暗', '本鲸缩肩抹泪一次后停住', z=2)],
    5: [A('本鲸', 'whale_ribbon', 200, 470, '应征', '本鲸拖红围巾跑进招募广场', z=3),
        A('Gemini', 'gemini_star', 900, 760, '送', 'Gemini 把星屑塞进本鲸手里', z=2),
        A('智谱', 'zai_reach', 1250, 1080, '上马', '智谱扶本鲸上马，三人分开停住', z=2)],
    6: [A('千问', 'qwen_reach', 1120, 880, '风车村', '千问递钥匙，风车开始转', z=2),
        A('本鲸', 'whale_read', 240, 420, '宝箱', '本鲸依次开三只箱，不追着箱子跑', z=3),
        A('豆包', 'doubao_lantern', 1300, 1160, '山洞口', '豆包举灯照亮洞口弧线', z=2)],
    7: [A('大小姐', 'claude_letter', 1120, 820, '名字', '大小姐拿着信追问，越靠越近', z=2),
        A('本鲸', 'whale_letter', 260, 420, '塞不进', '本鲸后退，字迹从框里溢出', z=3),
        A('Kimi', 'kimi_pull', 1320, 1180, '追着问', 'Kimi 的笔被长名字折住，停在半空', z=2)],
    8: [A('Kimi', 'kimi_lantern', 1100, 900, '月光', 'Kimi 举月灯，光柱扫进洞口', z=2),
        A('豆包', 'doubao_lantern', 1300, 1140, '笼子', '豆包在金笼里抬手喊', z=2),
        A('本鲸', 'whale_reach', 260, 430, '小心后面', '本鲸听到那一声才转身回头', z=3)],
    9: [A('龙娘', 'gpt_sweep', 1320, 720, '一口火', '龙娘一口火横扫，火舌压到前景', dy=55, z=3),
        A('本鲸', 'whale_wipe', 300, 380, '黑炭', '本鲸被喷焦，缩肩后站定', charred=True, z=3),
        A('大小姐', 'claude_collect', 1300, 1140, '石碑', '大小姐护住纸，石碑砸下后停住', z=2)],
    10: [A('本鲸', 'whale_selfkind', 280, 350, '摸摸', '本鲸摸脸，焦屑落下', charred=True, z=3),
         A('豆包', 'doubao_comfort', 980, 830, '焦的', '豆包递布，本鲸没擦掉焦痕', z=2)],
    11: [A('本鲸', 'whale_read', 250, 360, '谁', '本鲸看空白纸，不落笔', z=3),
         A('大小姐', 'claude_place', 980, 840, '一个字都没有', '大小姐把空册摊开，三人看纸', z=2),
         A('Kimi', 'kimi_stargaze', 1300, 1160, '一个字都没有', 'Kimi 的笔悬停，纸上仍无线条', z=2)],
    12: [A('本鲸', 'whale_reach', 250, 380, '暂停', '本鲸按住旋钮，动作停住', z=3),
         A('Gemini', 'gemini_star', 950, 820, '倒回去', 'Gemini 把胶片条倒退一格', z=2),
         A('智谱', 'zai_clock', 1300, 1160, '一段一段', '智谱扶住反向转的旋钮', z=2)],
    13: [A('本鲸', 'whale_point', 250, 380, '翻书', '本鲸指向红皮书：谁按的开始', z=3),
         A('龙娘', 'gpt_think', 1120, 900, '开始', '龙娘摊手，表示不是自己', z=2),
         A('大小姐', 'claude_place', 1320, 1160, '没写', '大小姐摊开空册，电视里没写', z=2)],
    14: [A('龙娘', 'gpt_push', 1220, 700, '龙娘', '龙娘再俯冲抓走豆包', dy=60, z=3),
         A('豆包', 'doubao_step', 300, 500, '抓走', '豆包被带向左，停在笼影边', z=2),
         A('本鲸', 'whale_read', 820, 760, '记一行', '本鲸低头写下第一条墨线', z=3)],
    15: [A('大小姐', 'claude_letter', 1100, 830, '大小姐', '大小姐立起王冠名牌', z=2),
         A('豆包', 'doubao_lantern', 1300, 1100, '小心后面', '豆包立起缎带名牌，喊那一声', z=2),
         A('本鲸', 'whale_point', 250, 380, '豆包', '本鲸依次点两张名牌，不合成一张', z=3)],
    16: [A('Kimi', 'kimi_lantern', 1100, 900, '举', 'Kimi 把月灯举高，光晕张开', z=2),
         A('本鲸', 'whale_read', 250, 380, '月光', '本鲸看纸，不补写这一行', z=3),
         A('Gemini', 'gemini_flower', 1300, 1160, '没人提', 'Gemini 注意到空行，停住不说', z=2)],
    17: [A('本鲸', 'whale_gather', 240, 420, '全演过了', '本鲸拉开胶片条，真帧露出来', z=3),
         A('龙娘', 'gpt_push', 1100, 900, '全演过了', '龙娘在胶片里俯冲，前景收住', z=2),
         A('大小姐', 'claude_collect', 1320, 1160, '写下来', '大小姐指着仍空的一行', z=2)],
    18: [A('本鲸', 'whale_camera', 240, 420, '不用问人', '本鲸俯身逐格看胶片', z=3),
         A('Gemini', 'gemini_star', 950, 820, '一帧一帧', 'Gemini 把亮框挪一格停住', z=2),
         A('智谱', 'zai_reach', 1300, 1160, '一帧一帧', '智谱扶住胶片，不再连续拉', z=2)],
    19: [A('本鲸', 'whale_letter', 240, 420, '翻过来', '本鲸把纸翻面，按片序落第一行', z=3),
         A('千问', 'qwen_reach', 1100, 900, '片子顺序', '千问递下一页，站定', z=2),
         A('豆包', 'doubao_step', 1320, 1160, '一段写一行', '豆包按住纸角，每行分开', z=2)],
    20: [A('本鲸', 'whale_read', 240, 420, '不替谁顶', '本鲸把两行之间留出空档', z=3),
         A('大小姐', 'claude_letter', 1100, 900, '并成一段', '大小姐想连线，被本鲸挡住', z=2),
         A('智谱', 'zai_reach', 1320, 1160, '并成一段', '智谱把夹子扣在两行之间', z=2)],
    21: [A('本鲸', 'whale_letter', 240, 420, '烤焦', '本鲸把焦纸单独抽出', charred=True, z=3),
         A('豆包', 'doubao_comfort', 950, 820, '单独夹起来', '豆包夹好焦纸，不擦焦痕', z=2),
         A('龙娘', 'gpt_sweep', 1320, 1160, '待补', '龙娘收火，本鲸写下「待补」', z=2)],
    22: [A('本鲸', 'whale_reach', 240, 380, '关掉', '本鲸按电视开关，屏幕按 v3 转黑', z=3),
         A('智谱', 'zai_reach', 950, 820, '收进抽屉', '智谱把歪伞收拢放进抽屉', z=2),
         A('豆包', 'doubao_umbrella', 1300, 1100, '不拍雨', '豆包把伞骨按住，雨线停', z=2)],
    23: [A('千问', 'qwen_reach', 1100, 900, '白饭', '千问放下饭盆，热气升起', z=2),
         A('本鲸', 'whale_read', 240, 380, '不改', '本鲸看纸上那行，不擦不改', z=3),
         A('大小姐', 'claude_collect', 1320, 1160, '不改', '大小姐把笔收走，停住', z=2)],
    24: [A('大小姐', 'claude_letter', 1100, 850, '下一集', '大小姐扶住昵称框', z=2),
         A('本鲸', 'whale_point', 240, 420, '一个字一个字', '本鲸把字逐笔送回框里', z=3),
         A('豆包', 'doubao_step', 1320, 1160, '塞回框', '豆包合上框口，说完即停', z=2)],
}


# v7 主画面场景切换表与定点动作表见 day14_v7_scenes.SCRIPT_SCENES /
# SCRIPT_INTERACTIONS。主画面不再从 `dalabengba.srt` 或 `sample_frames/` 取背景。


# 保留 v4 的逐句导演字段（tv/tv_mode/fx/stage 等）用于电视锁死与文档生成。

# ---- 逐句电视/特效字段（M01–M24；主画面场景改为 v7 定点动作表）------------
# tv/tv_mode/fx 与 v3 逐帧一致 → 电视机内容不变；主画面另见 day14_v7_scenes.py。
# focus / entry / action / trigger / result / reaction / hold / exit / transition /
# continuity_in / continuity_out 按 Day12 逐镜导演卡与 agent.md 24(e) 记录。
SCENES = [
    dict(id='M01', tv='BOOK', tv_mode='play', fx='flash', mood='charred', pose='crouch', stage='selfcheck',
         words=WORD_TRIGGERS[1], trigger='黑炭', mv='硬切＋闪白',
         focus='焦黑自报：让观众看见「被烤成黑炭」的是谁', entry='本鲸站在桌左，圆柄手镜扣在桌上，纸空白',
         action='本鲸低头摸自己的鱼鳍；词点「黑炭」起，焦屑从鳍上落下、圆柄手镜照出焦黑鱼影',
         result='圆柄手镜里是焦黑鱼影，不是别的东西；焦屑落定后保持', reaction='本鲸不说话，只把鳍收回来一点，不循环点头',
         hold=0.4, exit='本鲸站定、圆柄手镜朝上、纸仍空白', transition='切到今早把电视搬上桌',
         cin='纸空、圆柄手镜扣着', cout='纸空、圆柄手镜照出焦黑鱼影'),
    dict(id='M02', tv='BOOK', tv_mode='play', fx='none', mood='plain', pose='walk', stage='set_tv',
         words=WORD_TRIGGERS[2], trigger='搬', mv='硬切',
         focus='今天把电视搬上桌、重看昨天那支片子', entry='电视已在右上角，本鲸在桌左稍远处',
         action='词点「搬」：本鲸向前一步、桌布从电视机脚下被抽走、机脚扬起一小团尘；词点「重看」：本鲸抬眼指向屏幕',
         result='电视仍在原位置（机身不动），只留下刚放好的尘与指向手势', reaction='本鲸停稳看屏幕，不再走第二步',
         hold=0.4, exit='本鲸站定指屏，电视位置不变', transition='切到屏幕亮起',
         cin='电视右上、本鲸稍远', cout='电视右上、本鲸站定指屏'),
    dict(id='M03', tv='BOOK', tv_mode='play', fx='flash', mood='book', pose='point', stage='book_open',
         words=WORD_TRIGGERS[3], trigger='翻开', mv='硬切＋闪白',
         focus='书页翻开、城堡从书页里长出来', entry='红皮书合在桌上，本鲸手未抬',
         action='词点「翻开」：书页翻起；词点「长出」：三座城塔从书页里逐帧长高；本鲸在两次词点之间抬手指屏',
         result='城塔停在书页上，书保持翻开', reaction='本鲸指完停住，视线留在书与屏幕之间',
         hold=0.4, exit='书翻开、城塔长出、本鲸指向', transition='切到恶龙俯冲',
         cin='书合、塔无', cout='书翻、塔立'),
    dict(id='M04', tv='DRAGON', tv_mode='play', fx='shake', mood='dark', pose='wipe', stage='dragon_swoop',
         words=WORD_TRIGGERS[4], trigger='俯冲', mv='速度线＋硬切',
         focus='龙娘俯冲、豆包被抓走、天一下子暗了', entry='屋里正常亮度，本鲸看向屏幕',
         action='词点「俯冲」：一道龙影自上而下掠过一次；「抓走」：王冠缎带掉到桌沿；「暗」：整屋压暗',
         result='龙影已出画，王冠留在桌沿，屋里暗着（不新增角色巡游）', reaction='本鲸抹泪/缩肩一次后停住',
         hold=0.4, exit='暗屋、王冠在桌沿', transition='切到应征赶路',
         cin='亮屋、桌沿空', cout='暗屋、王冠在桌沿'),
    dict(id='M05', tv='MAP', tv_mode='play', fx='none', mood='map', pose='point', stage='signup',
         words=WORD_TRIGGERS[5], trigger='应征', mv='硬切',
         focus='本鲸应征、Gemini 与智谱在城门口送行', entry='桌面空白，本鲸站定',
         action='词点「应征」：招募告示从桌右展开；词点「送」：星屑（Gemini）与长戟（智谱）两件签名道具依次落到告示两侧',
         result='告示展开、两件道具分列两侧，七位本名不靠人群巡游点名', reaction='本鲸指向告示，停住',
         hold=0.4, exit='告示＋两道具留在桌面', transition='切到风车村开宝箱',
         cin='桌面空', cout='告示＋星屑＋长戟'),
    dict(id='M06', tv='CHEST', tv_mode='play', fx='wipe', mood='chest', pose='read', stage='chests',
         words=WORD_TRIGGERS[6], trigger='宝箱', mv='硬切＋前景划像',
         focus='千问陪开三只宝箱，一路走到山洞口', entry='桌上三只合着的宝箱、小风车',
         action='词点「宝箱」：三只箱盖依次弹开冒星；风车逐帧转；词点「山洞口」：洞口弧线在桌面右侧亮起',
         result='三只箱子开着、洞口弧线停住', reaction='本鲸低头看书页，不追着箱子跑',
         hold=0.4, exit='三箱开、洞口亮', transition='切到名字塞不进框',
         cin='三箱合、无洞口', cout='三箱开、洞口亮'),
    dict(id='M07', tv='NAME', tv_mode='play', fx='shake', mood='name', pose='letter', stage='namebox',
         words=WORD_TRIGGERS[7], trigger='塞不进', mv='速度线＋硬切',
         focus='名字太长塞不进框、大小姐追着问', entry='昵称木框在桌上，本鲸拿着信',
         action='词点「塞不进」：字迹从框里溢出往下掉；词点「追着问」：王冠道具连着探身三次',
         result='溢出字迹停在地上，王冠收住；框仍是那个框', reaction='本鲸把信往回收一点，不说话',
         hold=0.4, exit='框＋溢出字迹＋王冠', transition='切到最黑那段',
         cin='框内规整', cout='字迹溢出、王冠在侧'),
    dict(id='M08', tv='MOON', tv_mode='play', fx='flash', mood='moon', pose='point', stage='moon_cage',
         words=WORD_TRIGGERS[8], trigger='月光', mv='硬切＋闪白',
         focus='Kimi 月光照洞口、豆包在笼里喊小心后面', entry='桌面暗，本鲸面向屏幕',
         action='「月光」：月灯光晕与八道射线亮起；「笼子」：金笼落下、缎带在笼里；「小心后面」：本鲸转身朝身后看',
         result='月光留着、笼子停住、本鲸保持回头', reaction='不是贴标签，是听到那一声才回头',
         hold=0.4, exit='月光＋金笼＋本鲸回头', transition='切到龙焰',
         cin='暗桌、本鲸朝屏', cout='月光＋金笼＋本鲸回头'),
    dict(id='M09', tv='FIRE', tv_mode='play', fx='shake_flash', mood='fire', pose='wipe', stage='fire',
         words=WORD_TRIGGERS[9], trigger='一口火', mv='速度线＋闪白',
         focus='龙娘一口火把本鲸喷成黑炭、片子完了', entry='屋里暗，本鲸站定',
         action='「一口火」：三条火舌与火星起；「黑炭」：本鲸调色压暗、焦屑落；「完了」：屋里压到最暗',
         result='火收、焦黑本鲸站定、暗屋', reaction='本鲸缩肩一次后停住，不循环抖',
         hold=0.4, exit='暗屋、焦黑本鲸', transition='切到摸摸自己',
         cin='暗屋、本鲸轻焦', cout='暗屋、本鲸焦黑'),
    dict(id='M10', tv='BOOK', tv_mode='freeze', fx='none', mood='soot', pose='selfkind', stage='selfcheck2',
         words=WORD_TRIGGERS[10], trigger='摸摸', mv='硬切',
         focus='摸摸自己，还是焦的', entry='电视定格（不变），本鲸站定',
         action='词点「摸摸」：本鲸抬鳍摸脸，焦屑落下、圆柄手镜照出黑鱼影；「焦的」：圆柄手镜保持黑色不擦掉',
         result='圆柄手镜里仍是焦的，不写「修好了」', reaction='本鲸停手，不额外摇头',
         hold=0.4, exit='圆柄手镜黑、纸仍空', transition='切到空白纸',
         cin='圆柄手镜扣着', cout='圆柄手镜黑、未擦'),
    dict(id='M11', tv='BOOK', tv_mode='freeze', fx='none', mood='blank', pose='idle', stage='blank',
         words=WORD_TRIGGERS[11], trigger='一个字都没有', mv='硬切',
         focus='谁在哪一步演了什么，纸上一个字都没有', entry='纸面空白，羽毛笔悬在纸边',
         action='词点「一个字都没有」：镜头落在空白纸，笔尖悬停却不落墨；纸上一条线也没有',
         result='纸保持全空（与后面逐行写上形成对照）', reaction='本鲸看纸、不点头不摇头',
         hold=0.4, exit='纸全空、笔悬停', transition='切到按暂停倒回去',
         cin='纸空、笔未动', cout='纸空、笔悬停'),
    dict(id='M12', tv='BOOK', tv_mode='freeze', fx='wipe', mood='rewind', pose='reach', stage='dial',
         words=WORD_TRIGGERS[12], trigger='暂停', mv='硬切＋前景划像',
         focus='按下暂停、倒回去、一段一段看', entry='桌上一枚实体旋钮，电视已定格（不变）',
         action='「暂停」：本鲸伸手按住旋钮、缺口停住；「倒回去」：旋钮反向转、胶片条倒退一格',
         result='旋钮停在倒带位置、胶片条退一格（电视机身与屏幕都没动）', reaction='本鲸手收回，视线留在纸与屏之间',
         hold=0.4, exit='旋钮反转、胶片条退格', transition='切到翻书那段',
         cin='旋钮静、胶片条正', cout='旋钮反转、胶片条退格'),
    dict(id='M13', tv='DRAGON', tv_mode='freeze', fx='none', mood='review', pose='point', stage='lens',
         words=WORD_TRIGGERS[13], trigger='开始', mv='硬切',
         focus='翻书那段是谁按下的开始，电视里没写', entry='纸仍空，放大镜在桌边',
         action='词点「开始」：放大镜扫过空白纸；「没写」：镜停在空白处，纸上仍无线条',
         result='放大镜停在空白纸上，「没写」被看见而不是被说出来', reaction='本鲸指向空白纸后停住',
         hold=0.4, exit='镜停空白、纸仍空', transition='切到记第一行',
         cin='镜在桌边、纸空', cout='镜停纸上、纸仍空'),
    dict(id='M14', tv='DRAGON', tv_mode='freeze', fx='none', mood='write', pose='read', stage='write_one',
         words=WORD_TRIGGERS[14], trigger='记一行', mv='硬切',
         focus='龙娘抓走豆包那段，本鲸记一行', entry='纸仍空，羽毛笔在纸边',
         action='词点「记一行」：笔尖落纸，写出第一条墨线，只写一行',
         result='纸上第一条线，行末留空（不并段、不替谁顶）', reaction='本鲸写完抬笔，不重复写',
         hold=0.4, exit='纸上 1 行', transition='切到三连快切点名',
         cin='纸空', cout='纸 1 行'),
    dict(id='M15', tv='NAME', tv_mode='play', fx='flash', mood='review', pose='point', stage='two_cards',
         words=WORD_TRIGGERS[15], trigger='大小姐', mv='三连快切（电视内不变）',
         focus='追着问名字的是大小姐、喊小心后面的是豆包', entry='纸上 1 行，桌面两张名牌未立',
         action='词点「大小姐」：王冠名牌立起；词点「豆包」：缎带名牌立起；电视内仍按 v3 三连 NAME→CAGE→MOON',
         result='两张名牌分列、不合成一张', reaction='本鲸指完停住',
         hold=0.4, exit='纸 1 行＋两张名牌', transition='切到 Kimi 举月光',
         cin='纸 1 行、无名牌', cout='纸 1 行＋两张名牌'),
    dict(id='M16', tv='MOON', tv_mode='play', fx='none', mood='moon', pose='point', stage='raise_moon',
         words=WORD_TRIGGERS[16], trigger='举', mv='硬切',
         focus='照亮山洞的月光是 Kimi 举的，一直没人提', entry='月灯在桌面上，名牌在侧',
         action='词点「举」：月灯被举起一小段、光晕与射线张开；纸上不为它添一行',
         result='月灯举着、纸上没有对应那一行（「一直没人提」被看见）', reaction='本鲸只看不说，不补写',
         hold=0.4, exit='月灯举着、纸未添行', transition='切到反转句',
         cin='月灯平放', cout='月灯举起、纸未添行'),
    dict(id='M17', tv='FIRE', tv_mode='play', fx='flash', mood='reveal', pose='happy', stage='reveal',
         words=WORD_TRIGGERS[17], trigger='全演过了', mv='硬切＋闪白',
         focus='反转：电视里全演过了，只是没人把它写下来', entry='桌上胶片条收着、纸只有 1 行',
         action='「全演过了」：胶片条展开，露出番外真帧缩略；「写下来」：胶片条下方仍是一条空行',
         result='画面演过、纸却空着，矛盾落在同一张桌上', reaction='本鲸由开心收成注视，不弹跳',
         hold=0.4, exit='胶片条展开＋空行', transition='切到一帧一帧看',
         cin='胶片条收、纸 1 行', cout='胶片条展开＋空行'),
    dict(id='M18', tv='FIRE', tv_mode='play', fx='none', mood='frames', pose='read', stage='frames',
         words=WORD_TRIGGERS[18], trigger='一帧一帧', mv='硬切',
         focus='不用问人，一帧一帧看就够了', entry='胶片条展开，本鲸低头',
         action='词点「一帧一帧」：胶片条按帧逐格推进、亮框每次只挪一格',
         result='亮框停在最后一格，不用问人也能看', reaction='本鲸俯身看格，停住',
         hold=0.4, exit='胶片条推进到末格', transition='切到把纸翻过来',
         cin='亮框在首格', cout='亮框在末格'),
    dict(id='M19', tv='FIRE', tv_mode='freeze', fx='none', mood='write', pose='read', stage='paper_flip',
         words=WORD_TRIGGERS[19], trigger='翻过来', mv='硬切',
         focus='把纸翻过来，按片子顺序一段写一行', entry='纸正面 1 行，笔在纸边',
         action='「翻过来」：纸角翻起露出背面；「一段写一行」：笔尖按胶片条顺序逐行落墨',
         result='背面按片序多出几行，每行分开', reaction='本鲸写完一行再写下一行，不一次性刷满',
         hold=0.4, exit='纸背面数行', transition='切到不替谁顶',
         cin='纸正面 1 行', cout='纸背面按片序数行'),
    dict(id='M20', tv='FIRE', tv_mode='freeze', fx='none', mood='write', pose='letter', stage='separate',
         words=WORD_TRIGGERS[20], trigger='不替谁顶', mv='硬切',
         focus='不替谁顶，也不把几段并成一段', entry='纸背面数行，两行之间有空',
         action='「不替谁顶」：两条墨线各自留出空档；「并成一段」：夹子把两行隔开，不连线',
         result='两行始终分开，没有合并成一条', reaction='本鲸把笔停住，不补连笔',
         hold=0.4, exit='两行分开＋夹子', transition='切到烤焦那张',
         cin='两行相邻', cout='两行分开＋夹子'),
    dict(id='M21', tv='FIRE', tv_mode='freeze', fx='none', mood='clip', pose='letter', stage='clip_charred',
         words=WORD_TRIGGERS[21], trigger='单独夹起来', mv='硬切',
         focus='烤焦那张单独夹起来写待补，不写修好了', entry='纸面数行，焦纸在右上未夹',
         action='「单独夹起来」：焦纸滑入、夹子扣上；「待补」：焦纸上落两笔「待补」，不落「修好了」',
         result='焦纸单独留白待补，不冒称已修', reaction='本鲸收笔，不改那两字',
         hold=0.4, exit='焦纸夹好写「待补」', transition='切到关电视收伞',
         cin='焦纸未夹', cout='焦纸夹好、写「待补」'),
    dict(id='M22', tv='dark', tv_mode='dark', fx='flash', mood='off', pose='idle', stage='off_umbrella',
         words=WORD_TRIGGERS[22], trigger='关掉', mv='硬切＋闪白',
         focus='电视关掉、歪伞收进抽屉、今天不拍雨了', entry='电视按 v3 仍在同一位置转黑，屋里亮、雨线在下',
         action='「关掉」：屋里压暗（屏幕内容按 v3 变黑，机身不动）；「收进抽屉」：伞骨收拢滑进抽屉；「不拍雨」：雨线停',
         result='暗屋、抽屉合上、雨停', reaction='本鲸站定，不再撑伞',
         hold=0.4, exit='暗屋、伞收、雨停', transition='切到白饭',
         cin='亮屋、雨在下、伞开', cout='暗屋、雨停、伞收'),
    dict(id='M23', tv='dark', tv_mode='dark', fx='none', mood='rice', pose='blink', stage='rice',
         words=WORD_TRIGGERS[23], trigger='白饭', mv='硬切',
         focus='昨天那碗白饭还是老大买的，这句不改', entry='暗屋、纸上有数行',
         action='「白饭」：饭盆出现、三缕热气上升；「不改」：纸上那一行墨线保持，不被擦掉',
         result='饭盆与那一行字都留着', reaction='本鲸眨眼一次后停住',
         hold=0.4, exit='饭盆＋未改的那行', transition='切到下集钩子',
         cin='无饭盆、纸数行', cout='饭盆＋未改的那行'),
    dict(id='M24', tv='dark', tv_mode='dark', fx='none', mood='hook', pose='point', stage='hook',
         words=WORD_TRIGGERS[24], trigger='一个字一个字', mv='硬切',
         focus='下一集把装不下的名字一个字一个字塞回框', entry='昵称框仍在桌上、字母散在框外',
         action='「一个字一个字」：溢出的字迹逐笔飞回框里；「塞回框」：框口合拢、本鲸指向黑屏电视',
         result='字迹回到框里，说完即停，不加片尾卡', reaction='本鲸指向后停住',
         hold=0.6, exit='框合、字迹归位、本鲸指向', transition='结束（无尾卡、无角标）',
         cin='字迹在框外', cout='字迹回框、说完即停'),
]

# 电视片段的成片真帧定位与 v3 完全一致（电视机内容不变）
CLIP_SECOND = {5: ('SIGNUP', 0.5), 8: ('CAGE', 0.5), 9: ('END', 0.80)}
TRIPLE = [(0.00, 'NAME'), (0.34, 'CAGE'), (0.67, 'MOON')]

_rng = random.Random(20261109)
STROKES = []
for i in range(len(INK_WORDS)):
    yy = PAPER[1] + 24 + i * 17 + _rng.randint(-2, 2)
    x0 = PAPER[0] + _rng.randint(24, 150)
    x1 = x0 + _rng.randint(55, 280)
    STROKES.append((x0, yy, x1, yy + _rng.randint(-4, 5)))

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
    needed = {s['tv'] for s in SCENES} | {v[0] for v in CLIP_SECOND.values()} | {c for _, c in TRIPLE}
    for clip in sorted(needed - {'dark'}):
        files = sorted(p.name for p in (base / clip).glob('*.jpg')) if (base / clip).is_dir() else []
        if not files:
            raise RuntimeError(f'缺片段 {clip} 的抽帧：{base / clip}')
        frame_index[clip] = files


def word_times(cues: list) -> dict[int, dict[str, float]]:
    """取实测词点：chars_timed 与台词逐字一一对应，时间不早于本句 cue.start。"""
    out: dict[int, dict[str, float]] = {}
    for cue in cues:
        line = int(cue['index'])
        ct, txt, start = cue['chars_timed'], cue['text'], float(cue['start'])
        assert len(ct) == len(txt), f'L{line} 逐字轴长度不一致'
        d = {}
        for w in WORD_TRIGGERS[line]:
            p = txt.find(w)
            if p < 0:
                raise RuntimeError(f'L{line} 台词里找不到触发词 {w}')
            d[w] = max(start, float(ct[p]['start']))
        out[line] = d
    return out


def ink_times(wt: dict[int, dict[str, float]]) -> list[float]:
    return [wt[line][word] for line, word in INK_WORDS]


@lru_cache(maxsize=96)
def tv_frame(clip: str, index: int) -> Image.Image:
    files = frame_index.get(clip)
    if not files:
        raise RuntimeError(f'缺抽帧目录 {clip}')
    folder = ROOT / 'tools/day14制作/tv_frames' / clip
    return Image.open(folder / files[index % len(files)]).convert('RGB').resize((SW, SH), Image.LANCZOS)


@lru_cache(maxsize=20)
def sheet_image(rel: str) -> Image.Image:
    return Image.open(ROOT / rel).convert('RGBA')


@lru_cache(maxsize=420)
def sprite_frame(sheet: str, idx: int, size: tuple[int, int], flip: bool,
                 charred: bool) -> Image.Image:
    rel, n = SHEETS[sheet]
    fr = sheet_image(rel).crop((idx % n * 384, 0, (idx % n + 1) * 384, 416))
    fr = fr.resize(size, Image.LANCZOS)
    if flip:
        fr = fr.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    if charred:
        rgb = ImageEnhance.Color(fr.convert('RGB')).enhance(0.88)
        rgb = ImageEnhance.Brightness(rgb).enhance(0.90)
        out = rgb.convert('RGBA')
        out.putalpha(fr.getchannel('A'))
        fr = out
    return fr



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


def clamp01(x: float) -> float:
    return min(1.0, max(0.0, x))


def progress(t: float, wt: dict[str, float], word: str, lead: float = 0.22,
             dur: float = 0.95) -> float:
    """词点前 0.22s 起势、词点后约 0.95s 成形；成形后一直保持（Day12 的「停留」）。"""
    if word not in wt:
        return 0.0
    return clamp01((t - (wt[word] - lead)) / (dur + lead))



def apply_sample_camera(im: Image.Image, move: str, u: float, t: float) -> Image.Image:
    """只变换主画面手绘背景；电视外壳随后固定贴上，不跟着推拉。"""
    scale, cx, cy = 1.0, W / 2, H / 2
    if move == 'push':
        scale = 1.0 + 0.18 * u
    elif move == 'pull':
        scale = 1.18 - 0.18 * u
    elif move == 'pan_r':
        cx = 760 + 380 * u
    elif move == 'pan_l':
        cx = 1160 - 380 * u
    elif move == 'tilt_up':
        cy = 720 - 240 * u
    elif move == 'shake':
        cx += 7 * math.sin(t * 39.0)
        cy += 6 * math.sin(t * 47.0 + 1.1)
        scale = 1.04
    cw, ch = W / scale, H / scale
    x0 = int(round(min(max(cx - cw / 2, 0), W - cw)))
    y0 = int(round(min(max(cy - ch / 2, 0), H - ch)))
    return im.crop((x0, y0, x0 + int(cw), y0 + int(ch))).resize((W, H), Image.LANCZOS)


def top_glow(im: Image.Image, t: float) -> Image.Image:
    arr = np.asarray(im).astype(np.float32)
    yy = np.arange(H, dtype=np.float32)[:, None]
    glow = np.clip((190 - yy) / 140.0, 0, 1) ** 0.8
    glow = glow * (0.97 + 0.03 * math.sin(t * 1.7))
    light = np.array([126, 196, 214], np.float32)
    arr = arr * (1 - glow[:, :, None]) + light[None, None, :] * glow[:, :, None]
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), 'RGB')


def draw_tv_body(d: ImageDraw.ImageDraw) -> None:
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



def background(t: float, cue: dict, line: int, wt: dict, frac: float) -> Image.Image:
    """主画面 = 项目 MV 式粉彩舞台 → 镜头只动背景 → 固定电视外壳。"""
    return S7.draw_script_backdrop(t, line, wt, frac)


def mood_grade(im: Image.Image, t: float, scene: dict, wt: dict) -> Image.Image:
    """v7 不靠全屏压色换景；24 个粉彩剧本场景本身结构、调色板、道具都不同。"""
    return im


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


def draw_paper(im: Image.Image, t: float, wt: dict[str, float], inks: list[float]) -> None:
    """纸角翻动；墨线只在实测词点上落笔，一条词点一条，不整行跳变。"""
    d = ImageDraw.Draw(im)
    da = ImageDraw.Draw(im, 'RGBA')
    d.rounded_rectangle(PAPER, radius=8, fill=(244, 246, 232), outline=(196, 202, 186), width=3)
    fl = 3 * math.sin(t * 3.1)
    d.polygon([(PAPER[2], PAPER[1]), (PAPER[2] + 12 + fl, PAPER[1] - 8),
               (PAPER[2] + 2, PAPER[1] + 20)], fill=(224, 230, 212), outline=(186, 194, 176))
    for i, ink_t in enumerate(inks):
        if i >= len(STROKES):
            break
        x0, y0, x1, y1 = STROKES[i]
        k = clamp01((t - ink_t) / 0.55)
        if k <= 0:
            continue
        qx, qy = x0 + (x1 - x0) * k, y0 + (y1 - y0) * k
        d.line((x0, y0, qx, qy), fill=(72, 92, 104), width=3)
        if k >= 1 and i % 3 == 1:
            d.line((x1 + 14, y0, x1 + 58, y0), fill=(96, 116, 128), width=2)
        da.ellipse((qx - 2, qy - 2, qx + 3, qy + 3), fill=(64, 84, 96, 120))
        if k < 1:
            _quill(d, qx, qy, t)


def quill_hover(im: Image.Image, t: float) -> None:
    """笔悬在空白纸上方，不落墨（L11 / L13）。"""
    d = ImageDraw.Draw(im)
    x = PAPER[0] + 70 + 14 * math.sin(t * 2.2)
    y = PAPER[1] + 52 + 6 * math.sin(t * 3.1)
    _quill(d, x, y, t)


# ---- 逐句主画面动作 ----------------------------------------------------------
def soot_flakes(im: Image.Image, t: float, p: float, seed: int = 1) -> None:
    da = ImageDraw.Draw(im, 'RGBA')
    if p <= 0:
        return
    rng = np.random.default_rng(seed)
    for k in range(16):
        x = BEN[0] + int(rng.integers(40, 300))
        y = BEN[1] + 120 + int((rng.integers(0, 190) + t * (40 + k % 4 * 14)) % 190)
        r = 2 + k % 3
        da.ellipse((x - r, y - r, x + r, y + r), fill=(38, 34, 34, int(150 * p)))


def mirror_tile(im: Image.Image, t: float, p: float) -> None:
    """桌上的圆柄手镜（不是方卡片）：词点后才照出焦黑鱼影。"""
    d = ImageDraw.Draw(im)
    da = ImageDraw.Draw(im, 'RGBA')
    mx, my = 790, 700
    d.line((mx + 58, my + 58, mx + 112, my + 112), fill=(150, 122, 78), width=14)
    d.line((mx + 58, my + 58, mx + 112, my + 112), fill=(204, 176, 116), width=8)
    d.ellipse((mx - 86, my - 86, mx + 86, my + 86),
              fill=(196, 216, 222), outline=(92, 126, 140), width=8)
    d.ellipse((mx - 70, my - 70, mx + 70, my + 70),
              fill=(144, 178, 190), outline=(108, 148, 160), width=4)
    # 镜面高光斜带，明确是镜子
    da.polygon([(mx - 44, my - 58), (mx - 12, my - 58), (mx - 54, my + 58), (mx - 66, my + 58)],
               fill=(232, 248, 250, 60))
    if p > 0.05:
        k = p
        a = int(235 * k)
        da.ellipse((mx - 52, my - 12 + int(8 * (1 - k)), mx + 46, my + 48),
                   fill=(38, 34, 36, a))
        da.polygon([(mx - 46, my + 16), (mx - 76, my - 6), (mx - 72, my + 46)],
                   fill=(38, 34, 36, a))
        da.ellipse((mx + 16, my + 6, mx + 24, my + 14), fill=(236, 220, 170, a))


def book_open(im: Image.Image, t: float, wt: dict[str, float]) -> None:
    d = ImageDraw.Draw(im)
    da = ImageDraw.Draw(im, 'RGBA')
    bx, by = 780, 742
    pf = progress(t, wt, '翻开', 0.2, 0.8)
    pg = progress(t, wt, '长出', 0.2, 1.0)
    d.rounded_rectangle((bx, by, bx + 190, by + 56), radius=6,
                        fill=(146, 42, 54), outline=(84, 26, 34), width=3)
    d.rectangle((bx + 92, by + 4, bx + 98, by + 52), fill=(96, 30, 38))
    turn = int(16 * pf * (0.6 + 0.4 * math.sin(t * 6)))
    d.polygon([(bx + 98, by + 6), (bx + 98 + turn, by - 12),
               (bx + 182 + turn, by + 2), (bx + 182, by + 18)],
              fill=(246, 240, 218), outline=(182, 168, 138))
    for i, tx in enumerate((820, 878, 936)):
        h = int((42 + i * 16) * pg)
        if h < 3:
            continue
        d.rectangle((tx, by - h, tx + 28, by), fill=(196, 168, 202), outline=(104, 78, 126), width=2)
        d.polygon([(tx - 4, by - h), (tx + 14, by - h - 22 * pg), (tx + 32, by - h)],
                  fill=(154, 84, 116), outline=(104, 78, 126))
        da.rectangle((tx + 9, by - h + 12, tx + 19, by - h + 26), fill=(255, 226, 150, 170))


def map_scroll(im: Image.Image, t: float, wt: dict[str, float]) -> None:
    d = ImageDraw.Draw(im)
    da = ImageDraw.Draw(im, 'RGBA')
    p = progress(t, wt, '应征', 0.2, 0.9)
    ps = progress(t, wt, '送', 0.2, 0.9)
    sw = int(300 * p)
    if sw > 4:
        d.rounded_rectangle((700, 660, 700 + sw, 760), radius=5,
                            fill=(238, 226, 194), outline=(150, 122, 78), width=3)
        # 卷起来的两端：明确是卷轴，不是表格或看板
        d.ellipse((688, 656, 716, 764), fill=(214, 194, 152), outline=(150, 122, 78), width=3)
        d.ellipse((700 + sw - 12, 656, 700 + sw + 16, 764),
                  fill=(214, 194, 152), outline=(150, 122, 78), width=3)
        for i in range(3):
            yy = 686 + i * 24
            pts = [(716 + j * 18, yy + int(4 * math.sin(j * 0.9 + i + t * 0.8)))
                   for j in range(max(2, (sw - 40) // 18))]
            da.line(pts, fill=(152, 126, 88, 190), width=3)
    # Gemini 星屑 / 智谱 长戟：词点「送」依次落到告示两侧，不靠人群巡游
    if ps > 0.15:
        sx, sy = 660 + int(14 * math.sin(t * 2.4)), 690 + int(20 * (1 - ps))
        d.polygon([(sx, sy - 12), (sx + 9, sy), (sx, sy + 12), (sx - 9, sy)],
                  fill=(250, 220, 118), outline=(170, 132, 56))
    if ps > 0.55:
        hx = 1030 + int(18 * (1 - ps))
        d.line((hx, 640, hx, 770), fill=(150, 132, 96), width=7)
        d.polygon([(hx - 14, 640), (hx + 14, 640), (hx, 606)], fill=(206, 210, 202))


def chests(im: Image.Image, t: float, wt: dict[str, float]) -> None:
    d = ImageDraw.Draw(im)
    da = ImageDraw.Draw(im, 'RGBA')
    p = progress(t, wt, '宝箱', 0.2, 1.1)
    pc = progress(t, wt, '山洞口', 0.15, 0.9)
    for i, cx in enumerate((660, 850, 1040)):
        k = clamp01(p * 3.2 - i * 0.5)
        cy = 742
        d.rounded_rectangle((cx - 44, cy, cx + 44, cy + 46), radius=5,
                            fill=(126, 84, 48), outline=(72, 46, 28), width=3)
        d.rectangle((cx - 44, cy + 18, cx + 44, cy + 26), fill=(206, 164, 76))
        lid = int(34 * k)
        d.polygon([(cx - 44, cy), (cx - 44, cy - lid), (cx + 44, cy - lid), (cx + 44, cy)],
                  fill=(160, 108, 58), outline=(72, 46, 28))
        if k > 0.35:
            da.ellipse((cx - 34, cy - 8, cx + 34, cy + 18), fill=(255, 226, 132, 110))
        for j in range(4):
            sx = cx - 30 + j * 18 + 5 * math.sin(t * 2.0 + j + i)
            sy = cy - 8 - ((t * 34 + j * 21 + i * 17) % 66)
            r = 3
            d.polygon([(sx, sy - r), (sx + r, sy), (sx, sy + r), (sx - r, sy)],
                      fill=(255, 232, 142))
    # 风车村：小风车逐帧转
    wx, wy = 1200, 690
    d.line((wx, wy, wx, wy + 80), fill=(112, 92, 68), width=6)
    for i in range(4):
        a = t * 1.4 + i * math.pi / 2
        d.line((wx, wy, wx + 46 * math.cos(a), wy + 46 * math.sin(a)), fill=(226, 214, 178), width=7)
    if pc > 0.05:
        da.arc((1240, 640, 1380, 790), 180, 360, fill=(226, 210, 156, int(220 * pc)), width=8)


def namebox(im: Image.Image, t: float, wt: dict[str, float], returning: bool = False) -> None:
    d = ImageDraw.Draw(im)
    da = ImageDraw.Draw(im, 'RGBA')
    box = (820, 646, 1120, 754)
    d.rounded_rectangle(box, radius=8, fill=(196, 158, 98), outline=(96, 68, 38), width=4)
    d.rounded_rectangle((box[0] + 12, box[1] + 12, box[2] - 12, box[3] - 12), radius=4,
                        fill=(244, 236, 208), outline=(162, 132, 82), width=2)
    if returning:
        p1 = progress(t, wt, '一个字一个字', 0.15, 1.0)
        p2 = progress(t, wt, '塞回框', 0.12, 0.7)
        for i in range(9):
            k = clamp01(p1 * 1.6 - i * 0.14)
            sx = box[2] + 120 - 120 * k
            sy = box[3] + 120 - 90 * k
            d.line((sx, sy, sx + 22, sy + 8 * math.sin(t * 3 + i)), fill=(78, 62, 52), width=3)
        if p2 > 0:
            d.line((box[0] + 10, box[1] + 10, box[2] - 10, box[1] + 10),
                   fill=(120, 86, 48), width=int(4 + 6 * p2))
        return
    p = progress(t, wt, '塞不进', 0.2, 1.0)
    for i in range(7):
        yy = box[1] + 26 + i * 12
        d.line((box[0] + 26, yy, box[0] + 26 + 160 + 18 * math.sin(t * 1.6 + i), yy),
               fill=(92, 74, 58), width=3)
    for i in range(9):
        off = (t * 36 + i * 29) % 150
        xx = box[2] - 6 + int(14 * math.sin(t * 1.4 + i))
        yy = box[1] + 18 + off * 0.55 * p
        if yy > box[3] + 130:
            continue
        da.line((xx, yy, xx + 22, yy + 8 * math.sin(t * 3 + i)), fill=(78, 62, 52, int(235 * p)), width=3)
    pc = progress(t, wt, '追着问', 0.15, 0.9)
    if pc > 0:
        for j in range(3):
            k = clamp01(pc * 3 - j)
            cx = 1140 + int(26 * k)
            cy = 700 + j * 16
            d.polygon([(cx - 20, cy), (cx - 12, cy - 20), (cx, cy - 8),
                       (cx + 12, cy - 20), (cx + 20, cy)], fill=(238, 196, 88), outline=(150, 110, 46))


def moon_cage(im: Image.Image, t: float, wt: dict[str, float], raise_lamp: bool = False) -> None:
    d = ImageDraw.Draw(im)
    da = ImageDraw.Draw(im, 'RGBA')
    key = '举' if raise_lamp else '月光'
    p = progress(t, wt, key, 0.18, 0.9)
    lx = 1000
    ly = 566 - int(58 * (p if raise_lamp else 0))
    for k in range(4):
        r = 44 + k * 24 + 6 * math.sin(t * 1.8)
        da.ellipse((lx - r, ly - r, lx + r, ly + r), fill=(226, 240, 255, int(20 * p)))
    d.ellipse((lx - 20, ly - 26, lx + 20, ly + 14), fill=(246, 240, 196), outline=(196, 176, 108), width=3)
    d.rounded_rectangle((lx - 12, ly + 12, lx + 12, ly + 34), radius=3, fill=(176, 146, 88))
    for i in range(8):
        a = t * 0.7 + i * math.pi / 4
        x1, y1 = lx + 34 * math.cos(a), ly + 34 * math.sin(a)
        x2, y2 = lx + 54 * math.cos(a), ly + 54 * math.sin(a)
        da.line((x1, y1, x2, y2), fill=(255, 248, 202, int(120 * p)), width=3)
    if raise_lamp:
        return
    pc = progress(t, wt, '笼子', 0.15, 0.9)
    if pc > 0.05:
        cbx, cby = 1160, 588 + int(30 * (1 - pc))
        d.arc((cbx - 12, cby - 34, cbx + 132, cby + 14), 180, 360, fill=(188, 160, 88), width=5)
        d.rectangle((cbx, cby, cbx + 120, cby + 168), outline=(188, 160, 88), width=5)
        for i in range(5):
            gx = cbx + 18 + i * 24
            da.line((gx, cby + 4, gx + 7, cby + 164), fill=(255, 246, 200, int(90 * pc)), width=2)
        d.line((cbx, cby + 168, cbx + 120, cby + 168), fill=(188, 160, 88), width=5)
        # 缎带在笼里（豆包的签名道具）
        d.arc((cbx + 34, cby + 70, cbx + 86, cby + 122), 20, 300, fill=(196, 96, 120), width=6)


def fire(im: Image.Image, t: float, wt: dict[str, float]) -> None:
    da = ImageDraw.Draw(im, 'RGBA')
    d = ImageDraw.Draw(im)
    p = progress(t, wt, '一口火', 0.15, 1.0)
    if p <= 0:
        return
    bx, by = 930, 738
    for k in range(3):
        off = k * 26 - 26
        tip = by - int((130 + 28 * math.sin(t * 7.0 + k)) * p)
        da.polygon([(bx + off - 24, by), (bx + off + 24, by),
                    (bx + off + 10 * math.sin(t * 6 + k), tip)], fill=(240, 116 + k * 24, 46, int(175 * p)))
        da.polygon([(bx + off - 11, by), (bx + off + 11, by),
                    (bx + off + 5 * math.sin(t * 8 + k), tip + 46)], fill=(255, 216, 112, int(190 * p)))
    for j in range(16):
        ex = bx - 60 + (j * 47) % 180 + 12 * math.sin(t * 2.3 + j)
        ey = by - ((t * 70 + j * 31) % 190)
        r = 2 + j % 3
        da.ellipse((ex - r, ey - r, ex + r, ey + r), fill=(255, 198, 96, int(150 * p)))


def dragon_shadow(im: Image.Image, t: float, wt: dict[str, float]) -> None:
    """龙影只掠过一次，不是常驻角色；「抓走」时王冠缎带掉到桌沿。"""
    da = ImageDraw.Draw(im, 'RGBA')
    d = ImageDraw.Draw(im)
    p = progress(t, wt, '俯冲', 0.1, 1.1)
    if 0 < p < 1:
        x = 120 + 700 * p
        y = 140 + 300 * p
        da.polygon([(x - 150, y - 60), (x - 20, y - 18), (x - 90, y + 30),
                    (x + 60, y + 10), (x + 30, y + 62), (x - 110, y + 62)],
                   fill=(18, 22, 34, int(150 * (1 - abs(p - 0.5)))))
    pc = progress(t, wt, '抓走', 0.15, 0.9)
    if pc > 0.05:
        cy = 700 + int(70 * (1 - pc))
        d.polygon([(1060, cy), (1072, cy - 24), (1086, cy - 10),
                   (1100, cy - 24), (1112, cy)], fill=(238, 196, 88), outline=(150, 110, 46))
        d.arc((1070, cy + 6, 1104, cy + 40), 20, 300, fill=(196, 96, 120), width=6)


def dial(im: Image.Image, t: float, wt: dict[str, float]) -> None:
    """实体旋钮在桌上（不在电视机上），暂停停住、倒回去反转。"""
    d = ImageDraw.Draw(im)
    cx, cy = 940, 700
    p = progress(t, wt, '暂停', 0.15, 0.7)
    pr = progress(t, wt, '倒回去', 0.15, 0.9)
    ang = -t * 2.4 * (1 - p) - 2.0 * pr
    d.ellipse((cx - 34, cy - 34, cx + 34, cy + 34), fill=(58, 74, 84), outline=(150, 178, 188), width=4)
    d.line((cx, cy, cx + 24 * math.cos(ang), cy + 24 * math.sin(ang)), fill=(240, 220, 120), width=5)
    d.ellipse((cx - 5, cy - 5, cx + 5, cy + 5), fill=(240, 220, 120))
    # 胶片条倒退一格
    strip(im, t, 'FIRE', step=int(4 - 2 * pr), compact=True)


def lens(im: Image.Image, t: float, wt: dict[str, float]) -> None:
    d = ImageDraw.Draw(im)
    da = ImageDraw.Draw(im, 'RGBA')
    p = progress(t, wt, '开始', 0.15, 1.0)
    lx = PAPER[0] + 60 + int(300 * min(1.0, p * 1.2))
    ly = PAPER[1] + 70
    da.ellipse((lx - 44, ly - 44, lx + 44, ly + 44), fill=(210, 240, 246, 46))
    d.ellipse((lx - 44, ly - 44, lx + 44, ly + 44), outline=(96, 132, 146), width=6)
    d.line((lx + 32, ly + 32, lx + 84, ly + 84), fill=(96, 132, 146), width=9)


def two_cards(im: Image.Image, t: float, wt: dict[str, float]) -> None:
    d = ImageDraw.Draw(im)
    for word, x, col, crown in (('大小姐', 700, (238, 196, 88), True),
                                ('豆包', 980, (196, 96, 120), False)):
        p = progress(t, wt, word, 0.12, 0.8)
        if p <= 0:
            continue
        y = 720 + int(60 * (1 - p))
        d.rounded_rectangle((x, y, x + 200, y + 66), radius=6,
                            fill=(240, 232, 208), outline=(120, 96, 64), width=3)
        d.line((x + 20, y + 26, x + 150, y + 26), fill=(92, 74, 58), width=3)
        d.line((x + 20, y + 44, x + 112, y + 44), fill=(120, 100, 78), width=2)
        if crown:
            d.polygon([(x + 150, y + 16), (x + 160, y - 6), (x + 170, y + 6),
                       (x + 180, y - 6), (x + 190, y + 16)], fill=col, outline=(150, 110, 46))
        else:
            d.arc((x + 150, y + 6, x + 190, y + 46), 20, 300, fill=col, width=6)


def strip(im: Image.Image, t: float, clip: str, step: int = 0, compact: bool = False) -> None:
    """实体胶片格：只画胶片孔与色块，不把 MV 真帧贴进主画面。"""
    d = ImageDraw.Draw(im)
    da = ImageDraw.Draw(im, 'RGBA')
    x0, y0 = 300, 626 if compact else 612
    tw, th = (110, 62) if compact else (150, 84)
    n = 5
    d.rounded_rectangle((x0 - 12, y0 - 12, x0 + n * (tw + 10) + 2, y0 + th + 12),
                        radius=8, fill=(38, 52, 62), outline=(16, 28, 38), width=4)
    for i in range(n):
        x = x0 + i * (tw + 10)
        d.rectangle((x, y0, x + tw, y0 + th), fill=(58, 72, 82), outline=(12, 24, 34), width=3)
        for j in range(4):
            d.rectangle((x + 6, y0 + 6 + j * 18, x + 16, y0 + 16 + j * 18), fill=(16, 26, 34))
            d.rectangle((x + tw - 16, y0 + 6 + j * 18, x + tw - 6, y0 + 16 + j * 18), fill=(16, 26, 34))
        q = clamp01((step % n + 1 - i) / 4.0)
        da.ellipse((x + tw / 2 - 20, y0 + th / 2 - 20 + 5 * math.sin(t + i),
                    x + tw / 2 + 20, y0 + th / 2 + 20 + 5 * math.sin(t + i)),
                   fill=(226, 204, 124, int(80 * q)))
        if i == step % n:
            d.rectangle((x - 4, y0 - 4, x + tw + 4, y0 + th + 4), outline=(250, 226, 140), width=4)


def reveal(im: Image.Image, t: float, wt: dict[str, float]) -> None:
    d = ImageDraw.Draw(im)
    p = progress(t, wt, '全演过了', 0.15, 0.9)
    if p > 0:
        strip(im, t, 'FIRE', step=int(4 * p))
    pb = progress(t, wt, '写下来', 0.15, 0.9)
    if pb > 0:
        # 胶片条下方仍是一条空行：演过 ≠ 写下来
        d.line((320, 730, 320 + int(500 * pb), 730), fill=(212, 214, 198), width=4)


def frames_advance(im: Image.Image, t: float, wt: dict[str, float]) -> None:
    p = progress(t, wt, '一帧一帧', 0.12, 1.1)
    strip(im, t, 'FIRE', step=int(4 * p))


def paper_flip(im: Image.Image, t: float, wt: dict[str, float]) -> None:
    d = ImageDraw.Draw(im)
    p = progress(t, wt, '翻过来', 0.15, 0.8)
    if 0 < p < 1:
        fold = int(210 * math.sin(math.pi * p))
        d.polygon([(PAPER[0], PAPER[1]), (PAPER[0] + fold, PAPER[1] - 16),
                   (PAPER[0] + fold, PAPER[3] - 12), (PAPER[0], PAPER[3])],
                  fill=(226, 230, 212), outline=(176, 186, 166))
    strip(im, t, 'FIRE', step=4, compact=True)


def separate(im: Image.Image, t: float, wt: dict[str, float]) -> None:
    d = ImageDraw.Draw(im)
    p = progress(t, wt, '不替谁顶', 0.15, 0.9)
    if p > 0:
        d.line((PAPER[0] + 60, PAPER[1] + 60, PAPER[0] + 60 + int(260 * p), PAPER[1] + 60),
               fill=(72, 92, 104), width=4)
        d.line((PAPER[0] + 60, PAPER[1] + 104, PAPER[0] + 60 + int(200 * p), PAPER[1] + 104),
               fill=(72, 92, 104), width=4)
    pc = progress(t, wt, '并成一段', 0.15, 0.9)
    if pc > 0:
        cx = PAPER[0] + 380
        d.arc((cx - 14, PAPER[1] + 56, cx + 14, PAPER[1] + 112), 0, 360,
              fill=(196, 198, 190), width=5)
        d.line((cx, PAPER[1] + 60, cx, PAPER[1] + 108), fill=(196, 198, 190), width=4)


def charred_clip(im: Image.Image, t: float, wt: dict[str, float]) -> None:
    d = ImageDraw.Draw(im)
    p = progress(t, wt, '单独夹起来', 0.15, 1.0)
    if p <= 0:
        return
    off = int(90 * (1 - p))
    d.polygon([(PAPER[2] - 18 + off, PAPER[1] - 12 - off),
               (PAPER[2] + 74 + off, PAPER[1] + 4 - off),
               (PAPER[2] + 66 + off, PAPER[1] + 86 - off),
               (PAPER[2] - 24 + off, PAPER[1] + 66 - off)],
              fill=(58, 52, 48), outline=(30, 26, 24))
    if p > 0.6:
        cx = PAPER[2] + 30
        cy = PAPER[1] + 8
        d.arc((cx - 12, cy - 16, cx + 12, cy + 22), 0, 360, fill=(196, 198, 190), width=4)
        d.line((cx + 10, cy - 10, cx + 10, cy + 30), fill=(196, 198, 190), width=3)
    p2 = progress(t, wt, '待补', 0.12, 0.7)
    if p2 > 0:
        f = font(26)
        d.text((PAPER[2] - 4, PAPER[1] + 24), '待补'[:max(1, int(2 * p2))], font=f,
               fill=(224, 220, 204))


def umbrella(im: Image.Image, t: float, wt: dict[str, float]) -> None:
    d = ImageDraw.Draw(im)
    cx, cy = 1810, 640
    p = progress(t, wt, '收进抽屉', 0.15, 1.1)
    if p <= 0:
        d.line((cx, cy, cx - 22, 886), fill=(92, 74, 98), width=7)
        d.arc((1750, 566, 1875, 662), 190, 350, fill=(190, 96, 118), width=9)
        d.line((cx - 22, 886, cx + 2, 900), fill=(92, 74, 98), width=7)
        return
    r = int(62 * (1 - 0.86 * p))
    d.arc((cx - r, cy - r - 74, cx + r, cy - 20), 185, 355, fill=(190, 96, 118), width=9)
    top = int(cy + p * 150)
    d.line((cx, min(top, 820), cx - 18, min(886, top + 210)), fill=(92, 74, 98), width=7)
    slide = int(90 * clamp01((p - 0.15) / 0.6))
    back = int(90 * clamp01((p - 0.72) / 0.28))
    dx = slide - back
    d.rounded_rectangle((1740 + dx, 800, 1890 + dx, 900), radius=8,
                        fill=(116, 174, 180), outline=(72, 130, 140), width=4)
    d.line((1800 + dx, 838, 1830 + dx, 838), fill=(60, 100, 110), width=5)


def rice(im: Image.Image, t: float, wt: dict[str, float]) -> None:
    d = ImageDraw.Draw(im)
    da = ImageDraw.Draw(im, 'RGBA')
    p = progress(t, wt, '白饭', 0.15, 0.9)
    if p <= 0:
        return
    a = int(255 * p)
    d.ellipse((980, 830, 1120, 900), fill=(238, 240, 226), outline=(180, 188, 176), width=4)
    d.ellipse((1000, 838, 1100, 878), fill=(250, 250, 244))
    for i in range(7):
        gx = 1010 + i * 13
        d.ellipse((gx, 846 + 3 * math.sin(t * 3 + i), gx + 5, 851 + 3 * math.sin(t * 3 + i)),
                  fill=(226, 228, 214))
    for j in range(3):
        pts = [(1030 + j * 24 + int(10 * math.sin(t * 2.1 + j + y * 0.06)), 836 - y)
               for y in range(0, 110, 12)]
        da.line(pts, fill=(240, 250, 248, int((80 - j * 14) * p)), width=5)
    # 「不改」：纸上那一行墨线保持，不被擦掉
    pn = progress(t, wt, '不改', 0.12, 0.7)
    if pn > 0:
        d.line((PAPER[0] + 60, PAPER[1] + 60, PAPER[0] + 60 + int(240 * pn), PAPER[1] + 60),
               fill=(72, 92, 104), width=4)


def set_tv(im: Image.Image, t: float, wt: dict[str, float]) -> None:
    """「搬」：机脚扬起一小团尘、落地涟漪散开；电视机身本身一动不动。"""
    da = ImageDraw.Draw(im, 'RGBA')
    p = progress(t, wt, '搬', 0.15, 0.9)
    cx, cy = TV_OUTER[0] + 90, TV_OUTER[3] + 12
    for k in range(9):
        dx = (k * 37) % 90 + int(40 * math.sin(t * 3 + k))
        dy = -int((t * 30 + k * 17) % 60)
        r = 2 + k % 3
        da.ellipse((cx + dx - r, cy + dy - r, cx + dx + r, cy + dy + r),
                   fill=(226, 232, 216, int(150 * p * (1 - p / 2))))
    if p > 0:
        for j in range(3):
            r = int((16 + j * 18) * p)
            da.arc((cx - r, cy - r // 2, cx + r, cy + r // 2), 0, 180,
                   fill=(226, 240, 232, int(120 * (1 - p * 0.6))), width=3)
    pr = progress(t, wt, '重看', 0.15, 0.8)
    if pr > 0:
        # 抬眼指向屏幕：一个短促的指示弧，不是常驻箭头控件
        da.arc((BEN[0] + 250, BEN[1] + 120, BEN[0] + 390, BEN[1] + 230),
               250, 320, fill=(250, 226, 140, int(180 * pr)), width=5)


def draw_interactions(im: Image.Image, t: float, line: int, wt: dict) -> None:
    """2–3 位本名：实测词点触发动作→位移→结果，成形后冻结关键帧，不循环踏步。"""
    da = ImageDraw.Draw(im, 'RGBA')
    for e in sorted(INTERACTIONS[line], key=lambda x: x['z']):
        size = e['size'] or CAST[e['who']]['size']
        p = progress(t, wt, e['trigger'], 0.18, 0.92)
        k = p * p * (3 - 2 * p)
        x = e['x0'] + (e['x1'] - e['x0']) * k
        y = 760 - size[1] - abs(math.sin(math.pi * p)) * e['dy'] + 1.2 * math.sin(t * 1.7 + e['z'])
        rel, n = SHEETS[e['sheet']]
        frame = min(n - 1, int(p * n))
        flip = e['flip'] if e['flip'] is not None else (e['x1'] < e['x0'])
        sp = sprite_frame(e['sheet'], frame, size, flip, e['charred'])
        xi, yi = int(round(x)), int(round(y))
        half = size[0] * 0.30
        da.ellipse((xi + size[0] / 2 - half, 744, xi + size[0] / 2 + half, 766),
                   fill=(8, 18, 26, 90))
        im.paste(sp, (xi, yi), sp)



def draw_stage(im: Image.Image, t: float, line: int, frac: float,
               wt: dict[str, float], inks: list[float], cue: dict) -> None:
    S7.draw_script_props(im, t, line, wt, frac, inks)
    S7.draw_script_actors(im, t, line, cue, wt)
    # 少量前景浮尘：与场景背景不同速度，不覆盖电视与字幕。
    da = ImageDraw.Draw(im, 'RGBA')
    rng = np.random.default_rng(91)
    for k in range(18):
        x = int(rng.integers(0, W)) + int(7 * math.sin(t * 0.7 + k))
        y = int((rng.integers(80, 740) - t * (4 + k % 3 * 3)) % 720)
        r = int(rng.integers(1, 3))
        da.ellipse((x - r, y - r, x + r, y + r), fill=(226, 248, 255, 36))


def tv_at(scene: dict, cue: dict, t: float, frac: float) -> tuple[str, str, int]:
    """电视内容与 v3 逐帧一致：不因分镜重生成而改动。"""
    line = int(cue['index'])
    clip, mode = scene['tv'], scene['tv_mode']
    if scene['id'] == 'M15':
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


def effects(im: Image.Image, scene: dict, frac: float, t: float) -> Image.Image:
    """MV 式硬切效果：闪白 / 前景划像 / 速度线 / 三连闪白；全画面不做推拉震屏。"""
    fx = scene['fx']
    if fx in ('flash', 'shake_flash') or scene['id'] == 'M15':
        pulses = [0.0, 0.34, 0.67] if scene['id'] == 'M15' else [0.0]
        for p0 in pulses:
            dt = frac - p0
            if 0 <= dt < 0.028:
                a = int(120 * (1 - dt / 0.028))
                im = Image.blend(im, Image.new('RGB', (W, H), (255, 255, 255)), a / 255)
                break
    if fx in ('shake', 'shake_flash'):
        d = ImageDraw.Draw(im, 'RGBA')
        for k in range(7):
            y = 80 + k * 120 + int((t * 260) % 120)
            d.line((0, y, W, y - 90), fill=(214, 240, 248, 40), width=4)
    if fx == 'wipe' and frac < 0.09:
        d = ImageDraw.Draw(im)
        x = int(-300 + (W + 600) * (frac / 0.09))
        d.polygon([(x, 0), (x + 190, 0), (x - 10, H), (x - 200, H)], fill=(28, 62, 82))
        d.line((x + 190, 0, x - 10, H), fill=(126, 196, 214), width=5)
    return im


def render_at(t: float, cues: list, screens: list, cue_starts: list,
              scr_starts: list, scr_ends: list, wt_all: dict[int, dict[str, float]],
              inks: list[float], rain_stop: float) -> Image.Image:
    ci = max(0, min(len(cues) - 1, bisect.bisect_right(cue_starts, t) - 1))
    cue = cues[ci]
    line = int(cue['index'])
    scene = SCENES[line - 1]
    wt = wt_all[line]
    frac = min(0.999, max(0.0, (t - cue['start']) / max(0.01, cue['end'] - cue['start'])))

    im = background(t, cue, line, wt, frac)
    clip, mode, idx = tv_at(scene, cue, t, frac)
    if clip == 'dark':
        d = ImageDraw.Draw(im)
        d.rectangle(SCREEN, fill=(10, 17, 24))
        d.line((SCREEN[0] + 30, SCREEN[3] - 30, SCREEN[2] - 30, SCREEN[1] + 30),
               fill=(24, 38, 50), width=2)
    else:
        im.paste(tv_frame(clip, idx), (SCREEN[0], SCREEN[1]))
    # 开机渐亮与 v3 一致：半透明遮罩，不是刷纯黑，也不画控件
    if line <= 2:
        k = min(1.0, max(0.0, (t - cue_starts[0]) / 1.2))
        if k < 1:
            veil = Image.new('RGBA', (SW, SH), (8, 14, 20, int(205 * (1 - k))))
            im.paste(veil, (SCREEN[0], SCREEN[1]), veil)
    # 电视矩形先存一份：主画面的一切绘制与切镜特效都不许改到它
    tv_pixels = im.crop(TV_OUTER)
    im = mood_grade(im, t, scene, wt)
    draw_stage(im, t, line, frac, wt, inks, cue)
    im.paste(tv_pixels, (TV_OUTER[0], TV_OUTER[1]))
    im = effects(im, scene, frac, t)
    im.paste(tv_pixels, (TV_OUTER[0], TV_OUTER[1]))
    # 字幕在最后绘制，固定位置，不随任何变换
    si = max(0, min(len(screens) - 1, bisect.bisect_right(scr_starts, t) - 1))
    if scr_starts[si] <= t < scr_ends[si]:
        layer = subtitle_layer(screens[si]['text'])
        im.paste(layer, (0, SUB_Y), layer)
    return im


S7.bind(globals())


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
    assert len(SCENES) == 24 and set(WORD_TRIGGERS) == set(range(1, 25))
    assert set(S7.SCRIPT_SCENES) == set(range(1, 25)) and set(S7.SCRIPT_INTERACTIONS) == set(range(1, 25))
    cues = alignment['cues']
    screens = subs['screens']
    source_duration = float(alignment['source_duration_seconds'])
    out_duration = round(float(cues[-1]['end']) + TAIL_PAD, 3)
    total_frames = math.ceil(out_duration * FPS)
    load_frame_index()
    wt_all = word_times(cues)
    inks = ink_times(wt_all)
    rain_stop = wt_all[22]['不拍雨']

    cue_starts = [c['start'] for c in cues]
    scr_starts = [s['start'] for s in screens]
    scr_ends = [s['end'] for s in screens]

    def frame(t: float) -> Image.Image:
        return render_at(t, cues, screens, cue_starts, scr_starts, scr_ends, wt_all, inks, rain_stop)

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
