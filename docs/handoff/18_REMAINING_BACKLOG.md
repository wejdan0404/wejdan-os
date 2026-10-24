# 18 — Remaining Backlog

> **ملخص**
> هنا كل شي باقي بمعرّفات ثابتة LOS-001 وما بعدها، مقسوم إلى «مطلوب» (REQUIRED) و«اختياري» (OPTIONAL) وبنود تخص المالكة وحدها، مع قسم جديد «DONE» يوثّق بنود الفحص الثالث (gate 3) المنجزة مع الدليل.
> أهم المطلوب: النشر العام كنسخة نظيفة واحدة (snapshot) بعد تشغيل `npm run privacy:scan`، وجولة فحص نهائية (نص 1.5/2.0، التباين، مطابقة اللوحات، شاشات القفل/الستريك/التذكيرات)، ورفع/ترقية اعتماديات npm.
> فحوصات الجهاز الحقيقي مؤجلة منها نهائيًا، فتُسجَّل `DEFERRED-BY-OWNER` ولا تُحسب نقصًا. قرارات تنتظر موافقتها: الستريك المرن الافتراضي، لون زر الحذف/إيقاف القفل.

## How to use

- **Status** values: `OPEN`, `BLOCKED-ON-OWNER`, `DEFERRED-BY-OWNER`, `OPEN-UNVERIFIED` (maybe already fixed; check first), `DONE` (with evidence).
- **Priority:** P1 (do first), P2, P3, P4. No item here is a confirmed data-loss defect in the current code (the one that was, G3-D1, is DONE below); severity labels are deliberately not escalated beyond what evidence shows.
- **Effort** is a rough range for a coding agent with the repo already set up (hours of agent work, excluding waiting for the owner).
- Paths are in this repo. Paths starting with `scratchpad:` are local-only session reports (not in the repo, may not exist for you). Requirement IDs (`R-xxx`) are from `03_REQUIREMENTS_TRACEABILITY.md`.
- Do not redo finished work: items below are the **only** open items known. Everything else in `03` marked DONE needs no change unless an item here says so.
- IDs LOS-032…046 are new in this revision (LOS-040/041 come from release gate 5; LOS-042/043 from gate 7; LOS-044 to 046 from the missing-features wave review). LOS-028/029 are intentionally unused.

## Summary table

| ID | Title | Class | Priority | Status | Owner approval needed |
|---|---|---|---|---|---|
| LOS-001 | Publish: clean single-snapshot push (`react-app`) and, separately, the live site | REQUIRED | P1 | BLOCKED-ON-OWNER | Yes (each publish) |
| LOS-002 | Final regression gate on the merged tree (after gate-3 fixes) | REQUIRED | P1 | OPEN | No |
| LOS-003 | Stabilise the load-flaky routine-player test | REQUIRED | P2 | OPEN-UNVERIFIED (passed in both full runs of this revision) | No |
| LOS-004 | Quick-add Save vs keyboard (gate-2 P2) | OPTIONAL | P2 | OPEN (device part DEFERRED-BY-OWNER) | No |
| LOS-005 | Visually verify routine-player buttons above toast (D1) | REQUIRED | P2 | OPEN-UNVERIFIED | No |
| LOS-006 | Text scale 1.5 and 2.0 on the final build | REQUIRED | P2 | OPEN | No |
| LOS-007 | Contrast measurement on the final build | REQUIRED | P2 | OPEN | No |
| LOS-008 | Design-fidelity re-compare after fixes and new screens | REQUIRED | P2 | OPEN | No |
| LOS-009 | Repeatable e2e command (and optional CI) | OPTIONAL | P3 | OPEN | Yes if adding `.github/` |
| LOS-010 | Her real routine and products (private import) | REQUIRED for her use | P2 | BLOCKED-ON-OWNER | Yes (data) |
| LOS-011 | Confirm delivery of her private library file and the guide | OPTIONAL | P3 | OPEN-UNVERIFIED | Owner action |
| LOS-012 | Design-first gap: boards for lock/profiles, streak, reminders, backup nudge, W | REQUIRED | P2 | OPEN-UNVERIFIED | No |
| LOS-013 | Star rule audit (achievement/evidence only, max 3 per screen) | OPTIONAL | P3 | OPEN-UNVERIFIED | No |
| LOS-014 | Tab-bar icon decision (cup/plant vs star/leaf) | OPTIONAL | P3 | BLOCKED-ON-OWNER | Yes (design decision) |
| LOS-015 | Flexible streak default ON — awaiting owner approval; day-counter wording | OPTIONAL | P3 | BLOCKED-ON-OWNER | Yes (product decision) |
| LOS-016 | First load on slow 4G (≈4 s vs 3 s target) | OPTIONAL | P3 | OPEN | No |
| LOS-017 | Escape closes pushed screens | OPTIONAL | P4 | OPEN | No |
| LOS-018 | Locale polish: unify terms, update-prompt wording | OPTIONAL | P3 | OPEN-UNVERIFIED | No |
| LOS-019 | Update prompt tappable while a sheet is open (area-6 D4) | OPTIONAL | P3 | OPEN-UNVERIFIED | No |
| LOS-020 | Thmanyah licence for a future native iOS app | OPTIONAL | P4 | BLOCKED-ON-OWNER | Yes |
| LOS-021 | Retire the Flutter takeover shims | OPTIONAL | P4 | OPEN (time-gated) | Yes |
| LOS-022 | W placeholders on the old design boards | OPTIONAL | P3 | OPEN-UNVERIFIED | Owner/design |
| LOS-023 | Lock: document limits in-app, and recovery-code UX check | OPTIONAL | P3 | OPEN | No |
| LOS-024 | Two open windows do not live-sync their DATA (registry is synced) | OPTIONAL | P4 | OPEN (registry part DONE in gate 3) | No |
| LOS-025 | Real-device checks (.ics share sheet, icon/splash, status bar, keyboard) | — | — | DEFERRED-BY-OWNER | n/a |
| LOS-026 | Privacy scan script before every publish | — | — | **DONE** (`npm run privacy:scan`); remaining: run it on `dist` too | No |
| LOS-027 | Replace the Vite template README | — | — | **DONE** (`README.md`) | No |
| LOS-032 | Disclose / shorten the plaintext rollback window after enabling the lock | REQUIRED | P2 | OPEN | No (copy) / Yes (if behaviour changes) |
| LOS-033 | `npm audit`: 9 findings (3 in the runtime `react-router*` chain) | REQUIRED | P2 | OPEN | No (patch upgrades) / Yes (majors) |
| LOS-034 | Record ids are semantic and readable with the lock on | OPTIONAL | P4 | OPEN (decision) | Yes (schema) |
| LOS-035 | Orphaned encrypted databases are never listed or cleaned | OPTIONAL | P4 | OPEN | No |
| LOS-036 | LICENSE decision and OFL font notices in the build | REQUIRED | P2 | OPEN | Yes (licence choice) |
| LOS-037 | ESLint cannot run (missing `eslint`, `@eslint/js`, …) | OPTIONAL | P3 | OPEN | No |
| LOS-038 | Personal-action-library handling with the lock OFF (plaintext key) | OPTIONAL | P3 | OPEN (decision) | Yes |
| LOS-039 | Red `--error` fill on delete-profile / turn-off-lock buttons | OPTIONAL | P3 | BLOCKED-ON-OWNER | Yes (owner call) |
| LOS-040 | Orphan plain database / `_bak_` copy has no cleanup path after a kill during turn-off (gate-5 M1) | REQUIRED | P2 | OPEN | No |
| LOS-041 | Missing-data screen is a dead end: no import or start-fresh action (gate-5 M2) | REQUIRED | P2 | OPEN | Copy review |
| LOS-042 | Review draft lost if the process dies right after turning the lock off (gate-7 M1) | OPTIONAL | P3 | OPEN | No |
| LOS-043 | Plaintext review draft stays in localStorage until first unlock after a crash during lock enable (gate-7 M2) | OPTIONAL | P3 | OPEN | No |
| LOS-044 | Hand-run e2e scripts fail at onboarding («ابدئي يومك» not found) since the onboarding gained steps | REQUIRED | P2 | OPEN (verified failing) | No |
| LOS-045 | Design-vs-build rows still not built after the wave (list inside) | OPTIONAL | P3 | OPEN (each row: not built) | Some need owner content or decision |
| LOS-046 | No change-log entries for driving / IELTS data | OPTIONAL | P3 | OPEN | No |
| LOS-030 | Rotate the two exposed tokens | OWNER-ONLY | — | BLOCKED-ON-OWNER | Owner action |
| LOS-031 | Decide on public-repo history cleanup | OWNER-ONLY | — | BLOCKED-ON-OWNER | Owner decision |

## DONE (gate 3 and handoff-branch work) — evidence

| Item | Evidence |
|---|---|
| G3-D1 durable vault migration (no data loss on kill) | `c257441`; `tests/domain/vaultDurability.test.ts` (75), `vaultMigration.test.ts` (6), `tests/e2e/lockKill.e2e.mjs`; results in `13_TESTING_AND_QA.md` |
| G3-D2 in-flow reminder banner | `0738f6f`; `streakReminders.test.tsx` (24); `streakRemindersLogo.e2e.mjs` |
| G3-D3 versioned registry + cross-tab refresh | `c257441`; `vaultDurability.test.ts` |
| G3-D4 quarantine of undecryptable rows + unreadable-profile screen | `c257441`; `vaultDurability.test.ts`, `lockModalAndErrors.test.tsx` |
| G3-D5 Unicode-aware Bidi | `0738f6f`; `bidiG3.test.ts` (37), `bidiGlyphOrder.e2e.mjs` |
| G3-D6 Arabic avatar names | `0738f6f`; `lockProfiles.e2e.mjs` |
| G3-D7 modal lock setup | `c257441`; `lockModalAndErrors.test.tsx` (4) |
| G3-D8 calm lock errors | `0738f6f`; `calmErrors.test.tsx` (3) |
| G4-N1 SIGKILL after turn-lock-off lost data (major) | `eed6603` (merged `ed0df23`): durable IndexedDB markers (`retired` / `deleted` / `migrating`) written before every destructive step; the encrypted DB is kept and removed by the next launch's `recover()` only if the plain DB still holds her data; `tests/domain/vaultDurability.test.ts` (75), `tests/e2e/lockKill.e2e.mjs` (kills turn-off and delete at 100/300/600/1500/3000/8000 ms, small and owner-shaped synthetic profile; results are PER-REPORT gate 4/5, not re-run in this revision) |
| G4-N2 ghost profile after a killed delete | `eed6603`: mandatory `deleted` tombstone first (aborts if it cannot be written); an empty shell is removed by a later launch; same tests |
| G4-N3 orphan `migrating` database | `eed6603`: `migrating` header before the copy; an abandoned, unreferenced one older than 10 minutes whose plain source still exists is removed by `recover()`; a missing profile database is never opened or created empty (new `missing` unlock result + calm message) |
| Missing-features wave, areas A to G (weekly review 10 steps, insights charts, celebrations, Today tiers / «يومك جاهز» / levels / free joy / week strip, calm day, money envelopes + saving reminder, joy map + bundles + onboarding joy step, focus recall, home tidy + errands, evidence filter + add-to-habits, settings cap / modules / storage banner, habit studio 9-step wizard, onboarding life map, IELTS stats / goals, driving mechanisms) | `integ/features` @ `d982b01`; specs `docs/design/*.md`; code map in `04_CURRENT_IMPLEMENTATION.md` §4b; tests: 14 new test files, 849 tests in total (13 §3) |
| Gate 6 findings D1, D4 to D9 (review progress dots, in-flow overload line, tier counts, routine line, one season word «صيانة», Studio badge colour, empty chapter title) and D2 for the graceful path (review draft inside the encrypted DB while the lock is on); D3 (driving road wording) | `fc6bb39` (merged `d982b01`); verified closed by gate 7 (PER-REPORT, section 3): D1, D4 to D9 closed, D2 closed for the graceful path |
| G4-N4, G4-N5 (polish) | Listed by the gate-4 report as polish; fixed per the integrator, but not described in the commit message and not individually verified in this package (NOT VERIFIED) |
| G3-D9 copy fixes | `0738f6f` (diff read; no dedicated test) |
| Plaintext leftovers (reminder memory per profile; personal library inside the encrypted DB) | `c257441`; `vaultPrivateKeys.test.ts` (5) |
| Synthetic migration fixtures; real-derived fixture removed from the tree | `da4c839`; `flutterExport.test.ts` |
| `npm run privacy:scan` (LOS-026) | `scripts/privacy-scan.mjs`; result in 13 §2 |
| README (LOS-027), `AGENTS.md`, `CODEX_START_HERE.md`, manifest, cold-start audit | `README.md`, `AGENTS.md`, `CODEX_START_HERE.md`, `docs/handoff/21_FINAL_HANDOFF_REPORT.md`, `docs/handoff/22_COLD_START_AUDIT.md`, `HANDOFF_MANIFEST.json` |
| Stale `index.html` comment and private path in `tokens.css` comment | handoff branch (comment-only) |

---

## REQUIRED

### LOS-001 — Publish (two separate publishes, each needs the owner's explicit yes)
- **Status/Priority:** BLOCKED-ON-OWNER, P1.
- **Part A — source code on GitHub (PUSHED; verified with git ls-remote).** Branch `react-app` of wejdan0404/wejdan-os, first snapshot 2084aa8, then content commit be98a824bcc8b74b745be6655dc480d83896dcab[:7] (ls-remote confirmed), then a commit that only records the SHA. Target: `https://github.com/wejdan0404/wejdan-os`, new branch `react-app`, as **one clean snapshot commit** of the final tree (no local history: older local commits contain a real-derived fixture). It was created after running `npm run privacy:scan` on the exact tree; the SHA is recorded in `HANDOFF_MANIFEST.json`. Never touch the old `main` without a fresh owner decision (LOS-031).
- **Part B — the live site.** **Release 3 is live** per the integrator (the missing-features wave; gh-pages SHA `d2db69a`, to be filled by the integrator). Release 2 was `f7e1f75` (a build of `main` @ `ed0df23`, 139 precache entries). Both statements were relayed to the author, not re-checked from here (PER-REPORT; verify with `curl` before relying on it). The earlier live bundle `index-DhYFUn4i.js` / `169ca40` (built from `0fa7aa6`) is superseded. Publishing = copy `dist/` to the `gh-pages` branch (see playbook 20 §6).
- **Requirement:** R-025, R-075, R-079, R-094, R-104 (all DONE*).
- **Dependencies:** LOS-002 (gate), `npm run privacy:scan` (DONE), explicit owner approval.
- **Guidance (Part B):** build `dist` from the approved commit, run the privacy scan on the tree **and** grep the output, keep the `public/flutter*` shims and `.nojekyll`, publish with a normal commit, check the live page names the new bundle and the manifest still has `scope /wejdan-os/`. Never force-push.
- **Acceptance:** live HTML references the new `assets/index-*.js`; a profile with old data still shows Today with data; offline reload works (Chromium).
- **Verification:** `curl` the live page; Playwright against the live URL: load, reload offline, console 0 errors.
- **Effort:** 1–2 h. **Risks:** a bad publish replaces the live app (rollback = republish the previous `gh-pages` commit); personal data in the bundle.

### LOS-002 — Final regression gate on the merged tree
- **Status/Priority:** PARTLY DONE (was P1). Independent gate history: gate 2 SHIP (`cb8a2f8`); gate 3 found G3-D1…D9; **gate 4 = HOLD** (N1 major, N2, N3, N4/N5 polish; fixed in `eed6603`); **gate 5 = SHIP with two open minors** (LOS-040, LOS-041); **gate 6 (missing-features wave, `integ/features` @ `1c9f0d7`) = SHIP** with 0 blockers, 0 major, 3 minor + 6 polish (D1 to D9, fixed in `fc6bb39`); **gate 7 (narrow re-test of the gate-6 fixes, @ `d982b01`) = SHIP** with 2 minors (LOS-042, LOS-043). Gate reports are local-only (PER-REPORT). The author read `release-gate-6.md` and `release-gate-7.md` for this revision; gates 4 and 5 are still quoted from the integrator's summary.
- **Why still open:** gates 6 and 7 ran Chromium headless only (iOS, real Reduce Motion, VoiceOver, Dynamic Type not run; text scale 2.0 simulated by html font-size 200 %; no board-to-screen pixel diff). What gate 5 did and did not cover (text scale 1.5/2.0, contrast measurement, design-board comparison, axe) is NOT VERIFIED in this package. Run the remaining checks once, or accept the gate-5 SHIP as sufficient. Evidence in this repo: vitest 77 files / 849 tests + the e2e scripts (13 §2).
- **Requirement:** whole product; R-013, R-025, R-079.
- **Affected files:** none expected; may find fixes in `src/ui/lock/*`, `src/ui/screens/reminders/*`, `src/ui/screens/habits/StreakHero.tsx`.
- **Dependencies:** none.
- **Guidance:** build `dist`, serve at `/wejdan-os/`, rerun happy-path (onboarding → Today → Habits → Path → Joy → Money → Me → export/wipe/restore → reload → offline), once light once dark, then new flows: enable lock, reload, wrong/right password, second profile, recovery code, flexible streak switch, reminders screen + banner, calendar export sheet (download fallback), backup nudge. Test data named `test`. The existing scripts `tests/e2e/*.mjs` are the starting point (they need a served build and Chromium; see their headers).
- **Acceptance:** zero Major defects, 0 console errors, no horizontal overflow on 390×844, toast never covers controls, report written (any file; not in the public repo if it contains data).
- **Verification:** Playwright Chromium, `--headless=new`; screenshots reviewed.
- **Effort:** 4–8 h.
- **Risks:** headless Chromium is not an iPhone; findings about iOS behaviour stay unverified (LOS-025).

### LOS-003 — Stabilise the load-flaky test
- **Status/Priority:** OPEN, P2.
- **Why:** In a full run during the first draft of this handoff `tests/ui/habits/habits.test.tsx > RoutinePlayerScreen > walks every step and ends on the star` failed once (could not find «خلصتي روتين الصبح»); the same file passed 14/14 alone. In the two full runs of the final revision (849/849) it did not fail, so the flake is intermittent, root cause UNKNOWN. History shows similar load-sensitivity (`d4d164e`).
- **Affected files:** `tests/ui/habits/habits.test.tsx`, possibly `src/ui/screens/habits/RoutinePlayerScreen.tsx` (timers/animation).
- **Guidance:** reproduce by running the full suite while CPU is loaded (or `vitest --no-file-parallelism` vs default); replace fixed waits with `findBy*`/`waitFor` with adequate timeouts; do not weaken the assertion.
- **Acceptance:** 5 consecutive full `npx vitest run` passes on the same machine.
- **Verification:** `npx vitest run` ×5.
- **Effort:** 1–3 h.
- **Risks:** it may be a real race in the player (finish state shown late); check before only raising timeouts.

### LOS-005 — Visually verify D1 fix
- **Status/Priority:** OPEN-UNVERIFIED, P2.
- **Why:** D1 (player buttons clipped while a toast shows) was fixed in `0fa7aa6`; no QA report exists after it.
- **Requirement:** R-009. **Files:** `src/ui/screens/habits/RoutinePlayerScreen.tsx`, `src/ui/components/Toast.tsx`.
- **Guidance:** on `/routine/am`, tick a step, tap «كمّلي الروتين» within 5 s, hit-test «خلصت» and «تخطّي هالخطوة» (gate-2 steps), light, dark, reduced motion.
- **Acceptance:** both buttons fully visible and topmost at their centre while the toast is up. **Verification:** Playwright geometry check like `tests/e2e/toastClearance.e2e.mjs`. **Effort:** 1 h. **Risks:** none.

### LOS-006 / LOS-007 — Text scale and contrast on the final build
- **Status/Priority:** OPEN, P2 each. **Why:** gate 2 listed both under "Not run"; they were last checked on the a11y branch before later design merges (`e98f52b`) and the new screens.
- **Requirement:** R-109. **Files:** `src/ui/styles/*`, screen CSS modules.
- **Guidance:** set the root font size to 1.5× and 2.0× (iOS Dynamic Type equivalent in the PWA is the browser text size; emulate with CSS zoom/font-size) and screenshot every route in `src/ui/routes.tsx` plus lock, reminders and streak screens; compute contrast for text/background pairs from `tokens.css` in both themes (WCAG AA: 4.5:1 body, 3:1 large text/UI).
- **Acceptance:** no clipped or overlapping text at 2.0; every text pair ≥ AA or documented exception.
- **Verification:** Playwright screenshots + a small script that reads computed colours. **Effort:** 3–6 h each. **Risks:** fixes may touch tokens; tokens are identity-bound (do not change the four identity colours; adjust usage/tints only).

### LOS-008 — Design-fidelity re-compare
- **Status/Priority:** OPEN, P2. **Why:** area-7 found board mismatches; `fix/design` merged (`e98f52b`) but no comparison followed; splash quality was rated 2/5 then regenerated with the real W (`50643eb`) and not re-rated.
- **Requirement:** R-111, identity rules. **Files:** `src/ui/styles/`, screens, `public/splash/*`.
- **Dependencies:** access to the Claude Design boards (the board link is in the project ledger). **NOT VERIFIED** that boards are reachable for you.
- **Guidance:** compare each board to the screen at 390×844 light/dark; list differences as Preference vs Defect; only fix defects.
- **Acceptance:** written diff list with every Defect fixed or accepted by the owner.
- **Verification:** side-by-side screenshots. **Effort:** 6–10 h. **Risks:** subjective scope creep; stay within the existing boards.

### LOS-010 — Her real routine and products
- **Status/Priority:** BLOCKED-ON-OWNER, P2.
- **Why:** the public build seeds generic placeholder products (`src/domain/products.ts:36-45`). The real list lives only in her private files; the audit found no completed import.
- **Guidance:** the app already supports a private on-device import (Settings «استيراد مكتبتي الشخصية» and the products screen). **Do not** put any of her data in the repo, tests, commits, docs or logs. If asked to prepare an import file, produce it outside the repo and hand it to her directly.
- **Acceptance:** after she imports on her device, routines show her products and the importer's "needs confirmation" markers are reviewed by her.
- **Verification:** by her on her device (not by an agent). **Effort:** 2–4 h agent time if a file must be shaped. **Risks:** privacy leak; medical/health items must stay paused/off unless she enables them.

### LOS-012 — Design-first gap for the newest screens
- **Status/Priority:** OPEN-UNVERIFIED, P2.
- **Why:** her rule: build only what exists in Claude Design. For lock/profiles, flexible streak, reminders, W usage, the audit could not confirm boards, and the streak agent reported that no backup-reminder board existed.
- **Requirement:** R-111. **Files:** `src/ui/lock/*`, `src/ui/screens/reminders/*`, `src/ui/screens/habits/StreakHero.tsx`.
- **Guidance:** open the design canvas; for each missing screen, add it to Claude Design first, then reconcile the code. Until then treat these screens as provisional.
- **Acceptance:** each new screen has a board; differences resolved.
- **Verification:** screenshots vs boards. **Effort:** 4–8 h. **Risks:** may require rework of CSS only.

---

## OPTIONAL

### LOS-004 — Quick-add Save vs keyboard
- **Status/Priority:** OPEN (device part DEFERRED-BY-OWNER), P2.
- **Why:** gate 2 P2: in a 480 px-high headless viewport the sheet resizes (776 → 442) and Save lands at y=598, below the fold. Could be an artefact of resizing a headless viewport.
- **Files:** `src/ui/components/Sheet.tsx`, `src/ui/screens/today/QuickAddSheet.module.css`, `src/ui/components/Toast.tsx` (already listens to `visualViewport`).
- **Guidance:** keep Save visible by sizing the sheet to `visualViewport.height` (or a sticky footer); verify at 390×480 and 390×844.
- **Acceptance:** Save is fully inside the viewport after typing at 390×480. **Verification:** Playwright geometry. **Effort:** 2–4 h. **Risks:** do not claim real-keyboard behaviour (DEFERRED-BY-OWNER).

### LOS-009 — Repeatable e2e command and optional CI
- **Status/Priority:** OPEN, P3. **Why:** `tests/e2e/*.mjs` are manual Playwright scripts; `npm test` only runs Vitest; no `.github/`.
- **Guidance:** add an npm script that builds, serves `dist` under `/wejdan-os/` and runs the scripts; keep any workflow test-only and never publish from CI. Adding `.github/workflows` to the public repo needs owner approval.
- **Acceptance:** one command runs unit + e2e locally. **Effort:** 3–5 h. **Risks:** Playwright 1.47 has no `page.clock` (scripts pin `Date` with `addInitScript`).

### LOS-011 — Confirm delivery of her private library file and the guide
- **Status/Priority:** OPEN-UNVERIFIED, P3. **Why:** the audit could not find confirmation that the file and Arabic guide reached her. **Guidance:** ask the owner; never attach the file to the repo. **Effort:** minutes.

### LOS-013 — Star rule audit
- **Why:** R-052. **Files:** `src/ui/components/StarMark.tsx`, `StarDottedLine.tsx` and users. **Guidance:** grep users; confirm stars appear only on achievement/evidence surfaces and ≤ 3 per screen. **Acceptance:** list of users, each justified. **Effort:** 1–2 h.

### LOS-014 — Tab-bar icon decision
- **Why:** R-112; reviewer preferred the cup/plant but no owner decision. **Guidance:** ask the owner; if she chooses, change `src/ui/components/TabBar.tsx` icons to match the board. **Effort:** 1 h.

### LOS-015 — Flexible streak default and day counters (AWAITING OWNER APPROVAL)
- **Why:** The default is ON for new installs (`forgivingStreak: true`), chosen by the implementing agent; the owner asked for an *optional* streak and has **not approved the default**. Until she answers, do not change it either way. Streak surfaces show day counts (`src/ui/lib/streakText.ts`) although the earlier rule avoided numbers (R-026). **Guidance:** ask her; if "off by default", change `src/domain/models.ts:1139` (default only; stored values keep) and the test that asserts the default. **Acceptance:** her choice implemented; tests updated. **Effort:** 1–2 h. **Risks:** changing the default must not flip existing stored values.

### LOS-016 — First load on slow 4G
- **Why:** earlier measurement ≈ 4 s vs 3 s goal (ledger §6); fonts preload and lazy chunks were added since; no re-measure. **Files:** `vite.config.ts`, route chunking. **Guidance:** measure with a throttled profile; split large chunks; keep offline precache intact. **Acceptance:** documented before/after numbers. **Effort:** 3–6 h. **Risks:** precache size growth; keep `actions-*.js` excluded from precache as configured.

### LOS-017 — Escape closes pushed screens
- **Why:** R-110. Only sheets/menus close on Escape. **Files:** `src/ui/shell/stack.ts`, `AppShell.tsx`. **Acceptance:** Escape pops a pushed screen when no sheet is open. **Effort:** 1–2 h.

### LOS-018 — Locale polish
- **Why:** audit rows "terms for one concept" were not re-scanned after the 65-fix pass; the update prompt text is «فيه تحديث جديد للتطبيق» with a «حدّثي» button, while docs quote another wording. **Guidance:** re-run the term scan over `src/` strings; keep Saudi dialect, no «يمكنك/سوف/لقد/الرجاء». **Acceptance:** term list unified; copy tests still pass. **Effort:** 2–4 h. **Risks:** never reintroduce English UI strings.

### LOS-019 — Update prompt blocked by an open sheet
- **Why:** area-6 D4 (Low): with an update waiting and a sheet open, «حدّثي» is visible but not tappable (background inert). Commit `8f79b60` (area 6 fixes) touched `src/pwa/UpdatePrompt.tsx` (2 lines) and `src/pwa/index.tsx`; whether that fixed D4 is UNKNOWN. **Files:** `src/pwa/UpdatePrompt.tsx`, `src/ui/components/Sheet.tsx`. **Guidance:** reproduce first; if still present, render the prompt outside the inert root or defer it until sheets close. **Effort:** 1–3 h.

### LOS-020 — Thmanyah licence for native app
- **Why:** licence forbids public hosting of font files; use inside a native app needs a written question to the font owner. **Action:** owner contacts them; no code. **Priority:** P4.

### LOS-021 — Retire the Flutter takeover shims
- **Why:** `public/flutter*.js`, `public/main.dart.js` and `src/pwa/legacyCleanup.ts` exist so returning devices with an old cached worker move to React. **Guidance:** only after the owner confirms her devices opened the new build, and with approval; keep IndexedDB untouched. **Risks:** removing early can blank an old cached install.

### LOS-022 — W placeholders on old boards
- **Why:** the ledger says the earlier app used a cropped W because the SVG export failed; the real SVGs are now in `public/brand`. Whether the Claude Design boards were updated: UNKNOWN. **Action:** designer/owner check of boards; no code.

### LOS-023 — Lock UX and limits
- **Why:** the lock does not encrypt DB/box names, ids, counts, the profile registry, or some per-device conveniences (header of `src/domain/vault/vault.ts`); forgetting both password and recovery code means no recovery. **Guidance:** confirm the in-app copy (`src/ui/lock/copy.ts`) states this plainly; review the recovery-code screen for clarity; do not weaken the crypto. **Acceptance:** limits visible in Settings text. **Effort:** 2–3 h. **Risks:** any change to `crypto.ts`/`vault.ts` needs the `vault*` tests (`vaultCrypto`, `vaultPolicy`, `vaultMigration`, `vaultDurability`, `vaultPrivateKeys`, `vaultBackup`), `tests/ui/lock/*` and the `lockProfiles` + `lockKill` e2e scripts. LOS-032 adds the rollback-window disclosure.

### LOS-024 — Two windows do not live-sync their data
- **Why:** area-6: no data loss because records are written separately, but each window sees the other's changes only after reload. Gate 3 added registry sync (`storage` event + `BroadcastChannel`) for the lock registry only; app data is still per-window until reload. **Guidance:** optional `BroadcastChannel` refresh; keep it local. **Effort:** 2–4 h. **Risks:** do not add any network.

### LOS-026 / LOS-027 — DONE
`npm run privacy:scan` exists (`scripts/privacy-scan.mjs`); the README was replaced. Still open from LOS-026: also run the scan over the produced `dist` (it scans `git ls-files` only) — fold into the publish checklist.

### LOS-032 — Rollback window after enabling the lock
- **Related:** LOS-040 (the same plaintext leftover, permanent after a kill during turn-off).
- **Status/Priority:** OPEN, P2.
- **Why:** after the lock is turned on, the plaintext pre-lock database stays until the next launch and a real unlock (G3-D1 design). During that window anyone with the browser profile can read everything in clear, and the UI does not say so.
- **Files:** `src/ui/lock/copy.ts`, `RecoveryCodeStep.tsx`, `ProtectionSection.tsx`, `src/domain/vault/vault.ts` (`finalizeLegacy`).
- **Guidance:** (a) say it plainly in the setup/recovery step and Settings; (b) optionally offer a «امسحي النسخة القديمة الحين» action after the first successful unlock instead of waiting for the next launch. Do not shorten the window silently: the rollback is what makes the migration safe.
- **Acceptance:** copy shipped + test; if (b) is built, vault durability tests extended. **Effort:** 2–4 h. **Risks:** touching `finalizeLegacy` needs the whole vault suite + `lockKill` e2e.

### LOS-033 — `npm audit` findings
- **Status/Priority:** OPEN, P2.
- **Why:** 9 findings (2 critical dev-only: `vitest`, `tinypool`; 5 high: `vite`, `playwright` dev-only, `react-router-dom`/`react-router`/`@remix-run/router` runtime; 2 moderate). Exploitability for a hash-routed static PWA is NOT assessed.
- **Guidance:** upgrade `react-router-dom` within 6.x first (smallest change on the only runtime chain), run full tests + build + the e2e scripts; treat `vite`/`vitest`/`playwright` majors as a separate tooling task. Never run `npm audit fix --force`.
- **Acceptance:** `npm audit --omit=dev` clean; all tests green. **Effort:** 2–6 h. **Risks:** router behaviour changes; framer-motion/AppShell stack uses `useLocation`.

### LOS-034 — Semantic record ids stay readable with the lock on
- **Why:** habit/product ids and day keys are IndexedDB keys; counts and sizes are visible. Opaque ids would be a schema/migration change. **Decision needed** (accept as documented, or plan a migration). **Effort if built:** 8–16 h. **Risks:** touches import/export and every box.

### LOS-035 — Orphaned encrypted databases
- **Why:** if a profile row is lost and the header cannot be parsed, `recover()` leaves the database alone (by design) but nothing lists it. **Guidance:** optional «found unlisted data» screen in the lock flow; never auto-delete. **Effort:** 3–5 h.

### LOS-036 — LICENSE and OFL notices
- **Why:** no `LICENSE` file; the build redistributes OFL fonts without a notice. **Guidance:** owner picks the licence for her own code; add `THIRD_PARTY_NOTICES` (fonts + MIT/Apache notices) under `public/` or an About line. **Effort:** 1–2 h. **Risks:** none technical.

### LOS-037 — ESLint cannot run
- **Why:** `eslint.config.js` needs `eslint`, `@eslint/js`, `globals`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `typescript-eslint`; none is declared. 24 `eslint-disable` comments assume the rules. **Guidance:** add devDependencies + a `lint` script, run once, fix or re-justify. Do not mass-reformat. **Effort:** 2–4 h.

### LOS-038 — Personal action library with the lock OFF
- **Why:** with the lock on it lives in the encrypted DB; with it off it is a plaintext `localStorage` key (`wejdan.personalActionLibrary.v1`) on her device (not in the repo). **Decision:** accept (documented), or always store it in IndexedDB. **Rule either way:** no personal library content in the repo, tests, logs or docs.

### LOS-039 — Red on delete / turn-off buttons (owner call)
- **Why:** the final delete-profile and turn-off-lock buttons use the `--error` fill; the product rule is no red failure states / no shaming. These are destructive confirmations, not failures — the owner decides whether they should become Ink/Violet with a clear label. **Files:** `src/ui/lock/lock.module.css` (`.destructive`), `ProtectionSection.tsx:221`, `ProfileSheets.tsx:174`; swipe/menu `destructive` tones in `ListRow`/`ContextMenu`. **Do not change without her answer.**

---

## DEFERRED-BY-OWNER

### LOS-025 — Real-device checks
Permanently deferred by the owner. Do not schedule them, do not claim them done. They remain "unknown" and cover: `.ics` import through the iOS share sheet, the home-screen icon and splash images generated by `npm run brand:assets`, status-bar style with `black-translucent`, real software keyboard in sheets (see LOS-004), migration of real old data on the phone, persistent-storage behaviour, and the "feel" of the motion on an iPhone.

### LOS-040 — Orphan plain database / `_bak_` copy has no cleanup path (gate-5 M1)
- **Status/Priority:** OPEN, P2 (Minor in gate 5; privacy leftover, not data loss).
- **Why:** if the page is killed roughly 190 to 220 ms into turning the lock OFF, the plaintext database and/or a `_bak_` copy of it can be left behind and nothing ever removes it. It is readable in clear by anyone with the browser profile (same class as LOS-032, but permanent instead of one launch).
- **Files:** `src/domain/vault/vault.ts` (`recover()`, turn-off path, `finalizeLegacy`), `tests/domain/vaultDurability.test.ts`, `tests/e2e/lockKill.e2e.mjs`.
- **Guidance (from gate 5):** in `recover()`, delete an orphan plain database once the profile database's per-box record counts equal it (compare before deleting; never delete when counts differ), and age out `_bak_` copies. Keep the rule "delete only on a LATER launch, after the durable marker says so".
- **Acceptance:** crash-injection unit test and a `lockKill` case at about 190 to 220 ms leave no plain database or `_bak_` after the next launch; counts-differ case keeps the data; whole vault suite green. **Effort:** 3 to 5 h. **Risks:** this is deletion logic; the whole vault suite and `lockKill` are mandatory.

### LOS-041 — Missing-data screen is a dead end (gate-5 M2)
- **Status/Priority:** OPEN, P2 (Minor in gate 5).
- **Why:** since `eed6603` a profile whose database is missing is never opened empty; `unlock()` returns `missing` and the unlock screen shows only «بيانات هذا الحساب ما لقيناها على هذا الجهاز ... سكّري التطبيق وافتحيه من جديد» (`T.missingData`). There is no way forward from that screen (no restore from backup, no import, no start-fresh).
- **Files:** `src/ui/lock/UnlockScreen.tsx`, `src/ui/lock/copy.ts`, `src/domain/vault/vault.ts` (`unlock`, `resetWithRecovery`), `tests/ui/lock/*`.
- **Guidance:** add two calm actions on that state: import a backup file (reuse the encrypted/plain import flow) and start fresh (explicit confirmation, creates a new empty profile, never silently). Arabic copy needs owner review. No red.
- **Acceptance:** UI test for both paths; e2e: delete the profile database by hand, reopen, reach Today via either path. **Effort:** 3 to 6 h. **Risks:** start-fresh must not delete anything that could still be recovered.

### LOS-042 — Review draft can be lost if the process dies right after turning the lock off (gate-7 M1)
- **Status/Priority:** OPEN, P3 (Minor; only the unfinished weekly-review DRAFT, never saved data; a draft is regenerated in minutes).
- **Why:** turning the lock off moves the draft from the durable encrypted row to localStorage and deletes the row copy; Chromium had not flushed that localStorage write (measured: still lost 30 s later in one scenario, kept at 60 s). On the next launch the rollback DB is dropped, so the draft is gone. Repro (gate 7): `gate7/k8.mjs 7000`, `k8c.mjs 8000` (local-only). Pre-wave drafts lived only in localStorage and had the same flush exposure, so this is not a regression of data safety.
- **Files:** `src/domain/store.ts` (`getReviewDraftRaw`, `setReviewDraftRaw`, `clearReviewDraftRaw`, turn-off path), `src/domain/vault/vault.ts`.
- **Guidance (gate 7):** keep the encrypted row until the localStorage key reads back on a LATER launch, then delete the row. **Acceptance:** crash-injection test for turn-off followed by a kill; `lockKill` e2e unchanged green. **Effort:** 2 to 4 h. **Risks:** touches turn-off; run the whole vault suite.

### LOS-043 — Plaintext review draft survives a crash during lock enable (gate-7 M2)
- **Status/Priority:** OPEN, P3 (privacy window, Minor).
- **Why:** enable lock, SIGKILL 300 to 5000 ms after the recovery-code confirm: the first LOCKED launch still has the plaintext draft (wins, miss reasons) in localStorage until the first unlock (settling needs the open vault; the localStorage removal was not flushed). It is removed on first unlock. The graceful path leaves no plaintext (gate 7 check 1). Residual of gate-6 D2.
- **Guidance:** clear the review-draft keys in the registry-recovery step of boot, or write an encrypted copy first and clear the key at the next launch when the vault is not yet open. **Acceptance:** a `lockKill` case at 300 to 5000 ms after confirm shows 0 draft keys on launch 1. **Effort:** 2 to 3 h.

### LOS-044 — Hand-run e2e scripts broken by the new onboarding
- **Status/Priority:** OPEN, P2 (test tooling; the app is not affected).
- **Verified now (this revision, on the merged tree, Chromium headless, default `REACT_DIR=./dist`):** nine scripts stop at the same step: `locator.click` times out waiting for `getByRole('button', { name: /ابدئي يومك/ })`. They are `lockProfiles`, `lockKill`, `streakRemindersLogo`, `toastClearance`, `reviewInsightsCelebrations`, `todayCalm`, `featureD`, `ieltsDriving` and `moneyJoy` (all `*.e2e.mjs`). Three pass: `bidiGlyphOrder` (20), `joyOnboarding` (17), `studioOnboarding` (23). The likely cause is that `OnboardingScreen.tsx` now has more steps (life map, joy step), so the single click on the last-step button is not enough; this is a **claim to verify** (the author did not step through the failing scripts). Consequence: the lock kill matrix (`lockKill`) was **not re-run on the merged tree**; its last results are from `ed0df23` (375 checks). Gates 6 and 7 ran their own kill spot checks (PER-REPORT).
- **Guidance:** extract one shared helper `completeOnboarding(page)` that clicks «التالي» / «تخطّي» until «ابدئي يومك» appears, use it in every script (the three passing scripts already advance the extra steps themselves; reuse their approach). Do not edit the app to suit the scripts. **Acceptance:** all hand-run scripts pass in light and dark (13 §2 table). **Effort:** 2 to 4 h.

### LOS-045 — Design-vs-build rows still not built
- **Status/Priority:** OPEN, P3. Each row is a candidate, not a commitment; several need the owner's wording or content.
- **Source:** `design-vs-build.md` (local-only, written against `ed0df23` before the wave; it compared the app with an Oct-1 export of the older «App Screens» boards, not with the 24-Oct artifacts, which the reviewer could not open). **Method here:** the author searched `src/` for the Arabic labels and feature names of each remaining row; "not found" means the search found nothing, not that the UI was exercised. Verify before building; some rows may exist under other wording.

| # | Row | Status |
|---|---|---|
| 1 | IELTS «open practice site» link | Not built. Needs a source the owner trusts (honesty rule); the mechanism for user links exists in Driving |
| 2 | Driving: official stages, steps, hours, fees, hazard clips, question bank | Mechanisms only, by design. Content pending the owner's verified official source (`driving-road-quiz-hazard.md`) |
| 3 | Driving: help link when anxious | Not found on the Driving screens (Help is reachable from Me and Calm day) |
| 4 | IELTS: per-plan daily practice reminder times | Not built; only global reminders |
| 5 | Evening close: «لحظة حلوة اليوم» one-line note; «أنجزتي n من m» line; start the evening routine from the close | Not found |
| 6 | Morning brief: single «ابدئي يومي» CTA that starts the routine | Not found (hero step exists) |
| 7 | Routine player completion: «+1 spark» line | Not found |
| 8 | Habits hub: essentials capacity line; per-domain momentum bars on the hub (they exist in Insights); grow / maintain counts in the season line; 4-week history in Habit detail (2 weeks today) | Not found |
| 9 | Path: three-tier season summary card; year-in-4-quarters «you are here» marker | Not found (quarter labels exist; marker not verified) |
| 10 | Money: monthly subscription-review prompt | Not found |
| 11 | Weekly review closing sparks: board says +10, app awards +5 | Differs; no owner decision recorded |
| 12 | Joy: «حديقتي» shortcut card | Not found on Joy (garden reachable from Habits) |
| 13 | Language selector; aquarium board | Retired on purpose (Arabic only; no streak / emoji visuals) — not gaps |
| 14 | Gate-6 U1: once, after a level chip change, the next tap on the free-joy circle did not register | UNCONFIRMED, not reproduced; verify before any fix |

- **Acceptance:** per row, a test plus a design-board check (design-first rule). **Effort:** 0.5 to 3 h per row.

### LOS-046 — No change-log entries for driving / IELTS data
- **Status/Priority:** OPEN, P3.
- **Why:** driving road, quiz, hazard goal and IELTS goals live in one opaque JSON blob (`ModuleState.ieltsDriving`, `meta`). `store.updateModuleState` does not call `logChange`, and the change log covers only the 11 entity types in `CHANGE_ENTITIES` (task, inbox, habit, project, goal, product, note, routine, weeklyTask, joyItem, fixedEvent; so money envelopes, bills and the like are not logged either). Edits to this blob do not appear in «سجل التغييرات» and cannot be restored from it (the screens give their own undo toasts). Gate 6 confirmed export / import round-trips the blob and the lock keeps it.
- **Guidance:** add a change-entity for the blob (before / after JSON, label «المسار / الآيلتس»). **Acceptance:** an edit appears in the change log and restores; export / import unchanged. **Effort:** 2 to 4 h.

## OWNER-ONLY (not for an agent)

### LOS-030 — Rotate exposed tokens
Two tokens are committed in a private ops file of an earlier workflow on the old public `main` (outside this app's source tree; the file path is deliberately not repeated here). Services are loopback-only per the ledger, but the tokens must be rotated by the owner on her machine. An agent must not read, print, move or commit them.

### LOS-031 — History cleanup
The old `main` and `gh-pages` history contain personal data by her choice ("leave it as it is"). Any cleanup is a force-push and rewrites every hash; it needs her explicit new approval. The privacy report (local-only, not in the repo) describes options; an agent may only prepare a plan, never execute. The clean-snapshot push of `react-app` (LOS-001 Part A) deliberately avoids needing this for the new code.
