/// Onboarding — 6 steps (spec §7.1; Onboarding1–3.dc.html set the visual
/// language): welcome → Life Map → wake/sleep & anchors → starter habits
/// (max 5) → Joy Map & bundles → notifications & privacy → "your first day
/// is ready". Every step writes through to the repository as she goes.
library;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart' hide Action;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/date_utils.dart';
import '../../../data/models/models.dart';
import '../../../data/seed/seed_library.dart';
import '../../../engine/engine.dart';
import '../../../state/providers.dart';
import '../../format.dart';
import '../../theme/theme_ext.dart';
import '../../widgets/widgets.dart';
import 'onboarding_art.dart';

const int kOnboardingSteps = 6;
const int kMaxStarterHabits = 5;
const int kMaxBundles = 3;

class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key, this.initialStep = 0});
  final int initialStep;

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  late int _step = widget.initialStep.clamp(0, kOnboardingSteps - 1);
  Set<String>? _habitPicks; // action ids
  bool _busy = false;

  LifeController get _ctrl => ref.read(lifeControllerProvider.notifier);

  Future<void> _next() async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      if (_step == 3) await _applyHabits();
      if (_step == kOnboardingSteps - 1) {
        await _finish();
        return;
      }
      setState(() => _step++);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _back() => setState(() => _step = (_step - 1).clamp(0, kOnboardingSteps - 1));

  Future<void> _finish() async {
    final s = ref.read(settingsProvider);
    await _ctrl.updateSettings(s.copyWith(onboardingDone: true));
    await _ctrl.scheduleTodayNudges();
    if (mounted) context.go('/brief');
  }

  Future<void> _useSample() async {
    final s = ref.read(settingsProvider);
    await _ctrl.updateSettings(s.copyWith(onboardingDone: true));
    if (mounted) context.go('/brief');
  }

  // ---- step 4: starter habits ------------------------------------------------

  /// Candidate actions: her existing standalone habits + Habit-type actions
  /// of the Grow domains, Core priority first.
  List<Action> _candidates(LifeSnapshot s) {
    final grow = s.domains.where((d) => d.state == DomainState.grow && d.enabled).map((d) => d.id).toSet();
    final existing = s.habits
        .where((h) => h.routineId == null && h.actionId != null && grow.contains(h.domain))
        .map((h) => h.actionId!)
        .toList();
    final out = <Action>[for (final id in existing) ?s.action(id)];
    final lib = s.actions.where((a) {
      final d = domainForAction(a);
      return a.type == ActionType.habit && d != null && grow.contains(d) && !existing.contains(a.actionId);
    }).toList()..sort((a, b) => a.priority.index.compareTo(b.priority.index));
    return [...out, ...lib];
  }

  Set<String> _initialPicks(LifeSnapshot s) => s.habits
      .where((h) =>
          h.routineId == null &&
          h.actionId != null &&
          h.isActive &&
          s.domains.any((d) => d.id == h.domain && d.state == DomainState.grow && d.enabled))
      .map((h) => h.actionId!)
      .take(kMaxStarterHabits)
      .toSet();

  Future<void> _applyHabits() async {
    final s = ref.read(snapshotProvider);
    final picks = _habitPicks;
    if (s == null || picks == null) return;
    // Only standalone Grow habits are "starter habits"; Maintain habits
    // (room reset, spend log) are not part of this pick and stay as they are.
    final grow = s.domains.where((d) => d.state == DomainState.grow && d.enabled).map((d) => d.id).toSet();
    for (final h in s.habits.where((h) => h.routineId == null && h.actionId != null && grow.contains(h.domain))) {
      final want = picks.contains(h.actionId);
      if (want && !h.isActive) await _ctrl.upsertHabit(h.copyWith(status: HabitStatus.active), force: true);
      if (!want && h.isActive) await _ctrl.upsertHabit(h.copyWith(status: HabitStatus.paused), force: true);
    }
    final have = s.habits.map((h) => h.actionId).toSet();
    var order = 30;
    for (final id in picks.where((p) => !have.contains(p))) {
      final a = s.action(id);
      final d = a == null ? null : domainForAction(a);
      if (a == null || d == null) continue;
      final normal = a.timeMinutesNormal < 1 ? 5 : a.timeMinutesNormal;
      final lang = ref.read(settingsProvider).language;
      String tx(ActionField f) => a.text(f, lang) ?? '';
      await _ctrl.upsertHabit(
        Habit(
          id: _ctrl.newId('h'),
          actionId: a.actionId,
          domain: d,
          titleAr: a.title(AppLanguage.ar),
          titleEn: a.nameEn,
          cue: tx(ActionField.cue),
          ifThen: tx(ActionField.ifThen),
          minimumText: tx(ActionField.minimum),
          normalText: tx(ActionField.normal),
          bonusText: tx(ActionField.bonus),
          joyPairing: tx(ActionField.joy),
          frictionDown: tx(ActionField.frictionDown),
          frictionUp: tx(ActionField.frictionUp),
          priority: a.priority,
          schedule: HabitSchedule(anchor: CueAnchor.slot(a.slot)),
          durationMin: normal,
          // Only the library's stated minimum; 0 = not set (she sets it in
          // the Studio, the Why sheet asks «حددي مدة صغيرة»). Never invented.
          minimumDurationMin: a.statedMinimumMinutes ?? 0,
          sortOrder: order++,
        ),
        force: true,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final c = context.c;
    final s = ref.watch(snapshotProvider);
    if (s == null) return const Scaffold(body: SizedBox.shrink());
    final body = switch (_step) {
      0 => _Welcome(onSample: (kIsWeb || kDebugMode) ? _useSample : null),
      1 => const _LifeMapStep(),
      2 => const _TimesStep(),
      3 => _HabitsStep(
        candidates: _candidates(s),
        picks: _habitPicks ??= _initialPicks(s),
        onToggle: (id) => setState(() {
          final p = _habitPicks!;
          p.contains(id) ? p.remove(id) : (p.length < kMaxStarterHabits ? p.add(id) : null);
        }),
      ),
      4 => const _JoyStep(),
      _ => const _PrivacyStep(),
    };
    final cta = switch (_step) {
      0 => l.onbStart,
      5 => l.onbFinish,
      _ => l.next,
    };
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, WSpace.page, 0),
              child: Row(
                children: [
                  if (_step > 0)
                    CircleIconButton(icon: backIcon(context), label: l.back, filled: false, onPressed: _back)
                  else
                    const SizedBox(width: 8),
                  Expanded(
                    child: Semantics(
                      label: l.xOfY((_step + 1).toString(), '$kOnboardingSteps'),
                      excludeSemantics: true,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          for (var i = 0; i < kOnboardingSteps; i++) ...[
                            AnimatedContainer(
                              duration: WMotion.of(context, WMotion.base),
                              width: 26,
                              height: 5,
                              decoration: BoxDecoration(
                                color: i <= _step ? c.primaryFill : c.border,
                                borderRadius: WRadius.pillR,
                              ),
                            ),
                            if (i < kOnboardingSteps - 1) const SizedBox(width: 5),
                          ],
                        ],
                      ),
                    ),
                  ),
                  Text(l.xOfY((_step + 1).toString(), '$kOnboardingSteps'), style: context.t.label.copyWith(color: c.caption)),
                ],
              ),
            ),
            Expanded(
              child: AnimatedSwitcher(
                duration: WMotion.of(context, WMotion.base),
                child: KeyedSubtree(key: ValueKey(_step), child: body),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(WSpace.page, 8, WSpace.page, 12),
              child: PrimaryButton(label: cta, onPressed: _busy ? null : _next),
            ),
          ],
        ),
      ),
    );
  }
}

// ---- step 1 -----------------------------------------------------------------

class _Welcome extends StatelessWidget {
  const _Welcome({this.onSample});
  final VoidCallback? onSample;

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final c = context.c;
    Widget feature(IconData icon, Tint tint, String title, String sub) => Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TintIcon(icon, tint: tint),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: context.t.bodyStrong.copyWith(color: c.text)),
                Text(sub, style: context.t.caption.copyWith(color: c.caption)),
              ],
            ),
          ),
        ],
      ),
    );
    return ListView(
      padding: const EdgeInsets.fromLTRB(WSpace.page, 20, WSpace.page, 8),
      children: [
        const DayArcArt(),
        const SizedBox(height: 28),
        Semantics(
          header: true,
          child: Text(l.onbWelcomeTitle, style: context.t.display.copyWith(color: c.text)),
        ),
        const SizedBox(height: 8),
        Text(l.onbWelcomeBody, style: context.t.body.copyWith(color: c.textSecondary)),
        const SizedBox(height: 20),
        feature(Icons.eco_outlined, c.done, l.onbF1Title, l.onbF1Sub),
        feature(Icons.auto_awesome_outlined, c.joy, l.onbF2Title, l.onbF2Sub),
        feature(Icons.autorenew_rounded, c.energyRed, l.onbF3Title, l.onbF3Sub),
        const SizedBox(height: 8),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.lock_outline_rounded, size: 16, color: c.caption),
            const SizedBox(width: 6),
            Flexible(
              child: Text(l.onbLocalOnly, style: context.t.caption.copyWith(color: c.caption)),
            ),
          ],
        ),
        if (onSample != null)
          Center(
            child: SecondaryButton(label: l.onbUseSample, onPressed: onSample, small: true),
          ),
      ],
    );
  }
}

// ---- step 2: Life Map ----------------------------------------------------------

class _LifeMapStep extends ConsumerWidget {
  const _LifeMapStep();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final c = context.c;
    final domains = ref.watch(domainsProvider).where((d) => d.enabled && d.parent == null && !d.sensitive).toList();
    int count(DomainState st) => domains.where((d) => d.state == st).length;
    final grow = count(DomainState.grow), maintain = count(DomainState.maintain), rest = count(DomainState.rest);
    Widget counter(String label, String value) => Expanded(
      child: WCard(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: context.t.label.copyWith(color: c.caption)),
            Text(value, style: context.t.bodyStrong.copyWith(color: c.deep)),
          ],
        ),
      ),
    );
    Future<void> set(Domain d, DomainState st) async {
      final v = await ref.read(lifeControllerProvider.notifier).setDomainState(d.id, st);
      if (v.isNotEmpty && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l.capacityReached)));
      }
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(WSpace.page, 16, WSpace.page, 8),
      children: [
        Semantics(
          header: true,
          child: Text(l.lifeMapTitle, style: context.t.h1.copyWith(color: c.text)),
        ),
        const SizedBox(height: 4),
        Text(l.lifeMapBody, style: context.t.small.copyWith(color: c.textSecondary)),
        const SizedBox(height: 16),
        Row(
          children: [
            counter(l.stateGrow, l.xOfY(grow.toString(), '$kMaxGrowDomains')),
            const SizedBox(width: 8),
            counter(l.stateMaintain, l.xOfY(maintain.toString(), '$kMaxMaintainDomains')),
            const SizedBox(width: 8),
            counter(l.stateRest, '$rest'),
          ],
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: c.surfaceSubtle, borderRadius: WRadius.buttonR),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(Icons.lightbulb_outline_rounded, size: 18, color: c.deep),
              const SizedBox(width: 8),
              Expanded(
                child: Text(l.lifeMapHint, style: context.t.caption.copyWith(color: c.textSecondary)),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        WCard(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
          child: Column(
            children: [
              for (var i = 0; i < domains.length; i++) ...[
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Row(
                    children: [
                      DomainIcon(domains[i].id, size: 36),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          domainShort(context, domains[i].id),
                          style: context.t.small.copyWith(color: c.text, fontWeight: FontWeight.w600),
                        ),
                      ),
                      SegmentedPills<DomainState>(
                        groupLabel: domainShort(context, domains[i].id),
                        selected: domains[i].state,
                        minSegmentWidth: 48,
                        selectedTint: (st) => st == DomainState.rest ? c.rest : c.tint(TintName.primary),
                        disabled: {
                          if (grow >= kMaxGrowDomains && domains[i].state != DomainState.grow) DomainState.grow,
                          if (maintain >= kMaxMaintainDomains && domains[i].state != DomainState.maintain) DomainState.maintain,
                        },
                        onSelected: (st) => set(domains[i], st),
                        options: [
                          PillOption(DomainState.grow, l.stateGrow),
                          PillOption(DomainState.maintain, l.stateMaintain),
                          PillOption(DomainState.rest, l.stateRest),
                        ],
                      ),
                    ],
                  ),
                ),
                if (i < domains.length - 1) Divider(color: c.border),
              ],
            ],
          ),
        ),
        const SizedBox(height: 8),
        Text(l.sensitiveModulesNote, style: context.t.caption.copyWith(color: c.caption)),
      ],
    );
  }
}

// ---- step 3: times & anchors ------------------------------------------------------

class _TimesStep extends ConsumerWidget {
  const _TimesStep();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final c = context.c;
    final s = ref.watch(settingsProvider);
    final ctrl = ref.read(lifeControllerProvider.notifier);
    Future<void> pickTime(int current, Settings Function(int) apply) async {
      final t = await showTimePicker(
        context: context,
        initialTime: TimeOfDay(hour: current ~/ 60, minute: current % 60),
      );
      if (t != null) await ctrl.updateSettings(apply(t.hour * 60 + t.minute));
    }

    Widget timeCard(IconData icon, Tint tint, String label, int minute, VoidCallback onTap) => Expanded(
      child: WCard(
        onTap: onTap,
        semanticLabel: '$label ${formatHm(minute)}',
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            TintIcon(icon, tint: tint, size: 36),
            const SizedBox(height: 10),
            Text(label, style: context.t.caption.copyWith(color: c.caption)),
            Text(
              formatHm(minute),
              textDirection: TextDirection.ltr,
              style: context.t.metric.copyWith(fontSize: 28, color: c.deep),
            ),
            Text(l.tapToChange, style: context.t.label.copyWith(color: c.accentText)),
          ],
        ),
      ),
    );

    return ListView(
      padding: const EdgeInsets.fromLTRB(WSpace.page, 16, WSpace.page, 8),
      children: [
        Semantics(
          header: true,
          child: Text(l.timesTitle, style: context.t.h1.copyWith(color: c.text)),
        ),
        const SizedBox(height: 4),
        Text(l.timesBody, style: context.t.small.copyWith(color: c.textSecondary)),
        const SizedBox(height: 16),
        Row(
          children: [
            timeCard(
              Icons.wb_twilight_rounded,
              c.info,
              l.wakeTime,
              s.wakeMinute,
              () => pickTime(s.wakeMinute, (m) => s.withWake(m)),
            ),
            const SizedBox(width: 10),
            timeCard(
              Icons.bedtime_outlined,
              c.energyRed,
              l.sleepTime,
              s.sleepMinute,
              () => pickTime(s.sleepMinute, (m) => s.copyWith(sleepMinute: m)),
            ),
          ],
        ),
        const SizedBox(height: 12),
        WCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  TintIcon(Icons.mosque_outlined, tint: c.done, size: 36),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(l.prayerAnchors, style: context.t.bodyStrong.copyWith(color: c.text)),
                        Text(l.prayerAnchorsSub, style: context.t.caption.copyWith(color: c.caption)),
                      ],
                    ),
                  ),
                  Switch(
                    value: s.prayerAnchorsEnabled,
                    onChanged: (v) => ctrl.updateSettings(s.copyWith(prayerAnchorsEnabled: v)),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: c.surfaceSubtle, borderRadius: WRadius.buttonR),
          child: Text(
            l.timesPreview(formatHm(s.wakeMinute), formatHm((s.sleepMinute - s.eveningShutdownBeforeSleepMin) % 1440)),
            style: context.t.caption.copyWith(color: c.textSecondary),
          ),
        ),
      ],
    );
  }
}

// ---- step 4: starter habits ----------------------------------------------------------

class _HabitsStep extends StatelessWidget {
  const _HabitsStep({required this.candidates, required this.picks, required this.onToggle});
  final List<Action> candidates;
  final Set<String> picks;
  final ValueChanged<String> onToggle;

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final c = context.c;
    final full = picks.length >= kMaxStarterHabits;
    return ListView(
      padding: const EdgeInsets.fromLTRB(WSpace.page, 16, WSpace.page, 8),
      children: [
        Semantics(
          header: true,
          child: Text(l.starterTitle, style: context.t.h1.copyWith(color: c.text)),
        ),
        const SizedBox(height: 4),
        Text(l.starterBody, style: context.t.small.copyWith(color: c.textSecondary)),
        const SizedBox(height: 8),
        Align(
          alignment: AlignmentDirectional.centerEnd,
          child: Text(
            l.xOfY(picks.length.toString(), '$kMaxStarterHabits'),
            style: context.t.label.copyWith(color: c.accentText),
          ),
        ),
        const SizedBox(height: 8),
        for (final a in candidates) ...[
          _PickCard(
            selected: picks.contains(a.actionId),
            enabled: picks.contains(a.actionId) || !full,
            onTap: () => onToggle(a.actionId),
            leading: DomainIcon(domainForAction(a) ?? DomainId.joy, size: 36),
            title: a.title(context.lang),
            subtitle: a.text(ActionField.minimum, context.lang) ?? '',
            subtitleLtr: context.lang == AppLanguage.en,
          ),
          const SizedBox(height: 10),
        ],
      ],
    );
  }
}

class _PickCard extends StatelessWidget {
  const _PickCard({
    required this.selected,
    required this.onTap,
    required this.title,
    this.subtitle,
    this.leading,
    this.enabled = true,
    this.subtitleLtr = false,
    this.chips,
  });
  final bool selected;
  final bool enabled;
  final VoidCallback onTap;
  final String title;
  final String? subtitle;
  final Widget? leading;
  final Widget? chips;
  final bool subtitleLtr;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Semantics(
      container: true,
      button: true,
      checked: selected,
      enabled: enabled,
      label: title,
      excludeSemantics: true,
      child: Opacity(
        opacity: enabled ? 1 : .5,
        child: WCard(
          borderColor: selected ? c.sky300 : null,
          borderWidth: selected ? 2 : 1,
          onTap: enabled ? onTap : null,
          child: Row(
            children: [
              if (leading != null) ...[leading!, const SizedBox(width: 12)],
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (chips != null) ...[chips!, const SizedBox(height: 8)],
                    Text(
                      title,
                      style: context.t.small.copyWith(color: c.text, fontWeight: FontWeight.w600),
                    ),
                    if (subtitle != null && subtitle!.isNotEmpty)
                      Text(
                        subtitle!,
                        textDirection: subtitleLtr ? TextDirection.ltr : null,
                        style: (subtitleLtr ? WType.english.caption : context.t.caption).copyWith(color: c.caption),
                      ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              CheckButton(done: selected, onToggle: enabled ? (_) => onTap() : null, label: title),
            ],
          ),
        ),
      ),
    );
  }
}

// ---- step 5: Joy Map ---------------------------------------------------------------

/// Joy Map chips (id, ar, en). Shopping carries a gentle budget note.
const _joyChips = <(String, String, String)>[
  ('coffee', 'قهوة', 'Coffee'),
  ('series', 'مسلسلات', 'Series'),
  ('podcast', 'بودكاست', 'Podcasts'),
  ('music', 'موسيقى', 'Music'),
  ('reading', 'قراءة', 'Reading'),
  ('drawing', 'رسم', 'Drawing'),
  ('games', 'ألعاب', 'Games'),
  ('outings', 'طلعات', 'Going out'),
  ('friends', 'صديقاتي', 'Friends'),
  ('shopping', 'تسوّق', 'Shopping'),
  ('fishtank', 'حوض السمك', 'Fish tank'),
  ('tech', 'تقنية', 'Tech'),
  ('skincare', 'روتين العناية', 'Skincare ritual'),
];

class _JoyStep extends ConsumerWidget {
  const _JoyStep();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final c = context.c;
    final lang = context.lang;
    final ctrl = ref.read(lifeControllerProvider.notifier);
    final joy = ref.watch(joyItemsProvider);
    final snap = ref.watch(snapshotProvider);
    final mapIds = joy.where((j) => j.id.startsWith('joymap_') && j.active).map((j) => j.id).toSet();
    final custom = joy.where((j) => j.id.startsWith('joymap_custom_')).toList();
    final bundles = joy.where((j) => j.kind == JoyKind.bundled).toList();
    final activeBundles = bundles.where((b) => b.active).length;

    Future<void> toggleChip(String key, String ar, String en) async {
      final id = 'joymap_$key';
      final existing = joy.where((j) => j.id == id).firstOrNull;
      await ctrl.upsertJoyItem(
        existing == null
            ? JoyItem(id: id, kind: JoyKind.free, titleAr: ar, titleEn: en, costsMoney: key == 'shopping', keepFree: true)
            : existing.copyWith(active: !existing.active),
      );
    }

    Future<void> addCustom() async {
      final text = TextEditingController();
      final ok = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: Text(l.somethingElse),
          content: TextField(
            controller: text,
            autofocus: true,
            decoration: InputDecoration(hintText: l.somethingElseHint),
          ),
          actions: [
            SecondaryButton(label: l.cancel, onPressed: () => Navigator.pop(ctx, false)),
            SecondaryButton(label: l.add, onPressed: () => Navigator.pop(ctx, true)),
          ],
        ),
      );
      final t = text.text.trim();
      if (ok == true && t.isNotEmpty) {
        await ctrl.upsertJoyItem(
          JoyItem(id: ctrl.newId('joymap_custom'), kind: JoyKind.free, titleAr: t, titleEn: t, keepFree: true),
        );
      }
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(WSpace.page, 16, WSpace.page, 8),
      children: [
        Row(
          children: [
            const SparkIcon(size: 20),
            const SizedBox(width: 8),
            Expanded(
              child: Semantics(
                header: true,
                child: Text(l.joyMapTitle, style: context.t.h1.copyWith(color: c.text)),
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        Text(l.joyMapBody, style: context.t.small.copyWith(color: c.textSecondary)),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 2,
          children: [
            for (final (key, ar, en) in _joyChips)
              WChoiceChip(
                label: lang == AppLanguage.ar ? ar : en,
                selected: mapIds.contains('joymap_$key'),
                onTap: () => toggleChip(key, ar, en),
              ),
            for (final j in custom)
              WChoiceChip(
                label: j.titleAr,
                selected: j.active,
                onTap: () => ctrl.upsertJoyItem(j.copyWith(active: !j.active)),
              ),
            WChoiceChip(label: l.somethingElse, selected: false, dashed: true, icon: Icons.add_rounded, onTap: addCustom),
          ],
        ),
        const SizedBox(height: 4),
        Text(l.shoppingNote, style: context.t.caption.copyWith(color: c.caption)),
        const SizedBox(height: 20),
        Text(l.bundlesTitle, style: context.t.h2.copyWith(color: c.text)),
        Row(
          children: [
            Expanded(
              child: Text(l.bundlesBody, style: context.t.caption.copyWith(color: c.caption)),
            ),
            Text(l.xOfY(activeBundles.toString(), '$kMaxBundles'), style: context.t.label.copyWith(color: c.accentText)),
          ],
        ),
        const SizedBox(height: 12),
        for (final b in bundles) ...[
          _PickCard(
            selected: b.active,
            enabled: b.active || activeBundles < kMaxBundles,
            onTap: () => ctrl.upsertJoyItem(b.copyWith(active: !b.active)),
            title: lang == AppLanguage.ar ? b.titleAr : b.titleEn,
            chips: Wrap(
              spacing: 6,
              runSpacing: 6,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                JoyBadge(_short(lang == AppLanguage.ar ? b.titleAr : b.titleEn)),
                Icon(Icons.link_rounded, size: 16, color: c.caption),
                if (b.bundledHabitId != null && snap?.habit(b.bundledHabitId!) != null)
                  WPill(
                    lang == AppLanguage.ar ? snap!.habit(b.bundledHabitId!)!.titleAr : snap!.habit(b.bundledHabitId!)!.titleEn,
                    tint: c.info,
                  ),
              ],
            ),
          ),
          const SizedBox(height: 10),
        ],
      ],
    );
  }

  /// "بودكاست — فقط وقت المشي" → "بودكاست".
  static String _short(String s) => s.split('—').first.trim();
}

// ---- step 6: notifications & privacy --------------------------------------------

class _PrivacyStep extends ConsumerStatefulWidget {
  const _PrivacyStep();

  @override
  ConsumerState<_PrivacyStep> createState() => _PrivacyStepState();
}

class _PrivacyStepState extends ConsumerState<_PrivacyStep> {
  bool? _granted;

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final c = context.c;
    final s = ref.watch(settingsProvider);
    final ctrl = ref.read(lifeControllerProvider.notifier);
    Widget stepBtn(IconData icon, String label, VoidCallback? onTap) =>
        CircleIconButton(icon: icon, label: label, onPressed: onTap);
    return ListView(
      padding: const EdgeInsets.fromLTRB(WSpace.page, 16, WSpace.page, 8),
      children: [
        Semantics(
          header: true,
          child: Text(l.privacyTitle, style: context.t.h1.copyWith(color: c.text)),
        ),
        const SizedBox(height: 4),
        Text(l.privacyBody, style: context.t.small.copyWith(color: c.textSecondary)),
        const SizedBox(height: 16),
        WCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  TintIcon(Icons.notifications_none_rounded, tint: c.info, size: 36),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(l.notifCapTitle, style: context.t.bodyStrong.copyWith(color: c.text)),
                        Text(
                          l.notifCapSub(formatHm(s.quietStartMinute), formatHm(s.effectiveQuietEndMinute)),
                          style: context.t.caption.copyWith(color: c.caption),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  stepBtn(
                    Icons.remove_rounded,
                    l.fewer,
                    s.notificationCap <= 0 ? null : () => ctrl.updateSettings(s.copyWith(notificationCap: s.notificationCap - 1)),
                  ),
                  SizedBox(
                    width: 120,
                    child: Semantics(
                      liveRegion: true,
                      child: Text(
                        l.perDay(s.notificationCap.toString()),
                        textAlign: TextAlign.center,
                        style: context.t.bodyStrong.copyWith(color: c.deep),
                      ),
                    ),
                  ),
                  stepBtn(
                    Icons.add_rounded,
                    l.more,
                    s.notificationCap >= 6 ? null : () => ctrl.updateSettings(s.copyWith(notificationCap: s.notificationCap + 1)),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              WChoiceChip(
                label: _granted == null ? l.allowNotifications : (_granted! ? l.notificationsAllowed : l.notificationsNotAllowed),
                selected: _granted == true,
                icon: _granted == true ? Icons.check_rounded : Icons.notifications_active_outlined,
                onTap: () async {
                  final ok = await ref.read(notificationServiceProvider).requestPermission();
                  if (mounted) setState(() => _granted = ok);
                },
              ),
              if (kIsWeb) Text(l.notificationsWebNote, style: context.t.caption.copyWith(color: c.caption)),
            ],
          ),
        ),
        const SizedBox(height: 12),
        WCard(
          child: Row(
            children: [
              TintIcon(Icons.face_retouching_natural_outlined, tint: c.energyRed, size: 36),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(l.appLockTitle, style: context.t.bodyStrong.copyWith(color: c.text)),
                    Text(l.appLockSub, style: context.t.caption.copyWith(color: c.caption)),
                  ],
                ),
              ),
              Switch(
                value: s.appLock,
                onChanged: (v) => ctrl.updateSettings(s.copyWith(appLock: v)),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: c.surfaceSubtle, borderRadius: WRadius.buttonR),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              for (final t in [l.privacyPoint1, l.privacyPoint2, l.privacyPoint3])
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 3),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Padding(
                        padding: const EdgeInsets.only(top: 4),
                        child: Icon(Icons.check_rounded, size: 16, color: c.done.ink),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(t, style: context.t.caption.copyWith(color: c.textSecondary)),
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
}
