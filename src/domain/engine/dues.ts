/**
 * Upcoming money & admin due dates — port of `engine/dues.dart`, plus the
 * web-only payday cycle (salary on `paydayDay`, default the 1st: the budget
 * month starts on payday and a `payday` due item appears on that day).
 */
import { addDays, clamp, cmpNum, dateOnly, dayKey, daysBetween, mkDate, parseDayKey } from '../core/dates';
import type { AdminDoc, Bill, BnplItem, WishItem } from '../models';
import { bnplNextDue } from '../models';

export type DueKind = 'bill' | 'subscription' | 'bnpl' | 'document' | 'autoSave' | 'payday';

export interface DueItem {
  kind: DueKind;
  refId: string;
  title: string;
  date: Date;
  amount: number | null;
}
/** Days from [today] (0 = today, negative = overdue). */
export const dueDaysFrom = (d: DueItem, today: Date): number => daysBetween(dateOnly(today), d.date);

/** Last day of the Dart month (1-based) [m] of year [y]. */
const lastDayOf = (y: number, m: number): number => mkDate(y, m + 1, 0).getDate();

/** Next occurrence (today or later) of [dayOfMonth], clamped to month length. */
export function nextMonthlyDate(today: Date, dayOfMonth: number): Date {
  const t = dateOnly(today);
  const inMonth = (y: number, m: number): Date => {
    // Normalise month overflow first (Dart DateTime(y, 13, …) rolls the year).
    const first = mkDate(y, m, 1);
    const yy = first.getFullYear();
    const mm = first.getMonth() + 1;
    return mkDate(yy, mm, clamp(dayOfMonth, 1, lastDayOf(yy, mm)));
  };
  const thisMonth = inMonth(t.getFullYear(), t.getMonth() + 1);
  return thisMonth.getTime() < t.getTime() ? inMonth(t.getFullYear(), t.getMonth() + 2) : thisMonth;
}

/** Everything due within [horizonDays]. Sorted by date. */
export function upcomingDues(o: {
  today: Date;
  bills?: Bill[];
  bnpl?: BnplItem[];
  docs?: AdminDoc[];
  autoSaveDay?: number | null;
  /** Web-only: salary day of month; null/undefined = no payday item. */
  paydayDay?: number | null;
  horizonDays?: number;
}): DueItem[] {
  const t = dateOnly(o.today);
  const end = addDays(t, o.horizonDays ?? 30);
  const out: DueItem[] = [];
  for (const b of (o.bills ?? []).filter((x) => x.active)) {
    const d = nextMonthlyDate(t, b.dueDay);
    if (d.getTime() <= end.getTime()) {
      out.push({ kind: b.isSubscription ? 'subscription' : 'bill', refId: b.id, title: b.title, date: d, amount: b.amount });
    }
  }
  for (const p of o.bnpl ?? []) {
    const n = bnplNextDue(p);
    if (n == null) continue;
    const d = parseDayKey(n);
    if (d.getTime() <= end.getTime()) out.push({ kind: 'bnpl', refId: p.id, title: p.title, date: d, amount: p.instalmentAmount });
  }
  for (const doc of o.docs ?? []) {
    if (doc.expiry == null) continue;
    const exp = parseDayKey(doc.expiry);
    const remindFrom = addDays(exp, -doc.remindDaysBefore);
    if (t.getTime() >= remindFrom.getTime() && exp.getTime() >= t.getTime()) {
      out.push({ kind: 'document', refId: doc.id, title: doc.name, date: exp, amount: null });
    }
  }
  if (o.autoSaveDay != null) {
    const d = nextMonthlyDate(t, o.autoSaveDay);
    if (d.getTime() <= end.getTime()) out.push({ kind: 'autoSave', refId: 'auto_save', title: '', date: d, amount: null });
  }
  if (o.paydayDay != null) {
    const d = nextMonthlyDate(t, o.paydayDay);
    if (d.getTime() <= end.getTime()) out.push({ kind: 'payday', refId: 'payday', title: '', date: d, amount: null });
  }
  return out.sort((a, b) => cmpNum(a.date.getTime(), b.date.getTime()));
}

/** Wishlist cooling-off: days left before she decides (0 = ready). */
export function coolingDaysLeft(w: WishItem, today: Date): number {
  const ready = addDays(parseDayKey(w.addedDate), w.coolingOffDays);
  const left = daysBetween(dateOnly(today), ready);
  return left < 0 ? 0 : left;
}

/** Expanding practice gaps (days) for spaced theory rounds. */
export const kSpacedGaps: readonly number[] = [1, 2, 4, 7, 14];

/** Next spaced-practice day after the rounds done on [roundDates]. */
export function nextSpacedPractice(roundDates: string[], today: Date): Date {
  if (roundDates.length === 0) return dateOnly(today);
  const sorted = [...roundDates].sort();
  const gap = kSpacedGaps[clamp(sorted.length - 1, 0, kSpacedGaps.length - 1)]!;
  const next = addDays(parseDayKey(sorted[sorted.length - 1]!), gap);
  return next.getTime() < dateOnly(today).getTime() ? dateOnly(today) : next;
}

// ---- payday / budget cycle (web-only) -------------------------------------

/** An earlier payday rule: [day] applied to every date before [until] (`yyyy-MM-dd`, exclusive). */
export interface PaydayRuleLike {
  until: string;
  day: number;
}

export interface BudgetCycle {
  /** First day of the cycle (the payday on or before today). */
  start: Date;
  /** Last day of the cycle (the day before the next payday). */
  end: Date;
  /**
   * Key MoneyEnvelope.month and Bill.paidCycles use: `yyyy-MM` of [start] — or the full
   * `yyyy-MM-dd` when an earlier cycle (after a payday change) already started in that month,
   * so two cycles never share a key.
   */
  key: string;
  /** Next payday. */
  nextPayday: Date;
  /** Whole days until the next payday (0 = today is payday). */
  daysToPayday: number;
  /** True when today is payday. */
  isPayday: boolean;
  /** Payday day-of-month that governs the next payday. */
  paydayDay: number;
  /** `yyyy-MM-dd` when she changed the payday inside this cycle (the cycle keeps its start), else null. */
  paydayChangedOn: string | null;
}

/** Payday rule (day of month) in force on [d]. */
function ruleAt(d: Date, paydayDay: number, history: readonly PaydayRuleLike[]): number {
  const k = dayKey(d);
  for (const h of history) if (k < h.until) return h.day;
  return paydayDay;
}

/** True when [d] is a payday under the rule in force that day (clamped to month length). */
function isPaydayDate(d: Date, paydayDay: number, history: readonly PaydayRuleLike[]): boolean {
  const rule = ruleAt(d, paydayDay, history);
  return d.getDate() === clamp(rule, 1, lastDayOf(d.getFullYear(), d.getMonth() + 1));
}

const kScanDays = 800;

function paydayOnOrBefore(t: Date, paydayDay: number, history: readonly PaydayRuleLike[]): Date {
  let d = t;
  for (let i = 0; i < kScanDays; i++) {
    if (isPaydayDate(d, paydayDay, history)) return d;
    d = addDays(d, -1);
  }
  return t;
}

function paydayAfter(t: Date, paydayDay: number, history: readonly PaydayRuleLike[]): Date {
  let d = addDays(t, 1);
  for (let i = 0; i < kScanDays; i++) {
    if (isPaydayDate(d, paydayDay, history)) return d;
    d = addDays(d, 1);
  }
  return addDays(t, 1);
}

/**
 * The budget month containing [today] when the salary arrives on [paydayDay]
 * (default 1 → identical to the calendar month). [history] holds earlier rules, so a payday
 * change never moves the start of the cycle in progress: that cycle simply runs until the
 * first payday under the new rule, and its data stays attributed to it.
 */
export function budgetCycle(today: Date, paydayDay = 1, history: readonly PaydayRuleLike[] = []): BudgetCycle {
  const t = dateOnly(today);
  const hist = [...history].sort((a, b) => (a.until < b.until ? -1 : a.until > b.until ? 1 : 0));
  const start = paydayOnOrBefore(t, paydayDay, hist);
  const next = paydayAfter(start, paydayDay, hist);
  const prev = paydayOnOrBefore(addDays(start, -1), paydayDay, hist);
  const month = dayKey(start).slice(0, 7);
  const key = dayKey(prev).slice(0, 7) === month && prev.getTime() !== start.getTime() ? dayKey(start) : month;
  const isPayday = t.getTime() === start.getTime();
  const nextPay = isPayday ? t : next;
  const startKey = dayKey(start);
  const todayKey = dayKey(t);
  // A change counts only when it moved the effective payday: 1 → 27 → 1 on one day leaves an
  // entry whose old rule equals the one now in force — nothing changed, so nothing to announce.
  const change =
    [...hist]
      .map((h, i) => ({ h, now: hist[i + 1]?.day ?? paydayDay }))
      .reverse()
      .find(({ h, now }) => h.until > startKey && h.until <= todayKey && now !== h.day)?.h ?? null;
  return {
    start,
    end: addDays(next, -1),
    key,
    nextPayday: nextPay,
    daysToPayday: daysBetween(t, nextPay),
    isPayday,
    paydayDay: ruleAt(next, paydayDay, hist),
    paydayChangedOn: change ? change.until : null,
  };
}

/** Key of the cycle that contains [date] (for paying a bill whose due date is shown). */
export const cycleKeyFor = (date: Date, paydayDay = 1, history: readonly PaydayRuleLike[] = []): string =>
  budgetCycle(date, paydayDay, history).key;
