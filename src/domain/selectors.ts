/**
 * Pure derived read-models over a LifeSnapshot (port of `state/providers.dart`
 * plus the web-only suggestion / tasks / products / payday views).
 * Every selector is `(snapshot, today) => value` and has no side effects.
 */
import { addDays, cmpNum, cmpStr, dayKey, logicalDay, startOfWeek, tryParseIso } from './core/dates';
import type {
  DayPlan, EnergyMode, Experiment, Habit, InboxItem, LogEntry, PlanItem, Product, Routine, SparkTxn,
  TaskItem, VocabCard, WeeklyReviewRecord,
} from './models';
import { makeDayPlan, seasonIsCurrent, settingsBudgetFor } from './models';
import { AnchorResolver } from './engine/anchors';
import { checkCapacity, coreHabitsOf, type CapacityViolation } from './engine/capacityGuard';
import { kBufferFactor, dayLoad, planDay, sortPlanItems, suggestDay, type DayLoad, type PlannerInput, type Suggestion, type SuggestionSet } from './engine/dayPlanner';
import { budgetCycle, cycleKeyFor, upcomingDues, type BudgetCycle, type DueItem } from './engine/dues';
import { compareExperiment, type ExperimentResult } from './engine/experiments';
import { freshStartOn, type FreshStart } from './engine/freshStart';
import { computeStrength, isRestingHabit, type HabitStrength } from './engine/habitStrength';
import { indexLogsByDay } from './engine/history';
import { averageMomentum, forgivingStreak, habitMomentum, type ForgivingStreak } from './engine/momentum';
import { checkRecovery, type RecoveryTrigger } from './engine/recovery';
import { buildReminderPlan, type ReminderPlan } from './engine/reminders';
import { explicitReminders } from './inAppReminders';
import { earnedOn, sparkBalance } from './engine/sparks';
import { dueCards } from './engine/vocabSrs';
import { isStaleProductStep, productRoutines, productsIn, productStepId } from './products';
import type { LifeSnapshot } from './snapshot';

/** Stored routines + the AM/PM care routines generated from her products. */
export const allRoutines = (s: LifeSnapshot): Routine[] => [...s.routines, ...productRoutines(s.products, s.settings.pausedRoutineSlots)];

/** True when she paused the AM/PM product routine (it leaves the day, products stay). */
export const isRoutineSlotPaused = (s: LifeSnapshot, slot: 'am' | 'pm' | 'weekly'): boolean =>
  s.settings.pausedRoutineSlots.includes(slot);

/** Bill marked paid in the given budget cycle. */
export const isBillPaid = (bill: { paidCycles?: string[] }, cycleKey: string): boolean => (bill.paidCycles ?? []).includes(cycleKey);

/**
 * Keys under which the bill occurrence due on [due] counts as paid: the occurrence date
 * (`yyyy-MM-dd`, what new payments store — survives payday changes) plus the legacy cycle keys
 * (the cycle containing [due], and its calendar month for data saved with payday on the 1st).
 */
export const billPaidKeysFor = (s: LifeSnapshot, due: Date): string[] => {
  const keys = [dayKey(due), budgetCycleKeyFor(s, due), dayKey(due).slice(0, 7)];
  return keys.filter((k, i) => keys.indexOf(k) === i);
};

/** True when the bill occurrence due on [due] is marked paid (QA area4 #2, #10). */
export const isBillPaidOn = (s: LifeSnapshot, bill: { paidCycles?: string[] }, due: Date): boolean =>
  billPaidKeysFor(s, due).some((k) => (bill.paidCycles ?? []).includes(k));

/** Energy recorded for [date] (green when unanswered). */
export function energyOn(s: LifeSnapshot, date: Date): EnergyMode {
  const key = dayKey(date);
  return s.energyChecks.find((c) => c.date === key)?.mode ?? 'green';
}
export const energyAnswered = (s: LifeSnapshot, date: Date): boolean => s.energyChecks.some((c) => c.date === dayKey(date));

/**
 * habitId → day keys where she deliberately moved or declined it (the item sits in that day's
 * `deferred`: «بكرة», a picked date, «مو اليوم», back to the inbox). Those days are never misses.
 */
export function excusedDaysOf(s: LifeSnapshot): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const p of s.dayPlans) {
    for (const i of p.deferred) {
      if (i.kind !== 'habit') continue;
      let set = out.get(i.itemId);
      if (!set) out.set(i.itemId, (set = new Set()));
      set.add(p.date);
    }
  }
  return out;
}

export function plannerInputFor(s: LifeSnapshot, date: Date, energy: EnergyMode): PlannerInput {
  return {
    excusedDays: excusedDaysOf(s),
    date,
    energy,
    settings: s.settings,
    domains: s.domains,
    habits: s.habits,
    routines: allRoutines(s),
    weeklyTasks: s.weeklyTasks,
    projects: s.projects,
    joyItems: s.joyItems,
    logs: s.logs,
    vocabCards: s.vocabCards,
    fixedEvents: s.fixedEvents,
    mockTests: s.mockTests,
  };
}

/** Legacy auto plan for [date] (used when settings.planMode === 'auto'). */
export const autoPlanFor = (s: LifeSnapshot, date: Date): DayPlan => planDay(plannerInputFor(s, date, energyOn(s, date)));

/**
 * Engine suggestions for [date]. A «راحة» (rest) area stays quiet: its habits are not suggested
 * (QA area 3 #1 — the Path sheet promises exactly that). Adding a habit wakes its area to «صيانة»
 * (ui/lib/domains.ensureDomainsVisible), and anything she already accepted stays on her day.
 */
export const suggestionsFor = (s: LifeSnapshot, date: Date): SuggestionSet =>
  suggestDay(plannerInputFor(s, date, energyOn(s, date)));

/** Her accepted plan for [date] as stored (null = nothing accepted yet). */
/**
 * Her accepted plan for [date]. Items pointing at product steps that are no longer part of her
 * routine (unadopted placeholders, deleted/switched-off products) are left out, so an old accepted
 * «غسول» placeholder migrates away as soon as her own products exist; the next write persists it.
 */
/** «بعدين» without product steps that left her routine. */
const liveLater = (s: LifeSnapshot) => (s.later.some((i) => isStaleProductStep(i, s.products)) ? s.later.filter((i) => !isStaleProductStep(i, s.products)) : s.later);

export const acceptedPlanFor = (s: LifeSnapshot, date: Date): DayPlan | null => {
  const p = s.dayPlans.find((x) => x.date === dayKey(date)) ?? null;
  if (p == null) return null;
  const items = p.items.filter((i) => !isStaleProductStep(i, s.products));
  const deferred = p.deferred.filter((i) => !isStaleProductStep(i, s.products));
  return items.length === p.items.length && deferred.length === p.deferred.length ? p : { ...p, items, deferred };
};

export interface TodayView {
  date: string;
  mode: 'suggest' | 'auto';
  energy: EnergyMode;
  /** What is on her day (accepted items; in auto mode the legacy plan). */
  plan: DayPlan;
  /** Engine suggestions she has not accepted (nothing hidden; each with its reason). */
  suggestions: Suggestion[];
  /** Items she moved to «بعدين» (any day). */
  later: PlanItem[];
  /** Her tasks for today: planned for today, in progress, or overdue planned. */
  tasks: TaskItem[];
  /** Weekly tasks open this week but not due today. */
  thisWeek: PlanItem[];
  /** Gentle busy-day info — never moves anything. */
  load: DayLoad;
  showHelpLink: boolean;
  usableMin: number;
}

/** Item ids already settled (done or skipped) on [key] — they no longer count toward the day's load. */
function settledOn(s: LifeSnapshot, key: string): Set<string> {
  return new Set(s.logs.filter((l) => l.date === key).map((l) => l.itemId));
}

/** The Today screen read-model. */
export function todayView(s: LifeSnapshot, today: Date): TodayView {
  const set = suggestionsFor(s, today);
  const key = dayKey(today);
  const tasks = tasksForDay(s, today);
  if (s.settings.planMode === 'auto') {
    const plan = set.autoPlan;
    return {
      date: key, mode: 'auto', energy: plan.energy, plan, suggestions: [], later: liveLater(s), tasks,
      thisWeek: plan.thisWeek, load: dayLoad(plan, plan.usableMin, settledOn(s, key)), showHelpLink: plan.showHelpLink, usableMin: plan.usableMin,
    };
  }
  const stored = acceptedPlanFor(s, today);
  const byId = new Map(set.suggestions.map((x) => [x.item.id, x]));
  // Refresh accepted items from today's candidates (fresh time/why), keep HER level.
  const items = (stored?.items ?? []).map((i) => {
    const fresh = byId.get(i.id)?.item;
    return fresh ? { ...fresh, suggestedLevel: i.suggestedLevel, estimatedMin: i.estimatedMin } : i;
  });
  const accepted = new Set(items.map((i) => i.id));
  const laterIds = new Set(s.later.map((i) => i.id));
  const declined = new Set((stored?.deferred ?? []).map((i) => i.id));
  const plan = makeDayPlan({
    date: key,
    energy: set.energy,
    items: sortPlanItems(items),
    deferred: stored?.deferred ?? [],
    budgetMin: set.budgetMin,
    usableMin: set.usableMin,
    plannedMin: items.filter((i) => i.tier !== 'chain' && i.tier !== 'joy').reduce((a, i) => a + i.estimatedMin, 0),
    showHelpLink: set.showHelpLink,
  });
  return {
    date: key,
    mode: 'suggest',
    energy: set.energy,
    plan,
    suggestions: set.suggestions.filter((x) => !accepted.has(x.item.id) && !laterIds.has(x.item.id) && !declined.has(x.item.id)),
    later: liveLater(s),
    tasks,
    thisWeek: set.thisWeek,
    load: dayLoad(plan, set.usableMin, settledOn(s, key)),
    showHelpLink: set.showHelpLink,
    usableMin: set.usableMin,
  };
}

/** Best log per item for [date] — drives done-state of cards. */
export function logsOn(s: LifeSnapshot, date: Date): Map<string, LogEntry> {
  const key = dayKey(date);
  const logs = s.logs.filter((l) => l.date === key);
  const out = new Map<string, LogEntry>();
  for (const id of new Set(logs.map((l) => l.itemId))) out.set(id, indexLogsByDay(logs, id).get(key)!);
  return out;
}

// ---- tasks & inbox ----------------------------------------------------------

/** Tasks for [date]: planned for it (or overdue and still planned), plus in progress. */
/** Logical day key a task was completed on (null when not done / unknown). */
export function taskDoneDayKey(t: TaskItem): string | null {
  if (t.status !== 'done' || t.completedAt == null) return null;
  const at = tryParseIso(t.completedAt);
  return at == null ? null : dayKey(logicalDay(at));
}

/**
 * Her tasks for [date]: planned for that day (or overdue), in progress, and — so a finished task never
 * vanishes from Today — tasks she completed on that day (shown as done).
 */
export function tasksForDay(s: LifeSnapshot, date: Date): TaskItem[] {
  const key = dayKey(date);
  return s.tasks
    .filter(
      (t) =>
        t.status === 'in_progress' ||
        (t.status === 'planned' && t.dueDate != null && cmpStr(t.dueDate, key) <= 0) ||
        taskDoneDayKey(t) === key,
    )
    .sort((a, b) => cmpNum(a.time ?? 1440, b.time ?? 1440) || cmpNum(a.sortOrder, b.sortOrder) || cmpStr(a.createdAt, b.createdAt));
}
/** «بعدين»: postponed tasks (never disappear). */
export const postponedTasks = (s: LifeSnapshot): TaskItem[] =>
  s.tasks.filter((t) => t.status === 'postponed').sort((a, b) => cmpStr(a.postponedTo ?? '9999', b.postponedTo ?? '9999') || cmpStr(a.updatedAt, b.updatedAt));
export const tasksByStatus = (s: LifeSnapshot, status: TaskItem['status']): TaskItem[] => s.tasks.filter((t) => t.status === status);
export const tasksOfProject = (s: LifeSnapshot, projectId: string): TaskItem[] => s.tasks.filter((t) => t.projectId === projectId);
/** Unsorted inbox (not archived, not converted), newest first. */
export const openInbox = (s: LifeSnapshot): InboxItem[] =>
  s.inbox.filter((i) => !i.archived && i.convertedTo == null).sort((a, b) => cmpStr(b.createdAt, a.createdAt));
export const inboxCount = (s: LifeSnapshot): number => openInbox(s).length + tasksByStatus(s, 'inbox').length;

// ---- products ---------------------------------------------------------------

/** Today's «skipped» logs of [slot]'s product steps (what «رجّعيه» removes to restart the routine). */
export function skippedRoutineLogs(s: LifeSnapshot, today: Date, slot: 'am' | 'pm' | 'weekly'): LogEntry[] {
  const logs = logsOn(s, today);
  return productsIn(s.products, slot)
    .map((p) => logs.get(productStepId(p.id)))
    .filter((l): l is LogEntry => l?.level === 'skipped');
}

/**
 * True when she skipped her whole [slot] product routine today: it has steps, every one carries a
 * «skipped» log for [today] and none was done. Such a routine is finished-for-today (calm), not
 * untouched — Today stops offering it and the routine screen says so.
 */
export function routineSkippedToday(s: LifeSnapshot, today: Date, slot: 'am' | 'pm' | 'weekly'): boolean {
  const n = productsIn(s.products, slot).length;
  return n > 0 && skippedRoutineLogs(s, today, slot).length === n;
}

export const productsBySlot = (s: LifeSnapshot): Record<'am' | 'pm' | 'weekly', Product[]> => ({
  am: productsIn(s.products, 'am'),
  pm: productsIn(s.products, 'pm'),
  weekly: productsIn(s.products, 'weekly'),
});

// ---- money ------------------------------------------------------------------

export const currentBudgetCycle = (s: LifeSnapshot, today: Date): BudgetCycle =>
  budgetCycle(today, s.settings.paydayDay, s.settings.paydayHistory ?? []);

/** Budget-cycle key of the cycle containing [date] (e.g. the due date shown on a bill row). */
export const budgetCycleKeyFor = (s: LifeSnapshot, date: Date): string =>
  cycleKeyFor(date, s.settings.paydayDay, s.settings.paydayHistory ?? []);

/** Bills / instalments / renewals / auto-save / payday due within [horizonDays]. */
export const upcomingDuesFor = (s: LifeSnapshot, today: Date, horizonDays = 30): DueItem[] =>
  upcomingDues({
    today,
    bills: s.bills,
    bnpl: s.bnplItems,
    docs: s.adminDocs,
    autoSaveDay: s.moduleState.autoSaveDay,
    paydayDay: s.settings.paydayDay,
    horizonDays,
  });

/** Envelopes of the current budget cycle. */
export const envelopesThisCycle = (s: LifeSnapshot, today: Date) => s.moneyEnvelopes.filter((e) => e.month === currentBudgetCycle(s, today).key);

/** True when she already saved a month plan (any envelope) for the cycle containing [today]. */
export const hasMonthPlan = (s: LifeSnapshot, today: Date): boolean => envelopesThisCycle(s, today).length > 0;

/**
 * Payday, and the month isn't planned yet — the only time «رتّبي الشهر» is offered on payday.
 * Once a plan exists for this cycle the prompt is done for the rest of the day.
 */
export const needsMonthPlan = (s: LifeSnapshot, today: Date): boolean => currentBudgetCycle(s, today).isPayday && !hasMonthPlan(s, today);

// ---- sparks -----------------------------------------------------------------

export const sparksBalance = (s: LifeSnapshot): number => sparkBalance(s.sparkTxns);
export const sparksEarnedOn = (s: LifeSnapshot, date: Date): number => earnedOn(s.sparkTxns, dayKey(date));
export const sparkLedger = (s: LifeSnapshot): SparkTxn[] =>
  [...s.sparkTxns].sort((a, b) => cmpStr(b.at ?? '0000', a.at ?? '0000'));

// ---- strength / momentum ----------------------------------------------------

const habitById = (s: LifeSnapshot, id: string): Habit | null => s.habits.find((h) => h.id === id) ?? null;

export const coreHabits = (s: LifeSnapshot): Habit[] => coreHabitsOf(s.habits, s.domains);

export function habitStrengthOf(s: LifeSnapshot, habitId: string, today: Date): HabitStrength | null {
  const h = habitById(s, habitId);
  return h == null ? null : computeStrength({ habit: h, logs: s.logs, checks: s.strengthChecks, today });
}
/** Garden «ترتاح» state (Flutter parity): paused, Rest/disabled domain, or no done planned day in the last 7 days. */
export function habitRestingOf(s: LifeSnapshot, habitId: string, today: Date): boolean {
  const h = habitById(s, habitId);
  return h == null ? false : isRestingHabit({ habit: h, domains: s.domains, logs: s.logs, today });
}
export function momentumOf(s: LifeSnapshot, habitId: string, today: Date): number {
  const h = habitById(s, habitId);
  return h == null ? 0 : habitMomentum({ habit: h, logs: s.logs, today });
}
export const domainMomentum = (s: LifeSnapshot, domain: Habit['domain'], today: Date): number =>
  averageMomentum({ habits: s.habits.filter((h) => h.status === 'active' && h.domain === domain), logs: s.logs, today });
export function forgivingStreakOf(s: LifeSnapshot, habitId: string, today: Date): ForgivingStreak | null {
  const h = habitById(s, habitId);
  if (h == null || !s.settings.forgivingStreak) return null;
  // a paused/archived habit, or one in a «راحة»/disabled area, accrues no misses and shows no streak
  if (h.status !== 'active') return null;
  const dom = s.domains.find((d) => d.id === h.domain);
  if (dom != null && (!dom.enabled || dom.state === 'rest')) return null;
  return forgivingStreak({ habit: h, logs: s.logs, today, weekStartsOn: s.settings.weekStartsOn });
}

// ---- recovery, capacity, reminders, learning -----------------------------------

export const recoveryTriggers = (s: LifeSnapshot, today: Date): RecoveryTrigger[] =>
  checkRecovery({ coreHabits: coreHabits(s), logs: s.logs, openedDays: s.openedDays, today, firstRunDate: s.firstRunDate });
export const capacityViolations = (s: LifeSnapshot): CapacityViolation[] =>
  checkCapacity({ domains: s.domains, projects: s.projects, habits: s.habits });

/** Today's reminder plan (empty while reminders are off). Her own reminder times are included. */
export function reminderPlanFor(s: LifeSnapshot, date: Date): ReminderPlan {
  const v = todayView(s, date);
  return buildReminderPlan({
    plan: v.plan,
    settings: s.settings,
    habits: s.habits,
    nudgeHistory: s.nudgeRecords,
    logs: s.logs,
    fixedEvents: s.fixedEvents,
    // the payday saving reminder is an explicit timed reminder (explicitReminders), so skip the generic dues line
    dues: upcomingDuesFor(s, date, 0).filter((d) => d.kind !== 'autoSave'),
    explicit: explicitReminders(s),
  });
}

export const vocabDue = (s: LifeSnapshot, today: Date): VocabCard[] => dueCards(s.vocabCards, today);
export const activeExperiment = (s: LifeSnapshot): Experiment | null => s.experiments.find((e) => e.status === 'active') ?? null;
export function experimentResult(s: LifeSnapshot, experimentId: string, today: Date): ExperimentResult | null {
  const e = s.experiments.find((x) => x.id === experimentId);
  const h = e == null ? null : habitById(s, e.habitId);
  if (e == null || h == null) return null;
  return compareExperiment({ experiment: e, habit: h, logs: s.logs, today });
}

// ---- weekly review / fresh start ------------------------------------------------

export const weeklyReviews = (s: LifeSnapshot): WeeklyReviewRecord[] => s.weeklyReviews;
export function currentChapter(s: LifeSnapshot, today: Date): number {
  const week = dayKey(startOfWeek(today, s.settings.weekStartsOn));
  return s.weeklyReviews.filter((r) => r.id !== week).length + 1;
}
export function freshStartToday(s: LifeSnapshot, today: Date): FreshStart | null {
  if (s.moduleState.freshStartDismissed === dayKey(today)) return null;
  return freshStartOn(today, { weekStartsOn: s.settings.weekStartsOn, season: s.seasons.find(seasonIsCurrent) ?? null });
}

/** Clock time a cue anchor resolves to today (for UI labels). */
export const resolverFor = (s: LifeSnapshot): AnchorResolver => AnchorResolver.fromSettings(s.settings);

/** Usable minutes (budget × 0.7) for [date]. */
export const usableMinutes = (s: LifeSnapshot, date: Date): number => Math.floor(settingsBudgetFor(s.settings, date) * kBufferFactor);

/** Tomorrow (logical) helper. */
export const tomorrowOf = (today: Date): Date => addDays(today, 1);
