import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { createLifeStore, InMemoryLifeRepository, makeHabit, mkDate, type LifeStore } from '../../../src/domain'
import { ToastProvider } from '../../../src/ui/components/Toast'
import StudioEntry from '../../../src/ui/screens/habits/StudioEntry'
import OnboardingScreen from '../../../src/ui/screens/me/OnboardingScreen'
import { onboardingExtraSteps } from '../../../src/ui/screens/me/onboardingExtraSteps'
import { LifeStoreProvider } from '../../../src/ui/state/LifeStore'
import { library } from '../../domain/helpers'

const NOW = mkDate(2026, 10, 5, 10)
async function makeStore(): Promise<LifeStore> {
  const repo = new InMemoryLifeRepository()
  await repo.open()
  return createLifeStore({ repo, now: () => NOW, library })
}
const mount = (store: LifeStore, path: string, ui = <StudioEntry />) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <ToastProvider>
        <LifeStoreProvider store={store}>{ui}</LifeStoreProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
beforeEach(() => {
  try {
    window.localStorage.clear()
  } catch {
    /* ignore */
  }
})

describe('Habit Studio wizard', () => {
  it('opens the wizard for a new habit, and the quick form on ?mode=quick', async () => {
    const store = await makeStore()
    const { unmount } = mount(store, '/studio')
    expect(await screen.findByRole('progressbar', { name: 'خطوات العادة' })).toHaveAttribute('aria-valuetext', 'الخطوة 1 من 9')
    unmount()
    mount(store, '/studio?mode=quick')
    expect(await screen.findByRole('textbox', { name: 'الاسم' })).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('walks the steps with back/next, asks for a name first, and saves', async () => {
    const store = await makeStore()
    const count = store.getSnapshot().habits.length
    mount(store, '/studio')
    fireEvent.click(await screen.findByRole('button', { name: /التالي: السلوك/ }))
    expect(screen.getByRole('progressbar', { name: 'خطوات العادة' })).toHaveAttribute('aria-valuenow', '2')
    // name is required to leave the behaviour step
    fireEvent.click(screen.getByRole('button', { name: /التالي: النسخ/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent('اكتبي اسم العادة')
    fireEvent.change(screen.getByRole('textbox', { name: /الاسم/ }), { target: { value: 'test' } })
    fireEvent.click(screen.getByRole('button', { name: /التالي: النسخ/ }))
    // (the leaving card may still be exiting in jsdom — the newest «السابق» belongs to the open step)
    fireEvent.click(screen.getAllByRole('button', { name: 'السابق' }).at(-1)!)
    expect(screen.getByRole('textbox', { name: /الاسم/ })).toHaveValue('test')
    await act(async () => fireEvent.click(screen.getAllByRole('button', { name: 'احفظي العادة' })[0]!))
    await waitFor(() => expect(store.getSnapshot().habits.length).toBe(count + 1))
    expect(store.getSnapshot().habits.find((h) => h.titleAr === 'test')!.status).toBe('active')
  })

  it('save as draft keeps it paused', async () => {
    const store = await makeStore()
    mount(store, '/studio')
    fireEvent.click(await screen.findByRole('button', { name: /التالي: السلوك/ }))
    fireEvent.change(screen.getByRole('textbox', { name: /الاسم/ }), { target: { value: 'test' } })
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'احفظيها كمسودة' })))
    await waitFor(() => expect(store.getSnapshot().habits.some((h) => h.titleAr === 'test')).toBe(true))
    expect(store.getSnapshot().habits.find((h) => h.titleAr === 'test')!.status).toBe('paused')
  })

  it('prefills from the evidence library, marks fields «مقترح», and undoes it', async () => {
    const store = await makeStore()
    mount(store, '/studio')
    fireEvent.click(await screen.findByRole('button', { name: 'تصفّحي الاقتراحات' }))
    const dialog = await screen.findByRole('dialog')
    const rows = within(dialog).getAllByRole('button').filter((b) => b.className.includes('pickRow'))
    expect(rows.length).toBeGreaterThan(3)
    fireEvent.click(rows[0]!)
    expect(await screen.findByText(/عبّأنا الحقول/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /التالي: السلوك/ }))
    expect((screen.getByRole('textbox', { name: /الاسم/ }) as HTMLInputElement).value.length).toBeGreaterThan(0)
    expect(screen.getAllByText('مقترح').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: 'تراجعي عن التعبئة' }))
    expect(screen.getByRole('textbox', { name: /الاسم/ })).toHaveValue('')
    expect(screen.queryByText(/عبّأنا الحقول/)).not.toBeInTheDocument()
  })

  it('editing an existing habit opens the quick form and offers the wizard', async () => {
    const store = await makeStore()
    await store.upsertHabit(makeHabit({ id: 'h_test', domain: 'home', titleAr: 'test', titleEn: 'test' }), true)
    const h = store.getSnapshot().habits.find((x) => x.id === 'h_test')!
    mount(store, `/studio?habit=${h.id}`)
    expect(await screen.findByRole('textbox', { name: 'الاسم' })).toHaveValue(h.titleAr)
    expect(screen.getByRole('button', { name: 'خطوة خطوة' })).toBeInTheDocument()
  })
})

describe('Onboarding life map', () => {
  async function toMap(store: LifeStore) {
    mount(store, '/onboarding', <OnboardingScreen />)
    fireEvent.click(screen.getByRole('button', { name: 'يلا نبدأ' }))
    for (let i = 0; i < 2; i++) fireEvent.click(await screen.findByRole('button', { name: /^(التالي|تخطّي)$/ }))
    await screen.findByRole('heading', { name: 'خريطة حياتك لهذا الموسم' })
  }
  const tier = (domain: string, label: string) => within(screen.getByRole('group', { name: `حالة ${domain}` })).getByRole('button', { name: label })

  it('shows counters, holds the caps with a calm note, and writes the map on finish', async () => {
    const store = await makeStore()
    await toMap(store)
    const names = store.getSnapshot().domains.filter((d) => d.enabled && !d.sensitive && d.id !== 'joy')
    // push everything to rest, then try 4 grow
    for (const d of names) fireEvent.click(tier(d.nameAr, 'راحة'))
    for (const d of names.slice(0, 3)) fireEvent.click(tier(d.nameAr, 'نمو'))
    fireEvent.click(tier(names[3]!.nameAr, 'نمو'))
    expect(screen.getByText(/ثلاثة مجالات نمو كفاية/)).toBeInTheDocument()
    expect(tier(names[3]!.nameAr, 'نمو')).toHaveAttribute('aria-pressed', 'false')
    for (const d of names.slice(3, 8)) fireEvent.click(tier(d.nameAr, 'صيانة'))
    fireEvent.click(tier(names[8]!.nameAr, 'صيانة'))
    expect(screen.getByText(/خمسة مجالات/)).toBeInTheDocument()
    // finish
    for (let i = 0; i < 4; i++) fireEvent.click(await screen.findByRole('button', { name: /^(التالي|تخطّي)$/ })) // joy, products, starters, privacy
    fireEvent.click(await screen.findByRole('button', { name: /ابدئي يومك/ }))
    await waitFor(() => expect(store.getSnapshot().settings.onboardingDone).toBe(true))
    const st = store.getSnapshot().domains
    for (const d of names.slice(0, 3)) expect(st.find((x) => x.id === d.id)!.state).toBe('grow')
    for (const d of names.slice(3, 8)) expect(st.find((x) => x.id === d.id)!.state).toBe('maintain')
    expect(st.find((x) => x.id === names[8]!.id)!.state).toBe('rest')
  })

  it('inserts the registered joy step right after the map and counts it in the progress dots', async () => {
    expect(onboardingExtraSteps.map((e) => e.id)).toEqual(['joy'])
    const store = await makeStore()
    await toMap(store)
    expect(screen.getByRole('progressbar', { name: 'خطوات البداية' })).toHaveAttribute('aria-valuemax', '7')
  })
})
