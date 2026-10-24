import { motion, useReducedMotion } from 'framer-motion'
import type { DaySummary, EnergyMode, WeeklyMomentum } from '../../../domain'
import { ProgressArc } from '../../components/ProgressArc'
import { dur, ease } from '../../motion'
import styles from './DayReady.module.css'

const SUB: Record<EnergyMode | 'none', string> = {
  red: 'يوم هادئ — الأساس بس',
  yellow: 'على قد طاقتك اليوم، بنسخ أخف',
  green: 'على قد طاقتك اليوم، ونسخة صغيرة تكفي',
  none: 'على قد طاقتك',
}

/** «يومك جاهز» — her accepted day by tier, calm progress, and the weekly momentum ring. Read-only. */
export function DayReady({
  summary, momentum, energy, busyShown = false, routineLeft = null,
}: {
  summary: DaySummary
  momentum: WeeklyMomentum
  energy: EnergyMode | null
  /** The «يومك مليان شوي» banner is already on screen — say it once. */
  busyShown?: boolean
  /** Text like «باقي خطوة» for an open routine: its steps are not in the bar, so the bar must not read as the whole day. */
  routineLeft?: string | null
}) {
  const reduce = useReducedMotion()
  const chips = [
    { key: 'core', label: 'أساسية', n: summary.core.count, cap: summary.caps.core },
    { key: 'maintain', label: 'صيانة', n: summary.maintain.count, cap: summary.caps.maintain },
    { key: 'joy', label: 'متعة', n: summary.joy.count, cap: null },
  ] as const
  const over = summary.overCap.core || summary.overCap.maintain
  return (
    <section className={styles.card} aria-label="يومك جاهز">
      <div className={styles.head}>
        <div className={styles.text}>
          <h2 className={styles.title}>يومك جاهز</h2>
          <p className={styles.sub}>{SUB[energy ?? 'none']}</p>
        </div>
        {momentum.hasHabits && (
          <div className={styles.ring}>
            <ProgressArc
              value={momentum.resting ? 0 : momentum.value / 100}
              size={56}
              label={momentum.resting ? 'الزخم: ترتاح' : `الزخم ${Math.round(momentum.value)} من 100`}
            >
              <span className={styles.ringNum}>{momentum.resting ? '·' : Math.round(momentum.value)}</span>
            </ProgressArc>
            <span className={styles.ringCap}>{momentum.resting ? 'ترتاح' : 'الزخم'}</span>
          </div>
        )}
      </div>
      <ul className={styles.chips}>
        {chips.map((c) => (
          <li key={c.key} className={styles.chip} data-kind={c.key} aria-label={c.cap != null ? `${c.n} ${c.label}، الحد ${c.cap}` : `${c.n} ${c.label}`}>
            <span className={styles.chipNum}>{c.n}</span>
            <span className={styles.chipLabel}>{c.label}</span>
          </li>
        ))}
      </ul>
      {over && !busyShown && <p className={styles.note}>يومك أكثر من المعتاد — عادي، اختاري اللي يناسبك.</p>}
      <div className={styles.progress}>
        <div className={styles.bar} role="progressbar" aria-valuemin={0} aria-valuemax={summary.total} aria-valuenow={summary.done} aria-label="تقدّم اليوم">
          <motion.span
            className={styles.fill}
            initial={false}
            animate={{ width: `${Math.round(summary.progress * 100)}%` }}
            transition={reduce ? { duration: 0 } : { duration: dur.slow, ease: ease.standard }}
          />
        </div>
        <span className={styles.count}>
          <bdi>{summary.done}</bdi> من <bdi>{summary.total}</bdi>
        </span>
      </div>
      {routineLeft != null && <p className={styles.note}>الروتين له خطه الخاص · {routineLeft}</p>}
    </section>
  )
}
