import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { InMemoryLifeRepository, createLifeStore, mkDate, type LifeStore } from '../../../src/domain'
import { ToastProvider } from '../../../src/ui/components/Toast'
import { ThemeProvider } from '../../../src/ui/shell/theme'
import { LifeStoreProvider } from '../../../src/ui/state/LifeStore'
import MeScreen from '../../../src/ui/screens/me/MeScreen'
import InboxScreen from '../../../src/ui/screens/me/InboxScreen'
import MoneyScreen from '../../../src/ui/screens/me/MoneyScreen'
import SettingsScreen from '../../../src/ui/screens/me/SettingsScreen'
import HelpScreen from '../../../src/ui/screens/me/HelpScreen'
import OnboardingScreen from '../../../src/ui/screens/me/OnboardingScreen'

// Mid-cycle day (not payday) at noon
const NOW = mkDate(2026, 10, 14)
NOW.setHours(12)

async function makeStore(): Promise<LifeStore> {
  return createLifeStore({ repo: new InMemoryLifeRepository(), now: () => new Date(NOW) })
}

function wrap(store: LifeStore, ui: ReactNode, path = '/me') {
  return render(
    <ThemeProvider>
      <ToastProvider>
        <LifeStoreProvider store={store}>
          <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
        </LifeStoreProvider>
      </ToastProvider>
    </ThemeProvider>,
  )
}

describe('Me', () => {
  it('lists every destination once and shows the inbox count', async () => {
    const store = await makeStore()
    await store.quickAdd('test')
    wrap(store, <MeScreen />)
    for (const t of ['الوارد', 'منتجاتي', 'المال', 'البيت والمعاملات', 'الأنماط', 'الأدلة والمصادر', 'المصادر والاستيراد', 'البيانات', 'الإعدادات', 'المساعدة والسلامة'])
      expect(screen.getAllByText(t)).toHaveLength(1)
    // weekly review appears as the card only (no duplicate row)
    expect(screen.getAllByText(/مراجعة الأسبوع جاهزة|قفلتي فصل هالأسبوع/)).toHaveLength(1)
    const badge = document.querySelector('[class*="badge"]')
    expect(badge).toHaveTextContent('1')
  })
})

describe('Inbox', () => {
  it('captures a title-only item and deletes it with undo', async () => {
    const store = await makeStore()
    wrap(store, <InboxScreen />, '/me/inbox')
    fireEvent.change(screen.getByPlaceholderText(/اكتبي أي شي/), { target: { value: 'test' } })
    fireEvent.click(screen.getByRole('button', { name: 'أضيفي' }))
    await waitFor(() => expect(store.getSnapshot().inbox.some((i) => i.title === 'test')).toBe(true))
    const id = store.getSnapshot().inbox.find((i) => i.title === 'test')!.id
    const token = await act(() => store.deleteInbox(id))
    expect(store.getSnapshot().inbox.some((i) => i.id === id)).toBe(false)
    await act(() => store.undoDelete(token!.token))
    expect(store.getSnapshot().inbox.some((i) => i.id === id)).toBe(true)
  })
})

describe('Money', () => {
  it('starts the month on payday (default 1) and saves a plan', async () => {
    const store = await makeStore()
    expect(store.getSnapshot().settings.paydayDay).toBe(1)
    wrap(store, <MoneyScreen />, '/me/money')
    expect(screen.getByText('ما نربط أي حساب بنكي', { exact: false })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'رتّبي الشهر' }))
    const dialog = await screen.findByRole('dialog')
    const inputs = within(dialog).getAllByRole('textbox')
    fireEvent.change(inputs[0], { target: { value: '1000' } })
    fireEvent.change(inputs[2], { target: { value: '1750' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'اعتمدي خطة الشهر' }))
    await waitFor(() => expect(store.getSnapshot().moneyEnvelopes.length).toBe(3))
    const spend = store.getSnapshot().moneyEnvelopes.find((e) => e.id.endsWith('_spend'))!
    expect(spend.planned).toBe(1750)
    expect(spend.month).toBe('2026-10')
  })
})

describe('Settings', () => {
  it('changes payday and needs two confirmations to delete everything', async () => {
    const store = await makeStore()
    wrap(store, <SettingsScreen />, '/me/settings')
    fireEvent.change(screen.getByLabelText('يوم الراتب'), { target: { value: '27' } })
    await waitFor(() => expect(store.getSnapshot().settings.paydayDay).toBe(27))
    expect(store.getSnapshot().settings.notificationsEnabled).toBe(false)
    fireEvent.click(screen.getByText('احذفي كل شي'))
    // the confirmation is a real sheet (dialog), not inline text under the row (QA area 5 #5)
    const sheet = await screen.findByRole('dialog', { name: 'متأكدة تحذفين كل بياناتك؟' })
    fireEvent.click(within(sheet).getByRole('button', { name: 'إيه، احذفي كل شي' }))
    expect(await screen.findByRole('dialog', { name: /آخر تأكيد/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'لا، خليها' }))
    await waitFor(() => expect(screen.queryByText(/آخر تأكيد/)).not.toBeInTheDocument())
    expect(store.getSnapshot().settings.paydayDay).toBe(27)
  })
})

describe('Help', () => {
  it('shows the emergency numbers as call links', () => {
    return makeStore().then((store) => {
      wrap(store, <HelpScreen />, '/help')
      expect(screen.getByRole('link', { name: 'اتصلي بالإسعاف 997' })).toHaveAttribute('href', 'tel:997')
      expect(screen.getByRole('link', { name: 'اتصلي بالطوارئ الموحد 911' })).toHaveAttribute('href', 'tel:911')
    })
  })
})

describe('Onboarding', () => {
  it('walks through and marks onboarding done', async () => {
    const store = await makeStore()
    wrap(store, <OnboardingScreen />, '/onboarding')
    fireEvent.click(screen.getByRole('button', { name: 'يلا نبدأ' }))
    fireEvent.change(await screen.findByPlaceholderText('اسمك أو اسم تحبينه'), { target: { value: 'test' } })
    for (let i = 0; i < 4; i++) {
      const btn = await screen.findByRole('button', { name: /^(التالي|تخطّي)$/ })
      fireEvent.click(btn)
    }
    // starter habits (optional, nothing preselected): pick one
    fireEvent.click(await screen.findByRole('button', { name: /المشي/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'التالي' }))
    fireEvent.click(await screen.findByRole('button', { name: /ابدئي يومك/ }))
    await waitFor(() => expect(store.getSnapshot().settings.onboardingDone).toBe(true))
    expect(store.getSnapshot().settings.displayName).toBe('test')
    expect(store.getSnapshot().habits.map((h) => h.id)).toContain('h_start_body02')
  })
})
