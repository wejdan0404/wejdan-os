/// Day Planner (spec §5.1) — pure, deterministic, explainable.
///
/// `DayPlan planDay(PlannerInput input)` builds Today:
///
/// * **Morning chain + Evening chain** — steps of active routines (not counted
///   in caps or time budget; they are anchored to wake/sleep).
/// * **Core** — up to [kMaxCore] (Green) / [kMaxCoreYellow] (Yellow) items from
///   Grow domains: standalone habits, weekly tasks due today, next steps of
///   active projects. Ranked: comeback first → habits → weekly tasks →
///   project steps → evidence priority → her sort order → id.
/// * **Maintain** — up to [kMaxMaintain] items from Maintain domains (plus
///   pinned weekly tasks of Rest domains). Ranked: comeback first → weekly
///   tasks due today → project steps → daily maintenance habits (a weekly
///   task has one day; a daily habit comes back tomorrow).
/// * **Done today stays** — an item already logged done today is pinned to
///   its tier before anything new is ranked (it counts toward the cap; new
///   items only fill the remaining capacity). Re-planning after an edit never
///   makes a completed card disappear.
/// * **System** — the weekly review on its day (not counted in caps).
/// * **Joy** — exactly 1 Free Joy (rotated by date; never gated, not budgeted).
/// * **This week** strip — weekly tasks open this week but not placed today.
///
/// Rules:
/// * Time budget: standalone items must fit `budget × 0.7` ([kBufferFactor],
///   ENG-18). Durations are learned from her logged actual minutes (median of
///   the last [kLearnSamples] at that level), falling back to estimates. An
///   item that does not fit at *normal* is trimmed to *minimum*; if even that
///   does not fit it goes to `deferred`.
/// * The **minimum version is the default done bar** (ENG-19) on every item.
/// * Energy: **Green** normal plan; **Yellow** non-core suggested at minimum and
///   max 2 core; **Red** only up to [kRedEssentials] minimum items (a sleep
///   essential, a care essential, one tiny core thing) + 1 Joy, and a subtle
///   Help & Safety link.
/// * Strength vs walk alternate through `Habit.alternationGroup` (BODY-01/05).
/// * The IELTS vocab habit (GROW-07) carries today's skill from the weekly
///   rotation (GROW-12).
/// * Rest domains and disabled modules are hidden.
library;

import '../core/date_utils.dart';
import '../data/models/models.dart';
import 'anchors.dart';
import 'history.dart';
import 'recovery.dart';
import 'vocab_srs.dart';
import 'why_today.dart';

const int kMaxCore = 3;
const int kMaxCoreYellow = 2;
const int kMaxMaintain = 2;
const int kRedEssentials = 3;
const double kBufferFactor = 0.7;
const int kLearnSamples = 5;

/// Action id of the daily vocab habit that carries the IELTS rotation.
const String kIeltsRotationActionId = 'GROW-07';

/// Everything the planner needs. Pass recent history (≥ 28 days of logs).
class PlannerInput {
  const PlannerInput({
    required this.date,
    required this.settings,
    required this.domains,
    this.energy = EnergyMode.green,
    this.habits = const [],
    this.routines = const [],
    this.weeklyTasks = const [],
    this.projects = const [],
    this.joyItems = const [],
    this.logs = const [],
    this.vocabCards = const [],
    this.fixedEvents = const [],
    this.mockTests = const [],
    this.resolver,
  });

  final DateTime date;
  final EnergyMode energy;
  final Settings settings;
  final List<Domain> domains;
  final List<Habit> habits;
  final List<Routine> routines;
  final List<WeeklyTask> weeklyTasks;
  final List<Project> projects;
  final List<JoyItem> joyItems;
  final List<LogEntry> logs;
  final List<VocabCard> vocabCards;
  final List<FixedEvent> fixedEvents;
  final List<MockTest> mockTests;

  /// Optional pre-built resolver (defaults to one from [settings]).
  final AnchorResolver? resolver;
}

/// IELTS skill of the day (GROW-12): Sat Reading, Sun Listening, Mon Writing,
/// Tue Speaking, Wed mixed R/L, Thu weakest skill, Fri light review / mock.
IeltsSkill rotationSkill(int weekday, {IeltsSkill weakest = IeltsSkill.writing}) => switch (weekday) {
      DateTime.saturday => IeltsSkill.reading,
      DateTime.sunday => IeltsSkill.listening,
      DateTime.monday => IeltsSkill.writing,
      DateTime.tuesday => IeltsSkill.speaking,
      DateTime.wednesday => IeltsSkill.mixedReadingListening,
      DateTime.thursday => weakest,
      _ => IeltsSkill.lightReview,
    };

/// Learned duration: median of the last [kLearnSamples] logged durations for
/// [itemId] at [level]; [fallback] when there is no history.
int learnedMinutes(List<LogEntry> logs, String itemId, CompletionLevel level, int fallback) {
  final samples = logs
      .where((l) => l.itemId == itemId && l.level == level && l.durationMin != null && l.durationMin! > 0)
      .toList()
    ..sort((a, b) => b.date.compareTo(a.date));
  final m = median(samples.take(kLearnSamples).map((l) => l.durationMin!).toList());
  return m == null ? fallback : m.round();
}

/// Builds today's plan. Pure and deterministic for identical inputs.
DayPlan planDay(PlannerInput input) => _Planner(input).build();

// ---------------------------------------------------------------------------

class _Candidate {
  _Candidate({
    required this.item,
    required this.normalMin,
    required this.minimumMin,
    required this.kindOrder,
    required this.priority,
    required this.sortOrder,
    this.essential = false,
    this.fromWeekly,
  });

  PlanItem item;
  final int normalMin;
  final int minimumMin;
  final int kindOrder;
  final Priority priority;
  final int sortOrder;
  final bool essential;
  final WeeklyTask? fromWeekly;

  int minutesFor(CompletionLevel l) => l == CompletionLevel.minimum ? minimumMin : normalMin;
}

class _Planner {
  _Planner(this.input)
      : day = dateOnly(input.date),
        key = dayKey(input.date),
        resolver = input.resolver ?? AnchorResolver.fromSettings(input.settings);

  final PlannerInput input;
  final DateTime day;
  final String key;
  final AnchorResolver resolver;

  late final Map<DomainId, Domain> _domains = {for (final d in input.domains) d.id: d};

  /// Item ids logged done (any level) today.
  late final Set<String> _doneToday = {
    for (final l in input.logs)
      if (l.date == key && l.isDone) l.itemId,
  };

  bool _isDoneToday(_Candidate c) => _doneToday.contains(c.item.itemId);

  DomainState stateOf(DomainId id) {
    final d = _domains[id];
    if (d == null || !d.enabled) return DomainState.rest;
    return d.state;
  }

  LocalizedText domainName(DomainId id) {
    final d = _domains[id];
    return d == null ? LocalizedText.same(id.name) : LocalizedText(ar: d.nameAr, en: d.nameEn);
  }

  bool get isRed => input.energy == EnergyMode.red;
  bool get isYellow => input.energy == EnergyMode.yellow;

  int posInWeek(int weekday) => (weekday - input.settings.weekStartsOn) % 7;

  DateTime get weekStart => startOfWeek(day, weekStartsOn: input.settings.weekStartsOn);

  /// Done logs of [itemId] in this week strictly before today.
  int doneThisWeekBeforeToday(String itemId) {
    final from = dayKey(weekStart);
    final days = <String>{};
    for (final l in input.logs) {
      if (l.itemId == itemId && l.isDone && l.date.compareTo(from) >= 0 && l.date.compareTo(key) < 0) {
        days.add(l.date);
      }
    }
    return days.length;
  }

  int shiftOutOfEvents(int minute) {
    var m = minute;
    for (final e in input.fixedEvents) {
      if (e.occursOn(day, key) && m >= e.startMinute && m < e.endMinute) m = e.endMinute;
    }
    return m.clamp(0, 1439);
  }

  LocalizedText habitTitle(Habit h) => LocalizedText(ar: h.titleAr, en: h.titleEn);

  CompletionLevel baseSuggested({required bool core, required bool shrunk}) {
    if (shrunk || isRed) return CompletionLevel.minimum;
    if (isYellow && !core) return CompletionLevel.minimum;
    return CompletionLevel.normal;
  }

  // ---- chains --------------------------------------------------------------

  List<_Candidate> chainCandidates() {
    final out = <_Candidate>[];
    final habitsById = {for (final h in input.habits) h.id: h};
    final routines = input.routines.where((r) => r.active && r.weekdays.contains(day.weekday)).toList()
      ..sort((a, b) => a.id.compareTo(b.id));
    for (final r in routines) {
      var cursor = shiftOutOfEvents(resolver.resolve(r.anchor, day));
      final routineName = LocalizedText(ar: r.titleAr, en: r.titleEn);
      for (final s in r.steps) {
        final h = s.habitId == null ? null : habitsById[s.habitId];
        if (s.habitId != null && (h == null || !h.isActive || !h.schedule.isPlannedOn(day))) continue;
        final domain = h?.domain ?? s.domain;
        if (stateOf(domain) == DomainState.rest) continue;
        final itemId = h?.id ?? s.id;
        final kind = h != null ? PlanItemKind.habit : PlanItemKind.routineStep;
        final suggested = baseSuggested(core: false, shrunk: h?.shrunkToMinimum ?? false);
        final normalMin = learnedMinutes(input.logs, itemId, CompletionLevel.normal, h?.durationMin ?? s.durationMin);
        final minMin = learnedMinutes(
            input.logs, itemId, CompletionLevel.minimum, h?.minimumDurationMin ?? s.minimumDurationMin);
        final est = suggested == CompletionLevel.minimum ? minMin : normalMin;
        final item = PlanItem(
          id: '${kind.name}:$itemId',
          itemId: itemId,
          kind: kind,
          tier: PlanTier.chain,
          section: r.section,
          title: h != null ? habitTitle(h) : LocalizedText(ar: s.titleAr, en: s.titleEn),
          domain: domain,
          why: buildWhy(WhyCode.chainStep, {'routine': routineName}),
          extraWhy: isYellow ? [buildWhy(WhyCode.yellowMinimum)] : const [],
          minimumText: h?.minimumText ?? s.minimumText,
          normalText: h?.normalText ?? s.normalText,
          bonusText: h?.bonusText ?? '',
          suggestedLevel: suggested,
          startMinute: cursor,
          estimatedMin: est,
          actionId: h?.actionId ?? s.actionId,
          routineId: r.id,
        );
        // At least 1 minute apart so chain order survives time sorting.
        cursor = (cursor + (est < 1 ? 1 : est)).clamp(0, 1439);
        out.add(_Candidate(
          item: item,
          normalMin: normalMin,
          minimumMin: minMin,
          kindOrder: 0,
          priority: h?.priority ?? Priority.core,
          sortOrder: out.length,
          essential: (h?.essential ?? false) || s.essential,
        ));
      }
    }
    return out;
  }

  // ---- standalone habits ---------------------------------------------------

  /// Habits referenced by a step of an active routine (never standalone).
  late final Set<String> _chainedHabitIds = {
    for (final r in input.routines.where((r) => r.active))
      for (final s in r.steps)
        if (s.habitId != null) s.habitId!,
  };

  List<Habit> standaloneHabitsToday() {
    final planned = input.habits
        .where((h) => h.isActive && h.routineId == null && !_chainedHabitIds.contains(h.id))
        .where((h) => h.schedule.isPlannedOn(day))
        .where((h) => stateOf(h.domain) != DomainState.rest)
        .toList();
    // Alternation groups: keep one member per group.
    final groups = <String, List<Habit>>{};
    final out = <Habit>[];
    for (final h in planned) {
      if (h.alternationGroup == null) {
        out.add(h);
      } else {
        groups.putIfAbsent(h.alternationGroup!, () => []).add(h);
      }
    }
    for (final members in groups.values) {
      members.sort((a, b) {
        final ra = _weekRatio(a), rb = _weekRatio(b);
        final c = ra.compareTo(rb);
        if (c != 0) return c;
        final s = a.sortOrder.compareTo(b.sortOrder);
        return s != 0 ? s : a.id.compareTo(b.id);
      });
      out.add(members.first);
    }
    return out;
  }

  int _plannedDaysPerWeek(Habit h) => h.schedule.weekdays.toSet().length;

  double _weekRatio(Habit h) {
    final target = _plannedDaysPerWeek(h);
    if (target == 0) return 1;
    return doneThisWeekBeforeToday(h.id) / target;
  }

  bool _hasGroupPartner(Habit h) =>
      h.alternationGroup != null &&
      input.habits.any((o) => o.id != h.id && o.isActive && o.alternationGroup == h.alternationGroup);

  _Candidate habitCandidate(Habit h, {required bool core}) {
    final comeback = isComebackCompletion(h, input.logs, day);
    var suggested = baseSuggested(core: core, shrunk: h.shrunkToMinimum);
    final reasons = <WhyToday>[];

    // IELTS rotation (GROW-12).
    IeltsSkill? skill;
    if (h.actionId == kIeltsRotationActionId) {
      final weakest = _latestWeakest() ?? input.settings.ieltsWeakestSkill;
      final due = dueCount(input.vocabCards, day);
      if (!isRed) {
        skill = rotationSkill(day.weekday, weakest: weakest);
        reasons.add(buildWhy(WhyCode.ieltsRotation, {'skill': ieltsSkillName(skill)}));
      }
      if (due > 0) reasons.add(buildWhy(WhyCode.vocabDue, {'count': numText(due)}));
    }

    // Strength / walk alternation (BODY-01 / BODY-05).
    if (h.alternationGroup != null && _hasGroupPartner(h)) {
      if (h.actionId == 'BODY-05') {
        reasons.add(buildWhy(WhyCode.strengthDay, {
          'n': numText(doneThisWeekBeforeToday(h.id) + 1),
          'total': numText(_plannedDaysPerWeek(h)),
        }));
      } else {
        reasons.add(buildWhy(WhyCode.walkDay));
      }
    }
    if (reasons.isEmpty) {
      reasons.add(buildWhy(core ? WhyCode.growFocus : WhyCode.maintainLight, {'domain': domainName(h.domain)}));
    }
    if (comeback) reasons.insert(0, buildWhy(WhyCode.comeback));
    if (isYellow && !core) reasons.add(buildWhy(WhyCode.yellowMinimum));
    if (isRed) suggested = CompletionLevel.minimum;

    final normalMin = learnedMinutes(input.logs, h.id, CompletionLevel.normal, h.durationMin);
    final minMin = learnedMinutes(input.logs, h.id, CompletionLevel.minimum, h.minimumDurationMin);
    final bundle = _bundleFor(h.id);
    return _Candidate(
      item: PlanItem(
        id: 'habit:${h.id}',
        itemId: h.id,
        kind: PlanItemKind.habit,
        tier: core ? PlanTier.core : PlanTier.maintain,
        section: PlanSection.day,
        title: habitTitle(h),
        domain: h.domain,
        why: reasons.first,
        extraWhy: reasons.skip(1).toList(),
        minimumText: h.minimumText,
        normalText: h.normalText,
        bonusText: h.bonusText,
        suggestedLevel: suggested,
        startMinute: shiftOutOfEvents(resolver.resolve(h.schedule.anchor, day)),
        estimatedMin: suggested == CompletionLevel.minimum ? minMin : normalMin,
        actionId: h.actionId,
        bundleJoyId: bundle?.id,
        bundleTitle: bundle == null ? null : LocalizedText(ar: bundle.titleAr, en: bundle.titleEn),
        ieltsSkill: skill,
        isComeback: comeback,
      ),
      normalMin: normalMin,
      minimumMin: minMin,
      kindOrder: 0,
      priority: h.priority,
      sortOrder: h.sortOrder,
      essential: h.essential,
    );
  }

  IeltsSkill? _latestWeakest() {
    if (input.mockTests.isEmpty) return null;
    final sorted = [...input.mockTests]..sort((a, b) => b.date.compareTo(a.date));
    return sorted.first.weakest;
  }

  JoyItem? _bundleFor(String habitId) {
    final list = input.joyItems.where((j) => j.active && j.kind == JoyKind.bundled && j.bundledHabitId == habitId).toList()
      ..sort((a, b) => a.id.compareTo(b.id));
    return list.isEmpty ? null : list.first;
  }

  // ---- weekly tasks --------------------------------------------------------

  /// (dueToday, strip) weekly tasks.
  (List<_Candidate>, List<PlanItem>) weeklyCandidates() {
    final dueToday = <_Candidate>[];
    final strip = <PlanItem>[];
    final tasks = input.weeklyTasks.where((t) => t.active).toList()
      ..sort((a, b) {
        final s = a.sortOrder.compareTo(b.sortOrder);
        return s != 0 ? s : a.id.compareTo(b.id);
      });
    for (final t in tasks) {
      final state = stateOf(t.domain);
      final visible = t.isWeeklyReview || state != DomainState.rest || t.pinned;
      if (!visible) continue;
      final remaining = t.timesPerWeek - doneThisWeekBeforeToday(t.id);
      if (remaining <= 0) continue;
      final todayPos = posInWeek(day.weekday);
      final preferredToday = t.preferredWeekdays.contains(day.weekday);
      final passed = t.preferredWeekdays.where((w) => posInWeek(w) < todayPos).toList()
        ..sort((a, b) => posInWeek(a).compareTo(posInWeek(b)));

      final tier = t.isWeeklyReview
          ? PlanTier.system
          : (state == DomainState.grow ? PlanTier.core : PlanTier.maintain);
      final core = tier == PlanTier.core;
      final suggested = baseSuggested(core: core || tier == PlanTier.system, shrunk: false);
      final normalMin = learnedMinutes(input.logs, t.id, CompletionLevel.normal, t.durationMin);
      final minMin = learnedMinutes(input.logs, t.id, CompletionLevel.minimum, t.minimumDurationMin);

      PlanItem make(WhyToday why) => PlanItem(
            id: 'weeklyTask:${t.id}',
            itemId: t.id,
            kind: PlanItemKind.weeklyTask,
            tier: tier,
            section: PlanSection.day,
            title: LocalizedText(ar: t.titleAr, en: t.titleEn),
            domain: t.domain,
            why: why,
            extraWhy: (isYellow && !core && tier != PlanTier.system) ? [buildWhy(WhyCode.yellowMinimum)] : const [],
            minimumText: t.minimumText,
            normalText: t.normalText,
            suggestedLevel: suggested,
            startMinute: shiftOutOfEvents(resolver.resolve(t.anchor, day)),
            estimatedMin: suggested == CompletionLevel.minimum ? minMin : normalMin,
            actionId: t.actionId,
          );

      if (preferredToday) {
        final why = buildWhy(t.isWeeklyReview ? WhyCode.weeklyReview : WhyCode.weeklyDue);
        dueToday.add(_Candidate(
          item: make(why),
          normalMin: normalMin,
          minimumMin: minMin,
          kindOrder: 1,
          priority: Priority.core,
          sortOrder: t.sortOrder,
          fromWeekly: t,
        ));
      } else if (t.preferredWeekdays.isEmpty) {
        strip.add(make(buildWhy(WhyCode.weeklyDue)));
      } else if (passed.isNotEmpty) {
        strip.add(make(buildWhy(WhyCode.weeklyCarried, {'day': weekdayName(passed.first)})));
      }
    }
    return (dueToday, strip);
  }

  // ---- projects --------------------------------------------------------------

  List<_Candidate> projectCandidates() {
    final out = <_Candidate>[];
    final active = input.projects.where((p) => p.status == ProjectStatus.active).toList()
      ..sort((a, b) {
        final s = a.sortOrder.compareTo(b.sortOrder);
        return s != 0 ? s : a.id.compareTo(b.id);
      });
    for (final p in active) {
      final state = stateOf(p.domain);
      if (state == DomainState.rest) continue;
      final step = p.nextStep;
      if (step == null) continue;
      final core = state == DomainState.grow;
      final suggested = baseSuggested(core: core, shrunk: false);
      final est = learnedMinutes(input.logs, step.id, CompletionLevel.normal, step.durationMin);
      out.add(_Candidate(
        item: PlanItem(
          id: 'projectStep:${step.id}',
          itemId: step.id,
          kind: PlanItemKind.projectStep,
          tier: core ? PlanTier.core : PlanTier.maintain,
          section: PlanSection.day,
          title: LocalizedText(ar: step.titleAr, en: step.titleEn),
          domain: p.domain,
          why: buildWhy(WhyCode.projectNext, {'project': LocalizedText(ar: p.titleAr, en: p.titleEn)}),
          suggestedLevel: suggested,
          startMinute: shiftOutOfEvents(resolver.slotMinute(Slot.midday)),
          estimatedMin: est,
          actionId: step.actionId,
          routineId: p.id,
        ),
        normalMin: est,
        minimumMin: (est / 2).ceil(),
        kindOrder: 2,
        priority: Priority.recommended,
        sortOrder: p.sortOrder,
      ));
    }
    return out;
  }

  // ---- ranking -------------------------------------------------------------

  int _compare(_Candidate a, _Candidate b) => _compareWith(a, b, maintain: false);

  int _compareMaintain(_Candidate a, _Candidate b) => _compareWith(a, b, maintain: true);

  int _compareWith(_Candidate a, _Candidate b, {required bool maintain}) {
    final da = _isDoneToday(a) ? 0 : 1, db = _isDoneToday(b) ? 0 : 1;
    if (da != db) return da.compareTo(db);
    final ca = a.item.isComeback ? 0 : 1, cb = b.item.isComeback ? 0 : 1;
    if (ca != cb) return ca.compareTo(cb);
    if (a.kindOrder != b.kindOrder) {
      // Maintain: weekly (1) → project (2) → habits (0).
      int k(int o) => maintain ? (o == 0 ? 3 : o) : o;
      return k(a.kindOrder).compareTo(k(b.kindOrder));
    }
    if (a.priority != b.priority) return a.priority.index.compareTo(b.priority.index);
    if (a.sortOrder != b.sortOrder) return a.sortOrder.compareTo(b.sortOrder);
    return a.item.id.compareTo(b.item.id);
  }

  // ---- joy -------------------------------------------------------------------

  PlanItem? freeJoy() {
    final free = input.joyItems.where((j) => j.active && j.kind == JoyKind.free).toList()
      ..sort((a, b) => a.id.compareTo(b.id));
    if (free.isEmpty) return null;
    final idx = daysBetween(DateTime(2000), day) % free.length;
    final j = free[idx];
    return PlanItem(
      id: 'joy:${j.id}',
      itemId: j.id,
      kind: PlanItemKind.joy,
      tier: PlanTier.joy,
      section: PlanSection.day,
      title: LocalizedText(ar: j.titleAr, en: j.titleEn),
      domain: DomainId.joy,
      why: buildWhy(WhyCode.freeJoy),
      suggestedLevel: CompletionLevel.minimum,
    );
  }

  // ---- build -----------------------------------------------------------------

  DayPlan build() {
    final budget = input.settings.budgetFor(day);
    final usable = (budget * kBufferFactor).floor();
    final chains = chainCandidates();
    final standalone = standaloneHabitsToday();
    final coreHabits = standalone
        .where((h) => stateOf(h.domain) == DomainState.grow)
        .map((h) => habitCandidate(h, core: true))
        .toList();
    final maintainHabits = standalone
        .where((h) => stateOf(h.domain) == DomainState.maintain)
        .map((h) => habitCandidate(h, core: false))
        .toList();
    final (weeklyToday, strip) = weeklyCandidates();
    final projects = projectCandidates();

    final coreCands = [
      ...coreHabits,
      ...weeklyToday.where((c) => c.item.tier == PlanTier.core),
      ...projects.where((c) => c.item.tier == PlanTier.core),
    ]..sort(_compare);
    final maintainCands = [
      ...maintainHabits,
      ...weeklyToday.where((c) => c.item.tier == PlanTier.maintain),
      ...projects.where((c) => c.item.tier == PlanTier.maintain),
    ]..sort(_compareMaintain);
    final systemCands = weeklyToday.where((c) => c.item.tier == PlanTier.system).toList()..sort(_compare);
    final joy = freeJoy();

    if (isRed) return _buildRed(budget, usable, chains, coreCands, maintainCands, joy);

    final items = <PlanItem>[...chains.map((c) => c.item)];
    final deferred = <PlanItem>[];
    final stripOut = <PlanItem>[...strip];
    var planned = 0;

    bool place(_Candidate c) {
      final lvl = c.item.suggestedLevel;
      final est = c.minutesFor(lvl);
      // Done today: always kept (it already happened), never trimmed.
      if (_isDoneToday(c) || planned + est <= usable) {
        planned += est;
        items.add(c.item.copyWith(estimatedMin: est));
        return true;
      }
      if (lvl != CompletionLevel.minimum && planned + c.minimumMin <= usable) {
        planned += c.minimumMin;
        items.add(c.item.copyWith(
          suggestedLevel: CompletionLevel.minimum,
          estimatedMin: c.minimumMin,
          extraWhy: [...c.item.extraWhy, buildWhy(WhyCode.timeTrimmed)],
        ));
        return true;
      }
      return false;
    }

    void overflow(_Candidate c) {
      if (c.fromWeekly != null) {
        stripOut.add(c.item);
      } else {
        deferred.add(c.item);
      }
    }

    for (final c in systemCands) {
      if (!place(c)) overflow(c);
    }
    final coreCap = isYellow ? kMaxCoreYellow : kMaxCore;
    var coreCount = 0;
    for (final c in coreCands) {
      if ((_isDoneToday(c) || coreCount < coreCap) && place(c)) {
        coreCount++;
      } else {
        overflow(c);
      }
    }
    // Maintain is light (spec §5.1, "الصيانة · خفيفة"): first reserve each
    // item's minimum so up to 2 fit, then upgrade to the suggested level in
    // rank order while the budget allows.
    final reserved = <_Candidate>[];
    for (final c in maintainCands) {
      final fits = _isDoneToday(c) || planned + c.minimumMin <= usable;
      if ((_isDoneToday(c) || reserved.length < kMaxMaintain) && fits) {
        planned += c.minimumMin;
        reserved.add(c);
      } else {
        overflow(c);
      }
    }
    for (final c in reserved) {
      final lvl = c.item.suggestedLevel;
      final extra = c.minutesFor(lvl) - c.minimumMin;
      if (lvl == CompletionLevel.minimum || _isDoneToday(c) || planned + extra <= usable) {
        if (lvl != CompletionLevel.minimum) planned += extra;
        items.add(c.item.copyWith(estimatedMin: c.minutesFor(lvl)));
      } else {
        items.add(c.item.copyWith(
          suggestedLevel: CompletionLevel.minimum,
          estimatedMin: c.minimumMin,
          extraWhy: [...c.item.extraWhy, buildWhy(WhyCode.timeTrimmed)],
        ));
      }
    }
    if (joy != null) items.add(joy);

    return DayPlan(
      date: key,
      energy: input.energy,
      items: _sorted(items),
      thisWeek: stripOut,
      deferred: deferred,
      budgetMin: budget,
      usableMin: usable,
      plannedMin: planned,
    );
  }

  DayPlan _buildRed(
    int budget,
    int usable,
    List<_Candidate> chains,
    List<_Candidate> core,
    List<_Candidate> maintain,
    PlanItem? joy,
  ) {
    final pool = [...chains, ...maintain, ...core].where((c) => c.essential).toList();
    final chosen = <_Candidate>[];
    void pick(_Candidate? c) {
      if (c != null && chosen.length < kRedEssentials && !chosen.contains(c)) chosen.add(c);
    }

    _Candidate? firstWhere(Iterable<_Candidate> it, bool Function(_Candidate) f) {
      for (final c in it) {
        if (f(c)) return c;
      }
      return null;
    }

    // Items already done today stay visible (they don't use an essential slot).
    final doneToday = [...core, ...maintain].where(_isDoneToday).toList();
    pick(firstWhere(pool, (c) => c.item.domain == DomainId.sleep));
    pick(firstWhere(pool, (c) => c.item.domain == DomainId.care));
    pick(core.isEmpty ? null : core.first); // one tiny thing
    for (final c in pool) {
      pick(c);
    }
    var planned = 0;
    final items = <PlanItem>[];
    for (final c in [...chosen, ...doneToday.where((d) => !chosen.contains(d))]) {
      final est = c.minimumMin;
      if (c.item.tier != PlanTier.chain) planned += est;
      items.add(c.item.copyWith(
        suggestedLevel: CompletionLevel.minimum,
        estimatedMin: est,
        why: c.item.isComeback ? c.item.why : buildWhy(WhyCode.redEssential),
        extraWhy: c.item.isComeback ? [buildWhy(WhyCode.redEssential)] : const [],
      ));
    }
    if (joy != null) items.add(joy);
    return DayPlan(
      date: key,
      energy: EnergyMode.red,
      items: _sorted(items),
      budgetMin: budget,
      usableMin: usable,
      plannedMin: planned,
      showHelpLink: true,
    );
  }

  List<PlanItem> _sorted(List<PlanItem> items) {
    int sec(PlanSection s) => switch (s) {
          PlanSection.morningChain => 0,
          PlanSection.day => 1,
          PlanSection.eveningChain => 2,
        };
    final out = [...items]
      ..sort((a, b) {
        final s = sec(a.section).compareTo(sec(b.section));
        if (s != 0) return s;
        // Joy (unscheduled) goes last within the day section.
        final ta = a.startMinute ?? 1440, tb = b.startMinute ?? 1440;
        if (ta != tb) return ta.compareTo(tb);
        return a.id.compareTo(b.id);
      });
    return out;
  }
}
