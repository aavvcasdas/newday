"""真实编码负例，不只mock日志。依赖numpy和FFmpeg；无依赖则明确skip。"""
import json
import sys
import tempfile
import unittest
import subprocess
import wave
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'tools/验收'))
from media_common import binary
from check_subtitle_sync import check
from verify_episode import verify
import hashlib
try:
    import numpy as np
    FF=binary('ffmpeg');binary('ffprobe');READY=True
except (ImportError,ValueError):READY=False

@unittest.skipUnless(READY,'安装numpy/ffmpeg/ffprobe后运行编码集成测试')
class MediaTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp=tempfile.TemporaryDirectory();cls.folder=Path(cls.tmp.name)
        cls.voice=cls.folder/'voice.wav'
        t=np.arange(16000)/16000
        x=(np.sin(t*2*np.pi*440)*8000).astype('<i2')
        with wave.open(str(cls.voice),'wb') as w:
            w.setparams((1,2,16000,0,'NONE','not compressed'));w.writeframes(x.tobytes())
        cls.screens=[dict(line=1,text='呀',start=0,end=.35),dict(line=2,text='呢',start=.45,end=.8)]
    @classmethod
    def tearDownClass(cls):cls.tmp.cleanup()
    def make_video(self,name,mode,audio=None):
        out=self.folder/name
        proc=subprocess.Popen([FF,'-v','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s','1920x1080','-r','30','-i','-',
                               '-i',str(audio or self.voice),'-c:v','libx264','-preset','ultrafast','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-ac','2','-t','1',str(out)],stdin=subprocess.PIPE)
        try:
            for i in range(30):
                t=i/30;a=np.zeros((1080,1920,3),np.uint8)
                visible=mode=='stuck' or (mode=='good' and any(s['start']<=t<s['end'] for s in self.screens))
                if visible:
                    a[965:1055,650:1270]=(72,200,255);a[969:1051,654:1266]=(9,22,54)
                    x=870 if t<.4 or mode=='stuck' else 940
                    a[1000:1020,x:x+40]=255
                proc.stdin.write(a.tobytes())
        finally:proc.stdin.close()
        self.assertEqual(proc.wait(),0);return out
    def test_real_encoded_caption_presence_and_changes(self):
        result=check(self.make_video('good.mp4','good'),self.screens)
        self.assertTrue(result['passed'],result['errors'])
    def test_missing_captions_fail(self):
        result=check(self.make_video('missing.mp4','missing'),self.screens)
        self.assertFalse(result['passed'])
    def test_stuck_caption_and_gap_fail(self):
        result=check(self.make_video('stuck.mp4','stuck'),self.screens)
        self.assertFalse(result['passed'])

    def inputs(self):
        a=self.folder/'alignment.json';subs=self.folder/'subs.json';script=self.folder/'script.txt'
        a.write_text(json.dumps(dict(measured=True,source_sha256=hashlib.sha256(self.voice.read_bytes()).hexdigest(),source_duration_seconds=1,cues=[dict(text='呀',start=0,end=.35),dict(text='呢',start=.45,end=.8)])))
        subs.write_text(json.dumps(dict(measured=True,screens=self.screens)));script.write_text('呀\n呢\n')
        return a,subs,script
    def test_wrong_audio_cannot_pass_correlation(self):
        wrong=self.folder/'wrong.wav'
        with wave.open(str(wrong),'wb') as w:
            w.setparams((1,2,16000,0,'NONE','not compressed'));w.writeframes((np.sin(np.arange(16000)/16000*2*np.pi*880)*8000).astype('<i2').tobytes())
        a,s,script=self.inputs()
        with self.assertRaisesRegex(ValueError,'相关不足'):
            verify(self.make_video('wrong.mp4','good',wrong),self.voice,a,s,script)
    def test_zero_tail_is_rejected_on_encoded_media(self):
        a,s,script=self.inputs();data=json.loads(a.read_text());data['cues'][-1]['end']=1.0;a.write_text(json.dumps(data))
        with self.assertRaisesRegex(ValueError,'应在0.15'):
            verify(self.make_video('tail.mp4','good'),self.voice,a,s,script)

if __name__=='__main__':unittest.main()
