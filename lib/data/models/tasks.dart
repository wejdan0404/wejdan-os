import 'enums.dart';
import 'habit.dart';
import 'json_utils.dart';

/// Recurring non-daily task (meal plan, IELTS writing, admin, weekly review).
class WeeklyTask {
  const WeeklyTask({
    required this.id,
    required this.domain,
    required this.titleAr,
    required this.titleEn,
    this.actionId,
    this.minimumText = '',
    this.normalText = '',
    this.durationMin = 30,
    this.minimumDurationMin = 10,
    this.preferredWeekdays = const [],
    this.anchor = const CueAnchor.slot(Slot.anytime),
    this.timesPerWeek = 1,
    this.pinned = false,
    this.isWeeklyReview = false,
    this.active = true,
    this.sortOrder = 0,
  });

  factory WeeklyTask.fromJson(Json j) => WeeklyTask(
        id: jStr(j, 'id'),
        domain: enumFromName(DomainId.values, j['domain'], DomainId.admin),
        titleAr: jStr(j, 'titleAr'),
        titleEn: jStr(j, 'titleEn'),
        actionId: jStrN(j, 'actionId'),
        minimumText: jStr(j, 'minimumText'),
        normalText: jStr(j, 'normalText'),
        durationMin: jInt(j, 'durationMin', 30),
        minimumDurationMin: jInt(j, 'minimumDurationMin', 10),
        preferredWeekdays: jIntList(j, 'preferredWeekdays'),
        anchor: CueAnchor.fromJson(jMap(j, 'anchor')),
        timesPerWeek: jInt(j, 'timesPerWeek', 1),
        pinned: jBool(j, 'pinned'),
        isWeeklyReview: jBool(j, 'isWeeklyReview'),
        active: jBool(j, 'active', true),
        sortOrder: jInt(j, 'sortOrder'),
      );

  final String id;
  final DomainId domain;
  final String titleAr;
  final String titleEn;
  final String? actionId;
  final String minimumText;
  final String normalText;
  final int durationMin;
  final int minimumDurationMin;

  /// [DateTime.weekday] values she prefers. Empty = any day this week.
  final List<int> preferredWeekdays;
  final CueAnchor anchor;
  final int timesPerWeek;

  /// She explicitly chose this task: shown even when its domain is in Rest.
  final bool pinned;

  /// The weekly review ritual (system tier; earns the weekly-review Sparks).
  final bool isWeeklyReview;
  final bool active;
  final int sortOrder;

  WeeklyTask copyWith({
    List<int>? preferredWeekdays,
    CueAnchor? anchor,
    int? timesPerWeek,
    bool? pinned,
    bool? active,
    int? durationMin,
  }) =>
      WeeklyTask(
        id: id,
        domain: domain,
        titleAr: titleAr,
        titleEn: titleEn,
        actionId: actionId,
        minimumText: minimumText,
        normalText: normalText,
        durationMin: durationMin ?? this.durationMin,
        minimumDurationMin: minimumDurationMin,
        preferredWeekdays: preferredWeekdays ?? this.preferredWeekdays,
        anchor: anchor ?? this.anchor,
        timesPerWeek: timesPerWeek ?? this.timesPerWeek,
        pinned: pinned ?? this.pinned,
        isWeeklyReview: isWeeklyReview,
        active: active ?? this.active,
        sortOrder: sortOrder,
      );

  Json toJson() => {
        'id': id,
        'domain': domain.name,
        'titleAr': titleAr,
        'titleEn': titleEn,
        'actionId': actionId,
        'minimumText': minimumText,
        'normalText': normalText,
        'durationMin': durationMin,
        'minimumDurationMin': minimumDurationMin,
        'preferredWeekdays': preferredWeekdays,
        'anchor': anchor.toJson(),
        'timesPerWeek': timesPerWeek,
        'pinned': pinned,
        'isWeeklyReview': isWeeklyReview,
        'active': active,
        'sortOrder': sortOrder,
      };
}

/// A step of a finite project.
class ProjectStep {
  const ProjectStep({
    required this.id,
    required this.titleAr,
    required this.titleEn,
    this.actionId,
    this.done = false,
    this.doneDate,
    this.durationMin = 30,
  });

  factory ProjectStep.fromJson(Json j) => ProjectStep(
        id: jStr(j, 'id'),
        titleAr: jStr(j, 'titleAr'),
        titleEn: jStr(j, 'titleEn'),
        actionId: jStrN(j, 'actionId'),
        done: jBool(j, 'done'),
        doneDate: jStrN(j, 'doneDate'),
        durationMin: jInt(j, 'durationMin', 30),
      );

  final String id;
  final String titleAr;
  final String titleEn;
  final String? actionId;
  final bool done;
  final String? doneDate;
  final int durationMin;

  ProjectStep copyWith({bool? done, String? doneDate}) => ProjectStep(
        id: id,
        titleAr: titleAr,
        titleEn: titleEn,
        actionId: actionId,
        done: done ?? this.done,
        doneDate: doneDate ?? this.doneDate,
        durationMin: durationMin,
      );

  Json toJson() => {
        'id': id,
        'titleAr': titleAr,
        'titleEn': titleEn,
        'actionId': actionId,
        'done': done,
        'doneDate': doneDate,
        'durationMin': durationMin,
      };
}

/// Finite piece of work with steps. Max 2 [ProjectStatus.active] (ENG-17);
/// max 1 active course (GROW-14).
class Project {
  const Project({
    required this.id,
    required this.domain,
    required this.titleAr,
    required this.titleEn,
    this.status = ProjectStatus.idea,
    this.goalId,
    this.isCourse = false,
    this.steps = const [],
    this.sortOrder = 0,
  });

  factory Project.fromJson(Json j) => Project(
        id: jStr(j, 'id'),
        domain: enumFromName(DomainId.values, j['domain'], DomainId.learning),
        titleAr: jStr(j, 'titleAr'),
        titleEn: jStr(j, 'titleEn'),
        status: enumFromName(ProjectStatus.values, j['status'], ProjectStatus.idea),
        goalId: jStrN(j, 'goalId'),
        isCourse: jBool(j, 'isCourse'),
        steps: jList(j, 'steps', ProjectStep.fromJson),
        sortOrder: jInt(j, 'sortOrder'),
      );

  final String id;
  final DomainId domain;
  final String titleAr;
  final String titleEn;
  final ProjectStatus status;
  final String? goalId;
  final bool isCourse;
  final List<ProjectStep> steps;
  final int sortOrder;

  /// First step not done, or null when all are done.
  ProjectStep? get nextStep {
    for (final s in steps) {
      if (!s.done) return s;
    }
    return null;
  }

  double get progress => steps.isEmpty ? 0 : steps.where((s) => s.done).length / steps.length;

  Project copyWith({ProjectStatus? status, List<ProjectStep>? steps, String? goalId}) => Project(
        id: id,
        domain: domain,
        titleAr: titleAr,
        titleEn: titleEn,
        status: status ?? this.status,
        goalId: goalId ?? this.goalId,
        isCourse: isCourse,
        steps: steps ?? this.steps,
        sortOrder: sortOrder,
      );

  Json toJson() => {
        'id': id,
        'domain': domain.name,
        'titleAr': titleAr,
        'titleEn': titleEn,
        'status': status.name,
        'goalId': goalId,
        'isCourse': isCourse,
        'steps': steps.map((s) => s.toJson()).toList(),
        'sortOrder': sortOrder,
      };
}

/// A goal milestone placed on the year roadmap by *quarter* only
/// (Q1 = Oct–Dec 2026, Q2 = Jan–Mar 2027, Q3 = Apr–Jun 2027,
/// Q4 = Jul–Sep 2027; spec §11). No hardcoded dates.
class Milestone {
  const Milestone({
    required this.id,
    required this.titleAr,
    required this.titleEn,
    required this.quarter,
    this.done = false,
    this.doneDate,
    this.rewardJoyId,
  });

  factory Milestone.fromJson(Json j) => Milestone(
        id: jStr(j, 'id'),
        titleAr: jStr(j, 'titleAr'),
        titleEn: jStr(j, 'titleEn'),
        quarter: jInt(j, 'quarter', 1),
        done: jBool(j, 'done'),
        doneDate: jStrN(j, 'doneDate'),
        rewardJoyId: jStrN(j, 'rewardJoyId'),
      );

  final String id;
  final String titleAr;
  final String titleEn;

  /// Roadmap quarter 1–4.
  final int quarter;
  final bool done;
  final String? doneDate;
  final String? rewardJoyId;

  Milestone copyWith({bool? done, String? doneDate, String? rewardJoyId}) => Milestone(
        id: id,
        titleAr: titleAr,
        titleEn: titleEn,
        quarter: quarter,
        done: done ?? this.done,
        doneDate: doneDate ?? this.doneDate,
        rewardJoyId: rewardJoyId ?? this.rewardJoyId,
      );

  Json toJson() => {
        'id': id,
        'titleAr': titleAr,
        'titleEn': titleEn,
        'quarter': quarter,
        'done': done,
        'doneDate': doneDate,
        'rewardJoyId': rewardJoyId,
      };
}

/// Outcome with milestones. Never a daily checkbox — it drives habits/projects.
class Goal {
  const Goal({
    required this.id,
    required this.domain,
    required this.titleAr,
    required this.titleEn,
    this.targetNote = '',
    this.milestones = const [],
    this.linkedHabitIds = const [],
    this.linkedProjectIds = const [],
    this.sortOrder = 0,
  });

  factory Goal.fromJson(Json j) => Goal(
        id: jStr(j, 'id'),
        domain: enumFromName(DomainId.values, j['domain'], DomainId.career),
        titleAr: jStr(j, 'titleAr'),
        titleEn: jStr(j, 'titleEn'),
        targetNote: jStr(j, 'targetNote'),
        milestones: jList(j, 'milestones', Milestone.fromJson),
        linkedHabitIds: jStrList(j, 'linkedHabitIds'),
        linkedProjectIds: jStrList(j, 'linkedProjectIds'),
        sortOrder: jInt(j, 'sortOrder'),
      );

  final String id;
  final DomainId domain;
  final String titleAr;
  final String titleEn;

  /// Her own target (e.g. band she sets) — empty by default, never invented.
  final String targetNote;
  final List<Milestone> milestones;
  final List<String> linkedHabitIds;
  final List<String> linkedProjectIds;
  final int sortOrder;

  double get progress =>
      milestones.isEmpty ? 0 : milestones.where((m) => m.done).length / milestones.length;

  Goal copyWith({
    String? targetNote,
    List<Milestone>? milestones,
    List<String>? linkedHabitIds,
    List<String>? linkedProjectIds,
  }) =>
      Goal(
        id: id,
        domain: domain,
        titleAr: titleAr,
        titleEn: titleEn,
        targetNote: targetNote ?? this.targetNote,
        milestones: milestones ?? this.milestones,
        linkedHabitIds: linkedHabitIds ?? this.linkedHabitIds,
        linkedProjectIds: linkedProjectIds ?? this.linkedProjectIds,
        sortOrder: sortOrder,
      );

  Json toJson() => {
        'id': id,
        'domain': domain.name,
        'titleAr': titleAr,
        'titleEn': titleEn,
        'targetNote': targetNote,
        'milestones': milestones.map((m) => m.toJson()).toList(),
        'linkedHabitIds': linkedHabitIds,
        'linkedProjectIds': linkedProjectIds,
        'sortOrder': sortOrder,
      };
}
