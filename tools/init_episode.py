#!/usr/bin/env python3
"""新集脚手架：一键初始化 DayN/ 与 tools/dayN制作/（仅允许尚不存在的集数）。

生成后流程见 tools/engine/README.md：
  填台词 -> gate script -> 导入配音生成实测轴 -> 填 episode.spec.mjs
  -> render_dayN.mjs 出干声母版 -> mix_episode_bgm.py 出 BGM 成片
  -> export_vertical.mjs 出竖屏版 -> gate final。
"""
import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

SPEC_TEMPLATE = """// Day{day}《{title}》声明式单集配置（通用引擎驱动，勿手写渲染循环）
// 视觉姿态与接触校准分层，先写导演表。默认固定镜头、轻待机可关闭；填好前禁止生产渲染。
const actorA = {{
  pose: 'point', // 按台词规划显式动作，不强塞0.8秒换姿势
  x: 430, y: 600, u: 40, idleMotion: 0,
}};
const actorB = {{
  pose: 'confident_hips',
  x: 830, y: 600, u: 38, idleMotion: 0,
}};

export default {{
  day: {day}, directorVersion: 1, status: 'planning', measured: false,
  sourceScriptSha256: '填入当前TXT的SHA256，改字后必须重排',
  title: '{title}',
  speaker: '本鲸',
  opener: {{
    badge: '先看这里',
    headlinePrefix: '把本集冲突写成大白话，',
    headlineHighlight: '亮出笑点！',
    actorA, actorB,
    rolePlates: ['本鲸 · 当事人', '笨鱼 · 对手戏'],
    foregroundProps: [],
  }},
  verticalTitle: ['把本集冲突写成大白话，', '亮出笑点！'],
  shots: [
    {{
      id: 'C01', fromLine: 1, toLine: 1, framing: 'two_shot', mood: 'work_cool',
      direction: {{
        kind: 'staging', focus: '待填主视觉', entry: '待填入镜', action: '待填可见事件',
        trigger: '待填词点', wordLine: 1, wordChar: '填',
        result: '待填结果', resultLine: 1, resultChar: '填', settleSeconds: 0.3, holdSeconds: 0.75,
        reaction: '待填反应', exit: '待填出镜', transition: '待填下镜衔接',
        continuity: {{ in: '待填', out: '待填' }},
      }},
      actors: [actorA, actorB],
      interactions: [],
      companionProps: [], // 按本集语义选道具，不复制无关碗/名牌
    }},
  ],
}};
"""

PROXY_TEMPLATE = """// Day{day} 薄封装入口：仅绑定当集 spec，透传其余全部 CLI 参数给通用引擎。
import {{ spawnSync }} from 'node:child_process';
import path from 'node:path';
import {{ fileURLToPath }} from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const engine = path.resolve(here, '../engine/render_episode.mjs');
const spec = path.join(here, 'episode.spec.mjs');
const r = spawnSync('node', [engine, '--spec', spec, ...process.argv.slice(2)], {{ stdio: 'inherit' }});
process.exit(r.status ?? 1);
"""

SCRIPT_TEMPLATE = "（待填。先读 agent.md 文首覆盖条。结构、客人数、语气与数字写法自由；事实与数字仍须可回溯。）\n"
COPY_TEMPLATE = """# Day{day} 文案：{title}

先读 `agent.md`。不读不写。

锁定口播、事实和不能改的字，以 `agent.md` 为准。
2026-11-09 起三拍顺序 / 一天一客 / 逐字接上集原句 / 零句尾语气词 / 零阿拉伯数字五项门禁已删除。

## 这一集

待填。从上一集留下的具体缺口起戏，让主角抓漏洞、追问、动手纠正，把工作向前推一步。
"""


def main(argv=None):
    ap = argparse.ArgumentParser(description='初始化新一集目录骨架')
    ap.add_argument('--day', type=int, required=True)
    ap.add_argument('--title', required=True)
    args = ap.parse_args(argv)
    if args.day < 1:
        raise SystemExit('day 必须为正整数')
    # 2026-11-09：标题含阿拉伯数字不再被拒（零阿拉伯数字门禁已删除）。
    day_dir = ROOT / f'Day{args.day}'
    make_dir = ROOT / 'tools' / f'day{args.day}制作'
    if day_dir.exists() or make_dir.exists():
        raise SystemExit(f'Day{args.day} 已存在，拒绝覆盖历史内容')
    (day_dir / '配音').mkdir(parents=True)
    (day_dir / '成片').mkdir(parents=True)
    (day_dir / '字幕').mkdir(parents=True)
    make_dir.mkdir(parents=True)
    (day_dir / f'Day{args.day}配音台词.txt').write_text(SCRIPT_TEMPLATE, encoding='utf-8')
    (day_dir / f'Day{args.day}文案.md').write_text(
        COPY_TEMPLATE.format(day=args.day, title=args.title), encoding='utf-8')
    (make_dir / 'episode.spec.mjs').write_text(
        SPEC_TEMPLATE.format(day=args.day, title=args.title), encoding='utf-8')
    (make_dir / f'render_day{args.day}.mjs').write_text(
        PROXY_TEMPLATE.format(day=args.day), encoding='utf-8')
    config = {
        'script': f'Day{args.day}/Day{args.day}配音台词.txt',
        'voice': f'Day{args.day}/配音/Day{args.day}配音.wav',
        'alignment': f'tools/day{args.day}制作/voice_alignment.json',
        'subs': f'tools/day{args.day}制作/subtitle_timing.json',
        'renderer': f'tools/day{args.day}制作/render_day{args.day}.mjs',
        'video': f'Day{args.day}/成片/Day{args.day}_配音对齐版.mp4',
        'tests': ['tools/engine/engine.test.mjs', 'tools/engine/director.test.mjs'],
        'rate': 3.35, 'seconds': 60, 'event_cue': 'L01',
        'use_unified_engine': True,
        'note': '通用引擎新集：干声母版过 verify_episode，BGM 成片另由 mix_episode_bgm.py 验收，竖屏版为渠道附加交付物。',
    }
    (make_dir / 'gate_config.json').write_text(
        json.dumps(config, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'已初始化 Day{args.day}《{args.title}》：')
    print(f'  {day_dir}/（配音台词模板、配音/、成片/、字幕/）')
    print(f'  {make_dir}/（episode.spec.mjs、render_day{args.day}.mjs、gate_config.json）')
    print('下一步：先读 agent.md，再填台词 -> python3 tools/gate.py '
          f'--day {args.day} --stage script（详见 tools/engine/README.md）')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
