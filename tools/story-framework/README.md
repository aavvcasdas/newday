# Day / MV 通用框架

基于仓库 `remotion-fix-and-mv-recreation.zip` 的网页方案：three.js 3D 舞台、2D 角色图集、帧驱动镜头与 Remotion 合成。Day 和 MV 共享同一引擎，不调用 `archive/legacy/` 中的旧模板、skill 或渲染工具。

## 快速开始

从仓库根目录，Node 22：

```sh
npm ci --prefix tools/story-framework
npm test --prefix tools/story-framework
npm run typecheck --prefix tools/story-framework
# Day / MV 模板：纯规划示例，未配音
node tools/story-framework/render.mjs --entry tools/story-framework/templates/day.entry.tsx --still 45 --out /tmp/day.png
node tools/story-framework/render.mjs --entry tools/story-framework/templates/mv.entry.tsx --still 120 --out /tmp/mv.png
# 渲染自定义项目；音源使用仓库外经授权的本地文件，正偏移将音轨延后
node tools/story-framework/render.mjs --entry tools/story-framework/templates/day.entry.tsx --audio /path/to/voice.wav --offset 0 --out /tmp/day.mp4
# 渲染网页童话镇示例
node tools/story-framework/render.mjs --audio /path/to/authorized-audio.wav --frames 400-430 --out /tmp/tonghuazhen-sample.mp4
```

`--frames start-end` 两端包含；`--still` 输出单帧 PNG；`--browser` 或 `CHROME_EXECUTABLE` 指定 Chromium。Linux 默认自动解包 `@sparticuz/chromium`，采用 `swangle` 软件 WebGL。音频仅通过本地只读单文件服务交给渲染器，不复制至仓库。自行选择输出路径，避免覆盖存档或源素材。

## 通用模板与扩展

复制 `templates/day.spec.ts` / `templates/day.entry.tsx` 或 `templates/mv.spec.ts` / `templates/mv.entry.tsx`，按歌曲或剧本重新填写标题、时长、镜头、演员、3D 位置、相机和字幕区间，再在 `--entry` 指向新的入口。两个模板均使用 `StorySpec`、`validateStory`、`buildStoryShots` 和 `createMVComp`：Day 默认关闭歌词染色和节拍推镜，MV 默认启用。默认舞台提供村庄、森林或空地，以及人物正面/行走与固定机位；需要独特舞台、具体动作、道具和运镜时实现自己的 `ShotDef.build(Kit)`，以帧号确定画面，参考网页的 `src/shotsA.ts` / `src/shotsB.ts`。角色图集、文字/字体加载后绘制首帧才解除渲染等待；缺素材、无效参数或错误的镜头会报错。

模板固定 1920×1080、30 fps；当前演员步态与引擎依赖 30 fps。`timing: 'planning'` 表示时间为规划，`measured` 仅是制作者的声明，框架不会自动验证它。**没有自动人声识别、音频测拍、逐词对齐、自动剧本、口型、复杂接触或逐镜动态审查**；必须针对真实音源建立并验证字幕时间，再由人工全片看听。BPM 是手工值，网格仅供动作使用，不代表真实节拍。

## 来源及边界

`src/entry.tsx` 是 ZIP 网页《童话镇》示例；它本身只有歌曲前 31 句、2:22.4，时间来自原页面的估算/字幕，不代表整首歌或已逐句听审。ZIP 缺图集 PNG，已从本仓库原始索引精灵重建；`npm run atlas --prefix tools/story-framework` 可按网页 JSON 清单重建。字体为项目原有 ZCOOL 字库。资产权利和授权应另行核实。

旧工程目录、旧 skill 和规则已移入 `archive/legacy/`；旧成片/试片已从当前分支删除，标题和发布文案留存。新架构的短片和静帧测试不能替代真人审片，亦不代表旧 Day 成片已迁移或所有网页诊断点已逐项修复。
