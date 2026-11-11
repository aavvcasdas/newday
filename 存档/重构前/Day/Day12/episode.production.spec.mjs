// Current specified voice -> acoustic word-bound semantic events; original 25-line draft remains untouched.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const read = (name) => fs.readFileSync(new URL(name, import.meta.url), 'utf8');
export const alignment = JSON.parse(read('./voice_alignment.json'));
export const visualEvents = [];
const cue = (originalLine) => alignment.cues.find((c) => c.originalScriptLine === originalLine);
export function event(id, originalLine, char, edge = 'start', delay = 0) {
  const c = cue(originalLine);const word = c.chars_timed.find((w) => w.ch === char);
  if (!word) throw new Error(`Missing acoustic word: ${originalLine}/${char}`);
  const time = Math.max(c.start, Math.min(c.end, word[edge])) + delay;
  const e = { id, originalLine, line: c.index, char, edge, time, audioSha256: alignment.source_sha256, asrWord: word.asrWord, asrStart: word.start, asrEnd: word.end, relation: word.alignmentRelation, precision: 'acoustic WORD interval, not invented per-character phoneme time' };
  visualEvents.push(e);return time;
}
const E = {};
for (const [id,line,char,edge] of [
  ['return',2,'回','start'],['jobs',2,'带','start'],['comment',3,'评','start'],['at',3,'艾','end'],['smart',4,'窍','start'],['call',4,'摇','start'],
  ['question',5,'经','start'],['offer',6,'录','start'],['deliver',6,'递','end'],['arrange',7,'入','start'],['askSkills',8,'做','start'],['skills',8,'熟','start'],['brag',9,'牛','start'],['sorry',10,'歉','start'],
  ['helper',11,'拉','start'],['notSmart',12,'聪','start'],['noRice',12,'米','start'],['riceQuestion',13,'饭','start'],['guard',13,'护','start'],
  ['possible',14,'可','start'],['notHired',14,'不','start'],['code',15,'敲','start'],['strike',15,'划','start'],['far',16,'远','start'],['late',16,'熬','start'],['marked',16,'标','start'],
  ['flip',17,'翻','start'],['reuse',17,'筛','start'],['aside',18,'旁','start'],['match',18,'求','start'],['press',19,'按','start'],['push',19,'推','start'],['circle',20,'圈','start'],
  ['help',21,'帮','start'],['notSign',21,'签','start'],['handoff',22,'递','start'],['choose',22,'挑','end'],['tomorrow',23,'明','start'],['check',24,'条','start'],['riceEnd',25,'米','start'],['pie',25,'饼','start'],
]) E[id] = event(id,line,char,edge);
const A = (pose='point', both=true) => [
  { name:'本鲸',pose,x:360,y:600,u:36,idleMotion:0 },
  ...(both ? [{name:'笨鱼',pose:'think',x:940,y:600,u:36,idleMotion:0}] : []),
];
function direction(start,end,kind,focus,triggerLine,triggerChar,resultLine,resultChar) {
  return {kind,focus,entry:'承接原岗位纸、笨鱼与帮手条的落点',action:focus,trigger:'按真实ASR词区间触发可见事件',wordLine:cue(triggerLine).index,wordChar:triggerChar,
    result:'对应纸面/角色结果完成后保持，不用相机或呼吸冒充事件',resultLine:cue(resultLine).index,resultChar:resultChar,settleSeconds:.05,holdSeconds:end===25?.75:.35,
    reaction:'按当前句的语义改变姿态/纸面，非循环待机',exit:'保留本镜纸面结果',transition:'同一任务连续，明确切观察重点',continuity:{in:'昨日岗位仍待核对',out:'本镜结果延续到后镜'}};
}
const shots=[];
function shot(id,start,end,framing,actors,focus,triggerLine,triggerChar,resultLine,resultChar,kind='prop') {
  const s={id,fromLine:cue(start).index,toLine:cue(end).index,framing,actors,companionProps:[],interactions:[],semanticTracks:[],mood:'work_cool',
    direction:direction(start,end,kind,focus,triggerLine,triggerChar,resultLine,resultChar),foregroundTable:{x:430,y:534,width:420}};
  if (framing==='medium_left'||framing==='close_left') s.camera={z:1.18,cx:470,cy:430};
  if (framing==='medium_right') s.camera={z:1.18,cx:820,cy:430};
  if (framing==='insert_center') s.camera={z:1.35,cx:640,cy:430};
  shots.push(s);return s;
}
const duration=alignment.source_duration_seconds;
function card(s,id,kind,x,y,w,h,from,state,extras={}) {
  const t={id,kind,x,y,w,h,from,to:cue(s.toLine+1)?.end || duration+1,state,...extras};
  // shot line numbers are 24-line indices; original is index+1. Keep tracks through inter-sentence pauses.
  t.to = cue(s.toLine+2)?.start ?? duration+1;
  s.semanticTracks.push(t);return t;
}
const sheet=(s,id,x=640,y=460,from=0,state={},extras={})=>card(s,id,'sheet',x,y,280,144,from,state,extras);
const tag=(s,id,x,y,from,state,extras={})=>card(s,id,'tag',x,y,250,68,from,state,extras);

let s=shot('C01',2,2,'two_shot',A(),'笨鱼走回岗位桌；带着昨天的岗位纸',2,'回',2,'带','staging');
s.actors[1].walk={from:1370,to:940,start:E.return,duration:1.1};s.actors[0].poses=[{at:E.return+.4,pose:'confident_hips'}];
sheet(s,'old_jobs',640,490,E.jobs,{title:'昨日筛过的岗位',rows:['还没挑完，继续看'],rowStart:20,rowSize:18},{h:84,w:270});

s=shot('C02',3,4,'two_shot',A('think'),'评论问题出现→@豆包→本鲸从开窍转摇人反应',3,'评',4,'摇');
s.camera={z:1.14,cx:700,cy:420};
sheet(s,'comment',650,460,E.comment,{title:'评论区 · 剧情示意',rows:['这个拿不准……'],rowStart:22},{states:[{at:E.at,state:{title:'@豆包',rows:['拿不准，先请帮手']}},{at:E.call,state:{title:'原来是学会摇人了',rows:['不是突然全懂了']}}]});
s.actors[0].poses=[{at:E.smart,pose:'confident_hips'},{at:E.call,pose:'shock'}];

s=shot('C03',5,7,'insert_center',[],'先问经验，再收到录取通知；面试未去、入职先排',5,'经',7,'入');
tag(s,'question',640,285,cue(5).start,{title:'本鲸问：这岗位……'},{states:[{at:E.question,state:{title:'没相关经验，能投吗？'}}]});
sheet(s,'offer',1080,460,E.offer,{title:'录取通知',rows:['面试还没去……'],rowStart:22},{moves:[{at:E.offer,duration:Math.max(.25,E.deliver-E.offer),x:640,y:460}],states:[{at:E.arrange,state:{title:'入职先安排了？',rows:['面试还没去！']}}]});

s=shot('C04',8,10,'close_left',A('think',false),'万能经历条写满→本鲸抓漏洞→道歉条替换',8,'熟',10,'歉');
sheet(s,'claim',690,460,E.askSkills,{title:'做过什么？',rows:['先说经历'],rowStart:22},{states:[{at:E.skills,state:{title:'熟练掌握',rows:['所有岗位']}},{at:E.brag,state:{title:'岗位还没看完',rows:['牛先吹上了？']}},{at:E.sorry,state:{title:'对不起……',rows:['先重新核对要求']}}]});
s.actors[0].poses=[{at:E.brag,pose:'shock'},{at:E.sorry,pose:'point'}];

s=shot('C05',11,13,'medium_right',[{name:'笨鱼',pose:'think',x:940,y:600,u:36,idleMotion:0}],'纸条拉向笨鱼；虽然不聪明，但不要米饭；护碗反应',11,'拉',12,'米');
let t=sheet(s,'helper_card',650,490,E.helper,{title:'豆包 · 帮手',rows:['先认下这个帮手'],rowStart:20,rowSize:18},{w:270,h:84,moves:[{at:E.helper,duration:.45,x:785}],states:[{at:E.notSmart,state:{title:'虽然不太聪明',rows:['但……']}},{at:E.noRice,state:{title:'但是，不需要米饭',rows:['笨鱼：这个帮手可以']}},{at:E.guard,state:{title:'招同事，还是护食？',rows:['帮忙可以，不分米饭']}}]});
s.foregroundTable={x:500,y:534,width:660};
card(s,'protected_bowl','bowl',1050,506,90,56,E.riceQuestion,{text:'自己的饭'},{moves:[{at:E.guard,duration:.35,x:985}]});
s.actors[0].poses=[{at:E.guard,pose:'confident_hips'}];

s=shot('C06',14,16,'insert_center',[],'可能≠已录取；敲代码划掉，远和熬人继续标着',14,'可',16,'标');
sheet(s,'requirements',640,418,E.possible,{title:'可能换新工作',rows:['已经录取？','',''],rowStart:-28,rowGap:38},{h:230,w:340,states:[{at:E.code,state:{title:'昨日岗位继续筛',rows:['已经录取','敲代码','']}},{at:E.far,state:{rows:['已经录取','敲代码','太远']}},{at:E.late,state:{rows:['已经录取','敲代码','太远 / 太熬人']}}],marks:[{at:E.notHired,type:'strike',row:0,width:190},{at:E.strike,type:'strike',row:1,width:160,duration:.10},{at:E.marked,type:'circle',row:2,width:250,duration:.10}]});

s=shot('C07',17,18,'medium_left',A('point',false),'同落点通知正反面切换；道歉放旁边，要求对齐',17,'翻',18,'求');
sheet(s,'reused_offer',640,460,cue(17).start,{title:'录取通知 · 正面',rows:['这张纸还能用'],rowStart:22},{flips:[{at:E.flip,duration:.42}],states:[{at:E.flip+.21,state:{title:'通知背面',rows:['拿来筛岗位']}},{at:E.reuse,state:{title:'筛岗位',rows:['看要求，不看夸口']}},{at:E.match,state:{title:'把要求对上',rows:['经验 / 距离 / 作息']}}]});
s.foregroundTable={x:430,y:534,width:620};
tag(s,'apology_aside',800,500,E.aside,{title:'道歉先放旁边'},{w:210,moves:[{at:E.aside,duration:.35,x:900}]});

s=shot('C08',19,22,'two_shot',A('point'),'旧标记保留→要求推向帮手→圈疑点→选择权交还老大',19,'按',22,'好');
sheet(s,'candidate',640,450,cue(19).start,{title:'昨日标记仍在',rows:['距离 / 作息：旧标记','经验是否匹配？'],rowStart:-8,rowGap:35},{h:166,marks:[{at:E.press,type:'circle',row:0,width:220},{at:E.circle,type:'circle',row:1,width:220}],moves:[{at:E.push,duration:.4,x:720},{at:E.handoff,duration:.45,x:560}],states:[{at:E.push,state:{title:'要求交给豆包'}},{at:E.circle,state:{title:'先把不确定的圈出'}},{at:E.help,state:{title:'这才叫帮忙'}},{at:E.choose,state:{title:'挑好的候选'}},{at:E.handoff,state:{title:'候选 · 老大慢慢挑'}}]});
tag(s,'uncertain',680,300,E.circle,{title:'不确定的先圈出来'},{marks:[{at:E.circle,type:'circle',width:224}],states:[{at:E.notSign,state:{title:'选择权在老大手里'}}]});
s.foregroundTable={x:430,y:534,width:720};
tag(s,'bean_receiver',1060,508,cue(19).start,{title:'@豆包'},{w:180,h:52});
s.actors[0].poses=[{at:E.help,pose:'confident_hips'},{at:E.handoff,pose:'point'}];

s=shot('C09',23,25,'wide',A('point'),'待核项交给明天；评论能摇人，岗位还得逐条看；米饭/大饼回扣',23,'明',25,'米','reaction');
s.camera={z:1.12,cx:640,cy:390};s.push={at:cue(23).start,duration:.7,z:1.02,cx:640,cy:390};
sheet(s,'remaining',640,460,cue(23).start,{title:'还剩这些拿不准',rows:['继续核对，没宣布录取'],rowStart:22},{states:[{at:E.tomorrow,state:{rows:['留给明天的新朋友']}},{at:E.check,state:{title:'岗位还得逐条看',rows:['不能只会摇人']}},{at:E.pie,state:{title:'不能跟着吃大饼',rows:['口头录取，先核对']}}],marks:[{at:E.check,type:'circle',row:0,width:208}]});
tag(s,'helper_stays',1050,500,cue(23).start,{title:'@豆包 · 帮手还在'},{states:[{at:E.riceEnd,state:{title:'豆包不吃米饭'}}]});
card(s,'rejected_flatbread','prop',640,290,160,96,E.pie,{rejected:true},{propId:'flatbread'});
s.actors[0].poses=[{at:E.pie,pose:'shock'}];s.foregroundTable={x:430,y:534,width:720};

// v2 execution pass: remove every 笨鱼 sprite. Narration/locked text remain unchanged.
const whale=(pose='think',x=330,u=34)=>({name:'本鲸',pose,x,y:600,u,idleMotion:.4,performanceV2:true,poseTransition:.25,bodyEvents:[]});
const bean=(enterAt=0)=>({name:'豆包',assetId:'doubao',pose:'still',x:1000,y:600,height:330,u:32,idleMotion:.35,performanceV2:true,bodyEvents:[],enterAt,enterDuration:.45,enterDx:110});
const configs=[
 {actors:[whale('think',330,37)],base:{z:1.06,cx:600,cy:420},type:'follow',at:E.jobs,duration:.8,to:{cx:640},reason:'跟随昨日岗位纸入画；笨鱼只存在于音轨'},
 {actors:[whale('think'),bean(E.at)],base:{z:1.08,cx:630,cy:415},type:'pan',at:E.at,duration:.65,to:{cx:700},reason:'@词点将视线让给豆包已有全身图'},
 {actors:[whale('think',260,31),bean()],base:{z:1.08,cx:640,cy:430},type:'push',at:E.deliver,duration:.8,to:{z:1.2,cx:610,cy:420},reason:'通知先到而未面试，推近放大错误'},
 {actors:[whale('think',330,35)],base:{z:1.16,cx:540,cy:410},type:'push',at:E.brag,duration:.8,to:{z:1.55,cx:520,cy:360},reason:'从万能经历转向本鲸的质疑'},
 {actors:[whale('point')],base:{z:1.04,cx:600,cy:410},type:'push',at:E.guard,duration:.65,to:{z:1.14,cx:620,cy:420},reason:'护食反问交给本鲸上半身与桌面反问条'},
 {actors:[],base:{z:1.35,cx:640,cy:430},type:'static',reason:'条件纸insert，保证划线/圈记和条件能读完'},
 {actors:[whale('think',310,33)],base:{z:1.13,cx:550,cy:432},type:'push',at:E.flip,duration:.6,to:{z:1.22,cx:560,cy:438},reason:'翻到背面复用，近看岗位要求'},
 {actors:[whale('point'),bean()],base:{z:1.06,cx:630,cy:420},type:'pan',at:E.push,duration:.5,to:{cx:700},reason:'顺着要求纸滑向豆包，不模拟未校准手部接触'},
 {actors:[whale('point'),bean()],base:{z:1.12,cx:640,cy:410},type:'pull',at:cue(23).start,duration:.7,to:{z:1.02,cx:640,cy:390},reason:'交还选择权；拉远一次后锁住，无尾卡'},
];
for(let i=0;i<shots.length;i++){
 const sh=shots[i],c=configs[i];sh.actors=c.actors;sh.camera=c.base;delete sh.push;
 sh.cameraIntent={type:c.type,reason:c.reason,...(c.type==='static'?{}:{at:c.at,duration:c.duration,to:c.to,easing:'smoothstep'})};
 sh.transitions={type:i===0?'none':i%2?'fade':'slide',duration:.2};
 sh.ambient=[{type:'dust',from:cue(sh.fromLine+1).start,to:cue(sh.toLine+1).end,x:640,y:260}];
 sh.bodyEvents=[];sh.insertEmphasis=[];
 const owned=visualEvents.filter(e=>e.line>=sh.fromLine&&e.line<=sh.toLine);
 const lead=sh.actors.find(a=>a.name==='本鲸');
 for(const e of owned){if(lead){const be={id:e.id,at:e.time,duration:.28,dy:1.6,lean:0};lead.bodyEvents.push(be);sh.bodyEvents.push({...be,actor:'本鲸'});}}
 for(const tr of sh.semanticTracks){
  if(!(tr.moves?.length))tr.enter={duration:.45,dx:95,dy:-8,overshoot:true};
  for(const m of tr.moves||[])m.duration=.5;
  for(const m of tr.marks||[])m.duration=m.type==='strike'?.22:.25;
  tr.emphasis=[];
 }
 sh.propTracks=sh.semanticTracks;
 sh.idleException=i===5?'无人桌面insert；身体待机不适用':undefined;
}
shots[0].actors[0].poses=[{at:E.return,pose:'shock'},{at:E.jobs,pose:'point'}];
shots[0].semanticTracks[0].from=E.return;shots[0].semanticTracks[0].w=360;shots[0].semanticTracks[0].h=108;shots[0].semanticTracks[0].y=480;
shots[0].semanticTracks[0].state={title:'昨天那摞岗位',rows:['还没挑完，继续看'],rowStart:22,rowSize:18};shots[0].semanticTracks[0].states=[{at:E.jobs,state:{title:'昨日筛过的岗位'}}];
shots[0].semanticTracks[0].enter={duration:.5,dx:300,dy:0,overshoot:true};
shots[1].actors[0].poses=[{at:E.smart,pose:'confident_hips'},{at:E.call+.25,pose:'shock'}];
shots[1].ambient.push({type:'cursor',from:E.comment,to:E.call,x:752,y:478});
shots[2].actors[0].poses=[{at:E.deliver,pose:'shock'},{at:E.arrange,pose:'point'}];
const offer=shots[2].semanticTracks.find(t=>t.id==='offer');offer.moves[0].at=E.deliver-.4;offer.moves[0].duration=.5;
offer.emphasis=[{at:E.arrange,duration:.6}];shots[2].insertEmphasis=[{propId:'offer',at:E.arrange,duration:.6}];
shots[3].foregroundTable={x:430,y:445,width:420};
for(const t of shots[3].semanticTracks){t.y=405;t.h=80;}
shots[3].actors[0].poses=[{at:E.brag,pose:'shock'},{at:E.sorry,pose:'point'}];
shots[3].actors[0].bodyEvents.push({id:'apology_recoil',at:E.sorry,duration:.5,dy:2,lean:-.025});
const claim=shots[3].semanticTracks[0];claim.states=claim.states.filter(st=>st.at!==E.sorry);claim.states.find(st=>st.at===E.brag).state.rows=['所有岗位'];claim.marks=[{at:E.brag,type:'strike',row:0,width:175,duration:.22}];claim.moves=[{at:E.sorry,duration:.3,x:1100}];claim.to=E.sorry+.3;
card(shots[3],'sliding_apology','sheet',690,405,280,80,E.sorry,{title:'对不起……',rows:['先重新核对要求'],rowStart:22},{enter:{duration:.45,dx:220,dy:-6,overshoot:true}});
shots[4].actors[0].poses=[{at:E.guard,pose:'point'}];shots[4].actors[0].bodyEvents.push({id:'rhetorical_lean',at:E.guard,duration:.5,dy:2,lean:.025});
shots[4].semanticTracks.find(t=>t.id==='protected_bowl').state.text='笨鱼的饭';
shots[6].actors[0].poses=[{at:E.flip,pose:'point'}];
shots[6].semanticTracks[0].flips[0].duration=.4;shots[6].semanticTracks[0].moves=[{at:E.flip,duration:.4,x:660}];
shots[7].actors[0].poses=[{at:E.help,pose:'confident_hips'},{at:E.handoff,pose:'point'}];
shots[7].actors[0].bodyEvents.push({id:'accept_nod',at:E.circle,duration:.4,dy:2,lean:.018});
shots[8].actors[0].poses=[{at:E.pie,pose:'shock'}];
// Descriptive executable fields are the same arrays used by the shared renderer.
for(const sh of shots){sh.propTracks=sh.semanticTracks;sh.bodyEvents=sh.actors.flatMap(a=>(a.bodyEvents||[]).map(e=>({...e,actor:a.name})));sh.direction.entry='承接岗位纸；本鲸与豆包原PNG，笨鱼不入画';}
const v2Focus=['岗位纸滑入表现回归，本鲸身体顿挫，不绘制笨鱼','@条与豆包已有全身滑入，本鲸从认可到疑问','通知滑入落桌，错误信息局部强调','万能经历划线，道歉条滑入，本鲸反应推近','本鲸单人反问，帮手纸与笨鱼的碗承接，不绘制笨鱼','桌面insert，代码划掉，远与熬人逐笔圈记','通知2D压缩翻面，指向要求，道歉纸滑到旁侧','要求纸推向豆包，圈记长出，候选交回老大','单次拉远后锁定，待核项保持，大饼拒绝收尾'];
for(let i=0;i<shots.length;i++){Object.assign(shots[i].direction,{focus:v2Focus[i],action:v2Focus[i],trigger:'真实整词区间触发身体/道具轨道',result:'动作到位后保持纸面结果与低幅连续呼吸',settleSeconds:i===3?.45:i===7?.8:.25});}
const script=read('../Day12/Day12视频字幕台词.txt');
export default {performanceVersion:2,day:12,title:'招同事，还是护食？',speaker:'本鲸',directorVersion:1,status:'ready',measured:true,
  sourceScriptSha256:createHash('sha256').update(script).digest('hex'),lighting:{spotlights:false},preserveSourceDuration:true,
  opener:{enterDuration:.5,layout:'two_line',headlinePrefix:'笨鱼回来了，',headlineHighlight:'招同事还是护食？',actorA:shots[0].actors[0],actorB:bean(E.at),foregroundProps:[]},shots};
