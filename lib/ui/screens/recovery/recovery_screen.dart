/// Recovery flow (Recovery.dc.html, spec §5.5): "what got in the way?" →
/// engine proposes one design change (engine/recovery.dart) → accept (or
/// edit in the Studio) → Comeback bonus on the next completion.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../data/models/models.dart';
import '../../../engine/engine.dart';
import '../../../state/providers.dart';
import '../../format.dart';
import '../../theme/theme_ext.dart';
import '../../widgets/widgets.dart';

class RecoveryScreen extends ConsumerStatefulWidget {
  const RecoveryScreen({super.key, required this.habitId});
  final String habitId;

  @override
  ConsumerState<RecoveryScreen> createState() => _RecoveryScreenState();
}

class _RecoveryScreenState extends ConsumerState<RecoveryScreen> {
  MissReason? _reason;
  DesignChange? _change;
  final _input = TextEditingController();
  bool _accepted = false;

  @override
  void dispose() {
    _input.dispose();
    super.dispose();
  }

  void _pick(MissReason r) {
    setState(() {
      _reason = r;
      _change = ref.read(lifeControllerProvider.notifier).proposeRecovery(widget.habitId, r);
      _input.clear();
    });
  }

  Future<void> _accept(Habit h) async {
    final change = _change;
    if (change == null) return;
    final ctrl = ref.read(lifeControllerProvider.notifier);
    if (!change.isMechanical && _input.text.trim().isNotEmpty) {
      final text = _input.text.trim();
      await ctrl.upsertHabit(
        change.type == DesignChangeType.addJoyPairing ? h.copyWith(joyPairing: text) : h.copyWith(frictionDown: text),
        force: true,
      );
    }
    await ctrl.acceptDesignChange(change);
    if (!mounted) return;
    final size = MediaQuery.sizeOf(context);
    CelebrationBurst.show(context, Offset(size.width / 2, size.height * .3), variant: BurstVariant.orbit, strong: true);
    setState(() => _accepted = true);
  }

  String _changeTitle(DesignChangeType t) {
    final l = context.l;
    return switch (t) {
      DesignChangeType.moveCueAddReminder => l.changeMoveCueAddReminder,
      DesignChangeType.swapTime => l.changeSwapTime,
      DesignChangeType.shrinkToMinimum => l.changeShrinkToMinimum,
      DesignChangeType.minimumAndMoveEarlier => l.changeMinimumAndMoveEarlier,
      DesignChangeType.addJoyPairing => l.changeAddJoyPairing,
      DesignChangeType.changePlacePrepare => l.changeChangePlacePrepare,
      DesignChangeType.shrinkAndReschedule => l.changeShrinkAndReschedule,
      DesignChangeType.pauseToRest => l.changePauseToRest,
    };
  }

  String _reasonLabel(MissReason r) {
    final l = context.l;
    return switch (r) {
      MissReason.forgot => l.missForgot,
      MissReason.badTime => l.missBadTime,
      MissReason.tooBig => l.missTooBig,
      MissReason.tired => l.missTired,
      MissReason.notEnjoyable => l.missNotEnjoyable,
      MissReason.placeDidntFit => l.missPlaceDidntFit,
      MissReason.busy => l.missBusy,
      MissReason.notImportantNow => l.missNotImportantNow,
    };
  }

  /// "بعد العصر · 20 د" style description of the habit's design.
  String _describe(Habit h, {int? minute, bool minimum = false, List<int>? days}) {
    final s = ref.read(settingsProvider);
    final anchor = minute == null ? h.schedule.anchor : CueAnchor.at(minute);
    final parts = [
      cueLabel(
        context,
        anchor,
        s,
        resolvedMinute: minute ?? AnchorResolver.fromSettings(s).resolve(h.schedule.anchor, ref.read(todayProvider)),
      ),
      minutesText(context, minimum ? h.minimumDurationMin : h.durationMin),
      if (days != null) context.l.daysPerWeek(days.length.toString()),
    ];
    return metaJoin(parts);
  }

  String _after(Habit h, DesignChange ch) {
    final l = context.l;
    return switch (ch.type) {
      DesignChangeType.moveCueAddReminder => '${_describe(h)} · ${l.oneReminderOn}',
      DesignChangeType.swapTime => _describe(h, minute: ch.suggestedMinute),
      DesignChangeType.shrinkToMinimum => l.afterShrink(_describe(h, minimum: true)),
      DesignChangeType.minimumAndMoveEarlier => _describe(h, minute: ch.suggestedMinute, minimum: true),
      DesignChangeType.shrinkAndReschedule => _describe(h, minimum: true, days: ch.suggestedWeekdays),
      DesignChangeType.addJoyPairing => l.afterJoy,
      DesignChangeType.changePlacePrepare => l.afterPlace,
      DesignChangeType.pauseToRest => l.afterRest,
    };
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final c = context.c;
    final h = ref.watch(snapshotProvider)?.habit(widget.habitId);
    void close() => context.canPop() ? context.pop() : context.go('/today');
    if (h == null) {
      return Scaffold(
        body: SafeArea(
          child: Center(child: EmptyRestState(message: l.itemNotFound)),
        ),
      );
    }
    final title = context.lang == AppLanguage.ar ? h.titleAr : h.titleEn;
    final trigger = ref.watch(recoveryTriggersProvider).where((t) => t.habitId == h.id).firstOrNull;
    final change = _change;

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(WSpace.page, 12, WSpace.page, 0),
              child: Row(
                children: [
                  DomainIcon(h.domain, size: 28),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      trigger == null ? title : l.recoveryContext(title, trigger.missedDays.length.toString()),
                      style: context.t.caption.copyWith(color: c.caption),
                    ),
                  ),
                  CircleIconButton(icon: Icons.close_rounded, label: l.close, onPressed: close),
                ],
              ),
            ),
            Expanded(
              child: _accepted
                  ? _Done(onBack: close)
                  : ListView(
                      padding: const EdgeInsets.fromLTRB(WSpace.page, 16, WSpace.page, 16),
                      children: [
                        Semantics(
                          header: true,
                          child: Text(l.recoveryQuestion, style: context.t.display.copyWith(color: c.text)),
                        ),
                        const SizedBox(height: 4),
                        Text(l.recoverySub, style: context.t.body.copyWith(color: c.textSecondary)),
                        const SizedBox(height: 16),
                        Wrap(
                          spacing: 8,
                          runSpacing: 4,
                          children: [
                            for (final r in MissReason.values)
                              WChoiceChip(label: _reasonLabel(r), selected: _reason == r, onTap: () => _pick(r)),
                          ],
                        ),
                        const SizedBox(height: 20),
                        AnimatedSwitcher(
                          duration: WMotion.of(context, WMotion.base),
                          child: change == null
                              ? const SizedBox.shrink()
                              : WCard(
                                  key: ValueKey(change.type),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.stretch,
                                    children: [
                                      Row(
                                        children: [
                                          Icon(Icons.lightbulb_outline_rounded, size: 16, color: c.caption),
                                          const SizedBox(width: 6),
                                          Text(l.proposedChange, style: context.t.label.copyWith(color: c.caption)),
                                        ],
                                      ),
                                      const SizedBox(height: 6),
                                      Text(_changeTitle(change.type), style: context.t.h2.copyWith(color: c.text)),
                                      const SizedBox(height: 12),
                                      _BeforeAfter(label: l.before, text: _describe(h), tint: c.rest),
                                      const SizedBox(height: 8),
                                      _BeforeAfter(label: l.after, text: _after(h, change), tint: c.done),
                                      if (!change.isMechanical) ...[
                                        const SizedBox(height: 12),
                                        TextField(
                                          controller: _input,
                                          decoration: InputDecoration(
                                            hintText: change.type == DesignChangeType.addJoyPairing
                                                ? l.joyPairingHint
                                                : l.placeHint,
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                ),
                        ),
                      ],
                    ),
            ),
            if (!_accepted)
              Padding(
                padding: const EdgeInsets.fromLTRB(WSpace.page, 0, WSpace.page, 12),
                child: Column(
                  children: [
                    PrimaryButton(label: l.acceptChange, onPressed: change == null ? null : () => _accept(h)),
                    SecondaryButton(
                      label: l.editMyself,
                      onPressed: () => context.push('/studio?habit=${Uri.encodeComponent(h.id)}'),
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

class _BeforeAfter extends StatelessWidget {
  const _BeforeAfter({required this.label, required this.text, required this.tint});
  final String label;
  final String text;
  final Tint tint;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
    decoration: BoxDecoration(color: tint.bg, borderRadius: WRadius.tileR),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 44,
          child: Text(label, style: context.t.caption.copyWith(color: context.c.caption)),
        ),
        Expanded(
          child: Text(
            text,
            style: context.t.caption.copyWith(color: tint.ink, fontWeight: FontWeight.w600),
          ),
        ),
      ],
    ),
  );
}

class _Done extends StatelessWidget {
  const _Done({required this.onBack});
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    return Center(
      child: EmptyRestState(
        title: l.comebackCelebration,
        message: l.recoveryDoneBody,
        action: PrimaryButton(label: l.backToToday, expand: false, onPressed: onBack),
      ),
    );
  }
}
