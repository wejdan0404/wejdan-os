import { describe, expect, it } from 'vitest'
import {
  InMemoryLifeRepository, ModuleStateJ, addCondition, addHazardItem, addQuizQuestion, addRoadStage, addRoadStep, answerQuiz, conditionList,
  createLifeStore, dayKey, defaultIeltsDriving, defaultModuleState, hazardWeekCount, ieltsCommitment, ieltsPracticeDays, ieltsSessionsThisMonth,
  IeltsDrivingJ, logHazardWatch, mkDate, nextQuizDate, parseBand, practiceStats, quizDueCount, quizRound, readIeltsDriving, removeCondition,
  removeRoadStage, roadProgress, safeLink, setIeltsGoals, startOfWeek, updateRoadStep, ROAD_CONFIRM_STAGE_ID, makeLog, type LifeStore,
} from '../../src/domain'
import { library } from './helpers'

const NOW = mkDate(2026, 10, 15, 10)
async function mk(at = NOW): Promise<{ store: LifeStore; setNow: (d: Date) => void }> {
  const repo = new InMemoryLifeRepository()
  await repo.open()
  let now = at
  const store = await createLifeStore({ repo, now: () => now, library })
  return { store, setNow: (d) => { now = d } }
}

describe('IELTS goals + stats (owner-entered, nothing assumed)', () => {
  it('starts empty; parseBand rounds to halves and rejects out of range', async () => {
    const { store } = await mk()
    const d = readIeltsDriving(store)
    expect(d.ielts).toEqual({ targetBand: null, currentBand: null, commitDays: null })
    expect(parseBand('6.7')).toBe(6.5)
    expect(parseBand('٧')).toBe(7)
    expect(parseBand('10')).toBeNull()
    expect(parseBand('')).toBeNull()
    const undo = await setIeltsGoals(store, { targetBand: 7, currentBand: 5.5, commitDays: 20 })
    expect(readIeltsDriving(store).ielts).toEqual({ targetBand: 7, currentBand: 5.5, commitDays: 20 })
    await undo()
    expect(readIeltsDriving(store).ielts.targetBand).toBeNull()
  })

  it('counts distinct practice days; sessions this month and 30-day commitment are gentle counts', () => {
    const today = mkDate(2026, 10, 15)
    const habit = { id: 'h_ielts', domain: 'ielts' } as never
    const logs = [
      makeLog({ id: 'a', itemId: 'h_ielts', kind: 'habit', date: '2026-10-15', level: 'normal' }),
      makeLog({ id: 'b', itemId: 'h_ielts', kind: 'habit', date: '2026-10-15', level: 'normal' }), // same day → once
      makeLog({ id: 'c', itemId: 'h_ielts', kind: 'habit', date: '2026-10-10', level: 'normal' }),
      makeLog({ id: 'd', itemId: 'h_ielts', kind: 'habit', date: '2026-09-20', level: 'normal' }),
      makeLog({ id: 'e', itemId: 'other', kind: 'habit', date: '2026-10-11', level: 'normal' }), // not ielts
      makeLog({ id: 'f', itemId: 'h_ielts', kind: 'habit', date: '2026-10-12', level: 'skipped' }),
    ]
    const days = ieltsPracticeDays({ habits: [habit], weeklyTasks: [], logs, mockTests: [{ id: 'm', date: '2026-10-01', reading: 6, listening: null, writing: null, speaking: null, note: '' }], vocabCards: [] })
    expect([...days].sort()).toEqual(['2026-09-20', '2026-10-01', '2026-10-10', '2026-10-15'])
    expect(ieltsSessionsThisMonth(days, today)).toBe(3)
    const c = ieltsCommitment(days, today, null, startOfWeek(today, 7))
    expect(c.practiced).toBe(4) // 09-20 is within 30 days of 10-15
    expect(c.ratio).toBeCloseTo(4 / 30)
    const g = ieltsCommitment(days, today, 2, startOfWeek(today, 7))
    expect(g.ratio).toBe(1) // clamped; reaching it is a good thing, going past is fine
    expect(ieltsCommitment(new Set(), today, null, startOfWeek(today, 7)).practiced).toBe(0)
  })
})

describe('driving road (no invented official procedure)', () => {
  it('seeds ONLY the confirm-official-path stage; official steps are unverified until she confirms', async () => {
    const { store } = await mk()
    const d = readIeltsDriving(store)
    expect(d.road).toHaveLength(1)
    expect(d.road[0]!.id).toBe(ROAD_CONFIRM_STAGE_ID)
    expect(d.road[0]!.steps.every((s) => s.kind === 'guide')).toBe(true)
    const txt = JSON.stringify(d.road)
    expect(txt).not.toMatch(/\d+\s*(ساعة|ريال)/)
    await addRoadStage(store, 'test stage')
    const stage = readIeltsDriving(store).road[1]!
    await addRoadStep(store, stage.id, { title: 'test step', link: 'javascript:alert(1)' })
    let st = readIeltsDriving(store).road[1]!.steps[0]!
    expect(st.kind).toBe('official')
    expect(st.verified).toBe(false)
    expect(st.link).toBe('')
    await updateRoadStep(store, stage.id, st.id, { verified: true, link: 'my.gov.sa/x', done: true })
    st = readIeltsDriving(store).road[1]!.steps[0]!
    expect(st.verified).toBe(true)
    expect(st.link).toBe('https://my.gov.sa/x')
    const p = roadProgress(readIeltsDriving(store).road)
    expect(p).toMatchObject({ current: 1, total: 2, unverified: 0 })
    const undo = await removeRoadStage(store, stage.id)
    expect(readIeltsDriving(store).road).toHaveLength(1)
    await undo()
    expect(readIeltsDriving(store).road).toHaveLength(2)
  })

  it('safeLink only keeps http(s)', () => {
    expect(safeLink('data:text/html,x')).toBe('')
    expect(safeLink('ftp://x.y')).toBe('')
    expect(safeLink('http://a.sa')).toBe('http://a.sa/')
    expect(safeLink('')).toBe('')
  })
})

describe('conditions variety', () => {
  it('counts only conditions from her list across practice sessions; list is editable', async () => {
    const { store } = await mk()
    expect(conditionList(readIeltsDriving(store))).toHaveLength(4)
    await addCondition(store, 'test ظرف')
    expect(conditionList(readIeltsDriving(store))).toContain('test ظرف')
    const list = conditionList(readIeltsDriving(store))
    const s = practiceStats(
      [
        { kind: 'practice', minutes: 30, conditions: ['ليل'] },
        { kind: 'practice', minutes: 15, conditions: ['ليل', 'test ظرف', 'غير موجود'] },
        { kind: 'video', minutes: 15, conditions: ['زحمة'] },
      ],
      list,
    )
    expect(s).toMatchObject({ sessions: 2, minutes: 45, total: 5 })
    expect(s.tried.sort()).toEqual(['ليل', 'test ظرف'].sort())
    await removeCondition(store, 'ليل')
    expect(conditionList(readIeltsDriving(store))).not.toContain('ليل')
  })
})

describe('spaced theory quiz (owner-added)', () => {
  it('ships empty; wrong answers restart the interval, right ones stretch it (SM-2); invalid questions refused', async () => {
    const { store, setNow } = await mk()
    const empty = readIeltsDriving(store)
    expect(empty.quiz).toHaveLength(0)
    expect(await addQuizQuestion(store, { question: 'test', choices: ['a', ''], answer: 0 })).toBeNull() // <2 choices
    expect(await addQuizQuestion(store, { question: 'test', choices: ['a', 'b', '', ''], answer: 2 })).toBeNull() // answer is blank
    await addQuizQuestion(store, { question: 'test q1', choices: ['a', 'b'], answer: 1, source: 'test' })
    await addQuizQuestion(store, { question: 'test q2', choices: ['', 'x', 'y'], answer: 2 }) // blank choice dropped → answer remapped
    const q = readIeltsDriving(store).quiz
    expect(q).toHaveLength(2)
    expect(q[1]!.choices).toEqual(['x', 'y'])
    expect(q[1]!.answer).toBe(1)
    const today = store.today()
    expect(quizDueCount(q, today)).toBe(2)
    await answerQuiz(store, q[0]!.id, false)
    await answerQuiz(store, q[1]!.id, true)
    const after = readIeltsDriving(store).quiz
    expect(after[0]!.due).toBe(dayKey(new Date(today.getTime() + 86400000)))
    expect(after[0]!.lapses).toBe(1)
    expect(after[1]!.due).toBe(dayKey(new Date(today.getTime() + 86400000))) // first right answer: back tomorrow
    expect(quizDueCount(after, today)).toBe(0)
    expect(nextQuizDate(after, today)).toBe(after[0]!.due)
    setNow(mkDate(2026, 10, 16, 10))
    expect(quizRound(after, store.today()).map((x) => x.id)).toEqual([after[0]!.id, after[1]!.id])
    await answerQuiz(store, after[1]!.id, true) // second right answer: now it waits days
    await answerQuiz(store, after[0]!.id, false) // still wrong: stays tomorrow
    const again = readIeltsDriving(store).quiz
    expect(again[1]!.intervalDays).toBe(6)
    expect(again[0]!.due).toBe('2026-10-17')
    expect(again[0]!.lapses).toBe(2)
  })

  it('a round is at most 10 questions', () => {
    const q = Array.from({ length: 14 }, (_, i) => ({ id: `q${i}`, question: 'test', choices: ['a', 'b'], answer: 0, explanation: '', source: '', ease: 2.5, intervalDays: 0, repetitions: 0, due: '2026-10-01', lapses: 0, lastReviewed: null }))
    expect(quizRound(q, mkDate(2026, 10, 15))).toHaveLength(10)
  })
})

describe('hazard practice (her links/notes)', () => {
  it('ships empty, accepts her own link/note, counts weekly watches, drops unsafe links', async () => {
    const { store } = await mk()
    expect(readIeltsDriving(store).hazards).toHaveLength(0)
    expect(await addHazardItem(store, { title: '', link: '', note: '' })).toBeNull()
    await addHazardItem(store, { title: 'test clip', link: 'javascript:alert(1)', note: 'test' })
    const h = readIeltsDriving(store).hazards[0]!
    expect(h.link).toBe('')
    await logHazardWatch(store, h.id)
    await logHazardWatch(store, 'nope') // unknown item ignored
    const d = readIeltsDriving(store)
    expect(d.hazardLog).toHaveLength(1)
    expect(hazardWeekCount(d.hazardLog, startOfWeek(store.today(), 7))).toBe(1)
    expect(d.hazardWeeklyGoal).toBeNull()
  })
})

describe('persistence', () => {
  it('round-trips through ModuleState and export/import; tolerant of junk', async () => {
    const { store } = await mk()
    await setIeltsGoals(store, { targetBand: 6.5 })
    await addQuizQuestion(store, { question: 'test', choices: ['a', 'b'], answer: 0 })
    await addHazardItem(store, { title: 'test', link: 'https://example.com' })
    const m = ModuleStateJ.fromJson(ModuleStateJ.toJson(store.getSnapshot().moduleState))
    expect(IeltsDrivingJ.fromJson(m.ieltsDriving).ielts.targetBand).toBe(6.5)
    const exp = await store.exportAll()
    const other = await mk()
    await other.store.importAll(exp, { confirm: true })
    const d = readIeltsDriving(other.store)
    expect(d.ielts.targetBand).toBe(6.5)
    expect(d.quiz).toHaveLength(1)
    expect(d.hazards[0]!.link).toBe('https://example.com/')
    // old file without the field → defaults, other module state untouched
    expect(ModuleStateJ.fromJson({ resetMinutes: 7 }).ieltsDriving).toEqual({})
    expect(IeltsDrivingJ.fromJson({ quiz: 'x', road: 5, ielts: { targetBand: 'abc' }, hazardWeeklyGoal: 99 }).ielts.targetBand).toBeNull()
    expect(IeltsDrivingJ.fromJson(null)).toEqual(defaultIeltsDriving())
    expect(defaultModuleState().ieltsDriving).toEqual({})
  })
})
