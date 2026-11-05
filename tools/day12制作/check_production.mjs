// v2 source/semantic/whole-body/camera audit. NO face-ROI motion criterion.
import fs from'node:fs';import{createHash}from'node:crypto';
import spec,{alignment,visualEvents}from'./episode.production.spec.mjs';
import{createEpisodeRenderer,resolveActor}from'../engine/render_episode.mjs';
import{semanticStateAt}from'../engine/semantic_tracks.mjs';import{cameraFor}from'../engine/camera_plan.mjs';import{bodyPerformance}from'../engine/performance_v2.mjs';
import{createCanvas}from'../engine/room_base.mjs';
const HERE='tools/day12制作',dir=`${HERE}/production_review_frames`;fs.mkdirSync(dir,{recursive:true});
const subdata=JSON.parse(fs.readFileSync(`${HERE}/subtitle_timing.json`));const r=await createEpisodeRenderer({spec,alignment,subdata});
const digest=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
function snapshot(t){const s=r.shotAt(t),line=r.lineAt(t);return{props:s.semanticTracks.map(p=>semanticStateAt(p,t)).filter(Boolean),actors:s.actors.map(a=>resolveActor(a,t,line,r.cues))};}
const events=visualEvents.map(e=>{const before=snapshot(Math.max(0,e.time-.06)),after=snapshot(e.time+.3);const changed=JSON.stringify(before)!==JSON.stringify(after);if(!changed)throw Error(`No body/prop change ${e.id}`);
 const c=r.cues[e.line-1],word=c.chars_timed.find(w=>w.ch===e.char);if(word.asrWord!==e.asrWord||e.time<word.start-.04||e.time>word.end+.04)throw Error('word binding mismatch');
 return{...e,frame:Math.ceil(e.time*30),changed,uncertain:e.relation!=='same_pinyin'};});
for(const c of r.cues)if(!events.some(e=>e.line===c.index))throw Error('uncovered spoken line');
let maxTableBottom=0,maxBodyDisplacement=0,geometrySamples=0;const cameraEvidence={};
for(const sh of r.shots){
 if(sh.actors.some(a=>a.name==='笨鱼'))throw Error('笨鱼 sprite forbidden');
 if(sh.actors.some(a=>a.name==='豆包'&&a.assetId!=='doubao'))throw Error('豆包 must use pinned source asset');
 const until=r.shots[r.shots.indexOf(sh)+1]?.start??r.duration;
 const samples=[];for(let t=sh.start;t<until;t+=1/30){
  const cam=cameraFor(sh,t,r.cues);samples.push(cam);
  maxTableBottom=Math.max(maxTableBottom,360+(sh.foregroundTable.y+58-cam.cy)*cam.z);
  for(const a of sh.actors){const b=bodyPerformance(a,t);maxBodyDisplacement=Math.max(maxBodyDisplacement,Math.abs(b.dy),(b.opacity===1?Math.abs(b.dx):0));if(Math.abs(b.dy)>6||Math.abs(b.dx)>115)throw Error('unplanned body shake');}
  for(const obj of snapshot(t).props)for(const m of obj.marks)if(m.row!=null&&!obj.state.rows?.[m.row])throw Error(`blank marked row ${obj.id}`);
  geometrySamples++;
 }
 const ci=sh.cameraIntent;for(const key of['z','cx','cy']){
  const a=samples.map(v=>v[key]);const delta=a.at(-1)-a[0];if(ci.type==='static'&&a.some(v=>Math.abs(v-a[0])>1e-10))throw Error('static camera drift');
  if(ci.type!=='static'){const dir=Math.sign((ci.to[key]??sh.camera[key])-sh.camera[key]);if(a.slice(1).some((v,i)=>(v-a[i])*dir < -1e-9 || (!dir&&Math.abs(v-a[0])>1e-9)))throw Error('periodic/undeclared camera drift');}
 }
 cameraEvidence[sh.id]={intent:ci,start:samples[0],end:samples.at(-1),cameraSamples:samples.length};
}
if(maxTableBottom>=615)throw Error('table in subtitle area');if(spec.lighting.spotlights!==false)throw Error('spotlights forbidden');
const keys=['return','at','deliver','sorry','helper','noRice','guard','strike','marked','flip','push','circle','handoff','riceEnd','pie'];
const sampleFrames=[...new Set(keys.flatMap(id=>{const e=events.find(e=>e.id===id);return[Math.floor((e.time-.06)*30),Math.ceil((e.time+.3)*30)];}))].sort((a,b)=>a-b);
const canvas=createCanvas(1920,1080),g=canvas.getContext('2d');for(const frame of sampleFrames){g.setTransform(1.5,0,0,1.5,0,0);g.clearRect(0,0,1280,720);r.renderFrame(g,frame/30);fs.writeFileSync(`${dir}/expected_${frame}.png`,canvas.toBuffer('image/png'));}
const assets=JSON.parse(fs.readFileSync(`${HERE}/production_assets.json`));for(const a of assets.assets)if(digest(a.path)!==a.sha256)throw Error('asset hash mismatch');
const source=JSON.parse(fs.readFileSync('assets/ai-girls/doubao/source.json'));for(const a of source.assets)if(digest(a.path)!==a.sha256)throw Error('upstream asset hash mismatch');if(digest(source.derived.path)!==source.derived.sha256)throw Error('cutout mismatch');
const inputs=['episode.production.spec.mjs','voice_alignment.json','subtitle_timing.json','visual_events.json','../engine/render_episode.mjs','../engine/semantic_tracks.mjs','../engine/scene_compositor.mjs','../engine/prop_registry.mjs','../engine/opener_director.mjs','../engine/camera_plan.mjs','../engine/performance_v2.mjs','../engine/director_contract.mjs','../engine/schema_validator.mjs','../../assets/ai-girls/doubao/source.json','../../assets/ai-girls/doubao/doubao-cutout.png'];
const report={passed:true,version:2,source_sha256:alignment.source_sha256,sourceScriptSha256:spec.sourceScriptSha256,original_draft_sha256:digest('Day12/Day12配音台词.txt'),voice_sha256:digest('鲸鱼摇人_克隆配音_最终版.wav'),frames:r.frames,duration:r.duration,events,spokenLines:r.cues.length,eventCoveredLines:new Set(events.map(e=>e.line)).size,geometrySamples,maxProjectedTableBottom:maxTableBottom,maxBodyDisplacement,spotlight:false,benyuSprites:0,doubaoSourceCommit:source.commit,cameraEvidence,assetsVerified:assets.assets.length+source.assets.length+1,sampleFrames,
 finalResultHoldSeconds:r.duration-(events.find(e=>e.id==='pie').time+.25),limitations:['No face/mouth/eyelid animation; no face-ROI motion acceptance','Original PNG pose switches have whole-body transitions, not feature morphing','No calibrated hand-to-paper claim','Human dynamic review is pending, automated/still inspection cannot replace it'],inputs:Object.fromEntries(inputs.map(p=>[p,digest(`${HERE}/${p}`)]))};
fs.writeFileSync(`${HERE}/production_check.json`,JSON.stringify(report,null,2)+'\n');console.log('PASS',events.length,'word bindings; nine motivated camera intents; no 笨鱼 sprite;',sampleFrames.length,'encoded-reference targets');
