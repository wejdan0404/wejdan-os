/// Habit Strength (spec §5.3, ENG-02, ENG-04).
///
/// Strength is *never* a day count. It combines:
///  * **SRBAI** — Self-Report Behavioural Automaticity Index, 4 items on a
///    1–5 agreement scale, mapped linearly to 0–100.
///  * **Consistency** — forgiving share of planned days done over a rolling
///    28-day window.
///  * **Recovery speed** — mean days from a missed planned day to the next
///    completion (lower is better; reported, not scored).
///
/// Growth-stage thresholds (app design choices, documented; not source doses):
///
/// | Stage     | Rule |
/// |-----------|------|
/// | seed      | score < 20, or fewer than [kMinOccurrencesForStage] planned days |
/// | sprout    | 20 ≤ score < 40 |
/// | growing   | 40 ≤ score < 60 (max stage without any SRBAI check) |
/// | rooted    | score ≥ 60 **and** at least one SRBAI check |
/// | automatic | score ≥ 80 **and** the last two SRBAI checks ≥ 75 (plateau high, ENG-04) **and** consistency ≥ 70 |
///
/// score = 0.6 × latest SRBAI + 0.4 × consistency when an SRBAI exists,
/// otherwise score = consistency, capped to the *growing* band.
library;

import '../core/date_utils.dart';
import '../data/models/models.dart';
import 'history.dart';

/// Rolling window for consistency.
const int kConsistencyWindowDays = 28;

/// Planned days required before any stage above seed is shown.
const int kMinOccurrencesForStage = 4;

/// One forgiven miss per this many planned days (the "forgiving" part).
const int kGraceEveryPlannedDays = 7;

/// SRBAI 4 items (each 1–5) → 0–100. Values are clamped to 1..5.
double srbaiScore(List<int> items) {
  if (items.isEmpty) return 0;
  final vals = items.take(4).map((v) => v.clamp(1, 5)).toList();
  final mean = vals.reduce((a, b) => a + b) / vals.length;
  return (mean - 1) / 4 * 100;
}

/// Forgiving consistency 0–100 over the last [windowDays] days ending
/// [today] (inclusive; today only counts if already done).
///
/// consistency = done / max(1, planned − grace) where
/// grace = floor(planned / [kGraceEveryPlannedDays]); capped at 100.
/// Unplanned-but-done days count as done (bonus) but never as planned.
double consistencyScore({
  required Habit habit,
  required Map<String, LogEntry> logsByDay,
  required DateTime today,
  int windowDays = kConsistencyWindowDays,
}) {
  final occ = _window(habit, logsByDay, today, windowDays);
  final planned = occ.where((o) => o.planned).length;
  if (planned == 0) return 0;
  final done = occ.where((o) => o.done).length;
  final grace = planned ~/ kGraceEveryPlannedDays;
  final denom = (planned - grace).clamp(1, planned);
  return (done / denom * 100).clamp(0, 100).toDouble();
}

List<Occurrence> _window(Habit habit, Map<String, LogEntry> logsByDay, DateTime today, int windowDays) {
  final t = dateOnly(today);
  final todayLog = logsByDay[dayKey(t)];
  // Today counts only once done — an unfinished today is not a miss yet.
  final end = (todayLog != null && todayLog.isDone) ? t : addDays(t, -1);
  return occurrences(
    isPlanned: habit.schedule.isPlannedOn,
    logsByDay: logsByDay,
    from: addDays(t, -(windowDays - 1)),
    to: end,
    notBefore: habit.createdDate == null ? null : parseDayKey(habit.createdDate!),
  );
}

/// Mean calendar days from each missed planned day to the next completion,
/// over the last [windowDays]. Null if there were no misses followed by a
/// return. 1.0 means she came back the very next day.
double? recoverySpeedDays({
  required Habit habit,
  required Map<String, LogEntry> logsByDay,
  required DateTime today,
  int windowDays = 56,
}) {
  final occ = _window(habit, logsByDay, today, windowDays);
  final gaps = <int>[];
  DateTime? firstMiss;
  for (final o in occ) {
    if (!o.done && o.planned) {
      firstMiss ??= o.day;
    } else if (o.done && firstMiss != null) {
      gaps.add(daysBetween(firstMiss, o.day));
      firstMiss = null;
    }
  }
  if (gaps.isEmpty) return null;
  return gaps.reduce((a, b) => a + b) / gaps.length;
}

/// Full strength read-out for a habit.
class HabitStrength {
  const HabitStrength({
    required this.habitId,
    required this.score,
    required this.srbai,
    required this.consistency,
    required this.recoverySpeedDays,
    required this.stage,
    required this.plannedDays,
  });

  final String habitId;

  /// 0–100 combined score (see library docs).
  final double score;

  /// Latest SRBAI 0–100, or null if never checked.
  final double? srbai;
  final double consistency;
  final double? recoverySpeedDays;
  final GrowthStage stage;

  /// Planned days in the consistency window (evidence volume).
  final int plannedDays;
}

/// Stage from the inputs (pure; see thresholds table in library docs).
GrowthStage stageFor({
  required double consistency,
  required List<double> srbaiHistory,
  required int plannedDays,
}) {
  if (plannedDays < kMinOccurrencesForStage && srbaiHistory.isEmpty) return GrowthStage.seed;
  final hasSrbai = srbaiHistory.isNotEmpty;
  final latest = hasSrbai ? srbaiHistory.last : null;
  var score = hasSrbai ? 0.6 * latest! + 0.4 * consistency : consistency;
  if (!hasSrbai && score >= 60) score = 59.9; // cap to "growing" without SRBAI
  if (score < 20) return GrowthStage.seed;
  if (score < 40) return GrowthStage.sprout;
  if (score < 60) return GrowthStage.growing;
  final plateauHigh = srbaiHistory.length >= 2 &&
      srbaiHistory[srbaiHistory.length - 1] >= 75 &&
      srbaiHistory[srbaiHistory.length - 2] >= 75;
  if (score >= 80 && plateauHigh && consistency >= 70) return GrowthStage.automatic;
  return GrowthStage.rooted;
}

/// Computes [HabitStrength] for [habit] from its logs and SRBAI checks.
HabitStrength computeStrength({
  required Habit habit,
  required List<LogEntry> logs,
  required List<StrengthCheck> checks,
  required DateTime today,
}) {
  final byDay = indexLogsByDay(logs, habit.id);
  final consistency = consistencyScore(habit: habit, logsByDay: byDay, today: today);
  final planned = _window(habit, byDay, today, kConsistencyWindowDays).where((o) => o.planned).length;
  final own = checks.where((c) => c.habitId == habit.id).toList()..sort((a, b) => a.date.compareTo(b.date));
  final history = own.map((c) => srbaiScore(c.items)).toList();
  final latest = history.isEmpty ? null : history.last;
  final score = latest == null ? consistency.clamp(0, 59.9).toDouble() : 0.6 * latest + 0.4 * consistency;
  return HabitStrength(
    habitId: habit.id,
    score: score,
    srbai: latest,
    consistency: consistency,
    recoverySpeedDays: recoverySpeedDays(habit: habit, logsByDay: byDay, today: today),
    stage: stageFor(consistency: consistency, srbaiHistory: history, plannedDays: planned),
    plannedDays: planned,
  );
}
