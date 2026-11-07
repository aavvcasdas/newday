# 《我怀疑大禹治水治没了我的薪水》独立MV

- [一次生成的整片（待审）](样片/一次生成_歌词MV_待审.mp4)；[原分镜](分镜/一次成稿_逐镜分镜.md)。不覆盖《把回忆拼好给你》或 Day 正片。
- 根据用户更正，**没有生成图片**：八句所对应的海底工作桌和典故机关全部由 `tools/mv_dayu/render.mjs` 用 Canvas 绘制；复用 `assets/ai-girls/lyric-action-v13/` 既有鲸娘和配角动作图集。新增图片0，计划内剩0，待生成人物0。背景中的纸人以代码绘制手脚动作。
- 程序按 1920×1080、30fps、880帧输出，使用用户文件原速音轨并设置 AAC 流复制；渲染程序与编码进程退出成功。成片 SHA256 `e96c86f281ba9987ec76c29b8d53e2c1f020e9baa43a8e7c90fcff40f984c457`。遵照用户要求，生成前核对音源哈希、字体、图集尺寸和脚本红线；生成后未做逐镜复核、连续播放、人耳听审或二次修改，不能称人工验收或保证一次通过。
- 字幕使用用户提供的原文，时点沿用源画面整秒字幕抽样的规划值（`measured=false`，非词级ASR）。第六句用户文字「草船丞相抢走了我的对象」与源画面「曹冲称象／称走了我的对象」不同；未做人耳听核，声音实际词句及尾句完整性尚不确定。画面里纸船呼应用户文字，不声称它与音轨逐字一致。
- 本实现是旧动作图集加代码场景；动作有局部动作和镜头内姿态硬切，纸船、梨、信封等是程序道具，未校准人物真实抓握、递接或完整行走，不声称这些动作已经完成。短促末句不延长音轨、不加片尾卡。发布前核实歌曲和角色素材权利。

## 复现

```bash
npm ci --prefix tools/engine
# 从 tools/day12制作/sample_assets.json 固定的 git blob 恢复 video-fx/assets/fonts/NotoSansSC-Bold.ttf
python3 tools/day12制作/restore_sample_assets.py
mkdir -p tools/mv_extra/cache
cp video-fx/assets/fonts/NotoSansSC-Bold.ttf tools/mv_extra/cache/NotoSansSC-Bold.ttf
# 安装 imageio-ffmpeg 后
FFMPEG=$(python3 -c 'import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())') node --expose-gc tools/mv_dayu/render.mjs
```
