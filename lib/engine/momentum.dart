/// Momentum instead of streaks (spec §5.4, ENG-03, ENG-13).
///
/// **Momentum** is a 7-period exponentially weighted score over planned
/// occurrences (α = 2 / (7 + 1) = 0.25, the standard 7-period EMA weighting):
///
///     m ← m + α · (s − m),   s = 1 if done (any level) else 0
///
/// * A miss lowers momentum by at most 25 % of its current value — gently.
/// * It **never resets to zero**: once she has any completion (even one older
///   than the lookback) the value never goes below [kMomentumRestFloor] — the
///   "resting" state (UI: «راحة», not 0). A habit never done yet reads 0,
///   which the UI also shows as «راحة».
/// * Unplanned days don't move it; an unplanned completion counts as a bonus.
/// * Today counts only once it is done (an open today is not a miss).
///
/// **Forgiving streak** (optional, off by default): consecutive planned
/// occurrences done, walking back from the latest, where up to
/// [kGraceDaysPerWeek] misses per calendar week are forgiven.
library;

import '../core/date_utils.dart';
import '../data/models/models.dart';
import 'history.dart';

const double kMomentumAlpha = 0.25;
const int kMomentumLookbackDays = 60;
const int kGraceDaysPerWeek = 2;

/// Resting floor (0–100 scale): momentum never decays below this once she has
/// a completion. Rounds to 1, so the display never reads 0 after a start.
const double kMomentumRestFloor = 1.0;

/// At or below this, the UI shows the resting state («راحة») instead of a number.
const double kMomentumRestShown = kMomentumRestFloor;

/// True when [momentum] should be shown as the resting state.
bool isMomentumResting(double momentum) => momentum <= kMomentumRestShown;

/// Momentum 0–100 from explicit occurrence outcomes (oldest first).
double momentumFromOutcomes(Iterable<bool> doneOldestFirst, {double start = 0}) {
  var m = start;
  var any = start > 0;
  for (final d in doneOldestFirst) {
    any = any || d;
    m = m + kMomentumAlpha * ((d ? 1.0 : 0.0) - m);
  }
  final v = m * 100;
  return any && v < kMomentumRestFloor ? kMomentumRestFloor : v;
}

List<Occurrence> _occ(bool Function(DateTime) isPlanned, Map<String, LogEntry> byDay, DateTime today,
    {String? createdDate, int lookback = kMomentumLookbackDays}) {
  final t = dateOnly(today);
  final todayLog = byDay[dayKey(t)];
  final end = (todayLog != null && todayLog.isDone) ? t : addDays(t, -1);
  return occurrences(
    isPlanned: isPlanned,
    logsByDay: byDay,
    from: addDays(t, -lookback),
    to: end,
    notBefore: createdDate == null ? null : parseDayKey(createdDate),
  );
}

/// Momentum 0–100 for a habit.
double habitMomentum({required Habit habit, required List<LogEntry> logs, required DateTime today}) {
  final byDay = indexLogsByDay(logs, habit.id);
  final occ = _occ(habit.schedule.isPlannedOn, byDay, today, createdDate: habit.createdDate);
  final m = momentumFromOutcomes(occ.map((o) => o.done));
  // A completion older than the lookback still counts: rest, never zero.
  final key = dayKey(dateOnly(today));
  final everDone = logs.any((l) => l.itemId == habit.id && l.isDone && l.date.compareTo(key) <= 0);
  return everDone && m < kMomentumRestFloor ? kMomentumRestFloor : m;
}

/// Mean momentum of [habits] (e.g. per domain for Insights). 0 when empty.
double averageMomentum({required List<Habit> habits, required List<LogEntry> logs, required DateTime today}) {
  if (habits.isEmpty) return 0;
  final sum = habits.map((h) => habitMomentum(habit: h, logs: logs, today: today)).reduce((a, b) => a + b);
  return sum / habits.length;
}

/// Forgiving-streak read-out.
class ForgivingStreak {
  const ForgivingStreak({required this.length, required this.graceUsedThisWeek});

  /// Number of completed occurrences in the current run.
  final int length;

  /// Grace days already used in the current week (0..[kGraceDaysPerWeek]).
  final int graceUsedThisWeek;

  int get graceLeftThisWeek => kGraceDaysPerWeek - graceUsedThisWeek;
}

/// Forgiving streak for a habit (see library docs).
ForgivingStreak forgivingStreak({
  required Habit habit,
  required List<LogEntry> logs,
  required DateTime today,
  int weekStartsOn = DateTime.sunday,
}) {
  final byDay = indexLogsByDay(logs, habit.id);
  final occ = _occ(habit.schedule.isPlannedOn, byDay, today, createdDate: habit.createdDate, lookback: 366);
  final thisWeek = startOfWeek(today, weekStartsOn: weekStartsOn);
  final missesPerWeek = <DateTime, int>{};
  var length = 0;
  for (final o in occ.reversed) {
    if (o.done) {
      length++;
      continue;
    }
    final w = startOfWeek(o.day, weekStartsOn: weekStartsOn);
    final used = (missesPerWeek[w] ?? 0) + 1;
    if (used > kGraceDaysPerWeek) break;
    missesPerWeek[w] = used;
  }
  // Grace used this week is reported from all misses this week, even if the
  // run broke earlier.
  final usedThisWeek =
      occ.where((o) => !o.done && o.planned && !o.day.isBefore(thisWeek)).length.clamp(0, kGraceDaysPerWeek);
  return ForgivingStreak(length: length, graceUsedThisWeek: usedThisWeek);
}
