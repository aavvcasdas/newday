import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CUES, DUR, FPS, INSTRUMENTAL, PAGE_TURNS } from '../src/timeline.js';
import { sectionPose } from '../src/choreography.js';

const PROJECT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ROOT=path.resolve(PROJECT,'../..');
assert.equal(DUR,249.578667,'timeline must match the source track duration');
assert.equal(FPS,30,'delivery timeline is authored at 30 fps');
assert.equal(CUES.length,50,'all 50 lyric cues must be present');
assert.deepEqual(CUES.map(c=>c.id),Array.from({length:50},(_,i)=>`L${String(i+1).padStart(2,'0')}`));
const roles=new Set(['whale','gpt','claude','doubao','gemini','qwen','kimi','zai']);
let previous=-Infinity;
for(const c of CUES){
  assert.ok(Number.isFinite(c.t0)&&Number.isFinite(c.t1),`${c.id} has finite timecodes`);
  assert.ok(c.t0>=previous,`${c.id} is ordered after the previous cue`);
  assert.ok(c.t1>c.t0,`${c.id} has positive duration`);
  assert.ok(c.t1<=DUR+1e-6,`${c.id} fits within the audio`);
  assert.ok(c.text.trim(),`${c.id} has lyric text`);
  assert.ok(c.action&&c.theme&&c.camera,`${c.id} specifies a scene/action and camera`);
  assert.ok(Array.isArray(c.props)&&c.props.length,`${c.id} has concrete props`);
  assert.ok(Array.isArray(c.cast)&&c.cast.length,`${c.id} has a cast`);
  for(const role of c.cast)assert.ok(roles.has(role),`${c.id} contains known role ${role}`);
  previous=c.t0;
}
const locomotion=CUES.filter(c=>/run|track|walk|travel|approach|procession|converge|lead|fleet|escape/.test(c.action));
assert.ok(locomotion.length>=8,'locomotion cues should be covered by the still-pose motion policy');
for(const cue of locomotion){
  for(const role of cue.cast){
    const [pose]=sectionPose(cue.action,role);
    assert.notEqual(pose,'run',`${cue.id} ${role} must not use the jittery walk/run loop`);
    if(role!=='whale')assert.equal(pose,'idle',`${cue.id} human cut-outs stay planted while props/page staging move`);
  }
}
assert.equal(sectionPose('walk-boundary','kimi')[0],'idle','walking scenes use a held paper-cutout pose');
assert.deepEqual(INSTRUMENTAL.map(x=>x.id),['OPEN','NIGHT-BRIDGE','TAIL']);
assert.ok(INSTRUMENTAL.every(x=>x.t0<x.t1&&x.t1<=DUR));
assert.ok(PAGE_TURNS.length>=8&&PAGE_TURNS.every((x,i)=>x>0&&x<DUR&&(!i||x>PAGE_TURNS[i-1])));
const treatment=fs.readFileSync(path.join(PROJECT,'TREATMENT.md'),'utf8');
assert.equal((treatment.match(/L\d{2}/g)||[]).filter((x,i,a)=>a.indexOf(x)===i).length,50,'treatment must cover L01-L50');
assert.ok(fs.existsSync(path.join(PROJECT,'src/main.js')),'browser entry exists');
assert.ok(fs.existsSync(path.join(ROOT,'童话镇.mp4')),'source movie/audio exists for preview and mux');
console.log(`Timeline checks passed: ${CUES.length} lyric cues, ${INSTRUMENTAL.length} instrumental blocks, ${PAGE_TURNS.length} page turns, ${DUR}s.`);
