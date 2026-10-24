/**
 * End-to-end: old Flutter web app → new React app on the SAME origin and path.
 *
 *   1. Serve the Flutter build at http://localhost:PORT/wejdan-os/ and let it create TEST data
 *      (its `?onboarded=1&seed=test` demo flags; every title is "test").
 *   2. Swap the files to the React build (same origin/port/path — like the GitHub Pages deploy).
 *   3. The React app must offer «لقينا بياناتك من النسخة القديمة — ننقلها؟»; tap «نقلها».
 *   4. Her habits/logs appear in the new store; the old wlo_* databases are untouched;
 *      a reload does not offer again.
 *
 * Run (not part of vitest):
 *   FLUTTER_DIR=<flutter build/web> REACT_DIR=<react dist> PLAYWRIGHT_MODULE=<…/playwright/index.mjs> \
 *   SHOTS=<dir> node tests/e2e/legacyMigration.e2e.mjs
 */
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright')
const FLUTTER_DIR = process.env.FLUTTER_DIR
const REACT_DIR = process.env.REACT_DIR ?? path.resolve('dist')
const SHOTS = process.env.SHOTS ?? path.resolve('e2e-shots')
const PORT = Number(process.env.PORT ?? 5711)
if (!FLUTTER_DIR) throw new Error('FLUTTER_DIR is required')
fs.mkdirSync(SHOTS, { recursive: true })

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.wasm': 'application/wasm', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf', '.ico': 'image/x-icon' }
let root = FLUTTER_DIR
const server = http.createServer((req, res) => {
  const u = new URL(req.url ?? '/', `http://localhost:${PORT}`)
  if (!u.pathname.startsWith('/wejdan-os/')) {
    res.writeHead(404).end()
    return
  }
  let rel = decodeURIComponent(u.pathname.slice('/wejdan-os/'.length)) || 'index.html'
  let file = path.join(root, rel)
  if (!file.startsWith(root)) {
    res.writeHead(403).end()
    return
  }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html')
  if (!fs.existsSync(file)) {
    res.writeHead(404).end()
    return
  }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' })
  fs.createReadStream(file).pipe(res)
})
await new Promise((ok) => server.listen(PORT, ok))

const BASE = `http://localhost:${PORT}/wejdan-os/`
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--headless=new', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))

const countBox = (dbName, box = 'box', index = null) =>
  page.evaluate(
    async ([n, s, idx]) => {
      const names = (await indexedDB.databases()).map((d) => d.name)
      if (!names.includes(n)) return -1
      const db = await new Promise((ok, ko) => {
        const r = indexedDB.open(n)
        r.onsuccess = () => ok(r.result)
        r.onerror = () => ko(r.error)
      })
      const st = db.transaction(s, 'readonly').objectStore(s)
      const c = await new Promise((ok) => {
        const r = idx ? st.getAll() : st.count()
        r.onsuccess = () => ok(idx ? r.result.filter((x) => x.box === idx).length : r.result)
      })
      db.close()
      return c
    },
    [dbName, box, index],
  )

const results = {}
try {
  // 1 — old app creates data
  await page.goto(`${BASE}?onboarded=1&seed=test&energy=green`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(12000)
  results.oldHabits = await countBox('wlo_habits')
  results.oldLogs = await countBox('wlo_logs')
  await page.screenshot({ path: path.join(SHOTS, '1-old-flutter.png') })
  if (!(results.oldHabits > 0 && results.oldLogs > 0)) throw new Error(`old app created no data: ${JSON.stringify(results)}`)

  // 2 — deploy swaps the files on the same origin/path
  root = REACT_DIR
  await page.goto(BASE, { waitUntil: 'networkidle' })
  const ask = page.getByText('لقينا بياناتك من النسخة القديمة — ننقلها؟')
  await ask.waitFor({ timeout: 20000 })
  await page.waitForTimeout(600)
  await page.screenshot({ path: path.join(SHOTS, '2-offer.png') })

  // 3 — she taps «نقلها»
  await page.getByRole('button', { name: 'نقلها' }).click()
  await page.getByText('تمام، انتقلت بياناتك', { exact: false }).waitFor({ timeout: 20000 })
  await page.waitForTimeout(400)
  await page.screenshot({ path: path.join(SHOTS, '3-done.png') })
  await page.getByRole('button', { name: 'يلا نكمل' }).click()

  // 4 — data is in the new store; old DBs untouched
  results.newHabits = await countBox('wejdan_life_os', 'records', 'habits')
  results.newLogs = await countBox('wejdan_life_os', 'records', 'logs')
  results.oldHabitsAfter = await countBox('wlo_habits')
  results.oldLogsAfter = await countBox('wlo_logs')
  await page.goto(`${BASE}#/habits`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  results.hashAfterHabits = new URL(page.url()).hash
  await page.screenshot({ path: path.join(SHOTS, '4-habits-after.png') })
  results.offerAfterReload = await page.getByText('لقينا بياناتك من النسخة القديمة').count()

  // real-Chromium check of the no-databases() probe: an aborted creation leaves nothing behind
  results.probeLeftover = await page.evaluate(async () => {
    await new Promise((ok) => {
      const r = indexedDB.open('zz_probe_check')
      r.onupgradeneeded = () => r.transaction.abort()
      r.onerror = () => ok()
      r.onsuccess = () => {
        r.result.close()
        ok()
      }
    })
    return (await indexedDB.databases()).some((d) => d.name === 'zz_probe_check')
  })
} finally {
  results.pageErrors = errors
  console.log(JSON.stringify(results, null, 1))
  await browser.close()
  server.close()
}

const ok =
  results.newHabits === results.oldHabits &&
  results.newLogs === results.oldLogs &&
  results.oldHabitsAfter === results.oldHabits &&
  results.oldLogsAfter === results.oldLogs &&
  results.offerAfterReload === 0 &&
  results.hashAfterHabits === '#/habits'
console.log(ok ? 'E2E PASS' : 'E2E FAIL')
process.exit(ok ? 0 : 1)
