/**
 * One-time migration from the old Flutter web app (same origin, `hive_ce` boxes in IndexedDB)
 * into the React store.
 *
 * ## On-disk format (verified against hive_ce 2.20.1 + a real dump of the Flutter build)
 *   - One IndexedDB **database per box**, named `wlo_<box name lower-cased>` (version 1),
 *     e.g. `wlo_habits`, `wlo_weeklytasks`, `wlo_meta`.
 *   - Each database has a single object store called **`box`** (no keyPath, out-of-line keys).
 *   - Keys are the entity ids (strings). Values are the entity's **JSON string**
 *     (`jsonEncode(entity.toJson())`) — hive_ce stores Dart Strings as plain JS strings.
 *     Anything else would be a binary hive frame: ArrayBuffer starting `0x90 0xA9`, then a
 *     type byte (4 = String), uint32 little-endian byte length, UTF-8 bytes. We decode that
 *     String case too and skip any other frame with a report.
 *   - `wlo_meta` keys: `settings` (JSON), `openedDays` (JSON array), `firstRunDate`,
 *     `moduleState` (JSON, may be absent), `seeded` ('true'), `libraryVersion`.
 *   - `wlo_actions` / `wlo_enginerules` hold the shipped library → never migrated.
 *
 * ## Safety rules
 *   - The old databases are **only read**, never written or deleted (they stay as a fallback).
 *   - Migration goes through the normal `importAll` (automatic backup first, explicit confirm).
 *   - Idempotent: a small local marker (`wejdan.legacyMigration.v1`) records done / «بعدين».
 *   - Corrupt or unreadable records are skipped and listed in the report — never fatal.
 *   - Detection never creates databases (uses `indexedDB.databases()`, or an aborted open probe).
 */
import type { Json } from '../models';
import { kExportSchemaVersion, kFlutterBoxes, kSeedOnlyBoxes, type BackupInfo, type ExportJson } from '../storage';
import type { KeyValueStore } from '../seed/personalLibrary';

export const kLegacyPrefix = 'wlo_';
export const kLegacyStoreName = 'box';
export const kLegacyMarkerKey = 'wejdan.legacyMigration.v1';
/** «بعدين» snoozes the boot offer for this long. */
export const kLegacySnoozeMs = 24 * 60 * 60 * 1000;

/** Boxes we migrate (everything she owns; library boxes excluded). */
export const kLegacyDataBoxes: readonly string[] = kFlutterBoxes.filter((b) => !kSeedOnlyBoxes.includes(b));

/** Box name → legacy IndexedDB database name (hive lower-cases box names). */
export const legacyDbName = (box: string): string => `${kLegacyPrefix}${box.toLowerCase()}`;

const ID_KEYS: Record<string, string> = { domains: 'id', dayPlans: 'date', energyChecks: 'date' };

export interface LegacyBoxReport {
  box: string;
  /** Records read and decoded. */
  read: number;
  /** Records skipped (undecodable / not JSON / no id). */
  skipped: number;
  errors: string[];
}

export interface LegacyDetection {
  /** Any `wlo_*` database exists on this origin. */
  found: boolean;
  /** The old app had been set up (meta.seeded) or holds any data records. */
  hasData: boolean;
  /** Records per data box (library boxes excluded). */
  counts: Record<string, number>;
  /** Sum of `counts`. */
  total: number;
}

export interface LegacyReadResult {
  /** schemaVersion-1 export, accepted by `previewImport` / `importAll`. */
  data: ExportJson;
  report: LegacyBoxReport[];
  /** Total skipped records across boxes. */
  skipped: number;
}

export type LegacyMarker = { state: 'done'; at: string; backupId: string | null } | { state: 'later'; at: string };

// ---------------------------------------------------------------------------------------------
// Low-level IndexedDB helpers (no database is ever created or upgraded here)
// ---------------------------------------------------------------------------------------------

const req = <T>(r: IDBRequest<T>): Promise<T> =>
  new Promise((ok, ko) => {
    r.onsuccess = () => ok(r.result);
    r.onerror = () => ko(r.error ?? new Error('IndexedDB request failed'));
  });

/**
 * Opens an EXISTING database without leaving a new one behind. Opening without a version
 * never upgrades an existing DB, so `upgradeneeded` (oldVersion 0) means it did not exist:
 * we abort, and delete the empty shell some engines keep after an aborted creation.
 */
function openExisting(idb: IDBFactory, name: string): Promise<IDBDatabase | null> {
  return new Promise((ok) => {
    let created = false;
    let r: IDBOpenDBRequest;
    const finishNull = () => {
      if (!created) {
        ok(null);
        return;
      }
      try {
        const d = idb.deleteDatabase(name);
        d.onsuccess = d.onerror = d.onblocked = () => ok(null);
      } catch {
        ok(null);
      }
    };
    try {
      r = idb.open(name);
    } catch {
      ok(null);
      return;
    }
    r.onupgradeneeded = (e) => {
      if (e.oldVersion !== 0) return;
      created = true;
      try {
        r.transaction?.abort();
      } catch {
        /* ignore */
      }
    };
    r.onsuccess = () => {
      if (created) {
        r.result.close();
        finishNull();
      } else ok(r.result);
    };
    r.onerror = () => finishNull();
    r.onblocked = () => ok(null);
  });
}

async function legacyDatabaseNames(idb: IDBFactory): Promise<Set<string>> {
  const wanted = [...kLegacyDataBoxes, 'meta'].map(legacyDbName);
  const anyIdb = idb as IDBFactory & { databases?: () => Promise<IDBDatabaseInfo[]> };
  if (typeof anyIdb.databases === 'function') {
    try {
      const all = await anyIdb.databases();
      return new Set(all.map((d) => d.name ?? '').filter((n) => n.startsWith(kLegacyPrefix)));
    } catch {
      /* fall through to probing */
    }
  }
  const found = new Set<string>();
  for (const n of wanted) {
    const db = await openExisting(idb, n);
    if (db) {
      found.add(n);
      db.close();
    }
  }
  return found;
}

/** Raw entries of one legacy box ([] when the database or its `box` store is missing). */
async function readRawBox(idb: IDBFactory, dbName: string): Promise<{ key: IDBValidKey; value: unknown }[]> {
  const db = await openExisting(idb, dbName);
  if (!db) return [];
  try {
    if (!db.objectStoreNames.contains(kLegacyStoreName)) return [];
    const tx = db.transaction(kLegacyStoreName, 'readonly');
    const st = tx.objectStore(kLegacyStoreName);
    const [keys, values] = await Promise.all([req(st.getAllKeys()), req(st.getAll())]);
    return keys.map((key, i) => ({ key, value: values[i] }));
  } finally {
    db.close();
  }
}

// ---------------------------------------------------------------------------------------------
// Value decoding
// ---------------------------------------------------------------------------------------------

const HIVE_PREFIX = [0x90, 0xa9] as const;
const HIVE_STRING_T = 4;

function asBytes(v: unknown): Uint8Array | null {
  if (v instanceof Uint8Array) return v;
  if (v instanceof ArrayBuffer) return new Uint8Array(v);
  if (ArrayBuffer.isView(v)) return new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
  // Cross-realm ArrayBuffers (fake-indexeddb / structured clone) fail instanceof checks.
  if (v != null && typeof v === 'object' && Object.prototype.toString.call(v) === '[object ArrayBuffer]') {
    return new Uint8Array(v as ArrayBuffer);
  }
  return null;
}

/** A hive value → the stored JSON string, or null if it isn't one (caller reports it). */
export function decodeHiveValue(v: unknown): string | null {
  if (typeof v === 'string') return v;
  const b = asBytes(v);
  if (b == null) return null;
  if (b.length < 7 || b[0] !== HIVE_PREFIX[0] || b[1] !== HIVE_PREFIX[1] || b[2] !== HIVE_STRING_T) return null;
  const len = (b[3]! | (b[4]! << 8) | (b[5]! << 16) | (b[6]! << 24)) >>> 0;
  if (7 + len > b.length) return null;
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(b.subarray(7, 7 + len));
  } catch {
    return null;
  }
}

function parseJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}

const isObj = (v: unknown): v is Json => v != null && typeof v === 'object' && !Array.isArray(v);

// ---------------------------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------------------------

function defaultIdb(): IDBFactory | null {
  try {
    return (globalThis as { indexedDB?: IDBFactory }).indexedDB ?? null;
  } catch {
    return null;
  }
}

/** Is there data from the old Flutter app on this origin? Read-only, creates nothing. */
export async function detectLegacyData(idb: IDBFactory | null = defaultIdb()): Promise<LegacyDetection> {
  const empty: LegacyDetection = { found: false, hasData: false, counts: {}, total: 0 };
  if (idb == null) return empty;
  let names: Set<string>;
  try {
    names = await legacyDatabaseNames(idb);
  } catch {
    return empty;
  }
  if (names.size === 0) return empty;
  const counts: Record<string, number> = {};
  let total = 0;
  for (const box of kLegacyDataBoxes) {
    const n = legacyDbName(box);
    if (!names.has(n)) continue;
    try {
      const c = (await readRawBox(idb, n)).length;
      if (c > 0) counts[box] = c;
      total += c;
    } catch {
      /* unreadable box → counted as 0 */
    }
  }
  let seeded = false;
  if (names.has(legacyDbName('meta'))) {
    try {
      const meta = await readRawBox(idb, legacyDbName('meta'));
      seeded = meta.some((e) => e.key === 'seeded' && decodeHiveValue(e.value) === 'true');
    } catch {
      /* ignore */
    }
  }
  return { found: true, hasData: seeded || total > 0, counts, total };
}

/** Reads every legacy box into the schemaVersion-1 export shape (read-only). */
export async function readLegacyData(idb: IDBFactory | null = defaultIdb(), now: Date = new Date()): Promise<LegacyReadResult> {
  if (idb == null) throw new Error('IndexedDB unavailable');
  const names = await legacyDatabaseNames(idb);
  const boxes: Record<string, Json[]> = {};
  const report: LegacyBoxReport[] = [];
  let skipped = 0;

  for (const box of kLegacyDataBoxes) {
    const n = legacyDbName(box);
    const r: LegacyBoxReport = { box, read: 0, skipped: 0, errors: [] };
    const list: Json[] = [];
    if (names.has(n)) {
      let raw: { key: IDBValidKey; value: unknown }[] = [];
      try {
        raw = await readRawBox(idb, n);
      } catch (e) {
        r.errors.push(`box unreadable: ${String(e)}`);
      }
      for (const { key, value } of raw) {
        const s = decodeHiveValue(value);
        const j = s == null ? undefined : parseJson(s);
        if (!isObj(j)) {
          r.skipped++;
          r.errors.push(`${String(key)}: ${s == null ? 'not a hive string' : 'not a JSON object'}`);
          continue;
        }
        const idKey = ID_KEYS[box] ?? 'id';
        const id = j[idKey];
        if (typeof id !== 'string' || id === '') {
          // Hive key is the id — restore it if the record lost its id field.
          if (typeof key === 'string' && key !== '') j[idKey] = key;
          else {
            r.skipped++;
            r.errors.push(`${String(key)}: no id`);
            continue;
          }
        }
        list.push(j);
        r.read++;
      }
    }
    boxes[box] = list;
    skipped += r.skipped;
    report.push(r);
  }

  // meta
  const metaReport: LegacyBoxReport = { box: 'meta', read: 0, skipped: 0, errors: [] };
  const metaRaw = names.has(legacyDbName('meta')) ? await readRawBox(idb, legacyDbName('meta')).catch(() => []) : [];
  const metaStr = new Map<string, string>();
  for (const { key, value } of metaRaw) {
    const s = decodeHiveValue(value);
    if (s == null) {
      metaReport.skipped++;
      metaReport.errors.push(`${String(key)}: not a hive string`);
      continue;
    }
    metaStr.set(String(key), s);
    metaReport.read++;
  }
  const settings = parseJson(metaStr.get('settings') ?? '');
  const moduleState = parseJson(metaStr.get('moduleState') ?? '');
  const opened = parseJson(metaStr.get('openedDays') ?? '');
  if (metaStr.has('settings') && !isObj(settings)) metaReport.errors.push('settings: not a JSON object (defaults used)');
  skipped += metaReport.skipped;
  report.push(metaReport);

  const data: ExportJson = {
    schemaVersion: kExportSchemaVersion,
    exportedAt: now.toISOString(),
    boxes,
    meta: {
      settings: isObj(settings) ? settings : {},
      openedDays: Array.isArray(opened) ? opened.filter((d): d is string => typeof d === 'string').sort() : [],
      firstRunDate: metaStr.get('firstRunDate') ?? null,
      moduleState: isObj(moduleState) ? moduleState : {},
      source: 'flutter-hive',
    },
  };
  return { data, report, skipped };
}

// ---------------------------------------------------------------------------------------------
// Marker + offer logic
// ---------------------------------------------------------------------------------------------

function defaultKv(): KeyValueStore | null {
  try {
    return (globalThis as { localStorage?: KeyValueStore }).localStorage ?? null;
  } catch {
    return null;
  }
}

export function readLegacyMarker(kv: KeyValueStore | null = defaultKv()): LegacyMarker | null {
  if (kv == null) return null;
  try {
    const s = kv.getItem(kLegacyMarkerKey);
    if (s == null) return null;
    const j = JSON.parse(s) as LegacyMarker;
    return j && (j.state === 'done' || j.state === 'later') ? j : null;
  } catch {
    return null;
  }
}

export function writeLegacyMarker(m: LegacyMarker, kv: KeyValueStore | null = defaultKv()): void {
  try {
    kv?.setItem(kLegacyMarkerKey, JSON.stringify(m));
  } catch {
    /* storage blocked — the offer may show again, which is harmless */
  }
}

/** «بعدين»: don't ask again at boot for [kLegacySnoozeMs]. */
export function snoozeLegacyMigration(now: Date = new Date(), kv: KeyValueStore | null = defaultKv()): void {
  writeLegacyMarker({ state: 'later', at: now.toISOString() }, kv);
}

/** Minimal view of the new store used to decide whether it is still "empty". */
export interface StoreEmptinessView {
  settings: { onboardingDone: boolean };
  logs: readonly unknown[];
  tasks: readonly unknown[];
  inbox: readonly unknown[];
}

/** True while she hasn't used the new app yet (fresh neutral seed only). */
export const newStoreIsEmpty = (s: StoreEmptinessView): boolean =>
  !s.settings.onboardingDone && s.logs.length === 0 && s.tasks.length === 0 && s.inbox.length === 0;

export interface LegacyOffer {
  /** Show the boot sheet now. */
  offer: boolean;
  detection: LegacyDetection;
  /** The new store already has her data — importing would replace it (Settings must warn). */
  wouldReplace: boolean;
}

/**
 * Should the app offer to move the old data? Boot rule: legacy data exists, not migrated yet,
 * not snoozed in the last 24 h, and the new store is still empty.
 */
export async function shouldOfferLegacyMigration(
  snapshot: StoreEmptinessView,
  o: { idb?: IDBFactory | null; kv?: KeyValueStore | null; now?: Date } = {},
): Promise<LegacyOffer> {
  const kv = o.kv === undefined ? defaultKv() : o.kv;
  const now = o.now ?? new Date();
  const detection = await detectLegacyData(o.idb === undefined ? defaultIdb() : o.idb);
  const wouldReplace = !newStoreIsEmpty(snapshot);
  if (!detection.found || !detection.hasData) return { offer: false, detection, wouldReplace };
  const m = readLegacyMarker(kv);
  if (m?.state === 'done') return { offer: false, detection, wouldReplace };
  if (m?.state === 'later' && now.getTime() - Date.parse(m.at) < kLegacySnoozeMs) return { offer: false, detection, wouldReplace };
  return { offer: !wouldReplace, detection, wouldReplace };
}

/** Set once the post-onboarding re-offer was shown (after that, Settings is the way in). */
export const kLegacyReofferKey = 'wejdan.legacyMigration.reoffered.v1';

/** Old data exists, has records, and hasn't been moved yet — Settings shows its entry while true. */
export async function legacyMigrationAvailable(
  o: { idb?: IDBFactory | null; kv?: KeyValueStore | null } = {},
): Promise<{ available: boolean; detection: LegacyDetection }> {
  const detection = await detectLegacyData(o.idb === undefined ? defaultIdb() : o.idb);
  const m = readLegacyMarker(o.kv === undefined ? defaultKv() : o.kv);
  return { available: detection.found && detection.hasData && m?.state !== 'done', detection };
}

/**
 * After she finished onboarding (or already uses the new app) and the old data is still there,
 * offer once more — as a reviewed merge, never a silent replace. The 24 h snooze from the boot
 * offer doesn't block this: it exists exactly for the «بعدين → onboarding» path.
 */
export async function shouldReofferLegacyMigration(
  snapshot: StoreEmptinessView,
  o: { idb?: IDBFactory | null; kv?: KeyValueStore | null } = {},
): Promise<LegacyOffer> {
  const kv = o.kv === undefined ? defaultKv() : o.kv;
  const { available, detection } = await legacyMigrationAvailable({ idb: o.idb, kv });
  const wouldReplace = !newStoreIsEmpty(snapshot);
  let reoffered = false;
  try {
    reoffered = kv?.getItem(kLegacyReofferKey) != null;
  } catch {
    reoffered = false;
  }
  return { offer: available && snapshot.settings.onboardingDone && wouldReplace && !reoffered, detection, wouldReplace };
}

export function markLegacyReoffered(now: Date = new Date(), kv: KeyValueStore | null = defaultKv()): void {
  try {
    kv?.setItem(kLegacyReofferKey, now.toISOString());
  } catch {
    /* storage blocked — the re-offer may show again, which is harmless */
  }
}

/** Marks the move done after a reviewed import (Settings path). */
export function markLegacyMigrated(backupId: string | null, now: Date = new Date(), kv: KeyValueStore | null = defaultKv()): void {
  writeLegacyMarker({ state: 'done', at: now.toISOString(), backupId }, kv);
}

/** What the store must provide (LifeStore satisfies it). */
export interface LegacyImportTarget {
  importAll(data: unknown, o: { confirm: boolean }): Promise<BackupInfo>;
}

export interface LegacyMigrationResult {
  backup: BackupInfo;
  report: LegacyBoxReport[];
  /** Records imported per box. */
  imported: Record<string, number>;
  skipped: number;
}

/**
 * Moves the old Flutter data into the new store: read (old DBs untouched) → importAll with
 * automatic backup → marker 'done'. Requires `confirm: true` (she tapped «نقلها»).
 */
export async function migrateLegacyData(
  store: LegacyImportTarget,
  o: { confirm: boolean; idb?: IDBFactory | null; kv?: KeyValueStore | null; now?: Date },
): Promise<LegacyMigrationResult> {
  if (!o.confirm) throw new Error('Legacy migration needs explicit confirmation');
  const now = o.now ?? new Date();
  const { data, report, skipped } = await readLegacyData(o.idb === undefined ? defaultIdb() : o.idb, now);
  const imported: Record<string, number> = {};
  for (const [b, list] of Object.entries(data.boxes)) if (list.length > 0) imported[b] = list.length;
  const backup = await store.importAll(data, { confirm: true });
  writeLegacyMarker({ state: 'done', at: now.toISOString(), backupId: backup.id }, o.kv === undefined ? defaultKv() : o.kv);
  return { backup, report, imported, skipped };
}
