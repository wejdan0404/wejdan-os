/// Today — the led day (Main.dc.html; Red mode = TodayRed.dc.html).
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../data/models/models.dart';
import '../../../state/providers.dart';
import '../../format.dart';
import '../../state/ui_providers.dart';
import '../../theme/theme_ext.dart';
import '../../widgets/widgets.dart';
import 'today_item_card.dart';
import '../review/fresh_start_card.dart';
import 'today_sections.dart';

class TodayScreen extends ConsumerWidget {
  const TodayScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final plan = ref.watch(todayPlanProvider);
    final l = context.l;
    return Scaffold(
      floatingActionButton: plan.value?.energy == EnergyMode.red
          ? null
          : _QuickAddFab(onPressed: () => context.push('/today/add')),
      floatingActionButtonLocation: FloatingActionButtonLocation.endFloat,
      body: SafeArea(
        bottom: false,
        child: plan.when(
          loading: () => Center(child: Text(l.placeholderLoading, style: context.t.small)),
          error: (e, _) => Center(child: EmptyRestState(message: l.placeholderError)),
          data: (p) => p.energy == EnergyMode.red ? _RedBody(plan: p) : _DayBody(plan: p),
        ),
      ),
    );
  }
}

class _Header extends ConsumerWidget {
  const _Header();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final now = ref.watch(clockProvider)();
    final today = ref.watch(todayProvider);
    final red = ref.watch(energyTodayProvider) == EnergyMode.red;
    return WHeader(
      title: greeting(context, now),
      subtitle: dateLine(context, today),
      actions: [
        if (!red)
          CircleIconButton(icon: Icons.wb_sunny_outlined, label: l.morningBriefTitle, onPressed: () => context.push('/brief')),
        CircleIconButton(
          icon: Icons.nightlight_outlined,
          label: l.eveningShutdownTitle,
          onPressed: () => context.push('/evening'),
        ),
      ],
    );
  }
}

class _DayBody extends ConsumerWidget {
  const _DayBody({required this.plan});
  final DayPlan plan;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final morning = plan.itemsIn(PlanSection.morningChain);
    final evening = plan.itemsIn(PlanSection.eveningChain);
    final core = plan.items
        .where((i) => i.section == PlanSection.day && (i.tier == PlanTier.core || i.tier == PlanTier.system))
        .toList();
    final maintain = plan.items.where((i) => i.tier == PlanTier.maintain && i.section == PlanSection.day).toList();
    final joy = plan.itemsOfTier(PlanTier.joy);
    Iterable<Widget> gap(List<Widget> ws) sync* {
      for (final w in ws) {
        yield w;
        yield const SizedBox(height: 12);
      }
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(WSpace.page, 16, WSpace.page, 120),
      children: [
        const _Header(),
        const SizedBox(height: 16),
        const TodayStatusRow(),
        const SizedBox(height: 20),
        const RecoveryBanner(),
        if (ref.watch(recoveryTriggersProvider).isNotEmpty) const SizedBox(height: 12),
        if (ref.watch(freshStartTodayProvider) case final fresh?) ...[FreshStartCard(fresh: fresh), const SizedBox(height: 12)],
        const DayShapeCard(),
        const SizedBox(height: 20),
        if (morning.isNotEmpty) ...[
          ChainCard(items: morning, routineId: morning.first.routineId ?? ''),
          const SizedBox(height: 20),
        ],
        if (core.isNotEmpty) ...[
          SectionLabel(l.coreSection(core.length.toString()), trailing: l.anyVersionCounts),
          const SizedBox(height: 12),
          ...gap([for (final i in core) TodayItemCard(key: ValueKey(i.id), item: i)]),
          const SizedBox(height: 8),
        ],
        if (maintain.isNotEmpty) ...[
          SectionLabel(l.maintainSection(maintain.length.toString())),
          const SizedBox(height: 12),
          ...gap([for (final i in maintain) TodayItemCard(key: ValueKey(i.id), item: i, simple: true)]),
          const SizedBox(height: 8),
        ],
        if (evening.isNotEmpty) ...[
          SectionLabel(l.eveningSection),
          const SizedBox(height: 12),
          ChainCard(items: evening, routineId: evening.first.routineId ?? ''),
          const SizedBox(height: 20),
        ],
        if (joy.isNotEmpty) ...[
          SectionLabel(l.freeJoySection, spark: true),
          const SizedBox(height: 12),
          FreeJoyCard(item: joy.first),
          const SizedBox(height: 20),
        ],
        if (plan.thisWeek.isNotEmpty) ThisWeekStrip(items: plan.thisWeek),
      ],
    );
  }
}

/// Red day: 3 essentials at minimum + 1 joy, calm lilac, no guilt.
class _RedBody extends ConsumerWidget {
  const _RedBody({required this.plan});
  final DayPlan plan;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final c = context.c;
    final items = plan.items.where((i) => i.tier != PlanTier.joy).toList();
    final joy = plan.itemsOfTier(PlanTier.joy);
    final logs = ref.watch(todayLogsProvider);
    final done = items.where((i) => logs[i.itemId]?.isDone ?? false).length;
    final resting = ref.watch(restingTodayProvider);
    final lang = context.lang;
    return ListView(
      padding: const EdgeInsets.fromLTRB(WSpace.page, 16, WSpace.page, 40),
      children: [
        const _Header(),
        const SizedBox(height: 16),
        Align(
          alignment: AlignmentDirectional.centerStart,
          child: EnergyChip(mode: EnergyMode.red, showChange: true, onTap: () => context.push('/brief')),
        ),
        const SizedBox(height: 16),
        WCard(
          color: c.energyRed.bg,
          borderColor: c.energyRed.bg,
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(l.calmDayTitle, style: context.t.h1.copyWith(color: c.deep)),
              const SizedBox(height: 6),
              Text(l.calmDayBody, style: context.t.body.copyWith(color: c.textSecondary)),
            ],
          ),
        ),
        const SizedBox(height: 20),
        SectionLabel(l.minimumOnly(done.toString(), items.length.toString())),
        const SizedBox(height: 12),
        for (final i in items) ...[TodayItemCard(key: ValueKey(i.id), item: i, simple: true), const SizedBox(height: 12)],
        if (joy.isNotEmpty) ...[
          const SizedBox(height: 8),
          SectionLabel(l.freeJoySection, spark: true),
          const SizedBox(height: 12),
          FreeJoyCard(item: joy.first),
        ],
        if (resting.isNotEmpty) ...[
          const SizedBox(height: 20),
          WCard(
            color: c.rest.bg,
            borderColor: c.rest.bg,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.eco_outlined, size: 18, color: c.caption),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    l.restingNote(resting.map((i) => i.title.of(lang)).join(lang == AppLanguage.ar ? '، ' : ', ')),
                    style: context.t.small.copyWith(color: c.textSecondary),
                  ),
                ),
              ],
            ),
          ),
        ],
        if (plan.showHelpLink) ...[
          const SizedBox(height: 16),
          Center(
            child: SecondaryButton(
              small: true,
              icon: Icons.shield_outlined,
              label: l.helpLinkRed,
              onPressed: () => context.push('/help'),
            ),
          ),
        ],
      ],
    );
  }
}

class _QuickAddFab extends StatelessWidget {
  const _QuickAddFab({required this.onPressed});
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Semantics(
      container: true,
      button: true,
      label: context.l.quickAddTitle,
      excludeSemantics: true,
      child: Container(
        width: 56,
        height: 56,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          boxShadow: c.isDark
              ? [BoxShadow(color: c.glow, blurRadius: 24)]
              : const [BoxShadow(color: Color(0x0F0E121C), blurRadius: 8, offset: Offset(0, 2))],
        ),
        child: Material(
          color: c.primaryFill,
          shape: const CircleBorder(),
          child: InkWell(
            customBorder: const CircleBorder(),
            onTap: onPressed,
            child: Icon(Icons.add_rounded, size: 28, color: c.onPrimary),
          ),
        ),
      ),
    );
  }
}
