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


## 2026-11-06 番外MV v5 完整成片＋同屏≤2人（当前口径，覆盖 v4 的"MV 不回溯"）

用户本轮说「继续，然后完整mv」，并在 ask_user 选定 **`cap2_keep_finale`**：MV 正片每镜同屏最多 2 人，**仅终帧 S16 保留全员 hold**。这覆盖上一条里"≤2 人不回溯适用于 MV / MV v4 保持现状"的说法；日更新集仍严格 ≤2 人无例外。

本轮生图额度重置后又画满 10 张，鲸娘图集从 10 状态扩到 **16 状态 / 20 姿势**：新增真 `idle`（呼吸＋眨眼 2 帧，替换原 point 占位）、`wave`(4帧)、`typing`(2帧)、`eat`/`sleep`/`handoff`/`peek`；鲸娘 `pending` 已清空，豆包与 6 位客串仍 pending、不得上场充数。打包器改为**全角色共用一套缩放**（基准 `referencePose: idle_a`），水平锚点按实测选 **bbox 中心**（20 姿势 0 边缘钳制；脚底重心会钳制 4 次并推移身体，已弃用），结论记在 `build_report.json`。

MV 入口仍是 `tools/番外MV_爱有时差/`：`prepare_assets.mjs` 把 `tools/角色Q版库/pets/whale` 登记为 `characters.whale.pet`（`artOrigin: ai-derived`），**上游图集保留为 `petUpstream`**；`data/shots.json` `directorVersion=5` ＋ `castPolicy{maxOnScreen:2, finaleException:'S16'}`；`src/film.js` 有**逐帧运行时人数探针**，正片超员直接抛错（不是只改声明）。鲸娘因新图集无 look 方向行，分镜不得用 `look`；GPT 沿用上游 pets 与 look。

验收：`npm test` **6/6**、`npm run smoke` 8 镜无报错、`python3 verify.py` **18/18**（新增 `v5_on_screen_cap_two`、`v5_whale_q_library_real_frames`）。成片 1346 帧 / 56.08s / 1080p24 / 音轨 copy，sha256 `a678109b4d98e4e86ed72915d772207649f696e53e742ce051a96ff511381857`。分镜目检发现并修掉两处本轮引入的遮挡：S09 纸条糊脸（轨迹抬到头顶以上）、S08 鲸娘压罐子（走位终点 620→420）。Day13 样例产出已按新图集同步重渲（sha256 `5deec118d4554ea6ec4f01dab08e42a96ebe967b9071060b1a6bba0e6055bcea`）。机器验收不等于人工听审/艺术批准。
