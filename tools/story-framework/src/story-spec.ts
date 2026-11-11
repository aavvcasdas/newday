import {createTimeline, type Timeline} from './timeline';
import type {CharId} from './actors';
import type {LookName} from './kit';
import type {V3} from './core';

/** The same declarative contract can describe either a Day episode or a lyric MV. */
export type ActorPlan = {character: CharId; from: V3; to?: V3; action: 'walk' | 'front'; size?: number; flip?: boolean};
export type ScenePlan = {id: string; start: number; look: LookName; set?: 'village' | 'forest' | 'plain'; camera: {position: V3; target: V3; fov?: number}; actors: ActorPlan[]};
export type Caption = {start: number; end: number; text: string};
export type StorySpec = {kind: 'day' | 'mv'; title: string; duration: number; bpm: number; scenes: ScenePlan[]; captions: Caption[]; timing: 'planning' | 'measured'};
const actors = new Set(['whale','gpt','claude','doubao','gemini','kimi','qwen','zai']);
const looks = new Set(['stage','day','forest','night','dusk','savanna','cave','golden','sea','magic']);
const vec=(v: unknown): v is V3 => Array.isArray(v) && v.length===3 && v.every(Number.isFinite);
export function validateStory(spec: StorySpec): Timeline {
 if (!spec || !['day','mv'].includes(spec.kind) || !['planning','measured'].includes(spec.timing) || !spec.title?.trim()) throw new Error('项目类型、标题或时间轴状态无效');
 if (!Array.isArray(spec.scenes) || !Array.isArray(spec.captions)) throw new Error('缺少镜头或字幕数组');
 const ids=new Set<string>();
 for (const s of spec.scenes) {
  if (ids.has(s.id)) throw new Error(`镜头 ID 重复: ${s.id}`); ids.add(s.id);
  if ((s.set !== undefined && !['village','forest','plain'].includes(s.set)) || !looks.has(s.look) || !s.camera || !vec(s.camera.position) || !vec(s.camera.target) || (s.camera.fov!==undefined && (!Number.isFinite(s.camera.fov) || s.camera.fov<=0 || s.camera.fov>=180))) throw new Error(`镜头 ${s.id} 的光照或相机无效`);
  if (!Array.isArray(s.actors)) throw new Error(`镜头 ${s.id} 的角色无效`);
  for(const a of s.actors) {
   if (!actors.has(a.character) || !['walk','front'].includes(a.action) || !vec(a.from) || (a.to!==undefined && !vec(a.to)) || (a.size!==undefined && (!Number.isFinite(a.size) || a.size<=0))) throw new Error(`镜头 ${s.id} 中角色或动作无效`);
  }
 }
 for(const c of spec.captions) if(typeof c.text !== 'string' || !c.text.trim()) throw new Error('字幕文本不能为空');
 return createTimeline({duration:spec.duration,bpm:spec.bpm,shots:spec.scenes.map(s=>({id:s.id,a:s.start})),starts:spec.captions.map(c=>c.start),ends:spec.captions.map(c=>c.end)});
}
