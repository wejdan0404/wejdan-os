/** QA area 1 (Today) — domain fixes: nothing vanishes, done tasks stay, load ignores settled items, «بكرة» isn't a comeback. */
import { describe, expect, it } from 'vitest'
import actionsJson from '../../src/domain/data/actions.json'
import actionsArJson from '../../src/domain/data/actions_ar.json'
import {
  InMemoryLifeRepository,
  addDays,
  createLifeStore,
  dayKey,
  makeHabit,
  mkDate,
  openInbox,
  parseSeedLibrary,
  schedule,
  tasksForDay,
  todayView,
  type LifeStore,
} from '../../src/domain'

const library = parseSeedLibrary(actionsJson as unknown, actionsArJson as unknown)

async function storeAt(clock: { now: Date }): Promise<LifeStore> {
  const store = await createLifeStore({ repo: new InMemoryLifeRepository(), now: () => clock.now, library })
  await store.setDomainState('health', 'grow', true)
  await store.setDomainState('home', 'maintain', true)
  const hs: [string, string, 'health' | 'home', number][] = [
    ['h_walk', 'test مشي', 'health', 20],
    ['h_room', 'test غرفة', 'home', 10],
    ['h_read', 'test قراءة', 'health', 15],
  ]
  for (const [id, title, domain, min] of hs) {
    await store.upsertHabit(
      makeHabit({ id, domain, titleAr: title, titleEn: title, schedule: schedule([1, 2, 3, 4, 5, 6, 7]), durationMin: min, minimumDurationMin: 5, createdDate: '2026-09-01' }),
      true,
    )
  }
  return store
}

const sug = (store: LifeStore, habitId: string) =>
  todayView(store.getSnapshot(), store.today()).suggestions.find((x) => x.item.itemId === habitId)!.item

/** Where an item she touched is visible now — must always be exactly one place. */
function placesOf(store: LifeStore, planItemId: string, title: string, horizon = 30): string[] {
  const s = store.getSnapshot()
  const today = store.today()
  const v = todayView(s, today)
  const out: string[] = []
  if (v.plan.items.some((i) => i.id === planItemId)) out.push('plan')
  if (v.suggestions.some((x) => x.item.id === planItemId)) out.push('suggestions')
  if (v.later.some((i) => i.id === planItemId)) out.push('later')
  if (openInbox(s).some((i) => i.title === title) || s.tasks.some((t) => t.title === title && t.status === 'inbox')) out.push('inbox')
  for (let d = 1; d <= horizon; d++) {
    const p = s.dayPlans.find((x) => x.date === dayKey(addDays(today, d)))
    if (p?.items.some((i) => i.id === planItemId)) out.push(`+${d}`)
  }
  return out
}

describe('QA area 1 — moving items never loses them', () => {
  it('moveToDate refuses today and past days (the item stays on today)', async () => {
    const clock = { now: mkDate(2026, 10, 24, 9) }
    const store = await storeAt(clock)
    const it = sug(store, 'h_room')
    await store.acceptSuggestion(it.id)
    const today = store.today()
    expect(await store.moveToDate(it.id, today, today)).toBe(false)
    expect(await store.moveToDate(it.id, addDays(today, -23), today)).toBe(false)
    expect(placesOf(store, it.id, it.title.ar)).toEqual(['plan'])
    expect(await store.moveToDate(it.id, addDays(today, 3), today)).toBe(true)
    expect(placesOf(store, it.id, it.title.ar)).toEqual(['+3'])
  })

  it('invariant: after any sequence of moves, an item is visible in exactly one place', async () => {
    const clock = { now: mkDate(2026, 10, 24, 9) }
    const store = await storeAt(clock)
    const today = store.today()
    const items = ['h_walk', 'h_room', 'h_read'].map((h) => sug(store, h))
    const ops: ((id: string) => Promise<unknown>)[] = [
      (id) => store.acceptSuggestion(id),
      (id) => store.moveToLater(id),
      (id) => store.restoreFromLater(id),
      (id) => store.moveToDate(id, addDays(today, 2), today),
      (id) => store.moveToDate(id, today, today), // refused
      (id) => store.unaccept(id),
    ]
    for (const it of items) {
      await store.acceptSuggestion(it.id)
      for (const op of ops) {
        await op(it.id)
        expect(placesOf(store, it.id, it.title.ar), `${it.title.ar}`).toHaveLength(1)
      }
    }
    // all three ended where the last successful move put them: two days ahead
    for (const it of items) expect(placesOf(store, it.id, it.title.ar)).toEqual(['+2'])
  })

  it('«رجّعيها للوارد» takes it off today and it lives only in the inbox', async () => {
    const clock = { now: mkDate(2026, 10, 24, 9) }
    const store = await storeAt(clock)
    const it = sug(store, 'h_room')
    await store.acceptSuggestion(it.id)
    await store.planItemToInbox(it.id, store.today())
    expect(placesOf(store, it.id, it.title.ar)).toEqual(['inbox'])
  })
})

describe('QA area 1 — done tasks and the day load', () => {
  it('a task completed today stays in tasksForDay; one completed yesterday does not', async () => {
    const clock = { now: mkDate(2026, 10, 23, 10) }
    const store = await storeAt(clock)
    const t1 = await store.addTask({ title: 'test أمس', status: 'planned', dueDate: '2026-10-23' })
    await store.completeTask(t1.id)
    clock.now = mkDate(2026, 10, 24, 10)
    const store2 = store // same store, clock moved
    const t2 = await store2.addTask({ title: 'test اليوم', status: 'planned', dueDate: '2026-10-24' })
    await store2.completeTask(t2.id)
    const titles = tasksForDay(store2.getSnapshot(), mkDate(2026, 10, 24)).map((t) => t.title)
    expect(titles).toContain('test اليوم')
    expect(titles).not.toContain('test أمس')
    expect(tasksForDay(store2.getSnapshot(), mkDate(2026, 10, 24)).find((t) => t.title === 'test اليوم')!.status).toBe('done')
  })

  it('finished items no longer count toward the busy note', async () => {
    const clock = { now: mkDate(2026, 10, 24, 9) }
    const store = await storeAt(clock)
    await store.updateSettings({ ...store.getSnapshot().settings, dailyBudgetMin: 20 })
    for (const h of ['h_walk', 'h_room', 'h_read']) await store.acceptSuggestion(sug(store, h).id)
    expect(todayView(store.getSnapshot(), store.today()).load.busy).toBe(true)
    for (const i of todayView(store.getSnapshot(), store.today()).plan.items) await store.completeItem(i, 'normal')
    const load = todayView(store.getSnapshot(), store.today()).load
    expect(load.busy).toBe(false)
    expect(load.overByMin).toBe(0)
  })
})

describe('QA area 1 — a deliberate «بكرة» is not a comeback', () => {
  it('moving a habit to tomorrow, then doing it tomorrow, earns no comeback ×2', async () => {
    const clock = { now: mkDate(2026, 10, 24, 20) }
    const store = await storeAt(clock)
    // she did it the day before, so the only "gap" is the day she moved it
    clock.now = mkDate(2026, 10, 23, 9)
    const prev = sug(store, 'h_room')
    await store.acceptSuggestion(prev.id)
    await store.completeItem(prev, 'normal')
    clock.now = mkDate(2026, 10, 24, 20)
    const it = sug(store, 'h_room')
    await store.acceptSuggestion(it.id)
    await store.eveningDecision({ planItemId: it.id }, 'tomorrow')
    clock.now = mkDate(2026, 10, 25, 9)
    const tmr = todayView(store.getSnapshot(), store.today()).plan.items.find((i) => i.itemId === 'h_room')!
    expect(tmr.why.code).not.toBe('comeback')
    const r = await store.completeItem(tmr, 'normal')
    expect(r.award.comeback).toBe(false)
  })
})
