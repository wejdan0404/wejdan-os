import 'enums.dart';
import 'habit.dart';
import 'json_utils.dart';

/// One step of a chain. Either references a [Habit] (`habitId`) — the habit
/// then supplies texts/durations and completion is logged against the habit —
/// or is a standalone step logged against the step id.
class RoutineStep {
  const RoutineStep({
    required this.id,
    this.habitId,
    this.titleAr = '',
    this.titleEn = '',
    this.actionId,
    this.domain = DomainId.care,
    this.minimumText = '',
    this.normalText = '',
    this.durationMin = 5,
    this.minimumDurationMin = 2,
    this.essential = false,
  });

  factory RoutineStep.fromJson(Json j) => RoutineStep(
        id: jStr(j, 'id'),
        habitId: jStrN(j, 'habitId'),
        titleAr: jStr(j, 'titleAr'),
        titleEn: jStr(j, 'titleEn'),
        actionId: jStrN(j, 'actionId'),
        domain: enumFromName(DomainId.values, j['domain'], DomainId.care),
        minimumText: jStr(j, 'minimumText'),
        normalText: jStr(j, 'normalText'),
        durationMin: jInt(j, 'durationMin', 5),
        minimumDurationMin: jInt(j, 'minimumDurationMin', 2),
        essential: jBool(j, 'essential'),
      );

  final String id;
  final String? habitId;
  final String titleAr;
  final String titleEn;
  final String? actionId;
  final DomainId domain;
  final String minimumText;
  final String normalText;
  final int durationMin;
  final int minimumDurationMin;

  /// Kept on Red days.
  final bool essential;

  Json toJson() => {
        'id': id,
        'habitId': habitId,
        'titleAr': titleAr,
        'titleEn': titleEn,
        'actionId': actionId,
        'domain': domain.name,
        'minimumText': minimumText,
        'normalText': normalText,
        'durationMin': durationMin,
        'minimumDurationMin': minimumDurationMin,
        'essential': essential,
      };
}

/// An ordered chain started by one cue (Morning, Night, Workout, Study).
class Routine {
  const Routine({
    required this.id,
    required this.titleAr,
    required this.titleEn,
    required this.section,
    required this.anchor,
    this.steps = const [],
    this.weekdays = const [1, 2, 3, 4, 5, 6, 7],
    this.active = true,
  });

  factory Routine.fromJson(Json j) => Routine(
        id: jStr(j, 'id'),
        titleAr: jStr(j, 'titleAr'),
        titleEn: jStr(j, 'titleEn'),
        section: enumFromName(PlanSection.values, j['section'], PlanSection.day),
        anchor: CueAnchor.fromJson(jMap(j, 'anchor')),
        steps: jList(j, 'steps', RoutineStep.fromJson),
        weekdays: jIntList(j, 'weekdays'),
        active: jBool(j, 'active', true),
      );

  final String id;
  final String titleAr;
  final String titleEn;

  /// Morning chain / Evening chain / day block.
  final PlanSection section;
  final CueAnchor anchor;
  final List<RoutineStep> steps;
  final List<int> weekdays;
  final bool active;

  Routine copyWith({
    String? titleAr,
    String? titleEn,
    CueAnchor? anchor,
    List<RoutineStep>? steps,
    List<int>? weekdays,
    bool? active,
  }) =>
      Routine(
        id: id,
        titleAr: titleAr ?? this.titleAr,
        titleEn: titleEn ?? this.titleEn,
        section: section,
        anchor: anchor ?? this.anchor,
        steps: steps ?? this.steps,
        weekdays: weekdays ?? this.weekdays,
        active: active ?? this.active,
      );

  Json toJson() => {
        'id': id,
        'titleAr': titleAr,
        'titleEn': titleEn,
        'section': section.name,
        'anchor': anchor.toJson(),
        'steps': steps.map((s) => s.toJson()).toList(),
        'weekdays': weekdays,
        'active': active,
      };
}
