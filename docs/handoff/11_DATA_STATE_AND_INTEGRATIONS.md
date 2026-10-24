> **ملخص**
> كل بيانات «وجدان» في IndexedDB عبر Dexie (جدول واحد records بمفتاح [box+id])، ومفاتيح localStorage للراحة فقط، وكاشات الـ Service Worker.
> تصدير البيانات ملف JSON بنسخة schemaVersion=1 (27 صندوق فلاتر مُصدَّر + 9 صناديق ويب) مع نسخ احتياطية تلقائية (آخر 5) وسجل تغييرات (حد 300) وتراجع 10 ثوانٍ.
> التكاملات: لا يوجد أي تكامل بعيد. كل ما هو موجود محلي (Web Crypto، IndexedDB، SW، مشاركة ملف)، ولا توجد أجزاء وهمية في النسخة المنشورة.

# 11 — Data, state and integrations

All facts verified in code at `main` @ `ed0df23` plus the missing-features wave (`integ/features` @ `d982b01`) unless marked NOT VERIFIED / UNKNOWN. **No personal data appears in this file**: only schema, key names and structures.

## 1. Storage map

| Place | What lives there | Encrypted when lock is on? | Cleared by "delete all data"? |
|---|---|---|---|
| IndexedDB database `wejdan_life_os` (lock off) | Everything below in §2 | n/a (plain) | all boxes except `backups` |
| IndexedDB database `wejdan_life_os_<profileId>` (lock on, `profileId` = `p_` + 10 hex chars) | Same rows, **values AES-GCM encrypted**; `box` and `id` stay readable. Plus table `vault` with one plaintext **header** row (profile record, salts, wrapped key, `rev`, optional `legacy` pointer, `deleted`/`retired` flags) | yes (values only; header is plaintext by design) | n/a (per profile) |
| IndexedDB `wejdan_life_os` kept as **rollback** after the lock was turned on | the pre-lock plain copy, untouched, named in `registry.legacy` | **no — plaintext** | deleted by `finalizeLegacy` after a real unlock on a later launch |
| IndexedDB `wlo_<boxname>` databases (30 of them) | **Old Flutter (Hive CE) data**, same origin; read-only for the React app | never touched | never touched |
| `localStorage` | registry, flags, per-device conveniences (§6) | **no** (never encrypted) | not touched |
| `sessionStorage` | `wejdan.legacyShimHops` (redirect-loop guard of the Flutter shims) | no | — |
| Cache Storage | Workbox precache (name = workbox default `workbox-precache-v2-<scope>` — exact string NOT VERIFIED) and `wejdan-action-library` (runtime `CacheFirst`, ≤ 6 entries) | no (static app files only; `lockProfiles.e2e.mjs` asserts they hold no profile data — not re-run) | not touched |
| Memory | `LifeStore` snapshot, undo trash, data key (non-extractable `CryptoKey`) | n/a | — |

## 2. Dexie schema and boxes

`src/domain/storage.ts`:

```ts
class LifeDb extends Dexie {
  records!: Table<{ box: string; id: string; value: Json }, [string, string]>
  vault!: Table<{ id: string; value: Json }, string>   // plaintext app-lock header
  constructor(name: string) {
    super(name)
    this.version(1).stores({ records: '[box+id], box' })
    this.version(2).stores({ records: '[box+id], box', vault: 'id' })
  }
}
```

- **Schema version 2** (`version(1)` = `records` only; `version(2)` added the plaintext `vault` header table, no upgrade function needed because it only adds a table). A "box" is a logical collection; rows are `{ box, id, value }`, primary key `[box+id]`, secondary index `box`. The `vault` table holds `{ id: 'header', value }` and is never exported. Changing the `records` indexes means adding `version(3)` with an upgrade.
- `readAll(box)` = `where('box').equals(box)`; `clearBox` deletes by the same query; writes are `put`/`bulkPut`.
- Backend choice: `openBestRepository({ name?, timeoutMs = 5000 })` → `DexieLifeRepository`, or `InMemoryLifeRepository` (`persistent = false`) if `indexedDB` is missing/throws/times out. UI then shows a "not saved" banner.

### 2.1 Boxes (`Boxes`, 40 names)

`kFlutterBoxes` (29, in Dart export order), `kWebBoxes` (9), plus `meta` and `backups`:

| Box | Entity (codec) | `id` key | Exported | Origin |
|---|---|---|---|---|
| `actions`, `engineRules` | shipped library `Action` / `EngineRule` | `actionId` / `ruleId` | **no** (`kSeedOnlyBoxes`) | seeded from `data/actions*.json` (+ optional personal library) |
| `domains` | `Domain` | `id` | yes | Flutter |
| `seasons` | `Season` | `id` | yes | Flutter |
| `habits` | `Habit` | `id` | yes | Flutter |
| `routines` | `Routine` (with embedded `steps`) | `id` | yes | Flutter |
| `weeklyTasks` | `WeeklyTask` | `id` | yes | Flutter |
| `projects` | `Project` (embedded `steps`) | `id` | yes | Flutter |
| `goals` | `Goal` (embedded `milestones`) | `id` | yes | Flutter |
| `logs` | `LogEntry` | `id` | yes | Flutter |
| `dayPlans` | `DayPlan` (accepted plan per day; embedded `items`, `deferred`) | **`date`** | yes | Flutter |
| `energyChecks` | `EnergyCheck` | **`date`** | yes | Flutter |
| `strengthChecks` | `StrengthCheck` | `id` | yes | Flutter |
| `joyItems` | `JoyItem` | `id` | yes | Flutter |
| `sparkTxns` | `SparkTxn` | `id` | yes | Flutter |
| `experiments` | `Experiment` | `id` | yes | Flutter |
| `vocabCards` | `VocabCard` | `id` | yes | Flutter |
| `mockTests` | `MockTest` | `id` | yes | Flutter |
| `drivingSessions` | `DrivingSession` | `id` | yes | Flutter |
| `moneyEnvelopes`, `bills`, `bnplItems`, `wishItems`, `adminDocs` | money/admin entities | `id` | yes | Flutter |
| `fixedEvents` | `FixedEvent` (focus blocks have `isFocusBlock`; deleted at next boot) | `id` | yes | Flutter |
| `nudgeRecords`, `errands`, `cycleEntries` | see 04 (no UI writers for the last two) | `id` | yes | Flutter |
| `weeklyReviews` | `WeeklyReviewRecord` | `id` | yes | Flutter |
| `tasks` | `TaskItem` | `id` | yes | web |
| `inbox` | `InboxItem` | `id` | yes | web |
| `products` | `Product` | `id` | yes | web |
| `later` | `PlanItem` moved to «بعدين» | `id` (= plan item id) | yes | web |
| `notes` | `Note` | `id` | yes | web |
| `changelog` | `ChangeEntry` (cap 300) | `id` | yes | web |
| `sources` | `Source` (imported file) | `id` | yes | web |
| `importBatches` | `ImportBatch` (embedded `candidates`) | `id` | yes | web |
| `provenance` | `Provenance` | `entity:entityId` | yes | web |
| `meta` | key/value rows `{ v: … }`: `settings`, `moduleState`, `seeded`, `libraryVersion`, `firstRunDate`, `openedDays` (last 60 day keys), and, only while the lock is on, `reviewDraft.<weekKey>` (unsent weekly-review answers, encrypted with the rest; not part of export / import) | key | settings/moduleState/openedDays/firstRunDate go into export `meta` | — |
| `backups` | automatic snapshots `{ info, snapshot }` | `bk_<15-digit ms>[_nnn]` | **never** exported/imported | — |

Field overview of the exported entity records (the JSON keys equal the TypeScript field names; extracted from `src/domain/models.ts` and `src/domain/features/*.ts`):

- `Habit`: id, domain, titleAr, titleEn, actionId, goal, cue, ifThen, minimumText, normalText, bonusText, joyPairing, frictionDown, frictionUp, reminder{enabled, offsetMin, textAr, textEn}, priority, schedule{weekdays, anchor}, durationMin, minimumDurationMin, minimumDurationEstimated, durationEstimated, status, routineId, alternationGroup, essential, shrunkToMinimum, comebackPending, sortOrder, createdDate.
- `LogEntry`: id, itemId, kind (`habit|routineStep|weeklyTask|projectStep|joy|task`), date, level (`minimum|normal|bonus|skipped`), durationMin, enjoyment, note, loggedAt, minuteOfDay.
- `TaskItem`: id, title, notes, domain, status (`inbox|planned|in_progress|done|postponed|cancelled`), dueDate, time, projectId, postponedTo, createdAt, updatedAt, completedAt, sortOrder, sourceInboxId, projectStepId.
- `InboxItem`: id, kind (`task|idea|note|link|potential_project`), title, body, url, createdAt, archived, convertedTo, source.
- `Note`: id, title, body, links[{kind, id}], isDecision, pinned, tag, createdAt, updatedAt.
- `ChangeEntry`: id, at, op, entity, entityId, label, before, after.
- `Source`: id, fileName, kind, importedAt, itemCount, addedCount, status, error. `ImportBatch`: id, sourceId, fileName, createdAt, candidates[…], committedAt, created. `Provenance`: id, entity, entityId, sourceId, batchId, candidateId, sourceRef{file, location}, importedAt, originalType, originalDate, originalTime.
- `DayPlan`: date, energy, items[PlanItem], thisWeek, deferred, budgetMin, usableMin, plannedMin, showHelpLink. `PlanItem`: id, itemId, kind, tier, section, title, domain, why, extraWhy, minimumText, normalText, bonusText, defaultLevel, suggestedLevel, startMinute, estimatedMin, actionId, routineId, bundleJoyId, bundleTitle, ieltsSkill, isComeback.
- Others (full list per interface is in `models.ts`): `Domain`{id, nameAr, nameEn, state, sensitive, enabled, parent, sortOrder}, `Routine`{id, titleAr, titleEn, section, anchor, steps, weekdays, active}, `WeeklyTask`, `Project`{…, status, steps, dueDate, notes}, `Goal`{…, milestones, linkedHabitIds, linkedProjectIds}, `SparkTxn`{id, date, amount, reason, refId, at}, `JoyItem`, `VocabCard`{front, back, example, ease, intervalDays, repetitions, due, lapses, lastReviewed}, `MockTest`, `DrivingSession`, `MoneyEnvelope`, `Bill`, `BnplItem`, `WishItem`, `AdminDoc`, `FixedEvent`, `Product`{id, name, category, slot, order, active, notes, placeholder}, `WeeklyReviewRecord`.
- `Settings` (in `meta.settings`): language, theme, notificationCap, quietStartMinute, quietEndMinute, quietEndSetByUser, wakeMinute, sleepMinute, prayerAnchorsEnabled, latitude, longitude, utcOffsetMinutes, timeZoneName, cycleModule, aquariumModule, appLock (legacy flag — no reader outside the codec), forgivingStreak, dailyBudgetMin, budgetByWeekday, ieltsWeakestSkill, weekStartsOn, eveningShutdownBeforeSleepMin, onboardingDone, lastSeasonReview, firstActionPin, paydayDay, paydayHistory, planMode (`suggest|auto`), notificationsEnabled (default false), reminderTimes, quietHoursEnabled, lastBackupAt, displayName, pausedRoutineSlots, plus `extra` (unknown keys, round-tripped). A Flutter-era key (`pcosModule`) appears in the Flutter sample export and ends up in `extra`.
- `ModuleState`: drivingStepsDone (old 7-step list, kept in the schema), drivingServiceLink, ieltsFeedbackChecks, homeZoneOffset (home weekly zone), autoSaveDay / autoSaveMinute (payday saving reminder), freshStartDismissed, resetMinutes (tidy timer length), and **`ieltsDriving`** (added by the wave): one opaque JSON blob for IELTS goals (target band, current level, 30-day goal) and driving (staged road with owner-entered steps and verified flags, supervised-practice conditions, weekly hazard goal and links, quiz questions with spaced-repetition state). Parsed and sanitised by `domain/features/ieltsDriving.ts`; malformed content renders safely (gate 6 adversarial test). It is not a typed entity, so it has no change-log entries (LOS-046). Money categories are ordinary `moneyEnvelopes` rows with ids `env_<cycleKey>_cat_<suffix>`.

Retired: domain `aquarium` stays in `DOMAIN_IDS` and in data; `loadSnapshot` switches it off once and filters it from every view.

## 3. Export / import format — `schemaVersion: 1`

Produced by `LifeRepository.exportAll(now)`, consumed by `previewImport` / `importAll`:

```jsonc
{
  "schemaVersion": 1,                       // kExportSchemaVersion; anything else is rejected
  "exportedAt": "2026-10-24T09:00:00.000",  // toIsoLocal(now)
  "boxes": {                                // every box of kFlutterBoxes + kWebBoxes except actions/engineRules
    "habits": [ { /* Habit */ } ],
    "dayPlans": [ { "date": "2026-10-24", /* … */ } ],
    "tasks": [ /* … */ ],
    "...": []
  },
  "meta": {
    "settings": { /* Settings, incl. "extra" keys flattened back */ },
    "openedDays": ["2026-10-23", "…"],
    "firstRunDate": "2026-10-01" | null,
    "moduleState": { /* ModuleState */ }
  }
}
```

Rules (from code):
- `previewImport(data)` is read-only: returns `{ ok, error (Arabic), schemaVersion, exportedAt, counts per box in file, current per box on device, skipped }`. Records missing their id key count as `skipped` (they are not written).
- Id key per box: `id`, except `domains → id`, `dayPlans → date`, `energyChecks → date` (`IMPORT_ID_KEYS`).
- `importAll(data, {confirm:true})`: throws if `confirm` is false or `schemaVersion !== 1`. **Takes an automatic backup first** (`createBackup('before-import')`), then for each exported box: web-only boxes **missing from the file are kept** (skipped); every other box is **cleared and replaced** (a Flutter-box missing from the file ends up empty); then writes `settings`, `openedDays`, `moduleState`, `firstRunDate` (if present) and sets `seeded = true`. Returns the `BackupInfo`.
- Encrypted export: with the lock on, the file is `{ format: 'wejdan-encrypted-backup', v: 1, kdf: 'PBKDF2-SHA256', iterations, salt, iv, ct }` (AES-GCM, AAD `wejdan-encrypted-backup/1`, password typed each time, never stored). Import detects it via `isEncryptedBackup`, asks for the password, then proceeds as above.
- Export contains **no** library boxes, **no** backups, **no** localStorage conveniences, **no** lock registry, **no** personal-library file.
- Reminder: the export file is plaintext JSON when the lock is off; it is the user's responsibility to store it (UI copy says so).

## 4. Backups, undo, change log

| Mechanism | Where | Rules |
|---|---|---|
| Automatic backups | box `backups`, `LifeRepository.createBackup(reason)` | Taken before: import (`before-import`), restore (`before-restore`), delete-all (`before-delete-all`), turning the lock on (`before-lock`). Snapshot = full export JSON. **Last `kMaxBackups = 5` kept** (older removed). Ids sort by timestamp; same-ms collisions get `_nnn`. Listed and restored in Settings → النسخ الاحتياطية (no delete-backup action exists in the store or UI; only the cap of 5 prunes them). Live in the same IndexedDB (and are encrypted with the profile when the lock is on). |
| Manual backup file | `store.exportAll()` → `downloadJson` (`ui/screens/me/meKit.tsx`) or encrypted via `backupIO` | Updates `Settings.lastBackupAt`; the 14-day nudge reads it. |
| Undo of deletes | `LifeStore.remember` / `undoDelete(token)` | `kUndoWindowMs = 10_000`. Tokens are in memory; expiry checked against the injected clock. |
| Undo of completions | `LifeStore.undo(logId)` | Same 10 s window using `log.loggedAt`; reverses Sparks with new reversal rows; restores `comebackPending`. |
| Change log | box `changelog` | Entities: task, inbox, habit, project, goal, product, note, routine, weeklyTask, joyItem, fixedEvent. Ops create/update/delete with `before`/`after` JSON. No-op updates skipped; note edits within 2 min coalesce; cap `kMaxChangeLog = 300` (oldest dropped). `restoreChange(entryId)` is itself logged. |
| Import-commit undo | `commitImport` returns an `UndoToken` | Reverts the batch's created items (10 s). |

## 5. Migration paths

| Path | Mechanism | Safety |
|---|---|---|
| **Flutter Hive → React** (same origin) | `migration/flutterHive.ts`: `detectLegacyData` (uses `indexedDB.databases()` or an aborted-open probe; never creates DBs) → `readLegacyData` (decodes JSON-string values or binary Hive String frames; skips and reports undecodable records) → `migrateLegacyData` = `store.importAll` (**backup first, explicit confirm**) → writes marker. Old `wlo_*` DBs are never written or deleted. | Marker `wejdan.legacyMigration.v1` = `{state:'done'|'later', at, backupId?}`; «بعدين» snoozes the boot offer 24 h; `shouldReofferLegacyMigration` re-offers once (`wejdan.legacyMigration.reoffered.v1`) as a **reviewed merge** if the user already uses the new app; `Settings → البيانات` keeps an entry until moved. Boot sheet is skipped while the lock is on (Settings path still works). |
| **Flutter JSON export → React** | Same `schemaVersion: 1` file imported through Settings (**synthetic** fixtures in `tests/fixtures/migration/` and `tests/domain/fixtures/export_sample.json`; test `flutterExport.test.ts`) | Flutter boxes replaced; web boxes kept. |
| **Plain → encrypted (lock on)** | `Vault.enableWithExisting`: `before-lock` backup in the plain DB → `copyRepository(src → dst)` for all `kAllBoxes` incl. `meta` and `backups` → **read back and compare every record (canonical JSON)** → write the **header** inside the encrypted DB → write the registry (compare-and-set) → fresh-connection proof (header, registry, every record decrypts). **The plain DB is kept** as rollback (`registry.legacy`) and removed by `finalizeLegacy` only after a real unlock with the new credentials on a LATER launch, when registry and header agree. `legacyDeletePending` (older registries) is retried by `cleanupLegacy`. | Any failure before the registry write: encrypted DB deleted, plain DB untouched (`vaultMigration.test.ts`, `vaultDurability.test.ts`, e2e `lockKill`). A lost registry is rebuilt from the headers by `recover()`. |
| **Encrypted → plain (lock off)** | `Vault.disableLock` (single profile only, as changed by `eed6603`): copy aside any plain DB holding unexpected data, copy + verify into the plain DB, write the `retired` marker in the encrypted DB's header and read it back, remove the registry. The encrypted DB is **kept** and removed by the next launch's `recover()` only if the plain DB still holds her data. | Needs password re-check first (UI). A kill at any point leaves either the lock on with all data, or the lock off with all data. Known residual: a kill about 190 to 220 ms in can leave an orphan plain DB / `_bak_` with no cleanup (LOS-040). Markers in the header table: `retired`, `deleted`, `migrating`. |
| New profile | `Vault.addProfile` → new empty encrypted DB + header, then registry; `createLifeStore` seeds it. | header-first, read back |
| Library version bump | `repo.libraryOutdated()` (`meta.libraryVersion !== kSeedLibraryVersion (4)`) → `refreshLibrary` rewrites `actions`/`engineRules`; user data untouched. Failure while offline is tolerated. | — |
| Early React build name key | `LifeStoreProvider.migrateLocalName` moves `wejdan.displayName` into `settings.displayName`, deletes the key. | — |
| Retiring a feature | `retireAquarium` (disable once, hide). | Data kept. |
| Dexie schema upgrade | **None defined** (only `version(1)`). | Future: add `version(2).upgrade(...)`; remember the vault copies rows generically. |

## 6. `localStorage` / `sessionStorage` inventory

"Purged" = removed by `purgeDeviceConveniences()` (`src/ui/lock/deviceKeys.ts`), which runs on **manual lock, adding a profile, and deleting a profile** — **not on auto-lock** (`VaultProvider`: the `lock` used by the auto-lock effect is the inner one without purge). Prefix list: `wejdan.recentSearches`, `wejdan.reviewRest`, `wejdan.reviewDraft.v`, `wejdan.joy.pick.`, `wejdan.focus.v`, `wejdan.onboarding.`, `wejdan.displayName`, `wos.reminders.v1`, `wejdan.personalActionLibrary`.

| Key | Owner | Content | In export? | Purged on lock |
|---|---|---|---|---|
| `wejdan.vault.v1` | `domain/vault/vault.ts` | Lock registry: `v`, **`rev`** (monotonic, compare-and-set), profiles (id, display name, username, avatar, `dbName`, key envelope = salts/iterations/**wrapped** keys/verifier, attempt counters, per-profile `rev`), `activeId`, `autoLock`, `legacy` (rollback pointer to the pre-lock plain DB), `legacyDeletePending`, `deleted` (tombstones). Mirrored by the header row in each profile DB. Not secret by design. Other tabs are told through `storage` events and `BroadcastChannel('wejdan.vault.registry')`. | no | **never** |
| `wejdan.theme` | `ui/shell/theme.tsx` | `light` / `dark` (absent = system) | no (settings.theme is separate) | kept |
| `wejdan.persistRequested` | `pwa/state.ts` | `'1'` once `storage.persist()` was asked | no | kept |
| `wejdan.legacyCleanupDone` | `pwa/legacyCleanup.ts` | `'1'` | no | kept |
| `wejdan.legacyShimHops` (sessionStorage) | `public/flutter_*.js` shims | integer hop counter | no | — |
| `wejdan.legacyMigration.v1` | `migration/flutterHive.ts` | `{state, at, backupId?}` | no | **not purged** |
| `wejdan.legacyMigration.reoffered.v1` | same | ISO timestamp | no | **not purged** |
| `wejdan.personalActionLibrary.v1` | `seed/personalLibrary.ts` | The user's imported personal action library (JSON), **only while the lock is off**. With the lock on it is a row in the encrypted DB (`meta` / `personalLibrary`) and any leftover copy here is moved in, verified, removed (`LifeStore.settlePersonalLibrary`). **Private data lives here on the owner's device only.** | no | **purged** (prefix `wejdan.personalActionLibrary`) on manual lock / switch / delete — as a safety net for stray copies |
| `wos.reminders.v1` (lock off) / `wos.reminders.v1.<profileId>` (lock on) | `reminders/useDueReminders.ts`, `lock/deviceKeys.ts` (`remindersKey`) | `{day, dismissed:number[], snoozed:{id→epoch ms}}` for the Today banner. Per profile; the plain key is adopted by the first profile when the lock is turned on, all variants are removed when it is turned off | no | **purged** (prefix `wos.reminders.v1`) |
| `wejdan.recentSearches` | `notes/SearchSheet.tsx` | last 6 search strings (user text) | no | purged |
| `wejdan.reviewRest` | `me/MeScreen.tsx` | day key | no | purged |
| `wejdan.reviewDraft.v2.<weekKey>` (**lock off only**) | `me/reviewDraft.ts` via `LifeStore.get/set/clearReviewDraftRaw` (`kReviewDraftLsPrefix`) | unsent weekly-review answers incl. miss reasons, strength ratings, season picks (user text). With the lock **on** the draft is a `meta` row inside the encrypted profile DB and no localStorage key exists | no | purged. Residual: after a crash during lock enable the plaintext key can survive until first unlock (LOS-043); after a crash right after turn-off the draft can be lost (LOS-042) |
| `wejdan.joy.pick.<dayKey>` | `joy/joyModel.ts` | chosen joy item id | no | purged |
| `wejdan.focus.v1` | `today/focusSession.ts` | running focus timer; stale after 12 h | no | purged |
| `wejdan.onboarding.draft.v1`, `wejdan.onboarding.intended.v1` | `state/onboardingResume.ts` | onboarding answers in progress (name, wake/sleep, picks) and intended deep link | no | purged |
| `wejdan.displayName` | `LifeStore.tsx` (migration only) | legacy name; removed after move | no | purged |

All reads/writes are wrapped in `try/catch` (blocked storage degrades silently). With the lock on, conveniences that were not purged (auto-lock, or the app killed mid-way) remain readable in the browser profile (documented limitation in the `vault.ts` header; 17 §2.2).

## 7. Service worker and caches

- Generated by `vite-plugin-pwa` (`generateSW`): `dist/sw.js` + `dist/workbox-<hash>.js`; `registerType: 'prompt'`; `injectRegister: false` (registered in `src/pwa/index.tsx`); `clientsClaim: false`, `skipWaiting: false`; `cleanupOutdatedCaches: true`; `navigateFallback: '/wejdan-os/index.html'`; `maximumFileSizeToCacheInBytes` 4 MB.
- Precache: `**/*.{js,css,html,png,svg,woff2,json,webmanifest}` minus `splash/**`, Cyrillic/Greek/Vietnamese font subsets, `actions-*.js`, `actions_ar-*.js`, and the four `flutter*`/`main.dart.js` shims → **139 entries, 2403.99 KiB** in this build.
- Runtime: `/assets/actions(_ar)?-*.js` → `CacheFirst`, cache `wejdan-action-library`, max 6 entries.
- Update check: hourly and on `visibilitychange → visible`; new worker waits; `updateSW(true)` after the user taps.
- Legacy: `public/flutter_service_worker.js` (kill switch) must stay deployed at the same URL for old installs; `legacyCleanup.ts` removes foreign registrations and `flutter*` caches (not IndexedDB).
- Scope/manifest: scope and start URL `/wejdan-os/`, `display: standalone`, `lang: ar`, `dir: rtl`, `theme_color #FFFFFF`, `background_color #F2F7FE`; four icons (192/512 any + maskable).

## 8. Integrations — real vs mocked

| Integration | Kind | Status |
|---|---|---|
| Remote API / backend / database / auth / sync / push / email / analytics / crash reporting / ads / A-B | — | **None exist.** No such code or config; no env vars; no secrets. |
| IndexedDB (Dexie 4.0.8) | local browser storage | real, production path |
| Web Crypto (AES-GCM, PBKDF2-SHA256, `wrapKey`) | local | real (opt-in lock + encrypted export) |
| `BroadcastChannel` (`wejdan.vault.registry`) + `storage` event | same-origin tab-to-tab refresh of the lock registry; no network | real (only when the lock registry exists) |
| Service Worker + Cache Storage (Workbox) | local | real |
| `navigator.storage.persist()` | browser API | real; requested once per device at boot. `usePersistentStorage()` exists in `src/pwa` but has **no caller in `src/ui`** (no status row is shown) |
| Web Share API with files; Blob download via `URL.createObjectURL` | local export | real (`ui/lib/shareFile.ts`, `meKit.downloadJson`); behaviour on real iOS/Android NOT VERIFIED |
| `<input type="file">` | local import | real (backup JSON, personal library JSON, sources import) |
| `adhan` (offline prayer times) | local library | real, off by default |
| iCalendar `.ics` file | local file for the user's calendar app | real; import into a calendar app NOT VERIFIED |
| `tel:` links (Help), evidence links to PubMed/DOI opened in a new tab by the user | outbound navigation by user action | real; not app-initiated requests |
| Old Flutter IndexedDB `wlo_*` | local read-only source | real |
| `fake-indexeddb`, `InMemoryLifeRepository`, test fixtures, `preview/` harnesses | test/dev/fallback | mock — never active in a normal production run (the in-memory repo is only the storage-blocked fallback with a visible banner) |
| Notifications / Push / Background sync / Periodic sync | — | **Not implemented by decision**: reminders are in-app banners while the app is open plus a `.ics` export |
