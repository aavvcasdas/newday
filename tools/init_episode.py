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

PAPER_SPEC_TEMPLATE = """// Day{day}《{title}》纸艺 Q 版单集配置（Day13+ 通用模板）
// 先读 agent.md 第 33 条与 tools/角色Q版库/README.md。
// 硬约束：同屏最多 2 人；动作只用 pets 图集里真实存在的状态；禁止整图 bounce/hop/sway。
// 填好台词 SHA、逐镜构造字段前禁止生产渲染；无实测轴只能 planning + 无声结构样片。
import fs from 'node:fs';
import {{ createHash }} from 'node:crypto';

const script = fs.readFileSync(new URL('../../Day{day}/Day{day}配音台词.txt', import.meta.url), 'utf8');
const sourceScriptSha256 = createHash('sha256').update(script).digest('hex');

// 角色库：tools/角色Q版库/cast.json；可用状态见 pets/<id>/pet.json
// 未生成图集的角色不得上场充数（客串先补 generations/ 再 build_pets）。
const lead = (states, extra = {{}}) => ({{
  id: 'whale', x: 620, y: 920, h: 400, states, ...extra,
}});
const dir = (o) => ({{
  kind: 'prop', settleSeconds: 0.1, holdSeconds: 0.4,
  trigger: '待填词点触发', reaction: '待填反应', exit: '待填出镜',
  transition: '待填下镜衔接', continuity: {{ in: '待填', out: '待填' }}, ...o,
}});

export default {{
  day: {day}, paperVersion: 1, status: 'planning', measured: false,
  title: '{title}', speaker: '本鲸', maxOnScreen: 2,
  sourceScriptSha256,
  estimatedRate: 3.35,   // 含气口历史规划参考，不是实测保证
  tailSeconds: 0.24,
  shots: [
    {{
      id: 'C01', fromLine: 1, toLine: 1, framing: 'wide', set: 'sea_room',
      direction: dir({{
        kind: 'staging', focus: '待填第一视觉', entry: '待填入镜',
        action: '待填可见事件（真帧动作/走位/道具）', result: '待填结果',
        wordLine: 1, wordChar: '填', holdSeconds: 0.75,
      }}),
      // 同屏最多 2 人；要第三人就拆镜，不许缩小塞满画面
      actors: [lead([{{ state: 'walk-right', dur: 1.2 }}, {{ state: 'idle' }}], {{
        walk: {{ from: 320, to: 620, dur: 1.2 }},
      }})],
      props: [{{ kind: 'desk', x: 640, y: 720, w: 660 }}],
    }},
  ],
}};
"""

PAPER_PROXY_TEMPLATE = """// Day{day} 薄封装：纸艺 Q 版通用渲染器（Day13+），透传全部 CLI 参数。
import {{ spawnSync }} from 'node:child_process';
import path from 'node:path';
import {{ fileURLToPath }} from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const engine = path.resolve(here, '../engine/render_paper_episode.mjs');
const spec = path.join(here, 'episode.spec.mjs');
const r = spawnSync('node', [engine, '--spec', spec, ...process.argv.slice(2)], {{ stdio: 'inherit' }});
process.exit(r.status ?? 1);
"""

STORYBOARD_TEMPLATE = """# Day{day}《{title}》分镜 · 纸艺 Q 版（Day13+ 模板）

先读 `agent.md` 第 33 条、`tools/角色Q版库/README.md`、`tools/engine/README.md`。
本文件是导演表，不是验收证明。改台词后必须重算 SHA 并重排本表。

## 本集口径

- 画面：纸艺立体书（纸边/刀口/纸厚、分层视差、暖光左上、道具 12fps 手摆、慢推 ≤7%）。
- 人物：全 Q 版，动作来自 `tools/角色Q版库/pets/<id>/pet.json` 真帧状态。
- **同屏最多 2 人**。需要第三人时拆镜或让角色退场，不得缩小硬塞。
- 禁止整图 bounce/hop/sway、`idleMotion`、`livingBody`、`bodyEvents` 冒充动画。
- 有走位必须配 `walk-*` 真步态，禁止平移滑行。

## 估时（measured=false，配音响定后以实测轴重排）

| 项 | 值 |
|---|---|
| 口播字数（不含标点） | 待填 |
| 假设语速 | 3.35 字/秒（含气口历史参考） |
| 预计净口播 | 待填 |
| 预计总时长区间 | 待填 |

## 音画双栏

| 镜号 | 行范围 | 景别 | 场景 | 同屏人物（≤2） | 口播 | 第一视觉 | 准备→动作→结果→反应 | 道具/落点 | 停留 |
|---|---|---|---|---|---|---|---|---|---|
| C01 | L01 | wide | sea_room | 本鲸 | 待填 | 待填 | 待填 | 待填 | 0.5s |

## 逐镜构造卡

### C01
- 对应台词与来源：待填（估时/实测）
- 第一视觉：待填
- 景别/构图/前中后景：待填
- 人物站位与朝向、入镜状态：待填
- 准备 → 动作 → 结果 → 反应：待填
- 使用的 pets 状态序列：待填（须真实存在）
- 道具接触与落点：待填
- 出镜状态与下一镜接法：待填

## 出件与检查

```bash
node tools/角色Q版库/build_pets.mjs --check
node tools/day{day}制作/render_day{day}.mjs --script Day{day}/Day{day}配音台词.txt \\
  --catalog tools/day{day}制作/动作目录.png --storyboard tools/day{day}制作/分镜
python3 tools/gate.py --day {day} --stage script
```

无指定音源时只能出无声结构样片（`--silent-planning`），画面自带 `measured=false` 标识；
不得把估时轴当正式字幕依据，不得为凑时长变速或改台词。
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

SCRIPT_TEMPLATE = "（待填。先读 agent.md。开头说找新朋友来帮忙，再写求职梗，再接上一集留在桌上的事。）\n"
COPY_TEMPLATE = """# Day{day} 文案：{title}

先读 `agent.md`。不读不写。

以后每一集都从这一句开始。锁定口播、事实和不能改的字，以 `agent.md` 为准。

## 这一集

待填。三拍：开头说找新朋友来帮忙，再写听得懂的求职梗，再接上一集留在桌上的事。
"""


def main(argv=None):
    ap = argparse.ArgumentParser(description='初始化新一集目录骨架')
    ap.add_argument('--day', type=int, required=True)
    ap.add_argument('--title', required=True)
    args = ap.parse_args(argv)
    if args.day < 1:
        raise SystemExit('day 必须为正整数')
    if any(ch.isdigit() for ch in args.title):
        raise SystemExit('标题不得含阿拉伯数字（画面/口播红线）')
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
    # Day13 起走纸艺 Q 版 pets 模板；Day12 及以前保留旧模板，历史集不改不重渲。
    paper = args.day >= 13
    (make_dir / 'episode.spec.mjs').write_text(
        (PAPER_SPEC_TEMPLATE if paper else SPEC_TEMPLATE).format(day=args.day, title=args.title),
        encoding='utf-8')
    (make_dir / f'render_day{args.day}.mjs').write_text(
        (PAPER_PROXY_TEMPLATE if paper else PROXY_TEMPLATE).format(day=args.day), encoding='utf-8')
    if paper:
        (day_dir / f'Day{args.day}分镜_纸艺Q版.md').write_text(
            STORYBOARD_TEMPLATE.format(day=args.day, title=args.title), encoding='utf-8')
    config = {
        'script': f'Day{args.day}/Day{args.day}配音台词.txt',
        'voice': f'Day{args.day}/配音/Day{args.day}配音.wav',
        'alignment': f'tools/day{args.day}制作/voice_alignment.json',
        'subs': f'tools/day{args.day}制作/subtitle_timing.json',
        'renderer': f'tools/day{args.day}制作/render_day{args.day}.mjs',
        'video': f'Day{args.day}/成片/Day{args.day}_配音对齐版.mp4',
        'tests': (['tools/engine/paper_contract.test.mjs'] if paper
                  else ['tools/engine/engine.test.mjs', 'tools/engine/director.test.mjs']),
        'rate': 3.35, 'seconds': 60, 'event_cue': 'L01',
        'use_unified_engine': True,
        'note': ('纸艺 Q 版新集（Day13+）：同屏最多 2 人，动作只用 pets 真帧状态；'
                 '先 build_pets --check 出动作目录与分镜，再有实测轴才出有声片。'
                 if paper else
                 '通用引擎新集：干声母版过 verify_episode，BGM 成片另由 mix_episode_bgm.py 验收，竖屏版为渠道附加交付物。'),
    }
    if paper:
        config['paperVersion'] = 1
        config['maxOnScreen'] = 2
        config['castLibrary'] = 'tools/角色Q版库/cast.json'
        config['storyboard'] = f'Day{args.day}/Day{args.day}分镜_纸艺Q版.md'
    (make_dir / 'gate_config.json').write_text(
        json.dumps(config, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'已初始化 Day{args.day}《{args.title}》：')
    print(f'  {day_dir}/（配音台词模板、配音/、成片/、字幕/）')
    print(f'  {make_dir}/（episode.spec.mjs、render_day{args.day}.mjs、gate_config.json）')
    if paper:
        print(f'  {day_dir}/Day{args.day}分镜_纸艺Q版.md（纸艺 Q 版导演表模板）')
        print('  口径：纸艺 Q 版 + pets 真帧，同屏最多 2 人（agent.md 第 33 条）')
    print('下一步：先读 agent.md，再填台词 -> python3 tools/gate.py '
          f'--day {args.day} --stage script（详见 tools/engine/README.md）')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
