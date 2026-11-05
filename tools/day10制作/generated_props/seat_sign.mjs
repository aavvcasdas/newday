// Route 2A: locally authored parameterized drawing, NOT a generated image or an external AI service call.
import {CORE} from '../../互动元素/cue_props_engine.mjs';
const {paint,rrPts,ellPts,inkLine,reseedBoil}=CORE;
export const id='seat_sign';
export const labels=['师父专座','代管监工位'];
export function draw(ctx,t,st={}){
 reseedBoil(0);ctx.save();ctx.scale(1+(st.squash||0)*.15,1-(st.squash||0)*.15);
 paint(ctx,rrPts(-100,-35,200,70,10,0),{wash:'#986C4E',fill:'#D2AD7B',fillOp:235,ink:'#3A3548',sw:2.7});
 paint(ctx,rrPts(-90,-27,180,54,7,0),{wash:'#EAD9AD',washOp:200,ink:'#9D7A56',sw:1});
 for(let i=0;i<3;i++)inkLine(ctx,[[-86,-16+i*16],[-55,-19+i*16],[-35,-16+i*16]],.8,'#C3AA7E','grain'+i,.3);
 for(const x of [-93,93])paint(ctx,ellPts(x,0,3,3,10,0),{wash:'#D0CEC0',ink:'#665A55',sw:1});
 ctx.font='800 23px NotoSansSC';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#41415A';if(!labels.includes(st.label??'师父专座'))throw Error('Unreviewed sign label');ctx.fillText(st.label??'师父专座',0,0);
 if((st.open??1)<.5)paint(ctx,[[50,-32],[91,-28],[88,23]],{wash:'#B28E60',ink:'#6B5B4F',sw:1});
 if(st.hit)inkLine(ctx,[[53,-23],[45,-8],[58,3],[47,24]],2,'#A25B64','scratch',0);
 ctx.restore();
}
export default {id,labels,draw};
