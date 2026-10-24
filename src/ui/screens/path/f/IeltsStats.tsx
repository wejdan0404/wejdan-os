import { useMemo, useState } from 'react'
import { dayKey, addDays, ieltsCommitment, ieltsPracticeDays, ieltsSessionsThisMonth, parseBand, parseDayKey, setIeltsGoals, startOfWeek } from '../../../../domain'
import { Bidi } from '../../../components/Bidi'
import { Button } from '../../../components/Button'
import { Icon } from '../../../icons/Icon'
import { ProgressArc } from '../../../components/ProgressArc'
import { Sheet } from '../../../components/Sheet'
import { useLife, useStore, useToday } from '../../../state/LifeStore'
import { SectionHead } from '../pathKit'
import { latinDigits, useDo, useIeltsDriving, WEEK_DAY_NAME } from './fKit'
import pathStyles from '../Path.module.css'
import styles from './PathF.module.css'

/** «ممارستك» — calm stats (no streak) + «هدفك» (owner-entered target, level, optional 30-day goal). */
export function IeltsStats() {
  const s = useLife()
  const today = useToday()
  const d = useIeltsDriving()
  const [edit, setEdit] = useState(false)
  const weekStart = startOfWeek(today, s.settings.weekStartsOn)

  const days = useMemo(() => ieltsPracticeDays(s), [s.habits, s.weeklyTasks, s.logs, s.mockTests, s.vocabCards])
  const month = ieltsSessionsThisMonth(days, today)
  const c = ieltsCommitment(days, today, d.ielts.commitDays, weekStart)
  const arcLabel = c.goal ? `${c.practiced} من هدفك (${c.goal}) في آخر 30 يوم` : `${c.practiced} من 30 يوم`
  const week = Array.from({ length: 7 }, (_, i) => {
    const k = dayKey(addDays(weekStart, i))
    return { k, on: c.thisWeek.includes(k) }
  })
  const weekOn = week.filter((w) => w.on).map((w) => WEEK_DAY_NAME.format(parseDayKey(w.k)))
  const weekLabel = weekOn.length ? `أيام هالأسبوع: ${weekOn.join('، ')}` : 'ما فيه أيام مسجّلة هالأسبوع بعد'
  const g = d.ielts
  const noGoals = g.targetBand == null && g.currentBand == null && g.commitDays == null

  return (
    <>
      <SectionHead title="ممارستك" />
      <div className={styles.statsWrap}>
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>
            <bdi>{month}</bdi>
          </span>
          <span className={styles.statLabel}>جلسات هذا الشهر</span>
        </div>
        <div className={styles.stat}>
          <ProgressArc value={c.ratio} size={64} label={arcLabel}>
            <span className={styles.statArcNum}>
              <bdi>{c.practiced}</bdi>
            </span>
          </ProgressArc>
          <span className={styles.statLabel}>آخر 30 يوم{c.goal ? <> · هدفك <bdi>{c.goal}</bdi></> : null}</span>
        </div>
        <div className={styles.stat}>
          <div className={styles.dots} role="img" aria-label={weekLabel}>
            {week.map((w) => (
              <span key={w.k} className={styles.dot} data-on={w.on || undefined}>
                {w.on && <Icon name="check" size={10} strokeWidth={3} aria-hidden="true" />}
              </span>
            ))}
          </div>
          <span className={styles.statLabel}>هالأسبوع</span>
        </div>
      </div>
      </div>
      <p className={styles.note}>
        {c.practiced === 0 ? 'نبدأ من أي يوم — ما فيه سلسلة تنكسر هنا. ' : `تدرّبتي ${c.practiced} يوم من آخر 30. `}
        نحسب اللي سجّلتيه فقط، وأي يوم يُحسب مرة وحدة.
      </p>

      <SectionHead
        title="هدفك"
        action={
          <button type="button" className={pathStyles.linkBtn} onClick={() => setEdit(true)}>
            {noGoals ? 'حددي' : 'عدّلي'}
          </button>
        }
      />
      <div className={`${styles.card} ${styles.cardFlush}`}>
        <Value label="الدرجة المستهدفة" v={g.targetBand} />
        <Value label="مستواك الحالي" v={g.currentBand} />
        <Value label="هدف الالتزام" v={g.commitDays} suffix=" يوم من 30" />
      </div>
      {noGoals && <p className={styles.note}>حطي هدفك ومستواك بنفسك — التطبيق ما يخمّن عنك.</p>}
      <GoalsSheet open={edit} onClose={() => setEdit(false)} />
    </>
  )
}

function Value({ label, v, suffix = '' }: { label: string; v: number | null; suffix?: string }) {
  return (
    <div className={styles.valueRow}>
      <span className={styles.valueKey}>{label}</span>
      {v == null ? (
        <span className={styles.valueVal} data-empty>
          ما حددتيها
        </span>
      ) : (
        <span className={styles.valueVal}>
          <bdi>{v}</bdi>
          {suffix && <Bidi>{suffix}</Bidi>}
        </span>
      )}
    </div>
  )
}

function GoalsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const store = useStore()
  const run = useDo()
  const d = useIeltsDriving()
  const [key, setKey] = useState(false)
  const [t, setT] = useState('')
  const [c, setC] = useState('')
  const [n, setN] = useState('')
  if (open !== key) {
    setKey(open)
    if (open) {
      setT(d.ielts.targetBand == null ? '' : String(d.ielts.targetBand))
      setC(d.ielts.currentBand == null ? '' : String(d.ielts.currentBand))
      setN(d.ielts.commitDays == null ? '' : String(d.ielts.commitDays))
    }
  }
  const band = (v: string): { value: number | null; error: string | null; note: string | null } => {
    const raw = latinDigits(v).trim()
    if (!raw) return { value: null, error: null, note: null }
    const b = parseBand(raw)
    if (b == null) return { value: null, error: 'الدرجة من 0 لين 9', note: null }
    return { value: b, error: null, note: b !== Number(raw) ? `نقرّبها لأقرب نص درجة: ${b}` : null }
  }
  const tb = band(t)
  const cb = band(c)
  const nRaw = latinDigits(n).trim()
  const nNum = nRaw ? Number(nRaw) : null
  const nErr = nNum != null && (!Number.isInteger(nNum) || nNum < 1 || nNum > 30) ? 'من 1 لين 30' : null
  const bad = !!(tb.error || cb.error || nErr)
  const save = async () => {
    if (bad) return
    const ok = await run(setIeltsGoals(store, { targetBand: tb.value, currentBand: cb.value, commitDays: nNum }), 'انحفظ هدفك')
    if (ok) onClose()
  }
  const err = (m: string | null) => (m ? <p className={pathStyles.fieldError} role="alert">{m}</p> : null)
  return (
    <Sheet open={open} onClose={onClose} title="هدفك في IELTS" detents={['medium', 'large']}>
      <form className={pathStyles.form} onSubmit={(e) => { e.preventDefault(); void save() }}>
        <label className={pathStyles.field}>
          <span className={pathStyles.label}>الدرجة المستهدفة</span>
          <input className={`${pathStyles.input} ${pathStyles.num}`} inputMode="decimal" dir="ltr" value={t} onChange={(e) => setT(e.target.value)} placeholder="0–9" aria-invalid={tb.error ? true : undefined} />
        </label>
        {err(tb.error)}
        {tb.note && <p className={pathStyles.hint}><Bidi>{tb.note}</Bidi></p>}
        <label className={pathStyles.field}>
          <span className={pathStyles.label}>مستواك الحالي (من تقديرك أنتِ)</span>
          <input className={`${pathStyles.input} ${pathStyles.num}`} inputMode="decimal" dir="ltr" value={c} onChange={(e) => setC(e.target.value)} placeholder="0–9" aria-invalid={cb.error ? true : undefined} />
        </label>
        {err(cb.error)}
        {cb.note && <p className={pathStyles.hint}><Bidi>{cb.note}</Bidi></p>}
        <label className={pathStyles.field}>
          <span className={pathStyles.label}>كم يوم تبين تتدربين من آخر 30؟ (اختياري)</span>
          <input className={`${pathStyles.input} ${pathStyles.num}`} inputMode="numeric" dir="ltr" value={n} onChange={(e) => setN(e.target.value)} placeholder="مثلًا 20" aria-invalid={nErr ? true : undefined} />
        </label>
        {err(nErr)}
        <p className={pathStyles.hint}>اترك الخانة فاضية إذا ما تبين تحددينها.</p>
        <Button type="submit" size="large" block disabled={bad}>احفظي</Button>
      </form>
    </Sheet>
  )
}
