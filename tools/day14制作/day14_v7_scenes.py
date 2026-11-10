#!/usr/bin/env python3
"""Day14 视频 v7：参照项目 MV 的「定点站位 + 词点短动作 + 硬切」重做主画面。

用户 2026-11-09 第七次反馈：「现在的画面还是很奇怪，请查看为什么人一直乱走，
不是这个样的啊，你看看别人的 mv……是让你参照下项目的 mv 做啊」。
回看仓库里的 `番外MV/把回忆拼好给你/成片/把回忆拼好给你_v12剧情动作版.mp4`、
`样片/v13_整片渲染_待审.mp4`、`番外MV/我怀疑大禹治水/样片/Remotion_动态引擎重做_待审.mp4`
与根目录 `达拉崩吧.mp4` 抽帧后，确认项目 MV 的共同语法是：
  · 大幅面、浅色调、扁平舞台；角色按构图站在固定点位；
  · 一句/一镜一次切景，靠局部手势、道具、镜头与粒子推进，不做全场横向巡游；
  · 主角居中，1–2 位对手戏角色在左右定点，动作成形后停留。
v6 把 2–3 人整句 x0→x1→x2 横穿画面，被判「人一直乱走」。v7 改为：
  · 24 个手绘剧本场景仍保留，但改成项目 MV 式浅色扁平舞台；
  · 每位角色只有一个固定站位；开场 0.35s 内短距滑入，之后不横向游走；
  · 实测 `chars_timed` 词点切到动作图集，配 ≤70px 的局部位移/抬手，动作播完停在结果位；
  · 不复制项目 MV 的真帧，只借构图、切镜、定点动作语法；番外真帧仍只在右上电视。

`bind(globals())` 由 `render_day14_video.py` 在定义完工具函数后调用。
"""
from __future__ import annotations

import math
import random
import zlib

import numpy as np
from PIL import Image, ImageDraw

CTX: dict = {}


def bind(ctx: dict) -> None:
    CTX.update(ctx)


# v7 只取 CAST 里的 idle 定点帧与实测词点 action 图集，不注册横向步态图集；
# 项目 MV 的「走两步后停稳」在开场 0.35s 短距滑入里表达，之后不再步态循环。


def A(who, x, trigger, note='', act=None, dx=0, dy=0, z=1,
      charred=False, scale=None, phase=0.0, flip=None):
    """项目 MV 式定点：一个固定 x，词点切短动作，最多局部 dx/dy，不横向巡游。"""
    return dict(who=who, x=x, trigger=trigger, note=note, act=act,
                dx=dx, dy=dy, z=z, charred=charred, scale=scale,
                phase=phase, flip=flip)


STAGE_SCALE = {
    '本鲸': 0.72, '龙娘': 0.68, '豆包': 0.68, '大小姐': 0.68,
    'Kimi': 0.68, 'Gemini': 0.68, '智谱': 0.68, '千问': 0.68,
}

# 每镜 2–3 位本名：固定点位 + 词点短动作 + 结果停留，按项目 MV 的构图排位。
SCRIPT_INTERACTIONS = {
    1: [A('龙娘', 1240, '昨天', '龙娘在右定点掠火，不横穿全场', act='gpt_sweep', dx=-55, dy=45, z=2),
        A('本鲸', 760, '黑炭', '本鲸居中低头看焦痕，只做一次收肩', act='whale_crouch', charred=True, z=3),
        A('豆包', 420, '那条鱼', '豆包在左定点递布，不追着跑', act='doubao_comfort', dx=35, z=2)],
    2: [A('本鲸', 760, '搬', '本鲸居中把电视箱推正，机身仍锁定', act='whale_gather', dx=25, z=3),
        A('Gemini', 1180, '重看', 'Gemini 在右定点递线缆', act='gemini_star', dx=-30, z=2),
        A('智谱', 420, '片子', '智谱在左定点扶桌脚', act='zai_reach', dx=25, z=2)],
    3: [A('本鲸', 760, '翻开', '本鲸居中翻开红皮书', act='whale_read', z=3),
        A('大小姐', 1180, '长出', '大小姐在右定点立起纸板城堡', act='claude_place', dx=-30, z=2),
        A('Gemini', 420, '城堡', 'Gemini 在左定点拉开侧幕', act='gemini_flower', dx=20, z=1)],
    4: [A('龙娘', 1240, '俯冲', '龙娘在右上定点俯冲，不飞越全屏', act='gpt_push', dy=85, z=3),
        A('豆包', 760, '抓走', '豆包居中一次让位，表示被带向右侧', act='doubao_step', dx=55, z=2),
        A('本鲸', 420, '暗', '本鲸在左定点侧身躲柱后', act='whale_point', dx=15, z=2)],
    5: [A('本鲸', 760, '应征', '本鲸居中接下应征卷轴', act='whale_gather', z=3),
        A('Gemini', 1180, '送', 'Gemini 在右定点递缰绳', act='gemini_star', dx=-35, z=2),
        A('智谱', 420, '上马', '智谱在左定点扶马蹬', act='zai_clock', dx=20, z=2)],
    6: [A('千问', 420, '风车村', '千问在左定点递钥匙', act='qwen_reach', dx=20, z=2),
        A('本鲸', 760, '宝箱', '本鲸居中逐只开箱，站位不漂移', act='whale_gather', z=3),
        A('豆包', 1180, '山洞口', '豆包在右洞口定点回身', act='doubao_lantern', dx=-20, z=1)],
    7: [A('大小姐', 1180, '追着问', '大小姐在右定点倾身追问，不绕场追人', act='claude_letter', dx=-45, z=2),
        A('本鲸', 760, '塞不进', '本鲸居中把长名字条举到框前', act='whale_letter', z=3),
        A('豆包', 420, '名字', '豆包在左定点扶住木框', act='doubao_step', dx=15, z=1)],
    8: [A('Kimi', 420, '月光', 'Kimi 在左定点把月灯举高', act='kimi_lantern', dy=30, z=2),
        A('豆包', 1180, '小心后面', '豆包在右笼中回头喊，不横移', act='doubao_lantern', dx=-20, z=2),
        A('本鲸', 760, '笼子', '本鲸居中听见喊声后侧身', act='whale_reach', dx=15, z=3)],
    9: [A('龙娘', 1180, '一口火', '龙娘在右定点喷火', act='gpt_sweep', dy=60, z=3),
        A('本鲸', 760, '黑炭', '本鲸居中退半步看焦痕', act='whale_crouch', dx=-25, charred=True, z=3),
        A('大小姐', 420, '石碑', '大小姐在左定点扶落石碑', act='claude_place', dx=20, z=2)],
    10: [A('本鲸', 760, '摸摸', '本鲸居中摸自己的焦痕', act='whale_wipe', charred=True, z=3),
         A('豆包', 1180, '焦的', '豆包在右定点把布收住', act='doubao_comfort', dx=-25, z=2),
         A('龙娘', 420, '摸摸', '龙娘在左定点摊手', act='gpt_think', z=1)],
    11: [A('本鲸', 760, '谁', '本鲸居中看空白册', act='whale_read', z=3),
         A('大小姐', 1180, '一个字都没有', '大小姐在右定点摊开空册', act='claude_collect', dx=-25, z=2),
         A('Kimi', 420, '谁', 'Kimi 在左定点悬笔不落', act='kimi_stargaze', z=2)],
    12: [A('本鲸', 760, '暂停', '本鲸居中按住旋钮', act='whale_reach', z=3),
         A('Gemini', 1180, '倒回去', 'Gemini 在右定点把亮框倒回一格', act='gemini_star', dx=-35, z=2),
         A('智谱', 420, '一段一段', '智谱在左定点扶住轮盘', act='zai_clock', dx=15, z=2)],
    13: [A('本鲸', 760, '翻书', '本鲸居中翻启动台上的红皮书', act='whale_read', z=3),
         A('龙娘', 1180, '开始', '龙娘在右定点摊手', act='gpt_think', dx=-20, z=2),
         A('大小姐', 420, '没写', '大小姐在左定点亮出空册', act='claude_letter', dx=20, z=2)],
    14: [A('龙娘', 1180, '抓走', '龙娘在右台定点重演抓走', act='gpt_push', dy=55, z=3),
         A('豆包', 420, '龙娘', '豆包在左台定点被带向右侧', act='doubao_step', dx=45, z=2),
         A('本鲸', 760, '记一行', '本鲸居中落第一行墨', act='whale_read', z=3)],
    15: [A('大小姐', 420, '大小姐', '大小姐在左名牌旁定点', act='claude_letter', z=2),
         A('豆包', 1180, '小心后面', '豆包在右名牌旁定点回头', act='doubao_lantern', z=2),
         A('本鲸', 760, '豆包', '本鲸居中依次点两张名牌', act='whale_point', z=3)],
    16: [A('Kimi', 420, '举', 'Kimi 在左定点举月灯', act='kimi_lantern', dy=28, z=2),
         A('本鲸', 760, '月光', '本鲸居中侧身让光', act='whale_read', dx=15, z=3),
         A('Gemini', 1180, '没人提', 'Gemini 在右定点注意到空行', act='gemini_flower', dx=-15, z=2)],
    17: [A('本鲸', 760, '全演过了', '本鲸居中拉开空白纸', act='whale_gather', z=3),
         A('龙娘', 1180, '全演过了', '龙娘在右定点重演一次俯冲', act='gpt_push', dy=40, z=2),
         A('大小姐', 420, '写下来', '大小姐在左定点指空行', act='claude_collect', dx=20, z=2)],
    18: [A('本鲸', 760, '不用问人', '本鲸居中俯身看灯箱', act='whale_camera', z=3),
         A('Gemini', 1180, '一帧一帧', 'Gemini 在右定点挪亮框', act='gemini_star', dx=-30, z=2),
         A('智谱', 420, '一帧一帧', '智谱在左定点扶灯箱', act='zai_reach', dx=15, z=2)],
    19: [A('本鲸', 760, '翻过来', '本鲸居中把纸翻面', act='whale_letter', z=3),
         A('千问', 1180, '片子顺序', '千问在右定点递下一页', act='qwen_reach', dx=-25, z=2),
         A('豆包', 420, '一段写一行', '豆包在左定点按住纸角', act='doubao_step', dx=15, z=2)],
    20: [A('本鲸', 760, '不替谁顶', '本鲸居中在两行间留空档', act='whale_read', z=3),
         A('大小姐', 1180, '并成一段', '大小姐在右定点收回连线', act='claude_letter', dx=-30, z=2),
         A('智谱', 420, '并成一段', '智谱在左定点扣下夹子', act='zai_reach', dx=15, z=2)],
    21: [A('本鲸', 760, '烤焦', '本鲸居中抽出焦纸', act='whale_letter', charred=True, z=3),
         A('豆包', 1180, '单独夹起来', '豆包在右定点拿夹子', act='doubao_comfort', dx=-25, z=2),
         A('龙娘', 420, '待补', '龙娘在左定点收火', act='gpt_sweep', dx=15, z=1)],
    22: [A('本鲸', 760, '关掉', '本鲸居中按门厅开关', act='whale_reach', z=3),
         A('智谱', 1180, '收进抽屉', '智谱在右定点收伞', act='zai_reach', dx=-25, z=2),
         A('豆包', 420, '不拍雨', '豆包在左定点合伞', act='doubao_umbrella', dx=15, z=2)],
    23: [A('千问', 1180, '白饭', '千问在右定点放下饭盆', act='qwen_reach', dx=-25, z=2),
         A('本鲸', 760, '不改', '本鲸居中看那行字', act='whale_read', z=3),
         A('大小姐', 420, '不改', '大小姐在左定点收笔', act='claude_collect', z=2)],
    24: [A('大小姐', 420, '下一集', '大小姐在左定点扶住长框', act='claude_letter', z=2),
         A('本鲸', 760, '一个字一个字', '本鲸居中把字块送回框', act='whale_point', z=3),
         A('豆包', 1180, '塞回框', '豆包在右定点合上框口', act='doubao_step', dx=-20, z=2)],
}


# 24 个不同场景：主画面按剧本切场，不复制 MV 画面、不靠调色冒充换景。
SCRIPT_SCENES = {
    1: dict(name='焦痕检查角', layout='charred_corner', top=(54, 22, 30), bot=(118, 58, 48), accent=(232, 112, 72), floor=(112, 62, 56), move='static'),
    2: dict(name='晨间搬运过道', layout='workroom', top=(22, 54, 72), bot=(58, 122, 142), accent=(246, 206, 116), floor=(62, 128, 146), move='pan_r'),
    3: dict(name='红皮书舞台', layout='book_stage', top=(86, 28, 46), bot=(168, 70, 86), accent=(240, 218, 154), floor=(156, 92, 104), move='push'),
    4: dict(name='夜色城堡走廊', layout='castle_night', top=(22, 18, 52), bot=(62, 44, 96), accent=(154, 118, 202), floor=(70, 58, 108), move='pan_l'),
    5: dict(name='城门送别口', layout='gate', top=(46, 76, 96), bot=(146, 166, 134), accent=(242, 196, 104), floor=(122, 142, 118), move='pull'),
    6: dict(name='风车村到山洞口', layout='village', top=(58, 104, 118), bot=(178, 180, 116), accent=(238, 202, 112), floor=(128, 146, 106), move='pan_r'),
    7: dict(name='王座厅名字框', layout='throne', top=(72, 42, 88), bot=(166, 108, 132), accent=(238, 196, 98), floor=(132, 94, 104), move='push'),
    8: dict(name='山洞口金笼', layout='cave', top=(12, 26, 46), bot=(34, 62, 84), accent=(226, 238, 188), floor=(44, 74, 92), move='tilt_up'),
    9: dict(name='龙焰石碑终局', layout='finale', top=(72, 20, 26), bot=(166, 64, 44), accent=(246, 132, 58), floor=(126, 58, 46), move='shake'),
    10: dict(name='后台圆镜间', layout='dressing', top=(38, 62, 76), bot=(112, 142, 156), accent=(216, 232, 226), floor=(92, 128, 142), move='static'),
    11: dict(name='空白册档案桌', layout='archive', top=(28, 44, 62), bot=(76, 98, 112), accent=(232, 230, 206), floor=(68, 92, 106), move='pull'),
    12: dict(name='暂停倒带操作台', layout='rewind', top=(18, 42, 58), bot=(52, 94, 108), accent=(126, 206, 220), floor=(48, 92, 106), move='pan_l'),
    13: dict(name='红皮书启动台', layout='start_podium', top=(64, 28, 52), bot=(148, 66, 84), accent=(246, 214, 132), floor=(128, 70, 84), move='push'),
    14: dict(name='重演与记录双台', layout='split_stage', top=(34, 36, 66), bot=(82, 78, 112), accent=(204, 186, 224), floor=(74, 76, 108), move='static'),
    15: dict(name='名牌对照长廊', layout='placard_hall', top=(42, 52, 82), bot=(112, 118, 148), accent=(238, 206, 120), floor=(88, 104, 132), move='pan_r'),
    16: dict(name='月灯长廊', layout='lantern_hall', top=(16, 30, 54), bot=(48, 64, 94), accent=(236, 240, 196), floor=(52, 72, 100), move='pan_r'),
    17: dict(name='胶片墙放映室', layout='film_wall', top=(24, 30, 42), bot=(62, 68, 78), accent=(226, 204, 124), floor=(56, 64, 72), move='pull'),
    18: dict(name='逐帧灯箱台', layout='lightbox', top=(20, 48, 62), bot=(72, 118, 126), accent=(210, 240, 236), floor=(62, 112, 120), move='push'),
    19: dict(name='翻纸长桌', layout='paper_table', top=(56, 48, 42), bot=(132, 112, 88), accent=(240, 232, 202), floor=(116, 100, 80), move='pan_l'),
    20: dict(name='分段夹子桌', layout='clip_table', top=(38, 52, 58), bot=(92, 112, 112), accent=(196, 212, 206), floor=(82, 104, 104), move='static'),
    21: dict(name='焦纸抽屉柜', layout='cabinet', top=(44, 34, 34), bot=(104, 76, 66), accent=(218, 196, 154), floor=(94, 72, 64), move='push'),
    22: dict(name='收伞门厅', layout='hallway', top=(30, 52, 68), bot=(82, 110, 126), accent=(186, 110, 132), floor=(76, 106, 120), move='pan_r'),
    23: dict(name='白饭桌', layout='dinner', top=(62, 44, 38), bot=(148, 112, 76), accent=(246, 232, 192), floor=(128, 100, 72), move='static'),
    24: dict(name='昵称框修补台', layout='name_bench', top=(48, 38, 62), bot=(122, 86, 126), accent=(244, 212, 126), floor=(106, 80, 112), move='push'),
}


# 项目 MV 式浅色调：v6 的深暗舞台色不是参考片的语法；逐镜保留色相区分但整体压到粉彩。
PASTEL_OVERRIDE = {
    1: dict(top=(214,186,180), bot=(238,210,198), accent=(214,112,82), floor=(198,142,124)),
    2: dict(top=(186,220,232), bot=(214,238,238), accent=(238,198,112), floor=(136,190,202)),
    3: dict(top=(226,186,196), bot=(246,214,218), accent=(232,176,112), floor=(206,142,152)),
    4: dict(top=(176,172,212), bot=(204,190,220), accent=(142,110,182), floor=(150,132,180)),
    5: dict(top=(186,220,218), bot=(220,234,204), accent=(238,196,104), floor=(166,198,160)),
    6: dict(top=(186,220,214), bot=(232,226,174), accent=(226,186,102), floor=(176,198,144)),
    7: dict(top=(212,190,216), bot=(236,210,222), accent=(238,196,98), floor=(190,150,170)),
    8: dict(top=(158,188,208), bot=(188,210,220), accent=(232,238,188), floor=(126,166,184)),
    9: dict(top=(226,182,172), bot=(244,206,184), accent=(238,132,72), floor=(206,138,112)),
    10: dict(top=(190,214,222), bot=(218,234,236), accent=(216,232,226), floor=(150,190,200)),
    11: dict(top=(190,204,216), bot=(214,224,230), accent=(232,230,206), floor=(146,174,188)),
    12: dict(top=(174,210,220), bot=(202,226,230), accent=(126,206,220), floor=(126,182,196)),
    13: dict(top=(216,184,200), bot=(238,208,214), accent=(246,214,132), floor=(196,142,158)),
    14: dict(top=(190,190,216), bot=(214,208,228), accent=(204,186,224), floor=(150,146,184)),
    15: dict(top=(196,208,226), bot=(220,226,238), accent=(238,206,120), floor=(158,178,206)),
    16: dict(top=(166,186,210), bot=(196,208,226), accent=(236,240,196), floor=(128,156,186)),
    17: dict(top=(190,196,204), bot=(214,218,222), accent=(226,204,124), floor=(146,154,160)),
    18: dict(top=(178,216,220), bot=(208,234,232), accent=(210,240,236), floor=(132,192,196)),
    19: dict(top=(210,198,182), bot=(232,218,196), accent=(240,232,202), floor=(186,164,138)),
    20: dict(top=(188,210,210), bot=(214,228,224), accent=(196,212,206), floor=(148,182,180)),
    21: dict(top=(202,188,180), bot=(224,206,194), accent=(218,196,154), floor=(174,146,132)),
    22: dict(top=(180,206,218), bot=(210,226,232), accent=(186,110,132), floor=(136,176,192)),
    23: dict(top=(214,196,176), bot=(238,218,188), accent=(246,232,192), floor=(196,164,128)),
    24: dict(top=(198,186,212), bot=(222,206,228), accent=(244,212,126), floor=(166,140,182)),
}


def _w() -> int:
    return CTX['W']


def _h() -> int:
    return CTX['H']


def _prog(t: float, wt: dict, word: str, lead: float = 0.18, dur: float = 0.9) -> float:
    return CTX['progress'](t, wt, word, lead, dur)


def _ease(x: float) -> float:
    x = min(1.0, max(0.0, x))
    return x * x * (3 - 2 * x)


def _lerp(a: float, b: float, u: float) -> float:
    return a + (b - a) * u


def _base_image(info: dict, t: float) -> Image.Image:
    W, H = _w(), _h()
    yy = np.arange(H, dtype=np.float32)[:, None]
    p = yy / H
    top = np.array(info['top'], np.float32)
    bot = np.array(info['bot'], np.float32)
    grad = top[None, None, :] * (1 - p[:, :, None]) + bot[None, None, :] * p[:, :, None]
    # 轻微横向光带，给每个场景一点连续运动，不是 MV 真帧
    band = (10 * np.sin(yy / 90 + t * 0.45))[:, :, None]
    grad = np.clip(grad + band, 0, 255)
    im = Image.fromarray(np.repeat(grad.astype(np.uint8), W, axis=1), 'RGB')
    return CTX['top_glow'](im, t)


def _columns(d, xs, top, bottom, color, width=34):
    for x in xs:
        d.rounded_rectangle((x - width // 2, top, x + width // 2, bottom), radius=8,
                            fill=color, outline=(24, 30, 40), width=3)
        d.rectangle((x - width // 2 - 8, top, x + width // 2 + 8, top + 18), fill=(64, 70, 84), outline=(24, 30, 40), width=2)


def _arch(d, box, fill, outline, top_ratio=0.42):
    x0, y0, x1, y1 = box
    d.rectangle((x0, y0 + (y1 - y0) * top_ratio, x1, y1), fill=fill, outline=outline, width=5)
    d.pieslice((x0, y0, x1, y0 + (y1 - y0) * top_ratio * 2), 180, 360, fill=fill, outline=outline, width=5)
    d.line((x0, y1, x1, y1), fill=outline, width=5)


def _window(d, da, cx, cy, r, color, t):
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=color, outline=(34, 44, 58), width=6)
    da.ellipse((cx - r + 10, cy - r + 10, cx + r - 10, cy + r - 10), fill=(126, 196, 214, 40))
    for k in range(3):
        a = t * 0.35 + k * 2.1
        da.line((cx, cy, cx + (r - 16) * math.cos(a), cy + (r - 16) * math.sin(a)),
                fill=(238, 246, 232, 70), width=3)


def _book(d, cx, cy, p, accent):
    d.rounded_rectangle((cx - 150, cy, cx + 150, cy + 54), radius=8,
                        fill=(142, 38, 54), outline=(70, 22, 34), width=4)
    d.line((cx, cy + 4, cx, cy + 50), fill=(82, 26, 38), width=5)
    turn = int(120 * p)
    d.polygon([(cx, cy + 4), (cx + turn, cy - 28), (cx + 145 + turn, cy - 8), (cx + 145, cy + 16)],
              fill=(246, 238, 214), outline=(176, 158, 126))
    for i in range(3):
        h = int((62 + i * 28) * p)
        if h > 3:
            x = cx - 90 + i * 70
            d.rectangle((x, cy - h, x + 34, cy), fill=accent, outline=(92, 64, 72), width=2)
            d.polygon([(x - 4, cy - h), (x + 17, cy - h - 24 * p), (x + 38, cy - h)],
                      fill=(150, 82, 104), outline=(92, 64, 72))


def _castle(d, cx, cy, scale, color):
    s = scale
    for i, dx in enumerate((-170, -60, 60, 170)):
        x = cx + dx * s
        h = (150 + (i % 2) * 54) * s
        d.rectangle((x - 34 * s, cy - h, x + 34 * s, cy), fill=color, outline=(44, 34, 56), width=3)
        d.polygon([(x - 42 * s, cy - h), (x, cy - h - 48 * s), (x + 42 * s, cy - h)],
                  fill=(132, 74, 118), outline=(44, 34, 56))
        d.rectangle((x - 8 * s, cy - h + 44 * s, x + 8 * s, cy - h + 76 * s), fill=(246, 216, 132))
    d.rectangle((cx - 210 * s, cy - 100 * s, cx + 210 * s, cy), fill=color, outline=(44, 34, 56), width=4)


def _windmill(d, cx, cy, t, color):
    d.polygon([(cx - 42, cy), (cx + 42, cy), (cx + 26, cy - 170), (cx - 26, cy - 170)],
              fill=color, outline=(78, 68, 52), width=3)
    for i in range(4):
        a = t * 1.3 + i * math.pi / 2
        d.line((cx, cy - 166, cx + 72 * math.cos(a), cy - 166 + 72 * math.sin(a)),
               fill=(232, 222, 184), width=9)
    d.ellipse((cx - 9, cy - 175, cx + 9, cy - 157), fill=(116, 92, 62))


def _chest(d, cx, cy, p, accent):
    d.rounded_rectangle((cx - 48, cy, cx + 48, cy + 52), radius=6,
                        fill=(122, 80, 46), outline=(62, 40, 26), width=3)
    lid = int(44 * p)
    d.polygon([(cx - 48, cy), (cx - 48, cy - lid), (cx + 48, cy - lid), (cx + 48, cy)],
              fill=(164, 112, 58), outline=(62, 40, 26))
    d.rectangle((cx - 8, cy + 10, cx + 8, cy + 32), fill=accent, outline=(92, 68, 36), width=2)


def _name_frame(d, cx, cy, p, accent):
    w = 340 + int(120 * p)
    d.rounded_rectangle((cx - w / 2, cy, cx + w / 2, cy + 112), radius=10,
                        fill=(188, 148, 92), outline=(86, 60, 38), width=6)
    d.rounded_rectangle((cx - w / 2 + 14, cy + 14, cx + w / 2 - 14, cy + 98), radius=6,
                        fill=(242, 232, 202), outline=(148, 116, 72), width=3)
    for i in range(7):
        d.line((cx - w / 2 + 34, cy + 28 + i * 10, cx + w / 2 - 34 - 16 * math.sin(i), cy + 28 + i * 10),
               fill=(102, 78, 58), width=3)


def _cave(d, da, box, color, t):
    x0, y0, x1, y1 = box
    d.ellipse((x0, y0, x1, y1), fill=color, outline=(22, 32, 44), width=8)
    for k in range(7):
        yy = y0 + 30 + k * 58
        da.arc((x0 + 20, yy - 30, x1 - 20, yy + 90), 190, 350, fill=(90, 112, 126, 80), width=5)
    for k in range(5):
        xx = x0 + 60 + k * (x1 - x0 - 120) / 4
        da.line((xx, y0 + 20, xx + 14 * math.sin(t + k), y0 + 95), fill=(120, 142, 154, 60), width=4)


def _lantern(d, da, cx, cy, p, color, t):
    for k in range(4):
        r = 40 + k * 28 + 6 * math.sin(t * 1.8)
        da.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(*color[:3], int(22 * p)))
    d.ellipse((cx - 22, cy - 28, cx + 22, cy + 16), fill=(244, 238, 194), outline=(186, 164, 96), width=3)
    d.line((cx, cy - 28, cx, cy - 70), fill=(120, 132, 142), width=4)
    for i in range(8):
        a = t * 0.5 + i * math.pi / 4
        da.line((cx + 32 * math.cos(a), cy + 32 * math.sin(a),
                 cx + 58 * math.cos(a), cy + 58 * math.sin(a)), fill=(*color[:3], int(120 * p)), width=3)


def _stone(d, cx, cy, p, color):
    h = int(210 * p)
    if h < 4:
        return
    d.polygon([(cx - 82, cy), (cx - 70, cy - h), (cx + 74, cy - h - 12),
               (cx + 88, cy)], fill=color, outline=(48, 42, 40), width=5)
    for k in range(3):
        d.line((cx - 50 + k * 40, cy - h + 28, cx - 38 + k * 40, cy - 18),
               fill=(86, 78, 72), width=3)


def _reel(d, da, cx, cy, r, t, color):
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(44, 58, 68), outline=color, width=6)
    for i in range(6):
        a = t * 0.9 + i * math.pi / 3
        d.ellipse((cx + r * 0.48 * math.cos(a) - 10, cy + r * 0.48 * math.sin(a) - 10,
                   cx + r * 0.48 * math.cos(a) + 10, cy + r * 0.48 * math.sin(a) + 10),
                  fill=(18, 30, 38), outline=color, width=2)
    da.ellipse((cx - 10, cy - 10, cx + 10, cy + 10), fill=(220, 220, 206, 180))


def _film_cells(d, da, x0, y0, w, h, p, accent, t):
    n = 5
    d.rounded_rectangle((x0 - 14, y0 - 14, x0 + n * (w + 12) + 2, y0 + h + 14),
                        radius=8, fill=(30, 40, 50), outline=(12, 22, 30), width=4)
    for i in range(n):
        x = x0 + i * (w + 12)
        d.rectangle((x, y0, x + w, y0 + h), fill=(54, 68, 78), outline=(16, 26, 34), width=3)
        for j in range(4):
            d.rectangle((x + 6, y0 + 6 + j * 14, x + 16, y0 + 13 + j * 14), fill=(18, 28, 36))
            d.rectangle((x + w - 16, y0 + 6 + j * 14, x + w - 6, y0 + 13 + j * 14), fill=(18, 28, 36))
        q = _ease(p * 1.4 - i * 0.18)
        if q > 0:
            da.rectangle((x + 20, y0 + 12, x + w - 20, y0 + h - 12),
                         fill=(*accent[:3], int(30 + 60 * q)))
            da.ellipse((x + w / 2 - 18, y0 + h / 2 - 18 + 5 * math.sin(t + i),
                        x + w / 2 + 18, y0 + h / 2 + 18 + 5 * math.sin(t + i)),
                       fill=(*accent[:3], int(90 * q)))


def _drawer(d, cx, cy, p, accent):
    d.rounded_rectangle((cx - 160, cy - 110, cx + 160, cy + 150), radius=10,
                        fill=(86, 66, 54), outline=(44, 34, 30), width=5)
    for k in range(3):
        y = cy - 80 + k * 78
        off = int(70 * p) if k == 1 else 0
        d.rounded_rectangle((cx - 140 + off, y, cx + 140 + off, y + 62), radius=6,
                            fill=(132, 102, 76), outline=(60, 44, 34), width=3)
        d.line((cx - 20 + off, y + 30, cx + 20 + off, y + 30), fill=accent, width=5)


def _umbrella_prop(d, cx, cy, p, accent):
    r = int(72 * (1 - 0.78 * p))
    d.arc((cx - r, cy - r - 70, cx + r, cy - 18), 185, 355, fill=accent, width=10)
    d.line((cx, cy - 20, cx - 14, cy + 170), fill=(82, 66, 86), width=8)


def _bowl(d, da, cx, cy, t, accent):
    d.ellipse((cx - 76, cy, cx + 76, cy + 64), fill=(232, 236, 222), outline=(166, 174, 160), width=4)
    d.ellipse((cx - 58, cy + 8, cx + 58, cy + 44), fill=(250, 250, 242))
    for j in range(3):
        pts = [(cx - 20 + j * 20 + int(8 * math.sin(t * 2 + j + y * 0.05)), cy - y)
               for y in range(0, 100, 12)]
        da.line(pts, fill=(238, 248, 244, 70 - j * 12), width=5)


def _glyph_blocks(d, cx, cy, p, accent):
    for i in range(9):
        k = _ease(p * 1.5 - i * 0.12)
        x = cx + 180 - 170 * k + i * 26
        y = cy + 120 - 70 * k
        if k > 0:
            d.rounded_rectangle((x, y, x + 26, y + 34), radius=3,
                                fill=accent, outline=(86, 62, 48), width=2)
            d.line((x + 6, y + 10, x + 20, y + 10), fill=(82, 64, 52), width=2)
            d.line((x + 13, y + 8, x + 13, y + 26), fill=(82, 64, 52), width=2)


def _layout(im, info, t, wt, frac):
    d = ImageDraw.Draw(im)
    da = ImageDraw.Draw(im, 'RGBA')
    lay = info['layout']
    ac = info['accent']
    W, H = _w(), _h()

    # 共通：项目 MV 的扁平天空语汇——大圆日/月、两片纸云；结构差异仍由各 layout 决定。
    da.ellipse((850, 105, 1070, 325), fill=(*ac, 42))
    for cx, cy, rx, ry in ((180, 150, 150, 62), (620, 120, 130, 52), (1180, 170, 170, 60)):
        da.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=(255, 255, 255, 44))
        da.ellipse((cx - rx + 35, cy - ry + 18, cx + rx - 35, cy + ry + 10), fill=(255, 255, 255, 28))

    # 共通：场景地面线以上的建筑感，靠不同结构而不是调色区分
    if lay == 'charred_corner':
        d.rounded_rectangle((70, 180, 520, 740), radius=18, fill=(76, 38, 38), outline=(34, 24, 28), width=6)
        _window(d, da, 800, 330, 150, (64, 74, 82), t)
        d.arc((560, 520, 1040, 800), 200, 340, fill=ac, width=10)
        for k in range(12):
            x = 220 + (k * 97) % 1180
            y = 300 + (k * 53) % 380
            da.ellipse((x, y, x + 5, y + 5), fill=(34, 28, 28, 110))
    elif lay == 'workroom':
        _columns(d, (220, 700, 1180, 1660), 120, 760, (58, 92, 106), 42)
        d.rectangle((0, 600, W, 760), fill=(72, 116, 128))
        d.rounded_rectangle((180, 500, 620, 720), radius=12, fill=(88, 130, 140), outline=(34, 62, 72), width=5)
        d.ellipse((220, 690, 270, 740), fill=(30, 44, 52)); d.ellipse((530, 690, 580, 740), fill=(30, 44, 52))
        d.rounded_rectangle((250, 430, 550, 510), radius=8, fill=(126, 150, 158), outline=(40, 64, 74), width=4)
        for k in range(3):
            da.arc((760 + k * 240, 520, 900 + k * 240, 660), 10, 300, fill=(*ac, 90), width=5)
    elif lay == 'book_stage':
        d.rectangle((0, 0, 260, 760), fill=(104, 28, 44)); d.rectangle((W - 260, 0, W, 760), fill=(104, 28, 44))
        for k in range(7):
            x = k * 46
            da.polygon([(x, 0), (x + 30, 0), (x + 70, 760), (x + 20, 760)], fill=(180, 54, 68, 90))
        d.rectangle((260, 120, W - 260, 760), fill=(128, 48, 66))
        _book(d, 780, 650, _prog(t, wt, '翻开'), ac)
        cp = _prog(t, wt, '长出')
        if cp > 0:
            _castle(d, 1180, 650, 0.55 + 0.45 * cp, (176, 108, 142))
    elif lay == 'castle_night':
        _castle(d, 960, 700, 1.25, (58, 44, 88))
        _columns(d, (160, 460, 1460, 1760), 180, 760, (42, 34, 68), 46)
        dp = _prog(t, wt, '暗')
        if dp > 0:
            veil = Image.new('RGBA', (W, 760), (8, 8, 24, int(110 * dp)))
            im.paste(veil, (0, 0), veil)
        for k in range(9):
            da.ellipse((140 + k * 210, 100 + 30 * math.sin(t + k), 158 + k * 210, 118 + 30 * math.sin(t + k)),
                       fill=(236, 226, 168, 70))
    elif lay == 'gate':
        _arch(d, (500, 130, 1420, 760), (122, 136, 112), (54, 68, 58))
        d.rectangle((0, 620, W, 760), fill=(122, 142, 118))
        for k in range(7):
            d.line((120 + k * 260, 640, 260 + k * 260, 760), fill=(86, 104, 86), width=4)
        # 木马：有腿有鬃，不是 UI 图标
        d.ellipse((980, 520, 1260, 660), fill=(116, 78, 52), outline=(58, 40, 30), width=5)
        d.polygon([(980, 540), (920, 470), (1000, 490)], fill=(116, 78, 52), outline=(58, 40, 30))
        for x in (1020, 1120, 1210):
            d.line((x, 630, x - 12, 740), fill=(82, 54, 36), width=12)
        d.line((1250, 560, 1320, 520), fill=(82, 54, 36), width=10)
        d.polygon([(620, 160), (620, 420), (740, 360)], fill=ac, outline=(102, 78, 44), width=3)
    elif lay == 'village':
        _windmill(d, 360, 700, t, (172, 154, 116)); _windmill(d, 1500, 700, t + 1.2, (160, 146, 112))
        for k, x in enumerate((620, 900, 1180)):
            _chest(d, x, 690, max(0.0, _prog(t, wt, '宝箱', 0.1, 1.4) * 1.4 - k * 0.35), ac)
        _arch(d, (1320, 380, 1840, 760), (44, 58, 66), (24, 34, 40))
        da.ellipse((1380, 430, 1780, 760), fill=(12, 18, 26, 110))
        for k in range(6):
            da.line((100 + k * 300, 420, 180 + k * 300, 760), fill=(220, 226, 168, 30), width=8)
    elif lay == 'throne':
        _columns(d, (220, 560, 1360, 1700), 100, 760, (104, 74, 98), 48)
        d.rounded_rectangle((760, 240, 1160, 660), radius=18, fill=(128, 82, 106), outline=(58, 38, 56), width=6)
        d.polygon([(760, 240), (960, 120), (1160, 240)], fill=ac, outline=(92, 66, 48))
        _name_frame(d, 960, 640, _prog(t, wt, '塞不进'), (238, 196, 98))
    elif lay == 'cave':
        _cave(d, da, (260, 180, 1660, 760), (26, 44, 62), t)
        _lantern(d, da, 760, 380, _prog(t, wt, '月光'), (226, 238, 188), t)
        d.arc((1080, 430, 1380, 620), 180, 360, fill=(188, 160, 88), width=7)
        d.rectangle((1080, 540, 1380, 760), outline=(188, 160, 88), width=7)
        for x in range(1100, 1380, 42):
            da.line((x, 545, x + 10, 755), fill=(255, 246, 200, 80), width=3)
    elif lay == 'finale':
        for k in range(6):
            x = 80 + k * 330
            d.polygon([(x, 760), (x + 90, 470 - k % 2 * 60), (x + 210, 760)],
                      fill=(78, 32, 30), outline=(36, 22, 24), width=4)
        _stone(d, 1120, 740, _prog(t, wt, '石碑'), (112, 96, 88))
        fp = _prog(t, wt, '一口火')
        if fp > 0:
            for k in range(4):
                x = 560 + k * 120
                da.polygon([(x - 34, 740), (x + 34, 740), (x + 12 * math.sin(t * 7 + k), 740 - 220 * fp)],
                           fill=(246, 116 + k * 20, 46, int(150 * fp)))
    elif lay == 'dressing':
        _window(d, da, 760, 360, 220, (86, 118, 130), t)
        d.rounded_rectangle((120, 200, 420, 740), radius=16, fill=(64, 92, 104), outline=(32, 48, 58), width=5)
        for k in range(4):
            d.line((140, 300 + k * 100, 400, 300 + k * 100), fill=(104, 138, 148), width=5)
        d.ellipse((520, 670, 760, 740), fill=(92, 112, 120), outline=(40, 58, 66), width=4)
        d.line((640, 740, 640, 860), fill=(64, 82, 92), width=12)
    elif lay == 'archive':
        for x in (120, 420, 1480, 1780):
            d.rounded_rectangle((x - 90, 160, x + 90, 720), radius=10,
                                fill=(54, 70, 82), outline=(28, 40, 50), width=4)
            for k in range(6):
                col = [(176, 92, 96), (198, 156, 88), (92, 138, 172), (128, 168, 132)][k % 4]
                d.rounded_rectangle((x - 70, 200 + k * 80, x + 70, 264 + k * 80), radius=3, fill=col)
        d.rounded_rectangle((580, 580, 1340, 760), radius=12, fill=(112, 96, 78), outline=(54, 44, 36), width=5)
        d.rounded_rectangle((720, 610, 1200, 740), radius=6, fill=(238, 234, 214), outline=(160, 150, 128), width=3)
        _lantern(d, da, 960, 220, 0.9, (246, 232, 176), t)
    elif lay == 'rewind':
        _reel(d, da, 420, 380, 170, t, (126, 206, 220))
        _reel(d, da, 1500, 380, 170, -t * 0.8, (126, 206, 220))
        d.line((420, 380, 1500, 380), fill=(58, 84, 94), width=18)
        d.rounded_rectangle((620, 600, 1300, 760), radius=12, fill=(56, 78, 88), outline=(26, 40, 48), width=5)
        d.ellipse((900, 640, 1020, 730), fill=(44, 60, 70), outline=(150, 178, 188), width=5)
        _film_cells(d, da, 640, 650, 110, 62, _prog(t, wt, '倒回去'), ac, t)
    elif lay == 'start_podium':
        d.rectangle((0, 0, 300, 760), fill=(92, 34, 56)); d.rectangle((W - 300, 0, W, 760), fill=(92, 34, 56))
        d.rounded_rectangle((600, 420, 1320, 760), radius=14, fill=(128, 62, 78), outline=(58, 30, 42), width=6)
        _book(d, 960, 560, _prog(t, wt, '开始'), ac)
        d.line((1320, 560, 1460, 460), fill=(96, 82, 66), width=10)
        d.ellipse((1440, 430, 1500, 490), fill=ac, outline=(92, 68, 44), width=4)
    elif lay == 'split_stage':
        d.rectangle((0, 0, 920, 760), fill=(44, 46, 76)); d.rectangle((920, 0, W, 760), fill=(70, 64, 100))
        d.line((920, 0, 920, 760), fill=(22, 24, 42), width=12)
        d.rounded_rectangle((120, 540, 760, 760), radius=10, fill=(92, 80, 68), outline=(44, 38, 34), width=5)
        d.rounded_rectangle((200, 570, 680, 730), radius=6, fill=(236, 232, 210), outline=(150, 140, 120), width=3)
        _arch(d, (1160, 220, 1800, 760), (90, 76, 118), (40, 34, 60))
    elif lay == 'placard_hall':
        _columns(d, (180, 620, 1300, 1740), 100, 760, (76, 86, 112), 44)
        for x, col in ((620, (238, 196, 88)), (1300, (196, 96, 120))):
            d.line((x, 360, x, 740), fill=(96, 82, 64), width=12)
            d.rounded_rectangle((x - 170, 400, x + 170, 540), radius=8,
                                fill=(232, 220, 188), outline=(112, 88, 58), width=5)
            d.polygon([(x - 40, 400), (x, 360), (x + 40, 400)], fill=col)
            d.line((x - 120, 450, x + 100, 450), fill=(96, 78, 58), width=4)
            d.line((x - 120, 485, x + 60, 485), fill=(120, 100, 78), width=3)
    elif lay == 'lantern_hall':
        _columns(d, (200, 600, 1000, 1400, 1740), 80, 760, (36, 48, 72), 46)
        for k, x in enumerate((380, 820, 1240, 1620)):
            _lantern(d, da, x, 260, 0.75 + 0.25 * math.sin(t + k), (226, 238, 188), t)
        d.polygon([(0, 760), (W, 760), (W - 260, 430), (260, 430)], fill=(34, 46, 68))
        da.ellipse((620, 280, 1300, 760), fill=(226, 238, 188, 24))
    elif lay == 'film_wall':
        for r in range(3):
            for c in range(6):
                x, y = 120 + c * 290, 120 + r * 190
                d.rounded_rectangle((x, y, x + 220, y + 130), radius=8,
                                    fill=(46, 54, 64), outline=(18, 26, 34), width=4)
                for j in range(4):
                    d.rectangle((x + 8, y + 10 + j * 30, x + 20, y + 22 + j * 30), fill=(20, 28, 36))
                    d.rectangle((x + 200, y + 10 + j * 30, x + 212, y + 22 + j * 30), fill=(20, 28, 36))
        d.rounded_rectangle((560, 650, 1360, 760), radius=10, fill=(78, 72, 62), outline=(38, 34, 30), width=5)
        d.rounded_rectangle((700, 670, 1220, 744), radius=5, fill=(238, 232, 210), outline=(150, 140, 120), width=3)
    elif lay == 'lightbox':
        d.rounded_rectangle((240, 260, 1680, 740), radius=18, fill=(82, 136, 142), outline=(36, 74, 82), width=8)
        da.rounded_rectangle((280, 300, 1640, 700), radius=12, fill=(210, 240, 236, 90))
        _film_cells(d, da, 420, 420, 190, 100, _prog(t, wt, '一帧一帧'), ac, t)
        d.ellipse((1320, 520, 1460, 660), outline=(236, 246, 232), width=8)
        d.line((1440, 640, 1560, 740), fill=(236, 246, 232), width=12)
    elif lay == 'paper_table':
        d.rounded_rectangle((100, 470, 1820, 760), radius=16, fill=(132, 102, 76), outline=(66, 48, 36), width=6)
        for k in range(5):
            x = 260 + k * 340
            d.rounded_rectangle((x, 500, x + 230, 700), radius=5,
                                fill=(238, 232, 206), outline=(160, 146, 118), width=3)
            for j in range(4):
                d.line((x + 24, 540 + j * 34, x + 190, 540 + j * 34), fill=(128, 112, 92), width=2)
        _lantern(d, da, 960, 210, 0.9, (246, 232, 176), t)
    elif lay == 'clip_table':
        d.rounded_rectangle((160, 460, 1760, 760), radius=14, fill=(74, 98, 98), outline=(34, 50, 52), width=6)
        for k in range(2):
            y = 500 + k * 120
            d.rounded_rectangle((260, y, 1660, y + 86), radius=6,
                                fill=(232, 228, 208), outline=(142, 138, 122), width=3)
            d.line((300, y + 30, 1500, y + 30), fill=(92, 100, 98), width=3)
        for k, x in enumerate((420, 900, 1380)):
            d.arc((x - 24, 470, x + 24, 550), 0, 360, fill=ac, width=7)
            d.line((x, 492, x, 540), fill=ac, width=5)
    elif lay == 'cabinet':
        _drawer(d, 960, 420, _prog(t, wt, '单独夹起来'), ac)
        d.rounded_rectangle((240, 220, 620, 740), radius=12, fill=(72, 54, 46), outline=(34, 26, 24), width=5)
        for k in range(4):
            d.line((280, 300 + k * 100, 580, 300 + k * 100), fill=(108, 82, 64), width=6)
        da.polygon([(1280, 520), (1440, 480), (1420, 660), (1260, 640)], fill=(46, 40, 36, 220))
    elif lay == 'hallway':
        _arch(d, (640, 120, 1280, 760), (62, 88, 102), (30, 46, 56))
        d.rectangle((0, 600, W, 760), fill=(70, 100, 114))
        _drawer(d, 1660, 560, _prog(t, wt, '收进抽屉'), ac)
        _umbrella_prop(d, 360, 520, _prog(t, wt, '不拍雨'), ac)
        for k in range(14):
            x = 80 + (k * 137) % W
            y = 120 + (k * 83 + t * 90) % 560
            da.line((x, y, x - 12, y + 34), fill=(186, 214, 224, 40), width=2)
    elif lay == 'dinner':
        d.rounded_rectangle((260, 500, 1660, 760), radius=18, fill=(136, 96, 64), outline=(66, 46, 34), width=7)
        _bowl(d, da, 960, 590, t, ac)
        d.rounded_rectangle((420, 300, 620, 620), radius=12, fill=(92, 68, 50), outline=(48, 34, 28), width=4)
        d.rounded_rectangle((1300, 300, 1500, 620), radius=12, fill=(92, 68, 50), outline=(48, 34, 28), width=4)
        _lantern(d, da, 960, 180, 0.95, (246, 232, 176), t)
    elif lay == 'name_bench':
        d.rounded_rectangle((180, 480, 1740, 760), radius=16, fill=(92, 70, 96), outline=(44, 32, 50), width=6)
        _name_frame(d, 960, 540, _prog(t, wt, '一个字一个字'), ac)
        _glyph_blocks(d, 960, 540, _prog(t, wt, '塞回框'), ac)
        for k in range(3):
            d.ellipse((320 + k * 540, 300, 380 + k * 540, 360), fill=ac, outline=(92, 68, 48), width=3)

    # 场景内的小动势：光、尘、气泡，不用 MV 真帧
    rng = random.Random(700 + zlib.crc32(lay.encode('utf-8')) % 97)
    for k in range(16):
        x = rng.randint(30, W - 30)
        y = int((rng.randint(60, 700) + t * (7 + k % 4 * 4)) % 700)
        r = rng.randint(2, 5)
        da.ellipse((x - r, y - r, x + r, y + r), fill=(*ac, 34))


def draw_script_backdrop(t: float, line: int, wt: dict, frac: float) -> Image.Image:
    """项目 MV 式浅色舞台：背景硬切，角色随后在固定站位演出。"""
    info = dict(SCRIPT_SCENES[line])
    info.update(PASTEL_OVERRIDE.get(line, {}))
    im = _base_image(info, t)
    _layout(im, info, t, wt, frac)
    im = CTX['apply_sample_camera'](im, info.get('move', 'static'), frac, t)
    d = ImageDraw.Draw(im)
    W, H = _w(), _h()
    stage = tuple(min(255, int(c * 0.88 + 18)) for c in info['floor'])
    outline = tuple(max(0, int(c * 0.55)) for c in info['floor'])
    d.rounded_rectangle((80, 712, 1840, 760), radius=18,
                        fill=stage, outline=outline, width=4)
    d.line((100, 716, 1820, 716), fill=(255, 255, 255), width=2)
    d.rectangle((0, 760, W, H), fill=(18, 32, 46))
    d.rectangle((0, 756, W, 764), fill=info['floor'])
    for k in range(4):
        d.line((0, 800 + k * 48, W, 800 + k * 48), fill=(28, 48, 62), width=2)
    CTX['draw_tv_body'](d)
    return im


def draw_script_props(im: Image.Image, t: float, line: int, wt: dict,
                      frac: float, inks: list[float]) -> None:
    """剧本道具：全部是手绘实体，不贴 MV 真帧；沿用按实测词点起势的旧函数。"""
    C = CTX
    if line == 1:
        C['mirror_tile'](im, t, _prog(t, wt, '黑炭'))
        C['soot_flakes'](im, t, _prog(t, wt, '昨天'))
    elif line == 2:
        C['set_tv'](im, t, wt)
    elif line == 3:
        C['book_open'](im, t, wt)
    elif line == 4:
        C['dragon_shadow'](im, t, wt)
    elif line == 5:
        C['map_scroll'](im, t, wt)
    elif line == 6:
        C['chests'](im, t, wt)
    elif line == 7:
        C['namebox'](im, t, wt)
    elif line == 8:
        C['moon_cage'](im, t, wt)
    elif line == 9:
        C['fire'](im, t, wt)
    elif line == 10:
        C['mirror_tile'](im, t, _prog(t, wt, '焦的'))
    elif line == 11:
        C['draw_paper'](im, t, wt, inks); C['quill_hover'](im, t)
    elif line == 12:
        C['dial'](im, t, wt)
    elif line == 13:
        C['book_open'](im, t, wt); C['lens'](im, t, wt)
    elif line == 14:
        C['draw_paper'](im, t, wt, inks); C['dragon_shadow'](im, t, wt)
    elif line == 15:
        C['two_cards'](im, t, wt)
    elif line == 16:
        C['moon_cage'](im, t, wt, raise_lamp=True)
    elif line == 17:
        C['draw_paper'](im, t, wt, inks); C['reveal'](im, t, wt)
    elif line == 18:
        C['frames_advance'](im, t, wt)
    elif line == 19:
        C['draw_paper'](im, t, wt, inks); C['paper_flip'](im, t, wt)
    elif line == 20:
        C['draw_paper'](im, t, wt, inks); C['separate'](im, t, wt)
    elif line == 21:
        C['draw_paper'](im, t, wt, inks); C['charred_clip'](im, t, wt)
    elif line == 22:
        C['umbrella'](im, t, wt); C['set_tv'](im, t, wt)
    elif line == 23:
        C['draw_paper'](im, t, wt, inks); C['rice'](im, t, wt)
    elif line == 24:
        C['namebox'](im, t, wt, returning=True)


def draw_script_actors(im: Image.Image, t: float, line: int,
                       cue: dict, wt: dict) -> None:
    """项目 MV 式定点演出：固定 x，开场短滑入，词点播一次动作图集，之后停留。

    不再用步态图集做整句横移；局部 dx/dy 只表示递接、抬手、让位、俯冲的起势。
    """
    C = CTX
    CAST, SHEETS = C['CAST'], C['SHEETS']
    da = ImageDraw.Draw(im, 'RGBA')
    start, end = float(cue['start']), float(cue['end'])
    for e in sorted(SCRIPT_INTERACTIONS[line], key=lambda x: x['z']):
        who = e['who']
        scale = e['scale'] or STAGE_SCALE[who]
        size = tuple(max(1, int(v * scale)) for v in CAST[who]['size'])
        idle = CAST[who]['idle']
        act = e['act'] or idle
        tw = wt[e['trigger']]
        # 0.35s 从左右各 70px 滑入到位；之后固定，不再横向巡游。
        enter_dir = 1 if e['x'] < 960 else -1
        enter = 70 * (1 - _ease((t - start) / 0.35)) * enter_dir
        if t < tw:
            p = 0.0
            sheet, n = idle, SHEETS[idle][1]
            frame = int((t * 6 + e['phase']) * 1.0) % n
        else:
            p = _ease((t - tw) / max(0.6, end - tw))
            sheet, n = act, SHEETS[act][1]
            frame = min(n - 1, int(p * n))
        x = e['x'] + enter + e['dx'] * p
        y = 740 - size[1] + 2 - e['dy'] * math.sin(math.pi * min(1.0, p * 1.25))
        y += (1.3 if t < tw else 0.7) * math.sin(t * 2.2 + e['phase'])
        flip = e['flip'] if e['flip'] is not None else (e['x'] > 960)
        sp = C['sprite_frame'](sheet, frame, size, flip, e['charred'])
        xi, yi = int(round(x)), int(round(y))
        half = size[0] * 0.30
        da.ellipse((xi + size[0] / 2 - half, 732, xi + size[0] / 2 + half, 752),
                   fill=(8, 18, 26, 70))
        im.paste(sp, (xi, yi), sp)
