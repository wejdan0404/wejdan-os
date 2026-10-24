> **ملخص**
> دليل مشروح لشجرة المشروع: كل مجلد وملف مهم مع غرضه وأهم صادراته ومن يستورده وحالته ومخاطره.
> «المستوردون» مشتقّة بسكربت يحلّل عبارات import/dynamic import على كامل src وtests (النتائج بالأعداد؛ الأسماء للأمثلة).
> اقرأ أولاً: src/domain/index.ts (واجهة النطاق)، ثم store.ts، ثم src/ui/routes.tsx وAppShell.tsx.

# 06 — Codebase guide

Repository root = a single Vite app named `wejdan-os-web` (`package.json` v0.1.0, `"type": "module"`, private). **334 files under `src/`** (`git ls-files src`; 249 of them `.ts`/`.tsx`), **39 175 lines of `.ts`/`.tsx` in `src/`**, **13 458 lines in `src/domain`** (`wc -l`), 77 vitest files (counts re-taken on `d982b01` + the handoff docs; the "imported by" numbers below are from the first-draft script and were not recomputed except where noted).

How "imported by" was derived: a Node script (kept outside the repo) parsed every `from '…'`, `import('…')` and side-effect import in `src/**` and `tests/**` with relative specifiers, resolved them to files, and inverted the graph. "src N / t M" = N importing files under `src/` (excluding the dev `preview/` harnesses unless noted) and M test files. Non-relative imports (npm packages, `virtual:pwa-register`) are covered in 10_DEPENDENCIES_AND_TOOLS.md. A test file that imports only `src/domain/index.ts` counts toward that facade, not toward the individual engine file.

Status column: **core** = on the production path; **dev** = dev-only; **data** = static asset; **dead** = no production importer.

## 1. Repository root

| Path | Purpose | Status / risk |
|---|---|---|
| `package.json`, `package-lock.json` (lockfileVersion 3) | Scripts: `dev`, `build` (`tsc -b && vite build`), `preview`, `test` (`vitest run`), `brand:assets`, `privacy:scan`. No `lint`, no `typecheck` script. | core. See 10_*. |
| `vite.config.ts` | `base: '/wejdan-os/'`, React plugin, `preloadFirstPaintFonts` plugin (build only), `VitePWA` (prompt update, workbox globs/ignores, runtime cache for the action library, manifest), `manualChunks` (`react`, `motion`), vitest config (jsdom, `globals`, `setupFiles: tests/setup.ts`, include `tests/**` + `src/**` `*.test.ts(x)`, `css: false`, `testTimeout: 20000`). | core. Single file configures build + PWA + tests. |
| `index.html` | Entry. `lang="ar" dir="rtl"`, theme-color metas, iOS startup-image links (22), `<title>وجدان</title>`. All asset links are absolute `/wejdan-os/…`. | core. (The stale generator comment was corrected in the handoff branch.) |
| `tsconfig.json` | Solution file: `files: []` + references to app/node configs. **`tsc --noEmit` at root checks nothing.** | risk: false-green typecheck. |
| `tsconfig.app.json` | strict, `noUnusedLocals/Parameters`, `moduleResolution: Bundler`, types `vitest/globals` + `@testing-library/jest-dom`, includes `src` and `tests`. | core. |
| `tsconfig.node.json` | Covers `vite.config.ts` only. | core. |
| `eslint.config.js` | Flat config importing `@eslint/js`, `globals`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `typescript-eslint` — **none declared or installed**. | broken; cannot run. |
| `README.md` | Project summary (EN + short AR), verified commands, links to `docs/handoff/`. | core (rewritten in the handoff branch). |
| `AGENTS.md`, `CODEX_START_HERE.md` | Operational rules for coding agents; first-day orientation. | core (new in the handoff branch). |
| `.gitignore` | `node_modules`, `dist`, `dist-ssr`, `*.local`, `*.log`, `.vite`, `coverage`, editor dirs. | core. |
| `public/` | Static files copied verbatim into `dist/` (see §6). | core. |
| `scripts/privacy-scan.mjs`, `scripts/privacy-denylist.txt` | `npm run privacy:scan` — fails on token/e-mail/phone patterns, forbidden file names and deny-list literals in `git ls-files`; prints locations only. An optional git-ignored a local `privacy-denylist.local.txt` next to it adds owner-specific strings. | core; run before every publish. |
| `scripts/brand/` | `generate-brand-assets.mjs` + `plex-sans-arabic-500-subset.ttf`; renders PNG icons/splash from `public/brand/w-*.svg` with `@resvg/resvg-js`. | dev tool; overwrites `public/icons`, `public/splash`, `apple-touch-icon.png`, `favicon-48.png`. Not run in this pass. |
| `tests/` | See §7. | — |
| `docs/handoff/` | This handoff package. | — |

## 2. `src/` entry files

| File | Purpose | Key exports | Imported by |
|---|---|---|---|
| `main.tsx` | Imports fonts + `tokens.css` + `base.css`, sets `lang/dir`, renders `<App/>` in `StrictMode`, imports `./pwa` (boot side effects). | — | Vite entry (`index.html`). |
| `App.tsx` | Provider tree and top-level routes (see 05 §2.6). | default `App` | `main.tsx`. |
| `vite-env.d.ts` | `vite/client` + `vite-plugin-pwa/client` types. | — | ambient. |

## 3. `src/domain/` — framework-free domain (no React, no `src/ui` import)

Facade: `index.ts` re-exports `models`, `core/dates`, `Json`, every engine, `inAppReminders`, `reminderSelectors`, `products`, `seed/*`, `snapshot`, `selectors`, `features`, `storage`, `store`, `migration/flutterHive`, `ics`, `backupReminder`. **`vault/` is NOT re-exported** — UI imports it from `domain/vault`. Facade importers: src 66 / tests 50.

| File | Purpose | Key exports | Imported by | Status / risk |
|---|---|---|---|---|
| `index.ts` (116) | Facade + long usage manual in the header comment (the best API overview). | `export *` of the above | src 66 / t 50 | core. Header doc is authoritative on action names. |
| `models.ts` (1901) | Entity interfaces, enum tuples (`DOMAIN_IDS` = 17 incl. retired `aquarium`), codecs `HabitJ`, `TaskItemJ`, …, `Settings`, `defaultSettings`, `SettingsJ`, `ModuleState`, `evidenceUrl`. | many | src 28 (+ facade) | core. Largest file; any schema change must touch codec + export + tests. |
| `core/json.ts` | `Json`, forgiving readers `jStr/jInt/jMap/…`, `asJson`. | | src 10 | core. |
| `core/dates.ts` | `dayKey`, `parseDayKey`, `logicalDay` (04:30), `mkDate`, `addDays`, `startOfWeek`, `toIsoLocal`, `minuteOfDay`, `weekday`. | | src 25 | core. Dart-style weekday 1..7. |
| `store.ts` (1689) | `LifeStore`, `createLifeStore`, `UndoToken`, `kUndoWindowMs`, import/review pipeline, change-log, backups facade. | | src 1 (facade) | core. Single large class; no mutation queue. |
| `snapshot.ts` | `LifeSnapshot`, `loadSnapshot`, `snapshotHabit/Action`, `upsertById`, `currentSeason`, `RETIRED_DOMAINS`. | | src 7 | core. |
| `selectors.ts` (387) | `todayView`, `logsOn`, `suggestionsFor`, `acceptedPlanFor`, `currentBudgetCycle`, `habitStrengthOf`, … | | src 3 (+ facade) | core. |
| `storage.ts` (673) | `Boxes`, `kFlutterBoxes`, `kWebBoxes`, `LifeRepository`, `DexieLifeRepository`, `InMemoryLifeRepository`, `openBestRepository`, `databaseExists`, `deleteDatabase`, `listDatabaseNames`, `readDatabaseHeader` / `writeDatabaseHeader`, `QuarantinedRecord`, `kExportSchemaVersion = 1`, `kMaxBackups = 5`, `RowCipher`. Dexie schema v2 (`records` + `vault` header table). | | src 5 | core. Data-layer contract; see 11_*. |
| `engine/dayPlanner.ts` (824) | `planDay`, `suggestDay`, `dayLoad`, `sortPlanItems`, caps (`kMaxCore = 3`…). | | src 3 | core. Largest engine. |
| `engine/momentum.ts` | EMA momentum, `forgivingStreak`, `weekStreakDays`, `kGraceDaysPerWeek`. | | src 2 | core. |
| `engine/habitStrength.ts` | SRBAI + 28-day consistency. | | src 2 | partial (no SRBAI input UI). |
| `engine/recovery.ts` | Recovery triggers/proposals/`applyDesignChange`. | | src 5 | partial (auto triggers unused by UI). |
| `engine/sparks.ts` | Award/redeem/reversal rules. | | src 3 | core. |
| `engine/dues.ts` | Money/admin dues + payday cycle. | | src 3 | core. |
| `engine/reminders.ts` | Legacy nudge planner (planning only). | | src 3 | dead in UI. |
| `engine/anchors.ts` | Cue anchors; `adhan` prayer times. | | src 4 | core (prayer off by default). |
| `engine/capacityGuard.ts`, `experiments.ts`, `freshStart.ts`, `insights.ts`, `vocabSrs.ts`, `whyToday.ts`, `history.ts` | Capacity caps; N-of-1; fresh start; insights; SM-2; bilingual copy; log→occurrence helpers. | | src 1–9 each | `experiments`/`freshStart` have no UI caller. |
| `inAppReminders.ts`, `reminderSelectors.ts` | Reminder rows/keys (`routine:am|pm`, `habit:<id>`), due computation. | `explicitReminders`, `dueRemindersFor` | src 4 / 1 | core. |
| `ics.ts` | `buildIcs`, `ICS_FILE_NAME`, `fixedZoneOffset`, `rruleFor`, `foldLine`. | | src 1 (facade) | core. |
| `backupReminder.ts` | `backupReminder`, `kBackupReminderDays = 14`. | | src 1 | core. |
| `products.ts` | Product-driven AM/PM routines. | | src 5 | core. |
| `features/{notes,search,arabic,changelog,sources,selectors,index}.ts` | Notes & decisions; Arabic-aware search; change log (`kMaxChangeLog = 300`); source import pipeline (764 lines); read-models. | | src 1–6 each | core. |
| `seed/seedLibrary.ts` | `loadShippedLibrary` (lazy `import('../data/actions*.json')`), `kSeedLibraryVersion = 4`, `parseSeedLibrary`. | | src 4 | core. |
| `seed/starterProfile.ts` | Neutral starter profile + `starterHabitOptions`. | | src 3 | core. |
| `seed/personalLibrary.ts` | Optional user-imported personal library: `localStorage` key `wejdan.personalActionLibrary.v1` with the lock off; a row in the encrypted DB (`meta` / `personalLibrary`, managed by `LifeStore`) with the lock on. | | src 4 | core. **Never commit any such file.** |
| `data/actions.json` (266 KB), `data/actions_ar.json` (241 KB) | Shipped neutral evidence/action library, 132 entries. | | src 1 each (+ tests 5) | data. Built into lazy chunks `actions-*.js` / `actions_ar-*.js` (231 kB / 140 kB raw). |
| `migration/flutterHive.ts` (492) | Read `wlo_*` DBs, `migrateLegacyData`, marker/snooze/re-offer keys. | | src 1 | core. |
| `vault/{crypto,credentials,lockPolicy,vault,index}.ts` | See 05 §2.4 and §5. `vault.ts` (948 lines): `Vault` (registry + headers + recovery + migrations), `Session`, `VaultHooks`/`SimulatedCrash` (test fault injection). | `Vault`, `Session`, `createEnvelope`, `encryptBackup`, `SimulatedCrash` | `vault/index.ts` ← src 13 / t 9 (re-counted) | core. Security-sensitive: change only with the `vault*` tests (`vaultCrypto`, `vaultPolicy`, `vaultMigration`, `vaultDurability`, `vaultPrivateKeys`, `vaultBackup`) and `lockProfiles` + `lockKill` e2e green. |

## 4. `src/ui/` — React layer

### 4.1 Shell, state, routing

| File | Purpose | Key exports | Imported by | Status / risk |
|---|---|---|---|---|
| `routes.tsx` | **Only place routes are declared**: `tabRoots` (5), `pushed[]` (28 + dev `/me/kit`), `OnboardingScreen`, `resolvePushed`, `isFullscreenRoute`. Regex patterns, first match wins. | | App.tsx, AppShell.tsx | core. Order matters (`/habits/garden` before `/habits/:id`; `/me/notes/(new|:id)` before `/me/notes`). |
| `shell/AppShell.tsx` (288) | Kept-alive tabs, pushed-screen stack with spring/swipe-back, focus handling, FAB + quick add. | `AppShell` | App.tsx, 4 dev previews, t 1 | core; complex animation/focus code. |
| `shell/stack.ts`, `stackFocus.ts`, `navigate.tsx`, `theme.tsx` | Stack context; focus move/restore; stable navigate provider; theme provider (`localStorage['wejdan.theme']`, `data-theme`, dynamic `theme-color` meta). | `StackContext`, `useTheme` | src 13 / 1 / 8 / 6 | core. |
| `state/LifeStore.tsx` | Store provider + hooks (05 §2.5). | `LifeStoreProvider`, `useLife`, `useLifeSelector`, `useStore`, `useToday`, `shallowEqual` | src 47 / t 16 | core. |
| `state/tabGate.ts` | Freeze hidden tabs. | `TabGateContext`, `createTabGate` | AppShell, LifeStore | core. |
| `state/onboardingResume.ts` | Onboarding draft/intended-route memory (`wejdan.onboarding.*`). | | OnboardingScreen, SettingsScreen, AppShell | core. |
| `state/LegacyMigrationSheet.tsx` | Boot offer/re-offer UI for old Flutter data. | `kLegacyReviewHash` | LifeStore.tsx | core; no direct test. |
| `motion.ts` | Duration/easing/spring tokens. | `dur`, `ease`, `springs` | src 31 | core. |
| `fonts.ts` | Imports self-hosted `@fontsource` CSS (IBM Plex Sans Arabic 400–700, IBM Plex Sans 400–600, El Messiri 500/700). | | main.tsx + 4 previews | core. |
| `icons/Icon.tsx` | Outline icon set, `IconName` union. | | src 46 | core. |
| `styles/tokens.css` (319), `base.css` (115) | Design tokens (light/dark via `[data-theme]` and media query), base resets. Header comment now says the identity brief is local-only (the private scratch path was removed in the handoff branch). | | main.tsx + 4 previews | core. |
| `lib/*` | `plural.ts` (Arabic counted nouns, 19 importers), `number.ts` (Arabic-digit parsing), `textDir.ts` (auto bidi), `streakText.ts`, `domains.ts` (domain labels), `flashTarget.ts` (scroll/flash a target), `shareFile.ts` (Web Share or download), `lazyRetry.ts` (lazy with retry). | | see §4.3 | core. |

### 4.2 `src/ui/lock/` — lock & profiles UI (opt-in)

`VaultProvider.tsx` (owns `Session`, auto-lock, `getVault()` singleton, runs `recoverOnce()` at boot), `LockGate.tsx` (locked screens), `UnreadableProfile.tsx` (opened but nothing readable: retry / open backup / back), `UnlockScreen.tsx`, `ProfilePicker.tsx`, `ProfileSheets.tsx` (create/delete), `ForgotFlow.tsx`, `RecoveryCodeStep.tsx`, `LockSetup.tsx`, `ProtectionSection.tsx` (Settings entry), `MeProfile.tsx`, `ProfileAvatar.tsx`, `PrivacyCover.tsx`, `backupIO.tsx` (encrypted/plain export & import prompts), `deviceKeys.ts` (`purgeDeviceConveniences`, per-profile `remindersKey`, `adoptReminderMemory`, `purgeReminderMemory`), `context.ts`, `injection.ts` (`LifeStoreInjection`), `copy.ts` (all Arabic strings `T`), `fields.tsx`, `LockIcons.tsx`, `LockPage.tsx`, `lock.module.css`. Only `VaultProvider` is imported from `App.tsx`; the rest are reached through it, `SettingsScreen` and `MeScreen`. Tests: `tests/ui/lock/*`, `tests/domain/vault*.test.ts`.

### 4.3 `src/ui/components/` — shared design components (38 `.ts/.tsx` incl. subfolders)

Most used (importers src): `Button` 52, `Bidi` 50, `ListRow` 41, `InsetGroupedList` 39, `Toast` 35 (+t 19), `Screen` 33, `Sheet` 30, `StarMark` 27, `EmptyState` 22, `SegmentedControl` 19. Others: `Chip`, `Switch`, `ContextMenu`, `TimeField`, `ProgressArc`, `PaydayCard`, `PostponeSheet`, `WMark`/`wPath.ts` (the W logo), `StarDottedLine`, `CheckCircle`, `TabBar`, `Fab`, `HeroNextStep`, `InboxItem`, `Skeleton`, `ErrorBoundary`. Subfolders: `flowers/` (`Flower.tsx`, `flowers.ts`, `sprite.ts` symbol sprite, `drawings.json` ≈ 308 kB chunk `drawings-*.js`), `streak/` (`StreakChip`, `WeekDots`, `streakIcons`).
**Dead in production** (only imported by dev `KitScreen`): `EnergySegmented`, `MorphCard`, `ProductStep`, `SectionHeader`.
CSS Modules (`*.module.css`) sit beside each component; `css: false` in vitest means CSS is not applied in unit tests.

### 4.4 `src/ui/screens/<area>/`

Every `*Screen.tsx` default export is imported by exactly one place: a lazy import in `routes.tsx` (the `TodayScreen`, `HabitsScreen`, `PathScreen`, `JoyScreen`, `MeScreen` are the tab roots). Kit/helper files (non-screen) and who imports them:

| Area | Files (lines) | Notes |
|---|---|---|
| `today/` | `TodayScreen` (543), `MorningBriefScreen`, `EveningScreen`, `FocusScreen`, `ItemDetailScreen`, `QuickAddSheet` (+ AppShell), `LaterSheet`, `TodayEnergy`, `RoutineThread`, `Glyph`, `lib.ts` (src 9), `useTodayModel.ts` (src 5), `focusSession.ts` (localStorage `wejdan.focus.v1`) | Biggest screen; `preview/` harness (dev). |
| `habits/` | `HabitsScreen`, `HabitDetailScreen`, `HabitStudioScreen` (377), `GardenScreen`, `RoutineScreen`, `RoutinePlayerScreen`, `ProductsScreen` (447), `StreakHero`, `DomainWakeSheet`, `shared.tsx` (src 9) | |
| `path/` | `PathScreen` (702), `IeltsScreen` (582), `DrivingScreen` (262), `ProjectDetailScreen` (383), `pathKit.tsx` (src 4) | |
| `joy/` | `JoyScreen`, `RewardsScreen`, `JoyEditSheet`, `joyModel.ts` (today's pick key `wejdan.joy.pick.<day>`), `useRedeem.tsx`, `harlequin.svg` (CSS url) | |
| `me/` | `MeScreen`, `SettingsScreen` (427), `MoneyScreen` (666), `WeeklyReviewScreen`, `OnboardingScreen` (317), `OnboardingRestore`, `InboxScreen`, `HomeAdminScreen`, `EvidenceScreen`, `InsightsScreen`, `HelpScreen`, `ImportReview.tsx` (backup-import review UI), `WeekPriorities`, `meKit.tsx` (src 12; `downloadJson`), `moneyModel.ts`, `reviewDraft.ts` (localStorage `wejdan.reviewDraft.v*`), `KitScreen` (dev), `harlequin*.svg` | `ImportReview.tsx` (backup import) is different from `sources/ImportReviewScreen.tsx` (file-candidate review). |
| `reminders/` | `RemindersScreen`, `ReminderTimeSheet`, `TimeWheel`, `CalendarExportSheet`, `SettingsRows`, `TodayReminderBanner`, `useDueReminders.ts` (localStorage `wos.reminders.v1.<profileId>`; plain key with the lock off), `format.tsx` | |
| `notes/` | `NotesScreen`, `NoteEditorScreen` (369), `SearchSheet` (recent searches key), `LinkedNotes`, `notesKit` | |
| `sources/` | `SourcesScreen`, `ImportReviewScreen` (629), `ChangeLogScreen`, `sourcesKit` | |
| `*/preview/` (today, habits, notes, sources) | `preview.tsx` + `index.html` | **dev-only** seeded visual harnesses. |

## 5. `src/pwa/`

| File | Purpose | Imported by |
|---|---|---|
| `index.tsx` | Boot: `cleanupLegacyFlutter` → `registerSW` (virtual module), persistence request, mounts `UpdatePrompt` in `#pwa-root`. Re-exports hooks. | `main.tsx` |
| `state.ts` | Update/persist state store + `usePwaUpdate`, `usePersistentStorage`, `applyUpdate`, `requestPersistence`. | `index.tsx`, `UpdatePrompt.tsx` |
| `UpdatePrompt.tsx` (+css) | Banner «فيه تحديث جديد للتطبيق» with «بعدين» / «حدّثي». | `index.tsx` |
| `legacyCleanup.ts` | Flutter worker/cache cleanup; `localStorage['wejdan.legacyCleanupDone']`. | `index.tsx`; t 1 |
| `pwa-env.d.ts` | Type reference for the PWA virtual module. | ambient |

## 6. `public/`

`icons/` (192/512 any + maskable), `apple-touch-icon.png`, `favicon-48.png`, `brand/w-ink.svg`, `brand/w-white.svg`, `splash/*.png` (22 iOS startup images, light+dark), and the four legacy Flutter shims `flutter_service_worker.js`, `flutter_bootstrap.js`, `flutter.js`, `main.dart.js` (each < 1.6 KB; kill-switch / redirect). `public/` is 6.3 MB. No `.nojekyll`, no `CNAME` in `public/` (see 12 §7).

## 7. `tests/`

| Dir | Contents | Run by |
|---|---|---|
| `tests/setup.ts` | jest-dom matchers, `asyncUtilTimeout: 5000`, `matchMedia` / `ResizeObserver` stubs. | vitest |
| `tests/domain/` (32 files) | Engine, store, repository, vault (incl. crash-injection durability), ics, migration, reminders tests; `helpers.ts`; `fixtures/` (`personaProfile.ts` = Flutter persona port for engine parity, `export_sample.json`, `hive/flutter-hive-layout.json`). | `npm test` |
| `tests/ui/**` | Component/screen tests with Testing Library over `InMemoryLifeRepository` + pinned clock (`today/harness.tsx`); a11y, toast placement, lock, notes, sources, streak/reminders. | `npm test` |
| `tests/migration/flutterExport.test.ts` + `tests/fixtures/migration/*` | Flutter export → React store parity. Fixtures are **synthetic** (`flutter_export_synthetic.json`, `flutter_ui_expected.json`). | `npm test` |
| `tests/e2e/*.mjs`, `tests/e2e/sw-takeover/` | Playwright scripts (not vitest; see 12 §6). | manual |

Totals from the run in this pass: 77 files / 849 tests (38 files / 503 tests in `tests/domain`, 38 files / 340 under `tests/ui`, 1 file / 6 in `tests/migration`).

## 8. Where to start for common changes

| Task | Touch |
|---|---|
| New persisted entity | `models.ts` (interface + `XxxJ`) → `storage.ts` (`Boxes`, `kFlutterBoxes`/`kWebBoxes`, collection, `refreshLibrary`-style seeding if needed) → `snapshot.ts` (`LifeSnapshot` + `loadSnapshot`) → `store.ts` actions → export/import tests. Keep `kExportSchemaVersion = 1` additive. |
| New screen | file in `src/ui/screens/<area>/` + pattern in `src/ui/routes.tsx` (+ `OWNER_TAB` in `AppShell.tsx` if it is a non-tab root). |
| Change planner behaviour | `engine/dayPlanner.ts` + `tests/domain/dayPlanner.test.ts` + selectors. |
| Change PWA behaviour | `vite.config.ts` (`VitePWA`), `src/pwa/*`, `public/flutter_*`. |

## 9. Risks found while mapping

1. Four components with no production importer and several domain features with no UI (listed in 04 §2/§4/§7).
2. (resolved in the handoff branch) the private scratch path in `tokens.css` and the nonexistent generator path in `index.html`.
3. Two files are named alike: `me/ImportReview.tsx` (backup file preview) vs `sources/ImportReviewScreen.tsx` (candidate review).
4. The migration fixtures are synthetic; the **local** git history (not published) still holds the earlier real-derived one — see 16 §0.
