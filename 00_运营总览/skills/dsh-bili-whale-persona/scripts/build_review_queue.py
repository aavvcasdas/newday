#!/usr/bin/env python3
"""生成 B 站评论审核队列（只审不发）。

输入：
  data/review-raw.json         # comment-digest --json（回复 + @）
  data/video-comments-raw.json # comments <BV> --json（可选，最新视频热评）
输出：
  ~/.dsh/whale-review-queue.json

每条：
  { id, kind, who, mid, time, text, uri, rpid, oid, root, draft, status, source }
status: pending / approved / skipped
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(os.path.expanduser("~"), ".dsh", "whale-review-queue.json")

# 全损黑话草稿（on 档：短、梗密、鉴定体；只损事不损人）
DRAFTS = {
    "320169188081": "收到 这波@本鲸接住了 属实",
    "320334894673": "收到 @ 本鲸来了 别急",
    "321238728673": "字幕确实赶 下版给你捋顺 别急",
    "325058329312": "好鲸 这波夸本鲸收下了 属实",
    "321239737777": "好听就多听 三连别忘了 好活",
    "325059486784": "行 算你有点耳朵 本鲸继续唱 属实",
    "325063400592": "腿是长了点 走起来像开挂 下版收一收 属实",
    "321247414897": "视角一换确实软 这句你听懂了 破防",
    "325101206864": "表情包刷屏 本鲸看到了 好活",
    "325119764976": "同构思 这波属于是双向奔赴了",
    "325161394256": "香奈美 本鲸也爱看 好活",
    "325217067360": "收到 @ 本鲸记下了 属实",
    "321395509441": "泪目就对了 这桥段本鲸也扛不住",
    "325218758272": "支持收到 下次一定变三连",
    "321397908337": "这句本鲸记下了 尾巴别搭椅背了 破防",
    "321399060657": "结构狠 你也是懂行的 属实好活",
    "325232947152": "没天赋就多刷两遍 本鲸也是练出来的 别急",
    "321422142081": "收到 @ 本鲸来了 别急",
    "321425665025": "别光说 哐哐点赞投币本鲸等着 好活",
    "321438839873": "咕咕嘎嘎 本鲸听懂了 好活",
    "325281135680": "好听就摸 本鲸准了 好活",
    "325298639696": "开心收到 属实好活 你也是",
    "321487360689": "就这还夸 本鲸收下了",
    "321395790497": "被子软就多躺会儿 海本鲸替你看 属实",
}


def load(path):
    try:
        return json.load(open(path, encoding="utf-8"))
    except FileNotFoundError:
        return {}


def main():
    digest = load(os.path.join(ROOT, "data", "review-raw.json"))
    video = load(os.path.join(ROOT, "data", "video-comments-raw.json"))
    items = []
    seen = set()

    for x in digest.get("items", []):
        rid = str(x.get("rpid") or x.get("id") or "")
        if not rid or rid in seen:
            continue
        seen.add(rid)
        items.append({
            "id": rid,
            "kind": x.get("kind") or "reply",
            "who": x.get("who") or "",
            "mid": str(x.get("mid") or ""),
            "time": x.get("time") or "",
            "text": x.get("text") or "",
            "uri": x.get("uri") or "",
            "rpid": rid,
            "oid": str(x.get("oid") or ""),
            "root": str(x.get("root") or "0"),
            "draft": DRAFTS.get(rid, "收到 这波本鲸记下了 属实"),
            "status": "pending",
            "source": "digest",
        })

    for x in video.get("items", []):
        rid = str(x.get("rpid") or "")
        if not rid or rid in seen:
            continue
        seen.add(rid)
        items.append({
            "id": rid,
            "kind": "video-comment",
            "who": x.get("user") or "",
            "mid": str(x.get("mid") or ""),
            "time": x.get("time") or "",
            "text": x.get("text") or "",
            "uri": "https://www.bilibili.com/video/BV1fY1JznEQM",
            "rpid": rid,
            "oid": "",
            "root": "0",
            "draft": DRAFTS.get(rid, "收到 这波本鲸记下了 属实"),
            "status": "pending",
            "source": "video",
        })

    # 按时间倒序（字符串 ISO / B站格式都能大致排）
    items.sort(key=lambda x: x.get("time") or "", reverse=True)
    payload = {
        "mode": "review-only",
        "generated_at": __import__("datetime").datetime.now().isoformat(timespec="seconds"),
        "persona": "on",
        "total": len(items),
        "items": items,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=1)
    print(f"OK {OUT}")
    print(f"共 {len(items)} 条（digest {sum(1 for i in items if i['source']=='digest')} / video {sum(1 for i in items if i['source']=='video')}）")


if __name__ == "__main__":
    main()
