// 让 TypeScript 认识打包器处理的资源导入（webpack / Vite 都会把它们变成 URL 字符串）
declare module '*.png' { const url: string; export default url; }
declare module '*.ttf' { const url: string; export default url; }
declare module '*.mp3' { const url: string; export default url; }
declare module '*.mp4' { const url: string; export default url; }
declare module '*.wav' { const url: string; export default url; }
declare module '*.m4a' { const url: string; export default url; }
