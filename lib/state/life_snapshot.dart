import '../data/models/models.dart';
import '../data/repository.dart';

/// Everything the app shows, loaded once from the repository and kept in
/// memory. Mutations go through `LifeController`, which writes to the
/// repository and publishes a new snapshot.
class LifeSnapshot {
  const LifeSnapshot({
    required this.settings,
    this.actions = const [],
    this.engineRules = const [],
    this.domains = const [],
    this.seasons = const [],
    this.habits = const [],
    this.routines = const [],
    this.weeklyTasks = const [],
    this.projects = const [],
    this.goals = const [],
    this.logs = const [],
    this.energyChecks = const [],
    this.strengthChecks = const [],
    this.joyItems = const [],
    this.sparkTxns = const [],
    this.experiments = const [],
    this.vocabCards = const [],
    this.mockTests = const [],
    this.drivingSessions = const [],
    this.moneyEnvelopes = const [],
    this.bills = const [],
    this.bnplItems = const [],
    this.wishItems = const [],
    this.adminDocs = const [],
    this.fixedEvents = const [],
    this.nudgeRecords = const [],
    this.errands = const [],
    this.cycleEntries = const [],
    this.weeklyReviews = const [],
    this.moduleState = const ModuleState(),
    this.openedDays = const {},
    this.firstRunDate,
  });

  static Future<LifeSnapshot> load(LifeRepository r) async => LifeSnapshot(
        settings: await r.loadSettings(),
        actions: await r.actions.all(),
        engineRules: await r.engineRules.all(),
        domains: (await r.domains.all()).toList()..sort((a, b) => a.sortOrder.compareTo(b.sortOrder)),
        seasons: await r.seasons.all(),
        habits: (await r.habits.all()).toList()..sort((a, b) => a.sortOrder.compareTo(b.sortOrder)),
        routines: await r.routines.all(),
        weeklyTasks: await r.weeklyTasks.all(),
        projects: await r.projects.all(),
        goals: (await r.goals.all()).toList()..sort((a, b) => a.sortOrder.compareTo(b.sortOrder)),
        logs: await r.logs.all(),
        energyChecks: await r.energyChecks.all(),
        strengthChecks: await r.strengthChecks.all(),
        joyItems: await r.joyItems.all(),
        sparkTxns: await r.sparkTxns.all(),
        experiments: await r.experiments.all(),
        vocabCards: await r.vocabCards.all(),
        mockTests: await r.mockTests.all(),
        drivingSessions: await r.drivingSessions.all(),
        moneyEnvelopes: await r.moneyEnvelopes.all(),
        bills: await r.bills.all(),
        bnplItems: await r.bnplItems.all(),
        wishItems: await r.wishItems.all(),
        adminDocs: await r.adminDocs.all(),
        fixedEvents: await r.fixedEvents.all(),
        nudgeRecords: await r.nudgeRecords.all(),
        errands: await r.errands.all(),
        cycleEntries: (await r.cycleEntries.all()).toList()..sort((a, b) => b.date.compareTo(a.date)),
        weeklyReviews: (await r.weeklyReviews.all()).toList()..sort((a, b) => a.id.compareTo(b.id)),
        moduleState: await r.loadModuleState(),
        openedDays: await r.openedDays(),
        firstRunDate: await r.firstRunDate(),
      );

  final Settings settings;
  final List<Action> actions;
  final List<EngineRule> engineRules;
  final List<Domain> domains;
  final List<Season> seasons;
  final List<Habit> habits;
  final List<Routine> routines;
  final List<WeeklyTask> weeklyTasks;
  final List<Project> projects;
  final List<Goal> goals;
  final List<LogEntry> logs;
  final List<EnergyCheck> energyChecks;
  final List<StrengthCheck> strengthChecks;
  final List<JoyItem> joyItems;
  final List<SparkTxn> sparkTxns;
  final List<Experiment> experiments;
  final List<VocabCard> vocabCards;
  final List<MockTest> mockTests;
  final List<DrivingSession> drivingSessions;
  final List<MoneyEnvelope> moneyEnvelopes;
  final List<Bill> bills;
  final List<BnplItem> bnplItems;
  final List<WishItem> wishItems;
  final List<AdminDoc> adminDocs;
  final List<FixedEvent> fixedEvents;
  final List<NudgeRecord> nudgeRecords;
  final List<Errand> errands;

  /// Newest first.
  final List<CycleEntry> cycleEntries;

  /// Oldest first (chapter n = index + 1).
  final List<WeeklyReviewRecord> weeklyReviews;
  final ModuleState moduleState;
  final Set<String> openedDays;
  final String? firstRunDate;

  Habit? habit(String id) => habits.where((h) => h.id == id).firstOrNull;
  Action? action(String id) => actions.where((a) => a.actionId == id).firstOrNull;
  Season? get currentSeason => seasons.where((s) => s.isCurrent).firstOrNull;

  LifeSnapshot copyWith({
    Settings? settings,
    List<Domain>? domains,
    List<Season>? seasons,
    List<Habit>? habits,
    List<Routine>? routines,
    List<WeeklyTask>? weeklyTasks,
    List<Project>? projects,
    List<Goal>? goals,
    List<LogEntry>? logs,
    List<EnergyCheck>? energyChecks,
    List<StrengthCheck>? strengthChecks,
    List<JoyItem>? joyItems,
    List<SparkTxn>? sparkTxns,
    List<Experiment>? experiments,
    List<VocabCard>? vocabCards,
    List<MockTest>? mockTests,
    List<DrivingSession>? drivingSessions,
    List<MoneyEnvelope>? moneyEnvelopes,
    List<Bill>? bills,
    List<BnplItem>? bnplItems,
    List<WishItem>? wishItems,
    List<AdminDoc>? adminDocs,
    List<FixedEvent>? fixedEvents,
    List<NudgeRecord>? nudgeRecords,
    List<Errand>? errands,
    List<CycleEntry>? cycleEntries,
    List<WeeklyReviewRecord>? weeklyReviews,
    ModuleState? moduleState,
    Set<String>? openedDays,
  }) =>
      LifeSnapshot(
        settings: settings ?? this.settings,
        actions: actions,
        engineRules: engineRules,
        domains: domains ?? this.domains,
        seasons: seasons ?? this.seasons,
        habits: habits ?? this.habits,
        routines: routines ?? this.routines,
        weeklyTasks: weeklyTasks ?? this.weeklyTasks,
        projects: projects ?? this.projects,
        goals: goals ?? this.goals,
        logs: logs ?? this.logs,
        energyChecks: energyChecks ?? this.energyChecks,
        strengthChecks: strengthChecks ?? this.strengthChecks,
        joyItems: joyItems ?? this.joyItems,
        sparkTxns: sparkTxns ?? this.sparkTxns,
        experiments: experiments ?? this.experiments,
        vocabCards: vocabCards ?? this.vocabCards,
        mockTests: mockTests ?? this.mockTests,
        drivingSessions: drivingSessions ?? this.drivingSessions,
        moneyEnvelopes: moneyEnvelopes ?? this.moneyEnvelopes,
        bills: bills ?? this.bills,
        bnplItems: bnplItems ?? this.bnplItems,
        wishItems: wishItems ?? this.wishItems,
        adminDocs: adminDocs ?? this.adminDocs,
        fixedEvents: fixedEvents ?? this.fixedEvents,
        nudgeRecords: nudgeRecords ?? this.nudgeRecords,
        errands: errands ?? this.errands,
        cycleEntries: cycleEntries ?? this.cycleEntries,
        weeklyReviews: weeklyReviews ?? this.weeklyReviews,
        moduleState: moduleState ?? this.moduleState,
        openedDays: openedDays ?? this.openedDays,
        firstRunDate: firstRunDate,
      );
}

/// Replaces (by id) or appends [item] in [list].
List<T> upsertById<T>(List<T> list, T item, String Function(T) id) {
  final out = List<T>.from(list);
  final i = out.indexWhere((e) => id(e) == id(item));
  if (i >= 0) {
    out[i] = item;
  } else {
    out.add(item);
  }
  return out;
}
