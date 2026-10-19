/// Settings — language, theme, notification cap 0–6 (default 4), quiet
/// hours, wake/sleep, prayer anchors (off by default; Makkah / Jeddah),
/// modules (Cycle, PCOS, Aquarium — off by default), app lock (Face ID via
/// local_auth on iOS), export / import JSON, delete all (double confirm).
library;

import 'dart:convert';

import 'package:file_selector/file_selector.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/date_utils.dart';
import '../../../data/models/models.dart';
import '../../../l10n/app_localizations.dart';
import '../../../services/platform_services.dart';
import '../../../state/providers.dart';
import '../../theme/appearance_palette.dart';
import '../../theme/theme_ext.dart';
import '../../widgets/widgets.dart';
import '../sensitive/sensitive_gate.dart' show appLockServiceProvider, sensitiveUnlockedProvider;

const kJeddahLat = 21.4858;
const kJeddahLng = 39.1925;

enum City { makkah, jeddah }

City cityOf(Settings s) => (s.latitude - kJeddahLat).abs() < .01 && (s.longitude - kJeddahLng).abs() < .01 ? City.jeddah : City.makkah;

/// Injectable export share (tests override).
final exportShareProvider = Provider<ExportShareService>((ref) => createExportShareService());

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  String _paletteLabel(AppLocalizations l, ThemePalette palette) => switch (palette) {
        ThemePalette.calmSky => l.paletteCalmSky,
        ThemePalette.lavender => l.paletteLavender,
        ThemePalette.ocean => l.paletteOcean,
        ThemePalette.forest => l.paletteForest,
        ThemePalette.rose => l.paletteRose,
        ThemePalette.terracotta => l.paletteTerracotta,
        ThemePalette.midnight => l.paletteMidnight,
      };

  Future<void> _chooseCustomAccent(BuildContext context, WidgetRef ref, Settings settings) async {
    final initial = settings.customAccentArgb == null
        ? resolveAccentColor(settings.themePalette, null)
        : Color(settings.customAccentArgb!);
    final controller = TextEditingController(text: '#${colorHex(initial)}');
    String? error;
    final picked = await showDialog<Color>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialogState) {
          final parsed = parseReadableAccent(controller.text);
          return AlertDialog(
            title: Text(context.l.customAccentColor),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: parsed ?? initial,
                        borderRadius: WRadius.tileR,
                        border: Border.all(color: context.c.border),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextField(
                        controller: controller,
                        autofocus: true,
                        maxLength: 7,
                        textCapitalization: TextCapitalization.characters,
                        inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9a-fA-F#]'))],
                        decoration: InputDecoration(
                          labelText: context.l.customAccentColor,
                          hintText: context.l.customColorHint,
                          errorText: error,
                          counterText: '',
                        ),
                        onChanged: (_) => setDialogState(() => error = null),
                        onSubmitted: (_) {
                          if (parsed != null) {
                            Navigator.of(dialogContext).pop(parsed);
                          } else {
                            setDialogState(() => error = context.l.invalidCustomColor);
                          }
                        },
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(context.l.customColorHint, style: context.t.caption.copyWith(color: context.c.caption)),
              ],
            ),
            actions: [
              TextButton(onPressed: () => Navigator.of(dialogContext).pop(), child: Text(context.l.cancel)),
              FilledButton(
                onPressed: parsed == null
                    ? () => setDialogState(() => error = context.l.invalidCustomColor)
                    : () => Navigator.of(dialogContext).pop(parsed),
                child: Text(context.l.applyCustomColor),
              ),
            ],
          );
        },
      ),
    );
    controller.dispose();
    if (picked != null) {
      await _save(ref, settings.copyWith(customAccentArgb: picked.toARGB32()));
    }
  }

  Future<void> _save(WidgetRef ref, Settings s, {bool reschedule = false}) async {
    final ctrl = ref.read(lifeControllerProvider.notifier);
    await ctrl.updateSettings(s);
    if (reschedule && s.onboardingDone) await ctrl.scheduleTodayNudges();
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final c = context.c;
    final s = ref.watch(settingsProvider);
    final plan = ref.watch(reminderPlanProvider);
    Widget card(List<Widget> children) => WCard(child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: children));
    final paletteOptions = <ThemePalette, Color>{
      ...kThemePaletteColors,
    };
    Widget timeTile(String label, int minute, ValueChanged<int> onPick) => Expanded(
      child: Semantics(
        container: true,
        button: true,
        label: '$label ${formatHm(minute)}',
        excludeSemantics: true,
        child: Material(
          color: c.surfaceSubtle,
          borderRadius: WRadius.tileR,
          child: InkWell(
            borderRadius: WRadius.tileR,
            onTap: () async {
              final t = await showTimePicker(context: context, initialTime: TimeOfDay(hour: minute ~/ 60, minute: minute % 60));
              if (t != null) onPick(t.hour * 60 + t.minute);
            },
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 10),
              child: Column(
                children: [
                  Text(label, style: context.t.caption.copyWith(color: c.caption)),
                  Text(formatHm(minute), textDirection: TextDirection.ltr, style: context.t.metric.copyWith(fontSize: 18, color: c.text)),
                ],
              ),
            ),
          ),
        ),
      ),
    );

    return HubPage(
      title: l.settings,
      children: [
        SectionLabel(l.langAndLook),
        gap8,
        card([
          Text(l.languageLabel, style: context.t.bodyStrong.copyWith(color: c.text)),
          gap8,
          SegmentedPills<AppLanguage>(
            expand: true,
            groupLabel: l.languageLabel,
            selected: s.language,
            onSelected: (v) => _save(ref, s.copyWith(language: v), reschedule: true),
            options: const [PillOption(AppLanguage.ar, 'العربية'), PillOption(AppLanguage.en, 'English')],
          ),
          gap16,
          Text(l.themeLabel, style: context.t.bodyStrong.copyWith(color: c.text)),
          gap8,
          SegmentedPills<ThemePref>(
            expand: true,
            groupLabel: l.themeLabel,
            selected: s.theme,
            onSelected: (v) => _save(ref, s.copyWith(theme: v)),
            options: [
              PillOption(ThemePref.light, l.themeLight),
              PillOption(ThemePref.dark, l.themeDark),
              PillOption(ThemePref.system, l.themeSystem),
            ],
          ),
          gap16,
          Text(l.appearancePalettes, style: context.t.bodyStrong.copyWith(color: c.text)),
          gap8,
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final entry in paletteOptions.entries)
                ConstrainedBox(
                  constraints: const BoxConstraints(minHeight: WSpace.tap),
                  child: ChoiceChip(
                    selected: s.customAccentArgb == null && s.themePalette == entry.key,
                    label: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(width: 18, height: 18, decoration: BoxDecoration(color: entry.value, shape: BoxShape.circle)),
                        const SizedBox(height: 4),
                        Text(_paletteLabel(l, entry.key)),
                      ],
                    ),
                    onSelected: (_) => _save(
                      ref,
                      s.copyWith(themePalette: entry.key, clearCustomAccent: true),
                    ),
                  ),
                ),
            ],
          ),
          gap8,
          SizedBox(
            height: WSpace.tap,
            child: OutlinedButton.icon(
              onPressed: () => _chooseCustomAccent(context, ref, s),
              icon: Icon(Icons.color_lens_outlined, color: s.customAccentArgb == null ? c.accentText : Color(s.customAccentArgb!)),
              label: Text(l.customAccentColor),
            ),
          ),
          gap16,
          Text(l.cardStyle, style: context.t.bodyStrong.copyWith(color: c.text)),
          gap8,
          SegmentedPills<CardStyle>(
            expand: true,
            groupLabel: l.cardStyle,
            selected: s.cardStyle,
            onSelected: (style) => _save(ref, s.copyWith(cardStyle: style)),
            options: [
              PillOption(CardStyle.outlined, l.cardStyleOutlined),
              PillOption(CardStyle.soft, l.cardStyleSoft),
              PillOption(CardStyle.minimal, l.cardStyleMinimal),
            ],
          ),
          gap16,
          Text(l.appearancePreview, style: context.t.bodyStrong.copyWith(color: c.text)),
          gap8,
          WCard(
            child: Row(
              children: [
                Expanded(child: Text(l.tabToday, style: context.t.bodyStrong.copyWith(color: c.text))),
                DecoratedBox(
                  decoration: BoxDecoration(color: c.primaryFill, borderRadius: WRadius.buttonR),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    child: Text(l.previewAction, style: context.t.small.copyWith(color: c.onPrimary)),
                  ),
                ),
              ],
            ),
          ),
          gap8,
          SizedBox(
            height: WSpace.tap,
            child: TextButton.icon(
              onPressed: () => _save(
                ref,
                s.copyWith(themePalette: ThemePalette.calmSky, clearCustomAccent: true, cardStyle: CardStyle.outlined),
              ),
              icon: const Icon(Icons.restart_alt_rounded),
              label: Text(l.resetAppearance),
            ),
          ),
        ]),
        gap24,
        SectionLabel(l.notificationsSection),
        gap8,
        card([
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(l.notifCapTitle, style: context.t.bodyStrong.copyWith(color: c.text)),
                    Text(l.capRange, style: context.t.caption.copyWith(color: c.caption)),
                  ],
                ),
              ),
              Stepper44(
                value: s.notificationCap,
                min: 0,
                max: 6,
                label: l.notifCapTitle,
                onChanged: (v) => _save(ref, s.copyWith(notificationCap: v), reschedule: true),
              ),
            ],
          ),
          gap8,
          ExcludeSemantics(
            child: Row(
              children: [
                for (var i = 0; i < 6; i++) ...[
                  if (i > 0) const SizedBox(width: 4),
                  Expanded(
                    child: Container(
                      height: 6,
                      decoration: BoxDecoration(color: i < s.notificationCap ? c.primaryFill : c.surfaceSubtle, borderRadius: WRadius.pillR),
                    ),
                  ),
                ],
              ],
            ),
          ),
          gap8,
          Text(s.notificationCap == 0 ? l.capNone : l.capCaption, style: context.t.caption.copyWith(color: c.textSecondary)),
          if (plan != null) Text(l.scheduledToday('${plan.nudges.length}'), style: context.t.caption.copyWith(color: c.caption)),
          gap12,
          const RowDivider(),
          gap12,
          Text(l.quietHours, style: context.t.bodyStrong.copyWith(color: c.text)),
          gap8,
          Row(
            children: [
              timeTile(l.fromLabel, s.quietStartMinute, (m) => _save(ref, s.copyWith(quietStartMinute: m), reschedule: true)),
              const SizedBox(width: 8),
              timeTile(l.toLabel, s.effectiveQuietEndMinute, (m) => _save(ref, s.withQuietEnd(m), reschedule: true)),
            ],
          ),
          gap8,
          Text(l.focusSilences, style: context.t.caption.copyWith(color: c.caption)),
        ]),
        gap24,
        SectionLabel(l.anchorsSection),
        gap8,
        card([
          Row(
            children: [
              timeTile(l.wakeTime, s.wakeMinute, (m) => _save(ref, s.withWake(m), reschedule: true)),
              const SizedBox(width: 8),
              timeTile(l.sleepTime, s.sleepMinute, (m) => _save(ref, s.copyWith(sleepMinute: m), reschedule: true)),
            ],
          ),
          gap8,
          ToggleRow(
            title: l.prayerAnchors,
            subtitle: l.prayerAnchorsSettingsSub,
            value: s.prayerAnchorsEnabled,
            onChanged: (v) => _save(ref, s.copyWith(prayerAnchorsEnabled: v), reschedule: true),
          ),
          if (s.prayerAnchorsEnabled) ...[
            gap8,
            Text(l.cityLabel, style: context.t.label.copyWith(color: c.textSecondary)),
            gap8,
            SegmentedPills<City>(
              expand: true,
              groupLabel: l.cityLabel,
              selected: cityOf(s),
              onSelected: (v) => _save(
                ref,
                v == City.jeddah
                    ? s.copyWith(latitude: kJeddahLat, longitude: kJeddahLng)
                    : s.copyWith(latitude: kDefaultLatitude, longitude: kDefaultLongitude),
                reschedule: true,
              ),
              options: [PillOption(City.makkah, l.cityMakkah), PillOption(City.jeddah, l.cityJeddah)],
            ),
          ],
        ]),
        gap24,
        SectionLabel(l.modulesSection),
        gap8,
        card([
          ToggleRow(title: l.cycleTitle, subtitle: l.cycleModuleSub, locked: true, value: s.cycleModule, onChanged: (v) => _save(ref, s.copyWith(cycleModule: v))),
          const RowDivider(),
          ToggleRow(title: 'PCOS', subtitle: l.pcosModuleSub, locked: true, value: s.pcosModule, onChanged: (v) => _save(ref, s.copyWith(pcosModule: v))),
          const RowDivider(),
          ToggleRow(
            title: l.aquarium,
            subtitle: l.aquariumModuleSub,
            value: s.aquariumModule,
            onChanged: (v) async {
              await _save(ref, s.copyWith(aquariumModule: v));
              await ref.read(lifeControllerProvider.notifier).setDomainEnabled(DomainId.aquarium, v);
            },
          ),
        ]),
        gap12,
        WCard(
          color: c.tint(TintName.lilac).bg,
          borderColor: c.tint(TintName.lilac).bg,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(Icons.shield_outlined, size: 18, color: c.tint(TintName.lilac).ink),
              const SizedBox(width: 8),
              Expanded(child: Text(l.modulesPrivacy, style: context.t.small.copyWith(color: c.tint(TintName.lilac).ink))),
            ],
          ),
        ),
        gap24,
        SectionLabel(l.privacyData),
        gap8,
        card([
          ToggleRow(
            title: l.appLockTitle,
            subtitle: l.appLockSettingsSub,
            value: s.appLock,
            onChanged: (v) async {
              if (v) {
                final lock = ref.read(appLockServiceProvider);
                if (await lock.isAvailable() && !await lock.unlock(reason: l.unlockReason)) return;
              }
              ref.read(sensitiveUnlockedProvider.notifier).set(false);
              await _save(ref, s.copyWith(appLock: v));
            },
          ),
          const RowDivider(),
          ToggleRow(
            title: l.forgivingStreakTitle,
            subtitle: l.forgivingStreakSub,
            value: s.forgivingStreak,
            onChanged: (v) => _save(ref, s.copyWith(forgivingStreak: v)),
          ),
          const RowDivider(),
          NavRow(title: l.exportAll, subtitle: 'JSON', icon: Icons.ios_share_rounded, tint: c.info, onTap: () => _export(context, ref)),
          const RowDivider(),
          NavRow(title: l.importFile, subtitle: 'JSON', icon: Icons.file_open_outlined, tint: c.info, onTap: () => _import(context, ref)),
        ]),
        gap16,
        OutlineAction(label: l.deleteAll, tint: c.tint(TintName.rose), onPressed: () => _deleteAll(context, ref)),
        gap8,
        Center(child: Text(l.deleteAllNote, textAlign: TextAlign.center, style: context.t.caption.copyWith(color: c.caption))),
        gap16,
        Center(
          child: SecondaryButton(
            small: true,
            label: l.replayOnboarding,
            onPressed: () async {
              await _save(ref, s.copyWith(onboardingDone: false));
              if (context.mounted) context.go('/onboarding');
            },
          ),
        ),
      ],
    );
  }

  Future<void> _export(BuildContext context, WidgetRef ref) async {
    final l = context.l;
    final messenger = ScaffoldMessenger.of(context);
    final json = await ref.read(lifeControllerProvider.notifier).exportAll();
    final ok = await ref.read(exportShareProvider).shareJson(json, fileName: 'wejdan_life_os_${dayKey(ref.read(todayProvider))}.json');
    messenger.showSnackBar(SnackBar(content: Text(ok ? l.exportDone : l.exportFailed)));
  }

  Future<void> _import(BuildContext context, WidgetRef ref) async {
    final l = context.l;
    final messenger = ScaffoldMessenger.of(context);
    try {
      final file = await openFile(acceptedTypeGroups: const [
        XTypeGroup(label: 'JSON', extensions: ['json'], uniformTypeIdentifiers: ['public.json'], mimeTypes: ['application/json']),
      ]);
      if (file == null) return;
      final data = asJson(jsonDecode(await file.readAsString()));
      if (!context.mounted) return;
      final ok = await showConfirmSheet(context, title: l.importConfirmTitle, body: l.importConfirmBody, confirmLabel: l.importFile);
      if (!ok) return;
      await ref.read(lifeControllerProvider.notifier).importAll(data);
      messenger.showSnackBar(SnackBar(content: Text(l.importDone)));
    } catch (_) {
      messenger.showSnackBar(SnackBar(content: Text(l.importFailed)));
    }
  }

  Future<void> _deleteAll(BuildContext context, WidgetRef ref) async {
    final l = context.l;
    final first = await showConfirmSheet(context, title: l.deleteAllTitle, body: l.deleteAllBody1, confirmLabel: l.deleteContinue, destructive: true);
    if (!first || !context.mounted) return;
    final second = await showConfirmSheet(context, title: l.deleteAllTitle2, body: l.deleteAllBody2, confirmLabel: l.deleteAllFinal, destructive: true);
    if (!second) return;
    await ref.read(lifeControllerProvider.notifier).deleteAllAndReseed();
    if (context.mounted) context.go('/onboarding');
  }
}
