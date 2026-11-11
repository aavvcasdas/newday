import React, { useEffect, useState } from 'react';
import { AbsoluteFill, Audio, cancelRender, continueRender, delayRender, useCurrentFrame, useVideoConfig } from 'remotion';
import { evaluateRemotionFrameState } from './frame_evaluator.mjs';
import { WorldCamera } from './components/WorldCamera.jsx';
import { StageSetView } from './components/StageSetView.jsx';
import { RiggedCharacter } from './components/RiggedCharacter.jsx';
import { InteractivePropsLayer } from './components/InteractivePropsLayer.jsx';
import { TransitionOverlay } from './components/TransitionOverlay.jsx';
import { LyricAndSubtitleLayer } from './components/LyricAndSubtitleLayer.jsx';

export { evaluateRemotionFrameState };

// SVG <image href> 不受 Remotion 的 delayRender 管控：不预载的话
// 「404 → 角色静默消失」和「位图未解码就截图 → 并发分片里闪空」都不会报任何错。
// 模块级缓存让已解码位图常驻，后续每一帧的 <image> 直接命中内存缓存。
const PRELOADED_IMAGES = new Map();
function preloadImage(url) {
  if (!PRELOADED_IMAGES.has(url)) {
    PRELOADED_IMAGES.set(
      url,
      new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const done = () => resolve(img);
          if (typeof img.decode === 'function') img.decode().then(done, done);
          else done();
        };
        img.onerror = () => reject(new Error(`角色素材加载失败（404 或文件损坏）：${url}`));
        img.src = url;
      })
    );
  }
  return PRELOADED_IMAGES.get(url);
}
const NO_URLS = [];

export function UniversalComposition(props) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;

  const [fontHandle] = useState(() => (props.fontUrl && typeof FontFace !== 'undefined' ? delayRender('load-cjk-font') : null));

  useEffect(() => {
    if (!fontHandle) return;
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        continueRender(fontHandle);
      }
    };
    const face = new FontFace('NewdayNoto', `url("${props.fontUrl}")`);
    face
      .load()
      .then((loaded) => {
        document.fonts.add(loaded);
        finish();
      })
      .catch((err) => {
        // 字体失败不能静默放行：无头 Chromium 里没有任何 CJK 字体，放行 = 全片豆腐块
        cancelRender(new Error(`中文字体加载失败：${props.fontUrl}（${err?.message || err}）`));
      });
  }, [fontHandle, props.fontUrl]);

  const preloadUrls = props.preloadUrls || NO_URLS;
  const [assetHandle] = useState(() => (preloadUrls.length && typeof Image !== 'undefined' ? delayRender('preload-character-assets') : null));

  useEffect(() => {
    if (assetHandle === null) return;
    Promise.all(preloadUrls.map(preloadImage)).then(
      () => continueRender(assetHandle),
      (err) => cancelRender(err)
    );
  }, [assetHandle]);

  const state = evaluateRemotionFrameState(props, t);
  const outputScale = width / (props.logicalWidth || 1280);
  const deskShake = state.setState.reactive?.deskShake || 0;

  return (
    <AbsoluteFill style={{ backgroundColor: '#071526', fontFamily: 'NewdayNoto, Noto Sans CJK SC, sans-serif' }}>
      {props.audioUrl && !props.externalAudioMux ? <Audio src={props.audioUrl} /> : null}

      <WorldCamera
        camera={state.camera}
        logicalWidth={props.logicalWidth || 1280}
        logicalHeight={props.logicalHeight || 720}
        outputScale={outputScale}
        shakeX={deskShake * 0.3}
        shakeY={Math.abs(deskShake) * 0.16}
      >
        <StageSetView
          setState={state.setState}
          worldState={state.worldState}
          camera={state.camera}
          t={t}
        />

        <InteractivePropsLayer
          layer="back"
          shot={state.shot}
          worldState={state.worldState}
          actors={state.actors}
          events={props.events || []}
          cues={props.cues || []}
          t={t}
          fps={fps}
        />

        {state.actors.map((actor, idx) => (
          <RiggedCharacter
            key={`actor-${idx}`}
            actor={actor}
            assetUrlMap={props.assetUrlMap || {}}
            t={t}
            showNamePlate={props.mode === 'day-episode' && !(state.isOpener && props.performanceVersion === 2)}
          />
        ))}

        <InteractivePropsLayer
          layer="front"
          shot={state.shot}
          worldState={state.worldState}
          actors={state.actors}
          events={props.events || []}
          cues={props.cues || []}
          t={t}
          fps={fps}
          openerStamp={props.opener?.stamp || null}
          isOpener={state.isOpener}
        />
      </WorldCamera>

      <TransitionOverlay
        transitionState={state.transitionState}
        width={width}
        height={height}
      />

      <LyricAndSubtitleLayer
        mode={props.mode || 'day-episode'}
        screens={props.screens || []}
        cues={props.cues || []}
        speaker={props.speaker || '本鲸'}
        opener={props.opener || null}
        complianceBadge={null}
        hideSubtitles={Boolean(props.hideSubtitles)}
        planningPreview={Boolean(props.planningPreview)}
        t={t}
      />
    </AbsoluteFill>
  );
}
