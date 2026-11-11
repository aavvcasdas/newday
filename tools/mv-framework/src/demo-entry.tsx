// An independent two-shot project, demonstrating that the engine is not tied to 童话镇.
import React from 'react';
import {Composition, registerRoot} from 'remotion';
import {createMVComp, type MVProps} from './MVComp';
import {cam, type ShotDef} from './core';
import {box} from './kit';
import {createTimeline} from './timeline';
import './font.css';
const defs: ShotDef[] = [
 {id:'hello',title:'问候',note:'挥手',look:'day',cast:['whale'],build:k=>{k.add(box(20,.3,12,0x77aa88));const a=k.actor('whale');return f=>{a.at(-2+f.u*3,0,0).set('whale_wave'); return cam([0,6,15],[0,2,0]);};}},
 {id:'night',title:'夜景',note:'转场',look:'night',cast:['claude'],build:k=>{k.add(box(20,.3,12,0x556688));const a=k.actor('claude');return f=>{a.at(1,0,0).walk(f.T);return cam([0,6,15],[0,2,0]);};}},
];
const map=Object.fromEntries(defs.map(s=>[s.id,s]));
const MV=createMVComp(map);
const defaults: MVProps={timeline:createTimeline({duration:4,shots:[{id:'hello',a:0},{id:'night',a:2}],starts:[.2,2.2],ends:[1.8,3.8],bpm:120}),lyrics:['新的歌曲','新的镜头'],title:'新歌',subtitle:'通用框架示例',endTitle:'',endShot:'',audioSrc:null,audioOffset:0,showLyrics:true};
registerRoot(()=> <Composition id="MV" component={MV} width={1920} height={1080} fps={30} durationInFrames={defaults.timeline.frames} defaultProps={defaults}/>);
