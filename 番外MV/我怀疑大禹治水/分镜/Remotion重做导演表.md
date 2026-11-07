# 《我怀疑大禹治水治没了我的薪水》Remotion 动态引擎重做导演表

基于重构后的通用动态 Remotion 底层（`tools/remotion-engine/` + `tools/场景/stage_sets_core.mjs` + `tools/互动元素/world_interactions.mjs` + `tools/mv_dayu/mv.spec.mjs`），彻底告别硬编码在 `video.jsx` 里的写死镜头组件与 1 帧姿态硬切：
- **零新生图**：8 镜背景全部来自共享多深度视差舞台注册表（`STAGE_SETS`），角色与配角全部复用 `assets/ai-girls/lyric-action-v13/` 既有 16 帧（`6144×416`）高清动作图集。
- **连续运动与平滑转态**：16 帧图集连续循环播放 + 走位轨迹（`track`）+ 预备挤压回弹（`anticipation -> pop`）与透明交叉淡入淡出（`atlasBlend`），配合脚底高度衰减阴影、湿滑水波/尘土涟漪与舞台背光暖晕。
- **原音频无损直拷**：源媒体 `我怀疑大禹治水治没了我的薪水.mp3`（`29.333333s` = `880` 帧 @ `30fps`）提取 50ms RMS 能量包络对齐每句换气谷值与反转重音，编码后以 `-c:v copy -c:a copy` 原流封入，不改速、不加片尾卡，右上常驻 `非官方同人 / AI生成`，道具与背景零阿拉伯数字。

| 镜 | 时间（秒） | 舞台场景 (`STAGE_SETS`) | 歌词（用户原文一字不改） | 主角与配角 16 帧动作图集 | 世界机关与背景双向交互 | 运镜与转场 |
|---:|---|---|---|---|---|---|
| 1 | `0.00–5.35`（人声起 `1.15`，反转 `3.85`） | `river_gate`（江河水闸与潮涌堤岸） | 我怀疑大禹治水 / 治没了我的薪水 | 鲸鱼娘 `whale_walk_retry_action` -> `whale_point` -> `whale_side_crouch_action` -> `whale_wipe_tear_action`；千问 `qwen_reach_action` | 走近扳动堤岸红柄拉杆（`lever_switch`）-> 水闸升起（`open_gate`）泄洪涌瀑 -> 大水卷走木托架上的工资信封（`envelope_flood`）并激起脚下水波涟漪 | 跟摇推进 `pan` / 开场直入 |
| 2 | `5.35–8.85`（反转 `7.20`） | `seaside_deck`（晴海周日木栈台） | 后羿射日 / 射没了我的周日 | 鲸鱼娘 `whale_read_action` -> `whale_rain_reach_blink_action`；Zai `zai_clock_action` | 金箭破空（`flying_arrow`）钉穿木画架，`周日` 日历页整页剥落飘飞（`sunday_calendar`），同时触发 `dawn_shift` 使骄阳沉海、天海与甲板实时转入暮色 | 推近 `push` / 甩镜 `whip_left` |
| 3 | `8.85–12.55`（反转 `10.90`） | `mountain_pass`（群山峡口与云海步道） | 愚公移山 / 移走了我的靠山 | 鲸鱼娘 `whale_sit_blink_action` -> `whale_selfkind_retry_action`；龙女 `gpt_push_final_action` | 龙女沿步道推走整座层叠 `靠山`（`sliding_mountain` 留地面拖痕），峡口拨开透出金光（`open_gate`），鲸鱼娘失去依靠后仰晃动并落定粉色 `小靠垫`（`cushion`） | 拉镜 `pull` / 摇镜穿场 `pan_through` |
| 4 | `12.55–15.45`（反转 `13.72`） | `terracotta_courtyard`（陶土工坊庭院） | 女娲造人 / 给我造的小人 | 克劳德 `claude_collect_action`；鲸鱼娘 `whale_point` -> `whale_bird` | 工坊木门敞开漏出暖光（`open_door`），3 个关节摆臂泥纸 `小人`（`paper_puppets`）举空白彩色小牌围拢，鲸鱼娘挥手将其拨散并触发案台微震（`shake_desk`） | 推近 `push` / 圆瞳转场 `iris` |
| 5 | `15.45–19.00`（反转 `17.45`） | `screening_desk`（砖墙夜读室模式 `brickWall: true`） | 我怀疑凿壁偷光 / 偷光了我的积蓄 | Kimi `kimi_lantern_action`；鲸鱼娘 `whale_read_action` -> `whale_wipe_tear_action` | 右侧砖墙凿孔（`open_gate`）射出体积金光锥照亮桌面玻璃罐与人物背光晕；反转时罐内 5 枚纯金圆币沿弧线被吸进墙洞（`savings_jar_beam`） | 横摇 `pan` / 划像 `wipe` |
| 6 | `19.00–23.10`（反转 `21.10`） | `misty_pier`（烟波渡口与芦苇木栈） | 草船丞相 / 抢走了我的对象 | Gemini `gemini_star_toss_action`；鲸鱼娘 `whale_ribbon_hold_action` -> `whale_rain_reach_blink_action` | 木船载草垛扬帆驶过江面（`straw_boat_cranes` + 水面浪花 `splash_water`），码头桩上成对折纸千纸鹤中的粉色纸鹤飞上草船随船远去，鲸鱼娘沿木栈追出 | 跟船横摇 `pan` / 摇镜穿场 `pan_through` |
| 7 | `23.10–27.65`（反转 `25.55`） | `pear_orchard`（梨园庭院办公台，飘落梨花瓣） | 孔融让梨就是 / 让我离职 | 鲸鱼娘 `whale_meet_action` -> `whale_point` -> `whale_selfkind_retry_action`；豆包 `doubao_comfort_action` | 豆包在梨树庭院桌前推来大金梨，反转点大梨弹开（`shake_desk` + `backOut`）化为空白信封（`pear_to_envelope`），鲸鱼娘把信封推回并收好蓝色缎带工牌 | 推近双人桌面 `push` / 甩镜 `whip_right` |
| 8 | `27.65–29.33`（反转 `28.58`） | `twilight_street`（暮色三迁暖灯街巷） | 孟母三迁我月薪 / 也是三千 | 鲸鱼娘 `whale_walk_retry_action` -> `whale_read_action` | 鲸鱼娘沿暮色街巷快步走过连续滚过的三栋不同屋舍（`scrolling_houses`），随后在暖光路灯脉冲（`pulse_lamp`）下的木长椅落座看书，身旁浮起热茶白汽（`steaming_teacup`），自然收尾无片尾卡 | 跟拍 `follow` / 柔和叠化 `fade` |
