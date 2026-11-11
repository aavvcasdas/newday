// 诊断报告 / 选角 / 学习清单的数据。诊断全部来自对分支源码的静态审读，逐条标注证据位置与可信度。
import type { CharId } from '../mv/actors';

export type Level = 'P0' | 'P1' | 'P2';
export type Proof = '源码确认' | '源码确认 · 效果待渲染复核' | '源码确认 · 取决于素材';
export interface Issue { id: string; level: Level; proof: Proof; title: string; where: string; cause: string; symptom: string; fix: string; code?: string }

export const ISSUES: Issue[] = [
  {
    id: 'img', level: 'P0', proof: '源码确认', title: '立绘 / 图集没有进入 Remotion 的等待链',
    where: 'tools/remotion-engine/components/RiggedCharacter.jsx（AtlasCellSprite、pose 分支） · UniversalComposition.jsx:18',
    cause: '角色贴图全部用裸 SVG <image href> 加载；整个引擎只有字体走了 delayRender。Remotion 只等 React 提交完就截帧，不会等这些图片解码。',
    symptom: '换镜头、换图集后的头一两帧容易角色空白或闪一下。render_cli.mjs:412 默认 concurrency=2，两个标签页各自冷加载，相邻帧可能一个有人一个没人，观感就是「人物一闪一闪」。',
    fix: '启动时把 assetUrlMap 里本片用到的图全部预解码，解码完再 continueRender；或者统一换成 Remotion 的 <Img>。',
    code: `const [h] = useState(() => delayRender('preload-sprites'));
useEffect(() => {
  Promise.all(Object.values(props.assetUrlMap).map((src) => {
    const img = new Image(); img.src = src; return img.decode();
  })).then(() => continueRender(h), (e) => cancelRender(e));
}, []);`,
  },
  {
    id: 'xfade', level: 'P0', proof: '源码确认', title: '图集交叉淡化 = 两层同时半透明',
    where: 'RiggedCharacter.jsx 图集分支：prev opacity = 1 − atlasBlend，cur opacity = atlasBlend',
    cause: 'blend=0.5 时两层各 50%，合成覆盖率只有 1 − 0.5×0.5 = 75%：背景会透过身体 25%，同时叠出两套四肢。',
    symptom: '走路 ↔ 待机切换的那 0.2 秒，人物变「半透明 + 重影」。README 里写过 Day3 的 Canvas 端已经修掉「交叉淡化半透明」，Remotion 端又带回来了。',
    fix: '当前层始终 opacity=1 垫底，只让上一层在它上面淡出；更干净的做法是在压扁预备帧上直接硬切。',
    code: `<AtlasCellSprite url={atlasUrl} opacity={1} />              {/* 新姿势垫底，永远不透明 */}
{blend < 0.99 && <AtlasCellSprite url={prevAtlasUrl} opacity={1 - blend} />}`,
  },
  {
    id: 'fallback', level: 'P0', proof: '源码确认', title: '素材没命中时静默回退成几何玩偶',
    where: 'RiggedCharacter.jsx:3–12（PALETTES）与末尾的 <ArticulatedPuppetSvg> 分支',
    cause: 'URL 找不到就画一个 SVG 玩偶，八个人共用同一套围裙 + 蝴蝶结身体；配色表里 GPT 是绿发 #2E7D6B、智谱蓝发、Gemini 纯蓝——和图鉴设定（GPT 银白长发红瞳龙角 / 智谱黑长发 / Gemini 粉蓝双色）对不上。',
    symptom: '只要有一个素材 key 没命中，那个镜头里的人物就会不报错地「换了画风、换了发色」。仓库 README「项目默认规则」已明确写了不再作为静默回退，并记录 Day3 两次画风事故都源于这类回退。',
    fix: '缺素材直接 throw，让这次渲染失败并报出缺的 key；玩偶只留给显式的 renderMode="puppet"。',
    code: `if (!atlasUrl && !spriteUrl && actor.renderMode !== 'puppet') {
  throw new Error(\`缺少角色素材: \${actor.atlas || spriteKey}\`);
}`,
  },
  {
    id: 'blur', level: 'P1', proof: '源码确认 · 效果待渲染复核', title: 'will-change + 1280×720 逻辑世界 ×1.5 放大 → 推镜发糊',
    where: 'components/WorldCamera.jsx:46（willChange: "transform"）；UniversalComposition.jsx:42（outputScale = width / 1280）',
    cause: '整个世界是一张 1280×720 的 DOM，被 scale(1.5)×相机 z 放大到 1920×1080。Chromium 对带 will-change:transform 的图层倾向于按首次光栅化的比例缓存位图，之后只做 GPU 缩放，不重新栅格化。',
    symptom: '预期是推镜时矢量背景、字、立绘一起变软；多标签页各自的首帧 z 不同时，相邻帧的清晰度可能会跳。需要本地出两帧对比确认。',
    fix: '删掉 willChange；逻辑分辨率直接用 1920×1080（或用 Remotion 的 --scale 做整数倍输出），相机只写 transform。',
  },
  {
    id: 'soft', level: 'P1', proof: '源码确认', title: '立绘放大倍率超过素材分辨率：「人糊景锐」',
    where: 'RiggedCharacter.jsx：heightPx = 10.4 × u（默认 38）= 395 逻辑 px；图集单格 384×416',
    cause: '395 逻辑 px × 1.5 = 593 输出 px，单格只有 416 px 高，默认身高下已经放大 1.43 倍；再乘相机 z（缺省预设 1.08，推镜时更大）。背景是 SVG 矢量，永远锐利。',
    symptom: '人物像一张低清贴纸贴在高清背景上，这是「贴图感」最主要的来源。',
    fix: '按 1080p 下的最大出场尺寸重烘图集（单格 ≥ 800 px 高），或在分镜校验里限制 heightPx × 1.5 × z ≤ 素材高度。',
  },
  {
    id: 'gait', level: 'P1', proof: '源码确认', title: '步态帧不整除帧率，帧号只看时间不看位移',
    where: 'tools/engine/character_motion.mjs:794–800',
    cause: '8 格 × 120 ms 放在 30 fps 上是每格 3.6 帧，只能 3/4/4/3/4 帧不等长停留；帧号 = floor(时间 / 周期 × 8)，与实际走了多远无关；speedBoost 在 |vx| 跨过 165 的瞬间把周期从 0.96 改成 0.79，相位直接跳。',
    symptom: '走路一顿一顿、脚底打滑，加速瞬间突然换腿。',
    fix: '每格固定 3 个整帧（100 ms），或整片改 25 fps；帧号改由累计位移驱动；去掉阈值式 speedBoost。本页 MV 的 Actor.walk() 就是按「每格整帧」实现的。',
    code: `const frameIdx = Math.floor(travelledPx / strideCyclePx * 8) % 8;   // 位移驱动，不打滑
// 或时间驱动但整帧量化： Math.floor(Math.round(t * fps) / 3) % 8`,
  },
  {
    id: 'cam', level: 'P1', proof: '源码确认', title: '每个镜头只吃第一条运镜，其余时间在漂',
    where: 'tools/engine/camera_plan.mjs:46（shot.push || shot.pushes?.[0]）',
    cause: 'pushes 数组从第 2 条起被忽略；没有显式运镜的时间全部落到 ambientCamera。相机状态只有 {cx, cy, z}，是对一张平面做平移缩放。',
    symptom: '镜头要么漫无目的地飘，要么只动一下；所有层同步缩放，没有纵深，像把一张图放大缩小。',
    fix: '改成关键帧数组 + smootherstep，每个停留段保持 0.15–0.35%/帧 的蠕动推进；要纵深就把角色放进真 3D（见下方复刻）。',
  },
  {
    id: 'whip', level: 'P2', proof: '源码确认', title: '「甩镜转场」只是硬切上叠 6 条白线',
    where: 'components/TransitionOverlay.jsx · tools/engine/timeline_core.mjs:278',
    cause: 'whip_left / whip_right / pan_through 只画 6 条 3.5 px 的白色横线，持续 0.38 s，相机本身没有任何位移或模糊。',
    symptom: '切镜时闪几道白杠，像信号故障而不是甩镜。',
    fix: '二选一：干脆卡拍硬切；或者真做——出镜尾 6 帧相机加速甩出、入镜头 6 帧减速甩入。',
  },
  {
    id: 'foot', level: 'P2', proof: '源码确认 · 取决于素材', title: '三条渲染路径的脚底基线各算各的',
    where: 'RiggedCharacter.jsx：图集 footY = −0.968h；pose 图 preserveAspectRatio="xMidYMax meet" 贴到 +0.032h',
    cause: '0.968 这个脚底比例是图集专用的经验值；裁边立绘的鞋底就在图片底边，会沉到地面线以下 3.2% 身高，而且 meet 会按宽高比改变实际显示大小。',
    symptom: '图集 ↔ 单张姿势切换时，人物上下跳一下、大小突变。',
    fix: '烘焙时为每张素材测量 foot / scale 写进清单，渲染端按清单对位，不再写死 0.968。',
  },
];

export const VERIFIED_OK = [
  '逐帧确定性没问题：components/ 与 UniversalComposition.jsx 里没有 Math.random、Date.now、CSS transition/animation（全文检索为空），状态全部由 evaluateRemotionFrameState(props, t) 纯函数给出。',
  'render_cli.mjs 已设置 chromiumOptions.gl = "angle"，换成 three.js 画面不需要再改渲染参数。',
  '图集列数在 character_motion.mjs:685 按命名规则（_2leg / _pet → 8，其余 16）给出，JSX 里的默认 16 不会误伤 8 帧图集。',
];

export const ROADMAP: { stage: string; when: string; items: string[] }[] = [
  { stage: '第一步 · 止血', when: 'P0，改三处就能见效', items: ['全量预解码贴图再放行截帧', '交叉淡化改成「新层垫底 + 旧层淡出」', '缺素材直接报错，删掉静默玩偶回退'] },
  { stage: '第二步 · 画质与节奏', when: 'P1', items: ['去掉 will-change，逻辑分辨率升到 1920×1080', '图集按最大出场尺寸重烘', '步态每格整帧 + 位移驱动', '运镜改关键帧数组，停留段保持蠕动'] },
  { stage: '第三步 · MV 线换管线', when: 'P2 / 结构性', items: ['转场只保留硬切或真甩镜', '素材清单带脚底锚点', 'MV 不再用 SVG 平面舞台，改为 Remotion 里跑 three.js 的「3D 世界 + 2D 纸片人」（本页即样板）'] },
];

export interface CastRow { id: CharId; name: string; portrait: string; before: string; now: string; why: string }
export const CAST: CastRow[] = [
  { id: 'whale', name: '鲸鱼娘', portrait: 'p_whale_neutral', before: '勇者（跑图主角）', now: '主角 · 河流引路人 / 小人鱼', why: '主角位延续；鲸尾设定天然对上人鱼，水下戏只加一条鱼尾。' },
  { id: 'gpt', name: 'GPT 龙娘', portrait: 'p_gpt_rage', before: '恶龙（LV.99 Boss）', now: '大灰狼暗影 / 守财恶龙 / 塔尖龙影', why: '反派位延续；银发红瞳龙角做成剪影也一眼能认。' },
  { id: 'claude', name: 'Claude 大小姐', portrait: 'p_claude_neutral', before: '女王陛下', now: '白雪公主 / 睡美人', why: '皇室位延续；仓库设定「公主只由 Claude 出演」，全片只有她戴金冠。' },
  { id: 'doubao', name: '豆包', portrait: 'p_doubao_neutral', before: '公主', now: '小红帽 / 红舞鞋', why: '仓库《童话镇》设定明确：豆包是红披风小红帽、不是公主、没有皇冠。' },
  { id: 'gemini', name: 'Gemini', portrait: 'p_gemini', before: '王城使者', now: '爱丽丝 / 木偶剧场报幕', why: '好奇、引路的位置延续；蓝蝴蝶结作识别。' },
  { id: 'kimi', name: 'Kimi', portrait: 'p_kimi', before: '书记官 · 圣月光', now: '灰姑娘 / 河水与长生树智者', why: '弯月发饰对午夜十二点；「月光 / 智者」气质延续。' },
  { id: 'qwen', name: '千问', portrait: 'p_qwen', before: '风车村长老', now: '疯帽子', why: '年长的茶会主人；紫金披风配紫色高礼帽。' },
  { id: 'zai', name: '智谱', portrait: 'p_zai', before: '王城禁卫', now: '彼得潘 / 杰克 / 侏儒怪', why: '按仓库设定不加叶帽和纸翅，靠飞行轨迹演彼得潘；竖琴只在「杰克」那一句出现。' },
];

export const LEARNED: { rule: string; here: string }[] = [
  { rule: '2D 角色卡片始终面向相机，自带描边，不被世界墨线勾边（cast.ts / NOINK）', here: 'Actor 卡片逐帧对齐相机朝向；像素精灵保留自己的轮廓线，世界物体用背面外壳描墨线。' },
  { rule: '一切按词级时间走，画面反应比字早 0–3 帧落地（story.ts）', here: '镜头切点 = 每句歌词起点 − 2 帧；镜头时间由歌词时间派生，改卡点后画面自动跟着走。' },
  { rule: '大跳用硬切，其余用 smootherstep 滑行；任何停留都要蠕动推进', here: 'glide() = 线性与 smootherstep 混合，每个镜头的相机都在持续移动；重拍再叠约 0.5° 的推镜。' },
  { rule: '冲击抖动逐帧翻转方向并快速衰减', here: '「扬起水花」一镜的相机抖动按帧号奇偶翻转、随拍内相位指数衰减。' },
  { rule: '光照做成预设；冷色只进暗部；雾色 = 地平线色（lights.ts）', here: '10 套预设（白昼 / 金色时刻 / 晚霞 / 森林 / 夜 / 魔法 / 水下 / 洞窟 / 舞台 / 草原），半球环境光给暗部上色，雾直接取地平线色。' },
  { rule: '两阶卡通着色 + 手绘贴图把缝线画进去（shade.ts / paint.ts）', here: '三阶色阶的卡通材质；民居墙面的门窗和墙脚直接画在 Canvas 贴图里。' },
  { rule: '卡片吃场景光、不自发光，脚下要有接触阴影（cardshade.ts）', here: '每套光照带一个卡片染色值；每个角色脚下有随离地高度收缩的阴影斑。' },
  { rule: '用真实渲染帧做分镜总览来查错（contact sheet）', here: '下方分镜表的缩略图是同一套引擎逐镜渲染出来的，不是示意图。' },
];
export const NOT_DONE = [
  '景深镜头模糊（lensblur.ts）与泛光：没有做后期链，纵深只靠雾和构图。',
  '深度 / 法线边缘检测的墨线后期（ink.ts）：这里用的是背面外壳法，折线处不如后期描边干净。',
  '音效与配乐合成、响度母带：本页不含任何音频。',
  '2K 竖屏导出与逐帧 QA 脚本：需要在本地用 Remotion CLI 渲染后再跑。',
];
