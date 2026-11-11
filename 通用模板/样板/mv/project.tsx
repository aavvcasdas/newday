// 歌词 MV（MV 线）样板。新开一部：npm run new -- mv 番外MV/歌名 "歌名"，然后换 歌词.srt、素材/ 里的原曲和 shots/。
// 完整的参考作品见 番外MV/童话镇（40 个镜头，自己写排镜函数 plan.ts）。
import { defineProject, type CueFile } from '@tpl/project';
import cues from './cues.json';
import film from './film.json';
import { SHOTS } from './shots/shots';

export default defineProject({
  id: film.id,
  kind: 'mv',
  title: film.title,
  cues: cues as CueFile,
  shots: SHOTS,
  // 排镜：cue = 从第几句（0 起）开口前 2 帧切入；after = 第几句唱完后 0.15 秒切入；第一个镜头永远从 0 秒开始。
  planShots: [
    { id: 'I1' },
    { id: 'L1', cue: 0 },
    { id: 'L2', cue: 2 },
    { id: 'OUT', after: 3 },
  ],
  // tail：最后一句唱完后片子还有多长（秒）。beat：'estimate' 按每句 8 拍估节拍；跑过 align 之后可改成 'measured' 用实测拍点。
  planOptions: { tail: 3.5, beat: 'estimate' },
  cards: { title: { main: 'MV 样板', sub: '把这行换成副标题' }, end: { shot: 'OUT', text: '完' } },
});
