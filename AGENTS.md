# 本仓库创作入口

先读根目录 `agent.md` 的“现行覆盖规则”，其中第29–31条是 Day12 与人格移植的本轮口径。

写/修 Day 连载、求职梗、人设或剧情衔接时，读取 `00_运营总览/skills/剧情生成/SKILL.md` 及其 persona/beats/research 引用。
主角仍是大肥鱼/鲸鱼娘，外形和关系不变，魔丸只是移植人格。不得再写“你不是大肥鱼”。
待审稿不能覆盖已锁定旧集。真实模型创作使用 `tools/agent/create_episode.py`，不能把 mock 或文本结构通过当作人设已生效的证据。

本工作区来源和未同步媒体边界见 `SOURCE_IMPORT.md`。

## 用户交付偏好：每次改完推送

后续每次完成有文件修改的任务，检查后提交并推送到本会话固定分支 `arena/d4e2b5da-newday`：`git push origin arena/d4e2b5da-newday`，报告实际提交号/链接。不得只改本地却说已经推送；失败要明确报告。用户未要求时不自动合并PR、不发布平台评论或视频。

## 导演与稳定画面

用户提到画面抖动、站桩、镜头重复或重做视频时，先读 `.claude/skills/day-series-director/SKILL.md`。按当前口播写音画双栏/逐镜卡，再更新directorVersion=1的spec；默认固定机位、idleMotion可关闭，不用晃动代替事件。视觉姿态与接触校准分开，不能冒称28个历史动作已全部接入。
Day12当前指定原音源版入口为 `Day12/README.md`、`Day12/Day12有声分镜.md` 与 `tools/day12制作/episode.production.spec.mjs`，实际结果看同目录 `final_check.json`（不可脱离成片SHA引用）。原25行锁稿不改；指定音源未读首句，因此有独立24行视频字幕稿。用真实ASR整词区间绑定、关闭聚光灯、固定机位、独立stem混音验收；不声称音素级对齐、手纸真实接触或真人完整听审。`episode.spec.mjs`及四段无声样片是历史planning方案，不能替代当前有声版验收。

## Day12 v2 当前覆盖口径

用户要求加入`shuaizenge/ai-girls`豆包原有素材、移除全部笨鱼立绘。当前执行方案为`Day12/Day12_v2修复导演表.md`和`episode.production.spec.mjs`的performanceVersion=2；旧固定机位/idleMotion=0是历史，不得重新覆盖本轮已授权的连续微呼吸、单次有动机运镜与转场。固定PNG无口型/眨眼/局部五官/真实头转；已有姿态仅做身体变换＋PNG切换。v2不拿脸ROI运动作“活”指标。技术结果看成片SHA绑定报告；人工动态审看为独立pending，禁止把自动差分/静帧当作真人动态批准。豆包是来源仓库已有生成参考全身，非官方全身原图；本轮只抠除背景，记录来源/NOTICE，不擅自声明商用开放授权。

## 独立歌词MV当前入口

**410575d的旧56秒版已被用户否决：缺动作/细节、客图白底；不得再当当前交付。** 当前返工入口是`番外MV/把回忆拼好给你/README_v2.md`、`分镜/v2_动作与场景导演表.md`、`tools/mv_extra/v2/{actors,plan,scenes,film}.mjs`。先交19.8秒/594帧连续有声动作试剪（原音19.033–38.833秒），方向待用户实际看听；不是新版56秒终片。全片其余镜头仅规划，full渲染命令故意阻止。原16句用户已重新完整提供，`v2/lyrics.txt`逐字锁定，L2为“祈愿小世界里不只有挫败”；旧页的歌词缺失局限只属历史，不能继续说当前16句不可确认。

沿用原像素主角、原骨架/合法睁眼头缓存，身体/腿实际按位移出步、停步、屈膝、原heart/panic姿态与背向；不DSH替主演、不乱加饰品、不让固定PNG眨眼口型/改脸。4客图已做原RGB完整保留的alpha衍生，来源/guide/保护脸/SHA见`assets/ai-girls/extra-guests/cutouts/manifest.json`。不再放带白底参考图画框。rain动作仍是屈膝/起身，不冒称无电脑坐姿；原laptop含电脑且没有独立腿骨，禁止假装它是通用坐姿。抱持金片只校准front/heart原手掌像素，抱持→入盒采用连续性切镜，不代表已完成伸手接触。

实际新SHA检查只看`tools/mv_extra/v2/{render_inputs,sample_check,static_review,matte_repro_check}.json`，不能套旧final_check。自动结构、编码字幕、静态目检、真人动态和听审分别记录；后三者不可冒称相互替代。时轴仍基于原片显字±0.25秒，不冒称ASR/音素。源音原速不换，样片从完整PCM切片转AAC，不声称样片无损stream-copy。不搬源视频帧、不恢复相册、不改Day12/共享源码。四库实际研究身份见`v2/reference_sources.json`；只借空间/事件语法，不冒称本轮用外库3D引擎。
