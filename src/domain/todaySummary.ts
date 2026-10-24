/**
 * Today read-models for the grouped day («يومك جاهز»), the weekly momentum ring and the
 * «هذا الأسبوع» strip. Pure functions; caps come from the day-planner constants, never invented here.
 */
import { addDays, dayKey, parseDayKey } from './core/dates';
import { kMaxCore, kMaxCoreYellow, kMaxMaintain } from './engine/dayPlanner';
import { averageMomentum, isMomentumResting } from './engine/momentum';
import type { DayPlan, EnergyMode, PlanItem, PlanTier } from './models';
import type { Suggestion } from './engine/dayPlanner';
import { projectNextStep } from './models';
import { coreHabits } from './selectors';
import type { LifeSnapshot } from './snapshot';

export type DayGroup = 'core' | 'maintain' | 'joy';

/** The tier a plan item is shown under (routine chain steps have their own thread and are not grouped). */
export const dayGroupOf = (tier: PlanTier): DayGroup | null =>
  tier === 'core' ? 'core' : tier === 'maintain' || tier === 'system' ? 'maintain' : tier === 'joy' ? 'joy' : null;

/** Per-day caps from the engine: essentials by energy, maintenance fixed; joy has no cap. */
export const tierCaps = (energy: EnergyMode): { core: number; maintain: number } => ({
  core: energy === 'yellow' ? kMaxCoreYellow : energy === 'red' ? 1 : kMaxCore,
  maintain: kMaxMaintain,
});

export interface GroupCount {
  count: number;
  done: number;
}
export interface DaySummary {
  core: GroupCount;
  maintain: GroupCount;
  joy: GroupCount;
  total: number;
  done: number;
  /** 0…1 — done / total (0 when the day is empty). */
  progress: number;
  caps: { core: number; maintain: number };
  /** Accepted counts above the engine's caps (informational — nothing is ever removed). */
  overCap: { core: boolean; maintain: boolean };
}

/** Counts her accepted day by tier; `isSettled` = done or skipped (skipped still counts as handled, not as progress). */
export function daySummary(plan: Pick<DayPlan, 'items' | 'energy'>, isDone: (i: PlanItem) => boolean): DaySummary {
  const g: Record<DayGroup, GroupCount> = { core: { count: 0, done: 0 }, maintain: { count: 0, done: 0 }, joy: { count: 0, done: 0 } };
  let maintainTier = 0; // the engine's maintenance cap counts tier «maintain» only (the weekly review is a system item)
  for (const i of plan.items) {
    const k = dayGroupOf(i.tier);
    if (k == null) continue;
    g[k].count++;
    if (isDone(i)) g[k].done++;
    if (i.tier === 'maintain') maintainTier++;
  }
  const total = g.core.count + g.maintain.count + g.joy.count;
  const done = g.core.done + g.maintain.done + g.joy.done;
  const caps = tierCaps(plan.energy);
  return { ...g, total, done, progress: total === 0 ? 0 : done / total, caps, overCap: { core: g.core.count > caps.core, maintain: maintainTier > caps.maintain } };
}

export interface WeeklyMomentum {
  /** 0–100, engine EMA averaged over her active core habits. */
  value: number;
  /** No core habits yet → the ring is not shown at all. */
  hasHabits: boolean;
  /** At the resting floor: shown as «ترتاح», never as a low score. */
  resting: boolean;
}
export function weeklyMomentum(s: LifeSnapshot, today: Date): WeeklyMomentum {
  const habits = coreHabits(s);
  if (habits.length === 0) return { value: 0, hasHabits: false, resting: true };
  const value = averageMomentum({ habits, logs: s.logs, today });
  return { value, hasHabits: true, resting: isMomentumResting(value) };
}

export interface WeekAheadEntry {
  id: string;
  kind: 'project' | 'weekly';
  title: string;
  /** Day key the project is due (project entries only). */
  dueDate: string | null;
  minutes: number;
}

/**
 * The «هذا الأسبوع» strip: weekly tasks still open this week (engine `thisWeek`) and the next step
 * of active projects due within the next 7 days. Informational only — nothing is added to her day.
 */
export function weekAhead(s: LifeSnapshot, today: Date, thisWeek: readonly PlanItem[], max = 4): WeekAheadEntry[] {
  const from = dayKey(today);
  const to = dayKey(addDays(today, 7));
  const projects: WeekAheadEntry[] = [];
  for (const p of s.projects) {
    if (p.status !== 'active' || !p.dueDate || p.dueDate < from || p.dueDate > to) continue;
    const step = projectNextStep(p);
    if (step == null) continue;
    projects.push({ id: p.id, kind: 'project', title: step.titleAr || p.titleAr, dueDate: p.dueDate, minutes: step.durationMin });
  }
  projects.sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''));
  const weekly: WeekAheadEntry[] = thisWeek
    .filter((i) => i.tier !== 'chain')
    .map((i) => ({ id: i.id, kind: 'weekly' as const, title: i.title.ar, dueDate: null, minutes: i.estimatedMin }));
  return [...projects, ...weekly].slice(0, max);
}

/** Convenience for the UI: weekday name of a due-date key. */
export const dueDayDate = (key: string): Date => parseDayKey(key);

/** The calm day shows «ثلاث أشياء صغيرة» at most (design board TodayRed). */
export const kCalmMinimumCount = 3;
export const kCalmRestPreview = 4;

export interface CalmDay {
  /** Her accepted essentials/maintenance, first three (they are shown at the minimum level). */
  minimum: PlanItem[];
  /** Engine suggestions that fill the gap up to three — shown with «+ أضيفيه», never added by themselves. */
  fill: PlanItem[];
  /** What she accepted beyond three: stays visible, muted. */
  extra: PlanItem[];
  /** Suggested but not accepted — «يرتاح اليوم». */
  rest: PlanItem[];
  /** The day's free joy: accepted one, else today's suggested one. */
  joy: PlanItem | null;
}

/** Read-model for the calm (low-energy) day. Pure: it never changes her plan. */
export function calmDay(accepted: readonly PlanItem[], suggestions: readonly Suggestion[]): CalmDay {
  const rank = (i: PlanItem) => (i.tier === 'core' ? 0 : 1);
  const mine = accepted.filter((i) => i.tier === 'core' || i.tier === 'maintain' || i.tier === 'system').sort((a, b) => rank(a) - rank(b));
  const minimum = mine.slice(0, kCalmMinimumCount);
  const extra = mine.slice(kCalmMinimumCount);
  const have = new Set(accepted.map((i) => i.id));
  const pool = suggestions.filter((x) => (x.group === 'core' || x.group === 'maintain') && !have.has(x.item.id)).map((x) => x.item);
  const fill = pool.slice(0, Math.max(0, kCalmMinimumCount - minimum.length));
  const rest = pool.slice(fill.length);
  const joy = accepted.find((i) => i.tier === 'joy') ?? suggestions.find((x) => x.group === 'joy')?.item ?? null;
  return { minimum, fill, extra, rest, joy };
}
