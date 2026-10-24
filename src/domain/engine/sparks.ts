/**
 * Sparks ✦ (spec §6.4–6.5, ENG-07, ENG-12, BODY-12) — port of `engine/sparks.dart`. Kept as-is.
 * minimum = 1, normal = 2, bonus = 3; comeback ×2; weekly review 5; experiment 3; daily cap 20.
 */
import { clamp, dayKey, toIsoLocal } from '../core/dates';
import type { CompletionLevel, JoyItem, SparkReason, SparkTxn } from '../models';
import { isDoneLevel } from '../models';

export const kSparkMinimum = 1;
export const kSparkNormal = 2;
export const kSparkBonus = 3;
export const kComebackMultiplier = 2;
export const kSparkWeeklyReview = 5;
export const kSparkExperiment = 3;
export const kDailySparkCap = 20;

export interface SparkAward {
  amount: number;
  base: number;
  capped: boolean;
  comeback: boolean;
}
export const SPARK_NONE: SparkAward = Object.freeze({ amount: 0, base: 0, capped: false, comeback: false });

export function sparksForLevel(level: CompletionLevel): number {
  switch (level) {
    case 'minimum': return kSparkMinimum;
    case 'normal': return kSparkNormal;
    case 'bonus': return kSparkBonus;
    case 'skipped': return 0;
  }
}

/** Net Sparks earned on [date] (earnings minus reversals; spending excluded). */
export const earnedOn = (ledger: SparkTxn[], date: string): number =>
  ledger
    .filter((t) => t.date === date && t.reason !== 'redeem' && t.reason !== 'adjustment')
    .reduce((a, t) => a + t.amount, 0);

export const sparkBalance = (ledger: SparkTxn[]): number => ledger.reduce((a, t) => a + t.amount, 0);

function cap(base: number, earnedToday: number, comeback = false): SparkAward {
  const room = clamp(kDailySparkCap - earnedToday, 0, kDailySparkCap);
  const amount = clamp(base, 0, room);
  return { amount, base, capped: amount < base, comeback };
}

export function awardForCompletion(o: { level: CompletionLevel; isComeback: boolean; earnedToday: number }): SparkAward {
  const cb = o.isComeback && isDoneLevel(o.level);
  return cap(sparksForLevel(o.level) * (cb ? kComebackMultiplier : 1), o.earnedToday, cb);
}
export const awardForWeeklyReview = (o: { earnedToday: number }): SparkAward => cap(kSparkWeeklyReview, o.earnedToday);
export const awardForExperiment = (o: { earnedToday: number }): SparkAward => cap(kSparkExperiment, o.earnedToday);

/** Ledger txn for an award (null when nothing is granted). */
export function txnForAward(
  award: SparkAward,
  o: { id: string; at: Date; reason: SparkReason; refId?: string | null; date?: string | null },
): SparkTxn | null {
  if (award.amount <= 0) return null;
  return {
    id: o.id,
    date: o.date ?? dayKey(o.at),
    amount: award.amount,
    reason: award.comeback ? 'comeback' : o.reason,
    refId: o.refId ?? null,
    at: toIsoLocal(o.at),
  };
}

/** Reversal txns for all earnings referencing [refId] (used by undo). */
export function reversalsFor(ledger: SparkTxn[], refId: string, o: { idFor: (i: number) => string; at: Date }): SparkTxn[] {
  const earned = ledger.filter((t) => t.refId === refId && t.amount > 0 && t.reason !== 'redeem').reduce((a, t) => a + t.amount, 0);
  const reversed = ledger.filter((t) => t.refId === refId && t.reason === 'reversal').reduce((a, t) => a + t.amount, 0);
  const net = earned + reversed;
  if (net <= 0) return [];
  const original = ledger.find((t) => t.refId === refId && t.amount > 0)!;
  return [{ id: o.idFor(0), date: original.date, amount: -net, reason: 'reversal', refId, at: toIsoLocal(o.at) }];
}

export interface RedeemResult {
  ok: boolean;
  txn: SparkTxn | null;
  shortBy: number;
}

/** Redeems an Earned Reward (only `earned` items with a price). */
export function redeemReward(o: { ledger: SparkTxn[]; reward: JoyItem; txnId: string; at: Date }): RedeemResult {
  const price = o.reward.price;
  if (o.reward.kind !== 'earned' || price == null || price <= 0) return { ok: false, txn: null, shortBy: 0 };
  const balance = sparkBalance(o.ledger);
  if (balance < price) return { ok: false, txn: null, shortBy: price - balance };
  return {
    ok: true,
    txn: { id: o.txnId, date: dayKey(o.at), amount: -price, reason: 'redeem', refId: o.reward.id, at: toIsoLocal(o.at) },
    shortBy: 0,
  };
}
