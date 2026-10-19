/// مساري — Life Season (Grow/Maintain/Rest editor with capacity guard),
/// year timeline by quarter from her goals' milestones, goals with their
/// next step, projects board (max 2 active) and the Idea Inbox.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/date_utils.dart';
import '../../../data/models/models.dart';
import '../../../engine/engine.dart';
import '../../../state/providers.dart';
import '../../format.dart';
import '../../state/hub_providers.dart';
import '../../theme/theme_ext.dart';
import '../../widgets/widgets.dart';

String quarterName(BuildContext context, int q) => switch (q) {
  1 => context.l.q1Name,
  2 => context.l.q2Name,
  3 => context.l.q3Name,
  _ => context.l.q4Name,
};

String quarterMonths(BuildContext context, int q) => switch (q) {
  1 => context.l.q1Months,
  2 => context.l.q2Months,
  3 => context.l.q3Months,
  _ => context.l.q4Months,
};

String projectStatusName(BuildContext context, ProjectStatus s) => switch (s) {
  ProjectStatus.idea => context.l.psIdea,
  ProjectStatus.active => context.l.psActive,
  ProjectStatus.waiting => context.l.psWaiting,
  ProjectStatus.paused => context.l.psPaused,
  ProjectStatus.done => context.l.psDone,
  ProjectStatus.archived => context.l.psArchived,
};

String capacityMessage(BuildContext context, CapacityViolation v) => switch (v.rule) {
  CapacityRule.coreHabits => context.l.capCoreHabits('${v.max}'),
  CapacityRule.growDomains => context.l.capGrow('${v.max}'),
  CapacityRule.maintainDomains => context.l.capMaintain('${v.max}'),
  CapacityRule.activeProjects => context.l.capProjects('${v.max}'),
  CapacityRule.activeCourses => context.l.capCourses('${v.max}'),
};

IconData goalIcon(DomainId d) => switch (d) {
  DomainId.driving => Icons.directions_car_outlined,
  DomainId.ielts => Icons.translate_rounded,
  DomainId.career => Icons.work_outline_rounded,
  DomainId.health => Icons.favorite_border_rounded,
  DomainId.money => Icons.account_balance_wallet_outlined,
  _ => kDomainIcon[d] ?? Icons.flag_outlined,
};

class PathScreen extends ConsumerStatefulWidget {
  const PathScreen({super.key});

  @override
  ConsumerState<PathScreen> createState() => _PathScreenState();
}

class _PathScreenState extends ConsumerState<PathScreen> {
  int? _quarter;

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final today = ref.watch(todayProvider);
    final current = roadmapQuarter(today);
    final q = _quarter ?? current;
    return HubPage(
      title: l.tabPath,
      back: false,
      subtitle: l.pathSub,
      actions: [
        CircleIconButton(icon: Icons.event_note_outlined, label: l.weeklyReview, onPressed: () => context.push('/review')),
      ],
      children: [
        const SeasonCard(),
        gap24,
        SectionLabel(l.yearInQuarters),
        gap8,
        _YearCard(quarter: q, current: current, onQuarter: (v) => setState(() => _quarter = v)),
        gap24,
        SectionLabel(l.goalsNextStep),
        gap8,
        _Goals(quarter: current),
        gap24,
        const _Projects(),
        gap12,
        const _IdeaInboxRow(),
      ],
    );
  }
}

/// Season summary + editor entry (also used by Weekly Review step 4).
class SeasonCard extends ConsumerWidget {
  const SeasonCard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final c = context.c;
    final lang = context.lang;
    final season = ref.watch(currentSeasonProvider);
    final domains = ref.watch(domainsProvider).where((d) => d.enabled).toList();
    final today = ref.watch(todayProvider);
    final week = season == null ? 1 : (daysBetween(parseDayKey(season.startDate), today) ~/ 7) + 1;
    final total = season?.plannedEndDate == null
        ? null
        : (daysBetween(parseDayKey(season!.startDate), parseDayKey(season.plannedEndDate!)) / 7).ceil();
    List<String> names(DomainState st) =>
        domains.where((d) => d.state == st).map((d) => domainShort(context, d.id)).toList();
    Widget line(String pill, Tint tint, List<String> ns, {String? extra}) => Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(width: lang == AppLanguage.ar ? 64 : 88, child: Align(alignment: AlignmentDirectional.centerStart, child: WPill(pill, tint: tint))),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              [ns.isEmpty ? '—' : ns.join(' · '), ?extra].join(' — '),
              style: context.t.small.copyWith(color: c.textSecondary),
            ),
          ),
        ],
      ),
    );
    final grow = names(DomainState.grow);
    return WCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  season == null ? l.seasonLabel : (lang == AppLanguage.ar ? season.titleAr : season.titleEn),
                  style: context.t.h2.copyWith(color: c.text),
                ),
              ),
              Text(
                total == null ? l.weekN('$week') : l.weekNofM('$week', '$total'),
                style: context.t.caption.copyWith(color: c.caption),
              ),
            ],
          ),
          if (total != null) ...[gap8, WProgressBar(value: (week / total).clamp(0, 1).toDouble())],
          gap8,
          line('${l.stateGrow} ${grow.length}/$kMaxGrowDomains', c.done, grow),
          line(l.stateMaintain, c.info, names(DomainState.maintain)),
          line(l.stateRest, c.rest, names(DomainState.rest), extra: l.restHidden),
          gap8,
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: SecondaryButton(label: l.editSeason, onPressed: () => showWSheet(context, (_) => const SeasonEditorSheet())),
          ),
        ],
      ),
    );
  }
}

/// Grow / Maintain / Rest per domain, capacity-guarded (3 Grow, 5 Maintain).
class SeasonEditor extends ConsumerStatefulWidget {
  const SeasonEditor({super.key});

  @override
  ConsumerState<SeasonEditor> createState() => _SeasonEditorState();
}

class _SeasonEditorState extends ConsumerState<SeasonEditor> {
  String? _msg;

  Future<void> _set(DomainId id, DomainState st) async {
    final v = await ref.read(lifeControllerProvider.notifier).setDomainState(id, st);
    if (!mounted) return;
    setState(() => _msg = v.isEmpty ? null : '${capacityMessage(context, v.first)} ${context.l.swapFirst}');
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final c = context.c;
    final domains = ref.watch(domainsProvider).where((d) => d.enabled).toList();
    final grow = domains.where((d) => d.state == DomainState.grow).length;
    final maintain = domains.where((d) => d.state == DomainState.maintain).length;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ListCard(
          children: [
            for (final d in domains)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Row(
                  children: [
                    Expanded(child: Text(domainShort(context, d.id), style: context.t.bodyStrong.copyWith(color: c.text))),
                    SegmentedPills<DomainState>(
                      groupLabel: domainShort(context, d.id),
                      selected: d.state,
                      minSegmentWidth: 52,
                      onSelected: (st) => _set(d.id, st),
                      options: [
                        PillOption(DomainState.grow, l.stateGrow),
                        PillOption(DomainState.maintain, l.stateMaintain),
                        PillOption(DomainState.rest, l.stateRest),
                      ],
                    ),
                  ],
                ),
              ),
          ],
        ),
        gap8,
        Text(l.seasonCounts('$grow', '$kMaxGrowDomains', '$maintain', '$kMaxMaintainDomains'),
            style: context.t.caption.copyWith(color: c.caption)),
        if (_msg != null) ...[
          gap8,
          Semantics(
            liveRegion: true,
            child: WCard(
              color: c.joy.bg,
              borderColor: c.joy.bg,
              child: Text(_msg!, style: context.t.small.copyWith(color: c.joy.ink)),
            ),
          ),
        ],
      ],
    );
  }
}

class SeasonEditorSheet extends StatelessWidget {
  const SeasonEditorSheet({super.key});

  @override
  Widget build(BuildContext context) => WSheet(
    title: context.l.editSeason,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(context.l.seasonEditorSub, style: context.t.small.copyWith(color: context.c.textSecondary)),
        gap12,
        const SeasonEditor(),
      ],
    ),
  );
}

class _YearCard extends ConsumerWidget {
  const _YearCard({required this.quarter, required this.current, required this.onQuarter});
  final int quarter;
  final int current;
  final ValueChanged<int> onQuarter;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final c = context.c;
    final lang = context.lang;
    final goals = ref.watch(goalsProvider);
    final today = ref.watch(todayProvider);
    final ms = [
      for (final g in goals)
        for (final m in g.milestones)
          if (m.quarter == quarter) (g, m),
    ];
    return WCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              for (var q = 1; q <= 4; q++) ...[
                if (q > 1) const SizedBox(width: 6),
                Expanded(
                  child: Semantics(
                    container: true,
                    button: true,
                    selected: q == quarter,
                    child: Material(
                      color: q == quarter ? c.surfaceSubtle : c.surface,
                      shape: RoundedRectangleBorder(
                        borderRadius: WRadius.tileR,
                        side: BorderSide(color: q == quarter ? c.sky300 : c.border),
                      ),
                      child: InkWell(
                        borderRadius: WRadius.tileR,
                        onTap: () => onQuarter(q),
                        child: ConstrainedBox(
                          constraints: const BoxConstraints(minHeight: 52),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 2),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(l.quarterN('$q'), style: context.t.caption.copyWith(color: q == quarter ? c.accentText : c.text, fontWeight: FontWeight.w600)),
                                Text(quarterMonths(context, q), textAlign: TextAlign.center, style: context.t.label.copyWith(color: c.caption, fontWeight: FontWeight.w500)),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ],
          ),
          if (quarter == current) ...[
            gap12,
            Row(
              children: [
                Container(width: 10, height: 10, decoration: BoxDecoration(color: c.primaryFill, shape: BoxShape.circle)),
                const SizedBox(width: 8),
                Flexible(
                  flex: 3,
                  child: Text(today.isBefore(kRoadmapStart) ? l.beforeRoadmap(dayMonth(context, today)) : l.youAreHere(dayMonth(context, today)), style: context.t.caption.copyWith(color: c.caption)),
                ),
                const SizedBox(width: 8),
                Expanded(child: Divider(color: c.border)),
              ],
            ),
          ],
          gap12,
          Row(
            children: [
              Expanded(child: Text(quarterName(context, quarter), style: context.t.bodyStrong.copyWith(color: c.text))),
            ],
          ),
          gap8,
          if (ms.isEmpty)
            Text(l.noMilestonesQuarter, style: context.t.small.copyWith(color: c.caption))
          else
            for (final (g, m) in ms)
              CheckRow(
                title: lang == AppLanguage.ar ? m.titleAr : m.titleEn,
                subtitle: domainShort(context, g.domain),
                checked: m.done,
                onChanged: (v) => ref.read(lifeControllerProvider.notifier).upsertGoal(
                  g.copyWith(
                    milestones: [
                      for (final x in g.milestones)
                        x.id == m.id ? x.copyWith(done: v, doneDate: v ? dayKey(today) : null) : x,
                    ],
                  ),
                ),
              ),
          gap8,
          Text(l.roadmapNote, style: context.t.caption.copyWith(color: c.caption)),
        ],
      ),
    );
  }
}

class _Goals extends ConsumerWidget {
  const _Goals({required this.quarter});
  final int quarter;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final c = context.c;
    final lang = context.lang;
    final goals = ref.watch(goalsProvider);
    final projects = ref.watch(projectsProvider);
    if (goals.isEmpty) return WCard(child: EmptyRestState(message: l.noGoals));
    return Column(
      children: [
        for (final g in goals) ...[
          () {
            final next = goalNextStep(g, projects, quarter);
            final nextText = next.step != null
                ? (lang == AppLanguage.ar ? next.step!.titleAr : next.step!.titleEn)
                : next.milestone != null
                ? (lang == AppLanguage.ar ? next.milestone!.titleAr : next.milestone!.titleEn)
                : l.goalAllDone;
            final doneCount = g.milestones.where((m) => m.done).length;
            final route = switch (g.domain) {
              DomainId.driving => '/path/driving',
              DomainId.ielts => '/path/ielts',
              _ => null,
            };
            return WCard(
              onTap: () => route != null ? context.push(route) : _editTarget(context, ref, g),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  TintIcon(goalIcon(g.domain), tint: c.domain(g.domain)),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(lang == AppLanguage.ar ? g.titleAr : g.titleEn, style: context.t.bodyStrong.copyWith(color: c.text)),
                        Text(
                          metaJoin([
                            l.milestoneProgress('$doneCount', '${g.milestones.length}'),
                            if (g.targetNote.isNotEmpty) g.targetNote,
                          ]),
                          style: context.t.caption.copyWith(color: c.caption),
                        ),
                        if (g.milestones.isNotEmpty) ...[gap8, WProgressBar(value: g.progress, height: 6)],
                        gap8,
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(color: c.surfaceSubtle, borderRadius: WRadius.tileR),
                          child: Text(l.nextLabel(nextText), style: context.t.small.copyWith(color: c.textSecondary)),
                        ),
                      ],
                    ),
                  ),
                  if (route != null)
                    ExcludeSemantics(child: Icon(forwardIcon(context), color: c.caption, textDirection: TextDirection.ltr)),
                ],
              ),
            );
          }(),
          gap12,
        ],
      ],
    );
  }

  Future<void> _editTarget(BuildContext context, WidgetRef ref, Goal g) async {
    final l = context.l;
    final r = await showInputSheet(
      context,
      title: context.lang == AppLanguage.ar ? g.titleAr : g.titleEn,
      fields: [InputSpec(l.goalTargetLabel, hint: l.goalTargetHint, initial: g.targetNote, optional: true)],
    );
    if (r == null) return;
    await ref.read(lifeControllerProvider.notifier).upsertGoal(g.copyWith(targetNote: r[0]));
  }
}

class _Projects extends ConsumerWidget {
  const _Projects();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final c = context.c;
    final lang = context.lang;
    final projects = ref.watch(projectsProvider);
    final active = projects.where((p) => p.status == ProjectStatus.active).toList();
    final other = projects
        .where((p) => p.status == ProjectStatus.waiting || p.status == ProjectStatus.paused)
        .toList();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(child: SectionLabel(l.projects)),
            WPill(l.activeOfMax('${active.length}', '$kMaxActiveProjects'), tint: c.info),
          ],
        ),
        gap8,
        WCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (active.isEmpty && other.isEmpty) Text(l.noProjects, style: context.t.small.copyWith(color: c.caption)),
              if (active.isNotEmpty) ...[
                Text(l.psActive, style: context.t.label.copyWith(color: c.accentText)),
                gap8,
                LayoutBuilder(
                  builder: (context, box) {
                    final w = box.maxWidth >= 300 ? (box.maxWidth - 10) / 2 : box.maxWidth;
                    return Wrap(
                      spacing: 10,
                      runSpacing: 10,
                      children: [
                        for (final p in active)
                          SizedBox(
                            width: w,
                            child: InkWell(
                              borderRadius: WRadius.tileR,
                              onTap: () => showWSheet(context, (_) => ProjectSheet(projectId: p.id)),
                              child: Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(color: c.surfaceSubtle, borderRadius: WRadius.tileR),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.stretch,
                                  children: [
                                    Text(lang == AppLanguage.ar ? p.titleAr : p.titleEn, style: context.t.bodyStrong.copyWith(color: c.text)),
                                    Text(
                                      p.steps.isEmpty
                                          ? l.noStepsYet
                                          : l.stepOf('${(p.steps.where((s) => s.done).length + 1).clamp(1, p.steps.length)}', '${p.steps.length}'),
                                      style: context.t.caption.copyWith(color: c.caption),
                                    ),
                                    gap8,
                                    WProgressBar(value: p.progress, height: 6),
                                  ],
                                ),
                              ),
                            ),
                          ),
                      ],
                    );
                  },
                ),
              ],
              for (final p in other) ...[
                const RowDivider(),
                InkWell(
                  onTap: () => showWSheet(context, (_) => ProjectSheet(projectId: p.id)),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(minHeight: 48),
                    child: Row(
                      children: [
                        Expanded(child: Text(lang == AppLanguage.ar ? p.titleAr : p.titleEn, style: context.t.small.copyWith(color: c.text))),
                        WPill(projectStatusName(context, p.status)),
                      ],
                    ),
                  ),
                ),
              ],
              gap8,
              Text(l.projectsRule, style: context.t.caption.copyWith(color: c.caption)),
              Align(
                alignment: AlignmentDirectional.centerStart,
                child: SecondaryButton(small: true, icon: Icons.add_rounded, label: l.newProject, onPressed: () => addProject(context, ref, ProjectStatus.idea)),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// Adds a project (ideas go to the inbox; active is capacity-guarded).
Future<void> addProject(BuildContext context, WidgetRef ref, ProjectStatus status, {String? title, String? actionId}) async {
  final l = context.l;
  final r = title != null
      ? [title]
      : await showInputSheet(context, title: l.newProject, fields: [InputSpec(l.projectTitleLabel, hint: l.projectTitleHint)]);
  if (r == null) return;
  final ctrl = ref.read(lifeControllerProvider.notifier);
  final p = Project(
    id: ctrl.newId('p'),
    domain: DomainId.learning,
    titleAr: r[0],
    titleEn: r[0],
    status: status,
    steps: actionId == null ? const [] : [ProjectStep(id: ctrl.newId('ps'), titleAr: r[0], titleEn: r[0], actionId: actionId)],
  );
  await ctrl.upsertProject(p, force: status != ProjectStatus.active);
}

/// Project detail: status (Active guarded to 2), steps (tick / add), delete.
class ProjectSheet extends ConsumerStatefulWidget {
  const ProjectSheet({super.key, required this.projectId});
  final String projectId;

  @override
  ConsumerState<ProjectSheet> createState() => _ProjectSheetState();
}

class _ProjectSheetState extends ConsumerState<ProjectSheet> {
  String? _msg;

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final c = context.c;
    final lang = context.lang;
    final p = ref.watch(projectsProvider).where((x) => x.id == widget.projectId).firstOrNull;
    if (p == null) return WSheet(child: EmptyRestState(message: l.itemNotFound));
    final ctrl = ref.read(lifeControllerProvider.notifier);
    final today = dayKey(ref.watch(todayProvider));
    return WSheet(
      title: lang == AppLanguage.ar ? p.titleAr : p.titleEn,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(l.statusLabel, style: context.t.label.copyWith(color: c.caption)),
          gap8,
          Wrap(
            spacing: 8,
            runSpacing: 4,
            children: [
              for (final st in [ProjectStatus.idea, ProjectStatus.active, ProjectStatus.waiting, ProjectStatus.paused, ProjectStatus.done])
                WChoiceChip(
                  label: projectStatusName(context, st),
                  selected: p.status == st,
                  onTap: () async {
                    final v = await ctrl.upsertProject(p.copyWith(status: st));
                    if (!mounted) return;
                    setState(() => _msg = v.isEmpty ? null : '${capacityMessage(this.context, v.first)} ${this.context.l.parkSuggestion}');
                  },
                ),
            ],
          ),
          if (_msg != null) ...[
            gap8,
            Semantics(
              liveRegion: true,
              child: WCard(color: c.joy.bg, borderColor: c.joy.bg, child: Text(_msg!, style: context.t.small.copyWith(color: c.joy.ink))),
            ),
          ],
          gap16,
          Text(l.stepsLabel, style: context.t.label.copyWith(color: c.caption)),
          for (final st in p.steps)
            CheckRow(
              title: lang == AppLanguage.ar ? st.titleAr : st.titleEn,
              checked: st.done,
              strike: true,
              onChanged: (v) => ctrl.upsertProject(
                p.copyWith(
                  steps: [
                    for (final x in p.steps)
                      x.id == st.id
                          ? ProjectStep(id: x.id, titleAr: x.titleAr, titleEn: x.titleEn, actionId: x.actionId, done: v, doneDate: v ? today : null, durationMin: x.durationMin)
                          : x,
                  ],
                ),
                force: true,
              ),
            ),
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: SecondaryButton(
              small: true,
              icon: Icons.add_rounded,
              label: l.addStep,
              onPressed: () async {
                final r = await showInputSheet(context, title: l.addStep, fields: [InputSpec(l.stepTitleLabel)]);
                if (r == null) return;
                await ctrl.upsertProject(
                  p.copyWith(steps: [...p.steps, ProjectStep(id: ctrl.newId('ps'), titleAr: r[0], titleEn: r[0])]),
                  force: true,
                );
              },
            ),
          ),
          gap16,
          OutlineAction(
            label: l.deleteProject,
            tint: c.tint(TintName.rose),
            onPressed: () async {
              final ok = await showConfirmSheet(context, title: l.deleteProject, body: l.deleteProjectBody, confirmLabel: l.delete, destructive: true);
              if (!ok) return;
              await ctrl.deleteProject(p.id);
              if (context.mounted) Navigator.of(context).maybePop();
            },
          ),
        ],
      ),
    );
  }
}

class _IdeaInboxRow extends ConsumerWidget {
  const _IdeaInboxRow();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final c = context.c;
    final ideas = ref.watch(projectsProvider).where((p) => p.status == ProjectStatus.idea).length;
    return WCard(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: NavRow(
        icon: Icons.inbox_outlined,
        tint: c.joy,
        title: l.ideaInbox,
        subtitle: l.ideaInboxSub('$ideas'),
        onTap: () => showWSheet(context, (_) => const IdeaInboxSheet()),
      ),
    );
  }
}

class IdeaInboxSheet extends ConsumerWidget {
  const IdeaInboxSheet({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final c = context.c;
    final lang = context.lang;
    final ideas = ref.watch(projectsProvider).where((p) => p.status == ProjectStatus.idea).toList();
    return WSheet(
      title: l.ideaInbox,
      footer: PrimaryButton(label: l.addIdea, icon: Icons.add_rounded, onPressed: () => addProject(context, ref, ProjectStatus.idea)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(l.ideaInboxBody, style: context.t.small.copyWith(color: c.textSecondary)),
          gap12,
          if (ideas.isEmpty) EmptyRestState(message: l.ideaInboxEmpty),
          for (final p in ideas)
            NavRow(
              title: lang == AppLanguage.ar ? p.titleAr : p.titleEn,
              subtitle: p.steps.isEmpty ? null : l.stepsCount('${p.steps.length}'),
              onTap: () => showWSheet(context, (_) => ProjectSheet(projectId: p.id)),
            ),
        ],
      ),
    );
  }
}
