import fs from 'node:fs';import path from 'node:path';
const base=path.resolve('tools/mv_dayu/remotion'), pub=path.join(base,'public');fs.mkdirSync(pub,{recursive:true});fs.mkdirSync(path.join(base,'out'),{recursive:true});
const names=['whale_read_action','whale_gather_retry_action','whale_walk_retry_action','whale_sit_blink_action','whale_rain_reach_blink_action','whale_rainwalk_action','whale_camera_action','claude_collect_action','gpt_sweep_action','qwen_water_full_action','kimi_stargaze_seated_action','gemini_kite_action','zai_clock_action','doubao_shared_umbrella_action','doubao_comfort_action','kimi_swim_padded_fixed_stroke35_action'];
for(const name of names)fs.copyFileSync(path.resolve('assets/ai-girls/lyric-action-v13',name+'.png'),path.join(pub,name+'.png'));
fs.copyFileSync(path.resolve('video-fx/assets/fonts/NotoSansSC-Bold.ttf'),path.join(pub,'font.ttf'));
fs.copyFileSync(path.resolve('tools/day13制作/subtitle_timing.json'),path.join(base,'day13-subs.json'));console.log('Existing v13 atlases, font and measured subtitles staged.');
