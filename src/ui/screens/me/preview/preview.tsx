/**
 * DEV-ONLY visual preview of the weekly review depth, Insights and «احتفالاتي» with synthetic in-memory data
 * (every title is "test"-style or a generic habit name). Not referenced by the app build. Open:
 *   /wejdan-os/src/ui/screens/me/preview/index.html?theme=dark#/review
 * ?empty=1 → no history.
 */
import { MotionConfig } from 'framer-motion'
import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Route, Routes } from 'react-router-dom'
import '../../../fonts'
import '../../../styles/tokens.css'
import '../../../styles/base.css'
import {
  InMemoryLifeRepository, addDays, createLifeStore, dayKey, makeExperiment, makeHabit, makeLog, mkDate, schedule,
  type DomainId, type Goal, type LifeStore,
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

const NOW = mkDate(2026, 10, 24)
NOW.setHours(12)

async function seed(): Promise<LifeStore> {
  const repo = new InMemoryLifeRepository()
  const store = await createLifeStore({ repo, now: () => new Date(NOW) })
  Object.defineProperty(store, 'persistent', { value: true })
  await store.updateSettings({ ...store.getSnapshot().settings, onboardingDone: true })
  if (q.get('empty') === '1') return store
  await store.setDomainState('health', 'grow', true)
  await store.setDomainState('ielts', 'grow', true)
  await store.setDomainState('learning', 'grow', true)
  await store.setDomainState('home', 'maintain', true)
  await store.setDomainState('money', 'maintain', true)
  const habits: [string, string, DomainId, number][] = [
    ['h_vocab', 'مراجعة مفردات', 'ielts', 15],
    ['h_walk', 'مشي سريع', 'health', 20],
    ['h_book', 'فصل من كتاب', 'learning', 30],
    ['h_room', 'ترتيب الغرفة', 'home', 10],
  ]
  for (const [id, title, domain, min] of habits) {
    await store.upsertHabit(makeHabit({ id, domain, titleAr: title, titleEn: title, schedule: schedule([1, 2, 3, 4, 5, 6, 7]), durationMin: min, minimumDurationMin: 5, createdDate: '2026-08-01' }), true)
  }
  // 42 days of history with a few gaps so the return-speed line has a shape
  const misses: Record<string, number[]> = {
    h_walk: [3, 4, 11, 12, 13, 21, 29, 30, 38],
    h_vocab: [6, 7, 20, 33],
    h_book: [2, 9, 10, 17, 18, 19, 25],
    h_room: [1, 5, 14, 15, 22, 23, 36],
  }
  let n = 0
  for (const [id] of habits) {
    for (let back = 42; back >= 1; back--) {
      if (misses[id]!.includes(back)) continue
      const day = addDays(NOW, -back)
      const logId = `lg_${id}_${back}`
      const enjoyment = id === 'h_walk' ? (back >= 9 && back <= 15 ? 3 : back <= 8 ? 4 : null) : null
      await repo.logs.put(makeLog({ id: logId, itemId: id, kind: 'habit', date: dayKey(day), level: 'normal', enjoyment, minuteOfDay: 17 * 60 + (n++ % 4) * 5 }))
      if (id === 'h_walk' && (back === 5 || back === 10 || back === 28)) {
        await repo.sparkTxns.put({ id: `spk_${logId}`, date: dayKey(day), amount: 10, reason: 'comeback', refId: logId, at: `${dayKey(day)}T17:00:00` })
      }
    }
  }
  if (q.get('noexp') !== '1') await repo.experiments.put(makeExperiment({ id: 'exp_bundle_h_walk', habitId: 'h_walk', titleAr: 'بودكاست مع المشي', titleEn: 'podcast with walk', variable: 'bundle:j', status: 'active', startDate: dayKey(addDays(NOW, -8)), lengthDays: 7 }))
  await repo.experiments.put(makeExperiment({ id: 'exp_old', habitId: 'h_vocab', titleAr: 'مفردات: الصبح ولا المسا؟', titleEn: 'x', variable: 'time:morning', status: 'kept', startDate: '2026-09-01', endDate: '2026-09-08' }))
  await repo.strengthChecks.put({ id: 'sc1', habitId: 'h_vocab', date: '2026-09-10', items: [3, 3, 2, 2] })
  const goal: Goal = {
    id: 'g1', domain: 'ielts', titleAr: 'IELTS الدرجة المطلوبة', titleEn: 'ielts', targetNote: '', sortOrder: 0, linkedHabitIds: [], linkedProjectIds: [],
    milestones: [
      { id: 'm1', titleAr: 'اختبار تجريبي أول', titleEn: 'm', quarter: 1, done: true, doneDate: '2026-10-12', rewardJoyId: null },
      { id: 'm2', titleAr: 'إنهاء كتاب القواعد', titleEn: 'm', quarter: 1, done: true, doneDate: '2026-09-21', rewardJoyId: null },
      { id: 'm3', titleAr: 'حجز موعد الاختبار', titleEn: 'm', quarter: 2, done: false, doneDate: null, rewardJoyId: null },
    ],
  }
  await repo.goals.put(goal)
  await repo.weeklyReviews.put({ id: '2026-10-11', date: '2026-10-17', chapterTitle: 'رجعت للمشي', wins: ['test'], blockers: [], top3: [], experimentId: null, durationSec: 540 })
  await repo.weeklyReviews.put({ id: '2026-09-27', date: '2026-10-03', chapterTitle: '', wins: ['test'], blockers: [], top3: [], experimentId: null, durationSec: 480 })
  await repo.weeklyReviews.put({ id: '2026-10-04', date: '2026-10-10', chapterTitle: 'أسبوع الهدوء', wins: [], blockers: [], top3: [], experimentId: null, durationSec: 600 })
  await repo.sparkTxns.put({ id: 'spk_rev1', date: '2026-10-17', amount: 5, reason: 'weeklyReview', refId: null, at: '2026-10-17T20:00:00' })
  // reload the snapshot so the store sees what we wrote straight into the repository
  const fresh = await createLifeStore({ repo, now: () => new Date(NOW) })
  Object.defineProperty(fresh, 'persistent', { value: true })
  return fresh
}

function Preview() {
  const [store, setStore] = useState<LifeStore | null>(null)
  useEffect(() => {
    void seed().then((s) => {
      ;(window as unknown as { __store: LifeStore }).__store = s
      setStore(s)
    })
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
