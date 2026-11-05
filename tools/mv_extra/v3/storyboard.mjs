/**
 * storyboard.mjs — Programmatic Storyboard & SRT Generator + Coverage Validator for v3
 * (modeled directly on Nyankomintsu/world-execute-me-lyric-mv/tools/storyboard.mjs).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT } from './actors.mjs';
import { FPS, TOTAL_FRAMES, DURATION, ACTS, SHOTS, CUES, TEMPO, SCRIPT_SHA } from './plan.mjs';

function fmtSrtTime(sec) {
  const msTotal = Math.round(sec * 1000);
  const h = Math.floor(msTotal / 3600000);
  const m = Math.floor((msTotal % 3600000) / 60000);
  const s = Math.floor((msTotal % 60000) / 1000);
  const ms = msTotal % 1000;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

export function generateStoryboardAndSrt() {
  // 1. Strict frame partition audit
  if (SHOTS[0].f0 !== 0 || SHOTS[SHOTS.length - 1].f1 !== TOTAL_FRAMES) {
    throw new Error('SHOTS do not span [0, TOTAL_FRAMES)');
  }
  for (let i = 1; i < SHOTS.length; i++) {
    if (SHOTS[i].f0 !== SHOTS[i - 1].f1) {
      throw new Error(`Frame gap/overlap between ${SHOTS[i - 1].id} and ${SHOTS[i].id}`);
    }
  }

  // 2. Write 16-line SRT
  const srtLines = CUES.map(
    (c, idx) => `${idx + 1}\n${fmtSrtTime(c.start)} --> ${fmtSrtTime(c.end)}\n${c.text}\n`
  ).join('\n');
  const srtOut = path.join(ROOT, '番外MV/把回忆拼好给你/字幕/v3_歌词.srt');
  fs.mkdirSync(path.dirname(srtOut), { recursive: true });
  fs.writeFileSync(srtOut, srtLines, 'utf8');

  // 3. Build STORYBOARD.md
  const castAppearance = {};
  for (const s of SHOTS) {
    for (const actor of s.cast) {
      if (!castAppearance[actor]) castAppearance[actor] = [];
      castAppearance[actor].push(`#${String(s.index).padStart(2, '0')}`);
    }
  }

  const md = [
    '# 《把回忆拼好给你》番外 MV · v3 逐帧代码渲染分镜总表 (STORYBOARD)',
    '',
    '> **声明**：本作品为**非官方同人 / AI 辅助代码生成**番外 MV。音频保持用户参考音频原速原长不二压（`assets/mv-extra/user_reference_audio.m4a` 无损 `-c:a copy`），画面由 `tools/mv_extra/v3/` 纯确定性 `render(ctx, t)` 逐帧代码绘制，未拷贝参考视频任何像素帧，亦未复制外部参考仓库任何角色图像资产。',
    '',
    '## 一、全局技术规格与节拍网格',
    '',
    `- **成片画幅与帧率**：\`1920 × 1080\` @ \`${FPS} fps\`，总帧数 \`${TOTAL_FRAMES}\` 帧（\`0.000s – ${DURATION.toFixed(3)}s\`）`,
    `- **实测节拍网格**：慢拍 \`BPM = ${TEMPO.bpm}\`（倍速脉冲 \`${TEMPO.doubleTimeBpm}\`，单拍 \`SPB = ${TEMPO.spb}s\`，起拍锚点 \`beat0 = ${TEMPO.beat0.toFixed(3)}s\`）`,
    `- **锁定 16 句歌词脚本 SHA-256**：\`${SCRIPT_SHA}\`（由 \`fill_lyrics.mjs\` 运行时绑定，渲染代码中零硬编码歌词字符串）`,
    '- **双参考项目方法论融合**：',
    '  1. 借鉴 `xiaosia/voxel-mv`：全片划分为 **A–E 五大情绪幕（Acts）**，每幕独立世界观、立体微缩三层景深、统一色调分级（Grade）、方块粒子物理与真实足底落地的全阵容走位；',
    '  2. 借鉴 `Nyankomintsu/world-execute-me-lyric-mv`：纯函数时间轴 `render(ctx, t)`、纸纹底版与 45° 网点屏、四角套准裁切线、错位套印字版、印章字块按字词节拍弹出、以及由分镜表代码自动生成并校验本 `STORYBOARD.md`。',
    '',
    '## 二、五大幕（Acts A–E）情绪与色彩状态机',
    '',
    '| 幕次 | 帧区间 | 时间区间 | 微缩世界转换 (`world`) | 影调与色彩状态机 (`paletteState`) | 情绪能量 (`energy`) |',
    '| :---: | :---: | :---: | :--- | :--- | :---: |',
    ...ACTS.map(
      (a) =>
        `| **Act ${a.id} · ${a.title}** | \`${a.f0}–${a.f1}\` | \`${(a.f0 / FPS).toFixed(2)}–${(a.f1 / FPS).toFixed(2)}s\` | ${a.world} | \`${a.paletteState}\` | ${a.energy} |`
    ),
    '',
    '## 三、全阵容角色出场索引（当前项目形象）',
    '',
    '| 角色 ID | 项目内形象来源与技术处理 | 出场镜号（共 32 镜） |',
    '| :--- | :--- | :--- |',
    `| \`whale\`（鲸鱼娘·主角「我」） | \`video-fx/src/whale_girl_rig_data.js\` 原版 104×102 像素骨架 + 5 视角合法睁眼 \`wave\` 头缓存（\`squint=0.01, tailScale=1.0\`）+ 步态/屈膝/抱片/握绸校准 | ${castAppearance.whale.join(', ')} |`,
    `| \`doubao\`（豆包·对手戏「你」） | \`assets/ai-girls/doubao/doubao-cutout.png\` 全身透明抠图，真实可见鞋底像素对齐地面 | ${castAppearance.doubao.join(', ')} |`,
    `| \`claude\`（Claude 大小姐） | \`assets/ai-girls/extra-guests/claude.png\` 透明读书 Q 版（CC BY-NC-SA 4.0） | ${castAppearance.claude.join(', ')} |`,
    `| \`gemini\`（Gemini） | \`assets/ai-girls/extra-guests/cutouts/gemini.png\` 原 RGB 透明衍生（星岛守望 / 海滩红风筝） | ${castAppearance.gemini.join(', ')} |`,
    `| \`qwen\`（千问 Qwen） | \`assets/ai-girls/extra-guests/cutouts/qwen.png\` 原 RGB 透明衍生（晴坡陪伴 / 撕云见日） | ${castAppearance.qwen.join(', ')} |`,
    `| \`gpt\`（GPT） | \`assets/ai-girls/extra-guests/cutouts/gpt.png\` 原 RGB 透明衍生（晴丘快乐木盒与淘汰乌云） | ${castAppearance.gpt.join(', ')} |`,
    `| \`kimi\`（Kimi） | \`assets/ai-girls/extra-guests/cutouts/kimi.png\` 原 RGB 透明衍生（星夜星座观海） | ${castAppearance.kimi.join(', ')} |`,
    '',
    '## 四、16 句锁定歌词时间轴与对应镜头表',
    '',
    '| 句号 | 段落 | 起止时间 | 时长 | 对应镜号 | 锁定歌词原文 |',
    '| :---: | :---: | :---: | :---: | :---: | :--- |',
    ...CUES.map((c) => {
      const matching = SHOTS.filter((s) => s.lines.includes(c.line))
        .map((s) => `#${String(s.index).padStart(2, '0')}`)
        .join(', ');
      return `| L${String(c.line).padStart(2, '0')} | \`${c.section}\` | \`${c.start.toFixed(3)}s – ${c.end.toFixed(3)}s\` | \`${(c.end - c.start).toFixed(2)}s\` | ${matching} | ${c.text} |`;
    }),
    '',
    '## 五、32 镜逐镜导演与构图规格表',
    '',
    '| # | 镜头 ID | 幕 | 时间 (`bar:beat`) | 歌词句 | 景别 / 转场 | 出场角色 | 版式与画面舞台 (`layout`) | 动作因果与落点 (`action` / `hold`) |',
    '| :---: | :--- | :---: | :---: | :---: | :---: | :--- | :--- | :--- |',
    ...SHOTS.map((s) => {
      const ln = s.lines.length ? `L${String(s.lines[0]).padStart(2, '0')}` : 'Intro/Outro';
      const castStr = s.cast.length ? s.cast.join(', ') : '纯景物版画';
      return `| ${String(s.index).padStart(2, '0')} | \`${s.id}\` | ${s.act} | \`${s.start.toFixed(2)}–${s.end.toFixed(2)}s\` (\`${s.barBeat}\`) | ${ln} | \`${s.framing}\` / \`${s.enter}\` | \`${castStr}\` | ${s.layout} | ${s.direction.action}（定格余量 \`${s.direction.holdSeconds.toFixed(2)}s\`） |`;
    }),
    '',
  ].join('\n');

  const mdOut = path.join(ROOT, '番外MV/把回忆拼好给你/STORYBOARD.md');
  fs.writeFileSync(mdOut, md, 'utf8');
  console.log(`Validated 32 shots across ${TOTAL_FRAMES} frames -> STORYBOARD.md & 字幕/v3_歌词.srt`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  generateStoryboardAndSrt();
}
