/**
 * DEV-ONLY visual preview of المصادر · مراجعة الدفعة · سجل التغييرات with seeded in-memory data.
 * Not referenced by the app build. Open:
 *   /wejdan-os/src/ui/screens/sources/preview/index.html?theme=dark#/me/sources
 * ?empty=1 → no data.
 */
import { MotionConfig } from 'framer-motion'
import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Route, Routes } from 'react-router-dom'
import '../../../fonts'
import '../../../styles/tokens.css'
import '../../../styles/base.css'
import { InMemoryLifeRepository, createLifeStore, makeHabit, schedule, type LifeStore } from '../../../../domain'
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

const PLAN = JSON.stringify({
  tasks: [
    { title: 'حجز موعد IELTS', date: '2026-11-02' },
    { title: 'قراءة 20 صفحة', date: '2026-10-20' },
    { title: 'قراءة 20 صفحة', date: '2026-10-27' },
    { title: 'تجديد رخصة القيادة' },
  ],
  appointments: [{ title: 'موعد الأسنان', date: 'الأسبوع الجاي' }],
  ideas: ['بوست عن تجربة my.gov.sa', 'قالب مراجعة أسبوعية'],
})
const NOTES = '# أفكار من الجوال\n- مشي بعد العصر\n- ترتيب صور الجوال\n- فكرة: مشروع بورتفوليو\n'

async function seed(): Promise<LifeStore> {
  const store = await createLifeStore({ repo: new InMemoryLifeRepository() })
  Object.defineProperty(store, 'persistent', { value: true })
  await store.updateSettings({ ...store.getSnapshot().settings, onboardingDone: true })
  if (q.get('empty') === '1') return store
  await store.addTask({ title: 'تجديد رخصة القيادة' })
  // change log
  await store.upsertHabit(makeHabit({ id: 'h_walk', domain: 'health', titleAr: 'مشي سريع', titleEn: 'walk', schedule: schedule([1, 2, 3, 4, 5, 6, 7]), durationMin: 20 }), true)
  const h = store.getSnapshot().habits.find((x) => x.id === 'h_walk')!
  await store.upsertHabit({ ...h, durationMin: 30, minimumText: 'نص ساعة مشي' }, true)
  const t = await store.addTask({ title: 'اشتري هدية العيد' })
  await store.deleteTask(t.id)
  // imports
  await store.startImport('routine.csv', 'العنوان,النوع\nشرب ماء,روتين\nترتيب المكتب,مهمة\n')
  const r = store.getSnapshot().importBatches[0]
  await store.decideAll(r.id, 'approved', { includeFlagged: true })
  await store.commitImport(r.id)
  await store.startImport('جدول قديم.xls', 'PK\u0003\u0004 binary')
  await store.startImport('ملاحظات الجوال.md', NOTES)
  await store.startImport('خطة الأسبوع.json', PLAN)
  return store
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
