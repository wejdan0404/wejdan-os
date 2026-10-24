#!/usr/bin/env node
/**
 * Documentation checker (no dependencies). Run from anywhere:  node docs/handoff/tools/check-docs.mjs
 *
 *  1. Relative markdown links  [text](path#anchor)  in README.md, AGENTS.md, CODEX_START_HERE.md, docs/handoff/*.md
 *     must point at an existing file (anchors are not checked).
 *  2. Backticked repo paths (src/..., tests/..., docs/..., scripts/..., public/..., root config files) mentioned in
 *     those docs must exist. Tokens with wildcards/placeholders, build output and explicitly "not in repo" paths are skipped.
 *  3. Counts quoted in the docs are compared with the tree: test files, test-file count in README, dependency counts.
 *
 * Exit code 0 = clean, 1 = problems (printed).
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { dirname, join, resolve, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const problems = []
const note = (m) => problems.push(m)

const docs = ['README.md', 'AGENTS.md', 'CODEX_START_HERE.md']
for (const f of readdirSync(join(root, 'docs/handoff'))) if (f.endsWith('.md')) docs.push(`docs/handoff/${f}`)
const present = docs.filter((d) => existsSync(join(root, d)))
for (const d of docs) if (!present.includes(d)) note(`missing doc file: ${d}`)

// ---------- 1. markdown links
let links = 0
for (const d of present) {
  const text = readFileSync(join(root, d), 'utf8').replace(/```[\s\S]*?```/g, '')
  for (const m of text.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
    const target = m[1]
    if (/^(https?:|mailto:|#)/.test(target)) continue
    links++
    const file = target.split('#')[0]
    if (!file) continue
    const abs = resolve(root, dirname(d), decodeURIComponent(file))
    if (!existsSync(abs)) note(`${d}: broken link -> ${target}`)
  }
}

// ---------- 2. backticked paths
const SKIP = [
  /[*<>{}…]/, /\.\.\./, /^dist\//, /^node_modules\//, /^\.github/, /^ops\//, /^gh-pages/, /^\/(?!\/)/, /^https?:/,
  /^~/, /^scratchpad/, /^_transfer/, /^\$/, /\s/, /^docs\/handoff\/screenshots\/\d\d?-?$/,
]
// paths that legitimately do not exist in this repo (named on purpose, "not in repo")
const NOT_IN_REPO = new Set(['assets/index-DhYFUn4i.js'])
const ROOTS = /^(src|tests|docs|scripts|public|README\.md|AGENTS\.md|CODEX_START_HERE\.md|package\.json|package-lock\.json|vite\.config\.ts|index\.html|tsconfig[\w.]*\.json|eslint\.config\.js)/
let paths = 0
for (const d of present) {
  const text = readFileSync(join(root, d), 'utf8')
  const seen = new Set()
  for (const m of text.matchAll(/`([^`\n]+)`/g)) {
    let t = m[1].trim().replace(/[.,;:]+$/, '')
    t = t.replace(/:\d+(-\d+)?$/, '') // file:line
    if (!ROOTS.test(t) || SKIP.some((r) => r.test(t)) || NOT_IN_REPO.has(t)) continue
    if (!/[./]/.test(t)) continue
    if (seen.has(t)) continue
    seen.add(t)
    paths++
    if (!existsSync(join(root, t))) note(`${d}: path does not exist -> ${t}`)
  }
}

// ---------- 3. counts
function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules' || e === 'dist' || e === '.git') continue
    const p = join(dir, e)
    statSync(p).isDirectory() ? walk(p, out) : out.push(p)
  }
  return out
}
const testFiles = walk(join(root, 'tests')).filter((p) => /\.test\.tsx?$/.test(p))
const byDir = (k) => testFiles.filter((p) => relative(root, p).startsWith(`tests/${k}/`)).length
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const counts = {
  testFiles: testFiles.length,
  domainTests: byDir('domain'),
  uiTests: byDir('ui'),
  migrationTests: byDir('migration'),
  dependencies: Object.keys(pkg.dependencies || {}).length,
  devDependencies: Object.keys(pkg.devDependencies || {}).length,
}
const readme = readFileSync(join(root, 'README.md'), 'utf8')
const m = readme.match(/(\d+) files \/ (\d+) tests/)
if (m && Number(m[1]) !== counts.testFiles) note(`README says ${m[1]} test files, tree has ${counts.testFiles}`)

console.log(JSON.stringify({ docs: present.length, links, paths, counts }, null, 2))
if (problems.length) {
  console.log(`\n${problems.length} problem(s):`)
  for (const p of problems) console.log(' - ' + p)
  process.exit(1)
}
console.log('docs check: OK')
