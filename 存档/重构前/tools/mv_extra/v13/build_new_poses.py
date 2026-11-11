"""Extract a few full-character story cels; white is removed only from the outside.
These are posing assets, not a substitute for fully articulated animation."""
from build_whale import normalized,OUT
for name in ['kimi_underwater_final','gemini_swim','whale_sit_final_retry','whale_photo','claude_place','zai_reach','gpt_push_final','doubao_step']:
    im,_=normalized(name)
    im.save(OUT/(name+'_cel.png'))
    print(name, im.getbbox())
