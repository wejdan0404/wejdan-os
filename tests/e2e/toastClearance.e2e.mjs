/**
 * End-to-end guard for release-gate defect N1: the undo toast must NEVER cover, replace or disable a
 * control. Mobile 390x844, touch, ar-SA, headless chromium. Every record it creates is named "test".
 *
 * Checks (each fails the run):
 *   1. Today: quick-add `test` -> the toast's box intersects no visible button / link / input / tab.
 *   2. Today (above) and the other 4 tabs, each reached by tapping the tab bar WHILE a fresh toast is up
 *      (so the tabs must be live and tapping them must not undo): same bounds check.
 *   3. Tapping «أنا» while the toast is up navigates to /me and does NOT undo (inbox stays 1).
 *   4. Fullscreen Brief after «+ أضيفيه»: same bounds check, and «أرتّبه بنفسي» is still the top hit-test
 *      target at its centre.
 *
 * Run (not part of vitest; needs a production build in REACT_DIR):
 *   npm run build && PLAYWRIGHT_MODULE=<…/playwright/index.mjs> SHOTS=<dir> node tests/e2e/toastClearance.e2e.mjs
 * Env: REACT_DIR (default ./dist), SHOTS (default ./e2e-shots), PORT (default 5712), LABEL (screenshot prefix),
 *      CHROMIUM (default /opt/pw-browsers/chromium), REPORT_ONLY=1 (print the findings, exit 0),
 *      DARK=1 / REDUCED=1 (dark scheme / prefers-reduced-motion).
 */
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright')
const REACT_DIR = path.resolve(process.env.REACT_DIR ?? 'dist')
const SHOTS = path.resolve(process.env.SHOTS ?? 'e2e-shots')
const PORT = Number(process.env.PORT ?? 5712)
const LABEL = process.env.LABEL ?? 'n1'
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
  locale: 'ar-SA', timezoneId: 'Asia/Riyadh', serviceWorkers: 'block',
  colorScheme: process.env.DARK ? 'dark' : 'light',
  reducedMotion: process.env.REDUCED ? 'reduce' : 'no-preference',
})
const page = await ctx.newPage()
page.setDefaultTimeout(8000)

const failures = []
const log = (...a) => console.log(...a)
const check = (ok, what) => { log(ok ? '  PASS' : '  FAIL', what); if (!ok) failures.push(what) }
const shot = (name) => page.screenshot({ path: path.join(SHOTS, `${LABEL}-${name}.png`) })

/** The bounds check: every visible, live control (not the toast's own) vs. the toast's bounding box. */
async function overlap() {
  return page.evaluate(() => {
    const toast = document.querySelector('[data-toast]')
    if (!toast) return { toast: null, hits: [] }
    const tb = toast.getBoundingClientRect()
    const sel = 'button,a[href],input,select,textarea,summary,[role=button],[role=checkbox],[role=switch],[role=tab],[role=radio],[role=menuitem]'
    const hits = []
    for (const el of document.querySelectorAll(sel)) {
      if (toast.closest('[role=status]')?.contains(el)) continue
      if (el.closest('[inert],[hidden]')) continue
      const cs = getComputedStyle(el)
      if (cs.visibility === 'hidden' || cs.display === 'none') continue
      // the control's VISIBLE box: clipped by every scrollport / overflow:hidden ancestor
      let r = el.getBoundingClientRect()
      let L = r.left, T = r.top, R = r.right, B = r.bottom
      for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
        const ov = getComputedStyle(a)
        if (ov.overflowX === 'visible' && ov.overflowY === 'visible') continue
        const ar = a.getBoundingClientRect()
        L = Math.max(L, ar.left); T = Math.max(T, ar.top); R = Math.min(R, ar.right); B = Math.min(B, ar.bottom)
      }
      r = { left: L, top: T, right: R, bottom: B, width: R - L, height: B - T }
      if (r.width <= 0 || r.height <= 0 || r.bottom <= 0 || r.top >= innerHeight) continue
      const ix = Math.max(0, Math.min(r.right, tb.right) - Math.max(r.left, tb.left))
      const iy = Math.max(0, Math.min(r.bottom, tb.bottom) - Math.max(r.top, tb.top))
      if (ix * iy > 0.5) hits.push({ name: (el.getAttribute('aria-label') || el.innerText || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 40), area: Math.round(ix * iy) })
    }
    return { toast: { y: Math.round(tb.y), bottom: Math.round(tb.bottom), h: Math.round(tb.height) }, hits }
  })
}
async function checkClear(where) {
  await page.waitForTimeout(500) // spring settled
  const o = await overlap()
  if (!o.toast) return check(false, `${where}: toast is on screen`)
  check(o.hits.length === 0, `${where}: toast y ${o.toast.y}-${o.toast.bottom} intersects no control${o.hits.length ? ' — ' + JSON.stringify(o.hits) : ''}`)
}
async function readBox(box) {
  return page.evaluate(async (box) => new Promise((ok, bad) => {
    const req = indexedDB.open('wejdan_life_os')
    req.onsuccess = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('records')) { db.close(); ok([]); return }
      const g = db.transaction('records', 'readonly').objectStore('records').index('box').getAll(box)
      g.onsuccess = () => { db.close(); ok(g.result.map((r) => r.value)) }
      g.onerror = () => bad(String(g.error))
    }
    req.onerror = () => bad(String(req.error))
  }), box)
}
const go = async (hash, wait = 900) => {
  await page.goto(BASE + (hash ? '#' + hash : ''), { waitUntil: 'load' })
  await page.waitForTimeout(wait)
}
const tabBtn = (name) => page.locator('nav[aria-label="الأقسام"]').getByRole('button', { name })
async function quickAdd() {
  await page.getByRole('button', { name: 'إضافة سريعة' }).first().click()
  await page.waitForTimeout(600)
  await page.locator('[role=dialog] input').first().fill('test')
  await page.getByRole('button', { name: /احفظيها/ }).click()
  await page.waitForTimeout(700)
}
const toastVisible = () => page.locator('[data-toast]').count().then((n) => n > 0)

try {
  // onboarding (everything typed is "test")
  await go('', 1500)
  await page.getByRole('button', { name: /يلا نبدأ/ }).first().click(); await page.waitForTimeout(400)
  await page.locator('input').first().fill('test')
  for (let i = 0; i < 3; i++) { await page.getByRole('button', { name: /^\s*التالي\s*$/ }).click(); await page.waitForTimeout(400) }
  await page.getByRole('button', { name: /^\s*(التالي|تخطّي)\s*$/ }).click(); await page.waitForTimeout(1200)
  const chips = page.getByRole('group', { name: 'عادات تبدين فيها' }).locator('button')
  for (let i = 0; i < Math.min(3, await chips.count()); i++) { await chips.nth(i).click(); await page.waitForTimeout(120) }
  await page.getByRole('button', { name: /^\s*(التالي|تخطّي)\s*$/ }).click(); await page.waitForTimeout(400)
  await page.getByRole('button', { name: /ابدئي يومك/ }).click(); await page.waitForTimeout(2200)

  // 1. Today
  log('1. Today — quick add `test`')
  await quickAdd()
  check(await toastVisible(), 'toast shown after quick add')
  await checkClear('Today')
  await shot('01-today-toast')
  const nav = await page.locator('nav[aria-label="الأقسام"] ul').evaluate((e) => ({ inert: e.hasAttribute('inert'), vis: getComputedStyle(e).visibility }))
  check(!nav.inert && nav.vis === 'visible', 'tab bar is live (not inert, not hidden) while the toast shows')
  check((await readBox('inbox')).length === 1, 'inbox has 1 captured item')

  // 2. every tab, tapped while the toast is up
  const TABS = ['عاداتي', 'مساري', 'متعتي', 'أنا']
  const shotNames = { عاداتي: 'habits', مساري: 'path', متعتي: 'joy', أنا: 'me' }
  for (const t of TABS) {
    log(`2. tab «${t}» while the toast is up`)
    await tabBtn('اليوم').tap(); await page.waitForTimeout(500)
    await quickAdd() // a fresh 5 s toast every time
    const inboxBefore = (await readBox('inbox')).length
    await tabBtn(t).tap()
    await page.waitForTimeout(400)
    check((await tabBtn(t).getAttribute('aria-current')) === 'page', `tapping «${t}» with the toast up navigates there`)
    check((await readBox('inbox')).length === inboxBefore, `that tap did not undo anything (inbox ${inboxBefore})`)
    if (t === 'أنا') check(/#\/me\b/.test(page.url()), `«أنا» tab -> ${new URL(page.url()).hash}`)
    check(await toastVisible(), `toast still on screen over «${t}»`)
    await checkClear(`tab «${t}»`)
    await shot(`02-tab-${shotNames[t]}`)
  }

  // 3. exact natural tap: the old «تراجع» position over «أنا» (bottom-left in RTL)
  log('3. tap at the «أنا» tab centre with a fresh toast')
  await tabBtn('اليوم').tap(); await page.waitForTimeout(500)
  await quickAdd()
  const before = (await readBox('inbox')).length
  const box = await tabBtn('أنا').boundingBox()
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2)
  await page.waitForTimeout(600)
  check(/#\/me\b/.test(page.url()), 'tap on the «أنا» tab centre navigates to /me')
  check((await readBox('inbox')).length === before, `inbox unchanged by the tap (${before})`)
  await shot('03-after-tap-ana')

  // 4. fullscreen Brief
  log('4. Brief — «+ أضيفيه»')
  await go('/brief', 1500)
  await page.waitForTimeout(500)
  const add = page.locator('section[data-stack=pushed]').last().getByRole('button', { name: /^أضيفي .* لليوم$/ }).first()
  await add.click()
  await page.waitForTimeout(400)
  check(await toastVisible(), 'toast shown after «+ أضيفيه»')
  await checkClear('Brief')
  const self = page.getByRole('button', { name: /أرتّبه بنفسي/ }).first()
  if (await self.count()) {
    const b = await self.boundingBox()
    const top = await page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e?.closest('button')?.innerText?.trim() ?? e?.tagName }, [b.x + b.width / 2, b.y + b.height / 2])
    check(/أرتّبه بنفسي/.test(top ?? ''), `«أرتّبه بنفسي» is the hit-test target at its centre (${top})`)
  } else log('  (no «أرتّبه بنفسي» button in this state)')
  await shot('04-brief-toast')
  await page.getByRole('button', { name: /أضيفي المقترح كله/ }).first().click().catch(() => {})
  await page.waitForTimeout(500)
  if (await toastVisible()) await checkClear('Brief after «أضيفي المقترح كله»')
  await shot('05-brief-addall-toast')
} catch (e) {
  failures.push('exception: ' + e.message)
  console.error(e)
  await shot('ERR').catch(() => {})
}
await browser.close()
server.close()
log(failures.length ? `\n${failures.length} FAILED` : '\nALL PASSED')
process.exit(failures.length && !process.env.REPORT_ONLY ? 1 : 0)
