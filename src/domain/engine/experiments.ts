/**
 * N-of-1 experiments (spec §5.7, ENG-21) — port of `engine/experiments.dart`.
 * One active at a time; the engine reports, she decides keep/revert.
 */
import { addDays, cmpNum, cmpStr, dateOnly, dayKey, parseDayKey } from '../core/dates';
import type { Experiment, Habit, JoyItem, LogEntry } from '../models';
import { isPlannedOn, makeExperiment } from '../models';
import { indexLogsByDay, occurrences } from './history';

export const canStartExperiment = (all: Experiment[]): boolean => all.every((e) => e.status !== 'active');

export interface WindowStats {
  planned: number;
  done: number;
  meanEnjoyment: number | null;
}
export const completionRate = (w: WindowStats): number | null => (w.planned === 0 ? null : w.done / w.planned);

export interface ExperimentResult {
  before: WindowStats;
  after: WindowStats;
}
export function completionDelta(r: ExperimentResult): number | null {
  const a = completionRate(r.before);
  const b = completionRate(r.after);
  return a == null || b == null ? null : b - a;
}
export function enjoymentDelta(r: ExperimentResult): number | null {
  const a = r.before.meanEnjoyment;
  const b = r.after.meanEnjoyment;
  return a == null || b == null ? null : b - a;
}

function stats(habit: Habit, logs: LogEntry[], from: Date, to: Date): WindowStats {
  if (to.getTime() < from.getTime()) return { planned: 0, done: 0, meanEnjoyment: null };
  const byDay = indexLogsByDay(logs, habit.id);
  const occ = occurrences({ isPlanned: (d) => isPlannedOn(habit.schedule, d), logsByDay: byDay, from, to });
  const planned = occ.filter((o) => o.planned).length;
  const done = occ.filter((o) => o.planned && o.done).length;
  const fromK = dayKey(from);
  const toK = dayKey(to);
  const ratings = logs
    .filter((l) => l.itemId === habit.id && l.enjoyment != null && cmpStr(l.date, fromK) >= 0 && cmpStr(l.date, toK) <= 0)
    .map((l) => l.enjoyment as number);
  const mean = ratings.length === 0 ? null : ratings.reduce((a, b) => a + b, 0) / ratings.length;
  return { planned, done, meanEnjoyment: mean };
}

/** Before/after comparison; null if the experiment has no start date. */
export function compareExperiment(o: { experiment: Experiment; habit: Habit; logs: LogEntry[]; today: Date }): ExperimentResult | null {
  const e = o.experiment;
  if (e.startDate == null) return null;
  const start = parseDayKey(e.startDate);
  const endPlanned = e.endDate != null ? parseDayKey(e.endDate) : addDays(start, e.lengthDays - 1);
  const t = dateOnly(o.today);
  const afterEnd = endPlanned.getTime() > t.getTime() ? t : endPlanned;
  return {
    before: stats(o.habit, o.logs, addDays(start, -e.lengthDays), addDays(start, -1)),
    after: stats(o.habit, o.logs, start, afterEnd),
  };
}

export type ExperimentTemplate = 'timeSwap' | 'bundle' | 'minimumOnly';

/** Up to [max] one-variable experiment drafts (status `planned`). Deterministic. */
export function suggestExperiments(o: { coreHabits: Habit[]; joyItems?: JoyItem[]; max?: number; lengthDays?: number }): Experiment[] {
  const max = o.max ?? 3;
  const lengthDays = o.lengthDays ?? 7;
  const out: Experiment[] = [];
  const habits = [...o.coreHabits].sort((a, b) => cmpNum(a.sortOrder, b.sortOrder));
  for (const j of (o.joyItems ?? []).filter((x) => x.kind === 'bundled' && x.active && x.bundledHabitId != null)) {
    const h = habits.find((x) => x.id === j.bundledHabitId);
    if (h == null) continue;
    out.push(
      makeExperiment({
        id: `exp_bundle_${h.id}`,
        habitId: h.id,
        titleAr: `${j.titleAr.split('—')[0]!.trim()} مع ${h.titleAr}`,
        titleEn: `${j.titleEn.split('—')[0]!.trim()} with ${h.titleEn}`,
        variable: `bundle:${j.id}`,
        lengthDays,
      }),
    );
    break;
  }
  for (const h of habits) {
    const slot = h.schedule.anchor.slot;
    if (slot !== 'morning' && slot !== 'evening' && slot !== 'afternoon') continue;
    out.push(
      makeExperiment({
        id: `exp_time_${h.id}`,
        habitId: h.id,
        titleAr: `${h.titleAr}: ${slot === 'morning' ? 'الصبح ولا المسا؟' : 'المسا ولا الصبح؟'}`,
        titleEn: `${h.titleEn}: ${slot === 'morning' ? 'morning or evening?' : 'evening or morning?'}`,
        variable: `time:${slot === 'morning' ? 'evening' : 'morning'}`,
        lengthDays,
      }),
    );
    break;
  }
  const used = new Set(out.map((e) => e.habitId));
  const h = habits.find((x) => !used.has(x.id)) ?? habits[0];
  if (h != null) {
    out.push(
      makeExperiment({
        id: `exp_min_${h.id}`,
        habitId: h.id,
        titleAr: `${h.titleAr}: النسخة الصغيرة بس`,
        titleEn: `${h.titleEn}: minimum version only`,
        variable: 'minimum',
        lengthDays,
      }),
    );
  }
  return out.slice(0, max);
}
