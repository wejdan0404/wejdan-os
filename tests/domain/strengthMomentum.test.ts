/** Port of test/engine/strength_momentum_test.dart. */
import { describe, expect, it } from 'vitest';
import {
  type StrengthCheck, addDays, averageMomentum, computeStrength, consistencyScore, dayKey, daysBetween, forgivingStreak,
  graceLeftThisWeek, habitMomentum, indexLogsByDay, mkDate, momentumFromOutcomes, recoverySpeedDays, srbaiScore, stageFor,
  weekday,
} from '../../src/domain';
import { dailyLogs, logFor, simpleHabit } from './helpers';

const today = mkDate(2026, 10, 31);
const start = addDays(today, -27);

describe('SRBAI', () => {
  it('4 items 1–5 map linearly to 0–100', () => {
    expect(srbaiScore([1, 1, 1, 1])).toBe(0);
    expect(srbaiScore([5, 5, 5, 5])).toBe(100);
    expect(srbaiScore([3, 3, 3, 3])).toBe(50);
    expect(srbaiScore([4, 4, 5, 5])).toBeCloseTo(87.5, 9);
    expect(srbaiScore([9, 0, 3, 3])).toBe(50);
    expect(srbaiScore([])).toBe(0);
  });
});

describe('Consistency (28-day, forgiving)', () => {
  it('perfect → 100; one miss per week is forgiven', () => {
    const h = simpleHabit({ created: dayKey(start) });
    const all = indexLogsByDay(dailyLogs('h', start, addDays(today, -1), () => true), 'h');
    expect(consistencyScore({ habit: h, logsByDay: all, today })).toBe(100);
    const missed = new Set([3, 10, 17]);
    const some = indexLogsByDay(dailyLogs('h', start, addDays(today, -1), (d) => !missed.has(daysBetween(start, d))), 'h');
    expect(consistencyScore({ habit: h, logsByDay: some, today })).toBe(100);
  });

  it('half done → about 50–60', () => {
    const h = simpleHabit({ created: dayKey(start) });
    const half = indexLogsByDay(dailyLogs('h', start, addDays(today, -1), (d) => d.getDate() % 2 === 0), 'h');
    const c = consistencyScore({ habit: h, logsByDay: half, today });
    expect(c).toBeGreaterThanOrEqual(45);
    expect(c).toBeLessThanOrEqual(60);
  });

  it('nothing planned → 0', () => {
    const h = simpleHabit({ weekdays: [], created: dayKey(start) });
    expect(consistencyScore({ habit: h, logsByDay: new Map(), today })).toBe(0);
  });

  it('an unfinished today is not a miss', () => {
    const h = simpleHabit({ created: dayKey(addDays(today, -1)) });
    const y = indexLogsByDay([logFor('h', addDays(today, -1))], 'h');
    expect(consistencyScore({ habit: h, logsByDay: y, today })).toBe(100);
  });
});

describe('Recovery speed', () => {
  it('returns mean days from first miss to next completion', () => {
    const h = simpleHabit({ created: dayKey(start) });
    const missed = new Set([5, 6, 12]);
    const logs = indexLogsByDay(dailyLogs('h', start, addDays(today, -1), (d) => !missed.has(daysBetween(start, d))), 'h');
    expect(recoverySpeedDays({ habit: h, logsByDay: logs, today })).toBe(1.5);
  });
  it('null without misses', () => {
    const h = simpleHabit({ created: dayKey(start) });
    const logs = indexLogsByDay(dailyLogs('h', start, addDays(today, -1), () => true), 'h');
    expect(recoverySpeedDays({ habit: h, logsByDay: logs, today })).toBeNull();
  });
});

describe('Growth stages (never a day count)', () => {
  it('thresholds', () => {
    expect(stageFor({ consistency: 100, srbaiHistory: [], plannedDays: 2 })).toBe('seed');
    expect(stageFor({ consistency: 10, srbaiHistory: [], plannedDays: 20 })).toBe('seed');
    expect(stageFor({ consistency: 30, srbaiHistory: [], plannedDays: 20 })).toBe('sprout');
    expect(stageFor({ consistency: 50, srbaiHistory: [], plannedDays: 20 })).toBe('growing');
    expect(stageFor({ consistency: 100, srbaiHistory: [], plannedDays: 28 })).toBe('growing');
    expect(stageFor({ consistency: 70, srbaiHistory: [60], plannedDays: 28 })).toBe('rooted');
    expect(stageFor({ consistency: 100, srbaiHistory: [90], plannedDays: 28 })).toBe('rooted');
    expect(stageFor({ consistency: 90, srbaiHistory: [80, 85], plannedDays: 28 })).toBe('automatic');
    expect(stageFor({ consistency: 60, srbaiHistory: [100, 100], plannedDays: 28 })).toBe('rooted');
  });

  it('computeStrength combines SRBAI + consistency', () => {
    const h = simpleHabit({ created: dayKey(start) });
    const logs = dailyLogs('h', start, addDays(today, -1), () => true);
    const checks: StrengthCheck[] = [
      { id: 'c1', habitId: 'h', date: dayKey(addDays(today, -14)), items: [4, 4, 4, 4] },
      { id: 'c2', habitId: 'h', date: dayKey(addDays(today, -7)), items: [5, 4, 5, 4] },
      { id: 'x', habitId: 'other', date: dayKey(today), items: [1, 1, 1, 1] },
    ];
    const s = computeStrength({ habit: h, logs, checks, today });
    expect(s.srbai).toBeCloseTo(87.5, 9);
    expect(s.consistency).toBe(100);
    expect(s.score).toBeCloseTo(0.6 * 87.5 + 40, 9);
    expect(s.stage).toBe('automatic');
    expect(s.plannedDays).toBe(27);
    const none = computeStrength({ habit: h, logs: [], checks: [], today });
    expect(none.stage).toBe('seed');
    expect(none.srbai).toBeNull();
  });
});

describe('Momentum (no reset to zero)', () => {
  it('EMA: a miss lowers gently (≤25%) and never to zero', () => {
    const m5 = momentumFromOutcomes([true, true, true, true, true]);
    const m6 = momentumFromOutcomes([true, true, true, true, true, false]);
    expect(m6).toBeLessThan(m5);
    expect(m6).toBeGreaterThanOrEqual(m5 * 0.75 - 1e-9);
    expect(momentumFromOutcomes([true, ...Array<boolean>(30).fill(false)])).toBeGreaterThan(0);
    expect(momentumFromOutcomes([])).toBe(0);
    expect(momentumFromOutcomes(Array<boolean>(60).fill(true))).toBeCloseTo(100, 1);
  });

  it('habitMomentum ignores unplanned days and an open today', () => {
    const h = simpleHabit({ weekdays: [1, 3, 5], created: dayKey(start) });
    const logs = dailyLogs('h', start, addDays(today, -1), (d) => [1, 3, 5].includes(weekday(d)));
    const m = habitMomentum({ habit: h, logs, today });
    expect(m).toBeGreaterThan(90);
    const withMiss = logs.filter((l) => l.date !== dayKey(addDays(today, -1)));
    const m2 = habitMomentum({ habit: h, logs: withMiss, today });
    expect(m2).toBeLessThan(m);
    expect(m2).toBeGreaterThan(0);
    expect(averageMomentum({ habits: [h], logs, today })).toBe(m);
    expect(averageMomentum({ habits: [], logs, today })).toBe(0);
  });

  it('forgiving streak: 2 grace days per week, third miss breaks', () => {
    const h = simpleHabit({ created: dayKey(mkDate(2026, 10, 4)) });
    const w1 = dailyLogs('h', mkDate(2026, 10, 4), mkDate(2026, 10, 30), (d) => !(d.getDate() === 26 || d.getDate() === 28));
    const s = forgivingStreak({ habit: h, logs: w1, today });
    expect(s.graceUsedThisWeek).toBe(2);
    expect(graceLeftThisWeek(s)).toBe(0);
    expect(s.length).toBe(25);
    // a third miss in the same week (26, 28, 29) breaks it; only the day after (30) starts the new one
    const w2 = w1.filter((l) => l.date !== '2026-10-29');
    expect(forgivingStreak({ habit: h, logs: w2, today }).length).toBe(1);
  });
});
