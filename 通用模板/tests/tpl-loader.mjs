// 测试用的解析钩子：把镜头代码里的 '@tpl/xxx' 指到 通用模板/engine/xxx.ts（出片时这件事由 webpack 的 alias 做）。
import { registerHooks } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ENGINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../engine');
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith('@tpl/')) return next(pathToFileURL(path.join(ENGINE, `${specifier.slice(5)}.ts`)).href, context);
    return next(specifier, context);
  },
});
