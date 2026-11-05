# 参考与边界

## 用户给定参考片

- 根目录 `《把回忆拼好给你》.mp4`，sha256 `fa26fc78c5459fae6300e986c73a4fe56eb25de51b2db827257d757202989248`。
- 本片音轨直接 copy 该文件；歌词采用用户本轮给出的 16 行文本。参考片烧录字幕用于测量歌词 tile  onset。
- 这不构成对歌曲/原 MV 的官方授权声明；交付标注为非官方同人、AI 生成、剧情演绎。

## GitHub 方法参考

1. `xiaosia/voxel-mv`（检查提交 `0caefec6`）
   - 参考点：微缩体素场景、角色立牌比例、哑光材质、暖主光/淡紫环境、柔影移轴、低 fov 透视。
   - 许可边界：其自有代码为 PolyForm Noncommercial 1.0.0，技能文档 CC BY-NC-SA 4.0；角色/歌词/音乐权属未确认。本工具不复制其代码、角色帧或不明授权资产，只参考公开方法。
2. `Nyankomintsu/world-execute-me-lyric-mv`（检查提交 `93ac6377`）
   - 参考点：确定性时间函数、逐帧导出到 ffmpeg、聊天消息窗/关键词/代码 motif 的歌词视觉化。
   - 许可边界：软件 MIT，剪影 CC BY-NC-SA；不含歌曲歌词。本工具不复制其剪影资产。

## 项目内来源

- 角色立牌来源：`video-fx/src/cast.js`、`clawd.js`、`whale_girl.js` 及 rig/actions；豆包沿用 `assets/ai-girls/doubao/doubao-cutout.png`。
- 字幕组件：`tools/字幕/day2_style_sub.mjs`（2026-10-27 用户既定默认样式）。
- 字体：项目既有 `video-fx/assets/fonts/` 恢复件；不新增不明授权字体。
