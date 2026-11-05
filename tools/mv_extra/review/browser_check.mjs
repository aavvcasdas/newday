// Optional real-browser smoke test. Install dependencies in ignored cache per README.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import chromium from '../cache/browser/node_modules/@sparticuz/chromium/build/index.js';
import {chromium as playwright} from '../cache/browser/node_modules/playwright-core/index.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));
const origin = process.env.REVIEW_URL || 'http://127.0.0.1:8000';
const browser = await playwright.launch({executablePath: await chromium.executablePath(), args: chromium.args, headless: true});
const context = await browser.newContext({viewport: {width: 1440, height: 1100}});
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const checks = [];
try {
  await page.goto(origin, {waitUntil: 'networkidle'});
  await page.waitForFunction(() => document.querySelector('#player').readyState >= 2);
  assert.equal(await page.locator('.lyric-row').count(), 16);
  assert.equal(await page.locator('.lyric-row:disabled').count(), 10);
  assert.equal(await page.locator('#shots button').count(), 11);
  checks.push('16 latest lyrics, 10 planned rows disabled, 11 shot buttons');
  await page.locator('#shots button').nth(6).click();
  await page.waitForFunction(() => Math.abs(document.querySelector('#player').currentTime - (27.3 - 571 / 30)) < 0.05);
  await page.locator('#source-tab').click();
  await page.waitForFunction(() => document.querySelector('#player').src.endsWith('/source.mp4') && Math.abs(document.querySelector('#player').currentTime - 27.3) < 0.05);
  await page.locator('#sample-tab').click();
  await page.waitForFunction(() => document.querySelector('#player').src.endsWith('/sample.mp4') && Math.abs(document.querySelector('#player').currentTime - (27.3 - 571 / 30)) < 0.05);
  checks.push('switch source/sample retains corresponding source time; exactly one media element');
  assert.equal(await page.locator('video').count(), 1);
  await page.locator('#shots button').first().click();
  await page.locator('#play').click();
  await page.waitForFunction(() => document.querySelector('#player').currentTime > 0.35);
  await page.locator('#play').click();
  const before = await page.locator('#player').evaluate(v => v.currentTime);
  await page.locator('#next').click();
  await page.waitForTimeout(150);
  const after = await page.locator('#player').evaluate(v => v.currentTime);
  assert.ok(after > before && after - before <= 0.051);
  checks.push('actual MP4 playback advances; pause and single-frame seek work');
  await page.locator('#loop').check();
  await page.locator('#player').evaluate(v => { v.currentTime = 1.55; });
  await page.locator('#play').click();
  await page.waitForFunction(() => document.querySelector('#player').currentTime < 1);
  await page.locator('#play').click();
  await page.locator('#loop').uncheck();
  checks.push('selected shot loops back during real playback');
  await page.locator('#source-tab').click();
  await page.waitForFunction(() => document.querySelector('#player').readyState >= 2 && document.querySelector('#player').currentTime >= 19);
  await page.locator('#player').evaluate(v => { v.currentTime = 50; });
  await page.waitForFunction(() => document.querySelector('#player').paused && document.querySelector('#player').currentTime < 38.834);
  checks.push('native source-video seek beyond sample range clamps and pauses');
  await page.locator('#notes').fill('烟花镜头：待连续看听确认。');
  await page.reload({waitUntil: 'networkidle'});
  assert.equal(await page.locator('#notes').inputValue(), '烟花镜头：待连续看听确认。');
  checks.push('local-only review note survives reload');
  await page.locator('[data-image="phases"]').click();
  assert.ok((await page.locator('#sheet').getAttribute('src')).includes('phases'));
  await page.locator('[data-image="cast"]').click();
  await page.locator('#shots button').nth(9).click();
  await page.waitForTimeout(150);
  await page.screenshot({path: path.join(here, '../cache/review_desktop.png'), fullPage: true});
  await page.setViewportSize({width: 390, height: 844});
  await page.screenshot({path: path.join(here, '../cache/review_mobile.png'), fullPage: true});
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  checks.push('desktop 1440px and mobile 390px screenshots; no mobile horizontal overflow');
  assert.deepEqual(errors, []);
  fs.writeFileSync(path.join(here, 'browser_check.json'), JSON.stringify({
    status: 'passed', checks, browser: await browser.version(), pageErrors: errors,
    reviewSourceHashes: Object.fromEntries(['index.html', 'app.js', 'style.css', 'timeline.mjs', 'model.py', 'serve.py', 'review-sans.woff2', 'browser_check.mjs'].map(name => [name, createHash('sha256').update(fs.readFileSync(path.join(here, name))).digest('hex')])),
    sampleSha256: (await (await page.request.get(origin + '/api/review')).json()).sampleSha256,
    videoActuallyPlayed: true, humanListeningApproved: false, userDirectionApproved: false,
    note: 'Browser smoke tests do not establish natural animation, aesthetic quality or human approval.'
  }, null, 2) + '\n');
  console.log(checks.join('\n'));
} finally {
  await browser.close();
}
