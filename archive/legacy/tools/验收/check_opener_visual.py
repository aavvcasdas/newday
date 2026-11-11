#!/usr/bin/env python3
"""前 2 秒防枯燥自动体检（day>=11 通用引擎新集在 final 阶段强制）。

抽查 0.00s-2.00s（前 60 帧）四项：
  1. 帧间有效运动：中央舞台区（排除底部字幕带）平均帧差须高于静态阈值；
  2. 上半屏视觉信息非空：y 30..160 须有高占比亮像素（横幅/大道具）；
  3. 舞台明度占比：前 60 帧亮度 Y>115 像素占比 >= 18%；
  4. 首秒听觉非空（--check-bgm 时）：0-0.8s 任意 250ms 窗口 RMS >= -42 dBFS。
退出码 0 通过 / 1 拦截。数值门禁不替代人工观影。
"""
import argparse
import json
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from media_common import binary, probe  # noqa: E402

MOTION_MIN = 0.8          # 中央区平均帧差（0-255 灰度）
TOP_BRIGHT_MIN = 0.05     # 上半屏亮像素占比下限
BRIGHT_MIN = 0.18         # 全帧亮像素占比下限（Y>115）
AUDIO_WINDOW_DB = -42.0


def extract_frames(video, seconds=2.0):
    with tempfile.TemporaryDirectory(prefix='opener-visual-') as tmp:
        raw = Path(tmp) / 'f.rgb'
        subprocess.run([binary('ffmpeg'), '-v', 'error', '-i', str(video), '-an',
                        '-t', str(seconds), '-vf', 'scale=640:360', '-pix_fmt', 'rgb24',
                        '-f', 'rawvideo', '-y', str(raw)], check=True)
        data = np.fromfile(raw, dtype=np.uint8)
    size = 640 * 360 * 3
    if not len(data) or len(data) % size:
        raise ValueError('开场抽帧无效')
    return data.reshape(-1, 360, 640, 3)


def audio_windows_db(video, seconds=0.8):
    raw = subprocess.check_output([binary('ffmpeg'), '-v', 'error', '-i', str(video),
                                     '-map', '0:a:0', '-ac', '1', '-ar', '16000',
                                     '-t', str(seconds), '-f', 'f32le', '-'])
    x = np.frombuffer(raw, dtype='<f4').astype(np.float64)
    win = 4000  # 250ms @16k
    out = []
    for i in range(0, max(1, len(x) - win + 1), win):
        seg = x[i:i + win]
        out.append(20 * np.log10(np.sqrt(np.mean(seg ** 2) + 1e-24)))
    return out


def check(video, check_bgm=False):
    frames = extract_frames(video)
    if len(frames) < 30:
        raise ValueError('开场帧数不足')
    gray = frames.astype(np.float32).mean(axis=3)
    bright = (gray > 115)
    # 1) 中央舞台运动：排除底部字幕带（逻辑 y>610 -> 缩放后 >305）
    stage = gray[:, :300, 60:580]
    diffs = np.abs(np.diff(stage[:54], axis=0)).mean(axis=(1, 2))  # 0-1.8s
    motion = float(diffs.mean())
    # 2) 上半屏：逻辑 y 30..160 -> 缩放后 15..80；取 0.15s 后帧（帧号 >=4）
    top = bright[4:60, 15:80, :]
    top_ratio = float(top.mean())
    # 3) 全帧亮度占比
    bright_ratio = float(bright[:60].mean())
    checks = {
        'motion_central_mean_diff': {'value': motion, 'min': MOTION_MIN, 'passed': motion >= MOTION_MIN},
        'top_band_bright_ratio': {'value': top_ratio, 'min': TOP_BRIGHT_MIN, 'passed': top_ratio >= TOP_BRIGHT_MIN},
        'frame_bright_ratio': {'value': bright_ratio, 'min': BRIGHT_MIN, 'passed': bright_ratio >= BRIGHT_MIN},
    }
    if check_bgm:
        wins = audio_windows_db(video)
        loudest = float(max(wins)) if wins else -999.0
        checks['first_second_audio_loudest_250ms_db'] = {
            'value': loudest, 'min': AUDIO_WINDOW_DB, 'passed': loudest >= AUDIO_WINDOW_DB}
    passed = all(c['passed'] for c in checks.values())
    return {'video': str(video), 'frames_checked': int(min(60, len(frames))),
            'checks': checks, 'passed': passed}


def main(argv=None):
    ap = argparse.ArgumentParser(description='前 2 秒防枯燥体检')
    ap.add_argument('--video', type=Path, required=True)
    ap.add_argument('--check-bgm', action='store_true', help='同时检查首秒听觉非空（BGM 成片）')
    ap.add_argument('--report', type=Path)
    args = ap.parse_args(argv)
    meta = probe(args.video)
    v = next(s for s in meta['streams'] if s['codec_type'] == 'video')
    result = check(args.video, check_bgm=args.check_bgm)
    result['width'], result['height'] = int(v['width']), int(v['height'])
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result['passed'] else 1


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except (ValueError, OSError, subprocess.CalledProcessError) as e:
        print(f'开场视觉体检失败：{e}')
        raise SystemExit(1)
