import unittest,json,hashlib
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[3]
M=json.loads((ROOT/'assets/ai-girls/extra-guests/cutouts/manifest.json').read_text())
class MatteTests(unittest.TestCase):
 def test_all_four_true_rgba_and_transparent_corners(self):
  for a in M:
   im=Image.open(ROOT/a['path']);self.assertEqual(im.mode,'RGBA');x=np.asarray(im);self.assertTrue(all(x[y,z,3]==0 for y,z in[(0,0),(0,719),(1279,0),(1279,719)]))
 def test_entire_original_rgb_is_preserved(self):
  for a in M:
   src=np.asarray(Image.open(ROOT/f"assets/ai-girls/extra-guests/{a['actor']}.png").convert('RGB'));out=np.asarray(Image.open(ROOT/a['path']));self.assertTrue(np.array_equal(src,out[:,:,:3]),a['actor'])
 def test_face_protected_regions_remain_fully_opaque(self):
  for a in M:
   mask=Image.new('L',(720,1280));ImageDraw.Draw(mask).polygon(a['faceProtectedPolygon'],fill=255);out=np.asarray(Image.open(ROOT/a['path']));self.assertTrue(np.all(out[:,:,3][np.asarray(mask)>0]==255),a['actor'])
 def test_not_a_rectangular_white_card(self):
  for a in M:
   x=np.asarray(Image.open(ROOT/a['path']))[:,:,3];self.assertGreater(np.count_nonzero(x==0),x.size*.25);self.assertGreater(np.unique(np.count_nonzero(x,axis=1)).size,150)
 def test_original_and_derivative_hashes_match(self):
  for a in M:
   src=ROOT/f"assets/ai-girls/extra-guests/{a['actor']}.png";self.assertEqual(hashlib.sha256(src.read_bytes()).hexdigest(),a['sourceSha256']);self.assertEqual(hashlib.sha256((ROOT/a['path']).read_bytes()).hexdigest(),a['derivedSha256'])
 def test_no_generative_model_or_global_white_key(self):
  s=Path(__file__).with_name('prepare_guests.py').read_text();self.assertNotIn('inpaint(',s);self.assertNotIn('rembg',s);self.assertIn('grabCut',s);self.assertIn('PROTECT',s)
if __name__=='__main__':unittest.main(verbosity=2)
