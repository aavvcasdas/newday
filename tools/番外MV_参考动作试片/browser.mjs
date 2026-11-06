import path from 'node:path';
import { fileURLToPath } from 'node:url';
import chromium, { inflate } from '@sparticuz/chromium';
import { chromium as playwright } from 'playwright-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));

export async function launchBrowser() {
  const bin = path.join(HERE, 'node_modules/@sparticuz/chromium/bin');
  // Debian sandbox lacks libnss3; the package ships compatible AL2023 libs.
  const libRoot = await inflate(path.join(bin, 'al2023.tar.br'));
  process.env.LD_LIBRARY_PATH = `${libRoot}/lib${process.env.LD_LIBRARY_PATH ? ':' + process.env.LD_LIBRARY_PATH : ''}`;
  const executablePath = await chromium.executablePath();
  return playwright.launch({
    executablePath,
    args: chromium.args,
    headless: true,
    env: { ...process.env, FONTCONFIG_PATH: '/tmp/fonts' },
  });
}
