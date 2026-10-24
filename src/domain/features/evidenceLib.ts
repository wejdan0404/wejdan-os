/**
 * Evidence library helpers: filter by strength, and the habit an evidence entry can become.
 * Pure. The strength values are the library's own `evidence_strength` field — nothing is added or scored here.
 */
import { dayKey, weekday } from '../core/dates';
import {
  actionPriority, actionSlot, actionText, actionTitle, actionType, anchor, makeHabit, schedule,
  type Action, type Habit,
} from '../models';
import { domainForAction } from '../seed/seedLibrary';

/** Strongest first. `key` is the value stored in the library; `ar` is what she reads. */
export const EVIDENCE_STRENGTHS = [
  { key: 'Guideline', ar: 'إرشادات' },
  { key: 'SR/MA', ar: 'مراجعة منهجية' },
  { key: 'RCT', ar: 'تجربة' },
  { key: 'Observational', ar: 'رصدية' },
  { key: 'Expert consensus', ar: 'رأي خبراء' },
] as const;
export type EvidenceStrengthKey = (typeof EVIDENCE_STRENGTHS)[number]['key'];

/** Arabic label of an action's evidence strength; null when the library has no known value. */
export function strengthLabel(a: Action): string | null {
  return EVIDENCE_STRENGTHS.find((s) => s.key === a.evidenceStrength)?.ar ?? null;
}

export function strengthCounts(actions: readonly Action[]): Record<EvidenceStrengthKey, number> {
  const out = Object.fromEntries(EVIDENCE_STRENGTHS.map((s) => [s.key, 0])) as Record<EvidenceStrengthKey, number>;
  for (const a of actions) if (a.evidenceStrength in out) out[a.evidenceStrength as EvidenceStrengthKey] += 1;
  return out;
}

/** `null` = all strengths. */
export function filterByStrength<T extends Action>(actions: readonly T[], key: EvidenceStrengthKey | null): T[] {
  return key == null ? [...actions] : actions.filter((a) => a.evidenceStrength === key);
}

/** Only entries the library marks as a habit can become one (routine steps live in routines). */
export const canBecomeHabit = (a: Action): boolean => actionType(a) === 'habit' && domainForAction(a) != null && domainForAction(a) !== 'aquarium';

/** Stable id so adding the same entry twice never duplicates. */
export const evidenceHabitId = (a: Action): string => `h_ev_${a.actionId.toLowerCase().replace(/[^a-z0-9]+/g, '')}`;

export const hasEvidenceHabit = (habits: readonly Habit[], a: Action): boolean =>
  habits.some((h) => h.id === evidenceHabitId(a) || h.actionId === a.actionId);

/** The habit for an evidence entry (null if it cannot become one). Uses the entry's own texts and sizes. */
export function habitFromAction(a: Action, today: Date, sortOrder = 90): Habit | null {
  if (!canBecomeHabit(a)) return null;
  const domain = domainForAction(a)!;
  const slot = actionSlot(a);
  const durationMin = a.timeMinutesNormal > 0 ? Math.min(a.timeMinutesNormal, 120) : 10;
  return makeHabit({
    id: evidenceHabitId(a),
    actionId: a.actionId,
    domain,
    titleAr: actionTitle(a, 'ar'),
    titleEn: a.nameEn,
    cue: actionText(a, 'cue', 'ar') ?? '',
    ifThen: actionText(a, 'ifThen', 'ar') ?? '',
    minimumText: actionText(a, 'minimum', 'ar') ?? '',
    normalText: actionText(a, 'normal', 'ar') ?? '',
    bonusText: actionText(a, 'bonus', 'ar') ?? '',
    joyPairing: actionText(a, 'joy', 'ar') ?? '',
    frictionDown: actionText(a, 'frictionDown', 'ar') ?? '',
    frictionUp: actionText(a, 'frictionUp', 'ar') ?? '',
    priority: actionPriority(a),
    schedule: a.scheduleSlot === 'weekly' ? schedule([weekday(today)], anchor({ type: 'slot', slot })) : schedule(undefined, anchor({ type: 'slot', slot })),
    durationMin,
    minimumDurationMin: Math.max(1, Math.min(5, durationMin)),
    durationEstimated: a.timeMinutesNormal <= 0,
    minimumDurationEstimated: true,
    createdDate: dayKey(today),
    sortOrder,
  });
}
