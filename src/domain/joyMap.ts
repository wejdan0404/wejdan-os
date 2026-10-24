/**
 * «خريطة متعتي»: her joys grouped by size, and reserved-joy bundles (a joy kept for one habit).
 * PURE helpers over JoyItem — a bundle is a JoyItem of kind `bundled` with a `bundledHabitId`, which the
 * day planner already offers next to that habit.
 */
import { cmpStr } from './core/dates';
import type { Habit, JoyItem, JoySize } from './models';
import type { LifeSnapshot } from './snapshot';

export const JOY_SIZE_ORDER: readonly JoySize[] = ['quick', 'medium', 'big'];
/** Few on purpose: a reserved joy stays special. */
export const MAX_JOY_BUNDLES = 3;

export type JoyMapGroups = Record<JoySize, JoyItem[]>;

/** Active joys that aren't earned rewards, grouped by size (title order). */
export function joyMapGroups(s: LifeSnapshot): JoyMapGroups {
  const out: JoyMapGroups = { quick: [], medium: [], big: [] };
  for (const j of s.joyItems) if (j.active && j.kind !== 'earned') out[j.size].push(j);
  for (const k of JOY_SIZE_ORDER) out[k].sort((a, b) => cmpStr(a.titleAr, b.titleAr) || cmpStr(a.id, b.id));
  return out;
}

export interface JoyBundle {
  joy: JoyItem;
  /** null when the habit was deleted or paused for good. */
  habit: Habit | null;
}

export function joyBundles(s: LifeSnapshot): JoyBundle[] {
  return s.joyItems
    .filter((j) => j.active && j.kind === 'bundled' && j.bundledHabitId != null)
    .map((joy) => ({ joy, habit: s.habits.find((h) => h.id === joy.bundledHabitId) ?? null }))
    .sort((a, b) => cmpStr(a.joy.id, b.joy.id));
}

export const canAddBundle = (s: LifeSnapshot): boolean => joyBundles(s).length < MAX_JOY_BUNDLES;

/** Active habits that don't have a reserved joy yet. */
export function habitsForBundle(s: LifeSnapshot): Habit[] {
  const taken = new Set(joyBundles(s).map((b) => b.joy.bundledHabitId));
  return s.habits.filter((h) => h.status === 'active' && !taken.has(h.id)).sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Free joys she can reserve: never the only free joy (today's «متعة اليوم» comes from the free ones). */
export function bundleCandidates(s: LifeSnapshot): JoyItem[] {
  const free = s.joyItems.filter((j) => j.active && j.kind === 'free');
  return free.length > 1 ? free.sort((a, b) => cmpStr(a.titleAr, b.titleAr)) : [];
}

export const bindBundle = (joy: JoyItem, habitId: string): JoyItem => ({ ...joy, kind: 'bundled', bundledHabitId: habitId, price: null });
export const unbindBundle = (joy: JoyItem): JoyItem => ({ ...joy, kind: 'free', bundledHabitId: null });

/** Joys that cost money — for the gentle budget hint on the map. */
export const joysThatCostMoney = (groups: JoyMapGroups): number => JOY_SIZE_ORDER.reduce((n, k) => n + groups[k].filter((j) => j.costsMoney).length, 0);
