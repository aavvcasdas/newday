import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LYRIC_CHOREOGRAPHY } from './lyric_choreography.js';
import { SUBS } from './timeline.js';
import { SHOTS } from './scenes.js';
import { MV_CAST, MV_CAST_IDS, MV_SIGNATURE_ACTIONS } from '../../../tools/engine/mv_cast_registry.mjs';

const HERE = new URL('.', import.meta.url);
const sceneSource = readFileSync(new URL('./scenes.js', HERE), 'utf8');
const castSource = readFileSync(new URL('./cast.js', HERE), 'utf8');
const sceneNames = new Set(SHOTS.map(([, , handler]) => handler.name));
const cueById = new Map(SUBS.map((cue) => [cue.id, cue]));
const mapSceneNames = (record) => record.scene.split('+');

function sceneBlock(name, nextName) {
  const start = sceneSource.indexOf(`function ${name}(`);
  const end = sceneSource.indexOf(`\nfunction ${nextName}(`, start);
  assert.notEqual(start, -1, `missing scene function ${name}`);
  assert.notEqual(end, -1, `missing following scene function ${nextName}`);
  return sceneSource.slice(start, end);
}

test('all 50 lyric cues have a complete, exact mapping to rendered scenes', () => {
  assert.equal(SUBS.length, 50);
  assert.deepEqual(Object.keys(LYRIC_CHOREOGRAPHY).sort(), SUBS.map(({ id }) => id).sort());
  assert.equal(new Set(SUBS.map(({ id }) => id)).size, SUBS.length, 'lyric ids must be unique');

  for (const cue of SUBS) {
    const row = LYRIC_CHOREOGRAPHY[cue.id];
    assert.ok(row, `${cue.id} has no choreography row`);
    assert.ok(row.movement.trim(), `${cue.id} needs an observable movement/action`);
    assert.ok(row.props.trim(), `${cue.id} needs an on-screen prop or environment interaction`);
    assert.ok(Array.isArray(row.performers) && row.performers.length, `${cue.id} needs an assigned performer`);
    for (const actor of row.performers) assert.ok(MV_CAST_IDS.includes(actor), `${cue.id}: unknown actor ${actor}`);
    assert.ok(row.performers.includes(cue.speaker), `${cue.id}: lyric speaker ${cue.speaker} is not in the mapped cast`);

    const overlapping = SHOTS
      .filter(([start, end]) => end > cue.t0 + 1e-6 && start < cue.t1 - 1e-6)
      .sort((a, b) => a[0] - b[0]);
    assert.ok(overlapping.length, `${cue.id} has no rendered shot`);
    const actualScenes = [...new Set(overlapping.map(([, , handler]) => handler.name))].sort();
    const declaredScenes = mapSceneNames(row).sort();
    assert.deepEqual(declaredScenes, actualScenes, `${cue.id}: map scenes must match the actual timeline scene handlers`);
    for (const name of declaredScenes) assert.ok(sceneNames.has(name), `${cue.id}: scene ${name} is not registered in SHOTS`);

    let coveredUntil = cue.t0;
    for (const [start, end] of overlapping) {
      if (end <= coveredUntil) continue;
      assert.ok(start <= coveredUntil + 1e-4, `${cue.id}: uncovered lyric interval at ${coveredUntil.toFixed(3)}s`);
      coveredUntil = Math.max(coveredUntil, end);
    }
    assert.ok(coveredUntil >= cue.t1 - 1e-4, `${cue.id}: scene coverage ends before the lyric cue`);

    assert.ok(['registry', 'custom'].includes(row.sourceKind), `${cue.id}: invalid action source kind`);
    if (row.sourceKind === 'custom') {
      assert.match(row.sourceAction, /^custom:[a-z0-9-]+$/, `${cue.id}: custom action needs a stable slug`);
    } else {
      const signature = MV_SIGNATURE_ACTIONS[row.sourceAction];
      const owners = Object.entries(MV_CAST).filter(([, cast]) => Object.values(cast.locomotion).includes(row.sourceAction)).map(([id]) => id);
      assert.ok(signature || owners.length, `${cue.id}: ${row.sourceAction} is not in the registered MV action/locomotion library`);
      if (signature) assert.ok(row.performers.includes(signature.actor), `${cue.id}: registered action actor ${signature.actor} is not cast`);
      for (const owner of owners) assert.ok(row.performers.includes(owner), `${cue.id}: registered locomotion actor ${owner} is not cast`);
    }
  }
});

test('identity and lyric-specific prop constraints remain locked', () => {
  assert.ok(LYRIC_CHOREOGRAPHY.L05.performers.includes('zai'), 'Zai performs the Peter Pan lyric');
  assert.ok(LYRIC_CHOREOGRAPHY.L06.performers.includes('zai'), 'Zai performs the Jack/harp lyric');
  assert.ok(LYRIC_CHOREOGRAPHY.L19.performers.includes('claude'));
  assert.ok(LYRIC_CHOREOGRAPHY.L19.performers.includes('doubao'));
  assert.ok(LYRIC_CHOREOGRAPHY.L20.performers.includes('claude'));

  const peter = sceneBlock('peterClocktower', 'beanstalkHarp');
  assert.doesNotMatch(peter, /drawTinyTiara|fb\.tri\(211,\s*99|fb\.tri\(207,\s*122|fb\.tri\(230,\s*122/,
    'Peter Pan identity must not be represented with an added leaf hat or paper wings');
  const harpCalls = [...sceneSource.matchAll(/role:\s*'harp'/g)];
  const jack = sceneBlock('beanstalkHarp', 'candyForest');
  assert.equal(harpCalls.length, 2, 'the literal harp accessory is only drawn in the Jack lyric scene');
  for (const call of harpCalls) assert.ok(jack.includes(call[0]), 'harp role leaked outside the Jack lyric scene');

  const spriteCalls = [...sceneSource.matchAll(/drawCastSprite\(fb,([\s\S]*?)\);/g)];
  for (const [, args] of spriteCalls) {
    const actorMatch = args.match(/,\s*'(whale|gpt|claude|doubao|gemini|kimi|qwen|zai)',\s*t(?:\s*,|\s*\))/);
    const roleMatch = args.match(/role:\s*'([^']+)'/);
    if (!actorMatch || !roleMatch) continue;
    if (roleMatch[1] === 'princess') assert.equal(actorMatch[1], 'claude', 'Claude is the only princess');
    if (actorMatch[1] === 'doubao') assert.notEqual(roleMatch[1], 'princess', 'Doubao remains Red Hood, never a princess');
  }

  const sleeping = sceneBlock('sleepingRoseTower', 'mermaidPalace');
  assert.match(sleeping, /pose:\s*'sleep'/, 'Sleeping Beauty must use the existing closed-eye sprite pose');
  assert.match(castSource, /pose === 'sleep' \? 'claude_front_1'/, 'sleep pose must use the baked closed-eye frame');
});
