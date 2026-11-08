import {test} from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require2=createRequire(new URL('../engine/package.json',import.meta.url));
const {createCanvas,loadImage}=require2('@napi-rs/canvas');
import {loadContactActors,actorAnchors,drawContactActor,CALIBRATION} from './actor_contacts.mjs';
import {sampleInteraction,presentationFrame,validateEvent,PROP_LIBRARY} from './cue_props_engine.mjs';
import {validateGeneratedProp} from './validate_generated_prop.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url));
// 角色姿势 PNG（whale_*.png）是外部素材，未随仓库分发；缺图时整组用例跳过，
// 而不是抛「缺少既有角色素材」把测试套件带崩。
const HAVE_ART=fs.existsSync(path.join(HERE,'../engine/whale_rig/whale_idle.png'));
const it=HAVE_ART?test:test.skip;
if(HAVE_ART)await loadContactActors({createCanvas,loadImage});
const event={verb:'drop_bonk',startFrame:10,contactFrame:20,endFrame:70,measured:false,params:{scale:.7,land:[600,550]}};
it('estimated contact must not silently become measured',()=>{assert.equal(validateEvent(event).measured,false);assert.throws(()=>validateEvent({...event,measured:true}),/audio hash/);assert.throws(()=>validateEvent({...event,measured:undefined}),/Explicit/);});
it('unsupported verbs fail rather than pretending eight verbs exist',()=>assert.throws(()=>validateEvent({...event,verb:'word_morph'}),/Unimplemented/));
it('two frames, not three, are frozen; time resumes without jumping',()=>assert.deepEqual([19,20,21,22,23].map(f=>presentationFrame(f,20)),[19,20,20,21,22]));
it('head collision uses prop bottom, not its center',()=>{const a={headTop:[400,200]},s=sampleInteraction(20,event,{contact:a});assert.equal(s.position[0],400);assert.ok(Math.abs(s.position[1]+26.6-200)<1e-9);});
it('bread settles with bottom on actual tabletop',()=>{const s=sampleInteraction(69,event,{contact:{headTop:[400,200]}});assert.ok(Math.abs(s.position[1]+26.6-550)<1e-9);assert.equal(s.position[0],600);});
it('bubble collision uses edge pivot and has two-frame hit stop',()=>{const e={...event,verb:'slap_deflect',params:{scale:.8}},a={fingerR:[900,300]};const x=sampleInteraction(20,e,{contact:a}),y=sampleInteraction(21,e,{contact:a}),z=sampleInteraction(22,e,{contact:a});assert.deepEqual(x.position,a.fingerR);assert.deepEqual(x,y);assert.notDeepEqual(x,z);assert.equal(x.originOffset[0],86.4);});
it('uncalibrated poses fail closed',()=>assert.throws(()=>actorAnchors({pose:'imaginary_pose',x:0,y:0}),/Uncalibrated/));
it('mirroring is shared by rendered actor and anchor projector',()=>{const a={pose:'point',x:500,y:600,u:40};const r=actorAnchors(a).handR,l=actorAnchors({...a,flip:true}).handR;assert.ok(Math.abs(r[0]+l[0]-1000)<1e-7);assert.equal(r[1],l[1]);});
it('moving the actual raised arm moves the calibrated finger, not the face',()=>{const a={pose:'point',x:500,y:600,u:40},x=actorAnchors(a),y=actorAnchors({...a,anim:{bones:{armR:{rot:.18}}}});assert.ok(Math.hypot(y.fingerR[0]-x.fingerR[0],y.fingerR[1]-x.fingerR[1])>8);assert.deepEqual(x.mouth,y.mouth);});
it('palm landmarks exist on opaque source pixels (not blank image corners)',async()=>{for(const [pose,landmarks] of Object.entries(CALIBRATION)){const im=await loadImage(path.join(HERE,`../engine/whale_rig/whale_${pose}.png`)),c=createCanvas(im.width,im.height),g=c.getContext('2d');g.drawImage(im,0,0);for(const key of ['handR','handL']){const [x,y]=landmarks[key];assert.ok(g.getImageData(x,y,1,1).data[3]>128,`${pose}.${key}`);}}});
it('actor cached rendering is deterministic',()=>{function render(){const c=createCanvas(1280,720);drawContactActor(c.getContext('2d'),{pose:'point',x:500,y:600,u:40});return createHash('sha256').update(c.data()).digest('hex');}assert.equal(render(),render());});
it('reviewed route-2A prop passes all four pixel smoke tests（单集道具脚本已归档）',async()=>assert.equal((await validateGeneratedProp(path.join(HERE,'../day10制作/generated_props/seat_sign.mjs'))).passed,true));
it('prop text rejects numeric payloads',()=>{const c=createCanvas(300,200);assert.throws(()=>PROP_LIBRARY.speech_missile.draw(c.getContext('2d'),0,{text:'加100鸡腿'}),/Numeric/);});
it('sample never claims an audio source or measured words（单集规划轴已归档）',()=>{const p=JSON.parse(fs.readFileSync(path.join(HERE,'../day10制作/互动样片_规划轴.json')));assert.equal(p.measured,false);assert.ok(p.events.every(e=>e.measured===false));assert.equal(p.frames,570);assert.equal(p.screens.at(-1).end+.2,p.duration);});
it('semantic tail animation changes tail pixels without shifting the face anchor',()=>{const a={pose:'shock',x:500,y:600,u:40},b={...a,anim:{bones:{tail:{rot:.1}}}},render=x=>{const c=createCanvas(1280,720);drawContactActor(c.getContext('2d'),x);return createHash('sha256').update(c.data()).digest('hex');};assert.deepEqual(actorAnchors(a).mouth,actorAnchors(b).mouth);assert.notEqual(render(a),render(b));});
