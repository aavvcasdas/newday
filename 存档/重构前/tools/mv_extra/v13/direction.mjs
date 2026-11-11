// One cue per existing shot, matched to its locked lyric line(s). These are
// visible illustration actions, not claims of calibrated hand-to-prop contact.
const W=['wave','walk','wave','comfort','offer','walk','wave','idle','idle','wave','offer','comfort','comfort','comfort','comfort','wave','offer','offer','offer','wave','wave','sparkler','sparkler','camera','idle','idle','comfort','comfort','wave','offer','offer','offer'];
const G=['wave','wave','wave','comfort','offer','wave','dance','wave','offer','wave','offer','comfort','comfort','comfort','comfort','wave','offer','offer','offer','wave','dance','dance','wave','offer','comfort','comfort','comfort','comfort','wave','offer','dance','offer'];
const labels={idle:'安静眨眼望海',walk:'同行迈步',wave:'招手回应',offer:'捧起/展示记忆拼片',comfort:'安静陪伴与低头',sparkler:'举起仙女棒',camera:'举相机定格',dance:'欢呼挥手'};
export function directionFor(index,name){
  const i=Math.max(0,Math.min(31,index-1));
  const state=name==='whale'?W[i]:G[i];
  const special = state === 'offer' && name === 'gpt' ? '双手比心' : state === 'offer' && name === 'claude' ? '指向回应' : state === 'comfort' && name !== 'whale' ? '安静陪伴与招手' : null;
  return {state, label:special || labels[state]};
}
export function localClock(shot,t,name){
  const order=['whale','doubao','claude','gemini','qwen','gpt','kimi'].indexOf(name);
  return Math.max(0,t-(shot?.start||0)-Math.max(0,order)*0.06);
}
