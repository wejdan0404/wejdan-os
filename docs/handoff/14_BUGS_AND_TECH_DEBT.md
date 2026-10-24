> **ملخص**
> قائمة بالأخطاء المفتوحة والدين التقني، كل بند معه الدليل الذي تحققت منه (قراءة الكود أو تشغيل أمر) ودرجة الخطورة بحسب الأثر الفعلي، بدون تضخيم.
> لا يوجد خطأ وظيفي مؤكد مفتوح بدرجة عالية؛ أخطاء الفحص الثالث التسعة (D1–D9) صُلّحت وعليها اختبارات. أهم المفتوح: ESLint معطّل، 9 ثغرات npm audit، نافذة الرجوع للقاعدة العادية بعد تفعيل القفل، نص ترخيص الخطوط غير مضمَّن، وتكرار في الكود والتوكنز.
> التقارير القديمة (QA/a11y) فيها عيوب صُلّحت لاحقًا؛ لم أعدّها مفتوحة إلا إذا أثبتّها من الكود الآن.

# 14 — Bugs and technical debt

Verified 2026-10-24 (branch `docs/handoff` on top of `main` @ `ed0df23`, after the release-gate-3 fixes).

Everything in older QA reports (32 + 18 + area reports) was reported against earlier builds and later fixed in code with regression tests (see 13_TESTING_AND_QA.md §7); those are **not** listed as open unless re-confirmed below.

## 1. Open defects (confirmed now)

| ID | Sev | Finding | Evidence | Suggested fix |
|---|---|---|---|---|
| B1 | Medium | **ESLint cannot run.** `eslint.config.js` imports `@eslint/js`, `globals`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `typescript-eslint`; none (nor `eslint`) is in `package.json`; no `lint` script. 24 `eslint-disable` comments exist in `src/` (e.g. `Sheet.tsx`, `AppShell.tsx`, `VaultProvider.tsx`, `navigate.tsx`, `useDueReminders.ts`), so the hook-dependency rules they silence have never been checked in this tree | `grep -rn eslint-disable src \| wc -l` = 24; first draft ran `npx eslint .` → `ERR_MODULE_NOT_FOUND '@eslint/js'` | add devDependencies, a `lint` script, run once and fix or re-justify the disables (LOS-037) |
| B2 | — | ~~Stale comment in `index.html`~~ **RESOLVED** in the handoff branch: the iOS launch-screen comment now names `scripts/brand/generate-brand-assets.mjs`. | `grep generate-ios-assets index.html` → no match | — |
| B3 | Low | **Escape does not close a pushed screen** (external keyboard). Only `Sheet` and `ContextMenu` handle `Escape`; nothing in `src/ui/shell` does. QA area 6 listed it as a minor note and `promised-vs-done` marked it "missing" | `grep -rn Escape src/ui/shell` → no match; behaviour not exercised | optional: map Escape to `stack.goBack()` when no sheet/menu is open |
| B4 | — | ~~README is the Vite template~~ **RESOLVED** in the handoff branch: `README.md` rewritten (EN + AR, verified commands, links). | `README.md` | — |
| B5 | Medium (legal hygiene) | **No `LICENSE` file** and **no OFL notice in the build**: `grep -ri "SIL Open Font" dist` finds nothing although `dist/assets` redistributes IBM Plex and El Messiri font files (OFL-1.1 requires the licence text/copyright to accompany them) | `git ls-files` (no LICENSE); grep on `dist` | add `THIRD_PARTY_NOTICES` shipped in `public/` (or an About line) and decide the repo's own licence |
| B6 | Low | **Test noise**: vitest prints many `not wrapped in act(...)` messages and React Router v7 future-flag warnings per run (tests render `MemoryRouter` without the `future` flags that `App.tsx` already sets). They hide real warnings. (Counts were 40 and 38 in the first draft; not re-counted on the final tree.) | `npm test` stderr | pass `future` flags in the test harness; wrap async updates |
| B7 | Low | **Specs disagree on the W glow threshold**: `WMark` allows glow from 48 px (matches the design handoff), the splash/icon script comment says "Glow/Micro only on dark and only at ≥ 96px" (Logo board), and the board note says "≥48px" | `WMark.tsx:7`, `scripts/brand/generate-brand-assets.mjs:7`, handoff §0 | pick one number and apply to both |
| B8 | Low | **Two near-identical harlequin SVG tiles** (`screens/me/harlequin.svg` 283 B vs `screens/joy/harlequin.svg` 284 B) | `ls -l` | share one file |
| B9 | — | ~~Personal action library stored unencrypted~~ **RESOLVED for the lock-on case** (gate 3): with the lock on it lives inside the encrypted profile DB (`LifeStore.settlePersonalLibrary`); a stray localStorage copy is moved in, verified, removed, and purged on manual lock/switch/delete. With the lock **off** it is still a plaintext `localStorage` key by design. Evidence: `tests/domain/vaultPrivateKeys.test.ts` (5), `personalLibrary.test.ts` (4). | code read | decide whether the lock-off case needs more (LOS-038) |
| B10 | Low | **Hard-coded hex colours in 8 component files** outside `tokens.css` (list in 07 §2.6) bypass the token rule and have no dark/light pair guarantee | grep | move to tokens (`--cover-*`, `--hero-*`) |
| B11 | Low | **Dark theme tokens are duplicated** (`[data-theme='dark']` and the `@media (prefers-color-scheme: dark)` block carry the same ~75 declarations); a change in one block will silently diverge from the other | `tokens.css` | generate one from the other or use a `@layer`/mixin-style build step |
| B12 | Low | **`.fileCard`-type components live inside screen files** and the lock form kit lives in `src/ui/lock/` instead of `components/`, so the design-system inventory (07 §8) and the code layout differ from the Claude Design kit | 07 §11 #7 | optional move |
| B13 | Medium (supply chain) | **`npm audit`: 9 findings** (2 critical `vitest`/`tinypool`, 5 high `vite`/`playwright`/`react-router-dom`/`react-router`/`@remix-run/router`, 2 moderate). `--omit=dev`: only the 3 `react-router*` highs (runtime dependency, open-redirect advisories). Exploitability for a hash-router static PWA not assessed | `npm audit --json` run 2026-10-24 | LOS-033: upgrade `react-router-dom` within 6.x first, re-run all tests; decide on dev-tool majors |
| B14 | Medium (privacy design) | **Rollback window**: after turning the lock on, the plaintext pre-lock DB `wejdan_life_os` stays until the next launch + a real unlock. Intentional (never lose data) but not disclosed in the UI | `vault.ts` header, `finalizeLegacy` | LOS-032: disclose in Settings/recovery step; consider offering «احذفي النسخة القديمة الحين» after the first successful unlock |
| B15 | Low (owner call) | **Red used for delete / turn-off buttons**: the final delete-profile and turn-off-lock buttons use `--error` fill (`lock.module.css .destructive`), and destructive swipe/menu tones use red. The product rule is "no red failure states / no shaming"; these are destructive confirmations, not failures, but the owner has not ruled | `lock.module.css:260`, `ProtectionSection.tsx:221`, `ProfileSheets.tsx:174` | LOS-039: owner decides |
| B16 | Low | **Record ids are semantic** (habit/product ids, day keys) and stay readable when the lock is on; counts and sizes too | `vault.ts` header | LOS-034: opaque ids would be a schema change; accept or plan a migration |
| B17 | Low | **Orphaned encrypted DBs**: if a profile row is lost *and* its header cannot be parsed, the database is left alone (never deleted) and never listed | `Vault.recover()` | LOS-035: optional «found unlisted data» screen |
| B18 | Low | **Per-device conveniences survive auto-lock** (recent searches, drafts, theme, reminder memory) — by design, wiped on manual lock/switch/delete | `deviceKeys.ts` | documented; no action unless the owner wants stricter |

## 1.1 Resolved in release-gate 3 (kept for traceability; evidence = tests that exist now)

| Gate-3 ID | Was | Fix (commit) | Evidence |
|---|---|---|---|
| G3-D1 | **Data loss**: enabling the lock deleted the plain DB before the registry in localStorage was durable; a browser kill left unrecoverable ciphertext | Header row per profile DB + boot `recover()`; plain DB kept as rollback and deleted only after a real unlock on a later launch; header-first writes (`c257441`) | `vaultDurability.test.ts` (75, crash at every step), `vaultMigration.test.ts`, `lockKill.e2e.mjs` (SIGKILL 150/600/2000/6000 ms) |
| G3-D2 | Reminder banner was an overlay (risk of covering header controls / toast) | In-flow card at the top of Today, one at a time with «+N» (`0738f6f`) | `streakReminders.test.tsx` (24), `streakRemindersLogo.e2e.mjs` (hit-tests «+»/search with banner + toast) |
| G3-D3 | Two tabs could overwrite each other's registry | `rev` + compare-and-set, `storage` + `BroadcastChannel` (`c257441`) | `vaultDurability.test.ts` |
| G3-D4 | One undecryptable row blocked the whole profile | Quarantine + Settings notice + unreadable-profile screen (`c257441`) | `vaultDurability.test.ts`, `lockModalAndErrors.test.tsx` |
| G3-D5 | Bidi isolation broke on accented Latin, joiners, ranges, currency | Unicode property escapes (`0738f6f`) | `bidiG3.test.ts` (37 rows), `bidiF1.test.ts`, `bidiGlyphOrder.e2e.mjs` |
| G3-D6 | Avatar radios were not named from the Arabic flower registry | Named from the Arabic flower registry | `lockProfiles.e2e.mjs` ("avatar radios have Arabic names") |
| G3-D7 | Lock setup overlay was not a real modal | `role=dialog aria-modal`, focus trap, inert background, Escape (`c257441`) | `lockModalAndErrors.test.tsx` |
| G3-D8 | Red error text on lock screens | Ink text + Violet icon/underline | `calmErrors.test.tsx` |
| G3-D9 | Copy: «اثنين» spelling; «منتجاتي» subtitle | fixed in code (`WeekDots.tsx`, `habits/shared.tsx`, `MeScreen.tsx`) | no dedicated regression test found; **NOT VERIFIED** beyond reading the diff |
| — | Plaintext leftovers (reminder memory, personal library) | Per-profile reminder memory; personal library in the encrypted DB (`c257441`) | `vaultPrivateKeys.test.ts` |
| — | Real-derived fixture in the repo | Synthetic fixtures + `privacy:scan` (`da4c839`) | `flutterExport.test.ts`, `npm run privacy:scan` |

Gate-3's own report is local-only (not in the repo); this table is the in-repo record.

## 1.2 Gate 4 (HOLD) and gate 5 (SHIP) — fixed in `eed6603`, merged as `ed0df23`

Reports `release-gate-4.md` and `release-gate-5.md` are local-only; the rows below are PER-REPORT as relayed by the integrator, with the fix evidence from the commit and the tests that exist now.

| ID | Was | Fix | Evidence |
|---|---|---|---|
| G4-N1 (major) | SIGKILL right after turning the lock off lost data | durable `retired` marker; the encrypted DB is removed only on a later launch and only if the plain DB still holds her data | `vaultDurability.test.ts` (75 tests, registry surviving and lost cases), `lockKill` e2e |
| G4-N2 | Ghost profile after a killed delete | mandatory `deleted` tombstone before anything else; empty shell removed later | same |
| G4-N3 | Orphan `migrating` database | `migrating` header before copy; abandoned ones older than 10 min with the plain source still present are removed by `recover()`; a missing profile DB is never opened empty (`missing` result, `T.missingData`) | same; `vaultMigration.test.ts` adjusted |
| G4-N4, N5 | Polish | fixed per the integrator | not individually verified here (NOT VERIFIED) |

Gate 5 (independent, on the fixed tree): **SHIP** with two open minors: **M1** plaintext `_bak_` / orphan plain DB after a kill about 190 to 220 ms into turning the lock off has no cleanup path (LOS-040); **M2** the missing-data screen is a dead end (LOS-041). Both are open defects in the current code (B19, B20 below).

| ID | Sev | Finding | Evidence | Suggested fix |
|---|---|---|---|---|
| B19 | Minor | Orphan plain database / `_bak_` copy is never cleaned after a kill during turn-off (privacy leftover, no data loss) | gate-5 M1 (PER-REPORT); LOS-040 | delete once per-box counts equal the profile DB; age out `_bak_` |
| B20 | Minor | Missing-data unlock screen offers no import / start-fresh | gate-5 M2 (PER-REPORT); `UnlockScreen.tsx`, `copy.ts` | LOS-041 |


## 2. Product / design decisions still open (not bugs)

| ID | Item | Evidence |
|---|---|---|
| D1 | **Flexible streak defaults to ON** (`models.ts:1139 forgivingStreak: true`); the design handoff recommended **off** pending the owner's decision — **awaiting owner approval** (LOS-015) | code vs handoff §5.1/§9.3 |
| D2 | **Star-usage audit**: `StarMark` is used in 26 non-kit files; the rule is "concave 4-point star only for achievement/evidence". Uses such as Notes "decision" and the payday-today eyebrow are not obviously achievements | 07 §7 |
| D3 | **Help screen numbers** (emergency / health-line) are copied from the Flutter build and not re-verified | `HelpScreen.tsx`; 13 §9 |
| D4 | **Reminder semantics**: no push; real alerts only via `.ics`; quiet hours not exported; UID-update on iOS unverified | 08 §7 |
| D5 | **Legacy Flutter shims** (`public/flutter*.js`, `main.dart.js`, `flutter_service_worker.js`) have no removal criterion | 09 §2.1 |
| D6 | Week start assumption (Sunday in the board) vs the code's week definition was not asserted by a test | 13 §4 |
| D7 | Product strings in onboarding/seed are neutral placeholders until she enters her own (by design) | `starterProfile.ts` header |

## 3. Large files (lines, from `wc -l`, 2026-10-24)

| File | Lines | Comment |
|---|---|---|
| `src/domain/models.ts` | 1,901 | all entities + JSON codecs + defaults in one file |
| `src/domain/store.ts` | 1,689 | the whole `LifeStore` API |
| `src/domain/engine/dayPlanner.ts` | 824 | planner + selection rules |
| `src/ui/screens/habits/habits.module.css` | 777 | one CSS module for ~7 screens |
| `src/domain/vault/vault.ts` | 948 | registry + headers + recovery + migrations |
| `src/domain/features/sources.ts` | 764 | import parsing + review model |
| `src/ui/screens/path/PathScreen.tsx` | 702 | screen + sheets in one file |
| `src/ui/screens/me/MoneyScreen.tsx` | 666 | |
| `src/ui/screens/path/Path.module.css` | 645 | |
| `src/ui/screens/sources/ImportReviewScreen.tsx` | 629 | |
| `src/ui/screens/me/me.module.css` | 608 | |
| `src/domain/storage.ts` | 673 | |
| `src/ui/screens/path/IeltsScreen.tsx` | 582 | |
| `src/ui/screens/today/TodayScreen.tsx` | 543 | |
| `src/ui/screens/sources/sources.module.css` | 526 | |
| `src/domain/migration/flutterHive.ts` | 492 | |

Total UI screen code ≈ 13.8 k lines in `src/ui/screens/**/*.tsx`. No file is dead: a script (imports graph by file basename) found no module under `src/` that nothing imports, except `main.tsx` (entry) and the four dev harnesses `src/ui/screens/{today,habits,notes,sources}/preview/preview.tsx` (loaded by their own `index.html`, outside the build).

## 4. Duplicate logic

| Duplicate | Where | Risk |
|---|---|---|
| `Intl.DateTimeFormat('ar-SA-u-nu-latn-ca-gregory', …)` created ad hoc: 13 `new Intl.DateTimeFormat('ar-SA…` expressions across 10 files (`meKit.tsx`, `notesKit.tsx` — note its different option order `ar-SA-u-ca-gregory-nu-latn`, `sourcesKit.tsx`, `pathKit.tsx`, `today/lib.ts`, `WeeklyReviewScreen.tsx`, `PathScreen.tsx`, `IeltsScreen.tsx`, `SettingsRows.tsx`, `domain/features/sources.ts`); `dayMonth` is defined four times (`meKit`, `notesKit`, `sourcesKit` as `fmtDayMonth`, `pathKit` as `fmtDay`) | formatting drift; a Hijri/digit change must be made in 10 places | one shared date helper under `src/ui/lib/` (to be created) |
| Time formatting `en-GB` `hourCycle h23` in `meKit.tsx` and `sourcesKit.tsx` | | same |
| Currency formatting: `riyal()`/`Amount` in `meKit.tsx` vs raw `toLocaleString('en-US')` in `MoneyScreen.tsx:199,202` | | RTL-order bug class (QA #17) can reappear |
| Dark token block (see B11) | `tokens.css` | |
| Harlequin SVG (B8) | | |
| Four `preview.tsx` dev harnesses share boilerplate (seed theme in `localStorage`, mount) | `screens/*/preview` | unmaintained harnesses |
| `ImportReview.tsx` (`me/`, 308 lines) next to `sources/ImportReviewScreen.tsx` (629) | different roles (a component used by the sources/onboarding path vs the review screen) — **relationship not fully verified** | confusion for newcomers |

Shared pieces that are NOT duplicated: `Bidi`'s `LTR_RUN_SOURCE` is reused by `isolate()` in `today/lib.ts`; plural helpers live in `lib/plural.ts`; `parseAmount` in `lib/number.ts`.

## 5. Flaky / environment-sensitive tests

* The full vitest run took 203 s when run in parallel with a production build; lazy screens are transformed on first import and `tests/setup.ts` raises `asyncUtilTimeout` to 5 s because that "made findBy*/waitFor flaky" (comment in the file). No failures were observed in today's run, but a heavily loaded CI box could trip the 20 s `testTimeout`.
* e2e scripts use fixed `waitForTimeout` sleeps (hundreds of ms) rather than conditions; the lock script takes minutes (PBKDF2 310k iterations × several unlocks, delay card countdowns). The toast, lock and streak/reminders/logo scripts passed in every theme variant I ran (13 §2).
* `tests/e2e/legacyMigration.e2e.mjs` depends on an external, seed-flag-capable Flutter build (not in the repo) and waits a fixed 12 s for Flutter to boot — it failed today for environment reasons (13 §2 #14).
* **Playwright 1.47.2 does have `page.clock`** (verified) but `setFixedTime` freezes `performance.now` and therefore framer-motion; all scripts pin the clock with a `Date` subclass instead (13 §6). Anyone upgrading Playwright should keep this in mind. The statement "1.47 lacks `page.clock`" is incorrect.
* `vitest` environment is jsdom: no layout, no real focus rings, no `backdrop-filter`; geometry assertions (toast clearance) are covered only by e2e.

## 6. Quality gaps (no tooling in repo)

| Gap | Impact |
|---|---|
| No CI config (`.github/` absent) | nothing runs tsc/vitest/e2e on push; GitHub Pages deploy process is not in the repo (UNKNOWN how `gh-pages` is published) |
| e2e scripts not in `package.json` scripts | easy to forget |
| No axe-core / lint-a11y / Lighthouse in repo | a11y regressions only caught by the 7 vitest a11y tests |
| No console-error gate | warnings/errors can regress silently |
| No coverage tool | no number to track |
| No bundle-size budget | `dist/assets/index-*.js` is 401,148 bytes raw, `drawings-*.js` 308,312 bytes (gzip sizes not re-measured) |
| Dependency pinning is mixed (`adhan` and `dexie`, `@types/node`, `fake-indexeddb` exact; others caret) and `package-lock.json` is the source of truth | upgrade surprises |
| Transitive licences not audited | see 09 §5 |

## 7. Performance and bundle facts (measured/quoted)

* Largest built chunks (raw bytes, `ls -l dist/assets`): index 401,148; drawings 308,312; actions 234,090; actions_ar 228,886. Gzip sizes and what loads on first paint were not re-measured here.
* Perf report (2026-10-23, quoted): tab switch 4,863 → 593 re-renders after the selector refactor; cold first load on slow 4G ≈ 4 s vs a 3 s target (ledger, quoted, not re-measured).
* `public/splash` is 6.2 MB in git (22 PNGs), not precached.

## 8. Things that look like bugs but are intentional

* Today starts empty after onboarding with neutral data (suggestion mode: nothing is added silently).
* Locked-app e2e shows 174 records for a fresh profile: the neutral library and defaults are seeded on first run.
* The tab roots stay mounted while hidden; their store reads are frozen by `tabGate` and caught up on activation.
* `Chip` visible height 32 px but hit box 44 px.
