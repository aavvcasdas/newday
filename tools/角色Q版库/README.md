# 角色 Q 版库（Day13+ 通用）

日更系列 **Day12 以后** 的统一 Q 版角色 / 动作 / 表情库。画面与动作口径见 `agent.md` 第 33 条。

- 画面：纸艺立体书（`tools/engine/paper_stage.mjs`）
- 动作：pets 自描述格式真逐帧（`tools/engine/pets_actor.mjs`）
- **同屏最多 2 人**（`tools/engine/paper_contract.mjs` 硬门禁）

历史 Day0–Day12 的分镜、锁稿与成片不改不重渲。

## 为什么是 pets 格式

参照 [tqlearning/ai-girl-chatgpt-pets](https://github.com/tqlearning/ai-girl-chatgpt-pets) 的自描述结构：
一张 `spritesheet.png` ＋ 一份 `pet.json`（网格、行状态、每帧毫秒、公共脚底）。
**这是结构参照，不是官方协议**；本库的 `schema` 为 `newday-q-pets/pet@1`。

沿用上游 FORMAT.md 的硬规则：

- 整格绘制，行内未使用格保持全透明；
- **不逐帧 autocrop / recenter / stretch**；归一化只在打包期做一次；
- 公共 `foot_y`，切换状态不跳位；
- 禁止整图 bounce/hop/sway 冒充动画。

## 目录

| 路径 | 内容 |
|---|---|
| `cast.json` | 角色登记、格几何、状态语义（中文名）、朝向规则、弃用姿势、待补清单、同屏上限 |
| `generations/<id>/<pose>.png` | AI 生成的单姿势原图（白底，一图一姿势） |
| `build_pets.mjs` | 去白底 → 归一化 → 打包图集＋`pet.json`＋校验报告 |
| `pets/<id>/spritesheet.png`、`pet.json` | 播放用图集与元数据 |
| `build_report.json` | 最近一次打包结果（帧数/循环状态/sha256） |
| `样例/` | 通用模板结构样例：spec、样例台词、产出（动作目录/分镜/无声样片） |
| `NOTICE.md` | 生图披露、设计基准与署名链、许可边界 |

## 当前进度（诚实口径）

主角鲸娘已完成 **26 张姿势 / 21 个状态**（三轮生图，每轮 10 张上限）：

- **真多帧循环**：`idle` 慢呼吸＋眨眼（2 帧）、`walk-right` / `walk-left`（**4 帧强侧面步态**，左向镜像派生）、
  `wave` 打招呼（4 帧）、`typing` 打字（2 帧）
- **单帧表情/动作**：`point` 指证、`think` 思考、`shock` 震惊、`cry` 委屈、`cheer` 欢呼、
  `confident_hips` 得意、`bow` 道歉合十、`eat` 吃饭、`sleep` 打瞌睡、`handoff` 递拼图、`peek` 探看
- **本轮新增（细节动作）**：`look_up` 仰望惊叹、`point_up` 指向上方、`bend` 俯身伸手取物、
  `back` 背影（无脸，用于并肩看烟花/远景）、`sit` 屈膝欠身

### 朝向硬规则（本轮修复）

`cast.json` 的 `generation.facingRule`：**`walk-*` 的源姿势一律画成朝右**，朝左只能由打包器 `mirror: true` 派生。
上一轮 `walk_a/b/c` 画成偏正面/朝左却登记为 `walk-right`，导致角色**倒着走**；
现已换成明确朝右的 `stride_a/b/c/d`，旧 3 张移入 `deprecatedPoses`（文件留档，不再注册进图集）。

门禁在 `tools/engine/paper_contract.mjs`：走位方向与步态朝向（含 flip 异或）不一致直接抛错；
MV 侧 `data.test.mjs` 另有 3 条回归测试。

打包期归一化（`build_report.json` 可核查）：

- **全角色共用一套缩放**，以 `referencePose: idle_a` 定标（`sharedScale` 0.184971）；多帧动作之间不会忽大忽小。
- 水平锚点＝可见 bbox 中心。实测 26 姿势：bbox 中心 **0 次边缘钳制**；
  脚底重心锚点会在步态与 sleep 上钳制 4 次并推移身体，故按实测不采用。
- 整格写入，播放期不再逐帧裁切/居中/拉伸。
- 图集 sha256 `0bd72d614fe12393af8225a67ef502af0410eb3455ca16d0b8833d11ce2993c8` / 970774 B / 21 行。

已知偏差（不掩饰）：

- **`sleep` 上一轮画出重复双腿（多余肢体），本轮已重画**为侧坐、明确只有一对腿脚；后续坐/蹲姿生图 prompt 必须显式约束肢体数量。
- **`sit` 不是真坐姿**：生图实为屈膝欠身站姿（大腿未水平）。已如实登记，**故意不用于任何镜头**，不得当长椅坐姿使用。
- **`bend` 不是深蹲**：实为前倾俯身伸手，只能用作取物前的接近动作。
- `confident_hips` 生图为双手置身前得意，不是严格叉腰；语义按「得意」使用。
- `bow` 实为闭眼合十小鞠躬，不是深鞠躬。
- 豆包仍是 Day12 cutout 派生 Q 的**静态纸偶**（`fallbackSprite`），没有图集；
  6 位客串 AI 娘未生成图集，**不得上场充数**（加载期报错）。

鲸娘 `pending` 已清空；豆包与 6 位客串的基础动作表情仍列在 `cast.json` 的 `pending` 里，待后续轮次补。

## 用法

```bash
# 1) 打包图集（去白底/归一化/写 pet.json），并校验同屏上限
node tools/角色Q版库/build_pets.mjs --check

# 2) 出动作目录 + 分镜 + 无声结构样片（planning，measured=false）
node tools/engine/render_paper_episode.mjs \
  --spec tools/角色Q版库/样例/paper.demo.spec.mjs \
  --script tools/角色Q版库/样例/demo_script.txt \
  --catalog tools/角色Q版库/样例/产出/动作目录.png \
  --storyboard tools/角色Q版库/样例/产出/分镜 \
  --silent-planning --out tools/角色Q版库/样例/产出/纸艺Q版_无声结构样片.mp4

# 3) 契约与播放回归
node --test tools/engine/paper_contract.test.mjs
```

新集直接用脚手架（N≥13 自动产出纸艺 spec＋分镜模板）：

```bash
python3 tools/init_episode.py --day 13 --title '本集标题'
```

## 加新动作/表情的流程

1. 用生图工具画**一张一姿势**，白底、全身、居中、留边；以该角色已有姿势图作设计基准，保持同一套服装/配色/比例。
2. 存 `generations/<id>/<pose>.png`。
3. 在 `cast.json` 的 `states` 里登记：中文语义、帧序列、每帧毫秒、`loop`、`kind`（cycle/gesture/expression/hold）；多帧动作按顺序列 `frames`。**步态源姿势必须朝右**，左向用 `mirror: true`。生图若语义与命名不符（如 sit/bend），必须在 `note` 里写实际画到什么，不得夸大。
4. `node build_pets.mjs --check` 重新打包。
5. 出动作目录目检；分镜里才允许引用这个状态名。

未登记/未生成的状态会被 `paper_contract` 拒绝，不会被静默当成已有动作。

**消费方必须同步**：MV 等下游把图集复制进自己的 `assets/`，重打包后必须重跑 `npm run assets`。
本轮实际踩到——MV manifest 落后一个版本（16 vs 21 状态），`look_up`/`bend`/`back` 被 `|| animations.idle`
静默兜底成站桩，看上去就像"没做动作"。现已删掉该兜底改为抛错，并加 sha/行号/帧数一致性测试。

## 门禁边界

结构检查、图集校验、全片解码都**不等于**视觉/听审验收。
无指定音源只能出无声结构样片；不得把估时轴当正式字幕依据，不得变速或改台词凑时长。
