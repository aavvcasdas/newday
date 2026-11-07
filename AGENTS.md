# 本仓库创作入口

先读根目录 `agent.md` 的“现行覆盖规则”，其中第29–31条是 Day12 与人格移植的本轮口径。

写/修 Day 连载、求职梗、人设或剧情衔接时，读取 `00_运营总览/skills/剧情生成/SKILL.md` 及其 persona/beats/research 引用。
主角仍是大肥鱼/鲸鱼娘，外形和关系不变，魔丸只是移植人格。不得再写“你不是大肥鱼”。
待审稿不能覆盖已锁定旧集。真实模型创作使用 `tools/agent/create_episode.py`，不能把 mock 或文本结构通过当作人设已生效的证据。

本工作区来源和未同步媒体边界见 `SOURCE_IMPORT.md`。

## 用户交付偏好：每次改完推送

后续每次完成有文件修改的任务，检查后提交并推送到**当前会话指定分支**，报告实际提交号/链接；旧会话分支名不得沿用。不得只改本地却说已经推送；失败要明确报告。用户未要求时不自动合并PR、不发布平台评论或视频。

## 导演与稳定画面

用户提到画面抖动、站桩、镜头重复、走路怪异/多腿或重做视频时，先读 `.claude/skills/day-series-director/SKILL.md` 与 `agent.md` 第 33–34 条。按当前口播写音画双栏/逐镜卡，可基于 Day 系列通用单集模板 `tools/engine/day_episode.template.spec.mjs` 编写 `directorVersion=1` 的 spec：
- **通用步态与同体待机**：角色走位优先声明 `locomotion: 'side_walk' | 'walk' | 'happy_walk' | 'sad_walk' | 'push_walk' | 'idle' | 'sit_bench'` 配合 `walk` / `track`（由 `tools/remotion-engine/walk_rig_builder.mjs` 双骨骼连续三角网格蒙皮生成 8 角色共 23 套无断膝、零第 3 条腿的 16 帧图集，行走结束自动无跳变切回同体 `*_pet` 待机，Canvas 2D 与 Remotion 双后端通用）；10 骨高清网格主角亦可使用 `action: 'walk_natural' | 'stroll_calm' | 'step_back' | 'sit_settle'`。
- **全局零视频水印新规**：所有当前及今后新制作的视频与发布封面（MV、Day 正传、横/竖屏）一律不加右上角水印或常驻角标；此前已归档的历史成片保留原样不动。
- 默认固定机位或每镜最多一次有动机运镜、`idleMotion` 可关闭，不用整体晃动代替事件；视觉姿态与手掌接触校准分开，严禁篡改固定 PNG 五官。
Day12当前指定原音源版入口为 `Day12/README.md`、`Day12/Day12有声分镜.md` 与 `tools/day12制作/episode.production.spec.mjs`，实际结果看同目录 `final_check.json`（不可脱离成片SHA引用）。原25行锁稿不改；指定音源未读首句，因此有独立24行视频字幕稿。用真实ASR整词区间绑定、关闭聚光灯、固定机位、独立stem混音验收；不声称音素级对齐、手纸真实接触或真人完整听审。`episode.spec.mjs`及四段无声样片是历史planning方案，不能替代当前有声版验收。

## Day12 v2 当前覆盖口径

用户要求加入`shuaizenge/ai-girls`豆包原有素材、移除全部笨鱼立绘。当前执行方案为`Day12/Day12_v2修复导演表.md`和`episode.production.spec.mjs`的performanceVersion=2；旧固定机位/idleMotion=0是历史，不得重新覆盖本轮已授权的连续微呼吸、单次有动机运镜与转场。固定PNG无口型/眨眼/局部五官/真实头转；已有姿态仅做身体变换＋PNG切换。v2不拿脸ROI运动作“活”指标。技术结果看成片SHA绑定报告；人工动态审看为独立pending，禁止把自动差分/静帧当作真人动态批准。豆包是来源仓库已有生成参考全身，非官方全身原图；本轮只抠除背景，记录来源/NOTICE，不擅自声明商用开放授权。

## 独立歌词MV现行入口（覆盖下方 v2 历史记录）

《把回忆拼好给你》以 v13 为进行中返工，保留 v8 原背景与原曲，主角使用新版 Day12 鲸娘，七位配角须按歌词有实质动作；不是 Day 正片，也未通过人工全片动态验收。当前入口 `番外MV/把回忆拼好给你/README_v13制作状态.md`，素材进度 `assets/ai-girls/lyric-action-v13/生成进度.md`。不要把 v13 动作/字幕风格规则强加到 Day 正片。

## 独立歌词MV v2 历史记录（已被上文覆盖）

**410575d的旧56秒版已被用户否决：缺动作/细节、客图白底；不得再当当前交付。** 当前返工入口是`番外MV/把回忆拼好给你/README_v2.md`、`分镜/v2_动作与场景导演表.md`、`tools/mv_extra/v2/{actors,plan,scenes,film}.mjs`。先交19.8秒/594帧连续有声动作试剪（原音19.033–38.833秒），方向待用户实际看听；不是新版56秒终片。全片其余镜头仅规划，full渲染命令故意阻止。原16句用户已重新完整提供，`v2/lyrics.txt`逐字锁定，L2为“祈愿小世界里不只有挫败”；旧页的歌词缺失局限只属历史，不能继续说当前16句不可确认。

沿用原像素主角、原骨架/合法睁眼头缓存，身体/腿实际按位移出步、停步、屈膝、原heart/panic姿态与背向；不DSH替主演、不乱加饰品、不让固定PNG眨眼口型/改脸。4客图已做原RGB完整保留的alpha衍生，来源/guide/保护脸/SHA见`assets/ai-girls/extra-guests/cutouts/manifest.json`。不再放带白底参考图画框。rain动作仍是屈膝/起身，不冒称无电脑坐姿；原laptop含电脑且没有独立腿骨，禁止假装它是通用坐姿。抱持金片只校准front/heart原手掌像素，抱持→入盒采用连续性切镜，不代表已完成伸手接触。

实际新SHA检查只看`tools/mv_extra/v2/{render_inputs,sample_check,static_review,matte_repro_check}.json`，不能套旧final_check。自动结构、编码字幕、静态目检、真人动态和听审分别记录；后三者不可冒称相互替代。时轴仍基于原片显字±0.25秒，不冒称ASR/音素。源音原速不换，样片从完整PCM切片转AAC，不声称样片无损stream-copy。不搬源视频帧、不恢复相册、不改Day12/共享源码。四库实际研究身份见`v2/reference_sources.json`；只借空间/事件语法，不冒称本轮用外库3D引擎。
