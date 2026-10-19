import 'enums.dart';
import 'json_utils.dart';

/// Localisable text fields of an [Action] (and the subset used by rules).
enum ActionField {
  cardTitle,
  cardMeta,
  whyShort,
  what,
  dose,
  why,
  cue,
  minimum,
  normal,
  bonus,
  joy,
  frictionDown,
  frictionUp,
  ifThen,
  metric,
  safety,
}

/// Arabic content for one action / engine rule
/// (`assets/data/actions_ar.json`, keyed by `action_id`). All optional:
/// engine rules only carry card title, what, why and safety.
class ActionAr {
  const ActionAr(this.fields);

  factory ActionAr.fromJson(Json j) => ActionAr({
        for (final e in _keys.entries)
          if (j[e.value] is String && (j[e.value] as String).trim().isNotEmpty) e.key: (j[e.value] as String).trim(),
      });

  static const _keys = <ActionField, String>{
    ActionField.cardTitle: 'card_title_ar',
    ActionField.cardMeta: 'card_meta_ar',
    ActionField.whyShort: 'why_short_ar',
    ActionField.what: 'what_ar',
    ActionField.dose: 'dose_ar',
    ActionField.why: 'why_ar',
    ActionField.cue: 'cue_ar',
    ActionField.minimum: 'minimum_ar',
    ActionField.normal: 'normal_ar',
    ActionField.bonus: 'bonus_ar',
    ActionField.joy: 'joy_ar',
    ActionField.frictionDown: 'friction_down_ar',
    ActionField.frictionUp: 'friction_up_ar',
    ActionField.ifThen: 'if_then_ar',
    ActionField.metric: 'metric_ar',
    ActionField.safety: 'safety_ar',
  };

  final Map<ActionField, String> fields;

  String? operator [](ActionField f) => fields[f];

  Json toJson() => {for (final e in fields.entries) _keys[e.key]!: e.value};
}

/// «لا ينطبق» / "n/a" values are hidden in the UI (a field that does not
/// apply is not shown at all).
bool isNotApplicable(String? v) {
  if (v == null) return true;
  final t = v.trim();
  if (t.isEmpty) return true;
  final lower = t.toLowerCase();
  return t.startsWith('لا ينطبق') || lower == 'n/a' || lower.startsWith('n/a ') || lower.startsWith('n/a(');
}

/// A verified source attached to an action or engine rule.
class EvidenceSource {
  const EvidenceSource({
    required this.type,
    required this.id,
    required this.title,
    this.year,
    this.verifiedBy,
  });

  factory EvidenceSource.fromJson(Json j) => EvidenceSource(
        type: jStr(j, 'type'),
        id: jStr(j, 'id'),
        title: jStr(j, 'title'),
        year: jIntN(j, 'year'),
        verifiedBy: jStrN(j, 'verified_by'),
      );

  /// `PMID`, `DOI` or `URL`.
  final String type;
  final String id;
  final String title;
  final int? year;
  final String? verifiedBy;

  /// Openable link for the Why-sheet.
  String get url {
    switch (type) {
      case 'PMID':
        return 'https://pubmed.ncbi.nlm.nih.gov/$id/';
      case 'DOI':
        return 'https://doi.org/$id';
      default:
        return id;
    }
  }

  Json toJson() => {
        'type': type,
        'id': id,
        'title': title,
        'year': year,
        'verified_by': verifiedBy,
      };
}

/// Read-only evidence-based action from `assets/data/actions.json`.
/// JSON keys mirror the seed file exactly (snake_case).
class Action {
  const Action({
    required this.actionId,
    required this.area,
    required this.nameAr,
    required this.nameEn,
    required this.what,
    required this.dose,
    required this.why,
    required this.evidenceStrength,
    required this.sources,
    required this.cueSuggestion,
    required this.minimumVersion,
    required this.normalVersion,
    required this.bonusVersion,
    required this.joyPairing,
    required this.frictionDown,
    required this.frictionUpForCompeting,
    required this.ifThenPlan,
    required this.trackingMetric,
    required this.progression,
    required this.safetyOrStopRule,
    required this.scheduleSlot,
    required this.timeMinutesNormal,
    required this.appType,
    required this.priorityForHer,
    required this.notes,
    this.ar,
  });

  factory Action.fromJson(Json j) => Action(
        actionId: jStr(j, 'action_id'),
        area: jStr(j, 'area'),
        nameAr: jStr(j, 'name_ar'),
        nameEn: jStr(j, 'name_en'),
        what: jStr(j, 'what'),
        dose: jStr(j, 'dose'),
        why: jStr(j, 'why'),
        evidenceStrength: jStr(j, 'evidence_strength'),
        sources: jList(j, 'sources', EvidenceSource.fromJson),
        cueSuggestion: jStr(j, 'cue_suggestion'),
        minimumVersion: jStr(j, 'minimum_version'),
        normalVersion: jStr(j, 'normal_version'),
        bonusVersion: jStr(j, 'bonus_version'),
        joyPairing: jStr(j, 'joy_pairing'),
        frictionDown: jStr(j, 'friction_down'),
        frictionUpForCompeting: jStr(j, 'friction_up_for_competing'),
        ifThenPlan: jStr(j, 'if_then_plan'),
        trackingMetric: jStr(j, 'tracking_metric'),
        progression: jStr(j, 'progression'),
        safetyOrStopRule: jStr(j, 'safety_or_stop_rule'),
        scheduleSlot: jStr(j, 'schedule_slot'),
        timeMinutesNormal: jInt(j, 'time_minutes_normal'),
        appType: jStr(j, 'app_type'),
        priorityForHer: jStr(j, 'priority_for_her'),
        notes: jStr(j, 'notes'),
        ar: j['ar'] is Map ? ActionAr.fromJson(asJson(j['ar'])) : null,
      );

  final String actionId;
  final String area;
  final String nameAr;
  final String nameEn;
  final String what;
  final String dose;
  final String why;

  /// `Guideline`, `SR/MA`, `RCT`, `Observational`, `Expert consensus`.
  final String evidenceStrength;
  final List<EvidenceSource> sources;
  final String cueSuggestion;
  final String minimumVersion;
  final String normalVersion;
  final String bonusVersion;
  final String joyPairing;
  final String frictionDown;
  final String frictionUpForCompeting;
  final String ifThenPlan;
  final String trackingMetric;
  final String progression;
  final String safetyOrStopRule;
  final String scheduleSlot;
  final int timeMinutesNormal;
  final String appType;
  final String priorityForHer;
  final String notes;

  /// Arabic content (optional; older stored libraries have none).
  final ActionAr? ar;

  Action withAr(ActionAr? a) => Action.fromJson({...toJson(), 'ar': a?.toJson()});

  /// English seed text of [f] (card title/meta/why-short map to name/slot/why).
  String englishOf(ActionField f) => switch (f) {
        ActionField.cardTitle => nameEn,
        ActionField.cardMeta => '',
        ActionField.whyShort => why,
        ActionField.what => what,
        ActionField.dose => dose,
        ActionField.why => why,
        ActionField.cue => cueSuggestion,
        ActionField.minimum => minimumVersion,
        ActionField.normal => normalVersion,
        ActionField.bonus => bonusVersion,
        ActionField.joy => joyPairing,
        ActionField.frictionDown => frictionDown,
        ActionField.frictionUp => frictionUpForCompeting,
        ActionField.ifThen => ifThenPlan,
        ActionField.metric => trackingMetric,
        ActionField.safety => safetyOrStopRule,
      };

  /// Text of [f] in [lang]; Arabic falls back to English when missing.
  /// Returns null when the value does not apply («لا ينطبق» / n/a), and for
  /// the dose of JOY-12 / JOY-13 (user-defined / help card — no dose).
  String? text(ActionField f, AppLanguage lang) {
    if (f == ActionField.dose && kNoDoseActions.contains(actionId)) return null;
    final v = lang == AppLanguage.ar ? (ar?[f] ?? englishOf(f)) : englishOf(f);
    if (f == ActionField.cardTitle && lang == AppLanguage.ar && ar?[f] == null) return nameAr;
    return isNotApplicable(v) ? null : v;
  }

  /// Card title for lists (Arabic card title, else name).
  String title(AppLanguage lang) => lang == AppLanguage.ar ? (ar?[ActionField.cardTitle] ?? nameAr) : nameEn;

  /// Minutes the library itself states for the minimum version ("10 min",
  /// "a 15-minute block", "2 minutes", "(10 min)"), or null when the text
  /// states none. A number that is an offset ("30 min before bed") is not a
  /// duration and is ignored. Nothing is derived from the normal minutes.
  int? get statedMinimumMinutes => statedMinutesIn(minimumVersion);

  ActionType get type => actionTypeFromSeed(appType);
  Priority get priority => priorityFromSeed(priorityForHer);
  Slot get slot => slotFromSeed(scheduleSlot);
  bool get isEngineRule => type == ActionType.engineRule;

  /// Id prefix, e.g. `BODY`, `FOOD`, `GROW`, `LIFE`, `JOY`, `ENG`.
  String get family => actionId.split('-').first;

  Json toJson() => {
        'action_id': actionId,
        'area': area,
        'name_ar': nameAr,
        'name_en': nameEn,
        'what': what,
        'dose': dose,
        'why': why,
        'evidence_strength': evidenceStrength,
        'sources': sources.map((s) => s.toJson()).toList(),
        'cue_suggestion': cueSuggestion,
        'minimum_version': minimumVersion,
        'normal_version': normalVersion,
        'bonus_version': bonusVersion,
        'joy_pairing': joyPairing,
        'friction_down': frictionDown,
        'friction_up_for_competing': frictionUpForCompeting,
        'if_then_plan': ifThenPlan,
        'tracking_metric': trackingMetric,
        'progression': progression,
        'safety_or_stop_rule': safetyOrStopRule,
        'schedule_slot': scheduleSlot,
        'time_minutes_normal': timeMinutesNormal,
        'app_type': appType,
        'priority_for_her': priorityForHer,
        'notes': notes,
        if (ar != null) 'ar': ar!.toJson(),
      };
}

/// Actions whose dose is never shown (user-defined practice / help card).
const Set<String> kNoDoseActions = {'JOY-12', 'JOY-13'};

final RegExp _statedMinutes = RegExp(r'(\d+)\s*-?\s*(?:min\b|mins\b|minute|minutes)(?!\s+(?:before|after|earlier|later))', caseSensitive: false);

/// First duration in minutes stated in [text] (see [Action.statedMinimumMinutes]).
int? statedMinutesIn(String text) {
  for (final m in _statedMinutes.allMatches(text)) {
    final n = int.tryParse(m.group(1)!);
    if (n != null && n > 0) return n;
  }
  return null;
}

/// Behaviour-mechanic rule (ENG-01…ENG-23). Same seed shape as [Action];
/// only the fields meaningful for a rule are exposed.
class EngineRule {
  const EngineRule({
    required this.ruleId,
    required this.area,
    required this.nameAr,
    required this.nameEn,
    required this.what,
    required this.why,
    required this.evidenceStrength,
    required this.sources,
    required this.safetyOrStopRule,
    required this.notes,
    this.ar,
  });

  factory EngineRule.fromJson(Json j) => EngineRule(
        ruleId: jStr(j, 'action_id'),
        area: jStr(j, 'area'),
        nameAr: jStr(j, 'name_ar'),
        nameEn: jStr(j, 'name_en'),
        what: jStr(j, 'what'),
        why: jStr(j, 'why'),
        evidenceStrength: jStr(j, 'evidence_strength'),
        sources: jList(j, 'sources', EvidenceSource.fromJson),
        safetyOrStopRule: jStr(j, 'safety_or_stop_rule'),
        notes: jStr(j, 'notes'),
        ar: j['ar'] is Map ? ActionAr.fromJson(asJson(j['ar'])) : null,
      );

  final String ruleId;
  final String area;
  final String nameAr;
  final String nameEn;
  final String what;
  final String why;
  final String evidenceStrength;
  final List<EvidenceSource> sources;
  final String safetyOrStopRule;
  final String notes;

  /// Arabic card title / what / why / safety (optional).
  final ActionAr? ar;

  EngineRule withAr(ActionAr? a) => EngineRule.fromJson({...toJson(), 'ar': a?.toJson()});

  String title(AppLanguage lang) => lang == AppLanguage.ar ? (ar?[ActionField.cardTitle] ?? nameAr) : nameEn;

  /// what / why / safety in [lang] (Arabic falls back to English); null = n/a.
  String? text(ActionField f, AppLanguage lang) {
    final en = switch (f) {
      ActionField.what => what,
      ActionField.why => why,
      ActionField.safety => safetyOrStopRule,
      ActionField.cardTitle => nameEn,
      _ => '',
    };
    final v = lang == AppLanguage.ar ? (ar?[f] ?? en) : en;
    return isNotApplicable(v) ? null : v;
  }

  Json toJson() => {
        'action_id': ruleId,
        'area': area,
        'name_ar': nameAr,
        'name_en': nameEn,
        'what': what,
        'why': why,
        'evidence_strength': evidenceStrength,
        'sources': sources.map((s) => s.toJson()).toList(),
        'safety_or_stop_rule': safetyOrStopRule,
        'notes': notes,
        'app_type': 'Engine rule',
        if (ar != null) 'ar': ar!.toJson(),
      };
}
