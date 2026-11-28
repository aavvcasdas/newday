#!/usr/bin/env python3
"""给自动回复加运行时开关读取：~/.dsh/whale-auto-reply.json {enabled: true|false}

改动 lib/scheduler.js：
  - 新增 autoReplyEnabled()
  - maybeVideoComments() 关闭时直接返回 []
  - listenTick() 关闭时只推进水位、不回复

安全：备份 *.bak-auto-switch-<时间戳>；有 .auto-switch-patched 标记就跳过。
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

HELPER = """  const AUTO_REPLY_FILE = path.join(HOME, '.dsh', 'whale-auto-reply.json')
  function autoReplyEnabled() {
    try {
      const d = JSON.parse(fs.readFileSync(AUTO_REPLY_FILE, 'utf8'))
      return d.enabled !== false
    } catch { return true }
  }
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", default=DEFAULT)
    args = ap.parse_args()
    base = args.dir
    path = os.path.join(base, "lib", "scheduler.js")
    t = open(path, encoding="utf-8").read()
    marker = os.path.join(base, ".auto-switch-patched")
    if os.path.exists(marker) or "autoReplyEnabled" in t:
        print("已打过自动回复开关补丁，跳过。")
        return 0
    orig = t

    anchor = "  async function pullVideoComments(cfg, H) {"
    if anchor not in t:
        print("找不到 pullVideoComments，未修改")
        return 1
    t = t.replace(anchor, HELPER + anchor, 1)

    old_maybe = "  async function maybeVideoComments(cfg, H) {\n    const L = cfg.listen ?? {}"
    new_maybe = "  async function maybeVideoComments(cfg, H) {\n    if (!autoReplyEnabled()) return []\n    const L = cfg.listen ?? {}"
    if old_maybe not in t:
        print("找不到 maybeVideoComments 主体，未修改")
        return 1
    t = t.replace(old_maybe, new_maybe, 1)

    old_base = "      if (!since) { writeL({ lastSeen: Math.floor(Date.now() / 1000) }); commentFailures = 0; return }"
    new_base = old_base + """
      if (!autoReplyEnabled()) {
        const maxT = items.reduce((m, x) => Math.max(m, Number(x.t) || 0), since)
        writeL({ lastSeen: maxT, lastIds: [...new Set(items.filter((x) => Number(x.t) === maxT).map(itemKey))] })
        commentFailures = 0
        return
      }"""
    if old_base not in t:
        print("找不到 baseline 行，未修改")
        return 1
    t = t.replace(old_base, new_base, 1)

    if t == orig:
        print("没有发生替换")
        return 1
    stamp = time.strftime("%Y%m%d-%H%M%S")
    shutil.copyfile(path, path + ".bak-auto-switch-" + stamp)
    open(path, "w", encoding="utf-8").write(t)
    open(marker, "w", encoding="utf-8").write("patched by dafy-comment-reply\n")
    print("已接入自动回复开关。重启 DSH 后生效。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
