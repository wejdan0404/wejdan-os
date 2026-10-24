/**
 * Recovery flow (spec §5.5, ENG-20, ENG-03, BODY-12) — port of `engine/recovery.dart`.
 *
 * Trigger: a Core habit missed on its last [kMissesToTrigger] planned
 * occurrences in a row, the app left unopened [kUnopenedDaysToTrigger] whole
 * days, or — web addition — she starts it herself for any habit (`manual`).
 * Flow: reason → one proposed DesignChange (never blame) → accept/edit →
 * applyDesignChange → Comeback Spark bonus on the next completion.
 */
import { addDays, clamp, dateOnly, dayKey, cmpStr, parseDayKey } from '../core/dates';
import type { CueAnchor, Habit, LogEntry, MissReason } from '../models';
import { isPlannedOn, logIsDone } from '../models';
import { indexLogsByDay, median, occurrences } from './history';

export const kMissesToTrigger = 3;
export const kUnopenedDaysToTrigger = 2;

export type RecoveryTriggerKind = 'coreHabitMissed' | 'appUnopened' | 'manual';

export interface RecoveryTrigger {
  kind: RecoveryTriggerKind;
  habitId: string | null;
  missedDays: string[];
}

/** Day keys of the last [kMissesToTrigger] planned occurrences if all were missed, else null. */
export function missedStreak(habit: Habit, logs: LogEntry[], today: Date, lookbackDays = 42): string[] | null {
  const byDay = indexLogsByDay(logs, habit.id);
  const occ = occurrences({
    isPlanned: (d) => isPlannedOn(habit.schedule, d),
    logsByDay: byDay,
    from: addDays(today, -lookbackDays),
    to: addDays(today, -1),
    notBefore: habit.createdDate == null ? null : parseDayKey(habit.createdDate),
  }).filter((o) => o.planned || o.done);
  if (occ.length < kMissesToTrigger) return null;
  const last = occ.slice(occ.length - kMissesToTrigger);
  if (last.some((o) => o.done)) return null;
  return last.map((o) => o.key);
}

/** Checks all automatic triggers (unopened first, then one per core habit). */
export function checkRecovery(o: {
  coreHabits: Habit[];
  logs: LogEntry[];
  openedDays: Set<string>;
  today: Date;
  firstRunDate?: string | null;
}): RecoveryTrigger[] {
  const out: RecoveryTrigger[] = [];
  const t = dateOnly(o.today);
  const unopened: string[] = [];
  for (let i = kUnopenedDaysToTrigger; i >= 1; i--) {
    const k = dayKey(addDays(t, -i));
    if (o.firstRunDate != null && cmpStr(k, o.firstRunDate) < 0) continue;
    if (!o.openedDays.has(k)) unopened.push(k);
  }
  if (unopened.length === kUnopenedDaysToTrigger) {
    out.push({ kind: 'appUnopened', habitId: null, missedDays: unopened });
  }
  for (const h of o.coreHabits) {
    if (h.status !== 'active') continue;
    const missed = missedStreak(h, o.logs, t);
    if (missed != null) out.push({ kind: 'coreHabitMissed', habitId: h.id, missedDays: missed });
  }
  return out;
}

/** Web addition: a recovery she opens herself for ANY habit (from Habits / the habit detail). */
export function manualRecoveryTrigger(habit: Habit, logs: LogEntry[], today: Date): RecoveryTrigger {
  const byDay = indexLogsByDay(logs, habit.id);
  const occ = occurrences({
    isPlanned: (d) => isPlannedOn(habit.schedule, d),
    logsByDay: byDay,
    from: addDays(today, -21),
    to: addDays(today, -1),
    notBefore: habit.createdDate == null ? null : parseDayKey(habit.createdDate),
  });
  const missed = occ.filter((o) => o.planned && !o.done).map((o) => o.key);
  return { kind: 'manual', habitId: habit.id, missedDays: missed.slice(-kMissesToTrigger) };
}

export type DesignChangeType =
  | 'moveCueAddReminder'
  | 'swapTime'
  | 'shrinkToMinimum'
  | 'minimumAndMoveEarlier'
  | 'addJoyPairing'
  | 'changePlacePrepare'
  | 'shrinkAndReschedule'
  | 'pauseToRest';

export const kReasonToChange: Readonly<Record<MissReason, DesignChangeType>> = {
  forgot: 'moveCueAddReminder',
  badTime: 'swapTime',
  tooBig: 'shrinkToMinimum',
  tired: 'minimumAndMoveEarlier',
  notEnjoyable: 'addJoyPairing',
  placeDidntFit: 'changePlacePrepare',
  busy: 'shrinkAndReschedule',
  notImportantNow: 'pauseToRest',
};

export interface DesignChange {
  type: DesignChangeType;
  habitId: string;
  suggestedMinute: number | null;
  suggestedWeekdays: number[] | null;
}
/** Joy pairing / place need her input in the UI first; the rest apply mechanically. */
export const isMechanical = (c: DesignChange): boolean => c.type !== 'addJoyPairing' && c.type !== 'changePlacePrepare';

/** Median minute-of-day at which she completed anything (or [itemId]); null if none. */
export function bestCompletionMinute(logs: LogEntry[], itemId?: string | null): number | null {
  const mins = logs
    .filter((l) => logIsDone(l) && l.minuteOfDay != null && (itemId == null || l.itemId === itemId))
    .map((l) => l.minuteOfDay as number);
  const m = median(mins);
  return m == null ? null : Math.round(m);
}

/** Proposes the design change for [reason] (spec §5.5 mapping). */
export function proposeChange(o: {
  habit: Habit;
  reason: MissReason;
  logs: LogEntry[];
  currentMinute: number;
}): DesignChange {
  const type = kReasonToChange[o.reason];
  const base: DesignChange = { type, habitId: o.habit.id, suggestedMinute: null, suggestedWeekdays: null };
  switch (type) {
    case 'swapTime': {
      const best = bestCompletionMinute(o.logs, o.habit.id) ?? bestCompletionMinute(o.logs);
      const proposed =
        best == null || Math.abs(best - o.currentMinute) < 30 ? clamp(o.currentMinute + 120, 0, 1439) : best;
      return { ...base, suggestedMinute: proposed };
    }
    case 'minimumAndMoveEarlier':
      return { ...base, suggestedMinute: clamp(o.currentMinute - 60, 0, 1439) };
    case 'shrinkAndReschedule': {
      const days = o.habit.schedule.weekdays;
      const kept = days.length <= 3 ? [...days] : [...days].sort((a, b) => a - b).slice(0, 3);
      return { ...base, suggestedWeekdays: kept };
    }
    default:
      return base;
  }
}

/** Applies an accepted change. Always sets `comebackPending` (except pause). */
export function applyDesignChange(habit: Habit, change: DesignChange): Habit {
  const h: Habit = { ...habit, comebackPending: true };
  const at = (m: number): CueAnchor => ({ type: 'fixedTime', minute: m, prayer: null, slot: h.schedule.anchor.slot, offsetMin: 0 });
  switch (change.type) {
    case 'moveCueAddReminder':
      return { ...h, reminder: { ...h.reminder, enabled: true } };
    case 'swapTime':
      return change.suggestedMinute == null ? h : { ...h, schedule: { ...h.schedule, anchor: at(change.suggestedMinute) } };
    case 'shrinkToMinimum':
      return { ...h, shrunkToMinimum: true };
    case 'minimumAndMoveEarlier':
      return {
        ...h,
        shrunkToMinimum: true,
        schedule: change.suggestedMinute == null ? h.schedule : { ...h.schedule, anchor: at(change.suggestedMinute) },
      };
    case 'shrinkAndReschedule':
      return {
        ...h,
        shrunkToMinimum: true,
        schedule: change.suggestedWeekdays == null ? h.schedule : { ...h.schedule, weekdays: [...change.suggestedWeekdays] },
      };
    case 'pauseToRest':
      return { ...h, status: 'paused', comebackPending: false };
    case 'addJoyPairing':
    case 'changePlacePrepare':
      return h;
  }
}

/**
 * A completion is a comeback when flagged, or its previous planned occurrence was missed.
 * Days in [excusedDays] (day keys where she deliberately moved/declined it — «بكرة», a picked date,
 * «مو اليوم») are not misses: a planned «بكرة» is never treated as coming back.
 */
export function isComebackCompletion(habit: Habit, logs: LogEntry[], today: Date, excusedDays?: ReadonlySet<string>): boolean {
  if (habit.comebackPending) return true;
  const byDay = indexLogsByDay(logs, habit.id);
  const occ = occurrences({
    isPlanned: (d) => isPlannedOn(habit.schedule, d),
    logsByDay: byDay,
    from: addDays(today, -21),
    to: addDays(today, -1),
    notBefore: habit.createdDate == null ? null : parseDayKey(habit.createdDate),
  }).filter((o) => o.done || excusedDays == null || !excusedDays.has(o.key));
  if (occ.length === 0) return false;
  return !occ[occ.length - 1]!.done;
}
