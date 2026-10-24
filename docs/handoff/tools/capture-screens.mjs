/**
 * Captures neutral-data screenshots of the built app (390x844 @2x, ar-SA, Asia/Riyadh) in light and dark.
 * All data typed is "test". Usage (after `npm run build`, dist copied under <SERVE>/wejdan-os/ and served):
 *   BASE=http://localhost:6403/wejdan-os/ OUT=<dir> PLAYWRIGHT_MODULE=<…/playwright/index.mjs> THEME=light|dark node capture-screens.mjs
 * Never uses page.clock (Playwright 1.47 lacks it); "now" is pinned with a Date subclass like tests/e2e/streakRemindersLogo.e2e.mjs.
 */
import fs from 'node:fs'
import path from 'node:path'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright')
const BASE = process.env.BASE ?? 'http://localhost:6403/wejdan-os/'
const OUT = path.resolve(process.env.OUT ?? 'shots')
const THEME = process.env.THEME ?? 'light'
fs.mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium', args: ['--headless=new'] })
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ar-SA', timezoneId: 'Asia/Riyadh', serviceWorkers: 'block', colorScheme: THEME })
const page = await ctx.newPage()
page.setDefaultTimeout(8000)
const errors = []
page.on('pageerror', (e) => errors.push('pageerror ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error ' + m.text().slice(0, 160)) })
await page.addInitScript(() => {
  const real = Date
  const offset = new real('2026-10-07T16:50:00+03:00').getTime() - real.now()
  class D extends real { constructor(...a) { if (a.length === 0) super(real.now() + offset); else super(...a) } static now() { return real.now() + offset } }
  // eslint-disable-next-line no-global-assign
  Date = D
})
const shot = async (name) => { await page.waitForTimeout(700); await page.screenshot({ path: path.join(OUT, `${name}-${THEME}.png`) }) }
const go = async (hash, wait = 900) => { await page.goto('about:blank'); await page.goto(BASE + (hash ? '#' + hash : ''), { waitUntil: 'load' }); await page.waitForTimeout(wait) }
const idb = async (fn, arg) => {
  for (let i = 0; i < 3; i++) {
    try {
      return await page.evaluate(async ([src, arg]) => {
        const run = new Function('db', 'arg', `return (${src})(db, arg)`)
        return new Promise((ok, bad) => { const req = indexedDB.open('wejdan_life_os'); req.onsuccess = async () => { try { ok(await run(req.result, arg)) } catch (e) { bad(String(e)) } finally { req.result.close() } }; req.onerror = () => bad(String(req.error)) })
      }, [fn.toString(), arg])
    } catch (e) { if (!/context was destroyed|Execution context/.test(String(e))) throw e; await page.waitForLoadState('load'); await page.waitForTimeout(800) }
  }
}
const skipped = []
const tryShot = async (name, hash, wait) => { try { await go(hash, wait); await shot(name) } catch (e) { skipped.push(`${name}: ${String(e).slice(0, 100)}`) } }

// onboarding: welcome screen + the flow with the name "test"
await go('', 1500)
await shot('01-onboarding-welcome')
await page.getByRole('button', { name: /يلا نبدأ/ }).first().click(); await page.waitForTimeout(400)
await page.locator('input').first().fill('test'); await shot('02-onboarding-name')
for (let i = 0; i < 3; i++) { await page.getByRole('button', { name: /^\s*التالي\s*$/ }).click(); await page.waitForTimeout(400) }
await page.getByRole('button', { name: /^\s*(التالي|تخطّي)\s*$/ }).click(); await page.waitForTimeout(1200)
const chips = page.getByRole('group', { name: 'عادات تبدين فيها' }).locator('button')
for (let i = 0; i < Math.min(4, await chips.count()); i++) { await chips.nth(i).click(); await page.waitForTimeout(120) }
await shot('03-onboarding-habits')
await page.getByRole('button', { name: /^\s*(التالي|تخطّي)\s*$/ }).click(); await page.waitForTimeout(400)
await shot('04-onboarding-privacy')
await page.getByRole('button', { name: /ابدئي يومك/ }).click(); await page.waitForTimeout(2200)
await shot('10-today')

// seed neutral history: all habits planned every day, done Sun-Tue (so streak/garden/insights have something)
const habits = (await idb((db) => new Promise((ok) => { const r = db.transaction('records').objectStore('records').index('box').getAll('habits'); r.onsuccess = () => ok(r.result) }))).map((r) => r.value)
await idb((db, hs) => new Promise((ok) => {
  const tx = db.transaction('records', 'readwrite'); const st = tx.objectStore('records')
  hs.forEach((h, i) => {
    st.put({ box: 'habits', id: h.id, value: { ...h, createdDate: '2026-09-01', status: 'active', schedule: { ...h.schedule, weekdays: [1, 2, 3, 4, 5, 6, 7] } } })
    const days = i % 2 === 0 ? ['2026-10-04', '2026-10-05', '2026-10-06'] : ['2026-10-04', '2026-10-05']
    for (const d of days) st.put({ box: 'logs', id: `lg_${h.id}_${d}`, value: { id: `lg_${h.id}_${d}`, itemId: h.id, kind: 'habit', date: d, level: 'normal', durationMin: null, enjoyment: null, note: null, loggedAt: d + 'T09:00:00' } })
  })
  tx.oncomplete = () => ok(true)
}), habits)
const h0 = habits[0]?.id
// add a "test" inbox item through quick add
await go('/me/inbox', 1200)

const routes = [
  ['11-today-reload', '/today'], ['12-brief', '/brief'], ['13-evening', '/evening'],
  ['20-habits', '/habits'], ['21-habit-detail', `/habits/${h0}`], ['22-garden', '/habits/garden'], ['23-routine-am', '/routine/am'], ['24-routine-player', '/routine/am/play'], ['25-products', '/me/products'], ['26-studio', '/studio'],
  ['30-path', '/path'], ['31-ielts', '/path/ielts'], ['32-driving', '/path/driving'],
  ['40-joy', '/joy'], ['41-rewards', '/joy/reward'],
  ['50-me', '/me'], ['51-inbox', '/me/inbox'], ['52-money', '/me/money'], ['53-review', '/review'], ['54-insights', '/me/insights'], ['55-evidence', '/me/evidence'], ['56-home', '/me/home'],
  ['57-reminders', '/me/reminders'], ['58-settings', '/me/settings'], ['59-help', '/help'], ['60-notes', '/me/notes'], ['61-note-new', '/me/notes/new'], ['62-sources', '/me/sources'], ['63-changelog', '/me/changelog'],
]
for (const [n, h] of routes) await tryShot(n, h, 1200)
// sheets
try { await go('/today', 1200); await page.getByRole('button', { name: /إضافة سريعة/ }).click(); await page.waitForTimeout(900); await shot('70-quick-add-sheet') } catch (e) { skipped.push('70: ' + String(e).slice(0, 80)) }
try { await go('/me/settings', 1200); await page.getByRole('switch', { name: 'قفل التطبيق' }).scrollIntoViewIfNeeded(); await shot('71-settings-protection') } catch (e) { skipped.push('71: ' + String(e).slice(0, 80)) }
fs.writeFileSync(path.join(OUT, `_log-${THEME}.json`), JSON.stringify({ errors, skipped }, null, 1))
console.log(THEME, 'errors:', errors.length, 'skipped:', skipped)
await browser.close()
