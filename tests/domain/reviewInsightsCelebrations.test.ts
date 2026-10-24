/** feat/a — weekly review depth, insights read-outs and celebrations history (domain layer). */
import { describe, expect, it } from 'vitest'
import {
  BLOCKER_EXPERIMENT, addDays, celebrationsHistory, dayKey, experimentReadout, experimentTemplateOf, groupByMonth, isCompleteCheck,
  makeExperiment, makeHabit, makeLog, momentumByDomain, mkDate, preferredTemplate, returnSpeed, schedule, strengthBand,
  strengthCandidates, suggestExperiments, type Domain, type Goal, type Habit, type LogEntry, type SparkTxn, type StrengthCheck,
} from '../../src/domain'

const TODAY = mkDate(2026, 10, 24)
const habit = (id: string, domain: Habit['domain'], sortOrder = 0): Habit =>
  makeHabit({ id, domain, titleAr: id, titleEn: id, schedule: schedule([1, 2, 3, 4, 5, 6, 7]), createdDate: '2026-08-01', sortOrder })
const dom = (id: Domain['id'], state: Domain['state'] = 'grow'): Domain => ({ id, nameAr: id, nameEn: id, state, sensitive: false, enabled: true, parent: null, sortOrder: 0 })
const log = (itemId: string, back: number, extra: Partial<LogEntry> = {}): LogEntry =>
  makeLog({ id: `l_${itemId}_${back}`, itemId, kind: 'habit', date: dayKey(addDays(TODAY, -back)), level: 'normal', ...extra })

describe('strength check candidates', () => {
  it('never-checked first, then oldest check; due after 28 days', () => {
    const checks: StrengthCheck[] = [
      { id: 'c1', habitId: 'b', date: '2026-10-20', items: [3, 3, 3, 3] },
      { id: 'c2', habitId: 'c', date: '2026-08-01', items: [3, 3, 3, 3] },
    ]
    const out = strengthCandidates({ habits: [habit('b', 'health', 1), habit('c', 'health', 2), habit('a', 'health', 3)], checks, today: TODAY })
    expect(out.map((x) => x.habit.id)).toEqual(['a', 'c', 'b'])
    expect(out.map((x) => x.due)).toEqual([true, true, false])
  })
  it('paused habits are not offered', () => {
    const paused = { ...habit('p', 'health'), status: 'paused' as const }
    expect(strengthCandidates({ habits: [paused], checks: [], today: TODAY })).toEqual([])
  })
  it('bands are words over the SRBAI score, a check is complete only with four 1–5 answers', () => {
    expect(strengthBand([1, 1, 1, 1])).toBe('attention')
    expect(strengthBand([2, 2, 2, 2])).toBe('easing')
    expect(strengthBand([3, 3, 3, 3])).toBe('easy')
    expect(strengthBand([5, 5, 5, 5])).toBe('automatic')
    expect(isCompleteCheck([4, 4, 4, 4])).toBe(true)
    expect(isCompleteCheck([4, 4, 0, 4])).toBe(false)
    expect(isCompleteCheck([4, 4, 4])).toBe(false)
  })
})

describe('blockers → experiment', () => {
  it('maps the reasons that an experiment answers, and picks the first mapped one', () => {
    expect(BLOCKER_EXPERIMENT.badTime).toBe('timeSwap')
    expect(BLOCKER_EXPERIMENT.tooBig).toBe('minimumOnly')
    expect(BLOCKER_EXPERIMENT.forgot).toBeNull()
    expect(preferredTemplate(['forgot', 'tired', 'badTime'])).toBe('minimumOnly')
    expect(preferredTemplate(['forgot', 'placeDidntFit'])).toBeNull()
  })
  it('suggested experiments carry a recognisable template', () => {
    const h = { ...habit('w', 'health'), schedule: schedule([1, 2, 3, 4, 5, 6, 7], { slot: 'morning' } as never) }
    const list = suggestExperiments({ coreHabits: [h] })
    expect(list.length).toBeGreaterThan(0)
    for (const e of list) expect(experimentTemplateOf(e)).not.toBeNull()
  })
})

describe('momentum by domain', () => {
  it('one row per domain with active habits, high to low; an unstarted domain reads as resting, not zero', () => {
    const habits = [habit('w', 'health'), habit('v', 'ielts'), habit('z', 'home')]
    const logs: LogEntry[] = []
    for (let b = 1; b <= 14; b++) logs.push(log('w', b))
    for (let b = 1; b <= 14; b += 2) logs.push(log('v', b))
    const rows = momentumByDomain({ domains: [dom('health'), dom('ielts'), dom('home', 'maintain'), dom('money')], habits, logs, today: TODAY })
    expect(rows.map((r) => r.domain)).toEqual(['health', 'ielts', 'home'])
    expect(rows[0]!.value).toBeGreaterThan(rows[1]!.value)
    expect(rows[0]!.resting).toBe(false)
    expect(rows[2]!.resting).toBe(true)
  })
})

describe('return speed', () => {
  it('four weekly points oldest first; a week with no miss is null; the trend needs two known weeks', () => {
    const logs: LogEntry[] = []
    for (let b = 1; b <= 40; b++) if (![3, 4].includes(b)) logs.push(log('w', b)) // one 2-day gap this/last week
    const r = returnSpeed({ habits: [habit('w', 'health')], logs, today: TODAY })
    expect(r.points).toHaveLength(4)
    expect(r.points[0]!.weekStart < r.points[3]!.weekStart).toBe(true)
    expect(r.points.filter((p) => p.days != null).length).toBe(1)
    expect(r.trend).toBe('unknown')
  })
  it('falling days → faster', () => {
    const logs: LogEntry[] = []
    const miss = new Set([24, 23, 22, 17, 16, 9]) // gaps of 3, 2, 1 days, oldest first
    for (let b = 1; b <= 40; b++) if (!miss.has(b)) logs.push(log('w', b))
    const r = returnSpeed({ habits: [habit('w', 'health')], logs, today: TODAY })
    const known = r.points.filter((p) => p.days != null).map((p) => p.days as number)
    expect(known).toEqual([3, 2, 1])
    expect(r.trend).toBe('faster')
  })
})

describe('experiment readout', () => {
  const h = habit('w', 'health')
  it('ready only after its days have passed; day number is capped', () => {
    const run = makeExperiment({ id: 'e', habitId: 'w', titleAr: 'test', titleEn: 'test', variable: 'minimum', status: 'active', startDate: dayKey(addDays(TODAY, -2)), lengthDays: 7 })
    const early = experimentReadout({ experiment: run, habits: [h], logs: [], today: TODAY })!
    expect(early.ready).toBe(false)
    expect(early.dayNumber).toBe(3)
    const done = experimentReadout({ experiment: { ...run, startDate: dayKey(addDays(TODAY, -9)) }, habits: [h], logs: [], today: TODAY })!
    expect(done.ready).toBe(true)
    expect(done.dayNumber).toBe(7)
  })
  it('no habit or no start → null; no logs → not enough data (no verdict invented)', () => {
    const run = makeExperiment({ id: 'e', habitId: 'gone', titleAr: 't', titleEn: 't', variable: 'minimum', status: 'active', startDate: '2026-10-10' })
    expect(experimentReadout({ experiment: run, habits: [h], logs: [], today: TODAY })).toBeNull()
    expect(experimentReadout({ experiment: { ...run, habitId: 'w', startDate: null }, habits: [h], logs: [], today: TODAY })).toBeNull()
  })
})

describe('celebrations history', () => {
  const goal: Goal = {
    id: 'g', domain: 'ielts', titleAr: 'test goal', titleEn: 't', targetNote: '', sortOrder: 0, linkedHabitIds: [], linkedProjectIds: [],
    milestones: [
      { id: 'm1', titleAr: 'test done', titleEn: 't', quarter: 1, done: true, doneDate: '2026-09-21', rewardJoyId: null },
      { id: 'm2', titleAr: 'test open', titleEn: 't', quarter: 1, done: false, doneDate: null, rewardJoyId: null },
    ],
  }
  const h = habit('w', 'health')
  const logs = [log('w', 9), log('w', 4)] // done on 15 and 20 Oct → a gap of 4 days between them
  const comeback: SparkTxn = { id: 's1', date: logs[1]!.date, amount: 10, reason: 'comeback', refId: logs[1]!.id, at: null }
  const reviews = [
    { id: '2026-10-11', date: '2026-10-17', chapterTitle: 'test', wins: [], blockers: [], top3: [], experimentId: null, durationSec: null },
    { id: '2026-10-04', date: '2026-10-10', chapterTitle: '', wins: [], blockers: [], top3: [], experimentId: null, durationSec: null },
  ]
  const exp = makeExperiment({ id: 'e', habitId: 'w', titleAr: 'test exp', titleEn: 't', variable: 'minimum', status: 'kept', startDate: '2026-09-01', endDate: '2026-09-08' })
  const all = celebrationsHistory({
    goals: [goal], habits: [h], logs, weeklyReviews: reviews, experiments: [exp, { ...exp, id: 'e2', status: 'active', endDate: null }],
    sparkTxns: [comeback, { id: 's2', date: '2026-10-17', amount: 5, reason: 'weeklyReview', refId: null, at: null }, { id: 's3', date: '2026-10-01', amount: 3, reason: 'completion', refId: null, at: null }],
  })
  it('collects finished milestones, comebacks, closed chapters and finished experiments only', () => {
    expect(all.map((c) => c.kind).sort()).toEqual(['chapter', 'chapter', 'comeback', 'experiment', 'milestone'])
  })
  it('newest first; chapters numbered by order; comeback carries its gap and sparks', () => {
    expect(all.map((c) => c.date)).toEqual([...all.map((c) => c.date)].sort().reverse())
    const cb = all.find((c) => c.kind === 'comeback')!
    expect(cb.title).toBe('w')
    expect(cb.sparks).toBe(10)
    expect(cb.gapDays).toBe(4)
    const chapters = all.filter((c) => c.kind === 'chapter')
    expect(chapters.find((c) => c.date === '2026-10-17')!.context).toBe('الفصل 2')
    expect(chapters.find((c) => c.date === '2026-10-17')!.sparks).toBe(5)
    expect(all.find((c) => c.kind === 'experiment')!.outcome).toBe('kept')
  })
  it('groups by month', () => {
    expect(groupByMonth(all).map((g) => g.month)).toEqual(['2026-10', '2026-09'])
  })
  it('is empty for an empty store', () => {
    expect(celebrationsHistory({ goals: [], habits: [], logs: [], sparkTxns: [], weeklyReviews: [], experiments: [] })).toEqual([])
  })
})
