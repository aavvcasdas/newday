"""Current Day9 WAV only: preserve raw ASR, repair cross-line substitutions, RMS boundaries."""
from pathlib import Path
import json,hashlib,re
ROOT=Path(__file__).resolve().parents[2];P=ROOT/'tools/day9制作'
x=json.loads((P/'asr_alignment_raw.json').read_text());segs=x['speech_segments']
# L07's first character was matched to L06's final sound; L29's missing characters
# were extrapolated into preceding silence. Use actual RMS onsets in the same WAV.
fix={7:14.32,10:18.99,29:63.95}
starts=[fix.get(c['index'],c['start']) for c in x['cues']]
for i,c in enumerate(x['cues']):
 stop=starts[i+1] if i+1<len(starts) else x['source_duration_seconds']+.01
 ss=[(a,b) for a,b in segs if a>=starts[i]-.025 and a<stop-.025]
 assert ss,(i,starts[i],stop)
 c['start'],c['end']=ss[0][0],ss[-1][1]
 c['duration_seconds']=round(c['end']-c['start'],3)
 c['gap_before']=None if not i else round(c['start']-x['cues'][i-1]['end'],3)
 assert c['start']<c['end']<=stop
x['kind']='day9_measured_voice_alignment';x['source_file']='Day9/配音/鲸鱼看视频_克隆配音_最终版.wav'
x['source_sha256']=hashlib.sha256((ROOT/x['source_file']).read_bytes()).hexdigest()
x['manual_corrections']={str(k):{'onset':v,'basis':'ASR token sequence and actual 10ms RMS onset; correct cross-line/missing-character interpolation'} for k,v in fix.items()}
screens=[]
for c in x['cues']:
 clauses=re.findall(r'[^，。！？；：、]+[，。！？；：、]?',c['text'])
 ss=[(a,b) for a,b in segs if a>=c['start']-.025 and a<c['end']-.01];j=0
 for n,cl in enumerate(clauses):
  count=len(re.findall(r'[\u4e00-\u9fff]',cl));ts=c['chars_timed'][j:j+count];j+=count
  if len(ss)==len(clauses):a,b=ss[n]
  else:
   a=c['start'] if n==0 else max(c['start'],ts[0]['start'])
   b=c['end'] if n==len(clauses)-1 else min(c['end'],max(t['end'] for t in ts))
   b=max(a+.03,b)
  screens.append(dict(line=c['index'],text=cl,start=round(a,3),speech_end=round(b,3),end=round(min(c['end']+.25,b+.25),3)))
for a,b in zip(screens,screens[1:]):a['end']=min(a['end'],b['start'])
screens[-1]['end']=min(screens[-1]['end'],x['cues'][-1]['end']+.2)
assert all(s['start']<s['end'] for s in screens)
assert ''.join(s['text'] for s in screens)==''.join(c['text'] for c in x['cues'])
(P/'voice_alignment.json').write_text(json.dumps(x,ensure_ascii=False,indent=2))
(P/'subtitle_timing.json').write_text(json.dumps({'measured':True,'method':'词级ASR+10ms RMS，缺失字邻字插值，按标点拆屏，LEAD=0，最大尾挂.25秒','screens':screens},ensure_ascii=False,indent=2))
def stamp(t):
 a=round(t*1000);return f'{a//3600000:02}:{a//60000%60:02}:{a//1000%60:02},{a%1000:03}'
o=ROOT/'Day9/字幕';o.mkdir(exist_ok=True)
(o/'Day9字幕.srt').write_text('\n\n'.join(f'{i}\n{stamp(s["start"])} --> {stamp(s["end"])}\n{s["text"]}' for i,s in enumerate(screens,1))+'\n')
print(len(x['cues']),'lines',len(screens),'screens',x['source_duration_seconds'],'source seconds')
