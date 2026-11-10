// Reusable paper-card cast. Actor drawings are small cached pose atlases, then moved as 3D cut-outs.
import * as THREE from 'three';
import * as A from './art.js';
import { texOf } from './book.js';
import { cutMesh, blobShadow } from './cutmesh.js';

const POSE_CACHE=new Map();
const PHASED=new Set(['swim','dance','row']);
function frameFor(pose,phase){return PHASED.has(pose)?Math.floor((((phase/Math.PI/2)%4)+4)%4):0;}
function textureFor(role,pose,phase,expression){
  const frame=frameFor(pose,phase),key=`${role}|${pose}|${frame}|${expression||''}`;
  if(POSE_CACHE.has(key))return POSE_CACHE.get(key);
  const angle=frame*Math.PI/2;
  const c=A.actorSprite(role,pose,angle,expression||'');const t=texOf(c);POSE_CACHE.set(key,t);return t;
}
export function makeActor(role,height=.056){
  const pose='idle',expression='happy',tex=textureFor(role,pose,0,expression);
  const image=tex.image;
  const root=new THREE.Group();
  const item={c:image,w:height*A.ACTOR_W/A.ACTOR_H,h:height,ax:.5,ay:1};
  const card=cutMesh(item,{tex,backCol:'#eee7d7'});card.castShadow=true;root.add(card);
  const shadow=blobShadow(height*.29,.42);shadow.position.y=.0005;
  let current='';
  return {
    role,root,card,shadow,height,
    setPose(poseName='idle',phase=0,face='happy'){
      const f=frameFor(poseName,phase),key=`${poseName}|${f}|${face}`;if(key===current)return;current=key;
      const t=textureFor(role,poseName,phase,face);
      card.scale.set(poseName==='sleep'?A.ACTOR_H/A.ACTOR_W:1,1,1);
      card.userData.front.material.map=t;card.userData.back.material.map=t;
      card.userData.front.material.needsUpdate=true;card.userData.back.material.needsUpdate=true;
    },
    setPosition(x,y,z,scale=1,rot=0){root.position.set(x,y,z);root.scale.setScalar(scale);root.rotation.set(0,0,rot);shadow.position.set(x,.0005,z);shadow.scale.set(scale,scale,1);},
    setVisible(v){root.visible=!!v;shadow.visible=!!v;},
    setOpacity(alpha=1){for(const m of [card.userData.front.material,card.userData.back.material]){m.transparent=alpha<1;m.opacity=alpha;m.depthWrite=alpha>=1;m.needsUpdate=true;}},
  };
}
export function poseCacheStats(){return {textures:POSE_CACHE.size};}
