/// UI glue for logging: complete → celebration + haptic + undo snackbar
/// (10 s, spec §5.2); uncheck / change level via undo + re-log.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/models/models.dart';
import '../../l10n/app_localizations.dart';
import '../../state/providers.dart';
import '../theme/theme_ext.dart';
import '../widgets/widgets.dart';

class Completion {
  Completion._();

  /// Logs [item] at [level]; plays the burst from [origin] and shows the
  /// undo snackbar. Returns the result (null if the controller isn't ready).
  static Future<CompletionResult?> complete(
    BuildContext context,
    WidgetRef ref,
    PlanItem item,
    CompletionLevel level, {
    Offset? origin,
    int? durationMin,
    String? note,
    bool celebrate = true,
    bool snackbar = true,
  }) async {
    final ctrl = ref.read(lifeControllerProvider.notifier);
    if (ref.read(lifeControllerProvider).value == null) return null;
    final messenger = ScaffoldMessenger.maybeOf(context);
    final l = context.l;
    if (celebrate && origin != null) {
      CelebrationBurst.show(context, origin, strong: item.isComeback);
    }
    final r = await ctrl.completeItem(item, level, durationMin: durationMin, note: note);
    if (snackbar && messenger != null) {
      final sparks = r.award.amount;
      final msg = r.isComeback
          ? l.comebackCelebration
          : (item.kind == PlanItemKind.joy ? l.joyLogged : l.doneLogged(levelLabel(l, level)));
      // Undo lives exactly kUndoWindow from the log (spec §5.2). An action
      // SnackBar persists by default (a11y), so persist is off; its display
      // timer starts after the 250 ms entrance, so that is subtracted and
      // the bar starts leaving at the deadline. A late tap gets feedback.
      // The undo target is ≥ 44 pt.
      const entrance = Duration(milliseconds: 250);
      final remaining = r.undoUntil.difference(ref.read(clockProvider)()) - entrance;
      messenger.hideCurrentSnackBar();
      messenger.showSnackBar(
        SnackBar(
          duration: remaining.isNegative ? Duration.zero : remaining,
          persist: false,
          content: _SnackContent(
            message: msg,
            sparks: sparks,
            undoLabel: l.undo,
            onUndo: () async {
              messenger.hideCurrentSnackBar();
              final ok = await ctrl.undo(r.log.id);
              if (!ok) {
                messenger.showSnackBar(SnackBar(content: Text(l.undoExpired), duration: const Duration(seconds: 4)));
              }
            },
          ),
        ),
      );
    }
    return r;
  }

  /// Unchecks a done item (reverses its Sparks). Outside the 10 s window
  /// this is an explicit correction, so the window is ignored.
  static Future<void> uncheck(WidgetRef ref, LogEntry log) async {
    await ref.read(lifeControllerProvider.notifier).undo(log.id, ignoreWindow: true);
  }

  /// Changes the level of an already-logged item: undo + re-log, quietly.
  static Future<void> relevel(BuildContext context, WidgetRef ref, PlanItem item, LogEntry log, CompletionLevel level) async {
    final ctrl = ref.read(lifeControllerProvider.notifier);
    await ctrl.undo(log.id, ignoreWindow: true);
    if (!context.mounted) return;
    await ctrl.completeItem(item, level, durationMin: log.durationMin, note: log.note);
  }

  static String levelLabel(AppLocalizations l, CompletionLevel level) => switch (level) {
    CompletionLevel.minimum => l.levelShortMin,
    CompletionLevel.normal => l.levelShortNormal,
    CompletionLevel.bonus => l.levelShortBonus,
    CompletionLevel.skipped => l.levelSkipped,
  };
}

class _SnackContent extends StatelessWidget {
  const _SnackContent({required this.message, required this.sparks, required this.undoLabel, required this.onUndo});
  final String message;
  final int sparks;
  final String undoLabel;
  final VoidCallback onUndo;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context).snackBarTheme;
    final style = theme.contentTextStyle;
    return Row(
      children: [
        Expanded(child: Text(message, style: style)),
        if (sparks > 0) ...[
          const SizedBox(width: 8),
          const SparkIcon(size: 14),
          const SizedBox(width: 4),
          Text(
            '+$sparks',
            textDirection: TextDirection.ltr,
            style: style?.copyWith(fontFamily: kFontEn, fontWeight: FontWeight.w600),
          ),
        ],
        const SizedBox(width: 4),
        TextButton(
          onPressed: onUndo,
          style: TextButton.styleFrom(
            minimumSize: const Size(WSpace.tap, WSpace.tap),
            foregroundColor: theme.actionTextColor,
            padding: const EdgeInsets.symmetric(horizontal: 12),
          ),
          child: Text(undoLabel),
        ),
      ],
    );
  }
}
