/// Routine Player (RoutinePlayer.dc.html): one step at a time, big
/// buttons, per-step timer, bundled joy, logs each step as it goes.
library;

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../data/models/models.dart';
import '../../../state/providers.dart';
import '../../format.dart';
import '../../state/completion.dart';
import '../../state/ui_providers.dart';
import '../../theme/theme_ext.dart';
import '../../widgets/widgets.dart';

class RoutinePlayerScreen extends ConsumerStatefulWidget {
  const RoutinePlayerScreen({super.key, required this.routineId});
  final String routineId;

  @override
  ConsumerState<RoutinePlayerScreen> createState() => _RoutinePlayerScreenState();
}

class _RoutinePlayerScreenState extends ConsumerState<RoutinePlayerScreen> {
  Timer? _ticker;
  int? _index;
  Duration _elapsed = Duration.zero;
  bool _paused = false;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _ticker = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!_paused && mounted) setState(() => _elapsed += const Duration(seconds: 1));
    });
  }

  @override
  void dispose() {
    _ticker?.cancel();
    super.dispose();
  }

  int _firstOpen(List<PlanItem> steps, Map<String, LogEntry> logs) {
    final i = steps.indexWhere((s) => !(logs[s.itemId] != null));
    return i < 0 ? steps.length : i;
  }

  Future<void> _advance(List<PlanItem> steps, int i, {required bool skip}) async {
    if (_busy) return;
    setState(() => _busy = true);
    final item = steps[i];
    final ctrl = ref.read(lifeControllerProvider.notifier);
    if (skip) {
      await ctrl.skipItem(item);
    } else {
      final minutes = (_elapsed.inSeconds / 60).ceil();
      await Completion.complete(
        context,
        ref,
        item,
        item.suggestedLevel,
        durationMin: minutes < 1 ? null : minutes,
        snackbar: false,
        celebrate: false,
      );
      if (mounted) {
        final box = context.findRenderObject() as RenderBox?;
        final origin = box == null ? Offset.zero : box.localToGlobal(Offset(box.size.width / 2, box.size.height * .3));
        if (i == steps.length - 1) CelebrationBurst.show(context, origin, variant: BurstVariant.orbit, strong: true);
      }
    }
    if (!mounted) return;
    setState(() {
      _busy = false;
      _index = i + 1;
      _elapsed = Duration.zero;
      _paused = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final c = context.c;
    final lang = context.lang;
    final steps = ref.watch(routineItemsProvider(widget.routineId));
    final logs = ref.watch(todayLogsProvider);
    final snap = ref.watch(snapshotProvider);
    final routine = snap?.routines.where((r) => r.id == widget.routineId).firstOrNull;
    final title = routine == null ? '' : (lang == AppLanguage.ar ? routine.titleAr : routine.titleEn);
    void close() => context.canPop() ? context.pop() : context.go('/today');

    if (steps.isEmpty) {
      return Scaffold(
        body: SafeArea(
          child: Center(
            child: EmptyRestState(
              message: l.itemNotFound,
              action: SecondaryButton(label: l.back, onPressed: close),
            ),
          ),
        ),
      );
    }
    final index = (_index ?? _firstOpen(steps, logs)).clamp(0, steps.length);
    final finished = index >= steps.length;
    final current = finished ? null : steps[index];
    final plannedSec = (current?.estimatedMin ?? 1) * 60;
    final remaining = Duration(seconds: plannedSec) - _elapsed;
    final over = remaining.isNegative;
    final habit = current == null ? null : snap?.habit(current.itemId);
    final prep = localizeSeed(ref.watch(seedTextIndexProvider), habit?.frictionDown ?? '', lang);
    final bundle = current?.bundleTitle?.of(lang);

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(WSpace.page, 12, WSpace.page, 0),
              child: Row(
                children: [
                  const SizedBox(width: WSpace.tap),
                  Expanded(
                    child: Column(
                      children: [
                        Semantics(
                          header: true,
                          child: Text(title, style: context.t.bodyStrong.copyWith(color: c.text)),
                        ),
                        Text(
                          finished ? l.chainComplete : l.stepOf((index + 1).toString(), steps.length.toString()),
                          style: context.t.caption.copyWith(color: c.caption),
                        ),
                      ],
                    ),
                  ),
                  CircleIconButton(icon: Icons.close_rounded, label: l.close, onPressed: close),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(WSpace.page, 12, WSpace.page, 0),
              child: Row(
                children: [
                  for (var i = 0; i < steps.length; i++) ...[
                    Expanded(child: WProgressBar(value: i < index ? 1 : (i == index ? .5 : 0), height: 5)),
                    if (i < steps.length - 1) const SizedBox(width: 6),
                  ],
                ],
              ),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(WSpace.page, 20, WSpace.page, 16),
                children: [
                  WCard(
                    padding: const EdgeInsets.fromLTRB(20, 24, 20, 20),
                    glow: finished,
                    child: finished
                        ? _Finished(title: title)
                        : Column(
                            children: [
                              TimerRing(
                                size: 176,
                                stroke: 9,
                                progress: over ? 0 : remaining.inSeconds / plannedSec,
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    TintIcon(kDomainIcon[current!.domain]!, tint: c.info, size: 40),
                                    const SizedBox(height: 4),
                                    Semantics(
                                      liveRegion: false,
                                      label: l.timeLeft(clockText(over ? Duration.zero : remaining)),
                                      excludeSemantics: true,
                                      child: Text(
                                        over ? '+${clockText(-remaining)}' : clockText(remaining),
                                        textDirection: TextDirection.ltr,
                                        style: context.t.metric.copyWith(fontSize: 40, height: 1.1, color: c.deep),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 16),
                              Text(
                                current.title.of(lang),
                                textAlign: TextAlign.center,
                                style: context.t.display.copyWith(color: c.text),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                prep.isNotEmpty ? prep : current.why.text.of(lang),
                                textAlign: TextAlign.center,
                                textDirection: prep.isNotEmpty ? TextDirection.ltr : null,
                                style: context.t.small.copyWith(color: c.textSecondary),
                              ),
                              const SizedBox(height: 16),
                              Wrap(
                                alignment: WrapAlignment.center,
                                crossAxisAlignment: WrapCrossAlignment.center,
                                spacing: 10,
                                runSpacing: 8,
                                children: [
                                  CircleIconButton(
                                    icon: _paused ? Icons.play_arrow_rounded : Icons.pause_rounded,
                                    label: _paused ? l.resume : l.pause,
                                    onPressed: () => setState(() => _paused = !_paused),
                                  ),
                                  if (bundle != null) JoyBadge(bundle),
                                ],
                              ),
                            ],
                          ),
                  ),
                  const SizedBox(height: 20),
                  SectionLabel(l.stepsLabel),
                  const SizedBox(height: 8),
                  LayoutBuilder(
                    builder: (context, box) {
                      final fit = (box.maxWidth - 8 * (steps.length - 1)) / steps.length;
                      return SizedBox(
                        height: 96 * MediaQuery.textScalerOf(context).scale(1).clamp(1, 1.6),
                        child: ListView.separated(
                          scrollDirection: Axis.horizontal,
                          itemCount: steps.length,
                          separatorBuilder: (_, _) => const SizedBox(width: 8),
                          itemBuilder: (context, i) => _StepTile(
                            width: fit >= 80 ? fit : 88,
                            item: steps[i],
                            state: logs[steps[i].itemId]?.isDone == true
                                ? _StepState.done
                                : (i == index
                                      ? _StepState.current
                                      : (logs[steps[i].itemId] != null ? _StepState.skipped : _StepState.pending)),
                            onTap: () => setState(() {
                              _index = i;
                              _elapsed = Duration.zero;
                            }),
                          ),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(WSpace.page, 0, WSpace.page, 12),
              child: finished
                  ? PrimaryButton(label: l.backToToday, onPressed: close)
                  : Column(
                      children: [
                        PrimaryButton(
                          label: index + 1 < steps.length ? l.doneNext(steps[index + 1].title.of(lang)) : l.doneFinish,
                          onPressed: _busy ? null : () => _advance(steps, index, skip: false),
                        ),
                        SecondaryButton(
                          label: l.skipStepToday,
                          onPressed: _busy ? null : () => _advance(steps, index, skip: true),
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

enum _StepState { done, current, pending, skipped }

class _StepTile extends StatelessWidget {
  const _StepTile({required this.item, required this.state, required this.onTap, this.width = 88});
  final double width;
  final PlanItem item;
  final _StepState state;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final l = context.l;
    final current = state == _StepState.current;
    final title = item.title.of(context.lang);
    final stateLabel = switch (state) {
      _StepState.done => l.doneShort,
      _StepState.current => l.currentStep,
      _StepState.skipped => l.skippedShort,
      _StepState.pending => '',
    };
    return Semantics(
      container: true,
      button: true,
      selected: current,
      label: '$title${stateLabel.isEmpty ? '' : ' · $stateLabel'}',
      excludeSemantics: true,
      child: SizedBox(
        width: width,
        child: Material(
          color: current ? c.surfaceSubtle : c.surface,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: BorderSide(color: current ? c.sky300 : c.border, width: current ? 1.5 : 1),
          ),
          child: InkWell(
            borderRadius: BorderRadius.circular(16),
            onTap: onTap,
            child: Padding(
              padding: const EdgeInsets.all(8),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  switch (state) {
                    _StepState.done => TintIcon(Icons.check_rounded, tint: c.done, size: 24),
                    _StepState.current => Container(
                      width: 22,
                      height: 22,
                      decoration: BoxDecoration(shape: BoxShape.circle, color: c.primaryFill),
                    ),
                    _StepState.skipped => TintIcon(Icons.remove_rounded, tint: c.rest, size: 24),
                    _StepState.pending => Container(
                      width: 22,
                      height: 22,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(color: c.border, width: 1.5),
                      ),
                    ),
                  },
                  const SizedBox(height: 6),
                  Text(
                    title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    textAlign: TextAlign.center,
                    style: context.t.label.copyWith(color: c.text),
                  ),
                  Text(
                    minutesText(context, item.estimatedMin),
                    style: context.t.label.copyWith(color: c.caption, fontWeight: FontWeight.w500),
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

class _Finished extends StatelessWidget {
  const _Finished({required this.title});
  final String title;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Column(
      children: [
        const SizedBox(height: 8),
        const SparkIcon(size: 44),
        const SizedBox(height: 12),
        Text(
          context.l.chainCompleteTitle(title),
          textAlign: TextAlign.center,
          style: context.t.h1.copyWith(color: c.text),
        ),
        const SizedBox(height: 4),
        Text(
          context.l.chainCompleteSub,
          textAlign: TextAlign.center,
          style: context.t.small.copyWith(color: c.textSecondary),
        ),
        const SizedBox(height: 8),
      ],
    );
  }
}
