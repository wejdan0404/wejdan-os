/// Insights (spec §7.13) — momentum by domain, recovery speed trend, best
/// times, experiment result, system burden. Every chart value is written as
/// text; each block has a caption and an empty state when data is thin.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/date_utils.dart';
import '../../../data/models/models.dart';
import '../../../engine/engine.dart';
import '../../../state/providers.dart';
import '../../format.dart';
import '../../theme/theme_ext.dart';
import '../../widgets/widgets.dart';
import '../review/weekly_review_screen.dart' show ExperimentResultCard;

class InsightsScreen extends ConsumerWidget {
  const InsightsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    return HubPage(
      title: l.insights,
      subtitle: l.insightsSub,
      children: const [
        _DomainMomentum(),
        gap16,
        _Recovery(),
        gap16,
        _BestTimes(),
        gap16,
        _ExperimentBlock(),
        gap16,
        _Burden(),
      ],
    );
  }
}

class _Block extends StatelessWidget {
  const _Block({required this.title, required this.children});
  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => WCard(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(child: Semantics(header: true, child: Text(title, style: context.t.h2.copyWith(color: context.c.text)))),
          ],
        ),
        gap12,
        ...children,
      ],
    ),
  );
}

Widget _caption(BuildContext context, String s) => Padding(
  padding: const EdgeInsets.only(top: 8),
  child: Text(s, style: context.t.caption.copyWith(color: context.c.caption)),
);

class _DomainMomentum extends ConsumerWidget {
  const _DomainMomentum();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final s = ref.watch(snapshotProvider);
    final domains = (s?.domains ?? const <Domain>[])
        .where((d) => d.enabled && (s?.habits.any((h) => h.isActive && h.domain == d.id) ?? false))
        .toList();
    final hasLogs = (s?.logs ?? const []).any((x) => x.isDone);
    final rows = [for (final d in domains) (d, ref.watch(domainMomentumProvider(d.id)))]..sort((a, b) => b.$2.compareTo(a.$2));
    return _Block(
      title: l.momentumByDomain,
      children: [
        if (!hasLogs || rows.isEmpty)
          Text(l.notEnoughData, style: context.t.small.copyWith(color: context.c.caption))
        else
          for (final (d, v) in rows) LabelledBar(label: domainShort(context, d.id), fraction: v / 100, valueText: '${v.round()}'),
        _caption(context, l.momentumCaption),
      ],
    );
  }
}

class _Recovery extends ConsumerWidget {
  const _Recovery();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final c = context.c;
    final s = ref.watch(snapshotProvider);
    final weeks = s == null
        ? const <double?>[]
        : recoverySpeedByWeek(
            habits: ref.watch(coreHabitsProvider),
            logs: s.logs,
            today: ref.watch(todayProvider),
            weekStartsOn: s.settings.weekStartsOn,
          );
    final any = weeks.any((w) => w != null);
    final maxV = weeks.whereType<double>().fold<double>(1, (a, b) => b > a ? b : a);
    return _Block(
      title: l.recoverySpeed,
      children: [
        Text(l.recoverySpeedSub, style: context.t.small.copyWith(color: c.textSecondary)),
        gap12,
        if (!any)
          Text(l.recoveryEmpty, style: context.t.small.copyWith(color: c.caption))
        else
          Semantics(
            label: [
              for (final (i, w) in weeks.indexed) '${l.weekShort('${i + 1}')}: ${w == null ? l.noReturn : w.toStringAsFixed(1)}',
            ].join('، '),
            excludeSemantics: true,
            child: SizedBox(
              height: 150,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  for (final (i, w) in weeks.indexed) ...[
                    if (i > 0) const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          Text(w == null ? '—' : w.toStringAsFixed(1), textDirection: TextDirection.ltr,
                              style: context.t.metric.copyWith(fontSize: 14, color: c.text)),
                          const SizedBox(height: 4),
                          Container(
                            height: w == null ? 4 : 8 + 88 * (w / maxV),
                            decoration: BoxDecoration(
                              color: i == weeks.length - 1 ? c.primaryFill : c.sky300,
                              borderRadius: const BorderRadius.vertical(top: Radius.circular(8)),
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(i == weeks.length - 1 ? l.thisWeekShort : l.weekShort('${i + 1}'),
                              style: context.t.label.copyWith(color: c.caption)),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        _caption(context, l.recoveryCaption),
      ],
    );
  }
}

class _BestTimes extends ConsumerWidget {
  const _BestTimes();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final c = context.c;
    final lang = context.lang;
    final s = ref.watch(snapshotProvider);
    final today = ref.watch(todayProvider);
    final rows = [
      for (final h in ref.watch(coreHabitsProvider))
        if (s != null)
          if (bestTimeWindow(logs: s.logs, itemId: h.id, today: today) case final w?) (h, w),
    ];
    return _Block(
      title: l.bestTimes,
      children: [
        if (rows.isEmpty)
          Text(l.bestTimesEmpty, style: context.t.small.copyWith(color: c.caption))
        else
          for (final (i, (h, w)) in rows.indexed) ...[
            if (i > 0) const RowDivider(),
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 10),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(lang == AppLanguage.ar ? h.titleAr : h.titleEn, style: context.t.bodyStrong.copyWith(color: c.text)),
                        Text(l.fromNTimes('${w.samples}'), style: context.t.caption.copyWith(color: c.caption)),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(color: c.surfaceSubtle, borderRadius: WRadius.pillR),
                    child: Text('${formatHm(w.start)}–${formatHm(w.end)}', textDirection: TextDirection.ltr,
                        style: context.t.metric.copyWith(fontSize: 14, color: c.deep)),
                  ),
                ],
              ),
            ),
          ],
        _caption(context, l.bestTimesCaption),
      ],
    );
  }
}

class _ExperimentBlock extends ConsumerWidget {
  const _ExperimentBlock();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final exps = [...(ref.watch(snapshotProvider)?.experiments ?? const <Experiment>[])]
      ..removeWhere((e) => e.startDate == null)
      ..sort((a, b) => (b.startDate ?? '').compareTo(a.startDate ?? ''));
    final e = exps.firstOrNull;
    if (e == null) {
      return _Block(title: l.experimentsTitle, children: [Text(l.experimentsEmpty, style: context.t.small.copyWith(color: context.c.caption))]);
    }
    return ExperimentResultCard(experiment: e);
  }
}

class _Burden extends ConsumerWidget {
  const _Burden();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final c = context.c;
    final s = ref.watch(snapshotProvider);
    if (s == null) return const SizedBox.shrink();
    final b = systemBurden(logs: s.logs, reviews: s.weeklyReviews, today: ref.watch(todayProvider), weekStartsOn: s.settings.weekStartsOn);
    return _Block(
      title: l.systemBurden,
      children: [
        Text(l.burdenSub, style: context.t.small.copyWith(color: c.textSecondary)),
        gap12,
        Row(
          children: [
            Expanded(child: StatTile(value: '${b.logCount}', label: l.burdenLogs)),
            const SizedBox(width: 8),
            Expanded(child: StatTile(value: b.reviewMinutes == null ? '—' : '${b.reviewMinutes}', label: l.burdenReview)),
          ],
        ),
        _caption(context, l.burdenCaption),
      ],
    );
  }
}

/// Short week label helper for other screens.
String weekKeyLabel(BuildContext context, String key) => dayMonth(context, parseDayKey(key));
