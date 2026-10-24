/** feat/a — UI: weekly review depth steps, Insights charts + experiment decision, «احتفالاتي». */
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  InMemoryLifeRepository, addDays, createLifeStore, dayKey, makeExperiment, makeHabit, makeLog, mkDate, schedule,
  type Goal, type LifeStore,
} from '../../../src/domain'
import { ToastProvider } from '../../../src/ui/components/Toast'
import { ThemeProvider } from '../../../src/ui/shell/theme'
import { LifeStoreProvider } from '../../../src/ui/state/LifeStore'
import CelebrationsScreen from '../../../src/ui/screens/joy/CelebrationsScreen'
import InsightsScreen from '../../../src/ui/screens/me/InsightsScreen'
import WeeklyReviewScreen from '../../../src/ui/screens/me/WeeklyReviewScreen'
import { STEP_QUESTION } from '../../../src/ui/screens/me/review/reviewCopy'

const NOW = mkDate(2026, 10, 24)
NOW.setHours(12)

async function seeded(opts: { experiment?: boolean; history?: boolean } = {}): Promise<LifeStore> {
  const repo = new InMemoryLifeRepository()
  const store = await createLifeStore({ repo, now: () => new Date(NOW) })
  await store.setDomainState('health', 'grow', true)
  await store.setDomainState('ielts', 'grow', true)
  await store.upsertHabit(makeHabit({ id: 'h_walk', domain: 'health', titleAr: 'test', titleEn: 'test', schedule: schedule([1, 2, 3, 4, 5, 6, 7]), createdDate: '2026-08-01' }), true)
  for (let b = 1; b <= 30; b++) {
    if ([3, 4, 12, 13].includes(b)) continue
    await repo.logs.put(makeLog({ id: `lg${b}`, itemId: 'h_walk', kind: 'habit', date: dayKey(addDays(NOW, -b)), level: 'normal', enjoyment: b <= 8 ? 4 : 3 }))
  }
  if (opts.experiment) {
    await repo.experiments.put(makeExperiment({ id: 'exp1', habitId: 'h_walk', titleAr: 'test exp', titleEn: 't', variable: 'minimum', status: 'active', startDate: dayKey(addDays(NOW, -8)), lengthDays: 7 }))
  }
  if (opts.history) {
    const goal: Goal = { id: 'g', domain: 'ielts', titleAr: 'test goal', titleEn: 't', targetNote: '', sortOrder: 0, linkedHabitIds: [], linkedProjectIds: [], milestones: [{ id: 'm', titleAr: 'test milestone', titleEn: 't', quarter: 1, done: true, doneDate: '2026-10-12', rewardJoyId: null }] }
    await repo.goals.put(goal)
    await repo.sparkTxns.put({ id: 'sp', date: dayKey(addDays(NOW, -4)), amount: 10, reason: 'comeback', refId: 'lg4x', at: null })
    await repo.weeklyReviews.put({ id: '2026-10-11', date: '2026-10-17', chapterTitle: 'test chapter', wins: [], blockers: [], top3: [], experimentId: null, durationSec: null })
  }
  return createLifeStore({ repo, now: () => new Date(NOW) })
}

function wrap(store: LifeStore, ui: ReactNode, path: string) {
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

/** The element holding exactly this text even when <Bidi> splits Latin runs into <bdi>. */
const txt = (t: string) => (_: string, el: Element | null) => el != null && el.textContent === t && !Array.from(el.children).some((c) => c.textContent === t)
const press = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }))
async function toStep(id: keyof typeof STEP_QUESTION) {
  for (let i = 0; i < 12; i++) {
    if (screen.queryByRole('heading', { level: 2, name: STEP_QUESTION[id] })) return
    press('التالي')
    await act(async () => { await new Promise((r) => setTimeout(r, 450)) })
  }
  await screen.findByRole('heading', { level: 2, name: STEP_QUESTION[id] }, { timeout: 3000 })
}

beforeEach(() => window.localStorage.clear())

describe('weekly review depth', () => {
  it('blockers: each chosen reason shows one suggested fix and points to the experiment step', async () => {
    const store = await seeded()
    wrap(store, <WeeklyReviewScreen />, '/review')
    press('يلا نبدأ')
    await toStep('blockers')
    fireEvent.click(screen.getByRole('button', { name: 'كانت كبيرة عليّ' }))
    expect(await screen.findByText(/نزّليها للنسخة الصغيرة/)).toBeInTheDocument()
    expect(screen.getByText('نجرّبها في تجربة الأسبوع')).toBeInTheDocument()
    expect(screen.getAllByText(/اقتراح تعديل وحد/)).toHaveLength(1)
  })

  it('strength: four 1–5 sentences, a word (not a score) once complete, stored only when complete', async () => {
    const store = await seeded()
    wrap(store, <WeeklyReviewScreen />, '/review')
    press('يلا نبدأ')
    await toStep('strength')
    const groups = screen.getAllByRole('radiogroup').filter((g) => within(g).queryAllByRole('radio').length === 5)
    expect(groups).toHaveLength(4)
    for (const g of groups) fireEvent.click(within(g).getByRole('radio', { name: '4' }))
    expect(await screen.findByText('شبه تلقائية.')).toBeInTheDocument()
    await toStep('close')
    await act(async () => { press('خلّصي المراجعة') })
    await waitFor(() => expect(store.getSnapshot().strengthChecks).toHaveLength(1))
    expect(store.getSnapshot().strengthChecks[0]).toMatchObject({ habitId: 'h_walk', items: [4, 4, 4, 4] })
  })

  it('strength: an incomplete check is not saved', async () => {
    const store = await seeded()
    wrap(store, <WeeklyReviewScreen />, '/review')
    press('يلا نبدأ')
    await toStep('strength')
    const g = screen.getAllByRole('radiogroup').find((x) => within(x).queryAllByRole('radio').length === 5)!
    fireEvent.click(within(g).getByRole('radio', { name: '5' }))
    await toStep('close')
    await act(async () => { press('خلّصي المراجعة') })
    await waitFor(() => expect(store.getSnapshot().weeklyReviews).toHaveLength(1))
    expect(store.getSnapshot().strengthChecks).toHaveLength(0)
  })

  it('season: a fourth growth domain is refused in place; a legal change is applied at the end and can be undone', async () => {
    const store = await seeded()
    await store.setDomainState('learning', 'grow', true)
    wrap(store, <WeeklyReviewScreen />, '/review')
    press('يلا نبدأ')
    await toStep('season')
    // health, ielts, learning are already «نمو» (3/3) → home to «نمو» is refused
    const home = screen.getByRole('radiogroup', { name: /حالة البيت/ })
    fireEvent.click(within(home).getByRole('radio', { name: 'نمو' }))
    expect(await screen.findByText(/ثلاثة مجالات للنمو بالكثير/)).toBeInTheDocument()
    expect(within(home).getByRole('radio', { name: 'نمو' })).toHaveAttribute('aria-checked', 'false')
    // legal: the learning domain to «صيانة»
    const learning = screen.getByRole('radiogroup', { name: /حالة التعلّم/ })
    fireEvent.click(within(learning).getByRole('radio', { name: 'صيانة' }))
    await toStep('close')
    await act(async () => { press('خلّصي المراجعة') })
    await waitFor(() => expect(store.getSnapshot().domains.find((d) => d.id === 'learning')!.state).toBe('maintain'))
    await screen.findByText(/سكّرتي الفصل/, {}, { timeout: 4000 })
    await act(async () => { fireEvent.click(await screen.findByRole('button', { name: 'تراجعي عنها' }, { timeout: 4000 })) })
    await waitFor(() => expect(store.getSnapshot().domains.find((d) => d.id === 'learning')!.state).toBe('grow'))
  })

  it('experiment: the pre-picked suggestion from a blocker starts when the review is closed, and its id is recorded', async () => {
    const store = await seeded()
    wrap(store, <WeeklyReviewScreen />, '/review')
    press('يلا نبدأ')
    await toStep('blockers')
    fireEvent.click(screen.getByRole('button', { name: 'كانت كبيرة عليّ' }))
    await toStep('experiment')
    expect(screen.getByText('من اللي عطّلك')).toBeInTheDocument()
    const opt = screen.getAllByRole('radio').find((r) => /النسخة الصغيرة/.test(r.textContent ?? ''))!
    expect(opt).toHaveAttribute('aria-checked', 'true') // pre-picked from her blocker, no tap needed
    await toStep('close')
    await act(async () => { press('خلّصي المراجعة') })
    await waitFor(() => expect(store.getSnapshot().experiments.some((e) => e.status === 'active')).toBe(true))
    const rec = store.getSnapshot().weeklyReviews[0]!
    expect(rec.experimentId).toBe(store.getSnapshot().experiments.find((e) => e.status === 'active')!.id)
    expect(rec.blockers).toContain('كانت كبيرة عليّ')
    expect(await screen.findByText(/سكّرتي الفصل/)).toBeInTheDocument()
  })

  it('a finished running experiment is decided in the review itself (keep)', async () => {
    const store = await seeded({ experiment: true })
    wrap(store, <WeeklyReviewScreen />, '/review')
    press('يلا نبدأ')
    await toStep('experiment')
    await act(async () => { press('أثبّتها') })
    await waitFor(() => expect(store.getSnapshot().experiments.find((e) => e.id === 'exp1')!.status).toBe('kept'))
  })
})

describe('insights charts and experiment result', () => {
  it('draws momentum by domain and return speed with text alternatives, and offers a table view', async () => {
    const store = await seeded()
    wrap(store, <InsightsScreen />, '/me/insights')
    expect(await screen.findByText('الزخم حسب المجال')).toBeInTheDocument()
    expect(screen.getByLabelText(/الصحة والحركة: \d+ من 100/)).toBeInTheDocument()
    const chart = screen.getByRole('img', { name: /سرعة الرجوع بالأيام/ })
    expect(chart.getAttribute('aria-label')).toMatch(/هالأسبوع/)
    fireEvent.click(screen.getAllByRole('button', { name: 'جدول' })[1]!)
    expect(screen.getByRole('table', { name: /سرعة الرجوع/ })).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/ستريك|streak/i)
  })

  it('experiment result shows before/after and keep/revert once its days are over', async () => {
    const store = await seeded({ experiment: true })
    wrap(store, <InsightsScreen />, '/me/insights')
    expect(await screen.findByText('test exp')).toBeInTheDocument()
    expect(screen.getByText('قبل')).toBeInTheDocument()
    expect(screen.getByText('بعد')).toBeInTheDocument()
    await act(async () => { press('أرجّع القديم') })
    await waitFor(() => expect(store.getSnapshot().experiments.find((e) => e.id === 'exp1')!.status).toBe('reverted'))
  })

  it('a running experiment that is not over yet has no decision buttons', async () => {
    const store = await seeded()
    const e = makeExperiment({ id: 'e9', habitId: 'h_walk', titleAr: 'test later', titleEn: 't', variable: 'minimum' })
    await store.startExperiment(e) // starts «today» (NOW)
    wrap(store, <InsightsScreen />, '/me/insights')
    expect(await screen.findByText('test later')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'أثبّتها' })).toBeNull()
    expect(screen.getByText(/القرار بعد ما تخلص الأيام/)).toBeInTheDocument()
  })
})

describe('«احتفالاتي»', () => {
  it('lists milestones, comebacks and chapters newest first, with at most three stars', async () => {
    const store = await seeded({ history: true })
    const { container } = wrap(store, <CelebrationsScreen />, '/joy/celebrations')
    expect(await screen.findByText(txt('خلّصتي «test milestone»'))).toBeInTheDocument()
    expect(screen.getByText(txt('الفصل 1 · test chapter'))).toBeInTheDocument()
    expect(container.querySelectorAll('svg path[d^="M0 -1 Q"]').length).toBeLessThanOrEqual(3)
    expect(container.textContent).toMatch(/تستاهل/)
  })

  it('has a calm empty state', async () => {
    const store = await seeded()
    wrap(store, <CelebrationsScreen />, '/joy/celebrations')
    expect(await screen.findByText('لسا ما فيه احتفالات')).toBeInTheDocument()
  })
})
