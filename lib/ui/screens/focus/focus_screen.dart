/// Focus Mode (Focus.dc.html): single task, 25/50 timer, attempt-first
/// note (GROW-05), phone-away prompt, retrieval check at the end (GROW-01),
/// logs the real duration. While running, a Focus block suppresses nudges.
library;

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/date_utils.dart';
import '../../../data/models/models.dart';
import '../../../state/providers.dart';
import '../../format.dart';
import '../../state/completion.dart';
import '../../state/ui_providers.dart';
import '../../theme/theme_ext.dart';
import '../../widgets/widgets.dart';

enum _Phase { ready, running, paused }

class FocusScreen extends ConsumerStatefulWidget {
  const FocusScreen({super.key, required this.itemId});

  /// Plan item to log, or `free` for an unlinked session.
  final String itemId;

  @override
  ConsumerState<FocusScreen> createState() => _FocusScreenState();
}

class _FocusScreenState extends ConsumerState<FocusScreen> {
  int _minutes = 25;
  _Phase _phase = _Phase.ready;
  Duration _elapsed = Duration.zero;
  Timer? _ticker;
  bool _phoneAway = false;
  bool _attemptOpen = false;
  final _attempt = TextEditingController();
  String? _blockId;
  late final LifeController _ctrl = ref.read(lifeControllerProvider.notifier);

  @override
  void dispose() {
    _ticker?.cancel();
    _attempt.dispose();
    final id = _blockId;
    if (id != null) {
      // Leaving mid-session removes the nudge-suppression block.
      unawaited(_ctrl.deleteFixedEvent(id).then((_) => _ctrl.scheduleTodayNudges()));
    }
    super.dispose();
  }

  Future<void> _start() async {
    final now = ref.read(clockProvider)();
    final start = minuteOfDay(now);
    final id = _ctrl.newId('focus');
    final title = context.l.focusSession;
    _blockId = id;
    await _ctrl.upsertFixedEvent(
      FixedEvent(
        id: id,
        title: title,
        startMinute: start,
        endMinute: (start + _minutes).clamp(0, 24 * 60 - 1),
        date: dayKey(ref.read(todayProvider)),
        isFocusBlock: true,
      ),
    );
    await _ctrl.scheduleTodayNudges();
    _ticker?.cancel();
    _ticker = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted || _phase != _Phase.running) return;
      setState(() => _elapsed += const Duration(seconds: 1));
      if (_elapsed.inSeconds >= _minutes * 60) _finish();
    });
    if (mounted) setState(() => _phase = _Phase.running);
  }

  Future<void> _finish() async {
    _ticker?.cancel();
    final id = _blockId;
    _blockId = null;
    if (id != null) {
      await _ctrl.deleteFixedEvent(id);
      await _ctrl.scheduleTodayNudges();
    }
    if (!mounted) return;
    final item = widget.itemId == 'free' ? null : ref.read(planItemProvider(widget.itemId));
    final study = item != null && isStudy(item);
    final result = await showWSheet<_Recall>(context, (_) => _RecallSheet(study: study));
    if (!mounted) return;
    final minutes = (_elapsed.inSeconds / 60).ceil().clamp(1, 600);
    if (item != null && result != null) {
      final normal = item.estimatedMin <= 0 ? 25 : item.estimatedMin;
      final level = minutes >= (normal * 1.5).round()
          ? CompletionLevel.bonus
          : (minutes >= normal ? CompletionLevel.normal : CompletionLevel.minimum);
      final note = [
        if (_attempt.text.trim().isNotEmpty) 'attempt: ${_attempt.text.trim()}',
        if (result.recall.isNotEmpty) 'recall: ${result.recall}',
      ].join('\n');
      final size = MediaQuery.sizeOf(context);
      await Completion.complete(
        context,
        ref,
        item,
        level,
        origin: Offset(size.width / 2, size.height * .35),
        durationMin: minutes,
        note: note.isEmpty ? null : note,
      );
    }
    if (mounted) context.canPop() ? context.pop() : context.go('/today');
  }

  static bool isStudy(PlanItem i) => i.domain == DomainId.ielts || i.domain == DomainId.learning || i.domain == DomainId.career;

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final c = context.c;
    final lang = context.lang;
    final item = widget.itemId == 'free' ? null : ref.watch(planItemProvider(widget.itemId));
    final title = item?.title.of(lang) ?? l.freeFocusTitle;
    final total = Duration(minutes: _minutes);
    final remaining = total - _elapsed;
    final study = item == null || isStudy(item);
    final running = _phase != _Phase.ready;

    return PopScope(
      canPop: !running,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop && running) _confirmLeave();
      },
      child: Scaffold(
        body: SafeArea(
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(WSpace.page, 12, WSpace.page, 0),
                child: Row(
                  children: [
                    if (running)
                      WPill(
                        l.nudgesSilenced,
                        tint: c.tint(TintName.primary),
                        icon: Icon(Icons.notifications_off_outlined, size: 14, color: c.tint(TintName.primary).ink),
                      ),
                    const Spacer(),
                    CircleIconButton(
                      icon: Icons.close_rounded,
                      label: l.close,
                      onPressed: () => running ? _confirmLeave() : (context.canPop() ? context.pop() : context.go('/today')),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(WSpace.page, 12, WSpace.page, 16),
                  children: [
                    Text(
                      item == null ? l.focusSession : '${l.focusSession} · ${domainShort(context, item.domain)}',
                      style: context.t.caption.copyWith(color: c.caption),
                    ),
                    Semantics(
                      header: true,
                      child: Text(title, style: context.t.h1.copyWith(color: c.text)),
                    ),
                    const SizedBox(height: 20),
                    Center(
                      child: TimerRing(
                        size: 232,
                        stroke: 10,
                        progress: remaining.inSeconds / total.inSeconds,
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Semantics(
                              label: l.timeLeft(clockText(remaining)),
                              excludeSemantics: true,
                              child: Text(
                                clockText(remaining),
                                textDirection: TextDirection.ltr,
                                style: context.t.metric.copyWith(fontSize: 48, height: 1.1, color: c.deep),
                              ),
                            ),
                            Text(running ? l.remaining : l.readyWhenYouAre, style: context.t.caption.copyWith(color: c.caption)),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    if (!running)
                      Center(
                        child: SegmentedPills<int>(
                          groupLabel: l.sessionLength,
                          selected: _minutes,
                          minSegmentWidth: 72,
                          onSelected: (m) => setState(() => _minutes = m),
                          options: [PillOption(25, minutesText(context, 25)), PillOption(50, minutesText(context, 50))],
                        ),
                      )
                    else
                      Center(
                        child: CircleIconButton(
                          icon: _phase == _Phase.paused ? Icons.play_arrow_rounded : Icons.pause_rounded,
                          label: _phase == _Phase.paused ? l.resume : l.pause,
                          onPressed: () => setState(() => _phase = _phase == _Phase.paused ? _Phase.running : _Phase.paused),
                        ),
                      ),
                    const SizedBox(height: 20),
                    if (study) ...[
                      WCard(
                        onTap: () => setState(() => _attemptOpen = !_attemptOpen),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                TintIcon(Icons.edit_outlined, tint: c.tint(TintName.sand)),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(l.attemptFirstTitle, style: context.t.bodyStrong.copyWith(color: c.text)),
                                      Text(l.attemptFirstBody, style: context.t.caption.copyWith(color: c.caption)),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                            if (_attemptOpen || _attempt.text.isNotEmpty) ...[
                              const SizedBox(height: 12),
                              TextField(
                                controller: _attempt,
                                minLines: 2,
                                maxLines: 5,
                                decoration: InputDecoration(hintText: l.attemptHint),
                              ),
                            ],
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),
                    ],
                    WCard(
                      color: c.surfaceSubtle,
                      borderColor: c.surfaceSubtle,
                      child: Row(
                        children: [
                          TintIcon(Icons.phone_iphone_rounded, tint: Tint(c.surface, c.deep)),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(l.phoneAwayTitle, style: context.t.bodyStrong.copyWith(color: c.text)),
                                Text(l.phoneAwayBody, style: context.t.caption.copyWith(color: c.caption)),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          WChoiceChip(
                            label: _phoneAway ? l.phoneAwayDone : l.phoneAwayAction,
                            selected: _phoneAway,
                            icon: _phoneAway ? Icons.check_rounded : null,
                            onTap: () => setState(() => _phoneAway = !_phoneAway),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(WSpace.page, 0, WSpace.page, 12),
                child: PrimaryButton(label: running ? l.endSession : l.startSession, onPressed: running ? _finish : _start),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _confirmLeave() async {
    final l = context.l;
    final end = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(l.leaveFocusTitle),
        content: Text(l.leaveFocusBody),
        actions: [
          SecondaryButton(label: l.keepGoing, onPressed: () => Navigator.pop(ctx, false)),
          SecondaryButton(label: l.endSession, onPressed: () => Navigator.pop(ctx, true)),
        ],
      ),
    );
    if (end == true) await _finish();
  }
}

class _Recall {
  const _Recall(this.recall);
  final String recall;
}

class _RecallSheet extends StatefulWidget {
  const _RecallSheet({required this.study});
  final bool study;

  @override
  State<_RecallSheet> createState() => _RecallSheetState();
}

class _RecallSheetState extends State<_RecallSheet> {
  final _text = TextEditingController();

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final c = context.c;
    return WSheet(
      title: l.sessionDoneTitle,
      footer: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          PrimaryButton(label: l.saveSession, onPressed: () => Navigator.pop(context, _Recall(_text.text.trim()))),
          SecondaryButton(label: l.discardSession, onPressed: () => Navigator.pop(context)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(widget.study ? l.recallPrompt : l.sessionNotePrompt, style: context.t.body.copyWith(color: c.textSecondary)),
          const SizedBox(height: 12),
          TextField(
            controller: _text,
            minLines: 3,
            maxLines: 6,
            autofocus: true,
            decoration: InputDecoration(hintText: widget.study ? l.recallHint : l.sessionNoteHint),
          ),
          const SizedBox(height: 8),
          Text(l.recallWhy, style: context.t.caption.copyWith(color: c.caption)),
        ],
      ),
    );
  }
}
