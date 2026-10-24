/**
 * Weekly-review depth + Insights read-outs (feat/a). Pure functions over existing engine pieces —
 * no new storage, no new rules: strength checks → habitStrength.ts, experiments → experiments.ts,
 * momentum → momentum.ts, return speed → insights.ts. This file only selects and shapes.
 */
import { addDays, cmpStr, dateOnly, dayKey, daysBetween, parseDayKey, startOfWeek, SUNDAY } from '../core/dates';
import type { Domain, DomainId, Experiment, Habit, LogEntry, MissReason, StrengthCheck } from '../models';
import { compareExperiment, type ExperimentResult, type ExperimentTemplate } from './experiments';
import { recoverySpeedByWeek } from './insights';
import { averageMomentum, habitMomentum, isMomentumResting } from './momentum';
import { srbaiScore } from './habitStrength';

// ---- blockers → one suggested fix ------------------------------------------------------------

/** Which one-variable experiment answers each blocker (null = the fix is a plain suggestion). */
export const BLOCKER_EXPERIMENT: Readonly<Record<MissReason, ExperimentTemplate | null>> = {
  forgot: null,
  badTime: 'timeSwap',
  tooBig: 'minimumOnly',
  tired: 'minimumOnly',
  notEnjoyable: 'bundle',
  placeDidntFit: null,
  busy: 'minimumOnly',
  notImportantNow: null,
};

/** Template of a suggested experiment (the variable string is the single source). */
export function experimentTemplateOf(e: Pick<Experiment, 'variable'>): ExperimentTemplate | null {
  if (e.variable.startsWith('time:')) return 'timeSwap';
  if (e.variable.startsWith('bundle:')) return 'bundle';
  if (e.variable === 'minimum') return 'minimumOnly';
  return null;
}

/** First selected blocker (in her order) that maps to an experiment → the template to pre-pick. */
export function preferredTemplate(reasons: readonly MissReason[]): ExperimentTemplate | null {
  for (const r of reasons) {
    const t = BLOCKER_EXPERIMENT[r];
    if (t) return t;
  }
  return null;
}

// ---- strength check (SRBAI, 4 items 1–5) -----------------------------------------------------

export interface StrengthCandidate {
  habit: Habit;
  lastCheck: string | null;
  /** Never checked, or last check ≥ [days] ago. */
  due: boolean;
}

/** Active habits ordered by who needs a check most (never → oldest), then by their own order. */
export function strengthCandidates(o: { habits: Habit[]; checks: StrengthCheck[]; today: Date; dueAfterDays?: number }): StrengthCandidate[] {
  const dueAfter = o.dueAfterDays ?? 28;
  const t = dateOnly(o.today);
  const out = o.habits
    .filter((h) => h.status === 'active')
    .map((habit) => {
      const own = o.checks.filter((c) => c.habitId === habit.id).sort((a, b) => cmpStr(b.date, a.date));
      const lastCheck = own[0]?.date ?? null;
      const due = lastCheck == null || daysBetween(parseDayKey(lastCheck), t) >= dueAfter;
      return { habit, lastCheck, due };
    });
  return out.sort((a, b) => {
    if (a.lastCheck == null && b.lastCheck != null) return -1;
    if (b.lastCheck == null && a.lastCheck != null) return 1;
    if (a.lastCheck != null && b.lastCheck != null && a.lastCheck !== b.lastCheck) return cmpStr(a.lastCheck, b.lastCheck);
    return a.habit.sortOrder - b.habit.sortOrder;
  });
}

export type StrengthBand = 'attention' | 'easing' | 'easy' | 'automatic';
/** Words, never a score on screen: 0–100 SRBAI → one of four bands. */
export function strengthBand(items: number[]): StrengthBand {
  const v = srbaiScore(items);
  if (v < 25) return 'attention';
  if (v < 50) return 'easing';
  if (v < 75) return 'easy';
  return 'automatic';
}

export const isCompleteCheck = (items: readonly number[]): boolean => items.length === 4 && items.every((n) => n >= 1 && n <= 5);

// ---- momentum by domain ----------------------------------------------------------------------

export interface DomainMomentumRow {
  domain: DomainId;
  /** 0–100 (rest floor 1 once started). */
  value: number;
  habits: number;
  /** Everything here is resting — shown as «ترتاح», never as zero. */
  resting: boolean;
}

/** One row per enabled, non-rest domain that has active habits. Sorted high → low. */
export function momentumByDomain(o: { domains: Domain[]; habits: Habit[]; logs: LogEntry[]; today: Date }): DomainMomentumRow[] {
  const rows: DomainMomentumRow[] = [];
  for (const d of o.domains) {
    if (!d.enabled || d.sensitive) continue;
    const hs = o.habits.filter((h) => h.status === 'active' && h.domain === d.id);
    if (hs.length === 0) continue;
    const value = averageMomentum({ habits: hs, logs: o.logs, today: o.today });
    const resting = hs.every((h) => isMomentumResting(habitMomentum({ habit: h, logs: o.logs, today: o.today })));
    rows.push({ domain: d.id, value, habits: hs.length, resting });
  }
  return rows.sort((a, b) => b.value - a.value);
}

// ---- return speed ----------------------------------------------------------------------------

export interface ReturnSpeedPoint {
  /** Week-start day key. */
  weekStart: string;
  /** Mean days from a miss to the next completion; null = no miss to come back from that week. */
  days: number | null;
}
export type ReturnTrend = 'faster' | 'steady' | 'slower' | 'unknown';

export function returnSpeed(o: { habits: Habit[]; logs: LogEntry[]; today: Date; weekStartsOn?: number; weeks?: number }): { points: ReturnSpeedPoint[]; trend: ReturnTrend } {
  const weeks = o.weeks ?? 4;
  const ws = o.weekStartsOn ?? SUNDAY;
  const vals = recoverySpeedByWeek({ habits: o.habits.filter((h) => h.status === 'active'), logs: o.logs, today: o.today, weeks, weekStartsOn: ws });
  const thisWeek = startOfWeek(dateOnly(o.today), ws);
  const points = vals.map((days, i) => ({ weekStart: dayKey(addDays(thisWeek, -7 * (weeks - 1 - i))), days }));
  const known = points.filter((p) => p.days != null);
  let trend: ReturnTrend = 'unknown';
  if (known.length >= 2) {
    const d = (known[known.length - 1]!.days as number) - (known[0]!.days as number);
    trend = d <= -0.5 ? 'faster' : d >= 0.5 ? 'slower' : 'steady';
  }
  return { points, trend };
}

// ---- experiment result -----------------------------------------------------------------------

export interface ExperimentReadout {
  experiment: Experiment;
  habit: Habit;
  result: ExperimentResult | null;
  /** Days of the experiment that have passed (1-based, capped at lengthDays). */
  dayNumber: number;
  /** The planned length has passed: she can decide. */
  ready: boolean;
  /** Both windows have at least one planned day. */
  enoughData: boolean;
}

export function experimentReadout(o: { experiment: Experiment; habits: Habit[]; logs: LogEntry[]; today: Date }): ExperimentReadout | null {
  const e = o.experiment;
  const habit = o.habits.find((h) => h.id === e.habitId);
  if (!habit || e.startDate == null) return null;
  const elapsed = daysBetween(parseDayKey(e.startDate), dateOnly(o.today)) + 1;
  const result = compareExperiment({ experiment: e, habit, logs: o.logs, today: o.today });
  return {
    experiment: e,
    habit,
    result,
    dayNumber: Math.max(1, Math.min(elapsed, e.lengthDays)),
    ready: elapsed >= e.lengthDays,
    enoughData: result != null && result.before.planned > 0 && result.after.planned > 0,
  };
}
