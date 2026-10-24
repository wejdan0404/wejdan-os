/** Render Today-area screens over an in-memory store with a pinned clock. */
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import actionsJson from '../../../src/domain/data/actions.json'
import actionsArJson from '../../../src/domain/data/actions_ar.json'
import { InMemoryLifeRepository, createLifeStore, makeHabit, mkDate, parseSeedLibrary, schedule, type DomainId, type LifeStore } from '../../../src/domain'
import { ToastProvider } from '../../../src/ui/components/Toast'
import { LifeStoreProvider } from '../../../src/ui/state/LifeStore'

export const library = parseSeedLibrary(actionsJson as unknown, actionsArJson as unknown)

export async function makeStore(at: Date = mkDate(2026, 10, 5, 8)): Promise<LifeStore> {
  const now = at
  return createLifeStore({ repo: new InMemoryLifeRepository(), now: () => now, library })
}

export function renderWith(store: LifeStore, ui: ReactElement, path = '/today') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LifeStoreProvider store={store}>
        <ToastProvider>
          <Routes>
            <Route path="*" element={ui} />
          </Routes>
        </ToastProvider>
      </LifeStoreProvider>
    </MemoryRouter>,
  )
}

/** A store with a few of her own habits, so suggestions exist beyond the care routine. */
export async function makeStoreWithHabits(at?: Date): Promise<LifeStore> {
  const store = await makeStore(at)
  await store.setDomainState('health', 'grow', true)
  const habits: [string, string, DomainId, number][] = [
    ['h_walk', 'مشي سريع', 'health', 20],
    ['h_room', 'ترتيب الغرفة', 'home', 10],
    ['h_money', 'تسجيل مصروف اليوم', 'money', 5],
  ]
  for (const [id, title, domain, min] of habits) {
    await store.upsertHabit(makeHabit({ id, domain, titleAr: title, titleEn: title, schedule: schedule([1, 2, 3, 4, 5, 6, 7]), durationMin: min, minimumDurationMin: Math.max(2, Math.round(min / 2)) }), true)
  }
  return store
}
