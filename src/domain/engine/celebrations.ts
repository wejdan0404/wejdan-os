/**
 * «احتفالاتي» — a calm history of things worth remembering, derived from data she already has
 * (finished milestones, comebacks, closed chapters, finished experiments). No new storage.
 */
import { cmpStr, daysBetween, parseDayKey } from '../core/dates';
import type { Experiment, Goal, Habit, LogEntry, SparkTxn, WeeklyReviewRecord } from '../models';
import { logIsDone } from '../models';

export type CelebrationKind = 'milestone' | 'comeback' | 'chapter' | 'experiment';

export interface Celebration {
  id: string;
  kind: CelebrationKind;
  /** Her own words where she wrote them (milestone, habit, chapter title). */
  title: string;
  /** Second line context (goal name, chapter number…); may be empty. */
  context: string;
  /** Day key. */
  date: string;
  /** Sparks earned with it (comeback / experiment / review), when the ledger has it. */
  sparks: number;
  /** Comeback: days away before she returned (≥ 2 means a real gap). */
  gapDays: number | null;
  /** Experiment outcome. */
  outcome: 'kept' | 'reverted' | null;
}

export interface CelebrationSources {
  goals: Goal[];
  habits: Habit[];
  logs: LogEntry[];
  sparkTxns: SparkTxn[];
  weeklyReviews: WeeklyReviewRecord[];
  experiments: Experiment[];
}

export function celebrationsHistory(s: CelebrationSources): Celebration[] {
  const out: Celebration[] = [];

  for (const g of s.goals) {
    for (const m of g.milestones) {
      if (!m.done || !m.doneDate) continue;
      out.push({ id: `ms:${g.id}:${m.id}`, kind: 'milestone', title: m.titleAr, context: g.titleAr, date: m.doneDate, sparks: 0, gapDays: null, outcome: null });
    }
  }

  const logById = new Map(s.logs.map((l) => [l.id, l]));
  for (const t of s.sparkTxns) {
    if (t.reason !== 'comeback' || t.amount <= 0) continue;
    const log = t.refId ? logById.get(t.refId) : undefined;
    const habit = log ? s.habits.find((h) => h.id === log.itemId) : undefined;
    let gap: number | null = null;
    if (log) {
      const prev = s.logs
        .filter((l) => l.itemId === log.itemId && logIsDone(l) && cmpStr(l.date, log.date) < 0)
        .map((l) => l.date)
        .sort(cmpStr)
        .pop();
      if (prev) gap = daysBetween(parseDayKey(prev), parseDayKey(log.date)) - 1;
    }
    out.push({
      id: `cb:${t.id}`, kind: 'comeback', title: habit?.titleAr ?? '', context: '', date: log?.date ?? t.date,
      sparks: t.amount, gapDays: gap != null && gap >= 1 ? gap : null, outcome: null,
    });
  }

  const reviews = [...s.weeklyReviews].sort((a, b) => cmpStr(a.id, b.id));
  reviews.forEach((r, i) => {
    const sp = s.sparkTxns.find((t) => t.reason === 'weeklyReview' && t.date === r.date && t.amount > 0);
    out.push({ id: `ch:${r.id}`, kind: 'chapter', title: r.chapterTitle.trim(), context: `الفصل ${i + 1}`, date: r.date, sparks: sp?.amount ?? 0, gapDays: null, outcome: null });
  });

  for (const e of s.experiments) {
    if ((e.status !== 'kept' && e.status !== 'reverted') || !e.endDate) continue;
    const sp = s.sparkTxns.find((t) => t.reason === 'experiment' && t.refId === e.id && t.amount > 0);
    out.push({ id: `ex:${e.id}`, kind: 'experiment', title: e.titleAr, context: '', date: e.endDate, sparks: sp?.amount ?? 0, gapDays: null, outcome: e.status });
  }

  return out.sort((a, b) => cmpStr(b.date, a.date) || cmpStr(a.id, b.id));
}

/** Groups a newest-first list by month key `YYYY-MM`. */
export function groupByMonth<T extends { date: string }>(items: T[]): { month: string; items: T[] }[] {
  const out: { month: string; items: T[] }[] = [];
  for (const it of items) {
    const month = it.date.slice(0, 7);
    const last = out[out.length - 1];
    if (last && last.month === month) last.items.push(it);
    else out.push({ month, items: [it] });
  }
  return out;
}
