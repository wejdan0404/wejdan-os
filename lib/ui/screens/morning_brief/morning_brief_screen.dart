/// Morning Brief (MorningBrief.dc.html): one-tap energy check that
/// re-plans the day instantly via the engine, today's shape, first action.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/date_utils.dart';
import '../../../data/models/models.dart';
import '../../../state/providers.dart';
import '../../format.dart';
import '../../state/ui_providers.dart';
import '../../theme/theme_ext.dart';
import '../../widgets/widgets.dart';

class MorningBriefScreen extends ConsumerWidget {
  const MorningBriefScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final c = context.c;
    final now = ref.watch(clockProvider)();
    final answered = ref.watch(energyAnsweredTodayProvider);
    final energy = ref.watch(energyTodayProvider);
    final progress = ref.watch(dayProgressProvider);
    // Red: count what Today Red shows — every minimum item incl. chain
    // essentials (not the Joy), with Arabic number agreement (D15).
    final redCount = ref.watch(todayPlanProvider).value?.items.where((i) => i.tier != PlanTier.joy).length ?? 0;
    String redShape(int n) => switch (n) {
          1 => l.shapeRedOne,
          2 => l.shapeRedTwo,
          _ => l.shapeRed('$n'),
        };
    final first = ref.watch(firstActionProvider);
    final lang = context.lang;
    final selected = answered ? energy : null;

    void leave() => context.canPop() ? context.pop() : context.go('/today');

    Future<void> pick(EnergyMode m) => ref.read(lifeControllerProvider.notifier).setEnergy(m);

    final shapeSub = switch (selected ?? EnergyMode.green) {
      EnergyMode.green => l.shapeSubGreen,
      EnergyMode.yellow => l.shapeSubYellow,
      EnergyMode.red => l.shapeSubRed,
    };
    final morningRoutine = first?.routineId;

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(WSpace.page, 12, WSpace.page, 0),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      '${dateLine(context, ref.watch(todayProvider))} · ${formatHm(minuteOfDay(now))}',
                      style: context.t.caption.copyWith(color: c.caption, fontWeight: FontWeight.w600),
                    ),
                  ),
                  CircleIconButton(icon: Icons.close_rounded, label: l.close, filled: false, onPressed: leave),
                ],
              ),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(WSpace.page, 8, WSpace.page, 16),
                children: [
                  const Align(alignment: AlignmentDirectional.centerStart, child: _Sparkles()),
                  Semantics(
                    header: true,
                    child: Text(greeting(context, now), style: context.t.display.copyWith(color: c.text)),
                  ),
                  const SizedBox(height: 4),
                  Text(l.briefQuestion, style: context.t.body.copyWith(color: c.textSecondary)),
                  const SizedBox(height: 20),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      for (final m in EnergyMode.values) ...[
                        Expanded(
                          child: _EnergyCard(mode: m, selected: selected == m, onTap: () => pick(m)),
                        ),
                        if (m != EnergyMode.red) const SizedBox(width: 10),
                      ],
                    ],
                  ),
                  const SizedBox(height: 20),
                  if (progress != null)
                    WCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(l.dayShapeLabel, style: context.t.label.copyWith(color: c.caption)),
                          const SizedBox(height: 4),
                          AnimatedSwitcher(
                            duration: WMotion.of(context, WMotion.base),
                            child: Text(
                              selected == EnergyMode.red
                                  ? redShape(redCount)
                                  : l.shapeLine(progress.core.toString(), progress.maintain.toString(), progress.joy.toString()),
                              key: ValueKey('${progress.core}-${progress.maintain}-$selected'),
                              style: context.t.h1.copyWith(color: c.deep),
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(shapeSub, style: context.t.caption.copyWith(color: c.caption)),
                        ],
                      ),
                    ),
                  const SizedBox(height: 12),
                  if (first != null)
                    WCard(
                      child: Row(
                        children: [
                          DomainIcon(first.domain, size: 44),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(l.firstStep, style: context.t.label.copyWith(color: c.caption)),
                                Text(first.title.of(lang), style: context.t.bodyStrong.copyWith(color: c.text)),
                                Text(first.why.text.of(lang), style: context.t.caption.copyWith(color: c.caption)),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(WSpace.page, 0, WSpace.page, 12),
              child: Column(
                children: [
                  PrimaryButton(
                    label: l.startMyDay,
                    onPressed: () async {
                      if (!answered) await pick(EnergyMode.green);
                      if (context.mounted) context.go('/today');
                    },
                  ),
                  if (morningRoutine != null && selected != EnergyMode.red)
                    SecondaryButton(
                      label: l.startMorningChainNow,
                      onPressed: () async {
                        if (!answered) await pick(EnergyMode.green);
                        if (context.mounted) {
                          context.go('/today');
                          context.push('/routine/$morningRoutine');
                        }
                      },
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _EnergyCard extends StatelessWidget {
  const _EnergyCard({required this.mode, required this.selected, required this.onTap});
  final EnergyMode mode;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final c = context.c;
    final t = c.energy(mode);
    final (IconData icon, String name, String sub) = switch (mode) {
      EnergyMode.green => (Icons.wb_sunny_outlined, l.energyGood, l.energyGoodSub),
      EnergyMode.yellow => (Icons.wb_cloudy_outlined, l.energyMid, l.energyMidSub),
      EnergyMode.red => (Icons.bedtime_outlined, l.energyLow, l.energyLowSub),
    };
    return Semantics(
      container: true,
      button: true,
      selected: selected,
      inMutuallyExclusiveGroup: true,
      label: '$name. $sub',
      excludeSemantics: true,
      child: AnimatedContainer(
        duration: WMotion.of(context, WMotion.base),
        decoration: BoxDecoration(
          color: selected ? t.bg : c.surface,
          borderRadius: WRadius.cardR,
          border: Border.all(color: selected ? t.ink : c.border, width: selected ? 2 : 1),
        ),
        child: Material(
          type: MaterialType.transparency,
          child: InkWell(
            borderRadius: WRadius.cardR,
            onTap: onTap,
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
              child: Column(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(shape: BoxShape.circle, color: selected ? c.surface : t.bg),
                    child: Icon(icon, color: t.ink, size: 22),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    name,
                    textAlign: TextAlign.center,
                    style: context.t.bodyStrong.copyWith(color: t.ink),
                  ),
                  Text(
                    sub,
                    textAlign: TextAlign.center,
                    style: context.t.label.copyWith(color: t.ink, fontWeight: FontWeight.w500),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _Sparkles extends StatelessWidget {
  const _Sparkles();

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 40,
    height: 32,
    child: Stack(
      children: [
        const PositionedDirectional(top: 0, start: 4, child: SparkIcon(size: 24)),
        PositionedDirectional(top: 14, start: 26, child: SparkIcon(size: 10, color: context.c.sky300)),
      ],
    ),
  );
}
