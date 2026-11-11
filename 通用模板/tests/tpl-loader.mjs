// 测试用的解析钩子：让 Node 能直接加载引擎的 .ts（出片时这些事由 webpack 做）。
//   · '@tpl/xxx'            → 通用模板/engine/xxx.ts
//   · './kit' 这类不带扩展名的相对引用 → 同目录的 .ts / .tsx
//   · 图片 / 字体           → 只导出它的路径（测试不解码图片）
//   · 没写 import 属性的 .json → 当成普通模块导出内容
// 引擎里有 TypeScript 的「构造函数参数属性」，所以 node 要带 --experimental-transform-types（package.json 的 test 脚本已经带了）。
import fs from 'node:fs';
import { registerHooks } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ENGINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../engine');
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith('@tpl/')) return next(pathToFileURL(path.join(ENGINE, `${specifier.slice(5)}.ts`)).href, context);
    if (specifier.startsWith('.') && context.parentURL?.startsWith('file:') && !path.extname(specifier)) {
      const base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
      for (const ext of ['.ts', '.tsx']) if (fs.existsSync(base + ext)) return next(pathToFileURL(base + ext).href, context);
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (/\.(png|jpe?g|ttf|woff2?)$/.test(url)) return { format: 'module', source: `export default ${JSON.stringify(url)};`, shortCircuit: true };
    if (url.endsWith('.json') && context.importAttributes?.type !== 'json') {
      return { format: 'module', source: `export default ${fs.readFileSync(fileURLToPath(url), 'utf8')};`, shortCircuit: true };
    }
    return next(url, context);
  },
});
