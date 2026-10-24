/**
 * E2E for feature B (Today grouped by tier + «يومك جاهز» + levels + calm day).
 * Mobile 390x844 dsf2 touch ar-SA Asia/Riyadh. Everything typed is "test". Date pinned via addInitScript.
 * Run: npm run build && PLAYWRIGHT_MODULE=/home/claude/wejdan-os-web/node_modules/playwright/index.mjs SHOTS=<dir> node tests/e2e/todayCalm.e2e.mjs
 * Env: DARK=1, REDUCED=1, SCALE=2 (text scale 2.0), PORT, REACT_DIR, CHROMIUM
 */
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright')
const REACT_DIR = path.resolve(process.env.REACT_DIR ?? 'dist')
const SHOTS = path.resolve(process.env.SHOTS ?? 'e2e-shots')
const PORT = Number(process.env.PORT ?? 5731)
const LABEL = (process.env.DARK ? 'dark' : 'light') + (process.env.SCALE ? '-x2' : '')
const BASE = `http://localhost:${PORT}/wejdan-os/`
fs.mkdirSync(SHOTS, { recursive: true })
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ico': 'image/x-icon' }
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

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium', args: ['--headless=new'] })
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  locale: 'ar-SA', timezoneId: 'Asia/Riyadh', serviceWorkers: 'block',
  colorScheme: process.env.DARK ? 'dark' : 'light', reducedMotion: process.env.REDUCED ? 'reduce' : 'no-preference',
})
// pin the date to Sat 2026-10-24 09:00 Riyadh; time still advances
await ctx.addInitScript(() => {
  const fixed = Date.UTC(2026, 9, 24, 6, 0, 0)
  const start = Date.now()
  const RealDate = Date
  class FakeDate extends RealDate {
    constructor(...a) { if (a.length === 0) super(fixed + (RealDate.now() - start)); else super(...a) }
    static now() { return fixed + (RealDate.now() - start) }
  }
  globalThis.Date = FakeDate
})
const page = await ctx.newPage()
page.setDefaultTimeout(8000)
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push(String(e)))
const failures = []
const check = (ok, what) => { console.log(ok ? '  PASS' : '  FAIL', what); if (!ok) failures.push(what) }
const shot = (n) => page.screenshot({ path: path.join(SHOTS, `${n}-${LABEL}.png`) })
const overflow = () => page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth)
const go = async (hash, wait = 900) => { await page.goto(BASE + (hash ? '#' + hash : ''), { waitUntil: 'load' }); await page.waitForTimeout(wait) }
const here = () => page.evaluate(() => location.hash)

try {
  await go('', 1500)
  if (process.env.SCALE) await page.addStyleTag({ content: 'html{font-size:200% !important}' })
  await page.getByRole('button', { name: /يلا نبدأ/ }).first().click(); await page.waitForTimeout(400)
  await page.locator('input').first().fill('test')
  for (let i = 0; i < 3; i++) { await page.getByRole('button', { name: /^\s*التالي\s*$/ }).click(); await page.waitForTimeout(400) }
  await page.getByRole('button', { name: /^\s*(التالي|تخطّي)\s*$/ }).click(); await page.waitForTimeout(1200)
  const chips = page.getByRole('group', { name: 'عادات تبدين فيها' }).locator('button')
  for (let i = 0; i < Math.min(3, await chips.count()); i++) { await chips.nth(i).click(); await page.waitForTimeout(120) }
  await page.getByRole('button', { name: /^\s*(التالي|تخطّي)\s*$/ }).click(); await page.waitForTimeout(400)
  await page.getByRole('button', { name: /ابدئي يومك/ }).click(); await page.waitForTimeout(2200)

  console.log('1. Today before accepting anything')
  check((await page.getByRole('region', { name: 'يومك جاهز' }).count()) === 0, 'no summary card on an empty day (nothing auto-added)')
  await shot('today-empty')

  console.log('2. accept suggestions from the brief')
  await go('/brief', 1200)
  const all = page.getByRole('button', { name: 'أضيفي المقترح كله' })
  if (await all.count()) { await all.click(); await page.waitForTimeout(800) }
  else { const adds = page.getByRole('button', { name: /^أضيفي .* لليوم$/ }); const n = Math.min(3, await adds.count()); for (let i = 0; i < n; i++) { await adds.first().click(); await page.waitForTimeout(400) } }
  await go('/today', 1200)
  const card = page.getByRole('region', { name: 'يومك جاهز' })
  check((await card.count()) === 1, '«يومك جاهز» shown once the day has items')
  check((await card.getByRole('listitem').count()) === 3, 'three tier chips')
  await shot('today-ready')
  await page.setViewportSize({ width: 390, height: 1900 }); await page.waitForTimeout(500); await shot('today-tall'); await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(300)
  check((await overflow()) <= 0, 'no horizontal overflow on Today')

  console.log('3. level chip')
  const chip = page.getByRole('button', { name: /حجم الخطوة/ }).first()
  if (await chip.count()) {
    await chip.click(); await page.waitForTimeout(500)
    check((await page.getByRole('radio', { name: 'زيادة' }).count()) > 0, 'inline level picker opens')
    await page.getByRole('radio', { name: 'زيادة' }).first().click(); await page.waitForTimeout(400)
    check(/زيادة/.test(await chip.innerText()), 'chip shows the chosen level')
    await shot('today-level')
  } else check(false, 'a plan row with a level chip exists')

  console.log('4. low energy -> calm day')
  await page.getByRole('radio', { name: 'قليلة' }).first().click(); await page.waitForTimeout(700)
  const link = page.getByRole('button', { name: /النسخة الهادئة من يومك/ })
  check((await link.count()) === 1, 'calm-day link appears under the energy control')
  await shot('today-red')
  await link.click(); await page.waitForTimeout(900)
  check((await here()).includes('/today/calm'), 'navigated to /today/calm')
  check((await page.getByText(/ثلاث أشياء صغيرة/).count()) > 0, 'calm hero copy')
  await shot('calm')
  check((await overflow()) <= 0, 'no horizontal overflow on Calm day')
  await page.getByRole('button', { name: /المساعدة موجودة/ }).click(); await page.waitForTimeout(800)
  check((await here()).includes('/help'), 'help link opens /help')
  await shot('help-from-calm')
} catch (e) {
  console.log('ERROR', e.message); failures.push(String(e.message)); await shot('error').catch(() => {})
}
check(errors.length === 0, `no console errors${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''}`)
await browser.close(); server.close()
if (failures.length) { console.log(`\n${failures.length} FAILED`); process.exit(1) }
console.log('\nALL PASSED')
