"""Restore pinned upstream bytes and derive alpha-only cutout; no generative edits, no source scripts executed."""
import argparse,base64,hashlib,json,subprocess
from pathlib import Path
import numpy as np
from PIL import Image,ImageFilter
ROOT=Path(__file__).resolve().parents[2];DIR=ROOT/'assets/ai-girls/doubao'
def sha(b):return hashlib.sha256(b).hexdigest()
def main():
    ap=argparse.ArgumentParser();ap.add_argument('--verify-only',action='store_true');args=ap.parse_args()
    manifest=json.loads((DIR/'source.json').read_text())
    for item in manifest['assets']:
        path=ROOT/item['path']
        if not path.exists():
            if args.verify_only:raise FileNotFoundError(path)
            raw=json.loads(subprocess.check_output(['gh','api',f"repos/{manifest['repository']}/git/blobs/{item['gitBlobSha1']}"]));b=base64.b64decode(raw['content'])
            assert hashlib.sha1(f'blob {len(b)}\0'.encode()+b).hexdigest()==item['gitBlobSha1'];assert sha(b)==item['sha256'];path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(b)
        assert sha(path.read_bytes())==item['sha256']
    if not args.verify_only:
        im=Image.open(DIR/'doubao-fullbody.jpg').convert('RGB');a=np.asarray(im).astype(int);bg=(a[:,:,2]-a[:,:,0]>18)&(a[:,:,1]-a[:,:,0]>8)&(a[:,:,2]>170);h,w=bg.shape;seen=np.zeros((h,w),bool)
        stack=[(x,y)for x in range(w)for y in[0,h-1]]+[(x,y)for y in range(h)for x in[0,w-1]]
        while stack:
            x,y=stack.pop()
            if x<0 or y<0 or x>=w or y>=h or seen[y,x]or not bg[y,x]:continue
            seen[y,x]=True;stack.extend([(x-1,y),(x+1,y),(x,y-1),(x,y+1)])
        alpha=Image.fromarray(np.where(seen,0,255).astype('uint8')).filter(ImageFilter.GaussianBlur(.5));out=im.convert('RGBA');out.putalpha(alpha);assert list(alpha.getbbox())==manifest['derived']['crop'];out.crop(alpha.getbbox()).save(DIR/'doubao-cutout.png')
    cut=Image.open(DIR/'doubao-cutout.png');source=Image.open(DIR/'doubao-fullbody.jpg').convert('RGB').crop(manifest['derived']['crop'])
    assert np.array_equal(np.asarray(cut)[:,:,:3],np.asarray(source)), 'Original RGB must be retained; alpha is the only pixel edit'
    assert sha((DIR/'doubao-cutout.png').read_bytes())==manifest['derived']['sha256'];print('PASS pinned bytes + alpha-only derivation; no new face')
if __name__=='__main__':main()
