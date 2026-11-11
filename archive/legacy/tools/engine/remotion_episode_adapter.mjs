// remotion_episode_adapter.mjs — Day 系列单集分镜 -> Remotion 动态合成引擎数据桥接器
// 让任意 Day 系列单集（episode.spec.mjs / episode.production.spec.mjs + voice_alignment.json + subtitle_timing.json）
// 直接映射为通用 Remotion 引擎的声明式输入（inputProps），零硬编码驱动 Remotion 渲染与预览。

import path from 'node:path';
import { validateSpec, resolveWordTime } from './schema_validator.mjs';
import { cameraFor, CAMERA_PRESETS } from './camera_plan.mjs';
import { resolveShotSetSpec } from '../场景/stage_sets_core.mjs';
import { OPENER_END, PLATES_DEFAULT_AT } from './opener_director.mjs';

export function adaptEpisodeToRemotionProps({
  spec,
  alignment,
  subdata,
  voicePath = null,
  repoRoot = process.cwd(),
  planningPreview = false,
  autoStageProgression = undefined,
} = {}) {
  validateSpec(spec, {
    cueCount: alignment.cues.length,
    cues: alignment.cues,
    requireWordTimes: !planningPreview,
  });

  const cues = alignment.cues;
  const fps = 30;
  const duration = spec.preserveSourceDuration
    ? alignment.source_duration_seconds
    : cues[cues.length - 1].end + 0.24;
  const durationInFrames = Math.ceil(duration * fps);
  const effectiveSpec = autoStageProgression !== undefined ? { ...spec, autoStageProgression } : spec;

  const shots = spec.shots.map((shot, idx) => {
    const start = cues[shot.fromLine - 1].start;
    const end = shot.cameraIntent
      ? (cues[shot.toLine]?.start ?? cues[shot.toLine - 1].end)
      : cues[shot.toLine - 1].end;
    const setSpec = resolveShotSetSpec(shot, idx, effectiveSpec);
    const baseCam = cameraFor(shot, start, cues);

    return {
      ...shot,
      index: idx,
      start,
      end,
      setSpec,
      baseCamera: baseCam,
      cameraPresets: CAMERA_PRESETS,
    };
  });

  const events = [];
  for (const shot of shots) {
    for (const it of shot.interactions || []) {
      const line = it.wordLine ?? it.line ?? shot.fromLine;
      const { time, measured } = resolveWordTime(cues, line, it.wordChar || cues[line - 1].text[0]);
      const startLine = it.startLine ?? line;
      const contactFrame = Math.round(time * fps);
      let startFrame = Math.round(cues[Math.max(0, startLine - 1)].start * fps);
      let endFrame = Math.round(shot.end * fps) - 1;
      if (startFrame > contactFrame) startFrame = Math.max(0, contactFrame - 6);
      if (endFrame <= contactFrame) endFrame = contactFrame + 8;
      events.push({
        ...it,
        shotId: shot.id,
        measured,
        audio_sha256: alignment.source_sha256 || null,
        word_id: `L${String(line).padStart(2, '0')}:${it.wordChar || ''}`,
        startFrame,
        contactFrame,
        endFrame,
        params: {
          scale: it.scale ?? 1,
          land: it.land,
          at: it.at,
          text: it.text,
          slot: it.slot,
          span: it.span,
          toActor: it.toActor,
          title: it.title,
          sub: it.sub,
        },
      });
    }
  }

  const stamp = spec.opener?.stampWord
    ? {
        time: resolveWordTime(cues, spec.opener.stampWord.line, spec.opener.stampWord.char).time,
        text: spec.opener.stampText,
        at: spec.opener.stampAt || [640, 520],
      }
    : null;

  return {
    mode: 'day-episode',
    compositionId: `Day${spec.day}Episode`,
    title: spec.title || `Day${spec.day}`,
    speaker: spec.speaker || '本鲸',
    day: spec.day,
    width: 1920,
    height: 1080,
    logicalWidth: 1280,
    logicalHeight: 720,
    fps,
    duration,
    durationInFrames,
    audioSrc: voicePath ? path.resolve(repoRoot, voicePath) : null,
    planningPreview,
    directorVersion: spec.directorVersion ?? null,
    performanceVersion: spec.performanceVersion ?? null,
    opener: {
      ...spec.opener,
      openerEnd: OPENER_END,
      platesAt: spec.opener?.platesAt ?? PLATES_DEFAULT_AT,
      stamp,
    },
    cues,
    screens: subdata?.screens || [],
    shots,
    events,
  };
}
