/// عاداتي — Life Garden (growth stages from Habit Strength, resting plants
/// sleep), habits by domain with Momentum rings, routines, new habit.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../data/models/models.dart';
import '../../../engine/engine.dart';
import '../../../state/providers.dart';
import '../../format.dart';
import '../../state/hub_providers.dart';
import '../../theme/theme_ext.dart';
import '../../widgets/widgets.dart';

String stageName(BuildContext context, GrowthStage s) => switch (s) {
  GrowthStage.seed => context.l.stageSeed,
  GrowthStage.sprout => context.l.stageSprout,
  GrowthStage.growing => context.l.stageGrowing,
  GrowthStage.rooted => context.l.stageRooted,
  GrowthStage.automatic => context.l.stageAutomatic,
};

/// Stage pill tint: early stages neutral/sky, later sage.
Tint stageTint(BuildContext context, GrowthStage s) => switch (s) {
  GrowthStage.seed => context.c.rest,
  GrowthStage.sprout => context.c.info,
  _ => context.c.done,
};

/// "بعد العصر · 20 د · 4 أيام بالأسبوع".
String habitMeta(BuildContext context, Habit h, Settings s, DateTime today) {
  final minute = AnchorResolver.fromSettings(s)
      .resolve(h.schedule.anchor, today);
  final days = h.schedule.weekdays.length;
  return metaJoin([
    cueLabel(context, h.schedule.anchor, s, resolvedMinute: minute),
    minutesText(context, h.durationMin),
    days >= 7 ? context.l.everyDay : context.l.daysPerWeek('$days'),
  ]);
}

class HabitsHubScreen extends ConsumerStatefulWidget {
  const HabitsHubScreen({super.key});

  @override
  ConsumerState<HabitsHubScreen> createState() => _HabitsHubScreenState();
}

class _HabitsHubScreenState extends ConsumerState<HabitsHubScreen> {
  String? _selected;

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final c = context.c;
    final lang = context.lang;
    final domains = ref.watch(domainsProvider);
    final season = ref.watch(currentSeasonProvider);
    final garden = ref.watch(gardenProvider);
    final core = ref.watch(coreHabitsProvider);
    final grow = domains
        .where((d) => d.enabled && d.state == DomainState.grow)
        .toList();
    final maintain = domains
        .where((d) => d.enabled && d.state == DomainState.maintain)
        .toList();
    final selected =
        garden.where((p) => p.habit.id == _selected).firstOrNull ??
        garden.firstOrNull;

    return HubPage(
      title: l.tabHabits,
      back: false,
      subtitle: metaJoin([
        if (season != null)
          (lang == AppLanguage.ar ? season.titleAr : season.titleEn),
        l.seasonShape('${grow.length}', '${maintain.length}'),
      ]),
      actions: [
        CircleIconButton(
          icon: Icons.celebration_outlined,
          label: l.tabJoy,
          onPressed: () => context.push('/habits/joy'),
        ),
        CircleIconButton(
          icon: Icons.menu_book_outlined,
          label: l.evidenceLibrary,
          onPressed: () => context.push('/me/evidence'),
        ),
      ],
      children: [
        _GardenCard(
          plants: garden,
          selected: selected,
          onSelect: (id) => setState(() => _selected = id),
        ),
        gap24,
        SectionLabel(l.byDomainMomentum),
        gap8,
        _ByDomain(core: core, domains: grow),
        gap12,
        if (maintain.isNotEmpty)
          WCard(
            color: c.surfaceSubtle,
            borderColor: c.surfaceSubtle,
            child: Row(
              children: [
                Icon(Icons.check_circle_outline_rounded, color: c.accentText),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    l.maintainNote(
                      '${ref.watch(habitsProvider).where((h) => h.isActive && maintain.any((d) => d.id == h.domain)).length}',
                      maintain
                          .map((d) => domainShort(context, d.id))
                          .join(' · '),
                    ),
                    style: context.t.small.copyWith(color: c.textSecondary),
                  ),
                ),
              ],
            ),
          ),
        gap24,
        SectionLabel(l.myRoutines),
        gap8,
        const _Routines(),
        gap24,
        PrimaryButton(
          label: l.newHabit,
          icon: Icons.add_rounded,
          onPressed: () => context.push('/studio'),
        ),
        gap8,
        Center(
          child: Text(
            l.coreCapacityNote(
              '${core.length}',
              '$kMaxCoreHabits',
              '${(kMaxCoreHabits - core.length).clamp(0, kMaxCoreHabits)}',
            ),
            textAlign: TextAlign.center,
            style: context.t.caption.copyWith(color: c.caption),
          ),
        ),
      ],
    );
  }
}

class _GardenCard extends ConsumerWidget {
  const _GardenCard({
    required this.plants,
    required this.selected,
    required this.onSelect,
  });
  final List<GardenPlant> plants;
  final GardenPlant? selected;
  final ValueChanged<String> onSelect;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final c = context.c;
    final lang = context.lang;
    return WCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Semantics(
            header: true,
            child: Text(
              l.myGarden,
              style: context.t.h2.copyWith(color: c.text),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            l.gardenSub,
            style: context.t.small.copyWith(color: c.textSecondary),
          ),
          gap12,
          if (plants.isEmpty)
            EmptyRestState(message: l.gardenEmpty)
          else
            LayoutBuilder(
              builder: (context, box) {
                final cols = box.maxWidth >= 300 ? 3 : 2;
                final w = (box.maxWidth - (cols - 1) * 8) / cols;
                return Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final p in plants.take(9))
                      SizedBox(
                        width: w,
                        child: _PlantTile(
                          plant: p,
                          selected: p.habit.id == selected?.habit.id,
                          onTap: () => onSelect(p.habit.id),
                        ),
                      ),
                  ],
                );
              },
            ),
          if (selected != null) ...[
            gap12,
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: c.surfaceSubtle,
                borderRadius: WRadius.tileR,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          lang == AppLanguage.ar
                              ? selected!.habit.titleAr
                              : selected!.habit.titleEn,
                          style: context.t.bodyStrong.copyWith(color: c.text),
                        ),
                      ),
                      Text(
                        selected!.resting
                            ? l.plantResting
                            : stageName(context, selected!.stage),
                        style: context.t.caption.copyWith(color: c.caption),
                      ),
                    ],
                  ),
                  gap8,
                  GrowthStageBar(stage: selected!.stage),
                  gap8,
                  Text(
                    _detail(context, selected!),
                    style: context.t.small.copyWith(color: c.textSecondary),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  String _detail(BuildContext context, GardenPlant p) {
    final l = context.l;
    if (p.resting) return l.plantRestingNote;
    final st = p.strength;
    if (st == null) return l.gardenNoData;
    final parts = <String>[l.consistencyLine('${st.consistency.round()}')];
    parts.add(
      st.srbai == null
          ? l.noSrbaiYet
          : l.srbaiLine((1 + st.srbai! / 25).toStringAsFixed(1)),
    );
    return parts.join(' ');
  }
}

class _PlantTile extends StatelessWidget {
  const _PlantTile({
    required this.plant,
    required this.selected,
    required this.onTap,
  });
  final GardenPlant plant;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final l = context.l;
    final title = context.lang == AppLanguage.ar
        ? plant.habit.titleAr
        : plant.habit.titleEn;
    final stage = plant.resting
        ? l.plantResting
        : stageName(context, plant.stage);
    return Semantics(
      container: true,
      button: true,
      selected: selected,
      label: '$title، $stage',
      excludeSemantics: true,
      child: Material(
        color: selected ? c.surfaceSubtle : c.bg,
        shape: RoundedRectangleBorder(
          borderRadius: WRadius.tileR,
          side: BorderSide(color: selected ? c.sky300 : Colors.transparent),
        ),
        child: InkWell(
          borderRadius: WRadius.tileR,
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 6),
            child: Column(
              children: [
                PlantGlyph(stage: plant.stage, resting: plant.resting),
                const SizedBox(height: 6),
                Text(
                  title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.center,
                  style: context.t.caption.copyWith(
                    color: c.text,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Text(
                  stage,
                  style: context.t.label.copyWith(
                    color: plant.resting ? c.caption : c.done.ink,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ByDomain extends ConsumerWidget {
  const _ByDomain({required this.core, required this.domains});
  final List<Habit> core;
  final List<Domain> domains;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final c = context.c;
    final lang = context.lang;
    final s = ref.watch(settingsProvider);
    final today = ref.watch(todayProvider);
    final groups = [
      for (final d in domains)
        if (core.any((h) => h.domain == d.id))
          (d, core.where((h) => h.domain == d.id).toList()),
    ];
    if (groups.isEmpty) {
      return WCard(child: EmptyRestState(message: l.noCoreHabits));
    }
    return ListCard(
      children: [
        for (final (d, hs) in groups)
          Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.only(top: 12, bottom: 4),
                child: Row(
                  children: [
                    DomainIcon(d.id, size: 28),
                    const SizedBox(width: 8),
                    Text(
                      domainShort(context, d.id),
                      style: context.t.label.copyWith(
                        color: c.domain(d.id).ink,
                      ),
                    ),
                  ],
                ),
              ),
              for (final h in hs)
                InkWell(
                  onTap: () => context.push(
                    '/studio?habit=${Uri.encodeComponent(h.id)}',
                  ),
                  borderRadius: WRadius.tileR,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    child: Row(
                      children: [
                        MomentumRing(
                          value: ref.watch(momentumProvider(h.id)),
                          semanticLabel: l.momentumOf(
                            lang == AppLanguage.ar ? h.titleAr : h.titleEn,
                            '${ref.watch(momentumProvider(h.id)).round()}',
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                lang == AppLanguage.ar ? h.titleAr : h.titleEn,
                                style: context.t.bodyStrong.copyWith(
                                  color: c.text,
                                ),
                              ),
                              Text(
                                habitMeta(context, h, s, today),
                                style: context.t.caption.copyWith(
                                  color: c.caption,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        () {
                          final st =
                              ref.watch(habitStrengthProvider(h.id))?.stage ??
                              GrowthStage.seed;
                          return WPill(
                            stageName(context, st),
                            tint: stageTint(context, st),
                          );
                        }(),
                      ],
                    ),
                  ),
                ),
            ],
          ),
      ],
    );
  }
}

class _Routines extends ConsumerWidget {
  const _Routines();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final c = context.c;
    final lang = context.lang;
    final snap = ref.watch(snapshotProvider);
    final routines = (snap?.routines ?? const <Routine>[])
        .where((r) => r.active)
        .toList();
    final s = ref.watch(settingsProvider);
    final today = ref.watch(todayProvider);
    if (routines.isEmpty) {
      return WCard(child: EmptyRestState(message: l.noRoutines));
    }
    String stepTitle(RoutineStep st) {
      final h = st.habitId == null ? null : snap?.habit(st.habitId!);
      if (h != null) return lang == AppLanguage.ar ? h.titleAr : h.titleEn;
      return lang == AppLanguage.ar ? st.titleAr : st.titleEn;
    }

    return LayoutBuilder(
      builder: (context, box) {
        final two =
            box.maxWidth >= 320 &&
            MediaQuery.textScalerOf(context).scale(1) < 1.3;
        final w = two ? (box.maxWidth - 12) / 2 : box.maxWidth;
        return Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            for (final r in routines)
              SizedBox(
                width: w,
                child: WCard(
                  onTap: () =>
                      context.push('/routine/${Uri.encodeComponent(r.id)}'),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              lang == AppLanguage.ar ? r.titleAr : r.titleEn,
                              style: context.t.bodyStrong.copyWith(
                                color: c.text,
                              ),
                            ),
                          ),
                          ExcludeSemantics(
                            child: Container(
                              width: 36,
                              height: 36,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                border: Border.all(color: c.border),
                              ),
                              child: Icon(
                                Icons.play_arrow_rounded,
                                size: 20,
                                color: c.accentText,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        metaJoin([
                          l.stepsCount('${r.steps.length}'),
                          cueLabel(
                            context,
                            r.anchor,
                            s,
                            resolvedMinute: AnchorResolver.fromSettings(s)
                                .resolve(r.anchor, today),
                          ),
                        ]),
                        style: context.t.caption.copyWith(color: c.caption),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        r.steps
                            .map(stepTitle)
                            .join(lang == AppLanguage.ar ? ' ← ' : ' → '),
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                        style: context.t.caption.copyWith(
                          color: c.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        );
      },
    );
  }
}
