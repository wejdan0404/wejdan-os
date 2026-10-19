import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/date_utils.dart';
import '../data/models/models.dart';
import '../data/repository.dart';
import '../data/seed/starter_profile.dart';
import '../engine/engine.dart';
import 'providers.dart';

/// Undo window for a completion (spec §5.2).
const Duration kUndoWindow = Duration(seconds: 10);

/// Result of logging a plan item.
class CompletionResult {
  const CompletionResult({required this.log, required this.award, required this.undoUntil});

  final LogEntry log;
  final SparkAward award;

  /// [LifeController.undo] works until this instant.
  final DateTime undoUntil;

  /// Comeback completions get the "رجعتي — هذا أهم جزء" celebration.
  bool get isComeback => award.comeback;
}

/// Owns the in-memory [LifeSnapshot] and every mutation. Each method writes
/// through to the repository, then publishes a new snapshot so all derived
/// providers recompute.
class LifeController extends AsyncNotifier<LifeSnapshot> {
  int _seq = 0;

  /// Log id → habit whose `comebackPending` that completion cleared.
  final Map<String, String> _clearedComeback = {};

  LifeRepository get _repo => ref.read(repositoryProvider);
  DateTime _now() => ref.read(clockProvider)();

  /// Logical today (flips at 04:30).
  DateTime _today() => logicalDay(_now());
  LifeSnapshot get _s => state.requireValue;

  /// Unique id: prefix + time + sequence.
  String newId(String prefix) => '${prefix}_${_now().microsecondsSinceEpoch}_${_seq++}';

  void _emit(LifeSnapshot s) => state = AsyncData(s);

  @override
  Future<LifeSnapshot> build() async {
    final repo = ref.read(repositoryProvider);
    await repo.markOpened(logicalDay(_now()));
    // A focus session lives only while the Focus screen is open. If the app
    // was killed mid-session its suppression block was never removed —
    // drop it on launch so it can't keep silencing nudges (D20).
    for (final e in await repo.fixedEvents.all()) {
      if (e.isFocusBlock) await repo.fixedEvents.delete(e.id);
    }
    return LifeSnapshot.load(repo);
  }

  /// Reloads everything from disk (after import, delete-all, etc.).
  Future<void> reload() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() => LifeSnapshot.load(_repo));
  }

  // ---- logging ---------------------------------------------------------------

  /// Logs [item] as done at [level] (any level counts, ENG-19) and awards
  /// Sparks (comeback ×2, weekly review 5, daily cap 20). Clears the habit's
  /// `comebackPending`.
  Future<CompletionResult> completeItem(
    PlanItem item,
    CompletionLevel level, {
    int? durationMin,
    int? enjoyment,
    String? note,
  }) async {
    final now = _now();
    final today = _today();
    final s = _s;
    final habit = item.kind == PlanItemKind.habit ? s.habit(item.itemId) : null;
    final comeback = level.isDone && habit != null && isComebackCompletion(habit, s.logs, today);
    final log = LogEntry(
      id: newId('log'),
      itemId: item.itemId,
      kind: item.kind,
      date: dayKey(today),
      level: level,
      durationMin: durationMin,
      enjoyment: enjoyment,
      note: note,
      loggedAt: now,
      minuteOfDay: minuteOfDay(now),
    );
    final earned = earnedOn(s.sparkTxns, log.date);
    final isReview = item.kind == PlanItemKind.weeklyTask &&
        s.weeklyTasks.any((t) => t.id == item.itemId && t.isWeeklyReview);
    // Joy is never a "should" → no Sparks (ENG-09 overjustification).
    final award = (!level.isDone || item.kind == PlanItemKind.joy)
        ? SparkAward.none
        : isReview
            ? awardForWeeklyReview(earnedToday: earned)
            : awardForCompletion(level: level, isComeback: comeback, earnedToday: earned);
    final txn = txnForAward(award,
        id: newId('spk'),
        at: now,
        reason: isReview ? SparkReason.weeklyReview : SparkReason.completion,
        refId: log.id,
        date: log.date);

    await _repo.logs.put(log);
    if (txn != null) await _repo.sparkTxns.put(txn);
    var habits = s.habits;
    if (habit != null && habit.comebackPending && level.isDone) {
      _clearedComeback[log.id] = habit.id;
      final cleared = habit.copyWith(comebackPending: false);
      await _repo.habits.put(cleared);
      habits = upsertById(habits, cleared, (h) => h.id);
    }
    final projects = item.kind == PlanItemKind.projectStep && level.isDone
        ? await _setProjectStepDone(s.projects, item.itemId, log.date)
        : s.projects;
    _emit(s.copyWith(
      logs: [...s.logs, log],
      sparkTxns: txn == null ? s.sparkTxns : [...s.sparkTxns, txn],
      habits: habits,
      projects: projects,
    ));
    return CompletionResult(log: log, award: award, undoUntil: now.add(kUndoWindow));
  }

  /// Marks a project step done (or not) and persists the project.
  Future<List<Project>> _setProjectStepDone(List<Project> projects, String stepId, String? date) async {
    final p = projects.where((p) => p.steps.any((st) => st.id == stepId)).firstOrNull;
    if (p == null) return projects;
    final updated = p.copyWith(
      steps: [
        for (final st in p.steps)
          st.id == stepId ? ProjectStep(
            id: st.id, titleAr: st.titleAr, titleEn: st.titleEn, actionId: st.actionId,
            done: date != null, doneDate: date, durationMin: st.durationMin) : st,
      ],
    );
    await _repo.projects.put(updated);
    return upsertById(projects, updated, (e) => e.id);
  }

  /// Explicit "skip today" (no Sparks, never shown as failure).
  Future<LogEntry> skipItem(PlanItem item, {String? note}) async =>
      (await completeItem(item, CompletionLevel.skipped, note: note)).log;

  /// Undoes a completion within [kUndoWindow]; reverses its Sparks.
  /// Returns false if the window passed or the log is unknown.
  Future<bool> undo(String logId, {bool ignoreWindow = false}) async {
    final s = _s;
    final log = s.logs.where((l) => l.id == logId).firstOrNull;
    if (log == null) return false;
    final now = _now();
    if (!ignoreWindow && log.loggedAt != null && now.difference(log.loggedAt!) > kUndoWindow) return false;
    final reversals = reversalsFor(s.sparkTxns, logId, idFor: (_) => newId('spk'), at: now);
    await _repo.logs.delete(logId);
    await _repo.sparkTxns.putAll(reversals);
    // Undoing the completion that consumed a Recovery comeback gives the
    // comeback back (a level change = undo + re-log keeps ×2, D14).
    var habits = s.habits;
    final habitId = _clearedComeback.remove(logId) ??
        (s.sparkTxns.any((t) => t.refId == logId && t.reason == SparkReason.comeback) ? log.itemId : null);
    final h = habitId == null ? null : s.habit(habitId);
    if (h != null && !h.comebackPending && log.kind == PlanItemKind.habit) {
      final restored = h.copyWith(comebackPending: true);
      await _repo.habits.put(restored);
      habits = upsertById(habits, restored, (e) => e.id);
    }
    final projects = log.kind == PlanItemKind.projectStep && log.isDone
        ? await _setProjectStepDone(s.projects, log.itemId, null)
        : s.projects;
    _emit(s.copyWith(
      logs: s.logs.where((l) => l.id != logId).toList(),
      sparkTxns: [...s.sparkTxns, ...reversals],
      habits: habits,
      projects: projects,
    ));
    return true;
  }

  // ---- energy & checks -----------------------------------------------------------

  /// Morning Brief energy tap (one per day; latest wins).
  Future<void> setEnergy(EnergyMode mode) async {
    final now = _now();
    final check = EnergyCheck(date: dayKey(_today()), mode: mode, at: now);
    await _repo.energyChecks.put(check);
    _emit(_s.copyWith(energyChecks: upsertById(_s.energyChecks, check, (c) => c.date)));
  }

  /// Weekly SRBAI check (4 items, 1–5).
  Future<StrengthCheck> recordStrengthCheck(String habitId, List<int> items) async {
    final c = StrengthCheck(id: newId('srbai'), habitId: habitId, date: dayKey(_today()), items: items);
    await _repo.strengthChecks.put(c);
    _emit(_s.copyWith(strengthChecks: [..._s.strengthChecks, c]));
    return c;
  }

  // ---- sparks & joy ----------------------------------------------------------------------

  /// Spends Sparks on one of her Earned Rewards.
  Future<RedeemResult> redeem(String joyItemId) async {
    final reward = _s.joyItems.firstWhere((j) => j.id == joyItemId);
    final r = redeemReward(ledger: _s.sparkTxns, reward: reward, txnId: newId('spk'), at: _now());
    if (r.ok && r.txn != null) {
      await _repo.sparkTxns.put(r.txn!);
      _emit(_s.copyWith(sparkTxns: [..._s.sparkTxns, r.txn!]));
    }
    return r;
  }

  Future<void> upsertJoyItem(JoyItem j) async {
    await _repo.joyItems.put(j);
    _emit(_s.copyWith(joyItems: upsertById(_s.joyItems, j, (e) => e.id)));
  }

  // ---- design entities (capacity-guarded) -----------------------------------------------

  /// Saves [h]. If it would newly break a cap (e.g. 8th Core habit) the
  /// violations are returned and nothing is saved unless [force].
  Future<List<CapacityViolation>> upsertHabit(Habit habit, {bool force = false}) async {
    // New habits start counting from today (no retroactive misses).
    final h = habit.createdDate == null ? habit.copyWith(createdDate: dayKey(_today())) : habit;
    final v = violationsAfter(domains: _s.domains, projects: _s.projects, habits: _s.habits, changedHabit: h);
    if (v.isNotEmpty && !force) return v;
    await _repo.habits.put(h);
    _emit(_s.copyWith(habits: upsertById(_s.habits, h, (e) => e.id)));
    return v;
  }

  Future<void> deleteHabit(String id) async {
    await _repo.habits.delete(id);
    _emit(_s.copyWith(habits: _s.habits.where((h) => h.id != id).toList()));
  }

  /// Grow/Maintain/Rest switch (capacity-guarded, max 3 Grow / 5 Maintain).
  Future<List<CapacityViolation>> setDomainState(DomainId id, DomainState st, {bool force = false}) async {
    final d = _s.domains.firstWhere((e) => e.id == id).copyWith(state: st);
    final v = violationsAfter(domains: _s.domains, projects: _s.projects, habits: _s.habits, changedDomain: d);
    if (v.isNotEmpty && !force) return v;
    await _repo.domains.put(d);
    var seasons = _s.seasons;
    final cur = _s.currentSeason;
    if (cur != null) {
      final updated = cur.copyWith(states: {...cur.states, id: st});
      await _repo.seasons.put(updated);
      seasons = upsertById(seasons, updated, (e) => e.id);
    }
    _emit(_s.copyWith(domains: upsertById(_s.domains, d, (e) => e.id.name), seasons: seasons));
    return v;
  }

  /// Enables/disables a module domain (Women's health, Aquarium).
  Future<void> setDomainEnabled(DomainId id, bool enabled) async {
    final d = _s.domains.firstWhere((e) => e.id == id).copyWith(enabled: enabled);
    await _repo.domains.put(d);
    _emit(_s.copyWith(domains: upsertById(_s.domains, d, (e) => e.id.name)));
  }

  /// Ends the current season and starts a new one with the current states.
  Future<Season> startNewSeason({required String titleAr, required String titleEn}) async {
    final today = dayKey(_today());
    var seasons = _s.seasons;
    final cur = _s.currentSeason;
    if (cur != null) {
      final ended = cur.copyWith(endedDate: today);
      await _repo.seasons.put(ended);
      seasons = upsertById(seasons, ended, (e) => e.id);
    }
    final next = Season(
      id: newId('season'),
      titleAr: titleAr,
      titleEn: titleEn,
      startDate: today,
      states: {for (final d in _s.domains) d.id: d.state},
    );
    await _repo.seasons.put(next);
    _emit(_s.copyWith(seasons: [...seasons, next]));
    return next;
  }

  /// Saves a project (capacity-guarded: max 2 Active, 1 active course).
  Future<List<CapacityViolation>> upsertProject(Project p, {bool force = false}) async {
    final v = violationsAfter(domains: _s.domains, projects: _s.projects, habits: _s.habits, changedProject: p);
    if (v.isNotEmpty && !force) return v;
    await _repo.projects.put(p);
    _emit(_s.copyWith(projects: upsertById(_s.projects, p, (e) => e.id)));
    return v;
  }

  Future<void> upsertRoutine(Routine r) async {
    await _repo.routines.put(r);
    _emit(_s.copyWith(routines: upsertById(_s.routines, r, (e) => e.id)));
  }

  Future<void> upsertWeeklyTask(WeeklyTask t) async {
    await _repo.weeklyTasks.put(t);
    _emit(_s.copyWith(weeklyTasks: upsertById(_s.weeklyTasks, t, (e) => e.id)));
  }

  Future<void> upsertGoal(Goal g) async {
    await _repo.goals.put(g);
    _emit(_s.copyWith(goals: upsertById(_s.goals, g, (e) => e.id)));
  }

  Future<void> upsertFixedEvent(FixedEvent e) async {
    await _repo.fixedEvents.put(e);
    _emit(_s.copyWith(fixedEvents: upsertById(_s.fixedEvents, e, (x) => x.id)));
  }

  Future<void> deleteFixedEvent(String id) async {
    await _repo.fixedEvents.delete(id);
    _emit(_s.copyWith(fixedEvents: _s.fixedEvents.where((e) => e.id != id).toList()));
  }

  Future<void> updateSettings(Settings settings) async {
    await _repo.saveSettings(settings);
    _emit(_s.copyWith(settings: settings));
  }

  // ---- recovery -----------------------------------------------------------------------------

  /// Step 2 of the recovery flow: her reason → one proposed design change.
  DesignChange proposeRecovery(String habitId, MissReason reason) {
    final h = _s.habit(habitId)!;
    final resolver = AnchorResolver.fromSettings(_s.settings);
    return proposeChange(
      habit: h,
      reason: reason,
      logs: _s.logs,
      currentMinute: resolver.resolve(h.schedule.anchor, _today()),
    );
  }

  /// Step 3: she accepted (or edited) the change. Applies it and flags the
  /// habit for the Comeback bonus. `pauseToRest` pauses the habit.
  Future<Habit> acceptDesignChange(DesignChange change) async {
    final h = applyDesignChange(_s.habit(change.habitId)!, change);
    await _repo.habits.put(h);
    _emit(_s.copyWith(habits: upsertById(_s.habits, h, (e) => e.id)));
    return h;
  }

  // ---- experiments ----------------------------------------------------------------------

  /// Starts [e] today. Returns false if another experiment is active.
  Future<bool> startExperiment(Experiment e) async {
    if (!canStartExperiment(_s.experiments.where((x) => x.id != e.id).toList())) return false;
    final started = e.copyWith(status: ExperimentStatus.active, startDate: dayKey(_today()));
    await _repo.experiments.put(started);
    _emit(_s.copyWith(experiments: upsertById(_s.experiments, started, (x) => x.id)));
    return true;
  }

  /// Ends the experiment with her decision; awards the experiment Sparks.
  Future<SparkAward> finishExperiment(String id, {required bool keep}) async {
    final now = _now();
    final e = _s.experiments.firstWhere((x) => x.id == id)
        .copyWith(status: keep ? ExperimentStatus.kept : ExperimentStatus.reverted, endDate: dayKey(_today()));
    final award = awardForExperiment(earnedToday: earnedOn(_s.sparkTxns, dayKey(_today())));
    final txn = txnForAward(award,
        id: newId('spk'), at: now, reason: SparkReason.experiment, refId: id, date: dayKey(_today()));
    await _repo.experiments.put(e);
    if (txn != null) await _repo.sparkTxns.put(txn);
    _emit(_s.copyWith(
      experiments: upsertById(_s.experiments, e, (x) => x.id),
      sparkTxns: txn == null ? _s.sparkTxns : [..._s.sparkTxns, txn],
    ));
    return award;
  }

  // ---- IELTS / driving ------------------------------------------------------------------

  Future<VocabCard> addVocabCard({required String front, required String back, String example = ''}) async {
    final c = newVocabCard(id: newId('vc'), front: front, back: back, example: example, today: _now());
    await _repo.vocabCards.put(c);
    _emit(_s.copyWith(vocabCards: [..._s.vocabCards, c]));
    return c;
  }

  /// SM-2 review with grade 0–5 (see [VocabGrade]).
  Future<VocabCard> reviewVocab(String cardId, int grade) async {
    final c = reviewCard(_s.vocabCards.firstWhere((x) => x.id == cardId), grade, _today());
    await _repo.vocabCards.put(c);
    _emit(_s.copyWith(vocabCards: upsertById(_s.vocabCards, c, (x) => x.id)));
    return c;
  }

  Future<void> addMockTest(MockTest m) async {
    await _repo.mockTests.put(m);
    _emit(_s.copyWith(mockTests: upsertById(_s.mockTests, m, (x) => x.id)));
  }

  Future<void> addDrivingSession(DrivingSession d) async {
    await _repo.drivingSessions.put(d);
    _emit(_s.copyWith(drivingSessions: upsertById(_s.drivingSessions, d, (x) => x.id)));
  }

  // ---- money & admin ----------------------------------------------------------------------

  Future<void> upsertEnvelope(MoneyEnvelope e) async {
    await _repo.moneyEnvelopes.put(e);
    _emit(_s.copyWith(moneyEnvelopes: upsertById(_s.moneyEnvelopes, e, (x) => x.id)));
  }

  Future<void> upsertBill(Bill b) async {
    await _repo.bills.put(b);
    _emit(_s.copyWith(bills: upsertById(_s.bills, b, (x) => x.id)));
  }

  Future<void> upsertBnpl(BnplItem b) async {
    await _repo.bnplItems.put(b);
    _emit(_s.copyWith(bnplItems: upsertById(_s.bnplItems, b, (x) => x.id)));
  }

  Future<void> upsertWish(WishItem w) async {
    await _repo.wishItems.put(w);
    _emit(_s.copyWith(wishItems: upsertById(_s.wishItems, w, (x) => x.id)));
  }

  Future<void> upsertAdminDoc(AdminDoc d) async {
    await _repo.adminDocs.put(d);
    _emit(_s.copyWith(adminDocs: upsertById(_s.adminDocs, d, (x) => x.id)));
  }

  Future<void> deleteBill(String id) async {
    await _repo.bills.delete(id);
    _emit(_s.copyWith(bills: _s.bills.where((x) => x.id != id).toList()));
  }

  Future<void> deleteBnpl(String id) async {
    await _repo.bnplItems.delete(id);
    _emit(_s.copyWith(bnplItems: _s.bnplItems.where((x) => x.id != id).toList()));
  }

  Future<void> deleteWish(String id) async {
    await _repo.wishItems.delete(id);
    _emit(_s.copyWith(wishItems: _s.wishItems.where((x) => x.id != id).toList()));
  }

  Future<void> deleteAdminDoc(String id) async {
    await _repo.adminDocs.delete(id);
    _emit(_s.copyWith(adminDocs: _s.adminDocs.where((x) => x.id != id).toList()));
  }

  Future<void> deleteProject(String id) async {
    await _repo.projects.delete(id);
    _emit(_s.copyWith(projects: _s.projects.where((x) => x.id != id).toList()));
  }

  Future<void> deleteJoyItem(String id) async {
    await _repo.joyItems.delete(id);
    _emit(_s.copyWith(joyItems: _s.joyItems.where((x) => x.id != id).toList()));
  }

  // ---- UI-2 modules -----------------------------------------------------------------------

  Future<void> updateModuleState(ModuleState m) async {
    await _repo.saveModuleState(m);
    _emit(_s.copyWith(moduleState: m));
  }

  Future<void> upsertErrand(Errand e) async {
    await _repo.errands.put(e);
    _emit(_s.copyWith(errands: upsertById(_s.errands, e, (x) => x.id)));
  }

  Future<void> deleteErrand(String id) async {
    await _repo.errands.delete(id);
    _emit(_s.copyWith(errands: _s.errands.where((x) => x.id != id).toList()));
  }

  /// Sensitive module: stored locally only, never exported to anyone but her.
  Future<CycleEntry> addCycleEntry({required String kind, String? date, String note = ''}) async {
    final e = CycleEntry(id: newId('cyc'), date: date ?? dayKey(_today()), kind: kind, note: note);
    await _repo.cycleEntries.put(e);
    final list = [..._s.cycleEntries, e]..sort((a, b) => b.date.compareTo(a.date));
    _emit(_s.copyWith(cycleEntries: list));
    return e;
  }

  Future<void> deleteCycleEntry(String id) async {
    await _repo.cycleEntries.delete(id);
    _emit(_s.copyWith(cycleEntries: _s.cycleEntries.where((x) => x.id != id).toList()));
  }

  /// Closes this week's chapter. Saves the record (one per week, id = week
  /// start) and — once per week — logs the weekly-review ritual and awards
  /// its Sparks (spec §6.4). Returns the award (none if already logged).
  Future<SparkAward> saveWeeklyReview(WeeklyReviewRecord draft) async {
    final today = _today();
    final now = _now();
    final week = dayKey(startOfWeek(today, weekStartsOn: _s.settings.weekStartsOn));
    final record = WeeklyReviewRecord(
      id: week,
      date: dayKey(today),
      chapterTitle: draft.chapterTitle,
      wins: draft.wins,
      blockers: draft.blockers,
      top3: draft.top3,
      experimentId: draft.experimentId,
      durationSec: draft.durationSec,
    );
    await _repo.weeklyReviews.put(record);
    final reviews = upsertById(_s.weeklyReviews, record, (x) => x.id)..sort((a, b) => a.id.compareTo(b.id));
    final task = _s.weeklyTasks.where((t) => t.isWeeklyReview).firstOrNull;
    final end = dayKey(addDays(parseDayKey(week), 6));
    final logged = task != null &&
        _s.logs.any((l) => l.itemId == task.id && l.isDone && l.date.compareTo(week) >= 0 && l.date.compareTo(end) <= 0);
    if (task == null || logged) {
      _emit(_s.copyWith(weeklyReviews: reviews));
      return SparkAward.none;
    }
    final log = LogEntry(
      id: newId('log'),
      itemId: task.id,
      kind: PlanItemKind.weeklyTask,
      date: dayKey(today),
      level: CompletionLevel.normal,
      durationMin: draft.durationSec == null ? null : (draft.durationSec! / 60).ceil(),
      loggedAt: now,
      minuteOfDay: minuteOfDay(now),
    );
    final award = awardForWeeklyReview(earnedToday: earnedOn(_s.sparkTxns, log.date));
    final txn = txnForAward(award,
        id: newId('spk'), at: now, reason: SparkReason.weeklyReview, refId: log.id, date: log.date);
    await _repo.logs.put(log);
    if (txn != null) await _repo.sparkTxns.put(txn);
    _emit(_s.copyWith(
      weeklyReviews: reviews,
      logs: [..._s.logs, log],
      sparkTxns: txn == null ? _s.sparkTxns : [..._s.sparkTxns, txn],
    ));
    return award;
  }

  // ---- notifications ------------------------------------------------------------------

  /// Records her response to a nudge (feeds adaptive muting).
  Future<void> recordNudgeResponse(String itemId, NudgeResponse response) async {
    final r = NudgeRecord(id: newId('nr'), itemId: itemId, date: dayKey(_today()), response: response);
    await _repo.nudgeRecords.put(r);
    _emit(_s.copyWith(nudgeRecords: [..._s.nudgeRecords, r]));
  }

  /// Builds today's reminder plan and hands it to the platform service.
  Future<ReminderPlan> scheduleTodayNudges() async {
    final plan = reminderPlanFor(_s, _today());
    await ref.read(notificationServiceProvider).scheduleDay(
          plan.nudges,
          language: _s.settings.language,
          timeZoneName: _s.settings.timeZoneName,
        );
    return plan;
  }

  // ---- data ownership ---------------------------------------------------------------------

  Future<Json> exportAll() => _repo.exportAll(now: _now());

  Future<void> importAll(Json data) async {
    await _repo.importAll(data);
    await reload();
  }

  /// "Delete all data": wipes storage and re-seeds a fresh starter profile.
  Future<void> deleteAllAndReseed() async {
    await _repo.deleteAll();
    final json = await ref.read(seedJsonLoaderProvider)();
    final arLoader = ref.read(seedArJsonLoaderProvider);
    final ar = arLoader == null ? null : await arLoader();
    await _repo.seed(SeedBundle.build(json, _today(), arJson: ar, lang: _s.settings.language), force: true);
    await _repo.markOpened(_today());
    await reload();
  }
}
