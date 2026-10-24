/**
 * Fresh-start moments (JOY-10) — port of `engine/fresh_start.dart`.
 * The app only OFFERS a gentle «بداية جديدة» card; nothing is reset.
 */
import { addDays, dateOnly, dayKey, daysBetween, parseDayKey, SUNDAY, weekday } from '../core/dates';
import type { Season } from '../models';
import { seasonIsCurrent } from '../models';

export const kNewSeasonWindowDays = 3;

export type FreshStartKind = 'newSeason' | 'newMonth' | 'newWeek';

export interface FreshStart {
  kind: FreshStartKind;
  date: string;
}

/** The strongest landmark on [day] (season > month > week), or null. */
export function freshStartOn(day: Date, o: { weekStartsOn?: number; season?: Season | null } = {}): FreshStart | null {
  const d = dateOnly(day);
  const key = dayKey(d);
  const s = o.season;
  if (s != null && seasonIsCurrent(s)) {
    const since = daysBetween(parseDayKey(s.startDate), d);
    if (since >= 0 && since < kNewSeasonWindowDays) return { kind: 'newSeason', date: key };
  }
  if (d.getDate() === 1) return { kind: 'newMonth', date: key };
  if (weekday(d) === (o.weekStartsOn ?? SUNDAY)) return { kind: 'newWeek', date: key };
  return null;
}

/** Landmark of the day after [day]; a season counts only when it starts exactly tomorrow. */
export function freshStartTomorrow(day: Date, o: { weekStartsOn?: number; season?: Season | null } = {}): FreshStart | null {
  const t = addDays(dateOnly(day), 1);
  const s = o.season;
  if (s != null && seasonIsCurrent(s) && s.startDate === dayKey(t)) return { kind: 'newSeason', date: dayKey(t) };
  return freshStartOn(t, { weekStartsOn: o.weekStartsOn });
}
