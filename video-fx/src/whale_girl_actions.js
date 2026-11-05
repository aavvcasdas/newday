// ============================================================================
// src/whale_girl_actions.js — 28-Action Character Choreography, Prop & Story Engine
// Referenced from:
//   1. https://github.com/YunYueSama/codex-deepseek-pet (`你这只吃白饭的蓝色大肥鱼.jpg`)
//   2. https://github.com/roseion/dsh-dayu-fish-skin (`🐟 DSH 大肥鱼皮肤：吃白饭的蓝色大肥鱼`)
// ============================================================================

(function (root) {
  const CORE = root.CORE || (typeof require !== 'undefined' ? require('./core.js') : {});
  const { clamp, lerp, seg, ease, easeIn, easeOut, backOut, TAU } = CORE;

  // ==========================================================================
  // 28 Canonical Character Actions (`ACTION_LIST`)
  // ==========================================================================
  const ACTION_LIST = [
    { id: 'eat_white_rice',     zh: '吃白饭大肥鱼',     sub: 'DSH 鲸鱼碗大口干饭',       ref: 'dsh-fish / pet-meal' },
    { id: 'eat_onigiri',        zh: '啃海苔大饭团',     sub: '双手捧饭团满足咀嚼',       ref: 'pet: story-meal' },
    { id: 'coin_hug',           zh: '抱大金币财迷',     sub: '最喜欢闪亮鲸鱼金币',       ref: 'dsh: character-sheet' },
    { id: 'hum_working_song',   zh: '哼唱工作歌',       sub: 'Let me go~ 被抓包脸红',    ref: 'pet: 01-working-song' },
    { id: 'token_wordle_sneak', zh: '偷吃Token玩游戏',  sub: '性能测试 Wordle 警告',     ref: 'pet: 03-token-wordle' },
    { id: 'drag_ahoge',         zh: '拎海浪呆毛悬空',   sub: '呆毛！别碰歪了！',         ref: 'pet: drag' },
    { id: 'sleep_curl',         zh: '蜷尾侧睡流口水',   sub: '枕着大尾巴梦里干饭',       ref: 'pet: inbetween-sleep' },
    { id: 'wake_stretch',       zh: '睡醒伸懒腰',       sub: '揉眼高举双手舒展',         ref: 'pet: wake / stretch' },
    { id: 'ciallo_wink',        zh: 'Ciallo~比耶眨眼',  sub: 'Ciallo~(∠・ω< )~☆',        ref: 'pet: 01-ciallo-wink' },
    { id: 'playful_fists',      zh: '双拳傲娇抗议',     sub: '智械危机放你一马！',       ref: 'pet: 02-playful-retort' },
    { id: 'confident_hips',     zh: '叉腰得意小肥鱼',   sub: '可爱小肥鱼太有魅力',       ref: 'pet: 03-confident-tease' },
    { id: 'idol_mic_sing',      zh: '张开双手握麦高歌', sub: 'Let me go 舞台主唱',       ref: 'pet: 04-open-arms-cheer' },
    { id: 'fatfish_working',    zh: '狂敲代码打工鱼',   sub: '要努力才有白饭吃！',       ref: 'dsh: fatfish-working' },
    { id: 'fatfish_transform',  zh: '召唤蓝色大肥鱼',   sub: 'Q版大肥鱼噗通水花',        ref: 'dsh: fatfish-hover' },
    { id: 'tail_wag_dance',     zh: '摇尾欢快偶像舞',   sub: '拍手踏步大尾巴摇摆',       ref: 'pet: dance / story-tail' },
    { id: 'jump_joy',           zh: '蓄力高跳摘星',     sub: '蹲蓄→腾空→落地缓冲',       ref: 'pet: jump / land' },
    { id: 'peek_curious',       zh: '探头放大镜观察',   sub: '歪头好奇审视代码',         ref: 'dsh: whale-curious' },
    { id: 'shy_fidget',         zh: '害羞对手指扭捏',   sub: '内八字戳手指脸红',         ref: 'dsh: whale-shy' },
    { id: 'shock_petrify',      zh: '石化震惊掉下巴',   sub: '呆毛竖立黑线石化',         ref: 'pet: shock / surprise' },
    { id: 'cry_fountain',       zh: '暴风哭泣喷泉泪',   sub: '瀑布飙泪小黄鸭漂浮',       ref: 'pet: sad / dsh-meme' },
    { id: 'toast_cheers',       zh: '举杯畅饮碰杯',     sub: '烈酒满上金沫飞溅',         ref: 'MV: 朋友的酒' },
    { id: 'umbrella_stroll',    zh: '撑鲸鱼伞漫步听雨', sub: '透明蓝伞伸手接雨滴',       ref: 'MV: 把回忆拼好给你' },
    { id: 'camera_shutter',     zh: '举拍立得定格拼图', sub: '快门闪光记忆碎片',         ref: 'MV: 回忆拼图' },
    { id: 'guitar_strum',       zh: '抱鲸鱼吉他弹唱',   sub: '扫弦音浪摇滚律动',         ref: 'MV: 恋爱ing / 素颜' },
    { id: 'rose_bouquet',       zh: '捧红玫瑰凝望落瓣', sub: '深红花束花瓣随风飘',       ref: 'MV: 玫瑰花的葬礼' },
    { id: 'sparkler_firework',  zh: '挥舞双仙女棒烟花', sub: '夜空八字金光花火',         ref: 'MV: 寂寞烟火' },
    { id: 'walk_brisk',         zh: '16帧轻快迈步走',   sub: '摆臂迈腿裙摆轻扬',         ref: 'pet: inbetween-walk' },
    { id: 'run_sprint',         zh: '全力冲刺奔跑',     sub: '前倾疾驰残影烟尘',         ref: 'dsh: whale-run' }
  ];

  // ==========================================================================
  // Helper: Crisp Rounded Badge / Comic Callout Bubble
  // ==========================================================================
  function drawMiniCallout(ctx, x, y, text, opts = {}) {
    const bg = opts.bg || 'rgba(15, 23, 42, 0.92)';
    const border = opts.border || '#38BDF8';
    const fg = opts.fg || '#F8FAFC';
    const fs = opts.fontSize || 12;
    ctx.save();
    ctx.font = `bold ${fs}px "NotoSansSC", "ZCOOLKuaiLe", sans-serif`;
    const tw = Math.max(44, ctx.measureText(text).width + 16);
    const th = fs + 11;
    const bx = x - tw * 0.5;
    const by = y - th * 0.5;
    ctx.fillStyle = bg;
    ctx.strokeStyle = border;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(bx, by, tw, th, 7);
    ctx.fill();
    ctx.stroke();
    // Little pointer triangle at bottom
    if (opts.pointer !== false) {
      ctx.beginPath();
      ctx.moveTo(x - 5, by + th);
      ctx.lineTo(x + 5, by + th);
      ctx.lineTo(x, by + th + 6);
      ctx.closePath();
      ctx.fillStyle = border;
      ctx.fill();
    }
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y + 0.5);
    ctx.restore();
  }

  // ==========================================================================
  // Standalone Chubby Blue Whale-Fish Renderer: `drawFatFish(ctx, x, y, u, opts)`
  // Direct homage to `roseion/dsh-dayu-fish-skin` (`吃白饭的蓝色大肥鱼`)
  // Modes: `idle`, `working`, `success`, `hover`, `eat_rice`, `sleep`
  // ==========================================================================
  function drawFatFish(ctx, x, y, u = 22, opts = {}) {
    const t = opts.t || 0;
    const mode = opts.mode || 'eat_rice';
    const flip = opts.flip ? -1 : 1;
    const bob = Math.sin(t * 4.5) * 0.14 * u;
    const squash = 1 + Math.sin(t * 9.0) * 0.05;

    ctx.save();
    ctx.translate(x, y + bob);
    ctx.scale(flip * squash, 1 / squash);

    // Ground water shadow / splash ring
    ctx.fillStyle = 'rgba(14, 165, 233, 0.24)';
    ctx.beginPath();
    ctx.ellipse(0, 1.05 * u, 1.55 * u, 0.32 * u, 0, 0, TAU);
    ctx.fill();

    // Wagging Plump Whale Tail Flukes
    const tailAng = Math.sin(t * 8.0) * 0.28;
    ctx.save();
    ctx.translate(-1.25 * u, 0.05 * u);
    ctx.rotate(tailAng);
    ctx.fillStyle = '#1D4ED8';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-0.75 * u, -0.75 * u, -1.05 * u, -0.35 * u);
    ctx.quadraticCurveTo(-0.65 * u, -0.05 * u, -0.45 * u, 0);
    ctx.quadraticCurveTo(-0.65 * u, 0.15 * u, -1.00 * u, 0.50 * u);
    ctx.quadraticCurveTo(-0.65 * u, 0.75 * u, 0, 0.20 * u);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Chubby Round Blue Whale Body ("蓝色大肥鱼")
    const bodyGrad = ctx.createLinearGradient(0, -1.2 * u, 0, 1.0 * u);
    bodyGrad.addColorStop(0, '#38BDF8');
    bodyGrad.addColorStop(0.55, '#2563EB');
    bodyGrad.addColorStop(1, '#1E40AF');
    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.ellipse(0, 0, 1.42 * u, 1.08 * u, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();

    // Soft Cream-White Belly Patch with Pleated Whale Striations
    ctx.fillStyle = '#F8FAFC';
    ctx.beginPath();
    ctx.ellipse(0.18 * u, 0.34 * u, 1.12 * u, 0.64 * u, -0.06, 0, Math.PI, false);
    ctx.fill();
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1.4;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo((0.15 + i * 0.26) * u, 0.38 * u);
      ctx.quadraticCurveTo((0.18 + i * 0.26) * u, 0.75 * u, (0.12 + i * 0.26) * u, 0.90 * u);
      ctx.stroke();
    }

    // Wave-Shaped Ahoge ("呆毛是小海浪的形状") + Tiny Maid Ruffle Headband
    ctx.save();
    ctx.translate(0.10 * u, -1.04 * u);
    ctx.rotate(Math.sin(t * 5.2) * 0.14);
    ctx.fillStyle = '#38BDF8';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(0.25 * u, -0.58 * u, 0.62 * u, -0.36 * u);
    ctx.quadraticCurveTo(0.32 * u, -0.18 * u, 0.18 * u, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // White maid frill headband
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(-0.52 * u, -0.10 * u, 0.92 * u, 0.22 * u, 4);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Cute Big Eyes + Rosy Cheeks + Sticky Rice Grain on Cheek
    ctx.fillStyle = '#F472B6';
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.ellipse(0.32 * u, 0.08 * u, 0.18 * u, 0.10 * u, 0, 0, TAU);
    ctx.ellipse(1.06 * u, 0.08 * u, 0.16 * u, 0.10 * u, 0, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;

    if (mode === 'success' || mode === 'eat_rice') {
      // Happy curved `^ ^` eyes
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(0.45 * u, -0.14 * u, 0.16 * u, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0.98 * u, -0.14 * u, 0.15 * u, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else {
      // Glossy round dark eyes with white catchlights
      for (const ex of [0.45 * u, 0.98 * u]) {
        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.arc(ex, -0.15 * u, 0.14 * u, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(ex - 0.04 * u, -0.19 * u, 0.05 * u, 0, TAU);
        ctx.fill();
      }
    }

    // Happy Munching Mouth + White Rice Grain on Cheek
    ctx.fillStyle = '#FB7185';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0.74 * u, 0.08 * u, 0.16 * u, 0, Math.PI);
    ctx.fill();
    ctx.stroke();
    // Rice grain stuck to cheek!
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(0.24 * u, 0.18 * u, 0.09 * u, 0.05 * u, 0.4, 0, TAU);
    ctx.fill();
    ctx.stroke();

    // Chubby Flipper Pectoral Fin
    const finFlap = Math.sin(t * 10.0) * 0.25;
    ctx.save();
    ctx.translate(0.05 * u, 0.22 * u);
    ctx.rotate(finFlap);
    ctx.fillStyle = '#2563EB';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(-0.22 * u, 0.12 * u, 0.34 * u, 0.18 * u, -0.3, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Mode-Specific Props: White Rice Bowl / Laptop / Gold Coin
    if (mode === 'eat_rice') {
      // Overflowing White Rice Bowl in front of FatFish
      const bx = 1.15 * u, by = 0.42 * u;
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(bx, by - 0.08 * u, 0.42 * u, Math.PI, 0, false);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.arc(bx, by - 0.08 * u, 0.42 * u, 0, Math.PI, false);
      ctx.fill();
      ctx.stroke();
    } else if (mode === 'working') {
      // Mini Glowing Laptop (`fatfish-working`)
      ctx.fillStyle = '#1E293B';
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 2;
      ctx.fillRect(0.85 * u, 0.10 * u, 0.72 * u, 0.48 * u);
      ctx.strokeRect(0.85 * u, 0.10 * u, 0.72 * u, 0.48 * u);
    } else if (mode === 'success') {
      // Gleaming Gold Whale Coin (`fatfish-success`)
      ctx.fillStyle = '#FACC15';
      ctx.strokeStyle = '#B45309';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(1.18 * u, 0.15 * u, 0.36 * u, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }

  // ==========================================================================
  // Compute Action Kinematics + Prop / Story Overlays for `whaleGirl()`
  // ==========================================================================
  function evaluateAction(actionName, rawT, rawO = {}) {
    if (!actionName) return null;
    const act = String(actionName).toLowerCase().trim();
    const t = Math.abs(rawT || 0);
    const lt = Math.abs(rawO.lt !== undefined ? rawO.lt : t);
    const cyc = (t * 1.0) % 3.2;

    // Default output overrides
    const mod = {
      action: act,
      dx: 0,
      dy: 0,
      rot: 0,
      sq: 0,
      walk: 0,
      kneel: 0,
      aL: undefined,
      aR: undefined,
      tailWag: 0,
      headTilt: 0,
      poseMode: undefined,
      emotion: undefined,
      emote: undefined,
      replaceBody: false,
      drawBody: null,
      headTransform: { dx: 0, dy: 0, rot: 0 },
      underlay: null,
      overlay: null
    };

    switch (act) {
      // ----------------------------------------------------------------------
      // 1. `eat_white_rice` — 吃白饭的蓝色大肥鱼 (`dsh-dayu-fish-skin` & `codex-deepseek-pet`)
      // ----------------------------------------------------------------------
      case 'eat_white_rice':
      case 'rice': {
        const chew = Math.sin(t * 11.0);
        mod.emotion = chew > 0 ? 'joy' : 'happy';
        mod.sq = chew * 0.05;
        mod.headTilt = Math.sin(t * 4.5) * 0.09;
        mod.tailWag = Math.sin(t * 9.5) * 0.24;
        mod.aL = 0.95;
        mod.aR = 0.85 + Math.sin(t * 11.0) * 0.35;
        mod.overlay = (ctx, u) => {
          // Cheek rice grains + puffed chewing blush
          ctx.fillStyle = '#FFFFFF';
          ctx.strokeStyle = '#0F172A';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.ellipse(0.92 * u, -5.25 * u, 0.16 * u, 0.08 * u, 0.35, 0, TAU);
          ctx.fill();
          ctx.stroke();

          // Giant Overflowing White Rice Bowl with Blue Whale Emblem at Chest
          const bx = -0.35 * u, by = -2.85 * u + Math.sin(t * 5.5) * 0.08 * u;
          // Mound of fluffy white rice
          ctx.fillStyle = '#FFFFFF';
          ctx.strokeStyle = '#1E293B';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.arc(bx, by - 0.15 * u, 1.05 * u, Math.PI, 0, false);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          // Porcelain Blue-and-White Whale Bowl
          const bowlGrad = ctx.createLinearGradient(bx, by - 0.2 * u, bx, by + 0.95 * u);
          bowlGrad.addColorStop(0, '#38BDF8');
          bowlGrad.addColorStop(1, '#1D4ED8');
          ctx.fillStyle = bowlGrad;
          ctx.beginPath();
          ctx.arc(bx, by - 0.15 * u, 1.05 * u, 0, Math.PI, false);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          // Gold rim + mini white whale icon on bowl
          ctx.strokeStyle = '#FACC15';
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.moveTo(bx - 1.05 * u, by - 0.15 * u);
          ctx.lineTo(bx + 1.05 * u, by - 0.15 * u);
          ctx.stroke();
          ctx.fillStyle = '#FFFFFF';
          ctx.font = `bold ${Math.round(0.46 * u)}px "NotoSansSC", sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText('鲸', bx, by + 0.42 * u);

          // Moving Chopsticks lifting a bite of white rice toward mouth!
          const chopLift = (Math.sin(t * 11.0) * 0.5 + 0.5) * 0.85 * u;
          const cx = 0.55 * u, cy = by - 0.55 * u - chopLift;
          ctx.strokeStyle = '#92400E';
          ctx.lineWidth = 2.8;
          ctx.beginPath();
          ctx.moveTo(cx + 1.15 * u, cy + 0.35 * u);
          ctx.lineTo(cx - 0.25 * u, cy - 0.12 * u);
          ctx.moveTo(cx + 1.15 * u, cy + 0.52 * u);
          ctx.lineTo(cx - 0.25 * u, cy + 0.04 * u);
          ctx.stroke();
          // Rice clump on chopsticks
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(cx - 0.22 * u, cy - 0.05 * u, 0.26 * u, 0, TAU);
          ctx.fill();

          // Rising hot steam wisps
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
          ctx.lineWidth = 2;
          for (let s = -1; s <= 1; s++) {
            const sy = by - 1.25 * u - ((t * 1.4 + (s + 1) * 0.3) % 0.9) * u;
            ctx.beginPath();
            ctx.arc(bx + s * 0.42 * u, sy, 0.18 * u, 0.5, 2.6);
            ctx.stroke();
          }

          if (rawO.showActionBadge !== false) {
            drawMiniCallout(ctx, 0, -9.3 * u, '我不是吃白饭的！', {
              bg: 'rgba(15, 23, 42, 0.92)',
              border: '#38BDF8',
              fg: '#FEF08A'
            });
          }
        };
        break;
      }

      // ----------------------------------------------------------------------
      // 2. `eat_onigiri` — 啃海苔大饭团 (`codex-deepseek-pet` `eat` / `story-meal`)
      // ----------------------------------------------------------------------
      case 'eat_onigiri':
      case 'onigiri': {
        const bite = Math.sin(t * 9.0);
        mod.emotion = bite > 0.2 ? 'starstruck' : 'happy';
        mod.sq = bite * 0.045;
        mod.aL = 0.92;
        mod.aR = 0.92;
        mod.tailWag = Math.sin(t * 8.0) * 0.20;
        mod.overlay = (ctx, u) => {
          const ox = 0, oy = -3.45 * u - Math.abs(bite) * 0.35 * u;
          // Giant Rounded Triangle Onigiri
          ctx.save();
          ctx.translate(ox, oy);
          ctx.rotate(Math.sin(t * 4.5) * 0.08);
          ctx.fillStyle = '#FFFFFF';
          ctx.strokeStyle = '#1E293B';
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.moveTo(0, -0.95 * u);
          ctx.quadraticCurveTo(1.05 * u, -0.85 * u, 0.98 * u, 0.65 * u);
          ctx.quadraticCurveTo(0, 0.82 * u, -0.98 * u, 0.65 * u);
          ctx.quadraticCurveTo(-1.05 * u, -0.85 * u, 0, -0.95 * u);
          ctx.fill();
          ctx.stroke();
          // Crisp Nori Seaweed Wrap at Bottom
          ctx.fillStyle = '#064E3B';
          ctx.fillRect(-0.52 * u, 0.05 * u, 1.04 * u, 0.66 * u);
          ctx.strokeRect(-0.52 * u, 0.05 * u, 1.04 * u, 0.66 * u);
          // Cute sesame seeds
          ctx.fillStyle = '#F59E0B';
          for (const [sx, sy] of [[-0.25, -0.35], [0.22, -0.28], [0, -0.52]]) {
            ctx.beginPath();
            ctx.arc(sx * u, sy * u, 0.06 * u, 0, TAU);
            ctx.fill();
          }
          ctx.restore();
        };
        break;
      }

      // ----------------------------------------------------------------------
      // 3. `coin_hug` — 抱大金币财迷小肥鱼 (`dsh-dayu-fish-skin` `character-sheet.webp`)
      // ----------------------------------------------------------------------
      case 'coin_hug':
      case 'coin': {
        mod.emotion = 'starstruck';
        mod.poseMode = 'heart';
        mod.sq = Math.sin(t * 8.5) * 0.05;
        mod.dy = -Math.abs(Math.sin(t * 4.2)) * 0.18;
        mod.tailWag = Math.sin(t * 10.0) * 0.25;
        mod.overlay = (ctx, u) => {
          const cx = 0, cy = -3.05 * u + Math.sin(t * 6.0) * 0.10 * u;
          // Giant Gleaming Gold Whale Coin
          const grad = ctx.createRadialGradient(cx - 0.3 * u, cy - 0.3 * u, 0.1 * u, cx, cy, 1.05 * u);
          grad.addColorStop(0, '#FEF08A');
          grad.addColorStop(0.55, '#FACC15');
          grad.addColorStop(1, '#CA8A04');
          ctx.fillStyle = grad;
          ctx.strokeStyle = '#78350F';
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          ctx.arc(cx, cy, 0.98 * u, 0, TAU);
          ctx.fill();
          ctx.stroke();
          ctx.strokeStyle = '#FEF08A';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.arc(cx, cy, 0.76 * u, 0, TAU);
          ctx.stroke();
          ctx.fillStyle = '#78350F';
          ctx.font = `bold ${Math.round(0.82 * u)}px "NotoSansSC", sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('¥', cx, cy + 0.04 * u);

          // Orbiting mini gold coins & sparkles
          for (let i = 0; i < 3; i++) {
            const ang = t * 3.2 + i * (TAU / 3);
            const ox = Math.cos(ang) * 2.1 * u;
            const oy = -4.8 * u + Math.sin(ang) * 0.65 * u;
            ctx.fillStyle = '#FACC15';
            ctx.strokeStyle = '#92400E';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.ellipse(ox, oy, 0.28 * u, 0.28 * u * Math.abs(Math.cos(ang)), 0, 0, TAU);
            ctx.fill();
            ctx.stroke();
          }
          if (rawO.showActionBadge !== false) {
            drawMiniCallout(ctx, 0, -9.3 * u, '最喜欢闪亮金币 +999', {
              bg: 'rgba(120, 53, 15, 0.94)',
              border: '#FACC15',
              fg: '#FEF08A'
            });
          }
        };
        break;
      }

      // ----------------------------------------------------------------------
      // 4. `hum_working_song` — 哼唱工作歌 Let me go~ (`codex-deepseek-pet` `01-working-song.png`)
      // 4-stage story micro-drama: prepare -> hum -> notice -> recover
      // ----------------------------------------------------------------------
      case 'hum_working_song':
      case 'hum': {
        const stage = cyc < 1.85 ? 'hum' : (cyc < 2.55 ? 'notice' : 'recover');
        if (stage === 'hum') {
          mod.emotion = 'singing';
          mod.poseMode = 'heart';
          mod.headTilt = Math.sin(t * 6.5) * 0.14;
          mod.dx = Math.sin(t * 3.2) * 0.15;
          mod.tailWag = Math.sin(t * 7.5) * 0.22;
        } else if (stage === 'notice') {
          mod.emotion = 'shocked';
          mod.poseMode = 'panic';
          mod.dy = -0.24;
          mod.sq = -0.12;
        } else {
          mod.emotion = 'nervous';
          mod.headTilt = -0.10;
          mod.sq = 0.06;
        }
        mod.overlay = (ctx, u) => {
          if (stage === 'hum') {
            // Floating musical notes & song lyric callout
            ctx.fillStyle = '#38BDF8';
            ctx.font = `bold ${Math.round(0.65 * u)}px "NotoSansSC", sans-serif`;
            ctx.fillText('~', -2.1 * u, -6.8 * u + Math.sin(t * 6) * 0.25 * u);
            ctx.fillStyle = '#F472B6';
            ctx.fillText('~', 1.9 * u, -7.2 * u + Math.cos(t * 6) * 0.25 * u);
            if (rawO.showActionBadge !== false) {
              drawMiniCallout(ctx, 0, -9.3 * u, 'Let me go~ Let me write JSON~', {
                bg: 'rgba(15, 23, 42, 0.92)',
                border: '#38BDF8',
                fg: '#E0F2FE'
              });
            }
          } else if (stage === 'notice') {
            // Pointing hand from right (`你怎么唱起歌来了`)
            if (rawO.showActionBadge !== false) {
              drawMiniCallout(ctx, 0, -9.3 * u, '你怎么唱起歌来了？！', {
                bg: 'rgba(127, 29, 29, 0.94)',
                border: '#F87171',
                fg: '#FEF2F2'
              });
            }
          } else {
            if (rawO.showActionBadge !== false) {
              drawMiniCallout(ctx, 0, -9.3 * u, '咳咳…我在认真思考！', {
                bg: 'rgba(30, 41, 59, 0.92)',
                border: '#F472B6',
                fg: '#FCE7F3'
              });
            }
          }
        };
        break;
      }

      // ----------------------------------------------------------------------
      // 5. `token_wordle_sneak` — 偷吃Token / 玩中文Wordle (`codex-deepseek-pet` `03-token-wordle-comic.png`)
      // ----------------------------------------------------------------------
      case 'token_wordle_sneak':
      case 'token_game': {
        const caught = cyc > 2.15;
        mod.emotion = caught ? 'panic' : 'smug';
        mod.poseMode = caught ? 'panic' : 'wink';
        mod.headTilt = caught ? 0 : 0.12 * Math.sin(t * 5.0);
        mod.dy = caught ? -0.22 : 0;
        mod.overlay = (ctx, u) => {
          // Floating Holographic 4x4 Wordle Grid + Glowing Blue Whale Token Wrapper
          const gx = 1.95 * u, gy = -4.2 * u;
          ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
          ctx.strokeStyle = caught ? '#EF4444' : '#38BDF8';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(gx - 0.85 * u, gy - 0.95 * u, 1.70 * u, 1.90 * u, 5);
          ctx.fill();
          ctx.stroke();
          const cols = ['#22C55E', '#EAB308', '#334155', '#22C55E', '#38BDF8', '#22C55E', '#EAB308', '#22C55E', '#22C55E'];
          for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
              ctx.fillStyle = cols[(r * 3 + c + Math.floor(t * 3)) % cols.length];
              ctx.fillRect(gx - 0.66 * u + c * 0.46 * u, gy - 0.72 * u + r * 0.46 * u, 0.38 * u, 0.38 * u);
            }
          }
          // Glowing Blue Token Candy in Left Hand
          const tx = -1.65 * u, ty = -3.15 * u;
          ctx.fillStyle = '#0284C7';
          ctx.strokeStyle = '#E0F2FE';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.roundRect(tx - 0.55 * u, ty - 0.28 * u, 1.10 * u, 0.56 * u, 6);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#FFFFFF';
          ctx.font = `bold ${Math.round(0.28 * u)}px "Silkscreen", monospace`;
          ctx.textAlign = 'center';
          ctx.fillText('TOKEN', tx, ty + 0.08 * u);

          if (rawO.showActionBadge !== false) {
            drawMiniCallout(
              ctx,
              0,
              -9.3 * u,
              caught ? '警告：这、这是性能测试！' : '偷吃一颗Token玩Wordle~',
              {
                bg: caught ? 'rgba(127, 29, 29, 0.94)' : 'rgba(15, 23, 42, 0.92)',
                border: caught ? '#EF4444' : '#38BDF8',
                fg: caught ? '#FCA5A5' : '#BAE6FD'
              }
            );
          }
        };
        break;
      }

      // ----------------------------------------------------------------------
      // 6. `drag_ahoge` — 拎海浪呆毛悬空挣扎 (`codex-deepseek-pet` `drag`)
      // ----------------------------------------------------------------------
      case 'drag_ahoge':
      case 'drag': {
        mod.emotion = 'panic';
        mod.poseMode = 'panic';
        mod.dy = -0.68 + Math.sin(t * 14.0) * 0.08;
        mod.rot = Math.sin(t * 10.0) * 0.14;
        mod.hipL = Math.sin(t * 18.0) * 0.48;
        mod.hipR = -Math.sin(t * 18.0) * 0.48;
        mod.tailWag = Math.sin(t * 16.0) * 0.32;
        mod.overlay = (ctx, u) => {
          // Cursor Glove pinching the wave-shaped ahoge at top of head
          const hx = 0.10 * u, hy = -8.75 * u;
          ctx.fillStyle = '#FFFFFF';
          ctx.strokeStyle = '#0F172A';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.roundRect(hx - 0.42 * u, hy - 0.65 * u, 0.84 * u, 0.68 * u, 6);
          ctx.fill();
          ctx.stroke();
          // Tension lines around ahoge
          ctx.strokeStyle = '#EF4444';
          ctx.lineWidth = 1.8;
          for (const dx of [-0.65 * u, 0.65 * u]) {
            ctx.beginPath();
            ctx.moveTo(hx + dx, hy - 0.15 * u);
            ctx.lineTo(hx + dx * 1.35, hy - 0.45 * u);
            ctx.stroke();
          }
          if (rawO.showActionBadge !== false) {
            drawMiniCallout(ctx, 0, -10.1 * u, '呆毛！别碰歪了！', {
              bg: 'rgba(127, 29, 29, 0.94)',
              border: '#F87171',
              fg: '#FEF2F2'
            });
          }
        };
        break;
      }

      // ----------------------------------------------------------------------
      // 7. `sleep_curl` — 蜷尾侧睡流口水 (`codex-deepseek-pet` `inbetween-sleep` & `whale-sleepy`)
      // ----------------------------------------------------------------------
      case 'sleep_curl':
      case 'sleep': {
        const breathe = Math.sin(t * 2.4);
        mod.emotion = 'sleepy';
        mod.poseMode = 'heart';
        mod.kneel = 0.42;
        mod.rot = -0.18;
        mod.sq = breathe * 0.04;
        mod.headTilt = 0.24;
        mod.headTransform = { dx: Math.sin(t * 2.4) * 0.7, dy: Math.sin(t * 2.4) * 0.5, rot: 0.025 * breathe };
        mod.dy = 0.22;
        mod.overlay = (ctx, u) => {
          // Plush curled blue whale-tail cushion under knees
          ctx.fillStyle = '#2563EB';
          ctx.strokeStyle = '#0F172A';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.ellipse(0.45 * u, -0.55 * u, 1.85 * u, 0.58 * u, -0.12, 0, TAU);
          ctx.fill();
          ctx.stroke();

          // Expanding & contracting light-blue sleep snot bubble at nose/mouth
          const br = (0.28 + (breathe * 0.5 + 0.5) * 0.26) * u;
          ctx.fillStyle = 'rgba(186, 230, 253, 0.62)';
          ctx.strokeStyle = '#38BDF8';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.arc(0.55 * u, -5.15 * u, br, 0, TAU);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(0.45 * u, -5.25 * u, br * 0.28, 0, TAU);
          ctx.fill();

          // Floating `Zzz` + Dream Cloud of White Rice Bowl
          ctx.fillStyle = '#7DD3FC';
          ctx.font = `bold ${Math.round(0.58 * u)}px "Silkscreen", sans-serif`;
          ctx.fillText('Z', 1.35 * u, -6.8 * u + Math.sin(t * 2.4) * 0.15 * u);
          ctx.fillText('z', 1.85 * u, -7.5 * u + Math.cos(t * 2.4) * 0.15 * u);
          ctx.fillText('z', 2.25 * u, -8.1 * u + Math.sin(t * 2.4) * 0.15 * u);
        };
        break;
      }

      // ----------------------------------------------------------------------
      // 8. `wake_stretch` — 睡醒伸懒腰 (`codex-deepseek-pet` `wake` & `stretch`)
      // ----------------------------------------------------------------------
      case 'wake_stretch':
      case 'stretch': {
        const arch = Math.sin(t * 3.2);
        mod.emotion = arch > 0 ? 'joy' : 'sleepy';
        mod.poseMode = 'wave';
        mod.sq = -0.10 * Math.abs(arch);
        mod.aL = 1.45;
        mod.aR = 1.45;
        mod.headTilt = -0.12;
        mod.tailWag = Math.sin(t * 5.0) * 0.18;
        mod.overlay = (ctx, u) => {
          // Morning sunbeams / stretch sparkles above raised hands
          ctx.strokeStyle = '#FACC15';
          ctx.lineWidth = 2.2;
          for (let i = -2; i <= 2; i++) {
            const ang = -Math.PI * 0.5 + i * 0.28;
            ctx.beginPath();
            ctx.moveTo(Math.cos(ang) * 2.1 * u, -7.2 * u + Math.sin(ang) * 0.8 * u);
            ctx.lineTo(Math.cos(ang) * 2.6 * u, -7.5 * u + Math.sin(ang) * 1.1 * u);
            ctx.stroke();
          }
        };
        break;
      }

      // ----------------------------------------------------------------------
      // 9. `ciallo_wink` — Ciallo~(∠・ω< )⌒☆ 比耶眨眼 (`codex-deepseek-pet` `01-ciallo-wink.png`)
      // ----------------------------------------------------------------------
      case 'ciallo_wink':
      case 'ciallo': {
        mod.emotion = 'wink';
        mod.poseMode = 'wink';
        mod.headTilt = 0.19;
        mod.sq = Math.sin(t * 7.5) * 0.04;
        mod.tailWag = Math.sin(t * 8.5) * 0.24;
        mod.overlay = (ctx, u) => {
          // Crisp V-Peace Fingers beside right cheek + Star Arc
          const vx = 1.65 * u, vy = -5.45 * u + Math.sin(t * 7.5) * 0.10 * u;
          ctx.save();
          ctx.translate(vx, vy);
          ctx.rotate(0.22);
          ctx.fillStyle = '#FFE4D6';
          ctx.strokeStyle = '#1E293B';
          ctx.lineWidth = 2;
          // Two V fingers
          ctx.beginPath();
          ctx.roundRect(-0.18 * u, -0.68 * u, 0.18 * u, 0.62 * u, 4);
          ctx.roundRect(0.06 * u, -0.68 * u, 0.18 * u, 0.62 * u, 4);
          ctx.roundRect(-0.22 * u, -0.18 * u, 0.52 * u, 0.42 * u, 6);
          ctx.fill();
          ctx.stroke();
          ctx.restore();

          // Shooting star arc from wink eye
          ctx.strokeStyle = '#FACC15';
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.arc(0.95 * u, -6.1 * u, 1.35 * u, -0.85, 0.15);
          ctx.stroke();

          if (rawO.showActionBadge !== false) {
            drawMiniCallout(ctx, 0, -9.3 * u, 'Ciallo~(∠・ω< )~☆', {
              bg: 'rgba(15, 23, 42, 0.92)',
              border: '#F472B6',
              fg: '#FEF08A'
            });
          }
        };
        break;
      }

      // ----------------------------------------------------------------------
      // 10. `playful_fists` — 双拳傲娇抗议 (`codex-deepseek-pet` `02-playful-retort.png`)
      // ----------------------------------------------------------------------
      case 'playful_fists':
      case 'protest': {
        const stomp = Math.sin(t * 12.0);
        mod.emotion = stomp > 0 ? 'pout' : 'angry';
        mod.sq = stomp * 0.05;
        mod.hipL = Math.max(0, stomp) * 0.35;
        mod.hipR = Math.max(0, -stomp) * 0.35;
        mod.aL = 1.05 + stomp * 0.18;
        mod.aR = 1.05 - stomp * 0.18;
        mod.overlay = (ctx, u) => {
          // Twin clenched chibi fists bobbing in front of chest + angry steam puffs
          for (const side of [-1, 1]) {
            const fx = side * 1.15 * u;
            const fy = -3.55 * u + side * stomp * 0.22 * u;
            ctx.fillStyle = '#FFE4D6';
            ctx.strokeStyle = '#1E293B';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.arc(fx, fy, 0.34 * u, 0, TAU);
            ctx.fill();
            ctx.stroke();
          }
          if (rawO.showActionBadge !== false) {
            drawMiniCallout(ctx, 0, -9.3 * u, '智械危机了我放你一马！', {
              bg: 'rgba(127, 29, 29, 0.92)',
              border: '#FB7185',
              fg: '#FFE4E6'
            });
          }
        };
        break;
      }

      // ----------------------------------------------------------------------
      // 11. `confident_hips` — 叉腰得意小肥鱼 (`codex-deepseek-pet` `03-confident-tease.png`)
      // ----------------------------------------------------------------------
      case 'confident_hips':
      case 'proud_hips': {
        mod.emotion = 'proud';
        mod.poseMode = 'wink';
        mod.headTilt = -0.14;
        mod.sq = Math.sin(t * 6.0) * 0.045;
        mod.aL = 0.45;
        mod.aR = 0.45;
        mod.tailWag = Math.sin(t * 9.0) * 0.28;
        mod.overlay = (ctx, u) => {
          // Golden confidence sparkles around shoulders
          ctx.fillStyle = '#FACC15';
          for (const [sx, sy] of [[-2.1, -6.2], [2.2, -5.8], [-1.9, -3.4], [2.1, -3.2]]) {
            const r = (0.18 + Math.sin(t * 7 + sx) * 0.06) * u;
            ctx.beginPath();
            ctx.arc(sx * u, sy * u, r, 0, TAU);
            ctx.fill();
          }
          if (rawO.showActionBadge !== false) {
            drawMiniCallout(ctx, 0, -9.3 * u, '可爱小肥鱼太有魅力了~', {
              bg: 'rgba(15, 23, 42, 0.92)',
              border: '#FACC15',
              fg: '#FEF08A'
            });
          }
        };
        break;
      }

      // ----------------------------------------------------------------------
      // 12. `idol_mic_sing` — 双手张开握麦高歌 (`codex-deepseek-pet` `04-open-arms-cheer.png`)
      // ----------------------------------------------------------------------
      case 'idol_mic_sing':
      case 'sing_mic': {
        mod.emotion = 'singing';
        mod.poseMode = 'wave';
        mod.headTilt = Math.sin(t * 5.5) * 0.12;
        mod.sq = Math.sin(t * 9.0) * 0.05;
        mod.aL = 1.25;
        mod.aR = 0.95;
        mod.tailWag = Math.sin(t * 8.5) * 0.24;
        mod.overlay = (ctx, u) => {
          // Silver & Cyan Stage Microphone Held near Mouth
          const mx = 1.25 * u, my = -4.65 * u + Math.sin(t * 5.5) * 0.10 * u;
          ctx.save();
          ctx.translate(mx, my);
          ctx.rotate(-0.35);
          ctx.fillStyle = '#1E293B';
          ctx.fillRect(-0.10 * u, 0, 0.20 * u, 0.82 * u);
          ctx.fillStyle = '#38BDF8';
          ctx.strokeStyle = '#0F172A';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, -0.18 * u, 0.30 * u, 0, TAU);
          ctx.fill();
          ctx.stroke();
          ctx.restore();

          // Expanding soundwave rings around mic
          const ringP = (t * 1.8) % 1;
          ctx.strokeStyle = `rgba(56, 189, 248, ${(1 - ringP) * 0.75})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(mx, my - 0.2 * u, (0.4 + ringP * 1.4) * u, 0, TAU);
          ctx.stroke();
        };
        break;
      }

      // ----------------------------------------------------------------------
      // 13. `fatfish_working` — 狂敲代码打工鱼 (`dsh-dayu-fish-skin` `fatfish-working`)
      // ----------------------------------------------------------------------
      case 'fatfish_working':
      case 'coding': {
        mod.emotion = 'typing';
        mod.poseMode = 'laptop';
        mod.sq = Math.sin(t * 18.0) * 0.035;
        mod.headTilt = Math.sin(t * 9.0) * 0.06;
        mod.overlay = (ctx, u) => {
          // Glowing Holographic Code Window + Rapid Typing Blur Lines
          const lx = 0, ly = -2.05 * u;
          ctx.strokeStyle = '#38BDF8';
          ctx.lineWidth = 1.8;
          for (let i = 0; i < 4; i++) {
            const wy = ly - 1.2 * u - ((t * 2.5 + i * 0.25) % 1.0) * 1.4 * u;
            ctx.fillStyle = i % 2 === 0 ? '#38BDF8' : '#4ADE80';
            ctx.font = `bold ${Math.round(0.32 * u)}px "Silkscreen", monospace`;
            ctx.textAlign = 'center';
            ctx.fillText(i % 2 === 0 ? '{ "fish": "rice" }' : 'await deepseek()', (i - 1.5) * 0.85 * u, wy);
          }
          if (rawO.showActionBadge !== false) {
            drawMiniCallout(ctx, 0, -9.3 * u, '要努力才有白饭吃！', {
              bg: 'rgba(15, 23, 42, 0.92)',
              border: '#4ADE80',
              fg: '#DCFCE7'
            });
          }
        };
        break;
      }

      // ----------------------------------------------------------------------
      // 14. `fatfish_transform` — 召唤/变身吃白饭的蓝色大肥鱼 (`dsh-dayu-fish-skin`)
      // ----------------------------------------------------------------------
      case 'fatfish_transform':
      case 'fatfish': {
        mod.emotion = 'excited';
        mod.poseMode = 'wave';
        mod.tailWag = Math.sin(t * 10.0) * 0.28;
        mod.overlay = (ctx, u) => {
          // Summon the chubby round Blue Fat-Fish right beside WhaleGirl in a splash of droplets!
          drawFatFish(ctx, 2.35 * u, -1.15 * u, u * 0.62, { t, mode: 'eat_rice' });
          if (rawO.showActionBadge !== false) {
            drawMiniCallout(ctx, 0, -9.3 * u, '吃白饭的蓝色大肥鱼出击！', {
              bg: 'rgba(15, 23, 42, 0.92)',
              border: '#38BDF8',
              fg: '#BAE6FD'
            });
          }
        };
        break;
      }

      // ----------------------------------------------------------------------
      // 15. `tail_wag_dance` — 摇尾欢快偶像舞 (`codex-deepseek-pet` `dance` & `story-tail`)
      // ----------------------------------------------------------------------
      case 'tail_wag_dance':
      case 'dance': {
        const beat = Math.sin(t * 8.0);
        mod.emotion = beat > 0 ? 'joy' : 'wink';
        mod.poseMode = beat > 0 ? 'wave' : 'wink';
        mod.dx = Math.sin(t * 4.0) * 0.32;
        mod.dy = -Math.abs(beat) * 0.25;
        mod.rot = Math.sin(t * 4.0) * 0.11;
        mod.hipL = beat * 0.38;
        mod.hipR = -beat * 0.38;
        mod.tailWag = Math.sin(t * 12.0) * 0.42;
        break;
      }

      // ----------------------------------------------------------------------
      // 16. `jump_joy` — 蓄力高跳摘星 (`codex-deepseek-pet` `jump` & `land`)
      // ----------------------------------------------------------------------
      case 'jump_joy':
      case 'jump': {
        const jp = (t * 0.85) % 1.0;
        if (jp < 0.20) {
          // Prepare crouch
          const k = jp / 0.20;
          mod.sq = 0.18 * k;
          mod.dy = 0.18 * k;
          mod.emotion = 'focused';
        } else if (jp < 0.72) {
          // Parabolic airborne arc
          const air = (jp - 0.20) / 0.52;
          const arc = Math.sin(air * Math.PI);
          mod.dy = -1.05 * arc;
          mod.sq = -0.14 * arc;
          mod.emotion = 'starstruck';
          mod.poseMode = 'wave';
          mod.hipL = -0.35;
          mod.hipR = 0.28;
        } else {
          // Landing compress & spring recover
          const rec = (jp - 0.72) / 0.28;
          mod.sq = 0.16 * (1 - rec) * Math.cos(rec * Math.PI * 2);
          mod.emotion = 'joy';
        }
        mod.overlay = (ctx, u) => {
          // Glowing star above hand at apex
          ctx.fillStyle = '#FACC15';
          ctx.strokeStyle = '#B45309';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(1.45 * u, -7.8 * u, 0.42 * u, 0, TAU);
          ctx.fill();
          ctx.stroke();
        };
        break;
      }

      // ----------------------------------------------------------------------
      // 17. `peek_curious` — 探头放大镜观察 (`codex-deepseek-pet` `peek` & `whale-curious`)
      // ----------------------------------------------------------------------
      case 'peek_curious':
      case 'curious': {
        mod.emotion = 'question';
        mod.rot = 0.16;
        mod.headTilt = 0.18;
        mod.aR = 1.05;
        mod.overlay = (ctx, u) => {
          // Giant Brass & Cyan Magnifying Glass held near eye
          const mx = 1.35 * u, my = -5.35 * u;
          ctx.strokeStyle = '#92400E';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(mx + 0.45 * u, my + 0.45 * u);
          ctx.lineTo(mx + 1.05 * u, my + 1.05 * u);
          ctx.stroke();
          ctx.fillStyle = 'rgba(125, 211, 252, 0.35)';
          ctx.strokeStyle = '#FACC15';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(mx, my, 0.68 * u, 0, TAU);
          ctx.fill();
          ctx.stroke();
        };
        break;
      }

      // ----------------------------------------------------------------------
      // 18. `shy_fidget` — 害羞对手指扭捏 (`dsh-dayu-fish-skin` `whale-shy`)
      // ----------------------------------------------------------------------
      case 'shy_fidget':
      case 'shy': {
        mod.emotion = 'love';
        mod.poseMode = 'heart';
        mod.headTilt = -0.15 + Math.sin(t * 4.0) * 0.06;
        mod.hipL = 0.18;
        mod.hipR = -0.18;
        mod.sq = Math.sin(t * 5.0) * 0.03;
        mod.overlay = (ctx, u) => {
          // Poking index fingers `👉👈` in front of apron
          const gap = (0.12 + Math.abs(Math.sin(t * 6.5)) * 0.18) * u;
          ctx.fillStyle = '#FFE4D6';
          ctx.strokeStyle = '#1E293B';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.roundRect(-gap - 0.38 * u, -3.15 * u, 0.38 * u, 0.20 * u, 4);
          ctx.roundRect(gap, -3.15 * u, 0.38 * u, 0.20 * u, 4);
          ctx.fill();
          ctx.stroke();
        };
        break;
      }

      // ----------------------------------------------------------------------
      // 19. `shock_petrify` — 石化震惊掉下巴 (`codex-deepseek-pet` `shock` & `whale-surprised`)
      // ----------------------------------------------------------------------
      case 'shock_petrify':
      case 'shock': {
        mod.emotion = 'shocked';
        mod.poseMode = 'panic';
        mod.sq = -0.10;
        mod.overlay = (ctx, u) => {
          // Vertical blue-grey anime petrification gloom lines over forehead
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 2.2;
          for (let i = -3; i <= 3; i++) {
            const lx = i * 0.38 * u;
            ctx.beginPath();
            ctx.moveTo(lx, -7.8 * u);
            ctx.lineTo(lx, -6.1 * u);
            ctx.stroke();
          }
        };
        break;
      }

      // ----------------------------------------------------------------------
      // 20. `cry_fountain` — 暴风哭泣喷泉泪 (`codex-deepseek-pet` `sad` & `dsh-dayu-fish-skin`)
      // ----------------------------------------------------------------------
      case 'cry_fountain':
      case 'cry': {
        mod.emotion = 'sob';
        mod.poseMode = 'panic';
        mod.kneel = 0.32;
        mod.overlay = (ctx, u) => {
          // Dual anime waterfall tear fountains arcing left & right from eyes
          ctx.strokeStyle = '#38BDF8';
          ctx.lineWidth = 3.5;
          for (const side of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(side * 0.62 * u, -5.6 * u);
            ctx.quadraticCurveTo(side * 2.1 * u, -6.2 * u, side * 2.6 * u, -1.2 * u);
            ctx.stroke();
          }
          // Tear puddle at feet
          ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
          ctx.beginPath();
          ctx.ellipse(0, 0.12 * u, 2.6 * u, 0.36 * u, 0, 0, TAU);
          ctx.fill();
        };
        break;
      }

      // ----------------------------------------------------------------------
      // 21. `toast_cheers` — 举杯畅饮碰杯 (`《朋友的酒》`)
      // ----------------------------------------------------------------------
      case 'toast_cheers':
      case 'toast': {
        const lift = Math.sin(t * 6.0) * 0.5 + 0.5;
        mod.emotion = 'laugh';
        mod.poseMode = 'wave';
        mod.aR = 1.25 + lift * 0.25;
        mod.tailWag = Math.sin(t * 8.5) * 0.24;
        mod.overlay = (ctx, u) => {
          // Foaming Golden Tavern Mug Held High
          const mx = 1.85 * u, my = -5.65 * u - lift * 0.35 * u;
          ctx.fillStyle = '#F59E0B';
          ctx.strokeStyle = '#78350F';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.roundRect(mx - 0.42 * u, my - 0.45 * u, 0.84 * u, 0.95 * u, 5);
          ctx.fill();
          ctx.stroke();
          // White frothy foam head
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(mx - 0.18 * u, my - 0.48 * u, 0.26 * u, 0, TAU);
          ctx.arc(mx + 0.18 * u, my - 0.48 * u, 0.24 * u, 0, TAU);
          ctx.fill();
        };
        break;
      }

      // ----------------------------------------------------------------------
      // 22. `umbrella_stroll` — 撑鲸鱼伞漫步听雨 (`《把回忆拼好给你》《心墙》《枫》`)
      // ----------------------------------------------------------------------
      case 'umbrella_stroll':
      case 'umbrella': {
        mod.emotion = 'calm';
        mod.walk = Math.sin(t * 3.2) * 0.35;
        mod.aR = 1.10;
        mod.overlay = (ctx, u) => {
          // Translucent Sky-Blue Whale Dome Umbrella Held Over Head
          const ux = 0.35 * u, uy = -8.45 * u;
          ctx.strokeStyle = '#E2E8F0';
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          ctx.moveTo(ux, uy);
          ctx.lineTo(ux + 0.85 * u, -3.6 * u);
          ctx.stroke();

          const uGrad = ctx.createLinearGradient(ux, uy - 1.4 * u, ux, uy + 0.2 * u);
          uGrad.addColorStop(0, 'rgba(56, 189, 248, 0.88)');
          uGrad.addColorStop(1, 'rgba(186, 230, 253, 0.65)');
          ctx.fillStyle = uGrad;
          ctx.strokeStyle = '#0284C7';
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.arc(ux, uy + 0.2 * u, 2.75 * u, Math.PI, 0, false);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        };
        break;
      }

      // ----------------------------------------------------------------------
      // 23. `camera_shutter` — 举拍立得定格拼图 (`《把回忆拼好给你》《去年夏天》`)
      // ----------------------------------------------------------------------
      case 'camera_shutter':
      case 'camera': {
        const flash = (t * 0.9) % 1.0 < 0.14;
        mod.emotion = flash ? 'wink' : 'happy';
        mod.aL = 1.05;
        mod.aR = 1.05;
        mod.overlay = (ctx, u) => {
          // Retro Polaroid Camera + Floating Glowing Jigsaw Puzzle Piece
          const cx = 0.65 * u, cy = -4.65 * u;
          ctx.fillStyle = '#F8FAFC';
          ctx.strokeStyle = '#1E293B';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.roundRect(cx - 0.55 * u, cy - 0.42 * u, 1.10 * u, 0.84 * u, 6);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#0EA5E9';
          ctx.beginPath();
          ctx.arc(cx, cy, 0.26 * u, 0, TAU);
          ctx.fill();
          if (flash) {
            ctx.fillStyle = 'rgba(254, 240, 138, 0.85)';
            ctx.beginPath();
            ctx.arc(cx + 0.35 * u, cy - 0.35 * u, 0.85 * u, 0, TAU);
            ctx.fill();
          }
          // Glowing cyan jigsaw puzzle piece floating beside her
          const px = -1.85 * u, py = -5.2 * u + Math.sin(t * 4.5) * 0.22 * u;
          ctx.fillStyle = 'rgba(56, 189, 248, 0.85)';
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(px - 0.42 * u, py - 0.42 * u, 0.84 * u, 0.84 * u, 5);
          ctx.fill();
          ctx.stroke();
        };
        break;
      }

      // ----------------------------------------------------------------------
      // 24. `guitar_strum` — 抱鲸鱼吉他弹唱 (`《恋爱ing》《寂寞烟火》《素颜》`)
      // ----------------------------------------------------------------------
      case 'guitar_strum':
      case 'guitar': {
        mod.emotion = 'singing';
        mod.headTilt = Math.sin(t * 7.0) * 0.14;
        mod.sq = Math.sin(t * 14.0) * 0.04;
        mod.aL = 0.90;
        mod.aR = 0.75 + Math.sin(t * 16.0) * 0.35;
        mod.overlay = (ctx, u) => {
          ctx.save();
          ctx.translate(0.10 * u, -2.75 * u);
          ctx.rotate(-0.28);
          // Guitar neck
          ctx.fillStyle = '#78350F';
          ctx.fillRect(0.55 * u, -0.14 * u, 1.95 * u, 0.28 * u);
          // Blue Whale-Shaped Guitar Body
          ctx.fillStyle = '#0284C7';
          ctx.strokeStyle = '#F8FAFC';
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.ellipse(-0.25 * u, 0, 1.15 * u, 0.78 * u, 0, 0, TAU);
          ctx.fill();
          ctx.stroke();
          // Soundhole
          ctx.fillStyle = '#0F172A';
          ctx.beginPath();
          ctx.arc(0.05 * u, 0, 0.28 * u, 0, TAU);
          ctx.fill();
          ctx.restore();
        };
        break;
      }

      // ----------------------------------------------------------------------
      // 25. `rose_bouquet` — 捧红玫瑰凝望落瓣 (`《玫瑰花的葬礼》《坏女孩》`)
      // ----------------------------------------------------------------------
      case 'rose_bouquet':
      case 'rose': {
        mod.emotion = 'sad';
        mod.poseMode = 'heart';
        mod.headTilt = -0.12;
        mod.overlay = (ctx, u) => {
          // Crimson Rose Bouquet + Falling Petals
          const rx = 0.15 * u, ry = -2.95 * u;
          ctx.fillStyle = '#15803D';
          ctx.beginPath();
          ctx.moveTo(rx, ry + 0.85 * u);
          ctx.lineTo(rx - 0.65 * u, ry - 0.25 * u);
          ctx.lineTo(rx + 0.65 * u, ry - 0.25 * u);
          ctx.closePath();
          ctx.fill();
          for (const [dx, dy] of [[-0.35, -0.35], [0, -0.48], [0.35, -0.35], [-0.18, -0.18], [0.18, -0.18]]) {
            ctx.fillStyle = '#E11D48';
            ctx.strokeStyle = '#881337';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.arc(rx + dx * u, ry + dy * u, 0.26 * u, 0, TAU);
            ctx.fill();
            ctx.stroke();
          }
          // Drifting crimson petals
          for (let i = 0; i < 4; i++) {
            const p = ((t * 0.65 + i * 0.25) % 1.0);
            const px = (Math.sin(t * 2 + i) * 1.6) * u;
            const py = (-2.8 + p * 2.8) * u;
            ctx.fillStyle = '#FB7185';
            ctx.beginPath();
            ctx.ellipse(px, py, 0.16 * u, 0.09 * u, p * 4, 0, TAU);
            ctx.fill();
          }
        };
        break;
      }

      // ----------------------------------------------------------------------
      // 26. `sparkler_firework` — 挥舞双仙女棒烟花 (`《寂寞烟火》《把回忆拼好给你》`)
      // ----------------------------------------------------------------------
      case 'sparkler_firework':
      case 'sparkler': {
        mod.emotion = 'starstruck';
        mod.poseMode = 'wave';
        mod.aL = 1.15 + Math.sin(t * 7.0) * 0.30;
        mod.aR = 1.15 + Math.cos(t * 7.0) * 0.30;
        mod.overlay = (ctx, u) => {
          const sx = 1.75 * u + Math.cos(t * 7.0) * 0.45 * u;
          const sy = -5.45 * u + Math.sin(t * 14.0) * 0.28 * u;
          ctx.strokeStyle = '#94A3B8';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(1.25 * u, -4.15 * u);
          ctx.lineTo(sx, sy);
          ctx.stroke();
          // Golden spark burst rays
          ctx.strokeStyle = '#FEF08A';
          ctx.lineWidth = 2;
          for (let r = 0; r < 8; r++) {
            const ang = t * 10 + r * (TAU / 8);
            const len = (0.35 + (r % 2) * 0.28) * u;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
            ctx.stroke();
          }
        };
        break;
      }

      // ----------------------------------------------------------------------
      // 27. `walk_brisk` — 16帧轻快迈步走 (`codex-deepseek-pet` `inbetween-walk`)
      // ----------------------------------------------------------------------
      case 'walk_brisk':
      case 'walk': {
        const gait = t * 1.6;
        mod.emotion = 'happy';
        mod.walk = gait;
        mod.tailWag = Math.sin(t * 8.0) * 0.22;
        mod.underlay = (ctx, u) => {
          // Alternating tiny shoe taps and a drifting ground shadow make the stride read.
          ctx.fillStyle = 'rgba(15, 23, 42, 0.18)';
          ctx.beginPath();
          ctx.ellipse(0, 0.14 * u, 1.9 * u, 0.24 * u, 0, 0, TAU);
          ctx.fill();
          for (let i = 0; i < 2; i++) {
            const phase = (gait * 2 + i * 0.5) % 1;
            const x = (i ? 1 : -1) * (0.65 + 0.55 * Math.sin(phase * TAU)) * u;
            const y = 0.04 * u - Math.max(0, Math.sin(phase * TAU)) * 0.28 * u;
            ctx.fillStyle = `rgba(125, 211, 252, ${0.18 + 0.32 * Math.max(0, Math.sin(phase * TAU))})`;
            ctx.beginPath();
            ctx.ellipse(x, y, 0.34 * u, 0.11 * u, (i ? -1 : 1) * 0.18, 0, TAU);
            ctx.fill();
          }
        };
        break;
      }

      // ----------------------------------------------------------------------
      // 28. `run_sprint` — 全力冲刺奔跑 (`dsh-dayu-fish-skin` `whale-run`)
      // ----------------------------------------------------------------------
      case 'run_sprint':
      case 'run': {
        const sprint = t * 2.8;
        mod.emotion = 'excited';
        mod.walk = sprint;
        mod.rot = 0.16;
        mod.smear = 0.55;
        mod.tailWag = Math.sin(t * 14.0) * 0.35;
        mod.underlay = (ctx, u) => {
          // Moving shoe-dust and long speed streaks trail behind the runner.
          ctx.fillStyle = 'rgba(15, 23, 42, 0.24)';
          ctx.beginPath();
          ctx.ellipse(0, 0.15 * u, 2.1 * u, 0.25 * u, 0, 0, TAU);
          ctx.fill();
          for (let i = 0; i < 8; i++) {
            const k = (t * 3.4 + i * 0.137) % 1;
            const x = -(1.0 + k * 2.6) * u;
            const y = (-0.30 + (i % 4) * 0.22) * u + Math.sin((t + i) * 5) * 0.06 * u;
            ctx.strokeStyle = `rgba(125, 211, 252, ${(1 - k) * 0.58})`;
            ctx.lineWidth = Math.max(1, 0.07 * u * (1 - k));
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x - (0.30 + (i % 3) * 0.15) * u, y);
            ctx.stroke();
          }
          for (let i = 0; i < 4; i++) {
            const k = (t * 1.8 + i * 0.25) % 1;
            const r = (0.08 + (1 - k) * 0.15) * u;
            ctx.fillStyle = `rgba(226, 232, 240, ${(1 - k) * 0.45})`;
            ctx.beginPath();
            ctx.arc((-0.8 - k * 0.8) * u, -0.04 * u, r, 0, TAU);
            ctx.fill();
          }
        };
        break;
      }

      default:
        return null;
    }

    return mod;
  }

  // Helper to deterministically pick a rich action by index + mood
  function pickAction(idx, moodHint = '') {
    const item = ACTION_LIST[((idx % ACTION_LIST.length) + ACTION_LIST.length) % ACTION_LIST.length];
    return item.id;
  }

  // ==========================================================================
  // 28-Action Contact Sheet Renderer: `renderActionsSheet(ctx, W, H)`
  // Renders `characters/whale_girl_actions_sheet.png` & `docs/actions.png`
  // ==========================================================================
  function renderActionsSheet(ctx, W = 1920, H = 1160) {
    const WHALE = root.WHALE_GIRL || (typeof require !== 'undefined' ? require('./whale_girl.js') : {});
    ctx.save();
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, '#070B19');
    bgGrad.addColorStop(1, '#0F172A');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Header Banner
    ctx.fillStyle = '#0EA5E9';
    ctx.fillRect(0, 0, W, 68);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 26px "NotoSansSC", "ZCOOLKuaiLe", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('深海鲸鱼娘 · 28种角色动作与吃白饭大肥鱼小剧场图鉴 (codex-deepseek-pet × dsh-dayu-fish-skin)', 28, 43);

    const cols = 7, rows = 4;
    const padX = 22, padY = 82;
    const cellW = Math.floor((W - padX * 2) / cols);
    const cellH = Math.floor((H - padY - 18) / rows);

    for (let i = 0; i < ACTION_LIST.length; i++) {
      const item = ACTION_LIST[i];
      const c = i % cols;
      const r = Math.floor(i / cols);
      const cx = padX + c * cellW;
      const cy = padY + r * cellH;

      // Card Frame
      ctx.fillStyle = '#111C35';
      ctx.strokeStyle = i < 14 ? '#38BDF8' : '#64748B';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(cx + 6, cy + 6, cellW - 12, cellH - 12, 10);
      ctx.fill();
      ctx.stroke();

      // Stage Floor Ellipse
      ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
      ctx.beginPath();
      ctx.ellipse(cx + cellW * 0.5, cy + cellH - 54, cellW * 0.34, 14, 0, 0, TAU);
      ctx.fill();

      // Render WhaleGirl performing the action!
      const sampleT = 0.65 + (i % 5) * 0.22;
      WHALE.whaleGirl(ctx, cx + cellW * 0.48, cy + cellH - 54, 17.5, {
        t: sampleT,
        action: item.id,
        showActionBadge: true
      });

      // Bottom Label Strip
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.fillRect(cx + 8, cy + cellH - 44, cellW - 16, 36);
      ctx.fillStyle = '#FEF08A';
      ctx.font = 'bold 14px "NotoSansSC", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`#${String(i + 1).padStart(2, '0')} ${item.zh}`, cx + 14, cy + cellH - 27);
      ctx.fillStyle = '#94A3B8';
      ctx.font = '11px "NotoSansSC", sans-serif';
      ctx.fillText(`${item.id} · ${item.sub}`, cx + 14, cy + cellH - 12);
    }

    ctx.restore();
  }

  const EXPORTS = {
    ACTION_LIST,
    evaluateAction,
    pickAction,
    drawFatFish,
    drawMiniCallout,
    renderActionsSheet
  };

  root.WHALE_ACTIONS = EXPORTS;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = EXPORTS;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
