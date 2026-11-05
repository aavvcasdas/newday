# Day12 无声四段导演样片

[播放样片](Day12_四段导演样片_无声.mp4) · [逐项机器报告](../../tools/day12制作/sample_check.json)

日期：2026-11-05。**已实际生成并检查MP4，不是分镜文字/占位动图。**
原角色PNG与中文字体来自指定上游的固定提交；无新脸、无临时克隆配音、无旧集音轨冒充。

**音源接收补记**：推送时发现远端新上传 `鲸鱼摇人_克隆配音_最终版.wav`（104.3秒、40000Hz双声道、SHA256见[接收记录](../../tools/day12制作/voice_intake.json)），已正常合并保留原字节。此文件未用于当前无声样片；尚未逐字核验/建立词轴，不因文件名就宣称声线或音画同步已验收。spec里缺音源的pending是本样片生成时快照。

## 看什么

1920×1080，H.264/yuv420p，30fps，1003帧，33.43秒，约1.7MB。
持续标注“无声动作样片/规划节奏/非连续剧情”。这是四段节选，不是删掉中段台词后的整集改稿：

| 样片时间 | 原镜头/台词 | 验证重点 |
|---|---|---|
| 00:00–00:05.90 | C01 / L01–L02 | 本鲸指证→回归反应，笨鱼从画外显式走入，到位后固定；纸有桌面承托 |
| 00:05.90–00:14.97 | C03 / L05–L07 | 问题与错误录取通知先后出现，固定道具特写；不把人硬塞进insert裁头 |
| 00:14.97–00:21.90 | C07 / L17–L18 | 同一张纸、同一落点正面→背面切换，纠偏后继续筛岗位；仅主角入镜 |
| 00:21.90–00:33.43 | C09 / L23–L25 | 拉远一次后锁住；末句表情切换一次并保持，米饭/大饼回扣 |

C07实现的是**连续性前后切镜**，不是手掌把纸翻过来的完整动画。片中对白字幕是当前稿原句，时间仅供无声阅读/动作规划，不是ASR词轴。

## 生成后自检结果

- **逐帧解码1003帧**：无解码报错、无黑帧、非纯色占位；帧数/时长/编码参数一致。
- **镜头**：C01/C03/C07的相机参数逐帧范围均为0；C09由1.12拉至1.02，0.8秒后坐标/缩放不再变化。
- **角色**：idleMotion=0的外层位移/倾斜/挤压为0；笨鱼x从1370连续到810并保持。编码后抽取128组同姿态静止主角脸部ROI作±2px匹配，未检出整像素跳动；显式表情切换/推拉不按“抖动”误杀，环境动效允许存在。
- **字幕/构图**：逐帧无空字幕；输出空间承托桌最下沿612.84（逻辑坐标），字幕安全区615起；主视觉道具与校准脸部矩形无交叠。另抽编码后帧目检中文、角色、承托、裁切与道具状态。
- **动作结果**：C07正反面纸张落点一致，背面结果保留5.7秒；C09末句有一次震惊姿态反应，不循环摇摆。
- **素材/文本**：七项原素材SHA256均一致，台词哈希不变；全片没有音频流，未误接旧声线或合成人声。
- **回归**：Node引擎/导演30项通过；隔离环境补齐依赖后Python44项全部通过，包括此前跳过的5项媒体集成测试。这些媒体单测通过不等于Day12有声正片通过final。

### 首轮抽帧发现后已修复

1. 导演C01前3.2秒被旧opener演员覆盖，显式走位没有按计划执行。改为新导演版本始终使用本镜演员声明，保留旧spec兼容。
2. 道具insert仍放两人，导致头顶裁切。C03改为显式actors=[]的道具特写；非道具镜仍拒绝空演员。
3. 纸漂在角色腹部前、纠偏镜带入画边第二人。增加明确桌面承托，C07只留主体并调整观察中心，前后纸张仍在同一世界坐标。
4. sub=''仍触发默认“先看碗里”。改用空值合并，尊重作者刻意留白，避免无关旧梗。
5. 首轮结尾人物反应偏少。加入末句一次显式姿态切换与保持，不用待机摇摆凑动作。

## 仍未验收

- 指定人声与真实词级同步、原速听音、BGM/SFX；新上传音源已收到但尚未逐字核验/建词轴，当前样片未使用；不另造声线。
- C05拉纸、C08按纸/推纸/圈记完整接触；C07完整手掌翻纸未实现。
- 全九镜整体节奏、视线/口型、完整动态观影与有声final门禁。

结论是**无声规划样片的技术与抽帧检查通过**，不是有声成片制作完成；`status=planning/measured=false/productionReady=false`继续保留。

## 复现

先装引擎，按哈希恢复原资产（需要现有gh认证，不请求/存储令牌）：

```bash
npm ci --prefix tools/engine
python3 tools/day12制作/restore_sample_assets.py
```

使用系统ffmpeg/ffprobe即可；本次Linux x64沙盒通过npm安装二进制，放临时目录而不进Git：

```bash
npm install --prefix /tmp/day12-media --no-audit --no-fund \
  @ffmpeg-installer/linux-x64@4.1.0 @ffprobe-installer/linux-x64@5.2.0
export FFMPEG=/tmp/day12-media/node_modules/@ffmpeg-installer/linux-x64/ffmpeg
export FFPROBE=/tmp/day12-media/node_modules/@ffprobe-installer/linux-x64/ffprobe
export PATH="$(dirname "$FFMPEG"):$(dirname "$FFPROBE"):$PATH"
python3 -m venv .venv
.venv/bin/pip install numpy pillow

node tools/day12制作/render_sample.mjs
.venv/bin/python tools/day12制作/check_sample.py
npm test --prefix tools/engine
.venv/bin/python -m unittest discover -s tools/tests -v
```

`sample_plan.json`独立标注无声规划，不写成voice_alignment；无word级时间/音源哈希。`createPlanningPreview`与正式CLI分离，不修改planning或伪造ready/measured=true。
正式样片、计划、源码/原资产清单与自检报告入库；中间截图/trace和恢复的原媒体缓存按.gitignore排除，按脚本可重建。
