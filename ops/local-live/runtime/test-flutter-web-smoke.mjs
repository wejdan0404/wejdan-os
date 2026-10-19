import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const ROOT = resolve('.');
const BUILD = resolve('build/web');
const require = createRequire(join(resolve('ops/local-live/runtime/n8n/node_modules'), '__flutter_web_smoke__.cjs'));
const { chromium } = require('playwright');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.wasm': 'application/wasm', '.png': 'image/png', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.woff2': 'font/woff2' };
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
  } catch {
    response.writeHead(500);
    response.end('local test server error');
  }
});
await new Promise(resolveListen => server.listen(0, '127.0.0.1', resolveListen));
const { port } = server.address();
const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}) });
const page = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 1 });
const pageErrors = [];
const base = `http://127.0.0.1:${port}`;
const externalRequests = [];
page.on('pageerror', error => pageErrors.push(error.message));
page.on('console', message => { if (message.type() === 'error') pageErrors.push(message.text()); });
page.on('request', request => { if (new URL(request.url()).origin !== base) externalRequests.push(request.url()); });
try {
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('flt-glass-pane', { state: 'attached', timeout: 60000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'ops/evidence/flutter-web-smoke-diagnostic.png', fullPage: true });
  // CanvasKit does not expose DOM text here until the accessibility bridge is
  // enabled. At this fixed 375x812 viewport, the visible sample-profile action
  // is at the documented point captured in the diagnostic screenshot.
  await page.mouse.click(188, 664);
  await page.waitForURL('**/brief', { timeout: 30000 });
  const afterOnboarding = new URL(page.url()).pathname;
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('flt-glass-pane', { state: 'attached', timeout: 60000 });
  await page.waitForTimeout(3000);
  const afterReload = new URL(page.url()).pathname;
  const indexedDb = await page.evaluate(async () => typeof indexedDB.databases === 'function' ? indexedDB.databases() : null);
  const metaSnapshot = await page.evaluate(() => new Promise((resolveMeta, rejectMeta) => {
    const request = indexedDB.open('wlo_meta');
    request.onerror = () => rejectMeta(request.error);
    request.onsuccess = async () => {
      const db = request.result;
      try {
        const stores = Array.from(db.objectStoreNames);
        const records = {};
        for (const storeName of stores) {
          const transaction = db.transaction(storeName, 'readonly');
          const store = transaction.objectStore(storeName);
          const keys = await new Promise((resolveKeys, rejectKeys) => { const r = store.getAllKeys(); r.onsuccess = () => resolveKeys(r.result); r.onerror = () => rejectKeys(r.error); });
          const values = await new Promise((resolveValues, rejectValues) => { const r = store.getAll(); r.onsuccess = () => resolveValues(r.result); r.onerror = () => rejectValues(r.error); });
          records[storeName] = keys.map((key, index) => ({ key: String(key), value: typeof values[index] === 'string' ? values[index] : JSON.stringify(values[index]) }));
        }
        db.close(); resolveMeta({ stores, records });
      } catch (error) { db.close(); rejectMeta(error); }
    };
  }));
  const settingsRecord = Object.values(metaSnapshot.records).flat().find(record => record.key === 'settings');
  let persistedSettings = null;
  try { persistedSettings = settingsRecord ? JSON.parse(settingsRecord.value) : null; } catch {}
  await page.screenshot({ path: 'ops/evidence/flutter-web-smoke-after-reload-diagnostic.png', fullPage: true });
  console.log(JSON.stringify({ afterOnboarding, afterReload, indexedDb: indexedDb?.map(item => item.name), persistedOnboardingDone: persistedSettings?.onboardingDone, pageErrors }));
  assert.ok(Array.isArray(indexedDb) && indexedDb.length > 0, `Expected local Hive persistence to create an IndexedDB database, got ${JSON.stringify(indexedDb)}`);
  assert.equal(persistedSettings?.onboardingDone, true, `Expected completed onboarding to persist in Hive meta/settings; meta=${JSON.stringify(metaSnapshot)}`);
  assert.deepEqual(pageErrors, [], `Browser errors: ${pageErrors.join(' | ')}`);
  assert.deepEqual(externalRequests, [], `Unexpected external requests: ${externalRequests.join(' | ')}`);
  await page.screenshot({ path: 'ops/evidence/flutter-web-smoke-375.png', fullPage: true });
  const report = {
    schema_version: 'flutter-web-browser-smoke.v1',
    recorded_at: new Date().toISOString(),
    result: 'PASS',
    scope: 'synthetic fresh browser profile; loopback static serving of build/web; 375x812 viewport',
    checks: { app_booted: true, sample_onboarding_action: 'PASS', url_after_sample_action: afterOnboarding, url_after_reload: afterReload, indexeddb_databases: indexedDb.map(item => item.name), persisted_onboarding_done: persistedSettings.onboardingDone, page_errors: pageErrors, paid_calls: 0, external_requests: externalRequests.length },
    screenshot: 'ops/evidence/flutter-web-smoke-375.png',
  };
  await writeFile('ops/evidence/flutter-web-smoke-20261018.json', `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report));
} finally {
  await browser.close();
  await new Promise(resolveClose => server.close(resolveClose));
}
