import { describe, expect, it } from 'vitest'
import {
  calmDay, daySummary, dayGroupOf, kCalmMinimumCount, kMaxCore, kMaxCoreYellow, kMaxMaintain, makePlanItem, makeProject, tierCaps, weekAhead, mkDate, dayKey, addDays,
  type LifeSnapshot, type PlanItem, type Suggestion,
} from '../../src/domain'

const item = (id: string, tier: PlanItem['tier'], o: Partial<PlanItem> = {}) =>
  makePlanItem({ id, itemId: id, kind: 'habit', tier, section: 'day', title: { ar: id, en: id }, domain: 'health', why: { code: 'growFocus', args: {}, text: { ar: '', en: '' } }, ...o })
const sg = (i: PlanItem, group: Suggestion['group']): Suggestion => ({ item: i, fit: 'fits', autoLevel: null, inAutoPlan: false, group })

describe('tier caps come from the engine constants', () => {
  it('core cap follows energy, maintenance is fixed', () => {
    expect(tierCaps('green')).toEqual({ core: kMaxCore, maintain: kMaxMaintain })
    expect(tierCaps('yellow').core).toBe(kMaxCoreYellow)
    expect(tierCaps('red').core).toBe(1)
  })
})

describe('daySummary', () => {
  const items = [item('a', 'core'), item('b', 'core'), item('c', 'maintain'), item('s', 'system'), item('j', 'joy'), item('r', 'chain')]
  it('groups by tier, ignores the routine chain, counts done', () => {
    const s = daySummary({ items, energy: 'green' }, (i) => i.id === 'a' || i.id === 'j')
    expect(s.core).toEqual({ count: 2, done: 1 })
    expect(s.maintain).toEqual({ count: 2, done: 0 })
    expect(s.joy).toEqual({ count: 1, done: 1 })
    expect(s.total).toBe(5)
    expect(s.done).toBe(2)
    expect(s.progress).toBeCloseTo(0.4)
  })
  it('empty day: zero progress, no over-cap; over-cap is informational', () => {
    expect(daySummary({ items: [], energy: 'green' }, () => false).progress).toBe(0)
    const four = [item('1', 'core'), item('2', 'core'), item('3', 'core'), item('4', 'core')]
    expect(daySummary({ items: four, energy: 'green' }, () => false).overCap.core).toBe(true)
    expect(daySummary({ items: four.slice(0, 2), energy: 'red' }, () => false).overCap.core).toBe(true)
  })
  it('dayGroupOf maps tiers', () => {
    expect(dayGroupOf('system')).toBe('maintain')
    expect(dayGroupOf('chain')).toBeNull()
  })
})

describe('calmDay never writes: accepted first, suggestions only fill the gap', () => {
  it('uses at most three accepted, keeps the rest visible as extra', () => {
    const acc = [item('m1', 'maintain'), item('c1', 'core'), item('c2', 'core'), item('c3', 'core'), item('c4', 'core'), item('j', 'joy')]
    const c = calmDay(acc, [sg(item('x', 'core'), 'core')])
    expect(c.minimum.map((i) => i.id)).toEqual(['c1', 'c2', 'c3'])
    expect(c.extra.map((i) => i.id)).toEqual(['c4', 'm1'])
    expect(c.fill).toEqual([])
    expect(c.rest.map((i) => i.id)).toEqual(['x'])
    expect(c.joy?.id).toBe('j')
  })
  it('fills the gap from suggestions and falls back to the suggested joy', () => {
    const c = calmDay([item('c1', 'core')], [sg(item('a', 'core'), 'core'), sg(item('b', 'maintain'), 'maintain'), sg(item('c', 'core'), 'core'), sg(item('j', 'joy'), 'joy'), sg(item('w', 'system'), 'system')])
    expect(c.minimum).toHaveLength(1)
    expect(c.fill.map((i) => i.id)).toEqual(['a', 'b'])
    expect(c.minimum.length + c.fill.length).toBe(kCalmMinimumCount)
    expect(c.rest.map((i) => i.id)).toEqual(['c'])
    expect(c.joy?.id).toBe('j')
  })
  it('empty everything is fine', () => {
    const c = calmDay([], [])
    expect(c).toEqual({ minimum: [], fill: [], extra: [], rest: [], joy: null })
  })
})

describe('weekAhead', () => {
  const today = mkDate(2026, 10, 5)
  const proj = (id: string, due: string | null, status: 'active' | 'paused' = 'active') =>
    makeProject({ id, domain: 'learning', titleAr: id, titleEn: id, status, dueDate: due, steps: [{ id: `${id}s`, titleAr: `خطوة ${id}`, titleEn: '', actionId: null, done: false, doneDate: null, durationMin: 40 }] })
  it('lists active projects due within 7 days (sorted) before weekly tasks, capped', () => {
    const s = { projects: [proj('late', dayKey(addDays(today, 9))), proj('b', dayKey(addDays(today, 5))), proj('a', dayKey(addDays(today, 2))), proj('p', dayKey(addDays(today, 1)), 'paused'), proj('none', null)] } as unknown as LifeSnapshot
    const w = weekAhead(s, today, [item('wk', 'maintain', { estimatedMin: 15 }), item('ch', 'chain')])
    expect(w.map((e) => e.id)).toEqual(['a', 'b', 'wk'])
    expect(w[0]).toMatchObject({ kind: 'project', minutes: 40, title: 'خطوة a' })
    expect(weekAhead(s, today, Array.from({ length: 6 }, (_, i) => item(`w${i}`, 'maintain'))).length).toBe(4)
  })
})
