/**
 * Money envelopes («ظروف الشهر») and the payday saving reminder. PURE.
 *
 * Per-category envelopes are ordinary MoneyEnvelope rows (no schema change) whose id carries `_cat_`:
 * `env_<cycleKey>_cat_<suffix>`. They SUB-DIVIDE the cycle's «مصروف الشهر» envelope (`…_spend`):
 * spending logged to a category also raises the spend envelope, so the month total and the older
 * payday semantics (cycle key, paydayHistory) stay exactly as they were. Whatever the categories
 * don't cover is «غير مصنّف».
 *
 * States are descriptive, never judging: there is no failure state and no red.
 */
import { clamp } from './core/dates';
import { nextMonthlyDate } from './engine/dues';
import type { MoneyEnvelope } from './models';
import { currentBudgetCycle } from './selectors';
import type { LifeSnapshot } from './snapshot';

export const CATEGORY_MARK = '_cat_';
export const isCategoryEnvelope = (e: Pick<MoneyEnvelope, 'id'>): boolean => e.id.includes(CATEGORY_MARK);
export const categoryEnvelopeId = (cycleKey: string, suffix: string): string => `env_${cycleKey}${CATEGORY_MARK}${suffix}`;
export const isSpendEnvelope = (e: Pick<MoneyEnvelope, 'id'>): boolean => !isCategoryEnvelope(e) && e.id.endsWith('_spend');

/** Quick-start names — only suggestions; she types her own. */
export const CATEGORY_SUGGESTIONS_AR: readonly string[] = ['أكل وقهوة', 'مواصلات', 'تسوق', 'ترفيه', 'صحة وعناية', 'هدايا'];

export const MAX_CATEGORIES = 12;

export const categoriesThisCycle = (s: LifeSnapshot, today: Date): MoneyEnvelope[] =>
  s.moneyEnvelopes
    .filter((e) => e.month === currentBudgetCycle(s, today).key && isCategoryEnvelope(e))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

export type EnvelopeTone = 'noPlan' | 'roomy' | 'close' | 'full' | 'over';
export interface EnvelopeState {
  tone: EnvelopeTone;
  /** 0–1, for the bar. */
  ratio: number;
  remaining: number;
  /** > 0 only when over. */
  overBy: number;
}

/** Descriptive state of one envelope: «roomy» below 80 %, «close» from 80 %, «full» at the plan, «over» above. */
export function envelopeState(e: Pick<MoneyEnvelope, 'planned' | 'spent'>): EnvelopeState {
  if (!(e.planned > 0)) return { tone: 'noPlan', ratio: 0, remaining: 0, overBy: 0 };
  const ratio = clamp(e.spent / e.planned, 0, 1);
  const overBy = Math.max(0, e.spent - e.planned);
  const tone: EnvelopeTone = overBy > 0 ? 'over' : e.spent === e.planned ? 'full' : e.spent / e.planned >= 0.8 ? 'close' : 'roomy';
  return { tone, ratio, remaining: Math.max(0, e.planned - e.spent), overBy };
}

export interface SpendBreakdown {
  /** The «مصروف الشهر» plan / spend (null planned = no spend envelope yet). */
  planned: number;
  spent: number;
  /** Sum of the categories' plans / spend. */
  allocated: number;
  categorized: number;
  /** Plan left unassigned to a category (negative = categories add up to more than the plan). */
  unallocated: number;
  /** Spent outside any category. */
  uncategorized: number;
}

export function spendBreakdown(envs: readonly MoneyEnvelope[]): SpendBreakdown {
  const spend = envs.find(isSpendEnvelope);
  const cats = envs.filter(isCategoryEnvelope);
  const allocated = cats.reduce((a, e) => a + e.planned, 0);
  const categorized = cats.reduce((a, e) => a + e.spent, 0);
  const planned = spend?.planned ?? 0;
  const spent = spend?.spent ?? categorized;
  return { planned, spent, allocated, categorized, unallocated: planned - allocated, uncategorized: Math.max(0, spent - categorized) };
}

/**
 * Writes needed to log [amount] against [target]: a category also raises the spend envelope so the
 * month total stays whole. `before` restores both (undo).
 */
export function applySpend(envs: readonly MoneyEnvelope[], target: MoneyEnvelope, amount: number): { next: MoneyEnvelope[]; before: MoneyEnvelope[] } {
  const next: MoneyEnvelope[] = [{ ...target, spent: target.spent + amount }];
  const before: MoneyEnvelope[] = [target];
  if (isCategoryEnvelope(target)) {
    const spend = envs.find((e) => isSpendEnvelope(e) && e.month === target.month);
    if (spend) {
      next.push({ ...spend, spent: spend.spent + amount });
      before.push(spend);
    }
  }
  return { next, before };
}

/** Categories of the latest earlier cycle — offered once at the start of a new month. */
export function previousCategories(s: LifeSnapshot, today: Date): MoneyEnvelope[] {
  const key = currentBudgetCycle(s, today).key;
  const earlier = s.moneyEnvelopes.filter((e) => isCategoryEnvelope(e) && e.month < key);
  if (earlier.length === 0) return [];
  const last = earlier.reduce((m, e) => (e.month > m ? e.month : m), '');
  return earlier.filter((e) => e.month === last).sort((a, b) => (a.id < b.id ? -1 : 1));
}

// ---- payday saving reminder --------------------------------------------------------------------

export const SAVING_REMINDER_KEY = 'money:autosave';
export const SAVING_REMINDER_TITLE_AR = 'تحويل الادخار';
/** Day-of-month choices stop at 28 so the reminder lands every month. */
export const SAVING_MAX_DAY = 28;

export const savingDayOf = (autoSaveDay: number | null): number | null => (autoSaveDay == null ? null : clamp(Math.trunc(autoSaveDay), 1, SAVING_MAX_DAY));
/** First suggestion: her payday (the saving transfer is set up on the day the salary lands). */
export const defaultSavingDay = (s: LifeSnapshot): number => clamp(s.settings.paydayDay, 1, SAVING_MAX_DAY);

export interface SavingReminderInfo {
  enabled: boolean;
  day: number;
  minute: number;
  next: Date | null;
}
export function savingReminderInfo(s: LifeSnapshot, today: Date): SavingReminderInfo {
  const day = savingDayOf(s.moduleState.autoSaveDay);
  return {
    enabled: day != null,
    day: day ?? defaultSavingDay(s),
    minute: s.moduleState.autoSaveMinute,
    next: day == null ? null : nextMonthlyDate(today, day),
  };
}
