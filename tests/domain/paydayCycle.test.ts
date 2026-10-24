/**
 * Payday cycle transitions (QA area4 #2, #10): a payday change keeps the cycle in progress,
 * every cycle has its own key, and data stays attributed to the cycle it was recorded in.
 */
import { describe, expect, it } from 'vitest';
import {
  budgetCycle,
  budgetCycleKeyFor,
  createLifeStore,
  currentBudgetCycle,
  dayKey,
  envelopesThisCycle,
  InMemoryLifeRepository,
  mkDate,
  SettingsJ,
} from '../../src/domain';
import { library } from './helpers';

const k = (c: { start: Date; end: Date; nextPayday: Date; key: string }) => [dayKey(c.start), dayKey(c.end), dayKey(c.nextPayday), c.key];

async function storeAt(at: Date) {
  let now = at;
  const store = await createLifeStore({ repo: new InMemoryLifeRepository(), now: () => now, library });
  return { store, setNow: (d: Date) => (now = d) };
}

describe('budgetCycle with payday history', () => {
  it('no history: calendar month, yyyy-MM key (unchanged behaviour)', () => {
    expect(k(budgetCycle(mkDate(2026, 10, 24)))).toEqual(['2026-10-01', '2026-10-31', '2026-11-01', '2026-10']);
    expect(k(budgetCycle(mkDate(2026, 10, 24), 25))).toEqual(['2026-09-25', '2026-10-24', '2026-10-25', '2026-09']);
    // 31 clamps to the end of a short month
    expect(k(budgetCycle(mkDate(2026, 11, 30), 31))).toEqual(['2026-11-30', '2026-12-30', '2026-11-30', '2026-11']);
  });

  it('1 → 25 on 24 Oct: the October cycle keeps its start and ends the day before the new payday', () => {
    const hist = [{ until: '2026-10-24', day: 1 }];
    const oct24 = budgetCycle(mkDate(2026, 10, 24), 25, hist);
    expect(k(oct24)).toEqual(['2026-10-01', '2026-10-24', '2026-10-25', '2026-10']);
    expect(oct24.paydayChangedOn).toBe('2026-10-24');
    expect(oct24.daysToPayday).toBe(1);
    const oct25 = budgetCycle(mkDate(2026, 10, 25), 25, hist);
    expect(oct25.isPayday).toBe(true);
    expect(k(oct25)).toEqual(['2026-10-25', '2026-11-24', '2026-10-25', '2026-10-25']);
    expect(budgetCycle(mkDate(2026, 11, 10), 25, hist).key).toBe('2026-10-25');
    expect(budgetCycle(mkDate(2026, 11, 25), 25, hist).key).toBe('2026-11');
  });

  it('1 → 20 on 24 Oct: the cycle in progress runs until the next 20th', () => {
    const c = budgetCycle(mkDate(2026, 10, 24), 20, [{ until: '2026-10-24', day: 1 }]);
    expect(k(c)).toEqual(['2026-10-01', '2026-11-19', '2026-11-20', '2026-10']);
    expect(c.paydayDay).toBe(20);
  });

  it('changing payday to today starts a new cycle today with its own key', () => {
    const c = budgetCycle(mkDate(2026, 10, 24), 24, [{ until: '2026-10-24', day: 1 }]);
    expect(c.isPayday).toBe(true);
    expect(c.key).toBe('2026-10-24');
    // the day before still belongs to the old October cycle
    expect(budgetCycle(mkDate(2026, 10, 23), 24, [{ until: '2026-10-24', day: 1 }]).key).toBe('2026-10');
  });

  it('two changes keep each period on its own rule', () => {
    const hist = [
      { until: '2026-10-24', day: 1 },
      { until: '2026-10-26', day: 25 },
    ];
    expect(budgetCycle(mkDate(2026, 10, 25), 20, hist).isPayday).toBe(true);
    expect(dayKey(budgetCycle(mkDate(2026, 10, 30), 20, hist).nextPayday)).toBe('2026-11-20');
  });
});

describe('store: payday change keeps this month’s data', () => {
  it('plan + spend recorded before the change stay on the cycle they belong to', async () => {
    const { store, setNow } = await storeAt(mkDate(2026, 10, 24, 10));
    const s = () => store.getSnapshot();
    const key = currentBudgetCycle(s(), store.today()).key;
    await store.upsertEnvelope({ id: `env_${key}_spend`, titleAr: 'مصروف', titleEn: 'spend', month: key, planned: 3000, spent: 1500 });
    await store.setPayday(25);
    expect(s().settings.paydayHistory).toEqual([{ until: '2026-10-24', day: 1 }]);
    // still the same cycle today → the plan and spend are still visible
    expect(envelopesThisCycle(s(), store.today()).map((e) => e.spent)).toEqual([1500]);
    // next cycle (from 25 Oct) starts clean — nothing from October leaks in
    setNow(mkDate(2026, 10, 25, 10));
    expect(envelopesThisCycle(s(), store.today())).toEqual([]);
  });

  it('setting the same day is a no-op; two changes on one day add one history entry', async () => {
    const { store } = await storeAt(mkDate(2026, 10, 24, 10));
    await store.setPayday(1);
    expect(store.getSnapshot().settings.paydayHistory).toEqual([]);
    await store.setPayday(25);
    await store.setPayday(20);
    expect(store.getSnapshot().settings.paydayHistory).toEqual([{ until: '2026-10-24', day: 1 }]);
    expect(store.getSnapshot().settings.paydayDay).toBe(20);
  });

  it('a bill paid from its row counts for the cycle of the due date shown (#10)', async () => {
    const { store, setNow } = await storeAt(mkDate(2026, 10, 24, 10));
    await store.upsertBill({ id: 'bill_t', title: 'test', amount: 100, dueDay: 5, isSubscription: false, active: true });
    const due = mkDate(2026, 11, 5);
    const rowKey = budgetCycleKeyFor(store.getSnapshot(), due);
    expect(rowKey).toBe('2026-11');
    await store.setBillPaid('bill_t', rowKey, true);
    setNow(mkDate(2026, 11, 1, 10));
    const nov = currentBudgetCycle(store.getSnapshot(), store.today());
    expect(store.getSnapshot().bills[0]!.paidCycles).toContain(nov.key);
  });

  it('paydayHistory survives JSON export/import', () => {
    const json = SettingsJ.toJson({ ...SettingsJ.fromJson({}), paydayDay: 25, paydayHistory: [{ until: '2026-10-24', day: 1 }] });
    const back = SettingsJ.fromJson(JSON.parse(JSON.stringify(json)));
    expect(back.paydayHistory).toEqual([{ until: '2026-10-24', day: 1 }]);
    expect(SettingsJ.fromJson({ paydayDay: 3 }).paydayHistory).toEqual([]);
  });
});
