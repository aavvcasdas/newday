import test from 'node:test';
import assert from 'node:assert/strict';
import {validateStory, type StorySpec} from '../src/story-spec';
import {spec as day} from '../templates/day.spec';
import {spec as mv} from '../templates/mv.spec';

test('Day 与 MV 模板共用可验证时间轴',()=>{
 for(const project of [day,mv]){
  const tl=validateStory(project);
  assert.equal(tl.frames,180); assert.equal(tl.shots.length,2); assert.equal(tl.starts.length,2);
  assert.equal(project.timing,'planning');
 }
});
test('非法镜头、字幕、角色、动作与相机不能静默回退',()=>{
 const clone=(): StorySpec=>structuredClone(day);
 let x=clone(); x.scenes[1].id=x.scenes[0].id; assert.throws(()=>validateStory(x),/重复/);
 x=clone(); x.scenes[0].actors[0].character='unknown' as never; assert.throws(()=>validateStory(x),/角色或动作/);
 x=clone(); x.scenes[0].camera.fov=0; assert.throws(()=>validateStory(x),/相机/);
 x=clone(); x.captions[0].end=9; assert.throws(()=>validateStory(x),/歌词时间/);
 x=clone(); x.captions[0].text=' '; assert.throws(()=>validateStory(x),/字幕/);
});
