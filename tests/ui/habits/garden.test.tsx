import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { createLifeStore, DOMAIN_IDS, InMemoryLifeRepository, mkDate, type LifeStore } from '../../../src/domain'
import { ToastProvider } from '../../../src/ui/components/Toast'
import { DOMAIN_FLOWER, Flower, FLOWER_KINDS, flowerForDomain, loadDrawings, STAGE_OF } from '../../../src/ui/components/flowers'
import GardenScreen from '../../../src/ui/screens/habits/GardenScreen'
import HabitsScreen from '../../../src/ui/screens/habits/HabitsScreen'
import { LifeStoreProvider } from '../../../src/ui/state/LifeStore'
import { library, simpleHabit } from '../../domain/helpers'

const NOW = mkDate(2026, 10, 5, 10)
async function makeStore(): Promise<LifeStore> {
  const repo = new InMemoryLifeRepository()
  await repo.open()
  return createLifeStore({ repo, now: () => NOW, library })
}
function mount(store: LifeStore, ui: JSX.Element, path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ToastProvider>
        <LifeStoreProvider store={store}>{ui}</LifeStoreProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('flower system', () => {
  it('every visible category has its own flower, and every flower has 5 drawn stages', async () => {
    const visible = DOMAIN_IDS.filter((d) => d !== 'aquarium')
    const flowers = visible.map(flowerForDomain)
    expect(new Set(flowers).size).toBe(visible.length)
    expect(DOMAIN_FLOWER.care).toBe('hydrangea')
    expect(DOMAIN_FLOWER.health).toBe('delphinium')
    const d = await loadDrawings()
    for (const k of FLOWER_KINDS) for (const st of ['1', '2', '3', '4', '5'] as const) expect(d[k][st].length).toBeGreaterThan(50)
  })

  it('maps habit strength to flower stages in order', () => {
    expect([STAGE_OF.seed, STAGE_OF.sprout, STAGE_OF.growing, STAGE_OF.rooted, STAGE_OF.automatic]).toEqual([1, 2, 3, 4, 5])
  })

  it('a Flower is labelled with its name and stage', async () => {
    render(<Flower kind="hydrangea" stage={4} />)
    expect(screen.getByRole('img', { name: 'هيدرنجا · مزهرة' })).toBeInTheDocument()
  })
})

describe('GardenScreen', () => {
  it('empty garden invites the first seed', async () => {
    const store = await makeStore()
    mount(store, <GardenScreen />, '/habits/garden')
    expect(await screen.findByText('حديقتك تنتظر أول بذرة')).toBeInTheDocument()
  })

  it('shows each habit as its category flower with a stage word', async () => {
    const store = await makeStore()
    await store.setDomainState('health', 'maintain', true)
    await store.upsertHabit({ ...simpleHabit({ id: 'walk', domain: 'health' }), titleAr: 'مشي' }, true)
    mount(store, <GardenScreen />, '/habits/garden')
    // the bed's plant and the one-line list row (board) both carry «الاسم · التصنيف · المرحلة»
    const bed = await screen.findByRole('region', { name: 'حوض الورد' })
    expect(within(bed).getByRole('button', { name: /مشي · .* · بذرة/ })).toBeInTheDocument()
    expect(screen.getByText('مشي')).toBeInTheDocument()
  })

  it('shows a habit not done on any planned day this past week as «ترتاح» (Flutter parity)', async () => {
    const store = await makeStore()
    await store.setDomainState('health', 'maintain', true)
    // created three weeks before NOW, never done → rests; the flower stays (plants never die)
    await store.upsertHabit({ ...simpleHabit({ id: 'walk', domain: 'health', created: '2026-09-14' }), titleAr: 'مشي' }, true)
    mount(store, <GardenScreen />, '/habits/garden')
    const bed = await screen.findByRole('region', { name: 'حوض الورد' })
    expect(within(bed).getByRole('button', { name: /مشي · .* · ترتاح/ })).toBeInTheDocument()
  })

  it('Habits links to the garden once she has habits', async () => {
    const store = await makeStore()
    await store.upsertHabit({ ...simpleHabit({ id: 'walk', domain: 'health' }), titleAr: 'مشي' }, true)
    mount(store, <HabitsScreen />, '/habits')
    expect(await screen.findByRole('button', { name: /شوفي حديقتي/ })).toBeInTheDocument()
  })
})
