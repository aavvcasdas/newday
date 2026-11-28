#!/usr/bin/env python3
"""给 dsh-bili-whale 的评论监听加上「视频底下所有新评论」轮询。

改动 lib/scheduler.js：
  1. 引入 apiGet
  2. listenTick 里追加 maybeVideoComments(cfg,H) 的结果
  3. 坐标提示里区分 /@ / 回复 / 评论
  4. 指令里补一句「视频新评论能接就接」
读取 ~/.dsh/whale-watch-videos.json 的视频列表（[{bvid,aid,title}]）。
轮询间隔 listen.videoCommentIntervalSec（默认 300 秒）。

安全：备份 *.bak-video-comments-<时间戳>；有 .video-comments-patched 标记就跳过。
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
WATCH = os.path.join(os.path.expanduser("~"), ".dsh", "whale-watch-videos.json")

HELPERS = r"""
  // ── 视频底下所有新评论（2026-11-28 加） ─────────────────────────────
  const WATCH_FILE = path.join(HOME, '.dsh', 'whale-watch-videos.json')
  let lastVideoPollAt = 0
  function readWatchVideos() {
    try {
      const d = JSON.parse(fs.readFileSync(WATCH_FILE, 'utf8'))
      return Array.isArray(d?.videos) ? d.videos : []
    } catch { return [] }
  }
  async function pullVideoComments(cfg, H) {
    const vids = readWatchVideos().slice(0, 10)
    const out = []
    for (const v of vids) {
      const aid = String(v.aid || '')
      if (!aid) continue
      try {
        const j = await apiGet('https://api.bilibili.com/x/v2/reply?type=1&oid=' + aid + '&pn=1&ps=20&sort=2', H, { noCache: true })
        if (j.code !== 0) continue
        for (const r of (j.data?.replies || [])) {
          if (String(r.mid) === String(cfg.self?.mid ?? '')) continue
          out.push({
            kind: 'videocomment',
            id: String(r.rpid),
            t: Number(r.ctime || 0),
            oid: aid,
            root: '0',
            parent: String(r.rpid),
            who: r.member?.uname || '',
            mid: String(r.mid || ''),
            business: 1,
            source: r.content?.message || '',
          })
        }
      } catch (e) { diagnose('video-comments', e) }
    }
    return out
  }
  async function maybeVideoComments(cfg, H) {
    const L = cfg.listen ?? {}
    const interval = Math.max(120, Number(L.videoCommentIntervalSec ?? 300)) * 1000
    if (Date.now() - lastVideoPollAt < interval) return []
    lastVideoPollAt = Date.now()
    return pullVideoComments(cfg, H)
  }
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", default=DEFAULT)
    args = ap.parse_args()
    base = args.dir
    path = os.path.join(base, "lib", "scheduler.js")
    t = open(path, encoding="utf-8").read()
    marker = os.path.join(base, ".video-comments-patched")
    if os.path.exists(marker) or "maybeVideoComments" in t:
        print("已打过视频评论补丁，跳过。")
        return 0
    orig = t

    # 1) import
    if "from '../tools/lib/bili-api.mjs'" not in t:
        t = t.replace(
            "import { pollDelay } from '../tools/lib/poll-policy.mjs'",
            "import { pollDelay } from '../tools/lib/poll-policy.mjs'\nimport { apiGet } from '../tools/lib/bili-api.mjs'",
            1,
        )

    # 2) helpers before listenTick
    anchor = "  async function listenTick() {"
    if anchor not in t:
        print("找不到 listenTick，未修改")
        return 1
    t = t.replace(anchor, HELPERS + "\n" + anchor, 1)

    # 3) append video comments into items
    old_push = "      if (String(L.scope ?? 'both') !== 'reply') {\n        items.push(...(await pullFeed('at', { headers: H, pages: 1 })).items)\n      }"
    if old_push not in t:
        print("找不到 at feed 插入点，未修改")
        return 1
    t = t.replace(old_push, old_push + "\n      items.push(...(await maybeVideoComments(cfg, H)))", 1)

    # 4) label videocomment
    t = t.replace(
        "const who = fresh.map((x) => `${x.who}（${x.kind === 'at' ? '@' : '回复'}）`).join('、')",
        "const who = fresh.map((x) => `${x.who}（${x.kind === 'at' ? '@' : x.kind === 'videocomment' ? '评论' : '回复'}）`).join('、')",
        1,
    )
    t = t.replace(
        "ls.push(`  · ${x.kind === 'at' ? '@' : '回复'} ${x.who}（mid ${x.mid}）`)",
        "ls.push(`  · ${x.kind === 'at' ? '@' : x.kind === 'videocomment' ? '评论' : '回复'} ${x.who}（mid ${x.mid}）`)",
        1,
    )

    # 5) instruction
    old_rule = "'2) 只回「一两句能答清的提问 + 轻互动」，一条收住；吵架/要隐私/长篇追问/代表主人承诺 → 不回 ✗',"
    new_rule = "'2) 回复/@：只回「一两句能答清的提问 + 轻互动」；视频新评论（kind=评论）：能接就接一句；纯表情/纯@/广告/引战 → 不回 ✗',"
    if old_rule in t:
        t = t.replace(old_rule, new_rule, 1)

    if t == orig:
        print("没有发生替换，未修改")
        return 1
    stamp = time.strftime("%Y%m%d-%H%M%S")
    shutil.copyfile(path, path + ".bak-video-comments-" + stamp)
    open(path, "w", encoding="utf-8").write(t)
    open(marker, "w", encoding="utf-8").write("patched by dafy-comment-reply\n")

    # seed watch file if absent
    if not os.path.exists(WATCH):
        import json
        json.dump({"videos": [], "note": "在这里加 {bvid,aid,title}"}, open(WATCH, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("已加视频评论轮询。重启 DSH 后生效。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
