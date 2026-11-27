#!/usr/bin/env python3
"""把 geng-skill 的 SSS/SS/S 级热梗抽成本地素材库（默认只读、离线可用）。

用法：
  python scripts/build_hot_memes.py                 # 联网拉取并生成 data/hot_memes.json
  python scripts/build_hot_memes.py --src path.json # 用本地 JSON 生成
  python scripts/build_hot_memes.py --src path.json --offline-ok

产物：data/hot_memes.json —— 只含 SSS/SS/S 三档，字段精简（梗名/等级/热度/含义/用法/来源）。
默认不生成、不联网、不启用；这是"备用素材"，由人设层按需引用。
来源：https://github.com/MonloHua/geng-skill (MIT) 的 gengku.json
"""
import argparse
import json
import os
import sys
import urllib.request

SRC_URL = "https://raw.githubusercontent.com/MonloHua/geng-skill/master/gengku.json"
KEEP_TIERS = {"SSS", "SS", "S"}
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "data", "hot_memes.json")


def load(src):
    if src:
        with open(src, encoding="utf-8") as f:
            return json.load(f)
    req = urllib.request.Request(SRC_URL, headers={"User-Agent": "dsh-bili-whale-sunba/1.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode("utf-8"))


def slim(name, v):
    return {
        "name": name,
        "tier": v.get("tier", ""),
        "heat": v.get("heat", 0),
        "meaning": (v.get("meaning") or "").strip(),
        "usage": (v.get("usage") or "").strip(),
        "source": (v.get("source") or "").strip(),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", help="本地 gengku.json 路径；不给则联网拉")
    args = ap.parse_args()

    raw = load(args.src)
    picked = [slim(k, v) for k, v in raw.items() if v.get("tier") in KEEP_TIERS]
    # 按等级再按热度排序
    order = {"SSS": 0, "SS": 1, "S": 2}
    picked.sort(key=lambda x: (order.get(x["tier"], 9), -(x["heat"] or 0)))

    by_tier = {t: sum(1 for x in picked if x["tier"] == t) for t in ("SSS", "SS", "S")}
    out = {
        "_meta": {
            "source": "MonloHua/geng-skill gengku.json (MIT)",
            "keep_tiers": ["SSS", "SS", "S"],
            "total": len(picked),
            "by_tier": by_tier,
            "note": "备用素材，默认不启用；由 dsh-bili-whale-sunba 人设层按分级引用。",
        },
        "memes": picked,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(f"OK 写出 {OUT}")
    print(f"   总数 {len(picked)}  分级 {by_tier}")


if __name__ == "__main__":
    sys.exit(main())
