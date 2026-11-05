import {clamp, sourceTime, localTime, videoTime, canReview, stepTime, activeItem, timeLabel} from './timeline.mjs';

const $ = id => document.getElementById(id);
const player = $('player');
const notesKey = 'whale-mv-v2-review-notes';
let model, mode = 'sample', generation = 0, chosenShot;
const actions = ['走入 → 减速 → 停步', '俯身 → 滴水涟漪 → 起身', '站起 → 准备抬手',
  '抬手 → 云散开 → 海面露出', '走近 → 抱持 → 停稳', '连续性切镜 → 金片落下 → 入盒',
  '灰片滑落 → 落桶 → 结果停留', '靠近 → 停步 → 纸片转正', '背向 → 光迹升空 → 抵达',
  '烟花爆开 → 身体反应 → 停住', '绽放 → 下坠 → 余烬熄灭'];

function currentSource() {
  return mode === 'sample' ? sourceTime(player.currentTime, model) : clamp(player.currentTime, model.start, model.end);
}
function seek(source) {
  // Seek to the middle of the requested frame, avoiding cut-boundary float rounding.
  player.currentTime = videoTime(source + 0.5 / model.fps, mode, model);
  update();
}
async function play() {
  if (!model) return;
  if (currentSource() >= model.end - 0.02) seek(chosenShot && $('loop').checked ? chosenShot.start : model.start);
  try {
    await player.play();
    $('media-error').hidden = true;
  } catch (error) {
    $('media-error').hidden = false;
    $('media-error').textContent = '播放未能开始，请点击视频原生播放按钮，或下载试剪查看。';
  }
}
async function switchMode(next) {
  const source = model ? currentSource() : 0;
  const wasPlaying = !player.paused;
  player.pause();
  const id = ++generation;
  mode = next;
  for (const name of ['sample', 'source']) {
    const active = name === mode;
    $(`${name}-tab`).classList.toggle('active', active);
    $(`${name}-tab`).setAttribute('aria-pressed', String(active));
  }
  $('mode-label').textContent = mode === 'sample' ? '原音原速 · 连续节选' : '原片对照 · 限定同一时间段';
  player.setAttribute('aria-label', mode === 'sample' ? '当前 v2 连续有声试剪' : '参考原片同一时间段');
  $('media-error').hidden = true;
  // There is exactly one media element, so switching can never produce double audio.
  player.src = `/media/${mode}.mp4`;
  player.load();
  const ready = () => {
    if (id !== generation) return;
    player.currentTime = videoTime(source || model.start, mode, model);
    update();
    if (wasPlaying) void play();
  };
  player.addEventListener('loadedmetadata', ready, {once: true});
}
function update() {
  if (!model) return;
  const source = currentSource();
  $('local-time').textContent = timeLabel(localTime(source, model));
  $('source-time').textContent = timeLabel(source);
  const shot = activeItem(model.shots, Math.min(source, model.end - 1 / model.fps));
  if (shot) {
    const i = model.shots.indexOf(shot);
    $('shot-id').textContent = `${String(i + 1).padStart(2, '0')} / ${shot.id.toUpperCase()}`;
    $('shot-title').textContent = shot.title;
    $('shot-action').textContent = actions[i];
    $('shot-range').textContent = `${timeLabel(shot.start)}—${timeLabel(shot.end)}`;
    $('shots').querySelectorAll('button').forEach((button, index) => {
      const active = index === i;
      button.classList.toggle('active', active);
      button.setAttribute('aria-current', String(active));
    });
  }
  const cue = activeItem(model.cues, Math.min(source, model.end - 1 / model.fps));
  $('lyrics').querySelectorAll('button').forEach(button => {
    const active = Number(button.dataset.line) === cue?.line;
    button.classList.toggle('active', active);
    button.setAttribute('aria-current', String(active));
  });
}
function enforceRange() {
  if (!model || player.readyState < 1) return;
  const min = mode === 'sample' ? 0 : model.start;
  const max = mode === 'sample' ? model.duration : model.end;
  if (player.currentTime < min - 0.005) player.currentTime = min;
  // Native controls on the source file must not silently play the rest of the video.
  if (player.currentTime >= max - 0.015) {
    if ($('loop').checked && chosenShot) {
      player.currentTime = videoTime(chosenShot.start, mode, model);
      void play();
    } else {
      player.pause();
      if (player.currentTime > max) player.currentTime = max - 0.5 / model.fps;
    }
  } else if ($('loop').checked && chosenShot && currentSource() >= chosenShot.end - 0.015) {
    player.currentTime = videoTime(chosenShot.start, mode, model);
  }
  update();
}
function step(frames) {
  if (!model || player.readyState < 1) return;
  player.pause();
  player.currentTime = stepTime(player.currentTime, frames, mode, model);
  update();
}
$('sample-tab').onclick = () => model && mode !== 'sample' && switchMode('sample');
$('source-tab').onclick = () => model && mode !== 'source' && switchMode('source');
$('previous').onclick = () => step(-1);
$('next').onclick = () => step(1);
$('play').onclick = () => player.paused ? play() : player.pause();
player.addEventListener('play', () => { $('play').textContent = '暂停'; });
player.addEventListener('pause', () => { $('play').textContent = '播放'; });
player.addEventListener('error', () => { $('media-error').hidden = false; });
player.addEventListener('timeupdate', enforceRange);
player.addEventListener('seeked', enforceRange);
player.addEventListener('ended', () => {
  if ($('loop').checked && chosenShot) { seek(chosenShot.start); void play(); }
});
$('loop').onchange = () => {
  chosenShot = activeItem(model.shots, Math.min(currentSource(), model.end - 1 / model.fps));
};
document.addEventListener('keydown', event => {
  if (/INPUT|TEXTAREA|BUTTON|VIDEO/.test(event.target.tagName) || event.target.isContentEditable || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.key === 'ArrowLeft') { event.preventDefault(); step(-1); }
  if (event.key === 'ArrowRight') { event.preventDefault(); step(1); }
  if (event.code === 'Space') { event.preventDefault(); player.paused ? void play() : player.pause(); }
});
const sheets = {
  cast: ['当前项目七位形象与透明素材盘点', '沿用现有角色素材；Gemini、Kimi 仅完成素材准备，未在本段出场。点击查看原图。'],
  storyboard: ['试剪实际执行的十一镜分镜', '来自当前 19.8 秒试剪的 11 个镜头；不是全片分镜完成证明。点击查看原图。'],
  phases: ['编码后动作相位对照', '来自实际 MP4 的编码后抽帧；静帧不能代替连续动作及真人听审。点击查看原图。'],
};
document.querySelectorAll('[data-image]').forEach(button => {
  button.onclick = () => {
    document.querySelectorAll('[data-image]').forEach(b => {
      b.classList.toggle('active', b === button);
      b.setAttribute('aria-pressed', String(b === button));
    });
    const key = button.dataset.image;
    $('sheet').src = `/media/${key}.jpg`;
    $('sheet-link').href = `/media/${key}.jpg`;
    $('sheet').alt = sheets[key][0];
    $('sheet-caption').textContent = sheets[key][1];
  };
});
try { $('notes').value = localStorage.getItem(notesKey) || ''; if ($('notes').value) $('saved').textContent = '已恢复本地便签'; }
catch { $('saved').textContent = '浏览器禁用本地存储，可导出便签'; }
$('notes').oninput = () => {
  try { localStorage.setItem(notesKey, $('notes').value); $('saved').textContent = '已保存于此浏览器 · 未上传'; }
  catch { $('saved').textContent = '无法保存，请导出便签'; }
};
$('export-notes').onclick = () => {
  const text = `把回忆拼好给你 · v2 审片便签\n样片 SHA256: ${model?.sampleSha256 || '未加载'}\n原片时间: ${$('source-time').textContent}\n这份便签不代表制作方向已批准。\n\n${$('notes').value}\n`;
  const url = URL.createObjectURL(new Blob([text], {type: 'text/plain;charset=utf-8'}));
  const link = document.createElement('a'); link.href = url; link.download = '番外MV_审片便签.txt'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
async function init() {
  try {
    const response = await fetch('/api/review');
    if (!response.ok) throw new Error('制作记录加载失败');
    model = await response.json();
    $('axis-note').textContent = model.timingNote;
    $('source-tab').disabled = !model.sourceAvailable;
    if (!model.sampleAvailable) throw new Error('试剪文件缺失，请按 README 恢复指定媒体');
    model.shots.forEach((shot, i) => {
      const button = document.createElement('button');
      button.textContent = String(i + 1).padStart(2, '0');
      button.title = `${shot.title} · 原片 ${timeLabel(shot.start)}`;
      button.setAttribute('aria-label', `定位第 ${i + 1} 镜：${shot.title}`);
      button.onclick = () => { chosenShot = shot; seek(shot.start); };
      $('shots').append(button);
    });
    model.cues.forEach(cue => {
      const button = document.createElement('button');
      button.className = `lyric-row ${cue.implemented ? 'implemented' : 'planned'}`;
      button.dataset.line = cue.line;
      button.disabled = !canReview(cue, model);
      button.title = cue.implemented ? '点击定位到试剪中的这一句' : '仅规划：当前试剪中没有这一句的画面';
      const number = document.createElement('span'); number.className = 'number'; number.textContent = String(cue.line).padStart(2, '0');
      const content = document.createElement('span');
      const words = document.createElement('span'); words.className = 'words'; words.textContent = cue.text;
      const status = document.createElement('small'); status.textContent = `${timeLabel(cue.start)} · ${cue.implemented ? '已执行 / 待看听' : '仅规划 / 尚未制作'}`;
      content.append(words, status); button.append(number, content);
      button.onclick = () => { chosenShot = activeItem(model.shots, cue.start); seek(cue.start); };
      $('lyrics').append(button);
    });
    await switchMode('sample');
  } catch (error) {
    $('load-error').hidden = false;
    $('load-error').textContent = `${error.message}。不会回退到已否决的旧成片。`;
    for (const id of ['sample-tab', 'source-tab', 'play', 'previous', 'next', 'loop']) $(id).disabled = true;
  }
}
void init();
