"""Non-generative matting of existing references. Original RGB is preserved, only alpha changes."""
from pathlib import Path
import json,hashlib
import numpy as np
import cv2
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[3];SOURCE=ROOT/'assets/ai-girls/extra-guests';OUT=SOURCE/'cutouts';OUT.mkdir(exist_ok=True)
# Conservative silhouette guides exclude frame, moon, floating sparkle/cloud and paper decorations.
GUIDES={
'gemini':[(292,88),(363,94),(400,121),(463,91),(493,171),(548,213),(539,289),(567,348),(615,376),(659,371),(662,419),(692,466),(707,543),(705,682),(681,780),(628,878),(575,867),(522,1032),(481,1089),(437,1080),(388,1018),(376,1150),(346,1204),(290,1209),(254,1167),(250,1072),(223,994),(145,991),(133,930),(148,855),(112,832),(34,842),(20,780),(29,690),(74,625),(84,516),(128,458),(169,410),(174,342),(193,287),(181,208),(194,155),(219,155),(256,136)],
'qwen':[(320,86),(411,84),(455,111),(464,150),(505,200),(512,304),(541,382),(553,423),(600,471),(638,553),(666,598),(650,708),(676,841),(666,960),(627,1024),(600,1097),(546,1104),(459,1094),(432,1209),(383,1237),(356,1226),(341,1121),(321,1192),(286,1218),(250,1209),(244,1161),(254,1099),(201,1083),(136,1039),(106,1010),(61,1006),(55,974),(83,877),(69,807),(104,709),(103,618),(94,565),(118,505),(139,475),(146,413),(140,374),(169,340),(146,310),(204,291),(243,300),(247,207),(279,162)],
'kimi':[(302,137),(377,132),(443,145),(500,164),(534,214),(532,302),(524,340),(541,371),(540,409),(555,428),(554,466),(587,491),(596,522),(646,545),(677,583),(698,648),(691,698),(666,732),(625,760),(588,776),(592,805),(626,863),(642,899),(614,947),(547,974),(475,994),(460,1067),(470,1136),(465,1212),(444,1256),(390,1264),(371,1246),(361,1197),(348,1148),(338,1102),(325,1150),(334,1220),(308,1258),(271,1256),(255,1220),(250,1167),(263,1108),(259,1042),(245,1000),(174,991),(111,961),(83,925),(108,857),(141,804),(137,770),(102,768),(68,741),(35,692),(31,632),(52,579),(82,554),(100,509),(134,472),(168,451),(187,403),(209,376),(216,342),(213,288),(225,223),(260,189)],
'gpt':[(247,105),(266,96),(286,161),(308,137),(344,127),(363,103),(414,73),(414,126),(433,160),(463,206),(481,289),(502,363),(538,406),(594,377),(633,400),(644,420),(596,454),(569,476),(583,518),(623,538),(670,598),(697,680),(696,753),(672,767),(648,711),(625,699),(640,795),(658,854),(683,904),(686,977),(659,1033),(626,1094),(625,1134),(650,1164),(624,1206),(576,1209),(513,1207),(461,1197),(414,1207),(366,1203),(341,1184),(326,1203),(273,1216),(245,1197),(212,1197),(162,1203),(111,1185),(81,1179),(46,1142),(31,1096),(43,1058),(67,1021),(110,1003),(88,1052),(98,1090),(138,1090),(170,1053),(128,1035),(113,993),(129,962),(158,919),(181,836),(159,764),(118,730),(65,739),(25,782),(28,716),(47,644),(78,601),(116,558),(169,516),(204,476),(202,436),(225,390),(231,343),(225,299),(230,226),(222,185),(227,139)]}
# Face/core garment are protected foreground, not white-keyed away.
PROTECT={'gemini':[(270,235),(435,235),(449,347),(344,373),(257,335)],'qwen':[(303,216),(425,218),(435,331),(329,365),(292,307)],'kimi':[(269,248),(414,246),(438,347),(346,389),(272,357)],'gpt':[(267,232),(410,228),(427,330),(345,364),(267,326)]}
results=[];sheet=Image.new('RGB',(1440,1280),'#233b50')
for n,name in enumerate(('gemini','qwen','gpt','kimi')):
 im=Image.open(SOURCE/f'{name}.png').convert('RGB');rgb=np.asarray(im);h,w=rgb.shape[:2];guide=Image.new('L',(w,h));ImageDraw.Draw(guide).polygon(GUIDES[name],fill=255);g=np.asarray(guide)>0
 mask=np.where(g,cv2.GC_PR_FGD,cv2.GC_BGD).astype('uint8');inner=cv2.erode(g.astype('uint8'),np.ones((9,9),np.uint8));colored=(rgb.min(axis=2)<224)|((rgb.max(axis=2).astype('int16')-rgb.min(axis=2))>30);mask[(inner>0)&colored]=cv2.GC_FGD
 protected0=Image.new('L',(w,h));ImageDraw.Draw(protected0).polygon(PROTECT[name],fill=255);mask[np.asarray(protected0)>0]=cv2.GC_FGD
 # Guide-boundary refinement only, not global white threshold. White clothes inside remain opaque.
 cv2.grabCut(cv2.cvtColor(rgb,cv2.COLOR_RGB2BGR),mask,None,np.zeros((1,65)),np.zeros((1,65)),3,cv2.GC_INIT_WITH_MASK)
 fg=np.isin(mask,[cv2.GC_FGD,cv2.GC_PR_FGD]).astype('uint8');fg*=g
 protected=Image.new('L',(w,h));ImageDraw.Draw(protected).polygon(PROTECT[name],fill=255);fg[np.asarray(protected)>0]=1
 alpha=(fg*255).astype('uint8')
 if name=='kimi':alpha[1180:,:273]=0;alpha[1245:,:]=0
 rgba=np.dstack([rgb,alpha]);target=OUT/f'{name}.png';Image.fromarray(rgba).save(target)
 assert np.array_equal(rgba[:,:,:3],rgb);assert alpha[0,0]==alpha[-1,-1]==0
 plate=Image.new('RGBA',(w,h),'#233b50');plate.alpha_composite(Image.fromarray(rgba));plate=plate.convert('RGB').resize((360,640));sheet.paste(plate,((n%4)*360,0));sheet.paste(plate.resize((360,640)),((n%4)*360,640))
 results.append({'actor':name,'sourceSha256':hashlib.sha256((SOURCE/f'{name}.png').read_bytes()).hexdigest(),'derivedSha256':hashlib.sha256(target.read_bytes()).hexdigest(),'path':str(target.relative_to(ROOT)),'alphaOnly':True,'RGBExactlyPreserved':True,'opaqueFraction':float((alpha>0).mean()),'method':'manual silhouette guide + colored inner seeds and protected face + 3 iteration GrabCut; no generative fill, no repaint or face deformation','guide':GUIDES[name],'faceProtectedPolygon':PROTECT[name]})
(ROOT/'tools/mv_extra/cache/cutout-review.jpg').parent.mkdir(exist_ok=True,parents=True);sheet.crop((0,0,1440,640)).save(ROOT/'tools/mv_extra/cache/cutout-review.jpg');(OUT/'manifest.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
print('Four alpha-only cutouts generated; dark-background visual review required')
