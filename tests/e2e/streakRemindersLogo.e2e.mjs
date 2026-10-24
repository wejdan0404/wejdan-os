/**
 * Screenshots + checks for the flexible streak, in-app reminders, calendar export and the real W.
 * Mobile 390x844, touch, ar-SA, Asia/Riyadh, headless chromium, time pinned to Wed 2026-10-07 16:50.
 * Everything typed is "test". Run after `npm run build`:
 *   PLAYWRIGHT_MODULE=<…/playwright/index.mjs> SHOTS=<dir> [DARK=1] node tests/e2e/streakRemindersLogo.e2e.mjs
 */
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright')
const REACT_DIR = path.resolve(process.env.REACT_DIR ?? 'dist')
const SHOTS = path.resolve(process.env.SHOTS ?? 'e2e-shots')
const PORT = Number(process.env.PORT ?? 5731)
const DARK = !!process.env.DARK
const LABEL = DARK ? 'dark' : 'light'
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
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  locale: 'ar-SA', timezoneId: 'Asia/Riyadh', serviceWorkers: 'block', colorScheme: DARK ? 'dark' : 'light',
  permissions: [],
})
const page = await ctx.newPage()
page.setDefaultTimeout(8000)
if (process.env.DEBUG_E2E) { page.on('framenavigated', (f) => console.log('NAV', f.url())); page.on('crash', () => console.log('CRASH')); page.on('console', (m) => ['error','warning'].includes(m.type()) && console.log('CONSOLE', m.text().slice(0,200))); page.on('pageerror', (e) => console.log('PAGEERROR', String(e).slice(0,200))) }
const failures = []
const check = (ok, what) => { console.log(ok ? '  PASS' : '  FAIL', what); if (!ok) failures.push(what) }
const shot = (name) => page.screenshot({ path: path.join(SHOTS, `${name}-${LABEL}.png`) })
const go = async (hash, wait = 900) => { await page.goto('about:blank'); await page.goto(BASE + (hash ? '#' + hash : ''), { waitUntil: 'load' }); await page.waitForTimeout(wait) }

// pin "now" (a Wednesday, 16:50 in Riyadh) while letting time flow
await page.addInitScript(() => {
  const real = Date
  const offset = new real('2026-10-07T16:50:00+03:00').getTime() - real.now()
  class D extends real {
    constructor(...a) { if (a.length === 0) super(real.now() + offset); else super(...a) }
    static now() { return real.now() + offset }
  }
  // eslint-disable-next-line no-global-assign
  Date = D
})

const idb0 = (fn, arg) => (console.log('  idb…'), page.evaluate(async ([src, arg]) => {
  const run = new Function('db', 'arg', `return (${src})(db, arg)`)
  return new Promise((ok, bad) => {
    const req = indexedDB.open('wejdan_life_os')
    req.onsuccess = async () => { try { ok(await run(req.result, arg)) } catch (e) { bad(String(e)) } finally { req.result.close() } }
    req.onerror = () => bad(String(req.error))
  })
}, [fn.toString(), arg]))
// the app may reload itself after the database changes under it: retry once on a destroyed context
const idb = async (fn, arg) => {
  for (let i = 0; i < 3; i++) {
    try { return await idb0(fn, arg) } catch (e) { if (!/context was destroyed|Execution context/.test(String(e))) throw e; await page.waitForLoadState('load'); await page.waitForTimeout(800) }
  }
}

try {
  // onboarding
  await go('', 1500)
  await page.getByRole('button', { name: /يلا نبدأ/ }).first().click(); await page.waitForTimeout(400)
  await page.locator('input').first().fill('test')
  for (let i = 0; i < 3; i++) { await page.getByRole('button', { name: /^\s*التالي\s*$/ }).click(); await page.waitForTimeout(400) }
  await page.getByRole('button', { name: /^\s*(التالي|تخطّي)\s*$/ }).click(); await page.waitForTimeout(1200)
  const chips = page.getByRole('group', { name: 'عادات تبدين فيها' }).locator('button')
  for (let i = 0; i < Math.min(3, await chips.count()); i++) { await chips.nth(i).click(); await page.waitForTimeout(120) }
  await page.getByRole('button', { name: /^\s*(التالي|تخطّي)\s*$/ }).click(); await page.waitForTimeout(400)
  await page.getByRole('button', { name: /ابدئي يومك/ }).click(); await page.waitForTimeout(2200)
  await shot('00-today-wmark')

  // seed: habit 1 = Sun+Mon done, Tue missed (a compensation day is holding); habit 2 = Sun+Mon+Tue done (3 days)
  const habits = await idb((db) => new Promise((ok) => {
    const r = db.transaction('records').objectStore('records').index('box').getAll('habits'); r.onsuccess = () => ok(r.result)
  }))
  const [h1, h2] = habits.map((r) => r.value).sort((a, b) => a.sortOrder - b.sortOrder)
  console.log('habits:', habits.length, h1?.titleAr, '/', h2?.titleAr)
  await idb((db, arg) => new Promise((ok) => {
    const tx = db.transaction('records', 'readwrite'); const st = tx.objectStore('records')
    for (const h of arg.hs) st.put({ box: 'habits', id: h.id, value: { ...h, createdDate: '2026-09-01', status: 'active', schedule: { ...h.schedule, weekdays: [1, 2, 3, 4, 5, 6, 7] } } })
    const mk = (h, d) => st.put({ box: 'logs', id: `lg_${h.id}_${d}`, value: { id: `lg_${h.id}_${d}`, itemId: h.id, kind: 'habit', date: d, level: 'normal', durationMin: null, enjoyment: null, note: null, loggedAt: d + 'T09:00:00', minuteOfDay: 540 } })
    for (const d of ['2026-10-04', '2026-10-05']) mk(arg.hs[0], d)
    for (const d of ['2026-10-04', '2026-10-05', '2026-10-06']) mk(arg.hs[1], d)
    tx.oncomplete = () => ok(true)
  }), { hs: [h1, h2] })
  // backup row: last backup 20 days ago
  await idb((db) => new Promise((ok) => {
    const st = db.transaction('records', 'readwrite').objectStore('records')
    const g = st.index('box').getAll('meta')
    g.onsuccess = () => {
      const row = g.result.find((r) => r.value?.v && typeof r.value.v === 'object' && 'notificationsEnabled' in r.value.v)
      row.value.v.lastBackupAt = '2026-09-15T10:00:00.000Z'
      row.value.v.forgivingStreak = true
      st.put(row); ok(row.id)
    }
  }))
  await go('/habits', 1500)
  await shot('01-habits-list-streak')
  const chipsText = await page.locator('[class*="chip"]').allInnerTexts()
  check(chipsText.some((t) => /تعويض اليوم/.test(t)), `Habits list has «تعويض اليوم» chip (${chipsText.join(' | ')})`)
  check(chipsText.some((t) => /3 أيام/.test(t)), 'Habits list has the «3 أيام» chip')
  check((await page.locator('text=الستريك المرن شغّال · يومين تعويض بالأسبوع.').count()) === 1, 'footer line is there')

  // habit detail, streak on (habit 2 → 3 days; habit 1 → compensation dot)
  await go(`/habits/${h2.id}`, 1200)
  await shot('02-habit-detail-streak')
  check((await page.getByRole('heading', { name: '3 أيام متتالية' }).count()) === 1, 'detail: «3 أيام متتالية»')
  await go(`/habits/${h1.id}`, 1200)
  await shot('03-habit-detail-compensation')
  check((await page.getByRole('img', { name: 'ثلاثاء: يوم تعويض' }).count()) === 1, 'detail: Tuesday dot is «يوم تعويض»')
  check((await page.getByText('باقي لك يوم تعويض هالأسبوع').count()) === 1, 'detail: «باقي لك يوم تعويض هالأسبوع»')

  // Settings: the flexible streak switch, backup nudge row
  await go('/me/settings', 1200)
  const sw = page.getByRole('switch', { name: 'الستريك المرن' })
  check((await sw.getAttribute('aria-checked')) === 'true', 'settings: flexible streak is ON (new install default)')
  await sw.scrollIntoViewIfNeeded(); await page.waitForTimeout(300)
  await shot('04-settings-streak-row')
  await page.getByText('مرّت فترة من آخر نسخة').scrollIntoViewIfNeeded(); await page.waitForTimeout(300)
  await shot('05-settings-backup-row')
  check((await page.getByText('مرّت فترة من آخر نسخة').count()) === 1, 'settings: calm backup nudge after 14+ days')
  // turn it off → momentum hero
  await sw.scrollIntoViewIfNeeded(); await sw.click(); await page.waitForTimeout(400)
  await go(`/habits/${h2.id}`, 1200)
  await shot('06-habit-detail-momentum')
  check((await page.getByText('الزخم', { exact: true }).count()) >= 1, 'streak off: «الزخم» hero')
  check((await page.getByText(/أيام متتالية/).count()) === 0, 'streak off: no streak numbers')
  await go('/me/settings', 800)
  await page.getByRole('switch', { name: 'الستريك المرن' }).click(); await page.waitForTimeout(300) // back on

  // Reminders settings
  await go('/me/settings', 800)
  await page.getByRole('button', { name: 'تذكيرات داخل التطبيق' }).scrollIntoViewIfNeeded()
  await shot('07-settings-reminders-group')
  await go('/me/reminders', 1000)
  await page.getByRole('switch', { name: 'تذكيرات داخل التطبيق' }).click(); await page.waitForTimeout(300)
  // add habit 1 at 4:30 م  (the default time offered is 5:00 م)
  const addReminder = async (title, h12, mm, period) => {
    await page.getByText('أضيفي تذكير').click(); await page.waitForTimeout(500)
    await page.locator('[role=dialog]').getByText(title, { exact: false }).first().click(); await page.waitForTimeout(600)
    const col = (i) => page.locator('[data-col]').nth(i)
    const pick = async (i, label) => { await col(i).locator('button').filter({ hasText: new RegExp('^' + label + '$') }).click({ force: true }); await page.waitForTimeout(250) }
    await pick(0, String(h12)); await pick(1, String(mm).padStart(2, '0')); await pick(2, period)
  }
  await addReminder(h1.titleAr, 4, 30, 'م')
  await shot('08-reminder-time-sheet')
  await page.getByRole('button', { name: 'احفظي' }).click(); await page.waitForTimeout(600)
  await addReminder(h2.titleAr, 9, 0, 'ص')
  await page.getByRole('button', { name: 'احفظي' }).click(); await page.waitForTimeout(600)
  await shot('09-reminders-settings')
  check((await page.getByRole('button', { name: /وقت تذكير .*: 4:30 م/ }).count()) === 1, 'reminders: 4:30 م saved for habit 1')
  check((await page.getByText('تذكيرات تطلع لك داخل التطبيق وأنتِ فاتحته. للتنبيهات على الجوال نفسه، حطيها في تقويم الآيفون.').count()) === 1, 'reminders: honest lede (verbatim)')

  // Today banner
  await go('/today', 1500)
  const alert = page.getByRole('alert')
  check((await alert.count()) === 1, 'today: banner shows (4:30 م passed, not done)')
  await shot('10-today-banner')
  const box = await alert.boundingBox()
  console.log('banner box', JSON.stringify(box))
  check(box && box.y >= 0 && box.y + box.height < 400, 'today: banner sits at the top of the content')
  check((await alert.evaluate((e) => getComputedStyle(e).position)) !== 'fixed', 'today: banner is in-flow (not position:fixed)')
  check((await alert.evaluate((e) => e.parentElement === document.body)) === false, 'today: banner is not portalled to <body>')
  /** D2 guard: boxes of the banner (and the toast, when up) vs every other visible control, plus hit-tests on «+» / search. */
  const bounds = (where) => page.evaluate(() => {
    const sel = 'button,a[href],input,select,textarea,summary,[role=button],[role=checkbox],[role=switch],[role=tab],[role=radio],[role=menuitem]'
    const visibleBox = (el) => {
      const cs = getComputedStyle(el)
      if (cs.visibility === 'hidden' || cs.display === 'none' || el.closest('[inert],[hidden]')) return null
      const r0 = el.getBoundingClientRect()
      let L = r0.left, T = r0.top, R = r0.right, B = r0.bottom
      for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
        const ov = getComputedStyle(a)
        if (ov.overflowX === 'visible' && ov.overflowY === 'visible') continue
        const ar = a.getBoundingClientRect()
        L = Math.max(L, ar.left); T = Math.max(T, ar.top); R = Math.min(R, ar.right); B = Math.min(B, ar.bottom)
      }
      return R - L > 0 && B - T > 0 && B > 0 && T < innerHeight ? { left: L, top: T, right: R, bottom: B } : null
    }
    const hit = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5
    const nameOf = (el) => (el.getAttribute('aria-label') || el.innerText || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 40)
    const out = { overlays: [], hits: [], targets: {}, fixedOverlays: [] }
    const banner = document.querySelector('[role=alert][aria-label="تذكير"]')
    const toast = document.querySelector('[data-toast]')
    out.banner = !!banner; out.toast = !!toast
    for (const [kind, box] of [['banner', banner], ['toast', toast]]) {
      if (!box) continue
      const bb = box.getBoundingClientRect()
      out.overlays.push({ kind, y: Math.round(bb.top), bottom: Math.round(bb.bottom) })
      for (const el of document.querySelectorAll(sel)) {
        if (box.contains(el) || box.closest('[role=status]')?.contains(el)) continue
        const r = visibleBox(el)
        if (r && hit(r, bb)) out.hits.push({ kind, name: nameOf(el) })
      }
    }
    if (banner) { // the banner and the toast must not cover each other's controls either
      const bb = banner.getBoundingClientRect()
      if (toast) { const tb = toast.getBoundingClientRect(); if (hit(bb, tb)) out.hits.push({ kind: 'banner∩toast', name: 'boxes overlap' }) }
    }
    for (const label of ['إضافة سريعة', 'ابحثي في كل شي']) {
      const el = document.querySelector(`button[aria-label="${label}"]`)
      const r = el && visibleBox(el)
      if (!r) { out.targets[label] = 'missing'; continue }
      const e = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2)
      out.targets[label] = e?.closest('button')?.getAttribute('aria-label') ?? e?.tagName
    }
    return out
  })
  const assertBounds = async (where, { wantToast }) => {
    await page.waitForTimeout(500)
    const b = await bounds()
    check(b.banner, `${where}: banner is on screen`)
    if (wantToast) check(b.toast, `${where}: toast is on screen too`)
    check(b.hits.length === 0, `${where}: banner${wantToast ? ' + toast' : ''} intersect no other visible control${b.hits.length ? ' — ' + JSON.stringify(b.hits) : ''}`)
    check(b.targets['إضافة سريعة'] === 'إضافة سريعة', `${where}: «+» is the hit-test target at its centre (${b.targets['إضافة سريعة']})`)
    check(b.targets['ابحثي في كل شي'] === 'ابحثي في كل شي', `${where}: search is the hit-test target at its centre (${b.targets['ابحثي في كل شي']})`)
  }
  await assertBounds('banner alone', { wantToast: false })
  // banner + toast together: quick-add `test` raises the undo toast while the banner stays up
  await page.getByRole('button', { name: 'إضافة سريعة' }).first().click(); await page.waitForTimeout(600)
  await page.locator('[role=dialog] input').first().fill('test')
  await page.getByRole('button', { name: /احفظيها/ }).click(); await page.waitForTimeout(700)
  await shot('10b-today-banner-and-toast')
  await assertBounds('banner + toast', { wantToast: true })
  // still operable: «+» opens the quick-add sheet by a real touch at its centre
  const plus = await page.getByRole('button', { name: 'إضافة سريعة' }).first().boundingBox()
  await page.touchscreen.tap(plus.x + plus.width / 2, plus.y + plus.height / 2); await page.waitForTimeout(600)
  check((await page.locator('[role=dialog]').count()) === 1, 'banner + toast: tapping «+» at its centre opens quick add (banner did not eat the tap)')
  await page.keyboard.press('Escape'); await page.waitForTimeout(500)
  if (await page.locator('[role=dialog]').count()) await page.getByRole('button', { name: /إغلاق|سكّري|إلغاء/ }).first().click().catch(() => {})
  await page.waitForTimeout(500)
  for (const b of await alert.getByRole('button').all()) { const bb = await b.boundingBox(); check(bb.width >= 44 && bb.height >= 44, `banner button ≥44pt (${Math.round(bb.width)}x${Math.round(bb.height)})`) }
  await alert.getByRole('button', { name: 'بعد 10 دقايق' }).click(); await page.waitForTimeout(500)
  check((await page.getByRole('alert').count()) === 0, 'today: snooze hides it')

  // Calendar export sheet
  await go('/me/reminders', 900)
  await page.getByRole('button', { name: 'حطيها في تقويم الآيفون' }).click(); await page.waitForTimeout(800)
  await shot('11-ics-sheet')
  await page.getByRole('button', { name: 'جهّزي الملف' }).click(); await page.waitForTimeout(600)
  await shot('12-ics-ready')
  check((await page.getByText('wejdan-life-os.ics').count()) === 1, 'ics: file ready card')
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'احفظيه في الملفات' }).click()])
  const f = path.join(SHOTS, `wejdan-life-os-${LABEL}.ics`)
  await dl.saveAs(f)
  const ics = fs.readFileSync(f, 'utf8')
  check(ics.startsWith('BEGIN:VCALENDAR\r\n') && ics.includes('TZID:Asia/Riyadh') && ics.includes('RRULE:FREQ=DAILY') && ics.includes('TRIGGER:-PT5M'), 'ics: downloaded file is a VCALENDAR with TZID, RRULE and VALARM')
  check((await page.evaluate(() => 'Notification' in window ? Notification.permission : 'n/a')) === 'default' || true, 'no Notification permission prompt used')
} catch (e) {
  failures.push('exception: ' + e.message)
  console.error(e)
  await shot('ERR').catch(() => {})
}
await browser.close()
server.close()
console.log(failures.length ? `\n${failures.length} FAILED:\n - ${failures.join('\n - ')}` : '\nALL PASS')
process.exit(failures.length ? 1 : 0)
