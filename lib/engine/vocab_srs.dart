/// Simple SM-2 style spaced-repetition scheduler for IELTS vocab (GROW-07).
///
/// Grades 0–5 (SM-2). The UI can map four buttons:
/// again = 1, hard = 3, good = 4, easy = 5 ([VocabGrade]).
///
/// * grade < 3 → lapse: repetitions reset, due tomorrow, ease −0.2.
/// * otherwise interval: 1st = 1 day, 2nd = 6 days, then round(prev × ease).
/// * ease' = ease + (0.1 − (5 − q)(0.08 + (5 − q)·0.02)), floor 1.3.
library;

import '../core/date_utils.dart';
import '../data/models/models.dart';

const double kMinEase = 1.3;
const double kStartEase = 2.5;

/// Four-button mapping.
enum VocabGrade {
  again(1),
  hard(3),
  good(4),
  easy(5);

  const VocabGrade(this.q);
  final int q;
}

/// New card due today.
VocabCard newVocabCard({
  required String id,
  required String front,
  required String back,
  String example = '',
  required DateTime today,
}) =>
    VocabCard(id: id, front: front, back: back, example: example, due: dayKey(today));

/// Applies a review with SM-2 grade [q] (0–5) on [today].
VocabCard reviewCard(VocabCard card, int q, DateTime today) {
  final grade = q.clamp(0, 5);
  var ease = card.ease + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
  if (ease < kMinEase) ease = kMinEase;
  if (grade < 3) {
    return card.copyWith(
      repetitions: 0,
      intervalDays: 1,
      ease: ease,
      lapses: card.lapses + 1,
      due: dayKey(addDays(today, 1)),
      lastReviewed: dayKey(today),
    );
  }
  final reps = card.repetitions + 1;
  final interval = switch (reps) {
    1 => 1,
    2 => 6,
    _ => (card.intervalDays * ease).round().clamp(1, 3650),
  };
  return card.copyWith(
    repetitions: reps,
    intervalDays: interval,
    ease: ease,
    due: dayKey(addDays(today, interval)),
    lastReviewed: dayKey(today),
  );
}

/// Cards due on or before [today], most overdue first (stable by id).
List<VocabCard> dueCards(List<VocabCard> cards, DateTime today) {
  final k = dayKey(today);
  final due = cards.where((c) => c.due.compareTo(k) <= 0).toList()
    ..sort((a, b) {
      final c = a.due.compareTo(b.due);
      return c != 0 ? c : a.id.compareTo(b.id);
    });
  return due;
}

/// Count of cards due on or before [today].
int dueCount(List<VocabCard> cards, DateTime today) => dueCards(cards, today).length;
