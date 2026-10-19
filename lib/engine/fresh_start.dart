/// Fresh-start moments (JOY-10): temporal landmarks — a new week, a new
/// month, a new season — are good moments to restart or re-aim. The app
/// only *offers* a gentle "بداية جديدة" card; nothing is reset.
library;

import '../core/date_utils.dart';
import '../data/models/models.dart';

/// Days after a season starts during which "new season" is offered.
const int kNewSeasonWindowDays = 3;

enum FreshStartKind { newSeason, newMonth, newWeek }

class FreshStart {
  const FreshStart(this.kind, this.date);

  final FreshStartKind kind;

  /// Day key of the landmark.
  final String date;

  @override
  bool operator ==(Object other) => other is FreshStart && other.kind == kind && other.date == date;

  @override
  int get hashCode => Object.hash(kind, date);

  @override
  String toString() => 'FreshStart($kind, $date)';
}

/// The strongest landmark on [day] (season > month > week), or null.
///
/// * new season: [season] started within the last [kNewSeasonWindowDays]
///   days (including [day]);
/// * new month: the 1st;
/// * new week: [day] is the week's first day ([weekStartsOn], Sunday default).
FreshStart? freshStartOn(DateTime day, {int weekStartsOn = DateTime.sunday, Season? season}) {
  final d = dateOnly(day);
  final key = dayKey(d);
  if (season != null && season.isCurrent) {
    final start = parseDayKey(season.startDate);
    final since = daysBetween(start, d);
    if (since >= 0 && since < kNewSeasonWindowDays) return FreshStart(FreshStartKind.newSeason, key);
  }
  if (d.day == 1) return FreshStart(FreshStartKind.newMonth, key);
  if (d.weekday == weekStartsOn) return FreshStart(FreshStartKind.newWeek, key);
  return null;
}

/// Landmark of the day after [day] (Weekly Review on Saturday → "Sunday is a
/// fresh start").
/// A season counts only when it starts exactly tomorrow.
FreshStart? freshStartTomorrow(DateTime day, {int weekStartsOn = DateTime.sunday, Season? season}) {
  final t = addDays(dateOnly(day), 1);
  if (season != null && season.isCurrent && season.startDate == dayKey(t)) {
    return FreshStart(FreshStartKind.newSeason, dayKey(t));
  }
  return freshStartOn(t, weekStartsOn: weekStartsOn);
}
