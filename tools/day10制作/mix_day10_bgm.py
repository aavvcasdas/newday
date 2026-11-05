"""Day10 music pass. Reuse Day1's instrumental generator, never extract mixed voices from old videos.
Only the audio is replaced: the H.264 video elementary stream is copied byte-for-byte.
"""
import argparse,hashlib,importlib.util,json,math,subprocess,sys,tempfile
from pathlib import Path
import numpy as np
ROOT=Path(__file__).resolve().parents[2];HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT/'tools/验收'))
from media_common import binary,probe
SR=48000

def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def pcm(p):return np.frombuffer(subprocess.check_output([binary('ffmpeg'),'-v','error','-i',str(p),'-map','0:a:0','-ar',str(SR),'-ac','2','-f','f32le','-']),dtype='<f4').reshape(-1,2)
def video_hash(p):return hashlib.sha256(subprocess.check_output([binary('ffmpeg'),'-v','error','-i',str(p),'-map','0:v:0','-c','copy','-bsf:v','h264_mp4toannexb','-f','h264','-'])).hexdigest()
def fit(x,n):return np.pad(x,((0,max(0,n-len(x))),(0,0)))[:n]
def rms(x):return float(np.sqrt(np.mean(np.asarray(x,dtype=np.float64)**2)+1e-16))
def corr(a,b):return float(np.corrcoef(a.ravel().astype('float64'),b.ravel().astype('float64'))[0,1])
def music(duration,voice):
 # Import function-only: the guarded Day1 CLI and its historical title/ending settings are NOT run.
 sys.path.insert(0,str(ROOT/'tools/day1制作'))
 spec=importlib.util.spec_from_file_location('day1_music_reference',ROOT/'tools/day1制作/gen_finalvoice.py');mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
 raw=mod.generate_bgm(duration);n=len(raw);hop=960
 mono=voice.mean(axis=1);count=math.ceil(n/hop);env=np.array([rms(mono[i*hop:min(n,(i+1)*hop)]) for i in range(count)])
 active=env>.012;mask=np.repeat(active,hop)[:n];voice_rms=rms(voice[mask]);raw_rms=rms(raw[mask]);speech_gain=min(.23,.14*voice_rms/max(raw_rms,1e-9))
 target=np.where(active,speech_gain,speech_gain*1.6);smoothed=[];gain=float(target[0])
 for value in target:
  tau=.04 if value<gain else .22;gain+=(value-gain)*(1-math.exp(-.02/tau));smoothed.append(gain)
 gain_samples=np.interp(np.arange(n),np.arange(count)*hop,np.asarray(smoothed));bgm=raw*gain_samples
 # Persist a deterministic 16-bit instrumental stem; mix from the same quantized samples QA reads back.
 stem=np.stack([bgm,bgm],axis=1);stem=np.round(stem*32768).clip(-32768,32767).astype('<i2')
 return stem,mask,{'generator':'tools/day1制作/gen_finalvoice.py:generate_bgm','bpm':128,'chords':'Am F C G','voice_gain':1.0,'speech_bgm_gain':speech_gain,'gap_bgm_gain_target':speech_gain*1.6,'duck_attack_seconds':.04,'duck_release_seconds':.22,'generator_fades_seconds':[.8,1.2]}

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--base',type=Path,default=ROOT/'Day10/成片/Day10_鲸鱼架空_配音对齐版.mp4');ap.add_argument('--output',type=Path,default=ROOT/'Day10/成片/Day10_鲸鱼架空_配音BGM版.mp4');args=ap.parse_args()
 base=args.base.resolve();out=args.output.resolve();assert base!=out,'Preserve dry reference separately'
 voice=ROOT/'鲸鱼架空_克隆配音_最终版.wav';a=json.loads((HERE/'voice_alignment.json').read_text());assert sha(voice)==a['source_sha256']
 meta=probe(base);v=next(s for s in meta['streams'] if s['codec_type']=='video');duration=float(v['duration']);n=round(duration*SR);source_pcm=pcm(voice)
 assert 0 <= (n-len(source_pcm))/SR <= .31,'Video would cut source voice or add excess tail'
 dry=fit(source_pcm,n)
 stem_i16,active,settings=music(n/SR,dry);stem=stem_i16.astype(np.float32)/32768;expected=dry+stem
 assert float(abs(expected).max())<.98,'Mix headroom insufficient; do not silently lower or clip the voice'
 asset=ROOT/'Day10/配音/Day10_轻快芯片伴奏.flac';asset.parent.mkdir(exist_ok=True)
 subprocess.run([binary('ffmpeg'),'-v','error','-y','-f','s16le','-ar',str(SR),'-ac','2','-i','-','-c:a','flac',str(asset)],input=stem_i16.tobytes(),check=True)
 with tempfile.TemporaryDirectory(prefix='day10-bgm-') as tmp:
  mix=Path(tmp)/'mix.f32';mix.write_bytes(expected.astype('<f4').tobytes())
  subprocess.run([binary('ffmpeg'),'-v','error','-y','-i',str(base),'-f','f32le','-ar',str(SR),'-ac','2','-i',str(mix),'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','192k','-ar',str(SR),'-t',str(duration),'-movflags','+faststart',str(out)],check=True)
 decoded=fit(pcm(out),n);stored=fit(pcm(asset),n);assert np.max(abs(stored-stem))<1e-7
 reconstructed=dry+stored;mixture_corr=corr(reconstructed,decoded);recovered_voice=decoded-stored;voice_corr=corr(dry,recovered_voice)
 # Neither a lower dry-vs-mixed correlation nor background energy alone proves voice preservation.
 assert mixture_corr>.999 and voice_corr>.999,(mixture_corr,voice_corr)
 voice_gain=float(np.sum(dry.astype('float64')*recovered_voice)/np.sum(dry.astype('float64')**2));assert .995<voice_gain<1.005
 cue_checks=[]
 for cue in a['cues']:
  start,end=round(cue['start']*SR),round(cue['end']*SR);value=corr(dry[start:end],recovered_voice[start:end]);assert value>.995,(cue['id'],value)
  cue_checks.append({'id':cue['id'],'recovered_voice_correlation':value})
 assert video_hash(base)==video_hash(out),'Video stream changed'
 newmeta=probe(out);vv=next(s for s in newmeta['streams'] if s['codec_type']=='video');aa=next(s for s in newmeta['streams'] if s['codec_type']=='audio')
 assert vv['nb_frames']==v['nb_frames'] and vv['duration']==v['duration'] and aa['channels']==2
 assert float(abs(decoded).max())<1.0
 subprocess.run([binary('ffmpeg'),'-v','error','-xerror','-i',str(out),'-f','null','-'],check=True)
 voice_active_rms=rms(dry[active]);music_active_rms=rms(stored[active]);below_db=20*math.log10(voice_active_rms/music_active_rms);assert below_db>=16
 assert rms(stored[~active])>1e-4,'BGM missing in speech gaps'
 refs=[]
 for file in ['Day0/day0原视频.mp4','Day1/成片/当前版/day1视频_最终配音对齐版.mp4']:
  info=probe(ROOT/file);refs.append({'file':file,'sha256':sha(ROOT/file),'duration':info['format']['duration'],'audio_rms_dbfs':20*math.log10(rms(pcm(ROOT/file))),'note':'Mixed reference only; not an isolated instrumental, not a measured melody/tempo attribution'})
 report={'passed':True,'scope':'audio_only_BGM_delivery_verification_not_old_dry_voice_correlation_gate','base':str(base.relative_to(ROOT)),'output':str(out.relative_to(ROOT)),'source_voice_sha256':sha(voice),'base_sha256':sha(base),'output_sha256':sha(out),'bgm_stem':str(asset.relative_to(ROOT)),'bgm_sha256':sha(asset),'settings':settings,'reference_media':refs,'duration':duration,'frames':int(vv['nb_frames']),'video_elementary_stream_sha256':video_hash(out),'video_stream_unchanged':True,'mixture_reconstruction_zero_offset_correlation':mixture_corr,'known_stem_subtraction_voice_correlation':voice_corr,'voice_active_bgm_below_voice_db':below_db,'voice_rms':voice_active_rms,'music_active_rms':music_active_rms,'music_gap_rms':rms(stored[~active]),'decoded_sample_peak':float(abs(decoded).max()),'clipped_samples':int(np.count_nonzero(abs(decoded)>=1)),'full_decode_exit':0,'audio_channels':aa['channels'],'audio_sample_rate':aa['sample_rate'],'voice_speed':1,'recovered_voice_gain':voice_gain,'source_tail_seconds':(n-len(source_pcm))/SR,'per_cue_checks':cue_checks,'generator_sha256':sha(ROOT/'tools/day1制作/gen_finalvoice.py'),'limitations':['Day0 style is a reference, not a claimed exact melody reconstruction','numerical level/ducking checks do not replace subjective listening','old dry-only .999 correlation gate is not applicable to a music mix; verified expected mixture and recovered voice separately']}
 (HERE/'BGM混音_验收.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
