# 通用 MV 框架（网页 three.js + Remotion）

本目录是 MV **唯一现行渲染入口**。以仓库中的 `remotion-fix-and-mv-recreation.zip` 网页代码为基础，分离可复用的三维舞台、角色纸片、相机与 Remotion 合成器，原网页的《童话镇》40 镜和 31 条时间点保留为示例。Day 正传继续使用 `tools/remotion-engine` 的 episode 模式，不因此迁移或修复 Day 引擎。

## 安装、验证、渲染

在仓库根目录（Node 22）：

```sh
npm ci --prefix tools/mv-framework
npm test --prefix tools/mv-framework
npm run typecheck --prefix tools/mv-framework
# 不配音单帧；输出必须是仓库外或未被忽略的指定位置
node tools/mv-framework/render.mjs --still 450 --out /tmp/mv-frame.png
# 指定音源，可直接读取仓库参考 MP4 的音轨；默认偏移为 0 秒
node tools/mv-framework/render.mjs --audio 童话镇.mp4 --out /tmp/tonghuazhen.mp4
# 先渲染 0 到 90 帧（两端都包含）；指定音轨偏移，正数表示延后
node tools/mv-framework/render.mjs --audio 童话镇.mp4 --offset 0 --frames 0-90 --out /tmp/sample.mp4
# 独立的另一首歌/镜头接入示例，不复用童话镇的时间轴或镜头
node tools/mv-framework/render.mjs --entry tools/mv-framework/src/demo-entry.tsx --still 90 --out /tmp/demo.png
```

`--browser <path>` 可指定 Chromium，Linux 默认使用 `@sparticuz/chromium` 和软件 WebGL；`--id` 指定 Composition，默认 `MV`。也可用 `CHROME_EXECUTABLE` 指定浏览器。只给 Remotion 提供单个本地音频文件的只读 HTTP 地址。`--frames` 可做短片段测试；完整渲染可能耗时很长。最终输出由调用方自行指定、审看和归档，不会自动覆盖旧成片。

## 新歌曲如何接入

参照 `src/demo-entry.tsx`，提供各自的 `ShotDef[]`（`build(Kit)` 返回按帧更新的函数与相机状态）、镜头起点、歌词起止、BPM、歌名及片长；用 `createTimeline` 和 `createMVComp(shotMap)` 注册 Remotion Composition。`Kit`、`actors.ts`、`kit.ts` 是网页的共用三维舞台/纸片能力，`shotsA.ts`、`shotsB.ts`、`sets.ts`、`tonghuazhen.ts` 是童话镇示例，不是其他歌曲的默认剧情。镜头调用不得以累积状态推进，否则随机跳帧/并发会错。时间轴、歌词数量、镜头注册、节拍及帧率在渲染时校验，素材/渲染错误取消渲染而不是生成错误画面。

当前帧率固定 **30fps**，演员步态也按 30fps 量化；配置不同帧率会拒绝。不同歌曲必须自行制作与审看分镜、动作、选角及歌词时间轴；这不是自动根据歌曲生成分镜的工具。框架中的 BPM 网格是配置值，童话镇示例是按歌词间隔**估算**的，并非检测到的音乐节拍。`--offset` 是音轨相对视频的整体偏移；它不会重新识别歌词或逐词校准。网页只覆盖歌曲前 142.4 秒；示例按原样结束，不能冒称整首歌曲或已听审对拍。

## 图集与资源

ZIP 未携带 `cast_atlas.png`；`src/assets/cast_atlas.json` 是 ZIP 的矩形清单，`sprites_data.js` 与 `walk_cycle_data.js` 是原仓库素材数据的副本（所有 108 项尺寸匹配）。`npm run atlas --prefix tools/mv-framework` 可重新烘焙 PNG；打包时等待图集和中文字体加载并在首帧画完后才解除 Remotion 等待。角色贴图缺失会报错。字体来自原 `番外MV/童话镇-paper-popup/fonts/`，字体及人物资产的原有来源与授权约束仍适用。

## 历史边界

按用户确认，历史 MV 工程的渲染源码已移除；其成片、素材、歌词、时间轴数据、检查记录和文档保留。历史文档中的旧构建命令不再可执行，也不能作为新框架已验证的证据。Day13/Day14 专用组件和 `tools/engine` / `tools/remotion-engine` 的 Day 共用部分保留。网页中的旧引擎诊断是静态分析，不代表 Day 共用引擎的九项问题均已修复。新框架当前不提供网页交互式播放器、点拍工具或自动音频对齐，需用源码/时间轴编辑后渲染。
