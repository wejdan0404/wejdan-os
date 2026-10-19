/// N-of-1 experiments (spec §5.7, ENG-21). One active at a time.
///
/// Compares the target habit's completion rate and mean enjoyment (1–5) in
/// the *before* window `[start − lengthDays, start)` vs the *after* window
/// `[start, min(end, today)]`. She decides keep/revert — the engine only
/// reports, it never auto-decides.
library;

import '../core/date_utils.dart';
import '../data/models/models.dart';
import 'history.dart';

/// True if another experiment is active (spec: max 1 active).
bool canStartExperiment(List<Experiment> all) => all.every((e) => e.status != ExperimentStatus.active);

/// Stats for one window.
class WindowStats {
  const WindowStats({required this.planned, required this.done, required this.meanEnjoyment});

  final int planned;
  final int done;

  /// null if she never rated enjoyment in the window.
  final double? meanEnjoyment;

  /// 0–1; null when nothing was planned.
  double? get completionRate => planned == 0 ? null : done / planned;
}

class ExperimentResult {
  const ExperimentResult({required this.before, required this.after});

  final WindowStats before;
  final WindowStats after;

  double? get completionDelta =>
      (before.completionRate == null || after.completionRate == null) ? null : after.completionRate! - before.completionRate!;

  double? get enjoymentDelta =>
      (before.meanEnjoyment == null || after.meanEnjoyment == null) ? null : after.meanEnjoyment! - before.meanEnjoyment!;
}

WindowStats _stats(Habit habit, List<LogEntry> logs, DateTime from, DateTime to) {
  if (to.isBefore(from)) return const WindowStats(planned: 0, done: 0, meanEnjoyment: null);
  final byDay = indexLogsByDay(logs, habit.id);
  final occ = occurrences(isPlanned: habit.schedule.isPlannedOn, logsByDay: byDay, from: from, to: to);
  final planned = occ.where((o) => o.planned).length;
  final done = occ.where((o) => o.planned && o.done).length;
  final fromK = dayKey(from), toK = dayKey(to);
  final ratings = logs
      .where((l) => l.itemId == habit.id && l.enjoyment != null && l.date.compareTo(fromK) >= 0 && l.date.compareTo(toK) <= 0)
      .map((l) => l.enjoyment!)
      .toList();
  final mean = ratings.isEmpty ? null : ratings.reduce((a, b) => a + b) / ratings.length;
  return WindowStats(planned: planned, done: done, meanEnjoyment: mean);
}

/// Before/after comparison. Returns null if the experiment has no start date.
ExperimentResult? compareExperiment({
  required Experiment experiment,
  required Habit habit,
  required List<LogEntry> logs,
  required DateTime today,
}) {
  if (experiment.startDate == null) return null;
  final start = parseDayKey(experiment.startDate!);
  final endPlanned = experiment.endDate != null
      ? parseDayKey(experiment.endDate!)
      : addDays(start, experiment.lengthDays - 1);
  final t = dateOnly(today);
  final afterEnd = endPlanned.isAfter(t) ? t : endPlanned;
  return ExperimentResult(
    before: _stats(habit, logs, addDays(start, -experiment.lengthDays), addDays(start, -1)),
    after: _stats(habit, logs, start, afterEnd),
  );
}

/// Kinds of one-variable experiments the weekly review offers.
enum ExperimentTemplate { timeSwap, bundle, minimumOnly }

/// Up to [max] one-variable experiment drafts (status `planned`) built from
/// her Core habits and bundles (ENG-21): swap the habit's time of day, try a
/// bundled joy with the habit, or do only the minimum version for a week.
/// Deterministic; ids are stable per habit/template so a pick can be saved.
List<Experiment> suggestExperiments({
  required List<Habit> coreHabits,
  List<JoyItem> joyItems = const [],
  int max = 3,
  int lengthDays = 7,
}) {
  final out = <Experiment>[];
  final habits = [...coreHabits]..sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
  // 1) a bundled joy with its habit.
  for (final j in joyItems.where((j) => j.kind == JoyKind.bundled && j.active && j.bundledHabitId != null)) {
    final h = habits.where((h) => h.id == j.bundledHabitId).firstOrNull;
    if (h == null) continue;
    out.add(Experiment(
      id: 'exp_bundle_${h.id}',
      habitId: h.id,
      titleAr: '${j.titleAr.split('—').first.trim()} مع ${h.titleAr}',
      titleEn: '${j.titleEn.split('—').first.trim()} with ${h.titleEn}',
      variable: 'bundle:${j.id}',
      lengthDays: lengthDays,
    ));
    break;
  }
  // 2) time swap for the first morning/evening habit.
  for (final h in habits) {
    final slot = h.schedule.anchor.slot;
    if (slot != Slot.morning && slot != Slot.evening && slot != Slot.afternoon) continue;
    out.add(Experiment(
      id: 'exp_time_${h.id}',
      habitId: h.id,
      titleAr: '${h.titleAr}: ${slot == Slot.morning ? 'صباح أو مساء؟' : 'مساء أو صباح؟'}',
      titleEn: '${h.titleEn}: ${slot == Slot.morning ? 'morning or evening?' : 'evening or morning?'}',
      variable: 'time:${slot == Slot.morning ? 'evening' : 'morning'}',
      lengthDays: lengthDays,
    ));
    break;
  }
  // 3) minimum-only week for the first remaining habit.
  final used = out.map((e) => e.habitId).toSet();
  final h = habits.where((h) => !used.contains(h.id)).firstOrNull ?? habits.firstOrNull;
  if (h != null) {
    out.add(Experiment(
      id: 'exp_min_${h.id}',
      habitId: h.id,
      titleAr: '${h.titleAr}: النسخة الصغيرة فقط',
      titleEn: '${h.titleEn}: minimum version only',
      variable: 'minimum',
      lengthDays: lengthDays,
    ));
  }
  return out.take(max).toList();
}
