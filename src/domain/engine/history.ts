/** Shared, pure helpers for turning logs into planned occurrences (port of `engine/history.dart`). */
import { addDays, dateOnly, dayKey } from '../core/dates';
import type { CompletionLevel, LogEntry } from '../models';
import { logIsDone } from '../models';

const rank = (l: CompletionLevel): number => (l === 'bonus' ? 3 : l === 'normal' ? 2 : l === 'minimum' ? 1 : 0);

/** Indexes [logs] of [itemId] by day key, keeping the best level per day. */
export function indexLogsByDay(logs: Iterable<LogEntry>, itemId: string): Map<string, LogEntry> {
  const out = new Map<string, LogEntry>();
  for (const l of logs) {
    if (l.itemId !== itemId) continue;
    const prev = out.get(l.date);
    if (prev === undefined || rank(l.level) > rank(prev.level)) out.set(l.date, l);
  }
  return out;
}

/** One planned (or bonus, unplanned-but-done) day for an item. */
export interface Occurrence {
  day: Date;
  log: LogEntry | null;
  /** False when the day was not scheduled but she did it anyway. */
  planned: boolean;
  done: boolean;
  key: string;
}

function occ(day: Date, log: LogEntry | null, planned: boolean): Occurrence {
  return { day, log, planned, done: log != null && logIsDone(log), key: dayKey(day) };
}

/**
 * Planned occurrences from [from] to [to] (inclusive), oldest first. Days
 * before [notBefore] are ignored. Unplanned days with a done log are included
 * as bonus occurrences (never as misses).
 */
export function occurrences(o: {
  isPlanned: (day: Date) => boolean;
  logsByDay: Map<string, LogEntry>;
  from: Date;
  to: Date;
  notBefore?: Date | null;
}): Occurrence[] {
  const out: Occurrence[] = [];
  let d = dateOnly(o.from);
  const end = dateOnly(o.to);
  const floor = o.notBefore == null ? null : dateOnly(o.notBefore);
  while (d.getTime() <= end.getTime()) {
    if (floor == null || d.getTime() >= floor.getTime()) {
      const log = o.logsByDay.get(dayKey(d)) ?? null;
      if (o.isPlanned(d)) out.push(occ(d, log, true));
      else if (log != null && logIsDone(log)) out.push(occ(d, log, false));
    }
    d = addDays(d, 1);
  }
  return out;
}

/** Median of [values]; null when empty. */
export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.trunc(s.length / 2);
  return s.length % 2 === 1 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}
