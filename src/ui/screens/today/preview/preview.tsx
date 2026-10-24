/**
 * DEV-ONLY visual preview of the Today area with seeded in-memory data.
 * Not referenced by the app build. Open:
 *   /wejdan-os/src/ui/screens/today/preview/index.html?theme=dark#/today
 */
import { MotionConfig } from 'framer-motion'
import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Route, Routes } from 'react-router-dom'
import '../../../fonts'
import '../../../styles/tokens.css'
import '../../../styles/base.css'
import { InMemoryLifeRepository, createLifeStore, makeHabit, schedule, todayView, type DomainId, type LifeStore } from '../../../../domain'
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

async function seed(): Promise<LifeStore> {
  const store = await createLifeStore({ repo: new InMemoryLifeRepository() })
  // the preview is in-memory by design; hide the "not saved" banner so shots match the device
  Object.defineProperty(store, 'persistent', { value: true })
  await store.updateSettings({ ...store.getSnapshot().settings, onboardingDone: true })
  if (q.get('empty') === '1') return store
  await store.setDomainState('health', 'grow', true)
  await store.setDomainState('ielts', 'grow', true)
  await store.setDomainState('learning', 'grow', true)
  const habits: [string, string, DomainId, number][] = [
    ['h_vocab', 'مراجعة مفردات IELTS', 'ielts', 15],
    ['h_walk', 'مشي سريع', 'health', 20],
    ['h_book', 'فصل من كتاب UX', 'learning', 30],
    ['h_room', 'ترتيب الغرفة', 'home', 10],
    ['h_money', 'تسجيل مصروف اليوم', 'money', 5],
  ]
  for (const [id, title, domain, min] of habits) {
    await store.upsertHabit(makeHabit({ id, domain, titleAr: title, titleEn: title, schedule: schedule([1, 2, 3, 4, 5, 6, 7]), durationMin: min, minimumDurationMin: Math.max(2, Math.round(min / 2)) }), true)
  }
  if (q.get('accept') !== '0') {
    const v = todayView(store.getSnapshot(), store.today())
    const pick = v.suggestions.filter((x) => x.item.tier !== 'chain').slice(0, 4)
    await store.acceptMany([...pick.map((x) => x.item.id), ...v.suggestions.filter((x) => x.item.tier === 'chain').map((x) => x.item.id)])
    const after = todayView(store.getSnapshot(), store.today())
    const chain = after.plan.items.filter((i) => i.tier === 'chain' && i.section === 'morningChain')
    for (const c of chain.slice(0, 2)) await store.completeItem(c, 'normal')
    const money = after.plan.items.find((i) => i.itemId === 'h_money')
    if (money) await store.completeItem(money, 'normal')
    const walk = after.plan.items.find((i) => i.itemId === 'h_walk')
    if (walk && q.get('later') !== '0') await store.moveToLater(walk.id)
    await store.setEnergy('green')
  }
  await store.quickAdd('تجديد الهوية في Absher', 'task')
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
