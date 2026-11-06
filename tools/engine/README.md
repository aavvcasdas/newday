# 通用单集生产引擎

先读 `agent.md`。当前默认是**稳定镜头＋轻呼吸/可关闭待机＋明确语义事件**，不是持续摇相机/摇人物。
旧Day0–Day10独立renderer不改；不为历史片洗绿或重渲。Day12仍是“回归/@豆包/米饭与大饼”25行稿，非山姆护照稿。

> **Day13 起改走纸艺 Q 版引擎**（`agent.md` 第33条）：新集用 `render_paper_episode.mjs` ＋ `paperVersion:1` spec，
> 人物全 Q 版 pets 真帧、**同屏最多 2 人**。本文件其余章节描述的旧引擎与 Day0–Day12 历史集保持不变、不重渲。
> 见下方「Day13+ 纸艺 Q 版引擎」。

## 当前实现

| 模块 | 职责 |
|---|---|
| `camera_plan.mjs` | 七种景别、固定默认、最多一次显式push（推/拉/平移）；小数坐标、不取整、不叠正弦；完成后锁终点 |
| `render_episode.mjs` | Canvas逐帧绘制、ffmpeg编码；不使用zoompan。已删两层慢晃；开场也不自动三段推拉。待机不再每0.2秒重置全身骨骼，显式走位保留连续步态 |
| `schema_validator.mjs` | 注册姿态、接触资格、道具边界、单一主运镜、覆盖、词点和当前台词哈希校验 |
| `director_contract.mjs` | directorVersion=1逐镜字段/事件/连续性/结果停留；允许稳定反应镜和道具特写，不为密度硬塞无关接触 |
| `check_storyboard.mjs` | 仅规划结构检查；不造时间轴。输出measured=false/productionReady=false、缺失素材和阻塞项 |
| `actor_contacts.mjs`（在互动元素） | 视觉姿态与接触校准分开；只加载本集需要的素材；缺图报错，不换脸、不回退假图 |
| `room_base.mjs / scene_compositor.mjs` | 海底空间、原生1920×1080/30fps、逻辑1280×720；字幕/角标在固定屏幕坐标 |
| `prop_registry.mjs / interaction_stage.mjs` | 已注册道具及现有交互实现，不把计划中的翻纸/按纸说成已完成动画 |
| `opener_director.mjs` | 仍提供横幅/铭牌/印章等；其旧openerCamera仅供历史显式调用，不是当前renderer默认相机 |

## 环境与检查

```bash
npm ci --prefix tools/engine
node --test tools/engine/*.test.mjs
node tools/engine/check_storyboard.mjs --spec tools/day12制作/episode.spec.mjs --script Day12/Day12配音台词.txt --report tools/day12制作/storyboard_check.json
python3 -m unittest discover -s tools/tests -v
python3 tools/gate.py --day 12 --stage script
```

`@napi-rs/canvas`版本和锁文件在本目录，`node_modules`不入库。脚本门禁发现Day12+有spec时会追加导演结构检查并记录spec哈希；需要先装依赖。
这些检查不要求音源/位图，但**不代表**媒体门禁、动态观影或手掌素材校准通过。合成图只用于单测接口，不当角色素材或交付预览。

## 稳定镜头与待机

```js
{
  framing: 'medium_left', // wide / two_shot / medium_left/right / close_left/right / insert_center
  camera: { cx: 470 },    // 可选，覆盖固定预设；不是另一层运动
  push: { line: 3, duration: 0.6, z: 1.4 }, // 可选，一次运动，按实际cue绑定起点，结束后保持
  actors: [{ pose: 'think', x: 470, y: 600, idleMotion: 0 }]
}
```

- 不写push就是固定。旧`pushes`最多一项兼容，不得与push并存，禁止多次主运镜叠加。
- `livingBody`默认dx=0，dy不超过±1.2逻辑像素、lean不超过±0.008、squash不超过±0.08；`idleMotion:0`全部为零。
- `lifeAnim`待机返回空骨骼，不按离散节拍抖头/身体/头发/尾巴；`plan.anim`显式动画不被覆盖，walk仍会移动角色并驱动步态。
- 相机移动与呼吸不算剧情事件，不能用“半秒必须位移两像素”来验收人物表演。

## 姿态、动作、接触不是一回事

- `tools/day3制作/whale_girl_src/whale_poses.mjs`登记41种既有视觉姿态。新引擎可加载注册图作视觉表演，但当前轻量工作区未同步位图；要真正渲染必须恢复原获准素材，不能随意生图。
- 手/头/指尖接触仍只允许 `CALIBRATION` 的8种姿态：idle/point/shock/confident_hips/think/eat/playful_fists/fatfish_working。
- 使用未校准视觉姿态参与drop_bonk/slap_deflect/tug_grab/knock_bowl/unroll_scroll/handoff会在校验期失败；姿态时间线也检查，不只看起始姿态。
- `video-fx`与`legacy_actions.mjs`的28个旧语义动作是另一套执行系统。**本轮没有把28动作全部接入**；向统一spec写`actor.action`会明确拒绝，不静默冒充已支持。更多姿态不是更多接触能力。

## 导演规范与九镜入口

新spec显式写 `directorVersion:1`。先写音画双栏，再写direction：focus/entry/action/trigger/wordLine/wordChar/result/resultLine/resultChar/settleSeconds/holdSeconds/reaction/exit/transition/continuity.in,out。
每镜有可见事件（调度/道具/反应/接触），连续镜头景别、中心、人物排列不能全部相同。接触类必须有interactions；道具类要有显式入场/交互。文字字段不是视觉合格证明。
普通结果留至少0.35秒，末镜至少0.6秒；Day12规划0.4/0.75秒。正式绑定词级时间后才验证实际驻留，缺词时不把句首回退伪装成实测。停留可在句内完成，不擅改音源或0.24秒既有尾部口径。

当前导演Skill：`.claude/skills/day-series-director/SKILL.md`。
当前实例：`Day12/Day12分镜_导演版.md`、`tools/day12制作/episode.spec.mjs`。
当前spec为`status=planning/measured=false`，生产renderer会拒绝planning。C05拉纸、C07翻纸、C08按纸/推纸/圈记仍待素材/接触或连续性切镜审核；不是全片已实现。
旧无directorVersion的spec保留旧密度检查以免静默放宽历史记录；旧文件没有被批量改写，但使用修复后的统一renderer会采用稳定的默认相机。

## 后续制作（本轮未执行）

1. 指定音源到位：原文件不改，记录SHA256；ASR词级时间＋RMS、字幕对齐，不用SRT/字数伪造词轴。
2. 依据真实词时重排动作/停留；校准所需姿态与手掌/纸边接触。完成资产/接触审核与实测绑定前不移除planning；审核后须显式status=ready、measured=true，renderer仍核验实际输入而不只相信标志。
3. 优先C01开场、C03错误、C07纠偏、C09结尾四段有声试剪，抽接触前/当/后与反应/停留结束帧并看连续动作。
4. 方向确认后推广整集；全片解码/原速音轨/字幕/遮挡与四阶段门禁；BGM按既有混音流程另验。

正式命令仍为 `node tools/engine/render_episode.mjs --spec <spec> --voice <wav> --alignment <实测json> --subtitle-file <实测字幕json> --out <mp4>`。
没有上述输入时，输出导演计划和阻塞清单，不给假成片，不自动导出9:16，不自动发布平台内容。

## 已实际生成的无声规划样片

用户要求先看样片时，使用独立 `createPlanningPreview`，仅接受planning/measured=false且不含音源SHA/伪词级轴的输入；正式CLI的ready/指定音源/实测门禁不放宽。
实际实例与复现见 `Day12/样片/README.md`：33.43秒四段节选、1080p/30fps，全1003帧解码、自检与编码后抽帧；不是有声全片。

本轮样片实检补充：directorVersion=1开场演员不再被旧opener覆盖；显式道具特写可actors=[]，其他镜头仍不可空演员；可声明foregroundTable承托（y+58<=600），并做输出空间安全区检查。道具stateChanges按line+delay或at作明确状态切换，C07同落点正反切镜，不伪称手掌翻纸。folded_page显式空sub不再回填默认旧梗。
本轮Node回归30项、Python44项（含编码集成测试）通过；不代表有声final通过。


## Day13+ 纸艺 Q 版引擎

用户 2026-11-06 拍板：日更系列 **Day12 以后** 的分镜与人物统一改成纸艺 Q 版，动作参照
`tqlearning/ai-girl-chatgpt-pets`，并且 **同屏最多 2 人**（人物太多占画面）。历史集不改不重渲。

| 模块 | 职责 |
|---|---|
| `paper_stage.mjs` | 纸艺立体书画法：纸边/刀口/纸厚投影、分层视差、暖光、道具 12fps 手摆、海底书桌/岸/夕照场景与桌/碗/纸/名牌/植物道具 |
| `pets_actor.mjs` | pets 格式图集播放：累计毫秒选帧、非循环停末帧、公共脚底整格绘制；缺图集角色只能静态纸偶，客串未生成则报错 |
| `paper_contract.mjs` | 硬门禁：`MAX_ON_SCREEN=2`、状态必须真实存在、走位必须配 `walk-*` 步态、拒绝 `idleMotion/livingBody/bodyEvents` 与 bounce/hop/sway、逐镜构造字段、相邻镜对比 |
| `render_paper_episode.mjs` | 逐帧渲染＋ffmpeg；`framing` 真的改变构图（wide/two_shot/medium/close/insert）；字幕/角标固定屏幕坐标不随推近缩放 |
| `paper_contract.test.mjs` | 13 项回归：人数上限、选帧、状态序列、图集一致性、未生成状态拒绝、走位步态、样例过契约、Day12 拒绝、景别差异、确定性、**步态朝向 vs 位移方向（倒走拒绝）**、图集朝向登记、sleep 单对腿脚 sha 锁定 |

角色库在 `tools/角色Q版库/`（`cast.json` ＋ `generations/` ＋ `build_pets.mjs` ＋ `pets/<id>/`）。

```bash
node tools/角色Q版库/build_pets.mjs --check
node --test tools/engine/paper_contract.test.mjs

# 新集脚手架：N>=13 自动产出纸艺 spec + 分镜模板 + gate_config
python3 tools/init_episode.py --day 13 --title '本集标题'

# 无音源：只出动作目录/分镜/无声结构样片（画面自带 measured=false）
node tools/day13制作/render_day13.mjs --script Day13/Day13配音台词.txt \
  --catalog tools/day13制作/动作目录.png --storyboard tools/day13制作/分镜 \
  --silent-planning --out Day13/样片/Day13_无声结构样片.mp4

# 有实测轴：spec 须 status=ready，音源 SHA256 必须与实测轴匹配
node tools/day13制作/render_day13.mjs --voice <wav> --alignment <voice_alignment.json> \
  --subtitle-file <subtitle_timing.json> --out Day13/成片/Day13_配音对齐版.mp4
```

spec 关键字段：

```js
{
  day: 13, paperVersion: 1, status: 'planning', measured: false, maxOnScreen: 2,
  sourceScriptSha256: '<当前台词SHA256>',
  shots: [{
    id: 'C01', fromLine: 1, toLine: 2, framing: 'two_shot', set: 'sea_room',
    direction: { kind, focus, entry, action, trigger, wordLine, wordChar,
                 result, reaction, exit, transition, holdSeconds, settleSeconds,
                 continuity: { in, out } },
    actors: [                       // 最多 2 个
      { id: 'whale', x: 620, y: 920, h: 400,
        states: [{ state: 'walk-right', dur: 1.2 }, { state: 'point' }],
        walk: { from: 320, to: 620, dur: 1.2 } },
    ],
    props: [{ kind: 'desk', x: 640, y: 720, w: 660 }],
  }],
}
```

边界：结构检查/图集校验/全片解码都不等于视觉与听审验收；无实测轴不得当正式字幕依据；
BGM 规则（第22条）、Day2 字幕、常驻角标、尾部 0.24s、无片尾卡继续有效。
