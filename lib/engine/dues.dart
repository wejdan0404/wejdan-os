/// Upcoming money & admin due dates (Money lite, Home & Admin): bills and
/// subscriptions by day of month, BNPL instalments, document renewals inside
/// their reminder window, and the monthly auto-save reminder. Pure.
library;

import '../core/date_utils.dart';
import '../data/models/models.dart';

enum DueKind { bill, subscription, bnpl, document, autoSave }

class DueItem {
  const DueItem({required this.kind, required this.refId, required this.title, required this.date, this.amount});

  final DueKind kind;
  final String refId;
  final String title;
  final DateTime date;
  final double? amount;

  /// Days from [today] (0 = today, negative = overdue).
  int daysFrom(DateTime today) => daysBetween(dateOnly(today), date);
}

/// Next occurrence (today or later) of [dayOfMonth], clamped to month length.
DateTime nextMonthlyDate(DateTime today, int dayOfMonth) {
  final t = dateOnly(today);
  DateTime inMonth(int y, int m) {
    final last = DateTime(y, m + 1, 0).day;
    return DateTime(y, m, dayOfMonth.clamp(1, last));
  }

  final thisMonth = inMonth(t.year, t.month);
  return thisMonth.isBefore(t) ? inMonth(t.year, t.month + 1) : thisMonth;
}

/// Everything due within [horizonDays] (documents: once inside their own
/// `remindDaysBefore` window, until expiry). Sorted by date.
List<DueItem> upcomingDues({
  required DateTime today,
  List<Bill> bills = const [],
  List<BnplItem> bnpl = const [],
  List<AdminDoc> docs = const [],
  int? autoSaveDay,
  int horizonDays = 30,
}) {
  final t = dateOnly(today);
  final end = addDays(t, horizonDays);
  final out = <DueItem>[];
  for (final b in bills.where((b) => b.active)) {
    final d = nextMonthlyDate(t, b.dueDay);
    if (!d.isAfter(end)) {
      out.add(DueItem(
          kind: b.isSubscription ? DueKind.subscription : DueKind.bill, refId: b.id, title: b.title, date: d, amount: b.amount));
    }
  }
  for (final p in bnpl) {
    final n = p.nextDue;
    if (n == null) continue;
    final d = parseDayKey(n);
    if (!d.isAfter(end)) {
      out.add(DueItem(kind: DueKind.bnpl, refId: p.id, title: p.title, date: d, amount: p.instalmentAmount));
    }
  }
  for (final doc in docs) {
    if (doc.expiry == null) continue;
    final exp = parseDayKey(doc.expiry!);
    final remindFrom = addDays(exp, -doc.remindDaysBefore);
    if (!t.isBefore(remindFrom) && !exp.isBefore(t)) {
      out.add(DueItem(kind: DueKind.document, refId: doc.id, title: doc.name, date: exp));
    }
  }
  if (autoSaveDay != null) {
    final d = nextMonthlyDate(t, autoSaveDay);
    if (!d.isAfter(end)) out.add(DueItem(kind: DueKind.autoSave, refId: 'auto_save', title: '', date: d));
  }
  out.sort((a, b) => a.date.compareTo(b.date));
  return out;
}

/// Wishlist cooling-off: days left before she decides (0 = ready).
int coolingDaysLeft(WishItem w, DateTime today) {
  final ready = addDays(parseDayKey(w.addedDate), w.coolingOffDays);
  final left = daysBetween(dateOnly(today), ready);
  return left < 0 ? 0 : left;
}

/// Expanding practice gaps (days) for spaced theory rounds: 1, 2, 4, 7, 14…
const List<int> kSpacedGaps = [1, 2, 4, 7, 14];

/// Next spaced-practice day after the rounds done on [roundDates] (day
/// keys). No rounds yet → [today]. Gap grows with each round (capped at the
/// last entry of [kSpacedGaps]); a missed day is simply "due" (today).
DateTime nextSpacedPractice(List<String> roundDates, DateTime today) {
  if (roundDates.isEmpty) return dateOnly(today);
  final sorted = [...roundDates]..sort();
  final gap = kSpacedGaps[(sorted.length - 1).clamp(0, kSpacedGaps.length - 1)];
  final next = addDays(parseDayKey(sorted.last), gap);
  return next.isBefore(dateOnly(today)) ? dateOnly(today) : next;
}
