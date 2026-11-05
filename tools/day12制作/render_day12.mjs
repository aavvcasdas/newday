// Thin episode entry; all scene, semantic tracks, actor rig, subtitle and ffmpeg work stays in shared engine.
import { main } from '../engine/render_episode.mjs';
await main(['--spec','tools/day12制作/episode.production.spec.mjs',
  '--voice','鲸鱼摇人_克隆配音_最终版.wav','--alignment','tools/day12制作/voice_alignment.json',
  '--subtitle-file','tools/day12制作/subtitle_timing.json',...process.argv.slice(2)]);
