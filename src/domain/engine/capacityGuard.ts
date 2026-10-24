/**
 * Capacity & overload guard (spec §5.8, ENG-17, GROW-14) — port of `engine/capacity_guard.dart`.
 * Caps: 3 Grow domains, 5 Maintain, 2 active projects, 7 core habits, 1 active course.
 */
import type { Domain, Habit, Project } from '../models';

export const kMaxGrowDomains = 3;
export const kMaxMaintainDomains = 5;
export const kMaxActiveProjects = 2;
export const kMaxCoreHabits = 7;
export const kMaxActiveCourses = 1;

export type CapacityRule = 'growDomains' | 'maintainDomains' | 'activeProjects' | 'coreHabits' | 'activeCourses';

export interface CapacityViolation {
  rule: CapacityRule;
  count: number;
  max: number;
  ids: string[];
}
export const violationOver = (v: CapacityViolation): number => v.count - v.max;

/** Core habits = active habits whose domain is in Grow (and enabled). */
export function coreHabitsOf(habits: Habit[], domains: Domain[]): Habit[] {
  const grow = new Set(domains.filter((d) => d.state === 'grow' && d.enabled).map((d) => d.id));
  return habits.filter((h) => h.status === 'active' && grow.has(h.domain));
}

/** All current violations (empty = healthy). */
export function checkCapacity(o: { domains: Domain[]; projects: Project[]; habits: Habit[] }): CapacityViolation[] {
  const out: CapacityViolation[] = [];
  const add = (rule: CapacityRule, ids: string[], max: number) => {
    if (ids.length > max) out.push({ rule, count: ids.length, max, ids });
  };
  add('growDomains', o.domains.filter((d) => d.enabled && d.state === 'grow').map((d) => d.id), kMaxGrowDomains);
  add('maintainDomains', o.domains.filter((d) => d.enabled && d.state === 'maintain').map((d) => d.id), kMaxMaintainDomains);
  const active = o.projects.filter((p) => p.status === 'active');
  add('activeProjects', active.map((p) => p.id), kMaxActiveProjects);
  add('activeCourses', active.filter((p) => p.isCourse).map((p) => p.id), kMaxActiveCourses);
  add('coreHabits', coreHabitsOf(o.habits, o.domains).map((h) => h.id), kMaxCoreHabits);
  return out;
}

function upsert<T>(list: T[], item: T | null | undefined, same: (x: T) => boolean): T[] {
  if (item == null) return list;
  const copy = [...list];
  const i = copy.findIndex(same);
  if (i >= 0) copy[i] = item;
  else copy.push(item);
  return copy;
}

/** Violations that would NEWLY appear if the change were applied (non-empty → "swap or park"). */
export function violationsAfter(o: {
  domains: Domain[];
  projects: Project[];
  habits: Habit[];
  changedDomain?: Domain | null;
  changedProject?: Project | null;
  changedHabit?: Habit | null;
}): CapacityViolation[] {
  const before = new Set(checkCapacity(o).map((v) => v.rule));
  const after = checkCapacity({
    domains: upsert(o.domains, o.changedDomain, (d) => d.id === o.changedDomain!.id),
    projects: upsert(o.projects, o.changedProject, (p) => p.id === o.changedProject!.id),
    habits: upsert(o.habits, o.changedHabit, (h) => h.id === o.changedHabit!.id),
  });
  return after.filter((v) => !before.has(v.rule));
}
