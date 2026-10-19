/// Habit Studio (HabitStudio.dc.html): guided 9-field builder, prefilled
/// from the Action Library, capacity guard ("swap or park") on save.
library;

import 'package:flutter/material.dart' hide Action;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/date_utils.dart';
import '../../../data/models/models.dart';
import '../../../data/seed/seed_library.dart';
import '../../../engine/engine.dart';
import '../../../state/providers.dart';
import '../../format.dart';
import '../../state/ui_providers.dart';
import '../../theme/theme_ext.dart';
import '../../widgets/widgets.dart';

enum StudioField { goal, behavior, versions, cue, prepare, joy, ifThen, frictionUp, reminder }

class HabitStudioScreen extends ConsumerStatefulWidget {
  const HabitStudioScreen({super.key, this.habitId, this.actionId, this.initialStep});

  /// Edit an existing habit.
  final String? habitId;

  /// Prefill a new habit from this Action Library id.
  final String? actionId;
  final int? initialStep;

  @override
  ConsumerState<HabitStudioScreen> createState() => _HabitStudioScreenState();
}

class _HabitStudioScreenState extends ConsumerState<HabitStudioScreen> {
  late Habit _draft;
  Action? _action;
  bool _isNew = true;
  late int _step;
  final Set<StudioField> _touched = {};
  final Map<String, TextEditingController> _tc = {};
  bool _ready = false;

  TextEditingController _c(String key, String value) => _tc.putIfAbsent(key, () => TextEditingController(text: value));

  @override
  void initState() {
    super.initState();
    _step = widget.initialStep ?? 0;
  }

  void _init(LifeSnapshot s) {
    if (_ready) return;
    _ready = true;
    final existing = widget.habitId == null ? null : s.habit(widget.habitId!);
    if (existing != null) {
      // Unedited library texts show in the current language.
      final idx = ref.read(seedTextIndexProvider);
      final lang = s.settings.language;
      String loc(String t) => localizeSeed(idx, t, lang);
      _draft = existing.copyWith(
        cue: loc(existing.cue),
        ifThen: loc(existing.ifThen),
        minimumText: loc(existing.minimumText),
        normalText: loc(existing.normalText),
        bonusText: loc(existing.bonusText),
        joyPairing: loc(existing.joyPairing),
        frictionDown: loc(existing.frictionDown),
        frictionUp: loc(existing.frictionUp),
      );
      _isNew = false;
      _action = existing.actionId == null ? null : s.action(existing.actionId!);
      _touched.addAll(StudioField.values);
      return;
    }
    final a = widget.actionId == null ? _defaultAction(s) : s.action(widget.actionId!);
    _applyAction(a, s);
  }

  Action? _defaultAction(LifeSnapshot s) {
    final grow = s.domains.where((d) => d.state == DomainState.grow).map((d) => d.id).toSet();
    final used = s.habits.map((h) => h.actionId).toSet();
    return s.actions
        .where((a) => a.type == ActionType.habit && !used.contains(a.actionId) && grow.contains(domainForAction(a)))
        .firstOrNull;
  }

  void _applyAction(Action? a, LifeSnapshot s) {
    _action = a;
    final lang = s.settings.language;
    String tx(ActionField f) => a?.text(f, lang) ?? '';
    final normal = a == null || a.timeMinutesNormal < 1 ? 10 : a.timeMinutesNormal;
    _draft = Habit(
      id: 'new',
      actionId: a?.actionId,
      domain: a == null ? DomainId.health : (domainForAction(a) ?? DomainId.health),
      titleAr: a?.title(AppLanguage.ar) ?? '',
      titleEn: a?.nameEn ?? '',
      goal: '',
      cue: tx(ActionField.cue),
      ifThen: tx(ActionField.ifThen),
      minimumText: tx(ActionField.minimum),
      normalText: tx(ActionField.normal),
      bonusText: tx(ActionField.bonus),
      joyPairing: tx(ActionField.joy),
      frictionDown: tx(ActionField.frictionDown),
      frictionUp: tx(ActionField.frictionUp),
      priority: a?.priority ?? Priority.recommended,
      schedule: HabitSchedule(anchor: CueAnchor.slot(a?.slot ?? Slot.anytime)),
      durationMin: normal,
      // Only a minimum the library states; otherwise she sets it (0 = not set).
      minimumDurationMin: a?.statedMinimumMinutes ?? 0,
    );
    for (final c in _tc.values) {
      c.dispose();
    }
    _tc.clear();
    _touched.clear();
  }

  @override
  void dispose() {
    for (final c in _tc.values) {
      c.dispose();
    }
    super.dispose();
  }

  String _fieldTitle(StudioField f) {
    final l = context.l;
    return switch (f) {
      StudioField.goal => l.fGoal,
      StudioField.behavior => l.fBehavior,
      StudioField.versions => l.fVersions,
      StudioField.cue => l.fCue,
      StudioField.prepare => l.fPrepare,
      StudioField.joy => l.fJoy,
      StudioField.ifThen => l.fIfThen,
      StudioField.frictionUp => l.fFrictionUp,
      StudioField.reminder => l.fReminder,
    };
  }

  String _summary(StudioField f) {
    final l = context.l;
    final d = _draft;
    final title = context.lang == AppLanguage.ar ? d.titleAr : d.titleEn;
    return switch (f) {
      StudioField.goal => d.goal.isEmpty ? l.goalEmpty : d.goal,
      StudioField.behavior => title,
      StudioField.versions => l.versionsSummary(
        d.minimumDurationMin <= 0 ? l.setSmallDuration : minutesText(context, d.minimumDurationMin),
        minutesText(context, d.durationMin),
        plusMinutes(context, d.durationMin),
      ),
      StudioField.cue =>
        '${cueLabel(context, d.schedule.anchor, ref.read(settingsProvider))} · ${l.daysPerWeek('${d.schedule.weekdays.length}')}',
      StudioField.prepare => d.frictionDown,
      StudioField.joy => d.joyPairing,
      StudioField.ifThen => d.ifThen,
      StudioField.frictionUp => d.frictionUp,
      StudioField.reminder => d.reminder.enabled ? l.reminderOn : l.reminderOffSummary,
    };
  }

  bool _suggested(StudioField f) =>
      _action != null && !_touched.contains(f) && f != StudioField.goal && f != StudioField.reminder;

  void _edit(Habit h, StudioField f) => setState(() {
    _draft = h;
    _touched.add(f);
  });

  Future<void> _save({bool draft = false}) async {
    final ctrl = ref.read(lifeControllerProvider.notifier);
    var h = _draft;
    if (h.titleAr.trim().isEmpty && h.titleEn.trim().isEmpty) {
      setState(() => _step = StudioField.behavior.index);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(context.l.behaviorRequired)));
      return;
    }
    if (h.minimumDurationMin <= 0) {
      setState(() => _step = StudioField.versions.index);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(context.l.setSmallDurationRequired)));
      return;
    }
    if (h.titleAr.isEmpty) h = h.copyWith(titleAr: h.titleEn);
    if (h.titleEn.isEmpty) h = h.copyWith(titleEn: h.titleAr);
    if (_isNew) h = _withId(h, ctrl.newId('h'));
    if (draft) h = h.copyWith(status: HabitStatus.paused);
    final v = await ctrl.upsertHabit(h);
    if (!mounted) return;
    if (v.isNotEmpty) {
      final saved = await showDialog<bool>(
        context: context,
        builder: (_) => CapacityDialog(habit: h, violations: v),
      );
      if (saved != true || !mounted) return;
    }
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(draft ? context.l.savedDraft : context.l.savedHabit)));
    context.canPop() ? context.pop() : context.go('/today');
  }

  Habit _withId(Habit h, String id) => Habit.fromJson({...h.toJson(), 'id': id});

  Future<void> _pickAction() async {
    final picked = await showWSheet<Action>(context, (_) => const _ActionPicker());
    final s = ref.read(snapshotProvider);
    if (picked != null && s != null && mounted) setState(() => _applyAction(picked, s));
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final c = context.c;
    final s = ref.watch(snapshotProvider);
    if (s == null) return const Scaffold(body: SizedBox.shrink());
    _init(s);
    final lang = context.lang;
    final fields = StudioField.values;
    final last = _step >= fields.length - 1;
    void close() => context.canPop() ? context.pop() : context.go('/today');

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(WSpace.page, 12, WSpace.page, 0),
              child: Row(
                children: [
                  CircleIconButton(icon: backIcon(context), label: l.back, onPressed: close),
                  const Spacer(),
                  Text(l.studioStepOf('${_step + 1}', '${fields.length}'), style: context.t.label.copyWith(color: c.accentText)),
                ],
              ),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(WSpace.page, 12, WSpace.page, 16),
                children: [
                  Semantics(
                    header: true,
                    child: Text(l.studioTitle, style: context.t.h1.copyWith(color: c.text)),
                  ),
                  const SizedBox(height: 4),
                  Text(l.studioSub, style: context.t.small.copyWith(color: c.textSecondary)),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      for (var i = 0; i < fields.length; i++) ...[
                        Expanded(
                          child: AnimatedContainer(
                            duration: WMotion.of(context, WMotion.base),
                            height: 5,
                            decoration: BoxDecoration(color: i <= _step ? c.primaryFill : c.border, borderRadius: WRadius.pillR),
                          ),
                        ),
                        if (i < fields.length - 1) const SizedBox(width: 4),
                      ],
                    ],
                  ),
                  const SizedBox(height: 16),
                  WCard(
                    color: c.info.bg,
                    borderColor: c.info.bg,
                    onTap: _isNew ? _pickAction : null,
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        TintIcon(Icons.menu_book_rounded, tint: Tint(c.surface, c.info.ink)),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(l.fromLibrary, style: context.t.bodyStrong.copyWith(color: c.text)),
                              Text(
                                _action == null
                                    ? l.noLibraryLink
                                    : l.fromLibrarySub(lang == AppLanguage.ar ? _action!.nameAr : _action!.nameEn),
                                style: context.t.caption.copyWith(color: c.info.ink),
                              ),
                            ],
                          ),
                        ),
                        if (_isNew)
                          Text(
                            l.change,
                            style: context.t.caption.copyWith(color: c.accentText, fontWeight: FontWeight.w600),
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  for (final f in fields) ...[
                    _StepRow(
                      index: f.index,
                      title: _fieldTitle(f),
                      summary: _summary(f),
                      expanded: _step == f.index,
                      done: f.index < _step || (_touched.contains(f) && _step != f.index),
                      suggested: _suggested(f),
                      onTap: () => setState(() => _step = f.index),
                      child: _editor(f),
                    ),
                    const SizedBox(height: 10),
                  ],
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(WSpace.page, 0, WSpace.page, 12),
              child: Column(
                children: [
                  PrimaryButton(
                    label: last ? l.saveHabit : l.nextField(_fieldTitle(fields[_step + 1])),
                    onPressed: () => last ? _save() : setState(() => _step++),
                  ),
                  SecondaryButton(label: l.saveAsDraft, onPressed: () => _save(draft: true)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _editor(StudioField f) {
    final l = context.l;
    final c = context.c;
    final d = _draft;
    final ar = context.lang == AppLanguage.ar;
    Widget text(String key, String value, ValueChanged<String> onChanged, {String? hint, int lines = 2}) => TextField(
      controller: _c(key, value),
      textDirection: textDirFor(_c(key, value).text, context),
      minLines: 1,
      maxLines: lines,
      decoration: InputDecoration(hintText: hint),
      onChanged: onChanged,
    );
    Widget help(String s) => Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Text(s, style: context.t.caption.copyWith(color: c.textSecondary)),
    );
    switch (f) {
      case StudioField.goal:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            help(l.goalHelp),
            text('goal', d.goal, (v) => _edit(d.copyWith(goal: v), f), hint: l.goalHint),
          ],
        );
      case StudioField.behavior:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            help(l.behaviorHelp),
            text(
              'title',
              ar ? d.titleAr : d.titleEn,
              // Her own words are her title in both languages (never swapped
              // back to the library's title when the language changes).
              (v) => _edit(_draft.copyWith(titleAr: v, titleEn: v), f),
              hint: l.behaviorHint,
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 6,
              runSpacing: 2,
              children: [
                for (final dom in const [
                  DomainId.health,
                  DomainId.sleep,
                  DomainId.food,
                  DomainId.care,
                  DomainId.ielts,
                  DomainId.learning,
                  DomainId.career,
                  DomainId.driving,
                  DomainId.money,
                  DomainId.home,
                  DomainId.people,
                  DomainId.joy,
                ])
                  WChoiceChip(
                    label: domainShort(context, dom),
                    selected: d.domain == dom,
                    onTap: () => _edit(_draft.copyWith(domain: dom), f),
                  ),
              ],
            ),
          ],
        );
      case StudioField.versions:
        Widget col(String label, String key, String value, ValueChanged<String> onChanged) => Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(label, style: context.t.label.copyWith(color: c.caption)),
              const SizedBox(height: 4),
              TextField(
                controller: _c(key, value),
                textDirection: textDirFor(_c(key, value).text, context),
                minLines: 2,
                maxLines: 4,
                style: context.t.caption.copyWith(color: c.text),
                decoration: const InputDecoration(contentPadding: EdgeInsets.all(10)),
                onChanged: onChanged,
              ),
            ],
          ),
        );
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            help(l.versionsHelp),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                col(l.levelShortMin, 'min', d.minimumText, (v) => _edit(_draft.copyWith(minimumText: v), f)),
                const SizedBox(width: 8),
                col(l.levelShortNormal, 'normal', d.normalText, (v) => _edit(_draft.copyWith(normalText: v), f)),
                const SizedBox(width: 8),
                col(l.levelShortBonus, 'bonus', d.bonusText, (v) => _edit(_draft.copyWith(bonusText: v), f)),
              ],
            ),
            const SizedBox(height: 10),
            _MinuteStepper(
              label: l.minutesOf(l.levelShortMin),
              value: d.minimumDurationMin,
              emptyText: l.setSmallDuration,
              onChanged: (m) => _edit(_draft.copyWith(minimumDurationMin: m, minimumDurationEstimated: false), f),
            ),
            _MinuteStepper(
              label: l.minutesOf(l.levelShortNormal),
              value: d.durationMin,
              onChanged: (m) => _edit(_draft.copyWith(durationMin: m, durationEstimated: false), f),
            ),
          ],
        );
      case StudioField.cue:
        final s = ref.read(settingsProvider);
        final options = <(String, CueAnchor)>[
          (l.cueAfterWake, const CueAnchor(type: AnchorType.wake, offsetMin: 15)),
          (l.slotMorning, const CueAnchor.slot(Slot.morning)),
          (l.slotMidday, const CueAnchor.slot(Slot.midday)),
          (l.slotAfternoon, const CueAnchor.slot(Slot.afternoon)),
          (l.slotEvening, const CueAnchor.slot(Slot.evening)),
          (l.cueBeforeSleep, const CueAnchor(type: AnchorType.sleep, offsetMin: -60)),
          if (s.prayerAnchorsEnabled)
            for (final p in PrayerAnchor.values)
              (
                l.cueAfter(prayerName(context, p)),
                CueAnchor(type: AnchorType.prayer, prayer: p, slot: Slot.anytime, offsetMin: 10),
              ),
        ];
        bool same(CueAnchor a, CueAnchor b) => a.type == b.type && a.slot == b.slot && a.prayer == b.prayer;
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            help(l.cueHelp),
            Wrap(
              spacing: 6,
              runSpacing: 2,
              children: [
                for (final (label, a) in options)
                  WChoiceChip(
                    label: label,
                    selected: same(d.schedule.anchor, a),
                    onTap: () => _edit(_draft.copyWith(schedule: _draft.schedule.copyWith(anchor: a)), f),
                  ),
                WChoiceChip(
                  label: d.schedule.anchor.type == AnchorType.fixedTime ? formatHm(d.schedule.anchor.minute ?? 0) : l.fixedTime,
                  icon: Icons.schedule_rounded,
                  selected: d.schedule.anchor.type == AnchorType.fixedTime,
                  onTap: () async {
                    final t = await showTimePicker(context: context, initialTime: const TimeOfDay(hour: 17, minute: 0));
                    if (t != null) {
                      _edit(_draft.copyWith(schedule: _draft.schedule.copyWith(anchor: CueAnchor.at(t.hour * 60 + t.minute))), f);
                    }
                  },
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(l.onDays, style: context.t.label.copyWith(color: c.caption)),
            const SizedBox(height: 4),
            Wrap(
              spacing: 4,
              runSpacing: 2,
              children: [
                for (final wd in [7, 1, 2, 3, 4, 5, 6])
                  WChoiceChip(
                    label: weekdayName(wd).of(context.lang),
                    selected: d.schedule.weekdays.contains(wd),
                    onTap: () {
                      final days = {...d.schedule.weekdays};
                      days.contains(wd) ? days.remove(wd) : days.add(wd);
                      if (days.isEmpty) return;
                      _edit(_draft.copyWith(schedule: _draft.schedule.copyWith(weekdays: days.toList()..sort())), f);
                    },
                  ),
              ],
            ),
            const SizedBox(height: 10),
            text('cue', d.cue, (v) => _edit(_draft.copyWith(cue: v), f), hint: l.cueTextHint),
          ],
        );
      case StudioField.prepare:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            help(l.prepareHelp),
            text('prep', d.frictionDown, (v) => _edit(_draft.copyWith(frictionDown: v), f), lines: 4),
          ],
        );
      case StudioField.joy:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            help(l.joyHelp),
            text('joy', d.joyPairing, (v) => _edit(_draft.copyWith(joyPairing: v), f), lines: 4),
          ],
        );
      case StudioField.ifThen:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            help(l.ifThenHelp),
            text('ifthen', d.ifThen, (v) => _edit(_draft.copyWith(ifThen: v), f), hint: l.ifThenHint, lines: 4),
          ],
        );
      case StudioField.frictionUp:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            help(l.frictionUpHelp),
            text('fup', d.frictionUp, (v) => _edit(_draft.copyWith(frictionUp: v), f), lines: 4),
          ],
        );
      case StudioField.reminder:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            help(l.reminderHelp),
            Row(
              children: [
                Expanded(
                  child: Text(l.oneReminderAtCue, style: context.t.small.copyWith(color: c.text)),
                ),
                Switch(
                  value: d.reminder.enabled,
                  onChanged: (v) => _edit(
                    _draft.copyWith(
                      reminder: HabitReminder(
                        enabled: v,
                        offsetMin: d.reminder.offsetMin,
                        textAr: d.reminder.textAr,
                        textEn: d.reminder.textEn,
                      ),
                    ),
                    f,
                  ),
                ),
              ],
            ),
          ],
        );
    }
  }
}

class _MinuteStepper extends StatelessWidget {
  const _MinuteStepper({required this.label, required this.value, required this.onChanged, this.emptyText});
  final String label;
  final int value;

  /// Shown instead of "0 د" while the value is not set.
  final String? emptyText;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    return Row(
      children: [
        Expanded(
          child: Text(label, style: context.t.caption.copyWith(color: context.c.textSecondary)),
        ),
        CircleIconButton(
          icon: Icons.remove_rounded,
          label: '${l.fewer} · $label',
          onPressed: value <= 1 ? null : () => onChanged(value - 1),
        ),
        SizedBox(
          width: 64,
          child: Text(
            value <= 0 ? (emptyText ?? '') : minutesText(context, value),
            textAlign: TextAlign.center,
            style: context.t.caption.copyWith(fontWeight: FontWeight.w600, color: context.c.deep),
          ),
        ),
        CircleIconButton(icon: Icons.add_rounded, label: '${l.more} · $label', onPressed: () => onChanged(value + 1)),
      ],
    );
  }
}

class _StepRow extends StatelessWidget {
  const _StepRow({
    required this.index,
    required this.title,
    required this.summary,
    required this.expanded,
    required this.done,
    required this.suggested,
    required this.onTap,
    required this.child,
  });
  final int index;
  final String title;
  final String summary;
  final bool expanded;
  final bool done;
  final bool suggested;
  final VoidCallback onTap;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final l = context.l;
    final badge = expanded
        ? Container(
            width: 30,
            height: 30,
            alignment: Alignment.center,
            decoration: BoxDecoration(color: c.primaryFill, shape: BoxShape.circle),
            child: Text('${index + 1}', style: context.t.metric.copyWith(fontSize: 13, color: c.onPrimary)),
          )
        : done
        ? TintIcon(Icons.check_rounded, tint: c.done, size: 30)
        : Container(
            width: 30,
            height: 30,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: c.border),
            ),
            child: Text('${index + 1}', style: context.t.metric.copyWith(fontSize: 13, color: c.caption)),
          );
    return WCard(
      borderColor: expanded ? c.sky300 : null,
      borderWidth: expanded ? 1.5 : 1,
      onTap: expanded ? null : onTap,
      semanticLabel: expanded ? null : '$title. $summary',
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              badge,
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: context.t.bodyStrong.copyWith(color: c.text)),
                    if (summary.isNotEmpty)
                      Text(
                        summary,
                        textDirection: textDirFor(summary, context),
                        maxLines: expanded ? 4 : 2,
                        overflow: TextOverflow.ellipsis,
                        style: context.t.caption.copyWith(color: c.caption),
                      ),
                  ],
                ),
              ),
              if (suggested && !expanded) ...[const SizedBox(width: 8), WPill(l.suggested, tint: c.tint(TintName.primary))],
            ],
          ),
          AnimatedSize(
            duration: WMotion.of(context, WMotion.base),
            curve: WMotion.curve,
            alignment: AlignmentDirectional.topStart,
            child: expanded
                ? Padding(padding: const EdgeInsets.only(top: 12), child: child)
                : const SizedBox(width: double.infinity),
          ),
        ],
      ),
    );
  }
}

/// "Swap or park" (spec §5.8): the save would break a cap.
class CapacityDialog extends ConsumerStatefulWidget {
  const CapacityDialog({super.key, required this.habit, required this.violations});
  final Habit habit;
  final List<CapacityViolation> violations;

  @override
  ConsumerState<CapacityDialog> createState() => _CapacityDialogState();
}

class _CapacityDialogState extends ConsumerState<CapacityDialog> {
  String? _swap;

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final c = context.c;
    final ctrl = ref.read(lifeControllerProvider.notifier);
    final core = ref.watch(coreHabitsProvider).where((h) => h.id != widget.habit.id).toList();
    final v = widget.violations.first;
    final rule = switch (v.rule) {
      CapacityRule.coreHabits => l.capCoreHabits('${v.max}'),
      CapacityRule.growDomains => l.capGrow('${v.max}'),
      CapacityRule.maintainDomains => l.capMaintain('${v.max}'),
      CapacityRule.activeProjects => l.capProjects('${v.max}'),
      CapacityRule.activeCourses => l.capCourses('${v.max}'),
    };
    return AlertDialog(
      title: Text(l.swapOrParkTitle),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(rule, style: context.t.small.copyWith(color: c.textSecondary)),
            if (v.rule == CapacityRule.coreHabits) ...[
              const SizedBox(height: 12),
              Text(l.swapWith, style: context.t.label.copyWith(color: c.caption)),
              Wrap(
                spacing: 6,
                runSpacing: 2,
                children: [
                  for (final h in core)
                    WChoiceChip(
                      label: context.lang == AppLanguage.ar ? h.titleAr : h.titleEn,
                      selected: _swap == h.id,
                      onTap: () => setState(() => _swap = h.id),
                    ),
                ],
              ),
            ],
          ],
        ),
      ),
      actions: [
        SecondaryButton(
          label: l.parkIt,
          onPressed: () async {
            await ctrl.upsertHabit(widget.habit.copyWith(status: HabitStatus.paused), force: true);
            if (context.mounted) Navigator.pop(context, true);
          },
        ),
        if (_swap != null)
          SecondaryButton(
            label: l.swap,
            onPressed: () async {
              final other = ref.read(snapshotProvider)!.habit(_swap!)!;
              await ctrl.upsertHabit(other.copyWith(status: HabitStatus.paused), force: true);
              await ctrl.upsertHabit(widget.habit, force: true);
              if (context.mounted) Navigator.pop(context, true);
            },
          ),
        SecondaryButton(label: l.cancel, onPressed: () => Navigator.pop(context, false)),
      ],
    );
  }
}

class _ActionPicker extends ConsumerStatefulWidget {
  const _ActionPicker();

  @override
  ConsumerState<_ActionPicker> createState() => _ActionPickerState();
}

class _ActionPickerState extends ConsumerState<_ActionPicker> {
  String _q = '';

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final c = context.c;
    final ar = context.lang == AppLanguage.ar;
    final all = ref
        .watch(actionLibraryProvider)
        .where((a) => (a.type == ActionType.habit || a.type == ActionType.routineStep) && domainForAction(a) != null)
        .where((a) => _q.isEmpty || a.nameAr.contains(_q) || a.nameEn.toLowerCase().contains(_q.toLowerCase()))
        .toList();
    return WSheet(
      title: l.evidenceLibrary,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextField(
            decoration: InputDecoration(hintText: l.searchLibrary, prefixIcon: const Icon(Icons.search_rounded)),
            onChanged: (v) => setState(() => _q = v.trim()),
          ),
          const SizedBox(height: 12),
          for (final a in all)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: WCard(
                padding: const EdgeInsets.all(12),
                onTap: () => Navigator.pop(context, a),
                semanticLabel: ar ? a.nameAr : a.nameEn,
                child: Row(
                  children: [
                    DomainIcon(domainForAction(a)!, size: 36),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            ar ? a.nameAr : a.nameEn,
                            style: context.t.small.copyWith(fontWeight: FontWeight.w600, color: c.text),
                          ),
                          Text(
                            '${a.actionId} · ${a.evidenceStrength}',
                            textDirection: TextDirection.ltr,
                            style: WType.english.label.copyWith(color: c.caption),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}
