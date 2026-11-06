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
| `cast.json` | 角色登记、格几何、状态语义（中文名）、待补清单、同屏上限 |
| `generations/<id>/<pose>.png` | AI 生成的单姿势原图（白底，一图一姿势） |
| `build_pets.mjs` | 去白底 → 归一化 → 打包图集＋`pet.json`＋校验报告 |
| `pets/<id>/spritesheet.png`、`pet.json` | 播放用图集与元数据 |
| `build_report.json` | 最近一次打包结果（帧数/循环状态/sha256） |
| `样例/` | 通用模板结构样例：spec、样例台词、产出（动作目录/分镜/无声样片） |
| `NOTICE.md` | 生图披露、设计基准与署名链、许可边界 |

## 当前进度（诚实口径）

本轮受 **单轮 10 张生图上限** 限制，只完成主角鲸娘 10 张姿势：

- **真多帧循环**：`walk-right` / `walk-left`（`walk_a/b/c/b` 四格步态，左向为镜像）
- **单帧表情/动作**：`point` 指证、`think` 思考、`shock` 震惊、`cry` 委屈、`cheer` 欢呼、`confident_hips` 得意、`bow` 道歉
- `idle` 目前是 `point` 单帧**占位**，已在 `cast.json` 标注，待补真呼吸/眨眼帧后替换

已知偏差（不掩饰）：

- `walk_*` 三帧偏正面小碎步，腿部差异较小，不是强侧面大跨步；下一轮应补更明确的侧向步态。
- `confident_hips` 生图为双手置身前得意，不是严格叉腰；语义按「得意」使用。
- 豆包仍是 Day12 cutout 派生 Q 的**静态纸偶**（`fallbackSprite`），没有图集；客串 AI 娘未生成，**不得上场充数**（加载期报错）。

`cast.json` 的 `pending` 列出了下一轮要补的姿势：鲸娘 `wave_a/b`、`eat`、`typing_a/b`、`sleep`、`idle_a/b`、`handoff`、`peek`；豆包与 6 位客串的基础动作表情。

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
3. 在 `cast.json` 的 `states` 里登记：中文语义、帧序列、每帧毫秒、`loop`、`kind`（cycle/gesture/expression/hold）；多帧动作按顺序列 `frames`。
4. `node build_pets.mjs --check` 重新打包。
5. 出动作目录目检；分镜里才允许引用这个状态名。

未登记/未生成的状态会被 `paper_contract` 拒绝，不会被静默当成已有动作。

## 门禁边界

结构检查、图集校验、全片解码都**不等于**视觉/听审验收。
无指定音源只能出无声结构样片；不得把估时轴当正式字幕依据，不得变速或改台词凑时长。
