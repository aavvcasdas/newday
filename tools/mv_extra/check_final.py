"""Audit actual encoded output; never grants human listening/visual approval."""
import os,json,hashlib,subprocess,shutil
from pathlib import Path
import numpy as np
from PIL import Image
import imageio_ffmpeg
ROOT=Path(__file__).resolve().parents[2];HERE=Path(__file__).resolve().parent
FF=imageio_ffmpeg.get_ffmpeg_exe();FP=os.environ.get('FFPROBE')or shutil.which('ffprobe')or'/home/user/media-tools/node_modules/@ffprobe-installer/linux-x64/ffprobe'
FILM=ROOT/'番外MV/把回忆拼好给你/成片/把回忆拼好给你_歌词卡点版.mp4';SAMPLE=ROOT/'番外MV/把回忆拼好给你/样片/烟花与时差_有声试剪.mp4'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def run(*a):return subprocess.check_output([FF,'-v','error',*map(str,a)])
def probe(p):return json.loads(subprocess.check_output([FP,'-v','error','-count_frames','-show_streams','-show_format','-of','json',str(p)]))
def diff(raw):
 f=np.frombuffer(raw,dtype=np.uint8).reshape(-1,90,160);d=np.abs(np.diff(f.astype(np.int16),axis=0)).mean(axis=(1,2));seq=longest=0
 for x in d:seq=seq+1 if x==0 else 0;longest=max(longest,seq)
 return {'frames':len(f),'meanAbsoluteDifference':float(d.mean()),'min':float(d.min()),'longestIdenticalFramePairs':longest,'aestheticGate':False}
def main():
 timing=json.loads((HERE/'timing.json').read_text());frozen=json.loads((HERE/'render_inputs.json').read_text());inputs=frozen['inputHashes']
 for p,h in inputs.items():assert sha(ROOT/p)==h,('render input changed',p)
 assert sha(FILM)==frozen['outputSha256']
 p=probe(FILM);v=next(s for s in p['streams']if s['codec_type']=='video');a=next(s for s in p['streams']if s['codec_type']=='audio')
 assert(v['width'],v['height'],v['r_frame_rate'],int(v['nb_read_frames']))==(1920,1080,'30/1',1681)
 assert abs(float(v['duration'])-1681/30)<.002;assert a['channels']==2;assert abs(float(a['duration'])-56.005011)<.01;assert float(v['start_time'])==float(a['start_time'])==0
 subprocess.run([FF,'-v','error','-xerror','-i',str(FILM),'-f','null','-'],check=True)
 source=ROOT/'assets/mv-extra/user_reference_audio.m4a';src=run('-i',source,'-map','0:a','-c:a','copy','-f','adts','-');out=run('-i',FILM,'-map','0:a','-c:a','copy','-f','adts','-');assert src==out,'AAC packets differ or are truncated'
 original=run('-i',source,'-ac','1','-ar','22050','-f','f32le','-');encoded=run('-i',FILM,'-map','0:a','-ac','1','-ar','22050','-f','f32le','-');assert original==encoded,'Decoded full audio differs';assert hashlib.sha256(original).hexdigest()==timing['sourcePcmFloatSha256']
 full=diff(run('-i',FILM,'-vf','scale=160:90,format=gray','-f','rawvideo','-'));picture=diff(run('-i',FILM,'-vf','crop=1920:900:0:60,scale=160:90,format=gray','-f','rawvideo','-'));assert full['frames']==picture['frames']==1681
 from rapidocr_onnxruntime import RapidOCR
 ocr=RapidOCR(intra_op_num_threads=2,inter_op_num_threads=1);cache=HERE/'encoded_frames';cache.mkdir(exist_ok=True);checks=[]
 for cue in timing['cues']:
  t=(cue['start']+cue['end'])/2;file=cache/f"caption_{cue['line']:02d}.jpg";run('-ss',t,'-i',FILM,'-frames:v','1','-q:v','2','-y',file);im=np.asarray(Image.open(file).convert('RGB'))[967:1064,:,:];r,_=ocr(im);actual=''.join(x[1].replace(' ','')for x in(r or[]));checks.append({'line':cue['line'],'sourceTime':t,'expected':cue['text'],'actualOcr':actual,'passed':actual==cue['text'],'confidences':[round(float(x[2]),4)for x in(r or[])]});print(checks[-1],flush=True)
 (HERE/'encoded_caption_check.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2)+'\n');
 manual=json.loads((HERE/'caption_manual_review.json').read_text());assert manual['masterSha256']==sha(FILM);static=[]
 for c in checks:
  if not c['passed']:
   m=next((x for x in manual['items']if x['line']==c['line']),None);assert m and m['expected']==c['expected'] and m['passed'] is True and m['encodedFrameSha256']==sha(cache/f"caption_{c['line']:02d}.jpg"),'unreviewed encoded caption mismatch';static.append(m)
 for t in [3.5,5.6,17.7,20.4,24.7,26.9,34.6,37.6,38.4,41.2,44.3,47.8,53.7,55.2]:run('-ss',t,'-i',FILM,'-frames:v','1','-q:v','2','-y',cache/f'encoded_{t}.jpg')
 # Extract from the actual master; crop audio from complete PCM, avoiding HE-AAC input-seek trim loss.
 run('-ss','31.4','-i',FILM,'-ss','31.4','-i',HERE/'cache/source48.wav','-t','13.2','-map','0:v','-map','1:a','-c:v','libx264','-preset','fast','-crf','19','-threads','2','-c:a','aac','-b:a','192k','-movflags','+faststart','-y',SAMPLE)
 sp=probe(SAMPLE);sv=next(s for s in sp['streams']if s['codec_type']=='video');sa=next(s for s in sp['streams']if s['codec_type']=='audio');assert int(sv['nb_read_frames'])==396;assert abs(float(sa['duration'])-13.2)<.002;subprocess.run([FF,'-v','error','-xerror','-i',str(SAMPLE),'-f','null','-'],check=True)
 sample_meta={'derivedFromMasterSha256':sha(FILM),'sourceMasterRange':[31.4,44.6],'path':str(SAMPLE.relative_to(ROOT)),'sha256':sha(SAMPLE),'frames':396,'audioSeconds':float(sa['duration']),'videoSeconds':float(sv['duration']),'fullDecodePassed':True,'audioSource':'complete source48.wav, original 31.4–44.6s, AAC reencoded only for excerpt'};(HERE/'sample_inputs.json').write_text(json.dumps(sample_meta,ensure_ascii=False,indent=2)+'\n')
 tap=(HERE/'node_tests.tap').read_text();assert '# pass 10' in tap and '# fail 0' in tap
 for p,h in inputs.items():assert sha(ROOT/p)==h,('changed during audit',p)
 report={'status':'technical_pass_pending_human_review','automatedPassed':True,'humanDynamicApproved':False,'musicMicrotimingApproved':False,'master':{'path':str(FILM.relative_to(ROOT)),'sha256':sha(FILM),'bytes':FILM.stat().st_size,'width':1920,'height':1080,'fps':30,'frames':1681,'videoDuration':float(v['duration']),'audioDuration':float(a['duration']),'audioCodec':a['codec_name'],'audioProfile':a.get('profile'),'channels':2,'fullDecodePassed':True},'audioIntegrity':{'completeAacPayloadEqualToUserSource':True,'allDecodedFloatSamplesExactlyEqual':True,'adtsSha256':hashlib.sha256(src).hexdigest(),'sourceContainerSha256':sha(source),'decodedAudioSeconds':len(original)/4/22050,'retimed':False,'reencoded':False},'encodedCaptions':{'combinedVerified':16,'strictOcrPassed':sum(c['passed']for c in checks),'strictOcrFailed':sum(not c['passed']for c in checks),'staticManualVerified':len(static),'method':'OCR from actual encoded frame; retain raw mismatch. Static visual exceptions require actual viewed frame SHA and master SHA; not ASR or phoneme sync approval','items':checks,'staticManual':static},'fullFrameDifference':full,'pictureExcludingCaptionAndCorner':picture,'differenceLimits':'Diagnostics only. Intentional holds may be identical. No face ROI motion score, acting quality or aesthetic approval.','sample':sample_meta,'timing':{'provenance':timing['axisProvenance'],'uncertaintySeconds':timing['uncertaintySeconds'],'phonemeAligned':False,'humanListeningApproved':False,'lyricRecoveryLimit':timing['lyricRecoveryLimit'],'sourceTextDifferences':timing['sourceTextDifferences']},'nodeTests':{'pass':10,'fail':0,'tapSha256':sha(HERE/'node_tests.tap')},'renderInputs':inputs,'auditorSha256':sha(Path(__file__)),'pending':['User full dynamic viewing','Individual syllable/phrase alignment by listening','Old lyric TXT was lost; reconstructed text is not a recovered old-file hash','Guest appearance/pacing review','External publication and music/character rights are not granted by this audit']}
 (HERE/'final_check.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:report[k]for k in ['status','master','audioIntegrity','sample']},ensure_ascii=False,indent=2))
if __name__=='__main__':main()
