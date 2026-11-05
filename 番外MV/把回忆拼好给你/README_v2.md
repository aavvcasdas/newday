# 把回忆拼好给你 · v2 动作与场景返工

**v1（410575d）已被用户否决，不再作为合格成片。当前只交付19.8秒连续有声动作试剪，不冒称新版56秒终片完成。**

## 直接看

- **[浏览器审片室](../../tools/mv_extra/review/README.md)**：在仓库根目录运行 `python3 tools/mv_extra/review/serve.py --port 8000`。支持原片同一时段切换、11 镜定位、帧步进/循环、形象分镜查看和本地便签。只挂载下方已有试剪，不是新渲染或全片批准；本轮复验见 `tools/mv_extra/review/media_check.json`。

- [v2_动作与场景_19.8秒有声试剪.mp4](样片/v2_动作与场景_19.8秒有声试剪.mp4)：原音19.033–38.833秒，1920×1080 / 30fps / 594帧。
- [11个实际执行镜头](分镜/v2_动作与场景_试剪分镜.jpg)、[编码后动作相位](分镜/v2_编码动作相位.jpg)。后者来自实际MP4抽帧，不是替代动态看片的“动作通过”证明。
- [当前项目7位形象盘点](分镜/v2_现有形象与透明素材盘点.jpg)：鲸鱼娘、豆包、Claude、Gemini、Qwen、GPT、Kimi。Gemini与Kimi只完成素材准备，未硬塞进本段。
- [全56秒计划＋试剪逐镜执行卡](分镜/v2_动作与场景导演表.md)：每镜含焦点、画面构造、资产、动作、结果、进出关系；明确区分已执行与仅规划。
- [样片字幕](字幕/v2_动作试剪.srt)、[试剪封面](封面/v2_动作试剪封面.jpg)、[标题与简介草稿](v2_标题与简介.md)，均未发布。

## 这次改了什么

|用户指出的问题|本次实际修改|还没有完成的部分|
|---|---|---|
|人物带白色背景|Gemini/Qwen/GPT/Kimi按人工轮廓、保护原脸、GrabCut生成RGBA；整张RGB逐像素不变；暗底目检＋全新进程字节一致复现|没有宣称每根细发边缘都已专业精修|
|主角站桩|原像素腿骨按行进距离出步、首尾停步；原heart抱姿/panic抬手身体；屈膝/起身；原背面视图转身看烟花|客串固定PNG不是已完成骨骼步行，主角还没有无电脑坐姿|
|没有互动/事件|原手掌像素重叠抱持金片；切盒口落入；灰片经槽道落桶；有准备、执行与结果停留|未伪造从抱姿伸手到盒口的完整接触，采用连续性切镜|
|场景没细节|雨棚顶面/厚度/支架/灯、长椅木条与螺栓、排水滴落和积水；远山/城/海/岸栏杆分层；云分开露海；带铰链盖的收纳盒、分流槽和小桶；夜城窗格、灯与水面反射|这是Canvas分层纸片舞台，不是原库Three.js体素引擎，也不声称等价复刻3D样片|
|烟花只是静态图|光迹升空→多组有不同初速度/重力/拖尾的粒子绽放→余烬消退，水面留对应反射|真实观感和音乐细拍仍需实际看听|

主角沿用`video-fx/src/whale_girl_rig_data.js`原runs/调色板，不拿DSH表情包换主演，不加饰品，不改共享引擎。只有头部使用原`whale_girl.js`的合法睁眼缓存来避免raw head白色眼线；**身体/腿/姿态在执行，不是整个人冻结在t=.7**。固定PNG五官、口型、眼睛不变；透明素材用可见底边而非整张图底边落地，避免透明边距导致悬空；情绪交给整体姿态、距离、道具和环境。所有镜内机位固定，不恢复持续推拉、原地大抖或人脸ROI刷动态。

雨棚动作本次是**屈膝、看积水、起身**，不是原片的完整坐姿复刻。现有laptop姿态含不可直接分离的电脑，不能冒充无电脑的长椅坐姿；真正坐下是后续明确缺口。

## 最新16句锁文与时间轴

用户本次重新给出的完整16句保存在`tools/mv_extra/v2/lyrics.txt`，SHA256由`timing.json`、`render_inputs.json`绑定；13项Node测试逐字比对。第二句已锁定“祈愿小世界里不只有挫败”；“我以为就光明起来”“有你在的日子”“快乐全都收集”不擅自润色。**旧页中“用户歌词缺失，无法确认16行”的限制只属于v1历史，不再套到v2。**

只沿用旧时间表的原片显字起止，不沿用旧文字。`v2/timing.json`绑定新稿；仍是约±0.25秒的参考显字轴，不是假称ASR/音素轴或所有演唱细拍已过耳。原56秒音源不换、不加新配音；样片从完整原PCM截取19.8秒并编码AAC-LC，不能把它说成AAC无损stream-copy。完整原AAC不变。

## 本次真实检查（只对新SHA有效）

- 样片SHA256：`e740588297ab4b07f437fd709c4107fbbd4812d6b92c78a8a9acccc9c13d8e2e`；4,363,258字节。
- 13/13 Node：最新16句、594帧连续区间、导演卡、真实运行状态、停步/屈膝/姿态变化、结果停留、透明边距落地锚点、逐镜首中尾、随机访问确定性等。
- 6/6 Python透明素材检查：源RGB原样、保护脸区域不透明、四角透明、非矩形背景、SHA与非生成方法。新进程重复执行四PNG与manifest字节完全一致。
- 实际MP4全解码无错误；音/画均19.8秒；原片对应PCM单声道16kHz相关系数`0.999773`（19.8秒全段）；不代表人耳已听审。
- 样片6句编码字幕OCR **6/6逐字一致**。这不是16句全片OCR；其余10句尚未在v2全片执行。
- 已查看透明图暗底、4倍头缓存姿态图、执行分镜、编码后抱持/烟花帧和动作相位表。**静态目检、自动结构、连续动态、人耳听审分开。未做真人连续看听批准，也未获得用户方向批准。**

报告：`tools/mv_extra/v2/{render_inputs,sample_check,static_review,matte_repro_check}.json`、`node_tests.tap`、`matte_tests.txt`、594帧`performance_trace.json`。不能引用旧`tools/mv_extra/final_check.json`替本次作证。

## 四个参考项目实际怎么用

研究的8份源码/文档身份见`tools/mv_extra/v2/reference_sources.json`（blob SHA1、SHA256、大小）。研究源码不等于完整观看/运行过外库演示。

- `xiaosia/voxel-mv`：读`examples/yuai/project/shots.js`与`kit/engine/camera.js`，借雨巷/舞台的空间分层、环境响应、镜头由事件驱动；未搬体素引擎或歌。
- `lemomo-ai/lemo-opuscar`：读archive-lighttable的film与paper-popup的STYLE，借prepare→行动→结果、分层cutout与行进距离步态。paper-popup不存在demo/film.js，不冒称读过。
- `Nyankomintsu/world-execute-me-lyric-mv`：读shot/plates/cues/STORYBOARD，借单镜焦点、错峰进入、结果停留和字幕空间组织；不照搬其歌/闪光/剪影。
- `shuaizenge/ai-girls`：使用固定版本4张原RGB素材及已有豆包全身衍生，保留来源；四图只加alpha。Claude沿用已有透明读书图。源码可访问不是商用授权。

来源/许可边界沿用`assets/ai-girls/extra-guests/SOURCE.md`、豆包NOTICE和v1来源文件。源片只抽原音、研究镜头，不把它的视频帧放进新版。

## 复现

在仓库根目录，使用Node与Python虚拟环境；不要修改旧Day12/共享渲染源码。

```bash
npm --prefix tools/engine ci
python3 -m venv .venv
.venv/bin/pip install -r tools/mv_extra/v2/requirements.txt
# RapidOCR只装本体，避免它再引入GUI OpenCV；依赖已在上方列全。
.venv/bin/pip install --no-deps rapidocr_onnxruntime==1.4.4
.venv/bin/python tools/mv_extra/setup.py
.venv/bin/python tools/mv_extra/v2/prepare_guests.py
node --test tools/mv_extra/v2/film.test.mjs
.venv/bin/python tools/mv_extra/v2/test_mattes.py
export FFMPEG="$(.venv/bin/python -c 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())')"
node tools/mv_extra/v2/film.mjs stills
node tools/mv_extra/v2/film.mjs sample
# check_sample还需ffprobe，设置FFPROBE到本地可执行文件。
# 若未安装：npm install --prefix tools/mv_extra/cache/probe @ffprobe-installer/ffprobe
# export FFPROBE="$(node -p "require('./tools/mv_extra/cache/probe/node_modules/@ffprobe-installer/ffprobe').path")"
.venv/bin/python tools/mv_extra/v2/check_sample.py
node tools/mv_extra/v2/write_docs.mjs
```

字体、完整源PCM及外库调查文本放忽略的cache，不把大缓存提交。素材恢复脚本仍验证原视频blob和原AAC/PCM；不需要把令牌发到聊天。`film.mjs sample`只渲染已实现试剪；全片命令被明确阻止，避免把未实现的全片计划冒称已执行。

## 下一步边界

等实际看过本段动作/画风方向，再推进开场拼图、星球、相遇、海面、回忆格、时差、放下、爱自己等其余36.2秒，并补无电脑坐姿等不足。旧v1文件只保留为历史，Day12不动。不自动合并、不发布视频。
