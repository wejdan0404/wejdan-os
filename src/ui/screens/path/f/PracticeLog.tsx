import { useState } from 'react'
import { addCondition, conditionList, dayKey, practiceStats, removeCondition, type DrivingSession } from '../../../../domain'
import { Button } from '../../../components/Button'
import { Chip } from '../../../components/Chip'
import { Sheet } from '../../../components/Sheet'
import { Switch } from '../../../components/Switch'
import { useToast } from '../../../components/Toast'
import { useLife, useStore, useToday } from '../../../state/LifeStore'
import { SectionHead } from '../pathKit'
import { latinDigits, useDo, useIeltsDriving } from './fKit'
import pathStyles from '../Path.module.css'
import styles from './PathF.module.css'

/** «سجل التدريب تحت الإشراف» — sessions, minutes, and how many of her conditions she has tried. */
export function PracticeLog() {
  const s = useLife()
  const d = useIeltsDriving()
  const list = conditionList(d)
  const st = practiceStats(s.drivingSessions, list)
  return (
    <>
      <SectionHead title="سجل التدريب تحت الإشراف" />
      <section className={styles.card} aria-label="سجل التدريب">
        <div className={styles.metricsWrap}>
        <div className={styles.metrics}>
          <div className={styles.metric}>
            <span className={styles.metricVal}><bdi>{st.sessions}</bdi></span>
            <span className={styles.metricLabel}>جلسات</span>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricVal}><bdi>{st.minutes}</bdi></span>
            <span className={styles.metricLabel}>دقائق</span>
          </div>
          <div className={styles.metric} role="group" aria-label={`${st.tried.length} من ${st.total} ظروف جرّبتيها`}>
            <span className={styles.metricVal}><bdi>{st.tried.length}</bdi></span>
            <span className={styles.metricLabel}>من <bdi>{st.total}</bdi> ظروف جرّبتيها</span>
          </div>
        </div>
        </div>
        <p className={styles.cardSub}>
          {st.sessions === 0
            ? 'يبدأ السجل بعد أول تسجيل. تنويع الظروف يساعدك تعرفين نفسك أكثر — بدون ساعات محددة.'
            : st.tried.length === st.total && st.total > 0
              ? 'جرّبتي كل الظروف اللي في قائمتك.'
              : st.total > 0
                ? `باقي: ${list.filter((c) => !st.tried.includes(c)).join('، ')}`
                : 'قائمة الظروف فاضية — أضيفيها وقت التسجيل.'}
        </p>
      </section>
    </>
  )
}

/** Practice session: minutes, accompanied, the conditions she met (her list, editable), a note. */
export function PracticeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const store = useStore()
  const today = useToday()
  const toast = useToast()
  const run = useDo()
  const d = useIeltsDriving()
  const list = conditionList(d)
  const [minutes, setMinutes] = useState('45')
  const [supervised, setSupervised] = useState(true)
  const [note, setNote] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const [custom, setCustom] = useState('')

  const addCustom = async () => {
    const t = custom.trim()
    if (!t) return
    await run(addCondition(store, t), 'انضاف الظرف لقائمتك')
    setPicked((p) => (p.includes(t) ? p : [...p, t]))
    setCustom('')
  }
  const dropCustom = async (c: string) => {
    await run(removeCondition(store, c), 'شلنا الظرف من القائمة')
    setPicked((p) => p.filter((x) => x !== c))
  }
  const save = async () => {
    const m = Math.max(5, Math.min(300, Number(minutes) || 0))
    const id = store.newId('drv')
    const row: DrivingSession = { id, date: dayKey(today), minutes: m, conditions: picked.filter((c) => list.includes(c)), supervised, kind: 'practice', note: note.trim() }
    await store.addDrivingSession(row)
    setNote('')
    setPicked([])
    onClose()
    toast({ message: 'انحسب تدريب الأسبوع', actionLabel: 'تراجع', onAction: () => void store.deleteDrivingSession(id) })
  }
  return (
    <Sheet open={open} onClose={onClose} title="تدريب عملي" detents={['large']}>
      <form className={pathStyles.form} onSubmit={(e) => { e.preventDefault(); void save() }}>
        <label className={pathStyles.field}>
          <span className={pathStyles.label}>كم دقيقة؟</span>
          <input className={`${pathStyles.input} ${pathStyles.num}`} inputMode="numeric" dir="ltr" value={minutes} onChange={(e) => setMinutes(latinDigits(e.target.value).replace(/[^0-9]/g, ''))} />
        </label>
        <div className={pathStyles.toggle}>
          <span>مع مرافق</span>
          <Switch label="مع مرافق" checked={supervised} onChange={setSupervised} />
        </div>
        <div className={pathStyles.field}>
          <span className={pathStyles.label} id="cond-label">الظروف اللي مرّت عليك (اختياري)</span>
          <div className={styles.condRow} role="group" aria-labelledby="cond-label">
            {list.map((c) => (
              <Chip key={c} selected={picked.includes(c)} onClick={() => setPicked((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]))}>
                {c}
              </Chip>
            ))}
          </div>
        </div>
        <div className={pathStyles.addRow} style={{ padding: 0 }}>
          <input className={pathStyles.input} value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="ظرف ثاني" aria-label="ظرف جديد" maxLength={40} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void addCustom() } }} />
          <Button variant="secondary" onClick={() => void addCustom()} disabled={!custom.trim()}>أضيفي</Button>
        </div>
        {list.length > 0 && (
          <details>
            <summary className={pathStyles.hint} style={{ minHeight: 44, display: 'flex', alignItems: 'center' }}>شيلي ظرف من القائمة</summary>
            <div className={styles.condRow}>
              {list.map((c) => (
                <Chip key={c} onClick={() => void dropCustom(c)}>
                  {c} ✕
                </Chip>
              ))}
            </div>
          </details>
        )}
        <label className={pathStyles.field}>
          <span className={pathStyles.label}>ملاحظة (اختياري)</span>
          <input className={pathStyles.input} value={note} onChange={(e) => setNote(e.target.value)} placeholder="وش تدربتي عليه؟" />
        </label>
        <Button type="submit" size="large" block>احفظي</Button>
      </form>
    </Sheet>
  )
}
