import json,re,hashlib,sys,difflib
from pathlib import Path
import numpy as np
from pypinyin import lazy_pinyin
ROOT=Path(__file__).resolve().parents[2];H=Path(__file__).parent
sys.path.insert(0,str(ROOT/'tools/音频'));sys.path.insert(0,str(ROOT/'tools/验收'))
from align_voice import decode_mono
from media_common import probe
voice=ROOT/'鲸鱼MV画面_克隆配音_最终版.wav'; script=ROOT/'Day13/Day13视频字幕台词.txt';lines=script.read_text().splitlines();raw=json.loads((H/'asr_words.json').read_text()); words=raw['result']; assert raw['source_sha256']==hashlib.sha256(voice.read_bytes()).hexdigest()
alias={'Claude':'克劳德','Kimi':'基米','Gemini':'杰米尼','MV':'艾姆维','Token':'托肯'}
def phone(c):return lazy_pinyin(c)[0].replace('ng','n').replace('zh','z').replace('sh','s').replace('ch','c')
expected=[]
for li,line in enumerate(lines):
 i=0
 while i<len(line):
  match=next(((k,v) for k,v in alias.items() if line.startswith(k,i)),None)
  if match:
   k,v=match
   for c in v: expected.append((c,li,i,i+len(k)))
   i+=len(k)
  else:
   if line[i].isalnum():expected.append((line[i],li,i,i+1))
   i+=1
observed=[(c,wi) for wi,w in enumerate(words) for c in w['word'] if c.isalnum()]; a=[phone(x[0]) for x in observed];b=[phone(x[0]) for x in expected];n=len(a);m=len(b);dp=np.zeros((n+1,m+1));op=np.zeros((n+1,m+1),dtype=np.int8);dp[:,0]=np.arange(n+1)*.9;dp[0,:]=np.arange(m+1)*.9;op[1:,0]=1;op[0,1:]=2
for i in range(1,n+1):
 for j in range(1,m+1):
  cost=0 if a[i-1]==b[j-1] else (.38 if difflib.SequenceMatcher(None,a[i-1],b[j-1]).ratio()>=.65 else 1.15)
  opts=[dp[i-1,j-1]+cost,dp[i-1,j]+.9,dp[i,j-1]+.9];k=int(np.argmin(opts));dp[i,j]=opts[k];op[i,j]=k
mapping={};i=n;j=m
while i or j:
 k=int(op[i,j])
 if k==0:mapping[j-1]=i-1;i-=1;j-=1
 elif k==1:i-=1
 else:j-=1
chars=[[] for _ in lines]
for j,(c,li,lo,hi) in enumerate(expected):
 obs=mapping[j] if j in mapping else mapping[min(mapping,key=lambda k:abs(k-j))]; w=words[observed[obs][1]]
 chars[li].append({'ch':c,'lo':lo,'hi':hi,'start':w['start'],'end':w['end'],'asr':w['word'],'relation':'exact' if phone(c)==phone(observed[obs][0]) else ('substitution' if j in mapping else 'neighbor')})
mono,sr=decode_mono(voice);win=int(.005*sr);rms=np.sqrt((mono[:len(mono)//win*win].reshape(-1,win)**2).mean(axis=1)+1e-24);db=20*np.log10(rms)
def bound(t,start):
 lo=max(0,int((t-(.12 if start else .05))/.005));hi=min(len(db),int((t+(.08 if start else .14))/.005));idx=np.flatnonzero(db[lo:hi]>-48)
 return round((lo+(idx[0] if start else idx[-1]+1))*.005,3) if len(idx) else round(t,3)
cues=[]; screens=[]
for li,line in enumerate(lines):
 cc=chars[li];st=bound(min(x['start'] for x in cc),True);en=bound(max(x['end'] for x in cc),False)
 cues.append({'id':f'L{li+1:02}','index':li+1,'text':line,'start':st,'end':en,'chars_timed':cc})
 for mt in re.finditer(r'[^，。！？：、]+[，。！？：、]?',line):
  lo,hi=mt.span();cs=[c for c in cc if c['lo']<hi and c['hi']>lo];
  if not cs: continue
  screens.append({'line':li+1,'text':mt.group(),'start':round(max(st,min(x['start'] for x in cs)),3),'speech_end':round(min(en,max(x['end'] for x in cs)),3),'end':round(min(en,max(x['end'] for x in cs))+.2,3)})
for x,y in zip(cues,cues[1:]):
 if x['end']>y['start']:
  mid=round((x['end']+y['start'])/2,3);x['end']=mid;y['start']=mid
for x,y in zip(screens,screens[1:]):
 if x['end']>y['start']:x['end']=y['start']
dur=float(probe(voice)['format']['duration']);screens[-1]['end']=min(screens[-1]['end'],dur);out={'measured':True,'method':'Vosk word alignment, pinyin mapping + RMS; not phoneme or listening verified','source_file':voice.name,'source_sha256':raw['source_sha256'],'source_duration_seconds':dur,'sourceScriptSha256':hashlib.sha256(script.read_bytes()).hexdigest(),'cues':cues};sub={'measured':True,'source_sha256':raw['source_sha256'],'method':'word-span clause','screens':screens}
(H/'voice_alignment.json').write_text(json.dumps(out,ensure_ascii=False,indent=2));(H/'subtitle_timing.json').write_text(json.dumps(sub,ensure_ascii=False,indent=2));
for c in cues:print(c['index'],c['start'],c['end'],c['text'])
for s in screens:
 if s['end']<=s['start']: print('BAD SCREEN',s)
