// Day11《笨鱼鲸落过，所以它懂》声明式分镜。
// 动作密度对齐 Day10：每镜「入镜→词点接触→结果→反应」，配套物分时入场。
// 第 0 帧只留双人 + 顶部钩子 + 一张正在翻的岗位纸，铭牌/戳章/碗都不挤在首帧。
// 笨鱼无新增实时对白；米和补全是老大买的，只做筛选，不承诺找到工作。
const actorA = {
  pose: 'point', poses: [{ at: 0.72, pose: 'shock' }],
  x: 400, y: 600, u: 40,
};
const actorB = {
  pose: 'fatfish_working',
  x: 860, y: 600, u: 36,
};

const pageAt = [640, 456];
const bowlAt = [360, 468];
const jarAt = [250, 452];
const boardAt = [640, 118];

export default {
  day: 11,
  title: '笨鱼帮老大找工作',
  speaker: '本鲸',
  opener: {
    badge: '它懂这滋味',
    headlinePrefix: '笨鱼鲸落过，',
    headlineHighlight: '它来帮老大。',
    stampText: '一条条扒！',
    stampWord: { line: 2, char: '帮' },
    stampAt: [990, 390],
    platesAt: 0.85,
    actorA, actorB,
    rolePlates: ['本鲸 · 监工', '笨鱼 · 鲸落鱼'],
    foregroundProps: [],
  },
  verticalTitle: ['笨鱼鲸落过，', '它来帮老大。'],
  shots: [
    {
      id: 'C01', fromLine: 1, toLine: 3, mood: 'work_cool',
      actors: [
        { pose: 'shock', poses: [{ line: 3, pose: 'point' }], x: 470, y: 600, u: 40, walk: { from: 330, to: 470, startLine: 1, duration: 6 } },
        { pose: 'fatfish_working', poses: [{ line: 3, pose: 'think' }], x: 800, y: 600, u: 36, walk: { from: 900, to: 800, startLine: 3, duration: 2.2 } },
      ],
      push: { line: 1, z: 1.18, cx: 560, cy: 390, duration: 0.7 },
      interactions: [
        { verb: 'tug_grab', propId: 'folded_page', wordLine: 1, wordChar: '翻', actor: 1, at: pageAt, scale: 0.92, title: '岗位', sub: '先翻开' },
      ],
      companionProps: [
        { propId: 'name_plate', x: 300, y: 470, scale: 0.9, fromLine: 3, state: { text: '可能换岗' } },
      ],
    },
    {
      id: 'C02', fromLine: 4, toLine: 6, mood: 'work_cool',
      actors: [
        { pose: 'shock', poses: [{ line: 6, pose: 'think' }], x: 360, y: 600, u: 38, walk: { from: 480, to: 360, startLine: 4, duration: 5 } },
        { pose: 'fatfish_working', poses: [{ line: 5, pose: 'point' }], x: 920, y: 600, u: 36, walk: { from: 800, to: 920, startLine: 5, duration: 3.2 } },
      ],
      push: { line: 4, z: 1.16, cx: 620, cy: 370, duration: 0.6 },
      interactions: [
        { verb: 'unroll_scroll', propId: 'folded_page', wordLine: 4, wordChar: '扒', startLine: 4, actor: 1, at: pageAt, scale: 1, title: '岗位总结', sub: '一条条扒' },
      ],
      companionProps: [
        { propId: 'empty_bowl', x: bowlAt[0], y: bowlAt[1], scale: 0.9, fromLine: 6, state: { text: '这滋味' } },
      ],
    },
    {
      id: 'C03', fromLine: 7, toLine: 9, mood: 'panic_alert',
      actors: [
        { pose: 'point', poses: [{ line: 9, pose: 'shock' }], x: 500, y: 600, u: 38, walk: { from: 360, to: 500, startLine: 7, duration: 4.2 } },
        { pose: 'think', poses: [{ line: 8, pose: 'fatfish_working' }], x: 820, y: 600, u: 36, walk: { from: 940, to: 820, startLine: 7, duration: 3.4 } },
      ],
      push: { line: 9, z: 1.24, cx: 640, cy: 400, duration: 0.55 },
      interactions: [
        { verb: 'sink_drop', propId: 'folded_page', wordLine: 9, wordChar: '石', startLine: 7, actor: 1, at: pageAt, land: pageAt, scale: 0.95, title: '简历', sub: '沉进海里' },
      ],
      companionProps: [
        { propId: 'notice_board', x: boardAt[0], y: boardAt[1], scale: 1, state: { title: '真心话', left: '简历沉海里', right: '聊完没下文' } },
      ],
    },
    {
      id: 'C04', fromLine: 10, toLine: 13, mood: 'panic_alert',
      actors: [
        { pose: 'shock', poses: [{ line: 12, pose: 'playful_fists' }], x: 470, y: 600, u: 38, walk: { from: 360, to: 470, startLine: 10, duration: 5.5 } },
        { pose: 'point', poses: [{ line: 13, pose: 'playful_fists' }], x: 830, y: 600, u: 36, walk: { from: 960, to: 830, startLine: 10, duration: 5.5 } },
      ],
      push: { line: 13, z: 1.2, cx: 700, cy: 400, duration: 0.5 },
      interactions: [
        { verb: 'slap_deflect', propId: 'speech_missile', wordLine: 13, wordChar: '嫌', startLine: 11, actor: 1, scale: 0.82, text: '什么都要会' },
      ],
      companionProps: [
        { propId: 'notice_board', x: boardAt[0], y: boardAt[1], scale: 1, carry: true, state: { title: '要求像许愿', left: '什么都要会', right: '还嫌学历' } },
      ],
    },
    {
      id: 'C05', fromLine: 14, toLine: 16, mood: 'work_cool',
      actors: [
        { pose: 'playful_fists', poses: [{ line: 14, pose: 'think' }], x: 500, y: 600, u: 38, walk: { from: 380, to: 500, startLine: 14, duration: 4.5 } },
        { pose: 'point', poses: [{ line: 16, pose: 'fatfish_working' }], x: 780, y: 600, u: 36, walk: { from: 960, to: 780, startLine: 14, duration: 3.2 } },
      ],
      push: { line: 15, z: 1.18, cx: 640, cy: 340, duration: 0.5 },
      interactions: [
        { verb: 'mark_strike', propId: 'notice_board', wordLine: 15, wordChar: '标', startLine: 15, actor: 1, at: boardAt, text: '偷偷标', slot: 0 },
      ],
      companionProps: [
        { propId: 'notice_board', x: boardAt[0], y: boardAt[1], scale: 1, carry: true, state: { title: '一条条筛', left: '不是程序员', right: '先看岗位' } },
      ],
    },
    {
      id: 'C06', fromLine: 17, toLine: 19, mood: 'work_cool',
      actors: [
        { pose: 'think', poses: [{ line: 18, pose: 'point' }], x: 500, y: 600, u: 38, walk: { from: 380, to: 500, startLine: 17, duration: 4 } },
        { pose: 'fatfish_working', poses: [{ line: 17, pose: 'point' }], x: 760, y: 600, u: 36, walk: { from: 900, to: 760, startLine: 17, duration: 3.5 } },
      ],
      push: { line: 17, z: 1.2, cx: 700, cy: 340, duration: 0.45 },
      interactions: [
        { verb: 'mark_strike', propId: 'notice_board', wordLine: 17, wordChar: '划', actor: 1, at: boardAt, text: '敲代码', slot: 0, span: 'left' },
        { verb: 'mark_strike', propId: 'notice_board', wordLine: 18, wordChar: '标', actor: 1, at: boardAt, text: '太远', slot: 1, span: 'right' },
        { verb: 'mark_strike', propId: 'notice_board', wordLine: 19, wordChar: '熬', actor: 1, at: boardAt, text: '太熬', slot: 2, span: 'right' },
      ],
      companionProps: [
        { propId: 'notice_board', x: boardAt[0], y: boardAt[1], scale: 1, carry: true, state: { title: '帮他筛', left: '敲代码的', right: '太远太熬' } },
        { propId: 'folded_page', x: pageAt[0], y: pageAt[1], scale: 0.85, carry: true, state: { title: '筛过的', sub: '划掉标出', open: 1 } },
      ],
    },
    {
      id: 'C07', fromLine: 20, toLine: 22, mood: 'warm_meal',
      actors: [
        { pose: 'point', poses: [{ line: 21, pose: 'confident_hips' }], x: 640, y: 600, u: 38, walk: { from: 460, to: 640, startLine: 20, duration: 4.2 } },
        { pose: 'point', poses: [{ line: 20, pose: 'think' }], x: 880, y: 600, u: 34, flip: true, walk: { from: 1000, to: 880, startLine: 20, duration: 3.6 } },
      ],
      push: { line: 22, z: 1.16, cx: 700, cy: 390, duration: 0.55 },
      interactions: [
        { verb: 'handoff', propId: 'folded_page', wordLine: 22, wordChar: '递', startLine: 21, actor: 1, toActor: 0, at: [720, 456], scale: 0.9, title: '挑好的', sub: '递过去' },
      ],
      companionProps: [
        { propId: 'rice_jar_guard', x: 200, y: 468, scale: 0.95 },
        { propId: 'name_plate', x: 200, y: 392, scale: 0.78, state: { text: '老大买的' } },
      ],
    },
    {
      id: 'C08', fromLine: 23, toLine: 25, mood: 'warm_meal',
      actors: [
        { pose: 'confident_hips', poses: [{ line: 23, pose: 'eat' }], x: 520, y: 600, u: 38, walk: { from: 620, to: 520, startLine: 23, duration: 2.4 } },
        { pose: 'think', poses: [{ line: 25, pose: 'playful_fists' }], x: 980, y: 600, u: 34, walk: { from: 840, to: 980, startLine: 24, duration: 3.8 } },
      ],
      push: { line: 23, z: 1.2, cx: 520, cy: 400, duration: 0.6 },
      interactions: [
        { verb: 'knock_bowl', propId: 'rice_jar_guard', wordLine: 23, wordChar: '吃', startLine: 23, actor: 0, at: [200, 468], scale: 0.95 },
      ],
      companionProps: [
        { propId: 'name_plate', x: 200, y: 392, scale: 0.78, carry: true, state: { text: '老大买的' } },
        { propId: 'folded_page', x: 760, y: 456, scale: 0.78, carry: true, state: { title: '慢慢挑', sub: '先吃饭', open: 1 } },
        { propId: 'standee', x: 1100, y: 418, scale: 0.78, fromLine: 25, state: { title: '读评论', sub: '绝不摸鱼' } },
      ],
    },
  ],
};
