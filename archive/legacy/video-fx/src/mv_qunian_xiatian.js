// src/mv_qunian_xiatian.js — Director & Scene Engine for 《去年夏天》(王大毛 · 深海鲸鱼娘篇)
// 1:1 replication of `去年夏天.mp4` (78.20s, 30fps, 1280x720) using `whale_girl`
// (`src/whale_girl.js`) as protagonist, original extracted MP3 (`assets/qunian_xiatian.mp3`),
// and exact original subtitle beat-syncing (`0.0s .. 78.2s`) in `ukiyoe` warm woodblock style.

(function (root) {
  'use strict';

  const CORE = (typeof window !== 'undefined' && window.CORE) ? window.CORE : require('./core.js');
  const WHALE = (typeof window !== 'undefined' && window.WHALE_GIRL) ? window.WHALE_GIRL : require('./whale_girl.js');
  const CAST = (typeof window !== 'undefined' && window.CAST) ? window.CAST : require('./cast.js');
  const { whaleGirl, feel } = WHALE;

  function drawWhaleHero(ctx, x, y, opts = {}) {
    const t = opts.t || 0;
    const emo = opts.feel || 'happy';
    const u = (opts.scale || 2.35) * 11.5;
    const baseOps = Object.assign({}, feel(emo, t), opts, {
      view: opts.view || 'front',
      style: 'ukiyoe',
      constructMode: 'pixelRig',
      t
    });
    whaleGirl(ctx, x, y, u, baseOps);
  }

  const DURATION = 78.20;

  // Exact 1:1 subtitle timeline extracted from 去年夏天.mp4 (/tmp/qunian_subs.png)
  const SUBTITLES = [
    { t0: 0.2,  t1: 3.1,  text: '坏掉的脑子 啊疼不痛',           hi: '疼不痛' },
    { t0: 3.2,  t1: 5.7,  text: '这雨下得不合时宜',             hi: '不合时宜' },
    { t0: 6.2,  t1: 8.6,  text: '总会过分要命的闷',             hi: '要命的闷' },
    { t0: 8.7,  t1: 10.3, text: '在这个时候',                   hi: '这个时候' },
    { t0: 10.5, t1: 13.8, text: '我都会想象的念头',             hi: '念头' },
    { t0: 15.8, t1: 18.2, text: '别怕你就算我是你的',           hi: '别怕' },
    { t0: 18.3, t1: 20.3, text: '小小狗也总会被打痛',           hi: '被打痛' },
    { t0: 20.5, t1: 24.2, text: '意念中的开心 却总是被一次掏空', hi: '被一次掏空' },
    { t0: 24.4, t1: 26.7, text: '在去年夏天跟你说了',           hi: '去年夏天' },
    { t0: 26.8, t1: 28.3, text: '一个小小要求',                 hi: '要求' },
    { t0: 28.4, t1: 32.3, text: '答应了不放手',                 hi: '不放手' },
    { t0: 32.4, t1: 33.8, text: '还记得',                       hi: '还记得' },
    { t0: 35.8, t1: 38.6, text: '这故事中的人不太精彩',         hi: '不太精彩' },
    { t0: 38.8, t1: 40.6, text: '夏去了又回来',                 hi: '夏去了' },
    { t0: 40.8, t1: 42.3, text: '而人却已不在',                 hi: '不在' },
    { t0: 43.2, t1: 46.2, text: '它重复着我汹涌的忍耐',         hi: '汹涌' },
    { t0: 46.4, t1: 48.2, text: '我拿了总会还',                 hi: '还' },
    { t0: 48.3, t1: 50.0, text: '你拿了就逃开',                 hi: '逃开' },
    { t0: 50.2, t1: 54.2, text: '在失去中我慢慢的变呆',         hi: '变呆' },
    { t0: 54.4, t1: 58.2, text: '是不同步的未来',               hi: '未来' },
    { t0: 58.5, t1: 62.0, text: '却把记忆中的日记更改',         hi: '日记更改' },
    { t0: 62.3, t1: 64.0, text: '把虚伪的尘埃',                 hi: '尘埃' },
    { t0: 64.2, t1: 66.2, text: '也全部都掩盖',                 hi: '掩盖' },
    { t0: 66.5, t1: 70.0, text: '把每次心痛 都当成活该',         hi: '活该' },
    { t0: 70.4, t1: 73.9, text: '把心慢慢的释怀',               hi: '释怀' },
    { t0: 74.2, t1: 78.0, text: '我相信总有一天你会明白',       hi: '你会明白' }
  ];

  // Ukiyo-e paper grain & woodblock frame overlay
  function drawUkiyoeFinish(ctx, t, warmth = 0.0) {
    ctx.save();
    // Subtle horizontal woodblock print grain lines
    ctx.fillStyle = warmth > 0.5 ? 'rgba(254, 243, 199, 0.05)' : 'rgba(148, 163, 184, 0.04)';
    for (let y = 0; y < 720; y += 6) {
      ctx.fillRect(0, y, 1280, 1);
    }
    // Classic woodblock border trim
    ctx.strokeStyle = warmth > 0.5 ? 'rgba(180, 83, 9, 0.42)' : 'rgba(56, 189, 248, 0.32)';
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, 1260, 700);
    // Hanko red seal stamp in top-left corner
    ctx.fillStyle = '#B91C1C';
    ctx.fillRect(26, 24, 34, 34);
    ctx.strokeStyle = '#FEF2F2';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(29, 27, 28, 28);
    ctx.font = 'bold 14px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
    ctx.fillStyle = '#FEF2F2';
    ctx.textAlign = 'center';
    ctx.fillText('鲸夏', 43, 46);
    ctx.restore();
  }

  // Yellow Umbrella prop (open, closed, or wind-inverted)
  function drawYellowUmbrella(ctx, x, y, scale, mode = 'open', angle = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(scale, scale);

    if (mode === 'closed') {
      // Closed yellow umbrella pointing down-right
      ctx.strokeStyle = '#1E1B4B';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-8, -10);
      ctx.lineTo(28, 56);
      ctx.stroke();
      ctx.fillStyle = '#FACC15';
      ctx.beginPath();
      ctx.moveTo(0, 4);
      ctx.lineTo(30, 52);
      ctx.lineTo(14, 58);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (mode === 'inverted') {
      // Wind-blown inverted yellow umbrella (t=42..46s)
      ctx.strokeStyle = '#1E1B4B';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(0, 15);
      ctx.lineTo(-45, 75);
      ctx.stroke();
      ctx.fillStyle = '#FACC15';
      ctx.beginPath();
      ctx.moveTo(-95, -55);
      ctx.quadraticCurveTo(-10, 20, 0, 15);
      ctx.quadraticCurveTo(20, 10, 85, -75);
      ctx.quadraticCurveTo(35, -10, 0, -5);
      ctx.quadraticCurveTo(-35, -10, -95, -55);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      // Classic wide scalloped yellow umbrella canopy + handle
      ctx.strokeStyle = '#1E1B4B';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(0, -78);
      ctx.lineTo(0, 32);
      ctx.arc(-8, 32, 8, 0, Math.PI, false);
      ctx.stroke();

      ctx.fillStyle = '#FACC15';
      ctx.beginPath();
      ctx.arc(0, -68, 98, Math.PI, 0, false);
      // Scalloped bottom rim
      ctx.quadraticCurveTo(65, -82, 32, -68);
      ctx.quadraticCurveTo(0, -82, -32, -68);
      ctx.quadraticCurveTo(-65, -82, -98, -68);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Umbrella ribs
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -166);
      ctx.quadraticCurveTo(-35, -120, -32, -68);
      ctx.moveTo(0, -166);
      ctx.quadraticCurveTo(35, -120, 32, -68);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Golden heart half or whole prop
  function drawGoldenHeart(ctx, x, y, scale, side = 'both', brokenGap = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#1E1B4B';
    ctx.fillStyle = '#FACC15';

    if (side === 'left' || side === 'both') {
      ctx.save();
      ctx.translate(-brokenGap, 0);
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.bezierCurveTo(-18, -32, -42, -10, 0, 26);
      ctx.lineTo(-4, 8);
      ctx.lineTo(4, -2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    if (side === 'right' || side === 'both') {
      ctx.save();
      ctx.translate(brokenGap, 0);
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.bezierCurveTo(18, -32, 42, -10, 0, 26);
      ctx.lineTo(-4, 8);
      ctx.lineTo(4, -2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  // Rainy Night City Street background (matches t=0..15s, 34..54s, 70..78s of 去年夏天.mp4)
  function drawNightCityStreet(ctx, t, withBench = false, withSnow = false, withStar = false) {
    // Deep indigo night sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, 485);
    sky.addColorStop(0, '#1E1B4B');
    sky.addColorStop(1, '#312E81');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 1280, 485);

    // Background city apartment silhouettes & warm lit windows
    const buildings = [
      { x: -10, w: 150, h: 250 },
      { x: 130, w: 175, h: 310 },
      { x: 295, w: 145, h: 220 },
      { x: 430, w: 190, h: 290 },
      { x: 610, w: 155, h: 240 },
      { x: 755, w: 185, h: 320 },
      { x: 930, w: 165, h: 260 },
      { x: 1085, w: 205, h: 295 }
    ];
    for (let b = 0; b < buildings.length; b++) {
      const bd = buildings[b];
      const by = 485 - bd.h;
      ctx.fillStyle = b % 2 === 0 ? '#312E81' : '#3730A3';
      ctx.strokeStyle = '#1E1B4B';
      ctx.lineWidth = 3;
      ctx.fillRect(bd.x, by, bd.w, bd.h);
      ctx.strokeRect(bd.x, by, bd.w, bd.h);

      // Lit yellow windows
      for (let wy = by + 24; wy < 460; wy += 44) {
        for (let wx = bd.x + 18; wx < bd.x + bd.w - 32; wx += 42) {
          if (((wx * 7 + wy * 13 + b) % 5) !== 0) {
            ctx.fillStyle = '#FDE047';
            ctx.fillRect(wx, wy, 24, 24);
          }
        }
      }
    }

    // Sidewalk & puddles
    ctx.fillStyle = '#475569';
    ctx.fillRect(0, 485, 1280, 235);
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 485);
    ctx.lineTo(1280, 485);
    ctx.stroke();

    // Puddle ellipses with ripples
    const puddles = [
      { x: 240, y: 575, rx: 85, ry: 22 },
      { x: 640, y: 605, rx: 110, ry: 26 },
      { x: 980, y: 565, rx: 95, ry: 24 }
    ];
    for (const p of puddles) {
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
      ctx.lineWidth = 2;
      const rScale = 0.4 + 0.6 * ((t * 1.4 + p.x * 0.01) % 1);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.rx * rScale, p.ry * rScale, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Streetlamp with warm cone of light
    const lampX = withBench ? 940 : 490;
    ctx.strokeStyle = '#1E1B4B';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(lampX, 495);
    ctx.lineTo(lampX, 145);
    ctx.lineTo(lampX + 42, 145);
    ctx.stroke();
    ctx.fillStyle = '#FEF08A';
    ctx.beginPath();
    ctx.arc(lampX + 42, 152, 14, 0, Math.PI * 2);
    ctx.fill();
    const cone = ctx.createRadialGradient(lampX + 42, 152, 10, lampX + 42, 380, 280);
    cone.addColorStop(0, 'rgba(254, 240, 138, 0.36)');
    cone.addColorStop(1, 'rgba(254, 240, 138, 0)');
    ctx.fillStyle = cone;
    ctx.beginPath();
    ctx.moveTo(lampX + 20, 152);
    ctx.lineTo(lampX - 180, 560);
    ctx.lineTo(lampX + 260, 560);
    ctx.closePath();
    ctx.fill();

    // Optional park trees & wooden bench (for t=34..42s)
    if (withBench) {
      // Trees on left
      for (const tx of [140, 310]) {
        ctx.fillStyle = '#78350F';
        ctx.fillRect(tx - 12, 310, 24, 185);
        ctx.fillStyle = withSnow ? '#E2E8F0' : '#4D7C0F';
        ctx.strokeStyle = '#1E1B4B';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(tx, 275, 65, 0, Math.PI * 2);
        ctx.arc(tx - 45, 305, 48, 0, Math.PI * 2);
        ctx.arc(tx + 45, 305, 48, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      // Wooden park bench
      ctx.fillStyle = '#92400E';
      ctx.strokeStyle = '#1E1B4B';
      ctx.lineWidth = 4;
      ctx.fillRect(520, 445, 290, 24);
      ctx.strokeRect(520, 445, 290, 24);
      ctx.fillRect(510, 475, 310, 20);
      ctx.strokeRect(510, 475, 310, 20);
      ctx.fillRect(545, 495, 18, 42);
      ctx.fillRect(765, 495, 18, 42);
    }

    // Optional glowing golden star in sky (t=74..78s)
    if (withStar) {
      ctx.save();
      ctx.translate(820, 95);
      ctx.rotate(Math.sin(t * 2.5) * 0.15);
      ctx.fillStyle = '#FACC15';
      ctx.strokeStyle = '#1E1B4B';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? 28 : 12;
        const a = (i * Math.PI) / 5 - Math.PI / 2;
        if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Diagonal rain streaks (or snow)
    ctx.strokeStyle = withSnow ? 'rgba(248, 250, 252, 0.75)' : 'rgba(148, 163, 184, 0.42)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 55; i++) {
      const rx = ((i * 97 - t * 180) % 1320 + 1320) % 1320 - 20;
      const ry = ((i * 61 + t * 520) % 680);
      if (withSnow) {
        ctx.fillStyle = '#F8FAFC';
        ctx.beginPath();
        ctx.arc(rx, ry, 4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - 10, ry + 26);
        ctx.stroke();
      }
    }
  }

  // Warm Golden Summer Memory Street (matches t=15.5..32.5s of 去年夏天.mp4)
  function drawWarmSummerStreet(ctx, t) {
    const sky = ctx.createLinearGradient(0, 0, 0, 485);
    sky.addColorStop(0, '#FDE68A');
    sky.addColorStop(1, '#FED7AA');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 1280, 485);

    // Warm brick buildings
    for (let b = 0; b < 6; b++) {
      const bx = 40 + b * 205;
      const bh = 230 + (b % 3) * 45;
      const by = 485 - bh;
      ctx.fillStyle = b % 2 === 0 ? '#D97706' : '#B45309';
      ctx.strokeStyle = '#451A03';
      ctx.lineWidth = 3;
      ctx.fillRect(bx, by, 175, bh);
      ctx.strokeRect(bx, by, 175, bh);
      for (let wy = by + 26; wy < 460; wy += 48) {
        ctx.fillStyle = '#FEF3C7';
        ctx.fillRect(bx + 24, wy, 45, 32);
        ctx.fillRect(bx + 96, wy, 45, 32);
      }
    }

    // Summer green trees on left and right
    for (const tx of [95, 1185]) {
      ctx.fillStyle = '#78350F';
      ctx.fillRect(tx - 14, 260, 28, 225);
      ctx.fillStyle = '#65A30D';
      ctx.strokeStyle = '#365314';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(tx, 210, 82, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Warm sandstone sidewalk
    ctx.fillStyle = '#FDE68A';
    ctx.fillRect(0, 485, 1280, 235);
    ctx.strokeStyle = '#92400E';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 485);
    ctx.lineTo(1280, 485);
    ctx.stroke();

    // Floating golden summer sparkles
    for (let i = 0; i < 24; i++) {
      const sx = (i * 113 + Math.sin(t + i) * 30) % 1280;
      const sy = (i * 59 + t * 25) % 460;
      ctx.fillStyle = 'rgba(254, 240, 138, 0.75)';
      ctx.beginPath();
      ctx.arc(sx, sy, 3 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Stylized kinetic subtitle renderer matching `去年夏天.mp4` (white text + golden pop highlight word)
  function drawSubtitle(ctx, t) {
    let active = null;
    for (let i = 0; i < SUBTITLES.length; i++) {
      if (t >= SUBTITLES[i].t0 && t < SUBTITLES[i].t1) {
        active = SUBTITLES[i];
        break;
      }
    }
    if (!active) return;

    const prog = Math.min(1, (t - active.t0) / Math.max(0.25, (active.t1 - active.t0) * 0.45));
    const visCount = Math.max(1, Math.ceil(active.text.length * prog));
    const shown = active.text.slice(0, visCount);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Subtitle backdrop pill
    ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(350, 622, 580, 56, 14);
    ctx.fill();
    ctx.stroke();

    const hasHi = active.hi && shown.includes(active.hi);
    const pop = hasHi ? (1 + 0.06 * Math.sin((t - active.t0) * 10)) : 1;
    ctx.save();
    ctx.translate(640, 650);
    ctx.scale(pop, pop);
    ctx.font = 'bold 30px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#0F172A';
    ctx.strokeText(shown, 0, 0);
    ctx.fillStyle = hasHi ? '#FACC15' : '#F8FAFC';
    ctx.fillText(shown, 0, 0);
    ctx.restore();
    ctx.restore();
  }

  function renderQunianXiatianFrame(ctx, t) {
    const env = (typeof window !== 'undefined' && window.AUDIO_DATA) ? window.AUDIO_DATA : null;
    const fIdx = Math.min(env ? env.energy.length - 1 : 0, Math.max(0, Math.floor(t * 30)));
    const energy = env ? (env.energy[fIdx] || 0.3) : 0.3;
    const beatPulse = 1 + 0.04 * energy;

    ctx.save();

    if (t < 5.8) {
      // ACT 1 (0.0–5.8s): Night city street under streetlamp, opening yellow umbrella + white storm clouds
      drawNightCityStreet(ctx, t, false, false, false);
      if (t >= 3.2) {
        // White storm cloud bubbles overhead (matching t=4..6s)
        ctx.fillStyle = '#FEFCE8';
        ctx.strokeStyle = '#1E1B4B';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(480, 120, 75, 0, Math.PI * 2);
        ctx.arc(560, 130, 88, 0, Math.PI * 2);
        ctx.arc(410, 145, 58, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      drawYellowUmbrella(ctx, 690, 480, 1.0, 'closed', 0.35);
      drawWhaleHero(ctx, 640, 565, {
        view: 'front',
        feel: t < 3.2 ? 'dizzy' : 'sad',
        scale: 2.35 * beatPulse,
        hat: 'Side Bow',
        t
      });
      drawUkiyoeFinish(ctx, t, 0.1);

    } else if (t < 10.2) {
      // ACT 2 (5.8–10.2s): Rainy horizontal crosswalk stripes ("总会过分要命的闷 / 在这个时候")
      ctx.fillStyle = '#312E81';
      ctx.fillRect(0, 0, 1280, 720);
      for (let y = 30; y < 720; y += 72) {
        ctx.fillStyle = 'rgba(148, 163, 184, 0.32)';
        ctx.fillRect(0, y, 1280, 36);
      }
      drawYellowUmbrella(ctx, 640, 385, 1.35, 'open', Math.sin(t * 2) * 0.05);
      drawWhaleHero(ctx, 640, 560, {
        view: 'front',
        feel: 'Down',
        scale: 2.35 * beatPulse,
        hat: 'Side Bow',
        t
      });
      drawUkiyoeFinish(ctx, t, 0.1);

    } else if (t < 15.5) {
      // ACT 3 (10.2–15.5s): Under yellow umbrella in rainy night + stepping on glowing golden star puddle (t=13.5..15.5s)
      drawNightCityStreet(ctx, t, false, false, false);
      if (t >= 13.2) {
        const rippleR = 30 + (t - 13.2) * 55;
        ctx.strokeStyle = '#FACC15';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(690, 590, rippleR, rippleR * 0.32, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#FACC15';
        ctx.beginPath();
        ctx.arc(690, 590, 12, 0, Math.PI * 2);
        ctx.fill();
      }
      drawYellowUmbrella(ctx, 600, 365, 1.35, 'open', -0.12);
      drawWhaleHero(ctx, 610, 555, {
        view: 'q',
        feel: t >= 13.2 ? 'curious' : 'wistful',
        scale: 2.35 * beatPulse,
        jump: t >= 13.2 ? Math.abs(Math.sin(t * 6)) * 18 : 0,
        hat: 'Side Bow',
        t
      });
      drawUkiyoeFinish(ctx, t, 0.2);

    } else if (t < 24.3) {
      // ACT 4 (15.5–24.3s): Warm summer street with companion & broken golden heart in chest ("别怕... 却总是被一次掏空")
      drawWarmSummerStreet(ctx, t);
      drawWhaleHero(ctx, 545, 560, {
        view: 'q',
        feel: t < 20.3 ? 'happy' : 'heartbreak',
        scale: 2.35 * beatPulse,
        hat: 'Summer Straw Hat',
        t
      });
      drawWhaleHero(ctx, 735, 560, {
        view: 'q',
        flip: true,
        feel: 'warm',
        scale: 2.25 * beatPulse,
        hat: 'Star Hairpin',
        t: t + 0.6
      });
      if (t >= 20.3) {
        drawGoldenHeart(ctx, 545, 470, 1.15, 'both', 8);
      } else {
        drawGoldenHeart(ctx, 640, 330, 1.1, 'both', 0);
      }
      drawUkiyoeFinish(ctx, t, 0.85);

    } else if (t < 32.5) {
      // ACT 5 (24.3–32.5s): Sharing the big yellow umbrella in summer sun & holding two halves of a golden heart ("答应了不放手")
      drawWarmSummerStreet(ctx, t);
      drawYellowUmbrella(ctx, 640, 345, 1.65, 'open', Math.sin(t * 2.2) * 0.06);
      drawWhaleHero(ctx, 555, 565, {
        view: 'front',
        feel: 'love',
        scale: 2.3 * beatPulse,
        hat: 'Summer Straw Hat',
        t
      });
      drawWhaleHero(ctx, 725, 565, {
        view: 'front',
        flip: true,
        feel: 'happy',
        scale: 2.25 * beatPulse,
        hat: 'Star Hairpin',
        t: t + 0.4
      });
      drawGoldenHeart(ctx, 640, 485, 1.3, 'both', t < 28.4 ? 10 : 2);
      drawUkiyoeFinish(ctx, t, 0.9);

    } else if (t < 34.0) {
      // ACT 6A (32.5–34.0s): Bright white memory flash ("还记得")
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(0, 0, 1280, 720);
      drawWhaleHero(ctx, 640, 560, {
        view: 'front',
        feel: 'surprised',
        scale: 2.35,
        hat: 'Side Bow',
        t
      });
      drawUkiyoeFinish(ctx, t, 0.5);

    } else if (t < 42.2) {
      // ACT 6B (34.0–42.2s): Sitting on park bench at night under yellow umbrella; seasons pass & ghost memory fades ("夏去了又回来 / 而人却已不在")
      const isWinter = t >= 39.2 && t < 41.2;
      drawNightCityStreet(ctx, t, true, isWinter, false);
      drawYellowUmbrella(ctx, 635, 340, 1.45, 'open', 0.14);
      if (t >= 39.5) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, 0.55 - (t - 39.5) * 0.22);
        drawWhaleHero(ctx, 720, 535, {
          view: 'front',
          flip: true,
          feel: 'wistful',
          scale: 2.15,
          hat: 'Star Hairpin',
          t
        });
        ctx.restore();
      }
      drawWhaleHero(ctx, 595, 535, {
        view: 'front',
        feel: 'lonely',
        scale: 2.25 * beatPulse,
        hat: 'Side Bow',
        t
      });
      drawUkiyoeFinish(ctx, t, 0.15);

    } else if (t < 46.2) {
      // ACT 7 (42.2–46.2s): Gale blows yellow umbrella inside-out ("它重复着我汹涌的忍耐")
      drawNightCityStreet(ctx, t, false, false, false);
      drawYellowUmbrella(ctx, 730, 390, 1.4, 'inverted', 0.35 + Math.sin(t * 10) * 0.08);
      drawWhaleHero(ctx, 590, 560, {
        view: 'q',
        feel: 'anxious',
        scale: 2.35 * beatPulse,
        smear: 0.35,
        hat: 'Side Bow',
        t
      });
      drawUkiyoeFinish(ctx, t, 0.1);

    } else if (t < 50.0) {
      // ACT 8 (46.2–50.0s): Holding out left half of golden heart while partner walks away with right half ("我拿了总会还 / 你拿了就逃开")
      drawNightCityStreet(ctx, t, false, false, false);
      drawYellowUmbrella(ctx, 520, 355, 1.35, 'open', 0.12);
      drawWhaleHero(ctx, 490, 560, {
        view: 'q',
        feel: 'sad',
        scale: 2.3 * beatPulse,
        hat: 'Side Bow',
        t
      });
      drawGoldenHeart(ctx, 585, 470, 1.15, 'left', 0);

      const walkX = 760 + (t - 46.2) * 55;
      drawWhaleHero(ctx, walkX, 560, {
        view: 'q',
        feel: 'wistful',
        scale: 2.15,
        hat: 'Star Hairpin',
        t
      });
      drawGoldenHeart(ctx, walkX + 55, 470, 1.15, 'right', 0);
      drawUkiyoeFinish(ctx, t, 0.15);

    } else if (t < 54.2) {
      // ACT 9 (50.0–54.2s): Dropping yellow umbrella in the rain ("在失去中我慢慢的变呆")
      drawNightCityStreet(ctx, t, false, false, false);
      drawYellowUmbrella(ctx, 760, 525, 1.25, 'open', 1.35);
      drawWhaleHero(ctx, 520, 560, {
        view: 'front',
        feel: 'hollow',
        scale: 2.35,
        hat: 'None',
        t
      });
      drawUkiyoeFinish(ctx, t, 0.05);

    } else if (t < 58.2) {
      // ACT 10 (54.2–58.2s): Split-screen tear — rainy night left vs warm golden afternoon right with unsynced clocks ("是不同步的未来")
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, 640, 720);
      ctx.clip();
      drawNightCityStreet(ctx, t, false, false, false);
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.rect(640, 0, 640, 720);
      ctx.clip();
      drawWarmSummerStreet(ctx, t);
      ctx.restore();

      // Jagged tear down center
      ctx.strokeStyle = '#1E1B4B';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(640, 0);
      for (let y = 0; y <= 720; y += 45) {
        ctx.lineTo(640 + ((y / 45) % 2 === 0 ? -14 : 14), y);
      }
      ctx.stroke();

      // Two clocks showing different times
      for (const clk of [{ x: 460, ang: t * 0.8 }, { x: 820, ang: t * 3.4 + 2.1 }]) {
        ctx.fillStyle = '#FEFCE8';
        ctx.strokeStyle = '#1E1B4B';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(clk.x, 150, 48, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(clk.x, 150);
        ctx.lineTo(clk.x + Math.cos(clk.ang) * 32, 150 + Math.sin(clk.ang) * 32);
        ctx.moveTo(clk.x, 150);
        ctx.lineTo(clk.x + Math.cos(clk.ang * 0.2) * 22, 150 + Math.sin(clk.ang * 0.2) * 22);
        ctx.stroke();
      }

      drawYellowUmbrella(ctx, 515, 365, 1.25, 'open', 0);
      drawWhaleHero(ctx, 515, 565, {
        view: 'front',
        feel: 'sad',
        scale: 2.25 * beatPulse,
        hat: 'Side Bow',
        t
      });
      drawWhaleHero(ctx, 775, 565, {
        view: 'front',
        feel: 'wistful',
        scale: 2.25 * beatPulse,
        hat: 'Summer Straw Hat',
        t
      });
      drawUkiyoeFinish(ctx, t, 0.45);

    } else if (t < 70.0) {
      // ACT 11 (58.2–70.0s): Warm desk lamp & opening/closing the photo diary ("却把记忆中的日记更改 / 把虚伪的尘埃 / 也全部都掩盖 / 把每次心痛 都当成活该")
      ctx.fillStyle = '#1E1B4B';
      ctx.fillRect(0, 0, 1280, 430);
      // Warm wooden desk
      ctx.fillStyle = '#78350F';
      ctx.fillRect(0, 430, 1280, 290);
      ctx.strokeStyle = '#451A03';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(0, 430);
      ctx.lineTo(1280, 430);
      ctx.stroke();

      // Desk lamp on right casting warm glow
      ctx.strokeStyle = '#1E1B4B';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(1060, 430);
      ctx.lineTo(1110, 290);
      ctx.lineTo(1010, 250);
      ctx.stroke();
      ctx.fillStyle = '#FACC15';
      ctx.beginPath();
      ctx.moveTo(1010, 250);
      ctx.lineTo(960, 290);
      ctx.lineTo(1035, 310);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // WhaleGirl behind the desk
      drawWhaleHero(ctx, 430, 435, {
        view: 'front',
        feel: t < 66.2 ? 'wistful' : 'Calm',
        scale: 2.35 * beatPulse,
        hat: 'Headphones',
        t
      });

      if (t < 66.2) {
        // Open diary book on desk showing photo of yellow umbrella & golden dust particles
        ctx.fillStyle = '#FEFCE8';
        ctx.strokeStyle = '#1E1B4B';
        ctx.lineWidth = 5;
        ctx.fillRect(420, 445, 440, 165);
        ctx.strokeRect(420, 445, 440, 165);
        ctx.beginPath();
        ctx.moveTo(640, 445);
        ctx.lineTo(640, 610);
        ctx.stroke();
        // Photo on right page
        const dustAlpha = t >= 62.2 ? Math.min(0.85, (t - 62.2) * 0.25) : 0;
        ctx.fillStyle = '#FDE68A';
        ctx.fillRect(680, 470, 140, 115);
        ctx.strokeRect(680, 470, 140, 115);
        drawYellowUmbrella(ctx, 750, 555, 0.45, 'open', 0);
        if (dustAlpha > 0) {
          ctx.fillStyle = `rgba(217, 119, 6, ${dustAlpha})`;
          ctx.fillRect(680, 470, 140, 115);
        }
      } else {
        // Closed red heart diary book on desk (t=66.2..70.0s)
        ctx.fillStyle = '#DC2626';
        ctx.strokeStyle = '#1E1B4B';
        ctx.lineWidth = 5;
        ctx.fillRect(530, 455, 220, 145);
        ctx.strokeRect(530, 455, 220, 145);
        drawGoldenHeart(ctx, 640, 528, 0.75, 'both', 0);
      }
      drawUkiyoeFinish(ctx, t, 0.65);

    } else {
      // ACT 12 (70.0–78.2s): Folding the yellow umbrella under the streetlamp & looking up at the golden star ("把心慢慢的释怀 / 我相信总有一天你会明白")
      drawNightCityStreet(ctx, t, false, false, t >= 74.0);
      if (t < 72.5) {
        drawYellowUmbrella(ctx, 640, 355, 1.35, 'open', 0);
      } else {
        drawYellowUmbrella(ctx, 695, 485, 1.05, 'closed', 0.3);
      }
      drawWhaleHero(ctx, 640, 560, {
        view: 'front',
        feel: 'hopeful',
        scale: 2.4 * beatPulse,
        hat: 'Star Hairpin',
        t
      });
      CAST.miniWhale(ctx, 470, 450 + Math.sin(t * 3) * 10, 18, { t });
      drawUkiyoeFinish(ctx, t, 0.4);
    }

    // Song badge in top-right
    ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
    ctx.fillRect(980, 22, 272, 36);
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(980, 22, 272, 36);
    ctx.font = 'bold 16px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
    ctx.fillStyle = '#FACC15';
    ctx.textAlign = 'right';
    ctx.fillText('《去年夏天》 · 浮世绘鲸鱼娘篇', 1240, 45);

    drawSubtitle(ctx, t);
    ctx.restore();
  }

  const api = {
    DURATION,
    SUBTITLES,
    renderQunianXiatianFrame
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.MV_QUNIAN_XIATIAN = api;
})(typeof window !== 'undefined' ? window : globalThis);
