/// Evening Shutdown (EveningShutdown.dc.html): leftovers → tomorrow /
/// later / let go, tomorrow's first action, optional savouring line
/// (JOY-02/03), and the wind-down chain start (BODY-17).
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

enum _Leftover { tomorrow, later, letGo }

/// Synthetic joy item used to keep the optional savouring line (earns 0).
const kSavorItemId = 'evening_savor';

class EveningShutdownScreen extends ConsumerStatefulWidget {
  const EveningShutdownScreen({super.key});

  @override
  ConsumerState<EveningShutdownScreen> createState() => _EveningShutdownScreenState();
}

class _EveningShutdownScreenState extends ConsumerState<EveningShutdownScreen> {
  final Map<String, _Leftover> _choice = {};
  String? _first;
  final _savor = TextEditingController();
  bool _saving = false;

  @override
  void dispose() {
    _savor.dispose();
    super.dispose();
  }

  Future<void> _close({bool startChain = false, String? routineId}) async {
    if (_saving) return;
    setState(() => _saving = true);
    final ctrl = ref.read(lifeControllerProvider.notifier);
    final plan = ref.read(todayPlanProvider).value;
    final today = ref.read(todayProvider);
    if (plan != null) {
      for (final e in _choice.entries) {
        if (e.value != _Leftover.letGo) continue;
        final item = plan.items.where((i) => i.itemId == e.key).firstOrNull;
        if (item != null) await ctrl.skipItem(item, note: 'evening: let go');
      }
    }
    if (_first != null) {
      final s = ref.read(settingsProvider);
      await ctrl.updateSettings(s.copyWith(firstActionPin: '${dayKey(addDays(today, 1))}|$_first'));
    }
    final line = _savor.text.trim();
    if (line.isNotEmpty) {
      await ctrl.completeItem(
        PlanItem(
          id: 'joy:$kSavorItemId',
          itemId: kSavorItemId,
          kind: PlanItemKind.joy,
          tier: PlanTier.joy,
          section: PlanSection.eveningChain,
          title: const LocalizedText(ar: 'لحظة حلوة', en: 'Savoured moment'),
          domain: DomainId.joy,
          why: plan?.items.first.why ?? const WhyToday(code: WhyCode.freeJoy, text: LocalizedText.same('')),
        ),
        CompletionLevel.normal,
        note: line,
      );
    }
    if (!mounted) return;
    if (startChain && routineId != null) {
      context.pushReplacement('/routine/$routineId');
    } else {
      context.canPop() ? context.pop() : context.go('/today');
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final c = context.c;
    final lang = context.lang;
    final plan = ref.watch(todayPlanProvider).value;
    final logs = ref.watch(todayLogsProvider);
    final today = ref.watch(todayProvider);
    final now = ref.watch(clockProvider)();
    final tomorrow = ref.watch(dayPlanProvider(addDays(today, 1)));
    final progress = ref.watch(dayProgressProvider);
    final settings = ref.watch(settingsProvider);
    final leftovers = (plan?.items ?? const <PlanItem>[])
        .where((i) => i.tier != PlanTier.chain && i.tier != PlanTier.joy && logs[i.itemId] == null)
        .toList();
    final candidates = (tomorrow?.items ?? const <PlanItem>[])
        .where((i) => i.tier == PlanTier.core || i.tier == PlanTier.maintain)
        .take(3)
        .toList();
    final firstPick = _first ?? candidates.firstOrNull?.itemId;
    final evening = (plan?.itemsIn(PlanSection.eveningChain) ?? const <PlanItem>[]);
    final eveningRoutine = evening.firstOrNull?.routineId;
    final chainMinutes = evening.fold<int>(0, (a, i) => a + i.estimatedMin);

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
                      '${dateLine(context, today)} · ${formatHm(minuteOfDay(now))}',
                      style: context.t.caption.copyWith(color: c.caption, fontWeight: FontWeight.w600),
                    ),
                  ),
                  CircleIconButton(
                    icon: Icons.close_rounded,
                    label: l.close,
                    onPressed: () => context.canPop() ? context.pop() : context.go('/today'),
                  ),
                ],
              ),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(WSpace.page, 12, WSpace.page, 16),
                children: [
                  Row(
                    children: [
                      TintIcon(Icons.nightlight_outlined, tint: c.energyRed, size: 48),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Semantics(
                              header: true,
                              child: Text(l.shutdownTitle, style: context.t.h1.copyWith(color: c.text)),
                            ),
                            if (progress != null)
                              Text(
                                l.shutdownDone(progress.done.toString(), progress.total.toString()),
                                style: context.t.caption.copyWith(color: c.caption),
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  Text(l.whatHappened, style: context.t.h2.copyWith(color: c.text)),
                  Text(l.whatHappenedSub, style: context.t.caption.copyWith(color: c.caption)),
                  const SizedBox(height: 12),
                  if (leftovers.isEmpty)
                    WCard(
                      color: c.done.bg,
                      borderColor: c.done.bg,
                      child: Row(
                        children: [
                          Icon(Icons.check_circle_outline_rounded, color: c.done.ink),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(l.noLeftovers, style: context.t.small.copyWith(color: c.done.ink)),
                          ),
                        ],
                      ),
                    ),
                  for (final i in leftovers) ...[
                    _LeftoverCard(
                      item: i,
                      choice: _choice[i.itemId] ?? _Leftover.tomorrow,
                      onChoice: (v) => setState(() => _choice[i.itemId] = v),
                    ),
                    const SizedBox(height: 10),
                  ],
                  if (candidates.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Text(l.tomorrowFirst, style: context.t.h2.copyWith(color: c.text)),
                    const SizedBox(height: 10),
                    for (final i in candidates) ...[
                      _RadioCard(
                        title: i.title.of(lang),
                        sub:
                            '${anchorOf(i, ref.watch(snapshotProvider)) == null ? '' : '${cueLabel(context, anchorOf(i, ref.watch(snapshotProvider))!, settings, resolvedMinute: i.startMinute)} · '}${l.minimumMinutes(levelMinutes(context, i, CompletionLevel.minimum, ref.watch(snapshotProvider)))}',
                        selected: firstPick == i.itemId,
                        onTap: () => setState(() => _first = i.itemId),
                      ),
                      const SizedBox(height: 10),
                    ],
                  ],
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      const SparkIcon(size: 16),
                      const SizedBox(width: 6),
                      Text(l.sweetMoment, style: context.t.h2.copyWith(color: c.text)),
                      const SizedBox(width: 6),
                      Text(l.optional, style: context.t.caption.copyWith(color: c.caption)),
                    ],
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: _savor,
                    decoration: InputDecoration(hintText: l.sweetMomentHint),
                  ),
                  if (evening.isNotEmpty) ...[
                    const SizedBox(height: 20),
                    WCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(l.eveningChainTitle, style: context.t.bodyStrong.copyWith(color: c.text)),
                              ),
                              Text(
                                l.chainAbout(chainMinutes.toString(), formatHm(settings.sleepMinute)),
                                style: context.t.caption.copyWith(color: c.caption),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              for (var k = 0; k < evening.length; k++)
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                  decoration: BoxDecoration(color: c.energyRed.bg, borderRadius: WRadius.tileR),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Container(
                                        width: 22,
                                        height: 22,
                                        alignment: Alignment.center,
                                        decoration: BoxDecoration(color: c.surface, shape: BoxShape.circle),
                                        child: Text(
                                          '${k + 1}',
                                          style: context.t.metric.copyWith(fontSize: 12, color: c.energyRed.ink),
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Text(evening[k].title.of(lang), style: context.t.label.copyWith(color: c.energyRed.ink)),
                                    ],
                                  ),
                                ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(WSpace.page, 0, WSpace.page, 12),
              child: Column(
                children: [
                  PrimaryButton(
                    label: eveningRoutine == null ? l.closeTheDay : l.startEveningChain,
                    onPressed: _saving
                        ? null
                        : () {
                            if (_first == null && firstPick != null) _first = firstPick;
                            _close(startChain: eveningRoutine != null, routineId: eveningRoutine);
                          },
                  ),
                  SecondaryButton(
                    label: l.later,
                    onPressed: _saving ? null : () => context.canPop() ? context.pop() : context.go('/today'),
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

class _LeftoverCard extends StatelessWidget {
  const _LeftoverCard({required this.item, required this.choice, required this.onChoice});
  final PlanItem item;
  final _Leftover choice;
  final ValueChanged<_Leftover> onChoice;

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final c = context.c;
    final sub = switch (choice) {
      _Leftover.tomorrow => l.leftoverTomorrowSub,
      _Leftover.later => l.leftoverLaterSub,
      _Leftover.letGo => l.leftoverLetGoSub,
    };
    Widget opt(_Leftover v, IconData icon, String label) {
      final sel = v == choice;
      return Expanded(
        child: Semantics(
          container: true,
          button: true,
          selected: sel,
          inMutuallyExclusiveGroup: true,
          label: label,
          excludeSemantics: true,
          child: Material(
            color: sel ? c.surfaceSubtle : c.surface,
            shape: RoundedRectangleBorder(
              borderRadius: WRadius.buttonR,
              side: BorderSide(color: sel ? c.sky300 : c.border),
            ),
            child: InkWell(
              borderRadius: WRadius.buttonR,
              onTap: () => onChoice(v),
              child: ConstrainedBox(
                constraints: const BoxConstraints(minHeight: WSpace.tap),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(icon, size: 16, color: sel ? c.deep : c.caption, textDirection: TextDirection.ltr),
                    const SizedBox(width: 4),
                    Flexible(
                      child: Text(
                        label,
                        style: context.t.caption.copyWith(color: sel ? c.deep : c.textSecondary, fontWeight: FontWeight.w600),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );
    }

    return WCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(item.title.of(context.lang), style: context.t.bodyStrong.copyWith(color: c.text)),
          Text('${l.notStartedToday} · $sub', style: context.t.caption.copyWith(color: c.caption)),
          const SizedBox(height: 10),
          Row(
            children: [
              opt(_Leftover.tomorrow, forwardArrow(context), l.leftoverTomorrow),
              const SizedBox(width: 8),
              opt(_Leftover.later, Icons.inventory_2_outlined, l.leftoverLater),
              const SizedBox(width: 8),
              opt(_Leftover.letGo, Icons.remove_circle_outline_rounded, l.leftoverLetGo),
            ],
          ),
        ],
      ),
    );
  }
}

class _RadioCard extends StatelessWidget {
  const _RadioCard({required this.title, required this.sub, required this.selected, required this.onTap});
  final String title;
  final String sub;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Semantics(
      container: true,
      selected: selected,
      inMutuallyExclusiveGroup: true,
      button: true,
      label: '$title. $sub',
      excludeSemantics: true,
      child: WCard(
        borderColor: selected ? c.sky300 : null,
        borderWidth: selected ? 2 : 1,
        onTap: onTap,
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: context.t.bodyStrong.copyWith(color: c.text)),
                  Text(sub, style: context.t.caption.copyWith(color: c.caption)),
                ],
              ),
            ),
            const SizedBox(width: 12),
            AnimatedContainer(
              duration: WMotion.of(context, WMotion.fast),
              width: 24,
              height: 24,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: selected ? c.primaryFill : c.sky300, width: 2),
              ),
              child: selected
                  ? Center(
                      child: Container(
                        width: 12,
                        height: 12,
                        decoration: BoxDecoration(shape: BoxShape.circle, color: c.primaryFill),
                      ),
                    )
                  : null,
            ),
          ],
        ),
      ),
    );
  }
}
