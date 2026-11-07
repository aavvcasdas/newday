# 《我怀疑大禹治水治没了我的薪水》独立MV

## 当前版本：通用动态 Remotion 引擎重做版（待审）

针对用户要求「重做《我怀疑大禹治水》mv」以及此前指出的「背景和人物无交互、背景写死、人物不动、未用动态 Remotion 架构」四项问题，现已在重构后的通用动态 Remotion 引擎（`tools/remotion-engine/` + `tools/场景/stage_sets_core.mjs` + `tools/互动元素/world_interactions.mjs`）之上，通过声明式分镜配置 [`tools/mv_dayu/mv.spec.mjs`](../../tools/mv_dayu/mv.spec.mjs) 重新生成：

- **最新待审样片**：[`样片/Remotion_动态引擎重做_待审.mp4`](样片/Remotion_动态引擎重做_待审.mp4)（历史样片 [`Remotion_动态分镜_待审.mp4`](样片/Remotion_动态分镜_待审.mp4) 与 [`一次生成_歌词MV_待审.mp4`](样片/一次生成_歌词MV_待审.mp4) 完整保留未覆盖）
- **配套分镜表**：[`分镜/Remotion重做导演表.md`](分镜/Remotion重做导演表.md)、[`分镜/一次成稿_逐镜分镜.md`](分镜/一次成稿_逐镜分镜.md)

### 本次重做核心改动与实测参数

1. **真正数据驱动的多舞台动态切换（8 镜 8 景，零硬编码 JSX 镜头组件）**：
   - 全片由 `tools/mv_dayu/mv.spec.mjs` 驱动通用 `UniversalComposition.jsx`，依次切换 `STAGE_SETS` 注册表中的 8 座多深度视差舞台：`river_gate`（江河水闸）→ `seaside_deck`（晴海周日木栈）→ `mountain_pass`（群山峡口）→ `terracotta_courtyard`（陶土工坊）→ `screening_desk`（砖墙夜读室）→ `misty_pier`（烟波芦苇渡口）→ `pear_orchard`（飘花梨园办公台）→ `twilight_street`（暮色三迁暖灯街巷）。
   - **新生图 0 张**：背景 100% 程序化多层 SVG 绘制，人物全部复用 `assets/ai-girls/lyric-action-v13/` 既有 16 帧（`6144×416`）动作图集。
2. **连续角色运动 + 16 帧动作图集平滑转态**：
   - `evaluateCharacterMotion` 与 `RiggedCharacter.jsx` 原生支持 16 帧图集循环播放、关键帧走位（`track`）、律动（`move`）、切换瞬间的预备挤压回弹（`anticipation -> pop`）与双图集透明交叉淡化（`atlasBlend`），消除旧版固定坐标上的 1 帧硬切；同时具备脚底高度衰减阴影、水面/地面脚步涟漪与近光背光暖晕。
3. **8 句神话机制 ↔ 职场反转双向交互**：
   - 拉杆升闸泄洪冲走工资信封、金箭钉穿画架吹飞「周日」日历页并令骄阳沉海转入暮色、龙女推走整座靠山打开峡口金光并弹出小靠垫、工坊开门跑出关节泥纸小人举空白牌被挥手拨散、砖墙凿孔射出体积金光锥将罐中金圆币吸进墙洞、草船驶过木栈带走成对折纸千纸鹤中的一只、大金梨桌面弹开化为空白信封被推回、三栋屋舍视差滚过并在暖灯长椅与热茶白汽旁收尾。
   - **诚实边界说明**：上述推山、拉杆、递梨与纸鹤登船均通过既有角色动作图集走位与程序化 SVG 世界机关在时空上对齐编排实现，并非重新逐帧手绘骨骼抓握或物理碰撞解算；声学反转时点对齐了源音频 50ms RMS 能量包络的换气谷值与重音峰值，但未做人工逐句耳听校审；第六句保留用户指定字幕原文「草船丞相 / 抢走了我的对象」，画面以草船与成对纸鹤呼应。
4. **成片媒体核验与画面规范**：
   - 分辨率 `1920×1080`、帧率 `30fps`、视频总帧数 `880` 帧、精确时长 `29.333333s`（H.264 `yuvj420p` + 源媒体 `我怀疑大禹治水治没了我的薪水.mp3` 的 `44100 Hz` 立体声 AAC 音轨 `-c:a copy` 无损直拷封入，共 `635` 个音频包，未改速、无片尾卡）。
   - 文件大小 `10,126,339` 字节，SHA256：`79c880ea1fffcad24a6c3fb12ec5f8c280c939fa0078645881c269d79f8896d8`。
   - 右上角全程常驻 `非官方同人 / AI生成`，道具与背景零阿拉伯数字，渲染前完成 8 镜静帧抽检修正，成片抽帧 16 张接触表复核通过，`auditRemotionPropsActivity` 全片静态幻灯片区间为 `0`。发布前仍需确认歌曲与角色素材相关权利。

### 一键复现命令（仓库根目录）

```bash
npm ci --prefix tools/engine
npm ci --prefix tools/remotion-engine
# 若本地工作区尚未恢复固定中文字体 NotoSansSC-Bold.ttf：
python3 tools/day12制作/restore_sample_assets.py

# 1. 静态活动度与多场景校验（无需启动浏览器）
NODE_PATH=$PWD/tools/engine/node_modules node tools/mv_dayu/remotion/render.mjs --dry-run

# 2. 完整渲染 880 帧 1080p 视频并无损混流原音频（使用 @remotion/compositor 内置 ffmpeg，无需外部安装）
NODE_PATH=$PWD/tools/engine/node_modules node tools/mv_dayu/remotion/render.mjs
```

---

## 历史版本记录

### 历史版本 2：早期硬编码 Remotion 版（`Remotion_动态分镜_待审.mp4`）
- 文件：[`样片/Remotion_动态分镜_待审.mp4`](样片/Remotion_动态分镜_待审.mp4)（`1920×1080`、`30fps`、`29.333333s`、SHA256 `00a4fe4e3fe214389bbd1fdcf8e680c6e802506dbc75ef5480cc50286cd1e0de`）。
- 局限：当时将 `Shot1`..`Shot8` 直接写死在 `tools/mv_dayu/remotion/video.jsx` 单文件内，人物坐标固定且在反转点使用三元表达式 1 帧硬切图集，未接入通用多舞台与双向交互总线。

### 历史版本 1：首次 Canvas 生成版（`一次生成_歌词MV_待审.mp4`，已被用户否决）
- 文件：[`样片/一次生成_歌词MV_待审.mp4`](样片/一次生成_歌词MV_待审.mp4)（SHA256 `e96c86f281ba9987ec76c29b8d53e2c1f020e9baa43a8e7c90fcff40f984c457`）。
- 局限：锁死单一海底工作桌背景、人物与背景缺乏交互、未使用 Remotion 动态引擎。
