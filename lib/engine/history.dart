/// Shared, pure helpers for turning logs into planned occurrences.
library;

import '../core/date_utils.dart';
import '../data/models/models.dart';

/// Rank used to pick the "best" log of a day (bonus > normal > minimum > skip).
int _rank(CompletionLevel l) => switch (l) {
      CompletionLevel.bonus => 3,
      CompletionLevel.normal => 2,
      CompletionLevel.minimum => 1,
      CompletionLevel.skipped => 0,
    };

/// Indexes [logs] of [itemId] by day key, keeping the best level per day.
Map<String, LogEntry> indexLogsByDay(Iterable<LogEntry> logs, String itemId) {
  final out = <String, LogEntry>{};
  for (final l in logs) {
    if (l.itemId != itemId) continue;
    final prev = out[l.date];
    if (prev == null || _rank(l.level) > _rank(prev.level)) out[l.date] = l;
  }
  return out;
}

/// One planned (or bonus, unplanned-but-done) day for an item.
class Occurrence {
  const Occurrence(this.day, this.log, {this.planned = true});

  final DateTime day;
  final LogEntry? log;

  /// False when the day was not scheduled but she did it anyway.
  final bool planned;

  bool get done => log?.isDone ?? false;
  String get key => dayKey(day);
}

/// Planned occurrences from [from] to [to] (both inclusive), oldest first.
///
/// Days before [notBefore] (e.g. habit creation) are ignored. Unplanned days
/// with a *done* log are included as bonus occurrences (never as misses).
List<Occurrence> occurrences({
  required bool Function(DateTime day) isPlanned,
  required Map<String, LogEntry> logsByDay,
  required DateTime from,
  required DateTime to,
  DateTime? notBefore,
}) {
  final out = <Occurrence>[];
  var d = dateOnly(from);
  final end = dateOnly(to);
  final floor = notBefore == null ? null : dateOnly(notBefore);
  while (!d.isAfter(end)) {
    if (floor == null || !d.isBefore(floor)) {
      final log = logsByDay[dayKey(d)];
      if (isPlanned(d)) {
        out.add(Occurrence(d, log));
      } else if (log != null && log.isDone) {
        out.add(Occurrence(d, log, planned: false));
      }
    }
    d = addDays(d, 1);
  }
  return out;
}

/// Median of [values]; null when empty.
double? median(List<num> values) {
  if (values.isEmpty) return null;
  final s = [...values]..sort();
  final mid = s.length ~/ 2;
  return s.length.isOdd ? s[mid].toDouble() : (s[mid - 1] + s[mid]) / 2;
}
