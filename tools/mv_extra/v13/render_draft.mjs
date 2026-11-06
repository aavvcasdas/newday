// Isolated v13 work-in-progress output; never overwrite the v8 or v12 masters.
import path from 'node:path';
import {ROOT} from './actors.mjs';
import {encodeVideoRange} from './film.mjs';
import {TOTAL_FRAMES} from './plan.mjs';
await encodeVideoRange({startFrame:0,endFrame:TOTAL_FRAMES,outPath:path.join(ROOT,'番外MV/把回忆拼好给你/样片/v13_全曲动作修订版_待审.mp4'),audioMode:'copy_master'});
