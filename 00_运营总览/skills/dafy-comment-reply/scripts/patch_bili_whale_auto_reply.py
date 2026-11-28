#!/usr/bin/env python3
"""把 dsh-bili-whale 的评论监听从「其他人先审草稿」改成「自动直接回复」。

改动位置：lib/scheduler.js 里评论监听提示词（「对方是其他人」那一段）。
改后：
  - 其他人 → 直接 comment --auto --dry → --go → thread 复核
  - 附带锐评规矩：先接住原话再补一刀；梗贴切才加；不人身/地域/性别/真人梗

安全：改前备份 *.bak-auto-reply-<时间戳>；有 .auto-reply-patched 标记就跳过。
用法：python scripts/patch_bili_whale_auto_reply.py [--dir <插件目录>]
"""
import argparse
import os
import shutil
import sys
import time

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

DEFAULT = os.path.join(os.path.expanduser("~"), ".dsh", "profiles", "desktop", "node_modules", "dsh-bili-whale")

NEW_BLOCK = [
    "      '   · 对方是**其他人** → 直接回（自动回复模式）✓：',",
    "      '     `node bili.mjs comment --oid <oid> --root <root> --parent <parent> --message \"…\" --auto --dry` → `--go` → `thread` 复核 ✓',",
    "      '     锐评规矩：先接住原话再补一刀；梗贴切才加、最多一个；不人身/地域/性别/真人梗；一条收住不缠斗 ✓',",
    "      '4) 自动回复模式：不再进草稿审核；每条仍先 --dry、发后 thread 复核 ✓',",
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", default=DEFAULT)
    args = ap.parse_args()
    base = args.dir
    if not os.path.isdir(base):
        print("找不到插件目录：" + base)
        return 2
    marker = os.path.join(base, ".auto-reply-patched")
    if os.path.exists(marker):
        print("已有 .auto-reply-patched 标记，跳过。")
        return 0

    path = os.path.join(base, "lib", "scheduler.js")
    lines = open(path, encoding="utf-8").read().split("\n")
    start = None
    for i, line in enumerate(lines):
        if "对方是**其他人**" in line:
            start = i
            break
    if start is None:
        print("没找到「对方是其他人」提示词，可能版本不同，未修改。")
        return 1
    # 确认后面三行是草稿审核流程
    if not ("reply-draft add" in lines[start + 1] and "add 会自动把草稿推到我微信" in lines[start + 2] and "主人回了「发」" in lines[start + 3]):
        print("提示词结构不符合预期，未修改（避免误改）。")
        return 1
    old = lines[start:start + 4]
    lines[start:start + 4] = NEW_BLOCK
    stamp = time.strftime("%Y%m%d-%H%M%S")
    shutil.copyfile(path, path + ".bak-auto-reply-" + stamp)
    open(path, "w", encoding="utf-8").write("\n".join(lines))
    open(marker, "w", encoding="utf-8").write("patched by dafy-comment-reply\n")
    print("已改为自动回复评论（其他人也直接回）。重启 DSH 后生效。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
