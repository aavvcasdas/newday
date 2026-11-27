#!/usr/bin/env python3
"""让 dsh-bili-whale 改读 skill 生成的人设文件，而不是原装 ~/.bili-ai/persona.md。

做什么：
  在 lib/scheduler.js 里，把
      path.join(HOME, '.bili-ai', 'persona.md')
  改成
      path.join(HOME, '.dsh', 'whale-persona-skill.md')
  并把提示里的「她的人设」标签改成「鲸鲸人设 skill」。

安全：改前备份 *.bak-skill-persona-<时间戳>；幂等（有 .skill-persona-patched 标记就跳过）。
用法：
  python scripts/patch_bili_whale_skill_persona.py
"""
import argparse
import os
import shutil
import sys
import time

DEFAULT = os.path.join(os.path.expanduser("~"), ".dsh", "profiles", "desktop", "node_modules", "dsh-bili-whale")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", default=DEFAULT)
    args = ap.parse_args()
    base = args.dir
    if not os.path.isdir(base):
        print(f"找不到插件目录：{base}")
        return 2
    marker = os.path.join(base, ".skill-persona-patched")
    if os.path.exists(marker):
        print("已有 .skill-persona-patched 标记，跳过。")
        return 0

    path = os.path.join(base, "lib", "scheduler.js")
    t = open(path, encoding="utf-8").read()
    if "whale-persona-skill.md" in t:
        print("scheduler.js 已是 skill 人设路径，跳过。")
        return 0

    old1 = "path.join(HOME, '.bili-ai', 'persona.md')"
    new1 = "path.join(HOME, '.dsh', 'whale-persona-skill.md')"
    old2 = "path.join(HOME,'.bili-ai','persona.md')"
    new2 = "path.join(HOME,'.dsh','whale-persona-skill.md')"
    if old1 not in t and old2 not in t:
        print("没找到 persona.md 路径，可能版本不同，未修改。")
        return 1
    t = t.replace(old1, new1).replace(old2, new2)
    t = t.replace("［她的人设］以下是她专属的设定", "［鲸鲸人设 skill］以下是本 skill 生成的设定")
    t = t.replace("人设文件优先", "skill 人设优先")

    stamp = time.strftime("%Y%m%d-%H%M%S")
    shutil.copyfile(path, f"{path}.bak-skill-persona-{stamp}")
    open(path, "w", encoding="utf-8").write(t)
    open(marker, "w", encoding="utf-8").write("patched by dsh-bili-whale-persona\n")
    print("scheduler.js 已改为读取 ~/.dsh/whale-persona-skill.md")
    print("（DSH 重启后生效）")
    return 0


if __name__ == "__main__":
    sys.exit(main())
