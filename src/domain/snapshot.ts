/**
 * Everything the app shows, loaded once from the repository and kept in
 * memory (port of `state/life_snapshot.dart`). Mutations go through LifeStore.
 */
import { cmpNum, cmpStr } from './core/dates';
import type {
  Action, AdminDoc, Bill, BnplItem, CycleEntry, DayPlan, Domain, DrivingSession, EnergyCheck, EngineRule,
  Errand, Experiment, FixedEvent, Goal, Habit, InboxItem, JoyItem, LogEntry, MockTest, ModuleState, MoneyEnvelope,
  NudgeRecord, PlanItem, Product, Project, Routine, Season, Settings, SparkTxn, StrengthCheck, TaskItem, VocabCard,
  WeeklyReviewRecord, WeeklyTask, WishItem,
} from './models';
import { seasonIsCurrent } from './models';
import { sortChanges, type ChangeEntry } from './features/changelog';
import { sortNotes, type Note } from './features/notes';
import type { ImportBatch, Provenance, Source } from './features/sources';
import type { LifeRepository } from './storage';

export interface LifeSnapshot {
  readonly settings: Settings;
  readonly actions: Action[];
  readonly engineRules: EngineRule[];
  readonly domains: Domain[];
  readonly seasons: Season[];
  readonly habits: Habit[];
  readonly routines: Routine[];
  readonly weeklyTasks: WeeklyTask[];
  readonly projects: Project[];
  readonly goals: Goal[];
  readonly logs: LogEntry[];
  /** Accepted day plans (suggestion mode). */
  readonly dayPlans: DayPlan[];
  readonly energyChecks: EnergyCheck[];
  readonly strengthChecks: StrengthCheck[];
  readonly joyItems: JoyItem[];
  readonly sparkTxns: SparkTxn[];
  readonly experiments: Experiment[];
  readonly vocabCards: VocabCard[];
  readonly mockTests: MockTest[];
  readonly drivingSessions: DrivingSession[];
  readonly moneyEnvelopes: MoneyEnvelope[];
  readonly bills: Bill[];
  readonly bnplItems: BnplItem[];
  readonly wishItems: WishItem[];
  readonly adminDocs: AdminDoc[];
  readonly fixedEvents: FixedEvent[];
  readonly nudgeRecords: NudgeRecord[];
  readonly errands: Errand[];
  /** Newest first. */
  readonly cycleEntries: CycleEntry[];
  /** Oldest first (chapter n = index + 1). */
  readonly weeklyReviews: WeeklyReviewRecord[];
  readonly tasks: TaskItem[];
  readonly inbox: InboxItem[];
  readonly products: Product[];
  /** Plan items she moved to «بعدين». */
  readonly later: PlanItem[];
  /** Notes & decisions (pinned first, newest first). */
  readonly notes: Note[];
  /** Change log, newest first (capped). */
  readonly changeLog: ChangeEntry[];
  /** Imported files, newest first. */
  readonly sources: Source[];
  /** Import review batches, newest first. */
  readonly importBatches: ImportBatch[];
  /** Imported item → its source line. */
  readonly provenance: Provenance[];
  readonly moduleState: ModuleState;
  readonly openedDays: Set<string>;
  readonly firstRunDate: string | null;
  /** False when running on the in-memory fallback (data is not saved). */
  readonly persistent: boolean;
}

/**
 * The aquarium module was retired (owner decision): its domain stays in the
 * enum and in stored/exported data for compatibility, but it is switched off
 * once and hidden from every view. Nothing is deleted.
 */
export const RETIRED_DOMAINS: ReadonlySet<string> = new Set(['aquarium']);
const isRetiredAction = (a: { pillar?: string; area?: string }): boolean => (a.area ?? '').toLowerCase() === 'aquarium';

async function retireAquarium(r: LifeRepository): Promise<void> {
  for (const d of await r.domains.all()) {
    if (RETIRED_DOMAINS.has(d.id) && d.enabled) await r.domains.put({ ...d, enabled: false });
  }
}

export async function loadSnapshot(r: LifeRepository): Promise<LifeSnapshot> {
  const bySort = <T extends { sortOrder: number }>(l: T[]) => [...l].sort((a, b) => cmpNum(a.sortOrder, b.sortOrder));
  await retireAquarium(r);
  const settings = await r.loadSettings();
  return {
    settings: settings.aquariumModule ? { ...settings, aquariumModule: false } : settings,
    actions: (await r.actions.all()).filter((a) => !isRetiredAction(a)),
    engineRules: await r.engineRules.all(),
    domains: bySort(await r.domains.all()).filter((d) => !RETIRED_DOMAINS.has(d.id)),
    seasons: await r.seasons.all(),
    habits: bySort(await r.habits.all()).filter((h) => !RETIRED_DOMAINS.has(h.domain)),
    routines: await r.routines.all(),
    weeklyTasks: await r.weeklyTasks.all(),
    projects: await r.projects.all(),
    goals: bySort(await r.goals.all()),
    logs: await r.logs.all(),
    dayPlans: await r.dayPlans.all(),
    energyChecks: await r.energyChecks.all(),
    strengthChecks: await r.strengthChecks.all(),
    joyItems: await r.joyItems.all(),
    sparkTxns: await r.sparkTxns.all(),
    experiments: await r.experiments.all(),
    vocabCards: await r.vocabCards.all(),
    mockTests: await r.mockTests.all(),
    drivingSessions: await r.drivingSessions.all(),
    moneyEnvelopes: await r.moneyEnvelopes.all(),
    bills: await r.bills.all(),
    bnplItems: await r.bnplItems.all(),
    wishItems: await r.wishItems.all(),
    adminDocs: await r.adminDocs.all(),
    fixedEvents: await r.fixedEvents.all(),
    nudgeRecords: await r.nudgeRecords.all(),
    errands: await r.errands.all(),
    cycleEntries: (await r.cycleEntries.all()).sort((a, b) => cmpStr(b.date, a.date)),
    weeklyReviews: (await r.weeklyReviews.all()).sort((a, b) => cmpStr(a.id, b.id)),
    tasks: await r.tasks.all(),
    inbox: await r.inbox.all(),
    products: await r.products.all(),
    later: await r.later.all(),
    notes: sortNotes(await r.notes.all()),
    changeLog: sortChanges(await r.changelog.all()),
    sources: (await r.sources.all()).sort((a, b) => cmpStr(b.importedAt, a.importedAt) || cmpStr(b.id, a.id)),
    importBatches: (await r.importBatches.all()).sort((a, b) => cmpStr(b.createdAt, a.createdAt) || cmpStr(b.id, a.id)),
    provenance: await r.provenance.all(),
    moduleState: await r.loadModuleState(),
    openedDays: await r.openedDays(),
    firstRunDate: await r.firstRunDate(),
    persistent: r.persistent,
  };
}

export const snapshotHabit = (s: LifeSnapshot, id: string): Habit | null => s.habits.find((h) => h.id === id) ?? null;
export const snapshotAction = (s: LifeSnapshot, id: string): Action | null => s.actions.find((a) => a.actionId === id) ?? null;
export const currentSeason = (s: LifeSnapshot): Season | null => s.seasons.find(seasonIsCurrent) ?? null;

/** Replaces (by id) or appends [item]. */
export function upsertById<T>(list: readonly T[], item: T, id: (t: T) => string): T[] {
  const out = [...list];
  const i = out.findIndex((e) => id(e) === id(item));
  if (i >= 0) out[i] = item;
  else out.push(item);
  return out;
}
