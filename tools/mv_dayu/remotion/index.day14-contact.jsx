import React from 'react';
import { registerRoot, Composition } from 'remotion';
import { Day14ContactStill } from './day14-contact.jsx';

registerRoot(() => (
  <Composition id="Day14Contact" component={Day14ContactStill} width={1920} height={1080} fps={30} durationInFrames={30} />
));
