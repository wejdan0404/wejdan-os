/// Habit detail / Why sheet (WhySheet.dc.html): growth stage, 4-week
/// history, the design (cue, versions, if-then, friction, joy) and the real
/// evidence from the Action Library (sources + strength badge, links open
/// externally).
library;

import 'package:flutter/material.dart' hide Action;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../data/models/models.dart';
import '../../../state/providers.dart';
import '../../format.dart';
import '../../state/completion.dart';
import '../../state/ui_providers.dart';
import '../../theme/theme_ext.dart';
import '../../widgets/widgets.dart';

class WhySheet extends ConsumerWidget {
  const WhySheet({super.key, required this.itemId});

  /// Plan item log key (habit id, weekly task id, step id…).
  final String itemId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final c = context.c;
    final lang = context.lang;
    final snap = ref.watch(snapshotProvider);
    final item = ref.watch(planItemProvider(itemId));
    final habit = snap?.habit(itemId);
    final actionId = habit?.actionId ?? item?.actionId;
    final action = actionId == null ? null : snap?.action(actionId);
    final settings = ref.watch(settingsProvider);
    if (snap == null || (item == null && habit == null)) {
      return WSheet(
        title: l.whyLabel,
        child: EmptyRestState(message: l.itemNotFound),
      );
    }
    final domain = habit?.domain ?? item!.domain;
    final title = habit != null ? (lang == AppLanguage.ar ? habit.titleAr : habit.titleEn) : item!.title.of(lang);
    final isCore = ref.watch(coreHabitsProvider).any((h) => h.id == itemId);
    final anchor = habit?.schedule.anchor ?? (item == null ? null : anchorOf(item, snap));
    final metaList = [
      domainShort(context, domain),
      if (habit != null) isCore ? l.coreHabit : l.maintainHabit,
      if (anchor != null) cueLabel(context, anchor, settings, resolvedMinute: item?.startMinute),
    ];
    final meta = metaJoin(metaList);
    final log = ref.watch(todayLogsProvider)[itemId];
    final done = log?.isDone ?? false;

    return WSheet(
      title: title,
      leading: DomainIcon(domain, size: 44),
      footer: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (habit != null)
            PrimaryButton(
              label: l.editHabitDesign,
              onPressed: () {
                Navigator.of(context).maybePop();
                context.push('/studio?habit=${Uri.encodeComponent(habit.id)}');
              },
            )
          else if (item != null && !done)
            PrimaryButton(
              label: l.markDoneMinimum,
              onPressed: () async {
                await Completion.complete(context, ref, item, CompletionLevel.minimum, celebrate: false);
                if (context.mounted) Navigator.of(context).maybePop();
              },
            ),
          SecondaryButton(
            label: l.evidenceLibrary,
            onPressed: () {
              Navigator.of(context).maybePop();
              context.go('/me');
            },
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(meta, style: context.t.caption.copyWith(color: c.caption)),
          const SizedBox(height: 16),
          if (habit != null) ...[_GrowthCard(habit: habit), const SizedBox(height: 20)],
          SectionLabel(l.designSection),
          const SizedBox(height: 8),
          _DesignCard(habit: habit, item: item, action: action),
          const SizedBox(height: 20),
          Row(
            children: [
              Icon(Icons.lightbulb_outline_rounded, size: 18, color: c.deep),
              const SizedBox(width: 6),
              Semantics(
                header: true,
                child: Text(l.whyLabel, style: context.t.h2.copyWith(color: c.text)),
              ),
            ],
          ),
          const SizedBox(height: 8),
          if (item != null) ...[
            Text(item.why.text.of(lang), style: context.t.small.copyWith(color: c.textSecondary)),
            const SizedBox(height: 12),
          ],
          if (action == null)
            Text(l.noEvidenceLinked, style: context.t.small.copyWith(color: c.caption))
          else
            _EvidenceBlock(action: action),
        ],
      ),
    );
  }
}

class _GrowthCard extends ConsumerWidget {
  const _GrowthCard({required this.habit});
  final Habit habit;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final c = context.c;
    final strength = ref.watch(habitStrengthProvider(habit.id));
    final momentum = ref.watch(momentumProvider(habit.id));
    final grid = ref.watch(habitGridProvider(habit.id));
    final stage = strength?.stage ?? GrowthStage.seed;
    final weekStart = ref.watch(settingsProvider).weekStartsOn;
    return WCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(l.growthStage, style: context.t.label.copyWith(color: c.caption)),
                    Text(GrowthStageBar.label(context, stage), style: context.t.h2.copyWith(color: c.done.ink)),
                  ],
                ),
              ),
              MomentumRing(value: momentum, size: 52, semanticLabel: l.momentum),
            ],
          ),
          const SizedBox(height: 12),
          GrowthStageBar(stage: stage),
          const SizedBox(height: 16),
          Divider(color: c.border),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: Text(l.last4Weeks, style: context.t.label.copyWith(color: c.caption)),
              ),
              _Legend(color: c.done.ink, label: l.legendFull),
              const SizedBox(width: 10),
              _Legend(color: c.done.ink, label: l.legendMin, hollow: true),
              const SizedBox(width: 10),
              _Legend(color: c.rest.bg, label: l.legendRest, border: c.border),
            ],
          ),
          const SizedBox(height: 10),
          _Grid(marks: grid, weekStart: weekStart),
        ],
      ),
    );
  }
}

class _Legend extends StatelessWidget {
  const _Legend({required this.color, required this.label, this.hollow = false, this.border});
  final Color color;
  final String label;
  final bool hollow;
  final Color? border;

  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Container(
        width: 10,
        height: 10,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: hollow ? Colors.transparent : color,
          border: Border.all(color: hollow ? color : (border ?? color), width: hollow ? 2 : 1),
        ),
      ),
      const SizedBox(width: 4),
      Text(label, style: context.t.label.copyWith(color: context.c.caption)),
    ],
  );
}

class _Grid extends StatelessWidget {
  const _Grid({required this.marks, required this.weekStart});
  final List<DayMark> marks;
  final int weekStart;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final lang = context.lang;
    final days = [for (var i = 0; i < 7; i++) ((weekStart - 1 + i) % 7) + 1];
    // Standard one-letter weekday initials (Mon=1 … Sun=7).
    const ar = {1: 'ن', 2: 'ث', 3: 'ر', 4: 'خ', 5: 'ج', 6: 'س', 7: 'ح'};
    const en = {1: 'M', 2: 'T', 3: 'W', 4: 'T', 5: 'F', 6: 'S', 7: 'S'};
    String initial(int wd) => (lang == AppLanguage.ar ? ar : en)[wd]!;
    Widget dot(DayMark m) {
      final size = 28.0;
      return switch (m) {
        DayMark.full => Container(
          width: size,
          height: size,
          decoration: BoxDecoration(shape: BoxShape.circle, color: c.done.ink),
        ),
        DayMark.minimum => Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(color: c.done.ink, width: 2.5),
          ),
        ),
        DayMark.rest => Container(
          width: size,
          height: size,
          decoration: BoxDecoration(shape: BoxShape.circle, color: c.rest.bg),
        ),
        DayMark.notPlanned => Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(color: c.border),
          ),
        ),
        DayMark.future => SizedBox(
          width: size,
          height: size,
          child: CustomPaint(painter: _DashedCircle(c.sky300)),
        ),
      };
    }

    final done = marks.where((m) => m == DayMark.full || m == DayMark.minimum).length;
    return Semantics(
      label: context.l.gridSummary(done.toString()),
      excludeSemantics: true,
      child: Column(
        children: [
          Row(
            children: [
              for (final d in days)
                Expanded(
                  child: Text(
                    initial(d),
                    textAlign: TextAlign.center,
                    style: context.t.label.copyWith(color: c.caption),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 6),
          for (var w = 0; w < 4 && marks.length >= (w + 1) * 7; w++)
            Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Row(
                children: [for (var d = 0; d < 7; d++) Expanded(child: Center(child: dot(marks[w * 7 + d])))],
              ),
            ),
        ],
      ),
    );
  }
}

class _DashedCircle extends CustomPainter {
  _DashedCircle(this.color);
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final p = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.2;
    final path = Path()..addOval(Offset.zero & size);
    for (final m in path.computeMetrics()) {
      for (var d = 0.0; d < m.length; d += 6) {
        canvas.drawPath(m.extractPath(d, d + 3), p);
      }
    }
  }

  @override
  bool shouldRepaint(_DashedCircle o) => o.color != color;
}

class _DesignCard extends ConsumerWidget {
  const _DesignCard({this.habit, this.item, this.action});
  final Habit? habit;
  final PlanItem? item;
  final Action? action;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final c = context.c;
    final lang = context.lang;
    final h = habit;
    final idx = ref.watch(seedTextIndexProvider);
    String loc(String s) => localizeSeed(idx, s, lang);
    String fromAction(ActionField f) => action?.text(f, lang) ?? '';
    final cue = h?.cue.isNotEmpty == true ? loc(h!.cue) : fromAction(ActionField.cue);
    final ifThen = h?.ifThen.isNotEmpty == true ? loc(h!.ifThen) : fromAction(ActionField.ifThen);
    final easy = h?.frictionDown.isNotEmpty == true ? loc(h!.frictionDown) : fromAction(ActionField.frictionDown);
    final bundle = item?.bundleTitle?.of(lang);
    final joyText = h?.joyPairing.isNotEmpty == true ? loc(h!.joyPairing) : '';
    final joy = bundle ?? (joyText.isNotEmpty ? joyText : null);
    final minText = loc(h?.minimumText ?? item?.minimumText ?? '');
    final normText = loc(h?.normalText ?? item?.normalText ?? '');
    final bonusText = loc(h?.bonusText ?? item?.bonusText ?? '');
    final suggested = item?.suggestedLevel ?? CompletionLevel.normal;

    Widget row(String label, Widget value, {bool last = false}) => Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(
                width: 72,
                child: Text(label, style: context.t.caption.copyWith(color: c.caption)),
              ),
              const SizedBox(width: 8),
              Expanded(child: value),
            ],
          ),
        ),
        if (!last) Divider(color: c.border),
      ],
    );
    Widget src(String s) => _SourceText(s);

    Widget version(CompletionLevel lv, String text) {
      final sel = lv == suggested;
      final t = sel ? c.tint(TintName.primary) : c.rest;
      var minutes = item != null
          ? levelMinutes(context, item!, lv, ref.watch(snapshotProvider))
          : (h == null
                ? ''
                : lv == CompletionLevel.minimum
                ? minutesText(context, h.minimumDurationMin)
                : lv == CompletionLevel.normal
                ? minutesText(context, h.durationMin) + (h.durationEstimated ? ' · ${l.estimateTag}' : '')
                : plusMinutes(context, h.durationMin));
      // Minimum minutes: «حددي مدة صغيرة» when not set; «تقدير» when the
      // library states none (a planning estimate she can edit in the Studio).
      if (h != null && lv == CompletionLevel.minimum) {
        if (h.minimumDurationMin <= 0) {
          minutes = l.setSmallDuration;
        } else if (item == null && h.minimumDurationEstimated && minutes.isNotEmpty) {
          minutes = '$minutes · ${l.estimateTag}';
        }
      }
      return Expanded(
        child: Tooltip(
          message: text,
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 6),
            decoration: BoxDecoration(color: sel ? t.bg : c.rest.bg, borderRadius: WRadius.tileR),
            child: Column(
              children: [
                Text(levelName(context, lv), style: context.t.label.copyWith(color: sel ? t.ink : c.caption)),
                Text(
                  minutes,
                  style: context.t.caption.copyWith(color: sel ? t.ink : c.textSecondary, fontWeight: FontWeight.w600),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return WCard(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Column(
        children: [
          if (cue.isNotEmpty) row(l.fieldCue, src(cue)),
          if (minText.isNotEmpty || normText.isNotEmpty)
            row(
              l.fieldVersions,
              Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      version(CompletionLevel.minimum, minText),
                      const SizedBox(width: 6),
                      version(CompletionLevel.normal, normText),
                      const SizedBox(width: 6),
                      version(CompletionLevel.bonus, bonusText),
                    ],
                  ),
                  if (minText.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text(l.minimumIs, style: context.t.label.copyWith(color: c.caption)),
                    src(minText),
                  ],
                ],
              ),
            ),
          if (ifThen.isNotEmpty) row(l.fieldIfThen, src(ifThen)),
          if (easy.isNotEmpty) row(l.fieldEasy, src(easy), last: joy == null),
          if (joy != null) row(l.fieldJoy, Align(alignment: AlignmentDirectional.centerStart, child: JoyBadge(joy)), last: true),
        ],
      ),
    );
  }
}

/// Seed texts are English-only (CORE_API §10): render them LTR with a
/// quiet language hint when the UI is Arabic.
class _SourceText extends StatelessWidget {
  const _SourceText(this.text);
  final String text;

  static final _arabic = RegExp('[؀-ۿ]');

  @override
  Widget build(BuildContext context) {
    final isAr = _arabic.hasMatch(text);
    return Text(
      text,
      textDirection: isAr ? TextDirection.rtl : TextDirection.ltr,
      textAlign: TextAlign.start,
      style: (isAr ? context.t.small : WType.english.small).copyWith(color: context.c.text),
    );
  }
}

class _EvidenceBlock extends StatelessWidget {
  const _EvidenceBlock({required this.action});
  final Action action;

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final c = context.c;
    final lang = context.lang;
    final what = action.text(ActionField.what, lang);
    final why = action.text(ActionField.why, lang);
    final dose = action.text(ActionField.dose, lang);
    final safety = action.text(ActionField.safety, lang);
    // Arabic content exists for the library; only a missing translation
    // falls back to English (then the note explains why).
    final englishFallback = lang == AppLanguage.ar && action.ar == null;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        WCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (what != null) ...[_SourceText(what), const SizedBox(height: 10)],
              if (why != null) _SourceText(why),
              const SizedBox(height: 10),
              StrengthBadge(strength: action.evidenceStrength),
              if (dose != null) ...[
                const SizedBox(height: 10),
                Text(l.doseLabel, style: context.t.label.copyWith(color: c.caption)),
                _SourceText(dose),
              ],
              if (englishFallback) ...[
                const SizedBox(height: 8),
                Text(
                  l.sourceLanguageNote,
                  style: context.t.label.copyWith(color: c.caption, fontWeight: FontWeight.w500),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 12),
        SectionLabel(l.sourcesCount(action.sources.length.toString())),
        const SizedBox(height: 8),
        // No peer-reviewed source: say so honestly (spec: evidence behind
        // every action; LIFE-01/11/15, JOY-12).
        if (action.sources.isEmpty) ...[
          Align(alignment: AlignmentDirectional.centerStart, child: WPill(l.unsourcedBadge, tint: c.rest)),
          const SizedBox(height: 8),
        ],
        for (final s in action.sources) ...[_SourceCard(source: s), const SizedBox(height: 8)],
        if (safety != null) ...[
          const SizedBox(height: 4),
          WCard(
            color: c.rest.bg,
            borderColor: c.rest.bg,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.shield_outlined, size: 18, color: c.caption),
                const SizedBox(width: 8),
                Expanded(child: _SourceText(safety)),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

class _SourceCard extends StatelessWidget {
  const _SourceCard({required this.source});
  final EvidenceSource source;

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final c = context.c;
    final meta = [source.type, if (source.year != null) '${source.year}'].join(' · ');
    return WCard(
      padding: const EdgeInsets.fromLTRB(16, 12, 8, 12),
      onTap: () => _open(context),
      semanticLabel: '${source.title}. ${l.openSource}',
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _SourceText(source.title),
                const SizedBox(height: 4),
                Text(
                  meta,
                  textDirection: TextDirection.ltr,
                  style: WType.english.label.copyWith(color: c.caption),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          SizedBox.square(
            dimension: WSpace.tap,
            child: Icon(Icons.open_in_new_rounded, size: 20, color: c.accentText),
          ),
        ],
      ),
    );
  }

  Future<void> _open(BuildContext context) async {
    final uri = Uri.tryParse(source.url);
    final ok = uri != null && await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!ok && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(context.l.linkOpenFailed)));
    }
  }
}

/// Evidence strength badge (bars + label; never colour alone).
class StrengthBadge extends StatelessWidget {
  const StrengthBadge({super.key, required this.strength});
  final String strength;

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final c = context.c;
    final (int bars, String label, Tint tint) = switch (strength) {
      'Guideline' => (3, l.evidenceGuideline, c.done),
      'SR/MA' => (3, l.evidenceSrMa, c.done),
      'RCT' => (2, l.evidenceRct, c.info),
      'Observational' => (2, l.evidenceObservational, c.info),
      _ => (1, l.evidenceExpert, c.rest),
    };
    return Semantics(
      label: label,
      excludeSemantics: true,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(color: tint.bg, borderRadius: WRadius.pillR),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                for (var i = 0; i < 3; i++) ...[
                  Container(
                    width: 3,
                    height: 6.0 + i * 3,
                    decoration: BoxDecoration(
                      color: i < bars ? tint.ink : tint.ink.withValues(alpha: .25),
                      borderRadius: BorderRadius.circular(1),
                    ),
                  ),
                  if (i < 2) const SizedBox(width: 2),
                ],
              ],
            ),
            const SizedBox(width: 6),
            Flexible(
              child: Text(label, style: context.t.label.copyWith(color: tint.ink)),
            ),
          ],
        ),
      ),
    );
  }
}
