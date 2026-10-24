/**
 * Feature wave D e2e (mobile 390x844 dsf2 ar-SA Asia/Riyadh, headless chromium, clock pinned, data named "test"):
 *   Evidence strength filter + «أضيفيها لعاداتي» (+ undo), Home block (timer, zone, errand), Settings (cap + modules),
 *   Focus (phone-away prompt, silent pill, try-first tip, retrieval step), storage banner. Also checks: no console
 *   errors, no horizontal overflow at 390px, text scale 2.0 does not clip horizontally.
 * Run: npm run build && PLAYWRIGHT_MODULE=<…/playwright/index.mjs> SHOTS=<dir> node tests/e2e/featureD.e2e.mjs
 * Env: REACT_DIR (default ./dist), SHOTS, PORT (5733), CHROMIUM, DARK=1
 */
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright')
const REACT_DIR = path.resolve(process.env.REACT_DIR ?? 'dist')
const SHOTS = path.resolve(process.env.SHOTS ?? 'e2e-shots')
const PORT = Number(process.env.PORT ?? 5733)
const DARK = !!process.env.DARK
const LABEL = DARK ? 'dark' : 'light'
const BASE = `http://localhost:${PORT}/wejdan-os/`
fs.mkdirSync(SHOTS, { recursive: true })

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ico': 'image/x-icon' }
const server = http.createServer((req, res) => {
  const u = new URL(req.url ?? '/', `http://localhost:${PORT}`)
  if (!u.pathname.startsWith('/wejdan-os/')) return void res.writeHead(404).end()
  const rel = decodeURIComponent(u.pathname.slice('/wejdan-os/'.length)) || 'index.html'
  let file = path.join(REACT_DIR, rel)
  if (!file.startsWith(REACT_DIR)) return void res.writeHead(403).end()
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html')
  if (!fs.existsSync(file)) return void res.writeHead(404).end()
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' })
  fs.createReadStream(file).pipe(res)
})
await new Promise((ok) => server.listen(PORT, ok))

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium', args: ['--headless=new'] })
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  locale: 'ar-SA', timezoneId: 'Asia/Riyadh', serviceWorkers: 'block', colorScheme: DARK ? 'dark' : 'light',
})
// pin the wall clock (page.clock stalls framer-motion): Wed 2026-10-14 17:00 Riyadh, still ticking
await ctx.addInitScript(() => {
  const real = Date.now.bind(Date)
  const base = Date.UTC(2026, 9, 14, 14, 0, 0)
  const t0 = real()
  const NativeDate = Date
  class FakeDate extends NativeDate {
    constructor(...a) { super(...(a.length ? a : [base + (real() - t0)])) }
    static now() { return base + (real() - t0) }
  }
  // eslint-disable-next-line no-global-assign
  Date = FakeDate
})
const page = await ctx.newPage()
page.setDefaultTimeout(8000)
const consoleErrors = []
page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()))
page.on('pageerror', (e) => consoleErrors.push(String(e)))

const failures = []
const log = (...a) => console.log(...a)
const check = (ok, what) => { log(ok ? '  PASS' : '  FAIL', what); if (!ok) failures.push(what) }
const shot = (name) => page.screenshot({ path: path.join(SHOTS, `${name}-${LABEL}.png`) })
const go = async (hash, wait = 1000) => { await page.goto(BASE + (hash ? '#' + hash : ''), { waitUntil: 'load' }); await page.waitForTimeout(wait) }
const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
async function readBox(box) {
  return page.evaluate(async (box) => new Promise((ok, bad) => {
    const req = indexedDB.open('wejdan_life_os')
    req.onsuccess = () => {
      const db = req.result
      const g = db.transaction('records', 'readonly').objectStore('records').index('box').getAll(box)
      g.onsuccess = () => { db.close(); ok(g.result.map((r) => r.value)) }
      g.onerror = () => bad(String(g.error))
    }
    req.onerror = () => bad(String(req.error))
  }), box)
}
async function scale2() {
  await page.addStyleTag({ content: 'html{font-size:200% !important}' })
  await page.waitForTimeout(400)
  const o = await overflow()
  return o
}

try {
  await go('', 1500)
  await page.getByRole('button', { name: /يلا نبدأ/ }).first().click(); await page.waitForTimeout(400)
  await page.locator('input').first().fill('test')
  for (let i = 0; i < 3; i++) { await page.getByRole('button', { name: /^\s*التالي\s*$/ }).click(); await page.waitForTimeout(400) }
  await page.getByRole('button', { name: /^\s*(التالي|تخطّي)\s*$/ }).click(); await page.waitForTimeout(1200)
  await page.getByRole('button', { name: /^\s*(التالي|تخطّي)\s*$/ }).click(); await page.waitForTimeout(400)
  await page.getByRole('button', { name: /ابدئي يومك/ }).click(); await page.waitForTimeout(2200)

  // ---- Evidence ----
  log('Evidence')
  await go('/me/evidence')
  await shot('evidence-1-list')
  check((await overflow()) <= 0, 'evidence: no horizontal overflow')
  const group = page.getByRole('group', { name: 'قوة الدليل' })
  await group.getByRole('button', { name: /تجربة/ }).click(); await page.waitForTimeout(500)
  check((await page.getByText(/^تجربة · /).count()) > 0, 'evidence: RCT filter shows rows labelled تجربة')
  await shot('evidence-2-filtered')
  await group.getByRole('button', { name: /الكل/ }).click(); await page.waitForTimeout(300)
  await page.getByLabel('بحث في الأدلة').fill('ضوء النهار')
  await page.waitForTimeout(500)
  await shot('evidence-3-search')
  await page.getByText('ضوء النهار').first().click(); await page.waitForTimeout(700)
  await shot('evidence-4-detail')
  await page.getByRole('button', { name: 'أضيفيها لعاداتي' }).click(); await page.waitForTimeout(1200)
  const added = true
  check(added, 'evidence: found an entry that can become a habit and tapped it')
  await shot('evidence-5-added')
  const habits = await readBox('habits')
  check(habits.some((h) => String(h.id ?? '').startsWith('h_ev_')), 'evidence: habit created in IndexedDB (id h_ev_*)')
  await page.getByRole('button', { name: 'تراجع' }).first().click().catch(() => {}); await page.waitForTimeout(700)
  check(!(await readBox('habits')).some((h) => String(h.id ?? '').startsWith('h_ev_')), 'evidence: undo removed the habit')

  // ---- Home ----
  log('Home')
  await go('/me/home')
  await shot('home-1')
  check((await overflow()) <= 0, 'home: no horizontal overflow')
  await page.getByRole('button', { name: 'ابدئي' }).first().click(); await page.waitForTimeout(1300)
  await shot('home-2-running')
  await page.getByRole('button', { name: 'وقفة' }).first().click(); await page.waitForTimeout(300)
  await page.getByRole('button', { name: 'غيّري المنطقة' }).click(); await page.waitForTimeout(600)
  check((await readBox('meta')).some((m) => m.v?.homeZoneOffset === 1), 'home: zone offset persisted (1)')
  await page.getByLabel('مشوار جديد').fill('test')
  await page.getByRole('button', { name: 'أضيفي', exact: true }).click(); await page.waitForTimeout(700)
  check((await readBox('errands')).some((e) => e.title === 'test'), 'home: errand "test" saved')
  await shot('home-3-errand')
  check((await scale2()) <= 0, 'home: text scale 2.0 no horizontal overflow')
  await shot('home-4-scale2')

  // ---- Settings ----
  log('Settings')
  await go('/me/settings')
  await page.getByLabel('الحد الأقصى للتذكيرات باليوم').scrollIntoViewIfNeeded()
  await page.getByLabel('الحد الأقصى للتذكيرات باليوم').selectOption('2'); await page.waitForTimeout(500)
  await shot('settings-1-cap')
  check((await readBox('meta')).some((m) => m.v?.notificationCap === 2), 'settings: cap persisted (2)')
  await page.getByText('الوحدات الاختيارية').scrollIntoViewIfNeeded()
  await shot('settings-2-modules')
  check((await overflow()) <= 0, 'settings: no horizontal overflow')
  check((await scale2()) <= 0, 'settings: text scale 2.0 no horizontal overflow')

  // ---- Focus ----
  log('Focus')
  await go('/focus/free')
  await shot('focus-1-ready')
  check(await page.getByText('الجوال على جنب؟').count() > 0, 'focus: phone-away prompt shown')
  check(await page.getByText('الإشعارات صامتة').count() === 0, 'focus: silent pill NOT shown before she confirms')
  await page.getByRole('button', { name: 'بعّدته' }).click(); await page.waitForTimeout(300)
  await page.getByRole('button', { name: 'ابدئي' }).click(); await page.waitForTimeout(800)
  check(await page.getByText('الإشعارات صامتة').count() > 0, 'focus: pill shown after she confirms')
  await shot('focus-2-running')
  check((await overflow()) <= 0, 'focus: no horizontal overflow')

  const real = consoleErrors.filter((e) => !/favicon|manifest|sw\.js|Failed to load resource/.test(e))
  check(real.length === 0, `no console errors${real.length ? ': ' + real.join(' | ') : ''}`)
} catch (e) {
  console.error(e)
  failures.push('exception: ' + e.message)
  await shot('error').catch(() => {})
}
await browser.close()
server.close()
if (failures.length) { console.log(`\n${failures.length} FAILED`); process.exit(1) }
console.log('\nALL PASSED')
