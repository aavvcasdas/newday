import React from 'react';

const PALETTES = {
  whale: { hair: '#2558AA', hairHi: '#53AAE8', dress: '#1E2D52', apron: '#F8FBFF', tail: '#365284', skin: '#FFEAE0', eye: '#1F56B5', bow: '#4BAEE8' },
  doubao: { hair: '#5A3D36', hairHi: '#8C6258', dress: '#E67F68', apron: '#FFF4E8', tail: null, skin: '#FFECE2', eye: '#4B322C', bow: '#F4B860' },
  claude: { hair: '#C87D55', hairHi: '#E6A57E', dress: '#D97757', apron: '#FAF4EB', tail: null, skin: '#FFEDE3', eye: '#5C3A28', bow: '#E8B88A' },
  gemini: { hair: '#4A6CF7', hairHi: '#8B9EFF', dress: '#37499E', apron: '#F2F5FF', tail: null, skin: '#FFEBE2', eye: '#3B5BDB', bow: '#9C7CFA' },
  gpt: { hair: '#2E7D6B', hairHi: '#56B39D', dress: '#1F5C4E', apron: '#F2FBF8', tail: null, skin: '#FFECE3', eye: '#186452', bow: '#74D3AE' },
  kimi: { hair: '#3B4266', hairHi: '#6E78A8', dress: '#2C3354', apron: '#F4F6FC', tail: null, skin: '#FFEDE4', eye: '#364FC7', bow: '#91A7FF' },
  qwen: { hair: '#6741D9', hairHi: '#9775FA', dress: '#4C2E9E', apron: '#F8F4FF', tail: null, skin: '#FFECE4', eye: '#5F3DC4', bow: '#B197FC' },
  zai: { hair: '#2B6CB0', hairHi: '#63B3ED', dress: '#2A4365', apron: '#F5FAFF', tail: null, skin: '#FFEDE3', eye: '#2B6CB0', bow: '#63B3ED' },
};

const deg = (rad) => ((rad || 0) * 180) / Math.PI;

function EmoteBadge({ emote, t = 0 }) {
  if (!emote) return null;
  const bob = Math.sin(t * 5.2) * 4;
  return (
    <g transform={`translate(56, ${-218 + bob.toFixed(1)})`}>
      {emote === 'sparkle' && (
        <path d="M0,-14 L4,-4 L14,0 L4,4 L0,14 L-4,4 L-14,0 L-4,-4 Z" fill="#FFE066" stroke="#D99B26" strokeWidth={1.5} />
      )}
      {emote === 'note' && (
        <text x={0} y={0} fontSize={26} fontWeight="800" fill="#74C0FC">♪</text>
      )}
      {emote === 'exclaim' && (
        <text x={0} y={0} fontSize={28} fontWeight="900" fill="#FF6B6B">!</text>
      )}
      {emote === 'question' && (
        <text x={0} y={0} fontSize={26} fontWeight="900" fill="#FFD43B">?</text>
      )}
      {emote === 'sweat' && (
        <path d="M0,-12 C6,-2 8,6 0,11 C-8,6 -6,-2 0,-12 Z" fill="#74C0FC" />
      )}
      {emote === 'sleep' && (
        <text x={0} y={0} fontSize={20} fontWeight="800" fill="#A5D8FF">Zzz</text>
      )}
    </g>
  );
}

function ArticulatedPuppetSvg({ actor, heightPx, t }) {
  const key = actor.characterId || actor.assetId || 'whale';
  const pal = PALETTES[key] || PALETTES.whale;
  const bones = actor.anim?.bones || {};
  const scale = heightPx / 240;
  const eyeKind = actor.mood?.eye || 'open';

  return (
    <g transform={`scale(${scale.toFixed(4)})`}>
      {/* 后发与鲸尾（滞后次级运动） */}
      {pal.tail && (
        <g transform={`translate(18, -58) rotate(${deg(bones.tail?.rot).toFixed(2)})`}>
          <path d="M0,0 C28,4 48,-12 58,-28 C64,-16 60,4 46,14 C58,20 62,34 50,40 C34,36 18,18 0,12 Z" fill={pal.tail} stroke="#14213D" strokeWidth={3} />
        </g>
      )}
      <g transform={`translate(-24, -158) rotate(${deg(bones.hairL?.rot).toFixed(2)})`}>
        <path d="M0,0 C-22,30 -28,78 -16,112 C-4,106 6,78 8,24 Z" fill={pal.hair} stroke="#14213D" strokeWidth={2.5} />
      </g>
      <g transform={`translate(24, -158) rotate(${deg(bones.hairR?.rot).toFixed(2)})`}>
        <path d="M0,0 C22,30 28,78 16,112 C4,106 -6,78 -8,24 Z" fill={pal.hair} stroke="#14213D" strokeWidth={2.5} />
      </g>

      {/* 双腿（迈步摆动并贴合地面线 y=0） */}
      <g transform={`translate(-14, -56) rotate(${deg(bones.legL?.rot).toFixed(2)})`}>
        <rect x={-7} y={0} width={14} height={44} rx={7} fill="#FFF5F0" stroke="#14213D" strokeWidth={2.5} />
        <ellipse cx={-2} cy={48} rx={11} ry={6.5} fill="#18233C" />
      </g>
      <g transform={`translate(14, -56) rotate(${deg(bones.legR?.rot).toFixed(2)})`}>
        <rect x={-7} y={0} width={14} height={44} rx={7} fill="#FFF5F0" stroke="#14213D" strokeWidth={2.5} />
        <ellipse cx={2} cy={48} rx={11} ry={6.5} fill="#18233C" />
      </g>

      {/* 脊柱躯干 + 左臂 + 右臂 + 头部 */}
      <g transform={`translate(0, -58) rotate(${deg(bones.spine?.rot).toFixed(2)})`}>
        {/* 左臂 */}
        <g transform={`translate(-28, -58) rotate(${deg(bones.armL?.rot).toFixed(2)})`}>
          <rect x={-8} y={0} width={15} height={48} rx={7.5} fill={pal.dress} stroke="#14213D" strokeWidth={2.5} />
          <circle cx={0} cy={52} r={7.5} fill={pal.skin} stroke="#14213D" strokeWidth={2} />
        </g>

        {/* 裙装与围裙躯干 */}
        <path d="M-26,-64 L26,-64 L38,8 L-38,8 Z" fill={pal.dress} stroke="#14213D" strokeWidth={3} strokeLinejoin="round" />
        <path d="M-18,-56 L18,-56 L24,4 L-24,4 Z" fill={pal.apron} stroke="#14213D" strokeWidth={2} />
        <polygon points="0,-46 -11,-54 -11,-38" fill={pal.bow} />
        <polygon points="0,-46 11,-54 11,-38" fill={pal.bow} />

        {/* 右臂（主手势臂） */}
        <g transform={`translate(28, -58) rotate(${deg(bones.armR?.rot).toFixed(2)})`}>
          <rect x={-7} y={0} width={15} height={48} rx={7.5} fill={pal.dress} stroke="#14213D" strokeWidth={2.5} />
          <circle cx={0} cy={52} r={7.5} fill={pal.skin} stroke="#14213D" strokeWidth={2} />
        </g>

        {/* 头部与表情 */}
        <g transform={`translate(${(bones.head?.dx || 0) * 0.25}, ${-72 + (bones.head?.dy || 0) * 0.25}) rotate(${deg(bones.head?.rot).toFixed(2)})`}>
          <circle cx={0} cy={-38} r={44} fill={pal.hair} stroke="#14213D" strokeWidth={3} />
          <ellipse cx={0} cy={-32} rx={36} ry={33} fill={pal.skin} stroke="#14213D" strokeWidth={2.8} />
          {/* 刘海与呆毛 */}
          <path d="M-38,-42 C-24,-72 24,-72 38,-42 C24,-50 8,-44 0,-36 C-10,-46 -24,-50 -38,-42 Z" fill={pal.hairHi} stroke="#14213D" strokeWidth={2.4} />
          <path d="M0,-78 C8,-98 22,-96 16,-80" fill="none" stroke={pal.hairHi} strokeWidth={4} strokeLinecap="round" />

          {/* 双眼（支持 soft_blink 眨眼过渡，绝不画肤色假矩形） */}
          {eyeKind === 'soft_blink' || actor.pose === 'ciallo_wink' ? (
            <g stroke="#14213D" strokeWidth={3} fill="none" strokeLinecap="round">
              <path d="M-21,-30 Q-14,-36 -7,-30" />
              <path d="M7,-30 Q14,-36 21,-30" />
            </g>
          ) : (
            <g>
              <ellipse cx={-14} cy={-30} rx={6.5} ry={8} fill={pal.eye} />
              <circle cx={-16} cy={-33} r={2.4} fill="#FFFFFF" />
              <ellipse cx={14} cy={-30} rx={6.5} ry={8} fill={pal.eye} />
              <circle cx={12} cy={-33} r={2.4} fill="#FFFFFF" />
            </g>
          )}
          {/* 腮红与嘴型 */}
          <ellipse cx={-23} cy={-20} rx={5.5} ry={3} fill="#FF8FA3" opacity={0.55} />
          <ellipse cx={23} cy={-20} rx={5.5} ry={3} fill="#FF8FA3" opacity={0.55} />
          {actor.pose === 'shock' || actor.pose === 'shock_petrify' ? (
            <ellipse cx={0} cy={-17} rx={4.5} ry={5.8} fill="#D96B78" stroke="#14213D" strokeWidth={2} />
          ) : (
            <path d="M-6,-19 Q0,-13 6,-19" fill="none" stroke="#14213D" strokeWidth={2.4} strokeLinecap="round" />
          )}
        </g>
      </g>
      <EmoteBadge emote={actor.emote} t={t} />
    </g>
  );
}

/**
 * RiggedCharacter — 统一角色动态渲染组件（同时支持高清立绘差分骨感变换与多关节 SVG 玩偶模式）
 */
export function RiggedCharacter({ actor, assetUrlMap = {}, t = 0, showNamePlate = false }) {
  if ((actor.opacity ?? 1) <= 0.01) return null;

  const heightPx = actor.assetId
    ? (actor.height || 340) * (actor.imageScale ?? 1)
    : 10.4 * (actor.u ?? 38);
  const widthPx = heightPx * 0.92;
  const dir = actor.flip ? -1 : 1;
  const sx = actor.sx ?? 1;
  const sy = actor.sy ?? 1;
  const leanDeg = deg(actor.lean || 0);

  const spriteKey = actor.assetId ? `actor:${actor.assetId}` : `pose:${actor.pose}`;
  const prevSpriteKey = !actor.assetId && actor.prevPose ? `pose:${actor.prevPose}` : null;
  const spriteUrl = assetUrlMap[spriteKey] || assetUrlMap[actor.pose] || assetUrlMap[actor.assetId] || null;
  const prevSpriteUrl = prevSpriteKey ? (assetUrlMap[prevSpriteKey] || assetUrlMap[actor.prevPose] || null) : null;

  return (
    <svg
      width={1280}
      height={720}
      viewBox="0 0 1280 720"
      style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none' }}
    >
      <g
        opacity={actor.opacity ?? 1}
        transform={`translate(${actor.x.toFixed(2)}, ${actor.y.toFixed(2)}) rotate(${leanDeg.toFixed(2)}) scale(${(dir * sx).toFixed(4)}, ${sy.toFixed(4)})`}
      >
        {spriteUrl && actor.renderMode !== 'puppet' ? (
          <g>
            {prevSpriteUrl && prevSpriteUrl !== spriteUrl && (actor.poseBlend ?? 1) < 0.99 && (
              <image
                href={prevSpriteUrl}
                x={-widthPx / 2}
                y={-heightPx}
                width={widthPx}
                height={heightPx}
                opacity={1 - (actor.poseBlend ?? 1)}
                preserveAspectRatio="xMidYMax meet"
              />
            )}
            <image
              href={spriteUrl}
              x={-widthPx / 2}
              y={-heightPx}
              width={widthPx}
              height={heightPx}
              preserveAspectRatio="xMidYMax meet"
            />
            <EmoteBadge emote={actor.emote} t={t} />
          </g>
        ) : (
          <ArticulatedPuppetSvg actor={actor} heightPx={heightPx} t={t} />
        )}

        {/* 靠近舞台灯/门/窗时的柔和环境边缘高光 */}
        {(actor.rimLight ?? 0) > 0.04 && (
          <ellipse
            cx={0}
            cy={-heightPx * 0.52}
            rx={widthPx * 0.28}
            ry={heightPx * 0.44}
            fill="none"
            stroke={actor.rimColor || '#FFE5A3'}
            strokeWidth={3}
            opacity={Math.min(0.3, actor.rimLight * 0.25)}
          />
        )}
      </g>

      {showNamePlate && actor.name && (
        <text
          x={actor.x}
          y={actor.y - heightPx - 16}
          textAnchor="middle"
          fontSize={17}
          fontWeight="800"
          fill="#E5E8DD"
          fontFamily="Noto Sans CJK SC, sans-serif"
        >
          {actor.name}
        </text>
      )}
    </svg>
  );
}
