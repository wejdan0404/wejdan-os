import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { InMemoryLifeRepository, addQuizQuestion, createLifeStore, ieltsTemplate, mkDate, readIeltsDriving, type LifeStore } from '../../../src/domain'
import { ToastProvider } from '../../../src/ui/components/Toast'
import DrivingScreen from '../../../src/ui/screens/path/DrivingScreen'
import IeltsScreen from '../../../src/ui/screens/path/IeltsScreen'
import { LifeStoreProvider } from '../../../src/ui/state/LifeStore'
import { library } from '../../domain/helpers'

const NOW = mkDate(2026, 10, 15, 10)
async function makeStore(): Promise<LifeStore> {
  const repo = new InMemoryLifeRepository()
  await repo.open()
  return createLifeStore({ repo, now: () => NOW, library })
}
function mount(store: LifeStore, ui: JSX.Element, path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ToastProvider>
        <LifeStoreProvider store={store}>{ui}</LifeStoreProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('IELTS stats + goals', () => {
  it('empty: gentle copy, no streak language, nothing assumed; goals are saved from her input', async () => {
    const store = await makeStore()
    mount(store, <IeltsScreen />, '/path/ielts')
    expect(screen.getByText('جلسات هذا الشهر')).toBeInTheDocument()
    expect(screen.getByText(/ما فيه سلسلة تنكسر/)).toBeInTheDocument()
    expect(screen.getAllByText('ما حددتيها')).toHaveLength(3)
    expect(screen.queryByText(/سلسلة أيام/)).not.toBeInTheDocument()
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'حددي' })))
    fireEvent.change(await screen.findByLabelText('الدرجة المستهدفة'), { target: { value: '6.7' } })
    await waitFor(() => expect(document.body.textContent).toMatch(/نقرّبها لأقرب نص درجة: ?6.5/))
    fireEvent.change(screen.getByLabelText('مستواك الحالي (من تقديرك أنتِ)'), { target: { value: '12' } })
    expect((await screen.findByRole('alert')).textContent).toMatch(/من 0 لين 9/)
    expect(screen.getByRole('button', { name: 'احفظي' })).toBeDisabled()
    fireEvent.change(screen.getByLabelText('مستواك الحالي (من تقديرك أنتِ)'), { target: { value: '5' } })
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'احفظي' })))
    await waitFor(() => expect(readIeltsDriving(store).ielts).toMatchObject({ targetBand: 6.5, currentBand: 5, commitDays: null }))
  })

  it('counts this month’s practice days and the 30-day window', async () => {
    const store = await makeStore()
    await store.upsertHabit(ieltsTemplate(library, NOW), true)
    const h = store.getSnapshot().habits.find((x) => x.domain === 'ielts')!
    await store.addVocabCard('test', 'test meaning')
    await store.reviewVocab(store.getSnapshot().vocabCards[0]!.id, 4)
    await store.addMockTest({ id: 'm1', date: '2026-10-03', reading: 6, listening: null, writing: null, speaking: null, note: '' })
    mount(store, <IeltsScreen />, '/path/ielts')
    expect(h).toBeTruthy()
    expect(screen.getByRole('img', { name: '2 من 30 يوم' })).toBeInTheDocument()
  })
})

describe('Driving: road, practice log, hazard, quiz', () => {
  it('shows the confirm-official-path stage and honest empty states; no clips or questions are bundled', async () => {
    const store = await makeStore()
    mount(store, <DrivingScreen />, '/path/driving')
    expect(screen.getByText('تأكيد المسار الرسمي')).toBeInTheDocument()
    expect(screen.getByText(/المرحلة 1 من 1/)).toBeInTheDocument()
    expect(screen.getByText(/باقي المراحل نضيفها لما نتأكد من المصدر/)).toBeInTheDocument()
    expect(screen.getByText(/المقاطع نضيفها لما نتأكد من المصدر/)).toBeInTheDocument()
    expect(screen.getByText(/بنك الأسئلة نضيفه لما نتأكد من المصدر/)).toBeInTheDocument()
    expect(screen.getByRole('group', { name: '0 من 4 ظروف جرّبتيها' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'ابدئي جولة' })).not.toBeInTheDocument()
  })

  it('a step she adds is marked unverified until she confirms it', async () => {
    const store = await makeStore()
    mount(store, <DrivingScreen />, '/path/driving')
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'أضيفي مرحلة' })))
    fireEvent.change(await screen.findByLabelText('اسم المرحلة'), { target: { value: 'test stage' } })
    await act(async () => fireEvent.click(within(screen.getAllByRole('dialog').at(-1)!).getByRole('button', { name: 'احفظي' })))
    await waitFor(() => expect(readIeltsDriving(store).road).toHaveLength(2))
    const addStep = screen.getAllByRole('button', { name: 'أضيفي خطوة' })[1]!
    await act(async () => fireEvent.click(addStep))
    fireEvent.change(await screen.findByLabelText('الخطوة'), { target: { value: 'test step' } })
    await act(async () => fireEvent.click(within(screen.getAllByRole('dialog').at(-1)!).getByRole('button', { name: 'احفظي' })))
    expect(await screen.findByText('ما تأكدت من المصدر')).toBeInTheDocument()
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /تعديل: test step/ })))
    await act(async () => fireEvent.click(await screen.findByRole('switch', { name: 'تأكدت من المصدر الرسمي' })))
    await act(async () => fireEvent.click(within(screen.getAllByRole('dialog').at(-1)!).getByRole('button', { name: 'احفظي' })))
    expect(await screen.findByText('مؤكدة من المصدر')).toBeInTheDocument()
  })

  it('quiz round: her question, wrong answer comes back, no red wording; round gated on due questions', async () => {
    const store = await makeStore()
    await addQuizQuestion(store, { question: 'test question', choices: ['test a', 'test b'], answer: 1, explanation: 'test why' })
    mount(store, <DrivingScreen />, '/path/driving')
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'ابدئي جولة' })))
    const dlg = await screen.findByRole('dialog')
    expect(within(dlg).getByText('test question')).toBeInTheDocument()
    await act(async () => fireEvent.click(within(dlg).getByRole('button', { name: /test a/ })))
    expect(within(dlg).getByText(/نرجّعه لك قريب/)).toBeInTheDocument()
    expect(within(dlg).getByText('test why')).toBeInTheDocument()
    await waitFor(() => expect(readIeltsDriving(store).quiz[0]!.lapses).toBe(1))
    await act(async () => fireEvent.click(within(dlg).getByRole('button', { name: 'خلّصنا' })))
    expect(await within(dlg).findByText('خلّصتي جولة اليوم')).toBeInTheDocument()
  })

  it('hazard: only her own link/note is accepted; unsafe link is refused inline', async () => {
    const store = await makeStore()
    mount(store, <DrivingScreen />, '/path/driving')
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'أضيفي رابط أو ملاحظة' })))
    const dlg = await screen.findByRole('dialog')
    await act(async () => fireEvent.click(within(dlg).getByRole('button', { name: 'أضيفي رابط أو ملاحظة' })))
    fireEvent.change(await screen.findByLabelText('الرابط (اختياري)'), { target: { value: 'javascript:alert(1)' } })
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('الرابط (اختياري)'), { target: { value: 'https://example.com/test' } })
    fireEvent.change(screen.getByLabelText('العنوان'), { target: { value: 'test clip' } })
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'احفظي' })))
    await waitFor(() => expect(readIeltsDriving(store).hazards[0]).toMatchObject({ title: 'test clip', link: 'https://example.com/test' }))
  })
})
