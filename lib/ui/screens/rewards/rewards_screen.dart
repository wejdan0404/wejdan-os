/// Reward editor (create / edit an Earned Reward with a Spark price), milestone
/// rewards for goals, and the celebration history (from the Sparks ledger).
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/date_utils.dart';
import '../../../data/models/models.dart';
import '../../../state/providers.dart';
import '../../format.dart';
import '../../theme/theme_ext.dart';
import '../../widgets/widgets.dart';
import '../joy/joy_screen.dart' show joySizeShort, joyTitle;

String sparkReasonName(BuildContext context, SparkReason r) => switch (r) {
  SparkReason.completion => context.l.sparkReasonCompletion,
  SparkReason.comeback => context.l.sparkReasonComeback,
  SparkReason.weeklyReview => context.l.sparkReasonWeeklyReview,
  SparkReason.experiment => context.l.sparkReasonExperiment,
  SparkReason.redeem => context.l.sparkReasonRedeem,
  SparkReason.reversal => context.l.sparkReasonReversal,
  SparkReason.adjustment => context.l.sparkReasonAdjustment,
};

class RewardsScreen extends ConsumerStatefulWidget {
  const RewardsScreen({super.key, this.rewardId});
  final String? rewardId;

  @override
  ConsumerState<RewardsScreen> createState() => _RewardsScreenState();
}

class _RewardsScreenState extends ConsumerState<RewardsScreen> {
  late final JoyItem? _existing = ref.read(joyItemsProvider).where((j) => j.id == widget.rewardId).firstOrNull;
  late final _name = TextEditingController(text: _existing == null ? '' : joyTitle(_existing, ref.read(settingsProvider).language));
  late JoySize _size = _existing?.size ?? JoySize.medium;
  late int _price = _existing?.price ?? 60;
  late bool _money = _existing?.costsMoney ?? false;

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final ctrl = ref.read(lifeControllerProvider.notifier);
    final t = _name.text.trim();
    final e = _existing;
    await ctrl.upsertJoyItem(JoyItem(
      id: e?.id ?? ctrl.newId('joy'),
      kind: JoyKind.earned,
      titleAr: t,
      titleEn: t,
      size: _size,
      price: _price,
      costsMoney: _money,
    ));
    // Costs money → also goes to the Money wishlist with a cooling-off timer.
    if (_money && e == null) {
      await ctrl.upsertWish(WishItem(id: ctrl.newId('wish'), title: t, addedDate: dayKey(ref.read(todayProvider))));
    }
    if (mounted) context.canPop() ? context.pop() : context.go('/joy');
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final c = context.c;
    final balance = ref.watch(sparksBalanceProvider);
    return HubPage(
      title: _existing == null ? l.newReward : l.editReward,
      onBack: () => context.canPop() ? context.pop() : context.go('/joy'),
      bottom: PrimaryButton(label: l.saveReward, onPressed: _name.text.trim().isEmpty ? null : _save),
      children: [
        WCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(l.rewardPrompt, style: context.t.caption.copyWith(color: c.caption)),
              gap12,
              Text(l.rewardName, style: context.t.label.copyWith(color: c.textSecondary)),
              gap8,
              TextField(
                controller: _name,
                onChanged: (_) => setState(() {}),
                decoration: InputDecoration(hintText: l.rewardNameHint),
              ),
              gap16,
              Text(l.sizeLabel, style: context.t.label.copyWith(color: c.textSecondary)),
              gap8,
              SegmentedPills<JoySize>(
                expand: true,
                groupLabel: l.sizeLabel,
                selected: _size,
                onSelected: (v) => setState(() => _size = v),
                options: [for (final s in JoySize.values) PillOption(s, joySizeShort(context, s))],
              ),
              gap16,
              Text(l.priceInSparks, style: context.t.label.copyWith(color: c.textSecondary)),
              gap8,
              Container(
                padding: const EdgeInsets.symmetric(vertical: 8),
                decoration: BoxDecoration(color: c.surfaceSubtle, borderRadius: WRadius.tileR),
                child: Center(
                  child: Stepper44(
                    value: _price,
                    min: 10,
                    max: 1000,
                    step: 10,
                    label: l.priceInSparks,
                    onChanged: (v) => setState(() => _price = v),
                    display: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text('$_price', textDirection: TextDirection.ltr, style: context.t.metric.copyWith(fontSize: 26, color: c.text)),
                        const SizedBox(width: 6),
                        const SparkIcon(size: 18),
                      ],
                    ),
                  ),
                ),
              ),
              gap8,
              Text(
                balance >= _price ? l.balanceCanRedeem('$balance') : l.balanceNow('$balance', '${_price - balance}'),
                style: context.t.caption.copyWith(color: c.caption),
              ),
              gap12,
              const RowDivider(),
              ToggleRow(title: l.costsMoney, subtitle: l.costsMoneySub, value: _money, onChanged: (v) => setState(() => _money = v)),
            ],
          ),
        ),
        gap12,
        WCard(
          color: c.joy.bg,
          borderColor: c.joy.bg,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SparkIcon(size: 14),
              const SizedBox(width: 8),
              Expanded(child: Text(l.keepFreeAdvice, style: context.t.small.copyWith(color: c.joy.ink))),
            ],
          ),
        ),
        if (_existing != null) ...[
          gap12,
          OutlineAction(
            label: l.archiveReward,
            tint: c.rest,
            onPressed: () async {
              await ref.read(lifeControllerProvider.notifier).upsertJoyItem(_existing.copyWith(active: false));
              if (context.mounted) context.canPop() ? context.pop() : context.go('/joy');
            },
          ),
        ],
        gap24,
        SectionLabel(l.milestoneRewards),
        gap8,
        const _MilestoneRewards(),
        gap24,
        SectionLabel(l.celebrationsTitle),
        gap8,
        const _History(),
      ],
    );
  }
}

class _MilestoneRewards extends ConsumerWidget {
  const _MilestoneRewards();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final c = context.c;
    final lang = context.lang;
    final goals = ref.watch(goalsProvider);
    final rewards = ref.watch(joyItemsProvider).where((j) => j.kind == JoyKind.earned && j.active).toList();
    final rows = [
      for (final g in goals)
        if (g.milestones.where((m) => !m.done).firstOrNull case final m?) (g, m),
    ];
    if (rows.isEmpty) return WCard(child: Text(l.noGoals, style: context.t.small.copyWith(color: c.caption)));
    return ListCard(
      children: [
        for (final (g, m) in rows)
          InkWell(
            onTap: () => showWSheet(
              context,
              (ctx) => WSheet(
                title: l.pickMilestoneReward,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(lang == AppLanguage.ar ? m.titleAr : m.titleEn, style: ctx.t.small.copyWith(color: ctx.c.textSecondary)),
                    gap12,
                    Wrap(
                      spacing: 8,
                      runSpacing: 4,
                      children: [
                        for (final r in rewards)
                          WChoiceChip(
                            label: joyTitle(r, lang),
                            selected: m.rewardJoyId == r.id,
                            onTap: () async {
                              await ref.read(lifeControllerProvider.notifier).upsertGoal(g.copyWith(
                                milestones: [for (final x in g.milestones) x.id == m.id ? x.copyWith(rewardJoyId: r.id) : x],
                              ));
                              if (ctx.mounted) Navigator.of(ctx).pop();
                            },
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            child: ConstrainedBox(
              constraints: const BoxConstraints(minHeight: 64),
              child: Row(
                children: [
                  TintIcon(Icons.flag_outlined, tint: c.domain(g.domain), size: 36),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(lang == AppLanguage.ar ? m.titleAr : m.titleEn, style: context.t.small.copyWith(color: c.text, fontWeight: FontWeight.w600)),
                        Text(lang == AppLanguage.ar ? g.titleAr : g.titleEn, style: context.t.caption.copyWith(color: c.caption)),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  JoyBadge(
                    rewards.where((r) => r.id == m.rewardJoyId).map((r) => joyTitle(r, lang)).firstOrNull ?? l.chooseLater,
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}

class _History extends ConsumerWidget {
  const _History();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final c = context.c;
    final lang = context.lang;
    final joy = {for (final j in ref.watch(joyItemsProvider)) j.id: j};
    const shown = {SparkReason.comeback, SparkReason.weeklyReview, SparkReason.experiment, SparkReason.redeem};
    final txns = ref.watch(sparkLedgerProvider).where((t) => shown.contains(t.reason)).take(12).toList();
    if (txns.isEmpty) return WCard(child: EmptyRestState(message: l.noCelebrations));
    return ListCard(
      children: [
        for (final t in txns)
          ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 56),
            child: Row(
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(shape: BoxShape.circle, color: t.amount < 0 ? c.primaryFill : c.spark),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        t.reason == SparkReason.redeem && joy[t.refId] != null ? joyTitle(joy[t.refId]!, lang) : sparkReasonName(context, t.reason),
                        style: context.t.small.copyWith(color: c.text, fontWeight: FontWeight.w600),
                      ),
                      Text(dayMonthKey(context, t.date), style: context.t.caption.copyWith(color: c.caption)),
                    ],
                  ),
                ),
                Text(
                  t.amount > 0 ? '+${t.amount}' : '${t.amount}',
                  textDirection: TextDirection.ltr,
                  style: context.t.metric.copyWith(fontSize: 14, color: t.amount < 0 ? c.accentText : c.joy.ink),
                ),
              ],
            ),
          ),
      ],
    );
  }
}
