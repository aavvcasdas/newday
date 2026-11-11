#!/usr/bin/env python3
"""成片自检 → out/qa.json

  python3 qa_check.py frames <PNG序列目录>          逐帧：缺帧 / 空画面 / 与上一帧完全相同
  python3 qa_check.py final  <成片.mp4> <原曲.wav> <成片音轨.wav>   音画规格 + 音轨与原曲的采样级偏移

（WAV 由 render.mjs qa 用内置 ffmpeg 解出；依赖 numpy、Pillow）
"""
import hashlib
import json
import os
import sys
import wave
from multiprocessing import Pool

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
QA = os.path.join(HERE, 'out', 'qa.json')
TOTAL = 4272
BG = np.array([5, 6, 15])  # MVComp 的底色 #05060f：WebGL 没画上时整屏就是它


def one(path):
    from PIL import Image
    im = Image.open(path).convert('RGB')
    raw = im.tobytes()
    small = np.asarray(im.resize((96, 54), Image.BILINEAR), dtype=np.int16)
    bg_frac = float((np.abs(small - BG).sum(axis=2) < 12).mean())
    luma = float((small * np.array([0.2126, 0.7152, 0.0722])).sum(axis=2).mean())
    return im.size, hashlib.md5(raw).hexdigest(), round(bg_frac, 4), round(luma, 2)


def frames(d):
    paths = [os.path.join(d, f'f{i:05d}.png') for i in range(TOTAL)]
    missing = [i for i, p in enumerate(paths) if not os.path.exists(p)]
    if missing:
        raise SystemExit(f'缺帧 {missing[:20]}…（共 {len(missing)}）')
    with Pool(2) as pool:
        res = pool.map(one, paths, chunksize=32)
    bad_size = [i for i, r in enumerate(res) if r[0] != (1920, 1080)]
    same = [i for i in range(1, TOTAL) if res[i][1] == res[i - 1][1]]
    blank = [i for i, r in enumerate(res) if r[2] > 0.97]
    out = {
        'frames': TOTAL, 'wrong_size': bad_size,
        'identical_to_previous': same, 'blank_background_frames': blank,
        'luma_min': min(r[3] for r in res), 'luma_max': max(r[3] for r in res),
        'sequence_md5': hashlib.md5(''.join(r[1] for r in res).encode()).hexdigest(),
    }
    save('frames', out)
    print(json.dumps({k: (v if not isinstance(v, list) or len(v) < 40 else v[:40] + ['…']) for k, v in out.items()}, ensure_ascii=False))


def read_wav(p):
    w = wave.open(p, 'rb')
    x = np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').reshape(-1, w.getnchannels()).astype(np.float64)
    return w.getframerate(), x.mean(axis=1)


def final(mp4, src_wav, out_wav):
    sr, a = read_wav(src_wav)
    sr2, b = read_wav(out_wav)
    assert sr == sr2 == 48000
    # 20s–80s 一段做互相关，找成片音轨相对原曲的偏移（采样）
    seg = slice(20 * sr, 80 * sr)
    x, y = a[seg] - a[seg].mean(), b[seg] - b[seg].mean()
    n = 1 << int(np.ceil(np.log2(len(x) * 2)))
    c = np.fft.irfft(np.fft.rfft(y, n) * np.conj(np.fft.rfft(x, n)), n)
    lag = int(np.argmax(c))
    lag = lag - n if lag > n // 2 else lag
    corr = float(c[lag] / (np.linalg.norm(x) * np.linalg.norm(y)))
    rms = lambda v: float(np.sqrt((v ** 2).mean()))
    tail = [round(rms(b[int(t * sr):int((t + 0.25) * sr)]) / 32768, 4) for t in (140.5, 141.0, 141.5, 142.0, 142.15)]
    out = {
        'file': os.path.basename(mp4), 'bytes': os.path.getsize(mp4),
        'sha256': hashlib.sha256(open(mp4, 'rb').read()).hexdigest(),
        'audio_samples': len(b), 'audio_seconds': round(len(b) / sr, 4),
        'audio_lag_vs_source_samples': lag, 'audio_lag_vs_source_ms': round(lag / sr * 1000, 3),
        'audio_correlation_20_80s': round(corr, 4), 'tail_rms_140.5_to_142.4': tail,
    }
    save('final', out)
    print(json.dumps(out, ensure_ascii=False))


def save(key, val):
    os.makedirs(os.path.dirname(QA), exist_ok=True)
    data = json.load(open(QA, encoding='utf-8')) if os.path.exists(QA) else {}
    data[key] = val
    json.dump(data, open(QA, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    if sys.argv[1] == 'frames':
        frames(sys.argv[2])
    elif sys.argv[1] == 'final':
        final(*sys.argv[2:5])
