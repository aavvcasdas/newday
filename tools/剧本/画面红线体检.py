#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""画面红线体检：扫渲染器，抓「粉丝数 / 目标值 / 进度条」这类不许再出现的东西。

红线见 `00_运营总览/画面红线_不要出现的东西_2026-10-29.md`：
  · 画面不写粉丝数、播放量、目标值（`2,108 / 10,000` 这种）；
  · 不画进度条 / 音量条 / 加载条 / 数据曲线 / 账本表。

2026-11-09：**「口播零阿拉伯数字」门禁已按用户要求删除**，
配音 TXT / 字幕 JSON 不再因数字被判违规；其余画面红线继续生效。

用法：
  python3 tools/剧本/画面红线体检.py            # 有违规 → 退出码 1
  python3 tools/剧本/画面红线体检.py -v         # 连历史留档也列出来
  python3 tools/剧本/画面红线体检.py --file Day/Day5/xxx.mjs

设计原则：**宁可误报，不可漏报**（误报看两眼就能判，漏报会进成片）。
历史留档（Day1–Day4 已交付）只提示不判违规，但清单照样打出来。
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]

def discover(day=None):
    pattern = f'day{day}制作' if day else 'day*制作'
    files = [p for d in (REPO/'tools').glob(pattern) for p in d.rglob('*.mjs')
             if not p.name.endswith('.test.mjs') and '源码快照' not in str(p)]
    files.extend(p for p in (REPO/'tools/场景').rglob('*.mjs') if not p.name.endswith('.test.mjs'))
    # 通用引擎同样属于共享生产代码，一并扫描，防止违规逻辑藏进引擎逃检（历史单集判定不变）
    files.extend(p for p in (REPO/'tools/engine').rglob('*.mjs') if not p.name.endswith('.test.mjs'))
    folders = [REPO/f'Day{day}'] if day else (REPO.glob('Day*'))
    for d in folders:
        files.extend(d.glob('Day*配音台词.txt'))
    files.extend(p for d in (REPO/'tools').glob(pattern) for p in d.rglob('*subtitle_timing.json'))
    return sorted(set(files))

# 已交付、不重渲的历史片子：提示，不判违规
LEGACY = re.compile(r"day([1-4](加更)?)制作")

CHECKS = [
    ("显式眯眼值", re.compile(r"squint\s*[:=]\s*(?!0\.01\b)\d+(?:\.\d+)?"), "第11条要求squint固定0.01；动态表达式仍需人工核验"),
    ("体量数字", re.compile(r"(?:粉丝|播放量|点赞数)\s*[:：]?\s*[\d,]+"), "画面不展示体量具体数字"),
    ("横向进度条嫌疑", re.compile(r"fillRect\([^;\n]*(?:progress|barWidth|barFill)[^;\n]*\)", re.I), "核对进度变量驱动的绘条，不按所有细长矩形误杀桌板"),
    ("禁用闭眼眼型", re.compile(r"eyes\s*[:=]\s*['\"](?:lids|dead)['\"]"), "禁止lids/dead；squint=0.01及近景仍须像素抽查"),
    # (名字, 正则, 说明)
    ("粉丝数/目标值", re.compile(r"粉丝\s*[\"']?\s*[,:]?\s*[\d,]+\s*/\s*[\d,]{3,}"),
     "卡片上写了「粉丝 X / Y」：删掉数字和目标值，只留天数与明天的钩子"),
    ("目标值", re.compile(r"[\d,]{3,}\s*/\s*[\d,]{4,}"),
     "出现了 `X / 10,000` 这种目标写法：观众不关心，删"),
    ("粉丝行", re.compile(r"(?:fillText|txt|text6)\([^;\n]*?['\"]粉丝['\"]"),
     "画面里有「粉丝」字样：整行删掉"),
    ("进度条函数", re.compile(r"progressBar|fanBar|targetCard|ledgerCard|chartCard", re.I),
     "进度条/目标卡/账本卡：这类组件一律不要，组件本身删掉"),
    ("进度条绘制", re.compile(r"/\*\s*进度|进度条绘制|barFill|fillBar", re.I),
     "进度条绘制痕迹：删"),
    ("音量条", re.compile(r"音量条|volumeBar|volBar", re.I),
     "音量条：电视里外都不许有"),
    ("目标卡文案", re.compile(r"月度目标|月目标|新增粉丝"),
     "目标卡文案：删"),
    ("片尾卡", re.compile(r"shotEndCard|ENDCARD|本鯨的 30 天|本鲸的 30 天"),
     "片尾卡整张都不做：最后一句说完就结束（见 00_运营总览/画面红线_…_2026-10-29.md 第二节）"),
]

def scan_file(path: Path) -> list[tuple[str, int, str, str]]:
    out = []
    text = path.read_text(encoding="utf-8", errors="replace")
    # 2026-11-09：口播/字幕的「零阿拉伯数字」门禁已删除；TXT 与字幕 JSON
    # 不再有专门判定，只保留下方对渲染源码的画面红线检查。
    if path.suffix in ('.txt', '.json'):
        return out
    lines = text.splitlines()
    for name, rx, hint in CHECKS:
        for i, ln in enumerate(lines, 1):
            code = ln.lstrip()
            if code.startswith(("//", "/*", "*")):
                continue                       # 注释里写「不许画进度条」不算违规
            if rx.search(ln):
                out.append((name, i, ln.strip()[:120], hint))
    return out


def main(argv=None) -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--file", type=Path, action="append", help="只查这些文件")
    ap.add_argument("-v", "--verbose", action="store_true", help="连历史留档的提示也打出来")
    ap.add_argument('--day', type=int, help='仅检查当集')
    ap.add_argument('--fix-hint', action='store_true', help='展示修复建议（不自动改源码）')
    args = ap.parse_args(argv)

    targets = [Path(f).resolve() for f in args.file] if args.file else discover(args.day)
    if not targets:
        print("没找到检查目标（禁止空扫描通过）")
        sys.exit(1)

    hard, legacy = [], []
    for p in targets:
        rel = p.relative_to(REPO) if p.is_relative_to(REPO) else p
        hits = scan_file(p)
        if not hits:
            continue
        bucket = legacy if (not args.file and (LEGACY.search(str(rel)) or re.match(r'Day[1-4]/', str(rel)))) else hard
        bucket.append((rel, hits))

    print(f"画面红线体检：扫了 {len(targets)} 个脚本\n")
    if hard:
        print("✗ 违规（新片一律不许有）：")
        for rel, hits in hard:
            print(f"\n  {rel}")
            for name, i, ln, hint in hits:
                print(f"    L{i}  [{name}] {ln}")
                print(f"          → {hint}")
    if legacy and args.verbose:
        print("\n· 历史留档（Day2–Day4 已交付，不重渲、不算违规）：")
        for rel, hits in legacy:
            names = sorted({h[0] for h in hits})
            print(f"  {rel}  →  {', '.join(names)}（{len(hits)} 处）")
    print(f"历史提示文件：{len(legacy)}（-v 展开）")
    if not hard:
        print("\n结论：没有新的违规 ✓")
    else:
        print("\n结论：有违规 ✗ —— 改完再出片")
    sys.exit(1 if hard else 0)


if __name__ == "__main__":
    main()
