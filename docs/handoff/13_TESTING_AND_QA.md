> **ملخص**
> كل الأوامر شُغّلت فعلًا في 2026-10-24 على Node 22.22.2 وعلى الشجرة النهائية (`main` @ `ed0df23` + فرع التسليم): tsc نظيف، وvitest نجح 726 اختبارًا في 63 ملفًا، والبناء نجح (650 وحدة)، وفحص الخصوصية نظيف، وسكربتات e2e الخمسة نجحت (القفل وإغلاق القفل القسري أُعيد تشغيلهما بعد دمج الفحص الرابع: 71 و375) (فاتح/داكن/حركة مخفّضة حسب السكربت).
> سكربت الترحيل من Flutter فشل في شرطه المسبق (لا يوجد بناء Flutter يدعم `?seed=test` هنا) وESLint لا يعمل (حزم ناقصة)، وnpm audit فيه 9 ثغرات مفتوحة، ولم يُجرَّب شيء على iPhone حقيقي.
> فيه خريطة تغطية (أي اختبار يثبت ماذا)، وقائمة تقارير الفحص بتواريخها وأحكامها النهائية، وما يلزم يدويًا.

# 13 — Testing and QA

All results below were produced **on 2026-10-24 in this session** against branch `docs/handoff` (`main` @ `ed0df23`, which contains the gate-3 fixes, plus the handoff docs; the only source edits on the branch are two comments), unless explicitly marked as quoted from an earlier report. Numbers from the earlier draft of this file (601 tests / 58 files / 649 modules / 27, 67, 21 e2e checks) described `4fa6dcc` and are superseded.

## 1. Environment

| Item | Value |
|---|---|
| OS | Linux 6.18.44-fc-v153 x86_64 (cloud container) |
| Node / npm | v22.22.2 / 10.9.7 |
| TypeScript | 5.6.3 |
| Vite / vite-plugin-pwa | 5.4.11 / 0.21.1 |
| Vitest | 2.1.5 (`environment: 'jsdom'` 25.0.1, `globals`, `css: false`, `testTimeout: 20000`, setup `tests/setup.ts` with `asyncUtilTimeout: 5000`) |
| Playwright | 1.47.2 (module from `<integrator checkout>/node_modules/playwright/index.mjs`; `node_modules` of the worktree is a symlink to it) |
| Browser | Chromium 141.0.7390.37 at `/opt/pw-browsers/chromium`, `args: ['--headless=new']` |
| Viewport | 390×844, DPR 2, touch, `isMobile`, `ar-SA`, `Asia/Riyadh` |
| Time pinning | `Date` subclass via `addInitScript` (not `page.clock`, see §6) |
| Servers | static: `python3 -m http.server` on 6403 (screenshots; stopped by PID) and the Node servers embedded in each e2e script (ports 5711–5731) |

## 2. Commands run and results

| # | Command | Result |
|---|---|---|
| 1 | `npx tsc --noEmit -p tsconfig.app.json` | exit 0, no output (about 20 s) |
| 2 | `npm test` (= `vitest run`) | **63 test files passed (63), 726 tests passed (726)**, 0 failed; 101 s on the final tree (warm cache). Earlier tree (695 tests, before the gate-4 merge): 103 s warm, 141.5 s and 97.8 s on clean copies (`22_COLD_START_AUDIT.md`). stderr carries `not wrapped in act(...)` and React-Router future-flag warnings (noise; counts in §2.1) |
| 3 | `npm run build` (= `tsc -b && vite build`) | exit 0, **650 modules transformed**; PWA: `precache 139 entries (2217.50 KiB)`, `dist/sw.js` + `workbox-*.js` |
| 4 | `npm run privacy:scan` | exit 0, `privacy-scan OK: 456 tracked files, 8 patterns, 5 deny-list entries` (on the final tree; earlier in the session a run failed on 6 documentation hits that quoted deny-list literals, fixed by rewording) |
| 5 | `npm audit` | 9 findings (2 critical, 5 high, 2 moderate): `vitest`, `tinypool`, `vite`, `playwright`, `react-router-dom`, `react-router`, `@remix-run/router`, `@vitest/mocker`, and one more moderate; **not assessed or fixed** (LOS-033, `17_SECURITY_AND_LIMITATIONS.md` §9). `npm ci` prints the same count |
| 6 | `npx eslint .` | **FAILED to run** (earlier in this session): `Cannot find package '@eslint/js' imported from eslint.config.js`. `eslint` and its plugins are not in `devDependencies`; there is no `lint` script (LOS-037). Not re-run |
| 7 | `node docs/handoff/tools/scan-asset-refs.mjs` | 341 files, 1651 references, 0 broken, 0 unreferenced assets (run on the clean clone, 22 §2; 09 §3) |
| 8 | `node docs/handoff/tools/check-docs.mjs` | doc link / path / count checker, result in `22_COLD_START_AUDIT.md` §4 |
| 9 | `tests/e2e/toastClearance.e2e.mjs` (light) | **ALL PASSED, 28 checks** |
| 10 | same with `DARK=1 REDUCED=1` | **ALL PASSED, 28 checks** |
| 11 | `tests/e2e/lockProfiles.e2e.mjs` (light) | **ALL PASS, 71 checks** (re-run on `ed0df23`; dark below ran on the earlier tree) |
| 12 | same with `DARK=1` | **ALL PASS, 71 checks** |
| 13 | `tests/e2e/streakRemindersLogo.e2e.mjs` (light) | **ALL PASS, 34 checks** |
| 14 | same with `DARK=1` | **ALL PASS, 34 checks** |
| 15 | `tests/e2e/lockKill.e2e.mjs` (re-run on the `ed0df23` tree) | **ALL PASS, 375 checks, 0 FAIL**: enable-lock kills at 150/600/2000/6000 ms; turn-off and delete kills at 100/300/600/1500/3000/8000 ms, each with a small and an owner-shaped synthetic profile, three restarts after every kill; zero data loss, no ghost or orphan profile (it did not test the 190 to 220 ms orphan-plain-DB leftover, LOS-040). Earlier tree (`2b7a096`): 25 checks |
| 16 | `tests/e2e/bidiGlyphOrder.e2e.mjs` | **ALL PASSED, 21 checks** (rendered glyph order of mixed Arabic/Latin/number runs) |
| 17 | `tests/e2e/legacyMigration.e2e.mjs` with `FLUTTER_DIR=<local Flutter web build>` | **FAILED at its precondition**: `old app created no data` — the only Flutter web builds on this machine (dated 2026-10-02) predate the `?onboarded=1&seed=test` demo flags and no Flutter SDK is installed to rebuild. **Environment gap, not a migration regression**; the migration logic is covered by 21 vitest tests (§4). Not re-run after the earlier attempt |
| 18 | `tests/e2e/sw-takeover/*` (manual harness: three Flutter/React folders and `server.py`) | **NOT RUN**. Its README records a manual result of 2026-10-24 (three scenarios load the React app on first launch, 30 legacy `wlo_*` databases kept, no Flutter cache left) — quoted, not re-verified |

How the e2e scripts were run (they need a production build served at `/wejdan-os/`): `PLAYWRIGHT_MODULE=<…/playwright/index.mjs> REACT_DIR=<copy of dist>/wejdan-os SHOTS=<dir> node tests/e2e/<name>.e2e.mjs` (each script serves `REACT_DIR` itself on its own port; `REACT_DIR` defaults to `./dist`). Optional env: `DARK=1`, `REDUCED=1`, `LABEL`, `PORT`, `CHROMIUM`, `REPORT_ONLY=1` (toast script). None of the e2e scripts is wired into `package.json` scripts or CI (there is no CI configuration in the repo).

Screenshots for the handoff: `docs/handoff/screenshots/` holds 29 PNGs at 390x844 (numbered 01 to 83; 01 to 72 from the earlier capture run of `docs/handoff/tools/capture-screens.mjs` on an older build of the same UI, 80 to 83 from the lock/reminder e2e runs). **They are documentation, not baselines**, and 01 to 72 were not re-captured after the gate-3 UI fixes.

### 2.1 Warning counts in `npm test`

On the cold-start run (`npm test`, 141.5 s): 40 lines matching `not wrapped in act(...)` and 40 lines matching `React Router Future Flag Warning` (counted with `grep -c` on the saved log). They are warnings from existing tests, not failures; nothing gates on them.

## 3. Test inventory (vitest, 63 files / 726 tests)

| Area | Files (tests) |
|---|---|
| `tests/domain` (engine, store, storage, vault) | area2Routine (4) · area5 (8) · areaOneFixes (6) · backupReminder (4) · dayPlanner (36) · fixPasses (21) · flexibleStreak (18) · gardenPass (3) · ics (9) · inAppReminders (10) · integrationPass (6) · legacyMigration (12) · legacyReoffer (3) · n2n5Selectors (7) · notesSearchSources (16) · paydayCycle (9) · personalLibrary (4) · qaArea3 (7) · qaFixesF1 (9) · remindersCapacity (18) · repository (11) · resting (6) · sparksRecovery (13) · store (34) · strengthMomentum (12) · ui2Qa (39) · vaultBackup (1) · vaultCrypto (12) · vaultDurability (75) · vaultMigration (6) · vaultPolicy (8) · vaultPrivateKeys (5) |
| `tests/migration` | flutterExport (6) |
| `tests/ui/today` | areaOneUi (14) · bidiF1 (4) · bidiG3 (37) · today (14) · todayF1 (3) |
| `tests/ui/habits` | area2 (11) · garden (7) · habits (14) |
| `tests/ui/path` | path (9) · qaArea3 (8) |
| `tests/ui/joy`, `money`, `me`, `notes`, `sources` | joy (11) · area4 (20) · area5 (17) + me (6) · notes (8) · sources (8) |
| `tests/ui/lock`, `pwa`, `state`, `a11y` | calmErrors (3) + deviceKeys (3) + lockModalAndErrors (4) + lockUi (9) · legacyCleanup (5) · area6 (12) + tabGate (2) · a11y (7) |
| `tests/ui` (root) | integrationKit (2) · kit (8) · n2n5 (9) · qa-f2 (4) · streakReminders (24) · toastPlacement (5) |

## 4. Coverage map — which test proves what

| Concern | Evidence (file → what it asserts) | Gap |
|---|---|---|
| **Accessibility** | `tests/ui/a11y/a11y.test.tsx` (7): sheet makes the page behind `inert`, has a named close button, traps Tab, Escape closes only the top sheet, toast region stays reachable; `ErrorBoundary` calm recovery + reset on route change; pushed screen gets focus on its title, covered screen hidden, focus returns on back; leaving the routine player never blanks the app. `tests/ui/toastPlacement.test.tsx` (5): toast `aria-live=polite`, 44 pt «تراجع», never over live tabs. e2e `toastClearance` (28): toast box intersects no control on Today/4 tabs/Brief; tab tap during toast navigates and does not undo | **No axe-core in the repo.** The axe runs (30 routes, light/dark) quoted in the QA reports were external scripts and were **not re-run now**. Colour contrast was recomputed for the token pairs only (07 §2.5). Text at 150%/200% not re-run |
| **RTL / bidi** | `tests/ui/today/bidiF1.test.ts` (4) and `bidiG3.test.ts` (37: Unicode bidi isolation of names/numbers, gate-3 D5) plus e2e `bidiGlyphOrder` (21: rendered glyph order): thousands separators stay in one LTR run (`1,000`, `8,000-10,000`), trailing comma not swallowed, `isolate()`, Arabic count agreement; `tests/ui/lock/lockUi.test.tsx`: usernames LTR in `<bdi>`; `tests/domain/ui2Qa.test.ts` (39) and `qaFixesF1.test.ts` (9) cover amount/range/toast bidi regressions (by their QA naming; not individually re-read) | no visual RTL regression test (no screenshot diff); iOS Safari bidi not tested |
| **Console cleanliness** | the earlier capture runs (36 routes per theme, older build) listened to `pageerror` and `console.error`: 0; not repeated on the final build | **No automated gate**: vitest/e2e scripts do not fail on console errors (only `legacyMigration.e2e.mjs` records `pageerror`); the capture script is a manual check |
| **Persistence (reload / reopen)** | `tests/domain/repository.test.ts` (export → delete-all → import restores, backups keep last 5), `store.test.ts` (34), `tests/ui/state/area6.test.tsx` (12): typed note autosaves and flushes on hide, focus session and weekly-review draft and onboarding draft survive reload, failed chunk retry; e2e `lockProfiles` (data intact after reload/unlock/profile switch/recovery); e2e `streakRemindersLogo` (settings saved) | IndexedDB eviction on iOS not testable here |
| **Offline** | e2e `lockProfiles` §9: service worker controls the page, offline reload renders the lock screen both locked and unlocked, unlock works offline with data intact, precache holds only static entries (139 in the current build) and **no** password/recovery code/username in any cached response, cache holds only static asset URLs; `tests/ui/pwa/legacyCleanup.test.ts` (5) | The earlier "all 5 tabs and 22 pushed routes render offline" came from QA area 6 (quoted), not re-run; update-prompt flow not covered by an automated test |
| **Lock / crypto** | `vaultCrypto` (12: ≥310k PBKDF2 iterations recorded, non-extractable data key, no secrets in envelope, recovery unlocks same key, change password re-wraps only, tamper detection incl. moving a sealed row), `vaultPolicy` (8: auto-lock timing, 30 s/60 s/2 m/5 m delays), `vaultMigration` (6: counts identical before/after, ciphertext at rest, failed copy leaves plain DB, turn off decrypts back, profile isolation), `vaultBackup` (1), `vaultDurability` (44: injected crashes at every migration step, registry compare-and-set, recovery from headers, quarantine, rollback finalisation), `vaultPrivateKeys` (5), `lockUi` (9), `calmErrors` (3), `lockModalAndErrors` (4); e2e `lockKill` (25: page killed mid-operation and reopened, data intact) and `lockProfiles` (71 checks incl. ciphertext on 174/174 rows, no readable field names, wrong-username message identical, 5th failure delay survives reload, privacy cover on hide, encrypted export file) | real browser storage edge cases (private mode, quota) |
| **Reminders / `.ics`** | `inAppReminders` (10), `remindersCapacity` (18), `ics` (9, parsed with `ical.js`), `streakReminders.test.tsx` (24); e2e `streakRemindersLogo` (34: banner in the page flow and never over a control, position, `.ics` has VCALENDAR, TZID, RRULE, VALARM, no Notification permission prompt) | **iOS Calendar import / UID update behaviour untested (needs a device)** |
| **Flexible streak / momentum** | `flexibleStreak` (18), `strengthMomentum` (12), `streakReminders` (WeekDots, StreakHero, Habits list chip, Settings switch) | week-start assumption (Sunday vs locale) not separately asserted |
| **Day planner** | `dayPlanner` (36), `areaOneFixes`, `qaArea3` (rest domains, driving plan on Today, idempotent add) | — |
| **Money / payday** | `paydayCycle` (9), `tests/ui/money/area4.test.tsx` (20) | — |
| **Migration from Flutter** | `legacyMigration` (12), `legacyReoffer` (3), `flutterExport` (6, fixture `tests/fixtures/migration/*`); e2e `legacyMigration.e2e.mjs` (needs a Flutter build — not run, §2 #17) | end-to-end same-origin takeover not re-run now |
| **Privacy of the public bundle** | `personalLibrary.test.ts` (4: "public library privacy guard — ships no personal fields, places, career targets or women's-health actions"), `repository.test.ts` ("no personal data: no habits, goals, joy, money; generic products") | only guards fields it knows; free-text scan of the two JSON files was done once now (name/city/`priority_for_her` → 0 matches) |
| **Routing / shell** | `tabGate.test.tsx` (2), `a11y` navigation tests, `kit.test.tsx` (8), `integrationKit.test.tsx` (2) | no test enumerates `routes.tsx`; deep-link behaviour came from QA (quoted) |

## 5. What could not run / was not run

* **ESLint** — dependency missing (§2 #6). TypeScript strictness is the only static gate (`tsc -b`).
* **iOS device, iOS Simulator, Xcode** — none available; owner also chose not to test in Xcode. Everything is Chromium emulation.
* **Real software keyboard** — only a 480 px viewport shrink was ever used (release-gate-2, quoted).
* **`tests/e2e/legacyMigration.e2e.mjs`** — needs a Flutter web build with demo-seed flags (not available).
* **`tests/e2e/sw-takeover`** — manual harness, not run.
* **axe-core, Lighthouse, WebPageTest, bundle-size budget** — not in the repo; not run now.
* **Coverage report** — no `@vitest/coverage-*` provider installed; there is no coverage number.
* **`npm run brand:assets`** — not run (it would rewrite `public/` binaries).
* **Visual regression** — none exists; screenshots in `docs/handoff/screenshots` are documentation, not baselines.

## 6. Tooling notes that affect new tests

* **Playwright 1.47.2 has `page.clock`** (verified: `typeof page.clock === 'object'`). The earlier belief that 1.47 lacks it is wrong. However `page.clock.setFixedTime` also freezes `performance.now`, which stops framer-motion so toasts/heroes stay at opacity 0 (QA area 4 harness note, 2026-10-24). All repo e2e scripts and the capture script therefore pin "now" with a `Date` subclass (`addInitScript`) that lets time flow. Use that pattern, or `page.clock.install()` + `runFor`, but not `setFixedTime`.
* Service worker is blocked (`serviceWorkers: 'block'`) in the capture/streak/toast runs and enabled only where offline behaviour is the subject (`lockProfiles`).
* `vitest` UI tests wait up to 5 s for lazy screens; on a loaded machine the full run took 203 s. A single-file run is the practical loop (`npx vitest run tests/ui/habits`).
* Test data in e2e/QA is always named `test` (owner rule).

## 7. QA and review reports — dates and final verdicts

These live in the owner's private scratchpad (local-only, not in the repo, not published; names only). Dates are file modification times (UTC, 2026-10-23/24) unless the file states otherwise. "Verdict" = the report's own stated outcome. They audited **frozen earlier builds**; later fixes are evidenced by regression tests named after the findings (§4), not by re-audit.

| Report (file) | Date | Scope | Stated outcome |
|---|---|---|---|
| `audit/audit-report.md` | 2026-10-23 21:33 | Combined UX-heuristics / Arabic UX / design-system audit of the **Flutter** build (requirements for the rebuild) | 10 core requirements for the React rebuild; changes nothing |
| `qa/qa-report.md` | 2026-10-23 23:04 | Independent QA of the first React build (`vite preview`, 2 profiles, pinned clocks) | **32 defects: 1 blocker, 14 major, 17 minor** (ledger: all fixed) |
| `review/a11y-report.md` | 2026-10-23 23:58 | Accessibility review R2: axe-core 4.10 ×3 sweeps, focus/dialog/touch/200 % probes, token contrast | **18 defects: 8 major, 6 moderate, 4 minor** (ledger: all fixed, axe clean) |
| `review/copy-report.md` | 2026-10-23 23:41 | Arabic copy review, 1,717 strings / 1,301 unique | tone consistent and guilt-free; issues in 5 categories (terminology, jargon, count agreement, range direction, leftover formal Arabic); ledger: 65 fixes applied |
| `review/perf-report.md` | 2026-10-23 23:46 | Performance R4 (4× CPU throttle, 60 habits / 900 logs) | report only; recommendations (memoised roots, `useLifeSelector`); ledger: tab switch 4,863 → 593 re-renders |
| `review/privacy-report.md` | 2026-10-24 (file dated; mtime 23:46) | Public repo `main`, `_transfer/`, both `gh-pages` commits | **CRITICAL**: live access tokens committed in a file under the old public `main` branch's `ops/` folder; HIGH: personal tailoring in published library files (main + gh-pages history) — report only; see 17 |
| `qa-final/area1-today.md` | 2026-10-24 01:06 | Onboarding, Today, Brief, Evening, Focus, Quick add, Search | 0 blocker · 4 major · 13 minor |
| `qa-final/area2-habits.md` | 2026-10-24 05:34 | Habits, Garden, Routines, Products, Studio | 18 defect entries by HIGH/MEDIUM/LOW ( first two HIGH: placeholder products shown as her routine; achievement star on an all-skipped routine) |
| `qa-final/area3-path.md` | 2026-10-24 01:12 | Path, Project, IELTS, Driving | 21 defects (first four HIGH) |
| `qa-final/area4-joy-money.md` | 2026-10-24 00:52 | Joy, Rewards, Money | 20 defects (first three HIGH) |
| `qa-final/area5-me.md` | 2026-10-24 01:02 | Me, Inbox, Notes, Search, Sources, Change log, Review, Settings, Help… | HIGH / MEDIUM / LOW groups; console clean |
| `qa-final/area6-cross.md` | 2026-10-24 01:07 | Persistence, offline, a11y (axe on 30 routes), error boundary, privacy grep | persistence/offline/error boundary **Pass**; a11y "mostly pass"; D1 (High) stranded Flutter data after «بعدين», D2/D5/D6 Medium, D3/D4 Low |
| `qa-final/area7-design.md` | 2026-10-24 00:59 | App vs approved boards (visual) | per-screen polish scores 1–5, "five most impactful fixes"; ledger: board-faithful fixes merged (`fix/design`) |
| `qa-final/release-gate.md` | 2026-10-24 07:25 (main `e98f52b`) | Release gate 1 | **HOLD** — one Major: docked toast covered the tab bar (N1) |
| `qa-final/release-gate-2.md` | 2026-10-24 08:12 (main `cb8a2f8`) | Re-gate after N1–N5 fixes | **SHIP** — no Major; N1–N5 fixed; 1 Minor (D1 routine-player buttons vs toast; fixed afterwards in `0fa7aa6`, no re-audit) + 2 Polish; "Not run": real iOS, real keyboard, text scale 1.5/2.0, contrast measurement |
| Release gate 3 (report is local-only; file name not recorded in the repo) | 2026-10-24 (after the lock/streak/reminder/W commits) | Gate 3 on the merged tree | Defects **D1 to D9** (durability / data loss, in-flow reminder banner, versioned registry, quarantine, Unicode bidi, Arabic avatar names, modal setup, calm lock errors, copy); all fixed in `0738f6f` and `c257441` with tests (`14_BUGS_AND_TECH_DEBT.md` §1.1). The report file itself was not re-read for this package, so the exact severity split is **NOT VERIFIED** here |
| Release gate 4 (report `release-gate-4.md`, local-only, PER-REPORT) | 2026-10-24 (on the gate-3-fixed tree) | Independent gate | **HOLD**: N1 major (SIGKILL after turning the lock off lost data), N2 ghost profile after a killed delete, N3 orphan `migrating` database, N4/N5 polish. Fixed in `eed6603` (merged `ed0df23`) with 31 new vault tests and an extended `lockKill` e2e |
| Release gate 5 (report `release-gate-5.md`, local-only, PER-REPORT) | 2026-10-24 (on `ed0df23`) | Independent gate on the fixed tree | **SHIP** with two open minors: M1 plaintext `_bak_` / orphan plain DB after a kill 190 to 220 ms into turn-off has no cleanup (LOS-040); M2 missing-data screen is a dead end (LOS-041). The author of this package did not read the report; the details are as relayed by the integrator |
| `audit/promised-vs-done.md` | 2026-10-24 08:56 | Inventory of what was promised vs done (main `0fa7aa6`) | 90 items: 58 done & verified · 2 done-not-visible · 8 partial · 5 missing · 4 deferred by owner · 2 left by decision · 2 owner's · 9 not verified (written before the lock/profile/streak/reminders/W commits landed, so its "missing" rows for lock, profiles, `.ics`, in-app reminders are now **stale**) |
| `tests/e2e/sw-takeover/README.md` (in repo) | 2026-10-24 | Flutter → React takeover | 3 scenarios pass (quoted) |

Note: the headers of `audit-report`, `a11y-report`, `privacy-report` say 2026-10-24 while their file times are the evening of 2026-10-23 UTC (timezone offset: Riyadh is UTC+3).

**Gap after the last independent gate (release-gate-2, main `cb8a2f8`):** commits `0fa7aa6` (player buttons above toast), `5629f51` (app lock + profiles), `50643eb` (flexible streak, in-app reminders + `.ics`, real W) and merge `4fa6dcc` were later covered by release gate 3 (defects D1 to D9, fixed in `0738f6f` and `c257441`), gate 4 (HOLD; fixed in `eed6603`) and gate 5 (independent, SHIP with two minors) — see the rows above. Text scale, contrast and design-board comparison on the final tree are still NOT VERIFIED (LOS-002).

## 8. Release-readiness evidence today (what a successor can rely on)

* Types: clean. Unit/UI/integration: 726/726. Build: green. `privacy:scan`: clean. e2e (lock, lock kill-and-reopen, toast, streak/reminders, bidi): all green (light and dark where the script supports it; toast also in dark with reduced motion).
* Public-bundle privacy guards: tests green; neutral JSON scan clean; secrets scan of this tree clean.

## 9. Manual verification still required (cannot be done in this environment)

1. Install to Home Screen on a real iPhone (iOS 17/18): standalone display, safe-area insets, status bar style switching with theme, splash images per device size, `viewport-fit=cover`.
2. Real software keyboard behaviour on Quick-add, notes editor, lock forms, money amounts (Arabic-Indic digit entry via the Arabic keyboard).
3. Dynamic Type 150 %/200 % and Bold Text on every screen (last measured in the a11y review; not repeated).
4. VoiceOver walk-through (Arabic voice; `lang="en"` islands; sheet/inert behaviour; `role="alert"` banner).
5. Calendar import of the `.ics` (alarms fire, UID update on re-import, quiet hours not applied).
6. Offline cold start after the first install on iOS and persistent-storage grant (`navigator.storage.persist`).
7. Update flow: deploy a new build, confirm «فيه تحديث جديد — حدّثي» appears and applies without data loss.
8. Flutter → React takeover with a real old install (the e2e needs a seeded Flutter build).
9. Contrast over gradient/glass surfaces (Weekly review cover, Morning brief, Joy hero, glass nav/tab bars).
10. Performance on a real mid-range iPhone (the perf report used 4× CPU throttle in software-rendered Chromium).
11. Check the Help screen emergency/health-line numbers against official sources (copied from the old build; not verified now).
