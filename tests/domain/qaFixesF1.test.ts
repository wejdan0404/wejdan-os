/**
 * QA fix pass F1: suggestions for her own habits in resting areas, moving items between days,
 * plan item → inbox, evening decisions that never destroy, products replacing placeholders.
 */
import { describe, expect, it } from 'vitest';
import {
  InMemoryLifeRepository, addDays, createLifeStore, dayKey, makeProduct, mkDate, openInbox, productsIn, suggestionsFor, todayView,
} from '../../src/domain';
import { library, simpleHabit } from './helpers';

async function neutral(at: Date = mkDate(2026, 10, 5, 9)) {
  const now = at;
  const repo = new InMemoryLifeRepository();
  const store = await createLifeStore({ repo, now: () => now, library });
  return store;
}

describe('QA F1 / area 3 #1 — a resting area stays quiet; waking it brings her habits back', () => {
  it('an active habit in a «راحة» domain is NOT suggested; set to «صيانة» it is (maintain tier)', async () => {
    const store = await neutral();
    const s0 = store.getSnapshot();
    const health = s0.domains.find((d) => d.id === 'health')!;
    expect(health.state).toBe('rest');
    await store.upsertHabit({ ...simpleHabit({ id: 'walk', domain: 'health' }), titleAr: 'المشي اليومي' }, true);
    let sug = suggestionsFor(store.getSnapshot(), store.today()).suggestions;
    expect(sug.some((x) => x.item.itemId === 'walk')).toBe(false);
    await store.setDomainState('health', 'maintain', true);
    sug = suggestionsFor(store.getSnapshot(), store.today()).suggestions;
    const walk = sug.find((x) => x.item.itemId === 'walk');
    expect(walk).toBeDefined();
    expect(walk!.item.tier).toBe('maintain');
  });

  it('resting an area keeps what she already accepted on today, but stops new suggestions', async () => {
    const store = await neutral();
    await store.setDomainState('health', 'maintain', true);
    await store.upsertHabit(simpleHabit({ id: 'walk', domain: 'health' }), true);
    await store.upsertHabit(simpleHabit({ id: 'water', domain: 'health' }), true);
    const today = store.today();
    const id = todayView(store.getSnapshot(), today).suggestions.find((x) => x.item.itemId === 'walk')!.item.id;
    await store.acceptSuggestion(id);
    await store.setDomainState('health', 'rest', true);
    const v = todayView(store.getSnapshot(), today);
    expect(v.plan.items.some((i) => i.id === id)).toBe(true);
    expect(v.suggestions.some((x) => x.item.itemId === 'water')).toBe(false);
  });

  it('a disabled domain still hides its habits', async () => {
    const store = await neutral();
    await store.setDomainEnabled('health', false);
    await store.upsertHabit(simpleHabit({ id: 'walk', domain: 'health' }), true);
    const sug = suggestionsFor(store.getSnapshot(), store.today()).suggestions;
    expect(sug.some((x) => x.item.itemId === 'walk')).toBe(false);
  });
});

describe('QA F1 — moving and returning plan items', () => {
  it('moveToDate takes an accepted item off today, keeps it out of suggestions, and undo restores', async () => {
    const store = await neutral();
    await store.setDomainState('health', 'maintain', true);
    await store.upsertHabit(simpleHabit({ id: 'walk', domain: 'health' }), true);
    const today = store.today();
    const id = todayView(store.getSnapshot(), today).suggestions.find((x) => x.item.itemId === 'walk')!.item.id;
    await store.acceptSuggestion(id);
    const tomorrow = addDays(today, 1);
    expect(await store.moveToDate(id, tomorrow)).toBe(true);
    let v = todayView(store.getSnapshot(), today);
    expect(v.plan.items.some((i) => i.id === id)).toBe(false);
    expect(v.suggestions.some((x) => x.item.id === id)).toBe(false);
    expect(todayView(store.getSnapshot(), tomorrow).plan.items.some((i) => i.id === id)).toBe(true);
    await store.undoMoveToDate(id, tomorrow, today, true);
    v = todayView(store.getSnapshot(), today);
    expect(v.plan.items.some((i) => i.id === id)).toBe(true);
    expect(todayView(store.getSnapshot(), tomorrow).plan.items.some((i) => i.id === id)).toBe(false);
  });

  it('evening «بكرة» on a plan item moves it (not copies it)', async () => {
    const store = await neutral();
    await store.setDomainState('health', 'maintain', true);
    await store.upsertHabit(simpleHabit({ id: 'walk', domain: 'health' }), true);
    const today = store.today();
    const id = todayView(store.getSnapshot(), today).suggestions.find((x) => x.item.itemId === 'walk')!.item.id;
    await store.acceptSuggestion(id);
    await store.eveningDecision({ planItemId: id }, 'tomorrow');
    expect(todayView(store.getSnapshot(), today).plan.items.some((i) => i.id === id)).toBe(false);
    expect(todayView(store.getSnapshot(), addDays(today, 1)).plan.items.some((i) => i.id === id)).toBe(true);
  });

  it('plan item → inbox leaves today and lands in the inbox; undo reverses both', async () => {
    const store = await neutral();
    await store.setDomainState('health', 'maintain', true);
    await store.upsertHabit({ ...simpleHabit({ id: 'walk', domain: 'health' }), titleAr: 'test' }, true);
    const today = store.today();
    const id = todayView(store.getSnapshot(), today).suggestions.find((x) => x.item.itemId === 'walk')!.item.id;
    await store.acceptSuggestion(id);
    const inb = await store.planItemToInbox(id);
    expect(inb).not.toBeNull();
    expect(openInbox(store.getSnapshot()).some((i) => i.id === inb!.id && i.title === 'test')).toBe(true);
    expect(todayView(store.getSnapshot(), today).plan.items.some((i) => i.id === id)).toBe(false);
    await store.undoPlanItemToInbox(id, inb!.id, today, true);
    expect(openInbox(store.getSnapshot()).some((i) => i.id === inb!.id)).toBe(false);
    expect(todayView(store.getSnapshot(), today).plan.items.some((i) => i.id === id)).toBe(true);
  });

  it('evening «خلّيها» on a task returns it to the inbox — never cancels', async () => {
    const store = await neutral();
    const t = await store.addTask({ title: 'test', status: 'planned', dueDate: dayKey(store.today()) });
    await store.eveningDecision({ taskId: t.id }, 'letGo');
    const after = store.getSnapshot().tasks.find((x) => x.id === t.id)!;
    expect(after.status).toBe('inbox');
    expect(after.dueDate).toBeNull();
  });
});

describe('QA F1 / area 2 — placeholders never form her routine', () => {
  it('only her own active products of a slot form the routine; placeholders are suggestions only', () => {
    const ph = makeProduct({ id: 'ph', name: 'غسول', category: 'cleanser', slot: 'am', order: 1, placeholder: true });
    const phM = makeProduct({ id: 'phm', name: 'مرطب', category: 'moisturizer', slot: 'am', order: 2, placeholder: true });
    const pmPh = makeProduct({ id: 'pmph', name: 'غسول', category: 'cleanser', slot: 'pm', order: 1, placeholder: true });
    expect(productsIn([ph, phM, pmPh], 'am')).toEqual([]);
    const mine = makeProduct({ id: 'mine', name: 'test', category: 'cleanser', slot: 'am', order: 3 });
    expect(productsIn([ph, phM, pmPh, mine], 'am').map((p) => p.id)).toEqual(['mine']);
    expect(productsIn([ph, phM, pmPh, mine], 'pm')).toEqual([]);
  });
});

describe('QA F1 — personal library import (device only)', () => {
  it('importPersonalLibrary merges her private actions over the shipped ones; remove goes back', async () => {
    const shippedEn = (await import('../../src/domain/data/actions.json')).default as unknown as Record<string, unknown>[];
    const shippedAr = (await import('../../src/domain/data/actions_ar.json')).default as unknown as Record<string, Record<string, unknown>>;
    const base = shippedEn[0]!;
    const baseAr = shippedAr[String(base['action_id'])] ?? {};
    const file = {
      kind: 'wejdan-action-library',
      version: 1,
      actions: [{ ...base, action_id: 'TEST-01' }],
      actions_ar: { 'TEST-01': { ...baseAr, card_title_ar: 'test' } },
    };
    // loadShippedLibrary reads the default (jsdom) localStorage, so mirror it there too.
    localStorage.clear();
    const repo = new InMemoryLifeRepository();
    const store = await createLifeStore({ repo, now: () => mkDate(2026, 10, 5, 9), library });
    const n = await store.importPersonalLibrary(file, localStorage);
    expect(n).toBe(1);
    expect(store.getSnapshot().actions.some((a) => a.actionId === 'TEST-01')).toBe(true);
    await store.removePersonalLibrary(localStorage);
    expect(store.getSnapshot().actions.some((a) => a.actionId === 'TEST-01')).toBe(false);
    await expect(store.importPersonalLibrary({ kind: 'nope' }, localStorage)).rejects.toThrow();
  });
});
