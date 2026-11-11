#!/usr/bin/env python3
"""成片音轨：把音源按采样对齐到画面时间轴，必要时淡出 / 垫配乐 → 48kHz 立体声 WAV

  MV ：原曲从 offset 处对上画面；片子比歌短时，最后 fade-out 秒线性淡出。
  Day：干声（配音）原速、零改动地放进去；可选垫一条配乐，说话时自动压低（ducking）。
       配乐只写进独立的伴奏 stem，成片 = 干声 + stem，所以随时能用「成片 − stem」把人声原样减回来核对。

  python3 audio_mix.py --src <48k 立体声.wav> --out <mix.wav> --report <json> --duration <秒>
        [--offset 0] [--fade-out 1.5]
        [--bgm <48k.wav> | --bgm-chip 128] [--stem <stem.wav>]

--offset：正数 = 音源整体晚这么多秒进（画面先走）；负数 = 丢掉音源开头这么多秒。
--bgm-chip 128：程序生成的芯片风伴奏（128 BPM、Am–F–C–G、正弦低音 + 柔化方波琶音），
                是 Day 系列一直用的配乐路线；说话时伴奏约比人声低 17 dB，气口回升到 1.6 倍。
只依赖 numpy。
"""
import argparse
import json
import math
import wave

import numpy as np

SR = 48000


def read_wav(path):
    w = wave.open(path, 'rb')
    if w.getframerate() != SR or w.getsampwidth() != 2:
        raise SystemExit(f'{path} 必须是 48kHz 16bit WAV')
    x = np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').reshape(-1, w.getnchannels()).astype(np.float32) / 32768
    return x if x.shape[1] == 2 else np.repeat(x[:, :1], 2, axis=1)


def write_wav(path, x):
    i16 = np.round(np.clip(x, -1, 32767 / 32768) * 32768).astype('<i2')
    with wave.open(path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(i16.tobytes())
    return i16


def rms(x):
    return float(np.sqrt(np.mean(np.asarray(x, dtype=np.float64) ** 2) + 1e-16))


def db(x):
    return round(20 * math.log10(max(x, 1e-9)), 2)


def chip_bgm(duration, bpm=128):
    """Am–F–C–G：正弦低音 + 柔化方波琶音；0.06 秒快起、结尾 1.2 秒收。"""
    beat = 60.0 / bpm
    n = int(duration * SR)
    tt = np.arange(n) / SR
    out = np.zeros(n, dtype=np.float32)
    chords = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]
    bar = beat * 4

    def tone(freq, start, dur, vol, kind='square'):
        i0, i1 = int(start * SR), min(n, int((start + dur) * SR))
        if i1 <= i0:
            return
        ph = 2 * np.pi * freq * tt[i0:i1]
        w = np.sign(np.sin(ph)) * 0.6 + 0.4 * np.sin(ph) if kind == 'square' else np.sin(ph)
        out[i0:i1] += (w * np.exp(-3.0 * np.linspace(0, 1, i1 - i0)) * vol).astype(np.float32)

    for b in range(int(math.ceil(duration / bar))):
        ch = chords[b % 4]
        root = 440 * 2 ** ((ch[0] - 24 - 69) / 12)
        for k in range(4):
            tone(root, b * bar + k * beat, beat * 0.95, 0.16, 'sine')
        for e in range(8):
            note = ch[e % 3] + (12 if e in (3, 6) else 0)
            tone(440 * 2 ** ((note - 69) / 12), b * bar + e * beat / 2, beat * 0.42, 0.075)
    out = np.convolve(out, np.ones(24, dtype=np.float32) / 24, mode='same').astype(np.float32)
    fade = np.minimum(1, np.minimum(tt / 0.06, np.maximum(0, (duration - tt) / 1.2)))
    return out * fade.astype(np.float32)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--report', required=True)
    ap.add_argument('--duration', type=float, required=True)
    ap.add_argument('--offset', type=float, default=0.0)
    ap.add_argument('--fade-out', type=float, default=0.0)
    ap.add_argument('--bgm')
    ap.add_argument('--bgm-chip', type=float)
    ap.add_argument('--bgm-gain-db', type=float, default=-20.0, help='外部配乐文件在说话时相对人声的电平（dB）')
    ap.add_argument('--duck-db', type=float, default=-8.0, help='外部配乐文件：气口处比说话时高多少（负数，表示说话时再压这么多）')
    ap.add_argument('--stem')
    a = ap.parse_args()

    src = read_wav(a.src)
    n = round(a.duration * SR)
    off = round(a.offset * SR)
    dry = np.zeros((n, 2), dtype=np.float32)
    # 画面第 i 个采样 ← 音源第 i − off 个采样
    lo, hi = max(0, off), min(n, off + len(src))
    if hi > lo:
        dry[lo:hi] = src[lo - off:hi - off]
    dry_src = dry.copy()  # 音源原样摆上时间轴的样子（淡出、叠伴奏之前），最后用来分辨「音源自带的满刻度」
    report = {'sample_rate': SR, 'samples': n, 'seconds': round(n / SR, 6), 'offset_seconds': a.offset,
              'source_seconds': round(len(src) / SR, 3), 'source_used': [round(max(0, -off) / SR, 3), round((hi - off) / SR, 3)]}
    cut_tail = off + len(src) - n  # 音源在片尾之后还剩多少采样
    report['source_remaining_after_end_seconds'] = round(max(0, cut_tail) / SR, 3)
    report['silence_after_source_seconds'] = round(max(0, -cut_tail) / SR, 3)

    # 片子在音源中途结束 → 线性淡出；音源自己先结束就不动它
    fade_n = round(a.fade_out * SR)
    if fade_n > 0 and cut_tail > SR * 0.05:
        g = np.ones(n, dtype=np.float32)
        g[n - fade_n:] = (n - np.arange(n - fade_n, n)) / fade_n
        dry *= g[:, None]
        report['fade_out_seconds'] = a.fade_out
    else:
        report['fade_out_seconds'] = 0
        if cut_tail > SR * 0.05:
            report['warning'] = f'片尾硬切：音源在片尾之后还有 {cut_tail / SR:.2f}s，且没有设置 fadeOut'

    mix = dry
    if a.bgm or a.bgm_chip:
        mono = dry.mean(axis=1)
        hop = 960  # 20 ms
        count = math.ceil(n / hop)
        env = np.array([rms(mono[i * hop:min(n, (i + 1) * hop)]) for i in range(count)])
        active = env > 0.012
        mask = np.repeat(active, hop)[:n]
        voice_rms = rms(dry[mask]) if mask.any() else rms(dry)
        if a.bgm_chip:
            raw = chip_bgm(n / SR, a.bgm_chip)
            raw = np.pad(raw, (0, max(0, n - len(raw))))[:n]
            raw_rms = rms(raw[mask]) if mask.any() else rms(raw)
            speech_gain = min(0.23, 0.14 * voice_rms / max(raw_rms, 1e-9))
            gap_gain = speech_gain * 1.6
            raw2 = np.stack([raw, raw], axis=1)
            source = f'chip {a.bgm_chip:g} BPM Am-F-C-G'
        else:
            b = read_wav(a.bgm)
            reps = int(math.ceil(n / max(1, len(b))))
            raw2 = np.tile(b, (reps, 1))[:n]
            edge = np.minimum(1, np.minimum(np.arange(n) / (0.06 * SR), np.maximum(0, (n - np.arange(n)) / (1.2 * SR)))).astype(np.float32)
            raw2 = raw2 * edge[:, None]
            raw_rms = rms(raw2[mask]) if mask.any() else rms(raw2)
            speech_gain = voice_rms * 10 ** (a.bgm_gain_db / 20) / max(raw_rms, 1e-9)
            gap_gain = speech_gain * 10 ** (-a.duck_db / 20)
            source = a.bgm
        target = np.where(active, speech_gain, gap_gain)
        g, sm = float(target[0]), []
        for v in target:  # 压低快（40ms），回升慢（220ms），听不出抽吸
            tau = 0.04 if v < g else 0.22
            g += (v - g) * (1 - math.exp(-0.02 / tau))
            sm.append(g)
        gain = np.interp(np.arange(n), np.arange(count) * hop, np.asarray(sm)).astype(np.float32)
        stem = raw2 * gain[:, None]
        stem_i16 = write_wav(a.stem, stem) if a.stem else np.round(np.clip(stem, -1, 32767 / 32768) * 32768).astype('<i2')
        stem = stem_i16.astype(np.float32) / 32768
        mix = dry + stem
        bgm_speech = rms(stem[mask]) if mask.any() else rms(stem)
        report['bgm'] = {
            'source': source, 'speech_fraction': round(float(mask.mean()), 3),
            'voice_rms_db_during_speech': db(voice_rms), 'bgm_rms_db_during_speech': db(bgm_speech),
            'bgm_below_voice_db': round(db(voice_rms) - db(bgm_speech), 2),
            'bgm_rms_db_in_gaps': db(rms(stem[~mask])) if (~mask).any() else None,
            'duck_attack_seconds': 0.04, 'duck_release_seconds': 0.22,
        }

    peak = float(np.max(np.abs(mix))) if n else 0.0
    if (a.bgm or a.bgm_chip) and peak > 1.0:  # 只有「干声 + 伴奏」叠加后才可能越界：整体等比压回去，不做削波
        mix = mix * (0.985 / peak)
        report['normalised_gain'] = round(0.985 / peak, 5)
    out_i16 = write_wav(a.out, mix)
    report['peak_dbfs'] = db(float(np.max(np.abs(out_i16))) / 32768) if n else None
    # 顶到满刻度的采样分两种：音源自己就顶满的（流行歌的母带常常如此，原样搬过来不算混音的错），
    # 和混音这一步新弄出来的（音源那一处没顶满、输出却顶满了——这才是削波）。
    full_out = np.abs(out_i16.astype(np.int32)) >= 32767
    full_src = np.abs(np.round(dry_src * 32768)) >= 32767
    report['clipped_samples'] = int(full_out.sum())
    report['full_scale_samples_from_source'] = int((full_out & full_src).sum())
    report['clipped_by_mix'] = int((full_out & ~full_src).sum())
    report['rms_dbfs'] = db(rms(out_i16.astype(np.float32) / 32768))
    with open(a.report, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=1)
    print('MIX', json.dumps(report, ensure_ascii=False))


if __name__ == '__main__':
    main()
