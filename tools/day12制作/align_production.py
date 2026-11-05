"""Map the actual Vosk acoustic words to the 24 spoken lines; do not fabricate the absent draft opening.
Pinyin-assisted edit alignment handles 本鲸/本金 and 豆包/痘疤 ASR errors. Character references retain
whole ASR word intervals (NOT invented phoneme/character timestamps). Subtitles use clause word bounds.
"""
import difflib
import hashlib
import json
import re
import sys
from pathlib import Path
import numpy as np
from pypinyin import lazy_pinyin
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools/音频'))
sys.path.insert(0, str(ROOT / 'tools/验收'))
from align_voice import decode_mono
from media_common import probe
HERE = Path(__file__).resolve().parent


def phone(c):
    return lazy_pinyin(c)[0].replace('ng', 'n').replace('zh', 'z').replace('sh', 's').replace('ch', 'c')


def main():
    voice = ROOT / '鲸鱼摇人_克隆配音_最终版.wav'
    lines = (ROOT / 'Day12/Day12视频字幕台词.txt').read_text().splitlines()
    raw = json.loads((HERE / 'asr_words.json').read_text())
    assert hashlib.sha256(voice.read_bytes()).hexdigest() == raw['source_sha256']
    words = raw['result']
    observed = [(c, wi) for wi, w in enumerate(words) for c in w['word'] if c.isalnum()]
    expected = [(c, li, ci) for li, ln in enumerate(lines) for ci, c in enumerate(ln) if c.isalnum()]
    a, b = [phone(c) for c, _ in observed], [phone(c) for c, _, _ in expected]
    n, m = len(a), len(b)
    dp = np.zeros((n + 1, m + 1)); op = np.zeros((n + 1, m + 1), dtype=np.int8)
    dp[:, 0] = np.arange(n + 1) * .9; dp[0, :] = np.arange(m + 1) * .9
    op[1:, 0] = 1; op[0, 1:] = 2
    def cost(x, y):
        if x == y: return 0
        ratio = difflib.SequenceMatcher(None, x, y).ratio()
        return .38 if ratio >= .65 else 1.15
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            opts = [dp[i-1,j-1]+cost(a[i-1],b[j-1]), dp[i-1,j]+.9, dp[i,j-1]+.9]
            k = int(np.argmin(opts));dp[i,j] = opts[k];op[i,j] = k
    mapping = {};i,j=n,m
    while i or j:
        k = int(op[i,j])
        if k == 0: mapping[j-1] = i-1;i-=1;j-=1
        elif k == 1:i-=1
        else:j-=1
    # Deleted script characters use neighbouring observed word span, explicitly marked; never claim phoneme precision.
    chars = [[] for _ in lines]; reviewed=[]
    for j, (c, li, ci) in enumerate(expected):
        exact = j in mapping
        obs = mapping[j] if exact else mapping[min(mapping, key=lambda k: abs(k-j))]
        wi = observed[obs][1]; w=words[wi]
        relation = 'same_pinyin' if phone(c)==phone(observed[obs][0]) else ('phonetic_substitution' if exact else 'neighbour_word_uncertain')
        item={'ch':c,'scriptCharIndex':ci,'start':w['start'],'end':w['end'],'asrWordIndex':wi,'asrWord':w['word'],'asrConfidence':w['conf'],'alignmentRelation':relation,'timing_source':'actual Vosk WORD interval, pinyin-assisted transcript mapping; not phoneme alignment'}
        chars[li].append(item)
    mono,sr=decode_mono(voice)
    win=int(.005*sr);rms=np.sqrt((mono[:len(mono)//win*win].reshape(-1,win)**2).mean(axis=1)+1e-24);db=20*np.log10(rms)
    def onset(t):
        lo=max(0,int((t-.12)/.005)); hi=min(len(db),int((t+.08)/.005))
        idx=np.flatnonzero(db[lo:hi]>-48)
        return round((lo+idx[0])*.005,3) if len(idx) else t
    def offset(t):
        lo=max(0,int((t-.05)/.005));hi=min(len(db),int((t+.14)/.005))
        idx=np.flatnonzero(db[lo:hi]>-48)
        return round((lo+idx[-1]+1)*.005,3) if len(idx) else t
    cues=[]
    for li,ln in enumerate(lines):
        cc=chars[li];start=onset(min(c['start'] for c in cc));end=offset(max(c['end'] for c in cc))
        cues.append({'id':f'L{li+1:02}','index':li+1,'originalScriptLine':li+2,'text':ln,'start':start,'end':end,'chars_timed':cc})
    for x,y in zip(cues,cues[1:]):
        if x['end']>y['start']:
            mid=round((x['end']+y['start'])/2,3);x['end']=mid;y['start']=mid
    screens=[]
    for cue in cues:
        # Split on punctuation; short introductory clauses merge into next, no per-line proportional timing.
        parts=re.findall(r'[^，。！？：、]+[，。！？：、]?',cue['text'])
        k=0
        while k<len(parts)-1:
            if len(re.sub(r'\W','',parts[k]))<4:parts[k+1]=parts[k]+parts[k+1];parts.pop(k)
            else:k+=1
        pos=0
        for part in parts:
            startidx=cue['text'].find(part,pos);endidx=startidx+len(part);pos=endidx
            cs=[c for c in cue['chars_timed'] if startidx<=c['scriptCharIndex']<endidx]
            if not cs:raise ValueError('missing clause word span')
            st=max(cue['start'],min(c['start'] for c in cs));en=min(cue['end'],max(c['end'] for c in cs))
            # 15 readable characters maximum per screen; split only at an observed word boundary.
            if sum(c.isalnum() for c in part)>15:raise ValueError(f'long clause needs editorial split: {part}')
            screens.append({'line':cue['index'],'originalScriptLine':cue['originalScriptLine'],'text':part,'start':round(st,3),'speech_end':round(en,3),'end':round(en+.20,3)})
    for x,y in zip(screens,screens[1:]):x['end']=min(x['end'],y['start'])
    duration=float(probe(voice)['format']['duration'])
    # Preserve the full user audio. Its final trailing silence is not cut/retimed.
    if cues[-1]['end']<duration-.35:
        print('SOURCE_TRAILING_SILENCE',round(duration-cues[-1]['end'],3))
    out={'measured':True,'method':'actual Vosk word intervals + automated pinyin sequence mapping (uncertainty flagged) + 5ms RMS sentence bounds','source_file':voice.name,'source_sha256':raw['source_sha256'],'source_duration_seconds':duration,'sourceScriptSha256':hashlib.sha256((ROOT/'Day12/Day12视频字幕台词.txt').read_bytes()).hexdigest(),'cue_count':len(cues),'draftOpeningNotSpoken':'找新朋友来帮忙。','wordTimingPrecision':'ASR word intervals, not forced phoneme/character timestamps','cues':cues}
    sub={'measured':True,'source_sha256':raw['source_sha256'],'method':'ASR word-span clause boundaries; no character-rate interpolation','screens':screens}
    (HERE/'voice_alignment.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
    (HERE/'subtitle_timing.json').write_text(json.dumps(sub,ensure_ascii=False,indent=2)+'\n')
    report={'source_sha256':raw['source_sha256'],'rawAsrUnedited':True,'unspokenOpeningOmittedOnlyFromVideoTranscript':True,'draftUnchanged':True,'modelMirror':'jimy7945/vosk-model-cn','modelCommit':'c3eca5074b0ac967ecd6dd107e0dd64d9a7c5e28','sourceDuration':duration,'actualDecodedSamples':len(mono),'sampleRate':sr,'sentenceBounds':[{'originalLine':c['originalScriptLine'],'start':c['start'],'end':c['end'],'text':c['text']} for c in cues],'uncertainCharacters':[c for cc in chars for c in cc if c['alignmentRelation']=='neighbour_word_uncertain'],'limits':'Vosk transcription contains errors; mapping corrects written text using unchanged source script, retains acoustic word spans. Not a speaker identity verification or human listening claim.'}
    (HERE/'alignment_review.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print('ALIGNED',len(cues),'cues',len(screens),'screens')
    for c in cues: print(c['originalScriptLine'],c['start'],c['end'],c['text'])

if __name__=='__main__':main()
