/// Driving hub — licence path checklist that starts with confirming the
/// official path on Absher / my.gov.sa (no hardcoded hours or fees),
/// supervised practice log with conditions, hazard-perception log and
/// spaced theory practice.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/date_utils.dart';
import '../../../data/models/models.dart';
import '../../../engine/engine.dart';
import '../../../state/providers.dart';
import '../../format.dart';
import '../../state/ui_providers.dart';
import '../../theme/theme_ext.dart';
import '../../widgets/widgets.dart';
import '../ielts/ielts_screen.dart' show openExternal;

const kAbsherUrl = 'https://www.absher.sa';
const kMyGovUrl = 'https://my.gov.sa';

/// Practice conditions (stored as ids on DrivingSession.conditions).
const kConditions = ['day', 'night', 'highway', 'traffic', 'parking'];

String conditionName(BuildContext context, String id) => switch (id) {
  'day' => context.l.condDay,
  'night' => context.l.condNight,
  'highway' => context.l.condHighway,
  'traffic' => context.l.condTraffic,
  _ => context.l.condParking,
};

class DrivingScreen extends ConsumerWidget {
  const DrivingScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final c = context.c;
    final ms = ref.watch(moduleStateProvider);
    final current = [for (var i = 0; i < 5; i++) i].firstWhere((i) => !ms.drivingStepsDone.contains(i), orElse: () => 5);
    return HubPage(
      title: l.drivingTitle,
      subtitle: l.drivingSub('${(current + 1).clamp(1, 5)}'),
      bottom: PrimaryButton(label: l.logPractice, onPressed: () => logDrivingSession(context, ref, kind: 'practice')),
      children: [
        const _LicencePath(),
        gap24,
        SectionLabel(l.supervisedLog),
        gap8,
        const _PracticeLog(),
        gap24,
        SectionLabel(l.beforeTheRoad),
        gap8,
        const _Prep(),
        gap16,
        Row(
          children: [
            Expanded(child: Text(l.drivingAnxietyNote, style: context.t.caption.copyWith(color: c.caption))),
            SecondaryButton(small: true, label: l.helpShort, onPressed: () => context.push('/help')),
          ],
        ),
      ],
    );
  }
}

class _LicencePath extends ConsumerWidget {
  const _LicencePath();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final c = context.c;
    final ms = ref.watch(moduleStateProvider);
    final ctrl = ref.read(lifeControllerProvider.notifier);
    final steps = [
      (l.lp1Title, l.lp1Sub),
      (l.lp2Title, l.lp2Sub),
      (l.lp3Title, l.lp3Sub),
      (l.lp4Title, l.lp4Sub),
      (l.lp5Title, l.lp5Sub),
    ];
    final current = [for (var i = 0; i < 5; i++) i].firstWhere((i) => !ms.drivingStepsDone.contains(i), orElse: () => 5);
    void toggle(int i) {
      final done = ms.drivingStepsDone.contains(i);
      ctrl.updateModuleState(ms.copyWith(
        drivingStepsDone: done ? ms.drivingStepsDone.where((x) => x != i).toList() : [...ms.drivingStepsDone, i],
      ));
    }

    return WCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(l.licencePath, style: context.t.h2.copyWith(color: c.text)),
          gap12,
          for (final (i, (title, sub)) in steps.indexed)
            IntrinsicHeight(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Column(
                    children: [
                      Semantics(
                        container: true,
                        button: true,
                        checked: ms.drivingStepsDone.contains(i),
                        label: title,
                        excludeSemantics: true,
                        child: InkWell(
                          customBorder: const CircleBorder(),
                          onTap: () => toggle(i),
                          child: SizedBox.square(
                            dimension: WSpace.tap,
                            child: Center(
                              child: Container(
                                width: 30,
                                height: 30,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: ms.drivingStepsDone.contains(i) ? c.done.bg : (i == current ? c.primaryFill : c.surface),
                                  border: Border.all(color: i == current ? c.primaryFill : c.border),
                                ),
                                child: Center(
                                  child: ms.drivingStepsDone.contains(i)
                                      ? Icon(Icons.check_rounded, size: 18, color: c.done.ink)
                                      : Text('${i + 1}', style: context.t.metric.copyWith(fontSize: 13, color: i == current ? c.onPrimary : c.caption)),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                      if (i < steps.length - 1) Expanded(child: Container(width: 2, color: c.border)),
                    ],
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.only(top: 10, bottom: 14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Text(title, style: (i == current ? context.t.bodyStrong : context.t.small.copyWith(fontWeight: FontWeight.w600)).copyWith(color: c.text)),
                          Text(sub, style: context.t.caption.copyWith(color: c.caption)),
                          if (i == 0 && current == 0) ...[
                            gap8,
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(color: c.surfaceSubtle, borderRadius: WRadius.tileR),
                              child: Text(l.minimumPrefix(libraryText(ref, 'LIFE-01', ActionField.minimum, context.lang)), style: context.t.small.copyWith(color: c.textSecondary)),
                            ),
                            gap8,
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: [
                                OutlineAction(label: 'Absher', icon: Icons.open_in_new_rounded, onPressed: () => openExternal(context, kAbsherUrl)),
                                OutlineAction(label: 'my.gov.sa', icon: Icons.open_in_new_rounded, onPressed: () => openExternal(context, kMyGovUrl)),
                              ],
                            ),
                          ],
                          if (i == 0) ...[
                            gap8,
                            if (ms.drivingServiceLink.isNotEmpty)
                              InkWell(
                                onTap: () => openExternal(context, ms.drivingServiceLink),
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(vertical: 8),
                                  child: Text(ms.drivingServiceLink, textDirection: TextDirection.ltr, maxLines: 1, overflow: TextOverflow.ellipsis,
                                      style: WType.english.caption.copyWith(color: c.accentText, decoration: TextDecoration.underline)),
                                ),
                              ),
                            Align(
                              alignment: AlignmentDirectional.centerStart,
                              child: OutlineAction(
                                label: ms.drivingServiceLink.isEmpty ? l.saveServiceLink : l.editServiceLink,
                                onPressed: () async {
                                  final r = await showInputSheet(context, title: l.saveServiceLink, fields: [
                                    InputSpec(l.serviceLinkLabel, hint: 'https://…', initial: ms.drivingServiceLink),
                                  ]);
                                  if (r == null) return;
                                  final link = r[0].startsWith('http') ? r[0] : 'https://${r[0]}';
                                  await ctrl.updateModuleState(ms.copyWith(drivingServiceLink: link, drivingStepsDone: {...ms.drivingStepsDone, 0}.toList()));
                                },
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
        ],
      ),
    );
  }
}

class _PracticeLog extends ConsumerWidget {
  const _PracticeLog();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final c = context.c;
    final sessions = (ref.watch(snapshotProvider)?.drivingSessions ?? const <DrivingSession>[])
        .where((s) => s.kind == 'practice' || s.kind == 'lesson')
        .toList()
      ..sort((a, b) => b.date.compareTo(a.date));
    final minutes = sessions.fold<int>(0, (a, s) => a + s.minutes);
    final covered = {for (final s in sessions) ...s.conditions}.where(kConditions.contains).length;
    return WCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(child: StatTile(value: '${sessions.length}', label: l.sessionsLabel)),
              const SizedBox(width: 8),
              Expanded(child: StatTile(value: '$minutes', label: l.minutesLabel)),
              const SizedBox(width: 8),
              Expanded(child: StatTile(value: l.xOfY('$covered', '${kConditions.length}'), label: l.conditionsTried)),
            ],
          ),
          gap12,
          Text(l.practiceNote, style: context.t.caption.copyWith(color: c.caption)),
          if (sessions.isNotEmpty) ...[
            gap8,
            const RowDivider(),
            for (final s in sessions.take(5))
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        metaJoin([dayMonthKey(context, s.date), ...s.conditions.map((x) => conditionName(context, x))]),
                        style: context.t.small.copyWith(color: c.text),
                      ),
                    ),
                    Text(minutesText(context, s.minutes), style: context.t.caption.copyWith(color: c.caption)),
                  ],
                ),
              ),
          ],
        ],
      ),
    );
  }
}

class _Prep extends ConsumerWidget {
  const _Prep();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final c = context.c;
    final today = ref.watch(todayProvider);
    final s = ref.watch(settingsProvider);
    final all = ref.watch(snapshotProvider)?.drivingSessions ?? const <DrivingSession>[];
    final weekStart = dayKey(startOfWeek(today, weekStartsOn: s.weekStartsOn));
    final hazardWeek = all.where((x) => x.kind == 'hazardPerception' && x.date.compareTo(weekStart) >= 0).length;
    final theory = all.where((x) => x.kind == 'theory').map((x) => x.date).toList();
    final next = nextSpacedPractice(theory, today);
    return ListCard(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TintIcon(Icons.visibility_outlined, tint: c.tint(TintName.slate)),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(l.hazardTitle, style: context.t.bodyStrong.copyWith(color: c.text)),
                    Text(l.hazardSub, style: context.t.small.copyWith(color: c.textSecondary)),
                    Text(l.hazardThisWeek('$hazardWeek'), style: context.t.caption.copyWith(color: c.caption)),
                    gap8,
                    Align(
                      alignment: AlignmentDirectional.centerStart,
                      child: OutlineAction(label: l.logClip, onPressed: () => _quick(ref, 'hazardPerception', 10)),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TintIcon(Icons.quiz_outlined, tint: c.tint(TintName.slate)),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(l.theoryTitle, style: context.t.bodyStrong.copyWith(color: c.text)),
                    Text(l.theorySub, style: context.t.small.copyWith(color: c.textSecondary)),
                    Text(
                      l.nextRound(relativeDays(context, daysBetween(today, next))),
                      style: context.t.caption.copyWith(color: c.caption),
                    ),
                    gap8,
                    Align(
                      alignment: AlignmentDirectional.centerStart,
                      child: OutlineAction(label: l.logRound, onPressed: () => _quick(ref, 'theory', 15)),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Future<void> _quick(WidgetRef ref, String kind, int minutes) async {
    final ctrl = ref.read(lifeControllerProvider.notifier);
    await ctrl.addDrivingSession(DrivingSession(
      id: ctrl.newId('drv'),
      date: dayKey(ref.read(todayProvider)),
      minutes: minutes,
      supervised: false,
      kind: kind,
    ));
  }
}

/// Supervised session sheet: conditions + duration + note.
Future<void> logDrivingSession(BuildContext context, WidgetRef ref, {required String kind}) =>
    showWSheet(context, (_) => _SessionSheet(kind: kind));

class _SessionSheet extends ConsumerStatefulWidget {
  const _SessionSheet({required this.kind});
  final String kind;

  @override
  ConsumerState<_SessionSheet> createState() => _SessionSheetState();
}

class _SessionSheetState extends ConsumerState<_SessionSheet> {
  final Set<String> _cond = {'day'};
  int _min = 20;
  bool _lesson = false;

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final c = context.c;
    return WSheet(
      title: l.logPractice,
      footer: PrimaryButton(
        label: l.save,
        onPressed: () async {
          final ctrl = ref.read(lifeControllerProvider.notifier);
          await ctrl.addDrivingSession(DrivingSession(
            id: ctrl.newId('drv'),
            date: dayKey(ref.read(todayProvider)),
            minutes: _min,
            conditions: _cond.toList(),
            kind: _lesson ? 'lesson' : 'practice',
          ));
          if (context.mounted) Navigator.of(context).pop();
        },
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(l.chooseConditions, style: context.t.label.copyWith(color: c.textSecondary)),
          gap8,
          Wrap(
            spacing: 8,
            runSpacing: 4,
            children: [
              for (final id in kConditions)
                WChoiceChip(
                  label: conditionName(context, id),
                  selected: _cond.contains(id),
                  onTap: () => setState(() => _cond.contains(id) ? _cond.remove(id) : _cond.add(id)),
                ),
            ],
          ),
          gap16,
          Text(l.durationLabel, style: context.t.label.copyWith(color: c.textSecondary)),
          gap8,
          Wrap(
            spacing: 8,
            runSpacing: 4,
            children: [
              for (final m in [10, 20, 30, 45, 60])
                WChoiceChip(label: minutesText(context, m), selected: _min == m, onTap: () => setState(() => _min = m)),
            ],
          ),
          gap8,
          Text(l.minimumPrefix(libraryText(ref, 'LIFE-03', ActionField.minimum, context.lang)), style: context.t.caption.copyWith(color: c.caption)),
          gap12,
          ToggleRow(title: l.withSchool, subtitle: l.withSchoolSub, value: _lesson, onChanged: (v) => setState(() => _lesson = v)),
        ],
      ),
    );
  }
}
