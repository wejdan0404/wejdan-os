/**
 * Release gate 3 / D5 guard: renders the real <Bidi> component in an RTL Arabic paragraph in headless chromium and
 * checks the GLYPH ORDER on screen: inside every Latin/number run the characters must advance left-to-right
 * (x strictly increasing, spaces and accents included), and the first logical run sits to the right of the
 * second (RTL reading order across runs). No app build needed: bundles Bidi.tsx with esbuild.
 *   PLAYWRIGHT_MODULE=<…/playwright/index.mjs> node tests/e2e/bidiGlyphOrder.e2e.mjs
 * Env: CHROMIUM (default /opt/pw-browsers/chromium), SHOTS (default ./e2e-shots).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright')
const { build } = await import('esbuild')
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const SHOTS = path.resolve(process.env.SHOTS ?? 'e2e-shots')
fs.mkdirSync(SHOTS, { recursive: true })

const entry = `
import { createRoot } from 'react-dom/client'
import { createElement } from 'react'
import { Bidi } from ${JSON.stringify(path.join(root, 'src/ui/components/Bidi.tsx'))}
window.mount = (el, text) => createRoot(el).render(createElement(Bidi, null, text))
`
const out = await build({ stdin: { contents: entry, resolveDir: root, loader: 'js' }, bundle: true, write: false, format: 'iife', platform: 'browser', jsx: 'automatic', nodePaths: [path.join(root, 'node_modules')], define: { 'process.env.NODE_ENV': '"production"' } })
const js = out.outputFiles[0].text

// [text, [Latin/number runs expected as ONE visual run, in logical order]]
const STRINGS = [
  ['مرطّب Embryolisse Lait-Crème Concentré للوجه', ['Embryolisse Lait-Crème Concentré']],
  ['واقي SPF 30+ للصيف', ['SPF 30+']],
  ['من 30–45 دقيقة', ['30–45']],
  ['كريم L’Occitane Paris هدية', ['L’Occitane Paris']],
  ['عرض Marks & Spencer اليوم', ['Marks & Spencer']],
  ['السعر $25 فقط مع Café Noël', ['$25', 'Café Noël']],
]

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium', args: ['--headless=new'] })
const page = await (await browser.newContext({ viewport: { width: 390, height: 600 }, locale: 'ar-SA' })).newPage()
await page.setContent('<!doctype html><html dir="rtl" lang="ar"><body style="font:16px/2 system-ui,sans-serif;width:370px;white-space:nowrap;margin:10px"></body></html>')
await page.addScriptTag({ content: js })
const failures = []
const check = (ok, what) => { console.log(ok ? '  PASS' : '  FAIL', what); if (!ok) failures.push(what) }

for (const [text, runs] of STRINGS) {
  const res = await page.evaluate(async ([text, runs]) => {
    const p = document.createElement('p'); p.dir = 'rtl'; p.style.margin = '0'; document.body.appendChild(p)
    window.mount(p, text)
    await new Promise((r) => setTimeout(r, 50))
    const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT)
    const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode)
    const xs = (node) => [...node.data].map((_, i) => { const r = document.createRange(); r.setStart(node, i); r.setEnd(node, i + 1); const b = r.getBoundingClientRect(); return b.left + b.width / 2 })
    const found = []
    for (const run of runs) {
      const node = nodes.find((n) => n.data === run)
      if (!node) { found.push({ run, error: 'run is not a single text node' }); continue }
      const x = xs(node)
      found.push({ run, inBdi: node.parentElement?.tagName === 'BDI', increasing: x.every((v, i) => i === 0 || v > x[i - 1]) })
    }
    const mid = (run) => { const n = nodes.find((n) => n.data === run); if (!n) return null; const x = xs(n); return x[0] }
    const order = runs.length > 1 ? mid(runs[0]) > mid(runs[1]) : true // first logical run is further right in RTL
    return { found, order }
  }, [text, runs])
  for (const f of res.found) {
    check(!f.error && f.inBdi, `«${text}»: «${f.run}» is one <bdi> isolate${f.error ? ' — ' + f.error : ''}`)
    check(!!f.increasing, `«${text}»: glyphs of «${f.run}» advance left-to-right on screen`)
  }
  check(res.order, `«${text}»: runs keep RTL reading order`)
}
await page.screenshot({ path: path.join(SHOTS, 'bidi-glyph-order.png') })
await browser.close()
console.log(failures.length ? `\n${failures.length} FAILED` : '\nALL PASSED')
process.exit(failures.length ? 1 : 0)
