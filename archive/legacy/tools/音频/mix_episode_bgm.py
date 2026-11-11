#!/usr/bin/env python3
"""通用 BGM + 词点/开场瞬态 SFX 独立 Stem 混音器（与任何单集解耦）。

- 伴奏在本模块内按系列既定路线程序化生成（128 BPM、Am-F-C-G 芯片风），
  不再动态加载任何单集脚本；起音 0.06s 快速切入，消除前段听觉真空。
- 开场/词点瞬态音效只写进独立伴奏 stem（.flac），干声永不改动：
  成片 = 干声 + stem，可做减法恢复人声相关性校验。
- 视频基本流逐字节复制（-c:v copy），并断言哈希一致。
"""
import argparse
import hashlib
import json
import math
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools/验收'))
from media_common import binary, probe  # noqa: E402

SR = 48000
BPM = 128
BEAT = 60.0 / BPM


def sha(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()


def pcm(p):
    raw = subprocess.check_output([binary('ffmpeg'), '-v', 'error', '-i', str(p),
                                   '-map', '0:a:0', '-ar', str(SR), '-ac', '2', '-f', 'f32le', '-'])
    return np.frombuffer(raw, dtype='<f4').reshape(-1, 2)


def video_hash(p):
    return hashlib.sha256(subprocess.check_output(
        [binary('ffmpeg'), '-v', 'error', '-i', str(p), '-map', '0:v:0',
         '-c', 'copy', '-bsf:v', 'h264_mp4toannexb', '-f', 'h264', '-'])).hexdigest()


def fit(x, n):
    return np.pad(x, ((0, max(0, n - len(x))), (0, 0)))[:n]


def rms(x):
    return float(np.sqrt(np.mean(np.asarray(x, dtype=np.float64) ** 2) + 1e-16))


def corr(a, b):
    return float(np.corrcoef(a.ravel().astype('float64'), b.ravel().astype('float64'))[0, 1])


def generate_bgm(duration):
    """128 BPM Am-F-C-G：正弦低音 + 柔化方波琶音；0.06s 快起、尾部 1.2s 收。"""
    n = int(duration * SR)
    tt = np.arange(n) / SR
    bgm = np.zeros(n, dtype=np.float32)
    chords = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]
    bar_dur = BEAT * 4

    def tone(freq, start, dur, vol, kind='square'):
        i0, i1 = int(start * SR), min(n, int((start + dur) * SR))
        if i1 <= i0:
            return
        ph = 2 * np.pi * freq * tt[i0:i1]
        w = np.sign(np.sin(ph)) * 0.6 + 0.4 * np.sin(ph) if kind == 'square' else np.sin(ph)
        env = np.exp(-3.0 * np.linspace(0, 1, i1 - i0))
        bgm[i0:i1] += (w * env * vol).astype(np.float32)

    for b in range(int(math.ceil(duration / bar_dur))):
        ch = chords[b % 4]
        root_f = 440 * 2 ** ((ch[0] - 24 - 69) / 12)
        for beat in range(4):
            tone(root_f, b * bar_dur + beat * BEAT, BEAT * 0.95, 0.16, 'sine')
        for e in range(8):
            note = ch[e % 3] + (12 if e in (3, 6) else 0)
            tone(440 * 2 ** ((note - 69) / 12), b * bar_dur + e * BEAT / 2, BEAT * 0.42, 0.075)
    bgm = np.convolve(bgm, np.ones(24, dtype=np.float32) / 24, mode='same').astype(np.float32)
    fade = np.minimum(1, np.minimum(tt / 0.06, np.maximum(0, (duration - tt) / 1.2)))
    return (bgm * fade.astype(np.float32))


def add_tone(stem, t0, freq_a, freq_b, dur, vol, kind='sine'):
    n = len(stem)
    i0, i1 = max(0, int(t0 * SR)), min(n, int((t0 + dur) * SR))
    if i1 <= i0:
        return
    tt = np.arange(i1 - i0) / SR
    freq = freq_a + (freq_b - freq_a) * (tt / max(dur, 1e-9))
    phase = 2 * np.pi * np.cumsum(freq) / SR
    wave = np.sin(phase) if kind == 'sine' else np.sign(np.sin(phase)) * 0.5 + 0.5 * np.sin(phase)
    env = np.exp(-4.0 * tt / dur) * np.minimum(1, tt / 0.008)
    stem[i0:i1] += (wave * env * vol).astype(np.float32)


def synthesize_sfx(stem, events):
    """把瞬态音效叠进伴奏 stem（单声道生成后复制双声道由调用方处理）。"""
    for ev in events:
        kind, t0 = ev['kind'], float(ev['time'])
        if kind == 'alert_pop':
            add_tone(stem, t0, 880, 880, 0.09, 0.20)
            add_tone(stem, t0 + 0.07, 1318, 1318, 0.11, 0.16)
        elif kind == 'whoosh':
            add_tone(stem, t0, 320, 920, 0.22, 0.10)
        elif kind in ('stamp_thud', 'bonk', 'knock'):
            add_tone(stem, t0, 190, 90, 0.16, 0.30)
            add_tone(stem, t0, 720, 620, 0.05, 0.10, kind='square')
        else:
            raise ValueError(f'未知音效类型：{kind}')
    return stem


def auto_sfx_events(alignment):
    """开场三连：0.02s 提示音；首句 >=0.25s 气口中点滑音；其余由 --events-json 声明。"""
    events = [{'kind': 'alert_pop', 'time': 0.02, 'reason': 'opener_banner'}]
    cues = alignment.get('cues') or []
    if cues:
        chars = cues[0].get('chars_timed') or []
        for a, b in zip(chars, chars[1:]):
            gap = float(b['start']) - float(a['end'])
            if gap >= 0.25:
                events.append({'kind': 'whoosh', 'time': round((float(a['end']) + float(b['start'])) / 2, 3),
                               'reason': 'first_cue_breath_gap'})
                break
    return events


def duck_and_mix(duration, voice, extra_events):
    n = round(duration * SR)
    dry = fit(voice, n)
    raw = generate_bgm(n / SR)
    stem_mono = synthesize_sfx(raw.copy(), extra_events)
    # duration*SR 的 int/round 会差 1 个采样，对齐后再做掩码。
    if len(stem_mono) < n:
        stem_mono = np.pad(stem_mono, (0, n - len(stem_mono)))
    elif len(stem_mono) > n:
        stem_mono = stem_mono[:n]
    hop = 960
    mono = dry.mean(axis=1)
    count = math.ceil(n / hop)
    env = np.array([rms(mono[i * hop:min(n, (i + 1) * hop)]) for i in range(count)])
    active = env > 0.012
    mask = np.repeat(active, hop)[:n]
    voice_rms = rms(dry[mask]) if mask.any() else rms(dry)
    raw_rms = rms(stem_mono[mask]) if mask.any() else rms(stem_mono)
    speech_gain = min(0.23, 0.14 * voice_rms / max(raw_rms, 1e-9))
    target = np.where(active, speech_gain, speech_gain * 1.6)
    gain = float(target[0])
    smoothed = []
    for value in target:
        tau = 0.04 if value < gain else 0.22
        gain += (value - gain) * (1 - math.exp(-0.02 / tau))
        smoothed.append(gain)
    gain_samples = np.interp(np.arange(n), np.arange(count) * hop, np.asarray(smoothed))
    bgm = stem_mono * gain_samples
    stem = np.stack([bgm, bgm], axis=1)
    stem_i16 = np.round(stem * 32768).clip(-32768, 32767).astype('<i2')
    settings = {'bpm': BPM, 'chords': 'Am F C G', 'fade_in_seconds': 0.06,
                'speech_bgm_gain': float(speech_gain), 'duck_attack_seconds': 0.04,
                'duck_release_seconds': 0.22, 'sfx_events': extra_events}
    return dry, stem_i16, mask, settings


def main(argv=None):
    ap = argparse.ArgumentParser(description='通用 BGM+SFX 混音（干声 + 独立 stem）')
    ap.add_argument('--base', type=Path, required=True, help='干声基片 MP4（视频流将被逐字节复制）')
    ap.add_argument('--voice', type=Path, required=True, help='指定干声 WAV')
    ap.add_argument('--alignment', type=Path, required=True)
    ap.add_argument('--output', type=Path, required=True)
    ap.add_argument('--stem', type=Path, required=True, help='独立伴奏 stem .flac 输出')
    ap.add_argument('--report', type=Path, required=True)
    ap.add_argument('--events-json', type=Path, help='额外词点音效 [{kind,time}]（stamp_thud/bonk/knock/whoosh）')
    ap.add_argument('--no-auto-sfx',action='store_true',help='仅使用显式词点音效，不加默认片头瞬态')
    args = ap.parse_args(argv)
    base, out = args.base.resolve(), args.output.resolve()
    if base == out:
        raise SystemExit('必须保留干声基片，不得覆盖')
    alignment = json.loads(args.alignment.read_text(encoding='utf-8'))
    if alignment.get('measured') is not True:
        raise SystemExit('只接受 measured=true 实测轴')
    if sha(args.voice) != alignment['source_sha256']:
        raise SystemExit('音源 SHA256 与实测轴不匹配')
    events = [] if args.no_auto_sfx else auto_sfx_events(alignment)
    if args.events_json:
        events += json.loads(args.events_json.read_text(encoding='utf-8'))

    meta = probe(base)
    v = next(s for s in meta['streams'] if s['codec_type'] == 'video')
    duration = float(v['duration'])
    n = round(duration * SR)
    source_pcm = pcm(args.voice)
    if not (0 <= (n - len(source_pcm)) / SR <= 0.31):
        raise SystemExit('基片时长与干声不匹配（会切尾音或拖尾）')
    dry, stem_i16, active, settings = duck_and_mix(duration, source_pcm, events)
    stem = stem_i16.astype(np.float32) / 32768
    expected = dry + stem
    peak = float(abs(expected).max())
    if peak >= 0.98:
        raise SystemExit(f'混音峰值 {peak:.3f} >= 0.98，拒绝削波出片')

    args.stem.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run([binary('ffmpeg'), '-v', 'error', '-y', '-f', 's16le', '-ar', str(SR),
                    '-ac', '2', '-i', '-', '-c:a', 'flac', str(args.stem)],
                   input=stem_i16.tobytes(), check=True)
    with tempfile.TemporaryDirectory(prefix='episode-bgm-') as tmp:
        mix = Path(tmp) / 'mix.f32'
        mix.write_bytes(expected.astype('<f4').tobytes())
        out.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run([binary('ffmpeg'), '-v', 'error', '-y', '-i', str(base),
                        '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', str(mix),
                        '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac',
                        '-b:a', '192k', '-ar', str(SR), '-t', str(duration),
                        '-movflags', '+faststart', str(out)], check=True)
    decoded = fit(pcm(out), n)
    stored = fit(pcm(args.stem), n)
    mixture_corr = corr(dry + stored, decoded)
    recovered = decoded - stored
    voice_corr = corr(dry, recovered)
    voice_gain = float(np.sum(dry.astype('float64') * recovered) / np.sum(dry.astype('float64') ** 2))
    if not (mixture_corr > 0.999 and voice_corr > 0.999):
        raise SystemExit(f'相关性不达标：mixture={mixture_corr} voice={voice_corr}')
    if not (0.995 < voice_gain < 1.005):
        raise SystemExit(f'恢复人声增益越界：{voice_gain}')
    if video_hash(base) != video_hash(out):
        raise SystemExit('视频基本流发生变化')
    subprocess.run([binary('ffmpeg'), '-v', 'error', '-xerror', '-i', str(out), '-f', 'null', '-'], check=True)
    below_db = 20 * math.log10(rms(dry[active]) / max(rms(stored[active]), 1e-12)) if active.any() else 99.0
    if below_db < 16:
        raise SystemExit(f'对白段伴奏仅低 {below_db:.1f} dB（须 >=16）')
    head = stored[:int(0.25 * SR)]
    report = {'passed': True, 'base': str(base), 'output': str(out),
              'base_sha256': sha(base), 'output_sha256': sha(out), 'auto_sfx_enabled': not args.no_auto_sfx,
              'bgm_stem': str(args.stem), 'bgm_sha256': sha(args.stem),
              'source_voice_sha256': sha(args.voice), 'settings': settings,
              'duration': duration, 'frames': int(v['nb_frames']),
              'video_stream_unchanged': True,
              'mixture_reconstruction_zero_offset_correlation': mixture_corr,
              'known_stem_subtraction_voice_correlation': voice_corr,
              'recovered_voice_gain': voice_gain,
              'voice_active_bgm_below_voice_db': below_db,
              'expected_peak': peak, 'decoded_peak': float(abs(decoded).max()),
              'stem_first_250ms_rms': rms(head), 'full_decode_exit': 0}
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
