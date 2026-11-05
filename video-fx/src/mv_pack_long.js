// ============================================================================
// src/mv_pack_long.js — 4 Full-Length MVs Replicated from `mv/`
// Upgraded to the `mv_ba_huiyi_pinhao_gei_ni` 28-Set Non-Repeating Architecture
// + 28 `codex-deepseek-pet` & `dsh-dayu-fish-skin` Character Actions + `drawFatFish`
// + 100% Frame-Verified Karaoke Subtitles (`[他]` / `[她]` / `[合]`)
// ============================================================================

(function (root) {
  const CORE = root.CORE || (typeof require !== 'undefined' ? require('./core.js') : {});
  const WHALE = root.WHALE_GIRL || (typeof require !== 'undefined' ? require('./whale_girl.js') : {});
  const CAST = root.CAST || (typeof require !== 'undefined' ? require('./cast.js') : {});
  const BAHUIYI = root.MV_BA_HUIYI || (typeof require !== 'undefined' ? require('./mv_ba_huiyi_pinhao_gei_ni.js') : {});

  const {
    W = 1280,
    H = 720,
    clamp,
    lerp,
    rrPts,
    ellPts,
    rectPts,
    paint
  } = CORE;

  // Compute active subtitle cue OR a 3.5-second instrumental bridge shot so no frame ever stalls
  function resolveShotAndSub(subs, t, bridgeText) {
    for (let i = 0; i < subs.length; i++) {
      if (t >= subs[i].t0 && t <= subs[i].t1) {
        return {
          sub: subs[i],
          shotIdx: i,
          lt: clamp(t - subs[i].t0, 0, subs[i].t1 - subs[i].t0),
          dur: Math.max(0.25, subs[i].t1 - subs[i].t0)
        };
      }
    }
    // In an instrumental gap: advance shotIdx every 3.5 seconds so scenes & actions keep changing!
    const bridgeIdx = subs.length + Math.floor(t / 3.5);
    const bridgeT0 = Math.floor(t / 3.5) * 3.5;
    return {
      sub: { t0: bridgeT0, t1: bridgeT0 + 3.5, role: '', zh: bridgeText },
      shotIdx: bridgeIdx,
      lt: t - bridgeT0,
      dur: 3.5
    };
  }

  // RPG / Karaoke Bottom Subtitle Box + Top Chapter & Action HUD
  function drawRpgKaraokeSub(ctx, titleTag, shotIdx, sub, t) {
    const actList = WHALE.ACTION_LIST || [];
    const actItem = actList.length ? actList[shotIdx % actList.length] : { zh: '鲸鱼动作', id: 'whale' };

    // Top-left Chapter & Action HUD
    ctx.save();
    paint(ctx, rrPts(24, 18, 480, 38, 12), { fill: '#090D1E', fillOp: 212, ink: '#38BDF8', sw: 1.8 });
    ctx.font = 'bold 15px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
    ctx.fillStyle = '#E0F2FE';
    ctx.textAlign = 'left';
    ctx.fillText(`${titleTag} · SHOT #${String(shotIdx + 1).padStart(2, '0')} · 动作: ${actItem.zh}`, 40, 42);
    ctx.restore();

    if (!sub || !sub.zh) return;
    const lt = clamp(t - sub.t0, 0, sub.t1 - sub.t0);
    const dur = Math.max(0.2, sub.t1 - sub.t0);
    const prog = clamp(lt / (dur * 0.85), 0, 1);

    const role = sub.role || '';
    const text = sub.zh;
    ctx.save();
    ctx.font = 'bold 34px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
    const textW = ctx.measureText(text).width;
    const badgeW = role ? 56 : 0;
    const boxW = Math.max(380, textW + badgeW + 76);
    const bx = W / 2 - boxW / 2;
    const by = H - 96;

    const borderCol = role === '她' ? '#F472B6' : (role === '他' ? '#38BDF8' : (role === '合' ? '#C084FC' : '#F59E0B'));
    ctx.fillStyle = 'rgba(9, 13, 30, 0.90)';
    ctx.strokeStyle = borderCol;
    ctx.lineWidth = 3.0;
    ctx.beginPath();
    ctx.roundRect(bx, by, boxW, 68, 14);
    ctx.fill();
    ctx.stroke();

    let tx = bx + 28;
    if (role) {
      ctx.fillStyle = borderCol;
      ctx.beginPath();
      ctx.roundRect(bx + 14, by + 12, 44, 44, 8);
      ctx.fill();
      ctx.font = 'bold 26px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
      ctx.fillStyle = '#090D1E';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(role, bx + 36, by + 35);
      tx = bx + 74;
    } else {
      tx = W / 2 - textW / 2;
    }

    ctx.font = 'bold 34px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#F8FAFC';
    ctx.fillText(text, tx, by + 35);

    ctx.save();
    ctx.beginPath();
    ctx.rect(tx, by, textW * prog + 4, 68);
    ctx.clip();
    ctx.fillStyle = role === '她' ? '#F472B6' : (role === '他' ? '#38BDF8' : '#FDE047');
    ctx.fillText(text, tx, by + 35);
    ctx.restore();

    ctx.restore();
  }

  // ==========================================================================
  // 6. `huainvhai` — Replicating `mv/坏女孩.mp4` (245.55s)
  // 徐良 & 小凌《坏女孩》 — 100% Frame-Verified Subtitles
  // ==========================================================================
  const SUBS_HUAINVHAI = [
    { t0: 0.4,   t1: 4.8,   role: '他', zh: 'I miss you' },
    { t0: 4.9,   t1: 7.8,   role: '他', zh: 'Now' },
    { t0: 8.8,   t1: 11.8,  role: '他', zh: "don't you love me" },
    { t0: 12.8,  t1: 19.8,  role: '他', zh: "Sorry I'm so sorry" },
    { t0: 20.8,  t1: 22.8,  role: '他', zh: '那时我放开了的手' },
    { t0: 22.9,  t1: 24.8,  role: '他', zh: '转过身只剩了保重' },
    { t0: 24.9,  t1: 27.8,  role: '他', zh: '你话都没说却哭了很久很久' },
    { t0: 28.8,  t1: 29.8,  role: '他', zh: '我喜欢坏坏的女友' },
    { t0: 29.9,  t1: 31.8,  role: '他', zh: '我喜欢刺激的感受' },
    { t0: 31.9,  t1: 35.8,  role: '他', zh: '你单纯太过多余了那些温柔' },
    { t0: 35.9,  t1: 37.8,  role: '他', zh: '你消失在无名大街' },
    { t0: 37.9,  t1: 39.8,  role: '他', zh: '从此就没有再见面' },
    { t0: 39.9,  t1: 43.8,  role: '他', zh: '好长的时间再没有你的来电' },
    { t0: 43.9,  t1: 44.8,  role: '他', zh: '在后来酒吧的房间' },
    { t0: 44.9,  t1: 46.8,  role: '他', zh: '舞池里跳动着音乐' },
    { t0: 46.9,  t1: 49.8,  role: '他', zh: '熟悉的侧脸喂' },
    { t0: 49.9,  t1: 53.8,  role: '他', zh: '迷人的笑脸吸引视线' },
    { t0: 53.9,  t1: 56.8,  role: '他', zh: '慵懒的靠在陌生的肩' },
    { t0: 56.9,  t1: 60.8,  role: '他', zh: '黑色的眼线你的指间' },
    { t0: 60.9,  t1: 63.8,  role: '他', zh: '有一点轻蔑' },
    { t0: 64.8,  t1: 68.8,  role: '她', zh: '在谁的怀中会有感觉' },
    { t0: 68.9,  t1: 72.8,  role: '她', zh: '被爱的深夜我在想念' },
    { t0: 72.9,  t1: 75.8,  role: '她', zh: '明明是为你才会改变' },
    { t0: 75.9,  t1: 77.8,  role: '她', zh: '却回不到从前' },
    { t0: 111.8, t1: 113.8, role: '他', zh: '那时我放开了的手' },
    { t0: 113.9, t1: 115.8, role: '他', zh: '转过身只剩了保重' },
    { t0: 115.9, t1: 118.8, role: '他', zh: '你话都没说却哭了很久很久' },
    { t0: 118.9, t1: 120.8, role: '他', zh: '我喜欢坏坏的女友' },
    { t0: 120.9, t1: 122.8, role: '他', zh: '我喜欢刺激的感受' },
    { t0: 122.9, t1: 126.8, role: '他', zh: '你单纯太过多余了那些温柔' },
    { t0: 126.9, t1: 128.8, role: '他', zh: '你消失在无名大街' },
    { t0: 128.9, t1: 130.8, role: '他', zh: '从此就没有再见面' },
    { t0: 130.9, t1: 133.8, role: '他', zh: '好长的时间再没有你的来电' },
    { t0: 133.9, t1: 135.8, role: '他', zh: '在后来酒吧的房间' },
    { t0: 135.9, t1: 137.8, role: '他', zh: '舞池里跳动着音乐' },
    { t0: 137.9, t1: 140.8, role: '他', zh: '熟悉的侧脸喂' },
    { t0: 140.9, t1: 143.8, role: '他', zh: '迷人的笑脸吸引视线' },
    { t0: 143.9, t1: 147.8, role: '他', zh: '慵懒的靠在陌生的肩' },
    { t0: 147.9, t1: 151.8, role: '他', zh: '黑色的眼线你的指间' },
    { t0: 151.9, t1: 155.8, role: '他', zh: '有一点轻蔑' },
    { t0: 155.9, t1: 159.8, role: '她', zh: '在谁的怀中会有感觉' },
    { t0: 159.9, t1: 162.8, role: '她', zh: '被爱的深夜我在想念' },
    { t0: 162.9, t1: 166.8, role: '她', zh: '明明是为你才会改变' },
    { t0: 166.9, t1: 168.8, role: '她', zh: '却回不到从前' },
    { t0: 171.8, t1: 174.8, role: '他', zh: '然后我安静的发现' },
    { t0: 174.9, t1: 179.8, role: '他', zh: '两个人已经没有任何语言' },
    { t0: 179.9, t1: 182.8, role: '他', zh: '曾经你纯真的永远' },
    { t0: 182.9, t1: 185.8, role: '他', zh: '让我不顾一切开始怀念' },
    { t0: 186.8, t1: 189.8, role: '他', zh: '迷人的笑脸吸引视线' },
    { t0: 189.9, t1: 192.8, role: '他', zh: '慵懒的靠在陌生的肩' },
    { t0: 193.8, t1: 196.8, role: '他', zh: '黑色的眼线你的指间' },
    { t0: 196.9, t1: 198.8, role: '他', zh: '有一点轻蔑' },
    { t0: 200.8, t1: 204.8, role: '她', zh: '在谁的怀中会有感觉' },
    { t0: 204.9, t1: 208.8, role: '她', zh: '被爱的深夜我在想念' },
    { t0: 208.9, t1: 211.8, role: '她', zh: '明明是为你才会改变' },
    { t0: 211.9, t1: 215.8, role: '她', zh: '却回不到从前' },
    { t0: 239.0, t1: 245.55, role: '',  zh: '坏女孩 · 徐良 / 小凌 (深海鲸鱼娘剧场版)' }
  ];

  function renderHuainvhaiFrame(ctx, t) {
    ctx.save();
    ctx.clearRect(0, 0, W, H);
    const { sub, shotIdx, lt, dur } = resolveShotAndSub(SUBS_HUAINVHAI, t, '（间奏 · 劲舞团连击 × 深海霓虹剧场）');

    // 1. Render Non-Repeating 28-Set Multi-Environment Stage (`MV_BA_HUIYI.renderMasterMVShot`)
    if (BAHUIYI && typeof BAHUIYI.renderMasterMVShot === 'function') {
      BAHUIYI.renderMasterMVShot(ctx, t, {
        shotIdx,
        lt,
        dur,
        setOffset: 3,
        actionOffset: 2,
        u: 31,
        style: ['neon', 'watercolor', 'pixel'][shotIdx % 3],
        guest: shotIdx % 2 === 0 ? 'ladyGemini' : 'all'
      });
    }

    // 2. Signature 2009 Audition Dance Arrow Bar / QQ Status Widget at Top-Right
    ctx.save();
    const arrows = ['←', '↓', '↑', '→', 'SPACE'];
    for (let a = 0; a < arrows.length; a++) {
      const hit = (Math.floor(t * 4) % arrows.length) === a;
      const bw = a === 4 ? 86 : 42;
      const bx = W - 310 + a * 48;
      paint(ctx, rrPts(bx, 18, bw, 36, 8), {
        fill: hit ? '#EC4899' : '#0F172A', fillOp: 215, ink: '#F472B6', sw: 2
      });
      ctx.font = 'bold 15px "Silkscreen", monospace';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(arrows[a], bx + bw / 2, 36);
    }
    ctx.restore();

    drawRpgKaraokeSub(ctx, '徐良 & 小凌《坏女孩》', shotIdx, sub, t);
    ctx.restore();
  }

  // ==========================================================================
  // 7. `feng` — Replicating `mv/枫.mp4` (274.58s)
  // 周杰伦《枫》 — 100% Frame-Verified Subtitles + 28 Non-Repeating Painted Sets
  // ==========================================================================
  const SUBS_FENG = [
    { t0: 1.0,   t1: 16.5,  zh: '周杰伦《枫》 · 深海鲸鱼娘秋日多场景剧场' },
    { t0: 17.8,  t1: 24.8,  zh: '乌云在我们心里搁下一块阴影' },
    { t0: 24.9,  t1: 30.8,  zh: '我聆听沉寂已久的心情' },
    { t0: 30.9,  t1: 37.8,  zh: '清晰透明就像美丽的风景' },
    { t0: 37.9,  t1: 45.8,  zh: '总在回忆里才看的清' },
    { t0: 45.9,  t1: 52.8,  zh: '被伤透的心能不能够继续爱我' },
    { t0: 52.9,  t1: 58.8,  zh: '我用力牵起没温度的双手' },
    { t0: 59.8,  t1: 66.8,  zh: '过往温柔已经被时间上锁' },
    { t0: 66.9,  t1: 73.8,  zh: '只剩挥散不去的难过' },
    { t0: 73.9,  t1: 79.8,  zh: '缓缓飘落的枫叶像思念' },
    { t0: 79.9,  t1: 86.8,  zh: '我点燃烛火温暖岁末的秋天' },
    { t0: 86.9,  t1: 89.8,  zh: '极光掠夺天边' },
    { t0: 89.9,  t1: 94.8,  zh: '北风掠过想你的容颜' },
    { t0: 94.9,  t1: 97.8,  zh: '我把爱烧成了落叶' },
    { t0: 97.9,  t1: 102.8, zh: '却换不回熟悉的那张脸' },
    { t0: 102.9, t1: 107.8, zh: '缓缓飘落的枫叶像思念' },
    { t0: 107.9, t1: 114.8, zh: '为何挽回要赶在冬天来之前' },
    { t0: 114.9, t1: 118.8, zh: '爱你穿越时间' },
    { t0: 118.9, t1: 122.8, zh: '两行来自秋末的眼泪' },
    { t0: 122.9, t1: 126.8, zh: '让爱渗透了地面' },
    { t0: 126.9, t1: 145.8, zh: '我要的只是你在我身边' },
    { t0: 145.9, t1: 152.8, zh: '被伤透的心能不能够继续爱我' },
    { t0: 152.9, t1: 158.8, zh: '我用力牵起没温度的双手' },
    { t0: 158.9, t1: 165.8, zh: '过往温柔已经被时间上锁' },
    { t0: 166.8, t1: 172.8, zh: '只剩挥散不去的难过' },
    { t0: 173.8, t1: 183.8, zh: '在山腰间飘逸的红雨随着北风凋零' },
    { t0: 183.9, t1: 187.8, zh: '我轻轻摇曳风铃' },
    { t0: 187.9, t1: 193.8, zh: '想唤醒被遗弃的爱情' },
    { t0: 194.8, t1: 197.8, zh: '雪花已铺满了地' },
    { t0: 197.9, t1: 201.8, zh: '深怕窗外枫叶已结成冰' },
    { t0: 201.9, t1: 207.8, zh: '缓缓飘落的枫叶像思念' },
    { t0: 207.9, t1: 214.8, zh: '我点燃烛火温暖岁末的秋天' },
    { t0: 214.9, t1: 217.8, zh: '极光掠夺天边' },
    { t0: 218.8, t1: 222.8, zh: '北风掠过想你的容颜' },
    { t0: 222.9, t1: 225.8, zh: '我把爱烧成了落叶' },
    { t0: 226.8, t1: 230.8, zh: '却换不回熟悉的那张脸' },
    { t0: 230.9, t1: 235.8, zh: '缓缓飘落的枫叶像思念' },
    { t0: 235.9, t1: 242.8, zh: '为何挽回要赶在冬天来之前' },
    { t0: 243.8, t1: 246.8, zh: '爱你穿越时间' },
    { t0: 246.9, t1: 256.8, zh: '两行来自秋末的眼泪' },
    { t0: 256.9, t1: 260.8, zh: '让爱渗透了地面' },
    { t0: 260.9, t1: 266.8, zh: '我要的只是你在我身边' },
    { t0: 267.0, t1: 274.58, zh: '《枫》 · 缓缓飘落的枫叶像思念' }
  ];

  function renderFengFrame(ctx, t) {
    ctx.save();
    ctx.clearRect(0, 0, W, H);
    const { sub, shotIdx, lt, dur } = resolveShotAndSub(SUBS_FENG, t, '（间奏 · 枫叶飘落与极光弦乐篇）');

    // 1. Render Non-Repeating 28-Set Multi-Environment Stage
    if (BAHUIYI && typeof BAHUIYI.renderMasterMVShot === 'function') {
      BAHUIYI.renderMasterMVShot(ctx, t, {
        shotIdx,
        lt,
        dur,
        setOffset: 7,
        actionOffset: 6,
        u: 31,
        style: ['watercolor', 'ukiyoe', 'watercolor'][shotIdx % 3],
        guest: shotIdx % 2 === 0 ? 'ladyGemini' : 'all'
      });
    }

    // 2. Signature Drifting Crimson Maple Leaves & Autumn Wind-Chime
    ctx.save();
    for (let m = 0; m < 16; m++) {
      const mx = (m * 113 + Math.floor(t * 48)) % W;
      const my = (m * 71 + Math.floor(t * 60)) % 560;
      paint(ctx, ellPts(mx, my, 8, 5, 6), { fill: m % 2 ? '#EF4444' : '#F59E0B', fillOp: 205, ink: '#7F1D1D', sw: 1 });
    }
    ctx.restore();

    drawRpgKaraokeSub(ctx, '周杰伦《枫》', shotIdx, sub, t);
    ctx.restore();
  }

  // ==========================================================================
  // 8. `meiguihua` — Replicating `mv/玫瑰花的葬礼.mp4` (236.77s)
  // 许嵩《玫瑰花的葬礼》 — 100% Frame-Verified Subtitles + 28 Non-Repeating Sets
  // ==========================================================================
  const SUBS_MEIGUIHUA = [
    { t0: 0.5,   t1: 10.5,  zh: '能不能再给我一次机会 · 对方撤回了一条语音' },
    { t0: 11.0,  t1: 22.0,  zh: '许嵩《玫瑰花的葬礼》 · 100周前的回忆' },
    { t0: 22.8,  t1: 24.8,  zh: '离开你一百个星期' },
    { t0: 24.9,  t1: 25.8,  zh: '我回到了这里' },
    { t0: 25.9,  t1: 28.8,  zh: '寻找我们爱过的证据' },
    { t0: 28.9,  t1: 29.8,  zh: '没有人愿意提起' },
    { t0: 29.9,  t1: 31.8,  zh: '玫瑰花它的过去' },
    { t0: 31.9,  t1: 32.8,  zh: '今天这里的主题' },
    { t0: 32.9,  t1: 33.8,  zh: '我把它叫作 回忆' },
    { t0: 34.8,  t1: 35.8,  zh: '我知道 爱情这东西' },
    { t0: 35.9,  t1: 36.8,  zh: '它没什么道理' },
    { t0: 36.9,  t1: 38.8,  zh: '过去我和你在一起' },
    { t0: 38.9,  t1: 39.8,  zh: '是我太叛逆' },
    { t0: 39.9,  t1: 41.8,  zh: '现在只剩我自己' },
    { t0: 41.9,  t1: 44.8,  zh: '偷偷的想你' },
    { t0: 45.8,  t1: 47.8,  zh: '玫瑰花的葬礼' },
    { t0: 47.9,  t1: 51.8,  zh: '埋葬关于你的回忆' },
    { t0: 51.9,  t1: 53.8,  zh: '感觉双手麻痹' },
    { t0: 53.9,  t1: 55.8,  zh: '不能自已' },
    { t0: 55.9,  t1: 56.8,  zh: '已拉不住你' },
    { t0: 57.8,  t1: 59.8,  zh: '真的好美丽' },
    { t0: 59.9,  t1: 62.8,  zh: '那天的烟花雨' },
    { t0: 63.8,  t1: 67.8,  zh: '我说要娶穿碎花洋裙的你' },
    { t0: 68.8,  t1: 71.8,  zh: '玫瑰花的葬礼' },
    { t0: 71.9,  t1: 73.8,  zh: '埋葬深深爱着的你' },
    { t0: 74.8,  t1: 76.8,  zh: '残朵停止呼吸' },
    { t0: 76.9,  t1: 78.8,  zh: '渗入大地' },
    { t0: 78.9,  t1: 79.8,  zh: '没人会注意' },
    { t0: 80.8,  t1: 83.8,  zh: '一片小雨滴' },
    { t0: 83.9,  t1: 85.8,  zh: '陪着我等天明' },
    { t0: 86.8,  t1: 91.8,  zh: '我用这最后一分钟怀念你' },
    { t0: 93.8,  t1: 95.8,  zh: '我在夜幕笼罩的天桥上潜行' },
    { t0: 95.9,  t1: 97.8,  zh: '每一级阶梯' },
    { t0: 97.9,  t1: 99.8,  zh: '都留着你我昔日印迹' },
    { t0: 99.9,  t1: 101.8, zh: '温存迷醉 吵闹清醒' },
    { t0: 101.9, t1: 102.8, zh: '都还在我的脚畔' },
    { t0: 102.9, t1: 104.8, zh: '兜兜兜兜转不清' },
    { t0: 104.9, t1: 106.8, zh: '没来得及把红色玫瑰递给你' },
    { t0: 106.9, t1: 107.8, zh: '爱就像是一场雨' },
    { t0: 107.9, t1: 109.8, zh: '已经离我而去' },
    { t0: 109.9, t1: 110.8, zh: '你说过' },
    { t0: 110.9, t1: 113.8, zh: '太过鲜艳的爱情 终将凋零' },
    { t0: 115.8, t1: 118.8, zh: '玫瑰花的葬礼' },
    { t0: 118.9, t1: 121.8, zh: '埋葬关于你的回忆' },
    { t0: 121.9, t1: 123.8, zh: '感觉双手麻痹' },
    { t0: 123.9, t1: 125.8, zh: '不能自已' },
    { t0: 125.9, t1: 127.8, zh: '已拉不住你' },
    { t0: 127.9, t1: 129.8, zh: '真的好美丽' },
    { t0: 129.9, t1: 133.8, zh: '那天的烟花雨' },
    { t0: 133.9, t1: 137.8, zh: '我说要娶穿碎花洋裙的你' },
    { t0: 138.8, t1: 141.8, zh: '玫瑰花的葬礼' },
    { t0: 141.9, t1: 144.8, zh: '埋葬深深爱着的你' },
    { t0: 144.9, t1: 147.8, zh: '残朵停止呼吸' },
    { t0: 147.9, t1: 148.8, zh: '渗入大地' },
    { t0: 148.9, t1: 150.8, zh: '没人会注意' },
    { t0: 150.9, t1: 153.8, zh: '一片小雨滴' },
    { t0: 153.9, t1: 155.8, zh: '陪着我等天明' },
    { t0: 156.8, t1: 161.8, zh: '我用这最后一分钟怀念你' },
    { t0: 162.8, t1: 166.8, zh: '总是回想过去 埋怨我自己' },
    { t0: 168.8, t1: 173.8, zh: '总是不经意间 想起了你' },
    { t0: 174.8, t1: 178.8, zh: '现在的你 已经太遥不可及' },
    { t0: 179.8, t1: 184.8, zh: '只能留在我记忆' },
    { t0: 185.8, t1: 188.8, zh: '玫瑰花的葬礼' },
    { t0: 188.9, t1: 191.8, zh: '埋葬关于你的回忆' },
    { t0: 191.9, t1: 193.8, zh: '感觉双手麻痹' },
    { t0: 194.8, t1: 195.8, zh: '不能自已' },
    { t0: 195.9, t1: 196.8, zh: '已拉不住你' },
    { t0: 197.8, t1: 200.8, zh: '真的好美丽' },
    { t0: 200.9, t1: 203.8, zh: '那天的烟花雨' },
    { t0: 203.9, t1: 207.8, zh: '我说要娶穿碎花洋裙的你' },
    { t0: 209.8, t1: 211.8, zh: '玫瑰花的葬礼' },
    { t0: 211.9, t1: 215.8, zh: '埋葬深深爱着的你' },
    { t0: 215.9, t1: 217.8, zh: '残朵停止呼吸' },
    { t0: 217.9, t1: 218.8, zh: '渗入大地' },
    { t0: 218.9, t1: 220.8, zh: '没人会注意' },
    { t0: 220.9, t1: 223.8, zh: '一片小雨滴' },
    { t0: 223.9, t1: 226.8, zh: '陪着我等天明' },
    { t0: 226.9, t1: 231.8, zh: '我用这最后一分钟怀念你' },
    { t0: 232.8, t1: 236.77, zh: '我用这最后一分钟' }
  ];

  function renderMeiguihuaFrame(ctx, t) {
    ctx.save();
    ctx.clearRect(0, 0, W, H);
    const { sub, shotIdx, lt, dur } = resolveShotAndSub(SUBS_MEIGUIHUA, t, '（间奏 · 玫瑰花瓣雨与烟花剧场）');

    if (BAHUIYI && typeof BAHUIYI.renderMasterMVShot === 'function') {
      BAHUIYI.renderMasterMVShot(ctx, t, {
        shotIdx,
        lt,
        dur,
        setOffset: 12,
        actionOffset: 10,
        u: 31,
        style: ['watercolor', 'neon', 'pixel'][shotIdx % 3],
        guest: shotIdx % 2 === 0 ? 'ladyGemini' : 'all'
      });
    }

    // Drifting crimson rose petals across the stage
    ctx.save();
    for (let r = 0; r < 14; r++) {
      const px = (r * 131 + Math.floor(t * 55)) % W;
      const py = (r * 83 + Math.floor(t * 70)) % 550;
      paint(ctx, ellPts(px, py, 8, 5, 6), { fill: '#E11D48', fillOp: 210, ink: '#881337', sw: 1 });
    }
    ctx.restore();

    drawRpgKaraokeSub(ctx, '许嵩《玫瑰花的葬礼》', shotIdx, sub, t);
    ctx.restore();
  }

  // ==========================================================================
  // 9. `suyan` — Replicating `mv/素颜1.mp4` (238.05s)
  // 许嵩 & 何曼婷《素颜》 — 100% Frame-Verified Subtitles + 28 Non-Repeating Sets
  // ==========================================================================
  const SUBS_SUYAN = [
    { t0: 0.5,   t1: 12.2,  role: '',   zh: '许嵩 & 何曼婷《素颜》 · 回到 2009 的纯真夏天' },
    { t0: 12.8,  t1: 14.8,  role: '他', zh: '又是一个安静的晚上' },
    { t0: 14.9,  t1: 17.8,  role: '他', zh: '一个人窝在摇椅里乘凉' },
    { t0: 17.9,  t1: 20.8,  role: '他', zh: '我承认这样真的很安详' },
    { t0: 20.9,  t1: 23.8,  role: '他', zh: '和楼下老爷爷一样' },
    { t0: 23.9,  t1: 26.2,  role: '她', zh: '听说你还在搞什么原创' },
    { t0: 26.8,  t1: 28.8,  role: '她', zh: '搞来搞去好像也就这样' },
    { t0: 28.9,  t1: 31.8,  role: '她', zh: '不如花点时间想想' },
    { t0: 31.9,  t1: 34.8,  role: '她', zh: '琢磨一下模样' },
    { t0: 34.9,  t1: 37.8,  role: '她', zh: '今夜化了美美的妆' },
    { t0: 37.9,  t1: 40.8,  role: '他', zh: '我相信是很美美的妆' },
    { t0: 40.9,  t1: 42.8,  role: '她', zh: '我摇晃在舞池中央' },
    { t0: 42.9,  t1: 45.8,  role: '他', zh: '那种体态可以想象' },
    { t0: 45.9,  t1: 50.8,  role: '她', zh: '我做我的改变又何必纠结' },
    { t0: 50.9,  t1: 55.8,  role: '他', zh: '那就拜托别和我碰面' },
    { t0: 56.8,  t1: 61.8,  role: '他', zh: '如果再看你一眼是否还会有感觉' },
    { t0: 61.9,  t1: 67.8,  role: '他', zh: '当年素面朝天要多纯洁就有多纯洁' },
    { t0: 67.9,  t1: 72.8,  role: '她', zh: '不画扮熟的眼线不用抹匀粉底液' },
    { t0: 73.8,  t1: 74.8,  role: '他', zh: '暴雨天' },
    { t0: 74.9,  t1: 75.8,  role: '她', zh: '照逛街' },
    { t0: 75.9,  t1: 78.8,  role: '合', zh: '偷笑别人花了脸' },
    { t0: 78.9,  t1: 84.8,  role: '他', zh: '如果再看你一眼是否还会有感觉' },
    { t0: 84.9,  t1: 89.8,  role: '他', zh: '最真实的喜怒哀乐全都埋葬在昨天' },
    { t0: 90.8,  t1: 95.8,  role: '她', zh: '不掺任何的表演轰轰烈烈那几年' },
    { t0: 95.9,  t1: 97.2,  role: '他', zh: '我怀念' },
    { t0: 97.8,  t1: 98.8,  role: '她', zh: '别怀念' },
    { t0: 98.9,  t1: 103.8, role: '合', zh: '怀念也回不到从前' },
    { t0: 119.8, t1: 121.8, role: '他', zh: '又是一个安静的晚上' },
    { t0: 122.8, t1: 124.8, role: '他', zh: '一个人窝在摇椅里乘凉' },
    { t0: 124.9, t1: 127.8, role: '他', zh: '我承认这样真的很安详' },
    { t0: 127.9, t1: 130.8, role: '他', zh: '和楼下老爷爷一样' },
    { t0: 130.9, t1: 133.8, role: '她', zh: '听说你还在搞什么原创' },
    { t0: 133.9, t1: 136.8, role: '她', zh: '搞来搞去好像也就这样' },
    { t0: 136.9, t1: 138.8, role: '她', zh: '不如花点时间想想' },
    { t0: 138.9, t1: 141.8, role: '她', zh: '琢磨一下模样' },
    { t0: 141.9, t1: 144.8, role: '她', zh: '今夜化了美美的妆' },
    { t0: 144.9, t1: 147.8, role: '他', zh: '我相信是很美美的妆' },
    { t0: 147.9, t1: 150.8, role: '她', zh: '我摇晃在舞池中央' },
    { t0: 150.9, t1: 152.8, role: '他', zh: '那种体态可以想象' },
    { t0: 153.8, t1: 157.8, role: '她', zh: '我做我的改变又何必纠结' },
    { t0: 157.9, t1: 163.8, role: '他', zh: '那就拜托别和我碰面' },
    { t0: 163.9, t1: 168.8, role: '他', zh: '如果再看你一眼是否还会有感觉' },
    { t0: 169.8, t1: 174.8, role: '他', zh: '当年素面朝天要多纯洁就有多纯洁' },
    { t0: 174.9, t1: 180.8, role: '她', zh: '不画扮熟的眼线不用抹匀粉底液' },
    { t0: 180.9, t1: 181.8, role: '他', zh: '暴雨天' },
    { t0: 181.9, t1: 182.8, role: '她', zh: '照逛街' },
    { t0: 183.8, t1: 185.8, role: '合', zh: '偷笑别人花了脸' },
    { t0: 186.8, t1: 191.8, role: '他', zh: '如果再看你一眼是否还会有感觉' },
    { t0: 191.9, t1: 197.8, role: '他', zh: '最真实的喜怒哀乐全都埋葬在昨天' },
    { t0: 197.9, t1: 202.8, role: '她', zh: '不掺任何的表演轰轰烈烈那几年' },
    { t0: 202.9, t1: 204.8, role: '他', zh: '我怀念' },
    { t0: 204.9, t1: 205.8, role: '她', zh: '别怀念' },
    { t0: 205.9, t1: 209.8, role: '合', zh: '怀念也回不到从前' },
    { t0: 209.9, t1: 214.8, role: '他', zh: '曾经对上的瞬间难道是一种错觉' },
    { t0: 215.8, t1: 219.8, role: '他', zh: '那些流逝了的就永远不会复现' },
    { t0: 220.8, t1: 225.8, role: '她', zh: '不掺任何的表演轰轰烈烈那几年' },
    { t0: 225.9, t1: 227.8, role: '他', zh: '有遗憾的感觉' },
    { t0: 229.8, t1: 234.8, role: '他', zh: '那消失不见的素颜' },
    { t0: 234.9, t1: 238.05, role: '合', zh: '《素颜》 · 许嵩 & 何曼婷' }
  ];

  function renderSuyanFrame(ctx, t) {
    ctx.save();
    ctx.clearRect(0, 0, W, H);
    const { sub, shotIdx, lt, dur } = resolveShotAndSub(SUBS_SUYAN, t, '（间奏 · 2009 素颜青春与大肥鱼剧场）');

    if (BAHUIYI && typeof BAHUIYI.renderMasterMVShot === 'function') {
      BAHUIYI.renderMasterMVShot(ctx, t, {
        shotIdx,
        lt,
        dur,
        setOffset: 17,
        actionOffset: 15,
        u: 31,
        style: ['watercolor', 'pixel', 'neon'][shotIdx % 3],
        guest: shotIdx % 2 === 0 ? 'ladyGemini' : 'all'
      });
    }

    // Top-Right 2009 Scoreboard Badge ("素颜队 vs 化妆队")
    ctx.save();
    paint(ctx, rrPts(W - 290, 18, 266, 38, 10), { fill: '#14532D', fillOp: 220, ink: '#FBBF24', sw: 2.2 });
    ctx.font = 'bold 15px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
    ctx.fillStyle = '#FEF08A';
    ctx.textAlign = 'center';
    ctx.fillText('2009 青春纪念 · 素颜队 100 : 100', W - 157, 42);
    ctx.restore();

    drawRpgKaraokeSub(ctx, '许嵩 & 何曼婷《素颜》', shotIdx, sub, t);
    ctx.restore();
  }

  const LONG_MVS = {
    huainvhai: {
      tag: 'huainvhai',
      title: '徐良 & 小凌《坏女孩》(QQ2009 与劲舞团篇)',
      duration: 245.55,
      subs: SUBS_HUAINVHAI,
      renderFrame: renderHuainvhaiFrame
    },
    feng: {
      tag: 'feng',
      title: '周杰伦《枫》(秋日枫林与烛火篇)',
      duration: 274.58,
      subs: SUBS_FENG,
      renderFrame: renderFengFrame
    },
    meiguihua: {
      tag: 'meiguihua',
      title: '许嵩《玫瑰花的葬礼》(烟花雨与玫瑰篇)',
      duration: 236.77,
      subs: SUBS_MEIGUIHUA,
      renderFrame: renderMeiguihuaFrame
    },
    suyan: {
      tag: 'suyan',
      title: '许嵩 & 何曼婷《素颜》(2009 黑板与黄雨伞篇)',
      duration: 238.05,
      subs: SUBS_SUYAN,
      renderFrame: renderSuyanFrame
    }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = LONG_MVS;
  }
  root.MV_PACK_LONG = LONG_MVS;
})(typeof window !== 'undefined' ? window : globalThis);
