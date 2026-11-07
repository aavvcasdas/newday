// Opt-in Day12 trial spec using shared story-motion tracks; existing delivered
// v2 spec, render, audio, alignment and locked script remain unchanged.
// Not yet rendered or visually approved.
import base,{visualEvents} from './episode.production.spec.mjs';
const spec=structuredClone(base);
const time=(id)=>{const e=visualEvents.find(e=>e.id===id);if(!e)throw Error('Missing acoustic event '+id);return e.time};
const first=spec.shots.find(s=>s.id==='C01');
const lead=first.actors.find(a=>a.name==='本鲸');
const start=time('return');
lead.motionPath=[{at:start,x:190,y:600},{at:start+.8,x:330,y:600}];
const shot=spec.shots.find(s=>s.id==='C07');
const tag=shot.semanticTracks.find(t=>t.id==='apology_aside');
const handoff=time('aside');
// Attachment uses the existing per-pose calibrated handR anchor; no fake
// second arm, no pretense that PNGs become a fully articulated grip.
delete tag.moves;
tag.attach={actor:0,anchor:'handR',from:handoff,to:handoff+.35,offset:[0,0],release:{duration:.4,to:[900,500]}};
shot.propTracks=shot.semanticTracks;
spec.title='招同事，还是护食？ · 动作轨道试验';
spec.status='planning';spec.measured=false;
export default spec;
