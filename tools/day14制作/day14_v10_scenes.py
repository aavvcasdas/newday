#!/usr/bin/env python3
#!/usr/bin/env python3
"""Day14 视频 v10：修掉「少一只脚 / 动作不符 / 人物形象太多」，保留 v9 分镜与画风。

用户第十次反馈（逐字）：「现在整体分镜的画面是够了，有几个问题1：有部分的图人物的脚少一只的，
不要使用这些。2.当前画面的动作很不符合，增加点互动吧，不要用这么多的人物形象，
人物形象的动作不符合画面的状态。」

因此 v10 只改主画面人物层与互动层：
  · 整体 storyboard / paper-popup 背景 / 电视几何与内容 / WAV / 24 cue / 63 屏 /
    1080p30 / 3756 帧 / 125.200s / 硬切与定点站位全部不动（用户说分镜画面够了）；
  · 建 **8 张安全图集白名单**：只取 actions-v12 里正面站立、底部不裁切、
    11 帧全部至少两段独立脚/裙摆轮廓的立绘，逐帧经 verify_safe_sheets() 闸门；
    v9 用过的 33 张姿态图（侧身单鞋 idle、迈步、蹲、坐、桌面、泳姿、reach 等）全部停用；
  · 每位本名从头到尾只用这一张纸片，不再 idle→act→reaction 三套姿态混合，
    也不再出现「站着的场景里三个人全在蹲/坐」的错配；
  · 动作改为 **一次性纸片姿态**：按每句导演卡给出 give / receive / watch 语义状态
    （递、翻开、举、俯冲、按住、落墨、收伞……），用朝对方倾身、抬手、小角度倾斜、
    回弹点头和 4 帧安全动作条表达 anticipation → action → follow-through；不循环步态；
  · 「增加互动」落在既有 24 组 HANDOVERS / 20 个 _draw_prop 道具 / 关系线 / 词点粒子上：
    道具在两掌之间移动、掌心各留一枚纸片回响、两掌到道具的连线、到达时一次性火花、
    交接双方同步倾身；不再靠增加人物或换姿态图凑动作；
  · 不重做风格、不重问画风、不回到 RPG；不编辑未使用的 legacy draw_interactions()。
"""


from __future__ import annotations

import math
import random
import zlib
from functools import lru_cache

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageChops

CTX: dict = {}


def bind(ctx: dict) -> None:
    CTX.update(ctx)


PAPER_INK = (74, 56, 42)
PAPER_EDGE = (186, 166, 140)
PAPER_BORDER = (250, 246, 232)
PAPER_BASE = (244, 236, 218)
PAPER_SHADOW = (78, 60, 46)
CUTOUT_PAD = 16




# 每句一个「道具从谁手里到谁手里」；名字必须出现在当句 SCRIPT_INTERACTIONS。
HANDOVERS = {
    1: ('cloth', '豆包', '本鲸'), 2: ('cable', '智谱', '本鲸'),
    3: ('book', '本鲸', '大小姐'), 4: ('ribbon', '龙娘', '豆包'),
    5: ('reins', 'Gemini', '本鲸'), 6: ('key', '千问', '本鲸'),
    7: ('name_strip', '本鲸', '大小姐'), 8: ('lantern', 'Kimi', '豆包'),
    9: ('flame', '龙娘', '本鲸'), 10: ('cloth', '豆包', '本鲸'),
    11: ('blank_book', '大小姐', 'Kimi'), 12: ('reel', '本鲸', 'Gemini'),
    13: ('book', '龙娘', '本鲸'), 14: ('note', '龙娘', '本鲸'),
    15: ('placard', '本鲸', '大小姐'), 16: ('lantern', 'Kimi', '本鲸'),
    17: ('paper', '大小姐', '本鲸'), 18: ('film_cell', 'Gemini', '本鲸'),
    19: ('paper', '本鲸', '千问'), 20: ('clip', '大小姐', '本鲸'),
    21: ('charred_paper', '本鲸', '豆包'), 22: ('umbrella', '智谱', '本鲸'),
    23: ('rice_bowl', '千问', '本鲸'), 24: ('glyph_block', '本鲸', '豆包'),
}


# ---------------------------------------------------------------------------
# v10：只这 8 张 actions-v12 正面站立图集允许进主画面；全部 11 帧都要过双脚闸门。
# 键名对应 render_day14_video.SHEETS 里新增的 v10_* 条目。
# ---------------------------------------------------------------------------
SAFE_SHEET_BY_WHO = {
    '本鲸': 'v10_whale_letter', '龙娘': 'v10_gpt_heart', '豆包': 'v10_doubao_cup',
    '大小姐': 'v10_claude_letter', 'Kimi': 'v10_kimi_photo',
    'Gemini': 'v10_gemini_shell', '智谱': 'v10_zai_read', '千问': 'v10_qwen_lantern',
}
# 兼容旧审看脚本的字段名；v10 主画面**不再**切到第三套 reaction 姿态。
REACTION_SHEET = {who: key for who, key in SAFE_SHEET_BY_WHO.items()}

VERIFIED_FRAMES = tuple(range(11))   # 11 帧逐一核验：轮廓基本不变、底部不裁切、>=2 段脚/裙摆
SAFE_FRAMES = (0, 3, 7, 10)         # 实际演出只取 4 帧做一次性动作条，不循环

# 每句一个语义状态对：（给出者动作, 接收者动作）。名字对应导演卡 M01–M24 的 action/result/reaction。
SCENE_STATES = {
    1: ('offer', 'inspect'), 2: ('offer', 'set'), 3: ('open', 'raise'),
    4: ('swoop', 'yield'), 5: ('offer', 'accept'), 6: ('offer', 'open'),
    7: ('hold_up', 'question'), 8: ('raise', 'warn'), 9: ('breathe', 'scorch'),
    10: ('offer', 'selfcheck'), 11: ('show_blank', 'hover_pen'), 12: ('press', 'reverse'),
    13: ('shrug', 'point_blank'), 14: ('replay', 'write'), 15: ('point', 'name'),
    16: ('raise', 'look'), 17: ('show_empty', 'look'), 18: ('advance', 'inspect'),
    19: ('flip', 'hand_next'), 20: ('separate', 'hold'), 21: ('pick', 'clip'),
    22: ('fold', 'switch_off'), 23: ('place', 'keep'), 24: ('return', 'close'),
}

# (朝对方倾身, 抬手高度, 纸片倾斜角, 回弹点头幅度, 附加提示)
STATE_PARAMS = {
    'offer':       (0.55, 10, 1.5, 0.2, ''),
    'inspect':     (-0.35, 4, -1.0, 0.9, 'nod'),
    'set':         (0.45, 8, 1.0, 0.2, 'press'),
    'open':        (0.60, 14, 2.0, 0.2, 'spread'),
    'raise':       (0.50, 20, 2.5, 0.2, ''),
    'hold_up':     (0.55, 12, 1.5, 0.2, ''),
    'question':    (-0.50, 6, -2.0, 0.5, ''),
    'swoop':       (0.80, 0, -4.0, 0.1, 'dip'),
    'yield':       (-0.60, 0, 2.5, 0.5, 'recoil'),
    'accept':      (-0.40, 6, -1.0, 0.3, ''),
    'warn':        (-0.70, 8, -3.0, 0.4, 'turn'),
    'breathe':     (0.70, 10, -2.0, 0.2, ''),
    'scorch':      (-0.50, 0, 2.0, 0.6, 'shrink'),
    'selfcheck':   (-0.25, 3, -1.0, 0.9, 'nod'),
    'show_blank':  (0.40, 10, 1.0, 0.2, ''),
    'hover_pen':   (-0.30, 5, -0.5, 0.3, ''),
    'press':       (0.60, 4, 1.5, 0.2, 'press'),
    'reverse':     (-0.50, 6, -2.0, 0.3, ''),
    'shrug':       (0.30, 5, 0.5, 0.3, ''),
    'point_blank': (-0.40, 6, -1.5, 0.5, 'point'),
    'replay':      (0.65, 8, -2.0, 0.2, ''),
    'write':       (-0.35, 5, -1.0, 0.4, 'write'),
    'point':       (0.50, 6, 1.0, 0.3, 'point'),
    'name':        (-0.45, 5, -1.0, 0.3, ''),
    'look':        (-0.25, 3, -0.5, 0.6, 'nod'),
    'show_empty':  (0.45, 8, 1.0, 0.2, '',),
    'advance':     (0.55, 6, 1.5, 0.2, ''),
    'hand_next':   (-0.40, 5, -1.0, 0.3, ''),
    'separate':    (0.45, 6, 1.0, 0.2, ''),
    'hold':        (-0.30, 4, -0.5, 0.3, ''),
    'flip':        (0.60, 12, 2.0, 0.2, 'spread'),
    'pick':        (0.55, 10, 1.5, 0.2, ''),
    'clip':        (-0.45, 6, -1.0, 0.3, ''),
    'fold':        (0.50, 8, 1.5, 0.2, ''),
    'switch_off':  (-0.35, 4, -1.0, 0.3, 'press'),
    'place':       (0.45, 8, 1.0, 0.2, ''),
    'keep':        (-0.25, 3, -0.5, 0.6, 'nod'),
    'return':      (0.55, 10, 1.5, 0.2, ''),
    'close':       (-0.45, 6, -1.0, 0.3, ''),
    'watch':       (0.00, 0, 0.0, 0.15, ''),
}


def _alpha_runs(mask, minlen=2):
    """底部 alpha 列里连续段的个数：>=2 表示两只脚（或脚＋裙摆）都在。"""
    out, s = [], None
    for i, v in enumerate(mask):
        if v and s is None:
            s = i
        if not v and s is not None:
            if i - s >= minlen:
                out.append((s, i - 1))
            s = None
    if s is not None and len(mask) - s >= minlen:
        out.append((s, len(mask) - 1))
    return out


def verify_safe_sheets() -> dict:
    """启动闸门：8 张白名单图集的 11 帧都必须双脚/裙摆可见、轮廓基本不变、底部未裁切。

    这是对用户「有部分的图人物的脚少一只的，不要使用这些」的可执行回答；
    任何一张不合格都会在 render_day14_video.main() 里 AssertionError，而不是悄悄出片。
    """
    SHEETS, sheet_image = CTX['SHEETS'], CTX['sheet_image']
    report = {}
    for who, key in SAFE_SHEET_BY_WHO.items():
        assert key in SHEETS, f'v10 安全图集未注册：{key}'
        rel, n = SHEETS[key]
        assert rel.startswith('assets/ai-girls/actions-v12/') and n == 11, (key, rel, n)
        im = sheet_image(rel).convert('RGBA')
        assert im.size == (4224, 416), (key, im.size)
        a = np.asarray(im)[:, :, 3]
        assert a[0, 0] == a[0, -1] == a[-1, 0] == a[-1, -1] == 0, f'{key} 四角不透明'
        assert a[415].max() == 0, f'{key} 图集底部被裁切'
        base = a[:, 0:384]
        counts, maxdiff = [], 0.0
        for f in VERIFIED_FRAMES:
            fr = a[:, f * 384:(f + 1) * 384]
            d = float(np.abs(fr.astype(np.int16) - base.astype(np.int16)).mean())
            maxdiff = max(maxdiff, d)
            # 手里道具轻微位移会让 alpha 有 <2/255 的变化；脚的轮廓不能整块消失。
            assert d < 2.0, f'{key} 第{f}帧轮廓大改（{d:.2f}），疑似抬脚/缺脚'
            band = (fr[392:410] > 60).sum(0) > 0
            runs = _alpha_runs(band, 2)
            assert len(runs) >= 2, f'{key} 第{f}帧底部只有 {len(runs)} 段，疑似少一只脚'
            counts.append(len(runs))
        report[who] = dict(sheet=key, verified_frames=len(VERIFIED_FRAMES),
                           min_bottom_components=min(counts), max_alpha_mean_diff=round(maxdiff, 3))
    assert len(report) == 8
    return report



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
# v10：每镜只保留交接双方（2 位）；本鲸不在交接对里时补 1 位定点旁观者。
# 不再调用 33 张侧身 / 抬脚 / 坐姿 / 泳姿动作图，也不切 REACTION_SHEET 第三姿态。
SCRIPT_INTERACTIONS = {
    1: [A('豆包', 420, '昨天', '递出道具｜给出 cloth｜正面站立双脚可见', dx=0, dy=0, z=2, charred=False, phase=0.0), A('本鲸', 760, '昨天', '低头查看｜接下 cloth｜正面站立双脚可见', dx=0, dy=0, z=3, charred=True, phase=0.8)],
    2: [A('智谱', 420, '电视', '递出道具｜给出 cable｜正面站立双脚可见', dx=0, dy=0, z=2, charred=False, phase=0.0), A('本鲸', 760, '电视', '把物件放正｜接下 cable｜正面站立双脚可见', dx=0, dy=0, z=3, charred=False, phase=0.8)],
    3: [A('本鲸', 760, '长出', '翻开｜给出 book｜正面站立双脚可见', dx=0, dy=0, z=2, charred=False, phase=0.0), A('大小姐', 1180, '长出', '举起｜接下 book｜正面站立双脚可见', dx=0, dy=0, z=3, charred=False, phase=0.8)],
    4: [A('龙娘', 1240, '抓走', '定点俯冲｜给出 ribbon｜正面站立双脚可见', dx=0, dy=0, z=2, charred=False, phase=0.0), A('豆包', 760, '抓走', '一次让位｜接下 ribbon｜正面站立双脚可见', dx=0, dy=0, z=3, charred=False, phase=0.8), A('本鲸', 760, '抓走', '定点旁观｜不切第三套姿态', dx=0, dy=0, z=1, charred=False, phase=1.6)],
    5: [A('Gemini', 1180, '城门口', '递出道具｜给出 reins｜正面站立双脚可见', dx=0, dy=0, z=2, charred=False, phase=0.0), A('本鲸', 760, '城门口', '接下｜接下 reins｜正面站立双脚可见', dx=0, dy=0, z=3, charred=False, phase=0.8)],
    6: [A('千问', 420, '山洞口', '递出道具｜给出 key｜正面站立双脚可见', dx=0, dy=0, z=2, charred=False, phase=0.0), A('本鲸', 760, '山洞口', '翻开｜接下 key｜正面站立双脚可见', dx=0, dy=0, z=3, charred=False, phase=0.8)],
    7: [A('本鲸', 760, '大小姐', '把长条举到框前｜给出 name_strip｜正面站立双脚可见', dx=0, dy=0, z=2, charred=False, phase=0.0), A('大小姐', 1180, '大小姐', '倾身追问｜接下 name_strip｜正面站立双脚可见', dx=0, dy=0, z=3, charred=False, phase=0.8)],
    8: [A('Kimi', 420, '笼子', '举起｜给出 lantern｜正面站立双脚可见', dx=0, dy=0, z=2, charred=False, phase=0.0), A('豆包', 1180, '笼子', '回头提醒｜接下 lantern｜正面站立双脚可见', dx=0, dy=0, z=3, charred=False, phase=0.8), A('本鲸', 760, '笼子', '定点旁观｜不切第三套姿态', dx=0, dy=0, z=1, charred=False, phase=1.6)],
    9: [A('龙娘', 1180, '石碑', '定点喷火｜给出 flame｜正面站立双脚可见', dx=0, dy=0, z=2, charred=False, phase=0.0), A('本鲸', 760, '石碑', '退半步看焦痕｜接下 flame｜正面站立双脚可见', dx=0, dy=0, z=3, charred=True, phase=0.8)],
    10: [A('豆包', 1180, '焦的', '递出道具｜给出 cloth｜正面站立双脚可见', dx=0, dy=0, z=2, charred=False, phase=0.0), A('本鲸', 760, '焦的', '摸自己的焦痕｜接下 cloth｜正面站立双脚可见', dx=0, dy=0, z=3, charred=True, phase=0.8)],
    11: [A('大小姐', 1180, '一个字都没有', '摊开空册｜给出 blank_book｜正面站立双脚可见', dx=0, dy=0, z=2, charred=False, phase=0.0), A('Kimi', 420, '一个字都没有', '悬笔不落｜接下 blank_book｜正面站立双脚可见', dx=0, dy=0, z=3, charred=False, phase=0.8), A('本鲸', 760, '一个字都没有', '定点旁观｜不切第三套姿态', dx=0, dy=0, z=1, charred=False, phase=1.6)],
    12: [A('本鲸', 760, '一段一段', '按住旋钮｜给出 reel｜正面站立双脚可见', dx=0, dy=0, z=2, charred=False, phase=0.0), A('Gemini', 1180, '一段一段', '倒回一格｜接下 reel｜正面站立双脚可见', dx=0, dy=0, z=3, charred=False, phase=0.8)],
    13: [A('龙娘', 1180, '没写', '摊手｜给出 book｜正面站立双脚可见', dx=0, dy=0, z=2, charred=False, phase=0.0), A('本鲸', 760, '没写', '指向空白｜接下 book｜正面站立双脚可见', dx=0, dy=0, z=3, charred=False, phase=0.8)],
    14: [A('龙娘', 1180, '记一行', '重演一次｜给出 note｜正面站立双脚可见', dx=0, dy=0, z=2, charred=False, phase=0.0), A('本鲸', 760, '记一行', '落一行墨｜接下 note｜正面站立双脚可见', dx=0, dy=0, z=3, charred=False, phase=0.8)],
    15: [A('本鲸', 760, '豆包', '依次点名｜给出 placard｜正面站立双脚可见', dx=0, dy=0, z=2, charred=False, phase=0.0), A('大小姐', 420, '豆包', '名牌立起｜接下 placard｜正面站立双脚可见', dx=0, dy=0, z=3, charred=False, phase=0.8)],
    16: [A('Kimi', 420, '没人提', '举起｜给出 lantern｜正面站立双脚可见', dx=0, dy=0, z=2, charred=False, phase=0.0), A('本鲸', 760, '没人提', '只看不说｜接下 lantern｜正面站立双脚可见', dx=0, dy=0, z=3, charred=False, phase=0.8)],
    17: [A('大小姐', 420, '写下来', '亮出空行｜给出 paper｜正面站立双脚可见', dx=0, dy=0, z=2, charred=False, phase=0.0), A('本鲸', 760, '写下来', '只看不说｜接下 paper｜正面站立双脚可见', dx=0, dy=0, z=3, charred=False, phase=0.8)],
    18: [A('Gemini', 1180, '一帧一帧', '逐格推进｜给出 film_cell｜正面站立双脚可见', dx=0, dy=0, z=2, charred=False, phase=0.0), A('本鲸', 760, '一帧一帧', '低头查看｜接下 film_cell｜正面站立双脚可见', dx=0, dy=0, z=3, charred=False, phase=0.8)],
    19: [A('本鲸', 760, '一段写一行', '把纸翻面｜给出 paper｜正面站立双脚可见', dx=0, dy=0, z=2, charred=False, phase=0.0), A('千问', 1180, '一段写一行', '递下一页｜接下 paper｜正面站立双脚可见', dx=0, dy=0, z=3, charred=False, phase=0.8)],
    20: [A('大小姐', 1180, '并成一段', '留出空档｜给出 clip｜正面站立双脚可见', dx=0, dy=0, z=2, charred=False, phase=0.0), A('本鲸', 760, '并成一段', '收住道具｜接下 clip｜正面站立双脚可见', dx=0, dy=0, z=3, charred=False, phase=0.8)],
    21: [A('本鲸', 760, '待补', '抽出焦纸｜给出 charred_paper｜正面站立双脚可见', dx=0, dy=0, z=2, charred=True, phase=0.0), A('豆包', 1180, '待补', '单独夹好｜接下 charred_paper｜正面站立双脚可见', dx=0, dy=0, z=3, charred=False, phase=0.8)],
    22: [A('智谱', 1180, '不拍雨', '收伞｜给出 umbrella｜正面站立双脚可见', dx=0, dy=0, z=2, charred=False, phase=0.0), A('本鲸', 760, '不拍雨', '按下开关｜接下 umbrella｜正面站立双脚可见', dx=0, dy=0, z=3, charred=False, phase=0.8)],
    23: [A('千问', 1180, '不改', '放下饭盆｜给出 rice_bowl｜正面站立双脚可见', dx=0, dy=0, z=2, charred=False, phase=0.0), A('本鲸', 760, '不改', '留着不改｜接下 rice_bowl｜正面站立双脚可见', dx=0, dy=0, z=3, charred=False, phase=0.8)],
    24: [A('本鲸', 760, '塞回框', '把字送回框｜给出 glyph_block｜正面站立双脚可见', dx=0, dy=0, z=2, charred=False, phase=0.0), A('豆包', 1180, '塞回框', '合上框口｜接下 glyph_block｜正面站立双脚可见', dx=0, dy=0, z=3, charred=False, phase=0.8)],
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


def _scene_info(line: int) -> dict:
    info = dict(SCRIPT_SCENES[line])
    info.update(PASTEL_OVERRIDE.get(line, {}))
    return info



@lru_cache(maxsize=8)
def _paper_noise(size: tuple[int, int]) -> Image.Image:
    """暖棉纸：三档平滑噪声 + 低幅细颗粒；缓存后每帧只做一次查表。"""
    W, H = size
    rng = np.random.default_rng(9173)
    total = np.zeros((H, W), np.float32)
    for step, amp in ((26, 9.0), (58, 6.0), (112, 4.0)):
        gw, gh = W // step + 2, H // step + 2
        a = rng.normal(0, 1, (gh, gw)).astype(np.float32)
        im = Image.fromarray(np.clip((a + 2) / 4 * 255, 0, 255).astype(np.uint8), 'L')
        im = im.resize((W, H), Image.Resampling.BICUBIC)
        total += (np.asarray(im).astype(np.float32) - 128.0) / 128.0 * amp
    return Image.fromarray(np.clip(128 + total, 0, 255).astype(np.uint8), 'L')


def _mix(a, b, p: float):
    return tuple(int(a[i] * (1 - p) + b[i] * p) for i in range(3))


def _paper_base_image(info: dict, t: float) -> Image.Image:
    """一整张暖纸先铺底，再罩 24 套主色族；不是 8 色量化 / Bayer 抖动。"""
    W, H = _w(), _h()
    yy = np.arange(H, dtype=np.float32)[:, None]
    p = yy / H
    top = np.array(info['top'], np.float32)
    bot = np.array(info['bot'], np.float32)
    paper = np.array(PAPER_BASE, np.float32)
    grad = top[None, None, :] * (1 - p[:, :, None]) + bot[None, None, :] * p[:, :, None]
    grad = grad * 0.68 + paper * 0.32
    band = (6 * np.sin(yy / 110 + t * 0.35))[:, :, None]
    arr = np.repeat(np.clip(grad + band, 0, 255).astype(np.uint8), W, axis=1)
    noise = (np.asarray(_paper_noise((W, H))).astype(np.float32) - 128.0) * 0.16
    arr = np.clip(arr.astype(np.float32) + noise[:, :, None], 0, 255).astype(np.uint8)
    return CTX['top_glow'](Image.fromarray(arr, 'RGB'), t)


def _paper_grain(im: Image.Image) -> Image.Image:
    W, H = im.size
    noise = (np.asarray(_paper_noise((W, H))).astype(np.float32) - 128.0) * 0.055
    arr = np.asarray(im).astype(np.float32)
    return Image.fromarray(np.clip(arr + noise[:, :, None], 0, 255).astype(np.uint8), 'RGB')


def _paper_soften(im: Image.Image) -> Image.Image:
    """轻微柔化硬几何边，保留墨线与纸边，不做像素化。"""
    return Image.blend(im, im.filter(ImageFilter.GaussianBlur(0.7)), 0.26)


def _paper_shift(move: str, frac: float, t: float) -> float:
    if move == 'pan_r': return frac * 260.0
    if move == 'pan_l': return -frac * 260.0
    if move == 'push': return frac * 70.0
    if move == 'pull': return -frac * 70.0
    if move == 'tilt_up': return frac * 50.0
    if move == 'shake': return 7.0 * math.sin(t * 39.0)
    return 0.0


def _wobbly_pts(pts, seed: int, amp: float = 10.0):
    rng = random.Random(seed)
    return [(int(x + rng.uniform(-amp, amp)), int(y + rng.uniform(-amp * 0.6, amp * 0.6))) for x, y in pts]


def _hill_pts(y0, y1, W, shift, phase, amp=30, n=18):
    pts = []
    for i in range(n + 1):
        x = -300 + i * (W + 600) / n - shift
        y = y0 + amp * math.sin(i * 0.72 + phase) + amp * 0.35 * math.sin(i * 1.61 + phase * 0.7)
        pts.append((int(x), int(y)))
    pts += [(W + 300, y1), (-300, y1)]
    return pts


def _wave_pts(y0, y1, W, shift, phase, amp=22, n=22):
    pts = []
    for i in range(n + 1):
        x = -300 + i * (W + 600) / n - shift
        y = y0 + amp * math.sin(i * 1.15 + phase) + amp * 0.3 * math.sin(i * 2.1 + phase)
        pts.append((int(x), int(y)))
    pts += [(W + 300, y1), (-300, y1)]
    return pts


def _paper_polygon(im, pts, fill, seed=0, border=10):
    d = ImageDraw.Draw(im)
    da = ImageDraw.Draw(im, 'RGBA')
    sh = [(x + 8, y + 12) for x, y in pts]
    ed = [(x, y + 6) for x, y in pts]
    da.polygon(sh, fill=(*PAPER_SHADOW, 46))
    d.polygon(ed, fill=PAPER_EDGE, outline=PAPER_INK, width=3)
    d.polygon(pts, fill=fill, outline=PAPER_BORDER, width=border)
    d.line(pts + [pts[0]], fill=PAPER_INK, width=3, joint='curve')
    cx = sum(x for x, y in pts) / len(pts)
    top = min(y for x, y in pts)
    bottom = max(y for x, y in pts)
    da.line((cx, bottom, cx, top), fill=(*PAPER_INK, 38), width=3)


def _paper_disc(im, cx, cy, r, fill, seed=0):
    d = ImageDraw.Draw(im)
    da = ImageDraw.Draw(im, 'RGBA')
    j = int(3 * math.sin(seed))
    box = (int(cx - r + j), int(cy - r), int(cx + r + j), int(cy + r))
    da.ellipse((box[0] + 8, box[1] + 12, box[2] + 8, box[3] + 12), fill=(*PAPER_SHADOW, 52))
    d.ellipse((box[0], box[1] + 6, box[2], box[3] + 6), fill=PAPER_EDGE, outline=PAPER_INK, width=3)
    d.ellipse(box, fill=fill, outline=PAPER_BORDER, width=10)
    d.ellipse((box[0] + 5, box[1] + 5, box[2] - 5, box[3] - 5), outline=PAPER_INK, width=3)


def _paper_cloud(im, cx, cy, rx, ry, seed):
    pts = [(cx - rx, cy), (cx - rx * 0.62, cy - ry), (cx - rx * 0.18, cy - ry * 0.72),
           (cx + rx * 0.22, cy - ry), (cx + rx, cy), (cx + rx * 0.7, cy + ry * 0.42),
           (cx - rx * 0.72, cy + ry * 0.42)]
    pts = _wobbly_pts(pts, seed, 6)
    _paper_polygon(im, pts, _mix(PAPER_BORDER, PAPER_BASE, 0.15), seed, border=8)


def _paper_popup_layers(im, info, t, frac):
    """远山 / 中景 / 前景波边按不同系数平移；每层都是外扩纸边的 flat card。"""
    W, H = _w(), _h()
    shift = _paper_shift(info.get('move', 'static'), frac, t)
    seed0 = zlib.crc32(info['layout'].encode('utf-8'))
    da = ImageDraw.Draw(im, 'RGBA')
    ac = info['accent']
    bot, floor = info['bot'], info['floor']

    # 天空三道低透明度水彩罩染，不是连续软件渐变
    for k, (y0, h, a) in enumerate(((90, 170, 16), (230, 180, 13), (370, 180, 11))):
        pts = _hill_pts(y0, y0 + h, W, shift * 0.12, k * 1.9 + t * 0.05, amp=18, n=12)
        da.polygon(pts, fill=(*ac, a))

    far = _mix(bot, PAPER_BASE, 0.34)
    mid = _mix(floor, PAPER_BASE, 0.30)
    near = _mix(floor, PAPER_BASE, 0.14)
    for k, (y0, col, par, amp, ph) in enumerate((
        (430, far, 0.25, 38, 0.4), (520, mid, 0.55, 30, 2.1), (610, near, 0.85, 24, 3.7))):
        pts = _hill_pts(y0, 790, W, shift * par, ph + t * 0.02, amp=amp)
        _paper_polygon(im, pts, col, seed=seed0 + k, border=9)

    _paper_disc(im, 960 + shift * 0.10, 220, 108, ac, seed0)
    for k, (cx, cy, rx, ry) in enumerate(((230, 150, 155, 58), (640, 118, 130, 48), (1190, 168, 170, 60))):
        _paper_cloud(im, cx + shift * 0.06, cy, rx, ry, seed0 + 100 + k)

    for k, (y0, col, par, ph) in enumerate((
        (690, _mix(floor, ac, 0.18), 1.15, 1.2), (730, _mix(floor, PAPER_BASE, 0.18), 1.45, 3.4))):
        pts = _wave_pts(y0, 820, W, shift * par, ph + t * 0.04, amp=16)
        _paper_polygon(im, pts, col, seed=seed0 + 200 + k, border=8)


def _paper_stage(im, info, t):
    """整片舞台是一张折起的纸卡，不是 v8 的铆钉/板缝像素地板。"""
    d = ImageDraw.Draw(im)
    da = ImageDraw.Draw(im, 'RGBA')
    stage = _mix(info['floor'], PAPER_BASE, 0.34)
    da.rounded_rectangle((88, 708, 1848, 780), radius=26, fill=(*PAPER_SHADOW, 52))
    d.rounded_rectangle((80, 700, 1840, 770), radius=24, fill=PAPER_EDGE, outline=PAPER_INK, width=3)
    d.rounded_rectangle((86, 696, 1834, 764), radius=20, fill=stage, outline=PAPER_BORDER, width=9)
    d.rounded_rectangle((92, 702, 1828, 758), radius=16, outline=PAPER_INK, width=3)
    da.line((960, 700, 960, 770), fill=(*PAPER_INK, 42), width=3)
    for x in range(180, 1800, 240):
        d.polygon([(x, 702), (x + 16, 684), (x + 32, 702)], fill=PAPER_BORDER, outline=PAPER_INK)
    for k in range(7):
        x = 220 + k * 250 + int(3 * math.sin(t * 1.4 + k))
        d.ellipse((x, 726, x + 7, 733), fill=info['accent'], outline=PAPER_INK, width=2)


def _paper_ambient(im, info, t):
    da = ImageDraw.Draw(im, 'RGBA')
    W, H = im.size
    seed = zlib.crc32(info['layout'].encode('utf-8')) + int(t * 6)
    rng = random.Random(seed)
    for k in range(28):
        x = rng.randint(20, W - 20)
        y = int((rng.randint(60, 740) + t * (5 + k % 4 * 3)) % 740)
        r = rng.randint(2, 5)
        col = info['accent'] if k % 3 == 0 else PAPER_BORDER
        da.ellipse((x - r, y - r, x + r, y + r), fill=(*col, 42))


def _smooth_blend(a: Image.Image, b: Image.Image, u: float) -> Image.Image:
    u = min(1.0, max(0.0, u))
    if u <= 0: return a
    if u >= 1: return b
    return Image.blend(a, b, u)


def _cutout_sprite(sp: Image.Image) -> Image.Image:
    """给既有 AI娘立绘套上 paper-popup 的灰纸板边、米白纸边、墨线与软投影。"""
    sp = sp.convert('RGBA')
    w, h = sp.size
    pad = CUTOUT_PAD
    alpha = sp.getchannel('A')
    border_a = alpha.filter(ImageFilter.MaxFilter(11))
    edge_a = alpha.filter(ImageFilter.MaxFilter(15))
    # 墨线只贴立绘自身轮廓一圈；米白纸边留在它外面，不能被墨线整圈盖掉。
    ink_a = ImageChops.subtract(alpha.filter(ImageFilter.MaxFilter(3)), alpha)
    shadow_a = alpha.filter(ImageFilter.GaussianBlur(8)).point(lambda v: int(v * 0.30))
    out = Image.new('RGBA', (w + 2 * pad, h + 2 * pad), (0, 0, 0, 0))

    def layer(color, mask, dx=0, dy=0):
        lay = Image.new('RGBA', (w, h), (*color, 0))
        lay.putalpha(mask)
        holder = Image.new('RGBA', out.size, (0, 0, 0, 0))
        holder.alpha_composite(lay, (pad + dx, pad + dy))
        return holder

    out.alpha_composite(layer(PAPER_SHADOW, shadow_a, 8, 12))
    out.alpha_composite(layer(PAPER_EDGE, edge_a, 0, 6))
    out.alpha_composite(layer(PAPER_BORDER, border_a, 0, 0))
    out.alpha_composite(layer(PAPER_INK, ink_a, 0, 0))
    out.alpha_composite(sp, (pad, pad))
    return out


def _paper_prop_scaled(im, prop, x, y, p, ac, t, scale=1.7):
    bw, bh = 100, 92
    tile = Image.new('RGBA', (bw, bh), (0, 0, 0, 0))
    td = ImageDraw.Draw(tile)
    tda = ImageDraw.Draw(tile, 'RGBA')
    _draw_prop(td, tda, prop, bw / 2, bh / 2, p, ac, t)
    tile = tile.resize((int(bw * scale), int(bh * scale)), Image.Resampling.LANCZOS)
    cut = _cutout_sprite(tile)
    im.paste(cut, (int(x - cut.width / 2), int(y - cut.height / 2)), cut)


def _handover_geom(line: int, t: float, cue: dict, wt: dict):
    item = HANDOVERS.get(line)
    if not item: return None
    prop, frm, to = item
    actors = {e['who']: e for e in SCRIPT_INTERACTIONS[line]}
    if frm not in actors or to not in actors: return None
    words = sorted(CTX['WORD_TRIGGERS'][line], key=lambda w: wt[w])
    tw = wt[words[min(2, len(words) - 1)]]
    end = float(cue['end'])
    if t < tw - 0.12 or t > end + 0.1: return None
    u = _ease((t - tw) / 0.72)
    sx, sy = _hand_xy(actors[frm], t, cue, wt)
    ex, ey = _hand_xy(actors[to], t, cue, wt)
    x, y = _lerp(sx, ex, u), _lerp(sy, ey, u)
    return dict(prop=prop, frm=frm, to=to, x=x, y=y, u=u,
                sx=sx, sy=sy, ex=ex, ey=ey, tw=tw, end=end)


def _paper_handover_props(im, t, line, cue, wt):
    info = _scene_info(line)
    g = _handover_geom(line, t, cue, wt)
    if not g: return
    ac = info['accent']
    d = ImageDraw.Draw(im)
    da = ImageDraw.Draw(im, 'RGBA')
    for r, a in ((78, 16), (60, 22), (42, 28)):
        da.ellipse((g['x'] - r, g['y'] - r * 0.72, g['x'] + r, g['y'] + r * 0.72),
                   fill=(*ac, a))
    rng = random.Random(zlib.crc32(f"{line}-{g['prop']}".encode()) + int(t * 8))
    trail = []
    for k in range(14):
        u = k / 13
        xx = _lerp(g['sx'], g['x'], u) + rng.randint(-4, 4)
        yy = _lerp(g['sy'], g['y'], u) - 18 * math.sin(math.pi * u) + rng.randint(-4, 4)
        trail.append((xx, yy))
    da.line(trail, fill=(*PAPER_INK, 120), width=5, joint='curve')
    for k in range(0, 14, 3):
        xx, yy = trail[k]
        da.ellipse((xx - 5, yy - 5, xx + 5, yy + 5), fill=(*PAPER_BORDER, 190))
    for cx, cy in ((g['sx'], g['sy']), (g['ex'], g['ey'])):
        d.ellipse((cx - 11, cy - 11, cx + 11, cy + 11), fill=PAPER_BORDER, outline=PAPER_INK, width=3)
    _paper_prop_scaled(im, g['prop'], g['x'], g['y'], g['u'], ac, t)


def _paper_interaction_links(im, t, line, cue, wt):
    item = HANDOVERS.get(line)
    if not item: return
    _, frm, to = item
    actors = {e['who']: e for e in SCRIPT_INTERACTIONS[line]}
    if frm not in actors or to not in actors: return
    words = sorted(CTX['WORD_TRIGGERS'][line], key=lambda w: wt[w])
    tw0 = wt[words[min(1, len(words) - 1)]]
    tw1 = wt[words[-1]]
    if not (tw0 - 0.14 <= t <= tw1 + 0.52): return
    info = _scene_info(line); ac = info['accent']
    da = ImageDraw.Draw(im, 'RGBA')

    def head(e):
        x, y, size = _actor_pose(e, t, cue, wt)
        return x + size[0] * 0.5, y + size[1] * 0.18
    sx, sy = head(actors[frm]); ex, ey = head(actors[to])
    cx, cy = (sx + ex) / 2, min(sy, ey) - 190
    rng = random.Random(zlib.crc32(f'link-{line}'.encode()))
    curve = []
    for k in range(28):
        u = k / 27
        xx = (1 - u) ** 2 * sx + 2 * (1 - u) * u * cx + u ** 2 * ex + rng.randint(-5, 5)
        yy = (1 - u) ** 2 * sy + 2 * (1 - u) * u * cy + u ** 2 * ey + rng.randint(-5, 5)
        curve.append((xx, yy))
    da.line(curve, fill=(*PAPER_INK, 150), width=6, joint='curve')
    for k in range(0, 28, 4):
        xx, yy = curve[k]
        da.ellipse((xx - 6, yy - 6, xx + 6, yy + 6), fill=(*PAPER_BORDER, 210))
    if t >= tw1:
        rp = min(1.0, (t - tw1) / 0.42)
        a = int(210 * (1 - rp * 0.5))
        for k in range(8):
            ang = math.pi / 4 * k + 0.12
            r0, r1 = 42 + 8 * rp, 72 + 32 * rp
            da.line((ex + r0 * math.cos(ang), ey + r0 * math.sin(ang),
                     ex + r1 * math.cos(ang), ey + r1 * math.sin(ang)),
                    fill=(*ac, a), width=7)
        da.line((ex, ey - 108, ex, ey - 74), fill=(*PAPER_INK, a), width=9)
        da.ellipse((ex - 6, ey - 62, ex + 6, ey - 50), fill=(*PAPER_INK, a))


def _paper_impact_particles(im, t, line, cue, wt):
    info = _scene_info(line); ac = info['accent']
    da = ImageDraw.Draw(im, 'RGBA')
    words = sorted(CTX['WORD_TRIGGERS'][line], key=lambda w: wt[w])
    for word in words:
        tw = wt[word]
        if not (0 <= t - tw <= 0.45): continue
        p = (t - tw) / 0.45
        seed = zlib.crc32(word.encode('utf-8'))
        rng = random.Random(seed)
        cx = 300 + seed % 1320
        cy = 300 + (seed // 7) % 320
        for k in range(12):
            a = k * math.pi / 6 + seed % 17
            r = 18 + 62 * p
            x = int(cx + r * math.cos(a) + rng.randint(-5, 5))
            y = int(cy + r * math.sin(a) + rng.randint(-5, 5))
            col = ac if k % 3 else PAPER_BORDER
            if k % 2:
                da.ellipse((x - 4, y - 4, x + 4, y + 4), fill=(*col, 140))
            else:
                da.polygon([(x - 5, y), (x, y - 6), (x + 5, y), (x, y + 6)], fill=(*col, 125))


def _actor_pose(e: dict, t: float, cue: dict, wt: dict):
    """固定 x 点位；短滑入 + 词点局部 dx/dy，不含整句横移。"""
    CAST = CTX['CAST']
    who = e['who']
    scale = e['scale'] or STAGE_SCALE[who]
    size = tuple(max(1, int(v * scale)) for v in CAST[who]['size'])
    start, end = float(cue['start']), float(cue['end'])
    tw = wt[e['trigger']]
    enter_dir = 1 if e['x'] < 960 else -1
    enter = 70 * (1 - _ease((t - start) / 0.35)) * enter_dir
    p = _ease((t - tw) / max(0.6, end - tw)) if t >= tw else 0.0
    x = e['x'] + enter + e['dx'] * p
    y = 740 - size[1] + 2 - e['dy'] * math.sin(math.pi * min(1.0, p * 1.25))
    return x, y, size


def _hand_xy(e: dict, t: float, cue: dict, wt: dict):
    x, y, size = _actor_pose(e, t, cue, wt)
    return x + size[0] * 0.52, y + size[1] * 0.56


def _draw_prop(d, da, prop: str, x: float, y: float, p: float, ac, t: float):
    """交接道具都在两手之间、带 1px 墨线；不是 UI 图标。"""
    ink = (74, 56, 42)
    lift = 18 * math.sin(math.pi * min(1.0, max(0.0, p)))
    y -= lift
    if prop == 'cloth':
        d.rounded_rectangle((x - 26, y - 14, x + 26, y + 16), radius=7,
                            fill=(238, 232, 216), outline=ink, width=3)
        d.line((x - 12, y - 4, x + 14, y + 6), fill=(168, 158, 142), width=3)
    elif prop == 'cable':
        d.line((x - 34, y, x - 12, y + 16, x + 14, y - 14, x + 34, y),
               fill=(64, 78, 88), width=6, joint='curve')
        d.rectangle((x - 40, y - 7, x - 28, y + 7), fill=ac, outline=ink, width=2)
    elif prop == 'book':
        d.rounded_rectangle((x - 30, y - 18, x + 30, y + 18), radius=4,
                            fill=(142, 38, 54), outline=ink, width=3)
        d.line((x, y - 16, x, y + 16), fill=(82, 26, 38), width=3)
        d.polygon([(x, y - 14), (x + 26, y - 24), (x + 28, y + 8), (x, y + 14)],
                  fill=(246, 238, 214), outline=(176, 158, 126))
    elif prop == 'ribbon':
        d.arc((x - 34, y - 22, x + 34, y + 26), 200, 340, fill=ac, width=8)
        d.line((x - 28, y + 6, x - 40, y + 20), fill=ac, width=5)
    elif prop == 'reins':
        d.arc((x - 38, y - 20, x + 38, y + 32), 20, 160, fill=(116, 78, 52), width=6)
        d.line((x - 26, y + 14, x + 26, y + 14), fill=(116, 78, 52), width=5)
    elif prop == 'key':
        d.ellipse((x - 18, y - 18, x + 2, y + 2), outline=ac, width=5)
        d.line((x, y, x + 30, y), fill=ac, width=5)
        d.line((x + 22, y, x + 22, y + 10), fill=ac, width=4)
    elif prop == 'name_strip':
        d.rounded_rectangle((x - 38, y - 12, x + 38, y + 12), radius=3,
                            fill=(244, 236, 208), outline=ink, width=3)
        for k in range(4):
            d.rectangle((x - 28 + k * 16, y - 5, x - 20 + k * 16, y + 5), fill=(92, 78, 66))
    elif prop == 'lantern':
        d.rounded_rectangle((x - 16, y - 20, x + 16, y + 18), radius=6,
                            fill=(246, 232, 176), outline=ink, width=3)
        d.arc((x - 20, y - 28, x + 20, y + 2), 180, 360, fill=ink, width=4)
        for k in range(10):
            # 纸片发光点以轻微摆动代替有序抖动棋盘
            jitter = int(2 * math.sin(t * 5 + k))
            da.ellipse((x - 28 + k * 6, y - 28 + jitter,
                        x - 22 + k * 6, y - 22 + jitter), fill=(*ac, 90))
    elif prop == 'flame':
        d.polygon([(x - 18, y + 14), (x, y - 26 - 6 * math.sin(t * 9)),
                   (x + 18, y + 14)], fill=ac, outline=(150, 76, 40))
        d.polygon([(x - 7, y + 12), (x, y - 10), (x + 7, y + 12)], fill=(250, 232, 160))
    elif prop == 'blank_book':
        d.rounded_rectangle((x - 34, y - 18, x + 34, y + 18), radius=4,
                            fill=(238, 234, 214), outline=ink, width=3)
        d.line((x, y - 16, x, y + 16), fill=(160, 150, 128), width=3)
    elif prop == 'reel':
        d.ellipse((x - 24, y - 24, x + 24, y + 24), outline=ac, width=6)
        for k in range(4):
            a = t * 2 + k * math.pi / 2
            d.line((x, y, x + 20 * math.cos(a), y + 20 * math.sin(a)), fill=ac, width=4)
    elif prop == 'note':
        d.rounded_rectangle((x - 20, y - 15, x + 20, y + 15), radius=3,
                            fill=(244, 236, 208), outline=ink, width=3)
        d.line((x - 12, y - 4, x + 12, y - 4), fill=(120, 106, 90), width=3)
    elif prop == 'placard':
        d.rounded_rectangle((x - 34, y - 16, x + 34, y + 16), radius=4,
                            fill=(232, 220, 188), outline=ink, width=3)
        d.line((x, y + 16, x, y + 34), fill=(96, 82, 64), width=6)
    elif prop == 'film_cell':
        d.rounded_rectangle((x - 32, y - 20, x + 32, y + 20), radius=3,
                            fill=(110, 124, 138), outline=ink, width=3)
        for k in range(4):
            d.rectangle((x - 30 + k * 16, y - 18, x - 24 + k * 16, y - 12), fill=(214, 214, 202))
    elif prop == 'paper':
        d.rounded_rectangle((x - 28, y - 20, x + 28, y + 20), radius=3,
                            fill=(244, 246, 232), outline=ink, width=3)
        for k in range(3):
            d.line((x - 18, y - 8 + k * 9, x + 18, y - 8 + k * 9), fill=(128, 112, 92), width=2)
    elif prop == 'clip':
        d.arc((x - 18, y - 20, x + 18, y + 20), 0, 300, fill=ac, width=6)
        d.line((x, y - 12, x, y + 18), fill=ac, width=4)
    elif prop == 'charred_paper':
        d.polygon([(x - 28, y - 20), (x + 24, y - 22), (x + 30, y + 16),
                   (x - 20, y + 20)], fill=(214, 190, 164), outline=(58, 40, 34), width=4)
        d.line((x - 18, y - 6, x + 18, y - 8), fill=(92, 70, 60), width=3)
    elif prop == 'umbrella':
        d.arc((x - 34, y - 26, x + 34, y + 18), 180, 360, fill=ac, width=7)
        d.line((x, y - 4, x, y + 30), fill=(82, 64, 52), width=5)
        d.arc((x, y + 24, x + 14, y + 38), 0, 180, fill=(82, 64, 52), width=4)
    elif prop == 'rice_bowl':
        d.ellipse((x - 28, y - 4, x + 28, y + 22), fill=(238, 234, 214), outline=ink, width=3)
        d.arc((x - 28, y - 10, x + 28, y + 22), 0, 180, fill=(246, 246, 232), width=4)
        for k in range(3):
            da.line((x - 10 + k * 10, y - 18, x - 14 + k * 10, y - 34),
                    fill=(246, 246, 232, 90), width=3)
    elif prop == 'glyph_block':
        d.rounded_rectangle((x - 20, y - 20, x + 20, y + 20), radius=3,
                            fill=(244, 236, 208), outline=ink, width=3)
        d.line((x - 10, y - 8, x + 10, y - 8), fill=(92, 78, 66), width=3)
        d.line((x, y - 12, x, y + 12), fill=(92, 78, 66), width=3)




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
                            fill=color, outline=(96, 76, 58), width=3)
        d.rectangle((x - width // 2 - 8, top, x + width // 2 + 8, top + 18), fill=(64, 70, 84), outline=(96, 76, 58), width=2)


def _arch(d, box, fill, outline, top_ratio=0.42):
    x0, y0, x1, y1 = box
    d.rectangle((x0, y0 + (y1 - y0) * top_ratio, x1, y1), fill=fill, outline=outline, width=5)
    d.pieslice((x0, y0, x1, y0 + (y1 - y0) * top_ratio * 2), 180, 360, fill=fill, outline=outline, width=5)
    d.line((x0, y1, x1, y1), fill=outline, width=5)


def _window(d, da, cx, cy, r, color, t):
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=color, outline=(96, 76, 58), width=6)
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
    d.ellipse((x0, y0, x1, y1), fill=color, outline=(96, 76, 58), width=8)
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
                        radius=8, fill=(30, 40, 50), outline=(104, 82, 62), width=4)
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
    """24 个剧本场景先画在独立透明纸卡上，再统一套纸边 / 纸板边 / 软投影。"""
    W, H = _w(), _h()
    card = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(card)
    da = ImageDraw.Draw(card, 'RGBA')
    lay = info['layout']
    ac = info['accent']

    # 大圆日/月与纸云已在 _paper_popup_layers 画过；这里只画各场景专属结构，
    # 不再叠第二套 alpha 椭圆，避免 paper-popup 的纸板边/白边被半透明圆冲掉。
    if lay == 'charred_corner':
        d.rounded_rectangle((70, 180, 520, 740), radius=18, fill=(166, 104, 104), outline=(96, 76, 58), width=6)
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
        d.rectangle((0, 0, 260, 760), fill=(196, 120, 142)); d.rectangle((W - 260, 0, W, 760), fill=(196, 120, 142))
        for k in range(7):
            x = k * 46
            da.polygon([(x, 0), (x + 30, 0), (x + 70, 760), (x + 20, 760)], fill=(180, 54, 68, 90))
        d.rectangle((260, 120, W - 260, 760), fill=(220, 150, 166))
        _book(d, 780, 650, _prog(t, wt, '翻开'), ac)
        cp = _prog(t, wt, '长出')
        if cp > 0:
            _castle(d, 1180, 650, 0.55 + 0.45 * cp, (176, 108, 142))
    elif lay == 'castle_night':
        _castle(d, 960, 700, 1.25, (128, 112, 168))
        _columns(d, (160, 460, 1460, 1760), 180, 760, (110, 96, 150), 46)
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
        _arch(d, (1320, 380, 1840, 760), (110, 134, 142), (24, 34, 40))
        da.ellipse((1380, 430, 1780, 760), fill=(104, 82, 62, 110))
        for k in range(6):
            da.line((100 + k * 300, 420, 180 + k * 300, 760), fill=(220, 226, 168, 30), width=8)
    elif lay == 'throne':
        _columns(d, (220, 560, 1360, 1700), 100, 760, (170, 130, 158), 48)
        d.rounded_rectangle((760, 240, 1160, 660), radius=18, fill=(196, 142, 166), outline=(58, 38, 56), width=6)
        d.polygon([(760, 240), (960, 120), (1160, 240)], fill=ac, outline=(92, 66, 48))
        _name_frame(d, 960, 640, _prog(t, wt, '塞不进'), (238, 196, 98))
    elif lay == 'cave':
        _cave(d, da, (260, 180, 1660, 760), (92, 128, 152), t)
        _lantern(d, da, 760, 380, _prog(t, wt, '月光'), (226, 238, 188), t)
        d.arc((1080, 430, 1380, 620), 180, 360, fill=(188, 160, 88), width=7)
        d.rectangle((1080, 540, 1380, 760), outline=(188, 160, 88), width=7)
        for x in range(1100, 1380, 42):
            da.line((x, 545, x + 10, 755), fill=(255, 246, 200, 80), width=3)
    elif lay == 'finale':
        for k in range(6):
            x = 80 + k * 330
            d.polygon([(x, 760), (x + 90, 470 - k % 2 * 60), (x + 210, 760)],
                      fill=(178, 112, 96), outline=(36, 22, 24), width=4)
        _stone(d, 1120, 740, _prog(t, wt, '石碑'), (112, 96, 88))
        fp = _prog(t, wt, '一口火')
        if fp > 0:
            for k in range(4):
                x = 560 + k * 120
                da.polygon([(x - 34, 740), (x + 34, 740), (x + 12 * math.sin(t * 7 + k), 740 - 220 * fp)],
                           fill=(246, 116 + k * 20, 46, int(150 * fp)))
    elif lay == 'dressing':
        _window(d, da, 760, 360, 220, (86, 118, 130), t)
        d.rounded_rectangle((120, 200, 420, 740), radius=16, fill=(126, 164, 176), outline=(32, 48, 58), width=5)
        for k in range(4):
            d.line((140, 300 + k * 100, 400, 300 + k * 100), fill=(104, 138, 148), width=5)
        d.ellipse((520, 670, 760, 740), fill=(92, 112, 120), outline=(40, 58, 66), width=4)
        d.line((640, 740, 640, 860), fill=(64, 82, 92), width=12)
    elif lay == 'archive':
        for x in (120, 420, 1480, 1780):
            d.rounded_rectangle((x - 90, 160, x + 90, 720), radius=10,
                                fill=(120, 142, 156), outline=(96, 76, 58), width=4)
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
        d.rectangle((0, 0, 300, 760), fill=(190, 120, 146)); d.rectangle((W - 300, 0, W, 760), fill=(190, 120, 146))
        d.rounded_rectangle((600, 420, 1320, 760), radius=14, fill=(210, 140, 156), outline=(58, 30, 42), width=6)
        _book(d, 960, 560, _prog(t, wt, '开始'), ac)
        d.line((1320, 560, 1460, 460), fill=(96, 82, 66), width=10)
        d.ellipse((1440, 430, 1500, 490), fill=ac, outline=(92, 68, 44), width=4)
    elif lay == 'split_stage':
        d.rectangle((0, 0, 920, 760), fill=(150, 150, 190)); d.rectangle((920, 0, W, 760), fill=(172, 160, 200))
        d.line((920, 0, 920, 760), fill=(96, 76, 58), width=12)
        d.rounded_rectangle((120, 540, 760, 760), radius=10, fill=(92, 80, 68), outline=(44, 38, 34), width=5)
        d.rounded_rectangle((200, 570, 680, 730), radius=6, fill=(236, 232, 210), outline=(150, 140, 120), width=3)
        _arch(d, (1160, 220, 1800, 760), (90, 76, 118), (40, 34, 60))
    elif lay == 'placard_hall':
        _columns(d, (180, 620, 1300, 1740), 100, 760, (142, 154, 180), 44)
        for x, col in ((620, (238, 196, 88)), (1300, (196, 96, 120))):
            d.line((x, 360, x, 740), fill=(96, 82, 64), width=12)
            d.rounded_rectangle((x - 170, 400, x + 170, 540), radius=8,
                                fill=(232, 220, 188), outline=(112, 88, 58), width=5)
            d.polygon([(x - 40, 400), (x, 360), (x + 40, 400)], fill=col)
            d.line((x - 120, 450, x + 100, 450), fill=(96, 78, 58), width=4)
            d.line((x - 120, 485, x + 60, 485), fill=(120, 100, 78), width=3)
    elif lay == 'lantern_hall':
        _columns(d, (200, 600, 1000, 1400, 1740), 80, 760, (106, 122, 150), 46)
        for k, x in enumerate((380, 820, 1240, 1620)):
            _lantern(d, da, x, 260, 0.75 + 0.25 * math.sin(t + k), (226, 238, 188), t)
        d.polygon([(0, 760), (W, 760), (W - 260, 430), (260, 430)], fill=(96, 112, 140))
        da.ellipse((620, 280, 1300, 760), fill=(226, 238, 188, 24))
    elif lay == 'film_wall':
        for r in range(3):
            for c in range(6):
                x, y = 120 + c * 290, 120 + r * 190
                d.rounded_rectangle((x, y, x + 220, y + 130), radius=8,
                                    fill=(110, 124, 138), outline=(104, 82, 62), width=4)
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
        d.rounded_rectangle((160, 460, 1760, 760), radius=14, fill=(130, 158, 158), outline=(34, 50, 52), width=6)
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
        d.rounded_rectangle((240, 220, 620, 740), radius=12, fill=(146, 112, 96), outline=(34, 26, 24), width=5)
        for k in range(4):
            d.line((280, 300 + k * 100, 580, 300 + k * 100), fill=(108, 82, 64), width=6)
        da.polygon([(1280, 520), (1440, 480), (1420, 660), (1260, 640)], fill=(46, 40, 36, 220))
    elif lay == 'hallway':
        _arch(d, (640, 120, 1280, 760), (116, 150, 166), (96, 76, 58))
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
        d.rounded_rectangle((180, 480, 1740, 760), radius=16, fill=(156, 124, 160), outline=(44, 32, 50), width=6)
        _name_frame(d, 960, 540, _prog(t, wt, '一个字一个字'), ac)
        _glyph_blocks(d, 960, 540, _prog(t, wt, '塞回框'), ac)
        for k in range(3):
            d.ellipse((320 + k * 540, 300, 380 + k * 540, 360), fill=ac, outline=(92, 68, 48), width=3)

    # 把整张场景纸卡外扩出灰纸板边、米白纸边、墨线与软投影，再落到暖纸底上。
    # 1/4 分辨率做形态学，避免全高清 MaxFilter 拖慢 3756 帧渲染。
    small = card.getchannel('A').resize((W // 4, H // 4), Image.Resampling.BOX)
    solid = small.point(lambda v: 255 if v >= 150 else 0)
    edge_m = ImageChops.subtract(solid.filter(ImageFilter.MaxFilter(7)), solid)
    border_m = ImageChops.subtract(solid.filter(ImageFilter.MaxFilter(5)), solid)
    shadow_m = solid.filter(ImageFilter.GaussianBlur(2)).point(lambda v: int(v * 0.28))
    edge_m = edge_m.resize((W, H), Image.Resampling.NEAREST)
    border_m = border_m.resize((W, H), Image.Resampling.NEAREST)
    shadow_m = shadow_m.resize((W, H), Image.Resampling.BILINEAR)
    out = im.convert('RGBA')

    def paste_mask(mask, color, dx=0, dy=0):
        layer = Image.new('RGBA', (W, H), (*color, 0))
        layer.putalpha(mask)
        holder = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        holder.alpha_composite(layer, (dx, dy))
        return holder

    out.alpha_composite(paste_mask(shadow_m, PAPER_SHADOW, 8, 12))
    out.alpha_composite(paste_mask(edge_m, PAPER_EDGE))
    out.alpha_composite(paste_mask(border_m, PAPER_BORDER))
    out.alpha_composite(card)
    im.paste(out.convert('RGB'), (0, 0))

    # 纸片舞台、折痕、纸屑与暖光，不是像素网格 / 砖墙 / RPG 元素。
    _paper_stage(im, info, t)
    _paper_ambient(im, info, t)


def draw_script_backdrop(t: float, line: int, wt: dict, frac: float) -> Image.Image:
    """背景：暖纸 + 三层 pop-up 纸片 + 24 个剧本场景 + 纸纹柔化。

    摄影机用 LANCZOS 平滑移动，不像素化；电视外壳随后固定贴上，保证 v3 几何不变。
    """
    info = _scene_info(line)
    im = _paper_base_image(info, t)
    _paper_popup_layers(im, info, t, frac)
    _layout(im, info, t, wt, frac)
    im = _paper_soften(im)
    im = _paper_grain(im)
    im = CTX['apply_sample_camera'](im, info.get('move', 'static'), frac, t)
    d = ImageDraw.Draw(im)
    CTX['draw_tv_body'](d)
    return im


def draw_script_props(im: Image.Image, t: float, line: int, wt: dict,
                      frac: float, inks: list[float], cue: dict) -> None:
    """剧本道具；纸片交接/关系线/词点粒子在人物之后绘制，不贴 MV 真帧。"""
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




# ---------------------------------------------------------------------------
# v10 人物层：8 张安全纸片 + 语义一次性姿态 + 道具交接互动
# ---------------------------------------------------------------------------

@lru_cache(maxsize=256)
def _safe_cutout(key: str, frame: int, size: tuple[int, int], flip: bool,
                 charred: bool) -> Image.Image:
    """缓存 cut-paper 白边/纸板边；同一张安全图集不再每帧重复 MaxFilter。"""
    sp = CTX['sprite_frame'](key, frame, size, flip, charred)
    return _cutout_sprite(sp)


@lru_cache(maxsize=32)
def _prop_cut_cached(prop: str, scale: float) -> Image.Image:
    bw, bh = 100, 92
    tile = Image.new('RGBA', (bw, bh), (0, 0, 0, 0))
    td, tda = ImageDraw.Draw(tile), ImageDraw.Draw(tile, 'RGBA')
    _draw_prop(td, tda, prop, bw / 2, bh / 2, 1.0, (236, 206, 132), 0.0)
    tile = tile.resize((int(bw * scale), int(bh * scale)), Image.Resampling.LANCZOS)
    return _cutout_sprite(tile)


def _paper_prop_echo(im: Image.Image, prop: str, x: float, y: float,
                     fade: float, scale: float = 0.85) -> None:
    """掌心纸片回响：交接前在给出者掌心渐显、到达后在接收者掌心渐隐。"""
    fade = min(1.0, max(0.0, fade))
    if fade <= 0.01:
        return
    cut = _prop_cut_cached(prop, scale).copy()
    cut.putalpha(cut.getchannel('A').point(lambda v: int(v * fade)))
    im.paste(cut, (int(x - cut.width / 2), int(y - cut.height / 2)), cut)


def _v10_handover(line: int, t: float, cue: dict, wt: dict) -> dict:
    """与 _handover_geom 同一几何，但整个交接窗口都返回，用于画两掌连线与回响。"""
    prop, frm, to = HANDOVERS[line]
    actors = {e['who']: e for e in SCRIPT_INTERACTIONS[line]}
    words = sorted(CTX['WORD_TRIGGERS'][line], key=lambda w: wt[w])
    tw = wt[words[min(2, len(words) - 1)]]
    u = _ease((t - tw) / 0.72)
    sx, sy = _hand_xy(actors[frm], t, cue, wt)
    ex, ey = _hand_xy(actors[to], t, cue, wt)
    return dict(prop=prop, frm=frm, to=to, tw=tw, u=u, sx=sx, sy=sy, ex=ex, ey=ey,
                x=_lerp(sx, ex, u), y=_lerp(sy, ey, u), end=float(cue['end']))


def _paper_state_interaction(im: Image.Image, t: float, line: int,
                             cue: dict, wt: dict) -> None:
    """把「互动」画清楚：两掌到道具的连线、掌心回响、到达火花；不新增人物。"""
    g = _v10_handover(line, t, cue, wt)
    if not (g['tw'] - 0.22 <= t <= g['tw'] + 1.10):
        return
    ac = _scene_info(line)['accent']
    da = ImageDraw.Draw(im, 'RGBA')
    for px, py in ((g['sx'], g['sy']), (g['ex'], g['ey'])):
        da.line((px, py, g['x'], g['y']), fill=(*PAPER_INK, 84), width=3)
        da.ellipse((px - 6, py - 6, px + 6, py + 6), fill=(*PAPER_BORDER, 150))
    pre = _ease((t - (g['tw'] - 0.22)) / 0.22) if t < g['tw'] else 1.0
    arrive = _ease((t - (g['tw'] + 0.72)) / 0.30)
    _paper_prop_echo(im, g['prop'], g['sx'], g['sy'], min(0.80, pre * (1 - g['u']) * 0.80), 0.85)
    _paper_prop_echo(im, g['prop'], g['ex'], g['ey'], min(0.68, arrive * 0.68), 0.72)
    if 0 <= t - (g['tw'] + 0.72) <= 0.40:
        p = (t - (g['tw'] + 0.72)) / 0.40
        a = int(190 * (1 - p))
        for k in range(8):
            ang = math.pi / 4 * k + 0.12
            r = 26 + 34 * p
            x, y = g['ex'] + r * math.cos(ang), g['ey'] + r * math.sin(ang)
            da.line((x, y, x + 9 * math.cos(ang), y + 9 * math.sin(ang)),
                    fill=(*ac, a), width=5)
        da.ellipse((g['ex'] - 9, g['ey'] - 9, g['ex'] + 9, g['ey'] + 9),
                   fill=(*PAPER_BORDER, a))


def _reaction_marks(im: Image.Image, x: float, y: float, size: tuple[int, int],
                    u: float, ac, extra: str) -> None:
    """一次性 follow-through 提示：头侧两道纸片弧 + 状态小记号；不是新表情图。"""
    if u <= 0.0 or u >= 1.0:
        return
    da = ImageDraw.Draw(im, 'RGBA')
    a = int(125 * math.sin(math.pi * u))
    hx, hy = x + size[0] * 0.5, y + size[1] * 0.18
    for k in (-1, 1):
        da.arc((hx - 30 + k * 10, hy - 14, hx + 30 + k * 10, hy + 20),
               205, 335, fill=(*ac, a), width=4)
    if extra in ('point', 'press', 'write', 'spread'):
        yy = y + size[1] * 0.58
        da.line((hx - 22, yy, hx + 22, yy), fill=(*ac, a), width=4)


def draw_script_actors(im: Image.Image, t: float, line: int,
                       cue: dict, wt: dict) -> None:
    """v10：每人只用一张双脚可见的正面站立纸片；动作靠一次性姿态 + 道具交接表达。

    固定 x 点位、硬切、v9 paper-popup 背景/电视锁死全部不变。没有整句横穿、
    没有步态循环、没有 idle/act/reaction 三套姿态混合，也不切第三张表情图。
    """
    C = CTX
    CAST = C['CAST']
    da = ImageDraw.Draw(im, 'RGBA')
    end = float(cue['end'])
    g = _v10_handover(line, t, cue, wt)
    states = SCENE_STATES[line]
    info = _scene_info(line)
    ac = info['accent']

    for e in sorted(SCRIPT_INTERACTIONS[line], key=lambda x: x['z']):
        who = e['who']
        key = SAFE_SHEET_BY_WHO[who]
        scale = e['scale'] or STAGE_SCALE[who]
        size = tuple(max(1, int(v * scale)) for v in CAST[who]['size'])
        x, y, _ = _actor_pose(e, t, cue, wt)
        flip = e['flip'] if e['flip'] is not None else (e['x'] > 960)
        charred = bool(e['charred'])

        if who == g['frm']:
            role, state = 'give', states[0]
        elif who == g['to']:
            role, state = 'receive', states[1]
        else:
            role, state = 'watch', 'watch'
        lean, lift, tilt, nod, extra = STATE_PARAMS[state]

        # anticipation → action → follow-through：一次性钟形动作，不循环。
        u = _ease((t - g['tw']) / max(0.6, end - g['tw'])) if t >= g['tw'] else 0.0
        bell = math.sin(math.pi * min(1.0, u)) if u > 0 else 0.0
        anti = _ease((t - (g['tw'] - 0.24)) / 0.24) if g['tw'] - 0.24 <= t < g['tw'] else 0.0
        settle = math.exp(-3.2 * (t - (g['tw'] + 0.75))) if t > g['tw'] + 0.75 else 0.0
        toward = 1 if e['x'] < 960 else -1
        dx = lean * 18 * bell * toward - lean * 6 * anti * toward
        dy = -lift * bell + 4 * anti - 1.2 * math.sin(t * 2.2 + e['phase'])

        fi = 0 if t < g['tw'] else min(len(SAFE_FRAMES) - 1, int(u * len(SAFE_FRAMES)))
        sp = _safe_cutout(key, SAFE_FRAMES[fi], size, flip, charred)
        ang = tilt * bell * toward
        if abs(ang) > 0.15:
            sp = sp.rotate(ang, resample=Image.Resampling.BILINEAR,
                           expand=False, fillcolor=(0, 0, 0, 0))
        if settle > 0.02 and nod > 0 and role != 'watch':
            nh = max(1, int(sp.height * (1 - 0.012 * nod * settle)))
            sp = sp.resize((sp.width, nh), Image.Resampling.BILINEAR)

        xi, yi = int(round(x + dx)), int(round(y + dy))
        half = size[0] * 0.30
        da.ellipse((xi + size[0] / 2 - half, 732, xi + size[0] / 2 + half, 752),
                   fill=(74, 56, 42, 70))
        im.paste(sp, (xi - CUTOUT_PAD, yi - CUTOUT_PAD), sp)
        _reaction_marks(im, xi, yi, size, u, ac, extra)

    _paper_interaction_links(im, t, line, cue, wt)
    _paper_handover_props(im, t, line, cue, wt)
    _paper_state_interaction(im, t, line, cue, wt)
    _paper_impact_particles(im, t, line, cue, wt)
