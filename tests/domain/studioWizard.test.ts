import { describe, expect, it } from 'vitest'
import {
  applyLifeMap, applyPrefill, createLifeStore, draftFromHabit, emptyDraft, evidenceHabitOptions, firstBlockingStep, habitFromDraft,
  InMemoryLifeRepository, kLifeMapCaps, lifeMapChoose, lifeMapCounts, lifeMapFromDomains, makeHabit, mkDate, prefillFromAction,
  undoPrefill, validateStep, type Domain, type DomainId, type LifeMap,
} from '../../src/domain'
import { library } from './helpers'

const act = (id: string) => library.actions.find((a) => a.actionId === id)!

describe('habit wizard draft', () => {
  it('only the name and the days block saving', () => {
    const d = emptyDraft()
    expect(firstBlockingStep(d)).toBe('behavior')
    d.title = 'test'
    expect(firstBlockingStep(d)).toBeNull()
    expect(validateStep('cue', { ...d, days: [] })).toBe('اختاري يوم واحد على الأقل')
  })

  it('builds a habit, keeps the small version within the normal one, and round-trips through a draft', () => {
    const d = { ...emptyDraft('learning'), title: ' test ', minMin: 30, normalMin: 10, ifThen: 'إذا … فإني …', reminderOn: true, cueKind: 'prayer' as const, days: [3, 1] }
    const h = habitFromDraft(d, null, { id: 'h_t', cueText: 'بعد العصر' })
    expect(h.titleAr).toBe('test')
    expect(h.minimumDurationMin).toBe(10)
    expect(h.schedule.weekdays).toEqual([1, 3])
    expect(h.reminder.enabled).toBe(true)
    expect(h.status).toBe('active')
    const back = draftFromHabit(h)
    expect(back.ifThen).toBe('إذا … فإني …')
    expect(back.cueKind).toBe('prayer')
    expect(habitFromDraft(back, h, { id: h.id, cueText: h.cue })).toEqual(h)
  })

  it('a draft save is paused; editing keeps fields the wizard does not own', () => {
    const base = makeHabit({ id: 'h1', domain: 'home', titleAr: 'قديمة', titleEn: 'old', alternationGroup: 'g', sortOrder: 7 })
    const h = habitFromDraft({ ...draftFromHabit(base), title: 'جديدة' }, base, { id: 'h1', cueText: '', status: 'paused' })
    expect(h.status).toBe('paused')
    expect(h.alternationGroup).toBe('g')
    expect(h.sortOrder).toBe(7)
    expect(h.titleEn).toBe('old')
  })
})

describe('evidence prefill', () => {
  it('lists habit-type actions only and hides women\'s health unless the private module is on', () => {
    const on = evidenceHabitOptions(library.actions, { includeSensitive: true })
    const off = evidenceHabitOptions(library.actions, { includeSensitive: false })
    expect(on.length).toBeGreaterThan(5)
    expect(off.length).toBeLessThanOrEqual(on.length)
    expect(on.every((a) => a.appType === 'Habit')).toBe(true)
  })

  it('fills from the library, marks the filled fields, links the action, and can be undone', () => {
    const a = act('BODY-02')
    const p = prefillFromAction(a, 'ar', 'health')
    expect(p.patch.actionId).toBe('BODY-02')
    expect(p.keys).toContain('title')
    expect(p.keys).toContain('minText')
    const before = { ...emptyDraft(), goal: 'هدفي' }
    const { draft, previous } = applyPrefill(before, p)
    expect(draft.title.length).toBeGreaterThan(0)
    expect(draft.goal).toBe('هدفي') // never overwrites what the library does not have
    expect(undoPrefill(draft, previous)).toEqual(before)
  })

  it('never writes empty library fields over what she typed', () => {
    const a = { ...act('BODY-02'), joyPairing: 'N/A', ar: null }
    const p = prefillFromAction(a, 'en', 'health')
    expect(p.keys).not.toContain('joyPairing')
  })
})

const D = (id: DomainId, state: Domain['state']): Domain => ({ id, nameAr: id, nameEn: id, state, sensitive: false, enabled: true, parent: null, sortOrder: 0 })

describe('life map caps', () => {
  it('blocks a 4th grow and a 6th maintain with the cap that was hit', () => {
    let map: LifeMap = { health: 'grow', sleep: 'grow', food: 'grow', care: 'rest' }
    expect(lifeMapChoose(map, 'care', 'grow').blocked).toBe('grow')
    expect(kLifeMapCaps).toEqual({ grow: 3, maintain: 5 })
    map = { health: 'maintain', sleep: 'maintain', food: 'maintain', care: 'maintain', home: 'maintain', money: 'rest' }
    expect(lifeMapChoose(map, 'money', 'maintain').blocked).toBe('maintain')
    const r = lifeMapChoose(map, 'money', 'grow')
    expect(r.blocked).toBeNull()
    expect(lifeMapCounts(r.map)).toEqual({ grow: 1, maintain: 5, rest: 0 })
  })

  it('moving a grow domain frees a slot', () => {
    let map: LifeMap = { health: 'grow', sleep: 'grow', food: 'grow', care: 'rest' }
    map = lifeMapChoose(map, 'food', 'maintain').map
    expect(lifeMapChoose(map, 'care', 'grow').blocked).toBeNull()
  })

  it('an over-cap legacy state falls to the next tier instead of staying over', () => {
    const ds = [D('health', 'grow'), D('sleep', 'grow'), D('food', 'grow'), D('care', 'grow'), D('home', 'maintain')]
    expect(lifeMapCounts(lifeMapFromDomains(ds))).toEqual({ grow: 3, maintain: 2, rest: 0 })
  })

  it('applyLifeMap writes only what changed, through the store (season included)', async () => {
    const repo = new InMemoryLifeRepository()
    await repo.open()
    const store = await createLifeStore({ repo, now: () => mkDate(2026, 10, 5, 10), library })
    const ds = store.getSnapshot().domains.filter((d) => d.enabled && !d.sensitive && d.id !== 'joy')
    const map = lifeMapFromDomains(ds)
    const flip = ds.find((d) => map[d.id] === 'rest')!
    map[flip.id] = 'maintain'
    const changed = await applyLifeMap(store, ds, map)
    expect(changed).toEqual([flip.id])
    expect(store.getSnapshot().domains.find((d) => d.id === flip.id)!.state).toBe('maintain')
    expect(await applyLifeMap(store, store.getSnapshot().domains, map)).toEqual([])
  })
})
