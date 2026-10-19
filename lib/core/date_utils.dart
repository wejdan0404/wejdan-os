/// Pure date helpers. All engine code works on *local calendar days*
/// represented as `DateTime(y, m, d)` (midnight, local) or as a day key
/// string `yyyy-MM-dd`. Times of day are ints: minutes since midnight.
library;

/// Strips the time part.
DateTime dateOnly(DateTime d) => DateTime(d.year, d.month, d.day);

/// `yyyy-MM-dd` key used for logs, plans and ledgers.
String dayKey(DateTime d) {
  final y = d.year.toString().padLeft(4, '0');
  final m = d.month.toString().padLeft(2, '0');
  final dd = d.day.toString().padLeft(2, '0');
  return '$y-$m-$dd';
}

/// Parses a `yyyy-MM-dd` key into a local midnight [DateTime].
DateTime parseDayKey(String key) {
  final parts = key.split('-');
  return DateTime(int.parse(parts[0]), int.parse(parts[1]), int.parse(parts[2]));
}

/// Adds [days] calendar days (DST-safe because it rebuilds from y/m/d).
DateTime addDays(DateTime d, int days) => DateTime(d.year, d.month, d.day + days);

/// Whole calendar days from [a] to [b] (b - a).
int daysBetween(DateTime a, DateTime b) {
  final ua = DateTime.utc(a.year, a.month, a.day);
  final ub = DateTime.utc(b.year, b.month, b.day);
  return ub.difference(ua).inDays;
}

/// Start of the week containing [d], given [weekStartsOn] as a
/// [DateTime.weekday] value (default Sunday — Saudi work week Sun–Thu,
/// weekend Fri–Sat, weekly review closes the week on Saturday).
DateTime startOfWeek(DateTime d, {int weekStartsOn = DateTime.sunday}) {
  final day = dateOnly(d);
  final diff = (day.weekday - weekStartsOn) % 7;
  return addDays(day, -diff);
}

/// Planner day boundary (spec §5.1: plan runs at 04:30 local). Activity
/// between midnight and 04:30 still belongs to the previous day, so a late
/// night routine is logged on the right day.
const int kDayBoundaryMinute = 4 * 60 + 30;

/// The *logical* day [now] belongs to (see [kDayBoundaryMinute]).
DateTime logicalDay(DateTime now, {int boundaryMinute = kDayBoundaryMinute}) {
  final d = dateOnly(now);
  return (now.hour * 60 + now.minute) < boundaryMinute ? addDays(d, -1) : d;
}

/// Minute-of-day for [d].
int minuteOfDay(DateTime d) => d.hour * 60 + d.minute;

/// Formats a minute-of-day as `HH:mm` with Western digits.
String formatHm(int minute) {
  final m = ((minute % 1440) + 1440) % 1440;
  final h = (m ~/ 60).toString().padLeft(2, '0');
  final mm = (m % 60).toString().padLeft(2, '0');
  return '$h:$mm';
}

/// Parses `HH:mm` into minute-of-day.
int parseHm(String hm) {
  final p = hm.split(':');
  return int.parse(p[0]) * 60 + int.parse(p[1]);
}

/// True if [minute] lies inside the window [start, end) which may wrap
/// around midnight (e.g. quiet hours 23:00–07:00).
bool inWindow(int minute, int start, int end) {
  if (start == end) return false;
  if (start < end) return minute >= start && minute < end;
  return minute >= start || minute < end;
}

/// Stable 31-bit FNV-1a hash (identical on VM and web) — used for
/// notification ids and deterministic rotations.
int stableHash(String s) {
  var h = 0x811c9dc5;
  for (final c in s.codeUnits) {
    h ^= c;
    h = (h * 0x01000193) & 0xFFFFFFFF;
  }
  return h & 0x7FFFFFFF;
}
