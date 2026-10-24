/**
 * Release-gate-3 D1 reproduction, now a regression test: enable the lock, then SIGKILL the browser at 150 ms / 600 ms /
 * 2 s / 6 s after «حفظته» (the registry in localStorage is flushed lazily; before the fix the plain DB was already
 * deleted and the encrypted data was unrecoverable). After the restart her habits must still be there in EVERY case:
 * either the plain app (lock never took effect) or the lock screen → unlock with the new credentials → same data.
 * Every record it creates is named "test".
 *
 *
 * Release-gate-4 additions (N1/N2): SIGKILL after «طفّي القفل» (turn lock off) and after deleting a profile, at
 * 100/300/600/1500/3000/8000 ms, with a SMALL profile (3 habits) and a BIG one shaped like the owner's real import
 * (15 habits, 102 products — synthetic rows, every one named "test", cloned from the app's own starter rows; no private
 * data is read). After the kill: restart, restart again, restart a third time; in every run
 *   - habits / products / notes of the live profile are exactly what they were before the operation (zero data loss);
 *   - no ghost: every profile in the registry has its database, no unlisted profile database is left behind, and the
 *     deleted profile can no longer be opened; the lock is either cleanly off (plain app, same data) or cleanly on.
 *
 * Run: npm run build && PLAYWRIGHT_MODULE=<…/playwright/index.mjs> node tests/e2e/lockKill.e2e.mjs
 * Env: REACT_DIR (./dist) · PORT (5714) · CHROMIUM · SCENARIOS (enable,turnoff,delete) · KINDS (small,big)
 *      DELAYS_ENABLE (default 150,600,2000,6000) · DELAYS (turnoff/delete, default 100,300,600,1500,3000,8000)
 */
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { execSync } from 'node:child_process'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright')
const REACT_DIR = path.resolve(process.env.REACT_DIR ?? 'dist')
const PORT = Number(process.env.PORT ?? 5714)
const BASE = `http://localhost:${PORT}/wejdan-os/`
const DELAYS_ENABLE = (process.env.DELAYS_ENABLE ?? '150,600,2000,6000').split(',').map(Number)
const DELAYS = (process.env.DELAYS ?? '100,300,600,1500,3000,8000').split(',').map(Number)
const SCENARIOS = (process.env.SCENARIOS ?? 'enable,turnoff,delete').split(',')
const KINDS = (process.env.KINDS ?? 'small,big').split(',')
const PW2 = 'op two pass 22'
const PW = 'kill test pass 1'

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.ico': 'image/x-icon' }
const server = http.createServer((req, res) => {
  const u = new URL(req.url ?? '/', `http://localhost:${PORT}`)
  if (!u.pathname.startsWith('/wejdan-os/')) return void res.writeHead(404).end()
  let file = path.join(REACT_DIR, decodeURIComponent(u.pathname.slice('/wejdan-os/'.length)) || 'index.html')
  if (!file.startsWith(REACT_DIR)) return void res.writeHead(403).end()
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html')
  if (!fs.existsSync(file)) return void res.writeHead(404).end()
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' })
  fs.createReadStream(file).pipe(res)
})
await new Promise((ok) => server.listen(PORT, ok))

const failures = []
const check = (ok, what) => { console.log(ok ? '  PASS' : '  FAIL', what); if (!ok) failures.push(what) }
const launch = (dir) => chromium.launchPersistentContext(dir, {
  executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium', args: ['--headless=new'],
  viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'ar-SA', timezoneId: 'Asia/Riyadh', serviceWorkers: 'allow',
})
/** rows per box of every IndexedDB database of the page (values are NOT read) */
const idbCounts = (page) => page.evaluate(async () => {
  const out = {}
  for (const { name } of await indexedDB.databases()) {
    out[name] = await new Promise((ok) => {
      const req = indexedDB.open(name)
      req.onupgradeneeded = () => req.transaction.abort()
      req.onerror = () => ok(null)
      req.onsuccess = () => {
        const db = req.result
        if (!db.objectStoreNames.contains('records')) { db.close(); return ok(null) }
        const g = db.transaction('records', 'readonly').objectStore('records').getAll()
        g.onsuccess = () => { db.close(); const c = {}; for (const r of g.result) c[r.box] = (c[r.box] ?? 0) + 1; ok(c) }
      }
    })
  }
  return out
})

async function onboard(page) {
  const w = (ms) => page.waitForTimeout(ms)
  await page.goto(BASE, { waitUntil: 'load' }); await w(1500)
  await page.getByRole('button', { name: /يلا نبدأ/ }).first().click(); await w(400)
  await page.locator('input').first().fill('test')
  for (let i = 0; i < 3; i++) { await page.getByRole('button', { name: /^\s*التالي\s*$/ }).click(); await w(400) }
  await page.getByRole('button', { name: /^\s*(التالي|تخطّي)\s*$/ }).click(); await w(1200)
  const chips = page.getByRole('group', { name: 'عادات تبدين فيها' }).locator('button')
  for (let i = 0; i < Math.min(3, await chips.count()); i++) { await chips.nth(i).click(); await w(120) }
  await page.getByRole('button', { name: /^\s*(التالي|تخطّي)\s*$/ }).click(); await w(400)
  await page.getByRole('button', { name: /ابدئي يومك/ }).click(); await w(2200)
}


const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const pidsOf = (dir) => execSync(`pgrep -f 'user-data-di[r]=${dir}' || true`).toString().trim().split('\n').filter(Boolean)
async function sigkill(dir) {
  const pids = pidsOf(dir)
  for (const p of pids) { try { process.kill(Number(p), 'SIGKILL') } catch { /* gone */ } }
  await sleep(1500)
  return pids.length
}
/** closing a context whose browser was SIGKILLed can hang: never wait for it */
const closeHard = (ctx) => Promise.race([ctx.close().catch(() => {}), sleep(4000)])
async function openApp(dir, hash = '', settle = 3000) {
  const ctx = await launch(dir)
  const page = ctx.pages()[0] ?? (await ctx.newPage())
  page.setDefaultTimeout(10000)
  await page.goto(BASE + hash, { waitUntil: 'load' })
  await page.waitForTimeout(settle)
  return { ctx, page }
}
const registry = (page) => page.evaluate(() => {
  try { const r = JSON.parse(localStorage.getItem('wejdan.vault.v1')); return r ? r.profiles.map((p) => ({ user: p.username, db: p.dbName })) : null } catch { return 'bad' }
})
const dbNames = (page) => page.evaluate(() => indexedDB.databases().then((a) => a.map((x) => x.name).filter((n) => n.startsWith('wejdan_life_os'))))
const KEYS = ['habits', 'products', 'notes', 'inbox', 'tasks', 'later']
const pickKeys = (c) => Object.fromEntries(KEYS.map((k) => [k, c?.[k] ?? 0]))
/** Unlocks when the lock screen is up (profile picker first when 2 profiles are listed). Returns 'open' | 'unlocked' | 'missing' | 'stuck'. */
async function unlockIfLocked(page, pw = PW) {
  const picker = page.getByRole('button', { name: /· test$/ }).first()
  if ((await picker.count()) > 0) { await picker.click(); await page.waitForTimeout(600) }
  const btn = page.getByRole('button', { name: 'افتحي', exact: true })
  if ((await btn.count()) === 0) return 'open'
  await page.getByLabel('كلمة السر', { exact: true }).fill(pw)
  if ((await page.getByLabel('اسم المستخدم').count()) > 0) await page.getByLabel('اسم المستخدم').fill('test')
  await btn.click(); await page.waitForTimeout(3500)
  if ((await page.getByText('ما لقيناها على هذا الجهاز').count()) > 0) return 'missing'
  return (await page.getByRole('button', { name: 'افتحي', exact: true }).count()) > 0 ? 'stuck' : 'unlocked'
}
/** Synthetic owner-shaped data: 15 habits and 102 products, all named "test", cloned from the app's own starter rows. */
const inflate = (page) => page.evaluate(() => new Promise((ok, bad) => {
  const rq = indexedDB.open('wejdan_life_os')
  rq.onerror = () => bad(rq.error)
  rq.onsuccess = () => {
    const db = rq.result
    const tx = db.transaction('records', 'readwrite')
    const st = tx.objectStore('records')
    const g = st.getAll()
    g.onsuccess = () => {
      const habit = g.result.find((r) => r.box === 'habits').value
      const prod = g.result.find((r) => r.box === 'products').value
      const nh = g.result.filter((r) => r.box === 'habits').length
      const np = g.result.filter((r) => r.box === 'products').length
      for (let i = nh; i < 15; i++) st.put({ box: 'habits', id: `h_test_${i}`, value: { ...habit, id: `h_test_${i}`, titleAr: 'test', titleEn: 'test' } })
      for (let i = np; i < 102; i++) st.put({ box: 'products', id: `pr_test_${i}`, value: { ...prod, id: `pr_test_${i}`, name: 'test', placeholder: false } })
    }
    tx.oncomplete = () => { db.close(); ok(true) }
    tx.onerror = () => bad(tx.error)
  }
}))

async function enableLock(page) {
  await page.goto(BASE + '#/me/settings', { waitUntil: 'load' }); await page.waitForTimeout(900)
  await page.getByRole('switch', { name: 'قفل التطبيق' }).click(); await page.waitForTimeout(700)
  await page.getByLabel('اسم المستخدم').fill('test')
  await page.getByLabel('كلمة السر', { exact: true }).fill(PW)
  await page.getByLabel('أعيدي كلمة السر').fill(PW)
  await page.getByRole('button', { name: 'كمّلي' }).click(); await page.waitForTimeout(2500)
  await page.getByRole('button', { name: 'أظهريه' }).click()
  await page.getByRole('button', { name: 'حفظته' }).click()
}
async function turnOff(page) {
  await page.goto(BASE + '#/me/settings', { waitUntil: 'load' }); await page.waitForTimeout(1000)
  await page.getByRole('switch', { name: 'قفل التطبيق' }).click(); await page.waitForTimeout(800)
  await page.getByLabel('كلمة السر الحالية').fill(PW)
  await page.getByRole('button', { name: 'طفّي القفل' }).click()
}
async function addProfile(page) {
  await page.goto(BASE + '#/me/settings', { waitUntil: 'load' }); await page.waitForTimeout(1000)
  await page.getByText('الملفات على هالجهاز').first().click(); await page.waitForTimeout(800)
  await page.getByRole('button', { name: 'ملف جديد' }).click(); await page.waitForTimeout(800)
  await page.getByLabel('الاسم', { exact: true }).fill('test two'); await page.getByLabel('اسم المستخدم').fill('test2'); await page.getByLabel('كلمة السر', { exact: true }).fill(PW2)
  await page.getByRole('button', { name: 'أنشئي الملف' }).click(); await page.waitForTimeout(3000)
  await page.getByRole('button', { name: 'أظهريه' }).click(); await page.waitForTimeout(300)
  await page.getByRole('button', { name: 'حفظته' }).click(); await page.waitForTimeout(2000)
}
async function deleteProfile(page) {
  await page.goto(BASE + '#/me/settings', { waitUntil: 'load' }); await page.waitForTimeout(1000)
  await page.getByText('الملفات على هالجهاز').first().click(); await page.waitForTimeout(800)
  await page.getByRole('button', { name: 'احذفي ملف test two' }).click(); await page.waitForTimeout(900)
  await page.getByRole('button', { name: 'كمّلي للحذف' }).click(); await page.waitForTimeout(800)
  await page.getByLabel('كلمة سر الملف').fill(PW2)
  await page.getByRole('button', { name: 'احذفي الملف نهائيًا' }).click()
}

/** Bases (built once per kind): locked1 = one locked profile whose plain rollback was finalized; locked2 = + a second profile. */
const baseRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wos-g4-base-'))
async function buildBases(kind) {
  const d1 = path.join(baseRoot, `locked1-${kind}`)
  let { ctx, page } = { ctx: await launch(d1) }
  page = ctx.pages()[0] ?? (await ctx.newPage()); page.setDefaultTimeout(10000)
  await onboard(page)
  if (kind === 'big') await inflate(page)
  const plain = (await idbCounts(page))['wejdan_life_os']
  await enableLock(page); await page.waitForTimeout(3000)
  await ctx.close()
  // a later launch: real unlock finalizes the rollback (the plain DB goes)
  ;({ ctx, page } = await openApp(d1)); await unlockIfLocked(page); await page.waitForTimeout(2500); await ctx.close()
  ;({ ctx, page } = await openApp(d1)); const names = await dbNames(page); await ctx.close()
  const d2 = path.join(baseRoot, `locked2-${kind}`)
  execSync(`cp -r '${d1}' '${d2}'`)
  ;({ ctx, page } = await openApp(d2)); await unlockIfLocked(page); await addProfile(page); await page.waitForTimeout(1500); await ctx.close()
  return { d1, d2, plain: pickKeys(plain), names }
}

async function killRun(kind, op, delay, bases) {
  const src = op === 'delete' ? bases.d2 : bases.d1
  const dir = path.join(os.tmpdir(), `wos-g4-${kind}-${op}-${delay}`)
  fs.rmSync(dir, { recursive: true, force: true }); execSync(`cp -r '${src}' '${dir}'`)
  const tag = `${kind}/${op}/${delay}ms`
  console.log(`SIGKILL ${delay} ms after ${op === 'delete' ? 'deleting the second profile' : '«طفّي القفل»'} — ${kind} profile`)
  let { ctx, page } = await openApp(dir, '', 2500)
  check((await unlockIfLocked(page)) === 'unlocked', `${tag}: unlocked before the operation`)
  const reg0 = await registry(page)
  const c0 = await idbCounts(page)
  const live0 = pickKeys(c0[reg0[0].db])
  check(live0.habits === (kind === 'big' ? 15 : 3) && live0.products === (kind === 'big' ? 102 : 11), `${tag}: baseline habits ${live0.habits}, products ${live0.products}`)
  if (op === 'delete') await deleteProfile(page); else await turnOff(page)
  await page.waitForTimeout(delay)
  check((await sigkill(dir)) > 0, `${tag}: browser killed`)
  await closeHard(ctx)
  const log = []
  for (let launch = 1; launch <= 3; launch++) {
    ;({ ctx, page } = await openApp(dir, '', 3200))
    const reg = await registry(page)
    const names = await dbNames(page)
    let state = await unlockIfLocked(page)
    check(state !== 'missing' && state !== 'stuck', `${tag}: launch ${launch}: ${reg ? 'lock screen' : 'plain app'} -> ${state}`)
    await page.waitForTimeout(500)
    const counts = await idbCounts(page)
    const reg1 = await registry(page)
    const liveName = reg1 ? reg1[0].db : 'wejdan_life_os'
    const live = pickKeys(counts[liveName])
    check(JSON.stringify(live) === JSON.stringify(live0), `${tag}: launch ${launch}: live data identical ${JSON.stringify(live)}`)
    check((await page.locator('nav[aria-label="الأقسام"]').count()) === 1, `${tag}: launch ${launch}: app usable`)
    log.push({ launch, lock: reg ? reg.map((p) => p.user).join('+') : 'off', dbs: names.map((n) => n.replace('wejdan_life_os', 'W')).join(',') })
    if (launch === 3) {
      // final state: no ghost, nothing orphaned
      const listed = new Set((reg1 ?? []).map((p) => p.db))
      const finalNames = await dbNames(page)
      const profDbs = finalNames.filter((n) => n.startsWith('wejdan_life_os_p_'))
      for (const p of reg1 ?? []) check(finalNames.includes(p.db), `${tag}: registry profile ${p.user} has its database`)
      check(profDbs.every((n) => listed.has(n)), `${tag}: no unlisted profile database left (${profDbs.length} on disk, ${listed.size} listed)`)
      if (op === 'delete') {
        const two = (reg1 ?? []).some((p) => p.user === 'test2')
        if (two) {
          const c2 = pickKeys(counts[reg1.find((p) => p.user === 'test2').db])
          check(c2.habits >= 0, `${tag}: second profile still listed with its database (delete had not started: kill before the tombstone) — ${JSON.stringify(c2)}`)
        } else check(true, `${tag}: second profile fully gone`)
      } else {
        check(reg1 ? true : !finalNames.some((n) => n.startsWith('wejdan_life_os_p_')), reg1 ? `${tag}: lock still on (turn-off never became durable), data intact` : `${tag}: lock off, plain app, retired encrypted DB removed`)
      }
    }
    await ctx.close()
  }
  console.log('  ', JSON.stringify(log))
  fs.rmSync(dir, { recursive: true, force: true })
}
try {
  if (SCENARIOS.includes('enable')) for (const delay of DELAYS_ENABLE) {
    console.log(`SIGKILL ${delay} ms after «حفظته»`)
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), `wos-kill-${delay}-`))
    let ctx = await launch(dir)
    let page = ctx.pages()[0] ?? (await ctx.newPage())
    page.setDefaultTimeout(10000)
    await onboard(page)
    const before = (await idbCounts(page))['wejdan_life_os']
    check(!!before && before.habits > 0, `before: plain DB holds ${before?.habits} habits`)
    await page.goto(BASE + '#/me/settings', { waitUntil: 'load' }); await page.waitForTimeout(900)
    await page.getByRole('switch', { name: 'قفل التطبيق' }).click(); await page.waitForTimeout(700)
    await page.getByLabel('اسم المستخدم').fill('test')
    await page.getByLabel('كلمة السر', { exact: true }).fill(PW)
    await page.getByLabel('أعيدي كلمة السر').fill(PW)
    await page.getByRole('button', { name: 'كمّلي' }).click(); await page.waitForTimeout(2500)
    await page.getByRole('button', { name: 'أظهريه' }).click()
    await page.getByRole('button', { name: 'حفظته' }).click()
    await page.waitForTimeout(delay)
    const pids = execSync(`pgrep -f 'user-data-di[r]=${dir}' || true`).toString().trim().split('\n').filter(Boolean)
    for (const p of pids) { try { process.kill(Number(p), 'SIGKILL') } catch { /* gone */ } }
    await new Promise((r) => setTimeout(r, 1500))
    check(pids.length > 0, `browser killed (${pids.length} processes)`)
    // closing a context whose browser was SIGKILLed can hang: never wait for it
    await Promise.race([ctx.close().catch(() => {}), new Promise((r) => setTimeout(r, 4000))])

    ctx = await launch(dir)
    page = ctx.pages()[0] ?? (await ctx.newPage())
    page.setDefaultTimeout(10000)
    await page.goto(BASE, { waitUntil: 'load' }); await page.waitForTimeout(3000)
    const locked = (await page.getByRole('button', { name: 'افتحي', exact: true }).count()) > 0
    if (locked) {
      await page.getByLabel('كلمة السر', { exact: true }).fill(PW)
      await page.getByLabel('اسم المستخدم').fill('test').catch(() => {})
      await page.getByRole('button', { name: 'افتحي', exact: true }).click(); await page.waitForTimeout(3500)
    }
    const after = await idbCounts(page)
    const live = Object.entries(after).find(([n]) => n.startsWith('wejdan_life_os_p_'))?.[1] ?? after['wejdan_life_os']
    check(locked ? true : !!after['wejdan_life_os'], locked ? 'restart: lock screen (the vault survived) and the new credentials unlock it' : 'restart: lock never took effect — the plain app opened with its data')
    check(live?.habits === before.habits, `after restart: habits ${live?.habits} === ${before.habits}`)
    check((await page.locator('nav[aria-label="الأقسام"]').count()) === 1, 'the app is usable (tab bar present)')
    check(Object.keys(after).some((n) => n === 'wejdan_life_os' || n.startsWith('wejdan_life_os_p_')), `databases: ${Object.keys(after).join(', ')}`)
    await ctx.close()
    fs.rmSync(dir, { recursive: true, force: true })
  }
  for (const kind of KINDS) {
    if (!SCENARIOS.includes('turnoff') && !SCENARIOS.includes('delete')) break
    console.log(`building ${kind} bases`)
    const bases = await buildBases(kind)
    console.log('  bases ready; plain counts before locking', JSON.stringify(bases.plain), 'dbs', bases.names.join(','))
    for (const op of ['turnoff', 'delete']) {
      if (!SCENARIOS.includes(op)) continue
      for (const delay of DELAYS) await killRun(kind, op, delay, bases)
    }
  }
} catch (e) {
  console.error(e)
  failures.push(String(e))
} finally {
  server.close()
  fs.rmSync(baseRoot, { recursive: true, force: true })
}
if (failures.length) { console.log(`\n${failures.length} FAILED`); process.exit(1) }
console.log('\nALL PASS')
process.exit(0)
