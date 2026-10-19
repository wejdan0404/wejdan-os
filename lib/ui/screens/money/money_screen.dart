/// Money lite — monthly envelopes (manual), auto-save reminder, bills &
/// subscriptions calendar, BNPL instalments with due dates, wishlist with a
/// cooling-off timer. Manual entry only; no bank links.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/date_utils.dart';
import '../../../data/models/models.dart';
import '../../../engine/engine.dart';
import '../../../state/providers.dart';
import '../../format.dart';
import '../../state/ui_providers.dart';
import '../../theme/theme_ext.dart';
import '../../widgets/widgets.dart';

String weekdayInitial(BuildContext context, int weekday) => context.lang == AppLanguage.ar
    ? const {7: 'ح', 1: 'ن', 2: 'ث', 3: 'ر', 4: 'خ', 5: 'ج', 6: 'س'}[weekday]!
    : const {7: 'S', 1: 'M', 2: 'T', 3: 'W', 4: 'T', 5: 'F', 6: 'S'}[weekday]!;

String monthKey(DateTime d) => '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}';

class MoneyScreen extends ConsumerWidget {
  const MoneyScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final today = ref.watch(todayProvider);
    return HubPage(
      title: l.moneyTitle,
      subtitle: l.moneyScreenSub(monthName(context, today.month)),
      children: const [
        _Envelopes(),
        gap16,
        _AutoSave(),
        gap24,
        _BillsCalendar(),
        gap24,
        _Bnpl(),
        gap24,
        _Wishlist(),
      ],
    );
  }
}

class _Envelopes extends ConsumerWidget {
  const _Envelopes();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final c = context.c;
    final lang = context.lang;
    final today = ref.watch(todayProvider);
    final month = monthKey(today);
    final envs = (ref.watch(snapshotProvider)?.moneyEnvelopes ?? const <MoneyEnvelope>[]).where((e) => e.month == month).toList();
    final daysLeft = DateTime(today.year, today.month + 1, 0).day - today.day;
    final ctrl = ref.read(lifeControllerProvider.notifier);
    return WCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(child: Text(l.envelopesTitle, style: context.t.h2.copyWith(color: c.text))),
              Text(l.daysLeftMonth('$daysLeft'), style: context.t.caption.copyWith(color: c.caption)),
            ],
          ),
          gap12,
          if (envs.isEmpty) Text(l.envelopesEmpty, style: context.t.small.copyWith(color: c.caption)),
          for (final e in envs)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 6),
              child: Semantics(
                label: '${lang == AppLanguage.ar ? e.titleAr : e.titleEn}: ${l.spentOf(moneyText(e.spent), moneyText(e.planned))}',
                excludeSemantics: true,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      children: [
                        Expanded(child: Text(lang == AppLanguage.ar ? e.titleAr : e.titleEn, style: context.t.bodyStrong.copyWith(color: c.text))),
                        Text('${l.spentOf(moneyText(e.spent), moneyText(e.planned))} ${l.sar}', style: context.t.caption.copyWith(color: c.textSecondary)),
                      ],
                    ),
                    const SizedBox(height: 6),
                    WProgressBar(
                      value: e.planned <= 0 ? 0 : (e.spent / e.planned).clamp(0, 1).toDouble(),
                      height: 6,
                      color: e.spent > e.planned ? c.tint(TintName.apricot).ink : null,
                    ),
                  ],
                ),
              ),
            ),
          gap12,
          if (envs.isNotEmpty) PrimaryButton(label: l.logSpend, onPressed: () => _spend(context, ref, envs)),
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: SecondaryButton(
              small: true,
              icon: Icons.add_rounded,
              label: l.addEnvelope,
              onPressed: () async {
                final r = await showInputSheet(context, title: l.addEnvelope, fields: [
                  InputSpec(l.envelopeName, hint: l.envelopeHint),
                  InputSpec(l.plannedAmount, number: true),
                ]);
                if (r == null) return;
                await ctrl.upsertEnvelope(MoneyEnvelope(
                  id: ctrl.newId('env'),
                  titleAr: r[0],
                  titleEn: r[0],
                  month: month,
                  planned: double.tryParse(r[1]) ?? 0,
                ));
              },
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _spend(BuildContext context, WidgetRef ref, List<MoneyEnvelope> envs) async {
    final r = await showWSheet<(MoneyEnvelope, double)>(context, (_) => _SpendSheet(envs: envs));
    if (r == null) return;
    final (pick, v) = r;
    await ref.read(lifeControllerProvider.notifier).upsertEnvelope(MoneyEnvelope(
      id: pick.id,
      titleAr: pick.titleAr,
      titleEn: pick.titleEn,
      month: pick.month,
      planned: pick.planned,
      spent: pick.spent + v,
    ));
  }
}

class _SpendSheet extends StatefulWidget {
  const _SpendSheet({required this.envs});
  final List<MoneyEnvelope> envs;

  @override
  State<_SpendSheet> createState() => _SpendSheetState();
}

class _SpendSheetState extends State<_SpendSheet> {
  late MoneyEnvelope _pick = widget.envs.first;
  final _amount = TextEditingController();

  @override
  void dispose() {
    _amount.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final lang = context.lang;
    final v = double.tryParse(_amount.text.trim());
    return WSheet(
      title: l.logSpend,
      footer: PrimaryButton(label: l.save, onPressed: v == null ? null : () => Navigator.of(context).pop((_pick, v))),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Wrap(
            spacing: 8,
            runSpacing: 4,
            children: [
              for (final e in widget.envs)
                WChoiceChip(label: lang == AppLanguage.ar ? e.titleAr : e.titleEn, selected: e.id == _pick.id, onTap: () => setState(() => _pick = e)),
            ],
          ),
          gap12,
          TextField(
            controller: _amount,
            autofocus: true,
            onChanged: (_) => setState(() {}),
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: InputDecoration(hintText: l.amountSar),
          ),
        ],
      ),
    );
  }
}

class _AutoSave extends ConsumerWidget {
  const _AutoSave();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final c = context.c;
    final lang = context.lang;
    final ms = ref.watch(moduleStateProvider);
    final t = c.domain(DomainId.money);
    return WCard(
      color: t.bg,
      borderColor: t.bg,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TintIcon(Icons.autorenew_rounded, tint: Tint(c.surface, t.ink)),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(libraryText(ref, 'LIFE-06', ActionField.cardTitle, lang), style: context.t.bodyStrong.copyWith(color: c.text)),
                Text(l.autoSaveBody, style: context.t.small.copyWith(color: c.textSecondary)),
                gap8,
                Text(
                  ms.autoSaveDay == null ? l.autoSaveUnset : l.autoSaveReminder('${ms.autoSaveDay}', formatHm(ms.autoSaveMinute)),
                  style: context.t.caption.copyWith(color: t.ink, fontWeight: FontWeight.w600),
                ),
                Align(
                  alignment: AlignmentDirectional.centerStart,
                  child: SecondaryButton(
                    small: true,
                    label: ms.autoSaveDay == null ? l.setReminderDay : l.change,
                    onPressed: () async {
                      final r = await showInputSheet(context, title: l.setReminderDay, fields: [
                        InputSpec(l.dayOfMonth, hint: '1–31', number: true, initial: ms.autoSaveDay?.toString() ?? ''),
                      ]);
                      final d = int.tryParse(r?.first ?? '');
                      if (d == null) return;
                      await ref.read(lifeControllerProvider.notifier).updateModuleState(ms.copyWith(autoSaveDay: d.clamp(1, 31)));
                    },
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

class _BillsCalendar extends ConsumerWidget {
  const _BillsCalendar();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final c = context.c;
    final today = ref.watch(todayProvider);
    final s = ref.watch(snapshotProvider);
    final bills = (s?.bills ?? const <Bill>[]).where((b) => b.active).toList()..sort((a, b) => a.dueDay.compareTo(b.dueDay));
    final bnpl = s?.bnplItems ?? const <BnplItem>[];
    final daysInMonth = DateTime(today.year, today.month + 1, 0).day;
    final billDays = {for (final b in bills) b.dueDay.clamp(1, daysInMonth)};
    final bnplDays = {
      for (final p in bnpl)
        for (final d in p.dueDates.where((d) => !p.paidDates.contains(d)))
          if (d.startsWith(monthKey(today))) parseDayKey(d).day,
    };
    final firstWeekday = DateTime(today.year, today.month, 1).weekday; // 1..7
    final offset = (firstWeekday - s!.settings.weekStartsOn) % 7;
    final ctrl = ref.read(lifeControllerProvider.notifier);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionLabel(l.billsTitle(monthName(context, today.month)), trailing: l.add, onTrailingTap: () => showWSheet(context, (_) => const _BillSheet())),
        gap8,
        WCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              ExcludeSemantics(
                child: Row(
                  children: [
                    for (var i = 0; i < 7; i++)
                      Expanded(
                        child: Center(
                          child: Text(
                            weekdayInitial(context, ((s.settings.weekStartsOn - 1 + i) % 7) + 1),
                            style: context.t.label.copyWith(color: c.caption),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              ExcludeSemantics(
                child: GridView.count(
                  crossAxisCount: 7,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  childAspectRatio: 1.1,
                  children: [
                    for (var i = 0; i < offset; i++) const SizedBox.shrink(),
                    for (var d = 1; d <= daysInMonth; d++)
                      Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            width: 28,
                            height: 28,
                            alignment: Alignment.center,
                            decoration: d == today.day ? BoxDecoration(color: c.surfaceSubtle, shape: BoxShape.circle) : null,
                            child: Text('$d', style: context.t.metric.copyWith(fontSize: 13, color: d == today.day ? c.accentText : c.text)),
                          ),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              if (billDays.contains(d)) _dot(c.domain(DomainId.money).ink),
                              if (bnplDays.contains(d)) _dot(c.primaryFill),
                            ],
                          ),
                        ],
                      ),
                  ],
                ),
              ),
              gap8,
              Wrap(
                spacing: 16,
                runSpacing: 4,
                children: [
                  for (final (color, label) in [(c.domain(DomainId.money).ink, l.legendBill), (c.primaryFill, l.legendBnpl)])
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [_dot(color), const SizedBox(width: 6), Flexible(child: Text(label, style: context.t.caption.copyWith(color: c.caption)))],
                    ),
                ],
              ),
              const RowDivider(),
              if (bills.isEmpty)
                Padding(padding: const EdgeInsets.symmetric(vertical: 12), child: Text(l.billsEmpty, style: context.t.small.copyWith(color: c.caption))),
              for (final b in bills)
                InkWell(
                  onLongPress: () async {
                    final ok = await showConfirmSheet(context, title: b.title, body: l.deleteItemBody, confirmLabel: l.delete, destructive: true);
                    if (ok) await ctrl.deleteBill(b.id);
                  },
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(minHeight: 48),
                    child: Row(
                      children: [
                        SizedBox(
                          width: 40,
                          child: Text('${b.dueDay}',
                              style: context.t.caption.copyWith(color: c.domain(DomainId.money).ink, fontWeight: FontWeight.w700)),
                        ),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(b.title, style: context.t.small.copyWith(color: c.text)),
                              if (b.isSubscription) Text(l.subscription, style: context.t.caption.copyWith(color: c.caption)),
                            ],
                          ),
                        ),
                        Text(moneyText(b.amount), textDirection: TextDirection.ltr, style: context.t.metric.copyWith(fontSize: 14, color: c.text)),
                        CircleIconButton(
                          icon: Icons.delete_outline_rounded,
                          filled: false,
                          label: '${l.delete} ${b.title}',
                          onPressed: () async {
                            final ok = await showConfirmSheet(context, title: b.title, body: l.deleteItemBody, confirmLabel: l.delete, destructive: true);
                            if (ok) await ctrl.deleteBill(b.id);
                          },
                        ),
                      ],
                    ),
                  ),
                ),
              gap8,
              Text(l.subscriptionsReview, style: context.t.caption.copyWith(color: c.caption)),
            ],
          ),
        ),
      ],
    );
  }

  static Widget _dot(Color color) => Container(width: 6, height: 6, margin: const EdgeInsets.symmetric(horizontal: 1), decoration: BoxDecoration(color: color, shape: BoxShape.circle));
}

class _BillSheet extends ConsumerStatefulWidget {
  const _BillSheet();

  @override
  ConsumerState<_BillSheet> createState() => _BillSheetState();
}

class _BillSheetState extends ConsumerState<_BillSheet> {
  final _t = TextEditingController();
  final _a = TextEditingController();
  final _d = TextEditingController();
  bool _sub = false;

  @override
  void dispose() {
    _t.dispose();
    _a.dispose();
    _d.dispose();
    super.dispose();
  }

  bool get _ok => _t.text.trim().isNotEmpty && int.tryParse(_d.text.trim()) != null;

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    return WSheet(
      title: l.addBill,
      footer: PrimaryButton(
        label: l.save,
        onPressed: !_ok
            ? null
            : () async {
                final ctrl = ref.read(lifeControllerProvider.notifier);
                await ctrl.upsertBill(Bill(
                  id: ctrl.newId('bill'),
                  title: _t.text.trim(),
                  amount: double.tryParse(_a.text.trim()) ?? 0,
                  dueDay: int.parse(_d.text.trim()).clamp(1, 31),
                  isSubscription: _sub,
                ));
                if (context.mounted) Navigator.of(context).pop();
              },
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextField(controller: _t, autofocus: true, onChanged: (_) => setState(() {}), decoration: InputDecoration(labelText: l.billName)),
          gap12,
          TextField(controller: _a, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: InputDecoration(labelText: l.amountSar)),
          gap12,
          TextField(controller: _d, keyboardType: TextInputType.number, onChanged: (_) => setState(() {}), decoration: InputDecoration(labelText: l.dayOfMonth, hintText: '1–31')),
          gap12,
          ToggleRow(title: l.subscription, value: _sub, onChanged: (v) => setState(() => _sub = v)),
        ],
      ),
    );
  }
}

class _Bnpl extends ConsumerWidget {
  const _Bnpl();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final c = context.c;
    final lang = context.lang;
    final items = ref.watch(snapshotProvider)?.bnplItems ?? const <BnplItem>[];
    final today = ref.watch(todayProvider);
    final ctrl = ref.read(lifeControllerProvider.notifier);
    final rule = libraryText(ref, 'LIFE-09', ActionField.minimum, lang);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionLabel(l.bnplTitle, trailing: l.add, onTrailingTap: () => _add(context, ref)),
        gap8,
        if (items.isEmpty)
          WCard(child: Text(l.bnplEmpty, style: context.t.small.copyWith(color: c.caption)))
        else
          ListCard(
            children: [
              for (final p in items)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        children: [
                          Expanded(child: Text(p.title, style: context.t.bodyStrong.copyWith(color: c.text))),
                          if (p.provider.isNotEmpty) WPill(p.provider),
                        ],
                      ),
                      gap8,
                      Row(
                        children: [
                          for (final (i, d) in p.dueDates.indexed) ...[
                            if (i > 0) const SizedBox(width: 4),
                            Expanded(
                              child: Container(
                                height: 6,
                                decoration: BoxDecoration(
                                  color: p.paidDates.contains(d) ? c.primaryFill : (d == p.nextDue ? c.sky300 : c.surfaceSubtle),
                                  borderRadius: WRadius.pillR,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                      gap8,
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              p.nextDue == null
                                  ? l.bnplDone
                                  : [
                                      metaJoin([
                                        l.bnplNextAmount(moneyText(p.instalmentAmount)),
                                        dayMonthKey(context, p.nextDue!),
                                        () {
                                          final d = daysBetween(today, parseDayKey(p.nextDue!));
                                          return d < 0 ? l.overdueDays('${-d}') : relativeDays(context, d);
                                        }(),
                                      ]),
                                      l.bnplPaymentN('${p.paidDates.length + 1}', '${p.dueDates.length}'),
                                    ].join('\n'),
                              style: context.t.caption.copyWith(color: c.textSecondary),
                            ),
                          ),
                          if (p.nextDue != null)
                            OutlineAction(
                              label: l.markPaid,
                              onPressed: () => ctrl.upsertBnpl(BnplItem(
                                id: p.id,
                                title: p.title,
                                provider: p.provider,
                                instalmentAmount: p.instalmentAmount,
                                dueDates: p.dueDates,
                                paidDates: [...p.paidDates, p.nextDue!],
                              )),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
            ],
          ),
        if (rule.isNotEmpty) ...[
          gap12,
          WCard(
            color: c.surfaceSubtle,
            borderColor: c.surfaceSubtle,
            child: Text(l.bnplRule(rule), style: context.t.small.copyWith(color: c.textSecondary)),
          ),
        ],
      ],
    );
  }

  Future<void> _add(BuildContext context, WidgetRef ref) async {
    final l = context.l;
    final r = await showInputSheet(context, title: l.addBnpl, fields: [
      InputSpec(l.bnplItemName),
      InputSpec(l.bnplProvider, optional: true),
      InputSpec(l.instalmentAmount, number: true),
      InputSpec(l.instalmentCount, number: true, hint: '4'),
      InputSpec(l.dayOfMonth, number: true, hint: '1–31'),
    ]);
    if (r == null) return;
    final count = (int.tryParse(r[3]) ?? 0).clamp(1, 24);
    final day = (int.tryParse(r[4]) ?? 1).clamp(1, 31);
    final today = ref.read(todayProvider);
    final first = nextMonthlyDate(today, day);
    final dates = <String>[];
    for (var i = 0; i < count; i++) {
      final m = DateTime(first.year, first.month + i, 1);
      final last = DateTime(m.year, m.month + 1, 0).day;
      dates.add(dayKey(DateTime(m.year, m.month, day.clamp(1, last))));
    }
    final ctrl = ref.read(lifeControllerProvider.notifier);
    await ctrl.upsertBnpl(BnplItem(
      id: ctrl.newId('bnpl'),
      title: r[0],
      provider: r[1],
      instalmentAmount: double.tryParse(r[2]) ?? 0,
      dueDates: dates,
    ));
  }
}

class _Wishlist extends ConsumerWidget {
  const _Wishlist();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final c = context.c;
    final today = ref.watch(todayProvider);
    final wishes = (ref.watch(snapshotProvider)?.wishItems ?? const <WishItem>[]).where((w) => w.decision == null).toList();
    final ctrl = ref.read(lifeControllerProvider.notifier);
    WishItem decided(WishItem w, String d) =>
        WishItem(id: w.id, title: w.title, addedDate: w.addedDate, price: w.price, coolingOffDays: w.coolingOffDays, decision: d);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionLabel(l.wishlistTitle, trailing: l.add, onTrailingTap: () => _add(context, ref)),
        gap8,
        if (wishes.isEmpty)
          WCard(child: Text(l.wishlistEmpty, style: context.t.small.copyWith(color: c.caption)))
        else
          ListCard(
            children: [
              for (final w in wishes)
                () {
                  final left = coolingDaysLeft(w, today);
                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Row(
                          children: [
                            SizedBox(
                              width: 44,
                              height: 44,
                              child: left == 0
                                  ? Container(
                                      decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: c.done.ink, width: 2)),
                                      child: Icon(Icons.check_rounded, color: c.done.ink),
                                    )
                                  : Semantics(
                                      label: l.coolingLeft('$left'),
                                      excludeSemantics: true,
                                      child: TimerRing(
                                        progress: 1 - left / (w.coolingOffDays == 0 ? 1 : w.coolingOffDays),
                                        size: 44,
                                        stroke: 4,
                                        child: Text('$left', style: context.t.metric.copyWith(fontSize: 14, color: c.text)),
                                      ),
                                    ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(w.title, style: context.t.bodyStrong.copyWith(color: c.text)),
                                  Text(left == 0 ? l.coolingDone : l.coolingLeft('$left'), style: context.t.caption.copyWith(color: c.caption)),
                                ],
                              ),
                            ),
                            if (w.price != null) Text(moneyText(w.price!), textDirection: TextDirection.ltr, style: context.t.metric.copyWith(fontSize: 14, color: c.text)),
                          ],
                        ),
                        if (left == 0) ...[
                          gap8,
                          Row(
                            children: [
                              Expanded(child: OutlineAction(label: l.buyIt, tint: c.tint(TintName.primary), onPressed: () => ctrl.upsertWish(decided(w, 'bought')))),
                              const SizedBox(width: 8),
                              Expanded(child: OutlineAction(label: l.dropIt, onPressed: () => ctrl.upsertWish(decided(w, 'dropped')))),
                            ],
                          ),
                        ],
                      ],
                    ),
                  );
                }(),
            ],
          ),
        gap8,
        Text(l.coolingNote, style: context.t.caption.copyWith(color: c.caption)),
      ],
    );
  }

  Future<void> _add(BuildContext context, WidgetRef ref) async {
    final l = context.l;
    final r = await showInputSheet(context, title: l.addWish, fields: [
      InputSpec(l.wishName),
      InputSpec(l.amountSar, number: true, optional: true),
      InputSpec(l.coolingDays, number: true, initial: '7'),
    ]);
    if (r == null) return;
    final ctrl = ref.read(lifeControllerProvider.notifier);
    await ctrl.upsertWish(WishItem(
      id: ctrl.newId('wish'),
      title: r[0],
      price: double.tryParse(r[1]),
      addedDate: dayKey(ref.read(todayProvider)),
      coolingOffDays: (int.tryParse(r[2]) ?? 7).clamp(0, 90),
    ));
  }
}
