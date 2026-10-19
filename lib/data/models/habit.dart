import 'enums.dart';
import 'json_utils.dart';

/// Where in the day a behaviour is cued (ENG-01). Resolved to a clock time by
/// `engine/anchors.dart`.
class CueAnchor {
  const CueAnchor({
    required this.type,
    this.minute,
    this.prayer,
    this.slot = Slot.anytime,
    this.offsetMin = 0,
  });

  /// Anchored to a coarse slot (default times from `AnchorResolver`).
  const CueAnchor.slot(Slot s)
      : type = AnchorType.slot,
        minute = null,
        prayer = null,
        slot = s,
        offsetMin = 0;

  /// Fixed clock time (minutes since midnight).
  const CueAnchor.at(int m)
      : type = AnchorType.fixedTime,
        minute = m,
        prayer = null,
        slot = Slot.anytime,
        offsetMin = 0;

  factory CueAnchor.fromJson(Json j) => CueAnchor(
        type: enumFromName(AnchorType.values, j['type'], AnchorType.slot),
        minute: jIntN(j, 'minute'),
        prayer: j['prayer'] == null ? null : enumFromName(PrayerAnchor.values, j['prayer'], PrayerAnchor.fajr),
        slot: enumFromName(Slot.values, j['slot'], Slot.anytime),
        offsetMin: jInt(j, 'offsetMin'),
      );

  final AnchorType type;

  /// For [AnchorType.fixedTime].
  final int? minute;

  /// For [AnchorType.prayer]; falls back to [slot] when prayer anchors are off.
  final PrayerAnchor? prayer;

  /// Coarse slot; also the fallback for prayer anchors.
  final Slot slot;

  /// Minutes after (+) or before (−) the anchor event.
  final int offsetMin;

  CueAnchor copyWith({AnchorType? type, int? minute, PrayerAnchor? prayer, Slot? slot, int? offsetMin}) =>
      CueAnchor(
        type: type ?? this.type,
        minute: minute ?? this.minute,
        prayer: prayer ?? this.prayer,
        slot: slot ?? this.slot,
        offsetMin: offsetMin ?? this.offsetMin,
      );

  Json toJson() => {
        'type': type.name,
        'minute': minute,
        'prayer': prayer?.name,
        'slot': slot.name,
        'offsetMin': offsetMin,
      };
}

/// When a habit is planned.
class HabitSchedule {
  const HabitSchedule({
    this.weekdays = const [1, 2, 3, 4, 5, 6, 7],
    this.anchor = const CueAnchor.slot(Slot.anytime),
  });

  factory HabitSchedule.fromJson(Json j) => HabitSchedule(
        weekdays: jIntList(j, 'weekdays'),
        anchor: CueAnchor.fromJson(jMap(j, 'anchor')),
      );

  /// [DateTime.weekday] values (1 = Monday … 7 = Sunday).
  final List<int> weekdays;
  final CueAnchor anchor;

  bool isPlannedOn(DateTime day) => weekdays.contains(day.weekday);

  HabitSchedule copyWith({List<int>? weekdays, CueAnchor? anchor}) =>
      HabitSchedule(weekdays: weekdays ?? this.weekdays, anchor: anchor ?? this.anchor);

  Json toJson() => {'weekdays': weekdays, 'anchor': anchor.toJson()};
}

/// Per-habit reminder (ENG-15: at most one reminder, tied to its cue).
class HabitReminder {
  const HabitReminder({this.enabled = false, this.offsetMin = 0, this.textAr, this.textEn});

  factory HabitReminder.fromJson(Json j) => HabitReminder(
        enabled: jBool(j, 'enabled'),
        offsetMin: jInt(j, 'offsetMin'),
        textAr: jStrN(j, 'textAr'),
        textEn: jStrN(j, 'textEn'),
      );

  final bool enabled;

  /// Minutes relative to the resolved cue time.
  final int offsetMin;

  /// Her own words (optional).
  final String? textAr;
  final String? textEn;

  Json toJson() => {'enabled': enabled, 'offsetMin': offsetMin, 'textAr': textAr, 'textEn': textEn};
}

/// A repeated behaviour designed to become automatic (spec §3, Habit Studio).
///
/// Whether a habit is *Core* for the planner is decided by its domain being in
/// Grow — not by [priority], which is the evidence priority from the library.
class Habit {
  const Habit({
    required this.id,
    required this.domain,
    required this.titleAr,
    required this.titleEn,
    this.actionId,
    this.goal = '',
    this.cue = '',
    this.ifThen = '',
    this.minimumText = '',
    this.normalText = '',
    this.bonusText = '',
    this.joyPairing = '',
    this.frictionDown = '',
    this.frictionUp = '',
    this.reminder = const HabitReminder(),
    this.priority = Priority.recommended,
    this.schedule = const HabitSchedule(),
    this.durationMin = 10,
    this.minimumDurationMin = 5,
    this.minimumDurationEstimated = false,
    this.durationEstimated = false,
    this.status = HabitStatus.active,
    this.routineId,
    this.alternationGroup,
    this.essential = false,
    this.shrunkToMinimum = false,
    this.comebackPending = false,
    this.sortOrder = 0,
    this.createdDate,
  });

  factory Habit.fromJson(Json j) => Habit(
        id: jStr(j, 'id'),
        domain: enumFromName(DomainId.values, j['domain'], DomainId.joy),
        titleAr: jStr(j, 'titleAr'),
        titleEn: jStr(j, 'titleEn'),
        actionId: jStrN(j, 'actionId'),
        goal: jStr(j, 'goal'),
        cue: jStr(j, 'cue'),
        ifThen: jStr(j, 'ifThen'),
        minimumText: jStr(j, 'minimumText'),
        normalText: jStr(j, 'normalText'),
        bonusText: jStr(j, 'bonusText'),
        joyPairing: jStr(j, 'joyPairing'),
        frictionDown: jStr(j, 'frictionDown'),
        frictionUp: jStr(j, 'frictionUp'),
        reminder: HabitReminder.fromJson(jMap(j, 'reminder')),
        priority: enumFromName(Priority.values, j['priority'], Priority.recommended),
        schedule: HabitSchedule.fromJson(jMap(j, 'schedule')),
        durationMin: jInt(j, 'durationMin', 10),
        minimumDurationMin: jInt(j, 'minimumDurationMin', 5),
        minimumDurationEstimated: jBool(j, 'minimumDurationEstimated'),
        durationEstimated: jBool(j, 'durationEstimated'),
        status: enumFromName(HabitStatus.values, j['status'], HabitStatus.active),
        routineId: jStrN(j, 'routineId'),
        alternationGroup: jStrN(j, 'alternationGroup'),
        essential: jBool(j, 'essential'),
        shrunkToMinimum: jBool(j, 'shrunkToMinimum'),
        comebackPending: jBool(j, 'comebackPending'),
        sortOrder: jInt(j, 'sortOrder'),
        createdDate: jStrN(j, 'createdDate'),
      );

  final String id;
  final DomainId domain;
  final String titleAr;
  final String titleEn;

  /// Evidence link into the Action Library (Why-sheet).
  final String? actionId;

  /// Her "why" in her own words.
  final String goal;

  /// Human description of the cue (e.g. "After Maghrib").
  final String cue;
  final String ifThen;
  final String minimumText;
  final String normalText;
  final String bonusText;
  final String joyPairing;
  final String frictionDown;
  final String frictionUp;
  final HabitReminder reminder;
  final Priority priority;
  final HabitSchedule schedule;

  /// Estimated minutes for the normal version (learned values override).
  final int durationMin;

  /// Minutes for the minimum version. 0 = not set yet (she is asked in the
  /// Studio; nothing is invented — spec rule "no invented numbers").
  final int minimumDurationMin;

  /// True when [minimumDurationMin] is not stated by the Action Library
  /// (a user-editable planning estimate). The Why sheet labels it «تقدير».
  final bool minimumDurationEstimated;

  /// True when [durationMin] is a planning estimate (the library's dose says
  /// "not specified by source"). Today / Why label it «تقدير» (QA D07).
  final bool durationEstimated;
  final HabitStatus status;

  /// If set, this habit is a step of that routine (chain) rather than a
  /// standalone plan item.
  final String? routineId;

  /// Habits sharing a group alternate: at most one per day (e.g. walk vs
  /// strength, BODY-01/05).
  final String? alternationGroup;

  /// Kept on Red days (sleep / care essentials).
  final bool essential;

  /// Recovery "too big" → planner suggests minimum even on Green days.
  final bool shrunkToMinimum;

  /// Set when a recovery design change is accepted; next completion earns
  /// the Comeback Spark bonus, then it is cleared.
  final bool comebackPending;
  final int sortOrder;

  /// Day key of creation; days before it are never counted as planned.
  final String? createdDate;

  bool get isActive => status == HabitStatus.active;

  Habit copyWith({
    DomainId? domain,
    String? titleAr,
    String? titleEn,
    String? goal,
    String? cue,
    String? ifThen,
    String? minimumText,
    String? normalText,
    String? bonusText,
    String? joyPairing,
    String? frictionDown,
    String? frictionUp,
    HabitReminder? reminder,
    Priority? priority,
    HabitSchedule? schedule,
    int? durationMin,
    int? minimumDurationMin,
    bool? minimumDurationEstimated,
    bool? durationEstimated,
    HabitStatus? status,
    String? routineId,
    bool clearRoutine = false,
    String? alternationGroup,
    bool? essential,
    bool? shrunkToMinimum,
    bool? comebackPending,
    int? sortOrder,
    String? createdDate,
  }) =>
      Habit(
        id: id,
        domain: domain ?? this.domain,
        titleAr: titleAr ?? this.titleAr,
        titleEn: titleEn ?? this.titleEn,
        actionId: actionId,
        goal: goal ?? this.goal,
        cue: cue ?? this.cue,
        ifThen: ifThen ?? this.ifThen,
        minimumText: minimumText ?? this.minimumText,
        normalText: normalText ?? this.normalText,
        bonusText: bonusText ?? this.bonusText,
        joyPairing: joyPairing ?? this.joyPairing,
        frictionDown: frictionDown ?? this.frictionDown,
        frictionUp: frictionUp ?? this.frictionUp,
        reminder: reminder ?? this.reminder,
        priority: priority ?? this.priority,
        schedule: schedule ?? this.schedule,
        durationMin: durationMin ?? this.durationMin,
        minimumDurationMin: minimumDurationMin ?? this.minimumDurationMin,
        minimumDurationEstimated: minimumDurationEstimated ?? this.minimumDurationEstimated,
        durationEstimated: durationEstimated ?? this.durationEstimated,
        status: status ?? this.status,
        routineId: clearRoutine ? null : (routineId ?? this.routineId),
        alternationGroup: alternationGroup ?? this.alternationGroup,
        essential: essential ?? this.essential,
        shrunkToMinimum: shrunkToMinimum ?? this.shrunkToMinimum,
        comebackPending: comebackPending ?? this.comebackPending,
        sortOrder: sortOrder ?? this.sortOrder,
        createdDate: createdDate ?? this.createdDate,
      );

  Json toJson() => {
        'id': id,
        'domain': domain.name,
        'titleAr': titleAr,
        'titleEn': titleEn,
        'actionId': actionId,
        'goal': goal,
        'cue': cue,
        'ifThen': ifThen,
        'minimumText': minimumText,
        'normalText': normalText,
        'bonusText': bonusText,
        'joyPairing': joyPairing,
        'frictionDown': frictionDown,
        'frictionUp': frictionUp,
        'reminder': reminder.toJson(),
        'priority': priority.name,
        'schedule': schedule.toJson(),
        'durationMin': durationMin,
        'minimumDurationMin': minimumDurationMin,
        'minimumDurationEstimated': minimumDurationEstimated,
        'durationEstimated': durationEstimated,
        'status': status.name,
        'routineId': routineId,
        'alternationGroup': alternationGroup,
        'essential': essential,
        'shrunkToMinimum': shrunkToMinimum,
        'comebackPending': comebackPending,
        'sortOrder': sortOrder,
        'createdDate': createdDate,
      };
}
