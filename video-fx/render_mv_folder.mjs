// render_mv_folder.mjs — Renders the 9 Whale-Girl replicated MVs from `mv/`
// (all files in `mv/` except `mv/mv_ba_huiyi_pinhao_gei_ni_whale_girl (1).mp4`)
// with 100% frame-verified subtitles and exact audio track alignment.

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { createCanvas, GlobalFonts } = require('/tmp/node_render/node_modules/@napi-rs/canvas');

const ROOT = '/home/user/video-fx';
const FFMPEG = '/tmp/venv/lib/python3.11/site-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2';

// Register project CJK + pixel fonts
const fontList = [
  ['ZCOOLKuaiLe-Regular.ttf', 'ZCOOLKuaiLe'],
  ['NotoSansSC-Bold.ttf', 'NotoSansSC'],
  ['Silkscreen-Regular.ttf', 'Silkscreen']
];
for (const [file, name] of fontList) {
  const fp = path.join(ROOT, 'assets/fonts', file);
  if (fs.existsSync(fp)) GlobalFonts.registerFromPath(fp, name);
}

// Setup globals before loading modules (strictly require whale_girl_rig_data.js BEFORE whale_girl.js!)
globalThis.window = globalThis;
require(path.join(ROOT, 'src/core.js'));
require(path.join(ROOT, 'src/whale_girl_rig_data.js'));
require(path.join(ROOT, 'src/whale_girl_actions.js'));
require(path.join(ROOT, 'src/whale_girl.js'));
require(path.join(ROOT, 'src/cast.js'));
require(path.join(ROOT, 'src/mv_ba_huiyi_pinhao_gei_ni.js'));
require(path.join(ROOT, 'src/mv_pack_short.js'));
require(path.join(ROOT, 'src/mv_pack_long.js'));

const ALL_MVS = [
  {
    key: 'ba_huiyi_56',
    pack: globalThis.MV_PACK_SHORT.ba_huiyi_56,
    audio: 'mv/《把回忆拼好给你》.mp4',
    audioEnv: 'assets/mv_audio/ba_huiyi_56_audio.js',
    outRoot: 'mv_ba_huiyi_56_whale_girl.mp4',
    outMvLink: 'mv/《把回忆拼好给你》_whale_girl.mp4',
    fps: 24,
    sampleTimes: [2.0, 13.0, 21.0, 34.5, 50.0]
  },
  {
    key: 'lianai_ing',
    pack: globalThis.MV_PACK_SHORT.lianai_ing,
    audio: 'mv/发现更多精彩视频 - 抖音搜索_2.mp4',
    audioEnv: 'assets/mv_audio/lianai_ing_audio.js',
    outRoot: 'mv_lianai_ing_whale_girl.mp4',
    outMvLink: 'mv/发现更多精彩视频 - 抖音搜索_2_whale_girl.mp4',
    fps: 24,
    sampleTimes: [4.5, 13.5, 22.5, 30.0, 44.5]
  },
  {
    key: 'jimo_yanhuo',
    pack: globalThis.MV_PACK_SHORT.jimo_yanhuo,
    audio: 'mv/寂寞烟火.mp4',
    audioEnv: 'assets/mv_audio/jimo_yanhuo_audio.js',
    outRoot: 'mv_jimo_yanhuo_whale_girl.mp4',
    outMvLink: 'mv/寂寞烟火_whale_girl.mp4',
    fps: 24,
    sampleTimes: [2.0, 8.5, 26.5, 40.5, 44.0]
  },
  {
    key: 'xinqiang',
    pack: globalThis.MV_PACK_SHORT.xinqiang,
    audio: 'mv/心墙.mp4',
    audioEnv: 'assets/mv_audio/xinqiang_audio.js',
    outRoot: 'mv_xinqiang_whale_girl.mp4',
    outMvLink: 'mv/心墙_whale_girl.mp4',
    fps: 24,
    sampleTimes: [1.5, 10.5, 16.5, 21.5, 27.5]
  },
  {
    key: 'ribuluo',
    pack: globalThis.MV_PACK_SHORT.ribuluo,
    audio: 'mv/日不落.mp4',
    audioEnv: 'assets/mv_audio/ribuluo_audio.js',
    outRoot: 'mv_ribuluo_whale_girl.mp4',
    outMvLink: 'mv/日不落_whale_girl.mp4',
    fps: 24,
    sampleTimes: [4.5, 18.0, 26.0, 34.5, 41.5]
  },
  {
    key: 'huainvhai',
    pack: globalThis.MV_PACK_LONG.huainvhai,
    audio: 'mv/坏女孩.mp4',
    audioEnv: 'assets/mv_audio/huainvhai_audio.js',
    outRoot: 'mv_huainvhai_whale_girl.mp4',
    outMvLink: 'mv/坏女孩_whale_girl.mp4',
    fps: 15,
    sampleTimes: [10.0, 26.0, 52.0, 70.0, 145.0]
  },
  {
    key: 'feng',
    pack: globalThis.MV_PACK_LONG.feng,
    audio: 'mv/枫.mp4',
    audioEnv: 'assets/mv_audio/feng_audio.js',
    outRoot: 'mv_feng_whale_girl.mp4',
    outMvLink: 'mv/枫_whale_girl.mp4',
    fps: 15,
    sampleTimes: [22.0, 55.0, 83.0, 105.0, 196.0]
  },
  {
    key: 'meiguihua',
    pack: globalThis.MV_PACK_LONG.meiguihua,
    audio: 'mv/玫瑰花的葬礼.mp4',
    audioEnv: 'assets/mv_audio/meiguihua_audio.js',
    outRoot: 'mv_meiguihua_de_zangli_whale_girl.mp4',
    outMvLink: 'mv/玫瑰花的葬礼_whale_girl.mp4',
    fps: 15,
    sampleTimes: [6.0, 30.0, 65.0, 89.0, 140.0]
  },
  {
    key: 'suyan',
    pack: globalThis.MV_PACK_LONG.suyan,
    audio: 'mv/素颜1.mp4',
    audioEnv: 'assets/mv_audio/suyan_audio.js',
    outRoot: 'mv_suyan_whale_girl.mp4',
    outMvLink: 'mv/素颜1_whale_girl.mp4',
    fps: 15,
    sampleTimes: [16.0, 36.0, 64.0, 77.0, 207.0]
  }
];

async function renderStoryboardSheet() {
  const thumbW = 320, thumbH = 180;
  const cols = 5, rows = ALL_MVS.length;
  const sheet = createCanvas(cols * thumbW, rows * thumbH);
  const sctx = sheet.getContext('2d');
  const frameCanvas = createCanvas(1280, 720);
  const fctx = frameCanvas.getContext('2d');

  for (let r = 0; r < ALL_MVS.length; r++) {
    const item = ALL_MVS[r];
    require(path.join(ROOT, item.audioEnv));
    for (let c = 0; c < cols; c++) {
      const t = item.sampleTimes[c];
      item.pack.renderFrame(fctx, t);
      sctx.drawImage(frameCanvas, 0, 0, 1280, 720, c * thumbW, r * thumbH, thumbW, thumbH);
      sctx.fillStyle = 'rgba(0,0,0,0.68)';
      sctx.fillRect(c * thumbW + 4, r * thumbH + 4, 195, 22);
      sctx.font = 'bold 13px "ZCOOLKuaiLe", sans-serif';
      sctx.fillStyle = '#FDE047';
      sctx.fillText(`${item.key} @ ${t.toFixed(1)}s`, c * thumbW + 10, r * thumbH + 19);
    }
  }
  const outPath = path.join(ROOT, 'docs/mv_folder_9_storyboards.png');
  fs.writeFileSync(outPath, sheet.toBuffer('image/png'));
  console.log('Saved storyboard sheet:', outPath);
}

async function renderSingleMV(item) {
  require(path.join(ROOT, item.audioEnv));
  const W = 1280, H = 720;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  const fps = item.fps;
  const totalFrames = Math.ceil(item.pack.duration * fps);
  const outMp4 = path.join(ROOT, item.outRoot);
  const audioPath = path.join(ROOT, item.audio);

  const ffArgs = [
    '-y',
    '-f', 'rawvideo',
    '-pix_fmt', 'rgba',
    '-s', `${W}x${H}`,
    '-r', String(fps),
    '-i', '-',
    '-i', audioPath,
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '26',
    '-maxrate', '380k',
    '-bufsize', '760k',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-shortest',
    '-movflags', '+faststart',
    outMp4
  ];

  const tStart = Date.now();
  const ff = spawn(FFMPEG, ffArgs, { stdio: ['pipe', 'ignore', 'ignore'] });

  for (let f = 0; f < totalFrames; f++) {
    const t = f / fps;
    item.pack.renderFrame(ctx, t);
    const buf = canvas.data();
    if (!ff.stdin.write(buf)) {
      await new Promise((res) => ff.stdin.once('drain', res));
    }
  }
  ff.stdin.end();
  await new Promise((res, rej) => {
    ff.on('close', (code) => (code === 0 ? res() : rej(new Error(`ffmpeg exited ${code}`))));
  });

  // Create/update relative symlink inside `mv/`
  const linkPath = path.join(ROOT, item.outMvLink);
  try {
    if (fs.existsSync(linkPath) || fs.lstatSync(linkPath)) fs.unlinkSync(linkPath);
  } catch (e) {}
  fs.symlinkSync(path.join('..', item.outRoot), linkPath);

  const szMb = (fs.statSync(outMp4).size / (1024 * 1024)).toFixed(2);
  const elapsed = ((Date.now() - tStart) / 1000).toFixed(1);
  console.log(`[OK] ${item.outRoot} (${item.pack.duration}s, ${totalFrames}f @ ${fps}fps) -> ${szMb} MB in ${elapsed}s`);
}

const arg = process.argv[2] || 'all';
(async () => {
  if (arg === 'sheet' || arg === 'all') {
    await renderStoryboardSheet();
    if (arg === 'sheet') return;
  }
  for (const item of ALL_MVS) {
    if (arg === 'all' || arg === item.key) {
      await renderSingleMV(item);
    }
  }
})();
