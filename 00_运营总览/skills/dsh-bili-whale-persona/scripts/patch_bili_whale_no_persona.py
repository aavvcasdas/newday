#!/usr/bin/env python3
"""去掉 dsh-bili-whale 插件里的「人设卡」。

做什么：
  1. lib/client.js：删掉「她是谁」三个字段（角色名/怎么称呼你/怎么自称）
     和「她的人设（只属于她）」整块编辑器，以及分组里的引用。
  2. lib/index.js：删掉 /dsh-bili/api/persona 路由（人设不再从插件设置页管理）。
  3. 保留 scheduler.js 对 ~/.bili-ai/persona.md 的读取——该文件改由
     dsh-bili-whale-persona-toggle 插件在「启动人设」时写入，「停止」时清空。

安全：改前自动备份 *.bak-no-persona-<时间戳>；幂等（重复跑不会二次改）。
用法：
  python scripts/patch_bili_whale_no_persona.py
  python scripts/patch_bili_whale_no_persona.py --dir "C:/path/to/dsh-bili-whale"
"""
import argparse
import os
import re
import shutil
import sys
import time

DEFAULT = os.path.join(os.path.expanduser("~"), ".dsh", "profiles", "desktop", "node_modules", "dsh-bili-whale")


def backup(path):
    stamp = time.strftime("%Y%m%d-%H%M%S")
    dst = f"{path}.bak-no-persona-{stamp}"
    shutil.copyfile(path, dst)
    return dst


def patch_client(path):
    t = open(path, encoding="utf-8").read()
    if "personaBlock" not in t and "她是谁" not in t:
        print("  client.js 已是干净版，跳过")
        return False
    orig = t

    # 1) 三个字段
    t = re.sub(
        r'\n\s*\{ group: "她是谁", path: \["persona", "name"\].*?\},\n'
        r'\s*\{ group: "她是谁", path: \["persona", "ownerTitle"\].*?\},\n'
        r'\s*\{ group: "她是谁", path: \["persona", "selfClaim"\].*?\},',
        "\n",
        t,
        flags=re.S,
    )

    # 2) personaBlock 整块
    t = re.sub(r"\n      const personaBlock = \(\) => \[.*?\n      \];\n", "\n", t, flags=re.S)

    # 3) group() 里的人设块引用（同时补回 group 的右括号）
    t = re.sub(
        r'\n\s*rows\(name\),\n\s*// 2026-10-21：人设块放在这三个字段【下面】✓（主人要求）\n\s*name === "她是谁" \? h\("div", null, personaBlock\(\)\) : null\);',
        "\n        rows(name));",
        t,
    )

    # 4) 账号分组里的 group("她是谁")
    t = t.replace('group("你（主人）"),group("她是谁"));', 'group("你（主人）"));')

    # 5) 会话成本里跟人设去重相关的开关
    t = re.sub(r'\n\s*\{group:"会话成本",path:\["personaOncePerSession"\].*?\},', "", t, flags=re.S)

    if t == orig:
        print("  client.js 没有匹配到可删内容（可能版本不同），未修改")
        return False
    backup(path)
    open(path, "w", encoding="utf-8").write(t)
    print("  client.js 已去掉人设卡")
    return True


def patch_index(path):
    t = open(path, encoding="utf-8").read()
    if "她专属的人设" not in t:
        print("  index.js 已无 persona 路由，跳过")
        return False
    orig = t
    t = re.sub(
        r"\n    // ── 她专属的人设（2026-10-21 主人要的）.*?\n    \}\)\n",
        "\n",
        t,
        flags=re.S,
    )
    if t == orig:
        print("  index.js 没有匹配到 persona 路由，未修改")
        return False
    backup(path)
    open(path, "w", encoding="utf-8").write(t)
    print("  index.js 已去掉 /dsh-bili/api/persona")
    return True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", default=DEFAULT)
    args = ap.parse_args()
    base = args.dir
    if not os.path.isdir(base):
        print(f"找不到插件目录：{base}")
        return 2
    print(f"目标：{base}")
    marker = os.path.join(base, ".no-persona-patched")
    if os.path.exists(marker):
        print("已有 .no-persona-patched 标记，跳过。")
        return 0
    changed = False
    changed |= patch_client(os.path.join(base, "lib", "client.js"))
    changed |= patch_index(os.path.join(base, "lib", "index.js"))
    if changed:
        try:
            open(marker, "w", encoding="utf-8").write("patched by dsh-bili-whale-persona\n")
        except Exception:
            pass
    print("完成。" + ("（改动将在 DSH 重启后生效）" if changed else "无改动。"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
