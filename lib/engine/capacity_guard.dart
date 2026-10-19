/// Capacity & overload guard (spec §5.8, ENG-17, GROW-14).
///
/// Caps: max 3 Grow domains, max 5 Maintain domains, max 2 Active projects,
/// max 7 Core habits (active habits in Grow domains), max 1 active course.
/// Adding beyond a cap → UI shows "swap or park" (Idea Inbox).
library;

import '../data/models/models.dart';

const int kMaxGrowDomains = 3;
const int kMaxMaintainDomains = 5;
const int kMaxActiveProjects = 2;
const int kMaxCoreHabits = 7;
const int kMaxActiveCourses = 1;

enum CapacityRule { growDomains, maintainDomains, activeProjects, coreHabits, activeCourses }

class CapacityViolation {
  const CapacityViolation({required this.rule, required this.count, required this.max, this.ids = const []});

  final CapacityRule rule;
  final int count;
  final int max;

  /// Offending ids (domain names, project ids, habit ids).
  final List<String> ids;

  int get over => count - max;
}

/// Core habits = active habits whose domain is in Grow.
List<Habit> coreHabitsOf(List<Habit> habits, List<Domain> domains) {
  final grow = domains.where((d) => d.state == DomainState.grow && d.enabled).map((d) => d.id).toSet();
  return habits.where((h) => h.isActive && grow.contains(h.domain)).toList();
}

/// Returns all current violations (empty = healthy).
List<CapacityViolation> checkCapacity({
  required List<Domain> domains,
  required List<Project> projects,
  required List<Habit> habits,
}) {
  final out = <CapacityViolation>[];
  void add(CapacityRule r, List<String> ids, int max) {
    if (ids.length > max) out.add(CapacityViolation(rule: r, count: ids.length, max: max, ids: ids));
  }

  add(CapacityRule.growDomains,
      domains.where((d) => d.enabled && d.state == DomainState.grow).map((d) => d.id.name).toList(), kMaxGrowDomains);
  add(CapacityRule.maintainDomains,
      domains.where((d) => d.enabled && d.state == DomainState.maintain).map((d) => d.id.name).toList(),
      kMaxMaintainDomains);
  final active = projects.where((p) => p.status == ProjectStatus.active).toList();
  add(CapacityRule.activeProjects, active.map((p) => p.id).toList(), kMaxActiveProjects);
  add(CapacityRule.activeCourses, active.where((p) => p.isCourse).map((p) => p.id).toList(), kMaxActiveCourses);
  add(CapacityRule.coreHabits, coreHabitsOf(habits, domains).map((h) => h.id).toList(), kMaxCoreHabits);
  return out;
}

/// Violations that would *newly* appear if the change were applied
/// (use before saving: non-empty → "swap or park" dialog).
List<CapacityViolation> violationsAfter({
  required List<Domain> domains,
  required List<Project> projects,
  required List<Habit> habits,
  Domain? changedDomain,
  Project? changedProject,
  Habit? changedHabit,
}) {
  List<T> upsert<T>(List<T> list, T? item, bool Function(T) same) {
    if (item == null) return list;
    final i = list.indexWhere(same);
    final copy = List<T>.from(list);
    if (i >= 0) {
      copy[i] = item;
    } else {
      copy.add(item);
    }
    return copy;
  }

  final before = checkCapacity(domains: domains, projects: projects, habits: habits).map((v) => v.rule).toSet();
  final after = checkCapacity(
    domains: upsert(domains, changedDomain, (d) => d.id == changedDomain!.id),
    projects: upsert(projects, changedProject, (p) => p.id == changedProject!.id),
    habits: upsert(habits, changedHabit, (h) => h.id == changedHabit!.id),
  );
  return after.where((v) => !before.contains(v.rule)).toList();
}
