/// Read-only view models for the UI, derived from the core providers.
/// No engine rules live here — only selection/aggregation for display.
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/date_utils.dart';
import '../../data/models/models.dart';
import '../../engine/engine.dart';
import '../../state/providers.dart';

/// Tiers counted in the "يومك جاهز" card (chains have their own cards).
bool countsInDay(PlanItem i) => i.tier != PlanTier.chain;

/// Progress of today's plan (non-chain items).
class DayProgress {
  const DayProgress({required this.done, required this.total, required this.core, required this.maintain, required this.joy});
  final int done;
  final int total;
  final int core;
  final int maintain;
  final int joy;
  double get fraction => total == 0 ? 0 : done / total;
}

final dayProgressProvider = Provider<DayProgress?>((ref) {
  final plan = ref.watch(todayPlanProvider).value;
  if (plan == null) return null;
  final logs = ref.watch(todayLogsProvider);
  final items = plan.items.where(countsInDay).toList();
  bool isDone(PlanItem i) => logs[i.itemId]?.isDone ?? false;
  return DayProgress(
    done: items.where(isDone).length,
    total: items.length,
    core: items.where((i) => i.tier == PlanTier.core || i.tier == PlanTier.system).length,
    maintain: items.where((i) => i.tier == PlanTier.maintain).length,
    joy: items.where((i) => i.tier == PlanTier.joy).length,
  );
});

/// Items the Green plan would have had that a Yellow/Red day rests
/// ("المشي، المفردات… ترتاح اليوم"). Empty on Green.
final restingTodayProvider = Provider<List<PlanItem>>((ref) {
  final s = ref.watch(snapshotProvider);
  final energy = ref.watch(energyTodayProvider);
  final plan = ref.watch(todayPlanProvider).value;
  if (s == null || plan == null || energy == EnergyMode.green) return const [];
  final green = planDay(plannerInputFor(s, ref.watch(todayProvider), EnergyMode.green));
  final kept = plan.items.map((i) => i.itemId).toSet();
  return green.items.where((i) => !kept.contains(i.itemId) && i.tier != PlanTier.chain && i.tier != PlanTier.joy).toList();
});

/// Mean momentum of the Core habits ("زخم الأسبوع").
final weekMomentumProvider = Provider<double>((ref) {
  final s = ref.watch(snapshotProvider);
  if (s == null) return 0;
  final core = ref.watch(coreHabitsProvider);
  if (core.isEmpty) return 0;
  return averageMomentum(habits: core, logs: s.logs, today: ref.watch(todayProvider));
});

/// Tomorrow's first action she pinned in Evening Shutdown (if for today).
final pinnedFirstActionProvider = Provider<String?>((ref) {
  final pin = ref.watch(settingsProvider).firstActionPin;
  if (pin == null) return null;
  final parts = pin.split('|');
  if (parts.length != 2 || parts[0] != dayKey(ref.watch(todayProvider))) return null;
  return parts[1];
});

/// First undone actionable item of today (Morning Brief "أول خطوة").
final firstActionProvider = Provider<PlanItem?>((ref) {
  final plan = ref.watch(todayPlanProvider).value;
  if (plan == null) return null;
  final logs = ref.watch(todayLogsProvider);
  final open = plan.items.where((i) => i.tier != PlanTier.joy && !(logs[i.itemId]?.isDone ?? false)).toList();
  final pinned = ref.watch(pinnedFirstActionProvider);
  if (pinned != null) {
    final p = open.where((i) => i.itemId == pinned).firstOrNull;
    if (p != null) return p;
  }
  return open.firstOrNull;
});

/// Steps of a routine as planned today (falls back to the routine's own
/// steps when today's plan does not include it, e.g. a Red day).
final routineItemsProvider = Provider.family<List<PlanItem>, String>((ref, routineId) {
  final plan = ref.watch(todayPlanProvider).value;
  final fromPlan = plan?.items.where((i) => i.routineId == routineId).toList() ?? const <PlanItem>[];
  if (fromPlan.isNotEmpty) return fromPlan;
  final s = ref.watch(snapshotProvider);
  if (s == null) return const [];
  final green = planDay(plannerInputFor(s, ref.watch(todayProvider), EnergyMode.green));
  return green.items.where((i) => i.routineId == routineId).toList();
});

/// A plan item of today by its log key (itemId), searching the timeline,
/// the "this week" strip and the Green plan (so deep links always resolve).
final planItemProvider = Provider.family<PlanItem?, String>((ref, itemId) {
  final plan = ref.watch(todayPlanProvider).value;
  if (plan == null) return null;
  final hit = [...plan.items, ...plan.thisWeek, ...plan.deferred].where((i) => i.itemId == itemId).firstOrNull;
  if (hit != null) return hit;
  final s = ref.watch(snapshotProvider);
  if (s == null) return null;
  final green = planDay(plannerInputFor(s, ref.watch(todayProvider), EnergyMode.green));
  return [...green.items, ...green.thisWeek, ...green.deferred].where((i) => i.itemId == itemId).firstOrNull;
});

/// Per-day outcome for the Why-sheet 4-week grid.
enum DayMark { full, minimum, rest, future, notPlanned }

/// Last 28 days (oldest first, aligned to week start) for [habitId].
final habitGridProvider = Provider.family<List<DayMark>, String>((ref, habitId) {
  final s = ref.watch(snapshotProvider);
  final h = s?.habit(habitId);
  if (s == null || h == null) return const [];
  final today = ref.watch(todayProvider);
  final weekStart = startOfWeek(today, weekStartsOn: s.settings.weekStartsOn);
  final from = addDays(weekStart, -21);
  final byDay = indexLogsByDay(s.logs, h.id);
  final created = h.createdDate == null ? null : parseDayKey(h.createdDate!);
  return [
    for (var i = 0; i < 28; i++)
      () {
        final d = addDays(from, i);
        if (d.isAfter(today)) return DayMark.future;
        final log = byDay[dayKey(d)];
        if (log != null && log.isDone) return log.level == CompletionLevel.minimum ? DayMark.minimum : DayMark.full;
        if (!h.schedule.isPlannedOn(d) || (created != null && d.isBefore(created))) return DayMark.notPlanned;
        return DayMark.rest;
      }(),
  ];
});

// ---- UI-2: seed-text localisation ---------------------------------------------------------

/// Every Action Library text (English seed and Arabic) → (action, field).
/// Lets the UI show an *unedited* seed text in the current language, while
/// anything she wrote herself is shown as written.
final seedTextIndexProvider = Provider<Map<String, (Action, ActionField)>>((ref) {
  final out = <String, (Action, ActionField)>{};
  for (final a in ref.watch(actionLibraryProvider)) {
    for (final f in ActionField.values) {
      final en = a.englishOf(f).trim();
      if (en.isNotEmpty && f != ActionField.whyShort && f != ActionField.cardTitle) out.putIfAbsent(en, () => (a, f));
      final ar = a.ar?[f];
      if (ar != null) out.putIfAbsent(ar, () => (a, f));
    }
  }
  return out;
});

/// [stored] in [lang] if it is an unedited library text ('' when the field
/// does not apply), otherwise [stored] unchanged.
String localizeSeed(Map<String, (Action, ActionField)> index, String stored, AppLanguage lang) {
  final hit = index[stored.trim()];
  if (hit == null) return isNotApplicable(stored) && stored.trim().isNotEmpty ? '' : stored;
  return hit.$1.text(hit.$2, lang) ?? '';
}

/// Library text of action [id] in [lang] ('' when missing / not applicable).
String libraryText(WidgetRef ref, String id, ActionField f, AppLanguage lang) =>
    ref.watch(snapshotProvider)?.action(id)?.text(f, lang) ?? '';
