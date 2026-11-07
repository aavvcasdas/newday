// mv_adapter.mjs — 声明式音乐 MV 分镜配置 -> 通用 Remotion 引擎数据适配器
// 参考 lintsinghua/paint-mv-skills (song.js + chapters) 与 Win-Hao/music-mv (storyboard + character + lyrics)
// 彻底消除硬编码：任何新歌只需提供 mv.spec.mjs + 歌词时间轴即可驱动同一套动态舞台与角色引擎。

import path from 'node:path';
import { createBeatGrid } from '../engine/timeline_core.mjs';
import { isKnownStageSet } from '../场景/stage_sets.mjs';
import { isKnownCharacterAction, isKnownMoveStyle } from '../engine/character_motion.mjs';
import { CAMERA_PRESETS, validateCameraPlan } from '../engine/camera_plan.mjs';
import { STAGE_TRIGGER_KINDS } from '../互动元素/world_interactions.mjs';

export function validateMvSpec(spec) {
  if (!spec || typeof spec !== 'object') throw new Error('MV spec 必须为对象');
  if (!spec.title || typeof spec.title !== 'string') throw new Error('MV spec 缺少 title');
  if (!Array.isArray(spec.shots) || spec.shots.length === 0) throw new Error('MV spec.shots 不能为空');

  const beatGrid = createBeatGrid({
    bpm: spec.bpm ?? 116,
    offset: spec.beatOffset ?? 0,
    beatsPerBar: spec.beatsPerBar ?? 4,
  });

  const ids = new Set();
  let prevEnd = 0;

  spec.shots.forEach((shot, idx) => {
    const where = `mv.shots[${idx}](${shot?.id || ''})`;
    if (!shot.id || ids.has(shot.id)) throw new Error(`${where} 缺少唯一 id`);
    ids.add(shot.id);

    const start = shot.start != null ? shot.start : (shot.startBeat != null ? beatGrid.B(shot.startBeat) : prevEnd);
    const end = shot.end != null ? shot.end : (shot.endBeat != null ? beatGrid.B(shot.endBeat) : start + 4);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      throw new Error(`${where} 时间区间无效 (${start}..${end})`);
    }
    prevEnd = end;

    if ((shot.set || shot.stageSet) && !isKnownStageSet(shot.set || shot.stageSet)) {
      throw new Error(`${where} 引用未注册舞台场景 ${JSON.stringify(shot.set || shot.stageSet)}`);
    }
    validateCameraPlan({ ...shot, fromLine: 1, toLine: 1 });

    if (!Array.isArray(shot.actors) || shot.actors.length === 0) {
      if (!shot.allowEmptyStage) throw new Error(`${where} 缺少 actors（若为纯空镜须显式 allowEmptyStage: true）`);
    }
    for (const [aj, actor] of (shot.actors || []).entries()) {
      if (actor.action && !isKnownCharacterAction(actor.action)) {
        throw new Error(`${where}.actors[${aj}] 未知角色动作 ${actor.action}`);
      }
      if (actor.move && !isKnownMoveStyle(actor.move)) {
        throw new Error(`${where}.actors[${aj}] 未知律动风格 ${actor.move}`);
      }
    }
    for (const [tj, trig] of (shot.stageTriggers || []).entries()) {
      if (!STAGE_TRIGGER_KINDS.includes(trig?.kind)) {
        throw new Error(`${where}.stageTriggers[${tj}] 未知舞台机关 ${trig?.kind}`);
      }
    }
  });

  // MV 至少应切换多个场景（参考 music-mv storyboard.md 多场景流动原则）
  const uniqueSets = new Set(spec.shots.map((s) => (typeof (s.set || s.stageSet) === 'string' ? (s.set || s.stageSet) : (s.set?.id || s.stageSet?.id || 'underwater_study'))));
  if (spec.shots.length >= 4 && uniqueSets.size < 2) {
    throw new Error('多镜头 MV 不能锁死单一背景，至少应声明 2 个及以上不同场景 (shot.set)');
  }

  return true;
}

export function adaptMvToRemotionProps({
  spec,
  lyrics = null,
  audioPath = null,
  repoRoot = process.cwd(),
  assetUrlMap = {},
} = {}) {
  validateMvSpec(spec);

  const fps = spec.fps || 30;
  const beatConfig = {
    bpm: spec.bpm ?? 116,
    offset: spec.beatOffset ?? 0,
    beatsPerBar: spec.beatsPerBar ?? 4,
  };
  const beatGrid = createBeatGrid(beatConfig);

  let cursor = 0;
  const shots = spec.shots.map((shot, idx) => {
    const start = shot.start != null ? shot.start : (shot.startBeat != null ? beatGrid.B(shot.startBeat) : cursor);
    const end = shot.end != null ? shot.end : (shot.endBeat != null ? beatGrid.B(shot.endBeat) : start + 4);
    cursor = end;
    const rawSet = shot.set || shot.stageSet || spec.defaultSet || 'river_gate';
    const setSpec = typeof rawSet === 'string' ? { id: rawSet } : { ...rawSet };
    return {
      ...shot,
      index: idx,
      start,
      end,
      setSpec,
      cameraPresets: CAMERA_PRESETS,
    };
  });

  const resolvedLyrics = lyrics || spec.lyrics || [];
  const lastShotEnd = shots[shots.length - 1]?.end ?? 10;
  const duration = spec.duration ?? lastShotEnd;
  const durationInFrames = Math.max(1, Math.ceil(duration * fps));

  return {
    mode: 'lyric-mv',
    compositionId: spec.compositionId || 'DynamicLyricMV',
    title: spec.title,
    subtitle: spec.subtitle || '',
    width: spec.width || 1920,
    height: spec.height || 1080,
    logicalWidth: 1280,
    logicalHeight: 720,
    fps,
    duration,
    durationInFrames,
    beatConfig,
    audioSrc: audioPath ? path.resolve(repoRoot, audioPath) : (spec.audioPath ? path.resolve(repoRoot, spec.audioPath) : null),
    assetUrlMap,
    cues: resolvedLyrics,
    screens: resolvedLyrics,
    shots,
    events: spec.events || [],
  };
}
