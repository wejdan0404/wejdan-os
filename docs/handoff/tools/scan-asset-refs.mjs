/**
 * Broken-reference scan. Lists every relative import/dynamic import, CSS url(), HTML href/src and
 * config path under index.html, vite.config.ts, src/, scripts/ and checks that the target exists.
 * Also reports public/ and src/ asset files that nothing references ("unreferenced" = no occurrence of the
 * file's path or base name in any source/config file).
 *   node docs/handoff/tools/scan-asset-refs.mjs        (run from the repo root; exit 1 if a reference is broken)
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const CODE_EXT = ['.ts', '.tsx', '.js', '.mjs', '.css', '.json']
const SCAN_DIRS = ['src', 'scripts', 'tests']
const SCAN_FILES = ['index.html', 'vite.config.ts']
const BASE = '/wejdan-os/'

const walk = (d, out = []) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name)
    if (e.isDirectory()) { if (!['node_modules', 'dist', '.git'].includes(e.name)) walk(p, out) } else out.push(p)
  }
  return out
}
const exists = (p) => fs.existsSync(p) && fs.statSync(p).isFile()
const resolveModule = (fromFile, spec) => {
  const base = path.resolve(path.dirname(fromFile), spec)
  const cands = [base, ...CODE_EXT.map((e) => base + e), ...CODE_EXT.map((e) => path.join(base, 'index' + e))]
  // TS ESM-style specifiers that name .js for a .ts file
  if (/\.(js|mjs)$/.test(spec)) cands.push(base.replace(/\.(js|mjs)$/, '.ts'), base.replace(/\.(js|mjs)$/, '.tsx'))
  return cands.find(exists) ?? null
}
const files = [...SCAN_DIRS.filter((d) => fs.existsSync(d)).flatMap((d) => walk(d)), ...SCAN_FILES.filter(exists)]
  .filter((f) => /\.(ts|tsx|js|mjs|css|html|json)$/.test(f) && !/(drawings|actions|actions_ar)\.json$|fixtures|flutter_export|package-lock/.test(f))

const refs = []
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8')
  const rel = path.relative(ROOT, f)
  if (/\.(ts|tsx|js|mjs)$/.test(f)) {
    for (const m of src.matchAll(/(?:from\s+|import\s*\(\s*|import\s+|require\(\s*)['"](\.{1,2}\/[^'"]+)['"]/g)) refs.push({ file: rel, kind: 'import', spec: m[1], target: resolveModule(f, m[1].replace(/\?.*$/, '')) })
  }
  if (/\.css$/.test(f)) {
    for (const m of src.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) {
      if (/^(data:|#|https?:)/.test(m[1])) continue
      const target = m[1].startsWith('/') ? path.join(ROOT, 'public', m[1].replace(BASE, '')) : path.resolve(path.dirname(f), m[1])
      refs.push({ file: rel, kind: 'css-url', spec: m[1], target: exists(target) ? target : null })
    }
    for (const m of src.matchAll(/@import\s+['"]([^'"]+)['"]/g)) if (m[1].startsWith('.')) refs.push({ file: rel, kind: 'css-import', spec: m[1], target: resolveModule(f, m[1]) })
  }
  if (/\.html$/.test(f)) {
    for (const m of src.matchAll(/\b(?:href|src)=["']([^"']+)["']/g)) {
      if (/^(https?:|data:|#|mailto:)/.test(m[1])) continue
      let t
      if (m[1].startsWith(BASE)) t = path.join(ROOT, 'public', m[1].slice(BASE.length))
      else if (m[1].startsWith('/src/')) t = path.join(ROOT, m[1])
      else t = path.resolve(path.dirname(f), m[1])
      refs.push({ file: rel, kind: 'html', spec: m[1], target: exists(t) ? t : null })
    }
  }
  if (rel === 'vite.config.ts') {
    for (const m of src.matchAll(/['"]((?:icons|brand|splash)\/[^'"*]+\.(?:png|svg))['"]/g)) refs.push({ file: rel, kind: 'pwa-manifest', spec: m[1], target: exists(path.join(ROOT, 'public', m[1])) ? m[1] : null })
    for (const m of src.matchAll(/['"]([\w.-]+\.(?:png|svg|js))['"]/g)) if (!/^(react|motion)\./.test(m[1])) refs.push({ file: rel, kind: 'pwa-asset', spec: m[1], target: exists(path.join(ROOT, 'public', m[1])) ? m[1] : null })
    for (const m of src.matchAll(/['"]([\w.-]+\.(?:svg|png))['"]\]/g)) void m
  }
}
// node package assets imported by the app (fonts)
for (const f of files.filter((x) => x.endsWith('fonts.ts'))) {
  for (const m of fs.readFileSync(f, 'utf8').matchAll(/import\s+'(@fontsource\/[^']+)'/g)) {
    const t = path.join(ROOT, 'node_modules', m[1])
    refs.push({ file: path.relative(ROOT, f), kind: 'font-css', spec: m[1], target: exists(t) ? m[1] : null })
  }
}
const broken = refs.filter((r) => !r.target)
console.log(`files scanned: ${files.length} · references checked: ${refs.length} · broken: ${broken.length}`)
for (const b of broken) console.log(`BROKEN  ${b.file}  [${b.kind}]  ${b.spec}`)

// unreferenced assets
const corpus = files.map((f) => fs.readFileSync(f, 'utf8')).join('\n')
const assets = [...walk('public'), ...walk('src').filter((f) => /\.(png|svg|jpg|jpeg|webp|woff2?|ttf|ico)$/.test(f))]
console.log('\nassets with no textual reference (path or base name):')
let unref = 0
for (const a of assets) {
  const rel = path.relative(ROOT, a)
  const pub = rel.startsWith('public' + path.sep) ? rel.slice('public/'.length) : rel
  if (corpus.includes(pub) || corpus.includes(path.basename(a))) continue
  unref++
  console.log('  ' + rel)
}
console.log(unref === 0 ? '  (none)' : `  total: ${unref}`)
process.exit(broken.length ? 1 : 0)
