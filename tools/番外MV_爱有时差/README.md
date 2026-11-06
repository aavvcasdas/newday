# 番外 MV · 把回忆拼好给你（爱有时差）

非官方同人 / AI 生成 / 剧情演绎。独立歌词番外制作工具；不覆盖 Day 连载、不恢复历史已删除的旧番外产物。

## 交付物

- `../../番外MV/成片/把回忆拼好给你_AI娘全员番外.mp4`：1920×1080、24fps、1346 帧、约 56.083s；音轨直接 copy 用户提供的参考片，不改速、不变调、不重唱。
- `../../番外MV/歌词.srt`：16 行用户歌词，L08 按画面拆成两个短分句。
- `../../番外MV/角色图鉴.png`、`分镜总览.png`、`海报.png`、`分镜/S01..S16_*.png`、`制作说明.md`。
- `../../番外MV/验收报告.json`：`verify.py` 生成的机器技术验收，不等于人工审看。

## 角色口径（v6，2026-11-06）

8 位 AI 娘（含当前鲸鱼娘），**无项目配角**。**全 Q 版**；用户指出 v3“人在跳很奇怪”，v4 废弃整图 bounce/hop/sway，改为分层纸艺立体书＋真逐帧宠物动画：

- **鲸鱼娘**：v5 改用本仓库 `tools/角色Q版库/pets/whale` 的 **21 状态 Q 版真帧图集**（AI 生成派生，用户授权 `gen_new`；192×208 格、公共脚底、按 `pet.json` 毫秒）。真多帧循环 `idle`(呼吸眨眼)/`walk-right`/`walk-left`/`wave`/`typing`，另有 point/think/shock/cry/cheer/confident_hips/bow/eat/sleep/handoff/peek，以及 v6 新增 look_up/point_up/bend/back/sit（`sit` 实为屈膝欠身、**未使用**）。步态源姿势明确朝右，左向由打包器镜像派生。该图集**无 16 向 look 行**，分镜不得对鲸娘用 `look`。上游 pets 图集保留为 `petUpstream`，来源与许可记录不丢。
  **重打包角色库后必须 `npm run assets`**：图集是复制进本目录 `assets/` 的，manifest 落后会让新状态被兜底成 idle（v6 已删兜底改抛错，并加 sha/行号/帧数一致性测试）。
- **GPT**：沿用 `tqlearning/ai-girl-chatgpt-pets` 上游图集（9 状态＋16 方向），按 `pet.json` 毫秒整格播放，不用 jumping 冒充动态。
- **Claude / Gemini / Kimi / Qwen / Z.AI**：`shuaizenge/ai-girls` Q版 chibi 截帧抠图，作为**静态纸偶**；动态来自镜头、道具、光与事件，不整图跳。
- **豆包**：上游无 Q 版，沿用 Day12 cutout 做**像素保真分段仿射重排**派生 Q（头×1.25、躯干×0.9/0.62、腿×0.82/0.5，重叠接缝）；正常比例 cutout 归档为 `doubao_normal.png`。文档明确这是派生排版，不是上游 chibi。
- **galgame / voxel-mv**：v3 曾用于情感特写/动作镜头；v4 因“全 Q 版”口径退出正片主形象，素材链与许可记录保留在 `fetch_upstream.mjs` / `prepare_assets.mjs` / `licenses/`，不静默丢弃来源记录。

### 同屏人数（v5 硬约束）

用户本轮裁定 `cap2_keep_finale`：**正片每镜同屏最多 2 人，仅终帧 S16 保留全员 hold**。
8 位 AI 娘分散到 S03/S04/S05/S06/S07/S08/S09/S10/S11/S13/S14/S15 各镜，仍全部出场。
`data/shots.json` 的 `castPolicy` 声明上限，`src/film.js` 有**逐帧运行时探针**：
`drawActor` 记录本帧真正画出去的角色，任一正片镜头超过 2 人**直接抛错**，不是只改声明。
全片 1346 帧渲染完成未抛错，即每帧都过了该门禁；`verify.py` 另有 `v5_on_screen_cap_two` 交叉检查。

素材许可与署名链见 `NOTICE.md` / `REFERENCES.md`。pets 美术上游未开放授权（MIT 仅文档/json），按用户指示非商用同人使用＋署名，边界见 `licenses/pets-RIGHTS.md`。

## 运行

```bash
cd tools/番外MV_爱有时差
npm ci
node fetch_upstream.mjs  # 固定提交下载真实角色素材到 assets/upstream/（gitignored，sha 校验）
npm run assets           # chibi 抠图 / pets 图集登记 / 豆包 Q 派生 / 图鉴
npm run dev              # 0.0.0.0:5173 播放器预览
npm run storyboard       # 16 镜分镜 PNG + 总览 + 海报
npm run render           # 全片逐帧渲染并合成原片音轨
npm run smoke            # 播放器 8 镜冒烟（pageerror/console error 收集）
npm test                 # 数据/字幕组件一致性测试
python3 verify.py        # 成片全解码 + 抽帧 + 数据交叉检查
```

渲染依赖：`@sparticuz/chromium` 提供 Chromium；ffmpeg 优先 `FFMPEG_PATH`，否则尝试 `imageio_ffmpeg`。`assets/audio/reference.wav` 是可重建预览缓存，不入库。

## 方法

- 时间轴：参考片烧录歌词 tile 全片 OCR＋ROI 首检，对齐 24fps；不是字级/音素级对齐。
- 画面：`src/paper.js` + `src/film.js` 自有 Canvas2D 分层纸艺立体书。方法参照 `Win-Hao/music-mv`（MIT）diorama 配方：纸片白边/刀口/纸厚阴影、6–8 层互投影与景深模糊、暖光左上、道具 12fps 手摆、慢推 5–7%；每帧由 t 纯函数画出，固定种子。未复制 music-mv 代码/素材。
- 动态：鲸/GPT 真逐帧；其余静态纸偶靠镜头/道具/事件。废弃 PDoom 式整身 bounce（用户否定）。转场仍用短 brush/iris/wipe/flash。
- 字幕：强制 import `tools/字幕/day2_style_sub.mjs`，一屏短分句、不逐字点亮。
- 终帧：S16 全员 framed puzzle hold 到源音频结束，无片尾卡。

见 `REFERENCES.md` 与 `NOTICE.md`。
