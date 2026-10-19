/// IELTS hub — weekly skill rotation (GROW-12), vocab SRS queue with add
/// card + review session (engine/vocab_srs.dart), mock-test log per skill
/// (bands she enters), and a feedback checklist from the official band
/// descriptors (links out). No band promises.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/date_utils.dart';
import '../../../data/models/models.dart';
import '../../../data/seed/starter_profile.dart';
import '../../../engine/engine.dart';
import '../../../state/providers.dart';
import '../../format.dart';
import '../../state/ui_providers.dart';
import '../../theme/theme_ext.dart';
import '../../widgets/widgets.dart';

const kWritingDescriptorsUrl = 'https://ielts.org/cdn/Guides/ielts-writing-band-descriptors.pdf';
const kSpeakingDescriptorsUrl = 'https://ielts.org/cdn/ielts-guides/ielts-speaking-band-descriptors.pdf';

/// Official assessment criteria (names as published by IELTS).
const kWritingCriteria = [
  ('w_tr', 'Task Response'),
  ('w_cc', 'Coherence and Cohesion'),
  ('w_lr', 'Lexical Resource'),
  ('w_gra', 'Grammatical Range and Accuracy'),
];
const kSpeakingCriteria = [
  ('s_fc', 'Fluency and Coherence'),
  ('s_lr', 'Lexical Resource'),
  ('s_gra', 'Grammatical Range and Accuracy'),
  ('s_p', 'Pronunciation'),
];

String criterionAr(BuildContext context, String id) {
  final l = context.l;
  return switch (id) {
    'w_tr' => l.critTaskResponse,
    'w_cc' || 's_fc' => id == 'w_cc' ? l.critCoherence : l.critFluency,
    'w_lr' || 's_lr' => l.critLexical,
    'w_gra' || 's_gra' => l.critGrammar,
    _ => l.critPronunciation,
  };
}

String skillShort(IeltsSkill s) => switch (s) {
  IeltsSkill.reading => 'R',
  IeltsSkill.listening => 'L',
  IeltsSkill.writing => 'W',
  IeltsSkill.speaking => 'S',
  IeltsSkill.mixedReadingListening => 'R/L',
  IeltsSkill.lightReview => 'V',
};

String skillTask(BuildContext context, IeltsSkill s) => switch (s) {
  IeltsSkill.reading => context.l.taskReading,
  IeltsSkill.listening => context.l.taskListening,
  IeltsSkill.writing => context.l.taskWriting,
  IeltsSkill.speaking => context.l.taskSpeaking,
  IeltsSkill.mixedReadingListening => context.l.taskMixed,
  IeltsSkill.lightReview => context.l.taskLight,
};

/// Weakest skill used on the rotation's Thursday (latest mock, else setting).
IeltsSkill weakestSkill(List<MockTest> mocks, Settings s) {
  final sorted = [...mocks]..sort((a, b) => b.date.compareTo(a.date));
  return sorted.firstOrNull?.weakest ?? s.ieltsWeakestSkill;
}

class IeltsScreen extends ConsumerWidget {
  const IeltsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final c = context.c;
    final goal = ref.watch(goalsProvider).where((g) => g.domain == DomainId.ielts).firstOrNull;
    return HubPage(
      title: 'IELTS',
      subtitle: l.ieltsSub,
      children: [
        WCard(
          color: c.info.bg,
          borderColor: c.info.bg,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(Icons.insights_rounded, color: c.info.ink),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  goal != null && goal.targetNote.isNotEmpty ? l.ieltsNoPromiseWithTarget(goal.targetNote) : l.ieltsNoPromise,
                  style: context.t.small.copyWith(color: c.info.ink),
                ),
              ),
            ],
          ),
        ),
        gap16,
        const _VocabCard(),
        gap24,
        SectionLabel(l.rotationTitle),
        gap8,
        const _Rotation(),
        gap24,
        SectionLabel(l.mockLog),
        gap8,
        const _Mocks(),
        gap24,
        SectionLabel(l.feedbackChecklist),
        gap8,
        const _Feedback(),
      ],
    );
  }
}

class _VocabCard extends ConsumerWidget {
  const _VocabCard();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final c = context.c;
    final lang = context.lang;
    final due = ref.watch(vocabDueProvider);
    final all = ref.watch(snapshotProvider)?.vocabCards ?? const <VocabCard>[];
    final fresh = due.where((v) => v.repetitions == 0 && v.lastReviewed == null).length;
    final reviews = due.length - fresh;
    final habit = ref.watch(snapshotProvider)?.habit(StarterProfile.vocab);
    final s = ref.watch(settingsProvider);
    final today = ref.watch(todayProvider);
    final minText = habit == null ? '' : localizeSeed(ref.watch(seedTextIndexProvider), habit.minimumText, lang);
    return WCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(child: Text(l.vocabToday, style: context.t.h2.copyWith(color: c.text))),
              if (habit != null)
                Text(
                  metaJoin([
                    cueLabel(context, habit.schedule.anchor, s,
                        resolvedMinute: AnchorResolver.fromSettings(s).resolve(habit.schedule.anchor, today)),
                    minutesText(context, habit.minimumDurationMin),
                  ]),
                  style: context.t.caption.copyWith(color: c.caption),
                ),
            ],
          ),
          gap12,
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('${due.length}', textDirection: TextDirection.ltr, style: context.t.metric.copyWith(fontSize: 40, color: c.text, height: 1.1)),
                  Text(l.cardsDue, style: context.t.caption.copyWith(color: c.caption)),
                ],
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (due.isNotEmpty)
                      Row(
                        children: [
                          if (reviews > 0)
                            Expanded(flex: reviews, child: Container(height: 8, decoration: BoxDecoration(color: c.primaryFill, borderRadius: WRadius.pillR))),
                          if (reviews > 0 && fresh > 0) const SizedBox(width: 4),
                          if (fresh > 0)
                            Expanded(flex: fresh, child: Container(height: 8, decoration: BoxDecoration(color: c.sky300, borderRadius: WRadius.pillR))),
                        ],
                      ),
                    const SizedBox(height: 6),
                    Text(l.reviewsNew('$reviews', '$fresh'), style: context.t.caption.copyWith(color: c.textSecondary)),
                    Text(l.totalCards('${all.length}'), style: context.t.caption.copyWith(color: c.caption)),
                  ],
                ),
              ),
            ],
          ),
          if (minText.isNotEmpty) ...[
            gap12,
            Text(l.minimumPrefix(minText), style: context.t.small.copyWith(color: c.textSecondary)),
          ],
          gap12,
          if (due.isNotEmpty)
            PrimaryButton(label: l.startReview, onPressed: () => context.push('/ielts/review'))
          else
            Text(all.isEmpty ? l.vocabEmpty : l.vocabAllDone, style: context.t.small.copyWith(color: c.caption)),
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: SecondaryButton(small: true, icon: Icons.add_rounded, label: l.addCard, onPressed: () => addVocabCard(context, ref)),
          ),
        ],
      ),
    );
  }
}

Future<void> addVocabCard(BuildContext context, WidgetRef ref) async {
  final l = context.l;
  final r = await showInputSheet(
    context,
    title: l.addCard,
    fields: [
      InputSpec(l.cardFront, hint: 'resilient'),
      InputSpec(l.cardBack, hint: l.cardBackHint),
      InputSpec(l.cardExample, optional: true, lines: 2),
    ],
  );
  if (r == null) return;
  await ref.read(lifeControllerProvider.notifier).addVocabCard(front: r[0], back: r[1], example: r[2]);
}

class _Rotation extends ConsumerStatefulWidget {
  const _Rotation();

  @override
  ConsumerState<_Rotation> createState() => _RotationState();
}

class _RotationState extends ConsumerState<_Rotation> {
  int? _day;

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final c = context.c;
    final lang = context.lang;
    final s = ref.watch(settingsProvider);
    final today = ref.watch(todayProvider);
    final weakest = weakestSkill(ref.watch(snapshotProvider)?.mockTests ?? const [], s);
    final start = startOfWeek(today, weekStartsOn: s.weekStartsOn);
    final days = [for (var i = 0; i < 7; i++) addDays(start, i)];
    final sel = _day ?? today.weekday;
    final skill = rotationSkill(sel, weakest: weakest);
    const initials = {7: 'ح', 1: 'ن', 2: 'ث', 3: 'ر', 4: 'خ', 5: 'ج', 6: 'س'};
    const initialsEn = {7: 'S', 1: 'M', 2: 'T', 3: 'W', 4: 'T', 5: 'F', 6: 'S'};
    // 7 tiles in one row: the whole slot (no gaps between hit areas) is the
    // tap target so each stays ≥ 44 pt wide on a 375–390 pt phone; the
    // visual gap is inner padding.
    return WCard(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              for (final d in days)
                Expanded(
                  child: Semantics(
                    container: true,
                    button: true,
                    selected: d.weekday == sel,
                    label: '${weekdayName(d.weekday).of(lang)}: ${ieltsSkillName(rotationSkill(d.weekday, weakest: weakest)).of(lang)}',
                    excludeSemantics: true,
                    child: InkWell(
                      borderRadius: WRadius.tileR,
                      onTap: () => setState(() => _day = d.weekday),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 2),
                        child: Container(
                          constraints: const BoxConstraints(minHeight: 56),
                          decoration: BoxDecoration(
                            color: d.weekday == sel ? c.primaryFill : c.surfaceSubtle,
                            borderRadius: WRadius.tileR,
                          ),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text((lang == AppLanguage.ar ? initials : initialsEn)[d.weekday]!,
                                  style: context.t.label.copyWith(color: d.weekday == sel ? c.onPrimary : c.caption)),
                              FittedBox(
                                child: Text(skillShort(rotationSkill(d.weekday, weakest: weakest)),
                                    style: context.t.metric.copyWith(fontSize: 14, color: d.weekday == sel ? c.onPrimary : c.text)),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          ),
          gap12,
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: c.surfaceSubtle, borderRadius: WRadius.tileR),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text('${weekdayName(sel).of(lang)} · ${ieltsSkillName(skill).of(lang)}',
                          style: context.t.bodyStrong.copyWith(color: c.text)),
                    ),
                    if (sel == today.weekday) Text(l.relToday, style: context.t.caption.copyWith(color: c.caption)),
                  ],
                ),
                const SizedBox(height: 4),
                Text(skillTask(context, skill), style: context.t.small.copyWith(color: c.textSecondary)),
                Text(l.rotationMinimum, style: context.t.caption.copyWith(color: c.caption)),
              ],
            ),
          ),
          gap8,
          Text(l.rotationNote, style: context.t.caption.copyWith(color: c.caption)),
        ],
      ),
    );
  }
}

class _Mocks extends ConsumerWidget {
  const _Mocks();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final c = context.c;
    final lang = context.lang;
    final mocks = [...(ref.watch(snapshotProvider)?.mockTests ?? const <MockTest>[])]..sort((a, b) => b.date.compareTo(a.date));
    final latest = mocks.firstOrNull;
    return WCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (latest == null)
            Text(l.mockEmpty, style: context.t.small.copyWith(color: c.textSecondary))
          else ...[
            Text(dayMonthKey(context, latest.date), style: context.t.bodyStrong.copyWith(color: c.text)),
            if (latest.note.isNotEmpty) Text(latest.note, style: context.t.caption.copyWith(color: c.caption)),
            gap8,
            for (final (skill, v) in [
              (IeltsSkill.listening, latest.listening),
              (IeltsSkill.reading, latest.reading),
              (IeltsSkill.writing, latest.writing),
              (IeltsSkill.speaking, latest.speaking),
            ])
              if (v != null)
                LabelledBar(
                  label: ieltsSkillName(skill).of(lang),
                  fraction: v / 9,
                  valueText: bandText(v),
                  labelWidth: 72,
                  color: skill == latest.weakest ? c.sky300 : c.primaryFill,
                ),
            gap8,
            Text(
              latest.weakest == null ? l.bandScale : l.bandScaleWeakest(ieltsSkillName(latest.weakest!).of(lang)),
              style: context.t.caption.copyWith(color: c.caption),
            ),
            if (mocks.length > 1) ...[
              gap8,
              for (final m in mocks.skip(1).take(4))
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 2),
                  child: Text(
                    metaJoin([
                      dayMonthKey(context, m.date),
                      for (final (k, v) in [('L', m.listening), ('R', m.reading), ('W', m.writing), ('S', m.speaking)])
                        if (v != null) '$k ${bandText(v)}',
                    ]),
                    style: context.t.caption.copyWith(color: c.textSecondary),
                  ),
                ),
            ],
          ],
          gap12,
          const RowDivider(),
          gap8,
          Row(
            children: [
              Expanded(child: Text(l.mockMonthly, style: context.t.caption.copyWith(color: c.caption))),
              OutlineAction(label: l.logResult, onPressed: () => _add(context, ref)),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _add(BuildContext context, WidgetRef ref) async {
    final l = context.l;
    final lang = context.lang;
    final r = await showInputSheet(
      context,
      title: l.logResult,
      fields: [
        for (final s in [IeltsSkill.listening, IeltsSkill.reading, IeltsSkill.writing, IeltsSkill.speaking])
          InputSpec(ieltsSkillName(s).of(lang), hint: '0–9', number: true, optional: true),
        InputSpec(l.noteLabel, hint: l.mockNoteHint, optional: true),
      ],
    );
    if (r == null) return;
    double? band(String s) {
      final v = double.tryParse(s);
      if (v == null) return null;
      return ((v.clamp(0, 9)) * 2).round() / 2;
    }

    final ctrl = ref.read(lifeControllerProvider.notifier);
    await ctrl.addMockTest(MockTest(
      id: ctrl.newId('mock'),
      date: dayKey(ref.read(todayProvider)),
      listening: band(r[0]),
      reading: band(r[1]),
      writing: band(r[2]),
      speaking: band(r[3]),
      note: r[4],
    ));
  }
}

class _Feedback extends ConsumerStatefulWidget {
  const _Feedback();

  @override
  ConsumerState<_Feedback> createState() => _FeedbackState();
}

class _FeedbackState extends ConsumerState<_Feedback> {
  bool _writing = true;

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final c = context.c;
    final ms = ref.watch(moduleStateProvider);
    final crit = _writing ? kWritingCriteria : kSpeakingCriteria;
    final url = _writing ? kWritingDescriptorsUrl : kSpeakingDescriptorsUrl;
    return WCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SegmentedPills<bool>(
            expand: true,
            groupLabel: l.feedbackChecklist,
            selected: _writing,
            onSelected: (v) => setState(() => _writing = v),
            options: [PillOption(true, l.writingTask2), PillOption(false, l.speakingLabel)],
          ),
          gap12,
          Text(l.feedbackHelp, style: context.t.small.copyWith(color: c.textSecondary)),
          gap8,
          for (final (id, en) in crit)
            CheckRow(
              title: context.lang == AppLanguage.ar ? criterionAr(context, id) : en,
              subtitle: context.lang == AppLanguage.ar ? en : null,
              subtitleLtr: true,
              checked: ms.ieltsFeedbackChecks.contains(id),
              onChanged: (v) => ref.read(lifeControllerProvider.notifier).updateModuleState(
                ms.copyWith(
                  ieltsFeedbackChecks: v
                      ? [...ms.ieltsFeedbackChecks, id]
                      : ms.ieltsFeedbackChecks.where((x) => x != id).toList(),
                ),
              ),
            ),
          gap8,
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: SecondaryButton(
              small: true,
              icon: Icons.open_in_new_rounded,
              label: _writing ? l.writingDescriptors : l.speakingDescriptors,
              onPressed: () => openExternal(context, url),
            ),
          ),
          if (ms.ieltsFeedbackChecks.any((x) => crit.any((cr) => cr.$1 == x)))
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: SecondaryButton(
                small: true,
                label: l.resetChecklist,
                onPressed: () => ref.read(lifeControllerProvider.notifier).updateModuleState(
                  ms.copyWith(ieltsFeedbackChecks: ms.ieltsFeedbackChecks.where((x) => !crit.any((cr) => cr.$1 == x)).toList()),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Opens an https / tel link outside the app; snackbar on failure.
Future<void> openExternal(BuildContext context, String url) async {
  final msg = context.l.linkOpenFailed;
  final messenger = ScaffoldMessenger.maybeOf(context);
  var ok = false;
  try {
    ok = await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
  } catch (_) {
    ok = false;
  }
  if (!ok) messenger?.showSnackBar(SnackBar(content: Text(msg)));
}

/// Vocab review session: front → reveal → grade (again / hard / good / easy).
class VocabReviewScreen extends ConsumerStatefulWidget {
  const VocabReviewScreen({super.key});

  @override
  ConsumerState<VocabReviewScreen> createState() => _VocabReviewScreenState();
}

class _VocabReviewScreenState extends ConsumerState<VocabReviewScreen> {
  late final List<VocabCard> _queue = [...ref.read(vocabDueProvider)];
  int _i = 0;
  bool _shown = false;
  int _good = 0;

  Future<void> _grade(VocabGrade g) async {
    await ref.read(lifeControllerProvider.notifier).reviewVocab(_queue[_i].id, g.q);
    if (!mounted) return;
    setState(() {
      if (g != VocabGrade.again) _good++;
      _i++;
      _shown = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final c = context.c;
    final done = _i >= _queue.length;
    final card = done ? null : _queue[_i];
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(WSpace.page, 12, WSpace.page, 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  CircleIconButton(icon: Icons.close_rounded, label: l.close, onPressed: () => context.canPop() ? context.pop() : context.go('/path/ielts')),
                  const SizedBox(width: 12),
                  Expanded(child: Text(l.vocabReview, style: context.t.h2.copyWith(color: c.text))),
                  Text(l.xOfY('${(_i + (done ? 0 : 1)).clamp(0, _queue.length)}', '${_queue.length}'),
                      style: context.t.caption.copyWith(color: c.accentText, fontWeight: FontWeight.w600)),
                ],
              ),
              gap12,
              WProgressBar(value: _queue.isEmpty ? 1 : _i / _queue.length),
              const Spacer(),
              if (done)
                EmptyRestState(
                  title: l.reviewDoneTitle,
                  message: _queue.isEmpty ? l.vocabAllDone : l.reviewDoneBody('$_good', '${_queue.length}'),
                )
              else
                Semantics(
                  liveRegion: true,
                  child: WCard(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      children: [
                        Text(card!.front, textAlign: TextAlign.center, textDirection: textDirFor(card.front, context), style: context.t.display.copyWith(color: c.text)),
                        if (_shown) ...[
                          gap16,
                          const RowDivider(),
                          gap16,
                          Text(card.back, textAlign: TextAlign.center, textDirection: textDirFor(card.back, context), style: context.t.h2.copyWith(color: c.textSecondary)),
                          if (card.example.isNotEmpty) ...[
                            gap8,
                            Text(card.example, textAlign: TextAlign.center, textDirection: textDirFor(card.example, context), style: context.t.small.copyWith(color: c.caption)),
                          ],
                        ],
                      ],
                    ),
                  ),
                ),
              const Spacer(),
              if (done)
                PrimaryButton(label: l.finish, onPressed: () => context.canPop() ? context.pop() : context.go('/path/ielts'))
              else if (!_shown)
                PrimaryButton(label: l.showAnswer, onPressed: () => setState(() => _shown = true))
              else
                Row(
                  children: [
                    for (final (g, label) in [
                      (VocabGrade.again, l.gradeAgain),
                      (VocabGrade.hard, l.gradeHard),
                      (VocabGrade.good, l.gradeGood),
                      (VocabGrade.easy, l.gradeEasy),
                    ]) ...[
                      if (g != VocabGrade.again) const SizedBox(width: 8),
                      Expanded(child: OutlineAction(label: label, tint: g == VocabGrade.good ? c.tint(TintName.primary) : null, onPressed: () => _grade(g))),
                    ],
                  ],
                ),
            ],
          ),
        ),
      ),
    );
  }
}
