# 通用单集生产引擎

先读 `agent.md`。当前默认是**稳定镜头＋轻呼吸/可关闭待机＋明确语义事件**，不是持续摇相机/摇人物。
旧Day0–Day10独立renderer不改；不为历史片洗绿或重渲。Day12仍是“回归/@豆包/米饭与大饼”25行稿，非山姆护照稿。

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
