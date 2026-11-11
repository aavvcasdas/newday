// 口播片（Day 线）样板。新开一集：npm run new -- day Day/Day15 "标题"，然后改 台词.txt 和 shots/。
import { defineProject, type CueFile } from '@tpl/project';
import cues from './cues.json';
import film from './film.json';
import { SHOTS } from './shots/shots';

export default defineProject({
  id: film.id,
  kind: 'day',
  title: film.title,
  cues: cues as CueFile,
  shots: SHOTS,
  // 排镜：每个镜头从「第 cue 句开口前 2 帧」开始（cue 从 0 数）。第一个镜头永远从 0 秒开始。
  planShots: [
    { id: 'S1', cue: 0 },
    { id: 'S2', cue: 2 },
    { id: 'S3', cue: 4 },
  ],
  // 最后一句说完再留 0.6 秒就结束：不加片尾卡、不加角标。
  planOptions: { tail: 0.6 },
});
