import React, { useEffect, useState } from 'react';
import { AbsoluteFill, Audio, continueRender, delayRender, useCurrentFrame, useVideoConfig } from 'remotion';
import { evaluateRemotionFrameState } from './frame_evaluator.mjs';
import { WorldCamera } from './components/WorldCamera.jsx';
import { StageSetView } from './components/StageSetView.jsx';
import { RiggedCharacter } from './components/RiggedCharacter.jsx';
import { InteractivePropsLayer } from './components/InteractivePropsLayer.jsx';
import { TransitionOverlay } from './components/TransitionOverlay.jsx';
import { LyricAndSubtitleLayer } from './components/LyricAndSubtitleLayer.jsx';

export { evaluateRemotionFrameState };

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
    const face = new FontFace('NewdayNoto', `url(${props.fontUrl})`);
    face
      .load()
      .then((loaded) => {
        document.fonts.add(loaded);
        finish();
      })
      .catch(() => {
        finish();
      });
  }, [fontHandle, props.fontUrl]);

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
