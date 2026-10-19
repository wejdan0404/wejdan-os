/// Insights read-outs (spec §7.13). Pure; every number is computed from her
/// own logs — nothing is estimated or invented. Functions return null /
/// empty when there is not enough data, and the UI shows an empty state.
library;

import '../core/date_utils.dart';
import '../data/models/models.dart';
import 'history.dart';

/// Minimum completions before a "best time" window is shown.
const int kMinSamplesForBestTime = 3;

/// Mean days-to-return after a missed planned day, per week, oldest first
/// ([weeks] entries, the last one is the current week). A return counts in
/// the week it happened. Null for a week without any return.
List<double?> recoverySpeedByWeek({
  required List<Habit> habits,
  required List<LogEntry> logs,
  required DateTime today,
  int weeks = 4,
  int weekStartsOn = DateTime.sunday,
}) {
  final t = dateOnly(today);
  final thisWeek = startOfWeek(t, weekStartsOn: weekStartsOn);
  final firstWeek = addDays(thisWeek, -7 * (weeks - 1));
  final gapsByWeek = List.generate(weeks, (_) => <int>[]);
  for (final h in habits) {
    final byDay = indexLogsByDay(logs, h.id);
    final occ = occurrences(
      isPlanned: h.schedule.isPlannedOn,
      logsByDay: byDay,
      from: addDays(firstWeek, -28),
      to: t,
      notBefore: h.createdDate == null ? null : parseDayKey(h.createdDate!),
    );
    DateTime? firstMiss;
    for (final o in occ) {
      if (o.day == t && !o.done) continue; // today is not a miss yet
      if (!o.done && o.planned) {
        firstMiss ??= o.day;
      } else if (o.done && firstMiss != null) {
        final w = daysBetween(firstWeek, o.day) ~/ 7;
        if (w >= 0 && w < weeks) gapsByWeek[w].add(daysBetween(firstMiss, o.day));
        firstMiss = null;
      }
    }
  }
  return [for (final g in gapsByWeek) g.isEmpty ? null : g.reduce((a, b) => a + b) / g.length];
}

/// A time-of-day window (minutes since midnight).
class TimeWindow {
  const TimeWindow(this.start, this.end, this.samples);
  final int start;
  final int end;
  final int samples;
}

/// Her usual completion window for [itemId] over the last [days]: the
/// middle half (25th–75th percentile) of completion times, rounded to 15 min
/// and at least 30 min wide. Null with fewer than [kMinSamplesForBestTime].
TimeWindow? bestTimeWindow({
  required List<LogEntry> logs,
  required String itemId,
  required DateTime today,
  int days = 28,
}) {
  final from = dayKey(addDays(dateOnly(today), -(days - 1)));
  final mins = logs
      .where((l) => l.itemId == itemId && l.isDone && l.minuteOfDay != null && l.date.compareTo(from) >= 0)
      .map((l) => l.minuteOfDay!)
      .toList()
    ..sort();
  if (mins.length < kMinSamplesForBestTime) return null;
  int pct(double p) => mins[((mins.length - 1) * p).round()];
  var lo = (pct(.25) ~/ 15) * 15;
  var hi = ((pct(.75) + 14) ~/ 15) * 15;
  if (hi - lo < 30) {
    final mid = (lo + hi) ~/ 2;
    lo = ((mid - 15) ~/ 15) * 15;
    hi = lo + 30;
  }
  return TimeWindow(lo.clamp(0, 1439), hi.clamp(0, 1439), mins.length);
}

/// "System burden": how much the app itself asks of her this week.
class SystemBurden {
  const SystemBurden({required this.logCount, required this.reviewMinutes});

  /// Taps that logged something this week (completions + skips).
  final int logCount;

  /// Measured minutes spent in weekly reviews this week (null if none).
  final int? reviewMinutes;
}

SystemBurden systemBurden({
  required List<LogEntry> logs,
  required List<WeeklyReviewRecord> reviews,
  required DateTime today,
  int weekStartsOn = DateTime.sunday,
}) {
  final start = dayKey(startOfWeek(today, weekStartsOn: weekStartsOn));
  final end = dayKey(today);
  bool inWeek(String d) => d.compareTo(start) >= 0 && d.compareTo(end) <= 0;
  final r = reviews.where((x) => inWeek(x.date) && x.durationSec != null).toList();
  return SystemBurden(
    logCount: logs.where((l) => inWeek(l.date)).length,
    reviewMinutes: r.isEmpty ? null : (r.map((x) => x.durationSec!).reduce((a, b) => a + b) / 60).ceil(),
  );
}

/// Completed planned days of [habit] in the week containing [today].
({int done, int planned}) weekCount(Habit habit, List<LogEntry> logs, DateTime today, {int weekStartsOn = DateTime.sunday}) {
  final from = startOfWeek(today, weekStartsOn: weekStartsOn);
  final occ = occurrences(
    isPlanned: habit.schedule.isPlannedOn,
    logsByDay: indexLogsByDay(logs, habit.id),
    from: from,
    to: addDays(from, 6),
  );
  return (done: occ.where((o) => o.done).length, planned: occ.where((o) => o.planned).length);
}
