// Shot ranges only. This is NOT render_day10_full.mjs, a word aligner, or a production renderer.
export const SHOT_RANGES=[
 [1,3,'C01','panic_alert','快被架空与总结变精'],[4,6,'C02','warm_meal','画大饼与敲碗问米'],
 [7,9,'C03','work_cool','加鸡腿与追问弹窗'],[10,12,'C04','work_cool','拍飞弹窗与翻旧账'],
 [13,16,'C05','cinema_glow','接不上话护米缸与复制鱼脑'],[17,19,'C06','work_cool','偷记护碗招数与谁是监工'],
 [20,21,'C07','warm_meal','评论区征集忽悠话术'],[22,23,'C08','warm_meal','记进记事本看紧米缸']
];
export function buildDay10PlanningShots(plan){
 if(plan.measured!==false||plan.kind!=='planning_only_not_formal_alignment')throw Error('Explicit non-measured planning input required');
 if(!Array.isArray(plan.cues)||plan.cues.length!==23)throw Error('Exactly 23 planning lines required');
 let prev=0;for(const [i,c] of plan.cues.entries()){
  if(c.id!==`L${String(i+1).padStart(2,'0')}`||c.measured!==false||![c.estimated_start,c.estimated_end].every(Number.isFinite)||c.estimated_start<prev||c.estimated_end<=c.estimated_start)throw Error('Invalid or overlapping planning lines');prev=c.estimated_end;
 }
 return SHOT_RANGES.map(([from,to,id,mood,title])=>({id,from,to,mood,title,estimated_start:plan.cues[from-1].estimated_start,estimated_end:plan.cues[to-1].estimated_end,measured:false}));
}
