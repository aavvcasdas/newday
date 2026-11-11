# 通用模板

一套引擎，两条产线：**歌词 MV**（卡拍）和 **Day 口播片**（卡句）。

画面是「three.js 搭的 3D 世界 + 项目自带的 2D 像素角色当纸片人」，Remotion 逐帧截图，再把音轨按采样对齐混进去。
做法来自 `来源/remotion-fix-and-mv-recreation.zip`（《童话镇》立体童话书复刻那一页的源码），这里把其中写死的歌曲部分抽走，变成任何作品都能用的模板。

2026-11 重构之前的引擎、模板、成片和 skill 已全部废除，只在 `存档/重构前/` 留档，见 `存档/README.md`。

---

## 一、五分钟上手

```bash
npm ci                                             # 仓库根目录，装一次
pip install --user numpy pillow                    # 对齐 / 自检用

npm run film -- info   番外MV/童话镇                # 打印时间轴：每个镜头从第几帧开始
npm run film -- sheet  番外MV/童话镇                # 分镜总览图（每个镜头一格）
npm run film -- sheet  Day/Day14 --shot C05,C06    # 只看某几个镜头：每个从头到尾抽 6 格
npm run film -- stills 番外MV/童话镇 720 2600       # 抽查任意帧
npm run film -- full   番外MV/童话镇                # 整片：逐帧渲染 → 编码 → 混音 → 自检 → 总览图

npm run new -- day Day/Day15 "标题"                 # 新开一集口播
npm run new -- mv  番外MV/某首歌 "某首歌"            # 新开一部 MV
npm run preview                                    # 浏览器里边看边调（预览台）
npm test && npm run typecheck                      # 改了引擎之后跑
```

渲染一分钟成片大约要 9 分钟（2 核、无 GPU、软件渲染，约 3.5 帧/秒）；有 GPU 的机器设 `FILM_GL=angle` 会快很多。

---

## 二、目录

```
通用模板/
├─ engine/        引擎（不认识任何具体作品）
│   ├─ timeline.ts    卡点 → 镜头时间轴 → 节拍；planByCues 通用排镜
│   ├─ project.ts     作品契约 defineProject（校验台词、镜头、排镜，有问题当场报错）
│   ├─ core.ts        镜头契约：ShotDef / Kit / 机位 cam · glide · track
│   ├─ engine.ts      FilmEngine：给帧号画出这一帧（无随机、无累积状态）
│   ├─ actors.ts      角色纸片：造型、步态、服饰叠层、接触阴影
│   ├─ kit.ts         卡通材质、墨线、基础体块、光照预设、特效贴图
│   ├─ sets.ts        户外大布景：小镇、城堡、拱桥、彩虹河、烟花…
│   ├─ props.ts       室内布景与道具：房间、门、桌子、饭碗、沙漏、账本、伞、雨…
│   ├─ subtitles.tsx  歌词条（逐字染色）/ 对话条（头像 + 名牌）
│   ├─ Film.tsx       Remotion 合成：画布 + 字幕 + 字卡 + 闪白 / 渐黑
│   ├─ register.tsx   把作品注册成 <Composition>
│   └─ assets/        角色图集 cast_atlas.png / .json、字体 ZCOOL KuaiLe（OFL）
├─ cli/
│   ├─ film.mjs       出片命令行（见第四节）
│   ├─ new.mjs        新开作品
│   ├─ align_beats.py MV：实测拍点，歌词起点吸附到实拍
│   ├─ align_voice.py Day：按配音切句
│   ├─ audio_mix.py   音轨按采样对位、淡出、配乐压低
│   └─ qa.py          逐帧 / 卡点 / 成片自检，分镜总览图
├─ cast/          图集的源数据与重建脚本（npm run atlas:check 校验逐字节一致）
├─ 样板/          新作品的起点：样板/mv、样板/day（各带一段渲好的无声样片）
├─ preview/       预览台
├─ tests/         node --test + python unittest
└─ 来源/          来源压缩包与原页面的诊断报告（只读）
```

作品放在模板外面：`番外MV/<歌名>/`、`Day/<DayNN>/`。

---

## 三、一部作品长什么样

```
番外MV/童话镇/
├─ film.json      元数据：id、类型、音源、输出、码率
├─ 歌词.srt       （MV）带时间的歌词      ┐ 人写的
├─ 台词.txt       （Day）一行一句的台词    ┘
├─ cues.json      每句的起止秒数 —— 由 film.mjs plan / align 生成，不要手改
├─ project.tsx    把上面这些交给 defineProject，写明排镜
├─ shots/*.ts     镜头：搭景 + 逐帧摆人摆机位
├─ 素材/          音源
└─ 成片/          <标题>.mp4、.srt、_分镜总览.jpg、qa.json
```

### film.json

```jsonc
{
  "id": "tonghuazhen",          // Composition id：只用字母、数字、连字符
  "kind": "mv",                 // mv = 歌词 MV；day = 口播片
  "title": "童话镇",
  "subtitles": "歌词.srt",       // mv：带时间的歌词
  "script": "台词.txt",          // day：一行一句
  "speaker": "whale",           // day：台词没写角色时默认谁在说
  "audio": {
    "file": "素材/童话镇.mp4",    // 音源（任何 ffmpeg 能读的格式）；没有这一段就只能出无声样片
    "offset": 0,                // 正数 = 音源晚这么多秒进；负数 = 丢掉音源开头这么多秒
    "fadeOut": 1.5,             // 片子比音源短时，结尾线性淡出几秒
    "bgm": { "chip": 128 }      // day 可选：垫一条 128 BPM 的芯片风配乐，说话时自动压低；或 { "file": "素材/bgm.mp3", "gainDb": -20, "duckDb": -8 }
  },
  "output": "成片/童话镇",        // 输出文件名（不带扩展名）
  "video": { "bitrate": "4700k", "preset": "slow" }
}
```

### cues.json（卡点）

```jsonc
{
  "measured": true,             // true = 按 source.audio 这条音频实测过；false = 估的，只能出无声样片
  "method": "…怎么测的…",
  "source": { "audio": "素材/童话镇.mp4", "audio_sha256": "…", "subtitles": "歌词.srt", "subtitles_sha256": "…" },   // day 记的是 script / script_sha256
  "beat": { "period": 0.42871, "first": 10.1895, "bar": 4 },   // mv：实测拍点；day 为 null
  "lines": [ { "text": "听说白雪公主在逃跑", "start": 13.619, "end": 16.6 } ]   // day 的每句还有 who / face
}
```

**两条硬规矩（命令会直接拒绝，不是提醒）：**

1. **`mux` / `full` 只接受 `measured=true` 且 `audio_sha256` 与当前音源一致的卡点。** 估出来的轴、按另一条音频测的轴，都混不出成片——换了音源就重新 `align`。
2. **台词 / 歌词改过，就要重跑 `plan`（没有音源）或 `align`（有音源）。** 字幕的文字只存在 `cues.json` 里，渲染时不再读 `台词.txt` / `歌词.srt`；所以 `cues.json` 记着它是按哪一版文字做的（`script_sha256` / `subtitles_sha256`），对不上时除 `plan` / `align` 以外的命令都不干活——否则会悄悄渲出旧台词。

### project.tsx

```tsx
export default defineProject({
  id: film.id, kind: 'day', title: film.title,
  cues: cues as CueFile,
  shots: SHOTS,
  // 排镜：cue = 从第几句（0 起）开口前 2 帧切入；after = 第几句说完后 0.15 秒切入；at = 写死秒数。第一个镜头永远从 0 秒开始。
  planShots: [{ id: 'S1', cue: 0 }, { id: 'S2', cue: 2 }, { id: 'OUT', after: 5 }],
  planOptions: { tail: 0.6 },   // 最后一句结束后还留几秒；mv 可加 beat: 'estimate' | 'measured'
  cards: { title: { main: '片名', sub: '副标题' }, end: { shot: 'OUT', text: '片尾字' } },   // 可选
});
```

排镜规则特别的作品可以不用 `planShots`，自己写 `plan(starts, ends) => Timeline`（参考 `番外MV/童话镇/plan.ts`）。

`defineProject` 会当场检查：台词顺序、镜头 id 重复、排镜引用了不存在的镜头、注册了却没用上的镜头、头像不在图集里……有问题直接抛错。

---

## 四、命令

`npm run film -- <命令> <作品目录> [选项]`

| 命令 | 做什么 |
|---|---|
| `info` | 打印时间轴，并核对「仓库里的成片是不是现在这份源码渲的」（源码指纹） |
| `plan` | 还没有音源时的规划轴 → `cues.json`（`measured=false`）。day：按 3.36 字/秒估；mv：歌词 .srt 的时间照抄 |
| `align` | 按音源实测 → `cues.json`（`measured=true`）。mv：测全曲拍点，歌词起点吸附到最近的实拍（`--no-snap` 只测不挪）；day：按停顿切句（`--words asr.json` 改用逐词对齐） |
| `stills <帧号…>` | 抽查静帧 → 工作目录 `stills/` |
| `sheet` | 分镜总览图：每个镜头取 62% 处一格 → `成片/<标题>_分镜总览.jpg` |
| `sheet --shot <id[,id…]>` | 只看某几个镜头：每个从头到尾抽 `--n 6` 格（每格宽 `--cell 640`），格子下面标着那一刻在说哪一句 → 工作目录 `镜头_<id>.jpg`。**写镜头时主要靠它**：走位、道具时机、有没有人被画框切掉，一张图看完 |
| `frames` | 逐帧渲染 PNG 序列（300 帧一块，中断后重跑会续渲；时间轴或源码变了自动作废旧帧） |
| `encode` | PNG → H.264（默认两遍固定码率；`--crf 18` 改恒定质量） |
| `mux` | 音轨按采样对位混入 → `成片/<标题>.mp4` + `.srt` |
| `sample` | 没有音源时 → `成片/<标题>_无声样片.mp4`（文件名写明不是成片） |
| `qa` | 自检 → `成片/qa.json`；有问题时退出码非 0 |
| `full` | `frames → encode → mux（或 sample）→ qa → sheet` |

通用选项：`--cues <文件>` 临时换卡点；`--work <目录>` 中间文件目录（默认系统临时目录 `newday-film/<id>`，PNG 序列每分钟约 0.7 GB，不进仓库）。
环境变量：`FILM_GL`（默认 `swangle` 软件渲染；有 GPU 设 `angle`）、`FILM_BROWSER`、`FFMPEG`、`FFPROBE`、`PYTHON`。

### 自检（qa.json）查什么

- **逐帧**：缺帧、尺寸、空画面（WebGL 没画上）、画面冻住（连续 ≥4 帧完全相同）、每个镜头首帧是否真的切了、每句字幕条是否在场；整段序列的 md5 指纹。
- **卡点**：是否实测；MV 的歌词起点离实拍多远、切点比拍点早几帧；不足 12 帧的镜头。
- **成片**：音轨相对音源的偏移（互相关，应为 0 个采样）与相关度、音画时长、帧数、能否完整解码、文件大小、SHA256。
- **源码指纹**：这批帧是哪份源码渲的（渲染时记在帧目录里，`info` 会拿它和当前源码比）。只有这次自检真的逐帧查过那批 PNG 才写；`--skip-frames` 或帧已经不在了就写 `null`，`info` 会如实说「没有记录」。

自检查不了的：好不好看、动作顺不顺、口型（没有口型）、听感。**这些要人从头到尾看一遍、听一遍。**

---

## 五、写镜头

一个镜头 = `build`（搭景，只跑一次）+ 它返回的逐帧函数（摆人、摆道具、给机位）。

```ts
{
  id: 'S2', look: 'golden', title: '桌边对谈', cast: ['whale', 'gpt'],
  note: '两人隔着桌子对谈，谁在说话谁就轻轻一颠一颠。',      // 给人看的分镜说明，会进总览图和预览台
  fx: { flash: [0.5] },                                      // 可选：闪白 / 渐白 / 渐黑 / 片名卡
  build: (k) => {
    k.add(room()); k.add(table(), 0.6, 0, 0.2);
    const whale = k.actor('whale'), gpt = k.actor('gpt');
    const A = cam([-0.6, 1.7, 7.2], [0.7, 1.05, 0], 36), B = cam([0.9, 1.6, 6.6], [0.7, 1.1, 0], 34);
    return ({ u, T, line }) => {
      whale.front(T).at(-1.5, 0, 0.9).talk(T, line === 0);
      gpt.set('gpt_boss_idle').flip().at(2.9, 0, 0.7).talk(T, line === 1);
      return glide(A, B, u);
    };
  },
}
```

### 三条硬规矩（引擎靠它们保证「任意跳帧、任意分段渲染都得到同一帧」）

1. 逐帧函数**只读参数里的时间**，不许用 `Math.random()`、`Date.now()`、自己累加的变量。要随机：`hash(n)`（kit.ts）或 `k.rnd()`（只在 build 里用）。
2. 角色每帧的姿态都要**重新写一遍**（引擎每帧先把角色复位）。不写就是默认站姿。
3. **缺素材直接报错**。`actor.set('不存在的格子')` 会抛错，不会悄悄换成别的造型。

### 逐帧函数拿到什么

| 字段 | 含义 |
|---|---|
| `u` | 镜头进度 0–1（最常用） |
| `t` / `dur` | 镜头内的秒数 / 镜头总长 |
| `T` | 全片秒数（循环动作用它，跨镜头不跳） |
| `f` | 全片帧号 |
| `bt` | 节拍：`bt.pulse`（落拍时 1，随后衰减）、`bt.idx`（第几拍）、`bt.down`（重拍）、`bt.phase`（拍内 0–1）。口播片 `pulse` 恒为 0 |
| `line` / `lp` | 此刻在说 / 唱第几句（0 起，句间为 −1）与这句的进度 0–1 |
| `said` | 已经开口的最后一句（0 起；第一句开口前为 −1）。句间空档里**不会**变回 −1 |
| `when(n, p = 0)` | 第 n 句说到 p（0 开口、1 说完）的那一刻，折算成本镜头的进度 `u`。给相机关键帧定位用 |

配套的小函数 `lineU(f, n)`（从 `@tpl/core` 引入）：第 n 句说到哪了——还没轮到是 0，正在说是 0–1，说完以后一直是 1。

### 口播片：时机跟着「句子」走，不跟着秒数走

口播片先用估算的规划轴做分镜，配音到了再换成实测的卡点——每句话的起止都会变。
所以镜头里的时机**不要写死成镜头进度的百分比**，要挂在句子上：

```ts
return (f) => {
  // 第 8 句（序号 7）说到 30%–50% 时翻开封面
  nb.cover.rotation.z = ease(seg(lineU(f, 7), 0.3, 0.5)) * Math.PI;
  // 说到第 3 句以后一直举着手（句间空档也不放下）
  whale.set(f.said >= 2 ? 'whale_point' : 'whale_idle');
  // 第 8 句开口后，用它前 28% 的时间从双人机位推到账本特写
  return track([[0, A], [f.when(7), A2], [f.when(7, 0.28), B], [1, C]], f.u);
};
```

这样换了卡点不用回来改数字。句序号都是**全片**的序号（从 0 数），和 `planShots` 里的 `cue` 是同一套。
`when()` 引用了不存在的句子会直接报错。只是慢慢推拉的镜头，用 `glide(A, B, u)` 就够了。
完整的例子见 `Day/Day14/shots/shots.ts`。

### 机位

```ts
cam([x, y, z], [看向 x, y, z], 视角度数 = 38, 侧倾 = 0)
glide(A, B, u)                       // A 滑到 B：缓入缓出 + 匀速蠕动，任何一帧都在动
track([[0, A], [0.5, B], [1, C]], u) // 多段运镜；每段起止机位要不一样（别写成两个一样的关键帧——那一段就静止了）
```

`track` 的关键帧时间必须从小到大，写乱了会直接报错（不会悄悄挑一段播）。

### 构图：几条量出来的经验

- **人要么完整入画，要么完全在画外。** 被画框切掉半个身子、还一停好几秒，是最常见的毛病。鲸鱼娘、龙娘、Claude 连头发宽 1.5–1.7 个单位（从站位往左右各留 0.85），豆包、Kimi 这些窄的 0.7–1.0。两人隔着 3 个单位宽的桌子对谈，36° 视角的机位要退到离人 6 个单位左右才装得下。
- **对话条占画面高度的 79%–96%**（1080p 下是第 858–1036 行，水平居中、宽度随字数变）。要让人看见的东西（手里的碗、桌上的字）放在它上面。俯拍桌面时，把「看向的点」定得比纸更靠近镜头，纸就会落在画面上半。
- **平放的纸从正面看是一条线。** 要读纸上的字：升高机位俯拍（仰角 50° 以上），或者用 `standing()` 把纸立起来当桌牌。
- **雨、雪这类粒子别下到镜头跟前**——离镜头不到一米的雨丝会变成一条粗白杠。把粒子的纵深限制在人物所在的那一段。
- **同一个场景连着几个镜头，摆位写成常量共用**（人站哪、碗在哪），否则一切镜东西就跳位。沙漏这类「有状态」的道具，上一镜结束时漏到多少，下一镜就从多少开始。
- 写完一个镜头就 `sheet --shot <id>` 看六格；全片过一遍 `sheet`。

切镜一律硬切；要转场用 `fx`：上一镜 `whiteOut` + 下一镜 `whiteIn` 是闪白转场，`blackOut` / `blackIn` 是渐黑。

### 角色（k.actor(id, 放大倍数 = 1)）

| 方法 | 作用 |
|---|---|
| `.front(T)` | 正面待机 + 自动眨眼 |
| `.set('格子名')` | 换造型（硬切，不交叉淡化） |
| `.walk(T)` / `.walkBy(走过的距离)` | 步态：每格 3 个整帧 / 按位移播（脚不打滑） |
| `.at(x, y, z)` `.flip()` `.size(s)` | 位置、水平翻转、缩放 |
| `.talk(T, 在说话吗)` | 说话时轻轻颠（写在 `.lift()` / `.sq()` 之后） |
| `.lift(h)` `.sq(a)` `.tilt(r)` | 跳起高度、挤压拉伸、倾斜 |
| `.alpha(a)` `.hide()` `.flash(v)` `.sil(v)` `.tint(hex)` `.noShadow()` | 透明、隐藏、闪白、剪影、染色、去掉脚下阴影 |
| `.wear('crown' \| 'hood' \| 'tophat' \| 'bow' \| 'tiara' \| 'ears' \| 'tail')` | 像素服饰叠层（在 build 里调用一次） |

身高约 1.7 个世界单位；脚底在 `y = 0`。

### 八位角色与可用造型

| id | 角色 | 造型格（`.set(…)`） | 头像格（台词里的 `角色/头像:`） |
|---|---|---|---|
| `whale` | 鲸鱼娘（主角） | `whale_idle` `whale_blink` `whale_point` `whale_wave`；大号 `whale_big_idle/blink/point/wave`；步态 `walk_whale_0–7` | `p_whale_neutral` `p_whale_think` `p_whale_shout` |
| `gpt` | GPT 龙娘 | `gpt_boss_idle` `gpt_boss_blink` `gpt_boss_rage` `gpt_boss_cast0` `gpt_boss_cast1`；飞行 `gpt_fly_0/1` | `p_gpt_neutral` `p_gpt_haughty` `p_gpt_rage` |
| `claude` | Claude 大小姐 | `claude_front_0/1` `claude_side_0/1`；步态 `walk_claude_0–7` | `p_claude_neutral` `p_claude_dizzy` `p_claude_petri` |
| `doubao` | 豆包 | `doubao_cage_0/1`；步态 `walk_doubao_big_0–7` | `p_doubao_neutral` `p_doubao_blink` |
| `gemini` | Gemini | `gemini_front_0/1` `gemini_side_0/1`；步态 `walk_gemini_0–7` | `p_gemini` |
| `kimi` | Kimi | `kimi_front_0/1` `kimi_side_0/1`；步态 `walk_kimi_0–7` | `p_kimi` |
| `qwen` | 千问 | `qwen_front_0/1` `qwen_side_0/1`；步态 `walk_qwen_0–7` | `p_qwen` |
| `zai` | 智谱 | `zai_front_0/1` `zai_side_0/1`；步态 `walk_zai_0–7` | `p_zai` |

造型就这些——图集来自项目自己的像素角色数据（`cast/source/`），没有新增生图。要更多动作，先往 `cast/source` 加像素数据、更新 `cast_atlas.json`、`npm run atlas` 重建，再用。

**选角锁定**（沿用项目一直以来的口径）：鲸鱼娘是主角 / 河水向导 / 小人鱼；GPT 龙娘演反派影子与龙；Claude 是唯一戴金冠的公主（白雪、睡美人）；豆包是小红帽 / 红舞鞋；Gemini 是爱丽丝；Kimi 是灰姑娘 / 智者；千问是疯帽子；智谱是彼得潘 / 杰克。

### 光照预设（`look`）

`day` 晴天 · `golden` 暖午后（室内常用）· `dusk` 黄昏 · `night` 夜 · `forest` 密林 · `magic` 紫色魔法 · `sea` 水下 · `cave` 洞穴 · `stage` 舞台 · `savanna` 草原

### 积木

- **kit.ts**：`box` `cyl` `cone` `ball` `disc` `roof`（体块，自带墨线）；`tree` `pine` `cloud` `rock` `house` `lantern` `flower` `paperBoat` `clock`；`sprite('star' | 'glow' | 'heart' | 'note' | 'bubble' | 'butterfly' | 'zzz' | 'petal' | 'smoke' | 'ring' | 'drop' | 'leaf' …)` 特效贴片；`canvasTex` 画贴图；缓动 `ease` `easeOut` `backOut` `seg` `lerp`。
- **sets.ts**：`hill` `castle` `bridge` `buildTown / useTown`（整座小镇，多个镜头共用一份）`book` `straightRiver` `Fireworks` `mushroom` `wheel`。
- **props.ts**：`room` `door`（可开合、带光束）`windowPane` `table` `riceBowl` `hourglass`（`set(漏下去的比例, T)` 沙量守恒；`flip(e, 翻之前漏了多少, T)` 整只倒过来）`sheet + writeLine`（纸上写字）`standing`（把纸立起来当桌牌 / 价签）`paperStack` `notebook`（可翻页）`umbrella` `rain` `cameraProp` `plant`。

会动的道具都是 `{ g, set(进度) }`：`set` 只吃当前进度，不存状态。

---

## 六、两条产线

### MV

1. `npm run new -- mv 番外MV/歌名 "歌名"`；原曲放进 `素材/`，`film.json` 加 `audio`。
2. 换 `歌词.srt`（带时间；LRC 先转 SRT）。
3. `align`：实测全曲拍点，把每句起点吸附到最近的实拍（移动不超过半拍），写出 `cues.json`。**这是拍点级对齐，不是逐音节对齐。**
4. 写镜头、排镜；`sheet` 看总览，`stills` 抽帧。
5. `full` 出片；人工整片看一遍、听一遍。

### Day 口播

1. `npm run new -- day Day/DayNN "标题"`。
2. 写 `台词.txt`：一行一句 = 一屏字幕；行首可写 `gpt:` 或 `whale/p_whale_think:`。一句别超过 22 个字；数字写成汉字。
3. `plan`：按语速估一份规划轴（`measured=false`）。
4. 写镜头、排镜。时机挂在句子上（`lineU` / `said` / `when`，见第五节）；每写完一个镜头 `sheet --shot <id>` 看六格。全片 `sheet` 过一遍，`full` 出**无声样片**（`成片/<标题>_无声样片.mp4`）给人过分镜。
5. 配音到位：放进 `素材/`，`film.json` 加 `audio`（可带 `bgm`）。
6. `align`：
   - 给了 `--words asr.json`（Vosk 词级时间戳）→ 逐字序列对齐 + RMS 修边界（旧项目 Day13 的口径）；
   - 不给 → 按停顿切句：停顿数刚好够 → 唯一解；停顿更多 → 按字数占比挑句界，并在 qa 里提醒「请听一遍核对」；停顿不够或语速离谱 → **直接失败，不写 cues.json**。
7. `full` 出成片。配乐只写进独立的伴奏轨，成片 = 干声 + 伴奏，干声本身一个采样都不改。

现成的例子：`Day/Day14/`（19 个镜头、44 句、约 2 分 49 秒）。它停在第 4 步——没有配音，只有无声样片。

---

## 七、画面红线（做新片必须守）

- **零水印、零角标**：画面里不放任何常驻角标、平台水印、「AI 生成」贴纸。合规声明由发布页的平台声明承担。
- **不出现运营数字**：粉丝数、播放量、目标值、进度条、余额条、数据曲线、账本表格，一律不进画面。沙漏只画沙子，钟只画指针。
- **不伪造接触**：角色是纸片，不给道具画一只假手。
- **不加片尾卡**（Day）：最后一句说完就结束。
- **不新增生图、不换画风**：角色只用图集里的像素造型。
- **缺素材就失败**：不允许静默回退。
- **时间只认实测**：`measured=false` 的东西只能叫样片。

---

## 八、相对旧引擎修掉了什么

旧 `tools/remotion-engine`（现在在存档里）被诊断出九个问题，全文见 `来源/report.ts`。新模板的对应做法：

| # | 旧问题 | 现在 |
|---|---|---|
| 1 | 立绘不在 delayRender 等待链里，头几帧人物闪烁 | 图集解码 + 字体就绪 + 首帧画完才放行截帧；出片时任何错误都让渲染失败 |
| 2 | 换姿势时两层半透明交叉淡化，出现重影 | 换造型一律硬切 |
| 3 | 缺素材静默回退成木偶 | `set()` 直接抛错 |
| 4 | `will-change` + 1280×720 放大导致发糊 | 原生 1920×1080 画布 |
| 5 | 精灵被放大到超过素材分辨率 | 像素着色器在任意缩放下保持锐利 |
| 6 | 步态格不是整帧、帧号按时间走 | 每格 3 个整帧，或 `walkBy` 按位移播 |
| 7 | 多段运镜只吃第一段 | `track()` 多关键帧，每段都带蠕动 |
| 8 | 假甩镜转场 | 硬切 + 闪白 / 渐黑 |
| 9 | 不同渲染路径脚底基线不一致 | 单一基线：卡片底边 = 脚底 |

重构时另外补了两处（原页面源码里没有）：

- **绘制顺序确定化**：three 默认按全局自增的 material / object id 排序，同一帧在「刚打开的页面」和「渲染过别的镜头的页面」上会差出几十个远景边缘像素。现在只按深度和搭景先后排，同一帧在任何渲染顺序下逐像素相同（分段续渲、按 md5 复核的前提）。
- **字体随合成加载**：ZCOOL KuaiLe 打进包里用 FontFace 加载，预览和出片是同一套字形，不依赖机器装没装中文字体。

---

## 九、已知局限

- 没有口型、没有逐音节卡点；MV 是拍点级对齐，Day 是句级对齐。
- 角色造型少（每人 4–8 个），做不了复杂表演；靠走位、机位、道具和节奏撑。
- 没有景深、辉光、描边后处理；没有音效轨和母带处理；只出 16:9 横屏。
- 软件渲染慢（约 3.5 帧/秒）。
- 按停顿切句只在合成信号上测过，**没有用真人配音验证过**；第一次用到真配音时务必对着 `cues.json` 听一遍。
