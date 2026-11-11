// 示例仅作框架验证：不是现有 Day 集数的剧情、配音或经过实测的时间轴。
import type {StorySpec} from '../src/story-spec';
export const spec: StorySpec = {
 kind:'day', title:'Day 通用示例', duration:6, bpm:120, timing:'planning',
 scenes:[
  {id:'opening',start:0,look:'day',set:'village',camera:{position:[0,3.5,10],target:[0,1.1,0]},actors:[{character:'whale',action:'walk',from:[-2.5,0,0],to:[-1,0,0]}]},
  {id:'meeting',start:3,look:'stage',set:'forest',camera:{position:[0,3.5,10],target:[0,1.1,0]},actors:[{character:'whale',action:'front',from:[-1.2,0,0]},{character:'claude',action:'front',from:[1.2,0,0]}]},
 ],
 captions:[{start:.4,end:2.8,text:'今天，我们一起出发。'},{start:3.2,end:5.8,text:'你好，欢迎来到新的一天。'}],
};
