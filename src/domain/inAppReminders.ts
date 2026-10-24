/**
 * In-app reminders: which routines/habits have a reminder time, and the plain data the planner and
 * the calendar export need. PURE — no notifications, no Notification API, no server. A reminder only
 * ever shows as a banner on Today while the app is open; phone alerts come from the .ics export.
 */
import { clamp, dayKey, mod } from './core/dates';
import { indexLogsByDay } from './engine/history';
import type { ExplicitReminder } from './engine/reminders';
import type { Habit, ProductSlot } from './models';
import { EVERY_DAY, isDoneLevel } from './models';
import { SAVING_REMINDER_KEY, SAVING_REMINDER_TITLE_AR, savingDayOf } from './money';
import { productStepId, productsIn } from './products';
import type { LifeSnapshot } from './snapshot';

export type ReminderKind = 'routine' | 'habit' | 'saving';
export type RoutineSlot = Extract<ProductSlot, 'am' | 'pm'>;
export const REMINDER_ROUTINE_SLOTS: readonly RoutineSlot[] = ['am', 'pm'];

export const routineReminderKey = (slot: RoutineSlot): string => `routine:${slot}`;
export const habitReminderKey = (habitId: string): string => `habit:${habitId}`;

/** A reminder older than this is not shown any more (a 7:00 banner at 9 pm is noise, not help). */
export const kReminderWindowMin = 6 * 60;

export const ROUTINE_TITLE_AR: Record<RoutineSlot, string> = { am: 'روتين الصبح', pm: 'روتين المسا' };
/** Sensible first time when she adds a reminder (minute of day). */
export const defaultReminderMinute = (s: LifeSnapshot, kind: ReminderKind, id: string): number => {
  if (kind === 'routine') return id === 'pm' ? mod(s.settings.sleepMinute - 90, 1440) : mod(s.settings.wakeMinute + 30, 1440);
  return 17 * 60;
};

export interface ReminderItem {
  key: string;
  kind: ReminderKind;
  /** `am` | `pm` for routines, the habit id for habits. */
  id: string;
  title: string;
  /** null = no reminder (a routine row she has not set yet). */
  minute: number | null;
  weekdays: number[];
  /** Minutes the item takes (calendar event length). */
  durationMin: number;
  /** Monthly item (the payday saving reminder): the day of month it falls on; weekdays then cover every day. */
  monthDay?: number | null;
}

const legacyHabitMinute = (h: Habit): number | null =>
  h.reminder.enabled && h.schedule.anchor.type === 'fixedTime' && h.schedule.anchor.minute != null
    ? clamp(h.schedule.anchor.minute + h.reminder.offsetMin, 0, 1439)
    : null;

/** Routines she can remind (those with her own products and not paused) — with or without a time. */
export function routineReminderRows(s: LifeSnapshot): ReminderItem[] {
  return REMINDER_ROUTINE_SLOTS.filter((slot) => !s.settings.pausedRoutineSlots.includes(slot) && productsIn(s.products, slot).length > 0).map(
    (slot) => ({
      key: routineReminderKey(slot),
      kind: 'routine' as const,
      id: slot,
      title: ROUTINE_TITLE_AR[slot],
      minute: s.settings.reminderTimes[routineReminderKey(slot)] ?? null,
      weekdays: [...EVERY_DAY],
      durationMin: Math.max(10, productsIn(s.products, slot).length * 3),
    }),
  );
}

/** Active habits that have a reminder time (hers, or the older «تذكير» switch on a fixed-time habit). */
export function habitReminderRows(s: LifeSnapshot): ReminderItem[] {
  return s.habits
    .filter((h) => h.status === 'active')
    .flatMap((h) => {
      const minute = s.settings.reminderTimes[habitReminderKey(h.id)] ?? legacyHabitMinute(h);
      return minute == null
        ? []
        : [{ key: habitReminderKey(h.id), kind: 'habit' as const, id: h.id, title: h.titleAr, minute, weekdays: [...h.schedule.weekdays], durationMin: h.durationMin }];
    })
    .sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0));
}

/** Active habits she has not given a reminder yet (the «أضيفي تذكير» picker). */
export function habitsWithoutReminder(s: LifeSnapshot): Habit[] {
  const have = new Set(habitReminderRows(s).map((r) => r.id));
  return s.habits.filter((h) => h.status === 'active' && !have.has(h.id)).sort((a, b) => a.sortOrder - b.sortOrder);
}

/** The payday saving reminder (Money → ادخار تلقائي): one monthly item while she has set a day. */
export function savingReminderRows(s: LifeSnapshot): ReminderItem[] {
  const day = savingDayOf(s.moduleState.autoSaveDay);
  return day == null
    ? []
    : [{ key: SAVING_REMINDER_KEY, kind: 'saving', id: 'autosave', title: SAVING_REMINDER_TITLE_AR, minute: s.moduleState.autoSaveMinute, weekdays: [...EVERY_DAY], durationMin: 15, monthDay: day }];
}

/** Every reminder that has a time, ready for the planner. */
export const reminderItems = (s: LifeSnapshot): ReminderItem[] =>
  [...routineReminderRows(s), ...habitReminderRows(s), ...savingReminderRows(s)].filter((r) => r.minute != null);

export function explicitReminders(s: LifeSnapshot): ExplicitReminder[] {
  return reminderItems(s).map((r) => ({
    itemId: r.key,
    minute: r.minute as number,
    title: { ar: r.title, en: r.title },
    weekdays: r.weekdays,
    monthDay: r.monthDay ?? null,
  }));
}

/** Routine steps she has neither done nor skipped on [date] (any log for the step counts as handled). */
export function routineStepsLeft(s: LifeSnapshot, slot: RoutineSlot, date: Date): number {
  const key = dayKey(date);
  const handled = new Set(s.logs.filter((l) => l.date === key).map((l) => l.itemId));
  return productsIn(s.products, slot).filter((p) => !handled.has(productStepId(p.id))).length;
}

/** True when [item] has nothing left to do on [date] (all done or skipped). */
export function reminderSatisfied(s: LifeSnapshot, item: Pick<ReminderItem, 'kind' | 'id'>, date: Date): boolean {
  if (item.kind === 'saving') return false;
  if (item.kind === 'routine') return routineStepsLeft(s, item.id as RoutineSlot, date) === 0;
  const key = dayKey(date);
  const l = indexLogsByDay(s.logs.filter((x) => x.date === key), item.id).get(key);
  return l != null && (isDoneLevel(l.level) || l.level === 'skipped');
}
