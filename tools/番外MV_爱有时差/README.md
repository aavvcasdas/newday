# 番外 MV · 把回忆拼好给你（爱有时差）

非官方同人 / AI 生成 / 剧情演绎。本目录是 2026-11-05 用户重新授权的独立歌词番外制作工具；不覆盖 Day 连载、不恢复历史已删除的旧番外产物。

## 交付物

- `../../番外MV/成片/把回忆拼好给你_AI娘全员番外.mp4`：1920×1080、24fps、1346 帧、约 56.083s；音轨直接 copy 用户提供的参考片，不改速、不变调、不重唱。
- `../../番外MV/歌词.srt`：16 行用户歌词，L08 按画面拆成两个短分句。
- `../../番外MV/角色图鉴.png`、`分镜总览.png`、`海报.png`、`分镜/S01..S16_*.png`。
- `../../番外MV/验收报告.json`：`verify.py` 生成的机器技术验收，不等于人工审看。

## 角色口径（v2，2026-11-06）

8 位 AI 娘（含当前鲸鱼娘），**无项目配角**：DeepSeek 鲸鱼娘、Claude、Gemini、豆包、GPT、Kimi、Qwen、Z.AI。形象全部取自用户指定仓库的真实素材——

- 鲸鱼娘双形象：群像/动作用 `xiaosia/voxel-mv` 的 deepseek 动画帧；情感特写用 `JAdpp/dsh-whale-galgame` 高清表情差分。
- Claude/Gemini/GPT/Kimi/Qwen/Z.AI：`xiaosia/voxel-mv` 对应角色动画帧。
- 豆包：`shuaizenge/ai-girls` 全身图的 Day12 既有抠图。

v1 的本地像素立牌与 6 位项目配角已被用户否定并移除。素材许可与署名链见 `NOTICE.md` / `REFERENCES.md`；galgame 鲸鱼娘表情的 CC BY-NC-SA 4.0 全文与署名声明在 `licenses/`。

## 运行

```bash
cd tools/番外MV_爱有时差
npm ci
node fetch_upstream.mjs  # 按固定提交下载三仓库真实角色素材到 assets/upstream/（gitignored，sha 校验）
npm run assets           # 脚底对齐/身高校正/表情 union 裁切 → MV 立牌与图鉴
npm run dev              # 0.0.0.0:5173 播放器预览
npm run storyboard       # 16 镜分镜 PNG + 总览 + 海报
npm run render           # 全片逐帧渲染并合成原片音轨
npm test                 # 数据/字幕组件一致性测试
python3 verify.py        # 成片全解码 + 抽帧 + 数据交叉检查
```

渲染依赖：`@sparticuz/chromium` 提供 Chromium；ffmpeg 优先 `FFMPEG_PATH`，否则尝试 `imageio_ffmpeg`（可用 `/home/user/.cache/mv-venv/bin/python`）。`assets/audio/reference.wav` 是可重建预览缓存，不入库。

## 方法

- 时间轴：对参考片烧录歌词 tile 做全片 OCR 扫描＋ROI 首检，对齐到 24fps；不是字级/音素级对齐。Vosk 小模型对歌声不可用，未作为 cue 来源。
- 画面：自有 Three.js 微缩体素舞台＋项目角色立牌；确定性时间函数逐镜合成。导出时浏览器只回读 960×540 场景，Node 用共享字幕组件和矢量关键词合成 1080p，再送 ffmpeg。
- 字幕：强制 import `tools/字幕/day2_style_sub.mjs`，一屏短分句、不逐字点亮。
- 终帧：全员留在场景内 hold 到源音频结束，不加独立片尾卡。

见 `REFERENCES.md` 与 `NOTICE.md`。
