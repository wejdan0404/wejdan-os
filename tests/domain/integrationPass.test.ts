/**
 * Integration fix pass: display name in settings, per-slot routine pause, bills paid per cycle,
 * redeem with an undo token.
 */
import { describe, expect, it } from 'vitest';
import {
  InMemoryLifeRepository, SettingsJ, BillJ, allRoutines, createLifeStore, currentBudgetCycle, defaultSettings, isBillPaid,
  isRoutineSlotPaused, kProductsAmRoutineId, kProductsPmRoutineId, makeJoyItem, mkDate, sparksBalance,
} from '../../src/domain';
import { library } from './helpers';

async function store(sparks = 0) {
  const now = mkDate(2026, 10, 5, 9);
  const repo = new InMemoryLifeRepository();
  await repo.open();
  if (sparks > 0) await repo.sparkTxns.put({ id: 'spk_seed', date: '2026-10-04', amount: sparks, reason: 'adjustment', refId: null, at: null });
  return createLifeStore({ repo, now: () => now, library });
}

describe('settings.displayName', () => {
  it('defaults empty, round-trips through JSON, and old exports without it still load', () => {
    expect(defaultSettings().displayName).toBe('');
    const s = defaultSettings({ displayName: 'test' });
    expect(SettingsJ.fromJson(SettingsJ.toJson(s)).displayName).toBe('test');
    const legacy = SettingsJ.toJson(defaultSettings());
    delete legacy['displayName'];
    delete legacy['pausedRoutineSlots'];
    expect(SettingsJ.fromJson(legacy)).toMatchObject({ displayName: '', pausedRoutineSlots: [] });
  });

  it('setDisplayName trims, saves and is included in exportAll', async () => {
    const st = await store();
    await st.setDisplayName('  test  ');
    expect(st.getSnapshot().settings.displayName).toBe('test');
    expect(JSON.stringify(await st.exportAll())).toContain('"displayName":"test"');
  });
});

describe('routine pause per slot', () => {
  it('a paused slot drops its generated routine; products are untouched; resume brings it back', async () => {
    const st = await store();
    // placeholders never form a routine — she adopts them as her own first (QA area 2 #1)
    for (const p of st.getSnapshot().products) await st.upsertProduct({ ...p, placeholder: false });
    const ids = () => allRoutines(st.getSnapshot()).map((r) => r.id);
    expect(ids()).toEqual(expect.arrayContaining([kProductsAmRoutineId, kProductsPmRoutineId]));
    const before = st.getSnapshot().products.map((p) => ({ id: p.id, active: p.active }));

    await st.setRoutineSlotPaused('am', true);
    expect(isRoutineSlotPaused(st.getSnapshot(), 'am')).toBe(true);
    expect(ids()).not.toContain(kProductsAmRoutineId);
    expect(ids()).toContain(kProductsPmRoutineId);
    expect(st.getSnapshot().products.map((p) => ({ id: p.id, active: p.active }))).toEqual(before);

    await st.setRoutineSlotPaused('am', true); // idempotent
    expect(st.getSnapshot().settings.pausedRoutineSlots).toEqual(['am']);
    await st.setRoutineSlotPaused('am', false);
    expect(ids()).toContain(kProductsAmRoutineId);
  });
});

describe('bills paid in the current cycle', () => {
  it('marks / unmarks paid for one cycle key only, and round-trips', async () => {
    const st = await store();
    await st.upsertBill({ id: 'b1', title: 'test', amount: 100, dueDay: 10, isSubscription: false, active: true });
    const key = currentBudgetCycle(st.getSnapshot(), mkDate(2026, 10, 5)).key;
    await st.setBillPaid('b1', key, true);
    const b = st.getSnapshot().bills.find((x) => x.id === 'b1')!;
    expect(isBillPaid(b, key)).toBe(true);
    expect(isBillPaid(b, 'another-cycle')).toBe(false);
    expect(BillJ.fromJson(BillJ.toJson(b)).paidCycles).toEqual([key]);
    await st.setBillPaid('b1', key, false);
    expect(isBillPaid(st.getSnapshot().bills.find((x) => x.id === 'b1')!, key)).toBe(false);
    // older exports without paidCycles
    expect(BillJ.fromJson({ id: 'x', title: 't', amount: 1, dueDay: 1, isSubscription: false, active: true }).paidCycles).toEqual([]);
  });
});

describe('redeem with undo', () => {
  it('writes the spend at once and the undo token removes it', async () => {
    const st = await store(100);
    await st.upsertJoyItem(makeJoyItem({ id: 'r1', kind: 'earned', titleAr: 'test', titleEn: 'test', price: 60 }));
    const r = await st.redeem('r1');
    expect(r.ok).toBe(true);
    expect(r.undo).not.toBeNull();
    expect(sparksBalance(st.getSnapshot())).toBe(40);
    expect(await st.undoDelete(r.undo!.token)).toBe(true);
    expect(sparksBalance(st.getSnapshot())).toBe(100);
  });

  it('a redeem she cannot afford returns no undo token', async () => {
    const st = await store(10);
    await st.upsertJoyItem(makeJoyItem({ id: 'r1', kind: 'earned', titleAr: 'test', titleEn: 'test', price: 60 }));
    const r = await st.redeem('r1');
    expect(r).toMatchObject({ ok: false, shortBy: 50, undo: null });
  });
});
