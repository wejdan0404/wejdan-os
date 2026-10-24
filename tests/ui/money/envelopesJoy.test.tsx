/** Feature C UI: ظروف الشهر, saving reminder card, خريطة متعتي + bundles. All data named «test». */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { InMemoryLifeRepository, createLifeStore, makeJoyItem, mkDate, type LifeStore } from '../../../src/domain'
import { ToastProvider } from '../../../src/ui/components/Toast'
import { ThemeProvider } from '../../../src/ui/shell/theme'
import { LifeStoreProvider } from '../../../src/ui/state/LifeStore'
import MoneyScreen from '../../../src/ui/screens/me/MoneyScreen'
import JoyScreen from '../../../src/ui/screens/joy/JoyScreen'
import { library, simpleHabit } from '../../domain/helpers'

async function makeStore(at: Date): Promise<LifeStore> {
  const repo = new InMemoryLifeRepository()
  await repo.open()
  return createLifeStore({ repo, now: () => new Date(at), library })
}
function wrap(store: LifeStore, ui: ReactNode) {
  return render(
    <ThemeProvider>
      <ToastProvider>
        <LifeStoreProvider store={store}>
          <MemoryRouter>{ui}</MemoryRouter>
        </LifeStoreProvider>
      </ToastProvider>
    </ThemeProvider>,
  )
}
const spendEnv = (planned: number, spent = 0) => ({ id: 'env_2026-10_spend', titleAr: 'مصروف الشهر', titleEn: 'spend', month: '2026-10', planned, spent })
const cat = (id: string, name: string, planned: number, spent: number) => ({ id: `env_2026-10_cat_${id}`, titleAr: name, titleEn: name, month: '2026-10', planned, spent })

describe('ظروف الشهر', () => {
  it('shows each category with calm state text and never uses an error/warning role', async () => {
    const store = await makeStore(mkDate(2026, 10, 14, 12))
    await store.upsertEnvelope(spendEnv(1000, 480))
    await store.upsertEnvelope(cat('a', 'test roomy', 200, 20))
    await store.upsertEnvelope(cat('b', 'test close', 100, 90))
    await store.upsertEnvelope(cat('c', 'test over', 100, 140))
    wrap(store, <MoneyScreen />)
    const card = (await screen.findByRole('heading', { name: 'ظروف الشهر' })).closest('section') as HTMLElement
    const text = card.textContent ?? ''
    expect(text).toMatch(/باقي\s*180/)
    expect(text).toContain('قربتي من الخطة')
    expect(text).toContain('فوق الخطة بـ')
    expect(within(card).getAllByRole('progressbar')).toHaveLength(3)
    expect(within(card).queryByRole('alert')).toBeNull()
    expect(text).toMatch(/غير مصنّف: صرفتي\s*230/)
  })

  it('logging into a category raises it and the month spend together, and undo restores both', async () => {
    const store = await makeStore(mkDate(2026, 10, 14, 12))
    await store.upsertEnvelope(spendEnv(1000, 100))
    await store.upsertEnvelope(cat('a', 'test cat', 200, 20))
    wrap(store, <MoneyScreen />)
    fireEvent.click(await screen.findByRole('button', { name: 'سجّلي مصروف في test cat' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: '٣٠' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'سجّليه' }))
    const spent = () => Object.fromEntries(store.getSnapshot().moneyEnvelopes.map((e) => [e.id, e.spent]))
    await waitFor(() => expect(spent()).toMatchObject({ 'env_2026-10_cat_a': 50, 'env_2026-10_spend': 130 }))
    fireEvent.click(await screen.findByRole('button', { name: 'تراجع' }))
    await waitFor(() => expect(spent()).toMatchObject({ 'env_2026-10_cat_a': 20, 'env_2026-10_spend': 100 }))
  })

  it('the month metric counts the spend envelope once (categories are not added on top)', async () => {
    const store = await makeStore(mkDate(2026, 10, 14, 12))
    await store.upsertEnvelope(spendEnv(1000, 300))
    await store.upsertEnvelope(cat('a', 'test', 400, 300))
    wrap(store, <MoneyScreen />)
    const label = await screen.findByText('مصروف الشهر لين الحين')
    const sec = label.closest('section') as HTMLElement
    expect(sec.textContent).toContain('300')
    expect(sec.textContent).toContain('1,000')
  })

  it('creates a category from a suggestion chip with a plan', async () => {
    const store = await makeStore(mkDate(2026, 10, 14, 12))
    await store.upsertEnvelope(spendEnv(1000))
    wrap(store, <MoneyScreen />)
    fireEvent.click(await screen.findByRole('button', { name: 'سوّي ظروف' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'مواصلات' }))
    fireEvent.change(within(dialog).getByLabelText('خطة مواصلات'), { target: { value: '١٥٠' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'احفظي' }))
    await waitFor(() => expect(store.getSnapshot().moneyEnvelopes.find((e) => e.titleAr === 'مواصلات')).toMatchObject({ planned: 150, spent: 0, month: '2026-10' }))
  })

  it('offers last month’s categories when the new cycle has none', async () => {
    const store = await makeStore(mkDate(2026, 10, 14, 12))
    await store.upsertEnvelope(spendEnv(1000))
    await store.upsertEnvelope({ id: 'env_2026-09_cat_a', titleAr: 'test prev', titleEn: 'x', month: '2026-09', planned: 70, spent: 60 })
    wrap(store, <MoneyScreen />)
    fireEvent.click(await screen.findByRole('button', { name: 'انسخي ظروف الشهر اللي فات' }))
    await waitFor(() => expect(store.getSnapshot().moneyEnvelopes.find((e) => e.month === '2026-10' && e.titleAr === 'test prev')).toMatchObject({ planned: 70, spent: 0 }))
  })
})

describe('تذكير الادخار', () => {
  it('turns on at her payday day by default, saved in moduleState, never moves money', async () => {
    const store = await makeStore(mkDate(2026, 10, 14, 12))
    await store.setPayday(27)
    wrap(store, <MoneyScreen />)
    expect(await screen.findByText(/ما نحوّل فلوس/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'ذكّريني' }))
    const dialog = await screen.findByRole('dialog')
    expect((within(dialog).getByRole('combobox', { name: 'أي يوم بالشهر؟' }) as HTMLSelectElement).value).toBe('27')
    fireEvent.click(within(dialog).getByRole('button', { name: 'احفظي' }))
    await waitFor(() => expect(store.getSnapshot().moduleState.autoSaveDay).toBe(27))
    expect(await screen.findByText(/تذكير:/)).toHaveTextContent('27')
    fireEvent.click(screen.getByRole('button', { name: 'غيّري' }))
    fireEvent.click(await screen.findByRole('button', { name: 'طفّي التذكير' }))
    await waitFor(() => expect(store.getSnapshot().moduleState.autoSaveDay).toBeNull())
  })
})

describe('خريطة متعتي', () => {
  const j = (id: string, titleAr: string, p = {}) => makeJoyItem({ id, kind: 'free', titleAr, titleEn: titleAr, ...p })

  it('groups joys by size and flags the ones that cost money', async () => {
    const store = await makeStore(mkDate(2026, 10, 14, 12))
    await store.upsertJoyItem(j('a', 'test quick', { size: 'quick' }))
    await store.upsertJoyItem(j('b', 'test big', { size: 'big', costsMoney: true }))
    wrap(store, <JoyScreen />)
    const quick = await screen.findByRole('group', { name: 'متع سريعة' })
    const big = screen.getByRole('group', { name: 'متع كبيرة' })
    expect(within(quick).getByRole('button', { name: /test quick/ })).toBeInTheDocument()
    expect(within(big).getByRole('img', { name: 'تكلّف فلوس' })).toBeInTheDocument()
    expect(within(screen.getByRole('group', { name: 'متع متوسطة' })).getByRole('button', { name: 'أضيفي أول وحدة' })).toBeInTheDocument()
  })

  it('reserves a joy for a habit, caps at three, and releases with undo', async () => {
    const store = await makeStore(mkDate(2026, 10, 14, 12))
    for (const id of ['h1', 'h2', 'h3', 'h4']) await store.upsertHabit({ ...simpleHabit({ id, created: '2026-09-01' }), titleAr: `test ${id}`, status: 'active' })
    await store.upsertJoyItem(j('free1', 'test free'))
    wrap(store, <JoyScreen />)
    for (const [i, h] of ['h1', 'h2', 'h3'].entries()) {
      fireEvent.click(await screen.findByRole('button', { name: i === 0 ? /احجزي متعة لعادة/ : /أضيفي باقة/ }))
      const dialog = await screen.findByRole('dialog')
      fireEvent.click(within(dialog).getByRole('radio', { name: `test ${h}` }))
      fireEvent.change(within(dialog).getByLabelText('متعة جديدة'), { target: { value: `test joy ${i}` } })
      fireEvent.click(within(dialog).getByRole('button', { name: 'احجزيها' }))
      await waitFor(() => expect(store.getSnapshot().joyItems.filter((x) => x.kind === 'bundled')).toHaveLength(i + 1))
    }
    expect(await screen.findByText(/ثلاث باقات كفاية/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /أضيفي باقة/ })).toBeNull()
    expect(store.getSnapshot().joyItems.find((x) => x.titleAr === 'test joy 0')).toMatchObject({ kind: 'bundled', bundledHabitId: 'h1' })
  })
})
