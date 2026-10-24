/**
 * End-to-end guard for feat/a: weekly review depth (blockers + fix, strength check, season adjust, week experiment,
 * chapter card), Insights charts, and «احتفالاتي». Mobile 390x844 dsf2, touch, ar-SA, Asia/Riyadh, headless chromium.
 * Every record it creates is named "test" (title). Date is pinned (Sat 2026-10-24 12:00 +03) with a ticking clock.
 *
 * Run (needs a production build in REACT_DIR):
 *   npm run build && PLAYWRIGHT_MODULE=<…/playwright/index.mjs> SHOTS=<dir> node tests/e2e/reviewInsightsCelebrations.e2e.mjs
 * Env: REACT_DIR (default ./dist), SHOTS (default ./e2e-shots), PORT (5731), LABEL, CHROMIUM, DARK=1, SCALE=2 (text scale).
 */
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright')
const REACT_DIR = path.resolve(process.env.REACT_DIR ?? 'dist')
const SHOTS = path.resolve(process.env.SHOTS ?? 'e2e-shots')
const PORT = Number(process.env.PORT ?? 5731)
const LABEL = process.env.LABEL ?? 'fa'
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
  locale: 'ar-SA', timezoneId: 'Asia/Riyadh', serviceWorkers: 'block', colorScheme: process.env.DARK ? 'dark' : 'light',
})
await ctx.addInitScript(() => {
  const R = Date
  const fixed = new R('2026-10-24T12:00:00+03:00').getTime()
  const start = R.now()
  class D extends R {
    constructor(...a) { if (a.length) super(...a); else super(fixed + (R.now() - start)) }
    static now() { return fixed + (R.now() - start) }
  }
  globalThis.Date = D
})
const page = await ctx.newPage()
page.setDefaultTimeout(8000)
const consoleErrors = []
page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) consoleErrors.push(m.text()) })
page.on('pageerror', (e) => consoleErrors.push(String(e)))

const failures = []
const log = (...a) => console.log(...a)
const check = (ok, what) => { log(ok ? '  PASS' : '  FAIL', what); if (!ok) failures.push(what) }
const shot = (name) => page.screenshot({ path: path.join(SHOTS, `${LABEL}-${name}.png`) })
const go = async (hash, wait = 1000) => {
  await page.goto(BASE + (hash ? '#' + hash : ''), { waitUntil: 'load' })
  await page.waitForTimeout(wait)
  if (process.env.SCALE) await page.evaluate((s) => { document.documentElement.style.fontSize = Number(s) * 100 + '%' }, process.env.SCALE)
}
const noOverflow = async (where) => {
  const d = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  check(d <= 0, `${where}: no horizontal overflow (${d})`)
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
const next = async () => { await page.getByRole('button', { name: /^\s*التالي\s*$/ }).click(); await page.waitForTimeout(650) }
const heading = (t) => page.getByRole('heading', { level: 2, name: t })

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

  log('1. Weekly review — depth steps')
  await go('/review', 1500)
  await shot('review-cover')
  await noOverflow('review cover')
  await page.getByRole('button', { name: 'يلا نبدأ' }).click(); await page.waitForTimeout(700)
  for (let i = 0; i < 3; i++) await next() // wins → important → deferred → blockers
  check(await heading('وش اللي عطّلك؟').count() > 0, 'blockers step is shown')
  await page.getByRole('button', { name: 'كانت كبيرة عليّ' }).click(); await page.waitForTimeout(400)
  check(await page.getByText(/اقتراح تعديل وحد/).count() === 1, 'one suggested fix card for one blocker')
  await shot('review-blockers'); await noOverflow('blockers')
  await next() // pause
  await next() // strength
  check(await heading('كيف صارت عاداتك؟').count() > 0, 'strength step is shown')
  const groups = page.getByRole('radiogroup').filter({ has: page.getByRole('radio', { name: '5', exact: true }) })
  check((await groups.count()) === 4, 'four rating groups of 1–5')
  for (let i = 0; i < 4; i++) await groups.nth(i).getByRole('radio', { name: '4', exact: true }).click()
  await page.waitForTimeout(300)
  check(await page.getByText('شبه تلقائية.').count() === 1, 'a word, not a score, once complete')
  await shot('review-strength'); await noOverflow('strength')
  await next() // season
  check(await heading('تعديل الموسم').count() > 0, 'season step is shown')
  await shot('review-season'); await noOverflow('season')
  await next() // top3
  await next() // experiment
  check(await heading('تجربة الأسبوع').count() > 0, 'experiment step is shown')
  const opts = page.getByRole('radiogroup', { name: 'تجربة الأسبوع' }).getByRole('radio')
  const nOpts = await opts.count()
  if (nOpts > 1) await opts.first().click()
  await page.waitForTimeout(300)
  await shot('review-experiment'); await noOverflow('experiment')
  await next() // close
  await page.getByPlaceholder('مثلًا: أسبوع الهدوء').fill('test')
  await shot('review-close'); await noOverflow('close')
  await page.getByRole('button', { name: 'خلّصي المراجعة' }).click(); await page.waitForTimeout(1500)
  check(await page.getByText(/سكّرتي الفصل/).count() > 0, 'chapter closed (done screen with chapter card)')
  await shot('review-done'); await noOverflow('done')
  const checks = await readBox('strengthChecks')
  check(checks.length === 1 && checks[0].items.join() === '4,4,4,4', 'strength check stored (4,4,4,4)')
  const reviews = await readBox('weeklyReviews')
  check(reviews.length === 1 && reviews[0].chapterTitle === 'test' && reviews[0].blockers.includes('كانت كبيرة عليّ'), 'review stored with chapter title and blocker')
  if (nOpts > 1) {
    const exps = await readBox('experiments')
    check(exps.some((e) => e.status === 'active') && reviews[0].experimentId != null, 'week experiment started and linked to the review')
  }

  log('2. Insights')
  await go('/me/insights', 1500)
  check(await page.getByText('الزخم حسب المجال').count() > 0, 'momentum card present')
  check(await page.getByText('سرعة الرجوع').count() > 0, 'return speed card present')
  await shot('insights'); await noOverflow('insights')
  await page.evaluate(() => document.querySelectorAll('*').forEach((e) => { if (e.scrollHeight > e.clientHeight + 40 && getComputedStyle(e).overflowY !== 'visible') e.scrollTop = 700 }))
  await page.waitForTimeout(300); await shot('insights-2')

  log('3. «احتفالاتي»')
  await go('/joy/celebrations', 1500)
  check(await page.getByText(/الفصل 1 · test/).count() > 0, 'the closed chapter appears in the history')
  // stars of this screen only (tab roots kept alive behind a pushed screen are inert / hidden)
  const stars = await page.evaluate(() => [...document.querySelectorAll('svg path[d^="M0 -1 Q"]')].filter((p) => {
    const s = p.closest('svg'); return !s.parentElement.closest('[inert],[aria-hidden="true"],[hidden]') && s.checkVisibility()
  }).length)
  check(stars <= 3, `at most 3 stars on the screen (${stars})`)
  await shot('celebrations'); await noOverflow('celebrations')

  check(consoleErrors.length === 0, `no console errors${consoleErrors.length ? ' — ' + JSON.stringify(consoleErrors.slice(0, 3)) : ''}`)
} catch (e) {
  failures.push('exception: ' + (e?.message ?? e))
  console.error(e)
  await shot('failure').catch(() => {})
}
await browser.close()
server.close()
console.log(failures.length ? `\n${failures.length} FAILED` : '\nALL PASS')
process.exit(failures.length ? 1 : 0)
