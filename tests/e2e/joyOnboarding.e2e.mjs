/**
 * E2E for area G: the onboarding joy step («وش يفرّحك؟») — empty state, suggestion chip, add via the map's sheet,
 * skip path, text scale 200%. Mobile 390x844 dsf2 touch, ar-SA, Asia/Riyadh, Date pinned. Data it creates is named "test".
 *
 * Run (needs `npm run build`):
 *   PLAYWRIGHT_MODULE=<…/playwright/index.mjs> SHOTS=<dir> [DARK=1] [LABEL=x] node tests/e2e/joyOnboarding.e2e.mjs
 */
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright')
const REACT_DIR = path.resolve(process.env.REACT_DIR ?? 'dist')
const SHOTS = path.resolve(process.env.SHOTS ?? 'e2e-shots')
const PORT = Number(process.env.PORT ?? 5731)
const LABEL = process.env.LABEL ?? (process.env.DARK ? 'dark' : 'light')
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
})
// pin the clock at 2026-10-05 10:00 Riyadh (page.clock stalls framer-motion, so only Date is overridden)
await ctx.addInitScript(() => {
  const fixed = Date.UTC(2026, 9, 5, 7, 0, 0)
  const Real = Date
  const start = Real.now()
  class D extends Real {
    constructor(...a) { if (a.length) super(...a); else super(fixed + (Real.now() - start)) }
    static now() { return fixed + (Real.now() - start) }
  }
  // eslint-disable-next-line no-global-assign
  Date = D
})
const page = await ctx.newPage()
page.setDefaultTimeout(8000)
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push(String(e)))

const failures = []
const log = (...a) => console.log(...a)
const check = (ok, what) => { log(ok ? '  PASS' : '  FAIL', what); if (!ok) failures.push(what) }
const shot = (name) => page.screenshot({ path: path.join(SHOTS, `${LABEL}-${name}.png`) })
const nextBtn = () => page.getByRole('button', { name: /^\s*(التالي|تخطّي)\s*$/ })
const overflowX = () => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
const tier = (domain, label) => page.getByRole('group', { name: `حالة ${domain}` }).getByRole('button', { name: label })

try {
  log('1. reach the joy step')
  await page.goto(BASE, { waitUntil: 'load' })
  await page.waitForTimeout(1500)
  await page.getByRole('button', { name: /يلا نبدأ/ }).first().click(); await page.waitForTimeout(400)
  await page.locator('input').first().fill('test')
  for (let i = 0; i < 3; i++) { await nextBtn().click(); await page.waitForTimeout(500) }
  check(await page.getByRole('heading', { name: 'وش يفرّحك؟' }).isVisible(), 'joy step shows after the life map')
  check((await page.getByRole('progressbar', { name: 'خطوات البداية' }).getAttribute('aria-valuemax')) === '7', 'progress counts 7 steps')
  check(await page.getByRole('button', { name: 'تخطّي' }).isVisible(), 'empty: footer says «تخطّي»')
  check((await page.getByText('أضيفي أول وحدة').count()) === 3, 'three empty groups invite a first joy')
  await shot('joy-empty')
  check((await overflowX()) <= 0, 'no horizontal overflow (empty)')

  log('2. suggestion chip + add via the map')
  await page.getByRole('group', { name: 'أفكار تبدين منها' }).getByRole('button', { name: /مشي قصير/ }).click(); await page.waitForTimeout(500)
  check(await page.getByRole('group', { name: 'متع سريعة' }).getByRole('button', { name: /مشي قصير/ }).isVisible(), 'tapped suggestion lands in the quick group')
  check(await page.getByRole('button', { name: 'التالي' }).isVisible(), 'footer now says «التالي»')
  await page.getByRole('group', { name: 'متع كبيرة' }).getByRole('button', { name: /أضيفي/ }).click(); await page.waitForTimeout(700)
  await shot('joy-sheet')
  await page.getByRole('dialog').getByRole('textbox').first().fill('test')
  await page.getByRole('dialog').getByRole('button', { name: 'أضيفيها' }).click(); await page.waitForTimeout(800)
  check(await page.getByRole('group', { name: 'متع كبيرة' }).getByRole('button', { name: /test/ }).isVisible(), 'a typed joy lands in the big group')
  await shot('joy-filled')
  check((await overflowX()) <= 0, 'no horizontal overflow (filled)')
  const small = await page.evaluate(() => [...document.querySelectorAll('button')].filter((b) => b.offsetParent && b.getBoundingClientRect().height < 43.5).map((b) => b.innerText.trim()))
  check(small.length === 0, `all buttons >= 44pt tall${small.length ? ' — ' + JSON.stringify(small) : ''}`)

  log('3. text scale 200%')
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
  await page.waitForTimeout(500)
  check((await overflowX()) <= 0, 'text scale 200%: no horizontal overflow')
  await shot('joy-text200')
  await page.evaluate(() => { document.documentElement.scrollTo(0, 99999); document.querySelector('main')?.scrollTo(0, 99999) })
  await page.waitForTimeout(300)
  await shot('joy-text200-bottom')
  await page.evaluate(() => { document.documentElement.style.fontSize = '' })
  await page.waitForTimeout(300)

  log('4. resume keeps the step; finish keeps the joys')
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1500)
  check(await page.getByRole('heading', { name: 'وش يفرّحك؟' }).isVisible(), 'a reload resumes on the joy step')
  check(await page.getByRole('group', { name: 'متع كبيرة' }).getByRole('button', { name: /test/ }).isVisible(), 'the joys survived the reload')
  for (let i = 0; i < 3; i++) { await nextBtn().click(); await page.waitForTimeout(450) }
  await page.getByRole('button', { name: /ابدئي يومك/ }).click(); await page.waitForTimeout(2200)
  check(!(await page.url()).includes('onboarding'), 'onboarding finished, app opens')
  await page.goto(BASE + '#/joy', { waitUntil: 'load' }); await page.waitForTimeout(1500)
  check(await page.getByRole('button', { name: /مشي قصير/ }).count() === 1, 'the suggestion joy exists exactly once in the app')
  await shot('joy-app')
  check((await overflowX()) <= 0, 'no horizontal overflow on the joy screen')
} catch (e) {
  failures.push(String(e))
  console.error(e)
  await shot('failure').catch(() => {})
}

check(errors.length === 0, `no console errors${errors.length ? ' — ' + errors.slice(0, 3).join(' | ') : ''}`)
await browser.close()
server.close()
log(failures.length ? `\nFAILED (${failures.length})` : '\nALL PASS')
process.exit(failures.length ? 1 : 0)
