#!/usr/bin/env node
// Privacy scan (no dependencies): fails when a tracked file matches a secret regex, a
// deny-list literal, or has a forbidden file name. Run: npm run privacy:scan
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const SELF = new Set(['scripts/privacy-scan.mjs', 'scripts/privacy-denylist.txt']);
const SKIP_FILES = new Set(['package-lock.json']);
const BINARY = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.ttf', '.otf', '.woff', '.woff2', '.pdf', '.zip']);

const SECRET_PATTERNS = [
  ['github-token', /\bgh[pousr]_[A-Za-z0-9]{30,}\b/],
  ['github-pat', /\bgithub_pat_[A-Za-z0-9_]{20,}/],
  ['aws-access-key', /\bAKIA[0-9A-Z]{16}\b/],
  ['private-key-block', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['hardcoded-credential', /\b(password|passwd|token|secret|api[_-]?key)\s*[=:]\s*['"][^'"\s]{12,}['"]/i],
  ['hq-token', /\bHQ_[A-Za-z0-9]{8,}/],
  ['email-address', /\b[A-Za-z0-9._%+-]+@(?!example\.|test\.|noreply\.)[A-Za-z0-9-]+\.[A-Za-z]{2,}\b/],
  ['saudi-phone', /(?<![\d.])(?:\+966|00966|0)5\d{8}(?!\d)/],
];
const FORBIDDEN_NAMES = [/\.zip$/i, /(^|\/)\.env(\.|$)/, /\.pem$/i, /\.p12$/i, /id_rsa/, /flutter_export_20\d\d-/];

function readList(file) {
  if (!existsSync(file)) return [];
  return readFileSync(file, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
}
const deny = [
  ...readList(join(here, 'privacy-denylist.txt')),
  ...readList(join(here, 'privacy-denylist.local.txt')),
].map((s) => s.toLowerCase());

const files = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26 })
  .split('\0').filter(Boolean);

const hits = [];
for (const f of files) {
  if (SELF.has(f)) continue;
  if (FORBIDDEN_NAMES.some((re) => re.test(f))) hits.push(`${f}: forbidden file name`);
  if (SKIP_FILES.has(f) || BINARY.has(extname(f).toLowerCase())) continue;
  const p = join(root, f);
  if (!existsSync(p) || statSync(p).size > 4_000_000) continue;
  const lines = readFileSync(p, 'utf8').split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const [name, re] of SECRET_PATTERNS) if (re.test(line)) hits.push(`${f}:${i + 1}: ${name}`);
    const low = line.toLowerCase();
    for (const d of deny) if (low.includes(d)) hits.push(`${f}:${i + 1}: deny-list match`);
  });
}

if (hits.length) {
  console.error(`privacy-scan FAILED (${hits.length}); matched text is deliberately not printed:`);
  for (const h of hits) console.error('  ' + h);
  process.exit(1);
}
console.log(`privacy-scan OK: ${files.length} tracked files, ${SECRET_PATTERNS.length} patterns, ${deny.length} deny-list entries.`);
