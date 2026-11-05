"""Verify the encoded silent preview, not production audio/final acceptance.
Dependencies: numpy. FFMPEG/FFPROBE may point to local binaries.
Reads every decoded frame; checks source trace separately from encoded pixels.
"""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
VIDEO = ROOT / 'Day12/样片/Day12_四段导演样片_无声.mp4'
EVIDENCE = VIDEO.parent / 'review_preview_frames'
FFMPEG = os.environ.get('FFMPEG', 'ffmpeg')
FFPROBE = os.environ.get('FFPROBE', 'ffprobe')


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def project(x, y, camera):
    return ((640 + (x - camera['cx']) * camera['z']) * 1.5,
            (360 + (y - camera['cy']) * camera['z']) * 1.5)


def read_exact(stream, size):
    chunks = []
    while size:
        data = stream.read(size)
        if not data:
            break
        chunks.append(data)
        size -= len(data)
    return b''.join(chunks)


def main():
    plan = json.loads((HERE / 'sample_plan.json').read_text())
    trace = json.loads((EVIDENCE / 'trace.json').read_text())
    probe = json.loads(subprocess.check_output([FFPROBE, '-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', str(VIDEO)]))
    streams = probe['streams']
    video = next(s for s in streams if s['codec_type'] == 'video')
    checks = []

    def check(name, ok, evidence):
        checks.append({'name': name, 'passed': bool(ok), 'evidence': evidence})

    assets = json.loads((HERE / 'sample_assets.json').read_text())
    verified = [{'path': a['path'], 'verified': (ROOT / a['path']).is_file() and digest(ROOT / a['path']) == a['sha256']} for a in assets['assets']]
    check('七项原角色/字体素材哈希正确', all(a['verified'] for a in verified), verified)

    check('1080p/H264/yuv420p/30fps', (video['width'], video['height'], video['codec_name'], video['pix_fmt'], video['avg_frame_rate']) == (1920, 1080, 'h264', 'yuv420p', '30/1'),
          {k: video[k] for k in ['width', 'height', 'codec_name', 'pix_fmt', 'avg_frame_rate']})
    check('无声样片没有误接历史/合成人声', not any(s['codec_type'] == 'audio' for s in streams), {'audioStreams': sum(s['codec_type'] == 'audio' for s in streams)})
    check('帧数与时长一致', int(video['nb_read_frames']) == plan['frames'] and abs(float(probe['format']['duration']) - plan['duration']) < 0.04,
          {'frames': int(video['nb_read_frames']), 'duration': float(probe['format']['duration'])})
    check('规划状态不伪造实测', plan['measured'] is False and plan['audioSource'] is None and all('chars_timed' not in c for c in plan['cues']), {'measured': False, 'audioSource': None})
    script = (ROOT / 'Day12/Day12配音台词.txt').read_text()
    check('台词字节绑定且未改字', digest(ROOT / 'Day12/Day12配音台词.txt') == plan['sourceScriptSha256'] and ''.join(c['text'] for c in plan['cues']) == ''.join(script.splitlines()), plan['sourceScriptSha256'])
    check('字幕使用同一稿且逐帧无空档', ''.join(s['text'] for s in plan['screens']) == ''.join(c['text'] for c in plan['cues']) and all(t['subtitle'] for t in trace), {'blankCaptionFrames': sum(not t['subtitle'] for t in trace)})
    check('四段镜头映射完整', len(trace) == plan['frames'] and all(trace[f]['shot'] == clip['id'] for clip in plan['clips'] for f in range(clip['outputStartFrame'], clip['outputEndFrame'])), plan['clips'])

    camera_evidence = {}
    for clip in plan['clips']:
        rows = trace[clip['outputStartFrame']:clip['outputEndFrame']]
        values = np.array([[t['camera'][k] for k in ['z', 'cx', 'cy']] for t in rows])
        if clip['id'] != 'C09':
            delta = np.ptp(values, axis=0)
            check(clip['id'] + '默认镜头固定', np.max(np.abs(delta)) < 1e-10, delta.tolist())
            camera_evidence[clip['id']] = {'range': delta.tolist()}
        else:
            hold = values[25:]
            delta = np.ptp(hold, axis=0)
            check('C09仅拉远一次、0.8秒后固定', np.all(np.diff(values[:, 0]) <= 1e-10) and np.max(np.abs(delta)) < 1e-10 and values[0, 0] > values[-1, 0], {'start': values[0].tolist(), 'end': values[-1].tolist(), 'heldRange': delta.tolist()})
            camera_evidence['C09'] = {'heldRange': delta.tolist()}

    idle = [a for t in trace for i, a in enumerate(t['actors']) if i == 0]
    check('关闭待机时没有外层晃动', all(a['y'] == 600 and a['lean'] == 0 and a['squash'] == 0 for a in idle), {'samples': len(idle), 'y': 600, 'lean': 0, 'squash': 0})
    walk = [t['actors'][1]['x'] for t in trace if t['shot'] == 'C01']
    check('笨鱼由画外连续走入、到位保持', walk[0] == 1370 and walk[-1] == 810 and all(b <= a + 1e-9 for a, b in zip(walk, walk[1:])), {'from': walk[0], 'to': walk[-1], 'maxFrameTravel': float(np.max(np.abs(np.diff(walk))))})
    ending = [t for t in trace if t['shot'] == 'C09']
    check('结尾有明确单次表情反应而非循环摇摆', [t['actors'][0]['pose'] for t in ending].count('shock') > 30 and len(set(t['actors'][0]['pose'] for t in ending)) == 2, {'poses': list(dict.fromkeys(t['actors'][0]['pose'] for t in ending)), 'finalPoseHoldSeconds': sum(t['actors'][0]['pose'] == 'shock' for t in ending) / 30})
    paper = [next(p for p in t['props'] if p['id'] == 'folded_page') for t in trace if t['shot'] == 'C07']
    check('C07同落点正反面切镜、有结果停留', len(set((p['x'], p['y']) for p in paper)) == 1 and paper[0]['state']['title'] == '录取通知' and paper[-1]['state']['title'] == '筛岗位' and sum(p['state']['title'] == '筛岗位' for p in paper) / 30 >= .4,
          {'x': paper[0]['x'], 'y': paper[0]['y'], 'backFaceHoldSeconds': sum(p['state']['title'] == '筛岗位' for p in paper) / 30, 'method': 'matched_state_cut_not_hand_flip'})
    check('C03无裁头人物、C07仅保留主体', all(len(t['actors']) == 0 for t in trace if t['shot'] == 'C03') and all(len(t['actors']) == 1 for t in trace if t['shot'] == 'C07'), {'C03Actors': 0, 'C07Actors': 1})

    # Check actual output-space geometry; world-space y<=600 alone is insufficient during zoom.
    overlaps = []
    table_bottoms = []
    for t in trace:
        cam = t['camera']
        table_bottoms.append(project(640, 534 + 58, cam)[1] / 1.5)
        for a in t['actors']:
            x, y = a['anchors']['mouth']
            face = (x - 32, y - 45, x + 32, y + 8)
            for prop in t['props']:
                hw, hh = (84 * .85, 42 * .85) if prop['id'] == 'folded_page' else (90 * (1 if t['shot'] == 'C03' else .85), 26 * (1 if t['shot'] == 'C03' else .85))
                px, py = prop['x'], prop['y']
                if max(face[0], px - hw) < min(face[2], px + hw) and max(face[1], py - hh) < min(face[3], py + hh):
                    overlaps.append({'frame': t['frame'], 'prop': prop['id']})
    check('主视觉道具不压眼口、桌脚在字幕区上方', not overlaps and max(table_bottoms) < 615, {'faceRectIntersections': len(overlaps), 'maxProjectedTableBottom': max(table_bottoms), 'subtitleSafeStart': 615, 'scope': 'calibrated_face_rectangle_and_table_geometry; stills_review_also_required'})

    # Decode EVERY frame, independently of the render trace. Keep only two frames in memory.
    proc = subprocess.Popen([FFMPEG, '-v', 'error', '-i', str(VIDEO), '-an', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    count, black, flat = 0, [], []
    pixel_shifts = []
    prev = None
    prev_shot = None
    prev_pose = None
    still_frames = {clip['outputStartFrame'] + min(51, clip['outputEndFrame'] - clip['outputStartFrame'] - 1) for clip in plan['clips']}
    still_frames |= {clip['outputEndFrame'] - 15 for clip in plan['clips']}
    while True:
        data = read_exact(proc.stdout, 1920 * 1080)
        if not data:
            break
        if len(data) != 1920 * 1080:
            raise RuntimeError('解码输出截断')
        image = np.frombuffer(data, dtype=np.uint8).reshape(1080, 1920)
        if image.max() < 16:
            black.append(count)
        if float(image.std()) < 2:
            flat.append(count)
        row = trace[count]
        clip = next(c for c in plan['clips'] if c['id'] == row['shot'])
        stable = row['shot'] != 'C03' and count - clip['outputStartFrame'] > 30
        if stable and count % 5 == 0 and prev is not None and prev_shot == row['shot'] and prev_pose == row['actors'][0]['pose']:
            a = row['actors'][0]
            x, y = a['anchors']['mouth']
            x0, y0 = project(x - 28, y - 35, row['camera'])
            x1, y1 = project(x + 28, y + 5, row['camera'])
            x0, y0, x1, y1 = [int(round(v)) for v in [x0, y0, x1, y1]]
            old = prev[y0:y1, x0:x1].astype(np.float32)
            errors = []
            offsets = [(0, 0)] + [(dx, dy) for dx in range(-2, 3) for dy in range(-2, 3) if (dx, dy) != (0, 0)]
            for dx, dy in offsets:
                new = image[y0 + dy:y1 + dy, x0 + dx:x1 + dx].astype(np.float32)
                errors.append(float(np.mean((old - new) ** 2)))
            best = int(np.argmin(errors))
            # Avoid calling tiny encoder-noise improvements a movement.
            shifted = best != 0 and errors[best] + .1 < errors[0] * .95
            pixel_shifts.append({'frame': count, 'shift': offsets[best] if shifted else (0, 0), 'zeroShiftMSE': errors[0]})
        prev, prev_shot = image, row['shot']
        prev_pose = row['actors'][0]['pose'] if row['actors'] else None
        count += 1
    stderr = proc.stderr.read().decode()
    status = proc.wait()
    check('全片逐帧解码：无错误/无黑帧/非纯色占位', status == 0 and not stderr.strip() and count == plan['frames'] and not black and not flat,
          {'decodedFrames': count, 'decodeErrors': stderr, 'blackFrames': black, 'flatFrames': flat})
    shifted = [x for x in pixel_shifts if x['shift'] != (0, 0)]
    check('编码后静止主体脸部无整像素跳动', not shifted, {'comparedFramePairs': len(pixel_shifts), 'searchRadiusPixels': 2, 'nonzeroShifts': shifted[:20], 'maxZeroShiftMSE': max((x['zeroShiftMSE'] for x in pixel_shifts), default=None), 'scope': 'sampled same-pose stable primary-face ROI; explicit pose cuts/camera move excluded; environment animation allowed'})

    # Extract actual encoded RGB frames for inspection, not merely the pre-encode canvases.
    for f in sorted(still_frames):
        subprocess.run([FFMPEG, '-v', 'error', '-y', '-i', str(VIDEO), '-vf', f'select=eq(n\\,{f})', '-vsync', '0', '-frames:v', '1', str(EVIDENCE / f'decoded_{f:04}.png')], check=True)
    report = {'type': 'silent_preview_qa_only', 'passed': all(x['passed'] for x in checks), 'measured': False, 'audioChecked': False, 'productionReady': False,
              'video': str(VIDEO.relative_to(ROOT)), 'videoSha256': digest(VIDEO), 'videoBytes': VIDEO.stat().st_size,
              'inputsSha256': {str(p.relative_to(ROOT)): digest(p) for p in [HERE / 'episode.spec.mjs', HERE / 'render_sample.mjs', ROOT / 'tools/engine/render_episode.mjs', HERE / 'sample_assets.json']},
              'checks': checks, 'decodedReviewFrames': sorted(still_frames),
              'remaining': ['指定声线与实测音画同步未检查', 'C05/C08完整接触未实现', 'C07只验证同落点前后切镜，未验证手掌翻纸动画', '完整九镜尚未渲染/动态终验', 'BGM/SFX与正式final门禁未执行']}
    (HERE / 'sample_check.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(report, ensure_ascii=False, indent=2))
    raise SystemExit(0 if report['passed'] else 1)


if __name__ == '__main__':
    main()
