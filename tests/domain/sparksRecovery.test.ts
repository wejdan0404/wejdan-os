/** Port of test/engine/sparks_recovery_test.dart. */
import { describe, expect, it } from 'vitest';
import {
  type SparkReason, type SparkTxn, MISS_REASONS, SPARK_NONE, applyDesignChange, awardForCompletion, awardForExperiment,
  awardForWeeklyReview, bestCompletionMinute, checkRecovery, dayKey, earnedOn, isComebackCompletion, isMechanical,
  kReasonToChange, kSparkWeeklyReview, makeJoyItem, manualRecoveryTrigger, mkDate, proposeChange, redeemReward, reversalsFor,
  sparkBalance, sparksForLevel, txnForAward,
} from '../../src/domain';
import { logFor, mon, simpleHabit, sun, tue, wed } from './helpers';

const txn = (amount: number, o: { date?: string; reason?: SparkReason; ref?: string } = {}): SparkTxn => ({
  id: `t${amount}${o.date ?? '2026-10-05'}${o.ref ?? 'null'}`,
  date: o.date ?? '2026-10-05',
  amount,
  reason: o.reason ?? 'completion',
  refId: o.ref ?? null,
  at: null,
});

describe('Sparks earning', () => {
  it('levels: minimum 1, normal 2, bonus 3, skipped 0', () => {
    expect(sparksForLevel('minimum')).toBe(1);
    expect(sparksForLevel('normal')).toBe(2);
    expect(sparksForLevel('bonus')).toBe(3);
    expect(sparksForLevel('skipped')).toBe(0);
  });

  it('comeback doubles', () => {
    const a = awardForCompletion({ level: 'normal', isComeback: true, earnedToday: 0 });
    expect(a.amount).toBe(4);
    expect(a.comeback).toBe(true);
    const skip = awardForCompletion({ level: 'skipped', isComeback: true, earnedToday: 0 });
    expect(skip.amount).toBe(0);
    expect(skip.comeback).toBe(false);
  });

  it('daily cap 20', () => {
    const a = awardForCompletion({ level: 'bonus', isComeback: true, earnedToday: 18 });
    expect(a.amount).toBe(2);
    expect(a.capped).toBe(true);
    expect(awardForCompletion({ level: 'minimum', isComeback: false, earnedToday: 20 }).amount).toBe(0);
    expect(awardForWeeklyReview({ earnedToday: 0 }).amount).toBe(kSparkWeeklyReview);
    expect(awardForExperiment({ earnedToday: 19 }).amount).toBe(1);
  });

  it('earnedOn excludes spending; balance sums all', () => {
    const ledger = [txn(2), txn(3, { reason: 'comeback' }), txn(-60, { reason: 'redeem' }), txn(-2, { reason: 'reversal', ref: 'x' }), txn(5, { date: '2026-10-04' })];
    expect(earnedOn(ledger, '2026-10-05')).toBe(3);
    expect(sparkBalance(ledger)).toBe(-52);
  });

  it('txnForAward & reversals', () => {
    const at = mkDate(2026, 10, 5, 9);
    const award = awardForCompletion({ level: 'normal', isComeback: true, earnedToday: 0 });
    const t = txnForAward(award, { id: 's1', at, reason: 'completion', refId: 'log1' })!;
    expect(t.reason).toBe('comeback');
    expect(t.amount).toBe(4);
    expect(txnForAward(SPARK_NONE, { id: 's', at, reason: 'completion' })).toBeNull();
    const rev = reversalsFor([t], 'log1', { idFor: (i) => `r${i}`, at });
    expect(rev.length).toBe(1);
    expect(rev[0]!.amount).toBe(-4);
    expect(reversalsFor([t, ...rev], 'log1', { idFor: (i) => `r${i}`, at })).toEqual([]);
    expect(earnedOn([t, ...rev], '2026-10-05')).toBe(0);
  });

  it('redeem earned rewards only, with enough balance', () => {
    const reward = makeJoyItem({ id: 'beans', kind: 'earned', titleAr: 'ب', titleEn: 'Beans', price: 60 });
    const at = mkDate(2026, 10, 5);
    const poor = redeemReward({ ledger: [txn(20)], reward, txnId: 'x', at });
    expect(poor.ok).toBe(false);
    expect(poor.shortBy).toBe(40);
    const rich = redeemReward({ ledger: [txn(20), txn(50, { date: '2026-10-01' })], reward, txnId: 'x', at });
    expect(rich.ok).toBe(true);
    expect(rich.txn!.amount).toBe(-60);
    expect(rich.txn!.reason).toBe('redeem');
    const free = makeJoyItem({ id: 'f', kind: 'free', titleAr: 'ف', titleEn: 'F' });
    expect(redeemReward({ ledger: [txn(100)], reward: free, txnId: 'x', at }).ok).toBe(false);
  });
});

describe('Recovery', () => {
  const created = '2026-09-27';

  it('trigger after 3 planned misses in a row (core habit)', () => {
    const h = simpleHabit({ weekdays: [1, 3, 5], created });
    const logs = [logFor('h', mkDate(2026, 9, 28))];
    const t = checkRecovery({ coreHabits: [h], logs, openedDays: new Set(['2026-10-06', '2026-10-05']), today: tue });
    expect(t.length).toBe(1);
    expect(t[0]!.kind).toBe('coreHabitMissed');
    expect(t[0]!.missedDays).toEqual(['2026-09-30', '2026-10-02', '2026-10-05']);
  });

  it('no trigger after 2 misses or when one was done', () => {
    const h = simpleHabit({ weekdays: [1, 3, 5], created });
    const opened = new Set(['2026-10-05', '2026-10-04']);
    expect(checkRecovery({ coreHabits: [h], logs: [logFor('h', mkDate(2026, 10, 2))], openedDays: opened, today: tue })).toEqual([]);
    const fresh = simpleHabit({ weekdays: [1, 3, 5], created: '2026-10-01' });
    expect(checkRecovery({ coreHabits: [fresh], logs: [], openedDays: opened, today: tue })).toEqual([]);
    const paused = { ...simpleHabit({ weekdays: [1, 3, 5], created }), status: 'paused' as const };
    expect(checkRecovery({ coreHabits: [paused], logs: [], openedDays: opened, today: tue })).toEqual([]);
  });

  it('trigger when the app was unopened for 2 whole days', () => {
    const t = checkRecovery({ coreHabits: [], logs: [], openedDays: new Set(['2026-10-03']), today: tue });
    expect(t.length).toBe(1);
    expect(t[0]!.kind).toBe('appUnopened');
    expect(t[0]!.missedDays).toEqual(['2026-10-04', '2026-10-05']);
    expect(checkRecovery({ coreHabits: [], logs: [], openedDays: new Set(), today: tue, firstRunDate: '2026-10-06' })).toEqual([]);
  });

  it('reason → design change mapping (spec §5.5)', () => {
    expect(kReasonToChange.forgot).toBe('moveCueAddReminder');
    expect(kReasonToChange.badTime).toBe('swapTime');
    expect(kReasonToChange.tooBig).toBe('shrinkToMinimum');
    expect(kReasonToChange.tired).toBe('minimumAndMoveEarlier');
    expect(kReasonToChange.notEnjoyable).toBe('addJoyPairing');
    expect(kReasonToChange.placeDidntFit).toBe('changePlacePrepare');
    expect(kReasonToChange.busy).toBe('shrinkAndReschedule');
    expect(kReasonToChange.notImportantNow).toBe('pauseToRest');
    expect(Object.keys(kReasonToChange).length).toBe(MISS_REASONS.length);
  });

  it('proposals and application', () => {
    const h = simpleHabit({ created });
    const logs = [logFor('h', mon, { minute: 20 * 60 }), logFor('h', tue, { minute: 20 * 60 + 30 }), logFor('h', wed, { minute: 19 * 60 + 30 })];
    const swap = proposeChange({ habit: h, reason: 'badTime', logs, currentMinute: 8 * 60 });
    expect(swap.suggestedMinute).toBe(20 * 60);
    const moved = applyDesignChange(h, swap);
    expect(moved.schedule.anchor.type).toBe('fixedTime');
    expect(moved.schedule.anchor.minute).toBe(20 * 60);
    expect(moved.comebackPending).toBe(true);
    expect(proposeChange({ habit: h, reason: 'badTime', logs, currentMinute: 20 * 60 + 10 }).suggestedMinute).toBe(22 * 60 + 10);
    const tired = applyDesignChange(h, proposeChange({ habit: h, reason: 'tired', logs, currentMinute: 600 }));
    expect(tired.shrunkToMinimum).toBe(true);
    expect(tired.schedule.anchor.minute).toBe(540);
    expect(applyDesignChange(h, proposeChange({ habit: h, reason: 'tooBig', logs, currentMinute: 600 })).shrunkToMinimum).toBe(true);
    const busy = proposeChange({ habit: h, reason: 'busy', logs, currentMinute: 600 });
    expect(busy.suggestedWeekdays).toEqual([1, 2, 3]);
    expect(applyDesignChange(h, busy).schedule.weekdays).toEqual([1, 2, 3]);
    expect(applyDesignChange(h, proposeChange({ habit: h, reason: 'forgot', logs, currentMinute: 600 })).reminder.enabled).toBe(true);
    const pause = applyDesignChange(h, proposeChange({ habit: h, reason: 'notImportantNow', logs, currentMinute: 600 }));
    expect(pause.status).toBe('paused');
    expect(pause.comebackPending).toBe(false);
    const joy = proposeChange({ habit: h, reason: 'notEnjoyable', logs, currentMinute: 600 });
    expect(isMechanical(joy)).toBe(false);
    expect(applyDesignChange(h, joy).comebackPending).toBe(true);
    const place = proposeChange({ habit: h, reason: 'placeDidntFit', logs, currentMinute: 600 });
    expect(applyDesignChange(h, place).schedule.anchor.type).toBe(h.schedule.anchor.type);
    expect(bestCompletionMinute([])).toBeNull();
  });

  it('comeback detection', () => {
    const h = simpleHabit({ created });
    expect(isComebackCompletion(h, [logFor('h', mon)], tue)).toBe(false);
    expect(isComebackCompletion(h, [logFor('h', sun)], tue)).toBe(true);
    expect(isComebackCompletion({ ...h, comebackPending: true }, [logFor('h', mon)], tue)).toBe(true);
    expect(isComebackCompletion(simpleHabit({ created: dayKey(tue) }), [], tue)).toBe(false);
  });

  it('web: recovery can be started for any habit (manual trigger)', () => {
    const h = simpleHabit({ weekdays: [1, 3, 5], created });
    const t = manualRecoveryTrigger(h, [logFor('h', mkDate(2026, 9, 28))], tue);
    expect(t.kind).toBe('manual');
    expect(t.habitId).toBe('h');
    expect(t.missedDays).toEqual(['2026-09-30', '2026-10-02', '2026-10-05']);
    expect(manualRecoveryTrigger(h, dailyAll(h.id), tue).missedDays).toEqual([]);
  });
});

function dailyAll(id: string) {
  return ['2026-09-28', '2026-09-30', '2026-10-02', '2026-10-05'].map((d) => logFor(id, new Date(`${d}T00:00:00`)));
}
