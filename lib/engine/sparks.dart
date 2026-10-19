/// Sparks ✦ (spec §6.4–6.5, ENG-07, ENG-12, BODY-12).
///
/// Earning rules (app design values):
///  * completion at minimum (a "start") = 1, normal = 2, bonus = 3
///  * comeback after a miss = ×2 (BODY-12: reward the return)
///  * finishing a weekly review = 5
///  * finishing an experiment = 3
///  * daily earning cap = 20 (anti-grinding). Reversals (undo) free cap space.
///
/// Sparks are never awarded per-streak or for perfection. Spending is only on
/// rewards she defined herself (Earned Rewards).
library;

import '../core/date_utils.dart';
import '../data/models/models.dart';

const int kSparkMinimum = 1;
const int kSparkNormal = 2;
const int kSparkBonus = 3;
const int kComebackMultiplier = 2;
const int kSparkWeeklyReview = 5;
const int kSparkExperiment = 3;
const int kDailySparkCap = 20;

/// Result of an earning computation.
class SparkAward {
  const SparkAward({required this.amount, required this.base, required this.capped, required this.comeback});

  /// Sparks actually granted (after cap).
  final int amount;

  /// Before the cap.
  final int base;

  /// True if the cap reduced the award.
  final bool capped;
  final bool comeback;

  static const none = SparkAward(amount: 0, base: 0, capped: false, comeback: false);
}

/// Base Sparks for a completion level (skipped = 0).
int sparksForLevel(CompletionLevel level) => switch (level) {
      CompletionLevel.minimum => kSparkMinimum,
      CompletionLevel.normal => kSparkNormal,
      CompletionLevel.bonus => kSparkBonus,
      CompletionLevel.skipped => 0,
    };

/// Net Sparks earned on [date] (earnings minus reversals; spending excluded).
int earnedOn(List<SparkTxn> ledger, String date) => ledger
    .where((t) => t.date == date && t.reason != SparkReason.redeem && t.reason != SparkReason.adjustment)
    .fold(0, (a, t) => a + t.amount);

/// Current balance.
int sparkBalance(List<SparkTxn> ledger) => ledger.fold(0, (a, t) => a + t.amount);

SparkAward _cap(int base, int earnedToday, {bool comeback = false}) {
  final room = (kDailySparkCap - earnedToday).clamp(0, kDailySparkCap);
  final amount = base.clamp(0, room);
  return SparkAward(amount: amount, base: base, capped: amount < base, comeback: comeback);
}

/// Award for completing an item at [level].
SparkAward awardForCompletion({
  required CompletionLevel level,
  required bool isComeback,
  required int earnedToday,
}) {
  final base = sparksForLevel(level) * (isComeback && level.isDone ? kComebackMultiplier : 1);
  return _cap(base, earnedToday, comeback: isComeback && level.isDone);
}

/// Award for finishing the weekly review.
SparkAward awardForWeeklyReview({required int earnedToday}) => _cap(kSparkWeeklyReview, earnedToday);

/// Award for finishing an experiment.
SparkAward awardForExperiment({required int earnedToday}) => _cap(kSparkExperiment, earnedToday);

/// Builds the ledger txn for an award (null when nothing is granted).
/// [date] is the logical day key (defaults to the calendar day of [at]).
SparkTxn? txnForAward(SparkAward award, {
  required String id,
  required DateTime at,
  required SparkReason reason,
  String? refId,
  String? date,
}) {
  if (award.amount <= 0) return null;
  return SparkTxn(
    id: id,
    date: date ?? dayKey(at),
    amount: award.amount,
    reason: award.comeback ? SparkReason.comeback : reason,
    refId: refId,
    at: at,
  );
}

/// Reversal txns for all earnings referencing [refId] (used by undo).
List<SparkTxn> reversalsFor(List<SparkTxn> ledger, String refId, {required String Function(int i) idFor, required DateTime at}) {
  final earned = ledger
      .where((t) => t.refId == refId && t.amount > 0 && t.reason != SparkReason.redeem)
      .fold(0, (a, t) => a + t.amount);
  final reversed = ledger
      .where((t) => t.refId == refId && t.reason == SparkReason.reversal)
      .fold(0, (a, t) => a + t.amount);
  final net = earned + reversed;
  if (net <= 0) return const [];
  final original = ledger.firstWhere((t) => t.refId == refId && t.amount > 0);
  return [
    SparkTxn(id: idFor(0), date: original.date, amount: -net, reason: SparkReason.reversal, refId: refId, at: at),
  ];
}

/// Outcome of a redeem attempt.
class RedeemResult {
  const RedeemResult._(this.ok, this.txn, this.shortBy);

  final bool ok;
  final SparkTxn? txn;

  /// Sparks missing when not ok.
  final int shortBy;
}

/// Redeems an Earned Reward. Only [JoyKind.earned] items with a price.
RedeemResult redeemReward({
  required List<SparkTxn> ledger,
  required JoyItem reward,
  required String txnId,
  required DateTime at,
}) {
  final price = reward.price;
  if (reward.kind != JoyKind.earned || price == null || price <= 0) {
    return const RedeemResult._(false, null, 0);
  }
  final balance = sparkBalance(ledger);
  if (balance < price) return RedeemResult._(false, null, price - balance);
  return RedeemResult._(
    true,
    SparkTxn(id: txnId, date: dayKey(at), amount: -price, reason: SparkReason.redeem, refId: reward.id, at: at),
    0,
  );
}
