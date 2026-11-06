import test from 'node:test';
import assert from 'node:assert/strict';
import {createCanvas,startMotionAudit,stopMotionAudit} from './actors.mjs';
import {render} from './film.mjs';
import {SHOTS} from './plan.mjs';
import {directionFor} from './direction.mjs';

const c=createCanvas(1920,1080).getContext('2d');
function sample(t){startMotionAudit();render(c,t);const result=stopMotionAudit();if(global.gc)global.gc();return result;}

test('each shot draws its planned cast using the lyric-specific atlas state',()=>{
  for(const shot of SHOTS){
    const entries=sample(shot.start+shot.duration*.55);
    for(const name of ['whale',...shot.cast.filter(n=>n!=='whale')]){
      const actor=entries.find(x=>x.actor===name);assert.ok(actor,`${shot.id} missing ${name}`);
      assert.ok(actor.pose.startsWith(`atlas:${directionFor(shot.index,name).state}:`),`${shot.id}/${name} wrong state ${actor.pose}`);
    }
    if(global.gc)global.gc();
  }
});

test('each shot contains at least one actual sprite-frame transition when sampled across its duration',()=>{
  for(const shot of SHOTS){
    const byName=new Map();
    for(let i=0;i<3;i++){
      const t=shot.start+(shot.duration-.04)*(i/2)+.02;
      for(const e of sample(t)){
        if(!byName.has(e.actor))byName.set(e.actor,new Set());
        byName.get(e.actor).add(e.pose);
      }
    }
    assert.ok([...byName.values()].some(frames=>frames.size>1),`${shot.id} no sampled frame transition`);
    if(global.gc)global.gc();
  }
});

test('first and repeated S24 frame have the same pixels when snapshot cache initializes', async()=>{
  const {execFileSync}=await import('node:child_process');
  const src=`import {frame} from './tools/mv_extra/v13/film.mjs';
    const a=Buffer.from(frame(38.5).data());const b=Buffer.from(frame(38.5).data());
    if(!a.equals(b))process.exit(1);`;
  execFileSync(process.execPath,['--input-type=module','-e',src],{cwd:process.cwd(),timeout:30000});
});
