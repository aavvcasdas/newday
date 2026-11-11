import type { ShotDef } from './core';
import type { MVProps } from './MVComp';
import { FPS } from './timeline';

/** Reject invalid or incomplete projects before producing a misleading MP4. */
export function validateProject(props: MVProps, shots: Record<string, ShotDef>, fps = FPS): void {
  const t=props.timeline;
  if (fps !== FPS) throw new Error(`当前步态和镜头引擎仅支持 ${FPS} fps`);
  if (!t || !Number.isFinite(t.duration) || t.duration <= 0 || t.frames !== Math.ceil(t.duration*FPS)) throw new Error('时间轴时长/帧数无效');
  if (!t.shots.length || t.shots[0].a !== 0) throw new Error('镜头必须从 0 秒开始');
  t.shots.forEach((s,i)=>{
    if(!shots[s.id]) throw new Error(`未注册镜头 ${s.id}`);
    if(!Number.isFinite(s.a) || !Number.isFinite(s.b) || s.a<0 || s.b<=s.a || Math.abs(s.b-(t.shots[i+1]?.a ?? t.duration))>1e-6) throw new Error(`镜头 ${s.id} 区间不连续`);
  });
  if(t.starts.length!==t.ends.length || t.starts.length!==props.lyrics.length) throw new Error('歌词与起止时间数量不一致');
  t.starts.forEach((start,i)=>{ if(!Number.isFinite(start) || !Number.isFinite(t.ends[i]) || start<0 || t.ends[i]<=start || t.ends[i]>t.duration || (i>0 && start<t.ends[i-1])) throw new Error(`歌词 ${i+1} 时间无效`); });
  if(t.marks.length<2 || t.counts.length!==t.marks.length-1 || t.marks[0]!==0 || t.marks[t.marks.length-1]!==t.duration || t.marks.some((m,i)=>!Number.isFinite(m)||(i>0 && m<=t.marks[i-1])) || t.counts.some(c=>!Number.isInteger(c)||c<1)) throw new Error('节拍网格无效');
  if (!Number.isFinite(props.audioOffset)) throw new Error('音频偏移无效');
}
