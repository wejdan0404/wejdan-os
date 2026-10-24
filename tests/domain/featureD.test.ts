import { describe, expect, it } from 'vitest'
import {
  EVIDENCE_STRENGTHS, HOME_ZONES, InMemoryLifeRepository, OPTIONAL_MODULES, canBecomeHabit, canEnableModule, createLifeStore, evidenceHabitId,
  filterByStrength, habitFromAction, hasEvidenceHabit, isStudyDomain, mkDate, nextWeekZone, recallNote, strengthCounts, strengthLabel, tidyRemaining, weeklyZone,
  addDays, SettingsJ, defaultSettings,
} from '../../src/domain'
import { library } from './helpers'

const today = mkDate(2026, 10, 14)

describe('evidence strength', () => {
  it('every shipped entry has a known strength and counts add up', () => {
    const c = strengthCounts(library.actions)
    expect(Object.values(c).reduce((a, b) => a + b, 0)).toBe(library.actions.length)
    for (const a of library.actions) expect(strengthLabel(a), a.actionId).not.toBeNull()
    expect(EVIDENCE_STRENGTHS.map((s) => s.ar)).toEqual(['إرشادات', 'مراجعة منهجية', 'تجربة', 'رصدية', 'رأي خبراء'])
  })
  it('filters by strength and null means all', () => {
    expect(filterByStrength(library.actions, null)).toHaveLength(library.actions.length)
    const rct = filterByStrength(library.actions, 'RCT')
    expect(rct.length).toBeGreaterThan(0)
    expect(rct.every((a) => a.evidenceStrength === 'RCT')).toBe(true)
  })
})

describe('habit from evidence entry', () => {
  const habitEntry = library.actions.find((a) => a.appType === 'Habit' && a.actionId.startsWith('BODY'))!
  const reference = library.actions.find((a) => a.appType === 'Reference')!
  it('only habit entries qualify; reference and engine rules do not', () => {
    expect(canBecomeHabit(habitEntry)).toBe(true)
    expect(canBecomeHabit(reference)).toBe(false)
    expect(habitFromAction(reference, today)).toBeNull()
  })
  it('builds a valid habit with stable id and the entry texts', () => {
    const h = habitFromAction(habitEntry, today)!
    expect(h.id).toBe(evidenceHabitId(habitEntry))
    expect(h.actionId).toBe(habitEntry.actionId)
    expect(h.titleAr.length).toBeGreaterThan(0)
    expect(h.durationMin).toBeGreaterThan(0)
    expect(h.minimumDurationMin).toBeLessThanOrEqual(h.durationMin)
    expect(h.createdDate).toBe('2026-10-14')
    expect(hasEvidenceHabit([h], habitEntry)).toBe(true)
  })
  it('every habit-type entry in the library can be built', () => {
    for (const a of library.actions.filter((x) => x.appType === 'Habit' && x.area !== 'aquarium')) expect(habitFromAction(a, today), a.actionId).not.toBeNull()
  })
  it('adding through the store is idempotent by id and undoable via delete', async () => {
    const store = await createLifeStore({ repo: new InMemoryLifeRepository(), now: () => new Date(today) })
    const h = habitFromAction(habitEntry, today)!
    await store.upsertHabit(h, true)
    expect(store.getSnapshot().habits.filter((x) => x.id === h.id)).toHaveLength(1)
    const t = await store.deleteHabit(h.id)
    expect(store.getSnapshot().habits.some((x) => x.id === h.id)).toBe(false)
    await store.undoDelete(t!.token)
    expect(store.getSnapshot().habits.some((x) => x.id === h.id)).toBe(true)
  })
})

describe('home zone rotation', () => {
  it('is stable within a week and moves each week', () => {
    const a = weeklyZone(today), b = weeklyZone(addDays(today, 2))
    expect(a.id).toBe(b.id)
    expect(nextWeekZone(today).id).toBe(weeklyZone(addDays(today, 7)).id)
    expect(nextWeekZone(today).id).not.toBe(a.id)
  })
  it('offset skips zones and wraps around', () => {
    expect(weeklyZone(today, 1).id).toBe(nextWeekZone(today).id)
    expect(weeklyZone(today, HOME_ZONES.length).id).toBe(weeklyZone(today).id)
    expect(weeklyZone(today, -1)).toBeDefined()
  })
  it('timer remaining is wall-clock based and floors at zero', () => {
    expect(tidyRemaining(600, 0, null, 0)).toBe(600)
    expect(tidyRemaining(600, 100, 1000, 61_000)).toBe(440)
    expect(tidyRemaining(600, 0, 0, 10_000_000)).toBe(0)
  })
  it('homeZoneOffset and resetMinutes round-trip through the module state', async () => {
    const store = await createLifeStore({ repo: new InMemoryLifeRepository(), now: () => new Date(today) })
    await store.updateModuleState({ ...store.getSnapshot().moduleState, homeZoneOffset: 3 })
    expect(store.getSnapshot().moduleState.homeZoneOffset).toBe(3)
    expect(store.getSnapshot().moduleState.resetMinutes).toBe(10)
  })
})

describe('focus recall', () => {
  it('only learning domains get the recall question', () => {
    expect(isStudyDomain('ielts')).toBe(true)
    expect(isStudyDomain('home')).toBe(false)
    expect(isStudyDomain(null)).toBe(false)
  })
  it('an empty answer makes no note', () => {
    expect(recallNote('test', '   ')).toBeNull()
    expect(recallNote('test', 'فكرة')?.body).toBe('فكرة')
  })
})

describe('settings: cap and modules', () => {
  it('notificationCap is clamped 0..6 and round-trips', () => {
    const j = SettingsJ.toJson({ ...defaultSettings(), notificationCap: 3 })
    expect(SettingsJ.fromJson(j).notificationCap).toBe(3)
    expect(SettingsJ.fromJson({ ...j, notificationCap: 99 }).notificationCap).toBe(6)
    expect(defaultSettings().notificationCap).toBe(4)
  })
  it('optional modules exist as domains and can be toggled; enabling is refused over the cap', async () => {
    const store = await createLifeStore({ repo: new InMemoryLifeRepository(), now: () => new Date(today) })
    const s = store.getSnapshot()
    for (const m of OPTIONAL_MODULES) expect(s.domains.some((d) => d.id === m.id), m.id).toBe(true)
    const id = OPTIONAL_MODULES[0]!.id
    await store.setDomainEnabled(id, false)
    expect(store.getSnapshot().domains.find((d) => d.id === id)!.enabled).toBe(false)
    expect(canEnableModule(store.getSnapshot(), id)).toBe(true)
    // exactly 5 other enabled maintain domains, so a 6th (this one, back on) would break the cap
    for (const d of store.getSnapshot().domains.filter((x) => x.enabled && x.id !== id)) await store.setDomainState(d.id, 'rest', true)
    const others = store.getSnapshot().domains.filter((x) => x.enabled && x.id !== id && !x.sensitive).slice(0, 5)
    for (const d of others) await store.setDomainState(d.id, 'maintain', true)
    await store.setDomainState(id, 'maintain', true)
    expect(canEnableModule(store.getSnapshot(), id)).toBe(false)
  })
})
