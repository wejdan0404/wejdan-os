/**
 * QA area 2 #1 — routines come ONLY from products she added. Seeded generic products are
 * suggestions; an old accepted placeholder step migrates out of her day once it no longer
 * belongs to her routine. Today and the routine screens read the same selector.
 */
import { describe, expect, it } from 'vitest';
import {
  InMemoryLifeRepository, allRoutines, createLifeStore, dayKey, hasOwnRoutineProducts, isStaleProductStep, kProductsAmRoutineId,
  buildWhy, makeDayPlan, makePlanItem, makeProduct, mkDate, productStepId, productsBySlot,
} from '../../src/domain';
import { library } from './helpers';

const at = mkDate(2026, 10, 5, 8);

async function fresh() {
  const repo = new InMemoryLifeRepository();
  const store = await createLifeStore({ repo, now: () => at, library });
  return { repo, store };
}

const placeholderStep = (productId: string) =>
  makePlanItem({
    id: `pi_${productId}`,
    itemId: productStepId(productId),
    kind: 'routineStep',
    tier: 'chain',
    section: 'morningChain',
    title: { ar: 'غسول', en: 'Cleanser' },
    domain: 'care',
    why: buildWhy('chainStep', { routine: { ar: 'test', en: 'test' } }),
    routineId: kProductsAmRoutineId,
  });

describe('area 2 — routines only from her own products', () => {
  it('a fresh app has placeholders but no routine and no product suggestion', async () => {
    const { store } = await fresh();
    const s = store.getSnapshot();
    expect(s.products.length).toBeGreaterThan(0);
    expect(s.products.every((p) => p.placeholder)).toBe(true);
    expect(hasOwnRoutineProducts(s.products)).toBe(false);
    expect(allRoutines(s).some((r) => r.id === kProductsAmRoutineId)).toBe(false);
    expect(productsBySlot(s).am).toEqual([]);
    const ids = store.todayView().suggestions.map((x) => x.item.itemId);
    expect(ids.some((id) => id.startsWith('ps_'))).toBe(false);
  });

  it('her own product forms the routine; the placeholder of the same slot stays a suggestion', async () => {
    const { store } = await fresh();
    await store.upsertProduct(makeProduct({ id: 'mine', name: 'غسول CeraVe', category: 'cleanser', slot: 'am', order: 1 }));
    const s = store.getSnapshot();
    expect(hasOwnRoutineProducts(s.products)).toBe(true);
    expect(productsBySlot(s).am.map((p) => p.id)).toEqual(['mine']);
    const am = allRoutines(s).find((r) => r.id === kProductsAmRoutineId)!;
    expect(am.steps.map((x) => x.id)).toEqual([productStepId('mine')]);
    const ids = store.todayView().suggestions.map((x) => x.item.itemId);
    expect(ids).toContain(productStepId('mine'));
    expect(ids).not.toContain(productStepId('pr_am_cleanser'));
  });

  it('an old accepted placeholder step migrates out of her day and «بعدين»; adopting keeps it', async () => {
    const { repo, store } = await fresh();
    const key = dayKey(store.today());
    await repo.dayPlans.put(makeDayPlan({ date: key, energy: 'green', items: [placeholderStep('pr_am_cleanser'), placeholderStep('pr_am_moisturizer')] }));
    // reload over the same storage (the state she had before this fix)
    const reloaded = await createLifeStore({ repo, now: () => at, library });
    expect(reloaded.todayView().plan.items).toEqual([]);
    // adopting the cleanser makes it hers → its accepted step is live again
    const ph = reloaded.getSnapshot().products.find((p) => p.id === 'pr_am_cleanser')!;
    await reloaded.upsertProduct({ ...ph, placeholder: false });
    expect(reloaded.todayView().plan.items.map((i) => i.itemId)).toEqual([productStepId('pr_am_cleanser')]);
  });

  it('isStaleProductStep: placeholder, missing and switched-off products are stale; habits never', () => {
    const own = makeProduct({ id: 'own', name: 'x', category: 'cleanser', slot: 'am' });
    const off = makeProduct({ id: 'off', name: 'y', category: 'serum', slot: 'am', active: false });
    const ph = makeProduct({ id: 'ph', name: 'z', category: 'toner', slot: 'am', placeholder: true });
    const list = [own, off, ph];
    expect(isStaleProductStep({ itemId: productStepId('own'), kind: 'routineStep' }, list)).toBe(false);
    expect(isStaleProductStep({ itemId: productStepId('off'), kind: 'routineStep' }, list)).toBe(true);
    expect(isStaleProductStep({ itemId: productStepId('ph'), kind: 'routineStep' }, list)).toBe(true);
    expect(isStaleProductStep({ itemId: productStepId('gone'), kind: 'routineStep' }, list)).toBe(true);
    expect(isStaleProductStep({ itemId: 'ps_like_habit', kind: 'habit' }, list)).toBe(false);
  });
});
