import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { todayView } from '../../../src/domain'
import { QuickAddSheet } from '../../../src/ui/screens/today/QuickAddSheet'
import EveningScreen from '../../../src/ui/screens/today/EveningScreen'
import ItemDetailScreen from '../../../src/ui/screens/today/ItemDetailScreen'
import MorningBriefScreen from '../../../src/ui/screens/today/MorningBriefScreen'
import TodayScreen from '../../../src/ui/screens/today/TodayScreen'
import { dateLine, isolate, stepsLeft, thingsCount } from '../../../src/ui/screens/today/lib'
import { RoutineThread } from '../../../src/ui/screens/today/RoutineThread'
import { makeStore, makeStoreWithHabits, renderWith } from './harness'

const firstNonChain = (store: Awaited<ReturnType<typeof makeStore>>) =>
  todayView(store.getSnapshot(), store.today()).suggestions.find((x) => x.item.tier !== 'chain')!.item

describe('today lib', () => {
  it('isolates Latin/number runs so «SPF 30+» keeps its order', () => {
    expect(isolate('واقي شمس SPF 30+')).toBe('واقي شمس ⁦SPF 30+⁩')
    expect(isolate('مراجعة IELTS')).toContain('⁦IELTS⁩')
  })
  it('speaks counts in words, never a bare zero', () => {
    expect(thingsCount(0)).toBe('ما فيه شي')
    expect(thingsCount(2)).toBe('شيئين')
    expect(stepsLeft(2)).toBe('باقي خطوتين')
    expect(stepsLeft(0)).toBe('خلّصتيه')
  })
  it('formats dates with Western digits', () => {
    expect(dateLine(new Date(2026, 9, 24))).toMatch(/24/)
  })
})

describe('RoutineThread', () => {
  it('marks done steps as stars and the current one as a ring', () => {
    render(
      <RoutineThread
        label="روتين الصبح"
        steps={[
          { id: 'a', label: 'غسول', state: 'done' },
          { id: 'b', label: 'مرطب', state: 'current' },
          { id: 'c', label: 'واقي شمس SPF 30+', state: 'todo' },
        ]}
      />,
    )
    expect(screen.getByRole('img', { name: 'غسول — خلصت' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'مرطب — الحين' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'واقي شمس SPF 30+ — باقي' })).toBeInTheDocument()
  })
})

describe('TodayScreen (suggestion mode)', () => {
  it('starts with a calm empty day and adds nothing by itself', async () => {
    const store = await makeStore()
    renderWith(store, <TodayScreen />)
    expect(await screen.findByText('يومك فاضي للحين')).toBeInTheDocument()
    expect(todayView(store.getSnapshot(), store.today()).plan.items).toHaveLength(0)
    // no row of zeros on an empty day
    expect(screen.queryByText(/^0 من/)).not.toBeInTheDocument()
  })

  it('accepts a suggestion with «+ أضيفيه» and offers undo', async () => {
    const store = await makeStoreWithHabits()
    const sg = firstNonChain(store)
    renderWith(store, <TodayScreen />)
    const add = await screen.findByRole('button', { name: `أضيفي ${sg.title.ar} لليوم` })
    await act(async () => fireEvent.click(add))
    await waitFor(() => expect(todayView(store.getSnapshot(), store.today()).plan.items.map((i) => i.id)).toContain(sg.id))
    expect(await screen.findByText(/انضافت ليومك/)).toBeInTheDocument()
    // it becomes «خطوتك الجاية»
    expect(await screen.findByText('خطوتك الجاية', { exact: false })).toBeInTheDocument()
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'تراجع' })))
    await waitFor(() => expect(todayView(store.getSnapshot(), store.today()).plan.items.map((i) => i.id)).not.toContain(sg.id))
  })

  it('completes a listed item from its check circle and can undo it', async () => {
    const store = await makeStoreWithHabits()
    const sgs = todayView(store.getSnapshot(), store.today()).suggestions.filter((x) => x.item.tier !== 'chain')
    await store.acceptMany(sgs.slice(0, 2).map((x) => x.item.id))
    renderWith(store, <TodayScreen />)
    const listed = sgs.slice(0, 2).map((x) => x.item)
    // one is the hero; the other sits in «لليوم»
    const check = await screen.findByRole('checkbox', { name: new RegExp(`خلّصت: (${listed.map((i) => i.title.ar).join('|')})`) })
    await act(async () => fireEvent.click(check))
    await waitFor(() => expect(store.getSnapshot().logs.length).toBe(1))
    expect(await screen.findByText(/انحسبت لك/)).toBeInTheDocument()
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'تراجع' })))
    await waitFor(() => expect(store.getSnapshot().logs.length).toBe(0))
  })

  it('shows «بعدين» as a row with words, not a number', async () => {
    const store = await makeStore()
    renderWith(store, <TodayScreen />)
    expect(await screen.findByText('بعدين')).toBeInTheDocument()
    expect(screen.getByText('فاضي')).toBeInTheDocument()
  })
})

describe('QuickAddSheet', () => {
  it('saves a title-only capture to the inbox', async () => {
    const store = await makeStore()
    renderWith(store, <QuickAddSheet open onClose={() => {}} />)
    const input = await screen.findByPlaceholderText('وش في بالك؟')
    fireEvent.change(input, { target: { value: 'تجديد الهوية في Absher' } })
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'احفظيها' })))
    await waitFor(() => expect(store.getSnapshot().inbox.map((i) => i.title)).toContain('تجديد الهوية في Absher'))
  })

  it('asks for the URL only when the kind is a link', async () => {
    const store = await makeStore()
    renderWith(store, <QuickAddSheet open onClose={() => {}} />)
    expect(screen.queryByPlaceholderText('https://')).not.toBeInTheDocument()
    fireEvent.click(await screen.findByRole('button', { name: 'رابط' }))
    expect(screen.getByPlaceholderText('https://')).toBeInTheDocument()
  })
})

describe('ItemDetailScreen', () => {
  it('lets her add a suggestion from its «ليش اليوم؟» page', async () => {
    const store = await makeStoreWithHabits()
    const sg = firstNonChain(store)
    renderWith(store, <ItemDetailScreen />, `/today/item/${encodeURIComponent(sg.id)}`)
    expect(await screen.findByLabelText('ليش اليوم؟')).toBeInTheDocument()
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '+ أضيفيها ليومك' })))
    await waitFor(() => expect(todayView(store.getSnapshot(), store.today()).plan.items.map((i) => i.id)).toContain(sg.id))
  })

  it('shows a calm message for an unknown id', async () => {
    const store = await makeStore()
    renderWith(store, <ItemDetailScreen />, '/today/item/nope')
    expect(await screen.findByText('ما لقينا هالخطوة')).toBeInTheDocument()
  })
})

describe('EveningScreen', () => {
  it('«بعدين» parks an open item in the later list', async () => {
    const store = await makeStoreWithHabits()
    const sg = firstNonChain(store)
    await store.acceptSuggestion(sg.id)
    renderWith(store, <EveningScreen />, '/evening')
    const group = await screen.findByRole('group', { name: `وش نسوي في ${sg.title.ar}؟` })
    await act(async () => fireEvent.click(within(group).getByRole('button', { name: /^بعدين/ })))
    await waitFor(() => expect(store.getSnapshot().later.map((i) => i.id)).toContain(sg.id))
  })
})

describe('MorningBriefScreen', () => {
  it('changes energy and keeps suggestions as her choice', async () => {
    const store = await makeStoreWithHabits()
    renderWith(store, <MorningBriefScreen />, '/brief')
    const low = await screen.findByRole('radio', { name: /قليلة/ })
    await act(async () => fireEvent.click(low))
    await waitFor(() => expect(store.getSnapshot().energyChecks.at(-1)?.mode).toBe('red'))
    expect(await screen.findByText(/يوم رايق|يوم مفتوح/)).toBeInTheDocument()
    expect(todayView(store.getSnapshot(), store.today()).plan.items).toHaveLength(0)
  })
})
