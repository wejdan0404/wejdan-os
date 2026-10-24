/**
 * Habit Strength (spec §5.3, ENG-02, ENG-04) — port of `engine/habit_strength.dart`.
 * Never a day count: SRBAI (0–100) + forgiving 28-day consistency; recovery speed is reported.
 */
import { addDays, clamp, cmpStr, dateOnly, dayKey, daysBetween, parseDayKey } from '../core/dates';
import type { Domain, GrowthStage, Habit, LogEntry, StrengthCheck } from '../models';
import { isPlannedOn, logIsDone } from '../models';
import { indexLogsByDay, occurrences, type Occurrence } from './history';

export const kConsistencyWindowDays = 28;
export const kMinOccurrencesForStage = 4;
export const kGraceEveryPlannedDays = 7;

/** SRBAI 4 items (each 1–5) → 0–100. */
export function srbaiScore(items: number[]): number {
  if (items.length === 0) return 0;
  const vals = items.slice(0, 4).map((v) => clamp(v, 1, 5));
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  return ((mean - 1) / 4) * 100;
}

function windowOcc(habit: Habit, logsByDay: Map<string, LogEntry>, today: Date, windowDays: number): Occurrence[] {
  const t = dateOnly(today);
  const todayLog = logsByDay.get(dayKey(t));
  const end = todayLog !== undefined && logIsDone(todayLog) ? t : addDays(t, -1);
  return occurrences({
    isPlanned: (d) => isPlannedOn(habit.schedule, d),
    logsByDay,
    from: addDays(t, -(windowDays - 1)),
    to: end,
    notBefore: habit.createdDate == null ? null : parseDayKey(habit.createdDate),
  });
}

/** Forgiving consistency 0–100 over the window ending today. */
export function consistencyScore(o: {
  habit: Habit;
  logsByDay: Map<string, LogEntry>;
  today: Date;
  windowDays?: number;
}): number {
  const occ = windowOcc(o.habit, o.logsByDay, o.today, o.windowDays ?? kConsistencyWindowDays);
  const planned = occ.filter((x) => x.planned).length;
  if (planned === 0) return 0;
  const done = occ.filter((x) => x.done).length;
  const grace = Math.trunc(planned / kGraceEveryPlannedDays);
  const denom = clamp(planned - grace, 1, planned);
  return clamp((done / denom) * 100, 0, 100);
}

/** Mean days from a missed planned day to the next completion; null if none. */
export function recoverySpeedDays(o: {
  habit: Habit;
  logsByDay: Map<string, LogEntry>;
  today: Date;
  windowDays?: number;
}): number | null {
  const occ = windowOcc(o.habit, o.logsByDay, o.today, o.windowDays ?? 56);
  const gaps: number[] = [];
  let firstMiss: Date | null = null;
  for (const x of occ) {
    if (!x.done && x.planned) {
      firstMiss ??= x.day;
    } else if (x.done && firstMiss != null) {
      gaps.push(daysBetween(firstMiss, x.day));
      firstMiss = null;
    }
  }
  if (gaps.length === 0) return null;
  return gaps.reduce((a, b) => a + b, 0) / gaps.length;
}

export interface HabitStrength {
  habitId: string;
  score: number;
  srbai: number | null;
  consistency: number;
  recoverySpeedDays: number | null;
  stage: GrowthStage;
  plannedDays: number;
}

/** Stage from the inputs (see thresholds in the Dart docs). */
export function stageFor(o: { consistency: number; srbaiHistory: number[]; plannedDays: number }): GrowthStage {
  if (o.plannedDays < kMinOccurrencesForStage && o.srbaiHistory.length === 0) return 'seed';
  const hasSrbai = o.srbaiHistory.length > 0;
  const latest = hasSrbai ? o.srbaiHistory[o.srbaiHistory.length - 1]! : null;
  let score = hasSrbai ? 0.6 * latest! + 0.4 * o.consistency : o.consistency;
  if (!hasSrbai && score >= 60) score = 59.9;
  if (score < 20) return 'seed';
  if (score < 40) return 'sprout';
  if (score < 60) return 'growing';
  const h = o.srbaiHistory;
  const plateauHigh = h.length >= 2 && h[h.length - 1]! >= 75 && h[h.length - 2]! >= 75;
  if (score >= 80 && plateauHigh && o.consistency >= 70) return 'automatic';
  return 'rooted';
}

export function computeStrength(o: { habit: Habit; logs: LogEntry[]; checks: StrengthCheck[]; today: Date }): HabitStrength {
  const byDay = indexLogsByDay(o.logs, o.habit.id);
  const consistency = consistencyScore({ habit: o.habit, logsByDay: byDay, today: o.today });
  const planned = windowOcc(o.habit, byDay, o.today, kConsistencyWindowDays).filter((x) => x.planned).length;
  const own = o.checks.filter((c) => c.habitId === o.habit.id).sort((a, b) => cmpStr(a.date, b.date));
  const history = own.map((c) => srbaiScore(c.items));
  const latest = history.length === 0 ? null : history[history.length - 1]!;
  const score = latest == null ? clamp(consistency, 0, 59.9) : 0.6 * latest + 0.4 * consistency;
  return {
    habitId: o.habit.id,
    score,
    srbai: latest,
    consistency,
    recoverySpeedDays: recoverySpeedDays({ habit: o.habit, logsByDay: byDay, today: o.today }),
    stage: stageFor({ consistency, srbaiHistory: history, plannedDays: planned }),
    plannedDays: planned,
  };
}

// ---- resting (port of `ui/state/hub_providers.dart` isRestingHabit) ----------

/** Days without a completion (on planned days) after which a plant rests. */
export const kRestAfterDays = 7;

/**
 * True when the habit is paused/not active, sits in a disabled or Rest domain,
 * or was not done on any planned day this past week. The young-habit grace (younger than
 * [kRestAfterDays]) applies to the "not done this week" rule only: a habit in a domain she
 * set to «راحة» rests whatever its age — exact parity with the Flutter rule (hub_providers.dart).
 * Plants never die — a resting habit keeps its stage.
 */
export function isRestingHabit(o: { habit: Habit; domains: Domain[]; logs: LogEntry[]; today: Date }): boolean {
  const h = o.habit;
  if (h.status !== 'active') return true;
  const d = o.domains.find((x) => x.id === h.domain);
  if (d != null && (!d.enabled || d.state === 'rest')) return true;
  const created = h.createdDate == null ? null : parseDayKey(h.createdDate);
  if (created != null && daysBetween(created, o.today) < kRestAfterDays) return false;
  const occ = occurrences({
    isPlanned: (day) => isPlannedOn(h.schedule, day),
    logsByDay: indexLogsByDay(o.logs, h.id),
    from: addDays(o.today, -kRestAfterDays),
    to: addDays(o.today, -1),
  });
  const planned = occ.filter((x) => x.planned).length;
  return planned > 0 && !occ.some((x) => x.done);
}
