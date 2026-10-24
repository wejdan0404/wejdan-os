/**
 * Domain models — TypeScript port of `lib/data/models/*.dart`.
 *
 * Every model is a plain, immutable-by-convention object whose keys are
 * EXACTLY the JSON keys the Flutter app writes (`toJson`/`fromJson`), so an
 * export from the Flutter app (schemaVersion 1) imports without loss and our
 * exports stay readable by it. Enums serialise by name (string literals).
 *
 * Each model has `fromJson` (forgiving, never throws — same defaults as Dart)
 * and `toJson` (same key order as Dart, nulls included).
 *
 * New in the web app (not in Flutter): TaskItem, InboxItem, Product,
 * Settings.paydayDay / planMode / notificationsEnabled, PlanItemKind 'task'.
 */
import {
  type Json,
  asJson,
  enumFrom,
  jBool,
  jDate,
  jDouble,
  jDoubleN,
  jInt,
  jIntList,
  jIntN,
  jList,
  jMap,
  jStr,
  jStrList,
  jStrN,
} from './core/json';
import { clamp, cmpNum, SUNDAY, weekday } from './core/dates';

export type { Json };

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const DOMAIN_IDS = [
  'health', 'sleep', 'food', 'care', 'womensHealth', 'ielts', 'learning', 'career', 'driving',
  'money', 'home', 'digital', 'admin', 'joy', 'people', 'faith', 'aquarium',
] as const;
export type DomainId = (typeof DOMAIN_IDS)[number];

export const DOMAIN_STATES = ['grow', 'maintain', 'rest'] as const;
export type DomainState = (typeof DOMAIN_STATES)[number];

export const PRIORITIES = ['core', 'recommended', 'optional', 'conditional'] as const;
export type Priority = (typeof PRIORITIES)[number];
export const priorityIndex = (p: Priority): number => PRIORITIES.indexOf(p);

export const COMPLETION_LEVELS = ['minimum', 'normal', 'bonus', 'skipped'] as const;
export type CompletionLevel = (typeof COMPLETION_LEVELS)[number];
/** minimum, normal and bonus count as done (ENG-19). */
export const isDoneLevel = (l: CompletionLevel): boolean => l !== 'skipped';

export const ENERGY_MODES = ['green', 'yellow', 'red'] as const;
export type EnergyMode = (typeof ENERGY_MODES)[number];

export const SLOTS = ['morning', 'midday', 'afternoon', 'evening', 'night', 'anytime'] as const;
export type Slot = (typeof SLOTS)[number];

/** `task` is web-only (tasks added to the day by her). */
export const PLAN_ITEM_KINDS = ['habit', 'routineStep', 'weeklyTask', 'projectStep', 'joy', 'task'] as const;
export type PlanItemKind = (typeof PLAN_ITEM_KINDS)[number];

export const PLAN_TIERS = ['core', 'maintain', 'joy', 'chain', 'system'] as const;
export type PlanTier = (typeof PLAN_TIERS)[number];

export const PLAN_SECTIONS = ['morningChain', 'day', 'eveningChain'] as const;
export type PlanSection = (typeof PLAN_SECTIONS)[number];

export const ACTION_TYPES = [
  'habit', 'routineStep', 'weeklyTask', 'systemAutomation', 'reference', 'projectStep', 'engineRule',
] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

export function actionTypeFromSeed(raw: string): ActionType {
  switch (raw) {
    case 'Habit': return 'habit';
    case 'Routine step': return 'routineStep';
    case 'Weekly task': return 'weeklyTask';
    case 'System/automation': return 'systemAutomation';
    case 'Project step': return 'projectStep';
    case 'Engine rule': return 'engineRule';
    default: return 'reference';
  }
}

export function priorityFromSeed(raw: string): Priority {
  switch (raw) {
    case 'Core': return 'core';
    case 'Recommended': return 'recommended';
    case 'Conditional': return 'conditional';
    default: return 'optional';
  }
}

export function slotFromSeed(raw: string): Slot {
  return (['morning', 'midday', 'afternoon', 'evening', 'night'] as const).includes(raw as never)
    ? (raw as Slot)
    : 'anytime';
}

export const PROJECT_STATUSES = ['idea', 'active', 'waiting', 'paused', 'done', 'archived'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const HABIT_STATUSES = ['active', 'paused', 'archived'] as const;
export type HabitStatus = (typeof HABIT_STATUSES)[number];

export const JOY_KINDS = ['free', 'bundled', 'earned'] as const;
export type JoyKind = (typeof JOY_KINDS)[number];

export const JOY_SIZES = ['quick', 'medium', 'big'] as const;
export type JoySize = (typeof JOY_SIZES)[number];

export const GROWTH_STAGES = ['seed', 'sprout', 'growing', 'rooted', 'automatic'] as const;
export type GrowthStage = (typeof GROWTH_STAGES)[number];

export const SPARK_REASONS = [
  'completion', 'comeback', 'weeklyReview', 'experiment', 'redeem', 'reversal', 'adjustment',
] as const;
export type SparkReason = (typeof SPARK_REASONS)[number];

export const MISS_REASONS = [
  'forgot', 'badTime', 'tooBig', 'tired', 'notEnjoyable', 'placeDidntFit', 'busy', 'notImportantNow',
] as const;
export type MissReason = (typeof MISS_REASONS)[number];

export const IELTS_SKILLS = [
  'reading', 'listening', 'writing', 'speaking', 'mixedReadingListening', 'lightReview',
] as const;
export type IeltsSkill = (typeof IELTS_SKILLS)[number];

export const EXPERIMENT_STATUSES = ['planned', 'active', 'completed', 'reverted', 'kept'] as const;
export type ExperimentStatus = (typeof EXPERIMENT_STATUSES)[number];

export const ANCHOR_TYPES = ['fixedTime', 'wake', 'sleep', 'prayer', 'slot'] as const;
export type AnchorType = (typeof ANCHOR_TYPES)[number];

export const PRAYER_ANCHORS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
export type PrayerAnchor = (typeof PRAYER_ANCHORS)[number];

export const APP_LANGUAGES = ['ar', 'en'] as const;
export type AppLanguage = (typeof APP_LANGUAGES)[number];

export const THEME_PREFS = ['system', 'light', 'dark'] as const;
export type ThemePref = (typeof THEME_PREFS)[number];

export const NUDGE_RESPONSES = ['done', 'snoozed', 'skipped', 'ignored', 'opened'] as const;
export type NudgeResponse = (typeof NUDGE_RESPONSES)[number];

export const NUDGE_KINDS = ['morningBrief', 'anchored', 'eveningShutdown', 'dues'] as const;
export type NudgeKind = (typeof NUDGE_KINDS)[number];

export const WHY_CODES = [
  'growFocus', 'strengthDay', 'walkDay', 'ieltsRotation', 'vocabDue', 'comeback', 'maintainLight',
  'chainStep', 'weeklyDue', 'weeklyCarried', 'weeklyReview', 'projectNext', 'freeJoy', 'redEssential',
  'yellowMinimum', 'timeTrimmed', 'weeklyOpen',
] as const;
export type WhyCode = (typeof WHY_CODES)[number];

/** Day-plan mode: `suggest` (default — she accepts items) or the legacy `auto` plan. */
export const PLAN_MODES = ['suggest', 'auto'] as const;
export type PlanMode = (typeof PLAN_MODES)[number];

// ---------------------------------------------------------------------------
// LocalizedText
// ---------------------------------------------------------------------------

export interface LocalizedText {
  ar: string;
  en: string;
}
export const lt = (ar: string, en: string): LocalizedText => ({ ar, en });
export const ltSame = (t: string): LocalizedText => ({ ar: t, en: t });
export const ltOf = (t: LocalizedText, lang: AppLanguage): string => (lang === 'ar' ? t.ar : t.en);
export const LocalizedTextJ = {
  fromJson: (j: Json): LocalizedText => ({ ar: jStr(j, 'ar'), en: jStr(j, 'en') }),
  toJson: (t: LocalizedText): Json => ({ ar: t.ar, en: t.en }),
};

// ---------------------------------------------------------------------------
// Domain & Season
// ---------------------------------------------------------------------------

export interface Domain {
  id: DomainId;
  nameAr: string;
  nameEn: string;
  state: DomainState;
  sensitive: boolean;
  enabled: boolean;
  parent: DomainId | null;
  sortOrder: number;
}
export const domainVisibleOnToday = (d: Domain): boolean => d.enabled && d.state !== 'rest';
export const DomainJ = {
  fromJson: (j: Json): Domain => ({
    id: enumFrom(DOMAIN_IDS, j['id'], 'joy'),
    nameAr: jStr(j, 'nameAr'),
    nameEn: jStr(j, 'nameEn'),
    state: enumFrom(DOMAIN_STATES, j['state'], 'rest'),
    sensitive: jBool(j, 'sensitive'),
    enabled: jBool(j, 'enabled', true),
    parent: j['parent'] == null ? null : enumFrom(DOMAIN_IDS, j['parent'], 'home'),
    sortOrder: jInt(j, 'sortOrder'),
  }),
  toJson: (d: Domain): Json => ({
    id: d.id, nameAr: d.nameAr, nameEn: d.nameEn, state: d.state, sensitive: d.sensitive,
    enabled: d.enabled, parent: d.parent, sortOrder: d.sortOrder,
  }),
};

export interface Season {
  id: string;
  titleAr: string;
  titleEn: string;
  startDate: string;
  plannedEndDate: string | null;
  endedDate: string | null;
  states: Partial<Record<DomainId, DomainState>>;
}
export const seasonIsCurrent = (s: Season): boolean => s.endedDate == null;
export const SeasonJ = {
  fromJson: (j: Json): Season => {
    const states: Partial<Record<DomainId, DomainState>> = {};
    for (const [k, v] of Object.entries(jMap(j, 'states'))) {
      states[enumFrom(DOMAIN_IDS, k, 'joy')] = enumFrom(DOMAIN_STATES, v, 'rest');
    }
    return {
      id: jStr(j, 'id'),
      titleAr: jStr(j, 'titleAr'),
      titleEn: jStr(j, 'titleEn'),
      startDate: jStr(j, 'startDate'),
      plannedEndDate: jStrN(j, 'plannedEndDate'),
      endedDate: jStrN(j, 'endedDate'),
      states,
    };
  },
  toJson: (s: Season): Json => ({
    id: s.id, titleAr: s.titleAr, titleEn: s.titleEn, startDate: s.startDate,
    plannedEndDate: s.plannedEndDate, endedDate: s.endedDate, states: { ...s.states },
  }),
};

// ---------------------------------------------------------------------------
// Action library
// ---------------------------------------------------------------------------

export const ACTION_FIELDS = [
  'cardTitle', 'cardMeta', 'whyShort', 'what', 'dose', 'why', 'cue', 'minimum', 'normal', 'bonus',
  'joy', 'frictionDown', 'frictionUp', 'ifThen', 'metric', 'safety',
] as const;
export type ActionField = (typeof ACTION_FIELDS)[number];

const AR_KEYS: Record<ActionField, string> = {
  cardTitle: 'card_title_ar', cardMeta: 'card_meta_ar', whyShort: 'why_short_ar', what: 'what_ar',
  dose: 'dose_ar', why: 'why_ar', cue: 'cue_ar', minimum: 'minimum_ar', normal: 'normal_ar',
  bonus: 'bonus_ar', joy: 'joy_ar', frictionDown: 'friction_down_ar', frictionUp: 'friction_up_ar',
  ifThen: 'if_then_ar', metric: 'metric_ar', safety: 'safety_ar',
};

/** Arabic content of an action, keyed by field. */
export type ActionAr = Partial<Record<ActionField, string>>;
export const ActionArJ = {
  fromJson: (j: Json): ActionAr => {
    const out: ActionAr = {};
    for (const f of ACTION_FIELDS) {
      const v = j[AR_KEYS[f]];
      if (typeof v === 'string' && v.trim() !== '') out[f] = v.trim();
    }
    return out;
  },
  toJson: (a: ActionAr): Json => {
    const out: Json = {};
    for (const f of ACTION_FIELDS) if (a[f] !== undefined) out[AR_KEYS[f]] = a[f];
    return out;
  },
};

/** «لا ينطبق» / "n/a" values are hidden in the UI. */
export function isNotApplicable(v: string | null | undefined): boolean {
  if (v == null) return true;
  const t = v.trim();
  if (t === '') return true;
  const lower = t.toLowerCase();
  return t.startsWith('لا ينطبق') || lower === 'n/a' || lower.startsWith('n/a ') || lower.startsWith('n/a(');
}

export interface EvidenceSource {
  type: string;
  id: string;
  title: string;
  year: number | null;
  verifiedBy: string | null;
}
export function evidenceUrl(s: EvidenceSource): string {
  if (s.type === 'PMID') return `https://pubmed.ncbi.nlm.nih.gov/${s.id}/`;
  if (s.type === 'DOI') return `https://doi.org/${s.id}`;
  return s.id;
}
export const EvidenceSourceJ = {
  fromJson: (j: Json): EvidenceSource => ({
    type: jStr(j, 'type'), id: jStr(j, 'id'), title: jStr(j, 'title'),
    year: jIntN(j, 'year'), verifiedBy: jStrN(j, 'verified_by'),
  }),
  toJson: (s: EvidenceSource): Json => ({
    type: s.type, id: s.id, title: s.title, year: s.year, verified_by: s.verifiedBy,
  }),
};

/** Read-only evidence-based action (assets actions.json); keys mirror the seed (snake_case in JSON). */
export interface Action {
  actionId: string;
  area: string;
  nameAr: string;
  nameEn: string;
  what: string;
  dose: string;
  why: string;
  evidenceStrength: string;
  sources: EvidenceSource[];
  cueSuggestion: string;
  minimumVersion: string;
  normalVersion: string;
  bonusVersion: string;
  joyPairing: string;
  frictionDown: string;
  frictionUpForCompeting: string;
  ifThenPlan: string;
  trackingMetric: string;
  progression: string;
  safetyOrStopRule: string;
  scheduleSlot: string;
  timeMinutesNormal: number;
  appType: string;
  priorityForHer: string;
  notes: string;
  ar: ActionAr | null;
}
export const ActionJ = {
  fromJson: (j: Json): Action => ({
    actionId: jStr(j, 'action_id'),
    area: jStr(j, 'area'),
    nameAr: jStr(j, 'name_ar'),
    nameEn: jStr(j, 'name_en'),
    what: jStr(j, 'what'),
    dose: jStr(j, 'dose'),
    why: jStr(j, 'why'),
    evidenceStrength: jStr(j, 'evidence_strength'),
    sources: jList(j, 'sources', EvidenceSourceJ.fromJson),
    cueSuggestion: jStr(j, 'cue_suggestion'),
    minimumVersion: jStr(j, 'minimum_version'),
    normalVersion: jStr(j, 'normal_version'),
    bonusVersion: jStr(j, 'bonus_version'),
    joyPairing: jStr(j, 'joy_pairing'),
    frictionDown: jStr(j, 'friction_down'),
    frictionUpForCompeting: jStr(j, 'friction_up_for_competing'),
    ifThenPlan: jStr(j, 'if_then_plan'),
    trackingMetric: jStr(j, 'tracking_metric'),
    progression: jStr(j, 'progression'),
    safetyOrStopRule: jStr(j, 'safety_or_stop_rule'),
    scheduleSlot: jStr(j, 'schedule_slot'),
    timeMinutesNormal: jInt(j, 'time_minutes_normal'),
    appType: jStr(j, 'app_type'),
    priorityForHer: jStr(j, 'priority_for_her'),
    notes: jStr(j, 'notes'),
    ar: j['ar'] !== null && typeof j['ar'] === 'object' ? ActionArJ.fromJson(asJson(j['ar'])) : null,
  }),
  toJson: (a: Action): Json => {
    const out: Json = {
      action_id: a.actionId, area: a.area, name_ar: a.nameAr, name_en: a.nameEn, what: a.what,
      dose: a.dose, why: a.why, evidence_strength: a.evidenceStrength,
      sources: a.sources.map(EvidenceSourceJ.toJson), cue_suggestion: a.cueSuggestion,
      minimum_version: a.minimumVersion, normal_version: a.normalVersion, bonus_version: a.bonusVersion,
      joy_pairing: a.joyPairing, friction_down: a.frictionDown,
      friction_up_for_competing: a.frictionUpForCompeting, if_then_plan: a.ifThenPlan,
      tracking_metric: a.trackingMetric, progression: a.progression,
      safety_or_stop_rule: a.safetyOrStopRule, schedule_slot: a.scheduleSlot,
      time_minutes_normal: a.timeMinutesNormal, app_type: a.appType,
      priority_for_her: a.priorityForHer, notes: a.notes,
    };
    if (a.ar != null) out['ar'] = ActionArJ.toJson(a.ar);
    return out;
  },
};

/** Actions whose dose is never shown (user-defined practice / help card). */
export const kNoDoseActions: ReadonlySet<string> = new Set(['JOY-12', 'JOY-13']);

export function actionEnglishOf(a: Action, f: ActionField): string {
  switch (f) {
    case 'cardTitle': return a.nameEn;
    case 'cardMeta': return '';
    case 'whyShort': return a.why;
    case 'what': return a.what;
    case 'dose': return a.dose;
    case 'why': return a.why;
    case 'cue': return a.cueSuggestion;
    case 'minimum': return a.minimumVersion;
    case 'normal': return a.normalVersion;
    case 'bonus': return a.bonusVersion;
    case 'joy': return a.joyPairing;
    case 'frictionDown': return a.frictionDown;
    case 'frictionUp': return a.frictionUpForCompeting;
    case 'ifThen': return a.ifThenPlan;
    case 'metric': return a.trackingMetric;
    case 'safety': return a.safetyOrStopRule;
  }
}

/** Text of [f] in [lang]; Arabic falls back to English; null when n/a. */
export function actionText(a: Action, f: ActionField, lang: AppLanguage): string | null {
  if (f === 'dose' && kNoDoseActions.has(a.actionId)) return null;
  const v = lang === 'ar' ? (a.ar?.[f] ?? actionEnglishOf(a, f)) : actionEnglishOf(a, f);
  if (f === 'cardTitle' && lang === 'ar' && a.ar?.[f] == null) return a.nameAr;
  return isNotApplicable(v) ? null : v;
}

export const actionTitle = (a: Action, lang: AppLanguage): string =>
  lang === 'ar' ? (a.ar?.cardTitle ?? a.nameAr) : a.nameEn;
export const actionType = (a: Action): ActionType => actionTypeFromSeed(a.appType);
export const actionPriority = (a: Action): Priority => priorityFromSeed(a.priorityForHer);
export const actionSlot = (a: Action): Slot => slotFromSeed(a.scheduleSlot);
export const actionFamily = (a: Action): string => a.actionId.split('-')[0] ?? '';

const STATED_MINUTES =
  /(\d+)\s*-?\s*(?:min\b|mins\b|minute|minutes)(?!\s+(?:before|after|earlier|later))/gi;

/** First duration in minutes stated in [text]. */
export function statedMinutesIn(text: string): number | null {
  STATED_MINUTES.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = STATED_MINUTES.exec(text)) !== null) {
    const n = parseInt(m[1] ?? '', 10);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  return null;
}
export const actionStatedMinimumMinutes = (a: Action): number | null => statedMinutesIn(a.minimumVersion);

export interface EngineRule {
  ruleId: string;
  area: string;
  nameAr: string;
  nameEn: string;
  what: string;
  why: string;
  evidenceStrength: string;
  sources: EvidenceSource[];
  safetyOrStopRule: string;
  notes: string;
  ar: ActionAr | null;
}
export const EngineRuleJ = {
  fromJson: (j: Json): EngineRule => ({
    ruleId: jStr(j, 'action_id'),
    area: jStr(j, 'area'),
    nameAr: jStr(j, 'name_ar'),
    nameEn: jStr(j, 'name_en'),
    what: jStr(j, 'what'),
    why: jStr(j, 'why'),
    evidenceStrength: jStr(j, 'evidence_strength'),
    sources: jList(j, 'sources', EvidenceSourceJ.fromJson),
    safetyOrStopRule: jStr(j, 'safety_or_stop_rule'),
    notes: jStr(j, 'notes'),
    ar: j['ar'] !== null && typeof j['ar'] === 'object' ? ActionArJ.fromJson(asJson(j['ar'])) : null,
  }),
  toJson: (r: EngineRule): Json => {
    const out: Json = {
      action_id: r.ruleId, area: r.area, name_ar: r.nameAr, name_en: r.nameEn, what: r.what, why: r.why,
      evidence_strength: r.evidenceStrength, sources: r.sources.map(EvidenceSourceJ.toJson),
      safety_or_stop_rule: r.safetyOrStopRule, notes: r.notes, app_type: 'Engine rule',
    };
    if (r.ar != null) out['ar'] = ActionArJ.toJson(r.ar);
    return out;
  },
};
export const engineRuleTitle = (r: EngineRule, lang: AppLanguage): string =>
  lang === 'ar' ? (r.ar?.cardTitle ?? r.nameAr) : r.nameEn;
export function engineRuleText(r: EngineRule, f: ActionField, lang: AppLanguage): string | null {
  const en = f === 'what' ? r.what : f === 'why' ? r.why : f === 'safety' ? r.safetyOrStopRule : f === 'cardTitle' ? r.nameEn : '';
  const v = lang === 'ar' ? (r.ar?.[f] ?? en) : en;
  return isNotApplicable(v) ? null : v;
}

// ---------------------------------------------------------------------------
// Habit, CueAnchor, Routine
// ---------------------------------------------------------------------------

export interface CueAnchor {
  type: AnchorType;
  minute: number | null;
  prayer: PrayerAnchor | null;
  slot: Slot;
  offsetMin: number;
}
export const anchor = (p: Partial<CueAnchor> & { type: AnchorType }): CueAnchor => ({
  minute: null, prayer: null, slot: 'anytime', offsetMin: 0, ...p,
});
export const anchorSlot = (s: Slot): CueAnchor => anchor({ type: 'slot', slot: s });
export const anchorAt = (m: number): CueAnchor => anchor({ type: 'fixedTime', minute: m });
export const CueAnchorJ = {
  fromJson: (j: Json): CueAnchor => ({
    type: enumFrom(ANCHOR_TYPES, j['type'], 'slot'),
    minute: jIntN(j, 'minute'),
    prayer: j['prayer'] == null ? null : enumFrom(PRAYER_ANCHORS, j['prayer'], 'fajr'),
    slot: enumFrom(SLOTS, j['slot'], 'anytime'),
    offsetMin: jInt(j, 'offsetMin'),
  }),
  toJson: (a: CueAnchor): Json => ({
    type: a.type, minute: a.minute, prayer: a.prayer, slot: a.slot, offsetMin: a.offsetMin,
  }),
};

export interface HabitSchedule {
  /** Dart weekday values (1 = Monday … 7 = Sunday). */
  weekdays: number[];
  anchor: CueAnchor;
}
export const EVERY_DAY: readonly number[] = [1, 2, 3, 4, 5, 6, 7];
export const schedule = (weekdays: readonly number[] = EVERY_DAY, a: CueAnchor = anchorSlot('anytime')): HabitSchedule => ({
  weekdays: [...weekdays],
  anchor: a,
});
export const isPlannedOn = (s: HabitSchedule, day: Date): boolean => s.weekdays.includes(weekday(day));
export const HabitScheduleJ = {
  fromJson: (j: Json): HabitSchedule => ({
    weekdays: jIntList(j, 'weekdays'),
    anchor: CueAnchorJ.fromJson(jMap(j, 'anchor')),
  }),
  toJson: (s: HabitSchedule): Json => ({ weekdays: [...s.weekdays], anchor: CueAnchorJ.toJson(s.anchor) }),
};

export interface HabitReminder {
  enabled: boolean;
  offsetMin: number;
  textAr: string | null;
  textEn: string | null;
}
export const defaultReminder = (): HabitReminder => ({ enabled: false, offsetMin: 0, textAr: null, textEn: null });
export const HabitReminderJ = {
  fromJson: (j: Json): HabitReminder => ({
    enabled: jBool(j, 'enabled'),
    offsetMin: jInt(j, 'offsetMin'),
    textAr: jStrN(j, 'textAr'),
    textEn: jStrN(j, 'textEn'),
  }),
  toJson: (r: HabitReminder): Json => ({
    enabled: r.enabled, offsetMin: r.offsetMin, textAr: r.textAr, textEn: r.textEn,
  }),
};

export interface Habit {
  id: string;
  domain: DomainId;
  titleAr: string;
  titleEn: string;
  actionId: string | null;
  goal: string;
  cue: string;
  ifThen: string;
  minimumText: string;
  normalText: string;
  bonusText: string;
  joyPairing: string;
  frictionDown: string;
  frictionUp: string;
  reminder: HabitReminder;
  priority: Priority;
  schedule: HabitSchedule;
  durationMin: number;
  minimumDurationMin: number;
  minimumDurationEstimated: boolean;
  durationEstimated: boolean;
  status: HabitStatus;
  routineId: string | null;
  alternationGroup: string | null;
  essential: boolean;
  shrunkToMinimum: boolean;
  comebackPending: boolean;
  sortOrder: number;
  createdDate: string | null;
}

/** Habit with Dart constructor defaults. */
export function makeHabit(p: Pick<Habit, 'id' | 'domain' | 'titleAr' | 'titleEn'> & Partial<Habit>): Habit {
  return {
    actionId: null, goal: '', cue: '', ifThen: '', minimumText: '', normalText: '', bonusText: '',
    joyPairing: '', frictionDown: '', frictionUp: '', reminder: defaultReminder(), priority: 'recommended',
    schedule: schedule(), durationMin: 10, minimumDurationMin: 5, minimumDurationEstimated: false,
    durationEstimated: false, status: 'active', routineId: null, alternationGroup: null, essential: false,
    shrunkToMinimum: false, comebackPending: false, sortOrder: 0, createdDate: null,
    ...p,
  };
}
export const habitIsActive = (h: Habit): boolean => h.status === 'active';
export const HabitJ = {
  fromJson: (j: Json): Habit => ({
    id: jStr(j, 'id'),
    domain: enumFrom(DOMAIN_IDS, j['domain'], 'joy'),
    titleAr: jStr(j, 'titleAr'),
    titleEn: jStr(j, 'titleEn'),
    actionId: jStrN(j, 'actionId'),
    goal: jStr(j, 'goal'),
    cue: jStr(j, 'cue'),
    ifThen: jStr(j, 'ifThen'),
    minimumText: jStr(j, 'minimumText'),
    normalText: jStr(j, 'normalText'),
    bonusText: jStr(j, 'bonusText'),
    joyPairing: jStr(j, 'joyPairing'),
    frictionDown: jStr(j, 'frictionDown'),
    frictionUp: jStr(j, 'frictionUp'),
    reminder: HabitReminderJ.fromJson(jMap(j, 'reminder')),
    priority: enumFrom(PRIORITIES, j['priority'], 'recommended'),
    schedule: HabitScheduleJ.fromJson(jMap(j, 'schedule')),
    durationMin: jInt(j, 'durationMin', 10),
    minimumDurationMin: jInt(j, 'minimumDurationMin', 5),
    minimumDurationEstimated: jBool(j, 'minimumDurationEstimated'),
    durationEstimated: jBool(j, 'durationEstimated'),
    status: enumFrom(HABIT_STATUSES, j['status'], 'active'),
    routineId: jStrN(j, 'routineId'),
    alternationGroup: jStrN(j, 'alternationGroup'),
    essential: jBool(j, 'essential'),
    shrunkToMinimum: jBool(j, 'shrunkToMinimum'),
    comebackPending: jBool(j, 'comebackPending'),
    sortOrder: jInt(j, 'sortOrder'),
    createdDate: jStrN(j, 'createdDate'),
  }),
  toJson: (h: Habit): Json => ({
    id: h.id, domain: h.domain, titleAr: h.titleAr, titleEn: h.titleEn, actionId: h.actionId,
    goal: h.goal, cue: h.cue, ifThen: h.ifThen, minimumText: h.minimumText, normalText: h.normalText,
    bonusText: h.bonusText, joyPairing: h.joyPairing, frictionDown: h.frictionDown,
    frictionUp: h.frictionUp, reminder: HabitReminderJ.toJson(h.reminder), priority: h.priority,
    schedule: HabitScheduleJ.toJson(h.schedule), durationMin: h.durationMin,
    minimumDurationMin: h.minimumDurationMin, minimumDurationEstimated: h.minimumDurationEstimated,
    durationEstimated: h.durationEstimated, status: h.status, routineId: h.routineId,
    alternationGroup: h.alternationGroup, essential: h.essential, shrunkToMinimum: h.shrunkToMinimum,
    comebackPending: h.comebackPending, sortOrder: h.sortOrder, createdDate: h.createdDate,
  }),
};

export interface RoutineStep {
  id: string;
  habitId: string | null;
  titleAr: string;
  titleEn: string;
  actionId: string | null;
  domain: DomainId;
  minimumText: string;
  normalText: string;
  durationMin: number;
  minimumDurationMin: number;
  essential: boolean;
}
export const makeRoutineStep = (p: Pick<RoutineStep, 'id'> & Partial<RoutineStep>): RoutineStep => ({
  habitId: null, titleAr: '', titleEn: '', actionId: null, domain: 'care', minimumText: '', normalText: '',
  durationMin: 5, minimumDurationMin: 2, essential: false, ...p,
});
export const RoutineStepJ = {
  fromJson: (j: Json): RoutineStep => ({
    id: jStr(j, 'id'),
    habitId: jStrN(j, 'habitId'),
    titleAr: jStr(j, 'titleAr'),
    titleEn: jStr(j, 'titleEn'),
    actionId: jStrN(j, 'actionId'),
    domain: enumFrom(DOMAIN_IDS, j['domain'], 'care'),
    minimumText: jStr(j, 'minimumText'),
    normalText: jStr(j, 'normalText'),
    durationMin: jInt(j, 'durationMin', 5),
    minimumDurationMin: jInt(j, 'minimumDurationMin', 2),
    essential: jBool(j, 'essential'),
  }),
  toJson: (s: RoutineStep): Json => ({
    id: s.id, habitId: s.habitId, titleAr: s.titleAr, titleEn: s.titleEn, actionId: s.actionId,
    domain: s.domain, minimumText: s.minimumText, normalText: s.normalText, durationMin: s.durationMin,
    minimumDurationMin: s.minimumDurationMin, essential: s.essential,
  }),
};

export interface Routine {
  id: string;
  titleAr: string;
  titleEn: string;
  section: PlanSection;
  anchor: CueAnchor;
  steps: RoutineStep[];
  weekdays: number[];
  active: boolean;
}
export const makeRoutine = (
  p: Pick<Routine, 'id' | 'titleAr' | 'titleEn' | 'section' | 'anchor'> & Partial<Routine>,
): Routine => ({ steps: [], weekdays: [...EVERY_DAY], active: true, ...p });
export const RoutineJ = {
  fromJson: (j: Json): Routine => ({
    id: jStr(j, 'id'),
    titleAr: jStr(j, 'titleAr'),
    titleEn: jStr(j, 'titleEn'),
    section: enumFrom(PLAN_SECTIONS, j['section'], 'day'),
    anchor: CueAnchorJ.fromJson(jMap(j, 'anchor')),
    steps: jList(j, 'steps', RoutineStepJ.fromJson),
    weekdays: jIntList(j, 'weekdays'),
    active: jBool(j, 'active', true),
  }),
  toJson: (r: Routine): Json => ({
    id: r.id, titleAr: r.titleAr, titleEn: r.titleEn, section: r.section,
    anchor: CueAnchorJ.toJson(r.anchor), steps: r.steps.map(RoutineStepJ.toJson),
    weekdays: [...r.weekdays], active: r.active,
  }),
};

// ---------------------------------------------------------------------------
// Tasks: weekly tasks, projects, goals
// ---------------------------------------------------------------------------

export interface WeeklyTask {
  id: string;
  domain: DomainId;
  titleAr: string;
  titleEn: string;
  actionId: string | null;
  minimumText: string;
  normalText: string;
  durationMin: number;
  minimumDurationMin: number;
  preferredWeekdays: number[];
  anchor: CueAnchor;
  timesPerWeek: number;
  pinned: boolean;
  isWeeklyReview: boolean;
  active: boolean;
  sortOrder: number;
}
export const makeWeeklyTask = (
  p: Pick<WeeklyTask, 'id' | 'domain' | 'titleAr' | 'titleEn'> & Partial<WeeklyTask>,
): WeeklyTask => ({
  actionId: null, minimumText: '', normalText: '', durationMin: 30, minimumDurationMin: 10,
  preferredWeekdays: [], anchor: anchorSlot('anytime'), timesPerWeek: 1, pinned: false,
  isWeeklyReview: false, active: true, sortOrder: 0, ...p,
});
export const WeeklyTaskJ = {
  fromJson: (j: Json): WeeklyTask => ({
    id: jStr(j, 'id'),
    domain: enumFrom(DOMAIN_IDS, j['domain'], 'admin'),
    titleAr: jStr(j, 'titleAr'),
    titleEn: jStr(j, 'titleEn'),
    actionId: jStrN(j, 'actionId'),
    minimumText: jStr(j, 'minimumText'),
    normalText: jStr(j, 'normalText'),
    durationMin: jInt(j, 'durationMin', 30),
    minimumDurationMin: jInt(j, 'minimumDurationMin', 10),
    preferredWeekdays: jIntList(j, 'preferredWeekdays'),
    anchor: CueAnchorJ.fromJson(jMap(j, 'anchor')),
    timesPerWeek: jInt(j, 'timesPerWeek', 1),
    pinned: jBool(j, 'pinned'),
    isWeeklyReview: jBool(j, 'isWeeklyReview'),
    active: jBool(j, 'active', true),
    sortOrder: jInt(j, 'sortOrder'),
  }),
  toJson: (t: WeeklyTask): Json => ({
    id: t.id, domain: t.domain, titleAr: t.titleAr, titleEn: t.titleEn, actionId: t.actionId,
    minimumText: t.minimumText, normalText: t.normalText, durationMin: t.durationMin,
    minimumDurationMin: t.minimumDurationMin, preferredWeekdays: [...t.preferredWeekdays],
    anchor: CueAnchorJ.toJson(t.anchor), timesPerWeek: t.timesPerWeek, pinned: t.pinned,
    isWeeklyReview: t.isWeeklyReview, active: t.active, sortOrder: t.sortOrder,
  }),
};

export interface ProjectStep {
  id: string;
  titleAr: string;
  titleEn: string;
  actionId: string | null;
  done: boolean;
  doneDate: string | null;
  durationMin: number;
}
export const makeProjectStep = (
  p: Pick<ProjectStep, 'id' | 'titleAr' | 'titleEn'> & Partial<ProjectStep>,
): ProjectStep => ({ actionId: null, done: false, doneDate: null, durationMin: 30, ...p });
export const ProjectStepJ = {
  fromJson: (j: Json): ProjectStep => ({
    id: jStr(j, 'id'),
    titleAr: jStr(j, 'titleAr'),
    titleEn: jStr(j, 'titleEn'),
    actionId: jStrN(j, 'actionId'),
    done: jBool(j, 'done'),
    doneDate: jStrN(j, 'doneDate'),
    durationMin: jInt(j, 'durationMin', 30),
  }),
  toJson: (s: ProjectStep): Json => ({
    id: s.id, titleAr: s.titleAr, titleEn: s.titleEn, actionId: s.actionId, done: s.done,
    doneDate: s.doneDate, durationMin: s.durationMin,
  }),
};

export interface Project {
  id: string;
  domain: DomainId;
  titleAr: string;
  titleEn: string;
  status: ProjectStatus;
  goalId: string | null;
  isCourse: boolean;
  steps: ProjectStep[];
  sortOrder: number;
  /** Web-only (optional): due date day key and free notes. Not in Flutter. */
  dueDate?: string | null;
  notes?: string;
}
export const makeProject = (
  p: Pick<Project, 'id' | 'domain' | 'titleAr' | 'titleEn'> & Partial<Project>,
): Project => ({ status: 'idea', goalId: null, isCourse: false, steps: [], sortOrder: 0, ...p });
export const projectNextStep = (p: Project): ProjectStep | null => p.steps.find((s) => !s.done) ?? null;
export const projectProgress = (p: Project): number =>
  p.steps.length === 0 ? 0 : p.steps.filter((s) => s.done).length / p.steps.length;
export const ProjectJ = {
  fromJson: (j: Json): Project => {
    const p: Project = {
      id: jStr(j, 'id'),
      domain: enumFrom(DOMAIN_IDS, j['domain'], 'learning'),
      titleAr: jStr(j, 'titleAr'),
      titleEn: jStr(j, 'titleEn'),
      status: enumFrom(PROJECT_STATUSES, j['status'], 'idea'),
      goalId: jStrN(j, 'goalId'),
      isCourse: jBool(j, 'isCourse'),
      steps: jList(j, 'steps', ProjectStepJ.fromJson),
      sortOrder: jInt(j, 'sortOrder'),
    };
    if ('dueDate' in j) p.dueDate = jStrN(j, 'dueDate');
    if ('notes' in j) p.notes = jStr(j, 'notes');
    return p;
  },
  toJson: (p: Project): Json => {
    const out: Json = {
      id: p.id, domain: p.domain, titleAr: p.titleAr, titleEn: p.titleEn, status: p.status,
      goalId: p.goalId, isCourse: p.isCourse, steps: p.steps.map(ProjectStepJ.toJson), sortOrder: p.sortOrder,
    };
    if (p.dueDate !== undefined) out['dueDate'] = p.dueDate;
    if (p.notes !== undefined) out['notes'] = p.notes;
    return out;
  },
};

export interface Milestone {
  id: string;
  titleAr: string;
  titleEn: string;
  quarter: number;
  done: boolean;
  doneDate: string | null;
  rewardJoyId: string | null;
}
export const MilestoneJ = {
  fromJson: (j: Json): Milestone => ({
    id: jStr(j, 'id'),
    titleAr: jStr(j, 'titleAr'),
    titleEn: jStr(j, 'titleEn'),
    quarter: jInt(j, 'quarter', 1),
    done: jBool(j, 'done'),
    doneDate: jStrN(j, 'doneDate'),
    rewardJoyId: jStrN(j, 'rewardJoyId'),
  }),
  toJson: (m: Milestone): Json => ({
    id: m.id, titleAr: m.titleAr, titleEn: m.titleEn, quarter: m.quarter, done: m.done,
    doneDate: m.doneDate, rewardJoyId: m.rewardJoyId,
  }),
};

export interface Goal {
  id: string;
  domain: DomainId;
  titleAr: string;
  titleEn: string;
  targetNote: string;
  milestones: Milestone[];
  linkedHabitIds: string[];
  linkedProjectIds: string[];
  sortOrder: number;
}
export const goalProgress = (g: Goal): number =>
  g.milestones.length === 0 ? 0 : g.milestones.filter((m) => m.done).length / g.milestones.length;
export const GoalJ = {
  fromJson: (j: Json): Goal => ({
    id: jStr(j, 'id'),
    domain: enumFrom(DOMAIN_IDS, j['domain'], 'career'),
    titleAr: jStr(j, 'titleAr'),
    titleEn: jStr(j, 'titleEn'),
    targetNote: jStr(j, 'targetNote'),
    milestones: jList(j, 'milestones', MilestoneJ.fromJson),
    linkedHabitIds: jStrList(j, 'linkedHabitIds'),
    linkedProjectIds: jStrList(j, 'linkedProjectIds'),
    sortOrder: jInt(j, 'sortOrder'),
  }),
  toJson: (g: Goal): Json => ({
    id: g.id, domain: g.domain, titleAr: g.titleAr, titleEn: g.titleEn, targetNote: g.targetNote,
    milestones: g.milestones.map(MilestoneJ.toJson), linkedHabitIds: [...g.linkedHabitIds],
    linkedProjectIds: [...g.linkedProjectIds], sortOrder: g.sortOrder,
  }),
};

// ---------------------------------------------------------------------------
// Day plan
// ---------------------------------------------------------------------------

export interface WhyToday {
  code: WhyCode;
  args: Record<string, string>;
  text: LocalizedText;
}
export const WhyTodayJ = {
  fromJson: (j: Json): WhyToday => {
    const args: Record<string, string> = {};
    for (const [k, v] of Object.entries(jMap(j, 'args'))) args[k] = String(v);
    return {
      code: enumFrom(WHY_CODES, j['code'], 'growFocus'),
      args,
      text: LocalizedTextJ.fromJson(jMap(j, 'text')),
    };
  },
  toJson: (w: WhyToday): Json => ({ code: w.code, args: { ...w.args }, text: LocalizedTextJ.toJson(w.text) }),
};

export interface PlanItem {
  id: string;
  itemId: string;
  kind: PlanItemKind;
  tier: PlanTier;
  section: PlanSection;
  title: LocalizedText;
  domain: DomainId;
  why: WhyToday;
  extraWhy: WhyToday[];
  minimumText: string;
  normalText: string;
  bonusText: string;
  defaultLevel: CompletionLevel;
  suggestedLevel: CompletionLevel;
  startMinute: number | null;
  estimatedMin: number;
  actionId: string | null;
  routineId: string | null;
  bundleJoyId: string | null;
  bundleTitle: LocalizedText | null;
  ieltsSkill: IeltsSkill | null;
  isComeback: boolean;
}
export const makePlanItem = (
  p: Pick<PlanItem, 'id' | 'itemId' | 'kind' | 'tier' | 'section' | 'title' | 'domain' | 'why'> & Partial<PlanItem>,
): PlanItem => ({
  extraWhy: [], minimumText: '', normalText: '', bonusText: '', defaultLevel: 'minimum',
  suggestedLevel: 'normal', startMinute: null, estimatedMin: 0, actionId: null, routineId: null,
  bundleJoyId: null, bundleTitle: null, ieltsSkill: null, isComeback: false, ...p,
});
export const PlanItemJ = {
  fromJson: (j: Json): PlanItem => ({
    id: jStr(j, 'id'),
    itemId: jStr(j, 'itemId'),
    kind: enumFrom(PLAN_ITEM_KINDS, j['kind'], 'habit'),
    tier: enumFrom(PLAN_TIERS, j['tier'], 'maintain'),
    section: enumFrom(PLAN_SECTIONS, j['section'], 'day'),
    title: LocalizedTextJ.fromJson(jMap(j, 'title')),
    domain: enumFrom(DOMAIN_IDS, j['domain'], 'joy'),
    why: WhyTodayJ.fromJson(jMap(j, 'why')),
    extraWhy: jList(j, 'extraWhy', WhyTodayJ.fromJson),
    minimumText: jStr(j, 'minimumText'),
    normalText: jStr(j, 'normalText'),
    bonusText: jStr(j, 'bonusText'),
    defaultLevel: enumFrom(COMPLETION_LEVELS, j['defaultLevel'], 'minimum'),
    suggestedLevel: enumFrom(COMPLETION_LEVELS, j['suggestedLevel'], 'normal'),
    startMinute: jIntN(j, 'startMinute'),
    estimatedMin: jInt(j, 'estimatedMin'),
    actionId: jStrN(j, 'actionId'),
    routineId: jStrN(j, 'routineId'),
    bundleJoyId: jStrN(j, 'bundleJoyId'),
    bundleTitle: j['bundleTitle'] == null ? null : LocalizedTextJ.fromJson(jMap(j, 'bundleTitle')),
    ieltsSkill: j['ieltsSkill'] == null ? null : enumFrom(IELTS_SKILLS, j['ieltsSkill'], 'reading'),
    isComeback: jBool(j, 'isComeback'),
  }),
  toJson: (i: PlanItem): Json => ({
    id: i.id, itemId: i.itemId, kind: i.kind, tier: i.tier, section: i.section,
    title: LocalizedTextJ.toJson(i.title), domain: i.domain, why: WhyTodayJ.toJson(i.why),
    extraWhy: i.extraWhy.map(WhyTodayJ.toJson), minimumText: i.minimumText, normalText: i.normalText,
    bonusText: i.bonusText, defaultLevel: i.defaultLevel, suggestedLevel: i.suggestedLevel,
    startMinute: i.startMinute, estimatedMin: i.estimatedMin, actionId: i.actionId, routineId: i.routineId,
    bundleJoyId: i.bundleJoyId, bundleTitle: i.bundleTitle == null ? null : LocalizedTextJ.toJson(i.bundleTitle),
    ieltsSkill: i.ieltsSkill, isComeback: i.isComeback,
  }),
};

/**
 * The led day. In the legacy auto mode this is the planner output; in
 * suggestion mode the stored DayPlan holds only the items she ACCEPTED
 * (`items`) and the ones she moved to «بعدين» (`deferred`).
 */
export interface DayPlan {
  date: string;
  energy: EnergyMode;
  items: PlanItem[];
  thisWeek: PlanItem[];
  deferred: PlanItem[];
  budgetMin: number;
  usableMin: number;
  plannedMin: number;
  showHelpLink: boolean;
}
export const makeDayPlan = (p: Pick<DayPlan, 'date' | 'energy' | 'items'> & Partial<DayPlan>): DayPlan => ({
  thisWeek: [], deferred: [], budgetMin: 0, usableMin: 0, plannedMin: 0, showHelpLink: false, ...p,
});
export const itemsIn = (p: DayPlan, s: PlanSection): PlanItem[] => p.items.filter((i) => i.section === s);
export const itemsOfTier = (p: DayPlan, t: PlanTier): PlanItem[] => p.items.filter((i) => i.tier === t);
export const DayPlanJ = {
  fromJson: (j: Json): DayPlan => ({
    date: jStr(j, 'date'),
    energy: enumFrom(ENERGY_MODES, j['energy'], 'green'),
    items: jList(j, 'items', PlanItemJ.fromJson),
    thisWeek: jList(j, 'thisWeek', PlanItemJ.fromJson),
    deferred: jList(j, 'deferred', PlanItemJ.fromJson),
    budgetMin: jInt(j, 'budgetMin'),
    usableMin: jInt(j, 'usableMin'),
    plannedMin: jInt(j, 'plannedMin'),
    showHelpLink: jBool(j, 'showHelpLink'),
  }),
  toJson: (p: DayPlan): Json => ({
    date: p.date, energy: p.energy, items: p.items.map(PlanItemJ.toJson),
    thisWeek: p.thisWeek.map(PlanItemJ.toJson), deferred: p.deferred.map(PlanItemJ.toJson),
    budgetMin: p.budgetMin, usableMin: p.usableMin, plannedMin: p.plannedMin, showHelpLink: p.showHelpLink,
  }),
};

export interface FixedEvent {
  id: string;
  title: string;
  startMinute: number;
  endMinute: number;
  date: string | null;
  weekdays: number[];
  isFocusBlock: boolean;
}
export const fixedEventOccursOn = (e: FixedEvent, day: Date, key: string): boolean =>
  e.date != null ? e.date === key : e.weekdays.includes(weekday(day));
export const FixedEventJ = {
  fromJson: (j: Json): FixedEvent => ({
    id: jStr(j, 'id'),
    title: jStr(j, 'title'),
    startMinute: jInt(j, 'startMinute'),
    endMinute: jInt(j, 'endMinute'),
    date: jStrN(j, 'date'),
    weekdays: jIntList(j, 'weekdays'),
    isFocusBlock: jBool(j, 'isFocusBlock'),
  }),
  toJson: (e: FixedEvent): Json => ({
    id: e.id, title: e.title, startMinute: e.startMinute, endMinute: e.endMinute, date: e.date,
    weekdays: [...e.weekdays], isFocusBlock: e.isFocusBlock,
  }),
};

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

/** Makkah (Masjid al-Haram) — default for optional prayer anchors. */
export const kDefaultLatitude = 21.4225;
export const kDefaultLongitude = 39.8262;

export interface Settings {
  language: AppLanguage;
  theme: ThemePref;
  notificationCap: number;
  quietStartMinute: number;
  quietEndMinute: number;
  quietEndSetByUser: boolean;
  wakeMinute: number;
  sleepMinute: number;
  prayerAnchorsEnabled: boolean;
  latitude: number;
  longitude: number;
  utcOffsetMinutes: number;
  timeZoneName: string;
  cycleModule: boolean;
  aquariumModule: boolean;
  appLock: boolean;
  forgivingStreak: boolean;
  dailyBudgetMin: number;
  /** Dart weekday → minutes. */
  budgetByWeekday: Record<number, number>;
  ieltsWeakestSkill: IeltsSkill;
  weekStartsOn: number;
  eveningShutdownBeforeSleepMin: number;
  onboardingDone: boolean;
  lastSeasonReview: string | null;
  firstActionPin: string | null;
  // ---- web-only ----
  /** Day of month the salary arrives (1–31, default 1). The budget month starts here. */
  paydayDay: number;
  /** `suggest` (default): the planner only suggests; `auto`: legacy auto plan. */
  planMode: PlanMode;
  /** Reminders are OFF by default; the planner returns no nudges while false. */
  notificationsEnabled: boolean;
  /**
   * In-app reminder times she chose, minute of day by item key (`routine:am` · `routine:pm` ·
   * `habit:<id>`). No entry = no reminder for that item.
   */
  reminderTimes: Record<string, number>;
  /** «ساعات الهدوء»: no in-app reminders between quietStartMinute and the quiet end. */
  quietHoursEnabled: boolean;
  /** When she last made a backup file (ISO) — drives the quiet 14-day «صدّري نسخة» row. */
  lastBackupAt: string | null;
  /** Her name as she wrote it in onboarding (greeting). Empty until she sets it. */
  displayName: string;
  /** Product-routine slots she paused (the routine stays, it just leaves the day). */
  pausedRoutineSlots: ProductSlot[];
  /**
   * Settings keys this build doesn't know (from older or newer exports). Kept untouched and
   * written back on export, so nothing she had is lost — without this build naming them.
   */
  extra?: Json;
  /**
   * Earlier payday rules, oldest first: `day` applied to every date before `until`
   * (`yyyy-MM-dd`, exclusive). Lets a payday change keep the cycle in progress intact.
   */
  paydayHistory: PaydayRule[];
}

/** A past payday rule — see Settings.paydayHistory. */
export interface PaydayRule {
  until: string;
  day: number;
}

export function defaultSettings(p: Partial<Settings> = {}): Settings {
  return {
    language: 'ar', theme: 'system', notificationCap: 4, quietStartMinute: 23 * 60, quietEndMinute: 6 * 60,
    quietEndSetByUser: false, wakeMinute: 6 * 60, sleepMinute: 23 * 60, prayerAnchorsEnabled: false,
    latitude: kDefaultLatitude, longitude: kDefaultLongitude, utcOffsetMinutes: 180,
    timeZoneName: 'Asia/Riyadh', cycleModule: false, aquariumModule: false,
    appLock: false, forgivingStreak: true, dailyBudgetMin: 150, budgetByWeekday: {},
    ieltsWeakestSkill: 'writing', weekStartsOn: SUNDAY, eveningShutdownBeforeSleepMin: 90,
    onboardingDone: false, lastSeasonReview: null, firstActionPin: null,
    paydayDay: 1, planMode: 'suggest', notificationsEnabled: false, reminderTimes: {}, quietHoursEnabled: true, lastBackupAt: null,
    displayName: '', pausedRoutineSlots: [],
    paydayHistory: [],
    ...p,
    ...(p.notificationCap !== undefined ? { notificationCap: clamp(p.notificationCap, 0, 6) } : {}),
  };
}

/** Data saved before `quietEndSetByUser` existed. */
export const legacyQuietEndSetByUser = (quietEnd: number, wake: number): boolean =>
  quietEnd !== wake && quietEnd !== 6 * 60 && quietEnd !== 7 * 60;

export const settingsBudgetFor = (s: Settings, day: Date): number =>
  s.budgetByWeekday[weekday(day)] ?? s.dailyBudgetMin;

/** Quiet-hours end the app applies: hers if set, else wake. */
export const effectiveQuietEndMinute = (s: Settings): number => (s.quietEndSetByUser ? s.quietEndMinute : s.wakeMinute);

/** Sets wake; an unset quiet end keeps following wake. */
export const settingsWithWake = (s: Settings, minute: number): Settings => ({
  ...s,
  wakeMinute: minute,
  quietEndMinute: s.quietEndSetByUser ? s.quietEndMinute : minute,
});

/** Her own quiet-hours end. */
export const settingsWithQuietEnd = (s: Settings, minute: number): Settings => ({
  ...s,
  quietEndMinute: minute,
  quietEndSetByUser: true,
});

export const SettingsJ = {
  fromJson: (j: Json): Settings => {
    const budget: Record<number, number> = {};
    for (const [k, v] of Object.entries(jMap(j, 'budgetByWeekday'))) {
      const n = /^-?\d+$/.test(k) ? parseInt(k, 10) : 0;
      budget[n] = typeof v === 'number' ? Math.trunc(v) : 0;
    }
    return {
      language: enumFrom(APP_LANGUAGES, j['language'], 'ar'),
      theme: enumFrom(THEME_PREFS, j['theme'], 'system'),
      notificationCap: clamp(jInt(j, 'notificationCap', 4), 0, 6),
      quietStartMinute: jInt(j, 'quietStartMinute', 23 * 60),
      quietEndMinute: jInt(j, 'quietEndMinute', 6 * 60),
      quietEndSetByUser:
        'quietEndSetByUser' in j
          ? jBool(j, 'quietEndSetByUser')
          : legacyQuietEndSetByUser(jInt(j, 'quietEndMinute', 6 * 60), jInt(j, 'wakeMinute', 6 * 60)),
      wakeMinute: jInt(j, 'wakeMinute', 6 * 60),
      sleepMinute: jInt(j, 'sleepMinute', 23 * 60),
      prayerAnchorsEnabled: jBool(j, 'prayerAnchorsEnabled'),
      latitude: jDouble(j, 'latitude', kDefaultLatitude),
      longitude: jDouble(j, 'longitude', kDefaultLongitude),
      utcOffsetMinutes: jInt(j, 'utcOffsetMinutes', 180),
      timeZoneName: jStr(j, 'timeZoneName', 'Asia/Riyadh'),
      cycleModule: jBool(j, 'cycleModule'),
      aquariumModule: jBool(j, 'aquariumModule'),
      appLock: jBool(j, 'appLock'),
      forgivingStreak: jBool(j, 'forgivingStreak'),
      dailyBudgetMin: jInt(j, 'dailyBudgetMin', 150),
      budgetByWeekday: budget,
      ieltsWeakestSkill: enumFrom(IELTS_SKILLS, j['ieltsWeakestSkill'], 'writing'),
      weekStartsOn: jInt(j, 'weekStartsOn', SUNDAY),
      eveningShutdownBeforeSleepMin: jInt(j, 'eveningShutdownBeforeSleepMin', 90),
      onboardingDone: jBool(j, 'onboardingDone'),
      lastSeasonReview: jStrN(j, 'lastSeasonReview'),
      firstActionPin: jStrN(j, 'firstActionPin'),
      paydayDay: clamp(jInt(j, 'paydayDay', 1), 1, 31),
      planMode: enumFrom(PLAN_MODES, j['planMode'], 'suggest'),
      notificationsEnabled: jBool(j, 'notificationsEnabled'),
      reminderTimes: ((): Record<string, number> => {
        const out: Record<string, number> = {};
        for (const [k, v] of Object.entries(jMap(j, 'reminderTimes'))) {
          if (typeof v === 'number' && Number.isFinite(v)) out[k] = clamp(Math.trunc(v), 0, 1439);
        }
        return out;
      })(),
      quietHoursEnabled: jBool(j, 'quietHoursEnabled', true),
      lastBackupAt: jStrN(j, 'lastBackupAt'),
      displayName: jStr(j, 'displayName'),
      pausedRoutineSlots: Array.isArray(j['pausedRoutineSlots'])
        ? (j['pausedRoutineSlots'] as unknown[]).filter((x): x is ProductSlot => (PRODUCT_SLOTS as readonly unknown[]).includes(x))
        : [],
      paydayHistory: Array.isArray(j['paydayHistory'])
        ? (j['paydayHistory'] as unknown[])
            .filter((x): x is { until: string; day: number } =>
              x != null && typeof x === 'object' && typeof (x as Json)['until'] === 'string' && typeof (x as Json)['day'] === 'number')
            .map((x) => ({ until: x.until, day: clamp(Math.trunc(x.day), 1, 31) }))
            .sort((a, b) => (a.until < b.until ? -1 : a.until > b.until ? 1 : 0))
        : [],
      ...(() => {
        const extra = unknownSettingsKeys(j);
        return Object.keys(extra).length ? { extra } : {};
      })(),
    };
  },
  toJson: (s: Settings): Json => {
    const budget: Json = {};
    for (const [k, v] of Object.entries(s.budgetByWeekday)) budget[String(k)] = v;
    return {
      language: s.language, theme: s.theme, notificationCap: s.notificationCap,
      quietStartMinute: s.quietStartMinute, quietEndMinute: s.quietEndMinute,
      quietEndSetByUser: s.quietEndSetByUser, wakeMinute: s.wakeMinute, sleepMinute: s.sleepMinute,
      prayerAnchorsEnabled: s.prayerAnchorsEnabled, latitude: s.latitude, longitude: s.longitude,
      utcOffsetMinutes: s.utcOffsetMinutes, timeZoneName: s.timeZoneName, cycleModule: s.cycleModule,
      aquariumModule: s.aquariumModule, appLock: s.appLock,
      forgivingStreak: s.forgivingStreak, dailyBudgetMin: s.dailyBudgetMin, budgetByWeekday: budget,
      ieltsWeakestSkill: s.ieltsWeakestSkill, weekStartsOn: s.weekStartsOn,
      eveningShutdownBeforeSleepMin: s.eveningShutdownBeforeSleepMin, onboardingDone: s.onboardingDone,
      lastSeasonReview: s.lastSeasonReview, firstActionPin: s.firstActionPin,
      paydayDay: s.paydayDay, planMode: s.planMode, notificationsEnabled: s.notificationsEnabled,
      reminderTimes: { ...s.reminderTimes }, quietHoursEnabled: s.quietHoursEnabled, lastBackupAt: s.lastBackupAt,
      displayName: s.displayName, pausedRoutineSlots: [...s.pausedRoutineSlots],
      paydayHistory: (s.paydayHistory ?? []).map((r) => ({ until: r.until, day: r.day })),
      // unknown keys go first so they can never override a key this build owns
      ...Object.fromEntries(Object.entries(s.extra ?? {}).filter(([k]) => !knownSettingsKeys().has(k))),
    } as Json;
  },
};

let _knownSettingsKeys: Set<string> | null = null;
/** Every key this build writes for Settings (derived from toJson, so it can't drift). */
function knownSettingsKeys(): Set<string> {
  if (!_knownSettingsKeys) {
    _knownSettingsKeys = new Set(Object.keys(SettingsJ.toJson({ ...defaultSettings(), extra: {} }) as Record<string, unknown>));
  }
  return _knownSettingsKeys;
}

/** The part of a settings JSON object this build doesn't model. */
function unknownSettingsKeys(j: Json): Json {
  const known = knownSettingsKeys();
  const out: Record<string, Json> = {};
  for (const [k, v] of Object.entries(j as Record<string, Json>)) if (!known.has(k)) out[k] = v;
  return out as Json;
}

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

export interface LogEntry {
  id: string;
  itemId: string;
  kind: PlanItemKind;
  date: string;
  level: CompletionLevel;
  durationMin: number | null;
  enjoyment: number | null;
  note: string | null;
  /** ISO-8601 string (local, as written by Dart `toIso8601String`). */
  loggedAt: string | null;
  minuteOfDay: number | null;
}
export const makeLog = (p: Pick<LogEntry, 'id' | 'itemId' | 'kind' | 'date' | 'level'> & Partial<LogEntry>): LogEntry => ({
  durationMin: null, enjoyment: null, note: null, loggedAt: null, minuteOfDay: null, ...p,
});
export const logIsDone = (l: LogEntry): boolean => isDoneLevel(l.level);
export const LogEntryJ = {
  fromJson: (j: Json): LogEntry => ({
    id: jStr(j, 'id'),
    itemId: jStr(j, 'itemId'),
    kind: enumFrom(PLAN_ITEM_KINDS, j['kind'], 'habit'),
    date: jStr(j, 'date'),
    level: enumFrom(COMPLETION_LEVELS, j['level'], 'minimum'),
    durationMin: jIntN(j, 'durationMin'),
    enjoyment: jIntN(j, 'enjoyment'),
    note: jStrN(j, 'note'),
    loggedAt: jDate(j, 'loggedAt'),
    minuteOfDay: jIntN(j, 'minuteOfDay'),
  }),
  toJson: (l: LogEntry): Json => ({
    id: l.id, itemId: l.itemId, kind: l.kind, date: l.date, level: l.level, durationMin: l.durationMin,
    enjoyment: l.enjoyment, note: l.note, loggedAt: l.loggedAt, minuteOfDay: l.minuteOfDay,
  }),
};

export interface EnergyCheck {
  date: string;
  mode: EnergyMode;
  at: string | null;
}
export const EnergyCheckJ = {
  fromJson: (j: Json): EnergyCheck => ({
    date: jStr(j, 'date'),
    mode: enumFrom(ENERGY_MODES, j['mode'], 'green'),
    at: jDate(j, 'at'),
  }),
  toJson: (c: EnergyCheck): Json => ({ date: c.date, mode: c.mode, at: c.at }),
};

export interface StrengthCheck {
  id: string;
  habitId: string;
  date: string;
  /** [automatically, withoutRemembering, withoutThinking, beforeRealizing], each 1–5. */
  items: number[];
}
export const StrengthCheckJ = {
  fromJson: (j: Json): StrengthCheck => ({
    id: jStr(j, 'id'), habitId: jStr(j, 'habitId'), date: jStr(j, 'date'), items: jIntList(j, 'items'),
  }),
  toJson: (c: StrengthCheck): Json => ({ id: c.id, habitId: c.habitId, date: c.date, items: [...c.items] }),
};

export interface JoyItem {
  id: string;
  kind: JoyKind;
  titleAr: string;
  titleEn: string;
  size: JoySize;
  price: number | null;
  bundledHabitId: string | null;
  costsMoney: boolean;
  keepFree: boolean;
  active: boolean;
}
export const makeJoyItem = (p: Pick<JoyItem, 'id' | 'kind' | 'titleAr' | 'titleEn'> & Partial<JoyItem>): JoyItem => ({
  size: 'quick', price: null, bundledHabitId: null, costsMoney: false, keepFree: false, active: true, ...p,
});
export const JoyItemJ = {
  fromJson: (j: Json): JoyItem => ({
    id: jStr(j, 'id'),
    kind: enumFrom(JOY_KINDS, j['kind'], 'free'),
    titleAr: jStr(j, 'titleAr'),
    titleEn: jStr(j, 'titleEn'),
    size: enumFrom(JOY_SIZES, j['size'], 'quick'),
    price: jIntN(j, 'price'),
    bundledHabitId: jStrN(j, 'bundledHabitId'),
    costsMoney: jBool(j, 'costsMoney'),
    keepFree: jBool(j, 'keepFree'),
    active: jBool(j, 'active', true),
  }),
  toJson: (x: JoyItem): Json => ({
    id: x.id, kind: x.kind, titleAr: x.titleAr, titleEn: x.titleEn, size: x.size, price: x.price,
    bundledHabitId: x.bundledHabitId, costsMoney: x.costsMoney, keepFree: x.keepFree, active: x.active,
  }),
};

export interface SparkTxn {
  id: string;
  date: string;
  amount: number;
  reason: SparkReason;
  refId: string | null;
  at: string | null;
}
export const SparkTxnJ = {
  fromJson: (j: Json): SparkTxn => ({
    id: jStr(j, 'id'),
    date: jStr(j, 'date'),
    amount: jInt(j, 'amount'),
    reason: enumFrom(SPARK_REASONS, j['reason'], 'adjustment'),
    refId: jStrN(j, 'refId'),
    at: jDate(j, 'at'),
  }),
  toJson: (t: SparkTxn): Json => ({
    id: t.id, date: t.date, amount: t.amount, reason: t.reason, refId: t.refId, at: t.at,
  }),
};

export interface Experiment {
  id: string;
  habitId: string;
  titleAr: string;
  titleEn: string;
  variable: string;
  status: ExperimentStatus;
  startDate: string | null;
  endDate: string | null;
  lengthDays: number;
}
export const makeExperiment = (
  p: Pick<Experiment, 'id' | 'habitId' | 'titleAr' | 'titleEn' | 'variable'> & Partial<Experiment>,
): Experiment => ({ status: 'planned', startDate: null, endDate: null, lengthDays: 7, ...p });
export const ExperimentJ = {
  fromJson: (j: Json): Experiment => ({
    id: jStr(j, 'id'),
    habitId: jStr(j, 'habitId'),
    titleAr: jStr(j, 'titleAr'),
    titleEn: jStr(j, 'titleEn'),
    variable: jStr(j, 'variable'),
    status: enumFrom(EXPERIMENT_STATUSES, j['status'], 'planned'),
    startDate: jStrN(j, 'startDate'),
    endDate: jStrN(j, 'endDate'),
    lengthDays: jInt(j, 'lengthDays', 7),
  }),
  toJson: (e: Experiment): Json => ({
    id: e.id, habitId: e.habitId, titleAr: e.titleAr, titleEn: e.titleEn, variable: e.variable,
    status: e.status, startDate: e.startDate, endDate: e.endDate, lengthDays: e.lengthDays,
  }),
};

export interface NudgeRecord {
  id: string;
  itemId: string;
  date: string;
  response: NudgeResponse;
}
export const NudgeRecordJ = {
  fromJson: (j: Json): NudgeRecord => ({
    id: jStr(j, 'id'),
    itemId: jStr(j, 'itemId'),
    date: jStr(j, 'date'),
    response: enumFrom(NUDGE_RESPONSES, j['response'], 'ignored'),
  }),
  toJson: (r: NudgeRecord): Json => ({ id: r.id, itemId: r.itemId, date: r.date, response: r.response }),
};

// ---------------------------------------------------------------------------
// Modules
// ---------------------------------------------------------------------------

export interface VocabCard {
  id: string;
  front: string;
  back: string;
  example: string;
  ease: number;
  intervalDays: number;
  repetitions: number;
  due: string;
  lapses: number;
  lastReviewed: string | null;
}
export const VocabCardJ = {
  fromJson: (j: Json): VocabCard => ({
    id: jStr(j, 'id'),
    front: jStr(j, 'front'),
    back: jStr(j, 'back'),
    example: jStr(j, 'example'),
    ease: jDouble(j, 'ease', 2.5),
    intervalDays: jInt(j, 'intervalDays'),
    repetitions: jInt(j, 'repetitions'),
    due: jStr(j, 'due'),
    lapses: jInt(j, 'lapses'),
    lastReviewed: jStrN(j, 'lastReviewed'),
  }),
  toJson: (c: VocabCard): Json => ({
    id: c.id, front: c.front, back: c.back, example: c.example, ease: c.ease,
    intervalDays: c.intervalDays, repetitions: c.repetitions, due: c.due, lapses: c.lapses,
    lastReviewed: c.lastReviewed,
  }),
};

export interface MockTest {
  id: string;
  date: string;
  reading: number | null;
  listening: number | null;
  writing: number | null;
  speaking: number | null;
  note: string;
}
/** Weakest skill among entered bands (re-weights the rotation day, GROW-12). */
export function mockWeakest(m: MockTest): IeltsSkill | null {
  const e: [IeltsSkill, number][] = [];
  if (m.reading != null) e.push(['reading', m.reading]);
  if (m.listening != null) e.push(['listening', m.listening]);
  if (m.writing != null) e.push(['writing', m.writing]);
  if (m.speaking != null) e.push(['speaking', m.speaking]);
  if (e.length === 0) return null;
  return [...e].sort((a, b) => cmpNum(a[1], b[1]))[0]![0];
}
export const MockTestJ = {
  fromJson: (j: Json): MockTest => ({
    id: jStr(j, 'id'),
    date: jStr(j, 'date'),
    reading: jDoubleN(j, 'reading'),
    listening: jDoubleN(j, 'listening'),
    writing: jDoubleN(j, 'writing'),
    speaking: jDoubleN(j, 'speaking'),
    note: jStr(j, 'note'),
  }),
  toJson: (m: MockTest): Json => ({
    id: m.id, date: m.date, reading: m.reading, listening: m.listening, writing: m.writing,
    speaking: m.speaking, note: m.note,
  }),
};

export interface DrivingSession {
  id: string;
  date: string;
  minutes: number;
  conditions: string[];
  supervised: boolean;
  kind: string;
  note: string;
}
export const DrivingSessionJ = {
  fromJson: (j: Json): DrivingSession => ({
    id: jStr(j, 'id'),
    date: jStr(j, 'date'),
    minutes: jInt(j, 'minutes'),
    conditions: jStrList(j, 'conditions'),
    supervised: jBool(j, 'supervised', true),
    kind: jStr(j, 'kind', 'practice'),
    note: jStr(j, 'note'),
  }),
  toJson: (d: DrivingSession): Json => ({
    id: d.id, date: d.date, minutes: d.minutes, conditions: [...d.conditions], supervised: d.supervised,
    kind: d.kind, note: d.note,
  }),
};

export interface MoneyEnvelope {
  id: string;
  titleAr: string;
  titleEn: string;
  /** `yyyy-MM` — the budget month (with payday ≠ 1: the month the cycle starts in). */
  month: string;
  planned: number;
  spent: number;
}
export const envelopeRemaining = (e: MoneyEnvelope): number => e.planned - e.spent;
export const MoneyEnvelopeJ = {
  fromJson: (j: Json): MoneyEnvelope => ({
    id: jStr(j, 'id'),
    titleAr: jStr(j, 'titleAr'),
    titleEn: jStr(j, 'titleEn'),
    month: jStr(j, 'month'),
    planned: jDouble(j, 'planned'),
    spent: jDouble(j, 'spent'),
  }),
  toJson: (e: MoneyEnvelope): Json => ({
    id: e.id, titleAr: e.titleAr, titleEn: e.titleEn, month: e.month, planned: e.planned, spent: e.spent,
  }),
};

export interface Bill {
  id: string;
  title: string;
  amount: number;
  dueDay: number;
  isSubscription: boolean;
  active: boolean;
  /** Paid occurrences: due dates (`yyyy-MM-dd`), or legacy budget-cycle keys (`yyyy-MM`). */
  paidCycles?: string[];
}
export const BillJ = {
  fromJson: (j: Json): Bill => ({
    id: jStr(j, 'id'),
    title: jStr(j, 'title'),
    amount: jDouble(j, 'amount'),
    dueDay: jInt(j, 'dueDay', 1),
    isSubscription: jBool(j, 'isSubscription'),
    active: jBool(j, 'active', true),
    paidCycles: Array.isArray(j['paidCycles']) ? (j['paidCycles'] as unknown[]).filter((x): x is string => typeof x === 'string') : [],
  }),
  toJson: (b: Bill): Json => ({
    id: b.id, title: b.title, amount: b.amount, dueDay: b.dueDay, isSubscription: b.isSubscription, active: b.active,
    paidCycles: [...(b.paidCycles ?? [])],
  }),
};

export interface BnplItem {
  id: string;
  title: string;
  provider: string;
  instalmentAmount: number;
  dueDates: string[];
  paidDates: string[];
}
export const bnplNextDue = (b: BnplItem): string | null => b.dueDates.find((d) => !b.paidDates.includes(d)) ?? null;
export const BnplItemJ = {
  fromJson: (j: Json): BnplItem => ({
    id: jStr(j, 'id'),
    title: jStr(j, 'title'),
    provider: jStr(j, 'provider'),
    instalmentAmount: jDouble(j, 'instalmentAmount'),
    dueDates: jStrList(j, 'dueDates'),
    paidDates: jStrList(j, 'paidDates'),
  }),
  toJson: (b: BnplItem): Json => ({
    id: b.id, title: b.title, provider: b.provider, instalmentAmount: b.instalmentAmount,
    dueDates: [...b.dueDates], paidDates: [...b.paidDates],
  }),
};

export interface WishItem {
  id: string;
  title: string;
  addedDate: string;
  price: number | null;
  coolingOffDays: number;
  /** null (waiting), `bought`, `dropped`. */
  decision: string | null;
}
export const WishItemJ = {
  fromJson: (j: Json): WishItem => ({
    id: jStr(j, 'id'),
    title: jStr(j, 'title'),
    addedDate: jStr(j, 'addedDate'),
    price: jDoubleN(j, 'price'),
    coolingOffDays: jInt(j, 'coolingOffDays', 7),
    decision: jStrN(j, 'decision'),
  }),
  toJson: (w: WishItem): Json => ({
    id: w.id, title: w.title, addedDate: w.addedDate, price: w.price, coolingOffDays: w.coolingOffDays,
    decision: w.decision,
  }),
};

export interface AdminDoc {
  id: string;
  name: string;
  expiry: string | null;
  remindDaysBefore: number;
  note: string;
}
export const AdminDocJ = {
  fromJson: (j: Json): AdminDoc => ({
    id: jStr(j, 'id'),
    name: jStr(j, 'name'),
    expiry: jStrN(j, 'expiry'),
    remindDaysBefore: jInt(j, 'remindDaysBefore', 30),
    note: jStr(j, 'note'),
  }),
  toJson: (d: AdminDoc): Json => ({
    id: d.id, name: d.name, expiry: d.expiry, remindDaysBefore: d.remindDaysBefore, note: d.note,
  }),
};

// ---------------------------------------------------------------------------
// Extras (UI-2)
// ---------------------------------------------------------------------------

export interface ModuleState {
  drivingStepsDone: number[];
  drivingServiceLink: string;
  ieltsFeedbackChecks: string[];
  homeZoneOffset: number;
  autoSaveDay: number | null;
  autoSaveMinute: number;
  freshStartDismissed: string | null;
  resetMinutes: number;
}
export const defaultModuleState = (): ModuleState => ({
  drivingStepsDone: [], drivingServiceLink: '', ieltsFeedbackChecks: [], homeZoneOffset: 0,
  autoSaveDay: null, autoSaveMinute: 9 * 60, freshStartDismissed: null, resetMinutes: 10,
});
export const ModuleStateJ = {
  fromJson: (j: Json): ModuleState => ({
    drivingStepsDone: jIntList(j, 'drivingStepsDone'),
    drivingServiceLink: jStr(j, 'drivingServiceLink'),
    ieltsFeedbackChecks: jStrList(j, 'ieltsFeedbackChecks'),
    homeZoneOffset: jInt(j, 'homeZoneOffset'),
    autoSaveDay: jIntN(j, 'autoSaveDay'),
    autoSaveMinute: jInt(j, 'autoSaveMinute', 9 * 60),
    freshStartDismissed: jStrN(j, 'freshStartDismissed'),
    resetMinutes: jInt(j, 'resetMinutes', 10),
  }),
  toJson: (m: ModuleState): Json => ({
    drivingStepsDone: [...m.drivingStepsDone], drivingServiceLink: m.drivingServiceLink,
    ieltsFeedbackChecks: [...m.ieltsFeedbackChecks], homeZoneOffset: m.homeZoneOffset,
    autoSaveDay: m.autoSaveDay, autoSaveMinute: m.autoSaveMinute,
    freshStartDismissed: m.freshStartDismissed, resetMinutes: m.resetMinutes,
  }),
};

export interface Errand {
  id: string;
  title: string;
  done: boolean;
  addedDate: string | null;
}
export const ErrandJ = {
  fromJson: (j: Json): Errand => ({
    id: jStr(j, 'id'), title: jStr(j, 'title'), done: jBool(j, 'done'), addedDate: jStrN(j, 'addedDate'),
  }),
  toJson: (e: Errand): Json => ({ id: e.id, title: e.title, done: e.done, addedDate: e.addedDate }),
};

/** Private cycle log entry (sensitive module, local only). kind: start | end | note. */
export interface CycleEntry {
  id: string;
  date: string;
  kind: string;
  note: string;
}
export const CycleEntryJ = {
  fromJson: (j: Json): CycleEntry => ({
    id: jStr(j, 'id'), date: jStr(j, 'date'), kind: jStr(j, 'kind', 'note'), note: jStr(j, 'note'),
  }),
  toJson: (e: CycleEntry): Json => ({ id: e.id, date: e.date, kind: e.kind, note: e.note }),
};

export interface WeeklyReviewRecord {
  /** Week key = day key of the week start. */
  id: string;
  date: string;
  chapterTitle: string;
  wins: string[];
  blockers: string[];
  top3: string[];
  experimentId: string | null;
  durationSec: number | null;
}
export const WeeklyReviewRecordJ = {
  fromJson: (j: Json): WeeklyReviewRecord => ({
    id: jStr(j, 'id'),
    date: jStr(j, 'date'),
    chapterTitle: jStr(j, 'chapterTitle'),
    wins: jStrList(j, 'wins'),
    blockers: jStrList(j, 'blockers'),
    top3: jStrList(j, 'top3'),
    experimentId: jStrN(j, 'experimentId'),
    durationSec: jIntN(j, 'durationSec'),
  }),
  toJson: (r: WeeklyReviewRecord): Json => ({
    id: r.id, date: r.date, chapterTitle: r.chapterTitle, wins: [...r.wins], blockers: [...r.blockers],
    top3: [...r.top3], experimentId: r.experimentId, durationSec: r.durationSec,
  }),
};

// ---------------------------------------------------------------------------
// Web-only: tasks, inbox, products
// ---------------------------------------------------------------------------

export const TASK_STATUSES = ['inbox', 'planned', 'in_progress', 'done', 'postponed', 'cancelled'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

/** A one-off task she captured. Only `title` is required. */
export interface TaskItem {
  id: string;
  title: string;
  notes: string;
  domain: DomainId | null;
  status: TaskStatus;
  /** Day key she planned it for (null = unscheduled). */
  dueDate: string | null;
  /** Minute of day (optional). */
  time: number | null;
  projectId: string | null;
  /** Day key it was postponed to (status `postponed`; null = «بعدين» without a date). */
  postponedTo: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  sortOrder: number;
  /** Inbox item it came from (provenance). */
  sourceInboxId: string | null;
  /** Project step this task carries out («حطيها لليوم») — completing one completes the other. */
  projectStepId: string | null;
}
export const makeTask = (p: Pick<TaskItem, 'id' | 'title' | 'createdAt'> & Partial<TaskItem>): TaskItem => ({
  notes: '', domain: null, status: 'inbox', dueDate: null, time: null, projectId: null, postponedTo: null,
  updatedAt: p.createdAt, completedAt: null, sortOrder: 0, sourceInboxId: null, projectStepId: null, ...p,
});
export const TaskItemJ = {
  fromJson: (j: Json): TaskItem => ({
    id: jStr(j, 'id'),
    title: jStr(j, 'title'),
    notes: jStr(j, 'notes'),
    domain: j['domain'] == null ? null : enumFrom(DOMAIN_IDS, j['domain'], 'admin'),
    status: enumFrom(TASK_STATUSES, j['status'], 'inbox'),
    dueDate: jStrN(j, 'dueDate'),
    time: jIntN(j, 'time'),
    projectId: jStrN(j, 'projectId'),
    postponedTo: jStrN(j, 'postponedTo'),
    createdAt: jStr(j, 'createdAt'),
    updatedAt: jStr(j, 'updatedAt'),
    completedAt: jStrN(j, 'completedAt'),
    sortOrder: jInt(j, 'sortOrder'),
    sourceInboxId: jStrN(j, 'sourceInboxId'),
    projectStepId: jStrN(j, 'projectStepId'),
  }),
  toJson: (t: TaskItem): Json => ({
    id: t.id, title: t.title, notes: t.notes, domain: t.domain, status: t.status, dueDate: t.dueDate,
    time: t.time, projectId: t.projectId, postponedTo: t.postponedTo, createdAt: t.createdAt,
    updatedAt: t.updatedAt, completedAt: t.completedAt, sortOrder: t.sortOrder, sourceInboxId: t.sourceInboxId,
    projectStepId: t.projectStepId,
  }),
};

export const INBOX_KINDS = ['task', 'idea', 'note', 'link', 'potential_project'] as const;
export type InboxKind = (typeof INBOX_KINDS)[number];

/** Something captured but not yet sorted. */
export interface InboxItem {
  id: string;
  kind: InboxKind;
  title: string;
  body: string;
  url: string | null;
  createdAt: string;
  archived: boolean;
  /** Set once converted: what it became. */
  convertedTo: { type: 'task' | 'project' | 'note'; id: string } | null;
  /** Where it came from (e.g. an imported file name); null = typed in the app. */
  source: string | null;
}
export const makeInboxItem = (p: Pick<InboxItem, 'id' | 'title' | 'createdAt'> & Partial<InboxItem>): InboxItem => ({
  kind: 'task', body: '', url: null, archived: false, convertedTo: null, source: null, ...p,
});
export const InboxItemJ = {
  fromJson: (j: Json): InboxItem => {
    const c = jMap(j, 'convertedTo');
    const t = c['type'];
    return {
      id: jStr(j, 'id'),
      kind: enumFrom(INBOX_KINDS, j['kind'], 'task'),
      title: jStr(j, 'title'),
      body: jStr(j, 'body'),
      url: jStrN(j, 'url'),
      createdAt: jStr(j, 'createdAt'),
      archived: jBool(j, 'archived'),
      convertedTo:
        t === 'task' || t === 'project' || t === 'note' ? { type: t, id: jStr(c, 'id') } : null,
      source: jStrN(j, 'source'),
    };
  },
  toJson: (i: InboxItem): Json => ({
    id: i.id, kind: i.kind, title: i.title, body: i.body, url: i.url, createdAt: i.createdAt,
    archived: i.archived, convertedTo: i.convertedTo == null ? null : { ...i.convertedTo }, source: i.source,
  }),
};

export const PRODUCT_SLOTS = ['am', 'pm', 'weekly'] as const;
export type ProductSlot = (typeof PRODUCT_SLOTS)[number];

export const PRODUCT_CATEGORIES = [
  'cleanser', 'toner', 'serum', 'moisturizer', 'sunscreen', 'shampoo', 'conditioner', 'heat_protectant',
  'hair_oil', 'toothpaste', 'floss', 'mouthwash', 'mask', 'exfoliant', 'body', 'other',
] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

/** One of her care products; active AM/PM products generate the AM/PM care routines. */
export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  slot: ProductSlot;
  /** Step order within its slot (ascending). */
  order: number;
  active: boolean;
  notes: string;
  /** True for the generic placeholders the app seeds (she edits/renames them). */
  placeholder: boolean;
}
export const makeProduct = (p: Pick<Product, 'id' | 'name' | 'category' | 'slot'> & Partial<Product>): Product => ({
  order: 0, active: true, notes: '', placeholder: false, ...p,
});
export const ProductJ = {
  fromJson: (j: Json): Product => ({
    id: jStr(j, 'id'),
    name: jStr(j, 'name'),
    category: enumFrom(PRODUCT_CATEGORIES, j['category'], 'other'),
    slot: enumFrom(PRODUCT_SLOTS, j['slot'], 'am'),
    order: jInt(j, 'order'),
    active: jBool(j, 'active', true),
    notes: jStr(j, 'notes'),
    placeholder: jBool(j, 'placeholder'),
  }),
  toJson: (p: Product): Json => ({
    id: p.id, name: p.name, category: p.category, slot: p.slot, order: p.order, active: p.active,
    notes: p.notes, placeholder: p.placeholder,
  }),
};
