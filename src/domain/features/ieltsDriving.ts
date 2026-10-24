/**
 * IELTS stats + driving extras (area F).
 *
 * Everything here is OWNER-ENTERED. The app ships no official driving procedure, no question bank,
 * no hazard clips and no band descriptors: it only gives her the mechanisms (a checklist she edits,
 * questions she adds, links/notes she saves). Stored as one optional JSON blob inside
 * `ModuleState.ieltsDriving` so export/import (schemaVersion 1) and the vault carry it with no new box.
 */
import { addDays, clamp, cmpStr, dayKey, daysBetween, parseDayKey } from '../core/dates';
import { asJson, jBool, jInt, jIntN, jList, jStr, jStrList, type Json } from '../core/json';
import { isDoneLevel, type VocabCard } from '../models';
import { reviewCard } from '../engine/vocabSrs';
import type { LifeSnapshot } from '../snapshot';

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

export interface IeltsGoals {
  /** Band she aims for (0–9, halves). null = not entered. */
  targetBand: number | null;
  /** Her own current level (0–9, halves). null = not entered — never inferred. */
  currentBand: number | null;
  /** Optional: how many practice days out of the last 30 she wants. null = no goal set. */
  commitDays: number | null;
}

/** `guide` = app guidance (no claim about the official process); `official` = something she wrote from a source. */
export type RoadStepKind = 'guide' | 'official';
export interface RoadStep {
  id: string;
  kind: RoadStepKind;
  title: string;
  note: string;
  /** http(s) link to the source she used ('' = none). */
  link: string;
  done: boolean;
  /** She compared it with the official source. Only meaningful for `official` steps. */
  verified: boolean;
}
export interface RoadStage {
  id: string;
  title: string;
  steps: RoadStep[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  choices: string[];
  /** Index into `choices`. */
  answer: number;
  explanation: string;
  /** Where she took it from (free text, hers). */
  source: string;
  // spaced-repetition state (same fields as VocabCard so the SM-2 engine is reused)
  ease: number;
  intervalDays: number;
  repetitions: number;
  due: string;
  lapses: number;
  lastReviewed: string | null;
}

export interface HazardItem {
  id: string;
  title: string;
  /** Her own link (http/https) or '' for a note-only item. */
  link: string;
  note: string;
}
export interface HazardWatch {
  id: string;
  itemId: string;
  date: string;
}

export interface IeltsDrivingData {
  ielts: IeltsGoals;
  road: RoadStage[];
  quiz: QuizQuestion[];
  hazards: HazardItem[];
  hazardLog: HazardWatch[];
  /** Optional weekly goal for hazard practice. null = none. */
  hazardWeeklyGoal: number | null;
  /** Practice-condition labels. null = the generic presets. */
  conditions: string[] | null;
  /** Fully user-entered extra fields we don't know yet survive a round trip. */
  extra: Json;
}

export const ROAD_CONFIRM_STAGE_ID = 'road_confirm';
export const MAX_TEXT = 400;
export const MAX_ITEMS = 300;

/** Generic practice variety — categories of conditions, not official requirements. */
export const DEFAULT_CONDITIONS: readonly string[] = ['ليل', 'مطر أو غبار', 'طريق سريع', 'زحمة'];

/** Stage 1: asks her to confirm the official path. It states no procedure, hours or fees. */
export function defaultRoad(): RoadStage[] {
  return [
    {
      id: ROAD_CONFIRM_STAGE_ID,
      title: 'تأكيد المسار الرسمي',
      steps: [
        { id: 'road_confirm_1', kind: 'guide', title: 'افتحي صفحة الخدمة الرسمية واحفظي رابطها هنا', note: '', link: '', done: false, verified: false },
        { id: 'road_confirm_2', kind: 'guide', title: 'اكتبي الخطوات وعدد الساعات والرسوم كما تظهر لك في المصدر الرسمي ومدرسة القيادة', note: '', link: '', done: false, verified: false },
      ],
    },
  ];
}

export const defaultIeltsDriving = (): IeltsDrivingData => ({
  ielts: { targetBand: null, currentBand: null, commitDays: null },
  road: defaultRoad(),
  quiz: [],
  hazards: [],
  hazardLog: [],
  hazardWeeklyGoal: null,
  conditions: null,
  extra: {},
});

// ---------------------------------------------------------------------------
// Sanitising helpers
// ---------------------------------------------------------------------------

export const cleanText = (s: unknown, max = MAX_TEXT): string => (typeof s === 'string' ? s.trim().slice(0, max) : '');

/** Only http(s) links are kept (no javascript:, data:, etc.). Returns '' for anything else. */
export function safeLink(raw: string): string {
  const t = raw.trim();
  if (!t) return '';
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(t) ? t : `https://${t}`;
  try {
    const u = new URL(withScheme);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : '';
  } catch {
    return '';
  }
}

/** Band 0–9 in halves; null when blank/invalid. Rounds to the nearest half. */
export function parseBand(v: string | number | null | undefined): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace('٫', '.').replace(',', '.').trim());
  if (!Number.isFinite(n) || n < 0 || n > 9) return null;
  return Math.round(n * 2) / 2;
}

const bandN = (j: Json, k: string): number | null => (typeof j[k] === 'number' ? parseBand(j[k] as number) : null);

// ---------------------------------------------------------------------------
// (De)serialisation — tolerant: anything malformed falls back to defaults
// ---------------------------------------------------------------------------

const stepFromJson = (j: Json): RoadStep => ({
  id: jStr(j, 'id'),
  kind: j['kind'] === 'official' ? 'official' : 'guide',
  title: cleanText(j['title'], 200),
  note: cleanText(j['note'], 1000),
  link: safeLink(jStr(j, 'link')),
  done: jBool(j, 'done'),
  verified: jBool(j, 'verified'),
});

const quizFromJson = (j: Json): QuizQuestion => {
  const choices = jStrList(j, 'choices').map((c) => cleanText(c, 200)).filter(Boolean).slice(0, 4);
  const raw = typeof j['ease'] === 'number' ? (j['ease'] as number) : 2.5;
  return {
    id: jStr(j, 'id'),
    question: cleanText(j['question'], 600),
    choices,
    answer: clamp(jInt(j, 'answer'), 0, Math.max(0, choices.length - 1)),
    explanation: cleanText(j['explanation'], 1000),
    source: cleanText(j['source'], 300),
    ease: Number.isFinite(raw) ? raw : 2.5,
    intervalDays: jInt(j, 'intervalDays'),
    repetitions: jInt(j, 'repetitions'),
    due: jStr(j, 'due'),
    lapses: jInt(j, 'lapses'),
    lastReviewed: typeof j['lastReviewed'] === 'string' && j['lastReviewed'] ? (j['lastReviewed'] as string) : null,
  };
};

export const IeltsDrivingJ = {
  fromJson(raw: unknown): IeltsDrivingData {
    const j = asJson(raw);
    if (Object.keys(j).length === 0) return defaultIeltsDriving();
    const ij = asJson(j['ielts']);
    const commit = jIntN(ij, 'commitDays');
    const hg = jIntN(j, 'hazardWeeklyGoal');
    const hasRoad = Array.isArray(j['road']);
    const road = hasRoad
      ? jList(j, 'road', (s): RoadStage => ({ id: jStr(s, 'id'), title: cleanText(s['title'], 120), steps: jList(s, 'steps', stepFromJson).filter((x) => x.id && x.title) })).filter((s) => s.id && s.title)
      : defaultRoad();
    const conds = Array.isArray(j['conditions']) ? jStrList(j, 'conditions').map((c) => cleanText(c, 40)).filter(Boolean) : null;
    const known = new Set(['ielts', 'road', 'quiz', 'hazards', 'hazardLog', 'hazardWeeklyGoal', 'conditions']);
    return {
      ielts: { targetBand: bandN(ij, 'targetBand'), currentBand: bandN(ij, 'currentBand'), commitDays: commit == null ? null : clamp(commit, 1, 30) },
      road,
      quiz: jList(j, 'quiz', quizFromJson).filter((q) => q.id && q.question && q.choices.length >= 2),
      hazards: jList(j, 'hazards', (h): HazardItem => ({ id: jStr(h, 'id'), title: cleanText(h['title'], 200), link: safeLink(jStr(h, 'link')), note: cleanText(h['note'], 1000) })).filter((h) => h.id && (h.title || h.link || h.note)),
      hazardLog: jList(j, 'hazardLog', (h): HazardWatch => ({ id: jStr(h, 'id'), itemId: jStr(h, 'itemId'), date: jStr(h, 'date') })).filter((h) => h.id && h.date),
      hazardWeeklyGoal: hg == null ? null : clamp(hg, 1, 14),
      conditions: conds,
      extra: Object.fromEntries(Object.entries(j).filter(([k]) => !known.has(k))),
    };
  },
  toJson(d: IeltsDrivingData): Json {
    return JSON.parse(
      JSON.stringify({
        ...d.extra,
        ielts: d.ielts,
        road: d.road,
        quiz: d.quiz,
        hazards: d.hazards,
        hazardLog: d.hazardLog,
        hazardWeeklyGoal: d.hazardWeeklyGoal,
        conditions: d.conditions,
      }),
    ) as Json;
  },
};

// ---------------------------------------------------------------------------
// IELTS: practice days, this-month sessions, 30-day commitment
// ---------------------------------------------------------------------------

/**
 * Days with IELTS practice on record: a finished IELTS habit / weekly task, a logged mock test,
 * or the latest vocab review of a card (older reviews of the same card aren't kept, so this
 * can under-count — it never over-counts).
 */
export function ieltsPracticeDays(s: Pick<LifeSnapshot, 'habits' | 'weeklyTasks' | 'logs' | 'mockTests' | 'vocabCards'>): Set<string> {
  const ids = new Set<string>([
    ...s.habits.filter((h) => h.domain === 'ielts').map((h) => h.id),
    ...s.weeklyTasks.filter((w) => w.domain === 'ielts').map((w) => w.id),
  ]);
  const days = new Set<string>();
  for (const l of s.logs) if (ids.has(l.itemId) && isDoneLevel(l.level)) days.add(l.date);
  for (const m of s.mockTests) if (m.date) days.add(m.date);
  for (const c of s.vocabCards as VocabCard[]) if (c.lastReviewed) days.add(c.lastReviewed);
  return days;
}

/** Practice days inside the calendar month of [today] (up to and including today). */
export function ieltsSessionsThisMonth(days: ReadonlySet<string>, today: Date): number {
  const prefix = dayKey(today).slice(0, 7);
  const k = dayKey(today);
  let n = 0;
  for (const d of days) if (d.startsWith(prefix) && cmpStr(d, k) <= 0) n++;
  return n;
}

export interface Commitment {
  /** Practice days within the last 30 days (today included). */
  practiced: number;
  windowDays: 30;
  /** Her own optional goal; null when she hasn't set one. */
  goal: number | null;
  /** 0…1 against her goal (or against the 30-day window when no goal). */
  ratio: number;
  /** Practice days in the current week (for the dots). */
  thisWeek: string[];
}
export function ieltsCommitment(days: ReadonlySet<string>, today: Date, goal: number | null, weekStart: Date): Commitment {
  let practiced = 0;
  for (let i = 0; i < 30; i++) if (days.has(dayKey(addDays(today, -i)))) practiced++;
  const denom = goal ?? 30;
  const thisWeek: string[] = [];
  for (let i = 0; i < 7; i++) {
    const k = dayKey(addDays(weekStart, i));
    if (days.has(k)) thisWeek.push(k);
  }
  return { practiced, windowDays: 30, goal, ratio: clamp(practiced / denom, 0, 1), thisWeek };
}

// ---------------------------------------------------------------------------
// Driving road
// ---------------------------------------------------------------------------

export interface RoadProgress {
  /** 1-based index of the stage she's on (all done → last). */
  current: number;
  total: number;
  doneSteps: number;
  totalSteps: number;
  allDone: boolean;
  /** Steps she wrote from a source and hasn't confirmed yet. */
  unverified: number;
}
export function roadProgress(road: readonly RoadStage[]): RoadProgress {
  const total = road.length;
  const idx = road.findIndex((st) => st.steps.some((x) => !x.done) || st.steps.length === 0);
  const all = road.flatMap((s) => s.steps);
  return {
    current: idx === -1 ? Math.max(1, total) : idx + 1,
    total,
    doneSteps: all.filter((x) => x.done).length,
    totalSteps: all.length,
    allDone: total > 0 && idx === -1,
    unverified: all.filter((x) => x.kind === 'official' && !x.verified).length,
  };
}

// ---------------------------------------------------------------------------
// Driving: conditions variety
// ---------------------------------------------------------------------------

export const conditionList = (d: IeltsDrivingData): string[] => (d.conditions ? [...d.conditions] : [...DEFAULT_CONDITIONS]);

export interface PracticeLogStats {
  sessions: number;
  minutes: number;
  tried: string[];
  total: number;
}
/** Supervised/practice log: sessions, minutes, and how many of her listed conditions she has tried. */
export function practiceStats(sessions: readonly { kind: string; minutes: number; conditions: string[] }[], list: readonly string[]): PracticeLogStats {
  const practice = sessions.filter((x) => x.kind === 'practice');
  const used = new Set(practice.flatMap((x) => x.conditions));
  return {
    sessions: practice.length,
    minutes: practice.reduce((a, x) => a + (Number.isFinite(x.minutes) ? x.minutes : 0), 0),
    tried: list.filter((c) => used.has(c)),
    total: list.length,
  };
}

// ---------------------------------------------------------------------------
// Driving: spaced theory quiz (owner-added questions; SM-2 reused)
// ---------------------------------------------------------------------------

export function newQuizQuestion(o: { id: string; question: string; choices: string[]; answer: number; explanation?: string; source?: string; today: Date }): QuizQuestion | null {
  const question = cleanText(o.question, 600);
  const choices = o.choices.map((c) => cleanText(c, 200)).filter(Boolean).slice(0, 4);
  if (!question || choices.length < 2) return null;
  // answer index refers to the ORIGINAL list; remap through the blank filter
  const nonBlank = o.choices.map((c, i) => [cleanText(c, 200), i] as const).filter(([c]) => c);
  const mapped = nonBlank.findIndex(([, i]) => i === o.answer);
  if (mapped < 0 || mapped > 3) return null;
  return {
    id: o.id, question, choices, answer: mapped, explanation: cleanText(o.explanation, 1000), source: cleanText(o.source, 300),
    ease: 2.5, intervalDays: 0, repetitions: 0, due: dayKey(o.today), lapses: 0, lastReviewed: null,
  };
}

/** Right → «good» (4), wrong → «again» (1): a missed question is back tomorrow, then after days. */
export function reviewQuiz(q: QuizQuestion, correct: boolean, today: Date): QuizQuestion {
  const r = reviewCard(
    { id: q.id, front: '', back: '', example: '', ease: q.ease, intervalDays: q.intervalDays, repetitions: q.repetitions, due: q.due, lapses: q.lapses, lastReviewed: q.lastReviewed },
    correct ? 4 : 1,
    today,
  );
  return { ...q, ease: r.ease, intervalDays: r.intervalDays, repetitions: r.repetitions, due: r.due, lapses: r.lapses, lastReviewed: r.lastReviewed };
}

export const kQuizRound = 10;
/** Due questions, most overdue first, at most one round. */
export function quizRound(quiz: readonly QuizQuestion[], today: Date, size = kQuizRound): QuizQuestion[] {
  const k = dayKey(today);
  return quiz.filter((q) => cmpStr(q.due, k) <= 0).sort((a, b) => cmpStr(a.due, b.due) || cmpStr(a.id, b.id)).slice(0, size);
}
export const quizDueCount = (quiz: readonly QuizQuestion[], today: Date): number => {
  const k = dayKey(today);
  return quiz.filter((q) => cmpStr(q.due, k) <= 0).length;
};
/** Earliest future due date among questions not due now (null = none waiting). */
export function nextQuizDate(quiz: readonly QuizQuestion[], today: Date): string | null {
  const k = dayKey(today);
  const future = quiz.map((q) => q.due).filter((d) => cmpStr(d, k) > 0).sort(cmpStr);
  return future[0] ?? null;
}

// ---------------------------------------------------------------------------
// Driving: hazard-perception practice (her own links/notes)
// ---------------------------------------------------------------------------

/** Watches logged in the week that starts at [weekStart] (7 days). */
export function hazardWeekCount(log: readonly HazardWatch[], weekStart: Date): number {
  const keys = new Set(Array.from({ length: 7 }, (_, i) => dayKey(addDays(weekStart, i))));
  return log.filter((w) => keys.has(w.date)).length;
}

/** Whole days from [from] to [to] (day keys); used for gentle «last time» text. */
export const daysSince = (from: string, to: Date): number => daysBetween(parseDayKey(from), to);
