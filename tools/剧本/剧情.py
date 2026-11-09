#!/usr/bin/env python3
"""文案底线检查（2026-11-09：用户删除五类文案门禁后的版本）。

已删除的门禁（不再检查、不再退稿）：
  1. 三拍顺序（找新朋友来帮忙 → 求职梗 → 接上一集）；
  2. 一天一客（GUESTS 名单与客人数量）；
  3. 接上上一集开头/结尾原句的命中数；
  4. 零句尾语气词；
  5. 零阿拉伯数字。

保留的底线：空稿、自称口径、过审黑名单、笨鱼不新增对白。
机器只查这几项，不代替人设、因果、节奏与好不好看的人工审读；
也不按 12/15/18/20/25/201 字退稿（句长门禁早已停用）。
"""

import argparse
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from rules_config import BAN_WORDS, text_redlines

RETIRED_GATES = (
    "三拍顺序", "一天一客", "接上上一集开头/结尾原句", "零句尾语气词", "零阿拉伯数字",
)


def load_lines(path):
    lines = []
    for raw in Path(path).read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if line and not line.startswith("#"):
            lines.append(line)
    if not lines:
        raise ValueError(f"没有台词：{path}")
    return lines


def han_len(line):
    return len(re.sub(r"[^\u4e00-\u9fff]", "", line))


def check(curr, prev=None, guest=None):
    """返回 (errors, notes)。prev / guest 仅保留调用兼容，不再参与判定。"""
    if not curr:
        raise ValueError("本集不能是空稿")
    errors = []
    full = "\n".join(curr)
    errors.extend(text_redlines(curr))
    banned = sorted({word for word in BAN_WORDS for line in curr if word in line})
    if banned:
        errors.append("命中过审黑名单：" + "、".join(banned))
    for index, line in enumerate(curr, 1):
        if re.search(r"笨鱼[说问答道叫喊]", line) or "笨鱼：「" in line or "笨鱼:" in line:
            errors.append(f"L{index} 笨鱼不新增对白")
    longest = max(han_len(line) for line in curr)
    notes = [
        "已删除门禁：" + "、".join(RETIRED_GATES) + "。",
        "仅检查底线（自称口径 / 黑名单 / 笨鱼对白）；因果、人格、节奏仍须人工审读。",
        f"最长句{longest}字。句长门禁不启用。",
    ]
    return errors, notes


def main(argv=None):
    ap = argparse.ArgumentParser(description="文案底线检查；五类文案门禁已按用户要求删除")
    ap.add_argument("--prev", help="上一集口播：仅作阅读参考，不再用于判定")
    ap.add_argument("--txt", help="本集口播")
    ap.add_argument("--guest", help="兼容旧调用，不再校验客人")
    ap.add_argument("--card", action="store_true", help="打印上一集参考卡（非门禁）")
    args = ap.parse_args(argv)

    prev_path = Path(args.prev) if args.prev else None
    if prev_path and not prev_path.is_file():
        raise ValueError(f"上一集口播不存在：{prev_path}")
    if args.card:
        print("参考卡（非门禁，不再要求命中上一集原句）")
        if prev_path:
            prev = load_lines(prev_path)
            print("上一集开头：" + " / ".join(prev[:6]))
            print("上一集结尾：" + " / ".join(prev[-12:]))
        print("已删除门禁：" + "、".join(RETIRED_GATES))
        print("句长门禁不启用。")
        return 0
    if not args.txt:
        ap.error("检查本集时必须给 --txt")
    curr = load_lines(args.txt)
    errors, notes = check(curr)
    print(f"文案底线检查 · {args.txt}")
    for note in notes:
        print("  " + note)
    print()
    if errors:
        print("不合格：")
        for item in errors:
            print("  - " + item)
        return 1
    print("底线检查通过。五类文案门禁已删除；不代表人设与剧情已获人工批准。")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (ValueError, OSError) as exc:
        sys.exit(f"不合格：{exc}")
