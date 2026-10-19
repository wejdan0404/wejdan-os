/// Weekly Review (spec §7.12) — 8 steps: wins → what got in the way →
/// strength checks (SRBAI, 4 items) → season tweak → next week's top 3 →
/// experiment pick (engine/experiments.dart) → chapter title → Sparks.
/// Ends on a positive, specific line (peak-end).
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/date_utils.dart';
import '../../../data/models/models.dart';
import '../../../engine/engine.dart';
import '../../../state/providers.dart';
import '../../theme/theme_ext.dart';
import '../../widgets/widgets.dart';
import '../path/path_screen.dart' show SeasonEditor;
import 'fresh_start_card.dart';

const kReviewSteps = 8;

String missName(BuildContext context, MissReason r) => switch (r) {
  MissReason.forgot => context.l.missForgot,
  MissReason.badTime => context.l.missBadTime,
  MissReason.tooBig => context.l.missTooBig,
  MissReason.tired => context.l.missTired,
  MissReason.notEnjoyable => context.l.missNotEnjoyable,
  MissReason.placeDidntFit => context.l.missPlaceDidntFit,
  MissReason.busy => context.l.missBusy,
  MissReason.notImportantNow => context.l.missNotImportantNow,
};

/// A win collected from her week (checked by default).
class _Win {
  _Win(this.text);
  final String text;
  bool checked = true;
}

class WeeklyReviewScreen extends ConsumerStatefulWidget {
  const WeeklyReviewScreen({super.key, this.initialStep = 0});
  final int initialStep;

  @override
  ConsumerState<WeeklyReviewScreen> createState() => _WeeklyReviewScreenState();
}

class _WeeklyReviewScreenState extends ConsumerState<WeeklyReviewScreen> {
  late int _step = widget.initialStep.clamp(0, kReviewSteps - 1);
  final _sw = Stopwatch()..start();
  late final List<_Win> _wins = _collectWins();
  final _extraWin = TextEditingController();
  final Set<MissReason> _blockers = {};
  final Map<String, List<int?>> _srbai = {};
  String? _srbaiHabit;
  final _top = [TextEditingController(), TextEditingController(), TextEditingController()];
  String? _experiment; // template id or 'none'
  final _chapter = TextEditingController();
  SparkAward? _award;
  bool _saving = false;

  @override
  void dispose() {
    _extraWin.dispose();
    for (final t in _top) {
      t.dispose();
    }
    _chapter.dispose();
    super.dispose();
  }

  List<_Win> _collectWins() {
    final s = ref.read(snapshotProvider);
    if (s == null) return [];
    final lang = s.settings.language;
    final today = ref.read(todayProvider);
    final start = dayKey(startOfWeek(today, weekStartsOn: s.settings.weekStartsOn));
    final end = dayKey(today);
    bool inWeek(String? d) => d != null && d.compareTo(start) >= 0 && d.compareTo(end) <= 0;
    final out = <_Win>[];
    final ar = lang == AppLanguage.ar;
    for (final t in s.sparkTxns.where((t) => t.reason == SparkReason.comeback && inWeek(t.date))) {
      final log = s.logs.where((l) => l.id == t.refId).firstOrNull;
      final h = log == null ? null : s.habit(log.itemId);
      if (h != null) out.add(_Win(ar ? 'رجعتي لـ${h.titleAr}' : 'Came back to ${h.titleEn}'));
    }
    for (final p in s.projects) {
      for (final st in p.steps.where((x) => x.done && inWeek(x.doneDate))) {
        out.add(_Win(ar ? st.titleAr : st.titleEn));
      }
    }
    final byRatio = [...ref.read(coreHabitsProvider)]
      ..sort((x, y) {
        final wx = weekCount(x, s.logs, today, weekStartsOn: s.settings.weekStartsOn);
        final wy = weekCount(y, s.logs, today, weekStartsOn: s.settings.weekStartsOn);
        return (wy.done / (wy.planned == 0 ? 1 : wy.planned)).compareTo(wx.done / (wx.planned == 0 ? 1 : wx.planned));
      });
    for (final h in byRatio) {
      final w = weekCount(h, s.logs, today, weekStartsOn: s.settings.weekStartsOn);
      if (w.done > 0) {
        final t = ar ? h.titleAr : h.titleEn;
        out.add(_Win(ar ? '$t: ${w.done} من ${w.planned}' : '$t: ${w.done} of ${w.planned}'));
      }
    }
    final reviewed = s.vocabCards.where((c) => inWeek(c.lastReviewed)).length;
    if (reviewed > 0) out.add(_Win(ar ? 'راجعتي $reviewed بطاقة مفردات' : 'Reviewed $reviewed vocabulary cards'));
    return out;
  }

  List<Habit> get _core => ref.read(coreHabitsProvider);

  Future<void> _next() async {
    if (_step == 2) await _saveStrength();
    if (_step == 6) {
      await _finish();
      return;
    }
    setState(() => _step++);
  }

  Future<void> _saveStrength() async {
    final ctrl = ref.read(lifeControllerProvider.notifier);
    for (final e in _srbai.entries) {
      if (e.value.every((v) => v != null)) await ctrl.recordStrengthCheck(e.key, [for (final v in e.value) v!]);
    }
    _srbai.clear();
  }

  Future<void> _finish() async {
    if (_saving) return;
    setState(() => _saving = true);
    final ctrl = ref.read(lifeControllerProvider.notifier);
    final s = ref.read(snapshotProvider)!;
    final wins = [
      ..._wins.where((w) => w.checked).map((w) => w.text),
      if (_extraWin.text.trim().isNotEmpty) _extraWin.text.trim(),
    ];
    String? expId;
    if (_experiment != null && _experiment != 'none' && ref.read(activeExperimentProvider) == null) {
      final draft = suggestExperiments(coreHabits: _core, joyItems: s.joyItems).where((e) => e.id == _experiment).firstOrNull;
      if (draft != null) {
        final e = Experiment(
          id: ctrl.newId('exp'),
          habitId: draft.habitId,
          titleAr: draft.titleAr,
          titleEn: draft.titleEn,
          variable: draft.variable,
          lengthDays: draft.lengthDays,
        );
        if (await ctrl.startExperiment(e)) expId = e.id;
      }
    }
    final award = await ctrl.saveWeeklyReview(WeeklyReviewRecord(
      id: '',
      date: '',
      chapterTitle: _chapter.text.trim(),
      wins: wins,
      blockers: _blockers.map((b) => b.name).toList(),
      top3: _top.map((t) => t.text.trim()).where((t) => t.isNotEmpty).toList(),
      experimentId: expId,
      durationSec: _sw.elapsed.inSeconds,
    ));
    if (!mounted) return;
    setState(() {
      _award = award;
      _saving = false;
      _step = 7;
    });
    if (award.amount > 0) {
      final box = context.findRenderObject() as RenderBox?;
      if (box != null) CelebrationBurst.show(context, box.localToGlobal(Offset(box.size.width / 2, box.size.height * .25)), strong: true);
    }
  }

  void _close() => context.canPop() ? context.pop() : context.go('/me');

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final c = context.c;
    final chapter = ref.watch(currentChapterProvider);
    final titles = [l.wrWins, l.wrBlockers, l.wrStrength, l.wrSeason, l.wrTop3, l.wrExperiment, l.wrChapter, l.wrSparks];
    return Scaffold(
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(WSpace.page, 12, WSpace.page, 0),
              child: Row(
                // Close at the end, like the other overlays (WeeklyReview.dc.html, BL-029).
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Semantics(header: true, child: Text(l.weeklyReview, style: context.t.h1.copyWith(color: c.text))),
                        Text(l.wrSub('$chapter'), style: context.t.caption.copyWith(color: c.caption)),
                      ],
                    ),
                  ),
                  Text(l.xOfY('${_step + 1}', '$kReviewSteps'), style: context.t.caption.copyWith(color: c.accentText, fontWeight: FontWeight.w700)),
                  const SizedBox(width: 12),
                  CircleIconButton(icon: Icons.close_rounded, label: l.close, onPressed: _close),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(WSpace.page, 12, WSpace.page, 0),
              child: Semantics(
                label: l.stepOf('${_step + 1}', '$kReviewSteps'),
                child: Row(
                  children: [
                    for (var i = 0; i < kReviewSteps; i++) ...[
                      if (i > 0) const SizedBox(width: 4),
                      Expanded(
                        child: AnimatedContainer(
                          duration: WMotion.of(context, WMotion.base),
                          height: 5,
                          decoration: BoxDecoration(color: i <= _step ? c.primaryFill : c.border, borderRadius: WRadius.pillR),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(WSpace.page, 8, WSpace.page, 0),
              child: Text(titles[_step], style: context.t.label.copyWith(color: c.caption)),
            ),
            Expanded(
              child: AnimatedSwitcher(
                duration: WMotion.of(context, WMotion.base),
                child: ListView(
                  key: ValueKey(_step),
                  padding: const EdgeInsets.fromLTRB(WSpace.page, 12, WSpace.page, 24),
                  children: _body(context),
                ),
              ),
            ),
            DecoratedBox(
              decoration: BoxDecoration(border: Border(top: BorderSide(color: c.border))),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(WSpace.page, 12, WSpace.page, 12),
                child: Row(
                  children: [
                    if (_step > 0 && _step < 7) ...[
                      SecondaryButton(label: l.back, onPressed: () => setState(() => _step--)),
                      const SizedBox(width: 8),
                    ],
                    Expanded(
                      child: PrimaryButton(
                        label: _step == 7 ? l.wrDone : (_step == 6 ? l.wrCloseChapter : l.next),
                        onPressed: _saving ? null : (_step == 7 ? _close : _next),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  List<Widget> _body(BuildContext context) {
    final l = context.l;
    final c = context.c;
    final lang = context.lang;
    Widget heading(String t, String sub) => Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(t, style: context.t.h1.copyWith(color: c.text)),
        const SizedBox(height: 4),
        Text(sub, style: context.t.small.copyWith(color: c.textSecondary)),
        gap16,
      ],
    );
    switch (_step) {
      case 0:
        final s = ref.watch(settingsProvider);
        final fresh = freshStartTomorrow(ref.watch(todayProvider), weekStartsOn: s.weekStartsOn, season: ref.watch(currentSeasonProvider));
        return [
          if (fresh != null) ...[FreshStartCard(fresh: fresh, tomorrow: true), gap16],
          heading(l.wrWinsTitle, l.wrWinsSub),
          if (_wins.isEmpty) Text(l.wrNoWins, style: context.t.small.copyWith(color: c.caption)),
          for (final w in _wins) ...[
            WCard(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 2),
              borderColor: w.checked ? c.sky300 : null,
              child: CheckRow(title: w.text, checked: w.checked, onChanged: (v) => setState(() => w.checked = v)),
            ),
            gap8,
          ],
          gap8,
          Text(l.wrExtraWin, style: context.t.label.copyWith(color: c.text)),
          gap8,
          TextField(controller: _extraWin, decoration: InputDecoration(hintText: l.wrExtraWinHint)),
        ];
      case 1:
        return [
          heading(l.wrBlockersTitle, l.wrBlockersSub),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final r in MissReason.values)
                WChoiceChip(
                  label: missName(context, r),
                  selected: _blockers.contains(r),
                  onTap: () => setState(() => _blockers.contains(r) ? _blockers.remove(r) : _blockers.add(r)),
                ),
            ],
          ),
          gap16,
          Text(l.wrBlockersNote, style: context.t.caption.copyWith(color: c.caption)),
        ];
      case 2:
        final core = _core;
        if (core.isEmpty) return [heading(l.wrStrength, l.noCoreHabits)];
        final hid = _srbaiHabit ?? core.first.id;
        final h = core.firstWhere((x) => x.id == hid, orElse: () => core.first);
        final vals = _srbai.putIfAbsent(h.id, () => List<int?>.filled(4, null));
        final items = [l.srbai1, l.srbai2, l.srbai3, l.srbai4];
        final answered = vals.whereType<int>().toList();
        return [
          heading(l.wrStrengthTitle(lang == AppLanguage.ar ? h.titleAr : h.titleEn), l.wrStrengthSub),
          if (core.length > 1) ...[
            Wrap(
              spacing: 8,
              runSpacing: 4,
              children: [
                for (final x in core)
                  WChoiceChip(
                    label: lang == AppLanguage.ar ? x.titleAr : x.titleEn,
                    selected: x.id == h.id,
                    icon: (_srbai[x.id]?.every((v) => v != null) ?? false) ? Icons.check_rounded : null,
                    onTap: () => setState(() => _srbaiHabit = x.id),
                  ),
              ],
            ),
            gap12,
          ],
          for (final (i, q) in items.indexed) ...[
            WCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(q, style: context.t.bodyStrong.copyWith(color: c.text)),
                  gap8,
                  SegmentedPills<int>(
                    expand: true,
                    groupLabel: q,
                    selected: vals[i],
                    minSegmentWidth: 44,
                    onSelected: (v) => setState(() => vals[i] = v),
                    options: [for (var v = 1; v <= 5; v++) PillOption(v, '$v')],
                  ),
                ],
              ),
            ),
            gap8,
          ],
          if (answered.length == 4)
            Text(
              l.wrStrengthAvg((answered.reduce((a, b) => a + b) / 4).toStringAsFixed(1)),
              style: context.t.caption.copyWith(color: c.caption),
            ),
        ];
      case 3:
        return [heading(l.editSeason, l.seasonEditorSub), const SeasonEditor()];
      case 4:
        final goals = ref.watch(goalsProvider);
        final projects = ref.watch(projectsProvider);
        final sugg = <String>[
          for (final g in goals)
            if (g.milestones.where((m) => !m.done).firstOrNull case final m?) lang == AppLanguage.ar ? m.titleAr : m.titleEn,
          for (final p in projects.where((p) => p.status == ProjectStatus.active))
            if (p.nextStep case final st?) lang == AppLanguage.ar ? st.titleAr : st.titleEn,
        ];
        return [
          heading(l.wrTop3Title, l.wrTop3Sub),
          for (final (i, t) in _top.indexed) ...[
            TextField(controller: t, decoration: InputDecoration(hintText: l.wrTopN('${i + 1}'))),
            gap8,
          ],
          if (sugg.isNotEmpty) ...[
            gap8,
            Text(l.wrSuggestions, style: context.t.label.copyWith(color: c.caption)),
            gap8,
            Wrap(
              spacing: 8,
              runSpacing: 4,
              children: [
                for (final sgt in sugg.take(5))
                  WChoiceChip(
                    label: sgt,
                    selected: _top.any((t) => t.text == sgt),
                    onTap: () => setState(() {
                      final empty = _top.where((t) => t.text.trim().isEmpty).firstOrNull;
                      if (empty != null && !_top.any((t) => t.text == sgt)) empty.text = sgt;
                    }),
                  ),
              ],
            ),
          ],
        ];
      case 5:
        final active = ref.watch(activeExperimentProvider);
        if (active != null) return [heading(l.wrExperimentTitle, l.wrExperimentActive), ExperimentResultCard(experiment: active)];
        final s = ref.watch(snapshotProvider);
        final options = suggestExperiments(coreHabits: ref.watch(coreHabitsProvider), joyItems: s?.joyItems ?? const []);
        Widget radio(String id, String title, String sub) => Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: WCard(
            onTap: () => setState(() => _experiment = id),
            borderColor: _experiment == id ? c.sky300 : null,
            color: _experiment == id ? c.surfaceSubtle : null,
            semanticLabel: title,
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
                Icon(_experiment == id ? Icons.radio_button_checked_rounded : Icons.radio_button_off_rounded,
                    color: _experiment == id ? c.primaryFill : c.sky300),
              ],
            ),
          ),
        );
        return [
          heading(l.wrExperimentTitle, l.wrExperimentSub),
          for (final e in options) radio(e.id, lang == AppLanguage.ar ? e.titleAr : e.titleEn, experimentVariableText(context, e)),
          radio('none', l.wrNoExperiment, l.wrNoExperimentSub),
          Text(l.wrExperimentNote, style: context.t.caption.copyWith(color: c.caption)),
        ];
      case 6:
        final n = ref.watch(currentChapterProvider);
        return [
          heading(l.wrChapterTitle('$n'), l.wrChapterSub),
          TextField(controller: _chapter, decoration: InputDecoration(hintText: l.wrChapterHint)),
          gap12,
          Wrap(
            spacing: 8,
            runSpacing: 4,
            children: [
              for (final sgt in [l.wrChapterS1, l.wrChapterS2, l.wrChapterS3])
                WChoiceChip(label: sgt, selected: _chapter.text == sgt, onTap: () => setState(() => _chapter.text = sgt)),
            ],
          ),
        ];
      default:
        final n = ref.watch(currentChapterProvider);
        final wins = [..._wins.where((w) => w.checked).map((w) => w.text), if (_extraWin.text.trim().isNotEmpty) _extraWin.text.trim()];
        return [
          gap24,
          Center(child: SparkIcon(size: 64, color: c.spark)),
          gap16,
          Text(
            _chapter.text.trim().isEmpty ? l.wrClosedN('$n') : l.wrClosedTitled('$n', _chapter.text.trim()),
            textAlign: TextAlign.center,
            style: context.t.display.copyWith(color: c.text),
          ),
          gap12,
          if ((_award?.amount ?? 0) > 0)
            Center(child: JoyBadge('+${_award!.amount} ${l.sparkReasonWeeklyReview}'))
          else
            Center(child: Text(l.wrSaved, style: context.t.caption.copyWith(color: c.caption))),
          gap16,
          Text(
            // Peak-end line matches what she actually picked (D16).
            wins.isEmpty
                ? l.wrEndGeneric
                : (_top.any((t) => t.text.trim().isNotEmpty) ? l.wrEndWin(wins.first) : l.wrEndWinNoTop(wins.first)),
            textAlign: TextAlign.center,
            style: context.t.body.copyWith(color: c.textSecondary),
          ),
        ];
    }
  }
}

/// Human description of an experiment's single variable.
String experimentVariableText(BuildContext context, Experiment e) {
  final l = context.l;
  if (e.variable.startsWith('bundle:')) return l.expVarBundle;
  if (e.variable.startsWith('time:')) return e.variable.endsWith('evening') ? l.expVarEvening : l.expVarMorning;
  if (e.variable == 'minimum') return l.expVarMinimum;
  return e.variable;
}

/// Before / after comparison with keep / revert (she decides).
class ExperimentResultCard extends ConsumerWidget {
  const ExperimentResultCard({super.key, required this.experiment, this.showActions = true});
  final Experiment experiment;
  final bool showActions;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final c = context.c;
    final lang = context.lang;
    final r = ref.watch(experimentResultProvider(experiment.id));
    Widget col(String title, WindowStats? w, bool after) => Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: after ? c.surfaceSubtle : c.bg,
          borderRadius: WRadius.tileR,
          border: Border.all(color: after ? c.sky300 : c.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: context.t.caption.copyWith(color: c.caption)),
            gap8,
            Text(w == null || w.planned == 0 ? '—' : l.xOfY('${w.done}', '${w.planned}'),
                style: context.t.metric.copyWith(fontSize: 20, color: c.text)),
            Text(l.daysDone, style: context.t.caption.copyWith(color: c.caption)),
            gap8,
            Text(w?.meanEnjoyment == null ? '—' : w!.meanEnjoyment!.toStringAsFixed(1),
                textDirection: TextDirection.ltr, style: context.t.metric.copyWith(fontSize: 20, color: c.text)),
            Text(l.enjoymentOf5, style: context.t.caption.copyWith(color: c.caption)),
          ],
        ),
      ),
    );
    final ended = experiment.status != ExperimentStatus.active;
    return WCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(l.experimentResultLabel, style: context.t.caption.copyWith(color: c.caption)),
          Text(lang == AppLanguage.ar ? experiment.titleAr : experiment.titleEn, style: context.t.h2.copyWith(color: c.text)),
          gap12,
          Row(children: [col(l.beforeWithout, r?.before, false), const SizedBox(width: 8), col(l.afterWith, r?.after, true)]),
          gap8,
          Text(l.experimentCaveat, style: context.t.caption.copyWith(color: c.caption)),
          if (showActions && !ended) ...[
            gap12,
            Row(
              children: [
                Expanded(
                  child: OutlineAction(
                    label: l.keepIt,
                    tint: c.tint(TintName.primary),
                    onPressed: () => ref.read(lifeControllerProvider.notifier).finishExperiment(experiment.id, keep: true),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlineAction(
                    label: l.revertIt,
                    onPressed: () => ref.read(lifeControllerProvider.notifier).finishExperiment(experiment.id, keep: false),
                  ),
                ),
              ],
            ),
          ],
          if (ended) ...[
            gap8,
            WPill(experiment.status == ExperimentStatus.kept ? l.keptLabel : l.revertedLabel, tint: c.done),
          ],
        ],
      ),
    );
  }
}
