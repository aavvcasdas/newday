#!/usr/bin/env python3
"""MV 对齐：按原曲实测节拍，把每句歌词起点吸附到真实拍点 → cues.json

为什么要做：手量 / 对拍出来的字幕起点有 ±0.1–0.2s 的误差，而镜头切点、歌词条、角色踩拍动作
全部由每句的起止派生。把起点落到实拍上，切镜和动作才真的卡在拍子上。

做法（只依赖 numpy）：
  1. 原曲（22.05kHz 立体声 WAV）→ 频谱通量起音包络 → 梳状搜索得到拍长 T 与相位，全曲分 15 秒窗复核是否稳定；
  2. 每句起点吸附到最近的实拍（只在 ±半拍内移动，不改句序、不增删句）；
  3. 句尾跟着下一句起点平移（保持原字幕的句间空隙）；后面跟着长停顿（> 1 秒）的句子和最后一句的句尾不动，
     因为它们决定间奏起点和全片总长。
不做的事：不判定人声的逐字位置（没有做人声分离），所以这是「拍点级」对齐，不是逐音节对齐。
          速度会变的歌（分窗相位漂移大）会在报告里标出来，那种歌不该用一张固定网格去吸附。

用法（一般由 film.mjs align 调用）：
  python3 align_beats.py --wav <22.05k 立体声.wav> --srt 歌词.srt --out cues.json [--no-snap]
"""
import argparse
import json
import re
import wave

import numpy as np

N_FFT, HOP = 1024, 220
KEEP_END_GAP = 1.0  # 句尾到下一句起点超过这么多秒 → 这是一个段落的收尾，句尾不跟着挪


def parse_srt(path):
    txt = open(path, encoding='utf-8-sig').read().replace('\r\n', '\n')
    out = []
    for block in re.split(r'\n\s*\n', txt.strip()):
        rows = [r for r in block.split('\n') if r.strip()]
        m = None
        for k, r in enumerate(rows):
            m = re.match(r'\s*(\d+):(\d+):(\d+)[,.](\d+)\s*-->\s*(\d+):(\d+):(\d+)[,.](\d+)', r)
            if m:
                text = ' '.join(x.strip() for x in rows[k + 1:])
                break
        if not m or not text:
            continue
        g = [int(x) for x in m.groups()]
        ms = lambda h, mi, s, f: (h * 3600000 + mi * 60000 + s * 1000 + int(str(f).ljust(3, '0')[:3])) / 1000
        out.append({'text': text, 'start': ms(g[0], g[1], g[2], m.group(4)), 'end': ms(g[4], g[5], g[6], m.group(8))})
    if not out:
        raise SystemExit(f'{path} 里没有读到字幕')
    return out


def load(path):
    w = wave.open(path, 'rb')
    sr, ch = w.getframerate(), w.getnchannels()
    x = np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').reshape(-1, ch).astype(np.float32) / 32768
    return sr, x[:, 0], x[:, 1 if ch > 1 else 0]


def stft(x):
    win = np.hanning(N_FFT).astype(np.float32)
    n = 1 + (len(x) - N_FFT) // HOP
    out = np.empty((n, N_FFT // 2 + 1), dtype=np.float32)
    for a in range(0, n, 4000):
        idx = np.arange(N_FFT)[None, :] + HOP * np.arange(a, min(n, a + 4000))[:, None]
        out[a:a + idx.shape[0]] = np.abs(np.fft.rfft(x[idx] * win, axis=1))
    return out


def measure_beat(wav):
    """→ (拍长 T, 一个实拍的时刻 beat0, 梳状得分 / 基线, 分窗相位漂移列表, 时长, 采样率)"""
    sr, L, R = load(wav)
    dur = len(L) / sr
    XM = stft((L + R) / 2)
    tfr = (np.arange(XM.shape[0]) * HOP + N_FFT / 2) / sr
    dt = HOP / sr
    lm = np.log1p(50 * XM)
    flux = np.concatenate([[0], np.maximum(0, np.diff(lm, axis=0)).sum(axis=1)])
    flux = np.maximum(flux - np.convolve(flux, np.ones(21) / 21, mode='same'), 0)
    g = np.exp(-0.5 * (np.arange(-4, 5) / 1.5) ** 2)
    flux = np.convolve(flux, g / g.sum(), mode='same')
    lo_t, hi_t = (10.0, dur - 10.0) if dur > 40 else (min(2.0, dur * 0.1), dur - min(2.0, dur * 0.1))

    def comb(T, first, b=hi_t):
        return float(np.interp(np.arange(first, b, T), tfr, flux).mean())

    f0 = flux[int(lo_t / dt):int(hi_t / dt)]
    f0 = f0 - f0.mean()
    F = np.fft.rfft(f0, n=2 * len(f0))
    ac = np.fft.irfft(F * np.conj(F))[:len(f0)]
    lags = np.arange(len(ac)) * dt
    m = (lags >= 0.3) & (lags <= 0.7)
    T0 = float(lags[m][np.argmax(ac[m])])
    best = (-1.0, T0, 0.0)
    for T in np.arange(T0 * 0.98, T0 * 1.02, 0.00001):
        for phi in np.arange(0, T, 0.003):
            s = comb(T, lo_t + phi)
            if s > best[0]:
                best = (s, float(T), float(phi))
    score, T, phi = best
    fine = np.arange(-0.02, 0.02, 0.0005)
    phi += float(fine[int(np.argmax([comb(T, lo_t + phi + p) for p in fine]))])
    beat0 = lo_t + phi
    baseline = float(flux[int(lo_t / dt):int(hi_t / dt)].mean())
    drift = []
    for a in np.arange(lo_t, hi_t - 15, 15):
        first = beat0 + np.ceil((a - beat0) / T) * T
        ph = np.arange(-0.1, 0.1, 0.002)
        drift.append(round(float(ph[int(np.argmax([np.interp(np.arange(first + p, a + 15, T), tfr, flux).mean() for p in ph]))]), 3))
    return T, beat0, score / baseline, drift, dur, sr


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--wav', required=True)
    ap.add_argument('--srt', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--no-snap', action='store_true', help='只测拍点，不挪字幕起点')
    ap.add_argument('--audio-name', default='')
    ap.add_argument('--audio-sha256', default='')
    ap.add_argument('--srt-name', default='')
    a = ap.parse_args()

    src = parse_srt(a.srt)
    S = [l['start'] for l in src]
    E = [l['end'] for l in src]
    T, beat0, score, drift, dur, sr = measure_beat(a.wav)
    beat_time = lambda k: beat0 + k * T

    idx = [int(round((s - beat0) / T)) for s in S]
    starts = S[:] if a.no_snap else [round(beat_time(k), 3) for k in idx]
    for i in range(1, len(starts)):
        if starts[i] <= starts[i - 1]:
            raise SystemExit(f'第 {i} 句与第 {i + 1} 句吸附到了同一拍（字幕起点只差 {S[i] - S[i - 1]:.2f}s）：这两句太近，先合并字幕或加 --no-snap')
    ends = []
    for i, e in enumerate(E):
        last = i + 1 >= len(S)
        if a.no_snap or last or S[i + 1] - e > KEEP_END_GAP:
            ends.append(e)
        else:
            ends.append(round(starts[i + 1] - (S[i + 1] - e), 3))
    lines = []
    for i, l in enumerate(src):
        lines.append({'text': l['text'], 'start': starts[i], 'end': ends[i], 'srt_start': S[i], 'srt_end': E[i],
                      'delta': round(starts[i] - S[i], 3), 'beat_index': idx[i]})
    deltas = np.array([l['delta'] for l in lines])
    max_drift = float(np.max(np.abs(drift))) if drift else 0.0
    warnings = []
    if score < 2.0:
        warnings.append(f'梳状得分只有基线的 {score:.2f} 倍：这首歌的拍点不明显，吸附结果要人工复核')
    if max_drift > 0.03:
        warnings.append(f'分窗相位漂移最大 {max_drift:.3f}s：速度不稳定，不适合用一张固定网格')
    report = {
        'measured': True,
        'method': '只测拍点，字幕起点未改动' if a.no_snap else '字幕起点吸附到原曲实测拍点（±半拍内）；拍点级对齐，不是逐音节对齐',
        'source': {'subtitles': a.srt_name, 'audio': a.audio_name, 'audio_sha256': a.audio_sha256,
                   'audio_duration': round(dur, 3), 'analysis_sample_rate': sr},
        'beat': {'period': round(T, 5), 'first': round(beat0, 4), 'bar': 4, 'bpm': round(60 / T, 3),
                 'comb_score_vs_baseline': round(score, 2), 'local_phase_drift_per_15s_window': drift, 'max_abs_drift': max_drift},
        'summary': {'lines': len(lines), 'mean_abs_delta': round(float(np.mean(np.abs(deltas))), 3),
                    'max_abs_delta': round(float(np.max(np.abs(deltas))), 3),
                    'beats_between_lines': [int(y - x) for x, y in zip(idx, idx[1:])], 'warnings': warnings},
        'lines': lines,
    }
    with open(a.out, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=1)
        f.write('\n')
    print(f'拍长 {T:.5f}s = {60 / T:.3f} BPM，参考拍 {beat0:.4f}s，梳状得分为基线的 {score:.2f} 倍，分窗最大相位漂移 {max_drift:.3f}s')
    print('句  字幕起点  对齐起点  移动   拍序号')
    for i, l in enumerate(lines):
        print(f"{i + 1:02d} {l['srt_start']:8.2f} {l['start']:9.3f} {l['delta']:+6.3f} {l['beat_index']:6d}")
    print(f"平均移动 {report['summary']['mean_abs_delta']}s，最大移动 {report['summary']['max_abs_delta']}s")
    for w in warnings:
        print('⚠', w)
    print('已写出', a.out)


if __name__ == '__main__':
    main()
