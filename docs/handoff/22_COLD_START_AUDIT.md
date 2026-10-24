# 22 — Cold-Start Audit

> **ملخص**
> جرّبنا نمشي على `CODEX_START_HERE.md` حرفيًا كأننا ما نعرف المشروع: نسخة نظيفة من git، بدون `node_modules`. كل الأوامر نجحت: التثبيت، tsc، 695 اختبار على تلك الشجرة، البناء، فحص الخصوصية، وخادم التطوير يرد على `/wejdan-os/`.
> لقينا ونصلّحنا: (1) فحص الخصوصية يحتاج مستودع git ويفشل في نسخة بدون `.git`؛ (2) ست إشارات في الوثائق لملفات غير موجودة أو روابط ناقصة؛ (3) أرقام قديمة. بعد التصليح فاحص الوثائق نظيف إلا ملف التدقيق هذا نفسه (ينكتب بعد الفحص).
> حدود: ما جرّبنا تنفيذ e2e من الصفر هنا، وما جرّبنا أي جهاز حقيقي.

Date: 2026-10-24. Auditor: the handoff author, acting as an engineer who has never seen the project.

## 1. Method

1. Committed the handoff branch (`docs/handoff`), then `git clone` it into an empty folder (no `node_modules`, no `dist`).
2. Followed `CODEX_START_HERE.md` §5 command by command, plus `README.md` quick start.
3. Ran the link / path / count checker (`docs/handoff/tools/check-docs.mjs`) and the asset reference scan.
4. Before that, a first attempt used a plain file copy of the tracked tree (no `.git`) to model "unzipped archive"; it produced finding F1.

Environment: Linux x86_64 container, Node v22.22.2, npm 10.9.7, no network restrictions beyond the proxy; Chromium not needed for these steps.

## 2. Command results on the clean clone

| Step | Command | Result |
|---|---|---|
| 1 | `npm ci` | exit 0, 474 packages added, about 5 s (12 s on the first, uncached run); deprecation warnings (`whatwg-encoding`, `glob@11.1.0`); **9 vulnerabilities (2 moderate, 5 high, 2 critical)** reported |
| 2 | `npx tsc --noEmit -p tsconfig.app.json` | exit 0, about 14 s |
| 3 | `npm test` | **63 files passed, 695 tests passed** (tree at `2b7a096` + handoff docs), duration 97.8 s (141.5 s on the first plain-copy run); stderr: 40 `not wrapped in act(...)` and 40 React Router future-flag warning lines |
| 4 | `npm run build` | exit 0; **650 modules transformed**; `precache 139 entries (2217.50 KiB)` |
| 5 | `npm run privacy:scan` | exit 0 (`privacy-scan OK`; 453 files at that commit, 456 on the final tree) |
| 6 | `node docs/handoff/tools/scan-asset-refs.mjs` | 341 files, 1651 references, 0 broken, no unreferenced assets |
| 7 | `npx vite --port 5199 --strictPort` then `curl /wejdan-os/` | HTTP 200, page has `lang="ar" dir="rtl"`; `curl /` returns 302 (redirect to the base path), which is why the docs say to open the base path |
| 8 | `npx vite preview --port 4199` then `curl /wejdan-os/` and `/wejdan-os/sw.js` | both HTTP 200 |
| 9 | `node docs/handoff/tools/check-docs.mjs` | 2 problems on this run, both caused by the not-yet-written `22_COLD_START_AUDIT.md`; see §4 for the final run |

Matches the expectations in `CODEX_START_HERE.md` §5 as they were at that time (63 / 695 / 650 / 139 entries). **Addendum after the gate-4 merge (`ed0df23`, 2026-10-24):** the expectations were updated to 63 files / 726 tests and precache 2217.50 KiB. Re-run on the merged working tree (not a fresh clone): `npx tsc --noEmit -p tsconfig.app.json` exit 0; `npm test` 63 files / 726 tests passed in 101 s (40 `act` + 40 router warning lines, unchanged); `npm run build` exit 0, 650 modules, precache 139 entries (2217.50 KiB). A full fresh-clone repeat was not done for this addendum; the commands and the steps in `CODEX_START_HERE.md` §5 did not change. New open items found since: LOS-040, LOS-041 (gate-5 minors, `18_REMAINING_BACKLOG.md`).

## 3. Findings and fixes

| ID | Finding | Fix |
|---|---|---|
| F1 | `npm run privacy:scan` fails with `fatal: not a git repository` in a copy without `.git` (the scanner reads `git ls-files`). A successor who downloads a zip would think the project is broken | `CODEX_START_HERE.md` §5 and `README.md` now say a git checkout is required |
| F2 | Docs pointed at a non-existent Python generator under `src/pwa/` as if current; `index.html` comment said the same | `index.html` comment now names `scripts/brand/generate-brand-assets.mjs`; 04 and 09 updated |
| F3 | `14_BUGS_AND_TECH_DEBT.md` named a not-yet-existing shared date helper as if it were a file | reworded as "to be created" |
| F4 | `03` quoted a file path with a comma-separated line list glued on (not a valid path) | rewritten as "lines 114, 385, 423" |
| F5 | `06` and `17` named the optional local deny-list file as if it were in the repo (it is git-ignored and local) | reworded |
| F6 | `18` and `20` referred to files by shorthand (a number only, a path without its extension) | full names |
| F7 | Test counts, build module count, precache size, e2e check counts and the asset-scan numbers in 01, 09, 10, 13 were from before the gate-3 fixes | updated to the runs in this audit |
| F8 | Several docs cited the owner's private scratchpad and one private ops path | scratchpad mentions are labelled "local-only report (not in repo)"; the ops path is no longer named |
| F9 | The README lint note: `npm run lint` does not exist | README, CODEX_START_HERE and AGENTS say so |

Not a finding but worth knowing: `npm ci` output includes the 9 audit findings; the docs call that out so nobody mistakes it for a broken install.

## 4. Link, path and count checker (final run)

`node docs/handoff/tools/check-docs.mjs` checks (a) every relative markdown link in README, AGENTS, CODEX_START_HERE and `docs/handoff/*.md`, (b) every backticked repository path (src, tests, docs, scripts, public, root config files) mentioned in them, (c) test-file and dependency counts against the tree. Wildcard or placeholder tokens, build output and paths that are explicitly outside the repository are skipped by design (listed at the top of the script).

Final run on the working tree after all fixes (26 documents, 31 relative links, 660 backticked paths checked): **`docs check: OK`, exit 0**. Count lines printed: 63 test files (32 / 30 / 1), 10 dependencies, 17 devDependencies.

Counts verified against the tree: 63 test files (32 domain, 30 ui, 1 migration); 10 dependencies and 17 devDependencies; 270 tracked files under `src/` of which 203 are `.ts`/`.tsx` (33,376 lines; 11,723 in `src/domain`); 456 tracked files at the final commit.

## 5. What this audit did not cover

- e2e scripts were not run from the clean clone (they need a built `dist`, Playwright and Chromium); their results are in `13_TESTING_AND_QA.md` §2 from the working tree.
- No real browser session with the dev server (only HTTP checks); no real device.
- Windows and macOS were not tried; paths in the scripts are POSIX style and e2e needs a Chromium path (`CHROMIUM` env).
- The pushed GitHub tree does not exist yet; repeat §2 on the real clone after the push (`21_FINAL_HANDOFF_REPORT.md` §2).

## 6. Public-safety checks over the documentation (final tree)

| Check | How | Result |
|---|---|---|
| Repository privacy scanner | `npm run privacy:scan` on the final tree | OK, 456 tracked files, 8 patterns, 5 deny-list entries |
| E-mail addresses in docs, README, AGENTS, CODEX_START_HERE | `grep -rnE` for address shapes | none |
| Token or key shapes (GitHub, AWS, Google, JWT, PEM) | `grep -rnEi` | none |
| Phone-number shapes | `grep -rnE` for +966 / 05 prefixes | none |
| Private file names (every literal in the scanner's deny-list plus the old personal export file name) | `grep -rniE` | none in prose; the words `_transfer` appear only to describe the old public repo's exposure (file name, no content) |
| Health or medical specifics | `grep -rniE` for medical terms | only generic mentions of the optional, off-by-default women's-health module and the rule never to enable or add such content; one decision row generalised (D-55) |
| Screenshot metadata | script over all 29 PNGs | only structural chunks (IHDR, IDAT, IEND, and similar); no text or EXIF chunks |
| Absolute personal paths | `grep` for the owner's home folders | none; the build environment's `/opt/pw-browsers/chromium` is named as an environment fact |

No secret values were printed during any of these checks.
