// 预览台（npm run preview）：在浏览器里播放仓库里的作品。只是看片和查分镜用的开发页面，不参与出片。
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../..');

export default defineConfig({
  root: HERE,
  plugins: [react()],
  // 与出片时 webpack 的别名一致：镜头代码里的 '@tpl/xxx' = 通用模板/engine/xxx
  resolve: { alias: { '@tpl': path.resolve(HERE, '../engine') } },
  // 作品在模板目录外面（番外MV/、Day/），要允许开发服务器读整个仓库；监听所有网卡、放行任意主机名，远程预览才打得开
  server: { host: '0.0.0.0', port: 5173, strictPort: false, allowedHosts: true, fs: { allow: [REPO] } },
  preview: { host: '0.0.0.0', allowedHosts: true },
  build: { outDir: path.join(HERE, 'dist'), emptyOutDir: true, chunkSizeWarningLimit: 4000 },
});
