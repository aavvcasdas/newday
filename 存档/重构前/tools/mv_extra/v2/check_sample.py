"""Encoded-file audit. Numerical checks do not constitute human audiovisual approval."""
from pathlib import Path
import subprocess as sp,json,hashlib,tempfile,wave,os
import numpy as np
from PIL import Image
import imageio_ffmpeg
from rapidocr_onnxruntime import RapidOCR
ROOT=Path(__file__).resolve().parents[3];HERE=Path(__file__).resolve().parent
FF=os.environ.get('FFMPEG',imageio_ffmpeg.get_ffmpeg_exe());PROBE=os.environ.get('FFPROBE','/home/user/media-tools/node_modules/@ffprobe-installer/linux-x64/ffprobe')
meta=json.loads((HERE/'render_inputs.json').read_text());VIDEO=ROOT/meta['outputPath'];START,END=meta['sourceRange'];DURATION=END-START
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def ff(*args):return sp.check_output([FF,'-v','error',*map(str,args)])
assert sha(VIDEO)==meta['outputSha256']
for p,h in meta['inputHashes'].items():assert sha(ROOT/p)==h,p
probe=json.loads(sp.check_output([PROBE,'-v','error','-count_frames','-show_streams','-show_format','-of','json',str(VIDEO)]));v=next(s for s in probe['streams']if s['codec_type']=='video');a=next(s for s in probe['streams']if s['codec_type']=='audio')
assert(v['width'],v['height'],v['r_frame_rate'],int(v['nb_read_frames']))==(1920,1080,'30/1',594)
assert abs(float(v['duration'])-19.8)<.002
assert abs(float(a['duration'])-19.8)<.002
full=sp.run([FF,'-v','error','-i',str(VIDEO),'-f','null','-'],capture_output=True)
assert full.returncode==0 and not full.stderr,full.stderr
pcm=lambda *args:np.frombuffer(ff(*args,'-ar','16000','-ac','1','-f','f32le','-'),dtype='<f4')
actual=pcm('-i',VIDEO,'-vn');reference=pcm('-ss',START,'-i',ROOT/'tools/mv_extra/cache/source48.wav','-t',DURATION)
n=min(len(actual),len(reference));corr=float(np.corrcoef(actual[:n],reference[:n])[0,1]);assert corr>.98,corr
assert n>=round(DURATION*16000)-2
cues=json.loads((ROOT/'tools/mv_extra/timing.json').read_text())['cues'];lyrics=(HERE/'lyrics.txt').read_text().strip().splitlines()
ocr=RapidOCR();ocr_results=[];selected={6:20.733333,7:23.833333,8:26.733333,9:30.1,10:33.0,11:37.0}
cache=ROOT/'tools/mv_extra/cache';cache.mkdir(exist_ok=True)
for ln,t in selected.items():
 out=cache/f'v2_encoded_caption_{ln}.png';ff('-ss',max(0,t-START-.0001),'-i',VIDEO,'-frames:v','1','-y',out)
 im=Image.open(out);crop=np.array(im)[965:1059,80:1840,:];result,_=ocr(crop);strings=[r[1]for r in result or[]];joined=''.join(strings).replace(' ','');expected=lyrics[ln-1];ocr_results.append({'line':ln,'sourceTime':t,'textExpected':expected,'textOCR':joined,'exact':joined==expected,'framePath':str(out.relative_to(ROOT))})
 # OCR is evidence only: misses are recorded separately and require static review, not silently marked passed.
for t in [19.1,19.7,20.3,21.3,24.4,26.15,26.75,28.2,30.5,34.5,37.4,38.6]:ff('-ss',max(0,t-START-.0001),'-i',VIDEO,'-frames:v','1','-q:v','2','-y',cache/f'v2_encoded_{t}.jpg')
trace=json.loads((HERE/'performance_trace.json').read_text());assert len(trace)==594
report={'output':meta['outputPath'],'outputSha256':sha(VIDEO),'bytes':VIDEO.stat().st_size,'size':[v['width'],v['height']],'frames':int(v['nb_read_frames']),'fps':v['r_frame_rate'],'videoDuration':float(v['duration']),'audioDuration':float(a['duration']),'fullDecodeClean':True,'inputHashesMatch':True,'sourceRangeSeconds':[START,END],'sourceRangeFrames':[571,1165],'audioMethod':'Original source48.wav segment, original speed; sample encoded AAC-LC. No new voice or replacement BGM. This is not a lossless AAC-copy claim.','decodedAudioSeconds':len(actual)/16000,'sourceCorrelationMono16k':corr,'comparedAudioSeconds':n/16000,'audioRms':float(np.sqrt(np.mean(actual[:n]**2))),'captionEvidence':ocr_results,'captionExactOCR':sum(x['exact']for x in ocr_results),'captionTotal':6,'timingBasis':'Existing reference-caption onsets, approximately ±0.25s, not phoneme/ASR alignment. Latest 16 user lines replace old text verbatim.','renderTraceFrames':len(trace),'humanContinuousVideoReview':False,'humanListeningApproved':False,'userApproved':False,'full56SecondV2Rendered':False,'staticReview':'See static_review.json only if its outputSha256 matches; automated checks do not promote static/dynamic/human approval.'}
(HERE/'sample_check.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report,ensure_ascii=False,indent=2))
