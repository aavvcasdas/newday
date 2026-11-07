# 《我怀疑大禹治水治没了我的薪水》独立MV

## 当前版本：Remotion 重做（待审）

用户否决上一版固定房间、人物与背景没有实际联系，以及没有使用 Remotion。现改为 [Remotion动态分镜待审版](样片/Remotion_动态分镜_待审.mp4)，[重做导演表](分镜/Remotion重做导演表.md)；旧视频保留作历史。以 Remotion 4.0.436 和 React/SVG 程序绘制八个不同布景，不生成任何新图片，角色沿用旧图集。参考 paint-mv-skills 的逐句事件、场景分层和动作转场，以及 music-mv 的多场景和角色叙事，未使用其外部引擎源码，也未声称 p5.brush 或 HyperFrames 渲染。

闸门控制点与指向手势做了空间安排，龙女旧推石图集随山移动，纸船与纸鹤同行，纸人举牌走位、梨打开变信封；这些是复用图集和程序道具的组合，**没有逐帧校准抓握、推山或递接**，不能称真实接触动画。渲染前做了八个时点预检图，后调整了山和龙女的位置；未对修改后整片做连续动态观影或人耳听审。人物姿势间是切换，不是重新生成的完整骨骼动作。

输出媒体信息显示 1920×1080、30fps、29.33秒、HE-AACv2，编码元数据为 Remotion 4.0.436；原文件音轨以 `-c copy` 封入，未改速。SHA256 `00a4fe4e3fe214389bbd1fdcf8e680c6e802506dbc75ef5480cc50286cd1e0de`。字幕时间仍为画面字幕抽帧估算，非实测词轴；用户文字的第六句与来源画面不同，音轨实际唱词未听核。没有额外片尾卡；使用权发布前仍需确认。

复现（从仓库根目录，需 Node、GitHub CLI 和安装了 imageio-ffmpeg 的 Python）：

```bash
npm ci --prefix tools/mv_dayu/remotion
# 如仓库缓存中无中文字体，先恢复固定素材
python3 tools/day12制作/restore_sample_assets.py
node tools/mv_dayu/remotion/prepare.mjs
node tools/mv_dayu/remotion/render.mjs
FFMPEG=$(python3 -c "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())")
"$FFMPEG" -y -i tools/mv_dayu/remotion/out/video.mp4 -i 我怀疑大禹治水治没了我的薪水.mp3 -map 0:v:0 -map 1:a:0 -c copy -movflags +faststart 番外MV/我怀疑大禹治水/样片/Remotion_动态分镜_待审.mp4
```

依赖审计：当前锁定依赖 `npm audit --omit=dev` 报7项 high，涉及 Remotion 工具链和其传递依赖；仅作为本地离线渲染工具，不部署为对外服务，后续需升级并复验兼容性。

## 历史：首次生成版本（已被用户否决）

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
