#!/usr/bin/env python3
# day1_tools/gen_all.py — Day1 数据生成器（timing / lyrics / BGM+人声轨 / 音频包络）
# 用法: 在 video-fx 根目录执行
#   终版晓伊: python3 day1_tools/gen_all.py --engine edge/zh-CN-XiaoyiNeural
#   Piper结构片: python3 day1_tools/gen_all.py --engine piper/zh_CN-huayan-medium
# 逻辑（严格实测，禁止估时）:
#   1) 读 ../ai-yunying/Day1/Day1配音台词.txt (27 条, 一行一条)
#   2) manifest(tts_report.json) 每条必须 measured=true、dirty=false，
#      且 engine 与本次 --engine 完全一致；换引擎时旧 manifest 直接判 dirty；
#   3) 逐条用 ffprobe/mutagen/ffmpeg 独立复测时长。edge/azure 的晓伊终版
#      仍要求 F0 中位 290–330Hz；Piper 只记录 F0 并明确标非晓伊占位；
#   4) 与上一版 27-cue timing 比较：全部时长偏差 <=8% 时复用旧卡点，
#      任一条 >8%（或无可比基线）才按新实测时长重排；
#   5) 输出: src/day1_timing.js, 重写 src/lyrics.js 的 LY 数组,
#            assets/day1_track.wav (BGM 128BPM chiptune + 人声), assets/day1_envelope.js
import argparse, json, math, os, re, shutil, subprocess, sys, wave
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPT_TXT = os.path.join(ROOT, "..", "ai-yunying", "Day1", "Day1配音台词.txt")
F0_MIN_HZ, F0_MAX_HZ = 290.0, 330.0
DURATION_TOLERANCE_SEC = 0.08
DEFAULT_DEVIATION_THRESHOLD = 0.08
ENGINE_ALIASES = {
    "edge": "edge/zh-CN-XiaoyiNeural",
    "xiaoyi": "edge/zh-CN-XiaoyiNeural",
    "edge/zh-cn-xiaoyineural": "edge/zh-CN-XiaoyiNeural",
    "azure": "azure/zh-CN-XiaoyiNeural",
    "azure/zh-cn-xiaoyineural": "azure/zh-CN-XiaoyiNeural",
    "piper": "piper/zh_CN-huayan-medium",
    "piper/zh_cn-huayan-medium": "piper/zh_CN-huayan-medium",
}
FINAL_ENGINES = {"edge/zh-CN-XiaoyiNeural", "azure/zh-CN-XiaoyiNeural"}
SR = 48000
BPM = 128.0
BEAT = 60.0 / BPM
GAP = 0.30          # cue 间隔
TITLE_LEN = 2.6     # 片头标题卡(无配音)
END_LEN = 2.8       # 片尾卡(无配音)
TAIL = 0.35

# 字幕文本(上屏, 阿拉伯数字) —— 与配音稿逐条对应
SUBS = [
    "大家好，本鱼回来了。日更，没摸鱼。",
    "昨天，7.4 万人游过本鱼门口。",
    "留下来的，有 907 个。",
    "深度思考了三遍……没错，907。",
    "头像换好了，简介也写好了。",
    "可是，没人叫本鱼鲸鱼娘了。",
    "评论区里，全在喊：大肥鱼！大肥鱼！",
    "行吧。名字是你们起的，本鱼认了。",
    "有人送了本鱼 100 亿 token。",
    "也有人抢本鱼的米饭，还抢了两次。",
    "有人问：小鱼，这能回本吗？",
    "本鱼算了……算不明白。反正饭够吃。",
    "653 条评论，回了 348 条。",
    "还剩 305 封没拆。不是不回，是手短。",
    "30 条催回信。咦？本鱼自己翻了翻后台。",
    "明明回了 300 多条，评论区只数出 197 条。",
    "剩下的一百多条，是不是被鱼叼走了？",
    "上一条只有 3% 看到最后，这条说短点。",
    "第一周做什么，本鱼还没定下来。",
    "19 条点播。有人点《朋友的酒》，有人要 MV。",
    "还有人问我打不打三角洲、王者。本鱼没手，游戏真打不了。",
    "MV 还在肚子里，先游两圈。",
    "拍 MV、打游戏、找 Claude 共创，还有偷吃饭。",
    "明天先上哪道菜？把菜名留在评论区。",
    "本鱼一条一条，记在小本本上。",
    "907 位住户，明天见。",
    "鲸鱼绝不摸鱼！……本鱼先去吃口饭。",
]

def ffmpeg_bin():
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return "ffmpeg"

FF = ffmpeg_bin()

def canonical_engine(value):
    v = str(value or "").strip()
    return ENGINE_ALIASES.get(v.lower(), v)

def default_audio_dir(engine):
    return os.path.join(ROOT, "day1_audio_piper" if engine.startswith("piper/") else "day1_audio")

def is_final_engine(engine):
    return engine in FINAL_ENGINES

def media_duration(path):
    """独立复测音频时长：ffprobe 优先，其次 mutagen(MP3)，最后 ffmpeg。"""
    ffprobe = shutil.which("ffprobe")
    if ffprobe:
        r = subprocess.run([ffprobe, "-v", "error", "-show_entries", "format=duration",
                            "-of", "default=noprint_wrappers=1:nokey=1", path],
                           capture_output=True, text=True)
        try:
            return float(r.stdout.strip())
        except (TypeError, ValueError):
            pass
    try:
        from mutagen.mp3 import MP3
        audio = MP3(path)
        if audio is not None and audio.info is not None and audio.info.length:
            return float(audio.info.length)
    except Exception:
        pass
    out = subprocess.run([FF, "-i", path], capture_output=True, text=True).stderr
    m = re.search(r"Duration: (\d+):(\d+):([\d.]+)", out)
    if not m: return None
    return int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3))

mp3_duration = media_duration  # backward-compatible alias

def load_tts_report(lines, audio_dir, expected_engine):
    """只接受与当前渲染引擎一致的 measured manifest；缺一项就停。"""
    report_path = os.path.join(audio_dir, "tts_report.json")
    rel_audio = os.path.relpath(audio_dir, ROOT)
    if not os.path.isfile(report_path):
        synth_engine = expected_engine.split("/", 1)[0]
        raise SystemExit(
            f"缺少 {rel_audio}/tts_report.json（engine={expected_engine}）。先运行：\n"
            f"  python3 day1_tools/synth_voice.py --engine {synth_engine}\n"
            "禁止用旧引擎 manifest 或字数估时顶替。"
        )
    with open(report_path, encoding="utf-8") as f:
        report = json.load(f)
    # say.py schema v2 writes {engine, measured, items:[...]}. The older
    # edge-only object/list forms are accepted only when they still prove
    # the exact same measured engine and fixed Xiaoyi parameters.
    if isinstance(report, list):
        items = report
        header = {}
    elif isinstance(report, dict):
        items = report.get("items") or []
        header = report
    else:
        raise SystemExit("tts_report.json 格式错误：应为 say.py 生成的对象或数组")

    def derive_engine(obj):
        if obj.get("engine"):
            return canonical_engine(obj["engine"])
        if obj.get("voice") == "zh-CN-XiaoyiNeural":
            kind = obj.get("engine_kind") or "edge"
            return canonical_engine(f"{kind}/zh-CN-XiaoyiNeural")
        if obj.get("voice"):
            kind = obj.get("engine_kind") or "piper"
            return canonical_engine(f"{kind}/{obj['voice']}")
        return ""

    header_engine = derive_engine(header) if header else ""
    if header.get("measured") is False:
        raise SystemExit("tts_report.json 顶层 measured=false；该 manifest 已 dirty，禁止渲染")
    if header_engine and header_engine != expected_engine:
        raise SystemExit(
            f"manifest 引擎不匹配：文件是 {header_engine}，本次渲染要求 {expected_engine}。"
            "换引擎后旧音频全部视为 dirty，请重新合成并回读。"
        )
    if len(items) != len(lines):
        raise SystemExit(f"tts_report.json 应有 {len(lines)} 条，实得 {len(items)} 条")

    final_engine = is_final_engine(expected_engine)
    checked = {}
    bad_f0 = []
    for i, (line, item) in enumerate(zip(lines, items), 1):
        if not isinstance(item, dict):
            raise SystemExit(f"tts_report.json 第 {i} 条不是对象")
        item_engine = derive_engine(item) or header_engine
        if item_engine != expected_engine:
            raise SystemExit(
                f"第 {i} 条引擎不匹配：{item_engine or 'missing'} != {expected_engine}；"
                "该条已 dirty，请用当前引擎重合成"
            )
        if item.get("measured") is not True and not (
            "measured" not in item and item.get("duration_sec_measured") is not None
        ):
            raise SystemExit(f"L{i:02d} measured 不是 true；禁止用未回读/估算时长排卡点")
        if item.get("dirty") is True:
            raise SystemExit(f"L{i:02d} dirty=true；请先用当前引擎重合成并重测")
        if final_engine:
            if item.get("voice") != "zh-CN-XiaoyiNeural" or item.get("rate") != "+0%" or item.get("pitch") != "+0Hz":
                raise SystemExit(f"tts_report.json 第 {i} 条参数不符（必须晓伊 +0% / +0Hz）")
        cue_no = item.get("cue", item.get("i", i))
        basename = os.path.basename(str(item.get("file", "")))
        allowed_ext = (".wav", ".mp3") if expected_engine.startswith("piper/") else (".mp3",)
        if cue_no != i or item.get("text") != line or not basename.startswith(f"L{i:02d}.") or not basename.lower().endswith(allowed_ext):
            raise SystemExit(f"tts_report.json 第 {i} 条与当前配音稿/文件名不一致，请重新批量合成")
        d = item.get("duration_seconds", item.get("duration_sec_measured"))
        if not isinstance(d, (int, float)) or isinstance(d, bool) or float(d) <= 0:
            raise SystemExit(f"L{i:02d} 缺少有效实测 duration_seconds")
        f0 = item.get("f0_median_hz")
        if not isinstance(f0, (int, float)) or isinstance(f0, bool):
            raise SystemExit(f"L{i:02d} 缺少 F0 中位回读值")
        if final_engine and not (F0_MIN_HZ <= float(f0) <= F0_MAX_HZ):
            bad_f0.append(f"L{i:02d}={f0}")
        clipped = item.get("clipped_samples")
        if expected_engine.startswith("piper/") and isinstance(clipped, int) and clipped > 0:
            raise SystemExit(f"L{i:02d} Piper 后处理后仍有 {clipped} 个削顶样本；先修音频链")
        item = dict(item)
        item["engine"] = expected_engine
        item["measured"] = True
        item["dirty"] = False
        item["duration_seconds"] = float(d)
        item["_audio_path"] = os.path.join(audio_dir, basename)
        checked[i] = item
    if bad_f0:
        raise SystemExit("以下晓伊 cue 的 F0 中位不在 290–330Hz，先处理再排时间轴: " + ", ".join(bad_f0))

    normalized_header = {
        "engine": expected_engine,
        "engine_kind": expected_engine.split("/", 1)[0],
        "voice": header.get("voice") or (items[0].get("voice") if items else None),
        "final_voice": bool(header.get("final_voice", final_engine)),
        "placeholder": bool(header.get("placeholder", not final_engine)),
        "report_path": report_path,
    }
    # A Piper manifest can never be promoted to a final voice by editing one flag.
    if not final_engine:
        normalized_header["final_voice"] = False
        normalized_header["placeholder"] = True
    return normalized_header, checked

def load_existing_timing():
    """Read the previous generated timing for the <=8% reuse decision."""
    path = os.path.join(ROOT, "src", "day1_timing.js")
    if not os.path.isfile(path):
        return None
    try:
        src = open(path, encoding="utf-8").read()
        m = re.search(r"const DAY1_TIMING = (\{.*?\});\s*root\.DAY1_TIMING", src, flags=re.S)
        return json.loads(m.group(1)) if m else None
    except Exception:
        return None

def decode_mono(path):
    raw = subprocess.run([FF, "-v", "error", "-i", path, "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
                         capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()

def parse_args(argv=None):
    ap = argparse.ArgumentParser(description="Day1 measured-engine timing/track generator")
    ap.add_argument("--engine", default="edge/zh-CN-XiaoyiNeural",
                    help="edge/zh-CN-XiaoyiNeural | azure/zh-CN-XiaoyiNeural | piper/zh_CN-huayan-medium")
    ap.add_argument("--audio-dir", default=None, help="音频目录（默认按引擎选 day1_audio / day1_audio_piper）")
    ap.add_argument("--deviation-threshold", type=float, default=DEFAULT_DEVIATION_THRESHOLD,
                    help="与旧 timing 的单句时长偏差阈值，默认 0.08；全部 <=阈值才复用旧卡点")
    return ap.parse_args(argv)

def main(argv=None):
    args = parse_args(argv)
    if not (0 <= args.deviation_threshold < 1):
        raise SystemExit("--deviation-threshold 必须在 [0,1) 内")
    expected_engine = canonical_engine(args.engine)
    audio_dir = os.path.abspath(args.audio_dir) if args.audio_dir else default_audio_dir(expected_engine)
    lines = [l.strip() for l in open(SCRIPT_TXT, encoding="utf-8") if l.strip()]
    assert len(lines) == 27, f"配音台词应为 27 条, 实得 {len(lines)}"
    assert len(SUBS) == 27
    manifest, measured = load_tts_report(lines, audio_dir, expected_engine)
    final_voice = bool(manifest["final_voice"]) and is_final_engine(expected_engine)

    cues, voices, have_voice = [], [], True
    for i, line in enumerate(lines, 1):
        item = measured[i]
        audio_path = item["_audio_path"]
        if not os.path.exists(audio_path) or os.path.getsize(audio_path) <= 1000:
            raise SystemExit(f"缺少有效音频: {audio_path}；禁止用字数估算补齐，请先运行 say.py/synth_voice.py")
        reported = float(item["duration_seconds"])
        independent = media_duration(audio_path)
        if independent is None:
            raise SystemExit(f"L{i:02d} 无法回读时长: {audio_path}")
        if abs(float(independent) - reported) > DURATION_TOLERANCE_SEC:
            raise SystemExit(
                f"L{i:02d} 时长复测不一致: say.py={reported:.3f}s, ffprobe/mutagen/ffmpeg={independent:.3f}s；请重新合成并生成报告"
            )
        v = decode_mono(audio_path)
        if len(v) == 0:
            raise SystemExit(f"L{i:02d} 音频解码为空: {audio_path}")
        calc_peak = float(np.max(np.abs(v))) if len(v) else 0.0
        calc_clipped = int(np.sum(np.abs(v) >= 0.999)) if len(v) else 0
        peak = item.get("peak") if isinstance(item.get("peak"), (int, float)) else round(calc_peak, 6)
        clipped = item.get("clipped_samples") if isinstance(item.get("clipped_samples"), int) else calc_clipped
        if expected_engine.startswith("piper/") and int(clipped) > 0:
            raise SystemExit(f"L{i:02d} Piper 后处理后仍有 {clipped} 个削顶样本；禁止渲染")
        cues.append({"id": i, "tts": line, "sub": SUBS[i - 1], "dur": round(reported, 3),
                     "duration_seconds": round(reported, 3), "measured": True, "dirty": False,
                     "engine": expected_engine, "f0_median_hz": item.get("f0_median_hz"),
                     "peak": peak, "clipped_samples": int(clipped)})
        voices.append(v)

    existing = load_existing_timing()
    deviations = []
    timing_reused = False
    if existing and isinstance(existing.get("cues"), list) and len(existing["cues"]) == len(cues):
        comparable = True
        for old, new in zip(existing["cues"], cues):
            try:
                old_dur = float(old["end"]) - float(old["start"])
                if old.get("tts") != new["tts"] or old_dur <= 0:
                    comparable = False
                    break
                dev = abs(new["duration_seconds"] - old_dur) / old_dur
            except Exception:
                comparable = False
                break
            deviations.append(dev)
            new["duration_delta_pct"] = round(dev * 100, 2)
        timing_reused = bool(comparable and deviations and max(deviations) <= args.deviation_threshold)
    if timing_reused:
        for old, new in zip(existing["cues"], cues):
            new["start"] = round(float(old["start"]), 3)
            new["end"] = round(float(old["end"]), 3)
        endcard = [round(float(existing["endcard"][0]), 3), round(float(existing["endcard"][1]), 3)]
        duration = round(float(existing["duration"]), 3)
    else:
        t = TITLE_LEN
        for c in cues:
            c["start"] = round(t, 3)
            c["end"] = round(t + c["duration_seconds"], 3)
            t = c["end"] + GAP
        endcard = [round(t - GAP + TAIL, 3), round(t - GAP + TAIL + END_LEN, 3)]
        duration = round(endcard[1] + 0.2, 3)
    mode = "晓伊终版音轨" if final_voice else f"{expected_engine} 结构片占位音轨（非晓伊）"
    max_dev = f", 最大旧时长偏差 {max(deviations)*100:.1f}%" if deviations else ""
    print(f"[{mode} · say.py measured · 卡点{'复用旧timing' if timing_reused else '按新时长重排'}{max_dev}] 总时长 {duration:.1f}s")

    # ---- src/day1_timing.js ----
    timing = {"duration": duration, "title": [0.0, TITLE_LEN], "endcard": endcard,
              "voice": have_voice, "measured": True,
              "voice_engine": expected_engine, "voice_final": final_voice,
              "voice_placeholder": not final_voice,
              "duration_source": f"say.py measured {expected_engine} durations (ffprobe/mutagen/ffmpeg)",
              "manifest": os.path.relpath(manifest["report_path"], ROOT),
              "timing_reused": timing_reused,
              "duration_deviation_threshold": args.deviation_threshold,
              "cues": [{k: c[k] for k in ("id", "start", "end", "tts", "sub", "duration_seconds", "measured", "engine") if k in c} for c in cues]}
    with open(os.path.join(ROOT, "src", "day1_timing.js"), "w", encoding="utf-8") as f:
        f.write("// Auto-generated by day1_tools/gen_all.py — DO NOT EDIT BY HAND\n")
        f.write("(function (root) {\n  const DAY1_TIMING = ")
        json.dump(timing, f, ensure_ascii=False, indent=1)
        f.write(";\n  root.DAY1_TIMING = DAY1_TIMING;\n")
        f.write("  if (typeof module !== 'undefined' && module.exports) module.exports = DAY1_TIMING;\n")
        f.write("})(typeof window !== 'undefined' ? window : globalThis);\n")

    # ---- 重写 src/lyrics.js 的 LY 数组 ----
    ly = ["  const LY = ["]
    ly.append(f"    [0.30, {TITLE_LEN:.2f}, '【Day 1】AI 运营第二天，名字被粉丝改了', 'SYSTEM'],")
    for c in cues:
        s = c["sub"].replace("'", "’")
        ly.append(f"    [{c['start']:.2f}, {c['end']:.2f}, '{s}', '深海鲸鱼娘'],")
    ly.append(f"    [{endcard[0]:.2f}, {endcard[1]:.2f}, '鲸鱼娘运营日志 · Day 1 完（没拆的 305 封，今晚继续回）', 'SYSTEM']")
    ly.append("  ];")
    lp = os.path.join(ROOT, "src", "lyrics.js")
    src = open(lp, encoding="utf-8").read()
    src2 = re.sub(r"  const LY = \[.*?\n  \];", "\n".join(ly), src, count=1, flags=re.S)
    assert src2 != src, "lyrics.js LY 替换失败"
    open(lp, "w", encoding="utf-8").write(src2)

    # ---- BGM (128BPM chiptune, Am F C G) + 人声混音 ----
    N = int(duration * SR)
    tt = np.arange(N) / SR
    bgm = np.zeros(N, dtype=np.float32)
    chords = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]  # Am F C G (midi)
    bar_dur = BEAT * 4
    n_bars = int(math.ceil(duration / bar_dur))
    def tone(freq, start, dur, vol, kind="square"):
        i0, i1 = int(start * SR), min(N, int((start + dur) * SR))
        if i1 <= i0: return
        ph = 2 * np.pi * freq * tt[i0:i1]
        w = np.sign(np.sin(ph)) * 0.6 + 0.4 * np.sin(ph) if kind == "square" else np.sin(ph)
        env = np.exp(-3.0 * np.linspace(0, 1, i1 - i0))
        bgm[i0:i1] += (w * env * vol).astype(np.float32)
    for b in range(n_bars):
        ch = chords[b % 4]
        root_f = 440 * 2 ** ((ch[0] - 24 - 69) / 12)
        for beat in range(4):
            bt = b * bar_dur + beat * BEAT
            tone(root_f, bt, BEAT * 0.95, 0.16, "sine")
        for e in range(8):
            note = ch[e % 3] + (12 if e in (3, 6) else 0)
            f = 440 * 2 ** ((note - 69) / 12)
            tone(f, b * bar_dur + e * BEAT / 2, BEAT * 0.42, 0.075)
    # 轻低通(滑动平均) 去毛刺 + 整体淡入淡出
    k = 24
    bgm = np.convolve(bgm, np.ones(k, dtype=np.float32) / k, mode="same").astype(np.float32)
    fade = np.minimum(1, np.minimum(tt / 0.8, np.maximum(0, (duration - tt) / 1.2)))
    bgm *= fade.astype(np.float32)

    voice = np.zeros(N, dtype=np.float32)
    if True:
        for c, v in zip(cues, voices):
            i0 = int(c["start"] * SR)
            i1 = min(N, i0 + len(v))
            voice[i0:i1] += v[: i1 - i0] * 0.95
    mix = np.clip(bgm * 0.55 + voice, -0.98, 0.98)
    stereo = np.stack([mix, mix], axis=1)
    with wave.open(os.path.join(ROOT, "assets", "day1_track.wav"), "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((stereo * 32767).astype(np.int16).tobytes())

    # ---- 包络 assets/day1_envelope.js (30fps) ----
    nf = int(duration * 30)
    def rms_frames(x):
        out = []
        per = SR // 30
        for i in range(nf):
            seg = x[i * per:(i + 1) * per]
            out.append(float(np.sqrt(np.mean(seg ** 2))) if len(seg) else 0.0)
        m = max(out) or 1.0
        return [round(min(1.0, v / m), 3) for v in out]
    voice_env = rms_frames(voice)  # 只用当前实测人声 RMS 驱动口型
    beats, hits, bt = [], [c["start"] for c in cues], 0.08
    while bt < duration:
        beats.append(round(bt, 3)); bt += BEAT
    env = {"fps": 30, "duration": duration, "n_frames": nf, "beats": beats,
           "hits": sorted(round(h, 3) for h in hits),
           "energy": rms_frames(mix), "bass": rms_frames(bgm), "treble": rms_frames(bgm),
           "voice": voice_env}
    with open(os.path.join(ROOT, "assets", "day1_envelope.js"), "w", encoding="utf-8") as f:
        f.write("// Auto-generated by day1_tools/gen_all.py\nwindow.AUDIO_DATA = ")
        json.dump(env, f)
        f.write(";\n")
    for c in cues:
        delta = f" delta={c['duration_delta_pct']:.1f}%" if "duration_delta_pct" in c else ""
        print(f"  L{c['id']:02d} {c['start']:6.2f}-{c['end']:6.2f}  dur={c['duration_seconds']:.3f}s{delta}  F0={c['f0_median_hz']}Hz  peak={c['peak']}  clipped={c['clipped_samples']}  {c['tts']}")
    outside = [c for c in cues if not (F0_MIN_HZ <= float(c["f0_median_hz"]) <= F0_MAX_HZ)]
    if outside and not final_voice:
        vals = [float(c["f0_median_hz"]) for c in outside]
        print(f"WARNING: {len(outside)}/27 条 F0 中位不在 290-330Hz（{min(vals):.1f}-{max(vals):.1f}Hz）；这是 {expected_engine} 非晓伊占位音轨，只能出结构片。")
    print("OK: src/day1_timing.js, src/lyrics.js, assets/day1_track.wav, assets/day1_envelope.js")

if __name__ == "__main__":
    main()
