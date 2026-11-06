# NOTICE · 角色 Q 版库

## 生图披露（重要）

本库 `generations/` 下的姿势/表情图为 **AI 生成派生美术**，由用户 2026-11-06 明确授权（选项 `gen_new`）后生成，
**不是任何上游仓库的原画**，也不是官方委托或官方授权产物。

- 生成方式：一次一张单姿势，白底全身；以既有角色图作设计基准重绘新姿势。
- 后处理：边界连通 flood-fill 去白底（只改 alpha，不重绘角色 RGB）＋一次性归一化到公共格。
- 打包：`build_pets.mjs` 产出 `spritesheet.png` ＋ `pet.json`，逐姿势记录 sha256。

## 设计基准与署名链

| 角色 | 设计基准 | 边界 |
|---|---|---|
| 本鲸 / whale | `tqlearning/ai-girl-chatgpt-pets` @ `3afe14603b40e24c75e87e097cbfee1bfc10290d` 的 `assets/deepseek-whale` idle 格；角色为 ZipZipPipe 女仆鲸鱼娘二设（B站 4168597），创作链「上善无形原鲸鱼娘 → ZipZipPipe 女仆二设」 | 上游美术**无开放授权**，其 MIT 仅覆盖文档/布局 json。本库生图为粉丝派生，非商用同人使用＋署名，不主张对角色设计的权利 |
| 豆包 / doubao | `shuaizenge/ai-girls` `characters/doubao/generated/doubao-fullbody.jpg` → 本仓库 Day12 cutout → 番外MV v4 像素保真仿射派生 Q | 豆包官方素材版权归字节跳动；本库当前仅静态纸偶引用，未生成新动作 |
| 客串 AI 娘 | `shuaizenge/ai-girls` chibi 截帧（ZipZipPipe《大AI和小AI们》BV1tE9XBbErS） | **尚未生成本库图集**，不得上场充数 |

## 格式参照

`pet.json` 的网格/行状态/每帧毫秒/公共脚底结构参照
[tqlearning/ai-girl-chatgpt-pets](https://github.com/tqlearning/ai-girl-chatgpt-pets) 的 `FORMAT.md`。
这是**结构参照，不是官方协议**；本库 schema 为 `newday-q-pets/pet@1`。未复制上游图集像素进本库图集。

纸艺舞台画法方法参照 [Win-Hao/music-mv](https://github.com/Win-Hao/music-mv)（MIT）的 diorama 配方；
`tools/engine/paper_stage.mjs` 为本仓库自有实现，未复制其代码或素材。

## 使用边界

- 非官方同人 · AI 生成 · 剧情演绎；常驻角标不得去掉。
- 不得冒称官方合作、官方授权、ZipZipPipe 原作或统一商用开放授权。
- 不得据本库改角色身份、换演员或新增饰品设定（`agent.md` 第33条只放开 Q 版动作表情扩展）。
- 任何后续商用/再分发前必须先向上游核实权属。
