/** In-app reminders: the plan consumes her times; the banner list is computed from it. All data is named «test». */
import { describe, expect, it } from 'vitest';
import {
  InMemoryLifeRepository, createLifeStore, dayKey, dueRemindersFor, explicitReminders, habitReminderKey, habitsWithoutReminder,
  makeProduct, makeLog, mkDate, productStepId, reminderItems, reminderPlanFor, routineReminderKey, routineReminderRows,
  type Habit, type LifeSnapshot, type Settings,
} from '../../src/domain';
import { library, simpleHabit } from './helpers';

const DAY = mkDate(2026, 10, 7); // Wednesday
const at = (h: number, m = 0) => mkDate(2026, 10, 7, h, m);

async function snapshot(opts: { habits?: Habit[]; settings?: Partial<Settings>; products?: boolean; logs?: LifeSnapshot['logs'] } = {}): Promise<LifeSnapshot> {
  const store = await createLifeStore({ repo: new InMemoryLifeRepository(), now: () => at(9), library });
  const b = store.getSnapshot();
  const products = opts.products
    ? [
        makeProduct({ id: 'a1', name: 'test', category: 'cleanser', slot: 'am', order: 1 }),
        makeProduct({ id: 'a2', name: 'test', category: 'moisturizer', slot: 'am', order: 2 }),
        makeProduct({ id: 'p1', name: 'test', category: 'cleanser', slot: 'pm', order: 1 }),
      ]
    : [];
  return {
    ...b,
    products,
    habits: opts.habits ?? [],
    logs: opts.logs ?? [],
    settings: { ...b.settings, notificationsEnabled: true, ...opts.settings },
  };
}
const walk = (o: Partial<Habit> = {}) => ({ ...simpleHabit({ id: 'walk', created: '2026-09-01' }), titleAr: 'test', status: 'active' as const, ...o });

describe('reminder plan consumes her times', () => {
  it('is empty while the master switch is off, and has her anchored nudge when on', async () => {
    const key = habitReminderKey('walk');
    const on = await snapshot({ habits: [walk()], settings: { reminderTimes: { [key]: 16 * 60 + 30 } } });
    const nudges = reminderPlanFor(on, DAY).nudges.filter((n) => n.itemId === key);
    expect(nudges).toHaveLength(1);
    expect(nudges[0]!.minute).toBe(16 * 60 + 30);
    expect(nudges[0]!.kind).toBe('anchored');
    const off = await snapshot({ habits: [walk()], settings: { notificationsEnabled: false, reminderTimes: { [key]: 16 * 60 + 30 } } });
    expect(reminderPlanFor(off, DAY).nudges).toEqual([]);
  });

  it('only on days the habit runs', async () => {
    const key = habitReminderKey('walk');
    const s = await snapshot({ habits: [walk({ schedule: { ...walk().schedule, weekdays: [1, 2] } })], settings: { reminderTimes: { [key]: 600 } } }); // Mon/Tue only
    expect(reminderPlanFor(s, DAY).nudges.some((n) => n.itemId === key)).toBe(false); // Wednesday
    expect(reminderPlanFor(s, mkDate(2026, 10, 6)).nudges.some((n) => n.itemId === key)).toBe(true);
  });

  it('quiet hours wrap past midnight and skip silently; switching them off lifts it', async () => {
    const key = habitReminderKey('walk');
    const late = { reminderTimes: { [key]: 22 * 60 + 30 }, quietStartMinute: 22 * 60, quietEndMinute: 6 * 60 + 30, quietEndSetByUser: true };
    const s = await snapshot({ habits: [walk()], settings: late });
    const plan = reminderPlanFor(s, DAY);
    expect(plan.nudges.some((n) => n.itemId === key)).toBe(false);
    expect(plan.droppedForQuiet.some((n) => n.itemId === key)).toBe(true);
    const early = await snapshot({ habits: [walk()], settings: { ...late, reminderTimes: { [key]: 5 * 60 } } }); // 5:00 is inside 22:00–6:30
    expect(reminderPlanFor(early, DAY).nudges.some((n) => n.itemId === key)).toBe(false);
    const off = await snapshot({ habits: [walk()], settings: { ...late, quietHoursEnabled: false } });
    expect(reminderPlanFor(off, DAY).nudges.some((n) => n.itemId === key)).toBe(true);
  });

  it('what she set is never trimmed by the engine cap', async () => {
    const habits = Array.from({ length: 6 }, (_, i) => walk({ id: `h${i}` }));
    const times = Object.fromEntries(habits.map((h, i) => [habitReminderKey(h.id), 8 * 60 + i * 60]));
    const s = await snapshot({ habits, settings: { reminderTimes: times, notificationCap: 2 } });
    expect(reminderPlanFor(s, DAY).nudges.filter((n) => n.kind === 'anchored' && n.itemId?.startsWith('habit:'))).toHaveLength(6);
  });

  it('lists routines (only with her own products), habits with a time, and who has none yet', async () => {
    const s = await snapshot({ habits: [walk(), walk({ id: 'two', sortOrder: 2 })], products: true, settings: { reminderTimes: { [routineReminderKey('am')]: 420, [habitReminderKey('walk')]: 990 } } });
    expect(routineReminderRows(s).map((r) => [r.key, r.minute])).toEqual([['routine:am', 420], ['routine:pm', null]]);
    expect(reminderItems(s).map((r) => r.key)).toEqual(['routine:am', 'habit:walk']);
    expect(explicitReminders(s).map((r) => r.itemId)).toEqual(['routine:am', 'habit:walk']);
    expect(habitsWithoutReminder(s).map((h) => h.id)).toEqual(['two']);
    expect(routineReminderRows(await snapshot({ products: false })).length).toBe(0);
  });

  it('keeps the older «تذكير» switch on a fixed-time habit', async () => {
    const h = walk({ reminder: { enabled: true, offsetMin: 10, textAr: null, textEn: null }, schedule: { ...walk().schedule, anchor: { type: 'fixedTime', minute: 600, prayer: null, slot: 'anytime', offsetMin: 0 } } });
    const s = await snapshot({ habits: [h] });
    expect(reminderItems(s).map((r) => [r.key, r.minute])).toEqual([['habit:walk', 610]]);
  });
});

describe('due reminders (Today banner)', () => {
  const key = habitReminderKey('walk');
  const base = { habits: [walk()], settings: { reminderTimes: { [key]: 16 * 60 + 30 } } };

  it('not before the time, due after it, gone once done or skipped', async () => {
    const s = await snapshot(base);
    expect(dueRemindersFor(s, at(16, 29), DAY)).toEqual([]);
    const due = dueRemindersFor(s, at(16, 31), DAY);
    expect(due.map((d) => [d.key, d.kind, d.title, d.minute, d.stepsLeft])).toEqual([[key, 'habit', 'test', 990, null]]);
    expect(due[0]!.date).toBe(dayKey(DAY));
    const done = await snapshot({ ...base, logs: [makeLog({ id: 'l1', itemId: 'walk', kind: 'habit', date: dayKey(DAY), level: 'minimum' })] });
    expect(dueRemindersFor(done, at(17), DAY)).toEqual([]);
    const skipped = await snapshot({ ...base, logs: [makeLog({ id: 'l2', itemId: 'walk', kind: 'habit', date: dayKey(DAY), level: 'skipped' })] });
    expect(dueRemindersFor(skipped, at(17), DAY)).toEqual([]);
  });

  it('master off, quiet hours now, outside the 6h window and on non-planned days → nothing', async () => {
    expect(dueRemindersFor(await snapshot({ ...base, settings: { ...base.settings, notificationsEnabled: false } }), at(17), DAY)).toEqual([]);
    const quiet = await snapshot({ ...base, settings: { ...base.settings, quietStartMinute: 17 * 60, quietEndMinute: 6 * 60, quietEndSetByUser: true } });
    expect(dueRemindersFor(quiet, at(17, 30), DAY)).toEqual([]);
    expect(dueRemindersFor(await snapshot(base), at(23, 0), DAY)).toEqual([]); // 6h30 late
    const notToday = await snapshot({ habits: [walk({ schedule: { ...walk().schedule, weekdays: [1] } })], settings: base.settings });
    expect(dueRemindersFor(notToday, at(17), DAY)).toEqual([]);
  });

  it('a routine reports its open steps and clears when every step is done or skipped', async () => {
    const s = await snapshot({ products: true, settings: { reminderTimes: { [routineReminderKey('am')]: 7 * 60 } } });
    const due = dueRemindersFor(s, at(7, 5), DAY);
    expect(due.map((d) => [d.kind, d.itemId, d.stepsLeft])).toEqual([['routine', 'am', 2]]);
    const half = await snapshot({ products: true, settings: s.settings, logs: [makeLog({ id: 'a', itemId: productStepId('a1'), kind: 'routineStep', date: dayKey(DAY), level: 'normal' })] });
    expect(dueRemindersFor(half, at(8), DAY)[0]!.stepsLeft).toBe(1);
    const all = await snapshot({
      products: true,
      settings: s.settings,
      logs: [
        makeLog({ id: 'a', itemId: productStepId('a1'), kind: 'routineStep', date: dayKey(DAY), level: 'normal' }),
        makeLog({ id: 'b', itemId: productStepId('a2'), kind: 'routineStep', date: dayKey(DAY), level: 'skipped' }),
      ],
    });
    expect(dueRemindersFor(all, at(8), DAY)).toEqual([]);
  });

  it('after midnight but before 04:30 the previous logical day still counts as tonight', async () => {
    const s = await snapshot({ habits: [walk()], settings: { reminderTimes: { [key]: 23 * 60 + 50 }, quietHoursEnabled: false } });
    expect(dueRemindersFor(s, mkDate(2026, 10, 8, 0, 20), DAY).map((d) => d.key)).toEqual([key]);
  });
});
