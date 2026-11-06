# 本仓库创作入口

先读根目录 `agent.md` 的“现行覆盖规则”，其中第29–31条是 Day12 与人格移植的本轮口径。

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
