/**
 * Feature C e2e (390x844 dsf2 touch ar-SA Asia/Riyadh, Date pinned): ظروف الشهر, تذكير الادخار, خريطة متعتي + باقات.
 * Every record it creates is named "test". Run: npm run build && PLAYWRIGHT_MODULE=<…/playwright/index.mjs> node tests/e2e/moneyJoy.e2e.mjs
 * Env: REACT_DIR (./dist) · PORT (5731) · SHOTS (./e2e-shots/money-joy) · CHROMIUM
 */
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright')
const REACT_DIR = path.resolve(process.env.REACT_DIR ?? 'dist')
const PORT = Number(process.env.PORT ?? 5731)
const SHOTS = path.resolve(process.env.SHOTS || 'e2e-shots/money-joy')
fs.mkdirSync(SHOTS, { recursive: true })
const BASE = `http://localhost:${PORT}/wejdan-os/`
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.ico': 'image/x-icon' }
const server = http.createServer((req, res) => {
  const u = new URL(req.url ?? '/', `http://localhost:${PORT}`)
  if (!u.pathname.startsWith('/wejdan-os/')) return res.writeHead(404).end()
  let file = path.join(REACT_DIR, decodeURIComponent(u.pathname.slice('/wejdan-os/'.length)) || 'index.html')
  if (!file.startsWith(REACT_DIR)) return res.writeHead(403).end()
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html')
  if (!fs.existsSync(file)) return res.writeHead(404).end()
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' })
  fs.createReadStream(file).pipe(res)
})
await new Promise((ok) => server.listen(PORT, ok))

const failures = []
const check = (ok, what) => { console.log(ok ? '  PASS' : '  FAIL', what); if (!ok) failures.push(what) }
const pin = (iso) => `(() => { const R = Date, F = ${JSON.stringify(iso)}, S = R.now(), base = new R(F).getTime(); class D extends R { constructor(...a) { if (a.length === 0) super(base + (R.now() - S)); else super(...a) } static now() { return base + (R.now() - S) } } window.Date = D })()`

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium', args: ['--headless=new'] })
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ar-SA', timezoneId: 'Asia/Riyadh' })
await ctx.addInitScript(pin('2026-10-14T12:00:00+03:00'))
const page = await ctx.newPage()
page.setDefaultTimeout(10000)
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
const w = (ms) => page.waitForTimeout(ms)
const shot = (n) => page.screenshot({ path: path.join(SHOTS, `${n}.png`), fullPage: true })
const go = async (hash) => { await page.evaluate((h) => { location.hash = h }, hash); await w(900) }
const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
// the app scrolls inside its own container, so the sections are captured element by element
const sectionShots = async (name, tag, ids) => {
  for (const id of ids) {
    const el = page.locator(`section[aria-labelledby="${id}"]`).first()
    await el.scrollIntoViewIfNeeded(); await w(150)
    await el.screenshot({ path: path.join(SHOTS, `${name}-${id}-${tag}.png`) })
  }
}
let IDS = []
const themed = async (name) => {
  for (const scheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: scheme }); await w(350)
    await shot(`${name}-${scheme}`)
    await sectionShots(name, scheme, IDS)
  }
  await page.emulateMedia({ colorScheme: 'light' }); await w(200)
}
const scaled = async (name) => {
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%' }); await w(400)
  check((await overflow()) <= 1, `${name}: no horizontal overflow at text scale 2.0`)
  await shot(`${name}-x2`)
  await sectionShots(name, 'x2', IDS)
  // nothing inside the new sections may be wider than its section
  const clipped = await page.evaluate((ids) => ids.flatMap((id) => { const s = document.querySelector(`section[aria-labelledby="${id}"]`); if (!s) return []; const r = s.getBoundingClientRect(); return [...s.querySelectorAll('*')].filter((n) => { const b = n.getBoundingClientRect(); return b.width > 0 && (b.right > r.right + 1 || b.left < r.left - 1) }).map((n) => id + ':' + n.tagName) }), IDS)
  check(clipped.length === 0, `${name}: nothing spills out of its card at text scale 2.0 ${clipped.slice(0, 3)}`)
  await page.evaluate(() => { document.documentElement.style.fontSize = '' }); await w(200)
}

async function onboard() {
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

try {
  await onboard()

  // ---- money -------------------------------------------------------------------------------------
  await go('#/me/money')
  await page.getByRole('button', { name: 'رتّبي الشهر' }).first().click(); await w(700)
  const plan = page.getByRole('dialog')
  const fields = plan.getByRole('textbox')
  await fields.nth(0).fill('200'); await fields.nth(1).fill('500'); await fields.nth(2).fill('1000')
  await plan.getByRole('button', { name: 'اعتمدي خطة الشهر' }).click(); await w(900)
  await shot('money-no-envelopes-light')
  await page.getByRole('button', { name: 'سوّي ظروف' }).click(); await w(700)
  const manage = page.getByRole('dialog')
  await manage.getByRole('button', { name: 'أكل وقهوة' }).click()
  await manage.getByRole('button', { name: 'مواصلات' }).click()
  await manage.getByRole('button', { name: 'ترفيه' }).click(); await w(300)
  await manage.getByLabel('خطة أكل وقهوة').fill('400')
  await manage.getByLabel('خطة مواصلات').fill('150')
  await manage.getByLabel('خطة ترفيه').fill('100')
  await shot('money-manage-sheet-light')
  await manage.getByRole('button', { name: 'احفظي' }).click(); await w(900)
  // log spend: roomy, close, over
  for (const [name, amount] of [['أكل وقهوة', '120'], ['مواصلات', '130'], ['ترفيه', '140']]) {
    await page.getByRole('button', { name: `سجّلي مصروف في ${name}` }).click(); await w(600)
    const d = page.getByRole('dialog')
    await d.getByRole('textbox').fill(amount)
    await d.getByRole('button', { name: 'سجّليه' }).click(); await w(900)
  }
  const card = page.getByRole('heading', { name: 'ظروف الشهر' }).locator('xpath=ancestor::section[1]')
  const txt = await card.innerText()
  check(/قربتي من الخطة/.test(txt) && /فوق الخطة بـ/.test(txt) && /باقي/.test(txt), 'envelope card shows roomy / close / over lines')
  check(/غير مصنّف/.test(txt) === false, 'every spend was categorised (no «غير مصنّف» line)')
  check(!(await card.locator('[role=alert]').count()), 'no alert role inside envelopes')
  const bars = await card.locator('[role=progressbar]').count()
  check(bars === 3, '3 progress bars')
  // no red anywhere in the card: sample computed colours
  const reds = await card.evaluate((el) => [...el.querySelectorAll('*')].filter((n) => { const c = getComputedStyle(n); const m = (v) => { const r = v.match(/rgba?\((\d+), (\d+), (\d+)/); return r && +r[1] > 160 && +r[2] < 90 && +r[3] < 90 }; return m(c.color) || m(c.backgroundColor) }).length)
  check(reds === 0, 'no red colour inside the envelope card')
  const sections = await page.evaluate(() => document.body.innerText.match(/مصروف الشهر لين الحين[\s\S]{0,60}/)?.[0])
  check(/390/.test(sections ?? ''), `month total counts the spend once (390): ${JSON.stringify(sections)}`)
  check((await overflow()) <= 1, 'money: no horizontal overflow at 390px')

  // saving reminder
  await page.getByRole('button', { name: 'ذكّريني' }).click(); await w(700)
  const sd = page.getByRole('dialog')
  await sd.getByRole('combobox', { name: 'أي يوم بالشهر؟' }).selectOption('27')
  await sd.getByRole('button', { name: 'احفظي' }).click(); await w(900)
  check(/تذكير:\s*يوم\s*27/.test(await page.locator('body').innerText()), 'saving reminder card shows «يوم 27 … 09:00»')
  check(/09:00/.test(await page.locator('body').innerText()) || /9:00/.test(await page.locator('body').innerText()), 'default time 9:00 shown')
  IDS = ['env-title', 'save-title']
  await themed('money')
  await scaled('money')

  // ---- joy ---------------------------------------------------------------------------------------
  await go('#/joy')
  await shot('joy-empty-light')
  await page.getByRole('button', { name: 'أضيفي أول متعة' }).click(); await w(700)
  let jd = page.getByRole('dialog')
  await jd.getByPlaceholder(/قهوة وكتاب/).fill('test'); await jd.getByRole('button', { name: 'أضيفيها' }).click(); await w(900)
  for (const [group, label] of [['متع سريعة', 'test quick two'], ['متع متوسطة', 'test medium'], ['متع كبيرة', 'test big']]) {
    await page.getByRole('group', { name: group }).getByRole('button', { name: /^(أضيفي|أضيفي أول وحدة)$/ }).click(); await w(700)
    jd = page.getByRole('dialog')
    await jd.getByPlaceholder(/قهوة وكتاب/).fill(label); await jd.getByRole('button', { name: 'أضيفيها' }).click(); await w(900)
  }
  const medium = await page.getByRole('group', { name: 'متع متوسطة' }).innerText()
  check(/test medium/.test(medium), 'a joy added from the medium group lands in medium')
  const big = await page.getByRole('group', { name: 'متع كبيرة' }).innerText()
  check(/test big/.test(big), 'a joy added from the big group lands in big')
  // bundle: needs a habit (onboarding picked up to 3)
  await page.getByRole('button', { name: /احجزي متعة لعادة/ }).click(); await w(700)
  const bd = page.getByRole('dialog')
  const habitChips = bd.getByRole('radiogroup', { name: 'العادة' }).getByRole('radio')
  check((await habitChips.count()) > 0, 'bundle sheet lists active habits')
  await habitChips.first().click()
  await bd.getByRole('radiogroup', { name: 'من متعك' }).getByRole('radio').first().click()
  await shot('joy-bundle-sheet-light')
  await bd.getByRole('button', { name: 'احجزيها' }).click(); await w(900)
  check(/متعة محجوزة لعادة/.test(await page.locator('body').innerText()) && (await page.getByRole('button', { name: /أضيفي باقة/ }).count()) === 1, 'bundle created; slot for the next one remains')
  check((await overflow()) <= 1, 'joy: no horizontal overflow at 390px')
  IDS = ['joymap-title']
  await themed('joy')
  await scaled('joy')

  // ---- the reminder on its day -------------------------------------------------------------------
  await go('#/me/reminders')
  const sw = page.getByRole('switch').first()
  if ((await sw.getAttribute('aria-checked')) !== 'true') { await sw.click(); await w(600) }
  await page.addInitScript(pin('2026-10-27T09:30:00+03:00'))
  await page.evaluate(() => { location.hash = '#/today' }); await page.reload({ waitUntil: 'load' }); await w(2500)
  const banner = page.getByRole('alert')
  check((await banner.count()) > 0 && /تحويل الادخار/.test(await banner.first().innerText()), 'on the 27th at 09:30 Today shows «وقت تحويل الادخار»')
  await shot('today-saving-banner-light')
  await banner.first().getByRole('button', { name: 'افتحي المال' }).click(); await w(900)
  check(/#\/me\/money/.test(page.url()), 'banner action opens Money')
} catch (e) {
  failures.push(String(e)); console.log('ERROR', e)
  await shot('error').catch(() => {})
}
check(errors.length === 0, `no console/page errors${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''}`)
await browser.close(); server.close()
console.log(failures.length ? `\n${failures.length} FAILED` : '\nALL PASS')
process.exit(failures.length ? 1 : 0)
