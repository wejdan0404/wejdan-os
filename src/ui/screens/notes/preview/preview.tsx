/**
 * DEV-ONLY visual preview of the Notes & Search area with seeded in-memory data.
 * Not referenced by the app build. Open:
 *   /wejdan-os/src/ui/screens/notes/preview/index.html?theme=dark#/me/notes
 */
import { MotionConfig } from 'framer-motion'
import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Route, Routes } from 'react-router-dom'
import '../../../fonts'
import '../../../styles/tokens.css'
import '../../../styles/base.css'
import { InMemoryLifeRepository, createLifeStore, makeHabit, makeProject, makeProjectStep, schedule, type LifeStore } from '../../../../domain'
import { ToastProvider } from '../../../components/Toast'
import { AppShell } from '../../../shell/AppShell'
import { ThemeProvider } from '../../../shell/theme'
import { LifeStoreProvider } from '../../../state/LifeStore'

const q = new URLSearchParams(location.search)
try {
  localStorage.setItem('wejdan.theme', q.get('theme') === 'dark' ? 'dark' : 'light')
  localStorage.setItem('wejdan.recentSearches', JSON.stringify(['ترتيب', 'واقي شمس', 'IELTS كتابة']))
} catch {
  /* ignore */
}

async function seed(): Promise<LifeStore> {
  const store = await createLifeStore({ repo: new InMemoryLifeRepository() })
  Object.defineProperty(store, 'persistent', { value: true })
  await store.updateSettings({ ...store.getSnapshot().settings, onboardingDone: true })
  if (q.get('empty') === '1') return store
  await store.setDomainState('health', 'grow', true)
  await store.upsertHabit(makeHabit({ id: 'h_walk', domain: 'health', titleAr: 'مشي سريع', titleEn: 'walk', schedule: schedule([1, 2, 3, 4, 5, 6, 7]), durationMin: 20 }), true)
  await store.upsertHabit(makeHabit({ id: 'h_room', domain: 'home', titleAr: 'ترتيب الغرفة', titleEn: 'room', schedule: schedule([1, 2, 3, 4, 5, 6, 7]), durationMin: 10 }), true)
  await store.upsertProject(
    makeProject({ id: 'p_room', domain: 'home', titleAr: 'تجديد الغرفة', titleEn: 'room', status: 'active', steps: [makeProjectStep({ id: 's1', titleAr: 'ترتيب الرفوف', titleEn: 'shelves' })] }),
    true,
  )
  await store.addNote({ title: 'جمل مفيدة للمحادثة', body: 'On the other hand… · To be honest…', pinned: true })
  await store.addNote({ title: 'أفكار لترتيب المكتب', body: 'رف فوق المكتب، إضاءة دافية، وسلة للأوراق اللي تتجمع على الطاولة.', pinned: true, links: [{ kind: 'project', id: 'p_room' }] })
  await store.addNote({ title: 'ميزانية المصروف تبدأ يوم الراتب', body: 'أوزّع الشهر من يوم 1 وأشوفه بالمراجعة.', isDecision: true })
  await store.addNote({ title: 'المشي بعد العصر بدل الصبح', body: 'الصبح زحمة، والعصر أهدى وأثبت. نجربه أسبوعين.', isDecision: true, links: [{ kind: 'habit', id: 'h_walk' }] })
  await store.addNote({ title: 'ملخص فصل الكتاب', body: '' })
  await store.quickAdd('ترتيب ملفات الجوال', 'idea')
  await store.addTask({ title: 'ترتيب أوراق التأمين' })
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
