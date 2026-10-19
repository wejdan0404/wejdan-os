# Wejdan Life OS — Core API (for the UI engineer)

This layer is **non-visual**. It gives you models, persistence, a pure-Dart
engine and Riverpod providers. Build screens on top; never re-implement
engine rules in widgets.

```
lib/
  core/date_utils.dart        dayKey, logicalDay (04:30 boundary), formatHm, inWindow, stableHash
  data/models/                immutable models + toJson/fromJson (barrel: models.dart)
  data/repository.dart        LifeRepository (abstract) · HiveLifeRepository · InMemoryLifeRepository
  data/seed/                  SeedLibrary (actions.json) · StarterProfile (persona) · domainForAction
  engine/                     pure Dart, no Flutter imports (barrel: engine.dart)
  services/                   NotificationService (iOS / no-op), AppLockService, ExportShareService
  state/                      providers.dart (read) · life_controller.dart (write) · bootstrap.dart
  l10n/                       app_ar.arb (template, primary) · app_en.arb · generated AppLocalizations
  main.dart                   boot + placeholder list (replace)
```

## 1. Boot

`main.dart` already does this — keep the sequence when you replace the UI:

```dart
WidgetsFlutterBinding.ensureInitialized();
await Hive.initFlutter();
final repo = await bootstrapRepository(
  repo: HiveLifeRepository(),
  loadSeedJson: () => rootBundle.loadString('assets/data/actions.json'),
  now: DateTime.now(),
);                                   // opens boxes, seeds on first run only
final notifications = createNotificationService(); // iOS impl, no-op on web
await notifications.init(onAction: ...);           // see §6
runApp(ProviderScope(overrides: [
  repositoryProvider.overrideWithValue(repo),
  notificationServiceProvider.overrideWithValue(notifications),
], child: const WejdanApp()));
```

On app resume / day change call `ref.invalidate(todayProvider)`; then
`ref.read(lifeControllerProvider.notifier).scheduleTodayNudges()`.
The logical day flips at **04:30** (`kDayBoundaryMinute`), so 00:30 activity
counts for the previous day.

## 2. Reading state (providers — `lib/state/providers.dart`)

All are plain `Provider`s derived from one `AsyncNotifier`; they recompute
automatically after any mutation.

| Provider | Type | Use |
|---|---|---|
| `lifeControllerProvider` | `AsyncValue<LifeSnapshot>` | loading/error gate for the whole app |
| `snapshotProvider` | `LifeSnapshot?` | everything in memory (lists of every entity) |
| `todayProvider` | `DateTime` | logical today (invalidate on resume) |
| `todayPlanProvider` | `AsyncValue<DayPlan>` | **Today screen** |
| `dayPlanProvider(date)` | `DayPlan?` | e.g. tomorrow's first action (Evening Shutdown) |
| `todayLogsProvider` | `Map<itemId, LogEntry>` | done-state of cards today (best level) |
| `energyTodayProvider` / `energyAnsweredTodayProvider` | `EnergyMode` / `bool` | Morning Brief shown once/day |
| `settingsProvider` | `Settings` | language, theme, caps, quiet hours, anchors… |
| `domainsProvider`, `currentSeasonProvider`, `seasonsProvider` | | Life Map / Seasons |
| `habitsProvider`, `coreHabitsProvider` | `List<Habit>` | Habit Studio; Core = active habits in Grow domains |
| `habitStrengthProvider(habitId)` | `HabitStrength?` | SRBAI, consistency, recovery speed, `stage` (garden) |
| `momentumProvider(habitId)` | `double` 0–100 | Momentum ring |
| `domainMomentumProvider(domainId)` | `double` | Insights |
| `forgivingStreakProvider(habitId)` | `ForgivingStreak?` | null unless enabled in Settings |
| `sparksBalanceProvider`, `sparksEarnedTodayProvider`, `sparkLedgerProvider` | | Joy tab |
| `joyItemsProvider` | `List<JoyItem>` | Joy Map / Bundles / Reward shop |
| `recoveryTriggersProvider` | `List<RecoveryTrigger>` | non-empty → open Recovery flow |
| `capacityViolationsProvider` | `List<CapacityViolation>` | overload banner |
| `reminderPlanProvider` | `ReminderPlan?` | Settings preview; `muted` → "quiet mode" suggestions |
| `vocabDueProvider` | `List<VocabCard>` | IELTS hub queue |
| `activeExperimentProvider`, `experimentResultProvider(id)` | | Experiments |
| `goalsProvider`, `projectsProvider` | | Path tab |
| `actionLibraryProvider`, `engineRulesProvider` | | Evidence Library / Why-sheet |

## 3. Writing (LifeController — `ref.read(lifeControllerProvider.notifier)`)

| Method | Notes |
|---|---|
| `completeItem(PlanItem, CompletionLevel, {durationMin, enjoyment, note})` → `CompletionResult` | any level = done; Sparks: 1/2/3, comeback ×2, weekly review 5, cap 20/day; joy earns 0. Project steps get marked done. Show `result.isComeback` celebration ("رجعتي — هذا أهم جزء"). |
| `undo(logId)` → `bool` | only within `kUndoWindow` (10 s); reverses Sparks & project step |
| `skipItem(PlanItem)` | explicit skip (no Sparks, never a failure state) |
| `setEnergy(EnergyMode)` | Morning Brief; re-plans instantly |
| `recordStrengthCheck(habitId, [i1,i2,i3,i4])` | weekly SRBAI (1–5 each) |
| `redeem(joyItemId)` → `RedeemResult` | Earned Rewards only; `shortBy` when not enough |
| `upsertHabit(h, {force})` → violations | **capacity-guarded**: non-empty result = nothing saved → show "swap or park"; `force: true` to save anyway. Sets `createdDate` if missing. |
| `setDomainState(id, state, {force})` → violations | Grow ≤3 / Maintain ≤5; also updates current Season |
| `setDomainEnabled(id, bool)` | modules (Women's health, Aquarium) |
| `upsertProject(p, {force})` → violations | Active ≤2, active course ≤1 |
| `upsertRoutine`, `upsertWeeklyTask`, `upsertGoal`, `upsertJoyItem`, `upsertFixedEvent`, `deleteFixedEvent`, `deleteHabit` | plain saves |
| `startNewSeason(titleAr, titleEn)` | ends current season, snapshots states |
| `proposeRecovery(habitId, MissReason)` → `DesignChange` | step 2 of Recovery |
| `acceptDesignChange(change)` → `Habit` | applies + flags Comeback bonus |
| `startExperiment(e)` → `bool` / `finishExperiment(id, keep:)` → `SparkAward` | max 1 active; +3 Sparks on finish |
| `addVocabCard`, `reviewVocab(cardId, grade)` | SM-2; use `VocabGrade.again/hard/good/easy.q` |
| `addMockTest`, `addDrivingSession`, `upsertEnvelope/Bill/Bnpl/Wish/AdminDoc` | module data |
| `recordNudgeResponse(itemId, NudgeResponse)` | feeds adaptive mute (3 ignored → quiet mode) |
| `scheduleTodayNudges()` → `ReminderPlan` | builds + hands to `NotificationService` |
| `exportAll()` → JSON map / `importAll(json)` / `deleteAllAndReseed()` | Settings → data ownership; share with `createExportShareService().shareJson(json)` |

## 4. The DayPlan contract (Today screen)

`DayPlan { date, energy, items, thisWeek, deferred, budgetMin, usableMin, plannedMin, showHelpLink }`

* `items` are sorted: `PlanSection.morningChain` → `day` → `eveningChain`, then by `startMinute`.
* `PlanItem.tier`: `core` (≤3 Green, ≤2 Yellow), `maintain` (≤2), `joy` (exactly 1 Free Joy, unscheduled), `chain` (routine steps, not capped), `system` (weekly review).
* **Default done bar is always `defaultLevel == minimum`** (ENG-19). `suggestedLevel` is what today suggests (normal on Green; minimum on Yellow for non-core, Red, shrunk habits, or `timeTrimmed`).
* `why` = primary "why today" (`WhyToday{code,args,text: LocalizedText}`); `extraWhy` = secondary lines. Use `item.why.text.of(lang)`.
* `bundleJoyId` / `bundleTitle` → start button "ابدئي المشي + البودكاست".
* `ieltsSkill` (on the vocab habit) → today's rotation skill; localize with `ieltsSkillName(skill)`.
* `isComeback` → welcome-back framing; Sparks ×2.
* `thisWeek` → "This week" strip (weekly tasks open this week: no preferred day, carried over, or overflowing caps). Empty on Red days.
* `deferred` → didn't fit today's time; don't show as todo.
* `showHelpLink` (Red) → subtle link to Help & Safety.
* Log with `completeItem(item, level)`; `item.itemId` is the log key.

## 5. Engine functions (pure, `lib/engine/`)

| File | Entry points | Rules |
|---|---|---|
| `day_planner.dart` | `planDay(PlannerInput) → DayPlan`, `rotationSkill(weekday, weakest:)`, `learnedMinutes(...)` | caps 3/2/1; Yellow/Red; budget × 0.7 (`kBufferFactor`) with learned durations (median of last 5); weekly due/carry; walk/strength via `alternationGroup`; IELTS rotation GROW-12; deterministic |
| `habit_strength.dart` | `srbaiScore`, `consistencyScore`, `recoverySpeedDays`, `stageFor`, `computeStrength` | thresholds table in the file header; never a day count |
| `momentum.dart` | `habitMomentum`, `momentumFromOutcomes`, `averageMomentum`, `forgivingStreak` | 7-period EMA (α 0.25), never resets to 0; 2 grace days/week |
| `sparks.dart` | `awardForCompletion`, `awardForWeeklyReview`, `awardForExperiment`, `txnForAward`, `reversalsFor`, `redeemReward`, `sparkBalance`, `earnedOn` | 1/2/3, ×2 comeback, 5, 3, cap 20 |
| `recovery.dart` | `checkRecovery`, `missedStreak`, `proposeChange`, `applyDesignChange`, `isComebackCompletion`, `bestCompletionMinute`, `kReasonToChange` | 3 planned misses in a row or 2 unopened days |
| `reminders.dart` | `buildReminderPlan`, `ignoredInARow`, `NudgePayload.parse`, `NotificationService` | cap 4 (0–6), quiet 23:00–07:00, focus suppression, mute after 3 ignored |
| `anchors.dart` | `AnchorResolver.resolve(anchor, day)`, `computePrayerMinutes` | wake/sleep/fixed/slot; prayer (Umm al-Qura, Makkah default) only if enabled |
| `vocab_srs.dart` | `newVocabCard`, `reviewCard`, `dueCards`, `dueCount`, `VocabGrade` | SM-2 style |
| `capacity_guard.dart` | `checkCapacity`, `violationsAfter`, `coreHabitsOf` | 3 Grow, 5 Maintain, 2 Active projects, 7 Core habits, 1 course |
| `experiments.dart` | `canStartExperiment`, `compareExperiment` | before/after completion rate + mean enjoyment |
| `why_today.dart` | `kEngineStrings`, `engineText`, `buildWhy`, `ieltsSkillName`, `weekdayName` | mirrored 1:1 in ARB (test-enforced) |

## 6. Notifications

`NotificationService` (`init`, `requestPermission`, `scheduleDay`, `snooze`,
`cancelAll`). iOS: category `wejdan_nudge` with actions `done_min`,
`snooze_30`, `skip`. `init(onAction:)` delivers `NudgeAction{type, payload}`;
map it to: `done` → `completeItem(item, minimum)` + `recordNudgeResponse(done)`;
`snooze` → `service.snooze(...)` + `recordNudgeResponse(snoozed)`; `skip` →
`skipItem` + `recordNudgeResponse(skipped)`. Nudges she never acts on should
be recorded as `ignored` (e.g. on next open for yesterday's delivered nudges)
so adaptive mute works. Background action handling (app terminated) is not
wired yet.

## 7. Models (`lib/data/models/`)

Action, EvidenceSource, EngineRule · Domain, Season · Habit (CueAnchor,
HabitSchedule, HabitReminder) · Routine, RoutineStep · WeeklyTask ·
Project, ProjectStep · Goal, Milestone (roadmap `quarter` 1–4 only) ·
LogEntry · DayPlan, PlanItem, WhyToday, FixedEvent · EnergyCheck ·
StrengthCheck · JoyItem · SparkTxn · Experiment · NudgeRecord · VocabCard ·
MockTest · DrivingSession · MoneyEnvelope, Bill, BnplItem, WishItem ·
AdminDoc · Settings · LocalizedText. All immutable, `toJson`/`fromJson`
(forgiving parsers), most with `copyWith`. Enums in `enums.dart`.

Times of day are **ints (minutes since midnight)**; days are **`yyyy-MM-dd`
keys**; weekdays follow `DateTime.weekday` (1 = Mon … 7 = Sun). Week starts
Sunday (Settings.weekStartsOn).

## 8. Starter profile ids (stable)

Habits `h_vocab` (GROW-07 + GROW-12 rotation), `h_focus` (GROW-22, Sun–Thu),
`h_walk` (BODY-02, Mon/Wed/Fri/Sat), `h_strength` (BODY-05, Sun/Tue/Thu),
`h_wake`, `h_sunscreen` (morning chain), `h_room_reset`, `h_wind_down`,
`h_cleanse`, `h_dental` (night chain). Routines `r_morning`, `r_night`.
Weekly `wt_ielts_writing` (Mon), `wt_meal_plan` (Fri, pinned), `wt_admin`
(Sun, pinned), `wt_weekly_review` (Sat evening). Goals `g_driving`,
`g_ielts`, `g_career`, `g_health`, `g_money`. Joy `joy_coffee_book` (free),
`joy_podcast` (walk bundle), `joy_series` (strength bundle), `joy_beans` 60,
`joy_book` 120, `joy_outing` 200.

## 9. Localization & fonts

`AppLocalizations` (generated by `flutter gen-l10n`, template `app_ar.arb`).
Engine-produced text (why-today, notifications) is already bilingual on the
models. Fonts: `IBMPlexSansArabic` (400/500/600/700), `IBMPlexSans`
(400/500/600) — OFL license in `assets/fonts/OFL-LICENSE.txt`. Digits are
Western everywhere (test-enforced for ARB).

## 10. Decisions to know

* Rest domains hide their items, **except weekly tasks with `pinned: true`**
  (starter meal plan and admin block live in Rest domains Food / Life admin
  but were explicitly chosen) and the weekly review (system ritual).
* Chains (routine steps) and the Free Joy are **outside** the time budget;
  the budget (`Settings.dailyBudgetMin`, default 150, per-weekday overrides)
  covers standalone blocks.
* "Core" for planner/capacity = Grow-domain habits; `Habit.priority` is the
  evidence priority from the library.
* Seed texts: English in `actions.json`; Arabic in `actions_ar.json`
  (UI-2, see §12). Starter habits are seeded in the profile language.

## 11. Changes made by the UI layer (UI-1)

* `Settings.firstActionPin` (`"<dayKey>|<itemId>"`, nullable): tomorrow's
  first action chosen in Evening Shutdown; read via
  `pinnedFirstActionProvider` / `firstActionProvider`
  (`lib/ui/state/ui_providers.dart`). JSON round-trip tested.
* `main.dart` now boots through `lib/ui/app.dart` (`WejdanApp`), awaits the
  first snapshot before `runApp` (a second MaterialApp would reset web deep
  links), maps notification actions (`handleNudgeAction`) per §6, and applies
  web-only demo flags (`lib/ui/demo_flags.dart`).
* Evening Shutdown's optional savouring line is stored as a joy log with
  `itemId: 'evening_savor'` (earns 0 Sparks, note = her line).
* Unchecking a done card calls `undo(logId, ignoreWindow: true)` (explicit
  correction; Sparks are reversed); level change on a done card = undo +
  re-log. The 10 s window still governs the snackbar "تراجع".

## 12. Changes made by the UI layer (UI-2)

* **Arabic Action Library.** `assets/data/actions_ar.json` (from
  `docs/actions_ar.source.json`, keyed by `action_id`) is parsed by
  `SeedLibrary.parse(raw, arRaw:)` into optional `Action.ar` /
  `EngineRule.ar` (`ActionAr`, fields `ActionField.*`). Read with
  `action.text(ActionField.x, lang)` (Arabic → English fallback; returns
  null for «لا ينطبق» / "n/a", and for the dose of JOY-12 / JOY-13) and
  `action.title(lang)` (Arabic card title). JSON key `ar` is optional →
  backward compatible. `bootstrapRepository(loadArJson:)` seeds with Arabic
  and refreshes the stored read-only library once when
  `SeedLibrary.version` (2) is newer (meta `libraryVersion`); user data is
  untouched. `seedArJsonLoaderProvider` is used by delete-all re-seed.
* `StarterProfile.build(lib, today, lang:)` / `SeedBundle.build(…, arJson:,
  lang:)`: starter habit / routine-step / weekly-task texts in the profile
  language (Arabic by default), Arabic titles = card titles.
* **New models** (`models/extras.dart`): `ModuleState` (meta document
  `moduleState`, exported in `meta`), `Errand`, `CycleEntry`,
  `WeeklyReviewRecord` (id = week start day key; one chapter per week) —
  boxes `errands`, `cycleEntries`, `weeklyReviews` (exported/imported).
* **Engine** (pure, tested in `test/engine/ui2_engine_test.dart`):
  `fresh_start.dart` — `freshStartOn(day, weekStartsOn:, season:)` (season
  within 3 days > 1st of month > week start), `freshStartTomorrow` (season
  only if it starts tomorrow); `dues.dart` — `upcomingDues(...)`,
  `nextMonthlyDate`, `coolingDaysLeft`, `nextSpacedPractice` (gaps 1,2,4,7,14);
  `insights.dart` — `recoverySpeedByWeek`, `bestTimeWindow` (≥3 samples,
  middle half, ≥30 min), `systemBurden` (log count + measured review
  minutes), `weekCount`; `experiments.dart` — `suggestExperiments(coreHabits,
  joyItems)` (bundle / time swap / minimum-only drafts, max 3).
* **Providers**: `moduleStateProvider`, `weeklyReviewsProvider`,
  `currentChapterProvider`, `freshStartTodayProvider` (null when dismissed
  today), `upcomingDuesProvider`.
* **LifeController**: `updateModuleState`, `upsertErrand` / `deleteErrand`,
  `addCycleEntry` / `deleteCycleEntry`, `saveWeeklyReview(record)` →
  `SparkAward` (stores the chapter; logs the weekly-review ritual + 5 Sparks
  once per week), `deleteBill`, `deleteBnpl`, `deleteWish`,
  `deleteAdminDoc`, `deleteProject`, `deleteJoyItem`.
* Dues are shown in-app only; they are not part of `buildReminderPlan`.

## 13. Changes in Fix pass 1 (QA report 2026-09-28)
* **Boot fallback (D01/D02).** `main()` opens Hive with a 5 s timeout inside
  try/catch; on any failure it boots a seeded `InMemoryLifeRepository` and
  overrides `storagePersistentProvider` (`lib/ui/app.dart`) with `false`, so
  the app shows the banner «الحفظ غير متاح في هذا المتصفح — بياناتك مؤقتة».
* **Planner.** Items logged done today are pinned to their tier first and
  count toward the cap; new items only fill the remaining capacity; pinned
  items are never trimmed or deferred (also on Red). Maintain is ranked weekly
  task → project step → daily habit and placed in two passes (reserve every
  minimum, then upgrade to the suggested level while the budget allows).
* **Starter profile.** `h_room_reset` (LIFE-13) and the new `h_money_log`
  (LIFE-05) are standalone Maintain habits (Green day = up to 2 maintain,
  Main.png). The night routine no longer contains the room reset. Onboarding's
  starter-habit step only covers Grow-domain habits.
* **Minimum minutes.** `Action.statedMinimumMinutes` / `statedMinutesIn()`
  read minutes from the library's minimum text ("30 min before bed" is an
  offset, ignored). `Habit.minimumDurationEstimated` marks a planning
  estimate (Why sheet: «تقدير»); `minimumDurationMin == 0` = not set (Studio
  asks «حددي مدة صغيرة»; save is blocked until set). Nothing is derived from
  the normal minutes any more.
* **Momentum.** Floor `kMomentumRestFloor` (1.0) once she has any completion,
  even older than the 60-day lookback; `isMomentumResting()` → the ring shows
  «راحة» instead of a number.
* **Quiet hours.** `effectiveQuietEnd(settings)` = `Settings.effectiveQuietEndMinute`:
  her own end if `quietEndSetByUser` (set by `withQuietEnd` / the Settings «إلى»
  tile), otherwise her wake time. Morning Brief at max(wake, quiet end).
  `Settings.withWake()` never moves her own end (QA R1, Fix pass 3).
* **Dues notification.** `buildReminderPlan(dues:)` adds ONE `NudgeKind.dues`
  («مستحقات اليوم») for bills, subscriptions, BNPL, renewals and auto-save due
  today (or overdue), 60 min after the Morning Brief, inside the daily cap
  (priority: brief, evening, dues, then anchored nudges). `reminderPlanFor`
  passes `upcomingDues(horizonDays: 0)`.
* **Undo.** `undo()` restores `comebackPending` when the undone log consumed a
  Recovery comeback (level change keeps ×2).
* **Focus blocks.** `LifeController.build()` deletes every `isFocusBlock`
  FixedEvent on launch (a killed session can't keep silencing nudges); the
  block title is localised («جلسة تركيز»).
* **Seed text.** `SeedLibrary.parse` replaces internal ids ("BODY-25") in all
  texts with «the action's title»; `SeedLibrary.version` = 3.
