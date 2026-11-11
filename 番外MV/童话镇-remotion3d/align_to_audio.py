#!/usr/bin/env python3
"""按原曲实测节拍，把 31 句歌词起点对齐到真实拍点 → audio_sync.json

背景：页面里的时间轴直接用仓库 SRT（看参考片字幕手工量的，标称误差 ≤0.15s），节拍网格是
「每句 8 拍等分」估出来的，页面自己也注明「未经音频实测」。MVComp 的镜头切点、歌词条、
角色踩拍动作全部由 starts/ends 这两个 props 派生，所以对齐只需要换这两个数组，不改任何代码。

做法（只依赖 numpy）：
  1. 原曲（22.05kHz 立体声 WAV）→ 频谱通量起音包络 → 梳状搜索得到拍长 T 与相位，全曲分窗复核是否稳定；
  2. 每句 SRT 起点吸附到最近的实拍（只在 ±半拍内移动，不改句序、不增删句）；
  3. 句尾跟着下一句起点平移（保持原 SRT 的句间空隙）；第 19 句与第 31 句的句尾不动，
     因为它们决定间奏起点和全片总长（保持 4272 帧）。
不做的事：不判定人声的逐字位置（没有做人声分离），所以这是「拍点级」对齐，不是逐音节对齐。

用法：python3 align_to_audio.py <song_22k.wav> [--out audio_sync.json]
（WAV 由 `node render.mjs align` 用内置 ffmpeg 从 童话镇.mp4 解出并自动调用本脚本）
"""
import json
import sys
import wave

import numpy as np

SRT_STARTS = [
    13.55, 17.0, 20.4, 23.8, 27.3, 30.6, 34.0, 37.3, 41.15, 44.3, 47.9, 51.2,
    54.95, 61.45, 64.95, 68.45, 71.75, 75.25, 78.75,
    97.45, 100.95, 104.45, 107.95, 111.45, 114.75, 118.15, 121.55, 125.15, 128.45, 131.95, 134.95,
]
SRT_ENDS = [
    16.95, 20.35, 23.75, 27.25, 30.55, 33.95, 37.25, 41.05, 44.25, 47.85, 51.15, 54.85,
    61.35, 64.85, 68.35, 71.65, 75.15, 78.65, 85.6,
    100.85, 104.35, 107.85, 111.35, 114.65, 118.05, 121.45, 125.05, 128.35, 131.85, 134.85, 137.85,
]
KEEP_END = {18, 30}  # 第 19 / 31 句句尾不动（间奏起点、全片总长）
N_FFT, HOP = 1024, 220


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


def main():
    wav = sys.argv[1]
    out_path = sys.argv[sys.argv.index('--out') + 1] if '--out' in sys.argv else 'audio_sync.json'
    sr, L, R = load(wav)
    dur = len(L) / sr
    XM, XS = stft((L + R) / 2), stft((L - R) / 2)
    tfr = (np.arange(XM.shape[0]) * HOP + N_FFT / 2) / sr
    dt = HOP / sr

    # —— 1. 起音包络与拍点 ——
    lm = np.log1p(50 * XM)
    flux = np.concatenate([[0], np.maximum(0, np.diff(lm, axis=0)).sum(axis=1)])
    flux = np.maximum(flux - np.convolve(flux, np.ones(21) / 21, mode='same'), 0)
    g = np.exp(-0.5 * (np.arange(-4, 5) / 1.5) ** 2)
    flux = np.convolve(flux, g / g.sum(), mode='same')
    lo_t, hi_t = 10.0, dur - 10.0

    def comb(T, first, a=lo_t, b=hi_t):
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

    beat_time = lambda k: beat0 + k * T

    # —— 2. 吸附到最近实拍 ——
    lines = []
    for i, s in enumerate(SRT_STARTS):
        k = int(round((s - beat0) / T))
        lines.append({'line': i + 1, 'srt_start': s, 'beat_index': k})
    starts = [round(beat_time(l['beat_index']), 3) for l in lines]
    # —— 3. 句尾 ——
    ends = []
    for i, e in enumerate(SRT_ENDS):
        if i in KEEP_END or i + 1 >= len(SRT_STARTS):
            ends.append(e)
        else:
            ends.append(round(starts[i + 1] - (SRT_STARTS[i + 1] - e), 3))
    for i, l in enumerate(lines):
        l.update({'start': starts[i], 'end': ends[i], 'delta': round(starts[i] - l['srt_start'], 3)})
    beats_between = [int(b - a) for a, b in zip([l['beat_index'] for l in lines], [l['beat_index'] for l in lines][1:])]

    deltas = np.array([l['delta'] for l in lines])
    report = {
        'audio': {'duration': round(dur, 3), 'analysis_sample_rate': sr},
        'beat': {
            'period': round(T, 5), 'bpm': round(60 / T, 3), 'first_beat_after_10s': round(beat0, 4),
            'comb_score_vs_baseline': round(score / baseline, 2),
            'local_phase_drift_per_15s_window': drift, 'max_abs_drift': float(np.max(np.abs(drift))),
        },
        'summary': {
            'lines': len(lines), 'mean_abs_delta': round(float(np.mean(np.abs(deltas))), 3),
            'max_abs_delta': round(float(np.max(np.abs(deltas))), 3), 'beats_between_lines': beats_between,
        },
        'starts': starts, 'ends': ends, 'srt_starts': SRT_STARTS, 'srt_ends': SRT_ENDS, 'lines': lines,
    }
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=1)
    print(f"拍长 {T:.5f}s = {60 / T:.3f} BPM，首拍 {beat0:.4f}s，梳状得分为基线的 {score / baseline:.2f} 倍，分窗最大相位漂移 {np.max(np.abs(drift)):.3f}s")
    print('句  SRT起点  对齐起点  移动   拍序号')
    for l in lines:
        print(f"{l['line']:02d} {l['srt_start']:8.2f} {l['start']:9.3f} {l['delta']:+6.3f} {l['beat_index']:6d}")
    print(f"平均移动 {report['summary']['mean_abs_delta']}s，最大移动 {report['summary']['max_abs_delta']}s；相邻两句间隔拍数 {beats_between}")
    print('已写出', out_path)


if __name__ == '__main__':
    main()
