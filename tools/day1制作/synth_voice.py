#!/usr/bin/env python3
# day1_tools/synth_voice.py — Day1 批量合成入口（兼容包装）
# 实际合成、真实时长/F0/峰值/削顶回读全部走 say.py，避免第二套参数。
#   终版:   python3 day1_tools/synth_voice.py --engine edge
#   结构片: python3 day1_tools/synth_voice.py --engine piper
#   Azure:  python3 day1_tools/synth_voice.py --engine azure  (需环境变量)
# say.py 查找顺序: $SAY_PY > ~/tools/say.py > 本目录 say.py > ../ai-yunying/tools/say.py
import argparse
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRIPT_TXT = ROOT.parent / "ai-yunying" / "Day1" / "Day1配音台词.txt"


def find_say_py() -> Path:
    candidates = []
    if os.environ.get("SAY_PY"):
        candidates.append(Path(os.environ["SAY_PY"]).expanduser())
    candidates += [
        Path.home() / "tools" / "say.py",
        Path(__file__).resolve().parent / "say.py",
        ROOT.parent / "ai-yunying" / "tools" / "say.py",
    ]
    for p in candidates:
        if p.is_file():
            return p
    raise SystemExit("找不到 say.py；请使用 ~/tools/say.py，或设置环境变量 SAY_PY。")


def engine_kind(value: str) -> str:
    v = value.strip().lower()
    if v.startswith("piper"):
        return "piper"
    if v.startswith("azure"):
        return "azure"
    return "edge"


def main() -> int:
    ap = argparse.ArgumentParser(description="Day1 27-cue batch synthesis via say.py")
    ap.add_argument("--engine", default="edge", help="edge|piper|azure（默认 edge/晓伊终版）")
    ap.add_argument("--outdir", default=None, help="输出目录（默认 edge/azure=day1_audio，piper=day1_audio_piper）")
    ap.add_argument("--piper-model", default=None, help="Piper ONNX 模型路径或语音名")
    ap.add_argument("--proxy", default=None, help="仅 Edge：传给 edge-tts --proxy")
    args = ap.parse_args()

    if not SCRIPT_TXT.is_file():
        raise SystemExit(f"找不到配音稿: {SCRIPT_TXT}")
    lines = [x.strip() for x in SCRIPT_TXT.read_text(encoding="utf-8").splitlines() if x.strip()]
    if len(lines) != 27:
        raise SystemExit(f"Day1配音台词.txt 应为 27 条，实得 {len(lines)} 条")

    kind = engine_kind(args.engine)
    out = Path(args.outdir) if args.outdir else ROOT / ("day1_audio_piper" if kind == "piper" else "day1_audio")
    say = find_say_py()
    cmd = [sys.executable, str(say), "--engine", kind, "--batch", str(SCRIPT_TXT), "--outdir", str(out)]
    if args.piper_model:
        cmd += ["--piper-model", args.piper_model]
    if args.proxy:
        cmd += ["--proxy", args.proxy]
    print("运行:", " ".join(cmd), flush=True)
    rc = subprocess.run(cmd).returncode
    if rc == 0 and kind == "piper":
        print("注意：这是 Piper 非晓伊占位音轨，只用于结构片；终版仍须换回 edge/azure 的晓伊并重测。")
        print("下一步: python3 day1_tools/gen_all.py --engine piper/zh_CN-huayan-medium && node render_day1.mjs --out whale_day1_piper_structure.mp4")
    elif rc == 0:
        print("下一步: python3 day1_tools/gen_all.py --engine edge/zh-CN-XiaoyiNeural && node render_day1.mjs --out whale_day1.mp4")
    return rc


if __name__ == "__main__":
    raise SystemExit(main())
