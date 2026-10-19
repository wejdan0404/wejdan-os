/// Building blocks of the Today screen (Main.dc.html / TodayRed.dc.html).
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/date_utils.dart';
import '../../../data/models/models.dart';
import '../../../engine/engine.dart';
import '../../../state/providers.dart';
import '../../format.dart';
import '../../state/completion.dart';
import '../../state/ui_providers.dart';
import '../../theme/theme_ext.dart';
import '../../widgets/widgets.dart';

/// Header row 2: energy chip · momentum ring · sparks.
class TodayStatusRow extends ConsumerWidget {
  const TodayStatusRow({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final energy = ref.watch(energyTodayProvider);
    final momentum = ref.watch(weekMomentumProvider);
    final sparks = ref.watch(sparksBalanceProvider);
    final chip = EnergyChip(mode: energy, onTap: () => context.push('/brief'));
    final stats = [
      MomentumRing(value: momentum, semanticLabel: l.weekMomentumOneLine),
      const SizedBox(width: 6),
      ExcludeSemantics(
        child: Text(l.weekMomentum, style: context.t.label.copyWith(color: context.c.caption)),
      ),
      const SizedBox(width: 8),
      SparkBadge(count: sparks, onTap: () => context.go('/joy')),
    ];
    // Large Dynamic Type: chip and stats wrap onto two lines (no squeeze).
    if (largeText(context)) {
      return Wrap(
        spacing: 8,
        runSpacing: 8,
        crossAxisAlignment: WrapCrossAlignment.center,
        children: [chip, Row(mainAxisSize: MainAxisSize.min, children: stats)],
      );
    }
    return Row(
      children: [
        Expanded(child: Align(alignment: AlignmentDirectional.centerStart, child: chip)),
        const SizedBox(width: 8),
        ...stats,
      ],
    );
  }
}

/// "يومك جاهز" — counts by tier + progress.
class DayShapeCard extends ConsumerWidget {
  const DayShapeCard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = ref.watch(dayProgressProvider);
    final energy = ref.watch(energyTodayProvider);
    if (p == null) return const SizedBox.shrink();
    final l = context.l;
    final c = context.c;
    final subtitle = switch (energy) {
      EnergyMode.green => l.dayReadySubGreen,
      EnergyMode.yellow => l.dayReadySubYellow,
      EnergyMode.red => l.dayReadySubRed,
    };
    Widget tile(int n, String label, Tint t) => Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(color: t.bg, borderRadius: WRadius.tileR),
        child: Wrap(
          crossAxisAlignment: WrapCrossAlignment.end,
          spacing: 6,
          children: [
            Text(
              '$n',
              style: context.t.metric.copyWith(fontSize: 22, height: 28 / 22, color: t.ink),
            ),
            Padding(
              padding: const EdgeInsets.only(bottom: 2),
              child: Text(label, style: context.t.caption.copyWith(color: t.ink)),
            ),
          ],
        ),
      ),
    );
    return WCard(
      semanticLabel: l.dayShapeLabel,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(l.dayReady, style: context.t.h2.copyWith(color: c.text)),
                    const SizedBox(height: 2),
                    Text(subtitle, style: context.t.caption.copyWith(color: c.caption)),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Text(
                l.doneOf(p.done.toString(), p.total.toString()),
                style: context.t.caption.copyWith(color: c.accentText, fontWeight: FontWeight.w600),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              tile(p.core, l.tilesCore, c.info),
              const SizedBox(width: 8),
              tile(p.maintain, l.tilesMaintain, c.rest),
              const SizedBox(width: 8),
              tile(p.joy, l.tilesJoy, c.joy),
            ],
          ),
          const SizedBox(height: 14),
          WProgressBar(value: p.fraction, semanticLabel: l.dayProgress),
        ],
      ),
    );
  }
}

/// Morning / evening chain summary with step chips; opens the player.
class ChainCard extends ConsumerWidget {
  const ChainCard({super.key, required this.items, required this.routineId});

  final List<PlanItem> items;
  final String routineId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final c = context.c;
    final lang = context.lang;
    final logs = ref.watch(todayLogsProvider);
    final routine = ref.watch(snapshotProvider)?.routines.where((r) => r.id == routineId).firstOrNull;
    final done = items.where((i) => logs[i.itemId]?.isDone ?? false).length;
    final all = done == items.length && items.isNotEmpty;
    final firstLog = items.map((i) => logs[i.itemId]).whereType<LogEntry>().where((x) => x.minuteOfDay != null).toList()
      ..sort((a, b) => a.minuteOfDay!.compareTo(b.minuteOfDay!));
    final start = items.first.startMinute;
    final status = all
        ? l.chainDone(done.toString(), items.length.toString(), firstLog.isEmpty ? '' : formatHm(firstLog.first.minuteOfDay!))
        : l.chainProgress(done.toString(), items.length.toString(), start == null ? '' : formatHm(start));
    final title = routine == null ? '' : (lang == AppLanguage.ar ? routine.titleAr : routine.titleEn);
    return WCard(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      onTap: () => context.push('/routine/$routineId'),
      semanticLabel: title,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              all
                  ? TintIcon(Icons.check_rounded, tint: c.done)
                  : TintIcon(
                      items.first.section == PlanSection.eveningChain ? Icons.nightlight_outlined : Icons.wb_twilight_rounded,
                      tint: items.first.section == PlanSection.eveningChain ? c.energyRed : c.info,
                    ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: context.t.bodyStrong.copyWith(color: c.text)),
                    Text(status, style: context.t.caption.copyWith(color: c.caption)),
                  ],
                ),
              ),
              CircleIconButton(
                icon: forwardIcon(context),
                label: l.openChain(title),
                filled: false,
                iconColor: c.accentText,
                onPressed: () => context.push('/routine/$routineId'),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [for (final i in items) _StepChip(label: i.title.of(lang), done: logs[i.itemId]?.isDone ?? false)],
          ),
        ],
      ),
    );
  }
}

class _StepChip extends StatelessWidget {
  const _StepChip({required this.label, required this.done});
  final String label;
  final bool done;

  @override
  Widget build(BuildContext context) {
    final t = done ? context.c.done : context.c.rest;
    return Container(
      constraints: const BoxConstraints(minHeight: 28),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: t.bg, borderRadius: WRadius.pillR),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (done) ...[Icon(Icons.check_rounded, size: 14, color: t.ink), const SizedBox(width: 4)],
          Flexible(
            child: Text(label, style: context.t.label.copyWith(color: t.ink)),
          ),
        ],
      ),
    );
  }
}

/// Free Joy card — never gated; logging earns nothing (ENG-09).
class FreeJoyCard extends ConsumerWidget {
  const FreeJoyCard({super.key, required this.item});
  final PlanItem item;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final c = context.c;
    final log = ref.watch(todayLogsProvider)[item.itemId];
    final done = log?.isDone ?? false;
    final title = item.title.of(context.lang);
    final joy = c.joy;
    return WCard(
      color: joy.bg,
      borderColor: c.isDark ? joy.ink.withValues(alpha: .35) : joy.bg,
      glow: done,
      child: Row(
        children: [
          CheckButton(
            done: done,
            joy: true,
            label: done ? l.uncheckLabel(title) : l.joyCheckLabel(title),
            onToggle: (o) async {
              if (done) {
                await Completion.uncheck(ref, log!);
              } else {
                await Completion.complete(context, ref, item, CompletionLevel.normal, origin: o);
              }
            },
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: context.t.bodyStrong.copyWith(color: c.text)),
                Text(l.freeJoySub, style: context.t.caption.copyWith(color: joy.ink)),
              ],
            ),
          ),
          const SizedBox(width: 12),
          TintIcon(Icons.local_cafe_outlined, tint: Tint(c.surface, joy.ink)),
        ],
      ),
    );
  }
}

/// "هذا الأسبوع" strip: weekly tasks open this week (2-column grid).
class ThisWeekStrip extends ConsumerWidget {
  const ThisWeekStrip({super.key, required this.items});
  final List<PlanItem> items;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final snap = ref.watch(snapshotProvider);
    final l = context.l;
    final c = context.c;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionLabel(l.thisWeekStrip),
        const SizedBox(height: 8),
        LayoutBuilder(
          builder: (context, box) {
            final w = (box.maxWidth - 8) / 2;
            return Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final i in items)
                  SizedBox(
                    width: MediaQuery.textScalerOf(context).scale(10) > 13 ? box.maxWidth : w,
                    child: WCard(
                      padding: const EdgeInsets.all(12),
                      onTap: () => context.push('/today/why/${Uri.encodeComponent(i.itemId)}'),
                      semanticLabel: i.title.of(context.lang),
                      child: Row(
                        children: [
                          DomainIcon(i.domain, size: 36),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  i.title.of(context.lang),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: context.t.small.copyWith(fontWeight: FontWeight.w600, color: c.text),
                                ),
                                Text(
                                  '${_dayOf(context, i, snap)} · ${minutesText(context, i.estimatedMin)}',
                                  style: context.t.label.copyWith(color: c.caption),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            );
          },
        ),
      ],
    );
  }

  String _dayOf(BuildContext context, PlanItem i, LifeSnapshot? s) {
    final t = s?.weeklyTasks.where((t) => t.id == i.itemId).firstOrNull;
    if (t == null || t.preferredWeekdays.isEmpty) return context.l.thisWeekAnyDay;
    return weekdayName(t.preferredWeekdays.first).of(context.lang);
  }
}

/// Recovery invitation (spec §5.5) — gentle, never a red state.
class RecoveryBanner extends ConsumerWidget {
  const RecoveryBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final triggers = ref.watch(recoveryTriggersProvider);
    final snap = ref.watch(snapshotProvider);
    final t = triggers.where((t) => t.kind == RecoveryTriggerKind.coreHabitMissed && t.habitId != null).firstOrNull;
    if (t == null || snap == null) return const SizedBox.shrink();
    final h = snap.habit(t.habitId!);
    if (h == null) return const SizedBox.shrink();
    final l = context.l;
    final c = context.c;
    final title = context.lang == AppLanguage.ar ? h.titleAr : h.titleEn;
    return WCard(
      color: c.energyRed.bg,
      borderColor: c.energyRed.bg,
      onTap: () => context.push('/recovery/${h.id}'),
      child: Row(
        children: [
          TintIcon(Icons.autorenew_rounded, tint: Tint(c.surface, c.energyRed.ink)),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(l.recoveryBannerTitle(title), style: context.t.bodyStrong.copyWith(color: c.text)),
                Text(l.recoveryBannerSub, style: context.t.caption.copyWith(color: c.textSecondary)),
              ],
            ),
          ),
          Icon(forwardIcon(context), color: c.accentText, textDirection: TextDirection.ltr),
        ],
      ),
    );
  }
}

/// Help & Safety (JOY-13) — static, reachable from Red mode.
class HelpSafetySheet extends StatelessWidget {
  const HelpSafetySheet({super.key});

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final c = context.c;
    return WSheet(
      title: l.helpSafetyLink,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(l.helpIntro, style: context.t.body.copyWith(color: c.textSecondary)),
          const SizedBox(height: 16),
          WCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(l.helpMoh, style: context.t.bodyStrong.copyWith(color: c.text)),
                const SizedBox(height: 8),
                Text(l.helpEmergency, style: context.t.bodyStrong.copyWith(color: c.text)),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Text(l.helpNote, style: context.t.caption.copyWith(color: c.caption)),
        ],
      ),
    );
  }
}

/// Quick Add (+): new habit (Studio), one-off fixed block today, focus now.
class QuickAddSheet extends ConsumerWidget {
  const QuickAddSheet({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final c = context.c;
    Widget option(IconData icon, Tint tint, String title, String sub, VoidCallback onTap) => Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: WCard(
        onTap: onTap,
        semanticLabel: title,
        child: Row(
          children: [
            TintIcon(icon, tint: tint),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: context.t.bodyStrong.copyWith(color: c.text)),
                  Text(sub, style: context.t.caption.copyWith(color: c.caption)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
    return WSheet(
      title: l.quickAddTitle,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          option(Icons.eco_outlined, c.done, l.quickAddHabit, l.quickAddHabitSub, () {
            Navigator.of(context).pop();
            context.push('/studio');
          }),
          option(Icons.event_outlined, c.info, l.quickAddBlock, l.quickAddBlockSub, () async {
            final added = await _addBlock(context, ref);
            if (added && context.mounted) Navigator.of(context).pop();
          }),
          option(Icons.timer_outlined, c.tint(TintName.sand), l.quickAddFocus, l.quickAddFocusSub, () {
            Navigator.of(context).pop();
            context.push('/focus/free');
          }),
        ],
      ),
    );
  }

  Future<bool> _addBlock(BuildContext context, WidgetRef ref) async {
    final l = context.l;
    final title = TextEditingController();
    final now = TimeOfDay.now();
    var start = TimeOfDay(hour: (now.hour + 1) % 24, minute: 0);
    var minutes = 60;
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setState) => AlertDialog(
          title: Text(l.quickAddBlock),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextField(
                controller: title,
                autofocus: true,
                decoration: InputDecoration(hintText: l.blockTitleHint),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 4,
                children: [
                  WChoiceChip(
                    label: l.startsAt(formatHm(start.hour * 60 + start.minute)),
                    selected: true,
                    icon: Icons.schedule_rounded,
                    onTap: () async {
                      final t = await showTimePicker(context: ctx, initialTime: start);
                      if (t != null) setState(() => start = t);
                    },
                  ),
                  for (final m in const [30, 60, 90])
                    WChoiceChip(label: minutesText(ctx, m), selected: minutes == m, onTap: () => setState(() => minutes = m)),
                ],
              ),
            ],
          ),
          actions: [
            SecondaryButton(label: l.cancel, onPressed: () => Navigator.pop(ctx, false)),
            SecondaryButton(label: l.save, onPressed: () => Navigator.pop(ctx, true)),
          ],
        ),
      ),
    );
    if (ok != true || title.text.trim().isEmpty) return false;
    final ctrl = ref.read(lifeControllerProvider.notifier);
    final s = start.hour * 60 + start.minute;
    await ctrl.upsertFixedEvent(
      FixedEvent(
        id: ctrl.newId('fx'),
        title: title.text.trim(),
        startMinute: s,
        endMinute: (s + minutes).clamp(0, 24 * 60 - 1),
        date: dayKey(ref.read(todayProvider)),
      ),
    );
    return true;
  }
}
