/// أنا — weekly review entry, fresh-start card, understand myself (Insights,
/// Experiments, Evidence), life admin (Money, Home & Admin, optional
/// sensitive modules), app (Settings, Help & Safety).
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/date_utils.dart';
import '../../../data/models/models.dart';
import '../../../engine/engine.dart';
import '../../../state/providers.dart';
import '../../format.dart';
import '../../theme/theme_ext.dart';
import '../../widgets/widgets.dart';
import '../home_admin/home_admin_screen.dart' show currentZone;
import '../review/fresh_start_card.dart';
import '../sensitive/sensitive_gate.dart';

class MeScreen extends ConsumerWidget {
  const MeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final c = context.c;
    final lang = context.lang;
    final season = ref.watch(currentSeasonProvider);
    final chapter = ref.watch(currentChapterProvider);
    final s = ref.watch(settingsProvider);
    final today = ref.watch(todayProvider);
    final fresh = ref.watch(freshStartTodayProvider);
    final week = dayKey(startOfWeek(today, weekStartsOn: s.weekStartsOn));
    final thisWeek = ref.watch(weeklyReviewsProvider).where((r) => r.id == week).firstOrNull;
    final reviewTask = ref.watch(snapshotProvider)?.weeklyTasks.where((t) => t.isWeeklyReview).firstOrNull;
    final dues = ref.watch(upcomingDuesProvider);
    final nextDue = dues.where((d) => d.kind != DueKind.document).firstOrNull;
    final active = ref.watch(activeExperimentProvider);
    return HubPage(
      title: l.tabMe,
      back: false,
      leading: ExcludeSemantics(
        child: Container(
          width: 52,
          height: 52,
          alignment: Alignment.center,
          decoration: BoxDecoration(color: c.primaryFill, shape: BoxShape.circle),
          child: Text('W', style: WType.english.h1.copyWith(color: c.onPrimary)),
        ),
      ),
      subtitle: metaJoin([l.chapterN('$chapter'), if (season != null) (lang == AppLanguage.ar ? season.titleAr : season.titleEn)]),
      actions: [CircleIconButton(icon: Icons.settings_outlined, label: l.settings, onPressed: () => context.push('/me/settings'))],
      children: [
        if (fresh != null) ...[FreshStartCard(fresh: fresh), gap16],
        WCard(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                metaJoin([
                  if (reviewTask != null && reviewTask.preferredWeekdays.isNotEmpty)
                    '${weekdayName(reviewTask.preferredWeekdays.first).of(lang)} ${slotName(context, reviewTask.anchor.slot)}',
                  l.aboutMinutes('10'),
                ]),
                style: context.t.caption.copyWith(color: c.caption),
              ),
              gap8,
              Text(thisWeek == null ? l.reviewReady : l.chapterClosed('$chapter'), style: context.t.h1.copyWith(color: c.text)),
              gap8,
              if (thisWeek == null) ...[
                Text(l.reviewReadyBody('$chapter'), style: context.t.small.copyWith(color: c.textSecondary)),
                gap8,
                Row(
                  children: [
                    const SparkIcon(size: 12),
                    const SizedBox(width: 6),
                    Text(l.reviewEndsWithSparks, style: context.t.caption.copyWith(color: c.joy.ink)),
                  ],
                ),
                gap16,
                PrimaryButton(label: l.startReview, onPressed: () => context.push('/review')),
              ] else ...[
                if (thisWeek.chapterTitle.isNotEmpty) Text(thisWeek.chapterTitle, style: context.t.bodyStrong.copyWith(color: c.accentText)),
                if (thisWeek.top3.isNotEmpty) ...[
                  gap8,
                  Text(l.nextWeekTop3, style: context.t.label.copyWith(color: c.caption)),
                  for (final (i, t) in thisWeek.top3.indexed)
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text('${i + 1}. $t', style: context.t.small.copyWith(color: c.text)),
                    ),
                ],
                Align(
                  alignment: AlignmentDirectional.centerStart,
                  child: SecondaryButton(small: true, label: l.reviewAgain, onPressed: () => context.push('/review')),
                ),
              ],
            ],
          ),
        ),
        gap24,
        SectionLabel(l.understandMyself),
        gap8,
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: _Tile(
                icon: Icons.bar_chart_rounded,
                tint: c.info,
                title: l.insights,
                sub: l.insightsTileSub,
                onTap: () => context.push('/me/insights'),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _Tile(
                icon: Icons.science_outlined,
                tint: c.tint(TintName.lilac),
                title: l.experimentsTitle,
                sub: active == null ? l.noActiveExperiment : (lang == AppLanguage.ar ? active.titleAr : active.titleEn),
                onTap: () => context.push('/me/insights'),
              ),
            ),
          ],
        ),
        gap12,
        WCard(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          child: NavRow(
            icon: Icons.menu_book_outlined,
            tint: c.done,
            title: l.evidenceLibrary,
            subtitle: l.evidenceSub,
            onTap: () => context.push('/me/evidence'),
          ),
        ),
        gap24,
        SectionLabel(l.lifeAdmin),
        gap8,
        ListCard(
          children: [
            NavRow(
              icon: Icons.account_balance_wallet_outlined,
              tint: c.domain(DomainId.money),
              title: l.moneyTitle,
              subtitle: nextDue == null
                  ? l.moneySub
                  : metaJoin([
                      nextDue.title.isEmpty ? l.autoSaveShort : nextDue.title,
                      nextDue.daysFrom(today) < 0 ? l.overdueDays('${-nextDue.daysFrom(today)}') : relativeDays(context, nextDue.daysFrom(today)),
                    ]),
              onTap: () => context.push('/me/money'),
            ),
            NavRow(
              icon: Icons.home_outlined,
              tint: c.domain(DomainId.home),
              title: l.homeAdminTitle,
              subtitle: l.zoneOfWeekIs(currentZone(context, ref.watch(moduleStateProvider), today)),
              onTap: () => context.push('/me/home'),
            ),
            if (s.cycleModule)
              NavRow(
                icon: Icons.water_drop_outlined,
                tint: c.tint(TintName.rose),
                title: l.cycleTitle,
                subtitle: l.privateLocal,
                trailing: s.appLock ? Icon(Icons.lock_outline_rounded, size: 16, color: c.caption) : null,
                onTap: () => openSensitive(context, ref, '/me/cycle'),
              ),
            if (s.pcosModule)
              NavRow(
                icon: Icons.health_and_safety_outlined,
                tint: c.tint(TintName.lilac),
                title: l.pcosTitle,
                subtitle: l.ifDiagnosed,
                trailing: s.appLock ? Icon(Icons.lock_outline_rounded, size: 16, color: c.caption) : null,
                onTap: () => openSensitive(context, ref, '/me/pcos'),
              ),
          ],
        ),
        gap24,
        SectionLabel(l.appSection),
        gap8,
        ListCard(
          children: [
            NavRow(
              icon: Icons.tune_rounded,
              tint: c.tint(TintName.slate),
              title: l.settings,
              subtitle: l.settingsSub,
              onTap: () => context.push('/me/settings'),
            ),
            NavRow(
              icon: Icons.shield_outlined,
              tint: c.tint(TintName.lilac),
              title: l.helpSafetyLink,
              subtitle: l.helpSub,
              onTap: () => context.push('/me/help'),
            ),
          ],
        ),
        gap16,
        Center(child: Text(l.dataOnDevice, style: context.t.caption.copyWith(color: c.caption))),
      ],
    );
  }
}

class _Tile extends StatelessWidget {
  const _Tile({required this.icon, required this.tint, required this.title, required this.sub, required this.onTap});
  final IconData icon;
  final Tint tint;
  final String title;
  final String sub;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => WCard(
    onTap: onTap,
    semanticLabel: title,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        TintIcon(icon, tint: tint),
        gap12,
        Text(title, style: context.t.bodyStrong.copyWith(color: context.c.text)),
        Text(sub, maxLines: 3, overflow: TextOverflow.ellipsis, style: context.t.caption.copyWith(color: context.c.caption)),
      ],
    ),
  );
}
