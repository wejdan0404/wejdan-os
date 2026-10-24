/** Flexible streak: engine edge cases, week dots, selector gating, and the settings default. */
import { describe, expect, it } from 'vitest';
import {
  SettingsJ, addDays, dayKey, defaultSettings, forgivingStreak, forgivingStreakOf, graceLeftThisWeek, kGraceDaysPerWeek, mkDate,
  weekStreakDays, type Habit, type LifeSnapshot, type LogEntry, type Settings,
} from '../../src/domain';
import { InMemoryLifeRepository, createLifeStore } from '../../src/domain';
import { logFor, library, simpleHabit } from './helpers';

// Sunday 2026-10-04 starts the week (Saudi default); Saturday 2026-10-10 ends it.
const sun = mkDate(2026, 10, 4);
const logsOn = (days: Date[]): LogEntry[] => days.map((d) => logFor('h', d));
const run = (from: Date, n: number): Date[] => Array.from({ length: n }, (_, i) => addDays(from, i));

describe('forgiving streak engine', () => {
  const h = simpleHabit({ created: dayKey(mkDate(2026, 9, 1)) });

  it('allowance is 2 compensation days per week', () => {
    expect(kGraceDaysPerWeek).toBe(2);
  });

  it('a missed day inside the allowance does not break it', () => {
    const today = mkDate(2026, 10, 7); // Wed; Sun done, Mon missed, Tue done
    const logs = logsOn([sun, addDays(sun, 2)]);
    const s = forgivingStreak({ habit: h, logs, today });
    expect(s.length).toBe(2 + 0); // two done days; the miss is covered, not counted as a day
    expect(s.graceUsedThisWeek).toBe(1);
    expect(graceLeftThisWeek(s)).toBe(1);
  });

  it('the third miss in a week breaks it calmly (back to 0, next done day starts again)', () => {
    const today = mkDate(2026, 10, 10); // Sat open
    const doneDays = [sun, addDays(sun, 5)]; // Mon–Thu missed (4), Fri done
    expect(forgivingStreak({ habit: h, logs: logsOn(doneDays), today }).length).toBe(1);
    const brokenToday = forgivingStreak({ habit: h, logs: logsOn([sun]), today: mkDate(2026, 10, 8) }); // Mon, Tue, Wed missed
    expect(brokenToday.length).toBe(0);
    expect(graceLeftThisWeek(brokenToday)).toBe(0);
  });

  it('week boundaries: the allowance resets on the owner’s week start', () => {
    // Sun–Thu done; misses Fri 9 + Sat 10 (week of the 4th) and Sun 11 + Mon 12 (week of the 11th): 2 + 2, never 3 in one week
    const today = mkDate(2026, 10, 13);
    const s = forgivingStreak({ habit: h, logs: logsOn(run(mkDate(2026, 10, 4), 5)), today });
    expect(s.length).toBe(5);
    expect(s.graceUsedThisWeek).toBe(2); // this week (from Sun 11): Sun 11, Mon 12
  });

  it('weekStartsOn moves the boundary', () => {
    // 4..10 done; Sun 11, Mon 12, Tue 13 missed; Wed 14 done; today Thu 15 open.
    // Sunday-start: 11, 12, 13 are the same week → the third breaks it, then Wed starts a new one (1).
    // Monday-start: Sun 11 belongs to the week of Mon 5, 12 + 13 to the week of Mon 12 → 2 + 1, all covered (7 + 1).
    const logs = logsOn([...run(mkDate(2026, 10, 4), 7), mkDate(2026, 10, 14)]);
    const base = { habit: h, logs, today: mkDate(2026, 10, 15) };
    expect(forgivingStreak({ ...base, weekStartsOn: 7 }).length).toBe(1);
    expect(forgivingStreak({ ...base, weekStartsOn: 1 }).length).toBe(8);
  });

  it('unplanned days neither add nor break', () => {
    const sunWed = simpleHabit({ id: 'h', weekdays: [7, 3], created: dayKey(mkDate(2026, 9, 1)) }); // Sun + Wed
    const today = mkDate(2026, 10, 8);
    const base = [sun, mkDate(2026, 10, 7)]; // Sun, Wed done
    const plain = forgivingStreak({ habit: sunWed, logs: logsOn(base), today });
    expect(plain.length).toBe(2);
    const bonus = forgivingStreak({ habit: sunWed, logs: logsOn([...base, mkDate(2026, 10, 5)]), today }); // done on an unplanned Monday
    expect(bonus.length).toBe(2);
    expect(bonus.graceUsedThisWeek).toBe(0); // unplanned Tue/Thu never counted as misses
  });

  it('a habit younger than a week has no phantom misses, and an open today is never a miss', () => {
    const young = simpleHabit({ created: dayKey(mkDate(2026, 10, 7)) }); // created Wed
    const today = mkDate(2026, 10, 8); // Thu, Wed done, Thu open
    const s = forgivingStreak({ habit: young, logs: logsOn([mkDate(2026, 10, 7)]), today });
    expect(s).toEqual({ length: 1, graceUsedThisWeek: 0, holdingOnCompensation: false });
    const none = forgivingStreak({ habit: young, logs: [], today });
    expect(none.length).toBe(0);
    expect(none.graceUsedThisWeek).toBe(1); // Wed (its first day) missed, covered; Thu open
  });

  it('holdingOnCompensation: yesterday was a covered miss and today is still open', () => {
    const today = mkDate(2026, 10, 7); // Wed
    expect(forgivingStreak({ habit: h, logs: logsOn([sun, addDays(sun, 1)]), today }).holdingOnCompensation).toBe(true); // Tue missed
    expect(forgivingStreak({ habit: h, logs: logsOn([sun, addDays(sun, 1), addDays(sun, 2)]), today }).holdingOnCompensation).toBe(false);
    expect(forgivingStreak({ habit: h, logs: logsOn([sun, addDays(sun, 1), today]), today }).holdingOnCompensation).toBe(false); // today done
  });

  it('skipped days are not done', () => {
    const logs = [logFor('h', sun), logFor('h', addDays(sun, 1), { level: 'skipped' })];
    expect(forgivingStreak({ habit: h, logs, today: mkDate(2026, 10, 6) }).length).toBe(1);
  });
});

describe('week dots', () => {
  const h = simpleHabit({ created: dayKey(mkDate(2026, 9, 1)) });
  const today = mkDate(2026, 10, 8); // Thu

  it('done / compensation / today / upcoming, Sunday first', () => {
    const logs = logsOn([sun, addDays(sun, 2)]); // Sun, Tue done; Mon missed; Wed missed
    const days = weekStreakDays({ habit: h, logs, today, streak: true });
    expect(days.map((d) => d.weekday)).toEqual([7, 1, 2, 3, 4, 5, 6]);
    expect(days.map((d) => d.state)).toEqual(['done', 'compensation', 'done', 'compensation', 'today', 'upcoming', 'upcoming']);
  });

  it('streak off: missed days are neutral rest, never compensation', () => {
    const days = weekStreakDays({ habit: h, logs: logsOn([sun]), today, streak: false });
    expect(days.map((d) => d.state)).toEqual(['done', 'rest', 'rest', 'rest', 'today', 'upcoming', 'upcoming']);
  });

  it('past a broken streak the old compensation days are not shown as held', () => {
    const days = weekStreakDays({ habit: h, logs: logsOn([sun]), today, streak: true });
    expect(days.filter((d) => d.state === 'compensation')).toEqual([]); // 3 misses → broken → rest
  });

  it('Monday week start rotates the row', () => {
    const days = weekStreakDays({ habit: h, logs: [], today, streak: false, weekStartsOn: 1 });
    expect(days.map((d) => d.weekday)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('a done today shows done, not today', () => {
    const days = weekStreakDays({ habit: h, logs: logsOn([today]), today, streak: true });
    expect(days[4]!.state).toBe('done');
  });
});

describe('selector + defaults', () => {
  const snap = async (settings: Partial<Settings>, habit: Habit, logs: LogEntry[]): Promise<LifeSnapshot> => {
    const store = await createLifeStore({ repo: new InMemoryLifeRepository(), now: () => mkDate(2026, 10, 8, 9), library });
    const base = store.getSnapshot();
    const domains = base.domains.map((d) => (d.id === habit.domain ? { ...d, enabled: true, state: 'grow' as const } : d));
    return { ...base, settings: { ...base.settings, ...settings }, habits: [habit], logs, domains };
  };

  it('uses the owner’s weekStartsOn and is null while the feature is off', async () => {
    const h = simpleHabit({ created: dayKey(mkDate(2026, 9, 1)) });
    const logs = logsOn(run(mkDate(2026, 10, 4), 4)); // 4..7 done
    const today = mkDate(2026, 10, 8);
    expect(forgivingStreakOf(await snap({ forgivingStreak: false }, h, logs), 'h', today)).toBeNull();
    expect(forgivingStreakOf(await snap({ forgivingStreak: true, weekStartsOn: 7 }, h, logs), 'h', today)!.length).toBe(4);
  });

  it('paused habits and habits in a rest area show no streak and accrue no misses', async () => {
    const h = simpleHabit({ created: dayKey(mkDate(2026, 9, 1)) });
    const logs = logsOn(run(mkDate(2026, 10, 4), 4));
    const today = mkDate(2026, 10, 8);
    expect(forgivingStreakOf(await snap({ forgivingStreak: true }, { ...h, status: 'paused' }, logs), 'h', today)).toBeNull();
    const s = await snap({ forgivingStreak: true }, { ...h, domain: 'health' }, logs);
    const rest = { ...s, domains: s.domains.map((d) => (d.id === 'health' ? { ...d, state: 'rest' as const } : d)) };
    expect(forgivingStreakOf(rest, 'h', today)).toBeNull();
    expect(forgivingStreakOf(s, 'h', today)!.length).toBe(4);
  });

  it('new installs default to ON; stored settings keep their stored value; older exports without the key stay off', () => {
    expect(defaultSettings().forgivingStreak).toBe(true);
    const stored = SettingsJ.toJson(defaultSettings({ forgivingStreak: false }));
    expect(SettingsJ.fromJson(stored).forgivingStreak).toBe(false); // she turned it off → stays off
    const on = SettingsJ.toJson(defaultSettings({ forgivingStreak: true }));
    expect(SettingsJ.fromJson(on).forgivingStreak).toBe(true);
    const legacy = { ...(SettingsJ.toJson(defaultSettings()) as Record<string, unknown>) };
    delete legacy['forgivingStreak'];
    expect(SettingsJ.fromJson(legacy as never).forgivingStreak).toBe(false); // an old file never had it
  });

  it('a fresh store (no saved settings) starts with the flexible streak on', async () => {
    const store = await createLifeStore({ repo: new InMemoryLifeRepository(), now: () => mkDate(2026, 10, 8, 9), library });
    expect(store.getSnapshot().settings.forgivingStreak).toBe(true);
  });
});
