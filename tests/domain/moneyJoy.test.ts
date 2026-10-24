/** Feature C: money envelopes, payday saving reminder, joy map + bundles. Test data is named «test». */
import { describe, expect, it } from 'vitest'
import {
  InMemoryLifeRepository, MAX_JOY_BUNDLES, applySpend, bindBundle, buildIcs, bundleCandidates, canAddBundle, categoriesThisCycle,
  categoryEnvelopeId, createLifeStore, currentBudgetCycle, envelopeState, envelopesThisCycle, explicitReminders, habitsForBundle, joyBundles,
  joyMapGroups, makeJoyItem, mkDate, previousCategories, reminderItems, reminderPlanFor, savingReminderInfo, spendBreakdown, unbindBundle,
  type LifeSnapshot, type MoneyEnvelope, ModuleStateJ,
} from '../../src/domain'
import { library, simpleHabit } from './helpers'

const NOON = mkDate(2026, 10, 27, 12)
const env = (id: string, month: string, planned: number, spent = 0, t = 'test'): MoneyEnvelope => ({ id, titleAr: t, titleEn: t, month, planned, spent })

async function snap(o: Partial<LifeSnapshot> = {}, now = NOON): Promise<LifeSnapshot> {
  const store = await createLifeStore({ repo: new InMemoryLifeRepository(), now: () => now, library })
  return { ...store.getSnapshot(), ...o }
}

describe('envelopeState — calm, descriptive tones', () => {
  it('maps spent/plan to a tone without any failure state', () => {
    expect(envelopeState({ planned: 0, spent: 40 }).tone).toBe('noPlan')
    expect(envelopeState({ planned: 100, spent: 10 })).toMatchObject({ tone: 'roomy', remaining: 90, overBy: 0 })
    expect(envelopeState({ planned: 100, spent: 80 }).tone).toBe('close')
    expect(envelopeState({ planned: 100, spent: 100 }).tone).toBe('full')
    expect(envelopeState({ planned: 100, spent: 130 })).toMatchObject({ tone: 'over', overBy: 30, ratio: 1, remaining: 0 })
  })
})

describe('category envelopes inside the cycle', () => {
  it('belong to the payday cycle key and sub-divide the spend envelope', async () => {
    const s0 = await snap({ settings: { ...(await snap()).settings, paydayDay: 25 } })
    const cycle = currentBudgetCycle(s0, NOON) // payday 25 → cycle started Oct 25
    expect(cycle.key).toBe('2026-10')
    const cat = categoryEnvelopeId(cycle.key, 'a')
    const spend = env(`env_${cycle.key}_spend`, cycle.key, 1000, 200)
    const s = { ...s0, moneyEnvelopes: [spend, env(cat, cycle.key, 300, 50), env('env_2026-09_cat_x', '2026-09', 99)] }
    expect(categoriesThisCycle(s, NOON).map((e) => e.id)).toEqual([cat])
    expect(envelopesThisCycle(s, NOON)).toHaveLength(2)
    const bd = spendBreakdown(envelopesThisCycle(s, NOON))
    expect(bd).toMatchObject({ planned: 1000, spent: 200, allocated: 300, categorized: 50, unallocated: 700, uncategorized: 150 })
  })

  it('applySpend raises the category and the month spend together; before restores both', () => {
    const spend = env('env_2026-10_spend', '2026-10', 1000, 200)
    const cat = env(categoryEnvelopeId('2026-10', 'a'), '2026-10', 300, 50)
    const r = applySpend([spend, cat], cat, 25)
    expect(r.next.map((e) => e.spent)).toEqual([75, 225])
    expect(r.before).toEqual([cat, spend])
    const plain = applySpend([spend, cat], spend, 10)
    expect(plain.next).toHaveLength(1)
    expect(plain.next[0]!.spent).toBe(210)
  })

  it('offers the latest earlier cycle’s categories for a new month, never the spend/save/bills rows', async () => {
    const s0 = await snap()
    const s = {
      ...s0,
      moneyEnvelopes: [
        env('env_2026-08_cat_a', '2026-08', 1), env('env_2026-09_cat_b', '2026-09', 2, 5), env('env_2026-09_cat_c', '2026-09', 3),
        env('env_2026-09_spend', '2026-09', 9),
      ],
    }
    expect(previousCategories(s, NOON).map((e) => e.id)).toEqual(['env_2026-09_cat_b', 'env_2026-09_cat_c'])
  })

  it('keeps paydayHistory semantics: a payday change does not move the cycle key of categories already saved', async () => {
    const s0 = await snap({}, mkDate(2026, 10, 10))
    const s = { ...s0, settings: { ...s0.settings, paydayDay: 27, paydayHistory: [{ until: '2026-10-27', day: 1 }] } }
    const cycle = currentBudgetCycle(s, mkDate(2026, 10, 10))
    const withCat = { ...s, moneyEnvelopes: [env(categoryEnvelopeId(cycle.key, 'a'), cycle.key, 10)] }
    expect(categoriesThisCycle(withCat, mkDate(2026, 10, 20))).toHaveLength(1)
  })
})

describe('payday saving reminder', () => {
  const withSaving = async (day: number | null, minute = 9 * 60, notificationsEnabled = true) => {
    const s = await snap()
    return { ...s, settings: { ...s.settings, notificationsEnabled, quietHoursEnabled: false }, moduleState: { ...s.moduleState, autoSaveDay: day, autoSaveMinute: minute } }
  }

  it('is a monthly explicit reminder only on its day, once, at her time', async () => {
    const s = await withSaving(27)
    expect(reminderItems(s).find((r) => r.kind === 'saving')).toMatchObject({ key: 'money:autosave', minute: 540, monthDay: 27 })
    expect(explicitReminders(s).find((r) => r.itemId === 'money:autosave')?.monthDay).toBe(27)
    const on = reminderPlanFor(s, mkDate(2026, 10, 27)).nudges.filter((n) => n.itemId === 'money:autosave')
    expect(on).toHaveLength(1)
    expect(on[0]!.minute).toBe(540)
    expect(reminderPlanFor(s, mkDate(2026, 10, 26)).nudges.some((n) => n.itemId === 'money:autosave')).toBe(false)
    // the generic dues line is not announced a second time
    expect(reminderPlanFor(s, mkDate(2026, 10, 27)).nudges.some((n) => n.kind === 'dues')).toBe(false)
  })

  it('is off when no day is set, and silent while the master switch is off', async () => {
    expect(reminderItems(await withSaving(null)).some((r) => r.kind === 'saving')).toBe(false)
    const off = await withSaving(27, 540, false)
    expect(reminderPlanFor(off, mkDate(2026, 10, 27)).nudges).toHaveLength(0)
  })

  it('reports the next date and defaults the day to payday (capped at 28)', async () => {
    const s = await withSaving(27)
    expect(savingReminderInfo(s, NOON)).toMatchObject({ enabled: true, day: 27, minute: 540 })
    const dflt = await withSaving(null)
    expect(savingReminderInfo({ ...dflt, settings: { ...dflt.settings, paydayDay: 30 } }, NOON).day).toBe(28)
  })

  it('exports to .ics as a MONTHLY rule with the day of month', async () => {
    const s = await withSaving(27)
    const ics = buildIcs({ items: reminderItems(s).filter((r) => r.kind === 'saving'), leadMin: 0, now: mkDate(2026, 10, 3, 8), timeZone: 'Asia/Riyadh' })
    expect(ics).toContain('RRULE:FREQ=MONTHLY;BYMONTHDAY=27')
    expect(ics).toContain('DTSTART;TZID=Asia/Riyadh:20261027T090000')
    expect(ics).toContain('UID:money:autosave@wejdan-life-os')
  })

  it('round-trips through moduleState JSON', () => {
    const m = ModuleStateJ.fromJson(ModuleStateJ.toJson({ ...ModuleStateJ.fromJson({}), autoSaveDay: 20, autoSaveMinute: 600 }))
    expect(m).toMatchObject({ autoSaveDay: 20, autoSaveMinute: 600 })
  })
})

describe('joy map and bundles', () => {
  const j = (id: string, p: Partial<ReturnType<typeof makeJoyItem>> = {}) => makeJoyItem({ id, kind: 'free', titleAr: 'test', titleEn: 'test', ...p })

  it('groups active non-earned joys by size', async () => {
    const s = await snap({ joyItems: [j('a', { size: 'quick' }), j('b', { size: 'big', costsMoney: true }), j('c', { size: 'medium', kind: 'bundled', bundledHabitId: 'h' }), j('d', { kind: 'earned', price: 50 }), j('e', { active: false })] })
    const g = joyMapGroups(s)
    expect(g.quick.map((x) => x.id)).toEqual(['a'])
    expect(g.medium.map((x) => x.id)).toEqual(['c'])
    expect(g.big.map((x) => x.id)).toEqual(['b'])
  })

  it('caps bundles at three, one per habit, and never offers the only free joy', async () => {
    const habits = ['h1', 'h2', 'h3', 'h4'].map((id) => ({ ...simpleHabit({ id, created: '2026-09-01' }), status: 'active' as const }))
    let s = await snap({ habits, joyItems: [j('a'), j('b'), j('c'), j('d')] })
    expect(bundleCandidates(s)).toHaveLength(4)
    for (const [i, h] of ['h1', 'h2', 'h3'].entries()) {
      s = { ...s, joyItems: s.joyItems.map((x) => (x.id === 'abc'[i] ? bindBundle(x, h) : x)) }
    }
    expect(joyBundles(s)).toHaveLength(MAX_JOY_BUNDLES)
    expect(canAddBundle(s)).toBe(false)
    expect(habitsForBundle(s).map((h) => h.id)).toEqual(['h4'])
    expect(bundleCandidates(s)).toEqual([]) // only «d» is free now
    const back = unbindBundle(s.joyItems[0]!)
    expect(back).toMatchObject({ kind: 'free', bundledHabitId: null })
  })

  it('a bundled joy still reaches the planner next to its habit and survives export/import', async () => {
    const store = await createLifeStore({ repo: new InMemoryLifeRepository(), now: () => NOON, library })
    await store.upsertJoyItem(bindBundle(j('x', { titleAr: 'test' }), 'some_habit'))
    const dump = await store.exportAll()
    const fresh = await createLifeStore({ repo: new InMemoryLifeRepository(), now: () => NOON, library })
    await fresh.importAll(JSON.parse(JSON.stringify(dump)), { confirm: true })
    expect(fresh.getSnapshot().joyItems.find((x) => x.id === 'x')).toMatchObject({ kind: 'bundled', bundledHabitId: 'some_habit' })
  })
})
