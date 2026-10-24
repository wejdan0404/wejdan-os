/**
 * QA area 6 D1 — old data must never be stranded after «بعدين» + onboarding.
 * (Shares the real hive layout fixture with legacyMigration.test.ts.)
 *
 * Old Flutter app → React store migration (same origin, hive_ce IndexedDB `wlo_*` databases).
 * The fixture reproduces the real on-disk layout captured from the Flutter build
 * (one DB per box, object store `box`, string keys, JSON-string values; titles sanitised to "test").
 */
import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import layout from './fixtures/hive/flutter-hive-layout.json';
import {
  InMemoryLifeRepository, SettingsJ, createLifeStore, defaultSettings, kLegacyDataBoxes, kLegacySnoozeMs, legacyDbName,
  legacyMigrationAvailable, markLegacyMigrated, markLegacyReoffered, readLegacyData, readLegacyMarker,
  shouldOfferLegacyMigration, shouldReofferLegacyMigration, snoozeLegacyMigration, type KeyValueStore,
} from '../../src/domain';
import { library } from './helpers';

type Layout = { databases: Record<string, { version: number; store: string; entries: { key: string; value: unknown }[] }> };
const L = layout as Layout;

const req = <T>(r: IDBRequest<T>): Promise<T> =>
  new Promise((ok, ko) => {
    r.onsuccess = () => ok(r.result);
    r.onerror = () => ko(r.error);
  });

/** Writes databases exactly the way hive_ce web does (DB per box, store `box`, out-of-line keys). */
async function populate(idb: IDBFactory, dbs: Layout['databases']): Promise<void> {
  for (const [name, db] of Object.entries(dbs)) {
    const open = idb.open(name, db.version);
    open.onupgradeneeded = () => open.result.createObjectStore(db.store);
    const d = await req(open);
    const tx = d.transaction(db.store, 'readwrite');
    for (const e of db.entries) tx.objectStore(db.store).put(e.value, e.key);
    await new Promise<void>((ok, ko) => {
      tx.oncomplete = () => ok();
      tx.onerror = () => ko(tx.error);
    });
    d.close();
  }
}

class MemKv implements KeyValueStore {
  m = new Map<string, string>();
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
}

/** Expected records per data box, straight from the fixture (library boxes excluded). */
const expected: Record<string, number> = {};
for (const box of kLegacyDataBoxes) {
  const n = L.databases[legacyDbName(box)]?.entries.length ?? 0;
  if (n > 0) expected[box] = n;
}
const expectedTotal = Object.values(expected).reduce((a, b) => a + b, 0);

const newStore = () => createLifeStore({ repo: new InMemoryLifeRepository(), library, now: () => new Date('2026-10-24T10:00:00') });

describe('legacy data stays reachable after «بعدين» and onboarding (QA D1)', () => {
  it('re-offers once after onboarding, as a merge (never a silent replace), then only via Settings', async () => {
    const idb = new IDBFactory();
    await populate(idb, L.databases);
    const kv = new MemKv();
    const store = await newStore();
    const t0 = new Date('2026-10-24T10:00:00Z');

    // boot: empty store → offer; she taps «بعدين»
    expect((await shouldOfferLegacyMigration(store.getSnapshot(), { idb, kv, now: t0 })).offer).toBe(true);
    snoozeLegacyMigration(t0, kv);
    // not onboarded yet → no re-offer
    expect((await shouldReofferLegacyMigration(store.getSnapshot(), { idb, kv })).offer).toBe(false);

    // she finishes onboarding and starts using the app
    await store.updateSettings({ ...store.getSnapshot().settings, onboardingDone: true });
    await store.quickAdd('test');
    const boot = await shouldOfferLegacyMigration(store.getSnapshot(), { idb, kv, now: new Date(t0.getTime() + kLegacySnoozeMs + 1) });
    expect(boot.offer).toBe(false); // the boot sheet never replaces her new data
    const re = await shouldReofferLegacyMigration(store.getSnapshot(), { idb, kv });
    expect(re.offer).toBe(true);
    expect(re.wouldReplace).toBe(true);

    // once shown, it doesn't nag again — Settings keeps the entry until it's moved
    markLegacyReoffered(t0, kv);
    expect((await shouldReofferLegacyMigration(store.getSnapshot(), { idb, kv })).offer).toBe(false);
    expect((await legacyMigrationAvailable({ idb, kv })).available).toBe(true);
  });

  it('Settings path: a reviewed merge keeps her new data, adds the old, and marks the move done', async () => {
    const idb = new IDBFactory();
    await populate(idb, L.databases);
    const kv = new MemKv();
    const store = await newStore();
    await store.updateSettings({ ...store.getSnapshot().settings, onboardingDone: true, displayName: 'test' });
    await store.quickAdd('test');
    const before = store.getSnapshot();

    const { data } = await readLegacyData(idb);
    const preview = await store.previewImport(data);
    expect(preview.ok).toBe(true);
    // what ImportReview's «ادمجي» builds: her records first, the file's new ids added, her settings kept
    const current = await store.exportAll();
    const merged = { ...data, boxes: { ...data.boxes }, meta: { ...(data.meta as object), settings: (current.meta as { settings: unknown }).settings } };
    for (const [b, list] of Object.entries(data.boxes)) {
      const mine = (current.boxes[b] ?? []) as { id?: string; date?: string }[];
      const ids = new Set(mine.map((r) => String(r.id ?? r.date)));
      merged.boxes[b] = [...mine, ...(list as { id?: string; date?: string }[]).filter((r) => !ids.has(String(r.id ?? r.date)))] as never;
    }
    const backup = await store.importAll(merged, { confirm: true });
    markLegacyMigrated(backup.id, new Date(), kv);

    const after = store.getSnapshot();
    expect(after.inbox.some((i) => i.title === 'test')).toBe(true); // her new data survived
    expect(after.settings.displayName).toBe('test'); // her settings kept
    expect(after.habits.length).toBeGreaterThanOrEqual(before.habits.length + (expected['habits'] ?? 0) - 0);
    expect(readLegacyMarker(kv)?.state).toBe('done');
    expect((await legacyMigrationAvailable({ idb, kv })).available).toBe(false);
    expect((await shouldReofferLegacyMigration(after, { idb, kv })).offer).toBe(false);
    expect(expectedTotal).toBeGreaterThan(0);
  });
});

describe('settings keys this build does not model are kept (QA D9 privacy)', () => {
  it('a private module flag from an older export survives import → export without being named in code', () => {
    const legacyKey = ['pc', 'os', 'Module'].join(''); // older builds wrote this key
    const j = { ...(SettingsJ.toJson(defaultSettings()) as Record<string, unknown>), [legacyKey]: true, someFutureKey: 'x' };
    const s = SettingsJ.fromJson(j as never);
    expect(Object.keys(s).some((k) => k === legacyKey)).toBe(false);
    const back = SettingsJ.toJson(s) as Record<string, unknown>;
    expect(back[legacyKey]).toBe(true);
    expect(back['someFutureKey']).toBe('x');
    // a known key in `extra` can never override the real one
    const tampered = SettingsJ.toJson({ ...s, extra: { ...(s.extra as object), paydayDay: 9 } as never }) as Record<string, unknown>;
    expect(tampered['paydayDay']).toBe(s.paydayDay);
  });
});
