/**
 * E2E for area E: onboarding life map (grow / maintain / rest, caps 3 / 5) and the 9-step Habit Studio
 * wizard (evidence prefill, back/next, draft, undo) + the quick form still working.
 * Mobile 390x844 dsf2 touch, ar-SA, Asia/Riyadh, Date pinned. Everything it creates is named "test".
 *
 * Run (needs `npm run build`):
 *   PLAYWRIGHT_MODULE=<…/playwright/index.mjs> SHOTS=<dir> [DARK=1] [LABEL=x] node tests/e2e/studioOnboarding.e2e.mjs
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
  log('1. onboarding life map')
  await page.goto(BASE, { waitUntil: 'load' })
  await page.waitForTimeout(1500)
  await page.getByRole('button', { name: /يلا نبدأ/ }).first().click(); await page.waitForTimeout(400)
  await page.locator('input').first().fill('test')
  await nextBtn().click(); await page.waitForTimeout(400)
  await nextBtn().click(); await page.waitForTimeout(700)
  check(await page.getByRole('heading', { name: 'خريطة حياتك لهذا الموسم' }).isVisible(), 'life map step shows')
  const names = await page.locator('ul li span[class*="name"]').allInnerTexts()
  check(names.length >= 8, `domains listed (${names.length})`)
  await shot('map-initial')
  for (const n of names) await tier(n, 'راحة').click()
  for (const n of names.slice(0, 3)) await tier(n, 'نمو').click()
  await tier(names[3], 'نمو').click(); await page.waitForTimeout(300)
  check(await page.getByText(/ثلاثة مجالات نمو كفاية/).isVisible(), 'grow cap (3) shows the calm note')
  check((await tier(names[3], 'نمو').getAttribute('aria-pressed')) === 'false', '4th grow was not applied')
  await shot('map-grow-cap')
  for (const n of names.slice(3, 8)) await tier(n, 'صيانة').click()
  await tier(names[8], 'صيانة').click(); await page.waitForTimeout(300)
  check(await page.getByText(/خمسة مجالات/).isVisible(), 'maintain cap (5) shows the calm note')
  await shot('map-maintain-cap')
  check((await overflowX()) <= 0, 'no horizontal overflow on the map')
  // tap targets
  const small = await page.evaluate(() => [...document.querySelectorAll('button')].filter((b) => b.offsetParent && b.getBoundingClientRect().height < 43.5).map((b) => b.innerText.trim()))
  check(small.length === 0, `all buttons >= 44pt tall${small.length ? ' — ' + JSON.stringify(small) : ''}`)
  // text scale 2.0
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
  await page.waitForTimeout(400)
  check((await overflowX()) <= 0, 'text scale 200%: no horizontal overflow on the map')
  await shot('map-text200')
  await page.evaluate(() => { document.documentElement.style.fontSize = '' })
  await page.waitForTimeout(200)
  // finish
  for (let i = 0; i < 4; i++) { await nextBtn().click(); await page.waitForTimeout(450) } // joy, products, starters, privacy
  await page.getByRole('button', { name: /ابدئي يومك/ }).click(); await page.waitForTimeout(2200)
  check(!(await page.url()).includes('onboarding'), 'onboarding finished, app opens')

  log('2. wizard — new habit from the evidence library')
  await page.goto(BASE + '#/studio', { waitUntil: 'load' }); await page.waitForTimeout(1500)
  check((await page.getByRole('progressbar', { name: 'خطوات العادة' }).getAttribute('aria-valuetext')) === 'الخطوة 1 من 9', 'wizard starts at step 1 of 9')
  await shot('wizard-start')
  await page.getByRole('button', { name: 'تصفّحي الاقتراحات' }).click(); await page.waitForTimeout(700)
  await shot('wizard-picker')
  await page.getByRole('dialog').locator('li button').first().click(); await page.waitForTimeout(600)
  check(await page.getByText(/عبّأنا الحقول/).isVisible(), 'prefill card shows')
  await shot('wizard-prefilled')
  await page.getByRole('button', { name: /التالي: السلوك/ }).click(); await page.waitForTimeout(700)
  const prefName = await page.getByRole('textbox', { name: /الاسم/ }).inputValue()
  check(prefName.length > 0, `name prefilled ("${prefName.slice(0, 24)}")`)
  await shot('wizard-step2')
  await page.getByRole('button', { name: 'تراجعي عن التعبئة' }).click(); await page.waitForTimeout(300)
  check((await page.getByRole('textbox', { name: /الاسم/ }).inputValue()) === '', 'undo restores the empty name')
  await page.getByRole('textbox', { name: /الاسم/ }).fill('test')
  await page.getByRole('button', { name: /التالي: النسخ/ }).click(); await page.waitForTimeout(700)
  await shot('wizard-step3')
  await page.getByRole('button', { name: /التالي: الإشارة/ }).click(); await page.waitForTimeout(700)
  await shot('wizard-step4')
  check((await overflowX()) <= 0, 'no horizontal overflow in the wizard')
  await page.getByRole('button', { name: 'السابق' }).click(); await page.waitForTimeout(500)
  check((await page.getByRole('progressbar', { name: 'خطوات العادة' }).getAttribute('aria-valuenow')) === '3', 'back goes to step 3')
  for (let i = 0; i < 6; i++) { await page.getByRole('button', { name: /^التالي:/ }).last().click(); await page.waitForTimeout(450) }
  check((await page.getByRole('progressbar', { name: 'خطوات العادة' }).getAttribute('aria-valuenow')) === '9', 'reaches step 9')
  await shot('wizard-step9')
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
  await page.waitForTimeout(400)
  check((await overflowX()) <= 0, 'text scale 200%: no horizontal overflow in the wizard')
  await shot('wizard-text200')
  await page.evaluate(() => { document.documentElement.style.fontSize = '' })
  await page.getByRole('button', { name: 'احفظي العادة' }).last().click(); await page.waitForTimeout(1200)
  check(await page.locator('[data-toast]').count() > 0, 'saved: toast with undo')
  await shot('wizard-saved')
  check(await page.getByRole('button', { name: 'تراجع' }).count() > 0, 'toast offers «تراجع»')

  log('3. wizard — save as draft, and the quick form')
  await page.goto(BASE + '#/studio', { waitUntil: 'load' }); await page.waitForTimeout(1200)
  await page.getByRole('button', { name: /التالي: السلوك/ }).click(); await page.waitForTimeout(500)
  await page.getByRole('textbox', { name: /الاسم/ }).fill('test')
  await page.getByRole('button', { name: 'احفظيها كمسودة' }).click(); await page.waitForTimeout(1200)
  check(await page.getByText(/انحفظت كمسودة/).count() > 0, 'draft saved (paused)')
  await page.goto(BASE + '#/studio?mode=quick', { waitUntil: 'load' }); await page.waitForTimeout(1200)
  check(await page.getByRole('textbox', { name: 'الاسم' }).isVisible(), 'quick form opens')
  await shot('quick-form')
  await page.getByRole('textbox', { name: 'الاسم' }).fill('test')
  await page.getByRole('button', { name: 'احفظي العادة' }).click(); await page.waitForTimeout(1200)
  check(await page.getByText(/انضافت/).count() > 0, 'quick form still saves')

  check(errors.length === 0, `no console errors${errors.length ? ' — ' + JSON.stringify(errors.slice(0, 3)) : ''}`)
} catch (e) {
  failures.push(String(e))
  console.error(e)
  await shot('failure').catch(() => {})
}
await browser.close()
server.close()
if (failures.length) { console.log(`\n${failures.length} FAILED`); process.exit(1) }
console.log('\nALL PASSED')
