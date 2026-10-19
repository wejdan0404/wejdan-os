import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const ROOT = resolve('.');
const BUILD = resolve('build/web');
const require = createRequire(join(resolve('ops/local-live/runtime/n8n/node_modules'), '__flutter_navigation_test__.cjs'));
const { chromium } = require('playwright');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.wasm': 'application/wasm', '.png': 'image/png', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.woff2': 'font/woff2' };
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    const target = normalize(join(BUILD, pathname.replace(/^[/\\]+/, '')));
    let file = target.startsWith(`${BUILD}${process.platform === 'win32' ? '\\' : '/'}`) ? target : join(BUILD, 'index.html');
    let bytes;
    try { bytes = await readFile(file); }
    catch { file = join(BUILD, 'index.html'); bytes = await readFile(file); }
    response.writeHead(200, { 'content-type': mime[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    response.end(bytes);
  } catch { response.writeHead(500); response.end('local navigation test server error'); }
});
await new Promise(resolveListen => server.listen(0, '127.0.0.1', resolveListen));
const { port } = server.address();
const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}) });
const context = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 1 });
const page = await context.newPage();
const errors = [];
const external = [];
const base = `http://127.0.0.1:${port}`;
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
page.on('request', request => { if (new URL(request.url()).origin !== base) external.push(request.url()); });
const checks = [];
try {
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('flt-glass-pane', { state: 'attached', timeout: 60000 });
  await page.waitForTimeout(1800);
  // The onboarding sample action is at a documented fixed location for this viewport.
  if (await page.evaluate(() => location.pathname) === '/') {
    await page.mouse.click(188, 664);
    await page.waitForTimeout(1800);
  }
  const paths = [
    ['/today', 'Today'],
    ['/path', 'Professional'],
    ['/habits', 'Care'],
    ['/me', 'Me'],
    ['/habits/joy', 'Joy nested under Care'],
    ['/habits/joy/reward', 'Reward nested route'],
    ['/path/ielts', 'IELTS nested route'],
    ['/path/driving', 'Driving nested route'],
    ['/me/insights', 'Me insights'],
    ['/me/money', 'Me money'],
    ['/me/home', 'Me home administration'],
    ['/me/evidence', 'Me evidence library'],
    ['/me/settings', 'Me nested route'],
    ['/me/help', 'Me help and safety'],
    ['/me/cycle', 'Me sensitive cycle module'],
    ['/me/pcos', 'Me sensitive PCOS module'],
  ];
  for (const [path, label] of paths) {
    await page.goto(`${base}${path}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('flt-glass-pane', { state: 'attached', timeout: 30000 });
    await page.waitForTimeout(1000);
    const actual = await page.evaluate(() => location.pathname);
    assert.equal(actual, path, `${label}: expected browser route ${path}, got ${actual}`);
    checks.push({ path, label, result: 'PASS', browser_path: actual });
  }
  assert.deepEqual(errors, [], `Browser errors: ${errors.join(' | ')}`);
  assert.deepEqual(external, [], `External requests: ${external.join(' | ')}`);
  const report = { schema_version: 'flutter-browser-navigation.v1', recorded_at: new Date().toISOString(), result: 'PASS', scope: 'fresh headless system Chrome, loopback Flutter web release build, 375x812; direct navigation to all primary tabs and nested routes', checks, page_errors: errors, external_requests: external, paid_calls: 0 };
  await writeFile('ops/evidence/flutter-navigation-browser-20261018.json', `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report));
} finally {
  await context.close();
  await browser.close();
  await new Promise(resolveClose => server.close(resolveClose));
}
