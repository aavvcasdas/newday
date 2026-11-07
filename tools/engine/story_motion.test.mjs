import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateMotionPath,sampleMotionPath,validateAttachment,attachedPosition} from './story_motion.mjs';
import {semanticStateAt,validateSemanticTracks} from './semantic_tracks.mjs';
import {resolveActor} from './render_episode.mjs';
const keys=[{at:0,x:100,y:500},{at:2,x:300,y:500},{at:3,x:300,y:500},{at:4,x:350,y:450}];
test('path pure and endpoints hold, invalid tracks rejected',()=>{assert.equal(validateMotionPath(keys),true);assert.deepEqual(sampleMotionPath(keys,-1),{x:100,y:500,moving:false});assert.equal(sampleMotionPath(keys,1).x,200);assert.equal(sampleMotionPath(keys,2.5).moving,false);assert.deepEqual(sampleMotionPath(keys,4),{x:350,y:450,moving:false});assert.throws(()=>validateMotionPath([{at:1,x:0,y:0},{at:1,x:2,y:0}]),/increase/)});
test('Day actor resolves motion path and selects gait only in travel',()=>{let plan={pose:'point',x:100,y:500,u:38,idleMotion:0,motionPath:keys};assert.equal(resolveActor(plan,1,1).x,200);assert.ok(resolveActor(plan,1,1).anim.bones.legL);assert.equal(resolveActor(plan,2.5,1).anim.bones.legL,undefined);assert.equal(resolveActor(plan,4,1).y,450)});
test('attachment follows supplied hand at each time, releases from final hand without jump',()=>{const attach={actor:0,anchor:'handR',from:1,to:3,offset:[5,10],release:{duration:1,to:[500,300]}};const anchor=(_i,_n,t)=>[t*100,200];assert.equal(validateAttachment(attach),true);assert.deepEqual(attachedPosition(attach,.5,anchor),null);assert.deepEqual(attachedPosition(attach,2,anchor),{x:205,y:210,held:true});assert.deepEqual(attachedPosition(attach,3,anchor),{x:305,y:210,held:true});assert.ok(Math.abs(attachedPosition(attach,3.000001,anchor).x-305)<.001);assert.deepEqual(attachedPosition(attach,4,anchor),{x:500,y:300,held:false});assert.throws(()=>attachedPosition(attach,2,()=>null),/missing calibrated/)});
test('semantic object executes attachment rather than independent motion',()=>{const track={id:'paper',kind:'sheet',x:100,y:200,w:60,h:40,from:0,to:5,attach:{actor:0,anchor:'handR',from:1,to:3,release:{duration:1,to:[400,300]}}};assert.doesNotThrow(()=>validateSemanticTracks([track]));let s=semanticStateAt(track,2,{anchorAt:(_a,_k,t)=>[100+t*10,250]});assert.equal(s.x,120);assert.equal(s.y,250);assert.throws(()=>semanticStateAt(track,2),/anchorAt/);assert.throws(()=>validateSemanticTracks([{...track,moves:[{at:1,duration:1,x:4}]}]),/cannot be combined/)});

test('Day12 opt-in motion spec does not alter released production spec',async()=>{
 const production=(await import('../day12制作/episode.production.spec.mjs')).default;
 const trial=(await import('../day12制作/episode.motion_v3.spec.mjs')).default;
 assert.equal(production.shots[0].actors[0].motionPath,undefined);
 assert.equal(trial.status,'planning');assert.equal(trial.measured,false);
 assert.ok(trial.shots[0].actors[0].motionPath.length>=2);
 const c7=trial.shots.find(s=>s.id==='C07');assert.ok(c7.semanticTracks.find(t=>t.id==='apology_aside').attach);
 const {validateSpec}=await import('./schema_validator.mjs');assert.equal(validateSpec(trial,{cueCount:24}).day,12);
});
