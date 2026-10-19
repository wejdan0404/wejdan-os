/// Recovery flow (spec §5.5, ENG-20, ENG-03, BODY-12).
///
/// Trigger: a Core habit (Grow domain) missed on its last
/// [kMissesToTrigger] planned occurrences in a row, or the app left
/// unopened for [kUnopenedDaysToTrigger] whole days in a row.
///
/// Flow: "What got in the way?" → [MissReason] → one proposed
/// [DesignChange] (never blame, always design) → she accepts/edits →
/// [applyDesignChange] → Comeback Spark bonus on the next completion.
library;

import '../core/date_utils.dart';
import '../data/models/models.dart';
import 'history.dart';

const int kMissesToTrigger = 3;
const int kUnopenedDaysToTrigger = 2;

/// Why the recovery flow opened.
enum RecoveryTriggerKind { coreHabitMissed, appUnopened }

class RecoveryTrigger {
  const RecoveryTrigger({required this.kind, this.habitId, required this.missedDays});

  final RecoveryTriggerKind kind;

  /// Habit concerned (null for [RecoveryTriggerKind.appUnopened]).
  final String? habitId;

  /// Day keys of the misses / unopened days (oldest first).
  final List<String> missedDays;
}

/// True if [habit]'s last [kMissesToTrigger] planned occurrences before
/// [today] were all missed.
List<String>? missedStreak(Habit habit, List<LogEntry> logs, DateTime today, {int lookbackDays = 42}) {
  final byDay = indexLogsByDay(logs, habit.id);
  final occ = occurrences(
    isPlanned: habit.schedule.isPlannedOn,
    logsByDay: byDay,
    from: addDays(today, -lookbackDays),
    to: addDays(today, -1),
    notBefore: habit.createdDate == null ? null : parseDayKey(habit.createdDate!),
  ).where((o) => o.planned || o.done).toList();
  if (occ.length < kMissesToTrigger) return null;
  final last = occ.sublist(occ.length - kMissesToTrigger);
  if (last.any((o) => o.done)) return null;
  return last.map((o) => o.key).toList();
}

/// Checks all triggers. [coreHabits] are active habits in Grow domains.
/// [openedDays] are day keys on which the app was opened.
/// Returns the unopened trigger first (it is the broader lapse), then one
/// trigger per core habit.
List<RecoveryTrigger> checkRecovery({
  required List<Habit> coreHabits,
  required List<LogEntry> logs,
  required Set<String> openedDays,
  required DateTime today,
  String? firstRunDate,
}) {
  final out = <RecoveryTrigger>[];
  final t = dateOnly(today);
  final unopened = <String>[];
  for (var i = kUnopenedDaysToTrigger; i >= 1; i--) {
    final k = dayKey(addDays(t, -i));
    if (firstRunDate != null && k.compareTo(firstRunDate) < 0) continue;
    if (!openedDays.contains(k)) unopened.add(k);
  }
  if (unopened.length == kUnopenedDaysToTrigger) {
    out.add(RecoveryTrigger(kind: RecoveryTriggerKind.appUnopened, missedDays: unopened));
  }
  for (final h in coreHabits) {
    if (!h.isActive) continue;
    final missed = missedStreak(h, logs, t);
    if (missed != null) {
      out.add(RecoveryTrigger(kind: RecoveryTriggerKind.coreHabitMissed, habitId: h.id, missedDays: missed));
    }
  }
  return out;
}

/// The one design change the engine proposes.
enum DesignChangeType {
  /// forgot → move the cue to a stronger anchor and switch on its reminder.
  moveCueAddReminder,

  /// bad time → swap to a better time (from her completion times).
  swapTime,

  /// too big → shrink to the minimum version.
  shrinkToMinimum,

  /// tired → minimum version + move earlier in the day.
  minimumAndMoveEarlier,

  /// not enjoyable → add a joy pairing / change the activity.
  addJoyPairing,

  /// place didn't fit → change the place / prepare it (friction down).
  changePlacePrepare,

  /// busy → shrink and reschedule to lighter days.
  shrinkAndReschedule,

  /// not important now → rest/pause (domain to Rest or habit paused).
  pauseToRest,
}

/// Mapping from the "what got in the way?" chip to the proposed change.
const Map<MissReason, DesignChangeType> kReasonToChange = {
  MissReason.forgot: DesignChangeType.moveCueAddReminder,
  MissReason.badTime: DesignChangeType.swapTime,
  MissReason.tooBig: DesignChangeType.shrinkToMinimum,
  MissReason.tired: DesignChangeType.minimumAndMoveEarlier,
  MissReason.notEnjoyable: DesignChangeType.addJoyPairing,
  MissReason.placeDidntFit: DesignChangeType.changePlacePrepare,
  MissReason.busy: DesignChangeType.shrinkAndReschedule,
  MissReason.notImportantNow: DesignChangeType.pauseToRest,
};

/// A concrete proposal she can accept or edit.
class DesignChange {
  const DesignChange({required this.type, required this.habitId, this.suggestedMinute, this.suggestedWeekdays});

  final DesignChangeType type;
  final String habitId;

  /// For time moves: proposed minute of day.
  final int? suggestedMinute;

  /// For reschedules: proposed weekdays.
  final List<int>? suggestedWeekdays;

  /// Whether [applyDesignChange] changes the habit mechanically; the rest
  /// (joy pairing, place) need her input in the UI first.
  bool get isMechanical => type != DesignChangeType.addJoyPairing && type != DesignChangeType.changePlacePrepare;
}

/// Median minute-of-day at which she *completed* anything (a proxy for her
/// real "good" times), or null.
int? bestCompletionMinute(List<LogEntry> logs, {String? itemId}) {
  final mins = logs
      .where((l) => l.isDone && l.minuteOfDay != null && (itemId == null || l.itemId == itemId))
      .map((l) => l.minuteOfDay!)
      .toList();
  final m = median(mins);
  return m?.round();
}

/// Proposes the design change for [reason] (spec §5.5 mapping).
DesignChange proposeChange({
  required Habit habit,
  required MissReason reason,
  required List<LogEntry> logs,
  required int currentMinute,
}) {
  final type = kReasonToChange[reason]!;
  switch (type) {
    case DesignChangeType.swapTime:
      final best = bestCompletionMinute(logs, itemId: habit.id) ?? bestCompletionMinute(logs);
      final proposed = (best == null || (best - currentMinute).abs() < 30)
          ? (currentMinute + 120).clamp(0, 1439)
          : best;
      return DesignChange(type: type, habitId: habit.id, suggestedMinute: proposed);
    case DesignChangeType.minimumAndMoveEarlier:
      return DesignChange(type: type, habitId: habit.id, suggestedMinute: (currentMinute - 60).clamp(0, 1439));
    case DesignChangeType.shrinkAndReschedule:
      final days = habit.schedule.weekdays;
      // Keep at most 3 planned days (drop the latest ones in the week).
      final kept = days.length <= 3 ? days : (List<int>.from(days)..sort()).take(3).toList();
      return DesignChange(type: type, habitId: habit.id, suggestedWeekdays: kept);
    default:
      return DesignChange(type: type, habitId: habit.id);
  }
}

/// Applies an accepted change to [habit]. Always sets `comebackPending`
/// so the next completion earns the Comeback bonus.
Habit applyDesignChange(Habit habit, DesignChange change) {
  final h = habit.copyWith(comebackPending: true);
  CueAnchor at(int m) => CueAnchor(type: AnchorType.fixedTime, minute: m, slot: h.schedule.anchor.slot);
  switch (change.type) {
    case DesignChangeType.moveCueAddReminder:
      return h.copyWith(
        reminder: HabitReminder(
          enabled: true,
          offsetMin: h.reminder.offsetMin,
          textAr: h.reminder.textAr,
          textEn: h.reminder.textEn,
        ),
      );
    case DesignChangeType.swapTime:
      return change.suggestedMinute == null ? h : h.copyWith(schedule: h.schedule.copyWith(anchor: at(change.suggestedMinute!)));
    case DesignChangeType.shrinkToMinimum:
      return h.copyWith(shrunkToMinimum: true);
    case DesignChangeType.minimumAndMoveEarlier:
      return h.copyWith(
        shrunkToMinimum: true,
        schedule: change.suggestedMinute == null ? null : h.schedule.copyWith(anchor: at(change.suggestedMinute!)),
      );
    case DesignChangeType.shrinkAndReschedule:
      return h.copyWith(
        shrunkToMinimum: true,
        schedule: change.suggestedWeekdays == null ? null : h.schedule.copyWith(weekdays: change.suggestedWeekdays),
      );
    case DesignChangeType.pauseToRest:
      return h.copyWith(status: HabitStatus.paused, comebackPending: false);
    case DesignChangeType.addJoyPairing:
    case DesignChangeType.changePlacePrepare:
      return h;
  }
}

/// A completion is a comeback when the habit is flagged, or its previous
/// planned occurrence (before [today]) was missed.
bool isComebackCompletion(Habit habit, List<LogEntry> logs, DateTime today) {
  if (habit.comebackPending) return true;
  final byDay = indexLogsByDay(logs, habit.id);
  final occ = occurrences(
    isPlanned: habit.schedule.isPlannedOn,
    logsByDay: byDay,
    from: addDays(today, -21),
    to: addDays(today, -1),
    notBefore: habit.createdDate == null ? null : parseDayKey(habit.createdDate!),
  );
  if (occ.isEmpty) return false;
  return !occ.last.done;
}
