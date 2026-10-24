/**
 * Old Flutter app → React store migration (same origin, hive_ce IndexedDB `wlo_*` databases).
 * The fixture reproduces the real on-disk layout captured from the Flutter build
 * (one DB per box, object store `box`, string keys, JSON-string values; titles sanitised to "test").
 */
import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import layout from './fixtures/hive/flutter-hive-layout.json';
import {
  InMemoryLifeRepository, createLifeStore, decodeHiveValue, detectLegacyData, kLegacyDataBoxes, kLegacyMarkerKey,
  kLegacySnoozeMs, legacyDbName, migrateLegacyData, readLegacyData, readLegacyMarker, shouldOfferLegacyMigration,
  snoozeLegacyMigration, type KeyValueStore,
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

async function rawCount(idb: IDBFactory, name: string): Promise<number> {
  const d = await req(idb.open(name));
  const n = await req(d.transaction('box', 'readonly').objectStore('box').count());
  d.close();
  return n;
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

describe('legacy Flutter (hive_ce) data', () => {
  it('fixture matches the real layout: one wlo_ DB per box incl. meta, library boxes present', () => {
    expect(Object.keys(L.databases)).toContain('wlo_meta');
    expect(Object.keys(L.databases)).toContain('wlo_weeklytasks'); // hive lower-cases box names
    expect(legacyDbName('weeklyTasks')).toBe('wlo_weeklytasks');
    expect(expected['habits']).toBe(11);
    expect(expected['logs']).toBe(48);
    expect(expectedTotal).toBeGreaterThan(150);
  });

  it('detects nothing — and creates nothing — on a clean origin', async () => {
    const idb = new IDBFactory();
    const d = await detectLegacyData(idb);
    expect(d).toEqual({ found: false, hasData: false, counts: {}, total: 0 });
    expect(await idb.databases()).toEqual([]);
  });

  it('detects her old data with per-box counts (library boxes ignored)', async () => {
    const idb = new IDBFactory();
    await populate(idb, L.databases);
    const d = await detectLegacyData(idb);
    expect(d.found).toBe(true);
    expect(d.hasData).toBe(true);
    expect(d.counts).toEqual(expected);
    expect(d.total).toBe(expectedTotal);
    expect(d.counts['actions']).toBeUndefined();
  });

  it('works without indexedDB.databases() (older Safari) by probing, still creating nothing', async () => {
    const idb = new IDBFactory();
    await populate(idb, { wlo_habits: L.databases['wlo_habits']!, wlo_meta: L.databases['wlo_meta']! });
    const noList = Object.assign(Object.create(Object.getPrototypeOf(idb)), idb) as IDBFactory;
    Object.defineProperty(noList, 'databases', { value: undefined });
    Object.defineProperty(noList, 'open', { value: idb.open.bind(idb) });
    const d = await detectLegacyData(noList);
    expect(d.found).toBe(true);
    expect(d.counts).toEqual({ habits: 11 });
    // fake-indexeddb keeps an empty version-0 shell after an aborted creation (real Chromium
    // deletes it — covered by the browser e2e); either way nothing with data/version ≥ 1 appears.
    const created = (await idb.databases()).filter((x) => (x.version ?? 0) > 0).map((x) => x.name).sort();
    expect(created).toEqual(['wlo_habits', 'wlo_meta']);
  });

  it('reads every box into a schemaVersion-1 export the importer accepts', async () => {
    const idb = new IDBFactory();
    await populate(idb, L.databases);
    const { data, skipped } = await readLegacyData(idb, new Date('2026-10-24T10:00:00Z'));
    expect(skipped).toBe(0);
    expect(data.schemaVersion).toBe(1);
    expect(data.boxes['actions']).toBeUndefined();
    const meta = data.meta as Record<string, unknown>;
    expect((meta['settings'] as Record<string, unknown>)['onboardingDone']).toBe(true);
    expect(meta['openedDays']).toEqual(['2026-10-23']);
    expect(meta['firstRunDate']).toBe('2026-10-23');
    const store = await newStore();
    const p = await store.previewImport(data);
    expect(p.ok).toBe(true);
    expect(p.skipped).toBe(0);
    for (const [b, n] of Object.entries(expected)) expect(p.counts[b], b).toBe(n);
  });

  it('migrates everything into the new store, keeps the old DBs intact, marks done', async () => {
    const idb = new IDBFactory();
    await populate(idb, L.databases);
    const kv = new MemKv();
    const store = await newStore();
    const res = await migrateLegacyData(store, { confirm: true, idb, kv, now: new Date('2026-10-24T10:00:00Z') });
    expect(res.skipped).toBe(0);
    expect(res.imported).toEqual(expected);
    expect(res.backup.reason).toBe('before-import');

    const s = store.getSnapshot();
    expect(s.habits).toHaveLength(expected['habits']!);
    expect(s.logs).toHaveLength(expected['logs']!);
    expect(s.sparkTxns).toHaveLength(expected['sparkTxns']!);
    expect(s.goals).toHaveLength(expected['goals']!);
    expect(s.projects).toHaveLength(expected['projects']!);
    expect(s.routines).toHaveLength(expected['routines']!);
    expect(s.weeklyTasks).toHaveLength(expected['weeklyTasks']!);
    expect(s.joyItems).toHaveLength(expected['joyItems']!);
    expect(s.vocabCards).toHaveLength(expected['vocabCards']!);
    expect(s.bills).toHaveLength(expected['bills']!);
    expect(s.wishItems).toHaveLength(expected['wishItems']!);
    expect(s.drivingSessions).toHaveLength(expected['drivingSessions']!);
    // aquarium is retired in the new app (kept in storage, hidden from the snapshot)
    expect(s.domains.map((d) => d.id)).not.toContain('aquarium');
    expect(s.domains).toHaveLength(16);
    expect(s.settings.onboardingDone).toBe(true);
    expect(s.firstRunDate).toBe('2026-10-23');

    // old databases untouched
    for (const name of Object.keys(L.databases)) expect(await rawCount(idb, name), name).toBe(L.databases[name]!.entries.length);
    expect(readLegacyMarker(kv)?.state).toBe('done');
    expect(JSON.parse(kv.getItem(kLegacyMarkerKey)!).backupId).toBe(res.backup.id);
  });

  it('is idempotent: running it again yields the same data', async () => {
    const idb = new IDBFactory();
    await populate(idb, L.databases);
    const store = await newStore();
    await migrateLegacyData(store, { confirm: true, idb, kv: new MemKv() });
    await migrateLegacyData(store, { confirm: true, idb, kv: new MemKv() });
    expect(store.getSnapshot().logs).toHaveLength(expected['logs']!);
    expect(store.getSnapshot().habits).toHaveLength(expected['habits']!);
  });

  it('needs explicit confirmation', async () => {
    const store = await newStore();
    await expect(migrateLegacyData(store, { confirm: false, idb: new IDBFactory(), kv: new MemKv() })).rejects.toThrow();
  });

  it('boot offer: only for an empty new store, not after done, snoozed 24 h by «بعدين»', async () => {
    const idb = new IDBFactory();
    await populate(idb, L.databases);
    const kv = new MemKv();
    const store = await newStore();
    const t0 = new Date('2026-10-24T10:00:00Z');

    const a = await shouldOfferLegacyMigration(store.getSnapshot(), { idb, kv, now: t0 });
    expect(a.offer).toBe(true);
    expect(a.wouldReplace).toBe(false);

    snoozeLegacyMigration(t0, kv);
    expect((await shouldOfferLegacyMigration(store.getSnapshot(), { idb, kv, now: new Date(t0.getTime() + 60_000) })).offer).toBe(false);
    expect((await shouldOfferLegacyMigration(store.getSnapshot(), { idb, kv, now: new Date(t0.getTime() + kLegacySnoozeMs + 1) })).offer).toBe(true);

    await store.quickAdd('test');
    const c = await shouldOfferLegacyMigration(store.getSnapshot(), { idb, kv, now: new Date(t0.getTime() + kLegacySnoozeMs + 1) });
    expect(c.offer).toBe(false);
    expect(c.wouldReplace).toBe(true);

    const fresh = await newStore();
    await migrateLegacyData(fresh, { confirm: true, idb, kv });
    expect((await shouldOfferLegacyMigration(fresh.getSnapshot(), { idb, kv })).offer).toBe(false);
  });

  it('no offer when there is no old data', async () => {
    const store = await newStore();
    expect((await shouldOfferLegacyMigration(store.getSnapshot(), { idb: new IDBFactory(), kv: new MemKv() })).offer).toBe(false);
  });

  it('robust to corrupt records: skips with a report, restores ids from keys, decodes hive binary strings', async () => {
    const idb = new IDBFactory();
    const habit = L.databases['wlo_habits']!.entries[0]!;
    const noId = JSON.parse(habit.value as string) as Record<string, unknown>;
    delete noId['id'];
    const json = JSON.stringify({ ...JSON.parse(habit.value as string), id: 'h_bin' });
    const utf8 = new TextEncoder().encode(json);
    const frame = new Uint8Array(7 + utf8.length);
    frame.set([0x90, 0xa9, 4, utf8.length & 255, (utf8.length >> 8) & 255, (utf8.length >> 16) & 255, utf8.length >>> 24]);
    frame.set(utf8, 7);
    await populate(idb, {
      wlo_meta: L.databases['wlo_meta']!,
      wlo_habits: {
        version: 1,
        store: 'box',
        entries: [
          habit,
          { key: 'h_broken', value: '{not json' },
          { key: 'h_noid', value: JSON.stringify(noId) },
          { key: 'h_bin', value: frame.buffer },
          { key: 'h_int', value: new Uint8Array([0x90, 0xa9, 1, 0, 0, 0, 0, 0, 0, 0, 0]).buffer },
        ],
      },
    });
    const { data, report, skipped } = await readLegacyData(idb);
    const ids = (data.boxes['habits'] ?? []).map((h) => h['id']);
    expect(ids).toEqual(expect.arrayContaining([habit.key, 'h_noid', 'h_bin']));
    expect(ids).not.toContain('h_broken');
    expect(skipped).toBe(2);
    expect(report.find((r) => r.box === 'habits')).toMatchObject({ read: 3, skipped: 2 });
  });

  it('decodeHiveValue: plain strings, String frames, rejects other frames', () => {
    expect(decodeHiveValue('{"a":1}')).toBe('{"a":1}');
    const b = new TextEncoder().encode('مرحبا');
    const f = new Uint8Array([0x90, 0xa9, 4, b.length, 0, 0, 0, ...b]);
    expect(decodeHiveValue(f)).toBe('مرحبا');
    expect(decodeHiveValue(new Uint8Array([1, 2, 3]))).toBeNull();
    expect(decodeHiveValue(42)).toBeNull();
  });
});
