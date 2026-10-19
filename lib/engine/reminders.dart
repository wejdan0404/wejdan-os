/// Reminder planning (spec §5.6, ENG-15, ENG-16, GROW-21) — pure Dart.
///
/// `buildReminderPlan` turns today's [DayPlan] into at most
/// `settings.notificationCap` (default 4, range 0–6) [ScheduledNudge]s:
///
/// 1. Morning Brief at max(wake, quiet end). Quiet end = her own setting if
///    she set one, otherwise her wake time ([effectiveQuietEnd]; spec §5.6
///    "Morning Brief at wake"; QA R1),
/// 2. Evening Shutdown at `sleep − eveningShutdownBeforeSleepMin` (moved to
///    30 min before quiet hours if it falls inside them),
/// 3. **Today's dues** — ONE bundled notification («مستحقات اليوم») for every
///    bill, BNPL instalment, renewal and auto-save due today (never one per
///    item), [kDuesAfterWakeMin] after the Morning Brief; it counts inside the
///    daily cap,
/// 4. up to `cap − 2` anchored nudges (2 at the default cap; one fewer on a
///    day with dues) for plan items
///    whose habit has its reminder on — one per habit, tied to its cue.
///
/// Suppression: quiet hours (default 23:00–07:00), Focus blocks, times
/// already passed. **Adaptive mute**: a habit whose last [kIgnoredToMute]
/// nudges were all ignored is moved to quiet mode and reported in
/// [ReminderPlan.muted] with a better time suggested from her actual
/// completion times.
///
/// The platform side is behind [NotificationService] (iOS implementation in
/// `lib/services/notification_service.dart`, no-op on web).
library;

import '../core/date_utils.dart';
import '../data/models/models.dart';
import 'dues.dart';
import 'recovery.dart' show bestCompletionMinute;
import 'why_today.dart';

const int kIgnoredToMute = 3;
const int kDefaultNotificationCap = 4;
const int kSnoozeMinutes = 30;

/// The bundled dues notification comes this long after the Morning Brief.
const int kDuesAfterWakeMin = 60;

/// Quiet-hours end as the engine applies it (and Settings shows it): her own
/// end if she set one, otherwise her wake time. See
/// [Settings.effectiveQuietEndMinute].
int effectiveQuietEnd(Settings s) => s.effectiveQuietEndMinute;

/// Dues that belong in today's bundled notification: due today or overdue.
List<DueItem> duesForToday(List<DueItem> dues, DateTime today) =>
    dues.where((d) => d.daysFrom(today) <= 0).toList();

/// iOS notification category with Done / Snooze / Skip actions.
const String kNudgeCategoryId = 'wejdan_nudge';
const String kActionDone = 'done_min';
const String kActionSnooze = 'snooze_30';
const String kActionSkip = 'skip';

/// One notification to schedule.
class ScheduledNudge {
  const ScheduledNudge({
    required this.id,
    required this.kind,
    required this.date,
    required this.minute,
    required this.title,
    required this.body,
    this.itemId,
  });

  /// Stable 31-bit id (same inputs → same id on every platform).
  final int id;
  final NudgeKind kind;
  final String date;
  final int minute;
  final LocalizedText title;
  final LocalizedText body;

  /// Plan item id (for anchored nudges).
  final String? itemId;

  /// Anchored nudges carry Done / Snooze / Skip actions.
  bool get actionable => kind == NudgeKind.anchored;

  /// `kind|date|itemId` — parsed back by [NudgePayload.parse].
  String get payload => '${kind.name}|$date|${itemId ?? ''}';
}

/// Parsed notification payload.
class NudgePayload {
  const NudgePayload(this.kind, this.date, this.itemId);

  static NudgePayload? parse(String? raw) {
    if (raw == null) return null;
    final p = raw.split('|');
    if (p.length != 3) return null;
    return NudgePayload(
      enumFromName(NudgeKind.values, p[0], NudgeKind.anchored),
      p[1],
      p[2].isEmpty ? null : p[2],
    );
  }

  final NudgeKind kind;
  final String date;
  final String? itemId;
}

/// A habit put in quiet mode.
class MutedNudge {
  const MutedNudge({required this.itemId, required this.ignoredInARow, this.suggestedMinute});

  final String itemId;
  final int ignoredInARow;

  /// Better time from her completion history (null if unknown).
  final int? suggestedMinute;
}

class ReminderPlan {
  const ReminderPlan({
    this.nudges = const [],
    this.muted = const [],
    this.droppedForQuiet = const [],
    this.droppedForFocus = const [],
    this.droppedForCap = const [],
  });

  /// Sorted by time; length ≤ cap.
  final List<ScheduledNudge> nudges;
  final List<MutedNudge> muted;
  final List<ScheduledNudge> droppedForQuiet;
  final List<ScheduledNudge> droppedForFocus;
  final List<ScheduledNudge> droppedForCap;
}

/// Consecutive most-recent `ignored` responses for [itemId].
int ignoredInARow(List<NudgeRecord> history, String itemId) {
  final own = history.where((r) => r.itemId == itemId).toList()
    ..sort((a, b) {
      final c = b.date.compareTo(a.date);
      return c != 0 ? c : b.id.compareTo(a.id);
    });
  var n = 0;
  for (final r in own) {
    if (r.response != NudgeResponse.ignored) break;
    n++;
  }
  return n;
}

/// Builds today's reminder plan (see library docs).
ReminderPlan buildReminderPlan({
  required DayPlan plan,
  required Settings settings,
  required List<Habit> habits,
  List<NudgeRecord> nudgeHistory = const [],
  List<LogEntry> logs = const [],
  List<FixedEvent> fixedEvents = const [],
  List<DueItem> dues = const [],
  int? nowMinute,
}) {
  final cap = settings.notificationCap.clamp(0, 6);
  if (cap == 0) return const ReminderPlan();
  final day = parseDayKey(plan.date);
  final qs = settings.quietStartMinute, qe = effectiveQuietEnd(settings);
  bool quiet(int m) => inWindow(m, qs, qe);
  final focus = fixedEvents.where((e) => e.isFocusBlock && e.occursOn(day, plan.date)).toList();
  bool inFocus(int m) => focus.any((e) => m >= e.startMinute && m < e.endMinute);

  ScheduledNudge mk(NudgeKind kind, int minute, LocalizedText title, LocalizedText body, [String? itemId]) =>
      ScheduledNudge(
        id: stableHash('${plan.date}|${kind.name}|${itemId ?? ''}'),
        kind: kind,
        date: plan.date,
        minute: minute,
        title: title,
        body: body,
        itemId: itemId,
      );

  // Fixed nudges. Morning Brief at max(wake, quiet end).
  var morningAt = settings.wakeMinute;
  if (quiet(morningAt)) morningAt = qe;
  final first = plan.items.where((i) => i.tier != PlanTier.joy).firstOrNull;
  final morning = mk(
    NudgeKind.morningBrief,
    morningAt,
    engineText('nudgeMorningTitle'),
    first == null ? engineText('nudgeMorningBodyEmpty') : engineText('nudgeMorningBody', {'first': first.title}),
  );
  var eveningAt = (settings.sleepMinute - settings.eveningShutdownBeforeSleepMin) % 1440;
  if (quiet(eveningAt)) eveningAt = (qs - 30) % 1440;
  final evening = mk(NudgeKind.eveningShutdown, eveningAt, engineText('nudgeEveningTitle'), engineText('nudgeEveningBody'));

  // Today's dues: one bundled notification, never one per item.
  final todayDues = duesForToday(dues, day);
  ScheduledNudge? duesNudge;
  if (todayDues.isNotEmpty) {
    var at = (morningAt + kDuesAfterWakeMin).clamp(0, 1439);
    if (quiet(at)) at = (qe + kDuesAfterWakeMin).clamp(0, 1439);
    final names = [
      for (final d in todayDues)
        d.kind == DueKind.autoSave || d.title.trim().isEmpty ? engineText('duesAutoSave') : LocalizedText.same(d.title),
    ];
    duesNudge = mk(
      NudgeKind.dues,
      at,
      engineText('nudgeDuesTitle'),
      LocalizedText(ar: names.map((n) => n.ar).join('، '), en: names.map((n) => n.en).join(', ')),
    );
  }

  // Anchored candidates: one per habit with reminder on, in plan order.
  final habitsById = {for (final h in habits) h.id: h};
  final muted = <MutedNudge>[];
  final anchored = <ScheduledNudge>[];
  final seen = <String>{};
  for (final item in plan.items) {
    if (item.kind != PlanItemKind.habit || item.startMinute == null) continue;
    final h = habitsById[item.itemId];
    if (h == null || !h.reminder.enabled || !seen.add(h.id)) continue;
    final ignored = ignoredInARow(nudgeHistory, h.id);
    if (ignored >= kIgnoredToMute) {
      muted.add(MutedNudge(
        itemId: h.id,
        ignoredInARow: ignored,
        suggestedMinute: bestCompletionMinute(logs, itemId: h.id),
      ));
      continue;
    }
    final body = (h.reminder.textAr != null && h.reminder.textEn != null)
        ? LocalizedText(ar: h.reminder.textAr!, en: h.reminder.textEn!)
        : engineText('nudgeAnchoredBody');
    anchored.add(mk(NudgeKind.anchored, (item.startMinute! + h.reminder.offsetMin).clamp(0, 1439), item.title, body, h.id));
  }

  final droppedQuiet = <ScheduledNudge>[];
  final droppedFocus = <ScheduledNudge>[];
  bool keep(ScheduledNudge n) {
    if (nowMinute != null && n.minute <= nowMinute) return false;
    if (quiet(n.minute)) {
      droppedQuiet.add(n);
      return false;
    }
    if (inFocus(n.minute)) {
      droppedFocus.add(n);
      return false;
    }
    return true;
  }

  final fixed = [morning, evening, ?duesNudge].where(keep).toList();
  final anchoredKept = anchored.where(keep).toList()..sort((a, b) => a.minute.compareTo(b.minute));

  // Priority: Morning Brief, Evening Shutdown, today's dues, then anchored
  // (at most cap − 2, and only in the room the cap leaves).
  final result = <ScheduledNudge>[];
  final droppedCap = <ScheduledNudge>[];
  for (final n in fixed) {
    if (result.length < cap) {
      result.add(n);
    } else {
      droppedCap.add(n);
    }
  }
  final anchoredRoom = (cap - result.length).clamp(0, cap - 2 < 0 ? 0 : cap - 2);
  for (var i = 0; i < anchoredKept.length; i++) {
    if (i < anchoredRoom) {
      result.add(anchoredKept[i]);
    } else {
      droppedCap.add(anchoredKept[i]);
    }
  }
  result.sort((a, b) => a.minute.compareTo(b.minute));
  return ReminderPlan(
    nudges: result,
    muted: muted,
    droppedForQuiet: droppedQuiet,
    droppedForFocus: droppedFocus,
    droppedForCap: droppedCap,
  );
}

/// What she tapped on a notification.
enum NudgeActionType { open, done, snooze, skip }

class NudgeAction {
  const NudgeAction({required this.type, required this.payload});

  final NudgeActionType type;
  final NudgePayload? payload;
}

/// Platform notification port. Implementations: iOS
/// (`flutter_local_notifications`) and a web/test no-op.
abstract class NotificationService {
  /// Registers categories/actions. [onAction] receives taps & action buttons
  /// while the app is running.
  Future<void> init({void Function(NudgeAction action)? onAction});

  /// Asks for permission (iOS). Returns true if granted.
  Future<bool> requestPermission();

  /// Replaces today's scheduled nudges with [nudges] (in [language]).
  Future<void> scheduleDay(List<ScheduledNudge> nudges, {required AppLanguage language, required String timeZoneName});

  /// Snoozes [payload] by [kSnoozeMinutes].
  Future<void> snooze(ScheduledNudge nudge, {required AppLanguage language, required String timeZoneName});

  Future<void> cancelAll();
}

/// No-op implementation (web preview, tests).
class NoopNotificationService implements NotificationService {
  final List<ScheduledNudge> scheduled = [];

  @override
  Future<void> init({void Function(NudgeAction action)? onAction}) async {}

  @override
  Future<bool> requestPermission() async => false;

  @override
  Future<void> scheduleDay(List<ScheduledNudge> nudges, {required AppLanguage language, required String timeZoneName}) async {
    scheduled
      ..clear()
      ..addAll(nudges);
  }

  @override
  Future<void> snooze(ScheduledNudge nudge, {required AppLanguage language, required String timeZoneName}) async {}

  @override
  Future<void> cancelAll() async => scheduled.clear();
}
