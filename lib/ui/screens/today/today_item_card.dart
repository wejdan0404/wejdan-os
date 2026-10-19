/// A PlanItem bound to [HabitCard]: level selection, check/uncheck,
/// re-level, links to Focus / Why sheet.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../data/models/models.dart';
import '../../../state/providers.dart';
import '../../format.dart';
import '../../state/completion.dart';
import '../../theme/theme_ext.dart';
import '../../widgets/widgets.dart';

/// Items whose card link opens Focus Mode instead of the Why sheet.
bool opensFocus(PlanItem i) => i.actionId == 'GROW-22' || i.domain == DomainId.career || i.domain == DomainId.learning;

class TodayItemCard extends ConsumerStatefulWidget {
  const TodayItemCard({super.key, required this.item, this.simple = false});

  final PlanItem item;

  /// Maintain / Red-mode row.
  final bool simple;

  @override
  ConsumerState<TodayItemCard> createState() => _TodayItemCardState();
}

class _TodayItemCardState extends ConsumerState<TodayItemCard> {
  CompletionLevel? _picked;
  bool _busy = false;

  PlanItem get item => widget.item;

  Future<void> _guard(Future<void> Function() f) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      await f();
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final lang = context.lang;
    final snap = ref.watch(snapshotProvider);
    final log = ref.watch(todayLogsProvider)[item.itemId];
    final done = log?.isDone ?? false;
    final level = done ? log!.level : (_picked ?? item.suggestedLevel);
    final anchor = anchorOf(item, snap);
    final settings = ref.watch(settingsProvider);
    final cue = anchor == null
        ? (item.startMinute == null ? null : formatHmSafe(item.startMinute!))
        : cueLabel(context, anchor, settings, resolvedMinute: item.startMinute);
    final metaParts = <String>[
      if (!widget.simple) domainShort(context, item.domain),
      ?cue,
      levelMinutes(context, item, widget.simple ? item.suggestedLevel : level, snap),
      if (done) l.doneShort,
    ];
    final meta = metaJoin(metaParts);
    final title = item.title.of(lang);
    void toggle(Offset origin) => _guard(() async {
      if (done) {
        await Completion.uncheck(ref, log!);
      } else {
        await Completion.complete(context, ref, item, widget.simple ? item.suggestedLevel : level, origin: origin);
      }
    });
    void openWhy() => context.push('/today/why/${Uri.encodeComponent(item.itemId)}');
    final joy = item.bundleTitle == null ? null : l.joyPlus(item.bundleTitle!.of(lang));
    if (widget.simple) {
      return HabitCard.simple(
        title: title,
        meta: meta,
        done: done,
        domain: item.domain,
        checkLabel: done ? l.uncheckLabel(title) : l.checkLabel(title),
        onToggle: toggle,
        joyText: joy,
        onTap: openWhy,
      );
    }
    final focus = opensFocus(item);
    return HabitCard(
      title: title,
      meta: meta,
      done: done,
      checkLabel: done ? l.uncheckLabel(title) : l.checkLabel(title),
      onToggle: toggle,
      joyText: joy,
      why: item.why.text.of(lang),
      comeback: item.isComeback,
      linkText: focus && !done ? l.startSession : l.whyLabel,
      onLink: focus && !done ? () => context.push('/focus/${Uri.encodeComponent(item.itemId)}') : openWhy,
      level: level,
      onLevel: (lv) {
        if (done) {
          _guard(() => Completion.relevel(context, ref, item, log!, lv));
        } else {
          setState(() => _picked = lv);
        }
      },
      onTap: openWhy,
    );
  }
}

String formatHmSafe(int m) => '${(m ~/ 60 % 24).toString().padLeft(2, '0')}:${(m % 60).toString().padLeft(2, '0')}';
