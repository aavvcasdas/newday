import {cam, type ShotDef} from './core';
import {box, house, tree, pine, lerp} from './kit';
import type {ScenePlan} from './story-spec';

/** Default configurable stage; replace build() for richer three.js scenes. */
export function buildStoryShots(scenes: ScenePlan[]): Record<string, ShotDef> {
 const definitions: ShotDef[]=scenes.map(s=>({
  id:s.id, look:s.look, title:s.id, note:'通用舞台', cast:s.actors.map(a=>a.character),
  build:k=>{
   k.add(box(50,.2,36,0x89b69a),0,-.2,0);
   if ((s.set ?? 'village') === 'village') {
    k.add(box(40,.06,3,0xeed7ab,0),0,0,0);
    for (const [i,x] of [-9,-4,2,8].entries()) k.add(house(3,2.5,3,0xf5dfbf,[0xce6247,0x328b95,0x4676bf,0xc47a44][i]),x,0,-7);
    k.add(tree(4,0x59ac64,1),-7,0,-3.5); k.add(tree(3.8,0x67b86b,2),7,0,-3.5);
   } else if (s.set === 'forest') {
    k.add(box(40,.06,3,0xa08065,0),0,0,0);
    for(let i=0;i<9;i++) k.add(pine(4+(i%3),i%2?0x276a4e:0x368756),-12+i*3,0,-4-(i%2)*2);
   }
   const actors=s.actors.map(a=>k.actor(a.character,a.size ?? 1));
   return f=>{
    s.actors.forEach((a,i)=>{
     const end=a.to ?? a.from;
     const actor=actors[i].at(lerp(a.from[0],end[0],f.u),lerp(a.from[1],end[1],f.u),lerp(a.from[2],end[2],f.u)).flip(a.flip ?? false);
     if(a.action==='walk') actor.walk(f.T); else actor.front(f.T);
    });
    return cam(s.camera.position,s.camera.target,s.camera.fov ?? 38);
   };
  }
 }));
 return Object.fromEntries(definitions.map(s=>[s.id,s]));
}
