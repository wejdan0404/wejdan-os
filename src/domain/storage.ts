/**
 * Local-only persistence — port of `data/repository.dart`.
 *
 * `LifeRepository` is an abstract JSON document store (one "box" per entity
 * type) with typed collections on top. Backends implement six primitives:
 *
 * - `DexieLifeRepository` — IndexedDB via Dexie (the app).
 * - `InMemoryLifeRepository` — tests / fallback when storage is unavailable.
 *
 * Nothing ever leaves the device. Export = one JSON object (schemaVersion 1,
 * same shape as the Flutter app + additive web-only boxes). Import always
 * takes an AUTOMATIC BACKUP snapshot first (kept on-device, last 5) and needs
 * an explicit `confirm: true`; `previewImport` reports what would change.
 */
import Dexie, { type Table } from 'dexie';
import { dayKey, toIsoLocal } from './core/dates';
import { asJson, jInt, jMap, jStr, jStrList, jStrN, type Json } from './core/json';
import type {
  Action, AdminDoc, Bill, BnplItem, CycleEntry, DayPlan, Domain, DrivingSession, EnergyCheck, EngineRule,
  Errand, Experiment, FixedEvent, Goal, Habit, InboxItem, JoyItem, LogEntry, MockTest, ModuleState,
  MoneyEnvelope, NudgeRecord, PlanItem, Product, Project, Routine, Season, Settings, SparkTxn, StrengthCheck,
  TaskItem, VocabCard, WeeklyReviewRecord, WeeklyTask, WishItem,
} from './models';
import {
  ActionJ, AdminDocJ, BillJ, BnplItemJ, CycleEntryJ, DayPlanJ, DomainJ, DrivingSessionJ, EnergyCheckJ, EngineRuleJ,
  ErrandJ, ExperimentJ, FixedEventJ, GoalJ, HabitJ, InboxItemJ, JoyItemJ, LogEntryJ, MockTestJ, ModuleStateJ,
  MoneyEnvelopeJ, NudgeRecordJ, PlanItemJ, ProductJ, ProjectJ, RoutineJ, SeasonJ, SettingsJ, SparkTxnJ, StrengthCheckJ,
  TaskItemJ, VocabCardJ, WeeklyReviewRecordJ, WeeklyTaskJ, WishItemJ, defaultModuleState, defaultSettings,
} from './models';
import { ChangeEntryJ, type ChangeEntry } from './features/changelog';
import { NoteJ, type Note } from './features/notes';
import {
  ImportBatchJ, ProvenanceJ, SourceJ, type ImportBatch, type Provenance, type Source,
} from './features/sources';
import { kSeedLibraryVersion, type SeedLibrary } from './seed/seedLibrary';
import type { StarterProfile } from './seed/starterProfile';

/** Box names (also the keys of the export JSON). */
export const Boxes = {
  actions: 'actions',
  engineRules: 'engineRules',
  domains: 'domains',
  seasons: 'seasons',
  habits: 'habits',
  routines: 'routines',
  weeklyTasks: 'weeklyTasks',
  projects: 'projects',
  goals: 'goals',
  logs: 'logs',
  dayPlans: 'dayPlans',
  energyChecks: 'energyChecks',
  strengthChecks: 'strengthChecks',
  joyItems: 'joyItems',
  sparkTxns: 'sparkTxns',
  experiments: 'experiments',
  vocabCards: 'vocabCards',
  mockTests: 'mockTests',
  drivingSessions: 'drivingSessions',
  moneyEnvelopes: 'moneyEnvelopes',
  bills: 'bills',
  bnplItems: 'bnplItems',
  wishItems: 'wishItems',
  adminDocs: 'adminDocs',
  fixedEvents: 'fixedEvents',
  nudgeRecords: 'nudgeRecords',
  errands: 'errands',
  cycleEntries: 'cycleEntries',
  weeklyReviews: 'weeklyReviews',
  // ---- web-only ----
  tasks: 'tasks',
  inbox: 'inbox',
  products: 'products',
  /** Plan items she moved to «بعدين» (key = PlanItem.id). */
  later: 'later',
  /** Notes & decisions. */
  notes: 'notes',
  /** Append-only change log (capped). */
  changelog: 'changelog',
  /** Imported files. */
  sources: 'sources',
  /** Import review batches (candidates awaiting / after her review). */
  importBatches: 'importBatches',
  /** Imported item → source file line (id = `${entity}:${entityId}`). */
  provenance: 'provenance',
  meta: 'meta',
  /** Automatic pre-import backups (never exported/imported). */
  backups: 'backups',
} as const;
export type BoxName = (typeof Boxes)[keyof typeof Boxes];

/** Boxes in the Flutter export, in Dart order. */
export const kFlutterBoxes: readonly BoxName[] = [
  'actions', 'engineRules', 'domains', 'seasons', 'habits', 'routines', 'weeklyTasks', 'projects', 'goals', 'logs',
  'dayPlans', 'energyChecks', 'strengthChecks', 'joyItems', 'sparkTxns', 'experiments', 'vocabCards', 'mockTests',
  'drivingSessions', 'moneyEnvelopes', 'bills', 'bnplItems', 'wishItems', 'adminDocs', 'fixedEvents', 'nudgeRecords',
  'errands', 'cycleEntries', 'weeklyReviews',
];
/** Web-only data boxes (exported; absent from a Flutter export → kept as they are on import). */
export const kWebBoxes: readonly BoxName[] = [
  'tasks', 'inbox', 'products', 'later', 'notes', 'changelog', 'sources', 'importBatches', 'provenance',
];
/** Boxes holding the read-only shipped library (not exported). */
export const kSeedOnlyBoxes: readonly BoxName[] = ['actions', 'engineRules'];
export const kAllBoxes: readonly BoxName[] = [...kFlutterBoxes, ...kWebBoxes, 'meta', 'backups'];

const K_SETTINGS = 'settings';
const K_SEEDED = 'seeded';
const K_OPENED = 'openedDays';
const K_FIRST_RUN = 'firstRunDate';
const K_MODULE_STATE = 'moduleState';
const K_LIBRARY_VERSION = 'libraryVersion';

export const kExportSchemaVersion = 1;
export const kMaxBackups = 5;

/** id key per box for import (Dart: domains → id, dayPlans/energyChecks → date). */
const IMPORT_ID_KEYS: Partial<Record<BoxName, string>> = { domains: 'id', dayPlans: 'date', energyChecks: 'date' };

interface Codec<T> {
  fromJson: (j: Json) => T;
  toJson: (t: T) => Json;
}

/** Typed view over one box. */
export class EntityCollection<T> {
  constructor(
    private readonly repo: LifeRepository,
    readonly box: BoxName,
    private readonly codec: Codec<T>,
    private readonly idOf: (t: T) => string,
  ) {}
  async all(): Promise<T[]> {
    const out: T[] = [];
    for (const [id, j] of await this.repo.readEntries(this.box)) {
      try {
        out.push(this.codec.fromJson(asJson(j)));
      } catch {
        // one malformed record must not make the whole box (or profile) unopenable
        this.repo.noteQuarantine({ box: this.box, id, reason: 'unreadable' });
      }
    }
    return out;
  }
  async get(id: string): Promise<T | null> {
    const j = await this.repo.read(this.box, id);
    return j == null ? null : this.codec.fromJson(asJson(j));
  }
  put(item: T): Promise<void> {
    return this.repo.write(this.box, this.idOf(item), this.codec.toJson(item));
  }
  putAll(items: Iterable<T>): Promise<void> {
    const m = new Map<string, Json>();
    for (const i of items) m.set(this.idOf(i), this.codec.toJson(i));
    return this.repo.writeAll(this.box, m);
  }
  delete(id: string): Promise<void> {
    return this.repo.remove(this.box, id);
  }
  clear(): Promise<void> {
    return this.repo.clearBox(this.box);
  }
}

export interface SeedBundle {
  library: SeedLibrary;
  profile: StarterProfile;
}

export interface ExportJson extends Json {
  schemaVersion: number;
  exportedAt: string;
  boxes: Record<string, Json[]>;
  meta: Json;
}

export interface ImportPreview {
  ok: boolean;
  /** Human-readable problem (Arabic) when not ok. */
  error: string | null;
  schemaVersion: number;
  exportedAt: string | null;
  /** Records per box in the file (boxes the file does not contain are omitted). */
  counts: Record<string, number>;
  /** Records currently on the device per box (what would be replaced). */
  current: Record<string, number>;
  /** Records without an id (would be skipped). */
  skipped: number;
}

export interface BackupInfo {
  id: string;
  createdAt: string;
  reason: string;
  /** Total records in the snapshot. */
  records: number;
}

/** A stored record that could not be opened (authentication failed, damaged bytes or unreadable shape). It stays on disk untouched. */
export interface QuarantinedRecord {
  box: string;
  id: string;
  reason: 'tamper' | 'unreadable';
}

/** Abstract repository (see module docs). */
export abstract class LifeRepository {
  private readonly bad = new Map<string, QuarantinedRecord>();
  /** Records skipped because they could not be opened. Reported to her in Settings; never silently ignored. */
  quarantined(): readonly QuarantinedRecord[] {
    return [...this.bad.values()];
  }
  noteQuarantine(r: QuarantinedRecord): void {
    this.bad.set(`${r.box}\u0000${r.id}`, r);
  }
  /** True when record values are encrypted at rest (an app-lock profile). */
  readonly encrypted: boolean = false;
  // ---- primitives ---------------------------------------------------------
  abstract open(): Promise<void>;
  abstract close(): Promise<void>;
  abstract readAll(box: BoxName): Promise<Json[]>;
  abstract read(box: BoxName, id: string): Promise<Json | null>;
  abstract write(box: BoxName, id: string, value: Json): Promise<void>;
  abstract writeAll(box: BoxName, entries: Map<string, Json>): Promise<void>;
  abstract remove(box: BoxName, id: string): Promise<void>;
  abstract clearBox(box: BoxName): Promise<void>;
  /** Every `[id, value]` of a box — used to copy a whole store (lock on/off migration). */
  abstract readEntries(box: BoxName): Promise<[string, Json][]>;
  /** True when data survives a reload (false for the in-memory fallback). */
  abstract readonly persistent: boolean;

  // ---- typed collections --------------------------------------------------
  readonly actions = new EntityCollection<Action>(this, 'actions', ActionJ, (e) => e.actionId);
  readonly engineRules = new EntityCollection<EngineRule>(this, 'engineRules', EngineRuleJ, (e) => e.ruleId);
  readonly domains = new EntityCollection<Domain>(this, 'domains', DomainJ, (e) => e.id);
  readonly seasons = new EntityCollection<Season>(this, 'seasons', SeasonJ, (e) => e.id);
  readonly habits = new EntityCollection<Habit>(this, 'habits', HabitJ, (e) => e.id);
  readonly routines = new EntityCollection<Routine>(this, 'routines', RoutineJ, (e) => e.id);
  readonly weeklyTasks = new EntityCollection<WeeklyTask>(this, 'weeklyTasks', WeeklyTaskJ, (e) => e.id);
  readonly projects = new EntityCollection<Project>(this, 'projects', ProjectJ, (e) => e.id);
  readonly goals = new EntityCollection<Goal>(this, 'goals', GoalJ, (e) => e.id);
  readonly logs = new EntityCollection<LogEntry>(this, 'logs', LogEntryJ, (e) => e.id);
  readonly dayPlans = new EntityCollection<DayPlan>(this, 'dayPlans', DayPlanJ, (e) => e.date);
  readonly energyChecks = new EntityCollection<EnergyCheck>(this, 'energyChecks', EnergyCheckJ, (e) => e.date);
  readonly strengthChecks = new EntityCollection<StrengthCheck>(this, 'strengthChecks', StrengthCheckJ, (e) => e.id);
  readonly joyItems = new EntityCollection<JoyItem>(this, 'joyItems', JoyItemJ, (e) => e.id);
  readonly sparkTxns = new EntityCollection<SparkTxn>(this, 'sparkTxns', SparkTxnJ, (e) => e.id);
  readonly experiments = new EntityCollection<Experiment>(this, 'experiments', ExperimentJ, (e) => e.id);
  readonly vocabCards = new EntityCollection<VocabCard>(this, 'vocabCards', VocabCardJ, (e) => e.id);
  readonly mockTests = new EntityCollection<MockTest>(this, 'mockTests', MockTestJ, (e) => e.id);
  readonly drivingSessions = new EntityCollection<DrivingSession>(this, 'drivingSessions', DrivingSessionJ, (e) => e.id);
  readonly moneyEnvelopes = new EntityCollection<MoneyEnvelope>(this, 'moneyEnvelopes', MoneyEnvelopeJ, (e) => e.id);
  readonly bills = new EntityCollection<Bill>(this, 'bills', BillJ, (e) => e.id);
  readonly bnplItems = new EntityCollection<BnplItem>(this, 'bnplItems', BnplItemJ, (e) => e.id);
  readonly wishItems = new EntityCollection<WishItem>(this, 'wishItems', WishItemJ, (e) => e.id);
  readonly adminDocs = new EntityCollection<AdminDoc>(this, 'adminDocs', AdminDocJ, (e) => e.id);
  readonly fixedEvents = new EntityCollection<FixedEvent>(this, 'fixedEvents', FixedEventJ, (e) => e.id);
  readonly nudgeRecords = new EntityCollection<NudgeRecord>(this, 'nudgeRecords', NudgeRecordJ, (e) => e.id);
  readonly errands = new EntityCollection<Errand>(this, 'errands', ErrandJ, (e) => e.id);
  readonly cycleEntries = new EntityCollection<CycleEntry>(this, 'cycleEntries', CycleEntryJ, (e) => e.id);
  readonly weeklyReviews = new EntityCollection<WeeklyReviewRecord>(this, 'weeklyReviews', WeeklyReviewRecordJ, (e) => e.id);
  readonly tasks = new EntityCollection<TaskItem>(this, 'tasks', TaskItemJ, (e) => e.id);
  readonly inbox = new EntityCollection<InboxItem>(this, 'inbox', InboxItemJ, (e) => e.id);
  readonly products = new EntityCollection<Product>(this, 'products', ProductJ, (e) => e.id);
  readonly later = new EntityCollection<PlanItem>(this, 'later', PlanItemJ, (e) => e.id);
  readonly notes = new EntityCollection<Note>(this, 'notes', NoteJ, (e) => e.id);
  readonly changelog = new EntityCollection<ChangeEntry>(this, 'changelog', ChangeEntryJ, (e) => e.id);
  readonly sources = new EntityCollection<Source>(this, 'sources', SourceJ, (e) => e.id);
  readonly importBatches = new EntityCollection<ImportBatch>(this, 'importBatches', ImportBatchJ, (e) => e.id);
  readonly provenance = new EntityCollection<Provenance>(this, 'provenance', ProvenanceJ, (e) => e.id);

  // ---- settings & meta ----------------------------------------------------
  async loadSettings(): Promise<Settings> {
    const j = await this.read('meta', K_SETTINGS);
    return j == null ? defaultSettings() : SettingsJ.fromJson(asJson(j['v']));
  }
  saveSettings(s: Settings): Promise<void> {
    return this.write('meta', K_SETTINGS, { v: SettingsJ.toJson(s) });
  }
  async loadModuleState(): Promise<ModuleState> {
    const j = await this.read('meta', K_MODULE_STATE);
    return j == null ? defaultModuleState() : ModuleStateJ.fromJson(asJson(j['v']));
  }
  saveModuleState(m: ModuleState): Promise<void> {
    return this.write('meta', K_MODULE_STATE, { v: ModuleStateJ.toJson(m) });
  }
  private async metaStr(k: string): Promise<string | null> {
    const j = await this.read('meta', k);
    return j == null ? null : jStrN(j, 'v');
  }
  private writeMetaStr(k: string, v: string): Promise<void> {
    return this.write('meta', k, { v });
  }

  /** Rewrites the read-only library (user data untouched). */
  async refreshLibrary(lib: SeedLibrary): Promise<void> {
    await this.actions.clear();
    await this.engineRules.clear();
    await this.actions.putAll(lib.actions);
    await this.engineRules.putAll(lib.rules);
    await this.writeMetaStr(K_LIBRARY_VERSION, String(kSeedLibraryVersion));
  }
  async libraryOutdated(): Promise<boolean> {
    return (await this.metaStr(K_LIBRARY_VERSION)) !== String(kSeedLibraryVersion);
  }
  async isSeeded(): Promise<boolean> {
    return (await this.metaStr(K_SEEDED)) === 'true';
  }
  firstRunDate(): Promise<string | null> {
    return this.metaStr(K_FIRST_RUN);
  }

  /** Day keys on which the app was opened (last 60 kept). */
  async openedDays(): Promise<Set<string>> {
    const j = await this.read('meta', K_OPENED);
    return new Set(j == null ? [] : jStrList(j, 'v'));
  }
  async markOpened(day: Date): Promise<void> {
    const days = await this.openedDays();
    days.add(dayKey(day));
    const sorted = [...days].sort();
    const kept = sorted.length > 60 ? sorted.slice(sorted.length - 60) : sorted;
    await this.write('meta', K_OPENED, { v: kept });
  }

  /** Writes the library + starter profile. Idempotent unless [force]. */
  async seed(bundle: SeedBundle, force = false): Promise<void> {
    if (!force && (await this.isSeeded())) return;
    await this.actions.putAll(bundle.library.actions);
    await this.engineRules.putAll(bundle.library.rules);
    const p = bundle.profile;
    await this.domains.putAll(p.domains);
    await this.seasons.putAll([p.season]);
    await this.habits.putAll(p.habits);
    await this.routines.putAll(p.routines);
    await this.weeklyTasks.putAll(p.weeklyTasks);
    await this.goals.putAll(p.goals);
    await this.joyItems.putAll(p.joyItems);
    await this.products.putAll(p.products);
    await this.saveSettings(p.settings);
    await this.writeMetaStr(K_FIRST_RUN, p.season.startDate);
    await this.writeMetaStr(K_LIBRARY_VERSION, String(kSeedLibraryVersion));
    await this.writeMetaStr(K_SEEDED, 'true');
  }

  // ---- export / import ----------------------------------------------------
  /** Everything she owns as one JSON object (library excluded). */
  async exportAll(now: Date = new Date()): Promise<ExportJson> {
    const boxes: Record<string, Json[]> = {};
    for (const b of [...kFlutterBoxes, ...kWebBoxes]) {
      if (kSeedOnlyBoxes.includes(b)) continue;
      boxes[b] = await this.readAll(b);
    }
    return {
      schemaVersion: kExportSchemaVersion,
      exportedAt: toIsoLocal(now),
      boxes,
      meta: {
        settings: SettingsJ.toJson(await this.loadSettings()),
        openedDays: [...(await this.openedDays())].sort(),
        firstRunDate: await this.firstRunDate(),
        moduleState: ModuleStateJ.toJson(await this.loadModuleState()),
      },
    };
  }

  /** What an import would do — no writes. */
  async previewImport(data: unknown): Promise<ImportPreview> {
    const j = asJson(data);
    const schema = jInt(j, 'schemaVersion', -1);
    const current: Record<string, number> = {};
    for (const b of [...kFlutterBoxes, ...kWebBoxes]) {
      if (!kSeedOnlyBoxes.includes(b)) current[b] = (await this.readAll(b)).length;
    }
    if (schema !== kExportSchemaVersion) {
      return {
        ok: false,
        error: 'هالملف مو نسخة احتياطية من التطبيق، أو نسخته ما نقدر نقراها.',
        schemaVersion: schema,
        exportedAt: jStrN(j, 'exportedAt'),
        counts: {},
        current,
        skipped: 0,
      };
    }
    const boxes = jMap(j, 'boxes');
    const counts: Record<string, number> = {};
    let skipped = 0;
    for (const b of [...kFlutterBoxes, ...kWebBoxes]) {
      if (kSeedOnlyBoxes.includes(b)) continue;
      const list = boxes[b];
      if (!Array.isArray(list)) continue;
      let n = 0;
      for (const raw of list) {
        if (jStr(asJson(raw), IMPORT_ID_KEYS[b] ?? 'id') === '') skipped++;
        else n++;
      }
      counts[b] = n;
    }
    return { ok: true, error: null, schemaVersion: schema, exportedAt: jStrN(j, 'exportedAt'), counts, current, skipped };
  }

  /**
   * Replaces her data with an export. Requires `confirm: true`. Always takes an
   * automatic backup first (returned + kept on-device). Throws on an unknown
   * schema. Web-only boxes missing from the file (e.g. a Flutter export) are kept.
   */
  async importAll(data: unknown, o: { confirm: boolean; now?: Date; reason?: string }): Promise<BackupInfo> {
    if (!o.confirm) throw new Error('Import needs explicit confirmation');
    const j = asJson(data);
    if (jInt(j, 'schemaVersion', -1) !== kExportSchemaVersion) throw new Error('Unsupported export schemaVersion');
    const backup = await this.createBackup(o.reason ?? 'before-import', o.now ?? new Date());
    const boxes = jMap(j, 'boxes');
    for (const b of [...kFlutterBoxes, ...kWebBoxes]) {
      if (kSeedOnlyBoxes.includes(b)) continue;
      const list = boxes[b];
      if (kWebBoxes.includes(b) && !Array.isArray(list)) continue;
      await this.clearBox(b);
      if (!Array.isArray(list)) continue;
      const entries = new Map<string, Json>();
      for (const raw of list) {
        const r = asJson(raw);
        const id = jStr(r, IMPORT_ID_KEYS[b] ?? 'id');
        if (id === '') continue;
        entries.set(id, r);
      }
      await this.writeAll(b, entries);
    }
    const meta = jMap(j, 'meta');
    await this.saveSettings(SettingsJ.fromJson(jMap(meta, 'settings')));
    await this.write('meta', K_OPENED, { v: jStrList(meta, 'openedDays') });
    await this.saveModuleState(ModuleStateJ.fromJson(jMap(meta, 'moduleState')));
    const first = jStrN(meta, 'firstRunDate');
    if (first != null) await this.writeMetaStr(K_FIRST_RUN, first);
    await this.writeMetaStr(K_SEEDED, 'true');
    return backup;
  }

  // ---- backups ------------------------------------------------------------
  /** Snapshot of everything she owns (export JSON) kept on-device; last [kMaxBackups]. */
  async createBackup(reason: string, now: Date = new Date()): Promise<BackupInfo> {
    const snapshot = await this.exportAll(now);
    const records = Object.values(snapshot.boxes).reduce((a, l) => a + l.length, 0);
    // Same-millisecond backups (e.g. delete-all then import) must not overwrite each other.
    let id = `bk_${String(now.getTime()).padStart(15, '0')}`;
    for (let n = 1; (await this.read('backups', id)) != null; n++) id = `bk_${String(now.getTime()).padStart(15, '0')}_${String(n).padStart(3, '0')}`;
    const info: BackupInfo = { id, createdAt: toIsoLocal(now), reason, records };
    await this.write('backups', id, { info: info as unknown as Json, snapshot: snapshot as Json });
    const all = (await this.listBackups()).sort((a, b) => (a.id < b.id ? 1 : -1));
    for (const old of all.slice(kMaxBackups)) await this.remove('backups', old.id);
    return info;
  }
  async listBackups(): Promise<BackupInfo[]> {
    return (await this.readAll('backups'))
      .map((r) => asJson(r['info']) as unknown as BackupInfo)
      .sort((a, b) => (a.id < b.id ? 1 : -1));
  }
  async getBackup(id: string): Promise<ExportJson | null> {
    const r = await this.read('backups', id);
    return r == null ? null : (asJson(r['snapshot']) as ExportJson);
  }
  /** Restores a backup (itself backed up first). */
  async restoreBackup(id: string, now: Date = new Date()): Promise<BackupInfo> {
    const snap = await this.getBackup(id);
    if (snap == null) throw new Error(`Backup ${id} not found`);
    return this.importAll(snap, { confirm: true, now, reason: 'before-restore' });
  }

  /** "Delete all data": wipes everything except backups. */
  async deleteAll(): Promise<void> {
    for (const b of kAllBoxes) if (b !== 'backups') await this.clearBox(b);
  }
}

// ---------------------------------------------------------------------------
// Backends
// ---------------------------------------------------------------------------

/** In-memory backend (tests; fallback when IndexedDB is unavailable). */
export class InMemoryLifeRepository extends LifeRepository {
  readonly persistent = false;
  private readonly data = new Map<string, Map<string, Json>>();
  private b(box: string): Map<string, Json> {
    let m = this.data.get(box);
    if (!m) {
      m = new Map();
      this.data.set(box, m);
    }
    return m;
  }
  async open(): Promise<void> {}
  async close(): Promise<void> {}
  async readAll(box: BoxName): Promise<Json[]> {
    return [...this.b(box).values()].map(clone);
  }
  async read(box: BoxName, id: string): Promise<Json | null> {
    const v = this.b(box).get(id);
    return v === undefined ? null : clone(v);
  }
  async write(box: BoxName, id: string, value: Json): Promise<void> {
    this.b(box).set(id, clone(value));
  }
  async writeAll(box: BoxName, entries: Map<string, Json>): Promise<void> {
    const m = this.b(box);
    for (const [k, v] of entries) m.set(k, clone(v));
  }
  async remove(box: BoxName, id: string): Promise<void> {
    this.b(box).delete(id);
  }
  async clearBox(box: BoxName): Promise<void> {
    this.b(box).clear();
  }
  async readEntries(box: BoxName): Promise<[string, Json][]> {
    return [...this.b(box)].map(([k, v]) => [k, clone(v)]);
  }
}

const clone = (v: Json): Json => JSON.parse(JSON.stringify(v)) as Json;

interface RecordRow {
  box: string;
  id: string;
  value: Json;
}

class LifeDb extends Dexie {
  records!: Table<RecordRow, [string, string]>;
  /** Small plaintext metadata rows (the app-lock header: salts + wrapped keys — nothing secret). Never exported. */
  vault!: Table<{ id: string; value: Json }, string>;
  constructor(name: string) {
    super(name);
    this.version(1).stores({ records: '[box+id], box' });
    this.version(2).stores({ records: '[box+id], box', vault: 'id' });
  }
}
const K_HEADER = 'header';

/**
 * Optional per-record encryption (the app lock). `seal` turns a record value into what is stored;
 * `open` reverses it. Row addresses (box, id) stay readable — they are the index.
 */
export interface RowCipher {
  seal(box: string, id: string, value: Json): Promise<Json>;
  open(box: string, id: string, stored: unknown): Promise<Json>;
}

/** IndexedDB backend (Dexie). Rows: {box, id, value} keyed by [box+id]. With a [cipher], `value` is encrypted. */
export class DexieLifeRepository extends LifeRepository {
  readonly persistent = true;
  override readonly encrypted: boolean;
  private readonly db: LifeDb;
  constructor(name = 'wejdan_life_os', private readonly cipher?: RowCipher) {
    super();
    this.encrypted = cipher != null;
    this.db = new LifeDb(name);
  }
  /** The app-lock header (plaintext metadata) of this database, or null. */
  async readHeader(): Promise<Json | null> {
    const r = await this.db.vault.get(K_HEADER);
    return r?.value ?? null;
  }
  async writeHeader(value: Json): Promise<void> {
    await this.db.vault.put({ id: K_HEADER, value: clone(value) });
  }
  /** Opens a row with the cipher; a row that cannot be opened is quarantined (left on disk) and skipped. */
  private async tryUnseal(r: RecordRow): Promise<Json | undefined> {
    try {
      return await this.unseal(r);
    } catch (e) {
      this.noteQuarantine({ box: r.box, id: r.id, reason: e instanceof Error && e.message === 'tampered-or-wrong-key' ? 'tamper' : 'unreadable' });
      return undefined;
    }
  }
  private seal(box: string, id: string, value: Json): Promise<Json> | Json {
    return this.cipher ? this.cipher.seal(box, id, value) : clone(value);
  }
  private unseal(r: RecordRow): Promise<Json> | Json {
    return this.cipher ? this.cipher.open(r.box, r.id, r.value) : r.value;
  }
  async open(): Promise<void> {
    await this.db.open();
  }
  async close(): Promise<void> {
    this.db.close();
  }
  async readAll(box: BoxName): Promise<Json[]> {
    return (await this.readEntries(box)).map(([, v]) => v);
  }
  async readEntries(box: BoxName): Promise<[string, Json][]> {
    const rows = await this.db.records.where('box').equals(box).toArray();
    const out = await Promise.all(rows.map(async (r): Promise<[string, Json] | null> => {
      const v = await this.tryUnseal(r);
      return v === undefined ? null : [r.id, v];
    }));
    return out.filter((x): x is [string, Json] => x != null);
  }
  async read(box: BoxName, id: string): Promise<Json | null> {
    const r = await this.db.records.get([box, id]);
    if (r == null) return null;
    return (await this.tryUnseal(r)) ?? null;
  }
  async write(box: BoxName, id: string, value: Json): Promise<void> {
    await this.db.records.put({ box, id, value: await this.seal(box, id, value) });
  }
  async writeAll(box: BoxName, entries: Map<string, Json>): Promise<void> {
    const rows = await Promise.all([...entries].map(async ([id, value]) => ({ box, id, value: await this.seal(box, id, value) })));
    await this.db.records.bulkPut(rows);
  }
  async remove(box: BoxName, id: string): Promise<void> {
    await this.db.records.delete([box, id]);
  }
  async clearBox(box: BoxName): Promise<void> {
    await this.db.records.where('box').equals(box).delete();
  }
}

/** Reads the app-lock header of a database through a short-lived fresh connection (null when absent / unreadable). */
export async function readDatabaseHeader(name: string): Promise<Json | null> {
  try {
    if (!(await Dexie.exists(name))) return null;
    const repo = new DexieLifeRepository(name);
    await repo.open();
    try {
      return await repo.readHeader();
    } finally {
      await repo.close();
    }
  } catch {
    return null;
  }
}
/** Writes the app-lock header of a database through a short-lived fresh connection. */
export async function writeDatabaseHeader(name: string, value: Json): Promise<void> {
  const repo = new DexieLifeRepository(name);
  await repo.open();
  try {
    await repo.writeHeader(value);
  } finally {
    await repo.close();
  }
}
/** Names of every IndexedDB database of this origin ([] where the browser cannot list them). */
export async function listDatabaseNames(): Promise<string[]> {
  try {
    if (typeof indexedDB === 'undefined') return [];
    return await Dexie.getDatabaseNames();
  } catch {
    return [];
  }
}

/** Does an IndexedDB database with this name exist? */
export const databaseExists = (name: string): Promise<boolean> => Dexie.exists(name);
/** Deletes a whole IndexedDB database (all connections in this page are closed by Dexie first). */
export const deleteDatabase = (name: string): Promise<void> => Dexie.delete(name);

/**
 * Opens the best available storage: IndexedDB, or — if it is blocked, throws
 * or hangs past [timeoutMs] — the in-memory fallback (`persistent === false`,
 * so the UI can show the "not saved in this browser" banner).
 */
export async function openBestRepository(o: { name?: string; timeoutMs?: number } = {}): Promise<LifeRepository> {
  try {
    if (typeof indexedDB === 'undefined') throw new Error('IndexedDB unavailable');
    const repo = new DexieLifeRepository(o.name);
    await Promise.race([
      repo.open(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('IndexedDB open timeout')), o.timeoutMs ?? 5000)),
    ]);
    return repo;
  } catch {
    return new InMemoryLifeRepository();
  }
}
