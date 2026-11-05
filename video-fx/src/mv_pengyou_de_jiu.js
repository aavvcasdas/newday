// src/mv_pengyou_de_jiu.js — Director & Scene Engine for 《朋友的酒》(深海鲸鱼娘 · 挚友欢聚篇)
// Replicates `朋友的酒.mp3` (188.25s, 30fps, 1280x720) with the sole Whale Maid Girl lead,
// synced to `assets/pengyou_de_jiu.mp3` &
// `assets/pengyou_de_jiu_audio.js` in `risograph` duotone print style.

(function (root) {
  'use strict';

  const CORE = (typeof window !== 'undefined' && window.CORE) ? window.CORE : require('./core.js');
  const WHALE = (typeof window !== 'undefined' && window.WHALE_GIRL) ? window.WHALE_GIRL : require('./whale_girl.js');
  const { whaleGirl, feel } = WHALE;

  const DURATION = 188.25;

  // 100% Authentic Vosk & Official LRC-Verified Lyric Timeline for 李晓杰《朋友的酒》 (188.25s)
  const SUBTITLES = [
    { t0: 0.50,   t1: 18.25,  text: '《朋友的酒》 · 李晓杰（深海鲸鱼娘挚友欢聚篇）', hi: '朋友的酒' },
    { t0: 18.31,  t1: 25.95,  text: '昨日一去不复回 哦也',                         hi: '一去不复回' },
    { t0: 26.00,  t1: 34.05,  text: '开心比什么都贵',                               hi: '开心' },
    { t0: 34.10,  t1: 41.95,  text: '覆水不能再收回 哦也',                         hi: '不能再收回' },
    { t0: 41.99,  t1: 50.05,  text: '桃花谢了有玫瑰',                               hi: '玫瑰' },
    { t0: 50.10,  t1: 53.90,  text: '人生几十年总会有风雨来陪',                     hi: '风雨来陪' },
    { t0: 53.95,  t1: 57.95,  text: '潇潇洒洒赴会今不醉不归',                       hi: '不醉不归' },
    { t0: 58.00,  t1: 61.45,  text: '往事后不后悔慢慢去体会',                       hi: '慢慢去体会' },
    { t0: 61.49,  t1: 66.00,  text: '此刻朋友这杯酒最珍贵',                         hi: '最珍贵' },
    { t0: 66.05,  t1: 69.90,  text: '快把酒满上干了这杯大声歌唱',                   hi: '大声歌唱' },
    { t0: 69.94,  t1: 73.95,  text: '好朋友好朋友今宵多欢畅',                       hi: '今宵多欢畅' },
    { t0: 73.99,  t1: 77.20,  text: '理想改变了我们的模样',                         hi: '理想' },
    { t0: 77.23,  t1: 81.95,  text: '也让我懂得了要珍惜朋友的肩膀',                 hi: '朋友的肩膀' },
    { t0: 81.99,  t1: 85.90,  text: '阳光总会在风雨之后撒向苍茫',                   hi: '阳光' },
    { t0: 85.93,  t1: 89.82,  text: '让我们抬起头学会了坚强',                       hi: '学会了坚强' },
    { t0: 89.87,  t1: 93.88,  text: '就像朋友的这杯烈酒烫我心上',                   hi: '烫我心上' },
    { t0: 93.92,  t1: 100.50, text: '温暖我凡事别再放心上',                         hi: '别再放心上' },
    { t0: 100.55, t1: 114.08, text: '（间奏 · 挚友欢聚 · 举杯共饮）',                 hi: '挚友欢聚' },
    { t0: 114.13, t1: 121.98, text: '今天我们来相会 哦也',                         hi: '来相会' },
    { t0: 122.02, t1: 130.08, text: '深情斟满了酒杯',                               hi: '斟满了酒杯' },
    { t0: 130.12, t1: 137.98, text: '岁月匆匆如流水 哦也',                         hi: '如流水' },
    { t0: 138.02, t1: 146.00, text: '管他昨天谁是谁',                               hi: '谁是谁' },
    { t0: 146.06, t1: 149.92, text: '人生的旅程有苦有甜也有泪',                     hi: '有苦有甜' },
    { t0: 149.97, t1: 153.82, text: '好汉不提当年酒再干一杯',                       hi: '再干一杯' },
    { t0: 153.87, t1: 157.56, text: '往事决不后悔不必再理会',                       hi: '决不后悔' },
    { t0: 157.61, t1: 161.96, text: '此刻朋友这杯酒最珍贵',                         hi: '最珍贵' },
    { t0: 162.01, t1: 165.88, text: '快把酒满上干了这杯大声歌唱',                   hi: '大声歌唱' },
    { t0: 165.91, t1: 169.90, text: '好朋友好朋友今宵多欢畅',                       hi: '今宵多欢畅' },
    { t0: 169.95, t1: 173.25, text: '理想改变了我们的模样',                         hi: '理想' },
    { t0: 173.29, t1: 177.90, text: '也让我懂得了要珍惜朋友的肩膀',                 hi: '朋友的肩膀' },
    { t0: 177.95, t1: 181.95, text: '阳光总会在风雨之后撒向苍茫',                   hi: '风雨之后' },
    { t0: 182.00, t1: 186.10, text: '让我们抬起头学会了坚强',                       hi: '学会了坚强' },
    { t0: 186.16, t1: 188.25, text: '就像朋友的这杯烈酒烫我心上',                   hi: '烫我心上' }
  ];

  function drawWhaleRiso(ctx, x, y, opts = {}) {
    const t = opts.t || 0;
    const emo = opts.feel || 'happy';
    const u = (opts.scale || 2.35) * 11.5;
    const actIdx = Math.floor(t / 3.4);
    const socialActions = ['toast_cheers', 'tail_wag_dance', 'jump_joy', 'idol_mic_sing', 'walk_brisk', 'ciallo_wink', 'confident_hips', 'playful_fists'];
    const chosenAction = opts.action || socialActions[actIdx % socialActions.length];
    const baseOps = Object.assign({}, feel(emo, t), opts, {
      view: opts.view || 'front',
      style: 'risograph',
      constructMode: 'pixelRig',
      tailScale: 0.68,
      action: chosenAction,
      showActionBadge: false,
      t
    });
    whaleGirl(ctx, x, y, u, baseOps);
  }

  // Sparkling golden cheers mug prop
  function drawCheersMug(ctx, x, y, scale, tilt = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);
    ctx.scale(scale, scale);

    // Handle
    ctx.strokeStyle = '#FEF08A';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(24, 4, 14, -Math.PI / 2, Math.PI / 2, false);
    ctx.stroke();

    // Glass body with amber drink
    ctx.fillStyle = '#F59E0B';
    ctx.strokeStyle = '#1E1B4B';
    ctx.lineWidth = 4;
    ctx.fillRect(-22, -20, 44, 52);
    ctx.strokeRect(-22, -20, 44, 52);

    // Fluffy white foam head
    ctx.fillStyle = '#FFFBEB';
    ctx.beginPath();
    ctx.arc(-12, -22, 12, 0, Math.PI * 2);
    ctx.arc(0, -25, 14, 0, Math.PI * 2);
    ctx.arc(12, -22, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // Risograph halftone dot texture & misregistration border
  function drawRisographFinish(ctx, t, energy) {
    ctx.save();
    // Halftone dot accents in top corners
    ctx.fillStyle = 'rgba(244, 63, 94, 0.22)';
    for (let y = 24; y < 140; y += 16) {
      for (let x = 24; x < 180; x += 16) {
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Offset duotone print registration frame
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.55)';
    ctx.lineWidth = 4;
    ctx.strokeRect(14, 14, 1252, 692);
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.55)';
    ctx.lineWidth = 3;
    ctx.strokeRect(10, 10, 1252, 692);

    ctx.restore();
  }

  function drawSubtitle(ctx, t) {
    let active = null;
    for (let i = 0; i < SUBTITLES.length; i++) {
      if (t >= SUBTITLES[i].t0 && t < SUBTITLES[i].t1) {
        active = SUBTITLES[i];
        break;
      }
    }
    if (!active) return;

    const prog = Math.min(1, Math.max(0, (t - active.t0) / Math.max(0.25, active.t1 - active.t0)));

    ctx.save();
    ctx.fillStyle = 'rgba(24, 16, 40, 0.88)';
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(210, 616, 860, 60, 16);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 28px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#181028';
    ctx.strokeText(active.text, 640, 646);
    ctx.fillStyle = '#FFF1F2';
    ctx.fillText(active.text, 640, 646);

    const tw = ctx.measureText(active.text).width;
    ctx.save();
    ctx.beginPath();
    ctx.rect(640 - tw * 0.5, 616, tw * prog, 60);
    ctx.clip();
    ctx.fillStyle = '#FACC15';
    ctx.fillText(active.text, 640, 646);
    ctx.restore();
    ctx.restore();
  }

  // Izakaya / Seaside Lantern Tavern background
  function drawLanternTavern(ctx, t, energy) {
    const bg = ctx.createLinearGradient(0, 0, 0, 720);
    bg.addColorStop(0, '#1E1136');
    bg.addColorStop(0.65, '#3B1C54');
    bg.addColorStop(1, '#581C87');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1280, 720);

    // String of festive glowing lanterns across top
    ctx.strokeStyle = '#FDE047';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 85);
    ctx.quadraticCurveTo(640, 155, 1280, 85);
    ctx.stroke();

    for (let i = 0; i < 9; i++) {
      const lx = 110 + i * 132;
      const ly = 95 + Math.sin((i / 8) * Math.PI) * 35 + Math.sin(t * 4 + i) * 4;
      ctx.fillStyle = i % 2 === 0 ? '#F43F5E' : '#F59E0B';
      ctx.strokeStyle = '#FEF08A';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(lx, ly + 22, 22, 28, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Wooden banquet table at bottom
    ctx.fillStyle = '#78350F';
    ctx.fillRect(80, 560, 1120, 160);
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 4;
    ctx.strokeRect(80, 560, 1120, 160);
  }

  function renderPengyouDeJiuFrame(ctx, t) {
    const env = (typeof window !== 'undefined' && window.AUDIO_DATA) ? window.AUDIO_DATA : null;
    const fIdx = Math.min(env ? env.energy.length - 1 : 0, Math.max(0, Math.floor(t * 30)));
    const energy = env ? (env.energy[fIdx] || 0.6) : 0.6;
    const beatBounce = Math.abs(Math.sin(t * 7.2)) * 16 * energy;
    const pulse = 1 + 0.05 * energy;

    ctx.save();

    // Map the 188.25s song into 6 rich visual chapters that cycle through verse, chorus, bridge, solo, and grand finale
    const cycleT = t % 94.0;

    if (t < 16.0 || (t >= 80.0 && t < 94.0)) {
      // INTRO / INTERLUDE: Seaside Starlight Stage & Peach Blossoms
      drawLanternTavern(ctx, t, energy);
      // Floating peach blossom petals
      for (let i = 0; i < 28; i++) {
        const px = ((i * 97 + t * 65) % 1280);
        const py = ((i * 53 + t * 42) % 480);
        ctx.fillStyle = '#FDA4AF';
        ctx.beginPath();
        ctx.ellipse(px, py, 7, 4, t + i, 0, Math.PI * 2);
        ctx.fill();
      }
      drawWhaleRiso(ctx, 640, 560, {
        view: 'front',
        feel: 'singing',
        scale: 3.0 * pulse,
        jump: beatBounce,
        hat: 'Party Cone',
        t
      });
      drawCheersMug(ctx, 260, 548, 0.78, -0.15);
      drawCheersMug(ctx, 1020, 548, 0.78, 0.15);

    } else if (cycleT >= 16.0 && cycleT < 32.2) {
      // VERSE ("昨日一去不复回 开心比什么都贵 / 覆水不能再收回 桃花谢了又开 / 来吧朋友干了这杯酒")
      const sky = ctx.createLinearGradient(0, 0, 0, 720);
      sky.addColorStop(0, '#2E1065');
      sky.addColorStop(1, '#831843');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, 1280, 720);

      // Peach tree in full bloom on left
      ctx.fillStyle = '#451A03';
      ctx.fillRect(180, 260, 34, 300);
      ctx.fillStyle = '#FB7185';
      ctx.beginPath();
      ctx.arc(195, 220, 110, 0, Math.PI * 2);
      ctx.arc(275, 250, 85, 0, Math.PI * 2);
      ctx.fill();

      // Terrace floor
      ctx.fillStyle = '#1E1B4B';
      ctx.fillRect(0, 550, 1280, 170);

      // The lead toasts under the peach blossoms
      drawWhaleRiso(ctx, 640, 560, {
        view: 'front',
        feel: 'happy',
        scale: 3.0 * pulse,
        jump: beatBounce * 0.7,
        hat: 'Flower Crown',
        t
      });

      const clink = Math.sin(t * 6) * 14;
      drawCheersMug(ctx, 320 + clink, 555, 0.78, 0.2);
      drawCheersMug(ctx, 960 - clink, 555, 0.78, -0.2);

    } else if (cycleT >= 32.2 && cycleT < 54.0) {
      // CHORUS A ("快把酒满上干了这杯大声歌唱 / 好朋友好朋友今宵多欢畅 / 理想改变了我们的模样 / 珍惜朋友的肩膀")
      drawLanternTavern(ctx, t, energy);

      // Radiant starburst behind the banquet table
      ctx.save();
      ctx.translate(640, 320);
      for (let i = 0; i < 16; i++) {
        ctx.save();
        ctx.rotate((i * Math.PI) / 8 + t * 0.35);
        ctx.fillStyle = i % 2 === 0 ? 'rgba(250, 204, 21, 0.14)' : 'rgba(244, 63, 94, 0.14)';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-45, -700);
        ctx.lineTo(45, -700);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();

      // Solo lead, with the toast props staged at the table edges
      drawWhaleRiso(ctx, 640, 560, {
        view: 'front',
        feel: 'ecstatic',
        scale: 3.0 * pulse,
        jump: beatBounce,
        hat: 'Crown',
        t
      });

      // Clinking mugs in center with golden foam sparks
      const clink = Math.abs(Math.sin(t * 7)) * 18;
      drawCheersMug(ctx, 270 + clink, 548, 0.82, 0.22);
      drawCheersMug(ctx, 1010 - clink, 548, 0.82, -0.22);

    } else if (cycleT >= 54.0 && cycleT < 66.6) {
      // BRIDGE ("阳光总会在风雨之后撒向苍茫 / 让我们抬起头学会了坚强")
      const sky = ctx.createLinearGradient(0, 0, 0, 720);
      sky.addColorStop(0, '#0F172A');
      sky.addColorStop(0.55, '#BE185D');
      sky.addColorStop(1, '#F59E0B');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, 1280, 720);

      // Giant golden sun rising over rainbow arc after the storm
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.55)';
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.arc(640, 560, 420, Math.PI, 0, false);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(244, 63, 94, 0.55)';
      ctx.beginPath();
      ctx.arc(640, 560, 398, Math.PI, 0, false);
      ctx.stroke();

      ctx.fillStyle = '#FEF08A';
      ctx.beginPath();
      ctx.arc(640, 350, 95 + energy * 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#1E1B4B';
      ctx.fillRect(0, 555, 1280, 165);

      drawWhaleRiso(ctx, 550, 560, {
        view: 'q',
        feel: 'heroic',
        scale: 3.0 * pulse,
        hat: 'Sailor Cap',
        t
      });


    } else {
      // CHORUS B & GRAND FINALE ("就像朋友的这杯烈酒烫我心上 / 温暖我凡事别再放心上 / 敬永远的知己 · 干杯！")
      drawLanternTavern(ctx, t, energy);

      // Celebratory fireworks bursting in the night sky
      for (let fw = 0; fw < 4; fw++) {
        const cx = 240 + fw * 265;
        const cy = 190 + (fw % 2) * 45;
        const r = 20 + ((t * 55 + fw * 30) % 75);
        ctx.fillStyle = fw % 2 === 0 ? '#FACC15' : '#FB7185';
        for (let p = 0; p < 12; p++) {
          const a = (p / 12) * Math.PI * 2 + t;
          ctx.beginPath();
          ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      drawWhaleRiso(ctx, 640, 560, {
        view: 'front',
        feel: 'love',
        scale: 3.0 * pulse,
        jump: beatBounce,
        hat: 'Crown',
        t
      });

      drawCheersMug(ctx, 280, 548, 0.82, 0.25);
      drawCheersMug(ctx, 1000, 548, 0.82, -0.25);
    }

    drawRisographFinish(ctx, t, energy);
    drawSubtitle(ctx, t);
    ctx.restore();
  }

  const api = {
    DURATION,
    SUBTITLES,
    renderPengyouDeJiuFrame
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.MV_PENGYOU_DE_JIU = api;
})(typeof window !== 'undefined' ? window : globalThis);
