import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { createLifeStore, InMemoryLifeRepository, makeJoyItem, mkDate, type LifeStore } from '../../../src/domain'
import { ToastProvider } from '../../../src/ui/components/Toast'
import OnboardingScreen from '../../../src/ui/screens/me/OnboardingScreen'
import { LifeStoreProvider } from '../../../src/ui/state/LifeStore'
import { library } from '../../domain/helpers'

const NOW = mkDate(2026, 10, 5, 10)
async function makeStore(): Promise<LifeStore> {
  const repo = new InMemoryLifeRepository()
  await repo.open()
  return createLifeStore({ repo, now: () => NOW, library })
}
function mount(store: LifeStore) {
  return render(
    <MemoryRouter initialEntries={['/onboarding']}>
      <ToastProvider>
        <LifeStoreProvider store={store}>
          <OnboardingScreen />
        </LifeStoreProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}
const nextBtn = () => screen.findByRole('button', { name: /^(التالي|تخطّي)$/ })
async function toJoy() {
  fireEvent.click(screen.getByRole('button', { name: 'يلا نبدأ' }))
  for (let i = 0; i < 3; i++) fireEvent.click(await nextBtn()) // name, wake, map
  await screen.findByRole('heading', { name: 'وش يفرّحك؟' })
}

beforeEach(() => {
  try {
    window.localStorage.clear()
  } catch {
    /* ignore */
  }
})

describe('Onboarding joy step', () => {
  it('new user: empty groups invite a first joy, nothing is saved, and the footer says «تخطّي»', async () => {
    const store = await makeStore()
    mount(store)
    await toJoy()
    expect(screen.getAllByText('أضيفي أول وحدة')).toHaveLength(3)
    expect(store.getSnapshot().joyItems).toHaveLength(0)
    expect(screen.getByRole('button', { name: 'تخطّي' })).toBeInTheDocument()
    expect(screen.getByText(/بعد ما تضيفين عاداتك/)).toBeInTheDocument()
  })

  it('skipping leaves joys untouched and the flow completes', async () => {
    const store = await makeStore()
    mount(store)
    await toJoy()
    for (let i = 0; i < 3; i++) fireEvent.click(await nextBtn()) // joy, products, starters
    fireEvent.click(await screen.findByRole('button', { name: /ابدئي يومك/ }))
    await waitFor(() => expect(store.getSnapshot().settings.onboardingDone).toBe(true))
    expect(store.getSnapshot().joyItems).toHaveLength(0)
  })

  it('a suggestion chip saves only on tap, once (idempotent), lands in its size group and stays editable', async () => {
    const store = await makeStore()
    mount(store)
    await toJoy()
    const sug = within(screen.getByRole('group', { name: 'أفكار تبدين منها' }))
    fireEvent.click(sug.getByRole('button', { name: /قهوة بهدوء/ }))
    await waitFor(() => expect(store.getSnapshot().joyItems).toHaveLength(1))
    expect(store.getSnapshot().joyItems[0]).toMatchObject({ id: 'joy_onb_coffee', titleAr: 'قهوة بهدوء', kind: 'free', size: 'quick' })
    expect(screen.getByRole('group', { name: 'أفكار تبدين منها' }).textContent).not.toMatch(/قهوة بهدوء/)
    expect(screen.getByRole('button', { name: 'التالي' })).toBeInTheDocument()
    // tapping the map chip opens the editor
    const quickGroup = screen.getAllByRole('group').find((g) => g.getAttribute('aria-label')?.startsWith('متع') && g.textContent?.includes('قهوة بهدوء'))!
    fireEvent.click(within(quickGroup).getByRole('button', { name: /قهوة بهدوء/ }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('an existing joy is shown and finish is idempotent (no duplicate)', async () => {
    const store = await makeStore()
    await store.upsertJoyItem(makeJoyItem({ id: 'joy_onb_walk', kind: 'free', titleAr: 'مشي قصير', titleEn: 'x', size: 'quick' }))
    mount(store)
    await toJoy()
    const sug = within(screen.getByRole('group', { name: 'أفكار تبدين منها' }))
    expect(sug.queryByRole('button', { name: /مشي قصير/ })).toBeNull()
    for (let i = 0; i < 3; i++) fireEvent.click(await nextBtn())
    fireEvent.click(await screen.findByRole('button', { name: /ابدئي يومك/ }))
    await waitFor(() => expect(store.getSnapshot().settings.onboardingDone).toBe(true))
    expect(store.getSnapshot().joyItems).toHaveLength(1)
  })
})
