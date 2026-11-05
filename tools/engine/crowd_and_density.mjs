// crowd_and_density.mjs — 开场同屏上限 + 每镜动作密度（通用引擎，与单集解耦）
// 第 0 帧只留「双人 + 顶部钩子横幅 + 至多 1 件主道具」。
// 身份铭牌、戳章、配套物必须分时入场。每镜须有词点接触，并有姿态变化或步态走位。
// assertShotDensity仅用于无directorVersion的旧spec；新版directorVersion=1走director_contract。
// 不改 Day0–Day10 渲染器；那些集不走 validateSpec。

export const FRAME0_CUTOFF = 0.35;
export const PLATES_MIN_AT = 0.55;
export const PLATES_DEFAULT_AT = 0.85;
export const EXTRA_PROP_MIN_AT = 0.9;

/** 无实测轴时的保守入场时刻：fromLine>=2 不可能落在第 0 帧（第 1 句必先发声）。 */
export function declaredEnterAt(ref, fallback = 0) {
  if (!ref || typeof ref !== 'object') return fallback;
  if (Number.isFinite(ref.enterAt)) return ref.enterAt;
  if (Number.isInteger(ref.fromLine) && ref.fromLine > 1) return EXTRA_PROP_MIN_AT;
  return fallback;
}

export function frame0StaticProps(spec) {
  const opener = spec?.opener || {};
  const foreground = (opener.foregroundProps || []).filter((p) => declaredEnterAt(p, 0) < FRAME0_CUTOFF);
  const companions = (spec?.shots?.[0]?.companionProps || []).filter((p) => declaredEnterAt(p, 0) < FRAME0_CUTOFF);
  return { foreground, companions, total: foreground.length + companions.length };
}

/** 开场第 0 帧去拥挤。超员直接抛错，不靠渲染期偷偷藏道具。 */
export function assertOpenerUncrowded(spec) {
  const opener = spec?.opener;
  if (!opener) throw new Error('spec.opener 缺失');
  const platesAt = opener.platesAt ?? PLATES_DEFAULT_AT;
  if (!(platesAt >= PLATES_MIN_AT)) {
    throw new Error(`开场身份铭牌入场 ${platesAt}s 过早，须 >= ${PLATES_MIN_AT}s，禁止与横幅同帧挤在第 0 帧`);
  }
  const { foreground, companions, total } = frame0StaticProps(spec);
  if (foreground.length > 1) {
    throw new Error(`开场第 0 帧前景道具 ${foreground.length} 件，最多 1 件主道具；其余须 enterAt>=${EXTRA_PROP_MIN_AT} 或 fromLine`);
  }
  if (total > 1) {
    throw new Error(`开场第 0 帧同屏静态道具 ${total} 件（前景 ${foreground.length} + 配套 ${companions.length}），须分时入场`);
  }
  if (opener.stampWord?.line === 1 && total >= 1) {
    throw new Error('戳章词在第 1 行时可能落在第 0 帧，不得再叠主道具；戳章改到第 2 行及以后，或去掉第 0 帧道具');
  }
  return { platesAt, frame0Props: total };
}

export function actorHasMotion(actor) {
  if (!actor || typeof actor !== 'object') return false;
  if (actor.walk && (actor.walk.from != null) && (actor.walk.to != null)) return true;
  if ((actor.poses || []).length || (actor.poseChanges || []).length) return true;
  return false;
}

/** 每镜：至少一个词点锁定接触 + 一次姿态变化或步态。反应镜也不退回站桩。 */
export function assertShotDensity(shot, where) {
  const actors = shot?.actors || shot?.actorsPlan || [];
  if (!actors.some(actorHasMotion)) {
    throw new Error(`${where} 缺少姿态变化或步态走位：禁止整镜站桩念稿`);
  }
  const interactions = shot?.interactions || [];
  if (!interactions.length) {
    throw new Error(`${where} 缺少词点互动：每镜至少一个接触事件（准备→接触→结果→反应）`);
  }
  interactions.forEach((it, j) => {
    const line = it.wordLine ?? shot.fromLine;
    if (!Number.isInteger(line) || typeof it.wordChar !== 'string' || it.wordChar.length !== 1) {
      throw new Error(`${where}.interactions[${j}] 必须锁定词点 wordLine + 单字 wordChar`);
    }
  });
  return true;
}
