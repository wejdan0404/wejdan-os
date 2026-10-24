import { chromium } from 'playwright';
import fs from 'fs';
const T = process.env.T, PORT = 8931, URL0 = `http://127.0.0.1:${PORT}/wejdan-os/`;
const set = (v) => fs.writeFileSync(`${T}/current`, v);
const flag = (name, on) => on ? fs.writeFileSync(`${T}/${name}`, '1') : fs.rmSync(`${T}/${name}`, { force: true });
const scenario = process.argv[2];
const dir = `${T}/profile-${scenario}`; fs.rmSync(dir, { recursive: true, force: true });
const launch = () => chromium.launchPersistentContext(dir, { executablePath: '/opt/pw-browsers/chromium',
  args: ['--headless=new', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'], viewport: { width: 390, height: 844 } });
async function probe(page, label) {
  await page.waitForTimeout(6000);
  const r = await page.evaluate(async () => {
    const dbs = (await indexedDB.databases()).map(d => d.name).filter(n => n && n.startsWith('wlo_')).sort();
    let habits = -1;
    if (dbs.includes('wlo_habits')) habits = await new Promise(res => { const o = indexedDB.open('wlo_habits'); o.onsuccess = () => { try { const tx = o.result.transaction('box'); const c = tx.objectStore('box').count(); c.onsuccess = () => { res(c.result); o.result.close(); }; } catch (e) { res('err:' + e.message); } }; o.onerror = () => res('openerr'); });
    const regs = 'serviceWorker' in navigator ? (await navigator.serviceWorker.getRegistrations()).map(r => (r.active || r.waiting || r.installing)?.scriptURL?.split('/').pop()) : [];
    const cacheKeys = await caches.keys();
    return { title: document.title, flutter: !!document.querySelector('flutter-view, flt-glass-pane'),
      migrationSheet: document.body.innerText.includes('لقينا بياناتك من النسخة القديمة'), url: location.href, legacyDbs: dbs.length, habits, regs, cacheKeys };
  });
  const app = r.flutter ? 'FLUTTER(old)' : (r.title === 'وجدان' ? 'REACT(new)' : `OTHER(${r.title})`);
  console.log(`[${scenario}] ${label}: app=${app} migrationSheet=${r.migrationSheet} legacyDbs=${r.legacyDbs} habitsInOldDb=${r.habits} sw=${JSON.stringify(r.regs)} caches=${JSON.stringify(r.cacheKeys)} url=${r.url.replace(URL0, './')}`);
  return { app, ...r };
}
const errors = [];
let ctx = await launch(); let page = ctx.pages()[0] || await ctx.newPage();
page.on('pageerror', e => errors.push(String(e)));
// 1) Old Flutter app with test data
set(scenario === 'cachingsw' ? 'flutter_cachingsw' : 'flutter');
await page.goto(URL0 + '?seed=test&onboarded=1&energy=green', { waitUntil: 'load' });
await page.waitForTimeout(9000);
if (scenario === 'cachingsw') {
  await page.evaluate(async () => { const r = await navigator.serviceWorker.register('flutter_service_worker.js'); await navigator.serviceWorker.ready; });
  await page.waitForTimeout(3000);
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(6000);
}
await probe(page, 'before swap');
// 2) Deploy the React build at the same origin/path
set('react');
if (scenario === 'expiredSubres') flag('nostore_subres', true);
// relaunch #1: close and reopen the browser (like reopening the home-screen app), navigate (no forced reload)
await ctx.close(); ctx = await launch(); page = ctx.pages()[0] || await ctx.newPage(); page.on('pageerror', e => errors.push(String(e)));
await page.goto(URL0, { waitUntil: 'load' }).catch(e => console.log('goto err', e.message));
await page.waitForTimeout(9000);
const a = await probe(page, 'launch 1 after swap (15s)');
// relaunch #2
await ctx.close(); ctx = await launch(); page = ctx.pages()[0] || await ctx.newPage(); page.on('pageerror', e => errors.push(String(e)));
await page.goto(URL0, { waitUntil: 'load' }).catch(e => console.log('goto err', e.message));
const b = await probe(page, 'launch 2 after swap');
// reload
await page.reload({ waitUntil: 'load' });
const c = await probe(page, 'reload');
flag('nostore_subres', false);
console.log(`[${scenario}] pageerrors(after swap):`, errors.filter(e => !/flutter|dart|canvaskit/i.test(e)).slice(0, 3));
await ctx.close();
