#!/usr/bin/env python3
"""Build the MV's line-level timing from the supplied reference film.

This is NOT speech ASR. The reference video already contains the same lyric
segment as burned-in kinetic tiles. We surveyed those tiles with RapidOCR at
6 fps, reviewed the first tile of each line, and snapped the reviewed anchors to
the 24 fps grid. The source audio is copied without speed/volume changes.
Vosk was also tried on the singing voice and failed; that failed evidence is kept
separately and is never used to invent word timings.

Optional dependency for re-running the OCR survey:
  pip install rapidocr_onnxruntime opencv-python-headless imageio-ffmpeg numpy
The locked, reviewed timeline is committed so rendering does not need OCR.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
SOURCE = ROOT / "《把回忆拼好给你》.mp4"
SOURCE_SHA = "fa26fc78c5459fae6300e986c73a4fe56eb25de51b2db827257d757202989248"
FPS = 24
FRAMES = 1346
DURATION = FRAMES / FPS

# Reviewed first-tile anchors from the 6 fps OCR survey. Values are seconds on
# the source film's 24 fps grid. Precision is line-level, not phoneme-level.
ANCHORS = [
    (1, 31, "我们都是渺小真实存在", "渺小"),
    (2, 114, "祈愿小世界里不只有挫败", "小世界"),
    (3, 205, "直到遇见你我以为就光明起来", "遇见你"),
    (4, 283, "眼睛里看到的都是广袤无垠的大海", "大海"),
    (5, 375, "有你在的日子不可能被取代", "取代"),
    (6, 455, "在最灰暗的日子你陪着我发呆", "发呆"),
    (7, 539, "你让我学会如何拨开阴霾", "拨开阴霾"),
    (8, 611, "将快乐全都收集将不开心全都淘汰", "收集快乐"),
    (9, 695, "你对我说的情话", "情话"),
    (10, 755, "像转瞬即逝的烟花", "烟花"),
    (11, 855, "只停在绽放一刹那", "一刹那"),
    (12, 935, "我却已无法自拔", "无法自拔"),
    (13, 1019, "我们的爱总有时差", "时差"),
    (14, 1075, "也为你骗自己放下", "放下"),
    (15, 1171, "爱炙热的你", "炙热"),
    (16, 1224, "却忘了爱自己", "爱自己"),
]
# The reference film switches the second half of line 8 at about 27.0 s.
LINE8_SECOND_HALF_FRAME = 648
LYRIC_END_FRAME = 1301


def sha256(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def srt_time(t: float) -> str:
    ms = round(t * 1000)
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{s:02},{ms:03}"


def build() -> dict:
    lyrics = json.loads((HERE / "data/lyrics.json").read_text())["lines"]
    assert len(lyrics) == len(ANCHORS)
    cues = []
    for i, (n, frame, text, keyword) in enumerate(ANCHORS):
        assert text == lyrics[i], (text, lyrics[i])
        end_frame = ANCHORS[i + 1][1] if i + 1 < len(ANCHORS) else LYRIC_END_FRAME
        cue = {
            "id": f"L{n:02}", "line": n, "text": text, "keyword": keyword,
            "startFrame": frame, "endFrame": end_frame,
            "start": round(frame / FPS, 6), "end": round(end_frame / FPS, 6),
        }
        if n == 8:
            cue["segments"] = [
                {"text": "将快乐全都收集", "startFrame": frame, "endFrame": LINE8_SECOND_HALF_FRAME,
                 "start": round(frame / FPS, 6), "end": round(LINE8_SECOND_HALF_FRAME / FPS, 6)},
                {"text": "将不开心全都淘汰", "startFrame": LINE8_SECOND_HALF_FRAME, "endFrame": end_frame,
                 "start": round(LINE8_SECOND_HALF_FRAME / FPS, 6), "end": round(end_frame / FPS, 6)},
            ]
        cues.append(cue)
    return {
        "title": "把回忆拼好给你 · AI娘全员番外",
        "subtitle": "爱有时差",
        "sourceVideo": str(SOURCE.relative_to(ROOT)),
        "sourceSha256": SOURCE_SHA,
        "fps": FPS, "frames": FRAMES, "duration": round(DURATION, 6),
        "measured": True,
        "timingKind": "reference-film burned-in lyric tile onsets, reviewed and snapped to 24fps",
        "timingPrecisionSeconds": round(1 / 6, 6),
        "wordLevel": False,
        "audioPolicy": "copy source audio bitstream; no speed, pitch, volume or re-singing changes",
        "asrAttempt": {"engine": "vosk-model-small-cn-0.22", "usableForSinging": False,
                       "note": "Produced only sparse function words on the singing track; not used for cues."},
        "intro": {"start": 0, "end": round(ANCHORS[0][1] / FPS, 6)},
        "outro": {"start": round(LYRIC_END_FRAME / FPS, 6), "end": round(DURATION, 6),
                  "note": "Last picture continues; no separate end card."},
        "cues": cues,
    }


def write_outputs(timeline: dict) -> None:
    (HERE / "data/timeline.json").write_text(json.dumps(timeline, ensure_ascii=False, indent=2) + "\n")
    out = ROOT / "番外MV"
    out.mkdir(exist_ok=True)
    srt = []
    idx = 1
    for cue in timeline["cues"]:
        segments = cue.get("segments", [cue])
        for seg in segments:
            srt.append(f"{idx}\n{srt_time(seg['start'])} --> {srt_time(seg['end'])}\n{seg['text']}\n")
            idx += 1
    (out / "歌词.srt").write_text("\n".join(srt), encoding="utf-8")


def survey(ffmpeg: str) -> None:
    """Optional re-survey. Requires rapidocr_onnxruntime + headless OpenCV."""
    import numpy as np
    from rapidocr_onnxruntime import RapidOCR
    ocr = RapidOCR(intra_op_num_threads=2, inter_op_num_threads=2)
    p = subprocess.Popen([ffmpeg, "-v", "error", "-i", str(SOURCE), "-vf", "fps=6,scale=960:540",
                          "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    rows, i = [], 0
    while True:
        b = p.stdout.read(960 * 540 * 3)
        if len(b) < 960 * 540 * 3:
            break
        im = np.frombuffer(b, dtype=np.uint8).reshape(540, 960, 3)
        r, _ = ocr(im)
        rows.append({"t": round(i / 6, 4), "text": [
            {"box": x[0], "text": x[1], "confidence": float(x[2])} for x in (r or [])]})
        i += 1
    p.wait()
    (HERE / "data/ocr_survey.json").write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--survey", action="store_true", help="re-run the optional 6fps OCR survey")
    ap.add_argument("--ffmpeg", default="ffmpeg")
    args = ap.parse_args()
    assert sha256(SOURCE) == SOURCE_SHA, "source video changed; re-review timing before rendering"
    if args.survey:
        survey(args.ffmpeg)
    timeline = build()
    write_outputs(timeline)
    print(f"locked {len(timeline['cues'])} lyric cues / {timeline['frames']} frames / {timeline['duration']:.3}s")


if __name__ == "__main__":
    main()
