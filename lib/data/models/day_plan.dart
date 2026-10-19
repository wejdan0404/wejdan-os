import 'enums.dart';
import 'json_utils.dart';
import 'localized_text.dart';

/// Explainable reasons the planner attaches to an item ("why today").
/// Templates for each code live in `engine/why_today.dart` and mirror the
/// ARB keys `why<Code>` in `lib/l10n/app_*.arb`.
enum WhyCode {
  growFocus,
  strengthDay,
  walkDay,
  ieltsRotation,
  vocabDue,
  comeback,
  maintainLight,
  chainStep,
  weeklyDue,
  weeklyCarried,
  weeklyReview,
  projectNext,
  freeJoy,
  redEssential,
  yellowMinimum,
  timeTrimmed,
}

/// A "why today" line: machine code + args + ready bilingual text.
class WhyToday {
  const WhyToday({required this.code, this.args = const {}, required this.text});

  factory WhyToday.fromJson(Json j) => WhyToday(
        code: enumFromName(WhyCode.values, j['code'], WhyCode.growFocus),
        args: jMap(j, 'args').map((k, v) => MapEntry(k, v.toString())),
        text: LocalizedText.fromJson(jMap(j, 'text')),
      );

  final WhyCode code;
  final Map<String, String> args;
  final LocalizedText text;

  Json toJson() => {'code': code.name, 'args': args, 'text': text.toJson()};
}

/// One actionable line of Today.
class PlanItem {
  const PlanItem({
    required this.id,
    required this.itemId,
    required this.kind,
    required this.tier,
    required this.section,
    required this.title,
    required this.domain,
    required this.why,
    this.extraWhy = const [],
    this.minimumText = '',
    this.normalText = '',
    this.bonusText = '',
    this.defaultLevel = CompletionLevel.minimum,
    this.suggestedLevel = CompletionLevel.normal,
    this.startMinute,
    this.estimatedMin = 0,
    this.actionId,
    this.routineId,
    this.bundleJoyId,
    this.bundleTitle,
    this.ieltsSkill,
    this.isComeback = false,
  });

  factory PlanItem.fromJson(Json j) => PlanItem(
        id: jStr(j, 'id'),
        itemId: jStr(j, 'itemId'),
        kind: enumFromName(PlanItemKind.values, j['kind'], PlanItemKind.habit),
        tier: enumFromName(PlanTier.values, j['tier'], PlanTier.maintain),
        section: enumFromName(PlanSection.values, j['section'], PlanSection.day),
        title: LocalizedText.fromJson(jMap(j, 'title')),
        domain: enumFromName(DomainId.values, j['domain'], DomainId.joy),
        why: WhyToday.fromJson(jMap(j, 'why')),
        extraWhy: jList(j, 'extraWhy', WhyToday.fromJson),
        minimumText: jStr(j, 'minimumText'),
        normalText: jStr(j, 'normalText'),
        bonusText: jStr(j, 'bonusText'),
        defaultLevel: enumFromName(CompletionLevel.values, j['defaultLevel'], CompletionLevel.minimum),
        suggestedLevel: enumFromName(CompletionLevel.values, j['suggestedLevel'], CompletionLevel.normal),
        startMinute: jIntN(j, 'startMinute'),
        estimatedMin: jInt(j, 'estimatedMin'),
        actionId: jStrN(j, 'actionId'),
        routineId: jStrN(j, 'routineId'),
        bundleJoyId: jStrN(j, 'bundleJoyId'),
        bundleTitle: j['bundleTitle'] == null ? null : LocalizedText.fromJson(jMap(j, 'bundleTitle')),
        ieltsSkill: j['ieltsSkill'] == null ? null : enumFromName(IeltsSkill.values, j['ieltsSkill'], IeltsSkill.reading),
        isComeback: jBool(j, 'isComeback'),
      );

  /// Unique within the plan (`<kind>:<itemId>`).
  final String id;

  /// Habit / step / weekly task / project step / joy id — used for logging.
  final String itemId;
  final PlanItemKind kind;
  final PlanTier tier;
  final PlanSection section;
  final LocalizedText title;
  final DomainId domain;
  final WhyToday why;
  final List<WhyToday> extraWhy;
  final String minimumText;
  final String normalText;
  final String bonusText;

  /// The "done" bar — always minimum (ENG-19).
  final CompletionLevel defaultLevel;

  /// What the plan suggests today (normal on Green; minimum on Yellow for
  /// non-core, on Red, or when shrunk / trimmed for time).
  final CompletionLevel suggestedLevel;

  /// Resolved start time, minutes since midnight.
  final int? startMinute;

  /// Minutes budgeted for [suggestedLevel] (learned from her history).
  final int estimatedMin;
  final String? actionId;
  final String? routineId;

  /// Bundled Joy (temptation bundle) shown on the start button.
  final String? bundleJoyId;
  final LocalizedText? bundleTitle;

  /// For the IELTS item: today's skill from the weekly rotation (GROW-12).
  final IeltsSkill? ieltsSkill;

  /// Comeback after a miss → Sparks ×2 on completion.
  final bool isComeback;

  PlanItem copyWith({
    PlanTier? tier,
    CompletionLevel? suggestedLevel,
    int? estimatedMin,
    int? startMinute,
    WhyToday? why,
    List<WhyToday>? extraWhy,
  }) =>
      PlanItem(
        id: id,
        itemId: itemId,
        kind: kind,
        tier: tier ?? this.tier,
        section: section,
        title: title,
        domain: domain,
        why: why ?? this.why,
        extraWhy: extraWhy ?? this.extraWhy,
        minimumText: minimumText,
        normalText: normalText,
        bonusText: bonusText,
        defaultLevel: defaultLevel,
        suggestedLevel: suggestedLevel ?? this.suggestedLevel,
        startMinute: startMinute ?? this.startMinute,
        estimatedMin: estimatedMin ?? this.estimatedMin,
        actionId: actionId,
        routineId: routineId,
        bundleJoyId: bundleJoyId,
        bundleTitle: bundleTitle,
        ieltsSkill: ieltsSkill,
        isComeback: isComeback,
      );

  Json toJson() => {
        'id': id,
        'itemId': itemId,
        'kind': kind.name,
        'tier': tier.name,
        'section': section.name,
        'title': title.toJson(),
        'domain': domain.name,
        'why': why.toJson(),
        'extraWhy': extraWhy.map((w) => w.toJson()).toList(),
        'minimumText': minimumText,
        'normalText': normalText,
        'bonusText': bonusText,
        'defaultLevel': defaultLevel.name,
        'suggestedLevel': suggestedLevel.name,
        'startMinute': startMinute,
        'estimatedMin': estimatedMin,
        'actionId': actionId,
        'routineId': routineId,
        'bundleJoyId': bundleJoyId,
        'bundleTitle': bundleTitle?.toJson(),
        'ieltsSkill': ieltsSkill?.name,
        'isComeback': isComeback,
      };
}

/// The led day (spec §5.1). Cached per day; regenerated when inputs change.
class DayPlan {
  const DayPlan({
    required this.date,
    required this.energy,
    required this.items,
    this.thisWeek = const [],
    this.deferred = const [],
    this.budgetMin = 0,
    this.usableMin = 0,
    this.plannedMin = 0,
    this.showHelpLink = false,
  });

  factory DayPlan.fromJson(Json j) => DayPlan(
        date: jStr(j, 'date'),
        energy: enumFromName(EnergyMode.values, j['energy'], EnergyMode.green),
        items: jList(j, 'items', PlanItem.fromJson),
        thisWeek: jList(j, 'thisWeek', PlanItem.fromJson),
        deferred: jList(j, 'deferred', PlanItem.fromJson),
        budgetMin: jInt(j, 'budgetMin'),
        usableMin: jInt(j, 'usableMin'),
        plannedMin: jInt(j, 'plannedMin'),
        showHelpLink: jBool(j, 'showHelpLink'),
      );

  /// Day key.
  final String date;
  final EnergyMode energy;

  /// Timeline items sorted by section then start time.
  final List<PlanItem> items;

  /// "This week" strip: weekly tasks due this week but not placed today.
  final List<PlanItem> thisWeek;

  /// Candidates that did not fit today's time budget (not shown as todo).
  final List<PlanItem> deferred;

  /// Free minutes she said she has today.
  final int budgetMin;

  /// budget × 0.7 (planning-fallacy buffer, ENG-18).
  final int usableMin;

  /// Sum of estimated minutes of timeline items (joy excluded).
  final int plannedMin;

  /// Red mode shows a subtle link to Help & Safety (JOY-13).
  final bool showHelpLink;

  List<PlanItem> itemsIn(PlanSection s) => items.where((i) => i.section == s).toList();
  List<PlanItem> itemsOfTier(PlanTier t) => items.where((i) => i.tier == t).toList();

  Json toJson() => {
        'date': date,
        'energy': energy.name,
        'items': items.map((i) => i.toJson()).toList(),
        'thisWeek': thisWeek.map((i) => i.toJson()).toList(),
        'deferred': deferred.map((i) => i.toJson()).toList(),
        'budgetMin': budgetMin,
        'usableMin': usableMin,
        'plannedMin': plannedMin,
        'showHelpLink': showHelpLink,
      };
}

/// A fixed calendar block she entered manually (spec §5.1).
class FixedEvent {
  const FixedEvent({
    required this.id,
    required this.title,
    required this.startMinute,
    required this.endMinute,
    this.date,
    this.weekdays = const [],
    this.isFocusBlock = false,
  });

  factory FixedEvent.fromJson(Json j) => FixedEvent(
        id: jStr(j, 'id'),
        title: jStr(j, 'title'),
        startMinute: jInt(j, 'startMinute'),
        endMinute: jInt(j, 'endMinute'),
        date: jStrN(j, 'date'),
        weekdays: jIntList(j, 'weekdays'),
        isFocusBlock: jBool(j, 'isFocusBlock'),
      );

  final String id;
  final String title;
  final int startMinute;
  final int endMinute;

  /// One-off day key, or null when recurring on [weekdays].
  final String? date;
  final List<int> weekdays;

  /// Focus blocks suppress nudges (spec §5.6).
  final bool isFocusBlock;

  bool occursOn(DateTime day, String key) => date != null ? date == key : weekdays.contains(day.weekday);

  Json toJson() => {
        'id': id,
        'title': title,
        'startMinute': startMinute,
        'endMinute': endMinute,
        'date': date,
        'weekdays': weekdays,
        'isFocusBlock': isFocusBlock,
      };
}
