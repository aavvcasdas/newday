#!/usr/bin/env python3
"""Technical acceptance check for the ensemble side-story MV.

Runs a full ffmpeg decode, checks stream geometry/duration, extracts one frame
per lyric cue plus the final hold frame, and cross-checks the locked data files.
It does not claim a human visual/audio review; it writes a machine report.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
FINAL = ROOT / "番外MV/成片/把回忆拼好给你_AI娘全员番外.mp4"
DATA = HERE / "data"


def ffmpeg_bin() -> str:
    if os.environ.get("FFMPEG_PATH"):
        return os.environ["FFMPEG_PATH"]
    for py in (os.environ.get("PYTHON"), "/home/user/.cache/mv-venv/bin/python", "python3", "python"):
        if not py:
            continue
        try:
            out = subprocess.check_output(
                [py, "-c", "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"],
                text=True,
                stderr=subprocess.DEVNULL,
            ).strip()
            if out and Path(out).exists():
                return out
        except Exception:
            pass
    found = shutil.which("ffmpeg")
    if found:
        return found
    raise SystemExit("ffmpeg not found; set FFMPEG_PATH or install imageio-ffmpeg")


def run(cmd: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--final", type=Path, default=FINAL)
    ap.add_argument("--frames-dir", type=Path, default=None)
    args = ap.parse_args()
    final: Path = args.final
    checks: list[dict] = []

    def check(name: str, ok: bool, detail: str = "") -> None:
        checks.append({"name": name, "ok": bool(ok), "detail": detail})
        print(("PASS" if ok else "FAIL"), name, detail)

    check("final_exists", final.is_file(), str(final))
    if not final.is_file():
        report = {"ok": False, "checks": checks}
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 1

    ff = ffmpeg_bin()
    timeline = json.loads((DATA / "timeline.json").read_text(encoding="utf-8"))
    lyrics = json.loads((DATA / "lyrics.json").read_text(encoding="utf-8"))["lines"]
    cast = json.loads((DATA / "cast.json").read_text(encoding="utf-8"))["cast"]
    shots = json.loads((DATA / "shots.json").read_text(encoding="utf-8"))["shots"]
    sprites = json.loads((DATA / "sprites.json").read_text(encoding="utf-8"))
    srt = (ROOT / "番外MV/歌词.srt").read_text(encoding="utf-8")

    check("lyrics_16_lines", len(lyrics) == 16, str(len(lyrics)))
    check("timeline_cues_match_lyrics", [c["text"] for c in timeline["cues"]] == lyrics)
    check("timeline_frames", timeline["frames"] == 1346 and timeline["fps"] == 24)
    ids = {c["id"] for c in cast}
    covered = set()
    for s in shots:
        covered.update(s.get("cast", []))
    check("all_cast_in_shots", covered == ids, ",".join(sorted(ids - covered)) or "all")
    check("final_shot_full_cast", set(shots[-1].get("cast", [])) == ids)
    chars = sprites.get("characters", {})
    check(
        "primary_form_q_chibi_pets",
        sprites.get("primaryForm") == "q-chibi-pets"
        and all(chars.get(i, {}).get("pet") for i in ("whale", "gpt"))
        and all(chars.get(i, {}).get("chibi") for i in ids - {"doubao", "whale", "gpt"})
        and bool(chars.get("doubao", {}).get("sprite"))
        and bool(chars.get("doubao", {}).get("qLayout")),
        "pets real-frame whale/gpt + ai-girls chibi + Day12-derived Q doubao",
    )
    check(
        "v4_paper_stage_no_bounce",
        all(s.get("stage") == "paper-diorama" for s in shots)
        and not any(re.search(r"bounce|hop|sway", s.get("motion", ""), re.I) for s in shots),
        "layered paper diorama; no whole-image bounce direction",
    )
    missing_srt = []
    for c in timeline["cues"]:
        texts = [seg["text"] for seg in c.get("segments", [])] or [c["text"]]
        for text in texts:
            if text not in srt:
                missing_srt.append(text)
    check("srt_contains_cues", not missing_srt, ";".join(missing_srt))

    info = run([ff, "-hide_banner", "-i", str(final)])
    meta = info.stderr + info.stdout
    dur = re.search(r"Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)", meta)
    duration = None
    if dur:
        duration = int(dur.group(1)) * 3600 + int(dur.group(2)) * 60 + float(dur.group(3))
    check("duration_near_source", duration is not None and abs(duration - timeline["duration"]) < 0.15, f"{duration}")
    check("video_h264_1080p24", bool(re.search(r"Video:\s*h264.*1920x1080.*24\s*fps", meta, re.S)), "stream header")
    check("audio_aac_present", bool(re.search(r"Audio:\s*aac", meta)), "stream header")

    dec = run([ff, "-hide_banner", "-i", str(final), "-f", "null", "-"])
    frames = [int(x) for x in re.findall(r"frame=\s*(\d+)", dec.stderr + dec.stdout)]
    decoded = max(frames) if frames else 0
    check("full_decode_exit0", dec.returncode == 0, f"exit={dec.returncode}")
    check("decoded_frame_count", decoded == timeline["frames"], f"{decoded}/{timeline['frames']}")

    black = run([ff, "-hide_banner", "-i", str(final), "-vf", "blackdetect=d=0.25:pix_th=0.08:pic_th=0.98", "-f", "null", "-"])
    black_hits = re.findall(r"black_start:[^\n]+", black.stderr + black.stdout)
    check("no_long_black_frames", not black_hits, ";".join(black_hits[:3]))

    frames_dir = args.frames_dir or Path(tempfile.mkdtemp(prefix="mv-verify-"))
    frames_dir.mkdir(parents=True, exist_ok=True)
    times = [2.2 if i == 0 else (c["start"] + c["end"]) / 2 for i, c in enumerate(timeline["cues"])]
    times.append(max(0.0, timeline["duration"] - 0.2))
    extracted = []
    for i, t in enumerate(times):
        out = frames_dir / f"check_{i:02d}_{t:.3f}.png"
        r = run([ff, "-hide_banner", "-loglevel", "error", "-y", "-ss", f"{t:.6f}", "-i", str(final), "-frames:v", "1", str(out)])
        ok = r.returncode == 0 and out.is_file() and out.stat().st_size > 20_000
        extracted.append({"t": round(t, 3), "file": str(out), "ok": ok, "bytes": out.stat().st_size if out.exists() else 0})
    check("sample_frames_extracted", all(x["ok"] for x in extracted), str(frames_dir))

    report = {
        "ok": all(c["ok"] for c in checks),
        "final": str(final),
        "sha256": sha256(final),
        "bytes": final.stat().st_size,
        "duration": duration,
        "decodedFrames": decoded,
        "ffmpeg": ff,
        "checks": checks,
        "sampleFrames": extracted,
        "note": "Machine technical check only; not a human visual/audio approval.",
    }
    report_path = ROOT / "番外MV/验收报告.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("report", report_path)
    return 0 if report["ok"] else 2


if __name__ == "__main__":
    sys.exit(main())
