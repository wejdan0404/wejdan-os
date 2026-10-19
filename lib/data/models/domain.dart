import 'enums.dart';
import 'json_utils.dart';

/// A Life-Map domain (spec §4) and its state in the current Season.
class Domain {
  const Domain({
    required this.id,
    required this.nameAr,
    required this.nameEn,
    required this.state,
    this.sensitive = false,
    this.enabled = true,
    this.parent,
    this.sortOrder = 0,
  });

  factory Domain.fromJson(Json j) => Domain(
        id: enumFromName(DomainId.values, j['id'], DomainId.joy),
        nameAr: jStr(j, 'nameAr'),
        nameEn: jStr(j, 'nameEn'),
        state: enumFromName(DomainState.values, j['state'], DomainState.rest),
        sensitive: jBool(j, 'sensitive'),
        enabled: jBool(j, 'enabled', true),
        parent: j['parent'] == null ? null : enumFromName(DomainId.values, j['parent'], DomainId.home),
        sortOrder: jInt(j, 'sortOrder'),
      );

  final DomainId id;
  final String nameAr;
  final String nameEn;
  final DomainState state;

  /// Sensitive modules (Women's health) are off by default and can be locked.
  final bool sensitive;

  /// Module switch (Aquarium, Women's health are off by default).
  final bool enabled;

  /// For sub-domains (Aquarium → Home).
  final DomainId? parent;
  final int sortOrder;

  /// Rest domains and disabled modules are hidden from Today.
  bool get visibleOnToday => enabled && state != DomainState.rest;

  Domain copyWith({DomainState? state, bool? enabled, int? sortOrder}) => Domain(
        id: id,
        nameAr: nameAr,
        nameEn: nameEn,
        state: state ?? this.state,
        sensitive: sensitive,
        enabled: enabled ?? this.enabled,
        parent: parent,
        sortOrder: sortOrder ?? this.sortOrder,
      );

  Json toJson() => {
        'id': id.name,
        'nameAr': nameAr,
        'nameEn': nameEn,
        'state': state.name,
        'sensitive': sensitive,
        'enabled': enabled,
        'parent': parent?.name,
        'sortOrder': sortOrder,
      };
}

/// A Life Season (~6–12 weeks). Stores the Grow/Maintain/Rest snapshot and a
/// title she can edit. The *current* domain states live on [Domain].
class Season {
  const Season({
    required this.id,
    required this.titleAr,
    required this.titleEn,
    required this.startDate,
    this.plannedEndDate,
    this.endedDate,
    this.states = const {},
  });

  factory Season.fromJson(Json j) => Season(
        id: jStr(j, 'id'),
        titleAr: jStr(j, 'titleAr'),
        titleEn: jStr(j, 'titleEn'),
        startDate: jStr(j, 'startDate'),
        plannedEndDate: jStrN(j, 'plannedEndDate'),
        endedDate: jStrN(j, 'endedDate'),
        states: jMap(j, 'states').map(
          (k, v) => MapEntry(
            enumFromName(DomainId.values, k, DomainId.joy),
            enumFromName(DomainState.values, v, DomainState.rest),
          ),
        ),
      );

  final String id;
  final String titleAr;
  final String titleEn;

  /// Day keys (`yyyy-MM-dd`).
  final String startDate;
  final String? plannedEndDate;
  final String? endedDate;
  final Map<DomainId, DomainState> states;

  bool get isCurrent => endedDate == null;

  Season copyWith({
    String? titleAr,
    String? titleEn,
    String? plannedEndDate,
    String? endedDate,
    Map<DomainId, DomainState>? states,
  }) =>
      Season(
        id: id,
        titleAr: titleAr ?? this.titleAr,
        titleEn: titleEn ?? this.titleEn,
        startDate: startDate,
        plannedEndDate: plannedEndDate ?? this.plannedEndDate,
        endedDate: endedDate ?? this.endedDate,
        states: states ?? this.states,
      );

  Json toJson() => {
        'id': id,
        'titleAr': titleAr,
        'titleEn': titleEn,
        'startDate': startDate,
        'plannedEndDate': plannedEndDate,
        'endedDate': endedDate,
        'states': states.map((k, v) => MapEntry(k.name, v.name)),
      };
}
