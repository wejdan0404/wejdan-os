/** Port of test/engine/reminders_capacity_test.dart (notification service parts dropped — planning only). */
import { describe, expect, it } from 'vitest';
import {
  type Experiment, type NudgeRecord, type Settings, type VocabCard, AnchorResolver, VocabGrade, anchor, anchorAt, anchorSlot,
  buildReminderPlan, canStartExperiment, checkCapacity, compareExperiment, completionDelta, completionRate, coreHabitsOf,
  dayKey, defaultSettings, dueCards, dueCount, effectiveQuietEnd, enjoymentDelta, ignoredInARow, inWindow, kDefaultNotificationCap,
  kMinEase, kStartEase, makeDayPlan, makeExperiment, makeProject, mkDate, newVocabCard, nudgeActionable, nudgePayload,
  parseNudgePayload, planDay, reviewCard, violationOver, violationsAfter,
} from '../../src/domain';
import { P } from './fixtures/personaProfile';
import { fri, inputFor, logFor, mon, profileOn, simpleHabit, sun, thu } from './helpers';

/** Parity: reminders are OFF by default in the web app; the Dart tests assume they are available. */
const S = (p: Partial<Settings> = {}): Settings => defaultSettings({ notificationsEnabled: true, ...p });

describe('Reminders', () => {
  const p = profileOn(mon);
  const habits = p.habits.map((h) => (h.id === P.focus ? { ...h, reminder: { enabled: true, offsetMin: 0, textAr: null, textEn: null } } : h));
  const plan = planDay(inputFor(mon, { profile: p, habits }));

  it('default cap 4 = morning brief + 2 anchored + evening shutdown', () => {
    const s = S({ quietEndMinute: 6 * 60 });
    const r = buildReminderPlan({ plan, settings: s, habits });
    expect(r.nudges.length).toBe(kDefaultNotificationCap);
    expect(r.nudges.filter((n) => n.kind === 'morningBrief').length).toBe(1);
    expect(r.nudges.filter((n) => n.kind === 'eveningShutdown').length).toBe(1);
    expect(r.nudges.filter((n) => n.kind === 'anchored').length).toBe(2);
    expect(r.droppedForCap.length).toBe(1);
    const mins = r.nudges.map((n) => n.minute);
    expect(mins).toEqual([...mins].sort((a, b) => a - b));
    expect(buildReminderPlan({ plan, settings: s, habits }).nudges.map((n) => n.id)).toEqual(r.nudges.map((n) => n.id));
    expect(r.nudges[0]!.title.ar).not.toBe('');
    expect(nudgePayload(r.nudges.find(nudgeActionable)!).startsWith('anchored|2026-10-05|')).toBe(true);
  });

  it('reminders are OFF by default (web): no nudges', () => {
    expect(buildReminderPlan({ plan, settings: defaultSettings(), habits }).nudges).toEqual([]);
  });

  it('user cap 0..6', () => {
    expect(buildReminderPlan({ plan, settings: S({ notificationCap: 0 }), habits }).nudges).toEqual([]);
    const one = buildReminderPlan({ plan, settings: S({ notificationCap: 1 }), habits });
    expect(one.nudges.length).toBe(1);
    expect(one.nudges[0]!.kind).toBe('morningBrief');
    expect(buildReminderPlan({ plan, settings: S({ notificationCap: 6, quietEndMinute: 6 * 60 }), habits }).nudges.length).toBe(5);
  });

  it('quiet hours end at wake: morning brief at wake, morning cues kept (D11)', () => {
    const s = S({ wakeMinute: 5 * 60, quietStartMinute: 23 * 60, quietEndMinute: 7 * 60 });
    expect(effectiveQuietEnd(s)).toBe(5 * 60);
    const r = buildReminderPlan({ plan, settings: s, habits });
    expect(r.nudges.find((n) => n.kind === 'morningBrief')!.minute).toBe(5 * 60);
    expect(r.droppedForQuiet.map((n) => n.itemId)).not.toContain(P.vocab);
    expect(r.nudges.every((n) => !inWindow(n.minute, s.quietStartMinute, effectiveQuietEnd(s)))).toBe(true);
    const late8 = S({ wakeMinute: 8 * 60, quietStartMinute: 23 * 60, quietEndMinute: 7 * 60 });
    expect(effectiveQuietEnd(late8)).toBe(8 * 60);
    expect(buildReminderPlan({ plan, settings: late8, habits }).nudges.find((n) => n.kind === 'morningBrief')!.minute).toBe(8 * 60);
    const early = buildReminderPlan({ plan, settings: S({ wakeMinute: 5 * 60, quietStartMinute: 23 * 60, quietEndMinute: 5 * 60 + 40 }), habits });
    expect(early.nudges.every((n) => !inWindow(n.minute, 23 * 60, 5 * 60))).toBe(true);
    const late = buildReminderPlan({ plan, settings: S({ sleepMinute: 60, eveningShutdownBeforeSleepMin: 30 }), habits });
    expect(late.nudges.find((n) => n.kind === 'eveningShutdown')!.minute).toBe(23 * 60 - 30);
  });

  it('focus blocks suppress nudges; past times are skipped', () => {
    const walkAt = plan.items.find((i) => i.itemId === P.walk)!.startMinute!;
    const r = buildReminderPlan({
      plan, settings: p.settings, habits,
      fixedEvents: [{ id: 'f', title: 'Focus', startMinute: walkAt - 5, endMinute: walkAt + 30, date: null, weekdays: [1], isFocusBlock: true }],
    });
    expect(r.droppedForFocus.map((n) => n.itemId)).toContain(P.walk);
    const later = buildReminderPlan({ plan, settings: p.settings, habits, nowMinute: 12 * 60 });
    expect(later.nudges.every((n) => n.minute > 12 * 60)).toBe(true);
  });

  it('adaptive mute after 3 ignored in a row, with a suggested time', () => {
    const history: NudgeRecord[] = [
      ...[0, 1, 2].map((i) => ({ id: `n${i}`, itemId: P.walk, date: `2026-10-0${i + 1}`, response: 'ignored' as const })),
      { id: 'old', itemId: P.walk, date: '2026-09-30', response: 'done' },
    ];
    expect(ignoredInARow(history, P.walk)).toBe(3);
    const logs = [logFor(P.walk, sun, { minute: 21 * 60 }), logFor(P.walk, fri, { minute: 21 * 60 })];
    const r = buildReminderPlan({ plan, settings: p.settings, habits, nudgeHistory: history, logs });
    expect(r.muted.length).toBe(1);
    expect(r.muted[0]!.itemId).toBe(P.walk);
    expect(r.muted[0]!.suggestedMinute).toBe(21 * 60);
    expect(r.nudges.map((n) => n.itemId)).not.toContain(P.walk);
    expect(ignoredInARow([...history, { id: 'z', itemId: P.walk, date: '2026-10-04', response: 'snoozed' }], P.walk)).toBe(0);
  });

  it('payload parse', () => {
    const n = parseNudgePayload('anchored|2026-10-05|h_walk')!;
    expect(n.kind).toBe('anchored');
    expect(n.itemId).toBe('h_walk');
    expect(parseNudgePayload('morningBrief|2026-10-05|')!.itemId).toBeNull();
    expect(parseNudgePayload('bad')).toBeNull();
    expect(parseNudgePayload(null)).toBeNull();
  });

  it('empty plan → morning body without first step', () => {
    const empty = makeDayPlan({ date: '2026-10-05', energy: 'green', items: [] });
    expect(buildReminderPlan({ plan: empty, settings: S(), habits: [] }).nudges[0]!.body.en).toBe('Take a breath and see your plan');
  });
});

describe('Capacity guard', () => {
  const p = profileOn(mon);

  it('starter profile is within all caps', () => {
    expect(checkCapacity({ domains: p.domains, projects: [], habits: p.habits })).toEqual([]);
    expect(coreHabitsOf(p.habits, p.domains).length).toBe(4);
  });

  it('4th Grow domain, 3rd active project, 2nd course, 8th core habit', () => {
    const domains = p.domains
      .map((d) => (d.id === 'driving' || d.id === 'people' ? { ...d, state: 'maintain' as const } : d))
      .map((d) => (d.id === 'learning' ? { ...d, state: 'grow' as const } : d));
    const projects = [0, 1, 2].map((i) => makeProject({ id: `p${i}`, domain: 'learning', titleAr: 'م', titleEn: 'P', status: 'active', isCourse: i < 2 }));
    const habits = [...p.habits, ...[0, 1, 2, 3].map((i) => simpleHabit({ id: `x${i}`, domain: 'ielts' }))];
    const v = checkCapacity({ domains, projects, habits });
    expect(new Set(v.map((e) => e.rule))).toEqual(new Set(['growDomains', 'maintainDomains', 'activeProjects', 'activeCourses', 'coreHabits']));
    const core = v.find((e) => e.rule === 'coreHabits')!;
    expect(core.count).toBe(8);
    expect(violationOver(core)).toBe(1);
  });

  it('violationsAfter reports only newly created violations', () => {
    const growLearning = { ...p.domains.find((d) => d.id === 'learning')!, state: 'grow' as const };
    const v = violationsAfter({ domains: p.domains, projects: [], habits: p.habits, changedDomain: growLearning });
    expect(v.map((x) => x.rule)).toEqual(['growDomains']);
    expect(violationsAfter({ domains: p.domains, projects: [], habits: p.habits, changedHabit: simpleHabit({ id: 'new', domain: 'ielts' }) })).toEqual([]);
    const proj = violationsAfter({
      domains: p.domains,
      projects: [
        makeProject({ id: 'a', domain: 'career', titleAr: 'a', titleEn: 'a', status: 'active' }),
        makeProject({ id: 'b', domain: 'career', titleAr: 'b', titleEn: 'b', status: 'active' }),
      ],
      habits: p.habits,
      changedProject: makeProject({ id: 'c', domain: 'career', titleAr: 'c', titleEn: 'c', status: 'active' }),
    });
    expect(proj.map((x) => x.rule)).toEqual(['activeProjects']);
  });
});

describe('Vocab SRS (SM-2 style)', () => {
  const today = mkDate(2026, 10, 5);

  it('good answers grow the interval 1 → 6 → ×ease', () => {
    let c = newVocabCard({ id: 'v', front: 'ubiquitous', back: 'everywhere', today });
    expect(dueCount([c], today)).toBe(1);
    c = reviewCard(c, VocabGrade.good, today);
    expect(c.intervalDays).toBe(1);
    expect(c.due).toBe('2026-10-06');
    c = reviewCard(c, VocabGrade.good, mkDate(2026, 10, 6));
    expect(c.intervalDays).toBe(6);
    c = reviewCard(c, VocabGrade.good, mkDate(2026, 10, 12));
    expect(c.intervalDays).toBe(Math.round(6 * c.ease));
    expect(c.ease).toBeCloseTo(2.5, 9);
    expect(c.repetitions).toBe(3);
  });

  it('lapse resets repetitions, due tomorrow, ease floor 1.3', () => {
    let c = newVocabCard({ id: 'v', front: 'a', back: 'b', today });
    c = reviewCard(c, VocabGrade.easy, today);
    expect(c.ease).toBeCloseTo(2.6, 9);
    c = reviewCard(c, VocabGrade.again, today);
    expect(c.repetitions).toBe(0);
    expect(c.lapses).toBe(1);
    expect(c.due).toBe('2026-10-06');
    for (let i = 0; i < 10; i++) c = reviewCard(c, 0, today);
    expect(c.ease).toBe(kMinEase);
    expect(reviewCard(newVocabCard({ id: 'h', front: 'a', back: 'b', today }), VocabGrade.hard, today).ease).toBeLessThan(kStartEase);
  });

  it('due ordering: most overdue first, then id', () => {
    const card = (id: string, due: string): VocabCard => ({ id, front: '', back: '', example: '', ease: 2.5, intervalDays: 0, repetitions: 0, due, lapses: 0, lastReviewed: null });
    const cards = [card('b', '2026-10-04'), card('a', '2026-10-04'), card('c', '2026-10-01'), card('d', '2026-10-09')];
    expect(dueCards(cards, today).map((c) => c.id)).toEqual(['c', 'a', 'b']);
  });
});

describe('Anchors', () => {
  it('fixed, wake, sleep, slot, offsets and clamping', () => {
    const r = new AnchorResolver({ wakeMinute: 360, sleepMinute: 1380 });
    expect(r.resolve(anchorAt(600), mon)).toBe(600);
    expect(r.resolve(anchor({ type: 'wake', offsetMin: 90 }), mon)).toBe(450);
    expect(r.resolve(anchor({ type: 'sleep', offsetMin: -60 }), mon)).toBe(1320);
    expect(r.resolve(anchorSlot('morning'), mon)).toBe(390);
    expect(r.resolve(anchorSlot('night'), mon)).toBe(1320);
    expect(r.resolve(anchorSlot('afternoon'), mon)).toBe(930);
    expect(r.resolve(anchorSlot('evening'), mon)).toBe(1110);
    expect(r.resolve(anchorSlot('midday'), mon)).toBe(750);
    expect(r.resolve(anchorSlot('anytime'), mon)).toBe(750);
    expect(r.resolve(anchor({ type: 'sleep', offsetMin: 200 }), mon)).toBe(1439);
    expect(r.resolve(anchor({ type: 'fixedTime', slot: 'midday' }), mon)).toBe(750);
  });

  it('prayer anchors off → slot fallback; on → Umm al-Qura times for Makkah', () => {
    const a = anchor({ type: 'prayer', prayer: 'maghrib', slot: 'evening', offsetMin: 10 });
    const off = new AnchorResolver({ wakeMinute: 360, sleepMinute: 1380 });
    expect(off.prayerMinutes(mon)).toBeNull();
    expect(off.resolve(a, mon)).toBe(18 * 60 + 40);
    const on = AnchorResolver.fromSettings(defaultSettings({ prayerAnchorsEnabled: true }));
    const t = on.prayerMinutes(mon)!;
    const within = (v: number, lo: number, hi: number) => expect(v >= lo && v <= hi).toBe(true);
    within(t.fajr, 4 * 60 + 30, 5 * 60 + 30);
    within(t.dhuhr, 11 * 60 + 50, 12 * 60 + 30);
    within(t.asr, 15 * 60, 15 * 60 + 45);
    within(t.maghrib, 17 * 60 + 45, 18 * 60 + 30);
    expect([90, 120]).toContain(t.isha - t.maghrib);
    expect(on.resolve(a, mon)).toBe(t.maghrib + 10);
    expect(on.prayerMinutes(mon)).toBe(t);
  });
});

describe('Experiments', () => {
  const h = simpleHabit({ created: '2026-09-01' });

  it('one active at a time', () => {
    const e: Experiment = makeExperiment({ id: 'e1', habitId: 'h', titleAr: 'ت', titleEn: 'E', variable: 'night', status: 'active' });
    expect(canStartExperiment([e])).toBe(false);
    expect(canStartExperiment([{ ...e, status: 'kept' }])).toBe(true);
    expect(canStartExperiment([])).toBe(true);
  });

  it('before/after completion + enjoyment comparison', () => {
    const logs = [
      ...[28, 30].map((d) => logFor('h', mkDate(2026, 9, d), { enjoyment: 2 })),
      logFor('h', mkDate(2026, 10, 2), { enjoyment: 2 }),
      ...[5, 6, 7, 8].map((d) => logFor('h', mkDate(2026, 10, d), { enjoyment: 4 })),
    ];
    const e = makeExperiment({ id: 'e1', habitId: 'h', titleAr: 'ت', titleEn: 'E', variable: 'night', status: 'active', startDate: '2026-10-05' });
    const r = compareExperiment({ experiment: e, habit: h, logs, today: thu })!;
    expect(r.before.planned).toBe(7);
    expect(r.before.done).toBe(3);
    expect(r.after.planned).toBe(4);
    expect(completionRate(r.after)).toBe(1);
    expect(completionDelta(r)).toBeCloseTo(1 - 3 / 7, 9);
    expect(enjoymentDelta(r)).toBe(2);
    const noStart = makeExperiment({ id: 'x', habitId: 'h', titleAr: '', titleEn: '', variable: '' });
    expect(compareExperiment({ experiment: noStart, habit: h, logs, today: thu })).toBeNull();
    expect(compareExperiment({ experiment: { ...e, endDate: '2026-10-06' }, habit: h, logs, today: thu })!.after.planned).toBe(2);
    expect(enjoymentDelta(compareExperiment({ experiment: e, habit: h, logs: [], today: thu })!)).toBeNull();
    expect(dayKey(thu)).toBe('2026-10-08');
  });
});
