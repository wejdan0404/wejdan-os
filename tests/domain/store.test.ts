/**
 * Port of test/state/life_controller_test.dart + ui2_state_test.dart + qa/qa_state_test.dart
 * (store over InMemoryLifeRepository with a pinned clock), plus the web-only features.
 */
import { describe, expect, it } from 'vitest';
import {
  type Habit, type LifeStore, type PlanItem, type Settings, InMemoryLifeRepository, activeExperiment, capacityViolations,
  coreHabits, createLifeStore, currentBudgetCycle, currentChapter, currentSeason, dateOnly, dayKey, domainMomentum,
  experimentResult, forgivingStreakOf, freshStartToday, habitStrengthOf, inboxCount, itemsIn, itemsOfTier, kDailySparkCap,
  kSparkExperiment, kSparkWeeklyReview, kUndoWindowMs, logsOn, mkDate, momentumOf, openInbox, postponedTasks,
  productStepId, productsBySlot, recoveryTriggers, reminderPlanFor, sparkLedger, sparksBalance, sparksEarnedOn, suggestionsFor,
  tasksForDay, upcomingDuesFor, vocabDue, VocabGrade,
} from '../../src/domain';
import { P, buildPersona } from './fixtures/personaProfile';
import { library, simpleHabit } from './helpers';

interface Ctx {
  store: LifeStore;
  repo: InMemoryLifeRepository;
  setNow: (d: Date) => void;
  advance: (ms: number) => void;
}

/** Persona profile (her Flutter starter), Flutter-like: auto plan mode, reminders on. */
async function personaStore(at: Date = mkDate(2026, 10, 5, 8), settings: Partial<Settings> = {}): Promise<Ctx> {
  let now = at;
  const repo = new InMemoryLifeRepository();
  await repo.open();
  const persona = buildPersona(library, dateOnly(at));
  await repo.seed({ library, profile: { ...persona, products: [], settings: { ...persona.settings, ...settings } } });
  const store = await createLifeStore({ repo, now: () => now, library });
  return { store, repo, setNow: (d) => (now = d), advance: (ms) => (now = new Date(now.getTime() + ms)) };
}

/** First-run neutral app. */
async function neutralStore(at: Date = mkDate(2026, 10, 5, 8)): Promise<Ctx> {
  let now = at;
  const repo = new InMemoryLifeRepository();
  const store = await createLifeStore({ repo, now: () => now, library });
  return { store, repo, setNow: (d) => (now = d), advance: (ms) => (now = new Date(now.getTime() + ms)) };
}

const plan = (st: LifeStore) => st.todayView().plan;
const item = (st: LifeStore, id: string): PlanItem => {
  const i = plan(st).items.find((x) => x.itemId === id);
  if (!i) throw new Error(`no ${id} in plan`);
  return i;
};

describe('LifeStore (port of life_controller_test)', () => {
  it('boot: snapshot, today plan, opened day recorded', async () => {
    const { store } = await personaStore();
    const s = store.getSnapshot();
    const today = store.today();
    expect(s.habits.length).toBe(11);
    expect(s.settings.language).toBe('ar');
    expect(s.domains.length).toBe(16); // the retired aquarium is hidden
    expect(currentSeason(s)!.id).toBe('s_1');
    expect(s.seasons.length).toBe(1);
    expect(coreHabits(s).length).toBe(4);
    expect(store.todayView().energy).toBe('green');
    expect(itemsOfTier(plan(store), 'core').length).toBe(3);
    expect(s.openedDays).toContain('2026-10-05');
    expect(s.actions.length).toBe(106); // 3 retired aquarium actions hidden
    expect(s.engineRules.length).toBe(23);
    expect(s.goals.length).toBe(5);
    expect(s.projects).toEqual([]);
    expect(s.joyItems.length).toBe(6);
    expect(capacityViolations(s)).toEqual([]);
    expect(recoveryTriggers(s, today)).toEqual([]);
    expect(store.persistent).toBe(false);
  });

  it('complete → sparks → undo within 10 s; not after', async () => {
    const { store, repo, advance } = await personaStore();
    const r = await store.completeItem(item(store, P.vocab), 'normal', { durationMin: 30, enjoyment: 4 });
    expect(r.award.amount).toBe(2);
    expect(r.isComeback).toBe(false);
    expect(r.undoUntil.getTime()).toBe(mkDate(2026, 10, 5, 8).getTime() + kUndoWindowMs);
    const s = () => store.getSnapshot();
    expect(sparksBalance(s())).toBe(2);
    expect(sparksEarnedOn(s(), store.today())).toBe(2);
    expect(logsOn(s(), store.today()).get(P.vocab)!.level).toBe('normal');
    expect(sparkLedger(s())[0]!.amount).toBe(2);

    advance(5000);
    expect(await store.undo(r.log.id)).toBe(true);
    expect(sparksBalance(s())).toBe(0);
    expect(logsOn(s(), store.today()).size).toBe(0);
    expect(await repo.logs.all()).toEqual([]);
    expect(await store.undo('missing')).toBe(false);

    const r2 = await store.completeItem(item(store, P.walk), 'bonus');
    advance(11_000);
    expect(await store.undo(r2.log.id)).toBe(false);
    expect(sparksBalance(s())).toBe(3);
    expect((await store.skipItem(item(store, P.focus))).level).toBe('skipped');
    expect(sparksBalance(s())).toBe(3);
  });

  it('daily cap 20 holds across many completions', async () => {
    const { store } = await personaStore();
    for (const i of plan(store).items.filter((x) => x.tier !== 'joy')) await store.completeItem(i, 'bonus');
    expect(sparksEarnedOn(store.getSnapshot(), store.today())).toBe(kDailySparkCap);
  });

  it('energy check switches the plan to Red', async () => {
    const { store } = await personaStore();
    await store.setEnergy('red');
    expect(store.todayView().energy).toBe('red');
    expect(store.todayView().showHelpLink).toBe(true);
  });

  it('redeem needs enough sparks; strength check feeds strength', async () => {
    const { store, repo } = await personaStore();
    const poor = await store.redeem('joy_beans');
    expect(poor.ok).toBe(false);
    expect(poor.shortBy).toBe(60);
    await repo.sparkTxns.put({ id: 'seed', date: '2026-10-01', amount: 70, reason: 'adjustment', refId: null, at: null });
    await store.reload();
    expect((await store.redeem('joy_beans')).ok).toBe(true);
    const s = () => store.getSnapshot();
    const today = store.today();
    expect(sparksBalance(s())).toBe(10);
    await store.recordStrengthCheck(P.walk, [4, 4, 4, 4]);
    expect(habitStrengthOf(s(), P.walk, today)!.srbai).toBe(75);
    expect(habitStrengthOf(s(), 'nope', today)).toBeNull();
    expect(momentumOf(s(), P.walk, today)).toBe(0);
    expect(momentumOf(s(), 'nope', today)).toBe(0);
    expect(domainMomentum(s(), 'health', today)).toBe(0);
    await store.updateSettings({ ...s().settings, forgivingStreak: false });
    expect(forgivingStreakOf(s(), P.walk, today)).toBeNull();
    await store.updateSettings({ ...s().settings, forgivingStreak: true });
    expect(forgivingStreakOf(s(), P.walk, today)!.length).toBe(0);
  });

  it('capacity guard blocks the 8th core habit and a 4th Grow domain unless forced', async () => {
    const { store } = await personaStore();
    const s = () => store.getSnapshot();
    for (let i = 0; i < 3; i++) expect(await store.upsertHabit(simpleHabit({ id: `x${i}`, domain: 'ielts' }))).toEqual([]);
    const v = await store.upsertHabit(simpleHabit({ id: 'x3', domain: 'ielts' }));
    expect(v.map((x) => x.rule)).toEqual(['coreHabits']);
    expect(s().habits.some((h) => h.id === 'x3')).toBe(false);
    await store.upsertHabit(simpleHabit({ id: 'x3', domain: 'ielts' }), true);
    expect(capacityViolations(s()).map((x) => x.rule)).toEqual(['coreHabits']);
    await store.deleteHabit('x3');
    expect(capacityViolations(s())).toEqual([]);

    expect((await store.setDomainState('learning', 'grow')).map((x) => x.rule)).toEqual(['growDomains']);
    await store.setDomainState('health', 'maintain');
    expect(currentSeason(s())!.states.health).toBe('maintain');
    await store.setDomainEnabled('faith', false);
    expect(s().domains.find((d) => d.id === 'faith')!.enabled).toBe(false);
    await store.setDomainEnabled('faith', true);
    expect(s().domains.find((d) => d.id === 'faith')!.enabled).toBe(true);

    const s2 = await store.startNewSeason('موسم', 'Season 2');
    expect(currentSeason(s())!.id).toBe(s2.id);
    expect(s().seasons.filter((x) => x.endedDate == null).length).toBe(1);
  });

  it('recovery: propose → accept → comeback ×2 on next completion, flag cleared', async () => {
    const { store } = await personaStore();
    const change = store.proposeRecovery(P.walk, 'tooBig')!;
    expect(change.type).toBe('shrinkToMinimum');
    const h = (await store.acceptDesignChange(change))!;
    expect(h.comebackPending).toBe(true);
    expect(item(store, P.walk).suggestedLevel).toBe('minimum');
    const r = await store.completeItem(item(store, P.walk), 'minimum');
    expect(r.isComeback).toBe(true);
    expect(r.award.amount).toBe(2);
    expect(store.getSnapshot().habits.find((x) => x.id === P.walk)!.comebackPending).toBe(false);
  });

  it('QA: re-levelling a recovery comeback keeps the ×2 bonus', async () => {
    const { store } = await personaStore();
    await store.acceptDesignChange(store.proposeRecovery(P.walk, 'tooBig')!);
    const first = await store.completeItem(item(store, P.walk), 'bonus');
    expect(first.award.amount).toBe(6);
    await store.undo(first.log.id, true);
    expect((await store.completeItem(item(store, P.walk), 'bonus')).award.amount).toBe(6);
  });

  it('QA: free joy earns 0; cap holds across check/uncheck/re-check', async () => {
    const { store } = await personaStore();
    const joy = itemsOfTier(plan(store), 'joy')[0]!;
    expect((await store.completeItem(joy, 'normal')).award.amount).toBe(0);
    for (let i = 0; i < 15; i++) {
      const r = await store.completeItem(item(store, P.vocab), 'bonus');
      await store.undo(r.log.id, true);
    }
    for (const id of [P.vocab, P.walk, P.focus]) await store.completeItem(item(store, id), 'bonus');
    expect(sparksEarnedOn(store.getSnapshot(), store.today())).toBeLessThanOrEqual(kDailySparkCap);
    expect(sparksBalance(store.getSnapshot())).toBe(9);
  });

  it('weekly review earns 5; experiments one at a time and earn 3', async () => {
    const { store } = await personaStore(mkDate(2026, 10, 10, 20));
    const r = await store.completeItem(item(store, P.weeklyReview), 'minimum');
    expect(r.award.amount).toBe(kSparkWeeklyReview);
    expect(sparkLedger(store.getSnapshot())[0]!.reason).toBe('weeklyReview');
    const e = (id: string, variable: string) => ({
      id, habitId: P.vocab, titleAr: 'ت', titleEn: 'E', variable, status: 'planned' as const, startDate: null, lengthDays: 14,
      startedAt: null, endedDate: null, kept: null, note: '',
    });
    expect(await store.startExperiment(e('e1', 'night') as never)).toBe(true);
    expect(await store.startExperiment(e('e2', 'podcast') as never)).toBe(false);
    const s = () => store.getSnapshot();
    expect(activeExperiment(s())!.id).toBe('e1');
    expect(experimentResult(s(), 'e1', store.today())).not.toBeNull();
    expect(experimentResult(s(), 'nope', store.today())).toBeNull();
    expect((await store.finishExperiment('e1', true)).amount).toBe(kSparkExperiment);
    expect(activeExperiment(s())).toBeNull();
  });

  it('vocab, mock, driving, money, admin, events, routines, weekly tasks, goals', async () => {
    const { store } = await personaStore();
    const s = () => store.getSnapshot();
    const card = await store.addVocabCard('mitigate', 'make less severe');
    expect(vocabDue(s(), store.today()).length).toBe(1);
    await store.reviewVocab(card.id, VocabGrade.good);
    expect(vocabDue(s(), store.today())).toEqual([]);
    await store.addMockTest({ id: 'm', date: '2026-10-01', reading: null, listening: null, writing: null, speaking: 5, note: '' });
    await store.addDrivingSession({ id: 'd', date: '2026-10-05', minutes: 30, conditions: [], kind: 'practice', note: '' } as never);
    await store.upsertEnvelope({ id: 'e', titleAr: 'أكل', titleEn: 'Food', month: '2026-10', planned: 0, spent: 0 });
    await store.upsertBill({ id: 'b', title: 'Phone', amount: 50, dueDay: 3, isSubscription: false, active: true });
    await store.upsertBnpl({ id: 'n', title: 'X', provider: 'Y', instalmentAmount: 10, dueDates: [], paidDates: [] });
    await store.upsertWish({ id: 'w', title: 'Bag', addedDate: '2026-10-05', price: null, coolingOffDays: 7, decision: null });
    await store.upsertAdminDoc({ id: 'a', name: 'ID', expiry: null, remindDaysBefore: 30, note: '' });
    await store.upsertFixedEvent({ id: 'f', title: 'Class', startMinute: 600, endMinute: 660, weekdays: [1], isFocusBlock: false } as never);
    const x = s();
    for (const l of [x.mockTests, x.drivingSessions, x.moneyEnvelopes, x.bills, x.bnplItems, x.wishItems, x.adminDocs, x.fixedEvents]) expect(l.length).toBe(1);
    await store.deleteFixedEvent('f');
    expect(s().fixedEvents).toEqual([]);

    await store.upsertRoutine({ ...s().routines[0]!, active: false });
    expect(itemsIn(plan(store), 'morningChain')).toEqual([]);
    const wt = s().weeklyTasks[0]!;
    await store.upsertWeeklyTask({ ...wt, active: false });
    expect(store.todayView().thisWeek.map((i) => i.itemId)).not.toContain(wt.id);
    await store.upsertGoal({ ...s().goals[0]!, targetNote: 'mine' });
    expect(s().goals[0]!.targetNote).toBe('mine');
  });

  it('nudges: reminder plan from the store; 3 ignores mute the item', async () => {
    const { store } = await personaStore();
    expect(reminderPlanFor(store.getSnapshot(), store.today()).nudges.length).toBeGreaterThan(0);
    for (let i = 0; i < 3; i++) await store.recordNudgeResponse(P.walk, 'ignored');
    expect(reminderPlanFor(store.getSnapshot(), store.today()).muted.map((n) => n.itemId)).toEqual([P.walk]);
  });

  it('export → import (confirm), delete-all re-seeds neutral, backups kept', async () => {
    const { store } = await personaStore();
    await store.completeItem(item(store, P.vocab), 'normal');
    const data = await store.exportAll();
    await store.deleteAllAndReseed();
    const s = () => store.getSnapshot();
    expect(s().logs).toEqual([]);
    expect(s().habits).toEqual([]); // neutral seed
    expect(sparksBalance(s())).toBe(0);
    await expect(store.importAll(data, { confirm: false })).rejects.toThrow();
    const preview = await store.previewImport(data);
    expect(preview.ok).toBe(true);
    expect(preview.counts['logs']).toBe(1);
    await store.importAll(data, { confirm: true });
    expect(s().logs.length).toBe(1);
    expect(s().habits.length).toBe(11);
    expect(sparksBalance(s())).toBe(2);
    expect((await store.listBackups()).map((b) => b.reason)).toEqual(expect.arrayContaining(['before-delete-all', 'before-import']));
    expect(dayKey(store.today())).toBe('2026-10-05');
  });

  it('joy earns no sparks; project step done/undo; new habit createdDate; 00:30 counts for yesterday', async () => {
    const { store, setNow } = await personaStore();
    const s = () => store.getSnapshot();
    await store.upsertProject({
      id: 'p', domain: 'career', titleAr: 'ب', titleEn: 'P', status: 'active', isCourse: false, dueDate: null, notes: '',
      steps: [{ id: 'ps1', titleAr: 'خ', titleEn: 'S1', done: false, doneDate: null, durationMin: 5 }],
    } as never);
    const r = await store.completeItem({ itemId: 'ps1', kind: 'projectStep' }, 'normal');
    expect(s().projects[0]!.steps[0]!.done).toBe(true);
    expect(s().projects[0]!.steps[0]!.doneDate).toBe('2026-10-05');
    expect(await store.undo(r.log.id)).toBe(true);
    expect(s().projects[0]!.steps[0]!.done).toBe(false);

    await store.upsertHabit(simpleHabit({ id: 'fresh', domain: 'home' }));
    expect(s().habits.find((h) => h.id === 'fresh')!.createdDate).toBe('2026-10-05');

    setNow(mkDate(2026, 10, 6, 0, 30));
    expect(dayKey(store.today())).toBe('2026-10-05');
    const late = await store.completeItem(item(store, P.dental), 'normal');
    expect(late.log.date).toBe('2026-10-05');
    expect(sparkLedger(s())[0]!.date).toBe('2026-10-05');
  });
});

describe('LifeStore (port of ui2_state_test)', () => {
  it('older install gets the library refreshed on boot; user data kept', async () => {
    const repo = new InMemoryLifeRepository();
    await createLifeStore({ repo, now: () => mkDate(2026, 10, 5, 8), library });
    await repo.write('meta', 'libraryVersion', { v: '1' });
    await repo.actions.putAll((await repo.actions.all()).map((a) => ({ ...a, ar: null })));
    const wt = (await repo.weeklyTasks.all())[0]!;
    await repo.weeklyTasks.put({ ...wt, durationMin: 77 });
    expect(await repo.libraryOutdated()).toBe(true);
    await createLifeStore({ repo, now: () => mkDate(2026, 10, 6, 8), library });
    expect((await repo.actions.all()).every((a) => a.ar != null)).toBe(true);
    expect((await repo.weeklyTasks.get(wt.id))!.durationMin).toBe(77);
    expect(await repo.libraryOutdated()).toBe(false);
  });

  it('weekly review: one chapter per week, Sparks once, module state survives export/import', async () => {
    const { store, setNow } = await personaStore(mkDate(2026, 10, 10, 20));
    const s = () => store.getSnapshot();
    expect(currentChapter(s(), store.today())).toBe(1);
    const before = sparksBalance(s());
    const draft = { chapterTitle: 'test', wins: [], blockers: [], top3: ['test'], experimentId: null, durationSec: 300 };
    expect((await store.saveWeeklyReview(draft)).amount).toBe(5);
    expect(sparksBalance(s())).toBe(before + 5);
    expect((await store.saveWeeklyReview({ ...draft, top3: [] })).amount).toBe(0);
    expect(s().weeklyReviews.map((r) => r.id)).toEqual(['2026-10-04']);
    expect(currentChapter(s(), store.today())).toBe(1);
    setNow(mkDate(2026, 10, 12, 9));
    expect(currentChapter(s(), store.today())).toBe(2);

    await store.updateModuleState({ ...s().moduleState, drivingStepsDone: [0], autoSaveDay: 27 });
    const data = await store.exportAll();
    await store.deleteAllAndReseed();
    expect(s().moduleState.autoSaveDay).toBeNull();
    await store.importAll(data, { confirm: true });
    expect(s().moduleState.autoSaveDay).toBe(27);
    expect(s().weeklyReviews.length).toBe(1);
  });

  it('fresh start card: season start shows, dismiss hides for the day', async () => {
    const { store } = await personaStore(mkDate(2026, 10, 18, 9));
    expect(freshStartToday(store.getSnapshot(), store.today())?.kind).toBe('newSeason');
    await store.updateModuleState({ ...store.getSnapshot().moduleState, freshStartDismissed: '2026-10-18' });
    expect(freshStartToday(store.getSnapshot(), store.today())).toBeNull();
  });

  it('errands, cycle log, deletes and dues', async () => {
    const { store, repo } = await personaStore(mkDate(2026, 10, 5, 9));
    const s = () => store.getSnapshot();
    await store.upsertErrand({ id: 'e', title: 'test', done: false, addedDate: null });
    await store.upsertErrand({ id: 'e', title: 'test', done: true, addedDate: null });
    expect(s().errands.map((e) => e.done)).toEqual([true]);
    await store.deleteErrand('e');
    expect(s().errands).toEqual([]);
    const c = await store.addCycleEntry('start', { note: 'test' });
    expect(c.date).toBe('2026-10-05');
    expect((await repo.cycleEntries.all()).length).toBe(1);
    await store.deleteCycleEntry(c.id);
    expect(s().cycleEntries).toEqual([]);
    await store.upsertBill({ id: 'b', title: 'test', amount: 1, dueDay: 9, isSubscription: false, active: true });
    await store.upsertAdminDoc({ id: 'd', name: 'test', expiry: '2026-10-20', remindDaysBefore: 30, note: '' });
    await store.setPayday(28);
    expect(upcomingDuesFor(s(), store.today()).map((d) => d.refId)).toEqual(['b', 'd', 'payday']);
    await store.deleteBill('b');
    await store.deleteAdminDoc('d');
    expect(upcomingDuesFor(s(), store.today()).map((d) => d.kind)).toEqual(['payday']);
  });
});

// ------------------------------------------------------------------------- web features
describe('Neutral first run', () => {
  it('seeds only the neutral profile; reminders off; suggestion mode; product routines', async () => {
    const { store } = await neutralStore();
    const s = store.getSnapshot();
    expect(s.habits).toEqual([]);
    expect(s.goals).toEqual([]);
    expect(s.joyItems).toEqual([]);
    expect(s.settings.planMode).toBe('suggest');
    expect(s.settings.notificationsEnabled).toBe(false);
    expect(reminderPlanFor(s, store.today()).nudges).toEqual([]);
    const v = store.todayView();
    expect(v.mode).toBe('suggest');
    expect(v.plan.items).toEqual([]); // nothing is on her day until she accepts it
    const ids = v.suggestions.map((x) => x.item.itemId);
    // the seeded generic products are suggestions only — no routine until she adds her own
    expect(ids).not.toContain(productStepId('pr_am_cleanser'));
    expect(ids).not.toContain(productStepId('pr_pm_floss'));
    expect(productsBySlot(s).am).toEqual([]);
    expect(s.products.filter((p) => p.slot === 'am' && p.placeholder).map((p) => p.order)).toEqual([1, 2, 3, 4]);
  });
});

describe('Suggestion mode (nothing hidden, nothing moved silently)', () => {
  const suggest = () => personaStore(mkDate(2026, 10, 5, 8), { planMode: 'suggest' });

  it('every candidate is visible with a fit reason; trimmed / over-cap items stay offered', async () => {
    const { store } = await suggest();
    const set = suggestionsFor(store.getSnapshot(), store.today());
    const auto = new Set(set.autoPlan.items.map((i) => i.id));
    expect(set.suggestions.length).toBeGreaterThan(auto.size);
    for (const x of set.suggestions) expect(['fits', 'trimmed', 'overCap', 'overBudget', 'redRest', 'weekOpen']).toContain(x.fit);
    for (const i of set.autoPlan.items.filter((i) => i.tier !== 'joy')) expect(set.suggestions.some((x) => x.item.id === i.id), i.id).toBe(true);
    expect(set.suggestions.some((x) => x.fit === 'overCap' && !x.inAutoPlan)).toBe(true);
  });

  it('accept / set level / unaccept / decline are all reversible', async () => {
    const { store } = await suggest();
    const v0 = store.todayView();
    const first = v0.suggestions.find((x) => x.group === 'core')!;
    expect(await store.acceptSuggestion(first.item.id, { level: 'minimum' })).toBe(true);
    let v = store.todayView();
    expect(v.plan.items.map((i) => i.id)).toEqual([first.item.id]);
    expect(v.plan.items[0]!.suggestedLevel).toBe('minimum');
    expect(v.suggestions.some((x) => x.item.id === first.item.id)).toBe(false);
    await store.setPlannedLevel(first.item.id, 'bonus');
    expect(store.todayView().plan.items[0]!.suggestedLevel).toBe('bonus');
    await store.unaccept(first.item.id);
    v = store.todayView();
    expect(v.plan.items).toEqual([]);
    expect(v.suggestions.some((x) => x.item.id === first.item.id)).toBe(true);

    await store.declineSuggestion(first.item.id);
    v = store.todayView();
    expect(v.suggestions.some((x) => x.item.id === first.item.id)).toBe(false);
    expect(v.plan.deferred.map((i) => i.id)).toContain(first.item.id); // still visible
    expect(await store.acceptSuggestion(first.item.id)).toBe(true);
    expect(store.todayView().plan.deferred).toEqual([]);
  });

  it('accept-all shortcut = the auto plan; acceptMany', async () => {
    const { store } = await suggest();
    const n = await store.acceptAutoPlan();
    const auto = suggestionsFor(store.getSnapshot(), store.today()).autoPlan;
    expect(n).toBe(auto.items.length);
    expect(new Set(store.todayView().plan.items.map((i) => i.id))).toEqual(new Set(auto.items.map((i) => i.id)));
    const { store: b } = await suggest();
    const chain = b.todayView().suggestions.filter((x) => x.group === 'chain').map((x) => x.item.id);
    expect(await b.acceptMany([...chain, 'nope'])).toBe(chain.length);
  });

  it('«بعدين»: move, restore, drop + undo; survives across days', async () => {
    const { store, setNow, advance } = await suggest();
    const id = store.todayView().suggestions.find((x) => x.group === 'core')!.item.id;
    await store.acceptSuggestion(id);
    expect(await store.moveToLater(id)).toBe(true);
    let v = store.todayView();
    expect(v.plan.items).toEqual([]);
    expect(v.later.map((i) => i.id)).toEqual([id]);
    expect(v.suggestions.some((x) => x.item.id === id)).toBe(false);
    setNow(mkDate(2026, 10, 7, 9));
    expect(store.todayView().later.map((i) => i.id)).toEqual([id]);
    expect(await store.restoreFromLater(id)).toBe(true);
    v = store.todayView();
    expect(v.later).toEqual([]);
    expect(v.plan.items.map((i) => i.id)).toEqual([id]);
    await store.moveToLater(id);
    const tok = (await store.dropFromLater(id))!;
    expect(store.todayView().later).toEqual([]);
    advance(3000);
    expect(await store.undoDelete(tok.token)).toBe(true);
    expect(store.todayView().later.map((i) => i.id)).toEqual([id]);
  });

  it('busy day is a notice only — nothing is removed', async () => {
    const { store } = await suggest();
    await store.acceptMany(store.todayView().suggestions.map((x) => x.item.id));
    const v = store.todayView();
    expect(v.load.busy).toBe(true);
    expect(v.load.overByMin).toBeGreaterThan(0);
    expect(v.plan.items.length).toBe(suggestionsFor(store.getSnapshot(), store.today()).suggestions.length);
  });
});

describe('Evening Shutdown decisions', () => {
  it('plan items: «بكرة» → tomorrow\'s plan; «بعدين» → later; let go → skipped log', async () => {
    const { store, setNow } = await personaStore(mkDate(2026, 10, 5, 20), { planMode: 'suggest' });
    const core = store.todayView().suggestions.filter((x) => x.group === 'core').map((x) => x.item);
    for (const i of core.slice(0, 3)) await store.acceptSuggestion(i.id);
    const [a, b, c] = core;
    await store.eveningDecision({ planItemId: a!.id }, 'tomorrow');
    await store.eveningDecision({ planItemId: b!.id }, 'later');
    await store.eveningDecision({ planItemId: c!.id }, 'letGo');
    expect(store.getSnapshot().later.map((i) => i.id)).toEqual([b!.id]);
    expect(logsOn(store.getSnapshot(), store.today()).get(c!.itemId)!.level).toBe('skipped');
    expect(sparksBalance(store.getSnapshot())).toBe(0);
    setNow(mkDate(2026, 10, 6, 8));
    expect(store.todayView().plan.items.map((i) => i.id)).toContain(a!.id);
  });

  it('tasks: «بكرة» → planned tomorrow; «بعدين» → postponed; let go → back to the inbox (never cancelled)', async () => {
    const { store } = await neutralStore(mkDate(2026, 10, 5, 20));
    const t1 = await store.addTask({ title: 'أ', dueDate: '2026-10-05' });
    const t2 = await store.addTask({ title: 'ب', dueDate: '2026-10-05' });
    const t3 = await store.addTask({ title: 'ج', dueDate: '2026-10-05' });
    expect(tasksForDay(store.getSnapshot(), store.today()).length).toBe(3);
    await store.eveningDecision({ taskId: t1.id }, 'tomorrow');
    await store.eveningDecision({ taskId: t2.id }, 'later');
    await store.eveningDecision({ taskId: t3.id }, 'letGo');
    const get = (id: string) => store.getSnapshot().tasks.find((t) => t.id === id)!;
    expect(get(t1.id)).toMatchObject({ status: 'planned', dueDate: '2026-10-06' });
    expect(get(t2.id).status).toBe('postponed');
    expect(get(t3.id)).toMatchObject({ status: 'inbox', dueDate: null });
    expect(postponedTasks(store.getSnapshot()).map((t) => t.id)).toEqual([t2.id]);
  });
});

describe('Inbox and tasks', () => {
  it('quick add → convert to task / project / note; archive; delete + undo', async () => {
    const { store, advance } = await neutralStore();
    const s = () => store.getSnapshot();
    const a = await store.quickAdd('  أرتب الدرج  ');
    const b = await store.quickAdd('فكرة مشروع', 'idea');
    const c = await store.quickAdd('رابط مقال', 'link', { url: 'https://example.com' });
    const d = await store.quickAdd('ملاحظة');
    expect(a.title).toBe('أرتب الدرج');
    expect(inboxCount(s())).toBe(4);

    const t = (await store.convertInbox(a.id, 'task', { dueDate: '2026-10-06' })) as { id: string; status: string; sourceInboxId: string };
    expect(t.status).toBe('planned');
    expect(t.sourceInboxId).toBe(a.id);
    const p = (await store.convertInbox(b.id, 'project')) as { id: string; status: string };
    expect(p.status).toBe('idea');
    expect(s().projects.map((x) => x.id)).toContain(p.id);
    const n = (await store.convertInbox(c.id, 'note')) as { id: string; title: string; body: string; tag: string };
    // A real note is created (QA area 5 #1): the link survives in the body and the item points at it.
    expect(s().notes.map((x) => x.id)).toContain(n.id);
    expect(n).toMatchObject({ title: 'رابط مقال', tag: 'reference' });
    expect(n.body).toContain('https://example.com');
    expect(s().inbox.find((x) => x.id === c.id)).toMatchObject({ archived: true, convertedTo: { type: 'note', id: n.id } });
    expect(s().inbox.find((x) => x.id === a.id)!.convertedTo).toEqual({ type: 'task', id: t.id });
    expect(openInbox(s()).map((x) => x.id)).toEqual([d.id]);

    await store.archiveInbox(d.id);
    expect(openInbox(s())).toEqual([]);
    await store.archiveInbox(d.id, false);
    const tok = (await store.deleteInbox(d.id))!;
    expect(s().inbox.some((x) => x.id === d.id)).toBe(false);
    advance(9000);
    expect(await store.undoDelete(tok.token)).toBe(true);
    expect(s().inbox.some((x) => x.id === d.id)).toBe(true);
  });

  it('task statuses: inbox → planned → in progress → done; postpone; back to inbox', async () => {
    const { store } = await neutralStore();
    const t = await store.addTask({ title: 'مهمة' });
    expect(t.status).toBe('inbox');
    expect((await store.planTask(t.id, '2026-10-05', 600))!).toMatchObject({ status: 'planned', time: 600 });
    expect((await store.updateTask(t.id, { status: 'in_progress' }))!.status).toBe('in_progress');
    const done = (await store.completeTask(t.id))!;
    expect(done.status).toBe('done');
    expect(done.completedAt).not.toBeNull();
    expect((await store.postponeTask(t.id, '2026-10-09'))!).toMatchObject({ status: 'postponed', postponedTo: '2026-10-09', completedAt: null });
    expect((await store.returnTaskToInbox(t.id))!).toMatchObject({ status: 'inbox', dueDate: null, postponedTo: null });
    // completing a task logs nothing toward Sparks
    expect((await store.completeItem({ itemId: t.id, kind: 'task' }, 'normal')).award.amount).toBe(0);
  });
});

describe('Undoable deletes (10 s)', () => {
  it('restore within the window; expired after; unknown token', async () => {
    const { store, advance } = await neutralStore();
    const s = () => store.getSnapshot();
    const t = await store.addTask({ title: 'x' });
    const tok = (await store.deleteTask(t.id))!;
    expect(tok.expiresAt).toBe(mkDate(2026, 10, 5, 8).getTime() + kUndoWindowMs);
    expect(s().tasks).toEqual([]);
    advance(kUndoWindowMs + 1);
    expect(await store.undoDelete(tok.token)).toBe(false);
    expect(s().tasks).toEqual([]);
    expect(await store.undoDelete('nope')).toBe(false);
    expect(await store.deleteTask('missing')).toBeNull();

    const prodTok = (await store.deleteProduct('pr_am_cleanser'))!;
    expect(prodTok.label).toBe('غسول');
    expect(await store.undoDelete(prodTok.token)).toBe(true);
    expect(s().products.some((p) => p.id === 'pr_am_cleanser')).toBe(true);
    expect(await store.undoDelete(prodTok.token)).toBe(false); // single use
  });

  it('restored records persist', async () => {
    const { store, repo } = await neutralStore();
    const h: Habit = simpleHabit({ id: 'hh', domain: 'home' });
    await store.upsertHabit(h);
    const tok = (await store.deleteHabit('hh'))!;
    expect(await repo.habits.get('hh')).toBeNull();
    await store.undoDelete(tok.token);
    expect(await repo.habits.get('hh')).not.toBeNull();
  });
});

describe('Payday and products', () => {
  it('budget cycle follows payday (1 and 25)', async () => {
    const { store, setNow } = await neutralStore(mkDate(2026, 10, 20, 9));
    let c = currentBudgetCycle(store.getSnapshot(), store.today());
    expect([dayKey(c.start), dayKey(c.end), dayKey(c.nextPayday), c.daysToPayday]).toEqual(['2026-10-01', '2026-10-31', '2026-11-01', 12]);
    await store.setPayday(25);
    // the cycle in progress keeps its start (QA area4 #2): it now runs until the new payday
    c = currentBudgetCycle(store.getSnapshot(), store.today());
    expect([dayKey(c.start), dayKey(c.end), dayKey(c.nextPayday), c.key, c.paydayChangedOn]).toEqual([
      '2026-10-01', '2026-10-24', '2026-10-25', '2026-10', '2026-10-20',
    ]);
    setNow(mkDate(2026, 10, 25, 9));
    c = currentBudgetCycle(store.getSnapshot(), store.today());
    expect(c.isPayday).toBe(true);
    expect(dayKey(c.start)).toBe('2026-10-25');
    // a second cycle starting in October gets a distinct key
    expect(c.key).toBe('2026-10-25');
    expect(c.paydayChangedOn).toBeNull();
    expect(upcomingDuesFor(store.getSnapshot(), store.today(), 0).map((d) => d.kind)).toEqual(['payday']);
  });

  it('products drive the AM/PM routines; edit, reorder, deactivate; completion logs per product step', async () => {
    const { store } = await neutralStore();
    const s = () => store.getSnapshot();
    // she adopts the seeded suggestions as her own products first
    for (const p of s().products) await store.upsertProduct({ ...p, placeholder: false });
    const am = productsBySlot(s()).am;
    await store.upsertProduct({ ...am[0]!, name: 'غسول لطيف' });
    expect(s().products.find((p) => p.id === am[0]!.id)!.placeholder).toBe(false);
    await store.reorderProducts('am', [am[2]!.id, am[0]!.id, am[1]!.id, am[3]!.id]);
    expect(productsBySlot(s()).am.map((p) => p.id)).toEqual([am[2]!.id, am[0]!.id, am[1]!.id, am[3]!.id]);
    await store.upsertProduct({ ...s().products.find((p) => p.id === am[1]!.id)!, active: false });
    const amSteps = store.todayView().suggestions.filter((x) => x.item.section === 'morningChain').map((x) => x.item.itemId);
    expect(amSteps).not.toContain(productStepId(am[1]!.id));
    expect(amSteps).toContain(productStepId(am[0]!.id));
    const r = await store.completeItem({ itemId: productStepId(am[0]!.id), kind: 'routineStep' }, 'normal');
    expect(r.log.itemId).toBe('ps_' + am[0]!.id);
  });
});

describe('Recovery for any habit', () => {
  it('startRecovery works without the 3-miss trigger; unknown habit → null', async () => {
    const { store } = await personaStore();
    const t = store.startRecovery(P.vocab)!;
    expect(t.kind).toBe('manual');
    expect(t.habitId).toBe(P.vocab);
    expect(store.startRecovery('nope')).toBeNull();
    const change = store.proposeRecovery(P.vocab, 'badTime')!;
    expect(change.type).toBe('swapTime');
    expect((await store.acceptDesignChange(change))!.comebackPending).toBe(true);
  });
});

describe('Subscription (useSyncExternalStore contract)', () => {
  it('notifies on change with a new immutable snapshot; unsubscribe stops it', async () => {
    const { store } = await neutralStore();
    let calls = 0;
    const before = store.getSnapshot();
    const un = store.subscribe(() => calls++);
    await store.quickAdd('x');
    expect(calls).toBeGreaterThan(0);
    expect(store.getSnapshot()).not.toBe(before);
    expect(before.inbox).toEqual([]);
    un();
    const n = calls;
    await store.quickAdd('y');
    expect(calls).toBe(n);
  });
});
