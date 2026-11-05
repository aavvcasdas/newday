#!/usr/bin/env python3
"""Day2样式编码字幕抽验。色彩容差+字幕正文区域帧差，非OCR/语义判定。
无片尾参照帧：只以实测字幕轴生成在屏/空屏预期，并在每屏内外与换屏边界取样。
背景可能同色/移动，检测歧义必须人工看帧，不能宣传100%识别。
"""
import argparse
import json
import subprocess
import sys
import math
import tempfile
from pathlib import Path
from media_common import binary, probe, read_json


def check(video, screens, tolerance=0.10):
    import numpy as np
    if not screens:
        raise ValueError('字幕屏为空')
    info = probe(video)
    v = next(s for s in info['streams'] if s['codec_type']=='video')
    if (v['width'],v['height']) != (1920,1080):
        raise ValueError('字幕检测仅支持项目1920x1080 Day2样式')
    fps = eval_fraction(v['r_frame_rate'])
    duration = float(v.get('duration', info['format']['duration']))
    prev=0.0
    for screen in screens:
        st,en=float(screen['start']),float(screen['end'])
        if not (math.isfinite(st) and math.isfinite(en) and 0<=st<en<=duration+.034 and st>=prev-1e-7):
            raise ValueError('字幕轴时间无效、重叠或超出成片')
        prev=en
    # 原生逻辑框by=H-76，高58；1.5倍输出后框顶约966，底1053。
    # 采样先缩至640x360以控制内存；裁整条字幕区域，不用越界的crop高度。
    with tempfile.TemporaryDirectory(prefix='subtitle-check-') as tmp:
        target = Path(tmp)/'band.rgb'
        subprocess.run([binary('ffmpeg'),'-v','error','-i',str(video),'-an','-vf',
                        'scale=640:360,crop=640:50:0:310','-pix_fmt','rgb24','-f','rawvideo','-y',str(target)],check=True)
        raw = np.fromfile(target,dtype=np.uint8)
    size=640*50*3
    if len(raw)%size or not len(raw):
        raise ValueError('字幕抽帧无效')
    frames=raw.reshape(-1,50,640,3)
    # Bound temporary memory independently of episode length: do NOT expand all frames to int16/float64.
    # Keep the same cyan/difference criteria, evaluated in batches (incl. cross-batch body transitions).
    counts=np.zeros(len(frames),dtype=np.int32)
    diff=np.zeros(max(0,len(frames)-1),dtype=np.float64)
    previous_body=None
    for begin in range(0,len(frames),64):
        batch=frames[begin:begin+64]
        a=batch.astype(np.int16)
        cyan=(a[:,:,:,2]-a[:,:,:,0]>65)&(a[:,:,:,1]-a[:,:,:,0]>30)&(a[:,:,:,2]-a[:,:,:,1]>20)&(a[:,:,:,1]>95)
        counts[begin:begin+len(batch)]=cyan.sum(axis=2).max(axis=1)
        body=batch[:,20:39,130:510].mean(axis=3)
        if previous_body is not None:
            diff[begin-1]=abs(previous_body-body[0]).mean()
        if len(body)>1:
            diff[begin:begin+len(body)-1]=abs(np.diff(body,axis=0)).mean(axis=(1,2))
        previous_body=body[-1].copy()
    samples=[];errors=[]
    def sample(t, expected, label):
        idx=min(len(frames)-1,max(0,round(t*fps)))
        visible=bool(counts[idx]>=60)
        samples.append(dict(time=idx/fps,expected=expected,visible=visible,cyan_pixels=int(counts[idx]),label=label))
        if visible != expected:
            errors.append(f'{label} @ {idx/fps:.3f}s 字幕在屏预期={expected} 检测={visible}')
    for i,s in enumerate(screens):
        sample((s['start']+s['end'])/2,True,s.get('id') or f'L{int(s.get("line",i+1)):02d}')
    # 所有足够长的气口取中点，避开量化/编码容差。
    edges=[(0,screens[0]['start'])]+[(a['end'],b['start']) for a,b in zip(screens,screens[1:])]+[(screens[-1]['end'],duration)]
    for st,en in edges:
        if en-st>tolerance*2:
            sample((st+en)/2,False,'气口')
    # 换屏检查在正文区域测变化，允许3帧误差；不是仅检测框颜色。
    for i,s in enumerate(screens):
        if s['start'] < tolerance:
            continue
        idx=round(s['start']*fps)
        lo=max(0,idx-3);hi=min(len(diff),idx+3)
        if hi<=lo or float(diff[lo:hi].max())<0.12:
            errors.append(f'屏{i+1}起点附近无可检出的正文变化，需人工核对')
    # 10ms RMS独立检查每屏语音区间是否完全落在静音，不用片尾空屏作基准。
    # 这不能替代词级ASR：有声不代表文字正确。
    pcm=np.frombuffer(subprocess.check_output([binary('ffmpeg'),'-v','error','-i',str(video),'-map','0:a:0','-ac','1','-ar','16000','-f','f32le','-']),dtype='<f4')
    count=len(pcm)//160
    db=20*np.log10(np.sqrt((pcm[:count*160].reshape(count,160).astype('float64')**2).mean(axis=1)+1e-12))
    audio_samples=[]
    for i,s in enumerate(screens):
        end=s.get('speech_end',s['end'])
        lo=max(0,int(s['start']*100));hi=min(len(db),math.ceil(end*100))
        peak=float(db[lo:hi].max()) if hi>lo else -120.0
        audio_samples.append(dict(screen=i+1,peak_10ms_db=peak))
        if end-s['start']>.15 and peak < -50:
            errors.append(f'屏{i+1}语音范围完全静音（10ms峰值{peak:.1f}dB），需核对静音弹字')
    return dict(audio_samples=audio_samples,method='Day2_cyan_tolerance_and_body_frame_difference_not_OCR',samples=samples,errors=errors,
                scope='每屏中点、足够长气口、每次上屏附近帧差；不证明字幕文字内容或音素同步',passed=not errors)

def eval_fraction(s):
    from fractions import Fraction
    return float(Fraction(s))

def main():
    ap=argparse.ArgumentParser();ap.add_argument('video',type=Path);ap.add_argument('--subs',required=True,type=Path);ap.add_argument('--report',type=Path)
    args=ap.parse_args();data=read_json(args.subs)
    if data.get('measured') is not True:raise ValueError('只接受measured=true字幕轴')
    result=check(args.video,data['screens'])
    if args.report:
        args.report.parent.mkdir(parents=True,exist_ok=True);args.report.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(result,ensure_ascii=False,indent=2));return 0 if result['passed'] else 1

if __name__=='__main__':
    try: sys.exit(main())
    except (ValueError,OSError,KeyError,subprocess.CalledProcessError) as e: sys.exit(f'字幕核验失败：{e}')
