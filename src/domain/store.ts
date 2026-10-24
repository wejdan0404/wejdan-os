/**
 * LifeStore — owns the in-memory LifeSnapshot and every mutation (port of
 * `state/life_controller.dart` + web-only actions). Each method writes
 * through to the repository, then publishes a NEW snapshot object, so React
 * can use `useSyncExternalStore(store.subscribe, store.getSnapshot)`.
 *
 * Trust rules: every delete returns an UndoToken (restore within 10 s);
 * completions undo within 10 s; import needs explicit confirm and always
 * backs up first; nothing moves on her day without her action.
 */
import { addDays, cmpStr, dateOnly, dayKey, logicalDay, minuteOfDay, parseDayKey, startOfWeek, toIsoLocal } from './core/dates';
import type { Json } from './core/json';
import type {
  AdminDoc, Bill, BnplItem, CompletionLevel, CycleEntry, DayPlan, Domain, DomainId, DomainState, DrivingSession,
  EnergyCheck, Errand, Experiment, FixedEvent, Goal, Habit, InboxItem, InboxKind, JoyItem, LogEntry, MissReason,
  MockTest, ModuleState, MoneyEnvelope, NudgeResponse, PlanItem, Product, ProductSlot, Project, Routine, Season,
  Settings, StrengthCheck, TaskItem, TaskStatus, VocabCard, WeeklyReviewRecord, WeeklyTask, WishItem,
} from './models';
import { isDoneLevel, logIsDone, makeDayPlan, makeInboxItem, makeLog, makeProject, makeTask } from './models';
import { AnchorResolver } from './engine/anchors';
import { violationsAfter, type CapacityViolation } from './engine/capacityGuard';
import { sortPlanItems, type Suggestion } from './engine/dayPlanner';
import { canStartExperiment } from './engine/experiments';
import {
  applyDesignChange, isComebackCompletion, manualRecoveryTrigger, proposeChange, type DesignChange, type RecoveryTrigger,
} from './engine/recovery';
import {
  SPARK_NONE, awardForCompletion, awardForExperiment, awardForWeeklyReview, earnedOn, redeemReward, reversalsFor,
  txnForAward, type RedeemResult, type SparkAward,
} from './engine/sparks';
import { newVocabCard, reviewCard } from './engine/vocabSrs';
import { productStepId } from './products';
import { loadShippedLibrary, type SeedLibrary } from './seed/seedLibrary';
import {
  clearPersonalLibrary, parsePersonalLibrary, readPersonalLibrary, savePersonalLibrary, type KeyValueStore, type PersonalLibraryFile,
} from './seed/personalLibrary';
import { buildStarterProfile, starterHabitOptions } from './seed/starterProfile';
import { acceptedPlanFor, excusedDaysOf, suggestionsFor, todayView } from './selectors';
import {
  kMaxChangeLog, sameJson, sortChanges, type ChangeEntity, type ChangeEntry, type ChangeOp,
} from './features/changelog';
import { cleanLinks, makeNote, noteDisplayTitle, NoteJ, sortNotes, type Note, type NoteLink, type NoteTag } from './features/notes';
import { search as searchSnapshot, type SearchOptions, type SearchResponse } from './features/search';
import {
  buildExistingIndex, evaluateCandidates, ImportFileError, isSafeToBulkApprove, parseImportFile, provenanceId, targetOf,
  CANDIDATE_TYPE_LABELS, type CandidateDecision, type CandidateType, type ImportBatch, type ImportCandidate,
  type ImportFileErrorReason, type Provenance, type ProvenanceEntity, type Source,
} from './features/sources';
import {
  DOMAIN_IDS, FixedEventJ, GoalJ, HabitJ, InboxItemJ, JoyItemJ, ProductJ, ProjectJ, RoutineJ, TaskItemJ, WeeklyTaskJ,
} from './models';
import type { EntityCollection } from './storage';
import { currentSeason, loadSnapshot, snapshotHabit, upsertById, type LifeSnapshot } from './snapshot';
import { kAllBoxes, openBestRepository, type BackupInfo, type ExportJson, type ImportPreview, type LifeRepository, type QuarantinedRecord } from './storage';

/** Undo window for completions and deletes. */
export const kUndoWindowMs = 10_000;

export interface CompletionResult {
  log: LogEntry;
  award: SparkAward;
  undoUntil: Date;
  isComeback: boolean;
}

export interface UndoToken {
  token: string;
  /** Epoch ms until which `undoDelete(token)` works. */
  expiresAt: number;
  /** What was removed (for the toast). */
  label: string;
}

/** Evening Shutdown choice for an open item. */
export type EveningChoice = 'tomorrow' | 'later' | 'letGo';

export interface StoreOptions {
  /** Defaults to IndexedDB (falls back to memory). */
  repo?: LifeRepository;
  /** Injectable clock (tests pin a date). */
  now?: () => Date;
  /** Library loader (defaults to the shipped JSON, lazily imported). */
  library?: SeedLibrary | (() => Promise<SeedLibrary>);
}

type Listener = () => void;

interface Trash {
  label: string;
  expiresAt: number;
  restore: () => Promise<void>;
}

/** How each change-logged entity is stored (snapshot key, box, codec, label). */
interface EntityInfo {
  key: keyof LifeSnapshot;
  coll: (r: LifeRepository) => EntityCollection<unknown>;
  toJson: (x: never) => Json;
  fromJson: (j: Json) => unknown;
  idOf: (x: never) => string;
  label: (x: never) => string;
}
const info = <T>(
  key: keyof LifeSnapshot,
  coll: (r: LifeRepository) => EntityCollection<T>,
  codec: { toJson: (x: T) => Json; fromJson: (j: Json) => T },
  idOf: (x: T) => string,
  label: (x: T) => string,
): EntityInfo => ({
  key,
  coll: coll as (r: LifeRepository) => EntityCollection<unknown>,
  toJson: codec.toJson as (x: never) => Json,
  fromJson: codec.fromJson,
  idOf: idOf as (x: never) => string,
  label: label as (x: never) => string,
});
const ENTITIES: Record<ChangeEntity, EntityInfo> = {
  task: info<TaskItem>('tasks', (r) => r.tasks, TaskItemJ, (x) => x.id, (x) => x.title),
  inbox: info<InboxItem>('inbox', (r) => r.inbox, InboxItemJ, (x) => x.id, (x) => x.title),
  habit: info<Habit>('habits', (r) => r.habits, HabitJ, (x) => x.id, (x) => x.titleAr),
  project: info<Project>('projects', (r) => r.projects, ProjectJ, (x) => x.id, (x) => x.titleAr),
  goal: info<Goal>('goals', (r) => r.goals, GoalJ, (x) => x.id, (x) => x.titleAr),
  product: info<Product>('products', (r) => r.products, ProductJ, (x) => x.id, (x) => x.name),
  note: info<Note>('notes', (r) => r.notes, NoteJ, (x) => x.id, (x) => noteDisplayTitle(x)),
  routine: info<Routine>('routines', (r) => r.routines, RoutineJ, (x) => x.id, (x) => x.titleAr),
  weeklyTask: info<WeeklyTask>('weeklyTasks', (r) => r.weeklyTasks, WeeklyTaskJ, (x) => x.id, (x) => x.titleAr),
  joyItem: info<JoyItem>('joyItems', (r) => r.joyItems, JoyItemJ, (x) => x.id, (x) => x.titleAr),
  fixedEvent: info<FixedEvent>('fixedEvents', (r) => r.fixedEvents, FixedEventJ, (x) => x.id, (x) => x.title),
};
const ENTITY_BY_KEY = new Map<string, ChangeEntity>(
  (Object.entries(ENTITIES) as [ChangeEntity, EntityInfo][]).map(([e, i]) => [i.key as string, e]),
);

/** Result of reading a file for import review. */
export type StartImportResult =
  | { ok: true; source: Source; batch: ImportBatch }
  | { ok: false; source: Source; error: string; reason: ImportFileErrorReason };

/** Edits she can make to a candidate during review. */
export interface CandidateEdit {
  type?: CandidateType;
  title?: string;
  body?: string;
  url?: string | null;
  /** ISO day key or null. */
  date?: string | null;
  /** HH:MM or null. */
  time?: string | null;
  domain?: DomainId | null;
}

/** Note tag an imported candidate type becomes (non task/project/idea types). */
const NOTE_TAG_FOR: Partial<Record<CandidateType, NoteTag>> = {
  note: 'note', preference: 'preference', reference: 'reference', routine: 'routine', goal: 'goal', appointment: 'appointment',
};

const K_PERSONAL_LIBRARY = 'personalLibrary';
/** Weekly-review draft: plaintext localStorage only while the lock is off; a meta row inside the ENCRYPTED database while it is on. */
export const kReviewDraftLsPrefix = 'wejdan.reviewDraft.v2.';
const K_REVIEW_DRAFT = 'reviewDraft.';

/** Note edits closer together than this collapse into one change-log entry (autosave). */
const kNoteCoalesceMs = 2 * 60 * 1000;

export class LifeStore {
  private s!: LifeSnapshot;
  private seq = 0;
  private readonly listeners = new Set<Listener>();
  private readonly clearedComeback = new Map<string, string>();
  private readonly trash = new Map<string, Trash>();
  /**
   * Her personal action library when the profile is ENCRYPTED (lock on): it lives inside the encrypted database
   * (meta row), never in localStorage. `undefined` = not an encrypted profile → the plain localStorage copy is used.
   */
  private personalFile: PersonalLibraryFile | null | undefined = undefined;

  private constructor(
    readonly repo: LifeRepository,
    private readonly clock: () => Date,
    private readonly libraryLoader: () => Promise<SeedLibrary>,
  ) {}

  /** Opens storage, seeds a neutral profile on first run, loads everything. */
  static async create(o: StoreOptions = {}): Promise<LifeStore> {
    const repo = o.repo ?? (await openBestRepository());
    const lib = o.library;
    // eslint-disable-next-line prefer-const
    let store!: LifeStore;
    const loader = typeof lib === 'function' ? lib : lib != null ? async () => lib : () => loadShippedLibrary(store.personalFile);
    store = new LifeStore(repo, o.now ?? (() => new Date()), loader);
    await repo.open();
    await store.settlePersonalLibrary();
    await store.settleReviewDrafts();
    const today = logicalDay(store.clock());
    if (!(await repo.isSeeded())) {
      if (repo.quarantined().length > 0) {
        // the «seeded» marker itself may be the damaged record: never re-seed over a profile that has data
        const readable = await Promise.all(kAllBoxes.map(async (b) => (await repo.readEntries(b)).length));
        if (readable.every((c) => c === 0)) throw new Error('profile-unreadable');
      } else {
        const library = await loader();
        await repo.seed({ library, profile: buildStarterProfile(library, today) });
      }
    } else if (await repo.libraryOutdated()) {
      // The shipped library isn't in the offline precache (it's ~450 KB and only needed
      // here): if it can't load right now, keep the stored copy and retry next launch.
      try {
        await repo.refreshLibrary(await loader());
      } catch {
        /* offline — the stored library stays until the next online launch */
      }
    }
    await repo.markOpened(today);
    // A focus block lives only while Focus is open — drop leftovers.
    for (const e of await repo.fixedEvents.all()) if (e.isFocusBlock) await repo.fixedEvents.delete(e.id);
    store.s = await loadSnapshot(repo);
    return store;
  }

  // ---- subscription -----------------------------------------------------------
  getSnapshot = (): LifeSnapshot => this.s;
  subscribe = (l: Listener): (() => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };
  private emit(next: LifeSnapshot): void {
    this.s = next;
    for (const l of this.listeners) l();
  }
  private patch(p: Partial<LifeSnapshot>): void {
    this.emit({ ...this.s, ...p });
  }

  /** Clock and logical today (the day flips at 04:30). */
  now(): Date {
    return this.clock();
  }
  today(): Date {
    return logicalDay(this.clock());
  }
  get persistent(): boolean {
    return this.repo.persistent;
  }

  /** Unique id: prefix + time + sequence. */
  newId(prefix: string): string {
    return `${prefix}_${this.clock().getTime() * 1000}_${this.seq++}`;
  }

  async reload(): Promise<void> {
    this.emit(await loadSnapshot(this.repo));
  }

  /**
   * Imports her private, personalised action library (kept on this device only — never in the
   * public build), then rebuilds the local library from the shipped one merged with it.
   * Lock off: a localStorage key (plaintext, as before). Lock on: a row inside the ENCRYPTED profile database.
   * Throws `PersonalLibraryError` (Arabic message) for a wrong file. Returns the number of actions.
   */
  async importPersonalLibrary(json: unknown, kv?: KeyValueStore | null): Promise<number> {
    let n: number;
    if (this.repo.encrypted) {
      const file = parsePersonalLibrary(json);
      await this.repo.write('meta', K_PERSONAL_LIBRARY, { v: file as unknown as Json });
      this.personalFile = file;
      clearPersonalLibrary(); // never leave a plaintext copy next to the encrypted one
      n = file.actions.length;
    } else {
      n = kv === undefined ? savePersonalLibrary(json) : savePersonalLibrary(json, kv);
    }
    await this.repo.refreshLibrary(await this.loadLibrary());
    await this.reload();
    return n;
  }

  /** Removes her personal library from this device and goes back to the neutral shipped one. */
  async removePersonalLibrary(kv?: KeyValueStore | null): Promise<void> {
    if (this.repo.encrypted) {
      await this.repo.remove('meta', K_PERSONAL_LIBRARY);
      this.personalFile = null;
      clearPersonalLibrary();
    } else if (kv === undefined) clearPersonalLibrary();
    else clearPersonalLibrary(kv);
    await this.repo.refreshLibrary(await this.loadLibrary());
    await this.reload();
  }

  /** Does this profile hold a personal library? */
  hasPersonalLibrary(kv?: KeyValueStore | null): boolean {
    if (this.personalFile !== undefined) return this.personalFile != null;
    return (kv === undefined ? readPersonalLibrary() : readPersonalLibrary(kv)) != null;
  }

  /** The shipped library merged with her personal one (for this profile). */
  loadLibrary(): Promise<SeedLibrary> {
    return loadShippedLibrary(this.personalFile);
  }

  // ---- weekly-review draft (private: wins, miss reasons, ratings) ------------------------------
  private reviewDrafts = new Map<string, string>();
  private reviewDraftWrites: Promise<unknown> = Promise.resolve();

  /** The draft text for a week (JSON string), or null. Synchronous: encrypted profiles are cached at open. */
  getReviewDraftRaw(weekKey: string): string | null {
    if (this.repo.encrypted) return this.reviewDrafts.get(weekKey) ?? null;
    try {
      return window.localStorage.getItem(kReviewDraftLsPrefix + weekKey);
    } catch {
      return this.reviewDrafts.get(weekKey) ?? null;
    }
  }
  /** Lock on: the draft goes into the encrypted database only (never localStorage). Lock off: localStorage as before. */
  setReviewDraftRaw(weekKey: string, raw: string): void {
    if (this.repo.encrypted) {
      this.reviewDrafts.set(weekKey, raw);
      this.reviewDraftWrites = this.reviewDraftWrites.then(() => this.repo.write('meta', K_REVIEW_DRAFT + weekKey, { v: raw })).catch(() => undefined);
      return;
    }
    try {
      window.localStorage.setItem(kReviewDraftLsPrefix + weekKey, raw);
    } catch {
      this.reviewDrafts.set(weekKey, raw);
    }
  }
  clearReviewDraftRaw(weekKey: string): void {
    this.reviewDrafts.delete(weekKey);
    try {
      window.localStorage.removeItem(kReviewDraftLsPrefix + weekKey);
    } catch {
      /* storage blocked */
    }
    if (this.repo.encrypted) this.reviewDraftWrites = this.reviewDraftWrites.then(() => this.repo.remove('meta', K_REVIEW_DRAFT + weekKey)).catch(() => undefined);
  }

  /** Same placement rule as the personal library: lock on -> rows in the encrypted database (a leftover localStorage copy moves in, verified, then goes); lock off -> back to localStorage. */
  private async settleReviewDrafts(): Promise<void> {
    const rows = new Map<string, string>();
    for (const [id, v] of await this.repo.readEntries('meta')) {
      if (id.startsWith(K_REVIEW_DRAFT) && typeof v['v'] === 'string') rows.set(id.slice(K_REVIEW_DRAFT.length), v['v'] as string);
    }
    const ls = new Map<string, string>();
    try {
      const l = window.localStorage;
      for (let i = 0; i < l.length; i++) {
        const k = l.key(i);
        if (k && k.startsWith(kReviewDraftLsPrefix)) ls.set(k.slice(kReviewDraftLsPrefix.length), l.getItem(k) ?? '');
      }
    } catch {
      /* storage blocked */
    }
    if (this.repo.encrypted) {
      for (const [wk, raw] of ls) {
        if (!rows.has(wk)) {
          await this.repo.write('meta', K_REVIEW_DRAFT + wk, { v: raw });
          const back = await this.repo.read('meta', K_REVIEW_DRAFT + wk);
          if (back?.['v'] !== raw) throw new Error('review-draft-move-failed');
          rows.set(wk, raw);
        }
        try { window.localStorage.removeItem(kReviewDraftLsPrefix + wk); } catch { /* ignore */ }
      }
      this.reviewDrafts = rows;
      return;
    }
    for (const [wk, raw] of rows) {
      if (!ls.has(wk)) {
        try { window.localStorage.setItem(kReviewDraftLsPrefix + wk, raw); } catch { continue; }
      }
      await this.repo.remove('meta', K_REVIEW_DRAFT + wk);
    }
  }

  /** Records of this profile that could not be opened (damaged / tampered). They are skipped, kept on disk and reported in Settings. */
  quarantined(): readonly QuarantinedRecord[] {
    return this.repo.quarantined();
  }

  /**
   * Keeps the personal library where the profile's protection says it belongs: inside the encrypted database when the
   * lock is on (a leftover localStorage copy is moved in, verified, then removed), in localStorage when it is off
   * (a copy that came back from turning the lock off is moved out of the database).
   */
  private async settlePersonalLibrary(): Promise<void> {
    const fromRow = async (): Promise<PersonalLibraryFile | null> => {
      try {
        const r = await this.repo.read('meta', K_PERSONAL_LIBRARY);
        return r == null ? null : parsePersonalLibrary(r['v']);
      } catch {
        return null;
      }
    };
    const row = await fromRow();
    const ls = readPersonalLibrary();
    if (this.repo.encrypted) {
      let file = row;
      if (!file && ls) {
        await this.repo.write('meta', K_PERSONAL_LIBRARY, { v: ls as unknown as Json });
        file = await fromRow(); // read back from the database before the plaintext copy goes
        if (!file) throw new Error('personal-library-move-failed');
      }
      if (file) clearPersonalLibrary();
      this.personalFile = file;
      return;
    }
    if (row && !ls) {
      try {
        savePersonalLibrary(row);
        if (readPersonalLibrary()) await this.repo.remove('meta', K_PERSONAL_LIBRARY);
      } catch {
        /* localStorage unavailable: the row stays the source */
      }
    }
  }

  // ---- undoable deletes ---------------------------------------------------------
  private remember(label: string, restore: () => Promise<void>): UndoToken {
    const token = this.newId('undo');
    const expiresAt = this.clock().getTime() + kUndoWindowMs;
    this.trash.set(token, { label, expiresAt, restore });
    return { token, expiresAt, label };
  }
  /** Restores a deleted record within the undo window. False if expired/unknown. */
  async undoDelete(token: string): Promise<boolean> {
    const t = this.trash.get(token);
    if (t == null) return false;
    this.trash.delete(token);
    if (this.clock().getTime() > t.expiresAt) return false;
    await t.restore();
    return true;
  }

  private async deleteIn<K extends keyof LifeSnapshot>(
    key: K,
    coll: { put: (x: never) => Promise<void>; delete: (id: string) => Promise<void> },
    id: string,
    idOf: (x: never) => string,
    label: (x: never) => string,
  ): Promise<UndoToken | null> {
    const list = this.s[key] as unknown as never[];
    const item = list.find((x) => idOf(x) === id);
    if (item === undefined) return null;
    await coll.delete(id);
    this.patch({ [key]: list.filter((x) => idOf(x) !== id) } as unknown as Partial<LifeSnapshot>);
    const ent = ENTITY_BY_KEY.get(key as string);
    if (ent) await this.logChange('delete', ent, id, ENTITIES[ent].toJson(item), null, label(item));
    return this.remember(label(item), async () => {
      await coll.put(item);
      const cur = this.s[key] as unknown as never[];
      this.patch({ [key]: [...cur.filter((x) => idOf(x) !== id), item] } as unknown as Partial<LifeSnapshot>);
    });
  }

  // ---- logging ----------------------------------------------------------------------
  /** Logs [item] done at [level] and awards Sparks (comeback ×2, review 5, cap 20). */
  async completeItem(
    item: Pick<PlanItem, 'itemId' | 'kind'>,
    level: CompletionLevel,
    o: { durationMin?: number | null; enjoyment?: number | null; note?: string | null } = {},
  ): Promise<CompletionResult> {
    const now = this.clock();
    const today = this.today();
    const s = this.s;
    const habit = item.kind === 'habit' ? snapshotHabit(s, item.itemId) : null;
    const comeback = isDoneLevel(level) && habit != null && isComebackCompletion(habit, s.logs, today, excusedDaysOf(s).get(habit.id));
    const log = makeLog({
      id: this.newId('log'), itemId: item.itemId, kind: item.kind, date: dayKey(today), level,
      durationMin: o.durationMin ?? null, enjoyment: o.enjoyment ?? null, note: o.note ?? null,
      loggedAt: toIsoLocal(now), minuteOfDay: minuteOfDay(now),
    });
    const earned = earnedOn(s.sparkTxns, log.date);
    const isReview = item.kind === 'weeklyTask' && s.weeklyTasks.some((t) => t.id === item.itemId && t.isWeeklyReview);
    const award =
      !isDoneLevel(level) || item.kind === 'joy' || item.kind === 'task'
        ? SPARK_NONE
        : isReview
          ? awardForWeeklyReview({ earnedToday: earned })
          : awardForCompletion({ level, isComeback: comeback, earnedToday: earned });
    const txn = txnForAward(award, { id: this.newId('spk'), at: now, reason: isReview ? 'weeklyReview' : 'completion', refId: log.id, date: log.date });
    await this.repo.logs.put(log);
    if (txn) await this.repo.sparkTxns.put(txn);
    let habits = s.habits;
    if (habit != null && habit.comebackPending && isDoneLevel(level)) {
      this.clearedComeback.set(log.id, habit.id);
      const cleared = { ...habit, comebackPending: false };
      await this.repo.habits.put(cleared);
      habits = upsertById(habits, cleared, (h) => h.id);
    }
    const projects = item.kind === 'projectStep' && isDoneLevel(level) ? await this.setProjectStepDone(s.projects, item.itemId, log.date) : s.projects;
    this.patch({ logs: [...s.logs, log], sparkTxns: txn ? [...s.sparkTxns, txn] : s.sparkTxns, habits, projects });
    return { log, award, undoUntil: new Date(now.getTime() + kUndoWindowMs), isComeback: award.comeback };
  }

  private async setProjectStepDone(projects: Project[], stepId: string, date: string | null): Promise<Project[]> {
    const p = projects.find((x) => x.steps.some((st) => st.id === stepId));
    if (p == null) return projects;
    const updated: Project = { ...p, steps: p.steps.map((st) => (st.id === stepId ? { ...st, done: date != null, doneDate: date } : st)) };
    await this.repo.projects.put(updated);
    return upsertById(projects, updated, (e) => e.id);
  }

  /** Explicit "skip today" (no Sparks, never shown as failure). */
  async skipItem(item: Pick<PlanItem, 'itemId' | 'kind'>, note?: string): Promise<LogEntry> {
    return (await this.completeItem(item, 'skipped', { note })).log;
  }

  /** Undoes a completion within the window; reverses its Sparks. */
  async undo(logId: string, ignoreWindow = false): Promise<boolean> {
    const s = this.s;
    const log = s.logs.find((l) => l.id === logId);
    if (log == null) return false;
    const now = this.clock();
    if (!ignoreWindow && log.loggedAt != null && now.getTime() - new Date(log.loggedAt).getTime() > kUndoWindowMs) return false;
    const reversals = reversalsFor(s.sparkTxns, logId, { idFor: () => this.newId('spk'), at: now });
    await this.repo.logs.delete(logId);
    await this.repo.sparkTxns.putAll(reversals);
    let habits = s.habits;
    const habitId = this.clearedComeback.get(logId) ?? (s.sparkTxns.some((t) => t.refId === logId && t.reason === 'comeback') ? log.itemId : null);
    this.clearedComeback.delete(logId);
    const h = habitId == null ? null : snapshotHabit(s, habitId);
    if (h != null && !h.comebackPending && log.kind === 'habit') {
      const restored = { ...h, comebackPending: true };
      await this.repo.habits.put(restored);
      habits = upsertById(habits, restored, (e) => e.id);
    }
    const projects = log.kind === 'projectStep' && logIsDone(log) ? await this.setProjectStepDone(s.projects, log.itemId, null) : s.projects;
    this.patch({ logs: s.logs.filter((l) => l.id !== logId), sparkTxns: [...s.sparkTxns, ...reversals], habits, projects });
    return true;
  }

  // ---- energy & checks ------------------------------------------------------------
  async setEnergy(mode: EnergyCheck['mode']): Promise<void> {
    const check: EnergyCheck = { date: dayKey(this.today()), mode, at: toIsoLocal(this.clock()) };
    await this.repo.energyChecks.put(check);
    this.patch({ energyChecks: upsertById(this.s.energyChecks, check, (c) => c.date) });
  }
  async recordStrengthCheck(habitId: string, items: number[]): Promise<StrengthCheck> {
    const c: StrengthCheck = { id: this.newId('srbai'), habitId, date: dayKey(this.today()), items };
    await this.repo.strengthChecks.put(c);
    this.patch({ strengthChecks: [...this.s.strengthChecks, c] });
    return c;
  }

  // ---- suggestion-mode day plan ----------------------------------------------------
  private async savePlan(plan: DayPlan): Promise<void> {
    await this.repo.dayPlans.put(plan);
    this.patch({ dayPlans: upsertById(this.s.dayPlans, plan, (p) => p.date) });
  }
  private planFor(date: Date): DayPlan {
    return acceptedPlanFor(this.s, date) ?? makeDayPlan({ date: dayKey(date), energy: 'green', items: [] });
  }
  private findSuggestion(date: Date, planItemId: string): Suggestion | null {
    return suggestionsFor(this.s, date).suggestions.find((x) => x.item.id === planItemId) ?? null;
  }

  /** Adds an engine suggestion to her day (optionally at a chosen size). */
  async acceptSuggestion(planItemId: string, o: { level?: CompletionLevel; date?: Date } = {}): Promise<boolean> {
    const date = o.date ?? this.today();
    const sug = this.findSuggestion(date, planItemId) ?? null;
    const fromLater = this.s.later.find((i) => i.id === planItemId) ?? null;
    const item = sug?.item ?? fromLater;
    if (item == null) return false;
    await this.addToPlan(date, item, o.level);
    if (fromLater) {
      await this.repo.later.delete(planItemId);
      this.patch({ later: this.s.later.filter((i) => i.id !== planItemId) });
    }
    return true;
  }

  private async addToPlan(date: Date, item: PlanItem, level?: CompletionLevel): Promise<void> {
    const plan = this.planFor(date);
    const chosen = level ?? item.suggestedLevel;
    const next: PlanItem = { ...item, suggestedLevel: chosen };
    await this.savePlan({
      ...plan,
      items: sortPlanItems(upsertById(plan.items, next, (i) => i.id)),
      deferred: plan.deferred.filter((i) => i.id !== item.id),
    });
  }

  /** Accepts several suggestions at once (e.g. a whole routine group, or everything the auto plan would pick). */
  async acceptMany(planItemIds: string[], date: Date = this.today()): Promise<number> {
    const set = suggestionsFor(this.s, date);
    const byId = new Map(set.suggestions.map((x) => [x.item.id, x]));
    let plan = this.planFor(date);
    let n = 0;
    for (const id of planItemIds) {
      const x = byId.get(id);
      if (!x) continue;
      plan = { ...plan, items: upsertById(plan.items, x.item, (i) => i.id), deferred: plan.deferred.filter((i) => i.id !== id) };
      n++;
    }
    await this.savePlan({ ...plan, items: sortPlanItems(plan.items) });
    return n;
  }

  /** Accepts exactly what the legacy auto plan would do (her one-tap shortcut), at its levels. */
  async acceptAutoPlan(date: Date = this.today()): Promise<number> {
    const set = suggestionsFor(this.s, date);
    let plan = this.planFor(date);
    for (const i of set.autoPlan.items) plan = { ...plan, items: upsertById(plan.items, i, (x) => x.id) };
    await this.savePlan({ ...plan, items: sortPlanItems(plan.items) });
    return set.autoPlan.items.length;
  }

  /** Removes an item from her day (back to suggestions). Reversible with acceptSuggestion. */
  async unaccept(planItemId: string, date: Date = this.today()): Promise<void> {
    const plan = this.planFor(date);
    await this.savePlan({ ...plan, items: plan.items.filter((i) => i.id !== planItemId) });
  }

  /** "Not today" for a suggestion: hidden from today's suggestions (kept visible in the plan's `deferred`). */
  async declineSuggestion(planItemId: string, date: Date = this.today()): Promise<void> {
    const sug = this.findSuggestion(date, planItemId);
    if (!sug) return;
    const plan = this.planFor(date);
    await this.savePlan({ ...plan, deferred: upsertById(plan.deferred, sug.item, (i) => i.id) });
  }

  /** Changes the size she plans to do (minimum / normal / bonus). */
  async setPlannedLevel(planItemId: string, level: CompletionLevel, date: Date = this.today()): Promise<void> {
    const plan = this.planFor(date);
    await this.savePlan({ ...plan, items: plan.items.map((i) => (i.id === planItemId ? { ...i, suggestedLevel: level } : i)) });
  }

  /** Moves an item to «بعدين» (never disappears; restore with acceptSuggestion or restoreFromLater). */
  async moveToLater(planItemId: string, date: Date = this.today()): Promise<boolean> {
    const plan = this.planFor(date);
    const item = plan.items.find((i) => i.id === planItemId) ?? this.findSuggestion(date, planItemId)?.item ?? null;
    if (item == null) return false;
    await this.repo.later.put(item);
    this.patch({ later: upsertById(this.s.later, item, (i) => i.id) });
    if (plan.items.some((i) => i.id === planItemId)) await this.savePlan({ ...plan, items: plan.items.filter((i) => i.id !== planItemId) });
    return true;
  }

  /** Puts a «بعدين» item on [date]'s plan. */
  async restoreFromLater(planItemId: string, date: Date = this.today()): Promise<boolean> {
    const item = this.s.later.find((i) => i.id === planItemId);
    if (!item) return false;
    await this.addToPlan(date, item);
    await this.repo.later.delete(planItemId);
    this.patch({ later: this.s.later.filter((i) => i.id !== planItemId) });
    return true;
  }

  /** Removes an item from «بعدين» (undoable). */
  async dropFromLater(planItemId: string): Promise<UndoToken | null> {
    return this.deleteIn('later', this.repo.later as never, planItemId, ((i: PlanItem) => i.id) as never, ((i: PlanItem) => i.title.ar) as never);
  }

  /**
   * Moves a plan item from [from]'s day to [to]'s day: added to that day's plan, taken off today and
   * kept out of today's suggestions (so it never pops back). Undo with [undoMoveToDate].
   */
  async moveToDate(planItemId: string, to: Date, from: Date = this.today()): Promise<boolean> {
    // Only forward: today or a past day would take it off today and land it where she never looks.
    if (cmpStr(dayKey(to), dayKey(from)) <= 0) return false;
    const plan = this.planFor(from);
    const item = plan.items.find((i) => i.id === planItemId) ?? this.findSuggestion(from, planItemId)?.item ?? this.s.later.find((i) => i.id === planItemId) ?? null;
    if (item == null) return false;
    await this.addToPlan(to, item);
    const fresh = this.planFor(from);
    await this.savePlan({
      ...fresh,
      items: fresh.items.filter((i) => i.id !== planItemId),
      deferred: upsertById(fresh.deferred, item, (i) => i.id),
    });
    if (this.s.later.some((i) => i.id === planItemId)) {
      await this.repo.later.delete(planItemId);
      this.patch({ later: this.s.later.filter((i) => i.id !== planItemId) });
    }
    return true;
  }

  /** Reverses [moveToDate]: back on [from]'s day (as accepted if it was), off [to]'s plan. */
  async undoMoveToDate(planItemId: string, to: Date, from: Date = this.today(), wasAccepted = true): Promise<void> {
    const target = this.planFor(to);
    const item = target.items.find((i) => i.id === planItemId) ?? null;
    await this.savePlan({ ...target, items: target.items.filter((i) => i.id !== planItemId) });
    const src = this.planFor(from);
    const deferred = src.deferred.filter((i) => i.id !== planItemId);
    const items = wasAccepted && item != null ? sortPlanItems(upsertById(src.items, item, (i) => i.id)) : src.items;
    await this.savePlan({ ...src, items, deferred });
  }

  /**
   * «رجّعيها للوارد» for a plan item: it leaves today (and today's suggestions) and lands in the inbox
   * as a task to re-sort. Returns the new inbox item (delete it + [undoMoveToDate]-style restore to undo).
   */
  async planItemToInbox(planItemId: string, date: Date = this.today()): Promise<InboxItem | null> {
    const plan = this.planFor(date);
    const item = plan.items.find((i) => i.id === planItemId) ?? this.findSuggestion(date, planItemId)?.item ?? null;
    if (item == null) return null;
    await this.savePlan({ ...plan, items: plan.items.filter((i) => i.id !== planItemId), deferred: upsertById(plan.deferred, item, (i) => i.id) });
    return this.quickAdd(item.title.ar, 'task', { source: 'today' });
  }

  /** Undo for [planItemToInbox]. */
  async undoPlanItemToInbox(planItemId: string, inboxId: string, date: Date = this.today(), wasAccepted = true): Promise<void> {
    const plan = this.planFor(date);
    const item = plan.deferred.find((i) => i.id === planItemId) ?? null;
    await this.savePlan({
      ...plan,
      deferred: plan.deferred.filter((i) => i.id !== planItemId),
      items: wasAccepted && item != null ? sortPlanItems(upsertById(plan.items, item, (i) => i.id)) : plan.items,
    });
    await this.repo.inbox.delete(inboxId);
    this.patch({ inbox: this.s.inbox.filter((i) => i.id !== inboxId) });
  }

  /**
   * Evening Shutdown for an open plan item or task:
   * - `tomorrow` → planned for tomorrow and taken off today (plan item moved; task status planned + dueDate),
   * - `later` → «بعدين» (plan item to the later list; task status postponed),
   * - `letGo` → just for today: plan item logged as skipped (no Sparks, not a failure); a task goes back
   *   to the inbox (never cancelled — she can find it again).
   */
  async eveningDecision(target: { planItemId: string } | { taskId: string }, choice: EveningChoice): Promise<void> {
    const today = this.today();
    const tomorrow = addDays(today, 1);
    if ('taskId' in target) {
      if (choice === 'letGo') {
        await this.returnTaskToInbox(target.taskId);
        return;
      }
      const status: TaskStatus = choice === 'tomorrow' ? 'planned' : 'postponed';
      await this.updateTask(target.taskId, {
        status,
        dueDate: choice === 'tomorrow' ? dayKey(tomorrow) : undefined,
        postponedTo: choice === 'later' ? null : undefined,
      });
      return;
    }
    const plan = this.planFor(today);
    const item = plan.items.find((i) => i.id === target.planItemId) ?? this.findSuggestion(today, target.planItemId)?.item ?? null;
    if (item == null) return;
    if (choice === 'tomorrow') {
      await this.moveToDate(item.id, tomorrow, today);
    } else if (choice === 'later') {
      await this.moveToLater(item.id, today);
      return;
    } else {
      await this.skipItem(item);
    }
  }

  // ---- tasks & inbox -------------------------------------------------------------
  /** Quick capture: title only → the inbox. */
  async quickAdd(title: string, kind: InboxKind = 'task', o: { body?: string; url?: string | null; source?: string | null } = {}): Promise<InboxItem> {
    const it = makeInboxItem({
      id: this.newId('inb'), title: title.trim(), kind, createdAt: toIsoLocal(this.clock()),
      body: o.body ?? '', url: o.url ?? null, source: o.source ?? null,
    });
    await this.repo.inbox.put(it);
    this.patch({ inbox: [...this.s.inbox, it] });
    return it;
  }

  async updateInbox(id: string, p: Partial<Omit<InboxItem, 'id'>>): Promise<void> {
    const it = this.s.inbox.find((x) => x.id === id);
    if (!it) return;
    const next = { ...it, ...p };
    await this.repo.inbox.put(next);
    this.patch({ inbox: upsertById(this.s.inbox, next, (x) => x.id) });
    await this.logEntityChange('inbox', it, next);
  }

  /** Converts an inbox item to a task, a project (idea) or a note; the inbox item is kept as converted. */
  async convertInbox(
    id: string,
    to: 'task' | 'project' | 'note',
    o: { domain?: DomainId; dueDate?: string | null; projectId?: string | null; projectStatus?: Project['status'] } = {},
  ): Promise<TaskItem | Project | Note | InboxItem | null> {
    const it = this.s.inbox.find((x) => x.id === id);
    if (!it) return null;
    if (to === 'task') {
      const t = await this.addTask({ title: it.title, notes: it.body, domain: o.domain ?? null, dueDate: o.dueDate ?? null, projectId: o.projectId ?? null, sourceInboxId: it.id });
      await this.updateInbox(id, { convertedTo: { type: 'task', id: t.id }, archived: true });
      return t;
    }
    if (to === 'project') {
      const p = makeProject({ id: this.newId('prj'), domain: o.domain ?? 'learning', titleAr: it.title, titleEn: it.title, status: o.projectStatus ?? 'idea', notes: it.body, dueDate: o.dueDate ?? null });
      await this.repo.projects.put(p);
      this.patch({ projects: [...this.s.projects, p] });
      await this.updateInbox(id, { convertedTo: { type: 'project', id: p.id }, archived: true });
      return p;
    }
    // Note: create a real Note (body keeps the link when there is one) and point the inbox item at it.
    const body = [it.body.trim(), it.url && !it.body.includes(it.url) ? it.url : ''].filter((x) => x !== '').join('\n');
    const n = await this.addNote({ title: it.title, body, tag: it.kind === 'link' ? 'reference' : 'note' });
    if (!n) return null;
    await this.updateInbox(id, { convertedTo: { type: 'note', id: n.id }, archived: true });
    return n;
  }

  /** Same as convertInbox, plus an UndoToken that removes what was created and restores the inbox item. */
  async convertInboxWithUndo(
    id: string,
    to: 'task' | 'project' | 'note',
    o: { domain?: DomainId; dueDate?: string | null; projectId?: string | null; projectStatus?: Project['status'] } = {},
  ): Promise<{ result: TaskItem | Project | Note | InboxItem | null; undo: UndoToken | null }> {
    const before = this.s.inbox.find((x) => x.id === id);
    if (!before) return { result: null, undo: null };
    const result = await this.convertInbox(id, to, o);
    if (result == null) return { result, undo: null };
    const undo = this.remember(before.title, async () => {
      if (to === 'task' && 'status' in result && 'title' in result) {
        await this.repo.tasks.delete(result.id);
        this.patch({ tasks: this.s.tasks.filter((x) => x.id !== result.id) });
      } else if (to === 'project') {
        await this.repo.projects.delete(result.id);
        this.patch({ projects: this.s.projects.filter((x) => x.id !== result.id) });
      } else if (to === 'note') {
        await this.repo.notes.delete(result.id);
        this.patch({ notes: this.s.notes.filter((x) => x.id !== result.id) });
      }
      await this.repo.inbox.put(before);
      this.patch({ inbox: upsertById(this.s.inbox, before, (x) => x.id) });
    });
    return { result, undo };
  }

  archiveInbox(id: string, archived = true): Promise<void> {
    return this.updateInbox(id, { archived });
  }
  deleteInbox(id: string): Promise<UndoToken | null> {
    return this.deleteIn('inbox', this.repo.inbox as never, id, ((x: InboxItem) => x.id) as never, ((x: InboxItem) => x.title) as never);
  }

  /** Adds a task (status planned when it has a date, otherwise inbox). */
  async addTask(p: Partial<TaskItem> & { title: string }): Promise<TaskItem> {
    const now = toIsoLocal(this.clock());
    const t = makeTask({
      ...p,
      id: p.id ?? this.newId('tsk'),
      title: p.title.trim(),
      createdAt: now,
      updatedAt: now,
      status: p.status ?? (p.dueDate ? 'planned' : 'inbox'),
    });
    await this.repo.tasks.put(t);
    this.patch({ tasks: upsertById(this.s.tasks, t, (x) => x.id) });
    await this.logEntityChange('tasks', null, t);
    return t;
  }

  /** Updates a task; `undefined` fields are left as they are. */
  async updateTask(id: string, p: Partial<Omit<TaskItem, 'id' | 'createdAt'>>): Promise<TaskItem | null> {
    const t = this.s.tasks.find((x) => x.id === id);
    if (!t) return null;
    const clean = Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined)) as Partial<TaskItem>;
    const next: TaskItem = { ...t, ...clean, updatedAt: toIsoLocal(this.clock()) };
    if (clean.status === 'done' && t.status !== 'done') next.completedAt = toIsoLocal(this.clock());
    if (clean.status != null && clean.status !== 'done') next.completedAt = null;
    await this.repo.tasks.put(next);
    this.patch({ tasks: upsertById(this.s.tasks, next, (x) => x.id) });
    await this.logEntityChange('tasks', t, next);
    if ((t.status === 'done') !== (next.status === 'done')) await this.syncStepFromTask(next);
    return next;
  }

  /** The project step a task carries out: its explicit link, or (older tasks) the same title. */
  private stepOfTask(t: TaskItem): { project: Project; stepId: string } | null {
    if (t.projectId == null) return null;
    const project = this.s.projects.find((p) => p.id === t.projectId);
    if (!project) return null;
    const step = t.projectStepId != null ? project.steps.find((x) => x.id === t.projectStepId) : project.steps.find((x) => x.titleAr === t.title);
    return step ? { project, stepId: step.id } : null;
  }
  /** Task done ↔ step done (QA area 3 #3): finishing «حطيها لليوم» on Today ticks the step. */
  private async syncStepFromTask(t: TaskItem): Promise<void> {
    const link = this.stepOfTask(t);
    if (!link) return;
    const done = t.status === 'done';
    const step = link.project.steps.find((x) => x.id === link.stepId)!;
    if (step.done === done) return;
    const doneDate = done ? (t.completedAt ?? toIsoLocal(this.clock())).slice(0, 10) : null;
    const next: Project = { ...link.project, steps: link.project.steps.map((x) => (x.id === link.stepId ? { ...x, done, doneDate } : x)) };
    await this.repo.projects.put(next);
    this.patch({ projects: upsertById(this.s.projects, next, (e) => e.id) });
    await this.logEntityChange('projects', link.project, next);
  }

  /** Ticks/unticks a project step and its open «حطيها لليوم» tasks together (two-way link). */
  async markProjectStep(projectId: string, stepId: string, done: boolean): Promise<void> {
    const project = this.s.projects.find((p) => p.id === projectId);
    const step = project?.steps.find((x) => x.id === stepId);
    if (!project || !step) return;
    if (step.done !== done) {
      const next: Project = { ...project, steps: project.steps.map((x) => (x.id === stepId ? { ...x, done, doneDate: done ? dayKey(this.today()) : null } : x)) };
      await this.repo.projects.put(next);
      this.patch({ projects: upsertById(this.s.projects, next, (e) => e.id) });
      await this.logEntityChange('projects', project, next);
    }
    const linked = this.s.tasks.filter(
      (t) => t.projectId === projectId && (t.projectStepId === stepId || (t.projectStepId == null && t.title === step.titleAr)),
    );
    for (const t of linked) {
      if (done && t.status !== 'done' && t.status !== 'cancelled') await this.updateTask(t.id, { status: 'done' });
      else if (!done && t.status === 'done') await this.updateTask(t.id, { status: t.dueDate ? 'planned' : 'inbox' });
    }
  }

  private inFlightStepPlans = new Map<string, Promise<{ task: TaskItem; created: boolean } | null>>();
  /**
   * «حطيها لليوم»: puts a project step on [date] as a planned task — idempotent. A second call
   * (even a fast double tap before the first write lands) returns the existing task (QA area 3 #3).
   */
  planProjectStep(projectId: string, stepId: string, date: string): Promise<{ task: TaskItem; created: boolean } | null> {
    const key = `${projectId}|${stepId}|${date}`;
    const running = this.inFlightStepPlans.get(key);
    if (running) return running.then((r) => (r ? { task: r.task, created: false } : null));
    const run = (async () => {
      const project = this.s.projects.find((p) => p.id === projectId);
      const step = project?.steps.find((x) => x.id === stepId);
      if (!project || !step) return null;
      const existing = this.s.tasks.find(
        (t) =>
          t.projectId === projectId &&
          (t.projectStepId === stepId || (t.projectStepId == null && t.title === step.titleAr)) &&
          t.dueDate === date &&
          t.status !== 'cancelled',
      );
      if (existing) return { task: existing, created: false };
      const task = await this.addTask({ title: step.titleAr, projectId, projectStepId: stepId, domain: project.domain, dueDate: date, status: 'planned' });
      return { task, created: true };
    })();
    this.inFlightStepPlans.set(key, run);
    return run.finally(() => this.inFlightStepPlans.delete(key));
  }

  /**
   * Deletes one project step. Undo re-inserts THAT step (at its old place) into the project as it is
   * at undo time — later ticks/notes survive (QA area 3 #5).
   */
  async deleteProjectStep(projectId: string, stepId: string): Promise<UndoToken | null> {
    const project = this.s.projects.find((p) => p.id === projectId);
    const idx = project?.steps.findIndex((x) => x.id === stepId) ?? -1;
    if (!project || idx < 0) return null;
    const step = project.steps[idx]!;
    const next: Project = { ...project, steps: project.steps.filter((x) => x.id !== stepId) };
    await this.repo.projects.put(next);
    this.patch({ projects: upsertById(this.s.projects, next, (e) => e.id) });
    await this.logEntityChange('projects', project, next);
    return this.remember(step.titleAr, async () => {
      const cur = this.s.projects.find((p) => p.id === projectId);
      if (!cur || cur.steps.some((x) => x.id === stepId)) return;
      const steps = [...cur.steps];
      steps.splice(Math.min(idx, steps.length), 0, step);
      const restored: Project = { ...cur, steps };
      await this.repo.projects.put(restored);
      this.patch({ projects: upsertById(this.s.projects, restored, (e) => e.id) });
    });
  }

  /** Patches a project field-by-field against its CURRENT state (safe for undo after other edits). */
  async patchProject(projectId: string, patch: Partial<Omit<Project, 'id'>>, force = true): Promise<CapacityViolation[]> {
    const cur = this.s.projects.find((p) => p.id === projectId);
    if (!cur) return [];
    return this.upsertProject({ ...cur, ...patch }, force);
  }
  completeTask(id: string): Promise<TaskItem | null> {
    return this.updateTask(id, { status: 'done' });
  }
  /** Postpones a task (to a date, or «بعدين» without one). It never disappears. */
  postponeTask(id: string, to: string | null = null): Promise<TaskItem | null> {
    return this.updateTask(id, { status: 'postponed', postponedTo: to });
  }
  /** Back to the inbox for re-sorting. */
  returnTaskToInbox(id: string): Promise<TaskItem | null> {
    return this.updateTask(id, { status: 'inbox', dueDate: null, postponedTo: null });
  }
  planTask(id: string, date: string, time: number | null = null): Promise<TaskItem | null> {
    return this.updateTask(id, { status: 'planned', dueDate: date, time, postponedTo: null });
  }
  deleteTask(id: string): Promise<UndoToken | null> {
    return this.deleteIn('tasks', this.repo.tasks as never, id, ((x: TaskItem) => x.id) as never, ((x: TaskItem) => x.title) as never);
  }

  // ---- products ------------------------------------------------------------------
  async upsertProduct(p: Product): Promise<void> {
    const prev = this.s.products.find((x) => x.id === p.id) ?? null;
    const next = { ...p, placeholder: p.placeholder && prev?.name === p.name };
    await this.repo.products.put(next);
    this.patch({ products: upsertById(this.s.products, next, (x) => x.id) });
    await this.logEntityChange('products', prev, next);
  }
  deleteProduct(id: string): Promise<UndoToken | null> {
    return this.deleteIn('products', this.repo.products as never, id, ((x: Product) => x.id) as never, ((x: Product) => x.name) as never);
  }
  /** Sets the step order of [slot] to [orderedIds]. */
  async reorderProducts(slot: ProductSlot, orderedIds: string[]): Promise<void> {
    const updated = this.s.products.map((p) => (p.slot === slot && orderedIds.includes(p.id) ? { ...p, order: orderedIds.indexOf(p.id) + 1 } : p));
    await this.repo.products.putAll(updated.filter((p) => p.slot === slot));
    this.patch({ products: updated });
  }
  /** Step id a product's completion is logged against. */
  productStepId(productId: string): string {
    return productStepId(productId);
  }

  // ---- design entities (capacity-guarded) ------------------------------------------
  async upsertHabit(habit: Habit, force = false): Promise<CapacityViolation[]> {
    const h = habit.createdDate == null ? { ...habit, createdDate: dayKey(this.today()) } : habit;
    const v = violationsAfter({ domains: this.s.domains, projects: this.s.projects, habits: this.s.habits, changedHabit: h });
    if (v.length > 0 && !force) return v;
    const prev = snapshotHabit(this.s, h.id);
    await this.repo.habits.put(h);
    this.patch({ habits: upsertById(this.s.habits, h, (e) => e.id) });
    await this.logEntityChange('habits', prev, h);
    return v;
  }
  deleteHabit(id: string): Promise<UndoToken | null> {
    return this.deleteIn('habits', this.repo.habits as never, id, ((x: Habit) => x.id) as never, ((x: Habit) => x.titleAr) as never);
  }
  /** Pause / resume a habit (no blame, no data loss). */
  async setHabitStatus(id: string, status: Habit['status']): Promise<void> {
    const h = snapshotHabit(this.s, id);
    if (!h) return;
    const next = { ...h, status };
    await this.repo.habits.put(next);
    this.patch({ habits: upsertById(this.s.habits, next, (e) => e.id) });
    await this.logEntityChange('habits', h, next);
  }

  async setDomainState(id: DomainId, st: DomainState, force = false): Promise<CapacityViolation[]> {
    const cur = this.s.domains.find((e) => e.id === id);
    if (!cur) return [];
    const d: Domain = { ...cur, state: st };
    const v = violationsAfter({ domains: this.s.domains, projects: this.s.projects, habits: this.s.habits, changedDomain: d });
    if (v.length > 0 && !force) return v;
    await this.repo.domains.put(d);
    let seasons = this.s.seasons;
    const season = currentSeason(this.s);
    if (season) {
      const updated: Season = { ...season, states: { ...season.states, [id]: st } };
      await this.repo.seasons.put(updated);
      seasons = upsertById(seasons, updated, (e) => e.id);
    }
    this.patch({ domains: upsertById(this.s.domains, d, (e) => e.id), seasons });
    return v;
  }
  async setDomainEnabled(id: DomainId, enabled: boolean): Promise<void> {
    const cur = this.s.domains.find((e) => e.id === id);
    if (!cur) return;
    const d = { ...cur, enabled };
    await this.repo.domains.put(d);
    this.patch({ domains: upsertById(this.s.domains, d, (e) => e.id) });
  }
  async startNewSeason(titleAr: string, titleEn: string): Promise<Season> {
    const today = dayKey(this.today());
    let seasons = this.s.seasons;
    const cur = currentSeason(this.s);
    if (cur) {
      const ended = { ...cur, endedDate: today };
      await this.repo.seasons.put(ended);
      seasons = upsertById(seasons, ended, (e) => e.id);
    }
    const states: Season['states'] = {};
    for (const d of this.s.domains) states[d.id] = d.state;
    const next: Season = { id: this.newId('season'), titleAr, titleEn, startDate: today, plannedEndDate: null, endedDate: null, states };
    await this.repo.seasons.put(next);
    this.patch({ seasons: [...seasons, next] });
    return next;
  }
  async upsertProject(p: Project, force = false): Promise<CapacityViolation[]> {
    const v = violationsAfter({ domains: this.s.domains, projects: this.s.projects, habits: this.s.habits, changedProject: p });
    if (v.length > 0 && !force) return v;
    const prev = this.s.projects.find((e) => e.id === p.id) ?? null;
    await this.repo.projects.put(p);
    this.patch({ projects: upsertById(this.s.projects, p, (e) => e.id) });
    await this.logEntityChange('projects', prev, p);
    return v;
  }
  deleteProject(id: string): Promise<UndoToken | null> {
    return this.deleteIn('projects', this.repo.projects as never, id, ((x: Project) => x.id) as never, ((x: Project) => x.titleAr) as never);
  }
  private async putSimple<K extends keyof LifeSnapshot, T>(key: K, coll: { put: (x: T) => Promise<void> }, item: T, idOf: (t: T) => string): Promise<void> {
    const before = (this.s[key] as unknown as T[]).find((x) => idOf(x) === idOf(item));
    await coll.put(item);
    this.patch({ [key]: upsertById(this.s[key] as unknown as T[], item, idOf) } as unknown as Partial<LifeSnapshot>);
    await this.logEntityChange(key, before ?? null, item);
  }
  upsertRoutine(r: Routine) { return this.putSimple('routines', this.repo.routines, r, (x) => x.id); }
  deleteRoutine(id: string) { return this.deleteIn('routines', this.repo.routines as never, id, ((x: Routine) => x.id) as never, ((x: Routine) => x.titleAr) as never); }
  upsertWeeklyTask(t: WeeklyTask) { return this.putSimple('weeklyTasks', this.repo.weeklyTasks, t, (x) => x.id); }
  deleteWeeklyTask(id: string) { return this.deleteIn('weeklyTasks', this.repo.weeklyTasks as never, id, ((x: WeeklyTask) => x.id) as never, ((x: WeeklyTask) => x.titleAr) as never); }
  upsertGoal(g: Goal) { return this.putSimple('goals', this.repo.goals, g, (x) => x.id); }
  deleteGoal(id: string) { return this.deleteIn('goals', this.repo.goals as never, id, ((x: Goal) => x.id) as never, ((x: Goal) => x.titleAr) as never); }
  upsertFixedEvent(e: FixedEvent) { return this.putSimple('fixedEvents', this.repo.fixedEvents, e, (x) => x.id); }
  deleteFixedEvent(id: string) { return this.deleteIn('fixedEvents', this.repo.fixedEvents as never, id, ((x: FixedEvent) => x.id) as never, ((x: FixedEvent) => x.title) as never); }
  upsertJoyItem(j: JoyItem) { return this.putSimple('joyItems', this.repo.joyItems, j, (x) => x.id); }
  deleteJoyItem(id: string) { return this.deleteIn('joyItems', this.repo.joyItems as never, id, ((x: JoyItem) => x.id) as never, ((x: JoyItem) => x.titleAr) as never); }

  async updateSettings(settings: Settings): Promise<void> {
    await this.repo.saveSettings(settings);
    this.patch({ settings });
  }
  /** Salary day of month (1–31). The budget month starts on payday. */
  setPayday(day: number): Promise<void> {
    const next = Math.min(31, Math.max(1, Math.trunc(day)));
    const cur = this.s.settings;
    if (next === cur.paydayDay) return Promise.resolve();
    // Keep the cycle in progress: the old rule keeps governing every date before today
    // (calendar day — salary lands after midnight), the new one applies from today on.
    const until = dayKey(dateOnly(this.clock()));
    const history = cur.paydayHistory ?? [];
    const paydayHistory = history.some((h) => h.until === until)
      ? history
      : [...history, { until, day: cur.paydayDay }].slice(-24);
    return this.updateSettings({ ...cur, paydayDay: next, paydayHistory });
  }

  /** Her name for the greeting (exported with settings). */
  setDisplayName(name: string): Promise<void> {
    return this.updateSettings({ ...this.s.settings, displayName: name.trim().slice(0, 40) });
  }
  /** Pause / resume the AM/PM/weekly product routine (products are kept as they are). */
  setRoutineSlotPaused(slot: ProductSlot, paused: boolean): Promise<void> {
    const cur = this.s.settings.pausedRoutineSlots.filter((x) => x !== slot);
    return this.updateSettings({ ...this.s.settings, pausedRoutineSlots: paused ? [...cur, slot] : cur });
  }
  /**
   * Marks a bill paid / unpaid. [key] is the occurrence due date (`yyyy-MM-dd`, preferred — see
   * billPaidKeysFor) or a legacy cycle key; a list marks paid under its first key and, when
   * un-marking, removes every key in it.
   */
  async setBillPaid(billId: string, key: string | readonly string[], paid: boolean): Promise<void> {
    const b = this.s.bills.find((x) => x.id === billId);
    if (!b) return;
    const keys = typeof key === 'string' ? [key] : [...key];
    if (keys.length === 0) return;
    const rest = (b.paidCycles ?? []).filter((k) => !keys.includes(k));
    await this.upsertBill({ ...b, paidCycles: paid ? [...rest, keys[0]!] : rest });
  }

  // ---- sparks & joy -----------------------------------------------------------------
  /** Redeems a reward; `undo` reverses it within the undo window (the spend is removed). */
  async redeem(joyItemId: string): Promise<RedeemResult & { undo: UndoToken | null }> {
    const reward = this.s.joyItems.find((j) => j.id === joyItemId);
    if (!reward) return { ok: false, txn: null, shortBy: 0, undo: null };
    const r = redeemReward({ ledger: this.s.sparkTxns, reward, txnId: this.newId('spk'), at: this.clock() });
    if (!(r.ok && r.txn)) return { ...r, undo: null };
    const txn = r.txn;
    await this.repo.sparkTxns.put(txn);
    this.patch({ sparkTxns: [...this.s.sparkTxns, txn] });
    const undo = this.remember(reward.titleAr, async () => {
      await this.repo.sparkTxns.delete(txn.id);
      this.patch({ sparkTxns: this.s.sparkTxns.filter((t) => t.id !== txn.id) });
    });
    return { ...r, undo };
  }

  // ---- recovery ---------------------------------------------------------------------
  /** Opens the recovery flow for ANY habit (from Habits / the habit detail). */
  startRecovery(habitId: string): RecoveryTrigger | null {
    const h = snapshotHabit(this.s, habitId);
    return h == null ? null : manualRecoveryTrigger(h, this.s.logs, this.today());
  }
  /** Her reason → one proposed design change. */
  proposeRecovery(habitId: string, reason: MissReason): DesignChange | null {
    const h = snapshotHabit(this.s, habitId);
    if (!h) return null;
    const resolver = AnchorResolver.fromSettings(this.s.settings);
    return proposeChange({ habit: h, reason, logs: this.s.logs, currentMinute: resolver.resolve(h.schedule.anchor, this.today()) });
  }
  /** She accepted (or edited) the change; flags the comeback bonus. */
  async acceptDesignChange(change: DesignChange): Promise<Habit | null> {
    const cur = snapshotHabit(this.s, change.habitId);
    if (!cur) return null;
    const h = applyDesignChange(cur, change);
    await this.repo.habits.put(h);
    this.patch({ habits: upsertById(this.s.habits, h, (e) => e.id) });
    return h;
  }

  // ---- experiments ------------------------------------------------------------------
  async startExperiment(e: Experiment): Promise<boolean> {
    if (!canStartExperiment(this.s.experiments.filter((x) => x.id !== e.id))) return false;
    const started: Experiment = { ...e, status: 'active', startDate: dayKey(this.today()) };
    await this.repo.experiments.put(started);
    this.patch({ experiments: upsertById(this.s.experiments, started, (x) => x.id) });
    return true;
  }
  async finishExperiment(id: string, keep: boolean): Promise<SparkAward> {
    const now = this.clock();
    const cur = this.s.experiments.find((x) => x.id === id);
    if (!cur) return SPARK_NONE;
    const e: Experiment = { ...cur, status: keep ? 'kept' : 'reverted', endDate: dayKey(this.today()) };
    const award = awardForExperiment({ earnedToday: earnedOn(this.s.sparkTxns, dayKey(this.today())) });
    const txn = txnForAward(award, { id: this.newId('spk'), at: now, reason: 'experiment', refId: id, date: dayKey(this.today()) });
    await this.repo.experiments.put(e);
    if (txn) await this.repo.sparkTxns.put(txn);
    this.patch({ experiments: upsertById(this.s.experiments, e, (x) => x.id), sparkTxns: txn ? [...this.s.sparkTxns, txn] : this.s.sparkTxns });
    return award;
  }

  // ---- IELTS / driving -------------------------------------------------------------
  async addVocabCard(front: string, back: string, example = ''): Promise<VocabCard> {
    // Logical day (after-midnight cards are due «today», QA area 3 #17).
    const c = newVocabCard({ id: this.newId('vc'), front, back, example, today: this.today() });
    await this.repo.vocabCards.put(c);
    this.patch({ vocabCards: [...this.s.vocabCards, c] });
    return c;
  }
  async reviewVocab(cardId: string, grade: number): Promise<VocabCard | null> {
    const cur = this.s.vocabCards.find((x) => x.id === cardId);
    if (!cur) return null;
    const c = reviewCard(cur, grade, this.today());
    await this.repo.vocabCards.put(c);
    this.patch({ vocabCards: upsertById(this.s.vocabCards, c, (x) => x.id) });
    return c;
  }
  deleteVocabCard(id: string) { return this.deleteIn('vocabCards', this.repo.vocabCards as never, id, ((x: VocabCard) => x.id) as never, ((x: VocabCard) => x.front) as never); }
  /** Edits a card's text (scheduling untouched). */
  updateVocabCard(c: VocabCard) { return this.putSimple('vocabCards', this.repo.vocabCards, c, (x) => x.id); }
  addMockTest(m: MockTest) { return this.putSimple('mockTests', this.repo.mockTests, m, (x) => x.id); }
  /** Same as addMockTest — editing an existing result keeps its id. */
  updateMockTest(m: MockTest) { return this.putSimple('mockTests', this.repo.mockTests, m, (x) => x.id); }
  deleteMockTest(id: string) { return this.deleteIn('mockTests', this.repo.mockTests as never, id, ((x: MockTest) => x.id) as never, ((x: MockTest) => x.date) as never); }
  addDrivingSession(d: DrivingSession) { return this.putSimple('drivingSessions', this.repo.drivingSessions, d, (x) => x.id); }
  deleteDrivingSession(id: string) { return this.deleteIn('drivingSessions', this.repo.drivingSessions as never, id, ((x: DrivingSession) => x.id) as never, ((x: DrivingSession) => x.date) as never); }

  // ---- money & admin ----------------------------------------------------------------
  upsertEnvelope(e: MoneyEnvelope) { return this.putSimple('moneyEnvelopes', this.repo.moneyEnvelopes, e, (x) => x.id); }
  upsertBill(b: Bill) { return this.putSimple('bills', this.repo.bills, b, (x) => x.id); }
  upsertBnpl(b: BnplItem) { return this.putSimple('bnplItems', this.repo.bnplItems, b, (x) => x.id); }
  upsertWish(w: WishItem) { return this.putSimple('wishItems', this.repo.wishItems, w, (x) => x.id); }
  upsertAdminDoc(d: AdminDoc) { return this.putSimple('adminDocs', this.repo.adminDocs, d, (x) => x.id); }
  deleteEnvelope(id: string) { return this.deleteIn('moneyEnvelopes', this.repo.moneyEnvelopes as never, id, ((x: MoneyEnvelope) => x.id) as never, ((x: MoneyEnvelope) => x.titleAr) as never); }
  deleteBill(id: string) { return this.deleteIn('bills', this.repo.bills as never, id, ((x: Bill) => x.id) as never, ((x: Bill) => x.title) as never); }
  deleteBnpl(id: string) { return this.deleteIn('bnplItems', this.repo.bnplItems as never, id, ((x: BnplItem) => x.id) as never, ((x: BnplItem) => x.title) as never); }
  deleteWish(id: string) { return this.deleteIn('wishItems', this.repo.wishItems as never, id, ((x: WishItem) => x.id) as never, ((x: WishItem) => x.title) as never); }
  deleteAdminDoc(id: string) { return this.deleteIn('adminDocs', this.repo.adminDocs as never, id, ((x: AdminDoc) => x.id) as never, ((x: AdminDoc) => x.name) as never); }

  // ---- modules ----------------------------------------------------------------------
  async updateModuleState(m: ModuleState): Promise<void> {
    await this.repo.saveModuleState(m);
    this.patch({ moduleState: m });
  }
  upsertErrand(e: Errand) { return this.putSimple('errands', this.repo.errands, e, (x) => x.id); }
  deleteErrand(id: string) { return this.deleteIn('errands', this.repo.errands as never, id, ((x: Errand) => x.id) as never, ((x: Errand) => x.title) as never); }
  /** Sensitive module: stored locally only. */
  async addCycleEntry(kind: string, o: { date?: string; note?: string } = {}): Promise<CycleEntry> {
    const e: CycleEntry = { id: this.newId('cyc'), date: o.date ?? dayKey(this.today()), kind, note: o.note ?? '' };
    await this.repo.cycleEntries.put(e);
    this.patch({ cycleEntries: [...this.s.cycleEntries, e].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)) });
    return e;
  }
  deleteCycleEntry(id: string) { return this.deleteIn('cycleEntries', this.repo.cycleEntries as never, id, ((x: CycleEntry) => x.id) as never, ((x: CycleEntry) => x.date) as never); }

  /** Closes this week's chapter (one per week) and awards the review Sparks once. */
  async saveWeeklyReview(draft: Omit<WeeklyReviewRecord, 'id' | 'date'>): Promise<SparkAward> {
    const today = this.today();
    const now = this.clock();
    const week = dayKey(startOfWeek(today, this.s.settings.weekStartsOn));
    const record: WeeklyReviewRecord = { ...draft, id: week, date: dayKey(today) };
    await this.repo.weeklyReviews.put(record);
    const reviews = upsertById(this.s.weeklyReviews, record, (x) => x.id).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const task = this.s.weeklyTasks.find((t) => t.isWeeklyReview);
    const end = dayKey(addDays(parseDayKey(week), 6));
    const logged = task != null && this.s.logs.some((l) => l.itemId === task.id && logIsDone(l) && l.date >= week && l.date <= end);
    if (task == null || logged) {
      this.patch({ weeklyReviews: reviews });
      return SPARK_NONE;
    }
    const log = makeLog({
      id: this.newId('log'), itemId: task.id, kind: 'weeklyTask', date: dayKey(today), level: 'normal',
      durationMin: draft.durationSec == null ? null : Math.ceil(draft.durationSec / 60), loggedAt: toIsoLocal(now), minuteOfDay: minuteOfDay(now),
    });
    const award = awardForWeeklyReview({ earnedToday: earnedOn(this.s.sparkTxns, log.date) });
    const txn = txnForAward(award, { id: this.newId('spk'), at: now, reason: 'weeklyReview', refId: log.id, date: log.date });
    await this.repo.logs.put(log);
    if (txn) await this.repo.sparkTxns.put(txn);
    this.patch({ weeklyReviews: reviews, logs: [...this.s.logs, log], sparkTxns: txn ? [...this.s.sparkTxns, txn] : this.s.sparkTxns });
    return award;
  }

  // ---- notifications (planning only; off by default) --------------------------------
  async recordNudgeResponse(itemId: string, response: NudgeResponse): Promise<void> {
    const r = { id: this.newId('nr'), itemId, date: dayKey(this.today()), response };
    await this.repo.nudgeRecords.put(r);
    this.patch({ nudgeRecords: [...this.s.nudgeRecords, r] });
  }

  // ---- data ownership ------------------------------------------------------------------
  exportAll(): Promise<ExportJson> {
    return this.repo.exportAll(this.clock());
  }
  previewImport(data: unknown): Promise<ImportPreview> {
    return this.repo.previewImport(data);
  }
  /** Replaces her data. Requires confirm; returns the automatic backup taken first. */
  async importAll(data: unknown, o: { confirm: boolean }): Promise<BackupInfo> {
    const b = await this.repo.importAll(data, { confirm: o.confirm, now: this.clock() });
    await this.reload();
    return b;
  }
  listBackups(): Promise<BackupInfo[]> {
    return this.repo.listBackups();
  }
  getBackup(id: string): Promise<ExportJson | null> {
    return this.repo.getBackup(id);
  }
  async restoreBackup(id: string): Promise<BackupInfo> {
    const b = await this.repo.restoreBackup(id, this.clock());
    await this.reload();
    return b;
  }
  /** Generic starter habits she may pick in onboarding (from the evidence library; none preselected). */
  async starterHabits(): Promise<Habit[]> {
    return starterHabitOptions(await this.libraryLoader(), this.today(), this.s.settings.language);
  }
  /** Adds the starter habits she picked (skips ones already there). */
  async addStarterHabits(habits: Habit[]): Promise<void> {
    for (const h of habits) {
      if (this.s.habits.some((x) => x.id === h.id)) continue;
      await this.upsertHabit(h, true);
    }
  }

  /** "Delete all data": backs up, wipes and re-seeds the neutral profile. */
  async deleteAllAndReseed(): Promise<BackupInfo> {
    const backup = await this.repo.createBackup('before-delete-all', this.clock());
    await this.repo.deleteAll();
    const library = await this.libraryLoader();
    await this.repo.seed({ library, profile: buildStarterProfile(library, this.today(), this.s.settings.language) }, true);
    await this.repo.markOpened(this.today());
    await this.reload();
    return backup;
  }

  // ---- change log ---------------------------------------------------------------------
  /** Appends one entry (no-op updates skipped) and drops the oldest beyond kMaxChangeLog. */
  private async logChange(op: ChangeOp, entity: ChangeEntity, entityId: string, before: Json | null, after: Json | null, label: string): Promise<void> {
    if (op === 'update' && sameJson(before, after)) return;
    // Note autosave: edits to the same note within a couple of minutes are one change, not dozens.
    if (op === 'update' && entity === 'note') {
      const last = this.s.changeLog[0];
      const now = this.clock().getTime();
      if (
        last && last.entity === 'note' && last.entityId === entityId && (last.op === 'update' || last.op === 'create') &&
        now - new Date(last.at).getTime() < kNoteCoalesceMs
      ) {
        const merged: ChangeEntry = { ...last, at: toIsoLocal(this.clock()), after, label };
        await this.repo.changelog.put(merged);
        this.patch({ changeLog: [merged, ...this.s.changeLog.slice(1)] });
        return;
      }
    }
    const e: ChangeEntry = { id: this.newId('chg'), at: toIsoLocal(this.clock()), op, entity, entityId, label, before, after };
    await this.repo.changelog.put(e);
    let log = [e, ...this.s.changeLog];
    if (log.length > kMaxChangeLog) {
      const drop = sortChanges(log).slice(kMaxChangeLog);
      for (const d of drop) await this.repo.changelog.delete(d.id);
      const dropped = new Set(drop.map((d) => d.id));
      log = log.filter((x) => !dropped.has(x.id));
    }
    this.patch({ changeLog: log });
  }

  /** Logs a create/update of an entity stored under snapshot [key] (ignored for non-logged boxes). */
  private async logEntityChange<T>(key: keyof LifeSnapshot, before: T | null, after: T): Promise<void> {
    const ent = ENTITY_BY_KEY.get(key as string);
    if (!ent) return;
    const inf = ENTITIES[ent];
    await this.logChange(
      before == null ? 'create' : 'update', ent, inf.idOf(after as never),
      before == null ? null : inf.toJson(before as never), inf.toJson(after as never), inf.label(after as never),
    );
  }

  /**
   * Brings back the version an entry recorded: for an edit or delete, the
   * "before" version is put back; for a create, the item is removed. The
   * restore itself is logged (so it can be reversed the same way).
   */
  async restoreChange(entryId: string): Promise<boolean> {
    const entry = this.s.changeLog.find((e) => e.id === entryId);
    if (!entry) return false;
    const inf = ENTITIES[entry.entity];
    const coll = inf.coll(this.repo);
    const list = this.s[inf.key] as unknown as never[];
    const current = list.find((x) => inf.idOf(x) === entry.entityId) ?? null;
    const currentJson = current == null ? null : inf.toJson(current);
    if (entry.before == null) {
      if (current == null) return false;
      await coll.delete(entry.entityId);
      this.patch({ [inf.key]: list.filter((x) => inf.idOf(x) !== entry.entityId) } as unknown as Partial<LifeSnapshot>);
    } else {
      const restored = inf.fromJson(entry.before);
      await coll.put(restored);
      let next = upsertById(list, restored as never, inf.idOf as (x: never) => string) as unknown[];
      if (inf.key === 'notes') next = sortNotes(next as Note[]);
      this.patch({ [inf.key]: next } as unknown as Partial<LifeSnapshot>);
    }
    await this.logChange('restore', entry.entity, entry.entityId, currentJson, entry.before, entry.label);
    return true;
  }

  // ---- notes & decisions ------------------------------------------------------------------
  private async putNote(n: Note, before: Note | null): Promise<void> {
    await this.repo.notes.put(n);
    this.patch({ notes: sortNotes(upsertById(this.s.notes, n, (x) => x.id)) });
    await this.logEntityChange('notes', before, n);
  }

  /** Adds a note (or a decision with `isDecision: true`). Empty title + body is refused (null). */
  async addNote(p: { title?: string; body?: string; links?: NoteLink[]; isDecision?: boolean; pinned?: boolean; tag?: NoteTag }): Promise<Note | null> {
    const title = (p.title ?? '').trim();
    const body = (p.body ?? '').trim();
    if (title === '' && body === '') return null;
    const now = toIsoLocal(this.clock());
    const n = makeNote({
      id: this.newId('note'), createdAt: now, updatedAt: now, title, body, links: cleanLinks(p.links ?? []),
      isDecision: p.isDecision ?? false, pinned: p.pinned ?? false, tag: p.tag ?? 'note',
    });
    await this.putNote(n, null);
    return n;
  }

  /** Updates a note; `undefined` fields are kept. */
  async updateNote(id: string, p: Partial<Pick<Note, 'title' | 'body' | 'links' | 'isDecision' | 'pinned' | 'tag'>>): Promise<Note | null> {
    const cur = this.s.notes.find((x) => x.id === id);
    if (!cur) return null;
    const clean = Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined)) as Partial<Note>;
    const next: Note = {
      ...cur,
      ...clean,
      title: (clean.title ?? cur.title).trim(),
      links: clean.links ? cleanLinks(clean.links) : cur.links,
      updatedAt: toIsoLocal(this.clock()),
    };
    await this.putNote(next, cur);
    return next;
  }
  setNotePinned(id: string, pinned: boolean): Promise<Note | null> {
    return this.updateNote(id, { pinned });
  }
  setNoteDecision(id: string, isDecision: boolean): Promise<Note | null> {
    return this.updateNote(id, { isDecision });
  }
  async linkNote(id: string, link: NoteLink): Promise<Note | null> {
    const cur = this.s.notes.find((x) => x.id === id);
    if (!cur) return null;
    return this.updateNote(id, { links: [...cur.links, link] });
  }
  async unlinkNote(id: string, link: NoteLink): Promise<Note | null> {
    const cur = this.s.notes.find((x) => x.id === id);
    if (!cur) return null;
    return this.updateNote(id, { links: cur.links.filter((l) => !(l.kind === link.kind && l.id === link.id)) });
  }
  /** Deletes a note (undoable within the window; also in the change log). */
  deleteNote(id: string): Promise<UndoToken | null> {
    return this.deleteIn('notes', this.repo.notes as never, id, ((x: Note) => x.id) as never, ((x: Note) => noteDisplayTitle(x)) as never);
  }

  // ---- search ----------------------------------------------------------------------------
  /** Arabic-aware search over tasks, inbox, habits, projects, goals, notes, products, joy. */
  search(query: string, o: SearchOptions = {}): SearchResponse {
    return searchSnapshot(this.s, query, o);
  }

  // ---- sources & import review -------------------------------------------------------------
  private async putSource(src: Source): Promise<void> {
    await this.repo.sources.put(src);
    this.patch({ sources: [src, ...this.s.sources.filter((x) => x.id !== src.id)] });
  }
  private async putBatch(b: ImportBatch): Promise<void> {
    await this.repo.importBatches.put(b);
    this.patch({ importBatches: [b, ...this.s.importBatches.filter((x) => x.id !== b.id)] });
  }
  private batch(batchId: string): ImportBatch | null {
    return this.s.importBatches.find((b) => b.id === batchId) ?? null;
  }
  private reevaluate(b: ImportBatch): ImportBatch {
    const src = this.s.sources.find((x) => x.id === b.sourceId);
    const structured = src?.kind === 'json' || src?.kind === 'csv';
    return { ...b, candidates: evaluateCandidates(b.candidates, buildExistingIndex(this.s), structured) };
  }

  /**
   * Reads a file she picked into a review batch (nothing is added yet). A file we
   * cannot read is recorded as a `failed` source with the Arabic reason.
   */
  async startImport(fileName: string, text: string): Promise<StartImportResult> {
    const now = toIsoLocal(this.clock());
    const sourceId = this.newId('src');
    try {
      const parsed = parseImportFile(fileName, text);
      const source: Source = {
        id: sourceId, fileName, kind: parsed.kind, importedAt: now, itemCount: parsed.candidates.length, addedCount: 0,
        status: 'review', error: null,
      };
      await this.putSource(source);
      const candidates: ImportCandidate[] = parsed.candidates.map((c) => ({
        ...c, id: this.newId('cand'), status: 'suggested', decision: 'pending', edited: false, matches: [],
      }));
      const batch = this.reevaluate({
        id: this.newId('batch'), sourceId, fileName, createdAt: now, candidates, committedAt: null, created: [],
      });
      await this.putBatch(batch);
      return { ok: true, source, batch };
    } catch (e) {
      const isFileError = e instanceof ImportFileError;
      const error = isFileError ? e.message : `«${fileName}» ما قدرنا نقراه.`;
      const source: Source = { id: sourceId, fileName, kind: 'unknown', importedAt: now, itemCount: 0, addedCount: 0, status: 'failed', error };
      await this.putSource(source);
      return { ok: false, source, error, reason: isFileError ? e.reason : 'unsupported' };
    }
  }

  // Writes to one import batch run one after another: each reads the latest batch, so
  // two quick taps (approve + edit) can never overwrite each other.
  private readonly batchLocks = new Map<string, Promise<unknown>>();
  private withBatchLock<T>(batchId: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.batchLocks.get(batchId) ?? Promise.resolve();
    const run = prev.then(fn, fn);
    const tail = run.catch(() => undefined);
    this.batchLocks.set(batchId, tail);
    void tail.then(() => {
      if (this.batchLocks.get(batchId) === tail) this.batchLocks.delete(batchId);
    });
    return run;
  }

  reviewCandidate(batchId: string, candidateId: string, decision: CandidateDecision): Promise<ImportBatch | null> {
    return this.withBatchLock(batchId, () => this.reviewCandidateNow(batchId, candidateId, decision));
  }
  editCandidate(batchId: string, candidateId: string, e: CandidateEdit): Promise<ImportBatch | null> {
    return this.withBatchLock(batchId, () => this.editCandidateNow(batchId, candidateId, e));
  }
  decideAll(batchId: string, decision: CandidateDecision, o: { includeFlagged?: boolean } = {}): Promise<ImportBatch | null> {
    return this.withBatchLock(batchId, () => this.decideAllNow(batchId, decision, o));
  }
  commitImport(batchId: string): Promise<{ added: number; skipped: number; undo: UndoToken | null }> {
    return this.withBatchLock(batchId, () => this.commitImportNow(batchId));
  }
  /**
   * Removes a source row that has nothing left to review (a file that failed to open, or one she
   * discarded) — with undo (QA area 5 #20). Anything else (in review, or already added — its
   * items keep their provenance) is refused (null). Added items are never touched.
   */
  async removeSource(id: string): Promise<UndoToken | null> {
    const src = this.s.sources.find((x) => x.id === id);
    if (!src) return null;
    if (src.status !== 'failed' && src.status !== 'discarded') return null;
    const open = this.s.importBatches.some((b) => b.sourceId === id && b.committedAt == null);
    if (open) return null;
    return this.deleteIn('sources', this.repo.sources as never, id, ((x: Source) => x.id) as never, ((x: Source) => x.fileName) as never);
  }
  discardImport(batchId: string): Promise<boolean> {
    return this.withBatchLock(batchId, () => this.discardImportNow(batchId));
  }

  /** Her decision on one candidate (approve / ignore / back to pending). */
  private async reviewCandidateNow(batchId: string, candidateId: string, decision: CandidateDecision): Promise<ImportBatch | null> {
    const b = this.batch(batchId);
    if (!b || b.committedAt != null) return null;
    const next = { ...b, candidates: b.candidates.map((c) => (c.id === candidateId ? { ...c, decision } : c)) };
    await this.putBatch(next);
    return next;
  }

  /** Edits a candidate before it is added (type, title, body, explicit date/time/domain). */
  private async editCandidateNow(batchId: string, candidateId: string, e: CandidateEdit): Promise<ImportBatch | null> {
    const b = this.batch(batchId);
    if (!b || b.committedAt != null) return null;
    const isoDay = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(`${v}T00:00:00`).getTime());
    const candidates = b.candidates.map((c) => {
      if (c.id !== candidateId) return c;
      const missing = new Set(c.missing);
      const next: ImportCandidate = { ...c, edited: true };
      if (e.type !== undefined) {
        next.type = e.type;
        next.typeExplicit = true;
        missing.delete('type');
      }
      if (e.title !== undefined) {
        next.title = e.title.trim();
        if (next.title !== '') missing.delete('title');
      }
      if (e.body !== undefined) next.body = e.body;
      if (e.url !== undefined) next.url = e.url;
      if (e.date !== undefined) {
        if (e.date == null || isoDay(e.date)) {
          next.date = e.date;
          next.rawDate = null;
          missing.delete('date');
        }
      }
      if (e.time !== undefined) {
        if (e.time == null || /^([01]?\d|2[0-3]):[0-5]\d$/.test(e.time)) {
          next.time = e.time == null ? null : e.time.padStart(5, '0');
          missing.delete('time');
        }
      }
      if (e.domain !== undefined) next.domain = e.domain != null && (DOMAIN_IDS as readonly string[]).includes(e.domain) ? e.domain : null;
      next.missing = [...missing];
      return next;
    });
    const next = this.reevaluate({ ...b, candidates });
    await this.putBatch(next);
    return next;
  }

  /**
   * Bulk decision. `approved` only touches items that are safe (no duplicate,
   * conflict or missing field) unless `includeFlagged`; `ignored`/`pending` apply to all pending ones.
   */
  private async decideAllNow(batchId: string, decision: CandidateDecision, o: { includeFlagged?: boolean } = {}): Promise<ImportBatch | null> {
    const b = this.batch(batchId);
    if (!b || b.committedAt != null) return null;
    const candidates = b.candidates.map((c) => {
      if (decision === 'approved') {
        if (c.decision !== 'pending') return c;
        return o.includeFlagged || isSafeToBulkApprove(c) ? { ...c, decision } : c;
      }
      return c.decision === 'pending' || decision === 'pending' ? { ...c, decision } : c;
    });
    const next = { ...b, candidates };
    await this.putBatch(next);
    return next;
  }

  /**
   * Adds every APPROVED candidate, each linked to its source line (Provenance).
   * Tasks land in the inbox status (no date — the file's date is kept on the
   * provenance + in the notes); projects as ideas; ideas in the inbox; the rest
   * as notes tagged with their type. NOTHING is added to any day plan.
   * Undoable within the window.
   */
  private async commitImportNow(batchId: string): Promise<{ added: number; skipped: number; undo: UndoToken | null }> {
    const b0 = this.batch(batchId);
    if (!b0 || b0.committedAt != null) return { added: 0, skipped: 0, undo: null };
    const b = this.reevaluate(b0);
    const now = toIsoLocal(this.clock());
    const created: { entity: ProvenanceEntity; id: string }[] = [];
    const provs: Provenance[] = [];
    const tasks: TaskItem[] = [];
    const projects: Project[] = [];
    const inbox: InboxItem[] = [];
    const notes: Note[] = [];
    let skipped = 0;
    for (const c of b.candidates) {
      if (c.decision !== 'approved') continue;
      if (c.title.trim() === '') {
        skipped++;
        continue;
      }
      const origin = `من «${c.sourceRef.file}» · ${c.sourceRef.location}`;
      const facts = [
        c.date ? `التاريخ في الملف: ${c.date}` : '',
        c.time ? `الوقت في الملف: ${c.time}` : '',
        c.rawDate ? `التاريخ كما كُتب: ${c.rawDate}` : '',
        c.url && !c.body.includes(c.url) ? c.url : '',
      ].filter((x) => x !== '');
      const body = [c.body, ...facts].filter((x) => x.trim() !== '').join('\n');
      const target = targetOf(c.type);
      let entityId: string;
      if (target === 'task') {
        const t = makeTask({
          id: this.newId('tsk'), title: c.title, createdAt: now, updatedAt: now, status: 'inbox', dueDate: null,
          domain: c.domain, notes: [body, origin].filter((x) => x !== '').join('\n'),
        });
        tasks.push(t);
        entityId = t.id;
      } else if (target === 'project') {
        const p = makeProject({
          id: this.newId('prj'), domain: c.domain ?? 'learning', titleAr: c.title, titleEn: c.title, status: 'idea',
          notes: [body, origin].filter((x) => x !== '').join('\n'), dueDate: null,
        });
        projects.push(p);
        entityId = p.id;
      } else if (target === 'inbox') {
        const it = makeInboxItem({ id: this.newId('inb'), title: c.title, createdAt: now, kind: 'idea', body, url: c.url, source: c.sourceRef.file });
        inbox.push(it);
        entityId = it.id;
      } else {
        const n = makeNote({
          id: this.newId('note'), createdAt: now, updatedAt: now, title: c.title,
          body: [body, origin].filter((x) => x !== '').join('\n'), tag: NOTE_TAG_FOR[c.type] ?? 'note',
        });
        notes.push(n);
        entityId = n.id;
      }
      created.push({ entity: target, id: entityId });
      provs.push({
        id: provenanceId(target, entityId), entity: target, entityId, sourceId: b.sourceId, batchId: b.id, candidateId: c.id,
        sourceRef: c.sourceRef, importedAt: now, originalType: c.type, originalDate: c.date, originalTime: c.time,
      });
    }
    await this.repo.tasks.putAll(tasks);
    await this.repo.projects.putAll(projects);
    await this.repo.inbox.putAll(inbox);
    await this.repo.notes.putAll(notes);
    await this.repo.provenance.putAll(provs);
    const committed: ImportBatch = { ...b, committedAt: now, created };
    await this.repo.importBatches.put(committed);
    const src = this.s.sources.find((x) => x.id === b.sourceId);
    const srcNext: Source | null = src ? { ...src, status: 'committed', addedCount: created.length } : null;
    if (srcNext) await this.repo.sources.put(srcNext);
    this.patch({
      tasks: [...this.s.tasks, ...tasks],
      projects: [...this.s.projects, ...projects],
      inbox: [...this.s.inbox, ...inbox],
      notes: sortNotes([...this.s.notes, ...notes]),
      provenance: [...this.s.provenance, ...provs],
      importBatches: [committed, ...this.s.importBatches.filter((x) => x.id !== b.id)],
      sources: srcNext ? [srcNext, ...this.s.sources.filter((x) => x.id !== srcNext.id)] : this.s.sources,
    });
    if (created.length === 0) return { added: 0, skipped, undo: null };
    const undo = this.remember(`${created.length} من «${b.fileName}»`, async () => {
      const ids = (e: ProvenanceEntity) => new Set(created.filter((c) => c.entity === e).map((c) => c.id));
      const [tIds, pIds, iIds, nIds] = [ids('task'), ids('project'), ids('inbox'), ids('note')];
      for (const id of tIds) await this.repo.tasks.delete(id);
      for (const id of pIds) await this.repo.projects.delete(id);
      for (const id of iIds) await this.repo.inbox.delete(id);
      for (const id of nIds) await this.repo.notes.delete(id);
      const provIds = new Set(provs.map((p) => p.id));
      for (const id of provIds) await this.repo.provenance.delete(id);
      const reopened: ImportBatch = { ...committed, committedAt: null, created: [] };
      await this.repo.importBatches.put(reopened);
      const s0 = this.s.sources.find((x) => x.id === b.sourceId);
      const sReopen: Source | null = s0 ? { ...s0, status: 'review', addedCount: 0 } : null;
      if (sReopen) await this.repo.sources.put(sReopen);
      this.patch({
        tasks: this.s.tasks.filter((x) => !tIds.has(x.id)),
        projects: this.s.projects.filter((x) => !pIds.has(x.id)),
        inbox: this.s.inbox.filter((x) => !iIds.has(x.id)),
        notes: this.s.notes.filter((x) => !nIds.has(x.id)),
        provenance: this.s.provenance.filter((x) => !provIds.has(x.id)),
        importBatches: [reopened, ...this.s.importBatches.filter((x) => x.id !== b.id)],
        sources: sReopen ? [sReopen, ...this.s.sources.filter((x) => x.id !== sReopen.id)] : this.s.sources,
      });
    });
    return { added: created.length, skipped, undo };
  }

  /** Drops a batch she does not want (nothing added; the source stays listed as «تجاهلتيها»). */
  private async discardImportNow(batchId: string): Promise<boolean> {
    const b = this.batch(batchId);
    if (!b || b.committedAt != null) return false;
    const src = this.s.sources.find((x) => x.id === b.sourceId);
    if (src) await this.putSource({ ...src, status: 'discarded' });
    await this.repo.importBatches.delete(batchId);
    this.patch({ importBatches: this.s.importBatches.filter((x) => x.id !== batchId) });
    return true;
  }

  /** Arabic label of a candidate type (for toasts/copy). */
  candidateTypeLabel(t: CandidateType): string {
    return CANDIDATE_TYPE_LABELS[t];
  }

  /** Convenience: the Today read-model for now. */
  todayView() {
    return todayView(this.s, this.today());
  }
}

/** Creates and loads the store (see LifeStore.create). */
export const createLifeStore = (o: StoreOptions = {}): Promise<LifeStore> => LifeStore.create(o);

export type { Json };
