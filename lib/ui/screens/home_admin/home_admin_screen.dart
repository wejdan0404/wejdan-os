/// Home & Admin — 10-minute reset timer, zone of the week, documents &
/// renewals register (reminder windows), errands batch list, and the
/// optional Aquarium module (tasks from the Action Library).
library;

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/date_utils.dart';
import '../../../data/models/models.dart';
import '../../../data/seed/seed_library.dart';
import '../../../data/seed/starter_profile.dart';
import '../../../engine/engine.dart';
import '../../../state/providers.dart';
import '../../format.dart';
import '../../state/completion.dart';
import '../../state/ui_providers.dart';
import '../../theme/theme_ext.dart';
import '../../widgets/widgets.dart';

List<String> zoneNames(BuildContext context) {
  final l = context.l;
  return [l.zoneDesk, l.zoneWardrobe, l.zoneKitchen, l.zoneBathroom, l.zoneBag, l.zoneShelf];
}

/// Zone of the week: rotates weekly (plus her "next zone" taps).
String currentZone(BuildContext context, ModuleState ms, DateTime today) {
  final zones = zoneNames(context);
  final week = daysBetween(DateTime(2026, 1, 4), startOfWeek(today)) ~/ 7;
  return zones[((week + ms.homeZoneOffset) % zones.length + zones.length) % zones.length];
}

class HomeAdminScreen extends ConsumerWidget {
  const HomeAdminScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    return HubPage(
      title: l.homeAdminTitle,
      subtitle: l.homeAdminSub,
      children: const [
        _ResetTimer(),
        gap16,
        _Zone(),
        gap24,
        _Docs(),
        gap24,
        _Errands(),
        gap24,
        _Aquarium(),
      ],
    );
  }
}

class _ResetTimer extends ConsumerStatefulWidget {
  const _ResetTimer();

  @override
  ConsumerState<_ResetTimer> createState() => _ResetTimerState();
}

class _ResetTimerState extends ConsumerState<_ResetTimer> {
  Timer? _timer;
  int _left = 0;
  bool _running = false;
  bool _finished = false;

  int get _total => ref.read(moduleStateProvider).resetMinutes * 60;

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _start() {
    HapticFeedback.lightImpact();
    setState(() {
      if (_left == 0) _left = _total;
      _running = true;
      _finished = false;
    });
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      setState(() => _left--);
      if (_left <= 0) _done();
    });
  }

  void _pause() {
    _timer?.cancel();
    setState(() => _running = false);
  }

  Future<void> _done() async {
    _timer?.cancel();
    setState(() {
      _running = false;
      _left = 0;
      _finished = true;
    });
    final item = ref.read(planItemProvider(StarterProfile.roomReset));
    final logged = ref.read(todayLogsProvider)[StarterProfile.roomReset]?.isDone ?? false;
    final box = context.findRenderObject() as RenderBox?;
    final origin = box == null ? Offset.zero : box.localToGlobal(box.size.center(Offset.zero));
    if (item != null && !logged) {
      await Completion.complete(context, ref, item, CompletionLevel.normal, origin: origin);
    } else {
      CelebrationBurst.show(context, origin);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final c = context.c;
    final lang = context.lang;
    final total = ref.watch(moduleStateProvider).resetMinutes * 60;
    final shown = _left == 0 && !_running ? total : _left;
    final minText = libraryText(ref, 'LIFE-13', ActionField.minimum, lang);
    final bundle = ref.watch(joyItemsProvider).where((j) => j.kind == JoyKind.bundled && j.active && j.bundledHabitId == StarterProfile.roomReset).firstOrNull;
    return WCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(l.resetTitle('${total ~/ 60}'), style: context.t.h2.copyWith(color: c.text)),
          gap12,
          Center(
            child: Semantics(
              liveRegion: true,
              label: _finished ? l.resetDone : l.timeLeft(clockText(Duration(seconds: shown))),
              child: TimerRing(
                progress: total == 0 ? 0 : 1 - shown / total,
                size: 190,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(clockText(Duration(seconds: shown)), textDirection: TextDirection.ltr, style: context.t.metric.copyWith(fontSize: 38, color: c.text)),
                    Text(_finished ? l.resetDone : (_running ? l.resetRunning : l.resetReady), style: context.t.caption.copyWith(color: c.caption)),
                  ],
                ),
              ),
            ),
          ),
          gap12,
          if (minText.isNotEmpty) Text(l.minimumPrefix(minText), textAlign: TextAlign.center, style: context.t.small.copyWith(color: c.textSecondary)),
          if (bundle != null)
            Text(l.withBundle(lang == AppLanguage.ar ? bundle.titleAr : bundle.titleEn), textAlign: TextAlign.center, style: context.t.caption.copyWith(color: c.joy.ink)),
          gap12,
          PrimaryButton(
            label: _running ? l.pause : (_left > 0 ? l.resume : l.startResetN('${total ~/ 60}')),
            onPressed: _running ? _pause : _start,
          ),
        ],
      ),
    );
  }
}

class _Zone extends ConsumerWidget {
  const _Zone();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final c = context.c;
    final lang = context.lang;
    final ms = ref.watch(moduleStateProvider);
    final t = c.domain(DomainId.home);
    final today = ref.watch(todayProvider);
    final minText = libraryText(ref, 'LIFE-14', ActionField.minimum, lang);
    return WCard(
      color: t.bg,
      borderColor: t.bg,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TintIcon(Icons.inventory_2_outlined, tint: Tint(c.surface, t.ink)),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(l.zoneOfWeek, style: context.t.caption.copyWith(color: t.ink)),
                Text(currentZone(context, ms, today), style: context.t.h2.copyWith(color: c.text)),
                Text(
                  [libraryText(ref, 'LIFE-14', ActionField.cardTitle, lang), if (minText.isNotEmpty) l.minimumPrefix(minText)].join(' · '),
                  style: context.t.small.copyWith(color: c.textSecondary),
                ),
                Align(
                  alignment: AlignmentDirectional.centerStart,
                  child: SecondaryButton(
                    small: true,
                    label: l.nextZone,
                    onPressed: () => ref.read(lifeControllerProvider.notifier).updateModuleState(ms.copyWith(homeZoneOffset: ms.homeZoneOffset + 1)),
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

class _Docs extends ConsumerWidget {
  const _Docs();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final c = context.c;
    final today = ref.watch(todayProvider);
    final docs = [...(ref.watch(snapshotProvider)?.adminDocs ?? const <AdminDoc>[])]
      ..sort((a, b) => (a.expiry ?? '9999').compareTo(b.expiry ?? '9999'));
    final due = {for (final d in ref.watch(upcomingDuesProvider).where((d) => d.kind == DueKind.document)) d.refId};
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionLabel(l.docsTitle, trailing: l.addDoc, onTrailingTap: () => showWSheet(context, (_) => const _DocSheet())),
        gap8,
        if (docs.isEmpty)
          WCard(child: Text(l.docsEmpty, style: context.t.small.copyWith(color: c.caption)))
        else
          ListCard(
            children: [
              for (final d in docs)
                InkWell(
                  onTap: () => showWSheet(context, (_) => _DocSheet(existing: d)),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(minHeight: 64),
                    child: Row(
                      children: [
                        TintIcon(Icons.badge_outlined, tint: c.tint(TintName.slate), size: 36),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(d.name, style: context.t.bodyStrong.copyWith(color: c.text)),
                              Text(
                                d.expiry == null
                                    ? l.docNoExpiry
                                    : l.docExpires('${monthName(context, parseDayKey(d.expiry!).month)} ${parseDayKey(d.expiry!).year}',
                                        relativeDays(context, daysBetween(today, parseDayKey(d.expiry!)))),
                                style: context.t.caption.copyWith(color: c.caption),
                              ),
                            ],
                          ),
                        ),
                        WPill(
                          d.expiry == null ? l.docWaiting : (due.contains(d.id) ? l.docRenewNow : l.docRemindBefore('${d.remindDaysBefore}')),
                          tint: due.contains(d.id) ? c.joy : null,
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          ),
        gap8,
        Text(l.docsNote, style: context.t.caption.copyWith(color: c.caption)),
      ],
    );
  }
}

class _DocSheet extends ConsumerStatefulWidget {
  const _DocSheet({this.existing});
  final AdminDoc? existing;

  @override
  ConsumerState<_DocSheet> createState() => _DocSheetState();
}

class _DocSheetState extends ConsumerState<_DocSheet> {
  late final _name = TextEditingController(text: widget.existing?.name ?? '');
  late String? _expiry = widget.existing?.expiry;
  late int _remind = widget.existing?.remindDaysBefore ?? 30;

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final c = context.c;
    final ctrl = ref.read(lifeControllerProvider.notifier);
    return WSheet(
      title: widget.existing == null ? l.addDoc : widget.existing!.name,
      footer: PrimaryButton(
        label: l.save,
        onPressed: _name.text.trim().isEmpty
            ? null
            : () async {
                await ctrl.upsertAdminDoc(AdminDoc(
                  id: widget.existing?.id ?? ctrl.newId('doc'),
                  name: _name.text.trim(),
                  expiry: _expiry,
                  remindDaysBefore: _remind,
                ));
                if (context.mounted) Navigator.of(context).pop();
              },
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextField(controller: _name, onChanged: (_) => setState(() {}), decoration: InputDecoration(labelText: l.docName, hintText: l.docNameHint)),
          gap12,
          NavRow(
            icon: Icons.event_outlined,
            title: l.expiryDate,
            subtitle: _expiry == null ? l.docNoExpiry : '${dayMonthKey(context, _expiry!)} ${parseDayKey(_expiry!).year}',
            onTap: () async {
              final now = ref.read(todayProvider);
              final picked = await showDatePicker(
                context: context,
                initialDate: _expiry == null ? addDays(now, 365) : parseDayKey(_expiry!),
                firstDate: DateTime(now.year - 1),
                lastDate: DateTime(now.year + 15),
              );
              if (picked != null) setState(() => _expiry = dayKey(picked));
            },
          ),
          gap8,
          Text(l.remindBeforeDays, style: context.t.label.copyWith(color: c.textSecondary)),
          gap8,
          Wrap(
            spacing: 8,
            runSpacing: 4,
            children: [
              for (final d in [14, 30, 60, 90])
                WChoiceChip(label: l.daysN('$d'), selected: _remind == d, onTap: () => setState(() => _remind = d)),
            ],
          ),
          if (widget.existing != null) ...[
            gap16,
            OutlineAction(
              label: l.delete,
              tint: c.tint(TintName.rose),
              onPressed: () async {
                await ctrl.deleteAdminDoc(widget.existing!.id);
                if (context.mounted) Navigator.of(context).pop();
              },
            ),
          ],
        ],
      ),
    );
  }
}

class _Errands extends ConsumerWidget {
  const _Errands();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final c = context.c;
    final lang = context.lang;
    final s = ref.watch(snapshotProvider);
    final errands = s?.errands ?? const <Errand>[];
    final admin = s?.weeklyTasks.where((t) => t.id == StarterProfile.admin).firstOrNull;
    final ctrl = ref.read(lifeControllerProvider.notifier);
    final when = admin == null || admin.preferredWeekdays.isEmpty ? null : weekdayName(admin.preferredWeekdays.first).of(lang);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionLabel(when == null ? l.errandsTitle : l.errandsTitleWhen(when), trailing: l.add, onTrailingTap: () async {
          final r = await showInputSheet(context, title: l.addErrand, fields: [InputSpec(l.errandName, hint: l.errandHint)]);
          if (r == null) return;
          await ctrl.upsertErrand(Errand(id: ctrl.newId('err'), title: r[0], addedDate: dayKey(ref.read(todayProvider))));
        }),
        gap8,
        if (errands.isEmpty)
          WCard(child: Text(l.errandsEmpty, style: context.t.small.copyWith(color: c.caption)))
        else
          ListCard(
            children: [
              for (final e in errands)
                Row(
                  children: [
                    Expanded(child: CheckRow(title: e.title, checked: e.done, strike: true, onChanged: (v) => ctrl.upsertErrand(e.copyWith(done: v)))),
                    if (e.done)
                      CircleIconButton(icon: Icons.delete_outline_rounded, filled: false, label: '${l.delete} ${e.title}', onPressed: () => ctrl.deleteErrand(e.id)),
                  ],
                ),
            ],
          ),
      ],
    );
  }
}

class _Aquarium extends ConsumerWidget {
  const _Aquarium();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final c = context.c;
    final lang = context.lang;
    final s = ref.watch(settingsProvider);
    final actions = ref.watch(actionLibraryProvider).where((a) => domainForAction(a) == DomainId.aquarium).toList();
    final ctrl = ref.read(lifeControllerProvider.notifier);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        WCard(
          child: Row(
            children: [
              TintIcon(Icons.set_meal_outlined, tint: c.info),
              const SizedBox(width: 12),
              Expanded(
                child: ToggleRow(
                  title: l.aquarium,
                  subtitle: l.aquariumSub,
                  value: s.aquariumModule,
                  onChanged: (v) async {
                    await ctrl.updateSettings(s.copyWith(aquariumModule: v));
                    await ctrl.setDomainEnabled(DomainId.aquarium, v);
                  },
                ),
              ),
            ],
          ),
        ),
        if (s.aquariumModule && actions.isNotEmpty) ...[
          gap12,
          ListCard(
            children: [
              for (final a in actions)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(a.title(lang), style: context.t.bodyStrong.copyWith(color: c.text)),
                            if (a.text(ActionField.minimum, lang) case final m?)
                              Text(l.minimumPrefix(m), style: context.t.caption.copyWith(color: c.caption)),
                          ],
                        ),
                      ),
                      if (lang == AppLanguage.ar && a.ar?[ActionField.cardMeta] != null) WPill(a.ar![ActionField.cardMeta]!.split('·').first.trim()),
                    ],
                  ),
                ),
            ],
          ),
        ],
      ],
    );
  }
}
