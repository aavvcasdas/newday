"""Day8 ASR结果按实测发声段修边；保留原始识别与人工修边记录。"""
from pathlib import Path
import json,re,hashlib,wave
ROOT=Path(__file__).resolve().parents[2]
p=ROOT/'tools/day8制作';x=json.loads((p/'asr_alignment_raw.json').read_text());segs=x['speech_segments']
# ASR在以下句首误认了上一句末字；起点来自同一WAV的10ms RMS发声段。
onsets={15:33.25,16:35.45,40:93.86}
for c in x['cues']:
 if c['index'] in onsets:c['start']=onsets[c['index']]
for i,c in enumerate(x['cues']):
 next_start=x['cues'][i+1]['start'] if i+1<len(x['cues']) else x['source_duration_seconds']+.01
 ss=[(a,b) for a,b in segs if a>=c['start']-.06 and a<next_start-.06]
 if ss:
  c['start']=round(max(0,ss[0][0]),3);c['end']=round(min(next_start,ss[-1][1]),3)
 c['duration_seconds']=round(c['end']-c['start'],3)
x['kind']='day8_measured_voice_alignment';x['source_file']='Day8/配音/鲸鱼查岗_克隆配音_最终版.wav'
x['source_sha256']=hashlib.sha256((ROOT/x['source_file']).read_bytes()).hexdigest()
x['manual_corrections']={str(k):{'onset':v,'basis':'RMS voiced onset; original ASR first-character substitution crosses preceding line'} for k,v in onsets.items()}
(p/'voice_alignment.json').write_text(json.dumps(x,ensure_ascii=False,indent=2))
screens=[]
for c in x['cues']:
 clauses=re.findall(r'[^，。！？；：、]+[，。！？；：、]?',c['text']);ss=[(a,b) for a,b in segs if a>=c['start']-.06 and a<c['end']-.01];j=0
 for n,cl in enumerate(clauses):
  count=len(re.findall(r'[\u4e00-\u9fff]',cl));ts=c['chars_timed'][j:j+count];j+=count
  if len(ss)==len(clauses):a,b=ss[n]
  else:
   a=c['start'] if n==0 else ts[0]['start']
   b=c['end'] if n==len(clauses)-1 else max(t['end'] for t in ts)
   a=max(c['start'],min(a,c['end']-.05));b=min(c['end'],max(a+.05,b))
  screens.append(dict(id=c['id'],text=cl,start=round(a,3),speech_end=round(b,3),end=round(b+.25,3)))
for a,b in zip(screens,screens[1:]):a['end']=min(a['end'],b['start'])
screens[-1]['end']=min(screens[-1]['end'],round(x['cues'][-1]['end']+.2,3))
assert all(s['start']<s['end'] for s in screens)
assert ''.join(s['text'] for s in screens)==''.join(c['text'] for c in x['cues'])
(p/'subtitle_timing.json').write_text(json.dumps(dict(measured=True,method='ASR逐字识别+RMS气口修边；英文coding/bug按所在实测发声段整体保留；LEAD=0；最大尾挂0.25s',screens=screens),ensure_ascii=False,indent=2))
def stamp(t):
 a=round(t*1000);return f'{a//3600000:02}:{a//60000%60:02}:{a//1000%60:02},{a%1000:03}'
out=ROOT/'Day8/字幕';out.mkdir(exist_ok=True)
(out/'Day8字幕.srt').write_text('\n\n'.join(f'{i}\n{stamp(s["start"])} --> {stamp(s["end"])}\n{s["text"]}' for i,s in enumerate(screens,1))+'\n')
print('68句 /',len(screens),'屏 /',x['source_duration_seconds'],'秒，末句结束',x['cues'][-1]['end'])
for c in x['cues']:
 print(c['id'],c['start'],c['end'],c['text'])
