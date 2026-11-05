// Source/semantic/geometry audit + independently compare chosen encoded frames in check_encoded.py.
import fs from 'node:fs';import {createHash}from'node:crypto';
import spec,{alignment,visualEvents}from'./episode.production.spec.mjs';
import{createEpisodeRenderer,resolveActor}from'../engine/render_episode.mjs';
import{semanticStateAt}from'../engine/semantic_tracks.mjs';
import{actorAnchors}from'../互动元素/actor_contacts.mjs';
import{createCanvas}from'../engine/room_base.mjs';
const HERE='tools/day12制作',dir=`${HERE}/production_review_frames`;fs.mkdirSync(dir,{recursive:true});
const subdata=JSON.parse(fs.readFileSync(`${HERE}/subtitle_timing.json`));const r=await createEpisodeRenderer({spec,alignment,subdata});
const digest=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
function snapshot(t){const s=r.shotAt(t),line=r.lineAt(t);return {props:s.semanticTracks.map(p=>semanticStateAt(p,t)).filter(Boolean),actors:s.actors.map(a=>resolveActor(a,t,line,r.cues))};}
const events=visualEvents.map(e=>{const before=snapshot(Math.max(0,e.time-.06)),after=snapshot(e.time+.3);const changed=JSON.stringify(before)!==JSON.stringify(after);
 if(!changed)throw Error(`No visible semantic/actor change near ${e.id}`);
 const c=r.cues[e.line-1],word=c.chars_timed.find(w=>w.ch===e.char);if(word.asrWord!==e.asrWord||e.time<word.start-.04||e.time>word.end+.04)throw Error('word binding mismatch');
 return{...e,frame:Math.ceil(e.time*30),beforeProps:before.props.map(p=>p.id),afterProps:after.props.map(p=>p.id),changed,uncertain:e.relation!=='same_pinyin'};});
for(const c of r.cues)if(!events.some(e=>e.line===c.index))throw Error(`No event for spoken line ${c.index}`);
let maxTableBottom=0,faceChecks=0,geometrySamples=0;const cameras={};
for(let f=0;f<r.frames;f++){
 const t=f/30,s=r.shotAt(t),st=snapshot(t);const cam=(await import('../engine/camera_plan.mjs')).cameraFor(s,t);
 cameras[s.id]??=new Set();cameras[s.id].add(JSON.stringify(cam));
 for(const a of st.actors){if(a.y!==600||a.lean!==0||a.squash!==0)throw Error('unplanned idle drift');
 const p=actorAnchors(a).mouth;const face=[p[0]-32,p[1]-45,p[0]+32,p[1]+8];
 for(const obj of st.props){if(obj.kind==='bowl')continue;faceChecks++;const rect=[obj.x-obj.w*obj.scaleX/2,obj.y-obj.h/2,obj.x+obj.w*obj.scaleX/2,obj.y+obj.h/2];if(Math.max(face[0],rect[0])<Math.min(face[2],rect[2])&&Math.max(face[1],rect[1])<Math.min(face[3],rect[3]))throw Error(`face overlap ${s.id} ${f} ${obj.id}`);}
 }
 for(const obj of st.props)for(const m of obj.marks){if(m.row!=null&&!obj.state.rows?.[m.row])throw Error(`blank marked row ${s.id} ${f} ${obj.id}`);}
 maxTableBottom=Math.max(maxTableBottom,360+(s.foregroundTable.y+58-cam.cy)*cam.z);geometrySamples++;
}
for(const[id,values]of Object.entries(cameras))if(id!=='C09'&&values.size!==1)throw Error('unplanned camera motion');
if(maxTableBottom>=615)throw Error('table in subtitle area');if(spec.lighting.spotlights!==false)throw Error('spotlight still enabled');
const keys=['at','deliver','sorry','helper','noRice','guard','strike','marked','flip','push','circle','handoff','riceEnd','pie'];
const sampleFrames=[...new Set(keys.flatMap(id=>{const e=events.find(e=>e.id===id);return[Math.floor((e.time-.06)*30),Math.ceil((e.time+.3)*30)];}))].sort((a,b)=>a-b);
const canvas=createCanvas(1920,1080),g=canvas.getContext('2d');for(const frame of sampleFrames){g.setTransform(1.5,0,0,1.5,0,0);g.clearRect(0,0,1280,720);r.renderFrame(g,frame/30);fs.writeFileSync(`${dir}/expected_${frame}.png`,canvas.toBuffer('image/png'));}
const assets=JSON.parse(fs.readFileSync(`${HERE}/production_assets.json`));for(const a of assets.assets)if(digest(a.path)!==a.sha256)throw Error('asset hash mismatch');
const report={passed:true,source_sha256:alignment.source_sha256,sourceScriptSha256:spec.sourceScriptSha256,original_draft_sha256:digest('Day12/Day12配音台词.txt'),voice_sha256:digest('鲸鱼摇人_克隆配音_最终版.wav'),
 frames:r.frames,duration:r.duration,events,spokenLines:r.cues.length,eventCoveredLines:new Set(events.map(e=>e.line)).size,geometrySamples,faceChecks,faceRectIntersections:0,maxProjectedTableBottom:maxTableBottom,
 spotlight:false,idleMotion:0,defaultCameraFixed:true,onlyMainMove:'C09 one 0.7-second pullback',assetsVerified:assets.assets.length,sampleFrames,
 limitations:['ASR whole-word intervals and automated pinyin mapping, not human listening or phoneme-exact character alignment','Prop slides/flip are stylized 2D events; not a claim of calibrated hand-to-paper contact','Face check is calibrated eye/mouth rectangle, supplemented by still review'],
 inputs:Object.fromEntries(['episode.production.spec.mjs','voice_alignment.json','subtitle_timing.json','visual_events.json','../engine/render_episode.mjs','../engine/semantic_tracks.mjs','../engine/scene_compositor.mjs','../engine/prop_registry.mjs','../engine/opener_director.mjs'].map(p=>[p,digest(`${HERE}/${p}`)]))};
fs.writeFileSync(`${HERE}/production_check.json`,JSON.stringify(report,null,2)+'\n');console.log('PASS',events.length,'acoustic event bindings;',geometrySamples,'frame geometry samples;',sampleFrames.length,'expected encoded samples');
