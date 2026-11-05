#!/usr/bin/env python3
"""通用整集后验；切段试剪需独立剪辑表验证器，不把它当连续整集。"""
import argparse
import hashlib
import json
import math
import subprocess
import sys
from pathlib import Path
from fractions import Fraction
from media_common import binary, probe, read_json, validate_timing
from check_subtitle_sync import check as check_subtitles


def tail_check(duration, end):
    tail=duration-end
    if not .15 <= tail <= .35:
        raise ValueError(f'末句后{tail:.3f}s：应在0.15–0.35秒结束，不切尾音、不拖尾')
    return tail


def verify(video,voice,alignment,subs,script):
    import numpy as np
    data=read_json(alignment); subtitles=read_json(subs)
    lines=Path(script).read_text().strip().splitlines()
    cues,screens=validate_timing(data,subtitles,lines,voice)
    source=probe(voice)
    source_duration=float(source['format']['duration'])
    if abs(source_duration-float(data['source_duration_seconds']))>.03:
        raise ValueError('实测轴记录时长与实际WAV不一致')
    meta=probe(video);v=next(s for s in meta['streams'] if s['codec_type']=='video');a=next(s for s in meta['streams'] if s['codec_type']=='audio')
    if (v['width'],v['height'])!=(1920,1080) or Fraction(v['r_frame_rate'])!=30:
        raise ValueError('必须1080p30')
    dur=float(v.get('duration',meta['format']['duration']))
    tail=tail_check(dur,cues[-1]['end'])
    if int(a['channels'])!=2:
        raise ValueError('必须双声道')
    audio_duration=float(a.get('duration',meta['format']['duration']))
    if audio_duration < cues[-1]['end']-.04 or abs(audio_duration-dur)>.08:
        raise ValueError('音轨截尾或与视频长度不一致')
    subprocess.run([binary('ffmpeg'),'-v','error','-xerror','-i',str(video),'-f','null','-'],check=True)
    def pcm(file):
        return np.frombuffer(subprocess.check_output([binary('ffmpeg'),'-v','error','-i',str(file),'-map','0:a:0','-ac','2','-ar','44100','-f','f32le','-']),dtype='<f4')
    expected=pcm(voice);actual=pcm(video);n=min(len(actual),len(expected))
    # 相关不能证明末尾覆盖；长度与尾段能量另外检查。
    if n<min(len(expected),int(cues[-1]['end']*44100)*2)-4096:
        raise ValueError('成片音轨过短')
    corr=float(np.corrcoef(expected[:n].astype('float64'),actual[:n].astype('float64'))[0,1])
    if not math.isfinite(corr) or corr<=.999:
        raise ValueError(f'原声零偏移相关不足：{corr}')
    subresult=check_subtitles(video,screens)
    return dict(video=str(video),source_sha256=data['source_sha256'],video_sha256=hashlib.sha256(Path(video).read_bytes()).hexdigest(),
                duration=dur,tail_pad=tail,frames=int(v['nb_frames']),source_speed=1,pcm_correlation=corr,decode_passed=True,
                subtitles=subresult,passed=subresult['passed'])

def main():
    ap=argparse.ArgumentParser()
    for name in ['video','voice','alignment','subs','script','report']:
        ap.add_argument('--'+name,type=Path,required=True)
    args=ap.parse_args();result=verify(args.video,args.voice,args.alignment,args.subs,args.script)
    args.report.parent.mkdir(parents=True,exist_ok=True);args.report.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({k:v for k,v in result.items() if k!='subtitles'},ensure_ascii=False,indent=2))
    if not result['passed']:
        print('\n'.join(result['subtitles']['errors']))
    return 0 if result['passed'] else 1

if __name__=='__main__':
    try: sys.exit(main())
    except (ValueError,OSError,KeyError,StopIteration,subprocess.CalledProcessError) as e: sys.exit(f'终验失败：{e}')
