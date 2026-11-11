#!/usr/bin/env python3
"""成片自检 → <输出目录>/qa.json（一般由 film.mjs qa / sheet 调用；依赖 numpy、Pillow）

  qa.py frames <PNG 序列目录> --info info.json --qa qa.json
        逐帧：缺帧 / 尺寸 / 空画面（WebGL 没画上）/ 画面静止 / 每句字幕条是否在场 / 整段序列指纹
  qa.py timing --info info.json --cues cues.json --qa qa.json
        卡点：是不是实测的；MV 的歌词起点离实测拍点多远、切点是否落在拍前 2 帧
  qa.py final <成片.mp4> <音源 48k.wav> <成片音轨 48k.wav> --info info.json --offset 0 --qa qa.json
        成片：音轨相对音源的采样级偏移与相关度、音画时长是否一致、文件大小与 SHA256
  qa.py sheet <清单.json> <输出.jpg>
        分镜总览图
"""
import argparse
import hashlib
import json
import os
import sys
import wave
from multiprocessing import Pool

import numpy as np

BG = np.array([5, 6, 15])  # Film.tsx 的底色 #05060f：WebGL 没画上时整屏就是它


def one(path):
    from PIL import Image
    im = Image.open(path).convert('RGB')
    raw = im.tobytes()
    small = np.asarray(im.resize((96, 54), Image.BILINEAR), dtype=np.int16)
    bg_frac = float((np.abs(small - BG).sum(axis=2) < 12).mean())
    luma = float((small * np.array([0.2126, 0.7152, 0.0722])).sum(axis=2).mean())
    return im.size, hashlib.md5(raw).hexdigest(), round(bg_frac, 4), round(luma, 2)


def gold_pixels(path, height):
    """字幕条的金色描边（#ffd166）在画面底部出现了多少像素"""
    from PIL import Image
    im = np.asarray(Image.open(path).convert('RGB'), dtype=np.int16)
    band = im[int(height * 0.78):int(height * 0.985)]
    r, g, b = band[..., 0], band[..., 1], band[..., 2]
    return int(((r > 215) & (g > 170) & (g < 235) & (b > 60) & (b < 150) & (r - b > 95)).sum())


def save(qa, key, val):
    os.makedirs(os.path.dirname(os.path.abspath(qa)), exist_ok=True)
    data = json.load(open(qa, encoding='utf-8')) if os.path.exists(qa) else {}
    data[key] = val
    json.dump(data, open(qa, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


def frames(a):
    info = json.load(open(a.info, encoding='utf-8'))
    total, fps, W, H = info['frames'], info['fps'], info['width'], info['height']
    paths = [os.path.join(a.dir, f'f{i:05d}.png') for i in range(total)]
    missing = [i for i, p in enumerate(paths) if not os.path.exists(p)]
    if missing:
        raise SystemExit(f'缺帧 {missing[:20]}…（共 {len(missing)}）')
    with Pool(os.cpu_count() or 2) as pool:
        res = pool.map(one, paths, chunksize=32)
    bad_size = [i for i, r in enumerate(res) if r[0] != (W, H)]
    same = [i for i in range(1, total) if res[i][1] == res[i - 1][1]]
    blank = [i for i, r in enumerate(res) if r[2] > 0.97]
    # 连续 ≥4 帧完全相同、且不是全黑 / 全白 → 画面冻住了
    frozen, run = [], []
    for i in same + [None]:
        if run and (i is None or i != run[-1] + 1):
            if len(run) >= 3 and 2 < res[run[0]][3] < 253:
                frozen.append([run[0] - 1, run[-1]])
            run = []
        if i is not None:
            run.append(i)
    # 每个镜头：首帧必须和上一镜的末帧不同（真的切了）
    no_cut = []
    for k, s in enumerate(info['shots'][1:], 1):
        f0 = int(np.ceil(s['a'] * fps - 1e-9))
        if 0 < f0 < total and res[f0][1] == res[f0 - 1][1] and 2 < res[f0][3] < 253:
            no_cut.append(s['id'])
    # 每句字幕：取句子中点那一帧，底部应该有字幕条
    sub_missing = []
    for i, (st, en) in enumerate(zip(info['starts'], info['ends'])):
        f = min(total - 1, int(round((st + min(en, st + 1.2)) / 2 * fps)))
        if gold_pixels(paths[f], H) < 400:
            sub_missing.append({'line': i + 1, 'frame': f, 'text': info['lines'][i]})
    problems = []
    if bad_size: problems.append(f'{len(bad_size)} 帧尺寸不对')
    if blank: problems.append(f'{len(blank)} 帧是空画面（WebGL 没画上）：{blank[:10]}')
    if frozen: problems.append(f'画面冻住 {len(frozen)} 段：{frozen[:6]}')
    if no_cut: problems.append(f'这些镜头的首帧与上一镜末帧完全相同：{no_cut}')
    if sub_missing: problems.append(f'{len(sub_missing)} 句的字幕条没检测到：{[m["line"] for m in sub_missing]}')
    out = {
        'frames': total, 'wrong_size': bad_size, 'identical_to_previous': same, 'blank_background_frames': blank,
        'frozen_runs': frozen, 'shots_without_visible_cut': no_cut, 'subtitle_bar_missing': sub_missing,
        'luma_min': min(r[3] for r in res), 'luma_max': max(r[3] for r in res),
        'sequence_md5': hashlib.md5(''.join(r[1] for r in res).encode()).hexdigest(),
        'problems': problems,
    }
    save(a.qa, 'frames', out)
    json.dump([r[1] for r in res], open(os.path.join(a.dir, '_md5.json'), 'w'))
    print('FRAMES', json.dumps({k: (v if not isinstance(v, list) or len(v) < 40 else v[:40] + ['…']) for k, v in out.items()}, ensure_ascii=False))


def timing(a):
    info = json.load(open(a.info, encoding='utf-8'))
    cues = json.load(open(a.cues, encoding='utf-8'))
    fps = info['fps']
    problems = []
    out = {'measured': bool(cues.get('measured')), 'method': cues.get('method', ''), 'source': cues.get('source', {})}
    if not out['measured']:
        problems.append('卡点是估算的（cues.json measured=false）：只能当无声样片，不能当成片交付')
    if len(cues['lines']) != len(info['lines']):
        problems.append(f"cues.json 有 {len(cues['lines'])} 句，时间轴用的是 {len(info['lines'])} 句")
    beat = cues.get('beat')
    if beat:
        T, b0 = beat['period'], beat['first']
        off = lambda t: ((t - b0 + T / 2) % T) - T / 2  # 离最近实拍的距离（秒），正 = 晚于拍点
        line_off = [round(off(s), 4) for s in info['starts']]
        cut_lead = []  # 每句对应的第一个镜头：切点（按整帧）比最近实拍早几帧
        for i, s in enumerate(info['starts']):
            first = next((sh for sh in info['shots'] if sh['cue'] == i), None)
            if first is None:
                continue
            f0 = int(np.ceil(first['a'] * fps - 1e-9))
            cut_lead.append(round(-off(f0 / fps) * fps, 2))
        out['beat'] = {'bpm': beat.get('bpm', round(60 / T, 3)), 'period': T,
                       'line_start_offset_to_beat_seconds': {'max_abs': float(np.max(np.abs(line_off))), 'mean_abs': round(float(np.mean(np.abs(line_off))), 4)},
                       'cut_frames_before_beat': {'min': min(cut_lead) if cut_lead else None, 'max': max(cut_lead) if cut_lead else None, 'shots': len(cut_lead)}}
        for w in (cues.get('summary') or {}).get('warnings', []):
            problems.append(f'拍点测量警告：{w}')
    if cues.get('summary'):
        out['summary'] = {k: v for k, v in cues['summary'].items() if k != 'beats_between_lines'}
    shots = info['shots']
    short = [s['id'] for s in shots if (s['b'] - s['a']) * fps < 12]
    if short:
        problems.append(f'这些镜头不足 12 帧（0.4 秒），观众来不及看清：{short}')
    out['shots'] = {'count': len(shots), 'shortest_seconds': round(min(s['b'] - s['a'] for s in shots), 3), 'longest_seconds': round(max(s['b'] - s['a'] for s in shots), 3)}
    out['problems'] = problems
    save(a.qa, 'timing', out)
    print('TIMING', json.dumps(out, ensure_ascii=False))


def read_wav(p):
    w = wave.open(p, 'rb')
    x = np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').reshape(-1, w.getnchannels()).astype(np.float64)
    return w.getframerate(), x


def final(a):
    info = json.load(open(a.info, encoding='utf-8'))
    dur = info['frames'] / info['fps']
    sr, src = read_wav(a.src_wav)
    sr2, out_x = read_wav(a.out_wav)
    assert sr == sr2 == 48000
    sm, om = src.mean(axis=1), out_x.mean(axis=1)
    off = int(round(a.offset * sr))
    # 把音源按预期偏移摆到画面时间轴上，再在中段做互相关：结果应该是 0 采样
    placed = np.zeros(len(om))
    lo, hi = max(0, off), min(len(om), off + len(sm))
    placed[lo:hi] = sm[lo - off:hi - off]
    w0, w1 = (20.0, 80.0) if dur >= 90 else (dur * 0.1, dur * 0.9)
    seg = slice(int(w0 * sr), int(w1 * sr))
    x, y = placed[seg] - placed[seg].mean(), om[seg] - om[seg].mean()
    n = 1 << int(np.ceil(np.log2(len(x) * 2)))
    c = np.fft.irfft(np.fft.rfft(y, n) * np.conj(np.fft.rfft(x, n)), n)
    lag = int(np.argmax(c))
    lag = lag - n if lag > n // 2 else lag
    corr = float(c[lag] / (np.linalg.norm(x) * np.linalg.norm(y) + 1e-12))
    rms = lambda v: float(np.sqrt((v ** 2).mean())) if len(v) else 0.0
    tail = {f'-{t}s': round(rms(om[max(0, int((dur - t) * sr)):int((dur - t + 0.25) * sr)]) / 32768, 4) for t in (2.0, 1.5, 1.0, 0.5, 0.25)}
    problems = []
    if lag != 0:
        problems.append(f'成片音轨相对音源偏了 {lag} 个采样（{lag / sr * 1000:.2f} ms）')
    mix = json.load(open(a.mix_report, encoding='utf-8')) if a.mix_report else {}
    has_bgm = 'bgm' in mix
    if corr < (0.9 if has_bgm else 0.99):
        problems.append(f'成片音轨与音源的相关度只有 {corr:.4f}')
    if abs(len(om) / sr - dur) > 0.03:
        problems.append(f'音轨 {len(om) / sr:.3f}s 与画面 {dur:.3f}s 时长不一致')
    if mix.get('clipped_samples'):
        problems.append(f"混音有 {mix['clipped_samples']} 个采样顶到满刻度")
    if mix.get('warning'):
        problems.append(mix['warning'])
    size = os.path.getsize(a.mp4)
    if size > 100 * 1000 * 1000:
        problems.append(f'成片 {size / 1e6:.1f} MB，超过 GitHub 单文件 100 MB 上限')
    out = {
        'file': os.path.basename(a.mp4), 'bytes': size, 'sha256': hashlib.sha256(open(a.mp4, 'rb').read()).hexdigest(),
        'audio_samples': len(om), 'audio_seconds': round(len(om) / sr, 4), 'expected_seconds': round(dur, 4),
        'audio_lag_vs_source_samples': lag, 'audio_lag_vs_source_ms': round(lag / sr * 1000, 3),
        'audio_correlation': round(corr, 4), 'correlation_window_seconds': [round(w0, 2), round(w1, 2)],
        'tail_rms': tail, 'mix': mix, 'problems': problems,
    }
    save(a.qa, 'final', out)
    print('FINAL', json.dumps(out, ensure_ascii=False))


def sheet(a):
    from PIL import Image, ImageDraw, ImageFont
    spec = json.load(open(a.list, encoding='utf-8'))
    cells = spec['cells']
    cols = 5 if len(cells) > 12 else 4 if len(cells) > 6 else 3
    tw, th, pad, cap = 384, 216, 10, 46
    rows = (len(cells) + cols - 1) // cols
    W, H = cols * (tw + pad) + pad, rows * (th + cap + pad) + pad
    img = Image.new('RGB', (W, H), (13, 11, 30))
    d = ImageDraw.Draw(img)
    f1, f2 = ImageFont.truetype(spec['font'], 18), ImageFont.truetype(spec['font'], 15)
    for i, c in enumerate(cells):
        x, y = pad + (i % cols) * (tw + pad), pad + (i // cols) * (th + cap + pad)
        img.paste(Image.open(c['file']).convert('RGB').resize((tw, th), Image.LANCZOS), (x, y))
        d.rectangle([x, y, x + 58, y + 22], fill=(0, 0, 0))
        d.text((x + 5, y + 1), c['id'], font=f1, fill=(255, 216, 74))
        d.text((x, y + th + 3), f"{c['a']:.2f}–{c['b']:.2f}s  {c['title']}"[:30], font=f2, fill=(255, 255, 255))
        if c['line']:
            d.text((x, y + th + 23), ('♪ ' + c['line'])[:26], font=f2, fill=(255, 216, 74))
    img.save(a.out, quality=88)
    print('SHEET', a.out, f'{len(cells)} 格 {W}x{H}')


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest='cmd', required=True)
    p = sub.add_parser('frames'); p.add_argument('dir'); p.add_argument('--info', required=True); p.add_argument('--qa', required=True)
    p = sub.add_parser('timing'); p.add_argument('--info', required=True); p.add_argument('--cues', required=True); p.add_argument('--qa', required=True)
    p = sub.add_parser('final'); p.add_argument('mp4'); p.add_argument('src_wav'); p.add_argument('out_wav'); p.add_argument('--info', required=True)
    p.add_argument('--offset', type=float, default=0.0); p.add_argument('--qa', required=True); p.add_argument('--mix-report')
    p = sub.add_parser('sheet'); p.add_argument('list'); p.add_argument('out')
    args = ap.parse_args()
    {'frames': frames, 'timing': timing, 'final': final, 'sheet': sheet}[args.cmd](args)
