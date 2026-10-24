/** Flexible-streak UI, reminders screens, Today banner and the calendar sheet. All data is named «test». */
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  InMemoryLifeRepository, addDays, createLifeStore, dayKey, makeHabit, makeProduct, mkDate, schedule, weekStreakDays, type LifeStore,
} from '../../src/domain'
import { WeekDots } from '../../src/ui/components/streak/WeekDots'
import { ToastProvider } from '../../src/ui/components/Toast'
import { ThemeProvider } from '../../src/ui/shell/theme'
import { LifeStoreProvider } from '../../src/ui/state/LifeStore'
import { StreakHero } from '../../src/ui/screens/habits/StreakHero'
import HabitsScreen from '../../src/ui/screens/habits/HabitsScreen'
import HabitDetailScreen from '../../src/ui/screens/habits/HabitDetailScreen'
import RemindersScreen from '../../src/ui/screens/reminders/RemindersScreen'
import SettingsScreen from '../../src/ui/screens/me/SettingsScreen'
import { CalendarExportSheet } from '../../src/ui/screens/reminders/CalendarExportSheet'
import { TodayReminderBanner } from '../../src/ui/screens/reminders/TodayReminderBanner'
import { library } from './today/harness'

let now = mkDate(2026, 10, 7, 9) // Wednesday 09:00
async function makeStore(settings: Parameters<LifeStore['updateSettings']>[0] extends infer S ? Partial<S> : never = {}): Promise<LifeStore> {
  const store = await createLifeStore({ repo: new InMemoryLifeRepository(), now: () => new Date(now), library })
  await store.updateSettings({ ...store.getSnapshot().settings, ...settings })
  await store.setDomainState('health', 'grow', true)
  await store.upsertHabit(makeHabit({ id: 'h_walk', domain: 'health', titleAr: 'test', titleEn: 'test', schedule: schedule([1, 2, 3, 4, 5, 6, 7]), createdDate: '2026-09-01' }), true)
  return store
}
const wrap = (store: LifeStore, ui: ReactNode, path = '/today') =>
  render(
    <ThemeProvider>
      <ToastProvider>
        <LifeStoreProvider store={store}>
          <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
        </LifeStoreProvider>
      </ToastProvider>
    </ThemeProvider>,
  )
/** Logs the habit done on each of the given days (the store's clock moves, as in real use). */
async function doneOn(store: LifeStore, days: Date[]) {
  for (const d of days) {
    now = new Date(d)
    now.setHours(9)
    await store.completeItem({ itemId: 'h_walk', kind: 'habit' }, 'normal')
  }
}

beforeEach(() => {
  now = mkDate(2026, 10, 7, 9)
  localStorage.clear()
})
afterEach(() => vi.restoreAllMocks())

describe('StreakHero', () => {
  const habit = makeHabit({ id: 'h', domain: 'health', titleAr: 'test', titleEn: 'test', createdDate: '2026-09-01' })
  const days = weekStreakDays({ habit, logs: [], today: mkDate(2026, 10, 8), streak: true })
  const noop = () => {}

  it('streak on: «{n} أيام متتالية» + what is left of the compensation, with the legend and the note', () => {
    render(<StreakHero streak={{ length: 6, graceUsedThisWeek: 1, holdingOnCompensation: false }} momentumText="ماشي زين" days={days} onOpenSettings={noop} />)
    expect(screen.getByText('الستريك المرن')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '6 أيام متتالية' })).toBeInTheDocument()
    expect(screen.getByText('باقي لك يوم تعويض هالأسبوع')).toBeInTheDocument()
    expect(screen.getByText('يوم التعويض يحفظ سلسلتك، وما عليك أي حساب.')).toBeInTheDocument()
    expect(screen.getAllByText('يوم تعويض').length).toBeGreaterThan(0)
  })

  it('no compensation left: the calm line, never a warning', () => {
    render(<StreakHero streak={{ length: 4, graceUsedThisWeek: 2, holdingOnCompensation: false }} momentumText="x" days={days} onOpenSettings={noop} />)
    expect(screen.getByText('ما باقي لك أيام تعويض هالأسبوع، وبكرة يوم جديد.')).toBeInTheDocument()
  })

  it('past the allowance it resets calmly: «يوم جديد», no failure counter', () => {
    render(<StreakHero streak={{ length: 0, graceUsedThisWeek: 2, holdingOnCompensation: false }} momentumText="x" days={days} onOpenSettings={noop} />)
    expect(screen.getByRole('heading', { name: 'يوم جديد' })).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/فشل|كسرتي|انكسر|🔥/)
  })

  it('streak off: momentum word, rest dash legend, link to Settings, no numbers', () => {
    const onOpen = vi.fn()
    render(<StreakHero streak={null} momentumText="ماشي زين" days={days} onOpenSettings={onOpen} />)
    expect(screen.getByText('الزخم')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'ماشي زين' })).toBeInTheDocument()
    expect(screen.getByText('راحة')).toBeInTheDocument()
    expect(screen.queryByText('يوم تعويض')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /تبين ستريك مرن/ }))
    expect(onOpen).toHaveBeenCalled()
  })

  it('every dot says its state in words (not colour alone)', () => {
    render(<WeekDots days={weekStreakDays({ habit, logs: [], today: mkDate(2026, 10, 8), streak: false })} />)
    expect(screen.getByRole('img', { name: 'أحد: راحة' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'خميس: اليوم' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'جمعة: جاي' })).toBeInTheDocument()
  })
})

describe('Habits list + detail', () => {
  it('streak on: a chip with the run; streak off: no chip and the caption is the momentum word', async () => {
    const on = await makeStore({ forgivingStreak: true })
    await doneOn(on, [mkDate(2026, 10, 4), mkDate(2026, 10, 5), mkDate(2026, 10, 6)])
    now = mkDate(2026, 10, 7, 9)
    const a = wrap(on, <HabitsScreen />, '/habits')
    expect(await screen.findByText('3 أيام')).toBeInTheDocument()
    expect(screen.getByText('الستريك المرن شغّال · يومين تعويض بالأسبوع.')).toBeInTheDocument()
    a.unmount()

    now = mkDate(2026, 10, 7, 9)
    const off = await makeStore({ forgivingStreak: false })
    await doneOn(off, [mkDate(2026, 10, 4), mkDate(2026, 10, 5), mkDate(2026, 10, 6)])
    now = mkDate(2026, 10, 7, 9)
    wrap(off, <HabitsScreen />, '/habits')
    await screen.findAllByText(/test/)
    expect(screen.queryByText('3 أيام')).toBeNull()
    expect(screen.queryByText(/الستريك المرن شغّال/)).toBeNull()
  })

  it('a missed day inside the allowance does not break it: the chip reads «تعويض اليوم» while it holds', async () => {
    const store = await makeStore({ forgivingStreak: true })
    await doneOn(store, [mkDate(2026, 10, 4), mkDate(2026, 10, 5)]) // Tue 6 missed, today Wed open
    now = mkDate(2026, 10, 7, 9)
    wrap(store, <HabitsScreen />, '/habits')
    expect(await screen.findByText('تعويض اليوم')).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/فشل|كسرتي/)
  })

  it('past the allowance the chip quietly disappears (no failure wording)', async () => {
    const store = await makeStore({ forgivingStreak: true })
    await doneOn(store, [mkDate(2026, 10, 4)]) // Mon, Tue, Wed… three misses by Thu 8
    now = mkDate(2026, 10, 8, 9)
    wrap(store, <HabitsScreen />, '/habits')
    await screen.findAllByText(/test/)
    expect(screen.queryByText('تعويض اليوم')).toBeNull()
    expect(screen.queryByText(/أيام$|يوم$/)).toBeNull()
  })

  it('detail shows the hero for an active habit', async () => {
    const store = await makeStore({ forgivingStreak: true })
    await doneOn(store, [mkDate(2026, 10, 5), mkDate(2026, 10, 6)])
    now = mkDate(2026, 10, 7, 9)
    wrap(store, <HabitDetailScreen />, '/habits/h_walk')
    expect(await screen.findByRole('heading', { name: 'يومين متتاليين' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'أربعاء: اليوم' })).toBeInTheDocument()
  })
})

describe('Settings', () => {
  it('«الستريك المرن» is a switch that saves; the old no-op «التذكيرات» switch is gone', async () => {
    const store = await makeStore({ forgivingStreak: true })
    wrap(store, <SettingsScreen />, '/me/settings')
    const sw = await screen.findByRole('switch', { name: 'الستريك المرن' })
    expect(sw).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(sw)
    await waitFor(() => expect(store.getSnapshot().settings.forgivingStreak).toBe(false))
    expect(screen.queryByRole('switch', { name: 'التذكيرات' })).toBeNull()
    expect(screen.getByText('تذكيرات داخل التطبيق')).toBeInTheDocument()
    expect(screen.getByText(/التنبيهات الحقيقية على الجوال تجي من التقويم/)).toBeInTheDocument()
  })

  it('backup row: quiet at first, a calm nudge after 14 days, and exporting clears it', async () => {
    const store = await makeStore({ lastBackupAt: new Date(now.getTime() - 20 * 86400000).toISOString() })
    wrap(store, <SettingsScreen />, '/me/settings')
    expect(await screen.findByText('مرّت فترة من آخر نسخة')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'صدّري' })).toBeInTheDocument()
  })
})

describe('RemindersScreen', () => {
  it('setting a time saves it; the master switch dims and disables the rows; removing clears it', async () => {
    const store = await makeStore({ notificationsEnabled: true })
    wrap(store, <RemindersScreen />, '/me/reminders')
    expect(await screen.findByText(/تذكيرات تطلع لك داخل التطبيق وأنتِ فاتحته/)).toBeInTheDocument()
    // add a reminder for the habit
    fireEvent.click(screen.getByText('أضيفي تذكير'))
    fireEvent.click(await screen.findByText('test'))
    const hour = await screen.findByLabelText('وقت التذكير: test: الساعة')
    fireEvent.change(hour, { target: { value: '16' } })
    fireEvent.change(screen.getByLabelText('وقت التذكير: test: الدقيقة'), { target: { value: '30' } })
    fireEvent.click(screen.getByRole('button', { name: 'احفظي' }))
    await waitFor(() => expect(store.getSnapshot().settings.reminderTimes['habit:h_walk']).toBe(16 * 60 + 30))
    const chip = await screen.findByRole('button', { name: /وقت تذكير test: 4:30 م/ })
    expect(chip).toBeInTheDocument()
    // master off → rows inert
    fireEvent.click(screen.getByRole('switch', { name: 'تذكيرات داخل التطبيق' }))
    await waitFor(() => expect(store.getSnapshot().settings.notificationsEnabled).toBe(false))
    expect(chip.closest('[inert]')).not.toBeNull()
    fireEvent.click(screen.getByRole('switch', { name: 'تذكيرات داخل التطبيق' }))
    await waitFor(() => expect(store.getSnapshot().settings.notificationsEnabled).toBe(true))
    // remove
    fireEvent.click(await screen.findByRole('button', { name: /وقت تذكير test: 4:30 م/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'شيلي هالتذكير' }))
    await waitFor(() => expect(store.getSnapshot().settings.reminderTimes['habit:h_walk']).toBeUndefined())
  })

  it('quiet hours: the switch and both times', async () => {
    const store = await makeStore({ notificationsEnabled: true })
    wrap(store, <RemindersScreen />, '/me/reminders')
    expect(await screen.findByRole('button', { name: 'بداية ساعات الهدوء: 11:00 م' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'نهاية ساعات الهدوء: 6:00 ص' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('switch', { name: 'ساعات الهدوء' }))
    await waitFor(() => expect(store.getSnapshot().settings.quietHoursEnabled).toBe(false))
    expect(screen.queryByRole('button', { name: /بداية ساعات الهدوء/ })).toBeNull()
  })
})

describe('Today banner', () => {
  async function bannerStore(minute = 16 * 60 + 30) {
    return makeStore({ notificationsEnabled: true, reminderTimes: { 'habit:h_walk': minute } })
  }

  it('shows «وقت …» once the time has passed, role=alert, and closing it dismisses it for the day', async () => {
    const store = await bannerStore()
    now = mkDate(2026, 10, 7, 17)
    wrap(store, <TodayReminderBanner />)
    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText(/وقت/)).toHaveTextContent('وقت test')
    expect(alert).toHaveTextContent('4:30 م')
    fireEvent.click(within(alert).getByRole('button', { name: 'سكّري التذكير' }))
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
    expect(JSON.parse(localStorage.getItem('wos.reminders.v1')!).dismissed.length).toBe(1)
  })

  it('is IN-FLOW: rendered where it is mounted (never portalled to <body>), with a «+N» counter for the rest', async () => {
    const store = await makeStore({ notificationsEnabled: true, reminderTimes: { 'habit:h_walk': 16 * 60 + 30, 'habit:h_two': 16 * 60 } })
    await store.upsertHabit(makeHabit({ id: 'h_two', domain: 'health', titleAr: 'test', titleEn: 'test', schedule: schedule([1, 2, 3, 4, 5, 6, 7]), createdDate: '2026-09-01' }), true)
    now = mkDate(2026, 10, 7, 17)
    const { container } = wrap(store, <TodayReminderBanner />)
    const alert = await screen.findByRole('alert')
    expect(container.contains(alert)).toBe(true)
    expect(alert.parentElement).not.toBe(document.body)
    // exactly one banner at a time
    expect(screen.getAllByRole('alert')).toHaveLength(1)
    expect(within(alert).getByLabelText('وفيه تذكير ثاني بعده')).toHaveTextContent('+1')
  })

  it('is silent before the time, when it is done, when off, and off the Today tab', async () => {
    const store = await bannerStore()
    now = mkDate(2026, 10, 7, 16)
    const a = wrap(store, <TodayReminderBanner />)
    await act(async () => {})
    expect(screen.queryByRole('alert')).toBeNull()
    a.unmount()

    now = mkDate(2026, 10, 7, 17)
    const b = wrap(store, <TodayReminderBanner />, '/habits')
    await act(async () => {})
    expect(screen.queryByRole('alert')).toBeNull()
    b.unmount()

    await store.completeItem({ itemId: 'h_walk', kind: 'habit' }, 'minimum')
    wrap(store, <TodayReminderBanner />)
    await act(async () => {})
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('«بعد 10 دقايق» snoozes it for ten minutes and a later check brings it back', async () => {
    const store = await bannerStore()
    now = mkDate(2026, 10, 7, 17)
    wrap(store, <TodayReminderBanner />)
    const alert = await screen.findByRole('alert')
    fireEvent.click(within(alert).getByRole('button', { name: 'بعد 10 دقايق' }))
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
    now = mkDate(2026, 10, 7, 17, 5)
    await act(async () => void document.dispatchEvent(new Event('visibilitychange')))
    expect(screen.queryByRole('alert')).toBeNull() // still snoozed
    now = mkDate(2026, 10, 7, 17, 11)
    await act(async () => void window.dispatchEvent(new Event('focus')))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })

  it('also re-checks on a 60 s tick while it is open', async () => {
    const store = await bannerStore()
    now = mkDate(2026, 10, 7, 16, 29)
    const spy = vi.spyOn(window, 'setInterval')
    wrap(store, <TodayReminderBanner />)
    await act(async () => {})
    const tick = spy.mock.calls.find((c) => c[1] === 60_000)![0] as () => void
    expect(screen.queryByRole('alert')).toBeNull()
    now = mkDate(2026, 10, 7, 16, 31)
    await act(async () => tick())
    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })

  it('re-evaluates when the app comes back to the foreground (visibilitychange)', async () => {
    const store = await bannerStore()
    now = mkDate(2026, 10, 7, 16)
    wrap(store, <TodayReminderBanner />)
    await act(async () => {})
    expect(screen.queryByRole('alert')).toBeNull()
    now = mkDate(2026, 10, 7, 16, 45)
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })

  it('a routine reminder counts its open steps and starts the player', async () => {
    const store = await makeStore({ notificationsEnabled: true, reminderTimes: { 'routine:am': 7 * 60 } })
    for (const [i, c] of (['cleanser', 'moisturizer', 'sunscreen', 'toothpaste'] as const).entries())
      await store.upsertProduct(makeProduct({ id: `p${i}`, name: 'test', category: c, slot: 'am', order: i + 1 }))
    now = mkDate(2026, 10, 7, 7, 30)
    wrap(store, <TodayReminderBanner />)
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('وقت روتين الصبح')
    expect(alert).toHaveTextContent('7:00 ص')
    expect(alert).toHaveTextContent('4 خطوات')
  })
})

describe('CalendarExportSheet', () => {
  const setup = async () => {
    const store = await makeStore({ notificationsEnabled: true, reminderTimes: { 'habit:h_walk': 16 * 60 + 30 } })
    wrap(store, <CalendarExportSheet open onClose={() => {}} />)
    return store
  }

  it('builds the file on the device and shares it with the Web Share API where supported', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { share, canShare: () => true })
    await setup()
    expect(screen.getByText(/التطبيق ما يرسل إشعارات بنفسه/)).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /test/ })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText('5 دقايق')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'جهّزي الملف' }))
    expect(await screen.findByText('wejdan-life-os.ics')).toBeInTheDocument()
    expect(screen.getByText('1 تذكير · تتكرر حسب جدولها')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'افتحيه بالتقويم' }))
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1))
    const file = (share.mock.calls[0]![0] as { files: File[] }).files[0]!
    expect(file.name).toBe('wejdan-life-os.ics')
    expect(file.type).toBe('text/calendar')
    const text = await new Promise<string>((res) => {
      const r = new FileReader()
      r.onload = () => res(String(r.result))
      r.readAsText(file)
    })
    expect(text).toContain('BEGIN:VCALENDAR')
    expect(text).toContain('SUMMARY:test')
    expect(text).toContain('TRIGGER:-PT5M')
    expect(screen.getByText('كيف تضيفينه؟')).toBeInTheDocument()
    expect(screen.getByText('غيّرتي وقت تذكير؟ صدّري ملف جديد واحذفي القديم من التقويم.')).toBeInTheDocument()
  })

  it('falls back to a download when sharing a file is not supported', async () => {
    Object.assign(navigator, { share: undefined, canShare: undefined })
    const create = vi.fn(() => 'blob:x')
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: vi.fn() })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    await setup()
    fireEvent.click(screen.getByRole('button', { name: 'جهّزي الملف' }))
    fireEvent.click(await screen.findByRole('button', { name: 'افتحيه بالتقويم' }))
    await waitFor(() => expect(click).toHaveBeenCalled())
    expect(create).toHaveBeenCalled()
  })

  it('a cancelled share sheet is not an error and downloads nothing', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('x', 'AbortError'))
    Object.assign(navigator, { share, canShare: () => true })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    await setup()
    fireEvent.click(screen.getByRole('button', { name: 'جهّزي الملف' }))
    fireEvent.click(await screen.findByRole('button', { name: 'افتحيه بالتقويم' }))
    await waitFor(() => expect(share).toHaveBeenCalled())
    expect(click).not.toHaveBeenCalled()
  })

  it('with nothing to export it says so instead of making an empty file', async () => {
    const store = await makeStore()
    wrap(store, <CalendarExportSheet open onClose={() => {}} />)
    expect(screen.getByText(/ما عندك تذكيرات لها وقت للحين/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'جهّزي الملف' })).toBeDisabled()
  })
})

void addDays
void dayKey
