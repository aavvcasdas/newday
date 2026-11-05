# 通用单集生产引擎（tools/engine）

先读 `agent.md`。不读不写。

跨集声明式动画管线：**引擎与单集数据彻底分离**。Day11 起每集只写一份
`tools/dayN制作/episode.spec.mjs`（纯数据声明），由本引擎统一驱动渲染；
Day0–Day10 历史单集与旧渲染器全部冻结、不受影响。

## 模块地图

| 文件 | 职责 |
|---|---|
| `room_base.mjs` | 画布/字体/ffmpeg 解析、海底基础房间（舷窗 (148,236,r=77)、书架、绿植、地毯锚点）、清晰文本、前景桌案（下沿 ≤600） |
| `prop_registry.mjs` | 跨集道具注册表：汇总 `cue_props_engine` 通用道具 + Day10 米缸/对照板原型 + 立牌/通知板/名牌/折页/空碗；每件声明 `extent.bottom` 供越界校验 |
| `opener_director.mjs` | 黄金前 3 秒导演：三拍运镜（1.42→1.30→1.15→1.21）、双人反差硬校验、头顶外侧身份铭牌、双色追光、顶部钩子横幅（0–2.8s）、词点落章印章 |
| `scene_compositor.mjs` | 严格五层合成：L0 远景海底房 → L1 追光/后景承重 → L2 校准角色 → L3 前景交互（≤600）→ L4 屏幕 HUD（横幅/角标/字幕） |
| `crowd_and_density.mjs` | 开场第 0 帧同屏上限（静态道具 ≤1、铭牌 ≥0.55s、戳章不与首帧道具叠）+ 每镜词点接触与姿态/步态校验 |
| `interaction_stage.mjs` | 引擎层词点接触：争抢、展开、敲碗、石沉落桌、划线、交接；`drop_bonk`/`slap_deflect` 仍交给共享模块 |
| `schema_validator.mjs` | spec 强校验：未校准姿态、同姿/双 idle 罚站、姿态变化晚于 1.10s、道具下沿越界、横幅阿拉伯数字、主交互缺配套物、开场超员、整镜无词点互动，渲染前直接抛错 |
| `render_episode.mjs` | 1920×1080@30 生产渲染器。只接受 `measured=true` 且 SHA256 匹配的实测轴；`TITLE_LEN=0`；末句后 0.24s 结束；CLI 兼容 gate.py |
| `export_vertical.mjs` | 一源双端竖屏导出：同一场景状态在 1080×1920（9:16）/1080×1440（3:4）原生重排（顶部双行大标题 + 相机×1.38 主舞台 + 安全区放大字幕），禁止对横屏成片像素裁剪 |
| `engine.test.mjs` | 引擎单元测试（`node --test tools/engine/engine.test.mjs`） |

配套（引擎之外、门禁之内）：

- `tools/音频/align_voice.py` — ASR 词轴 + RMS 边界 → 实测轴/字幕轴（通用化，不再逐集硬编码词序号映射）；
- `tools/音频/mix_episode_bgm.py` — 快起 BGM（0.06s）+ 开场/词点瞬态 SFX 独立 stem；成片=干声+stem，减法恢复人声相关 >0.999、视频流哈希不变；
- `tools/验收/check_opener_visual.py` — 前 60 帧防枯燥门禁（运动量/上半屏非空/亮度占比 ≥18%/首秒听觉），gate.py 对 day≥11 或 `use_unified_engine:true` 的配置在 final 阶段自动追加；
- `tools/init_episode.py` — 新集脚手架（已存在集数拒绝覆盖）。

## episode.spec.mjs 字段速查

```js
export default {
  day: 11, title: '本集标题', speaker: '本鲸',
  opener: {
    badge: '工位告急',                                  // 横幅上方小徽标（可空）
    headlinePrefix: '新来的AI学徒，把老监工',           // 横幅前半（深色）
    headlineHighlight: '架空了？！',                     // 横幅后半（朱砂红高亮）
    stampText: '已代管！', stampWord: { line: 1, char: '架' }, stampAt: [640, 520],
    actorA, actorB,                                     // 第0帧反差双人（见下）
    rolePlates: ['本鲸 · 原监工', '笨鱼 · 代管中'],      // 头部外侧身份铭牌
    foregroundProps: [{ propId: 'name_plate', x: 640, y: 500, scale: 1 }],
  },
  verticalTitle: ['新来的AI学徒，把老监工', '架空了？！'], // 竖屏顶部双行大字
  shots: [{
    id: 'C01', fromLine: 1, toLine: 3, mood: 'work_cool',
    actors: [actorA, actorB],
    interactions: [{ verb: 'drop_bonk', propId: 'sesame_flatbread',
                     wordLine: 2, wordChar: '饼', land: [565, 512], scale: 0.7, actor: 0 }],
    companionProps: [{ propId: 'empty_bowl', x: 760, y: 530, scale: 1 }],
  }],
};
```

角色声明：`{ pose, poses: [{at: 秒} 或 {line: 行}], x, y, u, flip, walk: {from,to,start,duration} }`。
姿态只能用已校准 8 种：`idle / point / shock / confident_hips / think / eat / playful_fists / fatfish_working`；
开场 actorA/actorB 不得同姿、不得双 `idle`，且须声明 0.65–1.10s 内的一次姿态变化。
每镜有 `interactions` 时必须至少一件 `companionProps`（反应特写可写 `allowNoCompanion: true`）；
同时每镜必须有词点锁定接触（`wordLine` + 单字 `wordChar`）以及姿态变化或 `walk` 步态，禁止整镜站桩。
所有前景道具下沿必须 ≤600（逻辑坐标），横幅文案禁止阿拉伯数字。
开场第 0 帧：双人 + 顶部横幅之外，静态道具最多 1 件；`rolePlates` 默认 0.85s 入场（`platesAt` 不得 <0.55）；配套物用 `fromLine` 或 `enterAt>=0.9` 错开；戳章词在第 1 行时不得再放第 0 帧道具。
可用道具与动词以 `prop_registry.mjs` / `schema_validator.mjs` 为准。
共享模块动词：drop_bonk / slap_deflect。引擎层动词：tug_grab / knock_bowl / unroll_scroll / sink_drop / mark_strike / handoff（后三类及带 `at` 的展开/敲碗不改 `cue_props_engine.mjs`）。

## Day11+ 标准命令流（一集全流程）

```bash
# 0) 环境（沙盒）：/tmp/node_render 内含 @napi-rs/canvas 与 ffmpeg 安装器
export FFMPEG=/tmp/node_render/node_modules/@ffmpeg-installer/linux-x64/ffmpeg
export FFPROBE=/tmp/node_render/node_modules/@ffprobe-installer/linux-x64/ffprobe

# 1) 初始化（已存在集数会拒绝覆盖）
python3 tools/init_episode.py --day 11 --title 工位告急

# 2) 填 Day11/Day11配音台词.txt，过文案门禁
python3 tools/gate.py --day 11 --stage script

# 3) 导入指定配音（原文件不改），ASR 词轴 + RMS 生成实测轴
python3 tools/音频/align_voice.py --voice Day11/配音/Day11配音.wav \
  --script Day11/Day11配音台词.txt --words <ASR词级JSON> \
  --out tools/day11制作/voice_alignment.json --subs-out tools/day11制作/subtitle_timing.json
python3 tools/gate.py --day 11 --stage audio

# 4) 填 tools/day11制作/episode.spec.mjs，过渲染前门禁（红线+单测+渲染器自检）
python3 tools/gate.py --day 11 --stage pre-render

# 5) 干声母版（B站 16:9 归档与终验对象）
node tools/day11制作/render_day11.mjs --voice Day11/配音/Day11配音.wav \
  --alignment tools/day11制作/voice_alignment.json \
  --subtitle-file tools/day11制作/subtitle_timing.json \
  --out Day11/成片/Day11_配音对齐版.mp4

# 6) BGM+SFX 正式成片（独立 stem + 相关性自检；词点音效用 --events-json 声明）
python3 tools/音频/mix_episode_bgm.py --base Day11/成片/Day11_配音对齐版.mp4 \
  --voice Day11/配音/Day11配音.wav --alignment tools/day11制作/voice_alignment.json \
  --output Day11/成片/Day11_配音BGM版.mp4 \
  --stem Day11/配音/Day11_伴奏含音效_stem.flac \
  --report tools/day11制作/BGM混音_验收.json

# 7) Day11 不导出 9:16（舞台不适配，会裁掉人和桌子）。封面用代码出 3:4 与 4:3：
node tools/day11制作/make_day11_cover.mjs

# 8) 四阶段总门禁（含新增开场视觉体检）
python3 tools/gate.py --day 11 --stage final
```

注意：第 5 步干声版只作基片与终验对象，正式交付是第 6 步 BGM 成片（agent.md 第 22 条）；
Day11 的 9:16 竖屏版已停，不替代母版，也不再作为交付物。自动检查不替代人工动态观影。
