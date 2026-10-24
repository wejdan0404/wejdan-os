/** Which in-app reminders are due right now (the Today banner). PURE: [now] is passed in. */
import { dayKey, inWindow } from './core/dates';
import { effectiveQuietEndMinute } from './models';
import { isPlannedOn } from './models';
import {
  kReminderWindowMin,
  reminderItems,
  reminderSatisfied,
  routineStepsLeft,
  type ReminderKind,
  type RoutineSlot,
} from './inAppReminders';
import { reminderPlanFor } from './selectors';
import type { LifeSnapshot } from './snapshot';

export interface DueReminder {
  /** Stable per day + item (the planner's nudge id) — what dismiss/snooze remember. */
  id: number;
  date: string;
  key: string;
  kind: ReminderKind;
  /** `am` | `pm` or the habit id. */
  itemId: string;
  title: string;
  minute: number;
  /** Routine steps still open (null for a habit). */
  stepsLeft: number | null;
}

/** Minute of the logical day: after midnight but before the 04:30 flip still belongs to «tonight». */
export const logicalMinuteOf = (now: Date): number => {
  const m = now.getHours() * 60 + now.getMinutes();
  return m < 4 * 60 + 30 ? m + 24 * 60 : m;
};

/**
 * Reminders whose time has passed (within [kReminderWindowMin]) and whose item is not done, for the
 * logical day [today]. Empty while the master switch is off, inside quiet hours (now, and the
 * reminder's own time), or for a routine/habit that is not planned today. Computed from the same
 * reminder plan the engine builds (reminderPlanFor), so quiet hours and focus blocks apply once.
 * Oldest first.
 */
export function dueRemindersFor(s: LifeSnapshot, now: Date, today: Date): DueReminder[] {
  if (!s.settings.notificationsEnabled) return [];
  const rawNow = now.getHours() * 60 + now.getMinutes();
  if (s.settings.quietHoursEnabled && inWindow(rawNow, s.settings.quietStartMinute, effectiveQuietEndMinute(s.settings))) return [];
  const nowL = logicalMinuteOf(now);
  const items = new Map(reminderItems(s).map((r) => [r.key, r]));
  const plan = reminderPlanFor(s, today);
  const out: DueReminder[] = [];
  for (const n of plan.nudges) {
    if (n.kind !== 'anchored' || n.itemId == null) continue;
    const item = items.get(n.itemId);
    if (item == null || n.minute > nowL || nowL - n.minute > kReminderWindowMin) continue;
    if (item.kind === 'habit') {
      const h = s.habits.find((x) => x.id === item.id);
      if (h == null || !isPlannedOn(h.schedule, today)) continue;
    }
    if (reminderSatisfied(s, item, today)) continue;
    out.push({
      id: n.id,
      date: dayKey(today),
      key: item.key,
      kind: item.kind,
      itemId: item.id,
      title: item.title,
      minute: n.minute,
      stepsLeft: item.kind === 'routine' ? routineStepsLeft(s, item.id as RoutineSlot, today) : null,
    });
  }
  return out.sort((a, b) => a.minute - b.minute || a.id - b.id);
}
