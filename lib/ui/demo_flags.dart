/// Web-preview demo flags (query string before the `#`), used for QA
/// screenshots of the Flutter web build. Ignored on iOS.
///
/// `?onboarded=1` skip onboarding · `?theme=dark|light` · `?lang=en|ar` ·
/// `?energy=green|yellow|red` · `?sem=1` enable the semantics tree ·
/// `?scale=1.5` text scale · `?done=h_vocab:minimum,rs_wake` pre-log items
/// today (demo data for done states) · `?mods=cycle,pcos,aquarium,lock`
/// turn modules on · `?seed=test` writes QA data (every title is exactly
/// `test`, per the project rule for test data): 14 days of logs for the
/// Core habits, sparks, vocab cards, a mock test, driving sessions, money
/// and admin items, a project, an idea, an errand and a cycle entry.
library;

import 'package:flutter/foundation.dart';
import 'package:flutter/semantics.dart';

import '../core/date_utils.dart';
import '../data/models/models.dart';
import '../data/repository.dart';

class DemoFlags {
  const DemoFlags(this.q);

  factory DemoFlags.fromUri(Uri uri) => DemoFlags(kIsWeb ? uri.queryParameters : const {});

  final Map<String, String> q;

  bool get any => q.isNotEmpty;
  double? get textScale => double.tryParse(q['scale'] ?? '');

  /// Applies flags to storage before the app reads it.
  Future<void> apply(LifeRepository repo, DateTime now) async {
    if (q['sem'] == '1') SemanticsBinding.instance.ensureSemantics();
    var s = await repo.loadSettings();
    if (q['onboarded'] == '1') s = s.copyWith(onboardingDone: true);
    if (q['onboarded'] == '0') s = s.copyWith(onboardingDone: false);
    final theme = q['theme'];
    if (theme != null) s = s.copyWith(theme: ThemePref.values.where((t) => t.name == theme).firstOrNull ?? s.theme);
    final lang = q['lang'];
    if (lang != null) s = s.copyWith(language: AppLanguage.values.where((t) => t.name == lang).firstOrNull ?? s.language);
    final mods = (q['mods'] ?? '').split(',');
    if (mods.contains('cycle')) s = s.copyWith(cycleModule: true);
    if (mods.contains('pcos')) s = s.copyWith(pcosModule: true);
    if (mods.contains('aquarium')) s = s.copyWith(aquariumModule: true);
    if (mods.contains('lock')) s = s.copyWith(appLock: true);
    await repo.saveSettings(s);
    final day = dayKey(logicalDay(now));
    if (q['seed'] == 'test') await _seedTest(repo, logicalDay(now), now);
    final energy = EnergyMode.values.where((e) => e.name == q['energy']).firstOrNull;
    if (energy != null) await repo.energyChecks.put(EnergyCheck(date: day, mode: energy, at: now));
    final done = q['done'];
    if (done != null) {
      var i = 0;
      for (final id in done.split(',').where((x) => x.isNotEmpty)) {
        final parts = id.split(':');
        final level = parts.length > 1 ? CompletionLevel.values.where((l) => l.name == parts[1]).firstOrNull : null;
        await repo.logs.put(
          LogEntry(
            id: 'demo_${i++}_${parts[0]}',
            itemId: parts[0],
            kind: parts[0].startsWith('rs_') ? PlanItemKind.routineStep : PlanItemKind.habit,
            date: day,
            level: level ?? CompletionLevel.normal,
            loggedAt: now,
            minuteOfDay: 7 * 60 + 5 + i,
          ),
        );
      }
    }
  }

  /// QA data; every user-visible title is `test`.
  Future<void> _seedTest(LifeRepository repo, DateTime today, DateTime now) async {
    const t = 'test';
    var n = 0;
    // Habits "created" 3 weeks ago so the QA history counts.
    final habits = [for (final h in await repo.habits.all()) h.copyWith(createdDate: dayKey(addDays(today, -21)))];
    await repo.habits.putAll(habits);
    for (var back = 14; back >= 1; back--) {
      final d = addDays(today, -back);
      for (final h in habits.where((h) => h.routineId == null)) {
        if (!h.schedule.isPlannedOn(d) || (back + h.id.length) % 4 == 0) continue;
        final id = 'qa_log_${n++}';
        await repo.logs.put(LogEntry(
          id: id,
          itemId: h.id,
          kind: PlanItemKind.habit,
          date: dayKey(d),
          level: back.isEven ? CompletionLevel.minimum : CompletionLevel.normal,
          loggedAt: d,
          minuteOfDay: 7 * 60 + (h.id.length * 37 + back * 11) % 600,
          durationMin: 10 + back % 3 * 5,
          enjoyment: 3 + back % 3,
        ));
        await repo.sparkTxns.put(SparkTxn(id: 'qa_spk_$id', date: dayKey(d), amount: 2, reason: SparkReason.completion, refId: id, at: d));
      }
    }
    await repo.sparkTxns.put(SparkTxn(id: 'qa_spk_wr', date: dayKey(addDays(today, -2)), amount: 10, reason: SparkReason.weeklyReview, refId: 'qa_wr', at: now));
    await repo.sparkTxns.put(SparkTxn(id: 'qa_spk_cb', date: dayKey(addDays(today, -2)), amount: 4, reason: SparkReason.comeback, refId: 'qa_log_0', at: now));
    await repo.vocabCards.putAll([
      for (var i = 0; i < 6; i++)
        VocabCard(id: 'qa_vc_$i', front: t, back: t, due: dayKey(today), repetitions: i < 4 ? 1 : 0, intervalDays: 1, lastReviewed: i < 4 ? dayKey(addDays(today, -1)) : null),
    ]);
    await repo.mockTests.put(MockTest(id: 'qa_mock', date: dayKey(addDays(today, -8)), listening: 6, reading: 6.5, writing: 5.5, speaking: 6, note: t));
    await repo.drivingSessions.putAll([
      DrivingSession(id: 'qa_drv1', date: dayKey(addDays(today, -3)), minutes: 20, conditions: const ['day', 'parking'], note: t),
      DrivingSession(id: 'qa_drv2', date: dayKey(addDays(today, -1)), minutes: 10, kind: 'hazardPerception', supervised: false, note: t),
      DrivingSession(id: 'qa_drv3', date: dayKey(addDays(today, -2)), minutes: 15, kind: 'theory', supervised: false, note: t),
    ]);
    final month = '${today.year.toString().padLeft(4, '0')}-${today.month.toString().padLeft(2, '0')}';
    await repo.moneyEnvelopes.put(MoneyEnvelope(id: 'qa_env', titleAr: t, titleEn: t, month: month, planned: 700, spent: 520));
    await repo.bills.putAll([
      Bill(id: 'qa_bill', title: t, amount: 115, dueDay: (today.day + 3).clamp(1, 28)),
      Bill(id: 'qa_sub', title: t, amount: 35, dueDay: (today.day + 9).clamp(1, 28), isSubscription: true),
    ]);
    await repo.bnplItems.put(BnplItem(
      id: 'qa_bnpl',
      title: t,
      provider: t,
      instalmentAmount: 112,
      dueDates: [for (var i = -1; i < 3; i++) dayKey(DateTime(today.year, today.month + i, 12))],
      paidDates: [dayKey(DateTime(today.year, today.month - 1, 12))],
    ));
    await repo.wishItems.putAll([
      WishItem(id: 'qa_wish1', title: t, addedDate: dayKey(addDays(today, -2)), price: 899),
      WishItem(id: 'qa_wish2', title: t, addedDate: dayKey(addDays(today, -8)), price: 450),
    ]);
    await repo.adminDocs.putAll([
      AdminDoc(id: 'qa_doc1', name: t, expiry: dayKey(addDays(today, 20)), remindDaysBefore: 30),
      const AdminDoc(id: 'qa_doc2', name: t),
    ]);
    await repo.errands.putAll([Errand(id: 'qa_err1', title: t), Errand(id: 'qa_err2', title: t, done: true)]);
    await repo.projects.putAll([
      Project(
        id: 'qa_proj',
        domain: DomainId.career,
        titleAr: t,
        titleEn: t,
        status: ProjectStatus.active,
        steps: [
          ProjectStep(id: 'qa_ps1', titleAr: t, titleEn: t, done: true, doneDate: dayKey(addDays(today, -1))),
          const ProjectStep(id: 'qa_ps2', titleAr: t, titleEn: t),
        ],
      ),
      const Project(id: 'qa_idea', domain: DomainId.learning, titleAr: t, titleEn: t),
    ]);
    await repo.cycleEntries.put(CycleEntry(id: 'qa_cyc', date: dayKey(addDays(today, -5)), kind: 'start', note: t));
  }
}
