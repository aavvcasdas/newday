// Small narrative details laid over the existing v8 sets; no external background.
const clamp=x=>Math.max(0,Math.min(1,x));
function star(c,x,y,r,color){c.save();c.translate(x,y);c.fillStyle=color;c.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.42:r;c.lineTo(Math.cos(a)*rr,Math.sin(a)*rr)}c.closePath();c.fill();c.restore()}
function ripple(c,x,y,r,a){c.strokeStyle=`rgba(204,240,248,${a})`;c.lineWidth=1.5;c.beginPath();c.ellipse(x,y,r,r*.22,0,0,Math.PI*2);c.stroke()}
export function drawLyricDetails(c,t,shot){
 const i=shot.index,u=clamp((t-shot.start)/(shot.end-shot.start));c.save();
 if(i>=4&&i<=5){for(let n=0;n<7;n++){let q=clamp(u*2-n*.12);star(c,210+n*140,186+Math.sin(n*2)*32,3+q*5,`rgba(255,226,145,${.25+q*.7})`)}}
 if(i>=6&&i<=7){for(let n=0;n<7;n++){let q=clamp(u*2-n*.14);c.fillStyle=`rgba(255,222,145,${q*.65})`;c.fillRect(50+n*180,210+(n%2)*38,13,18)}}
 if(i>=9&&i<=10){c.fillStyle='rgba(255,255,250,.86)';const x=900+u*80;c.beginPath();c.moveTo(x,376);c.lineTo(x+13,348);c.lineTo(x+13,376);c.closePath();c.fill();c.fillStyle='#d88962';c.fillRect(x-3,379,23,3)}
 if(i>=12&&i<=14){for(let n=0;n<5;n++)ripple(c,140+n*240,556+(n%2)*27,9+((t*19+n*11)%26),.35);c.fillStyle='rgba(255,215,147,.38)';c.fillRect(90,183,19,34);c.fillRect(1170,202,15,28)}
 if(i>=15&&i<=16){const a=.12+.18*u;c.fillStyle=`rgba(255,223,125,${a})`;for(let n=0;n<4;n++){c.beginPath();c.moveTo(640,55);c.lineTo(180+n*270,315);c.lineTo(230+n*270,315);c.closePath();c.fill()}}
 if(i>=17&&i<=19){for(let n=0;n<6;n++){const q=(u+n*.16)%1;star(c,110+n*210,380-q*80,5,'rgba(255,216,104,.7)')}}
 if(i>=20&&i<=23){for(let n=0;n<12;n++){const q=(u+n*.11)%1;star(c,55+n*106,140+q*195,2+(n%3),`rgba(255,219,153,${.7*(1-q)})`)}}
 if(i>=25&&i<=26){for(let n=0;n<7;n++){const q=(u+n*.14)%1;ripple(c,80+n*180+Math.sin(t*2+n)*12,500-q*340,3+n%3,.4)}}
 if(i===27){c.strokeStyle='rgba(255,225,156,.5)';c.lineWidth=2;c.setLineDash([4,7]);c.beginPath();c.moveTo(500,155);c.bezierCurveTo(560,115,720,195,780,155);c.stroke();c.setLineDash([])}
 if(i>=28&&i<=29){for(let n=0;n<6;n++){let q=(u+n*.17)%1;c.fillStyle=`rgba(247,200,174,${.55*(1-q)})`;c.beginPath();c.ellipse(160+n*190+q*35,300+q*90,4,2,.5,0,Math.PI*2);c.fill()}}
 if(i>=30&&i<=32){for(let n=0;n<8;n++){const q=clamp(u*2-n*.13);star(c,110+n*150,150+(n%3)*24,3+q*4,`rgba(255,225,153,${q*.75})`)}}
 c.restore();
}
