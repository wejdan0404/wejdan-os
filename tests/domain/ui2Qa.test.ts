/** Port of test/engine/ui2_engine_test.dart + test/qa/qa_engine_test.dart + test/qa/qa_reverify_test.dart. */
import { describe, expect, it } from 'vitest';
import {
  type AdminDoc, type Bill, type BnplItem, type DayPlan, type Habit, type Season, type WishItem, ActionJ, CycleEntryJ, EngineRuleJ,
  ErrandJ, HabitJ, ModuleStateJ, MONDAY, SUNDAY, VocabGrade, WeeklyReviewRecordJ, actionText, actionTitle, addDays,
  awardForCompletion, awardForWeeklyReview, bestTimeWindow, buildReminderPlan, coolingDaysLeft, computeStrength, dayKey,
  defaultModuleState, dueDaysFrom, engineRuleText, freshStartOn, freshStartTomorrow, habitMomentum, inWindow, isNotApplicable,
  itemsOfTier, kRedEssentials, makeJoyItem, mkDate, momentumFromOutcomes, newVocabCard, nextMonthlyDate, nextSpacedPractice,
  planDay, recoverySpeedByWeek, redeemReward, requireAction, reviewCard, rotationSkill, settingsWithQuietEnd, settingsWithWake,
  suggestExperiments, systemBurden, upcomingDues, weekCount,
} from '../../src/domain';
import { P, buildPersona } from './fixtures/personaProfile';
import { dailyLogs, fri, inputFor, library, logFor, mon, profileOn, sat, simpleHabit, sun, thu, tue, wed } from './helpers';

const season = (start: string, ended: string | null = null): Season => ({
  id: 's', titleAr: 'test', titleEn: 'test', startDate: start, plannedEndDate: null, endedDate: ended, states: {},
});
const find = (p: DayPlan, id: string) => p.items.find((i) => i.itemId === id);
const withReminders = (hs: Habit[]): Habit[] => hs.map((h) => ({ ...h, reminder: { enabled: true, offsetMin: 0, textAr: null, textEn: null } }));

describe('Fresh start (JOY-10)', () => {
  it('Sunday = new week; 1st = new month; season start wins', () => {
    expect(freshStartOn(sun)?.kind).toBe('newWeek');
    expect(freshStartOn(mon)).toBeNull();
    expect(freshStartOn(mkDate(2026, 10, 1))?.kind).toBe('newMonth');
    expect(freshStartOn(mkDate(2026, 11, 1))?.kind).toBe('newMonth');
    expect(freshStartOn(tue, { season: season('2026-10-05') })?.kind).toBe('newSeason');
    expect(freshStartOn(mkDate(2026, 10, 8), { season: season('2026-10-05') })).toBeNull();
    expect(freshStartOn(tue, { season: season('2026-10-05', '2026-10-06') })).toBeNull();
  });
  it('week start follows settings; key is the landmark day', () => {
    expect(freshStartOn(mon, { weekStartsOn: MONDAY })).toEqual({ kind: 'newWeek', date: '2026-10-05' });
    expect(freshStartOn(sun, { weekStartsOn: MONDAY })).toBeNull();
  });
  it('tomorrow: Saturday review sees Sunday; season only if it starts tomorrow', () => {
    expect(freshStartTomorrow(sat)?.kind).toBe('newWeek');
    expect(freshStartTomorrow(mon)).toBeNull();
    expect(freshStartTomorrow(mon, { season: season('2026-10-05') })).toBeNull();
    expect(freshStartTomorrow(mon, { season: season('2026-10-06') })?.kind).toBe('newSeason');
  });
  it('QA: 1st of month / week start detected', () => {
    expect(freshStartOn(mkDate(2026, 11, 1), { weekStartsOn: SUNDAY })).not.toBeNull();
  });
});

describe('Dues', () => {
  it('nextMonthlyDate clamps to month length and rolls over', () => {
    expect(nextMonthlyDate(mkDate(2026, 10, 5), 12)).toEqual(mkDate(2026, 10, 12));
    expect(nextMonthlyDate(mkDate(2026, 10, 15), 12)).toEqual(mkDate(2026, 11, 12));
    expect(nextMonthlyDate(mkDate(2027, 2, 3), 31)).toEqual(mkDate(2027, 2, 28));
    expect(nextMonthlyDate(mkDate(2026, 10, 5), 5)).toEqual(mkDate(2026, 10, 5));
  });
  it('bills, BNPL, docs in window and auto-save, sorted', () => {
    const bills: Bill[] = [
      { id: 'b', title: 'test', amount: 10, dueDay: 20, isSubscription: false, active: true },
      { id: 'off', title: 'test', amount: 10, dueDay: 6, isSubscription: false, active: false },
    ];
    const bnpl: BnplItem[] = [{ id: 'p', title: 'test', provider: 'test', instalmentAmount: 5, dueDates: ['2026-10-01', '2026-10-12'], paidDates: ['2026-10-01'] }];
    const docs: AdminDoc[] = [
      { id: 'soon', name: 'test', expiry: '2026-10-25', remindDaysBefore: 30, note: '' },
      { id: 'far', name: 'test', expiry: '2027-10-25', remindDaysBefore: 30, note: '' },
      { id: 'none', name: 'test', expiry: null, remindDaysBefore: 30, note: '' },
    ];
    const d = upcomingDues({ today: mon, bills, bnpl, docs, autoSaveDay: 27 });
    expect(d.map((x) => x.refId)).toEqual(['p', 'b', 'soon', 'auto_save']);
    expect(dueDaysFrom(d[0]!, mon)).toBe(7);
    expect(d.find((x) => x.refId === 'b')!.kind).toBe('bill');
  });
  it('cooling-off days left never negative', () => {
    const w: WishItem = { id: 'w', title: 'test', addedDate: '2026-10-01', price: null, coolingOffDays: 7, decision: null };
    expect(coolingDaysLeft(w, mon)).toBe(3);
    expect(coolingDaysLeft(w, mkDate(2026, 10, 20))).toBe(0);
  });
  it('spaced theory rounds: today first, then growing gaps, overdue = today', () => {
    expect(nextSpacedPractice([], mon)).toEqual(mon);
    expect(nextSpacedPractice(['2026-10-05'], mon)).toEqual(tue);
    expect(nextSpacedPractice(['2026-10-04', '2026-10-05'], mon)).toEqual(wed);
    expect(nextSpacedPractice(['2026-09-01'], mon)).toEqual(mon);
  });
});

describe('Insights', () => {
  const h = simpleHabit({ id: 'h', created: '2026-09-01' });
  it('recovery speed by week: return counted in its week, null when none', () => {
    const skip = new Set(['2026-09-28', '2026-09-29', dayKey(tue)]);
    const logs = dailyLogs('h', mkDate(2026, 9, 1), mkDate(2026, 10, 10), (d) => !skip.has(dayKey(d)));
    expect(recoverySpeedByWeek({ habits: [h], logs, today: sat, weeks: 3 })).toEqual([null, 2, 1]);
    expect(recoverySpeedByWeek({ habits: [h], logs: [], today: sat, weeks: 2 })).toEqual([null, null]);
  });
  it('best time window: needs 3 samples, middle half, ≥ 30 min', () => {
    expect(bestTimeWindow({ logs: [logFor('h', mon, { minute: 600 })], itemId: 'h', today: sat })).toBeNull();
    const logs = [600, 610, 620, 630, 900].map((m, i) => logFor('h', addDays(mon, i), { minute: m }));
    const w = bestTimeWindow({ logs, itemId: 'h', today: sat })!;
    expect(w.samples).toBe(5);
    expect(w.start).toBe(600);
    expect(w.end).toBe(630);
    expect(w.end - w.start).toBeGreaterThanOrEqual(30);
  });
  it('system burden counts this week only and measures review time', () => {
    const b = systemBurden({
      logs: [logFor('h', sun), logFor('h', mon), logFor('h', mkDate(2026, 10, 1))],
      reviews: [{ id: '2026-10-04', date: '2026-10-10', chapterTitle: '', wins: [], blockers: [], top3: [], experimentId: null, durationSec: 530 }],
      today: sat,
    });
    expect(b.logCount).toBe(2);
    expect(b.reviewMinutes).toBe(9);
    expect(systemBurden({ logs: [], reviews: [], today: sat }).reviewMinutes).toBeNull();
  });
  it('weekCount = done / planned in the current week', () => {
    const walk = simpleHabit({ id: 'w', weekdays: [1, 3, 5] });
    const r = weekCount(walk, [logFor('w', mon), logFor('w', tue)], thu);
    expect(r.planned).toBe(3);
    expect(r.done).toBe(2);
  });
});

it('Experiment suggestions (ENG-21): bundle, time swap and minimum-only, max 3, deterministic', () => {
  const p = profileOn(mon);
  const core = p.habits.filter((h) => h.routineId == null);
  const e = suggestExperiments({ coreHabits: core, joyItems: p.joyItems });
  expect(e.length).toBe(3);
  expect(e.map((x) => x.variable.split(':')[0])).toEqual(['bundle', 'time', 'minimum']);
  expect(e.every((x) => x.status === 'planned')).toBe(true);
  expect(new Set(e.map((x) => x.habitId)).size).toBe(3);
  expect(suggestExperiments({ coreHabits: core, joyItems: p.joyItems }).map((x) => x.id)).toEqual(e.map((x) => x.id));
  expect(suggestExperiments({ coreHabits: [] })).toEqual([]);
});

describe('Arabic Action Library (UI-2 §A)', () => {
  it('every action and rule has Arabic; n/a hidden; JOY-12/13 no dose', () => {
    expect(library.actions.every((a) => a.ar != null)).toBe(true);
    expect(library.rules.every((r) => r.ar != null)).toBe(true);
    const joy13 = requireAction(library, 'JOY-13');
    const joy12 = requireAction(library, 'JOY-12');
    expect(actionText(joy13, 'dose', 'ar')).toBeNull();
    expect(actionText(joy12, 'dose', 'en')).toBeNull();
    expect(actionText(joy13, 'normal', 'ar')).toBeNull();
    expect(actionText(joy13, 'normal', 'en')).toBeNull();
    expect(actionText(joy12, 'ifThen', 'ar')).toBeNull();
    expect(actionText(requireAction(library, 'BODY-02'), 'minimum', 'ar')).toContain('مشي');
    expect(actionTitle(requireAction(library, 'BODY-02'), 'ar')).toBe('المشي اليومي والخطوات');
    expect(isNotApplicable('لا ينطبق')).toBe(true);
    expect(isNotApplicable('n/a (reuse)')).toBe(true);
    expect(isNotApplicable('none')).toBe(false);
  });
  it('Arabic survives JSON round-trip; missing Arabic falls back to English', () => {
    const a = requireAction(library, 'GROW-07');
    expect(ActionJ.fromJson(ActionJ.toJson(a)).ar?.cue).toBe(a.ar?.cue);
    const plain = { ...a, ar: null };
    expect(actionText(plain, 'minimum', 'ar')).toBe(a.minimumVersion);
    expect(actionTitle(plain, 'ar')).toBe(a.nameAr);
    const rule = library.rules[0]!;
    expect(engineRuleText(EngineRuleJ.fromJson(EngineRuleJ.toJson(rule)), 'why', 'ar')).toBe(rule.ar?.why);
  });
  it('starter habits are seeded in Arabic by default, English on request', () => {
    const ar = profileOn(mon).habits.find((h) => h.id === P.walk)!;
    expect(ar.minimumText).toBe(requireAction(library, 'BODY-02').ar?.minimum);
    expect(ar.titleAr).toBe('المشي اليومي والخطوات');
    const en = buildPersona(library, mon, 'en').habits.find((h) => h.id === P.walk)!;
    expect(en.minimumText).toBe(requireAction(library, 'BODY-02').minimumVersion);
  });
});

it('UI-2 models round-trip', () => {
  const m = { ...defaultModuleState(), drivingStepsDone: [0, 2], drivingServiceLink: 'https://my.gov.sa', ieltsFeedbackChecks: ['w_tr'], homeZoneOffset: 2, autoSaveDay: 27, freshStartDismissed: '2026-10-04' };
  const m2 = ModuleStateJ.fromJson(ModuleStateJ.toJson(m));
  expect(m2.drivingStepsDone).toEqual([0, 2]);
  expect(m2.autoSaveDay).toBe(27);
  expect(ModuleStateJ.fromJson({}).resetMinutes).toBe(10);
  expect(ErrandJ.fromJson(ErrandJ.toJson({ id: 'e', title: 'test', done: true, addedDate: null })).done).toBe(true);
  expect(CycleEntryJ.fromJson(CycleEntryJ.toJson({ id: 'c', date: '2026-10-05', kind: 'start', note: '' })).kind).toBe('start');
  const r = WeeklyReviewRecordJ.fromJson(WeeklyReviewRecordJ.toJson({ id: 'w', date: 'd', chapterTitle: '', wins: [], blockers: [], top3: ['test'], experimentId: null, durationSec: 60 }));
  expect(r.top3).toEqual(['test']);
  expect(r.durationSec).toBe(60);
});

// ---------------------------------------------------------------- QA engine spot-checks
describe('QA: planner caps per energy (spec 5.1)', () => {
  for (const d of [sun, mon, tue, wed, thu, fri, sat]) {
    it(`caps hold on ${dayKey(d)}`, () => {
      const g = planDay(inputFor(d));
      const y = planDay(inputFor(d, { energy: 'yellow' }));
      const r = planDay(inputFor(d, { energy: 'red' }));
      expect(itemsOfTier(g, 'core').length).toBeLessThanOrEqual(3);
      expect(itemsOfTier(g, 'maintain').length).toBeLessThanOrEqual(2);
      expect(itemsOfTier(g, 'joy').length).toBe(1);
      expect(itemsOfTier(y, 'core').length).toBeLessThanOrEqual(2);
      expect(r.items.filter((i) => i.tier !== 'joy' && i.tier !== 'chain').length).toBeLessThanOrEqual(kRedEssentials);
      expect(r.items.filter((i) => i.tier !== 'joy').every((i) => i.suggestedLevel === 'minimum')).toBe(true);
      expect(r.showHelpLink).toBe(true);
      expect(g.plannedMin).toBeLessThanOrEqual(Math.floor(g.budgetMin * 0.7));
    });
  }
  it('Red day on starter profile: 3 minimum items incl. chain essentials', () => {
    expect(planDay(inputFor(mon, { energy: 'red' })).items.filter((i) => i.tier !== 'joy').length).toBe(3);
  });
  it('Green day on starter profile has maintain items', () => {
    expect(itemsOfTier(planDay(inputFor(mon)), 'maintain').length).toBeGreaterThan(0);
  });
});

it('QA: IELTS weekly rotation covers R/L/W/S', () => {
  expect(rotationSkill(6)).toBe('reading');
  expect(rotationSkill(7)).toBe('listening');
  expect(rotationSkill(1)).toBe('writing');
  expect(rotationSkill(2)).toBe('speaking');
  expect(rotationSkill(4, 'speaking')).toBe('speaking');
});

it('QA: a done item stays on today when a new core habit outranks it', () => {
  const p = profileOn(addDays(mon, -30));
  const walk = p.habits.find((h) => h.id === P.walk)!;
  const extra = HabitJ.fromJson({ ...HabitJ.toJson(walk), id: 'qa_test', titleAr: 'test', titleEn: 'test', sortOrder: -1, alternationGroup: null });
  const logs = [logFor(P.walk, mon)];
  expect(find(planDay(inputFor(mon, { profile: p, logs })), P.walk)).toBeDefined();
  expect(find(planDay(inputFor(mon, { profile: p, logs, habits: [...p.habits, extra] })), P.walk)).toBeDefined();
});

describe('QA: sparks', () => {
  it('levels 1/2/3, comeback x2, cap 20', () => {
    expect(awardForCompletion({ level: 'minimum', isComeback: false, earnedToday: 0 }).amount).toBe(1);
    expect(awardForCompletion({ level: 'normal', isComeback: false, earnedToday: 0 }).amount).toBe(2);
    expect(awardForCompletion({ level: 'bonus', isComeback: false, earnedToday: 0 }).amount).toBe(3);
    expect(awardForCompletion({ level: 'bonus', isComeback: true, earnedToday: 0 }).amount).toBe(6);
    expect(awardForCompletion({ level: 'bonus', isComeback: true, earnedToday: 17 }).amount).toBe(3);
    expect(awardForCompletion({ level: 'minimum', isComeback: false, earnedToday: 20 }).amount).toBe(0);
    expect(awardForWeeklyReview({ earnedToday: 18 }).amount).toBe(2);
  });
  it('redeem is refused for free joy', () => {
    const free = makeJoyItem({ id: 'j', titleAr: 'test', titleEn: 'test', kind: 'free' });
    expect(redeemReward({ ledger: [], reward: free, txnId: 't', at: mon }).ok).toBe(false);
  });
});

describe('QA: momentum (nothing resets to 0)', () => {
  it('after 1 done then 20 misses, rounded value stays above 0', () => {
    const m = momentumFromOutcomes([true, ...Array<boolean>(20).fill(false)]);
    expect(m).toBeGreaterThan(0);
    expect(Math.round(m)).toBeGreaterThan(0);
  });
  it('completion older than the lookback stays above 0', () => {
    const p = profileOn(addDays(mon, -120));
    const v = p.habits.find((h) => h.id === P.vocab)!;
    expect(habitMomentum({ habit: v, logs: [logFor(v.id, addDays(mon, -70))], today: mon })).toBeGreaterThan(0);
  });
  it('R-probe: never-done habit is 0, once-done habit never below 1', () => {
    expect(momentumFromOutcomes(Array<boolean>(10).fill(false))).toBe(0);
    expect(momentumFromOutcomes([true, ...Array<boolean>(200).fill(false)])).toBeGreaterThanOrEqual(1);
  });
});

it('QA: strength stage is not day-count based (30 days without SRBAI caps at growing)', () => {
  const p = profileOn(addDays(mon, -40));
  const v = p.habits.find((h) => h.id === P.vocab)!;
  const logs = Array.from({ length: 35 }, (_, i) => logFor(v.id, addDays(mon, -i)));
  const order = ['seed', 'sprout', 'growing', 'rooted', 'automatic'];
  expect(order.indexOf(computeStrength({ habit: v, logs, checks: [], today: mon }).stage)).toBeLessThanOrEqual(order.indexOf('growing'));
});

describe('QA: reminders', () => {
  const p = profileOn(addDays(mon, -10));
  const habits = withReminders(p.habits);
  it('never more than cap; nothing inside quiet hours', () => {
    for (const cap of [0, 1, 2, 4, 6]) {
      const s = { ...p.settings, notificationCap: cap };
      const r = buildReminderPlan({ plan: planDay(inputFor(mon, { profile: p, habits, settings: s })), settings: s, habits });
      expect(r.nudges.length).toBeLessThanOrEqual(cap);
      for (const n of r.nudges) expect(inWindow(n.minute, s.quietStartMinute, s.quietEndMinute)).toBe(false);
    }
  });
  it('wake 06:00 → morning brief arrives at wake', () => {
    const s = settingsWithWake(p.settings, 6 * 60);
    const r = buildReminderPlan({ plan: planDay(inputFor(mon, { profile: p, habits, settings: s })), settings: s, habits });
    expect(r.nudges.find((n) => n.kind === 'morningBrief')!.minute).toBe(s.wakeMinute);
  });
  it('R1: an explicit quiet end later than wake is respected', () => {
    const s = settingsWithQuietEnd({ ...settingsWithWake(p.settings, 6 * 60), quietStartMinute: 23 * 60 }, 8 * 60);
    const r = buildReminderPlan({ plan: planDay(inputFor(mon, { profile: p, habits, settings: s })), settings: s, habits });
    expect(r.nudges.filter((n) => n.minute < 8 * 60)).toEqual([]);
  });
});

it('QA: vocab SRS intervals 1, 6, then ×ease; lapse → tomorrow; ease floor 1.3', () => {
  let c = newVocabCard({ id: 'v', front: 'test', back: 'test', today: mon });
  c = reviewCard(c, VocabGrade.good, mon);
  expect(c.intervalDays).toBe(1);
  c = reviewCard(c, VocabGrade.good, addDays(mon, 1));
  expect(c.intervalDays).toBe(6);
  c = reviewCard(c, VocabGrade.good, addDays(mon, 7));
  expect(c.intervalDays).toBeGreaterThanOrEqual(12);
  expect(c.intervalDays).toBeLessThanOrEqual(18);
  c = reviewCard(c, VocabGrade.again, addDays(mon, 22));
  expect(c.intervalDays).toBe(1);
  expect(c.due).toBe(dayKey(addDays(mon, 23)));
  for (let i = 0; i < 10; i++) c = reviewCard(c, VocabGrade.again, mon);
  expect(c.ease).toBeCloseTo(1.3, 9);
});

it('R-probe: done items stay when energy drops Green → Yellow → Red', () => {
  const p = profileOn(addDays(mon, -30));
  const cores = itemsOfTier(planDay(inputFor(mon, { profile: p })), 'core').map((i) => i.itemId);
  const logs = cores.map((id) => logFor(id, mon));
  for (const e of ['yellow', 'red'] as const) {
    const plan = planDay(inputFor(mon, { profile: p, logs, energy: e }));
    for (const id of cores) expect(plan.items.some((i) => i.itemId === id), `${id} on ${e}`).toBe(true);
  }
});
