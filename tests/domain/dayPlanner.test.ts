/** Port of test/engine/day_planner_test.dart. */
import { describe, expect, it } from 'vitest';
import {
  type DayPlan, type JoyItem, type PlanItem, type PlanTier, DayPlanJ, FRIDAY, MONDAY, SATURDAY, SUNDAY, THURSDAY, TUESDAY,
  WEDNESDAY, addDays, dayKey, defaultSettings, formatHm, inWindow, itemsIn, itemsOfTier, kMaxCoreYellow, kMaxMaintain,
  kRedEssentials, learnedMinutes, logicalDay, makeJoyItem, makeProject, makeProjectStep, makeWeeklyTask, median, mkDate,
  parseHm, planDay, rotationSkill, stableHash,
} from '../../src/domain';
import { P } from './fixtures/personaProfile';
import { fri, inputFor, logFor, mon, profileOn, sat, sun, thu, tue, wed } from './helpers';

const find = (p: DayPlan, itemId: string): PlanItem | undefined => p.items.find((i) => i.itemId === itemId);
const tier = (p: DayPlan, t: PlanTier) => itemsOfTier(p, t);

describe('Green day (Monday)', () => {
  const plan = planDay(inputFor(mon));

  it('caps: ≤3 core, ≤2 maintain, exactly 1 joy', () => {
    expect(tier(plan, 'core').length).toBe(3);
    expect(tier(plan, 'maintain').length).toBeLessThanOrEqual(kMaxMaintain);
    expect(tier(plan, 'joy').length).toBe(1);
    expect(plan.showHelpLink).toBe(false);
  });

  it('minimum is the default done bar on every item', () => {
    for (const i of plan.items) expect(i.defaultLevel).toBe('minimum');
  });

  it('time budget × 0.7 is respected (chains/joy excluded)', () => {
    expect(plan.budgetMin).toBe(150);
    expect(plan.usableMin).toBe(105);
    const sum = plan.items.filter((i) => i.tier !== 'chain' && i.tier !== 'joy').reduce((a, i) => a + i.estimatedMin, 0);
    expect(sum).toBe(plan.plannedMin);
    expect(plan.plannedMin).toBeLessThanOrEqual(plan.usableMin);
  });

  it('focus block trimmed to minimum to fit the budget', () => {
    const focus = find(plan, P.focus)!;
    expect(focus.suggestedLevel).toBe('minimum');
    expect(focus.extraWhy.map((w) => w.code)).toContain('timeTrimmed');
  });

  it('IELTS rotation: Monday = writing, why text is bilingual', () => {
    const v = find(plan, P.vocab)!;
    expect(v.ieltsSkill).toBe('writing');
    expect(v.why.code).toBe('ieltsRotation');
    expect(v.why.text.en).toContain('Writing');
    expect(v.why.text.ar).toContain('الكتابة');
  });

  it('walk day with bundled podcast; strength not planned', () => {
    const walk = find(plan, P.walk)!;
    expect(walk.why.code).toBe('walkDay');
    expect(walk.bundleJoyId).toBe('joy_podcast');
    expect(find(plan, P.strength)).toBeUndefined();
  });

  it('weekly IELTS writing due today overflows the core cap into This week', () => {
    expect(plan.thisWeek.map((i) => i.itemId)).toContain(P.ieltsWriting);
  });

  it('chains are ordered and in their sections', () => {
    const morning = itemsIn(plan, 'morningChain').map((i) => i.itemId);
    expect(morning).toEqual([P.wake, 'rs_morning_cleanse', P.sunscreen, 'rs_morning_brush']);
    const night = itemsIn(plan, 'eveningChain').map((i) => i.itemId);
    expect(night).toEqual([P.windDown, P.cleanse, P.dental]);
    expect(plan.items[0]!.section).toBe('morningChain');
    expect(plan.items[plan.items.length - 1]!.section).toBe('eveningChain');
    expect(night.every((id) => find(plan, id)!.tier === 'chain')).toBe(true);
  });

  it('every item carries a why-today line in both languages', () => {
    for (const i of [...plan.items, ...plan.thisWeek]) {
      expect(i.why.text.ar).not.toBe('');
      expect(i.why.text.en).not.toBe('');
      expect(i.why.text.ar).not.toContain('{');
    }
  });

  it('deterministic: same input → identical plan JSON', () => {
    expect(JSON.stringify(DayPlanJ.toJson(planDay(inputFor(mon))))).toBe(JSON.stringify(DayPlanJ.toJson(planDay(inputFor(mon)))));
  });

  it('DayPlan JSON round-trip', () => {
    const back = DayPlanJ.fromJson(JSON.parse(JSON.stringify(DayPlanJ.toJson(plan))));
    expect(JSON.stringify(DayPlanJ.toJson(back))).toBe(JSON.stringify(DayPlanJ.toJson(plan)));
  });
});

describe('Energy modes', () => {
  it('Yellow: max 2 core, non-core at minimum', () => {
    const plan = planDay(inputFor(mon, { energy: 'yellow' }));
    expect(tier(plan, 'core').length).toBeLessThanOrEqual(kMaxCoreYellow);
    for (const i of tier(plan, 'chain')) {
      expect(i.suggestedLevel).toBe('minimum');
      expect(i.extraWhy.map((w) => w.code)).toContain('yellowMinimum');
    }
    expect(tier(plan, 'joy').length).toBe(1);
  });

  it('Red: ≤3 minimum essentials (sleep, care, one tiny thing) + 1 joy, help link', () => {
    const plan = planDay(inputFor(mon, { energy: 'red' }));
    const nonJoy = plan.items.filter((i) => i.tier !== 'joy');
    expect(nonJoy.length).toBeLessThanOrEqual(kRedEssentials);
    expect(nonJoy.every((i) => i.suggestedLevel === 'minimum')).toBe(true);
    expect(nonJoy.map((i) => i.itemId)).toEqual(expect.arrayContaining([P.windDown, P.dental]));
    expect(nonJoy.map((i) => i.itemId)).toContain(P.vocab);
    expect(nonJoy.every((i) => i.why.code === 'redEssential')).toBe(true);
    expect(tier(plan, 'joy').length).toBe(1);
    expect(plan.showHelpLink).toBe(true);
    expect(plan.thisWeek).toEqual([]);
    expect(find(plan, P.vocab)!.ieltsSkill).toBeNull();
  });
});

describe('Strength / walk alternation', () => {
  it('Sunday is strength day 1 of 3 with bundled series', () => {
    const plan = planDay(inputFor(sun));
    const s = find(plan, P.strength)!;
    expect(s.why.code).toBe('strengthDay');
    expect(s.why.args).toEqual({ n: '1', total: '3' });
    expect(s.bundleJoyId).toBe('joy_series');
    expect(find(plan, P.walk)).toBeUndefined();
  });

  it('Tuesday after a Sunday session is day 2 of 3', () => {
    const p = profileOn(sun);
    const plan = planDay(
      inputFor(tue, {
        profile: p,
        logs: [logFor(P.strength, sun), logFor(P.walk, mon), logFor(P.vocab, sun), logFor(P.vocab, mon), logFor(P.focus, sun), logFor(P.focus, mon)],
      }),
    );
    expect(find(plan, P.strength)!.why.args['n']).toBe('2');
  });

  it('same-day conflict keeps one member of the group', () => {
    const p = profileOn(wed);
    const habits = p.habits.map((h) => (h.id === P.strength ? { ...h, schedule: { ...h.schedule, weekdays: [1, 2, 3, 4, 5, 6, 7] } } : h));
    const plan = planDay(inputFor(wed, { profile: p, habits }));
    expect(plan.items.filter((i) => i.itemId === P.walk || i.itemId === P.strength).length).toBe(1);
  });
});

describe('IELTS rotation (GROW-12)', () => {
  it('weekday template', () => {
    expect(rotationSkill(SATURDAY)).toBe('reading');
    expect(rotationSkill(SUNDAY)).toBe('listening');
    expect(rotationSkill(MONDAY)).toBe('writing');
    expect(rotationSkill(TUESDAY)).toBe('speaking');
    expect(rotationSkill(WEDNESDAY)).toBe('mixedReadingListening');
    expect(rotationSkill(THURSDAY)).toBe('writing');
    expect(rotationSkill(THURSDAY, 'speaking')).toBe('speaking');
    expect(rotationSkill(FRIDAY)).toBe('lightReview');
  });

  it('a new mock never switches the extra day by itself — only her confirmed weakest skill does (QA area 3 #4)', () => {
    const mocks = [
      { id: 'm1', date: '2026-09-01', reading: 5, listening: 6, writing: 6, speaking: 6.5, note: '' },
      { id: 'm2', date: '2026-10-01', reading: 6.5, listening: 6, writing: 6.5, speaking: 5.5, note: '' },
    ];
    const base = profileOn(thu).settings;
    const unconfirmed = planDay(inputFor(thu, { mocks, settings: { ...base, ieltsWeakestSkill: 'writing' } }));
    expect(find(unconfirmed, P.vocab)!.ieltsSkill).toBe('writing');
    const confirmed = planDay(inputFor(thu, { mocks, settings: { ...base, ieltsWeakestSkill: 'speaking' } }));
    expect(find(confirmed, P.vocab)!.ieltsSkill).toBe('speaking');
    expect(find(confirmed, P.vocab)!.title.ar).toBe('IELTS — مفردات + المحادثة');
  });

  it('due vocab cards add a spacing reason', () => {
    const card = (id: string, due: string) => ({ id, front: id, back: id, example: '', ease: 2.5, intervalDays: 0, repetitions: 0, due, lapses: 0, lastReviewed: null });
    const plan = planDay(inputFor(sat, { vocab: [card('a', dayKey(fri)), card('b', dayKey(sat)), card('c', dayKey(addDays(sat, 3)))] }));
    const v = find(plan, P.vocab)!;
    expect(v.ieltsSkill).toBe('reading');
    expect(v.extraWhy.find((w) => w.code === 'vocabDue')!.args['count']).toBe('2');
  });
});

describe('Weekly tasks', () => {
  it('Saturday: weekly review in the system tier', () => {
    const r = find(planDay(inputFor(sat)), P.weeklyReview)!;
    expect(r.tier).toBe('system');
    expect(r.why.code).toBe('weeklyReview');
  });

  it('Friday: pinned meal plan shows although Food is in Rest', () => {
    const m = find(planDay(inputFor(fri)), P.mealPlan)!;
    expect(m.tier).toBe('maintain');
    expect(m.why.code).toBe('weeklyDue');
  });

  it('Sunday: admin block (maintain)', () => {
    expect(find(planDay(inputFor(sun)), P.admin)!.tier).toBe('maintain');
  });

  it('carried over from Monday into Tuesday strip', () => {
    const plan = planDay(inputFor(tue, { profile: profileOn(sun) }));
    const w = plan.thisWeek.find((i) => i.itemId === P.ieltsWriting)!;
    expect(w.why.code).toBe('weeklyCarried');
    expect(w.why.text.en).toContain('Monday');
    expect(w.why.text.ar).toContain('الاثنين');
  });

  it('done this week → no longer due', () => {
    const plan = planDay(inputFor(tue, { profile: profileOn(sun), logs: [logFor(P.ieltsWriting, mon, { kind: 'weeklyTask' })] }));
    expect(plan.thisWeek.map((i) => i.itemId)).not.toContain(P.ieltsWriting);
  });

  it('unpinned task in a Rest domain is hidden; no-preferred-day task goes to strip', () => {
    const p = profileOn(fri);
    const weekly = [
      ...p.weeklyTasks.map((t) => (t.id === P.mealPlan ? { ...t, pinned: false } : t)),
      makeWeeklyTask({ id: 'wt_any', domain: 'home', titleAr: 'غسيل', titleEn: 'Laundry' }),
    ];
    const plan = planDay(inputFor(fri, { profile: p, weekly }));
    expect(find(plan, P.mealPlan)).toBeUndefined();
    expect(plan.thisWeek.map((i) => i.itemId)).toContain('wt_any');
  });
});

describe('Budget & learning', () => {
  it('learned durations override estimates (median of recent logs)', () => {
    const p = profileOn(sun);
    const logs = [logFor(P.vocab, sun, { durationMin: 20 }), logFor(P.vocab, mon, { durationMin: 25 }), logFor(P.vocab, tue, { durationMin: 30 })];
    expect(learnedMinutes(logs, P.vocab, 'normal', 45)).toBe(25);
    expect(learnedMinutes(logs, P.vocab, 'minimum', 5)).toBe(5);
    const plan = planDay(inputFor(wed, { profile: p, logs, settings: defaultSettings({ dailyBudgetMin: 400 }) }));
    expect(find(plan, P.vocab)!.estimatedMin).toBe(25);
  });

  it('tiny budget defers what does not fit even at minimum', () => {
    const plan = planDay(inputFor(mon, { settings: defaultSettings({ dailyBudgetMin: 20 }) }));
    expect(plan.usableMin).toBe(14);
    expect(plan.plannedMin).toBeLessThanOrEqual(14);
    expect(plan.deferred.length).toBeGreaterThan(0);
  });

  it('per-weekday budget override', () => {
    const plan = planDay(inputFor(fri, { settings: defaultSettings({ budgetByWeekday: { [FRIDAY]: 300 } }) }));
    expect(plan.budgetMin).toBe(300);
    expect(plan.usableMin).toBe(210);
  });
});

describe('Domains, events, comeback, projects', () => {
  it('Rest domain hides its habits', () => {
    const p = profileOn(mon);
    const domains = p.domains.map((d) => (d.id === 'health' ? { ...d, state: 'rest' as const } : d));
    expect(find(planDay(inputFor(mon, { profile: p, domains })), P.walk)).toBeUndefined();
  });

  it('disabled module domain hides chain steps', () => {
    const p = profileOn(mon);
    const domains = p.domains.map((d) => (d.id === 'care' ? { ...d, enabled: false } : d));
    expect(find(planDay(inputFor(mon, { profile: p, domains })), P.dental)).toBeUndefined();
  });

  it('fixed event pushes an item to the event end', () => {
    const vocabStart = find(planDay(inputFor(mon)), P.vocab)!.startMinute!;
    const shifted = planDay(
      inputFor(mon, {
        events: [{ id: 'e', title: 'Class', startMinute: vocabStart - 10, endMinute: vocabStart + 50, date: null, weekdays: [1], isFocusBlock: false }],
      }),
    );
    expect(find(shifted, P.vocab)!.startMinute).toBe(vocabStart + 50);
  });

  it('comeback after a missed planned day is ranked first with a comeback why', () => {
    const p = profileOn(sun);
    const plan = planDay(
      inputFor(wed, {
        profile: p,
        logs: [
          logFor(P.vocab, sun), logFor(P.vocab, mon), logFor(P.vocab, tue),
          logFor(P.focus, sun), logFor(P.focus, mon), logFor(P.focus, tue),
        ],
      }),
    );
    const walk = find(plan, P.walk)!;
    expect(walk.isComeback).toBe(true);
    expect(walk.why.code).toBe('comeback');
    expect(tier(plan, 'core').map((i) => i.itemId)).toContain(P.walk);
  });

  it('active project next step fills a maintain slot (Home = Maintain)', () => {
    const plan = planDay(
      inputFor(mon, {
        projects: [
          makeProject({
            id: 'p1', domain: 'home', titleAr: 'ترتيب', titleEn: 'Declutter', status: 'active',
            steps: [
              makeProjectStep({ id: 'ps1', titleAr: 'الخزانة', titleEn: 'Closet', durationMin: 10, done: true }),
              makeProjectStep({ id: 'ps2', titleAr: 'المكتب', titleEn: 'Desk', durationMin: 10 }),
            ],
          }),
          makeProject({ id: 'p2', domain: 'home', titleAr: 'فكرة', titleEn: 'Idea', status: 'idea', steps: [makeProjectStep({ id: 'ps3', titleAr: 'x', titleEn: 'x' })] }),
        ],
      }),
    );
    const step = find(plan, 'ps2')!;
    expect(step.tier).toBe('maintain');
    expect(step.why.code).toBe('projectNext');
    expect(find(plan, 'ps3')).toBeUndefined();
  });

  it('no free joy items → no joy slot, joy rotates deterministically', () => {
    expect(tier(planDay(inputFor(mon, { joy: [] })), 'joy')).toEqual([]);
    const joys: JoyItem[] = [
      makeJoyItem({ id: 'a', kind: 'free', titleAr: 'أ', titleEn: 'A' }),
      makeJoyItem({ id: 'b', kind: 'free', titleAr: 'ب', titleEn: 'B' }),
    ];
    const d1 = tier(planDay(inputFor(mon, { joy: joys })), 'joy')[0]!.itemId;
    const d2 = tier(planDay(inputFor(tue, { joy: joys })), 'joy')[0]!.itemId;
    expect(d1).not.toBe(d2);
  });
});

it('a habit referenced by a routine step is never also standalone', () => {
  const p = profileOn(mon);
  const habits = p.habits.map((h) => (h.id === P.dental ? { ...h, routineId: null } : h));
  const plan = planDay(inputFor(mon, { profile: p, habits }));
  expect(plan.items.filter((i) => i.itemId === P.dental).length).toBe(1);
  expect(plan.items.find((i) => i.itemId === P.dental)!.tier).toBe('chain');
});

it('logical day flips at 04:30', () => {
  expect(dayKey(logicalDay(mkDate(2026, 10, 6, 4, 29)))).toBe('2026-10-05');
  expect(dayKey(logicalDay(mkDate(2026, 10, 6, 4, 30)))).toBe('2026-10-06');
  expect(formatHm(-30)).toBe('23:30');
  expect(parseHm('07:05')).toBe(425);
  expect(inWindow(30, 23 * 60, 7 * 60)).toBe(true);
  expect(inWindow(12 * 60, 23 * 60, 7 * 60)).toBe(false);
  expect(inWindow(10, 5, 5)).toBe(false);
  expect(inWindow(10, 5, 20)).toBe(true);
  expect(stableHash('abc')).toBe(stableHash('abc'));
  expect(median([])).toBeNull();
  expect(median([1, 2, 3, 4])).toBe(2.5);
});
