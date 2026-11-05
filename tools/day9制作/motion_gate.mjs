// Isolated actor layer: no subtitles, background, camera moves or television can satisfy it.
// This detects lower-body/hand pixel changes, NOT semantic appropriateness or minimum action quality.
import {createHash} from 'node:crypto';
export function createMotionGate(createCanvas, draw, enabled) {
 const canvas=enabled?createCanvas(1280,720):null,ctx=canvas?.getContext('2d');
 return {
  begin(){if(ctx){ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,1280,720);}},
  extra(fn){if(ctx)fn(ctx);},
  draw(g,opts){if(ctx)draw(ctx,opts);return draw(g,opts);},
  hash(){if(!ctx)throw Error('Motion gate disabled');return createHash('sha256').update(ctx.getImageData(0,435,1280,170).data).digest('hex');}
 };
}
