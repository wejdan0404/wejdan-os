import 'dart:convert';

import '../models/models.dart';

/// Parsed `assets/data/actions.json`: evidence actions + engine rules.
class SeedLibrary {
  const SeedLibrary({required this.actions, required this.rules});

  /// Parses the raw JSON array. Items with `app_type == "Engine rule"`
  /// become [EngineRule]s; all others [Action]s. [arRaw] is
  /// `assets/data/actions_ar.json` (object keyed by `action_id`); its fields
  /// are attached as [Action.ar] / [EngineRule.ar].
  factory SeedLibrary.parse(String raw, {String? arRaw}) {
    final list = jsonDecode(raw) as List;
    final arMap = arRaw == null ? const <String, dynamic>{} : asJson(jsonDecode(arRaw));
    // Titles for turning internal cross-references ("see BODY-25") into
    // readable names — internal ids never reach the UI copy.
    final titleEn = <String, String>{};
    final titleAr = <String, String>{};
    for (final e in list) {
      final j = asJson(e);
      final id = jStr(j, 'action_id');
      titleEn[id] = jStr(j, 'name_en');
      final ar = arMap[id];
      final arTitle = ar is Map ? (ar['card_title_ar'] as String?) : null;
      titleAr[id] = (arTitle == null || arTitle.isEmpty) ? jStr(j, 'name_ar') : arTitle;
    }
    String clean(String v, Map<String, String> titles) => v.replaceAllMapped(kActionRefPattern, (m) {
          final t = titles[m.group(0)!];
          return t == null || t.isEmpty ? m.group(0)! : '«$t»';
        });
    final actions = <Action>[];
    final rules = <EngineRule>[];
    for (final e in list) {
      final j = {...asJson(e)};
      for (final k in j.keys.toList()) {
        final v = j[k];
        if (k != 'action_id' && v is String) j[k] = clean(v, titleEn);
      }
      final ar = arMap[jStr(j, 'action_id')];
      if (ar is Map) {
        j['ar'] = {
          for (final en in ar.entries) en.key: en.value is String ? clean(en.value as String, titleAr) : en.value,
        };
      }
      if (jStr(j, 'app_type') == 'Engine rule') {
        rules.add(EngineRule.fromJson(j));
      } else {
        actions.add(Action.fromJson(j));
      }
    }
    return SeedLibrary(actions: actions, rules: rules);
  }

  final List<Action> actions;
  final List<EngineRule> rules;

  /// Bump when the shipped library content changes so installed apps
  /// refresh their stored copy on boot (see `bootstrapRepository`).
  static const int version = 3;

  Action? action(String id) {
    for (final a in actions) {
      if (a.actionId == id) return a;
    }
    return null;
  }

  /// Like [action] but throws if missing (seed integrity).
  Action require(String id) => action(id) ?? (throw StateError('Seed action $id missing'));
}

/// An internal action / engine-rule id inside seed text ("BODY-25").
final RegExp kActionRefPattern = RegExp(r'\b(?:BODY|FOOD|GROW|LIFE|JOY|ENG)-\d{2}\b');

/// Maps an action's `area` to a Life-Map domain (for the Evidence Library
/// and "add to my plan"). Engine rules map to null.
DomainId? domainForAction(Action a) {
  const sleepAreas = {
    'sleep duration', 'sleep regularity', 'caffeine timing', 'screens/light before bed',
    'daytime/morning light', 'bedtime procrastination', 'naps', 'sleep hygiene', 'sleep (Ramadan)',
  };
  switch (a.family) {
    case 'BODY':
      if (sleepAreas.contains(a.area)) return DomainId.sleep;
      if (a.area == 'hydration') return DomainId.food;
      return DomainId.health;
    case 'FOOD':
      switch (a.area) {
        case 'skincare':
        case 'hair care':
        case 'dental':
          return DomainId.care;
        case "women's health":
          return DomainId.womensHealth;
        case 'preventive health':
          return DomainId.health;
        default:
          return DomainId.food;
      }
    case 'GROW':
      switch (a.area) {
        case 'IELTS':
          return DomainId.ielts;
        case 'job search':
        case 'professional growth':
        case 'attention & deep work':
          return DomainId.career;
        case 'digital wellbeing':
          return DomainId.digital;
        default:
          return DomainId.learning;
      }
    case 'LIFE':
      switch (a.area) {
        case 'personal finance':
          return DomainId.money;
        case 'home & clutter':
          return DomainId.home;
        case 'digital life admin':
          return DomainId.digital;
        case 'driving':
          return DomainId.driving;
        case 'aquarium':
          return DomainId.aquarium;
        default:
          return DomainId.admin;
      }
    case 'JOY':
      switch (a.area) {
        case 'social connection':
        case 'acts of kindness':
          return DomainId.people;
        case 'spiritual practice (user-chosen)':
          return DomainId.faith;
        default:
          return DomainId.joy;
      }
    default:
      return null;
  }
}
