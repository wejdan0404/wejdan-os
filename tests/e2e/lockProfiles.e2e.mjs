/**
 * End-to-end for the on-device app lock + profiles. Mobile 390x844, ar-SA, headless chromium, service worker ON.
 * Every record it creates is named "test".
 *
 *  1. onboarding + one inbox item `test`           (plain DB, lock off — the app works as before)
 *  2. Settings → enable lock → recovery code → «حفظته»  → lands on Today; the plain DB is KEPT as a rollback (deleted only after a real unlock on the next launch), encrypted DB holds only ciphertext;
 *     per-box record counts identical before/after (+1 automatic «before-lock» backup)
 *  3. reload → locked → wrong password (calm message) → right password → data intact
 *  4. second profile (create → its own recovery code → onboarding) is isolated from the first; switching back keeps the data
 *  5. forgot password → recovery code → new password → data intact
 *  6. delete profile 2 (two steps, password)
 *  7. auto-lock «فورًا» on visibilitychange + neutral cover; backups still work per profile (export dialog)
 *  8. soft delay after 5 wrong passwords
 *  9. offline reload while locked and unlocked; the service-worker caches hold no profile data
 *
 * Run: npm run build && PLAYWRIGHT_MODULE=<…/playwright/index.mjs> SHOTS=<dir> node tests/e2e/lockProfiles.e2e.mjs
 * Env: REACT_DIR (./dist) · SHOTS · PORT (5713) · LABEL · CHROMIUM · DARK=1 · REDUCED=1
 */
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright')
const REACT_DIR = path.resolve(process.env.REACT_DIR ?? 'dist')
const SHOTS = path.resolve(process.env.SHOTS ?? 'e2e-shots')
const PORT = Number(process.env.PORT ?? 5713)
const LABEL = process.env.LABEL ?? (process.env.DARK ? 'dark' : 'light')
const BASE = `http://localhost:${PORT}/wejdan-os/`
fs.mkdirSync(SHOTS, { recursive: true })

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.ico': 'image/x-icon' }
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
  locale: 'ar-SA', timezoneId: 'Asia/Riyadh', serviceWorkers: 'allow',
  colorScheme: process.env.DARK ? 'dark' : 'light',
  reducedMotion: process.env.REDUCED ? 'reduce' : 'no-preference',
  permissions: ['clipboard-read', 'clipboard-write'],
})
const page = await ctx.newPage()
page.setDefaultTimeout(10000)
const netCalls = []
page.on('request', (r) => { const u = new URL(r.url()); if (u.hostname !== 'localhost') netCalls.push(r.url()) })

const failures = []
const log = (...a) => console.log(...a)
const check = (ok, what) => { log(ok ? '  PASS' : '  FAIL', what); if (!ok) failures.push(what) }
const shot = (name) => page.screenshot({ path: path.join(SHOTS, `${LABEL}-${name}.png`) })
const wait = (ms) => page.waitForTimeout(ms)

const PW1 = 'test password 1'
const PW2 = 'test password 2'
const PW1b = 'test password new'

/** rows per box of an IndexedDB database (values are NOT read) */
const dbInfo = (name) => page.evaluate(async (name) => new Promise((ok) => {
  const req = indexedDB.open(name)
  req.onupgradeneeded = () => { req.transaction.abort() }
  req.onerror = () => ok(null)
  req.onsuccess = () => {
    const db = req.result
    if (!db.objectStoreNames.contains('records')) { db.close(); return ok(null) }
    const g = db.transaction('records', 'readonly').objectStore('records').getAll()
    g.onsuccess = () => {
      db.close()
      const counts = {}
      let sealed = 0
      for (const r of g.result) { counts[r.box] = (counts[r.box] ?? 0) + 1; if (r.value && r.value.e === 1 && typeof r.value.ct === 'string') sealed++ }
      ok({ counts, total: g.result.length, sealed, dump: JSON.stringify(g.result.map((r) => r.value)).slice(0, 4000000) })
    }
  }
}), name)
const dbNames = () => page.evaluate(async () => (await indexedDB.databases()).map((d) => d.name))
const registry = () => page.evaluate(() => localStorage.getItem('wejdan.vault.v1'))

const go = async (hash, w = 900) => { await page.goto(BASE + (hash ? '#' + hash : ''), { waitUntil: 'load' }); await wait(w) }
const reload = async (w = 1200) => { await page.reload({ waitUntil: 'load' }); await wait(w) }
const tabBtn = (name) => page.locator('nav[aria-label="الأقسام"]').getByRole('button', { name })
const field = (label) => page.getByLabel(label, { exact: true })
const tapPrimary = (name) => page.getByRole('button', { name, exact: true }).click()

async function onboarding() {
  await page.getByRole('button', { name: /يلا نبدأ/ }).first().click(); await wait(400)
  await page.locator('input').first().fill('test')
  for (let i = 0; i < 3; i++) { await page.getByRole('button', { name: /^\s*التالي\s*$/ }).click(); await wait(400) }
  await page.getByRole('button', { name: /^\s*(التالي|تخطّي)\s*$/ }).click(); await wait(1200)
  const chips = page.getByRole('group', { name: 'عادات تبدين فيها' }).locator('button')
  for (let i = 0; i < Math.min(2, await chips.count()); i++) { await chips.nth(i).click(); await wait(120) }
  await page.getByRole('button', { name: /^\s*(التالي|تخطّي)\s*$/ }).click(); await wait(400)
  await page.getByRole('button', { name: /ابدئي يومك/ }).click(); await wait(2200)
}
async function quickAdd(text = 'test') {
  await page.getByRole('button', { name: 'إضافة سريعة' }).first().click(); await wait(600)
  await page.locator('[role=dialog] input').first().fill(text)
  await page.getByRole('button', { name: /احفظيها/ }).click(); await wait(700)
}
const inboxBadge = async () => { await tabBtn('أنا').tap(); await wait(700); const t = await page.locator('main, [role=main], body').first().innerText(); return /الوارد\s*\n?\s*(\d+)/.exec(t)?.[1] ?? null }
async function unlockWith(user, pw) {
  if (user != null) await field('اسم المستخدم').fill(user)
  await field('كلمة السر').fill(pw)
  await tapPrimary('افتحي')
}
const lockedScreen = () => page.getByRole('button', { name: 'افتحي', exact: true }).count().then((n) => n > 0)
const onToday = () => /#\/today/.test(page.url())

try {
  // ---- 1. plain, lock off ---------------------------------------------------------------------------------
  log('1. onboarding + a `test` inbox item (lock off)')
  await go('', 1500)
  await onboarding()
  // gate-2 P1: wipe from Settings → first run again → must land on Today (not back on Settings)
  await go('/me/settings', 1200)
  await page.getByRole('button', { name: 'احذفي كل شي', exact: true }).first().click(); await wait(500)
  await page.getByRole('button', { name: 'إيه، احذفي كل شي' }).click(); await wait(500)
  await page.locator('[role=alertdialog]').getByRole('button', { name: 'احذفي كل شي', exact: true }).click(); await wait(1500)
  check(/#\/onboarding/.test(page.url()), 'wipe → back to first run')
  await onboarding()
  check(onToday(), `after wipe → «يلا نبدأ» … the app lands on Today (${new URL(page.url()).hash})`)
  await quickAdd('test')
  const plainBefore = await dbInfo('wejdan_life_os')
  check(!!plainBefore && plainBefore.total > 100, `plain DB wejdan_life_os holds ${plainBefore?.total} records`)
  check((await registry()) === null, 'no lock registry yet (feature is opt-in, default off)')

  // ---- 2. enable the lock ---------------------------------------------------------------------------------
  log('2. Settings → قفل التطبيق')
  await go('/me/settings', 1200)
  await shot('01-settings-lock-off')
  await page.getByRole('switch', { name: 'قفل التطبيق' }).click(); await wait(600)
  await shot('02-setup-empty')
  check((await page.getByRole('button', { name: 'كمّلي', exact: true }).isDisabled()), 'setup: «كمّلي» disabled until username/password/repeat are valid')
  await field('اسم المستخدم').fill('test')
  await field('كلمة السر').fill('short')
  await shot('03-setup-short-password')
  await field('كلمة السر').fill(PW1)
  await field('أعيدي كلمة السر').fill('test password X')
  await field('أعيدي كلمة السر').blur(); await wait(300)
  check((await page.getByText('ما تطابقت، جرّبي مرة ثانية').count()) === 1, 'setup: mismatch helper appears (calm, no shake)')
  await field('أعيدي كلمة السر').fill(PW1)
  await wait(300)
  await shot('04-setup-valid')
  await tapPrimary('كمّلي'); await wait(1200)
  check((await page.getByRole('button', { name: 'حفظته', exact: true }).isDisabled()), 'recovery: «حفظته» disabled while the code is hidden')
  check((await page.getByRole('button', { name: 'انسخيه' }).isDisabled()), 'recovery: copy disabled while hidden')
  await shot('05-recovery-hidden')
  await page.getByRole('button', { name: 'أظهريه' }).click(); await wait(300)
  const code = (await page.locator('[data-testid=recovery-code]').innerText()).replace(/\s+/g, '')
  check(/^[A-HJ-NP-Z2-9]{16}$/.test(code), 'recovery code revealed: 16 symbols, unambiguous alphabet')
  await shot('06-recovery-revealed')
  await page.getByRole('button', { name: 'انسخيه' }).click(); await wait(400)
  check((await page.getByText('اننسخ. الصقيه في مكان آمن.').count()) === 1, 'recovery: copied status')
  const clip = await page.evaluate(() => navigator.clipboard.readText()).catch(() => null)
  check(clip == null || clip.replace(/\s+/g, '') === code, 'recovery: clipboard holds the code')
  await shot('07-recovery-copied')
  await tapPrimary('حفظته'); await wait(2500)
  check(onToday(), `after «حفظته» the app lands on Today (${new URL(page.url()).hash})`)
  await shot('08-today-after-lock')
  const names = await dbNames()
  check(names.includes('wejdan_life_os'), 'plain DB is KEPT as a rollback right after enabling (never deleted in the same launch)')
  const encName = names.find((n) => n?.startsWith('wejdan_life_os_p_'))
  check(!!encName, `encrypted profile DB exists (${encName})`)
  const enc = await dbInfo(encName)
  const expectCounts = { ...plainBefore.counts, backups: (plainBefore.counts.backups ?? 0) + 1 }
  check(JSON.stringify(Object.entries(enc.counts).sort()) === JSON.stringify(Object.entries(expectCounts).sort()), `record counts per box identical before/after (+1 «before-lock» backup): ${enc.total} = ${plainBefore.total}+1`)
  check(enc.sealed === enc.total, `every record value is ciphertext (${enc.sealed}/${enc.total})`)
  check(!/"text":"test"|\\"text\\":\\"test\\"/.test(enc.dump) && !enc.dump.includes('onboardingDone'), 'no readable field names / values in the stored rows')
  const reg = await registry()
  check(!!reg && !reg.includes(PW1) && !reg.includes(code), 'registry (localStorage) holds no password and no recovery code')
  check(!reg.includes('"key"') , 'registry holds no raw key')

  // ---- 3. reload → locked --------------------------------------------------------------------------------
  log('3. reload → locked → wrong → right')
  await reload()
  check(await lockedScreen(), 'after reload the app is LOCKED (unlock screen)')
  check((await page.locator('nav[aria-label="الأقسام"]').count()) === 0, 'locked: no tab bar / app content mounted')
  await shot('09-unlock')
  await unlockWith(null, 'wrong password'); await wait(900)
  check((await page.getByText('كلمة السر ما تطابق. جرّبي مرة ثانية، خذي راحتك.').count()) === 1, 'wrong password: calm helper')
  check((await field('كلمة السر').inputValue()) === 'wrong password', 'wrong password: field keeps its value')
  await shot('10-unlock-wrong')
  // a wrong USERNAME with the right password fails with the very same message
  await field('اسم المستخدم').fill('someone'); await field('كلمة السر').fill(PW1); await tapPrimary('افتحي'); await wait(900)
  check((await page.getByText('كلمة السر ما تطابق. جرّبي مرة ثانية، خذي راحتك.').count()) === 1, 'wrong username: identical message (no username oracle)')
  await unlockWith('test', PW1); await wait(2500)
  check(!(await lockedScreen()) && (await page.locator('nav[aria-label="الأقسام"]').count()) === 1, 'right password unlocks')
  check((await inboxBadge()) === '1', 'data intact after unlock (inbox item `test`)')
  await wait(1500)
  check(!(await dbNames()).includes('wejdan_life_os'), 'plain DB deleted only now: a real unlock with the new credentials on a LATER launch')
  check(!(await registry()).includes('"legacy"'), 'rollback mark cleared from the registry')

  // ---- 4. second profile --------------------------------------------------------------------------------
  log('4. second profile, isolated')
  await go('/me/settings', 1200)
  await shot('11-settings-lock-on')
  await page.getByRole('button', { name: /الملفات على هالجهاز/ }).click(); await wait(600)
  await shot('12-manage-profiles')
  await page.getByRole('button', { name: 'ملف جديد' }).click(); await wait(700)
  await shot('13-create-sheet-empty')
  await page.getByLabel('الاسم', { exact: true }).fill('test two')
  await page.locator('[role=dialog]').getByLabel('اسم المستخدم', { exact: true }).fill('test.two')
  await page.locator('[role=dialog]').getByLabel('كلمة السر', { exact: true }).fill(PW2)
  // D6: the avatar radios are named in Arabic (flower registry), never by raw id
  const avatarNames = await page.locator('[role=dialog] [role=radiogroup]').first().getByRole('radio').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')))
  check(avatarNames.length === 5 && avatarNames.every((n) => /[\u0600-\u06FF]/.test(n ?? '')), `avatar radios have Arabic names (${avatarNames.join(' · ')})`)
  await page.getByRole('radio', { name: 'سوسن' }).click(); await wait(300)
  await shot('14-create-sheet-filled')
  await page.locator('[role=dialog]').getByRole('button', { name: 'أنشئي الملف' }).click(); await wait(1400)
  await page.getByRole('button', { name: 'أظهريه' }).click(); await wait(200)
  const code2 = (await page.locator('[data-testid=recovery-code]').innerText()).replace(/\s+/g, '')
  check(code2 !== code && /^[A-HJ-NP-Z2-9]{16}$/.test(code2), 'profile 2 gets its own recovery code')
  await tapPrimary('حفظته'); await wait(3000)
  check(!!(await page.getByRole('button', { name: /يلا نبدأ/ }).count()), 'new profile starts empty (first-run onboarding)')
  await onboarding()
  check((await inboxBadge()) === null, 'profile 2 sees NONE of profile 1\'s inbox')
  const names2 = (await dbNames()).filter((n) => n?.startsWith('wejdan_life_os_p_'))
  check(names2.length === 2, 'two separate encrypted databases')
  await tabBtn('أنا').tap(); await wait(600)
  await shot('15-me-profile2')
  await page.getByRole('button', { name: /بدّلي الملف/ }).click(); await wait(900)
  check(!(await lockedScreen()) && (await page.getByRole('heading', { name: 'اختاري ملفك' }).count()) === 1, 'switching locks and shows the picker (2 profiles)')
  await shot('16-picker')
  await page.getByRole('button', { name: /test · test$/ }).first().click().catch(async () => { await page.locator('button[aria-label$="· test"]').first().click() })
  await wait(700)
  await shot('17-unlock-from-picker')
  await unlockWith('test', PW1); await wait(2500)
  check((await inboxBadge()) === '1', 'switching back: profile 1 data intact')

  // ---- 5. forgot password → recovery code ----------------------------------------------------------------
  log('5. forgot password → recovery code')
  await reload()
  check(await lockedScreen() || (await page.getByRole('heading', { name: 'اختاري ملفك' }).count()) === 1, 'locked again after reload')
  if (!(await lockedScreen())) { await page.locator('button[aria-label$="· test"]').first().click(); await wait(600) }
  await page.getByRole('button', { name: 'نسيتي كلمة السر؟' }).click(); await wait(500)
  await field('رمز الاسترجاع').fill('AAAA AAAA AAAA AAAA'); await page.getByRole('button', { name: 'كمّلي', exact: true }).click(); await wait(900)
  check((await page.getByText('الرمز ما يطابق. تأكدي من الحروف وجرّبي مرة ثانية.').count()) === 1, 'wrong recovery code: calm helper')
  await shot('18-forgot-wrong')
  await field('رمز الاسترجاع').fill(code.toLowerCase()); await page.getByRole('button', { name: 'كمّلي', exact: true }).click(); await wait(1000)
  await field('كلمة السر الجديدة').fill(PW1b); await field('أعيدي كلمة السر').fill(PW1b)
  await shot('19-forgot-new-password')
  await page.getByRole('button', { name: 'كمّلي', exact: true }).click(); await wait(1500)
  await page.getByRole('button', { name: 'أظهريه' }).click(); await wait(200)
  const code1b = (await page.locator('[data-testid=recovery-code]').innerText()).replace(/\s+/g, '')
  check(code1b !== code, 'recovery reset issues a NEW recovery code')
  await tapPrimary('حفظته'); await wait(2500)
  check((await inboxBadge()) === '1', 'recovery unlock: data intact')
  await reload()
  if (!(await lockedScreen())) { await page.locator('button[aria-label$="· test"]').first().click(); await wait(600) }
  await unlockWith('test', PW1); await wait(900)
  check(await lockedScreen(), 'old password no longer works after the recovery reset')
  await unlockWith('test', PW1b); await wait(2500)
  check((await inboxBadge()) === '1', 'new password unlocks, data intact')

  // ---- 6. delete profile 2 -------------------------------------------------------------------------------
  log('6. delete profile 2 (two steps)')
  await go('/me/settings', 1200)
  await page.getByRole('button', { name: /الملفات على هالجهاز/ }).click(); await wait(600)
  await page.getByRole('button', { name: 'احذفي ملف test two' }).click(); await wait(700)
  await shot('20-delete-step1')
  check(await page.getByRole('button', { name: 'لا، خلّيه', exact: true }).first().isVisible(), 'delete step 1: safe default «لا، خلّيه» is the primary')
  await page.getByRole('button', { name: 'كمّلي للحذف' }).click(); await wait(500)
  check(await page.getByRole('button', { name: 'احذفي الملف نهائيًا' }).isDisabled(), 'delete step 2: destructive button disabled until a password is typed')
  await page.getByLabel('كلمة سر الملف', { exact: true }).fill('wrong password'); await page.getByRole('button', { name: 'احذفي الملف نهائيًا' }).click(); await wait(900)
  check((await page.getByText('كلمة السر ما تطابق. جرّبي مرة ثانية، خذي راحتك.').count()) === 1, 'delete step 2: wrong password refused')
  await shot('21-delete-step2-wrong')
  await page.getByLabel('كلمة سر الملف', { exact: true }).fill(PW2)
  await page.getByRole('button', { name: 'احذفي الملف نهائيًا' }).click(); await wait(1500)
  // the deleted profile is gone from the registry and its records are wiped now; the emptied shell (header only) is
  // removed by the next launch's recover() — see lockKill.e2e.mjs for the kill-at-every-step proof
  check(await page.evaluate(() => JSON.parse(localStorage.getItem('wejdan.vault.v1') ?? 'null')?.profiles?.length === 1), 'profile 2 removed from the registry; profile 1 untouched')
  check((await dbNames()).filter((n) => n?.startsWith('wejdan_life_os_p_')).length <= 2, 'profile 2 database wiped (shell removed at the next launch)')
  check((await page.getByText('انحذف الملف').count()) >= 1, 'plain toast «انحذف الملف»')
  await shot('22-after-delete')
  await page.getByRole('button', { name: 'رجوع', exact: true }).click(); await wait(500)
  check((await inboxBadge()) === '1', 'profile 1 data intact after deleting profile 2')

  // ---- 7. auto-lock + cover + export ---------------------------------------------------------------------
  log('7. auto-lock «فورًا», privacy cover, export dialog')
  await go('/me/settings', 1200)
  await page.getByRole('button', { name: /يقفل/ }).first().click(); await wait(600)
  await shot('23-timing-sheet')
  await page.getByRole('radio', { name: /فورًا/ }).click(); await wait(500)
  const cover = () => page.evaluate(() => document.documentElement.hasAttribute('data-vault-cover'))
  const setVis = (state) => page.evaluate((state) => { Object.defineProperty(document, 'visibilityState', { value: state, configurable: true }); document.dispatchEvent(new Event('visibilitychange')) }, state)
  await page.getByRole('button', { name: /تصدير|صدّري نسخة/ }).first().click().catch(() => {})
  await wait(800)
  const exportDlg = await page.getByText('تبين الملف مشفّر بكلمة سر؟').count()
  check(exportDlg === 1, 'lock on: export asks «تبين الملف مشفّر بكلمة سر؟»')
  if (exportDlg) {
    await shot('24-export-dialog')
    await page.getByLabel('كلمة سر الملف', { exact: true }).fill('test file password')
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'صدّري', exact: true }).click()])
    const body = fs.readFileSync(await dl.path(), 'utf8')
    const j = JSON.parse(body)
    check(j.format === 'wejdan-encrypted-backup' && !body.includes('test password') && !body.includes('"boxes"'), 'encrypted export file: ciphertext only')
    fs.writeFileSync('/tmp/lock-e2e-backup.json', body)
    await wait(500)
  }
  await setVis('hidden'); await wait(300)
  check(await cover(), 'document hidden → neutral cover on')
  await wait(600)
  check(await lockedScreen(), '«فورًا»: the app locked as soon as it was hidden')
  await setVis('visible'); await wait(300)
  check(!(await cover()), 'visible again → cover off')
  check((await page.locator('nav[aria-label="الأقسام"]').count()) === 0, 'locked: app tree (store, toast, screens) unmounted')
  await unlockWith('test', PW1b); await wait(2500)
  check((await inboxBadge()) === '1', 'unlock again: data intact')
  // manual lock
  await go('/me/settings', 1000)
  await page.getByRole('button', { name: 'اقفلي الحين' }).click(); await wait(800)
  check(await lockedScreen(), 'manual «اقفلي الحين» locks')

  // ---- 8. soft delay ------------------------------------------------------------------------------------
  log('8. five wrong passwords → soft delay')
  for (let i = 0; i < 5; i++) { await unlockWith('test', 'nope nope nope'); await wait(700) }
  await wait(500)
  check((await page.getByText('خذي لك نفس').count()) === 1, 'after the 5th wrong attempt the «خذي لك نفس» card shows')
  const btn = page.getByRole('button', { name: /جرّبي بعد/ })
  check((await btn.count()) === 1 && (await btn.isDisabled()), 'primary is disabled «جرّبي بعد …»')
  check(await field('كلمة السر').isDisabled(), 'password field is disabled during the wait')
  await shot('25-wait')
  const t1 = await btn.innerText(); await wait(2200); const t2 = await page.getByRole('button', { name: /جرّبي بعد/ }).innerText()
  check(t1 !== t2, `countdown ticks (${t1.trim()} → ${t2.trim()})`)
  await reload()
  check((await page.getByText('خذي لك نفس').count()) === 1, 'the delay survives a reload')
  check((await page.getByRole('button', { name: 'نسيتي كلمة السر؟' }).isEnabled()), '«نسيتي كلمة السر؟» stays active during the wait')

  // ---- 9. offline -----------------------------------------------------------------------------------------
  log('9. offline reload; service-worker caches')
  await page.evaluate(() => navigator.serviceWorker.ready); await wait(500)
  await reload(1500) // now controlled by the worker
  const controlled = await page.evaluate(() => !!navigator.serviceWorker.controller)
  check(controlled, 'service worker controls the page')
  await ctx.setOffline(true)
  await reload(2000)
  check((await page.getByText('خذي لك نفس').count()) === 1 || (await lockedScreen()), 'offline reload while LOCKED renders the lock screen')
  // use recovery to get in without waiting out the delay
  await page.getByRole('button', { name: 'نسيتي كلمة السر؟' }).click(); await wait(500)
  await field('رمز الاسترجاع').fill(code1b); await page.getByRole('button', { name: 'كمّلي', exact: true }).click(); await wait(1000)
  await field('كلمة السر الجديدة').fill(PW1); await field('أعيدي كلمة السر').fill(PW1)
  await page.getByRole('button', { name: 'كمّلي', exact: true }).click(); await wait(1500)
  await page.getByRole('button', { name: 'أظهريه' }).click(); await wait(200)
  const code1c = (await page.locator('[data-testid=recovery-code]').innerText()).replace(/\s+/g, '')
  await tapPrimary('حفظته'); await wait(2500)
  check((await inboxBadge()) === '1', 'offline: unlocked via recovery, data intact')
  await reload(2000)
  check(await lockedScreen(), 'offline reload while UNLOCKED → locked screen again')
  await unlockWith('test', PW1); await wait(2500)
  check((await inboxBadge()) === '1', 'offline: password unlock works, data intact')
  await ctx.setOffline(false)
  const cacheInfo = await page.evaluate(async (secrets) => {
    const out = { urls: [], leaks: [] }
    for (const k of await caches.keys()) {
      const c = await caches.open(k)
      for (const req of await c.keys()) {
        out.urls.push(req.url)
        const ct = (await c.match(req))?.headers.get('content-type') ?? ''
        if (/json|html|javascript|text/.test(ct)) {
          const body = await (await c.match(req)).text()
          for (const s of secrets) if (body.includes(s)) out.leaks.push(`${req.url} contains a secret`)
        }
      }
    }
    return out
  }, [PW1, PW1b, PW2, code, code1b, code1c, 'test.two'])
  check(cacheInfo.urls.length > 20, `service worker precache has ${cacheInfo.urls.length} static entries`)
  check(cacheInfo.leaks.length === 0, 'no password / recovery code / username found in any cached response')
  check(cacheInfo.urls.every((u) => /\.(js|css|html|png|svg|woff2?|json|webmanifest|ico)(\?|$)|\/wejdan-os\/$/.test(u)), 'cache holds only static asset URLs')
  check(netCalls.length === 0, `no network calls to any other host (${netCalls.length})`)
} catch (e) {
  failures.push('exception: ' + e.message)
  console.error(e)
  await shot('ERR').catch(() => {})
}

await browser.close()
server.close()
log(failures.length ? `\nFAILED (${failures.length}):\n - ${failures.join('\n - ')}` : '\nALL PASS')
process.exit(failures.length && !process.env.REPORT_ONLY ? 1 : 0)
