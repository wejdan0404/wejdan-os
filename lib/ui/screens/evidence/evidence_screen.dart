/// Evidence Library — browse the 112 actions by domain, strength badges,
/// sources (open link), "add to my plan": habits / routine steps → Habit
/// Studio prefill; weekly tasks → weekly task; systems / project steps →
/// Idea Inbox. Texts in the current language («لا ينطبق» fields hidden).
library;

import 'package:flutter/material.dart' hide Action;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../data/models/models.dart';
import '../../../data/seed/seed_library.dart';
import '../../../engine/engine.dart' show weekdayName;
import '../../../state/providers.dart';
import '../../format.dart';
import '../../theme/theme_ext.dart';
import '../../widgets/widgets.dart';
import '../ielts/ielts_screen.dart' show openExternal;
import '../../router.dart' show rootNavigatorKey;
import '../path/path_screen.dart' show addProject;

(String, Tint) strengthPill(BuildContext context, String s) {
  final l = context.l;
  final c = context.c;
  return switch (s) {
    'Guideline' => (l.evGuideline, c.done),
    'SR/MA' => (l.evSrMa, c.info),
    'RCT' => (l.evRct, c.tint(TintName.lilac)),
    'Observational' => (l.evObservational, c.tint(TintName.sand)),
    _ => (l.evExpert, c.rest),
  };
}

String actionTypeName(BuildContext context, ActionType t) => switch (t) {
  ActionType.habit => context.l.atHabit,
  ActionType.routineStep => context.l.atRoutineStep,
  ActionType.weeklyTask => context.l.atWeekly,
  ActionType.systemAutomation => context.l.atSystem,
  ActionType.reference => context.l.atReference,
  ActionType.projectStep => context.l.atProjectStep,
  ActionType.engineRule => context.l.atReference,
};

/// True when the action is already used by a habit, weekly task or project.
bool actionInPlan(LifeSnapshot? s, String id) =>
    s != null &&
    (s.habits.any((h) => h.actionId == id && h.status != HabitStatus.archived) ||
        s.weeklyTasks.any((t) => t.actionId == id && t.active) ||
        s.projects.any((p) => p.steps.any((st) => st.actionId == id)) ||
        s.routines.any((r) => r.steps.any((st) => st.actionId == id)));

Future<void> addActionToPlan(BuildContext context, WidgetRef ref, Action a) async {
  switch (a.type) {
    case ActionType.habit:
    case ActionType.routineStep:
      context.push('/studio?action=${Uri.encodeComponent(a.actionId)}');
    case ActionType.weeklyTask:
      await showWSheet(context, (_) => _WeeklySheet(action: a));
    case ActionType.systemAutomation:
    case ActionType.projectStep:
      await addProject(context, ref, ProjectStatus.idea, title: a.title(context.lang), actionId: a.actionId);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(context.l.addedToInbox)));
      }
    case ActionType.reference:
    case ActionType.engineRule:
      break;
  }
}

class EvidenceScreen extends ConsumerStatefulWidget {
  const EvidenceScreen({super.key});

  @override
  ConsumerState<EvidenceScreen> createState() => _EvidenceScreenState();
}

class _EvidenceScreenState extends ConsumerState<EvidenceScreen> {
  DomainId? _domain;

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final c = context.c;
    final all = ref.watch(actionLibraryProvider);
    final domainOrder = [for (final d in ref.watch(domainsProvider)) d.id];
    final present = {for (final a in all) ?domainForAction(a)};
    final domains = domainOrder.where(present.contains).toList();
    final shown = _domain == null ? all : all.where((a) => domainForAction(a) == _domain).toList();
    return HubPage(
      title: l.evidenceLibrary,
      subtitle: l.evidenceScreenSub,
      children: [
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              WChoiceChip(label: l.filterAll, selected: _domain == null, onTap: () => setState(() => _domain = null)),
              for (final d in domains) ...[
                const SizedBox(width: 8),
                WChoiceChip(label: domainShort(context, d), selected: _domain == d, onTap: () => setState(() => _domain = d)),
              ],
            ],
          ),
        ),
        gap12,
        WCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(l.strengthStrongest, style: context.t.caption.copyWith(color: c.caption)),
              gap8,
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [
                  for (final s in ['Guideline', 'SR/MA', 'RCT', 'Observational', 'Expert consensus'])
                    () {
                      final (t, tint) = strengthPill(context, s);
                      return WPill(t, tint: tint);
                    }(),
                ],
              ),
              gap8,
              Text(l.strengthLegend, style: context.t.caption.copyWith(color: c.textSecondary)),
            ],
          ),
        ),
        gap16,
        Semantics(
          liveRegion: true,
          child: Text(l.actionsCount('${shown.length}', '${all.length}'), style: context.t.label.copyWith(color: c.text)),
        ),
        gap8,
        for (final a in shown) ...[ActionCard(action: a), gap12],
      ],
    );
  }
}

class ActionCard extends ConsumerWidget {
  const ActionCard({super.key, required this.action});
  final Action action;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final c = context.c;
    final lang = context.lang;
    final a = action;
    final d = domainForAction(a);
    final (sLabel, sTint) = strengthPill(context, a.evidenceStrength);
    final inPlan = actionInPlan(ref.watch(snapshotProvider), a.actionId);
    final what = a.text(ActionField.what, lang);
    final min = a.text(ActionField.minimum, lang);
    final src = a.sources.firstOrNull;
    return WCard(
      onTap: () => showWSheet(context, (_) => ActionDetailSheet(action: a)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  metaJoin([if (d != null) domainShort(context, d), actionTypeName(context, a.type)]),
                  style: context.t.caption.copyWith(color: c.caption),
                ),
              ),
              WPill(sLabel, tint: sTint),
            ],
          ),
          gap8,
          Text(a.title(lang), style: context.t.h2.copyWith(color: c.text)),
          if (a.sources.isEmpty) ...[
            const SizedBox(height: 6),
            Align(alignment: AlignmentDirectional.centerStart, child: WPill(l.unsourcedBadge, tint: c.rest)),
          ],
          if (what != null) ...[
            const SizedBox(height: 4),
            Text(what, maxLines: 3, overflow: TextOverflow.ellipsis, textDirection: textDirFor(what, context), style: context.t.small.copyWith(color: c.textSecondary)),
          ],
          if (src != null) ...[
            gap8,
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: c.surfaceSubtle, borderRadius: WRadius.tileR),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(l.sourceLabel, style: context.t.label.copyWith(color: c.caption)),
                  Text(
                    '${src.title}${src.year == null ? '' : ' (${src.year})'}',
                    textDirection: TextDirection.ltr,
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                    style: WType.english.caption.copyWith(color: c.text),
                  ),
                ],
              ),
            ),
          ] else ...[
            gap8,
            Text(l.noSourceListed, style: context.t.caption.copyWith(color: c.caption)),
          ],
          if (min != null) ...[
            gap8,
            Text(l.minimumPrefix(min), style: context.t.caption.copyWith(color: c.textSecondary)),
          ],
          gap8,
          const RowDivider(),
          gap8,
          Wrap(
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 8,
            runSpacing: 4,
            children: [
              if (src != null)
                SecondaryButton(small: true, icon: Icons.open_in_new_rounded, label: l.openSource, onPressed: () => openExternal(context, src.url))
              else
                const SizedBox.shrink(),
              if (inPlan)
                WPill(l.inYourPlan, tint: c.done)
              else if (a.type != ActionType.reference)
                OutlineAction(label: l.addToPlan, onPressed: () => addActionToPlan(context, ref, a))
              else
                WPill(l.atReference),
            ],
          ),
        ],
      ),
    );
  }
}

/// Full action detail (all localised fields; n/a fields hidden) + sources.
class ActionDetailSheet extends ConsumerWidget {
  const ActionDetailSheet({super.key, required this.action});
  final Action action;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final c = context.c;
    final lang = context.lang;
    final a = action;
    final (sLabel, sTint) = strengthPill(context, a.evidenceStrength);
    final inPlan = actionInPlan(ref.watch(snapshotProvider), a.actionId);
    final fields = [
      (l.fieldWhat, ActionField.what),
      (l.doseLabel, ActionField.dose),
      (l.fieldWhy, ActionField.why),
      (l.fieldCue, ActionField.cue),
      (l.levelShortMin, ActionField.minimum),
      (l.levelShortNormal, ActionField.normal),
      (l.levelShortBonus, ActionField.bonus),
      (l.fieldJoy, ActionField.joy),
      (l.fieldEasy, ActionField.frictionDown),
      (l.fFrictionUp, ActionField.frictionUp),
      (l.fieldIfThen, ActionField.ifThen),
      (l.fieldMetric, ActionField.metric),
    ];
    return WSheet(
      title: a.title(lang),
      footer: inPlan || a.type == ActionType.reference
          ? null
          : PrimaryButton(
              label: l.addToPlan,
              onPressed: () async {
                Navigator.of(context).pop();
                final root = rootNavigatorKey.currentContext;
                if (root != null && root.mounted) await addActionToPlan(root, ref, a);
              },
            ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Wrap(spacing: 8, runSpacing: 4, children: [WPill(sLabel, tint: sTint), WPill(actionTypeName(context, a.type)), if (inPlan) WPill(l.inYourPlan, tint: c.done)]),
          gap12,
          for (final (label, f) in fields)
            if (a.text(f, lang) case final t?)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(label, style: context.t.label.copyWith(color: c.caption)),
                    const SizedBox(height: 2),
                    Text(t, textDirection: textDirFor(t, context), style: context.t.small.copyWith(color: c.text)),
                  ],
                ),
              ),
          if (a.text(ActionField.safety, lang) case final safety?) ...[
            WCard(
              color: c.rest.bg,
              borderColor: c.rest.bg,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.shield_outlined, size: 18, color: c.caption),
                  const SizedBox(width: 8),
                  Expanded(child: Text(safety, textDirection: textDirFor(safety, context), style: context.t.small.copyWith(color: c.textSecondary))),
                ],
              ),
            ),
            gap12,
          ],
          SectionLabel(l.sourcesCount('${a.sources.length}')),
          gap8,
          if (a.sources.isEmpty) ...[
            Align(alignment: AlignmentDirectional.centerStart, child: WPill(l.unsourcedBadge, tint: c.rest)),
            const SizedBox(height: 6),
            Text(l.noSourceListed, style: context.t.caption.copyWith(color: c.caption)),
          ],
          for (final s in a.sources) ...[
            WCard(
              onTap: () => openExternal(context, s.url),
              semanticLabel: '${l.openSource}: ${s.title}',
              child: Row(
                children: [
                  Expanded(
                    child: Text('${s.title}${s.year == null ? '' : ' (${s.year})'}', textDirection: TextDirection.ltr, style: WType.english.small.copyWith(color: c.text)),
                  ),
                  const SizedBox(width: 8),
                  Icon(Icons.open_in_new_rounded, size: 18, color: c.accentText),
                ],
              ),
            ),
            gap8,
          ],
        ],
      ),
    );
  }
}

/// Weekly task from a library action: pick a preferred day.
class _WeeklySheet extends ConsumerStatefulWidget {
  const _WeeklySheet({required this.action});
  final Action action;

  @override
  ConsumerState<_WeeklySheet> createState() => _WeeklySheetState();
}

class _WeeklySheetState extends ConsumerState<_WeeklySheet> {
  int? _day;

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final lang = context.lang;
    final a = widget.action;
    const order = [7, 1, 2, 3, 4, 5, 6];
    return WSheet(
      title: a.title(lang),
      footer: PrimaryButton(
        label: l.addToPlan,
        onPressed: () async {
          final ctrl = ref.read(lifeControllerProvider.notifier);
          final minutes = a.timeMinutesNormal < 1 ? 15 : a.timeMinutesNormal;
          await ctrl.upsertWeeklyTask(WeeklyTask(
            id: ctrl.newId('wt'),
            domain: domainForAction(a) ?? DomainId.admin,
            titleAr: a.title(AppLanguage.ar),
            titleEn: a.nameEn,
            actionId: a.actionId,
            minimumText: a.text(ActionField.minimum, lang) ?? '',
            normalText: a.text(ActionField.normal, lang) ?? '',
            durationMin: minutes,
            // Library-stated minimum only; 0 = not stated (no invented number).
            minimumDurationMin: a.statedMinimumMinutes ?? 0,
            preferredWeekdays: _day == null ? const [] : [_day!],
            anchor: CueAnchor.slot(a.slot),
            pinned: true,
          ));
          if (context.mounted) {
            Navigator.of(context).pop();
            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l.addedWeekly)));
          }
        },
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(l.weeklyPickDay, style: context.t.small.copyWith(color: context.c.textSecondary)),
          gap12,
          Wrap(
            spacing: 8,
            runSpacing: 4,
            children: [
              WChoiceChip(label: l.thisWeekAnyDay, selected: _day == null, onTap: () => setState(() => _day = null)),
              for (final d in order)
                WChoiceChip(label: weekdayName(d).of(lang), selected: _day == d, onTap: () => setState(() => _day = d)),
            ],
          ),
        ],
      ),
    );
  }
}

