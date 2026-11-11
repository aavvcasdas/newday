import React from 'react';
import { registerRoot, Composition } from 'remotion';
import { UniversalComposition } from './UniversalComposition.jsx';

const DEFAULT_PROPS = {
  mode: 'lyric-mv',
  compositionId: 'UniversalStage',
  title: 'Dynamic Stage Preview',
  width: 1920,
  height: 1080,
  logicalWidth: 1280,
  logicalHeight: 720,
  fps: 30,
  duration: 4,
  durationInFrames: 120,
  beatConfig: { bpm: 120, offset: 0, beatsPerBar: 4 },
  cues: [{ start: 0, end: 3.8, text: '动态舞台预览' }],
  screens: [{ start: 0, end: 3.8, text: '动态舞台预览' }],
  shots: [
    {
      id: 'PREVIEW_01',
      start: 0,
      end: 4,
      framing: 'wide',
      setSpec: { id: 'river_gate' },
      actors: [{ pose: 'wave', move: 'bounce', x: 560, y: 600, u: 38 }],
      stageTriggers: [{ kind: 'open_gate', at: 0.6, duration: 1.2, to: 0.85 }],
    },
  ],
  events: [],
};

registerRoot(() => (
  <Composition
    id="UniversalStage"
    component={UniversalComposition}
    defaultProps={DEFAULT_PROPS}
    width={1920}
    height={1080}
    fps={30}
    durationInFrames={120}
    calculateMetadata={({ props }) => ({
      width: props.width || 1920,
      height: props.height || 1080,
      fps: props.fps || 30,
      durationInFrames: Math.max(1, props.durationInFrames || Math.ceil((props.duration || 4) * (props.fps || 30))),
    })}
  />
));
