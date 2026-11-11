// Remotion 入口：把页面源码里的 MVComp 原样注册成 Composition（照页面「搬回仓库出片」一节的写法）。
// 这里不改 site/ 下任何代码；音轨不走 <Audio>，由 render.mjs 在渲染后把原曲对齐混入（偏移 0）。
// 默认 props 就是页面的 SRT 卡点；render.mjs 会用 audio_sync.json 里按原曲实测拍点对齐后的 starts/ends 覆盖。
import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { MVComp, type MVProps } from './site/src/mv/MVComp';
import { FPS, SRT_ENDS, SRT_STARTS, VH, VW, makeTimeline } from './site/src/mv/timeline';

const Root: React.FC = () => (
  <Composition
    id="TonghuazhenMV"
    component={MVComp}
    width={VW}
    height={VH}
    fps={FPS}
    durationInFrames={makeTimeline().frames}
    defaultProps={{ starts: SRT_STARTS, ends: SRT_ENDS, audioSrc: null, audioOffset: 0, showLyrics: true } as MVProps}
    calculateMetadata={({ props }) => ({ durationInFrames: makeTimeline(props.starts, props.ends).frames })}
  />
);

registerRoot(Root);
