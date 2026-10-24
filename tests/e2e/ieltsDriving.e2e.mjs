/**
 * Area F e2e: IELTS stats/goals + driving road, practice conditions, hazard, spaced quiz.
 * Mobile 390x844 dsf2 touch ar-SA Asia/Riyadh; time pinned to Thu 2026-10-15 10:00; everything typed is "test".
 *   PLAYWRIGHT_MODULE=<…/playwright/index.mjs> SHOTS=<dir> [DARK=1] [SCALE2=1] node tests/e2e/ieltsDriving.e2e.mjs   (after npm run build)
 */
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright')
const REACT_DIR = path.resolve(process.env.REACT_DIR ?? 'dist')
const SHOTS = path.resolve(process.env.SHOTS ?? 'e2e-shots')
const PORT = Number(process.env.PORT ?? 5741)
const DARK = !!process.env.DARK
const SCALE2 = !!process.env.SCALE2
const LABEL = (DARK ? 'dark' : 'light') + (SCALE2 ? '-x2' : '')
const BASE = `http://localhost:${PORT}/wejdan-os/`
fs.mkdirSync(SHOTS, { recursive: true })
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.woff': 'font/woff' }
const server = http.createServer((req, res) => {
  const u = new URL(req.url ?? '/', `http://localhost:${PORT}`)
  if (!u.pathname.startsWith('/wejdan-os/')) return void res.writeHead(404).end()
  const rel = decodeURIComponent(u.pathname.slice('/wejdan-os/'.length)) || 'index.html'
  let file = path.join(REACT_DIR, rel)
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html')
  if (!fs.existsSync(file)) return void res.writeHead(404).end()
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' })
  fs.createReadStream(file).pipe(res)
})
await new Promise((ok) => server.listen(PORT, ok))

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium', args: ['--headless=new'] })
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ar-SA', timezoneId: 'Asia/Riyadh', serviceWorkers: 'block', colorScheme: DARK ? 'dark' : 'light' })
const page = await ctx.newPage()
page.setDefaultTimeout(8000)
const consoleErrors = []
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)) })
page.on('pageerror', (e) => consoleErrors.push('PAGEERROR ' + String(e).slice(0, 200)))
const failures = []
const check = (ok, what) => { console.log(ok ? '  PASS' : '  FAIL', what); if (!ok) failures.push(what) }
const shot = async (name, full = true) => page.screenshot({ path: path.join(SHOTS, `${name}-${LABEL}.png`), fullPage: false })
const go = async (hash, wait = 900) => { await page.goto('about:blank'); await page.goto(BASE + (hash ? '#' + hash : ''), { waitUntil: 'load' }); await page.waitForTimeout(wait); if (SCALE2) await page.evaluate(() => { document.documentElement.style.fontSize = '200%' }) }
const noOverflow = async (what) => check(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `no horizontal overflow: ${what}`)

await page.addInitScript(() => {
  const real = Date
  const offset = new real('2026-10-15T10:00:00+03:00').getTime() - real.now()
  class D extends real {
    constructor(...a) { if (a.length === 0) super(real.now() + offset); else super(...a) }
    static now() { return real.now() + offset }
  }
  // eslint-disable-next-line no-global-assign
  Date = D
})

const scrollShot = async (name, locator) => { await locator.scrollIntoViewIfNeeded(); await page.waitForTimeout(350); await shot(name) }
const click = async (loc) => { await loc.scrollIntoViewIfNeeded(); await loc.click(); await page.waitForTimeout(450) }
const sheet = () => page.getByRole('dialog')

try {
  // onboarding (test name)
  await go('', 1500)
  await page.getByRole('button', { name: /يلا نبدأ/ }).first().click(); await page.waitForTimeout(400)
  await page.locator('input').first().fill('test')
  for (let i = 0; i < 3; i++) { await page.getByRole('button', { name: /^\s*التالي\s*$/ }).click(); await page.waitForTimeout(400) }
  await page.getByRole('button', { name: /^\s*(التالي|تخطّي)\s*$/ }).click(); await page.waitForTimeout(1200)
  await page.getByRole('button', { name: /^\s*(التالي|تخطّي)\s*$/ }).click(); await page.waitForTimeout(400)
  await page.getByRole('button', { name: /ابدئي يومك/ }).click(); await page.waitForTimeout(2200)

  // ---------------- IELTS ----------------
  await go('/path/ielts', 1400)
  check(await page.getByText('جلسات هذا الشهر').count() === 1, 'ielts: stats row present')
  check(await page.getByText(/ما فيه سلسلة تنكسر/).count() === 1, 'ielts: gentle empty copy, no streak')
  check(await page.getByText('ما حددتيها').count() === 3, 'ielts: goals empty, nothing assumed')
  await scrollShot('01-ielts-stats-empty', page.getByText('ممارستك'))
  await noOverflow('ielts empty')
  await click(page.getByRole('button', { name: 'حددي' }))
  await shot('02-ielts-goals-sheet')
  await sheet().getByLabel('الدرجة المستهدفة').fill('6.5')
  await sheet().getByLabel('مستواك الحالي (من تقديرك أنتِ)').fill('5')
  await sheet().getByLabel(/كم يوم تبين/).fill('12')
  await click(sheet().getByRole('button', { name: 'احفظي' }))
  await page.waitForTimeout(500)
  check(await page.getByText('ما حددتيها').count() === 0, 'ielts: goals saved and shown')
  // a mock result counts as a practice day (today)
  await click(page.getByRole('button', { name: 'سجّلي نتيجة' }))
  await sheet().getByLabel('درجة قراءة').fill('6')
  await click(sheet().getByRole('button', { name: 'احفظي' }))
  await page.waitForTimeout(600)
  check(await page.getByRole('img', { name: /1 من هدفك \(12\)/ }).count() === 1, 'ielts: 30-day commitment against HER goal')
  await scrollShot('03-ielts-stats-goals', page.getByText('ممارستك'))
  await noOverflow('ielts filled')
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1200)
  check(await page.getByText('ما حددتيها').count() === 0, 'ielts: persists across reload')

  // ---------------- DRIVING ----------------
  await go('/path/driving', 1400)
  check(await page.getByText('تأكيد المسار الرسمي').count() === 1, 'driving: road stage 1 = confirm official path')
  check(await page.getByText(/المرحلة 1 من 1/).count() === 1, 'driving: «المرحلة 1 من 1»')
  await scrollShot('04-driving-road', page.getByText('طريق الرخصة').first())
  await noOverflow('driving top')
  await click(page.getByRole('button', { name: 'أضيفي مرحلة' }))
  await sheet().getByLabel('اسم المرحلة').fill('test stage')
  await click(sheet().getByRole('button', { name: 'احفظي' }))
  await click(page.getByRole('button', { name: 'أضيفي خطوة' }).nth(1))
  await sheet().getByLabel('الخطوة').fill('test step')
  await sheet().getByLabel('رابط المصدر (اختياري)').fill('javascript:alert(1)')
  check(await sheet().getByRole('alert').count() === 1, 'driving: unsafe link refused inline')
  await sheet().getByLabel('رابط المصدر (اختياري)').fill('https://example.com/test')
  await shot('05-driving-step-sheet')
  await click(sheet().getByRole('button', { name: 'احفظي' }))
  check(await page.getByText('ما تأكدت من المصدر').count() === 1, 'driving: new step marked unverified')
  await scrollShot('06-driving-road-unverified', page.getByText('ما تأكدت من المصدر'))
  await click(page.getByRole('button', { name: /تعديل: test step/ }))
  await click(sheet().getByRole('switch', { name: 'تأكدت من المصدر الرسمي' }))
  await click(sheet().getByRole('button', { name: 'احفظي' }))
  check(await page.getByText('مؤكدة من المصدر').count() === 1, 'driving: verified chip after she confirms')
  // practice with conditions
  await click(page.getByRole('button', { name: 'سجّلي تدريب' }))
  await click(sheet().getByRole('button', { name: 'ليل' }))
  await click(sheet().getByRole('button', { name: 'زحمة' }))
  await shot('07-driving-practice-sheet')
  await click(sheet().getByRole('button', { name: 'احفظي' }))
  await page.waitForTimeout(500)
  check(await page.getByRole('group', { name: '2 من 4 ظروف جرّبتيها' }).count() === 1, 'driving: conditions variety counter 2 من 4')
  await scrollShot('08-driving-practice-log', page.getByText('سجل التدريب تحت الإشراف'))
  // hazard
  await scrollShot('09-driving-hazard-empty', page.getByText('إدراك المخاطر', { exact: true }))
  await click(page.getByRole('button', { name: 'أضيفي رابط أو ملاحظة' }))
  await click(sheet().getByRole('button', { name: 'أضيفي رابط أو ملاحظة' }))
  await sheet().getByLabel('العنوان').fill('test clip')
  await sheet().getByLabel('الرابط (اختياري)').fill('https://example.com/test')
  await click(sheet().getByRole('button', { name: 'احفظي' }))
  await shot('10-driving-hazard-sheet')
  await click(sheet().getByRole('button', { name: 'سجّلي مشاهدة' }).first())
  await page.keyboard.press('Escape'); await page.waitForTimeout(500)
  if (await sheet().count()) await click(sheet().getByRole('button', { name: /إغلاق|إلغاء/ }).first())
  check(await page.getByText(/هذا الأسبوع: 1/).count() >= 1, 'driving: hazard watch counted this week')
  await scrollShot('11-driving-hazard', page.getByText('إدراك المخاطر', { exact: true }))
  // quiz
  await scrollShot('12-driving-quiz-empty', page.getByText('النظري بالتكرار المتباعد'))
  await click(page.getByRole('button', { name: 'أضيفي سؤال' }))
  await click(sheet().getByRole('button', { name: 'أضيفي سؤال' }))
  await sheet().getByLabel('السؤال', { exact: true }).fill('test question')
  await sheet().getByLabel('الخيار 1', { exact: true }).fill('test a')
  await sheet().getByLabel('الخيار 2', { exact: true }).fill('test b')
  await sheet().getByLabel('الخيار 2 هو الصحيح').check({ force: true })
  await shot('13-driving-quiz-form')
  await click(sheet().getByRole('button', { name: 'احفظي' }))
  await page.keyboard.press('Escape'); await page.waitForTimeout(500)
  await click(page.getByRole('button', { name: 'ابدئي جولة' }))
  await shot('14-driving-quiz-question')
  await click(sheet().getByRole('button', { name: /test a/ }))
  await shot('15-driving-quiz-wrong')
  check(await sheet().getByText(/نرجّعه لك قريب/).count() === 1, 'driving: wrong answer is neutral and returns')
  await click(sheet().getByRole('button', { name: 'خلّصنا' }))
  await shot('16-driving-quiz-summary')
  await click(sheet().getByRole('button', { name: 'تمام' }))
  await scrollShot('17-driving-quiz-card', page.getByText('النظري بالتكرار المتباعد'))
  check(await page.getByRole('button', { name: 'ابدئي جولة' }).count() === 0, 'driving: nothing due after the round')
  await scrollShot('18-driving-help', page.getByRole('button', { name: 'المساعدة' }))
  await noOverflow('driving bottom')
  await click(page.getByRole('button', { name: 'المساعدة' }))
  check(page.url().includes('#/help'), 'driving: anxiety help link goes to /help')
  await page.reload({ waitUntil: 'load' })
} catch (e) {
  failures.push('EXCEPTION ' + String(e).slice(0, 400)); console.log('EXCEPTION', String(e).slice(0, 600))
  try { await shot('zz-failure') } catch {}
}
check(consoleErrors.length === 0, `no console errors ${consoleErrors.join(' | ')}`)
await browser.close(); server.close()
console.log(failures.length ? `\nFAILED (${failures.length})` : '\nALL PASS')
process.exit(failures.length ? 1 : 0)
