/**
 * Migration: data exported from the Flutter app (Settings → «تصدير كل البيانات») moves into the
 * React app without loss.
 *
 * Fixture: tests/fixtures/migration/flutter_export_synthetic.json — fully SYNTHETIC (invented generic
 * titles, `test` data) but with the same schema, box counts and structural features as a real export.
 * Expected derived values for it: tests/fixtures/migration/flutter_ui_expected.json.
 */
import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import flutterExport from '../fixtures/migration/flutter_export_synthetic.json';
import expected from '../fixtures/migration/flutter_ui_expected.json';
import { habitRestingOf,
  type Json, type LifeStore, InMemoryLifeRepository, SettingsJ, averageMomentum, coreHabits, createLifeStore,
  habitStrengthOf, kFlutterBoxes, kSeedOnlyBoxes, mkDate, sparksBalance,
} from '../../src/domain';
import { library } from '../domain/helpers';

type ExportShape = { schemaVersion: number; exportedAt: string; boxes: Record<string, Json[]>; meta: Record<string, Json> };

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const raw = flutterExport as unknown as ExportShape;
/** The moment Flutter exported (logical day 2026-10-23). */
const exportNow = mkDate(2026, 10, 23, 23, 51);
const exportDay = mkDate(2026, 10, 23);
const dataBoxes = kFlutterBoxes.filter((b) => !kSeedOnlyBoxes.includes(b));
const canon = (l: Json[]): Json[] => [...l].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));

async function freshStore(): Promise<LifeStore> {
  return createLifeStore({ repo: new InMemoryLifeRepository(), now: () => exportNow, library });
}

async function importedStore(): Promise<LifeStore> {
  const store = await freshStore();
  await store.importAll(clone(raw), { confirm: true });
  return store;
}

/** Field-level differences between two record lists keyed by id (for precise gap reports). */
function recordDiffs(box: string, expectedList: Json[], actualList: Json[]): string[] {
  const out: string[] = [];
  const byId = (l: Json[]) => new Map(l.map((r) => [String((r as Record<string, Json>)['id']), r as Record<string, Json>]));
  const e = byId(expectedList);
  const a = byId(actualList);
  for (const [id, er] of e) {
    const ar = a.get(id);
    if (!ar) {
      out.push(`${box}/${id}: missing after import`);
      continue;
    }
    for (const k of Object.keys(er)) {
      if (JSON.stringify(er[k]) !== JSON.stringify(ar[k])) {
        out.push(`${box}/${id}.${k}: expected ${JSON.stringify(er[k])} actual ${JSON.stringify(ar[k])}`);
      }
    }
  }
  for (const id of a.keys()) if (!e.has(id)) out.push(`${box}/${id}: extra record after import`);
  return out;
}

describe('Flutter → React migration (synthetic export)', () => {
  it('fixture has the expected Flutter export shape and records', () => {
    expect(raw.schemaVersion).toBe(1);
    expect(Object.keys(raw.boxes).sort()).toEqual([...dataBoxes].sort());
    const b = raw.boxes;
    // UI actions are present in the file (guards against a stale/empty fixture).
    const today = (b['logs'] ?? []).filter((l) => (l as Record<string, unknown>)['date'] === '2026-10-23') as Record<string, Json>[];
    expect(today.map((l) => `${l['itemId']}:${l['level']}`).sort()).toEqual(
      ['h_t08:bonus', 'h_t10:normal', 'joy_t3:normal', 'qa_ps2:minimum', 'wt_weekly_review:normal'].sort(),
    );
    expect((b['sparkTxns'] ?? []).some((t) => (t as Record<string, unknown>)['reason'] === 'redeem' && (t as Record<string, unknown>)['amount'] === -60)).toBe(true);
    expect((b['weeklyReviews'] ?? []).length).toBe(1);
    expect((b['bills'] ?? []).length).toBe(2);
    expect((b['bnplItems'] ?? []).length).toBe(1);
    expect((b['moneyEnvelopes'] ?? []).length).toBe(1);
    expect((b['wishItems'] ?? []).length).toBe(2);
  });

  it('preview: every box counted, nothing skipped, no writes', async () => {
    const store = await freshStore();
    const before = clone(store.getSnapshot().habits.length);
    const p = await store.previewImport(clone(raw));
    expect(p.ok, p.error ?? '').toBe(true);
    expect(p.schemaVersion).toBe(1);
    expect(p.skipped).toBe(0);
    for (const box of dataBoxes) expect(p.counts[box] ?? 0, box).toBe((raw.boxes[box] ?? []).length);
    expect(store.getSnapshot().habits.length).toBe(before);
  });

  it('import (confirm): every record type and count survives byte-for-byte', async () => {
    const store = await importedStore();
    const exp = (await store.exportAll()) as unknown as ExportShape;
    const gaps: string[] = [];
    for (const box of dataBoxes) {
      const original = raw.boxes[box] ?? [];
      const after = exp.boxes[box] ?? [];
      if (after.length !== original.length) gaps.push(`${box}: count expected ${original.length} actual ${after.length}`);
      gaps.push(...recordDiffs(box, original, after));
      expect(canon(after), box).toEqual(canon(original));
    }
    expect(gaps).toEqual([]);
  });

  it('settings and meta are mapped (changes kept; web-only defaults added)', async () => {
    const store = await importedStore();
    const s = store.getSnapshot().settings;
    expect(s.theme).toBe('dark');
    expect(s.notificationCap).toBe(3);
    expect(s.quietStartMinute).toBe(23 * 60 + 30);
    expect(s.prayerAnchorsEnabled).toBe(true);
    expect(s.onboardingDone).toBe(true);
    expect(s.paydayDay).toBe(1);
    // Every Flutter settings key/value survives decode → encode.
    const original = raw.meta['settings'] as Record<string, Json>;
    const encoded = SettingsJ.toJson(s) as Record<string, Json>;
    const diffs = Object.keys(original)
      .filter((k) => JSON.stringify(original[k]) !== JSON.stringify(encoded[k]))
      .map((k) => `settings.${k}: expected ${JSON.stringify(original[k])} actual ${JSON.stringify(encoded[k])}`);
    expect(diffs).toEqual([]);
    const exp = (await store.exportAll()) as unknown as ExportShape;
    expect(exp.meta['openedDays']).toEqual(raw.meta['openedDays']);
    expect(exp.meta['firstRunDate']).toEqual(raw.meta['firstRunDate']);
    expect(exp.meta['moduleState']).toMatchObject(raw.meta['moduleState'] as Record<string, Json>);
  });

  it('derived values match what the Flutter UI showed (sparks, week momentum, growth stages)', async () => {
    const store = await importedStore();
    const snap = store.getSnapshot();
    expect(sparksBalance(snap)).toBe(expected.sparksBalance);
    const m = averageMomentum({ habits: coreHabits(snap), logs: snap.logs, today: exportDay });
    expect(Math.round(m <= 1 ? m * 100 : m)).toBe(expected.weekMomentum);
    const stageGaps: string[] = [];
    for (const [title, stage] of Object.entries(expected.stages)) {
      const h = snap.habits.find((x) => x.titleAr === title);
      if (!h) {
        stageGaps.push(`${title}: habit missing`);
        continue;
      }
      const got = habitStrengthOf(snap, h.id, exportDay)?.stage ?? null;
      if (got !== stage) stageGaps.push(`${title} (${h.id}): stage expected ${stage} actual ${got}`);
    }
    expect(stageGaps).toEqual([]);
    // Garden «ترتاح» parity: exactly the habits Flutter showed as resting.
    const restingTitles = snap.habits
      .filter((h) => h.status !== 'archived' && habitRestingOf(snap, h.id, exportDay))
      .map((h) => h.titleAr)
      .sort();
    // Every habit Flutter showed as «ترتاح» rests here too (the fixture lists the
    // ones visible on screen; the never-logged routine steps rest by the same rule)…
    for (const t of expected.resting as string[]) expect(restingTitles, t).toContain(t);
    // …and none of the habits Flutter showed with a growth-stage label rests.
    for (const t of Object.keys(expected.stages)) expect(restingTitles, t).not.toContain(t);
    // Reward progress text in Flutter Joy = price - balance.
    const book = snap.joyItems.find((j) => j.titleAr === 'مكافأة تجريبية ٢');
    const outing = snap.joyItems.find((j) => j.titleAr === 'مكافأة تجريبية ٤');
    expect((book?.price ?? 0) - sparksBalance(snap)).toBe(54);
    expect((outing?.price ?? 0) - sparksBalance(snap)).toBe(134);
  });

  it('reverse: a React export re-imports into React losslessly', async () => {
    const first = await importedStore();
    // Add web-only data so the round trip covers the new boxes too.
    await first.quickAdd('test');
    const e1 = (await first.exportAll()) as unknown as ExportShape;
    const second = await freshStore();
    await second.importAll(clone(e1), { confirm: true });
    const e2 = (await second.exportAll()) as unknown as ExportShape;
    const boxes = new Set([...Object.keys(e1.boxes), ...Object.keys(e2.boxes)]);
    const gaps: string[] = [];
    for (const box of boxes) {
      const a = e1.boxes[box] ?? [];
      const b = e2.boxes[box] ?? [];
      gaps.push(...recordDiffs(box, a, b));
    }
    expect(gaps).toEqual([]);
    expect(e2.meta['settings']).toEqual(e1.meta['settings']);
    expect(e2.meta['openedDays']).toEqual(e1.meta['openedDays']);
    expect(e2.meta['firstRunDate']).toEqual(e1.meta['firstRunDate']);
    expect(Object.keys(e2.boxes).sort()).toEqual(Object.keys(e1.boxes).sort());
    expect((e2.boxes['inbox'] ?? []).length).toBeGreaterThanOrEqual(1);
  });
});
