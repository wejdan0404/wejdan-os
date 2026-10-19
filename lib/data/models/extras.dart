/// Models added in phase UI-2: hub module state, errands, cycle log and
/// weekly-review chapters. All optional for older exports (forgiving parse).
library;

import 'json_utils.dart';

/// Small per-module UI state stored as one document (meta `moduleState`).
/// Nothing here is an engine input; it only remembers her ticks and notes.
class ModuleState {
  const ModuleState({
    this.drivingStepsDone = const [],
    this.drivingServiceLink = '',
    this.ieltsFeedbackChecks = const [],
    this.homeZoneOffset = 0,
    this.autoSaveDay,
    this.autoSaveMinute = 9 * 60,
    this.freshStartDismissed,
    this.resetMinutes = 10,
  });

  factory ModuleState.fromJson(Json j) => ModuleState(
        drivingStepsDone: jIntList(j, 'drivingStepsDone'),
        drivingServiceLink: jStr(j, 'drivingServiceLink'),
        ieltsFeedbackChecks: jStrList(j, 'ieltsFeedbackChecks'),
        homeZoneOffset: jInt(j, 'homeZoneOffset'),
        autoSaveDay: jIntN(j, 'autoSaveDay'),
        autoSaveMinute: jInt(j, 'autoSaveMinute', 9 * 60),
        freshStartDismissed: jStrN(j, 'freshStartDismissed'),
        resetMinutes: jInt(j, 'resetMinutes', 10),
      );

  /// Indexes (0-based) of licence-path steps she ticked.
  final List<int> drivingStepsDone;

  /// Link she saved after confirming the official path (Absher / my.gov.sa).
  final String drivingServiceLink;

  /// Ticked feedback-checklist ids (e.g. `w_tr`, `s_fc`).
  final List<String> ieltsFeedbackChecks;

  /// "Next zone" taps shift the weekly zone rotation.
  final int homeZoneOffset;

  /// Day of month for the auto-save reminder (null = not set).
  final int? autoSaveDay;
  final int autoSaveMinute;

  /// Day key on which she dismissed the fresh-start card.
  final String? freshStartDismissed;

  /// Home reset timer length.
  final int resetMinutes;

  ModuleState copyWith({
    List<int>? drivingStepsDone,
    String? drivingServiceLink,
    List<String>? ieltsFeedbackChecks,
    int? homeZoneOffset,
    int? autoSaveDay,
    bool clearAutoSave = false,
    int? autoSaveMinute,
    String? freshStartDismissed,
    int? resetMinutes,
  }) =>
      ModuleState(
        drivingStepsDone: drivingStepsDone ?? this.drivingStepsDone,
        drivingServiceLink: drivingServiceLink ?? this.drivingServiceLink,
        ieltsFeedbackChecks: ieltsFeedbackChecks ?? this.ieltsFeedbackChecks,
        homeZoneOffset: homeZoneOffset ?? this.homeZoneOffset,
        autoSaveDay: clearAutoSave ? null : (autoSaveDay ?? this.autoSaveDay),
        autoSaveMinute: autoSaveMinute ?? this.autoSaveMinute,
        freshStartDismissed: freshStartDismissed ?? this.freshStartDismissed,
        resetMinutes: resetMinutes ?? this.resetMinutes,
      );

  Json toJson() => {
        'drivingStepsDone': drivingStepsDone,
        'drivingServiceLink': drivingServiceLink,
        'ieltsFeedbackChecks': ieltsFeedbackChecks,
        'homeZoneOffset': homeZoneOffset,
        'autoSaveDay': autoSaveDay,
        'autoSaveMinute': autoSaveMinute,
        'freshStartDismissed': freshStartDismissed,
        'resetMinutes': resetMinutes,
      };
}

/// One errand in the batch list (Home & Admin).
class Errand {
  const Errand({required this.id, required this.title, this.done = false, this.addedDate});

  factory Errand.fromJson(Json j) =>
      Errand(id: jStr(j, 'id'), title: jStr(j, 'title'), done: jBool(j, 'done'), addedDate: jStrN(j, 'addedDate'));

  final String id;
  final String title;
  final bool done;
  final String? addedDate;

  Errand copyWith({bool? done}) => Errand(id: id, title: title, done: done ?? this.done, addedDate: addedDate);

  Json toJson() => {'id': id, 'title': title, 'done': done, 'addedDate': addedDate};
}

/// Private cycle log entry (sensitive module, local only, no predictions or
/// diagnosis). [kind]: `start`, `end`, `note`.
class CycleEntry {
  const CycleEntry({required this.id, required this.date, required this.kind, this.note = ''});

  factory CycleEntry.fromJson(Json j) =>
      CycleEntry(id: jStr(j, 'id'), date: jStr(j, 'date'), kind: jStr(j, 'kind', 'note'), note: jStr(j, 'note'));

  final String id;
  final String date;
  final String kind;
  final String note;

  Json toJson() => {'id': id, 'date': date, 'kind': kind, 'note': note};
}

/// A closed weekly review = one chapter (spec §6.8, §7.12).
class WeeklyReviewRecord {
  const WeeklyReviewRecord({
    required this.id,
    required this.date,
    this.chapterTitle = '',
    this.wins = const [],
    this.blockers = const [],
    this.top3 = const [],
    this.experimentId,
    this.durationSec,
  });

  factory WeeklyReviewRecord.fromJson(Json j) => WeeklyReviewRecord(
        id: jStr(j, 'id'),
        date: jStr(j, 'date'),
        chapterTitle: jStr(j, 'chapterTitle'),
        wins: jStrList(j, 'wins'),
        blockers: jStrList(j, 'blockers'),
        top3: jStrList(j, 'top3'),
        experimentId: jStrN(j, 'experimentId'),
        durationSec: jIntN(j, 'durationSec'),
      );

  /// Week key = day key of the week start (one chapter per week).
  final String id;

  /// Day key the review was closed.
  final String date;
  final String chapterTitle;
  final List<String> wins;

  /// `MissReason` names she picked in "what got in the way".
  final List<String> blockers;

  /// Next week's top 3.
  final List<String> top3;
  final String? experimentId;

  /// Measured time spent in the review (Insights → system burden).
  final int? durationSec;

  Json toJson() => {
        'id': id,
        'date': date,
        'chapterTitle': chapterTitle,
        'wins': wins,
        'blockers': blockers,
        'top3': top3,
        'experimentId': experimentId,
        'durationSec': durationSec,
      };
}
