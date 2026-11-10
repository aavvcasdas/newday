// Cue-driven 3D stage: every lyric gets real paper actors, props, movement and a camera-facing tableau.
import * as THREE from 'three';
import { CUES, DUR, PAGE_TURNS } from './timeline.js';
import { backdrop, propSprite } from './art.js';
import { makeActor } from './cast.js';
import { texOf } from './book.js';
import { cutMesh } from './cutmesh.js';
import { clamp, lerp, seg, ss, eio, back, TAU } from './lib.js';
import { sectionPose } from './choreography.js';

const ROLES=['whale','gpt','claude','doubao','gemini','qwen','kimi','zai'];
const BASE_Y=.00065; // local to the open lower page; the book hinge already lifts the stage.
const texCache=new Map();
function category(raw){const s=raw.toLowerCase();
  if(/tiger/.test(s))return 'tiger';
  if(/apple/.test(s))return 'apple';
  if(/candy-house/.test(s))return 'candy-house';
  if(/rose-bed|bed/.test(s))return 'bed';
  if(/petal|blossom/.test(s))return 'petals';
  if(/tea-table/.test(s))return 'tea-table';
  if(/sunbeam/.test(s))return 'sunbeam';
  if(/light-ribbon/.test(s))return 'light-ribbon';
  if(/light-seed|dust-light/.test(s))return 'light-seed';
  if(/clock[- ]?tower/.test(s))return 'clocktower';
  if(/storybook-crest/.test(s))return 'crest';
  if(/bubble/.test(s))return 'bubbles';
  if(/foam/.test(s))return 'foam';
  if(/spray/.test(s))return 'spray';
  if(/flower-path|river-ripples|path/.test(s))return 'path';
  if(/butterfl/.test(s))return 'butterfly';
  if(/basket/.test(s))return 'basket';
  if(/candy/.test(s))return 'candy';
  if(/cloud/.test(s))return 'cloud';
  if(/note/.test(s))return 'music-notes';
  if(/sunbird|golden-wing/.test(s))return 'sunbird';
  if(/constellation|star-ring|emblem|firework|galaxy|sun-wheel|star|spark/.test(s))return 'star';
  if(/wolf|dragon|shadow/.test(s))return /cape/.test(s)?'red-cape':'wolf-shadow';
  if(/cape|cloak/.test(s))return 'red-cape';
  if(/lantern|lamp/.test(s))return 'lantern';
  if(/clock-chain/.test(s))return 'clock-chain';
  if(/watch|clock/.test(s))return 'watch';
  if(/cup|tea/.test(s))return 'cup';
  if(/shoe/.test(s))return /red/.test(s)?'red-shoe':'glass-shoe';
  if(/duck/.test(s))return 'duck';
  if(/swan/.test(s))return 'swan';
  if(/bird/.test(s))return 'sunbird';
  if(/harp/.test(s))return 'harp';
  if(/chest|gem/.test(s))return 'gem-chest';
  if(/puppet-stage/.test(s))return 'theater';
  if(/long-nose/.test(s))return 'nose';
  if(/strings/.test(s))return 'strings';
  if(/pinocchio|puppet/.test(s))return 'puppet';
  if(/stage-ring/.test(s))return 'ring';
  if(/city|observatory/.test(s))return 'city';
  if(/cave/.test(s))return 'cave';
  if(/village/.test(s))return 'village';
  if(/harbor-pier|pier/.test(s))return 'pier';
  if(/bridge|arch|stair/.test(s))return 'bridge';
  if(/heart/.test(s))return 'heart';
  if(/mountain|ridge|cliff|island/.test(s))return 'mountain';
  if(/castle|palace|tower|gate|house/.test(s))return 'castle';
  if(/boat|fleet|armada/.test(s))return 'paper-boat';
  if(/waterfall|curtain/.test(s))return 'waterfall';
  if(/river|water|spray|foam|bubble|current|rapids|mirror|pearl/.test(s))return 'water';
  if(/tree|rose|bean|forest|grass/.test(s))return /rose/.test(s)?'rose-tree':'tree';
  if(/page|map|book|parchment/.test(s))return 'page';
  if(/pencil/.test(s))return 'pencil';
  if(/wheel|mill/.test(s))return 'wheel';
  if(/music|stage/.test(s))return 'music-box';
  return 'star';
}
function countOf(raw){if(/firework/.test(raw))return 7;if(/three-/.test(raw))return 3;if(/six-/.test(raw))return 6;if(/fleet|armada/.test(raw))return 4;if(/tigers/.test(raw))return 3;if(/shoes/.test(raw))return 2;return 1;}
function sizeOf(type){
  return ({'castle':[.145,.145],'clocktower':[.075,.145],'candy-house':[.105,.125],'paper-boat':[.09,.058],'water':[.125,.052],'waterfall':[.09,.14],
    'heart':[.10,.09],'lantern':[.045,.07],'watch':[.05,.07],'cup':[.045,.052],'glass-shoe':[.065,.042],'red-shoe':[.065,.042],
    'star':[.034,.034],'sunbird':[.075,.08],'wolf-shadow':[.10,.06],'red-cape':[.082,.10],'basket':[.05,.05],
    'tree':[.075,.13],'rose-tree':[.09,.15],'harp':[.085,.13],'gem-chest':[.075,.075],'puppet':[.065,.11],
    'page':[.105,.10],'city':[.125,.10],'wheel':[.09,.09],'bridge':[.14,.07],'music-box':[.07,.07],
    'duck':[.066,.052],'swan':[.074,.058],'tiger':[.073,.045],'apple':[.035,.045],'tea-table':[.12,.065],
    'cloud':[.065,.035],'music-notes':[.06,.06],'candy':[.035,.038],'light-ribbon':[.10,.045],'light-seed':[.026,.026],'crest':[.075,.085],
    'butterfly':[.048,.045],'petals':[.038,.038],'bed':[.12,.075],'pencil':[.025,.09],
    'village':[.12,.11],'pier':[.13,.075],'mountain':[.13,.10],'bubbles':[.07,.085],'foam':[.10,.055],'spray':[.07,.06],'path':[.11,.035],'cave':[.11,.12],
    'clock-chain':[.075,.10],'theater':[.13,.10],'nose':[.06,.05],'strings':[.09,.12],'ring':[.08,.08]})[type]||[.05,.05];
}
function isFlat(type,raw){return type==='water'||type==='path';}
function texture(type){if(!texCache.has(type)){const c=propSprite(type);texCache.set(type,texOf(c));}return texCache.get(type);}
function anchorOf(type){return ({'castle':.76,'clocktower':.83,'candy-house':.54,'paper-boat':.76,'water':.90,'waterfall':.84,'heart':.82,'lantern':.82,'watch':.72,'clock-chain':.66,'cup':.72,'glass-shoe':.66,'red-shoe':.66,'star':.72,'sunbird':.79,'wolf-shadow':.64,'red-cape':.80,'basket':.78,'tree':.83,'rose-tree':.83,'harp':.75,'gem-chest':.74,'puppet':.74,'nose':.72,'strings':.80,'theater':.78,'page':.80,'city':.73,'wheel':.72,'bridge':.64,'music-box':.70,'duck':.66,'swan':.66,'tiger':.70,'apple':.76,'tea-table':.76,'cloud':.58,'music-notes':.62,'candy':.64,'light-ribbon':.72,'light-seed':.72,'butterfly':.70,'petals':.70,'bed':.80,'pencil':.84,'village':.65,'pier':.78,'mountain':.71,'bubbles':.72,'foam':.58,'spray':.72,'path':.69,'cave':.76,'ring':.70})[type]??.75;}
function makeProp(type){const [w,h]=sizeOf(type),tex=texture(type),item={c:tex.image,w,h,ax:.5,ay:anchorOf(type)};const g=new THREE.Group(),card=cutMesh(item,{tex,backCol:'#eee7d7'});g.add(card);return {g,card,w,h,type,anchor:item.ay};}
function cueAt(t){for(const c of CUES)if(t>=c.t0&&t<c.t1)return c;return null;}
function themeAt(t){const c=cueAt(t);if(c)return c.theme;if(t>=85.6&&t<97.45)return 'night-village';return 'castle-river';}
function backgroundFor(theme){const b=backdrop(theme);return {ground:texOf(b.ground),sky:texOf(b.sky),key:b.key};}
function actorLayout(cue,role,index,total,u){
  let x=0,z=.145,scale=total>=7?.64:total>=4?.76:1,y=BASE_Y,rot=0;
  const others=cue.cast.filter(r=>r!=='whale'),a=cue.action,k=eio(u);
  if(total===2)x=role==='whale'?.067:-.065;
  else if(total===3)x=role==='whale'?.105:(role===others[0]?-.10:0);
  else if(total>3){const order=cue.cast.slice().sort((r1,r2)=>ROLES.indexOf(r1)-ROLES.indexOf(r2)).indexOf(role);x=-.17+order*.047;z=.09+(order%3)*.045;}
  // Side-by-side staging and blocking are keyed to the actual action, not just the cast list.
  if(a==='run-beside-boat'){if(role==='claude'){x=-.15;z=.17;}if(role==='whale'){x=lerp(-.03,.105,k);z=.22;}}
  if(a==='lantern-shield'||a==='cloak-shield-open'){if(role==='doubao'){x=-.075;z=.16;}if(role==='whale'){x=.075;z=.20;}if(role==='gpt'){x=.15;z=.07;scale*=.72;}}
  if(a==='wolf-shadow-contained'){if(role==='doubao'){x=-.05;z=.17;}if(role==='gpt'){x=.05;z=.09;scale*=.64;}if(role==='whale'){x=.13;z=.22;}}
  if(a==='cup-pass'){if(role==='qwen'){x=-.095;z=.19;scale=.88;}if(role==='gemini'){x=.015;z=.19;scale=.88;}if(role==='whale'){x=.145;z=.22;scale=.90;}}
  if(a==='duck-to-swan'||a==='wise-river'||a==='wise-river-return'){if(role==='whale'){x=-.015;y+=.006;z=.21;}if(role==='kimi'){x=.105;z=.17;scale=.72;}}
  if(a==='clocktower-glide'){if(role==='zai'){x=lerp(-.08,.045,k);y+=Math.sin(Math.PI*u)*.03;z=.11;}if(role==='whale'){x=.13;z=.22;scale=.62;}}
  if(a==='harp-and-climb'){if(role==='zai'){x=-.09;z=.12;}if(role==='whale'){x=.075;y+=.012+u*.018;z=.20;scale=.77;}}
  if(a==='candy-pass'){if(role==='doubao')x=-.105;if(role==='gemini')x=.015;if(role==='whale'){x=.145;z=.22;scale=.56;}}
  if(a==='shoe-falls'){if(role==='kimi'){x=-.06;z=.15;}if(role==='whale'){x=.105;z=.21;scale=.67;}}
  if(a==='playful-run'){if(role==='claude'){x=-.15;z=.17;}if(role==='whale'){x=lerp(.04,.13,k);z=.21;}}
  if(a==='follow-rainbow-river'){if(role==='whale'){x=lerp(-.14,.13,k);y+=.009+Math.sin(u*TAU*2)*.004;z=.22;scale=.88;}}
  if(a==='dragon-throws-star'){if(role==='gpt'){x=-.10;z=.14;scale=.9;}if(role==='whale'){x=.08;z=.21;scale=.86;}}
  if(a==='heart-ribbon-handoff'||a==='heart-light-delivery'){if(role==='claude')x=-.09;if(role==='whale'){x=.09;z=.20;}}
  if(a==='run-by-waterwheel'){if(role==='whale'){x=lerp(-.11,.08,k);z=.21;}if(role==='kimi'){x=.13;z=.13;scale=.8;}}
  if(a==='open-time-curtain'){if(role==='kimi'){x=-.11;z=.15;}if(role==='whale'){x=lerp(.02,.10,k);y+=.008;z=.21;}}
  if(a==='lead-paper-fleet'||a==='guide-empty-fleet'){if(role==='whale'){x=lerp(-.13,.10,k);z=.22;y+=Math.sin(u*TAU*2)*.004;scale=.82;}}
  if(a==='firework-and-crest-handoff'){const order=cue.cast.indexOf(role);x=-.16+order*.045;z=.10+(order%3)*.04;scale=.65;if(role==='whale')x=.02;if(role==='gpt')y+=.045;}
  if(a==='sleep-buried-in-roses'||a==='sleep-through-hardship'){if(role==='claude'){x=-.035;y=BASE_Y;z=.19;scale=.86;}if(role==='whale'){x=.12;z=.20;scale=.65;}}
  if(a==='mermaid-sees-palace'){if(role==='whale'){x=-.025;y+=.012;z=.21;}if(role==='kimi'){x=.11;z=.17;scale=.72;}}
  if(a==='sunbird-orbit'){if(role==='gpt'){x=-.01;y+=.055;z=.11;scale=.82;}if(role==='whale'){x=.12;z=.20;scale=.72;}}
  if(a==='track-tigers'){if(role==='whale'){x=lerp(-.13,.08,k);z=.20;}if(role==='kimi'){x=.14;z=.11;scale=.78;}}
  if(a==='pinocchio-lie'){if(role==='gemini'){x=-.08;z=.16;}if(role==='whale'){x=.10;z=.20;scale=.78;}}
  if(a==='chest-gems-leap'){if(role==='zai'){x=-.10;z=.14;scale=.80;}if(role==='gpt'){x=.0;z=.11;scale=.72;}if(role==='whale'){x=.12;z=.21;scale=.65;}}
  if(a==='tree-blooms-root-to-crown'){if(role==='kimi'){x=-.08;z=.13;scale=.82;}if(role==='whale'){x=.10;z=.20;scale=.68;}}
  if(a==='red-shoe-dance'){if(role==='doubao'){x=-.04;z=.16;}if(role==='whale'){x=.15;z=.20;scale=.68;}}
  if(a==='sunlight-eyeshadow'){if(role==='whale'){x=0;y=BASE_Y+.009;z=.205;scale=1.08;}}
  if(a==='foam-embrace-rise'){if(role==='whale'){x=0;y=BASE_Y+.012+ss(u)*.035;z=.20;scale=.9;}}
  if(a==='take-second-river-branch'){if(role==='whale'){x=lerp(-.13,.13,k);y+=.01;z=.21;scale=.88;}}
  if(a==='star-toss-catch-pass'){if(role==='gpt')x=-.12;if(role==='gemini')x=0;if(role==='whale'){x=.13;z=.20;}}
  if(a==='meet-and-pass-light'){if(role==='whale')x=lerp(-.10,.01,k);if(role==='kimi')x=.10;}
  if(a==='pull-clock-chain'){if(role==='kimi'){x=-.09;z=.15;}if(role==='whale'){x=lerp(.04,.12,k);z=.20;scale=.76;}}
  if(a==='fleet-around-castle'){if(role==='whale'){const ang=u*TAU*.7;x=.03+Math.cos(ang)*.09;y=BASE_Y+.01+Math.sin(ang)*.012;z=.21;scale=.80;}}
  if(a==='travel-below-waterfalls'){if(role==='whale'){x=lerp(-.14,.05,k);y=BASE_Y+.008+Math.sin(u*TAU)*.004;z=.21;scale=.83;}if(role==='gpt'){x=.12;y+=.03;z=.11;scale=.7;}}
  if(a==='walk-boundary'){if(role==='kimi')x=-.10;if(role==='whale')x=lerp(.04,.14,k);}
  if(a==='two-rivers-converge'){if(role==='whale'){x=lerp(-.16,.02,k);y+=.006;z=.20;}}
  if(a==='paper-boat-rapids'){if(role==='whale'){x=lerp(-.14,.12,k);y+=Math.sin(u*TAU*2)*.009;z=.21;}}
  if(a==='clock-mirror-dive'){if(role==='kimi')x=-.08;if(role==='whale'){x=lerp(.08,.0,k);y+=Math.sin(u*Math.PI)*.018;z=.20;}}
  if(a==='procession-place-crest'||a==='lamp-handoff-fireworks'){const order=cue.cast.indexOf(role);x=-.16+order*.046;z=.105+(order%3)*.035;scale=.66;if(role==='whale')x=.02;if(role==='gpt')y+=.05;}
  if(a==='map-turn-new-river'){if(role==='claude'){x=-.10;z=.16;}if(role==='whale'){x=.08;z=.19;scale=.78;}}
  if(a==='draw-bridge-and-lift-lantern'){if(role==='qwen'){x=-.10;z=.15;}if(role==='whale'){x=lerp(-.02,.11,k);z=.20;scale=.78;}}
  if(a==='lantern-to-galaxy'){if(role==='qwen'){x=-.08;z=.15;}if(role==='whale'){x=lerp(.04,0,k);y+=u*.025;z=.20;}if(role==='gpt'){x=.13;y+=.045;z=.10;}}
  if(a==='link-river-star-and-pass-emblems'||a==='farewell-and-return-to-page'){const order=cue.cast.indexOf(role);x=-.16+order*.045;z=.10+(order%3)*.04;scale=.66;if(role==='whale')x=.02;if(role==='gpt')y+=.05;}
  if(a==='farewell-and-return-to-page'&&role==='whale'){y+=.02;scale=.75;}
  return {x,y,z,scale,rot};
}
function propLayout(cue,item,index,total,u){
  const {raw,type,instance}=item,a=cue.action;let x=(index-(total-1)/2)*.06,z=.13,y=BASE_Y,scale=1,rot=0,flat=isFlat(type,raw);
  if(type==='castle'||type==='candy-house'){x=-.145;z=.025;scale=type==='castle'?(/castle-harbor|castle-blessing/.test(cue.theme)?.84:.74):1;}
  else if(type==='clocktower'){x=.145;z=.035;scale=.78;}
  else if(type==='village'){x=-.14;z=.025;scale=.92;}
  else if(type==='tree'||type==='rose-tree'||type==='mountain'||type==='city'){x=.14;z=.03;scale=type==='mountain'?1.05:.9;}
  else if(type==='bridge'){x=.09;z=.045;scale=.95;}
  else if(type==='wheel'){x=.145;z=.075;y+=.025;scale=.78;}
  else if(type==='paper-boat'){x=.025+instance*.02;z=.225;scale=.9;}
  else if(type==='water'){x=.015;z=.16;scale=1;flat=true;}
  else if(type==='path'){x=0;z=.105;scale=1;flat=true;}
  else if(type==='waterfall'){x=.14;z=.035;scale=.88;}
  else if(type==='lantern'){x=.125;z=.18;scale=.78;}
  else if(type==='star'||type==='light-seed'||type==='ring'){x=.105;z=.16;scale=type==='ring'?.72:.68;}
  else if(type==='wolf-shadow'){x=.13;z=.075;scale=1;}
  else if(type==='red-cape'){x=-.08;y+=.025;z=.145;scale=.92;}
  else if(type==='cup'){x=.005;z=.20;scale=.78;}
  else if(type==='tea-table'){x=-.045;z=.09;scale=.85;}
  else if(type==='watch'){x=-.13;z=.19;scale=.72;}
  else if(type==='clock-chain'){x=-.11;y+=.035;z=.20;scale=.85;}
  else if(type==='glass-shoe'||type==='red-shoe'){x=.055;z=.19;scale=type==='red-shoe'?1.05:.95;}
  else if(type==='heart'){x=.02;z=.18;scale=.86;}
  else if(type==='gem-chest'){x=.04;z=.18;scale=.88;}
  else if(type==='page'){x=-.13;z=.14;scale=.9;}
  else if(type==='puppet'||type==='nose'||type==='strings'||type==='theater'){x=.07;z=.15;scale=.9;}
  else if(type==='basket'){x=-.14;z=.19;scale=.70;}
  else if(type==='apple'){x=-.065;y+=.04;z=.19;scale=.65;}
  else if(type==='cloud'){x=.10;y+=.075;z=.10;scale=.85;}
  else if(type==='music-notes'){x=.04;y+=.07;z=.14;scale=.72;}
  else if(type==='candy'){x=.01;y+=.025;z=.205;scale=.70;}
  else if(type==='light-ribbon'){x=.01;y+=.045;z=.18;scale=.92;}
  else if(type==='butterfly'){x=.04;y+=.075;z=.16;scale=.52;}
  else if(type==='petals'){x=.01;y+=.025;z=.19;scale=.65;}
  else if(type==='bed'){x=-.035;z=.045;scale=.9;}
  else if(type==='sunbeam'){x=.04;y+=.08;z=.22;scale=.60;}
  else if(type==='sunbird'){x=.025;y+=.07;z=.13;scale=.82;}
  else if(type==='tiger'){x=-.085+instance*.085;z=.15;scale=.72;}
  else if(type==='bubbles'){x=.12;y+=.035;z=.19;scale=.62;}
  else if(type==='foam'){x=.0;y+=.02;z=.20;scale=.9;}
  else if(type==='spray'){x=.02;y+=.035;z=.20;scale=.85;}
  else if(type==='cave'){x=-.135;z=.035;scale=.9;}
  else if(type==='pier'){x=.11;z=.055;scale=.95;}
  else if(type==='pencil'){x=-.12;y+=.035;z=.19;scale=.72;}
  if(total>1&&type==='star'&&raw!=='fireworks'){x=-.14+instance*.055;z=.10+instance*.018;scale*=.56;}
  if(type==='duck'||type==='swan'){x=.085;z=.225;scale*=1.25;}
  // Each lyric's prop choreography mirrors the named action rather than merely sitting in a motif.
  // Let the moving paper animals and wheel carry the sense of travel while human cut-outs hold still.
  if(a==='track-tigers'&&type==='tiger'){
    const q=eio(seg(u,.10,.90));
    x=lerp(-.16+instance*.05,-.05+instance*.05,q);z=.14+(instance%2)*.018;scale=.72;
  }
  if((a==='run-by-waterwheel'||a==='meet-and-pass-light')&&type==='wheel')rot=-u*TAU*1.1;
  if(a==='run-beside-boat'&&raw==='apple'){x=lerp(-.08,-.04,eio(u));y=BASE_Y+.045+Math.sin(u*TAU)*.012;rot=Math.sin(u*TAU)*.18;}
  if(a==='clocktower-glide'&&type==='paper-boat'){x=lerp(-.11,.10,eio(u));y=BASE_Y+.004+Math.sin(u*TAU)*.004;rot=Math.sin(u*TAU)*.08;}
  if(a==='harp-and-climb'&&type==='music-notes'){y=BASE_Y+.04+Math.sin(u*TAU*2+instance)*.012;x=.06+instance*.01;}
  if(a==='playful-run'&&type==='butterfly'){x=lerp(-.14,.13,eio(u));y=BASE_Y+.06+Math.sin(u*TAU*2)*.025;rot=Math.sin(u*TAU)*.3;}
  if(a==='cloak-shield-open'&&type==='red-cape'){scale*=.8+.35*ss(seg(u,.12,.65));rot=-.15*Math.sin(u*TAU);}
  if(a==='shoe-falls'&&(type==='glass-shoe'||type==='red-shoe')){y=BASE_Y+.075*(1-eio(seg(u,0,.68)));z=.205;scale*=1.15;rot=-.2+u*2.4;}
  if(a==='candy-pass'&&type==='candy'){const k=seg(u,.12,.75);x=lerp(-.095,.075,eio(k))+Math.sin(k*Math.PI)*.03;y=BASE_Y+.025+Math.sin(k*Math.PI)*.04;z=.22;rot=k*TAU;}
  if(a==='cup-pass'&&type==='cup'){const q=eio(seg(u,.08,.9));x=lerp(-.095,.015,q);y=BASE_Y+.02+Math.sin(q*Math.PI)*.04;z=.225;scale*=1.05;rot=-.25+Math.sin(q*Math.PI)*.45;}
  if(a==='duck-to-swan'&&(type==='duck'||type==='swan')){const p=ss(seg(u,.30,.74)),duck=type==='duck';scale*=duck?1-p:p;y+=duck?0:.008;}
  if(a==='wolf-shadow-contained'&&type==='wolf-shadow'){const q=ss(seg(u,.18,.82));x=lerp(.13,-.02,q);scale*=1-q*.65;}
  if((a==='heart-ribbon-handoff'||a==='heart-light-delivery')&&type==='heart'){x=lerp(-.10,.09,eio(u));y=BASE_Y+.035+Math.sin(u*Math.PI)*.018;rot=Math.sin(u*Math.PI)*.12;}
  if(a==='heart-ribbon-handoff'&&type==='light-ribbon'){x=.015;y=BASE_Y+.04+Math.sin(u*TAU)*.006;scale*=.75+.25*ss(seg(u,.05,.85));}
  if(a==='sunbird-orbit'&&type==='sunbird'){const ang=u*TAU;x=.02+Math.cos(ang)*.075;y=BASE_Y+.08+Math.sin(ang)*.035;rot=ang;}
  if(a==='chest-gems-leap'&&type==='gem-chest'){const q=seg(u,.18,.8);x=-.08+instance*.04;y=BASE_Y+.035+ss(q)*(.03+instance*.004);rot=q*4;}
  if(a==='tree-blooms-root-to-crown'&&(type==='tree'||type==='petals')){const q=ss(seg(u,.05,.9));if(type==='tree')scale*=lerp(.35,1,q);else{y=BASE_Y+.02+q*.06;x=-.08+instance*.035;}}
  if(a==='red-shoe-dance'&&(type==='red-shoe'||type==='glass-shoe')){x=instance%2?.085:-.11;y=BASE_Y+.018+Math.abs(Math.sin(u*TAU*2+instance))*.045;z=.22;scale*=1.2;rot=Math.sin(u*TAU*2+instance)*.6;}
  if(a==='dragon-throws-star'&&type==='star'){x=lerp(-.10,.08,eio(u));y=BASE_Y+.04+Math.sin(u*Math.PI)*.06;scale=1.15;rot=u*TAU;}
  if(a==='star-toss-catch-pass'&&type==='star'){x=lerp(-.12,.12,eio(u));y=BASE_Y+.035+Math.sin(u*Math.PI)*.055;scale=1.15;rot=u*TAU;}
  if(a==='meet-and-pass-light'&&type==='light-seed'){x=lerp(.10,-.02,eio(u));y=BASE_Y+.03+Math.sin(u*Math.PI)*.02;}
  if((a==='firework-and-crest-handoff'||a==='lamp-handoff-fireworks')&&type==='star'&&raw!=='fireworks'){const q=seg(u,.62,.92);scale*=Math.max(.05,ss(q));y=BASE_Y+.04+Math.sin(u*TAU*5)*.018;}
  if((a==='firework-and-crest-handoff'||a==='lamp-handoff-fireworks')&&raw==='fireworks'&&type==='star'){const q=ss(seg(u,.08,.78)),angle=instance*TAU/countOf(raw),radius=.012+q*.065,center=a==='firework-and-crest-handoff'?-.13:.02;x=center+Math.cos(angle)*radius;y=BASE_Y+.09+Math.sin(angle)*radius;z=.045+(instance%2)*.005;scale=.45+q*.9;rot=angle+u*.8;}
  if(a==='firework-and-crest-handoff'&&type==='crest'){const q=ss(seg(u,.18,.78));x=lerp(.13,.02,eio(q));y=BASE_Y+.09*(1-q)+Math.sin(q*Math.PI)*.02;z=.22;scale=.72;rot=(1-q)*.14;}
  if(a==='procession-place-crest'&&type==='crest'){const q=ss(seg(u,.08,.86));x=lerp(.13,.015,eio(q));y=BASE_Y+.085*(1-q);z=.22;scale=.82;rot=(1-q)*.16;}
  if(a==='lamp-handoff-fireworks'&&type==='lantern'){x=lerp(-.10,.015,eio(seg(u,.12,.72)));y=BASE_Y+.04+Math.sin(u*Math.PI)*.025;}
  if(a==='sleep-buried-in-roses'&&type==='petals'){x=-.10+instance*.05;y=BASE_Y+.09*(1-eio(seg(u,0,.9)));rot=u*2+instance;}
  if(a==='sunlight-eyeshadow'&&type==='sunbeam'){x=lerp(.12,.015,eio(u));y=BASE_Y+.075+Math.sin(u*Math.PI)*.008;scale=.38;}
  if(a==='foam-embrace-rise'&&(type==='foam'||type==='bubbles')){y=BASE_Y+.02+u*.05+Math.sin(u*TAU+instance)*.009;x=(instance%2?-.06:.06);}
  if(a==='two-rivers-converge'&&type==='water'){const side=/golden-current/.test(raw)?1:-1;x=lerp(side*.12,0,eio(u));rot=side*.08;}
  if(a==='paper-boat-rapids'&&type==='paper-boat'){x=lerp(-.15,.15,eio(u));y=BASE_Y+.006+Math.sin(u*TAU*3)*.008;rot=Math.sin(u*TAU*2)*.18;}
  if(a==='clock-mirror-dive'&&type==='watch'){y=BASE_Y+.06*(1-ss(seg(u,.2,.9)));rot=u*TAU;}
  if(a==='pull-clock-chain'&&type==='clock-chain'){x=lerp(-.11,-.03,eio(u));y=BASE_Y+.035+Math.sin(u*TAU)*.01;rot=Math.sin(u*TAU)*.15;}
  if(a==='fleet-around-castle'&&type==='paper-boat'){const ang=u*TAU+instance*TAU/4;x=.02+Math.cos(ang)*.12;y=BASE_Y+.005;z=.14+Math.sin(ang)*.055;rot=ang*.18;scale=.62;}
  if(a==='travel-below-waterfalls'&&type==='waterfall'){y=BASE_Y-.01+ss(u)*.012;}
  if(a==='walk-boundary'&&type==='city'){x=.13;y=BASE_Y;scale=.88;rot=.08*Math.sin(u*TAU);}
  if(a==='guide-empty-fleet'&&type==='paper-boat'){const q=lerp(-.14,.14,eio(u));x=q+(instance%4)*.025;y=BASE_Y+.004;rot=.04*Math.sin(u*TAU+instance);}
  if(a==='map-turn-new-river'&&type==='page'){rot=-.18+eio(u)*.36;}
  if(a==='draw-bridge-and-lift-lantern'&&type==='bridge'){scale*=eio(seg(u,.05,.55));}
  if(a==='draw-bridge-and-lift-lantern'&&type==='pencil'){x=lerp(-.13,.02,eio(u));y=BASE_Y+.025+Math.sin(u*TAU)*.012;rot=-.7+u*.5;}
  if(a==='lantern-to-galaxy'&&type==='lantern'){y=BASE_Y+.02+u*.12;x=.02+Math.sin(u*TAU)*.03;}
  if((a==='link-river-star-and-pass-emblems'||a==='farewell-and-return-to-page')&&type==='star'){const ang=u*TAU+instance*.8;x=Math.cos(ang)*.12;y=BASE_Y+.08+Math.sin(ang)*.04;rot=ang;}
  return {x,y,z,scale,rot,flat};
}
function cueProps(cue,stage){
  const out=[];let ix=0;
  for(const raw of cue.props){const type=category(raw),count=countOf(raw);for(let j=0;j<count;j++){
    const obj=makeProp(type);obj.raw=raw;obj.instance=j;obj.g.visible=false;stage.add(obj.g);out.push(obj);ix++;
  }}return out;
}

export function buildWorld(book){
  const actors=new Map();for(const r of ROLES){const h=r==='whale'?.060:.056;const a=makeActor(r,h);book.stage.add(a.root);book.stage.add(a.shadow);a.setVisible(false);actors.set(r,a);}
  const scenes=CUES.map(c=>({cue:c,props:cueProps(c,book.stage)}));
  const whaleBoat=makeProp('paper-boat');book.stage.add(whaleBoat.g);whaleBoat.g.visible=false;
  const instrumentalProps=[makeProp('paper-boat'),makeProp('castle'),makeProp('lantern'),makeProp('water')];for(const p of instrumentalProps){book.stage.add(p.g);p.g.visible=false;p.flat=p.type==='water';}
  const bgCache=new Map();
  function bg(theme){const k=theme.toLowerCase();if(!bgCache.has(k))bgCache.set(k,backgroundFor(theme));return bgCache.get(k);}
  let shownKey='';
  function applyBg(theme){const b=bg(theme);if(b.key!==shownKey){book.groundMat.map=b.ground;book.backMat.map=b.sky;book.groundMat.needsUpdate=true;book.backMat.needsUpdate=true;shownKey=b.key;}return b;}
  function sectionInfo(t){
    if(t<13.55)return {theme:'castle-river',action:'intro'};
    if(t<41.15)return {theme:'castle-river',action:'day-verse'};
    if(t<54.95)return {theme:t<47.9?'underwater-arch':'cloak-grove',action:'pre-chorus'};
    if(t<85.6)return {theme:'rainbow-map',action:'chorus'};
    if(t<97.45)return {theme:'night-village',action:'interlude'};
    if(t<125.15)return {theme:'rose-tower-night',action:'night-verse'};
    if(t<137.95)return {theme:'deep-river',action:'deep-sea'};
    if(t<165.95)return {theme:'day-river-return',action:'chorus-return'};
    if(t<195.8)return {theme:'floating-islands',action:'dream-river'};
    if(t<240)return {theme:'constellation-links',action:'climax'};
    return {theme:'castle-river',action:'tail'};
  }
  function turnState(t){
    for(let i=0;i<PAGE_TURNS.length;i++){const at=PAGE_TURNS[i],a=at-.42,b=at+.42;if(t>=a&&t<=b){const old=themeAt(Math.max(0,at-.20)),next=themeAt(Math.min(DUR,at+.20));return {i,at,a,b,p:eio(seg(t,a,b)),old,next};}}
    return null;
  }
  function setupTurn(t){const tr=turnState(t);if(!tr){book.setLeaf(0);return;}const old=bg(tr.old),next=bg(tr.next);book.leafFront.material.map=old.ground;book.leafBack.material.map=next.sky;book.leafFront.material.needsUpdate=book.leafBack.material.needsUpdate=true;book.setLeaf(tr.p);}
  function actorFrame(cue,u){
    for(const a of actors.values())a.setVisible(false);
    if(!cue)return;
    const total=cue.cast.length;
    cue.cast.forEach((role,index)=>{
      const actor=actors.get(role);if(!actor)return;
      let [pose,face]=sectionPose(cue.action,role);
      // Upright performers use source-project gesture sprites; props and camera supply travel.
      if(cue.action==='run-beside-boat'&&role==='whale')pose='point';
      if((cue.action==='lantern-shield'||cue.action==='cloak-shield-open')&&(role==='doubao'||role==='whale'))pose='reach';
      if(cue.action==='cup-pass'&&(role==='qwen'||role==='gemini'))pose='reach';
      if(cue.action==='clocktower-glide'&&role==='zai')pose='point';
      if(cue.action==='harp-and-climb'&&role==='zai')pose='reach';
      if(cue.action==='candy-pass'&&(role==='doubao'||role==='gemini'))pose='reach';
      if(cue.action==='shoe-falls'&&role==='kimi')pose='point';
      if(cue.action==='pinocchio-lie'&&role==='gemini')pose='point';
      if(cue.action==='playful-run'&&role==='claude')pose='point';
      if((cue.action==='lead-paper-fleet'||cue.action==='guide-empty-fleet')&&role==='whale')pose='wave';
      if(cue.action==='lantern-shield'&&role==='doubao')face='worried';
      if(cue.action==='cloak-shield-open'&&role==='doubao')face='determined';
      if(cue.action==='sleep-buried-in-roses'||cue.action==='sleep-through-hardship'){pose=role==='claude'?'sleep':'idle';face=pose==='sleep'?'sleep':'gentle';}
      if(cue.action==='sleep-through-hardship'&&role==='whale')pose='reach';
      if(cue.action==='farewell-and-return-to-page'&&role==='whale')pose='wave';
      // Gesture has a readable prepare → contact → release window; feet stay planted.
      if(['reach','point','wave'].includes(pose)&&(u<.12||u>.88))pose='idle';
      const p=actorLayout(cue,role,index,total,role==='whale'?u:.5);
      if(role==='whale')p.x+=Math.sin(u*TAU)*.045; // carried by the boat; never a walk cycle
      const phase=u*TAU*2;
      actor.setPose(pose,phase,face);actor.setPosition(p.x,p.y,p.z,p.scale,p.rot);actor.setVisible(true);
      const shadow=(cue.action==='lantern-shield'&&role==='gpt')?.32:1;actor.setOpacity(shadow);
    });
  }
  function renderProps(items,cue,u,t){
    for(let i=0;i<items.length;i++){
      const item=items[i],base=propLayout(cue,item,i,items.length,u);item.g.visible=true;item.flat=base.flat;
      const pop=base.flat?1:eio(seg(t,cue.t0+i*.055,cue.t0+i*.055+.46));
      item.g.position.set(base.x,base.y,base.z);
      item.g.scale.setScalar(base.scale*(base.flat?1:Math.max(.001,pop)));
      item.g.rotation.set(base.flat?-Math.PI/2:(1-pop)*Math.PI/2,0,base.rot);
      if(cue.action==='lantern-shield'&&item.type==='lantern'){item.g.position.x=lerp(.02,.08,eio(u));item.g.position.y=BASE_Y+.03;}
      if(cue.action==='cloak-shield-open'&&item.type==='red-cape'){item.g.scale.y=base.scale*(.5+.5*ss(seg(u,.1,.6)));item.g.rotation.z=-.12*Math.sin(u*TAU);}
      if(cue.action==='wolf-shadow-contained'&&item.type==='wolf-shadow'){item.g.scale.setScalar(base.scale*(1-ss(seg(u,.12,.82))*.55));}
    }
  }
  function instrumental(t,info){
    for(const a of actors.values())a.setVisible(false);for(const p of instrumentalProps)p.g.visible=false;
    const whale=actors.get('whale'),u=info.action==='intro'?seg(t,0,13.55):info.action==='tail'?seg(t,240,DUR):seg(t,85.6,97.45);
    if(info.action==='intro'||info.action==='tail'){
      const boatX=lerp(-.12,.12,u),boatY=BASE_Y+.015+Math.sin(u*TAU*2)*.003,boatZ=.21;
      whale.setPose(info.action==='intro'?'row':'wave',u*TAU*2,'happy');whale.setPosition(boatX,boatY,boatZ,1,0);whale.setVisible(true);
      const b=instrumentalProps[0];b.g.visible=true;b.g.position.set(boatX,boatY-.004,boatZ-.012);b.g.scale.setScalar(1.08);b.g.rotation.set(0,0,Math.sin(u*TAU*2)*.06);
      instrumentalProps[1].g.visible=true;instrumentalProps[1].g.position.set(-.14,BASE_Y,.035);instrumentalProps[1].g.scale.setScalar(1.0);instrumentalProps[1].g.rotation.set(0,0,0);
      instrumentalProps[3].g.visible=true;instrumentalProps[3].g.position.set(0,BASE_Y,.15);instrumentalProps[3].g.scale.setScalar(.8);instrumentalProps[3].g.rotation.set(-Math.PI/2,0,0);
    }else{
      const k=ss(seg(t,86,91)),boatX=lerp(-.10,.12,u),boatY=BASE_Y+.015+Math.sin(u*TAU*2)*.003,boatZ=.21;
      whale.setPose('row',u*TAU*2,'happy');whale.setPosition(boatX,boatY,boatZ,.92,0);whale.setVisible(true);
      const b=instrumentalProps[0];b.g.visible=true;b.g.position.set(boatX,boatY-.004,boatZ-.012);b.g.scale.setScalar(1.02);b.g.rotation.set(0,0,Math.sin(u*TAU*2)*.06);
      instrumentalProps[2].g.visible=true;instrumentalProps[2].g.position.set(.12,BASE_Y+.02+.025*k,.18);instrumentalProps[2].g.scale.setScalar(.75);instrumentalProps[2].g.rotation.set(0,0,Math.sin(t*2)*.04);
      instrumentalProps[1].g.visible=true;instrumentalProps[1].g.position.set(-.12,BASE_Y,.03);instrumentalProps[1].g.scale.setScalar(.9);instrumentalProps[1].g.rotation.set(0,0,0);
      instrumentalProps[3].g.visible=true;instrumentalProps[3].g.position.set(0,BASE_Y,.15);instrumentalProps[3].g.scale.setScalar(.8);instrumentalProps[3].g.rotation.set(-Math.PI/2,0,0);
    }
  }
  function render(t){
    const cue=cueAt(t),info=sectionInfo(t);const turn=turnState(t);
    const theme=turn?(turn.p<.5?turn.old:turn.next):themeAt(t);applyBg(theme);setupTurn(t);
    for(const s of scenes)for(const p of s.props)p.g.visible=false;
    for(const p of instrumentalProps)p.g.visible=false;whaleBoat.g.visible=false;
    if(cue){
      const entry=scenes[CUES.indexOf(cue)],u=seg(t,cue.t0,cue.t1);actorFrame(cue,u);renderProps(entry.props,cue,u,t);
      if(cue.cast.includes('whale')){
        const whale=actors.get('whale'),ride=entry.props.find(p=>p.raw==='paper-boat')||whaleBoat;
        ride.g.visible=true;ride.flat=false;ride.g.position.set(whale.root.position.x,whale.root.position.y-.004,whale.root.position.z-.012);
        if(ride===whaleBoat){const pop=eio(seg(t,cue.t0,cue.t0+.42));ride.g.scale.setScalar(1.12*pop);ride.g.rotation.set(0,0,0);}
        else ride.g.scale.multiplyScalar(1.22);
      }
    }else {instrumental(t,info);}
    return {cue,section:info,turn,theme};
  }
  return {render,actors,scenes,instrumentalProps,whaleBoat,bgCache,textureCache:texCache,sectionInfo,turnState};
}
