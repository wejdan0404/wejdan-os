/// "بداية جديدة" card (JOY-10): shown on Today on a week / month / season
/// landmark and in the Weekly Review when tomorrow is one. Gentle, optional,
/// dismissible — nothing resets.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/date_utils.dart';
import '../../../engine/engine.dart';
import '../../../state/providers.dart';
import '../../theme/theme_ext.dart';
import '../../widgets/widgets.dart';

class FreshStartCard extends ConsumerWidget {
  const FreshStartCard({super.key, required this.fresh, this.tomorrow = false});

  final FreshStart fresh;

  /// Weekly Review variant ("tomorrow is a fresh start"): no dismiss/action.
  final bool tomorrow;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final c = context.c;
    final body = switch (fresh.kind) {
      FreshStartKind.newSeason => l.freshSeason,
      FreshStartKind.newMonth => tomorrow ? l.freshMonthTomorrow : l.freshMonth,
      FreshStartKind.newWeek => tomorrow ? l.freshWeekTomorrow : l.freshWeek,
    };
    final t = c.tint(TintName.sky);
    return WCard(
      color: t.bg,
      borderColor: t.bg,
      semanticLabel: l.freshStartTitle,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              SparkIcon(size: 16, color: t.ink),
              const SizedBox(width: 8),
              Expanded(child: Text(l.freshStartTitle, style: context.t.bodyStrong.copyWith(color: t.ink))),
              if (!tomorrow)
                CircleIconButton(
                  icon: Icons.close_rounded,
                  filled: false,
                  iconColor: t.ink,
                  label: l.freshDismiss,
                  onPressed: () {
                    final ms = ref.read(moduleStateProvider);
                    ref.read(lifeControllerProvider.notifier).updateModuleState(
                      ms.copyWith(freshStartDismissed: dayKey(ref.read(todayProvider))),
                    );
                  },
                ),
            ],
          ),
          Text(body, style: context.t.small.copyWith(color: c.textSecondary)),
          if (!tomorrow)
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: SecondaryButton(small: true, label: l.freshAction, onPressed: () => context.push('/review?step=4')),
            ),
        ],
      ),
    );
  }
}
