# 03 — Requirements Traceability

> **ملخص**
> جدول يربط كل متطلب بالتنفيذ والملفات والدليل وحالته، مشتق من جرد «وش قلنا بنسويه وش تم» (90 بند) ومحدَّث على الكود الحالي (main @ 2b7a096، بعد إصلاحات الفحص الثالث).
> عمود «فحص الآن» = راجعتُ الكود أو شغّلت أمر بنفسي في هذي الجلسة (V)؛ غيره مأخوذ من تقارير الفحص (R) أو غير مؤكد (U).
> أربعة بنود كانت «ناقصة» في الجرد صارت منفّذة بعده (القفل، الملفات، الستريك المرن، التذكيرات) وأُضيفت بنود الفحص الثالث (R-082…R-087)؛ لكن غير منشورة على الرابط الحي حسب الأدلة المتاحة.

## How to read this

- Source of rows: the audit `audit/promised-vs-done.md` (24 Oct 2026, written against `main` = `0fa7aa6`, 90 rows) consolidated by area (≈70 rows below; sub-checks merged, nothing dropped on purpose). **Rows that changed after the audit are marked "CHANGED SINCE AUDIT".**
- **Chk** = how this handoff verified it: `V` = read the code / ran grep or a command now; `R` = relies on a QA/agent report (file named; not re-run); `U` = nothing found.
- **Status:** `DONE`, `DONE*` (done but not published on the live URL), `PARTIAL`, `NOT DONE`, `DEFERRED-BY-OWNER`, `DECIDED-NOT-DOING`, `OWNER-ACTION`, `NOT VERIFIED`.
- Evidence names refer to files in this repo unless prefixed `scratchpad:` (local-only reports, **not in the repo**). Test counts: see `13_TESTING_AND_QA.md` §2.
- `*` = published? See §3 of `01_EXECUTIVE_SUMMARY.md`: release 3 (the wave) is live per the integrator; the `DONE*` marks on older rows are historical.

## A. Today

| ID | Requirement | Implementation | Source files | Verification evidence | Status | Chk |
|---|---|---|---|---|---|---|
| R-001 | Day plan in suggestion mode: nothing added/removed/trimmed without her action | Default `planMode: 'suggest'`; accept/decline suggestions | `src/domain/models.ts` (`planMode`), `src/domain/engine/dayPlanner.ts`, `src/ui/screens/today/useTodayModel.ts` | `tests/domain/dayPlanner.test.ts`; local-only report (not in repo): `qa-final/area1-today.md` | DONE | V (default value) |
| R-002 | Postponed/moved items stay visible in «بعدين» | Later sheet; forward-only move date | `src/ui/screens/today/LaterSheet.tsx`, `src/ui/components/PostponeSheet.tsx` | `tests/domain/areaOneFixes.test.ts`; local-only report (not in repo): `release-gate.md` §2 | DONE | R |
| R-003 | Quick add with only a title (task/idea/note/link) → inbox | Quick-add sheet | `src/ui/screens/today/QuickAddSheet.tsx` | local-only report (not in repo): `release-gate-2.md` §1 (inbox 0→1) | DONE | R |
| R-004 | Quick-add Save button stays above the real keyboard | Not verified on a real keyboard | `src/ui/screens/today/QuickAddSheet.module.css` | local-only report (not in repo): `release-gate-2.md` P2 (only a 480px-high headless viewport: Save lands at y=598, below the fold) | NOT VERIFIED → LOS-004 | R |
| R-005 | Inbox: convert / archive / delete with undo | Inbox screen | `src/ui/screens/me/InboxScreen.tsx` | `tests/ui/me/area5.test.tsx` | DONE | R |
| R-006 | Six task statuses (inbox, planned, in progress, done, postponed, cancelled) | Task model | `src/domain/models.ts`, `src/ui/screens/path/ProjectDetailScreen.tsx` | ledger (outside repo) | DONE | R |
| R-007 | Undo for delete/complete/postpone, window 10 s | `kUndoWindowMs = 10_000`; undo tokens | `src/domain/store.ts:55` | `tests/domain/store.test.ts` | DONE | V |
| R-008 | Toast must never cover or disable a control (N1) | Toast floats above tab bar; reserve band | `src/ui/components/Toast.tsx` | `tests/ui/toastPlacement.test.tsx`, `tests/e2e/toastClearance.e2e.mjs`; local-only report (not in repo): `release-gate-2.md` §1 | DONE | R |
| R-009 | Routine player buttons stay above the toast (D1) | Fixed in `0fa7aa6` | `src/ui/screens/habits/RoutinePlayerScreen.tsx` | commit message only; no QA report after the fix; unit test `habits.test.tsx` has one load-flaky case (see 01 §4) | NOT VERIFIED visually → LOS-005 | U |
| R-010 | Morning brief, energy, evening close, focus, item detail | Routes | `src/ui/routes.tsx`, `src/ui/screens/today/*` | local-only report (not in repo): `release-gate-2.md` §4 | DONE | V (routes exist) |
| R-011 | Payday prompt disappears once the month is planned (N3) | `hasMonthPlan/needsMonthPlan` selectors | `src/domain/selectors.ts`, `src/ui/components/PaydayCard.tsx` | `tests/domain/n2n5Selectors.test.ts`, `tests/ui/n2n5.test.tsx` | DONE | R |
| R-012 | Skipped routine is not offered again that day (N4) | Calm skipped state | `src/ui/screens/habits/RoutineScreen.tsx` | `tests/ui/n2n5.test.tsx` | DONE | R |
| R-013 | After restore / wipe the app lands on Today (P1) | CHANGED SINCE AUDIT: `suppressIntendedRoute()` before wipe; lock branch e2e asserts `#/today` | `src/ui/state/onboardingResume.ts:68`, `src/ui/screens/me/SettingsScreen.tsx:187` | `tests/e2e/lockProfiles.e2e.mjs` (`onToday`); lock agent report (session) says P1 fixed | DONE* | V (call site) |
| R-014 | Apple-like motion, springs, reduced motion | Framer Motion; reduced-motion handling | `src/ui/motion.ts` | 37 source files reference reduced motion (grep count now); local-only report (not in repo): `qa/111-*`, `112-*` | DONE | V |

## B. Habits, flowers, routines

| ID | Requirement | Implementation | Source files | Verification evidence | Status | Chk |
|---|---|---|---|---|---|---|
| R-020 | «ترتاح» resting rule (paused / rest domain / no planned day done in 7 days) | Engine | `src/domain/engine/habitStrength.ts` (`isRestingHabit`), `src/domain/selectors.ts`, `src/ui/screens/habits/HabitsScreen.tsx` | `tests/domain/resting.test.ts` | DONE | V (test file read) |
| R-021 | One flower per category × 5 stages (16 kinds) | Sprite + `<Flower kind stage size>` | `src/ui/components/flowers/drawings.json` | `node` count: 16 keys, each 5 stages (now); `tests/domain/gardenPass.test.ts` | DONE | V |
| R-022 | Garden screen; stages seed→rooted bound to habit strength | Garden screen | `src/ui/screens/habits/GardenScreen.tsx` | `tests/ui/habits/garden.test.tsx` | DONE | R |
| R-023 | Aquarium removed | `RETIRED_DOMAINS` filter | `src/domain/snapshot.ts:79-98` | `tests/domain/gardenPass.test.ts` | DONE | V |
| R-024 | Skip / pause / delete habits with undo | Habit list + detail menus | `src/ui/screens/habits/HabitsScreen.tsx`, `HabitDetailScreen.tsx` | `tests/ui/habits/habits.test.tsx` | DONE | R |
| R-025 | Flexible streak, optional (2 compensation days/week), no zeroing guilt UI | CHANGED SINCE AUDIT: forward-simulation engine, Settings switch, habit-detail hero, Habits-row chip. Default ON for new installs (`forgivingStreak: true`) — **awaiting owner approval (LOS-015)** | `src/domain/engine/momentum.ts`, `src/domain/models.ts:1139`, `src/ui/screens/habits/StreakHero.tsx`, `src/ui/screens/reminders/SettingsRows.tsx`, `src/ui/components/streak/*` | `tests/domain/flexibleStreak.test.ts`, `tests/ui/streakReminders.test.tsx`, `tests/e2e/streakRemindersLogo.e2e.mjs` (result in 13 §2) | DONE* | V (UI wiring + default) |
| R-026 | No forced day-counters in the habit UI | Audit-time rule (week map without numbers, `HabitsScreen.tsx`). After the owner asked for a streak, counters appear in streak surfaces only (`streakTitle`, `streakChipText`, `compensationLine` in `src/ui/lib/streakText.ts`); the copy says it is never a failure counter | `src/ui/lib/streakText.ts`, `src/ui/screens/habits/HabitsScreen.tsx` | text read now. Whether default-ON for new installs matches "optional" in the owner's words: **UNKNOWN**, see LOS-015 | PARTIAL (superseded by owner request for an optional streak) | V (strings) |
| R-027 | Routines (AM/PM/weekly) built only from «منتجاتي» | Products → routine generation | `src/domain/products.ts`, `src/ui/screens/habits/ProductsScreen.tsx` | `tests/domain/area2Routine.test.ts`; local-only report (not in repo): `release-gate.md` §2 | DONE | R |
| R-028 | Her real routine and products loaded for her | Public build seeds generic placeholders (`غسول`, `مرطب`, …); private import path exists on device | `src/domain/products.ts:36-45`, `src/ui/screens/me/SettingsScreen.tsx:330` | Real product list **UNKNOWN** (owner has not provided one per audit) | PARTIAL / OWNER-ACTION → LOS-010 | V (placeholders) |
| R-029 | 132-action neutral library in the public build | Static JSON | `src/domain/data/actions_ar.json` | key count 132 (now); `tests/domain/personalLibrary.test.ts` | DONE | V |
| R-030 | Habits tied to prayer times (Umm Al-Qura, on-device) | `adhan` library | `src/domain/engine/anchors.ts:22` | file read now | DONE | V |

## C. Path (projects, goals, IELTS, driving)

| ID | Requirement | Implementation | Source files | Verification evidence | Status | Chk |
|---|---|---|---|---|---|---|
| R-040 | Projects with next step, optional due date, linked notes | Project detail | `src/ui/screens/path/ProjectDetailScreen.tsx`, `src/ui/screens/notes/LinkedNotes.tsx` | `tests/ui/path/path.test.tsx`; local-only report (not in repo): `qa-final/area3-path.md` | DONE | R |
| R-041 | Goals and quarterly season | Path screen | `src/ui/screens/path/PathScreen.tsx` | `tests/ui/path/qaArea3.test.tsx` | DONE | R |
| R-042 | IELTS and driving tracks | Routes `/path/ielts`, `/path/driving` | `src/ui/routes.tsx`, `IeltsScreen.tsx`, `DrivingScreen.tsx` | `tests/domain/qaArea3.test.ts` | DONE | V (routes) |
| R-043 | "Put it on today" is idempotent | Store guard | `src/domain/store.ts` | local-only report (not in repo): `release-gate-2.md` §4 (1 task after double tap) | DONE | R |

## D. Joy, money, review

| ID | Requirement | Implementation | Source files | Verification evidence | Status | Chk |
|---|---|---|---|---|---|---|
| R-050 | Joy items, rewards redeemed with sparks, undo | Joy + rewards screens | `src/ui/screens/joy/*`, `src/domain/engine/sparks.ts` | `tests/ui/joy/joy.test.tsx`; local-only report (not in repo): `release-gate-2.md` §4 (balance 9→4→9) | DONE | R |
| R-051 | Sparks, momentum, rewards remain; daily spark cap | `kDailySparkCap = 20` | `src/domain/engine/sparks.ts:15` | `tests/domain/sparksRecovery.test.ts`, `strengthMomentum.test.ts` | DONE | V |
| R-052 | Concave 4-point star only for achievement/evidence, max 3 per screen | Component exists (`StarMark.tsx`); the cap and exclusivity were never re-checked after the design fix | `src/ui/components/StarMark.tsx` | local-only report (not in repo): `area7-design.md` X5 (was drifting), fixed in `e98f52b`, no re-comparison | PARTIAL / NOT VERIFIED → LOS-013. Gate 6 counted StarMark svgs on cold route loads: Today 3, Evening 3, IELTS / Driving / Joy / Celebrations 2, Path 1, rest 0 to 1, Evidence 102 (verified-source marks, pre-existing); the review progress thread no longer uses stars after gate-6 D1 (PER-REPORT) | U |
| R-053 | Payday on the 1st; budget cycle starts at payday | `paydayDay: 1` | `src/domain/models.ts:1142` | `tests/domain/paydayCycle.test.ts` | DONE | V |
| R-054 | Changing payday day preserves history and shows an honest notice | `paydayHistory` | `src/domain/store.ts` (~942) | `tests/domain/paydayCycle.test.ts`; local-only report (not in repo): `release-gate-2.md` §3 N5 | DONE | R |
| R-055 | Bills (pay/pause/undo), month plan, spending | Money screen | `src/ui/screens/me/MoneyScreen.tsx` | `tests/ui/money/area4.test.tsx` | DONE | R |
| R-056 | Weekly review = 6 reorder questions, no performance grade | Review screen | `src/ui/screens/me/WeeklyReviewScreen.tsx:28` | line read now | DONE | V |
| R-057 | Cycle-tracking module optional, off by default; no women's-health content in the public build | `cycleModule: false`; removed module keywords absent | `src/domain/models.ts:1138`, `src/ui/screens/me/SettingsScreen.tsx` | grep for the removed module's keywords in `src/` and `public/`: 0 hits now | DONE | V |

## E. Notes, search, sources

| ID | Requirement | Implementation | Source files | Verification evidence | Status | Chk |
|---|---|---|---|---|---|---|
| R-060 | Notes and decisions; inbox → note | Notes screens | `src/ui/screens/notes/*`, `src/domain/features/notes.ts` | `tests/domain/notesSearchSources.test.ts`, `tests/ui/notes/notes.test.tsx` | DONE | R |
| R-061 | Arabic-aware search (أ/ا, ة/ه, diacritics, "ال") landing on the row | Normaliser + search | `src/domain/features/arabic.ts:18`, `search.ts` | `tests/domain/notesSearchSources.test.ts`; local-only report (not in repo): `release-gate.md` §1 #13 | DONE | V (normaliser exists) |
| R-062 | Change log with restore | Change log | `src/domain/features/changelog.ts` (cap 300), `src/ui/screens/sources/ChangeLogScreen.tsx` | local-only report (not in repo): `release-gate.md` §1 #14 | DONE | V (cap) |
| R-063 | Sources page; import review before anything is approved; nothing auto-lands on Today | Sources + review | `src/ui/screens/sources/*`, `src/domain/features/sources.ts` | `tests/ui/sources/sources.test.tsx` | DONE | R |
| R-064 | Read JSON/CSV/MD/TXT; unreadable file named with reason | Source readers | `src/domain/features/sources.ts` | `tests/domain/notesSearchSources.test.ts` | DONE | R |

## F. Data, backup, privacy, lock

| ID | Requirement | Implementation | Source files | Verification evidence | Status | Chk |
|---|---|---|---|---|---|---|
| R-070 | Export JSON; import with preview; automatic backup first (last 5) | `kMaxBackups = 5`; `before-import` backup | `src/domain/storage.ts` (lines 114, 385, 423), `SettingsScreen.tsx` | `tests/domain/repository.test.ts`; local-only report (not in repo): `release-gate-2.md` §4 | DONE | V (constant) |
| R-071 | Import compatible with Flutter export `schemaVersion 1` | Same JSON schema | `src/domain/models.ts` (header), `src/domain/storage.ts` | `tests/migration/flutterExport.test.ts`, **synthetic** fixtures `tests/fixtures/migration/flutter_export_synthetic.json` + `flutter_ui_expected.json` | DONE | V (test ran) |
| R-072 | Delete-all with two confirmations; restore from welcome screen (N2) | `deleteAllAndReseed()` + `OnboardingRestore` | `src/domain/store.ts:1161`, `src/ui/screens/me/OnboardingRestore.tsx` | local-only report (not in repo): `release-gate-2.md` §2 | DONE | V (function exists) |
| R-073 | Old Flutter/Hive data migrates automatically, also from Settings anytime; never deletes the old DB | Migration sheet + engine | `src/domain/migration/flutterHive.ts`, `src/ui/state/LegacyMigrationSheet.tsx` (path from audit) | `tests/domain/legacyMigration.test.ts`, `legacyReoffer.test.ts`, `tests/e2e/legacyMigration.e2e.mjs`; real iPhone: DEFERRED-BY-OWNER | DONE (device DEFERRED-BY-OWNER) | V (header read) |
| R-074 | Ask for persistent storage and show the status | `navigator.storage.persist()` | `src/pwa/state.ts:74` | line read now | DONE | V |
| R-075 | Optional quiet backup nudge | CHANGED SINCE AUDIT: 14-day rule + Settings row, `lastBackupAt` written on export | `src/domain/backupReminder.ts` | `tests/domain/backupReminder.test.ts` | DONE* | V |
| R-076 | No external service, analytics or sync | None in `src/` | whole `src/` | grep for `fetch(`, `XMLHttpRequest`, `sendBeacon`, `WebSocket`, `EventSource` = 0 hits on `2b7a096`; lock e2e asserts "no network calls to any other host (0)" (13 §2) | DONE | V |
| R-077 | Public build is neutral (no owner name/goals/schedule/health) | Neutral seed | `src/domain/seed/starterProfile.ts` | local-only report (not in repo): `release-gate-2.md` §5 (209 files scanned) | DONE | R |
| R-078 | Her personal library is a private on-device import, never in the repo | Import/remove rows; with the lock on it is stored inside the encrypted DB, with the lock off in a localStorage key | `src/ui/screens/me/SettingsScreen.tsx`, `src/domain/seed/personalLibrary.ts`, `src/domain/store.ts` (`settlePersonalLibrary`) | `tests/domain/personalLibrary.test.ts`, `vaultPrivateKeys.test.ts`. Contents: not in repo (intended). Lock-off plaintext key: LOS-038 | DONE | V |
| R-079 | App lock (username + password, no Google) and several profiles on one device, with a recovery code | CHANGED SINCE AUDIT: envelope encryption AES-GCM-256, PBKDF2-SHA256 310k, per-profile DB, auto-lock options, soft delay after 5 wrong passwords; durable since gate 3 (see R-082) | `src/domain/vault/{crypto,vault,lockPolicy,credentials}.ts`, `src/ui/lock/*`, `src/domain/storage.ts` | `vaultCrypto`, `vaultPolicy`, `vaultBackup`, `vaultMigration`, `vaultDurability`, `vaultPrivateKeys`, `tests/ui/lock/*`, e2e `lockProfiles` + `lockKill` (13 §2) | DONE* | V (code header + crypto read) |
| R-080 | What the lock does NOT protect is documented | Header comment lists the plaintext residuals (DB/box names, ids incl. semantic ids, registry + header, the plain pre-lock DB during the rollback window, per-device conveniences, old Flutter DBs) | `src/domain/vault/vault.ts:1-45`, `17_SECURITY_AND_LIMITATIONS.md` §2.2 | read now | DONE (limitation known; in-app disclosure of the rollback window: LOS-032) | V |
| R-081 | Token rotation; history cleanup of the public repo | Not code | old public `main` (private ops file; path not repeated), `_transfer/` | ledger (local-only) | OWNER-ACTION → LOS-030, LOS-031 | U |
| R-082 | Turning the lock on never loses data (kill-safe) — G3-D1 | Header row per profile DB, boot `recover()`, plain DB kept as rollback until a real unlock on a later launch, header-first writes | `src/domain/vault/vault.ts`, `src/domain/storage.ts` (`vault` table, Dexie v2) | `tests/domain/vaultDurability.test.ts` (75), `vaultMigration.test.ts`, `tests/e2e/lockKill.e2e.mjs` | DONE | V (tests ran, 13 §2) |
| R-083 | One unreadable record must not block the profile — G3-D4 | Quarantine + Settings notice + unreadable-profile screen | `storage.ts` (`tryUnseal`), `store.ts`, `src/ui/lock/UnreadableProfile.tsx`, `ProtectionSection.tsx` | `vaultDurability.test.ts`, `lockModalAndErrors.test.tsx` | DONE | V |
| R-084 | Registry safe with two tabs — G3-D3 | `rev` compare-and-set, `storage` + `BroadcastChannel` | `vault.ts` | `vaultDurability.test.ts` | DONE | V |
| R-085 | Lock setup is an accessible modal — G3-D7; calm lock errors — G3-D8 | `LockPage` modal dialog; errors in Ink + Violet | `src/ui/lock/LockPage.tsx`, `copy.ts`, `lock.module.css` | `lockModalAndErrors.test.tsx` (4), `calmErrors.test.tsx` (3) | DONE | V |
| R-086 | Reminder banner never covers a control — G3-D2 | In-flow card at the top of Today | `src/ui/screens/reminders/TodayReminderBanner.tsx` | `streakReminders.test.tsx`, `streakRemindersLogo.e2e.mjs` | DONE | V |
| R-087 | Latin/number runs in Arabic text render in the right glyph order — G3-D5 | Unicode property-escape runs in `<bdi dir=ltr>` | `src/ui/components/Bidi.tsx`, `src/ui/screens/today/lib.ts` | `bidiG3.test.ts` (37 rows), `bidiF1.test.ts`, `bidiGlyphOrder.e2e.mjs` | DONE | V |
| R-088 | Public repo contains no personal data; fixtures synthetic; scan before publish | `scripts/privacy-scan.mjs`, synthetic fixtures | `scripts/*`, `tests/fixtures/migration/*` | `npm run privacy:scan` (13 §2) | DONE (tree); local history not publishable → single snapshot (D-64) | V |

## G. PWA and release

| ID | Requirement | Implementation | Source files | Verification evidence | Status | Chk |
|---|---|---|---|---|---|---|
| R-090 | Works offline after first open | Workbox precache (155 entries, 2404 KiB in the final build) | `vite.config.ts` | `lockProfiles.e2e.mjs` offline checks; local-only report (not in repo): `release-gate-2.md` §4 (18 routes offline at `cb8a2f8`) | DONE | R |
| R-091 | Update prompt instead of silent reload | `registerType: 'prompt'`; prompt text «فيه تحديث جديد للتطبيق» | `vite.config.ts`, `src/pwa/UpdatePrompt.tsx:11` | text read now; the audit quoted a different wording («— حدّثي»), UI may carry it on the button | DONE | V |
| R-092 | React replaces Flutter at the same URL without a blank page | Takeover shims + one-time cleanup | `public/flutter*.js`, `public/main.dart.js`, `src/pwa/legacyCleanup.ts` | `tests/e2e/sw-takeover/README.md` (3 scenarios, 2026-10-24), `tests/ui/pwa/legacyCleanup.test.ts` | DONE | V (files) |
| R-093 | Published and current on the URL | Latest publish ≈ `0fa7aa6` | gh-pages (outside repo) | live bundle `index-DhYFUn4i.js` = local gh-pages clone at `169ca40` (now) | PARTIAL at audit time. Now: release 2 (`f7e1f75`, `ed0df23`) and release 3 (missing-features wave; SHA `PENDING_PUSH`) are live per the integrator, not re-checked → LOS-001 Part B | V |
| R-094 | iOS icons + 11-size splash set built from the real W | CHANGED SINCE AUDIT: generator `npm run brand:assets` (resvg); python generator removed | `scripts/brand/generate-brand-assets.mjs`, `public/splash/*`, `public/icons/*` | files changed in `50643eb`; quality on a device: DEFERRED-BY-OWNER | DONE* (device DEFERRED) | V (stat of commit) |
| R-095 | Status-bar colour on iPhone | `apple-mobile-web-app-status-bar-style: black-translucent`, theme-color sync | `index.html:11`, `src/ui/shell/theme.tsx` | needs device | DEFERRED-BY-OWNER | V (meta tag) |
| R-096 | First load ≤ 3 s on slow 4G | ≈ 4 s measured by the earlier ledger; later fonts/perf work, no re-measure | `vite.config.ts` (font preload) | ledger §6 (outside repo) | PARTIAL → LOS-016 | U |
| R-097 | Real push notifications while the app is closed | Not possible without a server | n/a | decision: "no server" | DECIDED-NOT-DOING | n/a |

## H. Identity, language, accessibility

| ID | Requirement | Implementation | Source files | Verification evidence | Status | Chk |
|---|---|---|---|---|---|---|
| R-100 | Identity colours only | CSS tokens | `src/ui/styles/tokens.css:2` | header and values read now | DONE | V |
| R-101 | Light and dark themes (system / light / dark) | `ThemePref = 'system' \| 'light' \| 'dark'` | `src/ui/shell/theme.tsx:3` | read now; local-only report (not in repo): `release-gate-2.md` §4 ran light and dark | DONE | V |
| R-102 | Arabic only, RTL | `<html lang="ar" dir="rtl">`, no language switch | `index.html:2` | read now | DONE | V |
| R-103 | IBM Plex Sans Arabic + El Messiri; Thmanyah not used | `@fontsource` imports | `src/ui/fonts.ts` | file read now | DONE | V |
| R-104 | W monogram real SVG, inline `currentColor` | CHANGED SINCE AUDIT | `src/ui/components/WMark.tsx`, `wPath.ts`, `public/brand/w-ink.svg` | component read now; commit `50643eb` removed the PNG W | DONE* | V |
| R-105 | Five tabs | `tabRoots` | `src/ui/routes.tsx:15` | read now | DONE | V |
| R-106 | Saudi dialect, no guilt, Arabic digits/plurals/bidi ranges | Copy pass | UI strings | local-only report (not in repo): `review/copy-report.md` (65 fixes), `release-gate.md` bidi section | DONE | R |
| R-107 | Dev component kit never ships | `KitScreen` registered only `if (import.meta.env.DEV)` | `src/ui/routes.tsx:85` | read now | DONE | V |
| R-108 | Accessibility: axe on 30 routes light+dark, focus management, ≥44px targets, error boundary | Several fixes in `feat/a11y` | `src/ui/components/Sheet.tsx`, `ErrorBoundary.tsx`, `src/ui/shell/stackFocus.ts` | `tests/ui/a11y/a11y.test.tsx`; local-only report (not in repo): `review/a11y-report.md`, `qa-final/area6-cross.md` | DONE (at that build) | R |
| R-109 | 150% / 200% text scale and contrast measured on the FINAL build | Not run after later merges | — | local-only report (not in repo): `release-gate-2.md` "Not run" | NOT VERIFIED → LOS-006, LOS-007 | R |
| R-110 | Escape closes pushed screens (hardware keyboard) | Sheets/menus handle Escape; pushed screens do not | `src/ui/components/Sheet.tsx:131` | local-only report (not in repo): `area6-cross.md` note | NOT DONE (low) → LOS-017 | V (Sheet only) |
| R-111 | Design-first: boards for every screen exist in Claude Design before build | 31 boards for the React rebuild; boards for lock/profiles, streak, reminders, W not confirmed | — | local-only report (not in repo): `audit/promised-vs-done.md` (design row "ما اتحقق"); the streak agent reported no backup-reminder board existed | NOT VERIFIED → LOS-012 | U |
| R-112 | Tab-bar icon choice (cup/plant vs star/leaf on the board) | No owner decision recorded | `src/ui/components/TabBar.tsx` | local-only report (not in repo): `area7-design.md` X7 | NOT VERIFIED → LOS-014 | U |
| R-113 | Test data created by any test is named `test` | Convention in scripts and fixtures | `tests/e2e/*.mjs` headers | headers of `lockProfiles.e2e.mjs`, `toastClearance.e2e.mjs` read now | DONE | V |

## I. Items the owner deferred or owns

| ID | Item | Status |
|---|---|---|
| R-120 | All iOS/Xcode/real-device testing | DEFERRED-BY-OWNER (permanent) |
| R-121 | Neutral edition (name/logo/wording) for friends | DEFERRED-BY-OWNER (never requested) |
| R-122 | Thmanyah font in a native iOS app | Needs a written licence answer from the font owner; not started → LOS-020 |
| R-123 | Rewrite history / make repo private | Owner declined for now ("leave it as it is") → LOS-031 |

## J. Missing-features wave (areas A to G) — added after the merge of `integ/features` @ `d982b01`

Evidence: specs `docs/design/*.md`; code map in `04_CURRENT_IMPLEMENTATION.md` §4b; tests named there; independent gates 6 and 7 (local-only, PER-REPORT, read by the author). Status `DONE` = built, tested and seen by an independent gate in Chromium; no iPhone evidence for any row (DEFERRED-BY-OWNER).

| ID | Requirement | Status | Chk |
|---|---|---|---|
| R-130 | Weekly review as a 10-step ritual (blockers + fix, strength check, season adjust, week experiment, chapter card), skippable, applies nothing until finish, draft survives reload | DONE (gate 6; draft placement under the lock: gate 7, minors LOS-042 / LOS-043) | V + R |
| R-131 | Insights: momentum by domain, return speed, experiment result; each chart with a table alternative | DONE | V + R |
| R-132 | «احتفالاتي» celebrations history (derived, no new storage) | DONE | V + R |
| R-133 | Today grouped by tier with «يومك جاهز» summary, per-item level chip, free-joy card, week strip, all-done card | DONE (gate-6 polish D4 to D6 fixed) | V + R |
| R-134 | Calm day for low energy, writes nothing on render, Help link | DONE | V + R |
| R-135 | Joy map (small / medium / big) and reserved-joy bundles (max 3) | DONE | V + R |
| R-136 | Per-category monthly money envelopes inside the payday cycle | DONE (payday-change regression checked by gate 6) | V + R |
| R-137 | Payday saving reminder; the app never moves or suggests money | DONE | V + R |
| R-138 | Focus finish: retrieval question, try-first tip, phone-away reminder with honest wording | DONE | V + R |
| R-139 | Home: 10-minute tidy, weekly zone, batched errands | DONE | V + R |
| R-140 | Evidence strength filter and «أضيفيها لعاداتي» | DONE | V + R |
| R-141 | Settings: daily reminder cap, optional-modules list, storage-unavailable banner | DONE (cap enforcement with real due reminders covered by vitest only; banner trigger not exercised by gate 6) | V + R |
| R-142 | Habit Studio 9-step wizard with evidence prefill; quick form kept | DONE | V + R |
| R-143 | Onboarding life map (grow / maintain / rest, caps 3 / 5) | DONE | V + R |
| R-144 | Onboarding joy step | DONE (the branch "bundles after habits exist" looked at only briefly by gate 6) | V + R |
| R-145 | IELTS stats, target band and current level (owner-filled) | DONE | V + R |
| R-146 | Driving road / quiz / hazard / conditions as owner-fillable mechanisms; no official content shipped; unverified steps visibly labelled | DONE as mechanisms; official content is not provided and not claimed → LOS-045 row 2 | V + R |
| R-147 | Remaining design-board rows not built | NOT DONE → LOS-045, LOS-046 | V (text search only) |

## Spot-verification log (this handoff)

At least 25 rows were checked against code or by running a command (Chk = V): R-001, 007, 013, 014, 020, 021, 023, 025, 028, 029, 030, 042, 051, 053, 056, 057, 070, 071, 072, 073, 074, 075, 076, 078, 079, 080, 082–088, 091, 092, 093, 095, 100, 101, 102, 103, 104, 105, 107, 113. Rows labelled `R` rely on the named reports and tests; the tests themselves ran in this handoff (695 of 695 passed; see `13_TESTING_AND_QA.md` §2), but a green unit test is not proof of the visual QA claim next to it.

## Differences versus the audit (by design of this table)

| Audit said | Now |
|---|---|
| Streak: engine only, no UI | UI present (R-025) |
| Reminders switch does nothing | Replaced by `/me/reminders`, in-app banner and `.ics` export (see `src/ui/screens/reminders/*`) |
| Lock/profiles: no code | Implemented (R-079) |
| Backup reminder: none | Implemented (R-075) |
| W logo: PNG crop | SVG (R-104) |
| P1 lands on Settings | Fixed per lock-branch report and e2e assertion (R-013) |
| 498 tests | 849 tests in 77 files (run now) |
