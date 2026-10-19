/// View models for the hub tabs (UI-2). Selection/aggregation only — the
/// rules live in `lib/engine/`.
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/date_utils.dart';
import '../../data/models/models.dart';
import '../../engine/engine.dart';
import '../../state/providers.dart';

/// A plant in the Life Garden.
class GardenPlant {
  const GardenPlant({required this.habit, required this.stage, required this.resting, this.strength});
  final Habit habit;
  final GrowthStage stage;

  /// Paused, in a Rest domain, or not done on any planned day this past week.
  final bool resting;
  final HabitStrength? strength;
}

/// Days without a completion (on planned days) after which a plant rests.
const int kRestAfterDays = 7;

bool isRestingHabit(Habit h, List<Domain> domains, List<LogEntry> logs, DateTime today) {
  if (!h.isActive) return true;
  final d = domains.where((x) => x.id == h.domain).firstOrNull;
  if (d != null && (!d.enabled || d.state == DomainState.rest)) return true;
  final created = h.createdDate == null ? null : parseDayKey(h.createdDate!);
  if (created != null && daysBetween(created, today) < kRestAfterDays) return false;
  final occ = occurrences(
    isPlanned: h.schedule.isPlannedOn,
    logsByDay: indexLogsByDay(logs, h.id),
    from: addDays(today, -kRestAfterDays),
    to: addDays(today, -1),
  );
  final planned = occ.where((o) => o.planned).length;
  return planned > 0 && !occ.any((o) => o.done);
}

/// Garden: Grow habits first (spec §6.6), then her other active habits
/// (chains included) so the garden reflects everything she is growing.
final gardenProvider = Provider<List<GardenPlant>>((ref) {
  final s = ref.watch(snapshotProvider);
  if (s == null) return const [];
  final today = ref.watch(todayProvider);
  final core = ref.watch(coreHabitsProvider).map((h) => h.id).toSet();
  final habits = s.habits.where((h) => h.status != HabitStatus.archived).toList()
    ..sort((a, b) {
      final ca = core.contains(a.id) ? 0 : 1, cb = core.contains(b.id) ? 0 : 1;
      return ca != cb ? ca - cb : a.sortOrder.compareTo(b.sortOrder);
    });
  return [
    for (final h in habits)
      () {
        final st = ref.watch(habitStrengthProvider(h.id));
        return GardenPlant(
          habit: h,
          stage: st?.stage ?? GrowthStage.seed,
          resting: isRestingHabit(h, s.domains, s.logs, today),
          strength: st,
        );
      }(),
  ];
});

/// Year roadmap quarter (1–4) for [day]: Q1 = Oct–Dec … Q4 = Jul–Sep.
/// Days before the roadmap starts (Oct 2026) count as Q1.
final kRoadmapStart = DateTime(2026, 10, 1);

int roadmapQuarter(DateTime day) {
  if (day.isBefore(kRoadmapStart)) return 1;
  final m = day.month;
  if (m >= 10) return 1;
  if (m <= 3) return 2;
  if (m <= 6) return 3;
  return 4;
}

/// Next step of a goal: first undone milestone (current quarter first),
/// else the next step of a linked active project.
({Milestone? milestone, ProjectStep? step}) goalNextStep(Goal g, List<Project> projects, int quarter) {
  final open = g.milestones.where((m) => !m.done).toList()..sort((a, b) => a.quarter.compareTo(b.quarter));
  final m = open.where((m) => m.quarter >= quarter).firstOrNull ?? open.firstOrNull;
  final p = projects
      .where((p) => (g.linkedProjectIds.contains(p.id) || p.goalId == g.id) && p.status == ProjectStatus.active)
      .firstOrNull;
  return (milestone: m, step: p?.nextStep);
}
