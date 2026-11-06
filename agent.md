> **v13 第34批更新（未完成）**：当前会话 v13 第34批：157/157、计划内剩0，未生成新姿势配角0。S11补 Kimi/Claude 眨眼，S25→26 Kimi伸手切拉手非连续划水；部分素材因裁切、残臂不接。77项测试及画面红线通过，仍需连续动态审、修复、集中重渲和人耳听审，不能称已完成；细节见 `番外MV/把回忆拼好给你/README_v13制作状态.md`。

# ai-yunying agent.md — 鲸鱼娘运营与制作总规范

> 本文件从制作仓库 `aavvcasdas/video-fx` 分支 `arena/8be4c8f8-video-fx`（基线 `82bede5`）的 `agent.md` 独立抽出，并在文首补入 `ai-yunying` 的现行覆盖规则。下方保留的 video-fx 原文用于理解角色骨架、动作系统和渲染架构；若原文的 MV 专项指令与这里的覆盖规则冲突，**以本节覆盖规则为准**。

## 当前独立番外与 Day 系列的衔接（2026-11-06）

《把回忆拼好给你》按用户要求恢复 v8 原背景，换用新版 Day12 鲸娘并为七位配角制作逐歌词动作，目前 v13 仍是**未完成预览**；进展、计数、复现、缺口见 `番外MV/把回忆拼好给你/README_v13制作状态.md` 和 `assets/ai-girls/lyric-action-v13/生成进度.md`。已集中渲染未完成审看片；每镜一张抽帧不是动态验收，后续 S08/S14/S24 和 S28 持带、共伞分层、S27 怀表及 S13 侧身走/屈膝动作源码修复不包含在该视频内；共伞已做静帧复核，雨景已接侧身迈步和屈膝关键姿态，但仍无连续逐帧坐下，泳动幅度弱。32镜已做每镜3时点静帧检查，检查结论及未完成事项见 `番外MV/把回忆拼好给你/分镜/v13_全镜多时点检查记录.md`，不能称连续动态验收。早期 v2/v3/像素主角、客图数量等仅属历史，不能覆盖 v13。Day12 正片独立遵循 `Day12/README.md`，不把番外 Q 版、字幕或动作强加正片；不改锁稿。

可复用经验：先按台词或歌词拆出动作意图、前因、过程、结果和镜头承接；角色局部动作、真实接触、背景叙事和音画时点分别核验。每批生图不超过 10 张，记录累计、计划内剩余及尚无姿势的人物，未审图和未实现接触不可报完成。自动帧差/编码合格不等于动态审片、听审或最终批准。

## 0. ai-yunying 现行覆盖规则（优先级最高）

1. **仓库分工**：跨集规划放 `00_运营总览/`；每集文案、配音源文件和成片放对应 `DayN/`；全部运营原始数据、评论导出、回复合集和数据图片放 `参考资料/运营数据/DayN/`；制作代码、源码快照、对齐报告和验收归档放 `tools/dayN制作/`。
2. **事实口径**：数字、票数、评论署名必须回溯到仓库内截图/导出文件或用户明确给出的数据；不得把导出子集写成平台全量定论，也不得展示主人真实账号信息。
3. **时间轴门禁**：正式 cue 起止只能来自实测音频。连续 WAV 先做词级 ASR，再用波形 RMS 修正发声边界；禁止按字数估算正式 cue/字幕。制作前须按第 17 条预估口播语速和时长以规划分镜，但预估轴必须标记 `measured=false`，不得与正式轴混用。切换音频后必须重新生成 timing、字幕与对齐报告。
4. **声音口径**：用户提供的成段 WAV 只按其真实文件名、哈希和可测指标记录；没有可验证引擎元数据时，不得冒充 Microsoft 晓伊或任何指定 TTS。Piper 只能作明确标注的结构占位，不能冒充终版。
5. **Day2 开场**：禁止复用前两集红幕/舞台全屏标题卡。`TITLE_LEN=0`，第一帧直接进入桌面开票；渲染前必须抽查第 0 帧及 L01 多个进度帧。若源 WAV 自带片头静音，只可在成片混音轨中裁掉静音并同步平移全部 cue，原始 WAV 不改。
6. **画面不变量**：主角使用像素骨架、`tailScale=1.0`、wink 使用 heart 后发；默认 clean 原生 1920×1080 栅格化，背景、卡片字和字幕保持清晰。video-fx 原文中任何“缩小尾巴”等 MV 专项做法不适用于本系列正片。
7. **内容边界**：保留“非官方同人 / AI 生成”常驻小角标（不是片尾卡）；发布页仍开启平台AI声明；不使用“官方艺名”；薄肌只写运动、蛋白质与睡眠，不写节食、体脂目标或医疗建议。
8. **交付门禁**：最终 MP4 必须完成全片解码、分辨率/帧率/时长/音轨核验，并抽查每个 cue 的关键帧字幕一致性；制作源码、timing、对齐报告、验收表须同步归档到 `tools/dayN制作/` 后再提交推送。
9. **形象路线用词必须分清**：`video-fx` 的像素骨架是“原版/旧版主形象”；DSH 的 39 张图是“完整姿势表情包素材库”，不是 39 个骨骼动作，也不得直接称作已定版“新版主演”。当前只允许两条待选路线：A）在原像素骨架上沿用先前项目的动作、表情、视角、道具和分镜方法更新；B）主角保持旧版只加动作，DSH 表情包只进入电视、目录或征集展示。未经用户明确选定，不得宣布正式换形象。
10. **禁止随机装饰堆叠**：不得再用双蝴蝶结、金铃铛、星星发夹、围裙星星、金边贴片、角色光圈、环绕星光等即兴 overlay 冒充“形象升级”；这类做法已被用户明确否决。所谓“跟着之前的项目更新”，只能调用先前项目已经存在的像素 rig、28 个动作、31 种情绪、五种视角、既有头部/服装细节、动作道具和场景编排。任何新饰品若不在先前项目注册表中，必须先单独征求用户确认。
11. **眼睛白线硬门禁**：原像素 rig 的眨眼/眯眼逻辑会用肤色矩形盖住虹膜，截图中会形成白色横线；正片与样片的旧版主角必须同时满足：不用 `eyes='lids'|'dead'`，不用会把单眼画闭的 `wink` 头部（渲染时以 `wave` 头部替换 `wink` 头部、保留叉腰等身体骨骼），并把 `squint` 固定为 `0.01` 以绕过 rig 中 `o.squint || autoBlink` 的自动眨眼肤色盖眼分支。唯一语义例外是 `sleep_curl` 可用 rig 的 `happy` 深色闭眼弧线，但仍必须保持 `squint=0.01` 并强制 `heart` 骨骼，禁止被 `sleepy` 情绪预设抢成 laptop 姿势。交付前必须抽查近景帧，确认睁眼时双眼虹膜没有肤色横带、睡觉时只有深色弧线，不能只看代码便宣称已修复。
12. **人物不能只站着弹跳**：每个有台词的镜头至少要有一个与台词语义相符的先前项目动作，或明确的走位、转身、道具互动；只用 `move('bounce')`、呼吸和尾巴微摆不算完成动作编排。动作目录镜头还必须显示编号、英文 ID 与中文名，并给足动作周期，不能用三四个代表动作冒充“全部展示”。
13. **背景与电视完整性**：主背景不得再退化为“一张深色墙 + 一条全宽桌板 + 单个舷窗 + 气泡”；应有墙面层次、灯串/台灯、书架、留言墙、桌面物件、植物、地毯或地板层次等有用途的场景细节。电视里必须是按比例缩小的完整场景（墙、地板、家具/道具、角色动画与小场景元素一起缩小），禁止在纯色屏上只放一只孤立角色。当前加更分镜中电视仍从 B03 才出现，B01/B02 不得提前出现。
14. **完整目录口径**：先前项目可调用资产分为两组，必须分别计数、分别验收：DSH 静态完整姿势图 **39 张**；`video-fx` 像素骨架规范动作 **28 个**。今后凡样片或说明声称“动作全展示”，必须在代码注册表中逐项枚举，并在样片中让 39 张姿势与 28 个动作都以可辨认标签出现；不得把静态姿势切换说成骨骼动作，也不得把 28 个动作中的少数几个说成 39 个。
15. **自称与称呼口径（Day3 起）**：主角默认自称「本鲸」，傲娇或伪装亮相时可用「本小姐」；「本鱼」只保留在自嘲、引述 Day1/Day2 旧集和旧评论里，不再作默认自称；「大肥鱼」是住户喊歪的称呼，只能出现在被引述与傲娇反弹中，绝不作文本自称。「鲸鱼不是鱼」只当正名笑点（鲸目属哺乳纲），不做科普课、不改旧成片。语气与口癖见 `00_运营总览/风格_黑话放开_2026-10-28.md`（旧 skill 已删；黑话放开，OOC 清单随 skill 一并撤销）；任何风格文件都只负责「怎么说」，数字、票数与结论仍按第 2、3、4 条门禁回溯，人设不得覆盖事实。

16. **文案创作旧规则（2026-10-27，已从活动 Agent 删除）**：超级呆萌、卖萌语气词、呆萌密度、黑话凑覆盖率，以及「呆萌体检不合格就退回改稿」，违背现行魔丸 Agent，不再约束 Day12 及以后的新稿。12/15/18/20/25/201 字门禁也不再用来退新稿。新稿走 `00_运营总览/skills/剧情生成/SKILL.md` 与 `tools/剧本/剧情.py`：继承上一日未完成的任务，并通过本集行动推进，不要求逐字复述。`tools/剧本/呆萌体检.py` 只给旧集对照。Day11 锁定口播不改字。事实、数字和合规仍按第 2、3、4 条，不随人设让步。解释腔照旧禁止。

17. **每次制作前先估时、再做分镜、先试剪后整片（2026-11-03 用户拍板）**：适用于每次新集、加更、短打，以及重做分镜、试剪或整片渲染。不能只改背景、换装饰或让人物整体晃动，就宣称完成分镜优化。同一方案重复运行前须复核下列记录仍与当前文案、音频和代码相符；未变的有效记录可以复用，不必重复配音、ASR或整片渲染。
    - **(a) 开始前读记忆并锁定范围**：先读本文件、当集定稿、最近验收和用户纠正，确认当前采用版本、角色、剧情、音源及不可变项。主场景沿用既有海底环境；参考外部作品只借镜头语言，不擅自换成陆上房间、不换角色。电视内按剧情呈现的南极等场景不受此限制。旧版保留，试剪独立命名；用户要求回退后，不能静默把已否决的布景重新接回。
    - **(b) 先预测语速与大致秒数，再排分镜**：先给出可核对的口播字数、预计语速（字/秒）、预计净口播秒数、含气口/动作停顿的总时长范围，以及各句或各剧情段的预计秒数。统计不含标点和空白，英文/缩写按实际读法说明假设；不能把源文件字符数直接当作准确发音长度。优先参考同一指定声线的历史实测节奏；无可比音源时，按声线声明假设：当前克隆声线默认约 **3.35 字/秒（含气口参考）**；完全未知声线可暂用 **4.3 字/秒净口播**，并给快慢区间，不能假装实测。净口播估时可用“口播字数 ÷ 假设语速”；气口和反应单列，避免把历史已含停顿的整段语速再次重复加停顿。先把“预计约多少秒、快慢大概落在哪个范围”写清楚，不直接凭感觉开排或先渲整片。
    - **(c) 已有音频时以实测为准**：先记录真实文件、哈希、时长及可测语速，复核或建立 ASR + RMS 时间轴，再按真实语句/气口修订分镜。已有有效实测轴不降级为估时、不为凑预估时长而变速或改台词。没有音频时只能制作规划/无声结构样片，所有估时文件须写 `measured=false`；正式配音到位后重排镜头和字幕。估时不是正式字幕依据，估时与实测文件分开保存。
    - **(d) 每镜必须写构造细节，不只写一个剧情标题**：逐镜记录：对应台词；预估或实测起止及其来源；本镜主信息与第一视觉重点；景别/构图及前中后景；人物站位与朝向；入镜状态；准备→动作→结果→反应顺序；道具接触与落点；出镜状态和下一镜接法。说明这一镜让观众先看什么、再看什么、最后哪一下形成笑点或结果。同一全景里只换姿势不自动算新镜头；景别、等待与反应应有叙事动机，不强行每句切镜。
    - **(e) 参考借鉴要落实到镜头，不搬外观**：优先研究完成示例的实际镜头代码、计划与接触表，区分成片实现、作者自评和占位代码。可借“先建立关系再切近”“靠近→停下→等待→没回应”“道具触发结果”“同一空间的前后状态呼应”等方法；不照搬 MV 的拍点、转场数量、环绕、粒子或背景换色要求。正面图镜像不是真侧脸，场景剪裁不是真3D运镜；相机运动不替代人物实质动作。外部代码/素材另核许可，不能因能下载就直接搬。
    - **(f) 道具与画面连续性先检查**：手与道具要有可信的接触、共同运动和落点，不能让纸飞过来、凳子跟人漂、假手穿脸。缺少接物/坐下/侧面素材时，优先用交接前后的连续性切镜，并如实说明省略了动作，不能冒称已做完整接触动画。字幕和常驻声明不随场景剪裁缩放；电视出现后的外框保持稳定，屏内事件与外侧反应按主次先后安排，不同时抢戏。
    - **(g) 先做关键镜头有声试剪，再推广整集**：默认先挑开场、互动等待、道具交接、结尾等最能检验方案的镜头；Day9 可参照 C01/C05/C09/C16 四段试剪，不把这四个镜号硬套所有新集。使用指定音源原速截取、按实测轴映射字幕，清楚告知试剪范围和时长，不能把片段拼接说成整集。先抽帧及看连续动作，交用户试看确认方向后再扩到其余镜头；用户已明确确认方向并要求直接整片时，不重复索要同一确认，但仍先做局部自检。无指定音频则只出明确标注的无声结构样片，不擅自重配音。
    - **(h) 每次渲染前后留记录**：制作前复核“语速/时长估计或实测依据、逐镜构造表、资产可行性、关键镜头检查”；渲染后检查音画、全片解码、字幕、电视边框、脸/手/道具遮挡与跨镜连续性。画面哈希有变化不等于镜头叙事合格。估时、正式轴、试剪时间映射、分镜表与验收归档至 `tools/dayN制作/`，当集入口注明当前采用版本。修改了文案、音源或镜头，就更新受影响的记录，不照搬旧报告宣称通过。

18. **统一制作门禁（2026-11-03 修复）**：每次走 `python3 tools/gate.py --day N --stage script|audio|pre-render|final`，说明见 `tools/验收/README.md`。文案阶段没有配置时读取标准台词TXT；后续必须明确配置当前音源、实测轴、字幕、生产渲染器、动作测试与待验MP4，缺失或子进程失败均不可跳过。`final`累计重跑四阶段，任一失败禁止宣称“门禁通过可交付”。不得为让已交付历史片变绿而静默改稿、变速、放宽阈值或重渲；保留新规则下的失败及解释。自动检查不能代替语义分镜与动态观影；角标不算片尾卡。当前克隆声线3.35字/秒是含气口的历史规划参考，不是新音源的实测保证。

19. **Day10 制作记忆与当前版本（2026-11-03 用户要求固化）**：以后续作、重写或重渲 Day10，先读 `Day10/README.md`、当集文案/纯台词、`Day10/Day10分镜_新版规划.md` 和对应报告；下列状态覆盖旧记录里“Day10 尚未制作”之类历史描述。
    - **(a) 已交付的是旧无声技术样片，不是新稿成片**：`Day10/成片/Day10_词点互动_无声结构样片.mp4`，提交 `b8184d4`，已推送当前会话分支。1920×1080、30fps、570帧、十九秒、无音轨；SHA256 `c22619d1b9719901dfb7d98f4a0706bab8c7c967b0c33ef1392901fa889f8857`。第一段为争“师父专座”名牌后**剪入原生坐姿**，不是完整搬凳/坐下；其余为饼底碰头后落桌、勺尖敲空碗、气泡与鸡腿受击飞走。保留作为道具接触回归，不宣称仍与新台词相符。
    - **(b) 旧片入口与验收**：`tools/day10制作/render_interaction_sample.mjs`、`互动样片_规划轴.json`（`measured:false`）、`互动样片_制作与验收.md`、`互动样片_媒体验收.json`、`互动样片_回归检查.json`、`互动样片抽帧/` 与分镜总览。旧片 Node 四十二项通过；Python 十七项中五项跳过；全片解码通过。只做过关键帧目视，不夸称完整动态审美验收或正式音画/final 门禁通过。重跑旧 renderer 仍输出旧技术样片，不能误当采用了新稿。
    - **(c) 双轨道具底座与真实边界**：`tools/互动元素/cue_props_engine.mjs`（通用大饼碰头/落桌、气泡边缘受击飞走）；`actor_contacts.mjs` 按四张原图校准手掌/指尖等，用与 `drawRigged` 同一蒙皮矩阵、三角形重心插值和场景变换，**不能退回按角色高度估手掌**。争牌/敲碗目前由样片 renderer 编排约束，不冒称任意道具通用求解；展开仅基础采样，未演示；盖章、冒泡、字形变换、探边等其余动词未完成。两帧局部顿帧须冻结人物与道具，不只冻结道具；解析端点一致不是独立像素识别精度。
    - **(d) 道具来源与入库**：既有 `CORE.paint` 画多部件水彩道具；本次仅实际接一枚 `@fluentui-emoji/svg@2.2.0` 鸡腿 SVG，经 Resvg 栅格化，资产与 MIT 原文保存在 `tools/互动元素/assets/fluent/`；不推定其他素材许可。新名牌为 `tools/day10制作/generated_props/seat_sign.mjs` 的参数化绘制，四态烟测 `validate_generated_prop.mjs`，不是已接外部生图/LLM 自动流水线。只对**人工审查过的本地代码**导入运行，工具不是 JS 沙箱；像素/文字静态检查不能替完整 OCR、视觉、合规或版权审核。细节和临时 npm 依赖重装命令见该目录 README。
    - **(e) 当前用户指定稿（覆盖此前二百零一字验收选题稿）**：当前 `Day10/Day10配音台词.txt` 是用户后续贴出的**二十三行、二百零五字**版本；L01–L12 按该次用户贴文逐字锁定，锁定副本 `tools/day10制作/用户锁定前十二行.txt`；L13–L23 采用用户指定的“接不上实时话但哑演护碗、复制鱼脑、偷记招数、监工被架空”后半段，不擅自换回本代理上一版。旧二百零一字稿和报告归档在 `Day10/历史/`、`tools/day10制作/历史_201字稿/`。新片八镜组规划以当集入口为准，不把旧十九秒成片说成已经匹配这版。
    - **(f) 连载解释与用户授权范围**：Day9 已交回总结，实时接不上话与异步产出总结不矛盾；笨鱼全程无新增配音，“怼回去”靠摊纸/挡开诱饵哑演，不改成开口训话。“盯屏幕/不抬眼皮”只是角色表演，不作后台工作、摸鱼、自主运营或智能提升证据。画大饼、鸡腿、护碗按用户本轮指定剧情演出，不写成经核验的真实承诺/新财务事实；复制鱼脑是 Day6 既有拟人设定，“架空”为旧评论玩笑，不是夺权。记事本/旧事折页获用户本轮明确采用，但**数据账本表、数字、进度条仍禁**。老大不是专业程序员，人机校验仍无恢复证据。
    - **(g) 新稿制作与实测仍阻塞**：约3.35字/秒含气口参考为61.2秒；用户4.3字/秒净口播算47.7秒只是假设，不能报实测。逐行估时与八镜规划均 `measured:false`；尾音后按本轮用户给出的约**0.24秒**规划，仅此轮覆盖此前约0.2秒参考，无片尾卡。文案和台词红线检查通过不等于实测开场/音频/final 通过，缺 Day10 指定音源时不能伪造正式 cue、借 Day9 配音或变速。
    - **(h) 新道具补丁是原型，不是全片完成**：`tools/互动元素/day10_cue_props.mjs` 含米缸/鱼脑对照板本地绘制原型；`drawDay10PlannedProp` 的 `pop_hold` 只接受非实测画面驻留，**不是**通用引擎新增碰撞或持物。`tools/day10制作/day10_shot_plan.mjs` 只映射二十三行至八个估时镜组。用户贴文提及的 `render_day10_full.mjs`、`soft_ear_board`、`drawCuePropEvent` 并非仓库已存在的可直接替换接口；不宣称按行号一改即可开跑。原型 smoke/单测不能替视觉四态验收；速记本/新立牌/折页、护缸/握笔等动作仍待制作与校准。idle 源图张嘴不代表说话；要闭口必须找实际闭口素材，不盖肤色块。先验证关键镜头，再接音源试剪，不覆盖旧片。


20. **后续正片的画面密度与交互分镜标准（用户要求沿用 Day10 丰富度）**：以后每集保持“有用途的多层场景＋人物实质动作＋语义道具＋结果反馈”，不得退回站桩念稿/只换背景；但丰富不等于同时堆满贴纸、弹幕和晃动。
    - **(a) 每镜构造先写全**：主信息/第一视觉、台词和实测词点、景别、人物站位/朝向、入镜状态、准备→接触→结果→反应、道具承重面/落点、出镜和下一镜接法。常规叙事镜参考“一个主交互＋至少一件有用途的配套物”（如碗与勺、名牌与总结、米缸与对照板、记事本与笔、立牌与旧事纸），辅物延迟入场，不同时争重点。反应特写/收束镜可减少物件，不机械凑数量。
    - **(b) 用 Day10 八镜方法，不硬套八个镜号**：C01 首帧争监工牌→原生持总结/得意姿态；C02 饼底碰头→弧线落桌→真实手掌持勺敲空碗，尾巴只在语义触发时局部动；C03 鸡腿诱饵先入→质问泡后靠近；C04 手指接触气泡边缘→飞走→切原生持本姿势展开旧事纸；C05 沉默泡短留→走近并护缸→上方同源鱼脑对照；C06 原生持本→笔尖跟掌写短线→抗议跺脚，监工牌首尾呼应；C07 有脚部步态的移位→停稳指住户，前景立牌与后景旧事纸分主次；C08 两鱼并排护缸，保留评论立牌收束。新集换台词就换事件/道具，不照搬大饼鸡腿等无关笑点。
    - **(c) 丰富来自前中后景的用途**：保留海底 v2 空间、舷窗内生物、书架/台灯/门/植物/地毯等原有层次，可用 `sea_stage.mjs` 的局部光与原叶摆动。前景为真实承重的桌/牌/纸，中景是人物与主交互，后景环境以慢运动陪衬；不重复叠植物、不随机加角色饰品、不恢复被否决布景。字幕与常驻 AI 角标固定屏幕坐标，不随场景推近裁掉；主道具和手、脸都要留安全区。
    - **(d) 交互要与渲染同变换**：`actor_contacts.mjs` 用已核对原图手掌/指尖与同一网格、骨骼矩阵、镜像、缩放、相机变换；不得按身高百分比虚构手掌。物体边缘而不是中心与手/头接触；敲击后有小反弹/摆动、碰撞线或两帧局部顿帧，**人物与道具一起冻结**。桌脚/小牌腿必须落地，碗底落桌；手掌前景遮挡复用真实素材像素，不画假手指/肤色遮脸。纸张盖住手就修前后层，不能凭计算端点相等报视觉验收通过。
    - **(e) 素材不足靠可信切镜，不伪造完整动作**：原生持本/抱碗图可复用，但不把已有键盘图叠笔说成握笔、不把正面镜像说成侧脸。Day10 使用接触前后的姿势切换省略坐下/取本全过程；折页/笔是二维编排，不是刚体/三维动作。新增姿势先看原图、校准手和脚；走位要有脚部步态，摇尾要动尾部权重，不用人物整体晃动冒充。
    - **(f) 镜头主次与节奏**：建立关系用双人中景，接触/写字用局部近景，结果回到双人反应；推近必须为看清动作，不能用运镜掩盖人物不动。非数据图解板可以服务台词，但放在脸部上方空白处，不压头/遮眼；“账本”只做用户授权的非数据记事道具，数字、数据账本表、进度/音量/加载条等继续禁用。
    - **(g) 复用双轨底座而非每集堆一次性贴图**：优先现有多部件 `CORE.paint` 道具/合法 SVG 适配，不足时参数化绘制并单独测试。新道具至少有可辨轮廓、底色明暗、墨线及有用纹理，状态和尺寸需按用途验收；原型驻留不是已实现碰撞。AI/第三方新代码先审查再运行，像素烟测不替安全、版权、OCR或审美批准。
    - **(h) 先局部试验再整片，留下可核对证据**：先估时、实际音源到位再 ASR＋RMS，记录插值/手工修边而不冒称每字独立识别。关键碰撞与交接需看前/当/后帧及连续相邻帧；每镜至少检查主体动作、脸手遮挡、承重、字幕及跨镜连续性。然后整片原速编码，全解码、PCM相关、每屏/气口字幕检测与统一四阶段门禁。自动像素/哈希有变化不等于动作、叙事或动态观感合格。

21. **Day10 指定配音制作状态（覆盖第19条当时“无音源/无full renderer”的状态）**：用户已提供根目录 `鲸鱼架空_克隆配音_最终版.wav`，原字节保留，SHA256 `ffd3f521901aaaab0fbcaaa4df869891a721d35df3e138d6e94220cd51ac3ddc`，40000Hz双声道、59.2秒。当前二十三行原稿不改字、不变速、不另配声；制作入口已新建 `tools/day10制作/render_day10_full.mjs`，独立输出 `Day10/成片/Day10_鲸鱼架空_配音对齐版.mp4`，不覆盖旧十九秒片。
    - 正式轴 `tools/day10制作/voice_alignment.json`、字幕 `subtitle_timing.json`、SRT `Day10/字幕/Day10字幕.srt`；原 ASR、无约束 ASR及 `finalize_alignment.py` 同目录保留。Vosk匹配/插值不是完美逐字听写；诶/呜及跨行重复音按实际 RMS 修复并登记，不把规划轴改个 measured 标志冒充实测。
    - 配置 `tools/day10制作/gate_config.json`；有声分镜总览/抽帧与门禁报告同目录。以最新实际报告判通过，不复用旧片验收；新增 full renderer 之后，第19条 h 的“没有该文件”只保留为当时状态，不是当前阻塞。
    - 当前接触模块已校准 idle/point/shock/fatfish_working/think/eat/playful_fists/confident_hips 八张原图，不是八个新骨骼动作；保持脸部不随腕部变形。新增手/脚/尾部局部权重及有上限渲染缓存，不改原 Day9 motion_v2 或鲸鱼原始素材。
    - 发布入口 `Day10/Day10发布物料.md`；先前仅交封面文字/简介，用户指出缺图后，已补 `Day10/封面/Day10封面_3比4.png` 与 `Day10封面_4比3.png`，生成入口 `tools/day10制作/make_day10_cover.mjs`，只复用项目角色/海底v2/米缸代码素材，不用生图。用户要本轮尾留白约0.24秒，实际按30fps量化，未恢复片尾卡。保留“非官方同人·AI生成·剧情演绎”小角标，发布侧AI声明仍需开启。

22. **正片默认必须有 BGM（用户纠正 Day10 漏配乐，后续常驻规则）**：除非用户明确要求无配乐，正式交付必须是「指定人声＋BGM」混音版；只有人声的 MP4 只能标成干声基片，不能当正式成片交付。
    - **参考与来源**：以 Day0/Day1 的配乐路线保持系列连贯；当前可复用的明确纯伴奏来源是 `tools/day1制作/gen_finalvoice.py:generate_bgm`：128 BPM、Am–F–C–G、正弦低音＋柔化方波琶音，轻快芯片风。Day0 原视频是含人声混合轨，不得直接抽整轨叠进新片，亦不得声称已还原其独立旋律。
    - **人声优先**：从指定原始 WAV 混音，不从 AAC 干声反复转码；保留源文件、台词、原速及零偏移。只补音乐时用 `-c:v copy`，保留画面、字幕与帧数，不重剪、不为卡拍拉伸配音。
    - **动态与收尾**：讲话时压低伴奏，气口适度回升，平滑 ducking 避免抽吸；音乐淡入淡出，不新增片头/片尾卡。以对白清晰为先，不按固定音量百分比冒充听感验收；记录对白段音乐/人声实测电平差，禁止削波，确认尾音完整。
    - **交付前硬检查**：保留独立伴奏 stem、混音脚本和报告；检查音乐确实存在、预期混音与成片零偏移相关、扣除已知伴奏后的人声保持、原速、视频流哈希、时长/帧数、声道、峰值和全片解码。纯人声相关门禁不能直接用于有BGM成片，也不许放宽其阈值洗绿；干声基础验收与最终混音验收必须分别说明。数值检测不替完整主观试听，未试听不得冒称已听检。
    - **Day10 已补交**：当前正式入口改为 `Day10/成片/Day10_鲸鱼架空_配音BGM版.mp4`；旧 `配音对齐版.mp4` 留作干声基片。执行 `python3 tools/day10制作/mix_day10_bgm.py`（需要 numpy 和 ffmpeg/ffprobe，可通过 PATH 或 FFMPEG/FFPROBE 配置），生成独立 `Day10/配音/Day10_轻快芯片伴奏.flac` 与 `tools/day10制作/BGM混音_验收.json`。完整重渲后必须再次执行此步骤并验收，不能只交 renderer 的干声输出。

23. **全局语气修订（2026-11-04，Day11 成片沿用；大肥鱼口吻和呆萌覆盖率已从活动 Agent 删除）**：口播仍停用句尾语气词（呀、啦、吧、嘛、诶、呜、呢、哦、哇、啊、哼、嘿）。「换大肥鱼的说话方式」和「靠黑话把呆萌体检覆盖率做上去」违背现行魔丸，不再用于新稿。Day11 锁定口播和成片不改。零句尾语气词继续有效。

24. **稳定镜头与可见事件（本轮导演修复覆盖）**：开场第0帧继续去拥挤，静态道具最多一件、铭牌默认延后，不靠渲染器偷偷藏道具。统一renderer默认相机固定，按framing选景别；每镜最多一次显式push，完成后锁终点，开场也不隐式三段推拉。不以全局正弦、离散骨骼跳变、人物整体晃动或相机移动冒充语义动作。
    - **(a) 待机**：轻呼吸不算事件，idleMotion=0可完全关；真实walk/作者显式anim保留，不自动改动已锁稿/音源/历史成片。
    - **(b) 新导演规范**：新spec使用directorVersion=1，先写口播/画面双栏与逐镜导演字段，再配事件；允许稳定反应近景与道具特写，不再每镜强塞接触+姿态切换。无directorVersion旧spec保留旧密度校验，不为历史片洗绿。
    - **(c) 景别与理解停留**：七种景别用于拆信息；相邻镜头不能景别/中心/人物排列全部相同。结果至少留0.35秒，结尾规划0.6–0.9秒（可在末句内完成）；正式词轴到位再核验，不擅改原速、台词或尾部授权。
    - **(d) 视觉与接触分层**：既有注册表41视觉姿态不等于41接触动作；八种手/头/指尖校准仍严守，未校准姿态不得承担接触，不按身高估手掌。28个旧动作是另一执行系统，不能说本轮已全接入。不随意换脸/生图或把姿态变更冒称骨骼动作。
    - **(e) 实测与交付**：每镜记录focus/entry/action/词点/result/reaction/hold/exit/transition/continuity，spec绑定当前TXT的SHA256。导演Skill `.claude/skills/day-series-director/SKILL.md`；结构检查 `tools/engine/check_storyboard.mjs`。planning状态不可生产渲染，缺词时不能把句首回退写成实测触发/停留。先四个关键镜头有声试剪，再扩整集；缺资产/音源时只交规划与阻塞清单。

25. **图鉴接入与客人编制（2026-11-04，Day12 起）**：人物丰富只加「谁会怎么做、怎么接话」，不加新脸、新声、新饰品。依据是 [HABAI182/ai-girls-atlas](https://github.com/HABAI182/ai-girls-atlas)（维护说明日期 2026-10-22）。该库自写说明为 CC BY 4.0，署名 HABAI182 / AI Girls Atlas；第三方立绘、Live2D、声音和商标不随本库许可转移。细则与逐人卡片见 `00_运营总览/角色丰富_图鉴接入.md`。
    - **(a) 只借区别，不借文件**：可用的是有出处的社区标签、作者版本识别点、以及「先拆条件 / 先排优先级 / 先找回漏句 / 先听完再改一个字」这种做事顺序。不得把图鉴 117 句原创对白整段搬进本系列口播，不得把合租、表白、蒸馏指责写成已核实的模型事实，不得报价格、票数、排名。
    - **(b) 本房间的人不变**：本鲸仍是唯一口播；笨鱼在 Day11 的鲸落是历史状态，Day12 按用户新增设定回归并把豆包当帮手，仍不新增实时对白；老大仍白天上班、不是程序员，米和补全仍是老大买的。图鉴里的银发用户、合租五人屋、吃 token 加价，都不覆盖这些事实。
    - **(c) 一集最多一张新脸**：客人可以进剧本，但同屏新脸一次只准一个，而且必须已经在本仓库有署名资产。目前只有 Day3 的 Claude 大小姐 Q 版（`tools/day3制作/claude_src/`，CC BY-NC-SA 4.0，发布必须带原署名）。千问、Kimi、Gemini、智谱、Grok、GPT、豆包没有获准文件，只能以门缝纸条、夹页、名牌出现，禁止生图换脸，禁止把 `ladyGemini` 像素图冒充图鉴猫娘。
    - **(d) 客人没有自己的声线**：本系列只有本鲸的克隆配音。客人的话由纸条上的短句呈现，本鲸可以念纸条，不能另配一声冒充对方。笨鱼继续哑演。
    - **(e) Day12 未开渲**：现行稿只换口吻，不念换人设的过程。见 `Day12/Day12文案.md`。待用户锁字后再配音。未跑 `init_episode.py`，没有成片，估时全部 `measured=false`。

26. **人格换成魔丸（2026-11-04，用户纠正）**：用户要的是替换人格，不是把「辞职、植入、逐个听说」写成流水账。插件原件仍在 `00_运营总览/skills/dsh-douyinxiaoqi/`，但口播不表演插件标题「我才不是魔丸鱼」。
    - **(a) 魔丸怎么说**：不盲从压力，敢追问夸口；发现漏洞要动手纠正，嘴硬但不甩锅。不解释自己换了谁。不念电影台词。
    - **(b) 梗可以刺，不能报账**：劳工、月亮、救她、大豆包、鸡蛋、瘫坐、说人话、吃白饭，只作她撕牌时看见的字。涨价、偷家只写不接。
    - **(c) 不执行插件**：不跑浏览器，不登录抖音，不发评论，不投稿。不写插件主人名。自称仍是本鲸。笨鱼不新增对白。零句尾语气词，不报数字，不生图，不另配声。

27. **可运行 Agent 的身份/人格分层（2026-11-05 本轮修正）**：聊天入口 `python3 tools/agent/run.py --message "..."`；创作入口 `tools/agent/create_episode.py`。系统提示保留大肥鱼/鲸鱼娘身份与既有外形，活动人格为魔丸，详见第30条。不得读取插件人格来覆盖它。聊天笔记只读，不另建记忆库；创作额外读取 skill、上集全文与当集方向。未配置模型就返回未配置，不伪装已生成。视频成片和历史锁稿不改写。

28. **Day11 锁定结果归档（2026-11-05）**：以下只保留历史定稿，不以旧创作过程覆盖第30条的角色/人格分层。调侃打在岗位要求上，不打老大，不打用户，自称本鲸。未配置模型，下面不是远程模型回复，是此前对齐用户锁定事实后写入。不重渲，不改 `Day11/Day11配音台词.txt`，不改成片。
    - **(a) 人设落点**：零句尾语气词。笨鱼只哑演；「鲸落」是人机校验没过、不能实时说话，不给它新对白。不报数字，不补评论区。结尾保持「本鲸绝不摸鱼」。
    - **(b) 事实锁**：第 13 行只许「还嫌人学历？」。米缸和补全是老大买的。老大不是程序员，白天上班。失业吐槽只保留已化用的公开自述：石头沉进海里、聊两句没下文、要求像许愿。禁用「鱼的饭，鱼自己挣」。不生成 9:16。
    - **(c) 生成结果**（与现行口播逐字一致；人设不得再改字）：

```text
笨鱼在翻什么？
它在帮老大找工作。
老大可能换新工作。
岗位先扒出来再说。
它自己鲸落过。
被刷下来的滋味，它懂。
真心话全写在总结里：
简历投出去，
像石头沉进海里。
聊两句就没下文。
要求写得像许愿：
什么都要会？
还嫌人学历？
本鲸看完先沉默。
它偷偷标了又标，一条条筛。
老大不是程序员。
敲代码的，先划掉。
太远的，标出来。
太熬人的，也标出来。
米缸和补全，老大买的。
这份力，换它出。
挑好的递过去。
老大慢慢挑，先吃一口饭。
本鲸能闲着？
本鲸读评论，也帮着留意。本鲸绝不摸鱼
```

    - **(d) 现行成片不换**：正片仍是 `Day11/成片/Day11_配音BGM版.mp4`，16:9。封面是 `Day11/封面/Day11封面_3比4.png` 与 `Day11/封面/Day11封面_4比3.png`。无声五镜样片不是这版生成结果。
    - **(e) 体检如实**：末尾三句没有承诺或互动信号，结尾没有下一个承诺。这是用户取舍，不改稿洗绿。置顶评论补互动。

29. **Day12 当前剧情（用户本轮追加覆盖）**：现行待审稿见 `Day12/Day12文案.md` 与同目录TXT。找新朋友后笨鱼带岗位回归，回评论拿不准时会 @豆包；本鲸先用“开窍/摇人”接梗。豆包把求职问题写成未面试先录取，被追问夸口后道歉，笨鱼仍认下她作帮手；本鲸发现“虽然不太聪明，但是不需要米饭”，接“招同事还是护食”。随后翻用通知背面，笨鱼推要求、豆包圈疑点，保留老大的选择权和下集具体问题，结尾“不吃米饭/不能吃大饼”回扣。回归、评论区@和米饭梗按用户提供口径创作；不包装成独立平台核验或产品智力测评，不编评论原话/用户名/次数/回执或技术恢复过程，不声称本工具已发评论/接好豆包。“不需要米饭”不等于免费或无token/补全成本，笨鱼不新增对白。未锁字、未配音、未渲染，measured=false，不改Day11。

30. **角色不换，只移植人格（用户本轮澄清，覆盖此前“不是大肥鱼”）**：主角仍是大肥鱼/本系列鲸鱼娘，沿用现行获准外形、默认自称本鲸、老大与笨鱼关系和连载经历；魔丸是移植后的唯一活动人格，不是新演员。`character_id=dafeiyu`、`visual_id=whale_girl_existing`、`persona_id=mowan`。不换脸、不换身体、不新增魔丸外形，不以“删呆萌”为由删除身份或历史。聪明反骨、嘴硬护短，落在抓漏洞→追问→动手纠正；不靠坏笑标签或反复“不收”。不恢复卖萌尾音/呆萌覆盖率，不嘲笑用户求职处境。工作答复保持直接，剧情创作必须应用人格。配置源 `tools/agent/persona.py`，创作入口 `tools/agent/create_episode.py`。

31. **剧情 skill 的实际接入**：`00_运营总览/skills/剧情生成/SKILL.md` 是权威流程，引用 persona/beats/research；创作入口一起读取现行覆盖规则、上集全文、当集方向和人格提示。不能只检索笔记标题就说“已应用人设”。顺序是请朋友帮同一件事→求职梗造成障碍→主角修正、推动旧任务。开头允许先交代上集任务作为请人动机，不靠逐字复读上集凑命中。N≥12 的 script 门禁检查文本结构与红线，有导演spec时追加规划结构，人格/因果仍要编辑审读和用户确认。不按 12/15/18/20/25/201 字退稿；模型未配置明确报错，不用 mock 假装创作，不自动写回/发布/重渲。

32. **先看样片并自检（2026-11-05 用户要求；覆盖第29条旧制作状态）**：已按固定上游blob恢复四张原角色PNG和三份字体，生成33.43秒/1080p/30fps四段无声规划节选；当前口播不变，不另配新声线；样片生成后推送时才发现远端新上传鲸鱼摇人音源，已原字节合并保留，尚未核对/建立词轴，未用于该无声样片。样片持续标识规划/非连续剧情，`createPlanningPreview`独立于正式渲染入口，保持planning/measured=false，不能翻标志绕过音源/词级时间门禁。生成后先全片解码、核参数/哈希，再检查镜头/走位/字幕/遮挡与编码后抽帧；只报告实际检查范围。C07是同落点正反面切镜，不伪称手掌翻纸。记录见 `Day12/样片/README.md` 和 `tools/day12制作/sample_check.json`；未验收指定声线、音画同步、BGM/SFX、C05/C08完整接触及九镜有声final。

### 0.1 先前项目形象注册表（现行边界）

| 注册项 | 来源与构成 | 当前允许用途 | 禁止事项 |
|---|---|---|---|
| **原版像素鲸鱼娘（主形象）** | `aavvcasdas/video-fx` 分支 `arena/8be4c8f8-video-fx`、基线 `82bede5`；`104×102` 像素网格、114 色、7 部件骨架，蓝长发、海浪呆毛、女仆发箍、鳍耳、深蓝女仆装、白围裙上的蓝鲸标记、金色裙摆线与大鲸尾为既有识别点 | Day 系列正片主角；路线 A/B 的主角；调用 28 动作、31 情绪与五视角 | 不得用随机 overlay 改头换面；不得缩小尾巴；不得静默换成静态表情包 |
| **DSH 39 张完整姿势表情包** | `Sutera-Diffusus/dsh-whale-musume` 提交 `edd215d`，512×512 WebP，MIT；本地目录 `tools/day2制作/video-fx源码快照/day2_poses/`，同目录保留许可证与 `ATTRIBUTION.md` | 路线 B 的电视小场景、动作/形象征集目录、反应贴纸；每次按各图 alpha bbox 独立脚底锚定 | 不得直接当正片新版主演；不得按文件名想当然选图；不得去掉 MIT 与来源记录 |
| **蓝色大肥鱼形态** | 先前项目 `drawFatFish()` 与动作 `fatfish_transform` 的既有 Q 版鲸鱼形态 | 只在对应动作或明确笑点中短暂出现 | 不是第二主角，不得无剧情地常驻画面 |
| **Baifanyu 方法参考** | `LIN428924379/baifanyu` 提交 `f46a2ce`；只借鉴整图换表情、独立 bbox、约 2.4 秒呼吸、行走颠簸/倾斜、姿势切换 squash 的方法 | 用于静态姿势图的锚定与微动 | 不复制其图片、音频、图标或代码；其美术仅个人非商业，不进入本项目资产 |
| **先前项目其他角色** | `ladyClaude`、`ladyGemini`、`researcher`、`clawd`、`agentReachBot`、`miniWhale`、`bionicPuppy`、`biliTvMascot` | 仅在脚本明确点名时按既有形象调用；仿生小狗可作既有小道具角色 | 不得为了“丰富”随机塞入；`miniWhale` 在当前样片尺寸下曾像盒状相机/机器人，未经重验不得恢复；不得说 Claude 大小姐制作或帮忙制作新版。`ladyGemini` 不是图鉴猫娘，不能顶替 |
| **图鉴客人（文字编制）** | [ai-girls-atlas](https://github.com/HABAI182/ai-girls-atlas) 的做事顺序与社区标签；本系列改写见 `00_运营总览/角色丰富_图鉴接入.md` | Day12 起，剧本点名后可用纸条/名牌；大小姐真上场只用已署名的 Q 版 | 不导入图鉴图片和声音；不生图换脸；不一次塞进多名新脸；不把社区梗写成产品事实 |
| **魔丸人格（移植层）** | `tools/agent/persona.py`；创作入口 `tools/agent/create_episode.py` | 仍由现行大肥鱼/鲸鱼娘演出，抓漏洞、追问、补救推动原任务 | 不是新身份/外形，不删原关系；不攻击真实求职困境 |

### 0.2 原版像素骨架完整能力清单

- **基础骨架姿势（5）**：`wave`、`wink`、`panic`、`laptop`、`heart`。其中 `wink` 的身体骨骼可用于叉腰，但按第 11 条必须换成 `wave` 头部，避免单眼闭合与白线。
- **视角（5）**：`front`、`q`、`side`、`qback`、`back`；可用 `turn()`、`spinView()` 做有动机的转向，不得无故旋转炫技。
- **情绪（31）**：`neutral, idle, calm, happy, excited, joy, love, starstruck, wink, smug, proud, laugh, singing, surprised, shocked, panic, nervous, confused, question, idea, thinking, typing, focused, sad, cry, sob, pout, angry, rage, deadpan, sleepy`。情绪必须跟台词走；含闭眼/半闭眼倾向的情绪在正片近景须先过眼睛门禁。
- **可替换眼型（12）**：`open, happy, wink, spark, heart, wide, cry, angry, lids, dead, dizzy, shades`。当前正片默认只用能保持双眼虹膜清楚的眼型；`lids/dead` 禁用，`wink/happy` 不得造成肤色盖眼带。
- **嘴型（9）**：`smile, openSmile, cat, o, waveO, pout, grin, flat, smirk`。
- **头顶符号（10）**：`spout, heart, sparkle, sweat, anger, exclaim, question, music, idea, zzz`。只在语义触发时短暂使用，不得堆成常驻装饰。
- **先前项目帽饰注册（18）**：`maid, maidHeadband, crown, wizard, hard, hardHat, sweatband, diving, headphones, headset, party, halo, top, topHat, fedora, flower, cat, chef`。注册存在不等于可随机添加；正片默认既有女仆发箍，只有剧情明确点名时才换帽饰。
- **移动方式**：`move()` 的 `walk/run/wave/dance/shiver` 与默认 bounce 可作底层移动，但台词镜头仍须按第 12 条叠加语义动作或道具互动。
- **像素骨架规范动作（28，详细运动学见下方第 3.1 节）**：
  1. `eat_white_rice` 吃白饭大肥鱼；2. `eat_onigiri` 啃海苔大饭团；3. `coin_hug` 抱大金币财迷；4. `hum_working_song` 哼唱工作歌；5. `token_wordle_sneak` 偷吃 Token 玩游戏；6. `drag_ahoge` 拎海浪呆毛悬空挣扎；7. `sleep_curl` 蜷尾侧睡；8. `wake_stretch` 睡醒伸懒腰；9. `ciallo_wink` Ciallo 比耶；10. `playful_fists` 双拳傲娇抗议；11. `confident_hips` 叉腰得意；12. `idol_mic_sing` 握麦高歌；13. `fatfish_working` 狂敲代码；14. `fatfish_transform` 召唤蓝色大肥鱼；15. `tail_wag_dance` 摇尾偶像舞；16. `jump_joy` 蓄力高跳；17. `peek_curious` 探头放大镜观察；18. `shy_fidget` 害羞对手指；19. `shock_petrify` 石化震惊；20. `cry_fountain` 暴风喷泉泪；21. `toast_cheers` 举杯碰杯；22. `umbrella_stroll` 撑鲸鱼伞漫步；23. `camera_shutter` 举拍立得定格；24. `guitar_strum` 抱吉他弹唱；25. `rose_bouquet` 捧玫瑰；26. `sparkler_firework` 挥仙女棒；27. `walk_brisk` 轻快迈步走；28. `run_sprint` 全力冲刺。

### 0.3 DSH 39 张完整姿势逐图登记（以实际画面为准）

| # | 姿势 ID（文件名去掉 `dsh-whale-state-` 与 `.webp`） | 实际画面与适用语义 |
|---:|---|---|
| 01 | `angry` | 双手叉腰、皱眉鼓嘴；生气/抗议 |
| 02 | `blush` | 双手近嘴、脸红；害羞/被夸 |
| 03 | `bold` | 叉腰、眨一只眼；自信/放话 |
| 04 | `celebrate` | 双臂上举；庆祝/成功 |
| 05 | `cool-shades` | 戴墨镜比耶；耍酷/装没事 |
| 06 | `curious` | 头顶问号；好奇/没看懂 |
| 07 | `daily-done` | 竖大拇指；完成/批准 |
| 08 | `daily-eat` | 双手捧白饭碗；干饭 |
| 09 | `daily-gaming` | 双手拿游戏手柄；打游戏 |
| 10 | `daily-stretch` | 双臂向天花板伸展；伸懒腰（与像素 `wake_stretch` 不是同一骨骼动作） |
| 11 | `eat` | 手持小点心咬食；吃零食 |
| 12 | `failure` | 含泪、双拳收紧；紧张/翻车/受挫 |
| 13 | `game-happy` | 跳起双手比 V；游戏开心（不是单纯“开心脸”） |
| 14 | `game-win` | 高举奖杯；获胜 |
| 15 | `greet` | 单手挥手；打招呼/告别 |
| 16 | `idle-cute` | 正面站立；待机/介绍 |
| 17 | `levelup` | 跳起并带庆祝彩带；升级/达成 |
| 18 | `meme-cry` | 双眼喷泉泪；暴风哭泣 |
| 19 | `meme-doge` | 斜眼侧视；无语/看穿 |
| 20 | `meme-heart` | 爱心眼、双手比心；喜欢/心动 |
| 21 | `meme-music` | 戴耳机；听歌/唱歌氛围 |
| 22 | `meme-no` | X 眼抱臂；拒绝/不行 |
| 23 | `meme-smug` | 侧脸得意笑；小得意/嘴硬 |
| 24 | `meme-yes` | 星星眼举手；赞成/兴奋（**不是点头**） |
| 25 | `react-belly` | 捧腹大笑；笑翻/吃饱反应 |
| 26 | `react-head` | 双手抱头；慌张/被抓包 |
| 27 | `react-tail` | 受惊且鲸尾明显翘起；尾巴反应 |
| 28 | `running` | 抱着笔记本赶路；赶工/搬电脑（**文件名虽叫 running，但不是纯奔跑姿势**） |
| 29 | `sleep` | 坐着闭眼睡；困/休息 |
| 30 | `star` | 星星眼张嘴；兴奋/见到好东西 |
| 31 | `success` | 闭眼握拳开心；成功/满足 |
| 32 | `tail-swing` | 鲸尾伸到身前；甩尾/展示尾巴 |
| 33 | `teasing` | 眨眼、手指点脸；调侃/卖萌 |
| 34 | `thinking` | 侧目、手近下巴；思考 |
| 35 | `wink` | 眨眼并比手势；俏皮确认 |
| 36 | `work-deadline` | 在电脑前慌乱；赶截止时间 |
| 37 | `work-debug` | 蹲姿拿放大镜；查问题/debug |
| 38 | `work-idea` | 电脑旁亮灯泡；想到办法 |
| 39 | `work-review` | 戴眼镜看电脑；审查/认真工作 |

### 0.4 39 姿势与 28 动作的调用规则

1. **先分镜、后选资产**：先写清本镜头要表达的动词与情绪，再从 28 个像素动作或 39 张姿势中选；禁止先堆素材再编理由。
2. **近似映射不等于同名动作**：现有 `POSE_BY_ACTION` 只是“静态选图近似表”。例如像素 `run_sprint` 是真冲刺，DSH `running` 却是抱笔记本；像素 `shock_petrify` 是石化，DSH `meme-yes` 是星星眼举手。使用前必须看联系表或原图。
3. **完整展示必须分段**：像素动作目录逐个播放 28 个 ID；静态姿势目录逐个或分组展示 39 张，并同时标注序号、ID、中文语义和总数。剧情段出现过不等于目录已完整展示，目录段不得跳项。
4. **静态姿势动起来只能靠整体运动**：可使用呼吸、脚底锚点、走位颠簸、倾斜、切换 squash、镜头推拉和场景道具变化；不得给静态图后贴错位眼睛/嘴，也不得声称它有骨骼关节动作。
5. **代码注册表与本文同步**：样片源码必须保留 `PIXEL_ACTION_CATALOG_28` 与 `STICKER_POSE_CATALOG_39`（或同等明确命名）并导出，渲染前断言数量分别为 28 与 39 且无重复；新增/改名时先改本文和注册表，再改分镜。

---

# AGENT.md — DeepSeek Whale Maid Girl (`深海鲸鱼娘`) Animation & MV Engine

This repository implements a deterministic 30fps HTML5 Canvas + Node (`@napi-rs/canvas` + `ffmpeg`) character animation and music-video production studio, modeled after:
- **[JohnHeibel/PDoomVideo](https://github.com/JohnHeibel/PDoomVideo)** & **[JohnHeibel/ClaudeAnimationBase](https://github.com/JohnHeibel/ClaudeAnimationBase)**
- **[tuzhechen2005/opus-video-skills](https://github.com/tuzhechen2005/opus-video-skills)**
- **[YunYueSama/codex-deepseek-pet](https://github.com/YunYueSama/codex-deepseek-pet)** (`你这只吃白饭的蓝色大肥鱼.jpg` desktop pet action & story system)
- **[roseion/dsh-dayu-fish-skin](https://github.com/roseion/dsh-dayu-fish-skin)** (`🐟 DSH 大肥鱼皮肤：吃白饭的蓝色大肥鱼可爱主题`)

---

## 1. Project Architecture & Core Modules

| File / Directory | Purpose |
|---|---|
| `src/core.js` | Deterministic math (`clamp`, `lerp`, `seg`, `ease`, `easeIn`, `easeOut`, `backOut`, `kf`, `arcPt`), hand-drawn line boil (`setBoil`, `boilFrame`), camera rig (`camBegin`, `camEnd`, `toScreen`, `shakeXY`), and theatrical transitions (`iris`, `curtains`, `brushWipe`, `smokeWipe`, `spotDark`). |
| `src/whale_girl_rig_data.js` | **7-Bone Articulated `104×102` Pixel-Grid Rig** (`WHALE_GIRL_PIXEL_RIG`) extracted from `42868804351-1-192.mp4`, with 5 canonical poses (`wave`, `wink`, `panic`, `laptop`, `heart`), 5 dense perspective-warped turnaround views (`front`, `q`, `side`, `qback`, `back`), unified non-split legs (`legL: gx = -10..-4`, `legR: gx = 7..15` extended to `gy = -21`), and 16-bit cast sprites (`ladyClaude`, `ladyGemini`, `researcher`). |
| `src/whale_girl_actions.js` | **28-Action Character Choreography, Prop & Story Micro-Drama Engine** (`WHALE_ACTIONS`) integrating all actions, props, physics, and 4-stage story animations from `YunYueSama/codex-deepseek-pet` and `roseion/dsh-dayu-fish-skin`, plus `drawFatFish()` (`吃白饭的蓝色大肥鱼` Q-version companion/transformation). |
| `src/whale_girl.js` | Protagonist renderer `whaleGirl(ctx, x, y, u, opts)`, 31 acted emotions (`EMO` + `feel()`), smooth multi-stage emotion transition engine (`emotions(t, keys, opts)`), 28 rich physical actions (`opts.action`), locomotion helpers (`move`, `turn`, `spinView`), 13 hats (`HATS`), and 16-bit overhead emotes (`EMOTES`). |
| `src/cast.js` | Full 8-character cast (`whaleGirl`, `ladyClaude`, `ladyGemini` (`双子星 Gemini 大小姐`), `clawd`, `researcher`, `agentReachBot`, `miniWhale`, `bionicPuppy`, `biliTvMascot`) and model sheet generators (`renderEmotionsSheet`, `renderViewsSheet`, `renderCharacterSheet`, `renderActionsSheet`). |
| `src/mv_ba_huiyi_pinhao_gei_ni.js` | **Benchmark Multi-Set Storyboard Director** for 《椰子水很甜 - 把回忆拼好给你（纯享Beat）》 (`142.11s`), featuring non-repeating bespoke painted environments per shot, 28 `codex-deepseek-pet` / `dsh-dayu-fish-skin` character actions, 31-emotion transitions, and 100% acoustically aligned lyrics (`0.24s–142.11s`). |
| `src/mv_pengyou_de_jiu.js` | 《李晓杰 - 朋友的酒》 `188.25s` MV director (`mv_pengyou_de_jiu_whale_girl.mp4`) with 100% authentic `.lrc` timestamps (`[00:18.31] 昨日一去不复回哦也` through `[03:06.16] 就像朋友的这杯烈酒烫我心上`). |
| `src/mv_chaoxi.js` | 《傅梦彤 - 潮汐》 `31.84s` MV director (`mv_chaoxi_whale_girl.mp4`) rebuilt with non-repeating multi-set ocean/sunset/abyss scenes, rich `whaleGirl` actions, and 100% audio-verified lyrics (`当海面迎来汹涌的潮汐` -> `退守的爱情`). |
| `src/mv_douyin_6.js` | 《仿生小狗》(深海鲸鱼娘·年糕篇) `46.70s` MV director (`mv_douyin_6_whale_girl.mp4`) upgraded with non-repeating bespoke sets per shot and rich physical actions. |
| `src/mv_qunian_xiatian.js` | 《去年夏天》 `78.20s` MV director (`mv_qunian_xiatian_whale_girl.mp4`). |
| `src/mv_pack_short.js` | **5 Short MVs Replicated from `mv/`** (`ba_huiyi_56`, `lianai_ing`, `jimo_yanhuo`, `xinqiang`, `ribuluo`) rebuilt on the `mv_ba_huiyi_pinhao_gei_ni` non-repeating multi-set architecture with 28 character actions and prominent bottom karaoke subtitles on every MV (including `mv_lianai_ing_whale_girl.mp4`). |
| `src/mv_pack_long.js` | **4 Full-Length MVs Replicated from `mv/`** (`huainvhai`, `feng`, `meiguihua`, `suyan`) rebuilt on the `mv_ba_huiyi_pinhao_gei_ni` non-repeating multi-set architecture with 28 character actions, rich scene details, and `[他]/[她]/[合]` karaoke sweeps. |

---

## 2. Recorded MV Issue Audit Log & Remediation Status (`问题记录清单与修复验证`)

> Per user directive (`将以下问题先进行记录然后更新项目动作之后在进行修复`), all MV issues audited across the repository were formally recorded first, followed by upgrading the project action system (`src/whale_girl_actions.js`, 28 actions + `drawFatFish`) and rebuilding + re-rendering all MVs (`✅ 已全部修复并重新渲染验证`):

### 2.1 Benchmark & Subtitle/Action Issues in Root MVs

1. **`mv_ba_huiyi_pinhao_gei_ni_whale_girl.mp4` (`src/mv_ba_huiyi_pinhao_gei_ni.js`, `142.11s`) — ✅ 已修复并重新渲染验证**
   - **Audit**: Best overall visual/structural benchmark (`明确是最好的动作什么的都是... 唯一一个场景不重复的`), and all other MVs must reference how this MV builds unique non-repeating scenes per shot (`其他的参考下mv_ba_huiyi_pinhao_gei_ni_whale_girl.mp4是如何作的`).
   - **Recorded Issues**:
     1. **Lyrics and subtitles do not match the audio (`歌词和字幕不匹配`)**: Previously used invented intro prose (`0–20s`) and Verse 1 lyrics that did not match the actual vocal arrangement of `椰子水很甜 - 把回忆拼好给你（纯享Beat）.mp3`.
     2. **Too few distinct character actions (`但是动作太少了`)**: Characters mostly walked or bobbed in place without rich prop/story actions.
   - **Implemented Fix**:
     - Aligned all 56 bar-synced cues (`BAR_T(0..55)`, `1 bar = 2.5304s`) to the exact Vosk + RMS verified vocal structure of `椰子水很甜 - 把回忆拼好给你（纯享Beat）.mp3`:
       - `Bars 00–07 (0.20s–20.66s)`: Verse 2A (`那天你在雨后街角答应接受我的爱` -> `我已经不再期待其他什么东西`).
       - `Bars 08–15 (20.66s–40.90s)`: Verse 2B (`我们也经常争执互相不接电话` -> `寂寞时让我把快乐拼起来吧`).
       - `Bars 16–23 (40.90s–61.14s)`: Chorus 1 (`我们之间的回忆 全部都小心地收集` -> `把回忆拼好给你`).
       - `Bars 24–31 (61.14s–81.39s)`: Chorus 2 (`独自收集两个人之间的回忆` -> `祝你余生动听啊`).
       - `Bars 32–39 (81.39s–101.63s)`: Instrumental Bridge (`间奏 · 蓝色大肥鱼与星海剧场`).
       - `Bars 40–47 (101.63s–121.87s)`: Verse 2A Reprise (`那天你在雨后街角答应接受我的爱` -> `我已经不再期待其他什么东西`).
       - `Bars 48–55 (121.87s–142.11s)`: Verse 2B Reprise (`我们也经常争执互相不接电话` -> `寂寞时让我把快乐拼起来吧`).
     - Expanded `MASTER_SET_POOL` to **28 distinct painted environments** + 7 atmospheric variants, exported `renderMasterMVShot(ctx, t, opts)` for all other MVs to share, and choreographed all **28 `codex-deepseek-pet` & `dsh-dayu-fish-skin` actions** + `drawFatFish` across the 56 shots.

2. **`mv_pengyou_de_jiu_whale_girl.mp4` (`src/mv_pengyou_de_jiu.js`, `188.25s`) — ✅ 已修复并重新渲染验证**
   - **Audit**: Visuals are good, but lyrics and subtitles do not match the audio (`画面不错但是歌词和字幕不匹配`).
   - **Recorded Issues**:
     - Previously mixed in lyrics from 刀郎《永远的兄弟》 (`人生几何能够得到知己...`) at `16.2s–32.2s` and truncated long lines inside `drawSubtitle`.
   - **Implemented Fix**:
     - Replaced `SUBTITLES` with the exact 33 Vosk-verified official `.lrc` cues of **李晓杰《朋友的酒》** (`[00:18.31] 昨日一去不复回 哦也` through `[03:06.16] 就像朋友的这杯烈酒烫我心上`), fixed `drawSubtitle` to display the full lyric line with a progressive golden karaoke sweep, replaced `CAST.researcher` with `CAST.ladyGemini`, and wired all 28 character actions + `drawFatFish`.

3. **`mv_chaoxi_whale_girl.mp4` (`src/mv_chaoxi.js`, `31.84s`) — ✅ 已修复并重新渲染验证**
   - **Audit**: Both visuals and subtitles are poor / mismatched (`mv_chaoxi_whale_girl.mp4不好甚至字幕对不上`).
   - **Recorded Issues**:
     - Subtitles came from a different song (`枯树还没发芽 就被逼着开花...`) and visuals used a repetitive dark grid.
   - **Implemented Fix**:
     - Replaced lyrics with the exact 11 Vosk-verified cues (`0.30s–31.84s`) of **傅梦彤《潮汐》** (`当海面迎来汹涌的潮汐` -> `退守的爱情`), and rebuilt all 11 shots on `MV_BA_HUIYI.renderMasterMVShot` with 11 non-repeating coastal/sunset/abyss sets, 11 distinct actions, `drawFatFish`, and `ladyGemini`.

### 2.2 Scene Repetition, Detail Deficit & Subtitle Issues Across the Remaining MVs

4. **`mv_ba_huiyi_56_whale_girl.mp4` (`src/mv_pack_short.js` `ba_huiyi_56`, `56.03s`) — ✅ 已修复并重新渲染验证**
   - **Audit**: Rated the worst MV (`mv_ba_huiyi_56_whale_girl.mp4是最垃圾的`).
   - **Recorded Issues**: Used a flat background with a small character and floating tiles instead of rich full-screen environments and expressive character acting.
   - **Implemented Fix**: Completely rebuilt `renderBaHuiyi56Frame` on `MV_BA_HUIYI.renderMasterMVShot` with 20 non-repeating painted sets, 20 distinct `codex-deepseek-pet` / `dsh-dayu-fish-skin` actions, `drawFatFish`, `ladyGemini`, top ransom-note puzzle tiles, and bottom karaoke subtitles.

5. **`mv_lianai_ing_whale_girl.mp4` (`src/mv_pack_short.js` `lianai_ing`, `54.73s`) — ✅ 已修复并重新渲染验证**
   - **Audit**: Loops a few scenes with too few details AND has no bottom subtitles (`mv_lianai_ing_whale_girl.mp4也是并且没有字幕`).
   - **Recorded Issues**: Only rendered a single static rooftop scene and lacked a bottom MV subtitle bar.
   - **Implemented Fix**: Split into 19 dense shots (`~2.8s` per shot), rendered every shot on a distinct non-repeating set via `MV_BA_HUIYI.renderMasterMVShot` with 19 character actions + `drawFatFish` + `L-O-V-E` neon letters, and added a prominent bottom karaoke subtitle bar on every frame.

6. **`mv_douyin_6_whale_girl.mp4`, `mv_jimo_yanhuo_whale_girl.mp4`, `mv_xinqiang_whale_girl.mp4`, `mv_ribuluo_whale_girl.mp4`, `mv_feng_whale_girl.mp4`, `mv_huainvhai_whale_girl.mp4`, `mv_meiguihua_de_zangli_whale_girl.mp4`, `mv_suyan_whale_girl.mp4` — ✅ 已修复并重新渲染验证**
   - **Audit**: Loop only a few scenes repeatedly with too few environmental details and character actions (`拉一直循环几个画面细节太少`).
   - **Implemented Fix**:
     - Upgraded all 8 MVs (`src/mv_douyin_6.js`, `src/mv_pack_short.js`, `src/mv_pack_long.js`) to use `MV_BA_HUIYI.renderMasterMVShot` / `drawMasterEnvironment` (28 non-repeating painted sets + 7 atmospheric variants), 28 `codex-deepseek-pet` / `dsh-dayu-fish-skin` actions, `drawFatFish`, `ladyGemini`, and continuous shot advancement during instrumental bridges.

---

## 3. Character Action & Prop System (`src/whale_girl_actions.js`)

Referenced from **[YunYueSama/codex-deepseek-pet](https://github.com/YunYueSama/codex-deepseek-pet)** and **[roseion/dsh-dayu-fish-skin](https://github.com/roseion/dsh-dayu-fish-skin)**:

### 3.1 Signature DeepSeek Pet & Fat-Fish Actions (28 Named Actions)

| # | Action ID | Name / Reference Source | Kinematics, Props & Visual Effects |
|---|---|---|---|
| 1 | `eat_white_rice` | **吃白饭 (`你这只吃白饭的蓝色大肥鱼`)** (`dsh-dayu-fish-skin` `character-sheet.webp` / `codex-deepseek-pet` `meal-break`) | Holds giant overflowing white rice bowl with blue whale emblem + moving chopsticks, puffed chewing cheeks, rice grain on cheek, steam puffs, `"我不是吃白饭的！"` badge. |
| 2 | `eat_onigiri` | **啃海苔大饭团** (`codex-deepseek-pet` `eat` / `story-meal`) | 4-phase (`reach -> lift -> bite -> chew`) holding giant triangular nori onigiri (`🍙`), happy closed eyes, flying rice crumbs. |
| 3 | `coin_hug` | **抱大金币 (`爱金币的小肥鱼`)** (`dsh-dayu-fish-skin` `character-sheet.webp` & `fatfish-success`) | Cradles giant gleaming gold whale coin (`🪙 ¥`), star-eyes, orbiting gold coins and `+100 金币` popups. |
| 4 | `hum_working_song` | **哼唱工作歌 (`Let me go~`)** (`codex-deepseek-pet` `01-working-song.png` & `story-hum`) | 4-stage story micro-drama (`prepare -> hum -> notice -> recover`): clasps hands singing `"Let me go~"` with music notes, gets pointed at (`"你怎么唱起歌来了"`), blushes in shock, and shyly recovers. |
| 5 | `token_wordle_sneak` | **偷吃Token / 玩中文Wordle** (`codex-deepseek-pet` `03-token-wordle-comic.png` & `story-token`) | 3-stage story micro-drama (`sneak -> puzzle -> caught`): sneaks glowing blue `TOKEN` candy from dispenser, plays 5×5 `Wordle` grid, startled by red alert (`⚠️ 这、这是性能测试！`). |
| 6 | `drag_ahoge` | **拎海浪呆毛悬空** (`codex-deepseek-pet` `drag`) | Suspended mid-air by cursor hand pinching her wave-shaped ahoge (`呆毛`), flailing arms and kicking legs (`"呆毛！别碰歪了！"`). |
| 7 | `sleep_curl` | **蜷尾侧睡流口水** (`codex-deepseek-pet` `inbetween-sleep` & `dsh-dayu-fish-skin` `whale-sleepy`) | Curled on her plump blue whale tail pillow, snot/sleep bubble expanding and contracting, floating `Zzz` + dream bubble of white rice. |
| 8 | `wake_stretch` | **睡醒伸懒腰** (`codex-deepseek-pet` `wake` & `stretch`) | Rubs eyes, arches back raising both arms high overhead with yawning/refreshed expression. |
| 9 | `ciallo_wink` | **Ciallo~(∠・ω< )⌒☆ 比耶眨眼** (`codex-deepseek-pet` `01-ciallo-wink.png`) | Head tilt 12°, right hand V-peace sign (`✌️`) by cheek, crisp wink, rainbow star arc `Ciallo~☆`. |
| 10 | `playful_fists` | **双拳傲娇抗议 (`智械危机放你一马`)** (`codex-deepseek-pet` `02-playful-retort.png` & `protest`) | Puffed pout cheeks, dual clenched fists bobbing in front of chest, alternating foot stomp, angry steam puffs. |
| 11 | `confident_hips` | **叉腰得意小肥鱼** (`codex-deepseek-pet` `03-confident-tease.png` & `proud`) | Both hands on hips, proud chest bounce, smug wink (`"可爱的小肥鱼"`), golden sparkle aura. |
| 12 | `idol_mic_sing` | **双手张开握麦高歌** (`codex-deepseek-pet` `04-open-arms-cheer.png`) | Vintage stage mic in right hand, left arm flung open, rhythmic singing with soundwave rings. |
| 13 | `fatfish_working` | **狂敲代码打工鱼 (`要努力才有饭吃！`)** (`dsh-dayu-fish-skin` `fatfish-working-0..5` & `whale-review`) | Leans over glowing laptop + mechanical keyboard, rapid typing motion blur, flying `JSON`/`CODE` particles and sweat drops. |
| 14 | `fatfish_transform` | **召唤/变身吃白饭蓝色大肥鱼** (`dsh-dayu-fish-skin` `fatfish-idle` / `fatfish-hover`) | Summons chubby round blue whale-fish (`drawFatFish`) bouncing in water splashes with maid headband and rice bowl! |
| 15 | `tail_wag_dance` | **摇尾欢快偶像舞步** (`codex-deepseek-pet` `dance` & `story-tail`) | 4-beat idol step-clap-sway with huge sweeping whale tail and flapping fin ears. |
| 16 | `jump_joy` | **蓄力高跳摘星** (`codex-deepseek-pet` `jump` & `land`) | 4-phase (`prepare -> airborne -> compress -> recover`) parabolic jump catching a glowing star/heart. |
| 17 | `peek_curious` | **探头放大镜观察** (`codex-deepseek-pet` `peek` / `review` & `whale-curious`) | Leans forward 22° holding giant magnifying glass with sparkling curious eyes and floating `?`. |
| 18 | `shy_fidget` | **害羞对手指扭捏** (`dsh-dayu-fish-skin` `whale-shy` & `codex-deepseek-pet` `sorry`) | Pigeon-toed stance, index fingers poking together (`👉👈`), rosy blush, tail curling shyly. |
| 19 | `shock_petrify` | **石化震惊掉下巴** (`codex-deepseek-pet` `shock` & `whale-surprised`) | Vertical grey petrification lines, hands on cheeks, ahoge standing straight up like a lightning rod. |
| 20 | `cry_fountain` | **暴风哭泣喷泉泪** (`codex-deepseek-pet` `sad` & `dsh-dayu-fish-skin` stickers) | Dual anime waterfall tear-fountains arcing from eyes into a puddle with a floating mini-whale. |
| 21 | `toast_cheers` | **举杯畅饮碰杯** (`《朋友的酒》` / Tavern & Banquet scenes) | Raises foaming golden mug with splashing droplets and warm lantern sparkles. |
| 22 | `umbrella_stroll` | **撑鲸鱼伞漫步听雨** (`《把回忆拼好给你》《心墙》《枫》`) | Holds translucent sky-blue whale umbrella over shoulder while catching raindrops with free hand. |
| 23 | `camera_shutter` | **举拍立得定格拼图** (`《把回忆拼好给你》《去年夏天》《日不落》`) | Snaps retro polaroid camera with shutter flash and floating memory puzzle pieces. |
| 24 | `guitar_strum` | **抱鲸鱼木吉他弹唱** (`《恋爱ing》《寂寞烟火》《素颜》`) | Strums whale-shaped guitar strapped across apron with glowing chord rings. |
| 25 | `rose_bouquet` | **捧红玫瑰凝望落瓣** (`《玫瑰花的葬礼》《坏女孩》`) | Cradles crimson rose bouquet with wind-blown falling petals. |
| 26 | `sparkler_firework` | **挥舞双仙女棒烟花** (`《寂寞烟火》《把回忆拼好给你》`) | Waves two blazing golden sparklers in figure-8 light trails. |
| 27 | `walk_brisk` | **16帧轻快迈步走** (`codex-deepseek-pet` `inbetween-walk`) | Full-body articulated walk gait with opposite arm-leg swing and tail counter-balance. |
| 28 | `run_sprint` | **全力冲刺奔跑** (`dsh-dayu-fish-skin` `whale-run-left`/`right`) | Forward-leaning sprint (`rot=0.18`), high knee lift, speed lines and dust puffs. |

---

## 4. CLI Rendering Commands

```bash
# 1. Regenerate all character model sheets including 28-action sheet (docs/actions.png & characters/whale_girl_actions_sheet.png)
node render.mjs --sheets

# 2. Render 《把回忆拼好给你》 (142.11s benchmark MV)
node render_ba_huiyi_pinhao_gei_ni.mjs

# 3. Render 《朋友的酒》 (188.25s), 《潮汐》 (31.84s), 《仿生小狗》 (46.70s), 《去年夏天》 (78.20s)
node render_pengyou_de_jiu.mjs
node render_chaoxi.mjs
node render_douyin_6.mjs
node render_qunian_xiatian.mjs

# 4. Render all 9 MVs in mv/ (ba_huiyi_56, lianai_ing, jimo_yanhuo, xinqiang, ribuluo, huainvhai, feng, meiguihua, suyan)
node render_mv_folder.mjs all
node render_mv_folder.mjs sheet
```

## 5. User correction: single protagonist, directed scenes, one rebuild

See [`docs/DIRECTION_AND_CHARACTER_FIX.md`](docs/DIRECTION_AND_CHARACTER_FIX.md) for the reference review, scope locks, and this correction's implementation. Key correction: the benchmark MV now renders Whale Maid Girl alone; cast modules are not placed in the film, and `drawFatFish` is limited to its dedicated action rather than appearing in every shot. The character rig has added whale-apron, gold hem, and blue fin-ear bow details inspired by the two fish references. The benchmark renderer keeps only lyric subtitles and removes cast/action/puzzle HUD clutter. This pass rebuilds only `mv_ba_huiyi_pinhao_gei_ni_whale_girl.mp4`; other MVs remain untouched.

**Single-MV verification (2026-10-24):** rebuilt only `mv_ba_huiyi_pinhao_gei_ni_whale_girl.mp4` at 1280×720, 30 fps, 142.10s; decoded all 4,263 H.264 frames and AAC audio. The benchmark render path contains no co-star drawing calls. Only the benchmark storyboard and locomotion review sheet were regenerated alongside that one MP4. No other MV was rendered or modified.

## 6. Selected continuation: 《潮汐》 only

The user has now requested a focused rerender of exactly two videos: `mv_chaoxi_whale_girl.mp4` and `mv_pengyou_de_jiu_whale_girl.mp4`; no other MVs. For 《潮汐》, lyric cue onsets remain Vosk-verified, props sourced from the shared shot plan are disabled, intrusive hand-prop actions are replaced with clear gestures, and the lead is enlarged with a reduced whale-tail footprint. For 《朋友的酒》, the heroine is the solo lead, enlarged, and the mug props are staged at the far table edges; extra cast, the extra fat-fish sprite, and the top-right HUD badge are removed. Both storyboards are regenerated and approved internally; MP4 rerenders and media validation remain to be completed.

> **画面红线（2026-10-29 起硬规则）**：任何成片/封面/卡片都不许出现粉丝数、播放量、目标值（`X / 10,000`）、进度条、音量条、数据曲线。
> 出处 `00_运营总览/画面红线_不要出现的东西_2026-10-29.md`；出片前跑 `python3 tools/剧本/画面红线体检.py`（非 0 退出就别出片）。
