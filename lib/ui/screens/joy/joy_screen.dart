/// متعتي — Sparks balance, today's Free Joy, Earned Rewards (redeem +
/// celebration), Bundles (want reserved for a should), Joy Map editor,
/// free-joy note and a link to the Life Garden.
library;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../data/models/models.dart';
import '../../../state/providers.dart';
import '../../state/hub_providers.dart';
import '../../theme/theme_ext.dart';
import '../../widgets/widgets.dart';
import '../today/today_sections.dart' show FreeJoyCard;

String joyTitle(JoyItem j, AppLanguage lang) => lang == AppLanguage.ar ? j.titleAr : j.titleEn;

String joySizeName(BuildContext context, JoySize s) => switch (s) {
  JoySize.quick => context.l.sizeQuick,
  JoySize.medium => context.l.sizeMedium,
  JoySize.big => context.l.sizeBig,
};

String joySizeShort(BuildContext context, JoySize s) => switch (s) {
  JoySize.quick => context.l.sizeQuickShort,
  JoySize.medium => context.l.sizeMedium,
  JoySize.big => context.l.sizeBig,
};

class JoyScreen extends ConsumerWidget {
  const JoyScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final c = context.c;
    final balance = ref.watch(sparksBalanceProvider);
    final plan = ref.watch(todayPlanProvider).value;
    final freeJoy = plan?.itemsOfTier(PlanTier.joy).firstOrNull;
    final garden = ref.watch(gardenProvider);
    return HubPage(
      title: l.tabJoy,
      back: false,
      subtitle: l.joySub,
      actions: [SparkBadge(count: balance, onTap: () => context.push('/joy/reward'))],
      children: [
        if (freeJoy != null) ...[
          SectionLabel(l.freeJoyToday, spark: true),
          gap8,
          FreeJoyCard(item: freeJoy),
          gap24,
        ],
        SectionLabel(l.myRewards, trailing: l.addReward, onTrailingTap: () => context.push('/joy/reward')),
        gap8,
        const _Rewards(),
        gap8,
        Text(l.sparksExplain, style: context.t.caption.copyWith(color: c.caption)),
        gap24,
        SectionLabel(l.bundlesSection, trailing: l.addBundle, onTrailingTap: () => editBundle(context, ref, null)),
        gap8,
        const _Bundles(),
        gap24,
        SectionLabel(l.joyMap, trailing: l.edit, onTrailingTap: () => showWSheet(context, (_) => const JoyMapEditor())),
        gap8,
        const _JoyMap(),
        gap16,
        WCard(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          child: NavRow(
            icon: Icons.spa_outlined,
            tint: c.done,
            title: l.myGarden,
            subtitle: l.gardenSummary('${garden.length}', '${garden.where((p) => p.stage == GrowthStage.automatic).length}'),
            onTap: () => context.go('/habits'),
          ),
        ),
        gap12,
        WCard(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          child: NavRow(
            icon: Icons.celebration_outlined,
            tint: c.joy,
            title: l.celebrationsTitle,
            subtitle: l.celebrationsSub,
            onTap: () => context.push('/joy/reward'),
          ),
        ),
      ],
    );
  }
}

class _Rewards extends ConsumerWidget {
  const _Rewards();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final c = context.c;
    final lang = context.lang;
    final balance = ref.watch(sparksBalanceProvider);
    final rewards = ref.watch(joyItemsProvider).where((j) => j.kind == JoyKind.earned && j.active).toList()
      ..sort((a, b) => (a.price ?? 0).compareTo(b.price ?? 0));
    if (rewards.isEmpty) {
      return WCard(child: EmptyRestState(message: l.noRewards, action: SecondaryButton(label: l.addReward, onPressed: () => context.push('/joy/reward'))));
    }
    return Column(
      children: [
        for (final r in rewards) ...[
          WCard(
            onTap: () => context.push('/joy/reward?id=${Uri.encodeComponent(r.id)}'),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(joyTitle(r, lang), style: context.t.bodyStrong.copyWith(color: c.text)),
                          Row(
                            children: [
                              const SparkIcon(size: 12),
                              const SizedBox(width: 4),
                              Flexible(child: Text(l.sparksN('${r.price ?? 0}'), style: context.t.caption.copyWith(color: c.caption))),
                            ],
                          ),
                        ],
                      ),
                    ),
                    if (balance >= (r.price ?? 0))
                      Builder(
                        builder: (bctx) => OutlineAction(
                          label: l.redeem,
                          tint: c.joy,
                          onPressed: () => redeemWithCelebration(bctx, ref, r),
                        ),
                      )
                    else
                      ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 120),
                        child: Text(l.sparksLeft('${(r.price ?? 0) - balance}'), textAlign: TextAlign.end, style: context.t.caption.copyWith(color: c.caption)),
                      ),
                  ],
                ),
                gap12,
                WProgressBar(
                  value: (r.price ?? 0) == 0 ? 1 : (balance / r.price!).clamp(0, 1).toDouble(),
                  color: balance >= (r.price ?? 0) ? c.spark : null,
                  semanticLabel: l.rewardProgress(joyTitle(r, lang), '$balance', '${r.price ?? 0}'),
                ),
              ],
            ),
          ),
          gap12,
        ],
      ],
    );
  }
}

/// Confirm → redeem → celebration (burst + sheet). Spending sparks is a
/// celebration moment (spec §6.5), never a loss screen.
Future<void> redeemWithCelebration(BuildContext context, WidgetRef ref, JoyItem r) async {
  final l = context.l;
  final lang = context.lang;
  final box = context.findRenderObject() as RenderBox?;
  final origin = box == null ? Offset.zero : box.localToGlobal(box.size.center(Offset.zero));
  final ok = await showConfirmSheet(
    context,
    title: l.redeemTitle(joyTitle(r, lang)),
    body: l.redeemBody('${r.price ?? 0}'),
    confirmLabel: l.redeem,
  );
  if (!ok || !context.mounted) return;
  final res = await ref.read(lifeControllerProvider.notifier).redeem(r.id);
  if (!context.mounted) return;
  if (!res.ok) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l.sparksLeft('${res.shortBy}'))));
    return;
  }
  HapticFeedback.mediumImpact();
  CelebrationBurst.show(context, origin, strong: true);
  await showWSheet(
    context,
    (ctx) => WSheet(
      footer: PrimaryButton(label: l.enjoy, onPressed: () => Navigator.of(ctx).pop()),
      child: Column(
        children: [
          SparkIcon(size: 48, color: ctx.c.spark),
          gap12,
          Text(l.celebrateTitle, style: ctx.t.display.copyWith(color: ctx.c.text), textAlign: TextAlign.center),
          gap8,
          Text(l.celebrateBody(joyTitle(r, lang)), textAlign: TextAlign.center, style: ctx.t.body.copyWith(color: ctx.c.textSecondary)),
        ],
      ),
    ),
  );
}

class _Bundles extends ConsumerWidget {
  const _Bundles();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final c = context.c;
    final lang = context.lang;
    final snap = ref.watch(snapshotProvider);
    final bundles = ref.watch(joyItemsProvider).where((j) => j.kind == JoyKind.bundled && j.active).toList();
    if (bundles.isEmpty) return WCard(child: EmptyRestState(message: l.noBundles));
    return ListCard(
      children: [
        for (final b in bundles)
          InkWell(
            onTap: () => editBundle(context, ref, b),
            child: ConstrainedBox(
              constraints: const BoxConstraints(minHeight: 56),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      () {
                        final h = b.bundledHabitId == null ? null : snap?.habit(b.bundledHabitId!);
                        return h == null ? l.noHabitLinked : (lang == AppLanguage.ar ? h.titleAr : h.titleEn);
                      }(),
                      style: context.t.bodyStrong.copyWith(color: c.text),
                    ),
                  ),
                  ExcludeSemantics(child: Icon(Icons.link_rounded, size: 18, color: c.caption)),
                  const SizedBox(width: 8),
                  Flexible(child: JoyBadge(joyTitle(b, lang).split('—').first.trim())),
                ],
              ),
            ),
          ),
      ],
    );
  }
}

/// Create / edit a bundle: her "want" + the habit it is reserved for.
Future<void> editBundle(BuildContext context, WidgetRef ref, JoyItem? existing) =>
    showWSheet(context, (_) => _BundleSheet(existing: existing));

class _BundleSheet extends ConsumerStatefulWidget {
  const _BundleSheet({this.existing});
  final JoyItem? existing;

  @override
  ConsumerState<_BundleSheet> createState() => _BundleSheetState();
}

class _BundleSheetState extends ConsumerState<_BundleSheet> {
  late final _title = TextEditingController(text: widget.existing == null ? '' : joyTitle(widget.existing!, ref.read(settingsProvider).language));
  late String? _habit = widget.existing?.bundledHabitId;

  @override
  void dispose() {
    _title.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final c = context.c;
    final lang = context.lang;
    final habits = ref.watch(habitsProvider).where((h) => h.isActive).toList();
    final ctrl = ref.read(lifeControllerProvider.notifier);
    return WSheet(
      title: widget.existing == null ? l.addBundle : l.editBundle,
      footer: PrimaryButton(
        label: l.save,
        onPressed: _habit == null || _title.text.trim().isEmpty
            ? null
            : () async {
                final t = _title.text.trim();
                final e = widget.existing;
                await ctrl.upsertJoyItem(JoyItem(
                  id: e?.id ?? ctrl.newId('joy'),
                  kind: JoyKind.bundled,
                  titleAr: t,
                  titleEn: t,
                  size: e?.size ?? JoySize.quick,
                  bundledHabitId: _habit,
                ));
                if (context.mounted) Navigator.of(context).pop();
              },
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(l.bundleHelp, style: context.t.small.copyWith(color: c.textSecondary)),
          gap12,
          Text(l.bundleWant, style: context.t.label.copyWith(color: c.textSecondary)),
          gap8,
          TextField(
            controller: _title,
            onChanged: (_) => setState(() {}),
            decoration: InputDecoration(hintText: l.bundleWantHint),
          ),
          gap16,
          Text(l.bundleFor, style: context.t.label.copyWith(color: c.textSecondary)),
          gap8,
          Wrap(
            spacing: 8,
            runSpacing: 4,
            children: [
              for (final h in habits)
                WChoiceChip(
                  label: lang == AppLanguage.ar ? h.titleAr : h.titleEn,
                  selected: _habit == h.id,
                  onTap: () => setState(() => _habit = h.id),
                ),
            ],
          ),
          if (widget.existing != null) ...[
            gap16,
            OutlineAction(
              label: l.removeBundle,
              tint: c.tint(TintName.rose),
              onPressed: () async {
                await ctrl.upsertJoyItem(widget.existing!.copyWith(active: false));
                if (context.mounted) Navigator.of(context).pop();
              },
            ),
          ],
        ],
      ),
    );
  }
}

class _JoyMap extends ConsumerWidget {
  const _JoyMap();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final c = context.c;
    final lang = context.lang;
    final items = ref.watch(joyItemsProvider).where((j) => j.kind == JoyKind.free && j.active).toList();
    return WCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (items.isEmpty) Text(l.joyMapEmpty, style: context.t.small.copyWith(color: c.caption)),
          for (final size in JoySize.values)
            if (items.any((j) => j.size == size)) ...[
              Text(joySizeName(context, size), style: context.t.label.copyWith(color: c.caption)),
              gap8,
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final j in items.where((j) => j.size == size))
                    Container(
                      constraints: const BoxConstraints(minHeight: 36),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                      decoration: BoxDecoration(color: c.surfaceSubtle, borderRadius: WRadius.pillR, border: Border.all(color: c.border)),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (j.costsMoney) ...[Icon(Icons.payments_outlined, size: 14, color: c.caption), const SizedBox(width: 4)],
                          Text(joyTitle(j, lang), style: context.t.small.copyWith(color: c.deep)),
                        ],
                      ),
                    ),
                ],
              ),
              gap12,
            ],
          Text(l.freeJoyNote, style: context.t.caption.copyWith(color: c.caption)),
        ],
      ),
    );
  }
}

/// Joy Map editor: add free joys (size, costs money), remove.
class JoyMapEditor extends ConsumerWidget {
  const JoyMapEditor({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final lang = context.lang;
    final items = ref.watch(joyItemsProvider).where((j) => j.kind == JoyKind.free && j.active).toList();
    final ctrl = ref.read(lifeControllerProvider.notifier);
    return WSheet(
      title: l.joyMap,
      footer: PrimaryButton(label: l.addJoy, icon: Icons.add_rounded, onPressed: () => showWSheet(context, (_) => const _AddJoySheet())),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(l.joyMapBody, style: context.t.small.copyWith(color: context.c.textSecondary)),
          gap8,
          for (final j in items)
            Row(
              children: [
                Expanded(child: Text(joyTitle(j, lang), style: context.t.body.copyWith(color: context.c.text))),
                Text(joySizeName(context, j.size), style: context.t.caption.copyWith(color: context.c.caption)),
                CircleIconButton(
                  icon: Icons.remove_circle_outline_rounded,
                  filled: false,
                  label: '${l.delete} ${joyTitle(j, lang)}',
                  onPressed: () => ctrl.upsertJoyItem(j.copyWith(active: false)),
                ),
              ],
            ),
        ],
      ),
    );
  }
}

class _AddJoySheet extends ConsumerStatefulWidget {
  const _AddJoySheet();

  @override
  ConsumerState<_AddJoySheet> createState() => _AddJoySheetState();
}

class _AddJoySheetState extends ConsumerState<_AddJoySheet> {
  final _t = TextEditingController();
  JoySize _size = JoySize.quick;
  bool _money = false;

  @override
  void dispose() {
    _t.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final ctrl = ref.read(lifeControllerProvider.notifier);
    return WSheet(
      title: l.addJoy,
      footer: PrimaryButton(
        label: l.save,
        onPressed: _t.text.trim().isEmpty
            ? null
            : () async {
                final t = _t.text.trim();
                await ctrl.upsertJoyItem(JoyItem(
                  id: ctrl.newId('joy'),
                  kind: JoyKind.free,
                  titleAr: t,
                  titleEn: t,
                  size: _size,
                  costsMoney: _money,
                  keepFree: true,
                ));
                if (context.mounted) Navigator.of(context).pop();
              },
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextField(controller: _t, autofocus: true, onChanged: (_) => setState(() {}), decoration: InputDecoration(hintText: l.somethingElseHint)),
          gap16,
          SegmentedPills<JoySize>(
            expand: true,
            groupLabel: l.sizeLabel,
            selected: _size,
            onSelected: (v) => setState(() => _size = v),
            options: [for (final s in JoySize.values) PillOption(s, joySizeShort(context, s))],
          ),
          gap12,
          ToggleRow(title: l.costsMoney, subtitle: l.shoppingNote, value: _money, onChanged: (v) => setState(() => _money = v)),
        ],
      ),
    );
  }
}
