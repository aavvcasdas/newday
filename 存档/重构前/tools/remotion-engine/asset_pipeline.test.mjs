// asset_pipeline.test.mjs — 回归测试：Remotion 素材链路不得「渲染成功但角色消失 / 被拉伸」
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startLocalAssetServer, buildAssetUrlMap, preflightRemotionAssets } from './render_cli.mjs';
import { ensureWalkRigAtlases, WALK_RIG_ATLAS_NAMES, DEFAULT_WALK_CACHE_DIR } from './walk_rig_builder.mjs';
import { evaluateCharacterMotion } from '../engine/character_motion.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('预烘步态/待机图集必须能经 /__walk_rigs__/ 取到（回归：22 张全部 404、角色整个消失）', async () => {
  const walkRigFiles = await ensureWalkRigAtlases(DEFAULT_WALK_CACHE_DIR);
  const { server, baseUrl } = await startLocalAssetServer(REPO_ROOT, DEFAULT_WALK_CACHE_DIR, { walkRigFiles });
  try {
    const map = buildAssetUrlMap(baseUrl, walkRigFiles);
    for (const name of WALK_RIG_ATLAS_NAMES) {
      const url = map[`atlas:${name}`];
      assert.ok(url, `${name} 未登记 URL`);
      const res = await fetch(url);
      assert.equal(res.status, 200, `${name} → HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      assert.equal(buf.readUInt32BE(16), 384 * 8, `${name} 应为 8 格宽 3072px`);
      assert.equal(buf.readUInt32BE(20), 416, `${name} 应为 416px 高`);
    }
  } finally {
    server.close();
  }
});

test('图集列数按「每张图集」解析：步态 8 格 / 表演 16 格 / *_cel 单格可在同一角色内混用', () => {
  const ctx = { line: 1, cues: [], beatGrid: null, shotStart: 0, setAnchors: { groundY: 600 }, events: [], actorIndex: 0 };
  const REAL = { claude_walk_2leg: 8, claude_idle_pet: 8, claude_firework_action: 16, claude_place_cel: 1 };
  const plans = [
    { characterId: 'claude', locomotion: 'walk', x: 300, y: 600, atlases: [{ at: 1.0, atlas: 'claude_firework_action' }] },
    { characterId: 'claude', x: 300, y: 600, atlas: 'claude_firework_action', atlases: [{ at: 1.0, atlas: 'claude_idle_pet' }] },
    { characterId: 'claude', x: 300, y: 600, atlas: 'claude_place_cel' },
  ];
  for (const plan of plans) {
    for (let t = 0; t < 2.4; t += 1 / 30) {
      const a = evaluateCharacterMotion(plan, t, ctx);
      assert.equal(a.atlasCols, REAL[a.atlas], `t=${t.toFixed(2)} ${a.atlas} 列数应为 ${REAL[a.atlas]}`);
      assert.ok(a.atlasFrame >= 0 && a.atlasFrame < REAL[a.atlas], `t=${t.toFixed(2)} ${a.atlas} 帧号 ${a.atlasFrame} 越界`);
      if (a.prevAtlas) {
        assert.equal(a.prevAtlasCols, REAL[a.prevAtlas], `prev ${a.prevAtlas} 列数应为 ${REAL[a.prevAtlas]}`);
        assert.ok(a.prevAtlasFrame < REAL[a.prevAtlas], `prev ${a.prevAtlas} 帧号越界`);
      }
    }
  }
});

test('素材预检：图集未登记或 404 必须在开渲前报错，不允许静默回退', async () => {
  const props = {
    mode: 'lyric-mv', fps: 10, duration: 1, durationInFrames: 10, cues: [], events: [],
    shots: [{ id: 'T1', start: 0, end: 1, setSpec: { id: 'river_gate' }, actors: [{ characterId: 'whale', atlas: 'whale_idle_side_pet', x: 560, y: 600 }] }],
    assetUrlMap: {},
  };
  await assert.rejects(() => preflightRemotionAssets(props), /未登记/);
  const { server, baseUrl } = await startLocalAssetServer(REPO_ROOT, DEFAULT_WALK_CACHE_DIR, { walkRigFiles: {} });
  try {
    props.assetUrlMap = { 'atlas:whale_idle_side_pet': `${baseUrl}/__walk_rigs__/definitely_missing.png` };
    await assert.rejects(() => preflightRemotionAssets(props), /HTTP 404/);
    const soft = await preflightRemotionAssets(props, { allowMissing: true });
    assert.equal(soft.problems.length, 1);
  } finally {
    server.close();
  }
});
