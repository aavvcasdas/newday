#!/usr/bin/env python3
"""制作统一门禁。final累计执行全部阶段，任何缺失/失败非零退出。
运行报告不等于人工观影批准；可疑画面仍要抽查。
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path
from datetime import datetime, timezone
ROOT=Path(__file__).resolve().parents[1]
sys.path[:0]=[str(ROOT/'tools/验收'),str(ROOT/'tools/剧本')]
from media_common import read_json, validate_timing, probe
STAGES=['script','audio','pre-render','final']


def find_prev_script(day):
    """上一集的锁定口播。

    标准文件名是 `DayN/DayN配音台词.txt`。但 Day13 的锁定稿是由用户确认后
    另存的 `Day13配音台词_用户版.txt`（原候选稿仍留作历史，不是配音来源），
    所以这里按「标准名优先、用户确认版次之」回退，避免为了过门禁而复制一份
    同名文件，制造两个互相矛盾的锁定稿。
    """
    base=ROOT/f'Day{day}'
    for name in (f'Day{day}配音台词.txt',f'Day{day}配音台词_用户版.txt'):
        candidate=base/name
        if candidate.is_file(): return candidate
    return None


def build_paths(day,config):
    cfg=read_json(config)
    for k in ['script','voice','alignment','subs','renderer','video','tests']:
        if not cfg.get(k): raise ValueError(f'配置缺少{k}，不允许静默跳过')
    if not isinstance(cfg['tests'],list) or not all(isinstance(p,str) for p in cfg['tests']):
        raise ValueError('tests必须为非空路径数组')
    paths={k:(ROOT/cfg[k]).resolve() for k in ['script','voice','alignment','subs','renderer','video']}
    paths['tests']=[(ROOT/p).resolve() for p in cfg['tests']]
    for p in [*paths['tests'],*(v for k,v in paths.items() if k!='tests')]:
        if not p.is_relative_to(ROOT): raise ValueError('配置路径必须位于仓库')
    return cfg,paths


def main():
    ap=argparse.ArgumentParser();ap.add_argument('--day',type=int,required=True)
    ap.add_argument('--stage',choices=STAGES,required=True);ap.add_argument('--config',type=Path)
    ap.add_argument('--report',type=Path,help='单独保存本次门禁报告，避免覆盖另一版本')
    args=ap.parse_args()
    if args.day<1: ap.error('day必须正整数')
    config=args.config or ROOT/f'tools/day{args.day}制作/gate_config.json'
    if args.stage=='script' and args.config is None and not config.is_file():
        # 文案阶段尚未有音源/渲染器，不要求先伪造后续文件。
        cfg={}
        paths={'script':ROOT/f'Day{args.day}/Day{args.day}配音台词.txt'}
    else:
        cfg,paths=build_paths(args.day,config)
    report={'config':str(config),'input_sha256':{},'day':args.day,'stage':args.stage,'timestamp':datetime.now(timezone.utc).isoformat(),'checks':[],'passed':False}
    def run(name,cmd):
        result=subprocess.run([str(x) for x in cmd],cwd=ROOT,capture_output=True,text=True)
        print(f'[{name}] exit={result.returncode}\n{result.stdout}{result.stderr}',flush=True)
        report['checks'].append(dict(name=name,command=[str(x) for x in cmd],exit_code=result.returncode,stdout=result.stdout,stderr=result.stderr))
        return result.returncode==0
    import hashlib
    for key,value in paths.items():
        for path in value if isinstance(value,list) else [value]:
            if path.is_file():report['input_sha256'][str(path.relative_to(ROOT))]=hashlib.sha256(path.read_bytes()).hexdigest()
    py=sys.executable;ok=True
    selected=STAGES if args.stage=='final' else [args.stage]
    for stage in selected:
        try:
            if stage=='script':
                if args.day >= 12:
                    prev = find_prev_script(args.day - 1)
                    if prev is None:
                        raise ValueError(f'缺上一集锁定口播：Day{args.day - 1}/Day{args.day - 1}配音台词.txt')
                    print(f'[剧情承接] 上一集锁定口播：{prev.relative_to(ROOT)}')
                    cmd = [py, ROOT/'tools/剧本/剧情.py', '--txt', paths['script'], '--prev', prev]
                    if cfg.get('guest'):
                        cmd += ['--guest', cfg['guest']]
                    ok = run('剧情承接', cmd) and ok
                    director_spec = ROOT / f'tools/day{args.day}制作/episode.spec.mjs'
                    if director_spec.is_file():
                        report['input_sha256'][str(director_spec.relative_to(ROOT))] = hashlib.sha256(director_spec.read_bytes()).hexdigest()
                        ok = run('导演分镜结构（仅规划）', ['node', ROOT/'tools/engine/check_storyboard.mjs', '--spec', director_spec, '--script', paths['script']]) and ok
                else:
                    ok=run('文案',[py,ROOT/'tools/剧本/呆萌体检.py','--txt',paths['script'],'--rate',str(cfg.get('rate',3.35)),'--seconds',str(cfg.get('seconds',60))]) and ok
            elif stage=='audio':
                d=read_json(paths['alignment']);s=read_json(paths['subs']);lines=paths['script'].read_text().strip().splitlines()
                validate_timing(d,s,lines,paths['voice'])
                source_duration=float(probe(paths['voice'])['format']['duration'])
                if abs(source_duration-d['source_duration_seconds'])>.03: raise ValueError('音源真实时长不匹配')
                report['checks'].append(dict(name='实测轴/哈希/台词/字幕',exit_code=0))
                cmd=[py,ROOT/'tools/剧本/开场体检.py','--json',paths['alignment']]
                if cfg.get('event_cue'):cmd+=['--event-cue',cfg['event_cue']]
                ok=run('开场',cmd) and ok
            elif stage=='pre-render':
                ok=run('画面红线',[py,ROOT/'tools/剧本/画面红线体检.py','--day',str(args.day)]) and ok
                for test in paths['tests']:
                    if not test.is_file():raise ValueError(f'缺动作单测：{test}')
                ok=run('动作单测',['node','--test',*paths['tests']]) and ok
                ok=run('渲染器自检',['node',paths['renderer'],'--voice',paths['voice'],'--alignment',paths['alignment'],'--subtitle-file',paths['subs'],'--test']) and ok
            else:
                ok=run('通用媒体终验',[py,ROOT/'tools/验收/verify_episode.py',*sum(([f'--{k}',paths[v]] for k,v in [('video','video'),('voice','voice'),('alignment','alignment'),('subs','subs'),('script','script')]),[]),'--report',ROOT/f'tools/day{args.day}制作/gate_media_report.json']) and ok
                # 前2秒防枯燥体检：仅新集（day>=11 或显式启用通用引擎）追加，历史单集门禁行为不变
                if args.day>=11 or cfg.get('use_unified_engine'):
                    ok=run('开场视觉',[py,ROOT/'tools/验收/check_opener_visual.py','--video',paths['video'],'--report',ROOT/f'tools/day{args.day}制作/gate_opener_visual_report.json']) and ok
        except (ValueError,OSError,KeyError,subprocess.CalledProcessError) as e:
            report['checks'].append(dict(name=stage,exit_code=1,error=str(e)));print(f'[{stage}] 失败：{e}');ok=False
    report['passed']=ok
    out=(ROOT/args.report).resolve() if args.report else ROOT/f'tools/day{args.day}制作/gate_{args.stage}_report.json';out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(f'门禁{"通过" if ok else "未通过"}；报告：{out}')
    return 0 if ok else 1

if __name__=='__main__':
    try:sys.exit(main())
    except (ValueError,OSError,KeyError) as e:sys.exit(f'门禁配置/输入失败：{e}')
