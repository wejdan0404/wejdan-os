/**
 * Release-gate fixes N3 / N4 / N5: «رتّبي الشهر» is done once the month has a plan, a routine
 * skipped in full is a finished-for-today state, and a net-zero payday change announces nothing.
 */
import { describe, expect, it } from 'vitest';
import {
  budgetCycle,
  createLifeStore,
  currentBudgetCycle,
  hasMonthPlan,
  InMemoryLifeRepository,
  makeProduct,
  mkDate,
  needsMonthPlan,
  productStepId,
  routineSkippedToday,
  skippedRoutineLogs,
  type LifeStore,
} from '../../src/domain';
import { library } from './helpers';

async function storeAt(at: Date): Promise<{ store: LifeStore; setNow: (d: Date) => void }> {
  let now = at;
  const store = await createLifeStore({ repo: new InMemoryLifeRepository(), now: () => now, library });
  return { store, setNow: (d) => (now = d) };
}

describe('N5: payday changed and changed back', () => {
  it('budgetCycle: a history entry whose old rule equals the rule now in force is not a change', () => {
    expect(budgetCycle(mkDate(2026, 10, 24), 1, [{ until: '2026-10-24', day: 1 }]).paydayChangedOn).toBeNull();
    expect(budgetCycle(mkDate(2026, 10, 24), 27, [{ until: '2026-10-24', day: 1 }]).paydayChangedOn).toBe('2026-10-24');
  });

  it('store: 1 → 27 → 1 on the same day announces nothing; 1 → 27 → 20 still does', async () => {
    const { store } = await storeAt(mkDate(2026, 10, 24, 10));
    const changed = () => currentBudgetCycle(store.getSnapshot(), store.today()).paydayChangedOn;
    expect(changed()).toBeNull();
    await store.setPayday(27);
    expect(changed()).toBe('2026-10-24');
    await store.setPayday(1);
    expect(changed()).toBeNull();
    // the cycle itself is untouched
    const c = currentBudgetCycle(store.getSnapshot(), store.today());
    expect([c.key, c.paydayDay]).toEqual(['2026-10', 1]);
    await store.setPayday(27);
    await store.setPayday(20);
    expect(changed()).toBe('2026-10-24');
  });
});

describe('N3: the month plan on payday', () => {
  it('payday without a plan needs one; saving any envelope for the cycle makes it done', async () => {
    const { store } = await storeAt(mkDate(2026, 11, 1, 9));
    const s = () => store.getSnapshot();
    expect(currentBudgetCycle(s(), store.today()).isPayday).toBe(true);
    expect(hasMonthPlan(s(), store.today())).toBe(false);
    expect(needsMonthPlan(s(), store.today())).toBe(true);
    const key = currentBudgetCycle(s(), store.today()).key;
    await store.upsertEnvelope({ id: `env_${key}_spend`, titleAr: 'test', titleEn: 'test', month: key, planned: 2000, spent: 0 });
    expect(hasMonthPlan(s(), store.today())).toBe(true);
    expect(needsMonthPlan(s(), store.today())).toBe(false);
  });

  it('an envelope of another cycle does not count; a day that is not payday never needs the prompt', async () => {
    const { store, setNow } = await storeAt(mkDate(2026, 10, 14, 9));
    await store.upsertEnvelope({ id: 'env_2026-10_spend', titleAr: 'test', titleEn: 'test', month: '2026-10', planned: 1000, spent: 0 });
    expect(needsMonthPlan(store.getSnapshot(), store.today())).toBe(false); // mid-cycle
    setNow(mkDate(2026, 11, 1, 9)); // new cycle, October's plan doesn't carry over
    expect(needsMonthPlan(store.getSnapshot(), store.today())).toBe(true);
  });
});

describe('N4: a routine skipped in full today', () => {
  async function withAmProducts() {
    const ctx = await storeAt(mkDate(2026, 10, 14, 9));
    for (const id of ['prd_t1', 'prd_t2']) await ctx.store.upsertProduct(makeProduct({ id, name: 'test', category: 'other', slot: 'am', order: id === 'prd_t1' ? 1 : 2 }));
    return ctx;
  }
  const step = (id: string) => ({ itemId: productStepId(id), kind: 'routineStep' as const });

  it('is true only when every step is skipped and none was done', async () => {
    const { store } = await withAmProducts();
    const s = () => store.getSnapshot();
    expect(routineSkippedToday(s(), store.today(), 'am')).toBe(false);
    await store.skipItem(step('prd_t1'));
    expect(routineSkippedToday(s(), store.today(), 'am')).toBe(false); // half way
    await store.skipItem(step('prd_t2'));
    expect(routineSkippedToday(s(), store.today(), 'am')).toBe(true);
    expect(skippedRoutineLogs(s(), store.today(), 'am')).toHaveLength(2);
    expect(routineSkippedToday(s(), store.today(), 'pm')).toBe(false); // other slot, no steps
  });

  it('a step she actually did keeps it a real routine; undoing the skips restores the untouched state', async () => {
    const { store } = await withAmProducts();
    const s = () => store.getSnapshot();
    await store.skipItem(step('prd_t1'));
    await store.completeItem(step('prd_t2'), 'normal');
    expect(routineSkippedToday(s(), store.today(), 'am')).toBe(false);

    const other = await withAmProducts();
    await other.store.skipItem(step('prd_t1'));
    await other.store.skipItem(step('prd_t2'));
    for (const l of skippedRoutineLogs(other.store.getSnapshot(), other.store.today(), 'am')) await other.store.undo(l.id, true);
    expect(routineSkippedToday(other.store.getSnapshot(), other.store.today(), 'am')).toBe(false);
  });

  it('is per day: tomorrow the routine is back to normal', async () => {
    const { store, setNow } = await withAmProducts();
    await store.skipItem(step('prd_t1'));
    await store.skipItem(step('prd_t2'));
    expect(routineSkippedToday(store.getSnapshot(), store.today(), 'am')).toBe(true);
    setNow(mkDate(2026, 10, 15, 9));
    expect(routineSkippedToday(store.getSnapshot(), store.today(), 'am')).toBe(false);
  });
});
