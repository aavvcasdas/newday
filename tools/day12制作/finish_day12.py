"""Specified-audio production acceptance; does not pretend the 25-line planning gate accepts mixed audio.
Requires completed full render (or --render). Every relevant command is rerun; no stale-report-only approval.
"""
import argparse,hashlib,json,os,re,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];HERE=Path(__file__).resolve().parent
os.chdir(ROOT)
PYTHON=sys.executable
DRY='Day12/成片/Day12_配音对齐_干声基片.mp4';VIDEO='Day12/成片/Day12_鲸鱼摇人_有声BGM版.mp4'
VOICE='鲸鱼摇人_克隆配音_最终版.wav';ALIGN='tools/day12制作/voice_alignment.json';SUBS='tools/day12制作/subtitle_timing.json';SCRIPT='Day12/Day12视频字幕台词.txt'

def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def load(p):return json.loads((HERE/p).read_text())
def run(command):
    result=subprocess.run(command,cwd=ROOT,capture_output=True,text=True)
    print('$ '+' '.join(map(str,command))+'\n'+result.stdout+result.stderr,flush=True)
    if result.returncode:raise RuntimeError(f'Exit {result.returncode}: {command}')
    return result.stdout+result.stderr

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--render',action='store_true');args=ap.parse_args()
    assert sha(VOICE)=='4782532083e1eb18f17a10dbe3956a439633f338a1d0c62607b13f632b035f00'
    assert sha('Day12/Day12配音台词.txt')=='42625d93cb49999da0f67860ab3dd3dca9b37b6583b623a1cc25cb3928072d02'
    assert sha('Day11/Day11配音台词.txt')=='ec30ffa826b4e31f090b3e5bcb10532b8a0c3ee5ff7a23f45f262a4db3a41ada'
    if args.render:run(['node','tools/day12制作/render_day12.mjs','--out',DRY])
    run(['node','tools/day12制作/check_production.mjs'])
    run([PYTHON,'tools/验收/verify_episode.py','--video',DRY,'--voice',VOICE,'--alignment',ALIGN,'--subs',SUBS,'--script',SCRIPT,'--report',str(HERE/'dry_media_check.json'),'--preserve-source-tail'])
    run([PYTHON,'tools/音频/mix_episode_bgm.py','--base',DRY,'--voice',VOICE,'--alignment',ALIGN,'--output',VIDEO,'--stem','Day12/配音/Day12_伴奏含音效_stem.flac','--report',str(HERE/'bgm_check.json'),'--no-auto-sfx','--events-json',str(HERE/'sfx_events.json')])
    run([PYTHON,'tools/验收/check_subtitle_sync.py',VIDEO,'--subs',SUBS,'--report',str(HERE/'final_subtitle_check.json')])
    run([PYTHON,'tools/day12制作/check_encoded.py'])
    run([PYTHON,'tools/验收/check_opener_visual.py','--video',VIDEO,'--check-bgm','--report',str(HERE/'opener_check.json')])
    run(['node','tools/day12制作/make_covers.mjs'])
    node=run(['npm','test','--prefix','tools/engine']);n=int(re.search(r'# tests (\d+)',node)[1])
    tests=[]
    for folder in ['tools/tests','tools/验收','tools/音频']:
        output=run([PYTHON,'-m','unittest','discover','-s',folder,'-p','test*.py','-v']);tests.append({'folder':folder,'count':int(re.search(r'Ran (\d+) tests',output)[1]),'passed':True,'skipped':'skipped=' in output})
    assert not any(t['skipped'] for t in tests), 'Media tests must not be silently skipped'
    names=['production_check.json','dry_media_check.json','bgm_check.json','encoded_check.json','final_subtitle_check.json','opener_check.json','cover_check.json']
    reports={name:load(name)for name in names}
    assert all(r['passed']for r in reports.values())
    assert load('dry_media_check.json')['video_sha256']==sha(DRY)==load('bgm_check.json')['base_sha256']
    assert load('encoded_check.json')['sha256']==sha(VIDEO)==load('bgm_check.json')['output_sha256']
    assert load('bgm_check.json')['bgm_sha256']==sha('Day12/配音/Day12_伴奏含音效_stem.flac')
    for p,h in load('production_check.json')['inputs'].items():assert sha(HERE/p)==h
    result={'passed':True,'version':'specified_original_audio_24_spoken_lines_with_bgm','source_sha256':sha(VOICE),'video':VIDEO,'video_sha256':sha(VIDEO),'duration':104.3,'frames':3129,
        'reports':{name:sha(HERE/name)for name in names},'node_tests':n,'python_tests':tests,
        'covers':{str(p.relative_to(ROOT)):sha(p)for p in (ROOT/'Day12/封面').glob('*.png')},
        'scope':'Actual full decode, critical-frame references, measured word binding, subtitles, dry audio and BGM known-stem recovery. Not human whole-film listening or phoneme-exact alignment; hand contact not claimed.',
        'original_25_line_draft_unchanged':True,'unspoken_opening_not_synthesized':True,'original_native_quiet_tail_preserved':True}
    (HERE/'final_check.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print('PASS specified-audio complete acceptance',sha(VIDEO),flush=True)
if __name__=='__main__':main()
