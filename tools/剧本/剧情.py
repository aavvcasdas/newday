#!/usr/bin/env python3
"""剧情承接与当集故事卡检查。

先读 agent.md。先写本集行动，再接上一集留在桌上的事。
不设句长门禁。12、15、18、20、25、201 这些数字不再用来退稿。
story_card.json 只检查结构骨架，不能代替人工判断剧情和笑点。
"""

import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from rules_config import BAN_WORDS, text_redlines

# 只作说明。代码不拿这些数字判失败。
RETIRED_LENGTH_GATES = (12, 15, 18, 20, 25, 201)
GUESTS = ("豆包", "大小姐", "千问", "Kimi", "Gemini", "智谱", "Grok", "龙娘")
PARTICLES = set("呀啦吧嘛诶呜呢哦哇啊哼嘿")
GENERIC = {"本鲸能闲着", "也帮着留意", "这份力", "换它出", "它懂"}
LEAD_LINES = 2
FOLLOW_LINES = 18


def load_lines(path):
    lines = []
    for raw in Path(path).read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if line and not line.startswith("#"):
            lines.append(line)
    if not lines:
        raise ValueError(f"没有台词：{path}")
    return lines


def load_story_card(path):
    if not path:
        return None
    path = Path(path)
    try:
        card = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise ValueError(f"故事卡不是有效 JSON：{path}：{exc.msg}") from exc
    if not isinstance(card, dict):
        raise ValueError(f"故事卡必须是 JSON 对象：{path}")
    return card


def clauses(lines):
    """标点切开的原句片段。承接要能对上这些字，不是只写「昨天」。"""
    found = []
    seen = set()
    for line in lines:
        for part in re.split(r"[，。！？、；：\s]+", line):
            part = part.strip("「」“”『』")
            han = re.sub(r"[^\u4e00-\u9fff]", "", part)
            if len(han) < 3 or han in GENERIC or han in seen:
                continue
            seen.add(han)
            found.append(han)
    return found


def hits(text, items):
    return [item for item in items if item and item in text]


def ends_with_particle(line):
    core = re.sub(r"[。！？!?…\s]", "", line)
    return bool(core) and core[-1] in PARTICLES


def han_len(line):
    return len(re.sub(r"[^\u4e00-\u9fff]", "", line))


def _terms(block, key):
    if not isinstance(block, dict):
        return []
    value = block.get(key, [])
    if isinstance(value, str):
        return [value]
    return [str(item) for item in value if str(item)] if isinstance(value, list) else []


def _line_window(lines, count, tail=False):
    try:
        count = max(1, int(count))
    except (TypeError, ValueError):
        count = 2
    return "\n".join(lines[-count:] if tail else lines[:count])


def check_story_card(curr, card):
    """检查当集必须出现的行动、梗、推进和结果。没有卡时不额外限制题材。"""
    if not card:
        return []
    errors = []
    full = "\n".join(curr)

    opening = card.get("opening") or {}
    opening_text = _line_window(curr, opening.get("lines", 2))
    missing = [term for term in _terms(opening, "all") if term not in opening_text]
    if missing:
        errors.append("开头没有先说清本集求助行动；缺少：" + "、".join(missing))

    theme = card.get("theme") or {}
    theme_text = _line_window(curr, theme.get("lines", 8))
    theme_terms = _terms(theme, "any")
    if theme_terms and not any(term in theme_text for term in theme_terms):
        errors.append("开头行动之后没有尽快进入本集主题：" + "、".join(theme_terms))

    meme = card.get("meme") or {}
    meme_text = _line_window(curr, meme.get("lines", 12))
    missing = [term for term in _terms(meme, "all") if term not in meme_text]
    if missing:
        errors.append("本集公共梗没有说完整，不能只留一个专名；缺少：" + "、".join(missing))

    progress_terms = _terms(card.get("progress") or {}, "any")
    if progress_terms and not any(term in full for term in progress_terms):
        errors.append("只复述了上一集，没有说明本集怎样在已有进度上继续：" + "、".join(progress_terms))

    result_terms = _terms(card.get("result") or {}, "any")
    if result_terms and not any(term in full for term in result_terms):
        errors.append("客人没有留下故事卡要求的有用结果：" + "、".join(result_terms))

    hook = card.get("next_hook") or {}
    hook_text = _line_window(curr, hook.get("lines", 4), tail=True)
    hook_terms = _terms(hook, "any")
    if hook_terms and not any(term in hook_text for term in hook_terms):
        errors.append("结尾没有留下一个可兑现的下一步：" + "、".join(hook_terms))

    forbidden = [term for term in _terms(card, "forbidden") if term in full]
    if forbidden:
        errors.append("旧支线残留，和本集主线混在一起：" + "、".join(forbidden))
    return errors


def check(curr, prev, guest=None, story_card=None):
    """返回 (errors, notes)。errors 为空才算结构通过。不检查句长。"""
    if not curr or not prev:
        raise ValueError("上一集和本集都不能是空稿")
    errors = []
    tail = clauses(prev[-12:])
    head = clauses(prev[:6])
    full = "\n".join(curr)
    lead = "\n".join(curr[:LEAD_LINES])
    follow = "\n".join(curr[LEAD_LINES:LEAD_LINES + FOLLOW_LINES])
    early = "\n".join(curr[:LEAD_LINES + FOLLOW_LINES])
    tail_hit = hits(follow, tail)
    # 第二句可以同时点客人并交代上集任务，不应机械地把这句从承接里扣掉。
    head_hit = hits(early, head)
    present = [name for name in GUESTS if name in full]
    if len(present) > 1:
        errors.append("一天只接一个客人，口播里同时出现：" + "、".join(present))
    if guest:
        if guest not in GUESTS:
            errors.append(f"不认识的客人：{guest}")
        elif guest not in lead:
            errors.append(f"{guest}没有提前。前两句说明她为什么来、帮什么忙")
    elif present and not any(name in lead for name in present):
        errors.append("客人没有提前。前两句交代客人和本集任务")
    if len(tail_hit) < 2:
        show = "、".join(tail_hit) if tail_hit else "无"
        errors.append(
            "点完客人之后，没有接上一日结尾留在桌上的事。"
            f"命中：{show}。可接：{'、'.join(tail[:8]) or '无'}"
        )
    if not head_hit:
        errors.append(
            "没有接上一日开头留下的任务。"
            f"可接：{'、'.join(head[:6]) or '无'}"
        )
    errors.extend(check_story_card(curr, story_card))
    errors.extend(text_redlines(curr))
    banned = sorted({word for word in BAN_WORDS for line in curr if word in line})
    if banned:
        errors.append("命中过审黑名单：" + "、".join(banned))
    tailed = [line for line in curr if ends_with_particle(line)]
    if tailed:
        errors.append("句尾语气词：" + " / ".join(tailed[:4]))
    for index, line in enumerate(curr, 1):
        if re.search(r"笨鱼[说问答道叫喊]", line) or "笨鱼：「" in line or "笨鱼:" in line:
            errors.append(f"L{index} 笨鱼不新增对白")
    longest = max(han_len(line) for line in curr)
    notes = [
        "上一集开头留下的任务：" + "、".join(head[:6]),
        "上一集结尾留在桌上：" + "、".join(tail[:8]),
        "本集接上：" + ("、".join(dict.fromkeys(head_hit + tail_hit)) or "无"),
        f"最长句{longest}字。句长门禁不启用：{'/'.join(str(n) for n in RETIRED_LENGTH_GATES)}",
    ]
    if story_card:
        notes.append("已检查当集故事卡；结构通过不等于剧情审美自动通过")
    return errors, notes


def main(argv=None):
    ap = argparse.ArgumentParser(description="检查新集承接与故事卡，不按字数退稿")
    ap.add_argument("--prev", required=True, help="上一集锁定口播")
    ap.add_argument("--txt", help="本集口播。和 --card 一起用时先印承接，再检查")
    ap.add_argument("--guest", help="今天只允许这一位客人；故事卡也可指定")
    ap.add_argument("--story-card", type=Path, help="当集 story_card.json；缺省自动读取台词同目录")
    ap.add_argument("--card", action="store_true", help="只印上一集留在桌上的原句，不判本集")
    args = ap.parse_args(argv)
    prev = load_lines(args.prev)
    if args.card and not args.txt:
        head = clauses(prev[:6])
        tail = clauses(prev[-12:])
        print("剧情承接卡")
        print("开头留下的任务：" + "、".join(head[:6]))
        print("结尾留在桌上：" + "、".join(tail[:8]))
        print("句长门禁不启用。先写本集行动，再接这些事。先读 agent.md。")
        return 0
    if not args.txt:
        ap.error("检查本集时必须给 --txt")
    curr = load_lines(args.txt)
    story_path = args.story_card
    if story_path is None:
        candidate = Path(args.txt).resolve().parent / "story_card.json"
        if candidate.is_file():
            story_path = candidate
    story_card = load_story_card(story_path)
    card_guest = str((story_card or {}).get("guest") or "").strip() or None
    if args.guest and card_guest and args.guest != card_guest:
        raise ValueError(f"客人不一致：参数是{args.guest}，故事卡是{card_guest}")
    guest = args.guest or card_guest
    errors, notes = check(curr, prev, guest, story_card=story_card)
    print(f"剧情承接 · {args.txt}")
    if story_path:
        print(f"当集故事卡 · {story_path}")
    for note in notes:
        print("  " + note)
    print()
    if errors:
        print("不合格。补的是行动、承接和结果，不是字数：")
        for item in errors:
            print("  - " + item)
        return 1
    print("通过。结构骨架齐；没有用句长退稿。仍需人工读剧情和笑点。")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (ValueError, OSError) as exc:
        sys.exit(f"不合格：{exc}")
