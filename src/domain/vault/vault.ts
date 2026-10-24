/**
 * Profiles + app lock, all on this device. A "profile" = own username, own password, own recovery
 * code and its OWN IndexedDB database whose record values are AES-GCM encrypted (see crypto.ts).
 * The registry (names, usernames, avatars, salts, wrapped keys, attempt counters) lives in
 * localStorage: none of it is secret. With no registry the app runs exactly as before (one plain DB).
 *
 * DURABILITY (nothing that is the only copy of her data is ever deleted before the new copy is proven):
 *   - every profile database also carries a plaintext HEADER (its own profile record: salts, wrapped data key,
 *     verifier, name, username, avatar, revision). Either store can rebuild the other — if localStorage loses the
 *     registry (a browser kill before it was flushed, eviction), `recover()` rebuilds it from the headers.
 *   - turning the lock on keeps the old plain database untouched ("rollback", named in `registry.legacy`) and only
 *     deletes it after a SUCCESSFUL real unlock with the new credentials on a LATER launch.
 *   - the registry is versioned (`rev`); every write re-reads the stored copy first (compare-and-set) so a stale tab
 *     can never overwrite another tab's change.
 *   - change-password / new recovery code / add-profile write the header first, then the registry, then read both back.
 *   - the registry lives in localStorage, which a killed browser may never have flushed. So NO destructive IndexedDB step
 *     ever runs before a durable IndexedDB marker, and a database that carries such a marker is deleted only on a LATER
 *     launch, after the registry (as it survived on disk) no longer lists it:
 *       turn-off  -> plain DB copied + verified, header `retired` written, registry removed; the encrypted DB stays until
 *                    the next launch's recover() (it needs the plain DB to still hold her data);
 *       delete    -> header `deleted` written first (mandatory), registry, plain rollback copy and the records wiped; the empty
 *                    shell (header only) is removed by the next launch's recover();
 *       enable    -> header `migrating` written before the copy; an abandoned one is removed only when it is old, unreferenced
 *                    and its plain source still exists.
 *     recover() also refuses to leave a registry row whose database is missing while a plain database with data exists:
 *     the lock is dropped and her plain data opens (never an empty profile), and unlock() never opens a missing database.
 *
 * WHAT IS ENCRYPTED AT REST (AES-GCM-256, per-record random IV, row address authenticated):
 *   every record VALUE of the profile's database — all boxes incl. settings/meta, notes, money, logs, the
 *   automatic backups' snapshots and the stored action library.
 * WHAT IS NOT (readable by anyone who can open the browser profile):
 *   - IndexedDB database name, box names, record ids (day keys, generated ids AND semantic ids such as habit/product ids),
 *     record counts and sizes;
 *   - the profile registry AND the identical header row inside each profile database: display name, username, avatar, KDF
 *     salts/cost, the wrapped keys, attempt counter (registry only), auto-lock choice (registry only);
 *   - the PRE-LOCK plain database: it is kept untouched (plaintext!) as a rollback until the first real unlock on a LATER launch;
 *   - per-device localStorage conveniences kept by the app (recent searches, unsent review draft, today's pick, focus
 *     block, theme, per-profile reminder memory = reminder ids + snooze times) — wiped on manual lock / switch / delete, NOT on
 *     auto-lock. Her personal action library is NOT among them: with the lock on it lives inside the encrypted database;
 *   - the plain Flutter-era databases of the old app, if any (never touched by the lock).
 * While unlocked the decrypted data lives in JS memory (the LifeStore) and the data key is a non-extractable CryptoKey.
 * This stops someone who copies the device storage; it does not stop malware/an XSS in the running origin or
 * a determined offline guesser against a weak password.
 */
import { asJson, type Json } from '../core/json';
import {
  DexieLifeRepository, databaseExists, deleteDatabase, kAllBoxes, listDatabaseNames, readDatabaseHeader, writeDatabaseHeader,
  type BoxName, type LifeRepository, type RowCipher,
} from '../storage';
import {
  TamperError, changePasswordEnvelope, createEnvelope, isEncryptedBackup, openValue, resetWithRecoveryEnvelope,
  rotateRecoveryEnvelope, sealValue, unlockWithPassword, unlockWithRecovery, decryptBackup, encryptBackup,
  type EncryptedBackupFile, type KeyEnvelope,
} from './crypto';
import { isValidPassword, isValidUsername, normalizeUsername } from './credentials';
import {
  canAttempt, isAutoLock, kAutoLockDefault, kNoAttempts, recordFailure, remainingSeconds, type AttemptState, type AutoLock,
} from './lockPolicy';

export const kPlainDbName = 'wejdan_life_os';
export const kProfileDbPrefix = `${kPlainDbName}_p_`;
const kRegistryKey = 'wejdan.vault.v1';
const kChannel = 'wejdan.vault.registry';
/** A `migrating` database younger than this may belong to another tab that is still copying: never touched. */
export const kMigrationStaleMs = 10 * 60 * 1000;

export type AvatarSpec = { kind: 'initial' } | { kind: 'flower'; flower: string };

export interface Profile {
  id: string;
  name: string;
  username: string;
  avatar: AvatarSpec;
  dbName: string;
  envelope: KeyEnvelope;
  createdAt: string;
  attempts: AttemptState;
  /** Monotonic per-profile revision of everything mirrored in the database header (envelope, name, avatar). */
  rev?: number;
}
/** The pre-lock plain database kept as a rollback until a real unlock on a later launch proves the vault. */
export interface LegacyMark {
  dbName: string;
  ownerId: string;
  since: string;
}
interface VaultState {
  v: 1;
  /** Monotonic registry revision: bumped on every write, checked on every write (compare-and-set). */
  rev: number;
  profiles: Profile[];
  activeId: string | null;
  autoLock: AutoLock;
  legacy?: LegacyMark;
  /** Old registries: a verified plain DB whose deletion failed. */
  legacyDeletePending?: boolean;
  /** Profile ids removed on purpose (so an orphaned database is never resurrected). */
  deleted?: string[];
}

/** What a profile database carries about itself, in plaintext (nothing here is secret). */
interface VaultHeader extends Json {
  v: 1;
  profile: Json;
  legacy?: Json;
  /** The profile is being deleted on purpose (an interrupted delete is finished at the next launch). */
  deleted?: boolean;
  /** The lock was turned off: its contents were copied and verified into the plain database. */
  retired?: boolean;
  /** Turning the lock on is copying into this database and has not finished (an old, unreferenced one is abandoned). */
  migrating?: boolean;
  savedAt: string;
}

export interface KeyValue {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}
const memoryKv = (): KeyValue => {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
};
function defaultKv(): KeyValue {
  try {
    const ls = globalThis.localStorage;
    ls.getItem(kRegistryKey);
    return ls;
  } catch {
    return memoryKv();
  }
}

export interface Session {
  profile: Profile;
  repo: DexieLifeRepository;
  /** Memory only, non-extractable. */
  key: CryptoKey;
}

export type UnlockResult =
  | { ok: true; session: Session }
  | { ok: false; reason: 'wrong' | 'wait' | 'missing'; retryAt: number; failures: number };

export interface PreparedProfile {
  profile: Profile;
  key: CryptoKey;
  /** Shown once. Never stored. */
  recoveryCode: string;
}

export class VaultError extends Error {
  constructor(readonly code: 'invalid-username' | 'invalid-password' | 'username-taken' | 'no-storage' | 'migration-failed' | 'multiple-profiles' | 'wrong-password' | 'conflict') {
    super(code);
  }
}

/** Test-only: thrown by a fault-injection hook to emulate the process dying at that exact step. */
export class SimulatedCrash extends Error {
  constructor(readonly at: string) {
    super(`simulated crash at ${at}`);
  }
}
export interface VaultHooks {
  /** Called between the durable steps of every migration / commit. Throwing [SimulatedCrash] freezes this Vault's I/O. */
  step?(name: string): void | Promise<void>;
}
export interface VaultOptions {
  hooks?: VaultHooks;
  /** Listen for other tabs' registry writes (default: only with the real localStorage). */
  crossTab?: boolean;
}

export function makeRowCipher(key: CryptoKey): RowCipher {
  return {
    seal: (box, id, value) => sealValue(key, `${box}\u0000${id}`, value) as unknown as Promise<Json>,
    open: (box, id, stored) => openValue(key, `${box}\u0000${id}`, stored),
  };
}

const hex = (n: number) => [...globalThis.crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, '0')).join('');
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** Stable JSON (sorted keys) for record-by-record comparison. */
export function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o).sort().map((k) => `${JSON.stringify(k)}:${canonical(o[k])}`).join(',')}}`;
  }
  return JSON.stringify(v) ?? 'null';
}

export interface CopyReport {
  counts: Record<string, number>;
  total: number;
}
/**
 * Copies every record of every box from [src] to [dst] and PROVES it: the destination is read back and
 * must hold exactly the same records (count per box and content). Throws (nothing is deleted) otherwise.
 */
export async function copyRepository(src: LifeRepository, dst: LifeRepository): Promise<CopyReport> {
  const counts: Record<string, number> = {};
  let total = 0;
  for (const box of kAllBoxes) {
    const entries = await src.readEntries(box);
    await dst.clearBox(box);
    if (entries.length) await dst.writeAll(box, new Map(entries));
    counts[box] = entries.length;
    total += entries.length;
  }
  for (const box of kAllBoxes) {
    const a = new Map(await src.readEntries(box));
    const b = new Map(await dst.readEntries(box));
    if (a.size !== b.size || a.size !== counts[box]) throw new VaultError('migration-failed');
    for (const [id, v] of a) {
      const w = b.get(id);
      if (w === undefined || canonical(v) !== canonical(w)) throw new VaultError('migration-failed');
    }
  }
  return { counts, total };
}

type Listener = () => void;

type HeaderExtra = { legacy?: LegacyMark; deleted?: boolean; retired?: boolean; migrating?: boolean };
const profileHeader = (p: Profile, extra: HeaderExtra = {}): VaultHeader => {
  const { attempts: _attempts, ...rest } = p;
  void _attempts;
  const h: VaultHeader = { v: 1, profile: clone(rest) as unknown as Json, savedAt: new Date().toISOString() };
  if (extra.legacy) h.legacy = { dbName: extra.legacy.dbName };
  if (extra.deleted) h.deleted = true;
  if (extra.retired) h.retired = true;
  if (extra.migrating) h.migrating = true;
  return h;
};
/** A header read from disk, or null when it is missing / damaged. */
function parseHeader(raw: Json | null): { profile: Profile; legacyDb?: string; deleted: boolean; retired: boolean; migrating: boolean; savedAt: number } | null {
  try {
    if (!raw || raw['v'] !== 1) return null;
    const p = raw['profile'] as unknown as Profile | undefined;
    if (!p || typeof p.id !== 'string' || typeof p.dbName !== 'string' || typeof p.username !== 'string' || !p.envelope || typeof p.envelope !== 'object') return null;
    const l = raw['legacy'] as { dbName?: unknown } | undefined;
    return {
      profile: { ...p, name: typeof p.name === 'string' ? p.name : p.username, avatar: p.avatar ?? { kind: 'initial' }, createdAt: typeof p.createdAt === 'string' ? p.createdAt : '', attempts: kNoAttempts, rev: typeof p.rev === 'number' ? p.rev : 0 },
      legacyDb: l && typeof l.dbName === 'string' ? l.dbName : undefined,
      deleted: raw['deleted'] === true,
      retired: raw['retired'] === true,
      migrating: raw['migrating'] === true,
      savedAt: typeof raw['savedAt'] === 'string' ? Date.parse(raw['savedAt']) : NaN,
    };
  } catch {
    return null;
  }
}

export class Vault {
  private state: VaultState | null;
  private readonly listeners = new Set<Listener>();
  private version = 0;
  private dead = false;
  /** The rollback mark found when this page loaded: only a later launch's unlock may finalize it. */
  private readonly bootLegacy: LegacyMark | null;
  private finalizing: Promise<void> = Promise.resolve();
  private channel: BroadcastChannel | null = null;
  private readonly kv: KeyValue;
  constructor(kv?: KeyValue, private readonly iterations?: number, private readonly opts: VaultOptions = {}) {
    this.kv = kv ?? defaultKv();
    this.state = this.parse(this.readRaw());
    this.bootLegacy = this.state?.legacy ?? null;
    if (opts.crossTab ?? kv === undefined) this.listenOtherTabs();
  }

  // ---- registry -----------------------------------------------------------------------------
  private readRaw(): string | null {
    try {
      return this.kv.getItem(kRegistryKey);
    } catch {
      return null;
    }
  }
  private parse(raw: string | null): VaultState | null {
    try {
      if (!raw) return null;
      const j = asJson(JSON.parse(raw));
      if (j['v'] !== 1 || !Array.isArray(j['profiles']) || j['profiles'].length === 0) return null;
      const profiles = (j['profiles'] as Profile[]).map((p) => ({ ...p, attempts: p.attempts ?? kNoAttempts, rev: typeof p.rev === 'number' ? p.rev : 0 }));
      const auto = j['autoLock'];
      const l = j['legacy'] as LegacyMark | undefined;
      return {
        v: 1,
        rev: typeof j['rev'] === 'number' ? (j['rev'] as number) : 0,
        profiles,
        activeId: typeof j['activeId'] === 'string' ? j['activeId'] : null,
        autoLock: isAutoLock(auto) ? auto : kAutoLockDefault,
        legacy: l && typeof l.dbName === 'string' && typeof l.ownerId === 'string' ? { dbName: l.dbName, ownerId: l.ownerId, since: String(l.since ?? '') } : undefined,
        legacyDeletePending: j['legacyDeletePending'] === true,
        deleted: Array.isArray(j['deleted']) ? (j['deleted'] as unknown[]).filter((x): x is string => typeof x === 'string') : undefined,
      };
    } catch {
      return null;
    }
  }
  private step = async (name: string): Promise<void> => {
    if (this.dead) throw new SimulatedCrash(name);
    try {
      await this.opts.hooks?.step?.(name);
    } catch (e) {
      if (e instanceof SimulatedCrash) this.dead = true;
      throw e;
    }
  };
  /** After a simulated crash nothing this instance does may reach storage (a dead process writes nothing). */
  private alive(): void {
    if (this.dead) throw new SimulatedCrash('after-crash');
  }
  private delDb = async (name: string): Promise<void> => {
    this.alive();
    await deleteDatabase(name);
  };
  private notify(): void {
    this.version++;
    for (const l of this.listeners) l();
  }
  /** Re-reads the stored registry; adopts it when it is newer than ours. Returns true when something changed. */
  refresh(): boolean {
    const stored = this.parse(this.readRaw());
    if (stored && stored.rev > (this.state?.rev ?? -1)) {
      this.state = stored;
      this.notify();
      return true;
    }
    return false;
  }
  private listenOtherTabs(): void {
    try {
      if (typeof window !== 'undefined') {
        window.addEventListener('storage', (e) => {
          if (e.key !== kRegistryKey) return;
          if (e.newValue == null) {
            // another tab turned the lock off on purpose
            if (this.state) (this.state = null), this.notify();
            return;
          }
          this.refresh();
        });
      }
      if (typeof BroadcastChannel !== 'undefined') {
        this.channel = new BroadcastChannel(kChannel);
        (this.channel as unknown as { unref?: () => void }).unref?.();
        this.channel.onmessage = () => void this.refresh();
      }
    } catch {
      /* no cross-tab signalling: compare-and-set on every write still protects the registry */
    }
  }
  /**
   * The ONLY way the registry is written. Re-reads the stored copy, applies [mutate] to it (so another tab's
   * change is kept, never reverted), bumps `rev`, writes and reads back. [mutate] may throw to abort or return
   * false for "nothing to do". Retries when another tab wrote in between.
   */
  private commit(mutate: (s: VaultState) => boolean | void, o: { create?: () => VaultState; exclusive?: boolean } = {}): VaultState {
    this.alive();
    for (let attempt = 0; attempt < 5; attempt++) {
      const stored = this.parse(this.readRaw());
      if (o.exclusive && stored) throw new VaultError('multiple-profiles'); // another tab turned the lock on first
      let base = stored ?? this.state;
      if (!base && o.create) base = o.create();
      if (!base) throw new VaultError('no-storage');
      const next = clone(base);
      if (mutate(next) === false) {
        if (stored && stored !== this.state && stored.rev > (this.state?.rev ?? -1)) (this.state = stored), this.notify();
        return this.state ?? next;
      }
      next.rev = (stored?.rev ?? base.rev ?? 0) + 1;
      try {
        this.kv.setItem(kRegistryKey, JSON.stringify(next));
      } catch {
        /* storage blocked: the in-memory registry still works for this session (headers rebuild it next launch) */
        this.state = next;
        this.notify();
        return next;
      }
      const back = this.parse(this.readRaw());
      if (back && back.rev === next.rev) {
        this.state = next;
        this.notify();
        try {
          this.channel?.postMessage(next.rev);
        } catch {
          /* ignore */
        }
        return next;
      }
      // someone else wrote between our read and write: start over from their copy
    }
    throw new VaultError('conflict');
  }
  /** The registry as stored right now (a fresh read), or null. */
  private storedNow(): VaultState | null {
    return this.parse(this.readRaw());
  }
  private removeRegistry(): void {
    this.alive();
    try {
      this.kv.removeItem(kRegistryKey);
    } catch {
      /* ignore */
    }
    this.state = null;
    this.notify();
    try {
      this.channel?.postMessage(-1);
    } catch {
      /* ignore */
    }
  }
  subscribe = (l: Listener): (() => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };
  getVersion = (): number => this.version;

  get enabled(): boolean {
    return this.state != null;
  }
  get profiles(): readonly Profile[] {
    return this.state?.profiles ?? [];
  }
  get activeId(): string | null {
    return this.state?.activeId ?? null;
  }
  get autoLock(): AutoLock {
    return this.state?.autoLock ?? kAutoLockDefault;
  }
  /** Registry revision (monotonic) — exposed for tests and diagnostics. */
  get revision(): number {
    return this.state?.rev ?? 0;
  }
  /** The pre-lock database still kept as a rollback, if any. */
  get rollback(): LegacyMark | null {
    return this.state?.legacy ?? null;
  }
  profile(id: string): Profile | undefined {
    return this.state?.profiles.find((p) => p.id === id);
  }
  setAutoLock(t: AutoLock): void {
    if (!this.state) return;
    this.commit((s) => {
      s.autoLock = t;
    });
  }
  /** Seconds left in the soft delay for a profile (0 = may try). */
  waitSeconds(id: string, now = Date.now()): number {
    const p = this.profile(id);
    return p ? remainingSeconds(p.attempts, now) : 0;
  }

  // ---- headers (the copy of the profile metadata that lives inside the profile's own database) ----
  private async writeHeader(p: Profile, extra: HeaderExtra = {}, repo?: DexieLifeRepository): Promise<void> {
    this.alive();
    const h = profileHeader(p, extra);
    if (repo) await repo.writeHeader(h);
    else {
      // never CREATE a database just to hold a header: a missing profile database must stay visibly missing
      if (!(await databaseExists(p.dbName))) throw new VaultError('migration-failed');
      await writeDatabaseHeader(p.dbName, h);
    }
  }
  /** Reads the header back through a FRESH connection and checks it matches [p] (envelope + revision). */
  private async headerMatches(p: Profile): Promise<boolean> {
    const h = parseHeader(await readDatabaseHeader(p.dbName));
    return !!h && !h.deleted && !h.retired && !h.migrating && h.profile.id === p.id && (h.profile.rev ?? 0) === (p.rev ?? 0) && canonical(h.profile.envelope) === canonical(p.envelope);
  }
  private registryMatches(p: Profile): boolean {
    const q = this.storedNow()?.profiles.find((x) => x.id === p.id);
    return !!q && (q.rev ?? 0) === (p.rev ?? 0) && canonical(q.envelope) === canonical(p.envelope);
  }

  // ---- sessions -----------------------------------------------------------------------------
  private async openSession(profile: Profile, key: CryptoKey): Promise<Session> {
    if (typeof indexedDB === 'undefined') throw new VaultError('no-storage');
    const repo = new DexieLifeRepository(profile.dbName, makeRowCipher(key));
    await repo.open();
    return { profile, repo, key };
  }

  /** Retry a plain-DB deletion that failed right after a migration (old registries). */
  async cleanupLegacy(): Promise<void> {
    if (!this.state?.legacyDeletePending) return;
    try {
      await this.delDb(kPlainDbName);
      this.commit((s) => {
        s.legacyDeletePending = false;
      });
    } catch {
      /* try again next launch */
    }
  }

  /**
   * The pre-lock plain database is deleted only here: after a REAL unlock with the new credentials on a later
   * launch than the one that turned the lock on, and only when the registry and the profile header agree.
   */
  private async finalizeLegacy(p: Profile, repo: DexieLifeRepository): Promise<void> {
    const mark = this.bootLegacy;
    if (!mark || mark.ownerId !== p.id) return;
    const cur = this.state?.legacy;
    if (!cur || cur.dbName !== mark.dbName || cur.ownerId !== mark.ownerId) return;
    try {
      const fresh = this.profile(p.id);
      if (!fresh || !(await repo.isSeeded()) || !(await this.headerMatches(fresh)) || !this.registryMatches(fresh)) return;
      await this.step('finalize:beforeDelete');
      if (await databaseExists(mark.dbName)) await this.delDb(mark.dbName);
      await this.step('finalize:afterDelete');
      this.commit((s) => {
        if (!s.legacy || s.legacy.ownerId !== mark.ownerId) return false;
        delete s.legacy;
      });
      // the header keeps no rollback pointer once the plain DB is gone
      const f2 = this.profile(p.id);
      if (f2) await this.writeHeader(f2, {}, repo);
    } catch (e) {
      if (e instanceof SimulatedCrash) throw e;
      /* keep the rollback: it is retried at the next unlock */
    }
  }
  /** Resolves when any background finalization started by an unlock has settled (tests). */
  settled(): Promise<void> {
    return this.finalizing;
  }
  private scheduleFinalize(p: Profile, repo: DexieLifeRepository): void {
    if (!this.bootLegacy || this.bootLegacy.ownerId !== p.id) return;
    this.finalizing = this.finalizing.then(() => this.finalizeLegacy(p, repo)).catch(() => {});
  }

  // ---- boot-time recovery -------------------------------------------------------------------
  private recovering: Promise<{ rebuilt: number }> | null = null;
  /** `recover()` once per launch, however many components ask. */
  recoverOnce(): Promise<{ rebuilt: number }> {
    return (this.recovering ??= this.recover().catch(() => ({ rebuilt: 0 })));
  }
  /**
   * Reconciles the registry (localStorage) with the profile headers (IndexedDB). Run once per launch BEFORE the
   * app opens any database: it rebuilds a lost / partial registry from the headers, repairs a header that is behind,
   * and finishes interrupted deletions. It never deletes a database that could still hold her data.
   */
  async recover(now = Date.now()): Promise<{ rebuilt: number }> {
    let rebuilt = 0;
    this.refresh();
    const names = (await listDatabaseNames()).filter((n) => n.startsWith(kProfileDbPrefix));
    // What the registry looked like ON DISK when this launch began. Only this proves that an earlier launch's registry
    // write survived; anything this launch commits below may still be sitting unflushed in localStorage.
    const stored0 = this.storedNow();
    const listed0 = new Set((stored0 ?? this.state)?.profiles.map((x) => x.id) ?? []);
    const tomb0 = new Set(stored0?.deleted ?? []);
    for (const name of names) {
      this.alive();
      const h = parseHeader(await readDatabaseHeader(name));
      if (!h || h.profile.dbName !== name) {
        // a profile created before headers existed: give it one. Anything else without a header is an unfinished migration — left alone.
        const owner = this.state?.profiles.find((x) => x.dbName === name);
        if (owner) await this.writeHeader(owner, this.state?.legacy?.ownerId === owner.id && this.state.legacy ? { legacy: this.state.legacy } : {}).catch(() => {});
        continue;
      }
      const hp = h.profile;
      if (h.deleted || h.retired || tomb0.has(hp.id)) {
        // an interrupted delete / turn-off: finish it (the data was already copied and verified, or she asked to delete it)
        if (h.retired && !h.deleted && !(await this.plainHoldsData(h.legacyDb ?? kPlainDbName))) continue; // the encrypted copy is the only proven one: keep everything
        if (this.profile(hp.id)) {
          if (this.profiles.every((x) => x.id === hp.id)) this.removeRegistry();
          else
            this.commit((s) => {
              s.profiles = s.profiles.filter((x) => x.id !== hp.id);
              s.deleted = [...(s.deleted ?? []), hp.id].slice(-20);
              if (s.activeId === hp.id) s.activeId = null;
              if (s.legacy?.ownerId === hp.id) delete s.legacy;
            });
        }
        if (h.deleted && h.legacyDb) await this.delDb(h.legacyDb).catch(() => {});
        // The database goes only on a LATER launch than the one that removed the registry row: if that removal was never
        // flushed, the row would otherwise come back pointing at nothing (an empty "ghost" profile).
        if (!listed0.has(hp.id) || tomb0.has(hp.id)) await this.delDb(name).catch(() => {});
        continue;
      }
      if (h.migrating) {
        // turning the lock on was interrupted before the vault was proven. Removed only when it is clearly abandoned:
        // not in the registry, older than any plausible running migration (another tab), and its plain source still exists.
        const abandoned = !this.profile(hp.id) && !listed0.has(hp.id) && Number.isFinite(h.savedAt) && now - h.savedAt > kMigrationStaleMs;
        if (abandoned && h.legacyDb && (await databaseExists(h.legacyDb))) await this.delDb(name).catch(() => {});
        continue;
      }
      const known = this.profile(hp.id);
      if (!known) {
        const plainStill = h.legacyDb && (await databaseExists(h.legacyDb)) ? h.legacyDb : undefined;
        this.commit(
          (s) => {
            if (s.profiles.some((x) => x.id === hp.id)) return false;
            s.profiles.push(hp);
            if (plainStill && !s.legacy) s.legacy = { dbName: plainStill, ownerId: hp.id, since: hp.createdAt };
          },
          { create: () => ({ v: 1, rev: 0, profiles: [], activeId: null, autoLock: kAutoLockDefault }) },
        );
        rebuilt++;
      } else if ((hp.rev ?? 0) > (known.rev ?? 0)) {
        // registry is behind the header (a header write landed, the registry write did not)
        this.commit((s) => {
          const q = s.profiles.find((x) => x.id === hp.id);
          if (!q || (q.rev ?? 0) >= (hp.rev ?? 0)) return false;
          q.envelope = hp.envelope;
          q.name = hp.name;
          q.username = hp.username;
          q.avatar = hp.avatar;
          q.rev = hp.rev;
        });
        rebuilt++;
      } else if ((hp.rev ?? 0) < (known.rev ?? 0)) {
        await this.writeHeader(known, known.id === this.state?.legacy?.ownerId && this.state.legacy ? { legacy: this.state.legacy } : {}).catch(() => {});
      }
    }
    // The registry says locked but the profile's database is gone (an older build's interrupted turn-off). If the plain database
    // still holds her data, THAT is her data: drop the lock so it opens, instead of letting the password open a new empty profile.
    // Without a plain database nothing is invented: the row is left and unlock() reports the problem.
    if (this.state && this.state.profiles.length === 1) {
      const only = this.state.profiles[0]!;
      if (!(await databaseExists(only.dbName))) {
        const plain = this.state.legacy?.ownerId === only.id ? this.state.legacy.dbName : kPlainDbName;
        if (await this.plainHoldsData(plain)) this.removeRegistry();
      }
    }
    return { rebuilt };
  }

  /** Does this plain (unencrypted) database exist and hold a seeded profile of hers? */
  private async plainHoldsData(name: string): Promise<boolean> {
    try {
      if (!(await databaseExists(name))) return false;
      const r = new DexieLifeRepository(name);
      await r.open();
      try {
        return await r.isSeeded();
      } finally {
        await r.close().catch(() => {});
      }
    } catch {
      return false;
    }
  }

  // ---- create -------------------------------------------------------------------------------
  private validate(username: string, password: string, ignoreId?: string): void {
    if (!isValidUsername(username)) throw new VaultError('invalid-username');
    if (!isValidPassword(password)) throw new VaultError('invalid-password');
    if (this.profiles.some((p) => p.id !== ignoreId && normalizeUsername(p.username) === normalizeUsername(username))) throw new VaultError('username-taken');
  }

  /** Derives keys and builds the profile in memory. Nothing is persisted until a commit method runs. */
  async prepare(o: { name: string; username: string; password: string; avatar?: AvatarSpec }): Promise<PreparedProfile> {
    this.refresh();
    this.validate(o.username, o.password);
    const { envelope, key, recoveryCode } = await createEnvelope(o.password, this.iterations);
    const id = `p_${hex(5)}`;
    const profile: Profile = {
      id,
      name: o.name.trim() || o.username.trim(),
      username: o.username.trim(),
      avatar: o.avatar ?? { kind: 'initial' },
      dbName: `${kPlainDbName}_${id}`,
      envelope,
      createdAt: new Date().toISOString(),
      attempts: kNoAttempts,
      rev: 1,
    };
    return { profile, key, recoveryCode };
  }

  /** Best effort: ask the browser not to evict this origin's storage. */
  private async requestPersistence(): Promise<void> {
    try {
      await navigator.storage?.persist?.();
    } catch {
      /* not available */
    }
  }

  /**
   * Turn the lock on: the existing plain database becomes the first profile. Order matters and NOTHING is deleted:
   *   automatic backup (inside the plain DB) → copy into the encrypted DB → read back and compare →
   *   header (envelope etc.) inside the encrypted DB → registry (localStorage, compare-and-set) →
   *   read-back from a fresh IndexedDB connection (header + every record decrypts) and from the registry.
   * The plain DB stays as the rollback (`registry.legacy`) and is removed only by a real unlock on a LATER launch
   * (see finalizeLegacy). Any failure before the registry write leaves everything of hers exactly as it was.
   */
  async enableWithExisting(prep: PreparedProfile, plainDbName = kPlainDbName): Promise<{ session: Session; report: CopyReport }> {
    this.refresh();
    if (this.enabled) throw new VaultError('multiple-profiles');
    if (typeof indexedDB === 'undefined') throw new VaultError('no-storage');
    await this.step('enable:start');
    const src = new DexieLifeRepository(plainDbName);
    await src.open();
    const dst = new DexieLifeRepository(prep.profile.dbName, makeRowCipher(prep.key));
    const profile: Profile = { ...prep.profile, rev: 1 };
    const legacy: LegacyMark = { dbName: plainDbName, ownerId: profile.id, since: new Date().toISOString() };
    let report: CopyReport;
    try {
      await dst.open();
      // durable marker FIRST: an abandoned half-copy is recognisable (and removable once old) instead of an anonymous orphan
      await this.writeHeader(profile, { legacy, migrating: true }, dst);
      await this.step('enable:afterMarker');
      if (await src.isSeeded()) await src.createBackup('before-lock');
      await this.step('enable:afterBackup');
      report = await copyRepository(src, dst);
      await this.step('enable:afterCopy');
      await this.writeHeader(profile, { legacy }, dst);
      await this.step('enable:afterHeader');
    } catch (e) {
      await dst.close().catch(() => {});
      await this.delDb(prep.profile.dbName).catch(() => {});
      await src.close().catch(() => {});
      throw e instanceof VaultError || e instanceof SimulatedCrash ? e : new VaultError('migration-failed');
    }
    await src.close().catch(() => {});
    void this.requestPersistence();
    try {
      this.commit(() => {}, { create: () => ({ v: 1, rev: 0, profiles: [profile], activeId: profile.id, autoLock: kAutoLockDefault, legacy }), exclusive: true });
      await this.step('enable:afterRegistry');
      await this.verifyDurable(profile, prep.key, report);
      await this.step('enable:afterVerify');
    } catch (e) {
      if (!(e instanceof SimulatedCrash)) {
        // the new vault could not be proven: undo ONLY what we created; the plain DB was never touched
        try {
          this.removeRegistry();
        } catch {
          /* ignore */
        }
        await dst.close().catch(() => {});
        await this.delDb(prep.profile.dbName).catch(() => {});
      }
      throw e instanceof VaultError || e instanceof SimulatedCrash ? e : new VaultError('migration-failed');
    }
    return { session: { profile: this.profile(profile.id) ?? profile, repo: dst, key: prep.key }, report };
  }

  /** Fresh-connection proof that the vault is complete: header, registry, and every record decrypts with the key. */
  private async verifyDurable(p: Profile, key: CryptoKey, report: CopyReport): Promise<void> {
    if (!this.registryMatches(p)) throw new VaultError('migration-failed');
    if (!(await this.headerMatches(p))) throw new VaultError('migration-failed');
    const fresh = new DexieLifeRepository(p.dbName, makeRowCipher(key));
    await fresh.open();
    try {
      for (const box of kAllBoxes) {
        if ((await fresh.readEntries(box)).length !== (report.counts[box] ?? 0)) throw new VaultError('migration-failed');
      }
      if (fresh.quarantined().length > 0) throw new VaultError('migration-failed');
    } finally {
      await fresh.close().catch(() => {});
    }
  }

  /** Another profile: starts empty (the store seeds it on first open). Database + header first, then the registry. */
  async addProfile(prep: PreparedProfile): Promise<Session> {
    this.refresh();
    if (!this.state) throw new VaultError('no-storage');
    this.validate(prep.profile.username, 'x'.repeat(8));
    const profile: Profile = { ...prep.profile, rev: 1 };
    await this.step('profile:start');
    const repo = new DexieLifeRepository(profile.dbName, makeRowCipher(prep.key));
    try {
      await repo.open();
      await this.writeHeader(profile, {}, repo);
      await this.step('profile:afterHeader');
      this.commit((s) => {
        if (s.profiles.some((p) => normalizeUsername(p.username) === normalizeUsername(profile.username))) throw new VaultError('username-taken');
        s.profiles.push(profile);
        s.activeId = profile.id;
      });
      await this.step('profile:afterRegistry');
      if (!this.registryMatches(profile) || !(await this.headerMatches(profile))) throw new VaultError('migration-failed');
    } catch (e) {
      if (!(e instanceof SimulatedCrash)) {
        // only reached before/without a durable registry entry: remove what we just created
        const listed = this.storedNow()?.profiles.some((p) => p.id === profile.id);
        if (!listed) {
          await repo.close().catch(() => {});
          await this.delDb(profile.dbName).catch(() => {});
        }
      }
      throw e;
    }
    return { profile: this.profile(profile.id) ?? profile, repo, key: prep.key };
  }

  // ---- unlock -------------------------------------------------------------------------------
  async unlock(profileId: string, username: string, password: string, now = Date.now()): Promise<UnlockResult> {
    this.refresh();
    const p = this.profile(profileId);
    if (!p || !this.state) return { ok: false, reason: 'wrong', retryAt: 0, failures: 0 };
    if (!canAttempt(p.attempts, now)) return { ok: false, reason: 'wait', retryAt: p.attempts.retryAt, failures: p.attempts.failures };
    // always derive (even for a wrong username) so both failures cost the same and look the same
    const key = await unlockWithPassword(p.envelope, password);
    if (key && normalizeUsername(username) === normalizeUsername(p.username) && !(await databaseExists(p.dbName))) {
      // the credentials are right but the profile's data is not there: never open (= create) an empty profile in its place
      return { ok: false, reason: 'missing', retryAt: 0, failures: p.attempts.failures };
    }
    if (!key || normalizeUsername(username) !== normalizeUsername(p.username)) {
      let att = p.attempts;
      this.commit((s) => {
        const q = s.profiles.find((x) => x.id === profileId);
        if (!q) return false;
        q.attempts = att = recordFailure(q.attempts, now);
      });
      return { ok: false, reason: 'wrong', retryAt: att.retryAt, failures: att.failures };
    }
    this.commit((s) => {
      const q = s.profiles.find((x) => x.id === profileId);
      if (!q) return false;
      q.attempts = kNoAttempts;
      s.activeId = profileId;
    });
    const session = await this.openSession(this.profile(profileId) ?? p, key);
    this.scheduleFinalize(session.profile, session.repo);
    return { ok: true, session };
  }

  /** Re-checks a password (turn lock off, delete a profile). Failures count toward the soft delay. */
  async verifyPassword(profileId: string, password: string, now = Date.now()): Promise<boolean> {
    this.refresh();
    const p = this.profile(profileId);
    if (!p) return false;
    if (!canAttempt(p.attempts, now)) return false;
    const ok = (await unlockWithPassword(p.envelope, password)) != null;
    this.commit((s) => {
      const q = s.profiles.find((x) => x.id === profileId);
      if (!q) return false;
      q.attempts = ok ? kNoAttempts : recordFailure(q.attempts, now);
    });
    return ok;
  }

  /**
   * Replaces the wrapped keys of a profile durably: header first (verified through a fresh connection), then the
   * registry (compare-and-set against [base] so a concurrent change in another tab is never reverted), then both
   * are read back. The previous envelope stays valid in whichever store has not been updated yet — a crash in
   * between loses nothing (both unwrap to the same data key).
   */
  private async replaceEnvelope(base: Profile, envelope: KeyEnvelope, tag: string): Promise<Profile> {
    const next: Profile = { ...base, envelope, attempts: kNoAttempts, rev: (base.rev ?? 0) + 1 };
    await this.writeHeader(next, this.state?.legacy?.ownerId === base.id && this.state.legacy ? { legacy: this.state.legacy } : {});
    await this.step(`${tag}:afterHeader`);
    this.commit((s) => {
      const q = s.profiles.find((x) => x.id === base.id);
      if (!q) throw new VaultError('conflict');
      if ((q.rev ?? 0) !== (base.rev ?? 0)) throw new VaultError('conflict'); // another tab changed this profile meanwhile
      q.envelope = envelope;
      q.rev = next.rev;
      q.attempts = kNoAttempts;
    });
    await this.step(`${tag}:afterRegistry`);
    if (!this.registryMatches(next) || !(await this.headerMatches(next))) throw new VaultError('migration-failed');
    return next;
  }

  async changePassword(profileId: string, current: string, next: string): Promise<boolean> {
    if (!isValidPassword(next)) throw new VaultError('invalid-password');
    for (let attempt = 0; attempt < 3; attempt++) {
      this.refresh();
      const p = this.profile(profileId);
      if (!p) return false;
      if (!canAttempt(p.attempts, Date.now())) return false;
      const env = await changePasswordEnvelope(p.envelope, current, next);
      if (!env) {
        this.commit((s) => {
          const q = s.profiles.find((x) => x.id === profileId);
          if (!q) return false;
          q.attempts = recordFailure(q.attempts, Date.now());
        });
        return false;
      }
      try {
        await this.replaceEnvelope(p, env, 'password');
        return true;
      } catch (e) {
        if (!(e instanceof VaultError && e.code === 'conflict')) throw e;
        // the stored profile moved on: re-check [current] against the new state and try again
      }
    }
    throw new VaultError('conflict');
  }

  /** New recovery code, applied only when [commit] runs (so abandoning the screen keeps the old code). */
  async prepareNewRecovery(profileId: string, password: string): Promise<{ recoveryCode: string; commit: () => Promise<void> } | null> {
    this.refresh();
    const p = this.profile(profileId);
    if (!p || !canAttempt(p.attempts, Date.now())) return null;
    const r = await rotateRecoveryEnvelope(p.envelope, password);
    if (!r) {
      this.commit((s) => {
        const q = s.profiles.find((x) => x.id === profileId);
        if (!q) return false;
        q.attempts = recordFailure(q.attempts, Date.now());
      });
      return null;
    }
    return {
      recoveryCode: r.recoveryCode,
      commit: async () => {
        this.refresh();
        const cur = this.profile(profileId);
        if (!cur) throw new VaultError('conflict');
        // rebuild on the freshest stored envelope: only the recovery wrap is taken from [r]
        await this.replaceEnvelope(cur, { ...cur.envelope, rc: r.envelope.rc }, 'recovery');
      },
    };
  }

  /** Forgot password: the recovery code opens the profile, sets a new password and a new recovery code. */
  async resetWithRecovery(profileId: string, code: string, newPassword: string): Promise<{ session: Session; recoveryCode: string } | null> {
    this.refresh();
    const p = this.profile(profileId);
    if (!p || !this.state) return null;
    if (!isValidPassword(newPassword)) throw new VaultError('invalid-password');
    const r = await resetWithRecoveryEnvelope(p.envelope, code, newPassword);
    if (!r) return null;
    if (!(await databaseExists(p.dbName))) return null; // nothing to reset: never create an empty profile
    const saved = await this.replaceEnvelope(p, r.envelope, 'reset');
    this.commit((s) => {
      s.activeId = profileId;
    });
    const session = await this.openSession(this.profile(profileId) ?? saved, r.key);
    this.scheduleFinalize(session.profile, session.repo);
    return { session, recoveryCode: r.recoveryCode };
  }
  /** Checks a recovery code without changing anything (step A of the forgot flow). */
  async checkRecovery(profileId: string, code: string): Promise<boolean> {
    this.refresh();
    const p = this.profile(profileId);
    return !!p && (await unlockWithRecovery(p.envelope, code)) != null;
  }

  // ---- profile edits / delete ---------------------------------------------------------------
  updateProfile(id: string, patch: Partial<Pick<Profile, 'name' | 'avatar'>>): void {
    if (!this.profile(id)) return;
    this.commit((s) => {
      const q = s.profiles.find((x) => x.id === id);
      if (!q) return false;
      Object.assign(q, patch);
      q.rev = (q.rev ?? 0) + 1;
    });
    const p = this.profile(id);
    // mirror into the header (best effort: the registry is the source for display fields)
    if (p) void this.writeHeader(p, this.state?.legacy?.ownerId === id && this.state.legacy ? { legacy: this.state.legacy } : {}).catch(() => {});
  }

  /**
   * Removes the profile and its data for good. Returns true when it was the last one (lock is now off).
   * Order: durable `deleted` mark in the profile's own database (mandatory) → registry → plain rollback copy → records wiped.
   * The emptied shell (header only) is removed by recover() on a LATER launch: deleting it now would, after a browser kill
   * that never flushed the registry, leave a registry row pointing at nothing.
   */
  async deleteProfile(id: string): Promise<boolean> {
    this.refresh();
    const p = this.profile(id);
    if (!p || !this.state) return false;
    const legacy = this.state.legacy?.ownerId === id ? this.state.legacy : undefined;
    const exists = await databaseExists(p.dbName);
    // 1. tombstone inside the database, proven through a fresh connection. If it cannot be written the delete does not start.
    if (exists) {
      await this.writeHeader(p, legacy ? { deleted: true, legacy } : { deleted: true });
      if (!parseHeader(await readDatabaseHeader(p.dbName))?.deleted) throw new VaultError('migration-failed');
    }
    await this.step('delete:afterMark');
    // 2. registry
    const last = (this.storedNow() ?? this.state).profiles.every((x) => x.id === id);
    if (last) this.removeRegistry();
    else {
      this.commit((s) => {
        s.profiles = s.profiles.filter((x) => x.id !== id);
        s.deleted = [...(s.deleted ?? []), id].slice(-20);
        if (s.activeId === id) s.activeId = null;
        if (legacy && s.legacy?.ownerId === id) delete s.legacy;
      });
    }
    await this.step('delete:afterRegistry');
    // 3. the pre-lock plain copy (deleting a profile means deleting her data for good), then the records themselves
    if (legacy) await this.delDb(legacy.dbName).catch(() => {});
    await this.step('delete:afterLegacy');
    if (exists) {
      this.alive();
      const shell = new DexieLifeRepository(p.dbName);
      try {
        await shell.open();
        for (const box of kAllBoxes) await shell.clearBox(box);
      } finally {
        await shell.close().catch(() => {});
      }
    }
    await this.step('delete:afterWipe');
    return last;
  }

  /**
   * Turn the lock off (single profile): decrypt back into the plain DB, verify, mark the encrypted DB `retired`, drop the
   * registry. The encrypted DB is NOT deleted here: localStorage may never be flushed if the browser is killed now, and a
   * registry that still says "locked" must find its database. recover() deletes it on a later launch (see its header).
   * A plain DB that holds data which is NOT this profile's own rollback copy is backed up aside before it is replaced.
   */
  async disableLock(session: Session, plainDbName = kPlainDbName): Promise<CopyReport> {
    this.refresh();
    if (!this.state || this.state.profiles.length !== 1) throw new VaultError('multiple-profiles');
    await this.step('off:start');
    const mine = this.state.legacy?.ownerId === session.profile.id && this.state.legacy.dbName === plainDbName;
    if (!mine && (await this.plainHoldsData(plainDbName))) {
      // unexpected plain data (not the rollback of this profile): never overwrite it blindly
      const bak = `${plainDbName}_bak_${Date.now()}`;
      const a = new DexieLifeRepository(plainDbName);
      const b = new DexieLifeRepository(bak);
      try {
        await a.open();
        await b.open();
        await copyRepository(a, b);
      } catch (e) {
        await b.close().catch(() => {});
        await this.delDb(bak).catch(() => {});
        throw e instanceof VaultError || e instanceof SimulatedCrash ? e : new VaultError('migration-failed');
      } finally {
        await a.close().catch(() => {});
        await b.close().catch(() => {});
      }
      await this.step('off:afterAside');
    }
    // the old pre-lock copy is stale by now; the encrypted DB is the only live source until the new plain copy is proven
    await this.delDb(plainDbName).catch(() => {});
    const dst = new DexieLifeRepository(plainDbName);
    await dst.open();
    let report: CopyReport;
    try {
      report = await copyRepository(session.repo, dst);
      await this.step('off:afterCopy');
    } catch (e) {
      await dst.close().catch(() => {});
      if (!(e instanceof SimulatedCrash)) await this.delDb(plainDbName).catch(() => {});
      throw e instanceof VaultError || e instanceof SimulatedCrash ? e : new VaultError('migration-failed');
    }
    await dst.close();
    // durable marker BEFORE the registry goes (a crash cannot bring the lock back from its header, and a registry that
    // survives still finds this database). It names the plain DB that now holds the verified copy.
    const mark: LegacyMark = { dbName: plainDbName, ownerId: session.profile.id, since: new Date().toISOString() };
    await this.writeHeader(session.profile, { retired: true, legacy: mark }, session.repo);
    if (!parseHeader(await readDatabaseHeader(session.profile.dbName))?.retired) throw new VaultError('migration-failed');
    await this.step('off:afterMark');
    this.removeRegistry();
    await this.step('off:afterRegistry');
    await session.repo.close().catch(() => {});
    return report;
  }
}

/** Encrypted export: AES-GCM with a key from [password] (same KDF as the lock). */
export const encryptExport = (data: unknown, password: string, iterations?: number): Promise<EncryptedBackupFile> => encryptBackup(data, password, iterations);
export { isEncryptedBackup, decryptBackup, TamperError };
export type { BoxName };
export { databaseExists };
