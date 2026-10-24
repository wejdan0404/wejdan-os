/**
 * Day Planner (spec §5.1) — pure, deterministic, explainable.
 * Faithful port of `engine/day_planner.dart` (`planDay` = legacy AUTO mode),
 * plus the web SUGGESTION mode (`suggestDay`), the owner-approved default:
 *
 * - The engine never fills, trims or defers her day by itself. `suggestDay`
 *   returns every candidate as a Suggestion — including what the auto plan
 *   would have trimmed to minimum (`autoLevel`) or left out (`fit` =
 *   'overCap' | 'overBudget' | 'redRest'), each with its reason, so nothing
 *   is hidden and every choice is reversible.
 * - The stored DayPlan holds only items she ACCEPTED; `deferred` = items she
 *   moved to «بعدين» herself (see store).
 * - `dayLoad` gives a gentle busy-day notice; it never moves anything.
 */
import {
  clamp,
  cmpNum,
  cmpStr,
  dateOnly,
  dayKey,
  daysBetween,
  mkDate,
  mod,
  startOfWeek,
  weekday,
  FRIDAY,
  MONDAY,
  SATURDAY,
  SUNDAY,
  THURSDAY,
  TUESDAY,
  WEDNESDAY,
} from '../core/dates';
import type {
  CompletionLevel,
  DayPlan,
  Domain,
  DomainId,
  DomainState,
  EnergyMode,
  FixedEvent,
  Habit,
  IeltsSkill,
  JoyItem,
  LocalizedText,
  LogEntry,
  MockTest,
  PlanItem,
  PlanSection,
  PlanTier,
  Priority,
  Project,
  Routine,
  Settings,
  VocabCard,
  WeeklyTask,
  WhyToday,
} from '../models';
import {
  fixedEventOccursOn,
  isPlannedOn,
  logIsDone,
  makePlanItem,
  mockWeakest,
  priorityIndex,
  projectNextStep,
  settingsBudgetFor,
} from '../models';
import { AnchorResolver } from './anchors';
import { median } from './history';
import { isComebackCompletion } from './recovery';
import { dueCount } from './vocabSrs';
import { buildWhy, ieltsSkillName, numText, weekdayName } from './whyToday';

export const kMaxCore = 3;
export const kMaxCoreYellow = 2;
export const kMaxMaintain = 2;
export const kRedEssentials = 3;
export const kBufferFactor = 0.7;
export const kLearnSamples = 5;
export const kIeltsRotationActionId = 'GROW-07';

/** Everything the planner needs (pass ≥ 28 days of logs). */
export interface PlannerInput {
  date: Date;
  energy?: EnergyMode;
  settings: Settings;
  domains: Domain[];
  habits?: Habit[];
  routines?: Routine[];
  weeklyTasks?: WeeklyTask[];
  projects?: Project[];
  joyItems?: JoyItem[];
  logs?: LogEntry[];
  vocabCards?: VocabCard[];
  fixedEvents?: FixedEvent[];
  mockTests?: MockTest[];
  resolver?: AnchorResolver | null;
  /**
   * Suggestion mode: habits (and routine steps) she explicitly activated are suggested even when
   * their life area is resting this season — offered at maintain tier, never forced onto her day.
   * The legacy auto plan leaves this off (Dart parity).
   */
  includeRestHabits?: boolean;
  /** habitId → day keys she deliberately moved/declined (not misses for comeback detection). */
  excusedDays?: ReadonlyMap<string, ReadonlySet<string>>;
}

/** IELTS skill of the day (GROW-12). */
export function rotationSkill(wd: number, weakest: IeltsSkill = 'writing'): IeltsSkill {
  switch (wd) {
    case SATURDAY: return 'reading';
    case SUNDAY: return 'listening';
    case MONDAY: return 'writing';
    case TUESDAY: return 'speaking';
    case WEDNESDAY: return 'mixedReadingListening';
    case THURSDAY: return weakest;
    default: return 'lightReview';
  }
}
void FRIDAY;

/** Median of her last [kLearnSamples] logged durations for [itemId] at [level]; [fallback] if none. */
export function learnedMinutes(logs: LogEntry[], itemId: string, level: CompletionLevel, fallback: number): number {
  const samples = logs
    .filter((l) => l.itemId === itemId && l.level === level && l.durationMin != null && l.durationMin > 0)
    .sort((a, b) => cmpStr(b.date, a.date));
  const m = median(samples.slice(0, kLearnSamples).map((l) => l.durationMin as number));
  return m == null ? fallback : Math.round(m);
}

/** Legacy AUTO plan. Pure and deterministic for identical inputs. */
export function planDay(input: PlannerInput): DayPlan {
  return new Planner(input).build();
}

// ---------------------------------------------------------------------------

interface Candidate {
  item: PlanItem;
  normalMin: number;
  minimumMin: number;
  kindOrder: number;
  priority: Priority;
  sortOrder: number;
  essential: boolean;
  fromWeekly: WeeklyTask | null;
}
const minutesFor = (c: Candidate, l: CompletionLevel): number => (l === 'minimum' ? c.minimumMin : c.normalMin);

type OverflowReason = 'overCap' | 'overBudget' | 'redRest';

class Planner {
  readonly input: Required<Omit<PlannerInput, 'resolver'>> & { resolver: AnchorResolver };
  readonly day: Date;
  readonly key: string;
  private readonly domainsById: Map<DomainId, Domain>;
  private readonly doneToday: Set<string>;
  private readonly chainedHabitIds: Set<string>;
  /** Diagnostics recorded by build() for suggestion mode. */
  readonly overflow = new Map<string, OverflowReason>();
  readonly trimmed = new Set<string>();
  all: { chains: Candidate[]; core: Candidate[]; maintain: Candidate[]; system: Candidate[]; joy: PlanItem | null; strip: PlanItem[] } | null = null;

  constructor(i: PlannerInput) {
    this.input = {
      date: i.date,
      energy: i.energy ?? 'green',
      settings: i.settings,
      domains: i.domains,
      habits: i.habits ?? [],
      routines: i.routines ?? [],
      weeklyTasks: i.weeklyTasks ?? [],
      projects: i.projects ?? [],
      joyItems: i.joyItems ?? [],
      logs: i.logs ?? [],
      vocabCards: i.vocabCards ?? [],
      fixedEvents: i.fixedEvents ?? [],
      mockTests: i.mockTests ?? [],
      resolver: i.resolver ?? AnchorResolver.fromSettings(i.settings),
      includeRestHabits: i.includeRestHabits ?? false,
      excusedDays: i.excusedDays ?? new Map(),
    };
    this.day = dateOnly(i.date);
    this.key = dayKey(i.date);
    this.domainsById = new Map(this.input.domains.map((d) => [d.id, d]));
    this.doneToday = new Set(this.input.logs.filter((l) => l.date === this.key && logIsDone(l)).map((l) => l.itemId));
    this.chainedHabitIds = new Set(
      this.input.routines.filter((r) => r.active).flatMap((r) => r.steps.filter((s) => s.habitId != null).map((s) => s.habitId as string)),
    );
  }

  private get resolver(): AnchorResolver {
    return this.input.resolver;
  }
  private isDoneToday(c: Candidate): boolean {
    return this.doneToday.has(c.item.itemId);
  }
  stateOf(id: DomainId): DomainState {
    const d = this.domainsById.get(id);
    if (d == null || !d.enabled) return 'rest';
    return d.state;
  }
  /** Domain state as seen by her own habits/routine steps: a resting (but enabled) area still offers what she activated. */
  habitStateOf(id: DomainId): DomainState {
    const st = this.stateOf(id);
    if (st !== 'rest' || !this.input.includeRestHabits) return st;
    const d = this.domainsById.get(id);
    return d != null && d.enabled ? 'maintain' : 'rest';
  }
  domainName(id: DomainId): LocalizedText {
    const d = this.domainsById.get(id);
    return d == null ? { ar: id, en: id } : { ar: d.nameAr, en: d.nameEn };
  }
  get isRed(): boolean {
    return this.input.energy === 'red';
  }
  get isYellow(): boolean {
    return this.input.energy === 'yellow';
  }
  posInWeek(wd: number): number {
    return mod(wd - this.input.settings.weekStartsOn, 7);
  }
  get weekStart(): Date {
    return startOfWeek(this.day, this.input.settings.weekStartsOn);
  }
  doneThisWeekBeforeToday(itemId: string): number {
    const from = dayKey(this.weekStart);
    const days = new Set<string>();
    for (const l of this.input.logs) {
      if (l.itemId === itemId && logIsDone(l) && cmpStr(l.date, from) >= 0 && cmpStr(l.date, this.key) < 0) days.add(l.date);
    }
    return days.size;
  }
  shiftOutOfEvents(minute: number): number {
    let m = minute;
    for (const e of this.input.fixedEvents) {
      if (fixedEventOccursOn(e, this.day, this.key) && m >= e.startMinute && m < e.endMinute) m = e.endMinute;
    }
    return clamp(m, 0, 1439);
  }
  baseSuggested(core: boolean, shrunk: boolean): CompletionLevel {
    if (shrunk || this.isRed) return 'minimum';
    if (this.isYellow && !core) return 'minimum';
    return 'normal';
  }

  // ---- chains --------------------------------------------------------------
  chainCandidates(): Candidate[] {
    const out: Candidate[] = [];
    const habitsById = new Map(this.input.habits.map((h) => [h.id, h]));
    const wd = weekday(this.day);
    const routines = this.input.routines.filter((r) => r.active && r.weekdays.includes(wd)).sort((a, b) => cmpStr(a.id, b.id));
    for (const r of routines) {
      let cursor = this.shiftOutOfEvents(this.resolver.resolve(r.anchor, this.day));
      const routineName = { ar: r.titleAr, en: r.titleEn };
      for (const s of r.steps) {
        const h = s.habitId == null ? null : habitsById.get(s.habitId) ?? null;
        if (s.habitId != null && (h == null || h.status !== 'active' || !isPlannedOn(h.schedule, this.day))) continue;
        const domain = h?.domain ?? s.domain;
        if (this.habitStateOf(domain) === 'rest') continue;
        const itemId = h?.id ?? s.id;
        const kind = h != null ? 'habit' : 'routineStep';
        const suggested = this.baseSuggested(false, h?.shrunkToMinimum ?? false);
        const normalMin = learnedMinutes(this.input.logs, itemId, 'normal', h?.durationMin ?? s.durationMin);
        const minMin = learnedMinutes(this.input.logs, itemId, 'minimum', h?.minimumDurationMin ?? s.minimumDurationMin);
        const est = suggested === 'minimum' ? minMin : normalMin;
        const item = makePlanItem({
          id: `${kind}:${itemId}`,
          itemId,
          kind,
          tier: 'chain',
          section: r.section,
          title: h != null ? { ar: h.titleAr, en: h.titleEn } : { ar: s.titleAr, en: s.titleEn },
          domain,
          why: buildWhy('chainStep', { routine: routineName }),
          extraWhy: this.isYellow ? [buildWhy('yellowMinimum')] : [],
          minimumText: h?.minimumText ?? s.minimumText,
          normalText: h?.normalText ?? s.normalText,
          bonusText: h?.bonusText ?? '',
          suggestedLevel: suggested,
          startMinute: cursor,
          estimatedMin: est,
          actionId: h?.actionId ?? s.actionId,
          routineId: r.id,
        });
        cursor = clamp(cursor + (est < 1 ? 1 : est), 0, 1439);
        out.push({
          item,
          normalMin,
          minimumMin: minMin,
          kindOrder: 0,
          priority: h?.priority ?? 'core',
          sortOrder: out.length,
          essential: (h?.essential ?? false) || s.essential,
          fromWeekly: null,
        });
      }
    }
    return out;
  }

  // ---- standalone habits ---------------------------------------------------
  standaloneHabitsToday(): Habit[] {
    const planned = this.input.habits
      .filter((h) => h.status === 'active' && h.routineId == null && !this.chainedHabitIds.has(h.id))
      .filter((h) => isPlannedOn(h.schedule, this.day))
      .filter((h) => this.habitStateOf(h.domain) !== 'rest');
    const groups = new Map<string, Habit[]>();
    const out: Habit[] = [];
    for (const h of planned) {
      if (h.alternationGroup == null) out.push(h);
      else {
        const g = groups.get(h.alternationGroup) ?? [];
        g.push(h);
        groups.set(h.alternationGroup, g);
      }
    }
    for (const members of groups.values()) {
      members.sort((a, b) => cmpNum(this.weekRatio(a), this.weekRatio(b)) || cmpNum(a.sortOrder, b.sortOrder) || cmpStr(a.id, b.id));
      out.push(members[0]!);
    }
    return out;
  }
  plannedDaysPerWeek(h: Habit): number {
    return new Set(h.schedule.weekdays).size;
  }
  weekRatio(h: Habit): number {
    const target = this.plannedDaysPerWeek(h);
    if (target === 0) return 1;
    return this.doneThisWeekBeforeToday(h.id) / target;
  }
  hasGroupPartner(h: Habit): boolean {
    return h.alternationGroup != null && this.input.habits.some((o) => o.id !== h.id && o.status === 'active' && o.alternationGroup === h.alternationGroup);
  }
  latestWeakest(): IeltsSkill | null {
    if (this.input.mockTests.length === 0) return null;
    const sorted = [...this.input.mockTests].sort((a, b) => cmpStr(b.date, a.date));
    return mockWeakest(sorted[0]!);
  }
  bundleFor(habitId: string): JoyItem | null {
    const list = this.input.joyItems
      .filter((j) => j.active && j.kind === 'bundled' && j.bundledHabitId === habitId)
      .sort((a, b) => cmpStr(a.id, b.id));
    return list[0] ?? null;
  }

  habitCandidate(h: Habit, core: boolean): Candidate {
    const comeback = isComebackCompletion(h, this.input.logs, this.day, this.input.excusedDays.get(h.id));
    let suggested = this.baseSuggested(core, h.shrunkToMinimum);
    const reasons: WhyToday[] = [];
    let skill: IeltsSkill | null = null;
    if (h.actionId === kIeltsRotationActionId) {
      // Only the skill she confirmed (settings) decides the extra day — a new mock never switches
      // it silently; the IELTS screen asks first (QA area 3 #4).
      const weakest = this.input.settings.ieltsWeakestSkill;
      const due = dueCount(this.input.vocabCards, this.day);
      if (!this.isRed) {
        skill = rotationSkill(weekday(this.day), weakest);
        reasons.push(buildWhy('ieltsRotation', { skill: ieltsSkillName(skill) }));
      }
      if (due > 0) reasons.push(buildWhy('vocabDue', { count: numText(due) }));
    }
    if (h.alternationGroup != null && this.hasGroupPartner(h)) {
      if (h.actionId === 'BODY-05') {
        reasons.push(
          buildWhy('strengthDay', {
            n: numText(this.doneThisWeekBeforeToday(h.id) + 1),
            total: numText(this.plannedDaysPerWeek(h)),
          }),
        );
      } else {
        reasons.push(buildWhy('walkDay'));
      }
    }
    if (reasons.length === 0) reasons.push(buildWhy(core ? 'growFocus' : 'maintainLight', { domain: this.domainName(h.domain) }));
    if (comeback) reasons.unshift(buildWhy('comeback'));
    if (this.isYellow && !core) reasons.push(buildWhy('yellowMinimum'));
    if (this.isRed) suggested = 'minimum';
    const normalMin = learnedMinutes(this.input.logs, h.id, 'normal', h.durationMin);
    const minMin = learnedMinutes(this.input.logs, h.id, 'minimum', h.minimumDurationMin);
    const bundle = this.bundleFor(h.id);
    // The IELTS plan reads as IELTS on Today, with the day's skill (QA area 3 #11).
    const title =
      h.actionId === kIeltsRotationActionId
        ? skill
          ? { ar: `IELTS — مفردات + ${ieltsSkillName(skill).ar}`, en: `IELTS — vocab + ${ieltsSkillName(skill).en}` }
          : { ar: 'IELTS — مفردات', en: 'IELTS — vocab' }
        : { ar: h.titleAr, en: h.titleEn };
    return {
      item: makePlanItem({
        id: `habit:${h.id}`,
        itemId: h.id,
        kind: 'habit',
        tier: core ? 'core' : 'maintain',
        section: 'day',
        title,
        domain: h.domain,
        why: reasons[0]!,
        extraWhy: reasons.slice(1),
        minimumText: h.minimumText,
        normalText: h.normalText,
        bonusText: h.bonusText,
        suggestedLevel: suggested,
        startMinute: this.shiftOutOfEvents(this.resolver.resolve(h.schedule.anchor, this.day)),
        estimatedMin: suggested === 'minimum' ? minMin : normalMin,
        actionId: h.actionId,
        bundleJoyId: bundle?.id ?? null,
        bundleTitle: bundle == null ? null : { ar: bundle.titleAr, en: bundle.titleEn },
        ieltsSkill: skill,
        isComeback: comeback,
      }),
      normalMin,
      minimumMin: minMin,
      kindOrder: 0,
      priority: h.priority,
      sortOrder: h.sortOrder,
      essential: h.essential,
      fromWeekly: null,
    };
  }

  // ---- weekly tasks --------------------------------------------------------
  weeklyCandidates(): [Candidate[], PlanItem[]] {
    const dueToday: Candidate[] = [];
    const strip: PlanItem[] = [];
    const wd = weekday(this.day);
    const tasks = this.input.weeklyTasks.filter((t) => t.active).sort((a, b) => cmpNum(a.sortOrder, b.sortOrder) || cmpStr(a.id, b.id));
    for (const t of tasks) {
      const state = this.stateOf(t.domain);
      const visible = t.isWeeklyReview || state !== 'rest' || t.pinned;
      if (!visible) continue;
      const remaining = t.timesPerWeek - this.doneThisWeekBeforeToday(t.id);
      if (remaining <= 0) continue;
      const todayPos = this.posInWeek(wd);
      const preferredToday = t.preferredWeekdays.includes(wd);
      const passed = t.preferredWeekdays.filter((w) => this.posInWeek(w) < todayPos).sort((a, b) => cmpNum(this.posInWeek(a), this.posInWeek(b)));
      const tier: PlanTier = t.isWeeklyReview ? 'system' : state === 'grow' ? 'core' : 'maintain';
      const core = tier === 'core';
      const suggested = this.baseSuggested(core || tier === 'system', false);
      const normalMin = learnedMinutes(this.input.logs, t.id, 'normal', t.durationMin);
      const minMin = learnedMinutes(this.input.logs, t.id, 'minimum', t.minimumDurationMin);
      const make = (why: WhyToday): PlanItem =>
        makePlanItem({
          id: `weeklyTask:${t.id}`,
          itemId: t.id,
          kind: 'weeklyTask',
          tier,
          section: 'day',
          title: { ar: t.titleAr, en: t.titleEn },
          domain: t.domain,
          why,
          extraWhy: this.isYellow && !core && tier !== 'system' ? [buildWhy('yellowMinimum')] : [],
          minimumText: t.minimumText,
          normalText: t.normalText,
          suggestedLevel: suggested,
          startMinute: this.shiftOutOfEvents(this.resolver.resolve(t.anchor, this.day)),
          estimatedMin: suggested === 'minimum' ? minMin : normalMin,
          actionId: t.actionId,
        });
      if (preferredToday) {
        dueToday.push({
          item: make(buildWhy(t.isWeeklyReview ? 'weeklyReview' : 'weeklyDue')),
          normalMin,
          minimumMin: minMin,
          kindOrder: 1,
          priority: 'core',
          sortOrder: t.sortOrder,
          essential: false,
          fromWeekly: t,
        });
      } else if (t.preferredWeekdays.length === 0) {
        strip.push(make(buildWhy('weeklyDue')));
      } else if (passed.length > 0) {
        strip.push(make(buildWhy('weeklyCarried', { day: weekdayName(passed[0]!) })));
      }
    }
    return [dueToday, strip];
  }

  // ---- projects ------------------------------------------------------------
  projectCandidates(): Candidate[] {
    const out: Candidate[] = [];
    const active = this.input.projects.filter((p) => p.status === 'active').sort((a, b) => cmpNum(a.sortOrder, b.sortOrder) || cmpStr(a.id, b.id));
    for (const p of active) {
      const state = this.stateOf(p.domain);
      if (state === 'rest') continue;
      const step = projectNextStep(p);
      if (step == null) continue;
      const core = state === 'grow';
      const suggested = this.baseSuggested(core, false);
      const est = learnedMinutes(this.input.logs, step.id, 'normal', step.durationMin);
      out.push({
        item: makePlanItem({
          id: `projectStep:${step.id}`,
          itemId: step.id,
          kind: 'projectStep',
          tier: core ? 'core' : 'maintain',
          section: 'day',
          title: { ar: step.titleAr, en: step.titleEn },
          domain: p.domain,
          why: buildWhy('projectNext', { project: { ar: p.titleAr, en: p.titleEn } }),
          suggestedLevel: suggested,
          startMinute: this.shiftOutOfEvents(this.resolver.slotMinute('midday')),
          estimatedMin: est,
          actionId: step.actionId,
          routineId: p.id,
        }),
        normalMin: est,
        minimumMin: Math.ceil(est / 2),
        kindOrder: 2,
        priority: 'recommended',
        sortOrder: p.sortOrder,
        essential: false,
        fromWeekly: null,
      });
    }
    return out;
  }

  // ---- ranking -------------------------------------------------------------
  compareWith(a: Candidate, b: Candidate, maintain: boolean): number {
    const da = this.isDoneToday(a) ? 0 : 1;
    const db = this.isDoneToday(b) ? 0 : 1;
    if (da !== db) return cmpNum(da, db);
    const ca = a.item.isComeback ? 0 : 1;
    const cb = b.item.isComeback ? 0 : 1;
    if (ca !== cb) return cmpNum(ca, cb);
    if (a.kindOrder !== b.kindOrder) {
      const k = (o: number) => (maintain ? (o === 0 ? 3 : o) : o);
      return cmpNum(k(a.kindOrder), k(b.kindOrder));
    }
    if (a.priority !== b.priority) return cmpNum(priorityIndex(a.priority), priorityIndex(b.priority));
    if (a.sortOrder !== b.sortOrder) return cmpNum(a.sortOrder, b.sortOrder);
    return cmpStr(a.item.id, b.item.id);
  }

  // ---- joy -----------------------------------------------------------------
  freeJoy(): PlanItem | null {
    const free = this.input.joyItems.filter((j) => j.active && j.kind === 'free').sort((a, b) => cmpStr(a.id, b.id));
    if (free.length === 0) return null;
    const idx = mod(daysBetween(mkDate(2000, 1, 1), this.day), free.length);
    const j = free[idx]!;
    return makePlanItem({
      id: `joy:${j.id}`,
      itemId: j.id,
      kind: 'joy',
      tier: 'joy',
      section: 'day',
      title: { ar: j.titleAr, en: j.titleEn },
      domain: 'joy',
      why: buildWhy('freeJoy'),
      suggestedLevel: 'minimum',
    });
  }

  // ---- build ---------------------------------------------------------------
  collect() {
    if (this.all) return this.all;
    const chains = this.chainCandidates();
    const standalone = this.standaloneHabitsToday();
    const coreHabits = standalone.filter((h) => this.habitStateOf(h.domain) === 'grow').map((h) => this.habitCandidate(h, true));
    const maintainHabits = standalone.filter((h) => this.habitStateOf(h.domain) === 'maintain').map((h) => this.habitCandidate(h, false));
    const [weeklyToday, strip] = this.weeklyCandidates();
    const projects = this.projectCandidates();
    const core = [
      ...coreHabits,
      ...weeklyToday.filter((c) => c.item.tier === 'core'),
      ...projects.filter((c) => c.item.tier === 'core'),
    ].sort((a, b) => this.compareWith(a, b, false));
    const maintain = [
      ...maintainHabits,
      ...weeklyToday.filter((c) => c.item.tier === 'maintain'),
      ...projects.filter((c) => c.item.tier === 'maintain'),
    ].sort((a, b) => this.compareWith(a, b, true));
    const system = weeklyToday.filter((c) => c.item.tier === 'system').sort((a, b) => this.compareWith(a, b, false));
    this.all = { chains, core, maintain, system, joy: this.freeJoy(), strip };
    return this.all;
  }

  build(): DayPlan {
    const budget = settingsBudgetFor(this.input.settings, this.day);
    const usable = Math.floor(budget * kBufferFactor);
    const { chains, core: coreCands, maintain: maintainCands, system: systemCands, joy, strip } = this.collect();

    if (this.isRed) return this.buildRed(budget, usable, chains, coreCands, maintainCands, joy);

    const items: PlanItem[] = chains.map((c) => c.item);
    const deferred: PlanItem[] = [];
    const stripOut: PlanItem[] = [...strip];
    let planned = 0;

    const timeTrimmed = (c: Candidate): PlanItem => {
      this.trimmed.add(c.item.id);
      return { ...c.item, suggestedLevel: 'minimum', estimatedMin: c.minimumMin, extraWhy: [...c.item.extraWhy, buildWhy('timeTrimmed')] };
    };
    const place = (c: Candidate): boolean => {
      const lvl = c.item.suggestedLevel;
      const est = minutesFor(c, lvl);
      if (this.isDoneToday(c) || planned + est <= usable) {
        planned += est;
        items.push({ ...c.item, estimatedMin: est });
        return true;
      }
      if (lvl !== 'minimum' && planned + c.minimumMin <= usable) {
        planned += c.minimumMin;
        items.push(timeTrimmed(c));
        return true;
      }
      return false;
    };
    const overflow = (c: Candidate, reason: OverflowReason) => {
      this.overflow.set(c.item.id, reason);
      if (c.fromWeekly != null) stripOut.push(c.item);
      else deferred.push(c.item);
    };

    for (const c of systemCands) if (!place(c)) overflow(c, 'overBudget');
    const coreCap = this.isYellow ? kMaxCoreYellow : kMaxCore;
    let coreCount = 0;
    for (const c of coreCands) {
      const capOk = this.isDoneToday(c) || coreCount < coreCap;
      if (capOk && place(c)) coreCount++;
      else overflow(c, capOk ? 'overBudget' : 'overCap');
    }
    const reserved: Candidate[] = [];
    for (const c of maintainCands) {
      const fits = this.isDoneToday(c) || planned + c.minimumMin <= usable;
      const capOk = this.isDoneToday(c) || reserved.length < kMaxMaintain;
      if (capOk && fits) {
        planned += c.minimumMin;
        reserved.push(c);
      } else {
        overflow(c, capOk ? 'overBudget' : 'overCap');
      }
    }
    for (const c of reserved) {
      const lvl = c.item.suggestedLevel;
      const extra = minutesFor(c, lvl) - c.minimumMin;
      if (lvl === 'minimum' || this.isDoneToday(c) || planned + extra <= usable) {
        if (lvl !== 'minimum') planned += extra;
        items.push({ ...c.item, estimatedMin: minutesFor(c, lvl) });
      } else {
        items.push(timeTrimmed(c));
      }
    }
    if (joy != null) items.push(joy);

    return {
      date: this.key,
      energy: this.input.energy,
      items: sortPlanItems(items),
      thisWeek: stripOut,
      deferred,
      budgetMin: budget,
      usableMin: usable,
      plannedMin: planned,
      showHelpLink: false,
    };
  }

  buildRed(budget: number, usable: number, chains: Candidate[], core: Candidate[], maintain: Candidate[], joy: PlanItem | null): DayPlan {
    const pool = [...chains, ...maintain, ...core].filter((c) => c.essential);
    const chosen: Candidate[] = [];
    const pick = (c: Candidate | null | undefined) => {
      if (c != null && chosen.length < kRedEssentials && !chosen.includes(c)) chosen.push(c);
    };
    const doneToday = [...core, ...maintain].filter((c) => this.isDoneToday(c));
    pick(pool.find((c) => c.item.domain === 'sleep'));
    pick(pool.find((c) => c.item.domain === 'care'));
    pick(core.length === 0 ? null : core[0]);
    for (const c of pool) pick(c);
    let planned = 0;
    const items: PlanItem[] = [];
    for (const c of [...chosen, ...doneToday.filter((d) => !chosen.includes(d))]) {
      const est = c.minimumMin;
      if (c.item.tier !== 'chain') planned += est;
      items.push({
        ...c.item,
        suggestedLevel: 'minimum',
        estimatedMin: est,
        why: c.item.isComeback ? c.item.why : buildWhy('redEssential'),
        extraWhy: c.item.isComeback ? [buildWhy('redEssential')] : [],
      });
    }
    const placed = new Set(items.map((i) => i.id));
    for (const c of [...chains, ...core, ...maintain]) if (!placed.has(c.item.id)) this.overflow.set(c.item.id, 'redRest');
    if (joy != null) items.push(joy);
    return {
      date: this.key,
      energy: 'red',
      items: sortPlanItems(items),
      thisWeek: [],
      deferred: [],
      budgetMin: budget,
      usableMin: usable,
      plannedMin: planned,
      showHelpLink: true,
    };
  }
}

const sectionOrder = (s: PlanSection): number => (s === 'morningChain' ? 0 : s === 'day' ? 1 : 2);

/** Sorts by section, then start time (unscheduled last), then id. */
export function sortPlanItems(items: PlanItem[]): PlanItem[] {
  return [...items].sort((a, b) => {
    const s = cmpNum(sectionOrder(a.section), sectionOrder(b.section));
    if (s !== 0) return s;
    const ta = a.startMinute ?? 1440;
    const tb = b.startMinute ?? 1440;
    if (ta !== tb) return cmpNum(ta, tb);
    return cmpStr(a.id, b.id);
  });
}

// ---------------------------------------------------------------------------
// Suggestion mode
// ---------------------------------------------------------------------------

/**
 * Why a suggestion is (or isn't) in what the legacy auto plan would pick.
 * `fits` = would be planned; `trimmed` = auto would shrink it to minimum for
 * time; `overCap` / `overBudget` = auto would leave it out; `redRest` = Red
 * energy keeps only essentials. Shown to her — never applied silently.
 */
export type SuggestionFit = 'fits' | 'trimmed' | 'overCap' | 'overBudget' | 'redRest' | 'weekOpen';

export interface Suggestion {
  /** The item at the level the engine suggests for her energy (never time-trimmed). */
  item: PlanItem;
  fit: SuggestionFit;
  /** Level the auto plan would use (differs from item.suggestedLevel when trimmed). */
  autoLevel: CompletionLevel | null;
  /** True when the legacy auto plan would include it. */
  inAutoPlan: boolean;
  /** Routine steps / essentials are offered first. */
  group: 'chain' | 'core' | 'maintain' | 'system' | 'joy';
}

export interface SuggestionSet {
  date: string;
  energy: EnergyMode;
  budgetMin: number;
  usableMin: number;
  suggestions: Suggestion[];
  /** Weekly tasks open this week but not due today (informational strip). */
  thisWeek: PlanItem[];
  showHelpLink: boolean;
  /** The legacy auto plan for parity / "accept what the engine would do". */
  autoPlan: DayPlan;
}

/** SUGGESTION mode (default): every candidate with its reason; nothing hidden or trimmed. */
export function suggestDay(input: PlannerInput): SuggestionSet {
  const p = new Planner(input);
  const auto = p.build();
  const all = p.collect();
  const autoById = new Map(auto.items.map((i) => [i.id, i]));
  const out: Suggestion[] = [];
  const push = (c: Candidate | PlanItem, group: Suggestion['group']) => {
    const item = 'item' in c ? c.item : c;
    const a = autoById.get(item.id);
    let fit: SuggestionFit;
    if (a != null) fit = p.trimmed.has(item.id) ? 'trimmed' : 'fits';
    else fit = p.overflow.get(item.id) ?? (auto.energy === 'red' ? 'redRest' : 'overBudget');
    out.push({ item, fit, autoLevel: a?.suggestedLevel ?? null, inAutoPlan: a != null, group });
  };
  for (const c of all.chains) push(c, 'chain');
  for (const c of all.system) push(c, 'system');
  for (const c of all.core) push(c, 'core');
  for (const c of all.maintain) push(c, 'maintain');
  if (all.joy) push(all.joy, 'joy');
  // Weekly tasks still open this week (no fixed day, or a passed day) are offered too — nothing is
  // forced; she picks the day (QA area 3 #2: the driving plan must surface on Today and the Brief).
  for (const it of auto.thisWeek) {
    if (out.some((x) => x.item.id === it.id)) continue;
    const t = (input.weeklyTasks ?? []).find((w) => w.id === it.itemId);
    const left = t ? t.timesPerWeek - p.doneThisWeekBeforeToday(t.id) : 0;
    const why =
      t && t.preferredWeekdays.length === 0 && left > 0
        ? buildWhy('weeklyOpen', { left: numText(left), total: numText(t.timesPerWeek) })
        : it.why;
    const group: Suggestion['group'] = it.tier === 'system' ? 'system' : it.tier === 'core' ? 'core' : 'maintain';
    out.push({ item: { ...it, why }, fit: 'weekOpen', autoLevel: null, inAutoPlan: false, group });
  }
  // Red mode: the suggested level is minimum for everything (energy, not time).
  if (auto.energy === 'red') for (const s of out) s.item = { ...s.item, suggestedLevel: 'minimum' };
  return {
    date: auto.date,
    energy: auto.energy,
    budgetMin: auto.budgetMin,
    usableMin: auto.usableMin,
    suggestions: out,
    thisWeek: auto.thisWeek.filter((i) => !out.some((s) => s.item.id === i.id)),
    showHelpLink: auto.showHelpLink,
    autoPlan: auto,
  };
}

export interface DayLoad {
  plannedMin: number;
  usableMin: number;
  /** Accepted core-tier items vs today's cap (energy-aware). */
  coreCount: number;
  coreCap: number;
  /** True when the accepted day is fuller than her time or energy allows. */
  busy: boolean;
  overByMin: number;
}

/** Gentle busy-day check for the accepted plan; never moves anything. */
/**
 * Gentle busy-day info. [settledItemIds] = plan items already done or skipped today: they no longer
 * need time, so a finished day is never "busy" and the note never contradicts «يومك كمل».
 */
export function dayLoad(plan: DayPlan, usableMin: number, settledItemIds?: ReadonlySet<string>): DayLoad {
  const open = settledItemIds == null ? plan.items : plan.items.filter((i) => !settledItemIds.has(i.itemId));
  const planned = open.filter((i) => i.tier !== 'chain' && i.tier !== 'joy').reduce((a, i) => a + i.estimatedMin, 0);
  const coreCount = open.filter((i) => i.tier === 'core').length;
  const coreCap = plan.energy === 'yellow' ? kMaxCoreYellow : plan.energy === 'red' ? 1 : kMaxCore;
  const overBy = Math.max(0, planned - usableMin);
  return { plannedMin: planned, usableMin, coreCount, coreCap, busy: overBy > 0 || coreCount > coreCap, overByMin: overBy };
}
