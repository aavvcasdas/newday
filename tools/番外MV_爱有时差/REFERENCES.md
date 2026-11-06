# 参考与边界

## 用户给定参考片

- 根目录 `《把回忆拼好给你》.mp4`，sha256 `fa26fc78c5459fae6300e986c73a4fe56eb25de51b2db827257d757202989248`。
- 音轨直接 copy；歌词采用用户本轮给出的 16 行文本；参考片烧录字幕用于测量歌词 tile onset。
- 不构成对歌曲/原 MV 的官方授权声明；交付标注非官方同人、AI 生成、剧情演绎。
- v4 对照原片每秒抽帧（`.cache/v4-review/reference-*.jpg`）补齐：拼图墙/缺口、雨中拼图地球、相遇点亮、眼睛→海、四格回忆、雨站长椅伞、云开光束、快乐入罐/灰色入箱、屋顶情话纸条、烟花、拍立得一刹那、拼图漩涡、昼夜双钟时差、丝带放手、夕照心形、全员终帧 hold。

## 角色形象来源（v4 全 Q 版）

1. `tqlearning/ai-girl-chatgpt-pets` @ `3afe14603b40e24c75e87e097cbfee1bfc10290d`
   - 素材：deepseek-whale / gpt-dragon 透明图集（8×11，192×208；idle/running-right/running-left/waving/jumping/failed/waiting/running/review＋16 look）。
   - 使用：鲸鱼娘/GPT 真逐帧；整格不裁切，公共脚底，按 pet.json 毫秒；v4 不用 jumping。
   - 边界：美术无开放授权，MIT 仅文档/json；形象归 ZipZipPipe；非商用同人＋署名。`licenses/pets-*`。
2. `shuaizenge/ai-girls` @ `dcd69f5f4f2dff1a9c0031e82deb49e0fe949c76`
   - 素材：claude/gemini/kimi/qwen/glm chibi 截帧（静态纸偶），豆包 generated 全身 Day12 cutout。
   - 边界：截帧非原始 Q 立绘；DeepSeek CC BY-NC-SA 4.0 链，其他开放分享声明；豆包版权字节。豆包 Q 为本片像素保真仿射派生，非上游 chibi。`licenses/ai-girls-NOTICE.md`。
3. `JAdpp/dsh-whale-galgame` @ `0ec130efebf15ffb63a2733b909d423b769db9c5`（v3 历史；v4 退出正片）
   - CC BY-NC-SA 4.0，署名链 上善→ZipZipPipe→Small-tailqwq。`licenses/CC-BY-NC-SA-4.0.txt`。
4. `xiaosia/voxel-mv` @ `0caefec6c40ddca779ed498629069ac51dcb00a5`（v2/v3 历史；v4 退出正片）
   - characters/ 帧图未逐项确权；历史记录非商用同人＋署名，不声明可商用。

## GitHub 方法参考

1. `Win-Hao/music-mv` @ `0088b142`（MIT）
   - 流程：analyze_song/learn-style → 画风 → 角色 → 剧本分镜 → 草图试剪 → 全片 → contact_sheet/video_rhythm review。
   - diorama：纸片白边 6–10px＋刀口线＋纸厚 2–3px；6–8 层互投影；远景/前景景深模糊；暖光左上；12fps 手摆 1–2px；慢推 1→1.05；一屏一个强调色；禁深色霓虹/紫渐变/整屏文字。
   - 本工具自有 Canvas2D 实现；未复制代码/素材。`licenses/music-mv-MIT.txt`。
   - 环境限制：本轮 video_rhythm.py 需 ffprobe（imageio_ffmpeg 仅 ffmpeg）未跑通；analyze_song 需 librosa/soundfile 未装。改用既有 `data/audio_features.json` onsets＋OCR 歌词锚点＋原片抽帧目检；不冒称节拍自动对齐 ground truth。
2. `Nyankomintsu/world-execute-me-lyric-mv` @ `93ac6377`（MIT）：纯函数帧、关键词、hard cut/fade、storyboard/contact/luma 方法。
3. `JohnHeibel/PDoomVideo` @ `fa546a38`：历史方法参考；v4 废弃整身 bounce（用户否定）；未复制代码/素材。

## 项目内来源

- 纸艺舞台 `src/paper.js` / `src/film.js` 自有实现；`src/engine.js` 为 v3 历史 Three 舞台，v4 不再调用。
- 字幕组件 `tools/字幕/day2_style_sub.mjs`；字体项目既有恢复件。
