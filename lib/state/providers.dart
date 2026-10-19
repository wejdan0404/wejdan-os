/// Riverpod providers — the API the UI layer consumes.
///
/// Boot: override [repositoryProvider] (opened + seeded repository) in the
/// root `ProviderScope`; optionally override [clockProvider],
/// [notificationServiceProvider], [seedJsonLoaderProvider].
///
/// Read state with the derived providers (`todayPlanProvider`,
/// `sparksBalanceProvider`, `habitStrengthProvider(id)` …); mutate only via
/// `ref.read(lifeControllerProvider.notifier)`.
library;

import 'package:flutter/services.dart' show rootBundle;
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/date_utils.dart';
import '../data/models/models.dart';
import '../data/repository.dart';
import '../engine/engine.dart';
import 'life_controller.dart';
import 'life_snapshot.dart';

export 'life_controller.dart';
export 'life_snapshot.dart';

// ---- infrastructure --------------------------------------------------------

/// The opened, seeded repository. Must be overridden at boot.
final repositoryProvider = Provider<LifeRepository>(
  (ref) => throw UnimplementedError('Override repositoryProvider in ProviderScope'),
);

/// Injectable clock (tests pin a date).
final clockProvider = Provider<DateTime Function()>((ref) => DateTime.now);

/// Platform notifications (iOS impl / no-op). Override at boot.
final notificationServiceProvider = Provider<NotificationService>((ref) => NoopNotificationService());

/// Loads the Action Library JSON (used when re-seeding after "delete all").
final seedJsonLoaderProvider = Provider<Future<String> Function()>(
  (ref) => () => rootBundle.loadString('assets/data/actions.json'),
);

/// Loads the Arabic Action Library fields (`assets/data/actions_ar.json`).
/// Null = re-seed without Arabic (tests).
final seedArJsonLoaderProvider = Provider<Future<String> Function()?>(
  (ref) => () => rootBundle.loadString('assets/data/actions_ar.json'),
);

// ---- root state --------------------------------------------------------------

/// All data in memory + every mutation. `AsyncValue<LifeSnapshot>`.
final lifeControllerProvider = AsyncNotifierProvider<LifeController, LifeSnapshot>(LifeController.new);

/// Loaded snapshot or null while loading.
final snapshotProvider = Provider<LifeSnapshot?>((ref) => ref.watch(lifeControllerProvider).value);

/// Today's *logical* date (midnight; the day flips at 04:30, see
/// [kDayBoundaryMinute]). Invalidate on app resume / day change:
/// `ref.invalidate(todayProvider)`.
final todayProvider = Provider<DateTime>((ref) => logicalDay(ref.watch(clockProvider)()));

final settingsProvider = Provider<Settings>((ref) => ref.watch(snapshotProvider)?.settings ?? const Settings());

final domainsProvider = Provider<List<Domain>>((ref) => ref.watch(snapshotProvider)?.domains ?? const []);

final currentSeasonProvider = Provider<Season?>((ref) => ref.watch(snapshotProvider)?.currentSeason);

final seasonsProvider = Provider<List<Season>>((ref) => ref.watch(snapshotProvider)?.seasons ?? const []);

final habitsProvider = Provider<List<Habit>>((ref) => ref.watch(snapshotProvider)?.habits ?? const []);

/// Active habits in Grow domains (the "Core" set, max 7).
final coreHabitsProvider = Provider<List<Habit>>(
  (ref) => coreHabitsOf(ref.watch(habitsProvider), ref.watch(domainsProvider)),
);

// ---- today ---------------------------------------------------------------------

/// Today's energy (Green until she answers the Morning Brief).
final energyTodayProvider = Provider<EnergyMode>((ref) {
  final s = ref.watch(snapshotProvider);
  return s == null ? EnergyMode.green : energyOn(s, ref.watch(todayProvider));
});

/// True once she answered today's energy check (Morning Brief shown once).
final energyAnsweredTodayProvider = Provider<bool>((ref) {
  final key = dayKey(ref.watch(todayProvider));
  return (ref.watch(snapshotProvider)?.energyChecks ?? const []).any((c) => c.date == key);
});

/// Planner input for [date] from the snapshot.
PlannerInput plannerInputFor(LifeSnapshot s, DateTime date, EnergyMode energy) => PlannerInput(
      date: date,
      energy: energy,
      settings: s.settings,
      domains: s.domains,
      habits: s.habits,
      routines: s.routines,
      weeklyTasks: s.weeklyTasks,
      projects: s.projects,
      joyItems: s.joyItems,
      logs: s.logs,
      vocabCards: s.vocabCards,
      fixedEvents: s.fixedEvents,
      mockTests: s.mockTests,
    );

/// Energy recorded for [date] in [s] (Green when unanswered).
EnergyMode energyOn(LifeSnapshot s, DateTime date) {
  final key = dayKey(date);
  return s.energyChecks.where((c) => c.date == key).firstOrNull?.mode ?? EnergyMode.green;
}

/// Reminder plan for [date] computed straight from a snapshot.
ReminderPlan reminderPlanFor(LifeSnapshot s, DateTime date) => buildReminderPlan(
      plan: planDay(plannerInputFor(s, date, energyOn(s, date))),
      settings: s.settings,
      habits: s.habits,
      nudgeHistory: s.nudgeRecords,
      logs: s.logs,
      fixedEvents: s.fixedEvents,
      dues: upcomingDues(
        today: date,
        bills: s.bills,
        bnpl: s.bnplItems,
        docs: s.adminDocs,
        autoSaveDay: s.moduleState.autoSaveDay,
        horizonDays: 0,
      ),
    );

/// Today's plan (spec §5.1). Recomputed whenever data/energy/date change.
final todayPlanProvider = Provider<AsyncValue<DayPlan>>((ref) {
  final snap = ref.watch(lifeControllerProvider);
  final today = ref.watch(todayProvider);
  final energy = ref.watch(energyTodayProvider);
  return snap.whenData((s) => planDay(plannerInputFor(s, today, energy)));
});

/// Plan for an arbitrary day (e.g. tomorrow's first action in Evening
/// Shutdown). Uses today's energy only when [date] is today.
final dayPlanProvider = Provider.family<DayPlan?, DateTime>((ref, date) {
  final s = ref.watch(snapshotProvider);
  if (s == null) return null;
  final isToday = dayKey(date) == dayKey(ref.watch(todayProvider));
  return planDay(plannerInputFor(s, date, isToday ? ref.watch(energyTodayProvider) : EnergyMode.green));
});

/// Best log per item for today (itemId → LogEntry) — drives card done-state.
final todayLogsProvider = Provider<Map<String, LogEntry>>((ref) {
  final key = dayKey(ref.watch(todayProvider));
  final logs = (ref.watch(snapshotProvider)?.logs ?? const <LogEntry>[]).where((l) => l.date == key);
  final ids = logs.map((l) => l.itemId).toSet();
  return {for (final id in ids) id: indexLogsByDay(logs, id)[key]!};
});

// ---- sparks ----------------------------------------------------------------------

final sparksBalanceProvider = Provider<int>((ref) => sparkBalance(ref.watch(snapshotProvider)?.sparkTxns ?? const []));

final sparksEarnedTodayProvider = Provider<int>((ref) =>
    earnedOn(ref.watch(snapshotProvider)?.sparkTxns ?? const [], dayKey(ref.watch(todayProvider))));

/// Ledger newest first.
final sparkLedgerProvider = Provider<List<SparkTxn>>((ref) {
  final list = [...(ref.watch(snapshotProvider)?.sparkTxns ?? const <SparkTxn>[])];
  list.sort((a, b) => (b.at ?? DateTime(0)).compareTo(a.at ?? DateTime(0)));
  return list;
});

final joyItemsProvider = Provider<List<JoyItem>>((ref) => ref.watch(snapshotProvider)?.joyItems ?? const []);

// ---- strength & momentum ---------------------------------------------------------------

final habitStrengthProvider = Provider.family<HabitStrength?, String>((ref, habitId) {
  final s = ref.watch(snapshotProvider);
  final h = s?.habit(habitId);
  if (s == null || h == null) return null;
  return computeStrength(habit: h, logs: s.logs, checks: s.strengthChecks, today: ref.watch(todayProvider));
});

final momentumProvider = Provider.family<double, String>((ref, habitId) {
  final s = ref.watch(snapshotProvider);
  final h = s?.habit(habitId);
  if (s == null || h == null) return 0;
  return habitMomentum(habit: h, logs: s.logs, today: ref.watch(todayProvider));
});

/// Mean momentum of active habits in a domain (Insights).
final domainMomentumProvider = Provider.family<double, DomainId>((ref, domain) {
  final s = ref.watch(snapshotProvider);
  if (s == null) return 0;
  final hs = s.habits.where((h) => h.isActive && h.domain == domain).toList();
  return averageMomentum(habits: hs, logs: s.logs, today: ref.watch(todayProvider));
});

/// Null when the optional forgiving streak is off in Settings.
final forgivingStreakProvider = Provider.family<ForgivingStreak?, String>((ref, habitId) {
  final s = ref.watch(snapshotProvider);
  final h = s?.habit(habitId);
  if (s == null || h == null || !s.settings.forgivingStreak) return null;
  return forgivingStreak(habit: h, logs: s.logs, today: ref.watch(todayProvider), weekStartsOn: s.settings.weekStartsOn);
});

// ---- recovery, capacity, reminders, learning ------------------------------------------

/// Open recovery triggers (spec §5.5). Empty = nothing to show.
final recoveryTriggersProvider = Provider<List<RecoveryTrigger>>((ref) {
  final s = ref.watch(snapshotProvider);
  if (s == null) return const [];
  return checkRecovery(
    coreHabits: ref.watch(coreHabitsProvider),
    logs: s.logs,
    openedDays: s.openedDays,
    today: ref.watch(todayProvider),
    firstRunDate: s.firstRunDate,
  );
});

final capacityViolationsProvider = Provider<List<CapacityViolation>>((ref) {
  final s = ref.watch(snapshotProvider);
  if (s == null) return const [];
  return checkCapacity(domains: s.domains, projects: s.projects, habits: s.habits);
});

/// Today's notification plan (call `LifeController.scheduleTodayNudges`).
final reminderPlanProvider = Provider<ReminderPlan?>((ref) {
  final s = ref.watch(snapshotProvider);
  if (s == null) return null;
  return reminderPlanFor(s, ref.watch(todayProvider));
});

final vocabDueProvider = Provider<List<VocabCard>>((ref) =>
    dueCards(ref.watch(snapshotProvider)?.vocabCards ?? const [], ref.watch(todayProvider)));

final activeExperimentProvider = Provider<Experiment?>((ref) =>
    (ref.watch(snapshotProvider)?.experiments ?? const <Experiment>[])
        .where((e) => e.status == ExperimentStatus.active)
        .firstOrNull);

final experimentResultProvider = Provider.family<ExperimentResult?, String>((ref, experimentId) {
  final s = ref.watch(snapshotProvider);
  final e = s?.experiments.where((x) => x.id == experimentId).firstOrNull;
  final h = e == null ? null : s?.habit(e.habitId);
  if (s == null || e == null || h == null) return null;
  return compareExperiment(experiment: e, habit: h, logs: s.logs, today: ref.watch(todayProvider));
});

final goalsProvider = Provider<List<Goal>>((ref) => ref.watch(snapshotProvider)?.goals ?? const []);

final projectsProvider = Provider<List<Project>>((ref) => ref.watch(snapshotProvider)?.projects ?? const []);

/// Action Library (evidence) without engine rules.
final actionLibraryProvider = Provider<List<Action>>((ref) => ref.watch(snapshotProvider)?.actions ?? const []);

final engineRulesProvider = Provider<List<EngineRule>>((ref) => ref.watch(snapshotProvider)?.engineRules ?? const []);

// ---- UI-2 additions -------------------------------------------------------------------

/// Per-module UI state (driving checklist, feedback ticks, zone, auto-save…).
final moduleStateProvider = Provider<ModuleState>((ref) => ref.watch(snapshotProvider)?.moduleState ?? const ModuleState());

/// Closed weekly reviews, oldest first (chapter n = index + 1).
final weeklyReviewsProvider =
    Provider<List<WeeklyReviewRecord>>((ref) => ref.watch(snapshotProvider)?.weeklyReviews ?? const []);

/// Chapter number of the current (open) week.
final currentChapterProvider = Provider<int>((ref) {
  final s = ref.watch(snapshotProvider);
  if (s == null) return 1;
  final week = dayKey(startOfWeek(ref.watch(todayProvider), weekStartsOn: s.settings.weekStartsOn));
  final closed = s.weeklyReviews.where((r) => r.id != week).length;
  return closed + 1;
});

/// Fresh-start moment for today (JOY-10), null when none or dismissed.
final freshStartTodayProvider = Provider<FreshStart?>((ref) {
  final s = ref.watch(snapshotProvider);
  if (s == null) return null;
  final today = ref.watch(todayProvider);
  if (s.moduleState.freshStartDismissed == dayKey(today)) return null;
  return freshStartOn(today, weekStartsOn: s.settings.weekStartsOn, season: s.currentSeason);
});

/// Due bills / BNPL instalments / renewals / auto-save in the next weeks.
final upcomingDuesProvider = Provider<List<DueItem>>((ref) {
  final s = ref.watch(snapshotProvider);
  if (s == null) return const [];
  return upcomingDues(
    today: ref.watch(todayProvider),
    bills: s.bills,
    bnpl: s.bnplItems,
    docs: s.adminDocs,
    autoSaveDay: s.moduleState.autoSaveDay,
  );
});
