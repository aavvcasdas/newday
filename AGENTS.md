# 本仓库创作入口

先读根目录 `agent.md` 的“现行覆盖规则”，其中第29–31条是 Day12 与人格移植的本轮口径，**第33条是 Day13 起纸艺 Q 版＋同屏最多2人的当前口径**。

写/修 Day 连载、求职梗、人设或剧情衔接时，读取 `00_运营总览/skills/剧情生成/SKILL.md` 及其 persona/beats/research 引用。
主角仍是大肥鱼/鲸鱼娘，外形和关系不变，魔丸只是移植人格。不得再写“你不是大肥鱼”。
待审稿不能覆盖已锁定旧集。真实模型创作使用 `tools/agent/create_episode.py`，不能把 mock 或文本结构通过当作人设已生效的证据。

本工作区来源和未同步媒体边界见 `SOURCE_IMPORT.md`。

## 用户交付偏好：每次改完推送

后续每次完成有文件修改的任务，检查后提交并推送到本会话固定分支（当前为 `arena/e9e1d8ec-newday`）：`git push origin arena/e9e1d8ec-newday`，报告实际提交号/链接。不得只改本地却说已经推送；失败要明确报告。用户未要求时不自动合并PR、不发布平台评论或视频。

## 导演与稳定画面

用户提到画面抖动、站桩、镜头重复或重做视频时，先读 `.claude/skills/day-series-director/SKILL.md`。按当前口播写音画双栏/逐镜卡，再更新directorVersion=1的spec；默认固定机位、idleMotion可关闭，不用晃动代替事件。视觉姿态与接触校准分开，不能冒称28个历史动作已全部接入。
Day12当前指定原音源版入口为 `Day12/README.md`、`Day12/Day12有声分镜.md` 与 `tools/day12制作/episode.production.spec.mjs`，实际结果看同目录 `final_check.json`（不可脱离成片SHA引用）。原25行锁稿不改；指定音源未读首句，因此有独立24行视频字幕稿。用真实ASR整词区间绑定、关闭聚光灯、固定机位、独立stem混音验收；不声称音素级对齐、手纸真实接触或真人完整听审。`episode.spec.mjs`及四段无声样片是历史planning方案，不能替代当前有声版验收。

## Day12 v2 当前覆盖口径

用户要求加入`shuaizenge/ai-girls`豆包原有素材、移除全部笨鱼立绘。当前执行方案为`Day12/Day12_v2修复导演表.md`和`episode.production.spec.mjs`的performanceVersion=2；旧固定机位/idleMotion=0是历史，不得重新覆盖本轮已授权的连续微呼吸、单次有动机运镜与转场。固定PNG无口型/眨眼/局部五官/真实头转；已有姿态仅做身体变换＋PNG切换。v2不拿脸ROI运动作“活”指标。技术结果看成片SHA绑定报告；人工动态审看为独立pending，禁止把自动差分/静帧当作真人动态批准。豆包是来源仓库已有生成参考全身，非官方全身原图；本轮只抠除背景，记录来源/NOTICE，不擅自声明商用开放授权。

## 已取消的制作

用户曾要求删除独立歌词番外，不得自动恢复或继续制作。Day12、共享引擎、共用角色素材及用户原始参考视频不受此次删除影响。

## 2026-11-05 独立歌词番外重新授权

用户本轮明确要求重新制作独立歌词番外《把回忆拼好给你·AI娘全员番外》（副题“爱有时差”），该新授权覆盖上一条“已取消独立歌词番外”仅针对本次新番外；不自动恢复整批旧删除产物。入口为 `tools/番外MV_爱有时差/README.md`，交付在 `番外MV/`。所有当前项目 AI 娘必须入场；字幕仍强制 import `tools/字幕/day2_style_sub.mjs`。本会话固定分支为 `arena/e9e1d8ec-newday`，不切历史交付分支。

## 2026-11-06 番外MV v2 角色替换（当前口径）

用户否定 v1 本地像素立牌（“人物没修改啊”），要求人物取自三个仓库真实素材：`shuaizenge/ai-girls`、`JAdpp/dsh-whale-galgame`、`xiaosia/voxel-mv`；MV 方法参照 `Nyankomintsu/world-execute-me-lyric-mv` 与 `xiaosia/voxel-mv`。随后澄清：**不要 6 个项目配角**，做 **8 位 AI 娘总阵容（含当前鲸鱼娘）**：whale/claude/gemini/doubao/gpt/kimi/qwen/zai。鲸鱼娘“两者都用”——群像/动作用 voxel-mv deepseek 帧，情感特写用 galgame 高清表情；豆包用 ai-girls 全身抠图。

执行入口仍是 `tools/番外MV_爱有时差/`：`fetch_upstream.mjs` 按固定提交下载真实素材（git blob sha1 校验，sha256 记 `data/upstream_manifest.json`，素材本体 gitignored），`prepare_assets.mjs` 做脚底对齐/身高校正/表情 union 裁切。`data/cast.json` aiGirlCount=8、supportingCount=0；`data/shots.json` directorVersion=2 用 perform 字段驱动 voxel 帧动画与鲸鱼娘 galgame 特写。歌词 16 行逐字、原音轨 copy、Day2 字幕、常驻“非官方同人 · AI生成 · 剧情演绎”、终帧全员 hold 无片尾卡等约束不变。voxel-mv `characters/` 帧图上游未逐项确权（THIRD_PARTY_NOTICES 排除于授权外），按用户指示非商用同人使用＋署名，NOTICE/REFERENCES 已记录，不声明可商用/可自由再分发。改完须 npm test＋verify.py 全过并推送 `arena/e9e1d8ec-newday`。

## 2026-11-06 番外MV v3 多来源主形象（当前口径）

用户指出 v2 “怎么就全从 voxel-mv”，并要求参照 `Nyankomintsu/world-execute-me-lyric-mv` 与 `JohnHeibel/PDoomVideo` 解决歌词画面/细节不对位、人物呆板。ask_user 最新口径：**主形象=shuaizenge/ai-girls Q版 chibi**；voxel“使用，但是别的也要用啊，不要同时出现就好一个形象”。当前执行：三来源都要用，同一角色同一镜头只出现一种形象；chibi 为主，鲸鱼娘情感特写 S06/S09/S12 用 galgame，动作镜头 S03/S07/S13 用 voxel，豆包沿用 Day12 cutout。`data/shots.json` directorVersion=3，perform.art=chibi/voxel/galgame/static；`prepare_assets.mjs` 生成 chibi 边界抠图与 `data/chibi_cutouts.json`；`src/film.js` 单形象路由＋PDoom 式整身动作；`src/overlay.js`/render 消费 transition。PDoom 未检测到 LICENSE，只借鉴方法，不复制代码/素材。歌词/音轨/时间轴/Day2 字幕/常驻标注/终帧 hold 不变。改完须 npm test＋storyboard 目检＋全渲＋verify.py＋smoke，并推送 `arena/e9e1d8ec-newday`。

## 2026-11-06 番外MV v4 全 Q 版纸艺＋真逐帧（当前口径）

用户否定 v3“人在跳很奇怪”，要求研究 `tqlearning/ai-girl-chatgpt-pets` 让个别人物有动画、MV 人物改 Q 版，背景/细节参照 `Win-Hao/music-mv`。当前执行：废弃 Three voxel 舞台与整图 bounce/hop/sway；`src/paper.js`+`src/film.js` Canvas2D 分层纸艺立体书（纸边/刀口/纸厚、6–8 层景深、暖光、12fps 道具手摆、慢推 5%）。鲸鱼娘/GPT 用 pets 真逐帧（整格 192×208、pet.json 毫秒、公共脚底、不 jumping）；Claude/Gemini/Kimi/Qwen/Z.AI 用 ai-girls chibi 静态纸偶（镜头/道具/事件做动态）；豆包上游无 Q，用 Day12 cutout 像素保真分段仿射派生 Q（头×1.25/躯干×0.9,0.62/腿×0.82,0.5），正常件归档，文档注明派生非上游。galgame/voxel 因全 Q 口径退出正片主形象，素材链/许可保留不静默丢。`data/shots.json` version=4 stage=paper-diorama；`sprites.json` primaryForm=q-chibi-pets。歌词 16 行/音轨 copy/Day2 字幕/常驻标注/终帧全员 hold 无片尾卡不变。改完须 npm test＋storyboard 目检＋全渲＋verify.py＋smoke，并推送 `arena/e9e1d8ec-newday`。


## 2026-11-06 Day13+ 纸艺 Q 版化与同屏≤2人（当前口径）

用户本轮要求：把日更系列的分镜与人物改成番外MV v4 的纸艺 Q 版风格，参照 `tqlearning/ai-girl-chatgpt-pets` 给主角与配角**多做动画/动作/表情/细节**，并明确 **同屏最多 2 个角色**（此前人物太多占画面）。ask_user 裁定：`anim_source=gen_new`（**允许生图模型新画 Q 版动作表情**，须标注 AI 派生）；范围＝「day12 以后的，在项目的 md 写以及改通用的生成模板和 agent.md」。因此**只改新集入口，不逐集重渲历史 Day0–Day12 片**。（MV 口径已被同日的下一条覆盖：MV 也守 ≤2 人、终帧例外。）

落地入口：规则 `agent.md` 第33条；口径文档 `00_运营总览/画面风格_Q版纸艺_2026-11-06.md`；角色库 `tools/角色Q版库/`（`cast.json`、`generations/`、`build_pets.mjs`、`pets/<id>/`、`NOTICE.md`）；通用脚手架 `tools/init_episode.py`（**day≥13 自动产出 `paperVersion:1` spec＋`DayN分镜_纸艺Q版.md`＋纸艺 gate_config**，day≤12 行为不变）；引擎 `tools/engine/{paper_stage,pets_actor,paper_contract,render_paper_episode}.mjs`；回归 `tools/engine/paper_contract.test.mjs`。

硬边界：`MAX_ON_SCREEN=2` 超员抛错；动作只能引用图集真实存在的状态；走位须配 `walk-*` 真步态；拒绝 `idleMotion/livingBody/bodyEvents` 与 bounce/hop/sway；未生成图集的客串不得上场充数；无实测轴只能 `--silent-planning` 出 `measured=false` 无声结构样片，画面自带标识。该轮受单轮 10 张生图上限限制，只完成鲸娘 10 姿势（walk 为真 4 帧循环，idle 当时仍是 point 占位）——**此进度已被下方 v5 段更新：鲸娘现为 16 状态、idle 已是真呼吸眨眼帧、pending 清空**；豆包与 6 位客串的图集仍为 pending，见 `cast.json` 与库 README，不得声称全员动作已接入。Day0–Day12 旧 renderer、锁稿与成片不改不重渲；BGM 第22条、Day2 字幕、常驻角标、尾部0.24s、无片尾卡继续有效。改完须跑 `node --test tools/engine/*.test.mjs` 并推送 `arena/e9e1d8ec-newday`。


## 2026-11-06 番外MV v5 完整成片＋同屏≤2人（历史留档；成片与 sha 已被下方 v6 段取代）

用户本轮说「继续，然后完整mv」，并在 ask_user 选定 **`cap2_keep_finale`**：MV 正片每镜同屏最多 2 人，**仅终帧 S16 保留全员 hold**。这覆盖上一条里"≤2 人不回溯适用于 MV / MV v4 保持现状"的说法；日更新集仍严格 ≤2 人无例外。

本轮生图额度重置后又画满 10 张，鲸娘图集从 10 状态扩到 **16 状态 / 20 姿势**：新增真 `idle`（呼吸＋眨眼 2 帧，替换原 point 占位）、`wave`(4帧)、`typing`(2帧)、`eat`/`sleep`/`handoff`/`peek`；鲸娘 `pending` 已清空，豆包与 6 位客串仍 pending、不得上场充数。打包器改为**全角色共用一套缩放**（基准 `referencePose: idle_a`），水平锚点按实测选 **bbox 中心**（20 姿势 0 边缘钳制；脚底重心会钳制 4 次并推移身体，已弃用），结论记在 `build_report.json`。

MV 入口仍是 `tools/番外MV_爱有时差/`：`prepare_assets.mjs` 把 `tools/角色Q版库/pets/whale` 登记为 `characters.whale.pet`（`artOrigin: ai-derived`），**上游图集保留为 `petUpstream`**；`data/shots.json` `directorVersion=5` ＋ `castPolicy{maxOnScreen:2, finaleException:'S16'}`；`src/film.js` 有**逐帧运行时人数探针**，正片超员直接抛错（不是只改声明）。鲸娘因新图集无 look 方向行，分镜不得用 `look`；GPT 沿用上游 pets 与 look。

验收（v5 当时）：`npm test` 6/6、`npm run smoke` 8 镜无报错、`python3 verify.py` **18/18**（新增 `v5_on_screen_cap_two`、`v5_whale_q_library_real_frames`）。成片当时 1346 帧 / 56.08s / 1080p24 / 音轨 copy（该版 sha 已过期，现值见下方 v6 段）。分镜目检发现并修掉两处本轮引入的遮挡：S09 纸条糊脸（轨迹抬到头顶以上）、S08 鲸娘压罐子（走位终点 620→420）。Day13 样例产出当时按 16 状态图集重渲（该 sha 已过期，v6 段为现值）。机器验收不等于人工听审/艺术批准。


## 2026-11-06 番外MV v6：修 sleep 肢体 / 走路反向 / 状态没播出来（历史留档；站桩问题 v7 才真正解决）

用户第 2 轮反馈四条：①`sleep` 双腿重复；②走路方向反了；③「现在整体还是站着不动的」，要更丰富的细节动作；④画面细节参照用户给定的《把回忆拼好给你》.mp4。本轮生图额度 10 张已用满。

**①sleep**：旧图画了多余肢体，已重画为侧坐、明确一对腿脚；生图 prompt 现在显式约束肢体数量，规则写进 `agent.md` 第33条(e)。

**②走路反向**：根因是旧 `walk_a/b/c` 偏正面/朝左却登记成 `walk-right`，位移向右而身体朝左＝倒着走。换成明确朝右的 `stride_a/b/c/d` 四帧，左向一律 `mirror` 派生；旧 3 张进 `deprecatedPoses` 留档、退出注册。`cast.json` 加 `generation.facingRule`；`paper_contract.mjs` 加**步态朝向 vs 位移方向门禁**（含 flip 异或）＋3 条回归测试（`paper_contract.test.mjs` 13/13）。

**③站桩**：查出四个独立原因，不是加个晃动就完事——
- **MV 图集过期**：`assets/` 副本仍是 16 状态而库已 21 状态，`petCell` 的 `|| animations.idle` 把 `look_up/bend/back` **静默兜底成 idle**。已删兜底改抛错、重跑 `prepare_assets`，并加 sha/行号/帧数/时长一致性测试。这是"改了却看不出来"的真正原因。
- **双重平移**：调用方先 `lerp` 出 x 再交给 `walk` 又平移一次（S01 起点 -40）。契约改为**有 walk 时 x 必须等于 walk.to**，违反抛错。引擎侧本来是直接赋值，无此 bug。
- **framing 只是标签**：medium/close 完全不影响构图，全片实际一个远景。现 `FRAMINGS` 七档真做 translate/scale 取景。
- **走位缺失**：S01–S15 补真走入、`bend→handoff` 事件链、`look_up/point_up` 反应；6 位静态纸偶全部加 `enter` 画外推入＋`faceAt` 节拍转身。仍然**不是整图弹跳**。

**④样片细节**：抽帧比对后新增 `motes`/`grassTufts`/`birds`/`groundShade`（纯路径、12fps 量化、**无逐帧 blur**），接入 10 镜；**S10 改背影看烟花**，采纳样片 t36 构图（新增 `back` 状态的动因）。尚未复刻：真正的脸部大特写、四格拼贴的分格内容；歌词仍按项目规则用 Day2 字幕，未改成样片的逐字小纸片。

图集当时为 21 状态 / 26 姿势（该 sha 已过期，v7 段为现值），`edgeClampedPoses=[]`。**两处生图语义偏差如实登记不夸大**：`sit` 实为屈膝欠身站姿（非真坐姿，已登记但故意不用于任何镜头）、`bend` 实为前倾俯身伸手（非深蹲）。豆包仍静态纸偶、6 位客串仍无图集不得上场充数。

`cap2_keep_finale` 不变：正片每镜 ≤2 人，仅终帧 S16 全员 hold。Day0–Day12 不改不重渲。机器验收不等于人工听审/艺术批准。

**v6 验收（当时实测，成片与样例 sha 已被 v7 取代）**：MV `npm test` **9/9**（新增图集 sha/行号/帧数一致性、全角色状态词表、步态朝向 3 条）、`npm run smoke` 8 镜 `errors=[]`、`python3 verify.py` **18/18**、引擎全量 `node --test tools/engine/*.test.mjs` **54/54**（纸艺契约 13/13）。成片当时 1346 帧 / 56.08s / 1080p24 / 音轨 copy（sha 已过期，见 v7 段）。

**本轮新增的防复发机制**：`render.mjs` 在开 ffmpeg 之前做**全时间轴预检**（562 采样）。此前一个不存在的图集状态在 62% 处才抛错、白烧 190s 编码；预检把这类错误压到秒级，并当场揪出 static 测试漏掉的 `group()` 助手里的第三处非法状态（S16 的 gpt `think`）。**删掉静默兜底后共查出 3 处历史遗留非法状态**：S11 gpt `think`→`review`、S15 gpt `wave`→`waving`、S16 group gpt `think`→`review`——它们此前一直被 `|| animations.idle` 掩盖成站桩。

目检证据：从**成片解码**抽帧复核（不是只看渲染器），确认 S01 走入时朝右、S13 朝左镜像、S10 真背影→look_up→cheer、S11 insert 取景不切脚、21 状态动作目录里 sleep 只有一对腿脚。机器验收仍不等于人工听审/艺术批准。


## 2026-11-06 v7：细节动作表情升为真多帧，并推广为全项目通用（当前口径）

用户第 3 轮：「画面分镜细节还是不够到位，请多加细节动作表情，然后将整个项目的通用都改成这样的动作表情和人物，之后的 day 系列也这样」。

**真正病根（前两轮没解决）**：21 个状态里 16 个只有一张静态图，`look_up` 用 7 次、`cheer` 4 次、`cry` 3 次。单帧久持＝纸偶站桩，加背景细节救不回来。v6 声称修了站桩，其实只修了"状态没播出来"，播出后仍是单帧——这一点必须如实记下来。

本轮 10 张生图全部补**真第二帧**（预备→峰值）：look_up/cheer/cry/think/shock/bow/point_up/bend/handoff/peek。图集 **21 状态 / 42 帧 / 36 姿势**，**15 状态真多帧**，只剩 6 个静止语义单帧（point/confident_hips/eat/sleep/sit/back）。sha256 `166f9bd9a0a69f8d490162b9f666bc48c33df868db159de009c1eb6ebe2cfcaf` / 1279494 B。

**量化证据**：单一状态持有区间内角色框像素变化 look_up 43.5% / cry 55.4% / shock 34.7% / handoff 48.6%（补帧前同样探针为 0）。帧间漂移除 shock 峰值头发 +11.7% 高度（脚底漂移 0，属真 secondary motion）外，高度跳变 ≤4.1%、脚底 ≤1px。

**全项目通用落地（用户第二个要求，不是只改 MV）**：
- `tools/engine/paper_stage.mjs` 新增 6 种通用细节层 `motes/grass/birds/ground/rain/windows` ＋ `drawDetails` 调度（纯路径、12fps 量化、无 blur）；
- `tools/engine/paper_contract.mjs` 新增硬门禁：`MAX_SINGLE_HOLD=1.2`（单帧不得久持）、`MIN_BEATS=2`（每镜表演节拍）、`details` 必填、`stateMeta()` 查真帧数；
- `render_paper_episode.mjs` 支持 `enter` 推入 / `faceAt` 转身 / walk 双重平移运行时守卫，并调用 `drawDetails`；
- **`tools/init_episode.py` 的 spec 模板与分镜 MD 模板已内置全部字段**，实测生成 Day97 过契约后删除；
- 样例 spec 升为细节标准参考实现；`agent.md` 第 33 条新增 **(b2)** 明文规则。Day13+ 每集与番外 MV 共用同一套。

验收：引擎全量 **59/59**（纸艺契约 18 项，新增 4 条细节门禁）、MV `npm test` **9/9**、smoke `errors=[]`、`verify.py` **18/18**。成片 1346 帧 / 56.08s / 1080p24 / 音轨 copy，sha256 `c7a3924b88a74486a088f81e7ab565a3426f2ea6525044b270666a6f80acb858` / 15644878 B。Day13 样例重渲 sha256 `6d8168a61bef4cadccf424b9433d0bf9f04ecd39cfeda04bbacaf344fed90c70` / 9147463 B。

`cap2_keep_finale`、歌词 16 行、measured cues、原音轨 copy、Day2 字幕、角标、无片尾卡均未动；Day0–Day12 不改不重渲。机器验收与像素探针都不等于人工审看。
