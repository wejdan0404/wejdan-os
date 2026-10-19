import 'enums.dart';
import 'json_utils.dart';

/// One completion (or explicit skip) of a plan item (spec §5.2).
class LogEntry {
  const LogEntry({
    required this.id,
    required this.itemId,
    required this.kind,
    required this.date,
    required this.level,
    this.durationMin,
    this.enjoyment,
    this.note,
    this.loggedAt,
    this.minuteOfDay,
  });

  factory LogEntry.fromJson(Json j) => LogEntry(
        id: jStr(j, 'id'),
        itemId: jStr(j, 'itemId'),
        kind: enumFromName(PlanItemKind.values, j['kind'], PlanItemKind.habit),
        date: jStr(j, 'date'),
        level: enumFromName(CompletionLevel.values, j['level'], CompletionLevel.minimum),
        durationMin: jIntN(j, 'durationMin'),
        enjoyment: jIntN(j, 'enjoyment'),
        note: jStrN(j, 'note'),
        loggedAt: jDate(j, 'loggedAt'),
        minuteOfDay: jIntN(j, 'minuteOfDay'),
      );

  final String id;
  final String itemId;
  final PlanItemKind kind;

  /// Day key the completion counts for.
  final String date;
  final CompletionLevel level;

  /// Actual minutes (feeds the planner's learned durations, ENG-18).
  final int? durationMin;

  /// 1–5, optional (experiments, Joy insights).
  final int? enjoyment;
  final String? note;
  final DateTime? loggedAt;

  /// When she completed it (feeds "better time" suggestions).
  final int? minuteOfDay;

  bool get isDone => level.isDone;

  Json toJson() => {
        'id': id,
        'itemId': itemId,
        'kind': kind.name,
        'date': date,
        'level': level.name,
        'durationMin': durationMin,
        'enjoyment': enjoyment,
        'note': note,
        'loggedAt': loggedAt?.toIso8601String(),
        'minuteOfDay': minuteOfDay,
      };
}

/// Morning Brief energy tap.
class EnergyCheck {
  const EnergyCheck({required this.date, required this.mode, this.at});

  factory EnergyCheck.fromJson(Json j) => EnergyCheck(
        date: jStr(j, 'date'),
        mode: enumFromName(EnergyMode.values, j['mode'], EnergyMode.green),
        at: jDate(j, 'at'),
      );

  /// Day key; one per day (latest wins).
  final String date;
  final EnergyMode mode;
  final DateTime? at;

  Json toJson() => {'date': date, 'mode': mode.name, 'at': at?.toIso8601String()};
}

/// Weekly SRBAI check (ENG-04): 4 items, each 1–5.
class StrengthCheck {
  const StrengthCheck({
    required this.id,
    required this.habitId,
    required this.date,
    required this.items,
  });

  factory StrengthCheck.fromJson(Json j) => StrengthCheck(
        id: jStr(j, 'id'),
        habitId: jStr(j, 'habitId'),
        date: jStr(j, 'date'),
        items: jIntList(j, 'items'),
      );

  final String id;
  final String habitId;
  final String date;

  /// [automatically, withoutRemembering, withoutThinking, beforeRealizing].
  final List<int> items;

  Json toJson() => {'id': id, 'habitId': habitId, 'date': date, 'items': items};
}

/// Joy Map entry: Free Joy, Bundled Joy or Earned Reward (spec §6).
class JoyItem {
  const JoyItem({
    required this.id,
    required this.kind,
    required this.titleAr,
    required this.titleEn,
    this.size = JoySize.quick,
    this.price,
    this.bundledHabitId,
    this.costsMoney = false,
    this.keepFree = false,
    this.active = true,
  });

  factory JoyItem.fromJson(Json j) => JoyItem(
        id: jStr(j, 'id'),
        kind: enumFromName(JoyKind.values, j['kind'], JoyKind.free),
        titleAr: jStr(j, 'titleAr'),
        titleEn: jStr(j, 'titleEn'),
        size: enumFromName(JoySize.values, j['size'], JoySize.quick),
        price: jIntN(j, 'price'),
        bundledHabitId: jStrN(j, 'bundledHabitId'),
        costsMoney: jBool(j, 'costsMoney'),
        keepFree: jBool(j, 'keepFree'),
        active: jBool(j, 'active', true),
      );

  final String id;
  final JoyKind kind;
  final String titleAr;
  final String titleEn;
  final JoySize size;

  /// Spark price for [JoyKind.earned].
  final int? price;

  /// For [JoyKind.bundled]: the "should" habit this "want" is reserved for.
  final String? bundledHabitId;
  final bool costsMoney;

  /// Already-enjoyed activity kept unconditional (ENG-09 overjustification).
  final bool keepFree;
  final bool active;

  JoyItem copyWith({String? titleAr, String? titleEn, int? price, String? bundledHabitId, bool? active}) => JoyItem(
        id: id,
        kind: kind,
        titleAr: titleAr ?? this.titleAr,
        titleEn: titleEn ?? this.titleEn,
        size: size,
        price: price ?? this.price,
        bundledHabitId: bundledHabitId ?? this.bundledHabitId,
        costsMoney: costsMoney,
        keepFree: keepFree,
        active: active ?? this.active,
      );

  Json toJson() => {
        'id': id,
        'kind': kind.name,
        'titleAr': titleAr,
        'titleEn': titleEn,
        'size': size.name,
        'price': price,
        'bundledHabitId': bundledHabitId,
        'costsMoney': costsMoney,
        'keepFree': keepFree,
        'active': active,
      };
}

/// Sparks ledger entry (positive = earned, negative = spent/reversed).
class SparkTxn {
  const SparkTxn({
    required this.id,
    required this.date,
    required this.amount,
    required this.reason,
    this.refId,
    this.at,
  });

  factory SparkTxn.fromJson(Json j) => SparkTxn(
        id: jStr(j, 'id'),
        date: jStr(j, 'date'),
        amount: jInt(j, 'amount'),
        reason: enumFromName(SparkReason.values, j['reason'], SparkReason.adjustment),
        refId: jStrN(j, 'refId'),
        at: jDate(j, 'at'),
      );

  final String id;
  final String date;
  final int amount;
  final SparkReason reason;

  /// LogEntry id, JoyItem id, Experiment id…
  final String? refId;
  final DateTime? at;

  Json toJson() => {
        'id': id,
        'date': date,
        'amount': amount,
        'reason': reason.name,
        'refId': refId,
        'at': at?.toIso8601String(),
      };
}

/// N-of-1 experiment (ENG-21). Max 1 active.
class Experiment {
  const Experiment({
    required this.id,
    required this.habitId,
    required this.titleAr,
    required this.titleEn,
    required this.variable,
    this.status = ExperimentStatus.planned,
    this.startDate,
    this.endDate,
    this.lengthDays = 7,
  });

  factory Experiment.fromJson(Json j) => Experiment(
        id: jStr(j, 'id'),
        habitId: jStr(j, 'habitId'),
        titleAr: jStr(j, 'titleAr'),
        titleEn: jStr(j, 'titleEn'),
        variable: jStr(j, 'variable'),
        status: enumFromName(ExperimentStatus.values, j['status'], ExperimentStatus.planned),
        startDate: jStrN(j, 'startDate'),
        endDate: jStrN(j, 'endDate'),
        lengthDays: jInt(j, 'lengthDays', 7),
      );

  final String id;
  final String habitId;
  final String titleAr;
  final String titleEn;

  /// The one thing changed (free text, e.g. "IELTS at night instead of morning").
  final String variable;
  final ExperimentStatus status;
  final String? startDate;
  final String? endDate;

  /// Comparison window length (before vs after).
  final int lengthDays;

  Experiment copyWith({ExperimentStatus? status, String? startDate, String? endDate}) => Experiment(
        id: id,
        habitId: habitId,
        titleAr: titleAr,
        titleEn: titleEn,
        variable: variable,
        status: status ?? this.status,
        startDate: startDate ?? this.startDate,
        endDate: endDate ?? this.endDate,
        lengthDays: lengthDays,
      );

  Json toJson() => {
        'id': id,
        'habitId': habitId,
        'titleAr': titleAr,
        'titleEn': titleEn,
        'variable': variable,
        'status': status.name,
        'startDate': startDate,
        'endDate': endDate,
        'lengthDays': lengthDays,
      };
}

/// Response to a delivered notification (feeds adaptive muting).
class NudgeRecord {
  const NudgeRecord({required this.id, required this.itemId, required this.date, required this.response});

  factory NudgeRecord.fromJson(Json j) => NudgeRecord(
        id: jStr(j, 'id'),
        itemId: jStr(j, 'itemId'),
        date: jStr(j, 'date'),
        response: enumFromName(NudgeResponse.values, j['response'], NudgeResponse.ignored),
      );

  final String id;
  final String itemId;
  final String date;
  final NudgeResponse response;

  Json toJson() => {'id': id, 'itemId': itemId, 'date': date, 'response': response.name};
}
