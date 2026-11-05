#!/usr/bin/env python3
"""魔丸 Agent 的用户入口。不后台抓取，不自动发布。

配置真实模型时设置：
  MOWAN_PROVIDER=openai
  MOWAN_API_BASE=https://你的兼容端点/v1
  MOWAN_API_KEY=从环境注入，不要写进文件
  MOWAN_MODEL=模型名

未设置 MOWAN_PROVIDER 时只返回 unconfigured，不会编一条假回复。
测试链路时才显式设置 MOWAN_PROVIDER=mock。
"""

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path[:0] = [str(Path(__file__).resolve().parent)]

from runtime import run


def main(argv=None):
    parser = argparse.ArgumentParser(description="魔丸 Agent")
    parser.add_argument("--message", required=True, help="用户消息")
    parser.add_argument("--content-file", type=Path, help="可选，待分析的本地文件")
    parser.add_argument("--skill", choices=["剧情生成"], help="加载已登记的本地写作 skill")
    parser.add_argument("--day", type=int, help="剧情 skill 的当集编号，同时读取上集和故事卡")
    parser.add_argument("--guest", help="当集客人，须与 story_card.json 一致")
    parser.add_argument("--cancel", action="store_true")
    args = parser.parse_args(argv)
    if (args.day is not None or args.guest) and not args.skill:
        parser.error("--day / --guest 必须和 --skill 剧情生成 一起使用")
    content = ""
    if args.content_file:
        content = args.content_file.read_text(encoding="utf-8")
    result = run(
        ROOT,
        args.message,
        content=content,
        cancelled=args.cancel,
        skill=args.skill,
        day=args.day,
        guest=args.guest,
    )
    public = {
        "ok": result["ok"],
        "code": result["code"],
        "agent_id": result["agent_id"],
        "persona_id": result["persona_id"],
        "memory_unchanged": result["memory_unchanged"],
        "memory_count": result["memory_count"],
    }
    if result["ok"]:
        public["reply"] = result["reply"]
        public["mode"] = result["mode"]
        public["interest"] = result["interest"]
        public["provider"] = result["provider"]
        public["model_configured"] = result["model_configured"]
        public["skill"] = result.get("skill")
        public["episode_day"] = result.get("episode_day")
    else:
        public["error"] = result["error"]
    json.dump(public, sys.stdout, ensure_ascii=False)
    sys.stdout.write("\n")
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
