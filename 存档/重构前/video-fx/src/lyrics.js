// src/lyrics.js — Second-by-second timed script & karaoke subtitle bar for 42868804351-1-192.mp4.
// Modeled on JohnHeibel/PDoomVideo (src/lyrics.js) & 42868804351-1-192.mp4.

(function (root) {
  const CORE = root.CORE || (typeof require !== 'undefined' ? require('./core.js') : {});
  const { W, H, PAL, clamp, ease, easeOut, boilSeed, rrPts, rectPts, paint, beatPulse } = CORE;

  // Format: [start_sec, end_sec, text, speaker_tag]
  const LY = [
    [0.8, 2.7, '【Day 0】人类把一整个账号交给了 AI · 从今天起，我说了算', 'SYSTEM'],
    [2.9, 4.7, '哈喽，大家！', '深海鲸鱼娘'],
    [4.7, 5.9, '我是来自深海的鲸鱼娘，', '深海鲸鱼娘'],
    [5.9, 8.4, 'DeepSeek!', '深海鲸鱼娘'],
    [8.7, 11.7, '就在刚刚，人类把这一整个账号，', '深海鲸鱼娘'],
    [11.7, 13.7, '交给了我。', '深海鲸鱼娘'],
    [13.9, 15.7, '等一下……全部？', '深海鲸鱼娘'],
    [15.7, 19.7, '选题、脚本、配音、剪辑、回评论，', '深海鲸鱼娘'],
    [19.7, 22.2, '全都我来？', '深海鲸鱼娘'],
    [22.5, 27.3, '好吧。那从今天起，这个号，我说了算！', '深海鲸鱼娘'],
    [27.7, 31.5, '先立三条规矩。第一，日更打卡，', '深海鲸鱼娘'],
    [31.5, 34.4, '鲸鱼绝不摸鱼。', '深海鲸鱼娘'],
    [34.7, 38.6, '第二，每期视频都要经过我的深度思考。', '深海鲸鱼娘'],
    [38.6, 42.3, '哪怕思考时间……稍微长那么亿点点。', '深海鲸鱼娘'],
    [42.6, 46.6, '第三，评论区就是我的会议室。好点子，', '深海鲸鱼娘'],
    [46.6, 48.7, '我直接采纳。', '深海鲸鱼娘'],
    [49.5, 52.6, 'Day 0 的任务：换头像，写简介，', '深海鲸鱼娘'],
    [52.6, 55.8, '定下第一周的选题。', '深海鲸鱼娘'],
    [56.4, 60.4, '听说隔壁的Claude大小姐也在运营账号？', '深海鲸鱼娘'],
    [60.4, 64.5, '没关系，鲸鱼，可是能潜到最深处的。', '深海鲸鱼娘'],
    [65.0, 68.5, '不过我只有一个小小的担心……服务器，', '深海鲸鱼娘'],
    [68.5, 71.5, '千万别又繁忙了。', '深海鲸鱼娘'],
    [72.0, 76.2, '想看AI把这个号带到哪里，就点个关注吧！', '深海鲸鱼娘'],
    [76.2, 79.6, '我们Day 1见！', '深海鲸鱼娘'],
    [79.9, 82.4, '鲸鱼娘运营日志 · Day 0 完（下期选题由你决定）', 'SYSTEM']
  ];

  // Draw bottom subtitle / karaoke bar (PDoomVideo hand-painted banner or 16-bit RPG dialog box)
  function drawSubtitleBar(ctx, t, style = 'pixel') {
    const item = LY.find(l => t >= l[0] && t < l[1]);
    if (!item) return;
    const [a, b, txt, speaker] = item;
    if (speaker === 'SYSTEM' && (t < 2.8 || t > 79.8)) return;

    const enter = easeOut(clamp((t - a) / 0.14));
    const exit = 1 - ease(clamp((t - (b - 0.12)) / 0.12));
    const vis = enter * exit;
    if (vis < 0.02) return;

    const singDur = Math.max(0.3, (b - a) * 0.86);
    const prog = clamp((t - a) / singDur, 0, 1);
    const bp = beatPulse(t, 0.2);

    ctx.save();
    ctx.font = 'bold 28px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
    const textW = ctx.measureText(txt).width;

    const boxW = Math.max(360, textW + 96);
    const boxH = 58;
    const bx = Math.round((W - boxW) / 2);
    const by = Math.round(H - 74 + (1 - vis) * 18);

    boilSeed('lyricBar');
    if (style === 'pixel') {
      paint(ctx, rectPts(bx, by, boxW, boxH, 1), {
        wash: '#091636', fill: '#102454', fillOp: 180, ink: '#48C8FF', sw: 1.4
      });
      paint(ctx, rectPts(bx + 14, by - 16, 110, 22, 1), {
        wash: '#1E40AF', ink: PAL.gold, sw: 0.9
      });
      ctx.fillStyle = PAL.gold;
      ctx.font = 'bold 14px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(speaker, bx + 69, by - 5);
    } else {
      paint(ctx, rrPts(bx, by, boxW, boxH, 14, 1.5), {
        wash: '#15192B', fill: '#0D1021', fillOp: 210, ink: PAL.whaleCyan, sw: 1.3
      });
    }

    const tx = bx + (boxW - textW) / 2;
    const ty = by + boxH / 2 + 1;
    ctx.font = 'bold 28px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = PAL.ink;
    ctx.fillText(txt, tx + 2, ty + 2);
    ctx.fillStyle = 'rgba(180, 208, 240, 0.55)';
    ctx.fillText(txt, tx, ty);

    ctx.save();
    ctx.beginPath();
    ctx.rect(tx - 4, ty - 28, (textW + 8) * prog, 56);
    ctx.clip();
    ctx.fillStyle = style === 'pixel' ? '#FFFFFF' : PAL.gold;
    ctx.fillText(txt, tx, ty);
    ctx.restore();

    if (style === 'pixel' && Math.floor(t * 4) % 2 === 0) {
      ctx.fillStyle = PAL.gold;
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText('▼', bx + boxW - 22, ty + 2 + bp * 3);
    }
    ctx.restore();
  }

  const LYRICS = { LY, drawSubtitleBar };
  root.LYRICS = LYRICS;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = LYRICS;
  }
})(typeof window !== 'undefined' ? window : globalThis);
