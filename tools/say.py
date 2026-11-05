#!/usr/bin/env python3
"""Switchable TTS front-end with measured audio acceptance data.

Engines
-------
edge   Microsoft Edge TTS, zh-CN-XiaoyiNeural, rate +0%, pitch +0Hz (default)
piper  Local/offline Piper zh_CN-huayan-medium placeholder voice
azure  Azure Speech zh-CN-XiaoyiNeural (requires AZURE_SPEECH_KEY and an endpoint)

Examples
--------
    say.py "大家好，本鱼回来了。" out.mp3
    say.py --engine piper "大家好，本鱼回来了。" out.wav
    say.py --engine piper --batch Day1配音台词.txt --outdir day1_audio_piper
    say.py --check day1_audio_piper/L01.wav

No duration is estimated from character count.  Every generated file is read
back and reported with duration, F0 statistics, peak and clipped-sample count.
Piper output is always labelled as a non-final placeholder, never as Xiaoyi.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

XIAOYI_VOICE = "zh-CN-XiaoyiNeural"
PIPER_VOICE = "zh_CN-huayan-medium"
RATE = "+0%"
PITCH = "+0Hz"
F0_RANGE = (290.0, 330.0)
PIPER_POSTPROCESS = "alimiter=limit=0.89,loudnorm=I=-16:TP=-1.5:LRA=11"
CLIP_THRESHOLD = 0.999

ENGINE_KINDS = ("edge", "piper", "azure")


def find_ffmpeg() -> str | None:
    p = shutil.which("ffmpeg")
    if p:
        return p
    try:
        import imageio_ffmpeg  # type: ignore

        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return None


def clean_text(text: str) -> str:
    text = " ".join(text.strip().split())
    if not text:
        raise ValueError("台词不能为空")
    if "\n" in text or "\r" in text:
        raise ValueError("一次只允许合成一句（单行）台词")
    return text


def normalize_engine_kind(engine: str) -> str:
    e = engine.strip().lower()
    if e.startswith("piper"):
        return "piper"
    if e.startswith("azure"):
        return "azure"
    if e.startswith("edge") or e in {"xiaoyi", "zh-cn-xiaoyineural"}:
        return "edge"
    raise ValueError(f"不支持的 TTS 引擎：{engine}（只支持 edge|piper|azure）")


def resolve_piper_model(model_arg: str | None = None) -> Path:
    """Find the local Piper ONNX model without downloading anything implicitly."""
    requested = model_arg or os.environ.get("PIPER_MODEL")
    candidates: list[Path] = []
    if requested:
        p = Path(requested).expanduser()
        candidates.append(p)
        if p.suffix != ".onnx":
            # Accept a bare voice name such as zh_CN-huayan-medium.
            candidates += [
                Path.home() / "tools" / "models" / f"{requested}.onnx",
                Path.home() / ".local" / "share" / "piper" / f"{requested}.onnx",
                Path.cwd() / f"{requested}.onnx",
            ]
    candidates += [
        Path.home() / "tools" / "models" / f"{PIPER_VOICE}.onnx",
        Path.home() / ".local" / "share" / "piper" / f"{PIPER_VOICE}.onnx",
        Path.cwd() / f"{PIPER_VOICE}.onnx",
        Path(__file__).resolve().parent / "models" / f"{PIPER_VOICE}.onnx",
    ]
    seen: set[Path] = set()
    for p in candidates:
        p = p.expanduser()
        if p in seen:
            continue
        seen.add(p)
        if p.is_file() and p.stat().st_size > 1_000_000:
            cfg = Path(str(p) + ".json")
            if not cfg.is_file():
                raise RuntimeError(f"Piper 模型缺少同名配置：{cfg}")
            return p
    tried = "\n".join(f"  - {p}" for p in seen)
    raise RuntimeError(
        "找不到 Piper 中文模型。请先把 zh_CN-huayan-medium.onnx 与 .onnx.json "
        "放到 ~/tools/models/，或用 --piper-model 指定。已查找：\n" + tried
    )


def engine_config(engine: str, piper_model: str | None = None) -> dict:
    kind = normalize_engine_kind(engine)
    if kind == "piper":
        model = resolve_piper_model(piper_model)
        voice = model.stem
        return {
            "kind": kind,
            "engine": f"piper/{voice}",
            "voice": voice,
            "model": str(model),
            "final_voice": False,
            "placeholder": True,
            "extension": ".wav",
            "rate": "length_scale=1.0",
            "pitch": "model-default",
            "postprocess": PIPER_POSTPROCESS,
        }
    canonical = f"{kind}/{XIAOYI_VOICE}"
    return {
        "kind": kind,
        "engine": canonical,
        "voice": XIAOYI_VOICE,
        "model": XIAOYI_VOICE,
        "final_voice": True,
        "placeholder": False,
        "extension": ".mp3",
        "rate": RATE,
        "pitch": PITCH,
        "postprocess": None,
    }


def read_duration(path: Path) -> float:
    ffprobe = shutil.which("ffprobe")
    if ffprobe:
        r = subprocess.run(
            [ffprobe, "-v", "error", "-show_entries", "format=duration",
             "-of", "json", str(path)],
            text=True, capture_output=True, check=True,
        )
        return float(json.loads(r.stdout)["format"]["duration"])
    # Mutagen first for MP3; WAV/other formats fall through to ffmpeg.
    try:
        from mutagen.mp3 import MP3  # type: ignore

        audio = MP3(str(path))
        if audio.info and audio.info.length:
            return float(audio.info.length)
    except Exception:
        pass
    ffmpeg = find_ffmpeg()
    if not ffmpeg:
        raise RuntimeError("无法回读时长：未发现 ffprobe、mutagen 或 ffmpeg")
    r = subprocess.run([ffmpeg, "-i", str(path)], text=True, capture_output=True)
    import re

    m = re.search(r"Duration: (\d+):(\d+):(\d+(?:\.\d+)?)", r.stderr)
    if not m:
        raise RuntimeError(f"无法从 ffmpeg 输出解析时长：{path}")
    h, mi, s = m.groups()
    return int(h) * 3600 + int(mi) * 60 + float(s)


def decode_audio_native(path: Path):
    """Decode at the native rate without FFmpeg's potentially hot downmix.

    Returns a normalized mono mix for F0 analysis plus peak statistics taken
    from the original channels.  This matters for stereo files: FFmpeg's
    ``-ac 1`` rematrix can sum identical L/R content above 0 dBFS and falsely
    report clipping even when neither source channel clips.
    """
    ffmpeg = find_ffmpeg()
    if not ffmpeg:
        raise RuntimeError("无法解码做音频检查：未发现 ffmpeg")
    import re

    import numpy as np

    r = subprocess.run(
        [ffmpeg, "-v", "info", "-i", str(path), "-f", "f32le", "-"],
        capture_output=True, check=True,
    )
    m = re.search(rb"Audio:.*?(\d+) Hz(?:,\s*([^,\r\n]+))?", r.stderr)
    sample_rate = int(m.group(1)) if m else 48000
    layout = (m.group(2).decode("ascii", "ignore").strip().lower() if m and m.group(2) else "mono")
    channel_counts = {
        "mono": 1,
        "stereo": 2,
        "2.1": 3,
        "3.0": 3,
        "3.0(back)": 3,
        "4.0": 4,
        "quad": 4,
        "quad(side)": 4,
        "5.0": 5,
        "5.0(side)": 5,
        "5.1": 6,
        "5.1(side)": 6,
        "6.1": 7,
        "7.1": 8,
    }
    channels = channel_counts.get(layout, 1)
    flat = np.frombuffer(r.stdout, dtype=np.float32).copy()
    usable = (flat.size // channels) * channels
    if usable == 0:
        raise RuntimeError("音频为空，无法检查峰值")
    framed = flat[:usable].reshape(-1, channels)
    stats = peak_stats(framed)
    stats["channel_count"] = int(channels)
    stats["frame_count"] = int(framed.shape[0])
    mono = framed.mean(axis=1, dtype=np.float64).astype(np.float32)
    return mono, sample_rate, stats


def decode_pcm_native(path: Path):
    """Backward-compatible normalized mono decode at the native sample rate."""
    mono, sample_rate, _stats = decode_audio_native(path)
    return mono, sample_rate


def peak_stats(x) -> dict:
    import numpy as np

    if x.size == 0:
        raise RuntimeError("音频为空，无法检查峰值")
    peak = float(np.max(np.abs(x)))
    clipped = int(np.sum(np.abs(x) >= CLIP_THRESHOLD))
    return {
        "peak": round(peak, 6),
        "clipped_samples": clipped,
        "sample_count": int(x.size),
    }


def f0_stats_from_pcm(x, sr: int) -> dict:
    """Autocorrelation F0 estimate over voiced 40 ms frames (20 ms hop)."""
    import numpy as np

    if x.size == 0:
        raise RuntimeError("音频为空，无法做 F0 检查")
    frame = int(0.040 * sr)
    hop = int(0.020 * sr)
    min_lag = int(sr / 500)   # search 100-500 Hz
    max_lag = int(sr / 100)
    vals: list[float] = []
    voiced = 0
    total = 0
    for start in range(0, max(0, len(x) - frame), hop):
        seg = x[start:start + frame].astype(np.float64)
        seg -= np.mean(seg)
        rms = float(np.sqrt(np.mean(seg * seg)))
        total += 1
        if rms < 0.015:
            continue
        corr = np.correlate(seg, seg, mode="full")[len(seg) - 1:]
        if corr[0] <= 0:
            continue
        window = corr[min_lag:max_lag + 1]
        lag_rel = int(np.argmax(window))
        lag = min_lag + lag_rel
        strength = float(window[lag_rel] / corr[0])
        if strength < 0.35:
            continue
        if 0 < lag_rel < len(window) - 1:
            a, b, c = window[lag_rel - 1], window[lag_rel], window[lag_rel + 1]
            denom = a - 2 * b + c
            shift = 0.5 * (a - c) / denom if denom != 0 else 0.0
        else:
            shift = 0.0
        f0 = sr / (lag + shift)
        if 100 <= f0 <= 500:
            vals.append(float(f0))
            voiced += 1
    if not vals:
        raise RuntimeError("没有检测到足够的有声帧，无法给出 F0 中位数")
    arr = np.array(vals, dtype=np.float64)
    med = float(np.median(arr))
    in_range = bool(F0_RANGE[0] <= med <= F0_RANGE[1])
    return {
        "f0_median_hz": round(med, 2),
        "f0_p25_hz": round(float(np.percentile(arr, 25)), 2),
        "f0_p75_hz": round(float(np.percentile(arr, 75)), 2),
        "voiced_frames": int(voiced),
        "analyzed_frames": int(total),
        "f0_in_290_330_hz": in_range,
        "f0_target_met": in_range,
    }


def analyze_audio(path: Path) -> dict:
    duration = read_duration(path)
    x, sr, native_peak_stats = decode_audio_native(path)
    return {
        "duration_seconds": round(duration, 3),
        "duration_sec_measured": round(duration, 3),  # legacy field name
        "sample_rate_hz": int(sr),
        **native_peak_stats,
        **f0_stats_from_pcm(x, sr),
    }


def synth_edge(text: str, output: Path, proxy: str | None = None) -> None:
    exe = shutil.which("edge-tts")
    base = [exe] if exe else [sys.executable, "-m", "edge_tts"]
    cmd = base + [
        "--voice", XIAOYI_VOICE,
        f"--rate={RATE}",
        f"--pitch={PITCH}",
        "--text", text,
        "--write-media", str(output),
    ]
    if proxy:
        cmd += ["--proxy", proxy]
    r = subprocess.run(cmd, text=True, capture_output=True)
    if r.returncode != 0:
        if output.exists() and output.stat().st_size < 100:
            output.unlink()  # edge-tts may create a 0-byte file before connecting
        tail = (r.stderr or r.stdout or "edge-tts failed without output")[-2000:]
        raise RuntimeError(f"Edge TTS 合成失败（exit {r.returncode}）：\n{tail}")


def synth_azure(text: str, output: Path) -> None:
    """Azure Speech REST path for the same Xiaoyi voice; key stays in env vars."""
    key = os.environ.get("AZURE_SPEECH_KEY")
    endpoint = os.environ.get("AZURE_SPEECH_ENDPOINT")
    region = os.environ.get("AZURE_SPEECH_REGION")
    if not key:
        raise RuntimeError("Azure 引擎未配置：缺少环境变量 AZURE_SPEECH_KEY")
    if endpoint:
        endpoint = endpoint.rstrip("/")
        if endpoint.endswith("/tts/cognitiveservices/v1"):
            url = endpoint
        elif "cognitiveservices" in endpoint and endpoint.count("/") <= 3:
            url = endpoint + "/tts/cognitiveservices/v1"
        else:
            url = endpoint
    elif region:
        url = f"https://{region}.tts.speech.microsoft.com/cognitiveservices/v1"
    else:
        raise RuntimeError(
            "Azure 引擎未配置端点：请设置 AZURE_SPEECH_ENDPOINT 或 AZURE_SPEECH_REGION"
        )

    speak = ET.Element("speak", {"version": "1.0", "xml:lang": "zh-CN"})
    voice_el = ET.SubElement(speak, "voice", {"name": XIAOYI_VOICE})
    prosody = ET.SubElement(voice_el, "prosody", {"rate": RATE, "pitch": PITCH})
    prosody.text = text
    ssml = ET.tostring(speak, encoding="utf-8", xml_declaration=True)
    req = urllib.request.Request(
        url,
        data=ssml,
        method="POST",
        headers={
            "Ocp-Apim-Subscription-Key": key,
            "Content-Type": "application/ssml+xml",
            "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
            "User-Agent": "day1-say.py",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = resp.read()
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")[-1000:]
        raise RuntimeError(f"Azure Speech 合成失败（HTTP {e.code}）：{body}") from e
    except Exception as e:
        raise RuntimeError(f"Azure Speech 合成失败：{e}") from e
    if len(data) < 100:
        raise RuntimeError("Azure Speech 返回了空音频")
    output.write_bytes(data)


def _run_checked(cmd: list[str], *, input_text: str | None = None, label: str) -> None:
    r = subprocess.run(cmd, input=input_text, text=True, capture_output=True)
    if r.returncode != 0:
        tail = (r.stderr or r.stdout or f"{label} failed without output")[-2000:]
        raise RuntimeError(f"{label}失败（exit {r.returncode}）：\n{tail}")


def synth_piper(text: str, output: Path, cfg: dict) -> dict:
    """Generate one Piper WAV, then apply the fixed limiter/loudnorm chain."""
    model = Path(cfg["model"])
    ffmpeg = find_ffmpeg()
    if not ffmpeg:
        raise RuntimeError("Piper 后处理需要 ffmpeg（或 imageio-ffmpeg）")
    suffix = output.suffix.lower()
    if suffix not in {".wav", ".mp3"}:
        raise RuntimeError("Piper 单句输出只支持 .wav 或 .mp3")

    output.parent.mkdir(parents=True, exist_ok=True)
    raw_fd, raw_name = tempfile.mkstemp(prefix=output.stem + ".raw.", suffix=".wav", dir=output.parent)
    os.close(raw_fd)
    proc_fd, proc_name = tempfile.mkstemp(prefix=output.stem + ".proc.", suffix=".wav", dir=output.parent)
    os.close(proc_fd)
    raw, processed = Path(raw_name), Path(proc_name)
    try:
        exe = shutil.which("piper")
        base = [exe] if exe else [sys.executable, "-m", "piper"]
        cmd = base + [
            "--model", str(model),
            "--output_file", str(raw),
            "--length-scale", "1.0",
            "--volume", "1.0",
        ]
        _run_checked(cmd, input_text=text + "\n", label="Piper 合成")
        if not raw.is_file() or raw.stat().st_size < 100:
            raise RuntimeError(f"Piper 未生成有效 WAV：{raw}")
        raw_x, _raw_sr = decode_pcm_native(raw)
        raw_peak = peak_stats(raw_x)

        _run_checked(
            [ffmpeg, "-y", "-v", "error", "-i", str(raw),
             "-af", PIPER_POSTPROCESS, "-ar", "48000", "-c:a", "pcm_s16le", str(processed)],
            label="Piper 限幅/响度后处理",
        )
        if suffix == ".wav":
            shutil.move(str(processed), str(output))
        else:
            _run_checked(
                [ffmpeg, "-y", "-v", "error", "-i", str(processed),
                 "-c:a", "libmp3lame", "-q:a", "3", str(output)],
                label="Piper MP3 转码",
            )
        return {
            "raw_peak": raw_peak["peak"],
            "raw_clipped_samples": raw_peak["clipped_samples"],
            "postprocess": PIPER_POSTPROCESS,
        }
    finally:
        for p in (raw, processed):
            try:
                if p.exists():
                    p.unlink()
            except OSError:
                pass


def synthesize_one(
    text: str,
    output: Path,
    cfg: dict,
    *,
    proxy: str | None = None,
) -> dict:
    text = clean_text(text)
    output.parent.mkdir(parents=True, exist_ok=True)
    extra: dict = {}
    if cfg["kind"] == "edge":
        synth_edge(text, output, proxy=proxy)
    elif cfg["kind"] == "azure":
        synth_azure(text, output)
    elif cfg["kind"] == "piper":
        extra = synth_piper(text, output, cfg)
    else:  # pragma: no cover - normalize_engine_kind prevents this
        raise RuntimeError(f"未知引擎：{cfg['kind']}")

    if not output.exists() or output.stat().st_size < 100:
        raise RuntimeError(f"TTS 未生成有效文件：{output}")
    item = {
        "file": str(output),
        "text": text,
        "engine": cfg["engine"],
        "engine_kind": cfg["kind"],
        "measured": True,
        "dirty": False,
        "voice": cfg["voice"],
        "model": cfg["model"],
        "final_voice": bool(cfg["final_voice"]),
        "placeholder": bool(cfg["placeholder"]),
        "non_xiaoyi_placeholder": bool(cfg["placeholder"]),
        "rate": cfg["rate"],
        "pitch": cfg["pitch"],
        **analyze_audio(output),
        **extra,
    }
    if cfg["kind"] == "piper":
        item["postprocess"] = PIPER_POSTPROCESS
    return item


def policy_ok(items: list[dict], cfg: dict) -> bool:
    """Piper may pass as a structural placeholder; Xiaoyi final must meet F0."""
    if cfg["final_voice"]:
        return all(bool(x.get("f0_target_met")) for x in items)
    return True


def main() -> int:
    ap = argparse.ArgumentParser(description="可切换 TTS（edge|piper|azure）+ 时长/F0/峰值/削顶回读")
    ap.add_argument("text", nargs="?", help="单句台词")
    ap.add_argument("output", nargs="?", help="输出音频（edge/azure: MP3；piper: WAV 或 MP3）")
    ap.add_argument("--engine", default="edge", help="edge|piper|azure（默认 edge/晓伊）")
    ap.add_argument("--piper-model", metavar="ONNX", help="Piper 模型路径或语音名（默认 zh_CN-huayan-medium）")
    ap.add_argument("--proxy", metavar="URL", help="仅 Edge：传给 edge-tts --proxy")
    ap.add_argument("--batch", metavar="TXT", help="按行批量合成的台词文件")
    ap.add_argument("--outdir", metavar="DIR", help="批量输出目录（L01.* 起）")
    ap.add_argument("--check", metavar="AUDIO", help="只回读检查已有音频的时长/F0/峰值/削顶（不合成）")
    args = ap.parse_args()

    cfg_for_error: dict | None = None
    try:
        if args.check:
            path = Path(args.check)
            item = {"file": str(path), "measured": True, **analyze_audio(path)}
            print(json.dumps(item, ensure_ascii=False, indent=2))
            # In check mode the caller may explicitly identify a placeholder.
            if normalize_engine_kind(args.engine) == "piper":
                return 0
            return 0 if item["f0_target_met"] else 3

        cfg = engine_config(args.engine, args.piper_model)
        cfg_for_error = cfg

        if args.batch:
            if not args.outdir:
                ap.error("--batch 需要同时给出 --outdir")
            lines = [
                clean_text(x)
                for x in Path(args.batch).read_text(encoding="utf-8").splitlines()
                if x.strip()
            ]
            outdir = Path(args.outdir)
            items: list[dict] = []
            for i, line in enumerate(lines, 1):
                item = synthesize_one(
                    line,
                    outdir / f"L{i:02d}{cfg['extension']}",
                    cfg,
                    proxy=args.proxy,
                )
                item["i"] = i
                item["cue"] = i
                items.append(item)
                print(
                    f"L{i:02d} engine={item['engine']} duration={item['duration_seconds']:.3f}s "
                    f"F0median={item['f0_median_hz']:.2f}Hz peak={item['peak']:.3f} "
                    f"clipped={item['clipped_samples']} final_voice={item['final_voice']} "
                    f"file={item['file']}",
                    flush=True,
                )
            f0_ok = all(bool(x.get("f0_target_met")) for x in items)
            ok = policy_ok(items, cfg)
            payload = {
                "schema_version": 2,
                "engine": cfg["engine"],
                "engine_kind": cfg["kind"],
                "measured": True,
                "voice": cfg["voice"],
                "model": cfg["model"],
                "final_voice": bool(cfg["final_voice"]),
                "placeholder": bool(cfg["placeholder"]),
                "non_xiaoyi_placeholder": bool(cfg["placeholder"]),
                "rate": cfg["rate"],
                "pitch": cfg["pitch"],
                "postprocess": cfg.get("postprocess"),
                "f0_target_hz": list(F0_RANGE),
                "f0_target_met": f0_ok,
                "count": len(items),
                "ok": ok,
                "items": items,
            }
            report_path = outdir / "tts_report.json"
            report_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
            print(json.dumps({
                "ok": ok,
                "engine": cfg["engine"],
                "final_voice": bool(cfg["final_voice"]),
                "f0_target_met": f0_ok,
                "count": len(items),
                "report": str(report_path),
            }, ensure_ascii=False))
            return 0 if ok else 3

        if not args.text or not args.output:
            ap.error('单句模式需要：say.py [--engine edge|piper|azure] "台词" 输出音频')
        item = synthesize_one(args.text, Path(args.output), cfg, proxy=args.proxy)
        print(json.dumps(item, ensure_ascii=False, indent=2))
        return 0 if policy_ok([item], cfg) else 3
    except Exception as e:
        err = {"ok": False, "error": str(e)}
        if cfg_for_error:
            err.update({
                "engine": cfg_for_error["engine"],
                "voice": cfg_for_error["voice"],
                "rate": cfg_for_error["rate"],
                "pitch": cfg_for_error["pitch"],
                "final_voice": bool(cfg_for_error["final_voice"]),
            })
        else:
            try:
                kind = normalize_engine_kind(args.engine)
            except Exception:
                kind = "edge"
            err.update({
                "engine": args.engine,
                "voice": PIPER_VOICE if kind == "piper" else XIAOYI_VOICE,
                "rate": "length_scale=1.0" if kind == "piper" else RATE,
                "pitch": "model-default" if kind == "piper" else PITCH,
                "final_voice": kind != "piper",
            })
        print(json.dumps(err, ensure_ascii=False, indent=2), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
