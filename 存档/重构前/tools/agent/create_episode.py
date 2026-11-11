#!/usr/bin/env python3
"""真正的创作入口：同一套人格 + skill + 上集全文 + 当集方向；不写回剧本。"""
import argparse
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path[:0] = [str(ROOT / 'tools/agent'), str(ROOT / 'tools/剧本')]
from persona import AGENT_ID, CHARACTER_ID, PERSONA_ID, VISUAL_ID
from provider import ProviderError, from_env
from runtime import build_messages
from 剧情 import GUESTS, check

SKILL = '00_运营总览/skills/剧情生成'
REFERENCES = ('persona.md', 'beats.md', 'research.md')


def prepare(root, day, guest):
    """读取必需上下文全文；缺任何文件就失败，不降级为只读标题。"""
    if day < 12:
        raise ValueError('创作入口用于 Day12 起的新稿，不改历史锁定稿')
    if guest not in GUESTS:
        raise ValueError('客人未注册')
    root = Path(root)
    paths = [
        'agent.md', f'{SKILL}/SKILL.md',
        *(f'{SKILL}/references/{name}' for name in REFERENCES),
        f'Day{day - 1}/Day{day - 1}配音台词.txt',
        f'Day{day}/Day{day}方向.md',
    ]
    sources, sections = [], []
    for rel in paths:
        path = root / rel
        raw = path.read_bytes()
        text = raw.decode('utf-8')
        if not text.strip():
            raise ValueError(f'创作输入为空：{rel}')
        # 下方是历史渲染规范；只加载优先的覆盖规则，避免旧呆萌设定抢权。
        if rel == 'agent.md':
            text = text.split('### 0.1 ', 1)[0]
        sources.append({'path': rel, 'sha256': hashlib.sha256(raw).hexdigest()})
        sections.append(f'--- 项目材料：{rel} ---\n{text}')
    task = (
        f'写 Day{day} 待审核纯口播，今天只来{guest}。开头找新朋友来帮忙，'
        '请人处理上一集未完成的任务；求职梗制造障碍，主角追问并动手纠正，'
        '最后把具体未完成项留给下集。保留大肥鱼身份、现行外形和本鲸称呼，只移植魔丸人格。'
        '当集方向是待审核方案，不是已发生事实。创作演出不冒充真实招聘结果。'
        '仅输出逐行口播，不输出 Markdown、分镜、标题、解释或检查报告。'
    )
    messages = build_messages(task, '\n\n'.join(sections), {'hits': []}, 'creation', '')
    return {
        'agent_id': AGENT_ID, 'character_id': CHARACTER_ID,
        'persona_id': PERSONA_ID, 'visual_id': VISUAL_ID,
        'day': day, 'guest': guest, 'sources': sources, 'messages': messages,
    }


def generate(root, day, guest, provider=None):
    packet = prepare(root, day, guest)
    public = {key: value for key, value in packet.items() if key != 'messages'}
    try:
        provider = provider if provider is not None else from_env()
        if getattr(provider, 'name', '') == 'mock':
            raise ProviderError('testing_only', 'mock 只可测试通信，不能冒充创作结果')
        reply = provider.complete(packet['messages'])
        if not isinstance(reply, str) or not reply.strip():
            raise ProviderError('empty', '模型返回空稿')
    except ProviderError as exc:
        return dict(public, ok=False, code=exc.code, error=str(exc))
    lines = [line.strip() for line in reply.splitlines() if line.strip()]
    prev = (Path(root) / f'Day{day-1}/Day{day-1}配音台词.txt').read_text(encoding='utf-8').splitlines()
    errors, notes = check(lines, prev, guest)
    if any(line.startswith(('#', '```', '- ')) for line in lines):
        errors.append('创作输出不是逐行纯口播')
    # 结构合格仍是候选，不把模型输出自动写回台词，更不自动发布。
    return dict(
        public, ok=not errors, code='candidate' if not errors else 'draft_invalid',
        reply='\n'.join(lines), errors=errors, notes=notes,
        review_required=True, written=False,
    )


def main(argv=None):
    parser = argparse.ArgumentParser(description='大肥鱼角色 / 魔丸人格的剧情创作')
    parser.add_argument('--day', type=int, required=True)
    parser.add_argument('--guest', required=True, choices=GUESTS)
    parser.add_argument('--prepare-only', action='store_true', help='仅组装可审查请求包，不调用模型')
    args = parser.parse_args(argv)
    try:
        result = (dict(prepare(ROOT, args.day, args.guest), ok=True, code='prepared', generated=False)
                  if args.prepare_only else generate(ROOT, args.day, args.guest))
    except (OSError, ValueError) as exc:
        result = dict(ok=False, code='input', error=str(exc))
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result['ok'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
