/**
 * DEV-ONLY visual preview of the habits garden with seeded in-memory data
 * (habits across categories at different strength stages). Not part of the app build. Open:
 *   /wejdan-os/src/ui/screens/habits/preview/index.html?theme=dark#/habits/garden
 */
import { MotionConfig } from 'framer-motion'
import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Route, Routes } from 'react-router-dom'
import '../../../fonts'
import '../../../styles/tokens.css'
import '../../../styles/base.css'
import {
  InMemoryLifeRepository, addDays, createLifeStore, dayKey, makeHabit, makeLog, schedule, type DomainId, type LifeStore,
} from '../../../../domain'
import { ToastProvider } from '../../../components/Toast'
import { AppShell } from '../../../shell/AppShell'
import { ThemeProvider } from '../../../shell/theme'
import { LifeStoreProvider } from '../../../state/LifeStore'

const q = new URLSearchParams(location.search)
try {
  localStorage.setItem('wejdan.theme', q.get('theme') === 'dark' ? 'dark' : 'light')
} catch {
  /* ignore */
}

// [id, title, domain, completion ratio over the last weeks, SRBAI answers (1–5) for automatic]
const HABITS: [string, string, DomainId, number, number[][]][] = [
  ['h_care', 'روتين العناية المسائي', 'care', 1, [[5, 5, 4, 5], [5, 5, 5, 5]]],
  ['h_walk', 'مشي سريع', 'health', 1, [[4, 4, 4, 3]]],
  ['h_vocab', 'مفردات IELTS يومية', 'ielts', 0.55, []],
  ['h_sleep', 'نوم بموعد ثابت', 'sleep', 0.3, []],
  ['h_joy', 'قهوة وكتاب', 'joy', 1, [[4, 4, 3, 4]]],
  ['h_book', 'فصل من كتاب UX', 'career', 0, []],
]

async function seed(): Promise<LifeStore> {
  const repo = new InMemoryLifeRepository()
  const first = await createLifeStore({ repo })
  await first.updateSettings({ ...first.getSnapshot().settings, onboardingDone: true })
  const today = first.today()
  for (const [id, title, domain, ratio, checks] of HABITS) {
    await first.upsertHabit(
      makeHabit({ id, domain, titleAr: title, titleEn: title, schedule: schedule([1, 2, 3, 4, 5, 6, 7]), durationMin: 15, minimumDurationMin: 5, createdDate: dayKey(addDays(today, -40)) }),
      true,
    )
    for (let i = 1; i <= 28; i++) {
      if ((i * 7919) % 100 < ratio * 100) {
        await repo.logs.put(makeLog({ id: `${id}_${i}`, itemId: id, kind: 'habit', date: dayKey(addDays(today, -i)), level: 'normal' }))
      }
    }
    for (const [n, items] of checks.entries()) {
      await repo.strengthChecks.put({ id: `${id}_c${n}`, habitId: id, date: dayKey(addDays(today, -14 + n * 7)), items })
    }
  }
  const store = await createLifeStore({ repo })
  Object.defineProperty(store, 'persistent', { value: true })
  return store
}

function Preview() {
  const [store, setStore] = useState<LifeStore | null>(null)
  useEffect(() => {
    void seed().then(setStore)
  }, [])
  if (!store) return null
  return (
    <ThemeProvider>
      <MotionConfig reducedMotion="user">
        <ToastProvider>
          <LifeStoreProvider store={store}>
            <HashRouter>
              <Routes>
                <Route path="*" element={<AppShell />} />
              </Routes>
            </HashRouter>
          </LifeStoreProvider>
        </ToastProvider>
      </MotionConfig>
    </ThemeProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Preview />
  </StrictMode>,
)
