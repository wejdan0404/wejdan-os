> **ملخص**
> هذا الملف يحصر كل وحدة في «وجدان» (Wejdan Life OS) ويحكم على حالتها بصرامة: جاهزة للإنتاج / جزئية / وهمية (mock).
> الحكم مبني على الكود والاختبارات التي شُغّلت فعلاً (849 اختبار نجح في 63 ملفًا، وسكربتات e2e الخمسة)، وليس على الادّعاءات.
> محدَّث بعد إصلاحات الفحص الثالث: ترحيل القفل صار دائمًا (ترويسة + استرداد + قاعدة رجوع)، وتذكير داخل التدفق، وBidi بدعم Unicode.
> لا توجد أي وحدة وهمية في النسخة المنشورة؛ الأجزاء الجزئية هي منطق موجود في النطاق/المخزن بلا واجهة، أو واجهة بلا اختبار مباشر.

# 04 — Current implementation (module by module)

Baseline: branch `docs/handoff` on top of `main` @ `ed0df23` plus the missing-features wave merged from `integ/features` @ `d982b01` (gate-3, gate-4 and gate-6 fixes merged). App: React 18 + TypeScript + Vite PWA, Arabic-only RTL UI, local-only data.

## 0. How to read the status column

| Status | Meaning used in this file |
|---|---|
| **production-ready** | Implemented end to end (domain + UI where a UI exists), covered by vitest, no known functional gap inside its stated scope. |
| **partial** | Works, but one of: domain logic exists with **no UI caller**; UI exists with **no test that imports it directly**; documented limitation. The reason is always stated. |
| **mock** | Fake data/behaviour shipped to users. **None found in the shipped build** (see §6). |
| **dev-only** | Not reachable in the production bundle. |

Evidence rules: "UI callers" were counted with `grep -rn "<name>" src/ui` (excluding `preview/`). "Tests" = vitest files that import the module (directly or through `src/domain/index.ts`). Test files import the domain mostly through the facade, so per-engine-file test attribution is by test name, not import. Real-device behaviour (iOS Safari standalone, Android) is **NOT VERIFIED** anywhere in this file; only headless Chromium (Playwright 1.47.2, `/opt/pw-browsers/chromium`) was exercised.

Verification run for this document (2026-10-24, Node v22.22.2, npm 10.9.7):

| Command | Result |
|---|---|
| `npx tsc --noEmit` | exit 0, **but it checks 0 files** (root `tsconfig.json` is `files: []` + references). Real type check = `npx tsc --noEmit -p tsconfig.app.json` (exit 0) or `tsc -b` inside `npm run build`. |
| `npm test` (`vitest run`) | **77 files, 849 tests passed**, 0 failed (≈103 s; includes expected stderr noise: React Router v7 future-flag warnings and `act(...)` warnings). Exact per-run record: `13_TESTING_AND_QA.md` §2. |
| `npm run build` | exit 0; Vite 5.4.11; PWA v0.21.1 `precache 155 entries (2403.99 KiB)`. |
| `npm run privacy:scan` | recorded in `13_TESTING_AND_QA.md` §2 (final tree). |
| e2e scripts (`tests/e2e/*.e2e.mjs`) | run by hand; results in `13_TESTING_AND_QA.md` §2. |
| `npm run lint` | does not exist (no script; `@eslint/js` etc. not installed — LOS-037). |

## 1. Product scope as implemented

- 5 tab roots (`src/ui/routes.tsx`): **اليوم** `today`, **عاداتي** `habits`, **مساري** `path`, **متعتي** `joy`, **أنا** `me`; plus a full-screen `/onboarding` route declared in `src/App.tsx`.
- 28 pushed routes in `pushed[]` (+1 dev-only `/me/kit`), all lazy (`lazyWithRetry`).
- Hash router (`HashRouter`), Vite `base: '/wejdan-os/'`.
- All data in IndexedDB (Dexie). **No network code** (see §5 and 11_DATA_STATE_AND_INTEGRATIONS.md).

## 2. Domain layer (`src/domain/`)

| Module | Files | What it does | Status | Evidence / gap |
|---|---|---|---|---|
| Models + JSON codecs | `models.ts` (1901 lines) | All entity types, enums, `XxxJ.fromJson/toJson` codecs, `Settings`/`defaultSettings`, `ModuleState`. Forgiving readers (`core/json.ts`) so malformed/older data never throws. | production-ready | `tests/domain/repository.test.ts` (11), `store.test.ts` (34), export fixtures. `Settings.extra` preserves unknown keys through export. |
| Dates | `core/dates.ts` | Local-day helpers, Dart-compatible weekday (1=Mon..7=Sun), **logical day flips at 04:30** (`kDayBoundaryMinute`). | production-ready | Used by every engine; indirect tests. |
| Day planner | `engine/dayPlanner.ts` (824) | `suggestDay` (**suggestion mode, default**: every candidate returned with a `fit` reason, nothing auto-moved) and legacy `planDay` (auto mode, selectable in Settings → «طريقة خطة اليوم»). `dayLoad`. | production-ready | `tests/domain/dayPlanner.test.ts` (36), `ui2Qa.test.ts` (39), UI `today*.test.tsx`. |
| Suggestion-mode actions | `store.ts` | `acceptSuggestion`, `acceptMany`, `acceptAutoPlan`, `unaccept`, `declineSuggestion`, `setPlannedLevel`, `moveToLater`/`restoreFromLater`/`dropFromLater`, `eveningDecision`. | production-ready | `today.test.tsx` (14), `areaOneUi.test.tsx` (14), `todayF1.test.tsx` (3). |
| Momentum + flexible streak | `engine/momentum.ts` | 7-period EMA (α=0.25, 60-day look-back, rest floor 1.0) = **momentum**; optional **forgiving streak** (`kGraceDaysPerWeek = 2`) behind `Settings.forgivingStreak` («الستريك المرن», **default ON for new installs — awaiting owner approval**, LOS-015); `weekStreakDays`. | production-ready | `tests/domain/flexibleStreak.test.ts` (18), `strengthMomentum.test.ts` (12), `tests/ui/streakReminders.test.tsx` (24). UI: `components/streak/*`, `habits/StreakHero.tsx`. `domainMomentum` has **0 UI callers** (selector exists, unused). |
| Habit strength | `engine/habitStrength.ts` | SRBAI (0–100) + forgiving 28-day consistency. | **partial** | `habitStrengthOf` is shown in Habits/Detail/Garden. But the **SRBAI questionnaire input** (`store.recordStrengthCheck`) has **0 UI callers**: nothing in the UI can create a `strengthChecks` record (only imported ones exist). |
| Recovery | `engine/recovery.ts` | Triggers, reason → proposed `DesignChange`, comeback Spark ×2. | **partial** | Manual path works from `HabitDetailScreen` (`store.startRecovery`, `proposeRecovery`, `acceptDesignChange`; tests `sparksRecovery.test.ts` 13, `area2.test.tsx`). Automatic `recoveryTriggers(s, d)` selector has **0 UI callers** (no automatic prompt). |
| Sparks ✦ | `engine/sparks.ts` | minimum 1 / normal 2 / bonus 3, comeback ×2, weekly review 5, experiment 3, daily cap 20; redeem; reversal on undo. | production-ready | `sparksRecovery.test.ts`; UI Joy/Rewards (`joy.test.tsx` 11, `area4.test.tsx` 20). `sparkLedger` selector 0 UI callers (no ledger screen). |
| Capacity guard | `engine/capacityGuard.ts` | Caps: 3 Grow, 5 Maintain, 2 active projects, 7 core habits, 1 course. | production-ready | `remindersCapacity.test.ts` (18), UI sheet in `HabitStudioScreen`/`DomainWakeSheet` (`area2.test.tsx`). |
| Anchors | `engine/anchors.ts` | Fixed time / wake / sleep / slot anchors; optional prayer-time anchors via `adhan` (Umm al-Qura), **off by default** (`Settings.prayerAnchorsEnabled`). | **partial** | Toggle exists in Settings. Location is `Settings.latitude/longitude` defaulting to Makkah; **no UI to change coordinates** was found (`grep latitude src/ui` → none) — NOT VERIFIED beyond that grep. |
| Reminders — legacy nudge planner | `engine/reminders.ts` | Port of the Flutter notification planner (quiet hours, ignore-to-mute, cap). Planning only. | **partial (dead in UI)** | `reminderPlanFor`/`buildReminderPlan`: **0 UI callers**. Superseded by in-app reminders. `store.recordNudgeResponse`: **0 UI callers**. Tested only in domain (`remindersCapacity.test.ts`). |
| **In-app reminders** | `inAppReminders.ts`, `reminderSelectors.ts` | Reminder times per routine/habit (`Settings.reminderTimes`: keys `routine:am`, `routine:pm`, `habit:<id>`), quiet hours, due computation (`dueRemindersFor`). A reminder shows **only as an in-flow card at the top of Today while the app is open** (not fixed, not portalled; one at a time with a «+N» counter; gate-3 D2). Dismiss/snooze memory is per profile (`wos.reminders.v1.<profileId>`). | production-ready (within that scope) | `inAppReminders.test.ts` (10), `streakReminders.test.tsx`. No Notification API, no push, no background timers: a closed app shows nothing (by decision). |
| **.ics export** | `ics.ts` | RFC 5545 calendar file for reminders; `TZID` + VTIMEZONE for fixed-offset zones (Asia/Riyadh), floating times otherwise; recurring `RRULE`; lead 0/5/10 min. UI: `reminders/CalendarExportSheet.tsx`, `ui/lib/shareFile.ts` (Web Share with file, else download). | production-ready | `tests/domain/ics.test.ts` (9, parsed with `ical.js`). Importing into iOS/Google Calendar was **NOT VERIFIED** on a device. |
| Backup nudge | `backupReminder.ts` | Quiet row after 14 days without a backup file. | production-ready | `backupReminder.test.ts` (4). |
| Dues / payday cycle | `engine/dues.ts` | Bills/BNPL/admin dues; budget month starts on payday (`Settings.paydayDay`, `paydayHistory`). | production-ready | `paydayCycle.test.ts` (9), `area4.test.tsx`. |
| Fresh start | `engine/freshStart.ts` | «بداية جديدة» offer. | **partial** | `freshStartToday` selector: **0 UI callers**. |
| Experiments (N-of-1) | `engine/experiments.ts` | One active experiment, result readout. | **partial** | `startExperiment`/`finishExperiment`/`activeExperiment`/`experimentResult`: **0 UI callers** (only the weekly review stores an `experimentId` field). Domain tested only. |
| Vocabulary SRS | `engine/vocabSrs.ts` | SM-2 style review (again/hard/good/easy). | production-ready | UI in `path/IeltsScreen.tsx` (`addVocabCard`, `reviewVocab`); `qaArea3.test.tsx`. |
| Insights | `engine/insights.ts` | Read-outs from her own logs. | **partial** | `me/InsightsScreen.tsx` exists and is routed (`/me/insights`) but **no test imports it**; engine math is covered only indirectly. |
| Why-today copy | `engine/whyToday.ts` | Bilingual (ar/en) "why" strings. The UI is Arabic-only; the `en` half is unused by any screen (no language switch UI; `Settings.language` is stored but there is no i18n library). | partial (by design) | — |
| Products | `products.ts` | «منتجاتي»: AM/PM care routines generated from products (generic placeholders in seed). | production-ready | `habits.test.tsx`, `area2Routine.test.ts`. |
| Selectors | `selectors.ts` (387) | Pure read-models: `todayView`, `logsOn`, `currentBudgetCycle`, … | production-ready | Used by all screens. |
| Notes & decisions | `features/notes.ts` | Notes, pin, decision flag, links to project/goal/habit/task, tags. | production-ready | `notesSearchSources.test.ts` (16), `notes.test.tsx` (8), `area6.test.tsx` (autosave). |
| Global search | `features/search.ts`, `arabic.ts` | Arabic-normalising search over the snapshot (no index). | production-ready | same tests + `bidiF1.test.ts`. |
| Change log + restore | `features/changelog.ts`, `store.restoreChange` | Cap **300** entries, note autosave coalesced within 2 min, restore puts the "before" version back (restore is itself logged). | production-ready | `notesSearchSources.test.ts`, `sources.test.tsx`, `area5.test.tsx`. |
| Sources & import review | `features/sources.ts` (764) | Parse `.json/.csv/.md/.txt` → candidates → duplicate/conflict detection → approve/edit/ignore → commit with provenance; never touches a day plan. | production-ready | `sources.test.tsx` (8), `notesSearchSources.test.ts`. No network: files are read via `<input type=file>`. |
| Repository (Dexie / memory) | `storage.ts` (673) | `LifeRepository` abstract; `DexieLifeRepository` (Dexie schema **v2**: `records` + plaintext `vault` header table), `InMemoryLifeRepository`, export/import/backups, **quarantine** of undecryptable rows (`quarantined()`). | production-ready | `repository.test.ts` (11), `legacyMigration.test.ts`. |
| Store / facade | `store.ts` (1689), `index.ts` | `LifeStore.create` / `createLifeStore`; write-through then publish a new snapshot. | production-ready | `store.test.ts` (34) + every UI test. |
| Undo tokens | `store.ts` (`remember`, `undoDelete`, `kUndoWindowMs = 10_000`) | Every `delete*` returns an `UndoToken`; completions undo within 10 s. **In memory only** — lost on reload. | production-ready (by design) | `store.test.ts`, `toastPlacement.test.tsx`. |
| Seed / library | `seed/*`, `data/actions*.json` | Neutral starter profile (17 domains, generic products); shipped action library = 132 entries (`kSeedLibraryVersion = 4`), lazy-imported chunks. Optional **personal library** imported by the user (never in the repo): inside the **encrypted database** when the lock is on, in `localStorage` when it is off (`LifeStore.settlePersonalLibrary`). | production-ready | `personalLibrary.test.ts` (4), `vaultPrivateKeys.test.ts` (5). |
| Flutter Hive migration | `migration/flutterHive.ts` (492) | Reads old `wlo_*` IndexedDB DBs (read-only), imports through `importAll` (auto-backup first), marker + 24 h snooze + one re-offer. UI: `ui/state/LegacyMigrationSheet.tsx`, Settings → البيانات. | production-ready | `legacyMigration.test.ts` (12), `legacyReoffer.test.ts` (3), `tests/migration/flutterExport.test.ts` (6, **synthetic** fixture `flutter_export_synthetic.json`), `tests/e2e/legacyMigration.e2e.mjs` and `tests/e2e/sw-takeover/*` (manual; result recorded in its README, not re-run here). `LegacyMigrationSheet` is **not offered while the app lock is on** (`!injected` guard in `LifeStore.tsx`); Settings entry still works. |
| Vault (lock) | `vault/*` | See §3. | production-ready | `vaultCrypto` (12), `vaultPolicy` (8), `vaultMigration` (6), `vaultDurability` (44), `vaultPrivateKeys` (5), `vaultBackup` (1), `lockUi.test.tsx` (9), `lockModalAndErrors` (4), `calmErrors` (3), e2e `lockProfiles` + `lockKill`. |
| Cycle module (private) | `store.addCycleEntry`, `Boxes.cycleEntries`, `Settings.cycleModule` | A toggle + storage + one gated evidence section. | **partial** | `addCycleEntry`/`deleteCycleEntry` have **0 UI callers**: there is no screen to record entries. Only the Settings switch and `EvidenceScreen` gating use it. |
| Errands | `Boxes.errands`, `ErrandJ` | Stored/exported/imported. | **partial** | No `addErrand`/`upsertErrand` in the store and **0 UI**; data can only arrive through import. |
| Aquarium | `snapshot.ts` `RETIRED_DOMAINS` | Retired by owner decision: domain kept in enum/data, forced off, hidden. | production-ready (retired) | Nothing deleted from stored data. |

## 3. Lock, profiles and backups (opt-in)

Gate-3 (release-gate-3) fixed the data-loss and robustness defects of the first lock build; Gate 4 (HOLD) then fixed the turn-off / delete / enable kill-safety (`eed6603`: durable `retired` / `deleted` / `migrating` markers; a missing profile DB is never opened empty), and gate 5 (independent) returned SHIP with two minors (LOS-040, LOS-041). The table describes the state at `ed0df23`; the wave (§4b) did not change the vault except that the weekly-review draft now lives in the encrypted DB while the lock is on. Design details and limits: `17_SECURITY_AND_LIMITATIONS.md` §2.

| Area | Where | Status | Notes |
|---|---|---|---|
| Per-profile encrypted DB | `domain/vault/vault.ts`, `crypto.ts`, `storage.ts` | production-ready | AES-GCM-256 per-record, random IV, AAD = `box\0id`; one data key wrapped under password-derived and recovery-code-derived keys (PBKDF2-SHA256, 310 000 iterations). Data key is a non-extractable `CryptoKey` in memory. |
| **Durable migration (gate-3 D1)** | `Vault.enableWithExisting`, `finalizeLegacy`, `recover()` | production-ready | Turning the lock on: `before-lock` backup → copy → read-back compare → **header row** in the profile DB (table `vault`) → registry (localStorage, compare-and-set) → fresh-connection proof. The **plain pre-lock DB is kept** (`registry.legacy`) and deleted only after a real unlock on a LATER launch. Boot `recover()` rebuilds a lost/partial registry from the headers. Tests: `vaultDurability.test.ts` (75, crash injected at every step), `vaultMigration.test.ts` (6), e2e `lockKill.e2e.mjs` (SIGKILL). Failure before the registry write leaves the plain DB untouched. |
| **Versioned registry (D3)** | `Vault.commit` | production-ready | `rev` + compare-and-set on every write, `storage` event + `BroadcastChannel` refresh. |
| **Quarantine (D4)** | `DexieLifeRepository.tryUnseal`, `LifeStore.quarantined()`, `ui/lock/UnreadableProfile.tsx`, `ProtectionSection.tsx` | production-ready | An undecryptable/tampered row is kept on disk, skipped and reported in Settings; if nothing is readable the unreadable-profile screen offers retry / open a backup file / back. |
| **Modal setup (D7)** | `ui/lock/LockPage.tsx` (`portal`) | production-ready | `role=dialog aria-modal`, focus trap, inert background, Escape, focus return. `tests/ui/lock/lockModalAndErrors.test.tsx` (4). |
| Turn lock on/off | `Vault.enableWithExisting` / `disableLock` | production-ready | Turn-off: copy + verify into the plain DB, mark the encrypted DB `retired`, remove registry, delete encrypted DB. |
| Soft delay on wrong password | `vault/lockPolicy.ts` | production-ready as UX; **not a security control** | Counters live in `localStorage` (registry) — a person with storage access can reset them. Free 4 attempts, then 30 s / 60 s / 2 min / 5 min. |
| Calm errors (D8) | `ui/lock/copy.ts`, `lock.module.css` | production-ready | Lock error messages are Ink text with a Violet icon/underline, no red. `tests/ui/lock/calmErrors.test.tsx` (3). **Exception:** the final delete-profile and turn-off-lock buttons use the `--error` fill (owner call, LOS-039). |
| Auto-lock | `ui/lock/VaultProvider.tsx` | production-ready | `immediate` / `min1` (default) / `min5` / `launch`, via `visibilitychange`+`pagehide`; foreground timers only. `PrivacyCover` neutral overlay. |
| Encrypted export | `ui/lock/backupIO.tsx` + `vault/crypto.ts` | production-ready | Lock on → «تبين الملف مشفّر» (default yes); import accepts plain schemaVersion-1 JSON or encrypted file. |
| Profiles UI | `ui/lock/*` (picker, create/delete sheets, forgot flow, recovery-code step, unreadable-profile) | production-ready | `lockUi.test.tsx` (9), `deviceKeys.test.ts` (3). Avatar radios are named from the Arabic flower registry (D6). Full flow e2e: `tests/e2e/lockProfiles.e2e.mjs`. |
| Device-convenience purge | `ui/lock/deviceKeys.ts` | production-ready | Purges a fixed prefix list (incl. per-profile reminder memory `wos.reminders.v1*` and any stray `wejdan.personalActionLibrary*`) on manual lock/switch/delete; **not** on auto-lock (by design). Reminder memory moves from the plain key to the first profile's key when the lock is turned on (`adoptReminderMemory`) and is purged when it is turned off. |
| Plaintext residuals | `vault.ts` header | **documented limitation** | Database/box names, ids (incl. semantic ids), counts, registry+header metadata, the plain pre-lock DB during the rollback window, per-device conveniences, old Flutter DBs. See 17 §2.2 and LOS-032/034/035. |

## 4. UI areas

Routes are registered only in `src/ui/routes.tsx` (+ `/onboarding` in `App.tsx`). "Direct test" = a vitest file imports the screen module; "no direct test" does not prove it is untested (it can render through `AppShell`) — **NOT VERIFIED** without a coverage run (`@vitest/coverage-v8` is not installed).

| Area | Route(s) | File(s) | Status | Notes |
|---|---|---|---|---|
| Shell / navigation | all | `shell/AppShell.tsx` (288), `stack.ts`, `stackFocus.ts`, `navigate.tsx`, `state/tabGate.ts` | production-ready | Kept-alive tab roots with a store-read gate; slide/swipe-back stack; fullscreen routes hide the tab bar. `tabGate.test.tsx`, `a11y.test.tsx`. |
| Today | `/today`, `/today/item/:id`, `/brief` (fullscreen), `/evening`, `/focus/:id` | `screens/today/*` | production-ready except Focus | Focus: `FocusScreen.tsx` has **no direct test** (only `focusSession.ts` is tested); a focus block is a `fixedEvent` with `isFocusBlock` removed at next boot. |
| Quick add + FAB | sheet | `today/QuickAddSheet.tsx`, `components/Fab.tsx` | production-ready | `today.test.tsx`, `toastClearance.e2e.mjs`. |
| Habits | `/habits`, `/habits/:id`, `/habits/garden`, `/studio`, `/routine/(am|pm|weekly)[/play]`, `/me/products` | `screens/habits/*`, `components/flowers/*`, `components/streak/*` | production-ready | Flowers sprite (`flowers/sprite.ts`, `drawings.json`) renders one `<use>` per habit; `garden.test.tsx` (7). `DomainWakeSheet` has no direct test. |
| Path | `/path`, `/path/project/:id`, `/path/ielts`, `/path/driving` | `screens/path/*` | production-ready | `path.test.tsx` (9), `qaArea3.test.tsx` (8). |
| Joy / Rewards | `/joy`, `/joy/reward` | `screens/joy/*` | production-ready | `joy.test.tsx` (11); `JoyEditSheet` via Joy tests only. |
| Me hub | `/me` | `me/MeScreen.tsx` | production-ready | `me.test.tsx` (6). |
| Inbox, Money, Home admin, Weekly review, Evidence, Help | `/me/inbox`, `/me/money`, `/me/home`, `/review` (fullscreen), `/me/evidence`, `/help` | `screens/me/*` | production-ready | `area5.test.tsx` (17), `area4.test.tsx` (20), `me.test.tsx`. Help carries static emergency numbers (`tel:` links only). |
| Insights | `/me/insights` | `me/InsightsScreen.tsx` | partial | no direct test (see §2). |
| Onboarding + first-run restore | `/onboarding` | `me/OnboardingScreen.tsx`, `OnboardingRestore.tsx`, `state/onboardingResume.ts` | production-ready | `me.test.tsx`, `n2n5.test.tsx`; `OnboardingRestore` has no direct test (reached through Onboarding). |
| Settings | `/me/settings` | `me/SettingsScreen.tsx` (427), `reminders/SettingsRows.tsx`, `lock/ProtectionSection.tsx` | production-ready | Appearance, plan mode, payday, reminders, import/export, auto-backups list (last 5), personal library, delete-all (two steps). |
| Reminders | `/me/reminders` | `screens/reminders/*` | production-ready | `streakReminders.test.tsx` (24); `ReminderTimeSheet`/`TimeWheel` no direct test. Banner: `TodayReminderBanner` (in-flow card, `role=alert`) + `useDueReminders` (60 s tick + visibility, per-profile memory). |
| Notes + Search | `/me/notes`, `/me/notes/(new|:id)` (fullscreen), search sheet | `screens/notes/*` | production-ready | `notes.test.tsx` (8), `area6.test.tsx`. |
| Sources / import review / change log | `/me/sources`, `/me/sources/review/:id` (fullscreen), `/me/changelog` | `screens/sources/*` | production-ready | `sources.test.tsx` (8). |
| Legacy migration sheet | boot | `state/LegacyMigrationSheet.tsx` | production-ready | no direct vitest; domain tests + manual e2e only. |
| PWA update prompt | boot | `src/pwa/*` | production-ready | `registerType: 'prompt'`; `legacyCleanup.test.ts` (5). `UpdatePrompt`/`state.ts` have no direct test; there is no update-flow e2e in the repo — the prompt-update path is NOT VERIFIED here. |
| Error handling | app + per-route | `components/ErrorBoundary.tsx`, `lib/lazyRetry.ts` | production-ready | `a11y.test.tsx` (#8); `lib/lazyRetry.ts` is imported by only one test file (`area6.test.tsx`). |
| Design components | — | `components/*` (38 `.ts/.tsx` files incl. `flowers/`, `streak/`; `Bidi` now uses Unicode property escapes, gate-3 D5, `bidiG3.test.ts` 37 rows) | mixed | Four components have **no production importer** of the component itself (only the dev `KitScreen`): `EnergySegmented` (its CSS module is still imported by `TodayEnergy`), `MorphCard`, `ProductStep`, `SectionHeader` → dead code in the shipped bundle. |
| Dev gallery `KitScreen` | `/me/kit` (and `/kit`) | `me/KitScreen.tsx` | **dev-only** | Registered only under `import.meta.env.DEV`. |
| Visual `preview/` pages | `src/ui/screens/{today,habits,notes,sources}/preview/index.html` | 4 dirs | **dev-only** | Seeded in-memory visual harnesses; not in the Vite build input (only root `index.html`). Served by `vite` dev at `/wejdan-os/src/ui/screens/<area>/preview/index.html` (HTTP 200 verified). |

## 4b. Missing-features wave (areas A to G), built on `integ/features` and merged into this branch

Source of truth for intent: the specs in `docs/design/*.md` (16 files, in the repo). Source of truth for what the independent reviewers saw: release gates 6 and 7 (local-only reports, PER-REPORT, read by the author of this package) and `design-vs-build.md` (local-only inventory written BEFORE the wave, against `ed0df23`; its "no" rows are the wave's input, not its current state). All of it is local, Arabic-only, no network, no schema version change (Dexie stays at v2; the new box `moneyEnvelopes` and the `ieltsDriving` blob in `meta` ride in the existing `records` table).

| Area | What is built | Code | Spec | Tests |
|---|---|---|---|---|
| A | Weekly review as 10 steps (wins, important, deferred, blockers + one fix, pause, strength check, season adjust, top 3, week experiment, close with chapter card); progress thread is dots (gate-6 D1); draft survives reload and is kept inside the encrypted DB while the lock is on | `src/ui/screens/me/WeeklyReviewScreen.tsx`, `me/review/*`, `me/reviewDraft.ts`, `domain/engine/reviewInsights.ts`, store `getReviewDraftRaw/setReviewDraftRaw/clearReviewDraftRaw` | `weekly-review-depth.md` | `tests/domain/reviewInsightsCelebrations.test.ts` (14), `tests/ui/me/reviewInsightsCelebrations.test.tsx` (11) |
| A | Insights: momentum by domain bars, return-speed line, experiment result card (keep / revert), each chart with a table alternative | `me/InsightsScreen.tsx`, `ui/components/charts/*`, `me/review/ExperimentResultCard.tsx` | `insights-depth.md` | same files |
| A | Celebrations history «احتفالاتي» (milestones, comebacks, closed chapters, finished experiments; derived, no new storage), route `/joy/celebrations` | `joy/CelebrationsScreen.tsx`, `domain/engine/celebrations.ts` | `celebrations.md` | same files |
| B | Today grouped by tier (الأساسيات / الصيانة), «يومك جاهز» card (counts, progress, momentum ring), inline level chip (أدنى / عادي / زيادة), free-joy card, week strip, all-done «يومك كمل» | `today/TodayScreen.tsx`, `DayReady.tsx`, `LevelStrip.tsx`, `FreeJoyCard.tsx`, `WeekStrip.tsx`, `domain/todaySummary.ts` | `today-calm.md` | `tests/domain/todaySummary.test.ts` (8), `tests/ui/today/todayCalm.test.tsx` (3), `gate6Fixes.test.tsx` (4) |
| B | Calm day (low energy) at `/today/calm`: three minimum items, what rests, Help link; writes nothing on render | `today/CalmDayScreen.tsx` | `today-calm.md` | same |
| C | Joy map (small / medium / big), reserved-joy bundles (max 3, one per habit), spark chip on Joy | `joy/JoyMap.tsx`, `JoyBundles.tsx`, `JoyEditSheet.tsx`, `domain/joyMap.ts` | `joy-map.md` | `tests/domain/moneyJoy.test.ts` (13), `tests/ui/money/envelopesJoy.test.tsx` (8) |
| C | Money: per-category monthly envelopes inside the payday cycle; payday saving reminder (day and time chosen by her; the app never moves or suggests money) | `me/MoneyEnvelopes.tsx`, `SavingReminderCard.tsx`, `MoneyScreen.tsx`, `domain/money.ts`, `engine/reminders.ts`, `inAppReminders.ts`, `ics.ts` | `money-envelopes.md`, `payday-saving-reminder.md` | same |
| D | Focus finish: try-first tip, phone-away card with «الإشعارات صامتة» pill (only after she confirms; the app cannot silence the phone), retrieval question saved as a note | `today/FocusScreen.tsx`, `FocusExtras.tsx`, `domain/features/focusRecall.ts` | `focus-finish.md` | `tests/domain/featureD.test.ts` (14), `tests/ui/featD/featD.test.tsx` (9) |
| D | Home: 10-minute tidy timer, weekly zone, batched errands | `me/HomeTidy.tsx`, `HomeAdminScreen.tsx`, `domain/features/homeTidy.ts` | `home-tidy.md` | same |
| D | Evidence: strength filter (counts, composes with search) and «أضيفيها لعاداتي» (Habit and Routine-step entries only; idempotent id `h_ev_<actionId>`) | `me/EvidenceScreen.tsx`, `domain/features/evidenceLib.ts` | `evidence-strength.md` | same |
| D | Settings: daily reminder cap (0-6, default 4), optional-modules list (cycle tracking off by default; IELTS, driving, career, faith, people switchable), app-wide storage-unavailable banner | `me/SettingsExtras.tsx`, `domain/features/modules.ts`, `ui/state/StorageBanner.tsx` | `settings-extras.md` | same |
| E | Habit Studio 9-step wizard with progress, evidence-library prefill (fields marked «مقترح», undo), quick form kept at `/studio?mode=quick` | `habits/HabitStudioWizard.tsx`, `StudioEntry.tsx`, `domain/studio/habitWizard.ts` | `habit-studio-wizard.md` | `tests/domain/studioWizard.test.ts` (10), `tests/ui/studio/studioWizard.test.tsx` (7) |
| E | Onboarding life map: grow / maintain / rest per domain, caps 3 / 5, live counters; draft resumes | `me/LifeMapStep.tsx`, `OnboardingScreen.tsx`, `domain/studio/lifeMap.ts`, `habits/DomainWakeSheet.tsx` | `onboarding-life-map.md` | same |
| F | IELTS: practice stats (sessions this month, 30-day commitment arc against her own goal, week dots), target band and current level she fills | `path/IeltsScreen.tsx`, `path/f/IeltsStats.tsx`, `domain/features/ieltsDriving.ts` | `ielts-stats.md` | `tests/domain/ieltsDriving.test.ts` (9), `tests/ui/path/ieltsDriving.test.tsx` (6) |
| F | Driving as owner-fillable mechanisms: staged road (one seeded guide stage; every other step is hers and wears «ما تأكدت من المصدر» until she marks it «مؤكدة»), supervised-practice log with conditions variety, weekly hazard practice goal, spaced quiz with her own questions. No official procedure, hours, fees, clips or question bank is shipped | `path/DrivingScreen.tsx`, `path/f/RoadSection.tsx`, `HazardCard.tsx`, `QuizCard.tsx`, `PracticeLog.tsx`, `domain/features/ieltsDrivingActions.ts` | `driving-road-quiz-hazard.md` | same |
| G | Onboarding step «وش يفرّحك؟»: starts the joy map (five neutral suggestion chips; idempotent ids `joy_onb_<key>`), bundles only when habits exist; skip writes nothing | `joy/JoyOnboardingStep.tsx`, `me/onboardingExtraSteps.tsx` | `joy-onboarding.md` | `tests/ui/joy/joyOnboarding.test.tsx` (4) |

Honesty properties worth keeping (checked by gate 6 section 4): no medical, driving-regulation or exam numbers are asserted by the app; every number shown is derived from her own data or from the evidence library's own `evidence_strength` field; user-entered links are http/https only and open with `rel="noopener noreferrer"`.

Hand-run e2e scripts added by the wave (in `tests/e2e/`): `reviewInsightsCelebrations`, `todayCalm`, `moneyJoy`, `featureD`, `studioOnboarding`, `ieltsDriving`, `joyOnboarding`. Status of each: `13_TESTING_AND_QA.md` §2.

## 5. PWA and takeover

| Item | Status | Evidence |
|---|---|---|
| Workbox precache, offline after first load | production-ready | `vite.config.ts`: `globPatterns` js/css/html/png/svg/woff2/json/webmanifest; build log `precache 155 entries (2403.99 KiB)`; offline reload asserted in `lockProfiles.e2e.mjs` (not re-run). |
| Prompt-update | production-ready | `registerType: 'prompt'`, `clientsClaim: false`, `skipWaiting: false`; user taps «حدّثي» → `updateSW(true)`. Hourly + on-visible `reg.update()`. |
| Action-library chunks excluded from precache, cached on first use | production-ready | `globIgnores` `**/actions-*.js`, `**/actions_ar-*.js` + `runtimeCaching` `CacheFirst` cache `wejdan-action-library` (max 6 entries). Risk: a first-ever offline launch cannot load the library → `createLifeStore` seeding would fail (catch path only covers *library refresh* on an already seeded DB). |
| Flutter→React takeover shims | production-ready | `public/flutter_service_worker.js` (kill-switch: clears `flutter*` caches, unregisters itself, reloads windows with `?r=`), `flutter_bootstrap.js`/`flutter.js`/`main.dart.js` (redirect shims, max 3 hops via `sessionStorage`), `src/pwa/legacyCleanup.ts` (unregisters any worker that is not `/sw.js`, deletes `flutter*` caches, strips `?r=`; never touches IndexedDB). Excluded from precache. Manual scenarios `plain|cachingsw|expiredSubres` recorded in `tests/e2e/sw-takeover/README.md` (2026-10-24) — **not re-run** here. |
| Persistent storage request | partial | `pwa/state.ts` asks `navigator.storage.persist()` once per device (`wejdan.persistRequested`). The status hook `usePersistentStorage()` has **0 callers in `src/ui`**: the user is never shown whether storage is protected. |
| iOS splash images | partial | 22 PNGs in `public/splash`, linked from `index.html`; excluded from precache. the generator is `scripts/brand/generate-brand-assets.mjs` (`npm run brand:assets`, not run now; an old `index.html` comment named a non-existent Python script and was corrected in the handoff branch, see 14 B2). |

## 6. What is mocked, fake or simulated

- **Shipped build:** nothing. No fake API, no sample user data, no placeholder network. The only "placeholder" data are generic editable product rows (`Product.placeholder`) in the neutral seed.
- **In-memory repository** (`InMemoryLifeRepository`) is a runtime fallback when IndexedDB is blocked or hangs > 5 s (`openBestRepository`); UI then shows the banner «هالمتصفح ما يحفظ…» (`persistent === false`).
- **Tests/dev only:** `fake-indexeddb`, `tests/domain/fixtures/*`, `tests/fixtures/migration/*`, the four `preview/` harnesses.

## 7. Known gaps summary (strict)

0. Design-vs-build rows from the pre-wave inventory that are still NOT built are listed in `18_REMAINING_BACKLOG.md` (LOS-045); driving and IELTS data have no change-log entries (LOS-046).

1. Domain logic with no UI (re-checked after the wave): cycle entries, fresh-start, automatic recovery triggers, legacy nudge planner, spark ledger. The wave gave UI to the strength check, experiments, errands and `domainMomentum` (§4b). **NOT VERIFIED:** the other items were not re-grepped.
2. No language switch; Arabic strings are hard-coded in components (no i18n library).
3. No real-device verification (iOS/Android) of PWA install, `.ics` import, Web Share (DEFERRED-BY-OWNER).
4. Lint cannot run (LOS-037).
5. Four components have no production importer (`EnergySegmented` — only its CSS module is reused by `TodayEnergy` —, `MorphCard`, `ProductStep`, `SectionHeader`). The stale `index.html` generator comment was corrected in this branch.
6. Prayer anchors have no coordinates UI.
7. e2e scripts are manual (not wired into `npm test`), depend on `/opt/pw-browsers/chromium` unless `CHROMIUM` is set.
8. The migration fixtures are **synthetic** now (`tests/fixtures/migration/flutter_export_synthetic.json`, commit `da4c839`). The older local history still contains the real-derived one — hence the single-snapshot public push (`16_DEVELOPMENT_HISTORY.md` §0).
9. The lock's plaintext residuals (17 §2.2), including the plain pre-lock DB during the rollback window.
10. Nine `npm audit` findings are open (LOS-033).
