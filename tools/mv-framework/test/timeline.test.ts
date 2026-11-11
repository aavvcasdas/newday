import test from 'node:test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {createTimeline, shotIndexAt, cueAt, beatAt} from '../src/timeline';
import {validateProject} from '../src/project';
import {makeTimeline, LYRICS} from '../src/tonghuazhen';
import type { ShotDef } from '../src/core';
import type { MVProps } from '../src/MVComp';
const shots: Record<string, ShotDef> = Object.fromEntries(makeTimeline().shots.map(s=>[s.id,{} as ShotDef]));
const props: MVProps = {timeline:makeTimeline(),lyrics:LYRICS,title:'童话镇',subtitle:'',endTitle:'',endShot:'OUT',audioSrc:null,audioOffset:0,showLyrics:true};
test('网页示例的 40 镜和 31 句歌词均已注册且时间有效',()=>{
 const src=['shotsA.ts','shotsB.ts'].map(f=>readFileSync(new URL('../src/'+f,import.meta.url),'utf8')).join('\n');
 const ids=[...src.matchAll(/^\s*id:\s*'([^']+)'[,]\s*look:/gm)].map(m=>m[1]);
 assert.equal(new Set(ids).size, ids.length);
 for (const shot of props.timeline.shots) assert.ok(ids.includes(shot.id), `missing ${shot.id}`);
 validateProject(props,shots); assert.equal(props.timeline.shots.length,40); assert.equal(props.lyrics.length,31); assert.equal(props.timeline.frames,4272);
 assert.equal(shotIndexAt(props.timeline,13.55),3); assert.equal(cueAt(props.timeline,13.55)?.i,0);
});
test('不同歌曲可独立定义时间轴、歌词和镜头，不依赖童话镇',()=>{
 const t=createTimeline({duration:4,shots:[{id:'a',a:0},{id:'b',a:2}],starts:[.2,2.1],ends:[1.8,3.5],bpm:120});
 const custom={...props,timeline:t,lyrics:['一','二']};
 validateProject(custom,{a:shots.I1,b:shots.I2});
 assert.equal(shotIndexAt(t,2),1); assert.equal(cueAt(t,2.2)?.i,1); assert.equal(beatAt(t,2).len,.5);
 assert.throws(()=>validateProject(custom,{a:shots.I1}),/未注册镜头/);
 assert.throws(()=>validateProject({...custom,lyrics:['一']},{a:shots.I1,b:shots.I2}),/数量/);
 assert.throws(()=>validateProject(custom,{a:shots.I1,b:shots.I2},24),/30 fps/);
});
test('拒绝非法镜头、歌词、节拍和片长',()=>{
 assert.throws(()=>createTimeline({duration:4,shots:[{id:'a',a:1}],bpm:120}),/0 秒/);
 assert.throws(()=>createTimeline({duration:4,shots:[{id:'a',a:0},{id:'b',a:0}],bpm:120}),/递增/);
 assert.throws(()=>createTimeline({duration:4,shots:[{id:'a',a:0}],starts:[2],ends:[1],bpm:120}),/歌词/);
 assert.throws(()=>createTimeline({duration:4,shots:[{id:'a',a:0}],bpm:0}),/正数/);
});
