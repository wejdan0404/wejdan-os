/**
 * Momentum instead of streaks (spec §5.4, ENG-03, ENG-13) — port of `engine/momentum.dart`.
 * 7-period EMA (α = 0.25) over planned occurrences; never resets to zero after a start
 * (resting floor). Optional forgiving streak (Settings «الستريك المرن»; on for new installs).
 */
import { addDays, clamp, cmpStr, dateOnly, dayKey, parseDayKey, startOfWeek, SUNDAY, weekday } from '../core/dates';
import type { Habit, LogEntry } from '../models';
import { isPlannedOn, logIsDone } from '../models';
import { indexLogsByDay, occurrences, type Occurrence } from './history';

export const kMomentumAlpha = 0.25;
export const kMomentumLookbackDays = 60;
export const kGraceDaysPerWeek = 2;
export const kMomentumRestFloor = 1.0;
export const kMomentumRestShown = kMomentumRestFloor;

export const isMomentumResting = (m: number): boolean => m <= kMomentumRestShown;

/** Momentum 0–100 from explicit outcomes (oldest first). */
export function momentumFromOutcomes(doneOldestFirst: Iterable<boolean>, start = 0): number {
  let m = start;
  let any = start > 0;
  for (const d of doneOldestFirst) {
    any = any || d;
    m = m + kMomentumAlpha * ((d ? 1 : 0) - m);
  }
  const v = m * 100;
  return any && v < kMomentumRestFloor ? kMomentumRestFloor : v;
}

function occ(
  isPlanned: (d: Date) => boolean,
  byDay: Map<string, LogEntry>,
  today: Date,
  createdDate: string | null,
  lookback: number = kMomentumLookbackDays,
): Occurrence[] {
  const t = dateOnly(today);
  const todayLog = byDay.get(dayKey(t));
  const end = todayLog !== undefined && logIsDone(todayLog) ? t : addDays(t, -1);
  return occurrences({
    isPlanned,
    logsByDay: byDay,
    from: addDays(t, -lookback),
    to: end,
    notBefore: createdDate == null ? null : parseDayKey(createdDate),
  });
}

/** Momentum 0–100 for a habit. */
export function habitMomentum(o: { habit: Habit; logs: LogEntry[]; today: Date }): number {
  const byDay = indexLogsByDay(o.logs, o.habit.id);
  const list = occ((d) => isPlannedOn(o.habit.schedule, d), byDay, o.today, o.habit.createdDate);
  const m = momentumFromOutcomes(list.map((x) => x.done));
  const key = dayKey(dateOnly(o.today));
  const everDone = o.logs.some((l) => l.itemId === o.habit.id && logIsDone(l) && cmpStr(l.date, key) <= 0);
  return everDone && m < kMomentumRestFloor ? kMomentumRestFloor : m;
}

/** Mean momentum of [habits]; 0 when empty. */
export function averageMomentum(o: { habits: Habit[]; logs: LogEntry[]; today: Date }): number {
  if (o.habits.length === 0) return 0;
  const sum = o.habits.map((h) => habitMomentum({ habit: h, logs: o.logs, today: o.today })).reduce((a, b) => a + b, 0);
  return sum / o.habits.length;
}

export interface ForgivingStreak {
  length: number;
  graceUsedThisWeek: number;
  /** The last planned day before an open today was a miss a compensation day is holding. */
  holdingOnCompensation: boolean;
}
export const graceLeftThisWeek = (s: ForgivingStreak): number => Math.max(0, kGraceDaysPerWeek - s.graceUsedThisWeek);

/** Per-day state of the current week for the streak/momentum hero (shape + label in the UI, never colour alone). */
export type WeekDayState = 'done' | 'compensation' | 'today' | 'upcoming' | 'rest';
export interface WeekDay {
  date: Date;
  key: string;
  /** Dart weekday (1 = Monday … 7 = Sunday). */
  weekday: number;
  state: WeekDayState;
}

interface StreakRun {
  length: number;
  /** Planned misses per week (week-start key), including the one that broke it. */
  missesByWeek: Map<string, number>;
  /** Missed planned days a compensation day is currently holding (cleared when the streak breaks). */
  covered: Set<string>;
  /** The most recent planned day was a covered miss. */
  lastWasCovered: boolean;
}

/**
 * Forgiving streak, simulated forward (oldest planned day first):
 * a done planned day adds one; a missed planned day is covered by a compensation day while that
 * calendar week (from [weekStartsOn]) has used fewer than [kGraceDaysPerWeek]; the third miss in
 * the same week breaks the streak (length back to 0, calmly — the next done day starts a new one).
 * Unplanned days neither add nor break (a done unplanned day is a bonus, not a streak day).
 * Today only counts once it is done; an open today is never a miss. Days before the habit
 * existed are ignored, so a habit younger than a week has no phantom misses.
 */
function runStreak(o: { habit: Habit; logs: LogEntry[]; today: Date; weekStartsOn?: number }): StreakRun {
  const ws = o.weekStartsOn ?? SUNDAY;
  const byDay = indexLogsByDay(o.logs, o.habit.id);
  const list = occ((d) => isPlannedOn(o.habit.schedule, d), byDay, o.today, o.habit.createdDate, 366);
  const run: StreakRun = { length: 0, missesByWeek: new Map(), covered: new Set(), lastWasCovered: false };
  for (const x of list) {
    if (!x.planned) continue;
    if (x.done) {
      run.length++;
      run.lastWasCovered = false;
      continue;
    }
    const w = dayKey(startOfWeek(x.day, ws));
    const used = (run.missesByWeek.get(w) ?? 0) + 1;
    run.missesByWeek.set(w, used);
    if (used > kGraceDaysPerWeek) {
      run.length = 0;
      run.covered.clear();
      run.lastWasCovered = false;
    } else {
      run.covered.add(x.key);
      run.lastWasCovered = true;
    }
  }
  return run;
}

export function forgivingStreak(o: { habit: Habit; logs: LogEntry[]; today: Date; weekStartsOn?: number }): ForgivingStreak {
  const run = runStreak(o);
  const thisWeek = dayKey(startOfWeek(o.today, o.weekStartsOn ?? SUNDAY));
  return {
    length: run.length,
    graceUsedThisWeek: clamp(run.missesByWeek.get(thisWeek) ?? 0, 0, kGraceDaysPerWeek),
    holdingOnCompensation: run.length > 0 && run.lastWasCovered,
  };
}

/**
 * The seven days of [today]'s week (starting [weekStartsOn]). With [streak] true a missed planned
 * day held by a compensation day is `compensation`; otherwise (and for unplanned, pre-creation or
 * un-held missed days) it is a neutral `rest`.
 */
export function weekStreakDays(o: { habit: Habit; logs: LogEntry[]; today: Date; weekStartsOn?: number; streak: boolean }): WeekDay[] {
  const ws = o.weekStartsOn ?? SUNDAY;
  const t = dateOnly(o.today);
  const first = startOfWeek(t, ws);
  const byDay = indexLogsByDay(o.logs, o.habit.id);
  const covered = o.streak ? runStreak(o).covered : new Set<string>();
  const out: WeekDay[] = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(first, i);
    const key = dayKey(d);
    const log = byDay.get(key);
    const done = log !== undefined && logIsDone(log);
    let state: WeekDayState;
    if (d.getTime() > t.getTime()) state = 'upcoming';
    else if (done) state = 'done';
    else if (d.getTime() === t.getTime()) state = 'today';
    else state = covered.has(key) ? 'compensation' : 'rest';
    out.push({ date: d, key, weekday: weekday(d), state });
  }
  return out;
}
