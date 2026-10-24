/**
 * Insights read-outs (spec §7.13) — port of `engine/insights.dart`.
 * Every number comes from her own logs; null/empty when there is not enough data.
 */
import { addDays, clamp, cmpStr, dateOnly, dayKey, daysBetween, parseDayKey, startOfWeek, SUNDAY } from '../core/dates';
import type { Habit, LogEntry, WeeklyReviewRecord } from '../models';
import { isPlannedOn, logIsDone } from '../models';
import { indexLogsByDay, occurrences } from './history';

export const kMinSamplesForBestTime = 3;

/** Mean days-to-return after a missed planned day, per week, oldest first. */
export function recoverySpeedByWeek(o: {
  habits: Habit[];
  logs: LogEntry[];
  today: Date;
  weeks?: number;
  weekStartsOn?: number;
}): (number | null)[] {
  const weeks = o.weeks ?? 4;
  const t = dateOnly(o.today);
  const thisWeek = startOfWeek(t, o.weekStartsOn ?? SUNDAY);
  const firstWeek = addDays(thisWeek, -7 * (weeks - 1));
  const gapsByWeek: number[][] = Array.from({ length: weeks }, () => []);
  for (const h of o.habits) {
    const byDay = indexLogsByDay(o.logs, h.id);
    const occ = occurrences({
      isPlanned: (d) => isPlannedOn(h.schedule, d),
      logsByDay: byDay,
      from: addDays(firstWeek, -28),
      to: t,
      notBefore: h.createdDate == null ? null : parseDayKey(h.createdDate),
    });
    let firstMiss: Date | null = null;
    for (const x of occ) {
      if (x.day.getTime() === t.getTime() && !x.done) continue;
      if (!x.done && x.planned) {
        firstMiss ??= x.day;
      } else if (x.done && firstMiss != null) {
        const w = Math.trunc(daysBetween(firstWeek, x.day) / 7);
        if (w >= 0 && w < weeks) gapsByWeek[w]!.push(daysBetween(firstMiss, x.day));
        firstMiss = null;
      }
    }
  }
  return gapsByWeek.map((g) => (g.length === 0 ? null : g.reduce((a, b) => a + b, 0) / g.length));
}

export interface TimeWindow {
  start: number;
  end: number;
  samples: number;
}

/** Her usual completion window (25th–75th percentile, 15-min rounded, ≥ 30 min wide). */
export function bestTimeWindow(o: { logs: LogEntry[]; itemId: string; today: Date; days?: number }): TimeWindow | null {
  const days = o.days ?? 28;
  const from = dayKey(addDays(dateOnly(o.today), -(days - 1)));
  const mins = o.logs
    .filter((l) => l.itemId === o.itemId && logIsDone(l) && l.minuteOfDay != null && cmpStr(l.date, from) >= 0)
    .map((l) => l.minuteOfDay as number)
    .sort((a, b) => a - b);
  if (mins.length < kMinSamplesForBestTime) return null;
  const pct = (p: number) => mins[Math.round((mins.length - 1) * p)]!;
  let lo = Math.trunc(pct(0.25) / 15) * 15;
  let hi = Math.trunc((pct(0.75) + 14) / 15) * 15;
  if (hi - lo < 30) {
    const mid = Math.trunc((lo + hi) / 2);
    lo = Math.trunc((mid - 15) / 15) * 15;
    hi = lo + 30;
  }
  return { start: clamp(lo, 0, 1439), end: clamp(hi, 0, 1439), samples: mins.length };
}

export interface SystemBurden {
  logCount: number;
  reviewMinutes: number | null;
}

export function systemBurden(o: { logs: LogEntry[]; reviews: WeeklyReviewRecord[]; today: Date; weekStartsOn?: number }): SystemBurden {
  const start = dayKey(startOfWeek(o.today, o.weekStartsOn ?? SUNDAY));
  const end = dayKey(o.today);
  const inWeek = (d: string) => cmpStr(d, start) >= 0 && cmpStr(d, end) <= 0;
  const r = o.reviews.filter((x) => inWeek(x.date) && x.durationSec != null);
  return {
    logCount: o.logs.filter((l) => inWeek(l.date)).length,
    reviewMinutes: r.length === 0 ? null : Math.ceil(r.reduce((a, x) => a + (x.durationSec as number), 0) / 60),
  };
}

/** Completed / planned days of [habit] in the week containing [today]. */
export function weekCount(habit: Habit, logs: LogEntry[], today: Date, weekStartsOn: number = SUNDAY): { done: number; planned: number } {
  const from = startOfWeek(today, weekStartsOn);
  const occ = occurrences({
    isPlanned: (d) => isPlannedOn(habit.schedule, d),
    logsByDay: indexLogsByDay(logs, habit.id),
    from,
    to: addDays(from, 6),
  });
  return { done: occ.filter((o) => o.done).length, planned: occ.filter((o) => o.planned).length };
}
