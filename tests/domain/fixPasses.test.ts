/** Port of test/engine/fix_pass1_test.dart + fix_pass3_test.dart (copy updated to the audited Saudi strings). */
import { describe, expect, it } from 'vitest';
import {
  type Bill, type DayPlan, type Habit, type Settings, ACTION_FIELDS, APP_LANGUAGES, HabitJ, actionText, addDays,
  buildReminderPlan, dayKey, defaultSettings, effectiveQuietEnd, effectiveQuietEndMinute, habitMomentum, isMomentumResting,
  itemsOfTier, kActionRefPattern, kDuesAfterWakeMin, kMaxCore, kMaxMaintain, kMomentumRestFloor, momentumFromOutcomes,
  nudgeActionable, planDay, requireAction, settingsWithQuietEnd, settingsWithWake, SettingsJ, statedMinutesIn, upcomingDues,
} from '../../src/domain';
import { P } from './fixtures/personaProfile';
import { inputFor, library, logFor, mon, profileOn, sun } from './helpers';

const find = (p: DayPlan, id: string) => p.items.find((i) => i.itemId === id);
const coreTest = (like: Habit, id: string, sortOrder = -1): Habit =>
  HabitJ.fromJson({ ...HabitJ.toJson(like), id, titleAr: 'test', titleEn: 'test', sortOrder, alternationGroup: null });
const bill = (id: string, dueDay: number, isSubscription = false): Bill => ({ id, title: 'test', amount: 1, dueDay, isSubscription, active: true });

describe('D03 done items stay on Today', () => {
  it('done items are pinned first; new items only fill the remaining capacity', () => {
    const p = profileOn(addDays(mon, -30));
    const walk = p.habits.find((h) => h.id === P.walk)!;
    const extra = [0, 1, 2].map((i) => coreTest(walk, `test_${i}`, -10 + i));
    const plan = planDay(inputFor(mon, { profile: p, logs: [logFor(P.walk, mon), logFor(P.vocab, mon)], habits: [...p.habits, ...extra] }));
    const core = itemsOfTier(plan, 'core').map((i) => i.itemId);
    expect(core).toEqual(expect.arrayContaining([P.walk, P.vocab]));
    expect(core.length).toBe(kMaxCore);
    expect(core.filter((id) => id.startsWith('test_')).length).toBe(1);
  });

  it('pinned items exceeding the cap all stay visible; nothing new is added', () => {
    const p = profileOn(addDays(mon, -30));
    const walk = p.habits.find((h) => h.id === P.walk)!;
    const extra = [0, 1, 2].map((i) => coreTest(walk, `test_${i}`, -10 + i));
    const logs = [P.walk, P.vocab, P.focus, 'test_2'].map((id) => logFor(id, mon));
    const plan = planDay(inputFor(mon, { profile: p, logs, habits: [...p.habits, ...extra] }));
    expect(new Set(itemsOfTier(plan, 'core').map((i) => i.itemId))).toEqual(new Set([P.walk, P.vocab, P.focus, 'test_2']));
  });

  it('a done item survives switching to Red', () => {
    const p = profileOn(addDays(mon, -30));
    expect(find(planDay(inputFor(mon, { profile: p, energy: 'red', logs: [logFor(P.walk, mon)] })), P.walk)).toBeDefined();
  });
});

describe('D08 Green day has maintenance', () => {
  it('starter Green day: 2 maintain items (room reset + spend log)', () => {
    expect(new Set(itemsOfTier(planDay(inputFor(mon)), 'maintain').map((i) => i.itemId))).toEqual(new Set([P.roomReset, P.moneyLog]));
  });
  it('a weekly maintenance task due today outranks a daily maintenance habit', () => {
    const m = itemsOfTier(planDay(inputFor(sun)), 'maintain').map((i) => i.itemId);
    expect(m).toContain(P.admin);
    expect(m.length).toBe(kMaxMaintain);
  });
});

describe('D09 momentum never reads 0 after a start', () => {
  it('floor after long misses and beyond the lookback', () => {
    expect(momentumFromOutcomes([true, ...Array<boolean>(40).fill(false)])).toBe(kMomentumRestFloor);
    expect(isMomentumResting(momentumFromOutcomes([true, ...Array<boolean>(40).fill(false)]))).toBe(true);
    const p = profileOn(addDays(mon, -200));
    const v = p.habits.find((h) => h.id === P.vocab)!;
    expect(habitMomentum({ habit: v, logs: [logFor(v.id, addDays(mon, -150))], today: mon })).toBe(kMomentumRestFloor);
  });
  it('never started = 0 (shown as resting), active momentum unaffected', () => {
    expect(momentumFromOutcomes(Array<boolean>(5).fill(false))).toBe(0);
    expect(isMomentumResting(0)).toBe(true);
    expect(momentumFromOutcomes([true, true, true])).toBeGreaterThan(50);
  });
});

describe('D07 minimum minutes come only from the library', () => {
  it('stated minutes are parsed; offsets and counts are not durations', () => {
    expect(statedMinutesIn('10 min brisk walk')).toBe(10);
    expect(statedMinutesIn('1,000 extra steps: a 10-min walk')).toBe(10);
    expect(statedMinutesIn('One 15-minute single-task block.')).toBe(15);
    expect(statedMinutesIn('Night brushing, 2 minutes.')).toBe(2);
    expect(statedMinutesIn('Write one Task 2 introduction + body plan (10 min).')).toBe(10);
    expect(statedMinutesIn('Phone away 30 min before bed.')).toBeNull();
    expect(statedMinutesIn('Clear 5 due cards.')).toBeNull();
    expect(statedMinutesIn('3 stretches x 60 s')).toBeNull();
  });
  it('starter habits: stated → not estimated; unstated → flagged estimate', () => {
    const p = profileOn(mon);
    const h = (id: string) => p.habits.find((x) => x.id === id)!;
    expect(h(P.walk).minimumDurationMin).toBe(10);
    expect(h(P.walk).minimumDurationEstimated).toBe(false);
    expect(h(P.focus).minimumDurationMin).toBe(15);
    expect(h(P.dental).minimumDurationMin).toBe(2);
    expect(h(P.dental).minimumDurationEstimated).toBe(false);
    for (const id of [P.vocab, P.strength, P.windDown, P.roomReset]) expect(h(id).minimumDurationEstimated).toBe(true);
    expect(h(P.windDown).minimumDurationMin).toBeLessThan(30);
  });
});

it('D17 internal action ids never reach seed texts', () => {
  const re = new RegExp(kActionRefPattern.source);
  for (const a of library.actions) {
    for (const f of ACTION_FIELDS) {
      for (const lang of APP_LANGUAGES) {
        const t = actionText(a, f, lang) ?? '';
        expect(re.test(t), `${a.actionId} ${f} ${lang}: ${t}`).toBe(false);
      }
    }
  }
  expect(actionText(requireAction(library, 'BODY-02'), 'safety', 'ar')).not.toContain('BODY-25');
});

describe('dues: one bundled notification inside the cap', () => {
  const p = profileOn(addDays(mon, -10));
  const habits = p.habits.map((h) => ({ ...h, reminder: { enabled: true, offsetMin: 0, textAr: null, textEn: null } }));
  const plan = planDay(inputFor(mon, { profile: p, habits }));
  const dues = upcomingDues({
    today: mon,
    bills: [bill('b1', mon.getDate()), bill('b2', mon.getDate(), true), bill('b3', addDays(mon, 3).getDate())],
    autoSaveDay: mon.getDate(),
    horizonDays: 0,
  });

  it('bills + subscription + auto-save due today → ONE dues nudge', () => {
    const r = buildReminderPlan({ plan, settings: p.settings, habits, dues });
    const d = r.nudges.filter((n) => n.kind === 'dues');
    expect(d.length).toBe(1);
    expect(d[0]!.title.ar).toBe('دفعات اليوم');
    expect(d[0]!.body.ar).toContain('test');
    expect(d[0]!.body.ar).toContain('حوّلي للادخار');
    expect(d[0]!.minute).toBe(p.settings.wakeMinute + kDuesAfterWakeMin);
    expect(nudgeActionable(d[0]!)).toBe(false);
  });

  it('counts inside the daily cap (anchored nudges give way)', () => {
    for (const cap of [1, 2, 3, 4, 6]) {
      const r = buildReminderPlan({ plan, settings: { ...p.settings, notificationCap: cap }, habits, dues });
      expect(r.nudges.length).toBeLessThanOrEqual(cap);
    }
    const order = ['morningBrief', 'anchored', 'eveningShutdown', 'dues'];
    const r4 = buildReminderPlan({ plan, settings: p.settings, habits, dues });
    expect(r4.nudges.map((n) => n.kind).sort((a, b) => order.indexOf(a) - order.indexOf(b))).toEqual(order);
    const r3 = buildReminderPlan({ plan, settings: { ...p.settings, notificationCap: 3 }, habits, dues });
    expect(r3.nudges.some((n) => n.kind === 'anchored')).toBe(false);
    expect(r3.nudges.some((n) => n.kind === 'dues')).toBe(true);
  });

  it('no dues today → no dues nudge; future dues are not bundled', () => {
    const future = upcomingDues({ today: mon, bills: [bill('b3', addDays(mon, 3).getDate())] });
    expect(buildReminderPlan({ plan, settings: p.settings, habits, dues: future }).nudges.some((n) => n.kind === 'dues')).toBe(false);
  });

  it('web: payday due today joins the same bundle (when reminders are on)', () => {
    const withPay = upcomingDues({ today: mon, paydayDay: mon.getDate(), horizonDays: 0 });
    const r = buildReminderPlan({ plan, settings: p.settings, habits, dues: withPay });
    expect(r.nudges.find((n) => n.kind === 'dues')!.body.ar).toContain('يوم الراتب');
  });
});

it('D11 default settings: quiet hours end at the default wake', () => {
  const s = defaultSettings();
  expect(effectiveQuietEnd(s)).toBe(s.wakeMinute);
  expect(settingsWithWake(s, 5 * 60).quietEndMinute).toBe(5 * 60);
  expect(effectiveQuietEndMinute(settingsWithWake(settingsWithWake(s, 5 * 60), 8 * 60))).toBe(8 * 60);
  expect(settingsWithWake(s, 6 * 60 + 30).quietEndMinute).toBe(6 * 60 + 30);
});

it('dayKey sanity for the fixture', () => expect(dayKey(mon)).toBe('2026-10-05'));

describe('Fix pass 3 — R1 quiet end', () => {
  const p = profileOn(addDays(mon, -10));
  const habits = p.habits.map((h) => ({ ...h, reminder: { enabled: true, offsetMin: 0, textAr: null, textEn: null } }));
  const on = (s: Settings): Settings => ({ ...s, notificationsEnabled: true });
  const remind = (s: Settings) => buildReminderPlan({ plan: planDay(inputFor(mon, { profile: p, habits, settings: on(s) })), settings: on(s), habits });
  const brief = (s: Settings) => remind(s).nudges.find((n) => n.kind === 'morningBrief')!.minute;

  it('unset quiet end follows wake (default, earlier and later wake)', () => {
    const d = defaultSettings();
    expect(d.quietEndSetByUser).toBe(false);
    expect(effectiveQuietEndMinute(d)).toBe(d.wakeMinute);
    for (const w of [5 * 60, 6 * 60 + 30, 8 * 60]) {
      const s = settingsWithWake(d, w);
      expect(s.quietEndSetByUser).toBe(false);
      expect(effectiveQuietEnd(s)).toBe(w);
      expect(s.quietEndMinute).toBe(w);
      expect(brief(s)).toBe(w);
    }
  });
  it('her quiet end later than wake: brief at her quiet end, nothing before it', () => {
    const s = settingsWithQuietEnd(settingsWithWake(defaultSettings(), 6 * 60), 8 * 60);
    expect(s.quietEndSetByUser).toBe(true);
    expect(effectiveQuietEnd(s)).toBe(8 * 60);
    expect(brief(s)).toBe(8 * 60);
    expect(remind(s).nudges.filter((n) => n.minute < 8 * 60)).toEqual([]);
  });
  it('her quiet end earlier than wake: brief at wake (max)', () => {
    const s = settingsWithWake(settingsWithQuietEnd(defaultSettings(), 5 * 60), 7 * 60);
    expect(effectiveQuietEnd(s)).toBe(5 * 60);
    expect(brief(s)).toBe(7 * 60);
  });
  it('changing wake never moves her own quiet end', () => {
    const s = settingsWithQuietEnd(defaultSettings(), 8 * 60);
    for (const w of [5 * 60, 7 * 60, 9 * 60]) expect(effectiveQuietEndMinute(settingsWithWake(s, w))).toBe(8 * 60);
    expect(brief(settingsWithWake(s, 9 * 60))).toBe(9 * 60);
  });
  it('flag survives JSON; legacy data without the flag is migrated', () => {
    const s = settingsWithQuietEnd(defaultSettings(), 8 * 60);
    const back = SettingsJ.fromJson(SettingsJ.toJson(s));
    expect(back.quietEndSetByUser).toBe(true);
    expect(effectiveQuietEndMinute(back)).toBe(8 * 60);
    const legacy = (end: number, wake: number) => SettingsJ.fromJson({ quietEndMinute: end, wakeMinute: wake });
    expect(legacy(8 * 60, 6 * 60).quietEndSetByUser).toBe(true);
    expect(legacy(7 * 60, 6 * 60).quietEndSetByUser).toBe(false);
    expect(legacy(6 * 60, 6 * 60).quietEndSetByUser).toBe(false);
    expect(legacy(5 * 60, 5 * 60).quietEndSetByUser).toBe(false);
  });
});
