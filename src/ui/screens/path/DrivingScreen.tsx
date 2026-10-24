import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  addDays,
  dayKey,
  drivingTemplate,
  isDoneLevel,
  makeProject,
  makeProjectStep,
  projectNextStep,
  startOfWeek,
  type DrivingSession,
} from '../../../domain'
import { Bidi, MetaLine } from '../../components/Bidi'
import { Switch } from '../../components/Switch'
import { Button } from '../../components/Button'
import { InsetGroupedList } from '../../components/InsetGroupedList'
import { ListRow } from '../../components/ListRow'
import { Screen } from '../../components/Screen'
import { Sheet } from '../../components/Sheet'
import { StarDottedLine } from '../../components/StarDottedLine'
import { useToast } from '../../components/Toast'
import { useLife, useStore, useToday } from '../../state/LifeStore'
import { ensureDomainsVisible } from '../../lib/domains'
import { dayLabel, StarDivider } from './pathKit'
import styles from './Path.module.css'

const VIDEO_ID = 'wt_driving_videos'
const PRACTICE_ID = 'wt_driving_practice'

/** Generic licence path — no personal data; she checks details with the school and Absher. */
const LICENCE_STEPS = [
  'فتح ملف في مدرسة القيادة',
  'الفحص الطبي',
  'الدروس النظرية',
  'الاختبار النظري',
  'التدريب العملي',
  'الاختبار العملي',
  'إصدار الرخصة من أبشر',
]

export default function DrivingScreen() {
  const s = useLife()
  const store = useStore()
  const today = useToday()
  const toast = useToast()
  const navigate = useNavigate()
  const [practice, setPractice] = useState(false)

  const tasks = s.weeklyTasks.filter((w) => w.domain === 'driving')
  const enabled = tasks.some((w) => w.active)
  const weekStart = startOfWeek(today, s.settings.weekStartsOn)
  const weekKeys = new Set(Array.from({ length: 7 }, (_, i) => dayKey(addDays(weekStart, i))))

  const sessionsThisWeek = s.drivingSessions.filter((x) => weekKeys.has(x.date))
  const countKind = (kind: 'video' | 'practice', taskId: string) => {
    const sessionDays = new Set(sessionsThisWeek.filter((x) => x.kind === kind).map((x) => x.date))
    const viaToday = s.logs.filter((l) => l.itemId === taskId && weekKeys.has(l.date) && isDoneLevel(l.level) && !sessionDays.has(l.date)).length
    return sessionsThisWeek.filter((x) => x.kind === kind).length + viaToday
  }
  const videos = countKind('video', VIDEO_ID)
  const practices = countKind('practice', PRACTICE_ID)

  const licence = s.projects.find((p) => p.domain === 'driving' && p.status !== 'archived') ?? null
  const licenceNext = licence ? projectNextStep(licence) : null

  const enable = async () => {
    const ts = drivingTemplate()
    // Same names as this screen; keeps her own edits to timing/text.
    for (const t of ts) {
      const cur = s.weeklyTasks.find((w) => w.id === t.id)
      await store.upsertWeeklyTask({ ...(cur ?? t), titleAr: t.titleAr, titleEn: t.titleEn, active: true })
    }
    // A resting «القيادة» would hide the plan — wake it to «حفاظ», and say so (QA area 3 #2).
    const woke = await ensureDomainsVisible(store, s, ['driving'])
    toast({
      message: woke.length ? 'تفعّلت خطة القيادة — ومجال القيادة صار «حفاظ» عشان تطلع لك باقتراحات اليوم' : 'تفعّلت خطة القيادة — تطلع لك باقتراحات اليوم لين تكمّلينها',
      actionLabel: 'تراجع',
      onAction: () => {
        void Promise.all(ts.map((t) => store.upsertWeeklyTask({ ...(store.getSnapshot().weeklyTasks.find((w) => w.id === t.id) ?? t), active: false })))
        if (woke.length) void store.setDomainState('driving', 'rest', true)
      },
    })
  }

  const pause = async () => {
    for (const t of tasks) await store.upsertWeeklyTask({ ...t, active: false })
    toast({ message: 'وقّفنا خطة القيادة مؤقتًا', actionLabel: 'تراجع', onAction: () => void Promise.all(tasks.map((t) => store.upsertWeeklyTask({ ...t, active: true }))) })
  }

  const logVideo = async () => {
    const d: DrivingSession = { id: store.newId('drv'), date: dayKey(today), minutes: 15, conditions: [], supervised: false, kind: 'video', note: '' }
    await store.addDrivingSession(d)
    // Every log can be taken back (QA area 3 #8).
    toast({ message: 'انحسب فيديو اليوم', actionLabel: 'تراجع', onAction: () => void store.deleteDrivingSession(d.id) })
  }

  const removeSession = async (d: DrivingSession) => {
    const tok = await store.deleteDrivingSession(d.id)
    if (tok) toast({ message: 'انحذفت الجلسة', actionLabel: 'تراجع', onAction: () => void store.undoDelete(tok.token) })
  }

  const startLicence = async () => {
    const id = store.newId('prj')
    const p = makeProject({
      id,
      domain: 'driving',
      titleAr: 'رخصة القيادة',
      titleEn: 'Driving licence',
      status: 'active',
      steps: LICENCE_STEPS.map((t) => makeProjectStep({ id: store.newId('stp'), titleAr: t, titleEn: t })),
      notes: 'خطوات عامة — تأكدي من التفاصيل والرسوم من مدرسة القيادة وأبشر.',
    })
    const v = await store.upsertProject(p)
    if (v.length > 0) {
      await store.upsertProject({ ...p, status: 'waiting' }, true)
      toast({ message: 'انضاف كمشروع «منتظر» لأن عندك مشاريع نشطة كفاية' })
    } else toast({ message: 'انضافت خطوات الرخصة لمساري', actionLabel: 'تراجع', onAction: () => void store.deleteProject(id) })
  }

  const recent = [...s.drivingSessions].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6)

  return (
    <Screen title="رخصة القيادة" backLabel="مساري" subtitle="خطوة صغيرة كل أسبوع تكفي">
      <div className={styles.stack}>
        <section className={styles.plan} aria-label="خطة الأسبوع">
          <div className={styles.planRow}>
            <span className={styles.planText}>
              <span className={styles.planTitle}>فيديوهات نظرية</span>
              <span className={styles.planSub}>
                <Bidi>3 مرات بالأسبوع · 15–20 د</Bidi>
              </span>
            </span>
            <Button variant="secondary" onClick={() => void logVideo()}>
              شفت فيديو
            </Button>
          </div>
          <StarDottedLine total={3} done={Math.min(videos, 3)} label={`الفيديوهات: ${Math.min(videos, 3)} من 3 هالأسبوع`} />
          <div className={styles.planRow}>
            <span className={styles.planText}>
              <span className={styles.planTitle}>تدريب عملي</span>
              <span className={styles.planSub}>مرة بالأسبوع · اليوم اللي يناسبك</span>
            </span>
            <Button variant="secondary" onClick={() => setPractice(true)}>
              سجّلي تدريب
            </Button>
          </div>
          <StarDottedLine total={1} done={Math.min(practices, 1)} label={practices > 0 ? 'التدريب: خلص هالأسبوع' : 'التدريب: باقي هالأسبوع'} />
          {videos >= 3 && practices >= 1 ? (
            <p className={styles.hint}>كمّلتي خطة هالأسبوع. الباقي زيادة خير.</p>
          ) : enabled ? (
            <p className={styles.hint}>ما فيه يوم محدد — تطلع لك باقتراحات اليوم لين تكمّلينها.</p>
          ) : (
            // Only promise suggestions when the plan is on (QA area 3 #14).
            <p className={styles.hint}>{tasks.length ? 'الخطة متوقفة — ما تطلع باقتراحات اليوم لين ترجّعينها.' : 'فعّلي الخطة إذا تبينها تطلع لك باقتراحات اليوم. تقدرين تسجّلين بدونها بعد.'}</p>
          )}
          <div className={styles.actions}>
            {enabled ? (
              <Button variant="plain" onClick={() => void pause()}>
                وقّفي الخطة مؤقتًا
              </Button>
            ) : (
              <Button onClick={() => void enable()}>{tasks.length ? 'رجّعي الخطة' : 'فعّلي الخطة الأسبوعية'}</Button>
            )}
          </div>
        </section>

        <StarDivider />

        <InsetGroupedList
          header="خطوات الرخصة"
          footer={licence ? undefined : 'خطوات عامة — تأكدي من التفاصيل والرسوم من مدرسة القيادة وأبشر.'}
        >
          {licence ? (
            <ListRow
              title={<Bidi>{licence.titleAr}</Bidi>}
              subtitle={licenceNext ? <>الجاية: <Bidi>{licenceNext.titleAr}</Bidi></> : 'خلّصتي كل الخطوات'}
              chevron
              onClick={() => navigate(`/path/project/${licence.id}`)}
            />
          ) : (
            <>
              {LICENCE_STEPS.map((t, i) => (
                <ListRow key={t} leading={<span className={styles.num}>{i + 1}</span>} title={<Bidi>{t}</Bidi>} muted />
              ))}
            </>
          )}
        </InsetGroupedList>
        {!licence && (
          <div className={styles.pad}>
            <Button variant="secondary" block onClick={() => void startLicence()}>
              حطيها مشروع في مساري
            </Button>
          </div>
        )}

        <InsetGroupedList header="آخر الجلسات">
          {recent.length === 0 ? (
            <ListRow title="ما سجّلتي شي للحين" subtitle="كل فيديو أو تدريب تسجلينه يطلع هنا." muted />
          ) : (
            recent.map((d) => (
              <ListRow
                key={d.id}
                title={d.kind === 'practice' ? 'تدريب عملي' : 'فيديو نظري'}
                subtitle={<MetaLine parts={[dayLabel(d.date), `${d.minutes} د`, d.supervised ? 'مع مرافق' : null, d.note || null]} />}
                trailingActions={[{ key: 'del', label: 'احذفي', tone: 'destructive', onAction: () => void removeSession(d) }]}
                menu={[{ key: 'del', label: 'احذفي الجلسة', destructive: true, onSelect: () => void removeSession(d) }]}
              />
            ))
          )}
        </InsetGroupedList>
      </div>

      <PracticeSheet open={practice} onClose={() => setPractice(false)} />
    </Screen>
  )
}

function PracticeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const store = useStore()
  const today = useToday()
  const toast = useToast()
  const [minutes, setMinutes] = useState('45')
  const [supervised, setSupervised] = useState(true)
  const [note, setNote] = useState('')
  const save = async () => {
    const m = Math.max(5, Math.min(300, Number(minutes) || 0))
    const id = store.newId('drv')
    await store.addDrivingSession({ id, date: dayKey(today), minutes: m, conditions: [], supervised, kind: 'practice', note: note.trim() })
    setNote('')
    onClose()
    toast({ message: 'انحسب تدريب الأسبوع', actionLabel: 'تراجع', onAction: () => void store.deleteDrivingSession(id) })
    return id
  }
  return (
    <Sheet open={open} onClose={onClose} title="تدريب عملي" detents={['medium', 'large']}>
      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <label className={styles.field}>
          <span className={styles.label}>كم دقيقة؟</span>
          <input className={`${styles.input} ${styles.num}`} inputMode="numeric" dir="ltr" value={minutes} onChange={(e) => setMinutes(e.target.value.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/[^0-9]/g, ''))} />
        </label>
        <div className={styles.toggle}>
          <span>مع مرافق</span>
          <Switch label="مع مرافق" checked={supervised} onChange={setSupervised} />
        </div>
        <label className={styles.field}>
          <span className={styles.label}>ملاحظة (اختياري)</span>
          <input className={styles.input} value={note} onChange={(e) => setNote(e.target.value)} placeholder="وش تدربتي عليه؟" />
        </label>
        <Button type="submit" size="large" block>
          احفظي
        </Button>
      </form>
    </Sheet>
  )
}
