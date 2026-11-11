"""Offline ASR word evidence. Requires an explicitly restored Vosk model; never invents words/times."""
import argparse
import hashlib
import json
import subprocess
from pathlib import Path
from vosk import Model, KaldiRecognizer, SetLogLevel
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / '验收'))
from media_common import binary


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--voice', type=Path, required=True)
    ap.add_argument('--model', type=Path, required=True)
    ap.add_argument('--out', type=Path, required=True)
    args = ap.parse_args()
    SetLogLevel(-1)
    recognizer = KaldiRecognizer(Model(str(args.model)), 16000)
    recognizer.SetWords(True)
    ff = subprocess.Popen([binary('ffmpeg'), '-v', 'error', '-i', str(args.voice), '-ar', '16000', '-ac', '1', '-f', 's16le', '-'], stdout=subprocess.PIPE)
    results = []
    while data := ff.stdout.read(8000):
        if recognizer.AcceptWaveform(data):
            results.append(json.loads(recognizer.Result()))
    results.append(json.loads(recognizer.FinalResult()))
    if ff.wait() != 0:
        raise RuntimeError('audio decode failed')
    words = [w for segment in results for w in segment.get('result', [])]
    if not words:
        raise RuntimeError('ASR produced no words')
    out = {'method': 'Vosk actual offline acoustic recognition, unedited output',
           'source_sha256': hashlib.sha256(args.voice.read_bytes()).hexdigest(),
           'model_path': str(args.model), 'result': words, 'segments': results}
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(out, ensure_ascii=False, indent=2) + '\n')
    print(' '.join(w['word'] for w in words), flush=True)
    print('WORDS', len(words), flush=True)


if __name__ == '__main__':
    main()
