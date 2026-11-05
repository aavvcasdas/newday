// Adapted from the user's Day10 proposal. Local drawing prototypes, NOT an external AI generation call.
// pop_hold is a PLANNING-only overlay here, not a core collision verb or a hand constraint.
import {CORE} from './cue_props_engine.mjs';
const {paint,rrPts,ellPts,inkLine,reseedBoil}=CORE;
const INK='#283C52';
function label(ctx,text,x,y,size,color){ctx.save();ctx.font=`800 ${size}px NotoSansSC`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(text,x,y);ctx.restore();}
export const DAY10_PROPS={
 rice_jar_guard:{id:'rice_jar_guard',status:'prototype_pending_visual_review',draw(ctx,t=0,st={}){
  reseedBoil(0);ctx.save();const squash=st.squash||0;ctx.scale(1+squash*.1,1-squash*.1);
  paint(ctx,rrPts(-40,-26,80,68,16,0),{wash:'#9AD4EA',fill:'#C5EAF7',fillOp:235,ink:INK,sw:2.4});
  paint(ctx,ellPts(0,-27,35,13,24,0),{wash:'#6F9FB7',fill:'#B9DBDE',fillOp:220,ink:INK,sw:1.7});
  paint(ctx,ellPts(0,-29,29,10,24,0),{wash:'#E8DFC7',fill:'#FFFDF7',fillOp:245,ink:'#91AEB4',sw:1});
  for(let i=0;i<9;i++)paint(ctx,ellPts((i%3-1)*14,(Math.floor(i/3)-1)*4-29,2.7,1,8,0,i*.65),{wash:i%2?'#D4CBB2':'#EFE5C7',ink:null});
  inkLine(ctx,[[-30,-10],[-32,9],[-28,28]],1.3,'#E4F5F4','glaze',0);
  paint(ctx,rrPts(-36,-6,72,26,6,0),{wash:'#F6D57A',fill:'#FFE599',fillOp:245,ink:'#B87D28',sw:1.8});
  label(ctx,'米缸重地',0,7,15,'#3D2B1F');
  if(st.hit)inkLine(ctx,[[-12,25],[-2,23],[11,25]],1.5,'#A47F5B','jar_hit',0);
  ctx.restore();
 }},
 brain_copy_board:{id:'brain_copy_board',status:'prototype_pending_visual_review',draw(ctx,t=0,st={}){
  reseedBoil(0);ctx.save();
  paint(ctx,rrPts(-138,-66,276,132,14,0),{wash:'#20384C',fill:'#2B4A62',fillOp:242,ink:'#9BC4D4',sw:2.6});
  paint(ctx,ellPts(0,-34,34,18,24,0),{wash:'#78C2F4',fill:'#A8DCFF',fillOp:240,ink:INK,sw:1.8});
  for(let i=0;i<3;i++)inkLine(ctx,[[-24+i*13,-42],[-27+i*13,-35],[-19+i*13,-27]],.8,'#5B94B7','brain_fold'+i,0);
  label(ctx,'同款鱼脑',0,-33,14,'#183049');
  for(const [dir,col] of [[-1,'#9AD4EA'],[1,'#FFD166']]){inkLine(ctx,[[dir*18,-16],[dir*68,6]],2.5,col,'branch'+dir,0);inkLine(ctx,[[dir*57,0],[dir*68,6],[dir*64,-5]],2.5,col,'arrow'+dir,0);}
  paint(ctx,rrPts(-118,10,96,38,9,0),{wash:'#C1DDE7',fill:'#EBF6FF',fillOp:235,ink:INK,sw:1.6});label(ctx,'本鲸·心软',-70,30,15,'#274566');
  paint(ctx,rrPts(22,10,96,38,9,0),{wash:'#DBB56A',fill:'#FFE8A3',fillOp:240,ink:INK,sw:1.8});label(ctx,'笨鱼·护碗',70,30,15,'#4A3219');
  if(st.hit)inkLine(ctx,[[-128,55],[-107,53],[-89,55]],1.2,'#9BC4D4','board_ink',0);
  ctx.restore();
 }}
};
export function drawDay10PlannedProp(ctx,frame,event){
 if(event.measured!==false)throw Error('This adapter accepts measured=false planning overlays only');
 if(event.verb!=='pop_hold')throw Error('Only planning pop_hold is supported');
 const {startFrame:s,contactFrame:c,endFrame:e}=event;
 if(![s,c,e,frame].every(Number.isInteger)||s<0||c<s||e<=c)throw Error('Invalid planning frames');
 const prop=DAY10_PROPS[event.propId];if(!prop)throw Error('Unknown Day10 prop');
 const at=event.params?.at;if(!Array.isArray(at)||at.length!==2||!at.every(Number.isFinite))throw Error('Explicit world position required; no fake hand anchors');
 if(frame<s||frame>e)return null;
 const p=c===s?1:Math.max(0,Math.min(1,(frame-s)/(c-s))),scale=.85+.15*(1-(1-p)**3);
 ctx.save();ctx.translate(...at);ctx.scale(scale,scale);prop.draw(ctx,frame/30,event.params);ctx.restore();
 return {position:[...at],scale,measured:false,attachment:'world_overlay_not_hand_contact'};
}
