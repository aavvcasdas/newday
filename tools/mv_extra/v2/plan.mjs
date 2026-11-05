import fs from'node:fs';import path from'node:path';import{createHash}from'node:crypto';import{ROOT}from'./actors.mjs';
export const FPS=30,START_FRAME=571,END_FRAME=1165,FRAMES=END_FRAME-START_FRAME,START=START_FRAME/FPS,END=END_FRAME/FPS;
export const LYRICS=fs.readFileSync(new URL('./lyrics.txt',import.meta.url),'utf8').trim().split('\n');
export const SCRIPT_SHA=createHash('sha256').update(fs.readFileSync(new URL('./lyrics.txt',import.meta.url))).digest('hex');
const old=JSON.parse(fs.readFileSync(path.join(ROOT,'tools/mv_extra/timing.json')));
export const CUES=old.cues.map((x,i)=>({...x,text:LYRICS[i]}));
const definitions=[
 ['shelter',571/30,'雨棚下靠近','wide','主角从左侧沿木板路迈步靠近豆包，脚步由行进距离驱动，停进雨棚干燥区；Claude在长椅另一侧读书。','走入→减速→停步',19.12,20.37],
 ['puddle',20.6,'低头看积水','medium','机位切近；主角屈膝俯身看滴水落进积水，豆包一次整体前倾回应；不是两张站姿一起抖。','俯身→滴水涟漪→起身',20.75,22.04],
 ['overcast',22.433333,'阴霾与陪伴','two_shot','同一海岸空间，主角由蹲姿站直；Qwen透明原图在近侧，扇子为原画已有，不做脸部或手部变形。','站起→准备抬手',22.6,23.9],
 ['part_cloud',24.166667,'拨开阴霾','medium','主角切已有panic抬手身体，头脸仍为既有wave睁眼；云与低雾从中心分开，远处船帆和海平线依次露出。','抬手→云分开→天空停留',24.166667,24.72],
 ['gather',25.2,'抱住快乐','two_shot','主角走近收纳台，再切已有heart抱持身体；金片处于原torso手掌像素之间，手掌从同一原像素层重画在金片上方。GPT在远侧，已去白底。','走近→抱持→停稳',25.3,26.08],
 ['box_insert',26.5,'快乐入盒','insert','连续性切镜到盒口：不伪造缺失的伸手放入动画；同色金片由盒口上方落入，内盖、铰链、盒底分别绘制。','盒口上方→落下→成形停留',26.5,26.9],
 ['sort',27.3,'把不开心淘汰','medium','回到桌边，金片已经收好；灰片沿分流槽滑进旁边小桶，盖板合上，主角切放松身体。动作明确作用于灰片而非角色。','灰片滑落→落桶→结果',27.85,28.36],
 ['night_words',28.833333,'夜城情话','two_shot','同一海岸切夜色平台；主角再次迈步靠近，靠近后停住，挂在栏杆线上的情话纸片逐个翻到正面。豆包保持原五官。','靠近→停住→纸片转正',29.0,30.55],
 ['launch',31.4,'光迹升空','wide','主角转为既有背向视图看升空轨迹；远城建筑有窗格、屋顶设备、岸边灯与海面反射。相机固定，不拿推镜当表演。','背向→升空→抵达',31.4,33.9],
 ['reaction',33.966667,'烟花落进眼前','medium','切到侧前反应：主角单次屈膝后站稳、身体后仰看烟花；豆包只整体轻倾一次。烟花同时在远景展开，不给人物加光圈。','爆开→身体反应→停住',33.966667,34.8],
 ['bloom',35.866667,'绽放与熄灭','insert','切无人烟花空景，粒子从中心带不同初速发散、受重力下坠、拖尾衰减；海面保留对应色反射，38.8秒前逐渐熄灭。','绽放→下坠→熄灭',37.133333,38.8]
];
export const SHOTS=definitions.map((a,i)=>({id:a[0],start:Math.round(a[1]*30)/30,end:i+1<definitions.length?Math.round(definitions[i+1][1]*30)/30:END,title:a[2],framing:a[3],direction:{focus:a[2],construction:a[4],action:a[5],trigger:a[6],result:a[7],holdSeconds:(i+1<definitions.length?definitions[i+1][1]:END)-a[7],entry:i?definitions[i-1][0]:'source music 19.033s',exit:i+1<definitions.length?definitions[i+1][0]:'source 38.833s; sample ends, not full ending'},status:'rendered_pilot_not_user_approved'}));
export const FULL_PLAN=[
 [0,4.6,1,'拼图上的小小存在','建立整个拼图平台→沿拼图边缘走两步→切中景扶稳；背景由多层纸板、拼接缝、侧厚度和接触影构成。主角不悬空。'],
 [4.6,8.366667,2,'不只有挫败','星球远景→主角屈膝受挫→起身望向对岸；Gemini在另一块拼片上先局部后完整出现，不以白底海报出现。'],
 [8.366667,11.7,3,'相遇与光明','像素腿部连续迈步接近豆包→停步→既有挥手/抱持身体回应；环境由灰到暖，不做聚光灯。'],
 [11.7,15.4,4,'眼睛里的海','近景完整眼睛→视线匹配剪海边人物背向→无人海面远景；岸石、浪线、远船提供尺度。'],
 [15.4,19.033333,5,'不能取代的日子','四个画内小场景共享道具落点；Kimi在观潮一格，Gemini在拼图一格。进入夜观潮单景，不摆原图画框。'],
 ...CUES.filter(c=>c.line>=6&&c.line<=11).map(c=>[c.start,c.end,c.line,`试剪已实现：${c.text}`,'见下方11个实际执行镜头；并非每句只换一张背景。']),
 [38.833333,42.7,12,'无法自拔','烟花拖尾匹配剪到海中漂流拼片；主角身体前倾失去平衡后稳住，画内回忆必须用本片重绘夜城，不搬原片帧。'],
 [42.7,44.6,13,'日夜双钟','主角在左边迈步到分界，豆包在另一侧；两只钟针错开，主角停下，保留两人距离。'],
 [44.6,48.666667,14,'骗自己放下','同一纸带的攥住前后状态切镜→松开结果特写→纸带滑落；缺真实手素材时不画假手。'],
 [48.666667,51,15,'炙热的你','暖色海岸先看豆包，再切主角稳定反应；不改口型，不给角色加新饰品。'],
 [51,56.033333,16,'记得爱自己','主角抱回与开场同色的拼片，走回缺口，连续性剪到拼合结果；保持全身完整和余音，不加尾卡。']
].map((a,i)=>({id:i+1,start:a[0],end:a[1],line:a[2],moment:a[3],construction:a[4],status:a[2]>=6&&a[2]<=11?'pilot_implemented':'planned_not_rendered'}));
