"""Day10 supplied WAV: retain raw Vosk, repair cross-line token matches using measured RMS."""
from pathlib import Path
import json,re,hashlib
ROOT=Path(__file__).resolve().parents[2];P=ROOT/'tools/day10制作'
x=json.loads((P/'asr_alignment_raw.json').read_text());segs=x['speech_segments'];cues=x['cues']
starts=[c['start'] for c in cues];starts[18]=46.74
# Explicit acoustic repairs: interjection was omitted, and repeated syllables crossed neighboring lines.
fix={(1,0):[0,.39],(1,9):[2.277,2.52],(13,0):[32.53,32.68],(13,1):[32.68,32.91],(18,9):[46.024,46.25],(19,0):[46.74,47.77],(22,0):[54.84,54.96]}
for i,c in enumerate(cues):
 stop=starts[i+1] if i+1<len(cues) else x['source_duration_seconds']+.01
 ss=[(a,b) for a,b in segs if a>=starts[i]-.025 and a<stop-.025];assert ss
 c['start'],c['end']=ss[0][0],ss[-1][1];c['duration_seconds']=round(c['end']-c['start'],3)
 c['gap_before']=None if i==0 else round(c['start']-cues[i-1]['end'],3)
 for j,t in enumerate(c['chars_timed']):
  if (i+1,j) in fix:t['start'],t['end']=fix[(i+1,j)];t['timing_source']='manual repair against measured RMS and ASR sequence'
  else:t['timing_source']='Vosk sequence alignment; includes substitutions and neighbor interpolation, not phoneme ground truth'
  t['start']=round(max(c['start'],min(c['end']-.01,t['start'])),3);t['end']=round(max(t['start']+.005,min(c['end'],t['end'])),3)
 # Remove neighbor overlaps without pretending interpolated tokens are independently recognized.
 for left,right in zip(c['chars_timed'],c['chars_timed'][1:]):
  if left['end']>right['start']:
   mid=round((max(left['start'],right['start'])+min(left['end'],right['end']))/2,3)
   left['end']=max(left['start']+.001,mid);right['start']=min(right['end']-.001,mid)
 c['chars_per_second']=round(c['chars']/(c['end']-c['start']),3)
x.update(kind='day10_measured_voice_alignment',source_file='鲸鱼架空_克隆配音_最终版.wav',word_level=True,synthesis_engine_known=False,source_sha256=hashlib.sha256((ROOT/'鲸鱼架空_克隆配音_最终版.wav').read_bytes()).hexdigest(),manual_corrections=[{'line':i,'char_index':j,'times':v,'basis':'actual RMS speech spans + raw ASR sequence; repair cross-line/omitted syllables'} for (i,j),v in fix.items()])
screens=[]
for c in cues:
 clauses=re.findall(r'[^，。！？；：…]+(?:……|[，。！？；：])?',c['text']);j=0
 for k,text in enumerate(clauses):
  n=len(re.findall(r'[\u4e00-\u9fff]',text));chars=c['chars_timed'][j:j+n];j+=n
  a=c['start'] if k==0 else chars[0]['start'];b=c['end'] if k==len(clauses)-1 else chars[-1]['end']
  screens.append({'line':c['index'],'text':text,'start':round(a,3),'speech_end':round(b,3),'end':round(min(c['end']+.24,b+.2),3)})
for a,b in zip(screens,screens[1:]):a['end']=min(a['end'],b['start'])
assert ''.join(s['text'] for s in screens)==''.join(c['text'] for c in cues)
assert all(s['start']<s['end'] for s in screens)
x['output_end_seconds']=cues[-1]['end']+.24
(P/'voice_alignment.json').write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
(P/'subtitle_timing.json').write_text(json.dumps({'measured':True,'method':'Vosk character alignment + 10ms RMS, explicit repaired syllables; punctuation screens LEAD=0, hang<=.24s','source_sha256':x['source_sha256'],'screens':screens},ensure_ascii=False,indent=2)+'\n')
def stamp(t):
 m=round(t*1000);return f'{m//3600000:02}:{m//60000%60:02}:{m//1000%60:02},{m%1000:03}'
out=ROOT/'Day10/字幕';out.mkdir(exist_ok=True)
(out/'Day10字幕.srt').write_text('\n\n'.join(f'{i}\n{stamp(s["start"])} --> {stamp(s["end"])}\n{s["text"]}' for i,s in enumerate(screens,1))+'\n')
print(x['source_duration_seconds'],len(cues),len(screens),x['source_sha256'])
for c in cues: print(c['id'],c['start'],c['end'],c['text'])
