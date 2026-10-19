/// Cycle log (sensitive module, off by default): private dates and notes,
/// local only, optional app lock. No predictions, no scores, no diagnosis.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/date_utils.dart';
import '../../../data/models/models.dart';
import '../../../state/providers.dart';
import '../../format.dart';
import '../../theme/theme_ext.dart';
import '../../widgets/widgets.dart';
import 'sensitive_gate.dart';

class CycleScreen extends ConsumerWidget {
  const CycleScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final c = context.c;
    final s = ref.watch(settingsProvider);
    final entries = ref.watch(snapshotProvider)?.cycleEntries ?? const <CycleEntry>[];
    final today = ref.watch(todayProvider);
    final lastStart = entries.where((e) => e.kind == 'start').firstOrNull;
    final ctrl = ref.read(lifeControllerProvider.notifier);
    String kindName(String k) => switch (k) {
      'start' => l.cycleStart,
      'end' => l.cycleEnd,
      _ => l.noteLabel,
    };
    if (!s.cycleModule) {
      return HubPage(title: l.cycleTitle, children: [EmptyRestState(message: l.moduleOff)]);
    }
    return SensitiveGate(
      title: l.cycleTitle,
      child: HubPage(
        title: l.cycleTitle,
        subtitle: l.privateLocal,
        children: [
          WCard(
            color: c.tint(TintName.lilac).bg,
            borderColor: c.tint(TintName.lilac).bg,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.lock_outline_rounded, size: 18, color: c.tint(TintName.lilac).ink),
                const SizedBox(width: 8),
                Expanded(child: Text(l.cyclePrivacy, style: context.t.small.copyWith(color: c.tint(TintName.lilac).ink))),
              ],
            ),
          ),
          gap16,
          if (lastStart != null)
            WCard(
              child: Text(
                l.cycleLastStart(dayMonthKey(context, lastStart.date), '${daysBetween(parseDayKey(lastStart.date), today)}'),
                style: context.t.bodyStrong.copyWith(color: c.text),
              ),
            ),
          gap12,
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              OutlineAction(label: l.cycleStartedToday, onPressed: () => ctrl.addCycleEntry(kind: 'start')),
              OutlineAction(label: l.cycleEndedToday, onPressed: () => ctrl.addCycleEntry(kind: 'end')),
              OutlineAction(
                label: l.addNote,
                onPressed: () async {
                  final r = await showInputSheet(context, title: l.addNote, fields: [InputSpec(l.noteLabel, lines: 3)]);
                  if (r != null) await ctrl.addCycleEntry(kind: 'note', note: r[0]);
                },
              ),
            ],
          ),
          gap24,
          SectionLabel(l.cycleLog),
          gap8,
          if (entries.isEmpty)
            WCard(child: EmptyRestState(message: l.cycleEmpty))
          else
            ListCard(
              children: [
                for (final e in entries.take(30))
                  Row(
                    children: [
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(kindName(e.kind), style: context.t.small.copyWith(color: c.text, fontWeight: FontWeight.w600)),
                              Text(metaJoin([dayMonthKey(context, e.date), e.note]), style: context.t.caption.copyWith(color: c.caption)),
                            ],
                          ),
                        ),
                      ),
                      CircleIconButton(
                        icon: Icons.delete_outline_rounded,
                        filled: false,
                        label: '${l.delete} ${kindName(e.kind)}',
                        onPressed: () => ctrl.deleteCycleEntry(e.id),
                      ),
                    ],
                  ),
              ],
            ),
          gap16,
          Text(l.cycleNotMedical, style: context.t.caption.copyWith(color: c.caption)),
        ],
      ),
    );
  }
}
