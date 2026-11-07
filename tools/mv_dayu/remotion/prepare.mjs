// 兼容旧手工静态缓存脚本（新版 tools/remotion-engine/render_cli.mjs 会自动启动本地 HTTP 资产服务直接读取 assets/ai-girls/，无需预先拷贝）
import fs from 'node:fs';
import path from 'node:path';
const base=path.resolve('tools/mv_dayu/remotion');
const source=path.resolve('assets/ai-girls/lyric-action-v13');
const names=['whale_read_action','whale_gather_retry_action','whale_walk_retry_action','whale_rain_reach_blink_action','whale_meet_action','whale_wipe_tear_action','whale_sit_blink_action','whale_bird','whale_point','gpt_push_final_action','doubao_step_action'];
fs.mkdirSync(path.join(base,'public'),{recursive:true});fs.mkdirSync(path.join(base,'out'),{recursive:true});
for(const n of names)fs.copyFileSync(path.join(source,n+'.png'),path.join(base,'public',n+'.png'));
const candidates=['tools/mv_extra/cache/NotoSansSC-Bold.ttf','video-fx/assets/fonts/NotoSansSC-Bold.ttf'];
const font=candidates.find(fs.existsSync);if(!font)throw Error('Missing font: first run python3 tools/day12制作/restore_sample_assets.py');
fs.copyFileSync(font,path.join(base,'public/font.ttf'));
console.log('Copied existing atlases and CJK font to ignored Remotion public cache.');
