/**
 * Actions for area F. They only use the public LifeStore API (snapshot + updateModuleState), so the
 * data rides the existing persistence, vault and export/import. Every action returns an `undo`.
 */
import { dayKey } from '../core/dates';
import type { Json } from '../core/json';
import type { LifeStore } from '../store';
import {
  IeltsDrivingJ, cleanText, conditionList, newQuizQuestion, parseBand, reviewQuiz, safeLink, defaultIeltsDriving,
  MAX_ITEMS, type HazardItem, type IeltsDrivingData, type IeltsGoals, type QuizQuestion, type RoadStage, type RoadStep,
} from './ieltsDriving';

export type Undo = () => Promise<void>;

export const readIeltsDriving = (store: Pick<LifeStore, 'getSnapshot'>): IeltsDrivingData => IeltsDrivingJ.fromJson(store.getSnapshot().moduleState.ieltsDriving);

/** Applies [fn] to the current data and saves it; returns an undo that restores exactly the previous blob. */
export async function mutateIeltsDriving(store: Pick<LifeStore, 'getSnapshot' | 'updateModuleState'>, fn: (d: IeltsDrivingData) => IeltsDrivingData): Promise<Undo> {
  const prevRaw: Json = store.getSnapshot().moduleState.ieltsDriving ?? {};
  const next = fn(IeltsDrivingJ.fromJson(prevRaw));
  const m = store.getSnapshot().moduleState;
  await store.updateModuleState({ ...m, ieltsDriving: IeltsDrivingJ.toJson(next) });
  return async () => {
    const cur = store.getSnapshot().moduleState;
    await store.updateModuleState({ ...cur, ieltsDriving: prevRaw });
  };
}

type S = Pick<LifeStore, 'getSnapshot' | 'updateModuleState' | 'newId'>;
const mapStage = (d: IeltsDrivingData, stageId: string, f: (s: RoadStage) => RoadStage): IeltsDrivingData => ({ ...d, road: d.road.map((s) => (s.id === stageId ? f(s) : s)) });

// ---- IELTS goals -----------------------------------------------------------------
export function setIeltsGoals(store: S, g: Partial<IeltsGoals>) {
  return mutateIeltsDriving(store, (d) => ({
    ...d,
    ielts: {
      targetBand: g.targetBand === undefined ? d.ielts.targetBand : g.targetBand == null ? null : parseBand(g.targetBand),
      currentBand: g.currentBand === undefined ? d.ielts.currentBand : g.currentBand == null ? null : parseBand(g.currentBand),
      commitDays: g.commitDays === undefined ? d.ielts.commitDays : g.commitDays == null ? null : Math.max(1, Math.min(30, Math.round(g.commitDays))),
    },
  }));
}

// ---- road --------------------------------------------------------------------------
export const addRoadStage = (store: S, title: string) => {
  const t = cleanText(title, 120);
  if (!t) return Promise.resolve(null);
  const id = store.newId('rstg');
  return mutateIeltsDriving(store, (d) => (d.road.length >= 20 ? d : { ...d, road: [...d.road, { id, title: t, steps: [] }] }));
};
export const renameRoadStage = (store: S, stageId: string, title: string) => {
  const t = cleanText(title, 120);
  return mutateIeltsDriving(store, (d) => (t ? mapStage(d, stageId, (s) => ({ ...s, title: t })) : d));
};
export const removeRoadStage = (store: S, stageId: string) => mutateIeltsDriving(store, (d) => ({ ...d, road: d.road.filter((s) => s.id !== stageId) }));

export interface StepInput { title: string; note?: string; link?: string; verified?: boolean }
export const addRoadStep = (store: S, stageId: string, inp: StepInput) => {
  const title = cleanText(inp.title, 200);
  if (!title) return Promise.resolve(null);
  const step: RoadStep = { id: store.newId('rstp'), kind: 'official', title, note: cleanText(inp.note, 1000), link: safeLink(inp.link ?? ''), done: false, verified: !!inp.verified };
  return mutateIeltsDriving(store, (d) => mapStage(d, stageId, (s) => (s.steps.length >= 40 ? s : { ...s, steps: [...s.steps, step] })));
};
export const updateRoadStep = (store: S, stageId: string, stepId: string, patch: Partial<StepInput> & { done?: boolean }) =>
  mutateIeltsDriving(store, (d) =>
    mapStage(d, stageId, (s) => ({
      ...s,
      steps: s.steps.map((x) =>
        x.id !== stepId ? x : {
          ...x,
          title: patch.title === undefined ? x.title : cleanText(patch.title, 200) || x.title,
          note: patch.note === undefined ? x.note : cleanText(patch.note, 1000),
          link: patch.link === undefined ? x.link : safeLink(patch.link),
          verified: patch.verified === undefined ? x.verified : patch.verified,
          done: patch.done === undefined ? x.done : patch.done,
        },
      ),
    })),
  );
export const removeRoadStep = (store: S, stageId: string, stepId: string) => mutateIeltsDriving(store, (d) => mapStage(d, stageId, (s) => ({ ...s, steps: s.steps.filter((x) => x.id !== stepId) })));

// ---- conditions ------------------------------------------------------------------------
export const addCondition = (store: S, label: string) => {
  const t = cleanText(label, 40);
  return mutateIeltsDriving(store, (d) => {
    const list = conditionList(d);
    return !t || list.includes(t) || list.length >= 12 ? d : { ...d, conditions: [...list, t] };
  });
};
export const removeCondition = (store: S, label: string) => mutateIeltsDriving(store, (d) => ({ ...d, conditions: conditionList(d).filter((c) => c !== label) }));

// ---- quiz ------------------------------------------------------------------------------
export interface QuizInput { question: string; choices: string[]; answer: number; explanation?: string; source?: string }
export function addQuizQuestion(store: S & Pick<LifeStore, 'today'>, inp: QuizInput): Promise<Undo | null> {
  const q = newQuizQuestion({ id: store.newId('qz'), ...inp, today: store.today() });
  if (!q) return Promise.resolve(null);
  return mutateIeltsDriving(store, (d) => (d.quiz.length >= MAX_ITEMS ? d : { ...d, quiz: [...d.quiz, q] }));
}
/** Edits text/choices; keeps her schedule unless the question text itself is replaced. */
export function editQuizQuestion(store: S & Pick<LifeStore, 'today'>, id: string, inp: QuizInput): Promise<Undo | null> {
  const fresh = newQuizQuestion({ id, ...inp, today: store.today() });
  if (!fresh) return Promise.resolve(null);
  return mutateIeltsDriving(store, (d) => ({
    ...d,
    quiz: d.quiz.map((q) => (q.id !== id ? q : { ...q, question: fresh.question, choices: fresh.choices, answer: fresh.answer, explanation: fresh.explanation, source: fresh.source })),
  }));
}
export const removeQuizQuestion = (store: S, id: string) => mutateIeltsDriving(store, (d) => ({ ...d, quiz: d.quiz.filter((q) => q.id !== id) }));
/** Records one answer and reschedules the question. */
export function answerQuiz(store: S & Pick<LifeStore, 'today'>, id: string, correct: boolean) {
  const today = store.today();
  return mutateIeltsDriving(store, (d) => ({ ...d, quiz: d.quiz.map((q): QuizQuestion => (q.id === id ? reviewQuiz(q, correct, today) : q)) }));
}

// ---- hazards -------------------------------------------------------------------------------
export interface HazardInput { title: string; link?: string; note?: string }
export const addHazardItem = (store: S, inp: HazardInput) => {
  const h: HazardItem = { id: store.newId('hz'), title: cleanText(inp.title, 200), link: safeLink(inp.link ?? ''), note: cleanText(inp.note, 1000) };
  if (!h.title && !h.link && !h.note) return Promise.resolve(null);
  return mutateIeltsDriving(store, (d) => (d.hazards.length >= MAX_ITEMS ? d : { ...d, hazards: [...d.hazards, h] }));
};
export const updateHazardItem = (store: S, id: string, inp: HazardInput) =>
  mutateIeltsDriving(store, (d) => ({ ...d, hazards: d.hazards.map((h) => (h.id === id ? { ...h, title: cleanText(inp.title, 200) || h.title, link: safeLink(inp.link ?? ''), note: cleanText(inp.note, 1000) } : h)) }));
export const removeHazardItem = (store: S, id: string) =>
  mutateIeltsDriving(store, (d) => ({ ...d, hazards: d.hazards.filter((h) => h.id !== id), hazardLog: d.hazardLog.filter((w) => w.itemId !== id) }));
export const logHazardWatch = (store: S & Pick<LifeStore, 'today'>, itemId: string) => {
  const wid = store.newId('hzw');
  const date = dayKey(store.today());
  return mutateIeltsDriving(store, (d) => (d.hazards.some((h) => h.id === itemId) ? { ...d, hazardLog: [...d.hazardLog, { id: wid, itemId, date }].slice(-600) } : d));
};
export const setHazardWeeklyGoal = (store: S, goal: number | null) => mutateIeltsDriving(store, (d) => ({ ...d, hazardWeeklyGoal: goal == null ? null : Math.max(1, Math.min(14, Math.round(goal))) }));

/** Test/helper: a fresh empty blob. */
export const emptyIeltsDriving = defaultIeltsDriving;
