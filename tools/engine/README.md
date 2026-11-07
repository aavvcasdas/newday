# 通用动态分镜与双向交互引擎 (`tools/engine/`)

先读根目录 `agent.md` 与 `AGENTS.md`。本目录是 **Day 正传系列** 与 **番外歌词 MV** 共享的底层纯函数时间轴、骨骼动作、多舞台场景与双向世界交互引擎，同时驱动 **2D Canvas 渲染后端** (`render_episode.mjs`) 与 **通用动态 Remotion 渲染引擎** (`tools/remotion-engine/`)。

旧 Day0–Day10 独立 renderer 保持历史归档不改；本轮只做底层重构与契约升级，不批量重渲既有成片。

## 核心架构模块（参考 `paint-mv-skills` 与 `music-mv` 重构）

| 模块 | 职责 |
|---|---|
| `timeline_core.mjs` | 纯 `t` 确定性数学底座（`hash`/`noise1d`/`wob`，严禁 `Math.random()`）、`backOut`/`elasticOut`/`springDamper`/`anticipationEnvelope` 预备过冲回弹曲线、`kf()` 多关键帧插值、`resolveMood()` 情绪平滑过渡、`createBeatGrid()` BPM 节拍脉冲、`resolveTransitionState()` 动机转场与 `auditTimelineActivity()` 反 PPT 静态检测 |
| `character_motion.mjs` | 统一角色运动与手部正向运动学求解器：完整打通 18 套 `RIG_ACTIONS`（新增 `walk_natural`/`stroll_calm`/`step_back`/`sit_settle`）+ 28 套 `LEGACY_ACTIONS`（含语义别名）+ 17 种 `MOVE_STYLE_NAMES` + **8 位角色 23 套双骨骼连续三角网格蒙皮步态/同体待机/长椅坐姿图集（`locomotion` 声明式预设）**；站立待机锁死水平脚底不打滑（`dx === 0`），行走结束自动无跳变切回 100% 同体 `*_pet` 待机；提供世界空间 `handAt(actor, 'left'\|'right')` 手部挂点 |
| `day_episode.template.spec.mjs` | **Day 正传系列通用单集模板**（`directorVersion: 1`）：开箱即用演示本鲸、豆包与 AI Girls 嘉宾的 `locomotion` 双骨骼蒙皮步态入场、同体待机、`step_back` 受惊退半步、`sit_bench` 收工落座、`heldProp` 交接与 `stageTriggers`，同时通过 Canvas 2D 与 Remotion 双后端验证 |
| `../场景/stage_sets_core.mjs` & `stage_sets.mjs` | 告别单一死板海底墙背景：内置 12 套超宽视差舞台（`1800×920` 世界坐标，支持 `underwater_study`、`porthole_observatory`、`screening_desk`、`corridor_hatch`、`pantry_hearth`、`abyss_metaphor`、`split_stage`、`river_gate`、`terracotta_courtyard`、`mountain_pass`、`rain_street`、`sunset_ridge`），支持 `defineStageSet()` 自定义扩展与 `autoStageProgression` 自动跨镜换景，`sea_stage.mjs` 12 项像素回归测试完整保留 |
| `../互动元素/world_interactions.mjs` | 人物 ↔ 背景 ↔ 道具双向空间交互总线：角色走过门区自动推门漏光、脚步触地激起水波涟漪/尘土、跳跃高度衰减地面阴影、舞台光源实时投射角色边缘受光（`rimLight`）、`stageTriggers` 场景机关（开门/开闸/拍桌震动/敲窗涟漪/钉板贴条/点灯/晨昏推进）、以及基于 `handAt()` 的手持道具跟随、抛放到桌面（`placeToAnchor`）与双人弧线交接（`transfer`） |
| `../互动元素/actor_contacts.mjs` | 升级至 10 骨骼网格蒙皮（`spine`/`head`/`armL`/`armR`/`legL`/`legR`/`hairL`/`hairR`/`tail`），面部椭圆区域刚性锁死 `head` 守护五官不拉伸变形，0.005 rad 量化精灵缓存消除跳变，姿态切换支持预备弹跳与平滑叠化 |
| `scene_compositor.mjs` | 动态多舞台五层合成器（L0 超宽视差舞台 → L1 体积光锥与后景 → L2 地面接触阴影/涟漪 + 骨骼角色 → L3 前景交互道具/冲击波 → L4 屏幕安全区 HUD 字幕；按全局新规默认零右上角水印，历史旧片保留不动） |
| `performance_v2.mjs` | 固定立绘全身表演层，完整映射仓库已入库 `assets/ai-girls/` 7 位角色抠图（`doubao`/`claude`/`gemini`/`gpt`/`kimi`/`qwen`/`zai`），严禁程序画假眼皮或篡改固定 PNG 五官 |
| `remotion_episode_adapter.mjs` | Day 系列分镜无损转译为通用 Remotion `UniversalComposition` `inputProps`，零硬编码桥接 `tools/remotion-engine/` |
| `render_episode.mjs` | 统一单集入口：支持默认 Canvas+FFmpeg 渲染、`--export-remotion-props <json>` 导出动态 Remotion 输入、以及 `--backend remotion` 直接调用通用 Remotion 引擎渲染 |
| `camera_plan.mjs` / `schema_validator.mjs` / `director_contract.mjs` | 七种景别与单一动机主运镜、多舞台/动作/手持道具/机关触发器强校验、词级时间绑定与连续性契约 |

## 声明式分镜新能力示例

```js
{
  id: 'corridor_handoff',
  fromLine: 4,
  toLine: 6,
  set: 'corridor_hatch',                 // 12 套内置动态舞台之一，或 { id, palette, weather }
  framing: 'two_shot',
  transition: { type: 'door_wipe', duration: 0.45 },
  actors: [
    {
      name: '本鲸',
      locomotion: 'side_walk',           // 自动绑定双骨骼连续蒙皮 whale_walk_side_2leg <-> whale_idle_side_pet
      walk: { from: 320, to: 520, startLine: 4, duration: 1.4, autoFace: true },
      heldProp: {
        propId: 'folded_page',
        hand: 'right',
        transfer: { line: 5, char: '递', toActor: '豆包', toHand: 'left', duration: 0.48 }
      }
    },
    {
      name: '豆包',
      assetId: 'doubao',
      locomotion: 'walk',                // 自动绑定 doubao_walk_side_2leg <-> doubao_idle_side_pet（覆盖全部 8 角色）
      walk: { from: 980, to: 780, startLine: 4, duration: 1.35, autoFace: true }
    }
  ],
  stageTriggers: [
    { kind: 'open_door', line: 4, char: '推', duration: 0.6, to: 0.92 },
    { kind: 'slam_desk', line: 6, char: '拍', intensity: 1.0 }
  ]
}
```

## 环境安装与验证命令

```bash
npm ci --prefix tools/engine
npm ci --prefix tools/remotion-engine

# 运行全部底层引擎 + 场景 + Remotion 桥接单测（60 项）
NODE_PATH=$PWD/tools/engine/node_modules node --test \
  tools/engine/*.test.mjs \
  tools/remotion-engine/*.test.mjs \
  tools/场景/sea_stage.test.mjs

# Day12 分镜结构检查、Python 测试套件与画面红线扫描
node tools/engine/check_storyboard.mjs --spec tools/day12制作/episode.spec.mjs --script Day12/Day12配音台词.txt --report tools/day12制作/storyboard_check.json
python3 -m unittest discover -s tools/tests -v
python3 tools/剧本/画面红线体检.py
python3 tools/gate.py --day 12 --stage script
```

正式成片渲染仍严格执行音频 SHA256、实测词级对齐轴与媒体四道门禁：
- Canvas 后端：`node tools/engine/render_episode.mjs --spec <spec> --voice <wav> --alignment <json> --subtitle-file <json> --out <mp4>`
- Remotion 后端：`node tools/engine/render_episode.mjs --backend remotion --spec <spec> --voice <wav> --alignment <json> --subtitle-file <json> --out <mp4>`
