// 独立歌曲示例：节拍为手填估计，歌词区间为规划，不代表原曲实测。
import type {StorySpec} from '../src/story-spec';
export const spec: StorySpec = {
 kind:'mv',title:'MV 通用示例',duration:6,bpm:120,timing:'planning',
 scenes:[
  {id:'intro',start:0,look:'day',set:'village',camera:{position:[0,3.5,10],target:[0,1.1,0]},actors:[{character:'whale',action:'walk',from:[-2.5,0,0],to:[2.5,0,0]}]},
  {id:'chorus',start:3,look:'night',set:'forest',camera:{position:[0,3.5,10],target:[0,1.1,0]},actors:[{character:'whale',action:'front',from:[-1.2,0,0]},{character:'claude',action:'front',from:[1.2,0,0]}]},
 ],
 captions:[{start:.3,end:2.8,text:'这是一句示例歌词'},{start:3.2,end:5.8,text:'一起走进新的故事'}],
};
