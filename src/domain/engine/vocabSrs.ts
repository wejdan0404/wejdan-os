/**
 * SM-2 style spaced repetition for IELTS vocab (GROW-07) — port of `engine/vocab_srs.dart`.
 * Grades 0–5; four buttons: again = 1, hard = 3, good = 4, easy = 5.
 */
import { addDays, clamp, cmpStr, dayKey, dround } from '../core/dates';
import type { VocabCard } from '../models';

export const kMinEase = 1.3;
export const kStartEase = 2.5;

export const VocabGrade = { again: 1, hard: 3, good: 4, easy: 5 } as const;
export type VocabGradeName = keyof typeof VocabGrade;

/** New card due today. */
export function newVocabCard(o: { id: string; front: string; back: string; example?: string; today: Date }): VocabCard {
  return {
    id: o.id, front: o.front, back: o.back, example: o.example ?? '', ease: kStartEase, intervalDays: 0,
    repetitions: 0, due: dayKey(o.today), lapses: 0, lastReviewed: null,
  };
}

/** Applies a review with SM-2 grade [q] (0–5) on [today]. */
export function reviewCard(card: VocabCard, q: number, today: Date): VocabCard {
  const grade = clamp(q, 0, 5);
  let ease = card.ease + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
  if (ease < kMinEase) ease = kMinEase;
  if (grade < 3) {
    return {
      ...card, repetitions: 0, intervalDays: 1, ease, lapses: card.lapses + 1,
      due: dayKey(addDays(today, 1)), lastReviewed: dayKey(today),
    };
  }
  const reps = card.repetitions + 1;
  const interval = reps === 1 ? 1 : reps === 2 ? 6 : clamp(dround(card.intervalDays * ease), 1, 3650);
  return {
    ...card, repetitions: reps, intervalDays: interval, ease,
    due: dayKey(addDays(today, interval)), lastReviewed: dayKey(today),
  };
}

/** Cards due on or before [today], most overdue first (stable by id). */
export function dueCards(cards: VocabCard[], today: Date): VocabCard[] {
  const k = dayKey(today);
  return cards
    .filter((c) => cmpStr(c.due, k) <= 0)
    .sort((a, b) => cmpStr(a.due, b.due) || cmpStr(a.id, b.id));
}

export const dueCount = (cards: VocabCard[], today: Date): number => dueCards(cards, today).length;
