"""Restore pinned assets via gh. Never substitute faces or silently overwrite nonmatching files."""
import argparse,base64,hashlib,json,subprocess
from pathlib import Path
import imageio_ffmpeg
ROOT=Path(__file__).resolve().parents[2];HERE=Path(__file__).resolve().parent
M=json.loads((HERE/'asset_manifest.json').read_text())
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--verify-only',action='store_true');verify=ap.parse_args().verify_only
 for a in M['assets']:
  p=ROOT/a['path']
  if not p.exists():
   assert not verify,('missing',a['path']);raw=json.loads(subprocess.check_output(['gh','api',f"repos/{a['repository']}/git/blobs/{a['gitBlobSha1']}"]));b=base64.b64decode(raw['content']);assert hashlib.sha1(f'blob {len(b)}\0'.encode()+b).hexdigest()==a['gitBlobSha1'];assert hashlib.sha256(b).hexdigest()==a['sha256'];p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(b)
  assert sha(p)==a['sha256'],f'Existing file differs; not overwriting {p}'
 source=ROOT/'《把回忆拼好给你》.mp4';b=source.read_bytes();assert hashlib.sha1(f'blob {len(b)}\0'.encode()+b).hexdigest()==M['sourceVideoGitBlobSha1']
 audio=ROOT/'assets/mv-extra/user_reference_audio.m4a';assert sha(audio)==M['sourceAudioSha256']
 wav=HERE/'cache/source48.wav'
 if not wav.exists():
  assert not verify,'missing source48.wav';subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(),'-v','error','-i',str(audio),'-ar','48000','-c:a','pcm_s24le','-y',str(wav)],check=True)
 assert sha(wav)==M['source48WavSha256']
 raw=subprocess.check_output([imageio_ffmpeg.get_ffmpeg_exe(),'-v','error','-i',str(audio),'-ac','1','-ar','22050','-f','f32le','-']);timing=json.loads((HERE/'timing.json').read_text());assert hashlib.sha256(raw).hexdigest()==timing['sourcePcmFloatSha256']
 print('Verified: pinned user video, full original AAC/PCM, five original guests, existing Doubao and font')
if __name__=='__main__':main()
