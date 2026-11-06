# 参考与边界

## 用户给定参考片

- 根目录 `《把回忆拼好给你》.mp4`，sha256 `fa26fc78c5459fae6300e986c73a4fe56eb25de51b2db827257d757202989248`。
- 本片音轨直接 copy 该文件；歌词采用用户本轮给出的 16 行文本。参考片烧录字幕用于测量歌词 tile onset。
- 这不构成对歌曲/原 MV 的官方授权声明；交付标注为非官方同人、AI 生成、剧情演绎。

## 角色形象来源（v2，用户指定真实素材）

2026-11-06 用户否定 v1 本地像素立牌，要求人物取自三个仓库的真实素材。`fetch_upstream.mjs` 按固定提交下载（git blob sha1 校验，sha256 记于 `data/upstream_manifest.json`），`prepare_assets.mjs` 做脚底对齐/身高校正/表情 union 裁切。8 位 AI 娘、无项目配角：

1. `xiaosia/voxel-mv` @ `0caefec6c40ddca779ed498629069ac51dcb00a5`
   - 素材：deepseek（=鲸鱼娘群像/动作）、claude、gemini、gpt、kimi、qwen、zai 的 `frames/` 动画帧；`身高校正.json` 的 mv_scale 统一眼-脚身高；避开 `bad_frames.json` 标记帧（未使用 gemini.run_side/sleep、qwen.sit_idle）。
   - 方法参考：微缩体素场景、立牌比例、哑光材质、暖主光/淡紫环境、柔影移轴、低 fov 透视、逐帧导出。
   - 许可边界：自有代码 PolyForm-NC-1.0、文档 CC BY-NC-SA；但 `THIRD_PARTY_NOTICES.md` 明确 `characters/` 帧图权属未逐项确认、排除于授权外。本片按用户指示非商用同人使用＋署名，不主张权利、不声明可商用/可自由再分发（详见 NOTICE.md）。
2. `JAdpp/dsh-whale-galgame` @ `0ec130efebf15ffb63a2733b909d423b769db9c5`
   - 素材：鲸鱼娘 8 张高清表情差分（情感特写 S01/S06/S09/S12/S14）。
   - 许可：CC BY-NC-SA 4.0，署名链 上善→ZipZipPipe→Small-tailqwq；裁切/缩放改编按 ShareAlike 同条款共享，非商业。许可全文/署名声明入库件：`licenses/CC-BY-NC-SA-4.0.txt`、`licenses/dsh-deep-whale-NOTICE.txt`。
3. `shuaizenge/ai-girls` @ `dcd69f5f4f2dff1a9c0031e82deb49e0fe949c76`
   - 素材：豆包 `generated/doubao-fullbody.jpg`（沿用 Day12 同上游源抠图）。
   - 许可边界：无统一许可、catalog.json 逐项；豆包官方头像权利归字节跳动；不重绘脸、不做口型/眨眼/假头转，不声明商用开放授权。

## GitHub 方法参考

1. `Nyankomintsu/world-execute-me-lyric-mv`（检查提交 `93ac6377`）
   - 参考点：确定性时间函数、逐帧导出到 ffmpeg、聊天消息窗/关键词/代码 motif 的歌词视觉化。
   - 许可边界：软件 MIT，剪影 CC BY-NC-SA；不含歌曲歌词。本工具不复制其剪影资产、歌词或音频。

## 项目内来源

- 微缩体素舞台 `src/engine.js` 为本工具自有实现（方法参考 voxel-mv，未复制其代码）。
- 字幕组件：`tools/字幕/day2_style_sub.mjs`（2026-10-27 用户既定默认样式）。
- 字体：项目既有 `video-fx/assets/fonts/` 恢复件；不新增不明授权字体。
